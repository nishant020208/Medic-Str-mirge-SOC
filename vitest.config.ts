import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/tests/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
