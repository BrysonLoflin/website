/* bat-game.js: the vampire bat game engine NIGHT FLIGHT (P2 extraction → P3 scene machine →
   P3b silhouette stage → P4 the pasture game, all 2026-09-02).
   Data (BAT, COW_TABLE, PASTURES, RIVALS, COPY, CITES, META, names, traits) comes from
   bat-data.js; helpers ($, roll, log, scene, outcomeBlock, esc, fmtP, wydSaveRun/LoadRun/
   ClearRun, wydEnd) from wyd-core.js (untouched); the picture from bat-stage.js (WydStage). */
/* ── P3 engine (kept) ──
   A scene registry (SCENES) driven by go / pick / renderScene. Every roll and every state
   mutation lives in a transition (wydStart, a choice's apply, finishNight, sleepApply); scene
   render() functions are pure. G.v = 3, G.scene = the current scene id, G.run = this night's
   facts. The save is written at EVERY go(), so Exit + Resume return to the exact scene and a
   resume mid-night reproduces the board, the occupant and the bite roll it already made.
   Scene shape: {label(G), mode, next[], stage?, render(G) pure, choices?(G), wire?(G), auto?(G)}.
   auto() lets a scene be passed through without rendering (the three flight scenes under
   prefers-reduced-motion). stage:true keeps the persistent silhouette stage alive across the
   scene change; every other scene destroys it. ?debug=scenes prints a reachability report,
   ?debug=cites the provenance audit of bat-data.js. */
/* ── P4 (the pasture game) ──
   dusk (near / far only nights farFrom..farTo, storm nights deal the 2-cow board on the near
   paddock, nights 1-2 near only) → flightOut → pasture (the cow board in choice mode, the intel
   panel, Approach / Fly home empty) → bite | encounter (JOIN / DISPLACE / WAIT / LEAVE against a
   roost-mate or one of the rival cast) → flightHome → night | rescue | death → dawn → dusk | end.
   Rules that bind this file (P4-CLARIFICATIONS.md, section A): bite modifiers are SIGNED and
   ADDED (rulings 1-2); approach and WAIT cost a dark hour, JOIN / DISPLACE / LEAVE do not (3);
   ticks exhausted anywhere → flightHome unfed (4); exactly one bite roll a night, rolled in the
   apply that ENTERS bite (5); open wound on any bite reached through an encounter (6); meal =
   max(waitFloor, yield - waitDrain*waited) + rich bonus (7); a fed night never burns (8); one
   unfed cost in finishNight (9-10); missStreak / damper (11); flat trustStart (12); the board,
   occupancy and occupant rolled at the dusk commit (14-17); far / squall windows (18-19);
   encounter odds and memory (20-25); Full Roost = no deaths (26); no literal roost size (27);
   badges as verdict text + .wyd-badges chips (29); the stranger pool per run (30); the P4
   resume guard (31); storm-only death clause (32); scene ids and label tails (33, 35).
   Fix pass (2026-09-02, after verification): the encounter's tap-to-skip listeners are owned at
   module level and detached by cancelTimers (an Exit mid-standoff used to leave a stale skip that
   killed the next season's first flight); cow names come from the cow's own tier; Fly home empty
   at 0 dark hours is tick exhaustion, not an early leave; the co-feeder is named; every literal
   the player can read (event multipliers, the cold-snap cost, share stamina, starting fur, the
   crop cap, the bond floor, groom-back odds) is read from BAT. */
/* ── P5 (roosts, 2026-09-03; Bryson's spec in build_nightflight/P5.md plus his 2026-09-03 additions) ──
   The colony is 3-4 roosts, each a bundle drawn per game (size 4-16, bondQuality, diseaseRisk,
   aggressionRisk, all hidden until experienced); G.partners is the WHOLE colony with homeRoost.
   Every night every bat sleeps at home unless a switch roll (BAT.roosts.switchP, far-rangers
   x3) sends her to another roost, so a friend is sometimes not where you expect her and a
   stranger sometimes is. Dusk adds the SLEEP choice (cards, nights 2-8; night 1 and the storms
   force the hollow; in a storm every roost shelters in place and nobody switches). Presence
   = alive and sleeping where you sleep tonight (set at the dusk commit); the occupant draw,
   the beg pool, the dawn network, refusals and dawn events all run over present bats. A roost
   becomes known the first dawn you wake there. Hazards roll in flyHome, before the dawn:
   sickness (2 dawns: stamina -1, groom-backs halved) and injury (blood -0.5 at once, 2 dawns of
   stamina -1), both independent of mites. First dawn at a new roost: groom-backs halved and no
   one feeds a beggar they barely know. Boards are random deals of 1-5 animals (BAT.dealCount),
   slots spaced by the engine. G.v = 5; v4 saves get the new-season card.
   P10 (2026-09-04): five strategy levers (a close friend feeds you on a merely hungry night; blood
   carries over into the score and an empty crop costs you at the cattle; one donation a dawn; the
   ledger values the depth of a bond, not the length of the list; harsher season pins), the season
   meters and the Skill stat in the HUD, and the SLEEP CHOICE moved from the dusk to the flight home
   (dusk -> flightOut -> pasture -> encounter/bite -> flightHome -> night -> roostPick -> dawn). */
/* ── P9 (2026-09-03 evening, home PC; Bryson): YEARS + POPUPS. Two permanent "year" events are drawn
   at the start (YEARS in bat-data.js, one focused + one diversified lean); they pin parts of the season
   and fold into mods() for all ten nights. The P7 announced night-3/6 events are gone: EVENTS now feeds
   the two surprises only. Everything informative that used to sit in the scene (the first-dusk season
   block, the event banners, the dawn hazard banner, the dawn-event banner, the "how the dawn works"
   text) is now a POPUP (popup(); read it, press OK) plus an ICON in the HUD (hover = the strip under
   the HUD, tap = the popup again). Popups queue; a new scene clears stale ones; G.pops remembers
   what has been shown so a re-render never repeats one. Surprises and dawn events play the
   "event" sound (bat-sound.js). ── */
let G = null;
/* P8 sound: a thin wrapper so a missing bat-sound.js is harmless */
const sfx = (k, a)=>{ try{ if(window.WydSound) WydSound.play(k, a); }catch(e){} };
/* P26: one place that asks whether we are on a phone. Read at render time, never cached, so a
   rotation or a resize picks up the other layout on the next redraw. */
const onPhone = ()=>{ try{ return window.matchMedia("(max-width:600px)").matches; }catch(e){ return false; } };
/* P27 (Bryson: "percentage might be a little confusing, we should be able to easily convert it to
   points instead ... they are all points out of 100"). Blood and the dawn's stamina are both READ
   on a 0 to 100 scale now. Nothing about the model changes: blood is still a float in
   [0, energyCap] and stamina a float in [0, staminaPerNight], and every balance number in
   bat-data.js is untouched. bp() is the one place the conversion happens, so the HUD, the sliders,
   the chips, the tips and the end card can never disagree about what a blood is worth.
   A full crop is 100, so one night of fuel (BAT.burn) is 33. */
const BLOOD_MAX = 100;
const bp = b=> Math.round((b || 0) / BAT.energyCap * BLOOD_MAX);

/* P5 helpers: a normal draw (Box-Muller on roll()), a weighted index draw, number words */
const normal = (mean, sd)=>{ const u = Math.max(1e-9, roll()), v = roll(); return mean + sd * Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v); };
const weightedIndex = w=>{ const tot = w.reduce((a,b)=> a+b, 0); let r = roll()*tot; for(let i=0;i<w.length;i++){ if(r < w[i]) return i; r -= w[i]; } return w.length-1; };
const NUM_WORDS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
const wordN = n=> NUM_WORDS[n] || String(n);
const roostName = r=> ROOST_TYPES[G.roosts[r].type].name;
const presentBats = G=> G.partners.filter(p=> p.alive && p.present);
const roostResidents = (G, r)=> G.partners.filter(p=> p.alive && p.homeRoost === r);
/* how fast this roost warms to you: groom and share gains x (warmBase + warmSlope x bondQ) */
const warmMult = G=>{ const K = BAT.roosts, r = G.roosts[G.myRoost]; return K.warmBase + K.warmSlope * r.bondQ + mods(G).warmAdd; };   // P9: + the year's warm-up bonus
/* P6a: the season's rescue curve, P(a fed bat feeds you when you beg) = min(cap, base + slope x trust^K) */
const rescueP = (G, trust)=>{ const yb = mods(G).rescueBase, base = (yb === null || yb === undefined) ? BAT.rescueBase : yb;   // P9: a year may pin the base
  return Math.min(BAT.rescueCap, base + BAT.rescueSlope * Math.pow(Math.max(0, trust), G.season ? G.season.rescueK : 1)); };
const realBondsOf = G=> G.partners.filter(p=> p.alive && p.trust >= BAT.roosts.knownTrust);
/* P6a: the season, drawn once per game, with its four cues */
function genSeason(years){
  const S = BAT.season, u = (lo, hi)=> lo + (hi - lo) * roll();
  const s = {contagion: u(S.contagionLo, S.contagionHi), rescueK: u(S.rescueKLo, S.rescueKHi),
             freeBonds: Math.round(u(S.freeBondsLo, S.freeBondsHi)), switchP: u(S.switchLo, S.switchHi)};
  (years || []).forEach(k=>{ const Y = YEARS[k]; if(!Y) return;   // P9: a year pins some of the season's draws (the cues follow)
    ["contagion", "rescueK", "switchP"].forEach(f=>{ if(f in Y) s[f] = Y[f]; });
    if("freeBondsAdd" in Y) s.freeBonds = Math.max(1, s.freeBonds + Y.freeBondsAdd); });
  s.cues = [
    s.contagion >= S.cueHi ? COPY.cueContagionHi : s.contagion < S.cueLo ? COPY.cueContagionLo : COPY.cueContagionMid,
    s.rescueK >= S.convexAt ? COPY.cueRescueConvex : s.rescueK <= S.concaveAt ? COPY.cueRescueConcave : COPY.cueRescueMid,
    fill(s.freeBonds <= S.fewAt ? COPY.cueAttentionFew : s.freeBonds >= S.manyAt ? COPY.cueAttentionMany : COPY.cueAttentionMid, {n: s.freeBonds}),
    s.switchP >= (S.switchLo + S.switchHi) * 0.65 ? COPY.cueSwitchHi : s.switchP <= (S.switchLo + S.switchHi) * 0.35 ? COPY.cueSwitchLo : COPY.cueSwitchMid,
  ].filter(Boolean);   // P10b: always four, one per season bar
  return s;
}
/* P10b (Bryson: "too text heavy, just show status bars and at most a sentence"): the four season bars
   with their one-sentence cue, shared by the HUD cell and the briefing / season popups */
function seasonRows(G){
  const se = G.season; if(!se) return [];
  const S = BAT.season, norm = (x, lo, hi)=> clamp((x - lo) / (hi - lo), 0, 1);
  const cue = i=> (se.cues && se.cues[i]) || "";
  return [
    {key:"sick",      label: COPY.meterSick,      v: clamp(se.contagion, 0, 1),                    text: cue(0)},
    {key:"tight",     label: COPY.meterTight,     v: norm(se.rescueK, S.rescueKLo, S.rescueKHi),   text: cue(1)},
    {key:"attention", label: COPY.meterAttention, v: norm(se.freeBonds, S.freeBondsLo, S.freeBondsHi), text: cue(2)},
    {key:"switch",    label: COPY.meterSwitch,    v: norm(se.switchP, S.switchLo, S.switchHi),     text: cue(3)},
  ];
}
const riskBarHtml = v=> `<div class="wyd-riskbar${v >= 0.66 ? " bad" : v >= 0.33 ? " mid" : ""}"><b style="width:${(v*100).toFixed(0)}%"></b></div>`;
/* the popup version: a row per bar, label + bar + its one sentence */
const seasonBarsHtml = G=> `<ul class="wyd-cues wyd-cues--bars">${seasonRows(G).map(r=>
  `<li data-meter="${r.key}"><span class="gl">${r.label}</span>${riskBarHtml(r.v)}<span class="txt">${esc(r.text)}</span></li>`).join("")}</ul>`;
/* spread thin: extra nightly decay on every bond per real bond beyond the season's attention */
const breadthExtra = G=> Math.max(0, realBondsOf(G).length - G.season.freeBonds) * BAT.season.breadthDecay;

/* ── P7 season events (Bryson 2026-09-03 evening): four per game. Two are ANNOUNCED at the start
   (EVENT_NIGHTS, one "focused" lean and one "diversified", visible in the HUD from night 1 with the
   night they land on) and two are SURPRISES (EVENT_HIDDEN: random keys on random nights, shown as
   "?" badges until they land). Each lands in applyNewNight (fireEvents), some at once (hunters,
   big storm, newcomers), the rest as G.mods that run for the drawn number of nights. ── */
const rint = (lo, hi)=> lo + Math.floor(roll() * (hi - lo + 1));
const pickFrom = a=> a[Math.floor(roll() * a.length)];
/* ── P9 YEAR events: YEAR_SLOTS keys drawn per game, never two of the same lean while another lean
   is available; permanent. yearMods() is the constant part of mods(); genSeason / genRoosts read
   the season pins and the roost size multiplier directly.
   P21 (2026-09-04, Bryson drew "a lean year" beside "a generous year"): years are also MUTUALLY
   EXCLUSIVE on their terms (YEARS.terms). Two years that claim the same term contradict each other
   in the night-1 briefing ("the ones left are fat" / "the cattle are thin"), and their numbers
   either cancel (yieldMult 1.3 x 0.48) or silently overwrite each other (the rescue pins, where the
   last year in the list wins). Both filters are preferences, not hard rules: if a slot cannot be
   filled without a clash the draw falls back rather than returning fewer than YEAR_SLOTS years. ── */
const yearTerms = k=> (YEARS[k] && YEARS[k].terms) || [];
const yearClash = (a, b)=> yearTerms(a).some(t=> yearTerms(b).includes(t));
/* every set of YEAR_SLOTS distinct years, hardest rule first: (1) no shared term AND all leans
   distinct, (2) no shared term, (3) distinct keys. The first non-empty tier is drawn from
   UNIFORMLY - a sequential draw would over-pick the pairs around a heavily-clashing year (generous
   clashes with three of the four focused years, so it would be locked to rough in 1 game in 8). */
function yearSets(keys, tier){
  const out = [], n = YEAR_SLOTS;
  (function build(start, cur){
    if(cur.length === n){ out.push(cur.slice()); return; }
    for(let i = start; i < keys.length; i++){
      const k = keys[i];
      if(tier >= 1 && cur.some(o=> yearClash(o, k))) continue;
      if(tier >= 2 && cur.some(o=> YEARS[o].lean === YEARS[k].lean)) continue;
      cur.push(k); build(i + 1, cur); cur.pop();
    }
  })(0, []);
  return out;
}
function genYears(){
  const keys = Object.keys(typeof YEARS === "undefined" ? {} : YEARS);
  if(!keys.length) return [];
  if(keys.length <= YEAR_SLOTS) return keys.slice();
  for(const tier of [2, 1, 0]){
    const sets = yearSets(keys, tier);
    if(sets.length) return pickFrom(sets).slice();
  }
  return keys.slice(0, YEAR_SLOTS);
}
function yearMods(years){
  const m = {yieldMult:1, aggroFloor:0, occMult:1, groomMult:1, coughMult:1, warmAdd:0, strangerEase:false, rescueBase:null, maxCows:0};
  (years || []).forEach(k=>{
    const Y = YEARS[k]; if(!Y) return;
    if(Y.yieldMult) m.yieldMult *= Y.yieldMult;
    if(Y.aggroFloor) m.aggroFloor = Math.max(m.aggroFloor, Y.aggroFloor);
    if(Y.occMult) m.occMult *= Y.occMult;
    if(Y.groomMult) m.groomMult *= Y.groomMult;
    if(Y.coughMult) m.coughMult *= Y.coughMult;
    if(Y.warmAdd) m.warmAdd += Y.warmAdd;
    if(Y.strangerEase) m.strangerEase = true;
    if("rescueBase" in Y) m.rescueBase = Y.rescueBase;
    if(Y.maxCows) m.maxCows = m.maxCows ? Math.min(m.maxCows, Y.maxCows) : Y.maxCows;
  });
  return m;
}
const yearSizeMult = years=> (years || []).reduce((a, k)=> a * ((YEARS[k] && YEARS[k].sizeMult) || 1), 1);
/* the icon, the hover line and the popup text of a year (copy: COPY.yr<Key>Title / Hud / Text) */
/* P25 finding 6: the year cards read as flavour because they carried no numbers. Every multiplier
   a year applies is now filled into its own text straight from YEARS, so the card and the game
   cannot drift apart. */
function yearVars(k){
  const Y = YEARS[k], S = BAT.season;
  return {occ: fmtN(Y.occMult || 1), mult: fmtN(Y.yieldMult || 1), groom: fmtN(Y.groomMult || 1),
          size: fmtN(Y.sizeMult || 1), free: Y.freeBondsAdd || 0, cough: fmtN(Y.coughMult || 1),
          max: Y.maxCows || 0, switch: Math.round((Y.switchP != null ? Y.switchP : S.switchLo) * 100),
          rescue: fmtN(Y.rescueK != null ? Y.rescueK : 1)};
}
function yearCard(k){
  const Y = YEARS[k], K = cap(k), v = yearVars(k);
  return {icon: Y.icon, title: COPY["yr" + K + "Title"], sub: fill(COPY["yr" + K + "Hud"], v), text: fill(COPY["yr" + K + "Text"], v)};
}
function drawEvent(key, night, hidden){
  const E = EVENTS[key], ev = {key, night, hidden: !!hidden, fired:false, left:0, p:{}};
  if(E.fracs) ev.p.frac = pickFrom(E.fracs);
  if(E.nights) ev.p.nights = rint(E.nights[0], E.nights[1]);
  if(E.perRoost) ev.p.per = rint(E.perRoost[0], E.perRoost[1]);
  return ev;
}
function genEvents(){
  const keys = Object.keys(EVENTS);
  // P9: surprises only (the announced pair became the two year events)
  const out = [], used = new Set(), nights = new Set();
  for(let i=0;i<EVENT_HIDDEN.n;i++){
    const pool = keys.filter(k=> !used.has(k)); if(!pool.length) break;
    const free = []; for(let n=EVENT_HIDDEN.nightLo; n<=EVENT_HIDDEN.nightHi; n++) if(!nights.has(n)) free.push(n);
    if(!free.length) break;
    const k = pickFrom(pool), n = pickFrom(free);
    used.add(k); nights.add(n);
    out.push(drawEvent(k, n, true));
  }
  return out;
}
/* the running effects, recomputed from the events still in force */
function activeMods(G){
  const y = yearMods(G.years);   // P9: the year's permanent terms first
  const m = {yieldMult:y.yieldMult, aggroFloor:y.aggroFloor, deaf:0, extraCows:0, primeMult:1, maxCows:y.maxCows, farClosed:false, hygMult:1, moonForce:null, longCost:null,
             occMult:y.occMult, groomMult:y.groomMult, coughMult:y.coughMult, warmAdd:y.warmAdd, strangerEase:y.strangerEase, rescueBase:y.rescueBase};
  (G.events || []).forEach(ev=>{
    if(!ev.fired || ev.left <= 0) return;
    const E = EVENTS[ev.key];
    if(ev.key === "cattle") m.yieldMult *= E.yieldMult;
    if(ev.key === "dominant") m.aggroFloor = Math.max(m.aggroFloor, E.aggro);
    if(ev.key === "deaf") m.deaf = E.missP;
    if(ev.key === "drive"){ m.extraCows += E.extra; m.primeMult *= E.primeMult; }
    if(ev.key === "drought"){ m.maxCows = m.maxCows ? Math.min(m.maxCows, E.maxCows) : E.maxCows; m.farClosed = true; }
    if(ev.key === "mites") m.hygMult *= E.decayMult;
    if(ev.key === "moon") m.moonForce = "bright";
    if(ev.key === "coldsnap") m.longCost = E.longCost;
  });
  return m;
}
const mods = G=> G.mods || (G.mods = activeMods(G));
/* the HUD's line under each badge: the drawn amount in words */
function eventHud(ev){
  const E = EVENTS[ev.key], P = ev.p, k = ev.key, K = k.charAt(0).toUpperCase() + k.slice(1);
  const v = {n: P.nights, nights: P.nights, pct: P.frac ? Math.round(P.frac*100) : "", mult: E.yieldMult, max: E.maxCows, cost: E.longCost};
  if(k === "drive") v.n = E.extra;
  if(k === "newcomers") v.n = P.per;
  if(k === "mites") v.mult = E.decayMult;
  return {icon: E.icon, title: COPY["ev" + K + "Title"], sub: fill(COPY["ev" + K + "Hud"], v)};
}
/* what lands tonight: state changes plus the dusk banner (G.evBanner) */
function fireEvents(G){
  G.evBanner = "";
  (G.events || []).forEach(ev=>{
    if(ev.fired || ev.night !== G.night) return;
    ev.fired = true;
    const E = EVENTS[ev.key], P = ev.p, k = ev.key, K = k.charAt(0).toUpperCase() + k.slice(1);
    let text = "";
    if(k === "hunters"){
      const alive = G.partners.filter(p=> p.alive);
      const nKill = Math.round(alive.length * P.frac);
      const victims = shuffle(alive.slice()).slice(0, nKill);
      victims.forEach(p=>{ p.alive = false; G.deathsAll.push(p.name); if(p.homeRoost === 0) G.deaths.push(p.name); });
      G.lastDeathNight = G.night;
      const known = victims.filter(p=> p.trust >= BAT.roosts.knownTrust || p.homeRoost === G.myRoost).map(p=> p.name);
      text = known.length ? fill(COPY.evHuntersText, {pct: Math.round(P.frac*100), names: esc(known.join(", ")), isare: known.length > 1 ? "are" : "is"})
                          : COPY.evHuntersNone;
      log(`Night ${G.night}: hunters killed ${nKill} bats.`, "bad");
    } else if(k === "bigstorm"){
      const live = G.roosts.filter(r=> !r.gone);
      const r = live.length > 1 ? pickFrom(live) : null;
      if(r){
        r.gone = true;
        G.partners.forEach(p=>{ if(p.alive && p.homeRoost === r.id){ p.alive = false; G.deathsAll.push(p.name); if(p.homeRoost === 0) G.deaths.push(p.name); } });
        G.lastDeathNight = G.night;
        if(G.myRoost === r.id){
          const to = G.roosts.find(x=> !x.gone);
          G.myRoost = to.id; G.roostSel = to.id;
          text = fill(COPY.evBigstormYou, {roost: esc(roostName(r.id)), newRoost: esc(roostName(to.id))});
        } else text = fill(COPY.evBigstormText, {roost: esc(roostName(r.id))});
        log(`Night ${G.night}: a storm wiped out ${roostName(r.id)}.`, "bad");
      }
    } else if(k === "newcomers"){
      const K2 = BAT.roosts;
      G.roosts.forEach(r=>{
        if(r.gone) return;
        for(let i=0;i<P.per;i++){
          const name = G.strangerPool.shift() || ("Bat " + (G.partners.length+1));
          const b = makeBat(G.partners.length, name, drawTrait(r.bondQ), r.id, K2.otherTrust.lo + K2.otherTrust.span*roll());
          b.fed = true; b.present = false; b.tonightRoost = r.id;
          G.partners.push(b);
          G.pp.forEach(row=> row.push(0.05 + 0.15*roll()));
          G.pp.push(G.partners.map((q, j)=> j === b.id ? 0 : G.pp[j][b.id]));
          r.size++;
        }
      });
      text = fill(COPY.evNewcomersText, {n: P.per});
      log(`Night ${G.night}: ${P.per} newcomers joined every roost.`);
    } else {
      ev.left = P.nights;
      if(k === "plague"){ G.partners.forEach(p=>{ if(p.alive) p.cough = P.nights; }); G.sick = Math.max(G.sick, P.nights); }
      const v = {n: P.nights, nights: P.nights, mult: E.yieldMult, max: E.maxCows, cost: E.longCost};
      if(k === "drive") v.n = E.extra;
      text = fill(COPY["ev" + K + "Text"], v);
      log(`Night ${G.night}: ${COPY["ev" + K + "Title"]}`);
    }
    ev.text = text;   // P9: read in the popup the night it lands, and again from its HUD icon
    G.evBanner += `<p class="wyd-story wyd-event wyd-evbanner" data-ev="${k}"><span class="wyd-evicon" aria-hidden="true">${E.icon}</span> <strong>${COPY["ev" + K + "Title"]}</strong> ${text}</p>`;
  });
  G.mods = activeMods(G);
}
const longGroomCost = G=> mods(G).longCost !== null ? mods(G).longCost : ((G.event && G.event.type==="coldsnap") ? BAT.coldsnapLongCost : BAT.groomLong.cost);
/* deaf: half the time the bat you reach for at dawn is somebody else present */
function maybeDeaf(G, p){
  G.deafNote = "";
  if(!(mods(G).deaf > 0) || roll() >= mods(G).deaf) return p;
  const others = presentBats(G).filter(q=> q.id !== p.id);
  if(!others.length) return p;
  const q = pickFrom(others);
  G.deafNote = fill(COPY.evDeafMiss, {want: esc(p.name), got: esc(q.name)});
  return q;
}

/* ── P6a achievements: per browser (localStorage), unlocked at the moment they happen; the run
   keeps the keys it earned (G.achNew) for the end card; the list under the board re-renders ── */
const ACH_LS = "wyd-ach-bat";
function achLoad(){ try{ return JSON.parse(localStorage.getItem(ACH_LS) || "{}") || {}; }catch(e){ return {}; } }
function unlock(key){
  if(!G || !ACHIEVEMENTS.some(a=> a.key === key)) return false;
  const have = achLoad();
  if(!G.achNew) G.achNew = [];
  if(have[key]){ return false; }
  have[key] = new Date().toISOString().slice(0, 10);
  try{ localStorage.setItem(ACH_LS, JSON.stringify(have)); }catch(e){}
  if(!G.achNew.includes(key)) G.achNew.push(key);
  const a = ACHIEVEMENTS.find(x=> x.key === key);
  log(`Achievement unlocked: ${a.label}.`, "good");
  sfx("great");
  renderAchList();
  return true;
}
function renderAchList(){
  const host = $("#wyd-ach-list"); if(!host) return;
  const have = achLoad(), n = Object.keys(have).filter(k=> ACHIEVEMENTS.some(a=> a.key === k)).length;
  const head = $("#wyd-ach-count"); if(head) head.textContent = `${n} of ${ACHIEVEMENTS.length}`;
  host.innerHTML = ACHIEVEMENTS.map(a=>{
    const got = !!have[a.key];
    const hidden = a.secret && !got;
    return `<li class="wyd-ach${got ? " got" : ""}${a.secret ? " secret" : ""}" data-key="${a.key}">
      <span class="wyd-achmark" aria-hidden="true">${got ? "✓" : a.secret ? "?" : "·"}</span>
      <span class="wyd-achtext"><strong>${hidden ? "A secret achievement" : esc(a.label)}</strong>
      <span>${hidden ? "Found by playing. Nobody will tell you how." : esc(a.desc)}${got ? ` · ${have[a.key]}` : ""}</span></span>
    </li>`;
  }).join("");
}

const drawSkill = (base, spread, lo, hi)=> Math.min(hi, Math.max(lo,
  base * Math.pow(2, (roll() - 0.5) * spread)));
const reduceMotion = ()=> matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (x, lo, hi)=> Math.max(lo, Math.min(hi, x));
/* COPY placeholders: fill("{n} dark hours", {n:2}) */
const fill = (s, v)=> String(s).replace(/\{(\w+)\}/g, (m, k)=> (v && k in v) ? v[k] : m);
/* numbers as the player reads them: 1 → "1", 1.5 → "1.5", 0.75 → "0.75" */
const fmtN = n=> String(+Number(n).toFixed(2));
/* a signed bite term in whole percent: -0.05 → "-5%", 0.18 → "+18%" */
const fmtTerm = v=> (v < 0 ? "-" : "+") + Math.round(Math.abs(v)*100) + "%";
const shuffle = a=>{ for(let i=a.length-1; i>0; i--){ const j = Math.floor(roll()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = s=> String(s).charAt(0).toUpperCase() + String(s).slice(1);

/* ── engine: timers, the beat token, go, pick, renderScene ── */
const DEBUG_SCENES = /[?&]debug=scenes(?:&|$)/.test(location.search);
const DEBUG_CITES  = /[?&]debug=cites(?:&|$)/.test(location.search);
const TIMERS = {t:new Set(), i:new Set(), r:new Set()};
/* at(): one-shot timers that PAUSE while the tab is hidden (a flight must not land unseen).
   Each entry is {fn, due, left, h}: hidden = clearTimeout + remember what is left, visible =
   re-arm. cancelTimers drops armed and dormant entries alike. */
const armAt = e=>{ e.h = setTimeout(()=>{ TIMERS.t.delete(e); e.fn(); }, Math.max(0, e.due - Date.now())); };
const at = (ms, fn)=>{ const e = {fn, due:Date.now()+ms, left:ms, h:0}; TIMERS.t.add(e); if(!document.hidden) armAt(e); return e; };
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden) TIMERS.t.forEach(e=>{ if(e.h){ clearTimeout(e.h); e.h = 0; } e.left = Math.max(0, e.due - Date.now()); });
  else TIMERS.t.forEach(e=>{ if(!e.h){ e.due = Date.now() + e.left; armAt(e); } });
});
const every = (ms, fn)=>{ const h = setInterval(fn, ms); TIMERS.i.add(h); return h; };
const stopEvery = h=>{ clearInterval(h); TIMERS.i.delete(h); };
const raf = fn=>{ const h = requestAnimationFrame(()=>{ TIMERS.r.delete(h); fn(); }); TIMERS.r.add(h); return h; };
/* the beat token: every stage choreography is an async chain that re-checks live(token) after
   each await; cancelTimers (every go(), Skip, Exit, tap-to-skip) bumps the token so an old
   chain stops at its next await even though the stage itself survives the scene change */
