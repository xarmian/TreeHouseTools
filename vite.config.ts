import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3006'
    }
  },
  build: {
    target: 'es2022' // Ensure this is set to 'es2020' or later
  },
  optimizeDeps: {
    include: ['ulujs'],
    esbuildOptions: {
      target: 'es2022'
    }
  }
});
