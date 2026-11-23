"""click-TT -> Website: holt Tabellen, Spielpläne und Spielberichte aller GSC-Staffeln,
aktualisiert data.js (Ergebnisse, Termine, Tabellenplätze) und legt strukturierte
Spielberichte unter clicktt/reports/<meeting>.json ab. Offene Berichte (noch ohne
Artikel auf der Website) landen in clicktt/pending.json."""
import json, re, html, os, sys, time, urllib.request, urllib.parse, datetime

BASE = "https://ttvmv.click-tt.de/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/"
UA = {"User-Agent": "Mozilla/5.0 (compatible; GSC09-Website-Bot; +https://www.gsc09tischtennis.de)"}
CLUB = "Güstrower SC"
CFG = json.load(open("clicktt/config.json", encoding="utf-8"))
RAW = os.environ.get("RAW_DIR")  # optional: lokale Rohdaten statt Abruf (zum Testen)
DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

def norm(s): return re.sub(r"\s+", " ", html.unescape(s or "")).strip()
def txt(x): return norm(re.sub(r"<[^>]+>", " ", x))

def get(url, rawname):
    if RAW:
        p = os.path.join(RAW, rawname)
        return open(p, encoding="utf-8").read() if os.path.exists(p) else None
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                time.sleep(1)
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            print("Abruf fehlgeschlagen:", url, e, file=sys.stderr); time.sleep(5)
    return None

def first_table(s):
    i = s.find('<table class="result-set"')
    return s[i:s.find("</table>", i)] if i >= 0 else ""

def rows(tbl):
    out = []
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", tbl, flags=re.S):
        out.append((r, [c for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, flags=re.S)]))
    return out

def parse_table(s):
    res = {}
    for _, cells in rows(first_table(s)):
        c = [txt(x) for x in cells]
        if len(c) >= 10 and c[1].isdigit():
            res[c[2]] = {"rank": c[1], "points": c[9], "games": c[7], "s": c[4], "u": c[5], "n": c[6]}
        elif len(c) >= 3 and c[1].isdigit() and "zurückgezogen" in " ".join(c):
            res[c[2]] = {"rank": c[1], "withdrawn": True}
    return res

def parse_meetings(s):
    out, last_date, last_day = [], None, None
    for raw, cells in rows(first_table(s)):
        c = [txt(x) for x in cells]
        if len(c) < 7 or c[0] == "Tag": continue
        m = re.search(r'href="([^"]*groupMeetingReport\?meeting=(\d+)[^"]*)"', raw)
        if c[0].startswith("Termin offen"):  # kein Datum: Zellen um eins verschoben
            score = c[5] if re.fullmatch(r"\d+:\d+", c[5]) else None
            out.append({"date": None, "day": None, "time": None, "home": c[3], "away": c[4], "score": score,
                        "meeting": m.group(2) if m else None,
                        "url": (BASE + html.unescape(m.group(1)).split("/wa/")[1]) if m else ""})
            continue
        if c[1]: last_date, last_day = c[1], c[0]
        if not last_date: continue
        d = datetime.datetime.strptime(last_date, "%d.%m.%Y").date()
        score = c[6] if re.fullmatch(r"\d+:\d+", c[6]) else None
        out.append({"date": d.isoformat(), "day": DAYS[d.weekday()], "time": c[2][:5],
                    "home": c[4], "away": c[5], "score": score,
                    "meeting": m.group(2) if m else None,
                    "url": (BASE + html.unescape(m.group(1)).split("/wa/")[1]) if m else ""})
    return out

def name(n):  # "Peters, Christian" -> "Christian Peters"
    n = norm(n)
    return " ".join(reversed([p.strip() for p in n.split(",", 1)])) if "," in n else n

def parse_report(s, meta):
    games = []
    for _, cells in rows(first_table(s)):
        if len(cells) < 10: continue
        label = txt(cells[0])
        if not re.fullmatch(r"D?\d+-D?\d+", label): continue
        side = lambda x: [name(a) for a in re.findall(r"<a[^>]*>(.*?)</a>", x, flags=re.S)] or [name(txt(x))] if txt(x) else []
        sets = [txt(x) for x in cells[3:8] if re.fullmatch(r"\d+:\d+", txt(x))]
        games.append({"pos": label, "home": side(cells[1]), "away": side(cells[2]),
                      "sets": sets, "setsTotal": txt(cells[8]) or None, "point": txt(cells[9]) or None})
    tail = txt(s[s.rfind("</table>"):])
    g = lambda pat: (re.search(pat, tail) or [None, None])[1]
    return {**meta, "games": games, "start": g(r"Spielbeginn: (\d+:\d+)"), "end": g(r"Spielende: (\d+:\d+)"),
            "spectators": g(r"Zuschauer-Anzahl: (\d+)"),
            "notes": g(r"Bemerkungen: (.*?)(?:Spielbericht \(pdf\)|Letzte Änderung|$)")}

