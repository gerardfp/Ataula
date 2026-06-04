// Snapshot test for table formatting
import { parseGeometricTable } from '../../src/table-parser';
import { formatTable } from '../../src/format-table'; // adjust import if helper resides elsewhere

test('format snapshot for complex table', () => {
  const raw = `|---|---|\n| abc | defghi |\n|---|---|`;
  const parsed = parseGeometricTable(raw, { autoCorrectPipes: true });
  const formatted = formatTable(parsed);
  expect(formatted).toMatchSnapshot();
});
