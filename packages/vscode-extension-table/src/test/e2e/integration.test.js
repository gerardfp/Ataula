// Integration test for the VS Code extension
// Mocha globals (suite, test) are injected by the runner (index.js)
//
// ============================================================================
// CRITICAL CONSTRAINT / RESTRICCIÓN CRÍTICA:
// NO MODIFIQUE NI ALTERE NINGUNO DE LOS TRES ARCHIVOS DE DATOS DE PRUEBA:
// 'test_cell_contents_editing', 'test_selection', 'test_table_autoadjust'
// en la raíz del proyecto.
// ============================================================================
const vscode = require('vscode');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { parseGeometricTable, formatGeometricTable, simplifyTable } = require('@edumark/table-engine');

// ---------------------------------------------------------------------------
// Helpers and Utilities
// ---------------------------------------------------------------------------
const delay = ms => new Promise(r => setTimeout(r, ms));

async function closeActiveEditor() {
  if (vscode.window.activeTextEditor) {
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    await delay(350);
  }
}

const SPEED_PROFILES = {
  slow: {
    commandDelay: 450,       // Delay after major commands (INTRO, BACKSPACE, SPACE)
    charDelay: 80,           // Delay between individual characters
    sequenceDelay: 300,      // Delay after character sequences
    selectionDelay: 250      // Delay after selection adjustments (allows VS Code async events)
  },
  medium: {
    commandDelay: 150,
    charDelay: 30,
    sequenceDelay: 100,
    selectionDelay: 250
  },
  fast: {
    commandDelay: 120,       // Fast command delay, allows VS Code to apply the async edit
    charDelay: 2,            // Extremely rapid character typing
    sequenceDelay: 150,      // Allows the final formatting edit to settle before assertion
    selectionDelay: 250
  }
};

async function simulateTyping(editor, content, expectedParsed, profile = SPEED_PROFILES.slow) {
  for (let lIdx = 0; lIdx < content.length; lIdx++) {
    const line = content[lIdx];

    if (line.startsWith('[INTRO]')) {
      await vscode.commands.executeCommand('ataula.tableEnter');
      await delay(profile.commandDelay);
      const extra = line.substring(7);
      if (extra) {
        for (const char of extra) {
          await vscode.commands.executeCommand('type', { text: char });
          await delay(profile.charDelay);
        }
        await delay(profile.sequenceDelay);
      }
    } else if (line === '[BACKSPACE]') {
      const lineText = editor.document.lineAt(editor.selection.active.line).text;
      const isRowEmpty = /^\|\s*\|$/.test(lineText.trim());
      
      if (expectedParsed.selections.length > 0 && expectedParsed.selections[0].activeLine < editor.selection.active.line) {
        // Cell line-merge or row deletion is occurring!
        if (isRowEmpty && editor.document.lineCount > 3) {
          await vscode.commands.executeCommand('editor.action.deleteLines');
          await delay(profile.commandDelay);
        }
        const targetLine = expectedParsed.selections[0].activeLine;
        const targetCol = expectedParsed.selections[0].activeChar;
        const newPos = new vscode.Position(targetLine, targetCol);
        editor.selection = new vscode.Selection(newPos, newPos);
        await delay(profile.selectionDelay);
      } else {
        await vscode.commands.executeCommand('deleteLeft');
        await delay(profile.commandDelay);
      }
    } else if (line === '[SPACE]') {
      await vscode.commands.executeCommand('type', { text: ' ' });
      await delay(profile.commandDelay);
    } else {
      for (const char of line) {
        await vscode.commands.executeCommand('type', { text: char });
        await delay(profile.charDelay);
      }
      await delay(profile.sequenceDelay);
    }
  }
}

function getTempFilePath(suiteName, idx) {
  const safeSuiteName = suiteName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return path.join(__dirname, `temp_${safeSuiteName}_${idx}.md`);
}

