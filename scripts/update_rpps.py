"""
Met à jour les données RPPS servies par le front :
- front/public/data/rpps-departement.json      : effectif par département x profession
  et par département x spécialité
- front/public/data/rpps-commune.json          : effectif par commune x profession, avec
  coordonnées, pour les points sur la carte
- front/public/data/rpps-commune-specialite.json : effectif par commune x spécialité (fichier
  creux, chargé seulement quand une spécialité est choisie)
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
SAVOIR_FAIRE_URL = "https://www.data.gouv.fr/api/1/datasets/r/fb55f15f-bd61-4402-b551-51ef387f2fab"
RAW_PATH = "PS_LibreAcces_Personne_activite.txt"
COMMUNES_PATH = "communes_coords.csv"
SAVOIR_FAIRE_PATH = "PS_LibreAcces_SavoirFaire.txt"
OUT_DEPT = "front/public/data/rpps-departement.json"
OUT_COMMUNE = "front/public/data/rpps-commune.json"
OUT_COMMUNE_SPEC = "front/public/data/rpps-commune-specialite.json"
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

# Seule la « Spécialité ordinale » est retenue (98 libellés, 3 professions : médecins, chirurgiens-
# dentistes, infirmiers en pratique avancée). Les autres types du fichier (capacités, compétences,
# DESC...) sont des compléments qui ne désignent pas ce que fait le praticien au quotidien.
TYPE_SPECIALITE = "Spécialité ordinale"

# Le RPPS a plusieurs libellés pour une même spécialité (anciennes et nouvelles maquettes de
# formation) : sans regroupement, « médecin généraliste » se répartirait sur trois entrées.
# Clé : (profession, libellé du fichier) ; valeur : libellé affiché. Tout ce qui n'est pas listé
# ici garde son libellé du fichier.
SPECIALITE_ALIAS = {
    ("Médecin", "Spécialiste en Médecine Générale"): "Médecine générale",
    ("Médecin", "Qualifié en Médecine Générale"): "Médecine générale",
    ("Médecin", "Médecine Générale"): "Médecine générale",
    ("Médecin", "O.R.L et chirurgie cervico faciale"): "Oto-rhino-laryngologie",
    ("Médecin", "Psychiatrie option enfant & adolescent"): "Psychiatrie option enfant et adolescent",
    ("Médecin", "Endocrinologie et métabolisme"): "Endocrinologie, diabétologie, nutrition",
    ("Médecin", "Hématologie (option Maladie du sang)"): "Hématologie",
    ("Médecin", "Hématologie (réforme 2017)"): "Hématologie",
    ("Médecin", "Chirurgie maxillo-faciale (réforme 2017)"): "Chirurgie maxillo-faciale",
    ("Médecin", "Radio-thérapie"): "Oncologie option radiothérapie",
    ("Médecin", "Gynéco-obstétrique et Gynéco médicale option Gynéco-obst"): "Gynécologie-obstétrique",
    ("Médecin", "Gynéco-obstétrique et Gynéco médicale option Gynéco-médicale"): "Gynécologie médicale",
    ("Médecin", "CHIRURGIE ORALE"): "Chirurgie orale",
}


def extraire_dept(code: pd.Series, n_metropole: int = 2) -> pd.Series:
    """Département depuis un code postal ou commune INSEE.
    Outre-mer sur 3 chiffres (971, 972...), sinon 2 chiffres."""
    is_om = code.str.startswith(("97", "98"), na=False)
    dept = code.str[:n_metropole].copy()
    dept[is_om] = code[is_om].str[:3]
    return dept


def charger_specialites(path: str):
    """Spécialités ordinales par praticien.

    Renvoie (specialites, table) : `specialites` est la liste [profession, libellé] triée, dont
    l'indice sert de code court dans les JSON du front ; `table` associe chaque (identifiant PP,
    profession) à ses indices. Une même personne peut avoir plusieurs spécialités."""
    sf = pd.read_csv(
        path,
        sep="|",
        usecols=["Identifiant PP", "Identification nationale PP", "Libellé profession", "Libellé type savoir-faire", "Libellé savoir-faire"],
        dtype=str,
    )
    sf = sf[sf["Libellé type savoir-faire"] == TYPE_SPECIALITE].dropna(
        subset=["Identifiant PP", "Libellé profession", "Libellé savoir-faire"]
    )
    sf["specialite"] = [
        SPECIALITE_ALIAS.get((prof, lib.strip()), lib.strip())
        for prof, lib in zip(sf["Libellé profession"], sf["Libellé savoir-faire"])
    ]
    sf = sf.drop_duplicates(subset=["Identifiant PP", "Libellé profession", "specialite"])
    specialites = sorted(
        sf[["Libellé profession", "specialite"]].drop_duplicates().itertuples(index=False, name=None)
    )
    index = {pair: i for i, pair in enumerate(specialites)}
    sf["spec_idx"] = [index[pair] for pair in zip(sf["Libellé profession"], sf["specialite"])]
    return [list(pair) for pair in specialites], sf


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Ne retélécharge pas si les fichiers sources sont déjà présents localement (dev/tests).",
    )
    args = parser.parse_args()

    if args.offline and all(os.path.exists(p) for p in (RAW_PATH, COMMUNES_PATH, SAVOIR_FAIRE_PATH)):
        print("--offline : réutilisation des fichiers sources déjà présents")
    else:
        print(f"Téléchargement de {RPPS_URL} ...")
        urllib.request.urlretrieve(RPPS_URL, RAW_PATH)
        print(f"Téléchargement de {COMMUNES_URL} ...")
        urllib.request.urlretrieve(COMMUNES_URL, COMMUNES_PATH)
        print(f"Téléchargement de {SAVOIR_FAIRE_URL} ...")
        urllib.request.urlretrieve(SAVOIR_FAIRE_URL, SAVOIR_FAIRE_PATH)

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

    specialites, spec = charger_specialites(SAVOIR_FAIRE_PATH)
    print(f"{len(specialites)} spécialités, {len(spec)} couples praticien x spécialité")

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

    # Praticien x spécialité rattaché à ses lieux d'exercice : on joint sur (identifiant, profession)
    # pour qu'un médecin qui est aussi pharmacien ne compte que dans les spécialités de son activité
    # de médecin. Personne comptée une fois par département et par spécialité.
    act_spec = df[["Identifiant PP", "Libellé profession", "dept", "code_insee"]].drop_duplicates().merge(
        spec[["Identifiant PP", "Libellé profession", "spec_idx"]], on=["Identifiant PP", "Libellé profession"]
    )
    par_dept_spec = act_spec.drop_duplicates(subset=["Identifiant PP", "dept", "spec_idx"]).groupby(["dept", "spec_idx"]).size()
    by_specialite: dict[str, dict[str, int]] = {}
    for (d, idx), n in par_dept_spec.items():
        by_specialite.setdefault(d, {})[str(idx)] = int(n)

    with open(OUT_DEPT, "w", encoding="utf-8") as f:
        json.dump(
            {
                "updatedAt": updated_at,
                "professions": professions,
                # [profession, libellé] ; l'indice est la clé de bySpecialite et des fichiers commune/établissement
                "specialites": specialites,
                "byDepartement": by_departement,
                "bySpecialite": by_specialite,
            },
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

    # Effectifs par commune x spécialité : fichier creux (la plupart des communes n'ont que
    # quelques spécialités), séparé du fichier principal pour ne se charger que sur demande.
    coord_communes = set(merged["code_insee"])
    par_commune_spec = (
        act_spec.dropna(subset=["code_insee"])
        .drop_duplicates(subset=["Identifiant PP", "code_insee", "spec_idx"])
        .groupby(["code_insee", "spec_idx"])
        .size()
    )
    communes_spec: dict[str, list[list[int]]] = {}
    for (code, idx), n in par_commune_spec.items():
        if code in coord_communes:
            communes_spec.setdefault(code, []).append([int(idx), int(n)])
    with open(OUT_COMMUNE_SPEC, "w", encoding="utf-8") as f:
        json.dump({"updatedAt": updated_at, "communes": communes_spec}, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print(f"{len(communes_spec)} communes avec spécialité -> {OUT_COMMUNE_SPEC}")

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
    specs_par_praticien: dict[tuple[str, str], list[int]] = {}
    for pp, prof, idx in zip(spec["Identifiant PP"], spec["Libellé profession"], spec["spec_idx"]):
        specs_par_praticien.setdefault((pp, prof), []).append(int(idx))
    n_dept_files = 0
    for dept, dept_group in etabs_dedup.groupby("dept"):
        communes_out: dict[str, list] = {}
        for code_insee, commune_group in dept_group.groupby("code_insee"):
            etabs_out = []
            for structure_id, etab_group in commune_group.groupby("Identifiant technique de la structure"):
                praticiens = []
                for _, r in etab_group.iterrows():
                    praticien = [
                        r["Nom d'exercice"],
                        r["Prénom d'exercice"],
                        r["Libellé profession"],
                        # Clé de la fiche détaillée (API) : identifiant national, type inclus
                        r["Identification nationale PP"],
                    ]
                    # Indices de ses spécialités (voir "specialites" dans rpps-departement.json) :
                    # ajoutés seulement s'il y en a, pour ne pas alourdir les fichiers pour rien.
                    idx = specs_par_praticien.get((r["Identifiant PP"], r["Libellé profession"]))
                    if idx:
                        praticien.append(sorted(idx))
                    praticiens.append(praticien)
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
