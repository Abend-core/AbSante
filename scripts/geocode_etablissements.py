"""
Géocode les établissements du RPPS via la Base Adresse Nationale (BAN, gratuite,
sans clé) : convertit leur adresse texte ("Villa Laennec, Rue Aristide Briand,
42160 Andrézieux-Bouthéon") en coordonnées lat/lon réelles.

Avant ce script, les établissements n'avaient QUE les coordonnées de leur commune
(un seul point pour toute la commune) — précis pour rien de plus fin que "il y a
des établissements ici". Ce script produit un point PAR établissement, à sa vraie
adresse (ou au niveau rue/lieu-dit si le numéro n'est pas geocodable).

Écrit un cache `front/public/data/etablissements-geo.json` : identifiant
technique de structure -> [lat, lon] | null (si non geocodable). `update_rpps.py`
lit ce cache pour enrichir chaque établissement de `etablissements/{dept}.json`.
Incrémental : ne re-géocode que les structures absentes du cache -> une fois le
gros du travail fait, les exécutions suivantes (nouvelles structures seulement)
sont rapides.
"""
import argparse
import json
import os

import pandas as pd
import requests

RAW_PATH = "PS_LibreAcces_Personne_activite.txt"
OUT_CACHE = "front/public/data/etablissements-geo.json"
BAN_CSV_URL = "https://api-adresse.data.gouv.fr/search/csv/"
BATCH_SIZE = 2000

USECOLS = [
    "Identifiant technique de la structure",
    "Raison sociale site",
    "Complément destinataire (coord. structure)",
    "Numéro Voie (coord. structure)",
    "Libellé type de voie (coord. structure)",
    "Libellé Voie (coord. structure)",
    "Code commune (coord. structure)",
]


def build_adresse(row: pd.Series) -> str:
    num = row["Numéro Voie (coord. structure)"]
    typ = row["Libellé type de voie (coord. structure)"]
    voie = row["Libellé Voie (coord. structure)"]
    compl = row["Complément destinataire (coord. structure)"]
    parts = [p for p in [num, typ, voie] if isinstance(p, str) and p.strip()]
    if parts:
        return " ".join(parts)
    if isinstance(compl, str) and compl.strip():
        return compl
    return ""


def geocode_batch(rows: pd.DataFrame) -> dict[str, list[float] | None]:
    """Envoie un lot à l'API BAN (CSV en entrée -> CSV enrichi en sortie)."""
    csv_bytes = rows[["id", "adresse", "code_insee"]].to_csv(index=False).encode("utf-8")
    resp = requests.post(
        BAN_CSV_URL,
        files={"data": ("batch.csv", csv_bytes, "text/csv")},
        data={"columns": "adresse", "citycode": "code_insee"},
        timeout=60,
    )
    resp.raise_for_status()
    from io import StringIO

    result = pd.read_csv(StringIO(resp.text))
    out: dict[str, list[float] | None] = {}
    for _, r in result.iterrows():
        if r.get("result_status") == "ok" and pd.notna(r.get("latitude")):
            out[str(r["id"])] = [round(float(r["latitude"]), 6), round(float(r["longitude"]), 6)]
        else:
            out[str(r["id"])] = None
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="Réutilise le fichier source déjà présent en local.")
    args = parser.parse_args()

    if not (args.offline and os.path.exists(RAW_PATH)):
        raise SystemExit("Ce script s'attend à --offline avec le fichier source déjà présent (voir update_rpps.py).")

    cache: dict[str, list[float] | None] = {}
    if os.path.exists(OUT_CACHE):
        with open(OUT_CACHE, encoding="utf-8") as f:
            cache = json.load(f)
    print(f"{len(cache)} structures déjà en cache")

    df = pd.read_csv(RAW_PATH, sep="|", usecols=USECOLS, dtype=str)
    df = df.dropna(subset=["Raison sociale site", "Identifiant technique de la structure", "Code commune (coord. structure)"])
    uniq = df.drop_duplicates(subset=["Identifiant technique de la structure"]).copy()
    uniq["adresse"] = uniq.apply(build_adresse, axis=1)
    uniq = uniq.rename(
        columns={"Identifiant technique de la structure": "id", "Code commune (coord. structure)": "code_insee"}
    )
    uniq = uniq[uniq["adresse"] != ""]
    todo = uniq[~uniq["id"].isin(cache.keys())]
    print(f"{len(uniq)} structures avec adresse, {len(todo)} restant à géocoder")

    n_batches = (len(todo) + BATCH_SIZE - 1) // BATCH_SIZE
    for i in range(n_batches):
        batch = todo.iloc[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
        try:
            results = geocode_batch(batch)
            cache.update(results)
        except requests.RequestException as e:
            print(f"  lot {i + 1}/{n_batches} échoué ({e}), on continue")
            continue
        if (i + 1) % 10 == 0 or i + 1 == n_batches:
            print(f"  lot {i + 1}/{n_batches} ({len(cache)} structures en cache)")
            with open(OUT_CACHE, "w", encoding="utf-8") as f:
                json.dump(cache, f, separators=(",", ":"))

    with open(OUT_CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, separators=(",", ":"))
    n_found = sum(1 for v in cache.values() if v is not None)
    print(f"Terminé : {len(cache)} structures en cache, {n_found} géocodées avec succès -> {OUT_CACHE}")


if __name__ == "__main__":
    main()
