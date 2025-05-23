import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Definir alias para manejar importaciones problemáticas
      'bootstrap': resolve(__dirname, 'node_modules/bootstrap'),
      'react-bootstrap': resolve(__dirname, 'node_modules/react-bootstrap'),
      'react-leaflet': resolve(__dirname, 'node_modules/react-leaflet'),
    }
  }
});