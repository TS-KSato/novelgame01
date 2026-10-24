// ゼルグ（公開中の本編）の確認。読み取りだけで、本編のファイルは変えない。
// 1. 本編が例外なく起動する  2. 既読の対応表（seen-map.js）が、履歴から作り直した結果と一致する
// 対応表の確認には git の履歴が必要。浅い履歴（shallow clone）では失敗するので、その場合は full clone で実行する。
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { check, section, summary } = require('../lib/check');
const { serve } = require('../lib/serve');

const ROOT = path.join(__dirname, '..', '..');

async function main() {
  section('本編の起動');
  const server = await serve(ROOT, 0);
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const errors = [];
  let browser;
  try {
    const { chromium } = require('playwright');
    const exe = '/opt/pw-browsers/chromium';
    const opts = { args: ['--no-sandbox'] };
    if (fs.existsSync(exe)) opts.executablePath = exe;
    browser = await chromium.launch(opts);
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(base + 'index.html');
    await page.waitForFunction(() => typeof start === 'function', null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    check('本編が起動し、start() が使える', await page.evaluate(() => typeof start === 'function'));
    check('本編の起動で例外が出ない', errors.length === 0, errors.join(' | '));
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  section('既読の対応表（seen-map.js）');
  const committed = fs.readFileSync(path.join(ROOT, 'seen-map.js'), 'utf8');
  let generated = null;
  try {
    generated = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'make-seen-map.js')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    check('対応表を履歴から作り直せる', false, String(e.stderr || e.message).split('\n')[0]);
  }
  if (generated !== null) {
    check('対応表は履歴から作り直した結果と一致する', generated === committed);
  }

  process.exitCode = summary() ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
