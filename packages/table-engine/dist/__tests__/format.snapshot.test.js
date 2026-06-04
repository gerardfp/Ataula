"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Snapshot test for table formatting
const table_parser_1 = require("../../src/table-parser");
const format_table_1 = require("../../src/format-table"); // adjust import if helper resides elsewhere
test('format snapshot for complex table', () => {
    const raw = `|---|---|\n| abc | defghi |\n|---|---|`;
    const parsed = (0, table_parser_1.parseGeometricTable)(raw, { autoCorrectPipes: true });
    const formatted = (0, format_table_1.formatTable)(parsed);
    expect(formatted).toMatchSnapshot();
});
//# sourceMappingURL=format.snapshot.test.js.map