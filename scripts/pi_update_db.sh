#!/usr/bin/env bash
# Mise à jour de la base AbSante sur le Raspberry Pi. Lancé chaque nuit par cron (voir README).
#
# Le dump est fabriqué par GitHub (.github/workflows/publish-db.yml) : le Pi ne fait que le
# restaurer, à côté du schéma en service (rpps_next), puis bascule par renommage. Le site reste
# servi pendant toute l'opération, et en cas d'échec les données actuelles restent intactes.
#
# GARDE-FOUS DE CHARGE : le watchdog du Pi (/usr/local/bin/watchdog-check.sh) le redémarre quand
# la charge (1 min) dépasse 10. La restauration écrit beaucoup sur la carte SD, donc :
#   - on ne démarre pas si le Pi est déjà chargé (on retentera la nuit suivante) ;
#   - la base est mise en pause dès que la charge atteint HIGH et reprise sous LOW (décision prise sur
#     l'ÉTAT RÉEL du conteneur, jamais sur une variable : ne pas mettre la base en pause à la main
#     pendant l'exécution, cela désynchronise Docker et le gel du cgroup) ;
#   - la pause est TOUJOURS levée à la fin, même en cas d'erreur.
set -uo pipefail

BASE_URL="${ABSANTE_DB_URL:-https://github.com/Abend-core/AbSante/releases/download/data-latest}"
DIR="${ABSANTE_DIR:-$HOME/absante}"
CONTAINER=absante-postgres
STATE="$DIR/.db-sha256"
WORK="$DIR/tmp-update"
MAX_START_LOAD="${ABSANTE_MAX_START_LOAD:-3}"
HIGH="${ABSANTE_LOAD_HIGH:-4}"
LOW="${ABSANTE_LOAD_LOW:-2}"
MIN_PRATICIENS="${ABSANTE_MIN_PRATICIENS:-1000000}"

log() { echo "$(date '+%F %T') $*"; }
load() { cut -d. -f1 /proc/loadavg; }
# -i : sans lui, docker exec ne transmet pas l'entrée standard et un SQL fourni en heredoc est ignoré en silence.
psql_() { docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$CONTAINER" psql -U absante -d absante -v ON_ERROR_STOP=1 -At "$@"; }

# Une seule exécution à la fois.
exec 9>/tmp/absante-update-db.lock
flock -n 9 || { log "déjà en cours, abandon"; exit 0; }

throttle_pid=""
cleanup() {
  [ -n "$throttle_pid" ] && kill "$throttle_pid" 2>/dev/null
  docker unpause "$CONTAINER" >/dev/null 2>&1   # jamais laisser la base en pause
  docker exec "$CONTAINER" rm -f /tmp/rpps.dump >/dev/null 2>&1
  rm -rf "$WORK"
}
trap cleanup EXIT

l="$(load)"
if [ "$l" -gt "$MAX_START_LOAD" ]; then
  log "charge $l > $MAX_START_LOAD : mise à jour reportée à la prochaine exécution"
  exit 0
fi

mkdir -p "$WORK"
curl -fsSL --max-time 60 "$BASE_URL/rpps.dump.json" -o "$WORK/meta.json" || { log "ERREUR : métadonnées introuvables"; exit 1; }
sha="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['sha256'])" "$WORK/meta.json")" || { log "ERREUR : métadonnées illisibles"; exit 1; }
if [ "$sha" = "$(cat "$STATE" 2>/dev/null)" ]; then
  log "déjà à jour ($sha)"
  exit 0
fi

log "téléchargement du dump"
curl -fL --retry 3 --retry-delay 20 --max-time 900 -o "$WORK/rpps.dump" "$BASE_URL/rpps.dump" || { log "ERREUR : téléchargement"; exit 1; }
[ "$(sha256sum "$WORK/rpps.dump" | cut -d' ' -f1)" = "$sha" ] || { log "ERREUR : somme de contrôle différente, dump ignoré"; exit 1; }

docker cp "$WORK/rpps.dump" "$CONTAINER:/tmp/rpps.dump" || { log "ERREUR : copie dans le conteneur"; exit 1; }
psql_ -c "DROP SCHEMA IF EXISTS rpps_next CASCADE" >/dev/null || exit 1

