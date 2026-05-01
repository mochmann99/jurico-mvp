@app.post("/analyze")
def analyze(beschreibung: str = Form(...)):
    try:
        prompt = f"""
Du bist ein erfahrener deutscher Rechtsanwalt.

Analysiere folgenden Fall:

"{beschreibung}"

Gib ausschließlich gültiges JSON zurück:

{{
  "bewertung": "hoch/mittel/niedrig",
  "empfehlung": "Mandat annehmen/prüfen/ablehnen",
  "umsatzpotenzial": "Zahl in Euro"
}}
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content

        # 💥 WICHTIG: String → echtes JSON
        import json
        parsed = json.loads(content)

        return JSONResponse(content=parsed)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
