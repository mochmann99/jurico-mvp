import express from 'express'

const app = express()

app.get('/', (req, res) => {
res.send('JURICO läuft')
})

app.get('/test-import', (req, res) => {
res.send('✅ TEST IMPORT OK')
})

const PORT = process.env.PORT || 10000

app.listen(PORT, () => {
console.log('Server läuft auf Port ' + PORT)
})
