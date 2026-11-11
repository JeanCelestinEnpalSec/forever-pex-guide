# Journal des modifications

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). L'addon suit [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- Guide de classe piloté par les données : `docs/data/classes/hunter/*.json` (talents, sorts, équipement, métiers, progression, familiers, méta) et page `docs/classes/hunter/` rendue par `docs/assets/js/class-guide.js`.
- Talents du chasseur relevés sur le calculateur Wowhead Forever (textes français officiels, rang 1 et rang max) ; chemin de pex de Feor (Mobalytics, 9 nov.).
- Curseur de niveau, arbres de talents interactifs, meilleure arme à ton niveau, sources avec code de fiabilité.
- `tools/validate-classes.js` (sources déclarées, paliers et prérequis du chemin de talents) branché sur `npm run validate`.
- Accueil refait, README avec bannière, `docs/data/README.md` (modèle de données, ajouter une classe), `tools/README.md`.

### Corrigé
- Macro Œil d’aigle du carnet : Wowhead FR (donc le client) écrit « Oeil d'aigle » avec une apostrophe droite ; l’ancienne orthographe ne correspondait pas au nom du sort.

### Modifié
- CI : luacheck passe par l'action officielle `lunarmodules/luacheck@v1` (le premier passage avait échoué sur une panne DNS des miroirs apt d'Ubuntu, pas sur le code).
- CI et release : actions GitHub en v6 (Node 24), plus d'avertissement de dépréciation Node 20.

## [0.1.0] — 2026-11-11

### Ajouté
- Addon **Pex Guide Export** 0.1.0 (TOC 16001) : export de la fiche dans `PexGuideExportDB`, commande `/pge`, photo automatique hors combat, lecture de l'étape RestedXP.
- Lecteur SavedVariables `docs/assets/js/sv-parser.js` (navigateur + Node) et conversion `tools/sv2json.js`.
- Site : accueil, page Fiches perso avec import local, carnet du chasseur nain.
- Outils Windows : `tools/install-addon.ps1`, `tools/sync-character.ps1`.
- CI : tests Node, test de fumée Lua 5.1, luacheck, validation des fiches ; release automatique de l'addon sur tag `addon-v*`.
