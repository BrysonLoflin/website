/* bat-data.js: pure data for the vampire bat game NIGHT FLIGHT (P2 extraction 2026-09-02,
   P4 pasture tables 2026-09-02, P5 roosts + the random cow deal 2026-09-03). Zero logic lives
   here: cast names, the BAT constant block, partner traits and the trait deck, the cow table,
   pastures, the roost types, the rival cast, player-facing copy, the citation map and META
   (one provenance entry per number the player can see).
   Load order (play-bat.qmd): WYD_SPECIES -> wyd-core.js -> bat-data.js -> bat-stage.js ->
   bat-game.js. Classic scripts share one global scope.

   HOUSE RULES FOR THIS FILE
   - Every number rendered to the player is read from here and has a META entry (a CITES key,
     or model:true plus the design reason). ?debug=cites in bat-game.js audits that.
   - Bite modifiers are stored SIGNED and are always ADDED (P4-CLARIFICATIONS ruling 1):
     P(fail) = clamp(pFail + cond.mod + farFail*far + scoutMod*scouted + tier.mod
                     + openWoundMod*openWound + damperMod*damper, 0.02, 0.95)
   - No em dashes in player-facing strings. Copy is second person, clinical-warm.
   - v2 keys the P3 engine still reads are kept (farBonus, stormBurn) until the P4 engine
     lands; the sim ignores them. Never rename a key without grepping bat-game.js.
   - Copy strings use {placeholders}; the engine fills them from BAT/G (never with literals). */

/* version tags for the play-style log (bat-log.js): bump DATA_VERSION whenever a constant a
   player can see changes, so logged runs stay comparable. Not player-facing: no META entry. */
const GAME_VERSION = 5;
const DATA_VERSION = "2026-09-04";   // P10 strategy levers: friends feed you, blood carries over, one donation a dawn, bond quality in the ledger (2026-09-04, home PC)

/* ── cast ───────────────────────────────────────────────────────────────────────────── */
const PARTNER_NAMES  = ["Quinoa","Fig","Juniper","Mango","Sage","Pepper","Hazel","Clover"];   // the hollow's core (dealt first)
const STRANGER_NAMES = ["Basil","Rowan","Ivy","Cinder","Moss","Fern"];   // v2 newcomer names; P5 draws newcomers from what is left of NAME_POOL
/* P5: the whole colony is named from one pool (PARTNER_NAMES first so Quinoa, Fig and the
   rest stay the hollow's core, then STRANGER_NAMES, then the reserve). 3-4 roosts of 4-16 bats
   need up to 64 names; the engine copies the pool per run (G.namePool) and shifts from it. */
const NAME_POOL = PARTNER_NAMES.concat(STRANGER_NAMES, [
  "Thyme","Sorrel","Yucca","Tansy","Chervil","Alder","Willow","Lovage","Rue","Marjoram",
  "Chicory","Dill","Fennel","Laurel","Myrtle","Olive","Poppy","Reed","Saffron","Tamarind",
  "Vetch","Wren","Clary","Hawthorn","Birch","Cassia","Damson","Elder","Flax","Gorse",
  "Heather","Indigo","Jasmine","Kale","Lichen","Mallow","Nutmeg","Oat","Plantain","Quill",
  "Rosemary","Sumac","Teasel","Umber","Vervain","Wattle","Yew","Zinnia","Acacia","Burdock" ]);
/* cosmetic cow names live per tier in COW_TABLE[tier].names (a calf is never "the pale steer");
   the board draws each cow's name from its own tier without repeats. COW_NAMES is the flat union,
   kept for scripts and the sim dump; the engine reads COW_TABLE. */
const COW_NAMES = ["the spotted calf","the calf by the fence","the late calf","the dun calf",
                   "the pale steer","the muddy yearling","the fence-line steer","the black steer",
                   "the roan cow","the old cow","the broad-backed cow","the brindle cow"];

