using System.Diagnostics;

namespace Jurico;

public sealed class MainForm : Form
{
    private readonly JuricoDatabase _db;
    private readonly AiAnalysisService _ai;
    private readonly FileIndexer _indexer = new();

    private readonly TextBox _pathBox = new() { Width = 520 };
    private readonly Button _browseButton = new() { Text = "Ordner wählen" };
    private readonly Button _indexButton = new() { Text = "Indexieren" };
    private readonly TextBox _searchBox = new() { Width = 420 };
    private readonly Button _searchButton = new() { Text = "Suchen" };
    private readonly ListBox _results = new() { Width = 720, Height = 220 };
    private readonly TextBox _preview = new() { Width = 720, Height = 260, Multiline = true, ScrollBars = ScrollBars.Vertical };
    private readonly Button _openButton = new() { Text = "Dokument öffnen" };
    private readonly Button _analyzeButton = new() { Text = "KI-Analyse" };

    private List<JuricoDocument> _currentResults = [];

    public MainForm(JuricoDatabase db, AiAnalysisService ai)
    {
        _db = db;
        _ai = ai;

        Text = "Jurico – Dokumentensuche & Analyse";
        Width = 800;
        Height = 760;
        StartPosition = FormStartPosition.CenterScreen;

        var layout = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            Padding = new Padding(16),
            AutoScroll = true
        };

        layout.Controls.Add(new Label { Text = "Datenquelle: lokaler Ordner", AutoSize = true });
        layout.Controls.Add(_pathBox);

        var sourceButtons = new FlowLayoutPanel { Width = 720, Height = 40 };
        sourceButtons.Controls.Add(_browseButton);
        sourceButtons.Controls.Add(_indexButton);
        layout.Controls.Add(sourceButtons);

        layout.Controls.Add(new Label { Text = "Volltextsuche", AutoSize = true });
        var searchRow = new FlowLayoutPanel { Width = 720, Height = 40 };
        searchRow.Controls.Add(_searchBox);
        searchRow.Controls.Add(_searchButton);
        layout.Controls.Add(searchRow);

        layout.Controls.Add(_results);

        var actionRow = new FlowLayoutPanel { Width = 720, Height = 40 };
        actionRow.Controls.Add(_openButton);
        actionRow.Controls.Add(_analyzeButton);
        layout.Controls.Add(actionRow);

        layout.Controls.Add(new Label { Text = "Vorschau / Analyse", AutoSize = true });
        layout.Controls.Add(_preview);

        Controls.Add(layout);

        _browseButton.Click += Browse_Click;
        _indexButton.Click += Index_Click;
        _searchButton.Click += Search_Click;
        _results.SelectedIndexChanged += Results_SelectedIndexChanged;
        _openButton.Click += Open_Click;
        _analyzeButton.Click += Analyze_Click;
    }

    private void Browse_Click(object? sender, EventArgs e)
    {
        using var dialog = new FolderBrowserDialog();
        if (dialog.ShowDialog() == DialogResult.OK)
            _pathBox.Text = dialog.SelectedPath;
    }

    private void Index_Click(object? sender, EventArgs e)
    {
        try
        {
            var count = _indexer.IndexFolder(_pathBox.Text, _db);
            MessageBox.Show($"{count} Dokumente indexiert.", "Jurico");
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Fehler");
        }
    }

    private void Search_Click(object? sender, EventArgs e)
    {
        _currentResults = string.IsNullOrWhiteSpace(_searchBox.Text)
            ? _db.GetAllDocuments()
            : _db.Search(_searchBox.Text);

        _results.Items.Clear();

        foreach (var doc in _currentResults)
            _results.Items.Add($"{doc.FileName}  |  {doc.Source}");

        if (_currentResults.Count == 0)
            _preview.Text = "Keine Treffer.";
    }

    private void Results_SelectedIndexChanged(object? sender, EventArgs e)
    {
        var doc = GetSelectedDocument();
        if (doc is null) return;

        _preview.Text = doc.Content.Length > 5000
            ? doc.Content[..5000] + Environment.NewLine + "[gekürzt]"
            : doc.Content;
    }

    private void Open_Click(object? sender, EventArgs e)
    {
        var doc = GetSelectedDocument();
        if (doc is null || !File.Exists(doc.Path)) return;

        Process.Start(new ProcessStartInfo(doc.Path) { UseShellExecute = true });
    }

    private void Analyze_Click(object? sender, EventArgs e)
    {
        var doc = GetSelectedDocument();
        if (doc is null) return;

        var entities = _ai.ExtractEntities(doc.Content);
        _db.SaveEntities(doc.Id, entities);

        _preview.Text = _ai.Analyze(doc);
    }

    private JuricoDocument? GetSelectedDocument()
    {
        var index = _results.SelectedIndex;
        if (index < 0 || index >= _currentResults.Count) return null;
        return _currentResults[index];
    }
}
