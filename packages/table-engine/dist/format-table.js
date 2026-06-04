"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTable = formatTable;
const table_formatter_1 = require("./table-formatter");
/**
 * Formats a geometric table back into its string representation.
 * This thin wrapper exists for historical compatibility with tests that
 * import `formatTable` from `src/format-table`.
 *
 * @param table The parsed TableNode to format.
 * @param preserveColWidths Whether to preserve the original column widths.
 * @returns The formatted table string.
 */
function formatTable(table, preserveColWidths = false) {
    return (0, table_formatter_1.formatGeometricTable)(table, preserveColWidths);
}
//# sourceMappingURL=format-table.js.map