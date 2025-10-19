// server.js
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import cheerio from "cheerio";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3030;
const DATA_FILE = path.join(process.cwd(), "data.json");

// Priorita lig (vyšší = důležitější)
const LEAGUE_PRIORITY = [
  "NHL", "Premier League", "LaLiga", "Serie A", "Bundesliga",
  "TELH", "Fortuna liga", "Champions League"
];

// --- Pomocné: načte fallback data.json ---
async function readFallback() {
  try {
    const txt = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    return { matches: [] };
  }
}

// --- Jednoduchá heuristika pro hodnocení zápasu ---
function scoreMatch(m) {
  let score = 0;
  const league = (m.league||"").toLowerCase();
  // prefer ligy dle priority
  LEAGUE_PRIORITY.forEach((l, i) => {
    if (league.includes(l.toLowerCase())) score += (LEAGUE_PRIORITY.length - i) * 10;
  });
  // tv/stream zvýší skóre
  if (m.tv && m.tv.length) score += 15;
  // populární týmy (přidej další dle potřeby)
  const bigTeams = ["sparta","slavia","kometa","real madrid","barcelona","manchester united","boston"];
  const teams = `${m.home} ${m.away}`.toLowerCase();
  bigTeams.forEach(t => { if (teams.includes(t)) score += 12; });
  // blízký čas = důležitější
  if (m.date) {
    const diffHours = (new Date(m.date) - new Date())/36e5;
    if (diffHours < 48 && diffHours > 0) score += 8;
  }
  return score;
}

// --- Volitelný scraper (pokud chceš risknout scraping Livesportu) ---
// Poznámka: často Livesport blokuje přímé scrapování a mění strukturu.
// Tento scraper je ukázkový a může vyžadovat úpravy.
async function scrapeLivesportForDate(targetDateISO) {
  try {
    // TADY by normálně šel request na livesport - ale stránky často vyžadují JS.
    // Místo toho: pokud máš vlastní feed/API, pak sem napiš URL.
    // Jako fallback použijeme data.json.
    return null;
  } catch (e) {
    console.warn("Scrape failed:", e.message);
    return null;
  }
}

// --- Endpoint: top matches ---
app.get("/top-matches", async (req, res) => {
  try {
    const day = req.query.day || "tomorrow"; // "tomorrow" or "dayafter"
    // spočti požadované datum
    const base = new Date();
    const offset = day === "tomorrow" ? 1 : (day === "dayafter" ? 2 : 1);
    const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
    const targetISO = target.toISOString().slice(0,10);

    // Zkus scrape (pokud implementováno), jinak fallback data.json
    let scraped = await scrapeLivesportForDate(targetISO);
    let data = scraped || await readFallback();

    // Body a řazení
    const scored = (data.matches || []).map(m => ({...m, score: scoreMatch(m)}));
    scored.sort((a,b) => b.score - a.score);

    // limituj na top 10
    const top = scored.slice(0, 10);

    res.json({ date: targetISO, top });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Endpoint pro debug / nahrání test dat (pouze lokálně) ---
app.post("/upload-demo", async (req,res) => {
  try {
    const body = req.body;
    if (!body.matches) return res.status(400).send("Need matches array");
    await fs.writeFile(DATA_FILE, JSON.stringify(body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
