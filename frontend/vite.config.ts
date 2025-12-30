import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // This forces Vite to bundle these libraries into a single file
    // preventing the "ERR_INSUFFICIENT_RESOURCES" crash
    include: ['lucide-react'],
  },
});