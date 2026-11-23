from pathlib import Path
import os, time
root = Path("/Users/shea")
now = time.time()
cands = []
needles = [
    Path("/Users/shea/Downloads"),
    Path("/Users/shea/Desktop"),
    Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS/library/inbox"),
    Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS/library"),
]
# also grok folders
home = Path("/Users/shea")
for p in home.rglob("*") if False else []:
    pass
for base in needles:
    if not base.exists():
        print("missing", base)
        continue
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        age = now - p.stat().st_mtime
        if age < 6 * 3600 and p.stat().st_size > 80_000:
            cands.append((age, p.stat().st_size, str(p)))
cands.sort()
print("recent", len(cands))
for a,s,p in cands[:40]:
    print(f"{int(a)}s {s} {p}")
