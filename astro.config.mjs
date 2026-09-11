import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://odaibastatueofliberty.com',
  output: 'static',
  i18n: {
    defaultLocale: 'ja',
    // zh/en/ja/ko 为完整本地化，de/nl/it 为概要本地化（英文回退，见 src/i18n/ui.ts）
    locales: ['zh', 'en', 'ja', 'ko', 'de', 'nl', 'it'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
