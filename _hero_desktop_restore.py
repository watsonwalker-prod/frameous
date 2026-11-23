from pathlib import Path
import re
root = Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS")
css_path = root / "styles.css"
css = css_path.read_text()

old_desktop = """.hero-brand {
  position: absolute;
  left: 66%;
  top: auto;
  bottom: 16%;
  width: 26%;"""

new_desktop = """.hero-brand {
  position: absolute;
  left: 66%;
  top: 16%;
  width: 26%;"""

if old_desktop not in css:
    raise SystemExit("desktop hero-brand block not found")
css = css.replace(old_desktop, new_desktop, 1)

# Lowered lockup for iPad and down (keep phone centering in 800px block)
ipad = """
@media (max-width: 1024px) {
  .hero-brand {
    top: auto;
    bottom: 14%;
  }
}
"""
if "@media (max-width: 1024px)" not in css or ".hero-brand" not in css.split("@media (max-width: 1024px)")[1][:400]:
    # insert before the 800px hero block
    needle = "@media (max-width: 800px) {"
    if needle not in css:
        raise SystemExit("800px media missing")
    css = css.replace(needle, ipad + needle, 1)

css_path.write_text(css)
print("css ok")

for name in ("index.html", "index.shop.html"):
    p = root / name
    t = p.read_text()
    t2, n = re.subn(r"styles\.css\?v=20260820[a-z0-9]+", "styles.css?v=20260821a", t)
    if n:
        p.write_text(t2)
        print(name, "cache", n)
    else:
        print(name, "no cache token match")
