# Feuille de route

## v0.1 — base (11 nov. 2026)

- [x] Dépôt structuré : site `docs/`, addon, outils, CI, modèles d'issues et de PR
- [x] Addon **Pex Guide Export** (export seul) : stats, équipement, sacs, familier, talents, sorts, métiers, quêtes, position, étape RestedXP
- [x] Lecteur SavedVariables (navigateur + Node) et conversion en fiches JSON, avec tests
- [x] Page **Fiches perso** : fiches publiées + import local du fichier de l'addon
- [x] Carnet du chasseur nain intégré au site
- [ ] Premier test de l'addon dans le vrai client Forever (vérifier talents, sorts, métiers, valeurs secrètes)
- [ ] Mise en ligne GitHub Pages et invitation de l'équipe

## v0.2 — carnets pour toute l'équipe

- [ ] Un carnet par personnage de l'équipe (classes et races à confirmer)
- [ ] Séparer contenu et affichage : données de carnet en JSON (`docs/data/guides/<classe>.json`), une seule page modèle pour toutes les classes
- [ ] Le carnet lit la fiche exportée : niveau, sorts appris, talents placés et métiers cochés automatiquement
- [ ] Recherche et filtres (niveau, zone, métier)

## v0.3 — automatisation

- [ ] Synchro en un clic depuis le PC (script ou petite appli) : SavedVariables → JSON → commit
- [ ] Historique de progression (niveau par jour, temps par palier)
- [ ] Vérification automatique des liens et des sources datées de plus de 30 jours

## Plus tard (à décider ensemble)

- [ ] Panneau guide dans le jeu (aujourd'hui RestedXP suffit)
- [ ] API Battle.net : seulement si Blizzard publie un espace de données « Forever » pour les profils de personnages
