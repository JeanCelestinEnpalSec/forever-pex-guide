# Journal des modifications

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). L'addon suit [SemVer](https://semver.org/lang/fr/).

## [Non publié]

## [0.1.0] — 2026-11-11

### Ajouté
- Addon **Pex Guide Export** 0.1.0 (TOC 16001) : export de la fiche dans `PexGuideExportDB`, commande `/pge`, photo automatique hors combat, lecture de l'étape RestedXP.
- Lecteur SavedVariables `docs/assets/js/sv-parser.js` (navigateur + Node) et conversion `tools/sv2json.js`.
- Site : accueil, page Fiches perso avec import local, carnet du chasseur nain.
- Outils Windows : `tools/install-addon.ps1`, `tools/sync-character.ps1`.
- CI : tests Node, test de fumée Lua 5.1, luacheck, validation des fiches ; release automatique de l'addon sur tag `addon-v*`.
