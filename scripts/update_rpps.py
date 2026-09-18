"""
Met à jour les données RPPS servies par le front :
- front/public/data/rpps-departement.json      : effectif par département x profession
- front/public/data/rpps-commune.json          : effectif par commune x profession, avec
  coordonnées, pour les points sur la carte
- front/public/data/etablissements/{dept}.json : un fichier par département, chargé à la
  demande (voir useEtablissements.ts) quand on zoome dessus -> pour chaque commune, la
  liste COMPLETE de ses établissements avec le nom/prénom/profession de chaque praticien
  et son identifiant national (clé de la fiche détaillée servie par api/).
  Volumineux (~1,5M lignes praticien x établissement au global) -> découpé par département
  pour ne jamais tout charger d'un coup côté front.

Destiné à tourner chaque jour via .github/workflows/update-rpps.yml.
Logique de reconstruction du département reprise et validée dans le projet
ML-DMA/sante (../ML-DMA/sante/scripts/02_clean.py) : la colonne département
du fichier source est vide, on la reconstruit depuis le code postal.
"""
import argparse
import json
import datetime
import os
import urllib.request

import pandas as pd

RPPS_URL = "https://www.data.gouv.fr/api/1/datasets/r/fffda7e9-0ea2-4c35-bba0-4496f3af935d"
COMMUNES_URL = "https://www.data.gouv.fr/api/1/datasets/r/27ee86f2-81d5-47a2-a558-a506b5fe3616"
RAW_PATH = "PS_LibreAcces_Personne_activite.txt"
COMMUNES_PATH = "communes_coords.csv"
OUT_DEPT = "front/public/data/rpps-departement.json"
OUT_COMMUNE = "front/public/data/rpps-commune.json"
OUT_ETABS_DIR = "front/public/data/etablissements"

OUT_GEO_CACHE = "front/public/data/etablissements-geo.json"

USECOLS = [
    "Identifiant PP",
    "Identification nationale PP",
    "Nom d'exercice",
    "Prénom d'exercice",
    "Code postal (coord. structure)",
    "Code commune (coord. structure)",
    "Libellé profession",
    "Raison sociale site",
    "Identifiant technique de la structure",
]


