/* bat-stage.js: NIGHT FLIGHT P3b (2026-09-02) + P4 cow board: the silhouette stage.
   The approved look (anim_prototypes/style-2-svg-silhouette.html, brightened grade) as a
   mountable component. Three layers inside one .wyd-stage host:
     svg.wst-back    sky gradient, stars, moon + halo + craters, clouds, the two hills, ground
     canvas.wst-atmo ground fog, fireflies (calm nights), rain (storm/squall), light grain,
                     the dusk / night / dawn tint (one rAF loop, paused on document.hidden)
     svg.wst-front   roost snag, grass, the cows (#cowShape at .62/.85/1.08, one per board
                     slot), each cow's resident (the prototype #rivalBat rig tucked on the
                     back + a crimson feeding bead at the wound; hidden unless occupied), the
                     player bat rig, blood, dust, pulse rings, the vignette
   Every SVG asset below is copied VERBATIM from the prototype (paths, primitives, colors);
   nothing organic is drawn here. New animals or poses are Bryson's traces (see the TODOs).
   API (actor-agnostic; scenes only call these):
     const st = WydStage.mount(hostEl, {moon, storm, far, phase, look,
                                        cows:[{id, tier, occupied, occupant}], slots:[x…]})
     st.setPhase(p) st.pose(p) st.batTo(x,y,ms,ease,lead) st.arcTo(x,y,ms) st.perch(cowId)
     st.blood(cowId) st.kick(cowId) st.leave(cowId) st.flung(x,y,delayMs) st.rival(cowId, state) st.pulse(cowId)
     st.shake() st.caption(text, aria) st.home(ms, heavy) st.look("roost"|"herd"|x, ms)
     st.settle() st.still(cowId, fed) st.destroy()
     P4 board: st.choice(on) st.onCow(fn) st.label(cowId, aria, tag) st.select(cowId|null) st.cut()
      (choice on: root role=group + the front svg exposed, so the cow buttons reach the a11y tree)
     st.commit(cowId) st.approach(cowId) st.confront(cowId) st.rebuff(cowId) st.yield(cowId)
     st.shuffle(cowId) st.slowDrips(cowId) st.visibleX() → [x0, x1]
   batTo's `lead` (ms) resolves the promise that many ms BEFORE the move ends, so a chained
   leg starts while this one is still easing out (no stop at the seam; the CSS transition
   re-targets from the current position). Without a lead it resolves 40 ms after the move.
   Stage units are the prototype's coordinates (960 wide, land plane at prototype y).
   Camera: on narrow (slice) hosts the 960-unit composition is wider than the frame, so
   st.look() pans the scene per beat (front layer + fog at full rate, the back layer at
   PARALLAX) with the drift token; on meet hosts the whole composition is visible and
   look() is a no-op. Debug: ?debug=stage exposes window.__wstFrames (+1 per canvas frame). */
