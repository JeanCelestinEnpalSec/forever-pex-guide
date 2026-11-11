# Données du site

Le site ne contient presque aucun texte en dur : tout vient des fichiers JSON de ce dossier. La CI (`npm run validate`) refuse une modification qui casse leur cohérence.

```
docs/data/
├── classes/
│   ├── index.json            Liste des guides de classe affichés sur l’accueil
│   └── hunter/               Un dossier par classe (identifiant anglais en minuscules)
│       ├── meta.json         Résumé, forces/faiblesses, races, astuces, macros, registre des sources
│       ├── talents.json      Arbres de talents et chemin de pex
│       ├── spells.json       Sorts par niveau d’apprentissage
│       ├── gear.json         Priorité des stats, armes, pièces clés, munitions, carquois, consommables
│       ├── professions.json  Métiers conseillés, camp, plan de montée, maîtres de métier
│       ├── leveling.json     Rotation, progression par tranche, zones, donjons
│       └── pets.json         Conseils et familles de familiers (classes à familier)
└── characters/               Fiches exportées par l’addon (voir tools/sv2json.js)
```

## Sources et fiabilité

Chaque fichier (et chaque bloc qui le mérite) porte une liste `src`, par exemple `"src": ["wowhead", "moba"]`. Les clés renvoient au registre `sources` de `meta.json` :

```json
"moba": { "fr": "Mobalytics : Hunter Leveling Guide, par Feor", "kind": "guide", "url": "https://…", "date": "2026-11-09" }
```

`kind` fixe la couleur de fiabilité affichée sur le site :

| kind | Sens | Exemples |
| --- | --- | --- |
| `officiel` | Blizzard | annonces, notes de patch, forums bleus |
| `jeu` | lu dans le client | captures, relevés en jeu |
| `base` | base de données extraite du client | Wowhead Forever |
| `guide` | avis d’un auteur identifié | Mobalytics, Method, Warcraft Tavern |
| `equipe` | notes de l’équipe | carnet de personnage |
| `faible` | à recouper | datamine, forum anonyme, site commercial |

Une source non déclarée dans `meta.json` fait échouer la validation.

## Récupérer des données fiables sur Wowhead Forever

- **Talents** : calculateur `https://www.wowhead.com/forever/talent-calc/<classe>`. Chaque case donne l’identifiant de sort ; l’infobulle `https://nether.wowhead.com/forever/tooltip/spell/<id>?locale=2&rank=<n>` renvoie le texte français du rang voulu (`locale=0` pour l’anglais). Garde le paramètre `def` de la page, sinon Wowhead peut renvoyer une autre version des données.
- **Sorts** : même infobulle ; « Niveau X requis » donne le niveau d’apprentissage.
- **Objets** : `https://www.wowhead.com/forever/item=<id>` ; DPS, niveau requis, qualité et icône sont dans l’infobulle.
- **Noms français** : copie-les à l’identique (même apostrophe, `Oeil` et non `Œil`) : une macro avec un nom différent ne fait rien dans le jeu.

## Ajouter une classe

1. Ouvre une issue « Nouveau carnet » pour prévenir l’équipe, puis une branche `classe/<id>`.
2. Copie `classes/hunter/` vers `classes/<id>/` (par exemple `warrior`) et remplace le contenu fichier par fichier. `pets.json` peut garder `"families": []` pour une classe sans familier.
3. Copie `docs/classes/hunter/index.html` vers `docs/classes/<id>/index.html` et change `data-class`, `data-base`, le titre et l’icône de classe.
4. Ajoute la classe dans `classes/index.json`.
5. `npm run validate` puis `npm run serve` et vérifie la page à plusieurs niveaux.

### Règles du chemin de talents (vérifiées par la CI)

- `builds[].path` contient exactement 51 identifiants : le point du niveau 10, puis 11, … jusqu’au 60.
- Un talent de la ligne *n* demande `(n − 1) × 5` points déjà dépensés dans son arbre.
- Un talent avec `dep` demande ce prérequis au rang maximum.
- Aucun talent ne dépasse son `max`.
