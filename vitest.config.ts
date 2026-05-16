import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src/renderer'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/renderer/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'out/**',
        'node_modules/**',
        'resources/**',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/renderer/App.tsx',
        'src/renderer/assets/**',
        'src/renderer/assets.d.ts',
        'src/renderer/components/ui/**',
        'src/renderer/features/entity-mentions.ts',
        'src/renderer/index.html',
        'src/renderer/lib/api.ts',
        'src/renderer/main.tsx',
        'src/renderer/vite-env.d.ts',
      ],
      thresholds: {
        statements: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
