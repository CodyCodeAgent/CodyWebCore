import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@codycodeagent/cody-web-core/conversation': resolve(import.meta.dirname, '../core/dist/conversation/index.js'),
      '@codycodeagent/cody-web-core/composer': resolve(import.meta.dirname, '../core/dist/composer/index.js'),
      '@codycodeagent/cody-web-core/presentation': resolve(import.meta.dirname, '../core/dist/presentation/index.js'),
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    // Keep renderer dependencies external: applications install the package's
    // declared dependencies, while the core release stays small and versionable.
    rollupOptions: {
      external: (id) => id === 'vue'
        || id === 'dompurify'
        || id === 'markdown-it'
        || id === 'markdown-it-footnote'
        || id === 'markdown-it-task-lists'
        || id === 'mermaid'
        || id.startsWith('highlight.js/'),
    },
  },
})
