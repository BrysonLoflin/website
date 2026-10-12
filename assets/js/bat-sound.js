/* bat-sound.js: the sound of NIGHT FLIGHT. Everything is synthesised with the Web Audio API (no
   files, nothing fetched). Off switch in the HUD (🔊 / 🔇), remembered per browser in localStorage
   wyd-sound. Never throws: the game plays on without audio.

   P36 (2026-10-10, Bryson picked look A, "Paper Moon"): every cue redone as one family, a felt
   piano with paper and wood around it, and two quiet beds under the cues:
     the night ambience: crickets and a slow wind; distant cattle while you hunt; rain on storm
       and squall nights; birds at dawn
     the music: a slow felt-piano line over a soft pad, sparse on calm nights, tighter and lower
       when you are hungry, in a standoff or out in a storm, resolving to a major chord at dawn.
   The game names the scene (WydSound.scene); the beds fade between moods, stop when the run
   stops, pause with the tab, and follow the same on / off switch as the cues.
   API: play(kind, arg), isOn(), toggle(), warm(), scene(id, {stormy, hungry}), stopBed(),
        renderBed(seconds, id, opts) (tests: schedules a stretch of the bed on an offline context),
        get(part), set(part, bool), anyOn() (P37 sound settings, below).

   P37 (D3, Bryson approved): three switches, each remembered on the device. "fx" is the cues and
   keeps the old key wyd-sound (so an old on / off setting carries over), "music" the felt-piano bed
   (key wyd-sound-music, OFF for a new visitor, Bryson's default), "amb" the night ambience (key
   wyd-sound-amb, ON, except for a player who had muted everything before P37: they stay silent).
   The beds run while music or ambience is on; each bus fades to its level or to nothing. */