let BEAT = 0;
const beatToken = ()=> ++BEAT;
const live = b=> b === BEAT && STAGE && !STAGE.dead;
/* the encounter's tap-to-skip listeners live here so that leaving the scene early (Exit, a
   Skip, any go()) detaches them: a stale skip() must never cancel a newer scene's chain */
let ENC_SKIP = null;
function detachEncSkip(){
  if(!ENC_SKIP) return;
  if(ENC_SKIP.host) ENC_SKIP.host.removeEventListener("click", ENC_SKIP.fn);
  if(ENC_SKIP.sc) ENC_SKIP.sc.removeEventListener("click", ENC_SKIP.fn);
  ENC_SKIP = null;
}
function cancelTimers(){
  detachEncSkip();
  TIMERS.t.forEach(e=> clearTimeout(e.h)); TIMERS.i.forEach(clearInterval); TIMERS.r.forEach(cancelAnimationFrame);
  TIMERS.t.clear(); TIMERS.i.clear(); TIMERS.r.clear();
  BEAT++;
}
/* ── the stage host (P3b): one div before #wyd-scene, hidden unless a scene mounts a stage.
   P4: ONE instance lives across flightOut → pasture → encounter → bite → flightHome (scenes
   flagged stage:true); STAGE_KEY names the night + pasture it was dealt for, STAGE_AT where
   the player bat is (null after a mount, "hover" over the herd, or a cow id beside it). ── */
let STAGE = null, STAGE_KEY = "", STAGE_AT = null;
function stageHost(){
  let h = $("#wyd-stagehost");
  if(!h){
    const sc = $("#wyd-scene"); if(!sc) return null;
    h = document.createElement("div"); h.id = "wyd-stagehost"; h.hidden = true;
    sc.parentNode.insertBefore(h, sc);
  }
  return h;
}
function stageOn(opts){
  stageOff();
  const h = stageHost();
  if(!h || !window.WydStage) return null;
  h.hidden = false;
  delete h.dataset.beat; delete h.dataset.outcome;
  STAGE = WydStage.mount(h, opts);
  return STAGE;
}
function stageOff(){
  if(STAGE){ STAGE.destroy(); STAGE = null; }
  STAGE_KEY = ""; STAGE_AT = null;
  const h = $("#wyd-stagehost");
  if(h){ h.hidden = true; delete h.dataset.beat; delete h.dataset.outcome; }
}
stageHost();
/* the night's stage: reuse the live instance when it was dealt for this night and pasture,
   else mount a fresh one from G.run.board (a resume, or the first stage scene of the night).
   opts.look / opts.phase apply to a fresh mount only. */
function ensureStage(G, opts){
  const R = G.run;
  if(!R || !R.board || !R.board.length || !G.cond) return null;
  const key = G.night + ":" + R.pasture + ":" + G.myRoost;
  if(STAGE && !STAGE.dead && STAGE_KEY === key) return STAGE;
  const roost = G.roosts && G.roosts[G.myRoost] ? ROOST_TYPES[G.roosts[G.myRoost].type].sil : "snag";
  const st = stageOn({moon:G.cond.moon, storm:G.cond.stormy, far:R.far, roost,
    phase:(opts && opts.phase) || "night", look:(opts && opts.look) || "herd",
    cows: R.board.map(c=>({id:c.id, tier:c.tier, occupied:c.occupied, occupant: c.occupant ? c.occupant.kind : null})),
    slots: R.slots && R.slots.length === R.board.length ? R.slots : dealSlots(R.board.length)});
  STAGE_KEY = st ? key : ""; STAGE_AT = null;
  return st;
}
/* P29: a promise-shaped wait that goes through the timer registry, so a scene change cancels it
   and the beat token sees the change. bat-game had no sleep of its own; the stage's is private. */
const waitMs = ms=> new Promise(r=> at(ms, r));
const beat = (name, outcome)=>{ const h = $("#wyd-stagehost"); if(!h) return; h.dataset.beat = name; if(outcome) h.dataset.outcome = outcome; };
/* where the player hovers over the herd between beats */
function herdHover(st){
  const xs = Object.values(st.cows).map(c=> c.x);
  return {x: Math.round((Math.min.apply(null, xs) + Math.max.apply(null, xs))/2), y: 212};
}
const E = ()=> WydStage.EASE;

function go(id){
  cancelTimers();
  if(!SCENES[id].stage) stageOff();
  G.scene = id;
  if(window.WydLog) WydLog.scene(id, G);          // night summary at dawn / death, then flush
  // P8 sound cues for the scenes that resolve a night
  if(id === "night") sfx(G.run && G.run.fedTonight ? "good" : "bad");
  else if(id === "rescue") sfx("good");
  else if(id === "death") sfx("hurt");
  else if(id === "dawn" && G.run && G.run.hazard && (G.run.hazard.hurt || G.run.hazard.sick)) sfx(G.run.hazard.hurt ? "hurt" : "bad");
  const auto = SCENES[id].auto && SCENES[id].auto(G);
  if(auto){ pick(auto); return; }      // pass-through scene (never rendered, never saved)
  if(SCENES[id].next.length) wydSaveRun(G);   // terminal scenes (end) are never worth resuming
  renderScene(id);
}
function pick(choice){
  sfx("click");
  const from = G.scene;
  if(window.WydLog) WydLog.pick(from, choice, G);   // play-style log (bat-log.js), never throws
  if(choice.apply) choice.apply(G);
  const to = typeof choice.goto === "function" ? choice.goto(G) : choice.goto;
  if(DEBUG_SCENES && SCENES[from] && !SCENES[from].next.includes(to))
    console.warn(`[scenes] ${from} → ${to} is not a declared edge (choice ${choice.id || "?"})`);
  go(to);
}
/* render one scene: pure render(G) → core scene(html, mode) → wire choices + hooks → wipe.
   Same-scene re-renders (the dawn panel, the intel panel) pass {wipe:false}. */
let LAST_MOMENT = "";
function renderScene(id, opts){
  const sc = SCENES[id];
  const html = sc.render(G);
  if(html === null) return;               // terminal scene handed off to wydEnd
  const moment = id + ":" + G.night;      // P9: a new scene (or night) closes stale popups; a re-render keeps them
  if(moment !== LAST_MOMENT){ LAST_MOMENT = moment; clearPopups(); }
  scene(html, sc.mode);
  const el = $("#wyd-scene");
  (sc.choices ? sc.choices(G) : []).forEach(c=>{
    const b = el.querySelector(c.sel || ("#"+c.id));
    if(b) b.onclick = ()=>pick(c);
  });
  if(sc.wire) sc.wire(G);
  wireSkillSrc(G);                        // P29: the animal's bite bar opens the breakdown
  if(sc.pops) sc.pops(G);                 // P9: the moment's popups (once each, G.pops remembers)
  if(!opts || opts.wipe !== false){
    el.classList.remove("wyd-wipe"); void el.offsetWidth; el.classList.add("wyd-wipe");
  }
}

/* ── P9 popups: one modal (#wyd-modal, built once), a queue, OK / Escape / backdrop to close ── */
let POPQ = [], POP_OPEN = false;
function popupHost(){
  let m = document.getElementById("wyd-modal");
  if(m) return m;
  m = document.createElement("div");
  m.id = "wyd-modal"; m.className = "wyd-modal"; m.hidden = true;
  m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "wyd-modal-title");
  m.innerHTML = `<div class="wyd-modal__card"><button type="button" class="wyd-modal__x" id="wyd-modal-x" aria-label="${esc(COPY.popClose)}">✕</button><p class="wyd-modal__kicker" id="wyd-modal-kicker"></p><h3 id="wyd-modal-title"></h3>
    <div class="wyd-modal__body" id="wyd-modal-body"></div>
    <div class="wyd-choices"><button type="button" class="btnx btnx--solid" id="wyd-ok">${COPY.popOk}</button></div></div>`;
  (document.getElementById("wyd-play") || document.body).appendChild(m);
  m.addEventListener("click", e=>{ if(e.target === m) closePopup(); });
  m.querySelector("#wyd-ok").addEventListener("click", e=>{ e.stopPropagation(); closePopup(); });
  m.querySelector("#wyd-modal-x").addEventListener("click", e=>{ e.stopPropagation(); closePopup(); });
  m.addEventListener("keydown", e=>{ if(e.key === "Escape"){ e.preventDefault(); closePopup(); } });
  return m;
}
function popup(spec){ POPQ.push(spec); if(!POP_OPEN) nextPopup(); }
function nextPopup(){
  const spec = POPQ.shift();
  if(!spec){ POP_OPEN = false; return; }
  POP_OPEN = true;
  const m = popupHost();
  m.dataset.kind = spec.kind || "";
  m.querySelector("#wyd-modal-kicker").innerHTML = spec.kicker || "";
  const t = m.querySelector("#wyd-modal-title"); t.innerHTML = spec.title || ""; t.hidden = !spec.title;
  m.querySelector("#wyd-modal-body").innerHTML = spec.body || "";
  m.hidden = false;
  if(spec.sound) sfx(spec.sound);
  const ok = m.querySelector("#wyd-ok");
  try{ ok.focus({preventScroll:true}); }catch(e){ try{ ok.focus(); }catch(e2){} }
}
function closePopup(){
  const m = document.getElementById("wyd-modal");
  if(m) m.hidden = true;
  POP_OPEN = false;
  if(POPQ.length) nextPopup();
}
function clearPopups(){ POPQ = []; closePopup(); }
const stripTags = s=> String(s).replace(/<[^>]+>/g, "");
const evCard = (icon, title, text, compact)=> `<div class="wyd-evcard${compact ? " wyd-evcard--row" : ""}"><span class="wyd-evcard__icon" aria-hidden="true">${icon}</span><div>${title ? `<h4>${title}</h4>` : ""}<p>${text}</p></div></div>`;
const cuesList = G=> G.season && G.season.cues && G.season.cues.length ? `<ul class="wyd-cues">${G.season.cues.map(c=> `<li>${esc(c)}</li>`).join("")}</ul>` : "";
/* the first dusk: the two years and the season's cues in one briefing */
function briefingPopup(G){
  // P10b: one compact row per year (icon, title, one sentence), then the four season bars with a sentence each
  const cards = (G.years || []).map(k=>{ const c = yearCard(k); return evCard(c.icon, c.title, c.text, true); }).join("");
  // P10c (Bryson): the season (sickness, how tight blood is, attention, roost shuffling) is drawn per game but
  // NEVER shown: no bars, no cues. Players read it from what happens. seasonHud / seasonPopup stay for ?debug use.
  popup({kind:"brief", kicker: COPY.yrKicker, title: COPY.yrHead, sound:"event",
    body: `<p class="wyd-story">${COPY.yrLead}</p>` + cards});
}
function yearPopup(k){ const c = yearCard(k);
  popup({kind:"year", kicker: COPY.yrHudHead, title: c.title,
         body: `${evCard(c.icon, "", c.text, true)}<p class="wyd-story wyd-modal__note">${COPY.yrAgain}</p>`}); }
function seasonPopup(G){ popup({kind:"season", kicker: COPY.seasonHead, title: "", body: seasonBarsHtml(G)}); }
/* a surprise the night it lands (sound), or again from its icon (silent) */
function eventPopup(G, ev, again){
  const E = EVENTS[ev.key], K = cap(ev.key), h = eventHud(ev);
  if(!ev.fired || !ev.text){ popup({kind:"event", kicker: fill(COPY.evHeader, {night: ev.night}), title: h.title, body: `<p class="wyd-story">${esc(h.sub)}</p>`}); return; }
  popup({kind:"event", kicker: again ? fill(COPY.evHeader, {night: ev.night}) : fill(COPY.evPopKicker, {night: ev.night}), title: COPY["ev" + K + "Title"], sound: again ? null : "event",
         body: `${evCard(E.icon, "", ev.text)}${again ? "" : `<p class="wyd-story wyd-modal__note">${COPY.evPopIcons}</p>`}`});
}
function hiddenEventPopup(){ popup({kind:"event", kicker: COPY.evHiddenHead, title: COPY.evHiddenTitle, body: `<p class="wyd-story">${COPY.evHiddenSub}</p>`}); }
/* the dawn hazards (the sound already played on entering the dawn) */
function hazardLines(G, hz){
  const K = BAT.roosts, s = n=> n === 1 ? "" : "s", lines = [];
  if(hz.sick && hz.from) lines.push(fill(COPY.caughtFrom, {name: hz.from, n: wordN(K.sickNights)}));
  else if(hz.sick) lines.push(fill(COPY.sickDawn, {n: wordN(K.sickNights)}));
  if(hz.hurt) lines.push(fill(COPY.hurtDawn, {blood: "-" + bp(K.injuryBlood), n: wordN(K.injuryNights)}));
  return lines;
}
function hazardPopup(G, hz){
  const lines = hazardLines(G, hz);
  if(!lines.length) return;
  popup({kind:"hazard", kicker: COPY.hzKicker, title: hz.sick && hz.hurt ? COPY.hzHeadBoth : hz.sick ? COPY.hzHeadSick : COPY.hzHeadHurt,
         body: `<p class="wyd-story wyd-hazard">${lines.map(esc).join(" ")}</p>`});
}
const DE_ICON = {squabble:"💢", pup:"🐣", stranger:"🦇", coldsnap:"❄"};
function dawnEventPopup(G, again){
  if(!G.event) return;
  popup({kind:"dawnev", kicker: COPY.deKicker, title: "", sound: again ? null : "event", body: evCard(DE_ICON[G.event.type] || "✨", "", G.event.text)});
}
/* P14 (Bryson): on phones the corner collapses to one ⋯ button that opens this menu */
function menuPopup(){
  const on = window.WydSound && WydSound.isOn();
  popup({kind:"menu", kicker: COPY.menuKicker, title: "", body: `<div class="wyd-choices wyd-menu">
    <button type="button" class="btnx" id="wyd-m-log">📜 ${LOG_OPEN ? COPY.menuLogHide : COPY.menuLogShow}</button>
    <button type="button" class="btnx" id="wyd-m-sound">${on ? "🔊" : "🔇"} ${on ? COPY.menuSoundOff : COPY.menuSoundOn}</button>
    <button type="button" class="btnx" id="wyd-m-help">❔ ${COPY.menuHelp}</button>
    <button type="button" class="btnx" id="wyd-m-exit">✕ ${COPY.menuExit}</button></div>`});
  const m = document.getElementById("wyd-modal"); if(!m) return;
  const q = id=> m.querySelector(id);
  if(q("#wyd-m-log")) q("#wyd-m-log").onclick = ()=>{ LOG_OPEN = !LOG_OPEN; applyLogOpen(); const b = document.getElementById("wyd-logtoggle"); if(b) b.setAttribute("aria-pressed", LOG_OPEN ? "true" : "false"); closePopup(); };
  if(q("#wyd-m-sound")) q("#wyd-m-sound").onclick = ()=>{ if(window.WydSound){ WydSound.toggle(); const b = document.getElementById("wyd-sound"); if(b){ b.textContent = WydSound.isOn() ? "🔊" : "🔇"; b.setAttribute("aria-pressed", WydSound.isOn() ? "true" : "false"); } } closePopup(); };
  if(q("#wyd-m-help")) q("#wyd-m-help").onclick = ()=>{ closePopup(); helpPopup(G && G.scene === "dawn" ? "dawn" : "night"); };
  if(q("#wyd-m-exit")) q("#wyd-m-exit").onclick = ()=>{ closePopup(); const ex = document.getElementById("wyd-exit"); if(ex) ex.click(); };
}
/* help: the old panel explanation (dawn) and a night primer; shown once per browser at the first dawn, always from the ❔ */
const HELP_LS = "wyd-help-";
const helpSeen = k=>{ try{ return localStorage.getItem(HELP_LS + k) === "1"; }catch(e){ return true; } };
const markHelp = k=>{ try{ localStorage.setItem(HELP_LS + k, "1"); }catch(e){} };
function helpPopup(kind){
  if(kind === "dawn") popup({kind:"help", kicker: COPY.helpKicker, title: COPY.helpDawnHead, body: `<p class="wyd-story">${fill(COPY.panelPickText, {decay: BAT.decay.toFixed(2)})}</p><p class="wyd-story wyd-modal__note">${COPY.netLegend}</p>`});   // P14: the legend lives here on phones
  else popup({kind:"help", kicker: COPY.helpKicker, title: COPY.helpNightHead, body: `<p class="wyd-story">${COPY.helpNightText}</p>`});
}
const exitBtn = $("#wyd-exit");
if(exitBtn) exitBtn.addEventListener("click", ()=>{ cancelTimers(); stageOff(); if(window.WydLog && G) WydLog.exit(G); });

/* ── P5: the roosts and the colony, drawn per game (everything lands in G so a resume is exact) ── */
function genRoosts(years){
  const K = BAT.roosts, sm = yearSizeMult(years);   // P9: a quiet / crowded year scales every roost
  const count = roll() < K.countP4 ? 4 : 3;
  const types = ["hollow"].concat(shuffle(ROOST_DRAW.slice()).slice(0, count - 1));
  return types.map((type, id)=> ({
    id, type,
    size: Math.round(clamp(normal(K.sizeMean * sm, K.sizeSd), K.sizeMin, K.sizeMax * sm)),
    bondQ: roll(), disease: roll(), aggro: roll(),
    known: id === 0, visits: 0, sick:false, hurt:false, cues:null }));
}
/* a resident's trait, drawn from the roost's own deck (generosity follows bondQ) */
function drawTrait(bondQ){
  const K = BAT.roosts;
  const w = {generous: K.generousBase + K.generousSlope*bondQ, stingy: K.stingyBase + K.stingySlope*bondQ,
             wanderer: K.wandererP, frail: K.frailP};
  w.plain = Math.max(0.05, 1 - w.generous - w.stingy - w.wanderer - w.frail);
  const ks = Object.keys(w);
  return ks[weightedIndex(ks.map(k=> w[k]))];
}
function makeBat(id, name, trait, homeRoost, trust){
  const td = TRAITS[trait];
  let pf = drawSkill(BAT.adultFail, 2.0, BAT.adultLo, BAT.adultHi);
  if(td.failMult) pf = Math.min(BAT.traitFailCap, pf*td.failMult);
  if(td.failAdd)  pf = Math.min(BAT.traitFailCap, pf+td.failAdd);
  return {id, name, trait, seen:false, pFail:pf, trust,
          energy:BAT.partnerEnergy.lo + BAT.partnerEnergy.span*roll(), alive:true,
          homeRoost, tonightRoost:homeRoost, present: homeRoost === 0, visitor:false,
          fedYou:false, youSaved:false, fed:false, hungry:false, starving:false, groomed:false, shared:false,
          bitYou:0, cough:0, metAtCow:{displacedYou:0, toleratedYou:0, youDisplaced:0, nights:[]}};
}
function genColony(roosts, pool){
  const K = BAT.roosts, bats = [];
  roosts.forEach(r=>{
    for(let k=0;k<r.size;k++){
      const name = pool.shift() || ("Bat " + (bats.length+1));
      let trust;
      if(r.id === 0) trust = k < K.friends ? K.friendTrust.lo + K.friendTrust.span*roll() : K.homeTrust.lo + K.homeTrust.span*roll();
      else trust = K.otherTrust.lo + K.otherTrust.span*roll();
      bats.push(makeBat(bats.length, name, drawTrait(r.bondQ), r.id, trust));
    }
  });
  return bats;
}
function wydStart(){
  try{ if(window.WydSound) WydSound.warm(); }catch(e){}
  cancelTimers(); stageOff();
  $("#wyd-play").style.display = "block";
  $("#wyd-log").innerHTML = "";
  const pool = NAME_POOL.slice();
  const years = genYears();   // P9: the two permanent changes, drawn before the colony they shape
  const roosts = genRoosts(years);
  const partners = genColony(roosts, pool);
  G = {v:5, scene:"dusk", night:0, score:0, energy:BAT.energyStart, stamina:BAT.staminaPerNight, alive:true,
       run:null, ticks:BAT.ticks, missStreak:0, sel:null,
       cause:"", selected:null, lastAct:"", fx:null, cond:null,
       moonOff: roll()*BAT.nights, pFail: drawSkill(BAT.playerFail, 1.5, BAT.playerLo, BAT.playerHi),
       hygiene:BAT.hygieneStart, parasites:false, successes:0, event:null, lastEvent:"", deaths:[], deathsAll:[],
       ledger:{don:0, saves:0, rescued:0, grooms:0, cofeeds:0, dispWins:0, dispTries:0, roostsSlept:1, nightsAway:0, sickDawns:0, hurtDawns:0, friendFed:0},
       strangerPool: pool,               // what is left of NAME_POOL: newcomers who claim a dead hollow slot
       roosts, myRoost:0, roostSel:0, sick:0, hurt:0, sickOver:false, hurtOver:false,
       season: genSeason(years), pendingSick:null, contacts:[], achNew:[], stormFedN:0,
       events: genEvents(), years, pops:{}, mods:null, evBanner:"", deafNote:"",
       rivals: Object.keys(RIVALS).reduce((a,k)=>{ a[k] = {met:false, lastOutcome:null, night:0}; return a; }, {}),
       partners};
  const n = G.partners.length, K = BAT.roosts;
  G.pp = [];
  for(let i=0;i<n;i++){ G.pp[i]=[];
    for(let j=0;j<n;j++){
      if(j<i){ G.pp[i][j] = G.pp[j][i]; continue; }
      if(i===j){ G.pp[i][j] = 0; continue; }
      const a = G.partners[i], b = G.partners[j];
      const dens = a.homeRoost === b.homeRoost ? K.ppWithinBase + K.ppWithinSlope*G.roosts[a.homeRoost].bondQ : K.ppAcross;
      G.pp[i][j] = roll() < dens ? 0.3+0.55*roll() : 0.1*roll();
    } }
  const home = roostResidents(G, 0).length;
  log(fill(COPY.startLog, {home, others: G.roosts.length - 1, n: n - home}));
  if(window.WydLog) WydLog.start(G);
  applyNewNight();
  go("dusk");
}

/* ── resume: v5 P10 saves return to their scene; anything else gets the new-season card ── */
function wydResumeRun(g){
  cancelTimers(); stageOff();
  const bad = !g || g.v !== 5 || !g.scene || !SCENES[g.scene] || !g.run || !("board" in g.run)
    || g.night > BAT.nights || !Array.isArray(g.strangerPool) || !Array.isArray(g.roosts) || !g.roosts.length
    || typeof g.myRoost !== "number" || !g.season || typeof g.season.rescueK !== "number" || !Array.isArray(g.events) || !Array.isArray(g.years);
  if(bad){
    wydClearRun();
    G = null;
    $("#wyd-play").style.display = "block";
    $("#wyd-log").innerHTML = "";
    const hud = $("#wyd-hud"); if(hud) hud.innerHTML = "";
    scene(`<h3>${COPY.newSeasonHead}</h3>
      <p class="wyd-story">${COPY.newSeasonText}</p>
      <div class="wyd-choices"><button class="btnx btnx--solid" id="wyd-newseason">${COPY.newSeasonBtn}</button></div>`, "night");
    $("#wyd-newseason").onclick = wydStart;
    return;
  }
  G = g; G.selected = null; G.lastAct = ""; G.fx = null;
  if(window.WydLog) WydLog.resume(G);
  $("#wyd-play").style.display = "block";
  $("#wyd-log").innerHTML = "";
  log(`Resumed at ${SCENES[G.scene].label(G)}.`);
  // pass-through scenes (the flights under reduced motion) resolve at once on resume too
  const auto = SCENES[G.scene].auto && SCENES[G.scene].auto(G);
  if(auto){ pick(auto); return; }
  renderScene(G.scene);
}

