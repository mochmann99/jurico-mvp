import os
import stripe
import sqlite3
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stripe Setup
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Database
conn = sqlite3.connect("jurico.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'free'
)
""")

conn.commit()

# ---------------- ROOT ----------------

@app.get("/")
def root():
    return FileResponse("static/index.html")

# ---------------- ANALYZE ----------------

@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()
    email = data.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    cursor.execute("SELECT role FROM users WHERE email=?", (email,))
    user = cursor.fetchone()

    if not user or user[0] != "pro":
        raise HTTPException(status_code=403, detail="Upgrade required")

    text = data.get("text")

    # Demo Analyse (hier später OpenAI)
    result = f"""
Analyse:

Kurzbewertung:
Der Vertrag enthält typische Risiken.

Risiko-Score:
68 / 100

Empfehlung:
Klauseln prüfen lassen.
"""

    return {"result": result}

# ---------------- CHECKOUT ----------------

@app.post("/create-checkout-session")
async def create_checkout_session(request: Request):
    data = await request.json()
    email = data.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        customer_email=email,
        line_items=[{
            "price": os.getenv("STRIPE_PRICE_ID"),
            "quantity": 1,
        }],
        success_url=os.getenv("BASE_URL") + "/success",
        cancel_url=os.getenv("BASE_URL") + "/cancel",
    )

    return {"url": session.url}

# ---------------- WEBHOOK ----------------

@app.post("/webhook")
async def webhook(request: Request):

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except Exception as e:
        return {"error": str(e)}

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session["customer_email"]

        cursor.execute("SELECT id FROM users WHERE email=?", (email,))
        user = cursor.fetchone()

        if user:
            cursor.execute("UPDATE users SET role='pro' WHERE email=?", (email,))
        else:
            cursor.execute("INSERT INTO users (email, role) VALUES (?, 'pro')", (email,))

        conn.commit()

    return {"status": "ok"}

# ---------------- SUCCESS / CANCEL ----------------

@app.get("/success")
def success():
    return {"message": "Zahlung erfolgreich! Zugriff freigeschaltet."}

@app.get("/cancel")
def cancel():
    return {"message": "Zahlung abgebrochen."}
