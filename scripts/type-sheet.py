"""stack the per-candidate shots from test/typesheet.js into one comparison sheet.
   python scripts/type-sheet.py  -> sketches/type-sheet.png
one row per candidate: couch hero | desktop header + sidebar | detail panel top. same crops every row so only the type moves."""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
D = os.path.join(ROOT, 'sketches', 'type-shots')
cands = json.load(open(os.path.join(D, 'cands.json')))
# crops in the 1384x795 capture. couch hero: title block. desktop: header + sidebar + first cards. detail: banner + playbar + tabs.
CROPS = [('couch', (30, 150, 620, 400)), ('desktop', (52, 0, 700, 300))]
SCALE = 1.0
LABEL_W = 230
tiles = [(int((x1 - x0) * SCALE), int((y1 - y0) * SCALE)) for _, (x0, y0, x1, y1) in CROPS]
row_h = max(t[1] for t in tiles) + 14
W = LABEL_W + sum(t[0] for t in tiles) + 12 * (len(tiles) + 1)
H = 40 + row_h * len(cands)
sheet = Image.new('RGB', (W, H), (12, 12, 13)); dr = ImageDraw.Draw(sheet)
try: F = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 13); Fs = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 11)
except Exception: F = Fs = ImageFont.load_default()
x = LABEL_W + 12
for name, (x0, y0, x1, y1) in CROPS:
    dr.text((x, 14), {'couch': 'couch hero', 'desktop': 'desktop: sidebar, header, cards'}[name], fill=(120, 124, 130), font=Fs); x += int((x1 - x0) * SCALE) + 12
for i, c in enumerate(cands):
    y = 40 + i * row_h
    dr.text((12, y + 8), c['label'], fill=(242, 242, 242), font=F)
    dr.text((12, y + 28), c['id'], fill=(120, 124, 130), font=Fs)
    x = LABEL_W + 12
    for name, box in CROPS:
        im = Image.open(os.path.join(D, f"{c['id']}-{name}.png")).crop(box)
        im = im.resize((int(im.width * SCALE), int(im.height * SCALE)), Image.LANCZOS)
        sheet.paste(im, (x, y)); x += im.width + 12
    dr.line([(0, y + row_h - 1), (W, y + row_h - 1)], fill=(44, 46, 49))
out = os.path.join(ROOT, 'sketches', 'type-sheet.png'); sheet.save(out); print('SHEET', out, sheet.size)
