<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../atoms/AppIcon.vue'
import BrandMark from '../atoms/BrandMark.vue'

const REPO_URL = 'https://github.com/Abend-core/AbSante'
const RPPS_URL =
  'https://www.data.gouv.fr/datasets/annuaire-sante-extractions-des-donnees-en-libre-acces-des-professionnels-intervenant-dans-le-systeme-de-sante-rpps/'

const year = computed(() => new Date().getFullYear())
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <section class="site-footer__about">
          <div class="site-footer__brand">
            <BrandMark :size="30" />
            <span class="site-footer__name">AbSante</span>
          </div>
          <p>
            Carte interactive de la densité et de la répartition des professionnels de santé en France :
            recherche par ville, densité par département, praticiens par établissement.
          </p>
          <a :href="REPO_URL" target="_blank" rel="noopener" class="site-footer__repo">
            <AppIcon name="github" :size="16" />
            Projet open source sur GitHub
          </a>
        </section>

        <section aria-labelledby="footer-sources">
          <h2 id="footer-sources" class="site-footer__title">Sources des données</h2>
          <ul>
            <li>
              <a :href="RPPS_URL" target="_blank" rel="noopener">Annuaire Santé — RPPS</a>, Agence du Numérique en Santé
              (données en libre accès, Licence Ouverte 2.0, mises à jour chaque jour).
            </li>
            <li>
              Fonds de carte © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contributeurs OpenStreetMap</a>
              (licence ODbL).
            </li>
            <li>
              Adresses géocodées avec la <a href="https://adresse.data.gouv.fr/" target="_blank" rel="noopener">Base Adresse Nationale</a>.
            </li>
            <li>
              Contours des départements du projet
              <a href="https://github.com/gregoiredavid/france-geojson" target="_blank" rel="noopener">france-geojson</a>, d'après l'IGN ;
              communes : data.gouv.fr (Licence Ouverte 2.0).
            </li>
          </ul>
        </section>

        <section aria-labelledby="footer-legal">
          <h2 id="footer-legal" class="site-footer__title">Informations légales</h2>
          <ul>
            <li>
              <strong>Service indépendant</strong>, non affilié à l'Agence du Numérique en Santé ni à l'État. Il ne remplace pas
              l'annuaire officiel ni un avis médical.
            </li>
            <li>
              <strong>Données publiques</strong> du RPPS, reproduites telles que publiées : elles peuvent être incomplètes ou en retard
              sur la réalité. « Non renseigné » signale une information absente du répertoire.
            </li>
            <li>
              <strong>Rectification</strong> : elle se fait à la source, auprès de l'ordre ou de l'organisme d'enregistrement du
              professionnel ; AbSante suit ensuite la mise à jour quotidienne.
            </li>
            <li>
              <strong>Vie privée</strong> : AbSante n'utilise ni cookie ni outil de mesure d'audience. Le fond de carte est chargé
              depuis openstreetmap.org, qui reçoit à ce titre votre adresse IP.
            </li>
          </ul>
        </section>
      </div>

      <p class="site-footer__legal">© {{ year }} AbSante · Données RPPS sous Licence Ouverte 2.0 (Etalab)</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 3rem;
  padding-block: 2.5rem 1.5rem;
  background: var(--navy-deep);
  color: var(--on-navy-muted);
  font-size: 0.86rem;
  line-height: 1.55;
}

.site-footer__grid {
  display: grid;
  grid-template-columns: 1.1fr 1.3fr 1.4fr;
  gap: 2.25rem;
}

.site-footer__brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.site-footer__name {
  font-family: var(--display);
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.site-footer__title {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--on-navy);
}

.site-footer ul {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-footer strong {
  font-weight: 600;
  color: var(--on-navy);
}

.site-footer a {
  color: var(--on-navy);
  text-decoration-color: rgba(234, 242, 251, 0.35);
  text-underline-offset: 3px;
}

.site-footer a:hover {
  text-decoration-color: currentColor;
}

.site-footer a:focus-visible {
  outline-color: #fff;
}

.site-footer__repo {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.85rem;
}

.site-footer__legal {
  margin-top: 2rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.8rem;
}

@media (max-width: 900px) {
  .site-footer__grid {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }
}
</style>
