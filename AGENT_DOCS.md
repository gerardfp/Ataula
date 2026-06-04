# Test Suite & CI Extensions – Documentation for Agents

## Overview
This repository now contains a comprehensive testing strategy that ensures the VS Code extension behaves identically in the real editor environment as the unit tests indicate.

### New test categories
1. **VS Code integration tests** – run inside a real VS Code instance using `@vscode/test‑electron`.
   - `packages/vscode-extension-table/src/test/e2e/integration.test.ts`
   - `packages/vscode-extension-table/src/test/e2e/runIntegrationTests.ts`
2. **Playwright end‑to‑end UI tests** – launch VS Code as an Electron app and simulate typing.
   - `playwright.config.ts` (global config)
   - `src/test/e2e/playwright/table-ui.test.ts` (full implementation)
3. **Property‑based tests** – random table generation with `fast‑check`.
   - `packages/table-engine/src/__tests__/parser.props.test.ts`
4. **Snapshot tests** – Jest snapshots for formatted tables.
   - `packages/table-engine/src/__tests__/format.snapshot.test.ts`

### CI workflow
- New workflow file `.github/workflows/ci.yml` runs on Windows for every push/PR.
- Steps include unit, integration, Playwright, and property‑based tests.

### Package scripts (`package.json`)
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "vscode:prepublish": "npm run compile --workspace=packages/vscode-extension-table",
  "test:integration": "node ./packages/vscode-extension-table/src/test/e2e/runIntegrationTests.js",
  "test:e2e": "playwright test",
  "test:props": "vitest run --config=vitest.props.config.ts"
}
```
These scripts are now available for any automation agent.

## How to run locally
```bash
# Install dependencies (if not already)
npm ci
# Build all packages	npm run build
# Run unit tests
npm test
# Run VS Code integration tests
npm run test:integration
# Run Playwright UI tests
npm run test:e2e
# Run property‑based tests
npm run test:props
```
All commands should succeed on a Windows machine (the repository is configured for Windows CI).

## Files added / modified
| File | Type | Reason |
|------|------|--------|
| `packages/vscode-extension-table/src/test/e2e/integration.test.ts` | New test | Verify auto‑adjust after typing in real VS Code.
| `packages/vscode-extension-table/src/test/e2e/runIntegrationTests.ts` | New script | Launch integration tests via `@vscode/test‑electron`.
| `playwright.config.ts` | New config | Playwright settings for E2E tests.
| `src/test/e2e/playwright/table-ui.test.ts` | Updated (full impl) | Real VS Code launch + typing simulation.
| `packages/table-engine/src/__tests__/parser.props.test.ts` | New test | Property‑based verification.
| `packages/table-engine/src/__tests__/format.snapshot.test.ts` | New test | Snapshot of formatted tables.
| `.github/workflows/ci.yml` | New workflow | CI execution of all test suites.
| `package.json` (scripts) | Modified | Add commands for new tests.

---
*This file is intended for other autonomous agents to quickly understand the new testing infrastructure and to know which scripts to invoke.*

## Table Editing Rules Directive

> [!IMPORTANT]
> The source of truth for all table engine and editor editing behaviors is located in [table_rules.md](file:///c:/Users/gerard/Desktop/edumono/ataula/table_rules.md).
> All autonomous agents and extension modifications MUST strictly follow these rules:
> 1. **No Unexpected Topology Changes during Content Editing**: Editing cell content MUST NEVER change the table topology (rows, columns, rowspans, colspans). Topology is ONLY modified through layout editing mode (`[º]`).
> 2. **Layout Intent Detection**: Typing `-` or `|` immediately adjacent to a table line (boundary) is a layout modification intent, NOT content editing. The cell MUST NOT auto-resize and no cell padding should be added.
> 3. **Feedback Loop**: If any rule in `table_rules.md` or any test case in `test_*` is found to be logically flawed, inconsistent, or incorrect, you MUST NOT change the rules or test files yourself. Instead, raise it immediately as a feedback item to the user so they can correct it or direct you on what to do.
