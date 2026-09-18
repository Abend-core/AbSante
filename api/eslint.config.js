import tseslint from 'typescript-eslint'

export default tseslint.config(
  { name: 'api/files-to-ignore', ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
)
