from pathlib import Path
root = Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS")
old = '''<p class="piece-eyebrow tag mono" data-font="mono">COLLECTION</p>'''
new = '''<p class="piece-price mono" data-font="mono">From $250</p>'''
for name in ("index.html", "index.shop.html"):
    p = root / name
    t = p.read_text()
    n = t.count(old)
    p.write_text(t.replace(old, new))
    print(name, "replaced", n)
