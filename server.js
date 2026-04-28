import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
import OpenAI from 'openai'
import axios from 'axios'

const { Pool } = pkg

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(express.json())

// ======================
// 🗄️ DB
// ======================
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
})

// ======================
// 🔧 DB INIT
// ======================
async function initDB() {
await pool.query(`     CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      message TEXT,
      analysis TEXT,
      score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

// ======================
// 🤖 AI
// ======================
async function analyzeText(text) {
const completion = await openai.chat.completions.create({
model: "gpt-4o-mini",
messages: [
{ role: "system", content: "Bewerte juristische Fälle von 1-10 und erkläre kurz." },
{ role: "user", content: text }
]
})

const output = completion.choices[0].message.content
const scoreMatch = output.match(/\d+/)
const score = scoreMatch ? parseInt(scoreMatch[0]) : 5

return { analysis: output, score }
}

// ======================
// 🔑 MICROSOFT TOKEN
// ======================
async function getAccessToken() {
const res = await axios.post(
`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
new URLSearchParams({
client_id: process.env.MS_CLIENT_ID,
client_secret: process.env.MS_CLIENT_SECRET,
scope: "https://graph.microsoft.com/.default",
grant_type: "client_credentials"
})
)

return res.data.access_token
}

// ======================
// 📧 MAILS LESEN
// ======================
async function fetchEmails() {
const token = await getAccessToken()

const res = await axios.get(
"https://graph.microsoft.com/v1.0/me/messages?$top=5",
{
headers: { Authorization: `Bearer ${token}` }
}
)

return res.data.value
}

// ======================
// 🔁 IMPORT JOB
// ======================
async function importEmails() {
try {
const mails = await fetchEmails()

```
for (const mail of mails) {
  const text = mail.body?.content || ""

  if (!text) continue

  const ai = await analyzeText(text)

  await pool.query(
    `INSERT INTO leads (name, email, message, analysis, score)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      mail.from?.emailAddress?.name || "Unknown",
      mail.from?.emailAddress?.address || "",
      text,
      ai.analysis,
      ai.score
    ]
  )
}

console.log("Emails importiert")
```

} catch (err) {
console.error("Mail Fehler:", err.message)
}
}

// läuft alle 60 Sekunden
setInterval(importEmails, 60000)

// ======================
// DASHBOARD
// ======================
app.get('/api/dashboard', async (req, res) => {
const result = await pool.query(`     SELECT name, message, analysis, score
    FROM leads
    ORDER BY created_at DESC
    LIMIT 5
  `)

res.json(result.rows)
})

// ======================
// START
// ======================
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log("Outlook AI System läuft")
})
})