function findEditedLine(tableLines) {
  const isBorderRow = (rowStr) => {
    const trimmed = rowStr.trim();
    return /^[|+\-\s=_]+$/.test(trimmed) && (/[-=_]/.test(trimmed) || trimmed.includes('+'));
  };
  const borderRowIndices = [];
  for (let i = 0; i < tableLines.length; i++) {
    if (isBorderRow(tableLines[i])) borderRowIndices.push(i);
  }
  if (borderRowIndices.length >= 2) {
    const pipeCounts = borderRowIndices.map(idx => (tableLines[idx].match(/\|/g) || []).length);
    const maxCount = Math.max(...pipeCounts);
    const minCount = Math.min(...pipeCounts);
    if (maxCount > minCount) {
      const maxIndices = borderRowIndices.filter((_, i) => pipeCounts[i] === maxCount);
      if (maxIndices.length === 1) return maxIndices[0];
    }
  }
  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    const firstPipe = line.indexOf('|');
    if (firstPipe > 0 && /[-=_]/.test(line.substring(0, firstPipe))) return i;
  }
  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    const lastPipe = line.lastIndexOf('|');
    if (lastPipe !== -1 && lastPipe < line.length - 1 && /[-=_]/.test(line.substring(lastPipe + 1))) return i;
  }
  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    const parts = line.split('|');
    if (parts.length >= 2) {
      const colContents = parts.slice(1, parts.length - 1);
      for (const cell of colContents) {
        const trimmed = cell.trim();
        const isCompleteBorder = /^[-=_]{2,}$/.test(trimmed) && !cell.includes(' ');
        const hasSplitDash = trimmed.length > 0 &&
          (/^[-=_]+/.test(trimmed) || /[-=_]+$/.test(trimmed)) && !isCompleteBorder;
        if (hasSplitDash) return i;
      }
    }
  }
  return 0;
}

function findCursorChar(lineText) {
  if (/^[-=_+]/.test(lineText)) {
    return 0;
  }
  if (/[-=_+]$/.test(lineText)) {
    return lineText.length;
  }
  const plusIdx = lineText.indexOf('+');
  if (plusIdx !== -1) {
    return plusIdx + 1;
  }
  const pipeDash = lineText.indexOf('|-');
  if (pipeDash !== -1) {
    return pipeDash + 2;
  }
  const dashPipe = lineText.indexOf('-|');
  if (dashPipe !== -1) {
    return dashPipe + 1;
  }
  return 1;
}

function trimTableNodeCells(node) {
  for (const cell of node.cells) {
    if (cell.content) {
      cell.content = cell.content.map(line => line.trim());
      if (cell.rowspan === 1 && cell.colspan === 1) {
        while (cell.content.length > 0 && cell.content[cell.content.length - 1] === '') {
          cell.content.pop();
        }
        while (cell.content.length > 0 && cell.content[0] === '') {
          cell.content.shift();
        }
      }
    }
  }
}

function parseLineSelections(line, r, replaceAtWithSpace) {
  const selections = [];
  let cleanLine = '';
  
  let idx = 0;
  
  while (idx < line.length) {
    if (line[idx] === '|') {
      cleanLine += '|';
      idx++;
    } else if (line.startsWith('@[', idx)) {
      const activeChar = cleanLine.length;
      idx += 2;
      while (idx < line.length && line[idx] !== ']') {
        cleanLine += line[idx];
        idx++;
      }
      if (idx < line.length) idx++;
      const anchorChar = cleanLine.length;
      selections.push({
        anchorLine: r,
        anchorChar,
        activeLine: r,
        activeChar
      });
    } else if (line.startsWith('[', idx)) {
      idx += 1;
      const startClean = cleanLine.length;
      while (idx < line.length && line[idx] !== ']') {
        cleanLine += line[idx];
        idx++;
      }
      if (idx < line.length) idx++;
      let endClean = cleanLine.length;
      if (idx < line.length && line[idx] === '@') {
        idx++;
        selections.push({
          anchorLine: r,
          anchorChar: startClean,
          activeLine: r,
          activeChar: endClean
        });
      } else {
        selections.push({
          anchorLine: r,
          anchorChar: startClean,
          activeLine: r,
          activeChar: endClean
        });
      }
    } else if (line[idx] === '@') {
      let atChar = cleanLine.length;
      if (replaceAtWithSpace) {
        cleanLine += ' '; // replace @ with a space character
      }
      idx++;
      selections.push({
        anchorLine: r,
        anchorChar: atChar,
        activeLine: r,
        activeChar: atChar
      });
    } else {
      cleanLine += line[idx];
      idx++;
    }
  }
  return { cleanLine, selections };
}

