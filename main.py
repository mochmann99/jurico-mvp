import os
from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI

# FastAPI App initialisieren
app = FastAPI()

# OpenAI Client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Request Schema
class AnalyzeRequest(BaseModel):
    beschreibung: str

# Root Endpoint (Health Check)
@app.get("/")
def root():
    return {"status": "Jurico AI läuft"}

# Analyse Endpoint
@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Du bist ein juristischer KI-Assistent. Analysiere den Fall strukturiert und verständlich."
                },
                {
                    "role": "user",
                    "content": request.beschreibung
                }
            ]
        )

        return {
            "analyse": response.choices[0].message.content
        }

    except Exception as e:
        return {
            "error": str(e)
        }
