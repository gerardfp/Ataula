const { parseGeometricTable } = require('@edumark/table-engine');

const before = [
  "|------|---|---|",
  "| hola |   |   |",
  "|      |   |---|",
  "|      |   |   |",
  "|------|   |   |",
  "|      |   |   |",
  "|      |---|   |",
  "|      |   |   |",
  "|------|---|---|"
].join('\n');

const node = parseGeometricTable(before);
console.log(JSON.stringify(node.cells, null, 2));
