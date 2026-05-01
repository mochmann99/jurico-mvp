import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.post("/analyze")
async def analyze(beschreibung: str):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du bist ein juristischer KI-Assistent."},
                {"role": "user", "content": beschreibung}
            ]
        )

        return {
            "analyse": response.choices[0].message.content
        }

    except Exception as e:
        return {"error": str(e)}
