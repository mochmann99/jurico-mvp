using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;

namespace Jurico;

public sealed class FileIndexer
{
    private static readonly string[] Extensions = [".txt", ".pdf", ".docx"];

    public int IndexFolder(string folderPath, JuricoDatabase db)
    {
        if (!Directory.Exists(folderPath))
            throw new DirectoryNotFoundException(folderPath);

        var files = Directory.EnumerateFiles(folderPath, "*.*", SearchOption.AllDirectories)
            .Where(f => Extensions.Contains(Path.GetExtension(f).ToLowerInvariant()))
            .ToList();

        int count = 0;

        foreach (var file in files)
        {
            var text = ExtractText(file);

            var doc = new JuricoDocument
            {
                FileName = Path.GetFileName(file),
                Path = file,
                Source = "Lokaler Ordner",
                Content = text,
                CreatedAt = File.GetLastWriteTime(file)
            };

            db.SaveDocument(doc);
            count++;
        }

        return count;
    }

    private static string ExtractText(string file)
    {
        var ext = Path.GetExtension(file).ToLowerInvariant();

        try
        {
            return ext switch
            {
                ".txt" => File.ReadAllText(file),
                ".pdf" => ExtractPdf(file),
                ".docx" => ExtractDocx(file),
                _ => ""
            };
        }
        catch (Exception ex)
        {
            return $"[Jurico konnte Text nicht extrahieren: {ex.Message}]";
        }
    }

    private static string ExtractPdf(string file)
    {
        using var pdf = PdfDocument.Open(file);
        return string.Join(Environment.NewLine, pdf.GetPages().Select(p => p.Text));
    }

    private static string ExtractDocx(string file)
    {
        using var doc = WordprocessingDocument.Open(file, false);
        return doc.MainDocumentPart?.Document.Body?.InnerText ?? "";
    }
}
