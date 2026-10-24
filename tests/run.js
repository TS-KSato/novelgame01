// 試験の入口。使い方：node tests/run.js [unit|browser|zelg]（省略時は全部）
// 外部パッケージは Playwright（ブラウザ試験のみ）だけ。Chromium は /opt/pw-browsers/chromium を優先する。
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');

const SUITES = {
  unit: 'tests/kit/unit.js',
  browser: 'tests/kit/browser.js',
  zelg: 'tests/zelg/smoke.js',
};

const only = process.argv[2];
const names = only ? [only] : Object.keys(SUITES);
let failed = 0;
for (const name of names) {
  if (!SUITES[name]) { console.error('不明な試験: ' + name); process.exit(2); }
  console.log('\n===== ' + name + ' =====');
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', SUITES[name])], { stdio: 'inherit' });
  if (r.status !== 0) failed += 1;
}
console.log('\n' + (failed ? failed + ' 個の試験群が失敗' : 'すべての試験群が合格'));
process.exitCode = failed ? 1 : 0;
