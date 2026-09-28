import json, os
OUT = r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis\results"

def load(n):
    with open(os.path.join(OUT, n + ".json"), encoding="utf-8") as f:
        return json.load(f)

def show(n, limit=200, trim=180):
    j = load(n)
    print(f"\n===== {n} =====")
    print(" | ".join(str(c) for c in j["columns"]))
    for r in j["results"][:limit]:
        cells = []
        for v in r:
            s = str(v)
            cells.append(s[:trim] + "…" if len(s) > trim else s)
        print(" | ".join(cells))

for n in ["host_scan", "events_7d", "daily_clean", "daily_raw", "today_summary",
          "today_sessions", "today_channels", "today_geo", "today_entry",
          "thin_7d", "today_events", "go_health"]:
    show(n)

print("\n===== windows (today vs prev 7, same partial window) =====")
for off in range(1, 8):
    j = load(f"win_d{off}")
    print(f"d-{off}:", j["results"])

print("\n===== today_clicks =====")
j = load("today_clicks")
print(" | ".join(j["columns"]))
for r in j["results"]:
    print(" | ".join(str(v) for v in r))

print("\n===== conversions_14d =====")
j = load("conversions_14d")
print(" | ".join(j["columns"]))
for r in j["results"]:
    print(str(r[0]), "|", r[1], "|", str(r[3]))

print("\n===== clicks_14d (compact) =====")
j = load("clicks_14d")
print(" | ".join(j["columns"]))
rows = j["results"]
seen = set()
for r in rows:
    print(" | ".join(str(v)[:90] for v in r))
print("total rows:", len(rows), "unique iid:", len({r[6] for r in rows}))