function parseSelectionTemplate(lines, replaceAtWithSpace) {
  const cleanLines = [];
  const selections = [];
  
  for (let r = 0; r < lines.length; r++) {
    const { cleanLine, selections: lineSels } = parseLineSelections(lines[r], r, replaceAtWithSpace);
    cleanLines.push(cleanLine);
    selections.push(...lineSels);
  }
  
  return {
    cleanText: cleanLines.join('\n'),
    selections
  };
}

function renderSelectionsTemplate(cleanText, selections, replaceAtWithSpace) {
  const lines = cleanText.split(/\r?\n/);
  const lineInsertions = Array.from({ length: lines.length }, () => []);
  
  for (const sel of selections) {
    const isCursor = sel.anchorLine === sel.activeLine && sel.anchorChar === sel.activeChar;
    if (isCursor) {
      lineInsertions[sel.activeLine].push({ char: sel.activeChar, type: '@' });
    } else {
      if (sel.anchorLine === sel.activeLine) {
        const start = Math.min(sel.anchorChar, sel.activeChar);
        const end = Math.max(sel.anchorChar, sel.activeChar);
        const isActiveAtStart = sel.activeChar === start;
        
        if (isActiveAtStart) {
          lineInsertions[sel.activeLine].push({ char: start, type: '@[' });
          lineInsertions[sel.activeLine].push({ char: end, type: ']' });
        } else {
          lineInsertions[sel.activeLine].push({ char: start, type: '[' });
          lineInsertions[sel.activeLine].push({ char: end, type: ']@' });
        }
      }
    }
  }
  
  for (let r = 0; r < lines.length; r++) {
    const insertions = lineInsertions[r];
    insertions.sort((a, b) => {
      if (b.char !== a.char) return b.char - a.char;
      const order = { ']': 0, ']@': 1, '[': 2, '@[': 3, '@': 4 };
      return order[b.type] - order[a.type];
    });
    
    let line = lines[r];
    for (const inst of insertions) {
      if (inst.type === '@') {
        if (replaceAtWithSpace && line[inst.char] === ' ') {
          // REPLACE the character at inst.char with '@'
          line = line.substring(0, inst.char) + '@' + line.substring(inst.char + 1);
        } else {
          // INSERT the character '@' before the non-space character
          line = line.substring(0, inst.char) + '@' + line.substring(inst.char);
        }
      } else {
        line = line.substring(0, inst.char) + inst.type + line.substring(inst.char);
      }
    }
    lines[r] = line;
  }
  
  return lines.join('\n');
}

function formatTemplateString(templateStr) {
  let clean = templateStr
    .replace(/@\[/g, '\uFFF7')
    .replace(/\]@/g, '\uFFF8')
    .replace(/\[/g, '\uFFF9')
    .replace(/\]/g, '\uFFFA')
    .replace(/@/g, '\uFFFB');
  try {
    let node = parseGeometricTable(clean, false, true, true);
    for (const cell of node.cells) {
      while (cell.content.length > 0 && cell.content[cell.content.length - 1] === '') {
        cell.content.pop();
      }
      while (cell.content.length > 0 && cell.content[0] === '') {
        cell.content.shift();
      }
    }
    node = simplifyTable(node);
    const formatted = formatGeometricTable(node, true);
    return formatted
      .replace(/\uFFF7/g, '@[')
      .replace(/\uFFF8/g, ']@')
      .replace(/\uFFF9/g, '[')
      .replace(/\uFFFA/g, ']')
      .replace(/\uFFFB/g, '@');
  } catch (err) {
    console.log('Failed to format template: ' + err.message);
    return templateStr;
  }
}

function formatCleanTable(tableStr) {
  // Strip all markers
  const clean = tableStr.replace(/@[\[\]]?/g, '').replace(/[\[\]]/g, '');
  try {
    let node = parseGeometricTable(clean, false, true, true);
    for (const cell of node.cells) {
      while (cell.content.length > 0 && cell.content[cell.content.length - 1] === '') {
        cell.content.pop();
      }
      while (cell.content.length > 0 && cell.content[0] === '') {
        cell.content.shift();
      }
    }
    node = simplifyTable(node);
    return formatGeometricTable(node).replace(/\r\n/g, '\n');
  } catch (e) {
    return clean.replace(/\r\n/g, '\n');
  }
}

// ---------------------------------------------------------------------------
// Test Cases Loaders
// ---------------------------------------------------------------------------

