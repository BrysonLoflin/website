#!/usr/bin/env python3
"""Generate assets/img/journey-map.svg for the About page.

Input: a public-domain US-states GeoJSON (US Census-derived, via
PublicaMundi/MappingAPI). Lower 48 only, equirectangular projection with a
cos(38 deg) x-correction, plus a hand-drawn Panama inset. The dashed journey
line, anchor dots, and badge leader lines are baked into the SVG; the
clickable numbered badges are HTML overlaid by about.qmd (positions printed
by this script as percentages).

Run from site/:  python tools/build-journey-map.py <us-states.json>
"""
import json, math, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "us-states.json"
OUT = "assets/img/journey-map.svg"

SKIP = {"02", "15", "72"}          # Alaska, Hawaii, Puerto Rico
LON0, LON1 = -124.8, -66.9
LAT0, LAT1 = 24.5, 49.4
COS = math.cos(math.radians(38))
K = 24.0
MX, MY = 14, 14                     # margin
W = (LON1 - LON0) * COS * K + 2 * MX
H = (LAT1 - LAT0) * K + 2 * MY

def P(lon, lat):
    return (MX + (lon - LON0) * COS * K, MY + (LAT1 - lat) * K)

# journey stops (badge offsets in px, tuned so the NC trio doesn't collide)
STOPS = [
    ("salisbury", "Salisbury",  -80.4742, 35.6710, (-52,  40)),
    ("ncssm",     "NCSSM",      -78.9072, 36.0161, ( 44, -34)),
    ("unc",       "UNC",        -79.0469, 35.9049, ( 52,  34)),
    ("swrs",      "SWRS",      -109.2062, 31.8837, (  2, -40)),
    ("cornell",   "Cornell",    -76.4735, 42.4534, (-14, -40)),
    # Panama lives in the inset; badge position given absolutely below
    ("princeton", "Princeton",  -74.6551, 40.3487, ( 56,   6)),
]

geo = json.load(open(SRC, encoding="utf-8"))
paths = []
for f in geo["features"]:
    if f.get("id") in SKIP:
        continue
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for poly in polys:
        for ring in poly:
            pts, last = [], None
            for lon, lat in ring:
                x, y = P(lon, lat)
                if last and abs(x - last[0]) < 1.2 and abs(y - last[1]) < 1.2:
                    continue          # thin near-duplicate points
                pts.append((x, y)); last = (x, y)
            if len(pts) < 3:
                continue
            d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"
            paths.append(d)

svg = []
svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">')
svg.append('<g fill="rgba(233,225,210,.03)" stroke="rgba(233,225,210,.20)" '
           'stroke-width="1" stroke-linejoin="round">')
for d in paths:
    svg.append(f'<path d="{d}"/>')
svg.append('</g>')

# dashed journey: the real route is Salisbury→NCSSM→UNC, then out-and-back
# from UNC to SWRS and to Cornell (drawn once each, not both directions),
# then UNC→Princeton. The Princeton→Panamá leg is drawn after the inset.
pt = {s[0]: P(s[2], s[3]) for s in STOPS}
segments = [("salisbury", "ncssm"), ("ncssm", "unc"),
            ("unc", "swrs"), ("unc", "cornell"), ("unc", "princeton")]
for a, b in segments:
    (x1, y1), (x2, y2) = pt[a], pt[b]
    svg.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
               'fill="none" stroke="#c9964b" stroke-width="1.6" '
               'stroke-dasharray="2 7" stroke-linecap="round" opacity=".8"/>')

# Panama inset, bottom-left (over open Pacific/Mexico corner)
IX, IY, IW, IH = 34, H - 190, 250, 156
svg.append(f'<rect x="{IX}" y="{IY}" width="{IW}" height="{IH}" '
           'fill="rgba(233,225,210,.02)" stroke="rgba(233,225,210,.22)"/>')
# real Panamá outline (johan/world.geo.json, public domain), drawn in the
# same cartographic style as the states, fitted to the inset with its own
# aspect-true scale
PAN_SRC = sys.argv[2] if len(sys.argv) > 2 else "panama.geo.json"
pan = json.load(open(PAN_SRC, encoding="utf-8"))
rings = []
for f in pan["features"]:
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for poly in polys:
        rings.extend(poly)
lons = [p[0] for r in rings for p in r]; lats = [p[1] for r in rings for p in r]
pl0, pl1, pb0, pb1 = min(lons), max(lons), min(lats), max(lats)
pcos = math.cos(math.radians((pb0 + pb1) / 2))
pad = 16
ps = min((IW - 2 * pad) / ((pl1 - pl0) * pcos), (IH - 2 * pad - 18) / (pb1 - pb0))
pw, ph = (pl1 - pl0) * pcos * ps, (pb1 - pb0) * ps
ox = IX + (IW - pw) / 2
oy = IY + (IH - 18 - ph) / 2          # leave room for the label at the bottom
def IP(lon, lat):
    return (ox + (lon - pl0) * pcos * ps, oy + (pb1 - lat) * ps)
for ring in rings:
    pts, last = [], None
    for lon, lat in ring:
        x, y = IP(lon, lat)
        if last and abs(x - last[0]) < 1.0 and abs(y - last[1]) < 1.0:
            continue
        pts.append((x, y)); last = (x, y)
    if len(pts) < 3:
        continue
    d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"
    svg.append(f'<path d="{d}" fill="rgba(233,225,210,.03)" '
               'stroke="rgba(233,225,210,.20)" stroke-width="1" stroke-linejoin="round"/>')
gx, gy = IP(-79.70, 9.12)
svg.append(f'<circle cx="{gx:.1f}" cy="{gy:.1f}" r="4.5" fill="#c9964b"/>')
svg.append(f'<text x="{IX+12}" y="{IY+IH-12}" fill="rgba(233,225,210,.55)" '
           'font-family="Georgia,serif" font-style="italic" font-size="13">'
           'Gamboa, Panamá</text>')
# the Princeton→Panamá leg: ONE dashed curve, Princeton down the Atlantic,
# around Florida, ending exactly on the Gamboa dot in the inset
prx, pry = pt["princeton"]
svg.append(f'<path d="M{prx:.1f},{pry+14:.1f} '
           f'C {W-10:.0f},{H*0.78:.0f} {IX+IW+330:.0f},{H+34:.0f} {gx+9:.1f},{gy+3:.1f}" '
           'fill="none" stroke="#c9964b" stroke-width="1.4" '
           'stroke-dasharray="2 7" stroke-linecap="round" opacity=".55"/>')

# anchors + leader lines to the badge spots
for key, label, lon, lat, (dx, dy) in STOPS:
    x, y = pt[key]
    svg.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x+dx*0.72:.1f}" y2="{y+dy*0.72:.1f}" '
               'stroke="rgba(201,150,75,.5)" stroke-width="1"/>')
    svg.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="#c9964b"/>')
svg.append('</svg>')

open(OUT, "w", encoding="utf-8").write("\n".join(svg))
print(f"wrote {OUT}  viewBox 0 0 {W:.0f} {H:.0f}  ({len(paths)} rings)")

# badge centre positions as percentages for the HTML overlay
for key, label, lon, lat, (dx, dy) in STOPS:
    x, y = pt[key]
    print(f"{key:10s} left:{(x+dx)/W*100:5.1f}%  top:{(y+dy)/H*100:5.1f}%")
px, py = IX + IW - 34, IY + 24
print(f"{'gamboa':10s} left:{px/W*100:5.1f}%  top:{py/H*100:5.1f}%")
