const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Jurico Backend läuft 🚀"
  });
});

app.post("/analyze", async (req, res) => {
  try {
    const { caseText } = req.body;

    if (!caseText || caseText.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Bitte eine ausführlichere Fallschilderung eingeben."
      });
    }

    // Fallback ohne API-Key
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: true,
        source: "fallback",
        data: {
          summary: `Basisanalyse für: ${caseText}`,
          legal_area: "unbekannt",
          risk: "mittel",
          potential_value: "offen",
          next_steps: ["Mandant kontaktieren", "Unterlagen anfordern"]
        }
      });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
Du bist ein erfahrener deutscher Rechtsanwalt.

Analysiere Mandantenfälle präzise und strukturiert.

Gib NUR JSON zurück:

{
  "summary": "...",
  "legal_area": "...",
  "risk": "niedrig | mittel | hoch",
  "potential_value": "niedrig | mittel | hoch",
  "next_steps": ["...", "..."]
}
`
        },
        {
          role: "user",
          content: caseText
        }
      ]
    });

    const raw = completion.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        summary: raw,
        legal_area: "unbekannt",
        risk: "mittel",
        potential_value: "offen",
        next_steps: ["Manuell prüfen"]
      };
    }

    res.json({
      success: true,
      source: "openai",
      data: parsed
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});