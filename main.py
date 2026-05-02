import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="Jurico AI V2")

app.add_middleware(
CORSMiddleware,
allow_origins=["*"],
allow_credentials=False,
allow_methods=["*"],
allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class AnalyzeRequest(BaseModel):
beschreibung: str


@app.get("/")
def root():
return {"status": "Jurico AI V2 läuft"}


@app.post("/analyze")
def analyze(data: AnalyzeRequest):
try:
text = data.beschreibung.strip()

if not text:
return {
"error": "Bitte einen Vertrag, Fall oder Sachverhalt eingeben."
}

prompt = f"""
Du bist Jurico AI, ein spezialisierter deutscher Legal-Tech-Assistent.

Analysiere den folgenden Sachverhalt oder Vertrag professionell, aber verständlich.

Wichtiger Hinweis:
Du ersetzt keine anwaltliche Beratung. Formuliere sachlich, strukturiert und vorsichtig.

Gib die Antwort exakt in dieser Struktur aus:

1. Kurzbewertung
2. Risiko-Score von 0 bis 100
3. Zentrale rechtliche Punkte
4. Mögliche Risiken
5. Handlungsempfehlung
6. Kurzfazit

Text/Sachverhalt:
{text}
"""

response = client.chat.completions.create(
model="gpt-4o-mini",
messages=[
{
"role": "system",
"content": "Du bist ein präziser deutscher Legal-Tech-Assistent für Vertrags- und Fallanalysen."
},
{
"role": "user",
"content": prompt
}
],
temperature=0.2
)

return {
"analyse": response.choices[0].message.content
}

except Exception as e:
return {
"error": str(e)
} 
