import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared/types': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
