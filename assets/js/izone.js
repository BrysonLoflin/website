/* ============================================================================
   izone.js, the "Interactive zone", a small, dependency-free engine for the
   interactive figures in Bryson's Field Notes posts.
   Built 2026-09-04, after Kristoffer Magnusson's rpsychologist.com figures
   (rpsychologist.com/descriptive-adjustment): a figure you drive with sliders,
   with a sentence underneath that restates what you are looking at in words.

   AUTHORING A NEW ZONE
   --------------------
   In the post:      <div class="izone" data-izone="my-zone"></div>
   In a <script> after izone.js (or in this file, next to the others):

     IZone.define('my-zone', {
       eyebrow: 'Interactive',                    // optional, defaults to "Interactive"
       title:   'What this figure shows',
       intro:   'One or two sentences of setup.', // optional
       note:    'A caveat that belongs beside the control.',   // optional
       height:  320,                              // drawing height in CSS px, default 320
       controls: [
         {id:'k', label:'Some knob', min:0, max:1, step:0.01, value:0.5,
          fmt: v => v.toFixed(2), hint:'What moving this means.'}
       ],
       draw(g, v)      { ... },        // g = the helper below, v = {id: value}
       readout(v)      { return 'HTML string, <b>numbers in bold</b>.'; }
     });

   `g` gives you: g.ctx (2D context), g.w / g.h (CSS px), g.css('--lamp') for a
   theme token, and the plotting helpers g.axes / g.line / g.dot / g.label.
   Redraws on input, on resize, and when the site's ☀/☾ theme toggles.
   Everything is keyboard-operable because the controls are real <input
   type=range> elements; there is no canvas-only interaction anywhere.
   ============================================================================ */
