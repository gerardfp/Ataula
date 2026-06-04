"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Property‑based tests for the table parser using fast‑check
const fast_check_1 = __importDefault(require("fast-check"));
const table_parser_1 = require("../../src/table-parser");
function randomTable() {
    return fast_check_1.default.tuple(fast_check_1.default.integer({ min: 1, max: 5 }), fast_check_1.default.integer({ min: 1, max: 5 }))
        .chain(([cols, rows]) => {
        const colWidths = fast_check_1.default.array(fast_check_1.default.integer({ min: 1, max: 10 }), { minLength: cols, maxLength: cols });
        return colWidths.chain(widths => fast_check_1.default.array(fast_check_1.default.tuple(...Array(cols).fill(fast_check_1.default.string({ maxLength: 8 }))), { minLength: rows, maxLength: rows }).chain(rowsArr => {
            const lines = rowsArr.map(cells => {
                const line = cells.map((c, i) => String(c).padEnd(widths[i])).join('|');
                return `|${line}|`;
            });
            return fast_check_1.default.constant(lines.join('\n'));
        }));
    });
}
test('parse → format is idempotent', () => {
    fast_check_1.default.assert(fast_check_1.default.property(randomTable(), (tableStr) => {
        const parsed = (0, table_parser_1.parseGeometricTable)(tableStr, { autoCorrectPipes: true });
        const formatted = parsed.toString();
        const reparsed = (0, table_parser_1.parseGeometricTable)(formatted, { autoCorrectPipes: true });
        return JSON.stringify(parsed) === JSON.stringify(reparsed);
    }));
});
//# sourceMappingURL=parser.props.test.js.map