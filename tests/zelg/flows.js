// ゼルグ（公開中の本編）の操作の試験。本編のファイルは変えない。
// 確かめること：新規開始、再開、手動保存・読込、合成した旧版保存の移行、移せない旧版保存を上書きしないこと。
// 旧版の保存は、テストの中で作る（合成データ）。実際のプレイヤーの保存は使わない。
'use strict';
const path = require('path');
const { check, section, summary } = require('../lib/check');
const { serve } = require('../lib/serve');
const { launch } = require('../lib/launch');

const ROOT = path.join(__dirname, '..', '..');
const KEY = 'zelg-v1';
const BACKUP = 'zelg-v1-backup-full-v20';
const pageErrors = [];

const zelg = (page) => page.evaluate(() => ({
  node: st && st.node, line: st && st.line, rev: st && st.contentRevision,
  gameVisible: !document.getElementById('game').hidden,
}));
const backup = (page) => page.evaluate((k) => localStorage.getItem(k), BACKUP);

// 進行の記録（自動セーブ・手動セーブ・既読・エンド）が同じか。設定は起動時に正規化されるので比べない。
// ゼルグは起動時の設定の正規化（cleanSettings）を移行のバックアップより前に行うため、バックアップは元の文字列と一致しない。
function sameProgress(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = JSON.parse(a), y = JSON.parse(b);
  return ['seen', 'ends', 'slots', 'auto'].every((k) => JSON.stringify(x[k]) === JSON.stringify(y[k]));
}

// 本文を進め、指定の行に着くまで、表示の完了と次の行をクリックで送る
async function advanceTo(page, node, line) {
  for (let i = 0; i < 200; i++) {
    const s = await zelg(page);
    if (s.node === node && s.line >= line) return true;
    await page.click('#dialogue');
    await page.waitForTimeout(40);
  }
  return false;
}

async function open(ctx, base) {
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(base + 'index.html');
  await page.waitForFunction(() => typeof start === 'function' && typeof st !== 'undefined');
  // 文字の表示を速くする（進行は変えない）
  await page.evaluate(() => { persist.settings.speed = 0; });
  return page;
}

async function main() {
  const server = await serve(ROOT, 0);
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await launch();
  try {
    section('新規開始と進行');
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    let page = await open(ctx, base);
    await page.click('#new');
    await page.waitForFunction(() => st !== null);
    let s = await zelg(page);
    check('はじめからで序章の一行目に入る', s.node === 'prologue' && s.line === 0 && s.gameVisible, JSON.stringify(s));
    check('新規の保存は現在の本文版で作られる', s.rev === await page.evaluate(() => OPENING_REV));
    check('三行目まで進められる', await advanceTo(page, 'prologue', 3));

    section('再開（つづきから）');
    await page.reload();
    await page.waitForFunction(() => typeof start === 'function');
    check('再読み込み後、つづきから が押せる', !(await page.isDisabled('#continue')));
    await page.click('#continue');
    await page.waitForFunction(() => st !== null);
    s = await zelg(page);
    check('つづきから、最後の位置（三行目以降）へ戻る', s.node === 'prologue' && s.line >= 3, JSON.stringify(s));

    section('手動保存と読込');
    await advanceTo(page, 'prologue', 3);
    const savedAt = (await zelg(page)).line;
    await page.click('#menu');
    await page.click('#menuSave');
    await page.locator('#slots .row').first().getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => persist.slots[0] !== null);
    check('一つ目のスロットに保存される', (await page.evaluate(() => persist.slots[0].state.line)) === savedAt);
    await page.click('#close');
    await page.waitForTimeout(100);
    await advanceTo(page, 'prologue', savedAt + 2);
    await page.click('#menu');
    await page.click('#menuHome');
    await page.waitForFunction(() => document.getElementById('title') && !document.getElementById('title').hidden);
    await page.click('#settings');
    await page.locator('#slots .row').first().getByRole('button', { name: '読込', exact: true }).click();
    await page.waitForFunction(() => st && !document.getElementById('game').hidden);
    s = await zelg(page);
    check('手動セーブの位置へ読み込める', s.line === savedAt, JSON.stringify(s));
    check('読込の後に本文が表示される', (await page.textContent('#prose')).length > 0);
    await ctx.close();

    section('合成した旧版の保存を移行する');
    const ctx2 = await browser.newContext({ viewport: { width: 844, height: 390 } });
    page = await open(ctx2, base);
    // 旧版（full-v19）の合成保存。位置は序章の三行目
    const oldRaw = JSON.stringify({
      seen: [], ends: [], slots: [null, null, null],
      auto: { time: 1700000000000, state: { contentRevision: 'full-v19', node: 'prologue', line: 3, rel: {}, fragments: [], flags: {}, log: [], started: 1700000000000 } },
      settings: { speed: 38, sound: false, mix: { bgm: 100, amb: 100, se: 100 } },
    });
    await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.removeItem('zelg-v1-backup-full-v20'); }, [KEY, oldRaw]);
    await page.reload();
    await page.waitForFunction(() => typeof start === 'function');
    check('旧版の自動セーブを、再開できる状態へ移す', !(await page.isDisabled('#continue')));
    check('移す前の進行（自動セーブ）を、バックアップに残す', sameProgress(await backup(page), oldRaw));
    await page.click('#continue');
    await page.waitForFunction(() => st !== null);
    s = await zelg(page);
    check('移した保存は現在の本文版で、同じ序章の位置に戻る', s.rev === await page.evaluate(() => OPENING_REV) && s.node === 'prologue' && s.line === 3, JSON.stringify(s));
    await ctx2.close();

    section('移せない旧版の保存は、上書きしない');
    const ctx3 = await browser.newContext({ viewport: { width: 844, height: 390 } });
    page = await open(ctx3, base);
    const unknownRaw = JSON.stringify({
      seen: [], ends: [], slots: [null, null, null],
      auto: { time: 1700000000000, state: { contentRevision: 'full-v99', node: 'prologue', line: 3, rel: {}, fragments: [], flags: {}, log: [], started: 1700000000000 } },
      settings: { speed: 38, sound: false, mix: { bgm: 100, amb: 100, se: 100 } },
    });
    await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.removeItem('zelg-v1-backup-full-v20'); }, [KEY, unknownRaw]);
    await page.reload();
    await page.waitForFunction(() => typeof start === 'function');
    await page.click('#continue');
    await page.waitForFunction(() => document.getElementById('toast').textContent.includes('読めません'));
    check('未知の版の保存は、つづきから に使わず理由を示す', (await page.textContent('#toast')).includes('未知の本文版'), await page.textContent('#toast'));
    check('未知の版の保存は、つづきから で開始しない', (await page.evaluate(() => st === null)));
    check('未知の版の保存の進行を、バックアップに残す', sameProgress(await backup(page), unknownRaw));
    const kept = await page.evaluate(() => persist.auto && persist.auto.state && persist.auto.state.contentRevision);
    check('未知の版の保存の内容は、読み込み後も残っている', kept === 'full-v99', String(kept));
    await ctx3.close();

    check('ゼルグの画面に例外が出ていない', pageErrors.length === 0, pageErrors.join(' | '));
  } finally {
    await browser.close();
    server.close();
  }
  process.exitCode = summary() ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
