import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'

const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// 🔐 LOGIN (Basic Auth)
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

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 📦 DB Verbindung
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
})

// 🗄️ AUTO DB SETUP
async function initDB() {
try {
await pool.query(`       CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
console.log("✅ DB bereit")
} catch (err) {
console.error("❌ DB Fehler:", err)
}
}

// 💾 API: Lead speichern
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
res.status(500).json({ error: 'DB Fehler' })
}
})

// 🌐 Static Frontend
app.use(express.static(path.join(__dirname, 'public')))

// Health (Render braucht das)
app.get('/health', (req, res) => res.send('ok'))

// Root
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// 🚀 Start
const PORT = process.env.PORT || 10000

initDB().then(() => {
app.listen(PORT, () => {
console.log(`Server läuft auf Port ${PORT}`)
})
})