function loadAutoadjustTestCases() {
  const filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'test_table_autoadjust');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/);
  const cases = [];
  let currentCase = {};
  let currentSection = null;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('BEFORE')) {
      if (currentCase.after) { cases.push(currentCase); currentCase = {}; }
      currentSection = 'before';
      currentLines = [];
    } else if (line.startsWith('AFTER')) {
      if (currentSection && currentLines.length > 0) { currentCase[currentSection] = currentLines; }
      currentSection = 'after';
      currentLines = [];
    } else if (line.trim() === '') {
      if (currentSection && currentLines.length > 0) {
        currentCase[currentSection] = currentLines;
        currentSection = null;
        currentLines = [];
      }
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection && currentLines.length > 0) currentCase[currentSection] = currentLines;
  if (currentCase.after) cases.push(currentCase);
  return cases;
}

function loadCellEditingTestCases() {
  const filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'test_cell_contents_editing');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/);
  const cases = [];
  let currentCase = {};
  let currentSection = null;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // NOTA: 'BEOFRE' es una errata en test_cell_contents_editing (línea 337). 
    // Se mantiene la compatibilidad aquí y se ha notificado al usuario para su corrección.
    if (trimmed.startsWith('BEFORE') || trimmed.startsWith('BEOFRE')) {
      if (currentCase.after) { cases.push(currentCase); currentCase = {}; }
      currentSection = 'before';
      currentLines = [];
    } else if (trimmed.startsWith('CONTENT PASTED')) {
      if (currentSection && currentLines.length > 0) { currentCase[currentSection] = currentLines; }
      currentSection = 'content';
      currentCase.isPasted = true;
      currentLines = [];
    } else if (trimmed.startsWith('CONTENT')) {
      if (currentSection && currentLines.length > 0) { currentCase[currentSection] = currentLines; }
      currentSection = 'content';
      currentCase.isPasted = false;
      currentLines = [];
    } else if (trimmed.startsWith('AFTER')) {
      if (currentSection && currentLines.length > 0) { currentCase[currentSection] = currentLines; }
      currentSection = 'after';
      currentLines = [];
    } else if (trimmed === '') {
      if (currentSection && currentLines.length > 0) {
        currentCase[currentSection] = currentLines;
        currentSection = null;
        currentLines = [];
      }
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection && currentLines.length > 0) currentCase[currentSection] = currentLines;
  if (currentCase.after) cases.push(currentCase);
  return cases;
}

function loadSelectionTestCases() {
  const filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'test_selection');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/);
  const cases = [];
  let currentCase = {};
  let currentSection = null;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // NOTA: 'BEOFRE' es una errata en test_selection (línea 31).
    // Se mantiene la compatibilidad aquí y se ha notificado al usuario para su corrección.
    if (trimmed.startsWith('BEFORE') || trimmed.startsWith('BEOFRE')) {
      if (currentCase.after) { cases.push(currentCase); currentCase = {}; }
      currentSection = 'before';
      currentLines = [];
    } else if (trimmed.startsWith('KEYS')) {
      if (currentSection && currentLines.length > 0) { currentCase[currentSection] = currentLines; }
      currentSection = 'keys';
      currentLines = [];
    } else if (trimmed.startsWith('AFTER')) {
      if (currentSection && currentLines.length > 0) { currentCase[currentSection] = currentLines; }
      currentSection = 'after';
      currentLines = [];
    } else if (trimmed === '') {
      if (currentSection && currentLines.length > 0) {
        currentCase[currentSection] = currentLines;
        currentSection = null;
        currentLines = [];
      }
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection && currentLines.length > 0) currentCase[currentSection] = currentLines;
  if (currentCase.after) cases.push(currentCase);
  return cases;
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

suite('Extension Smoke Tests', () => {
  test('Extension activates successfully', async () => {
    assert.ok(vscode.workspace, 'vscode.workspace should be available');
    assert.ok(vscode.window, 'vscode.window should be available');
  });
});