def main():
    js = open("data.js", encoding="utf-8").read()
    pre, body, post = js[:js.index("{")], js[js.index("{"):js.index("};") + 1], js[js.index("};") + 1:]
    data = json.loads(body)
    os.makedirs("clicktt/reports", exist_ok=True)
    team_names = CFG["teamNames"]  # Team-ID -> Name bei click-TT
    groups = {}
    for t in data["teams"]:
        q = urllib.parse.parse_qs(urllib.parse.urlparse(t["tableUrl"]).query)
        groups.setdefault(q["group"][0], {"championship": q["championship"][0], "teams": []})["teams"].append(t)

    changed, reports = [], []
    for gid, g in groups.items():
        qs = urllib.parse.urlencode({"championship": g["championship"], "group": gid})
        tbl = get(f"{BASE}groupPage?displayTyp=gesamt&displayDetail=table&{qs}", f"table-{gid}.html")
        mts = get(f"{BASE}groupPage?displayTyp=gesamt&displayDetail=meetings&{qs}", f"meetings-{gid}.html")
        if not tbl or not mts:
            print("Staffel übersprungen:", gid, file=sys.stderr); continue
        table = parse_table(tbl)
        for t in g["teams"]:
            row = table.get(team_names[t["id"]])
            if row and not row.get("withdrawn") and (t["rank"], t["points"]) != (row["rank"], row["points"]):
                changed.append(f'Tabelle {t["id"]}: {t["rank"]}. {t["points"]} -> {row["rank"]}. {row["points"]}')
                t["rank"], t["points"] = row["rank"], row["points"]
        ids = {t["id"] for t in g["teams"]}
        names = {team_names[i]: i for i in ids}
        for m in parse_meetings(mts):
            if CLUB not in m["home"] + m["away"]: continue
            for f in data["fixtures"]:
                if not set(f["teams"]) & ids: continue
                if norm(f["homeName"]) == m["home"] and norm(f["awayName"]) == m["away"]:
                    new = {"date": m["date"], "day": m["day"], "time": m["time"], "score": m["score"]} if m["date"] else {"score": m["score"]}
                    if m["url"]: new["url"] = m["url"]
                    diff = {k: v for k, v in new.items() if f.get(k) != v}
                    if diff:
                        changed.append(f'{m["date"]} {m["home"]} - {m["away"]}: {diff}')
                        f.update(diff)
                    break
            else:
                print("Kein passender Termin in data.js:", m["date"], m["home"], "-", m["away"], file=sys.stderr)
            if m["meeting"] and m["score"] and m["date"]:
                path = f'clicktt/reports/{m["meeting"]}.json'
                if not os.path.exists(path):
                    s = get(BASE + m["url"].split("/wa/")[-1], f'reports/{m["meeting"]}.html')
                    if s:
                        team = names.get(m["home"]) or names.get(m["away"])
                        team_obj = next(t for t in g["teams"] if t["id"] == team)
                        rep = parse_report(s, {"meeting": m["meeting"], "date": m["date"], "time": m["time"],
                                               "league": team_obj["league"], "team": team, "teamTitle": team_obj["title"],
                                               "home": m["home"], "away": m["away"], "score": m["score"],
                                               "gscIsHome": m["home"] in names, "url": m["url"]})
                        json.dump(rep, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                        changed.append(f"Spielbericht {m['meeting']} gespeichert")
                reports.append(m)

    index = open("index.html", encoding="utf-8").read()
    pending = [m["meeting"] for m in sorted(reports, key=lambda m: m["date"])
               if m["date"] and m["date"] >= CFG["articlesSince"] and f'spielbericht-{m["meeting"]}' not in index]
    json.dump({"pending": pending}, open("clicktt/pending.json", "w"), indent=1)

    if changed:
        today = datetime.date.today().isoformat()
        data["updatedAt"] = today
        data["fetchedAt"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        open("data.js", "w", encoding="utf-8").write(pre + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + post)
    print("\n".join(changed) or "Keine Änderungen.")
    print("Offene Spielberichte ohne Artikel:", pending)

if __name__ == "__main__":
    main()
