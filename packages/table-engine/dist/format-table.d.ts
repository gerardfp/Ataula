import { TableNode } from '@edumark/shared';
/**
 * Formats a geometric table back into its string representation.
 * This thin wrapper exists for historical compatibility with tests that
 * import `formatTable` from `src/format-table`.
 *
 * @param table The parsed TableNode to format.
 * @param preserveColWidths Whether to preserve the original column widths.
 * @returns The formatted table string.
 */
export declare function formatTable(table: TableNode, preserveColWidths?: boolean): string;
//# sourceMappingURL=format-table.d.ts.map