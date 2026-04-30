using Microsoft.Data.Sqlite;

namespace Jurico;

public sealed class JuricoDatabase
{
    private readonly string _connectionString;

    public JuricoDatabase(string dbPath)
    {
        _connectionString = $"Data Source={dbPath}";
    }

    public void Initialize()
    {
        using var con = new SqliteConnection(_connectionString);
        con.Open();

        using var cmd = con.CreateCommand();
        cmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS Documents (
            Id TEXT PRIMARY KEY,
            FileName TEXT NOT NULL,
            Path TEXT NOT NULL,
            Source TEXT NOT NULL,
            Content TEXT NOT NULL,
            CreatedAt TEXT NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS DocumentsFTS 
        USING fts5(Id UNINDEXED, FileName, Content);

        CREATE TABLE IF NOT EXISTS Entities (
            Id TEXT PRIMARY KEY,
            DocumentId TEXT NOT NULL,
            Type TEXT NOT NULL,
            Value TEXT NOT NULL,
            FOREIGN KEY(DocumentId) REFERENCES Documents(Id)
        );
        ";
        cmd.ExecuteNonQuery();
    }

    public void SaveDocument(JuricoDocument doc)
    {
        using var con = new SqliteConnection(_connectionString);
        con.Open();

        using var tx = con.BeginTransaction();

        using (var cmd = con.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = @"
            INSERT OR REPLACE INTO Documents 
            (Id, FileName, Path, Source, Content, CreatedAt)
            VALUES ($id, $fileName, $path, $source, $content, $createdAt);
            ";
            cmd.Parameters.AddWithValue("$id", doc.Id);
            cmd.Parameters.AddWithValue("$fileName", doc.FileName);
            cmd.Parameters.AddWithValue("$path", doc.Path);
            cmd.Parameters.AddWithValue("$source", doc.Source);
            cmd.Parameters.AddWithValue("$content", doc.Content);
            cmd.Parameters.AddWithValue("$createdAt", doc.CreatedAt.ToString("O"));
            cmd.ExecuteNonQuery();
        }

        using (var cmd = con.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = "DELETE FROM DocumentsFTS WHERE Id = $id;";
            cmd.Parameters.AddWithValue("$id", doc.Id);
            cmd.ExecuteNonQuery();
        }

        using (var cmd = con.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = @"
            INSERT INTO DocumentsFTS (Id, FileName, Content)
            VALUES ($id, $fileName, $content);
            ";
            cmd.Parameters.AddWithValue("$id", doc.Id);
            cmd.Parameters.AddWithValue("$fileName", doc.FileName);
            cmd.Parameters.AddWithValue("$content", doc.Content);
            cmd.ExecuteNonQuery();
        }

        tx.Commit();
    }

    public List<JuricoDocument> Search(string query)
    {
        var results = new List<JuricoDocument>();

        using var con = new SqliteConnection(_connectionString);
        con.Open();

        using var cmd = con.CreateCommand();
        cmd.CommandText = @"
        SELECT d.Id, d.FileName, d.Path, d.Source, d.Content, d.CreatedAt
        FROM DocumentsFTS f
        JOIN Documents d ON d.Id = f.Id
        WHERE DocumentsFTS MATCH $query
        ORDER BY rank
        LIMIT 100;
        ";
        cmd.Parameters.AddWithValue("$query", EscapeFtsQuery(query));

        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            results.Add(new JuricoDocument
            {
                Id = reader.GetString(0),
                FileName = reader.GetString(1),
                Path = reader.GetString(2),
                Source = reader.GetString(3),
                Content = reader.GetString(4),
                CreatedAt = DateTime.Parse(reader.GetString(5))
            });
        }

        return results;
    }

    public List<JuricoDocument> GetAllDocuments(int limit = 500)
    {
        var results = new List<JuricoDocument>();

        using var con = new SqliteConnection(_connectionString);
        con.Open();

        using var cmd = con.CreateCommand();
        cmd.CommandText = @"
        SELECT Id, FileName, Path, Source, Content, CreatedAt
        FROM Documents
        ORDER BY CreatedAt DESC
        LIMIT $limit;
        ";
        cmd.Parameters.AddWithValue("$limit", limit);

        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            results.Add(new JuricoDocument
            {
                Id = reader.GetString(0),
                FileName = reader.GetString(1),
                Path = reader.GetString(2),
                Source = reader.GetString(3),
                Content = reader.GetString(4),
                CreatedAt = DateTime.Parse(reader.GetString(5))
            });
        }

        return results;
    }

    public void SaveEntities(string documentId, IEnumerable<(string Type, string Value)> entities)
    {
        using var con = new SqliteConnection(_connectionString);
        con.Open();

        using var tx = con.BeginTransaction();

        using (var del = con.CreateCommand())
        {
            del.Transaction = tx;
            del.CommandText = "DELETE FROM Entities WHERE DocumentId = $documentId;";
            del.Parameters.AddWithValue("$documentId", documentId);
            del.ExecuteNonQuery();
        }

        foreach (var entity in entities)
        {
            using var cmd = con.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = @"
            INSERT INTO Entities (Id, DocumentId, Type, Value)
            VALUES ($id, $documentId, $type, $value);
            ";
            cmd.Parameters.AddWithValue("$id", Guid.NewGuid().ToString());
            cmd.Parameters.AddWithValue("$documentId", documentId);
            cmd.Parameters.AddWithValue("$type", entity.Type);
            cmd.Parameters.AddWithValue("$value", entity.Value);
            cmd.ExecuteNonQuery();
        }

        tx.Commit();
    }

    private static string EscapeFtsQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return "\"";
        return string.Join(" ", query.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(term => term.Replace("\"", "\"\"") + "*"));
    }
}
