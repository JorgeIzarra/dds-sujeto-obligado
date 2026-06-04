import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',       // punto de entrada — no contiene lógica testeable
        'src/**/*.d.ts',
      ],
      // Umbrales: se añaden en Sesión 4 cuando haya cobertura real.
      // thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
    },
  },
});
