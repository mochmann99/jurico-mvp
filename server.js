import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'

const { Pool } = pkg

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

if (login === user && password === pass) {
return next()
}

res.setHeader('WWW-Authenticate', 'Basic realm="Login Required"')
return res.status(401).end()
})

// ======================
// 📊 METRICS
// ======================
let metrics = {
requests: 0,
errors: 0,
avgResponseTime: 0,
lastResponseTime: 0
}

// ======================
// 🧾 LOGGING + TIMING
// ======================
app.use((req, res, next) => {
const start = Date.now()
metrics.requests++

console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)

res.on('finish', () => {
const duration = Date.now() - start
metrics.lastResponseTime = duration
metrics.avgResponseTime =
(metrics.avgResponseTime + duration) / 2

```
if (res.statusCode >= 400) metrics.errors++
```

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

await pool.query(`     CREATE TABLE IF NOT EXISTS system_events (
      id SERIAL PRIMARY KEY,
      type TEXT,
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
// 📊 DASHBOARD
// ======================
app.get('/api/dashboard', async (req, res, next) => {
try {
const count = await pool.query('SELECT COUNT(*) FROM leads')
const latest = await pool.query(
'SELECT * FROM leads ORDER BY created_at DESC LIMIT 5'
)

```
res.json({
  totalLeads: count.rows[0].count,
  latestLeads: latest.rows
})
```

} catch (err) {
next(err)
}
})

// ======================
// 📈 KPI
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
// 🤖 LEVEL 5: ANOMALY CHECK
// ======================
async function detectAnomalies() {
if (metrics.avgResponseTime > 1000) {
await pool.query(
'INSERT INTO system_events (type, message) VALUES ($1, $2)',
['PERFORMANCE', 'High response time detected']
)
console.warn("⚠️ Performance anomaly detected")
}

if (metrics.errors > 10) {
await pool.query(
'INSERT INTO system_events (type, message) VALUES ($1, $2)',
['ERROR', 'High error rate detected']
)
console.warn("⚠️ Error anomaly detected")
}
}

// läuft alle 30 Sekunden
setInterval(detectAnomalies, 30000)

// ======================
// 📊 METRICS ENDPOINT
// ======================
app.get('/metrics', (req, res) => {
res.json(metrics)
})

// ======================
// 🌐 STATIC
// ======================
app.use(express.static(path.join(__dirname, 'public')))

// ======================
// HEALTH
// ======================
app.get('/health', (req, res) => res.send('ok'))

// ======================
// ROOT
// ======================
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ======================
// ❌ ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
console.error("🔥 ERROR:", err)

pool.query(
'INSERT INTO system_events (type, message) VALUES ($1, $2)',
['ERROR', err.message]
)

res.status(500).json({ error: "Internal Server Error" })
})

// ======================
// 🚀 START
// ======================
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log(`🚀 Level 5 System läuft auf Port ${PORT}`)
})
})
