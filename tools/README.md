# Outils

| Outil | Usage |
| --- | --- |
| `validate-data.js` | Vérifie les fiches de `docs/data/characters` (JSON, champs obligatoires, index). |
| `validate-classes.js` | Vérifie les données de classe : sources déclarées, grille des talents, chemin de pex légal (paliers, prérequis, rangs), ordre des sorts. |
| `sv2json.js` | Convertit `PexGuideExport.lua` (SavedVariables) en fiches JSON. `node tools/sv2json.js <fichier.lua> docs/data/characters` |
| `install-addon.ps1` | Windows : copie l’addon dans `_forever_\Interface\AddOns` (sauvegarde l’ancienne version avant). |
| `sync-character.ps1` | Windows : cherche `PexGuideExport.lua` dans `WTF\Account\*\SavedVariables`, le convertit et valide. |
| `test/` | Tests Node (`npm test`) du lecteur SavedVariables. |

Toutes les commandes passent par `npm` :

```bash
npm test
npm run validate      # validate-data + validate-classes
npm run serve         # http://localhost:8000
```
