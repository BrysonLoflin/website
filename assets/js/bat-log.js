/* bat-log.js: anonymous play-style log for NIGHT FLIGHT (P5b, 2026-09-02).
   Records every decision of every run so that strategies that do well can be summarised and
   real play described (Bryson's 2026-09-02 ask), and so that a later mode can let the other
   bats play with styles drawn from real players. Bryson's rulings (2026-09-02 evening): record
   everything, no toggle, one disclosure line on the page; link runs from the same browser.

   WHAT IS STORED (one Firestore document per run in the "runs" collection, doc id = run id):
     v   game version (int)            dv  data version (bat-data.js DATA_VERSION)
     pid random per-browser id         rk  random per-run write key (lets this browser update
                                            its own run doc and nobody else: see firestore.rules)
     d   date, day resolution           mob 1 on a narrow screen, else 0
     rm  1 under prefers-reduced-motion  pf  the run's drawn bite-fail skill (3 dp)
     tr  the partner trait deck order    st  "live" | "dead" | "done"
     nt  nights begun   sc score   cause  badges (csv)   res resumes   ex exits
     nl  the event list as one JSON string (the "se" season event carries yr = the two year keys;
         per-night outcome summaries, dawn actions, sleep snapshots; see the k codes below)
   NEVER stored: leaderboard names, free text, IP, precise timestamps, user-agent strings.
   Nothing here can throw into the game: every entry point is wrapped, every write is fire and
   forget, a failed write queues in localStorage and retries on the next page load.

   EXCLUSIONS: headless browsers (navigator.webdriver: the test harness), ?debug= pages, and
   local previews (localhost / 127.0.0.1 / file:) unless the URL carries ?log=1.

   Event codes in nl (each event is a small object; n = night):
     pk  a pick: {k,n,s(scene),c(choice),e(energy 2dp),t(ticks),ms(missStreak),sel(cow idx),
         ck(cond key), far, occ: for approach/verbs the occupant {kind, pid|key, tr(trust 2dp),
         fed} and the cow tier, w(waited count)}
     ns  night summary at the end of the night: {k,n,ck,far,pas,brd:[[tier,occupied,kind,id,tr]],
         cow(idx),tier,fed,meal,rolled,rv(roll 2dp),pf(pFail used 2dp),ow(open wound),co(cofed),
         disp,wait(waited),why(reason),res(result scene),burn,sav(savior pid),e(energy after),
         sc(score),tk(ticks left),ev(dawn event type)}
     da  a dawn action: {k,n,a(groomQ|groomL|share),p(partner id),amt(share key),tr(trust before),
         hun,stv(starving),pe(partner energy),e(your energy),stm(stamina before)}
     sl  sleep snapshot: {k,n,e,stm(stamina left),sc,pt:[[id,alive,trust 2dp,hungry,shared,groomed]]}
     rs  resume {k,n,s}   ex  exit {k,n,s}   en  end {k,n,sc,alive,cause,badges} */
