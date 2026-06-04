// Minimal VS Code API mock for unit tests
// This file provides just enough of the VS Code namespace used in the extension
// tests to allow them to run in a Node environment without the real VS Code.

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(public start: Position, public end: Position) {}
}

export class Uri {
  static file(path: string) {
    return new Uri(path);
  }
  constructor(public fsPath: string) {}
}

export const workspace = {
  // openTextDocument returns a simple mock document with minimal properties
  async openTextDocument(options: { content?: string; language?: string; }) {
    const doc = {
      getText: () => options.content ?? '',
      languageId: options.language ?? 'plaintext',
      uri: Uri.file('in-memory'),
      lineCount: (options.content?.split(/\r?\n/) ?? []).length,
      // Simplified lineAt implementation
      lineAt: (line: number) => ({
        text: (options.content?.split(/\r?\n/) ?? [])[line] ?? ''
      })
    };
    return doc;
  },
  // applyEdit is a no-op that pretends the edit succeeded
  async applyEdit(_edit: any) {
    return true;
  }
};

export const window = {
  // activeTextEditor mock
  activeTextEditor: null as any,
  async showTextDocument(document: any) {
    // Return a simple editor mock
    const editor = {
      document,
      edit: async (callback: (editBuilder: any) => void) => {
        const editBuilder = {
          insert: () => {},
          replace: () => {},
          delete: () => {}
        };
        callback(editBuilder);
        return true;
      },
      selections: [] as any[]
    };
    this.activeTextEditor = editor;
    return editor;
  }
};

export const commands = {
  // registerCommand mock does nothing
  registerCommand: (command: string, callback: any) => ({ command, callback })
};

export const languages = {};

export const CancellationTokenSource = class {
  token = {};
  cancel() {}
  dispose() {}
};

export const ExtensionContext = class {};

export const extensions = { all: [] };

export const env = {};

export const debug = {};

export const OverviewRulerLane = {};

export const RelativePattern = class {};

export const TextEditorEdit = class {};

export const Selection = class {};

export const SnippetString = class {};

export const Uri = Uri;

export default {
  Position,
  Range,
  Uri,
  workspace,
  window,
  commands,
  languages,
  CancellationTokenSource,
  ExtensionContext,
  extensions,
  env,
  debug
};