window.IZone = (function () {
  "use strict";
  var DEFS = {}, LIVE = [];

  /* ── the drawing helper handed to every draw() ── */
  function G(canvas, height) {
    var ctx = canvas.getContext("2d"), self = this;
    this.ctx = ctx; this.h = height;
    this.pad = { l: 52, r: 28, t: 16, b: 40 };   // r leaves room for the last x tick label
    this.css = function (name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback || "#888";
    };
    /* size the backing store to the device so the lines are crisp */
    this.resize = function () {
      var w = Math.max(240, canvas.parentElement.clientWidth - 0);
      var dpr = Math.min(3, window.devicePixelRatio || 1);
      self.w = w;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = w + "px"; canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    this.clear = function () { ctx.clearRect(0, 0, self.w, height); };
    /* data space -> pixels, set by axes() */
    this.X = function (x) { return self.pad.l + (x - self._x0) / (self._x1 - self._x0) * (self.w - self.pad.l - self.pad.r); };
    this.Y = function (y) { return height - self.pad.b - (y - self._y0) / (self._y1 - self._y0) * (height - self.pad.t - self.pad.b); };

    /* axes(xdomain, ydomain, {xlabel, ylabel, xticks, yticks, fmtX, fmtY}) */
    this.axes = function (xd, yd, o) {
      o = o || {};
      self._x0 = xd[0]; self._x1 = xd[1]; self._y0 = yd[0]; self._y1 = yd[1];
      var line = self.css("--line", "rgba(255,255,255,.16)"),
          dim = self.css("--muted-dim", "#9c9182"),
          hair = self.css("--hair", "rgba(255,255,255,.28)");
      var xt = o.xticks || 5, yt = o.yticks || 4;
      ctx.font = '11px "Archivo Narrow", system-ui, sans-serif';
      ctx.textBaseline = "middle";
      /* horizontal gridlines + y labels */
      for (var i = 0; i <= yt; i++) {
        var yv = self._y0 + (self._y1 - self._y0) * i / yt, py = self.Y(yv);
        ctx.strokeStyle = line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(self.pad.l, Math.round(py) + .5); ctx.lineTo(self.w - self.pad.r, Math.round(py) + .5); ctx.stroke();
        ctx.fillStyle = dim; ctx.textAlign = "right";
        ctx.fillText((o.fmtY || function (d) { return d; })(yv), self.pad.l - 9, py);
      }
      /* x labels along the baseline */
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (var j = 0; j <= xt; j++) {
        var xv = self._x0 + (self._x1 - self._x0) * j / xt;
        ctx.fillStyle = dim;
        ctx.fillText((o.fmtX || function (d) { return d; })(xv), self.X(xv), height - self.pad.b + 9);
      }
      /* the two axis rules */
      ctx.strokeStyle = hair; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(self.pad.l + .5, self.pad.t); ctx.lineTo(self.pad.l + .5, height - self.pad.b + .5);
      ctx.lineTo(self.w - self.pad.r, height - self.pad.b + .5); ctx.stroke();
      if (o.xlabel) {
        ctx.fillStyle = dim; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        ctx.font = '600 11px "Archivo Narrow", system-ui, sans-serif';
        ctx.fillText(o.xlabel, (self.pad.l + self.w - self.pad.r) / 2, height - 6);
      }
      if (o.ylabel) {
        ctx.save(); ctx.translate(13, (self.pad.t + height - self.pad.b) / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = dim; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        ctx.font = '600 11px "Archivo Narrow", system-ui, sans-serif';
        ctx.fillText(o.ylabel, 0, 0); ctx.restore();
      }
      ctx.font = '11px "Archivo Narrow", system-ui, sans-serif';
    };
    /* line(fn, {color, width, dash, from, to, fill}), where fn maps x -> y in data space */
    this.line = function (fn, o) {
      o = o || {};
      var from = o.from === undefined ? self._x0 : o.from, to = o.to === undefined ? self._x1 : o.to;
      var n = 220, i, x, y;
      ctx.save();
      ctx.beginPath();
      for (i = 0; i <= n; i++) {
        x = from + (to - from) * i / n; y = fn(x);
        if (i === 0) ctx.moveTo(self.X(x), self.Y(y)); else ctx.lineTo(self.X(x), self.Y(y));
      }
      if (o.fill) {
        ctx.lineTo(self.X(to), self.Y(self._y0)); ctx.lineTo(self.X(from), self.Y(self._y0)); ctx.closePath();
        ctx.fillStyle = o.fill; ctx.fill();
      } else {
        ctx.strokeStyle = o.color || self.css("--lamp", "#c9964b");
        ctx.lineWidth = o.width || 2.4; ctx.lineJoin = "round"; ctx.lineCap = "round";
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.stroke();
      }
      ctx.restore();
    };
    this.dot = function (x, y, o) {
      o = o || {};
      ctx.save();
      ctx.beginPath(); ctx.arc(self.X(x), self.Y(y), o.r || 6, 0, Math.PI * 2);
      ctx.fillStyle = o.fill || self.css("--lamp", "#c9964b"); ctx.fill();
      if (o.ring) { ctx.strokeStyle = o.ring; ctx.lineWidth = o.ringWidth || 2.5; ctx.stroke(); }
      ctx.restore();
    };
    this.vrule = function (x, o) {
      o = o || {};
      ctx.save();
      ctx.beginPath(); ctx.moveTo(self.X(x), self.pad.t); ctx.lineTo(self.X(x), height - self.pad.b);
      ctx.strokeStyle = o.color || self.css("--line", "#555"); ctx.lineWidth = o.width || 1;
      if (o.dash !== false) ctx.setLineDash(o.dash || [4, 4]);
      ctx.stroke(); ctx.restore();
    };
    this.label = function (text, x, y, o) {
      o = o || {};
      ctx.save();
      ctx.font = o.font || '600 12px "Archivo Narrow", system-ui, sans-serif';
      ctx.fillStyle = o.color || self.css("--muted", "#b9af9e");
      ctx.textAlign = o.align || "left"; ctx.textBaseline = o.baseline || "alphabetic";
      ctx.fillText(text, self.X(x) + (o.dx || 0), self.Y(y) + (o.dy || 0));
      ctx.restore();
    };
    this.resize();
  }

  /* ── build one zone into its host element ── */
  function build(host) {
    var name = host.getAttribute("data-izone"), def = DEFS[name];
    if (!def) { host.innerHTML = '<p class="izone__fallback">This figure could not load.</p>'; return; }
    var vals = {}, controls = def.controls || [];
    controls.forEach(function (c) { vals[c.id] = c.value; });

    var uid = "iz-" + name.replace(/[^a-z0-9]+/gi, "-") + "-" + LIVE.length;
    var head = '<div class="izone__head"><span class="izone__eyebrow">' + (def.eyebrow || "Interactive") + "</span>" +
      '<h3 class="izone__title" id="' + uid + '-t">' + def.title + "</h3>" +
      (def.intro ? '<p class="izone__intro">' + def.intro + "</p>" : "") + "</div>";
    var fig = '<div class="izone__fig"><canvas aria-labelledby="' + uid + '-t"></canvas></div>';
    var ctl = '<div class="izone__ctl">' + controls.map(function (c, i) {
      return '<div class="izone__row"><label for="' + uid + "-c" + i + '">' + c.label +
        '<span class="v" data-v="' + c.id + '">' + (c.fmt ? c.fmt(c.value) : c.value) + "</span></label>" +
        '<input id="' + uid + "-c" + i + '" type="range" min="' + c.min + '" max="' + c.max +
        '" step="' + c.step + '" value="' + c.value + '" data-c="' + c.id + '">' +
        (c.hint ? '<span class="hint">' + c.hint + "</span>" : "") + "</div>";
    }).join("") + "</div>";
    var read = '<div class="izone__read"><button type="button" class="izone__reset">Reset</button>' +
      '<span data-read aria-live="polite"></span></div>';
    var note = def.note ? '<p class="izone__note">' + def.note + "</p>" : "";
    host.innerHTML = head + fig + ctl + read + note;

    var canvas = host.querySelector("canvas");
    var g = new G(canvas, def.height || 320);
    var readEl = host.querySelector("[data-read]");

    function paint() {
      g.resize(); g.clear();
      try { def.draw(g, vals); } catch (e) { /* a broken figure must not take the post down */ }
      if (def.readout && readEl) readEl.innerHTML = def.readout(vals);
      controls.forEach(function (c) {
        var v = host.querySelector('[data-v="' + c.id + '"]');
        if (v) v.textContent = c.fmt ? c.fmt(vals[c.id]) : vals[c.id];
      });
    }
    host.querySelectorAll("input[type=range]").forEach(function (inp) {
      inp.addEventListener("input", function () { vals[inp.dataset.c] = parseFloat(inp.value); paint(); });
    });
    host.querySelector(".izone__reset").addEventListener("click", function () {
      controls.forEach(function (c, i) {
        vals[c.id] = c.value;
        var inp = host.querySelector("#" + uid + "-c" + i); if (inp) inp.value = c.value;
      });
      paint();
    });
    LIVE.push(paint);
    paint();
  }

  function boot() { document.querySelectorAll(".izone[data-izone]").forEach(build); }
  var t = null;
  addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () { LIVE.forEach(function (f) { f(); }); }, 120); });
  /* the ☀/☾ toggle rewrites the tokens on <html>: repaint so the canvas follows */
  new MutationObserver(function () { LIVE.forEach(function (f) { f(); }); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  return {
    define: function (name, def) { DEFS[name] = def; if (document.readyState !== "loading") boot(); },
    boot: boot,
    repaint: function () { LIVE.forEach(function (f) { f(); }); }
  };
})();
document.addEventListener("DOMContentLoaded", function () { IZone.boot(); });