/* ── the constant block ─────────────────────────────────────────────────────────────── */
const BAT = {
  /* season shape (bible rows 1, 3, 12, 27) */
  nights:10,          // ten nights; the storm finale is the last two
  stormStart:9,       // storms on nights 9 and 10: bite +stormMod, 2 ticks, 2-cow board on the near paddock, far valley locked
  farFrom:3,          // far valley (and, from P5, the outpost) unlock on night 3 ...
  farTo:8,            // ... and lock again after night 8 (storm nights never offer it)
  rampNights:2,       // nights 1-2: near paddock only, no squalls, occupancy x rampOccMult (teach the bite loop first)
  rampOccMult:0.5,    // occupancy multiplier during the ramp

  /* night economy (rows 2, 9) */
  energyStart:2,      // blood at dusk on night 1 (0-energyCap float; two unfed nights running puts you at the door)
  energyCap:3,        // the crop holds at most this much blood (a meal never lifts you past it)
  starveHours:70,     // the death card: a bat that has fasted past about this many hours does not wake
  ticks:3,            // dark hours per night: approach = 1, each WAIT = 1; at 0 you fly home unfed
  bitesPerNight:1,    // exactly one bite roll a night, no retry: a miss wakes the herd and the hunt is over (row 7)
  stormTicks:2,       // dark hours on a storm night
  unfedBurn:1,        // any unfed night (miss, tick exhaustion, locked cows, early LEAVE-home) costs this ...
  unfedBurnHard:1.5,  // ... or this in a squall or storm, or if the far valley was flown (the burn is the commute; bite rolled or not)
  stormBurn:1.5,      // v2 key still read by the P3 engine (miss burn on stormy nights); dropped by the P4 engine, sim ignores it

  /* the player's bite (rows 4, 5, 7, 8) */
  playerFail:0.28, playerLo:0.14, playerHi:0.45,   // starting nightly fail odds, drawn with spread 1.5 and clamped (Wilkinson 1984: bats under 2 yr fail ~33% of nights)
  learnRate:0.93,     // each fed night multiplies pFail by this ...
  learnFloor:0.08,    // ... down to this floor (an experienced adult misses ~7%)
  damperAfter:2,      // luck damper: after this many straight unfed nights ...
  damperMod:-0.10,    // ... the next bite gets this (MODEL fairness rule; copy "you fly careful tonight")

  /* the partners' bites (row 6) */
  adultFail:0.07, adultLo:0.02, adultHi:0.18,      // adults miss ~7% of nights (Wilkinson 1984); drawn per partner with spread 2.0
  traitFailCap:0.30,  // a trait (far-ranger x1.6, thin +0.06) never lifts a roost-mate's miss rate past this

  /* bonds (rows 33, 38) */
  trustStart:0.50,    // every roost-mate starts at this bond (P4 engine, ruling 12: flat, no close-friends draw); v2 seeded 0.35, tuned by batsim3 2026-09-02: at 0.35 the Connector badge (sum of living trust >= badges.connector) was unreachable in ten nights
  trustClose:{n:2, lo:0.55, span:0.20},   // v2's two old friends at 0.55-0.75: reference only, not read by the P4 engine
  trustOther:{lo:0.12, span:0.26},        // v2's everyone-else at 0.12-0.38: reference only, not read by the P4 engine
  decay:0.02,         // trust fades this much every night
  trustFloor:0.02,    // ... and never below this (decay, refusals and shoving a roost-mate all floor here)
  refuseCost:0.15,    // refusing a hungry roost-mate while fed costs this bond ...
  refuseOweCost:0.30, // ... or this if that bat once saved you
  rescueBase:0.02,    // P(a fed roost-mate feeds you when you beg) = min(rescueCap, rescueBase + rescueSlope x trust)
  rescueSlope:0.60,
  rescueCap:0.9,
  rescueBond:0.10,    // the bat who saved you gains this much trust
  /* P10 lever 1 (Bryson 2026-09-03: "certain strategies should not always be best"): a close friend
     feeds you on a merely HUNGRY night, not only when you are at zero. Any unfed night that still
     leaves blood above zero: each present, fed partner at trust >= friendFeedTrust offers with
     P = friendFeedP; the first one to say yes is the only one (one meal a night). */
  friendFeedTrust:0.7,   // only a close friend brings up a meal for a bat who is not yet starving
  friendFeedP:0.35,      // P per close friend that she offers
  friendFeedBlood:0.5,   // blood you gain from her
  friendFeedBond:0.03,   // the bond she gains for it

  /* dawn stamina and grooming (rows 35, 36) */
  staminaPerNight:3,  // dawn actions ...
  staminaLowAt:1,     // ... minus one when blood <= this (hunger-stamina coupling)
  groomQuick:{cost:1, gain:0.07, recip:0.25, recipSlope:0.55},   // P(groomed back) = recip + recipSlope x trust (x trait recipMult), capped at recipCap
  groomLong:{cost:2, gain:0.16, recip:0.5,  recipSlope:0.5},
  recipCap:0.95,      // no groom-back is a sure thing
  dimReturns:0.45,    // groom gain x (1 - dimReturns x trust): warm bonds gain less per session
  groomBackHyg:0.15,  // fur regained when a roost-mate grooms you back

  /* hygiene and mites (row 38) */
  hygieneStart:0.7,   // fur at the start of the season
  hygieneDecay:0.10, hygieneStormDecay:0.20,   // fur lost per night (more in rain)
  missHygiene:0.05,   // extra fur lost on a real bite miss (tumbled in the grass)
  infestBelow:0.5,    // below this fur, P(mites move in) = infestBelow - hygiene
  parasiteDrain:0.5,  // mites drain this blood every night
  cureAbove:0.5,      // a groom-back that lifts fur to this clears them

  /* sharing (row 37); ptsHun cut 6/11/19 -> 3/5/8 (Bryson 2026-09-03: handing blood to everyone was the
     dominant score line); a share with a bat who is hungry but not starving now gains bond with the same
     diminishing returns as grooming (x (1 - dimReturns x trust)) */
  shares:[ {key:"sip",  label:"a sip",       blood:0.15, gain:0.08, ptsStarv:20, ptsHun:7},
           {key:"meal", label:"a meal",      blood:0.30, gain:0.15, ptsStarv:34, ptsHun:11},
           {key:"gen",  label:"a full crop", blood:0.50, gain:0.25, ptsStarv:54, ptsHun:16} ],
  /* P26 the two dawn sliders (Bryson: "a slider where you click on a bat then choose how much to
     give ... the bars should be capped by how much you have"). Grooming and giving are chosen on
     two bars in 5% steps instead of picked from five fixed buttons. The groom bar spends a
     percentage of tonight's energy; the give bar a percentage of a full crop, and it spends that
     SAME percentage of the energy, which is what replaces the flat shareStamina cost below.
     Neither bar can be dragged past what you are actually holding.
     The curves are SOLVED from groomQuick, groomLong and shares at load (see sliderFit below), so
     a third of the bar still pays exactly what a quick groom paid, two thirds what a long groom
     paid, and 0.15 / 0.30 / 0.50 blood what a sip, a meal and a full crop paid. The slider only
     fills in between those points and beyond them. Balanced over 20,000 seasons a policy in
     sim/batsim4.py with BATSIM_MODEL=slider (sim/batsim4_2026-09-04_p26.txt). */
  slider:{
    step:0.05,            // both bars stop every 5%
    groomOpen:0.50,       // where the groom bar opens: half the night's energy, the sim's best band is 35 to 50%
    giveOpen:0.10,        // the give bar for a bat who is merely hungry (0.3 blood, today's "a meal")
    giveSaveOpen:0.30,    // ... and for one whose life is in the balance, which is where the points curve turns
    giveFloor:0.05,       // the smallest gift the bar will offer
  },
  shareStamina:1,     // (P26: superseded by the proportional cost above; kept for the tier fallback and the sim)
  sharesPerDawn:1,    // P10 lever 3: one donation a dawn. A second is allowed only with a full crop ...
  fullCropMargin:0.3, // ... blood >= energyCap - this after the first. A save counts as the donation.
  shareLift:0.5,      // a hungry (not starving) bat you feed gains this blood; a starving one is set to 1
  partnerCap:2.0,     // roost-mates hold at most this much blood
  partnerEnergy:{lo:1.2, span:0.8},   // a roost-mate starts the season with lo + span x roll() blood (v2)
  strangerTrust:{lo:0.08, span:0.12}, // a stranger who claims a slot arrives at lo + span x roll() bond (v2)
  strangerEnergy:1.5, // ... and with this much blood (v2)

  /* conditions (rows 10-13) */
  moonBright:0.10,    // bite +0.10 on bright nights (cosine cycle, period = nights, random offset); v2 was 0.15, tuned by batsim3 2026-09-02 so a night-1 bat misses ~0.32 across all skies (Wilkinson's ~33%)
  moonDim:0.05,       // bite +0.05 on half-lit nights; v2 was 0.07 (same tune)
  moonBrightAt:0.75,  // brightness b = 0.5(1 + cos(2 pi (night + moonOff) / nights)); b >= this is bright ...
  moonDimAt:0.55,     // ... b >= this is dim, else dark (engine literals until the P4 engine reads them; the sim reads them)
  squallP:0.07,       // squall chance per night, nights rampNights+1 .. stormStart-1 only (3-8)
  squallMod:0.18,     // bite +0.18 in a squall; unfed night burns unfedBurnHard
  stormMod:0.15,      // bite +0.15 on storm nights
  richP:0.08,         // dark, non-squall nights: rich-pasture chance
  richMod:-0.05,      // rich night bite bonus (a cond.mod term, itemized on its own line)
  richBonus:0.25,     // rich night meal bonus

  /* pastures (rows 27, 30) */
  farFail:0.10,       // far valley bite penalty (the one far bite key); 0.08 -> 0.10 with the P12 payoff (higher risk, higher reward)
  farBonus:0.5,       // v2 far meal bonus; dropped by the P4 engine (meal = cow yield now), sim ignores it
  scoutMod:-0.03,     // far bite bonus when the board was scouted from the outpost (P5; G.run.scouted is false in P4)

  /* the board (rows 14-16, 19, 27); P5 (2026-09-03): every board is a random deal, 1-5 animals */
  dealWeights:{calf:1, steer:1, prime:1},   // every board draws each slot's tier from these (prime x PASTURES[p].primeWeight)
  dealCount:[0.10, 0.20, 0.30, 0.25, 0.15], // P(1 animal), P(2), ... P(5) on a calm night (Bryson 2026-09-03: "could be 1-5 available")
  dealCountStorm:[0.35, 0.40, 0.25],        // storm nights: 1-3 animals huddle
  dealSpan:560,               // stage x width the herd may spread over (centred on dealCentre) ...
  dealCentre:570,             // ... in the 960-wide viewBox; slots are evenly spaced, at most dealGap apart
  dealGap:200,
  mateOccupantP:0.5,          // an occupied cow's resident is a roost-mate with this P, else a stranger from RIVALS
  mateOccupantFedWeight:3,    // roost-mate draw weight when their background hunt fed tonight (else 1)

  /* the encounter (rows 18, 20-25) */
  openWoundMod:-0.05,         // bite bonus at any contested or waited wound (reopening is near-instant)
  joinBase:0.05,              // P(tolerated) = joinBase + joinSlope x trust (a stranger: joinBase only)
  joinSlope:0.50,
  cofeedBond:0.05,            // tolerated join: bond +0.05 both sides
  displaceWin:{young:0.50, adult:0.30, dominant:0.15, mate:0.30},   // P(the resident yields) by class; a roost-mate rolls as an adult
  displaceMateBond:-0.10,     // shoving a roost-mate costs this bond, win or lose, and is remembered
  waitLeaveP:0.5,             // WAIT: the resident leaves with this P per dark hour
  waitDrain:0.5,              // a waited wound yields waitDrain less ...
  waitFloor:0.5,              // ... but never less than this

  /* framing (row 40) and badges (bible section 5) */
  desperateAt:1,              // blood <= this: the "desperate hours" tint AND (P10 lever 2b) the hungry bite term
  hungryMod:0.12,             // P10: flying out on blood <= desperateAt costs you: bite +0.05, itemized as "hungry" (reverses the P4 "desperate hours carry no modifier" ruling; giving blood away is no longer free)
  badges:{bonded:0.8, connector:2.5, rank:3},   // Bonded: any trust >= 0.8; The Connector: sum of real bonds (living bats at trust >= roosts.knownTrust) >= 2.5 (P4: 4.0 over eight flat 0.5 bonds; P5 draws the hollow at 0.12-0.75, batsim4 puts 2.5 at the survivors' p80); Made of Rank: displacement wins >= 3

  /* P5 roosts (rows 28-31, rewritten to Bryson's 2026-09-02 spec and his 2026-09-03 additions:
     every roost is an independently drawn bundle; other bats switch roosts too, at a low rate) */
  roosts:{
    countP4:0.5,              // 3 roosts, or 4 with this P
    sizeMean:8, sizeSd:3, sizeMin:4, sizeMax:16,   // residents per roost: round(clamp(normal(mean, sd), min, max))
    friends:2,                // the hollow holds this many old friends (v2's two)
    friendTrust:{lo:0.55, span:0.20},   // ... who start here
    homeTrust:{lo:0.12, span:0.26},     // the rest of the hollow
    otherTrust:{lo:0.02, span:0.06},    // residents of every other roost: you have heard their calls, no more
    generousBase:0.15, generousSlope:0.35,   // trait deck at a roost: P(big-hearted) = base + slope x bondQ ...
    stingyBase:0.40,   stingySlope:-0.30,    // ... P(tight-furred) = base + slope x bondQ; far-ranger and thin as v2
    wandererP:0.15, frailP:0.10,
    warmBase:0.5, warmSlope:1.0,   // groom and share gains at a roost x (warmBase + warmSlope x bondQ); batsim4 2026-09-03 tuned from 0.7 + 0.6 so a warm roost is worth finding
    warmRecip:1,                   // 1: the same warmth scales the groom-back odds (0 = gains only)
    ppWithinBase:0.25, ppWithinSlope:0.45,   // residents' own friendship density = base + slope x bondQ ...
    ppAcross:0.05,                           // ... and across roosts
    switchP:0.06,             // reference rate; the engine draws the season's rate from BAT.season.switchLo..Hi (Bryson 2026-09-03: consistency matters, switching is a risk) ...
    switchWanderer:3,         // ... x this for a far-ranger
    visitorTrustMin:0.0,      // (reserved) no floor: a stranger's visit is a stranger's visit
    sickBase:0.02, sickCrowd:0.05, sickRisk:0.12,   // P(sick at dawn) = base + crowd x size/sizeMax + risk x disease (risk 0.08 -> 0.12, batsim4: a sickly hollow has to cost something)
    sickFirst:1.5,            // x on your first dawn at a roost
    sickHome:0.7,             // x at the hollow after night 1 (0.5 -> 0.7, batsim4)
    sickNights:2,             // sick for this many dawns: stamina -sickStamina, groom-backs x sickGroomBack
    sickStamina:2, sickGroomBack:0.5,   // sickStamina 1 -> 2 (batsim4 2026-09-03)
    sickNoShare:1,            // 1: a feverish bat does not regurgitate (no sharing while sick)
    sickMod:0.15,             // P6a: a feverish bat hunts worse: bite +0.15 while sick (itemized as "feverish"); 0.08 -> 0.15 in P10 so catching something is what makes a wide circle of contacts a real gamble
    aggroBase:0.01, aggroRisk:0.10,   // P(injured at dawn) = base + risk x aggression ...
    aggroFirst:1.15,          // ... x this on your first dawn there (you are the stranger); 2 -> 1.5 (batsim4) -> 1.15 (P10: roost wounds were deciding > 3% of the wanderer's deaths)
    allyTrust:0.5,            // ... and 0 if a resident you trust at least this much is present
    injuryBlood:0.32,         // injured: lose this blood at once (never below injuryFloor); 0.5 -> 0.4 (batsim4) -> 0.32 (P10, to keep roost wounds under 3% of deaths) ...
    injuryFloor:0.2,
    injuryNights:2, injuryStamina:1,   // ... and this many dawns of stamina -1 (min 1)
    strangerRecip:0.5,        // first dawn at a new roost: groom-backs x this ...
    strangerShareTrust:0.3,   // ... and nobody feeds a beggar they trust less than this
    rescueMinTrust:0.10,      // the beg pool everywhere: present, fed, trust >= this (a roost of strangers is no safety net)
    knownTrust:0.3,           // a resident you trust at least this much is "someone you know" on the roost card
    contactCallTrust:0.5,     // the rumor line on an unknown roost names a bat you trust >= this who dens there
    manyAt:10 },              // a dawn with this many bats present shows the who-needs-you strip
  /* P6a: the SEASON, drawn once per game (Bryson 2026-09-03: "make the payoff matrices more variable
     from game to game; sometimes a couple of really close friends is best, sometimes a diverse group").
     Four hidden draws, each with a cue at the first dusk and numbers the dawn panel shows:
     contagion (grooming and sharing are contacts; a coughing bat is a worse one), the rescue curve's
     exponent (convex = only strong bonds save you, concave = any familiar bat might), attention (how
     many real bonds you can keep warm before every bond fades faster) and the colony's switching rate. */
  season:{
    contagionLo:0.0, contagionHi:1.0,   // contagion ~ U(lo, hi)
    contactSick:0.46,        // P(you catch it) per bat you groomed or shared with at a dawn, at contagion 1 (0.05 never bit; P10 raised 0.18 -> 0.28 so every extra contact is a real risk) ...
    sickBatMult:5,           // ... x this if that bat was coughing
    coughP:0.20,             // a resident coughs on a given night with P = coughP x contagion x her roost's disease score ...
    coughNights:2,           // ... for this many nights (visible: a chip on her node)
    coughGroomBack:0.5,      // a coughing bat grooms back at half odds
    rescueKLo:0.6, rescueKHi:2.0,   // P(rescue) = min(cap, base + slope x trust ^ K), K ~ U(lo, hi) per season
    freeBondsLo:3, freeBondsHi:7,   // attention: real bonds you can keep warm at no extra cost, drawn per season ...
    breadthDecay:0.035,      // ... beyond that, EVERY bond loses this much more per night per extra bond (spread thin). 0.015 -> 0.035 in P10: this is the axis that makes a wide circle a real gamble when attention is short (sim/batsim4_2026-09-04_p10.txt)
    switchLo:0.02, switchHi:0.12,   // the colony's nightly switch rate, drawn per season (replaces roosts.switchP)
    cueHi:0.6, cueLo:0.3,    // contagion cue thresholds (a cough in the dark / a healthy roost)
    convexAt:1.4, concaveAt:0.8,    // rescue-curve cue thresholds
    fewAt:4, manyAt:6 },            // attention cue thresholds
  outpostDraw:{n:3, wandererW:3, frailW:0.3},   // v2/P5-draft key, not read by the P5 engine
  newcomerNights:2,           // v2/P5-draft key, not read by the P5 engine
  contactCallTrust:0.5,       // v2/P5-draft key; the P5 engine reads roosts.contactCallTrust

  /* dawn events (row 39) */
  strangerClaimP:0.5,         // a stranger claims an empty slot with this P once the grace night has passed
  eventP:0.3,                 // else squabble / pup with this P (no repeats); the dawn cold snap retired 2026-09-03 pm (the P7 coldsnap surprise covers it)
  eventSquabbleMult:1.5,      // squabble: grooming either ruffled bat gains x this
  eventPupMult:2,             // pup: grooming or blood for the mother counts x this
  coldsnapLongCost:1,         // cold snap: the long groom costs this much stamina instead of groomLong.cost

  /* points (bible section 5) */
  pts:{night:15,      // survived the night
       fed:8,         // fed
       primeSolo:14,  // on top of fed: a prime cow, fed alone
       farFed:12,     // P12: on top of fed: a meal taken in the far valley (the daring pays in points; the flight risks blood)
       unfed:5,       // consolation on any unfed night that ends with blood > 0
       cofeed:6,      // tolerated join
       displace:10,   // displacement win (the bond cost is real)
       rescued:15,    // a roost-mate fed you when you begged
       groomQ:0, groomL:0,   // P6a: grooming pays through the bond it builds, not per action (Bryson 2026-09-03)
       save:62,       // you fed a starving roost-mate (plus the share's ptsStarv); 38 -> 62 in P10: one donation a dawn means each one has to be worth making, and it is what keeps a wide circle competitive
       fedByFriend:10,// P10 lever 1: a close friend brought up part of her meal for you on a hungry night
       endSurvive:120, endBond:80, endRoost:90,   // season end: survive / x sum of real bonds ^ the season's rescue exponent (P6a; was 45 x linear) / no hollow resident died
       endBest:45,    // P10 lever 4: x your single deepest bond, so two real friends are worth naming
       endRecip:12,   // P10 lever 4: per living partner who ever fed you (reciprocity, not headcount)
       endBlood:45} };// P10 lever 2a: x the blood still in your crop at the end, so a surplus is never free to give away

