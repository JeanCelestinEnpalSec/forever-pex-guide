/* Forever Pex Guide — rendu d'une page de classe à partir de docs/data/classes/<classe>/*.json.
   Aucune dépendance. Le niveau choisi et les filtres restent dans ce navigateur (localStorage). */
(function () {
  "use strict";

  var root = document.getElementById("guide");
  if (!root) return;
  var CLASS = root.getAttribute("data-class");
  var BASE = root.getAttribute("data-base");
  var FILES = ["meta", "talents", "spells", "gear", "professions", "leveling", "pets"];
  var ICON = "https://wow.zamimg.com/images/wow/icons/medium/";
  var WH = "https://www.wowhead.com/forever/";
  var KEY = "fpg:" + CLASS + ":";
  var D = {};
  var S = { lvl: 10, tview: "level", prio: "all", ranks: true, wtype: "all", fac: "all", use: "all", wk: null, race: "alliance", sel: null };

  /* ---------- Outils ---------- */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function load(k, d) { try { var v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : on continue sans */ } }
  function get(o, p) { return p.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function fmt(n, d) { return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  function icon(name, cls, alt) {
    if (!name) return "";
    return '<img class="ico' + (cls ? " " + cls : "") + '" src="' + ICON + esc(name) + '.jpg" alt="' + esc(alt || "") + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  }
  function wh(type, id, inner, cls) {
    if (!id) return '<span class="' + (cls || "") + '">' + inner + "</span>";
    return '<a class="it ' + (cls || "") + '" href="' + WH + type + "=" + id + '" target="_blank" rel="noopener">' + inner + "</a>";
  }
  function item(o, q) {
    return '<span class="q' + (q != null ? q : (o.q != null ? o.q : 1)) + '">' + wh("item", o.id, icon(o.icon) + "<span>" + esc(o.fr) + "</span>") + "</span>";
  }
  function coin(p) {
    if (!p) return "";
    var h = '<span class="coin">';
    if (p[0]) h += p[0] + '<i class="g" title="or"></i> ';
    if (p[1]) h += p[1] + '<i class="s" title="argent"></i> ';
    if (p[2]) h += p[2] + '<i class="c" title="cuivre"></i>';
    return h.trim() + "</span>";
  }
  function srcChips(list) {
    if (!list || !list.length || !D.meta) return "";
    return list.map(function (k) {
      var s = D.meta.sources[k];
      if (!s) return "";
      var kind = D.meta.kinds[s.kind] || {};
      var label = esc(kind.fr || s.kind) + " · " + esc(s.fr.split(" : ")[0].split(" (")[0]);
      var title = esc(s.fr + (s.date ? " — " + s.date : "") + (kind.about ? " — " + kind.about : ""));
      return s.url
        ? '<a class="src k-' + esc(s.kind) + '" href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + title + '">' + label + "</a>"
        : '<span class="src k-' + esc(s.kind) + '" title="' + title + '">' + label + "</span>";
    }).join("");
  }
  function dateFr(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  function copyText(text, btn) {
    function done(ok) { var t = btn.textContent; btn.textContent = ok ? "Copié" : "Sélectionné"; setTimeout(function () { btn.textContent = t; }, 1400); }
    try {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
    } catch (e) { fallback(); }
    function fallback() {
      var pre = btn.closest("[data-copy-box]");
      var target = pre && pre.querySelector("pre, code");
      if (target) { var r = document.createRange(); r.selectNodeContents(target); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      done(false);
    }
  }
  function pressed(group, attr, value) {
    $$("[" + attr + "]", group).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value)); });
  }

  /* ---------- Talents : calculs ---------- */
  var TAL = {};
  function indexTalents() {
    D.talents.trees.forEach(function (tree) {
      tree.talents.forEach(function (t) { t.tree = tree.slug; TAL[t.slug] = t; });
    });
  }
  function buildPath() { return (D.talents.builds[0] || { path: [] }).path; }
  function ranksAt(lvl) {
    var p = buildPath(), r = {}, n = Math.max(0, Math.min(p.length, lvl - 9));
    for (var i = 0; i < n; i++) r[p[i]] = (r[p[i]] || 0) + 1;
    return r;
  }
  function levelsOf(slug) {
    var out = [];
    buildPath().forEach(function (s, i) { if (s === slug) out.push(10 + i); });
    return out;
  }

  /* ---------- Rendus ---------- */
  function renderHero() {
    var m = D.meta;
    $("#h-checked").textContent = "vérifié le " + dateFr(m.checked) + " · client " + m.client;
    $("#h-summary").textContent = m.summary;
    $("#h-chips").innerHTML =
      '<span class="chip">Spé de pex : <b>' + esc(m.spec.fr) + "</b> " + esc(m.spec.points) + "</span>" +
      '<span class="chip">Talents dès le <b>niveau 10</b></span>' +
      '<span class="chip">Familier au <b>niveau 10</b></span>' +
      '<span class="srcs">' + srcChips(m.summarySrc) + "</span>";
  }

  function renderOverview() {
    $("#ov-pro").innerHTML = D.meta.strengths.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    $("#ov-con").innerHTML = D.meta.weaknesses.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    $("#ov-stats").innerHTML = D.gear.statPriority.map(function (s) { return "<li><b>" + esc(s.stat) + '</b><span class="small muted">' + esc(s.why) + "</span></li>"; }).join("");
  }

  function renderTalents() {
    var full = S.tview === "full";
    var lvl = full ? 60 : S.lvl;
    var r = ranksAt(lvl);
    var next = S.lvl >= 10 && S.lvl < 60 && !full ? buildPath()[S.lvl - 9] : null;
    var spent = Object.keys(r).reduce(function (a, k) { return a + r[k]; }, 0);
    $("#tal-intro").textContent = D.talents.builds[0].summary;
    $("#tal-count").textContent = full
      ? "51 points au niveau 60."
      : (S.lvl < 10 ? "Pas encore de talent : le premier point arrive au niveau 10." : spent + " point" + (spent > 1 ? "s" : "") + " au niveau " + S.lvl + (next ? " · prochain point au " + (S.lvl + 1) + " : " + TAL[next].fr : "") + ".");

    $("#trees").innerHTML = D.talents.trees.map(function (tree) {
      var pts = tree.talents.reduce(function (a, t) { return a + (r[t.slug] || 0); }, 0);
      var cells = tree.talents.map(function (t) {
        var k = r[t.slug] || 0;
        var st = k === 0 ? "" : (k >= t.max ? " full" : " part");
        return '<button type="button" class="tal' + st + (S.sel === t.slug ? " sel" : "") + (next === t.slug ? " next" : "") + '" style="grid-row:' + t.row + ";grid-column:" + t.col + '" data-tal="' + t.slug + '" aria-label="' + esc(t.fr + ", rang " + k + " sur " + t.max) + '">' +
          '<img src="' + ICON + esc(t.icon) + '.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="fb" aria-hidden="true">' + esc(t.fr.charAt(0)) + "</span>" +
          '<span class="rk">' + k + "/" + t.max + "</span></button>";
      }).join("");
      var links = tree.talents.filter(function (t) { return t.dep; }).map(function (t) {
        var d = TAL[t.dep];
        var on = (r[t.dep] || 0) >= d.max;
        return '<span class="tlink' + (on ? " on" : "") + '" style="grid-column:' + t.col + ";grid-row:" + d.row + " / " + (t.row + 1) + '" aria-hidden="true"></span>';
      }).join("");
      return '<div class="tree' + (pts ? "" : " zero") + '"><div class="tree-h">' + icon(tree.icon) + "<h3>" + esc(tree.fr) + '</h3><span class="pts">' + pts + '</span></div><div class="tgrid">' + links + cells + "</div></div>";
    }).join("");

    $("#tal-path").innerHTML = buildPath().map(function (slug, i) {
      var lv = 10 + i, t = TAL[slug];
      var st = lv < S.lvl ? "past" : (lv === S.lvl ? "now" : "");
      return '<li class="' + st + " tree-" + t.tree + '"><button type="button" data-lvl="' + lv + '" title="' + esc("Niveau " + lv + " : " + t.fr) + '"><span class="lv">' + lv + "</span>" +
        '<img src="' + ICON + esc(t.icon) + '.jpg" alt="' + esc(t.fr) + '" loading="lazy" onerror="this.style.visibility=\'hidden\'"></button></li>';
    }).join("");

    if (S.sel) renderTalentDetail(S.sel);
  }

  function renderTalentDetail(slug) {
    var t = TAL[slug];
    if (!t) return;
    var tree = D.talents.trees.filter(function (x) { return x.slug === t.tree; })[0];
    var k = ranksAt(S.tview === "full" ? 60 : S.lvl)[slug] || 0;
    var lv = levelsOf(slug);
    var needs = [];
    if (t.row > 1) needs.push((t.row - 1) * 5 + " points en " + tree.fr);
    if (t.dep) needs.push(TAL[t.dep].fr + " au maximum");
    $("#tal-detail").innerHTML =
      '<div class="tdetail">' + icon(t.icon, "lg", "") +
      "<h3>" + esc(t.fr) + ' <span class="small muted">' + esc(t.en) + " · " + esc(tree.fr) + '</span> <span class="badge">' + k + "/" + t.max + "</span></h3>" +
      '<p class="small muted">' + (lv.length ? (lv.length > 1 ? "Pris aux niveaux " + lv.slice(0, -1).join(", ") + " et " + lv[lv.length - 1] : "Pris au niveau " + lv[0]) + " dans ce build." : "Pas dans ce build.") + (needs.length ? " Demande : " + esc(needs.join(", ")) + "." : "") + (t.active ? " Technique active : " + esc(t.active) + "." : "") + "</p>" +
      '<div class="rank-txt">' + (t.r1 ? "<p><b>Rang 1 :</b> " + esc(t.r1) + "</p>" : "") + "<p><b>" + (t.max > 1 ? "Rang " + t.max + " :" : "Effet :") + "</b> " + esc(t.rmax) + "</p>" +
      '<p class="small" style="background:none;padding:0">' + wh("spell", t.id, "Voir sur Wowhead Forever ↗") + "</p></div></div>";
  }

  function renderRotation() {
    var rot = D.leveling.rotation;
    $("#rot-methods").innerHTML = [rot.single, rot.multi].map(function (m) {
      return '<div class="panel"><h3>' + esc(m.fr) + '</h3><ol class="steps small">' + m.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div>";
    }).join("");
    $("#rot-phases").innerHTML = rot.phases.map(function (p) {
      var on = S.lvl >= p.from && S.lvl <= p.to;
      return '<div class="panel' + (on ? " key" : "") + '"><span class="eyebrow">Niveaux ' + p.from + " à " + p.to + (on ? " · ton niveau" : "") + "</span><h3>" + esc(p.fr) + '</h3><ol class="steps small">' + p.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div>";
    }).join("");
  }

  function renderSpells() {
    $("#sp-notes").textContent = D.spells.notes;
    var prevLvl = null;
    var nextLvl = null;
    D.spells.spells.forEach(function (s) { if (s.lvl > S.lvl && nextLvl == null) nextLvl = s.lvl; });
    var rows = D.spells.spells.filter(function (s) {
      if (!S.ranks && s.rank) return false;
      if (S.prio === "E") return s.prio === "E";
      if (S.prio === "EU") return s.prio !== "O";
      return true;
    }).map(function (s) {
      var cls = s.lvl <= S.lvl ? "avail" : (s.lvl === nextLvl ? "now" : "later");
      var showLvl = s.lvl !== prevLvl;
      prevLvl = s.lvl;
      var name = (s.id ? wh("spell", s.id, icon(s.icon) + "<span>" + esc(s.fr) + "</span>") : '<span class="it">' + icon(s.icon) + "<span>" + esc(s.fr) + "</span></span>") +
        (s.rank ? ' <span class="small muted">rang ' + s.rank + "</span>" : "");
      return '<tr class="' + cls + '"><td class="num lv">' + (showLvl ? s.lvl : "") + "</td><td>" + name + "</td><td>" + (s.cost ? coin(s.cost) : '<span class="muted small">à relever</span>') + '</td><td><span class="tag p-' + s.prio + '">' + esc(D.spells.legend[s.prio]) + '</span></td><td class="small">' + esc(s.note || "") + "</td></tr>";
    }).join("");
    $("#sp-body").innerHTML = rows || '<tr><td colspan="5" class="empty">Aucun sort avec ces filtres.</td></tr>';
  }

  function bracketFor(lvl) {
    var w = D.leveling.walkthrough;
    for (var i = 0; i < w.length; i++) if (lvl >= w[i].from && lvl <= w[i].to) return i;
    return w.length - 1;
  }
  function overlaps(a, b) { return a.from <= b.to && b.from <= a.to; }

  function renderWalkthrough() {
    var w = D.leveling.walkthrough;
    var auto = bracketFor(S.lvl);
    var cur = S.wk == null ? auto : S.wk;
    $("#wk-tabs").innerHTML = w.map(function (b, i) {
      return '<button type="button" role="tab" data-wk="' + i + '" aria-selected="' + (i === cur) + '">' + b.from + "–" + b.to + (i === auto ? " ·" : "") + "</button>";
    }).join("");
    var b = w[cur];
    var zones = D.leveling.zoneBrackets.list.filter(function (z) { return overlaps(z, b); });
    var dj = D.leveling.dungeons.list.filter(function (d) { return overlaps(d, b); });
    $("#wk-body").innerHTML =
      '<div class="row" style="justify-content:space-between"><h3>' + esc(b.fr) + ' <span class="small muted">niveaux ' + b.from + " à " + b.to + '</span></h3><div class="srcs">' + srcChips(b.src) + "</div></div>" +
      '<ul class="list">' + b.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
      (zones.length ? "<h3>Zones conseillées</h3><ul class=\"list small\">" + zones.map(function (z) { return "<li><span class=\"lv\">" + z.from + "–" + z.to + "</span> · " + esc(z.zones) + (z.tip ? ' <span class="muted">— ' + esc(z.tip) + "</span>" : "") + "</li>"; }).join("") + "</ul>" : "") +
      (dj.length ? "<h3>Donjons</h3><div class=\"stack small\">" + dj.map(function (d) {
        var loot = (d.loot || []).map(function (id) { var it = ITEMS[id]; return it ? item(it) : ""; }).join("");
        return "<div><b>" + esc(d.fr) + "</b>" + (d.isNew ? ' <span class="tag t-accent">nouveau</span>' : "") + ' <span class="lv muted">' + d.from + "–" + d.to + "</span>" + (d.note ? ' <span class="muted">· ' + esc(d.note) + "</span>" : "") + (loot ? '<div class="loot">' + loot + "</div>" : "") + "</div>";
      }).join("") + "</div>" : "");

    $("#zb-body").innerHTML = D.leveling.zoneBrackets.list.map(function (z) {
      var on = S.lvl >= z.from && S.lvl < z.to || (S.lvl === 60 && z.to === 60);
      return '<tr class="' + (on ? "now" : "") + '"><td class="num lv">' + z.from + "–" + z.to + "</td><td>" + esc(z.zones) + (z.tip ? '<div class="small muted">' + esc(z.tip) + "</div>" : "") + '</td><td class="small">' + esc(z.dungeons) + "</td></tr>";
    }).join("");
  }

  var ITEMS = {};
  function indexItems() {
    var g = D.gear;
    g.ranged.concat(g.upgrades).forEach(function (o) { ITEMS[o.id] = o; });
  }

  function renderGear() {
    var g = D.gear;
    $("#gear-notes").textContent = g.notes;
    var list = g.ranged.filter(function (w) {
      if (S.wtype !== "all" && w.type !== S.wtype) return false;
      if (S.fac !== "all" && w.faction !== "both" && w.faction !== S.fac) return false;
      return true;
    });
    var maxDps = g.ranged.reduce(function (a, w) { return Math.max(a, w.dps); }, 0);
    var best = null;
    list.forEach(function (w) { if (w.lvl <= S.lvl && (!w.req || w.req <= S.lvl) && (!best || w.dps > best.dps)) best = w; });
    $("#w-best").innerHTML = best
      ? "À ton niveau (" + S.lvl + "), la meilleure arme de cette liste : " + item(best) + " · " + fmt(best.dps, 2) + " DPS."
      : "Aucune arme de cette liste n’est encore à ta portée.";
    $("#w-body").innerHTML = list.map(function (w) {
      var cls = w === best ? "best" : (w.lvl > S.lvl ? "later" : "");
      return '<tr class="' + cls + '"><td class="num lv">' + w.lvl + "</td><td>" + item(w) + (w.key ? ' <span class="badge">incontournable</span>' : "") + (w === best ? ' <span class="tag t-ok">ton choix</span>' : "") +
        '</td><td class="small">' + esc(w.type) + (w.faction === "A" ? ' <span class="tag t-accent">Alliance</span>' : "") + "</td>" +
        '<td><div class="dps"><span class="mono">' + fmt(w.dps, 2) + '</span><div class="bar"><span style="width:' + (w.dps / maxDps * 100).toFixed(1) + '%"></span></div></div>' + (w.req ? '<span class="small muted">requis ' + w.req + "</span>" : "") + "</td>" +
        '<td class="small">' + esc(w.how) + (w.npc ? " " + wh("npc", w.npc, "carte ↗") : "") + "</td></tr>";
    }).join("") || '<tr><td colspan="5" class="empty">Aucune arme avec ces filtres.</td></tr>';

    $("#u-body").innerHTML = g.upgrades.slice().sort(function (a, b) { return a.lvl - b.lvl; }).map(function (u) {
      return '<tr class="' + (u.lvl > S.lvl ? "later" : "") + '"><td class="num lv">' + u.lvl + "</td><td>" + item(u) + (u.key ? ' <span class="badge">incontournable</span>' : "") + '</td><td class="small">' + esc(u.slot) + '</td><td class="small mono">' + esc(u.stats || "—") + '</td><td class="small">' + esc(u.how) + (u.faction === "A" ? ' <span class="tag t-accent">Alliance</span>' : "") + "</td></tr>";
    }).join("");

    var ammoCur = 0;
    g.ammo.forEach(function (a, i) { if (a.lvl <= S.lvl) ammoCur = i; });
    $("#ammo-body").innerHTML = g.ammo.map(function (a, i) {
      return '<tr class="' + (i === ammoCur ? "now" : (a.lvl > S.lvl ? "later" : "")) + '"><td class="num lv">' + a.lvl + "</td><td>" + item(a.bullet) + "</td><td>" + item(a.arrow) + '</td><td class="num mono">' + fmt(a.dps, 1) + "</td></tr>" +
        (a.price && i === ammoCur ? '<tr class="now"><td></td><td colspan="3" class="small">' + esc(a.price) + "</td></tr>" : "");
    }).join("");

    var qCur = 0;
    g.quivers.forEach(function (q, i) { if (q.lvl <= S.lvl) qCur = i; });
    $("#q-body").innerHTML = g.quivers.map(function (q, i) {
      return '<tr class="' + (i === qCur ? "now" : (q.lvl > S.lvl ? "later" : "")) + '"><td class="num lv">' + q.lvl + "</td><td>" + item(q.pouch) + "<br>" + item(q.quiver) + '</td><td class="small">' + esc(q.how) + "</td></tr>";
    }).join("");

    $("#ws-note").textContent = g.weaponSkills.note;
    $("#ws-list").innerHTML = g.weaponSkills.list.map(function (w) { return '<span class="chip"><b>' + esc(w.fr) + "</b> · " + esc(w.where) + "</span>"; }).join("");
  }

  function renderPets() {
    var p = D.pets;
    $("#pet-advice").innerHTML = p.advice.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    $("#pet-notes").textContent = p.notes || "";
    $("#pet-cards").innerHTML = p.families.filter(function (f) { return S.use === "all" || f.use.indexOf(S.use) >= 0; }).map(function (f) {
      return '<div class="panel"><span class="eyebrow">' + esc(f.en) + "</span><h3>" + esc(f.fr) + '</h3><p class="small"><b>' + esc(f.verdict) + '</b></p><p class="small">' + esc(f.ability) + '</p><p class="small muted">Où : ' + esc(f.where) + '</p><p class="small muted">Régime : ' + esc(f.diet) + '</p><div class="chips">' + f.use.map(function (u) { return '<span class="tag t-pet">' + esc(u) + "</span>"; }).join(" ") + (f.npc ? " " + wh("npc", f.npc, "carte ↗", "small") : "") + "</div></div>";
    }).join("") || '<p class="empty">Aucune famille pour cet usage.</p>';
  }

  function way(x, y, name) { return "/way " + x + " " + y + " " + name; }

  function renderProfessions() {
    var p = D.professions;
    $("#pro-picks").innerHTML = p.picks.map(function (k) {
      return '<div class="panel"><span class="eyebrow">Métier ' + esc(k.kind) + "</span><h3>" + esc(k.fr) + '</h3><span class="tag t-ok">' + esc(k.verdict) + '</span><p class="small">' + esc(k.why) + "</p></div>";
    }).join("");
    $("#camp-intro").textContent = p.campfire.intro;
    $("#camp-items").innerHTML = p.campfire.items.map(function (c) {
      return '<div class="panel' + (c.key ? " key" : "") + '">' + item(c) + '<p class="small"><b>Effet :</b> ' + esc(c.effect) + '</p><p class="small muted"><b>Il faut :</b> ' + esc(c.needs) + "</p></div>";
    }).join("");
    $("#camp-shop").innerHTML = p.campfire.shopping.map(function (s) {
      return "<tr><td>" + item(s) + "</td><td>" + coin(s.price) + '</td><td class="small">' + esc(s.where) + " " + wh("npc", s.npc, "carte ↗") + "</td></tr>";
    }).join("");

    var lw = p.leatherworking;
    $("#lw-note").textContent = lw.note;
    $("#lw-body").innerHTML = lw.steps.map(function (s) {
      return '<tr><td class="lv">' + s.from + " → " + s.to + '<div class="bar" style="max-width:160px;margin-top:4px"><span style="width:' + (s.to / 300 * 100).toFixed(1) + '%"></span></div></td><td>' + item(s) + '</td><td class="mono small">' + esc(s.qty || "jusqu’au palier") + "</td></tr>";
    }).join("");
    $("#lw-shop").innerHTML = lw.shopping.map(function (t) {
      return '<div class="panel"><h3>' + esc(t.tier) + '</h3><ul class="list small">' + t.mats.map(function (m) { return "<li>" + item(m) + ' <span class="mono">× ' + m.qty + "</span></li>"; }).join("") + '</ul><div class="srcs">' + srcChips(lw.src) + "</div></div>";
    }).join("");

    $("#tr-note").textContent = p.trainers.note;
    $("#tr-body").innerHTML = p.trainers.list.map(function (t) {
      var w = way(t.x, t.y, t.fr.split(" ")[0]);
      return "<tr><td><b>" + esc(t.fr) + "</b></td><td>" + esc(t.zone) + '</td><td><span class="coord" data-copy-box>' + fmt(t.x, 1) + ", " + fmt(t.y, 1) + ' <button type="button" class="copy" data-copy="' + esc(w) + '" title="Copier la commande TomTom">/way</button> ' + wh("npc", t.npc, "carte ↗") + "<code hidden>" + esc(w) + '</code></span></td><td class="small">' + esc(t.what) + "</td></tr>";
    }).join("");
  }

  function renderConsumables() {
    var c = D.gear.consumables;
    $("#food-note").textContent = c.xpFood.note;
    $("#food-list").innerHTML = c.xpFood.items.map(function (f) {
      return '<span class="chip">' + item(f) + (f.req ? ' <span class="small muted">niv. ' + f.req + "</span>" : "") + "</span>";
    }).join("");
    $("#pot-body").innerHTML = c.potions.map(function (p) {
      var hOk = !p.heal.req || p.heal.req <= S.lvl, mOk = !p.mana.req || p.mana.req <= S.lvl;
      return "<tr><td" + (hOk ? "" : ' class="muted"') + ">" + item(p.heal) + '</td><td class="num lv">' + (p.heal.req || "—") + "</td><td" + (mOk ? "" : ' class="muted"') + ">" + item(p.mana) + '</td><td class="num lv">' + (p.mana.req || "—") + "</td></tr>";
    }).join("");
    $("#band-list").innerHTML = D.professions.bandages.map(function (b) { return '<span class="chip">' + item(b) + "</span>"; }).join("");
  }

  function renderRaces() {
    var r = D.meta.races;
    $("#race-note").textContent = r.note;
    $$("#race-tabs [data-fac]").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-fac") === S.race)); });
    $("#race-cards").innerHTML = r[S.race].map(function (x) {
      return '<div class="panel"><h3>' + esc(x.fr) + '</h3><p class="small"><b>' + esc(x.verdict) + '</b></p><ul class="list small">' + x.racials.map(function (k) { return "<li>" + esc(k) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
  }

  function renderTips() {
    var m = D.meta;
    $("#tips").innerHTML = m.tips.list.map(function (t) { return '<div class="panel"><h3>' + esc(t.t) + '</h3><p class="small">' + esc(t.d) + "</p></div>"; }).join("");
    $("#macro-note").textContent = m.macros.note;
    $("#macros").innerHTML = m.macros.list.map(function (x) {
      return '<div class="panel" data-copy-box><div class="row" style="justify-content:space-between"><h3>' + esc(x.t) + '</h3><button type="button" class="copy" data-copy="' + esc(x.code) + '">Copier</button></div><p class="small muted">' + esc(x.d) + '</p><pre class="macro">' + esc(x.code) + "</pre></div>";
    }).join("");
  }

  function renderSources() {
    var m = D.meta;
    var kinds = Object.keys(m.kinds).sort(function (a, b) { return m.kinds[a].rank - m.kinds[b].rank; });
    $("#kinds").innerHTML = kinds.map(function (k) { return '<span class="src k-' + k + '" title="' + esc(m.kinds[k].about) + '">' + m.kinds[k].rank + ". " + esc(m.kinds[k].fr) + "</span>"; }).join("");
    $("#src-body").innerHTML = Object.keys(m.sources).map(function (k) {
      var s = m.sources[k], kind = m.kinds[s.kind];
      return "<tr><td>" + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.fr) + "</a>" : esc(s.fr)) + '</td><td><span class="src k-' + esc(s.kind) + '">' + esc(kind.fr) + '</span><div class="small muted">' + esc(kind.about) + '</div></td><td class="small lv">' + esc(s.date ? dateFr(s.date) : "") + "</td></tr>";
    }).join("");
    $$("[data-src]").forEach(function (el) { el.innerHTML = srcChips(get(D, el.getAttribute("data-src"))); });
  }

  /* ---------- Niveau ---------- */
  function measureBar() {
    var bar = document.querySelector(".lvlbar");
    if (bar) document.documentElement.style.setProperty("--lvlbar-h", bar.offsetHeight + "px");
  }
  function renderLevelBar() {
    var L = S.lvl;
    $("#lvl").value = L;
    $("#lvl-out").textContent = L;
    var chips = [];
    var p = buildPath();
    if (L < 10) chips.push('<span class="chip">Premier talent et familier au <b>niveau 10</b></span>');
    else if (L < 60) { var t = TAL[p[L - 9]]; chips.push('<span class="chip">Talent au ' + (L + 1) + " : " + icon(t.icon) + "<b>" + esc(t.fr) + "</b></span>"); }
    var nextSp = D.spells.spells.filter(function (s) { return s.lvl > L; });
    if (nextSp.length) {
      var lv = nextSp[0].lvl, n = nextSp.filter(function (s) { return s.lvl === lv; });
      chips.push('<span class="chip">Entraîneur au ' + lv + " : <b>" + n.length + " sort" + (n.length > 1 ? "s" : "") + "</b>" + (n.some(function (s) { return s.prio === "E"; }) ? ' <span class="tag t-ok">essentiel</span>' : "") + "</span>");
    }
    var b = D.leveling.zoneBrackets.list.filter(function (z) { return L >= z.from && L < z.to; })[0];
    if (b) chips.push('<span class="chip">Zones : <b>' + esc(b.zones.split(",").slice(0, 2).join(",")) + "</b></span>");
    $("#lvl-sum").innerHTML = chips.join("");
    measureBar();
  }

  function setLevel(l) {
    S.lvl = Math.max(1, Math.min(60, l | 0));
    S.wk = null;
    save("lvl", S.lvl);
    try { history.replaceState(null, "", "?niveau=" + S.lvl + location.hash); } catch (e) { /* page ouverte depuis le disque */ }
    renderLevelDependent();
  }
  function renderLevelDependent() {
    renderLevelBar();
    renderTalents();
    renderRotation();
    renderSpells();
    renderWalkthrough();
    renderGear();
    renderConsumables();
    refreshTooltips();
  }
  function refreshTooltips() {
    try { if (window.$WowheadPower && window.$WowheadPower.refreshLinks) window.$WowheadPower.refreshLinks(); } catch (e) { /* infobulles indisponibles */ }
  }

  function renderWho() {
    fetch(BASE + "../../characters/index.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (idx) {
        var mine = ((idx && idx.characters) || []).filter(function (c) { return String(c.classId || "").toLowerCase() === CLASS; });
        $("#who").innerHTML = mine.map(function (c) { return '<button type="button" data-who="' + c.level + '" title="Caler le curseur sur ce personnage">' + esc(c.name) + " · " + c.level + "</button>"; }).join("");
      })
      .catch(function () { /* hors ligne : pas de raccourci personnage */ });
  }

  /* ---------- Événements ---------- */
  function bind() {
    $("#lvl").addEventListener("input", function (e) { setLevel(+e.target.value); });
    $$(".lvl-ctl [data-step]").forEach(function (b) { b.addEventListener("click", function () { setLevel(S.lvl + (+b.getAttribute("data-step"))); }); });
    document.addEventListener("click", function (e) {
      var t = e.target.closest("button, a");
      if (!t) return;
      if (t.hasAttribute("data-tal")) { S.sel = t.getAttribute("data-tal"); $$(".tal.sel").forEach(function (x) { x.classList.remove("sel"); }); t.classList.add("sel"); renderTalentDetail(S.sel); refreshTooltips(); }
      else if (t.hasAttribute("data-lvl")) setLevel(+t.getAttribute("data-lvl"));
      else if (t.hasAttribute("data-who")) setLevel(+t.getAttribute("data-who"));
      else if (t.hasAttribute("data-tview")) { S.tview = t.getAttribute("data-tview"); save("tview", S.tview); pressed(t.parentNode, "data-tview", S.tview); renderTalents(); }
      else if (t.hasAttribute("data-prio")) { S.prio = t.getAttribute("data-prio"); save("prio", S.prio); pressed(t.parentNode, "data-prio", S.prio); renderSpells(); refreshTooltips(); }
      else if (t.hasAttribute("data-wtype")) { S.wtype = t.getAttribute("data-wtype"); save("wtype", S.wtype); pressed(t.parentNode, "data-wtype", S.wtype); renderGear(); refreshTooltips(); }
      else if (t.hasAttribute("data-use")) { S.use = t.getAttribute("data-use"); save("use", S.use); pressed(t.parentNode, "data-use", S.use); renderPets(); refreshTooltips(); }
      else if (t.hasAttribute("data-wk")) { S.wk = +t.getAttribute("data-wk"); renderWalkthrough(); refreshTooltips(); }
      else if (t.hasAttribute("data-fac")) { S.race = t.getAttribute("data-fac"); save("race", S.race); renderRaces(); }
      else if (t.hasAttribute("data-copy")) copyText(t.getAttribute("data-copy"), t);
    });
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest && e.target.closest("[data-tal]");
      if (t && matchMedia("(hover: hover)").matches) renderTalentDetail(t.getAttribute("data-tal"));
    });
    $("#sp-ranks").addEventListener("change", function (e) { S.ranks = e.target.checked; save("ranks", S.ranks); renderSpells(); refreshTooltips(); });
    $("#w-fac").addEventListener("change", function (e) { S.fac = e.target.value; save("fac", S.fac); renderGear(); refreshTooltips(); });

    /* Sommaire : section visible en surbrillance. */
    if ("IntersectionObserver" in window) {
      var links = $$("#toc a");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id); });
        });
      }, { rootMargin: "-90px 0px -65% 0px" });
      $$(".g-sec").forEach(function (s) { io.observe(s); });
    }
  }

  function restore() {
    var q = new URLSearchParams(location.search).get("niveau");
    S.lvl = q ? Math.max(1, Math.min(60, +q || 10)) : load("lvl", 10);
    S.tview = load("tview", "level");
    S.prio = load("prio", "all");
    S.ranks = load("ranks", true);
    S.wtype = load("wtype", "all");
    S.fac = load("fac", "all");
    S.use = load("use", "all");
    S.race = load("race", "alliance");
    pressed(document, "data-tview", S.tview);
    pressed(document, "data-prio", S.prio);
    pressed(document, "data-wtype", S.wtype);
    pressed(document, "data-use", S.use);
    $("#sp-ranks").checked = S.ranks;
    $("#w-fac").value = S.fac;
  }

  function start() {
    indexTalents();
    indexItems();
    restore();
    renderHero();
    renderOverview();
    renderPets();
    renderProfessions();
    renderRaces();
    renderTips();
    renderSources();
    renderLevelDependent();
    renderWho();
    bind();
    window.addEventListener("resize", measureBar);
    if (location.hash) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
  }

  Promise.all(FILES.map(function (f) {
    return fetch(BASE + f + ".json").then(function (r) { if (!r.ok) throw new Error(f + ".json : HTTP " + r.status); return r.json(); }).then(function (j) { D[f] = j; });
  })).then(start).catch(function (e) {
    var box = $("#load-error");
    box.hidden = false;
    box.innerHTML = "Impossible de charger les données du guide (" + esc(e.message) + "). " +
      (location.protocol === "file:" ? "La page est ouverte depuis le disque : lance <code>npm run serve</code> puis ouvre <code>http://localhost:8000/classes/" + esc(CLASS) + "/</code>, ou utilise le site en ligne." : "Recharge la page.");
    $("#h-summary").textContent = "";
  });
})();
