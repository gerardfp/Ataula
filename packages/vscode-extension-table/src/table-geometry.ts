import * as vscode from 'vscode';
import { parseGeometricTable } from '@edumark/table-engine';
import { TableCell, TableNode } from '@edumark/shared';

export interface CellPositionInfo {
  cell: TableCell;
  startLineIdx: number;
  endLineIdx: number;
  hLines: number[];
  vLines: number[];
  tableNode: TableNode;
  r: number;
  c: number;
  j: number;
  i: number;
}

export function getLineBoundaryPos(lineText: string, vLines: number[]): number[] {
  const lineVLines: number[] = [];
  for (let colIdx = 0; colIdx < lineText.length; colIdx++) {
    if (lineText[colIdx] === '|') {
      lineVLines.push(colIdx);
    }
  }

  const boundaryPos = Array(vLines.length).fill(-1);
  if (lineVLines.length >= 2 && vLines.length >= 2) {
    boundaryPos[0] = lineVLines[0];
    boundaryPos[vLines.length - 1] = lineVLines[lineVLines.length - 1];
    for (let k = 1; k < lineVLines.length - 1; k++) {
      const s = lineVLines[k];
      let closestIdx = 1;
      let minDiff = Math.abs(s - vLines[1]);
      for (let idx = 2; idx < vLines.length - 1; idx++) {
        const diff = Math.abs(s - vLines[idx]);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      }
      boundaryPos[closestIdx] = s;
    }
  }
  return boundaryPos;
}

export function isCellSplittingRow(lineText: string): boolean {
  const trimmed = lineText.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  const parts = trimmed.split('|');
  const colContents = parts.slice(1, parts.length - 1);

  let hasSplitDash = false;
  let hasNonBorderCell = false;

  for (const cell of colContents) {
    const trimmedCell = cell.trim();
    if (trimmedCell.length > 0) {
      const isCompleteBorder = /^[-=_]+$/.test(trimmedCell) && !cell.includes(' ');
      const isSplit = (/^[-=_]+/.test(trimmedCell) || /[-=_]+$/.test(trimmedCell)) && !isCompleteBorder;
      if (isSplit) {
        hasSplitDash = true;
      }
      if (!isCompleteBorder) {
        hasNonBorderCell = true;
      }
    } else {
      hasNonBorderCell = true;
    }
  }

  return hasSplitDash && hasNonBorderCell;
}

export function isPartialBorderRow(text: string): boolean {
  if (isCellSplittingRow(text)) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith('|')) return false;
  if (!/^[|+\-\s=_]+$/.test(trimmed)) return false;
  if (!/[-=_]/.test(trimmed)) return false;
  if (!trimmed.endsWith('|')) return true;

  if (/\| \s*[-=_]/.test(trimmed) || /\|[-=_]\s+/.test(trimmed) || /\s+[-=_]\s*\|/.test(trimmed)) {
    return true;
  }

  return false;
}

export function getCellAtPosition(document: vscode.TextDocument, position: vscode.Position): CellPositionInfo | undefined {
  const currentLineIdx = position.line;
  const currentLineText = document.lineAt(currentLineIdx).text;

  if (!currentLineText.trim().startsWith('|')) return undefined;

  let startLineIdx = currentLineIdx;
  while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith('|')) {
    startLineIdx--;
  }

  let endLineIdx = currentLineIdx;
  while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith('|')) {
    endLineIdx++;
  }

  const tableLines: string[] = [];
  for (let l = startLineIdx; l <= endLineIdx; l++) {
    tableLines.push(document.lineAt(l).text);
  }

  const tableStr = tableLines.join('\n');
  let tableNode;
  try {
    tableNode = parseGeometricTable(tableStr, false, true, true);
  } catch (e) {
    return undefined;
  }

  if (!tableNode || tableNode.cells.length === 0) return undefined;

  const r = currentLineIdx - startLineIdx;
  const c = position.character;

  const maxLength = Math.max(...tableLines.map(line => line.length));
  const grid = tableLines.map(line => line.padEnd(maxLength, ' '));

  const hLines: number[] = [];
  for (let row = 0; row < grid.length; row++) {
    const rowStr = grid[row];
    const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes('+'));
    if (isBorderRow) hLines.push(row);
  }

  const vLinesSet = new Set<number>();
  for (const borderRow of hLines) {
    const rowStr = grid[borderRow];
    for (let col = 0; col < rowStr.length; col++) {
      if (rowStr[col] === '|' || rowStr[col] === '+') vLinesSet.add(col);
    }
  }
  const vLines = Array.from(vLinesSet).sort((a, b) => a - b);

  if (hLines.length < 2 || vLines.length < 2) return undefined;

  let j = -1;
  for (let idx = 0; idx < hLines.length - 1; idx++) {
    if (r > hLines[idx] && r < hLines[idx + 1]) {
      j = idx;
      break;
    }
  }

  const currentLineBoundaryPos = getLineBoundaryPos(currentLineText, vLines);
  let i = -1;
  for (let idx = 0; idx < vLines.length - 1; idx++) {
    const left = currentLineBoundaryPos[idx] !== -1 ? currentLineBoundaryPos[idx] : vLines[idx];
    const right = currentLineBoundaryPos[idx + 1] !== -1 ? currentLineBoundaryPos[idx + 1] : vLines[idx + 1];
    if (c > left && c <= right) {
      i = idx;
      break;
    }
  }

  if (j === -1 || i === -1) return undefined;

  const cell = tableNode.cells.find(
    cell => cell.row <= j && j < cell.row + cell.rowspan && cell.column <= i && i < cell.column + cell.colspan
  );

  if (!cell) return undefined;

  return {
    cell,
    startLineIdx,
    endLineIdx,
    hLines,
    vLines,
    tableNode,
    r,
    c,
    j,
    i
  };
}

