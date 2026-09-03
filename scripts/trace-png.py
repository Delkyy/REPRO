"""trace a raster app icon into a single-color mask svg for assets/systems.
   python scripts/trace-png.py <src.png> <id> [--mode=alpha|dark|light|hue:<h>-<h>] [--pad=0.03] [--threshold=128] [--turd=20]

modes pick what counts as ink:
  alpha   anything opaque (silhouette of the whole icon). default.
  dark    dark pixels on a light/transparent field
  light   light pixels on a dark field (white glyph on colored plate)
  hue:a-b pixels whose hue is inside [a,b] degrees, saturation > .25 (pull one colored element out of a multi-color icon)
writes assets/systems/<id>.svg. always look at it: npx electron test/logosheet.js"""
import sys, os, colorsys
import numpy as np
from PIL import Image
import potrace

args = [a for a in sys.argv[1:] if not a.startswith('--')]; flags = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
src, sid = args[0], args[1]
mode = flags.get('mode', 'alpha'); thr = int(flags.get('threshold', 128)); pad = float(flags.get('pad', 0.03)); turd = int(flags.get('turd', 20))
drop_outer = int(flags.get('drop-outer', 0))  # drop the N largest-bbox curves (an app icon's plate/ring), keep the glyph inside
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'systems', sid + '.svg')

im = Image.open(src).convert('RGBA')
# upscale small icons so the curves have something to fit; potrace works in pixel space
scale = max(1, 1024 // max(im.size)); im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
a = np.asarray(im).astype(np.float32); rgb, alpha = a[..., :3], a[..., 3]
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
if mode == 'alpha': ink = alpha > thr
elif mode == 'dark': ink = (alpha > 128) & (lum < thr)
elif mode == 'light': ink = (alpha > 128) & (lum > thr)
elif mode.startswith('hue:'):
    lo, hi = (float(x) for x in mode[4:].split('-'))
    hsv = np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in rgb.reshape(-1, 3)]).reshape(rgb.shape)
    h = hsv[..., 0] * 360; s = hsv[..., 1]
    inr = (h >= lo) & (h <= hi) if lo <= hi else (h >= lo) | (h <= hi)
    ink = (alpha > 128) & (s > .25) & inr
else: sys.exit('bad --mode')

bm = potrace.Bitmap(ink)
path = bm.trace(turdsize=turd, alphamax=1.0, opticurve=1, opttolerance=0.2)
curves = list(path.curves)
def bbox(c):
    pts = [c.start_point] + [s.end_point for s in c]; xs_ = [p.x for p in pts]; ys_ = [p.y for p in pts]
    return min(xs_), min(ys_), max(xs_), max(ys_)
if drop_outer:
    order = sorted(range(len(curves)), key=lambda i: -((bbox(curves[i])[2] - bbox(curves[i])[0]) * (bbox(curves[i])[3] - bbox(curves[i])[1])))
    dropped = set(order[:drop_outer]); curves = [c for i, c in enumerate(curves) if i not in dropped]
    if not curves: sys.exit('drop-outer removed everything')
    bx = [bbox(c) for c in curves]; x0, y0, x1, y1 = int(min(b[0] for b in bx)), int(min(b[1] for b in bx)), int(max(b[2] for b in bx)) + 1, int(max(b[3] for b in bx)) + 1
else:
    ys, xs = np.where(ink)
    if not len(xs): sys.exit('no ink pixels for that mode')
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
p = max(x1 - x0, y1 - y0) * pad
d = []
for curve in curves:
    s = curve.start_point; d.append(f'M{s.x:.1f},{s.y:.1f}')
    for seg in curve:
        if seg.is_corner: d.append(f'L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}')
        else: d.append(f'C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}')
    d.append('Z')
svg = (f'<!-- traced from the project\'s own icon png by scripts/trace-png.py (mode={mode}). trademark of its owner. -->\n'
       f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0 - p:.1f} {y0 - p:.1f} {x1 - x0 + 2 * p:.1f} {y1 - y0 + 2 * p:.1f}">'
       f'<path fill="#000" fill-rule="evenodd" d="{"".join(d)}"/></svg>\n')
open(OUT, 'w', encoding='utf8').write(svg)
print('TRACE', sid, f'{len(curves)} curves', f'ink {int(ink.sum())}px', f'bbox {x1-x0}x{y1-y0}', '->', os.path.relpath(OUT))
