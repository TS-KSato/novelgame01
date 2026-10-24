// 試験用の素材を作る（PNG と WAV。外部ライブラリを使わない）。
// 使い方：node kit/tools/make-assets.js
// 作るのは単純な図形と音だけ。Zelg の画像・音楽は使わず、複製もしない。
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SAMPLES = path.join(__dirname, '..', 'samples');

// ----- PNG（RGBA） -----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// pixel(x, y) は [r, g, b, a] を返す
function makePng(w, h, pixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0; // フィルタなし
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 背景：上から下へ色が変わるだけの図。場所の区別ができればよい。
function background(top, bottom) {
  return (x, y) => {
    const t = y / 359;
    const mix = (i) => Math.round(top[i] + (bottom[i] - top[i]) * t);
    // 目印として、中央に横線を一本入れる
    if (Math.abs(y - 180) < 2) return [255, 255, 255, 255];
    return [mix(0), mix(1), mix(2), 255];
  };
}

// 立ち絵：楕円の頭と台形の体。口の色で表情を変える（透明な余白あり）。
function portrait(body, mouthOpen) {
  const W = 240, H = 480;
  return (x, y) => {
    const hx = (x - 120) / 52, hy = (y - 120) / 62;
    if (hx * hx + hy * hy <= 1) {
      // 口
      const mx = (x - 120) / 18, my = (y - 150) / (mouthOpen ? 9 : 3);
      if (y > 140 && y < 162 && mx * mx + my * my <= 1) return [60, 20, 20, 255];
      return [240, 214, 190, 255];
    }
    if (y > 190 && y < H && Math.abs(x - 120) < 40 + (y - 190) * 0.25) return body;
    return [0, 0, 0, 0];
  };
}

// CG：斜めの帯と円の図
function cg() {
  return (x, y) => {
    const d = Math.hypot(x - 400, y - 200);
    if (d < 90) return [255, 214, 120, 255];
    if (((x + y) >> 5) % 2 === 0) return [120, 60, 140, 255];
    return [40, 30, 80, 255];
  };
}

// ----- WAV（16bit PCM、モノラル） -----
function makeWav(samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s * 32767))), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const RATE = 11025;
// BGM：短い和音のループ（終わりと始まりが同じ音になる長さ）
function bgm(seconds) {
  const n = RATE * seconds;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const v = 0.18 * (Math.sin(2 * Math.PI * 220 * t) + 0.6 * Math.sin(2 * Math.PI * 277.2 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * t));
    out.push(v * (0.6 + 0.4 * Math.sin(2 * Math.PI * t / seconds)));
  }
  return out;
}
// 環境音：低い風のような雑音
function ambience(seconds) {
  let seed = 7; const n = RATE * seconds; const out = []; let lp = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const noise = seed / 0xffffffff * 2 - 1;
    lp = lp * 0.97 + noise * 0.03;
    out.push(lp * 0.8);
  }
  return out;
}
// 効果音：短いチャイム
function chime() {
  const n = Math.round(RATE * 0.6); const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out.push(0.5 * Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 6));
  }
  return out;
}

const SAMPLE_ASSETS = {
  'sample-a': {
    backgrounds: { 'bg-room': [[40, 60, 90], [20, 24, 40]], 'bg-hall': [[90, 70, 40], [40, 30, 20]] },
    portraits: { 'mio-normal': [[70, 110, 170, 255], false], 'mio-smile': [[70, 110, 170, 255], true] },
    cgs: { 'cg-sunset': cg },
    bgm: { 'theme-a': () => bgm(4) },
    ambience: { 'wind': () => ambience(4) },
    se: { 'chime': chime },
  },
  'sample-b': {
    backgrounds: { 'bg-plain': [[60, 60, 60], [30, 30, 30]] },
    se: { 'chime': chime },
  },
};

function write(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log('wrote', path.relative(path.join(__dirname, '..', '..'), file));
}

for (const [sample, spec] of Object.entries(SAMPLE_ASSETS)) {
  const dir = path.join(SAMPLES, sample, 'assets');
  for (const [name, c] of Object.entries(spec.backgrounds || {})) write(path.join(dir, 'backgrounds', name + '.png'), makePng(640, 360, background(c[0], c[1])));
  for (const [name, c] of Object.entries(spec.portraits || {})) write(path.join(dir, 'portraits', name + '.png'), makePng(240, 480, portrait(c[0], c[1])));
  for (const [name, f] of Object.entries(spec.cgs || {})) write(path.join(dir, 'cg', name + '.png'), makePng(640, 360, f()));
  for (const [name, f] of Object.entries(spec.bgm || {})) write(path.join(dir, 'bgm', name + '.wav'), makeWav(f(), RATE));
  for (const [name, f] of Object.entries(spec.ambience || {})) write(path.join(dir, 'ambience', name + '.wav'), makeWav(f(), RATE));
  for (const [name, f] of Object.entries(spec.se || {})) write(path.join(dir, 'se', name + '.wav'), makeWav(f(), RATE));
}
