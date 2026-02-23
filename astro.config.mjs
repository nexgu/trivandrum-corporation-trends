// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
// https://astro.build/config
export default defineConfig({
  site: 'https://nexgu.github.io',
  base: process.env.NODE_ENV === 'production' ? '/trivandrum-corporation-trends' : '/',
  vite: {
    plugins: [tailwindcss()]
  }
});