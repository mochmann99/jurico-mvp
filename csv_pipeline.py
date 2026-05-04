import pandas as pd
import sqlite3
from pathlib import Path

# 👉 DEIN CSV-PFAD
CSV_PATH = r"Z:\20.06.2006\Projekte\ChatGPT\manual_export.csv"

# 👉 OUTPUT bleibt gleich
DB_PATH = r"C:\JURICO\cmmi_output\jurico_csv.db"
OUT_PATH = r"C:\JURICO\cmmi_output\ZDF_Fundstellen.csv"

keywords = {
    "syncope": ["Synkope", "Bewusstlosigkeit", "Kollaps"],
    "doctors": ["Pflieger", "Schubert", "Heidelberg", "Neurologie"],
    "gdb": ["GdB", "Widerspruch", "VdK"],
    "limitations": ["Belastbarkeit", "Erschöpfung", "Schmerzen"],
    "accident": ["Generali", "Unfall"]
}

# 👉 CSV laden (robust gegen Outlook-Format)
df = pd.read_csv(CSV_PATH, encoding="latin1", sep=";", on_bad_lines="skip")

print("Spalten erkannt:", df.columns.tolist())

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS evidence (
    datum TEXT,
    kategorie TEXT,
    keyword TEXT,
    betreff TEXT,
    absender TEXT,
    fundstelle TEXT
)
""")

def match(text):
    results = []
    for cat, words in keywords.items():
        for w in words:
            if w.lower() in text.lower():
                results.append((cat, w))
    return results

for _, row in df.iterrows():
    text = str(row)

    hits = match(text)

    for cat, kw in hits:
        cur.execute("""
        INSERT INTO evidence VALUES (?, ?, ?, ?, ?, ?)
        """, (
            str(row.get("Received", "")),
            cat,
            kw,
            str(row.get("Subject", "")),
            str(row.get("From", "")),
            text[:300]
        ))

conn.commit()

out = pd.read_sql_query("SELECT * FROM evidence", conn)
out.to_csv(OUT_PATH, index=False)

print("FERTIG:", OUT_PATH)
