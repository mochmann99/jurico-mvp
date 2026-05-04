import pandas as pd
import sqlite3
from pathlib import Path

CSV_PATH = r"C:\JURICO\manual_export.csv"
DB_PATH = r"C:\JURICO\cmmi_output\jurico_csv.db"
OUT_PATH = r"C:\JURICO\cmmi_output\ZDF_Fundstellen.csv"

keywords = {
    "syncope": ["Synkope", "Bewusstlosigkeit", "Kollaps"],
    "doctors": ["Pflieger", "Schubert", "Heidelberg", "Neurologie"],
    "gdb": ["GdB", "Widerspruch", "VdK"],
    "limitations": ["Belastbarkeit", "Erschöpfung", "Schmerzen"],
    "accident": ["Generali", "Unfall"]
}

df = pd.read_csv(CSV_PATH, encoding="utf-8", sep=",", engine="python")

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
            row.get("Received", ""),
            cat,
            kw,
            row.get("Subject", ""),
            row.get("From", ""),
            text[:300]
        ))

conn.commit()

out = pd.read_sql_query("SELECT * FROM evidence", conn)
out.to_csv(OUT_PATH, index=False)

print("FERTIG:", OUT_PATH)