/* P11: the running log is hidden during play behind the status bar's Log toggle */
let LOG_OPEN = false;
function applyLogOpen(){ const l = document.getElementById("wyd-log"); if(l) l.classList.toggle("wyd-logopen", LOG_OPEN); }
const HUNT_SCENES = ["flightOut", "pasture", "encounter", "bite", "flightHome"];   // P13: the HUD shows dark hours only here
function wydHud(){
  const h = $("#wyd-hud"); if(!h || !G) return;
  /* P27 (Bryson: "make the blood and stamina in the hud just a full bar, no longer 3 segments
     since they are all points out of 100"). One bar each, filled by the fraction held. */
  const bloodFill = Math.max(0, Math.min(1, G.energy / BAT.energyCap));
  const cells = `<i><b style="transform:scaleX(${bloodFill.toFixed(3)})"></b></i>`;
  /* P26/P27: stamina is a float the bars spend in 5-point steps, so it is one bar out of 100 too. */
  const pips = `<i class="${staminaFrac(G) >= 0.999 ? "on" : ""}"><b style="transform:scaleX(${staminaFrac(G).toFixed(3)})"></b></i>`;
  const tickMax = (G.cond && G.cond.key === "storm") ? BAT.stormTicks : BAT.ticks;
  const ticks = Array.from({length:tickMax}, (_, k)=>`<i class="${k < G.ticks ? "on":""}"></i>`).join("");
  const hygPct = Math.round((G.hygiene||0)*100);
  // P13 (Bryson): no roost cell (the dawn shows who is here); dark hours only while hunting
  // P9: each chip explains itself on hover (dawns left)
  const chipTip = t=> `data-tip="${esc(t)}" title="${esc(t)}" tabindex="0"`;
  const state = (G.sick ? `<span class="wyd-ptag hot wyd-hudchip" ${chipTip(fill(COPY.tipSick, {n: G.sick, s: G.sick === 1 ? "" : "s"}))}>${COPY.hudSick}</span>` : "")
              + (G.hurt ? `<span class="wyd-ptag hot wyd-hudchip" ${chipTip(fill(COPY.tipHurt, {n: G.hurt, s: G.hurt === 1 ? "" : "s"}))}>${COPY.hudHurt}</span>` : "");
  // P6d (Bryson): every stat carries a one-line explanation on hover / focus (data-tip + title)
  const T = {night: fill(COPY.tipNight, {rich: bp(BAT.richBonus)}), blood: fill(COPY.tipBlood, {cap: BLOOD_MAX, burn: bp(BAT.burn)}), ticks:COPY.tipTicks, stamina:COPY.tipStamina,
    groomed: fill(COPY.tipGroomed, {thr: Math.round(BAT.infestBelow*100), drain: bp(BAT.parasiteDrain)}), mites:COPY.tipMites, roost:COPY.tipRoost, score:COPY.tipScore, state:COPY.tipState, sound:COPY.tipSound};
  const tip = (k, extra)=> `data-tip="${esc(T[k] + (extra || ""))}" title="${esc(T[k] + (extra || ""))}" tabindex="0"`;
  h.innerHTML = `<div class="wyd-ghud">
    <div class="gstat wyd-c-night" ${tip("night")}><span class="gl">${fill(onPhone() ? COPY.hudNightShort : COPY.hudNight, {cond: (G.cond ? G.cond.icon + " " + condTag(G) : "")})}</span><span class="gv">${G.night}<span class="wyd-of">/${BAT.nights}</span></span></div>
    <div class="gstat wyd-c-blood" data-pts="${bp(G.energy)}" ${tip("blood")}><span class="gl">${fill(COPY.hudBlood, {n: bp(G.energy)})}${onPhone() ? "" : `<span class="wyd-of">/${BLOOD_MAX}</span>`}</span><div class="wyd-bloodbar wyd-bar1">${cells}</div></div>
    <div class="gstat wyd-c-stam" data-pct="${pctI(staminaFrac(G))}" ${tip("stamina")}><span class="gl">${fill(COPY.hudStamina, {n: pctI(staminaFrac(G))})}${onPhone() ? "" : `<span class="wyd-of">/${BLOOD_MAX}</span>`}</span><div class="wyd-pips wyd-stam wyd-bar1">${pips}</div></div>
    <div class="gstat wyd-c-mite" ${tip(G.parasites ? "mites" : "groomed")}><span class="gl">${G.parasites ? COPY.hudMites : fill(COPY.hudMiteRisk, {n: 100 - hygPct})}</span><div class="wyd-bloodbar wyd-hyg${G.parasites ? " bad" : (G.hygiene < BAT.infestBelow ? " warn" : "")}"><i><b style="transform:scaleX(${G.parasites ? 1 : (1 - (G.hygiene||0)).toFixed(2)})"></b></i></div><span class="wyd-substat">${G.parasites ? fill(COPY.hudMitesSub, {drain: bp(BAT.parasiteDrain)}) : fill(COPY.hudMiteSub, {thr: Math.round(BAT.infestBelow*100), drain: bp(BAT.parasiteDrain)})}</span></div>
    ${skillHud(G)}
    ${state ? `<div class="gstat wyd-hudstate" ${tip("state")}>${state}</div>` : ""}
    ${eventsHud(G)}
    <div class="gstat wyd-scorecell" ${tip("score")}><span class="gl">${COPY.hudScore}</span><span class="gv">${Math.round(G.score)}</span></div>
    <div class="gstat wyd-ctrlcell"><span class="gl">${COPY.hudControls}</span><button type="button" class="wyd-soundbtn wyd-menubtn" id="wyd-menu" aria-label="${esc(COPY.tipMenu)}" title="${esc(COPY.tipMenu)}">⋯</button><div class="wyd-hudbtns">
      <button type="button" class="wyd-soundbtn wyd-logbtn" id="wyd-logtoggle" aria-pressed="${LOG_OPEN ? "true" : "false"}" aria-label="${esc(COPY.tipLog)}" data-tip="${esc(COPY.tipLog)}" title="${esc(COPY.tipLog)}">📜</button>
      <button type="button" class="wyd-soundbtn" id="wyd-sound" aria-pressed="${window.WydSound && WydSound.isOn() ? "true" : "false"}" aria-label="${esc(COPY.tipSound)}" data-tip="${esc(COPY.tipSound)}" title="${esc(COPY.tipSound)}">${window.WydSound && WydSound.isOn() ? "🔊" : "🔇"}</button>
      <button type="button" class="wyd-soundbtn wyd-helpbtn" id="wyd-help" aria-label="${esc(COPY.tipHelp)}" data-tip="${esc(COPY.tipHelp)}" title="${esc(COPY.tipHelp)}">❔</button>
      <button type="button" class="wyd-soundbtn wyd-exitbtn" id="wyd-hudexit" aria-label="${esc(COPY.tipExit)}" data-tip="${esc(COPY.tipExit)}" title="${esc(COPY.tipExit)}">✕</button>
    </div></div>
  </div><div class="wyd-hudtip${restOn(G) ? " on wyd-hudtip--rest" : ""}" id="wyd-hudtip" aria-live="polite">${restOn(G) ? COPY.hudTipPrompt : ""}</div>`;
  wireHudTips(h);
  h.querySelectorAll("[title]").forEach(el=> el.removeAttribute("title"));   // P15 (Bryson): the strip under the HUD is the one explanation; no second native tooltip
  const lg = h.querySelector("#wyd-logtoggle");
  if(lg) lg.onclick = e=>{ e.stopPropagation(); sfx("click"); LOG_OPEN = !LOG_OPEN; applyLogOpen(); lg.setAttribute("aria-pressed", LOG_OPEN ? "true" : "false"); };
  const xb = h.querySelector("#wyd-hudexit");
  if(xb) xb.onclick = e=>{ e.stopPropagation(); sfx("click"); const ex = document.getElementById("wyd-exit"); if(ex) ex.click(); };
  applyLogOpen();
  const sb = h.querySelector("#wyd-sound");
  if(sb) sb.onclick = e=>{ e.stopPropagation(); if(!window.WydSound) return; const now = WydSound.toggle(); sb.textContent = now ? "🔊" : "🔇"; sb.setAttribute("aria-pressed", now ? "true" : "false"); };
  const hb = h.querySelector("#wyd-help");
  if(hb) hb.onclick = e=>{ e.stopPropagation(); sfx("click"); helpPopup(G.scene === "dawn" ? "dawn" : "night"); };
  const mb = h.querySelector("#wyd-menu");
  if(mb) mb.onclick = e=>{ e.stopPropagation(); sfx("click"); menuPopup(); };
  // P10: the season meters and the Skill bar open their popups the same way
  h.querySelectorAll(".wyd-seasoncell, .wyd-skillcell").forEach(el=>{
    const open = ()=>{ sfx("click"); if(el.classList.contains("wyd-skillcell")) skillPopup(G); else seasonPopup(G); };
    el.addEventListener("click", e=>{ e.stopPropagation(); open(); });
    el.addEventListener("keydown", e=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
  });
  // P9: every icon in the year / events cell reopens its popup on tap or Enter
  h.querySelectorAll(".wyd-ev[role=button]").forEach(el=>{
    const open = ()=>{
      sfx("click");
      if(el.dataset.year) yearPopup(el.dataset.year);
      else if(el.dataset.season) seasonPopup(G);
      else if(el.dataset.dawn) dawnEventPopup(G, true);
      else if(el.dataset.ev){ const ev = (G.events || []).find(x=> x.key === el.dataset.ev && String(x.night) === el.dataset.night); if(ev) eventPopup(G, ev, true); }
      else hiddenEventPopup();
    };
    el.addEventListener("click", e=>{ e.stopPropagation(); open(); });
    el.addEventListener("keydown", e=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
  });
}
/* the explanation strip under the HUD: hovering or focusing a stat writes its data-tip there (one
   strip, never clipped at the edge of a phone); wired once per HUD element */
function wireHudTips(h){
  if(h.dataset.tips) return;
  h.dataset.tips = "1";
  /* P25 (the first five minutes: six unexplained quantities, with the explanations behind a hover
     a phone cannot do): the strip rests on a prompt that says the bars can be asked, and a TAP on
     any stat writes its line there. */
  const rest = ()=>{ const t = h.querySelector("#wyd-hudtip"); if(!t) return;
    if(restOn(G)){ t.textContent = COPY.hudTipPrompt; t.classList.add("on", "wyd-hudtip--rest"); }
    else { t.textContent = ""; t.classList.remove("on", "wyd-hudtip--rest"); } };
  const show = e=>{ const g = e.target.closest && e.target.closest("[data-tip]"); const t = h.querySelector("#wyd-hudtip"); if(!t) return; if(g){ t.textContent = g.dataset.tip; t.classList.add("on"); t.classList.remove("wyd-hudtip--rest"); } };
  const hide = e=>{ const t = h.querySelector("#wyd-hudtip"); if(!t) return; const to = e.relatedTarget; if(to && h.contains(to) && to.closest && to.closest("[data-tip]")) return; rest(); };
  h.addEventListener("mouseover", show); h.addEventListener("focusin", show);
  h.addEventListener("click", show);
  h.addEventListener("mouseleave", hide); h.addEventListener("focusout", hide);
}
/* HUD tips live in bat-copy.js (COPY.tip*) */
/* P7: the season events as icons in line with the other stats (Bryson: icon only, details on
   hover); the hover / tap strip says the night, the title and the drawn amount. Surprises show
   as "?" until they land. */
function eventsHud(G){
  const icons = [];
  // P9: the two years first (permanent), then the season scroll, a hairline, then the surprises and tonight's dawn event
  (G.years || []).forEach(k=>{
    const c = yearCard(k), tipText = `${COPY.yrHudHead} · ${c.title} · ${c.sub}`;
    icons.push(`<span class="wyd-ev year" role="button" aria-label="${esc(tipText)}" data-year="${k}" data-ev="" data-night="" data-state="year" data-tip="${esc(tipText)}" title="${esc(tipText)}" tabindex="0">${c.icon}</span>`);
  });
  if(icons.length && ((G.events && G.events.length) || (G.event && G.scene === "dawn"))) icons.push(`<i class="wyd-evsep" aria-hidden="true"></i>`);
  (G.events || []).forEach(ev=>{
    const now = ev.night === G.night;
    const secret = ev.hidden && !ev.fired && !now;
    const h = secret ? {icon:"❔", title: COPY.evHiddenTitle, sub: COPY.evHiddenSub} : eventHud(ev);
    const state = secret ? "hidden" : now ? "now" : ev.fired ? (ev.left > 0 ? "active" : "done") : "ahead";
    const head = secret ? COPY.evHiddenHead : now ? COPY.evNow : ev.fired ? (ev.left > 0 ? fill(COPY.evLeft, {n: ev.left, s: ev.left === 1 ? "" : "s"}) : COPY.evDone) : fill(COPY.evHeader, {night: ev.night});
    const tipText = `${head} · ${h.title} · ${h.sub}`;
    icons.push(`<span class="wyd-ev ${state === "hidden" ? "secret" : state}" role="button" aria-label="${esc(tipText)}" data-ev="${secret ? "" : ev.key}" data-night="${secret ? "" : ev.night}" data-state="${state}" data-tip="${esc(tipText)}" title="${esc(tipText)}" tabindex="0">${h.icon}</span>`);
  });
  if(G.event && G.scene === "dawn"){   // this dawn's roost event (squabble, pup, a newcomer): an icon for today only
    const t = stripTags(G.event.text);
    icons.push(`<span class="wyd-ev now dawnev" role="button" aria-label="${esc(t)}" data-dawn="1" data-ev="" data-night="${G.night}" data-state="dawn" data-tip="${esc(t)}" title="${esc(t)}" tabindex="0">${DE_ICON[G.event.type] || "✨"}</span>`);
  }
  if(!icons.length) return "";
  return `<div class="gstat wyd-evcell" data-tip="${esc(COPY.evHudTip)}" title="${esc(COPY.evHudTip)}"><span class="gl">${COPY.hudEvents}</span><div class="wyd-events" aria-label="This year and its events">${icons.join("")}</div></div>`;
}
/* P10 (Bryson): the season is four labelled bars in the HUD, not only the scroll icon: how much
   sickness is going round, how tight blood is, how many friendships you can look after, and how
   much the colony shuffles between roosts. Tapping the cell opens the season popup. */
function seasonHud(G){
  const se = G.season; if(!se) return "";
  const S = BAT.season;
  const norm = (x, lo, hi)=> clamp((x - lo) / (hi - lo), 0, 1);
  // P10b: the same four rows as the briefing; hover = the row's one-sentence cue
  const bars = seasonRows(G).map(r=>
    `<div class="wyd-sbar" data-meter="${r.key}" data-v="${r.v.toFixed(3)}" data-tip="${esc(r.text)}" title="${esc(r.text)}" tabindex="0">`
    + `<span class="gl">${r.label}</span>${riskBarHtml(r.v)}</div>`).join("");
  return `<div class="gstat wyd-seasoncell" role="button" tabindex="0" data-season="1" aria-label="${esc(COPY.seasonHead)}" data-tip="${esc(COPY.tipSeason)}" title="${esc(COPY.tipSeason)}"><span class="gl">${COPY.hudSeason}</span><div class="wyd-smeters">${bars}</div></div>`;
}
/* P10 addendum A (Bryson: "the skill and stuff while feeding should not be visible there"): the
   bite odds left the pasture panel. They live on the picked animal's floating bars and here, as
   your Skill: a bar of how often you land a bite tonight, the terms in the strip, the full
   itemised list (and its sources) in the popup. */
function hudBiteTerms(G){
  return biteTerms(G, hudCow(G) || {tier:"steer"}, !!(hudCow(G) && hudCow(G).occupied));
}
/* P25 finding 1: "SKILL 66%" read as a persistent ability. It is the bite against the animal you
   have picked, with a plain steer as the stand-in when you have picked none, so the cell says so. */
const hudCow = G=>{ const R = G.run; return (R && R.board && R.board.length && G.sel !== null) ? R.board.find(c=> c.id === G.sel) : null; };
const hudWho = G=>{ const c = hudCow(G); return c ? fill(COPY.skillWho, {tier: COW_TABLE[c.tier].label.toLowerCase()}) : COPY.skillNoPick; };
const skillTipOf = G=> hudBiteTerms(G).map(t=> t.key === "skill"
  ? fill(COPY.skillOwn, {p: Math.round((1 - t.v)*100)}) : `${t.label} ${fmtTerm(-t.v)}`).join(", ");
function skillHud(G){
  if(!G.run || !G.cond) return "";
  const terms = hudBiteTerms(G);
  const pFail = clamp(terms.reduce((a, t)=> a + t.v, 0), 0.02, 0.95);
  const skill = 1 - pFail;
  const cells = `<i><b style="transform:scaleX(${skill.toFixed(2)})"></b></i>`;   // P13 (Bryson): one bar, its own colour
  const who = hudWho(G);
  const tipText = fill(COPY.tipSkill, {who}) + (hudCow(G) ? "" : " " + COPY.skillNoPickTip) + " " + skillTipOf(G);
  const data = esc(JSON.stringify(terms.map(t=> ({key: t.key, v: +t.v.toFixed(4)}))));
  return `<div class="wyd-skillcell wyd-skilldata" hidden aria-hidden="true" data-p="${pFail.toFixed(4)}" data-skill="${skill.toFixed(4)}" data-who="${esc(who)}" data-terms="${data}" data-tip="${esc(tipText)}"></div>`;
}
function skillPopup(G){
  const terms = hudBiteTerms(G);
  const pFail = clamp(terms.reduce((a, t)=> a + t.v, 0), 0.02, 0.95);
  popup({kind:"skill", kicker: COPY.skillKicker, title: fill(COPY.skillTitle, {who: hudWho(G), p: Math.round((1 - pFail)*100)}),
    body: `<p class="wyd-story">${COPY.skillIntro}</p>
      <ul class="terms">${terms.map(t=> `<li data-term="${t.key}" data-v="${t.v.toFixed(4)}">${t.label} <span class="v${t.v > 0 ? " bad" : t.v < 0 ? " good" : ""}">${fmtTerm(t.v)}</span></li>`).join("")}</ul>
      <p class="wyd-story">${fill(COPY.skillFail, {p: Math.round(pFail*100)})}</p>
      <div class="cite">${citeLine(terms)}</div>`});
}
/* P6d: the player's own bars on the stage (blood, dark hours, stamina), so the cow's bars read
   against them */
function youPanelHtml(G){
  const tickMax = (G.cond && G.cond.key === "storm") ? BAT.stormTicks : BAT.ticks;
  const bar = (n, max, cls, frac)=> `<div class="wyd-bloodbar ${cls}">${Array.from({length:max}, (_, k)=> `<i${frac ? "" : (k < n ? ' class="on"' : "")}>${frac ? `<b style="transform:scaleX(${clamp(n - k, 0, 1).toFixed(2)})"></b>` : ""}</i>`).join("")}</div>`;
  // P17 (Bryson): no corner box at all; dark hours are not something the player should watch (the pasture
  // line still says how many are left). Returning "" hides the box (bat-stage you()).
  void bar; void tickMax;
  return "";
}

/* ── conditions: moon cycle, squalls, storms, rich nights ──
   one full lunar cycle per season (compressed; the real cycle is 29.5 d): every run sees a
   comparable dose of bright nights, but at different, unpredictable times. cond.mod is the
   SUM of the moon, squall/storm and rich terms; the intel panel itemizes each (ruling 2). */
function moonMod(night){
  const b = 0.5*(1+Math.cos(2*Math.PI*((night+G.moonOff)/BAT.nights)));
  if(mods(G).moonForce === "bright") return {mod:BAT.moonBright, moon:"bright"};   // P7 bright nights
  if(b >= BAT.moonBrightAt) return {mod:BAT.moonBright, moon:"bright"};
  if(b >= BAT.moonDimAt) return {mod:BAT.moonDim, moon:"dim"};
  return {mod:0, moon:"dark"};
}
const COND_ICON = {storm:"⛈", squall:"🌧", rich:"✨", bright:"🌕", dim:"🌗", dark:"🌑"};
/* P25 finding 15: the icon beside the night changed with no label. The word goes next to it. */
const condTag = G=> (G.cond && COPY["condTag" + cap(G.cond.key)]) || "";
/* the resting "tap any bar" nudge: night 1 only, and never on the dawn, whose phone layout is
   built to a few pixels of spare height (P23/P24). */
const restOn = G=> !!G && G.night <= 1 && G.scene !== "dawn";
function rollConditions(night){
  const m = moonMod(night);
  const vars = {burnHard: bp(BAT.unfedBurnHard), burn: bp(BAT.unfedBurn), stormTicks: BAT.stormTicks, ticks: BAT.ticks};
  const cc = key=> COPY["cond" + cap(key)];
  const mk = (key, mod, stormy, rich, extra)=> ({mod, stormy, rich, moon:m.moon, icon:COND_ICON[key], key,
    head: cc(key + "Head"), text: fill(cc(key + "Text"), vars) + (extra ? " " + extra : "")});
  if(night >= BAT.stormStart)
    return mk("storm", m.mod + BAT.stormMod, true, false, night === BAT.nights ? COPY.condStormLast : COPY.condStormMore);
  if(night > BAT.rampNights && night < BAT.stormStart && roll() < BAT.squallP)
    return mk("squall", m.mod + BAT.squallMod, true, false);
  if(m.mod === 0 && roll() < BAT.richP)
    return mk("rich", BAT.richMod, false, true);
  return mk(m.moon, m.mod, false, false);
}

/* ── transition: a new night begins (v2 duskPhase's state half) ──
   night counter, conditions, the dark hours, the roost-mates' background hunts (resolved now:
   the occupant draw at the dusk commit weights partners who fed), bond decay. */
function applyNewNight(){
  G.night++;
  if(G.night >= 2) unlock("firstNight");
  if(G.night >= 5) unlock("night5");
  fireEvents(G);   // P7: tonight's season event lands (mods recomputed)
  G.cond = rollConditions(G.night);
  G.ticks = G.cond.key === "storm" ? BAT.stormTicks : BAT.ticks;
  G.sel = null;
  G.run = {pasture:null, far:false, board:[], cowIdx:null, enc:null, fedTonight:false, meal:0,
           openWound:false, scouted:false, bitten:false, rolled:false, cofed:false, displaced:false,
           waited:false, leftEarly:false, outcome:null, roost:G.myRoost, newRoost:false, hazard:null, roostPicked:false,
           dons:0, arrival:null, friendFed:""};   // P10: donations made this dawn, where the flight home led, who fed you
  // P5: where does everyone sleep tonight? Home, unless the switch roll sends her elsewhere.
  // In a storm nobody switches (every roost shelters in place). Presence is settled at the
  // dusk commit, once the player has picked a roost.
  const K = BAT.roosts, S = BAT.season, storm = G.cond.key === "storm", nR = G.roosts.length;
  const switchP = G.season ? G.season.switchP : K.switchP;
  const extra = breadthExtra(G);   // P6a: spread thin, every bond fades faster
  G.roostSel = storm || G.night === 1 ? 0 : G.myRoost;
  G.contacts = [];
  G.partners.forEach(p=>{
    if(!p.alive) return;
    p.tonightRoost = p.homeRoost;
    if(!storm && nR > 1 && roll() < switchP * (p.trait === "wanderer" ? K.switchWanderer : 1)){
      let r = Math.floor(roll()*(nR-1)); if(r >= p.homeRoost) r++;
      p.tonightRoost = r;
    }
    // P6a: a coughing resident (visible on her node; a worse contact) follows the season's contagion
    // and her roost's disease score
    if(p.cough > 0) p.cough--;
    else if(G.season && roll() < S.coughP * mods(G).coughMult * G.season.contagion * G.roosts[p.homeRoost].disease) p.cough = S.coughNights;   // P9: x the year's cough rate
    // provisional presence (the HUD at dusk): who is home at the roost you slept at; the dusk
    // commit settles it for the roost you pick
    p.present = p.tonightRoost === G.myRoost; p.visitor = p.present && p.homeRoost !== G.myRoost;
    p.trust = Math.max(BAT.trustFloor, p.trust - BAT.decay - extra);
    p.groomed = false; p.shared = false;
    const pf = Math.min(0.9, Math.max(0.01, p.pFail + G.cond.mod));
    p.fed = roll() > pf;
    const feast = (p.trait==="wanderer" && p.fed) ? TRAITS.wanderer.feast : 1.0;
    p.energy = p.fed ? Math.min(BAT.partnerCap, p.energy + feast)
                     : p.energy - (G.cond.stormy ? BAT.unfedBurnHard : BAT.unfedBurn);
    p.hungry = !p.fed;
    p.starving = p.energy <= 0;
    if(p.trait==="wanderer" && p.fed && feast>1 && !p.seen && p.present){ p.seen = true;   // P5: you only see the ones who come home to you
      log(`${p.name} comes home heavy with blood: a far-ranger.`); }
  });
}

/* ── the board (rulings 14-17): tiers, names, occupancy (ramp on nights 1-2), occupant identity ── */
const primeOcc = night=>{ const o = COW_TABLE.prime.occ; return Math.min(o.cap, o.base + o.perNight*(night-1)); };
const COW_IDS = ["a","b","c","d","e","f"];
/* P5: stage x positions for n animals, evenly spaced about BAT.dealCentre, at most dealGap apart
   and never wider than dealSpan */
function dealSlots(n){
  if(n <= 1) return [BAT.dealCentre];
  const gap = Math.min(BAT.dealGap, BAT.dealSpan/(n-1));
  const x0 = BAT.dealCentre - gap*(n-1)/2;
  return Array.from({length:n}, (_, i)=> Math.round(x0 + gap*i));
}
function dealBoard(G, key){
  const P = PASTURES[key];
  // P5: every board is a random deal: how many (BAT.dealCount, storm: dealCountStorm), then
  // each slot's tier from dealWeights x the pasture's prime weight
  const M = mods(G);
  let n = 1 + weightedIndex(key === "storm" ? BAT.dealCountStorm : BAT.dealCount) + M.extraCows;
  if(M.maxCows) n = Math.min(n, M.maxCows);
  n = Math.max(1, Math.min(COW_IDS.length, n));
  const w = Object.assign({}, BAT.dealWeights); w.prime *= P.primeWeight * M.primeMult;
  const ks = Object.keys(w);
  const tiers = [];
  for(let i=0;i<n;i++) tiers.push(ks[weightedIndex(ks.map(k=> w[k]))]);
  const ramp = G.night <= BAT.rampNights ? BAT.rampOccMult : 1;
  // names come from the cow's own tier (COW_TABLE[t].names) so the flavor never contradicts the label
  const names = {}, used = {};
  Object.keys(COW_TABLE).forEach(t=>{ names[t] = shuffle(COW_TABLE[t].names.slice()); used[t] = 0; });
  const matesUsed = new Set(), rivalsUsed = new Set();
  return tiers.map((t, i)=>{
    const occP = Math.min(0.95, (t === "prime" ? primeOcc(G.night) : COW_TABLE[t].occ) * ramp * M.occMult * (P.occMult || 1));   // P9: x the year's crowding; P12: x the pasture's (few bats fly to the far valley)
    let occupied = roll() < occP, occupant = null;
    if(occupied){
      const pool = G.partners.filter(p=> p.alive && p.present && !matesUsed.has(p.id));
      if(roll() < BAT.mateOccupantP && pool.length){
        const ws = pool.map(p=> p.fed ? BAT.mateOccupantFedWeight : 1);
        let r = roll()*ws.reduce((a,b)=>a+b, 0), p = pool[pool.length-1];
        for(let k=0;k<pool.length;k++){ if(r < ws[k]){ p = pool[k]; break; } r -= ws[k]; }
        matesUsed.add(p.id); occupant = {kind:"mate", pid:p.id};
      } else {
        const rk = Object.keys(RIVALS).filter(k=> !rivalsUsed.has(k));
        if(rk.length){ const k = rk[Math.floor(roll()*rk.length)]; rivalsUsed.add(k); occupant = {kind:"rival", key:k}; }
        else occupied = false;
      }
    }
    const name = names[t][used[t]++ % names[t].length];
    return {id:COW_IDS[i], tier:t, name, occupied, occupant, locked:false, waited:0};
  });
}
/* the dusk commit: pasture, board, dark hours (ruling 36). P10 addendum B: the sleep choice has
   moved to the flight home, so the dusk only settles where you HUNT. You fly out of the roost you
   woke at, so the animals' occupants are drawn from the bats sleeping there tonight. */
function commitDusk(G, key){
  const R = G.run;
  const storm = G.cond.key === "storm";
  const woke = G.myRoost;
  R.roost = woke;
  R.pasture = key; R.far = !!PASTURES[key].far;
  R.scouted = R.far && ROOST_TYPES[G.roosts[woke].type].pasture === "far";
  R.board = dealBoard(G, key);
  R.slots = dealSlots(R.board.length);
  R.cowIdx = null; R.enc = null;
  G.ticks = storm ? BAT.stormTicks : BAT.ticks;
  G.sel = null;
  log(`Night ${G.night}: ${PASTURES[key].label.toLowerCase()}, ${R.board.length} animal${R.board.length===1?"":"s"}, ${R.board.filter(c=>c.occupied).length} already claimed.`);
}
/* P10 addendum B: the flight home. You pick tonight's roost, then you arrive: a close friend may
   bring up part of her meal if you came home hungry, or, if the crop is empty, you beg. */
function commitRoost(G, sel){
  const R = G.run;
  const storm = G.cond.key === "storm";
  if(storm || G.night === 1) sel = 0;
  if(typeof sel !== "number" || !G.roosts[sel] || G.roosts[sel].gone) sel = G.myRoost;
  if(sel !== G.myRoost) G.ledger.nightsAway++;
  G.myRoost = sel; G.roostSel = sel;
  R.roost = sel; R.newRoost = !G.roosts[sel].known;
  G.partners.forEach(p=>{ p.present = p.alive && p.tonightRoost === sel; p.visitor = p.present && p.homeRoost !== sel; });
  const away = roostResidents(G, sel).filter(p=> !p.present).length;
  log(`Night ${G.night}: sleeping at ${roostName(sel)}${away ? `, ${away} resident${away>1?"s":""} away tonight` : ""}.`);
}
/* P10 lever 1: on a night you came home unfed but not empty, a close friend may feed you anyway.
   One friend at most. Cited: donation tracks the strength of the relationship (Wilkinson 1984,
   Carter & Wilkinson 2013), and the strongest partners give before they are begged. */
function friendFeed(G){
  const R = G.run;
  const close = G.partners.filter(p=> p.alive && p.present && p.fed && p.trust >= BAT.friendFeedTrust)
    .sort((a, b)=> b.trust - a.trust);
  for(const p of close){
    if(roll() >= BAT.friendFeedP) continue;
    G.energy = Math.min(BAT.energyCap, G.energy + BAT.friendFeedBlood);
    p.fedYou = true; p.trust = Math.min(1, p.trust + BAT.friendFeedBond);
    G.score += BAT.pts.fedByFriend; G.ledger.friendFed++;
    R.friendFed = p.name;
    log(`Night ${G.night}: ${p.name} brought up part of her meal for you. +${BAT.pts.fedByFriend}.`, "good");
    sfx("good");
    unlock("saved");
    return true;
  }
  return false;
}
/* the arrival at the roost you picked: the beg (no blood left) or a friend's meal, then the dawn */
function resolveArrival(G){
  const R = G.run;
  if(R.fedTonight || G.energy > 0){
    if(!R.fedTonight) friendFeed(G);
    R.arrival = "dawn";
    flyHome(G);
    return;
  }
  begAtRoost(G);
}
function begAtRoost(G){
  const R = G.run;
  // v2 begResolution: present, fed roost-mates in trust order. P5: only bats who know you at all
  // (trust >= rescueMinTrust); on your first night at a new roost only bats who trust you at least
  // strangerShareTrust (nobody feeds a stranger). P9: a restless year drops the stranger rule.
  const minTrust = (R.newRoost && !mods(G).strangerEase) ? BAT.roosts.strangerShareTrust : BAT.roosts.rescueMinTrust;
  const helpers = G.partners.filter(p=>p.alive && p.present && p.fed && p.trust >= minTrust)
    .sort((a,b)=> b.trust - a.trust)
    .map(p=>({p, pr: rescueP(G, p.trust)}));   // P6a: the season's curve
  R.pAny = 1 - helpers.reduce((a,h)=>a*(1-h.pr), 1);
  R.tried = helpers.map(h=> h.p.name);
  /* P29 (Bryson: "an animation that builds anticipation for a bat saving you (or not saving you)").
     The outcome is still decided here with exactly the same dice: find() short-circuits at the first
     yes, so asking them one at a time in the same order and stopping in the same place is identical.
     What is new is that the sequence is REMEMBERED, so a scene can play it out. */
  const seq = [];
  let savior = null;
  for(const h of helpers){
    const ok = roll() < h.pr;
    seq.push({pid: h.p.id, name: h.p.name, p: h.pr, ok: ok});
    if(ok){ savior = h; break; }
  }
  R.begSeq = seq;
  if(savior){
    savior.p.fedYou = true; savior.p.trust = Math.min(1, savior.p.trust + BAT.rescueBond);
    G.energy = 1; G.score += BAT.pts.rescued; G.ledger.rescued++;
    R.savior = savior.p.name;
    log(`Night ${G.night}: rescued by ${savior.p.name}.`, "good");
    unlock("saved");
    R.begOutcome = "rescue";
    R.arrival = "begWait";
    return;
  }
  G.alive = false; G.cause = "starved"; R.cause = "starved";
  log(`Night ${G.night}: starved. \u2620`, "bad");
  R.begOutcome = "death";
  R.arrival = "begWait";
}
const unfedBurnFor = G=> (G.cond.key === "squall" || G.cond.key === "storm" || G.run.far) ? BAT.unfedBurnHard : BAT.unfedBurn;
const damperOn = G=> G.missStreak >= BAT.damperAfter;
const desperate = G=> G.energy <= BAT.desperateAt;

/* ── scene: dusk (conditions + pasture choice) ── */
const roundLabel = (G, tail)=> `${G.cond.icon} Night ${G.night} of ${BAT.nights} · ${tail}`;
const SCENE_DUSK = {
  label: G=> roundLabel(G, "dusk"),
  mode: "night",
  next: ["flightOut"],
  render(G){
    const grief = G.deaths.length && G.deathsFresh
      ? `<p class="wyd-story wyd-grief">${fill(COPY.grief, {names: esc(G.deathsFresh)})}</p>` : "";
    const stormNear = G.night === BAT.stormStart-2 ? `<p class="wyd-story"><strong>${COPY.stormWarn}</strong></p>` : "";
    const damper = damperOn(G) ? `<p class="wyd-story wyd-damper"><strong>${COPY.damper}</strong> ${fill(COPY.damperNote, {n: G.missStreak, mod: fmtTerm(BAT.damperMod)})}</p>` : "";
    const canFar = G.night >= BAT.farFrom && G.night <= BAT.farTo && !G.cond.stormy && !mods(G).farClosed;
    const storm = G.cond.key === "storm";
    const desp = desperate(G);
    const scouts = ROOST_TYPES[G.roosts[G.myRoost].type].pasture === "far";   // P10: you fly out of the roost you woke at
    const farSub = scouts
      ? fill(COPY.huntFarStatsScouted, {n:"one to five", scout: fmtTerm(BAT.farFail + BAT.scoutMod), scoutPct: Math.round((BAT.farFail + BAT.scoutMod)*100), farFail: Math.round(BAT.farFail*100), burnHard: bp(BAT.unfedBurnHard), farYield: fmtN(PASTURES.far.yieldMult || 1), farFree: Math.round((1 - (PASTURES.far.occMult || 1))*100)})
      : fill(COPY.huntFarStats, {farFail: Math.round(BAT.farFail*100), burnHard: bp(BAT.unfedBurnHard), farYield: fmtN(PASTURES.far.yieldMult || 1), farFree: Math.round((1 - (PASTURES.far.occMult || 1))*100)});
    let choices;
    if(G.night <= BAT.rampNights)
      choices = `<button class="btnx btnx--solid" id="wyd-hunt-near">${COPY.huntNight1Label}</button>`;
    else if(storm)
      choices = `<button class="btnx btnx--solid" id="wyd-hunt-near">${COPY.huntNearLabel} <span class="sub">${fill(COPY.huntStormSub, {ticks: BAT.stormTicks})}</span></button>`;
    else if(canFar)
      choices = `<button class="btnx wyd-huntopt" id="wyd-hunt-near">${COPY.huntNearLabel}</button>
         <button class="btnx wyd-huntopt${desp ? " wyd-desperate" : ""}" id="wyd-hunt-far">${COPY.huntFarLabel} <span class="sub">${farSub}${desp ? ` · <span class="wyd-deslabel">${COPY.desperate}</span>` : ""}</span></button>`;
    else
      choices = `<button class="btnx btnx--solid" id="wyd-hunt-near">${COPY.huntNearLabel}${G.cond.stormy ? ` <span class="sub">${COPY.huntRainSub}</span>` : ""}</button>`;
    // P9: the season cues and tonight's event live in popups + HUD icons now (pops below), not in the scene
    return `<div class="wyd-round">${roundLabel(G, "dusk")}</div>
      <h3>${G.cond.head}</h3>
      <p class="wyd-story">${G.cond.text}</p>
      ${grief}${stormNear}${damper}
      <div class="wyd-choices">${choices}</div>`;
  },
  choices: ()=> [
    {id:"wyd-hunt-near", apply: G=> commitDusk(G, G.cond.key === "storm" ? "storm" : "near"), goto:"flightOut"},
    {id:"wyd-hunt-far",  apply: G=> commitDusk(G, "far"), goto:"flightOut"},
  ],
  /* P9: the first dusk's briefing (years + season cues), then any surprise that landed tonight */
  pops(G){
    G.pops = G.pops || {};
    if(G.night === 1 && !G.pops.brief){ G.pops.brief = true; briefingPopup(G); }
    (G.events || []).forEach(ev=>{
      const k = "ev:" + ev.key + ":" + ev.night;
      if(ev.fired && ev.night === G.night && ev.text && !G.pops[k]){ G.pops[k] = true; eventPopup(G, ev, false); }
    });
  },
};
/* ── P5: the SLEEP cards (pure). Known roosts show what you have seen; unknown ones only the
   fiction and a rumor. Night 1 and storm nights show the hollow alone, locked. P10 addendum B:
   these belong to the roostPick scene on the flight home, not to the dusk. ── */
function roostCards(G){
  const K = BAT.roosts, storm = G.cond.key === "storm", locked = storm || G.night === 1;
  const selR = typeof G.roostSel === "number" ? G.roostSel : G.myRoost;
  const intro = G.night === 1 ? COPY.sleepNight1 : storm ? COPY.stormDusk : COPY.sleepIntro;
  // P6b: on a pick night the stage above carries the roosts; the panel below describes the
  // selected one (cards only on locked nights, where the hollow alone is shown, disabled)
  // P18 (Bryson): on a pick night EVERY standing roost gets a compact card (tap = pick); nothing is
  // selected until the player picks. Locked nights keep the single hollow card.
  const picked = !locked && G.run && G.run.roostPicked;
  const list = (locked ? [G.roosts[G.myRoost] || G.roosts[0]] : G.roosts).filter(r=> r && !r.gone);
  const cards = list.map(r=>{
    const T = ROOST_TYPES[r.type];
    const tags = [];
    if(r.id === 0) tags.push(COPY.roostHome);
    if(r.id === G.myRoost && G.night > 1) tags.push(COPY.roostYou);
    if(!r.known) tags.push(COPY.roostUnknown);
    // P25 finding 14: the outpost advertised a far-valley bonus on night 2, one night before the
    // far valley is ever offered. Before it opens, the tag says when it opens instead.
    if(T.pasture === "far") tags.push(G.night + 1 >= BAT.farFrom
      ? fill(COPY.roostScouts, {mod: fmtTerm(BAT.scoutMod)})
      : fill(COPY.roostScoutsSoon, {n: BAT.farFrom}));
    let body;
    if(r.known){
      const res = roostResidents(G, r.id);
      const friends = res.filter(p=> p.trust >= K.knownTrust).sort((a,b)=> b.trust - a.trust);
      const lines = [fill(COPY.roostKnownSub, {n: res.length})];
      if(friends.length) lines.push(fill(COPY.roostFriends, {names: friends.slice(0,3).map(p=> esc(p.name)).join(", ") + (friends.length > 3 ? ` and ${friends.length-3} more` : "")}));
      body = `<span class="rc-sub">${lines.join(" · ")}</span>`
        + (r.sick || r.hurt ? `<span class="rc-haz">${[r.sick ? COPY.roostSickHere : "", r.hurt ? COPY.roostHurtHere : ""].filter(Boolean).join(" · ")}</span>` : "");
    } else {
      const voice = G.partners.find(p=> p.alive && p.homeRoost === r.id && p.trust >= K.contactCallTrust);
      body = `<span class="rc-sub">${esc(T.fiction)}</span><span class="rc-rumor">${voice ? fill(COPY.roostRumor, {roost: esc(T.name), name: esc(voice.name)}) : COPY.roostNoRumor}</span>`;
    }
    const sel = locked ? r.id === selR : (picked && r.id === selR);
    const short = r.known ? fill(COPY.roostShortKnown, {n: roostResidents(G, r.id).length, f: roostResidents(G, r.id).filter(p=> p.trust >= K.knownTrust).length}) : COPY.roostShortNew;   // P19: the phone card's stat
    return `<div class="wyd-roostcard wyd-intel${sel ? " sel" : ""}${r.known ? " known" : " unknown"}${locked ? "" : " pickable"}" id="wyd-roost-${r.id}" data-roost="${r.id}"${locked ? "" : ' role="button" tabindex="0"'}>
      <span class="rc-name">${esc(cap(T.name))}</span>
      ${tags.length ? `<span class="rc-tags">${tags.map(t=> `<span class="wyd-ptag${t === COPY.roostUnknown ? "" : " good"}">${t}</span>`).join("")}</span>` : ""}
      <span class="rc-short">${esc(short)}</span>
      ${body}
    </div>`;
  }).join("");
  return `<div class="wyd-sleep">
    <div class="wyd-roostcards${locked ? "" : " wyd-roostcards--all"}" style="--n:${list.length}" aria-live="polite">${cards}</div>
  </div>`;
}
/* P11: the intro sentence lives in the left column of the two-column roostPick panel */
function roostIntro(G){
  const storm = G.cond.key === "storm", locked = storm || G.night === 1;
  const intro = G.night === 1 ? COPY.sleepNight1 : storm ? COPY.stormDusk : COPY.sleepIntro;
  return `<p class="wyd-story wyd-sleepintro">${intro}${locked ? "" : " " + COPY.roostTapHint}</p>`;
}

/* ── scene: flight out (timed; Skip; pass-through under reduced motion) ──
   Mounts the night's stage (roost frame, dusk tint) and flies the bat out over the herd; the
   same instance then serves the pasture, the encounter, the bite and the flight home. */
const FLIGHT_LAND = {id:"land", goto:"pasture"};
const SCENE_FLIGHTOUT = {
  label: G=> roundLabel(G, "flight out"),
  mode: "night",
  stage: true,
  next: ["pasture"],
  auto: ()=> reduceMotion() ? FLIGHT_LAND : null,
  render(G){
    return `<div class="wyd-round">${roundLabel(G, "flight out")}</div>
      <p class="wyd-story" id="wyd-flightstory"></p>

      <div class="wyd-choices"><button class="btnx" id="wyd-skip">${COPY.skip}</button></div>`;
  },
  wire(G){
    let done = false;
    const land = ()=>{ if(done) return; done = true; pick(FLIGHT_LAND); };
    $("#wyd-skip").onclick = land;
    stageOff();
    const st = ensureStage(G, {look:"roost", phase:"dusk"});
    const k = G.night === 1 ? 1.4 : 1;
    (async ()=>{
      if(!st) return;
      const b = beatToken();
      const hv = herdHover(st);
      beat("out");
      st.setPhase("dusk");
      st.caption(COPY.capLeaving, "Your bat leaves the roost and flies out over the pasture");
      st.pose("tuck");
      st.look("roost", 0);
      await st.batTo(115, 340, 500*k, E().anticipate);
      if(!live(b)) return;
      st.pose("flap");
      st.look("herd", 1700*k);
      await st.batTo(300, 220, 800*k, E().drift, 120);
      if(!live(b)) return;
      await st.batTo(hv.x, hv.y, 1000*k, E().soft);
      if(!live(b)) return;
      STAGE_AT = "hover";
      st.setPhase("night");
      st.caption(COPY.capPasture, "Your bat circles over the herd");
      beat("herd");
      at(500, land);
    })();
  },
};

/* ── the intel panel (pure): every number from bat-data.js; each bite term on its own line
   with its META provenance in the footnote (rulings 1-2) ── */
function biteTerms(G, cow, openWound){
  const c = G.cond, T = [];
  const add = (key, label, v, meta)=> T.push({key, label, v, meta});
  add("skill", COPY.termSkill, G.pFail, "BAT.playerFail");
  if(c.moon === "bright") add("moon", fill(COPY.termMoon, {moon:"bright"}), BAT.moonBright, "BAT.moonBright");
  else if(c.moon === "dim") add("moon", fill(COPY.termMoon, {moon:"dim"}), BAT.moonDim, "BAT.moonDim");
  if(c.key === "storm") add("storm", COPY.termStorm, BAT.stormMod, "BAT.stormMod");
  if(c.key === "squall") add("squall", COPY.termSquall, BAT.squallMod, "BAT.squallMod");
  if(c.rich) add("rich", COPY.termRich, BAT.richMod, "BAT.richMod");
  if(G.run.far) add("far", COPY.termFar, BAT.farFail, "BAT.farFail");
  if(G.run.scouted) add("scout", COPY.termScout, BAT.scoutMod, "BAT.scoutMod");
  if(COW_TABLE[cow.tier].mod) add("tier", cow.tier === "calf" ? COPY.termCalf : COW_TABLE[cow.tier].label.toLowerCase(), COW_TABLE[cow.tier].mod, "COW_TABLE." + cow.tier);
  if(openWound) add("wound", COPY.termWound, BAT.openWoundMod, "BAT.openWoundMod");
  if(damperOn(G)) add("damper", COPY.termDamper, BAT.damperMod, "BAT.damperMod");
  if(G.sick) add("sick", COPY.termSick, BAT.roosts.sickMod, "BAT.roosts.sickMod");   // P6a
  if(G.energy <= BAT.desperateAt) add("hungry", COPY.termHungry, BAT.hungryMod, "BAT.hungryMod");   // P10 lever 2b
  return T;
}
const pFailOf = (G, cow, openWound)=> clamp(biteTerms(G, cow, openWound).reduce((a,t)=> a + t.v, 0), 0.02, 0.95);
function citeLine(terms){
  const keys = [];
  terms.forEach(t=>{ const m = META[t.meta]; if(m && m.cite) m.cite.forEach(k=>{ if(!keys.includes(k)) keys.push(k); }); });
  return keys.map(k=> CITES[k] || k).join(" · ");
}
/* P12: the pasture's own meal factor (the far valley's fat cattle) */
const pastureYield = G=> (G.run && G.run.pasture && PASTURES[G.run.pasture] && PASTURES[G.run.pasture].yieldMult) || 1;
const mealOf = (G, cow)=> (COW_TABLE[cow.tier].yield + (G.cond.rich ? BAT.richBonus : 0)) * mods(G).yieldMult * pastureYield(G);   // P7 cattle disease halves every meal
function rankChips(p){
  const m = p.metAtCow; if(!m) return "";
  const lastN = kind=>{ const hits = m.nights.filter(x=> x.kind === kind); return hits.length ? hits[hits.length-1].night : 0; };
  let s = "";
  if(m.displacedYou) s += `<span class="wyd-ptag hot">${fill(COPY.chipDisplacedYou, {n:lastN("displacedYou")})}</span>`;
  if(m.toleratedYou) s += `<span class="wyd-ptag hot">${COPY.chipToleratedYou}</span>`;
  if(m.youDisplaced) s += `<span class="wyd-ptag hot">${fill(COPY.chipYouDisplaced, {obj:"her", n:lastN("youDisplaced")})}</span>`;
  return s;
}
function rivalChip(key){
  const r = G.rivals[key]; if(!r || !r.met) return "";
  const txt = r.lastOutcome === "lost" ? fill(COPY.chipDisplacedYou, {n:r.night})
    : r.lastOutcome === "won" ? COPY.chipYielded
    : r.lastOutcome === "tolerated" ? COPY.chipToleratedYou
    : fill(COPY.chipRebuffed, {n: r.night});
  return `<span class="wyd-ptag hot">${txt}</span>`;
}
function intelPanel(G){
  const R = G.run, cow = G.sel !== null ? R.board.find(c=> c.id === G.sel) : null;
  if(!cow) return `<div class="wyd-intel wyd-partner" data-cow=""><h4>${COPY.intelHead}</h4>
    <p class="wyd-story empty">${COPY.intelEmpty}</p></div>`;
  const T = COW_TABLE[cow.tier];
  const terms = biteTerms(G, cow, cow.occupied);
  const p = clamp(terms.reduce((a,t)=> a + t.v, 0), 0.02, 0.95);
  const desp = desperate(G) && cow.occupied && cow.tier === "prime";
  let cue = "";
  if(cow.occupied && cow.occupant.kind === "mate"){
    const m = G.partners[cow.occupant.pid];
    cue = `<p class="cue occ">${esc(m.name)} <span class="gl">bond ${m.trust.toFixed(2)}</span></p>
      <div class="wyd-bondbar"><b style="width:${(m.trust*100).toFixed(0)}%"></b></div>`;
  }
  const locked = cow.locked ? `<p class="cue locked">${COPY.occLocked}</p>` : "";
  return `<div class="wyd-intel wyd-partner${desp ? " wyd-desperate" : ""}" data-cow="${cow.id}" data-p="${p.toFixed(4)}" data-tier="${cow.tier}">
    <h4>${T.label} · ${esc(cow.name)}</h4>
    <div class="gl">${T.cue}${desp ? ` · <span class="wyd-deslabel">${COPY.desperate}</span>` : ""}</div>
    <p class="wyd-story intel">${T.intel}</p>
    <div class="meal wyd-meternum">${fill(COPY.intelMeal, {yield: bp(mealOf(G, cow))})}</div>
    ${occStar(cow)}
    <div class="wyd-meters--phone">${meters(G, cow, p)}</div>
    ${cue}${locked}
  </div>`;
}
/* P16 (Bryson 2026-09-04, phones): the picked animal's name, meal, bite risk and who is on it float on the
   stage in the empty sky (an HTML overlay in CSS pixels, so it stays legible at 375px where the SVG info box
   did not); the panel below keeps only the title line. Shown by CSS at <= 600px only. */
function mountMobInfo(G){
  const host = document.querySelector("#wyd-stagehost .wyd-stage");
  if(!host) return;
  host.querySelectorAll(".wst-mobinfo").forEach(el=> el.remove());
  const R = G.run, cow = G.sel !== null && R ? R.board.find(c=> c.id === G.sel) : null;
  if(!cow) return;
  const T = COW_TABLE[cow.tier], p = pFailOf(G, cow, cow.occupied);
  let who = "";
  if(cow.occupied && cow.occupant.kind === "mate"){ const m = G.partners[cow.occupant.pid]; who = `<div class="wst-mobwho occ">${esc(m.name)} · bond ${m.trust.toFixed(2)}</div>`; }
  if(cow.locked) who += `<div class="wst-mobwho locked">${COPY.occLocked}</div>`;
  const el = document.createElement("div");
  el.className = "wst-mobinfo";
  el.innerHTML = `<div class="wst-mobname">${T.label} · ${esc(cow.name)}</div>${meters(G, cow, p)}${occStar(cow)}${who}`;
  host.appendChild(el);
}
/* P6c (Bryson 2026-09-03): meal and risk as bars, the numbers small beside them. The meal bar is
   in crop units (a full crop = BAT.energyCap), drawn as pips of one blood each; the risk bar is
   the fail chance. Verb cards get the same risk bar for their odds (riskBar). */
function meters(G, cow, p){
  const meal = mealOf(G, cow);
  /* P27: the meal reads on the same 0 to 100 scale as the crop it goes into, in one bar */
  const pips = `<i><b style="transform:scaleX(${clamp(meal / BAT.energyCap, 0, 1).toFixed(3)})"></b></i>`;
  const mealLbl = fill(COPY.meterMeal, {n: bp(meal), cap: BLOOD_MAX});
  // P25 finding 1: the bar over an animal and the status bar's Skill cell were the same number in
  // opposite directions, so they always summed to 100. Both now say how often the bite LANDS.
  const land = 1 - p;
  const landLbl = fill(COPY.meterBite, {p: Math.round(land*100)});
  /* P29 (Bryson: "the hunting bar in the hud is not necessary at all since the fail risk is there
     with the cow already"). The HUD's Skill cell is gone, so this bar is now the one place the bite
     chance lives, and it carries what that cell carried: the odds, the itemised terms and the tap
     that opens the breakdown. Exactly the "same number twice" P25 flagged, resolved the way P25
     suggested considering. */
  const terms = esc(JSON.stringify(hudBiteTerms(G).map(t=> ({key:t.key, v:+t.v.toFixed(4)}))));   // hudBiteTerms returns the array itself
  return `<div class="wyd-meters">
    <div class="wyd-meter wyd-meter-meal" role="img" aria-label="${esc(mealLbl)}"><span class="gl">${mealLbl}</span><div class="wyd-bloodbar wyd-bar1">${pips}</div></div>
    <div class="wyd-meter wyd-meter-risk wyd-skillsrc" role="button" tabindex="0" aria-label="${esc(landLbl)}"
      data-p="${p.toFixed(4)}" data-skill="${land.toFixed(4)}" data-terms="${terms}"><span class="gl">${landLbl}</span><div class="wyd-riskbar${land < 0.5 ? " bad" : land < 0.75 ? " mid" : ""}"><b style="width:${(land*100).toFixed(0)}%"></b></div></div>
  </div>`;
}
/* P28 (Bryson: "dont bother with the note that says you can only hold 100 ... Just add a small star
   that says another bat is already feeding here, investigate?"). The spill note is gone: the crop's
   cap is on the HUD bar and a player works out that a full crop cannot take more. What a picked
   animal DOES need to say is that somebody is already on it, because that is a decision.
   spillLine() and COPY.mealSpill are kept unused rather than deleted, in case the note is wanted
   back; nothing calls them. */
function occStar(cow){
  return cow && cow.occupied && !cow.locked ? `<p class="wyd-occstar">${COPY.occStar}</p>` : "";
}
function spillLine(G, cow){
  const over = (G.energy + mealOf(G, cow)) - BAT.energyCap;
  return over > 0.05 ? `<p class="wyd-spill">${fill(COPY.mealSpill, {cap: BLOOD_MAX, spill: bp(over)})}</p>` : "";
}
const riskBar = (p, label)=> `<div class="wyd-meter wyd-meter-risk" role="img" aria-label="${label} ${Math.round(p*100)} percent"><span class="gl">${label}</span><div class="wyd-riskbar${p >= 0.5 ? " bad" : p >= 0.25 ? " mid" : ""}"><b style="width:${(p*100).toFixed(0)}%"></b></div></div>`;
/* the encounter's last outcome, rendered by the scene that follows it (pure) */
function encOutcome(G){
  const R = G.run, e = R.enc && R.enc.last; if(!e) return "";
  const who = whoAt(G, R.board[R.enc.cowIdx]);
  const v = {Subj: who.Subj, subj: who.subj, name: esc(who.name)};
  const map = {
    join:     e.ok ? COPY.joinTolerated : COPY.rebuff,
    displace: e.ok ? COPY.displaceWin : COPY.displaceLose,
    wait:     e.ok ? COPY.waitSuccess : COPY.waitStill,
    leave:    COPY.leave,
  };
  const result = e.verb === "join" ? (e.ok ? COPY.rollTolerated : COPY.rollRefused) : e.verb === "displace" ? fill(e.ok ? COPY.rollYields : COPY.rollHolds, v) : (e.ok ? fill(COPY.rollLeaves, v) : COPY.rollStill);
  const rollTxt = e.verb === "leave" ? "" :
    `<div class="wyd-roll">${fill(COPY.rollLine, {r: "<strong>" + e.r.toFixed(2) + "</strong>", p: "<strong>" + fmtP(e.p) + "</strong>", result})}</div>`;
  return `<div class="wyd-outcome wyd-encout">${rollTxt}<p class="wyd-story">${fill(map[e.verb], v)}</p></div>`;
}
/* who is on the cow: a roost-mate (she) or a rival (their own pronouns) */
function whoAt(G, cow){
  const o = cow && cow.occupant;
  if(!o) return {kind:null, name:"", subj:"it", Subj:"It", obj:"it", trust:0};
  if(o.kind === "mate"){ const p = G.partners[o.pid]; return {kind:"mate", pid:p.id, name:p.name, subj:"she", Subj:"She", obj:"her", trust:p.trust}; }
  const r = RIVALS[o.key]; return {kind:"rival", key:o.key, name:r.name, subj:r.subj, Subj:r.Subj, obj:r.obj, cls:r.cls, tell:r.tell, met:G.rivals[o.key].met, trust:0};
}

/* ── scene: the pasture (the cow board in choice mode) ── */
const APPROACH = {id:"approach", apply: G=> approachApply(G), goto: G=> G.run.board[G.run.cowIdx].occupied ? "encounter" : "bite"};
const FLYHOME_EMPTY = {id:"wyd-flyhome", apply: G=>{ G.run.leftEarly = G.ticks > 0; G.run.enc = null; }, goto:"flightHome"};
function canApproach(G){
  const cow = G.sel !== null ? G.run.board.find(c=> c.id === G.sel) : null;
  return !!cow && !cow.locked && G.ticks > 0;
}
/* the approach transition (rulings 3, 5, 6): one dark hour; a free cow → the bite roll now;
   an occupied one → the encounter with the stored occupant and waited count */
function approachApply(G){
  const R = G.run;
  const idx = R.board.findIndex(c=> c.id === G.sel);
  R.cowIdx = idx; G.ticks--;
  const cow = R.board[idx];
  R.enc = {cowIdx: idx, last: null};
  if(!cow.occupied) rollBite(G, {openWound:false, waited:false, cofed:false});
}
const SCENE_PASTURE = {
  label: G=> roundLabel(G, "the pasture"),
  mode: "night",
  stage: true,
  next: ["bite", "encounter", "flightHome"],
  render(G){
    const R = G.run, n = R.board.length;
    /* P28 (Bryson): the pasture used to count the animals and describe the fence line before telling
       you what to do. The board is right there on the stage, so it just says what to do. The old
       lines stay in bat-copy.js: the far valley and the storm are still worth naming, so they are
       kept as the tail of the same sentence. */
    const N = cap(wordN(n)) + " animals";
    const flavour = R.pasture === "far" ? (n === 1 ? COPY.pastureFarOne : fill(COPY.pastureFar, {N}))
      : R.pasture === "storm" ? (n === 1 ? COPY.pastureStormOne : fill(COPY.pastureStorm, {N})) : "";
    const story = COPY.pastureLead + (flavour ? " " + flavour : "");
    const cow = G.sel !== null ? R.board.find(c=> c.id === G.sel) : null;
    const ok = canApproach(G);
    const burn = unfedBurnFor(G);
    const last = R.enc && R.enc.last && ["join","displace","leave"].includes(R.enc.last.verb) ? encOutcome(G) : "";
    return `<div class="wyd-round">${roundLabel(G, "the pasture")} <span class="wyd-ticksleft">${fill(COPY.ticksTag, {n:G.ticks})}</span></div>
      <div class="wyd-cols">
        <div>
          <p class="wyd-story">${story}${damperOn(G) ? ` <strong>${COPY.damper}</strong>` : ""}</p>
          ${last}
        </div>
        <div>
          ${intelPanel(G)}
          <div class="wyd-choices wyd-cowpick">
            <button class="btnx btnx--solid wyd-approachbtn" id="wyd-approach" ${ok ? "" : "disabled"}>${cow ? fill(COPY.approach, {name: esc(cow.name)}) : COPY.approachDefault}${ok ? "" : ` <span class="sub">${cow && cow.locked ? COPY.occLocked : G.ticks > 0 ? COPY.approachSub : COPY.approachNone}</span>`}</button>
            <button class="btnx wyd-clay wyd-flyhomebtn" id="wyd-flyhome">${COPY.flyHome}</button>
          </div>
        </div>
      </div>`;
  },
  choices: ()=> [
    {id:"wyd-approach", apply: APPROACH.apply, goto: APPROACH.goto},
    FLYHOME_EMPTY,
  ],
  wire(G){
    const R = G.run;
    const st = ensureStage(G, {look:"herd", phase:"night"});
    if(!st) return;
    st.choice(true);
    R.board.forEach(c=>{
      const T = COW_TABLE[c.tier];
      const p = pFailOf(G, c, c.occupied);
      /* P28 (Bryson): an animal that is done with you walks off rather than sitting there greyed out */
      if(c.locked && st.leave) st.leave(c.id);
      const aria = `${T.label}, ${c.name}: meal plus ${bp(mealOf(G, c))}, bite fails about ${Math.round(p*100)} percent${c.occupied ? ", one bat already at the wound" : ""}${c.locked ? ", done with you tonight" : ""}`;
      st.label(c.id, aria, `${T.label.toLowerCase()} · +${bp(mealOf(G, c))}${c.locked ? " · locked" : ""}`);
    });
    st.select(G.sel);
    // P6d: the picked cow's bars float above it on the stage; your own bars sit in the corner
    st.you(youPanelHtml(G));
    R.board.forEach(c=> st.info(c.id, c.id === G.sel ? meters(G, c, pFailOf(G, c, c.occupied)) : ""));
    mountMobInfo(G);   // P16: on phones the picked animal's card floats on the stage instead
    st.onCow(id=>{
      if(id === G.sel && canApproach(G)){ pick(APPROACH); return; }
      sfx("pick");
      G.sel = id;
      renderScene("pasture", {wipe:false});
    });
    // every resident is back at its wound and tucked (a flare from the last standoff must not linger)
    R.board.forEach(c=>{ if(c.occupied) st.rival(c.id, "tuck"); });
    // the bat hovers over the herd between beats (a fresh mount, a skipped flight, a rebuff)
    if(STAGE_AT !== "hover"){
      const b = beatToken();
      const hv = herdHover(st);
      const fresh = STAGE_AT === null;
      const last = R.enc && R.enc.last;
      // a refused join or a lost displacement at the cow the bat is still beside: the rebuff beat
      // first (wobble, knocked back into the grass, the resident re-tucks), played once
      const rebuff = last && !last.ok && (last.verb === "join" || last.verb === "displace") && !last.rebuffShown
        && STAGE_AT === R.board[R.enc.cowIdx].id ? R.board[R.enc.cowIdx].id : null;
      st.setPhase("night");
      (async ()=>{
        if(rebuff){
          last.rebuffShown = true; STAGE_AT = "grass";
          beat("rebuff");
          st.caption(COPY.capChased, "The resident screams and you are knocked back into the grass");
          await st.rebuff(rebuff);
          if(!live(b)) return;
          await new Promise(r=> at(reduceMotion() ? 0 : 400, r));
          if(!live(b)) return;
        }
        st.pose("flap");
        st.caption(COPY.capChoosing, "Your bat circles over the herd, choosing");
        await st.batTo(hv.x, hv.y, fresh ? 0 : 700, E().drift);
        if(live(b)){ STAGE_AT = "hover"; beat("choose"); }
      })();
      if(fresh) STAGE_AT = "hover";
      if(!rebuff) beat("choose");
    } else beat("choose");
  },
};

/* ── the encounter (rulings 20-25): verbs, odds, memory ── */
function rememberRival(G, key, outcome){ const r = G.rivals[key]; r.met = true; r.lastOutcome = outcome; r.night = G.night; }
function rememberMate(p, kind, night){ p.metAtCow[kind]++; p.metAtCow.nights.push({night, kind}); }
const afterMiss = G=> G.ticks > 0 ? "pasture" : "flightHome";
function verbJoin(G){
  const R = G.run, cow = R.board[R.enc.cowIdx], who = whoAt(G, cow);
  const p = BAT.joinBase + BAT.joinSlope * who.trust;
  const r = roll(), ok = r < p;
  R.enc.last = {verb:"join", p, r, ok};
  if(who.kind === "mate"){
    const m = G.partners[who.pid];
    if(ok){ m.trust = Math.min(1, m.trust + BAT.cofeedBond); rememberMate(m, "toleratedYou", G.night); }
  } else rememberRival(G, who.key, ok ? "tolerated" : "refused");
  if(ok){
    G.score += BAT.pts.cofeed; G.ledger.cofeeds++; R.cofed = true; unlock("cofeed");
    R.cofedWith = who.name; R.cofedKind = who.kind;
    log(`Night ${G.night}: ${who.name} lets you feed beside ${who.obj}. +${BAT.pts.cofeed}.`, "good");
    rollBite(G, {openWound:true, waited:false, cofed:true});
  } else {
    cow.locked = true;
    log(`Night ${G.night}: rebuffed by ${who.name}; ${cow.name} is claimed.`, "bad");
  }
}
function verbDisplace(G){
  const R = G.run, cow = R.board[R.enc.cowIdx], who = whoAt(G, cow);
  const cls = who.kind === "mate" ? "mate" : who.cls;
  const p = BAT.displaceWin[cls];
  const r = roll(), ok = r < p;
  R.enc.last = {verb:"displace", p, r, ok};
  G.ledger.dispTries++;
  if(who.kind === "mate"){
    const m = G.partners[who.pid];
    m.trust = Math.max(BAT.trustFloor, m.trust + BAT.displaceMateBond);
    rememberMate(m, ok ? "youDisplaced" : "displacedYou", G.night);
  } else rememberRival(G, who.key, ok ? "won" : "lost");
  if(ok){
    G.score += BAT.pts.displace; G.ledger.dispWins++; R.displaced = true; unlock("rank");
    log(`Night ${G.night}: you displaced ${who.name}. +${BAT.pts.displace}.`, "good");
    rollBite(G, {openWound:true, waited:false, cofed:false});
  } else {
    cow.locked = true;
    log(`Night ${G.night}: ${who.name} held the wound; ${cow.name} is claimed.`, "bad");
  }
}
function verbWait(G){
  const R = G.run, cow = R.board[R.enc.cowIdx];
  G.ticks--; cow.waited++;
  const p = BAT.waitLeaveP, r = roll(), ok = r < p;
  R.enc.last = {verb:"wait", p, r, ok};
  if(ok){
    log(`Night ${G.night}: the wound at ${cow.name} came free.`, "good");
    rollBite(G, {openWound:true, waited:true, cofed:false});
  } else log(`Night ${G.night}: waited an hour at ${cow.name}; still claimed.`);
}
function verbLeave(G){
  const R = G.run;
  R.enc.last = {verb:"leave"};
  if(G.ticks <= 0) R.leftEarly = false;
}
const VERBS = [
  {id:"join",     sel:".wyd-verb.join",     apply: verbJoin,     goto: G=> G.run.enc.last.ok ? "bite" : afterMiss(G)},
  {id:"displace", sel:".wyd-verb.displace", apply: verbDisplace, goto: G=> G.run.enc.last.ok ? "bite" : afterMiss(G)},
  {id:"wait",     sel:".wyd-verb.wait",     apply: verbWait,     goto: G=> G.run.enc.last.ok ? "bite" : "encounter"},
  {id:"leave",    sel:".wyd-verb.leave",    apply: verbLeave,    goto: G=> afterMiss(G)},
];
let ENC_SEEN = "";   // night:cow whose rear beat already played (the self-edge skips it)
/* P25: how long the encounter waits before forcing its buttons visible. Comfortably past the
   approach + confront animation (~2s), so it only ever fires when something has gone wrong. */
const ENC_FAILSAFE_MS = 5000;
const SCENE_ENCOUNTER = {
  label: G=> roundLabel(G, "the encounter"),
  mode: "night",
  stage: true,
  next: ["bite", "pasture", "encounter", "flightHome"],
  render(G){
    const R = G.run, cow = R.board[R.enc.cowIdx], who = whoAt(G, cow);
    const mate = who.kind === "mate";
    const head = mate ? fill(COPY.encHeadMate, {name: esc(who.name)}) : who.met ? fill(COPY.encHeadMet, {name: esc(who.name)}) : COPY.encHeadStranger;
    const recog = mate ? fill(COPY.meetMate, {name: esc(who.name)})
      : who.met ? fill(COPY.meetRivalMet, {name: esc(who.name), tell: who.tell}) : fill(COPY.meetRival, {tell: who.tell});
    const chips = mate ? `<div class="wyd-ptags"><span class="wyd-ptag good">bond ${who.trust.toFixed(2)}</span>${rankChips(G.partners[who.pid])}</div>`
      : who.met ? `<div class="wyd-ptags">${rivalChip(who.key)}</div>` : "";
    const bond = mate ? `<div class="wyd-bondbar"><b style="width:${(who.trust*100).toFixed(0)}%"></b></div>` : "";
    const still = R.enc.last && R.enc.last.verb === "wait" ? encOutcome(G) : "";
    const pJoin = BAT.joinBase + BAT.joinSlope * who.trust;
    /* P28: on a phone each verb is its label plus a small "N% success" (or "odds unknown"), which
       is the only part of those sentences a decision turns on. The desktop keeps the prose. */
    const brief = onPhone();
    const pctJoin = Math.round(pJoin*100);
    const joinSub = brief ? fill(COPY.verbOdds, {p: pctJoin})
      : mate ? fill(COPY.joinSub, {p: pctJoin, subj: who.subj}) : fill(COPY.joinSubStranger, {p: pctJoin});
    const dispSub = mate ? (brief ? fill(COPY.verbOddsCost, {p: Math.round(BAT.displaceWin.mate*100)}) : fill(COPY.displaceSubMate, {p: Math.round(BAT.displaceWin.mate*100)}))
      : who.met ? (brief ? fill(COPY.verbOdds, {p: Math.round(BAT.displaceWin[who.cls]*100)}) : fill(COPY.displaceSub, {p: Math.round(BAT.displaceWin[who.cls]*100), subj: who.subj}))
      : COPY.displaceSubUnknown;
    const waitSub = brief ? fill(COPY.verbOdds, {p: Math.round(BAT.waitLeaveP*100)})
      : fill(COPY.waitSub, {p: Math.round(BAT.waitLeaveP*100), subj: who.subj});
    const leaveSub = G.ticks > 0 ? COPY.leaveSub : COPY.leaveSubNoHours;
    return `<div class="wyd-round">${roundLabel(G, "the encounter")} <span class="wyd-ticksleft">${fill(COPY.ticksTag, {n:G.ticks})}</span></div>
      <h3>${head}</h3>
      <p class="wyd-story">${onPhone() ? COPY.encAsk : recog + ` <span class="wyd-ticksleft">${fill(COPY.ticksLeft, {n:G.ticks})}.</span>`}</p>
      ${chips}${bond}${still}
      <div class="wyd-verbs" id="wyd-verbs" ${reduceMotion() ? "" : "hidden"}>
        <button class="btnx wyd-verb join">${COPY.joinLabel} <span class="sub">${joinSub}</span>${brief ? "" : riskBar(1 - clamp(pJoin, 0, 1), COPY.riskRefused)}</button>
        <button class="btnx wyd-verb displace">${fill(COPY.displaceLabel, {obj: who.obj})} <span class="sub">${dispSub}</span>${brief || !(mate || who.met) ? "" : riskBar(1 - BAT.displaceWin[mate ? "mate" : who.cls], COPY.riskHolds)}</button>
        ${G.ticks > 0 ? `<button class="btnx wyd-verb wait">${COPY.waitLabel} <span class="sub">${waitSub}</span>${brief ? "" : riskBar(1 - BAT.waitLeaveP, COPY.riskStill)}</button>` : ""}
        <button class="btnx wyd-verb leave">${COPY.leaveLabel} <span class="sub">${leaveSub}</span></button>
      </div>
      <p class="wyd-story wyd-beathint" id="wyd-beathint" ${reduceMotion() ? "hidden" : ""}>${COPY.encSkipHint}</p>`;
  },
  choices: G=> G.ticks > 0 ? VERBS : VERBS.filter(v=> v.id !== "wait"),
  wire(G){
    const R = G.run, cow = R.board[R.enc.cowIdx], id = cow.id;
    const st = ensureStage(G, {look:"herd", phase:"night"});
    const verbs = $("#wyd-verbs"), hint = $("#wyd-beathint");
    const host = $("#wyd-stagehost"), sc = $("#wyd-scene");
    let shown = false;
    const b = beatToken();   // this wire's beat; a skip from an older wire bails on the mismatch
    /* ── P25 (2026-09-04): THE ENCOUNTER MUST NEVER BE UNREACHABLE. ───────────────────────────
       A cold-read playtest ended two games on the same frozen screen: the standoff prompt with
       no JOIN / PUSH / WAIT / LEAVE buttons and an inert "tap anywhere to skip" line. Cause: the
       buttons start hidden and are revealed only by showCards() at the END of the animation
       chain below, every await of which bails on !live(b) WITHOUT revealing them; and the tap-to-
       skip listeners are armed by at(80, ...), a timer cancelTimers() clears. So a single BEAT
       bump or stage swap in that window killed both ways out at once and the run was over.
       Two guards, and neither trusts BEAT:
         rescue()  reveals the buttons whenever this wire's own markup is still on screen, and is
                   called from every bail-out instead of returning silently.
         failsafe  a RAW setTimeout, deliberately NOT in TIMERS so cancelTimers() cannot clear it,
                   that reveals them anyway if something we did not think of goes wrong. It is set
                   well past the longest animation, so on a healthy run it never fires. ── */
    const stillMine = ()=> !!verbs && document.contains(verbs);
    const rescue = ()=>{
      if(!stillMine() || !verbs.hidden) return;
      verbs.hidden = false;
      if(hint) hint.hidden = true;
      beat("cards");
    };
    let failsafe = setTimeout(rescue, ENC_FAILSAFE_MS);
    const showCards = ()=>{
      if(failsafe){ clearTimeout(failsafe); failsafe = null; }
      if(shown) return; shown = true;
      if(verbs) verbs.hidden = false;
      if(hint) hint.hidden = true;
      detachEncSkip();
      beat("cards");
    };
    const skip = ()=>{
      if(shown || b !== BEAT) return;
      cancelTimers();
      if(st){ st.cut(); st.commit(id); st.rival(id, "flare"); if(R.enc.last && R.enc.last.verb === "wait") st.slowDrips(id); }
      STAGE_AT = id;
      showCards();
    };
    const key = G.night + ":" + id;
    if(!st){ showCards(); return; }
    st.choice(false);
    st.commit(id);
    st.you(youPanelHtml(G)); R.board.forEach(c=> st.info(c.id, ""));
    if(reduceMotion() || ENC_SEEN === key){
      // the static frame, or the self-edge after a wait: the resident is up, cards at once
      if(STAGE_AT !== id){ const hx = st.cows[id].neck.x + WydStage.HOVER.dx, hy = st.cows[id].perch.y + WydStage.HOVER.dy; st.batTo(hx, hy, 0); STAGE_AT = id; }
      st.pose("flap");
      st.rival(id, "flare");
      if(R.enc.last && R.enc.last.verb === "wait") st.slowDrips(id);
      st.caption(COPY.capStandoff, "A bat is already at the wound and faces you down");
      showCards();
      ENC_SEEN = key;
      return;
    }
    // armed a beat later: the tap that approached is still bubbling through #wyd-scene / the
    // stage host when this wire runs, and it must not count as the skip
    at(80, ()=>{
      if(shown || b !== BEAT) return;
      detachEncSkip();
      if(host) host.addEventListener("click", skip);
      if(sc) sc.addEventListener("click", skip);
      ENC_SKIP = {host, sc, fn: skip};
    });
    (async ()=>{
      beat("approach");
      st.caption(COPY.capApproach, "Your bat drops toward the cow's back");
      if(STAGE_AT !== id){ await st.approach(id); if(!live(b)){ rescue(); return; } STAGE_AT = id; }
      beat("meet");
      st.caption(COPY.capStandoff, "A bat is already at the wound and rears at you");
      await st.confront(id);
      if(!live(b)){ rescue(); return; }
      beat("rear");
      ENC_SEEN = key;
      at(250, showCards);
      /* at() is a cancellable timer, so back it with a raw one: this is the last step before the
         buttons appear and it must not be the thing that strands the player */
      setTimeout(rescue, 900);
    })();
  },
};

/* ── the bite roll (ruling 5): once a night, in the transition that enters bite ── */
function rollBite(G, o){
  const R = G.run, cow = R.board[R.cowIdx];
  const pf = pFailOf(G, cow, o.openWound);
  const r = roll();
  R.rolled = true; R.bitten = true; R.openWound = !!o.openWound; R.waited = !!o.waited; R.cofed = !!o.cofed;
  R.tier = cow.tier; R.cowName = cow.name;
  R.pFailUsed = pf; R.rollValue = r;
  R.fedTonight = r > pf;
  R.meal = R.fedTonight
    ? (Math.max(BAT.waitFloor, COW_TABLE[cow.tier].yield - BAT.waitDrain * (o.waited ? 1 : 0)) + (G.cond.rich ? BAT.richBonus : 0)) * mods(G).yieldMult * pastureYield(G)
    : 0;
}
/* ── scene: the bite (timed; Skip; pass-through under reduced motion) ── */
const BITE_LAND = {id:"land", goto:"flightHome"};
/* how long the bite beat holds before flying home. P26 names the two numbers because the drinking
   sound has to last exactly as long as the blood does, and a magic 2600 in two places drifts. */
const BITE_HOLD_FED = 2600, BITE_HOLD_MISS = 1400;
const SCENE_BITE = {
  label: G=> roundLabel(G, "the bite"),
  mode: "night",
  stage: true,
  next: ["flightHome"],
  auto: ()=> reduceMotion() ? BITE_LAND : null,
  render(G){
    const R = G.run;
    const via = R.enc && R.enc.last && R.enc.last.ok ? encOutcome(G) : "";
    return `<div class="wyd-round">${roundLabel(G, "the bite")}</div>
      ${via}
      <p class="wyd-story" id="wyd-flightstory"></p>
      <div class="wyd-choices"><button class="btnx" id="wyd-skip">${COPY.skip}</button></div>`;
  },
  wire(G){
    const R = G.run, cow = R.board[R.cowIdx], id = cow.id, fed = R.fedTonight;
    let done = false;
    const land = ()=>{ if(done) return; done = true; pick(BITE_LAND); };
    $("#wyd-skip").onclick = land;
    const story = $("#wyd-flightstory");
    const st = ensureStage(G, {look:"herd", phase:"night"});
    if(!st){ at(1200, land); return; }
    st.choice(false);
    st.commit(id);
    st.you(youPanelHtml(G)); R.board.forEach(c=> st.info(c.id, ""));
    (async ()=>{
      const b = beatToken();
      const c = st.cows[id];
      if(STAGE_AT !== id){
        beat("approach"); st.caption(COPY.capApproach, "Your bat drops toward the cow");
        await st.approach(id); if(!live(b)) return; STAGE_AT = id;
      }
      if(R.enc && R.enc.last && R.enc.last.ok){
        const e = R.enc.last;
        if(e.verb === "join"){ beat("shuffle"); st.caption(COPY.capShuffle, "The resident steps aside and lets you in"); await st.shuffle(id); }
        else { beat("yield"); st.caption(e.verb === "wait" ? COPY.capWoundFree : COPY.capYields, "The resident lifts away from the wound"); await st.yield(id); }
        if(!live(b)) return;
      }
      beat("perch");
      await st.perch(id, 800); if(!live(b)) return;
      beat("reveal", fed ? "fed" : "miss");
      if(fed){
        st.caption(COPY.capFeeding, "Your bat feeds from the cow's neck; blood runs from the bite");
        st.blood(id);
        sfx("drink", BITE_HOLD_FED - 400);   // P26 (Bryson): you can hear yourself drink, for as long as the blood runs
        if(story) story.innerHTML = `<strong>${COPY.fed}</strong>`;
      } else {
        st.caption(COPY.capKicked, "The cow wakes and kicks; your bat tumbles into the grass");
        if(story) story.innerHTML = `<strong>${COPY.miss}</strong>`;
        sfx("kick");   // P10c: the kick has its own sound
        sfx("moo");    // P26 (Bryson): she wakes under you and lows about it. The thud reads first, the low swells over the tumble
        st.kick(id); st.shake();
        await st.flung(c.x - 110, c.y + 2, 150);
        if(!live(b)) return;
        STAGE_AT = "grass";
      }
      at(fed ? BITE_HOLD_FED : BITE_HOLD_MISS, land);
    })();
  },
};

/* ── scene: flight home (timed; Skip; pass-through under reduced motion); its exit runs
   finishNight, the one place the night's economy resolves ── */
const HOME_LAND = {id:"land", apply: ()=> finishNight(), goto: G=> G.run.result};
const SCENE_FLIGHTHOME = {
  label: G=> roundLabel(G, "flight home"),
  mode: "night",
  stage: true,
  next: ["night"],
  auto: ()=> reduceMotion() ? HOME_LAND : null,
  render(G){
    const R = G.run;
    const txt = "";   // P28: the animation and the sound say whether it went well
    return `<div class="wyd-round">${roundLabel(G, "flight home")}</div>
      <p class="wyd-story" id="wyd-flightstory">${txt}</p>
      <div class="wyd-choices"><button class="btnx" id="wyd-skip">${COPY.skip}</button></div>`;
  },
  wire(G){
    let done = false;
    const land = ()=>{ if(done) return; done = true; pick(HOME_LAND); };
    $("#wyd-skip").onclick = land;
    const st = ensureStage(G, {look:"herd", phase:"night"});
    if(!st){ at(900, land); return; }
    st.choice(false); st.select(null);
    (async ()=>{
      const b = beatToken();
      beat("home");
      st.setPhase("dawn");
      st.caption(COPY.capHome, G.run.fedTonight ? "Fed and heavy, your bat flies home to the roost" : "Empty, your bat flies home to the roost");
      st.look("roost", 2000);
      await st.home(2000, G.run.fedTonight);
      if(!live(b)) return;
      STAGE_AT = null;
      beat("rest"); st.settle();
      at(600, land);
    })();
  },
};

/* ── transition: resolve the night (rulings 8-11): learning and the meal on a fed night; the
   ONE unfed cost, missStreak and the consolation. P10: the beg roll happens at the roost you pick
   on the flight home (begAtRoost), not here. ── */
function finishNight(){
  const R = G.run;
  R.paraNote = ""; R.mitesNew = false; R.mitesCost = false;
  G.hygiene = Math.max(0, G.hygiene - (G.cond.stormy ? BAT.hygieneStormDecay : BAT.hygieneDecay) * mods(G).hygMult);
  if(R.fedTonight){
    G.successes++;
    const learned = G.pFail > BAT.learnFloor + 0.001;
    G.pFail = Math.max(BAT.learnFloor, G.pFail * BAT.learnRate);
    G.energy = Math.min(BAT.energyCap, G.energy + R.meal);
    G.score += BAT.pts.fed; R.pts = BAT.pts.fed;
    if(R.tier === "prime" && !R.cofed){ G.score += BAT.pts.primeSolo; R.primeSolo = true; R.pts += BAT.pts.primeSolo; }
    if(R.far){ G.score += BAT.pts.farFed; R.farFed = true; R.pts += BAT.pts.farFed; }   // P12: the far valley pays extra
    G.missStreak = 0;
    if(G.parasites){ G.energy = Math.max(0, G.energy - BAT.parasiteDrain);
      R.mitesCost = true; R.paraNote = fill(COPY.mitesCost, {drain: bp(BAT.parasiteDrain)}); }
    else R.paraNote = miteCheck();
    R.learned = learned;
    R.learnNote = learned && (G.successes===3 || G.successes===7);
    const beg = presentBats(G).filter(p=> p.hungry);   // P5: the beggars you will meet at dawn
    const starv = beg.filter(p=>p.starving);
    R.begCount = beg.length; R.starvCount = starv.length;
    R.starvName = starv.length ? starv[0].name : "";
    R.fed = true;
    log(`Night ${G.night}: fed +${bp(R.meal)}${R.far ? " (far valley)" : ""}${R.cofed ? " (shared wound)" : ""}. +${R.pts}.`, "good");
    // P6a achievements that land on a fed night
    if(R.far) unlock("far");
    if(R.primeSolo) unlock("primeSolo");
    if(G.cond.key === "storm"){ G.stormFedN = (G.stormFedN || 0) + 1; if(G.stormFedN >= BAT.nights - BAT.stormStart + 1) unlock("stormFed"); }
    if(R.waited && R.board[R.cowIdx] && R.board[R.cowIdx].waited >= 2) unlock("patience");
    R.result = "night";
    return;
  }
  R.burn = unfedBurnFor(G);
  G.energy -= R.burn;
  if(R.rolled) G.hygiene = Math.max(0, G.hygiene - BAT.missHygiene);   // tumbled in the grass
  G.missStreak++;
  if(G.parasites){ G.energy = Math.max(-0.1, G.energy - BAT.parasiteDrain); R.mitesCost = true; }
  else R.paraNote = miteCheck();
  R.reason = R.rolled ? "miss" : R.leftEarly ? "left" : G.ticks <= 0 ? "ticks" : "locked";
  R.fed = false;
  log(`Night ${G.night}: unfed (${R.reason === "miss" ? "the bite missed" : R.reason === "left" ? "flew home early" : R.reason === "ticks" ? "out of dark hours" : "every wound claimed"}), -${bp(R.burn)} 🩸.`, "bad");
  if(G.energy > 0){ G.score += BAT.pts.unfed; R.consolation = BAT.pts.unfed; }
  // P10 addendum B: the beg (and a close friend's meal) now happen at the roost you pick on the
  // flight home, so every night ends with the summary and then the sleep choice.
  R.result = "night";
}
function miteCheck(){
  if(!G.parasites && G.hygiene < BAT.infestBelow && roll() < (BAT.infestBelow - G.hygiene)){
    G.parasites = true; if(G.run) G.run.mitesNew = true;
    log(`Night ${G.night}: infested with mites (hygiene ${G.hygiene.toFixed(2)}).`, "bad");
    return fill(COPY.mitesIn, {drain: bp(BAT.parasiteDrain)});
  }
  return "";
}

/* ── transition: fly home (v2 roostPhase's state half): P5 roost hazards and knowledge, then
   stamina (hunger, sickness and a wound each cost a dawn action, floor 1), selection reset,
   dawn event ── */
function rollRoostHazards(G){
  const K = BAT.roosts, R = G.run, r = G.roosts[G.myRoost], first = !r.known;
  const hz = {first, sick:false, hurt:false, cues:[], sickOver:false, hurtOver:false};
  // sickness: crowding and the roost's hidden disease score; newcomers meet new pathogens
  let ps = K.sickBase + K.sickCrowd*(r.size/K.sizeMax) + K.sickRisk*r.disease;
  if(first) ps *= K.sickFirst;
  if(G.myRoost === 0 && G.night > 1) ps *= K.sickHome;
  if(!G.sick && roll() < ps){ G.sick = K.sickNights; r.sick = true; hz.sick = true; G.ledger.sickDawns++;
    log(`Night ${G.night}: you fell ill at ${roostName(G.myRoost)}.`, "bad"); }
  // P6a: or you caught it from a contact at the last dawn (rolled at sleep, shown now)
  if(!G.sick && G.pendingSick){ G.sick = K.sickNights; hz.sick = true; hz.from = G.pendingSick; G.ledger.sickDawns++;
    log(`Night ${G.night}: you caught the cough from ${G.pendingSick}.`, "bad"); }
  G.pendingSick = null;
  // aggression: a resident you trust at your side deters it; a stranger is fair game
  const ally = G.partners.some(p=> p.alive && p.present && !p.visitor && p.trust >= K.allyTrust);
  const pa = ally ? 0 : (K.aggroBase + K.aggroRisk*Math.max(r.aggro, mods(G).aggroFloor)) * (first ? K.aggroFirst : 1);
  if(!G.hurt && roll() < pa){
    G.hurt = K.injuryNights; r.hurt = true; hz.hurt = true; G.ledger.hurtDawns++;
    G.energy = Math.max(K.injuryFloor, G.energy - K.injuryBlood);
    // the aggressor: a present resident, remembered on a chip
    const res = G.partners.filter(p=> p.alive && p.present && !p.visitor);
    if(res.length){ const a = res[Math.floor(roll()*res.length)]; a.bitYou = G.night; hz.by = a.name; }
    log(`Night ${G.night}: bitten at the roost${hz.by ? " by " + hz.by : ""}: -${bp(K.injuryBlood)} 🩸.`, "bad");
  }
  // knowledge: the first dawn reveals the roost's cues (high hidden scores only)
  if(first){
    const T = ROOST_TYPES[r.type];
    if(r.disease >= 0.6) hz.cues.push(T.cueSick);
    if(r.aggro >= 0.6) hz.cues.push(T.cueAggro);
    r.known = true; r.cues = hz.cues.slice();
    G.ledger.roostsSlept++;
  }
  r.visits++;
  hz.sickOver = G.sickOver; hz.hurtOver = G.hurtOver; G.sickOver = false; G.hurtOver = false;
  R.hazard = hz;
}
function flyHome(G){
  rollRoostHazards(G);
  const K = BAT.roosts;
  G.stamina = Math.max(1, BAT.staminaPerNight - (G.energy <= BAT.staminaLowAt ? 1 : 0)
                          - (G.sick ? K.sickStamina : 0) - (G.hurt ? K.injuryStamina : 0));
  G.selected = null; G.fx = null; G.lastAct = "";
  rollDawnEvent();
}

/* ── scene: night (the foraging summary) ──
   P11 (Bryson, on a 1920x1080 screenshot): "all it really has to say is success! and relevant
   stat / game changes". The outcome word stays as the h3; every number the prose used to carry
   is one chip in a single row; the story sentence is kept in bat-copy.js and hangs off the bite
   roll chip as its hover text, so nothing is lost and nothing else is on the screen. */
const chipEl = (txt, kind, tip)=> `<span class="wyd-ptag${kind ? " " + kind : ""}"${tip ? ` title="${esc(tip)}" data-tip="${esc(tip)}"` : ""}>${txt}</span>`;
const chipRow = list=>{ const c = list.filter(Boolean); return c.length ? `<div class="wyd-chips">${c.join("")}</div>` : ""; };
function biteRollLine(R){
  if(!R.rolled) return "";
  const story = stripTags(R.fedTonight ? COPY.fed : COPY.miss);
  return `<span class="wyd-ptag wyd-roll" title="${esc(story)}" data-tip="${esc(story)}">${fill(COPY.biteRollLine, {r: R.rollValue.toFixed(2), p: fmtP(R.pFailUsed), result: R.fedTonight ? COPY.rollFed : COPY.rollWoke})}</span>`;
}
/* the encounter that opened the wound, as one chip (the bite scene that shows it is passed
   through under reduced motion, so this is the only place some players read it) */
function encChip(G){
  const R = G.run, e = R.enc && R.enc.last;
  if(!e || !e.ok || e.verb === "leave") return "";
  const who = whoAt(G, R.board[R.enc.cowIdx]);
  if(e.verb === "join") return chipEl(fill(R.cofedKind === "rival" ? COPY.chipCofedRival : COPY.chipCofedMate, {name: esc(who.name)}));
  if(e.verb === "displace") return chipEl(fill(COPY.chipDisplaced, {name: esc(who.name)}));
  return chipEl(COPY.chipWaitFree);
}
const SCENE_NIGHT = {
  label: G=> roundLabel(G, "foraging"),
  mode: "night",
  next: ["roostPick", "dawn", "rescue", "death", "begWait"],   // P22: night 1 goes straight to the arrival
  render(G){
    const R = G.run, C = [];
    let head;
    if(R.fed){
      head = COPY.nightFedHead;
      C.push(chipEl(fill(COPY.chipMeal, {cow: esc(cap(R.cowName)), meal: bp(R.meal)}), "good"));
      C.push(chipEl(fill(COPY.chipPts, {pts: R.pts - (R.primeSolo ? BAT.pts.primeSolo : 0) - (R.farFed ? BAT.pts.farFed : 0)}), "good"));
      if(R.primeSolo) C.push(chipEl(fill(COPY.chipPrimeSolo, {pts: BAT.pts.primeSolo}), "good"));
      if(R.farFed) C.push(chipEl(fill(COPY.chipFarFed, {pts: BAT.pts.farFed}), "good"));
      if(R.waited) C.push(chipEl(COPY.chipWaited));
      C.push(encChip(G));
      if(R.learnNote) C.push(chipEl(COPY.chipLearned, "good"));
    } else {
      head = R.reason === "miss" ? COPY.missHead : COPY.emptyHead;
      C.push(chipEl(fill(R.far ? COPY.chipUnfedFar : COPY.chipUnfed, {burn: bp(R.burn)}), "hot"));
      if(R.consolation) C.push(chipEl(fill(COPY.chipConsolation, {pts: R.consolation}), "good"));
    }
    // the night's own points, which the tester never saw named; only when you will live to bank them
    if(BAT.pts.night && G.energy > 0) C.push(chipEl(fill(COPY.chipNight, {pts: BAT.pts.night}), "good"));
    if(R.fed){
      C.push(R.starvCount ? chipEl(R.starvCount === 1 ? fill(COPY.chipStarvOne, {name: esc(R.starvName)}) : fill(COPY.chipStarvMany, {n: R.starvCount}), "hot")
        : R.begCount ? chipEl(fill(COPY.chipBegs, {n: R.begCount, s: R.begCount > 1 ? "s" : ""}), "hot")
        : chipEl(COPY.chipNoBegs));
    }
    if(R.mitesNew) C.push(chipEl(fill(COPY.chipMitesIn, {drain: bp(BAT.parasiteDrain)}), "hot"));
    else if(R.mitesCost) C.push(chipEl(fill(COPY.chipMitesCost, {drain: bp(BAT.parasiteDrain)}), "hot"));
    if(!R.fed && G.energy <= BAT.desperateAt && G.energy > 0) C.push(chipEl(COPY.chipHungry, "hot"));
    if(damperOn(G)) C.push(chipEl(COPY.chipDamper, "", fill(COPY.damperNote, {n: G.missStreak, mod: fmtTerm(BAT.damperMod)})));
    return `<div class="wyd-round">${roundLabel(G, "foraging")}</div>
      <h3>${head}</h3>
      ${chipRow(C)}
      <div class="wyd-choices"><button class="btnx btnx--solid" id="wyd-next">${COPY.nextDawn}</button></div>`;
  },
  /* P22 (Bryson: "the user should not be asked where to sleep the first night because there isn't a
     choice anyway"): night 1 is locked to the hollow, so skip the roostPick scene and settle at home
     on the way past. Storm nights keep theirs, because the storm itself is the thing worth reading. */
  choices: ()=> [{id:"wyd-next",
    apply: G=>{ if(G.night === 1){ commitRoost(G, G.myRoost); resolveArrival(G); } },
    goto: G=> G.night === 1 ? G.run.arrival : "roostPick"}],
};

/* ── scene: roostPick (P10 addendum B, Bryson: "you should choose where to roost each night when
   returning from feeding"). The colony's roosts hang across the stage; a tap selects one (the bat
   flies over, the card below fills). Night 1 and the storms lock the hollow: card only, no stage.
   Continuing settles presence at that roost, then the arrival: a friend's meal, or the beg. ── */
const SCENE_ROOSTPICK = {
  label: G=> roundLabel(G, "flying home"),
  mode: "night",
  stage: true,
  next: ["dawn", "rescue", "death", "begWait"],
  render(G){
    const locked = G.cond.key === "storm", picked = locked || (G.run && G.run.roostPicked);   // P22: night 1 never reaches this scene
    // P18 (Bryson): on a pick night the scene is the stage + one card per roost + the button; the explanation
    // is a one-time popup (pops below). Locked nights keep their one-line reason.
    return `<div class="wyd-round">${roundLabel(G, "flying home")}</div>
      <h3>${COPY.roostPickHead}</h3>
      ${locked ? `<div class="wyd-cols"><div>${roostIntro(G)}</div><div>${roostCards(G)}
          <div class="wyd-choices"><button class="btnx btnx--solid" id="wyd-sleepat">${COPY.roostPickBtn}</button></div></div></div>`
        : `${roostCards(G)}
          <div class="wyd-choices"><button class="btnx btnx--solid" id="wyd-sleepat"${picked ? "" : " disabled"}>${picked ? COPY.roostPickBtn : (onPhone() ? COPY.roostPickWaitShort : COPY.roostPickWait)}</button></div>`}`;
  },
  pops(G){
    const locked = G.cond.key === "storm";
    if(!locked && !helpSeen("roost")){ markHelp("roost"); popup({kind:"help", kicker: COPY.helpKicker, title: COPY.helpRoostHead, body: `<p class="wyd-story">${COPY.helpRoostText}</p>`}); }
  },
  choices: ()=> [{id:"wyd-sleepat", apply: G=>{
    commitRoost(G, typeof G.roostSel === "number" ? G.roostSel : G.myRoost);
    resolveArrival(G);
  }, goto: G=> G.run.arrival}],
  wire(G){
    const storm = G.cond.key === "storm", locked = storm;
    if(locked){ stageOff(); return; }
    const key = "roost:" + G.night;
    let st = (STAGE && !STAGE.dead && STAGE_KEY === key) ? STAGE : null;
    if(!st){
      const sel = typeof G.roostSel === "number" ? G.roostSel : G.myRoost;
      st = stageOn({moon:G.cond.moon, storm:G.cond.stormy, far:false, phase:"dawn", look:480, cows:[], slots:[],
        roosts: G.roosts.filter(r=> !r.gone).map(r=> ({id:r.id, sil: ROOST_TYPES[r.type].sil, tag: ROOST_TYPES[r.type].name})),   // P19: the name only; the card says home / unknown
        at: G.myRoost});
      STAGE_KEY = st ? key : ""; STAGE_AT = null;
      if(!st) return;
      st.setPhase("dawn");
      st.caption("flying home · the colony", "The colony's roosts across the valley; your bat is looking for a place to sleep");
      if(G.run.roostPicked && sel !== G.myRoost) st.goRoost(sel, 0);
    }
    st.choice(true);
    // P18: until a pick, the bat circles between the roosts (instant hops under reduced motion are skipped)
    if(!G.run.roostPicked && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)){
      const b = beatToken(), ids = G.roosts.filter(r=> !r.gone).map(r=> r.id);
      (async ()=>{
        let i = 0;
        while(live(b) && !G.run.roostPicked && !st.dead){
          const pp = st.perchOf(ids[i % ids.length]); i++;
          if(pp) await st.hover(pp.x + (i % 2 ? -60 : 60), pp.y - 90, 1500);
          await new Promise(r=> setTimeout(r, 250));
        }
      })();
    }
    G.roosts.forEach(r=>{
      const T = ROOST_TYPES[r.type];
      st.labelRoost(r.id, `${cap(T.name)}${r.id === 0 ? ", home" : ""}${r.known ? "" : ", unknown"}${G.run.roostPicked && r.id === G.roostSel ? ", selected" : ""}`);
      const el = document.querySelector(`#wyd-stagehost .wst-roostpick[data-roost="${r.id}"]`);
      if(el) el.classList.toggle("wst-unknown", !r.known);
    });
    st.selectRoost(G.run.roostPicked ? G.roostSel : -1);
    // P19: a roost name that would run off the picture's edge anchors inward instead of clipping
    const clampTags = ()=>{
      const box = document.querySelector("#wyd-stagehost .wyd-stage"); if(!box) return;
      const sb = box.getBoundingClientRect();
      const tags = Array.from(document.querySelectorAll("#wyd-stagehost .wst-roostpick .wst-tag"));
      tags.forEach(t=>{
        if(!t.dataset.y0) t.dataset.y0 = t.getAttribute("y");
        t.setAttribute("y", t.dataset.y0); t.setAttribute("text-anchor", "middle");
        const b = t.getBoundingClientRect();
        if(b.right > sb.right - 6) t.setAttribute("text-anchor", "end");
        else if(b.left < sb.left + 6) t.setAttribute("text-anchor", "start");
      });
      // P20: big phone labels that still collide take turns on a second line above
      tags.sort((a, b)=> a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      let prev = null, lifted = false;
      tags.forEach(t=>{
        const b = t.getBoundingClientRect();
        if(prev && b.left < prev.right + 4 && !lifted){ t.setAttribute("y", String(+t.dataset.y0 - 36)); lifted = true; }
        else lifted = false;
        prev = t.getBoundingClientRect();
      });
    };
    const stageEl = document.querySelector("#wyd-stagehost .wyd-stage"); if(stageEl) stageEl.dataset.nroosts = String(G.roosts.filter(r=> !r.gone).length);   // P20: phone label size follows the roost count
    clampTags(); setTimeout(clampTags, 350);
    const pickRoost = id=>{
      id = +id;
      if(G.run.roostPicked && id === G.roostSel) return;
      sfx("pick");
      G.roostSel = id; G.run.roostPicked = true;
      if(window.WydLog) WydLog.pick("roostPick", {id:"wyd-roost-" + id}, G);
      renderScene("roostPick", {wipe:false});   // re-wires: the same stage instance is reused (key match)
      const b = beatToken();
      (async ()=>{ if(!live(b)) return; st.caption("flying home · " + roostName(id), "Your bat flies to " + roostName(id)); await st.goRoost(id, 900); })();
    };
    st.onRoost(pickRoost);
    $$("#wyd-scene .wyd-roostcard.pickable[data-roost]").forEach(c=>{
      c.onclick = ()=> pickRoost(c.dataset.roost);
      c.onkeydown = e=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pickRoost(c.dataset.roost); } };
    });
  },
};