var WydSound = (function(){
  var LS = "wyd-sound", LS_MUS = "wyd-sound-music", LS_AMB = "wyd-sound-amb";
  var ctx = null, on = true, musOn = false, ambOn = true, master = null, ambBus = null, musBus = null, verb = null, NOISE = null;
  try{ on = localStorage.getItem(LS) !== "off"; }catch(e){}
  try{ var m0 = localStorage.getItem(LS_MUS); musOn = m0 === "on"; }catch(e){}
  try{ var a0 = localStorage.getItem(LS_AMB); ambOn = a0 == null ? on : a0 !== "off"; }catch(e){}
  var bedOn = function(){ return musOn || ambOn; };
  /* P21 chain, unchanged: notes -> master -> compressor -> makeup -> limiter -> out. The two beds
     and the reverb return feed the master too, so the compressor sits the beds under the cues. */
  var MASTER = 1.6, MAKEUP = 3.5;
  var BED_AMB = 0.34, BED_MUS = 0.3;    // the beds' default levels (gentle, under the cues)
  /* P21: iOS "playback" audio session, so the ring / silent switch does not mute the game */
  function audioSession(){
    try{ var s = navigator.audioSession; if(s && s.type !== "playback") s.type = "playback"; }catch(e){}
  }
  function impulse(c, sec, decay){
    var n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for(var ch = 0; ch < 2; ch++){ var d = b.getChannelData(ch); for(var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  function ac(){
    try{
      if(!ctx){
        var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
        audioSession();
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = MASTER;
        var comp = ctx.createDynamicsCompressor();
        try{
          comp.threshold.setValueAtTime(-18, ctx.currentTime); comp.knee.setValueAtTime(18, ctx.currentTime);
          comp.ratio.setValueAtTime(6, ctx.currentTime); comp.attack.setValueAtTime(0.003, ctx.currentTime);
          comp.release.setValueAtTime(0.22, ctx.currentTime);
        }catch(e){}
        var makeup = ctx.createGain(); makeup.gain.value = MAKEUP;
        var lim = ctx.createDynamicsCompressor();
        try{
          lim.threshold.setValueAtTime(-2, ctx.currentTime); lim.knee.setValueAtTime(0, ctx.currentTime);
          lim.ratio.setValueAtTime(20, ctx.currentTime); lim.attack.setValueAtTime(0.001, ctx.currentTime);
          lim.release.setValueAtTime(0.1, ctx.currentTime);
        }catch(e){}
        master.connect(comp); comp.connect(makeup); makeup.connect(lim); lim.connect(ctx.destination);
        ambBus = ctx.createGain(); ambBus.gain.value = 0; ambBus.connect(master);
        musBus = ctx.createGain(); musBus.gain.value = 0; musBus.connect(master);
        /* a small room: a generated impulse (no file), so the felt piano has air around it */
        try{ verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.6, 2.4);
          var vr = ctx.createGain(); vr.gain.value = 0.5; verb.connect(vr); vr.connect(master); }catch(e){ verb = null; }
      }
      audioSession();
      if(ctx.state === "suspended" && !document.hidden) ctx.resume();
      return ctx;
    }catch(e){ return null; }
  }
  function noiseBuf(c){
    if(NOISE) return NOISE;
    var b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for(var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    NOISE = b; return NOISE;
  }
  function send(g, amt){ if(verb && amt){ var s = ctx.createGain(); s.gain.value = amt; g.connect(s); s.connect(verb); } }
  /* one voice. o: f, T (absolute start) or at (offset), dur, type, g (peak), a (attack), to (glide
     target), lp / lpTo (lowpass and where it closes to), hp, q, hold, det, verb, dest */
  function tone(o){
    var c = ac(); if(!c) return;
    var t0 = o.T != null ? o.T : c.currentTime + (o.at || 0), dur = o.dur || 0.2;
    var os = c.createOscillator(), g = c.createGain(), node = os;
    os.type = o.type || "sine"; os.frequency.setValueAtTime(o.f, t0);
    if(o.to) os.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || dur));
    if(o.det) os.detune.setValueAtTime(o.det, t0);
    if(o.lp){ var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = o.q || 0.7; lp.frequency.setValueAtTime(o.lp, t0);
      if(o.lpTo) lp.frequency.exponentialRampToValueAtTime(o.lpTo, t0 + dur); node.connect(lp); node = lp; }
    if(o.hp){ var hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.setValueAtTime(o.hp, t0); node.connect(hp); node = hp; }
    var a = o.a || 0.006, pk = o.g || 0.1;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + a);
    if(o.hold) g.gain.setValueAtTime(pk, t0 + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g); g.connect(o.dest || master); send(g, o.verb);
    if(o.vib){ var l = c.createOscillator(), la = c.createGain(); l.frequency.value = o.vib; la.gain.value = o.vibD || 4; l.connect(la); la.connect(os.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
    os.start(t0); os.stop(t0 + dur + 0.05);
  }
  /* a burst of filtered noise: paper, breath, rain, suction */
  function nz(o){
    var c = ac(); if(!c) return;
    var t0 = o.T != null ? o.T : c.currentTime + (o.at || 0), dur = o.dur || 0.1;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf(c); s.loop = true;
    f.type = o.type || "bandpass"; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f || 1200, t0);
    if(o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    var pk = o.g || 0.05; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + (o.a || 0.004));
    if(o.hold) g.gain.setValueAtTime(pk, t0 + (o.a || 0.004) + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(o.dest || master); send(g, o.verb);
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  var midi = function(m){ return 440 * Math.pow(2, (m - 69) / 12); };
  /* the felt piano: a soft triangle through a closing lowpass, a quiet octave, a slow beating twin */
  var FELT = 0.55;   // the felt voice rings and stacks (three partials + room), so it sits lower than a blip
  function felt(m, T, g, dur, dest, verbAmt){
    var f = midi(m); dur = dur || 1.6; g = g * FELT;
    tone({T:T, f:f, dur:dur, type:"triangle", g:g, a:0.012, lp:1500, lpTo:480, dest:dest, verb:verbAmt == null ? 0.3 : verbAmt});
    tone({T:T, f:f * 2, dur:dur * 0.5, type:"sine", g:g * 0.32, a:0.01, dest:dest, verb:0.25});
    tone({T:T, f:f * 1.003, dur:dur, type:"sine", g:g * 0.5, a:0.02, dest:dest});
  }
  /* the cow, kept from P26 (a closed "mmm" opening into "ooo"), softened and given the room */
  function moo(o){
    o = o || {}; var c = ac(); if(!c) return;
    var f0 = (o.f || 138) + Math.random() * 24, d = 1.05 + Math.random() * 0.25, T = o.T != null ? o.T : c.currentTime, k = o.g || 1;
    var v = function(pts, at, dur, type, gain, open, close, q, vib){
      var t0 = T + at, os = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      os.type = type; os.frequency.setValueAtTime(pts[0][1], t0);
      for(var i = 1; i < pts.length; i++) os.frequency.exponentialRampToValueAtTime(pts[i][1], t0 + dur * pts[i][0]);
      f.type = "lowpass"; f.Q.value = q; f.frequency.setValueAtTime(close, t0);
      f.frequency.linearRampToValueAtTime(open, t0 + dur * 0.32); f.frequency.linearRampToValueAtTime(close * 0.8, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.16);
      g.gain.setValueAtTime(gain, t0 + dur * 0.62); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      var l = c.createOscillator(), la = c.createGain(); l.frequency.value = vib; la.gain.value = 4; l.connect(la); la.connect(os.frequency);
      os.connect(f); f.connect(g); g.connect(o.dest || master); send(g, o.verb || 0.18);
      os.start(t0); l.start(t0); os.stop(t0 + dur + 0.05); l.stop(t0 + dur + 0.05);
    };
    v([[0, f0 * 0.86], [0.18, f0 * 1.28], [0.55, f0 * 1.18], [1, f0 * 0.72]], 0, d, "sawtooth", 0.055 * k, 1150, 320, 3, 5.5);
    v([[0, f0 * 0.9], [0.2, f0 * 1.3], [1, f0 * 0.76]], 0.06, d * 0.86, "triangle", 0.05 * k, 760, 260, 2, 4);
    tone({T:T + 0.02, f:f0 * 0.5, dur:d * 0.7, g:0.07 * k, to:f0 * 0.42, dest:o.dest});
    nz({T:T, f:700, to:260, q:0.9, dur:0.09, g:0.025 * k, dest:o.dest});
  }
  var pick = function(a){ return a[Math.floor(Math.random() * a.length)]; };
  var now = function(){ var c = ac(); return c ? c.currentTime : 0; };

  /* ── the cues: same kinds and arg meanings as before (ms = the animation the sound lasts) ── */
  var FX = {
    /* a paper tap with a high felt note under it */
    click: function(){ nz({f:3200, q:1.5, dur:0.03, g:0.1}); felt(84, now(), 0.06, 0.25, null, 0.1); },
    /* picking an animal, a roost or a bat: a paper lift and a rising note */
    pick:  function(){ nz({f:2400, q:2, dur:0.04, g:0.07}); felt(79, now(), 0.08, 0.45, null, 0.15); },
    good:  function(){ var t = now(); felt(74, t, 0.12, 1.6); felt(81, t + 0.12, 0.12, 2); },
    great: function(){ var t = now(); [74, 78, 81, 86].forEach(function(m, i){ felt(m, t + i * 0.1, 0.095, 2.2); }); },
    /* a low half-step down, the felt note that does not resolve */
    bad:   function(){ var t = now(); felt(57, t, 0.14, 1.8); felt(56, t + 0.16, 0.12, 2); },
    /* a wound: paper tearing over a thump */
    hurt:  function(){ nz({type:"highpass", f:900, to:4000, dur:0.22, g:0.09}); tone({f:110, to:52, dur:0.3, g:0.25}); },
    /* kicked off the cow: a scuffle, the thud into the grass, a second smaller bump */
    kick:  function(){ nz({type:"highpass", f:1200, to:5000, dur:0.18, g:0.08}); tone({f:95, to:45, dur:0.25, g:0.26}); tone({at:0.2, f:70, to:40, dur:0.22, g:0.16}); },
    sleep: function(){ var t = now(); felt(67, t, 0.1, 2.4); felt(62, t + 0.2, 0.09, 2.6); },
    /* groom(ms): soft brushing for as long as the stream runs, a little felt sparkle every third stroke */
    groom: function(ms){
      var t = now(), d = Math.max(0.6, Math.min(5, (ms || 1400) / 1000)), n = Math.round(d / 0.14);
      for(var i = 0; i < n; i++){
        var g = 0.05 * (i < n - 3 ? 1 : (n - i) / 3);
        nz({T:t + i * 0.14, f:2800 + (i % 3) * 600, q:2.2, dur:0.09, g:g});
        if(i % 3 === 0) felt(pick([79, 81, 83, 86]), t + i * 0.14, 0.035, 0.7, null, 0.2);
      }
    },
    /* share(ms): a warm low felt chord that pulses like a heartbeat for the length of the stream */
    share: function(ms){
      var t = now(), n = Math.max(2, Math.round(Math.min(5, (ms || 1600) / 1000) / 0.7));
      for(var i = 0; i < n; i++){
        var T = t + i * 0.7, g = 0.11 * (i < n - 1 ? 1 : 0.6);
        felt(50, T, g, 1.4); felt(57, T + 0.04, g * 0.7, 1.3); felt(62 + (i % 2) * 4, T + 0.3, g * 0.5, 1.2);
      }
    },
    moo:   function(){ moo({}); },
    /* drink(ms): Bryson (2026-10-11): "inspired by the Minecraft water bottle sipping sound". A quick
       run of short, wet gulps, about five a second for as long as the bite animation lasts (ms). Each
       gulp is a little bubble that drops in pitch (the "glug"), a puff of filtered noise (the wet
       edge) and a soft low knock under it, every one a touch different in pitch and level so it
       never sounds like a loop. The last few gulps thin out, the way you finish a drink. */
    drink: function(ms){
      var t = now(), d = Math.max(0.7, Math.min(6, (ms || 2000) / 1000)), T = t + 0.04, i = 0;
      var n = Math.max(3, Math.floor((d - 0.1) / 0.205));
      while(i < n){
        var left = n - i, k = (left <= 3 ? 0.45 + 0.18 * left : 1) * (i === 0 ? 0.35 : i === 1 ? 0.7 : 1);   // ease in (the chain's compressor needs a moment), the last three soften
        var p = 1 + (Math.random() - 0.5) * 0.24, g = (0.062 + Math.random() * 0.01) * k;   // gulps come faster than the compressor releases, so each one stays under its threshold
        tone({T:T, f:560 * p, to:250 * p, glide:0.06, dur:0.085, g:g, a:0.009});
        tone({T:T + 0.012, f:880 * p, to:420 * p, glide:0.04, dur:0.055, type:"triangle", g:g * 0.25, a:0.01});
        nz({T:T, f:1300 * p, to:520, q:2.2, dur:0.06, g:g * 0.45, a:0.012});
        tone({T:T, f:150 * p, to:95, dur:0.09, g:g * 0.6, a:0.01});
        T += 0.19 + Math.random() * 0.04; i++;
      }
    },
    /* something happened: a low felt chord and two high notes */
    event: function(){ var t = now(); felt(45, t, 0.13, 2.4); felt(52, t + 0.02, 0.1, 2.4); felt(76, t + 0.25, 0.07, 2); felt(83, t + 0.4, 0.06, 2); },
    /* P29 slider ticks: one per 5-point stop, climbing with the value; the give bar lower and warmer */
    tickGroom: function(v){ felt(72 + Math.round(Math.max(0, Math.min(1, v || 0)) * 12), now(), 0.08, 0.3, null, 0.05); },
    tickGive:  function(v){ felt(60 + Math.round(Math.max(0, Math.min(1, v || 0)) * 8), now(), 0.1, 0.4, null, 0.05); },
  };

  /* ── the beds ──
     A generative scheduler: every 100 ms it books the next ~0.35 s of events at audio-clock times
     (so a slow frame never makes it stumble). Continuous layers (wind, rain) are looping noise
     whose levels glide between moods. Moods: calm (dusk, the flight home, the summary), hunt (out
     on the pasture), tense (a standoff, the beg, or any hunt on an empty crop), storm, dawn. */
  var CHORDS = {
    calm:  [[50,57,62,66,69],[47,54,59,62,66],[43,50,55,59,62],[45,52,57,61,64]],
    hunt:  [[50,57,62,65,69],[46,53,58,62,65],[43,50,55,58,62],[45,52,57,61,64]],
    tense: [[50,57,62,65,69],[51,58,62,65,70],[46,53,58,62,65],[45,52,57,61,64]],
    storm: [[38,45,50,53],[34,41,46,50],[36,43,48,51],[33,40,45,49]],
    dawn:  [[50,57,62,66,69,74],[55,62,67,71,74],[52,59,64,67,71],[57,64,69,73,76]],
  };
  var BPM = {calm:62, hunt:66, tense:76, storm:58, dawn:64};
  var NOTE_P = {calm:0.3, hunt:0.38, tense:0.5, storm:0.16, dawn:0.55};
  var BED = {want:false, mood:"calm", scene:"", timer:null, next:0, step:0, bar:0, cr:[0, 0], loops:null, ending:false};
  function startLoops(c, T){
    var mk = function(){ var s = c.createBufferSource(); s.buffer = noiseBuf(c); s.loop = true; return s; };
    var w = mk(); w.playbackRate.value = 0.5;
    var wf = c.createBiquadFilter(); wf.type = "lowpass"; wf.frequency.value = 420; wf.Q.value = 0.5;
    var wg = c.createGain(); wg.gain.value = 0.0001; w.connect(wf); wf.connect(wg); wg.connect(ambBus);
    var r = mk(), rh = c.createBiquadFilter(), rl = c.createBiquadFilter(), rg = c.createGain();
    rh.type = "highpass"; rh.frequency.value = 900; rl.type = "lowpass"; rl.frequency.value = 6500; rg.gain.value = 0.0001;
    r.connect(rh); rh.connect(rl); rl.connect(rg); rg.connect(ambBus);
    /* the wind swells and settles on its own (a slow LFO on the filter) */
    var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 140; lfo.connect(lg); lg.connect(wf.frequency);
    w.start(T); r.start(T); lfo.start(T);
    BED.loops = {src:[w, r, lfo], wind:wg, windF:wf, rain:rg};
  }
  function stopLoops(at){
    var L = BED.loops; BED.loops = null; if(!L) return;
    L.src.forEach(function(s){ try{ s.stop(at); }catch(e){} });
  }
  function applyMood(T, quick){
    var L = BED.loops; if(!L) return;
    var m = BED.mood, k = quick ? 0.05 : 1.4;
    L.wind.gain.cancelScheduledValues(T); L.wind.gain.setTargetAtTime({calm:0.05, hunt:0.06, tense:0.07, storm:0.075, dawn:0.03}[m], T, k);
    L.windF.frequency.setTargetAtTime(m === "storm" ? 700 : 420, T, k);
    L.rain.gain.cancelScheduledValues(T); L.rain.gain.setTargetAtTime(BED.rain ? 0.022 : 0.0001, T, k);
  }
  /* book every bed event in [from, to) on the audio clock */
  function schedule(from, to){
    var m = BED.mood, i, A = BED.render || ambOn, M = BED.render || musOn;
    /* crickets: two, three-pulse chirps on their own periods; none in a storm, few at dawn */
    if(A && m !== "storm" && !BED.rain){
      [[4600, 0.82, 0.02], [5000, 1.07, 0.014]].forEach(function(cr, k){
        if(m === "dawn" && k === 1) return;
        if(BED.cr[k] < from) BED.cr[k] = from + Math.random() * cr[1];
        while(BED.cr[k] < to){ for(i = 0; i < 3; i++) tone({T:BED.cr[k] + i * 0.035, f:cr[0], dur:0.022, g:cr[2] * (m === "dawn" ? 0.5 : 1), a:0.002, dest:ambBus}); BED.cr[k] += cr[1] * (0.9 + Math.random() * 0.2); }
      });
    }
    var span = to - from;
    /* distant cattle while you are out on the pasture */
    if(A && (m === "hunt" || m === "tense") && Math.random() < span * 0.07) moo({T:from + Math.random() * span, g:0.32, dest:ambBus, verb:0.55});
    /* rain: single drops on leaves over the hiss */
    if(A && BED.rain) for(i = 0; i < Math.round(span * 14); i++) nz({T:from + Math.random() * span, f:2500 + Math.random() * 3000, q:4, dur:0.02, g:0.012 + Math.random() * 0.01, dest:ambBus});
    /* far thunder in a storm */
    if(A && m === "storm" && Math.random() < span * 0.05) nz({T:from + Math.random() * span, type:"lowpass", f:220, to:60, dur:3.2, g:0.07, a:0.4, dest:ambBus});
    /* dawn birds: short rising phrases */
    if(A && m === "dawn" && Math.random() < span * 1.1){ var tb = from + Math.random() * span, fb = 2400 + Math.random() * 1800, nb = 2 + Math.floor(Math.random() * 4);
      for(i = 0; i < nb; i++) tone({T:tb + i * 0.11, f:fb * (1 + (i % 2) * 0.18), to:fb * 1.3, dur:0.07, g:0.016, dest:ambBus, verb:0.3}); }
    /* the music: eighth-note steps; the pad changes each bar, the felt line is sparse and random */
    var stepLen = 60 / BPM[m] / 2;
    if(BED.next < from) BED.next = from;
    while(BED.next < to){
      if(!M){ BED.next += stepLen; BED.step++; if(BED.step % 8 === 0) BED.bar++; continue; }   // P37: music off keeps the clock, books no notes
      var s = BED.step % 8, T = BED.next, ch = CHORDS[m][BED.bar % 4];
      if(s === 0){
        ch.slice(0, 2).forEach(function(n){ tone({T:T, f:midi(n), dur:60 / BPM[m] * 4.4, type:"sine", g:m === "storm" ? 0.05 : 0.034, a:1.2, dest:musBus, verb:0.5}); });
        if(m === "tense") tone({T:T, f:midi(ch[0] - 12), dur:60 / BPM[m] * 4.2, type:"triangle", g:0.03, a:0.8, lp:300, dest:musBus});
      }
      /* the heartbeat under a standoff or an empty crop */
      if(m === "tense" && (s === 0 || s === 4)){ tone({T:T, f:55, dur:0.22, g:0.07, dest:musBus}); tone({T:T + 0.2, f:52, dur:0.18, g:0.05, dest:musBus}); }
      if(s % 2 === 0 && Math.random() < NOTE_P[m]) felt(pick(ch.slice(2)) + 12, T + (Math.random() < 0.3 ? stepLen : 0), m === "dawn" ? 0.065 : 0.05, 2.2, musBus, 0.4);
      BED.next += stepLen; BED.step++; if(BED.step % 8 === 0) BED.bar++;
    }
  }
  function tick(){
    if(!ctx || !BED.loops) return;
    var t = ctx.currentTime; schedule(Math.max(t, BED.sched || t), t + 0.35); BED.sched = t + 0.35;
  }
  function bedRunning(){ return !!BED.loops; }
  /* P37: each bus fades to its level when its switch is on, to nothing when it is off */
  function busLevels(T, k){
    if(!ambBus || !musBus) return;
    ambBus.gain.cancelScheduledValues(T); musBus.gain.cancelScheduledValues(T);
    ambBus.gain.setTargetAtTime(ambOn ? BED_AMB : 0, T, k); musBus.gain.setTargetAtTime(musOn ? BED_MUS : 0, T, k);
  }
  function startBed(){
    var c = ac(); if(!c || BED.loops || !bedOn() || document.hidden) return;
    var T = c.currentTime;
    BED.step = 0; BED.bar = 0; BED.next = T + 0.1; BED.sched = T; BED.cr = [0, 0];
    startLoops(c, T); applyMood(T, true);
    busLevels(T, 0.8);
    if(!BED.timer) BED.timer = setInterval(tick, 100);
  }
  function stopBed(slow){
    if(BED.timer){ clearInterval(BED.timer); BED.timer = null; }
    if(!ctx || !BED.loops) return;
    var T = ctx.currentTime, k = slow ? 1.6 : 0.25;
    ambBus.gain.cancelScheduledValues(T); musBus.gain.cancelScheduledValues(T);
    ambBus.gain.setTargetAtTime(0, T, k); musBus.gain.setTargetAtTime(0, T, k);
    stopLoops(T + k * 6);
  }
  /* the scene -> mood map (the game calls scene() from renderScene; reading only) */
  var HUNT = {flightOut:1, pasture:1, bite:1};
  function moodFor(id, o){
    o = o || {};
    if(id === "dawn" || id === "rescue" || id === "end") return "dawn";
    if(o.stormy && (HUNT[id] || id === "encounter" || id === "dusk" || id === "flightHome")) return "storm";
    if(id === "encounter" || id === "begWait") return "tense";
    if(HUNT[id]) return o.hungry ? "tense" : "hunt";
    return "calm";
  }
  /* pause with the tab: the context suspends, the scheduler stops, both resume on return */
  document.addEventListener("visibilitychange", function(){
    try{
      if(document.hidden){ if(BED.timer){ clearInterval(BED.timer); BED.timer = null; } if(ctx && ctx.state === "running") ctx.suspend(); }
      else { if(ctx){ audioSession(); ctx.resume(); } if(BED.loops && !BED.timer){ BED.sched = ctx.currentTime; BED.next = ctx.currentTime + 0.1; BED.timer = setInterval(tick, 100); } }
    }catch(e){}
  });
  /* the run stopped (exit, the end card, a new page state): the beds go quiet. wyd-core marks a
     live run with .wyd-playing on .gpage. */
  try{
    var gp = document.querySelector(".gpage");
    if(gp && window.MutationObserver) new MutationObserver(function(){ if(!gp.classList.contains("wyd-playing")) stopBed(true); }).observe(gp, {attributes:true, attributeFilter:["class"]});
  }catch(e){}

  return {
    play: function(kind, arg){ try{ if(!on || !FX[kind]) return false; FX[kind](arg); return true; }catch(e){ return false; } },
    isOn: function(){ return on; },
    /* the effects switch (the pre-P37 toggle; the beds now have their own switches) */
    toggle: function(){ return this.set("fx", !on); },
    /* P37 sound settings: part = "fx" | "music" | "amb" */
    get: function(part){ return part === "music" ? musOn : part === "amb" ? ambOn : on; },
    anyOn: function(){ return on || musOn || ambOn; },
    set: function(part, val){
      try{
        val = !!val;
        if(part === "music"){ musOn = val; try{ localStorage.setItem(LS_MUS, val ? "on" : "off"); }catch(e){} }
        else if(part === "amb"){ ambOn = val; try{ localStorage.setItem(LS_AMB, val ? "on" : "off"); }catch(e){} }
        else { on = val; try{ localStorage.setItem(LS, val ? "on" : "off"); }catch(e){} if(on) this.play("click"); }
        if(part !== "fx"){
          if(!bedOn()) stopBed(false);
          else if(BED.want){ if(bedRunning()) busLevels(ctx.currentTime, 0.3); else startBed(); }
        }
      }catch(e){}
      return this.get(part);
    },
    /* the AudioContext only starts inside a user gesture; the game calls this on the first click.
       P10b (phones): iOS and Android only unlock audio inside a touch or pointer gesture, so the
       first tap anywhere on the page also warms the context (one-shot listeners). */
    warm: function(){ if(on || bedOn()) ac(); },
    /* the game names each scene as it renders; the beds fade to that scene's mood */
    scene: function(id, o){
      try{
        o = o || {};
        BED.scene = id; BED.want = id !== "end" && id !== "death";
        var m = moodFor(id, o), rain = !!o.stormy && id !== "dawn" && id !== "end";
        if(!BED.want){ stopBed(true); return; }
        if(!bedOn()) return;
        var changed = m !== BED.mood || rain !== BED.rain;
        BED.mood = m; BED.rain = rain;
        if(!bedRunning()) startBed();
        else if(changed) applyMood(ctx.currentTime, false);
      }catch(e){}
    },
    stopBed: function(){ BED.want = false; stopBed(true); },
    /* tests (p36-sound): book `seconds` of the bed for a scene on the (offline) context */
    renderBed: function(seconds, id, o){
      var c = ac(); if(!c) return false;
      o = o || {}; BED.mood = moodFor(id, o); BED.rain = !!o.stormy;
      BED.step = 0; BED.bar = 0; BED.next = 0.05; BED.cr = [0, 0];
      startLoops(c, 0); applyMood(0, true); ambBus.gain.setValueAtTime(BED_AMB, 0); musBus.gain.setValueAtTime(BED_MUS, 0);
      BED.render = true;   // the test renders the whole bed, whatever this device's switches say
      for(var t = 0; t < seconds; t += 0.25) schedule(t, Math.min(seconds, t + 0.25));
      BED.render = false;
      return true;
    },
  };
})();
try{
  var wydWarmOnce = function(){ try{ WydSound.warm(); }catch(e){} document.removeEventListener("touchend", wydWarmOnce, true); document.removeEventListener("pointerdown", wydWarmOnce, true); };
  document.addEventListener("touchend", wydWarmOnce, true);
  document.addEventListener("pointerdown", wydWarmOnce, true);
}catch(e){}
