import express from 'express'
const app = express()

app.get('*', (req, res) => {
res.send("SERVER AKTIV: " + req.url)
})

app.listen(process.env.PORT || 10000)
