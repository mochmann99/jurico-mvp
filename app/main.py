from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

app = FastAPI()

# CORS (wichtig für Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Test
@app.get("/")
def root():
    return {"status": "Jurico läuft 🚀"}

# LOGIN CHECK (optional)
@app.get("/login")
def login():
    return {"message": "Login endpoint aktiv"}

# ANALYSE ENDPOINT (WICHTIG)
@app.post("/analyze")
def analyze(beschreibung: str = Form(...)):
    try:
        # 👉 einfache Logik (funktioniert IMMER)
        text = beschreibung.lower()

        if "unfall" in text:
            return {
                "bewertung": "hoch",
                "empfehlung": "Mandat annehmen",
                "umsatzpotenzial": "3000€"
            }

        elif "kündigung" in text:
            return {
                "bewertung": "mittel",
                "empfehlung": "prüfen",
                "umsatzpotenzial": "1200€"
            }

        else:
            return {
                "bewertung": "niedrig",
                "empfehlung": "ablehnen",
                "umsatzpotenzial": "0€"
            }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
