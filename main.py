from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText

# ENV laden
load_dotenv()

app = FastAPI()

# =========================
# EMAIL FUNKTION
# =========================
def send_email(name, email, telefon, beschreibung):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    subject = "Neuer Jurico Lead"
    body = f"""
Neuer Mandant:

Name: {name}
E-Mail: {email}
Telefon: {telefon}

Fall:
{beschreibung}
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = smtp_user

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)


# =========================
# STARTSEITE
# =========================
@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <h1>Jurico läuft</h1>
    <form action="/submit" method="post">
        <input name="name" placeholder="Name"><br>
        <input name="email" placeholder="E-Mail"><br>
        <input name="telefon" placeholder="Telefon"><br>
        <textarea name="beschreibung" placeholder="Fallbeschreibung"></textarea><br>
        <button type="submit">Absenden</button>
    </form>
    """

# =========================
# FORMULAR HANDLING
# =========================
@app.post("/submit")
def submit(
    name: str = Form(...),
    email: str = Form(...),
    telefon: str = Form(...),
    beschreibung: str = Form(...)
):
    send_email(name, email, telefon, beschreibung)

    return {"status": "Lead gespeichert & Mail gesendet"}