/* ── scene: rescue (no blood left, a roost-mate came through) ── */
/* ── P29 scene: the beg, played out (Bryson: "an animation that builds anticipation for a bat
   saving you (or not saving you) would be great").
   The outcome is already decided in begAtRoost; this scene only SHOWS it. Every bat who was asked
   is named in turn on the roost web: her node lights, a beat passes, and she either turns away or
   comes. The last one either saves you or does not, and the scene lands on rescue or death.
   Timed like the other suspense scenes: a Skip button, and a straight pass-through under reduced
   motion, so nothing here can strand a player and the suites are unaffected. ── */
const BEG_STEP_MS = 950, BEG_SHOW_MAX = 4;
const BEGWAIT_LAND = {id:"land", goto: G=> G.run.begOutcome || "death"};
const SCENE_BEGWAIT = {
  label: G=> roundLabel(G, COPY.roundNoBlood),
  mode: "night",
  next: ["rescue", "death"],
  auto: ()=> reduceMotion() ? BEGWAIT_LAND : null,
  render(G){
    const seq = G.run.begSeq || [];
    return `<div class="wyd-round">${roundLabel(G, COPY.roundNoBlood)}</div>
      <h3>${COPY.begWaitHead}</h3>
      <p class="wyd-story wyd-begline" id="wyd-begline">${seq.length ? "" : COPY.begWaitNone}</p>
      ${netSvg()}
      <div class="wyd-choices"><button class="btnx" id="wyd-skip">${COPY.skip}</button></div>`;
  },
  wire(G){
    const seq = (G.run.begSeq || []).slice(0, BEG_SHOW_MAX);
    let done = false;
    const land = ()=>{ if(done) return; done = true; pick(BEGWAIT_LAND); };
    const skip = $("#wyd-skip"); if(skip) skip.onclick = land;
    const line = $("#wyd-begline");
    const node = pid=> document.querySelector(`#wyd-scene .node[data-pid="${pid}"]`);
    if(!seq.length){ at(1200, land); return; }
    /* a raw timer, deliberately NOT in TIMERS, so that a cancelled beat can never strand the
       player on this screen: the same failsafe pattern P25 added to the encounter. */
    /* This scene has NO stage, so live() (which requires one) is the wrong guard: using it bailed
       the chain on the very first await AND cleared the failsafe, which stranded the player on the
       beg screen. The guard is P25's: keep going only while THIS wire's own markup is in the
       document, and never clear the failsafe on a bail. */
    const failsafe = setTimeout(land, seq.length * BEG_STEP_MS + 3000);
    const mine = ()=> !!line && document.body.contains(line);
    (async ()=>{
      for(let i = 0; i < seq.length; i++){
        const h = seq[i], el = node(h.pid);
        if(el) el.classList.add("begasking");
        if(mine()) line.textContent = fill(COPY.begAsking, {name: h.name});
        sfx("pick");
        await waitMs(BEG_STEP_MS * 0.55);
        if(!mine()) return;                      // the failsafe stays armed on purpose
        if(el){ el.classList.remove("begasking"); el.classList.add(h.ok ? "begyes" : "begno"); }
        line.textContent = fill(h.ok ? COPY.begYes : COPY.begRefused, {name: h.name});
        if(h.ok){
          emitStream(h.pid, {color:"var(--g-accent)", r:4, count:8, interval:110, travel:900, reverse:true});
          sfx("great");
        } else sfx("bad");
        await waitMs(BEG_STEP_MS * 0.45);
        if(!mine()) return;
      }
      if(G.run.begOutcome !== "rescue" && mine()) line.textContent = COPY.begAllRefused;
      await waitMs(500);
      clearTimeout(failsafe);
      land();
    })();
  },
};

