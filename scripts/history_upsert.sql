-- Historique des effectifs (un instantané par mois), conservé dans un schéma à part.
--
-- Lancé par scripts/pi_update_db.sh juste après la bascule du schéma `rpps`. Le schéma `historique`
-- n'est jamais touché par la mise à jour (qui ne remplace que `rpps`) : c'est lui qui garde la
-- mémoire d'un mois sur l'autre. `rpps.effectifs_snapshot` (les effectifs du jour) arrive avec le
-- dump ; on la recopie ici. Rejouer ce script est sans effet : dans un même mois, le relevé le plus
-- récent remplace le précédent, jamais l'inverse.
CREATE SCHEMA IF NOT EXISTS historique;

CREATE TABLE IF NOT EXISTS historique.effectifs (
  mois          date    NOT NULL,             -- premier jour du mois
  departement   text    NOT NULL,
  profession    text    NOT NULL,             -- « Tous » = toutes professions
  specialite    text    NOT NULL DEFAULT '',  -- vide = la profession entière
  n             integer NOT NULL,
  date_donnees  date    NOT NULL,             -- date des données RPPS qui ont produit ce relevé
  PRIMARY KEY (mois, departement, profession, specialite)
);

INSERT INTO historique.effectifs (mois, departement, profession, specialite, n, date_donnees)
SELECT date_trunc('month', date_donnees)::date, departement, profession, specialite, n, date_donnees
  FROM rpps.effectifs_snapshot
ON CONFLICT (mois, departement, profession, specialite)
DO UPDATE SET n = EXCLUDED.n, date_donnees = EXCLUDED.date_donnees
  WHERE EXCLUDED.date_donnees >= historique.effectifs.date_donnees;
