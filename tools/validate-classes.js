#!/usr/bin/env node
/* Vérifie les données de classe dans docs/data/classes : JSON valide, sources déclarées,
   arbres de talents cohérents et chemin de pex légal (paliers, prérequis, rangs). */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "docs", "data", "classes");
const errors = [];
const warn = [];
const FILES = ["meta", "talents", "spells", "gear", "professions", "leveling", "pets"];

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${path.relative(root, file)} : JSON invalide (${e.message})`);
    return null;
  }
}

/* Parcourt un objet et renvoie toutes les listes « src » rencontrées. */
function collectSrc(o, out = []) {
  if (Array.isArray(o)) o.forEach((x) => collectSrc(x, out));
  else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      if (/^(src|[a-z]+Src)$/.test(k) && Array.isArray(v)) out.push(...v);
      else collectSrc(v, out);
    }
  }
  return out;
}

function checkTalents(cls, t) {
  const where = `${cls}/talents.json`;
  const bySlug = new Map();
  for (const tree of t.trees || []) {
    const cells = new Set();
    for (const tal of tree.talents || []) {
      if (bySlug.has(tal.slug)) errors.push(`${where} : slug en double « ${tal.slug} »`);
      bySlug.set(tal.slug, Object.assign({ tree: tree.slug }, tal));
      const cell = `${tal.row}:${tal.col}`;
      if (cells.has(cell)) errors.push(`${where} : deux talents en ${tree.slug} ${cell}`);
      cells.add(cell);
      if (!(tal.row >= 1 && tal.row <= 7 && tal.col >= 1 && tal.col <= 4)) errors.push(`${where} : position hors grille pour ${tal.slug}`);
      if (!(tal.max >= 1 && tal.max <= 5)) errors.push(`${where} : rang max invalide pour ${tal.slug}`);
      if (!tal.fr || !tal.rmax) errors.push(`${where} : nom ou description manquant pour ${tal.slug}`);
      if (tal.max > 1 && !tal.r1) warn.push(`${where} : pas de texte rang 1 pour ${tal.slug}`);
    }
  }
  for (const tal of bySlug.values()) {
    if (tal.dep && !bySlug.has(tal.dep)) errors.push(`${where} : prérequis inconnu « ${tal.dep} » pour ${tal.slug}`);
  }
  for (const build of t.builds || []) {
    const p = build.path || [];
    if (p.length !== 51) errors.push(`${where} : le chemin ${build.id} fait ${p.length} points au lieu de 51 (niveaux 10 à 60)`);
    const ranks = {};
    const perTree = {};
    p.forEach((slug, i) => {
      const lvl = 10 + i;
      const tal = bySlug.get(slug);
      if (!tal) { errors.push(`${where} : ${build.id} niveau ${lvl}, talent inconnu « ${slug} »`); return; }
      const spent = perTree[tal.tree] || 0;
      const need = (tal.row - 1) * 5;
      if (spent < need) errors.push(`${where} : ${build.id} niveau ${lvl}, ${slug} demande ${need} points dans l’arbre (${spent} dépensés)`);
      if (tal.dep) {
        const dep = bySlug.get(tal.dep);
        if (dep && (ranks[tal.dep] || 0) < dep.max) errors.push(`${where} : ${build.id} niveau ${lvl}, ${slug} avant d’avoir ${tal.dep} au max`);
      }
      ranks[slug] = (ranks[slug] || 0) + 1;
      if (ranks[slug] > tal.max) errors.push(`${where} : ${build.id} niveau ${lvl}, ${slug} dépasse son rang max`);
      perTree[tal.tree] = spent + 1;
    });
  }
}

function checkSpells(cls, s) {
  let prev = 0;
  for (const sp of s.spells || []) {
    if (!(sp.lvl >= 1 && sp.lvl <= 60)) errors.push(`${cls}/spells.json : niveau invalide pour ${sp.fr}`);
    if (sp.lvl < prev) errors.push(`${cls}/spells.json : ${sp.fr} n’est pas dans l’ordre des niveaux`);
    prev = sp.lvl;
    if (!["E", "U", "O"].includes(sp.prio)) errors.push(`${cls}/spells.json : priorité invalide pour ${sp.fr}`);
  }
}

const index = read(path.join(root, "index.json"));
let count = 0;
for (const c of (index && index.classes) || []) {
  const dir = path.join(root, c.id);
  if (!fs.existsSync(dir)) { errors.push(`index.json : dossier ${c.id}/ manquant`); continue; }
  const data = {};
  for (const f of FILES) {
    const file = path.join(dir, `${f}.json`);
    if (!fs.existsSync(file)) { errors.push(`${c.id}/${f}.json manquant`); continue; }
    data[f] = read(file);
  }
  if (!data.meta) continue;
  const known = new Set(Object.keys(data.meta.sources || {}));
  for (const f of FILES) {
    if (!data[f]) continue;
    for (const k of collectSrc(data[f])) if (!known.has(k)) errors.push(`${c.id}/${f}.json : source « ${k} » non déclarée dans meta.json`);
  }
  for (const [k, s] of Object.entries(data.meta.sources || {})) {
    if (!data.meta.kinds || !data.meta.kinds[s.kind]) errors.push(`${c.id}/meta.json : source ${k} de type inconnu « ${s.kind} »`);
  }
  if (data.talents) checkTalents(c.id, data.talents);
  if (data.spells) checkSpells(c.id, data.spells);
  count++;
}

warn.forEach((w) => console.warn(`! ${w}`));
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${count} classe(s) valide(s) : sources déclarées, talents et chemin de pex cohérents`);
