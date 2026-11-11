# Pex Guide Export (addon WoW Forever)

Enregistre la fiche de ton personnage pour le site Forever Pex Guide. L'addon ne fait que **lire et enregistrer** : il n'agit jamais sur le jeu et ne fait rien pendant un combat.

## Installation

Copier le dossier `PexGuideExport` dans `World of Warcraft\_forever_\Interface\AddOns\`, ou lancer `tools\install-addon.ps1` depuis la racine du dépôt. Puis `/reload` en jeu.

## Utilisation

| Commande | Effet |
| --- | --- |
| `/pge` | Photo immédiate de la fiche |
| `/pge status` | Date et motif de la dernière photo |
| `/pge reset` | Efface la photo de ce personnage |

Une photo est aussi prise automatiquement (2 s après le dernier événement) à : entrée en jeu, montée de niveau, changement d'équipement, de métier, de talents, de familier, de quête, d'argent, nouveau sort, fin de combat, déconnexion.

Le jeu n'écrit le fichier sur le disque qu'au **/reload** ou à la **déconnexion** :
`World of Warcraft\_forever_\WTF\Account\<COMPTE>\SavedVariables\PexGuideExport.lua`

## Ce qui est exporté

`character` (nom, royaume, niveau, race, classe, faction, XP, XP reposée, argent, guilde), `position` (zone, sous-zone, coordonnées), `stats`, `equipment` (lien, ID, qualité, durabilité, munitions), `bags` (contenu regroupé par objet), `pet` (famille, niveau, bonheur, loyauté, techniques, régime), `talents`, `spells`, `skills`, `quests` (objectifs), `restedXP` (guide et étape en cours si RestedXP est installé), `client` (version, build, langue).

Rien sur le compte Battle.net, aucun identifiant, aucun GUID.

## Robustesse

- Chaque appel d'API passe par `call()` (pcall) : une API absente ou différente dans Forever donne une valeur vide, pas une erreur Lua.
- Chaque section passe par `safe()` : si une section échoue, elle contient `{ error = "…" }` et les autres sont exportées quand même.
- Les « valeurs secrètes » (restrictions façon Midnight annoncées pour Forever) sont détectées avec `issecretvalue` et ignorées.

## Tests

```bash
pip install lupa==2.8
python addon/tests/smoke_test.py      # deux variantes d'API (globales Classic / espaces C_*)
luacheck addon/PexGuideExport
```

Le test de fumée vérifie aussi qu'aucune photo n'est prise en combat et qu'une valeur secrète n'est pas exportée.
