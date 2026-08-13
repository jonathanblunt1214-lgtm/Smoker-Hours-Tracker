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
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/firebase/') || id.includes('firebase-admin')) return 'firebase';
            if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts';
            if (id.includes('/lucide-react/')) return 'icons';
            if (id.includes('/motion/')) return 'motion';
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor';
            return 'vendor';
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
