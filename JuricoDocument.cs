namespace Jurico;

public class JuricoDocument
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FileName { get; set; } = "";
    public string Path { get; set; } = "";
    public string Source { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