export function getCellLineContentBounds(
  document: vscode.TextDocument,
  rIdx: number,
  cell: TableCell,
  vLines: number[]
): { start: number; end: number } {
  const lText = document.lineAt(rIdx).text;
  const bPos = getLineBoundaryPos(lText, vLines);
  const lSep = bPos[cell.column] !== -1 ? bPos[cell.column] : vLines[cell.column];
  const rSep = bPos[cell.column + cell.colspan] !== -1 ? bPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];

  if (lSep !== -1 && rSep !== -1) {
    const raw = lText.substring(lSep + 1, rSep);
    const mStart = raw.match(/^\s*/);
    const startSpaces = mStart ? mStart[0].length : 0;
    const mEnd = raw.match(/\s*$/);
    const endSpaces = mEnd ? mEnd[0].length : 0;

    const contentStart = lSep + 1 + startSpaces;
    const contentEnd = rSep - endSpaces;

    if (contentStart < contentEnd) {
      return { start: contentStart, end: contentEnd };
    } else {
      return { start: lSep + 2, end: lSep + 2 };
    }
  }
  return { start: vLines[cell.column] + 2, end: vLines[cell.column] + 2 };
}

export function getMinLeadingSpacesForCell(
  cell: TableCell,
  startLineIdx: number,
  hLines: number[],
  vLines: number[],
  prevTableLines: string[]
): number {
  let minLeadingSpaces = Infinity;
  const cellStartRow = hLines[cell.row] + 1;
  const cellEndRow = hLines[cell.row + cell.rowspan] - 1;

  for (let r = cellStartRow; r <= cellEndRow; r++) {
    if (r < 0 || r >= prevTableLines.length) continue;
    const lineText = prevTableLines[r];
    const boundaryPos = getLineBoundaryPos(lineText, vLines);
    const leftSep = boundaryPos[cell.column] !== -1 ? boundaryPos[cell.column] : vLines[cell.column];
    const rightSep = boundaryPos[cell.column + cell.colspan] !== -1 ? boundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];

    const colStart = leftSep + 1;
    const slice = lineText.substring(colStart, rightSep);
    if (slice.trim() !== '') {
      const match = slice.match(/^( *)/);
      const leading = match ? match[1].length : 0;
      if (leading < minLeadingSpaces) {
        minLeadingSpaces = leading;
      }
    }
  }

  if (minLeadingSpaces === Infinity) {
    minLeadingSpaces = 1;
  }
  if (minLeadingSpaces > 1) {
    minLeadingSpaces = 1;
  }
  return minLeadingSpaces;
}

