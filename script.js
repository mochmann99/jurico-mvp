const API_URL = "https://jurico.onrender.com/analyze";

document.getElementById("analyzeBtn").addEventListener("click", analyze);

async function analyze() {
    const text = document.getElementById("inputText").value.trim();
    const resultDiv = document.getElementById("result");

    if (!text) {
        resultDiv.innerHTML = "Bitte Beschreibung eingeben.";
        return;
    }

    resultDiv.innerHTML = "⏳ Analysiere...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                beschreibung: text
            })
        });

        const data = await response.json();

        if (data.analyse) {
            resultDiv.innerHTML = data.analyse;
        } else if (data.error) {
            resultDiv.innerHTML = "Fehler: " + data.error;
        } else {
            resultDiv.innerHTML = "Unbekannte Antwort: " + JSON.stringify(data);
        }

    } catch (error) {
        resultDiv.innerHTML = "❌ Verbindung fehlgeschlagen";
    }
}
