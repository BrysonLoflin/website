/* bat-copy.js: EVERY line of text a player can read inside NIGHT FLIGHT, in Bryson's voice
   (rewritten 2026-09-03 from his samples: plain, friendly, says why, a little excited).

   HOW TO EDIT
   - Change any text between the quotes. Keep the {placeholders}: the game fills them in
     ({name}, {n}, {p} and so on; each key's comment says what they are). Keep the quotes and
     the comma at the end of the line. No em dashes.
   - Bold: <strong>...</strong>. Italics: <em>...</em>. Nothing else.
   - After editing: render the site (cd site && quarto render) or copy this file to
     site/_site/assets/js/. The readable sheet build_nightflight/COPY_SHEET.md is generated
     from this file by `node sim/copy-sheet.js` (run it after editing to keep the sheet current).
   - Keys the harness reads by name are marked "(test)"; renaming those breaks the tests.
   - Not in this file (edit there instead): the hero text and "How the odds work" in
     site/play-bat.qmd; cow names / cues / intel and rival names / tells in bat-data.js
     (COW_TABLE, RIVALS); roost names, descriptions and cues in bat-data.js (ROOST_TYPES);
     partner trait tags in bat-data.js (TRAITS). The sheet lists those too. */
const COPY = {

  /* ── Start of a run ── */
  startLog:      "Dusk. You're hanging in the hollow with {home} roost-mates. {others} other roosts across the valley hold {n} bats you barely know yet. Every bond starts small, and every one can grow.",   // {home} {others} {n}
  newSeasonHead: "A new season has begun.",   // (test) shown when an old save can't continue
  newSeasonText: "The game changed while you were away, so that old night can't continue. Tonight you start fresh with the new odds.",
  newSeasonBtn:  "Begin the first night →",

  /* ── Dusk: the weather headline and text (head = the big line, text = the sentence under it) ── */
  condStormHead: "The storms are here.",   // (test)
  condStormText: "The rains have arrived. Rain floods the pastures, the herds huddle up, and every bat's hunting gets harder. You get {stormTicks} dark hours tonight instead of {ticks}, and an unfed night costs {burnHard} blood.",   // {stormTicks} {ticks} {burnHard}
  condStormLast: "One more night. You can do this.",
  condStormMore: "The colony moves roosts when the storms end. Hold on.",
  condSquallHead:"A squall is blowing in.",
  condSquallText:"Rain is lashing the roost mouth. Hunting in this is miserable: every bat's odds are worse tonight, and an unfed night in the cold costs {burnHard} blood.",   // {burnHard}
  condRichHead:  "The herd moved into the near valley!",
  condRichText:  "A dark, kind night and the cattle are practically under the roost. Easy pickings for everyone tonight.",
  condBrightHead:"Bright moon tonight.",
  condBrightText:"Bright moon tonight, making everyone's odds worse. In the light, both your prey and your predators see you more easily.",
  condDimHead:   "A half-lit night.",
  condDimText:   "Moonlight comes and goes behind the clouds. Not perfect hunting light, but workable.",
  condDarkHead:  "No moon tonight.",
  condDarkText:  "No moon tonight! Hunting will be easier since the cows can't see you coming.",
  stormWarn:     "You can smell rain on the wind. The storms are two nights away. If you want friends who will feed you, build those bonds now.",
  damper:        "You fly careful tonight.",   // (test)
  damperNote:    "{n} unfed nights in a row. Your next bite gets {mod} to its fail chance, because two bad rolls shouldn't end a season.",   // {n} {mod}
  grief:         "The roost is quieter. <strong>{names}</strong> didn't wake at dusk. Starved, and nobody had enough to give.",   // {names}
  huntNight1Label:"Follow the colony out",
  huntNight1Sub: "the only way out tonight; stay close, you're still learning",
  huntRampSub:   "one to five animals, the usual odds",
  huntNearLabel: "Hunt the near paddock",
  huntNearSub:   "one to five animals, the usual odds",
  huntFarLabel:  "Push to the far valley",
  /* P29, Bryson's own wording: "Meals worth 1.3x, less bats, cows are 7% harder to bite, lose 50
     blood if you don't feed." The numbers stay filled from the data so the card cannot drift. */
  huntFarStats:  "Meals worth {farYield}x, less bats, cows are {farFail}% harder to bite, lose {burnHard} blood if you don't feed.",   // {farYield} {farFail} {burnHard}
  huntFarStatsScouted:"Meals worth {farYield}x, less bats, cows are {scoutPct}% harder to bite (you scouted them), lose {burnHard} blood if you don't feed.",   // {farYield} {scoutPct} {burnHard}
  huntNearStats: "1 to 5 animals · the usual odds",   // P28 phones
  huntStormStats:"1 to 3 animals · {ticks} dark hours",   // P28 phones; {ticks}
  huntFarSub:    "fat animals nobody bleeds (meals x{farYield}) and about {farFree}% fewer bats at the wounds. The catch: your bite is {farFail}% more likely to fail out there, and a hungry night costs {burnHard} blood for the long flight",   // {farFail} {burnHard}
  huntFarScouted:"{n} fat animals (meals x{farYield}), about {farFree}% fewer bats at the wounds. You watched this herd from the outpost, so a bite there is only {scoutPct}% more likely to fail than at home, not {farFail}%; a hungry night still costs {burnHard} blood for the flight",   // {n} {scoutPct} {farFail} {burnHard} ({scout} = the signed form, unused now)
  huntStormSub:  "one to three animals huddled in the rain, {ticks} dark hours",   // {ticks}
  huntRainSub:   "the far valley is no place to be in this rain",
  desperate:     "desperate hours",   // (test) the amber tag on risky options when your blood is low

  /* ── Dusk: the season block (first night only) ── */
  seasonHead:    "This season",
  seasonIntro:   "Four things vary from season to season. Each bar says how strong it is this time.",
  cueContagionHi:"A cough is going round: every bat you groom or feed could pass it to you, so touch fewer bats.",
  cueContagionMid:"A little sickness about: think twice before grooming a coughing bat.",
  cueContagionLo:"A healthy roost: groom and share freely, there is nothing to catch.",
  cueRescueConvex:"Blood is tight: when you run out, only close friends will feed you.",
  cueRescueMid:  "The closer the friend, the likelier she feeds you when you run out.",
  cueRescueConcave:"An open season: when you run out, even a half friend may feed you.",
  cueAttentionFew:"You can look after about {n} bonds; more than that and all of them fade faster.",   // {n}
  cueAttentionMid:"You can look after about {n} bonds at once before they all start to fade.",   // {n}
  cueAttentionMany:"A settled colony: about {n} bonds before any of them start to fade.",   // {n}
  cueSwitchHi:   "Bats keep changing roosts: a friend may not be where you left her.",
  cueSwitchMid:  "Bats mostly sleep where they always do, with the odd move.",
  cueSwitchLo:   "Bats are staying put: who you see tonight you will see tomorrow.",

  /* ── Dusk: choosing where to sleep ── */
  roostPickHead: "The night is over. Where do you sleep?",   // (test) the flight-home scene
  roostPickBtn:  "Sleep here →",   // (test)
  roostPickWait: "Pick a roost first, on the picture or the cards below",
  roostPickWaitShort: "Pick a roost first",   // P26: on a phone the cards are right under the button, so the long version is two wasted lines
  roostShortKnown: "{n} residents · {f} friends",   // the phone card's one stat line; {n} {f}
  roostShortNew: "not visited yet",   // the disabled button before a pick
  helpRoostHead: "Choosing where to sleep",   // the one-time explainer on the first night you get the choice
  helpRoostText: "Every night from now on you choose where to sleep. Only the bats hanging beside you can feed you if you run out of blood, so going home means your friends, and a new roost means strangers who might become friends, or might carry sickness or bite. Tap a roost on the picture to size it up, then sleep there.",
  sleepNight1:   "Tonight you sleep where you were born. From tomorrow night, the other roosts are yours to try.",   // (test)
  sleepIntro:    "Only the bats hanging beside you can feed you if you run empty. Go back to the friends you have, or gamble on a roost full of bats you don't know yet?",
  roostTapHint:  "Tap a roost on the picture, or a card below, to size it up.",
  stormDusk:     "The wind is wrong. Nobody moves roosts in a storm, so tonight everyone shelters where they are and you go home to the hollow.",   // (test)
  roostHome:     "home",   // (test) tag
  roostYou:      "you slept here last",   // (test) tag
  roostKnownSub: "{n} residents you have met",   // (test) {n}
  roostUnknown:  "unknown",   // (test) tag
  roostRumor:    "A familiar voice from {roost}: {name} sleeps there.",   // (test) {roost} {name}
  roostNoRumor:  "Nobody here can feed you yet: you do not know a single bat in this roost.",   // (test)
  roostFriends:  "your friends here: {names}",   // {names}
  roostSickHere: "you fell ill here",   // (test)
  roostHurtHere: "you were bitten here",   // (test)
  roostScouts:   "overlooks the far valley, so your bites there fail less often ({mod})",   // {mod}
  roostScoutsSoon:"overlooks the far valley, which opens on night {n}",   // (test) {n}

  /* ── The flight out ── */
  flightOutFar:  "You skip the near pastures and beat upwind toward the far valley, where the herds are fat and nobody has bothered them.",
  flightOutStorm:"You push out into the rain with the colony. Your wings are heavy before you've even cleared the roost.",
  flightOutNear: "You pour out of the roost with the colony and ride the dark toward the pastures. Somewhere below, a herd is sleeping.",
  skip:          "Skip →",

  /* ── The pasture ── */
  pastureLead:   "Pick a cow and try to feed!",   // P28: Bryson's line, and it replaces the counting prose below on every pasture
  pastureNear:   "{N} below you, spread along the fence line. Pick one and size it up.",   // {N} = "Three animals"
  pastureNearOne:"One animal below you, alone at the fence line. Size it up, or fly home.",
  pastureFar:    "{N} in the far valley. The big ones graze here, and so does every bat who knows about it.",   // (test) keep "in the far valley"
  pastureFarOne: "One animal in the far valley, and a long flight behind you.",
  pastureStorm:  "{N} huddled in the rain on the near paddock. Two dark hours tonight, not three.",
  pastureStormOne:"One animal standing in the rain on the near paddock. Two dark hours tonight, not three.",
  intelHead:     "Size up an animal",
  intelEmpty:    "Tap an animal to size it up.",
  intelMeal:     "meal +{yield}",   // (test) {yield}
  termSkill:     "your skill", termMoon:"{moon} moon", termSquall:"squall", termStorm:"storm", termRich:"easy night",
  termFar:       "far valley", termScout:"scouted", termCalf:"thin calf skin", termWound:"open wound", termDamper:"flying careful", termSick:"feverish",
  termHungry:    "hungry",   // (test) P10: an empty crop makes you a worse hunter
  occUnknown:    "another bat is already drinking here, and you don't know her.",   // (test)
  occKnown:      "a shape you know is already drinking here: {name}",   // {name}
  occStar:       "★ another bat is already feeding here, investigate?",   // P28: the small star on a picked animal that someone is already on
  occTag:        "· a bat is drinking",   // (test) the tag under an occupied animal on the stage
  occDeal:       "You get past her first, which costs the hour, and a shared wound never pays the fed-alone bonus.",   // (test)
  occLocked:     "this cow is done with you tonight",   // (test) keep "done with you"
  approach:      "Approach {name}",   // (test) keep "Approach the"; {name}
  approachDefault:"Approach",
  approachSub:   "one dark hour · one bite a night, no second try",
  approachNone:  "no dark hours left",
  flyHome:       "Fly home empty",
  flyHomeSub:    "an unfed night costs {burn} blood",   // (test) {burn}
  ticksTag:      "· {n} dark hours",   // P29: the hours as a tag on the round label, since the sentence went and P17 removed the HUD box; {n}
  ticksLeft:     "{n} dark hours left, and one bite in them",   // {n}
  tickExhausted: "The sky is greying at the edge. You're out of dark hours, so you turn for home with an empty stomach.",

  /* ── The encounter (another bat is at the wound) ── */
  encHeadMate:   "{name}.",   // (test) {name}
  encHeadMet:    "{name}, again.",   // (test) {name}
  encHeadStranger:"A stranger at the cow.",   // (test) keep "stranger"
  encAsk:        "How do you respond?",   // P29: the encounter's whole prose on a phone
  meetMate:      "Someone's already feeding. It's {name}, from your roost. How do you respond?",   // {name}
  meetRival:     "Someone's already feeding, and you don't know this bat: {tell}. How do you respond?",   // {tell}
  meetRivalMet:  "Someone's already feeding. You know this one. {name}: {tell}. How do you respond?",   // {name} {tell}
  /* P28 (Bryson: the encounter buttons "are way too large. they should be condensed and can fit as
     just that text with a small X% Success for each or Odds unknown"). The long sentences are kept
     below because the desktop still has room for them; the phone gets these. */
  verbOdds:      "{p}% success",   // P28; {p}
  verbOddsCost:  "{p}% success, costs bond",   // P28, the roost-mate case: pushing a friend off is not free; {p}
  joinLabel:     "Join", joinSub:"about {p}% chance {subj} lets you in", joinSubStranger:"a stranger almost never lets you in: about {p}%",   // {p} {subj}
  displaceLabel: "Push {obj} off", displaceSub:"about {p}% chance {subj} gives way", displaceSubUnknown:"odds unknown until you try", displaceSubMate:"about {p}% she gives way, and it costs your bond",   // (test) keep "costs" + "bond"; {obj}
  waitLabel:     "Wait", waitSub:"about {p}% {subj} leaves each hour; the wound runs slower after",   // {p} {subj}
  leaveLabel:    "Leave", leaveSub:"back to the herd; the hour is spent",
  leaveSubNoHours:"no dark hours left: home with an empty stomach",   // (test) keep "empty"
  encSkipHint:   "tap anywhere to skip the standoff",
  joinTolerated: "{Subj} shifts along the wound and lets you in. Shoulder to shoulder, you both feed.",   // (test) keep "shoulder to shoulder"
  rebuff:        "A rattling scream right in your ear. The wound is claimed, and this cow is done with all of you tonight.",   // (test) keep "rattling scream"
  displaceWin:   "{Subj} gives up the wound and lifts away. Nobody gets hurt. That's how dominance usually works!",
  displaceLose:  "{Subj} rears up, wings wide, and you're already airborne. No blood spilled, only yours to burn.",   // (test) keep "rears"
  waitSuccess:   "The drips slow and stop. {Subj} drops into the dark, full. Your turn!",
  waitStill:     "{Subj} is still there, still drinking. The wound runs on and your dark hours run out.",   // (test) keep "still there"
  leave:         "You lift off and circle back over the herd. The dark hours keep ticking.",   // (test) keep "circle back"
  rollLine:      "Roll {r} against {p}: {result}.",   // (test) {r} {p} {result}
  rollTolerated: "tolerated", rollRefused:"refused", rollYields:"{subj} gives way", rollHolds:"{subj} holds", rollLeaves:"{subj} leaves", rollStill:"still there",   // (test)
  riskRefused:   "refused", riskHolds:"she holds", riskStill:"still there",   // labels on the little risk bars

  /* ── The bite and the flight home ── */
  biteBright:    "Too bright. You wait for a cloud, then drop onto the cow's back and pick your spot.",
  biteDark:      "You settle onto its back. It sleeps on. You pick your spot and make the cut.",
  fed:           "You feed on the warm blood of the cow for twenty minutes. You fly home with a full belly.",   // the h3 above it already says Success!
  miss:          "The cow's tail catches you and the whole herd wakes. Nothing tonight. Time to head home on an empty stomach.",
  homeFed:       "You lift off heavy and slow, turn for home, and tuck into the dark of the roost among the warm bodies.",
  homeMiss:      "You shake the grass off and fly home empty, tucking into the dark of the roost among the warm bodies.",
  homeEarly:     "You turn for home early with an empty stomach and hang among the warm bodies while the dark runs on.",

  /* ── The night summary ── */
  /* P11: the night summary shows the h3 plus the chips below (chip*), so the long sentences in
     this group are no longer printed on the scene. They are kept because they carry the wording
     the chips were cut from: edit a chip to change what a player reads. COPY.fed and COPY.miss
     are still live (the bite scene, and the bite-roll chip's hover). */
  nightFedHead:  "Success!",   // (test) the h3 on a fed night
  biteRollLine:  "Bite roll {r} against a {p} fail chance: {result}.",   // (test) keep "Bite roll"; {r} {p} {result}
  rollFed:       "fed", rollWoke:"the cow woke",
  fedGave:       "{cow} gave you <strong>+{meal} 🩸</strong>",   // {cow} {meal}
  fedWaited:     " (a waited wound runs slower)",   // (test) keep "waited wound"
  cofedMate:     "shoulder to shoulder with {name}, from your roost",   // (test) {name}
  cofedRival:    "shoulder to shoulder with {name}, a stranger who let you in",   // {name}
  primeSoloNote: ", and feeding alone on a prime cow pays <strong>+{pts}</strong> on top",   // {pts}
  night1Fed:     " (Adult bats strike out on about {p} of nights. Young bats like you miss far more often, so tonight the luck held!)",   // {p}
  learnNote:     " <em>The cuts come easier now. You're getting good at this!</em>",
  starvingOne:   "<strong>{name} is starving</strong>: a bat with no blood left won't see a second dawn unless someone feeds her.",   // {name}
  starvingMany:  "<strong>{n} roost-mates are starving</strong>: a bat with no blood left won't see a second dawn unless someone feeds her.",   // {n}
  begCount:      "<strong>{n} roost-mate{s} came home empty</strong>. Back at the roost, you could share.",   // {n} {s}
  allFed:        "Everyone else fed too, so nobody is begging tonight.",
  missHead:      "The cow woke up.",   // (test) h3 on a missed bite
  missStorm:     "A miserable, rain-blind hunt, and a cow that wouldn't settle.",
  missBright:    "Too much light. The cow saw you drop and was on its feet before you landed.",
  night1Miss:    " (Adults strike out on about {p} of nights. Young bats like you miss far more often, so don't take it personally.)",   // {p}
  emptyHead:     "Home on an empty stomach.",   // (test) h3 on an unfed night with no bite
  leftEarly:     "You turned for home before the dark ran out. The herd keeps grazing without you.",
  allLocked:     "Every wound you tried was claimed, and the herd is done with you tonight.",
  unfedNight:    "No blood tonight. An unfed night costs {burn} blood.",   // (test) keep "costs {burn} blood"
  unfedFar:      "No blood tonight, and the far valley is a long, cold commute: {burn} blood.",   // (test) keep "long, cold commute"
  consolation:   "You made it home. +{pts}.",   // {pts}
  reserveLine:   " Blood left: <strong>{n} night{s}</strong> of it. You can't share blood tonight, but you can still groom.",   // {n} {s}
  hungerWarn:    " <strong>One more unfed night and you'll be begging for your life.</strong>",
  mitesCost:     " The <strong>mites</strong> cost you an extra -{drain} 🩸 tonight.",   // {drain}
  mitesIn:       " Nobody has groomed you in too long: <strong>bat mites have moved in</strong>. They'll drain -{drain} 🩸 every night until a roost-mate grooms them off you.",   // {drain}
  nextDawn:      "Fly home at dawn →",

  /* ── No blood left: saved, or not ── */
  rescueHead:    "Saved!",   // (test) keep "Saved"
  rescueOdds:    "Given your bonds, the chance that a roost-mate who fed tonight would save you was <strong>{p}</strong>, and {name} came through.",   // {p} {name}
  /* P29 the beg, played out one bat at a time (Bryson asked for anticipation). */
  begWaitHead:   "You have no blood left. You beg.",
  begWaitNone:   "Nobody here is close enough to ask.",
  begAsking:     "{name}?",   // {name}
  begRefused:    "{name} turns away.",   // {name}
  begYes:        "{name} comes.",   // {name}
  begAllRefused: "Nobody comes.",
  rescueStory:   "You beg from the bats hanging beside you, and <strong>{name}</strong> brings up part of tonight's meal for you. You owe her.",   // {name}
  realLife:      "In real life",
  rescueReal:    "Rescue isn't charity. Bats with stronger giving and grooming histories have more donors when their luck fails. Your investment just paid out.",
  deathHead:     "No one came.",   // (test) keep "No one came"
  deathOdds:     "Given your bonds, the chance that a roost-mate who fed tonight would save you was <strong>{p}</strong>. No one did.",   // {p}
  deathTried:    "{names} tried.",   // {names}
  deathNoOne:    "No one who fed tonight was close enough to try.",   // (test)
  starveLine:    "You beg from every bat hanging beside you. {tried} You close your eyes, and you don't wake up.",   // {tried}
  deathReal:     "Starvation is the vampire bat's constant threat, and weak social bonds are the risk factor. Bats that invest in partners survive their unlucky streaks. Loners often don't.",
  continueBtn:   "Continue →",

  /* ── Dawn events ── */
  squabble:      "{a} and {b} wake up tangled and hissing, something about last night's wound.",   // {a} {b}
  squabbleNote:  "Their bond just took a hit, and both are ruffled and lonely. Grooming either of them this dawn builds {pct}% extra bond.",   // {pct}
  pup:           "{name}'s pup is hanging beneath her, all ears. Everything you give her tonight counts double.",   // {name}
  pupNote:       "Grooming or blood, it all counts x{mult} toward your bond with her.",   // {mult}
  coldsnap:      "Frost on the grass at dawn. The huddle tightens.",
  coldsnapNote:  "Bodies pressed together make long grooming easy. It costs only {cost} stamina this dawn.",   // {cost}
  strangerClaim: "A new bat is hanging at the roost edge where {old} used to sleep. {name}, the others call her.",   // {old} {name}
  strangerNote:  "New bonds start small. Real bats test the waters with grooming before they ever share blood.",

  /* ── Dawn: the roost ── */
  dawnHead:      "Dawn. Who do you look after?",
  dawnAt:        "You hang at {roost}.",   // (test) keep "You hang at"; {roost}
  dawnNew:       "Your first dawn here. The residents give you room, not warmth: strangers get groomed back half as often, and nobody here feeds a beggar they barely know.",   // (test) keep "Your first dawn here"
  dawnCues:      "You notice: {cues}.",   // {cues}
  dawnAway:      "Away tonight: {names}. {isare} sleeping at another roost, so {they} cannot feed you if you run out.",   // (test) {names} {isare} {they}
  dawnVisitors:  "Visiting tonight: {names}.",   // (test) {names}
  dawnNeeds:     "Who needs you",
  /* P28 (Bryson: the dawn paragraph "is way too long. there should just be a small stat that lists
     any friends you have in the colony, and that paragraph and the one saying you have x stamina
     should be taken away"). Phones get this line instead of both paragraphs. */
  dawnFriends:   "Friends: {names}",   // {names}
  dawnFriendsMore:"{names} and {n} more",   // {names} {n}
  dawnFriendsNone:"No friends yet. Groom someone.",
  dawnStamina:   "You have <strong>{n}% of your stamina</strong> before you sleep{weak}.",   // P26 reads as a percentage now, because the bars spend it that way; {n} {weak}
  dawnWeak:      " ({why} left you weak)",   // {why} e.g. "hunger and fever"
  dawnGroomShare:" Groom, or share blood, carefully.",
  dawnNoShare:   " Groom to build bonds. No sharing, you didn't feed.",
  mitesWarn:     "<strong>🕷 Mites!</strong> Get a roost-mate to groom you to clear them.",
  furWarn:       "Your fur needs grooming (fur {hyg}). Mite risk is climbing.",   // {hyg}
  warnStarving:  "<strong>{names} {isare} starving.</strong> A starving bat that nobody feeds dies at dusk.",   // {names} {isare}
  warnYouCould:  " You fed tonight. You could be the one who saves her.",
  warnOthersMight:" You have no blood to give, but her other friends might.",
  warnRefuse:    "{n} begging bat{s} will remember being refused (bond -{cost}{owe}).",   // {n} {s} {cost} {owe}
  warnRefuseShort:"{n} begging bat{s} will remember this (bond -{cost}).",   // P28 phones: the long one wrapped and clipped; {n} {s} {cost}
  warnOwe:       ", -{cost} for a bat who once saved you",   // {cost}
  sickDawn:      "You wake up feverish. Something in this roost has you. For {n} dawns you groom less and get groomed less.",   // (test) keep "feverish"; {n}
  sickStill:     "Still feverish: {n} more dawn{s} of it.",   // {n} {s}
  sickOver:      "The fever breaks. You wake up clear.",
  hurtDawn:      "A scarred bat drives you off the warm cluster in the dark. You bleed, and you remember: {blood} blood, and {n} dawns of a stiff wing.",   // (test) keep "drives you off"; {blood} {n}
  hurtStill:     "The wound aches: {n} more dawn{s} of a stiff wing.",   // {n} {s}
  hurtOver:      "The wound has closed.",
  caughtFrom:    "You caught it from {name}: for {n} dawns you groom less and get groomed less.",   // (test) keep "caught it from"; {name} {n}
  hudSick:       "Sick", hudHurt:"Wounded",   // (test) HUD chips

  /* ── Dawn: the partner panel ── */
  panelPickHead: "Pick a roost-mate",
  panelPickText: "Tap a bat. Green lines are <strong>your</strong> bonds, the bats most likely to feed you when a night goes wrong. Faint lines are their bonds with each other. Every bond fades -{decay} a night if you leave it alone, grooming builds it back up, and a bat you groom often grooms you back.",   // {decay}
  panelWarmFast: " The bats here take to you quickly.",
  panelWarmSlow: " The bats here are slow to take to you.",
  panelStarvWarn:" <strong class=\"wyd-warnink\">A starving bat dies at dusk unless somebody, maybe you, feeds her.</strong>",
  panelSpread:   "Spread thin: you are looking after {n} bonds and you can manage about {free}. Every one of them is fading {extra} faster.",   // (test) keep "Spread thin: you are looking after {n} bonds" + "manage about {free}"
  panelRescue:   "if you run out of blood tonight, she feeds you about {p}% of the time",   // (test) keep "about {p}%"; {p}
  panelRescueUnfed:"if you run out of blood tonight she has nothing to give you: she went hungry too",
  bondLabel:     "Bond {trust}",   // {trust}
  chipStarving:  "☠ starving: dies at dusk unless fed",
  chipBegging:   "she came home empty",
  chipFedWhy:    "She fed tonight, so she is one of the bats who can feed you if you run out.",   // (test)
  chipBeggingWhy:"She came home empty, so she has nothing to give you tonight, and she needs blood herself.",
  chipFed:       "she fed tonight",   // (test) her status, with the consequence on hover (the P24 pattern)
  /* P29 (Bryson: a chip that gets cut off on a phone should open a popup instead). Each chip that
     carries an explanation gets a title for the popup and, where the chip text alone is not an
     explanation, the sentence to show. */
  popClose:      "Close",   // P29: the X on a popup
  chipTapHead:   "What this means",
  chipCoughWhy:  "She has a cough. Grooming or feeding a coughing bat is how you catch it, and being ill costs you stamina, makes your bite worse and stops you sharing blood for a couple of dawns.",
  chipCatchWhy:  "This is your chance of catching her cough if you touch her tonight. It goes up the sicker the season is and the closer you get.",
  chipCough:     "coughing",   // (test)
  chipCatch:     "{p}% to catch her cough",   // (test) a chip in her row, beside the other things she carries; {p}
  chipCoughCatch:"coughing, {p}% to catch it",   // P26: was two chips side by side, "coughing" and "{p}% to catch her cough"; {p}
  chipCoughCatchShort:"coughing {p}%",   // P26 phones; {p}
  chipCatchShort:"{p}% cough",   // P26: the same chip on a phone, where the long one was cut off mid-word; {p}
  chipStarvingShort:"☠ starving", chipBeggingShort:"came home empty", chipFedShort:"she fed",   // P26 phones, same reason
  actCatch:      " · {p}% to catch her cough",   // (test) appended to every action's cost line; {p}
  chipSavedYou:  "♥ has fed you when you needed it",
  chipSavedYouShort:"♥ has fed you",   // P27 phones: the long one was cut off mid-word in the chip row
  chipYouSaved:  "✚ you saved her life",
  chipVisiting:  "visiting from {roost}",   // (test) keep "visiting from"; {roost}
  chipBitYou:    "bit you · n{n}",   // (test) {n}
  chipGroomed:   "groomed tonight",
  chipShared:    "shared with tonight",
  chipDisplacedYou:"displaced you · n{n}",   // (test) {n}
  chipToleratedYou:"tolerated you",   // (test)
  chipYouDisplaced:"you displaced {obj} · n{n}",   // (test) {obj} {n}
  chipYielded:   "yielded to you",   // (test)
  chipRebuffed:  "rebuffed you · n{n}",   // {n}
  /* P21 phones (Bryson: the buttons and the web have to share one screen): the same five actions in
     a two-column grid, so each one is a short name over a cost line. Same numbers, fewer words. */
  actShortGroomQ:"Quick groom", actShortGroomL:"Long groom",
  actShortSip:   "Sip", actShortMeal:"Meal", actShortGen:"Full crop",
  actShortGroomCost:"{cost} ⚡ · bond +{gain}",   // {cost} {gain}
  actShortShareCost:"{stamina} ⚡ -{blood} 🩸 · +{gain}",   // {stamina} {blood} {gain}
  actShortSave:  "Save her",
  groomQuick:    "Quick groom · {cost} ⚡", groomQuickSub:"bond +{gain} · she may groom you back",   // {cost} {gain}
  groomLong:     "Long groom · {cost} ⚡", groomLongSub:"bond +{gain} · she'll likely groom you back",   // {cost} {gain}
  shareLabel:    "Bring up {label}", shareSave:"Save her: bring up {label}", shareCost:"· {stamina} ⚡ -{blood} 🩸, leaves you {left}", shareSub:"bond +{gain}",   // {label} {stamina} {blood} {left} {gain}
  /* P24 (Bryson, from player feedback: "unclear wording, like what it means for a bat to be
     tight-furred"). The tags in bat-data TRAITS always had a plain-language hint beside them; it
     was only ever shown as a one-off sentence the night you worked the bat out, and never for a
     far-ranger or a thin bat. Now the chip carries it on hover and the panel says it in words
     every time you look at her. {tag} {hint} */
  traitHint:     "{tag}: {hint}.",
  panelOneShare: "You can bring up one meal a dawn. Who gets it? ({n} left tonight, or a second one if you are still nearly full of blood.)",   // (test) P10 lever 3; {n}
  shareWhyOne:   "you have already given a meal this dawn",   // (test) P10 lever 3
  shareWhyNotFed:"you didn't feed tonight", shareWhyNotHungry:"not hungry", shareWhyNoStamina:"no stamina left", shareWhyLow:"your own blood is too low",
  shareWhyFever: "feverish: you can't bring food back up",   // (test) keep "feverish"
  sleepBtn:      "Sleep until dusk →",
  /* P26 the two dawn bars. Both read as a percentage of what tonight left you, both stop every 5%,
     and neither will go past what you are actually holding. */
  slGroomLab:    "Groom her",
  slGiveLab:     "Bring up blood",
  slGiveLabSave: "Save her life",
  slPct:         "{pct}",   // P27: the bars read as a number out of 100, not a per cent
  slGroomSub:    "Bond +{gain}, and she grooms you back about {p}% of the time.",   // P27: the bar beside it already says how much; {gain} {p}
  slGiveSub:     "{blood} \ud83e\ude78 of your crop, which leaves you {left} of {cap} and costs the same {pct} of tonight's stamina.",   // {blood} {left} {cap} {pct}
  /* P26 phones. The bar's own percentage sits right beside these lines, so repeating it there is
     wasted space; what is left is only what the bar cannot show you. */
  slGroomSubShort:"bond +{gain} · groom-back {p}%",   // P27 phones, as short as it can be and still say both; {gain} {p}
  slGiveSubShort:"leaves you {left} 🩸",   // P27 phones: the bar already says what you are giving; {left}
  slGivePts:     " Worth about {n} points.",   // {n}
  slGivePtsShort:" · {n} points",   // P26/P27 phones, joined into the same dot-separated strip; {n}
  slGiveSpill:   " She can only hold so much, so some of this would be wasted.",
  slGroomGo:     "Groom her",
  slGiveGo:      "Give blood",
  slGiveGoSave:  "Save her",
  slGroomCap:    "You have {have} of tonight's stamina, so the bar stops at {pct}.",   // P27: the bar only stops on 5s, so what you hold and where it stops are not always the same number; {have} {pct}
  slGiveCap:     "You are holding {blood} \ud83e\ude78, so the bar stops at {pct}.",   // {blood} {pct}
  slNone:        "nothing left to spend tonight",
  slGroomShort:  "Groom", slGiveShort:"Give",
  actQuick:      "You work through {name}'s fur.",   // {name}
  actLong:       "A long, thorough grooming session with {name}.",   // {name}
  groomBack:     " <strong>{name} grooms you back.</strong>",   // {name}
  mitesGone:     " The mites are gone!",
  actSave:       "{name} feeds desperately from your mouth: {label}, -{blood} 🩸. <strong>You just saved a life.</strong> Bats remember that above everything else.",   // {name} {label} {blood}
  actShare:      "{name} feeds from your mouth: {label}, -{blood} 🩸. Bats remember generosity in proportion.",   // {name} {label} {blood}
  slAmount:      "{pct} of a crop",   // P26/P27: what the tier labels used to say, now the bar's own reading; {pct}
  slGroomActShort:"You work through {name}'s fur.",   // P29 phones: the bar said how much, so this is only what happened; {name}
  slGroomAct:    "You spend {pct} of the night on {name}'s fur.",   // P26; {pct} {name}
  dawnFriendFed: "On the way in, <strong>{name}</strong> brought up part of her own meal for you. That is what a close friend is for.",   // (test) P10 lever 1; {name}

  /* ── End of the season ── */
  seasonEnd:     "Ten nights. The storms pass. Count who's still hanging beside you.",
  endSurvived:   "You survived all {nights} nights! As the rains set in, you move roosts with the colony.",   // {nights}
  endBitSaved:   "you pulled {names} back from the edge of starvation",   // {names}
  endBitSaviors: "{names} once kept you alive",   // {names}
  endBitRank:    "you took {n} wound{s} by rank",   // {n} {s}
  endBitRoosts:  "you slept in {n} of the colony's {total} roosts",   // {n} {total}
  fullRoostLine: "every bat you started the season with is still hanging beside you",   // (test)
  endLostLine:   "the roost lost {names} along the way",   // {names}
  endAlong:      "Along the way {bits}.",   // {bits}
  endAvg:        "Final average bond {avg}.",   // {avg}
  endReal:       "Real vampire bats survive the same way: not by luck, but by the bonds they build.",
  deathVerdict:  "You starved on night {night}{storm}, at {roost}.{tried}",   // (test) keep "You starved on night"; {night} {storm} {roost} {tried}
  deathStorm:    ", with the storms overhead",   // (test) keep "storms overhead"
  deathSaved:    " You saved {names} before the end, and the ledger keeps what you gave.",   // {names}
  deathAdvice:   " Real bats die exactly this way, usually the ones without strong giving and grooming histories. Next run, invest earlier: bonds are the only insurance a vampire bat gets, and the storms always come.",
  badgesLine:    " Badges: {list}.",   // (test) keep "Badges: "; {list}
  badges:{ survivor:"Survivor", bonded:"Bonded", connector:"The Connector", fullRoost:"Full Roost", rank:"Made of Rank" },   // (test)
  badgeRankLine: "You ate well. Count who groomed you at dawn.",

  /* ── Season events (two per game, shown top right of the status bar from night 1; {night} = the night it lands, {n} = the drawn amount) ── */
  evHeader:      "Night {night}",   // (test) the little header over each event badge; {night}
  evNow:         "Tonight!",   // (test) replaces the header on the night it lands
  evLeft:        "{n} night{s} left",   // {n} {s} while an effect is still running
  evDone:        "over",
  evHudTip:      "The year and its events. The first two icons are this year's two permanent changes, and the ? icons are surprises that land on nights you won't see coming. Hover an icon to read it, tap it to read it in full.",
  evPopKicker:   "Night {night} · something happened",   // (test) the popup header when a surprise lands; {night}
  evPopIcons:    "Its icon stays in the top right. Hover it to see how long it runs.",
  evHiddenHead:  "Surprise",   // (test) header on a hidden event before it lands
  evHiddenTitle: "Unknown event",
  evHiddenSub:   "lands on a night you won't see coming",
  evHuntersTitle:"Hunters came!",
  evHuntersHud:  "{pct}% of the bats",   // {pct}
  evHuntersText: "Many local people dislike bats because they can spread rabies. In anger, they killed {pct}% of the colony at random. <strong>{names}</strong> {isare} gone.",   // {pct} {names} {isare}
  evHuntersNone: "Many local people dislike bats because they can spread rabies. In anger, they came for the colony, but everyone you know got away.",
  evBigstormTitle:"Big storm!",
  evBigstormHud: "one roost falls",
  evBigstormText:"A huge storm tore through the valley and wiped out {roost}. Every bat that slept there is gone.",   // {roost}
  evBigstormYou: "A huge storm tore through the valley and wiped out {roost}, your own roost! You escaped in the nick of time. Everyone who stayed is gone, and you'll sleep at {newRoost} from now on.",   // {roost} {newRoost}
  evCattleTitle: "Cattle disease!",
  evCattleHud:   "meals x{mult} for {n} nights",   // {mult} {n}
  evCattleText:  "All the cattle are sick. Their blood is only worth <strong>{mult}</strong> as much as before, for the next {n} nights.",   // {mult} {n}
  evPlagueTitle: "Plague!",
  evPlagueHud:   "everyone sick for {n} nights",   // {n}
  evPlagueText:  "A sickness sweeps the colony. Every bat is coughing, you included, for {n} dawns: fewer actions, fewer groom-backs, and nobody can share.",   // {n}
  evDominantTitle:"Dominant bats move in!",
  evDominantHud: "angry bats everywhere, {n} nights",   // {n}
  evDominantText:"A dominant group has infiltrated the colony. Every roost now has at least one angry bat who will probably hurt you, for {n} nights, unless a bat you trust hangs beside you.",   // {n}
  evDeafTitle:   "Injured ears!",
  evDeafHud:     "half your calls miss, {n} nights",   // {n}
  evDeafText:    "A loud noise has left you half deaf for the next {n} nights. Bats find each other by their calls, so half the time the bat you reach for at dawn turns out to be somebody else.",   // {n}
  evDeafMiss:    " You reached for {want}, but in the dark it was {got}.",   // {want} {got}
  evDriveTitle:  "Cattle drive!",
  evDriveHud:    "+{n} animals, {nights} nights",   // {n} {nights}
  evDriveText:   "A rancher moved a new herd into the valley. For {nights} nights there are {n} more animals within reach, and the big ones are twice as common.",   // {n} {nights}
  evDroughtTitle:"Drought!",
  evDroughtHud:  "thin herds, {n} nights",   // {n}
  evDroughtText: "A dry spell. The far valley is empty and the herds nearby are thin: no more than {max} animals within reach for {n} nights. Expect company at every wound.",   // {max} {n}
  evNewcomersTitle:"Newcomers!",
  evNewcomersHud:"+{n} strangers per roost",   // {n}
  evNewcomersText:"A wave of strangers has joined the colony: {n} new bats in every roost. They don't know you yet, but every one of them could become a friend.",   // {n}
  evMitesTitle:  "Mite bloom!",
  evMitesHud:    "fur fouls x{mult}, {n} nights",   // {mult} {n}
  evMitesText:   "The wet weather brought a bloom of mites. For {n} nights your fur fouls twice as fast, so getting groomed back matters more than ever.",   // {n}
  evMoonTitle:   "Bright nights!",
  evMoonHud:     "full moon for {n} nights",   // {n}
  evMoonText:    "Clear skies and a full moon for {n} nights running. The cattle can see you coming, and so can everything that eats bats.",   // {n}
  evColdsnapTitle:"Cold snap!",
  evColdsnapHud: "long grooms cost {cost}, {n} nights",   // {cost} {n}
  evColdsnapText:"A cold front settles in for {n} nights. Everyone huddles tight, which makes long grooming easy: it costs only {cost} stamina.",   // {cost} {n}

  /* ── The year (P9, 2026-09-03 evening): two permanent changes drawn at the start, read once in the
        first-dusk popup, then icons top right of the status bar for the whole season ── */
  yrKicker:      "Night 1 · the season ahead",   // (test) the popup header at the first dusk
  yrHead:        "Welcome to bat world!",   // (test) Bryson's words, 2026-09-04
  yrLead:        "Before you get started, there are always two special qualities for your season. Let's see what you got:",   // (test)
  yrIntro:       "They hold for all ten nights. Their icons stay in the top right of the status bar, next to the four bars that describe this season. <strong>Tap either icon whenever you want to read it again.</strong>",
  yrAgain:       "This one holds all season. Tap its icon in the status bar to read it again.",   // (test) the note under a year popup
  yrHudHead:     "This year",   // (test) the header in a year icon's hover text
  yrCuesHead:    "This season",   // the cues subhead inside the same popup
  yrRoughTitle:  "A rough year", yrRoughHud:"angry bats in every roost; animals x{occ} as likely to be taken",
  yrRoughText:   "Angry bats in every roost bite anyone without a trusted friend beside them, but the cattle are less crowded: any animal is x{occ} as likely to have a bat on it.",   // {occ}
  yrStingyTitle: "A stingy year", yrStingyHud:"only close friends feed you when you run out; grooming builds bonds {groom} times faster",
  yrStingyText:  "Only close friends will feed you when you run out, but every grooming builds a bond {groom} times faster.",   // {groom}
  yrSicklyTitle: "A sickly year", yrSicklyHud:"a cough that never leaves ({cough} times as many coughing bats); meals x{mult}",
  yrSicklyText:  "A cough that never leaves, with {cough} times as many bats coughing, so every bat you touch is a risk. The herds are fat to make up for it: every meal is worth x{mult}.",   // {cough} {mult}
  yrQuietTitle:  "A quiet year", yrQuietHud:"small roosts; the bats there take to you quickly",
  yrQuietText:   "Roosts are {size} the usual size: fewer bats to know or to feed you, but every bond builds quickly.",   // {size}
  yrGenerousTitle:"A generous year", yrGenerousHud:"any bat who knows you may feed you; meals x{mult}",
  yrGenerousText:"Even a half friend will feed you when you run out, but the cattle are thin: every meal is worth x{mult}.",   // {mult}
  yrRestlessTitle:"A restless year", yrRestlessHud:"{switch}% of bats change roost each night; nobody minds a stranger",
  yrRestlessText:"Friends won't stay where you left them, about {switch}% of the colony moves each night, but a new roost costs you nothing on your first night.",   // {switch}
  yrCrowdedTitle:"A crowded year", yrCrowdedHud:"roosts {size} the usual size; {free} more bonds you can look after",
  yrCrowdedText: "Roosts are {size} the usual size: more bats to know and {free} more bonds you can look after, but sickness spreads faster.",   // {size} {free}
  yrLeanTitle:   "A lean year", yrLeanHud:"never more than {max} animals, x{occ} as likely to be taken; meals x{mult}",
  yrLeanText:    "Never more than {max} animals in reach and each one x{occ} as likely to be taken already, but the ones left are fat: meals x{mult}.",   // {max} {occ} {mult}

  /* ── Popups (P9): the OK button, the dawn hazard popup, the dawn-event popup, the help popups ── */
  popOk:         "OK →",   // (test) every popup's button
  hzKicker:      "Dawn · a hard night",   // (test) the header of the hazard popup
  hzHeadSick:    "You wake up feverish.",
  hzHeadHurt:    "You wake up bleeding.",
  hzHeadBoth:    "You wake up feverish and bleeding.",
  hzIcons:       "The Sick and Wounded chips in the status bar count the dawns left. Hover one to check.",
  deKicker:      "Dawn · at the roost",   // (test) the header of a dawn-event popup (squabble, pup, newcomer)
  helpKicker:    "How it works",   // (test)
  helpDawnHead:  "The roost at dawn",
  skillKicker:   "Your hunting",   // (test) the Skill popup header
  skillTitle:    "On {who}, about {p} bites in a hundred land tonight",   // (test) {p} {who}
  skillIntro:    "This is the bite in front of you, not a skill you keep. Every bat gets better with practice, and the night, the animal and the bat already at the wound all help or hurt. Here is what this one adds up to. A plus makes the bite likelier to fail, a minus makes it likelier to land.",
  skillFail:     "So about {p}% of your bites go wrong tonight and wake the animal.",   // {p}
  skillOwn:      "your skill {p}%",   // {p} the first item in the hover strip
  helpNightHead: "The night",
  helpNightText: "Your progress saves at the start of every night, and the Log button in the status bar shows what has happened so far. At dusk you choose where to hunt. At the pasture you size up an animal, bite, and either eat or fly home hungry. On the way home you choose which roost to sleep in, and only the bats hanging there can help you: a close friend may bring up part of her meal if you came home hungry, and if your blood runs out entirely you have to beg. Two hungry nights in a row and begging is all you have left, so groom and feed your friends before you need them.",
  panelPickShort:"Tap a bat to groom her, or to share blood if you fed tonight.",   // (test) the short line in the empty partner panel

  /* ── P11 (Bryson): the night summary is the outcome word plus a row of change chips.
     Every number the old prose carried is one chip; nothing else is on the screen. ── */
  chipMeal:      "+{meal} 🩸 from {cow}",   // (test) {cow} {meal}
  chipPts:       "+{pts} points: you fed tonight",   // {pts}
  chipPrimeSolo: "+{pts} points: prime cow, fed alone",   // {pts}
  chipFarFed:    "+{pts} points: far valley meal",   // {pts}
  chipWaited:    "a waited wound runs slower",   // (test) keep "waited wound"
  chipCofedMate: "shoulder to shoulder with {name}",   // (test) keep "shoulder to shoulder"; {name}
  chipCofedRival:"shoulder to shoulder with {name}, a stranger",   // {name}
  chipDisplaced: "you pushed {name} off the wound",   // {name}
  chipWaitFree:  "the wound came free",
  chipLearned:   "the cuts come easier now",
  chipStarvOne:  "{name} is starving",   // {name}
  chipStarvMany: "{n} roost-mates are starving",   // {n}
  chipBegs:      "{n} roost-mate{s} came home empty",   // {n} {s}
  chipNoBegs:    "nobody is begging tonight",
  chipUnfed:     "unfed night costs {burn} blood",   // (test) keep "costs {burn} blood"; {burn}
  chipUnfedFar:  "a long, cold commute costs {burn} blood",   // (test) keep "long, cold commute"; {burn}
  chipConsolation:"+{pts} points: you made it home",   // {pts}
  chipNight:     "+{pts} points: another night survived",   // {pts}
  chipReserve:   "blood {n} of {cap} 🩸",   // (test) {n} {cap}
  chipHungry:    "one more unfed night and you beg for your life",
  chipMitesIn:   "🕷 mites moved in, -{drain} 🩸 a night",   // {drain}
  chipMitesCost: "🕷 mites took another -{drain} 🩸",   // {drain}
  chipDamper:    "you fly careful tonight",
  chipRescueOdds:"a roost-mate who fed had a {p} chance of saving you",   // {p}
  chipSavedBy:   "{name} came through",   // {name}
  chipNoOne:     "no one came",
  roundNoBlood:  "no meal, no blood left",   // P26: was a hard-coded "no meal, reserve empty" in bat-game.js, and "reserve" is a name for blood that P25 retired
  chipRollTip:   "The story behind the roll",   // hover label on the bite-roll chip

  /* ── P11: the dawn network legend (one line under the web) ── */
  netLegend:     "Green ring: a friend, thicker means closer · red: hungry · pulsing red: starving · amber: coughing · dashed: visiting from another roost · grey: a bat you barely know (in a crowded roost, tap her for her name) · faint lines: their own bonds",

  /* ── P11: the log and exit buttons folded into the status bar ── */
  hudLogExit:    "Log · exit",
  hudTipPrompt:  "Tap any bar to see what it means.",   // (test) P28: one line on a phone, where the old wording ran to three
  flightLegend:  "Red chevrons are the colony flying out with you, red dots the cattle below, and the teal shape is you.",   // (test) the legend under the flight picture
  hudControls:   "Log · sound · help · exit",
  tipMenu:       "Log, sound, help, exit",   // the phone's one menu button
  menuKicker:    "Menu",
  menuLogShow:   "Show the night log", menuLogHide:"Hide the night log",
  menuSoundOn:   "Turn sound on", menuSoundOff:"Turn sound off",
  menuHelp:      "How it works",
  menuExit:      "Exit to the start (progress is saved)",
  tipLog:        "Show or hide the running log of what happened tonight.",
  tipExit:       "Leave the game. Your progress saved at the start of this night.",

  /* ── HUD: labels and the hover explanations ── */
  /* P26: on a phone the night cell is about 95px wide and "Night (icon) . full moon" does not fit;
     the short form drops the word, the count below it still reads as the night, and the tip says so. */
  hudNightShort:"{cond}",   // {cond}
  hudNight:"Night {cond}", hudBlood:"Blood 🩸 {n}", hudTicks:"Dark hours", hudStamina:"Stamina ⚡ {n}", hudGroomed:"Groomed", hudMiteRisk:"Mite risk {n}%", hudMites:"🕷 Mites!", hudRoost:"Roost", hudHere:" here", hudScore:"Score", hudEvents:"Year · events", hudSound:"Sound · help", hudSkill:"Hunting skill {p}%", hudSeason:"Season",   // {n} {p}
  tipNight:      "Which night of the season this is, and what the night is like. A fat herd adds +{rich} 🩸 to every meal; moonlight and rain make your bite likelier to fail. The last two nights are storms.",   // {rich}
  condTagStorm:  "· storm", condTagSquall:"· rain", condTagRich:"· fat herd",
  condTagBright: "· full moon", condTagDim:"· half moon", condTagDark:"· no moon",   // (test) the word beside the night's icon
  tipBlood:      "The blood you are carrying, out of {cap}. An unfed night costs you {burn} of it, and at zero you have to beg. A meal never takes you past {cap}, so anything above the end of the bar is spilled.",   // {cap} {burn}
  tipTicks:      "Dark hours left tonight. Approaching an animal costs one, waiting costs one. At zero you fly home.",
  tipStamina:    "Dawn actions. Grooming costs one or two, sharing blood costs one. Hunger, fever and wounds take some away.",
  tipGroomed:    "Mite risk climbs the longer nobody grooms you. Past {thr}%, mites can move in and drain {drain} 🩸 every night. Being groomed BACK is the lever: groom a bat and she may return it, which brings your risk down.",   // {thr} {drain}
  hudMiteSub:    "mites at {thr}%, then -{drain} 🩸 a night",   // (test) the line under the mite bar; {thr} {drain}
  hudMitesSub:   "-{drain} 🩸 a night until a roost-mate grooms you",   // {drain}
  tipMites:      "Mites are draining half a blood every night. Get a roost-mate to groom you to clear them.",
  tipRoost:      "How many bats are hanging with you tonight, and where. Only bats present can feed you or be fed.",
  tipScore:      "Your score: nights survived, meals, shared wounds, lives saved, the blood you still carry and the bonds you hold at the end.",
  tipState:      "Sick: two dawns of fewer actions, fewer groom-backs, no sharing, and a worse bite. Wounded: two dawns of one less action.",
  tipSick:       "Feverish: {n} more dawn{s} of fewer actions, fewer groom-backs, no sharing, and a worse bite.",   // {n} {s}
  tipHurt:       "Wounded: {n} more dawn{s} of one less action.",   // {n} {s}
  tipSeason:     "What this season is like. Tap to read it in full.",
  tipSkill:      "How often your bite lands tonight, on {who}. Every animal is different, so this number moves when you pick another one. Tap for the full breakdown.",   // (test) {who}
  skillWho:      "this {tier}",   // {tier} the picked animal's kind, e.g. "this prime cow"
  skillNoPick:   "a steer",   // nothing picked yet, so the number is against a plain steer
  hudSkillNone:  "Hunting skill {p}%",   // (test) P28: one label whether or not an animal is picked; the per-animal reading is in the popup and on the animal's own bar; {p}
  skillNoPickTip:"You have not picked an animal, so this is a plain steer.",
  meterSick:     "Sickness", meterTight:"Tight blood", meterAttention:"Attention", meterSwitch:"Roost shuffling",   // the four season bars
  tipMeterSick:  "How easily sickness spreads this season. The fuller the bar, the riskier every bat you groom or feed.",
  tipMeterTight: "How tight bats are with their blood. A full bar means only your closest friends will feed you when you run out; an empty one means almost any bat who knows you might.",
  tipMeterAttention:"How many bonds you can look after at once: about {n} this season. Take on more and all of them fade faster.",   // {n}
  tipMeterSwitch:"How much the colony moves between roosts. A full bar means your friends often sleep somewhere else.",
  tipHelp:       "How the game works, again.",
  tipSound:      "Sound effects on or off. Remembered on this device.",
  youBlood:"blood", youTicks:"dark hours", youStamina:"stamina",   // the small bars in the stage corner
  meterMeal:"meal {n} 🩸", meterBite:"bite lands {p}%",   // (test) P21 Bryson: the bars above a picked animal say what they are; {n} {cap} {p}
  mealSpill:     "you can only hold {cap}, so {spill} 🩸 of this one spills",   // (test) {cap} {spill}
  endLedgerHead: "Where the score came from",   // (test)
  endLedgerTotal:"Total",
  endLineNights: "Nights, meals and everything you did along the way",
  endLineSurvive:"You lived through the whole season",
  endLineBonds:  "{n} real bond{s}, counted the way this season counts them",   // {n} {s}
  endLineBest:   "Your closest friend, {name} (bond {trust})",   // {name} {trust}
  endLineNoBest: "No close friend to speak of",
  endLineRecip:  "{n} friend{s} who fed you when you needed it ({names})",   // {n} {s} {names}
  endLineNoRecip:"Nobody ever fed you",
  endLineBlood:  "Blood you still carry ({n} of {cap})",   // {n} {cap}   P27: both now read out of 100
  endLineRoost:  "Every bat from your home roost is still alive",
  endLineNoRoost:"Your home roost lost bats this season",

  /* ── Stage captions (the small amber line on the picture) ── */
  capLeaving:"dusk · leaving the roost", capPasture:"the pasture", capChoosing:"the pasture", capApproach:"the approach", capStandoff:"the standoff",
  capChased:"chased off", capShuffle:"shoulder to shoulder", capWoundFree:"the wound comes free", capYields:"the resident gives way",
  capFeeding:"feeding", capKicked:"kicked off", capHome:"home", capColony:"dusk · the colony",
};

