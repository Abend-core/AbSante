# AbSante

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
- **Pipeline de données** (`scripts/`) : scripts Python qui téléchargent et retraitent le
  RPPS, exécutés chaque jour par `.github/workflows/update-rpps.yml`.

## Démarrer en local

```bash
cd front
npm install
npm run dev
```

Autres commandes utiles (depuis `front/`) : `npm run lint`, `npm run typecheck`,
`npm run test:ci`, `npm run build`.

Avec Docker : `docker compose up` depuis la racine (voir `docker-compose.yml`).

## Pipeline de données

`scripts/update_rpps.py` télécharge le fichier RPPS brut et produit :
- `front/public/data/rpps-departement.json` — effectif par département et par profession ;
- `front/public/data/rpps-commune.json` — effectif par commune, avec coordonnées ;
- `front/public/data/etablissements/{dept}.json` — le détail par établissement
  (praticiens nommés), un fichier par département, chargé à la demande par le front.

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
