from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from openai import OpenAI

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI Client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/")
def root():
    return {"status": "Jurico AI läuft"}

@app.post("/analyze")
def analyze(beschreibung: str = Form(...)):
    try:
        prompt = f"""
Du bist ein erfahrener deutscher Rechtsanwalt.

Analysiere folgenden Fall:

"{beschreibung}"

Bewerte:
1. Mandatswahrscheinlichkeit (hoch/mittel/niedrig)
2. Empfehlung (annehmen/prüfen/ablehnen)
3. Umsatzpotenzial (geschätzt in €)

Antwort nur als JSON:

{{
  "bewertung": "...",
  "empfehlung": "...",
  "umsatzpotenzial": "..."
}}
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content

        return JSONResponse(content={"result": content})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
