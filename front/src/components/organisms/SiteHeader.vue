<script setup lang="ts">
import BrandLogo from '../molecules/BrandLogo.vue'
import InstallButton from '../molecules/InstallButton.vue'
import SiteNav from '../molecules/SiteNav.vue'
</script>

<template>
  <header class="site-header">
    <div class="container site-header__bar">
      <RouterLink to="/" class="site-header__brand" aria-label="AbSante — accueil">
        <BrandLogo />
      </RouterLink>

      <div class="site-header__actions">
        <SiteNav />
        <InstallButton />
      </div>
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
  text-decoration: none;
}

.site-header__brand:focus-visible {
  outline-color: #fff;
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