const SCENE_RESCUE = {
  label: G=> roundLabel(G, COPY.roundNoBlood),
  mode: "night",
  next: ["dawn"],
  render(G){
    const R = G.run;
    return `<div class="wyd-round">${roundLabel(G, COPY.roundNoBlood)}</div>
      <h3>${COPY.rescueHead}</h3>
      ${chipRow([`<span class="wyd-ptag wyd-roll">${fill(COPY.chipRescueOdds, {p: fmtP(R.pAny)})}</span>`,
                 chipEl(fill(COPY.chipSavedBy, {name: esc(R.savior)}), "good"),
                 chipEl(fill(COPY.chipReserve, {n: Math.max(0, G.energy).toFixed(1)}))])}
      <p class="wyd-story">${fill(COPY.rescueStory, {name: esc(R.savior)})}</p>
      <div class="wyd-reallife"><span class="rl-k">${COPY.realLife}</span><div>${COPY.rescueReal}</div>
      <span class="cite">${CITES.wilkinson1984} · ${CITES.carter2013}</span></div>
      <div class="wyd-choices"><button class="btnx btnx--solid" id="wyd-next">${COPY.nextDawn}</button></div>`;
  },
  choices: ()=> [{id:"wyd-next", apply: flyHome, goto:"dawn"}],
};

