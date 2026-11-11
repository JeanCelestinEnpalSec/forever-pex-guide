# Contribuer

Trois personnes travaillent en parallèle, chacune sur son PC. Pour ne jamais s'écraser le travail :
**on ne pousse jamais directement sur `main`**. Chaque changement passe par une branche et une pull request (PR) relue par un autre membre.

## Le cycle de travail

1. **Mettre à jour** sa copie : *Fetch / Pull origin* (GitHub Desktop) ou `git pull`.
2. **Créer une branche** au nom explicite :
   - `carnet/chasseur-nain-talents-20-30` (contenu d'un carnet)
   - `addon/export-reputations` (addon)
   - `site/fiche-perso-mobile` (pages, CSS, scripts)
   - `donnees/jeanpalsec-niv-14` (fiches de personnages)
3. **Travailler**, faire des commits courts. Messages au format :
   `type(zone): ce qui change` — types : `carnet`, `addon`, `site`, `donnees`, `outils`, `docs`, `fix`.
   Exemple : `carnet(chasseur): talents 20-30 d'après Feor du 12 nov.`
4. **Pousser** la branche et **ouvrir une PR** vers `main`. Remplir la liste de vérification.
5. **Relecture** par un autre membre, CI verte, puis *Squash and merge*.
6. Le site se met à jour tout seul quelques minutes après la fusion.

Avec Claude : on peut lui demander de préparer la branche, les commits et la PR. La relecture reste humaine.

## Règles de contenu

- **Source et date sur chaque info.** Étiquettes utilisées dans les carnets : `officiel` (Blizzard), `jeu` (capture ou relevé en jeu), `guide` (auteur identifié : Method, Mobalytics…), `base de données` (Wowhead Forever…), `faible` (datamine, vendeur de services, page incohérente), `mon avis` (arbitrage personnel, signalé comme tel).
- **Prix et coordonnées** : publiés seulement s'ils sont vérifiés (jeu ou deux bases Forever concordantes). Sinon : « non vérifié ».
- **Cartes** : liens vers la vraie carte (Wowhead Forever, Guild Order), pas de cartes dessinées, pas d'images de cartes Blizzard copiées.
- **Désaccord entre sources** : on garde les deux, on dit lequel on suit et pourquoi.
- **Noms en jeu** : client français, noms anglais entre parenthèses quand les guides les utilisent. Les macros utilisent les noms français.

## Fichiers et sécurité

- On ne supprime rien : un fichier à retirer va dans `a-supprimer/` (ignoré par git) pour relecture.
- Avant de remplacer un fichier, on garde une copie (les scripts de `tools/` le font déjà).
- Ne jamais committer un `SavedVariables` brut ni un fichier de `WTF\` : seulement les JSON produits par `tools/sv2json.js`.

## L'addon

- Code : `addon/PexGuideExport/`. TOC `## Interface: 16001` (WoW Forever 1.60.1).
- Lecture seule : l'addon ne fait que lire et enregistrer, jamais en combat.
- Toute API est appelée via `call()` : une API absente ou modifiée dans Forever ne doit jamais casser l'export.
- Avant une PR : `python addon/tests/smoke_test.py` et `luacheck addon/PexGuideExport` (la CI les relance).
- Nouvelle version : augmenter `## Version` dans le `.toc`, noter le changement dans `CHANGELOG.md`, fusionner, puis créer le tag `addon-vX.Y.Z` : la release avec le zip est créée automatiquement.

## Fiches de personnages

- Format produit par `tools/sv2json.js` (voir `docs/assets/js/sv-parser.js`, fonction `toCharacters`).
- `npm run validate` vérifie les fichiers et `index.json`.
- Une fiche par personnage : `docs/data/characters/<nom>-<royaume>.json`.