export function getSingleCellForChange(
  tableNode: TableNode,
  changeRange: vscode.Range,
  startLineIdx: number,
  hLines: number[],
  vLines: number[],
  prevTableLines: string[]
): { cell: TableCell; startLineIdxInCell: number; endLineIdxInCell: number; startCharIdxInCell: number; endCharIdxInCell: number } | undefined {
  const startPos = changeRange.start;
  const endPos = changeRange.end;

  const startR = startPos.line - startLineIdx;
  const endR = endPos.line - startLineIdx;

  if (startR < 0 || startR >= prevTableLines.length || endR < 0 || endR >= prevTableLines.length) {
    return undefined;
  }

  for (let r = startR; r <= endR; r++) {
    if (hLines.includes(r)) {
      return undefined;
    }
  }

  let startJ = -1;
  for (let idx = 0; idx < hLines.length - 1; idx++) {
    if (startR > hLines[idx] && startR < hLines[idx + 1]) {
      startJ = idx;
      break;
    }
  }

  let endJ = -1;
  for (let idx = 0; idx < hLines.length - 1; idx++) {
    if (endR > hLines[idx] && endR < hLines[idx + 1]) {
      endJ = idx;
      break;
    }
  }

  if (startJ === -1 || endJ === -1) return undefined;

  const startLineText = prevTableLines[startR];
  const startBoundaryPos = getLineBoundaryPos(startLineText, vLines);
  let startI = -1;
  for (let idx = 0; idx < vLines.length - 1; idx++) {
    const left = startBoundaryPos[idx] !== -1 ? startBoundaryPos[idx] : vLines[idx];
    const right = startBoundaryPos[idx + 1] !== -1 ? startBoundaryPos[idx + 1] : vLines[idx + 1];
    if (startPos.character > left && startPos.character <= right) {
      startI = idx;
      break;
    }
  }

  const endLineText = prevTableLines[endR];
  const endBoundaryPos = getLineBoundaryPos(endLineText, vLines);
  let endI = -1;
  for (let idx = 0; idx < vLines.length - 1; idx++) {
    const left = endBoundaryPos[idx] !== -1 ? endBoundaryPos[idx] : vLines[idx];
    const right = endBoundaryPos[idx + 1] !== -1 ? endBoundaryPos[idx + 1] : vLines[idx + 1];
    if (endPos.character > left && endPos.character <= right) {
      endI = idx;
      break;
    }
  }

  if (startI === -1 || endI === -1) return undefined;

  const cell = tableNode.cells.find(
    c => c.row <= startJ && startJ < c.row + c.rowspan && c.column <= startI && startI < c.column + c.colspan
  );

  if (!cell) return undefined;

  const endCell = tableNode.cells.find(
    c => c.row <= endJ && endJ < c.row + c.rowspan && c.column <= endI && endI < c.column + c.colspan
  );

  if (!endCell || endCell.id !== cell.id) return undefined;

  const startLeftSep = startBoundaryPos[cell.column] !== -1 ? startBoundaryPos[cell.column] : vLines[cell.column];
  const startRightSep = startBoundaryPos[cell.column + cell.colspan] !== -1 ? startBoundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];

  const endLeftSep = endBoundaryPos[cell.column] !== -1 ? endBoundaryPos[cell.column] : vLines[cell.column];
  const endRightSep = endBoundaryPos[cell.column + cell.colspan] !== -1 ? endBoundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];

  if (startPos.character <= startLeftSep || startPos.character > startRightSep) return undefined;
  if (endPos.character <= endLeftSep || endPos.character > endRightSep) return undefined;

  const cellStartRow = hLines[cell.row] + 1;
  const startLineIdxInCell = startR - cellStartRow;
  const endLineIdxInCell = endR - cellStartRow;

  let minLeadingSpaces = getMinLeadingSpacesForCell(cell, startLineIdx, hLines, vLines, prevTableLines);

  const startColStart = startLeftSep + 1;
  const startRow = cellStartRow + startLineIdxInCell;
  const startLineTextVal = prevTableLines[startRow];
  const startRawSlice = startLineTextVal.substring(startLeftSep + 1, startRightSep);
  const isStartWhitespaceOnly = /^\s*$/.test(startRawSlice);
  let startMinLeadingSpaces = minLeadingSpaces;
  if (isStartWhitespaceOnly) {
    startMinLeadingSpaces = 1;
  }
  const cellContentAtLine = cell.content[startLineIdxInCell] || '';
  const startCharIdxInCell = Math.max(0, isStartWhitespaceOnly
    ? (startPos.character - (startColStart + startMinLeadingSpaces))
    : Math.min(cellContentAtLine.length, startPos.character - (startColStart + startMinLeadingSpaces))
  );

  const endColStart = endLeftSep + 1;
  const endRow = cellStartRow + endLineIdxInCell;
  const endLineTextVal = prevTableLines[endRow];
  const endRawSlice = endLineTextVal.substring(endLeftSep + 1, endRightSep);
  const isEndWhitespaceOnly = /^\s*$/.test(endRawSlice);
  let endMinLeadingSpaces = minLeadingSpaces;
  if (isEndWhitespaceOnly) {
    endMinLeadingSpaces = 1;
  }
  const cellContentAtEndLine = cell.content[endLineIdxInCell] || '';
  const endCharIdxInCell = Math.max(0, isEndWhitespaceOnly
    ? (endPos.character - (endColStart + endMinLeadingSpaces))
    : Math.min(cellContentAtEndLine.length, endPos.character - (endColStart + endMinLeadingSpaces))
  );

  return {
    cell,
    startLineIdxInCell,
    endLineIdxInCell,
    startCharIdxInCell,
    endCharIdxInCell
  };
}