/* ── scene: death (no blood left, no one came) ── */
const SCENE_DEATH = {
  label: G=> roundLabel(G, COPY.roundNoBlood),
  mode: "night",
  next: ["end"],
  render(G){
    const R = G.run;
    const tried = R.tried && R.tried.length ? fill(COPY.deathTried, {names: R.tried.join(" and ")}) : COPY.deathNoOne;
    return `<div class="wyd-round">${roundLabel(G, COPY.roundNoBlood)}</div>
      <h3>${COPY.deathHead}</h3>
      ${chipRow([`<span class="wyd-ptag wyd-roll hot">${fill(COPY.chipRescueOdds, {p: fmtP(R.pAny)})}</span>`])}
      <p class="wyd-story">${fill(COPY.starveLine, {tried: esc(tried)})}</p>
      <div class="wyd-reallife"><span class="rl-k">${COPY.realLife}</span><div>${COPY.deathReal}</div>
      <span class="cite">${CITES.wilkinson1984}</span></div>
      <div class="wyd-choices"><button class="btnx btnx--solid" id="wyd-next">${COPY.nextDawn}</button></div>`;
  },
  choices: ()=> [{id:"wyd-next", goto:"end"}],
};

/* ── dawn events (rolled in flyHome, before the dawn save) ── */
function rollDawnEvent(){
  G.event = null;
  const alive = presentBats(G);   // P5: dawn events happen among the bats hanging beside you
  // a stranger claims an empty spot at the roost you woke at (takes priority over random
  // events); the pool is what is left of NAME_POOL, per run
  const deadSlot = G.partners.find(p=>!p.alive && !p.replaced && p.homeRoost === G.myRoost);
  const graceOver = G.night > (G.lastDeathNight||0) + 1;   // let a death breathe for a night
  if(deadSlot && graceOver && G.strangerPool.length && roll() < BAT.strangerClaimP){
    const name = G.strangerPool.shift();
    deadSlot.replaced = true;
    const s = makeBat(deadSlot.id, name, drawTrait(G.roosts[G.myRoost].bondQ), G.myRoost,
                      BAT.strangerTrust.lo + BAT.strangerTrust.span*roll());
    s.energy = BAT.strangerEnergy; s.fed = true; s.present = true; s.stranger = true;
    G.partners[deadSlot.id] = s;
    for(let j=0;j<G.partners.length;j++){ if(j!==s.id){ G.pp[s.id][j] = G.pp[j][s.id] = 0.05+0.15*roll(); } }
    G.event = {type:"stranger", id:s.id,
      text:`${fill(COPY.strangerClaim, {old: esc(deadSlot.name), name: "<strong>" + esc(name) + "</strong>"})} ${COPY.strangerNote}`};
    log(`Dawn: ${name} joins the roost.`);
    return;
  }
  if(roll() > BAT.eventP || alive.length < 3) return;
  const pool = ["squabble","pup"].filter(t=>t!==G.lastEvent);   // P9: the dawn cold snap retired (the coldsnap surprise covers it)
  const type = pool[Math.floor(roll()*pool.length)];
  G.lastEvent = type;
  if(type==="squabble"){
    const pairs = [];
    for(const a of alive) for(const b of alive) if(a.id<b.id && G.pp[a.id][b.id]>0.3) pairs.push([a,b]);
    if(!pairs.length) return;
    const [a,b] = pairs[Math.floor(roll()*pairs.length)];
    G.pp[a.id][b.id] = G.pp[b.id][a.id] = Math.max(0.02, G.pp[a.id][b.id]-0.25);
    G.event = {type:"squabble", ids:[a.id,b.id],
      text:`<strong>${fill(COPY.squabble, {a: esc(a.name), b: esc(b.name)})}</strong>
        ${fill(COPY.squabbleNote, {pct: Math.round((BAT.eventSquabbleMult - 1)*100)})}`};
  } else if(type==="pup"){
    const p = alive[Math.floor(roll()*alive.length)];
    G.event = {type:"pup", id:p.id,
      text:`<strong>${fill(COPY.pup, {name: esc(p.name)})}</strong> ${fill(COPY.pupNote, {mult: fmtN(BAT.eventPupMult)})}`};
  } else {
    G.event = {type:"coldsnap",
      text:`<strong>${COPY.coldsnap}</strong> ${fill(COPY.coldsnapNote, {cost: BAT.coldsnapLongCost})}`};
  }
}

/* ── scene: dawn (the roost): network + partner panel; actions re-render in place ── */
function eventMult(p, isShare){
  if(!G.event) return 1;
  if(G.event.type==="squabble" && !isShare && G.event.ids.includes(p.id)) return BAT.eventSquabbleMult;
  if(G.event.type==="pup" && G.event.id===p.id) return BAT.eventPupMult;
  return 1;
}
const NET = {cx:200, cy:152, rx:114, ry:76, ox:170, oy:116, crowdAt:9, wide:1.3, tall:1.28};   // P13: crowdAt = present bats before the ring splits; wide/tall = the small-roost ring scale
/* P26 (Bryson: "the network is way too small to see in the mobile version"). It was never the
   layout, it was the BOX. The web draws into a 400x310 viewBox, but on the phone dawn with a bat
   selected the flex column squeezes the element to about 302x146, and preserveAspectRatio then has
   to fit a 1.29-shaped drawing into a 2.07-shaped slot: the picture rendered at 47%, with a third
   of the width left empty down each side, and a bat's name came out at 5 screen pixels.
   So on a narrow screen the web now draws into a WIDE, SHORT box that matches the shape it is
   actually given, with bigger names and a bigger invisible tap disc. The layout logic is untouched;
   every coordinate that used to be a constant is now read from netBox(). */
const netPhone = ()=> onPhone();
function netBox(){
  return netPhone()
    ? {w:400, h:190, cx:200, cy:98, rx:152, ry:44, ox:186, oy:60, wide:1, tall:1, hit:33, font:1.28, pad:6}
    : {w:400, h:310, cx:NET.cx, cy:NET.cy, rx:NET.rx, ry:NET.ry, ox:NET.ox, oy:NET.oy,
       wide:NET.wide, tall:NET.tall, hit:24, font:1, pad:6};
}
/* P5: the network draws the bats PRESENT tonight (plus the roost's dead, greyed); nodePos is
   the index in that list, so the particle streams look the bat up by pid */
function netList(G){
  const dead = G.partners.filter(p=> !p.alive && p.homeRoost === G.myRoost && !p.replaced);
  return presentBats(G).concat(dead);
}
/* P11 (Bryson, on a 16-bat dawn: "their names even overlap"): TWO RINGS. The bats you know, and
   anyone begging tonight, hang on the inner ring with their names. Everyone else is a small
   unnamed node on the outer ring, a bat you barely know; her name is on her node's <title>, her
   aria-label and the who-needs-you strip, and it appears on the web the moment she is selected.
   One layout function, so netSvg, nodePos and the bead streams can never disagree. */
function netLayout(G){
  const L = netList(G), K = BAT.roosts, inner = [], outer = [];
  // P13 (Bryson): a small roost (<= NET.crowdAt present) is one big ring with every name at full size;
  // only a crowded one splits into the named inner ring and the unnamed outer ring
  const alive = L.filter(p=> p.alive).length, crowded = alive > NET.crowdAt;
  L.forEach(p=>{
    const begs = p.alive && (p.starving || p.hungry) && !p.shared;
    if(p.alive && (!crowded || p.trust >= K.knownTrust || begs)) inner.push(p); else outer.push(p);
  });
  // a dawn among strangers would otherwise be one bare ring of dots: the closest few are always named
  if(inner.length < 3){
    outer.filter(p=> p.alive).sort((a, b)=> b.trust - a.trust).slice(0, 3 - inner.length).forEach(p=>{
      inner.push(p); outer.splice(outer.indexOf(p), 1);
    });
  }
  const B = netBox();
  const ring = (i, n, rx, ry, off)=>{ const a = -Math.PI/2 + off + i*(2*Math.PI/Math.max(1, n)); return {x: B.cx + rx*Math.cos(a), y: B.cy + ry*Math.sin(a), a}; };
  const pos = {};
  const sx = crowded ? 1 : B.wide, sy = crowded ? 1 : B.tall;   // fill the box when there is room
  inner.forEach((p, i)=> pos[p.id] = Object.assign(ring(i, inner.length, B.rx*sx, B.ry*sy, 0), {r: crowded ? 15 : 17, ring:"in"}));
  outer.forEach((p, i)=> pos[p.id] = Object.assign(ring(i, outer.length, B.ox, B.oy, Math.PI/Math.max(1, outer.length)), {r:12, ring:"out"}));   // P12 (Bryson): not tiny, or they read as pups
  /* P23 (Bryson: "something seems wrong with the bat in red, it has a second circle at it"). The two
     rings are spaced evenly but INDEPENDENTLY, so a node on one can land on top of a node on the
     other. It bit on an uncrowded dawn, where every living bat is on the inner ring and the outer
     ring holds only the roost's dead: 8 present put a bat at the bottom of the inner ring (200,249)
     and the single dead bat's half-turn offset put its ghost at (200,268), 18.7 apart with radii
     summing to 29, so the ghost drew as a second circle around a living bat. Walk any outer node
     around its ellipse until it clears everything already placed. */
  const clashes = (q, o)=> Math.hypot(q.x - o.x, q.y - o.y) < q.r + o.r + 6;
  const placed = inner.map(p=> pos[p.id]);
  outer.forEach(p=>{
    const q = pos[p.id];
    for(let t = 0; t < 36 && placed.some(o=> clashes(q, o)); t++){
      q.a += Math.PI / 18;
      q.x = B.cx + B.ox * Math.cos(q.a);
      q.y = B.cy + B.oy * Math.sin(q.a);
    }
    placed.push(q);
  });
  return {list:L, inner, outer, pos, crowded};
}
const nodePos = pid=>{ const q = netLayout(G).pos[pid], B = netBox(); return q ? {x:q.x, y:q.y} : {x:B.cx, y:B.cy}; };
/* the label pass: names sit outside their node, below on the lower half and above on the upper
   half; a label that would collide flips to the other side, and one that still collides is
   dropped (its bat keeps her aria-label, her <title> and her chip in the who-needs-you strip).
   Highest priority first: starving, then begging, then the deepest bonds, and always the bat you
   have selected. */
