<script setup lang="ts">
import AppIcon from '../atoms/AppIcon.vue'
import BrandMark from '../atoms/BrandMark.vue'

const REPO_URL = 'https://github.com/Abend-core/AbSante'
</script>

<template>
  <header class="site-header">
    <div class="container site-header__bar">
      <RouterLink to="/" class="site-header__brand" aria-label="AbSante — retour à la carte">
        <BrandMark />
        <span class="site-header__name">AbSante</span>
      </RouterLink>

      <nav class="site-header__nav" aria-label="Navigation principale">
        <RouterLink to="/" class="site-header__link">
          <AppIcon name="pin" :size="16" />
          Carte
        </RouterLink>
        <a :href="REPO_URL" class="site-header__link" target="_blank" rel="noopener">
          <AppIcon name="github" :size="16" />
          Code source
        </a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: var(--navy);
  color: var(--on-navy);
}

.site-header__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 64px;
}

.site-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #fff;
  text-decoration: none;
}

.site-header__name {
  font-family: var(--display);
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.site-header__nav {
  display: flex;
  gap: 0.25rem;
}

.site-header__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  color: var(--on-navy-muted);
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.site-header__link:hover,
.site-header__link.router-link-exact-active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.site-header a:focus-visible {
  outline-color: #fff;
}

@media (max-width: 420px) {
  .site-header__link:not(.router-link-exact-active) {
    display: none;
  }
}
</style>
