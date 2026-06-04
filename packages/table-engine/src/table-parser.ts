import { TableNode, TableCell } from '@edumark/shared';

// Disjoint Set Union (DSU) to group grid units
class DSU {
  parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(i: number): number {
    if (this.parent[i] === i) return i;
    this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(i: number, j: number) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

export function parseGeometricTable(tableStr: string, isRubric = false, preserveEmptyLines = false, autoCorrectPipes = false): TableNode {
  // 1. Normalize lines and pad them to equal length
  const rawLines = tableStr.split(/\r?\n/).map(line => line.trimEnd());
  const lines = rawLines.filter(line => line.length > 0);
  if (lines.length === 0) {
    return { type: 'table', rowsCount: 0, colsCount: 0, cells: [], isRubric };
  }

  const maxLength = Math.max(...lines.map(line => line.length));
  const grid = lines.map(line => line.padEnd(maxLength, ' '));

  // 2. Identify horizontal border rows (hLines)
  // A border row must only contain: '|', '-', '+', '=', '_', and spaces, and must contain at least one '-' or '=' or '_'
  const hLines: number[] = [];
  for (let r = 0; r < grid.length; r++) {
    const rowStr = grid[r];
    const isBorderRow =
      /^[|+\-\s=_]+$/.test(rowStr) &&
      (/[-=_]/.test(rowStr) || rowStr.includes('+'));
    if (isBorderRow) {
      hLines.push(r);
    }
  }

  // Fallback if no border rows found: treat every row as content
  if (hLines.length < 2) {
    // Return empty table or parse simple fallback
    return { type: 'table', rowsCount: 0, colsCount: 0, cells: [], isRubric };
  }

  // 3. Identify vertical border columns (vLines)
  // Collect all columns containing '|' or '+' in any of the border rows
  const vLinesSet = new Set<number>();
  for (const r of hLines) {
    const rowStr = grid[r];
    for (let c = 0; c < rowStr.length; c++) {
      if (rowStr[c] === '|' || rowStr[c] === '+') {
        vLinesSet.add(c);
      }
    }
  }
  const vLines = Array.from(vLinesSet).sort((a, b) => a - b);

  if (vLines.length < 2) {
    return { type: 'table', rowsCount: 0, colsCount: 0, cells: [], isRubric };
  }

  const H = hLines.length; // Number of horizontal border rows
  const V = vLines.length; // Number of vertical border columns

  // 3b. Auto-correct accidental pipe deletions in content rows
  if (autoCorrectPipes) {
    for (let j = 0; j < H - 1; j++) {
      const upperBorderRow = hLines[j];
      const lowerBorderRow = hLines[j + 1];
      const rStart = upperBorderRow + 1;
      const rEnd = lowerBorderRow - 1;

      for (let r = rStart; r <= rEnd; r++) {
        let line = grid[r];
        const lineVLines: number[] = [];
        for (let c = 0; c < line.length; c++) {
          if (line[c] === '|') {
            lineVLines.push(c);
          }
        }

        // Only auto-correct if the content row has fewer pipes than required
        if (lineVLines.length < V) {
          // Map every separator to its closest vLines index
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
              
              // Check if both upper and lower borders have '|' or '+' at index v
              const upperHasSep = upperBorderRow < grid.length && v < grid[upperBorderRow].length && 
                (grid[upperBorderRow][v] === '|' || grid[upperBorderRow][v] === '+');
              const lowerHasSep = lowerBorderRow < grid.length && v < grid[lowerBorderRow].length && 
                (grid[lowerBorderRow][v] === '|' || grid[lowerBorderRow][v] === '+');
              
              if (upperHasSep && lowerHasSep) {
                if (v < line.length) {
                  if (line[v] !== '|') {
                    line = line.substring(0, v) + '|' + line.substring(v + 1);
                    lineChanged = true;
                  }
                } else {
                  line = line.padEnd(v, ' ') + '|';
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

  const getUnitId = (j: number, i: number) => j * colIntervalsCount + i;
  const dsu = new DSU(rowIntervalsCount * colIntervalsCount);

  // 4. Perform mergers between adjacent grid units
  // Horizontal merges (colspan)
  for (let j = 0; j < rowIntervalsCount; j++) {
    const rStart = hLines[j] + 1;
    const rEnd = hLines[j + 1] - 1;

    const activeBoundaries = new Set<number>();
    if (rStart > rEnd) {
      // Empty row interval (e.g. newly added row). Inherit boundaries from adjacent row interval.
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
          const lineVLines: number[] = [];
          for (let c = 0; c < lineText.length; c++) {
            if (lineText[c] === '|') {
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
      const lineVLines: number[] = [];
      for (let c = 0; c < lineText.length; c++) {
        if (lineText[c] === '|') {
          lineVLines.push(c);
        }
      }

      if (lineVLines.length >= 2) {
        if (lineVLines.length >= vLines.length) {
          // Map internal separators to internal vLines only
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
          // Shorter row: map every separator to its closest vLines,
          // but activeBoundaries only cares about internal vLines (exclude vLines[0] and vLines[vLines.length - 1])
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

  // Vertical merges (rowspan)
  for (let j = 0; j < rowIntervalsCount - 1; j++) {
    const boundaryRow = hLines[j + 1];

    for (let i = 0; i < colIntervalsCount; i++) {
      const cStart = vLines[i] + 1;
      const cEnd = vLines[i + 1] - 1;

      // Check if horizontal border is missing in this column interval in the boundary row
      let borderExists = false;
      for (let c = cStart; c <= cEnd; c++) {
        const char = grid[boundaryRow][c];
        if (char === '-' || char === '=' || char === '+' || char === '_') {
          borderExists = true;
          break;
        }
      }

      if (!borderExists) {
        dsu.union(getUnitId(j, i), getUnitId(j + 1, i));
      }
    }
  }

  // 5. Group grid units into cells
  const groups = new Map<number, { j: number; i: number }[]>();
  for (let j = 0; j < rowIntervalsCount; j++) {
    for (let i = 0; i < colIntervalsCount; i++) {
      const unitId = getUnitId(j, i);
      const root = dsu.find(unitId);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push({ j, i });
    }
  }

  const cells: TableCell[] = [];
  let cellCounter = 1;

  const finalGroups: { j: number; i: number }[][] = [];
  for (const group of groups.values()) {
    const minJ = Math.min(...group.map(g => g.j));
    const maxJ = Math.max(...group.map(g => g.j));
    const minI = Math.min(...group.map(g => g.i));
    const maxI = Math.max(...group.map(g => g.i));
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
    const minJ = Math.min(...group.map(g => g.j));
    const maxJ = Math.max(...group.map(g => g.j));
    const minI = Math.min(...group.map(g => g.i));
    const maxI = Math.max(...group.map(g => g.i));

    const rowspan = maxJ - minJ + 1;
    const colspan = maxI - minI + 1;

    // Extract text content inside the cell bounding box
    const contentLines: string[] = [];

    for (let j = minJ; j <= maxJ; j++) {
      const rStart = hLines[j] + 1;
      const rEnd = hLines[j + 1] - 1;
      for (let r = rStart; r <= rEnd; r++) {
        const lineText = grid[r];
        const lineVLines: number[] = [];
        for (let c = 0; c < lineText.length; c++) {
          if (lineText[c] === '|') {
            lineVLines.push(c);
          }
        }

        let slice = '';
        if (lineVLines.length >= 2) {
          const boundaryPos = Array(vLines.length).fill(-1);
          if (lineVLines.length >= vLines.length) {
            // Full-length or longer row: map extremes to global extremes
            boundaryPos[0] = lineVLines[0];
            boundaryPos[vLines.length - 1] = lineVLines[lineVLines.length - 1];

            // Map internal separators to internal vLines
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
            // Shorter row: map every separator to its closest vLines index
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
            // Fallback if boundary wasn't mapped
            const colStart = vLines[minI] + 1;
            const colEnd = vLines[maxI + 1] - 1;
            slice = lineText.substring(colStart, colEnd + 1);
          }
        } else {
          // Fallback if insufficient separators in this line
          const colStart = vLines[minI] + 1;
          const colEnd = vLines[maxI + 1] - 1;
          slice = lineText.substring(colStart, colEnd + 1);
        }

        contentLines.push(slice);
      }
    }

    const processedLines = [...contentLines];

    // Preserve relative cell indentation
    let minLeadingSpaces = Infinity;
    for (const line of processedLines) {
      if (line.trim() !== '') {
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

    const finalContent = processedLines.map(line => {
      if (line.trim() === '') return '';
      const leftStripped = line.substring(minLeadingSpaces);
      return leftStripped.trimEnd();
    });

    if (!preserveEmptyLines) {
      while (finalContent.length > 0 && finalContent[finalContent.length - 1] === '') {
        finalContent.pop();
      }
      while (finalContent.length > 0 && finalContent[0] === '') {
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

  const colWidths: number[] = [];
  for (let i = 0; i < colIntervalsCount; i++) {
    colWidths.push(vLines[i + 1] - vLines[i] - 1);
  }

  return {
    type: 'table',
    rowsCount: rowIntervalsCount,
    colsCount: colIntervalsCount,
    cells,
    isRubric,
    colWidths
  };
}
