// Property‑based tests for the table parser using fast‑check
import fc from 'fast-check';
import { parseGeometricTable } from '../../src/table-parser';

function randomTable(): fc.Arbitrary<string> {
  return fc.tuple(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 5 }))
    .chain(([cols, rows]) => {
      const colWidths = fc.array(fc.integer({ min: 1, max: 10 }), { minLength: cols, maxLength: cols });
      return colWidths.chain(widths =>
        fc.array(
          fc.tuple(...Array(cols).fill(fc.string({ maxLength: 8 }))),
          { minLength: rows, maxLength: rows }
        ).chain(rowsArr => {
          const lines = rowsArr.map(cells => {
            const line = cells.map((c, i) => String(c).padEnd(widths[i])).join('|');
            return `|${line}|`;
          });
          return fc.constant(lines.join('\n'));
        })
      );
    });
}

test('parse → format is idempotent', () => {
  fc.assert(
    fc.property(randomTable(), (tableStr) => {
      const parsed = parseGeometricTable(tableStr, { autoCorrectPipes: true });
      const formatted = parsed.toString();
      const reparsed = parseGeometricTable(formatted, { autoCorrectPipes: true });
      return JSON.stringify(parsed) === JSON.stringify(reparsed);
    })
  );
});
