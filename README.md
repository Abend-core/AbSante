# AbSante

> Un projet de l'équipe **Abend** ([organisation GitHub Abend-core](https://github.com/Abend-core)).

Carte interactive de la densité et de la répartition des professionnels de santé en
France, à partir du [RPPS](https://esante.gouv.fr/produits-services/repertoire-rpps)
(Répertoire Partagé des Professionnels de Santé, data.gouv.fr).

L'application permet de :
- **rechercher un spécialiste par ville** (recherche de commune, filtre par profession) ;
- **visualiser la densité** de professionnels de santé par département (carte
  choroplèthe) ;
- **voir la répartition** des établissements et de leurs praticiens (nom, prénom,
  profession), géocodés à leur vraie adresse.

## Stack

- **Front** (`front/`) : Vue 3 + TypeScript + Vite, carte [Leaflet](https://leafletjs.com/),
  Vitest pour les tests, ESLint pour le lint.
- **API** (`api/`) : [Fastify](https://fastify.dev/) + TypeScript, lit une base **PostgreSQL**
  alimentée par le RPPS. Sert la fiche détaillée d'un praticien (`GET /api/praticiens/:id`).
- **Pipeline de données** (`scripts/`) : scripts Python qui téléchargent et retraitent le
  RPPS pour la carte, exécutés chaque jour par `.github/workflows/update-rpps.yml`.

## Démarrer en local

Avec Docker (front + API + Postgres) :

```bash
docker compose up
```

Ou à la main : Postgres seul via Docker, puis l'API et le front.

```bash
docker compose up -d postgres

cd api && npm install
export DATABASE_URL=postgres://absante:absante@localhost:54329/absante
npm run import:rpps -- --dir <dossier des fichiers RPPS>   # une fois, puis à chaque mise à jour (~1 min)
npm run dev                                                # API sur http://localhost:3100

cd ../front && npm install && npm run dev                  # le front joint l'API via un proxy /api
```

Commandes utiles (depuis `front/` ou `api/`) : `npm run lint`, `npm run typecheck`,
`npm run test:ci`, `npm run build`. Les tests de l'API s'exécutent contre un vrai Postgres
(`docker compose up -d postgres`, ou `TEST_DATABASE_URL`).

## Fiche praticien

Depuis la carte, chaque praticien listé a un bouton « Voir la fiche » qui ouvre
`/praticien/<identifiant national>` dans un nouvel onglet : identité, spécialités et
compétences, activités avec leur lieu d'exercice (adresse, téléphone, e-mail, SIRET, FINESS...),
diplômes et autorisations. Toute information absente du RPPS est indiquée « Non renseigné ».

## Application installable (PWA)

Le bouton **Installer l'application** du header installe AbSante en un clic, comme une
application (icône, fenêtre à part) :

- **Chrome, Edge, Android** : un clic ouvre l'installation native du navigateur.
- **iPhone / iPad (Safari)** : le bouton affiche le chemin « Partager → Sur l'écran d'accueil »
  (Apple n'autorise pas l'installation par un bouton).
- **Déjà installée, ou navigateur sans installation** (ex : Firefox sur ordinateur) : le bouton
  n'apparaît pas.

Le service worker (`front/public/sw.js`) est volontairement minimal : il rend l'application
installable et affiche une page claire hors connexion. Il ne met jamais en cache l'API, les données
ni les scripts, donc les fiches restent fraîches et une nouvelle version n'est jamais masquée. Les
icônes sont dans `front/public/icons/` (source : `icon-any.svg` et `icon-maskable.svg`).
L'installation exige HTTPS en production (`localhost` fonctionne en développement).

## Base de données (API)

`npm run import:rpps` (dans `api/`) charge trois fichiers RPPS « libre accès » de
[data.gouv.fr](https://www.data.gouv.fr/datasets/annuaire-sante-extractions-des-donnees-en-libre-acces-des-professionnels-intervenant-dans-le-systeme-de-sante-rpps/) :
`PS_LibreAcces_Personne_activite.txt`, `PS_LibreAcces_Dipl_AutExerc.txt` et
`PS_LibreAcces_SavoirFaire.txt`. Il construit les tables dans un schéma de travail puis les
met en service en une seule bascule : en cas d'échec (fichier tronqué, en-tête modifié, ligne
mal formée, import déjà en cours), les données actuelles restent servies, intactes.
La base (~1,2 Go) n'est jamais versionnée.

## Pipeline de données

Données de la carte : `scripts/update_rpps.py` télécharge le fichier RPPS brut et produit :
- `front/public/data/rpps-departement.json` — effectif par département et par profession ;
- `front/public/data/rpps-commune.json` — effectif par commune, avec coordonnées ;
- `front/public/data/etablissements/{dept}.json` — le détail par établissement
  (praticiens nommés avec leur identifiant national), un fichier par département, chargé à la
  demande par le front.

`scripts/geocode_etablissements.py` géocode l'adresse de chaque établissement via la
[Base Adresse Nationale](https://adresse.data.gouv.fr/) (gratuite, sans clé) et alimente
`front/public/data/etablissements-geo.json`, un cache incrémental (ne re-géocode que les
nouveaux établissements d'un jour sur l'autre).

Ces deux scripts tournent automatiquement chaque jour
(`.github/workflows/update-rpps.yml`) et ouvrent une pull request vers `main` avec les
données mises à jour.

## Workflow Git

Les branches `main`, `staging` et `dev` sont protégées : toute évolution passe par une
pull request (fusion uniquement, pas de push direct), avec lint + tests + build
obligatoires avant de pouvoir fusionner (`.github/workflows/ci.yml`).
