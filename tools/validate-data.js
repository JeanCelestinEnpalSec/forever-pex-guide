#!/usr/bin/env node
/* Vérifie les fiches publiées dans docs/data/characters : JSON valide, champs obligatoires, index cohérent. */
"use strict";

const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "docs", "data", "characters");
const errors = [];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json");

const ids = new Set();
for (const f of files) {
  let ch;
  try {
    ch = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  } catch (e) {
    errors.push(`${f} : JSON invalide (${e.message})`);
    continue;
  }
  if (!ch.id) errors.push(`${f} : champ « id » manquant`);
  else if (`${ch.id}.json` !== f) errors.push(`${f} : l'id « ${ch.id} » ne correspond pas au nom du fichier`);
  if (!ch.character || !ch.character.name) errors.push(`${f} : character.name manquant`);
  if (!ch.character || typeof ch.character.level !== "number") errors.push(`${f} : character.level manquant`);
  if (!Array.isArray(ch.equipment)) errors.push(`${f} : equipment doit être une liste`);
  ids.add(ch.id);
}

let index;
try {
  index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
} catch (e) {
  errors.push(`index.json : illisible (${e.message})`);
}
if (index) {
  for (const c of index.characters || []) {
    if (!ids.has(c.id)) errors.push(`index.json : « ${c.id} » n'a pas de fichier ${c.id}.json`);
  }
  const listed = new Set((index.characters || []).map((c) => c.id));
  for (const id of ids) if (!listed.has(id)) errors.push(`index.json : la fiche ${id}.json n'est pas listée`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${files.length} fiche(s) valide(s), index cohérent`);
