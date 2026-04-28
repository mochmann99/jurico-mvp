import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'

const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ======================
// 🔐 LOGIN (Basic Auth)
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

if (login === user && password === pass) {
return next()
}

res.setHeader('WWW-Authenticate', 'Basic realm="Login Required"')
return res.status(401).end()
})

// ======================
// 📊 METRICS (Level 4)
// ======================
let metrics = {
requests: 0,
errors: 0
}

// ======================
// 🧾 LOGGING + METRICS
// ======================
app.use((req, res, next) => {
metrics.requests++

console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)

res.on('finish', () => {
if (res.statusCode >= 400) metrics.errors++
})

next()
})

// ======================
// ⚙️ MIDDLEWARE
// ======================
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
// 🔧 DB INIT
// ======================
async function initDB() {
await pool.query(`     CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
console.log("✅ DB ready")
}

// ======================
// 💾 SAVE LEAD
// ======================
app.post('/api/leads', async (req, res, next) => {
try {
const { name, email, phone, message } = req.body

```
await pool.query(
  'INSERT INTO leads (name, email, phone, message) VALUES ($1, $2, $3, $4)',
  [name, email, phone, message]
)

res.json({ success: true })
```

} catch (err) {
next(err)
}
})

// ======================
// 📊 DASHBOARD DATA
// ======================
app.get('/api/dashboard', async (req, res, next) => {
try {
const countResult = await pool.query('SELECT COUNT(*) FROM leads')
const leadsResult = await pool.query(
'SELECT * FROM leads ORDER BY created_at DESC LIMIT 5'
)

```
res.json({
  totalLeads: countResult.rows[0].count,
  latestLeads: leadsResult.rows
})
```

} catch (err) {
next(err)
}
})

// ======================
// 📈 KPI DATA (Level 4)
// ======================
app.get('/api/kpi', async (req, res, next) => {
try {
const result = await pool.query(`       SELECT DATE(created_at) as date, COUNT(*) as count
      FROM leads
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `)

```
res.json(result.rows)
```

} catch (err) {
next(err)
}
})

// ======================
// 📊 METRICS ENDPOINT
// ======================
app.get('/metrics', (req, res) => {
res.json(metrics)
})

// ======================
// 🌐 STATIC FILES
// ======================
app.use(express.static(path.join(__dirname, 'public')))

// ======================
// HEALTH CHECK
// ======================
app.get('/health', (req, res) => res.send('ok'))

// ======================
// ROOT
// ======================
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ======================
// ❌ GLOBAL ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
console.error("🔥 ERROR:", err)
res.status(500).json({ error: "Internal Server Error" })
})

// ======================
// 🚀 START SERVER
// ======================
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log(`🚀 Server läuft auf Port ${PORT}`)
})
})