def extraire_dept(code: pd.Series, n_metropole: int = 2) -> pd.Series:
    """Département depuis un code postal ou commune INSEE.
    Outre-mer sur 3 chiffres (971, 972...), sinon 2 chiffres."""
    is_om = code.str.startswith(("97", "98"), na=False)
    dept = code.str[:n_metropole].copy()
    dept[is_om] = code[is_om].str[:3]
    return dept


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Ne retélécharge pas si les fichiers sources sont déjà présents localement (dev/tests).",
    )
    args = parser.parse_args()

    if args.offline and os.path.exists(RAW_PATH) and os.path.exists(COMMUNES_PATH):
        print("--offline : réutilisation des fichiers sources déjà présents")
    else:
        print(f"Téléchargement de {RPPS_URL} ...")
        urllib.request.urlretrieve(RPPS_URL, RAW_PATH)
        print(f"Téléchargement de {COMMUNES_URL} ...")
        urllib.request.urlretrieve(COMMUNES_URL, COMMUNES_PATH)

    df = pd.read_csv(RAW_PATH, sep="|", usecols=USECOLS, dtype=str)
    print(f"{len(df)} lignes chargées")

    cp = df["Code postal (coord. structure)"]
    commune = df["Code commune (coord. structure)"]
    dept_from_cp = extraire_dept(cp)
    dept_from_commune = extraire_dept(commune)

    # Corse : code postal "20" ambigu entre 2A/2B -> code commune (qui distingue les deux)
    is_corse_ambigu = dept_from_cp == "20"
    dept = dept_from_cp.copy()
    dept[is_corse_ambigu] = dept_from_commune[is_corse_ambigu]
    dept = dept.fillna(dept_from_commune)
    df["dept"] = dept
    df["code_insee"] = commune
    df = df.dropna(subset=["dept"])
    # Le prénom (parfois le nom) d'exercice est vide pour une partie des praticiens ->
    # NaN (float) une fois lu par pandas, invalide en JSON si on ne le nettoie pas ici
    # (fait planter le parsing côté front, ex: front/public/data/etablissements/75.json).
    df["Nom d'exercice"] = df["Nom d'exercice"].fillna("")
    df["Prénom d'exercice"] = df["Prénom d'exercice"].fillna("")

    professions = sorted(df["Libellé profession"].unique().tolist())
    cats = professions + ["Tous"]
    updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # --- Par département ---
    dedup_prof = df.drop_duplicates(subset=["Identifiant PP", "dept", "Libellé profession"])
    pivot = dedup_prof.pivot_table(
        index="dept", columns="Libellé profession", values="Identifiant PP", aggfunc="nunique", fill_value=0
    )
    pivot = pivot.reindex(columns=professions, fill_value=0)
    dedup_total = df.drop_duplicates(subset=["Identifiant PP", "dept"])
    pivot["Tous"] = dedup_total.groupby("dept").size()

    by_departement = {d: {c: int(row[c]) for c in cats} for d, row in pivot.iterrows()}
    with open(OUT_DEPT, "w", encoding="utf-8") as f:
        json.dump(
            {"updatedAt": updated_at, "professions": professions, "byDepartement": by_departement},
            f, ensure_ascii=False, indent=2, sort_keys=True,
        )
    print(f"{len(by_departement)} départements -> {OUT_DEPT}")

    # --- Par commune (pour les points sur la carte) ---
    df_metro = df.dropna(subset=["code_insee"])
    dedup_prof_c = df_metro.drop_duplicates(subset=["Identifiant PP", "code_insee", "Libellé profession"])
    pivot_c = dedup_prof_c.pivot_table(
        index="code_insee", columns="Libellé profession", values="Identifiant PP", aggfunc="nunique", fill_value=0
    )
    pivot_c = pivot_c.reindex(columns=professions, fill_value=0)
    dedup_total_c = df_metro.drop_duplicates(subset=["Identifiant PP", "code_insee"])
    pivot_c["Tous"] = dedup_total_c.groupby("code_insee").size()
    pivot_c = pivot_c.reset_index()

    dept_par_commune = df_metro.groupby("code_insee")["dept"].agg(lambda s: s.value_counts().idxmax())
    pivot_c = pivot_c.merge(dept_par_commune.rename("dept"), on="code_insee", how="left")

    communes = pd.read_csv(COMMUNES_PATH).rename(columns={"Code Insee": "code_insee"})
    communes = communes.drop_duplicates(subset=["code_insee"], keep="first")
    merged = pivot_c.merge(communes[["code_insee", "latitude", "longitude", "nom commune"]], on="code_insee", how="left")
    merged = merged.dropna(subset=["latitude", "longitude"]).reset_index(drop=True)

    # [lat, lon, dept, nom, code_insee, ...effectifs dans l'ordre de "professions" (dernier = "Tous")]
    # Pas de détail établissement ici (voir plus bas) : ce fichier doit rester léger, chargé
    # entièrement au démarrage de l'app pour TOUTE la France.
    rows = []
    for i in range(len(merged)):
        row = merged.iloc[i]
        counts = [int(row[c]) for c in cats]
        rows.append(
            [round(float(row["latitude"]), 5), round(float(row["longitude"]), 5), row["dept"], row["nom commune"], row["code_insee"]]
            + counts
        )

    with open(OUT_COMMUNE, "w", encoding="utf-8") as f:
        json.dump(
            {"updatedAt": updated_at, "professions": professions, "rows": rows},
            f, ensure_ascii=False, separators=(",", ":"),
        )
    print(f"{len(rows)} communes -> {OUT_COMMUNE}")

    # --- Établissements détaillés, un fichier PAR DÉPARTEMENT (chargé à la demande) ---
    # Avant : seulement le top 3 établissements par commune (nom + effectif agrégé) était
    # embarqué dans rpps-commune.json -> un petit cabinet individuel (ex: 1 seul médecin)
    # n'apparaissait jamais, écrasé par les grosses structures (hôpitaux, EHPAD...) de la
    # même commune. Ici : TOUS les établissements, avec le nom/prénom/profession de chacun
    # de leurs praticiens, et leurs VRAIES coordonnées géocodées (voir
    # geocode_etablissements.py) quand disponibles -> permet d'afficher n'importe quel
    # praticien, même isolé, et de le placer à sa vraie adresse plutôt qu'au centre de
    # la commune.
    geo_cache: dict[str, list[float] | None] = {}
    if os.path.exists(OUT_GEO_CACHE):
        with open(OUT_GEO_CACHE, encoding="utf-8") as f:
            geo_cache = json.load(f)
        print(f"{sum(1 for v in geo_cache.values() if v)} structures géocodées trouvées en cache")
    else:
        print(f"Pas de cache de géocodage ({OUT_GEO_CACHE}) -> établissements sans coordonnées propres")

    os.makedirs(OUT_ETABS_DIR, exist_ok=True)
    # Regroupement par identifiant technique de structure (stable), pas par nom affiché
    # (deux structures différentes peuvent porter le même nom) -> même clé que le cache
    # de géocodage.
    etabs_df = df_metro.dropna(
        subset=["Raison sociale site", "Nom d'exercice", "Identifiant technique de la structure"]
    )
    etabs_dedup = etabs_df.drop_duplicates(
        subset=["Identifiant PP", "code_insee", "Identifiant technique de la structure", "Libellé profession"]
    )
    n_dept_files = 0
    for dept, dept_group in etabs_dedup.groupby("dept"):
        communes_out: dict[str, list] = {}
        for code_insee, commune_group in dept_group.groupby("code_insee"):
            etabs_out = []
            for structure_id, etab_group in commune_group.groupby("Identifiant technique de la structure"):
                praticiens = [
                    [
                        r["Nom d'exercice"],
                        r["Prénom d'exercice"],
                        r["Libellé profession"],
                        # Clé de la fiche détaillée (API) : identifiant national, type inclus
                        r["Identification nationale PP"],
                    ]
                    for _, r in etab_group.iterrows()
                ]
                raison_sociale = etab_group["Raison sociale site"].iloc[0]
                coords = geo_cache.get(structure_id)
                etabs_out.append([raison_sociale, coords, praticiens])
            etabs_out.sort(key=lambda e: len(e[2]), reverse=True)
            communes_out[code_insee] = etabs_out

        with open(f"{OUT_ETABS_DIR}/{dept}.json", "w", encoding="utf-8") as f:
            json.dump(
                {"updatedAt": updated_at, "communes": communes_out},
                f, ensure_ascii=False, separators=(",", ":"),
            )
        n_dept_files += 1
    print(f"{n_dept_files} fichiers département -> {OUT_ETABS_DIR}/")


if __name__ == "__main__":
    main()
