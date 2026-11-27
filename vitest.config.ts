import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/config/**', 'src/utils/**', 'src/services/**', 'src/validation/**', 'api/**'],
      exclude: ['**/*.test.{ts,tsx}'],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 75,
      },
    },
  },
});