var WydLog = (function(){
  var LS_PID = "wyd-pid", LS_Q = "wyd-logq", COLL = "runs", NL_CAP = 24000;
  function lsg(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lss(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function rid(){
    var s = "", a = null;
    try{ a = new Uint8Array(8); crypto.getRandomValues(a); }catch(e){ a = null; }
    for(var i = 0; i < 8; i++){ var b = a ? a[i] : Math.floor(Math.random()*256); s += (b < 16 ? "0" : "") + b.toString(16); }
    return s;
  }
  function enabled(){
    try{
      if(/[?&]log=1(?:&|$)/.test(location.search)) return true;
      if(navigator.webdriver) return false;
      if(/[?&]debug=/.test(location.search)) return false;
      if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === "file:") return false;
      return true;
    }catch(e){ return false; }
  }
  var ON = enabled();
  function pid(){
    var p = lsg(LS_PID);
    if(!p){ p = rid(); lss(LS_PID, p); }
    return p;
  }
  var r2 = function(x){ return Math.round((+x || 0) * 100) / 100; };
  var r3 = function(x){ return Math.round((+x || 0) * 1000) / 1000; };
  function push(G, ev){
    if(!G || !G.rlog) return;
    G.rlog.ev.push(ev);
  }
  function occOf(G){
    var R = G.run; if(!R || !R.board) return null;
    var cow = R.cowIdx != null ? R.board[R.cowIdx] : (G.sel != null ? R.board.filter(function(c){ return c.id === G.sel; })[0] : null);
    if(!cow) return null;
    var o = {tier: cow.tier, w: cow.waited || 0};
    if(cow.occupied && cow.occupant){
      o.kind = cow.occupant.kind;
      if(cow.occupant.kind === "mate"){ var p = G.partners[cow.occupant.pid]; o.id = cow.occupant.pid; o.tr = p ? r2(p.trust) : null; o.fed = p && p.fed ? 1 : 0; }
      else o.id = cow.occupant.key;
    }
    return o;
  }
  var api = {
    on: ON,
    /* a fresh run: the buffer lives in G so the autosave keeps it across Exit + Resume */
    start: function(G){
      try{
        // tr: the trait deck of the hollow's residents only (the rules cap it at 96 chars); the
        // roost draw (type, size, the three hidden scores) rides in the first event
        G.rlog = {rid: rid(), rk: rid(), pid: pid(), res: 0, ex: 0, ev: [],
                  pf: r3(G.pFail), tr: G.partners.filter(function(p){ return p.homeRoost === 0; }).map(function(p){ return p.trait.slice(0, 2); }).join(",").slice(0, 96)};
        if(G.roosts) push(G, {k:"ro", r: G.roosts.map(function(r){ return [r.type, r.size, r2(r.bondQ), r2(r.disease), r2(r.aggro)]; })});
        if(G.season) push(G, {k:"se", ct: r2(G.season.contagion), rk: r2(G.season.rescueK), fb: G.season.freeBonds, sw: r2(G.season.switchP), yr: (G.years || []).join(",")});   // yr: the two P9 year keys
      }catch(e){}
    },
    resume: function(G){
      try{ if(!G.rlog) api.start(G); G.rlog.res++; push(G, {k:"rs", n:G.night, s:G.scene}); }catch(e){}
    },
    exit: function(G){
      try{
        if(!G || !G.rlog) return;
        G.rlog.ex++; push(G, {k:"ex", n:G.night, s:G.scene});
        // the autosave was written on entering the scene, before this event: rewrite it so a resume keeps the exit
        if(typeof wydSaveRun === "function" && G.scene !== "end") wydSaveRun(G);
        api.flush(G, "live");
      }catch(e){}
    },
    pick: function(from, choice, G){
      try{
        if(!G || !G.rlog) return;
        var c = choice && choice.id ? String(choice.id).replace(/^wyd-/, "") : "?";
        if(c === "land") return;                       // flight scenes, not decisions
        var ev = {k:"pk", n:G.night, s:from, c:c, e:r2(G.energy), t:G.ticks, ms:G.missStreak,
                  ck: G.cond ? G.cond.key : null};
        if(G.run){ ev.far = G.run.far ? 1 : 0; if(G.sel != null) ev.sel = G.sel; }
        if(from === "pasture" || from === "encounter"){ var o = occOf(G); if(o) ev.occ = o; }
        push(G, ev);
      }catch(e){}
    },
    /* called on entering a scene; the night summary is taken once the night's facts are final */
    scene: function(id, G){
      try{
        if(!G || !G.rlog) return;
        if(id === "dawn" || id === "death"){
          var R = G.run || {};
          var brd = (R.board || []).map(function(c){
            var o = c.occupant || {};
            var tr = o.kind === "mate" && G.partners[o.pid] ? r2(G.partners[o.pid].trust) : null;
            return [c.tier, c.occupied ? 1 : 0, o.kind || null, o.kind === "mate" ? o.pid : (o.key || null), tr];
          });
          var hz = R.hazard || {};
          push(G, {k:"ns", n:G.night, ck: G.cond ? G.cond.key : null, far: R.far ? 1 : 0, pas: R.pasture || null,
            ro: R.roost != null ? R.roost : null, nr: R.newRoost ? 1 : 0, sk: hz.sick ? 1 : 0, hu: hz.hurt ? 1 : 0,
            brd: brd, cow: R.cowIdx, tier: R.cowIdx != null && R.board ? R.board[R.cowIdx].tier : null,
            fed: R.fedTonight ? 1 : 0, meal: r2(R.meal), rolled: R.rolled ? 1 : 0,
            rv: R.rolled ? r2(R.rollValue) : null, pf: R.rolled ? r2(R.pFailUsed) : null,
            ow: R.openWound ? 1 : 0, co: R.cofed ? 1 : 0, disp: R.displaced ? 1 : 0, wait: R.waited ? 1 : 0,
            why: R.fedTonight ? null : (R.reason || null), res: R.result || id, burn: R.burn != null ? r2(R.burn) : null,
            sav: R.savior || null, e: r2(G.energy), sc: Math.round(G.score), tk: G.ticks,
            ev: G.event ? (G.event.type || 1) : null});
          api.flush(G, id === "death" ? "dead" : "live");
        }
      }catch(e){}
    },
    dawn: function(G, a, p, extra){
      try{
        if(!G || !G.rlog || !p) return;
        var ev = {k:"da", n:G.night, a:a, p:p.id, tr:r2(p.trust), hun:p.hungry ? 1 : 0, stv:p.starving ? 1 : 0,
                  pe:r2(p.energy), e:r2(G.energy), stm:G.stamina};
        if(extra) for(var k in extra) ev[k] = extra[k];
        push(G, ev);
      }catch(e){}
    },
    sleep: function(G){
      try{
        if(!G || !G.rlog) return;
        // P5: the colony is 12-60 bats; the snapshot keeps the bats present tonight and every
        // bat you have a real bond with (trust >= 0.2), so ten dawns fit the 24 kB cap
        var keep = G.partners.filter(function(p){ return p.present || p.trust >= 0.2 || !p.alive; });
        push(G, {k:"sl", n:G.night, e:r2(G.energy), stm:G.stamina, sc:Math.round(G.score),
          ro: G.myRoost, sick: G.sick || 0, hurt: G.hurt || 0,
          pt: keep.map(function(p){ return [p.id, p.alive ? 1 : 0, r2(p.trust), p.hungry ? 1 : 0, p.shared ? 1 : 0, p.groomed ? 1 : 0]; })});
      }catch(e){}
    },
    end: function(G, score, badges){
      try{
        if(!G || !G.rlog) return;
        push(G, {k:"en", n:G.night, sc:Math.round(score), alive:G.alive ? 1 : 0, cause:G.cause || "",
                 badges:(badges || []).map(function(b){ return b.key; }).join(",")});
        api.flush(G, G.alive ? "done" : "dead");
      }catch(e){}
    },
    /* the document as the rules validate it */
    doc: function(G, st){
      var L = G.rlog;
      var nl = JSON.stringify(L.ev);
      if(nl.length > NL_CAP) nl = nl.slice(0, NL_CAP - 12) + "\",\"trunc\"]";   // keeps it a string; the analysis tolerates a cut tail
      var badges = "";
      for(var i = L.ev.length - 1; i >= 0; i--){ if(L.ev[i].k === "en"){ badges = L.ev[i].badges || ""; break; } }
      var mob = 0, rm = 0;
      try{ mob = innerWidth < 700 ? 1 : 0; rm = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0; }catch(e){}
      return {v: (typeof GAME_VERSION === "number" ? GAME_VERSION : 4), dv: (typeof DATA_VERSION === "string" ? DATA_VERSION : "?"), pid: L.pid, rk: L.rk,
              d: new Date().toISOString().slice(0, 10), mob: mob, rm: rm, pf: L.pf, tr: L.tr, st: st,
              nt: G.night, sc: Math.max(0, Math.round(G.score)), cause: String(G.cause || "").slice(0, 24),
              badges: badges.slice(0, 80), res: L.res, ex: L.ex, nl: nl};
    },
    flush: function(G, st){
      try{
        if(!ON || !G || !G.rlog) return;
        var d = api.doc(G, st);
        api.write(G.rlog.rid, d);
      }catch(e){}
    },
    write: function(id, d){
      var q = {}; try{ q = JSON.parse(lsg(LS_Q) || "{}") || {}; }catch(e){ q = {}; }
      q[id] = d; var ids = Object.keys(q); while(ids.length > 20){ delete q[ids.shift()]; }
      lss(LS_Q, JSON.stringify(q));
      if(!(window.WYD_DB && window.WYD_FS)) return;
      try{
        WYD_FS.setDoc(WYD_FS.doc(WYD_DB, COLL, id), d).then(function(){
          var q2 = {}; try{ q2 = JSON.parse(lsg(LS_Q) || "{}") || {}; }catch(e){ q2 = {}; }
          if(q2[id] && q2[id].nl === d.nl && q2[id].st === d.st){ delete q2[id]; lss(LS_Q, JSON.stringify(q2)); }
        }).catch(function(){});
      }catch(e){}
    },
    /* retry anything that did not reach Firestore last time (offline, closed tab) */
    retry: function(){
      if(!ON) return;
      var tries = 0;
      var tick = function(){
        if(!(window.WYD_DB && window.WYD_FS)){ if(tries++ < 40) setTimeout(tick, 500); return; }
        var q = {}; try{ q = JSON.parse(lsg(LS_Q) || "{}") || {}; }catch(e){ q = {}; }
        Object.keys(q).forEach(function(id){ api.write(id, q[id]); });
      };
      setTimeout(tick, 1500);
    }
  };
  api.retry();
  return api;
})();
