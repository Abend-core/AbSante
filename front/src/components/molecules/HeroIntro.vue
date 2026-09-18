<script setup lang="ts">
import AppIcon from '../atoms/AppIcon.vue'
import type { IconName } from '../atoms/AppIcon.vue'

/** Les trois usages de l'application, dans les termes de l'objectif du projet. */
const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'search', title: 'Chercher par ville', text: 'Tapez une commune : la carte s’y place et liste ses établissements.' },
  { icon: 'layers', title: 'Voir la densité', text: 'Comparez les départements, toutes professions ou une seule.' },
  { icon: 'pin', title: 'Voir la répartition', text: 'Chaque établissement à sa vraie adresse, avec ses praticiens.' },
]
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <!-- Tracé de pouls décoratif (même motif que le repère de la marque) qui se termine sur un
         point corail, comme les établissements de la carte. -->
    <svg class="hero__pulse" viewBox="0 0 640 170" aria-hidden="true" focusable="false">
      <path
        d="M0 100h190l22-52 38 108 34-84 24 28h150l20-26 26 50 22-24h114"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="624" cy="100" r="8" fill="#e5533d" stroke="#0a2a4d" stroke-width="3" />
    </svg>

    <div class="container hero__content">
      <p class="hero__eyebrow">Professionnels de santé · France entière, DOM-TOM compris</p>
      <h1 id="hero-title">Où sont les professionnels de santé&nbsp;?</h1>
      <p class="hero__lead">
        Explorez la répartition des médecins, infirmiers, pharmaciens et de tous les praticiens du répertoire national,
        du département jusqu’à l’adresse du cabinet.
      </p>

      <ul class="hero__features">
        <li v-for="f in FEATURES" :key="f.title" class="hero__feature">
          <span class="hero__icon"><AppIcon :name="f.icon" :size="20" /></span>
          <div>
            <strong>{{ f.title }}</strong>
            <span>{{ f.text }}</span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  /* Le bas est volontairement profond : le panneau de la carte vient le chevaucher. */
  padding-block: 2.75rem 6.5rem;
  background: var(--navy);
  color: var(--on-navy);
}

.hero__pulse {
  position: absolute;
  top: 3.25rem;
  right: 0;
  width: min(38%, 500px);
  height: auto;
  color: rgba(100, 181, 246, 0.4);
  pointer-events: none;
  /* Début du tracé estompé : il n'entre jamais en collision avec le titre. */
  mask-image: linear-gradient(to right, transparent, #000 30%);
}

/* Sur écran étroit, le titre occupe toute la largeur : le tracé décoratif disparaît plutôt que de passer sous le texte. */
@media (max-width: 900px) {
  .hero__pulse {
    display: none;
  }
}

.hero__content {
  position: relative;
}

.hero__eyebrow {
  margin-bottom: 0.9rem;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #7fbcf5;
}

.hero h1 {
  max-width: 24ch;
  color: #fff;
}

.hero__lead {
  max-width: 58ch;
  margin-top: 1.1rem;
  font-size: 1.08rem;
  color: var(--on-navy-muted);
}

.hero__features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem 1.75rem;
  max-width: 860px;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
}

.hero__feature {
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  font-size: 0.9rem;
  line-height: 1.4;
}

.hero__feature strong {
  display: block;
  margin-bottom: 0.15rem;
  font-family: var(--display);
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

.hero__feature span:not(.hero__icon) {
  color: var(--on-navy-muted);
}

.hero__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 11px;
  background: rgba(30, 136, 229, 0.22);
  color: #7fbcf5;
}

@media (max-width: 640px) {
  .hero {
    padding-block: 2rem 5.5rem;
  }
}
</style>
