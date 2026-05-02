from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from openai import OpenAI

# OpenAI Client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# CORS (wichtig für dein Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestData(BaseModel):
    beschreibung: str

@app.get("/")
def root():
    return {"status": "Jurico AI läuft"}

@app.post("/analyze")
def analyze(data: RequestData):
    text = data.beschreibung

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Du bist ein deutscher Jurist. Analysiere Verträge, erkenne Risiken, fasse verständlich zusammen."
            },
            {
                "role": "user",
                "content": text
            }
        ]
    )

    return {
        "analyse": response.choices[0].message.content
    }
