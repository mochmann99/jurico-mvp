import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  await pool.query(`  CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`)

connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
})
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

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

app.use(express.static(path.join(__dirname, 'public')))

app.get('/health', (req, res) => res.send('ok'))

app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const PORT = process.env.PORT || 10000

app.listen(PORT, () => {
console.log("Server läuft sauber")
})
