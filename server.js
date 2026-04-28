import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'

const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// 🔐 LOGIN
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

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 🗄️ DB
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
})

// 🔧 DB INIT
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

// 💾 SAVE LEAD
app.post('/api/leads', async (req, res) => {
const { name, email, phone, message } = req.body

try {
await pool.query(
'INSERT INTO leads (name, email, phone, message) VALUES ($1, $2, $3, $4)',
[name, email, phone, message]
)

```
res.json({ success: true })
```

} catch (err) {
console.error(err)
res.status(500).json({ error: 'DB error' })
}
})

// 📊 DASHBOARD API
app.get('/api/dashboard', async (req, res) => {
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
console.error(err)
res.status(500).json({ error: 'DB error' })
}
})

// 🌐 STATIC
app.use(express.static(path.join(__dirname, 'public')))

// HEALTH
app.get('/health', (req, res) => res.send('ok'))

// ROOT
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// START
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log(`Server läuft auf Port ${PORT}`)
})
})
