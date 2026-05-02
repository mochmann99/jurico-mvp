from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI
import os

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS FREIGEBEN (WICHTIG!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # später einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class RequestData(BaseModel):
    beschreibung: str


@app.get("/")
def root():
    return {"status": "Jurico AI läuft"}


@app.post("/analyze")
def analyze(data: RequestData):
    try:
        text = data.beschreibung

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Du bist ein deutscher Jurist und analysierst Verträge präzise."
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

    except Exception as e:
        return {
            "error": str(e)
        }
