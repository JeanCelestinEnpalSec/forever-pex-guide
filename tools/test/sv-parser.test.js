"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const PexSV = require("../../docs/assets/js/sv-parser.js");
const { convert } = require("../sv2json.js");

const FIXTURE = path.join(__dirname, "fixtures", "PexGuideExport.lua");

test("lit les valeurs simples", () => {
  const g = PexSV.parse(`A = 1\nB = -2.5\nC = 0x1F\nD = true\nE = false\nF = nil\nG = "texte"\nH = 1e3`);
  assert.deepEqual(g, { A: 1, B: -2.5, C: 31, D: true, E: false, G: "texte", H: 1000 });
});

test("gère les échappements des chaînes", () => {
  const g = PexSV.parse(String.raw`S = "a\"b\\c\nd\124e\195\169"` + "\nT = 'x\\\ny'");
  assert.equal(g.S, 'a"b\\c\nd|eé');
  assert.equal(g.T, "x\ny");
});

test("gère les chaînes longues et les commentaires", () => {
  const g = PexSV.parse("-- commentaire\nA = [[ligne 1\nligne 2]] --[[ bloc ]]\nB = [==[ ]] ]==]");
  assert.equal(g.A, "ligne 1\nligne 2");
  assert.equal(g.B, " ]] ");
});

test("convertit tables en listes ou objets", () => {
  const g = PexSV.parse(`T = { "a", "b", -- [2]\n ["x"] = { [1] = 1, [2] = 2 }, y = {}, [3] = "c" }`);
  assert.deepEqual(g.T, { 1: "a", 2: "b", 3: "c", x: [1, 2], y: [] });
  const h = PexSV.parse(`L = { "a", -- [1]\n "b", -- [2]\n}`);
  assert.deepEqual(h.L, ["a", "b"]);
});

test("garde les liens d'objets intacts", () => {
  const link = "|cff1eff00|Hitem:2509::::::::10:::::::|h[Tromblon orné]|h|r";
  const g = PexSV.parse(`L = "${link}"`);
  assert.equal(g.L, link);
});

test("signale une erreur avec la ligne", () => {
  assert.throws(() => PexSV.parse("A = {\n 1,\n 2 3 }"), /ligne 3/);
});

test("slug retire accents et espaces", () => {
  assert.equal(PexSV.slug("Jeanpalsec-Royaume Test"), "jeanpalsec-royaume-test");
  assert.equal(PexSV.slug("Élodie-Forgefer"), "elodie-forgefer");
});

test("lit le fichier produit par l'addon (fixture du test de fumée)", () => {
  const chars = PexSV.toCharacters(PexSV.parse(fs.readFileSync(FIXTURE, "utf8")));
  assert.equal(chars.length, 1);
  const ch = chars[0];
  assert.equal(ch.id, "jeanpalsec-royaume-test");
  assert.equal(ch.character.class, "Chasseur");
  assert.equal(ch.stats.attributes.agility.total, 31);
  assert.ok(ch.equipment.some((e) => e.slotKey === "RANGED" && e.itemID === 2509));
  assert.equal(ch.pet.name, "Pumba");
  assert.ok(Array.isArray(ch.pet.abilities) && ch.pet.abilities.length === 2);
  assert.equal(ch.talents.tabs[1].name, "Précision");
  assert.equal(ch.restedXP.step, 82);
  assert.ok(ch.quests[0].objectives.length >= 1);
});

test("sv2json écrit les fiches et l'index, avec sauvegarde de l'ancien fichier", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "pge-"));
  convert(FIXTURE, out);
  convert(FIXTURE, out);
  const index = JSON.parse(fs.readFileSync(path.join(out, "index.json"), "utf8"));
  assert.equal(index.characters.length, 1);
  assert.equal(index.characters[0].id, "jeanpalsec-royaume-test");
  assert.ok(fs.existsSync(path.join(out, "jeanpalsec-royaume-test.json")));
  assert.ok(fs.readdirSync(path.join(out, ".backup")).length >= 2);
});

test("refuse un fichier qui n'est pas celui de l'addon", () => {
  assert.throws(() => PexSV.toCharacters(PexSV.parse("RXPData = {}")), /PexGuideExportDB introuvable/);
});
