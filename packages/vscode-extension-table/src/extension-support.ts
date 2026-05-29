import * as vscode from 'vscode';

export type ExtensionLogger = (msg: string) => void;

export function createLogger(context: vscode.ExtensionContext): ExtensionLogger {
  const output = vscode.window.createOutputChannel('Ataula');
  context.subscriptions.push(output);

  return (msg: string) => {
    output.appendLine(`[${new Date().toISOString()}] ${msg}`);
  };
}

export function isSupportedFile(document: vscode.TextDocument): boolean {
  const fileName = document.fileName.toLowerCase();
  const langId = document.languageId;
  return (
    langId === 'edumark' ||
    langId === 'markdown' ||
    langId === 'plaintext' ||
    fileName.endsWith('.edu') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.txt')
  );
}