log "restauration dans le schéma rpps_next (1 processus, sans parallélisme)"
nice -n 10 docker exec \
  -e PGOPTIONS="-c synchronous_commit=off -c max_parallel_maintenance_workers=0 -c max_parallel_workers_per_gather=0 -c maintenance_work_mem=64MB -c backend_flush_after=256kB" \
  "$CONTAINER" pg_restore -U absante -d absante --no-owner -j 1 /tmp/rpps.dump &
restore_pid=$!

# Garde-fou de charge : lancé APRÈS le démarrage de pg_restore (un `docker exec` sur une base déjà
# en pause échoue). Il ne garde pas le descripteur du verrou (9>&-), sinon le verrou survivrait au script.
sleep 5
echo 0 > "$WORK/peak"
(
  peak=0
  while :; do
    cur="$(load)"
    [ "$cur" -gt "$peak" ] && { peak="$cur"; echo "$peak" > "$WORK/peak"; }
    is_paused="$(docker inspect -f '{{.State.Paused}}' "$CONTAINER" 2>/dev/null)"
    if [ "$is_paused" = "false" ] && [ "$cur" -ge "$HIGH" ]; then docker pause "$CONTAINER" >/dev/null 2>&1
    elif [ "$is_paused" = "true" ] && [ "$cur" -le "$LOW" ]; then docker unpause "$CONTAINER" >/dev/null 2>&1; fi
    sleep 1
  done
) 9>&- &
throttle_pid=$!

wait "$restore_pid"
rc=$?

kill "$throttle_pid" 2>/dev/null; wait "$throttle_pid" 2>/dev/null; throttle_pid=""
docker unpause "$CONTAINER" >/dev/null 2>&1

if [ "$rc" -ne 0 ]; then
  log "ERREUR : restauration échouée (code $rc), données actuelles conservées"
  psql_ -c "DROP SCHEMA IF EXISTS rpps_next CASCADE" >/dev/null
  exit 1
fi

n="$(psql_ -c "SELECT count(*) FROM rpps_next.praticiens" 2>/dev/null || echo 0)"
if [ "${n:-0}" -lt "$MIN_PRATICIENS" ]; then
  log "ERREUR : seulement $n praticiens après restauration (minimum $MIN_PRATICIENS), bascule annulée"
  psql_ -c "DROP SCHEMA IF EXISTS rpps_next CASCADE" >/dev/null
  exit 1
fi

# Bascule atomique : les requêtes en cours voient l'ancien schéma, les suivantes le nouveau.
psql_ <<'SQL' >/dev/null || { log "ERREUR : bascule échouée, données actuelles conservées"; exit 1; }
BEGIN;
DROP SCHEMA IF EXISTS rpps_old CASCADE;
-- Première installation : il n'y a pas encore de schéma en service à mettre de côté.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'rpps') THEN
    ALTER SCHEMA rpps RENAME TO rpps_old;
  END IF;
END $$;
ALTER SCHEMA rpps_next RENAME TO rpps;
COMMIT;
SQL
# Vérification APRÈS bascule : on n'annonce un succès que si on l'a constaté.
still_next="$(psql_ -c "SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'rpps_next'")"
now="$(psql_ -c "SELECT count(*) FROM rpps.praticiens" 2>/dev/null || echo 0)"
if [ "$still_next" != "0" ] || [ "$now" != "$n" ]; then
  log "ERREUR : la bascule n'a pas produit l'état attendu (rpps_next encore présent: $still_next, praticiens en service: $now)"
  exit 1
fi
psql_ -c "DROP SCHEMA IF EXISTS rpps_old CASCADE" >/dev/null
# Historique : un instantané des effectifs par mois, dans le schéma `historique` que la bascule ne
# touche jamais. Secondaire : un échec est signalé mais n'annule pas la mise à jour, qui est faite.
if psql_ -f - < "$(dirname "$0")/history_upsert.sql" >/dev/null; then
  log "historique des effectifs à jour"
else
  log "AVERTISSEMENT : historique des effectifs non mis à jour (le dump ne contient peut-être pas encore effectifs_snapshot)"
fi
echo "$sha" > "$STATE"
log "OK : base mise à jour ($n praticiens, $sha) — pic de charge observé : $(cat "$WORK/peak" 2>/dev/null || echo ?) (le watchdog du Pi redémarre au-dessus de 10)"
