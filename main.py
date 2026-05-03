import os
import stripe
import sqlite3
from datetime import datetime

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

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# DB
conn = sqlite3.connect("jurico.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'free',
    stripe_customer_id TEXT
)
""")

conn.commit()

# ---------------- ROOT ----------------

@app.get("/")
def root():
    return FileResponse("static/index.html")

# ---------------- CREATE CUSTOMER ----------------

@app.post("/create-customer")
async def create_customer(request: Request):
    data = await request.json()
    email = data.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    customer = stripe.Customer.create(email=email)

    cursor.execute(
        "INSERT OR IGNORE INTO users (email, stripe_customer_id) VALUES (?, ?)",
        (email, customer.id)
    )
    conn.commit()

    return {"customer_id": customer.id}

# ---------------- PAYMENT INTENT ----------------

@app.post("/create-payment-intent")
async def create_payment_intent(request: Request):
    data = await request.json()
    customer_id = data.get("customer_id")

    intent = stripe.PaymentIntent.create(
        amount=7900,  # 79€
        currency="eur",
        customer=customer_id,
        automatic_payment_methods={"enabled": True}
    )

    return {
        "client_secret": intent.client_secret
    }

# ---------------- CREATE SUBSCRIPTION ----------------

@app.post("/create-subscription")
async def create_subscription(request: Request):
    data = await request.json()
    customer_id = data.get("customer_id")

    subscription = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": os.getenv("STRIPE_PRICE_ID")}],
        payment_behavior="default_incomplete",
        expand=["latest_invoice.payment_intent"]
    )

    return {
        "subscription_id": subscription.id
    }

# ---------------- ACTIVATE USER ----------------

@app.post("/activate-user")
async def activate_user(request: Request):
    data = await request.json()
    email = data.get("email")

    cursor.execute(
        "UPDATE users SET role='pro' WHERE email=?",
        (email,)
    )
    conn.commit()

    return {"status": "pro"}

# ---------------- ANALYZE ----------------

@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()
    email = data.get("email")

    cursor.execute("SELECT role FROM users WHERE email=?", (email,))
    user = cursor.fetchone()

    if not user or user[0] != "pro":
        raise HTTPException(status_code=403, detail="Upgrade required")

    text = data.get("text")

    result = f"""
Analyse:

Kurzbewertung:
Der Vertrag enthält Risiken.

Risiko-Score:
68 / 100

Empfehlung:
Prüfen lassen.
"""

    return {"result": result}
