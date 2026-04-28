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

if (login === user && password === pass) return next()

res.setHeader('WWW-Authenticate', 'Basic realm="Login Required"')
return res.status(401).end()
})

// ======================
// 📊 METRICS
// ======================
let metrics = {
requests: 0,
errors: 0,
avgResponseTime: 0
}

// ======================
// ⚡ REQUEST TRACKING
// ======================
app.use((req, res, next) => {
const start = Date.now()
metrics.requests++

res.on('finish', () => {
const duration = Date.now() - start
metrics.avgResponseTime =
(metrics.avgResponseTime * (metrics.requests - 1) + duration) / metrics.requests

```
if (res.statusCode >= 400) metrics.errors++
```

})

console.log(JSON.stringify({
time: new Date().toISOString(),
method: req.method,
url: req.url
}))

next()
})

// ======================
// ⚙️ MIDDLEWARE
// ======================
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ======================
// 🗄️ DB
// ======================
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false },
max: 10 // Connection Pooling
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

console.log("DB ready")
}

// ======================
// ⚡ CACHE
// ======================
let cache = {
dashboard: null,
timestamp: 0
}

const CACHE_TTL = 5000 // 5 Sekunden

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

cache.dashboard = null // Cache invalidieren

res.json({ success: true })
```

} catch (err) {
next(err)
}
})

// ======================
// 📊 DASHBOARD (MIT CACHE)
// ======================
app.get('/api/dashboard', async (req, res, next) => {
try {
const now = Date.now()

```
if (cache.dashboard && (now - cache.timestamp < CACHE_TTL)) {
  return res.json(cache.dashboard)
}

const count = await pool.query('SELECT COUNT(*) FROM leads')
const latest = await pool.query(
  'SELECT * FROM leads ORDER BY created_at DESC LIMIT 5'
)

const data = {
  totalLeads: count.rows[0].count,
  latestLeads: latest.rows
}

cache.dashboard = data
cache.timestamp = now

res.json(data)
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
// 📊 METRICS
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
console.error("ERROR:", err)
metrics.errors++
res.status(500).json({ error: "Internal Server Error" })
})

// ======================
// 🚀 START
// ======================
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log(`Optimized server running on ${PORT}`)
})
})