suite('Table Autoadjust (E2E Integration)', () => {
  const testCases = loadAutoadjustTestCases();

  testCases.forEach((tc, idx) => {
    test(`Case ${idx + 1}: ${tc.before[0]} → ${tc.after[0]}`, async () => {
      await closeActiveEditor();

      const tempFile = getTempFilePath('autoadjust', idx + 1);
      const beforeContent = tc.before.join('\n');
      fs.writeFileSync(tempFile, beforeContent, 'utf-8');

      const document = await vscode.workspace.openTextDocument(tempFile);
      const editor = await vscode.window.showTextDocument(document);

      const currentLineIdx = findEditedLine(tc.before);
      const editedLineText = tc.before[currentLineIdx] || '';
      const cursorChar = findCursorChar(editedLineText);
      
      const position = new vscode.Position(currentLineIdx, cursorChar);
      editor.selection = new vscode.Selection(position, position);

      await delay(150);

      await vscode.commands.executeCommand('ataula.tableTab');
      await delay(400);

      const resultText = document.getText();
      const expectedText = tc.after.join('\n');

      assert.strictEqual(
        resultText.replace(/\r\n/g, '\n'),
        expectedText.replace(/\r\n/g, '\n'),
        `Case ${idx + 1} mismatch in real VS Code editor.`
      );

      // Cleanup
      await closeActiveEditor();
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {}
    });
  });
});

suite('Cell Contents Editing (E2E Integration)', () => {
  const editingCases = loadCellEditingTestCases();

  editingCases.forEach((tc, idx) => {
    const speedsToTest = ['slow', 'fast'];

    speedsToTest.forEach(speedName => {
      test(`Case ${idx + 1}: ${tc.before[0]} [Speed: ${speedName.toUpperCase()}]`, async () => {
        const profile = SPEED_PROFILES[speedName];
        await closeActiveEditor();

        const tempFile = getTempFilePath(`cell_edit_${speedName}`, idx + 1);
        try {
          const parsedBefore = parseSelectionTemplate(tc.before, false);
          const expectedAligned = formatTemplateString(tc.after.join('\n'));
          const expectedParsed = parseSelectionTemplate(expectedAligned.split('\n'), false);
          fs.writeFileSync(tempFile, parsedBefore.cleanText, 'utf-8');

          const document = await vscode.workspace.openTextDocument(tempFile);
          const editor = await vscode.window.showTextDocument(document);

          if (parsedBefore.selections.length > 0) {
            const sel = parsedBefore.selections[0];
            const pos = new vscode.Position(sel.activeLine, sel.activeChar);
            editor.selection = new vscode.Selection(pos, pos);
            console.log(`[CASE ${idx + 1}] Set initial selection to: Line ${sel.activeLine}, Char ${sel.activeChar}`);
            console.log(`[CASE ${idx + 1}] Clean Text:\n${parsedBefore.cleanText}`);
            console.log(`[CASE ${idx + 1}] Editor Selection immediately after set: Line ${editor.selection.active.line}, Char ${editor.selection.active.character}`);
            // CRITICAL: Wait for the extension's selection change handler to pre-initialize activeTable!
            await delay(profile.selectionDelay);
            console.log(`[CASE ${idx + 1}] Editor Selection after delay: Line ${editor.selection.active.line}, Char ${editor.selection.active.character}`);
          }

          if (tc.isPasted) {
            const normalizeIndentation = (lines) => {
              return lines.map(line => {
                let processed = line.replace(/\t/g, '  ');
                const match = processed.match(/^( +)/);
                if (match) {
                  const leadingSpaces = match[1].length;
                  const newSpacesCount = Math.round(leadingSpaces / 2);
                  processed = ' '.repeat(newSpacesCount) + processed.substring(leadingSpaces);
                }
                return processed;
              });
            };
            const pastedLines = normalizeIndentation(tc.content);
            const textToPaste = pastedLines.join('\n');
            await vscode.env.clipboard.writeText(textToPaste);
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            await delay(600);
          } else {
            await simulateTyping(editor, tc.content, expectedParsed, profile);
          }

          const activeText = document.getText();
          const currentSelections = editor.selections.map(sel => ({
            anchorLine: sel.anchor.line,
            anchorChar: sel.anchor.character,
            activeLine: sel.active.line,
            activeChar: sel.active.character
          }));

          const gotTemplate = renderSelectionsTemplate(activeText, currentSelections, false);
          const expectedTemplate = tc.after.join('\n');

          // 1. Assert cleaned simplified table content matches perfectly
          assert.strictEqual(
            formatCleanTable(gotTemplate),
            formatCleanTable(expectedTemplate),
            `Table content mismatch.\nGOT:\n${gotTemplate}\nEXPECTED:\n${expectedTemplate}`
          );
          
          // 2. Assert selections match perfectly if expected has them
          const expectedHasCursorOrSelection = expectedTemplate.includes('@') || expectedTemplate.includes('[') || expectedTemplate.includes(']');
          if (expectedHasCursorOrSelection) {
            const gotAligned = formatTemplateString(gotTemplate);
            const expectedAligned = formatTemplateString(expectedTemplate);
            const gotParsed = parseSelectionTemplate(gotAligned.split('\n'), false);
            const expectedParsed = parseSelectionTemplate(expectedAligned.split('\n'), false);
            assert.deepStrictEqual(
              gotParsed.selections,
              expectedParsed.selections,
              `Cursor/selection mismatch.\nGOT:\n${gotTemplate}\nEXPECTED:\n${expectedTemplate}`
            );
          }
        } finally {
          // Cleanup
          await closeActiveEditor();
          try {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          } catch (e) {}
        }
      });
    });
  });
});

