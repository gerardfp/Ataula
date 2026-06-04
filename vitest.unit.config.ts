import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/packages/**/__tests__/**/*.test.ts'],
    exclude: ['**/src/test/e2e/**', '**/packages/**/src/e2e/**'],
    environment: 'node',
    alias: {
      // Use the VS Code mock for any import of 'vscode' in unit tests
      vscode: resolve(__dirname, 'vscode-mock.ts')
    }
  }
});
