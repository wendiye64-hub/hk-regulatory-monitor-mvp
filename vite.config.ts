import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Otherwise watch, but ignore env files: the hosting environment rewrites
      // .env.development.local frequently, and Vite does a full server restart on
      // any env-file change, which causes a restart loop and preview flickering.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {ignored: ['**/.env', '**/.env.*']},
    },
  };
});
