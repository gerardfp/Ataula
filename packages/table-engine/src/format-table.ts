import { TableNode } from '@edumark/shared';
import { formatGeometricTable } from './table-formatter';

/**
 * Formats a geometric table back into its string representation.
 * This thin wrapper exists for historical compatibility with tests that
 * import `formatTable` from `src/format-table`.
 *
 * @param table The parsed TableNode to format.
 * @param preserveColWidths Whether to preserve the original column widths.
 * @returns The formatted table string.
 */
export function formatTable(table: TableNode, preserveColWidths = false): string {
  return formatGeometricTable(table, preserveColWidths);
}
