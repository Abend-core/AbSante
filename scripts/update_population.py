"""
Récupère la population par département (recensement INSEE, servie par geo.api.gouv.fr) et écrit
front/public/data/population-departement.json : le dénominateur de la densité « praticiens pour
100 000 habitants » affichée sur la carte.

La population légale ne change qu'une fois par an : ce script se lance à la main
(python scripts/update_population.py), pas dans le workflow quotidien. Il ne conserve que les
départements du fond de carte (front/public/data/departements.geojson) et refuse d'écrire si l'un
d'eux manque, pour ne jamais produire une densité sans dénominateur.
"""
import datetime
import json
import urllib.request
from collections import Counter

COMMUNES_URL = "https://geo.api.gouv.fr/communes?fields=code,population,codeDepartement&format=json"
GEOJSON_PATH = "front/public/data/departements.geojson"
OUT_PATH = "front/public/data/population-departement.json"


def main():
    print(f"Téléchargement de {COMMUNES_URL} ...")
    with urllib.request.urlopen(COMMUNES_URL, timeout=120) as res:
        communes = json.load(res)

    par_dept: Counter[str] = Counter()
    for c in communes:
        # Quelques communes n'ont pas de population (villages détruits...) : elles valent 0.
        par_dept[c["codeDepartement"]] += c.get("population") or 0

    with open(GEOJSON_PATH, encoding="utf-8") as f:
        attendus = {feat["properties"]["code"] for feat in json.load(f)["features"]}
    manquants = sorted(attendus - set(par_dept))
    if manquants:
        raise SystemExit(f"Départements sans population : {manquants} -> fichier non écrit")

    payload = {
        "source": "INSEE, recensement de la population (via geo.api.gouv.fr)",
        "recupereLe": datetime.date.today().isoformat(),
        "byDepartement": {d: par_dept[d] for d in sorted(attendus)},
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{len(attendus)} départements, {sum(payload['byDepartement'].values()):,} habitants -> {OUT_PATH}")


if __name__ == "__main__":
    main()
