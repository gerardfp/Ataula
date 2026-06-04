"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../table-engine/dist/table-parser.js
var require_table_parser = __commonJS({
  "../table-engine/dist/table-parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseGeometricTable = parseGeometricTable3;
    var DSU = class {
      parent;
      constructor(size) {
        this.parent = Array.from({ length: size }, (_, i) => i);
      }
      find(i) {
        if (this.parent[i] === i)
          return i;
        this.parent[i] = this.find(this.parent[i]);
        return this.parent[i];
      }
      union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) {
          this.parent[rootI] = rootJ;
        }
      }
    };
    function parseGeometricTable3(tableStr, isRubric = false, preserveEmptyLines = false, autoCorrectPipes = false) {
      const rawLines = tableStr.split(/\r?\n/).map((line) => line.trimEnd());
      const lines = rawLines.filter((line) => line.length > 0);
      if (lines.length === 0) {
        return { type: "table", rowsCount: 0, colsCount: 0, cells: [], isRubric };
      }
      const maxLength = Math.max(...lines.map((line) => line.length));
      const grid = lines.map((line) => line.padEnd(maxLength, " "));
      const hLines = [];
      for (let r = 0; r < grid.length; r++) {
        const rowStr = grid[r];
        const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
        if (isBorderRow) {
          hLines.push(r);
        }
      }
      if (hLines.length < 2) {
        return { type: "table", rowsCount: 0, colsCount: 0, cells: [], isRubric };
      }
      const vLinesSet = /* @__PURE__ */ new Set();
      for (const r of hLines) {
        const rowStr = grid[r];
        for (let c = 0; c < rowStr.length; c++) {
          if (rowStr[c] === "|" || rowStr[c] === "+") {
            vLinesSet.add(c);
          }
        }
      }
      const vLines = Array.from(vLinesSet).sort((a, b) => a - b);
      if (vLines.length < 2) {
        return { type: "table", rowsCount: 0, colsCount: 0, cells: [], isRubric };
      }
      const H = hLines.length;
      const V = vLines.length;
      if (autoCorrectPipes) {
        for (let j = 0; j < H - 1; j++) {
          const upperBorderRow = hLines[j];
          const lowerBorderRow = hLines[j + 1];
          const rStart = upperBorderRow + 1;
          const rEnd = lowerBorderRow - 1;
          for (let r = rStart; r <= rEnd; r++) {
            let line = grid[r];
            const lineVLines = [];
            for (let c = 0; c < line.length; c++) {
              if (line[c] === "|") {
                lineVLines.push(c);
              }
            }
            if (lineVLines.length < V) {
              const boundaryPos = Array(V).fill(-1);
              for (const s of lineVLines) {
                let closestIdx = 0;
                let minDiff = Math.abs(s - vLines[0]);
                for (let vIdx = 1; vIdx < V; vIdx++) {
                  const diff = Math.abs(s - vLines[vIdx]);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = vIdx;
                  }
                }
                boundaryPos[closestIdx] = s;
              }
              let lineChanged = false;
              for (let i = 0; i < V; i++) {
                if (boundaryPos[i] === -1) {
                  const v = vLines[i];
                  const upperHasSep = upperBorderRow < grid.length && v < grid[upperBorderRow].length && (grid[upperBorderRow][v] === "|" || grid[upperBorderRow][v] === "+");
                  const lowerHasSep = lowerBorderRow < grid.length && v < grid[lowerBorderRow].length && (grid[lowerBorderRow][v] === "|" || grid[lowerBorderRow][v] === "+");
                  if (upperHasSep && lowerHasSep) {
                    if (v < line.length) {
                      if (line[v] !== "|") {
                        line = line.substring(0, v) + "|" + line.substring(v + 1);
                        lineChanged = true;
                      }
                    } else {
                      line = line.padEnd(v, " ") + "|";
                      lineChanged = true;
                    }
                  }
                }
              }
              if (lineChanged) {
                grid[r] = line;
              }
            }
          }
        }
      }
      const rowIntervalsCount = H - 1;
      const colIntervalsCount = V - 1;
      const getUnitId = (j, i) => j * colIntervalsCount + i;
      const dsu = new DSU(rowIntervalsCount * colIntervalsCount);
      for (let j = 0; j < rowIntervalsCount; j++) {
        const rStart = hLines[j] + 1;
        const rEnd = hLines[j + 1] - 1;
        const activeBoundaries = /* @__PURE__ */ new Set();
        if (rStart > rEnd) {
          let targetJ = -1;
          if (j > 0) {
            targetJ = j - 1;
          } else if (rowIntervalsCount > 1) {
            targetJ = j + 1;
          }
          if (targetJ !== -1) {
            const adjStart = hLines[targetJ] + 1;
            const adjEnd = hLines[targetJ + 1] - 1;
            for (let r = adjStart; r <= adjEnd; r++) {
              const lineText = grid[r];
              const lineVLines = [];
              for (let c = 0; c < lineText.length; c++) {
                if (lineText[c] === "|") {
                  lineVLines.push(c);
                }
              }
              if (lineVLines.length >= 2) {
                if (lineVLines.length >= vLines.length) {
                  for (let idx = 1; idx < lineVLines.length - 1; idx++) {
                    const s = lineVLines[idx];
                    if (vLines.length > 2) {
                      let closestVal = vLines[1];
                      let minDiff = Math.abs(s - vLines[1]);
                      for (let vIdx = 2; vIdx < vLines.length - 1; vIdx++) {
                        const diff = Math.abs(s - vLines[vIdx]);
                        if (diff < minDiff) {
                          minDiff = diff;
                          closestVal = vLines[vIdx];
                        }
                      }
                      activeBoundaries.add(closestVal);
                    }
                  }
                } else {
                  for (const s of lineVLines) {
                    let closestVal = vLines[0];
                    let minDiff = Math.abs(s - vLines[0]);
                    for (let vIdx = 1; vIdx < vLines.length; vIdx++) {
                      const diff = Math.abs(s - vLines[vIdx]);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closestVal = vLines[vIdx];
                      }
                    }
                    if (closestVal !== vLines[0] && closestVal !== vLines[vLines.length - 1]) {
                      activeBoundaries.add(closestVal);
                    }
                  }
                }
              }
            }
          } else {
            for (const v of vLines) {
              activeBoundaries.add(v);
            }
          }
        } else {
          for (let r = rStart; r <= rEnd; r++) {
            const lineText = grid[r];
            const lineVLines = [];
            for (let c = 0; c < lineText.length; c++) {
              if (lineText[c] === "|") {
                lineVLines.push(c);
              }
            }
            if (lineVLines.length >= 2) {
              if (lineVLines.length >= vLines.length) {
                for (let idx = 1; idx < lineVLines.length - 1; idx++) {
                  const s = lineVLines[idx];
                  if (vLines.length > 2) {
                    let closestVal = vLines[1];
                    let minDiff = Math.abs(s - vLines[1]);
                    for (let vIdx = 2; vIdx < vLines.length - 1; vIdx++) {
                      const diff = Math.abs(s - vLines[vIdx]);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closestVal = vLines[vIdx];
                      }
                    }
                    activeBoundaries.add(closestVal);
                  }
                }
              } else {
                for (const s of lineVLines) {
                  let closestVal = vLines[0];
                  let minDiff = Math.abs(s - vLines[0]);
                  for (let vIdx = 1; vIdx < vLines.length; vIdx++) {
                    const diff = Math.abs(s - vLines[vIdx]);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closestVal = vLines[vIdx];
                    }
                  }
                  if (closestVal !== vLines[0] && closestVal !== vLines[vLines.length - 1]) {
                    activeBoundaries.add(closestVal);
                  }
                }
              }
            }
          }
        }
        for (let i = 0; i < colIntervalsCount - 1; i++) {
          const boundaryColVal = vLines[i + 1];
          if (!activeBoundaries.has(boundaryColVal)) {
            dsu.union(getUnitId(j, i), getUnitId(j, i + 1));
          }
        }
      }
      for (let j = 0; j < rowIntervalsCount - 1; j++) {
        const boundaryRow = hLines[j + 1];
        for (let i = 0; i < colIntervalsCount; i++) {
          const cStart = vLines[i] + 1;
          const cEnd = vLines[i + 1] - 1;
          let borderExists = false;
          for (let c = cStart; c <= cEnd; c++) {
            const char = grid[boundaryRow][c];
            if (char === "-" || char === "=" || char === "+" || char === "_") {
              borderExists = true;
              break;
            }
          }
          if (!borderExists) {
            dsu.union(getUnitId(j, i), getUnitId(j + 1, i));
          }
        }
      }
      const groups = /* @__PURE__ */ new Map();
      for (let j = 0; j < rowIntervalsCount; j++) {
        for (let i = 0; i < colIntervalsCount; i++) {
          const unitId = getUnitId(j, i);
          const root = dsu.find(unitId);
          if (!groups.has(root)) {
            groups.set(root, []);
          }
          groups.get(root).push({ j, i });
        }
      }
      const cells = [];
      let cellCounter = 1;
      const finalGroups = [];
      for (const group of groups.values()) {
        const minJ = Math.min(...group.map((g) => g.j));
        const maxJ = Math.max(...group.map((g) => g.j));
        const minI = Math.min(...group.map((g) => g.i));
        const maxI = Math.max(...group.map((g) => g.i));
        const rowspan = maxJ - minJ + 1;
        const colspan = maxI - minI + 1;
        if (group.length === rowspan * colspan) {
          finalGroups.push(group);
        } else {
          for (const unit of group) {
            finalGroups.push([unit]);
          }
        }
      }
      for (const group of finalGroups) {
        const minJ = Math.min(...group.map((g) => g.j));
        const maxJ = Math.max(...group.map((g) => g.j));
        const minI = Math.min(...group.map((g) => g.i));
        const maxI = Math.max(...group.map((g) => g.i));
        const rowspan = maxJ - minJ + 1;
        const colspan = maxI - minI + 1;
        const contentLines = [];
        for (let j = minJ; j <= maxJ; j++) {
          const rStart = hLines[j] + 1;
          const rEnd = hLines[j + 1] - 1;
          for (let r = rStart; r <= rEnd; r++) {
            const lineText = grid[r];
            const lineVLines = [];
            for (let c = 0; c < lineText.length; c++) {
              if (lineText[c] === "|") {
                lineVLines.push(c);
              }
            }
            let slice = "";
            if (lineVLines.length >= 2) {
              const boundaryPos = Array(vLines.length).fill(-1);
              if (lineVLines.length >= vLines.length) {
                boundaryPos[0] = lineVLines[0];
                boundaryPos[vLines.length - 1] = lineVLines[lineVLines.length - 1];
                for (let idx = 1; idx < lineVLines.length - 1; idx++) {
                  const s = lineVLines[idx];
                  if (vLines.length > 2) {
                    let closestIdx = 1;
                    let minDiff = Math.abs(s - vLines[1]);
                    for (let vIdx = 2; vIdx < vLines.length - 1; vIdx++) {
                      const diff = Math.abs(s - vLines[vIdx]);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closestIdx = vIdx;
                      }
                    }
                    boundaryPos[closestIdx] = s;
                  }
                }
              } else {
                for (const s of lineVLines) {
                  let closestIdx = 0;
                  let minDiff = Math.abs(s - vLines[0]);
                  for (let vIdx = 1; vIdx < vLines.length; vIdx++) {
                    const diff = Math.abs(s - vLines[vIdx]);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closestIdx = vIdx;
                    }
                  }
                  boundaryPos[closestIdx] = s;
                }
              }
              const startPos = boundaryPos[minI];
              const endPos = boundaryPos[maxI + 1];
              if (startPos !== -1 && endPos !== -1) {
                slice = lineText.substring(startPos + 1, endPos);
              } else {
                const colStart = vLines[minI] + 1;
                const colEnd = vLines[maxI + 1] - 1;
                slice = lineText.substring(colStart, colEnd + 1);
              }
            } else {
              const colStart = vLines[minI] + 1;
              const colEnd = vLines[maxI + 1] - 1;
              slice = lineText.substring(colStart, colEnd + 1);
            }
            contentLines.push(slice);
          }
        }
        const processedLines = [...contentLines];
        let minLeadingSpaces = Infinity;
        for (const line of processedLines) {
          if (line.trim() !== "") {
            const match = line.match(/^( *)/);
            const leading = match ? match[1].length : 0;
            if (leading < minLeadingSpaces) {
              minLeadingSpaces = leading;
            }
          }
        }
        if (minLeadingSpaces === Infinity) {
          minLeadingSpaces = 0;
        }
        if (minLeadingSpaces > 1) {
          minLeadingSpaces = 1;
        }
        const finalContent = processedLines.map((line) => {
          if (line.trim() === "")
            return "";
          const leftStripped = line.substring(minLeadingSpaces);
          return leftStripped.trimEnd();
        });
        if (!preserveEmptyLines) {
          while (finalContent.length > 0 && finalContent[finalContent.length - 1] === "") {
            finalContent.pop();
          }
          while (finalContent.length > 0 && finalContent[0] === "") {
            finalContent.shift();
          }
        }
        cells.push({
          id: `cell-${cellCounter++}`,
          row: minJ,
          column: minI,
          rowspan,
          colspan,
          content: finalContent
        });
      }
      const colWidths = [];
      for (let i = 0; i < colIntervalsCount; i++) {
        colWidths.push(vLines[i + 1] - vLines[i] - 1);
      }
      return {
        type: "table",
        rowsCount: rowIntervalsCount,
        colsCount: colIntervalsCount,
        cells,
        isRubric,
        colWidths
      };
    }
  }
});

// ../table-engine/dist/table-formatter.js
var require_table_formatter = __commonJS({
  "../table-engine/dist/table-formatter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.simplifyTable = simplifyTable2;
    exports2.formatGeometricTable = formatGeometricTable2;
    function simplifyTable2(table) {
      let { rowsCount, colsCount, cells } = table;
      if (rowsCount <= 1 && colsCount <= 1) {
        return table;
      }
      let simplifiedCells = cells.map((cell) => ({ ...cell }));
      let colWidths = table.colWidths ? [...table.colWidths] : void 0;
      for (let k = colsCount - 1; k >= 1; k--) {
        const isRedundant = simplifiedCells.every((cell) => cell.column !== k && cell.column + cell.colspan !== k);
        if (isRedundant) {
          for (const cell of simplifiedCells) {
            if (cell.column >= k) {
              cell.column -= 1;
            } else if (cell.column + cell.colspan > k) {
              cell.colspan -= 1;
            }
          }
          if (colWidths && k < colWidths.length) {
            colWidths[k - 1] += colWidths[k] + 1;
            colWidths.splice(k, 1);
          }
          colsCount -= 1;
        }
      }
      for (let k = rowsCount - 1; k >= 1; k--) {
        const isRedundant = simplifiedCells.every((cell) => cell.row !== k && cell.row + cell.rowspan !== k);
        if (isRedundant) {
          for (const cell of simplifiedCells) {
            if (cell.row >= k) {
              cell.row -= 1;
            } else if (cell.row + cell.rowspan > k) {
              cell.rowspan -= 1;
            }
          }
          rowsCount -= 1;
        }
      }
      return {
        ...table,
        rowsCount,
        colsCount,
        cells: simplifiedCells,
        colWidths
      };
    }
    function formatGeometricTable2(table, preserveColWidths = false) {
      if (table.rowsCount === 0 || table.colsCount === 0 || table.cells.length === 0) {
        return "";
      }
      const { rowsCount, colsCount, cells } = table;
      const colWidths = preserveColWidths && table.colWidths && table.colWidths.length === colsCount ? [...table.colWidths] : Array(colsCount).fill(3);
      const cellLinesMap = /* @__PURE__ */ new Map();
      for (const cell of cells) {
        const lines = [...cell.content];
        cellLinesMap.set(cell.id, lines);
      }
      for (const cell of cells) {
        if (cell.colspan === 1) {
          const lines = cellLinesMap.get(cell.id) || [];
          const maxLength = Math.max(...lines.map((l) => l.length), 0);
          colWidths[cell.column] = Math.max(colWidths[cell.column], maxLength + 2);
        }
      }
      for (const cell of cells) {
        if (cell.colspan > 1) {
          const lines = cellLinesMap.get(cell.id) || [];
          const maxLength = Math.max(...lines.map((l) => l.length), 0);
          const minCellWidth = maxLength + 2;
          let currentWidth = 0;
          for (let c = cell.column; c < cell.column + cell.colspan; c++) {
            currentWidth += colWidths[c];
          }
          currentWidth += cell.colspan - 1;
          if (currentWidth < minCellWidth) {
            const deficiency = minCellWidth - currentWidth;
            const addPerCol = Math.ceil(deficiency / cell.colspan);
            for (let c = cell.column; c < cell.column + cell.colspan; c++) {
              colWidths[c] += addPerCol;
            }
          }
        }
      }
      const rowHeights = Array(rowsCount).fill(1);
      for (const cell of cells) {
        if (cell.rowspan === 1) {
          const lines = cellLinesMap.get(cell.id) || [];
          rowHeights[cell.row] = Math.max(rowHeights[cell.row], lines.length);
        }
      }
      for (const cell of cells) {
        if (cell.rowspan > 1) {
          const lines = cellLinesMap.get(cell.id) || [];
          const requiredHeight = lines.length;
          let currentHeight = 0;
          for (let r = cell.row; r < cell.row + cell.rowspan; r++) {
            currentHeight += rowHeights[r];
          }
          if (currentHeight < requiredHeight) {
            const deficiency = requiredHeight - currentHeight;
            const addPerRow = Math.ceil(deficiency / cell.rowspan);
            for (let r = cell.row; r < cell.row + cell.rowspan; r++) {
              rowHeights[r] += addPerRow;
            }
          }
        }
      }
      const cellAllocatedLines = /* @__PURE__ */ new Map();
      for (const cell of cells) {
        const lines = cellLinesMap.get(cell.id) || [];
        let totalHeight = 0;
        for (let r = cell.row; r < cell.row + cell.rowspan; r++) {
          totalHeight += rowHeights[r];
        }
        const padded = [...lines];
        while (padded.length < totalHeight) {
          padded.push("");
        }
        cellAllocatedLines.set(cell.id, padded);
      }
      const cellGrid = Array.from({ length: rowsCount }, () => Array(colsCount).fill(void 0));
      const cellSpanWidths = /* @__PURE__ */ new Map();
      for (const cell of cells) {
        let cellWidth = 0;
        for (let c = cell.column; c < cell.column + cell.colspan; c++) {
          cellWidth += colWidths[c];
        }
        cellSpanWidths.set(cell.id, cellWidth + cell.colspan - 1);
        for (let r = cell.row; r < cell.row + cell.rowspan; r++) {
          for (let c = cell.column; c < cell.column + cell.colspan; c++) {
            cellGrid[r][c] = cell;
          }
        }
      }
      const rowHeightPrefix = Array(rowsCount + 1).fill(0);
      for (let r = 0; r < rowsCount; r++) {
        rowHeightPrefix[r + 1] = rowHeightPrefix[r] + rowHeights[r];
      }
      const getCellAt = (j, i) => cellGrid[j]?.[i];
      const getCellLine = (cell, j, lineOffset) => {
        const allLines = cellAllocatedLines.get(cell.id) || [];
        const startIndex = rowHeightPrefix[j] - rowHeightPrefix[cell.row];
        return allLines[startIndex + lineOffset] || "";
      };
      const outputLines = [];
      let topBorder = "|";
      for (let i = 0; i < colsCount; i++) {
        topBorder += "-".repeat(colWidths[i]) + "|";
      }
      outputLines.push(topBorder);
      for (let j = 0; j < rowsCount; j++) {
        const height = rowHeights[j];
        for (let k = 0; k < height; k++) {
          let contentLine = "|";
          for (let i = 0; i < colsCount; i++) {
            const cell = getCellAt(j, i);
            if (!cell) {
              contentLine += " ".repeat(colWidths[i]) + "|";
              continue;
            }
            if (cell.column === i) {
              const rawLine = getCellLine(cell, j, k);
              const cellWidth = cellSpanWidths.get(cell.id) || colWidths[i];
              const formatted = rawLine.trimEnd().padEnd(cellWidth - 1, " ");
              contentLine += " " + formatted;
            }
            const nextCell = i < colsCount - 1 ? getCellAt(j, i + 1) : void 0;
            if (nextCell && nextCell.id === cell.id) {
            } else {
              contentLine += "|";
            }
          }
          outputLines.push(contentLine);
        }
        let borderLine = "|";
        for (let i = 0; i < colsCount; i++) {
          const cellAbove = getCellAt(j, i);
          const cellBelow = j < rowsCount - 1 ? getCellAt(j + 1, i) : void 0;
          if (cellAbove && cellBelow && cellAbove.id === cellBelow.id) {
            borderLine += " ".repeat(colWidths[i]);
          } else {
            borderLine += "-".repeat(colWidths[i]);
          }
          const nextCellAbove = i < colsCount - 1 ? getCellAt(j, i + 1) : void 0;
          const nextCellBelow = i < colsCount - 1 && j < rowsCount - 1 ? getCellAt(j + 1, i + 1) : void 0;
          const isRightBorderMerged = cellAbove && nextCellAbove && cellAbove.id === nextCellAbove.id && (!cellBelow || !nextCellBelow || cellBelow.id !== nextCellBelow.id || cellBelow.id !== cellAbove.id);
          const isBottomRightMerged = cellAbove && cellBelow && cellAbove.id === cellBelow.id && nextCellAbove && nextCellBelow && nextCellAbove.id === nextCellBelow.id && cellAbove.id === nextCellAbove.id;
          if (isBottomRightMerged) {
            borderLine += " ";
          } else if (cellAbove && cellBelow && cellAbove.id === cellBelow.id && nextCellAbove && nextCellBelow && nextCellAbove.id === nextCellBelow.id) {
            borderLine += "|";
          } else {
            borderLine += "|";
          }
        }
        outputLines.push(borderLine);
      }
      return outputLines.join("\n");
    }
  }
});

