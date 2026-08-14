import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: /^(?:\.\.\/|\.\/)+utils\/storage$/,
          replacement: path.resolve(__dirname, 'src/utils/storage.trusted.ts'),
        },
        {
          find: /^\.\/AddMeatCutModal$/,
          replacement: path.resolve(__dirname, 'src/components/AddMeatCutModal.trusted.tsx'),
        },
        {
          find: /^\.\/components\/AddMeatCutModal$/,
          replacement: path.resolve(__dirname, 'src/components/AddMeatCutModal.trusted.tsx'),
        },
        {
          find: '@',
          replacement: path.resolve(__dirname, '.'),
        },
      ],
    },
    build: {
      // Let Rollup choose dependency-safe chunk boundaries. The previous manual
      // vendor/react split created a circular vendor -> react-vendor -> vendor
      // dependency that could break client startup even when every asset loaded.
      chunkSizeWarningLimit: 1500,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
