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

app = FastAPI(title="Jurico Enterprise Billing")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_PRO = os.getenv("STRIPE_PRICE_PRO")
STRIPE_PRICE_KANZLEI = os.getenv("STRIPE_PRICE_KANZLEI")
STRIPE_PRICE_ENTERPRISE = os.getenv("STRIPE_PRICE_ENTERPRISE")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

client = OpenAI(api_key=OPENAI_API_KEY)
stripe.api_key = STRIPE_SECRET_KEY

conn = sqlite3.connect("jurico.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'free',
    created_at TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'member',
    created_at TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER,
    user_email TEXT,
    input_text TEXT,
    result TEXT,
    created_at TEXT
)
""")

conn.commit()


def now():
    return datetime.utcnow().isoformat()


def price_for_plan(plan: str):
    if plan == "pro":
        return STRIPE_PRICE_PRO
    if plan == "kanzlei":
        return STRIPE_PRICE_KANZLEI
    if plan == "enterprise":
        return STRIPE_PRICE_ENTERPRISE
    return None


def plan_limit(plan: str):
    if plan == "free":
        return 1
    if plan == "pro":
        return 100
    if plan == "kanzlei":
        return 1000
    if plan == "enterprise":
        return 100000
    return 1


def get_or_create_org(email: str, name: str = None):
    email = email.strip().lower()
    cursor.execute("SELECT id, plan, subscription_status FROM organizations WHERE email=?", (email,))
    row = cursor.fetchone()

    if row:
        return row[0]

    cursor.execute(
        "INSERT INTO organizations (name, email, plan, subscription_status, created_at) VALUES (?, ?, ?, ?, ?)",
        (name or email, email, "free", "free", now())
    )
    conn.commit()
    return cursor.lastrowid


def get_org_by_email(email: str):
    email = email.strip().lower()
    cursor.execute("""
        SELECT id, name, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status
        FROM organizations
        WHERE email=?
    """, (email,))
    row = cursor.fetchone()

    if not row:
        org_id = get_or_create_org(email)
        cursor.execute("""
            SELECT id, name, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status
            FROM organizations
            WHERE id=?
        """, (org_id,))
        row = cursor.fetchone()

    return {
        "id": row[0],
