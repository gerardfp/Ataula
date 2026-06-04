// Script to launch VS Code integration tests
import { runTests } from '@vscode/test-electron';
import * as path from 'path';

(async () => {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..'); // repo root
  const extensionTestsPath = path.resolve(__dirname, './index.js');
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ['--disable-extensions', '--disable-workspace-trust']
  });
})();
