"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Integration test for the VS Code extension
const vscode = __importStar(require("vscode"));
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
