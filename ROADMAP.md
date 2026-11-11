# Feuille de route

## v0.1 — base (11 nov. 2026)

- [x] Dépôt structuré : site `docs/`, addon, outils, CI, modèles d'issues et de PR
- [x] Addon **Pex Guide Export** (export seul) : stats, équipement, sacs, familier, talents, sorts, métiers, quêtes, position, étape RestedXP
- [x] Lecteur SavedVariables (navigateur + Node) et conversion en fiches JSON, avec tests
- [x] Page **Fiches perso** : fiches publiées + import local du fichier de l'addon
- [x] Carnet du chasseur nain intégré au site
- [ ] Premier test de l'addon dans le vrai client Forever (vérifier talents, sorts, métiers, valeurs secrètes)
- [x] Mise en ligne GitHub Pages
- [ ] Invitation de l'équipe (collaborateurs GitHub)

## v0.2 — guides de classe pilotés par les données (11 nov. 2026)

- [x] Contenu séparé de l'affichage : `docs/data/classes/<classe>/*.json`, une page de rendu commune (`class-guide.js`)
- [x] Guide du chasseur : talents Wowhead (textes français rang 1 et rang max), chemin de Feor, sorts vérifiés, armes avec identifiants et DPS, métiers, familiers, races, macros
- [x] Curseur « mon niveau » : prochain talent, entraîneur, meilleure arme, zones, potions
- [x] Fiabilité affichée pour chaque section ; validation des données en CI (`tools/validate-classes.js`)
- [x] Accueil et README refaits
- [ ] Captures d'écran du site dans le README
- [ ] Guides des classes de l'équipe (classes et races à confirmer)
- [ ] Le guide lit la fiche exportée : sorts déjà appris, talents placés et métiers cochés automatiquement
- [ ] Recherche et filtres transverses (zone, métier, objet)

## v0.3 — automatisation

- [ ] Synchro en un clic depuis le PC (script ou petite appli) : SavedVariables → JSON → commit
- [ ] Historique de progression (niveau par jour, temps par palier)
- [ ] Vérification automatique des liens et des sources datées de plus de 30 jours

## Plus tard (à décider ensemble)

- [ ] Panneau guide dans le jeu (aujourd'hui RestedXP suffit)
- [ ] API Battle.net : seulement si Blizzard publie un espace de données « Forever » pour les profils de personnages
