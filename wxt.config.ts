import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '#components': path.resolve(process.cwd(), 'components'),
        '#utils': path.resolve(process.cwd(), 'utils'),
      },
    },
  }),
  manifest: {
    name: 'LangFix',
    description: 'Open-source AI-powered writing assistant',
    permissions: ['storage', 'contextMenus'],
  },
});
