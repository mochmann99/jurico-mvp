import express from 'express'
import pkg from 'pg'
import OpenAI from 'openai'
import axios from 'axios'

const { Pool } = pkg
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
// 🤖 OPENAI
// ======================
const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
})

// ======================
// 🔧 INIT DB
// ======================
async function initDB() {
await pool.query(`     CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      email_id TEXT UNIQUE,
      name TEXT,
      email TEXT,
      message TEXT,
      analysis TEXT,
      score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
console.log("✅ DB ready")
}

// ======================
// 🤖 AI ANALYSE
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
// 📧 EMAILS LADEN
// ======================
async function fetchEmails() {
const token = await getAccessToken()

const url = `https://graph.microsoft.com/v1.0/users/${process.env.MS_USER_EMAIL}/messages?$top=5`

const res = await axios.get(url, {
headers: { Authorization: `Bearer ${token}` }
})

console.log("📨 Emails gefunden:", res.data.value.length)

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
  const id = mail.id
  const text = mail.body?.content || ""

  if (!text) continue

  const exists = await pool.query(
    'SELECT id FROM leads WHERE email_id=$1',
    [id]
  )

  if (exists.rows.length > 0) continue

  const ai = await analyzeText(text)

  await pool.query(
    `INSERT INTO leads (email_id, name, email, message, analysis, score)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      id,
      mail.from?.emailAddress?.name || "Unknown",
      mail.from?.emailAddress?.address || "",
      text,
      ai.analysis,
      ai.score
    ]
  )

  console.log("✅ Mail importiert:", mail.subject)
}
```

} catch (err) {
console.error("❌ MAIL FEHLER:", err.response?.data || err.message)
}
}

// ======================
// ⏱ AUTO IMPORT
// ======================
setInterval(importEmails, 60000)

// ======================
// 🧪 TEST ENDPOINT
// ======================
app.get('/test-import', async (req, res) => {
try {
await importEmails()
res.send("✅ Import gestartet – check Logs")
} catch (err) {
console.error(err)
res.status(500).send("❌ Fehler beim Import")
}
})

// ======================
// 📊 DASHBOARD
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
// 🚀 START
// ======================
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log("🚀 System läuft auf Port " + PORT)
})
})
