const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Jurico Backend läuft 🚀")
})

app.post("/analyze", async (req, res) => {
  try {
    const input = req.body.text || "kein Text"

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: true,
        data: {
          summary: `Fallback für: ${input}`,
          risk: "manuell prüfen",
          next_steps: ["Mandant kontaktieren"]
        }
      })
    }

    return res.json({
      success: true,
      data: {
        summary: `Analyse: ${input}`,
        risk: "mittel",
        next_steps: ["Prüfung starten"]
      }
    })

  } catch (err) {
    return res.json({
      success: false,
      data: "Fehler",
      error: err.message
    })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT)
})
