/* bat-sound.js: minor sound effects for NIGHT FLIGHT (Bryson 2026-09-03 evening): a tick on every
   button, a soft two-note rise when something good happens, a low fall when something bad does,
   a three-note sparkle for achievements and saves, a thud for a wound. Everything is synthesised
   with the Web Audio API (no files, nothing fetched). Off switch in the HUD (🔊 / 🔇), remembered
   per browser in localStorage wyd-sound. Never throws: the game plays on without audio. */
var WydSound = (function(){
  var LS = "wyd-sound", ctx = null, on = true, master = null;
  try{ on = localStorage.getItem(LS) !== "off"; }catch(e){}
  /* P21 (Bryson: "still quite quiet without turning to max volume"). The chain is
     notes -> master -> compressor -> makeup -> limiter -> out. The compressor squashes the peaks,
     the makeup gain puts the whole thing back up (this was missing before, so the compressor was
     only ever making the game QUIETER), and the brickwall limiter catches the first few ms of a
     transient that slips past the compressor's 3 ms attack. Net: about 4x the old amplitude
     (~13 dB) with the loudest stacked cue still peaking near 0.6. */
  var MASTER = 1.6,    // the master level feeding the compressor
      MAKEUP = 3.5;    // put back what the compressor took, and then some
  /* P21 (Bryson: "the ringer shouldn't have to be on"). iOS routes Web Audio through the "ambient"
     session by default, which the ring/silent switch mutes. Asking for the "playback" session opts
     the page into the category iOS uses for media the user actively chose to hear, so the switch no
     longer silences it. Safari 16.4+; a no-op everywhere else. It must be set from inside the user
     gesture that creates the context, which is where ac() runs. */
  function audioSession(){
    try{
      var s = navigator.audioSession;
      if(s && s.type !== "playback") s.type = "playback";
    }catch(e){}
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
          comp.threshold.setValueAtTime(-18, ctx.currentTime);
          comp.knee.setValueAtTime(18, ctx.currentTime);
          comp.ratio.setValueAtTime(6, ctx.currentTime);
          comp.attack.setValueAtTime(0.003, ctx.currentTime);
          comp.release.setValueAtTime(0.22, ctx.currentTime);
        }catch(e){}
        var makeup = ctx.createGain(); makeup.gain.value = MAKEUP;
        var lim = ctx.createDynamicsCompressor();
        try{
          lim.threshold.setValueAtTime(-2, ctx.currentTime);
          lim.knee.setValueAtTime(0, ctx.currentTime);
          lim.ratio.setValueAtTime(20, ctx.currentTime);
          lim.attack.setValueAtTime(0.001, ctx.currentTime);
          lim.release.setValueAtTime(0.1, ctx.currentTime);
        }catch(e){}
        master.connect(comp); comp.connect(makeup); makeup.connect(lim); lim.connect(ctx.destination);
      }
      audioSession();
      if(ctx.state === "suspended") ctx.resume();
      return ctx;
    }catch(e){ return null; }
  }
  /* one note: freq (Hz), start offset (s), duration (s), wave type, peak gain, optional glide target */
  function note(f, at, dur, type, gain, slideTo){
    var c = ac(); if(!c) return;
    var t0 = c.currentTime + (at || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t0);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master || c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  /* P26 helpers for the two animal sounds. note() above is one clean oscillator, which is all a
     chirp or a thud needs. An animal needs a throat, so these add a filter and a little wobble.

     voice(): a buzzy oscillator (sawtooth by default) pushed through a lowpass that opens and
     closes like a mouth, with a slow vibrato on top. pts is a list of [fraction of the sound,
     pitch in Hz] that the frequency walks through, so a call can rise and then fall. */
  function voice(pts, at, dur, opt){
    var c = ac(); if(!c) return;
    opt = opt || {};
    var t0 = c.currentTime + (at || 0), peak = opt.gain || 0.2;
    var o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = opt.type || "sawtooth";
    o.frequency.setValueAtTime(pts[0][1], t0);
    for(var i = 1; i < pts.length; i++) o.frequency.exponentialRampToValueAtTime(pts[i][1], t0 + dur * pts[i][0]);
    f.type = "lowpass"; f.Q.value = opt.q == null ? 6 : opt.q;
    var oc = opt.open == null ? 900 : opt.open, cl = opt.close == null ? 380 : opt.close;
    f.frequency.setValueAtTime(cl, t0);
    f.frequency.linearRampToValueAtTime(oc, t0 + dur * 0.32);
    f.frequency.linearRampToValueAtTime(cl * 0.8, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + dur * (opt.attack == null ? 0.16 : opt.attack));
    g.gain.setValueAtTime(peak, t0 + dur * 0.62);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if(opt.vib){
      var lfo = c.createOscillator(), la = c.createGain();
      lfo.frequency.setValueAtTime(opt.vib, t0); la.gain.setValueAtTime(opt.vibDepth || 5, t0);
      lfo.connect(la); la.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    o.connect(f); f.connect(g); g.connect(master || c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  /* one second of white noise, made once and reused; the wet half of a swallow */
  var NOISE = null;
  function noiseBuf(c){
    if(NOISE) return NOISE;
    var b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for(var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    NOISE = b; return NOISE;
  }
  /* hiss(): a burst of noise through a bandpass that slides, which is what suction sounds like */
  function hiss(at, dur, from, to, gain, q){
    var c = ac(); if(!c) return;
    var t0 = c.currentTime + (at || 0);
    var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf(c); src.loop = true;
    f.type = "bandpass"; f.Q.value = q || 1.4;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master || c.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  /* P10: every peak gain roughly doubled (Bryson asked for a louder game); the compressor above
     keeps the stacked notes from clipping. */
  var FX = {
    click: function(){ note(1400, 0, 0.045, "triangle", 0.11, 900); },
    pick:  function(){ note(900, 0, 0.06, "sine", 0.10, 1100); },
    good:  function(){ note(523, 0, 0.12, "triangle", 0.15); note(784, 0.09, 0.18, "triangle", 0.15); },
    great: function(){ note(523, 0, 0.1, "triangle", 0.15); note(659, 0.08, 0.1, "triangle", 0.15); note(988, 0.16, 0.26, "triangle", 0.17); },
    bad:   function(){ note(330, 0, 0.22, "sawtooth", 0.08, 196); },
    hurt:  function(){ note(120, 0, 0.18, "sine", 0.25, 60); note(700, 0, 0.05, "square", 0.045, 300); },
    sleep: function(){ note(392, 0, 0.14, "sine", 0.11); note(262, 0.12, 0.3, "sine", 0.11); },
    /* P10c (Bryson): grooming bubbles up, sharing is deeper and warmer, a kicked-off bat thuds into the grass */
    /* groom(ms): bubbles for as long as the grooming animation runs (the caller passes the stream's length);
       a rising, slightly wandering run that fades over its last few bubbles */
    groom: function(ms){
      var dur = Math.max(600, Math.min(5000, ms || 1400)), step = 0.115, n = Math.round(dur / 1000 / step);
      for(var i = 0; i < n; i++){
        var f = 560 + 480 * (i / n) + ((i * 7919) % 5) * 45, g = 0.10 * (i < n - 4 ? 1 : (n - i) / 4);
        note(f, i * step, 0.075, "sine", g, f * 1.5);
      }
    },
    /* share(ms): a deep, slow pulse that lasts the blood stream (the caller passes its length) */
    share: function(ms){
      var dur = Math.max(800, Math.min(5000, ms || 1600)), step = 0.34, n = Math.round(dur / 1000 / step);
      for(var i = 0; i < n; i++){
        var g = 0.15 * (i < n - 2 ? 1 : (n - i) / 3), t = i * step;
        note(147 + (i % 2) * 49, t, 0.36, "sine", g, 160 + (i % 2) * 49);
        note(262 + (i % 3) * 32, t + 0.05, 0.3, "triangle", g * 0.6);
      }
    },
    kick:  function(){ note(90, 0, 0.16, "sine", 0.28, 45); note(240, 0.0, 0.05, "square", 0.05, 120); note(520, 0.09, 0.12, "sawtooth", 0.05, 180); note(70, 0.2, 0.22, "sine", 0.18, 40); },
    /* P29 (Bryson: "a subtle sound effect for as you adjust the slider to feed and groom, the
       slider effects should be just slight different"). One short blip per 5-point stop, quiet
       enough to drag through without becoming a rattle, and it climbs with the value so the ear
       tracks the bar. The groom bar is a soft sine; the give bar is a touch lower and warmer, a
       triangle, so the two read as different without either announcing itself. */
    tickGroom: function(v){
      var f = 620 + 520 * Math.max(0, Math.min(1, v || 0));
      note(f, 0, 0.04, "sine", 0.22, f * 1.12);
    },
    tickGive: function(v){
      var f = 380 + 300 * Math.max(0, Math.min(1, v || 0));
      note(f, 0, 0.05, "triangle", 0.26, f * 1.08);
    },
    /* P26 (Bryson): the cow lows when she wakes under your bat, and you can hear yourself drink.

       moo(): the shape of a real low is a closed "mmm" that opens into an "ooo" and falls away,
       so the pitch climbs about a fourth and then sags below where it started while the filter
       opens and shuts like a mouth. Two voices a semitone or so apart, the second quieter and a
       beat late, give it the raggedness of an actual animal; the low sine under them is the chest.
       Slightly different every time (a cow does not repeat herself) but always in the same range. */
    moo: function(){
      var f0 = 138 + Math.random() * 26, dur = 1.05 + Math.random() * 0.25;
      voice([[0, f0 * 0.86], [0.18, f0 * 1.28], [0.55, f0 * 1.18], [1, f0 * 0.72]], 0, dur,
            {gain: 0.055, open: 1150, close: 320, q: 3, vib: 5.5, vibDepth: 4});
      voice([[0, f0 * 0.9], [0.2, f0 * 1.3], [1, f0 * 0.76]], 0.06, dur * 0.86,
            {gain: 0.05, type: "triangle", open: 760, close: 260, q: 2, vib: 4, vibDepth: 3});
      note(f0 * 0.5, 0.02, dur * 0.7, "sine", 0.075, f0 * 0.42);
      hiss(0, 0.09, 700, 260, 0.03, 0.9);
    },
    /* drink(ms): the caller passes how long the blood animation runs. A soft suction hiss holds
       under the whole thing and a swallow lands every third of a second or so, each one a wet
       noise burst plus a low glug that drops in pitch. The swallows slow and quieten toward the
       end, the way you finish a big drink. */
    drink: function(ms){
      var dur = Math.max(700, Math.min(6000, ms || 2000)), n = Math.max(3, Math.round(dur / 1000 / 0.33)), t = 0.05, i;
      hiss(0, dur / 1000 * 0.92, 900, 520, 0.028, 0.8);
      for(i = 0; i < n; i++){
        var late = i / n, g = 0.155 * (1 - 0.45 * late), step = 0.30 + 0.16 * late;
        hiss(t, 0.075, 1500 - 500 * late, 380, g * 0.5, 1.6);
        note(196 - 34 * late, t + 0.015, 0.13, "sine", g, 92 - 20 * late);
        note(392 - 60 * late, t + 0.01, 0.055, "triangle", g * 0.28, 240);
        t += step;
        if(t > dur / 1000 - 0.12) break;
      }
    },
    /* P9: something happened: two bat chirps sliding down over a low drum roll */
    event: function(){ note(110, 0, 0.42, "sine", 0.23, 70); note(1900, 0.02, 0.11, "sine", 0.11, 900); note(1600, 0.16, 0.13, "sine", 0.11, 700); note(330, 0.3, 0.3, "triangle", 0.11, 262); },
  };
  return {
    play: function(kind, arg){ try{ if(!on || !FX[kind]) return false; FX[kind](arg); return true; }catch(e){ return false; } },
    isOn: function(){ return on; },
    toggle: function(){ on = !on; try{ localStorage.setItem(LS, on ? "on" : "off"); }catch(e){} if(on) this.play("click"); return on; },
    /* the AudioContext only starts inside a user gesture; the game calls this on the first click.
       P10b (phones): iOS and Android only unlock audio inside a touch or pointer gesture, so the
       first tap anywhere on the page also warms the context (one-shot listeners). */
    warm: function(){ if(on) ac(); },
  };
})();
try{
  var wydWarmOnce = function(){ try{ WydSound.warm(); }catch(e){} document.removeEventListener("touchend", wydWarmOnce, true); document.removeEventListener("pointerdown", wydWarmOnce, true); };
  document.addEventListener("touchend", wydWarmOnce, true);
  document.addEventListener("pointerdown", wydWarmOnce, true);
  /* P21: iOS suspends the context when the tab goes to the background (a call, a lock, an app
     switch). Coming back without this leaves the game silent until the next full reload. */
  document.addEventListener("visibilitychange", function(){ if(!document.hidden){ try{ WydSound.warm(); }catch(e){} } });
}catch(e){}
