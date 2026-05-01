from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
from openai import OpenAI

# ✅ APP ZUERST DEFINIEREN (wichtig!)
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Health Check
@app.get("/")
def root():
    return {"status": "Jurico AI läuft"}

# Analyse
@app.post("/analyze")
def analyze(beschreibung: str = Form(...)):
    try:
        prompt = f"""
Du bist ein erfahrener deutscher Rechtsanwalt.

Analysiere folgenden Fall:

"{beschreibung}"

Gib ausschließlich gültiges JSON zurück:

{{
  "bewertung": "hoch/mittel/niedrig",
  "empfehlung": "Mandat annehmen/prüfen/ablehnen",
  "umsatzpotenzial": "Zahl in Euro"
}}
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content

        parsed = json.loads(content)

        return JSONResponse(content=parsed)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
