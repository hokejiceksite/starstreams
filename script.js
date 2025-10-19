async function loadMatches() {
  const day = document.getElementById("day").value;
  const list = document.getElementById("list");

  list.innerHTML = `<p class="info">🔍 Hledám nejzajímavější zápasy pro ${day === "tomorrow" ? "zítřek" : "pozítří"}...</p>`;

  try {
    const res = await fetch("data.json?" + Date.now());
    const json = await res.json();

    // každý den trochu zamíchej pořadí
    const seed = new Date().getDate() + (day === "dayafter" ? 1 : 0);
    const shuffled = json.matches.sort((a,b) => (Math.sin(seed + a.home.length) - Math.cos(seed + b.away.length)));

    const top = shuffled.slice(0, 3); // jen 3 nejlepší pro přehled

    list.innerHTML = top.map(m => `
      <article class="card">
        <div class="league">${m.league}</div>
        <h2>${m.home} — ${m.away}</h2>
        <div class="meta">
          <span>🕒 ${new Date(m.date).toLocaleString("cs-CZ")}</span>
          <span>📍 ${m.place}</span>
          <span>📺 ${m.tv}</span>
        </div>
        <a href="${m.link}" target="_blank">Otevřít na Livesport.cz</a>
      </article>
    `).join("");
  } catch (e) {
    list.innerHTML = `<p class="info">⚠️ Chyba načítání dat: ${e.message}</p>`;
  }
}

document.getElementById("refresh").addEventListener("click", loadMatches);
document.getElementById("day").addEventListener("change", loadMatches);

loadMatches();
