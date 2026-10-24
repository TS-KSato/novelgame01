// 既読の移行表を、git 履歴の各版の本文から生成する（保守用。ブラウザでは実行しない）。
// 使い方：リポジトリ直下で `node tools/make-seen-map.js > seen-map.js`
// 版ごとに、旧版の各行（場面・行番号）が現行のどの行へ対応するかを決める。
//   1. 行ID（PAGE_IDS）が現行にもあり、話者と本文（空白を除く）が一致 → 対応（ID一致）
//   2. 行IDが無い・見つからない場合：話者と本文が、その場面で旧版・現行とも一つだけ → 対応（一意一致）
//   3. 同じ文章が複数ある場合：前後の行も同じで、同じ行番号にある時だけ → 対応（文脈一致）
//   4. 本文が変わった行（現行に同じ行が無い）→ 対応なし（既読を引き継がない）
//   5. 対応は行番号の順序を保つものだけ（最長増加列）。順序が崩れる候補は外す。
// 対応がない行は -1 になる。判断できない重複は -1（保守的に未読）。
const { execSync } = require('child_process');
const vm = require('vm');

const REVS = {
  'full-v8': '370cf3e', 'full-v9': 'b48e00b', 'full-v10': '0470daf', 'full-v11': '6fd4be7',
  'full-v12': '9cb046c', 'full-v13': '64ee1ae', 'full-v14': '5d20c63', 'full-v15': '8ca24f0',
  'full-v16': '6fa5e9b', 'full-v17': 'a6302a4', 'full-v18': '4bb2001', 'full-v19': '7ae50f3',
};
const CURRENT = 'HEAD';

function load(commit) {
  const src = execSync(`git show ${commit}:story.js`, { maxBuffer: 1e8, cwd: __dirname + '/..' }).toString();
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { STORY: vm.runInContext('STORY', ctx), PAGE_IDS: vm.runInContext('PAGE_IDS', ctx) };
}
const keyOf = (line) => (line[0] + '\u0001' + line[1]).replace(/\s+/g, '');
function lis(pairs) {
  // pairs: [i, j, rule] sorted by i. Keep the longest subsequence with increasing j.
  const n = pairs.length, best = new Array(n).fill(1), prev = new Array(n).fill(-1);
  for (let a = 0; a < n; a++) for (let b = 0; b < a; b++)
    if (pairs[b][1] < pairs[a][1] && best[b] + 1 > best[a]) { best[a] = best[b] + 1; prev[a] = b; }
  let end = -1;
  for (let a = 0; a < n; a++) if (end < 0 || best[a] > best[end]) end = a;
  const keep = new Set();
  for (let a = end; a >= 0; a = prev[a]) keep.add(a);
  return keep;
}

function build() {
  const cur = load(CURRENT);
  const table = {}, stats = {};
  for (const [rev, commit] of Object.entries(REVS)) {
    const old = load(commit);
    const st = { positions: 0, id: 0, unique: 0, context: 0, changed: 0, ambiguous: 0, order: 0, sceneGone: 0, mapped: 0 };
    table[rev] = {};
    for (const [scene, s] of Object.entries(old.STORY)) {
      st.positions += s.lines.length;
      const arr = new Array(s.lines.length).fill(-1);
      table[rev][scene] = arr;
      if (!cur.STORY[scene]) { st.sceneGone += s.lines.length; continue; }
      const cLines = cur.STORY[scene].lines;
      const kR = s.lines.map(keyOf), kC = cLines.map(keyOf);
      const cntR = {}, cntC = {};
      kR.forEach(k => cntR[k] = (cntR[k] || 0) + 1);
      kC.forEach(k => cntC[k] = (cntC[k] || 0) + 1);
      const idC = new Map();
      (cur.PAGE_IDS[scene] || []).forEach((id, j) => idC.set(id, j));
      const idR = (old.PAGE_IDS[scene] || []);
      const rule = new Array(s.lines.length).fill(null);
      const cand = [];
      for (let i = 0; i < s.lines.length; i++) {
        const id = idR[i];
        if (id && idC.has(id)) {
          const j = idC.get(id);
          if (kC[j] === kR[i]) { cand.push([i, j, 'id']); rule[i] = 'id'; }
          else { rule[i] = 'changed'; }
          continue;
        }
        if (!cntC[kR[i]]) { rule[i] = "changed"; continue; }
        if (cntR[kR[i]] === 1 && cntC[kR[i]] === 1) {
          const j = kC.indexOf(kR[i]);
          cand.push([i, j, 'unique']); rule[i] = 'unique';
          continue;
        }
        const same = kC[i] === kR[i] && (i === 0 || kC[i - 1] === kR[i - 1]) && (i === s.lines.length - 1 || kC[i + 1] === kR[i + 1]);
        if (same && i < cLines.length) { cand.push([i, i, 'context']); rule[i] = 'context'; }
        else rule[i] = 'ambiguous';
      }
      const keep = lis(cand);
      cand.forEach((c, n) => {
        if (keep.has(n)) { arr[c[0]] = c[1]; st[c[2]]++; st.mapped++; }
        else { rule[c[0]] = 'order'; st.order++; }
      });
      rule.forEach((r, i) => { if (r === 'changed') st.changed++; if (r === 'ambiguous') st.ambiguous++; });
    }
    stats[rev] = st;
  }
  return { table, stats };
}

if (require.main === module) {
  const { table, stats } = build();
  if (process.argv.includes('--stats')) {
    console.log(JSON.stringify(stats, null, 1));
  } else {
    const head = '// 既読の移行表（自動生成：tools/make-seen-map.js）。版ごとの旧行番号 → 現行の行番号（-1 は引き継がない）。\n';
    process.stdout.write(head + 'const SEEN_MAP=' + JSON.stringify(table) + ';\n');
  }
}
module.exports = { build, keyOf };
