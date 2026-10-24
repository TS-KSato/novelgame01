// キットの版を固定する。engine/ の現在の内容を releases/<版>/ へ写す。
// 使い方：node kit/tools/release.js
// 作品は自分が使う版のフォルダを読み込む。新しい版ができても、既存の作品は自動では変わらない。
'use strict';
const fs = require('fs');
const path = require('path');

const KIT = path.join(__dirname, '..');
const ENGINE = path.join(KIT, 'engine');
const FILES = ['validate.js', 'save.js', 'kit.js', 'kit.css'];

const src = fs.readFileSync(path.join(ENGINE, 'kit.js'), 'utf8');
const m = src.match(/const KIT_VERSION = '([0-9.]+)';/);
if (!m) throw new Error('kit/engine/kit.js に KIT_VERSION がありません');
const version = m[1];
const dest = path.join(KIT, 'releases', version);

// 同じ版の中身を書き換えると、その版を使う作品が変わってしまう。既存の版は上書きしない。
if (fs.existsSync(dest)) {
  const same = FILES.every((f) => fs.readFileSync(path.join(ENGINE, f), 'utf8') === fs.readFileSync(path.join(dest, f), 'utf8'));
  if (same) { console.log('版 ' + version + ' は最新です:', path.relative(KIT, dest)); process.exit(0); }
  console.error('版 ' + version + ' は既にあり、engine/ と内容が違います。版を上げてから作り直してください。');
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(ENGINE, f), path.join(dest, f));
console.log('版 ' + version + ' を作りました:', path.relative(KIT, dest));