function netLabels(G, lay){
  const K = BAT.roosts, cands = [], B = netBox();
  lay.inner.forEach(p=> cands.push({p, prio:(p.starving ? 40 : p.hungry ? 30 : 0) + (p.trust >= K.knownTrust ? 10 : 0) + p.trust}));
  // P13 (Bryson): in a crowded roost the outer ring is unnamed by default (hover / tap shows the name); a small roost has no outer ring
  if(G.selected !== null){
    const sp = lay.list.find(x=> x.id === G.selected && x.alive);
    if(sp && !cands.some(c=> c.p.id === sp.id)) cands.push({p:sp, prio:100});
    cands.forEach(c=>{ if(c.p.id === G.selected) c.prio = 100; });
  }
  cands.sort((a, b)=> b.prio - a.prio);
  const boxes = [{x0:B.cx-26, x1:B.cx+26, y0:B.cy-22, y1:B.cy+12}];   // YOU, at the middle
  lay.list.forEach(p=>{ const q = lay.pos[p.id]; boxes.push({x0:q.x-q.r, x1:q.x+q.r, y0:q.y-q.r-8, y1:q.y+q.r}); });
  const hit = b=> boxes.some(o=> !(b.x1 < o.x0 || b.x0 > o.x1 || b.y1 < o.y0 || b.y0 > o.y1));
  const out = {};
  cands.forEach(({p, small})=>{
    const q = lay.pos[p.id];
    const txt = p.name + (p.fedYou ? " ♥" : "") + (p.youSaved ? " ✚" : "");
    const w = (small ? 4.9 : 6.1)*B.font*txt.length + 6, h = (small ? 11 : 13)*B.font;
    const lo = q.y + q.r + (small ? 13 : 16)*B.font, hi = q.y - q.r - (small ? 10 : 12)*B.font;
    const x0 = clamp(q.x, B.pad + w/2, B.w - B.pad - w/2);
    const ys = Math.sin(q.a) >= -0.15 ? [lo, hi] : [hi, lo];
    // below or above first; then nudged sideways; the smaller type for the outer ring makes room
    const tries = [];
    ys.forEach(y=>{ tries.push([x0, y]); });
    ys.forEach(y=>{ tries.push([clamp(x0 - w*0.6, B.pad + w/2, B.w - B.pad - w/2), y], [clamp(x0 + w*0.6, B.pad + w/2, B.w - B.pad - w/2), y]); });
    for(const [x, y] of tries){
      if(y - h < 2 || y + 4 > B.h - 2) continue;
      const box = {x0:x - w/2, x1:x + w/2, y0:y - h, y1:y + 4};
      if(hit(box)) continue;
      boxes.push(box); out[p.id] = {x, y, txt, small: !!small};
      return;
    }
  });
  return out;
}
function netSvg(){
  const B = netBox(), cx = B.cx, cy = B.cy, K = BAT.roosts;
  const lay = netLayout(G), L = lay.list, n = L.length;
  const labels = netLabels(G, lay);
  const P = id=> lay.pos[id];
  let pp = "", edges = "", nodes = "";
  /* P11: the faint web behind the bats is drawn only between two named (inner) bats, or where the
     friendship is a strong one; at 16 present bats every pair drawn read as noise */
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
    if(!L[i].alive || !L[j].alive) continue;
    const b = G.pp[L[i].id][L[j].id];
    const bothIn = P(L[i].id).ring === "in" && P(L[j].id).ring === "in";
    if(b > 0.28 && (bothIn || b >= 0.5)) pp += `<line x1="${P(L[i].id).x.toFixed(0)}" y1="${P(L[i].id).y.toFixed(0)}"
      x2="${P(L[j].id).x.toFixed(0)}" y2="${P(L[j].id).y.toFixed(0)}" stroke="currentColor"
      stroke-width="${(0.4 + b*2.2).toFixed(1)}" opacity="${(0.08 + b*0.16).toFixed(2)}"/>`;
  }
  L.forEach(p=>{
    const q = P(p.id), x = q.x, y = q.y, r = q.r, small = q.ring === "out";
    if(!p.alive){
      nodes += `<g class="node gone" aria-hidden="true"><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}"/></g>`;
      return;
    }
    edges += `<line class="edge" x1="${cx}" y1="${cy}" x2="${x.toFixed(0)}" y2="${y.toFixed(0)}"
      stroke-width="${(0.6 + p.trust*6).toFixed(1)}" opacity="${(0.2 + p.trust*0.65).toFixed(2)}"/>`;
    const begState = p.starving && !p.shared ? "starving" : (p.hungry && !p.shared ? "hungry" : "");
    const far = !begState && !p.cough && p.trust < K.knownTrust;   // a bat you barely know: a grey ring
    const cls = "node " + q.ring + (begState === "starving" ? " starving" : begState === "hungry" ? " hungry" : "")
      + (G.selected === p.id ? " sel" : "") + (p.visitor ? " visitor" : "") + (p.cough ? " cough" : "") + (far ? " far" : "");
    const lab = labels[p.id];
    nodes += `<g class="${cls}" data-pid="${p.id}" tabindex="0" role="button"
      aria-label="${esc(p.name)}, bond ${p.trust.toFixed(2)}${begState ? ", " + begState : ""}${p.visitor ? ", visiting" : ""}${p.cough ? ", coughing" : ""}">
      <title>${esc(p.name)} · bond ${p.trust.toFixed(2)}</title>
      <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${small ? B.hit : B.hit + 2}" style="fill:transparent; stroke:none; animation:none; cursor:pointer"/>
      ${G.selected === p.id ? `<circle class="selring" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r + 7}"/>` : ""}
      ${EARS(x, y, small ? 0.85 : 1)}
      <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" style="stroke-width:${(1.3 + p.trust*3.2).toFixed(1)}"/>
      ${lab ? `<text class="${lab.small ? "small" : ""}" x="${lab.x.toFixed(0)}" y="${lab.y.toFixed(0)}">${esc(lab.txt)}</text>` : ""}
    </g>`;
  });
  const many = lay.crowded;
  return `<svg class="wyd-net${many ? " wyd-net-many" : ""}${netPhone() ? " wyd-net-flat" : ""}" viewBox="0 0 ${B.w} ${B.h}" role="img"${many ? ' style="font-size:.82em"' : ""}
    aria-label="The roost's social network tonight: you at the center, the bats you know on the inner ring and the bats you barely know around them, every one named; ring colour shows who is hungry and line thickness shows your bond. Starving bats will die without blood.">
    ${pp}${edges}
    <g class="node you">${EARS(cx, cy, 1.15)}<circle cx="${cx}" cy="${cy}" r="17"/><text x="${cx}" y="${cy+4}">YOU</text></g>
    ${nodes}</svg>
    <p class="wyd-netlegend">${COPY.netLegend}</p>`;
}
/* the bat-ear node motif from the approved prototype (two small triangles above the circle) */
const EARS = (x, y, s)=>{ s = s || 1; return `<g class="ears" transform="translate(${(+x).toFixed(0)},${(+y).toFixed(0)}) scale(${s})"><path d="M-11,-10 L-6,-22 L-2,-13 Z"/><path d="M11,-10 L6,-22 L2,-13 Z"/></g>`; };
function traitLine(p){
  const T = TRAITS[p.trait];
  if(!p.seen || !T.tag) return "";
  // P24: the tag alone was the whole label; the hint beside it says what it costs you
  /* P29: on a phone the chip row scrolls and long tags ended in an ellipsis, so a tap opens the
     explanation rather than relying on a hover a phone cannot do. */
  return `<span class="wyd-ptag wyd-ptrait wyd-explain" role="button" tabindex="0" data-eh="${esc(cap(T.tag))}" data-ex="${esc(T.hint)}" title="${esc(T.hint)}" aria-label="${esc(T.tag)}: ${esc(T.hint)}">${T.tag}</span>`;
}
/* P24: the same hint as a sentence under the chips, so it is there every time you open her
   panel rather than only on the night you first worked her out */
function traitHintLine(p){
  const T = TRAITS[p.trait];
  if(!p.seen || !T.tag || !T.hint) return "";
  return `<p class="wyd-story wyd-traithint">${fill(COPY.traitHint, {tag: cap(T.tag), hint: T.hint})}</p>`;
}
function reciprocate(p, pr){
  const td = TRAITS[p.trait];
  if(td.recipMult) pr *= td.recipMult;
  // P5: a warm roost grooms you back more readily; sick bats are groomed less; a stranger on her
  // first dawn at a roost is groomed back by half
  if(BAT.roosts.warmRecip) pr *= warmMult(G);
  if(G.sick) pr *= BAT.roosts.sickGroomBack;
  if(p.cough) pr *= BAT.season.coughGroomBack;   // P6a: a coughing bat grooms back less
  if(G.run && G.run.newRoost && !mods(G).strangerEase) pr *= BAT.roosts.strangerRecip;   // P9: unless the year makes strangers welcome
  if(roll() < Math.min(BAT.recipCap, pr)){
    G.hygiene = Math.min(1, G.hygiene + BAT.groomBackHyg);
    emitStream(p.id, {color:"var(--g-warm)", r:3, count:6, interval:240, travel:1400,
      reverse:true, delay:1200});
    if(!p.seen && (p.trait==="generous")){ p.seen = true; }
    let cured = "";
    if(G.parasites && G.hygiene >= BAT.cureAbove){
      G.parasites = false; cured = COPY.mitesGone;
      log(`Night ${G.night}: ${p.name} groomed the mites off you.`, "good");
    } else {
      log(`Night ${G.night}: ${p.name} grooms you back (hygiene ${G.hygiene.toFixed(2)}).`, "good");
    }
    const flavor = (!onPhone() && p.trait === "generous") ? ` ${TRAITS.generous.hint.charAt(0).toUpperCase()+TRAITS.generous.hint.slice(1)}.` : "";
    return fill(COPY.groomBack, {name: esc(p.name)}) + cured + flavor;
  }
  if(!p.seen && p.trait==="stingy" && roll()<0.6){ p.seen = true;
    return ` ${esc(p.name)} ${TRAITS.stingy.hint}.`; }
  return "";
}
/* P25 finding 5: "You caught it from Hazel" arrived out of nowhere. A sickly year says every bat
   you touch is a risk; this is that risk, per bat, as a number, priced where you decide. 0 when you
   are already ill (you cannot catch it twice) or the season carries nothing to catch. */
function catchP(G, p){
  if(!G.season || G.sick) return 0;
  return Math.min(0.95, BAT.season.contactSick * G.season.contagion * (p.cough ? BAT.season.sickBatMult : 1));
}
/* ── P26 the continuous give/groom bars ──
   Every curve here is BAT.slider, solved in bat-data.js from the quick groom, the long groom and
   the three share tiers, so a third of the bar pays exactly what a quick groom paid and 0.15 blood
   pays exactly what a sip paid. Bryson's rules, in order: pick a bat then choose how much; 5%
   steps; both bars read out of 100; a bar cannot go past what you have; and giving blood costs
   that same percentage of the night's stamina. */
const SL = ()=> BAT.slider;
const snapPct = f=> Math.max(0, Math.floor(f / SL().step + 1e-9) * SL().step);
const pctI = f=> Math.round(f * 100);
/* the cold snap makes grooming cheap; in the tier model it halved the long groom's cost, here it
   scales what a groom takes off the bar */
const groomCostMult = G=>{ const lc = mods(G).longCost; return lc == null ? 1 : lc / BAT.groomLong.cost; };
const groomGainAt = f=> BAT.groomQuick.gain * Math.pow(f / SL().quickAt, SL().groomPow);
function groomRecipAt(f, trust){
  const gq = BAT.groomQuick, gl = BAT.groomLong, S = SL();
  const slope = gq.recipSlope + (gl.recipSlope - gq.recipSlope) * (f - S.quickAt) / (S.longAt - S.quickAt);
  return S.recipBase * f + trust * slope * Math.min(1, f / S.quickAt);   // a token brush earns a token chance
}
const satAt = (c, b)=> c.max * (1 - Math.exp(-b / c.lam));
const staminaFrac = G=> Math.max(0, G.stamina) / BAT.staminaPerNight;
/* how far each bar may travel: what you hold, rounded DOWN to a 5% stop so it can never overdraw */
const groomCapPct = G=> snapPct(staminaFrac(G) / groomCostMult(G));
const giveCapPct = G=> snapPct(Math.min(G.energy / BAT.energyCap, staminaFrac(G)));
/* where the bars sit. Kept per selected bat so a redraw does not throw the player's choice away. */
let SLPOS = {pid:null, groom:null, give:null};
function slPos(G, p){
  if(SLPOS.pid !== p.id){
    SLPOS = {pid: p.id, groom: null, give: null};
  }
  const S = SL();
  const g = SLPOS.groom == null ? S.groomOpen : SLPOS.groom;
  const v = SLPOS.give == null ? (p.starving ? S.giveSaveOpen : S.giveOpen) : SLPOS.give;
  return {groom: Math.min(g, groomCapPct(G)), give: Math.min(v, giveCapPct(G))};
}
const catchTag = (G, p)=>{ const c = catchP(G, p); return c >= 0.005 ? fill(COPY.actCatch, {p: Math.round(c*100)}) : ""; };
/* P10 lever 3: one donation a dawn. A second is allowed only if your crop is still nearly full. */
const canDonate = G=> (G.run.dons || 0) < BAT.sharesPerDawn || G.energy >= BAT.energyCap - BAT.fullCropMargin;
function partnerPanel(){
  if(G.selected===null){
    const starv = presentBats(G).filter(p=> p.starving && !p.shared);
    const warm = warmMult(G);
    const nReal = realBondsOf(G).length, extra = breadthExtra(G);
    const spread = extra > 0 ? `<p class="wyd-feedback wyd-spread"><strong>${fill(COPY.panelSpread, {n: nReal, free: G.season.freeBonds, extra: "-" + fmtN(extra)})}</strong></p>` : "";
    return `<div class="wyd-partner"><h4>${COPY.panelPickHead}</h4>${spread}
      <p class="wyd-story" style="font-size:.9rem">${COPY.panelPickShort}${G.roosts[G.myRoost].known && G.roosts[G.myRoost].visits > 1 && Math.abs(warm - 1) > 0.15 ? (warm > 1 ? COPY.panelWarmFast : COPY.panelWarmSlow) : ""}${starv.length ? COPY.panelStarvWarn : ""}</p>
      ${G.lastAct ? `<p class="wyd-feedback">${G.lastAct}</p>`:""}</div>`;
  }
  const p = G.partners[G.selected];
  const longCost = longGroomCost(G);
  const canQ = G.stamina>=BAT.groomQuick.cost && !p.groomed;
  const canL = G.stamina>=longCost && !p.groomed;
  const canShareBase = G.stamina > 0 && G.run.fedTonight && p.hungry && !p.shared && !(G.sick && BAT.roosts.sickNoShare) && canDonate(G);
  const shareWhy = (G.sick && BAT.roosts.sickNoShare) ? COPY.shareWhyFever : !G.run.fedTonight ? COPY.shareWhyNotFed
    : !p.hungry || p.shared ? COPY.shareWhyNotHungry
    : G.stamina <= 0 ? COPY.shareWhyNoStamina
    : !canDonate(G) ? COPY.shareWhyOne : COPY.shareWhyLow;
  const wm = warmMult(G);   // P5: the roost's warm-up rate scales every gain shown and applied
  const em = eventMult(p, true) * wm, gm = eventMult(p, false) * wm * mods(G).groomMult;   // P9: a stingy year grooms faster
  const pos = slPos(G, p);
  const gCap = groomCapPct(G), vCap = giveCapPct(G);
  const canGroom = !p.groomed && gCap >= SL().step;
  const canShare = canShareBase && vCap >= SL().giveFloor;
  // P6a: what this bond is worth tonight under the season's rescue curve, and the contact risk
  const rescueLine = p.fed ? fill(COPY.panelRescue, {p: Math.round(rescueP(G, p.trust)*100)}) : COPY.panelRescueUnfed;
  const gainQ = (BAT.groomQuick.gain*gm*(1-BAT.dimReturns*p.trust)).toFixed(2);
  const gainL = (BAT.groomLong.gain*gm*(1-BAT.dimReturns*p.trust)).toFixed(2);
  return `<div class="wyd-partner">
    <h4>${esc(p.name)}</h4>
    <div class="gl">${fill(COPY.bondLabel, {trust: p.trust.toFixed(2)})}</div>
    <div class="wyd-bondbar"><b style="width:${(p.trust*100).toFixed(0)}%"></b></div>
    <p class="wyd-rescueline" data-p="${rescueP(G, p.trust).toFixed(3)}">${rescueLine}</p>
    <div class="wyd-ptags">
      ${p.shared ? "" : p.starving ? `<span class="wyd-ptag hot"><span class="c-l">${COPY.chipStarving}</span><span class="c-s">${COPY.chipStarvingShort}</span></span>`
        : p.hungry ? `<span class="wyd-ptag hot wyd-ptag--why wyd-explain" role="button" tabindex="0" data-eh="${esc(COPY.chipBegging)}" data-ex="${esc(COPY.chipBeggingWhy)}" title="${esc(COPY.chipBeggingWhy)}" aria-label="${esc(COPY.chipBegging)}: ${esc(COPY.chipBeggingWhy)}"><span class="c-l">${COPY.chipBegging}</span><span class="c-s">${COPY.chipBeggingShort}</span></span>`
        : `<span class="wyd-ptag wyd-ptag--why wyd-explain" role="button" tabindex="0" data-eh="${esc(COPY.chipFed)}" data-ex="${esc(COPY.chipFedWhy)}" title="${esc(COPY.chipFedWhy)}" aria-label="${esc(COPY.chipFed)}: ${esc(COPY.chipFedWhy)}"><span class="c-l">${COPY.chipFed}</span><span class="c-s">${COPY.chipFedShort}</span></span>`}
      ${(()=>{
        /* P26 (Bryson, condensing the phone): a coughing bat used to wear TWO chips, "coughing"
           and "N% to catch her cough", which is one situation stated twice. One chip now carries
           both, and a catch risk without a visible cough (a sick roost) keeps its own. */
        const c = Math.round(catchP(G, p) * 100), showC = catchP(G, p) >= 0.005;
        const tap = (head, why)=> ` role="button" tabindex="0" data-eh="${esc(head)}" data-ex="${esc(why)}"`;
        if(p.cough && showC) return `<span class="wyd-ptag hot wyd-cough wyd-catchchip wyd-explain"${tap(COPY.chipCough, COPY.chipCoughWhy + " " + fill(COPY.chipCatch, {p: c}) + ". " + COPY.chipCatchWhy)} title="${esc(fill(COPY.chipCoughCatch, {p: c}))}"><span class="c-l">${fill(COPY.chipCoughCatch, {p: c})}</span><span class="c-s">${fill(COPY.chipCoughCatchShort, {p: c})}</span></span>`;
        if(p.cough) return `<span class="wyd-ptag hot wyd-cough wyd-explain"${tap(COPY.chipCough, COPY.chipCoughWhy)}>${COPY.chipCough}</span>`;
        if(showC) return `<span class="wyd-ptag hot wyd-catchchip wyd-explain"${tap(COPY.chipCough, COPY.chipCatchWhy)} title="${esc(fill(COPY.chipCatch, {p: c}))}"><span class="c-l">${fill(COPY.chipCatch, {p: c})}</span><span class="c-s">${fill(COPY.chipCatchShort, {p: c})}</span></span>`;
        return "";
      })()}
      ${p.fedYou ? `<span class="wyd-ptag hot" title="${esc(COPY.chipSavedYou)}"><span class="c-l">${COPY.chipSavedYou}</span><span class="c-s">${COPY.chipSavedYouShort}</span></span>`:""}
      ${p.youSaved ? `<span class="wyd-ptag good">${COPY.chipYouSaved}</span>`:""}
      ${p.visitor ? `<span class="wyd-ptag">${fill(COPY.chipVisiting, {roost: esc(roostName(p.homeRoost))})}</span>` : ""}
      ${p.bitYou ? `<span class="wyd-ptag hot">${fill(COPY.chipBitYou, {n: p.bitYou})}</span>` : ""}
      ${traitLine(p)}
      ${rankChips(p)}
      ${p.groomed ? `<span class="wyd-ptag">${COPY.chipGroomed}</span>`:""}
      ${p.shared ? `<span class="wyd-ptag">${COPY.chipShared}</span>`:""}
    </div>
    ${traitHintLine(p)}
    <p class="wyd-story wyd-onedon">${fill(COPY.panelOneShare, {n: Math.max(0, BAT.sharesPerDawn - (G.run.dons||0))})}</p>
    <div class="wyd-bars">
      ${sliderRow(G, p, "groom", pos.groom, gCap, canGroom, p.groomed ? COPY.chipGroomed : COPY.slNone)}
      ${sliderRow(G, p, "give", pos.give, vCap, canShare, shareWhy)}
    </div>
    ${G.lastAct ? `<p class="wyd-feedback">${G.lastAct}</p>`:""}
  </div>`;
}
/* the modifiers reciprocate() applies to a groom-back chance, factored out so the number printed
   under the bar and the number actually rolled can never disagree */
function recipMods(G, p, pr){
  const td = TRAITS[p.trait];
  if(td.recipMult) pr *= td.recipMult;
  if(BAT.roosts.warmRecip) pr *= warmMult(G);
  if(G.sick) pr *= BAT.roosts.sickGroomBack;
  if(p.cough) pr *= BAT.season.coughGroomBack;
  if(G.run && G.run.newRoost && !mods(G).strangerEase) pr *= BAT.roosts.strangerRecip;
  return pr;
}
/* what a groom of this size buys, in the words the player reads under the bar */
function groomReadout(G, p, f){
  const wm = warmMult(G), gm = eventMult(p, false) * wm * mods(G).groomMult;
  const gain = groomGainAt(f) * gm * (1 - BAT.dimReturns * p.trust);
  const back = Math.min(BAT.recipCap, recipMods(G, p, groomRecipAt(f, p.trust)));
  return fill(onPhone() ? COPY.slGroomSubShort : COPY.slGroomSub,
              {pct: pctI(f), gain: gain.toFixed(2), p: Math.round(back * 100)})
    + (onPhone() ? "" : catchTag(G, p));   // her chip row already carries the catch chance
}
/* what a gift of this size costs and buys */
function giveReadout(G, p, f){
  const blood = Math.min(f * BAT.energyCap, G.energy);
  const left = Math.max(0, G.energy - blood);
  const pts = p.starving ? BAT.pts.save + satAt(SL().starv, blood) : satAt(SL().hun, blood);
  const room = BAT.partnerCap - (p.starving ? 0 : p.energy);
  const lift = BAT.shareLift * blood / BAT.shares[0].blood;
  /* Bryson, on the phone: "it should not bother saying that some blood will spill because you
     dont have enough space, the user will realize that". The spill note and the catch chance are
     desktop only; the phone keeps the two numbers a decision actually turns on. */
  return fill(onPhone() ? COPY.slGiveSubShort : COPY.slGiveSub,
              {blood: bp(blood), left: bp(left), cap: BLOOD_MAX, pct: pctI(f)})
    + fill(onPhone() ? COPY.slGivePtsShort : COPY.slGivePts, {n: Math.round(pts)})
    + (onPhone() ? "" : (lift > room + 0.05 ? COPY.slGiveSpill : "") + catchTag(G, p));
}
/* one bar: label, live percentage, the range itself, what it buys, and the button that spends it.
   data-* carries the same numbers for the test harness, so it never has to read prose. */
function sliderRow(G, p, kind, val, cap, enabled, why){
  const isG = kind === "groom", S = SL();
  const lab = isG ? COPY.slGroomLab : (p.starving ? COPY.slGiveLabSave : COPY.slGiveLab);
  const go = isG ? COPY.slGroomGo : (p.starving ? COPY.slGiveGoSave : COPY.slGiveGo);
  const shortLab = isG ? COPY.slGroomShort : COPY.slGiveShort;
  const capLine = isG ? fill(COPY.slGroomCap, {have: pctI(staminaFrac(G)), pct: pctI(cap)})
                      : fill(COPY.slGiveCap, {blood: bp(G.energy), pct: pctI(cap)});
  const sub = !enabled ? why : (isG ? groomReadout(G, p, val) : giveReadout(G, p, val));
  const blood = Math.min(val * BAT.energyCap, G.energy);
  return `<div class="wyd-bar ${enabled ? "" : "off"}" data-kind="${kind}" data-pct="${pctI(val)}" data-cap="${pctI(cap)}"${isG ? "" : ` data-blood="${bp(blood)}" data-left="${bp(Math.max(0, G.energy - blood))}"`}>
    <div class="bar-top"><span class="bar-lab">${lab}</span><span class="bar-lab-s">${shortLab}</span><output class="bar-val" id="wyd-${kind}val" for="wyd-${kind}range">${fill(COPY.slPct, {pct: pctI(val)})}</output></div>
    <input type="range" class="bar-range" id="wyd-${kind}range" min="0" max="100" step="${pctI(S.step)}" value="${pctI(val)}"
      style="--cap:${pctI(cap)}%" data-cap="${pctI(cap)}" aria-valuemax="${pctI(cap)}"
      ${enabled ? "" : "disabled"} aria-label="${esc(lab)}" aria-describedby="wyd-${kind}sub">
    <p class="bar-cap">${enabled ? capLine : ""}</p>
    <p class="bar-sub" id="wyd-${kind}sub">${sub}</p>
    <button class="btnx ${enabled ? "btnx--solid" : ""}" id="wyd-${kind}go" ${enabled && val > 0 ? "" : "disabled"}>${go}</button>
  </div>`;
}
/* P28: the phone dawn's whole header, in one line. The two paragraphs it replaces said where you
   are hanging, who is away, who is visiting and how much stamina you have; the stamina is on the HUD
   bar, and what a player is actually deciding from is who their friends are. */
const FRIEND_NAMES = 4;
function friendStat(G){
  const friends = G.partners.filter(p=> p.alive && p.trust >= BAT.roosts.knownTrust)
    .sort((a, b)=> b.trust - a.trust);
  if(!friends.length) return `<p class="wyd-story wyd-friendstat">${COPY.dawnFriendsNone}</p>`;
  const shown = friends.slice(0, FRIEND_NAMES).map(p=> esc(p.name)).join(", ");
  const names = friends.length > FRIEND_NAMES
    ? fill(COPY.dawnFriendsMore, {names: shown, n: friends.length - FRIEND_NAMES}) : shown;
  return `<p class="wyd-story wyd-friendstat">${fill(COPY.dawnFriends, {names})}</p>`;
}
/* P29: the animal's bite bar opens the breakdown the HUD's Skill cell used to. Delegated and armed
   once, because the same bar is also drawn INSIDE the stage's foreignObject, which the stage creates
   after the scene has rendered. */
let SKILLSRC_WIRED = false;
function wireSkillSrc(G){
  if(SKILLSRC_WIRED) return;
  SKILLSRC_WIRED = true;
  const hit = e=> e.target && e.target.closest && e.target.closest(".wyd-skillsrc");
  /* P29: any chip carrying data-ex explains itself in a popup when tapped. On a phone the chip row
     scrolls and a long tag ended in an ellipsis with its sentence only in a title, which a phone
     cannot show at all. */
  const chip = e=> e.target && e.target.closest && e.target.closest(".wyd-explain[data-ex]");
  const openChip = el=>{ sfx("click"); popup({kind:"chip", kicker: COPY.chipTapHead,
    title: el.dataset.eh || "", body: `<p class="wyd-story">${esc(el.dataset.ex || "")}</p>`}); };
  document.addEventListener("click", e=>{
    const c = chip(e); if(c){ e.stopPropagation(); openChip(c); return; }
    if(hit(e)){ sfx("click"); skillPopup(G); }
  });
  document.addEventListener("keydown", e=>{
    if(e.key !== "Enter" && e.key !== " ") return;
    const c = chip(e); if(c){ e.preventDefault(); openChip(c); return; }
    if(hit(e)){ e.preventDefault(); sfx("click"); skillPopup(G); }
  });
}
const redrawDawn = ()=> renderScene("dawn", {wipe:false});
/* P29: picking a bat reorders the dawn, so the scroll position no longer points at what the player
   was looking at. Bring the card back into view instead of leaving them mid-panel. */
function keepDawnInView(){
  try{
    const el = document.getElementById("wyd-scene"); if(!el) return;
    const top = el.getBoundingClientRect().top;
    if(top < -8 || top > 120) el.scrollIntoView({block: "start", behavior: reduceMotion() ? "auto" : "smooth"});
  }catch(e){}
}
const SCENE_DAWN = {
  label: G=> `🌅 Dawn after night ${G.night} of ${BAT.nights} · the roost`,
  mode: "day",
  next: ["dusk", "end"],
  render(G){
    const present = presentBats(G);
    const owed = present.filter(p=> p.hungry && !p.shared);
    const starving = owed.filter(p=>p.starving);
    const warn = starving.length
      ? fill(COPY.warnStarving, {names: starving.map(p=>esc(p.name)).join(" and "), isare: starving.length>1?"are":"is"}) + (G.run.fedTonight ? COPY.warnYouCould : COPY.warnOthersMight)
      : G.run.fedTonight && owed.length
      ? fill(onPhone() ? COPY.warnRefuseShort : COPY.warnRefuse, {n: owed.length, s: owed.length>1?"s":"", cost: BAT.refuseCost.toFixed(2), owe: owed.some(p=>p.fedYou) ? fill(COPY.warnOwe, {cost: BAT.refuseOweCost.toFixed(2)}) : ""})
      : "";
    const hyg = G.parasites ? COPY.mitesWarn
      : G.hygiene < BAT.infestBelow ? fill(COPY.furWarn, {hyg: G.hygiene.toFixed(2)}) : "";
    // P5: where you woke, the first-dawn note, the cues, who is away and who visits (P9: the hazards
    // and the dawn event are popups + HUD icons; only the recoveries stay here as a short line)
    const K = BAT.roosts, hz = G.run.hazard || {}, r = G.roosts[G.myRoost];
    const weak = [];
    if(G.energy <= BAT.staminaLowAt) weak.push("hunger");
    if(G.sick) weak.push("fever");
    if(G.hurt) weak.push("the wound");   // joined into COPY.dawnWeak
    const s = n=> n === 1 ? "" : "s";
    const overLines = [];
    if(hz.sickOver && !hz.sick) overLines.push(COPY.sickOver);
    if(hz.hurtOver && !hz.hurt) overLines.push(COPY.hurtOver);
    const away = roostResidents(G, G.myRoost).filter(p=> !p.present && p.trust >= K.knownTrust);
    const visitors = present.filter(p=> p.visitor);
    const roostLine = `<p class="wyd-story wyd-roostline"><strong>${fill(COPY.dawnAt, {roost: esc(roostName(G.myRoost))})}</strong>${
        hz.first && G.myRoost !== 0 ? " " + COPY.dawnNew : ""}${
        hz.first && hz.cues && hz.cues.length ? " " + fill(COPY.dawnCues, {cues: esc(hz.cues.join("; "))}) : ""}${
        away.length ? " " + fill(COPY.dawnAway, {names: away.map(p=> esc(p.name)).join(", "), isare: away.length > 1 ? "They are" : "She is", they: away.length > 1 ? "they" : "she"}) : ""}${
        visitors.length ? " " + fill(COPY.dawnVisitors, {names: visitors.map(p=> esc(p.name)).join(", ")}) : ""}${
        G.run.friendFed ? " " + fill(COPY.dawnFriendFed, {name: esc(G.run.friendFed)}) : ""}${
        overLines.length ? " " + overLines.map(esc).join(" ") : ""}</p>`;
    // the who-needs-you strip on a crowded dawn: begging bats as chips that select them
    const needs = present.length >= K.manyAt && owed.length
      ? `<div class="wyd-needs"><span class="gl">${COPY.dawnNeeds}</span>${owed.sort((a,b)=> (b.starving - a.starving) || (b.trust - a.trust)).map(p=>
          `<button type="button" class="wyd-ptag${p.starving ? " hot" : ""} wyd-needchip" data-need="${p.id}">${esc(p.name)} · ${p.starving ? "starving" : "begging"} · bond ${p.trust.toFixed(2)}</button>`).join("")}</div>`
      : "";
    const sel = G.selected !== null ? " wyd-dawn--sel" : "";   // P21 phones: the picked state, for the header trim
    return `<div class="wyd-round${sel}">🌅 Dawn after night ${G.night} of ${BAT.nights} · the roost</div>
      <h3 class="wyd-dawnh3${sel}">${COPY.dawnHead}</h3>
      <div class="wyd-dawnhead${sel}">${onPhone() ? friendStat(G) : roostLine +
      `<p class="wyd-story">${fill(COPY.dawnStamina, {n: pctI(staminaFrac(G)), weak: weak.length ? fill(COPY.dawnWeak, {why: weak.join(" and ")}) : ""})}${G.run.fedTonight ? COPY.dawnGroomShare : COPY.dawnNoShare} ${hyg}</p>`}</div>
      ${needs}
      <div class="wyd-roost${G.selected !== null ? " wyd-roost--sel" : ""}">
        <div>${netSvg()}
          <div class="wyd-sleeprow"><button class="btnx wyd-clay" id="wyd-sleep">${COPY.sleepBtn}</button>
          <div class="wyd-sleepwarn">${warn}</div></div>
        </div>
        <div>${partnerPanel()}</div>
      </div>`;
  },
  choices: ()=> [{id:"wyd-sleep", apply: sleepApply, goto: G=> G.cause==="season" ? "end" : "dusk"}],
  /* P9: the dawn's popups, once each: the how-to (first dawn ever in this browser), the hazards
     that landed this dawn, the roost event of the day */
  pops(G){
    G.pops = G.pops || {};
    if(!helpSeen("dawn")){ markHelp("dawn"); helpPopup("dawn"); }
    const hz = G.run && G.run.hazard, hk = "hz:" + G.night;
    if(hz && (hz.sick || hz.hurt) && !G.pops[hk]){ G.pops[hk] = true; hazardPopup(G, hz); }
    const dk = "de:" + G.night;
    if(G.event && !G.pops[dk]){ G.pops[dk] = true; dawnEventPopup(G, false); }
  },
  /* in-place actions: select, groom, share. They mutate G and redraw the dawn without a
     scene change (no re-save, as in v2 where mid-dawn actions were not captured). */
  wire(G){
    $$("#wyd-scene .node[data-pid]").forEach(n=>{
      const sel = ()=>{ sfx("pick"); G.selected = +n.dataset.pid; G.lastAct = ""; redrawDawn(); keepDawnInView(); };
      n.addEventListener("click", sel);
      n.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); sel(); } });
    });
    $$("#wyd-scene .wyd-needchip[data-need]").forEach(b=>{ b.onclick = ()=>{ G.selected = +b.dataset.need; G.lastAct = ""; redrawDawn(); keepDawnInView(); }; });
    let p = G.selected!==null ? G.partners[G.selected] : null;
    const wm = warmMult(G);   // P5: the roost's warm-up rate
    const contact = p=>{ G.contacts = G.contacts || []; if(!G.contacts.some(c=> c.id === p.id)) G.contacts.push({id:p.id, name:p.name, cough:!!p.cough}); };
    /* P26: one bar spends stamina on her fur, the other spends blood AND the same percentage of
       stamina. The readout under each bar is recomputed live from the same functions that resolve
       the action, so what the player is promised and what they get cannot drift. */
    const doGroom = (f)=>{
      if(f <= 0 || !p) return;
      p = maybeDeaf(G, p);
      const pct = pctI(f);
      if(window.WydLog) WydLog.dawn(G, "groom", p, {pct: pct});
      contact(p);
      G.stamina = Math.max(0, G.stamina - f * BAT.staminaPerNight * groomCostMult(G));
      p.groomed = true;
      const gain = groomGainAt(f) * eventMult(p, false) * wm * mods(G).groomMult * (1 - BAT.dimReturns*p.trust);
      p.trust = Math.min(1, p.trust + gain); G.score += BAT.pts.groomQ; G.ledger.grooms++;
      if(!p.seen && p.trait === "plain") p.seen = true;
      log(`Night ${G.night}: groomed ${p.name} for ${pct}% of the night. Bond ${p.trust.toFixed(2)}.`, "good");
      /* the bar right above already says how much, so the phone shows only what came of it */
      const back = reciprocate(p, groomRecipAt(f, p.trust));
      G.lastAct = (onPhone() ? (back.trim() || fill(COPY.slGroomActShort, {name: esc(p.name)}))
                             : fill(COPY.slGroomAct, {pct: pct, name: esc(p.name)}) + back) + G.deafNote;
      const beads = Math.max(8, Math.round(BAT.staminaPerNight * f * 14));   // the stream runs as long as the groom does
      sfx("groom", beads*90 + 1100);
      if(/grooms you back/.test(G.lastAct)) setTimeout(()=> sfx("good"), 1300);
      G.fx = {pid: p.id, kind:"groom", n: Math.max(1, Math.min(3, Math.round(f / SL().quickAt)))};
      SLPOS = {pid:null, groom:null, give:null};
      redrawDawn();
    };
    const doGive = (f)=>{
      if(f <= 0 || !p) return;
      p = maybeDeaf(G, p);
      const pct = pctI(f), blood = Math.min(f * BAT.energyCap, G.energy), wasStarving = p.starving;
      if(window.WydLog) WydLog.dawn(G, "share", p, {pct: pct, bl: Math.round(blood*100)/100});
      contact(p);
      const shareMs = (6 + 4*Math.max(1, Math.min(3, Math.round(blood / BAT.shares[0].blood))))*110 + 950;
      G.stamina = Math.max(0, G.stamina - f * BAT.staminaPerNight);
      p.shared = true; p.hungry = false;
      G.run.dons = (G.run.dons || 0) + 1;   // P10 lever 3, unchanged: one donation a dawn
      G.energy = Math.max(0, G.energy - blood);
      const gain = satAt(SL().gain, blood) * eventMult(p, true) * wm * (wasStarving ? 1 : (1 - BAT.dimReturns * p.trust));
      p.trust = Math.min(1, p.trust + gain);
      G.ledger.don++;
      unlock("firstShare");
      if(p.bitYou) unlock("forgiveness");
      const label = fill(COPY.slAmount, {pct: pct});
      const lift = BAT.shareLift * blood / BAT.shares[0].blood;   // she gains in proportion to what you brought up
      if(wasStarving){
        p.starving = false; p.energy = Math.min(BAT.partnerCap, Math.max(1, lift)); p.youSaved = true;
        const pts = Math.round(BAT.pts.save + satAt(SL().starv, blood));
        G.score += pts; G.ledger.saves++;
        unlock("lifesaver");
        log(`Night ${G.night}: SAVED ${p.name} from starving (${label}). +${pts}.`, "good");
        G.lastAct = fill(COPY.actSave, {name: esc(p.name), label: label, blood: bp(blood)}) + G.deafNote;
        sfx("share", shareMs); setTimeout(()=> sfx("great"), shareMs - 300);
      } else {
        p.energy = Math.min(BAT.partnerCap, p.energy + lift);
        const pts = Math.round(satAt(SL().hun, blood));
        G.score += pts;
        log(`Night ${G.night}: shared ${label} with ${p.name}. Bond ${p.trust.toFixed(2)}. +${pts}.`, "good");
        G.lastAct = fill(COPY.actShare, {name: esc(p.name), label: label, blood: bp(blood)}) + G.deafNote;
        sfx("share", shareMs);
      }
      G.fx = {pid: p.id, kind:"share", n: Math.max(1, Math.min(3, Math.round(blood / BAT.shares[0].blood)))};
      SLPOS = {pid:null, groom:null, give:null};
      redrawDawn();
    };
    ["groom", "give"].forEach(kind=>{
      const r = $("#wyd-" + kind + "range"); if(!r || !p) return;
      const out = $("#wyd-" + kind + "val"), sub = $("#wyd-" + kind + "sub"), go = $("#wyd-" + kind + "go");
      const host = r.parentNode;
      const paint = ()=>{
        /* P28: the track runs the whole 0 to 100 so the scale is constant, so the cap is enforced
           here instead of by the element's own max. */
        const capPct = +(r.dataset.cap || 100);
        if(+r.value > capPct) r.value = String(capPct);
        const f = (+r.value) / 100;
        SLPOS.pid = p.id; SLPOS[kind] = f;
        if(out) out.textContent = fill(COPY.slPct, {pct: +r.value});
        if(sub) sub.innerHTML = kind === "groom" ? groomReadout(G, p, f) : giveReadout(G, p, f);
        if(host){
          host.dataset.pct = +r.value;
          if(kind === "give"){
            const b = Math.min(f * BAT.energyCap, G.energy);
            host.dataset.blood = bp(b);
            host.dataset.left = bp(Math.max(0, G.energy - b));
          }
        }
        if(go) go.disabled = !(+r.value > 0);
        /* P29: one quiet blip per stop while dragging, and only when the value actually moved */
        if(r.dataset.last !== r.value){
          r.dataset.last = r.value;
          sfx(kind === "groom" ? "tickGroom" : "tickGive", (+r.value) / 100);
        }
      };
      r.addEventListener("input", paint);
      r.addEventListener("change", paint);
      if(go) go.onclick = ()=>{ const f = (+r.value) / 100; if(kind === "groom") doGroom(f); else doGive(f); };
    });
    if(G.fx){ runFx(G.fx); G.fx = null; }
  },
};
/* the bead stream along a network edge (P6a: ported from the approved prototype, bible row 13):
   beads spawn at A, glide to B with a sine wobble across the edge, swell mid-edge and fade at
   both ends; sizes and speeds vary per bead. Reduced motion: a static beaded line for a beat.
   Handles go through the timer / rAF registry so a scene change drops them. Math.random, not
   roll(): the picture must never consume the game's dice. */
const SVG_NS = "http://www.w3.org/2000/svg";
function emitStream(pid, o){
  const {cx, cy} = netBox();   // P28: netBox, NOT NET. nodePos() uses netBox, and on a phone the two
                               // centres are 45 units apart, which is why the beads flew to nowhere.
  const {x:px, y:py} = nodePos(pid);
  const ax = o.reverse ? px : cx, ay = o.reverse ? py : cy, bx = o.reverse ? cx : px, by = o.reverse ? cy : py;
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy/len, ny = dx/len;
  const travel = o.travel || 1100;
  const svgOf = ()=> document.querySelector("#wyd-scene .wyd-net");
  if(reduceMotion()){
    const start = ()=>{
      const svg = svgOf(); if(!svg) return;
      const l = document.createElementNS(SVG_NS, "line");
      l.setAttribute("x1", ax); l.setAttribute("y1", ay); l.setAttribute("x2", bx); l.setAttribute("y2", by);
      l.setAttribute("stroke", o.color); l.setAttribute("stroke-width", "3"); l.setAttribute("stroke-dasharray", "2 9");
      l.setAttribute("stroke-linecap", "round"); l.classList.add("wyd-fxline");
      svg.appendChild(l);
      at(travel + 500, ()=> l.remove());
    };
    o.delay ? at(o.delay, start) : start();
    return;
  }
  const parts = [];
  let emitted = 0, iv = null;
  const start = ()=>{
    iv = every(o.interval, ()=>{
      const svg = svgOf();
      if(!svg || emitted >= o.count){ stopEvery(iv); iv = null; return; }
      emitted++;
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("r", (o.r * (0.7 + 0.6*Math.random())).toFixed(1));
      c.setAttribute("fill", o.color); c.setAttribute("opacity", "0"); c.classList.add("wyd-fxbead");
      svg.appendChild(c);
      parts.push({el:c, t0:performance.now(), dur: travel * (0.8 + 0.4*Math.random()), ph: Math.random()*6.28, amp: 3 + Math.random()*6});
    });
    const tick = ()=>{
      const now = performance.now();   // the raf registry calls back without a timestamp
      for(let i = parts.length-1; i >= 0; i--){
        const p = parts[i], t = (now - p.t0)/p.dur;
        if(t >= 1 || !p.el.isConnected){ p.el.remove(); parts.splice(i, 1); continue; }
        const off = Math.sin(t*9 + p.ph) * p.amp;
        p.el.setAttribute("cx", (ax + dx*t + nx*off).toFixed(1));
        p.el.setAttribute("cy", (ay + dy*t + ny*off).toFixed(1));
        const fade = t < 0.15 ? t/0.15 : Math.min(1, (1 - t)*1.15);
        p.el.setAttribute("opacity", (fade * (0.55 + 0.45*Math.sin(Math.PI*t))).toFixed(2));
      }
      if(parts.length || iv) raf(tick);
    };
    raf(tick);
  };
  o.delay ? at(o.delay, start) : start();
}
function runFx(fx){
  if(fx.kind === "groom"){
    emitStream(fx.pid, {color:"var(--g-warm)", r:3.2,
      count: fx.n===1 ? 14 : 28, interval:90, travel:1100});
  } else {
    emitStream(fx.pid, {color:"var(--g-accent)", r:3.2 + fx.n,
      count: 6 + 4*fx.n, interval:110, travel:950});
  }
}

/* ── transition: sleep (refusals, background rescue, partner deaths, season end) ──
   then either the season ends (G.cause = "season" → end) or a new night begins. */
function sleepApply(G){
  if(window.WydLog) WydLog.sleep(G);
  if(G.run.fedTonight){
    // P5: only the bats begging beside you tonight can be refused
    G.partners.filter(p=>p.alive && p.present && p.hungry && !p.shared).forEach(p=>{
      p.trust = Math.max(BAT.trustFloor, p.trust - (p.fedYou ? BAT.refuseOweCost : BAT.refuseCost));
      log(`Night ${G.night}: refused ${p.name}. Bond ${p.trust.toFixed(2)}.`, "bad");
    });
  }
  // starving bats you didn't feed: their own friends may save them, or not (colony-wide, via pp)
  const lost = [];
  G.partners.forEach(p=>{
    if(!p.alive || !p.starving || p.shared) return;
    let rescued = false;
    for(const q of G.partners){
      if(q.id===p.id || !q.alive || !q.fed) continue;
      if(roll() < Math.min(BAT.rescueCap, BAT.rescueBase + BAT.rescueSlope*G.pp[p.id][q.id])){
        rescued = true;
        if(p.present) log(`Night ${G.night}: ${q.name} fed ${p.name}, a near thing.`, "good");
        break;
      }
    }
    if(rescued){ p.energy = 1; p.starving = false; }
    else {
      p.alive = false;
      G.deathsAll.push(p.name); G.lastDeathNight = G.night;
      // the hollow's own dead are the ones the season end counts; you only see a death beside you
      if(p.homeRoost === 0) G.deaths.push(p.name);
      if(p.present){ lost.push(p.name); log(`Night ${G.night}: ${p.name} starved to death. ☠`, "bad"); }
    }
  });
  G.deathsFresh = lost.length ? lost.join(" and ") : "";
  // P6a: contagion through the dawn's contacts (each bat groomed or shared with; coughing ones worse)
  if(G.season && !G.sick && G.contacts && G.contacts.length){
    const S = BAT.season;
    let pNone = 1;
    G.contacts.forEach(c=>{ pNone *= 1 - Math.min(0.95, S.contactSick * G.season.contagion * (c.cough ? S.sickBatMult : 1)); });
    if(roll() < 1 - pNone){
      const worst = G.contacts.slice().sort((a,b)=> (b.cough?1:0) - (a.cough?1:0))[0];
      G.pendingSick = worst.name;
    }
  }
  G.contacts = [];
  // P5: sickness and the wound run their course by dawns
  (G.events || []).forEach(ev=>{ if(ev.fired && ev.left > 0) ev.left--; });   // P7: running effects wind down by nights
  G.mods = null;
  if(G.sick){ G.sick--; if(!G.sick) G.sickOver = true; }
  if(G.hurt){ G.hurt--; if(!G.hurt) G.hurtOver = true; }
  G.lastAct = ""; G.event = null;
  G.score += BAT.pts.night;
  if(G.night >= BAT.nights){ G.cause = "season"; return; }
  applyNewNight();
}

/* ── scene: end of the run (terminal; hands the ledger to wydEnd) ── */
const SCENE_END = {
  label: ()=> "the end of the season",
  mode: "night",
  next: [],
  render(){ batEnd(); return null; },
};
/* badges (bible section 5; thresholds BAT.badges; Full Roost = no deaths, ruling 26) */
/* P5: a "bond" for the ledger is a living bat who trusts you at least knownTrust; the colony's
   forty strangers at 0.02-0.08 are not a portfolio */
const realBonds = G=> G.partners.filter(p=> p.alive && p.trust >= BAT.roosts.knownTrust);
function badgesFor(G){
  const alive = realBonds(G);
  const bonds = alive.reduce((a,p)=>a+p.trust,0);
  const out = [];
  if(G.alive) out.push({key:"survivor", label:COPY.badges.survivor});
  if(alive.some(p=> p.trust >= BAT.badges.bonded)) out.push({key:"bonded", label:COPY.badges.bonded, good:true});
  if(G.alive && bonds >= BAT.badges.connector) out.push({key:"connector", label:COPY.badges.connector, good:true});
  if(G.alive && G.deaths.length === 0) out.push({key:"fullRoost", label:COPY.badges.fullRoost, good:true});
  if(G.ledger.dispWins >= BAT.badges.rank) out.push({key:"rank", label:COPY.badges.rank});
  return out;
}
function batEnd(){
  let score = Math.round(G.score), verdict;
  const alive = realBonds(G);
  const bonds = alive.reduce((a,p)=>a+p.trust,0);
  const saved = G.partners.filter(p=>p.youSaved).map(p=>p.name);
  const saviors = G.partners.filter(p=>p.fedYou).map(p=>p.name);
  const badges = badgesFor(G);
  // P6a achievements that land at the season's end
  if(G.alive){
    unlock("survivor");
    if(G.ledger.roostsSlept >= 3) unlock("explorer");
    if(G.ledger.nightsAway === 0) unlock("homebody");
    if(G.ledger.sickDawns > 0) unlock("fever");
    if(G.ledger.hurtDawns > 0) unlock("scarred");
    if(G.ledger.grooms === 0) unlock("ghost");
  }
  badges.forEach(b=>{ if(["bonded","connector","fullRoost"].includes(b.key) && (b.key !== "fullRoost" || G.alive)) unlock(b.key); });
  // P6a: the ledger values each real bond the way the season does (trust ^ rescueK)
  const bondsK = alive.reduce((a,p)=> a + Math.pow(p.trust, G.season ? G.season.rescueK : 1), 0);
  // P10 levers 2a and 4: the deepest bond, the friends who ever fed you, and the blood you kept
  const deepest = alive.reduce((a, p)=> p.trust > a.trust ? p : a, {trust:0, name:""});
  const recips = G.partners.filter(p=> p.alive && p.fedYou);
  const bloodLeft = clamp(G.energy, 0, BAT.energyCap);
  G.endLines = [];
  if(G.alive){
    const nights = Math.round(score);
    const pB = Math.round(bondsK*BAT.pts.endBond), pBest = Math.round(deepest.trust*BAT.pts.endBest);
    const pRec = recips.length*BAT.pts.endRecip, pBlood = Math.round(bloodLeft*BAT.pts.endBlood);
    const pRoost = G.deaths.length === 0 ? BAT.pts.endRoost : 0;
    score += BAT.pts.endSurvive + pB + pBest + pRec + pBlood + pRoost;
    G.endLines = [
      {key:"nights", label: COPY.endLineNights, pts: nights},
      {key:"survive", label: COPY.endLineSurvive, pts: BAT.pts.endSurvive},
      {key:"bonds", label: fill(COPY.endLineBonds, {n: alive.length, s: alive.length === 1 ? "" : "s"}), pts: pB},
      {key:"best", label: deepest.name ? fill(COPY.endLineBest, {name: deepest.name, trust: deepest.trust.toFixed(2)}) : COPY.endLineNoBest, pts: pBest},
      {key:"recip", label: recips.length ? fill(COPY.endLineRecip, {n: recips.length, s: recips.length === 1 ? "" : "s", names: recips.map(p=> p.name).join(" and ")}) : COPY.endLineNoRecip, pts: pRec},
      {key:"blood", label: fill(COPY.endLineBlood, {n: bp(bloodLeft), cap: BLOOD_MAX}), pts: pBlood},
      {key:"roost", label: pRoost ? COPY.endLineRoost : COPY.endLineNoRoost, pts: pRoost},
    ];
    const bits = [];
    if(saved.length) bits.push(fill(COPY.endBitSaved, {names: saved.join(" and ")}));
    if(saviors.length) bits.push(fill(COPY.endBitSaviors, {names: saviors.join(" and ")}));
    if(G.ledger.dispWins) bits.push(fill(COPY.endBitRank, {n: G.ledger.dispWins, s: G.ledger.dispWins>1?"s":""}));
    if(G.ledger.roostsSlept > 1) bits.push(fill(COPY.endBitRoosts, {n: G.ledger.roostsSlept, total: G.roosts.length}));
    bits.push(G.deaths.length === 0 ? COPY.fullRoostLine : fill(COPY.endLostLine, {names: G.deaths.join(" and ")}));
    verdict = `${COPY.seasonEnd} ${fill(COPY.endSurvived, {nights: BAT.nights})} ${fill(COPY.endAlong, {bits: bits.filter(Boolean).join("; ")})} ${fill(COPY.endAvg, {avg: (bonds/Math.max(1,alive.length)).toFixed(2)})} ${COPY.endReal}`;
  } else {
    G.endLines = [{key:"nights", label: COPY.endLineNights, pts: Math.round(score)}];
    const tried = G.run && G.run.tried && G.run.tried.length ? " " + fill(COPY.deathTried, {names: G.run.tried.join(" and ")}) : "";
    verdict = fill(COPY.deathVerdict, {night: G.night, storm: G.cond && G.cond.key === "storm" ? COPY.deathStorm : "", roost: roostName(G.myRoost), tried})
      + (saved.length ? fill(COPY.deathSaved, {names: saved.join(" and ")}) : "") + COPY.deathAdvice;
  }
  if(badges.length) verdict += fill(COPY.badgesLine, {list: badges.map(b=> b.label).join(", ")});
  if(badges.some(b=> b.key === "rank")) verdict += ` ${COPY.badgeRankLine}`;
  verdict = verdict.replace(/\s+/g, " ").trim();
  if(window.WydLog) WydLog.end(G, score, badges);
  sfx(G.alive ? "great" : "bad");
  wydEnd({score, verdict, nights: G.night});
  // the same badges as chips (wyd-core writes the verdict with textContent, ruling 29)
  const card = document.querySelector("#wyd-end .wyd-endcard");
  if(card){
    const old = card.querySelector(".wyd-badges"); if(old) old.remove();
    if(badges.length){
      const div = document.createElement("div");
      div.className = "wyd-badges";
      div.setAttribute("aria-label", "Badges earned this season");
      div.innerHTML = badges.map(b=> `<span class="wyd-badge wyd-badge-${b.key}${b.good ? " good" : ""}">${esc(b.label)}</span>`).join("");
      const v = card.querySelector("#wyd-e-verdict");
      if(v) v.insertAdjacentElement("afterend", div); else card.appendChild(div);
    }
    // P6a: the achievements this run unlocked, and the browser's tally
    const oldA = card.querySelector(".wyd-achrow"); if(oldA) oldA.remove();
    const have = achLoad(), n = Object.keys(have).filter(k=> ACHIEVEMENTS.some(a=> a.key === k)).length;
    const got = (G.achNew || []).map(k=> ACHIEVEMENTS.find(a=> a.key === k)).filter(Boolean);
    const row = document.createElement("div");
    row.className = "wyd-achrow";
    row.innerHTML = `<span class="gl">${got.length ? "Unlocked this run" : "Achievements"}</span>${
      got.map(a=> `<span class="wyd-badge wyd-ach-chip${a.secret ? " secret" : ""}" title="${esc(a.desc)}">${esc(a.label)}</span>`).join("")}
      <span class="wyd-achtally">${n} of ${ACHIEVEMENTS.length}</span>`;
    const anchor = card.querySelector(".wyd-badges") || card.querySelector("#wyd-e-verdict");
    if(anchor) anchor.insertAdjacentElement("afterend", row); else card.appendChild(row);
    // P10: the ledger, so a player can see what two real friends and a full crop were worth
    const oldL = card.querySelector(".wyd-ledger"); if(oldL) oldL.remove();
    if(G.endLines && G.endLines.length){
      const led = document.createElement("div");
      led.className = "wyd-ledger";
      led.innerHTML = `<span class="gl">${COPY.endLedgerHead}</span>`
        + G.endLines.map(l=> `<div class="wyd-ledline" data-line="${l.key}"><span>${l.label}</span><b>+${l.pts}</b></div>`).join("")
        + `<div class="wyd-ledline wyd-ledtotal" data-line="total"><span>${COPY.endLedgerTotal}</span><b>${score}</b></div>`;
      row.insertAdjacentElement("afterend", led);
    }
  }
}

/* ── the registry ── */
const SCENES = {
  dusk:       SCENE_DUSK,
  flightOut:  SCENE_FLIGHTOUT,
  pasture:    SCENE_PASTURE,
  encounter:  SCENE_ENCOUNTER,
  bite:       SCENE_BITE,
  flightHome: SCENE_FLIGHTHOME,
  night:      SCENE_NIGHT,
  roostPick:  SCENE_ROOSTPICK,
  begWait:    SCENE_BEGWAIT,
  rescue:     SCENE_RESCUE,
  death:      SCENE_DEATH,
  dawn:       SCENE_DAWN,
  end:        SCENE_END,
};

/* the achievements list under the board, from the browser's tally */
renderAchList();

/* ── ?debug=scenes: reachability report ── */
if(DEBUG_SCENES){
  const ids = Object.keys(SCENES);
  const edges = [], unknown = [];
  const seen = new Set(["dusk"]);
  const stack = ["dusk"];
  while(stack.length){
    const id = stack.pop();
    for(const n of SCENES[id].next){
      edges.push({from:id, to:n});
      if(!SCENES[n]){ if(!unknown.includes(n)) unknown.push(n); continue; }
      if(!seen.has(n)){ seen.add(n); stack.push(n); }
    }
  }
  const unreachable = ids.filter(id=>!seen.has(id));
  console.table(ids.map(id=>({scene:id, next:SCENES[id].next.join(" | "), reachable:seen.has(id)})));
  if(unknown.length) console.warn("[scenes] unknown ids referenced:", unknown);
  if(unreachable.length) console.warn("[scenes] unreachable:", unreachable);
  window.WYD_SCENES_REPORT = {ids, unreachable, unknown, edges};
}
/* ── ?debug=cites: provenance audit of bat-data.js ──
   noProv: META entries with neither cite nor model; missing: numeric leaves of BAT / COW_TABLE /
   PASTURES / RIVALS not covered by a META entry (an entry covers its whole subtree);
   badCite: META cite keys absent from CITES. All three must be empty. */
if(DEBUG_CITES){
  const keys = Object.keys(META);
  const noProv = keys.filter(k=> !(META[k].cite && META[k].cite.length) && !META[k].model);
  const badCite = [];
  keys.forEach(k=> (META[k].cite || []).forEach(c=>{ if(!CITES[c]) badCite.push(k + " → " + c); }));
  const covered = p=> keys.some(k=> p === k || p.startsWith(k + ".") || p.startsWith(k + "["));
  const missing = [];
  const walk = (v, p)=>{
    if(typeof v === "number"){ if(!covered(p)) missing.push(p); }
    else if(Array.isArray(v)) v.forEach((x, i)=> walk(x, p + "[" + i + "]"));
    else if(v && typeof v === "object") Object.keys(v).forEach(k=> walk(v[k], p + "." + k));
  };
  walk(BAT, "BAT"); walk(COW_TABLE, "COW_TABLE"); walk(PASTURES, "PASTURES"); walk(RIVALS, "RIVALS"); walk(EVENTS, "EVENTS"); walk(YEARS, "YEARS"); walk(YEAR_SLOTS, "YEAR_SLOTS");
  window.WYD_CITES_REPORT = {noProv, missing, badCite};
  console.log("[cites] noProv", JSON.stringify(noProv), "missing", JSON.stringify(missing), "badCite", JSON.stringify(badCite));
}

/* P11 (Bryson's screenshot showed the site search open over the HUD): Quarto binds "f", "/" and
   "s" as keyup shortcuts that open the navbar search from anywhere on the page. While a run is
   live those keys belong to the game, so a capture listener on window swallows them before the
   document listener sees them. Typing in a real field, and the navbar's search icon, still work. */
(function(){
  const swallow = e=>{
    if(!document.querySelector(".gpage.wyd-playing")) return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName ? t.tagName.toLowerCase() : "";
    if(tag === "input" || tag === "textarea" || tag === "select" || (t && t.isContentEditable)) return;
    if(t && t.closest && t.closest("#quarto-search")) return;
    if(["f", "F", "s", "S", "/"].includes(e.key)) e.stopPropagation();
  };
  window.addEventListener("keyup", swallow, true);
  window.addEventListener("keydown", swallow, true);
})();
