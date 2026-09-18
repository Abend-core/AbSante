<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../atoms/AppIcon.vue'
import ExternalLink from '../atoms/ExternalLink.vue'
import LinkButton from '../atoms/LinkButton.vue'
import BrandLogo from '../molecules/BrandLogo.vue'
import InfoDialog from '../molecules/InfoDialog.vue'
import InfoList from '../molecules/InfoList.vue'
import { FOOTER_DIALOGS, REPO_URL, TAGLINE, TEAM_NAME } from '../../content/footer-content'

const year = computed(() => new Date().getFullYear())

/** Une seule fenêtre ouverte à la fois ; chaque lien du pied de page ouvre la sienne. */
const openId = ref<string | null>(null)
function setOpen(id: string, open: boolean) {
  if (open) openId.value = id
  else if (openId.value === id) openId.value = null
}
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__top">
        <div class="site-footer__about">
          <BrandLogo :size="28" />
          <p>{{ TAGLINE }}</p>
        </div>

        <nav aria-label="Informations">
          <ul class="site-footer__links">
            <li v-for="dialog in FOOTER_DIALOGS" :key="dialog.id">
              <LinkButton @click="openId = dialog.id">{{ dialog.label }}</LinkButton>
            </li>
          </ul>
        </nav>
      </div>

      <div class="site-footer__bottom">
        <p>© {{ year }} AbSante · Un projet de l'équipe {{ TEAM_NAME }}</p>
        <!-- Discret : ne concerne que les utilisateurs techniques. -->
        <ExternalLink :href="REPO_URL" class="site-footer__code"><AppIcon name="github" :size="14" />Code source</ExternalLink>
      </div>
    </div>

    <InfoDialog
      v-for="dialog in FOOTER_DIALOGS"
      :key="dialog.id"
      :title="dialog.title"
      :model-value="openId === dialog.id"
      @update:model-value="setOpen(dialog.id, $event)"
    >
      <InfoList :items="dialog.items" />
    </InfoDialog>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 3rem;
  padding-block: 2rem 1.25rem;
  background: var(--navy-deep);
  color: var(--on-navy-muted);
  font-size: 0.88rem;
}

.site-footer__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem 2rem;
}

.site-footer__about {
  display: grid;
  gap: 0.5rem;
}

.site-footer__about p {
  max-width: 34ch;
}

.site-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1.75rem;
  margin: 0;
  padding: 0;
  color: var(--on-navy);
  list-style: none;
}

.site-footer__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.8rem;
}

.site-footer__code {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--on-navy-muted);
  opacity: 0.75;
  text-decoration: none;
}

.site-footer__code:hover {
  color: #fff;
  opacity: 1;
}

.site-footer__code:focus-visible {
  outline-color: #fff;
}
</style>
