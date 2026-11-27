import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/utils/**',
        'src/services/**',
        'src/validation/**',
        'api/**',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 75,
      },
    },
  },
});
