import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  { name: 'app/files-to-lint', files: ['**/*.{ts,mts,tsx,vue}'] },
  { name: 'app/files-to-ignore', ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    name: 'app/style-overrides',
    // Règles purement esthétiques (retour à la ligne forcé par attribut/tag) qui vont à
    // l'encontre du style déjà établi dans tout le projet (attributs groupés sur une ligne
    // quand ils tiennent) -> désactivées pour ne pas imposer un reformatage de masse sans
    // rapport avec ce que le lint doit réellement attraper (bugs, incohérences).
    rules: {
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
    },
  },
)