/* ── partner traits ─────────────────────────────────────────────────────────────────── */
const TRAITS = {
  generous:{tag:"big-hearted",  hint:"grooms you back before you've even finished", recipMult:1.3},
  stingy:  {tag:"tight-furred", hint:"takes your grooming and gives little back",   recipMult:0.6},
  wanderer:{tag:"far-ranger",   hint:"hunts the far valleys, comes home heavy or not at all", failMult:1.6, feast:1.5},
  frail:   {tag:"thin",         hint:"older and slower than the rest; misses more nights", failAdd:0.06},
  plain:   {tag:"",             hint:"", } };
const TRAIT_DECK = ["generous","generous","stingy","stingy","wanderer","frail","plain","plain"];

/* ── cows (bible section 4; yield = meal in blood, mod = signed bite term, occ = P(a bat is already on it)) ── */
const COW_TABLE = {
  calf : { yield:0.75, mod:-0.04, occ:0.10, scale:0.62,
           names:["the spotted calf","the calf by the fence","the late calf","the dun calf"],
           label:"Calf",  cue:"small, close to its mother",
           intel:"Thin skin, light meal. Real vampires hit calves first: accessible beats big." },
  steer: { yield:1.0,  mod:0,     occ:0.25, scale:0.85,
           names:["the pale steer","the muddy yearling","the fence-line steer","the black steer"],
           label:"Steer", cue:"the standard dinner",
           intel:"A full crop if the bite lands." },
  prime: { yield:1.5,  mod:0,     occ:{base:0.55, perNight:0.03, cap:0.75},   // min(cap, base + perNight x (night - 1)): the colony converges on the best hosts
           scale:1.08,
           names:["the roan cow","the old cow","the broad-backed cow","the brindle cow"],
           label:"Prime cow", cue:"calm as a boulder",
           intel:"The best blood in the field, which is why someone usually got here first." } };

/* ── pastures (P5: every board is dealt at random, BAT.dealCount animals with tiers from
   BAT.dealWeights x primeWeight; the engine spaces the slots from BAT.dealSpan / dealGap) ── */
const PASTURES = {
  near: { label:"Near paddock",         primeWeight:1, far:false, burnHard:false },
  far : { label:"Far valley",           primeWeight:2, far:true,  burnHard:true, nights:[3,8],   // offered nights farFrom..farTo, never on storm nights
          yieldMult:1.3, occMult:0.5 },   // P12 (Bryson 2026-09-04: "extra benefit but higher risk"): fat, rarely bled cattle and few bats fly that far; tuned in sim/batsim4_2026-09-04_far.txt
  storm:{ label:"Near paddock (storm)", primeWeight:1, far:false, burnHard:true } };

