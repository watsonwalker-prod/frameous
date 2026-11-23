from pathlib import Path
p = Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS/pdp.js")
t = p.read_text()
t2 = t.replace("view: \"room\"", "view: \"cutout\"", 1)
t2 = t2.replace("ASSET_V = \"20260819am\"", "ASSET_V = \"20260819an\"")
p.write_text(t2)
print("cutout" if "view: \"cutout\"" in t2 else "fail")
root = Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS/works")
n = 0
for p in root.glob("*.html"):
    t = p.read_text()
    if "pdp.js?v=20260819am" in t:
        p.write_text(t.replace("pdp.js?v=20260819am", "pdp.js?v=20260819an"))
        n += 1
print("html", n)
