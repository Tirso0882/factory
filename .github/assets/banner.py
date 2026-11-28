# Draws the README banner: the factory at night, lights on while you are away.
# python3 banner.py writes night-onlight.html and night-ondark.html; render each
# at 560x320, scale 2, transparent, with headless Chrome, then trim:
#   google-chrome --headless=new --default-background-color=00000000 \
#     --force-device-scale-factor=2 --window-size=560,320 --screenshot=out.png night-onlight.html

import sys
TEETH = [(16, 38.7), (38.7, 61.3), (61.3, 84)]
BODY = "M16 88 V50 L38.7 38 V50 L61.3 38 V50 L84 38 V88 Z"
CHIMNEY = "M66 60 V14 H74 V60 Z"
def slope_y(x0, x1, x):  # roof rises from 50 at x0 to 38 at x1
    return 50 - 12 * (x - x0) / (x1 - x0)
def glazing():
    out = []
    for x0, x1 in TEETH:
        a, b = x1 - 5.4, x1 - 2.2
        out.append(f"M{a:.1f} 49 V{slope_y(x0, x1, a) + 2.2:.1f} L{b:.1f} {slope_y(x0, x1, b) + 2.2:.1f} V49 Z")
    return " ".join(out)
DOOR = "M43 88 V73 A7 7 0 0 1 57 73 V88 Z"
SKY = ("#151933", "#3a3466")
BUILDING = "#07080f"
LIGHT = "#ffb84d"
def mark(uid, size):
    return f'''<svg viewBox="0 0 120 120" width="{size}" height="{size}">
  <defs>
    <linearGradient id="sky{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SKY[0]}"/><stop offset="1" stop-color="{SKY[1]}"/></linearGradient>
    <filter id="glow{uid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <clipPath id="clip{uid}"><rect width="120" height="120" rx="27"/></clipPath>
  </defs>
  <g clip-path="url(#clip{uid})">
    <rect width="120" height="120" fill="url(#sky{uid})"/>
    <path d="M31 21 A10 10 0 1 0 41 33 A8 8 0 1 1 31 21 Z" fill="#e9e6ff" opacity="0.9"/>
    <g transform="translate(2.5 18.8) scale(1.15)">
      <path d="{CHIMNEY}" fill="{BUILDING}"/>
      <path d="{BODY}" fill="{BUILDING}"/>
      <path d="{glazing()} {DOOR}" fill="{LIGHT}" filter="url(#glow{uid})" opacity="0.85"/>
      <path d="{glazing()} {DOOR}" fill="{LIGHT}"/>
    </g>
  </g>
</svg>'''
THEMES = {"onlight": dict(word="#1f2328", tag="#59636e"), "ondark": dict(word="#f0f6fc", tag="#9198a1")}
FONTS = '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&family=Inter:wght@400&display=block" rel="stylesheet">'
for theme, t in THEMES.items():
    open(f"night-{theme}.html", "w").write(f'''<!doctype html><html><head>{FONTS}<style>
html,body{{margin:0;background:transparent}}
.b{{width:560px;padding:8px 0;display:flex;flex-direction:column;align-items:center}}
.w{{font:700 62px/1 'JetBrains Mono',monospace;letter-spacing:-1px;color:{t["word"]};margin-top:24px}}
.s{{font:400 21px/1 Inter,sans-serif;color:{t["tag"]};margin-top:16px}}
</style></head><body><div class="b">{mark(theme, 150)}<div class="w">factory</div><div class="s">Your GitHub issues, built into pull requests</div></div></body></html>''')
