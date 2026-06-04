// VS Code extension test runner
// This file is the entry point that @vscode/test-electron expects.
// It must export a `run()` function that sets up Mocha and runs tests.
const path = require('path');
const Mocha = require('mocha');
const fs = require('fs');

function run() {
  const mocha = new Mocha({
    ui: 'tdd',       // enables suite() / test()
    color: true,
    timeout: 60000   // generous timeout for many test cases
  });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    // Find all *.test.js files in the e2e folder
    const testFiles = fs.readdirSync(testsRoot).filter(f => f.endsWith('.test.js'));
    for (const f of testFiles) {
      mocha.addFile(path.resolve(testsRoot, f));
    }

    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed.`));
      } else {
        resolve();
      }
    });
  });
}

module.exports = { run };
