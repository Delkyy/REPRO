"""pack the per-size icon renders into assets/brand/icon.ico.
   python scripts/make-ico.py        (run `npx electron test/brandshot.js` first, or `npm run brand` does both)
each size is a separate render of icon.svg at its real pixel size, so nothing here is resampled."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'brand' / 'ico'
OUT = ROOT / 'assets' / 'brand' / 'icon.ico'
SIZES = [256, 128, 64, 48, 32, 24, 16]  # 256 first: it becomes the PNG-compressed entry windows shows at large zoom

frames = []
for s in SIZES:
    p = SRC / f'icon-{s}.png'
    im = Image.open(p).convert('RGBA')
    assert im.size == (s, s), f'{p.name} is {im.size}, expected {s}x{s}'
    a = im.getchannel('A').getextrema()
    # the rounded corners must cut through to alpha. at 16px the very corner pixel still catches ~7% AA fringe, so allow that.
    assert a[0] < 64, f'{p.name} min alpha is {a[0]}: the render lost its transparency'
    frames.append(im)

frames[0].save(OUT, format='ICO', sizes=[(s, s) for s in SIZES], append_images=frames[1:])
print('ICO', OUT.relative_to(ROOT), OUT.stat().st_size, 'bytes', SIZES)
