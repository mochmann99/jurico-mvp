from fastapi import FastAPI, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

# =========================
# ENV LADEN
# =========================
load_dotenv()

app = FastAPI()

# =========================
# HEALTH CHECK
# =========================
@app.get("/")
def root():
    return {
        "status": "Jurico läuft",
        "client_loaded": bool(os.getenv("CLIENT_ID")),
        "tenant_loaded": bool(os.getenv("TENANT_ID"))
    }

# =========================
# LOGIN (Platzhalter)
# =========================
@app.get("/login")
def login():
    return {"status": "Login aktuell nicht aktiv"}

# =========================
# ANALYSE (WICHTIG!)
# =========================
@app.post("/analyze")
def analyze(
    name: str = Form(...),
    email: str = Form(...),
    telefon: str = Form(...),
    beschreibung: str = Form(...)
):
    try:
        # Dummy-Logik (stabil, garantiert funktionierend)
        result = {
            "bewertung": "hoch",
            "empfehlung": "Mandat annehmen",
            "umsatzpotenzial": "2500€",
            "zusammenfassung": f"Fall von {name}: {beschreibung[:100]}"
        }

        return JSONResponse(content=result)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