(function(){
"use strict";
const NS = "http://www.w3.org/2000/svg";
/* P25 finding 2: the tag under an occupied animal used to read "· occupied", which players read
   as "taken". The sentence lives in bat-copy.js like every other line the player can read. */
const OCC_TAG = ()=> (typeof COPY !== "undefined" && COPY.occTag) || "";
const VW = 960, VH = 400;
/* RE-FRAME (the single shift constant). The prototype composed on 960×540. The stage keeps
   the sky exactly where it was (moon, stars, clouds at prototype y) and lifts the whole land
   plane (hills, ground, snag, grass, cows, bat perch points) by DY, so the back ridge sits
   about 60% down the 400px frame and the pasture fits above the bottom edge with a thin
   ground band under the hooves. The sky gradient's lower stops follow DY too (SKY_Y2 /
   SKY_MID below), so the horizon tone matches the prototype's brightened grade while the
   top of the frame stays #1b2a44.
   Wide hosts (desktop, wider than 2.4:1) widen the viewBox instead of letterboxing; the
   flanks are covered by FLANKS below: straight-edged tangent continuations of the three
   two hill ridges (straight-edged polygons) and flat ground rects, plus a few more stars. */
const DY = -90;
/* prototype sky: userSpaceOnUse 0..540 with the middle stop at .55 (y 297). Lifted with the
   land: y2 = 540 + DY, middle stop at (297 + DY) / (540 + DY). */
const SKY_Y2 = 540 + DY;
const SKY_MID = ((297 + DY) / SKY_Y2).toFixed(3);
/* camera (slice hosts only): the back layer pans at this fraction of the front layer.
   1 = the whole composition pans as one: with any parallax the moon (x 790) is cropped at
   the frame edge in the herd frame on a 375px phone. */
const PARALLAX = 1;
/* look targets in stage x: the roost frame holds the snag + the near cows; the herd frame
   is the herd's centre (moon and prime cow inside on a 375px phone) */
const LOOK_ROOST = 300;
/* motion tokens (mirrored as --e-* custom properties on .wyd-stage in wyd.css) */
const EASE = {
  act:"cubic-bezier(.2,.9,.3,1)",          // actions: snappy out
  anticipate:"cubic-bezier(.55,-.35,.6,1)",// wind-ups: pulls back, then goes
  soft:"cubic-bezier(.45,.05,.55,.95)",    // flaps, sways
  drift:"cubic-bezier(.37,.1,.63,.9)",     // ambience, long glides
};
/* the canvas grade lerps with the drift token; a tiny cubic-bezier solver keeps it honest */
function bezier(p1x, p1y, p2x, p2y){
  const cx = 3*p1x, bx = 3*(p2x-p1x)-cx, ax = 1-cx-bx;
  const cy = 3*p1y, by = 3*(p2y-p1y)-cy, ay = 1-cy-by;
  const sx = t=> ((ax*t+bx)*t+cx)*t, sy = t=> ((ay*t+by)*t+cy)*t, dx = t=> (3*ax*t+2*bx)*t+cx;
  return x=>{
    let t = x;
    for(let i=0;i<6;i++){ const d = dx(t); if(Math.abs(d) < 1e-6) break; t -= (sx(t)-x)/d; }
    return sy(Math.max(0, Math.min(1, t)));
  };
}
const easeDrift = bezier(.37,.1,.63,.9);
const SIL = "#05080c";

/* ── assets, verbatim from the prototype ── */
const WING_L = "M-4,-4 C-16,-14 -36,-18 -54,-10 C-49,-3 -44,1 -37,4 C-33,1 -30,1 -27,5 C-22,2 -19,2 -15,7 C-11,4 -7,5 -4,8 Z";
const WING_R = "M4,-4 C16,-14 36,-18 54,-10 C49,-3 44,1 37,4 C33,1 30,1 27,5 C22,2 19,2 15,7 C11,4 7,5 4,8 Z";
const EAR_L = "M-7,-18 L-2,-9 L-11,-8 Z";
const EAR_R = "M7,-18 L2,-9 L11,-8 Z";
const SNAG = "M96,470 L110,470 L107,372 L150,318 L145,313 L106,358 L104,318 L128,276 L122,273 L101,310 L98,270 L90,270 L88,376 L60,346 L55,351 L88,392 Z";
const GRASS = [
  "M210,470 l4,-14 l3,14 l4,-10 l3,10 Z",
  "M330,476 l4,-12 l3,12 l4,-9 l3,9 Z",
  "M560,478 l4,-13 l3,13 l4,-9 l3,9 Z",
  "M720,472 l4,-12 l3,12 l4,-10 l3,10 Z",
  "M880,478 l4,-14 l3,14 l4,-9 l3,9 Z",
];
const HILL_BACK  = "M0,340 Q180,290 380,330 T960,315 V540 H0 Z";
const HILL_FRONT = "M0,400 Q240,360 480,392 T960,380 V540 H0 Z";
const GROUND     = "M0,460 Q240,442 480,456 T960,450 V540 H0 Z";
const BLOOD      = "M0,0 C4,6 5,11 3,15 C1,18 -3,18 -5,14 C-6,10 -4,5 0,0 Z";
/* flank extensions (only visible on wide hosts): each ridge continued along its end
   tangent as a straight edge to x = -480 / 1440. Fills match the ridge they extend.
   Each flank runs one unit INTO the main shape (x 1 / 959, along the same tangent) so the
   shared anti-aliased edge never shows as a lighter seam. */
const FLANKS =
  '<path d="M1,339.7 L-480,473 V540 H1 Z" fill="#2c405a"/><path d="M959,315.1 L1440,246 V540 H959 Z" fill="#2c405a"/>' +
  '<path d="M1,399.8 L-480,480 V540 H1 Z" fill="#1d2e42"/><path d="M959,380.2 L1440,292 V540 H959 Z" fill="#1d2e42"/>' +
  '<rect x="-480" y="452" width="481" height="88" fill="#152233"/><rect x="959" y="452" width="481" height="88" fill="#152233"/>';
const STARS_FLANK = [[-400,80,1.4,1],[-300,150,1.1,2],[-180,40,1.6,3],[-90,120,1.0,2],[1040,60,1.3,1],[1140,140,1.1,3],[1260,30,1.5,2],[1380,110,1.2,1]];
/* [cx, cy, r, twinkle class 1..3] */
const STARS = [[90,60,1.6,1],[180,130,1.2,2],[300,50,1.8,3],[420,110,1.1,1],[520,40,1.5,2],
  [620,150,1.2,3],[700,70,1.7,1],[860,200,1.3,2],[930,90,1.5,3],[250,200,1.0,1],[560,210,1.0,2],[40,170,1.3,3]];
/* dark nights: more of the same primitive, no moon */
const STARS_DARK = [[130,30,1.1,2],[360,160,1.0,3],[470,20,1.3,1],[660,105,1.0,2],[760,40,1.2,3],
  [900,150,1.0,1],[210,90,1.2,3],[600,60,1.0,1],[800,120,1.4,2],[350,235,1.0,2]];
const CLOUD1 = '<ellipse cx="240" cy="150" rx="120" ry="16"/><ellipse cx="310" cy="140" rx="70" ry="12"/>';
const CLOUD2 = '<ellipse cx="640" cy="230" rx="150" ry="14"/>';
/* COW: composed from rounded primitives only (no freehand organic path), prototype #cowShape */
const COW_SHAPE =
  '<rect x="-46" y="-60" width="92" height="46" rx="22"/>' +
  '<rect x="-72" y="-48" width="24" height="42" rx="10" transform="rotate(16 -60 -27)"/>' +
  '<ellipse cx="-52" cy="-52" rx="8" ry="4" transform="rotate(-28 -52 -52)"/>' +
  '<rect x="-38" y="-18" width="8" height="18" rx="3"/>' +
  '<rect x="-22" y="-18" width="8" height="18" rx="3"/>' +
  '<rect x="16"  y="-18" width="8" height="18" rx="3"/>' +
  '<rect x="32"  y="-18" width="8" height="18" rx="3"/>' +
  '<path d="M46,-52 C56,-46 57,-32 52,-20" fill="none" stroke="#05080c" stroke-width="5" stroke-linecap="round"/>';
const RIG =
  '<g class="wst-bob">' +
    '<g class="wst-wing wst-wing-l"><path d="' + WING_L + '"/></g>' +
    '<g class="wst-wing wst-wing-r"><path d="' + WING_R + '"/></g>' +
    '<ellipse class="wst-body" cx="0" cy="0" rx="9" ry="13"/>' +
    '<path class="wst-ear" d="' + EAR_L + '"/>' +
    '<path class="wst-ear" d="' + EAR_R + '"/>' +
  '</g>';
/* the three cow slots: prototype positions, perch points (bat on the back) and neck
   (bite) points; tiers calf / steer / prime = the prototype's S / M / L */
const COW_SLOTS = {
  calf:  {x:370, y:462, s:0.62, halo:{rx:52, ry:12}, tagY:-58, perch:{x:366, y:412}, neck:{x:334, y:436}, tag:"small · quick meal"},
  steer: {x:545, y:468, s:0.85, halo:{rx:66, ry:14}, tagY:-72, perch:{x:541, y:400}, neck:{x:497, y:432}, tag:"medium · good blood"},
  prime: {x:760, y:474, s:1.08, halo:{rx:82, ry:16}, tagY:-90, perch:{x:756, y:390}, neck:{x:700, y:428}, tag:"large"},
};
const DEFAULT_COWS = [{id:"a", tier:"calf"}, {id:"b", tier:"steer"}, {id:"c", tier:"prime"}];
const FAR_SHIFT = 70;                 // far valley: the herd sits further right
const SNAG_PERCH = {x:120, y:300};    // where the player bat hangs at dusk (prototype start)
/* P5 roost silhouettes (2026-09-03). Rule (ARCH.md): no new organic shapes. The hollow is the
   approved snag; the outpost is the snag mirrored and shrunk about its base; the mango hollow
   is the snag widened plus a second, smaller mirrored trunk; the culvert and the barn are
   straight-edged primitives (rects and one triangle) with an opening in the front-hill colour
   so the hanging bat reads against it. Each carries the perch the player bat hangs from at
   dusk and returns to at dawn, in land coordinates (the group is translated by DY). The main
   shape keeps class wst-snag so the P3b/P4 harness scripts that measure it keep working. */
const HOLE = "#1d2e42";
const ROOSTS = {
  snag:    { perch:{x:120, y:300},
             svg:`<path class="wst-snag" fill="${SIL}" d="${SNAG}"/>` },
  outpost: { perch:{x:92, y:317},
             svg:`<path class="wst-snag" fill="${SIL}" d="${SNAG}" transform="translate(200,470) scale(-0.9,0.9) translate(0,-470)"/>` },
  mango:   { perch:{x:126, y:280},
             svg:`<path class="wst-snag" fill="${SIL}" d="${SNAG}" transform="translate(100,470) scale(1.3,1.12) translate(-100,-470)"/>` +
                 `<path fill="${SIL}" d="${SNAG}" transform="translate(262,470) scale(-0.6,0.7) translate(0,-470)"/>` },
  culvert: { perch:{x:128, y:428},
             svg:`<rect class="wst-snag" fill="${SIL}" x="40" y="380" width="28" height="90"/>` +
                 `<rect fill="${HOLE}" x="68" y="411" width="104" height="35"/>` +
                 `<rect fill="${SIL}" x="68" y="402" width="110" height="9"/><rect fill="${SIL}" x="68" y="446" width="110" height="9"/>` +
                 `<rect fill="${SIL}" x="172" y="396" width="8" height="20"/><rect fill="${SIL}" x="172" y="440" width="8" height="20"/>` +
                 `<rect fill="${SIL}" x="40" y="466" width="140" height="6"/>` },
  barn:    { perch:{x:111, y:414},
             svg:`<rect class="wst-snag" fill="${SIL}" x="36" y="384" width="150" height="86"/>` +
                 `<polygon fill="${SIL}" points="28,384 111,326 194,384"/>` +
                 `<rect fill="${HOLE}" x="86" y="392" width="50" height="44"/>` +
                 `<rect fill="${HOLE}" x="150" y="430" width="26" height="40"/>` },
};
const RIVAL_OFFSET = {x:16, y:22};    // prototype: rival at (772,412) on the prime cow's perch (756,390)
/* P4 board geometry. HOVER: where the player waits beside a cow after approach(), relative
   to the neck (the wound side) and the perch height. HERD_PAD: half-width kept clear around
   the outer slots when a phone's visible band is narrower than the dealt herd. HIT_PX: the
   minimum tap target in css px (the invisible hit ellipse grows; silhouettes never change).
   SHUFFLE: the tolerated-join side-step (26 units in three bobs, bible #10). */
const HOVER = {dx:-58, dy:-34};
const HERD_PAD = 90;
const HIT_PX = 48;
const SHUFFLE = [[9,-5],[9,0],[18,-5],[18,0],[26,-5],[26,0]];

/* phase tints (canvas): night is the reference and paints nothing */
const TINT = {
  dusk:  {top:[168,104,62,.10], lift:0},
  night: {top:[168,104,62,0],   lift:0},
  dawn:  {top:[196,140,88,.12], lift:.06},
};

/* meet / slice follows the SAME media query as the CSS height rule (.wyd-stage at
   max-width:600px in wyd.css), so the JS framing and the CSS height never disagree */
const NARROW_MQ = matchMedia("(max-width:600px)");
let uid = 0;
/* ?debug=stage: window.__wstFrames counts canvas frames (headless tests); off in production */
const DEBUG = typeof location !== "undefined" && /[?&]debug=stage(?:&|$)/.test(location.search);
if(DEBUG) window.__wstFrames = 0;

function mount(host, opts){
  opts = opts || {};
  const u = ++uid;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const moon = opts.moon || "bright";
  const storm = !!opts.storm;
  const far = !!opts.far;
  const cowsIn = opts.cows || DEFAULT_COWS;
  const slots = Array.isArray(opts.slots) ? opts.slots : null;
  const shift = far ? FAR_SHIFT : 0;
  const roostKey = ROOSTS[opts.roost] ? opts.roost : "snag";
  const RO = ROOSTS[roostKey], PERCH = RO.perch;
  /* P6b roost pick (Bryson 2026-09-03): opts.roosts = [{id, sil, tag}] draws the colony's roosts
     as tappable silhouettes across the stage instead of the single home roost, the way the cow
     board works: hit ellipse, halo ring, tag; choice(on) / onRoost(fn) / selectRoost(id) /
     roostPerch(id). Slots are evenly spaced across the composition; on a phone the whole row
     scales down to fit the visible band (fitRoosts), bases on the ground. opts.at names the
     roost the player bat hangs from at mount. */
  const roostsIn = Array.isArray(opts.roosts) && opts.roosts.length ? opts.roosts : null;
  const RP = {w:240, cx:120, base:470};   // a roost silhouette's footprint in land units, its centre x, its base y
  const roosts = {};
  if(roostsIn){
    const n = roostsIn.length, gap = Math.min(240, (VW - 160)/Math.max(1, n-1)), x0 = VW/2 - gap*(n-1)/2;
    roostsIn.forEach((r, i)=>{
      const sil = ROOSTS[r.sil] ? r.sil : "snag";
      roosts[r.id] = {id:r.id, sil, tag:r.tag || "", want: Math.round(x0 + gap*i), x: Math.round(x0 + gap*i), k:1};
    });
  }
  const cows = {};
  /* slot x comes from opts.slots (PASTURES[...].slots, already absolute) when given, else
     the prototype's per-tier x (+ the far shift, the P3b rule). Perch and neck ride along as
     the prototype's per-cow offsets from that cow's own origin, i.e. already scaled by tier
     (calf −4/−50, steer −4/−68, prime −4/−84 for the perch). `want` keeps the dealt x so a
     phone's herd compression (fitCows) can be recomputed from it on every layout. */
  cowsIn.forEach((c, i)=>{
    const t = COW_SLOTS[c.tier] || COW_SLOTS.steer;
    const x0 = (slots && typeof slots[i] === "number") ? slots[i] : t.x + shift;
    cows[c.id] = {id:c.id, tier:c.tier, x:x0, want:x0, y:t.y, s:t.s, halo:t.halo, tagY:t.tagY,
      perch:{x:x0 + (t.perch.x - t.x), y:t.perch.y}, neck:{x:x0 + (t.neck.x - t.x), y:t.neck.y}, tag:t.tag,
      occupied:!!c.occupied, occupant:c.occupant || null};
  });

  /* ── DOM ── */
  const root = document.createElement("div");
  root.className = "wyd-stage" + (reduced ? " wst-static" : "");
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", "Night over the pasture");
  root.dataset.moon = moon; root.dataset.storm = storm ? "1" : "0"; root.dataset.far = far ? "1" : "0";
  root.dataset.roost = roostKey;
  const par = NARROW_MQ.matches ? "xMidYMax slice" : "xMidYMid meet";
  root.classList.add(NARROW_MQ.matches ? "wst-slice" : "wst-meet");

  const starList = STARS.concat(STARS_FLANK, moon === "dark" ? STARS_DARK : []);
  const stars = starList.map(s=> `<circle class="wst-star wst-tw${s[3]}" cx="${s[0]}" cy="${s[1]}" r="${s[2]}"/>`).join("");
  const moonR = moon === "bright" ? 56 : 44;
  const moonOp = storm ? .35 : 1;
  const haloOp = moon === "dark" ? 0 : (moon === "bright" ? 1 : .55) * moonOp;
  const moonG = moon === "dark" ? "" :
    `<g class="wst-moon" opacity="${moonOp}">
      <circle cx="790" cy="120" r="${moonR}" fill="#e9e3d0"/>
      <circle cx="772" cy="104" r="9" fill="#d8d1bc"/>
      <circle cx="806" cy="140" r="6" fill="#d8d1bc"/>
      <circle cx="798" cy="112" r="4" fill="#ddd6c2"/>
    </g>`;
  const clouds =
    `<g class="wst-cloud wst-drift1">${CLOUD1}</g><g class="wst-cloud wst-drift2">${CLOUD2}</g>` +
    (storm ? `<g class="wst-cloud wst-cloud-storm wst-drift2">${CLOUD1}${CLOUD2}</g>` : "");
  const back = document.createElementNS(NS, "svg");
  back.setAttribute("class", "wst-back");
  back.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
  back.setAttribute("preserveAspectRatio", par);
  back.setAttribute("aria-hidden", "true");
  back.innerHTML = `
    <defs>
      <linearGradient id="wst-sky-${u}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${SKY_Y2}">
        <stop offset="0"   stop-color="#1b2a44"/>
        <stop offset="${SKY_MID}" stop-color="#2a4059"/>
        <stop offset="1"   stop-color="#476384"/>
      </linearGradient>
      <radialGradient id="wst-moonglow-${u}" cx=".5" cy=".5" r=".5">
        <stop offset="0"  stop-color="rgba(240,235,215,.55)"/>
        <stop offset=".5" stop-color="rgba(240,235,215,.20)"/>
        <stop offset="1"  stop-color="rgba(240,235,215,0)"/>
      </radialGradient>
    </defs>
    <rect x="-960" y="0" width="2880" height="${VH}" fill="url(#wst-sky-${u})"/>
    <g class="wst-pan wst-pan-back">
    <g class="wst-stars">${stars}</g>
    <circle class="wst-halo" cx="790" cy="120" r="150" fill="url(#wst-moonglow-${u})" opacity="${haloOp}"/>
    ${moonG}
    ${clouds}
    <g class="wst-land" transform="translate(0,${DY})">
      ${FLANKS}
      <path d="${HILL_BACK}" fill="#2c405a"/>
      <path d="${HILL_FRONT}" fill="#1d2e42"/>
      <rect x="0" y="452" width="960" height="88" fill="#152233"/>
      <path d="${GROUND}" fill="#152233"/>
    </g>
    </g>`;

  const atmo = document.createElement("canvas");
  atmo.className = "wst-atmo";
  atmo.setAttribute("aria-hidden", "true");

  /* each cow: an invisible hit ellipse (grown on phones, see fitCows), the halo ring, the
     silhouette, the resident group (the prototype #rivalBat rig at the prototype's offset
     from the perch, scale .75, tucked + a crimson bead at the wound; hidden unless the cow
     is occupied), the player's own bead (co-feeding after a tolerated join), the tag and
     the confrontation pulse ring. Occupant identity is NOT written to the DOM: every
     resident looks the same until the engine reveals it. */
  const cowsHtml = Object.values(cows).map(c=>{
    const haloStroke = c.occupied ? "#c6303c" : "#67c09b";
    const pr = 46 * c.s / 1.08, py = -70 * c.s / 1.08;
    const rx = c.perch.x - c.x + RIVAL_OFFSET.x, ry = c.perch.y - c.y + RIVAL_OFFSET.y;
    const nx = c.neck.x - c.x, ny = c.neck.y - c.y;
    return `<g class="wst-cow${c.occupied ? " wst-occ" : ""}" data-cow="${c.id}" data-tier="${c.tier}" transform="translate(${c.x},${c.y})" aria-hidden="true">
      <ellipse class="wst-hit" cx="0" cy="${(-34*c.s).toFixed(1)}" rx="${c.halo.rx}" ry="${(40*c.s).toFixed(1)}" fill="transparent"/>
      <ellipse class="wst-halo-ring" cx="0" cy="2" rx="${c.halo.rx}" ry="${c.halo.ry}" fill="none" stroke="${haloStroke}" stroke-width="2"/>
      <g class="wst-breathe"><use href="#wst-cow-${u}" transform="scale(${c.s})"/></g>
      <g class="wst-res${c.occupied ? "" : " wst-hidden"}">
        <g class="wst-bat wst-rival wst-tuck" transform="translate(${rx},${ry}) scale(.75)">${RIG}</g>
        <circle class="wst-bead" cx="${nx}" cy="${ny}" r="4"/>
      </g>
      <circle class="wst-bead wst-bead-you" cx="${nx}" cy="${ny}" r="4"/>
      <text class="wst-tag" x="0" y="${c.tagY}">${c.tag}${c.occupied ? " " + OCC_TAG() : ""}</text>
      <circle class="wst-pulse" cx="0" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}"/>
      <foreignObject class="wst-info" x="-185" y="${(c.tagY - 118).toFixed(0)}" width="370" height="104" style="display:none"><div xmlns="http://www.w3.org/1999/xhtml" class="wst-infobox"></div></foreignObject>
    </g>`;
  }).join("");
  const front = document.createElementNS(NS, "svg");
  front.setAttribute("class", "wst-front");
  front.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
  front.setAttribute("preserveAspectRatio", par);
  front.setAttribute("aria-hidden", "true");
  front.innerHTML = `
    <defs>
      <g id="wst-cow-${u}">${COW_SHAPE}</g>
      <radialGradient id="wst-vig-${u}" cx=".5" cy=".45" r=".75">
        <stop offset=".6" stop-color="rgba(0,0,0,0)"/>
        <stop offset="1"  stop-color="rgba(0,0,0,.3)"/>
      </radialGradient>
    </defs>
    <g class="wst-camera">
    <g class="wst-pan wst-pan-front">
      <g class="wst-land" transform="translate(0,${DY})">
        ${roostsIn ? "" : `<g class="wst-roost" aria-hidden="true">${RO.svg}</g>`}
        ${Object.values(roosts).map(r=> `<g class="wst-roostpick" data-roost="${r.id}" transform="translate(${r.x - RP.cx},0)" aria-hidden="true">
          <ellipse class="wst-hit" cx="${RP.cx}" cy="380" rx="118" ry="112" fill="transparent"/>
          <ellipse class="wst-halo-ring" cx="${RP.cx}" cy="${RP.base + 2}" rx="112" ry="14" fill="none" stroke="#67c09b" stroke-width="2"/>
          <g class="wst-roostsil">${ROOSTS[r.sil].svg}</g>
          <text class="wst-tag" x="${RP.cx}" y="252">${r.tag}</text>
        </g>`).join("")}
        <g class="wst-grass" fill="${SIL}" aria-hidden="true">${GRASS.map(d=>`<path d="${d}"/>`).join("")}</g>
        ${cowsHtml}
        <g class="wst-bloodg" aria-hidden="true">
          <path class="wst-blood" fill="#c6303c" d="${BLOOD}"/>
          <circle class="wst-bloodpulse" cx="0" cy="6" r="18"/>
          <circle class="wst-drip wst-d1" cx="0" cy="12" r="2.2"/>
          <circle class="wst-drip wst-d2" cx="-2" cy="12" r="1.8"/>
          <circle class="wst-drip wst-d3" cx="2" cy="12" r="2"/>
        </g>
        <g class="wst-puff" aria-hidden="true"><circle cx="-10" cy="0" r="3"/><circle cx="4" cy="-6" r="2.5"/><circle cx="12" cy="2" r="3"/></g>
        <g class="wst-move" aria-hidden="true"><g class="wst-bat wst-tuck">${RIG}</g></g>
      </g>
    </g>
    </g>
    <rect class="wst-vig" x="0" y="0" width="${VW}" height="${VH}" fill="url(#wst-vig-${u})" pointer-events="none" aria-hidden="true"/>`;

  const cap = document.createElement("div");
  cap.className = "wst-cap";
  cap.setAttribute("aria-hidden", "true");   // the root's aria-label carries the same words
  /* P6d: the player's own bars in the stage corner (engine-owned HTML, mirrors the HUD) */
  const you = document.createElement("div");
  you.className = "wst-you"; you.hidden = true; you.setAttribute("aria-hidden", "true");
  root.appendChild(back); root.appendChild(atmo); root.appendChild(front); root.appendChild(cap); root.appendChild(you);
  host.appendChild(root);

  /* element handles, looked up once (never per frame) */
  const move = front.querySelector(".wst-move");
  const bat = move.querySelector(".wst-bat");
  const camera = front.querySelector(".wst-camera");
  const panFront = front.querySelector(".wst-pan-front");
  const panBack = back.querySelector(".wst-pan-back");
  const bloodG = front.querySelector(".wst-bloodg");
  const puff = front.querySelector(".wst-puff");
  const vig = front.querySelector(".wst-vig");
  const cowEls = {}, resEls = {}, rivalEls = {}, roostEls = {};
  front.querySelectorAll(".wst-cow").forEach(el=>{
    cowEls[el.dataset.cow] = el;
    resEls[el.dataset.cow] = el.querySelector(".wst-res");
    rivalEls[el.dataset.cow] = el.querySelector(".wst-res .wst-bat");
  });
  front.querySelectorAll(".wst-roostpick").forEach(el=>{ roostEls[el.dataset.roost] = el; });
  /* where the player bat hangs at a picked roost (land units), following the roost's scale */
  function roostPerch(id){
    const r = roosts[id]; if(!r) return {x: PERCH.x, y: PERCH.y};
    const p = ROOSTS[r.sil].perch;
    return {x: r.x - RP.cx + p.x * r.k + (1 - r.k) * 0, y: RP.base + (p.y - RP.base) * r.k};
  }

  /* ── state ── */
  let dead = false, raf = 0, paused = !!document.hidden, resizeRaf = 0;
  /* pending beat timers: {fn, due, left, h}; hidden tab = cleared and the remaining ms
     remembered, visible = re-armed (so a flight never lands unseen); destroy drops all */
  const timers = new Set();
  const listeners = [];
  let pose = "tuck";
  const AT = roostsIn && roosts[opts.at] ? roostPerch(opts.at) : PERCH;
  let batX = AT.x, batY = AT.y;
  let cowHandler = null, choiceOn = false, nearCow = null;   // nearCow: the cow last approached / perched
  let roostHandler = null, nearRoost = (roostsIn && roosts[opts.at]) ? opts.at : null;   // the roost the player bat hangs at
  let phase = opts.phase || "dusk";
  let tintFrom = TINT[phase], tintTo = TINT[phase], tintT0 = 0;
  const TINT_MS = 4000;
  let frames = 0;
  /* camera: lookX is the wanted centre (stage x); pan* mirror the CSS transition for the
     canvas (fog / fireflies pan with the front layer) */
  let lookX = VW/2, panFrom = 0, panTo = 0, panT0 = 0, panMs = 0;

  const arm = e=>{ e.h = setTimeout(()=>{ timers.delete(e); if(!dead) e.fn(); }, Math.max(0, e.due - Date.now())); };
  const later = (ms, fn)=>{ const e = {fn, due:Date.now()+ms, left:ms, h:0}; timers.add(e); if(!paused) arm(e); return e; };
  /* a destroyed stage clears its timers, so a pending sleep never resolves: the caller's
     async chain simply stops (every method is also a no-op once dead) */
  const sleep = ms=> new Promise(r=>{ if(dead || reduced){ r(); return; } later(ms, r); });
  const on = (target, type, fn)=>{ target.addEventListener(type, fn); listeners.push([target, type, fn]); };

  /* move the player rig: sequential moves each transition (prototype batTo) */
  function setMove(x, y, ms, ease){
    batX = x; batY = y;
    if(reduced || !ms){ move.style.transition = "none"; }
    else { move.style.transition = "transform " + ms + "ms " + (ease || EASE.act); }
    void move.getBoundingClientRect();   // force a frame so successive moves each transition
    move.style.transform = "translate(" + x + "px," + y + "px)";
  }
  setMove(AT.x, AT.y, 0);
  /* move a cow's resident group (the side-step of a tolerated join, the departure) */
  function setRes(id, x, y, ms, ease){
    const r = resEls[id]; if(!r) return;
    r.style.transition = (reduced || !ms) ? "none" : "transform " + ms + "ms " + (ease || EASE.act);
    void r.getBoundingClientRect();
    r.style.transform = "translate(" + x + "px," + y + "px)";
  }
  /* the resident rig's pose: "" = un-tucked (wings at rest, bobbing), tuck, flare, flap */
  function setRival(id, state){
    const r = rivalEls[id]; if(!r) return;
    ["wst-tuck", "wst-flare", "wst-flap"].forEach(k=> r.classList.remove(k));
    if(state) r.classList.add("wst-" + state);
  }
  function syncTag(id){
    const c = cows[id], el = cowEls[id]; if(!c || !el) return;
    el.querySelector(".wst-tag").textContent = c.tag + (c.occupied ? " " + OCC_TAG() : "");
  }

  /* ── canvas atmosphere ── */
  const ctx = atmo.getContext("2d");
  let cw = 0, ch = 0, dpr = 1, scale = 1, ox = 0, oy = 0, vbX = 0, vbW = VW, rainW = 0;
  /* desktop (viewport > 600px): "meet" on a viewBox widened to the host's aspect, so the
     frame fills edge to edge with no letterbox; phones: the 960 viewBox with "slice",
     anchored at the BOTTOM (xMidYMax) so a wide-but-short host crops sky, never hooves */
  function layout(){
    /* the canvas and the svgs fill the stage's padding box (1px border), so size from root;
       the meet / slice decision follows the CSS height breakpoint (NARROW_MQ) */
    const w = root.clientWidth || host.clientWidth, h = root.clientHeight || 1;
    const meet = !NARROW_MQ.matches;
    root.classList.toggle("wst-meet", meet); root.classList.toggle("wst-slice", !meet);
    const p = meet ? "xMidYMid meet" : "xMidYMax slice";
    const W = meet ? Math.max(VW, Math.min(1920, Math.round(VH * w / h))) : VW;
    const vx = Math.round((VW - W)/2);
    const vb = vx + " 0 " + W + " " + VH;
    back.setAttribute("preserveAspectRatio", p); front.setAttribute("preserveAspectRatio", p);
    back.setAttribute("viewBox", vb); front.setAttribute("viewBox", vb);
    vig.setAttribute("x", vx); vig.setAttribute("width", W);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = w; ch = h;
    atmo.width = Math.round(w*dpr); atmo.height = Math.round(h*dpr);
    scale = meet ? Math.min(w/W, h/VH) : Math.max(w/W, h/VH);
    ox = (w - W*scale)/2 - vx*scale; oy = meet ? (h - VH*scale)/2 : h - VH*scale;
    vbX = vx; vbW = W;
    fitCows();
    fitRoosts();
    // rain covers the whole visible viewBox (the flanks too on wide hosts)
    if(rain.length && W !== rainW){ rainW = W; rain.forEach(r=>{ r.x = rnd(vx - 80, vx + W + 40); }); }
    // an in-flight camera pan keeps its remaining time instead of snapping to the target
    const left = (panT0 && panMs) ? Math.max(0, panMs - (performance.now() - panT0)) : 0;
    applyLook(left);
  }
  /* the board on the current frame: (1) phones: when the dealt herd (outer slots + HERD_PAD)
     is wider than the visible band (cw / scale units), compress the slot spread about the
     herd's centre so every cow, halo and hover point stays inside the crop (perch / neck /
     the transform follow); desktop and narrower herds keep the dealt x exactly; (2) the
     invisible hit ellipse grows to at least HIT_PX css px in both axes (the silhouette,
     halo and tag never change). Runs from layout(), so a rotation re-fits. */
  function fitCows(){
    const list = Object.values(cows); if(!list.length || !scale) return;
    const visW = cw / scale;
    const lo = Math.min.apply(null, list.map(c=> c.want)), hi = Math.max.apply(null, list.map(c=> c.want));
    // the pad stays fixed (it is the halo's room), only the slot spread compresses
    const k = (visW < VW && hi - lo + 2*HERD_PAD > visW && hi > lo) ? Math.max(0, visW - 2*HERD_PAD) / (hi - lo) : 1;
    const cx = (lo + hi) / 2;
    const minR = HIT_PX / 2 / scale;
    list.forEach(c=>{
      const x = k === 1 ? c.want : Math.round(cx + (c.want - cx) * k);
      const el = cowEls[c.id];
      if(x !== c.x){
        const d = x - c.x;
        c.x = x; c.perch.x += d; c.neck.x += d;
        el.setAttribute("transform", `translate(${c.x},${c.y})`);
      }
      const hit = el.querySelector(".wst-hit");
      hit.setAttribute("rx", Math.max(c.halo.rx, minR).toFixed(1));
      hit.setAttribute("ry", Math.max(40 * c.s, minR).toFixed(1));
    });
  }
  /* the roost row on the current frame: on a phone the row scales down (bases on the ground) and
     re-spaces so every roost sits inside the visible band; desktop keeps the dealt slots */
  function fitRoosts(){
    const list = Object.values(roosts); if(!list.length || !scale) return;
    const visW = cw / scale, n = list.length;
    const k = visW < VW ? Math.max(0.42, Math.min(1, (visW - 30) / (n * RP.w))) : 1;
    const gap = k === 1 ? null : Math.min(240, (visW - RP.w*k) / Math.max(1, n-1));
    const x0 = k === 1 ? null : VW/2 - gap*(n-1)/2;
    const minR = HIT_PX / 2 / scale;
    list.forEach((r, i)=>{
      const x = k === 1 ? r.want : Math.round(x0 + gap*i);
      r.x = x; r.k = k;
      const el = roostEls[r.id]; if(!el) return;
      el.setAttribute("transform", `translate(${(x - RP.cx*k).toFixed(1)},${(RP.base*(1-k)).toFixed(1)}) scale(${k})`);
      const hit = el.querySelector(".wst-hit");
      hit.setAttribute("rx", Math.max(118, minR/k).toFixed(1)); hit.setAttribute("ry", Math.max(112, minR/k).toFixed(1));
    });
    // the player bat follows its roost when the row re-fits
    if(nearRoost !== null && roosts[nearRoost]){ const p = roostPerch(nearRoost); setMove(p.x, p.y, 0); }
  }
  /* camera pan for the current lookX: 0 when the whole composition is visible (meet hosts
     and wide slice hosts); otherwise translate so lookX sits at the frame centre, clamped
     so the frame never leaves the 960-unit composition */
  function panFor(x){
    const visW = cw / scale;
    if(!(visW < VW)) return 0;
    const cx = Math.max(visW/2, Math.min(VW - visW/2, x));
    return -(cx - VW/2);
  }
  function applyLook(ms){
    const to = panFor(lookX);
    const now = performance.now();
    if(reduced || !ms){ panFrom = panTo = to; panT0 = 0; panMs = 0; }
    else { panFrom = currentPan(now); panTo = to; panT0 = now; panMs = ms; }
    const tr = (reduced || !ms) ? "none" : "transform " + ms + "ms " + EASE.drift;
    panFront.style.transition = tr; panBack.style.transition = tr;
    void panFront.getBoundingClientRect();
    panFront.style.transform = "translate(" + to + "px,0)";
    panBack.style.transform = "translate(" + (to*PARALLAX) + "px,0)";
  }
  function currentPan(now){
    if(!panT0 || !panMs) return panTo;
    const k = easeDrift(Math.min(1, (now - panT0)/panMs));
    return panFrom + (panTo - panFrom)*k;
  }
  /* seeded-random particle sets, built once */
  const rnd = (a, b)=> a + Math.random()*(b-a);
  const fog = Array.from({length:7}, (_, i)=>({
    x: rnd(-100, VW+100), y: 455 + DY + rnd(-14, 18), rx: rnd(130, 240), ry: rnd(16, 30),
    v: rnd(4, 9) * (i%2 ? 1 : -1), ph: rnd(0, 6.28), a: rnd(.07, .13)}));
  const flies = storm ? [] : Array.from({length:11}, ()=>({
    x: rnd(180, VW-40), y: 330 + DY + rnd(0, 110), r: rnd(1.2, 2.2), ph: rnd(0, 6.28),
    w: rnd(.9, 1.8), vx: rnd(-6, 6), vy: rnd(-4, 4)}));
  const rain = storm ? Array.from({length:90}, ()=>({
    x: rnd(-80, VW+40), y: rnd(-40, VH), l: rnd(14, 24), v: rnd(520, 760), a: rnd(.10, .22)})) : [];
  /* grain tile, pre-rendered once, jittered per frame */
  const grain = document.createElement("canvas"); grain.width = grain.height = 96;
  {
    const g = grain.getContext("2d"), img = g.createImageData(96, 96), d = img.data;
    for(let i=0;i<d.length;i+=4){ const v = 180 + Math.random()*75; d[i]=d[i+1]=d[i+2]=v; d[i+3]=Math.random()*22; }
    g.putImageData(img, 0, 0);
  }
  let grainPat = null;
  let last = 0;
  function draw(now, dt){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, atmo.width, atmo.height);
    ctx.setTransform(dpr*scale, 0, 0, dpr*scale, dpr*ox, dpr*oy);
    const t = now/1000;
    // the camera pan (slice hosts): fog and fireflies ride with the front layer
    ctx.save(); ctx.translate(currentPan(now), 0);
    // ground fog: soft ellipses drifting along the pasture, behind the cows
    for(const f of fog){
      const x = f.x + Math.sin(t*0.07 + f.ph)*40 + Math.sin(t*0.013*f.v)*60;
      const y = f.y + Math.sin(t*0.11 + f.ph)*4;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, f.rx);
      gr.addColorStop(0, `rgba(150,175,205,${f.a})`); gr.addColorStop(1, "rgba(150,175,205,0)");
      ctx.fillStyle = gr;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, f.ry/f.rx); ctx.beginPath();
      ctx.arc(0, 0, f.rx, 0, 6.2832); ctx.fill(); ctx.restore();
    }
    // fireflies: amber blinks, slow wander (calm nights only)
    for(const f of flies){
      const a = Math.max(0, Math.sin(t*f.w + f.ph));
      if(a < .05) continue;
      const x = f.x + Math.sin(t*0.23 + f.ph)*f.vx, y = f.y + Math.cos(t*0.19 + f.ph)*f.vy;
      ctx.fillStyle = `rgba(232,173,100,${(a*a*.85).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, f.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = `rgba(232,173,100,${(a*a*.18).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, f.r*3, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
    // rain: slanted streaks (storm / squall), screen space
    if(rain.length){
      ctx.lineWidth = 1; ctx.lineCap = "round";
      for(const r of rain){
        r.y += r.v*dt; r.x += r.v*dt*0.18;
        if(r.y > VH + 30){ r.y = rnd(-60, -10); r.x = rnd(vbX - 80, vbX + vbW + 40); }
        ctx.strokeStyle = `rgba(190,215,235,${r.a})`;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - r.l*0.18, r.y - r.l); ctx.stroke();
      }
    }
    // phase tint: eased with the drift token over TINT_MS
    let k = tintT0 ? Math.min(1, (now - tintT0)/TINT_MS) : 1;
    k = easeDrift(k);
    const top = tintFrom.top.map((v, i)=> v + (tintTo.top[i]-v)*k);
    const lift = tintFrom.lift + (tintTo.lift - tintFrom.lift)*k;
    if(top[3] > .002){
      const g = ctx.createLinearGradient(0, 0, 0, VH*0.75);
      g.addColorStop(0, `rgba(${top[0]|0},${top[1]|0},${top[2]|0},${top[3].toFixed(3)})`);
      g.addColorStop(1, `rgba(${top[0]|0},${top[1]|0},${top[2]|0},0)`);
      ctx.fillStyle = g; ctx.fillRect(-VW, -VH, VW*3, VH*3);
    }
    if(lift > .002){ ctx.fillStyle = `rgba(200,210,230,${lift.toFixed(3)})`; ctx.fillRect(-VW, -VH, VW*3, VH*3); }
    // grain, very light
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(!grainPat) grainPat = ctx.createPattern(grain, "repeat");
    ctx.save(); ctx.globalAlpha = .35;
    ctx.translate((Math.random()*96)|0, (Math.random()*96)|0);
    ctx.fillStyle = grainPat; ctx.fillRect(-96, -96, cw+192, ch+192);
    ctx.restore();
  }
  function tick(now){
    raf = 0;
    if(dead || paused) return;
    const dt = last ? Math.min(.05, (now-last)/1000) : 0;
    last = now;
    draw(now, dt);
    frames++; if(DEBUG) window.__wstFrames = frames;
    raf = requestAnimationFrame(tick);
  }
  function start(){ if(dead || raf || reduced) return; last = 0; raf = requestAnimationFrame(tick); }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf = 0; } }

  /* initial camera: opts.look ("roost" | "herd" | x); default = the herd frame, which on a
     375px phone holds all three cows and the moon (the hunt scene passes "roost") */
  lookX = lookTarget(opts.look !== undefined ? opts.look : "herd");
  layout();
  if(reduced){ draw(performance.now(), 0); }
  else start();
  /* resize: one layout per frame, and only when the stage box actually changed */
  on(window, "resize", ()=>{
    if(resizeRaf) return;
    resizeRaf = requestAnimationFrame(()=>{
      resizeRaf = 0;
      if(dead) return;
      const w = root.clientWidth || host.clientWidth, h = root.clientHeight || 1;
      if(w === cw && h === ch) return;
      layout(); if(reduced) draw(performance.now(), 0);
    });
  });
  /* hidden tab: the canvas loop AND the pending beat timers pause; visible re-arms them
     with the time they had left (destroy still cancels everything) */
  on(document, "visibilitychange", ()=>{
    if(document.hidden){
      paused = true; stop();
      timers.forEach(e=>{ if(e.h){ clearTimeout(e.h); e.h = 0; } e.left = Math.max(0, e.due - Date.now()); });
    } else {
      paused = false;
      timers.forEach(e=>{ if(!e.h){ e.due = Date.now() + e.left; arm(e); } });
      start();
    }
  });

  /* ── cows ── */
  Object.values(cowEls).forEach(el=>{
    const fire = e=>{ if(cowHandler && !dead){ e.preventDefault(); cowHandler(el.dataset.cow); } };
    on(el, "click", fire);
    on(el, "keydown", e=>{ if(e.key === "Enter" || e.key === " ") fire(e); });
  });
  Object.values(roostEls).forEach(el=>{
    const fire = e=>{ if(roostHandler && !dead){ e.preventDefault(); roostHandler(el.dataset.roost); } };
    on(el, "click", fire);
    on(el, "keydown", e=>{ if(e.key === "Enter" || e.key === " ") fire(e); });
  });

  /* named look targets: "roost" = snag + near cows; "herd" = the herd's centre */
  function lookTarget(v){
    if(typeof v === "number") return v;
    if(v === "roost") return LOOK_ROOST;
    const xs = Object.values(cows).map(c=> c.x);
    return xs.length ? (Math.min.apply(null, xs) + Math.max.apply(null, xs))/2 : VW/2;
  }

  /* ── the API ── */
  const st = {
    get dead(){ return dead; },
    get reduced(){ return reduced; },
    get frames(){ return frames; },
    cows,
    /* camera: pan so x (or "roost" / "herd") sits at the frame centre; no-op when the
       whole composition already fits (meet hosts). ms follows the drift token. */
    look(target, ms){
      if(dead) return;
      lookX = lookTarget(target);
      applyLook(ms === undefined ? 1800 : ms);
    },
    setPhase(p){
      if(dead || !TINT[p]) return;
      const now = performance.now();
      // start from the currently displayed mix so a mid-fade change never jumps
      let k = tintT0 ? Math.min(1, (now - tintT0)/TINT_MS) : 1; k = easeDrift(k);
      tintFrom = {top: tintFrom.top.map((v, i)=> v + (tintTo.top[i]-v)*k), lift: tintFrom.lift + (tintTo.lift-tintFrom.lift)*k};
      tintTo = TINT[p]; tintT0 = reduced ? 0 : now; phase = p;
      if(reduced){ tintFrom = tintTo; draw(now, 0); }
      root.dataset.phase = p;
    },
    pose(p){
      if(dead) return;
      if(p === "wobble"){
        bat.classList.add("wst-wobble");
        later(1150, ()=> bat.classList.remove("wst-wobble"));
        return;
      }
      ["wst-flap", "wst-tuck", "wst-flare"].forEach(c=> bat.classList.remove(c));
      bat.classList.add("wst-" + p);
      pose = p;
    },
    /* lead (ms, optional; also accepted as ease = {ease, lead}): resolve that many ms before
       the move ends so the next leg overlaps this one's ease-out (no stop at the seam) */
    batTo(x, y, ms, ease, lead){
      if(dead) return Promise.resolve();
      if(ease && typeof ease === "object"){ lead = ease.lead; ease = ease.ease; }
      setMove(x, y, ms, ease);
      lead = Math.max(0, lead | 0);
      return sleep(lead ? Math.max(0, ms - lead) : ms + 40);
    },
    /* two-step arc: up and across first, then down onto the target; the crest leads into
       the descent so the bat never hangs at the waypoint */
    async arcTo(x, y, ms, ease){
      if(dead) return;
      const mx = batX + (x - batX)*0.55, my = Math.min(batY, y) - Math.max(60, Math.abs(x - batX)*0.22);
      await st.batTo(mx, my, ms*0.55, EASE.drift, Math.min(150, ms*0.12));
      await st.batTo(x, y, ms*0.45, ease || EASE.act);
    },
    async perch(id, ms){
      const c = cows[id]; if(dead || !c) return;
      ms = ms || 800;
      nearCow = id;
      await st.batTo(c.perch.x, c.perch.y - 60, ms, EASE.soft, Math.min(120, ms*0.15));
      await st.batTo(c.perch.x, c.perch.y, Math.round(ms*0.56), EASE.act);
      st.pose("tuck");
    },
    blood(id){
      const c = cows[id]; if(dead || !c) return;
      bloodG.setAttribute("transform", `translate(${c.neck.x},${c.neck.y})`);
      bloodG.classList.add("wst-go");
    },
    /* P28 (Bryson: "if a cow is done with you it just leaves the scene"). An animal you have already
       tried wanders off and is removed: it drifts a little, fades, and its group is dropped from the
       DOM and from the maps, so no later beat can address it. Idempotent, because the pasture
       re-renders on every tap. */
    leave(id){
      const el = cowEls[id]; if(dead || !el || el.dataset.leaving) return;
      el.dataset.leaving = "1";
      el.style.transition = "opacity 700ms ease, transform 700ms ease";
      el.style.transformOrigin = "center";
      el.style.opacity = "0";
      el.style.transform = "translate(-26px, 4px)";
      later(760, ()=>{
        if(el.parentNode) el.parentNode.removeChild(el);
        delete cowEls[id]; delete cows[id];
      });
    },
    kick(id){
      const c = cowEls[id]; if(dead || !c) return;
      const b = c.querySelector(".wst-breathe");
      b.classList.add("wst-kick");
      later(700, ()=> b.classList.remove("wst-kick"));
    },
    /* knocked off: after an optional delay (so the launch rides the kick's apex) a short
       hop up and away with the action ease, then the wobbling fall with drift, then dust */
    async flung(x, y, delay){
      if(dead) return;
      if(delay) await sleep(delay);
      if(dead) return;
      await st.batTo(batX - 70, batY - 95, 380, EASE.act);
      st.pose("wobble");
      await st.batTo(x, y, 700, EASE.drift);
      if(dead) return;
      puff.setAttribute("transform", `translate(${x},${y + 8})`);
      puff.classList.remove("wst-go"); void puff.getBoundingClientRect(); puff.classList.add("wst-go");
      st.pose("tuck");
    },
    /* the cow's resident rig: show it in a pose (tuck | flare | flap), or hide it */
    rival(id, state){
      const r = resEls[id]; if(dead || !r) return;
      if(state === "hide"){ r.classList.add("wst-hidden"); return; }
      r.classList.remove("wst-hidden");
      setRes(id, 0, 0, 0);
      setRival(id, state || "tuck");
    },
    pulse(id){
      const c = cowEls[id]; if(dead || !c) return;
      const p = c.querySelector(".wst-pulse");
      p.classList.remove("wst-go"); void p.getBoundingClientRect(); p.classList.add("wst-go");
    },
    shake(){
      if(dead) return;
      camera.classList.remove("wst-shake"); void camera.getBoundingClientRect(); camera.classList.add("wst-shake");
      later(450, ()=> camera.classList.remove("wst-shake"));
    },
    caption(text, aria){
      if(dead) return;
      cap.classList.remove("wst-on");
      if(aria || text) root.setAttribute("aria-label", aria || text);
      if(!text) return;
      later(60, ()=>{ cap.textContent = text; cap.classList.add("wst-on"); });
    },
    /* ── the cow board (P4) ── */
    /* choice mode: cows become buttons (role, tabindex, hover / focus halo, tags on desktop);
       off = decorative again. Turning it on clears any commit dimming. */
    choice(on){
      if(dead) return;
      choiceOn = !!on;
      root.classList.toggle("wst-choice", choiceOn);
      /* role=img makes every descendant presentational and the front svg is aria-hidden as
         decoration, so a cow button would be focusable-but-hidden (axe aria-hidden-focus):
         in choice mode the root is a labelled group and the front layer is exposed; the decor
         groups carry their own aria-hidden, so only the cow buttons reach the tree */
      root.setAttribute("role", choiceOn ? "group" : "img");
      front.setAttribute("aria-hidden", choiceOn ? "false" : "true");
      Object.values(cowEls).concat(Object.values(roostEls)).forEach(el=>{
        if(choiceOn){ el.setAttribute("role", "button"); el.setAttribute("tabindex", "0"); el.removeAttribute("aria-hidden"); el.classList.remove("wst-dim"); }
        else { el.removeAttribute("role"); el.removeAttribute("tabindex"); el.setAttribute("aria-hidden", "true"); }
      });
    },
    /* click / Enter / Space on a cow → fn(id); the mode itself is st.choice(on) */
    onCow(fn){ cowHandler = fn; },
    /* ── P6d: bars on the stage ── */
    /* the cow's floating info box (HTML inside a foreignObject in the cow group, so it follows
       the cow through fits and pans); empty html hides it */
    info(id, html){
      const el = cowEls[id]; if(dead || !el) return;
      const fo = el.querySelector(".wst-info"), box = fo && fo.firstElementChild;
      if(!fo) return;
      if(!html){ fo.style.display = "none"; box.innerHTML = ""; return; }
      box.innerHTML = html; fo.style.display = "";
    },
    /* your own bars in the stage corner; empty hides */
    you(html){ if(dead) return; you.innerHTML = html || ""; you.hidden = !html; },
    /* ── the roost pick (P6b) ── */
    onRoost(fn){ roostHandler = fn; },
    roostPerch(id){ return roostPerch(id); },
    labelRoost(id, text, tag){
      const el = roostEls[id], r = roosts[id]; if(dead || !el) return;
      if(text) el.setAttribute("aria-label", text);
      if(tag !== undefined){ r.tag = tag; const t = el.querySelector(".wst-tag"); if(t) t.textContent = tag; }
    },
    selectRoost(id){
      if(dead) return;
      Object.values(roostEls).forEach(el=> el.classList.toggle("wst-sel", el.dataset.roost === String(id)));
    },
    /* P18: circle in the sky between roosts while the player has not picked one */
    async hover(x, y, ms){ if(dead) return; st.pose("flap"); await st.arcTo(x, y, ms || 1200, EASE.drift); },
    perchOf(id){ const r = roosts[id]; return r ? roostPerch(id) : null; },
    /* fly to a roost and hang there (the pick beat); instant under reduced motion */
    async goRoost(id, ms){
      const r = roosts[id]; if(dead || !r) return;
      nearRoost = id;
      const p = roostPerch(id);
      st.pose("flap");
      await st.arcTo(p.x, p.y, ms || 900, EASE.act);
      if(dead) return;
      st.pose("tuck");
    },
    /* cut: drop every pending beat timer (a sleep inside confront / yield / shuffle never
       resolves, so an abandoned choreography stops where it is); the stage itself lives on.
       The engine calls it on a tap-to-skip so the standoff's late pulse and shake never fire. */
    cut(){
      if(dead) return;
      timers.forEach(e=>{ if(e.h) clearTimeout(e.h); }); timers.clear();
    },
    /* accessible name (and, optionally, the desktop tag text) for a cow; the engine owns
       the words, so every number in them comes from bat-data.js */
    label(id, text, tag){
      const el = cowEls[id], c = cows[id]; if(dead || !el) return;
      if(text) el.setAttribute("aria-label", text);
      if(tag !== undefined){ c.tag = tag; syncTag(id); }
    },
    /* selection halo (amber pselHalo ring); a new selection undims a committed board */
    select(id){
      if(dead) return;
      Object.values(cowEls).forEach(el=>{
        el.classList.toggle("wst-sel", el.dataset.cow === id);
        el.classList.remove("wst-dim");
      });
    },
    /* commit: keep the selected cow lit, fade every other cow to .35 */
    commit(id){
      if(dead) return;
      st.select(id);
      Object.values(cowEls).forEach(el=> el.classList.toggle("wst-dim", el.dataset.cow !== id));
    },
    /* fly from wherever the bat is to the hover point beside the cow (the wound side), a low
       arc: a drift crest that leads into the act approach (≈ ms total, default 900) */
    async approach(id, ms){
      const c = cows[id]; if(dead || !c) return;
      ms = ms || 900;
      nearCow = id;
      const hx = c.neck.x + HOVER.dx, hy = c.perch.y + HOVER.dy;
      const mx = batX + (hx - batX)*0.5, my = Math.min(batY, hy) - Math.max(40, Math.abs(hx - batX)*0.18);
      st.pose("flap");
      await st.batTo(mx, my, Math.round(ms*0.5), EASE.drift, 140);
      await st.batTo(hx, hy, Math.round(ms*0.5) + 140, EASE.act);
    },
    /* the standoff: s-meet (0 ms) the resident un-tucks and lifts its head; s-rear (+700 ms)
       full flare + the crimson pulse ring + a camera shake; resolves at +1400 ms (at once
       under reduced motion, in the flared state) */
    async confront(id){
      const r = resEls[id]; if(dead || !r) return;
      r.classList.remove("wst-hidden");
      setRival(id, "");
      await sleep(700);
      if(dead) return;
      setRival(id, "flare"); st.pulse(id); st.shake();
      await sleep(700);
    },
    /* chased off: the player wobbles and is knocked back along a low, flat arc into the
       grass on the wound side (the flung variant), dust, tuck; the resident re-tucks.
       id defaults to the cow last approached. */
    async rebuff(id){
      if(dead) return;
      id = id || nearCow;
      const c = cows[id];
      st.pose("wobble");
      const gx = batX - 130, gy = c ? c.y - 4 : batY + 40;
      await st.batTo(batX - 45, batY - 28, 320, EASE.act, 60);
      await st.batTo(gx, gy, 640, EASE.drift);
      if(dead) return;
      puff.setAttribute("transform", `translate(${gx},${gy + 8})`);
      puff.classList.remove("wst-go"); void puff.getBoundingClientRect(); puff.classList.add("wst-go");
      st.pose("tuck");
      if(c) setRival(id, "tuck");
    },
    /* the resident departs (displacement win, or it leaves during a wait): flaps up and away
       off the top of the frame over 1.8 s, then hides; the cow reads as free (halo green) */
    async yield(id){
      const r = resEls[id], c = cows[id], el = cowEls[id]; if(dead || !r) return;
      r.classList.remove("wst-hidden");
      el.classList.remove("wst-occ", "wst-slow", "wst-cofeed");
      c.occupied = false; syncTag(id);
      setRival(id, "flap");
      setRes(id, 240, -520, 1800, EASE.drift);
      await sleep(1800);
      if(dead) return;
      r.classList.add("wst-hidden");
      setRes(id, 0, 0, 0); setRival(id, "tuck");
    },
    /* tolerated join: the resident steps 26 units aside in three bobs and tucks again; the
       player's bead lights at the wound (two feeding beads) once the step is done */
    async shuffle(id){
      const el = cowEls[id]; if(dead || !el) return;
      setRival(id, "tuck");
      for(const s of SHUFFLE){
        setRes(id, s[0], s[1], 125, EASE.act);
        await sleep(130);
        if(dead) return;
      }
      el.classList.add("wst-cofeed");
    },
    /* the wait beat: the resident's feeding bead pulses at half speed */
    slowDrips(id){
      const el = cowEls[id]; if(dead || !el) return;
      el.classList.add("wst-slow");
    },
    /* the stage x range visible in the frame right now: the whole (possibly widened) viewBox
       on meet hosts, else the band the camera is looking at (clamped to the composition) */
    visibleX(){
      const visW = cw / scale;
      if(!(visW < VW)) return [vbX, vbX + vbW];
      const cx = Math.max(visW/2, Math.min(VW - visW/2, lookX));
      return [cx - visW/2, cx + visW/2];
    },
    /* fly back to the snag and hang: a soft lift-off (heavy = anticipate: a sag, then the
       climb) that leads straight into the long drift glide (no crest hang), then the settle
       onto the snag with act */
    async home(ms, heavy){
      if(dead) return;
      ms = ms || 2300;
      st.pose("flap");
      await st.batTo(batX - 120, batY - 140, Math.round(ms*0.35), heavy ? EASE.anticipate : EASE.soft, Math.min(150, ms*0.08));
      await st.batTo(PERCH.x + 40, PERCH.y - 60, Math.round(ms*0.45), EASE.drift, Math.min(100, ms*0.05));
      await st.batTo(PERCH.x, PERCH.y, Math.round(ms*0.20), EASE.act);
      st.pose("tuck");
    },
    /* into the dark: the perched bat fades */
    settle(){
      if(dead) return;
      st.pose("tuck");
      move.classList.add("wst-dark");
    },
    /* one composed static frame for reduced motion: bat on the target cow, blood if fed */
    still(id, fed){
      const c = cows[id]; if(dead || !c) return;
      st.look("herd", 0);
      nearCow = id;
      setMove(c.perch.x, c.perch.y, 0); st.pose("tuck");
      if(fed) st.blood(id);
    },
    destroy(){
      if(dead) return;
      dead = true;
      stop();
      if(resizeRaf){ cancelAnimationFrame(resizeRaf); resizeRaf = 0; }
      timers.forEach(e=> clearTimeout(e.h)); timers.clear();
      listeners.forEach(([t, k, f])=> t.removeEventListener(k, f)); listeners.length = 0;
      cowHandler = null;
      if(root.parentNode) root.parentNode.removeChild(root);
    },
  };
  return st;
}

window.WydStage = {mount, EASE, DY, COW_SLOTS, SNAG_PERCH, ROOSTS, LOOK_ROOST, PARALLAX, RIVAL_OFFSET, HOVER, HIT_PX};
})();
