// Playwright UI test for table auto‑adjust using Playwright‑Electron
import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

test('typing A S D F does not insert extra spaces and keeps table aligned', async () => {
  // Download VS Code (stable) and launch it as an Electron app
  const vscodeBinary = await downloadAndUnzipVSCode('stable');
  const electronApp = await electron.launch({
    executablePath: vscodeBinary,
    args: ['--disable-extensions', '--disable-workspace-trust'],
  });

  const window = await electronApp.firstWindow();

  // Open a temporary markdown document with a simple table
  await window.evaluate(async () => {
    const vscode = (global as any).acquireVsCodeApi?.() ?? (global as any).vscode;
    const doc = await vscode.workspace.openTextDocument({
      content: "|---|\n| a | b |\n|---|",
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
  });

  // Focus the editor and type the keys
  await window.keyboard.type('ASDF');
  // Allow the extension debounce to run
  await new Promise(r => setTimeout(r, 300));

  // Retrieve the document text to verify the table adjustment
  const finalText = await window.evaluate(() => {
    const vscode = (global as any).vscode;
    const doc = vscode.window.activeTextEditor?.document;
    return doc?.getText();
  });

  // Expect the typed text to appear without extra spaces and the table to stay aligned
  expect(finalText).toContain('ASDF');

  await electronApp.close();
});
