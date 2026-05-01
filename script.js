async function analyzeCase() {
    const formData = new FormData();
    formData.append("beschreibung", document.querySelector("textarea").value);

    const response = await fetch("/analyze", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (data.error) {
        document.getElementById("output").innerHTML = "Fehler: " + data.error;
        return;
    }

    document.getElementById("output").innerHTML = `
        <b>Bewertung:</b> ${data.bewertung}<br>
        <b>Empfehlung:</b> ${data.empfehlung}<br>
        <b>Umsatzpotenzial:</b> ${data.umsatzpotenzial} €
    `;
}
