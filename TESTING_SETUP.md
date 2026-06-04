# Testing Setup Documentation

## Overview
This document describes the testing infrastructure added to the **Ataula** monorepo to ensure that the VS Code extension behaves identically in unit, integration, and end‑to‑end (E2E) environments.

## 1. New Helper & Mock
- **`packages/table-engine/src/format-table.ts`** – Thin wrapper around the existing `formatGeometricTable` function so that tests can import a stable API (`formatTable`).
- **`vscode-mock.ts`** – Minimal mock of the VS Code API used by unit tests. It provides the essential types (`window`, `workspace`, `TextEditor`, etc.) required by the extension code without pulling in the real VS Code host.

## 2. Vitest Unit Configuration
- **`vitest.unit.config.ts`** – A dedicated Vitest config that:
  - Enables global test functions (`globals: true`).
  - Includes only the unit test files under `**/packages/**/__tests__/**/*.test.ts`.
  - Excludes any E2E directories.
  - Aliases the `'vscode'` module to `vscode-mock.ts` so unit tests run in a pure Node environment.

## 3. Package Scripts
The `package.json` scripts were updated to expose clear test commands:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:unit": "vitest run --config vitest.unit.config.ts",
  "test:props": "vitest run --config vitest.props.config.ts",
  "test:e2e": "playwright test",
  "vscode:prepublish": "npm run compile --workspace=packages/vscode-extension-table",
  "test:integration": "node ./packages/vscode-extension-table/src/test/e2e/runIntegrationTests.js",
  "build": "tsc -b"
}
```
- `test:unit` runs the isolated unit suite with the mock.
- `test:e2e` runs Playwright UI tests.
- `test:integration` executes the VS Code integration tests via `@vscode/test-electron`.

## 4. Test Types Added
1. **Unit Tests** – Fast‑check property‑based tests and snapshot tests that run entirely in Node using the mock.
2. **Integration Tests** – Real VS Code host launched by `@vscode/test-electron` to verify extension commands, selections, and table auto‑adjust behaviour.
3. **E2E Tests** – Playwright tests that exercise the UI inside a headless VS Code instance.

## 5. How to Run
```bash
# Only unit tests (fast, no VS Code)
npm run test:unit

# Integration tests (real VS Code host)
npm run test:integration

# End‑to‑end UI tests
npm run test:e2e
```

## 6. Future Work
- Add missing mocks for any additional VS Code APIs used by newly added integration scenarios.
- Extend property‑based tests to cover edge‑cases discovered during manual VS Code testing.
- Automate CI pipelines to run all three test suites on each push.

---
*This file was created by Antigravity to document the testing setup for other agents and contributors.*