/* ── roost types (P5): the hollow is home; the others are drawn 2-3 per game. Fiction only;
   the stage draws each `sil` from the approved snag or straight-edged primitives. `pasture`
   is the linked pasture (the outpost scouts the far valley: BAT.scoutMod on a far bite). ── */
const ROOST_TYPES = {
  hollow: { name:"the hollow",         sil:"snag",    pasture:"near",
            fiction:"the hollow tree above the near paddock, where you were born",
            cueSick:"the air is close and the floor is wet", cueAggro:"a scarred male hangs by the entrance" },
  outpost:{ name:"the valley outpost", sil:"outpost", pasture:"far",
            fiction:"a split snag on the ridge above the far valley; whoever dens here sees the far herd first",
            cueSick:"the crack smells of old guano", cueAggro:"two big males share the top of the split" },
  culvert:{ name:"the culvert",        sil:"culvert", pasture:"near",
            fiction:"the pipe under the ranch road, dry at this season, cool and echoing",
            cueSick:"water stands at the low end and the walls sweat", cueAggro:"a heavy bat hangs alone at the mouth, facing in" },
  mango:  { name:"the mango hollow",   sil:"mango",   pasture:"near",
            fiction:"the second tree, down by the river, older and wider than yours",
            cueSick:"the hollow is crowded and the floor is soft", cueAggro:"a scarred female drives the young ones to the edge" },
  barn:   { name:"the barn eaves",     sil:"barn",    pasture:"near",
            fiction:"the rafters over the herd's own shed; the cattle sleep right beneath you",
            cueSick:"dust, and a cough somewhere in the dark", cueAggro:"the rafters are claimed beam by beam" } };
const ROOST_DRAW = ["outpost","culvert","mango","barn"];   // the non-home types a game draws from (shuffled, 2-3 taken)

/* ── the rival cast (stranger occupants; class hidden until you JOIN or DISPLACE, tell always shown) ── */
/* subj / Subj / obj fill the {subj} {Subj} {obj} placeholders in COPY (roost-mates are she / She / her) */
const RIVALS = {
  bramble:{ name:"Bramble", cls:"dominant", subj:"she", Subj:"She", obj:"her", tell:"she does not pause her feeding as you circle" },
  aspen:  { name:"Aspen",   cls:"adult",    subj:"she", Subj:"She", obj:"her", tell:"steady at the wound, wings half-folded" },
  nettle: { name:"Nettle",  cls:"adult",    subj:"she", Subj:"She", obj:"her", tell:"watches you land, keeps drinking" },
  thistle:{ name:"Thistle", cls:"young",    subj:"he",  Subj:"He",  obj:"him", tell:"shifts nervously, wings half-spread" },
  yarrow: { name:"Yarrow",  cls:"young",    subj:"he",  Subj:"He",  obj:"him", tell:"small, quick, keeps looking up" } };

/* ── P7 season events (Bryson 2026-09-03 evening): two are drawn per game at the start, one for
   each of EVENT_NIGHTS, shown in the HUD from night 1 with the night they land on. Each carries a
   drawn amount (lo..hi, or a list) that the copy quotes. `lean` says which investment style the
   event favours in batsim4 (sim/batsim4_2026-09-03_events.txt): "focused" (a couple of close friends) or
   "diversified" (a wide circle); the announced pair is drawn with one of each so a season never stacks the same way twice. Copy lives in bat-copy.js
   (COPY.ev*). Numbers here are MODEL (bible has no event table). ── */
const EVENT_NIGHTS = [3, 6];                              // P7 announced-event nights; NOT read since P9 (the years replaced the announced pair), kept for old sims
const EVENT_HIDDEN = {n:2, nightLo:4, nightHi:8};         // two SURPRISE events per game, any lean, on random nights in this window, revealed (popup + icon) when they land
const EVENTS = {
  hunters:  { icon:"🏹", lean:"diversified", fracs:[0.25, 0.34] },              // a random fraction of the colony dies
  bigstorm: { icon:"🌪", lean:"focused" },                                  // one roost is wiped out (you escape if it was yours)
  cattle:   { icon:"🐄", lean:"focused",     yieldMult:0.5, nights:[2, 4] },    // every meal worth half
  plague:   { icon:"🦠", lean:"diversified",     nights:[2, 3] },                   // everyone sick, you included
  dominant: { icon:"😠", lean:"focused",     aggro:0.9, nights:[3, 5] },        // an angry bat in every roost
  deaf:     { icon:"🔇", lean:"focused", missP:0.5, nights:[2, 4] },        // half your dawn actions land on the wrong bat
  drive:    { icon:"🐂", lean:"diversified", extra:2, primeMult:2, nights:[2, 4] },   // a new herd: more animals, more primes
  drought:  { icon:"🌵", lean:"diversified",     maxCows:3, nights:[2, 4] },        // far valley closed, thin boards
  newcomers:{ icon:"🦇", lean:"diversified", perRoost:[2, 4] },                // strangers join every roost
  mites:    { icon:"🕷", lean:"focused", decayMult:2, nights:[3, 5] },      // fur fouls twice as fast
  moon:     { icon:"🌕", lean:"focused",     nights:[2, 3] },                   // full moon every night
  coldsnap: { icon:"❄", lean:"focused", longCost:1, nights:[2, 4] } };     // long grooms cost one stamina

/* ── P9 YEAR events (Bryson 2026-09-03 evening): two things have ALREADY happened to the colony when
   the season opens, and they hold all ten nights. Drawn per game, one "focused" and one "diversified"
   lean, so a year always pulls the two investment styles in different directions. Each year is a
   trade-off (a change of playstyle, not of power): batsim4 tunes the compensating term so every year's
   median score sits within a few percent of the others (Bryson: nobody should refresh for a "good"
   year). Fields the engine reads (activeMods / genSeason / genRoosts):
     aggroFloor  every roost's aggression is at least this (an ally present still deters)
     occMult     x on every cow's chance of being occupied
     rescueK     the season's rescue exponent is pinned here (see BAT.season)   rescueBase  overrides BAT.rescueBase
     groomMult   x on every groom's bond gain            yieldMult  x on every meal
     contagion   the season's contagion is pinned        coughMult  x on the residents' cough rate
     sizeMult    x on every roost's size (and its cap)   warmAdd    added to the roost warm-up multiplier
     freeBondsAdd added to the season's attention        switchP    the colony's switch rate is pinned
     strangerEase 1: no first-dawn penalties at a new roost (groom-backs, the beg pool)
     maxCows     boards never hold more animals than this
   The announced night-3 / night-6 events of P7 are gone; EVENTS now feeds the surprises only. Copy in
   bat-copy.js (COPY.yr*). Numbers here are MODEL (tuned in sim/batsim4_2026-09-03_years.txt). ── */
const YEAR_SLOTS = 2;                                     // two year events per game, one of each lean
/* terms = the parts of the world a year makes a claim about. Two years that share a term are never
   drawn together (genYears): "the ones left are fat" beside "the cattle are thin" reads as a flat
   contradiction in the night-1 briefing, and the pinned terms (rescueK / rescueBase, occMult) would
   either cancel or silently overwrite each other. groomMult is deliberately NOT a term: stingy
   headlines it, restless only nudges it, and the two push the same way. ── */
const YEARS = {
  rough:    { icon:"😠", lean:"focused",     terms:["aggro","occ"], aggroFloor:0.7, occMult:0.8 },                     // scarred males in every roost; the cattle are less contested
  stingy:   { icon:"🩸", lean:"focused",     terms:["rescue"], rescueK:2.5, rescueBase:0, groomMult:1.4 },             // only close friends feed a beggar; grooming builds bonds faster
  sickly:   { icon:"🦠", lean:"focused",     terms:["contagion","meal"], contagion:1.0, coughMult:2, yieldMult:1.3 },  // a cough for good; fat, healthy herds
  quiet:    { icon:"🌘", lean:"diversified", terms:["size"], sizeMult:0.55, warmAdd:0.2 },                             // small roosts; everyone warms to you quickly
  generous: { icon:"🌾", lean:"diversified", terms:["rescue","meal"], rescueK:0.6, rescueBase:0.10, yieldMult:0.48 },  // any familiar bat may feed you; thinner meals
  restless: { icon:"🌬", lean:"diversified", terms:["switch"], switchP:0.28, strangerEase:1, groomMult:1.15 },         // bats drift between roosts; nobody minds a stranger
  crowded:  { icon:"🦇", lean:"diversified", terms:["size","attention"], sizeMult:1.25, freeBondsAdd:3 },              // packed roosts (more sickness), more attention to spare
  lean:     { icon:"🐄", lean:"focused",     terms:["cows","occ","meal"], maxCows:3, occMult:1.4, yieldMult:1.3 } };   // thin herds, crowded wounds; the animals that are left are fat

