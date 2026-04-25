# JURICO MVP – Deploy Ready

## Lokal starten
```bash
npm install
cp .env.example .env
npm start
```

Dann öffnen:
http://localhost:3000

## Ohne API-Key
Das System startet trotzdem und liefert eine Fallback-Analyse.

## Mit OpenAI
In `.env` eintragen:
OPENAI_API_KEY=...

## Mit Supabase
1. Supabase-Projekt erstellen
2. `schema.sql` im Supabase SQL Editor ausführen
3. SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in `.env` eintragen

## Deploy
Render:
- Repository hochladen
- `render.yaml` verwenden
- Umgebungsvariablen setzen

Docker:
```bash
docker build -t jurico-mvp .
docker run -p 3000:3000 --env-file .env jurico-mvp
```
