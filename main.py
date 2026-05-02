import os
from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AnalyzeRequest(BaseModel):
    beschreibung: str

@app.get("/")
def root():
    return {"status": "Jurico AI läuft"}

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du bist ein juristischer KI-Assistent."},
                {"role": "user", "content": request.beschreibung}
            ]
        )

        return {
            "analyse": response.choices[0].message.content
        }

    except Exception as e:
        return {"error": str(e)}
