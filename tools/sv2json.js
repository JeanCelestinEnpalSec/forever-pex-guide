#!/usr/bin/env node
/*
 * Convertit le fichier SavedVariables de l'addon en fiches JSON pour le site.
 *
 *   node tools/sv2json.js <chemin\PexGuideExport.lua> [dossier de sortie]
 *
 * Dossier de sortie par défaut : docs/data/characters
 * Écrit <id>.json pour chaque personnage et met à jour index.json.
 * Un fichier existant est d'abord copié dans docs/data/characters/.backup/ (jamais supprimé).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const PexSV = require("../docs/assets/js/sv-parser.js");

function backup(file) {
  if (!fs.existsSync(file)) return;
  const dir = path.join(path.dirname(file), ".backup");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, path.join(dir, `${path.basename(file, ".json")}.${stamp}.json`));
}

function writeJSON(file, data) {
  backup(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function convert(svPath, outDir) {
  const text = fs.readFileSync(svPath, "utf8");
  const characters = PexSV.toCharacters(PexSV.parse(text));
  fs.mkdirSync(outDir, { recursive: true });

  const indexFile = path.join(outDir, "index.json");
  let index = { updatedAt: null, characters: [] };
  if (fs.existsSync(indexFile)) {
    try { index = JSON.parse(fs.readFileSync(indexFile, "utf8")); } catch (e) { /* index illisible : on le reconstruit */ }
  }
  const byId = new Map((index.characters || []).map((c) => [c.id, c]));

  for (const ch of characters) {
    writeJSON(path.join(outDir, `${ch.id}.json`), ch);
    byId.set(ch.id, PexSV.summary(ch));
    console.log(`fiche écrite : ${ch.id}.json (${ch.character.name}, niveau ${ch.character.level})`);
  }
  index.characters = [...byId.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"));
  index.updatedAt = new Date().toISOString();
  writeJSON(indexFile, index);
  return characters;
}

if (require.main === module) {
  const [svPath, outDir = path.join(__dirname, "..", "docs", "data", "characters")] = process.argv.slice(2);
  if (!svPath) {
    console.error("Usage : node tools/sv2json.js <PexGuideExport.lua> [dossier de sortie]");
    process.exit(2);
  }
  try {
    convert(svPath, outDir);
  } catch (err) {
    console.error(`Erreur : ${err.message}`);
    process.exit(1);
  }
}

module.exports = { convert };
