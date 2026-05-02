import os
import sqlite3
from datetime import datetime
from io import BytesIO

import stripe
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from openai import OpenAI
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

load_dotenv()

app = FastAPI(title="Jurico V6")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

client = OpenAI(api_key=OPENAI_API_KEY)
stripe.api_key = STRIPE_SECRET_KEY

conn = sqlite3.connect("jurico.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'free',
    created_at TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    input_text TEXT,
    result TEXT,
    created_at TEXT
)
""")

conn.commit()


@app.get("/")
def root():
    return FileResponse("static/index.html")


def get_user_role(email: str) -> str:
    cursor.execute("SELECT role FROM users WHERE email=?", (email,))
    row = cursor.fetchone()

    if row:
        return row[0]

    cursor.execute(
        "INSERT INTO users (email, role, created_at) VALUES (?, ?, ?)",
        (email, "free", datetime.utcnow().isoformat())
    )
    conn.commit()
    return "free"


def save_analysis(email: str, input_text: str, result: str):
    cursor.execute(
        "INSERT INTO analyses (email, input_text, result, created_at) VALUES (?, ?, ?, ?)",
        (email, input_text, result, datetime.utcnow().isoformat())
    )
    conn.commit()
    return cursor.lastrowid


@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()

    email = data.get("email", "").strip().lower()
    text = data.get("text", "").strip()

    if not email:
        raise HTTPException(status_code=400, detail="E-Mail erforderlich")

    if not text:
        raise HTTPException(status_code=400, detail="Text erforderlich")

    role = get_user_role(email)

    if role != "pro":
        cursor.execute("SELECT COUNT(*) FROM analyses WHERE email=?", (email,))
        count = cursor.fetchone()[0]

        if count >= 1:
            raise HTTPException(status_code=403, detail="Upgrade erforderlich")

    prompt = f"""
Du bist Jurico AI, ein spezialisierter deutscher Legal-Tech-Assistent.

Analysiere folgenden Vertrag oder Sachverhalt professionell, verständlich und strukturiert.

Wichtiger Hinweis:
Du ersetzt keine anwaltliche Beratung. Formuliere vorsichtig, klar und entscheidungsorientiert.

Struktur der Antwort:

1. Kurzbewertung
2. Risiko-Score von 0 bis 100
3. Kritische Klauseln oder Punkte
4. Juristische Einordnung
5. Handlungsempfehlung
6. Fazit

Text:
{text}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Du bist ein präziser deutscher Legal-Tech-Assistent für Vertrags- und Risikoanalysen."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        result = response.choices[0].message.content
        analysis_id = save_analysis(email, text, result)

        return {
            "analysis_id": analysis_id,
            "analyse": result
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/create-checkout-session")
async def create_checkout_session(request: Request):
    data = await request.json()
    email = data.get("email", "").strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="E-Mail erforderlich")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        customer_email=email,
        line_items=[
            {
                "price": STRIPE_PRICE_ID,
                "quantity": 1
            }
        ],
        success_url=BASE_URL + "/success",
        cancel_url=BASE_URL + "/cancel"
    )

    return {"url": session.url}


@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        return {"error": str(e)}

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session.get("customer_email", "").strip().lower()

        if email:
            cursor.execute("SELECT id FROM users WHERE email=?", (email,))
            row = cursor.fetchone()

            if row:
                cursor.execute("UPDATE users SET role='pro' WHERE email=?", (email,))
            else:
                cursor.execute(
                    "INSERT INTO users (email, role, created_at) VALUES (?, ?, ?)",
                    (email, "pro", datetime.utcnow().isoformat())
                )

            conn.commit()

    return {"status": "ok"}


@app.get("/history")
def history(email: str):
    email = email.strip().lower()

    cursor.execute(
        "SELECT id, input_text, result, created_at FROM analyses WHERE email=? ORDER BY id DESC",
        (email,)
    )

    rows = cursor.fetchall()

    return [
        {
            "id": row[0],
            "input_text": row[1],
            "result": row[2],
            "created_at": row[3]
        }
        for row in rows
    ]


@app.get("/report/{analysis_id}")
def report(analysis_id: int):
    cursor.execute(
        "SELECT email, input_text, result, created_at FROM analyses WHERE id=?",
        (analysis_id,)
    )

    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Analyse nicht gefunden")

    email, input_text, result, created_at = row

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)

    width, height = A4
    y = height - 50

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, y, "Jurico Analysebericht")

    y -= 35
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y, f"Nutzer: {email}")

    y -= 18
    pdf.drawString(50, y, f"Datum: {created_at}")

    y -= 35
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Eingabetext:")

    y -= 20
    pdf.setFont("Helvetica", 10)

    for line in input_text.splitlines():
        for chunk in [line[i:i+95] for i in range(0, len(line), 95)]:
            if y < 80:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)
            pdf.drawString(50, y, chunk)
            y -= 14

    y -= 25
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Analyse:")

    y -= 20
    pdf.setFont("Helvetica", 10)

    for line in result.splitlines():
        for chunk in [line[i:i+95] for i in range(0, len(line), 95)]:
            if y < 80:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)
            pdf.drawString(50, y, chunk)
            y -= 14

    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=jurico_report_{analysis_id}.pdf"
        }
    )


@app.get("/success")
def success():
    return FileResponse("static/success.html")


@app.get("/cancel")
def cancel():
    return FileResponse("static/cancel.html")
