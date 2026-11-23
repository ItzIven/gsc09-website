# Website GSC 09 Tischtennis (www.gsc09tischtennis.de)

Statische Seite auf GitHub Pages (Branch `main`, Ordner `/`). Jeder Push auf `main` ist nach 1–2 Minuten live.

## Automatischer Ablauf
- **GitHub Action `click-TT Abgleich`** (täglich ~05:30, `scripts/clicktt_update.py`): holt alle Staffeln von click-TT,
  aktualisiert in `data.js` Ergebnisse, Termine und Tabellenplätze und speichert jeden Spielbericht als
  `clicktt/reports/<meeting>.json`. Spielberichte ohne Artikel auf der Website stehen in `clicktt/pending.json`.
- **Claude (wöchentlich)** schreibt für jeden Eintrag in `pending.json` einen Artikel (siehe unten) und pusht.
- Turniere (Ranglisten, Meisterschaften) stehen nicht in click-TT-Staffeln: nur auf Zuruf mit Unterlagen von Iven.

## Spielbericht-Artikel schreiben
Quelle ist ausschließlich `clicktt/reports/<meeting>.json`. Nichts erfinden, keine Mutmaßungen.
- `home`/`away` = Heim/Gast, `gscIsHome` sagt, auf welcher Seite der GSC steht. `point` und `setsTotal` sind aus Heimsicht.
- Spielverlauf durch Aufsummieren von `point` in Reihenfolge der `games` ermitteln (Zwischenstände nur so angeben).
- Bilanzen je Spieler, Doppel, Fünfsatzspiele, Satz-Verlängerungen (z. B. 14:12), Aufholjagden aus den Sätzen ableiten.
- Spiele ohne `point` wurden nicht mehr ausgetragen. Ergebnis immer in der Form Heim:Gast.
- Stil wie die bestehenden Berichte in `index.html`: sachlich, 3–4 kurze Absätze, vollständige Namen beim ersten Nennen,
  danach Nachnamen. Titel prägnant mit Ergebnis oder Hauptakteur.

### Einbau in index.html
1. Bericht als `<details class="match-report" id="spielbericht-<meeting>" data-source-url="<url>" data-score="<score>">`
   (Aufbau exakt wie die vorhandenen) im Abschnitt `#spielberichte` einfügen: neueste Woche oben, unter einer
   Wochenüberschrift `<p class="eyebrow">16.–22. NOVEMBER 2026</p>` (Montag–Sonntag; vorhandene Woche wiederverwenden).
   Link am Ende: `Offizielles Spielprotokoll ↗` auf `url`.
2. Karte `<article class="news-item">` mit `report-score-card` vorne in `.news-grid.current-news` einfügen;
   das Raster zeigt immer genau die 6 neuesten Karten (älteste entfernen, Bericht selbst bleibt).
3. `NEUES AUS DEM VEREIN · STAND TT.MM.JJJJ` und `data-published-date` auf das heutige Datum setzen.
4. Die Laufleiste oben auf der Startseite (`ticker.js`) baut sich automatisch aus den ersten 8 Berichten in
   `#spielberichte` – nichts weiter zu tun, solange neue Berichte oben einsortiert werden.

Labels: I `1. MANNSCHAFT · LANDESLIGA WEST` · II `2. MANNSCHAFT · BEZIRKSKLASSE NORDOST 1` ·
III `3. MANNSCHAFT · BEZIRKSKLASSE NORDOST 1` · IV `4. MANNSCHAFT · KREISLIGA ROSTOCK LAND` ·
V `5. MANNSCHAFT · 3. KREISKLASSE` · U19 `NACHWUCHS · LANDESLIGA JUNGEN 19 WEST`

### Vor dem Push prüfen
- `node --check data.js`, HTML-Struktur intakt (öffnende/schließende Tags), jede Zahl im Text gegen das JSON.
- Commit-Nachricht auf Deutsch. Danach `clicktt/pending.json` ist beim nächsten Abgleich automatisch leer.
