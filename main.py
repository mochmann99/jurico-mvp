from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 🔥 DAS IST DER FIX
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Jurico AI läuft"}

@app.post("/analyze")
def analyze(data: dict):
    text = data.get("beschreibung", "")
    return {"analyse": f"Analyse von: {text}"}
