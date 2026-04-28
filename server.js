import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
import OpenAI from 'openai'

const { Pool } = pkg

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ======================
// 🔐 LOGIN
// ======================
app.use((req, res, next) => {
const user = process.env.JURICO_USER || "admin"
const pass = process.env.JURICO_PASSWORD || "1234"

const auth = req.headers.authorization
if (!auth) {
res.setHeader('WWW-Authenticate', 'Basic realm="Login Required"')
return res.status(401).end()
}

const [login, password] = Buffer.from(auth.split(' ')[1], 'base64')
.toString()
.split(':')

if (login === user && password === pass) return next()

res.setHeader('WWW-Authenticate', 'Basic realm="Login Required"')
return res.status(401).end()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ======================
// 🗄️ DATABASE
// ======================
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
})

// ======================
// 🔧 INIT DB
// ======================
async function initDB() {
await pool.query(`     CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      message TEXT,
      analysis TEXT,
      score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
console.log("DB ready")
}

// ======================
// 🤖 AI ANALYSIS
// ======================
async function analyzeText(text) {
const completion = await openai.chat.completions.create({
model: "gpt-4o-mini",
messages: [
{
role: "system",
content: "Du bist ein juristischer Assistent. Bewerte Fälle von 1-10 und gib eine kurze Analyse."
},
{
role: "user",
content: text
}
]
})

const output = completion.choices[0].message.content

const scoreMatch = output.match(/\d+/)
const score = scoreMatch ? parseInt(scoreMatch[0]) : 5

return { analysis: output, score }
}

// ======================
// 💾 SAVE LEAD + AI
// ======================
app.post('/api/leads', async (req, res) => {
const { name, email, phone, message } = req.body

try {
const ai = await analyzeText(message)

```
await pool.query(
  `INSERT INTO leads (name, email, phone, message, analysis, score)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [name, email, phone, message, ai.analysis, ai.score]
)

res.json({ success: true, ai })
```

} catch (err) {
console.error(err)
res.status(500).json({ error: "AI Fehler" })
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
// 🌐 STATIC FILES
// ======================
app.use(express.static(path.join(__dirname, 'public')))

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log("AI System läuft auf Port " + PORT)
})
})
