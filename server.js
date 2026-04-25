import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const openai = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = hasSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "JURICO MVP",
    openai: hasOpenAI,
    supabase: hasSupabase
  });
});

function fallbackAnalysis(matter) {
  return `Kurzbewertung:
Der Fall ist grundsätzlich geeignet für eine strukturierte anwaltliche Erstprüfung.

Erfolgschance:
Vorläufig ca. 65–80 %, abhängig von Unterlagen, Fristen und Nachweisen.

Nächster sinnvoller Schritt:
1. Unterlagen sichern
2. Fristen prüfen
3. Sachverhalt chronologisch ordnen
4. anwaltliches Erstschreiben vorbereiten

Benötigte Unterlagen:
- Schriftverkehr
- Verträge / Bescheide / Gutachten
- Fristenübersicht
- Zahlungs- oder Schadensnachweise

Erstkontakt-Schreiben:
Sehr geehrte/r Mandant/in,
vielen Dank für Ihre Anfrage. Wir haben den Sachverhalt vorläufig geprüft und empfehlen als nächsten Schritt die Sichtung der vorhandenen Unterlagen sowie die Prüfung relevanter Fristen.

Fallnotiz:
${matter}`;
}

app.post("/api/analyze", async (req, res) => {
  try {
    const { name = "", email = "", phone = "", matter = "" } = req.body || {};

    if (!matter || matter.trim().length < 8) {
      return res.status(400).json({ error: "Bitte einen konkreten Fall mit mindestens 8 Zeichen eingeben." });
    }

    let ai_result = "";

    if (openai) {
      const prompt = `
Du bist JURICO, ein seriöses Legal-Tech-System für Kanzleien.
Analysiere den Mandantenfall verkaufs- und kanzleiorientiert.
Sprich nicht wie ein Gerichtsurteil, sondern wie eine verwertbare Erstprüfung.
Keine Rechtsberatung als endgültige Aussage, sondern strukturierte Vorprüfung.

Gib exakt diese Struktur aus:
1. Kurzbewertung
2. Erfolgschance in Prozent
3. Nächster sinnvoller Schritt
4. Benötigte Unterlagen
5. Erstkontakt-Schreiben an den Mandanten
6. Umsatz-/Mandatspotenzial

Fall:
${matter}
`;
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt
      });
      ai_result = response.output_text || fallbackAnalysis(matter);
    } else {
      ai_result = fallbackAnalysis(matter);
    }

    let saved = null;
    if (supabase) {
      const { data, error } = await supabase
        .from("leads")
        .insert([{ name, email, phone, matter, ai_result }])
        .select()
        .single();
      if (error) throw error;
      saved = data;
    }

    res.json({ ok: true, lead: saved, ai_result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analyse fehlgeschlagen.", details: error.message });
  }
});

app.get("/api/leads", async (_req, res) => {
  if (!supabase) return res.json({ leads: [] });

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ leads: data });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`JURICO MVP läuft auf http://localhost:${port}`);
});