from pathlib import Path
import re

root = Path("/Users/shea/her-os/30 Portfolio/FRAMEOUS/works")

# (file, slug, default_size)
GUNS = [
    ("fulmen.html", "fulmen", "16x20"),
    ("clamor.html", "clamor", "18x12"),
    ("daisy-iron.html", "daisy-iron", "18x12"),
]
VILLA = [
    ("convivium.html", "convivium", "16x20"),
    ("furor.html", "furor", "16x20"),
    ("bruma.html", "bruma", "16x20"),
    ("fulgor.html", "fulgor", "16x20"),
    ("susurrus.html", "susurrus", "16x20"),
]

PRINT_NO_MAT = "Ultra Premium Luster Photo Paper. Between gloss and matte. High saturation. 10 mil (0.25 mm), 260 g/m². Made on demand."
FRAME_NO_MAT = ".75″ (1.9 cm) ayous wood. Black, White, or Red Oak. Acrylite front. Hardware included. Ready to hang. No mat."


def swap_copy(t):
    t = t.replace(
        "Same luster paper, mounted behind a white mat board. Made on demand.",
        PRINT_NO_MAT,
    )
    t = t.replace(
        ".75″ (1.9 cm) ayous wood. Black, White, or Red Oak. White mat board. Acrylite front. Hardware included. Ready to hang.",
        FRAME_NO_MAT,
    )
    return t


def finish_chips(t):
    t = t.replace(
        '<button type="button" class="chip is-on" data-finish="mat" aria-pressed="true">Matte</button>',
        '<button type="button" class="chip" data-finish="mat" aria-pressed="false">Matte</button>',
    )
    t = t.replace(
        '<button type="button" class="chip" data-finish="luster" aria-pressed="false">Full bleed</button>',
        '<button type="button" class="chip is-on" data-finish="luster" aria-pressed="true">Full bleed</button>',
    )
    t = t.replace(
        '<button type="button" class="chip" data-finish="luster" aria-pressed="false">Luster</button>',
        '<button type="button" class="chip is-on" data-finish="luster" aria-pressed="true">Full bleed</button>',
    )
    return t


def guns(t, slug, size):
    # stage defaults to luster room, not mat cutout
    t = re.sub(
        r'(<figure class="pdp-stage[^"]*" id="pdp-stage"[^>]*data-finish=")mat(")',
        r'\1luster\2',
        t,
        count=1,
    )
    t = t.replace('class="pdp-stage is-cutout"', 'class="pdp-stage"', 1)
    room = f"../library/mocks/{slug}_room.jpg?v=20260821a"
    t = re.sub(
        r'<img id="pdp-main" src="[^"]+" alt="[^"]*" />',
        f'<img id="pdp-main" src="{room}" alt="{slug} in room, thick black frame" />',
        t,
        count=1,
    )
    # room thumbs: luster on, mat off
    t = t.replace(
        f'data-finish-room="luster" data-src="../library/mocks/{slug}_room.jpg?v=20260821a" ',
        f'data-finish-room="luster" data-src="../library/mocks/{slug}_room.jpg?v=20260821a" ',
    )
    t = re.sub(
        rf'(<button type="button" class="pdp-thumb)(" data-role="room" data-finish-room="luster")',
        r'\1 is-on\2',
        t,
        count=1,
    )
    t = re.sub(
        rf'(<button type="button" class="pdp-thumb) is-on(" data-role="room" data-finish-room="mat")',
        r'\1\2',
        t,
        count=1,
    )
    t = t.replace(
        'class="pdp-thumb is-cutout is-on" data-role="cutout" data-frame-shot="black" data-finish-shot="mat"',
        'class="pdp-thumb is-cutout" data-role="cutout" data-frame-shot="black" data-finish-shot="mat"',
        1,
    )
    t = swap_copy(t)
    t = finish_chips(t)
    return t


def villa(t, slug, size):
    t = re.sub(
        r'(<figure class="pdp-stage[^"]*" id="pdp-stage"[^>]*data-finish=")mat(")',
        r'\1luster\2',
        t,
        count=1,
    )
    room = f"../library/mocks/{slug}_room.jpg?v=20260821a"
    t = re.sub(
        r'<img id="pdp-main" src="[^"]+" alt="[^"]*" />',
        f'<img id="pdp-main" src="{room}" alt="{slug} in room, thick black frame" />',
        t,
        count=1,
    )
    t = t.replace(
        'class="pdp-thumb is-on" data-role="room" data-finish-room="mat"',
        'class="pdp-thumb" data-role="room" data-finish-room="mat"',
        1,
    )
    t = t.replace(
        'class="pdp-thumb" data-role="room" data-finish-room="luster"',
        'class="pdp-thumb is-on" data-role="room" data-finish-room="luster"',
        1,
    )
    t = swap_copy(t)
    t = finish_chips(t)
    return t


for name, slug, size in GUNS:
    p = root / name
    t = p.read_text()
    p.write_text(guns(t, slug, size))
    print("guns", name)

for name, slug, size in VILLA:
    p = root / name
    t = p.read_text()
    p.write_text(villa(t, slug, size))
    print("villa", name)

print("done")
