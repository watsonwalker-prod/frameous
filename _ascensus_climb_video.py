from pathlib import Path
root = Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS")

html_path = root / "ascensus.html"
html = html_path.read_text()
block = '''
  <section class="breakout breakout--climb" aria-label="The climb">
    <div class="breakout-media">
      <video
        src="library/mocks/ascensus-climb.mp4"
        muted
        loop
        autoplay
        playsinline
      ></video>
    </div>
  </section>

'''
if "breakout--climb" not in html:
    needle = '  <section class="section works" aria-label="Ascensus">'
    if needle not in html:
        raise SystemExit("ascensus section not found")
    html = html.replace(needle, block + needle, 1)
html = html.replace("styles.css?v=20260820u", "styles.css?v=20260821c")
html = html.replace("styles.css?v=20260821a", "styles.css?v=20260821c")
html = html.replace("styles.css?v=20260820x", "styles.css?v=20260821c")
html_path.write_text(html)
print("html ok")

css_path = root / "styles.css"
css = css_path.read_text()
rule = """
.breakout--climb {
  width: 100vw;
  max-width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  background: var(--void);
}
.breakout--climb .breakout-media {
  width: 100%;
  height: min(70vh, 40rem);
  overflow: hidden;
}
.breakout--climb .breakout-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center bottom;
}
"""
if ".breakout--climb" not in css:
    css = css.replace(".breakout-caption .btn {\n  margin-left: auto;\n}", ".breakout-caption .btn {\n  margin-left: auto;\n}\n" + rule, 1)
    css_path.write_text(css)
    print("css added")
else:
    print("css already had climb")
