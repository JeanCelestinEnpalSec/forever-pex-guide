/*
 * sv-parser.js — lit un fichier SavedVariables de World of Warcraft (Lua) et le convertit en objets JS.
 * Fonctionne dans le navigateur (window.PexSV) et dans Node (require).
 *
 *   PexSV.parse(texte)                 -> { NomGlobal: valeur, ... }
 *   PexSV.toCharacters(globals)        -> [ fiche normalisée, ... ]
 *   PexSV.slug(texte)                  -> identifiant ASCII (« Jeanpalsec-Royaume » -> « jeanpalsec-royaume »)
 *
 * Gère : commentaires --, chaînes "…" et '…' avec échappements (\n, \", \\, \ddd, \xHH, \z, \u{…},
 * barre oblique + retour à la ligne), chaînes longues [[…]] / [=[…]=], nombres (dont hexadécimaux),
 * true/false/nil, tables avec clés [expr] =, nom = ou positionnelles.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PexSV = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

  function ParseError(message, pos, src) {
    var line = src.slice(0, pos).split("\n").length;
    var err = new Error(message + " (ligne " + line + ")");
    err.name = "SavedVariablesParseError";
    err.position = pos;
    err.line = line;
    return err;
  }

  function Parser(src) {
    this.src = src;
    this.i = 0;
  }

  Parser.prototype.fail = function (msg) {
    throw ParseError(msg, this.i, this.src);
  };

  Parser.prototype.skip = function () {
    var s = this.src;
    for (;;) {
      var c = s.charCodeAt(this.i);
      if (c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12 || c === 0xfeff) {
        this.i++;
      } else if (c === 45 && s.charCodeAt(this.i + 1) === 45) {
        this.i += 2;
        var level = this.longBracketLevel();
        if (level >= 0) {
          this.readLongString(level);
        } else {
          var nl = s.indexOf("\n", this.i);
          this.i = nl === -1 ? s.length : nl + 1;
        }
      } else {
        return;
      }
    }
  };

  // Si on est sur [[ ou [=[ … renvoie le niveau (nombre de =), sinon -1. Ne consomme rien.
  Parser.prototype.longBracketLevel = function () {
    var s = this.src, j = this.i;
    if (s[j] !== "[") return -1;
    j++;
    var level = 0;
    while (s[j] === "=") { level++; j++; }
    return s[j] === "[" ? level : -1;
  };

  Parser.prototype.readLongString = function (level) {
    var s = this.src;
    this.i += level + 2;
    if (s[this.i] === "\r") this.i++;
    if (s[this.i] === "\n") this.i++;
    var close = "]" + "=".repeat(level) + "]";
    var end = s.indexOf(close, this.i);
    if (end === -1) this.fail("chaîne longue non fermée");
    var str = s.slice(this.i, end);
    this.i = end + close.length;
    return str;
  };

  Parser.prototype.readString = function () {
    var s = this.src, quote = s[this.i];
    this.i++;
    var out = "", bytes = [];
    var flush = function () {
      if (!bytes.length) return;
      out += decoder ? decoder.decode(new Uint8Array(bytes)) : String.fromCharCode.apply(null, bytes);
      bytes = [];
    };
    for (;;) {
      if (this.i >= s.length) this.fail("chaîne non fermée");
      var ch = s[this.i];
      if (ch === quote) { this.i++; break; }
      if (ch === "\n") this.fail("retour à la ligne dans une chaîne");
      if (ch !== "\\") { flush(); out += ch; this.i++; continue; }
      var e = s[this.i + 1];
      this.i += 2;
      var simple = { n: "\n", t: "\t", r: "\r", a: "\x07", b: "\b", f: "\f", v: "\v", "\\": "\\", '"': '"', "'": "'" };
      if (Object.prototype.hasOwnProperty.call(simple, e)) { flush(); out += simple[e]; continue; }
      if (e === "\n") { flush(); out += "\n"; if (s[this.i] === "\r") this.i++; continue; }
      if (e === "\r") { flush(); out += "\n"; if (s[this.i] === "\n") this.i++; continue; }
      if (e >= "0" && e <= "9") {
        var digits = e;
        while (digits.length < 3 && s[this.i] >= "0" && s[this.i] <= "9") { digits += s[this.i]; this.i++; }
        var code = parseInt(digits, 10);
        if (code > 255) this.fail("échappement décimal invalide");
        bytes.push(code);
        continue;
      }
      if (e === "x") {
        var hex = s.substr(this.i, 2);
        if (!/^[0-9a-fA-F]{2}$/.test(hex)) this.fail("échappement \\x invalide");
        bytes.push(parseInt(hex, 16));
        this.i += 2;
        continue;
      }
      if (e === "z") { flush(); while (/\s/.test(s[this.i] || "")) this.i++; continue; }
      if (e === "u" && s[this.i] === "{") {
        var endU = s.indexOf("}", this.i);
        flush();
        out += String.fromCodePoint(parseInt(s.slice(this.i + 1, endU), 16));
        this.i = endU + 1;
        continue;
      }
      this.fail("échappement inconnu \\" + e);
    }
    flush();
    return out;
  };

  Parser.prototype.readNumber = function () {
    var s = this.src.slice(this.i);
    var m = /^-?0[xX][0-9a-fA-F]+/.exec(s) || /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(s);
    if (!m) this.fail("nombre invalide");
    this.i += m[0].length;
    var txt = m[0];
    if (/0[xX]/.test(txt)) return (txt[0] === "-" ? -1 : 1) * parseInt(txt.replace(/^-/, ""), 16);
    return Number(txt);
  };

  Parser.prototype.readName = function () {
    var m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.src.slice(this.i));
    if (!m) return null;
    this.i += m[0].length;
    return m[0];
  };

  Parser.prototype.readValue = function () {
    this.skip();
    var s = this.src, ch = s[this.i];
    if (ch === '"' || ch === "'") return this.readString();
    if (ch === "{") return this.readTable();
    if (ch === "[") {
      var level = this.longBracketLevel();
      if (level >= 0) return this.readLongString(level);
    }
    if (ch === "-" || ch === "." || (ch >= "0" && ch <= "9")) {
      // nombres spéciaux écrits par certains clients : -nan, inf
      var rest = s.slice(this.i, this.i + 5);
      if (/^-?nan/.test(rest)) { this.i += rest[0] === "-" ? 4 : 3; return null; }
      if (/^-?inf/.test(rest)) { var neg = rest[0] === "-"; this.i += neg ? 4 : 3; return neg ? -Infinity : Infinity; }
      return this.readNumber();
    }
    var start = this.i;
    var name = this.readName();
    if (name === "true") return true;
    if (name === "false") return false;
    if (name === "nil") return null;
    if (name === "nan") return null;
    if (name === "inf") return Infinity;
    this.i = start;
    this.fail("valeur inattendue « " + s.slice(this.i, this.i + 20) + " »");
  };

  Parser.prototype.readTable = function () {
    var s = this.src;
    this.i++; // {
    var entries = [];
    var nextIndex = 1;
    for (;;) {
      this.skip();
      if (s[this.i] === "}") { this.i++; break; }
      var key, value;
      if (s[this.i] === "[" && this.longBracketLevel() < 0) {
        this.i++;
        key = this.readValue();
        this.skip();
        if (s[this.i] !== "]") this.fail("] attendu");
        this.i++;
        this.skip();
        if (s[this.i] !== "=") this.fail("= attendu");
        this.i++;
        value = this.readValue();
      } else {
        var save = this.i;
        var name = this.readName();
        this.skip();
        if (name && s[this.i] === "=" && s[this.i + 1] !== "=") {
          this.i++;
          key = name;
          value = this.readValue();
        } else {
          this.i = save;
          key = nextIndex++;
          value = this.readValue();
        }
      }
      if (value !== null && value !== undefined) entries.push([key, value]);
      this.skip();
      if (s[this.i] === "," || s[this.i] === ";") { this.i++; continue; }
      this.skip();
      if (s[this.i] === "}") { this.i++; break; }
      this.fail(", ou } attendu");
    }
    return toJS(entries);
  };

  // Tableau JS si les clés sont exactement 1..n, sinon objet.
  function toJS(entries) {
    var n = entries.length;
    if (n === 0) return [];
    var isArray = true;
    var seen = {};
    for (var k = 0; k < n; k++) {
      var key = entries[k][0];
      if (typeof key !== "number" || key % 1 !== 0 || key < 1 || key > n || seen[key]) { isArray = false; break; }
      seen[key] = true;
    }
    if (isArray) {
      var arr = new Array(n);
      for (var a = 0; a < n; a++) arr[entries[a][0] - 1] = entries[a][1];
      return arr;
    }
    var obj = {};
    for (var b = 0; b < n; b++) obj[String(entries[b][0])] = entries[b][1];
    return obj;
  }

  function parse(src) {
    if (typeof src !== "string") throw new TypeError("parse attend du texte");
    var p = new Parser(src);
    var globals = {};
    for (;;) {
      p.skip();
      if (p.i >= src.length) break;
      var name = p.readName();
      if (!name) p.fail("nom de variable attendu");
      p.skip();
      if (src[p.i] !== "=") p.fail("= attendu après " + name);
      p.i++;
      var value = p.readValue();
      if (value !== null) globals[name] = value;
    }
    return globals;
  }

  function slug(text) {
    return String(text || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // Les tables vides arrivent comme [] : on les remet à l'état d'objet ou de liste attendu.
  function asList(v) { return Array.isArray(v) ? v : (v && typeof v === "object" ? Object.keys(v).map(function (k) { return v[k]; }) : []); }
  function asObject(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : (Array.isArray(v) && v.length === 0 ? {} : v); }

  // Transforme PexGuideExportDB en fiches prêtes pour le site.
  function toCharacters(globals) {
    var db = globals && globals.PexGuideExportDB;
    if (!db || typeof db !== "object") throw new Error("PexGuideExportDB introuvable : est-ce bien le fichier PexGuideExport.lua ?");
    var chars = asObject(db.characters) || {};
    return Object.keys(chars).map(function (key) {
      var snap = chars[key];
      var c = asObject(snap.character) || {};
      var lists = ["equipment", "bags", "spells", "skills", "quests"];
      var out = {
        id: slug(key),
        key: key,
        schema: snap.schema,
        addonVersion: snap.addonVersion,
        exportedAt: snap.exportedAtUTC || (snap.exportedAt ? new Date(snap.exportedAt * 1000).toISOString() : null),
        reason: snap.reason,
        client: asObject(snap.client) || {},
        character: c,
        position: asObject(snap.position) || {},
        stats: asObject(snap.stats) || {},
        pet: snap.pet ? asObject(snap.pet) : null,
        talents: asObject(snap.talents) || { tabs: [] },
        restedXP: snap.restedXP ? asObject(snap.restedXP) : null,
      };
      lists.forEach(function (name) { out[name] = asList(snap[name]); });
      out.bags.forEach(function (b) { b.items = asList(b.items); });
      out.quests.forEach(function (q) { q.objectives = asList(q.objectives); });
      if (out.pet) { out.pet.abilities = asList(out.pet.abilities); out.pet.foodTypes = asList(out.pet.foodTypes); }
      out.talents.tabs = asList(out.talents.tabs);
      out.talents.tabs.forEach(function (t) { t.talents = asList(t.talents); });
      return out;
    });
  }

  function summary(ch) {
    var c = ch.character || {};
    return {
      id: ch.id, name: c.name, realm: c.realm, level: c.level, race: c.race, class: c.class, classId: c.classId,
      faction: c.faction, exportedAt: ch.exportedAt,
    };
  }

  return { parse: parse, toCharacters: toCharacters, summary: summary, slug: slug };
});