/* ── Achievements: label + description; secret ones stay hidden until earned ── */
const ACHIEVEMENTS = [
  {key:"firstNight", label:"First light",          desc:"Survive your first night."},
  {key:"night5",     label:"Halfway there",        desc:"Reach night 5 alive."},
  {key:"survivor",   label:"Wet season",           desc:"Survive all ten nights!"},
  {key:"far",        label:"The far valley",       desc:"Feed in the far valley."},
  {key:"primeSolo",  label:"The best blood",       desc:"Feed alone on a prime cow."},
  {key:"cofeed",     label:"Shoulder to shoulder", desc:"Get let in at another bat's wound."},
  {key:"rank",       label:"By rank",              desc:"Push another bat off a wound."},
  {key:"stormFed",   label:"Rain hunter",          desc:"Feed on both storm nights."},
  {key:"firstShare", label:"A sip for a friend",   desc:"Share blood for the first time."},
  {key:"lifesaver",  label:"Lifesaver",            desc:"Feed a starving bat back from the edge."},
  {key:"saved",      label:"Owed a life",          desc:"Beg with no blood left, and get fed."},
  {key:"bonded",     label:"Bonded",               desc:"Take a bond to 0.8 or higher."},
  {key:"connector",  label:"The connector",        desc:"End a season with the Connector badge."},
  {key:"fullRoost",  label:"Full roost",           desc:"End the season with every hollow resident alive."},
  {key:"explorer",   label:"Three roofs",          desc:"Sleep in three different roosts in one season."},
  {key:"homebody",   label:"Born here",            desc:"Survive the season without ever leaving the hollow."},
  {key:"fever",      label:"Through the fever",    desc:"Fall sick and still survive the season."},
  {key:"scarred",    label:"Scarred",              desc:"Get bitten at a roost and still survive the season."},
  {key:"forgiveness",label:"Forgiveness",          desc:"Share blood with the bat who bit you.", secret:true},
  {key:"patience",   label:"Patience",             desc:"Wait twice at one wound and still feed there.", secret:true},
  {key:"ghost",      label:"The ghost",            desc:"Survive the season without grooming anyone.", secret:true} ];