/* P26: solve the slider's curves from the tiers above, once, at load. Doing it here rather than
   writing the fitted numbers down by hand means the two can never drift apart: change a share tier
   or a groom and the continuous curve moves with it, in the game AND in the sim (sim/dump-data.js
   exports BAT.slider, and batsim4.py reads it).
     grooming bond gain   groomQuick.gain x (s / quickAt) ^ pow, with pow chosen so that a
                          two-thirds groom pays exactly groomLong.gain
     groom-back chance    base x s (which already passes through the origin, so a token brush cannot
                          farm groom-backs) plus trust x a slope that runs recipSlope to recipSlope
     donation payoff      a saturating curve max x (1 - exp(-blood / lam)) through the sip and the
                          full crop. Saturating is the honest shape: a starving bat can only use so
                          much blood, and without it a 100% gift would pay three figures. */
(function sliderFit(){
  const gq = BAT.groomQuick, gl = BAT.groomLong, S = {};
  BAT.shares.forEach(x=> S[x.key] = x);
  const sip = S.sip, gen = S.gen;
  const quickAt = gq.cost / BAT.staminaPerNight, longAt = gl.cost / BAT.staminaPerNight;
  /* y = max x (1 - exp(-b/lam)) through two points; bisect on lam */
  function fitSat(b1, y1, b2, y2){
    let lo = 0.02, hi = 200;
    for(let i = 0; i < 200; i++){
      const mid = (lo + hi) / 2;
      if((1 - Math.exp(-b2/mid)) / (1 - Math.exp(-b1/mid)) > y2/y1) hi = mid; else lo = mid;
    }
    const lam = (lo + hi) / 2;
    return {lam: lam, max: y1 / (1 - Math.exp(-b1/lam))};
  }
  Object.assign(BAT.slider, {
    quickAt: quickAt, longAt: longAt,
    groomPow: Math.log(gl.gain / gq.gain) / Math.log(longAt / quickAt),
    recipBase: (gl.recip - gq.recip) / (longAt - quickAt),
    starv: fitSat(sip.blood, sip.ptsStarv, gen.blood, gen.ptsStarv),
    hun:   fitSat(sip.blood, sip.ptsHun,   gen.blood, gen.ptsHun),
    gain:  fitSat(sip.blood, sip.gain,     gen.blood, gen.gain),
  });
})();

/* player-facing copy and the achievements table live in bat-copy.js (loaded after this file) */

/* ── citations (keys used by META and the intel footnote) ───────────────────────────── */
const CITES = {
  wilkinson1984:"Wilkinson 1984 Nature",
  wilkinson1985a:"Wilkinson 1985a Behav Ecol Sociobiol",
  wilkinson1985b:"Wilkinson 1985b Behav Ecol Sociobiol",
  wilkinson1986:"Wilkinson 1986 Anim Behav",
  greenhall1972:"Greenhall 1972",
  greenhall1971:"Greenhall, Schmidt & Lopez-Forment 1971",
  turner1975:"Turner 1975",
  crespo1972:"Crespo, Burns, Mitchell & Linhart 1972 J Mammal 53:366-368",
  saldana2013:"Saldaña-Vázquez & Munguía-Rosas 2013",
  mcnab1973:"McNab 1973",
  mcfarland1969:"McFarland & Wimsatt 1969",
  ripperger2021:"Ripperger & Carter 2021",
  carter2020:"Carter et al. 2020",
  carter2013:"Carter & Wilkinson 2013",
  carter2016:"Carter & Wilkinson 2016",
  carter2012:"Carter et al. 2012",
  carter2015:"Carter & Leffer 2015",
  sailler1978:"Sailler & Schmidt 1978 (captive)",
  crisp2021:"Crisp, Brent & Carter 2021",
  lewis1995:"Lewis 1995",
  stephens1981:"Stephens 1981",
  stockmaier2018:"Stockmaier, Bolnick, Page & Carter 2018 Anim Behav",
  ripperger2020:"Ripperger, Stockmaier & Carter 2020 Behav Ecol" };

/* ── META: provenance for every number the player can see ────────────────────────────
   Key = dotted path into BAT / COW_TABLE / PASTURES / RIVALS. An entry covers every numeric
   leaf beneath its path (so "BAT.shares" covers the whole share table and
   "BAT.displaceWin" all four odds); leaves with their own reasoning get their own entry.
   Each entry has cite:[CITES keys] and/or model:true + why. ?debug=cites lists any
   numeric leaf with no covering entry, and any entry with neither cite nor model.
   Bible master-table row numbers are noted so the audit can walk rows 1-41. */
