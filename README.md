# AbSante

> Un projet de l'équipe **Abend** ([organisation GitHub Abend-core](https://github.com/Abend-core)).

Carte interactive de la densité et de la répartition des professionnels de santé en
France, à partir du [RPPS](https://esante.gouv.fr/produits-services/repertoire-rpps)
(Répertoire Partagé des Professionnels de Santé, data.gouv.fr).

L'application permet de :
- **rechercher un spécialiste par ville** (recherche de commune, filtre par profession, puis par
  **spécialité** : cardiologie, pédiatrie...) ;
- **trouver les établissements les plus proches de soi** (« Autour de moi ») ;
- **retrouver un praticien par son nom** et ouvrir sa fiche ;
- **visualiser la densité** de professionnels de santé par département (carte choroplèthe), en
  **praticiens pour 100 000 habitants** ou en effectif brut ;
- **voir la répartition** des établissements et de leurs praticiens (nom, prénom,
  profession), géocodés à leur vraie adresse.

Aucune API n'est ouverte au public : `/api/praticiens/:id` et `/api/recherche` ne servent que le front.

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

## Carte : spécialités, densité, « autour de moi »

- **Spécialité** : une fois une profession choisie (médecin, chirurgien-dentiste, infirmier), un second
  menu propose ses spécialités ordinales du RPPS. Les libellés doublons de l'ancienne et de la nouvelle
  maquette de formation sont regroupés (`SPECIALITE_ALIAS` dans `scripts/update_rpps.py` : « médecine
  générale » n'est plus répartie sur trois entrées). Une personne à deux spécialités compte dans les deux.
- **Densité** : par défaut la carte colore les départements en praticiens pour 100 000 habitants (population
  INSEE, `front/public/data/population-departement.json`) ; le bouton bascule vers l'effectif brut, qui ne fait
  que suivre la population. L'échelle s'arrête au 95ᵉ centile (légende « ≥ N ») : Paris compte près de deux
  fois plus de praticiens par habitant que le département suivant et délaverait tous les autres. Les
  praticiens sont comptés là où ils exercent, pas là où habitent les patients : les départements à gros
  hôpitaux ressortent davantage. La population ne change qu'une fois par an : `python scripts/update_population.py`
  la remet à jour à la main.
- **Autour de moi** : demande la position au navigateur, puis classe les établissements de la sélection
  (profession, spécialité) par distance, avec un lien d'itinéraire. La recherche se fait dans le navigateur, à
  partir des fichiers déjà servis : la position n'est envoyée nulle part. Un établissement sans adresse
  géocodée est placé au centre de sa commune et marqué « ≈ ».

## Recherche par nom

La barre « Rechercher un praticien » interroge `GET /api/recherche?q=` : nom et prénom dans n'importe quel
ordre, en préfixe, sans accents ni casse (« dup marie » trouve « Marie-Laure DUPONT »), 20 résultats au plus. Elle
s'appuie sur un index plein texte (`praticiens.recherche`, GIN, sans extension Postgres) construit à l'import.

## Historique des effectifs

Chaque jour, le workflow `publish-db.yml` range dans la base les effectifs par département, profession et
spécialité (`rpps.effectifs_snapshot`, tirés du même fichier que la carte). Après la bascule, le Pi les recopie
(`scripts/history_upsert.sql`) dans `historique.effectifs` : **un relevé par mois**, le plus récent du mois
remplaçant le précédent. Ce schéma n'est jamais touché par la mise à jour de `rpps`, c'est lui qui garde la
mémoire. Il se remplit à partir de la première mise à jour qui suit le déploiement ; rien ne l'affiche encore.

```sql
SELECT mois, n FROM historique.effectifs
 WHERE departement = '34' AND profession = 'Médecin' AND specialite = '' ORDER BY mois;
```

## Fiche praticien

Depuis la carte, chaque praticien listé a un bouton « Voir la fiche » qui ouvre
`/praticien/<identifiant national>` dans un nouvel onglet : identité, spécialités et
compétences, activités avec leur lieu d'exercice (adresse, téléphone, e-mail, SIRET, FINESS...),
diplômes et autorisations. Toute information absente du RPPS est indiquée « Non renseigné ».

## Déploiement (Raspberry Pi)

L'application tourne sur le Raspberry Pi, derrière le Traefik du dossier `~/infra` (HTTPS
Let's Encrypt, CrowdSec, limitation de débit) : **https://absante.rxdy.fr**. Le sous-domaine
résout déjà vers le Pi (DNS générique), aucun réglage DNS n'est nécessaire.

> ⚠️ **Ne jamais construire ni importer massivement sur le Pi.** Son watchdog
> (`/usr/local/bin/watchdog-check.sh`) le **redémarre quand la charge (1 min) dépasse 10**, ce
> qu'un `npm ci`, un build ou une restauration de base suffisent à provoquer (et tous les sites
> tombent quelques minutes). Tout ce qui est lourd se fait sur GitHub.

### Mise à jour automatique, chaque jour

| Quoi | Où | Comment |
|---|---|---|
| Données de la carte (fichiers JSON) | GitHub, 5h UTC | `update-rpps.yml` ouvre une PR, la CI est lancée à la main sur sa branche (une PR du jeton d'Actions ne la déclenche pas) puis fusion automatique |
| Images `api` et `front` (arm64) | GitHub, à chaque fusion dans `main` | `deploy-images.yml` publie sur GHCR ; **Watchtower** (déjà en place sur le Pi) récupère l'image et recrée le conteneur |
| Base de données (fiches) | GitHub, 5h30 UTC | `publish-db.yml` importe le RPPS dans un PostgreSQL éphémère et publie un dump dans la release `data-latest` |
| Restauration du dump | Pi, 4h (cron) | `scripts/pi_update_db.sh` : restaure à côté du schéma en service, vérifie, puis bascule par renommage, puis met à jour l'historique mensuel |

`scripts/pi_update_db.sh` protège le Pi : il ne démarre pas si la charge dépasse 3, vérifie la somme
de contrôle du dump, met la base en pause dès que la charge atteint 4 (reprise sous 2) et lève
toujours la pause à la fin. Le site reste servi pendant l'opération et, en cas d'échec, les données
actuelles restent intactes (journal : `~/absante/update-db.log`).

Installation du cron sur le Pi (une seule fois) :

```bash
( crontab -l 2>/dev/null; echo '0 4 * * * $HOME/absante/scripts/pi_update_db.sh >> $HOME/absante/update-db.log 2>&1' ) | crontab -
```

### Première installation (une seule fois)

```bash
git clone https://github.com/Abend-core/AbSante.git ~/absante && cd ~/absante          # sur le Pi
cp .env.example .env    # puis renseigner POSTGRES_PASSWORD (openssl rand -hex 24)
docker compose -f docker-compose.prod.yml up -d postgres
scripts/pi_update_db.sh                       # première restauration de la base (~25 min, gardée)
docker compose -f docker-compose.prod.yml up -d --no-build
```

En secours, `scripts/deploy_pi.sh` construit les images sur un autre poste et les envoie par SSH
(il refuse si la charge du Pi dépasse 5).

Les conteneurs n'ont pas de plafond mémoire effectif sur ce Pi (le cgroup mémoire est désactivé) ;
la base est réglée pour rester sobre (`shared_buffers=128MB`, 30 connexions).

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
- `front/public/data/rpps-departement.json` — effectif par département et par profession, et par spécialité ;
- `front/public/data/rpps-commune.json` — effectif par commune, avec coordonnées ;
- `front/public/data/rpps-commune-specialite.json` — effectif par commune et par spécialité (fichier creux,
  téléchargé seulement quand on choisit une spécialité) ;
- `front/public/data/etablissements/{dept}.json` — le détail par établissement
  (praticiens nommés avec leur identifiant national et, s'ils en ont, leurs spécialités), un fichier par
  département, chargé à la demande par le front.

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
