"""
Extrait de front/public/data/rpps-departement.json (celui qui alimente la carte) les effectifs par
département, profession et spécialité, au format CSV, pour les charger dans la table
`effectifs_snapshot` de la base avant le dump (.github/workflows/publish-db.yml).

Partir du fichier de la carte garantit que l'historique et la carte affichent les mêmes chiffres.
Le Pi recopie ensuite cette table dans `historique.effectifs` (scripts/history_upsert.sql), un
instantané par mois. Ne dépend que de la bibliothèque standard.
"""
import argparse
import csv
import json


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default="front/public/data/rpps-departement.json")
    parser.add_argument("--out", default="effectifs.csv")
    args = parser.parse_args()

    with open(args.src, encoding="utf-8") as f:
        data = json.load(f)

    date = data["updatedAt"][:10]
    specialites = data.get("specialites", [])
    rows = []
    for dept, counts in data["byDepartement"].items():
        for profession, n in counts.items():
            if n > 0:
                rows.append((date, dept, profession, "", n))
    for dept, par_specialite in data.get("bySpecialite", {}).items():
        for idx, n in par_specialite.items():
            profession, libelle = specialites[int(idx)]
            rows.append((date, dept, profession, libelle, n))

    with open(args.out, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["date_donnees", "departement", "profession", "specialite", "n"])
        writer.writerows(sorted(rows))
    print(f"{len(rows)} lignes ({date}) -> {args.out}")


if __name__ == "__main__":
    main()
