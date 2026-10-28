import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative asset paths work on GitHub Pages
  server: {
    port: 3000,
    open: true
  }
});
