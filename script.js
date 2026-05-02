async function analyze() {
    const text = document.getElementById("inputText").value;
    const resultDiv = document.getElementById("result");

    resultDiv.innerHTML = "⏳ Analysiere...";

    try {
        const response = await fetch("https://jurico.onrender.com/analyze", {
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
        } else {
            resultDiv.innerHTML = "❌ Fehler: " + JSON.stringify(data);
        }

    } catch (error) {
        resultDiv.innerHTML = "❌ Verbindung fehlgeschlagen";
    }
}