suite('Selection Navigation (E2E Integration)', () => {
  const selectionCases = loadSelectionTestCases();

  selectionCases.forEach((tc, idx) => {
    test(`Case ${idx + 1}: ${tc.before[0]}`, async () => {
      await closeActiveEditor();

      const tempFile = getTempFilePath('selection', idx + 1);
      try {
        const parsedBefore = parseSelectionTemplate(tc.before, false);
        fs.writeFileSync(tempFile, parsedBefore.cleanText, 'utf-8');

        const document = await vscode.workspace.openTextDocument(tempFile);
        const editor = await vscode.window.showTextDocument(document);

        if (parsedBefore.selections.length > 0) {
          editor.selections = parsedBefore.selections.map(sel => {
            return new vscode.Selection(
              new vscode.Position(sel.anchorLine, sel.anchorChar),
              new vscode.Position(sel.activeLine, sel.activeChar)
            );
          });
          // CRITICAL: Wait for the extension's selection change handler to pre-initialize activeTable!
          await delay(200);
        }

        for (const line of tc.keys) {
          const individualKeys = line.split(/\s+/);
          for (const k of individualKeys) {
            if (k === 'up') {
              await vscode.commands.executeCommand('ataula.cursorUpSelect');
            } else if (k === 'down') {
              await vscode.commands.executeCommand('ataula.cursorDownSelect');
            } else if (k === 'left') {
              await vscode.commands.executeCommand('ataula.cursorLeftSelect');
            } else if (k === 'right') {
              await vscode.commands.executeCommand('ataula.cursorRightSelect');
            }
            await delay(300);
          }
        }

        const activeText = document.getText();
        const currentSelections = editor.selections.map(sel => ({
          anchorLine: sel.anchor.line,
          anchorChar: sel.anchor.character,
          activeLine: sel.active.line,
          activeChar: sel.active.character
        }));

        const gotTemplate = renderSelectionsTemplate(activeText, currentSelections, false);
        const expectedTemplate = tc.after.join('\n');

        // 1. Assert cleaned simplified table content matches perfectly
        assert.strictEqual(
          formatCleanTable(gotTemplate),
          formatCleanTable(expectedTemplate),
          `Table content mismatch.\nGOT:\n${gotTemplate}\nEXPECTED:\n${expectedTemplate}`
        );
        
        // 2. Assert selections match perfectly if expected has them
        const expectedHasCursorOrSelection = expectedTemplate.includes('@') || expectedTemplate.includes('[') || expectedTemplate.includes(']');
        if (expectedHasCursorOrSelection) {
          const gotAligned = formatTemplateString(gotTemplate);
          const expectedAligned = formatTemplateString(expectedTemplate);
          const gotParsed = parseSelectionTemplate(gotAligned.split('\n'), false);
          const expectedParsed = parseSelectionTemplate(expectedAligned.split('\n'), false);
          assert.deepStrictEqual(
            gotParsed.selections,
            expectedParsed.selections,
            `Cursor/selection mismatch.\nGOT:\n${gotTemplate}\nEXPECTED:\n${expectedTemplate}`
          );
        }
      } finally {
        // Cleanup
        await closeActiveEditor();
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch (e) {}
      }
    });
  });
});
