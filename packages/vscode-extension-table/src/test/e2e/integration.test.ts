// Integration test for the VS Code extension
import * as vscode from 'vscode';

suite('Extension Integration', () => {
  test('Auto‑adjust table after typing', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: "|---|\n| a | b |\n|---|",
      language: 'markdown'
    });
    const editor = await vscode.window.showTextDocument(document);
    // Insert text at column after first pipe (position 1,4)
    await editor.edit(edit => edit.insert(new vscode.Position(1, 4), 'asdf'));
    // Wait for the extension's debounce handling
    await new Promise(r => setTimeout(r, 300));
    const text = document.getText();
    const expected = "|---|\n| asdf | b |\n|---|";
    if (text !== expected) {
      throw new Error(`Unexpected document content.\nGot: ${text}\nExpected: ${expected}`);
    }
  });
});
