# Draws the README banner: the factory working through day and night, since
# it runs 24/7. The sun and moon circle over it, the sky turns, the skylights
# glow at night and the chimney never stops smoking.
#
#   uv run --with fonttools python .github/assets/banner.py <fonts dir>
#
# The fonts dir holds JetBrainsMono.ttf and Inter.ttf, the variable fonts from
# github.com/google/fonts (ofl/jetbrainsmono, ofl/inter). The text becomes
# outlines, since an SVG shown as an image can't load fonts. It writes
# readme-factory-onlight.svg and readme-factory-ondark.svg next to itself.

import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).parent
FONTS = Path(sys.argv[1])
WIDTH, HEIGHT = 560, 300
DAY = 16  # seconds from noon to noon


def text_path(font_file, axes, text, size, center_x, baseline, tracking=0.0):
    """`text` as one SVG path, centred on `center_x`."""
    font = instantiateVariableFont(TTFont(FONTS / font_file), axes)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    names = [cmap[ord(c)] for c in text]
    width = sum(glyphs[n].width * scale + tracking for n in names) - tracking
    pen = SVGPathPen(glyphs, ntos=lambda n: f"{n:.1f}".rstrip("0").rstrip("."))
    x = center_x - width / 2
    for name in names:
        # Font units point up; SVG's point down.
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        x += glyphs[name].width * scale + tracking
    return pen.getCommands(), center_x + width / 2


WORD, WORD_END = text_path("JetBrainsMono.ttf", {"wght": 700}, "factory", 62, 271, 233, -1)
TAGLINE, _ = text_path(
    "Inter.ttf", {"wght": 400, "opsz": 14},
    "Your GitHub issues, built into pull requests", 21, 280, 280,
)

# The factory, in the tile's 120 units.
TEETH = [(16, 38.7), (38.7, 61.3), (61.3, 84)]
BODY = "M16 88 V50 L38.7 38 V50 L61.3 38 V50 L84 38 V88 Z"
CHIMNEY = "M66 60 V14 H74 V60 Z"
DOOR = "M43 88 V73 A7 7 0 0 1 57 73 V88 Z"


def glazing():
    out = []
    for x0, x1 in TEETH:
        a, b = x1 - 5.4, x1 - 2.2
        ya = 50 - 12 * (a - x0) / (x1 - x0) + 2.2
        yb = 50 - 12 * (b - x0) / (x1 - x0) + 2.2
        out.append(f"M{a:.1f} 49 V{ya:.1f} L{b:.1f} {yb:.1f} V49 Z")
    return " ".join(out)


LIGHTS = f"{glazing()} {DOOR}"


def fade(values, times):
    """An opacity that follows the day: `values` at `times`, 0 to 1 of a day."""
    return (
        f'<animate attributeName="opacity" dur="{DAY}s" repeatCount="indefinite" '
        f'values="{";".join(map(str, values))}" keyTimes="{";".join(map(str, times))}"/>'
    )


# Noon at 0, sunset at 0.25, midnight at 0.5, sunrise at 0.75.
DAYLIGHT = fade([1, 1, 0, 0, 1, 1], [0, 0.14, 0.3, 0.7, 0.86, 1])
DUSK = fade([0, 0, 1, 0, 0], [0, 0.13, 0.25, 0.37, 1])
DAWN = fade([0, 0, 1, 0, 0], [0, 0.63, 0.75, 0.87, 1])
DARK = fade([0, 0, 1, 1, 0, 0], [0, 0.22, 0.34, 0.66, 0.78, 1])

STARS = [(14, 14, 1.1), (49, 9, 0.9), (100, 16, 1.2), (110, 44, 0.8), (22, 50, 0.9), (76, 24, 0.8)]


def smoke(delay):
    return f'''<circle cx="83" cy="34" r="3" fill="#b9bdd1">
      <animate attributeName="cy" values="34;4" dur="3s" begin="{delay}s" repeatCount="indefinite"/>
      <animate attributeName="cx" values="83;93" dur="3s" begin="{delay}s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;8" dur="3s" begin="{delay}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;0.75;0" keyTimes="0;0.15;1" dur="3s" begin="{delay}s" repeatCount="indefinite"/>
    </circle>'''


def tile():
    stars = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff"/>' for x, y, r in STARS)
    return f'''<g transform="translate(205 8) scale(1.25)">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151933"/><stop offset="1" stop-color="#3a3466"/></linearGradient>
    <linearGradient id="day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fa3e0"/><stop offset="1" stop-color="#bfe3f5"/></linearGradient>
    <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d3a7a"/><stop offset="0.6" stop-color="#c0607a"/><stop offset="1" stop-color="#f6a45c"/></linearGradient>
    <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6fb5"/><stop offset="0.6" stop-color="#e79ab0"/><stop offset="1" stop-color="#ffd28a"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <clipPath id="tile"><rect width="120" height="120" rx="27"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="120" height="120" fill="url(#night)"/>
    <rect width="120" height="120" fill="url(#dusk)" opacity="0">{DUSK}</rect>
    <rect width="120" height="120" fill="url(#dawn)" opacity="0">{DAWN}</rect>
    <rect width="120" height="120" fill="url(#day)">{DAYLIGHT}</rect>
    <g opacity="0">{DARK}{stars}</g>
    <g>
      <animateTransform attributeName="transform" type="rotate" values="0 60 112;360 60 112" dur="{DAY}s" repeatCount="indefinite"/>
      <circle cx="60" cy="40" r="11" fill="#ffd35c"/>
      <circle cx="60" cy="40" r="17" fill="#ffd35c" opacity="0.25"/>
      <path d="M-3 -9 A10 10 0 1 0 7 3 A8 8 0 1 1 -3 -9 Z" fill="#ecebff" transform="translate(60 184) rotate(180)"/>
    </g>
    {smoke(0)}{smoke(1)}{smoke(2)}
    <g transform="translate(2.5 18.8) scale(1.15)">
      <path d="{CHIMNEY}" fill="#07080f"/>
      <path d="{BODY}" fill="#07080f"/>
      <path d="{LIGHTS}" fill="#ffb84d" filter="url(#glow)" opacity="0">{DARK}</path>
      <path d="{LIGHTS}" fill="#ffb84d"/>
    </g>
  </g>
</g>'''


THEMES = {"onlight": ("#1f2328", "#59636e"), "ondark": ("#f0f6fc", "#9198a1")}

for theme, (ink, muted) in THEMES.items():
    cursor = (
        f'<rect x="{WORD_END + 6:.1f}" y="190" width="30" height="47" fill="{ink}">'
        '<animate attributeName="opacity" values="1;0" dur="1.1s" calcMode="discrete" repeatCount="indefinite"/></rect>'
    )
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}" role="img" aria-label="factory: your GitHub issues, built into pull requests">
{tile()}
<path d="{WORD}" fill="{ink}"/>{cursor}
<path d="{TAGLINE}" fill="{muted}"/>
</svg>
'''
    (HERE / f"readme-factory-{theme}.svg").write_text(svg)
