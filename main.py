from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

# CORS erlauben (Frontend Zugriff)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Endpoint (Health Check)
@app.get("/")
def root():
    return {"status": "Jurico läuft stabil"}

# Analyse Endpoint (STABIL – KEIN JSON ERROR MEHR)
@app.post("/analyze")
def analyze(beschreibung: str = Form(...)):
    try:
        text = beschreibung.lower()

        if "unfall" in text:
            result = {
                "bewertung": "hoch",
                "empfehlung": "Mandat annehmen",
                "umsatzpotenzial": "3000€"
            }

        elif "kündigung" in text:
            result = {
                "bewertung": "mittel",
                "empfehlung": "prüfen",
                "umsatzpotenzial": "1200€"
            }

        else:
            result = {
                "bewertung": "niedrig",
                "empfehlung": "ablehnen",
                "umsatzpotenzial": "0€"
            }

        return JSONResponse(content=result)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