// ../table-engine/dist/index.js
var require_dist = __commonJS({
  "../table-engine/dist/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_table_parser(), exports2);
    __exportStar(require_table_formatter(), exports2);
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));
var import_table_engine2 = __toESM(require_dist());

// src/extension-support.ts
var vscode = __toESM(require("vscode"));
function createLogger(context) {
  const output = vscode.window.createOutputChannel("Ataula");
  context.subscriptions.push(output);
  return (msg) => {
    output.appendLine(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}`);
  };
}
function isSupportedFile(document) {
  const fileName = document.fileName.toLowerCase();
  const langId = document.languageId;
  return langId === "edumark" || langId === "markdown" || langId === "plaintext" || fileName.endsWith(".edu") || fileName.endsWith(".md") || fileName.endsWith(".txt");
}

// src/table-geometry.ts
var import_table_engine = __toESM(require_dist());
function getLineBoundaryPos(lineText, vLines) {
  const lineVLines = [];
  for (let colIdx = 0; colIdx < lineText.length; colIdx++) {
    if (lineText[colIdx] === "|") {
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
function isCellSplittingRow(lineText) {
  const trimmed = lineText.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
  const parts = trimmed.split("|");
  const colContents = parts.slice(1, parts.length - 1);
  let hasSplitDash = false;
  let hasNonBorderCell = false;
  for (const cell of colContents) {
    const trimmedCell = cell.trim();
    if (trimmedCell.length > 0) {
      const isCompleteBorder = /^[-=_]+$/.test(trimmedCell) && !cell.includes(" ");
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
function isPartialBorderRow(text) {
  if (isCellSplittingRow(text)) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith("|")) return false;
  if (!/^[|+\-\s=_]+$/.test(trimmed)) return false;
  if (!/[-=_]/.test(trimmed)) return false;
  if (!trimmed.endsWith("|")) return true;
  if (/\| \s*[-=_]/.test(trimmed) || /\|[-=_]\s+/.test(trimmed) || /\s+[-=_]\s*\|/.test(trimmed)) {
    return true;
  }
  return false;
}
function getCellAtPosition(document, position) {
  const currentLineIdx = position.line;
  const currentLineText = document.lineAt(currentLineIdx).text;
  if (!currentLineText.trim().startsWith("|")) return void 0;
  let startLineIdx = currentLineIdx;
  while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
    startLineIdx--;
  }
  let endLineIdx = currentLineIdx;
  while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
    endLineIdx++;
  }
  const tableLines = [];
  for (let l = startLineIdx; l <= endLineIdx; l++) {
    tableLines.push(document.lineAt(l).text);
  }
  const tableStr = tableLines.join("\n");
  let tableNode;
  try {
    tableNode = (0, import_table_engine.parseGeometricTable)(tableStr, false, true, true);
  } catch (e) {
    return void 0;
  }
  if (!tableNode || tableNode.cells.length === 0) return void 0;
  const r = currentLineIdx - startLineIdx;
  const c = position.character;
  const maxLength = Math.max(...tableLines.map((line) => line.length));
  const grid = tableLines.map((line) => line.padEnd(maxLength, " "));
  const hLines = [];
  for (let row = 0; row < grid.length; row++) {
    const rowStr = grid[row];
    const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
    if (isBorderRow) hLines.push(row);
  }
  const vLinesSet = /* @__PURE__ */ new Set();
  for (const borderRow of hLines) {
    const rowStr = grid[borderRow];
    for (let col = 0; col < rowStr.length; col++) {
      if (rowStr[col] === "|" || rowStr[col] === "+") vLinesSet.add(col);
    }
  }
  const vLines = Array.from(vLinesSet).sort((a, b) => a - b);
  if (hLines.length < 2 || vLines.length < 2) return void 0;
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
  if (j === -1 || i === -1) return void 0;
  const cell = tableNode.cells.find(
    (cell2) => cell2.row <= j && j < cell2.row + cell2.rowspan && cell2.column <= i && i < cell2.column + cell2.colspan
  );
  if (!cell) return void 0;
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
function getCellLineContentBounds(document, rIdx, cell, vLines) {
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
function getMinLeadingSpacesForCell(cell, startLineIdx, hLines, vLines, prevTableLines) {
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
    if (slice.trim() !== "") {
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
function getSingleCellForChange(tableNode, changeRange, startLineIdx, hLines, vLines, prevTableLines) {
  const startPos = changeRange.start;
  const endPos = changeRange.end;
  const startR = startPos.line - startLineIdx;
  const endR = endPos.line - startLineIdx;
  if (startR < 0 || startR >= prevTableLines.length || endR < 0 || endR >= prevTableLines.length) {
    return void 0;
  }
  for (let r = startR; r <= endR; r++) {
    if (hLines.includes(r)) {
      return void 0;
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
  if (startJ === -1 || endJ === -1) return void 0;
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
  if (startI === -1 || endI === -1) return void 0;
  const cell = tableNode.cells.find(
    (c) => c.row <= startJ && startJ < c.row + c.rowspan && c.column <= startI && startI < c.column + c.colspan
  );
  if (!cell) return void 0;
  const endCell = tableNode.cells.find(
    (c) => c.row <= endJ && endJ < c.row + c.rowspan && c.column <= endI && endI < c.column + c.colspan
  );
  if (!endCell || endCell.id !== cell.id) return void 0;
  const startLeftSep = startBoundaryPos[cell.column] !== -1 ? startBoundaryPos[cell.column] : vLines[cell.column];
  const startRightSep = startBoundaryPos[cell.column + cell.colspan] !== -1 ? startBoundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];
  const endLeftSep = endBoundaryPos[cell.column] !== -1 ? endBoundaryPos[cell.column] : vLines[cell.column];
  const endRightSep = endBoundaryPos[cell.column + cell.colspan] !== -1 ? endBoundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];
  if (startPos.character <= startLeftSep || startPos.character > startRightSep) return void 0;
  if (endPos.character <= endLeftSep || endPos.character > endRightSep) return void 0;
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
  const cellContentAtLine = cell.content[startLineIdxInCell] || "";
  const startCharIdxInCell = Math.max(
    0,
    isStartWhitespaceOnly ? startPos.character - (startColStart + startMinLeadingSpaces) : Math.min(cellContentAtLine.length, startPos.character - (startColStart + startMinLeadingSpaces))
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
  const cellContentAtEndLine = cell.content[endLineIdxInCell] || "";
  const endCharIdxInCell = Math.max(
    0,
    isEndWhitespaceOnly ? endPos.character - (endColStart + endMinLeadingSpaces) : Math.min(cellContentAtEndLine.length, endPos.character - (endColStart + endMinLeadingSpaces))
  );
  return {
    cell,
    startLineIdxInCell,
    endLineIdxInCell,
    startCharIdxInCell,
    endCharIdxInCell
  };
}

// src/extension.ts
function activate(context) {
  const logToFile = createLogger(context);
  logToFile("Extension activated");
  console.log("La extensi\xF3n Ataula est\xE1 activa.");
  let isFormatting = false;
  let isApplyingExtensionEdit = false;
  let pendingFormat = false;
  let currentFormattedTable = void 0;
  let bufferedChanges = [];
  let debounceTimer = void 0;
  let typeFormatScheduled = false;
  let activeTable = void 0;
  const lastFormattedVersions = /* @__PURE__ */ new Map();
  function recalculateActiveTableGeometries(tableStr) {
    if (!activeTable) return;
    const newRawLines = tableStr.split(/\r?\n/);
    const newMaxLength = Math.max(...newRawLines.map((line) => line.length));
    const newGrid = newRawLines.map((line) => line.padEnd(newMaxLength, " "));
    const newHLines = [];
    for (let row = 0; row < newGrid.length; row++) {
      const rowStr = newGrid[row];
      const isRowBorder = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
      if (isRowBorder) {
        newHLines.push(row);
      }
    }
    const newVLinesSet = /* @__PURE__ */ new Set();
    for (const borderRow of newHLines) {
      const rowStr = newGrid[borderRow];
      for (let col = 0; col < rowStr.length; col++) {
        if (rowStr[col] === "|" || rowStr[col] === "+") {
          newVLinesSet.add(col);
        }
      }
    }
    const newVLines = Array.from(newVLinesSet).sort((a, b) => a - b);
    activeTable.hLines = newHLines;
    activeTable.vLines = newVLines;
  }
  async function applyWorkspaceEdit(workspaceEdit, document) {
    const success = await vscode2.workspace.applyEdit(workspaceEdit);
    if (success && document) {
      lastFormattedVersions.set(document.uri.fsPath, document.version);
      logToFile(`applyWorkspaceEdit: Set lastFormattedVersion for ${document.uri.fsPath} to version ${document.version}`);
    }
    return success;
  }
  async function formatAllTablesInDocument(document) {
    logToFile(`formatAllTablesInDocument called for ${document.fileName}, languageId: ${document.languageId}, isFormatting: ${isFormatting}`);
    if (isFormatting) return;
    if (!isSupportedFile(document)) return;
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    let inTable = false;
    let tableLines = [];
    let startLineIdx = -1;
    const tablesToReplace = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isTableLine = line.trim().startsWith("|");
      if (isTableLine) {
        if (!inTable) {
          inTable = true;
          startLineIdx = i;
        }
        tableLines.push(line);
      } else {
        if (inTable) {
          try {
            const tableStr = tableLines.join("\n");
            const node = (0, import_table_engine2.parseGeometricTable)(tableStr);
            if (node.cells.length > 0) {
              const formatted = (0, import_table_engine2.formatGeometricTable)(node);
              if (formatted !== tableStr) {
                const range = new vscode2.Range(
                  new vscode2.Position(startLineIdx, 0),
                  new vscode2.Position(i - 1, lines[i - 1].length)
                );
                tablesToReplace.push({ range, formatted });
              }
            }
          } catch (e) {
            logToFile(`Error parsing mid-table: ${e.message}`);
          }
          inTable = false;
          tableLines = [];
          startLineIdx = -1;
        }
      }
    }
    if (inTable && startLineIdx !== -1) {
      try {
        const tableStr = tableLines.join("\n");
        const node = (0, import_table_engine2.parseGeometricTable)(tableStr);
        if (node.cells.length > 0) {
          const formatted = (0, import_table_engine2.formatGeometricTable)(node);
          if (formatted !== tableStr) {
            const range = new vscode2.Range(
              new vscode2.Position(startLineIdx, 0),
              new vscode2.Position(lines.length - 1, lines[lines.length - 1].length)
            );
            tablesToReplace.push({ range, formatted });
          }
        }
      } catch (e) {
        logToFile(`Error parsing end-table: ${e.message}`);
      }
    }
    logToFile(`tablesToReplace length: ${tablesToReplace.length}`);
    if (tablesToReplace.length === 0) return;
    try {
      isFormatting = true;
      isApplyingExtensionEdit = true;
      const workspaceEdit = new vscode2.WorkspaceEdit();
      for (let i = tablesToReplace.length - 1; i >= 0; i--) {
        const { range, formatted } = tablesToReplace[i];
        workspaceEdit.replace(document.uri, range, formatted);
      }
      const success = await applyWorkspaceEdit(workspaceEdit, document);
      logToFile(`workspace.applyEdit success: ${success}`);
    } catch (err) {
      logToFile(`Error pre-formatting tables: ${err.message}`);
      console.error("Error pre-formatting tables:", err);
    } finally {
      isApplyingExtensionEdit = false;
      isFormatting = false;
    }
  }
  async function runLiveFormatting(currentEditor, document) {
    if (isFormatting) return;
    if (activeTable && activeTable.documentUri.fsPath === document.uri.fsPath && activeTable.targetCursor) {
      logToFile(`runLiveFormatting: formatting from in-memory activeTable state.`);
      const { cellId, lineIdx, charIdx } = activeTable.targetCursor;
      const cell2 = activeTable.tableNode.cells.find((c2) => c2.id === cellId);
      if (!cell2) {
        activeTable = void 0;
        return;
      }
      let formattedTable2;
      try {
        const preserveColWidths = activeTable.isDeletion !== true;
        formattedTable2 = (0, import_table_engine2.formatGeometricTable)(activeTable.tableNode, preserveColWidths);
      } catch (e) {
        logToFile(`Error formatting table in in-memory runLiveFormatting: ${e.message}`);
        activeTable = void 0;
        return;
      }
      let success2 = true;
      let hadPendingFormat2 = pendingFormat;
      if (formattedTable2 !== activeTable.tableStr) {
        success2 = false;
        try {
          isFormatting = true;
          isApplyingExtensionEdit = true;
          currentFormattedTable = formattedTable2;
          const endLineLength = document.lineAt(activeTable.endLineIdx).text.length;
          const range = new vscode2.Range(
            new vscode2.Position(activeTable.startLineIdx, 0),
            new vscode2.Position(activeTable.endLineIdx, endLineLength)
          );
          const workspaceEdit = new vscode2.WorkspaceEdit();
          workspaceEdit.replace(document.uri, range, formattedTable2);
          success2 = await applyWorkspaceEdit(workspaceEdit, document);
          logToFile(`runLiveFormatting: in-memory workspace.applyEdit success: ${success2}`);
        } catch (err) {
          logToFile(`Error applying live format edit: ${err.message}`);
        } finally {
          isApplyingExtensionEdit = false;
          isFormatting = false;
          currentFormattedTable = void 0;
          if (pendingFormat) {
            hadPendingFormat2 = true;
            pendingFormat = false;
            logToFile(`runLiveFormatting: pendingFormat is true. Scheduling follow-up formatting.`);
            setTimeout(async () => {
              const editor = vscode2.window.activeTextEditor;
              if (editor) {
                await runLiveFormatting(editor, editor.document);
              }
            }, 0);
          }
        }
      }
      if (success2) {
        const newHLines = [];
        const newRawLines = formattedTable2.split("\n");
        const newMaxLength = Math.max(...newRawLines.map((line) => line.length));
        const newGrid = newRawLines.map((line) => line.padEnd(newMaxLength, " "));
        for (let row = 0; row < newGrid.length; row++) {
          const rowStr = newGrid[row];
          const isRowBorder = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
          if (isRowBorder) {
            newHLines.push(row);
          }
        }
        const newVLinesSet = /* @__PURE__ */ new Set();
        for (const borderRow of newHLines) {
          const rowStr = newGrid[borderRow];
          for (let col = 0; col < rowStr.length; col++) {
            if (rowStr[col] === "|" || rowStr[col] === "+") {
              newVLinesSet.add(col);
            }
          }
        }
        const newVLines = Array.from(newVLinesSet).sort((a, b) => a - b);
        if (hadPendingFormat2) {
          logToFile(`runLiveFormatting: hadPendingFormat is true. Skipping editor cursor selection and keeping targetCursor active.`);
          activeTable.endLineIdx = activeTable.startLineIdx + (newRawLines.length - 1);
          activeTable.hLines = newHLines;
          activeTable.vLines = newVLines;
          activeTable.tableStr = formattedTable2;
          activeTable.documentVersion = document.version;
        } else {
          logToFile(`runLiveFormatting: formatting complete. Setting editor cursor and clearing targetCursor.`);
          const finalCharIdx = activeTable.targetCursor ? activeTable.targetCursor.charIdx : charIdx;
          const fCellStartRow = newHLines[cell2.row] + 1;
          const formattedCellLine = newRawLines[fCellStartRow + lineIdx] || "";
          const boundaryPos = getLineBoundaryPos(formattedCellLine, newVLines);
          const leftSep = boundaryPos[cell2.column] !== -1 ? boundaryPos[cell2.column] : newVLines[cell2.column];
          const rightSep = boundaryPos[cell2.column + cell2.colspan] !== -1 ? boundaryPos[cell2.column + cell2.colspan] : newVLines[cell2.column + cell2.colspan];
          const colStart = leftSep + 1;
          const newMinLeadingSpaces = getMinLeadingSpacesForCell(
            cell2,
            0,
            newHLines,
            newVLines,
            newRawLines
          );
          const contentStartInDocFormatted = colStart + newMinLeadingSpaces;
          const newCursorLine = activeTable.startLineIdx + fCellStartRow + lineIdx;
          const newCursorChar = contentStartInDocFormatted + finalCharIdx;
          isApplyingExtensionEdit = true;
          const newPosition = new vscode2.Position(newCursorLine, newCursorChar);
          currentEditor.selection = new vscode2.Selection(newPosition, newPosition);
          activeTable.endLineIdx = activeTable.startLineIdx + (newRawLines.length - 1);
          activeTable.hLines = newHLines;
          activeTable.vLines = newVLines;
          activeTable.tableStr = formattedTable2;
          activeTable.documentVersion = document.version;
          activeTable.targetCursor = {
            cellId: cell2.id,
            lineIdx,
            charIdx: finalCharIdx
          };
          isApplyingExtensionEdit = false;
        }
      }
      return;
    }
    const position = currentEditor.selection.active;
    const currentLineIdx = position.line;
    const currentLineText = document.lineAt(currentLineIdx).text;
    if (!currentLineText.trim().startsWith("|")) return;
    let startLineIdx = currentLineIdx;
    while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
      startLineIdx--;
    }
    let endLineIdx = currentLineIdx;
    while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
      endLineIdx++;
    }
    const firstPipeCurrentLine = currentLineText.indexOf("|");
    const lastPipeCurrentLine = currentLineText.lastIndexOf("|");
    let isLeftColumnAddition = false;
    let isRightColumnAddition = false;
    if (firstPipeCurrentLine !== -1 && startLineIdx !== endLineIdx) {
      const beforeFirstPipe = currentLineText.substring(0, firstPipeCurrentLine);
      const afterLastPipe = currentLineText.substring(lastPipeCurrentLine + 1);
      if (/[-=_]/.test(beforeFirstPipe)) {
        isLeftColumnAddition = true;
      } else if (/[-=_]/.test(afterLastPipe)) {
        isRightColumnAddition = true;
      }
    }
    const isColumnAddition = isLeftColumnAddition || isRightColumnAddition;
    const isPartialBorder = isPartialBorderRow(currentLineText) || isColumnAddition;
    if (isPartialBorder) {
      return;
    }
    const tableLines = [];
    for (let l = startLineIdx; l <= endLineIdx; l++) {
      tableLines.push(document.lineAt(l).text);
    }
    const tableStr = tableLines.join("\n");
    let tableNode;
    try {
      tableNode = (0, import_table_engine2.parseGeometricTable)(tableStr, false, true, true);
    } catch (e) {
      return;
    }
    if (!tableNode || tableNode.cells.length === 0) {
      return;
    }
    const r = currentLineIdx - startLineIdx;
    const c = position.character;
    const maxLength = Math.max(...tableLines.map((line) => line.length));
    const grid = tableLines.map((line) => line.padEnd(maxLength, " "));
    const hLines = [];
    for (let row = 0; row < grid.length; row++) {
      const rowStr = grid[row];
      const isRowBorder = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
      if (isRowBorder) {
        hLines.push(row);
      }
    }
    if (hLines.includes(r)) return;
    const vLinesSet = /* @__PURE__ */ new Set();
    for (const borderRow of hLines) {
      const rowStr = grid[borderRow];
      for (let col = 0; col < rowStr.length; col++) {
        if (rowStr[col] === "|" || rowStr[col] === "+") {
          vLinesSet.add(col);
        }
      }
    }
    const vLines = Array.from(vLinesSet).sort((a, b) => a - b);
    if (hLines.length < 2 || vLines.length < 2) return;
    const expectedColsCount = vLines.length - 1;
    const expectedRowsCount = hLines.length - 1;
    if (tableNode.colsCount !== expectedColsCount || tableNode.rowsCount !== expectedRowsCount) {
      logToFile(`runLiveFormatting: structural change detected (expected cols ${expectedColsCount}, got ${tableNode.colsCount}). Aborting live formatting.`);
      return;
    }
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
    if (j === -1 || i === -1) return;
    const cell = tableNode.cells.find(
      (cell2) => cell2.row <= j && j < cell2.row + cell2.rowspan && cell2.column <= i && i < cell2.column + cell2.colspan
    );
    if (!cell) return;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    const activeCellLines = [];
    for (let rowIdx = cellStartRow; rowIdx <= cellEndRow; rowIdx++) {
      const lineText = document.lineAt(rowIdx).text;
      const boundaryPos = getLineBoundaryPos(lineText, vLines);
      const leftSep = boundaryPos[cell.column] !== -1 ? boundaryPos[cell.column] : vLines[cell.column];
      const rightSep = boundaryPos[cell.column + cell.colspan] !== -1 ? boundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];
      if (leftSep !== -1 && rightSep !== -1) {
        const slice = lineText.substring(leftSep + 1, rightSep);
        let cellLineText = slice.startsWith(" ") ? slice.substring(1) : slice;
        if (rowIdx === currentLineIdx) {
          if (/^\s*$/.test(slice)) {
            const relCursor = c - (leftSep + 1);
            const intentSpaces = Math.max(0, relCursor - 1);
            cellLineText = " ".repeat(intentSpaces);
          } else {
            const relCursor = c - (leftSep + 1);
            const cursorIdx = slice.startsWith(" ") ? relCursor - 1 : relCursor;
            const beforeCursor = cellLineText.substring(0, cursorIdx);
            const afterCursor = cellLineText.substring(cursorIdx);
            if (/^\s*$/.test(afterCursor)) {
              cellLineText = beforeCursor;
            } else {
              cellLineText = beforeCursor + afterCursor.trimEnd();
            }
          }
        } else {
          cellLineText = cellLineText.trim();
        }
        activeCellLines.push(cellLineText);
      } else {
        activeCellLines.push("");
      }
    }
    while (activeCellLines.length > 0 && activeCellLines[activeCellLines.length - 1] === "") {
      const lastLineIdx = cellStartRow + activeCellLines.length - 1;
      if (lastLineIdx === currentLineIdx) {
        break;
      }
      activeCellLines.pop();
    }
    while (activeCellLines.length > 0 && activeCellLines[0] === "") {
      const firstLineIdx = cellStartRow;
      if (firstLineIdx === currentLineIdx) {
        break;
      }
      activeCellLines.shift();
    }
    cell.content = activeCellLines;
    let textBeforeCursor = "";
    for (let rowIdx = cellStartRow; rowIdx <= cellEndRow; rowIdx++) {
      const lineText = document.lineAt(rowIdx).text;
      const boundaryPos = getLineBoundaryPos(lineText, vLines);
      const leftSep = boundaryPos[cell.column] !== -1 ? boundaryPos[cell.column] : vLines[cell.column];
      const rightSep = boundaryPos[cell.column + cell.colspan] !== -1 ? boundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];
      if (leftSep !== -1 && rightSep !== -1) {
        const slice = lineText.substring(leftSep + 1, rightSep);
        if (rowIdx < currentLineIdx) {
          textBeforeCursor += slice + "\n";
        } else if (rowIdx === currentLineIdx) {
          const relCursor = c - (leftSep + 1);
          textBeforeCursor += slice.substring(0, relCursor);
        }
      }
    }
    const targetNonSpaceCount = textBeforeCursor.replace(/\s/g, "").length;
    const trailingSpaceMatch = textBeforeCursor.match(/ *$/);
    const trailingSpaceCount = trailingSpaceMatch ? trailingSpaceMatch[0].length : 0;
    let formattedTable;
    try {
      formattedTable = (0, import_table_engine2.formatGeometricTable)(tableNode);
    } catch (e) {
      logToFile(`Error formatting table in runLiveFormatting: ${e.message}`);
      return;
    }
    if (formattedTable === tableStr) {
      return;
    }
    logToFile(`runLiveFormatting: table formatted. Length: ${formattedTable.length}`);
    let success = false;
    let hadPendingFormat = pendingFormat;
    try {
      isFormatting = true;
      isApplyingExtensionEdit = true;
      currentFormattedTable = formattedTable;
      const range = new vscode2.Range(
        new vscode2.Position(startLineIdx, 0),
        new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
      );
      const workspaceEdit = new vscode2.WorkspaceEdit();
      workspaceEdit.replace(document.uri, range, formattedTable);
      success = await applyWorkspaceEdit(workspaceEdit, document);
      logToFile(`runLiveFormatting: workspace.applyEdit success: ${success}`);
    } catch (err) {
      logToFile(`Error applying live format edit: ${err.message}`);
      console.error("Error applying live format edit:", err);
    } finally {
      isApplyingExtensionEdit = false;
      isFormatting = false;
      currentFormattedTable = void 0;
      if (bufferedChanges.length > 0) {
        const textToInsert = bufferedChanges.map((ch) => ch.text).join("");
        logToFile(`runLiveFormatting: writing ${bufferedChanges.length} buffered changes: "${textToInsert}"`);
        bufferedChanges = [];
        try {
          const bufferEdit = new vscode2.WorkspaceEdit();
          bufferEdit.insert(document.uri, currentEditor.selection.active, textToInsert);
          isApplyingExtensionEdit = true;
          await applyWorkspaceEdit(bufferEdit, document);
        } catch (e) {
          logToFile(`Error writing buffered changes: ${e.message}`);
          console.error("Error writing buffered changes:", e);
        } finally {
          isApplyingExtensionEdit = false;
        }
      }
      if (pendingFormat) {
        hadPendingFormat = true;
        logToFile(`runLiveFormatting: pendingFormat is true, scheduling follow-up in 100ms`);
        pendingFormat = false;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          debounceTimer = void 0;
          const editor = vscode2.window.activeTextEditor;
          if (editor) {
            runLiveFormatting(editor, editor.document);
          }
        }, 100);
      }
    }
    if (success) {
      const newHLines = [];
      const newRawLines = formattedTable.split("\n");
      const newMaxLength = Math.max(...newRawLines.map((line) => line.length));
      const newGrid = newRawLines.map((line) => line.padEnd(newMaxLength, " "));
      for (let row = 0; row < newGrid.length; row++) {
        const rowStr = newGrid[row];
        const isRowBorder = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
        if (isRowBorder) {
          newHLines.push(row);
        }
      }
      const newVLinesSet = /* @__PURE__ */ new Set();
      for (const borderRow of newHLines) {
        const rowStr = newGrid[borderRow];
        for (let col = 0; col < rowStr.length; col++) {
          if (rowStr[col] === "|" || rowStr[col] === "+") {
            newVLinesSet.add(col);
          }
        }
      }
      const newVLines = Array.from(newVLinesSet).sort((a, b) => a - b);
      if (hadPendingFormat) {
        logToFile(`runLiveFormatting: hadPendingFormat is true. Skipping editor cursor selection and bootstrapping activeTable.`);
        activeTable = {
          tableNode,
          startLineIdx,
          endLineIdx: startLineIdx + (newRawLines.length - 1),
          hLines: newHLines,
          vLines: newVLines,
          tableStr: formattedTable,
          documentUri: document.uri,
          documentVersion: document.version
        };
      } else {
        const formattedCellContent = [];
        const fCellStartRow = newHLines[cell.row] + 1;
        const fCellEndRow = newHLines[cell.row + cell.rowspan] - 1;
        for (let rowIdx = fCellStartRow; rowIdx <= fCellEndRow; rowIdx++) {
          const lineText = newRawLines[rowIdx];
          const leftSep = newVLines[cell.column];
          const rightSep = newVLines[cell.column + cell.colspan];
          const slice = lineText.substring(leftSep + 1, rightSep);
          const cellLineText = slice.startsWith(" ") ? slice.substring(1) : slice;
          formattedCellContent.push(cellLineText.trimEnd());
        }
        let accumNonSpace = 0;
        let targetLine = 0;
        let targetChar = 0;
        for (let idx = 0; idx < formattedCellContent.length; idx++) {
          const W_line = formattedCellContent[idx];
          const lineNonSpace = W_line.replace(/\s/g, "").length;
          if (accumNonSpace + lineNonSpace >= targetNonSpaceCount) {
            const rem = targetNonSpaceCount - accumNonSpace;
            let nonSpaceInLine = 0;
            let charIdx = 0;
            while (charIdx < W_line.length && nonSpaceInLine < rem) {
              if (W_line[charIdx] !== " ") {
                nonSpaceInLine++;
              }
              charIdx++;
            }
            targetLine = idx;
            targetChar = charIdx;
            break;
          } else {
            accumNonSpace += lineNonSpace;
            if (idx === formattedCellContent.length - 1) {
              targetLine = idx;
              targetChar = W_line.length;
            }
          }
        }
        let cellWidth = 0;
        for (let c2 = cell.column; c2 < cell.column + cell.colspan; c2++) {
          cellWidth += newVLines[c2 + 1] - newVLines[c2] - 1;
        }
        cellWidth += cell.colspan - 1;
        const maxTargetChar = Math.max(0, cellWidth - 1);
        const newMinLeadingSpaces = getMinLeadingSpacesForCell(
          cell,
          0,
          newHLines,
          newVLines,
          newRawLines
        );
        const actualTrailingSpaces = targetChar === 0 ? Math.max(0, trailingSpaceCount - newMinLeadingSpaces) : trailingSpaceCount;
        const finalTargetChar = Math.min(targetChar + actualTrailingSpaces, maxTargetChar);
        const newCursorLine = startLineIdx + fCellStartRow + targetLine;
        const newCursorChar = newVLines[cell.column] + 2 + finalTargetChar;
        isApplyingExtensionEdit = true;
        const newPosition = new vscode2.Position(newCursorLine, newCursorChar);
        currentEditor.selection = new vscode2.Selection(newPosition, newPosition);
        activeTable = {
          tableNode,
          startLineIdx,
          endLineIdx: startLineIdx + (newRawLines.length - 1),
          hLines: newHLines,
          vLines: newVLines,
          tableStr: formattedTable,
          documentUri: document.uri,
          documentVersion: document.version
        };
        isApplyingExtensionEdit = false;
      }
    }
  }
  async function runLayoutFormatting(currentEditor, document) {
    if (isFormatting) return;
    const position = currentEditor.selection.active;
    const currentLineIdx = position.line;
    const currentLineText = document.lineAt(currentLineIdx).text;
    if (!/^\s*[-=_]?\|/.test(currentLineText)) return;
    let startLineIdx = currentLineIdx;
    while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
      startLineIdx--;
    }
    let endLineIdx = currentLineIdx;
    while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
      endLineIdx++;
    }
    let tableLines = [];
    for (let l = startLineIdx; l <= endLineIdx; l++) {
      tableLines.push(document.lineAt(l).text);
    }
    let expandedAny = false;
    let targetIdx = -1;
    for (let i = 0; i < tableLines.length; i++) {
      if (/\|\s*\d+\s*x\s*\d+/.test(tableLines[i])) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx !== -1) {
      const lineText = tableLines[targetIdx];
      const match = lineText.match(/\|\s*(\d+)\s*x\s*(\d+)/);
      if (match) {
        const R = parseInt(match[1], 10);
        const C = parseInt(match[2], 10);
        if (startLineIdx === endLineIdx) {
          const borderRow = "|" + "---|".repeat(C);
          const cellRow = "|" + "   |".repeat(C);
          const newTableLines = [];
          newTableLines.push(borderRow);
          for (let r = 0; r < R; r++) {
            newTableLines.push(cellRow);
            newTableLines.push(borderRow);
          }
          tableLines = newTableLines;
          expandedAny = true;
        } else {
          const index = match.index;
          const length = match[0].length;
          const hasTrailingPipe = lineText.substring(index + length).trim().startsWith("|");
          const cleanedOfRxC = lineText.replace(/\|\s*\d+\s*x\s*\d+/, "");
          const isBorderRowWithRxC = cleanedOfRxC.trim() === "" || /^[|+\-\s=_]+$/.test(cleanedOfRxC.trim()) && (/[-=_]/.test(cleanedOfRxC.trim()) || cleanedOfRxC.includes("+"));
          let replacement = "";
          if (isBorderRowWithRxC) {
            replacement = "|---".repeat(C) + (hasTrailingPipe ? "" : "|");
          } else {
            replacement = "|   ".repeat(C) + (hasTrailingPipe ? "" : "|");
          }
          const resultText = lineText.substring(0, index) + replacement + lineText.substring(index + length);
          tableLines[targetIdx] = resultText;
          if (!isBorderRowWithRxC && R > 1) {
            const numPipes = (resultText.match(/\|/g) || []).length;
            const totalCols = numPipes - 1;
            if (totalCols > 0) {
              const extraLines = [];
              const borderLine = "|" + "---|".repeat(totalCols);
              const cellLine = "|" + "   |".repeat(totalCols);
              for (let r = 0; r < R - 1; r++) {
                extraLines.push(borderLine);
                extraLines.push(cellLine);
              }
              tableLines.splice(targetIdx + 1, 0, ...extraLines);
            }
          }
          expandedAny = true;
        }
      }
    }
    if (expandedAny) {
      const tableStr2 = tableLines.join("\n");
      let tableNode2;
      try {
        tableNode2 = (0, import_table_engine2.parseGeometricTable)(tableStr2, false, false);
        tableNode2 = (0, import_table_engine2.simplifyTable)(tableNode2);
      } catch (e) {
        return;
      }
      let formattedTable2;
      try {
        formattedTable2 = (0, import_table_engine2.formatGeometricTable)(tableNode2);
      } catch (e) {
        logToFile(`Error formatting expanded RxC table: ${e.message}`);
        return;
      }
      let success2 = false;
      try {
        isFormatting = true;
        isApplyingExtensionEdit = true;
        const range = new vscode2.Range(
          new vscode2.Position(startLineIdx, 0),
          new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
        );
        const workspaceEdit = new vscode2.WorkspaceEdit();
        workspaceEdit.replace(document.uri, range, formattedTable2);
        success2 = await applyWorkspaceEdit(workspaceEdit, document);
      } catch (err) {
        logToFile(`Error applying RxC format edit: ${err.message}`);
      } finally {
        isApplyingExtensionEdit = false;
        isFormatting = false;
      }
      if (success2) {
        const newLines = formattedTable2.split("\n");
        let targetLineIdx = startLineIdx + 1;
        if (startLineIdx !== endLineIdx && targetIdx !== -1) {
          targetLineIdx = startLineIdx + targetIdx;
        }
        const targetLineText = newLines[targetLineIdx - startLineIdx] || "";
        let targetPipeIdx = -1;
        let pipeCount2 = 0;
        for (let k = 0; k < targetLineText.length; k++) {
          if (targetLineText[k] === "|") {
            targetPipeIdx = k;
            break;
          }
        }
        const targetCharIdx = targetPipeIdx !== -1 ? targetPipeIdx + 2 : 2;
        const newPosition = new vscode2.Position(targetLineIdx, targetCharIdx);
        currentEditor.selection = new vscode2.Selection(newPosition, newPosition);
      }
      return;
    }
    const isBorderRow = (rowStr) => {
      const trimmed = rowStr.trim();
      return /^[|+\-\s=_]+$/.test(trimmed) && (/[-=_]/.test(trimmed) || trimmed.includes("+"));
    };
    let isMiddleColumnAddition = false;
    let newColIdx = -1;
    let originalTableLines = [];
    const tempTableLines = [];
    for (let l = startLineIdx; l <= endLineIdx; l++) {
      tempTableLines.push(document.lineAt(l).text);
    }
    const currentLineIdxInTemp = currentLineIdx - startLineIdx;
    if (isBorderRow(currentLineText)) {
      const otherBorderIdxs = tempTableLines.map((_, i) => i).filter((i) => i !== currentLineIdxInTemp && isBorderRow(tempTableLines[i]));
      if (otherBorderIdxs.length > 0) {
        const stableBorderRowIdx = otherBorderIdxs[0];
        const stableLine = tempTableLines[stableBorderRowIdx];
        const editedLine = currentLineText;
        const stablePipes = [];
        for (let c = 0; c < stableLine.length; c++) {
          if (stableLine[c] === "|") stablePipes.push(c);
        }
        const editedPipes = [];
        for (let c = 0; c < editedLine.length; c++) {
          if (editedLine[c] === "|" || editedLine[c] === "+") editedPipes.push(c);
        }
        if (editedPipes.length > stablePipes.length) {
          let bestExtraIdx = -1;
          let minAlignError = Infinity;
          for (let e = 1; e < editedPipes.length - 1; e++) {
            let error = 0;
            for (let idx = 0; idx < e; idx++) {
              error += Math.abs(editedPipes[idx] - stablePipes[idx]);
            }
            for (let idx = e; idx < stablePipes.length; idx++) {
              error += Math.abs(editedPipes[idx + 1] - stablePipes[idx]);
            }
            if (error < minAlignError) {
              minAlignError = error;
              bestExtraIdx = e;
            }
          }
          if (bestExtraIdx !== -1) {
            const extraPipePos = editedPipes[bestExtraIdx];
            let stableColIdx = -1;
            let relPipePos = -1;
            let cellTextLen = -1;
            for (let c = 0; c < stablePipes.length - 1; c++) {
              if (stablePipes[c] < extraPipePos && extraPipePos < stablePipes[c + 1]) {
                stableColIdx = c;
                const leftEditPipe = editedPipes[bestExtraIdx - 1];
                const rightEditPipe = editedPipes[bestExtraIdx + 1];
                const cellText = editedLine.substring(leftEditPipe + 1, rightEditPipe);
                cellTextLen = cellText.length;
                relPipePos = extraPipePos - leftEditPipe - 1;
                break;
              }
            }
            if (stableColIdx !== -1) {
              isMiddleColumnAddition = true;
              const isLeftHalf = relPipePos < cellTextLen / 2;
              if (isLeftHalf) {
                newColIdx = stableColIdx;
              } else {
                newColIdx = stableColIdx + 1;
              }
              originalTableLines = [...tempTableLines];
              originalTableLines[currentLineIdxInTemp] = stableLine;
            }
          }
        }
      }
    }
    if (isMiddleColumnAddition) {
      const tableStr2 = originalTableLines.join("\n");
      let tableNode2;
      try {
        tableNode2 = (0, import_table_engine2.parseGeometricTable)(tableStr2, false, false);
      } catch (e) {
        return;
      }
      if (!tableNode2 || tableNode2.cells.length === 0) return;
      const newCells = tableNode2.cells.map((cell) => ({ ...cell }));
      for (const cell of newCells) {
        if (cell.column >= newColIdx) {
          cell.column += 1;
        } else if (cell.column + cell.colspan > newColIdx) {
          cell.colspan += 1;
        }
      }
      for (let r = 0; r < tableNode2.rowsCount; r++) {
        const isCovered = newCells.some(
          (cell) => cell.row <= r && r < cell.row + cell.rowspan && cell.column <= newColIdx && newColIdx < cell.column + cell.colspan
        );
        if (!isCovered) {
          newCells.push({
            id: `cell_${r}_${newColIdx}`,
            row: r,
            column: newColIdx,
            rowspan: 1,
            colspan: 1,
            content: []
          });
        }
      }
      tableNode2.colsCount += 1;
      tableNode2.cells = newCells;
      let formattedTable2;
      try {
        tableNode2 = (0, import_table_engine2.simplifyTable)(tableNode2);
        formattedTable2 = (0, import_table_engine2.formatGeometricTable)(tableNode2);
      } catch (e) {
        logToFile(`Error formatting table in runLayoutFormatting: ${e.message}`);
        return;
      }
      let success2 = false;
      try {
        isFormatting = true;
        isApplyingExtensionEdit = true;
        const range = new vscode2.Range(
          new vscode2.Position(startLineIdx, 0),
          new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
        );
        const workspaceEdit = new vscode2.WorkspaceEdit();
        workspaceEdit.replace(document.uri, range, formattedTable2);
        success2 = await applyWorkspaceEdit(workspaceEdit, document);
      } catch (err) {
        logToFile(`Error applying live format edit (layout Tab): ${err.message}`);
      } finally {
        isApplyingExtensionEdit = false;
        isFormatting = false;
      }
      if (success2) {
        const newLines = formattedTable2.split("\n");
        const targetLineIdx = currentLineIdx;
        const targetLineText = newLines[targetLineIdx - startLineIdx] || "";
        let targetPipeIdx = -1;
        let pipeCount2 = 0;
        for (let k = 0; k < targetLineText.length; k++) {
          if (targetLineText[k] === "|") {
            if (pipeCount2 === newColIdx) {
              targetPipeIdx = k;
              break;
            }
            pipeCount2++;
          }
        }
        const targetCharIdx = targetPipeIdx !== -1 ? targetPipeIdx + 2 : 2;
        const newPosition = new vscode2.Position(targetLineIdx, targetCharIdx);
        currentEditor.selection = new vscode2.Selection(newPosition, newPosition);
      }
      return;
    }
    const firstPipeCurrentLine = currentLineText.indexOf("|");
    const lastPipeCurrentLine = currentLineText.lastIndexOf("|");
    let isLeftColumnAddition = false;
    let isRightColumnAddition = false;
    const pipeCount = (currentLineText.match(/\|/g) || []).length;
    if (pipeCount >= 2 && firstPipeCurrentLine !== -1 && startLineIdx !== endLineIdx) {
      const beforeFirstPipe = currentLineText.substring(0, firstPipeCurrentLine);
      const afterLastPipe = currentLineText.substring(lastPipeCurrentLine + 1);
      if (/[-=_]/.test(beforeFirstPipe)) {
        isLeftColumnAddition = true;
      } else if (/[-=_]/.test(afterLastPipe)) {
        isRightColumnAddition = true;
      }
    }
    const isColumnAddition = isLeftColumnAddition || isRightColumnAddition;
    tableLines = [];
    const borderChar = currentLineText.includes("=") ? "=" : currentLineText.includes("_") ? "_" : "-";
    for (let l = startLineIdx; l <= endLineIdx; l++) {
      let originalLine = "";
      if (l === currentLineIdx) {
        if (isLeftColumnAddition) {
          originalLine = currentLineText.trim().replace(/^[-=_]+/, "");
        } else if (isRightColumnAddition) {
          originalLine = currentLineText.trim().replace(/[-=_]+$/, "");
        } else {
          originalLine = currentLineText;
        }
      } else {
        originalLine = document.lineAt(l).text;
      }
      const trimmedOriginal = originalLine.trim();
      const isBorder = /^[|+\-\s=_]+$/.test(trimmedOriginal) && (/[-=_]/.test(trimmedOriginal) || trimmedOriginal.includes("+"));
      if (isLeftColumnAddition) {
        if (l === currentLineIdx) {
          if (isBorder) {
            tableLines.push("|" + borderChar.repeat(3) + originalLine.trim());
          } else {
            tableLines.push("|" + borderChar + "  " + originalLine.trim());
          }
        } else {
          if (isBorder) {
            tableLines.push("|" + borderChar.repeat(3) + originalLine.trim());
          } else {
            tableLines.push("|   " + originalLine.trim());
          }
        }
      } else if (isRightColumnAddition) {
        if (l === currentLineIdx) {
          if (isBorder) {
            tableLines.push(originalLine.trimEnd() + borderChar.repeat(3) + "|");
          } else {
            tableLines.push(originalLine.trimEnd() + borderChar + "|");
          }
        } else {
          if (isBorder) {
            tableLines.push(originalLine.trimEnd() + borderChar.repeat(3) + "|");
          } else {
            tableLines.push(originalLine.trimEnd() + "   |");
          }
        }
      } else {
        tableLines.push(originalLine);
      }
    }
    const stableVLinesSet = /* @__PURE__ */ new Set();
    for (let idx = 0; idx < tableLines.length; idx++) {
      if (idx === currentLineIdx - startLineIdx) continue;
      const lineText = tableLines[idx];
      for (let c = 0; c < lineText.length; c++) {
        if (lineText[c] === "|") {
          stableVLinesSet.add(c);
        }
      }
    }
    const stableVLines = Array.from(stableVLinesSet).sort((a, b) => a - b);
    const isPartialBorder = isPartialBorderRow(currentLineText) && !isColumnAddition;
    if (isPartialBorder) {
      if (stableVLines.length >= 2) {
        const rawParts = currentLineText.split("|");
        const colContents = rawParts.slice(1, rawParts.length - 1);
        let alignedLine = "|";
        for (let i = 0; i < stableVLines.length - 1; i++) {
          const colWidth = stableVLines[i + 1] - stableVLines[i] - 1;
          const rawContent = colContents[i] !== void 0 ? colContents[i] : currentLineText.includes("-") ? "-" : "";
          const trimmedCol = rawContent.trim();
          const isColBorder = trimmedCol.length > 0 && /^[|+\-\s=_]+$/.test(rawContent) && /[-=_]/.test(rawContent);
          if (isColBorder || currentLineText.trim() === "|-" || currentLineText.trim() === "|") {
            const borderChar2 = trimmedCol.includes("=") ? "=" : trimmedCol.includes("_") ? "_" : "-";
            alignedLine += borderChar2.repeat(colWidth) + "|";
          } else {
            alignedLine += rawContent.padEnd(colWidth, " ").substring(0, colWidth) + "|";
          }
        }
        tableLines[currentLineIdx - startLineIdx] = alignedLine;
      }
    }
    let updatedTableLines = [];
    for (let r = 0; r < tableLines.length; r++) {
      const lineText = tableLines[r];
      const isBorder = /^[|+\-\s=_]+$/.test(lineText.trim()) && (/[-=_]/.test(lineText.trim()) || lineText.includes("+")) && !isCellSplittingRow(lineText);
      if (isBorder) {
        updatedTableLines.push(lineText);
        continue;
      }
      const parts = lineText.split("|");
      if (parts.length < 2) {
        updatedTableLines.push(lineText);
        continue;
      }
      const colContents = parts.slice(1, parts.length - 1);
      const splitCols = [];
      const cleanedCols = [];
      for (let i = 0; i < colContents.length; i++) {
        const cellText = colContents[i];
        const trimmedCell = cellText.trim();
        const isCompleteBorder = /^[-=_]{2,}$/.test(trimmedCell) && !cellText.includes(" ");
        const hasSplitDash = trimmedCell.length > 0 && (/^[-=_]+/.test(trimmedCell) || /[-=_]+$/.test(trimmedCell)) && !isCompleteBorder;
        if (hasSplitDash) {
          splitCols.push(i);
          let cleaned = cellText;
          cleaned = cleaned.replace(/^[-=_]+/, "");
          cleaned = cleaned.replace(/[-=_]+$/, "");
          cleanedCols.push(cleaned);
        } else {
          cleanedCols.push(cellText);
        }
      }
      if (splitCols.length > 0) {
        const cleanedLine = "|" + cleanedCols.join("|") + "|";
        updatedTableLines.push(cleanedLine);
        let borderRow = "|";
        for (let i = 0; i < colContents.length; i++) {
          const colWidth = stableVLines[i + 1] !== void 0 && stableVLines[i] !== void 0 ? stableVLines[i + 1] - stableVLines[i] - 1 : colContents[i].length;
          if (splitCols.includes(i)) {
            const trimmedCell = colContents[i].trim();
            const borderChar2 = trimmedCell.includes("=") ? "=" : trimmedCell.includes("_") ? "_" : "-";
            borderRow += borderChar2.repeat(colWidth) + "|";
          } else {
            borderRow += " ".repeat(colWidth) + "|";
          }
        }
        updatedTableLines.push(borderRow);
        let emptyRow = "|";
        for (let i = 0; i < colContents.length; i++) {
          const colWidth = stableVLines[i + 1] !== void 0 && stableVLines[i] !== void 0 ? stableVLines[i + 1] - stableVLines[i] - 1 : colContents[i].length;
          emptyRow += " ".repeat(colWidth) + "|";
        }
        updatedTableLines.push(emptyRow);
      } else {
        updatedTableLines.push(lineText);
      }
    }
    tableLines = updatedTableLines;
    const tableStr = tableLines.join("\n");
    let tableNode;
    try {
      tableNode = (0, import_table_engine2.parseGeometricTable)(tableStr, false, false);
      tableNode = (0, import_table_engine2.simplifyTable)(tableNode);
    } catch (e) {
      return;
    }
    if (!tableNode || tableNode.cells.length === 0) {
      if (isPartialBorderRow(currentLineText)) {
        let success2 = false;
        const eol = document.eol === vscode2.EndOfLine.CRLF ? "\r\n" : "\n";
        const newTable = `|---|${eol}|   |${eol}|---|`;
        try {
          isFormatting = true;
          isApplyingExtensionEdit = true;
          const range = new vscode2.Range(
            new vscode2.Position(currentLineIdx, 0),
            new vscode2.Position(currentLineIdx, currentLineText.length)
          );
          const workspaceEdit = new vscode2.WorkspaceEdit();
          workspaceEdit.replace(document.uri, range, newTable);
          success2 = await applyWorkspaceEdit(workspaceEdit, document);
        } catch (err) {
          logToFile(`Error creating new 1x1 table in layoutTab: ${err.message}`);
        } finally {
          isApplyingExtensionEdit = false;
          isFormatting = false;
        }
        if (success2) {
          const newPosition = new vscode2.Position(currentLineIdx + 1, 2);
          currentEditor.selection = new vscode2.Selection(newPosition, newPosition);
        }
      }
      return;
    }
    let formattedTable;
    try {
      formattedTable = (0, import_table_engine2.formatGeometricTable)(tableNode);
    } catch (e) {
      logToFile(`Error formatting table in runLayoutFormatting: ${e.message}`);
      return;
    }
    let success = false;
    try {
      isFormatting = true;
      isApplyingExtensionEdit = true;
      const range = new vscode2.Range(
        new vscode2.Position(startLineIdx, 0),
        new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
      );
      const workspaceEdit = new vscode2.WorkspaceEdit();
      workspaceEdit.replace(document.uri, range, formattedTable);
      success = await applyWorkspaceEdit(workspaceEdit, document);
    } catch (err) {
      logToFile(`Error applying live format edit (layout Tab): ${err.message}`);
    } finally {
      isApplyingExtensionEdit = false;
      isFormatting = false;
    }
    if (success) {
      const newLines = formattedTable.split("\n");
      let colIdx = 0;
      let pipeCount2 = 0;
      for (let charIdx = 0; charIdx < Math.min(position.character, currentLineText.length); charIdx++) {
        if (currentLineText[charIdx] === "|") {
          pipeCount2++;
        }
      }
      colIdx = Math.max(0, pipeCount2 - 1);
      const lineAtCurrent = newLines[currentLineIdx - startLineIdx];
      const isCurrentContent = lineAtCurrent && lineAtCurrent.trim().startsWith("|") && !(/^[|+\-\s=_]+$/.test(lineAtCurrent) && (/[-=_]/.test(lineAtCurrent) || lineAtCurrent.includes("+")));
      const lineBelowCurrent = newLines[currentLineIdx - startLineIdx + 1];
      const isBelowContent = lineBelowCurrent && lineBelowCurrent.trim().startsWith("|") && !(/^[|+\-\s=_]+$/.test(lineBelowCurrent) && (/[-=_]/.test(lineBelowCurrent) || lineBelowCurrent.includes("+")));
      let targetLineIdx = -1;
      if (isColumnAddition) {
        targetLineIdx = currentLineIdx === startLineIdx ? currentLineIdx + 1 : currentLineIdx - 1;
      } else if (isBelowContent) {
        targetLineIdx = currentLineIdx + 1;
      } else if (isCurrentContent) {
        targetLineIdx = currentLineIdx;
      }
      if (targetLineIdx !== -1) {
        const targetLineText = newLines[targetLineIdx - startLineIdx];
        let currentPipeIdx = -1;
        let pCount = 0;
        for (let k = 0; k < targetLineText.length; k++) {
          if (targetLineText[k] === "|") {
            if (pCount === colIdx) {
              currentPipeIdx = k;
              break;
            }
            pCount++;
          }
        }
        const targetCharIdx = currentPipeIdx !== -1 ? currentPipeIdx + 2 : 2;
        const newPosition = new vscode2.Position(targetLineIdx, targetCharIdx);
        currentEditor.selection = new vscode2.Selection(newPosition, newPosition);
      } else {
        const formattedLineText = newLines[currentLineIdx - startLineIdx] || "";
        const newPosition = new vscode2.Position(currentLineIdx, formattedLineText.length);
        currentEditor.selection = new vscode2.Selection(newPosition, newPosition);
      }
    }
  }
  const documentChangeDisposable = vscode2.workspace.onDidChangeTextDocument(async (event) => {
    const docUriStr = event.document.uri.fsPath;
    const lastVer = lastFormattedVersions.get(docUriStr) || 0;
    if (event.document.version <= lastVer) {
      logToFile(`onDidChangeTextDocument: Ignoring own format event. Version ${event.document.version} <= ${lastVer}`);
      return;
    }
    if (isApplyingExtensionEdit) {
      return;
    }
    if (isFormatting) {
      pendingFormat = true;
      if (activeTable && activeTable.documentUri.fsPath === event.document.uri.fsPath && event.contentChanges.length === 1) {
        const change2 = event.contentChanges[0];
        if (change2.range.start.line >= activeTable.startLineIdx && change2.range.end.line <= activeTable.endLineIdx) {
          const prevTableLines = activeTable.tableStr.split("\n");
          const match = getSingleCellForChange(
            activeTable.tableNode,
            change2.range,
            activeTable.startLineIdx,
            activeTable.hLines,
            activeTable.vLines,
            prevTableLines
          );
          if (match) {
            const { cell, startLineIdxInCell, endLineIdxInCell, startCharIdxInCell, endCharIdxInCell } = match;
            let beforeText = cell.content[startLineIdxInCell] || "";
            let afterText = cell.content[endLineIdxInCell] || "";
            if (startCharIdxInCell > beforeText.length) {
              beforeText = beforeText.padEnd(startCharIdxInCell, " ");
            }
            let before = beforeText.substring(0, startCharIdxInCell);
            let after = afterText.substring(endCharIdxInCell);
            const relStartRow = change2.range.start.line - activeTable.startLineIdx;
            const relEndRow = change2.range.end.line - activeTable.startLineIdx;
            if (relStartRow >= 0 && relEndRow < prevTableLines.length) {
              const startLineText = prevTableLines[relStartRow];
              const leftSep = activeTable.vLines[cell.column];
              const rightSep = activeTable.vLines[cell.column + cell.colspan];
              if (leftSep !== -1 && rightSep !== -1) {
                const rawSlice = startLineText.substring(leftSep + 1, rightSep);
                if (/^\s*$/.test(rawSlice)) {
                  const relCursor = change2.range.start.character - (leftSep + 1);
                  const actualCursor = rawSlice.startsWith(" ") ? relCursor - 1 : relCursor;
                  before = " ".repeat(Math.max(0, actualCursor));
                  after = " ".repeat(Math.max(0, rawSlice.length - 1 - relCursor));
                }
              }
            }
            const insertedLines = change2.text.split(/\r?\n/);
            const pastedInsertion = [];
            if (insertedLines.length === 1) {
              pastedInsertion.push(before + insertedLines[0] + after);
            } else {
              pastedInsertion.push(before + insertedLines[0]);
              for (let k = 1; k < insertedLines.length - 1; k++) {
                pastedInsertion.push(insertedLines[k]);
              }
              pastedInsertion.push(insertedLines[insertedLines.length - 1] + after);
            }
            cell.content.splice(startLineIdxInCell, endLineIdxInCell - startLineIdxInCell + 1, ...pastedInsertion);
            const lineDiff = insertedLines.length - 1 - (endLineIdxInCell - startLineIdxInCell);
            if (lineDiff > 0) {
              for (const otherCell of activeTable.tableNode.cells) {
                if (otherCell.id !== cell.id) {
                  if (otherCell.row <= cell.row && cell.row < otherCell.row + otherCell.rowspan) {
                    for (let k = 0; k < lineDiff; k++) {
                      otherCell.content.push("");
                    }
                  }
                }
              }
            }
            const relStartLine = change2.range.start.line - activeTable.startLineIdx;
            const relEndLine = change2.range.end.line - activeTable.startLineIdx;
            if (relStartLine >= 0 && relEndLine < prevTableLines.length) {
              const startLineText = prevTableLines[relStartLine];
              const endLineText = prevTableLines[relEndLine];
              const tBefore = startLineText.substring(0, change2.range.start.character);
              const tAfter = endLineText.substring(change2.range.end.character);
              const replacedLines = [];
              if (insertedLines.length === 1) {
                replacedLines.push(tBefore + insertedLines[0] + tAfter);
              } else {
                replacedLines.push(tBefore + insertedLines[0]);
                for (let k = 1; k < insertedLines.length - 1; k++) {
                  replacedLines.push(insertedLines[k]);
                }
                replacedLines.push(insertedLines[insertedLines.length - 1] + tAfter);
              }
              prevTableLines.splice(relStartLine, relEndLine - relStartLine + 1, ...replacedLines);
              const newTableStr = prevTableLines.join("\n");
              activeTable.tableStr = newTableStr;
              recalculateActiveTableGeometries(newTableStr);
            }
            const newLineIdx = startLineIdxInCell + (insertedLines.length - 1);
            const newCharIdx = (insertedLines.length === 1 ? startCharIdxInCell : 0) + insertedLines[insertedLines.length - 1].length;
            activeTable.targetCursor = {
              cellId: cell.id,
              lineIdx: newLineIdx,
              charIdx: newCharIdx
            };
            const lineDelta = insertedLines.length - 1 - (change2.range.end.line - change2.range.start.line);
            activeTable.endLineIdx += lineDelta;
            logToFile(`onDidChangeTextDocument: Applied concurrent edit in memory while formatting. Cell: ${cell.id}`);
          }
        }
      }
      return;
    }
    const activeEditor = vscode2.window.activeTextEditor;
    if (!activeEditor || event.document !== activeEditor.document) return;
    if (!isSupportedFile(activeEditor.document)) return;
    if (event.reason === vscode2.TextDocumentChangeReason.Undo || event.reason === vscode2.TextDocumentChangeReason.Redo) {
      activeTable = void 0;
      return;
    }
    if (event.contentChanges.length === 0) {
      return;
    }
    const change = event.contentChanges[0];
    const isDeletion = change.text.length === 0 || change.rangeLength > 0 && change.text.length < change.rangeLength;
    if (activeTable && activeTable.documentUri.fsPath === event.document.uri.fsPath) {
      activeTable.isDeletion = isDeletion;
      if (change.range.start.line >= activeTable.startLineIdx && change.range.end.line <= activeTable.endLineIdx) {
        if (event.contentChanges.length === 1) {
          const prevTableLines = activeTable.tableStr.split("\n");
          const match = getSingleCellForChange(
            activeTable.tableNode,
            change.range,
            activeTable.startLineIdx,
            activeTable.hLines,
            activeTable.vLines,
            prevTableLines
          );
          if (match) {
            const { cell, startLineIdxInCell, endLineIdxInCell, startCharIdxInCell, endCharIdxInCell } = match;
            const leftSep = activeTable.vLines[cell.column];
            const rightSep = activeTable.vLines[cell.column + cell.colspan];
            const isHyphenOrPipe = change.text === "-" || change.text === "|";
            const isTouchingLeft = change.range.start.character === leftSep + 1;
            const isTouchingRight = change.range.start.character === rightSep;
            if (isHyphenOrPipe && (isTouchingLeft || isTouchingRight)) {
              logToFile(`onDidChangeTextDocument: Layout modification intent detected (typed ${change.text} touching boundary). Not resizing or adding padding.`);
              activeTable = void 0;
              return;
            }
            let beforeText = cell.content[startLineIdxInCell] || "";
            let afterText = cell.content[endLineIdxInCell] || "";
            if (startCharIdxInCell > beforeText.length) {
              beforeText = beforeText.padEnd(startCharIdxInCell, " ");
            }
            let before = beforeText.substring(0, startCharIdxInCell);
            let after = afterText.substring(endCharIdxInCell);
            const relStartRow = change.range.start.line - activeTable.startLineIdx;
            const relEndRow = change.range.end.line - activeTable.startLineIdx;
            if (relStartRow >= 0 && relEndRow < prevTableLines.length) {
              const startLineText = prevTableLines[relStartRow];
              const leftSep2 = activeTable.vLines[cell.column];
              const rightSep2 = activeTable.vLines[cell.column + cell.colspan];
              if (leftSep2 !== -1 && rightSep2 !== -1) {
                const rawSlice = startLineText.substring(leftSep2 + 1, rightSep2);
                if (/^\s*$/.test(rawSlice)) {
                  const relCursor = change.range.start.character - (leftSep2 + 1);
                  const actualCursor = rawSlice.startsWith(" ") ? relCursor - 1 : relCursor;
                  before = " ".repeat(Math.max(0, actualCursor));
                  after = " ".repeat(Math.max(0, rawSlice.length - 1 - relCursor));
                }
              }
            }
            const insertedLines = change.text.split(/\r?\n/);
            const pastedInsertion = [];
            if (insertedLines.length === 1) {
              pastedInsertion.push(before + insertedLines[0] + after);
            } else {
              pastedInsertion.push(before + insertedLines[0]);
              for (let k = 1; k < insertedLines.length - 1; k++) {
                pastedInsertion.push(insertedLines[k]);
              }
              pastedInsertion.push(insertedLines[insertedLines.length - 1] + after);
            }
            cell.content.splice(startLineIdxInCell, endLineIdxInCell - startLineIdxInCell + 1, ...pastedInsertion);
            const lineDiff = insertedLines.length - 1 - (endLineIdxInCell - startLineIdxInCell);
            if (lineDiff > 0) {
              for (const otherCell of activeTable.tableNode.cells) {
                if (otherCell.id !== cell.id) {
                  if (otherCell.row <= cell.row && cell.row < otherCell.row + otherCell.rowspan) {
                    for (let k = 0; k < lineDiff; k++) {
                      otherCell.content.push("");
                    }
                  }
                }
              }
            }
            const relStartLine = change.range.start.line - activeTable.startLineIdx;
            const relEndLine = change.range.end.line - activeTable.startLineIdx;
            if (relStartLine >= 0 && relEndLine < prevTableLines.length) {
              const startLineText = prevTableLines[relStartLine];
              const endLineText = prevTableLines[relEndLine];
              const tBefore = startLineText.substring(0, change.range.start.character);
              const tAfter = endLineText.substring(change.range.end.character);
              const replacedLines = [];
              if (insertedLines.length === 1) {
                replacedLines.push(tBefore + insertedLines[0] + tAfter);
              } else {
                replacedLines.push(tBefore + insertedLines[0]);
                for (let k = 1; k < insertedLines.length - 1; k++) {
                  replacedLines.push(insertedLines[k]);
                }
                replacedLines.push(insertedLines[insertedLines.length - 1] + tAfter);
              }
              prevTableLines.splice(relStartLine, relEndLine - relStartLine + 1, ...replacedLines);
              const newTableStr = prevTableLines.join("\n");
              activeTable.tableStr = newTableStr;
              recalculateActiveTableGeometries(newTableStr);
            }
            const newLineIdx = startLineIdxInCell + (insertedLines.length - 1);
            const newCharIdx = (insertedLines.length === 1 ? startCharIdxInCell : 0) + insertedLines[insertedLines.length - 1].length;
            activeTable.targetCursor = {
              cellId: cell.id,
              lineIdx: newLineIdx,
              charIdx: newCharIdx
            };
            const lineDelta = insertedLines.length - 1 - (change.range.end.line - change.range.start.line);
            activeTable.endLineIdx += lineDelta;
            logToFile(`onDidChangeTextDocument: In-memory mutation applied. Cell: ${cell.id}, Cursor: line ${newLineIdx}, char ${newCharIdx}`);
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(async () => {
              debounceTimer = void 0;
              logToFile(`onDidChangeTextDocument: in-memory live format debounce timeout firing`);
              const currentEditor = vscode2.window.activeTextEditor;
              if (!currentEditor || currentEditor.document !== event.document) return;
              await runLiveFormatting(currentEditor, event.document);
            }, 0);
            return;
          } else {
            logToFile(`onDidChangeTextDocument: Edit touched boundaries. Invalidating activeTable.`);
            activeTable = void 0;
          }
        } else {
          logToFile(`onDidChangeTextDocument: Multiple changes detected. Invalidating activeTable.`);
          activeTable = void 0;
        }
      } else {
        logToFile(`onDidChangeTextDocument: Edit outside activeTable boundaries. Invalidating activeTable.`);
        activeTable = void 0;
      }
    }
    if (!activeTable) {
      const position = change.range.start;
      const currentLineIdx = position.line;
      if (currentLineIdx < event.document.lineCount && event.document.lineAt(currentLineIdx).text.trim().startsWith("|")) {
        let startLineIdx = currentLineIdx;
        while (startLineIdx > 0 && event.document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
          startLineIdx--;
        }
        let endLineIdx = currentLineIdx;
        while (endLineIdx < event.document.lineCount - 1 && event.document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
          endLineIdx++;
        }
        const tableLines = [];
        for (let l = startLineIdx; l <= endLineIdx; l++) {
          tableLines.push(event.document.lineAt(l).text);
        }
        const tableStr = tableLines.join("\n");
        try {
          const tableNode = (0, import_table_engine2.parseGeometricTable)(tableStr, false, true, true);
          if (tableNode && tableNode.cells.length > 0) {
            const maxLength = Math.max(...tableLines.map((line) => line.length));
            const grid = tableLines.map((line) => line.padEnd(maxLength, " "));
            const hLines = [];
            for (let row = 0; row < grid.length; row++) {
              const rowStr = grid[row];
              const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
              if (isBorderRow) hLines.push(row);
            }
            const vLinesSet = /* @__PURE__ */ new Set();
            for (const borderRow of hLines) {
              const rowStr = grid[borderRow];
              for (let col = 0; col < rowStr.length; col++) {
                if (rowStr[col] === "|" || rowStr[col] === "+") vLinesSet.add(col);
              }
            }
            const vLines = Array.from(vLinesSet).sort((a, b) => a - b);
            if (hLines.length >= 2 && vLines.length >= 2) {
              activeTable = {
                tableNode,
                startLineIdx,
                endLineIdx,
                hLines,
                vLines,
                tableStr,
                documentUri: event.document.uri,
                documentVersion: event.document.version
              };
              logToFile(`onDidChangeTextDocument: Initialized activeTable. startLineIdx: ${startLineIdx}, endLineIdx: ${endLineIdx}`);
            }
          }
        } catch (e) {
          logToFile(`Error initializing activeTable: ${e.message}`);
        }
      }
    }
    const isMultilineInsert = event.contentChanges.length === 1 && change.range.isEmpty && change.text.includes("\n");
    let isInsideTable = false;
    if (isMultilineInsert) {
      const startLine = change.range.start.line;
      if (startLine < event.document.lineCount) {
        const lineText = event.document.lineAt(startLine).text;
        if (lineText.trim().startsWith("|")) {
          isInsideTable = true;
        }
      }
    }
    if (isInsideTable) {
      logToFile(`onDidChangeTextDocument: Multiline insert detected inside table! Intercepting...`);
      const currentText = event.document.getText();
      const startOffset = event.document.offsetAt(change.range.start);
      const previousText = currentText.substring(0, startOffset) + currentText.substring(startOffset + change.text.length);
      const prevLines = previousText.split(/\r?\n/);
      const cursorLine = change.range.start.line;
      const cursorChar = change.range.start.character;
      let startLineIdx = cursorLine;
      while (startLineIdx > 0 && prevLines[startLineIdx - 1].trim().startsWith("|")) {
        startLineIdx--;
      }
      let endLineIdx = cursorLine;
      while (endLineIdx < prevLines.length - 1 && prevLines[endLineIdx + 1].trim().startsWith("|")) {
        endLineIdx++;
      }
      const prevTableLines = prevLines.slice(startLineIdx, endLineIdx + 1);
      const tableStr = prevTableLines.join("\n");
      let tableNode;
      try {
        tableNode = (0, import_table_engine2.parseGeometricTable)(tableStr, false, true, true);
      } catch (e) {
        logToFile(`Error parsing reconstructed table: ${e.message}`);
        return;
      }
      if (!tableNode || tableNode.cells.length === 0) {
        return;
      }
      const r = cursorLine - startLineIdx;
      const c = cursorChar;
      const maxLength = Math.max(...prevTableLines.map((line) => line.length));
      const grid = prevTableLines.map((line) => line.padEnd(maxLength, " "));
      const hLines = [];
      for (let row = 0; row < grid.length; row++) {
        const rowStr = grid[row];
        const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
        if (isBorderRow) hLines.push(row);
      }
      const vLinesSet = /* @__PURE__ */ new Set();
      for (const borderRow of hLines) {
        const rowStr = grid[borderRow];
        for (let col = 0; col < rowStr.length; col++) {
          if (rowStr[col] === "|" || rowStr[col] === "+") vLinesSet.add(col);
        }
      }
      const vLines = Array.from(vLinesSet).sort((a, b) => a - b);
      if (hLines.length < 2 || vLines.length < 2) return;
      let j = -1;
      for (let idx = 0; idx < hLines.length - 1; idx++) {
        if (r > hLines[idx] && r < hLines[idx + 1]) {
          j = idx;
          break;
        }
      }
      const originalLineText = prevTableLines[r];
      const currentLineBoundaryPos = getLineBoundaryPos(originalLineText, vLines);
      let i = -1;
      for (let idx = 0; idx < vLines.length - 1; idx++) {
        const left = currentLineBoundaryPos[idx] !== -1 ? currentLineBoundaryPos[idx] : vLines[idx];
        const right = currentLineBoundaryPos[idx + 1] !== -1 ? currentLineBoundaryPos[idx + 1] : vLines[idx + 1];
        if (c > left && c <= right) {
          i = idx;
          break;
        }
      }
      if (j === -1 || i === -1) return;
      const cell = tableNode.cells.find(
        (cell2) => cell2.row <= j && j < cell2.row + cell2.rowspan && cell2.column <= i && i < cell2.column + cell2.colspan
      );
      if (!cell) return;
      const cellStartRow = hLines[cell.row] + 1;
      let linesBeforeCursor = 0;
      for (let rowIdx = cellStartRow; rowIdx < r; rowIdx++) {
        if (!hLines.includes(rowIdx)) {
          linesBeforeCursor++;
        }
      }
      const lineIdx = linesBeforeCursor;
      const boundaryPos = getLineBoundaryPos(originalLineText, vLines);
      const leftSep = boundaryPos[cell.column] !== -1 ? boundaryPos[cell.column] : vLines[cell.column];
      const rightSep = boundaryPos[cell.column + cell.colspan] !== -1 ? boundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];
      const colStart = leftSep + 1;
      const cellColEnd = rightSep - 1;
      const cellLineSlice = originalLineText.substring(colStart, cellColEnd + 1);
      const relCursor = c - colStart;
      const cellMinLeadingSpaces = getMinLeadingSpacesForCell(
        cell,
        startLineIdx,
        hLines,
        vLines,
        prevTableLines
      );
      const sliceTrimmedLeading = cellLineSlice.substring(cellMinLeadingSpaces);
      const actualRelCursor = Math.max(0, relCursor - cellMinLeadingSpaces);
      const part1 = sliceTrimmedLeading.substring(0, actualRelCursor);
      const part2 = sliceTrimmedLeading.substring(actualRelCursor).trimEnd();
      const normalizeIndentation = (lines) => {
        return lines.map((line) => {
          let processed = line.replace(/\t/g, "  ");
          const match = processed.match(/^( +)/);
          if (match) {
            const leadingSpaces = match[1].length;
            const newSpacesCount = Math.round(leadingSpaces / 2);
            processed = " ".repeat(newSpacesCount) + processed.substring(leadingSpaces);
          }
          return processed;
        });
      };
      const pastedLines = normalizeIndentation(change.text.split(/\r?\n/));
      const N = pastedLines.length - 1;
      const newContent = [...cell.content];
      while (newContent.length <= lineIdx) {
        newContent.push("");
      }
      const pastedInsertion = [];
      if (pastedLines.length === 1) {
        pastedInsertion.push(part1 + pastedLines[0] + part2);
      } else {
        pastedInsertion.push(part1 + pastedLines[0]);
        for (let k = 1; k < N; k++) {
          pastedInsertion.push(pastedLines[k]);
        }
        pastedInsertion.push(pastedLines[N] + part2);
      }
      newContent.splice(lineIdx, 1, ...pastedInsertion);
      cell.content = newContent;
      const extraLinesCount = pastedLines.length - 1;
      for (const otherCell of tableNode.cells) {
        if (otherCell.id !== cell.id) {
          if (otherCell.row <= j && j < otherCell.row + otherCell.rowspan) {
            for (let k = 0; k < extraLinesCount; k++) {
              otherCell.content.push("");
            }
          }
        }
      }
      let formattedTable;
      try {
        tableNode = (0, import_table_engine2.simplifyTable)(tableNode);
        formattedTable = (0, import_table_engine2.formatGeometricTable)(tableNode, true);
      } catch (e) {
        logToFile(`Error formatting table in paste interceptor: ${e.message}`);
        return;
      }
      const currentEndLineIdx = endLineIdx + extraLinesCount;
      const range = new vscode2.Range(
        new vscode2.Position(startLineIdx, 0),
        new vscode2.Position(currentEndLineIdx, event.document.lineAt(currentEndLineIdx).text.length)
      );
      let success = false;
      try {
        isFormatting = true;
        isApplyingExtensionEdit = true;
        const workspaceEdit = new vscode2.WorkspaceEdit();
        workspaceEdit.replace(event.document.uri, range, formattedTable);
        success = await applyWorkspaceEdit(workspaceEdit, event.document);
        logToFile(`Multiline paste format applied: ${success}`);
      } catch (err) {
        logToFile(`Error applying multiline paste format: ${err.message}`);
      } finally {
        isApplyingExtensionEdit = false;
        isFormatting = false;
      }
      if (success) {
        const newHLines = [];
        const newRawLines = formattedTable.split("\n");
        const newMaxLength = Math.max(...newRawLines.map((line) => line.length));
        const newGrid = newRawLines.map((line) => line.padEnd(newMaxLength, " "));
        for (let row = 0; row < newGrid.length; row++) {
          const rowStr = newGrid[row];
          const isRowBorder = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
          if (isRowBorder) newHLines.push(row);
        }
        const newVLinesSet = /* @__PURE__ */ new Set();
        for (const borderRow of newHLines) {
          const rowStr = newGrid[borderRow];
          for (let col = 0; col < rowStr.length; col++) {
            if (rowStr[col] === "|" || rowStr[col] === "+") newVLinesSet.add(col);
          }
        }
        const newVLines = Array.from(newVLinesSet).sort((a, b) => a - b);
        const fCellStartRow = newHLines[cell.row] + 1;
        const newCursorLine = startLineIdx + fCellStartRow + lineIdx + N;
        let lastLineLength = 0;
        if (N === 0) {
          lastLineLength = part1.length + pastedLines[0].length;
        } else {
          lastLineLength = pastedLines[N].length;
        }
        const newMinLeadingSpaces = getMinLeadingSpacesForCell(
          cell,
          0,
          newHLines,
          newVLines,
          newRawLines
        );
        const newCursorChar = newVLines[cell.column] + 1 + newMinLeadingSpaces + lastLineLength;
        const newPosition = new vscode2.Position(newCursorLine, newCursorChar);
        activeEditor.selection = new vscode2.Selection(newPosition, newPosition);
      }
      return;
    }
    const hasTableChange = event.contentChanges.some((change2) => {
      const startLine = change2.range.start.line;
      const endLine = Math.min(event.document.lineCount - 1, change2.range.end.line + (change2.text.split("\n").length - 1));
      for (let l = startLine; l <= endLine; l++) {
        if (event.document.lineAt(l).text.trim().startsWith("|")) {
          return true;
        }
      }
      return false;
    });
    if (!hasTableChange) {
      return;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      debounceTimer = void 0;
      logToFile(`onDidChangeTextDocument: live format debounce timeout firing`);
      if (isFormatting) {
        pendingFormat = true;
        return;
      }
      const currentEditor = vscode2.window.activeTextEditor;
      if (!currentEditor || currentEditor.document !== event.document) return;
      await runLiveFormatting(currentEditor, event.document);
    }, 100);
  });
  const activeTableSelectionDisposable = vscode2.window.onDidChangeTextEditorSelection((event) => {
    if (isApplyingExtensionEdit) return;
    if (isFormatting || debounceTimer !== void 0 || typeFormatScheduled) {
      return;
    }
    if (event.kind === vscode2.TextEditorSelectionChangeKind.Keyboard || event.kind === vscode2.TextEditorSelectionChangeKind.Mouse) {
      if (activeTable) {
        activeTable.targetCursor = void 0;
      }
    }
    const activeEditor = event.textEditor;
    if (!activeEditor || !isSupportedFile(activeEditor.document)) {
      activeTable = void 0;
      return;
    }
    const position = event.selections[0].active;
    const currentLineIdx = position.line;
    const document = activeEditor.document;
    const isLineInTable = currentLineIdx < document.lineCount && document.lineAt(currentLineIdx).text.trim().startsWith("|");
    if (isLineInTable) {
      if (activeTable && activeTable.documentUri.fsPath === document.uri.fsPath && currentLineIdx >= activeTable.startLineIdx && currentLineIdx <= activeTable.endLineIdx) {
        return;
      }
      let startLineIdx = currentLineIdx;
      while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
        startLineIdx--;
      }
      let endLineIdx = currentLineIdx;
      while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
        endLineIdx++;
      }
      const tableLines = [];
      for (let l = startLineIdx; l <= endLineIdx; l++) {
        tableLines.push(document.lineAt(l).text);
      }
      const tableStr = tableLines.join("\n");
      try {
        const tableNode = (0, import_table_engine2.parseGeometricTable)(tableStr, false, true, true);
        if (tableNode && tableNode.cells.length > 0) {
          const maxLength = Math.max(...tableLines.map((line) => line.length));
          const grid = tableLines.map((line) => line.padEnd(maxLength, " "));
          const hLines = [];
          for (let row = 0; row < grid.length; row++) {
            const rowStr = grid[row];
            const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
            if (isBorderRow) hLines.push(row);
          }
          const vLinesSet = /* @__PURE__ */ new Set();
          for (const borderRow of hLines) {
            const rowStr = grid[borderRow];
            for (let col = 0; col < rowStr.length; col++) {
              if (rowStr[col] === "|" || rowStr[col] === "+") vLinesSet.add(col);
            }
          }
          const vLines = Array.from(vLinesSet).sort((a, b) => a - b);
          if (hLines.length >= 2 && vLines.length >= 2) {
            activeTable = {
              tableNode,
              startLineIdx,
              endLineIdx,
              hLines,
              vLines,
              tableStr,
              documentUri: document.uri,
              documentVersion: document.version
            };
            logToFile(`onDidChangeTextEditorSelection: Pre-initialized activeTable. startLineIdx: ${startLineIdx}, endLineIdx: ${endLineIdx}`);
          }
        }
      } catch (e) {
        logToFile(`Error pre-initializing activeTable: ${e.message}`);
        activeTable = void 0;
      }
    } else {
      if (activeTable) {
        activeTable = void 0;
        logToFile(`onDidChangeTextEditorSelection: Cursor moved outside activeTable boundaries. Invalidating activeTable.`);
      }
    }
  });
  const documentSelector = [
    { language: "edumark" },
    { language: "markdown" },
    { language: "plaintext" },
    { pattern: "**/*.edu" },
    { pattern: "**/*.md" },
    { pattern: "**/*.txt" }
  ];
  const formattingProvider = vscode2.languages.registerDocumentFormattingEditProvider(documentSelector, {
    provideDocumentFormattingEdits(document, options, token) {
      const edits = [];
      const text = document.getText();
      const lines = text.split(/\r?\n/);
      let inTable = false;
      let tableLines = [];
      let startLineIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isTableLine = line.trim().startsWith("|");
        if (isTableLine) {
          if (!inTable) {
            inTable = true;
            startLineIdx = i;
          }
          tableLines.push(line);
        } else {
          if (inTable) {
            try {
              const tableStr = tableLines.join("\n");
              const node = (0, import_table_engine2.parseGeometricTable)(tableStr);
              if (node.cells.length > 0) {
                const formatted = (0, import_table_engine2.formatGeometricTable)(node);
                const range = new vscode2.Range(
                  new vscode2.Position(startLineIdx, 0),
                  new vscode2.Position(i - 1, lines[i - 1].length)
                );
                edits.push(vscode2.TextEdit.replace(range, formatted));
              }
            } catch (e) {
              console.error("Error auto-formatting table", e);
            }
            inTable = false;
            tableLines = [];
            startLineIdx = -1;
          }
        }
      }
      if (inTable && startLineIdx !== -1) {
        try {
          const tableStr = tableLines.join("\n");
          const node = (0, import_table_engine2.parseGeometricTable)(tableStr);
          if (node.cells.length > 0) {
            const formatted = (0, import_table_engine2.formatGeometricTable)(node);
            const range = new vscode2.Range(
              new vscode2.Position(startLineIdx, 0),
              new vscode2.Position(lines.length - 1, lines[lines.length - 1].length)
            );
            edits.push(vscode2.TextEdit.replace(range, formatted));
          }
        } catch (e) {
          console.error("Error auto-formatting table", e);
        }
      }
      return edits;
    }
  });
  const typeCommand = vscode2.commands.registerCommand("type", async (args) => {
    const activeEditor = vscode2.window.activeTextEditor;
    if (!activeEditor || !isSupportedFile(activeEditor.document)) {
      await vscode2.commands.executeCommand("default:type", args);
      return;
    }
    if (activeTable && activeTable.documentUri.fsPath === activeEditor.document.uri.fsPath) {
      let cell;
      let lineIdxInCell = 0;
      let charIdxInCell = 0;
      if (activeTable.targetCursor) {
        const tc = activeTable.targetCursor;
        cell = activeTable.tableNode.cells.find((c) => c.id === tc.cellId);
        lineIdxInCell = tc.lineIdx;
        charIdxInCell = tc.charIdx;
      } else {
        const position = activeEditor.selection.active;
        if (position.line >= activeTable.startLineIdx && position.line <= activeTable.endLineIdx) {
          const prevTableLines = activeTable.tableStr.split("\n");
          const match = getSingleCellForChange(
            activeTable.tableNode,
            new vscode2.Range(position, position),
            activeTable.startLineIdx,
            activeTable.hLines,
            activeTable.vLines,
            prevTableLines
          );
          if (match) {
            cell = match.cell;
            lineIdxInCell = match.startLineIdxInCell;
            charIdxInCell = match.startCharIdxInCell;
          }
        }
      }
      if (cell) {
        const leftSep = activeTable.vLines[cell.column];
        const rightSep = activeTable.vLines[cell.column + cell.colspan];
        const isHyphenOrPipe = args.text === "-" || args.text === "|";
        const editorCol = leftSep + 1 + charIdxInCell;
        const isTouchingLeft = editorCol === leftSep + 1;
        const isTouchingRight = editorCol === rightSep;
        if (isHyphenOrPipe && (isTouchingLeft || isTouchingRight)) {
          logToFile(`typeCommand: Layout modification intent detected. Bypassing activeTable mutation and replacing space.`);
          activeTable = void 0;
          const pos = activeEditor.selection.active;
          let rangeToReplace = new vscode2.Range(pos, pos);
          if (isTouchingLeft) {
            const lineText2 = activeEditor.document.lineAt(pos.line).text;
            if (lineText2[pos.character] === " ") {
              rangeToReplace = new vscode2.Range(pos, pos.translate(0, 1));
            }
          } else if (isTouchingRight) {
            if (pos.character > 0) {
              const lineText2 = activeEditor.document.lineAt(pos.line).text;
              if (lineText2[pos.character - 1] === " ") {
                rangeToReplace = new vscode2.Range(pos.translate(0, -1), pos);
              }
            }
          }
          isApplyingExtensionEdit = true;
          try {
            const success = await activeEditor.edit((editBuilder) => {
              editBuilder.replace(rangeToReplace, args.text);
            }, { undoStopBefore: false, undoStopAfter: false });
            if (success) {
              const targetChar = isTouchingLeft ? pos.character + 1 : pos.character;
              const newPos = new vscode2.Position(pos.line, targetChar);
              activeEditor.selection = new vscode2.Selection(newPos, newPos);
            }
          } finally {
            isApplyingExtensionEdit = false;
          }
          return;
        }
        let lineText = cell.content[lineIdxInCell] || "";
        if (charIdxInCell > lineText.length) {
          lineText = lineText.padEnd(charIdxInCell, " ");
        }
        cell.content[lineIdxInCell] = lineText.substring(0, charIdxInCell) + args.text + lineText.substring(charIdxInCell);
        activeTable.isDeletion = false;
        activeTable.targetCursor = {
          cellId: cell.id,
          lineIdx: lineIdxInCell,
          charIdx: charIdxInCell + args.text.length
        };
        if (!typeFormatScheduled) {
          typeFormatScheduled = true;
          const editor = activeEditor;
          const doc = activeEditor.document;
          setTimeout(() => {
            typeFormatScheduled = false;
            if (!isFormatting) {
              runLiveFormatting(editor, doc);
            } else {
              pendingFormat = true;
            }
          }, 0);
        }
        return;
      }
    }
    await vscode2.commands.executeCommand("default:type", args);
  });
  context.subscriptions.push(typeCommand);
  const tableEnterCommand = vscode2.commands.registerCommand("ataula.tableEnter", async () => {
    const activeEditor = vscode2.window.activeTextEditor;
    const isTableDoc = activeEditor && isSupportedFile(activeEditor.document);
    if (!activeEditor || !isTableDoc) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    const document = activeEditor.document;
    const position = activeEditor.selection.active;
    const currentLineIdx = position.line;
    const currentLineText = document.lineAt(currentLineIdx).text;
    if (!currentLineText.trim().startsWith("|")) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    let startLineIdx = currentLineIdx;
    while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
      startLineIdx--;
    }
    let endLineIdx = currentLineIdx;
    while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
      endLineIdx++;
    }
    const firstPipeCurrentLine = currentLineText.indexOf("|");
    const lastPipeCurrentLine = currentLineText.lastIndexOf("|");
    let isLeftColumnAddition = false;
    let isRightColumnAddition = false;
    if (firstPipeCurrentLine !== -1 && startLineIdx !== endLineIdx) {
      const beforeFirstPipe = currentLineText.substring(0, firstPipeCurrentLine);
      const afterLastPipe = currentLineText.substring(lastPipeCurrentLine + 1);
      if (/[-=_]/.test(beforeFirstPipe)) {
        isLeftColumnAddition = true;
      } else if (/[-=_]/.test(afterLastPipe)) {
        isRightColumnAddition = true;
      }
    }
    const isColumnAddition = isLeftColumnAddition || isRightColumnAddition;
    const isPartialBorder = isPartialBorderRow(currentLineText) || isColumnAddition;
    if (isPartialBorder) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    const tableLines = [];
    for (let l = startLineIdx; l <= endLineIdx; l++) {
      tableLines.push(document.lineAt(l).text);
    }
    const tableStr = tableLines.join("\n");
    let tableNode;
    try {
      tableNode = (0, import_table_engine2.parseGeometricTable)(tableStr, false, true, true);
    } catch (e) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    if (!tableNode || tableNode.cells.length === 0) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    const r = currentLineIdx - startLineIdx;
    const c = position.character;
    const maxLength = Math.max(...tableLines.map((line) => line.length));
    const grid = tableLines.map((line) => line.padEnd(maxLength, " "));
    const hLines = [];
    for (let row = 0; row < grid.length; row++) {
      const rowStr = grid[row];
      const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
      if (isBorderRow) {
        hLines.push(row);
      }
    }
    const vLinesSet = /* @__PURE__ */ new Set();
    for (const borderRow of hLines) {
      const rowStr = grid[borderRow];
      for (let col = 0; col < rowStr.length; col++) {
        if (rowStr[col] === "|" || rowStr[col] === "+") {
          vLinesSet.add(col);
        }
      }
    }
    const vLines = Array.from(vLinesSet).sort((a, b) => a - b);
    if (hLines.length < 2 || vLines.length < 2) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
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
    if (j === -1 || i === -1) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    const cell = tableNode.cells.find(
      (cell2) => cell2.row <= j && j < cell2.row + cell2.rowspan && cell2.column <= i && i < cell2.column + cell2.colspan
    );
    if (!cell) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    const cellStartRow = hLines[cell.row] + 1;
    let linesBeforeCursor = 0;
    for (let rowIdx = cellStartRow; rowIdx < r; rowIdx++) {
      if (!hLines.includes(rowIdx)) {
        linesBeforeCursor++;
      }
    }
    const lineIdx = linesBeforeCursor;
    const documentLineText = document.lineAt(currentLineIdx).text;
    const boundaryPos = getLineBoundaryPos(documentLineText, vLines);
    const leftSep = boundaryPos[cell.column] !== -1 ? boundaryPos[cell.column] : vLines[cell.column];
    const rightSep = boundaryPos[cell.column + cell.colspan] !== -1 ? boundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];
    const colStart = leftSep + 1;
    const cellColEnd = rightSep - 1;
    const cellLineSlice = documentLineText.substring(colStart, cellColEnd + 1);
    const relCursor = c - colStart;
    const part1 = cellLineSlice.substring(0, relCursor).trimStart();
    const part2 = cellLineSlice.substring(relCursor).trimEnd();
    const newContent = [...cell.content];
    while (newContent.length <= lineIdx) {
      newContent.push("");
    }
    newContent[lineIdx] = part1;
    newContent.splice(lineIdx + 1, 0, part2);
    cell.content = newContent;
    for (const otherCell of tableNode.cells) {
      if (otherCell.id !== cell.id) {
        if (otherCell.row <= j && j < otherCell.row + otherCell.rowspan) {
          otherCell.content.push("");
        }
      }
    }
    let formattedTable;
    try {
      formattedTable = (0, import_table_engine2.formatGeometricTable)(tableNode);
    } catch (e) {
      await vscode2.commands.executeCommand("type", { text: "\n" });
      return;
    }
    const range = new vscode2.Range(
      new vscode2.Position(startLineIdx, 0),
      new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
    );
    let success = false;
    try {
      isFormatting = true;
      isApplyingExtensionEdit = true;
      const workspaceEdit = new vscode2.WorkspaceEdit();
      workspaceEdit.replace(document.uri, range, formattedTable);
      success = await applyWorkspaceEdit(workspaceEdit, document);
      logToFile(`tableEnterCommand: workspace.applyEdit success: ${success}`);
    } catch (err) {
      logToFile(`Error applying tableEnter edit: ${err.message}`);
      console.error("Error applying tableEnter edit:", err);
    } finally {
      isApplyingExtensionEdit = false;
      isFormatting = false;
    }
    if (success) {
      const newHLines = [];
      const newRawLines = formattedTable.split("\n");
      const newMaxLength = Math.max(...newRawLines.map((line) => line.length));
      const newGrid = newRawLines.map((line) => line.padEnd(newMaxLength, " "));
      for (let row = 0; row < newGrid.length; row++) {
        const rowStr = newGrid[row];
        const isBorderRow = /^[|+\-\s=_]+$/.test(rowStr) && (/[-=_]/.test(rowStr) || rowStr.includes("+"));
        if (isBorderRow) {
          newHLines.push(row);
        }
      }
      const newVLinesSet = /* @__PURE__ */ new Set();
      for (const borderRow of newHLines) {
        const rowStr = newGrid[borderRow];
        for (let col = 0; col < rowStr.length; col++) {
          if (rowStr[col] === "|" || rowStr[col] === "+") {
            newVLinesSet.add(col);
          }
        }
      }
      const newVLines = Array.from(newVLinesSet).sort((a, b) => a - b);
      let contentRowsCount = 0;
      let newCursorLineRel = newHLines[cell.row] + 1;
      while (contentRowsCount < lineIdx + 2 && newCursorLineRel < newGrid.length) {
        if (!newHLines.includes(newCursorLineRel)) {
          contentRowsCount++;
        }
        if (contentRowsCount < lineIdx + 2) {
          newCursorLineRel++;
        }
      }
      const newCursorLine = startLineIdx + newCursorLineRel;
      const newCursorChar = newVLines[cell.column] + 2;
      isApplyingExtensionEdit = true;
      const newPosition = new vscode2.Position(newCursorLine, newCursorChar);
      activeEditor.selection = new vscode2.Selection(newPosition, newPosition);
      if (activeTable) {
        activeTable.endLineIdx = activeTable.startLineIdx + (newRawLines.length - 1);
        activeTable.hLines = newHLines;
        activeTable.vLines = newVLines;
        activeTable.tableStr = formattedTable;
        activeTable.documentVersion = document.version;
        activeTable.targetCursor = {
          cellId: cell.id,
          lineIdx: lineIdx + 1,
          charIdx: 0
        };
      }
      isApplyingExtensionEdit = false;
    }
  });
  const tableTabCommand = vscode2.commands.registerCommand("ataula.tableTab", async () => {
    const activeEditor = vscode2.window.activeTextEditor;
    const isTableDoc = activeEditor && isSupportedFile(activeEditor.document);
    if (!activeEditor || !isTableDoc) {
      await vscode2.commands.executeCommand("type", { text: "\xBA" });
      return;
    }
    const document = activeEditor.document;
    const position = activeEditor.selection.active;
    const currentLineText = document.lineAt(position.line).text;
    const textBeforeCursor = currentLineText.substring(0, position.character);
    const textAfterCursor = currentLineText.substring(position.character);
    const cond1 = /\| *[-=_]+$/.test(textBeforeCursor);
    const cond2 = /\| *$/.test(textBeforeCursor) && /^[-=_]+/.test(textAfterCursor);
    const cond3 = /[-=_]+$/.test(textBeforeCursor) && /^ *\|/.test(textAfterCursor);
    const cond4 = /^[-=_]+ *\|/.test(textAfterCursor);
    const hasRxC = /\|\s*\d+\s*x\s*\d+/.test(currentLineText);
    if (cond1 || cond2 || cond3 || cond4 || hasRxC) {
      await runLayoutFormatting(activeEditor, document);
    } else {
      await vscode2.commands.executeCommand("type", { text: "\xBA" });
    }
  });
  const convertToMarkdownCommand = vscode2.commands.registerCommand("ataula.convertToMarkdown", async () => {
    const activeEditor = vscode2.window.activeTextEditor;
    if (!activeEditor) return;
    const document = activeEditor.document;
    const position = activeEditor.selection.active;
    const currentLineIdx = position.line;
    const currentLineText = document.lineAt(currentLineIdx).text;
    if (!currentLineText.trim().startsWith("|")) {
      vscode2.window.showWarningMessage("El cursor no est\xE1 sobre una tabla.");
      return;
    }
    let startLineIdx = currentLineIdx;
    while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
      startLineIdx--;
    }
    let endLineIdx = currentLineIdx;
    while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
      endLineIdx++;
    }
    const lines = [];
    for (let l = startLineIdx; l <= endLineIdx; l++) {
      lines.push(document.lineAt(l).text);
    }
    const tableStr = lines.join("\n");
    let tableNode;
    try {
      tableNode = (0, import_table_engine2.parseGeometricTable)(tableStr, false, false);
    } catch (e) {
      vscode2.window.showErrorMessage("No se pudo analizar la tabla geom\xE9trica.");
      return;
    }
    if (!tableNode || tableNode.cells.length === 0) {
      vscode2.window.showErrorMessage("La tabla geom\xE9trica est\xE1 vac\xEDa o no es v\xE1lida.");
      return;
    }
    const escapeMarkdownCell = (value) => {
      return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
    };
    const grid = Array.from(
      { length: tableNode.rowsCount },
      () => Array.from({ length: tableNode.colsCount }, () => "")
    );
    for (const cell of tableNode.cells) {
      const cellText = cell.content.map((line) => escapeMarkdownCell(line.trim())).join("<br>");
      grid[cell.row][cell.column] = cellText;
    }
    const mdLines = [];
    const headerCols = grid[0] || [];
    mdLines.push("| " + headerCols.join(" | ") + " |");
    const separatorRow = "| " + Array(tableNode.colsCount).fill("---").join(" | ") + " |";
    mdLines.push(separatorRow);
    for (let r = 1; r < tableNode.rowsCount; r++) {
      mdLines.push("| " + grid[r].join(" | ") + " |");
    }
    const markdownTableText = mdLines.join("\n");
    try {
      isFormatting = true;
      isApplyingExtensionEdit = true;
      const range = new vscode2.Range(
        new vscode2.Position(startLineIdx, 0),
        new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
      );
      const workspaceEdit = new vscode2.WorkspaceEdit();
      workspaceEdit.replace(document.uri, range, markdownTableText);
      await applyWorkspaceEdit(workspaceEdit, document);
    } catch (err) {
      vscode2.window.showErrorMessage(`Error al convertir a Markdown: ${err.message}`);
    } finally {
      isApplyingExtensionEdit = false;
      isFormatting = false;
    }
  });
  const convertToAtaulaCommand = vscode2.commands.registerCommand("ataula.convertToAtaula", async () => {
    const activeEditor = vscode2.window.activeTextEditor;
    if (!activeEditor) return;
    const document = activeEditor.document;
    const position = activeEditor.selection.active;
    const currentLineIdx = position.line;
    const currentLineText = document.lineAt(currentLineIdx).text;
    if (!currentLineText.trim().startsWith("|")) {
      vscode2.window.showWarningMessage("El cursor no est\xE1 sobre una tabla.");
      return;
    }
    let startLineIdx = currentLineIdx;
    while (startLineIdx > 0 && document.lineAt(startLineIdx - 1).text.trim().startsWith("|")) {
      startLineIdx--;
    }
    let endLineIdx = currentLineIdx;
    while (endLineIdx < document.lineCount - 1 && document.lineAt(endLineIdx + 1).text.trim().startsWith("|")) {
      endLineIdx++;
    }
    const lines = [];
    for (let l = startLineIdx; l <= endLineIdx; l++) {
      lines.push(document.lineAt(l).text.trim());
    }
    const headerLines = [];
    const bodyLines = [];
    let foundSeparator = false;
    for (const line of lines) {
      const isSep = /^[|:\-\s]+$/.test(line) && line.includes("-");
      if (isSep) {
        foundSeparator = true;
        continue;
      }
      if (!foundSeparator) {
        headerLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }
    const allRows = [];
    const splitMarkdownRow = (rowStr) => {
      const cells2 = [];
      let current = "";
      let escaped = false;
      for (const char of rowStr) {
        if (escaped) {
          current += char;
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "|") {
          cells2.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      if (escaped) {
        current += "\\";
      }
      cells2.push(current);
      return cells2;
    };
    const parseMarkdownRow = (rowStr) => {
      const trimmed = rowStr.trim();
      if (trimmed.startsWith("|")) {
        const parts = splitMarkdownRow(trimmed.substring(1));
        if (trimmed.endsWith("|")) {
          parts.pop();
        }
        return parts.map((p) => p.trim());
      }
      return splitMarkdownRow(rowStr).map((p) => p.trim());
    };
    for (const hl of headerLines) {
      allRows.push(parseMarkdownRow(hl));
    }
    for (const bl of bodyLines) {
      allRows.push(parseMarkdownRow(bl));
    }
    const numRows = allRows.length;
    if (numRows === 0) {
      vscode2.window.showErrorMessage("La tabla Markdown no tiene filas v\xE1lidas.");
      return;
    }
    const numCols = Math.max(...allRows.map((r) => r.length));
    const cells = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const val = allRows[r][c] || "";
        const cellContent = val.split(/<br\s*\/?>/i).map((line) => line.trim());
        cells.push({
          id: `cell_${r}_${c}`,
          row: r,
          column: c,
          colspan: 1,
          rowspan: 1,
          content: cellContent
        });
      }
    }
    const tableNode = {
      type: "table",
      rowsCount: numRows,
      colsCount: numCols,
      cells
    };
    let formattedAtaulaTable;
    try {
      formattedAtaulaTable = (0, import_table_engine2.formatGeometricTable)(tableNode);
    } catch (e) {
      vscode2.window.showErrorMessage(`No se pudo formatear la tabla Ataula: ${e.message}`);
      return;
    }
    try {
      isFormatting = true;
      isApplyingExtensionEdit = true;
      const range = new vscode2.Range(
        new vscode2.Position(startLineIdx, 0),
        new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
      );
      const workspaceEdit = new vscode2.WorkspaceEdit();
      workspaceEdit.replace(document.uri, range, formattedAtaulaTable);
      await applyWorkspaceEdit(workspaceEdit, document);
    } catch (err) {
      vscode2.window.showErrorMessage(`Error al convertir a Ataula: ${err.message}`);
    } finally {
      isApplyingExtensionEdit = false;
      isFormatting = false;
    }
  });
  const selectCellContentCommand = vscode2.commands.registerCommand("ataula.selectCellContent", () => {
    const activeEditor = vscode2.window.activeTextEditor;
    if (!activeEditor) return;
    const document = activeEditor.document;
    const position = activeEditor.selection.active;
    const info = getCellAtPosition(document, position);
    if (!info) return;
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    const selections = [];
    for (let rIdx = cellStartRow; rIdx <= cellEndRow; rIdx++) {
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
          selections.push(new vscode2.Selection(
            new vscode2.Position(rIdx, contentStart),
            new vscode2.Position(rIdx, contentEnd)
          ));
        } else {
          selections.push(new vscode2.Selection(
            new vscode2.Position(rIdx, lSep + 2),
            new vscode2.Position(rIdx, lSep + 2)
          ));
        }
      }
    }
    if (selections.length > 0) {
      activeEditor.selections = selections;
    }
  });
  const selectionRangeProvider = vscode2.languages.registerSelectionRangeProvider("*", {
    provideSelectionRanges(document, positions) {
      return positions.map((position) => {
        const info = getCellAtPosition(document, position);
        if (!info) return new vscode2.SelectionRange(new vscode2.Range(position, position));
        const { cell, startLineIdx, endLineIdx, hLines, vLines } = info;
        const lineText = document.lineAt(position.line).text;
        const boundaryPos = getLineBoundaryPos(lineText, vLines);
        const leftSep = boundaryPos[cell.column] !== -1 ? boundaryPos[cell.column] : vLines[cell.column];
        const rightSep = boundaryPos[cell.column + cell.colspan] !== -1 ? boundaryPos[cell.column + cell.colspan] : vLines[cell.column + cell.colspan];
        if (leftSep === -1 || rightSep === -1) {
          return new vscode2.SelectionRange(new vscode2.Range(position, position));
        }
        const rawCellLine = lineText.substring(leftSep + 1, rightSep);
        const matchStart = rawCellLine.match(/^\s*/);
        const startSpaces = matchStart ? matchStart[0].length : 0;
        const matchEnd = rawCellLine.match(/\s*$/);
        const endSpaces = matchEnd ? matchEnd[0].length : 0;
        const contentStart = leftSep + 1 + startSpaces;
        const contentEnd = rightSep - endSpaces;
        const wordRange = document.getWordRangeAtPosition(position);
        let cellLineRange;
        if (contentStart < contentEnd) {
          cellLineRange = new vscode2.Range(
            new vscode2.Position(position.line, contentStart),
            new vscode2.Position(position.line, contentEnd)
          );
        } else {
          cellLineRange = new vscode2.Range(
            new vscode2.Position(position.line, leftSep + 1),
            new vscode2.Position(position.line, rightSep)
          );
        }
        const cellStartRow = startLineIdx + hLines[cell.row] + 1;
        const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
        const cellFullRange = new vscode2.Range(
          new vscode2.Position(cellStartRow, leftSep + 1),
          new vscode2.Position(cellEndRow, rightSep - 1)
        );
        const tableRange = new vscode2.Range(
          new vscode2.Position(startLineIdx, 0),
          new vscode2.Position(endLineIdx, document.lineAt(endLineIdx).text.length)
        );
        let lastRange = new vscode2.SelectionRange(cellLineRange);
        if (wordRange && cellLineRange.contains(wordRange)) {
          lastRange = new vscode2.SelectionRange(wordRange, new vscode2.SelectionRange(cellLineRange));
        }
        const fullCellSR = new vscode2.SelectionRange(cellFullRange);
        let curr = lastRange;
        while (curr.parent) {
          curr = curr.parent;
        }
        curr.parent = fullCellSR;
        const tableSR = new vscode2.SelectionRange(tableRange);
        fullCellSR.parent = tableSR;
        return lastRange;
      });
    }
  });
  let isConvertingSelection = false;
  let mouseSelectionTimer = void 0;
  const autoSelectionDisposable = vscode2.window.onDidChangeTextEditorSelection((event) => {
    const editor = event.textEditor;
    const isTableDoc = isSupportedFile(editor.document);
    if (isTableDoc && event.selections.length > 0) {
      const position = editor.selection.active;
      const info = getCellAtPosition(editor.document, position);
      vscode2.commands.executeCommand("setContext", "ataula.isInTableCell", !!info);
    } else {
      vscode2.commands.executeCommand("setContext", "ataula.isInTableCell", false);
    }
    if (isConvertingSelection || isApplyingExtensionEdit || isFormatting) return;
    if (!isTableDoc) return;
    if (event.selections.length > 1 && event.selections.every((sel) => sel.isEmpty)) {
      isConvertingSelection = true;
      try {
        editor.selections = [editor.selections[0]];
      } catch (e) {
      } finally {
        isConvertingSelection = false;
      }
      return;
    }
    if (mouseSelectionTimer) {
      clearTimeout(mouseSelectionTimer);
      mouseSelectionTimer = void 0;
    }
    if (event.selections.length === 1 && event.kind === vscode2.TextEditorSelectionChangeKind.Mouse) {
      const selection = event.selections[0];
      if (!selection.isEmpty && selection.start.line !== selection.end.line) {
        const anchorInfo = getCellAtPosition(editor.document, selection.anchor);
        if (anchorInfo) {
          mouseSelectionTimer = setTimeout(() => {
            isConvertingSelection = true;
            try {
              const { cell, startLineIdx, hLines } = anchorInfo;
              const cellStartRow = startLineIdx + hLines[cell.row] + 1;
              const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
              const clampedLine = Math.max(cellStartRow, Math.min(cellEndRow, selection.active.line));
              const clampedActive = new vscode2.Position(clampedLine, selection.active.character);
              const vAnchor = getVirtualPosition(editor, selection.anchor, anchorInfo);
              const vActive = getVirtualPosition(editor, clampedActive, anchorInfo);
              applyVirtualSelection(editor, anchorInfo, vAnchor, vActive);
            } catch (e) {
            } finally {
              isConvertingSelection = false;
            }
          }, 150);
        }
      }
    }
  });
  function getVirtualPosition(editor, pos, info) {
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const bounds = getCellLineContentBounds(editor.document, pos.line, cell, vLines);
    const k = pos.line - cellStartRow;
    const o = Math.max(0, Math.min(bounds.end - bounds.start, pos.character - bounds.start));
    return { k, o };
  }
  function applyVirtualSelection(editor, info, vAnchor, vActive) {
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    const N = cellEndRow - cellStartRow + 1;
    const rowBounds = [];
    for (let k = 0; k < N; k++) {
      const line = cellStartRow + k;
      const bounds = getCellLineContentBounds(editor.document, line, cell, vLines);
      rowBounds.push({
        line,
        start: bounds.start,
        end: bounds.end,
        len: bounds.end - bounds.start
      });
    }
    const kMin = Math.min(vAnchor.k, vActive.k);
    const kMax = Math.max(vAnchor.k, vActive.k);
    const selections = [];
    for (let k = 0; k < N; k++) {
      const rb = rowBounds[k];
      if (k < kMin || k > kMax) {
        continue;
      }
      let startO = 0;
      let endO = rb.len;
      let dirAnchorO = 0;
      let dirActiveO = rb.len;
      if (kMin === kMax) {
        startO = Math.min(vAnchor.o, vActive.o);
        endO = Math.max(vAnchor.o, vActive.o);
        dirAnchorO = vAnchor.o;
        dirActiveO = vActive.o;
      } else if (k === kMin) {
        if (vAnchor.k === kMin) {
          startO = vAnchor.o;
          endO = rb.len;
          dirAnchorO = vAnchor.o;
          dirActiveO = rb.len;
        } else {
          startO = vActive.o;
          endO = rb.len;
          dirAnchorO = rb.len;
          dirActiveO = vActive.o;
        }
      } else if (k === kMax) {
        if (vAnchor.k === kMax) {
          startO = 0;
          endO = vAnchor.o;
          dirAnchorO = vAnchor.o;
          dirActiveO = 0;
        } else {
          startO = 0;
          endO = vActive.o;
          dirAnchorO = 0;
          dirActiveO = vActive.o;
        }
      } else {
        startO = 0;
        endO = rb.len;
        if (vActive.k > vAnchor.k) {
          dirAnchorO = 0;
          dirActiveO = rb.len;
        } else {
          dirAnchorO = rb.len;
          dirActiveO = 0;
        }
      }
      const anchorPos = new vscode2.Position(rb.line, rb.start + dirAnchorO);
      const activePos = new vscode2.Position(rb.line, rb.start + dirActiveO);
      selections.push(new vscode2.Selection(anchorPos, activePos));
    }
    const activeLine = cellStartRow + vActive.k;
    const activeIdx = selections.findIndex((sel) => sel.active.line === activeLine);
    if (activeIdx !== -1) {
      const activeSel = selections[activeIdx];
      selections.splice(activeIdx, 1);
      selections.unshift(activeSel);
    }
    if (selections.length > 0) {
      editor.selections = selections;
    }
  }
  const registerNavCommand = (id, execute) => {
    context.subscriptions.push(vscode2.commands.registerCommand(id, () => {
      const editor = vscode2.window.activeTextEditor;
      if (editor) execute(editor);
    }));
  };
  registerNavCommand("ataula.cursorRight", (editor) => {
    vscode2.commands.executeCommand("cursorRight");
  });
  registerNavCommand("ataula.cursorLeft", (editor) => {
    vscode2.commands.executeCommand("cursorLeft");
  });
  function findCellAtGrid(cells, row, col) {
    return cells.find((c) => row >= c.row && row < c.row + c.rowspan && col >= c.column && col < c.column + c.colspan);
  }
  function getSelectedCells(editor, info) {
    const cells = [];
    for (const sel of editor.selections) {
      const sInfo = getCellAtPosition(editor.document, sel.active);
      if (sInfo && !cells.some((c) => c.id === sInfo.cell.id)) {
        cells.push(sInfo.cell);
      }
    }
    if (cells.length === 0 && info) {
      cells.push(info.cell);
    }
    return cells;
  }
  function selectCellsCompletely(editor, info, cellsToSelect, vActiveIsEnd) {
    const { startLineIdx, hLines, vLines } = info;
    const selections = [];
    for (const cell of cellsToSelect) {
      const cellStartRow = startLineIdx + hLines[cell.row] + 1;
      const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
      const N = cellEndRow - cellStartRow + 1;
      for (let k = 0; k < N; k++) {
        const line = cellStartRow + k;
        const bounds = getCellLineContentBounds(editor.document, line, cell, vLines);
        if (vActiveIsEnd) {
          selections.push(new vscode2.Selection(
            new vscode2.Position(line, bounds.start),
            new vscode2.Position(line, bounds.end)
          ));
        } else {
          selections.push(new vscode2.Selection(
            new vscode2.Position(line, bounds.end),
            new vscode2.Position(line, bounds.start)
          ));
        }
      }
    }
    if (selections.length > 0) {
      editor.selections = selections;
    }
  }
  function isCellAtBoundary(editor, info, direction) {
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    if (direction === "right") {
      const lastRowBounds = getCellLineContentBounds(editor.document, cellEndRow, cell, vLines);
      return editor.selections.some((sel) => sel.active.line === cellEndRow && sel.active.character === lastRowBounds.end);
    } else if (direction === "left") {
      const firstRowBounds = getCellLineContentBounds(editor.document, cellStartRow, cell, vLines);
      return editor.selections.some((sel) => sel.active.line === cellStartRow && sel.active.character === firstRowBounds.start);
    } else if (direction === "down") {
      return editor.selections.some((sel) => sel.active.line === cellEndRow);
    } else if (direction === "up") {
      return editor.selections.some((sel) => sel.active.line === cellStartRow);
    }
    return false;
  }
  registerNavCommand("ataula.cursorRightSelect", (editor) => {
    const info = getCellAtPosition(editor.document, editor.selection.active);
    if (!info) {
      vscode2.commands.executeCommand("cursorRightSelect");
      return;
    }
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    const N = cellEndRow - cellStartRow + 1;
    const rowBounds = [];
    for (let k = 0; k < N; k++) {
      const bounds = getCellLineContentBounds(editor.document, cellStartRow + k, cell, vLines);
      rowBounds.push(bounds.end - bounds.start);
    }
    let vAnchor;
    let vActive;
    if (editor.selections.length === 1) {
      vAnchor = getVirtualPosition(editor, editor.selection.anchor, info);
      vActive = getVirtualPosition(editor, editor.selection.active, info);
    } else {
      const activeSel = editor.selections[0];
      vActive = getVirtualPosition(editor, activeSel.active, info);
      let maxDist = -1;
      let anchorSel = activeSel;
      for (const sel of editor.selections) {
        const dist = Math.abs(sel.anchor.line - activeSel.active.line);
        if (dist > maxDist) {
          maxDist = dist;
          anchorSel = sel;
        }
      }
      vAnchor = getVirtualPosition(editor, anchorSel.anchor, info);
    }
    let isBoundary = false;
    const currentCells = getSelectedCells(editor, info);
    if (info.tableNode && info.tableNode.cells) {
      for (const c of currentCells) {
        const cInfo = { ...info, cell: c };
        if (isCellAtBoundary(editor, cInfo, "right")) {
          isBoundary = true;
          break;
        }
      }
    }
    if (isBoundary) {
      const adjacentCells = [];
      for (const c of currentCells) {
        for (let r = c.row; r < c.row + c.rowspan; r++) {
          const other = findCellAtGrid(info.tableNode.cells, r, c.column + c.colspan);
          if (other && !adjacentCells.some((x) => x.id === other.id) && !currentCells.some((x) => x.id === other.id)) {
            adjacentCells.push(other);
          }
        }
      }
      if (adjacentCells.length > 0) {
        selectCellsCompletely(editor, info, [...adjacentCells, ...currentCells], true);
        return;
      }
    }
    let newActive;
    if (vActive.o < rowBounds[vActive.k]) {
      newActive = { k: vActive.k, o: vActive.o + 1 };
    } else if (vActive.k < N - 1) {
      newActive = { k: vActive.k + 1, o: 0 };
    } else {
      vscode2.commands.executeCommand("cursorRightSelect");
      return;
    }
    applyVirtualSelection(editor, info, vAnchor, newActive);
  });
  registerNavCommand("ataula.cursorLeftSelect", (editor) => {
    const info = getCellAtPosition(editor.document, editor.selection.active);
    if (!info) {
      vscode2.commands.executeCommand("cursorLeftSelect");
      return;
    }
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    const N = cellEndRow - cellStartRow + 1;
    const rowBounds = [];
    for (let k = 0; k < N; k++) {
      const bounds = getCellLineContentBounds(editor.document, cellStartRow + k, cell, vLines);
      rowBounds.push(bounds.end - bounds.start);
    }
    let vAnchor;
    let vActive;
    if (editor.selections.length === 1) {
      vAnchor = getVirtualPosition(editor, editor.selection.anchor, info);
      vActive = getVirtualPosition(editor, editor.selection.active, info);
    } else {
      const activeSel = editor.selections[0];
      vActive = getVirtualPosition(editor, activeSel.active, info);
      let maxDist = -1;
      let anchorSel = activeSel;
      for (const sel of editor.selections) {
        const dist = Math.abs(sel.anchor.line - activeSel.active.line);
        if (dist > maxDist) {
          maxDist = dist;
          anchorSel = sel;
        }
      }
      vAnchor = getVirtualPosition(editor, anchorSel.anchor, info);
    }
    let isBoundary = false;
    const currentCells = getSelectedCells(editor, info);
    if (info.tableNode && info.tableNode.cells) {
      for (const c of currentCells) {
        const cInfo = { ...info, cell: c };
        if (isCellAtBoundary(editor, cInfo, "left")) {
          isBoundary = true;
          break;
        }
      }
    }
    if (isBoundary) {
      const adjacentCells = [];
      for (const c of currentCells) {
        for (let r = c.row; r < c.row + c.rowspan; r++) {
          const other = findCellAtGrid(info.tableNode.cells, r, c.column - 1);
          if (other && !adjacentCells.some((x) => x.id === other.id) && !currentCells.some((x) => x.id === other.id)) {
            adjacentCells.push(other);
          }
        }
      }
      if (adjacentCells.length > 0) {
        selectCellsCompletely(editor, info, [...adjacentCells, ...currentCells], false);
        return;
      }
    }
    let newActive;
    if (vActive.o > 0) {
      newActive = { k: vActive.k, o: vActive.o - 1 };
    } else if (vActive.k > 0) {
      newActive = { k: vActive.k - 1, o: rowBounds[vActive.k - 1] };
    } else {
      vscode2.commands.executeCommand("cursorLeftSelect");
      return;
    }
    applyVirtualSelection(editor, info, vAnchor, newActive);
  });
  registerNavCommand("ataula.cursorDown", (editor) => {
    vscode2.commands.executeCommand("cursorDown");
  });
  registerNavCommand("ataula.cursorUp", (editor) => {
    vscode2.commands.executeCommand("cursorUp");
  });
  registerNavCommand("ataula.cursorDownSelect", (editor) => {
    const info = getCellAtPosition(editor.document, editor.selection.active);
    if (!info) {
      vscode2.commands.executeCommand("cursorDownSelect");
      return;
    }
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    const N = cellEndRow - cellStartRow + 1;
    const rowBounds = [];
    for (let k = 0; k < N; k++) {
      const bounds = getCellLineContentBounds(editor.document, cellStartRow + k, cell, vLines);
      rowBounds.push(bounds.end - bounds.start);
    }
    let vAnchor;
    let vActive;
    if (editor.selections.length === 1) {
      vAnchor = getVirtualPosition(editor, editor.selection.anchor, info);
      vActive = getVirtualPosition(editor, editor.selection.active, info);
    } else {
      const activeSel = editor.selections[0];
      vActive = getVirtualPosition(editor, activeSel.active, info);
      let maxDist = -1;
      let anchorSel = activeSel;
      for (const sel of editor.selections) {
        const dist = Math.abs(sel.anchor.line - activeSel.active.line);
        if (dist > maxDist) {
          maxDist = dist;
          anchorSel = sel;
        }
      }
      vAnchor = getVirtualPosition(editor, anchorSel.anchor, info);
    }
    let isBoundary = false;
    const currentCells = getSelectedCells(editor, info);
    if (info.tableNode && info.tableNode.cells) {
      for (const c of currentCells) {
        const cInfo = { ...info, cell: c };
        if (isCellAtBoundary(editor, cInfo, "down")) {
          isBoundary = true;
          break;
        }
      }
    }
    if (isBoundary) {
      const adjacentCells = [];
      for (const c of currentCells) {
        for (let col = c.column; col < c.column + c.colspan; col++) {
          const other = findCellAtGrid(info.tableNode.cells, c.row + c.rowspan, col);
          if (other && !adjacentCells.some((x) => x.id === other.id) && !currentCells.some((x) => x.id === other.id)) {
            adjacentCells.push(other);
          }
        }
      }
      if (adjacentCells.length > 0) {
        selectCellsCompletely(editor, info, [...adjacentCells, ...currentCells], true);
        return;
      }
    }
    let newActive;
    if (vActive.k < N - 1) {
      newActive = { k: vActive.k + 1, o: Math.min(vActive.o, rowBounds[vActive.k + 1]) };
    } else {
      vscode2.commands.executeCommand("cursorDownSelect");
      return;
    }
    applyVirtualSelection(editor, info, vAnchor, newActive);
  });
  registerNavCommand("ataula.cursorUpSelect", (editor) => {
    const info = getCellAtPosition(editor.document, editor.selection.active);
    if (!info) {
      vscode2.commands.executeCommand("cursorUpSelect");
      return;
    }
    const { cell, startLineIdx, hLines, vLines } = info;
    const cellStartRow = startLineIdx + hLines[cell.row] + 1;
    const cellEndRow = startLineIdx + hLines[cell.row + cell.rowspan] - 1;
    const N = cellEndRow - cellStartRow + 1;
    const rowBounds = [];
    for (let k = 0; k < N; k++) {
      const bounds = getCellLineContentBounds(editor.document, cellStartRow + k, cell, vLines);
      rowBounds.push(bounds.end - bounds.start);
    }
    let vAnchor;
    let vActive;
    if (editor.selections.length === 1) {
      vAnchor = getVirtualPosition(editor, editor.selection.anchor, info);
      vActive = getVirtualPosition(editor, editor.selection.active, info);
    } else {
      const activeSel = editor.selections[0];
      vActive = getVirtualPosition(editor, activeSel.active, info);
      let maxDist = -1;
      let anchorSel = activeSel;
      for (const sel of editor.selections) {
        const dist = Math.abs(sel.anchor.line - activeSel.active.line);
        if (dist > maxDist) {
          maxDist = dist;
          anchorSel = sel;
        }
      }
      vAnchor = getVirtualPosition(editor, anchorSel.anchor, info);
    }
    let isBoundary = false;
    const currentCells = getSelectedCells(editor, info);
    if (info.tableNode && info.tableNode.cells) {
      for (const c of currentCells) {
        const cInfo = { ...info, cell: c };
        if (isCellAtBoundary(editor, cInfo, "up")) {
          isBoundary = true;
          break;
        }
      }
    }
    if (isBoundary) {
      const adjacentCells = [];
      for (const c of currentCells) {
        for (let col = c.column; col < c.column + c.colspan; col++) {
          const other = findCellAtGrid(info.tableNode.cells, c.row - 1, col);
          if (other && !adjacentCells.some((x) => x.id === other.id) && !currentCells.some((x) => x.id === other.id)) {
            adjacentCells.push(other);
          }
        }
      }
      if (adjacentCells.length > 0) {
        selectCellsCompletely(editor, info, [...adjacentCells, ...currentCells], false);
        return;
      }
    }
    let newActive;
    if (vActive.k > 0) {
      newActive = { k: vActive.k - 1, o: Math.min(vActive.o, rowBounds[vActive.k - 1]) };
    } else {
      vscode2.commands.executeCommand("cursorUpSelect");
      return;
    }
    applyVirtualSelection(editor, info, vAnchor, newActive);
  });
  context.subscriptions.push(formattingProvider);
  context.subscriptions.push(documentChangeDisposable);
  context.subscriptions.push(activeTableSelectionDisposable);
  context.subscriptions.push(tableEnterCommand);
  context.subscriptions.push(tableTabCommand);
  context.subscriptions.push(selectCellContentCommand);
  context.subscriptions.push(selectionRangeProvider);
  context.subscriptions.push(autoSelectionDisposable);
  context.subscriptions.push(convertToMarkdownCommand);
  context.subscriptions.push(convertToAtaulaCommand);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
