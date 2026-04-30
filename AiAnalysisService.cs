using System.Text.RegularExpressions;

namespace Jurico;

public sealed class AiAnalysisService
{
    public string Analyze(JuricoDocument doc)
    {
        var entities = ExtractEntities(doc.Content).ToList();

        var result = new List<string>
        {
            $"Analyse: {doc.FileName}",
            $"Quelle: {doc.Source}",
            "",
            "Erkannte juristische Hinweise:"
        };

        if (!entities.Any())
        {
            result.Add("- Keine Standard-Entitäten erkannt.");
        }
        else
        {
            foreach (var e in entities)
                result.Add($"- {e.Type}: {e.Value}");
        }

        result.Add("");
        result.Add("Kurzbewertung:");
        result.Add(BuildSummary(doc.Content));

        return string.Join(Environment.NewLine, result);
    }

    public IEnumerable<(string Type, string Value)> ExtractEntities(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            yield break;

        foreach (Match m in Regex.Matches(text, @"\b(Landgericht|Amtsgericht|Oberlandesgericht|Bundesgerichtshof)\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+"))
            yield return ("Gericht", m.Value);

        foreach (Match m in Regex.Matches(text, @"\b\d{1,2}\.\d{1,2}\.\d{4}\b"))
            yield return ("Datum", m.Value);

        foreach (Match m in Regex.Matches(text, @"\b\d{1,3}(\.\d{3})*,\d{2}\s*€\b"))
            yield return ("Betrag/Streitwert", m.Value);

        foreach (Match m in Regex.Matches(text, @"\b(Az\.|Aktenzeichen)\s*[:\-]?\s*[A-Za-z0-9\s\/\.\-]+"))
            yield return ("Aktenzeichen", m.Value.Trim());
    }

    private static string BuildSummary(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return "Kein Text vorhanden.";

        var lower = text.ToLowerInvariant();

        if (lower.Contains("versicherung") || lower.Contains("versicherer"))
            return "Das Dokument enthält Bezüge zum Versicherungsrecht.";

        if (lower.Contains("frist"))
            return "Das Dokument enthält möglicherweise fristrelevante Inhalte.";

        if (lower.Contains("klage") || lower.Contains("gericht"))
            return "Das Dokument enthält gerichtliche oder prozessuale Bezüge.";

        return "Dokument wurde basisanalysiert. Für tiefe KI-Auswertung kann später ein LLM-Dienst angebunden werden.";
    }
}
