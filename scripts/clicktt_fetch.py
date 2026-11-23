"""Lädt Tabellen, Spielpläne und Spielberichte aller GSC-Staffeln von click-TT (Rohdaten)."""
import json, re, html, os, time, urllib.request, urllib.parse

BASE = "https://ttvmv.click-tt.de"
UA = {"User-Agent": "Mozilla/5.0 (compatible; GSC09-Website-Bot; +https://www.gsc09tischtennis.de)"}
OUT = os.environ.get("OUT", "raw")

def get(url):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            print("Fehler", url, e); time.sleep(3)
    raise RuntimeError(url)

def load_groups():
    s = open("data.js", encoding="utf-8").read()
    data = json.loads(s[s.index("{"):s.index("};") + 1])
    groups = {}
    for t in data["teams"]:
        q = urllib.parse.parse_qs(urllib.parse.urlparse(t["tableUrl"]).query)
        groups[q["group"][0]] = q["championship"][0]
    return groups

def main():
    os.makedirs(f"{OUT}/reports", exist_ok=True)
    manifest = {"fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "groups": {}}
    for group, champ in load_groups().items():
        qs = urllib.parse.urlencode({"championship": champ, "group": group})
        table = get(f"{BASE}/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/groupPage?displayTyp=gesamt&displayDetail=table&{qs}")
        meetings = get(f"{BASE}/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/groupPage?displayTyp=gesamt&displayDetail=meetings&{qs}")
        open(f"{OUT}/table-{group}.html", "w", encoding="utf-8").write(table)
        open(f"{OUT}/meetings-{group}.html", "w", encoding="utf-8").write(meetings)
        reports = []
        for row in re.findall(r"<tr[^>]*>(.*?)</tr>", meetings, flags=re.S):
            if "Güstrower SC" not in html.unescape(row): continue
            m = re.search(r'href="([^"]*groupMeetingReport\?meeting=(\d+)[^"]*)"', row)
            if not m: continue
            mid = m.group(2)
            path = f"{OUT}/reports/{mid}.html"
            if not os.path.exists(path):
                open(path, "w", encoding="utf-8").write(get(BASE + html.unescape(m.group(1))))
                time.sleep(1)
            reports.append(mid)
        manifest["groups"][group] = {"championship": champ, "reports": reports}
        time.sleep(1)
    json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=1)
    print(json.dumps(manifest, indent=1))

if __name__ == "__main__":
    main()
