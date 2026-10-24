// キットの単体試験（ブラウザ不要）：作品データの検証、演出の状態、行IDの挿入への強さ、eval の不使用。
'use strict';
const fs = require('fs');
const path = require('path');
const { check, section, summary } = require('../lib/check');

const ROOT = path.join(__dirname, '..', '..');
const V = require(path.join(ROOT, 'kit', 'engine', 'validate.js'));

function loadSample(name) {
  const src = fs.readFileSync(path.join(ROOT, 'kit', 'samples', name, 'game.js'), 'utf8');
  const w = {};
  new Function('window', src)(w); // 試験用：サンプルの作品データを読む（エンジンは eval を使わない）
  return w.KIT_GAME;
}

// 作品データを深く複製する（テストごとに壊しても他へ影響しないように）。関数はそのまま持つ。
const clone = (v) => {
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
};

const A = loadSample('sample-a');
const B = loadSample('sample-b');

section('作品データの検証');
check('sample-a は検証に通る', V.validateGame(A).ok, V.validateGame(A).errors.join(' / '));
check('sample-b は検証に通る', V.validateGame(B).ok, V.validateGame(B).errors.join(' / '));

function errorsOf(mutate) {
  const g = clone(A);
  mutate(g);
  return V.validateGame(g).errors.join(' / ');
}
const expectError = (name, mutate, pattern) => {
  const msg = errorsOf(mutate);
  check(name, pattern.test(msg), '実際: ' + (msg || '（エラーなし）'));
};

expectError('行IDの重複を検出する', (g) => { g.scenes.hall.lines[0].id = 'a-001'; }, /重複/);
expectError('行IDの形式不正を検出する', (g) => { g.scenes.room.lines[0].id = 'A 001'; }, /行IDがないか/);
expectError('存在しない行への演出を検出する', (g) => { g.cues.push({ at: 'zz-999', bg: 'bg-room' }); }, /行ID「zz-999」が存在しません/);
expectError('演出の種類が二つ入っていると検出する', (g) => { g.cues.push({ at: 'a-002', bg: 'bg-room', se: 'chime' }); }, /一つだけ/);
expectError('未定義の背景を検出する', (g) => { g.cues.push({ at: 'a-002', bg: 'bg-none' }); }, /背景「bg-none」/);
expectError('未定義の立ち絵の表情を検出する', (g) => { g.cues.push({ at: 'a-002', portrait: { slot: 'left', char: 'mio', expr: 'angry' } }); }, /表情「angry」/);
expectError('立ち絵の位置が不正だと検出する', (g) => { g.cues.push({ at: 'a-002', portrait: { slot: 'center', char: 'mio', expr: 'normal' } }); }, /left か right/);
expectError('CG の区間が別の場面にまたがると検出する', (g) => { g.cues[g.cues.length - 1].cg.until = 'c-001'; }, /同じ場面/);
expectError('CG の終了行が開始行より前だと検出する', (g) => { g.cues[g.cues.length - 1].cg = { id: 'cg-sunset', until: 'a-001' }; g.cues[g.cues.length - 1].at = 'b-003'; }, /開始行より前|同じ場面/);
expectError('CG の区間の重なりを検出する', (g) => { g.cues.push({ at: 'b-004', cg: { id: 'cg-sunset' } }); }, /重なって/);
expectError('フラグの既定値が範囲外だと検出する', (g) => { g.flags.route.default = 'other'; }, /既定値が values/);
expectError('選択肢が未定義のフラグを設定すると検出する', (g) => { g.scenes.room.choices[0].set.nope = true; }, /フラグ「nope」/);
expectError('選択肢の移り先が存在しないと検出する', (g) => { g.scenes.room.choices[0].to = 'nowhere'; }, /移り先の場面/);
expectError('開始行が開始場面にないと検出する', (g) => { g.start.line = 'b-001'; }, /開始行は開始場面/);
expectError('旧IDの移し先がないと検出する', (g) => { g.aliases = { 'old-1': 'nope' }; }, /移し先の行ID/);
expectError('旧IDが現在のIDと重なると検出する', (g) => { g.aliases = { 'a-001': 'a-002' }; }, /曖昧/);
expectError('素材のパスが画像・音声でないと検出する', (g) => { g.assets.backgrounds['bg-room'] = 'assets/x.txt'; }, /素材のパス/);
expectError('作品IDに英小文字以外があると検出する', (g) => { g.id = 'Sample A'; }, /作品ID/);

section('演出の状態（行ID基準）');
const st = V.stateAt(A, 'b-003');
check('b-003 の背景は bg-hall', st.bg === 'bg-hall', st.bg);
check('b-003 の立ち絵（右）は smile', st.portraits.right && st.portraits.right.expr === 'smile', JSON.stringify(st.portraits.right));
check('b-003 の CG は cg-sunset（区間の中）', st.cg === 'cg-sunset', st.cg);
check('b-002 の CG はまだ出ない（区間の前）', V.stateAt(A, 'b-002').cg === null);
check('BGM は場面が変わっても同じ曲が続く（b-003 も theme）', V.stateAt(A, 'b-003').bgm === 'theme');
check('環境音は b-001 から wind', V.stateAt(A, 'b-001').ambience === 'wind');
check('一回きりの効果音は b-001 だけ', V.oneShotsAt(A, 'b-001').some((c) => c.se === 'chime') && V.oneShotsAt(A, 'b-002').length === 0);

// 行の挿入：先頭近くに行を一つ足しても、既存の行IDの状態は変わらない
section('行の挿入への強さ');
const before = {};
for (const e of V.flattenLines(A)) before[e.id] = V.stateAt(A, e.id);
const inserted = clone(A);
inserted.scenes.room.lines.splice(2, 0, { id: 'a-002x', speaker: 'mio', text: '新しく入れた行。' });
inserted.scenes.hall.lines.splice(0, 0, { id: 'b-000', text: '場面の先頭に行を足した。' });
check('挿入後も検証に通る', V.validateGame(inserted).ok, V.validateGame(inserted).errors.join(' / '));
let same = true;
const diffs = [];
for (const e of V.flattenLines(A)) {
  const a = JSON.stringify(before[e.id]);
  const b = JSON.stringify(V.stateAt(inserted, e.id));
  if (a !== b) { same = false; diffs.push(e.id); }
}
check('既存の行IDの状態は、挿入の前後で同じ', same, diffs.join(', '));
check('挿入した行は、その場所の状態を引き継ぐ', V.stateAt(inserted, 'a-002x').bg === 'bg-room');

section('既読の指紋');
const line = A.scenes.room.lines[1];
const sameText = { ...line, text: line.text.replace(/\s/g, '') };
check('空白だけの違いは同じ指紋', V.hashLine(line) === V.hashLine({ ...line, text: line.text + ' ' }));
check('句読点の違いは別の指紋', V.hashLine(line) !== V.hashLine({ ...line, text: line.text.replace('。', '！') }));
check('話者の違いは別の指紋', V.hashLine(line) !== V.hashLine({ ...line, speaker: 'other' }));
check('空白を除いた同一文は同じ指紋', V.hashLine(line) === V.hashLine(sameText));

section('安全性（eval を使わない）');
for (const f of ['validate.js', 'kit.js']) {
  const src = fs.readFileSync(path.join(ROOT, 'kit', 'engine', f), 'utf8');
  check(f + ' に eval・文字列からの関数生成がない', !/\beval\s*\(|new\s+Function\s*\(|setTimeout\(\s*['"]/.test(src));
}

process.exitCode = summary() ? 1 : 0;
