/* wyd-core.js — shared helpers for the "What would you do?" games.
   Load AFTER setting window.WYD_SPECIES ("bat"|"fish"|"bee") on game pages;
   leave it unset on the hub (board shows all species with filter tabs).
   Each game page defines: wydHud(), wydStart(), and calls wydEnd({...}). */

function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
const SPECIES = {
  bat:  {em:"🦇", label:"Vampire bat",  unit:"nights"},
  fish: {em:"🐟", label:"Cleaner fish", unit:"clients"},
  bee:  {em:"🐝", label:"Honeybee",     unit:"weeks"}
};
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function fmtP(p){ return (100*p).toFixed(0)+"%"; }
function roll(){ return Math.random(); }

function log(msg, cls){
  var box = $("#wyd-log"); if(!box) return;
  var el = document.createElement("div");
  if(cls) el.className = cls;
  el.textContent = msg;
  box.prepend(el);
}
function wydScroll(el, block){
  if(!el) return;
  el.scrollIntoView({block: block||"start",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
}
/* Scroll the play area back into view when the game moves to a NEW phase
   (the .wyd-round label changes) — but not on same-phase re-renders like
   picking a different roost-mate. scroll-margin-top in wyd.css keeps the
   target clear of the fixed navbar. */
var WYD_SCENE_KEY = "";
function scene(html, mode){
  var el = $("#wyd-scene");
  el.className = "wyd-scene" + (mode ? " wyd-"+mode : "");
  el.innerHTML = html;
  if(window.wydHud) wydHud();
  var r = el.querySelector(".wyd-round");
  var key = r ? r.textContent : html.slice(0, 60);
  if(key !== WYD_SCENE_KEY){
    WYD_SCENE_KEY = key;
    var play = $("#wyd-play");
    if(play){
      var top = play.getBoundingClientRect().top;
      if(top < 56 || top > 180) wydScroll(play, "start");
    }
  }
}
function outcomeBlock(rollTxt, story, rlKicker, rlBody, cite){
  return '<div class="wyd-outcome">'+
    '<div class="wyd-roll">'+rollTxt+'</div>'+
    '<p class="wyd-story" style="margin:.6rem 0 0">'+story+'</p>'+
    '<div class="wyd-reallife"><span class="rl-k">'+rlKicker+'</span><div>'+rlBody+'</div>'+
    '<span class="cite">'+cite+'</span></div>'+
    '<div class="wyd-choices"><button class="btnx" id="wyd-next">Continue →</button></div>'+
  '</div>';
}

/* ── Firestore leaderboard (graceful fallback to device-only) ── */
var WYD_DB = null, WYD_FS = null, BOARD = [];
var lbFilter = window.WYD_SPECIES || "all";
var FB_CONFIG = {
  apiKey: "AIzaSyBosL_Hib9s81f4Hlhw3GLq_XZDNkZEnSk",
  authDomain: "bryson-website-games.firebaseapp.com",
  projectId: "bryson-website-games",
  appId: "1:849347948290:web:c2bcc044829108b4419c1b"
};
async function wydInitDb(){
  try{
    var app = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
    WYD_FS = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
    WYD_DB = WYD_FS.getFirestore(app.initializeApp(FB_CONFIG));
  }catch(e){ WYD_DB = null; }
}
function localBoard(){ try{ return JSON.parse(lsGet("wyd-local-board")||"[]"); }catch(e){ return []; } }
function renderBoard(){
  var body = $("#wyd-lb-body"); if(!body) return;
  var rows = BOARD.filter(function(e){ return lbFilter==="all" || e.sp===lbFilter; }).slice(0,25);
  var myName = lsGet("wyd-name");
  body.innerHTML = rows.length
    ? rows.map(function(e,i){
        var sp = SPECIES[e.sp];
        return '<tr'+(e.name===myName?' class="me"':'')+'>'+
          '<td class="num">'+(i+1)+'</td><td>'+esc(e.name)+'</td>'+
          '<td>'+(sp ? sp.em+" "+sp.label : esc(e.sp))+'</td>'+
          '<td class="num" style="text-align:right">'+e.score+'</td>'+
          '<td class="num">'+(e.nights ? e.nights+" "+((sp&&sp.unit)||"rounds") : "–")+'</td>'+
          '<td>'+esc(e.date||"")+'</td></tr>';
      }).join("")
    : '<tr><td colspan="6">No scores yet. Be the first on the board.</td></tr>';
}
async function loadBoard(){
  if(WYD_DB){
    try{
      var q = WYD_FS.query(WYD_FS.collection(WYD_DB,"leaderboard"),
        WYD_FS.orderBy("score","desc"), WYD_FS.limit(100));
      var snap = await WYD_FS.getDocs(q);
      BOARD = snap.docs.map(function(d){ return d.data(); });
      renderBoard(); return;
    }catch(e){ /* fall through */ }
  }
  BOARD = localBoard().sort(function(a,b){ return b.score-a.score; });
  renderBoard();
}

/* ── fullscreen play mode + run saves ──
   While a run is live the .gpage gets .wyd-playing: hero/board/notes hidden,
   top bar (exit button) shown. Each game autosaves its state object at the
   start of every round; Exit leaves play mode and the hero then offers a
   Resume button. A finished run clears its save. */
function wydPlayMode(on){
  var gp = document.querySelector(".gpage");
  if(gp){ gp.classList.toggle("wyd-playing", !!on); gp.classList.remove("wyd-ended"); }
  var tb = $("#wyd-topbar"); if(tb) tb.style.display = on ? "" : "none";
  window.scrollTo(0, 0);
}
function wydSaveRun(g){
  if(window.WYD_SPECIES) lsSet("wyd-save-"+window.WYD_SPECIES, JSON.stringify(g));
}
function wydLoadRun(){
  try{ var s = lsGet("wyd-save-"+window.WYD_SPECIES); return s ? JSON.parse(s) : null; }
  catch(e){ return null; }
}
function wydClearRun(){
  try{ localStorage.removeItem("wyd-save-"+window.WYD_SPECIES); }catch(e){}
}
function wydRefreshResume(){
  var cta = document.querySelector(".g-cta");
  if(!cta || !window.WYD_SPECIES || !window.wydResumeRun) return;
  var old = $("#wyd-resume"); if(old) old.remove();
  var g = wydLoadRun(); if(!g) return;
  var sp = SPECIES[window.WYD_SPECIES];
  var n = g.night || g.week || g.round || 1;
  var b = document.createElement("button");
  b.className = "g-start g-resume"; b.id = "wyd-resume";
  b.textContent = "Resume saved run (" + sp.unit.slice(0,-1) + " " + n + ")";
  b.addEventListener("click", function(){
    $("#wyd-end").style.display = "none";
    wydPlayMode(true);
    wydResumeRun(g);
  });
  cta.insertBefore(b, cta.querySelector(".g-learnlink"));
}

/* ── end screen + posting ── */
var WYD_FINAL = null;
function wydEnd(o){  // {score, verdict, nights}
  var gp = document.querySelector(".gpage");
  if(gp && gp.classList.contains("wyd-playing")) gp.classList.add("wyd-ended");
  wydClearRun();
  var play = $("#wyd-play"); if(play) play.style.display = "none";
  $("#wyd-end").style.display = "block";
  var sp = SPECIES[window.WYD_SPECIES] || {em:"", label:""};
  var score = Math.max(0, Math.min(2000, Math.round(o.score)));
  WYD_FINAL = {sp: window.WYD_SPECIES, score: score,
    nights: Math.max(0, Math.min(100000, o.nights||0))};
  $("#wyd-e-species").textContent = sp.em+" "+sp.label;
  $("#wyd-e-score").textContent = score;
  $("#wyd-e-verdict").textContent = o.verdict;
  $("#wyd-e-name").value = lsGet("wyd-name") || "";
  $("#wyd-e-notice").textContent = "";
  var post = $("#wyd-e-post");
  post.disabled = false; post.textContent = "Post to leaderboard";
  wydScroll($("#wyd-end"), "center");
}
function wydWireUi(){
  // top bar (exit) for game pages, injected above the play area
  var play0 = $("#wyd-play");
  if(play0 && window.WYD_SPECIES){
    var sp0 = SPECIES[window.WYD_SPECIES];
    play0.insertAdjacentHTML("beforebegin",
      '<div id="wyd-topbar" style="display:none">'+
        '<span class="wyd-tb-title">'+sp0.em+' '+sp0.label+'</span>'+
        '<span class="wyd-tb-note">progress saves at the start of each '+sp0.unit.slice(0,-1)+'</span>'+
        '<button class="btnx" id="wyd-exit">✕ Exit</button>'+
      '</div>');
    $("#wyd-exit").addEventListener("click", function(){
      $("#wyd-play").style.display = "none";
      $("#wyd-end").style.display = "none";
      wydPlayMode(false);
      wydRefreshResume();
    });
  }
  var post = $("#wyd-e-post");
  if(post) post.addEventListener("click", async function(){
    var name = ($("#wyd-e-name").value||"").trim().slice(0,24);
    var notice = $("#wyd-e-notice");
    if(!name){ notice.textContent = "Give yourself a name first."; return; }
    if(!WYD_FINAL) return;
    lsSet("wyd-name", name);
    var entry = {name: name, sp: WYD_FINAL.sp, score: WYD_FINAL.score,
      date: new Date().toISOString().slice(0,10), nights: WYD_FINAL.nights};
    post.disabled = true; post.textContent = "Posting…";
    if(WYD_DB){
      try{
        await WYD_FS.addDoc(WYD_FS.collection(WYD_DB,"leaderboard"), entry);
        notice.textContent = "Posted. You're on the global board.";
        post.textContent = "Posted ✓";
        await loadBoard();
        return;
      }catch(e){ /* fall through */ }
    }
    var lb = localBoard(); lb.push(entry);
    lsSet("wyd-local-board", JSON.stringify(lb.slice(-100)));
    notice.textContent = "Global board unreachable, so the score is saved on this device only.";
    post.textContent = "Saved locally";
    BOARD = lb.sort(function(a,b){ return b.score-a.score; }); renderBoard();
  });
  var again = $("#wyd-e-again");
  if(again) again.addEventListener("click", function(){
    $("#wyd-end").style.display = "none";
    wydPlayMode(true);
    if(window.wydStart) wydStart();
  });
  var start = $("#wyd-start");
  if(start) start.addEventListener("click", function(){
    wydPlayMode(true);
    if(window.wydStart) wydStart();
  });
  var tabs = $("#wyd-lbtabs");
  if(tabs) tabs.addEventListener("click", function(e){
    var b = e.target.closest("button"); if(!b) return;
    lbFilter = b.dataset.f;
    $$("#wyd-lbtabs button").forEach(function(x){ x.setAttribute("aria-pressed", String(x===b)); });
    renderBoard();
  });
}
wydWireUi();
// engines define wydResumeRun in a later inline script, so wait for the DOM to finish
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", wydRefreshResume);
} else {
  setTimeout(wydRefreshResume, 0);
}
wydInitDb().then(loadBoard);
