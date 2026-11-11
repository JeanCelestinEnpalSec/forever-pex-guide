/* character-view.js — affiche une fiche exportée par l'addon Pex Guide Export.
   Utilisé par docs/perso/index.html. Aucune dépendance. */
(function (root) {
  "use strict";

  var SLOT_LABELS = {
    AMMO: "Munitions", HEAD: "Tête", NECK: "Cou", SHOULDER: "Épaules", SHIRT: "Chemise", CHEST: "Torse",
    WAIST: "Taille", LEGS: "Jambes", FEET: "Pieds", WRIST: "Poignets", HANDS: "Mains", FINGER1: "Doigt 1",
    FINGER2: "Doigt 2", TRINKET1: "Bijou 1", TRINKET2: "Bijou 2", BACK: "Dos", MAINHAND: "Main droite",
    OFFHAND: "Main gauche", RANGED: "À distance", TABARD: "Tabard",
  };
  var SLOT_ORDER = ["RANGED", "AMMO", "MAINHAND", "OFFHAND", "HEAD", "NECK", "SHOULDER", "BACK", "CHEST", "WRIST", "HANDS", "WAIST", "LEGS", "FEET", "FINGER1", "FINGER2", "TRINKET1", "TRINKET2", "SHIRT", "TABARD"];
  var ATTR = [["strength", "Force"], ["agility", "Agilité"], ["stamina", "Endurance"], ["intellect", "Intelligence"], ["spirit", "Esprit"]];
  var HAPPINESS = { 1: "Mécontent", 2: "Content", 3: "Heureux" };
  var WH = "https://www.wowhead.com/forever/";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function num(v, digits) {
    if (typeof v !== "number" || !isFinite(v)) return "—";
    return v.toLocaleString("fr-FR", { maximumFractionDigits: digits == null ? 1 : digits });
  }
  function pct(v) { return typeof v === "number" ? num(v, 1) + " %" : "—"; }
  function coin(copper) {
    if (typeof copper !== "number") return "—";
    var g = Math.floor(copper / 10000), s = Math.floor((copper % 10000) / 100), c = copper % 100;
    var h = '<span class="coin">';
    if (g) h += g + '<i class="g" title="or"></i> ';
    if (g || s) h += s + '<i class="s" title="argent"></i> ';
    h += c + '<i class="c" title="cuivre"></i></span>';
    return h;
  }
  function when(iso) {
    if (!iso) return "date inconnue";
    var d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
  }
  function itemLink(e) {
    var cls = typeof e.quality === "number" ? "q" + e.quality : "q1";
    var name = esc(e.name || ("Objet " + (e.itemID || "?")));
    if (!e.itemID) return '<span class="' + cls + '">' + name + "</span>";
    return '<a class="' + cls + '" href="' + WH + "item=" + e.itemID + '" target="_blank" rel="noopener">' + name + "</a>";
  }
  function errorNote(section, label) {
    return section && section.error ? '<p class="note bad small">' + label + " : l'addon n'a pas pu lire cette partie (" + esc(section.error) + ").</p>" : "";
  }

  function header(ch) {
    var c = ch.character || {};
    var xpPct = c.xpMax ? Math.min(100, (c.xp / c.xpMax) * 100) : 0;
    var restPct = c.xpMax && c.rested ? Math.min(100 - xpPct, (c.rested / c.xpMax) * 100) : 0;
    var rxp = ch.restedXP && !ch.restedXP.error ? ch.restedXP : null;
    var pos = ch.position || {};
    return (
      '<div class="panel key">' +
      '<span class="eyebrow">Exporté le ' + when(ch.exportedAt) + (ch.source === "manuel" ? " · relevé manuel" : " · addon " + esc(ch.addonVersion || "")) + "</span>" +
      "<h2>" + esc(c.name || "?") + ", " + esc((c.race || "") + " " + (c.class || "")).trim() + " niveau " + esc(c.level || "?") + "</h2>" +
      '<p class="muted">' + esc([c.realm, c.factionLabel || c.faction, c.guild].filter(Boolean).join(" · ")) + "</p>" +
      '<div class="stack small">' +
      '<div class="row" style="justify-content:space-between"><span>' + (c.xpMax ? "Expérience " + num(c.xp, 0) + " / " + num(c.xpMax, 0) + (c.rested ? " · reposée " + num(c.rested, 0) : "") : "Expérience non relevée") + "</span><span>" + coin(c.money) + "</span></div>" +
      (c.xpMax ? '<div class="bar" role="img" aria-label="Barre d\'expérience"><span style="width:' + xpPct.toFixed(1) + '%"></span></div>' : "") +
      (restPct ? '<div class="bar rest" role="img" aria-label="XP reposée"><span style="width:' + restPct.toFixed(1) + '%"></span></div>' : "") +
      "</div>" +
      '<div class="chips">' +
      (pos.zone ? '<span class="chip">Position : <b>' + esc(pos.zone) + (pos.subzone ? " · " + esc(pos.subzone) : "") + "</b>" + (pos.x != null ? ' <span class="mono">' + num(pos.x, 1) + ", " + num(pos.y, 1) + "</span>" : "") + "</span>" : "") +
      (rxp && rxp.guide ? '<span class="chip">RestedXP : <b>' + esc(rxp.guide) + "</b>, étape " + esc(rxp.step) + "</span>" : "") +
      "</div></div>"
    );
  }

  function stats(ch) {
    var s = ch.stats || {};
    var a = s.attributes || {};
    var rows = ATTR.map(function (p) {
      var v = a[p[0]] || {};
      var bonus = (v.bonus || 0) - (v.malus || 0);
      return "<tr><td>" + p[1] + '</td><td class="num">' + num(v.total, 0) + (bonus ? ' <span class="muted">(' + (bonus > 0 ? "+" : "") + bonus + ")</span>" : "") + "</td></tr>";
    }).join("");
    var rap = s.rangedAttackPower || {}, map = s.meleeAttackPower || {};
    var rd = s.rangedDamage || {}, md = s.meleeDamage || {};
    function ap(v) { var t = (v.base || 0) + (v.bonus || 0) - (v.malus || 0); return num(t, 0) + (v.bonus ? ' <span class="muted">(' + num(v.base, 0) + " + " + num(v.bonus, 0) + ")</span>" : ""); }
    rows +=
      '<tr><td>Vie · Mana</td><td class="num">' + num(s.health, 0) + " · " + num(s.mana, 0) + "</td></tr>" +
      '<tr><td>Puissance d’attaque à distance</td><td class="num">' + ap(rap) + "</td></tr>" +
      '<tr><td>Puissance d’attaque en mêlée</td><td class="num">' + ap(map) + "</td></tr>" +
      '<tr><td>Dégâts à distance</td><td class="num">' + num(rd.min, 0) + "–" + num(rd.max, 0) + (rd.speed ? ' <span class="muted">vitesse ' + num(rd.speed, 2) + "</span>" : "") + "</td></tr>" +
      '<tr><td>Dégâts en mêlée</td><td class="num">' + num(md.min, 0) + "–" + num(md.max, 0) + "</td></tr>" +
      '<tr><td>Critique distance · mêlée</td><td class="num">' + pct(s.rangedCrit) + " · " + pct(s.crit) + "</td></tr>" +
      '<tr><td>Toucher · Hâte à distance</td><td class="num">' + pct(s.hit) + " · " + pct(s.rangedHaste) + "</td></tr>" +
      '<tr><td>Armure · Esquive · Parade</td><td class="num">' + num(s.armor, 0) + " · " + pct(s.dodge) + " · " + pct(s.parry) + "</td></tr>" +
      (s.defense ? '<tr><td>Défense</td><td class="num">' + num((s.defense.base || 0) + (s.defense.bonus || 0), 0) + "</td></tr>" : "");
    return '<div class="panel"><h3>Caractéristiques</h3>' + errorNote(s, "Caractéristiques") + '<div class="tw"><table><tbody>' + rows + "</tbody></table></div></div>";
  }

  function pet(ch) {
    var p = ch.pet;
    if (!p) return '<div class="panel"><h3>Familier</h3><p class="muted small">Pas de familier actif au moment de l’export.</p></div>';
    if (p.error) return '<div class="panel"><h3>Familier</h3>' + errorNote(p, "Familier") + "</div>";
    var abil = (p.abilities || []).map(function (x) {
      return '<span class="chip">' + esc(x.name) + (x.rank ? " " + esc(x.rank) : "") + (x.autocast ? ' <span class="muted">auto</span>' : "") + "</span>";
    }).join("");
    return (
      '<div class="panel"><h3>' + esc(p.name || "Familier") + ' <span class="tag t-pet">' + esc(p.family || "") + "</span></h3>" +
      '<dl class="kv"><dt>Niveau</dt><dd>' + esc(p.level) + (p.xpMax ? ' <span class="muted">(XP ' + num(p.xp, 0) + " / " + num(p.xpMax, 0) + ")</span>" : "") + "</dd>" +
      "<dt>Bonheur</dt><dd>" + esc(HAPPINESS[p.happiness] || p.happiness || "—") + "</dd>" +
      "<dt>Loyauté</dt><dd>" + esc(p.loyalty == null ? "—" : p.loyalty) + "</dd>" +
      "<dt>Vie · Armure</dt><dd>" + num(p.health, 0) + " · " + num(p.armor, 0) + "</dd>" +
      "<dt>Dégâts</dt><dd>" + (p.damage ? num(p.damage.min, 0) + "–" + num(p.damage.max, 0) : "—") + "</dd>" +
      (p.trainingPoints != null ? "<dt>Points de dressage</dt><dd>" + esc(p.trainingPoints) + "</dd>" : "") +
      (p.foodTypes && p.foodTypes.length ? "<dt>Régime</dt><dd>" + esc(p.foodTypes.join(", ")) + "</dd>" : "") +
      "</dl>" + (abil ? '<div class="chips">' + abil + "</div>" : "") + "</div>"
    );
  }

  function equipment(ch) {
    var list = Array.isArray(ch.equipment) ? ch.equipment.slice() : [];
    var bySlot = {};
    list.forEach(function (e) { bySlot[e.slotKey] = e; });
    var rows = SLOT_ORDER.filter(function (k) { return bySlot[k]; }).map(function (k) {
      var e = bySlot[k];
      var dur = e.durability ? num(e.durability[0], 0) + " / " + num(e.durability[1], 0) : "";
      var low = e.durability && e.durability[1] && e.durability[0] / e.durability[1] < 0.5;
      return "<tr><td>" + esc(SLOT_LABELS[k] || k) + "</td><td>" + itemLink(e) + (e.count ? ' <span class="muted">×' + num(e.count, 0) + "</span>" : "") +
        "</td><td class=\"small muted\">" + esc([e.subType, e.itemLevel ? "niv. objet " + e.itemLevel : null].filter(Boolean).join(" · ")) +
        '</td><td class="num small' + (low ? " t-warn" : "") + '">' + dur + "</td></tr>";
    }).join("");
    var empty = SLOT_ORDER.filter(function (k) { return !bySlot[k] && k !== "SHIRT" && k !== "TABARD"; }).map(function (k) { return SLOT_LABELS[k]; });
    return '<div class="stack"><h3>Équipement</h3>' + errorNote(ch.equipment, "Équipement") +
      '<div class="tw"><table><thead><tr><th>Emplacement</th><th>Objet</th><th>Type</th><th class="num">Durabilité</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      (empty.length ? '<p class="small muted">Emplacements vides : ' + esc(empty.join(", ")) + ".</p>" : "") + "</div>";
  }

  function talents(ch) {
    var t = ch.talents || {};
    if (t.error) return '<div class="panel"><h3>Talents</h3>' + errorNote(t, "Talents") + "</div>";
    var tabs = (t.tabs || []).map(function (tab) {
      var taken = (tab.talents || []).filter(function (x) { return x.rank > 0; }).map(function (x) {
        return '<span class="chip">' + esc(x.name) + " <b>" + x.rank + "/" + x.maxRank + "</b></span>";
      }).join("");
      return "<div><p><b>" + esc(tab.name) + '</b> <span class="mono muted">' + esc(tab.pointsSpent == null ? "" : tab.pointsSpent + " pts") + "</span></p>" +
        (taken ? '<div class="chips">' + taken + "</div>" : '<p class="small muted">Aucun point.</p>') + "</div>";
    }).join("");
    return '<div class="panel"><h3>Talents' + (t.unspent ? ' <span class="tag t-warn">' + t.unspent + " à placer</span>" : "") + "</h3>" + (tabs || '<p class="small muted">Aucune donnée de talents.</p>') + "</div>";
  }

  function skills(ch) {
    var list = Array.isArray(ch.skills) ? ch.skills : [];
    var html = "", group = null;
    list.forEach(function (s) {
      if (s.header) { group = s.name; html += '<tr><th colspan="2">' + esc(s.name) + "</th></tr>"; return; }
      var bar = s.max ? Math.min(100, (s.rank / s.max) * 100) : 0;
      html += "<tr><td>" + esc(s.name) + '</td><td class="num"><span class="mono">' + num(s.rank, 0) + (s.max ? " / " + num(s.max, 0) : "") + "</span>" +
        (s.max ? '<div class="bar" style="margin-top:4px"><span style="width:' + bar.toFixed(0) + '%"></span></div>' : "") + "</td></tr>";
    });
    return '<div class="panel"><h3>Compétences et métiers</h3>' + errorNote(ch.skills, "Compétences") + (html ? '<div class="tw"><table><tbody>' + html + "</tbody></table></div>" : '<p class="small muted">Aucune donnée.</p>') + "</div>";
  }

  function spells(ch) {
    var list = Array.isArray(ch.spells) ? ch.spells : [];
    var byTab = {};
    list.forEach(function (s) { (byTab[s.tab || "Autres"] = byTab[s.tab || "Autres"] || []).push(s); });
    var html = Object.keys(byTab).map(function (tab) {
      return "<div><p><b>" + esc(tab) + '</b></p><div class="chips">' + byTab[tab].map(function (s) {
        var label = esc(s.name) + (s.rank && /\d/.test(s.rank) ? ' <span class="muted">' + esc(s.rank) + "</span>" : "");
        return s.spellID ? '<a class="chip" href="' + WH + "spell=" + s.spellID + '" target="_blank" rel="noopener">' + label + "</a>" : '<span class="chip">' + label + "</span>";
      }).join("") + "</div></div>";
    }).join("");
    return '<div class="panel"><h3>Sorts connus</h3>' + errorNote(ch.spells, "Sorts") + (html || '<p class="small muted">Aucune donnée.</p>') + "</div>";
  }

  function quests(ch) {
    var list = Array.isArray(ch.quests) ? ch.quests : [];
    var html = list.map(function (q) {
      var obj = (q.objectives || []).map(function (o) { return '<li class="' + (o.done ? "muted" : "") + '">' + esc(o.text) + (o.done ? " ✓" : "") + "</li>"; }).join("");
      var title = q.id ? '<a href="' + WH + "quest=" + q.id + '" target="_blank" rel="noopener">' + esc(q.title) + "</a>" : esc(q.title);
      return "<li><b>" + title + "</b>" + (q.level ? ' <span class="mono muted">[' + esc(q.level) + "]</span>" : "") + (q.complete ? ' <span class="tag t-ok">terminée</span>' : "") +
        (obj ? '<ul class="small">' + obj + "</ul>" : "") + "</li>";
    }).join("");
    return '<div class="panel"><h3>Journal de quêtes <span class="mono muted">' + list.length + "</span></h3>" + errorNote(ch.quests, "Quêtes") +
      (html ? '<ul class="stack" style="margin:0;padding-left:1.1em">' + html + "</ul>" : '<p class="small muted">Journal vide.</p>') + "</div>";
  }

  function bags(ch) {
    var list = Array.isArray(ch.bags) ? ch.bags : [];
    if (!list.length) return "";
    var all = {};
    list.forEach(function (b) { (b.items || []).forEach(function (it) {
      var k = it.itemID;
      if (!all[k]) all[k] = { itemID: it.itemID, name: it.name, count: 0 };
      all[k].count += it.count || 0;
    }); });
    var items = Object.keys(all).map(function (k) { return all[k]; }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name), "fr"); });
    var used = list.reduce(function (n, b) { return n + (b.used || 0); }, 0), total = list.reduce(function (n, b) { return n + (b.slots || 0); }, 0);
    return '<div class="panel"><h3>Sacs <span class="mono muted">' + used + " / " + total + " cases</span></h3>" +
      '<p class="small muted">' + esc(list.filter(function (b) { return b.name; }).map(function (b) { return b.name + " (" + b.slots + ")"; }).join(" · ")) + "</p>" +
      '<div class="chips">' + items.map(function (it) {
        return '<a class="chip" href="' + WH + "item=" + it.itemID + '" target="_blank" rel="noopener">' + esc(it.name) + " <b>×" + it.count + "</b></a>";
      }).join("") + "</div></div>";
  }

  function render(ch, el) {
    el.innerHTML =
      header(ch) +
      '<div class="grid">' + stats(ch) + pet(ch) + "</div>" +
      equipment(ch) +
      '<div class="grid">' + talents(ch) + skills(ch) + "</div>" +
      '<div class="grid">' + quests(ch) + bags(ch) + "</div>" +
      spells(ch);
  }

  root.PexCharacterView = { render: render, coin: coin, when: when };
})(typeof self !== "undefined" ? self : this);
