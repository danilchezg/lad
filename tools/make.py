"""Builds the deployable site into dist/: copies files, draws icons, writes the service worker with a precache list."""
import hashlib, json, math, os, shutil
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

def icon(size, maskable=False):
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bg = (17, 19, 21, 255); mint = (61, 214, 163, 255); gold = (255, 194, 75, 255); pale = (236, 237, 238, 255)
    if maskable: d.rectangle([0, 0, s, s], fill=bg)
    else: d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=bg)
    k = 0.74 if maskable else 1.0
    c = s / 2
    def P(x, y): return (c + (x - 0.5) * s * k, c + (y - 0.5) * s * k)
    # guitar pick: rounded top, pointed bottom
    pts = []
    for i in range(0, 181):
        a = math.pi + i / 180 * math.pi
        pts.append(P(0.5 + 0.30 * math.cos(a), 0.40 + 0.22 * math.sin(a)))
    pts.append(P(0.80, 0.42)); pts.append(P(0.53, 0.82)); pts.append(P(0.47, 0.82)); pts.append(P(0.20, 0.42))
    d.polygon(pts, fill=mint)
    # equalizer bars inside the pick (sound / rhythm)
    w = max(3, int(s * 0.045 * k))
    for x, h in [(0.36, 0.10), (0.44, 0.18), (0.52, 0.24), (0.60, 0.14)]:
        x0, y0 = P(x, 0.50 - h / 2); x1, y1 = P(x + 0.045, 0.50 + h / 2)
        d.rounded_rectangle([x0, y0, x1, y1], radius=w // 2, fill=bg)
    # gold beat dot
    gx, gy = P(0.76, 0.20); r = s * 0.05 * k
    d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=gold)
    return img.resize((size, size), Image.LANCZOS)

def main():
    if os.path.exists(DIST): shutil.rmtree(DIST)
    os.makedirs(DIST)
    for item in ["index.html", "style.css", "manifest.webmanifest", "js", "fonts", "README.md"]:
        src = os.path.join(ROOT, item)
        if os.path.isdir(src): shutil.copytree(src, os.path.join(DIST, item))
        elif os.path.exists(src): shutil.copy(src, DIST)
    os.makedirs(os.path.join(DIST, "icons"))
    icon(180).save(os.path.join(DIST, "icons", "apple-touch-icon.png"))
    icon(192).save(os.path.join(DIST, "icons", "icon-192.png"))
    icon(512).save(os.path.join(DIST, "icons", "icon-512.png"))
    icon(512, True).save(os.path.join(DIST, "icons", "icon-512-maskable.png"))
    files = ["./"]; h = hashlib.sha256()
    for dp, _, fs in sorted(os.walk(DIST)):
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(dp, f), DIST).replace(os.sep, "/")
            if rel.endswith(".md"): continue
            files.append(rel); h.update(rel.encode()); h.update(open(os.path.join(dp, f), "rb").read())
    ver = h.hexdigest()[:10]
    sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read().replace("__VERSION__", ver).replace("__FILES__", json.dumps(sorted(files), ensure_ascii=False))
    open(os.path.join(DIST, "sw.js"), "w", encoding="utf-8").write(sw)
    open(os.path.join(DIST, ".nojekyll"), "w").write("")
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DIST) for f in fs)
    print("version", ver, "files", len(files), "size %.2f MB" % (size / 1e6))

main()