const META = {
  /* row 1 season */
  "BAT.nights":      {model:true, why:"pacing: ten nights, storm finale (bible row 1)"},
  "BAT.stormStart":  {model:true, why:"storm finale on the last two nights (v2 structure, row 1)"},
  /* row 2 ticks */
  "BAT.ticks":       {model:true, why:"usable darkness framed as three dark hours; bouts run 9-40 min and several bouts a night are observed (row 2)", cite:["greenhall1972","wilkinson1985a"]},
  /* row 7 one bite */
  "BAT.bitesPerNight":{model:true, why:"nightly-failure framing: the night is the roll's unit, and a disturbed herd is abandoned (row 7)", cite:["wilkinson1984","greenhall1971"]},
  "BAT.stormTicks":  {model:true, why:"storms shorten the usable night (row 2, row 12)"},
  /* row 3 ramp */
  "BAT.farFrom":     {model:true, why:"far valley and outpost unlock once the bite loop is learned (row 3)"},
  "BAT.farTo":       {model:true, why:"far valley locks with the outpost before the storms (rows 3, 27)"},
  "BAT.rampNights":  {model:true, why:"teach the bite loop first: nights 1-2 near only, no squalls (row 3)"},
  "BAT.rampOccMult": {model:true, why:"half occupancy on the ramp nights (row 3)"},
  /* row 4 pFail */
  "BAT.playerFail":  {cite:["wilkinson1984"]},
  "BAT.playerLo":    {model:true, why:"clamp on the skill draw around the cited 33% (row 4)", cite:["wilkinson1984"]},
  "BAT.playerHi":    {model:true, why:"clamp on the skill draw around the cited 33% (row 4)", cite:["wilkinson1984"]},
  /* row 5 learning */
  "BAT.learnRate":   {model:true, why:"rate is ours; the direction (juvenile to adult gap) is cited (row 5)", cite:["wilkinson1984"]},
  "BAT.learnFloor":  {model:true, why:"floor sits at the adult nightly miss rate (row 5)", cite:["wilkinson1984"]},
  /* row 6 adults */
  "BAT.adultFail":   {cite:["wilkinson1984"]},
  "BAT.adultLo":     {model:true, why:"clamp on the per-partner draw around the cited 7% (row 6)", cite:["wilkinson1984"]},
  "BAT.adultHi":     {model:true, why:"clamp on the per-partner draw around the cited 7% (row 6)", cite:["wilkinson1984"]},
  "BAT.traitFailCap":{model:true, why:"a trait shifts a roost-mate's odds but no adult misses more than 30% of nights (row 6)", cite:["wilkinson1984"]},
  /* row 8 damper */
  "BAT.damperAfter": {model:true, why:"fairness rule with no field analog, deliberately uncited: caps variance so two bad rolls in a ten-night run cannot become a death spiral the player never chose (row 8)"},
  "BAT.damperMod":   {model:true, why:"the one pure-engineering constant in the game; variance capping, see damperAfter (row 8)"},
  /* row 9 blood */
  "BAT.energyStart": {model:true, why:"two nights of fuel in hand; a 60-70 h starvation window (row 9)", cite:["wilkinson1984","mcnab1973"]},
  "BAT.energyCap":   {model:true, why:"a crop holds a night and a half of surplus at most; the cap keeps a lucky streak from banking the whole season (row 9)", cite:["mcnab1973"]},
  "BAT.starveHours": {model:true, why:"bats that fail to feed two nights running are near death by the third; about 60-70 h without a meal (row 9)", cite:["wilkinson1984","mcnab1973"]},
  "BAT.unfedBurn":   {model:true, why:"one night of fuel per unfed night, charged once however the night went (row 9, M2)", cite:["wilkinson1984","mcnab1973"]},
  "BAT.unfedBurnHard":{model:true, why:"rain and long commutes cost more; magnitude ours (rows 9, 11, 27)", cite:["mcnab1973"]},
  "BAT.stormBurn":   {model:true, why:"v2 storm miss burn; superseded by unfedBurnHard (row 9)"},
  /* row 10 moon */
  "BAT.moonBright":  {model:true, why:"lunar phobia direction is cited; magnitude ours: v2's 0.15 tuned to 0.10 by batsim3 so the night-1 miss across all skies sits at the cited ~33% (row 10)", cite:["crespo1972","saldana2013"]},
  "BAT.moonDim":     {model:true, why:"lunar phobia direction is cited; magnitude ours, v2's 0.07 tuned to 0.05 with moonBright (row 10)", cite:["crespo1972","saldana2013"]},
  "BAT.moonBrightAt":{model:true, why:"cosine-cycle thresholds: about a third of nights bright, a seventh dim (row 10, v2)"},
  "BAT.moonDimAt":   {model:true, why:"as moonBrightAt (row 10, v2)"},
  /* row 11 squall */
  "BAT.squallP":     {model:true, why:"squalls only between the ramp and the storms (nights 3-8); rate ours (row 11)", cite:["mcnab1973"]},
  "BAT.squallMod":   {model:true, why:"rain as an energetic and hunting penalty; magnitude ours (row 11)", cite:["mcnab1973"]},
  /* row 12 storm */
  "BAT.stormMod":    {model:true, why:"storm finale bite penalty (v2, row 12)"},
  /* row 13 rich */
  "BAT.richP":       {model:true, why:"rich-pasture nights (v2, row 13)"},
  "BAT.richMod":     {model:true, why:"a cond.mod term, itemized on its own intel line (row 13)"},
  "BAT.richBonus":   {model:true, why:"full crops on a rich night (row 13)"},
  /* rows 14-17 cows */
  "COW_TABLE.calf":  {model:true, why:"calves and accessible animals are preferred; values ours (row 14)", cite:["turner1975"]},
  "COW_TABLE.steer": {model:true, why:"the baseline dinner (row 15)"},
  "COW_TABLE.prime": {model:true, why:"favored hosts are re-attacked nightly; occupancy tuned so the greedy path meets a resident most nights (row 16)", cite:["greenhall1972","turner1975"]},
  "COW_TABLE.calf.scale":  {model:true, why:"render size only: the prototype's tier scales (row 17: a full meal is 40-60% of body mass)", cite:["greenhall1972","mcfarland1969"]},
  "COW_TABLE.steer.scale": {model:true, why:"render size only (row 17)", cite:["greenhall1972","mcfarland1969"]},
  "COW_TABLE.prime.scale": {model:true, why:"render size only (row 17)", cite:["greenhall1972","mcfarland1969"]},
  /* row 18 open wound */
  "BAT.openWoundMod":{model:true, why:"reopening an existing wound is preferred and near-instant; value ours (row 18)", cite:["greenhall1972"]},
  /* row 19 occupant */
  "BAT.mateOccupantP":{model:true, why:"bonded bats rendezvous on the same cattle; the split is ours (row 19)", cite:["ripperger2021"]},
  "BAT.mateOccupantFedWeight":{model:true, why:"a roost-mate who fed tonight is the likelier shape on a cow (row 19)", cite:["ripperger2021"]},
  /* rows 20-22 join */
  "BAT.joinBase":    {model:true, why:"simultaneous feedings are rare: 5 in 36.6 h across 65 bats, mostly mother and young (row 20); a refusal is a feeding-place confrontation call, no injury, cow locked (row 21, captive study cited as such)", cite:["wilkinson1985a","sailler1978"]},
  "BAT.joinSlope":   {model:true, why:"bond predicts foraging association; slope flattened (row 20)", cite:["ripperger2021"]},
  "BAT.cofeedBond":  {model:true, why:"co-feeding builds the bond; magnitude ours (row 22)", cite:["ripperger2021","carter2020"]},
  /* rows 23-24 displace */
  "BAT.displaceWin": {model:true, why:"larger displaces smaller at a wound; a roost-mate rolls as an adult; values ours (row 23)", cite:["wilkinson1985a"]},
  "BAT.displaceMateBond":{model:true, why:"feeding-site aggression has a social price in a reciprocity economy (row 24)", cite:["wilkinson1984","greenhall1972"]},
  /* row 25 wait */
  "BAT.waitLeaveP":  {model:true, why:"bouts run 9-40 min, so a mid-bout arrival resolves in about one dark hour half the time; sequential feeding observed (row 25)", cite:["greenhall1972","wilkinson1985a"]},
  "BAT.waitDrain":   {model:true, why:"a drained wound yields less; value ours (row 25)", cite:["greenhall1972"]},
  "BAT.waitFloor":   {model:true, why:"a waited wound still feeds (row 25)"},
  /* row 27 far valley */
  "BAT.farFail":     {model:true, why:"several-km excursions are common; the penalty is ours (row 27)", cite:["wilkinson1985a"]},
  "BAT.farBonus":    {model:true, why:"v2 far meal bonus, dropped in P4 (meal = cow yield) (row 27)"},
  "BAT.dealWeights": {model:true, why:"every board draws tiers evenly, prime weighted by pasture (row 27)"},
  "BAT.dealCount":   {model:true, why:"how many animals sleep within reach varies night to night: 1-5, most often 3 (Bryson 2026-09-03); a herd's accessible fraction is not constant (row 27)", cite:["turner1975"]},
  "BAT.dealCountStorm":{model:true, why:"a storm huddle offers 1-3 (row 12)"},
  "BAT.dealSpan":    {model:true, why:"stage layout: the herd's x extent in the 960 viewBox"},
  "BAT.dealCentre":  {model:true, why:"stage layout: the herd's centre x"},
  "BAT.dealGap":     {model:true, why:"stage layout: the widest gap between two animals"},
  "PASTURES.near":   {model:true, why:"the home paddock: 1-5 animals, even tiers (row 27)"},
  "PASTURES.far":    {model:true, why:"1-5 animals, primes twice as common, nights 3-8 (row 27); P12: meals x yieldMult (cattle nobody bleeds are fatter) and occupancy x occMult (few bats commute that far), against a worse bite and the 1.5 blood flight home; tuned so going far pays only for a skilled, well-fed bat (sim/batsim4_2026-09-04_far.txt)", cite:["wilkinson1985a"]},
  "PASTURES.storm":  {model:true, why:"1-3 animals huddle on the near paddock in the storm (row 12)"},
  /* rows 28-31 roosts (P5, Bryson's spec 2026-09-02 + the 2026-09-03 additions) */
  "BAT.roosts.countP4":  {model:true, why:"3 or 4 roosts a game: enough to make exploring a real choice, few enough to learn in ten nights (row 28)", cite:["wilkinson1985a"]},
  "BAT.roosts.sizeMean": {model:true, why:"vampire roost groups of a few to a couple of dozen; 4-16 around 8 keeps the dawn readable (row 28)", cite:["wilkinson1985a"]},
  "BAT.roosts.sizeSd":   {model:true, why:"as sizeMean (row 28)", cite:["wilkinson1985a"]},
  "BAT.roosts.sizeMin":  {model:true, why:"as sizeMean (row 28)", cite:["wilkinson1985a"]},
  "BAT.roosts.sizeMax":  {model:true, why:"as sizeMean; the dawn network's ceiling (row 28)", cite:["wilkinson1985a"]},
  "BAT.roosts.friends":  {model:true, why:"two old friends at the start (v2, row 39)"},
  "BAT.roosts.friendTrust":{model:true, why:"v2's two old friends at 0.55-0.75 (row 39)"},
  "BAT.roosts.homeTrust":{model:true, why:"v2's everyone-else-at-home at 0.12-0.38 (row 39)"},
  "BAT.roosts.otherTrust":{model:true, why:"another roost's residents barely know your call (row 28)", cite:["carter2016"]},
  "BAT.roosts.generousBase":{model:true, why:"a roost's generosity mix follows its hidden bondQ (row 28)"},
  "BAT.roosts.generousSlope":{model:true, why:"as generousBase (row 28)"},
  "BAT.roosts.stingyBase":{model:true, why:"as generousBase (row 28)"},
  "BAT.roosts.stingySlope":{model:true, why:"as generousBase (row 28)"},
  "BAT.roosts.wandererP":{model:true, why:"v2 deck share of far-rangers (row 39)"},
  "BAT.roosts.frailP":   {model:true, why:"v2 deck share of thin bats (row 39)"},
  "BAT.roosts.warmBase": {model:true, why:"how fast a roost warms to you follows its bondQ; magnitude ours (row 28)", cite:["carter2020"]},
  "BAT.roosts.warmSlope":{model:true, why:"as warmBase (row 28)", cite:["carter2020"]},
  "BAT.roosts.warmRecip":{model:true, why:"a warm roost also grooms you back more readily (row 28)", cite:["carter2015"]},
  "BAT.roosts.ppWithinBase":{model:true, why:"residents' own friendship density; v2's 0.35 made roost-dependent (row 34)"},
  "BAT.roosts.ppWithinSlope":{model:true, why:"as ppWithinBase (row 34)"},
  "BAT.roosts.ppAcross": {model:true, why:"bats of different roosts rarely groom (row 34)", cite:["wilkinson1985a"]},
  "BAT.roosts.switchP":  {model:true, why:"bats use several roost trees and switch between them at a low rate, so a friend is sometimes not where you expect her (Bryson 2026-09-03); rate ours (row 28)", cite:["wilkinson1985a"]},
  "BAT.roosts.switchWanderer":{model:true, why:"far-rangers switch more (row 28)", cite:["wilkinson1985a"]},
  "BAT.roosts.visitorTrustMin":{model:true, why:"reserved, no effect (row 28)"},
  "BAT.roosts.sickBase": {model:true, why:"sick bats groom less and are groomed less: direction cited, all rates ours (row 28)", cite:["stockmaier2018","ripperger2020"]},
  "BAT.roosts.sickCrowd":{model:true, why:"crowding raises transmission (row 28)", cite:["ripperger2020"]},
  "BAT.roosts.sickRisk": {model:true, why:"a roost's hidden disease score (row 28)", cite:["stockmaier2018"]},
  "BAT.roosts.sickFirst":{model:true, why:"a newcomer meets new pathogens (row 28)"},
  "BAT.roosts.sickHome": {model:true, why:"you carry the hollow's immunity (row 28)"},
  "BAT.roosts.sickNights":{model:true, why:"a short illness, two dawns (row 28)", cite:["stockmaier2018"]},
  "BAT.roosts.sickStamina":{model:true, why:"sick bats groom less (row 28)", cite:["stockmaier2018"]},
  "BAT.roosts.sickGroomBack":{model:true, why:"sick bats are groomed less (row 28)", cite:["stockmaier2018","ripperger2020"]},
  "BAT.roosts.sickMod":  {model:true, why:"a sick bat forages worse; the direction is cited, the magnitude ours (row 28)", cite:["ripperger2020"]},
  "BAT.roosts.sickNoShare":{model:true, why:"sick bats share less; here not at all while feverish (row 28)", cite:["stockmaier2018"]},
  "BAT.roosts.aggroBase":{model:true, why:"agonistic encounters and wounds happen at roosts; rates ours (row 28)", cite:["wilkinson1985b"]},
  "BAT.roosts.aggroRisk":{model:true, why:"a roost's hidden aggression score (row 28)", cite:["wilkinson1985b"]},
  "BAT.roosts.aggroFirst":{model:true, why:"residents guard against strangers (row 29)", cite:["wilkinson1985b"]},
  "BAT.roosts.allyTrust":{model:true, why:"an ally at your side: a bat you trust deters the attack (row 28)"},
  "BAT.roosts.injuryBlood":{model:true, why:"a bite costs blood (row 28)"},
  "BAT.roosts.injuryFloor":{model:true, why:"a roost wound alone never kills you outright; the next unfed night can (row 28)"},
  "BAT.roosts.injuryNights":{model:true, why:"two dawns of a stiff wing (row 28)"},
  "BAT.roosts.injuryStamina":{model:true, why:"a wounded bat grooms less (row 28)"},
  "BAT.roosts.strangerRecip":{model:true, why:"a resident male guards the hollow against strangers; a newcomer is tolerated, not welcomed (row 29)", cite:["wilkinson1985b"]},
  "BAT.roosts.strangerShareTrust":{model:true, why:"no one shares with a stranger; sharing follows prior grooming (row 29)", cite:["wilkinson1984","carter2020"]},
  "BAT.roosts.rescueMinTrust":{model:true, why:"sharing happens among familiar associates, so a roost of strangers is no safety net (row 32)", cite:["wilkinson1984"]},
  "BAT.roosts.knownTrust":{model:true, why:"the roost card names residents you have really bonded with (row 31)"},
  "BAT.roosts.contactCallTrust":{model:true, why:"contact calls attract past sharing partners; threshold ours (row 31)", cite:["carter2016","carter2012"]},
  "BAT.roosts.manyAt":   {model:true, why:"a crowded dawn gets the who-needs-you strip (row 28)"},
  /* P6a season draws */
  /* P10 levers (2026-09-04, home PC; balanced in sim/batsim4_2026-09-04_p10.txt) */
  "BAT.friendFeedTrust":{model:true, why:"only a close partner feeds a bat who is merely hungry: donation tracks the strength of the relationship, and the strongest bonds give without being begged (row 41); the threshold is ours", cite:["carter2013","wilkinson1984"]},
  "BAT.friendFeedP":  {model:true, why:"how often a close partner offers on a hungry night; tuned in sim/batsim4_2026-09-04_p10.txt so a focused player has real income without being safe", cite:["carter2013"]},
  "BAT.friendFeedBlood":{model:true, why:"part of a meal, not a whole one: less than the at-zero rescue's full top-up", cite:["wilkinson1984"]},
  "BAT.friendFeedBond":{model:true, why:"a small bond gain for the giver, as reciprocal donations build relationships (Carter & Wilkinson 2013); value ours", cite:["carter2013"]},
  "BAT.hungryMod":   {model:true, why:"a bat flying out on an empty crop hunts worse: reserves are low, and the P4 ruling that desperate hours carry no modifier is reversed in P10 so giving blood away has a cost", cite:["mcnab1973","wilkinson1984"]},
  "BAT.sharesPerDawn":{model:true, why:"regurgitation is one bout of one meal, not a round of the roost; the second donation needs a full crop (row 41)", cite:["wilkinson1984"]},
  "BAT.fullCropMargin":{model:true, why:"how close to a full crop you must still be to give a second time; value ours"},
  "BAT.season.contagionLo":{model:true, why:"how much sickness moves through contacts varies by season; direction: grooming and sharing are physical contacts (Stockmaier 2018)", cite:["stockmaier2018","ripperger2020"]},
  "BAT.season.contagionHi":{model:true, why:"as contagionLo", cite:["stockmaier2018","ripperger2020"]},
  "BAT.season.contactSick":{model:true, why:"per-contact transmission at full contagion; value ours", cite:["ripperger2020"]},
  "BAT.season.sickBatMult":{model:true, why:"a visibly sick contact is the risky one", cite:["stockmaier2018"]},
  "BAT.season.coughP":    {model:true, why:"how many residents are visibly sick follows contagion and the roost's disease score", cite:["ripperger2020"]},
  "BAT.season.coughNights":{model:true, why:"a short illness, as the player's", cite:["stockmaier2018"]},
  "BAT.season.coughGroomBack":{model:true, why:"sick bats groom less", cite:["stockmaier2018"]},
  "BAT.season.rescueKLo": {model:true, why:"the shape of the donation curve varies by season: convex seasons reward a few close partners, concave ones a wide circle; donation tracks relationship strength (Carter & Wilkinson 2013), the exponent is ours"},
  "BAT.season.rescueKHi": {model:true, why:"as rescueKLo", cite:["carter2013"]},
  "BAT.season.freeBondsLo":{model:true, why:"attention: bonds need maintenance and there is only so much of you; how many you can keep warm varies by season (grooming budgets, Wilkinson 1986)", cite:["wilkinson1986"]},
  "BAT.season.freeBondsHi":{model:true, why:"as freeBondsLo", cite:["wilkinson1986"]},
  "BAT.season.breadthDecay":{model:true, why:"spread thin: every bond fades faster per extra bond; value ours"},
  "BAT.season.switchLo":  {model:true, why:"roost switching varies by season (row 28)", cite:["wilkinson1985a"]},
  "BAT.season.switchHi":  {model:true, why:"as switchLo", cite:["wilkinson1985a"]},
  "BAT.season.cueHi":     {model:true, why:"cue threshold only"},
  "BAT.season.cueLo":     {model:true, why:"cue threshold only"},
  "BAT.season.convexAt":  {model:true, why:"cue threshold only"},
  "BAT.season.concaveAt": {model:true, why:"cue threshold only"},
  "BAT.season.fewAt":     {model:true, why:"cue threshold only"},
  "BAT.season.manyAt":    {model:true, why:"cue threshold only"},
  /* P7 season events (all MODEL; directions noted) */
  "EVENTS.hunters":  {model:true, why:"people kill vampire bats over rabies fears (culls are real); the fraction is ours", cite:["wilkinson1985a"]},
  "EVENTS.cattle":   {model:true, why:"sick cattle, thinner meals; values ours"},
  "EVENTS.plague":   {model:true, why:"a colony-wide illness; sick bats groom and share less (Stockmaier 2018)", cite:["stockmaier2018"]},
  "EVENTS.dominant": {model:true, why:"aggressive residents at every roost; an ally deters (Wilkinson 1985b)", cite:["wilkinson1985b"]},
  "EVENTS.deaf":     {model:true, why:"bats recognise partners by contact calls (Carter 2012); deafened, you misidentify half the time", cite:["carter2012"]},
  "EVENTS.drive":    {model:true, why:"a new herd within reach; values ours"},
  "EVENTS.drought":  {model:true, why:"herds move off in a dry spell; values ours"},
  "EVENTS.newcomers":{model:true, why:"immigration into roosts (Wilkinson 1985a); counts ours", cite:["wilkinson1985a"]},
  "EVENTS.mites":    {model:true, why:"a mite bloom; fur fouls faster (Lewis 1995)", cite:["lewis1995"]},
  "EVENTS.moon":     {model:true, why:"a run of bright nights (Crespo 1972)", cite:["crespo1972"]},
  "EVENTS.coldsnap": {model:true, why:"huddling makes long grooming cheap (v2 event deck)"},
  /* P9 years: model numbers, each pair tuned in batsim4 (sim/batsim4_2026-09-03_years.txt) so no year is worth refreshing for */
  "YEAR_SLOTS":     {model:true, why:"two year events per game, one of each lean and never sharing a term (YEARS.terms), so a year never stacks one way or contradicts itself"},
  "YEARS.rough":    {model:true, why:"aggressive residents everywhere (Wilkinson 1985b); an ally deters; the compensating term (less contested cattle) is ours", cite:["wilkinson1985b"]},
  "YEARS.stingy":   {model:true, why:"a convex rescue curve: only strong bonds pay (Carter & Wilkinson 2013); the groom compensation is ours", cite:["carter2013"]},
  "YEARS.sickly":   {model:true, why:"contagion through contacts (Stockmaier 2018, Ripperger 2020); the meal compensation is ours", cite:["stockmaier2018","ripperger2020"]},
  "YEARS.quiet":    {model:true, why:"small roosts warm quickly; values ours"},
  "YEARS.generous": {model:true, why:"a concave rescue curve: familiarity is enough (Carter & Wilkinson 2013); the meal compensation is ours", cite:["carter2013"]},
  "YEARS.restless": {model:true, why:"roost switching (Wilkinson 1985a); no stranger penalties in a colony where everyone moves; values ours", cite:["wilkinson1985a"]},
  "YEARS.crowded":  {model:true, why:"crowding raises sickness through the roost-size term; the attention compensation is ours"},
  "YEARS.lean":     {model:true, why:"thin herds, more bats per wound (Greenhall 1972 re-attacks); values ours", cite:["greenhall1972"]},
  "BAT.outpostDraw": {model:true, why:"P5 draft key, unused by the P5 engine (row 28)", cite:["wilkinson1985a"]},
  "BAT.newcomerNights":{model:true, why:"P5 draft key, unused by the P5 engine (row 29)", cite:["wilkinson1985b"]},
  "BAT.scoutMod":    {model:true, why:"foraging-area familiarity: the outpost sees the far herd first; value ours (row 30)", cite:["wilkinson1985a"]},
  "BAT.contactCallTrust":{model:true, why:"P5 draft key; the engine reads roosts.contactCallTrust (row 31)", cite:["carter2016","carter2012"]},
  /* rows 32-34 rescue */
  "BAT.rescueBase":  {model:true, why:"v2 calibration of the donation curve (row 33); the beg pool is present, fed, living roost-mates rolled in trust order (row 32), while roost-mates' own background rescues stay global so no partner dies to a lottery the player never touched (row 34)", cite:["carter2013","wilkinson1984"]},
  "BAT.rescueSlope": {model:true, why:"received grooming and sharing predict donation beyond kinship (row 33)", cite:["carter2013"]},
  "BAT.rescueCap":   {model:true, why:"no donor is a sure thing (row 33)", cite:["carter2013"]},
  "BAT.rescueBond":  {model:true, why:"being saved warms the bond (row 33, v2)", cite:["carter2013"]},
  /* row 35 stamina */
  "BAT.staminaPerNight":{model:true, why:"three dawn actions (v2, row 35)", cite:["mcnab1973"]},
  "BAT.staminaLowAt":{model:true, why:"hunger costs a dawn action (row 35)", cite:["mcnab1973"]},
  /* row 36 grooming */
  "BAT.groomQuick":  {model:true, why:"grooming exceeds hygienic need and tracks partnerships; values v2 (row 36)", cite:["wilkinson1986","carter2015"]},
  "BAT.groomLong":   {model:true, why:"as groomQuick (row 36)", cite:["wilkinson1986","carter2015"]},
  "BAT.dimReturns":  {model:true, why:"diminishing returns on warm bonds (row 36)"},
  "BAT.recipCap":    {model:true, why:"no groom-back is a sure thing (row 36)", cite:["carter2015"]},
  "BAT.groomBackHyg":{model:true, why:"a groom-back restores fur (row 36)", cite:["wilkinson1986"]},
  /* row 37 sharing */
  "BAT.shares":      {model:true, why:"regurgitated sharing with escalation from sips to full crops; blood and bond values v2, the hungry-bat points cut in P6a so that handing blood to everyone is not the score line (row 37)", cite:["wilkinson1984","carter2020"]},
  "BAT.shareLift":   {model:true, why:"a fed hungry bat gains half a night (row 37)"},
  "BAT.shareStamina":{model:true, why:"regurgitation is a dawn action like grooming (v2, row 37)"},
  "BAT.slider":      {model:true, why:"P26: the continuous give/groom bars. Every curve is solved at load from groomQuick, groomLong and shares, so the slider reproduces the quick groom, the long groom, the sip, the meal and the full crop exactly and only interpolates between them; the payoff saturates because a starving bat can only use so much blood. Opening positions and the 5% step are Bryson's, balanced in sim/batsim4.py (BATSIM_MODEL=slider, 20,000 seasons a policy)", cite:["wilkinson1984","wilkinson1986","carter2015"]},
  "BAT.partnerCap":  {model:true, why:"roost-mates hold two nights of blood (row 39)"},
  "BAT.partnerEnergy":{model:true, why:"roost-mates start with one to two nights of blood (v2, row 39)"},
  "BAT.strangerTrust":{model:true, why:"a newcomer arrives barely known; real bats test the waters with grooming before sharing (v2, row 39)", cite:["carter2020"]},
  "BAT.strangerEnergy":{model:true, why:"a newcomer arrives fed (v2, row 39)"},
  /* row 38 refusal, decay, hygiene, mites */
  "BAT.decay":       {model:true, why:"bonds fade without maintenance (v2, row 38)", cite:["wilkinson1984"]},
  "BAT.trustFloor":  {model:true, why:"a bond never quite reaches zero: a roost-mate you refused still knows your call (row 38)"},
  "BAT.refuseCost":  {model:true, why:"refusing a hungry roost-mate is remembered (v2, row 38)", cite:["wilkinson1984"]},
  "BAT.refuseOweCost":{model:true, why:"refusing the bat who saved you costs double (v2, row 38)", cite:["wilkinson1984"]},
  "BAT.hygieneStart":{model:true, why:"the season opens with fur that needs attention within a few nights (v2, row 38)"},
  "BAT.hygieneDecay":{model:true, why:"fur needs grooming; mite pressure direction (row 38)", cite:["lewis1995"]},
  "BAT.hygieneStormDecay":{model:true, why:"rain fouls fur faster (row 38)", cite:["lewis1995"]},
  "BAT.missHygiene": {model:true, why:"tumbled in the grass on a miss (row 38)"},
  "BAT.infestBelow": {model:true, why:"mites move into ungroomed fur (row 38)", cite:["lewis1995","wilkinson1986"]},
  "BAT.parasiteDrain":{model:true, why:"mites cost blood every night (row 38)", cite:["lewis1995"]},
  "BAT.cureAbove":   {model:true, why:"grooming clears mites (row 38)", cite:["wilkinson1986"]},
  /* row 39 partners, traits, events */
  "BAT.trustStart":  {model:true, why:"every roost-mate starts at an average bond of 0.5, so the Connector badge means keeping a full living roost as warm as you found it; v2's 0.35 seed made the badge unreachable in ten nights (batsim3, row 39)"},
  "BAT.trustClose":  {model:true, why:"two old friends at the start (v2, row 39)"},
  "BAT.trustOther":  {model:true, why:"everyone else barely knows you (v2, row 39)"},
  "BAT.strangerClaimP":{model:true, why:"a stranger claims an empty slot half the time after a grace night (v2, row 39)"},
  "BAT.eventP":      {model:true, why:"dawn event chance (v2, row 39)"},
  "BAT.eventSquabbleMult":{model:true, why:"a ruffled bat welcomes grooming (v2 event deck, row 39)"},
  "BAT.eventPupMult":{model:true, why:"a mother with a pup remembers help twice over (v2 event deck, row 39)"},
  "BAT.coldsnapLongCost":{model:true, why:"a tight huddle makes long grooming cheap (v2 event deck, row 39)"},
  /* row 40 desperation */
  "BAT.desperateAt": {model:true, why:"energy-budget rule: risk-prone under deficit, shown as framing only (row 40)", cite:["stephens1981"]},
  /* row 41 and section 5: points and badges */
  "BAT.pts.fedByFriend":{model:true, why:"points for a close friend feeding you on a hungry night: the payoff for depth rather than breadth (P10 lever 1)", cite:["carter2013"]},
  "BAT.pts.endBest": {model:true, why:"the season end names your single deepest bond, so two real friends score as more than a list of acquaintances (P10 lever 4); value tuned in sim/batsim4_2026-09-04_p10.txt", cite:["carter2013"]},
  "BAT.pts.endRecip":{model:true, why:"per partner who ever fed you: reciprocity is the thing that keeps a bat alive, and it is earned, not counted (P10 lever 4)", cite:["wilkinson1984","carter2013"]},
  "BAT.pts.farFed":  {model:true, why:"P12: a far-valley meal pays extra points: the reward for the long, riskier flight lands in the ledger, not the crop (blood caps at energyCap, so a fatter meal alone was worth little); tuned in sim/batsim4_2026-09-04_far.txt"},
  "BAT.pts.endBlood":{model:true, why:"blood left in the crop at the end is a real asset (a bat's reserve is hours of life, McNab 1973), so a surplus is never free to give away (P10 lever 2a)", cite:["mcnab1973"]},
  "BAT.pts":         {model:true, why:"outcome-based point economy (bible section 5); pts.unfed is the consolation on any unfed night ending with blood > 0; P6a: grooming pays 0 per action and endBond values each real bond as trust ^ the season's rescue exponent (row 41)"},
  "BAT.badges":      {model:true, why:"badge thresholds (bible section 5); the Connector at 2.5 over real bonds (trust >= 0.3) is about five warm partners, the survivors' p80 in batsim4 (P5)"},
  "RIVALS":          {model:true, why:"the rival cast: names and tells are fiction; classes map to BAT.displaceWin; a stranger's class stays hidden until you join or displace, mirroring how feeder displacements reveal rank, and no female roost rank exists so rank is feeder-scoped only (bible section 4, row 26)", cite:["wilkinson1985a","crisp2021"]} };
