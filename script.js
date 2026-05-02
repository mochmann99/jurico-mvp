async function analyze() {
    const input = document.getElementById("input").value;
    const resultDiv = document.getElementById("result");

    resultDiv.innerText = "Analysiere...";

    try {
        const response = await fetch("https://jurico.onrender.com/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                beschreibung: input
            })
        });

        const data = await response.json();

        if (data.analyse) {
            resultDiv.innerText = data.analyse;
        } else {
            resultDiv.innerText = JSON.stringify(data, null, 2);
        }

    } catch (error) {
        resultDiv.innerText = "Fehler: " + error.message;
    }
}
