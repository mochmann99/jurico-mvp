const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

// Health Check
app.get("/", (req, res) => {
  res.send("Jurico Backend läuft 🚀")
})

// Analyse Endpoint
app.post("/analyze", async (req, res) => {
  try {

    const input = req.body.text || "kein Text übergeben"

    // FALLBACK (wenn kein API Key gesetzt)
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: true,
        data: {
          summary: `Basisanalyse für: ${input}`,
          risk: "manuell prüfen",
          next_steps: [
            "Mandant kontaktieren",
            "Unterlagen anfordern",
            "Erstberatung anbieten"
          ]
        }
      })
    }

    // OPTIONAL: OpenAI später aktivieren
    return res.json({
      success: true,
      data: {
        summary: `Analyse erfolgreich für: ${input}`,
        risk: "mittel",
        next_steps: [
          "Mandant priorisieren",
          "Fall juristisch prüfen",
          "Strategie festlegen"
        ]
      }
    })

  } catch (error) {
    return res.json({
      success: false,
      data: {
        summary: "Fehler bei Analyse",
        risk: "unbekannt",
        next_steps: ["System prüfen"]
      },
      error: error.message
    })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`)
})
