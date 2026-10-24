'use strict';
// 全編統合稿 v6（full-v6）。v5 からは行の位置が変わる場面だけを V5_TO_V6 で移す。旧版は FULL_MIGRATIONS → V1_TO_V2 → V2_TO_V3 → 同じ位置 → V4_TO_V5 → V5_TO_V6 の順に通す。
const OPENING_REV='full-v20',OPENING_BACKUP_KEY='zelg-v1-backup-full-v20';
// 序章の周辺減光・ぼかし（body.dream-on）の対象場面。
const DREAM_SCENE='prologue';
const $=s=>document.getElementById(s),KEY='zelg-v1';let persist={seen:[],ends:[],slots:[null,null,null],auto:null,settings:{speed:38,sound:false,mix:{bgm:100,amb:100,se:100}}},st=null,typing=null,autoTimer=null,skipTimer=null,auto=false,skip=false,full='',chars=[],at=0,quietRender=false;
// 音量設定の基準。旧全体音量の上限 0.5 を共通の基準（種類別 100% = 0.5）にする。旧既定の全体音量は 0.22。読込時の移行で使うため、読込より前に定義する。
const MIX_REF=.5,MIX_OLD_DEFAULT=.22;
// 検証の上限と形式（セーブ入力の判定。読込・インポート・移行で共通）。
// 既読「場面:行」は、現行の最長キー 21 字・場面名は 40 字以下に収める。
const SEEN_KEY=/^[A-Za-z0-9_-]{1,40}:\d{1,5}$/;
// 件数：全行を読み切った既読は現行で 1,557 件（旧版は場面の行数が今より多い時期がある）。その余裕を見て 5,000 件まで。
const SEEN_MAX=5000;
// 文字の速さ：設定画面のスライダー（0〜75）と同じ範囲。0 は即時表示なので欠損扱いにしない。
const SPEED_DEFAULT=38,SPEED_MAX=75;
// フラグ：全履歴の版で同じ形式（真偽 6 種と、plan の選択文字列）。未知のキーは捨て、処理用オブジェクトへ写さない。
const FLAG_TYPES={honest:'boolean',disclose:'boolean',share:'boolean',council:'boolean',contact:'boolean',physics:'boolean',plan:['break','alone','tia','wait']};
// 継承されたプロパティ（constructor 等）を値として拾わないための参照。
const own=(o,k)=>Object.hasOwn(o,k)?o[k]:[];
// 戻り値が null なら形式違い。配列・null・型違いの既知キーは受け付けない。
function cleanFlags(f){
 if(!f||typeof f!=='object'||Array.isArray(f))return null;
 const out={};
 for(const k of Object.keys(FLAG_TYPES)){
  if(!Object.hasOwn(f,k))continue;
  const t=FLAG_TYPES[k],v=f[k];
  if(Array.isArray(t)?!t.includes(v):typeof v!==t)return null;
  out[k]=v;
 }
 return out;
}
function cleanSpeed(v){return typeof v==='number'&&Number.isFinite(v)?Math.round(Math.min(SPEED_MAX,Math.max(0,v))):SPEED_DEFAULT;}
// 既読は現行の本文で実在する「場面:行」だけを残す（削除済みの場面・行は捨てる）。移行の後に、現行の行数で判定する。
function keepCurrentSeen(list){
 const out=[],seen=new Set();
 for(const key of list){
  if(typeof key!=='string')continue;
  const i=key.lastIndexOf(':');if(i<0)continue;
  const node=key.slice(0,i),line=Number(key.slice(i+1));
  if(!Object.hasOwn(STORY,node)||!Number.isInteger(line)||line<0||line>=STORY[node].lines.length)continue;
  const k=node+':'+line;
  if(!seen.has(k)){seen.add(k);out.push(k);}
 }
 return out;
}
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&Array.isArray(p.seen)&&Array.isArray(p.ends)&&Array.isArray(p.slots))persist={...persist,...p,settings:{...persist.settings,...(p.settings&&typeof p.settings==='object'?p.settings:{})}};}catch{}
cleanSettings();
// 表示用の改行。空行は一つにまとめ、句点の後で改行する（閉じ括弧の後で改行）。本文データは変えない。
function displayText(t){
 return String(t).split(/\n+/).map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/。([」』）]?)/g,(m,q,o,str)=>o+m.length<str.length?m+'\n':m)).join('\n');
}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600);}
// 音量設定の検査と移行。種類別の値は「実効音量 = 種類別 × 基準 0.5」で扱う。
// 移行の版（mixVer）：なし/1＝旧全体音量あり（旧カテゴリ × 旧全体音量 ÷ 0.5）、2＝旧版の変換（現在の実効音量を維持するよう × 0.44）、3＝現在。
// 版3に上がった後は再計算しない。移行の結果は保存し、旧の全体音量は保存から外す。
function cleanSettings(){
 const s=persist.settings;
 const m=s.mix&&typeof s.mix==='object'?s.mix:{};
 if(s.mixVer===3){
  s.mix={bgm:mixPct(m.bgm),amb:mixPct(m.amb),se:mixPct(m.se)};
  if('volume' in s){delete s.volume;write();}
 }else if(s.mixVer===2){
  // 版2の値は旧の基準 0.22 で掛けてある。現在の実効音量（0.22 × 値）を、基準 0.5 の値へ直す。
  const f=MIX_OLD_DEFAULT/MIX_REF;
  s.mix={bgm:mixConv(m.bgm,f),amb:mixConv(m.amb,f),se:mixConv(m.se,f)};
  s.mixVer=3;delete s.volume;write();
 }else{
  // 未移行：新カテゴリ値 = 旧カテゴリ値 × 旧全体音量 ÷ 0.5（旧全体音量が無い・壊れている場合は既定 0.22）。
  const v=typeof s.volume==='number'&&Number.isFinite(s.volume)?Math.min(MIX_REF,Math.max(0,s.volume)):MIX_OLD_DEFAULT;
  const f=v/MIX_REF;
  s.mix={bgm:mixConv(m.bgm,f),amb:mixConv(m.amb,f),se:mixConv(m.se,f)};
  s.mixVer=3;delete s.volume;write();
 }
 s.sound=s.sound===true;
 s.speed=cleanSpeed(s.speed);
}
// 旧カテゴリ値に係数を掛ける（0〜100 の整数。係数は 1 以下なので上限は超えない）。
function mixConv(x,f){return Math.round(mixPct(x)*f);}
function mixPct(x){return typeof x==='number'&&Number.isFinite(x)?Math.round(Math.min(100,Math.max(0,x))):100;}
function write(){try{localStorage.setItem(KEY,JSON.stringify(persist));return true;}catch{toast('ブラウザ保存が使えません。セーブコードを書き出してください。');return false;}}
const clone=x=>JSON.parse(JSON.stringify(x));
function fresh(){return{contentRevision:OPENING_REV,node:'prologue',line:0,rel:{},fragments:[],flags:{},log:[],started:Date.now()};}
function valid(s){return s&&s.contentRevision===OPENING_REV&&Object.hasOwn(STORY,s.node)&&Number.isInteger(s.line)&&s.line>=0&&s.line<STORY[s.node].lines.length&&s.rel&&typeof s.rel==='object'&&Object.values(s.rel).every(x=>Number.isFinite(x)&&x>=0&&x<=100)&&cleanFlags(s.flags)!==null&&Array.isArray(s.fragments)&&s.fragments.every(f=>Object.hasOwn(FRAGMENTS,f))&&Array.isArray(s.log)&&s.log.length<=2000&&s.log.every(x=>Array.isArray(x)&&x.length===2&&x.every(v=>typeof v==='string'&&v.length<2000));}
const FULL_MIGRATIONS={"opening-v1": {"prologue": [{"node": "prologue", "line": 0}, {"node": "prologue", "line": 1}, {"node": "prologue", "line": 2}, {"node": "prologue", "line": 3}, {"node": "prologue", "line": 4}, {"node": "prologue", "line": 5}, {"node": "prologue", "line": 6}, {"node": "prologue", "line": 7}, {"node": "prologue", "line": 8}, {"node": "prologue", "line": 9}], "alley": [{"node": "alley", "line": 0}, {"node": "alley", "line": 1}, {"node": "alley", "line": 2}, {"node": "alley", "line": 3}, {"node": "alley", "line": 4}, {"node": "alley", "line": 5}, {"node": "alley", "line": 6}, {"node": "alley", "line": 7}, {"node": "alley", "line": 8}, {"node": "alley", "line": 9}, {"node": "alley", "line": 10}, {"node": "alley", "line": 11}, {"node": "alley", "line": 12}, {"node": "alley", "line": 13}, {"node": "alley", "line": 14}, {"node": "alley", "line": 15}, {"node": "alley", "line": 16}, {"node": "alley", "line": 17}, {"node": "alley", "line": 18}, {"node": "alley", "line": 19}, {"node": "alley", "line": 20}, {"node": "alley", "line": 21}, {"node": "alley", "line": 22}, {"node": "alley", "line": 23}, {"node": "alley", "line": 24}], "rescue": [{"node": "rescue", "line": 0}, {"node": "rescue", "line": 1}, {"node": "rescue", "line": 2}, {"node": "rescue", "line": 3}, {"node": "rescue", "line": 4}, {"node": "rescue", "line": 5}, {"node": "rescue", "line": 6}, {"node": "rescue", "line": 7}, {"node": "rescue", "line": 8}, {"node": "rescue", "line": 9}, {"node": "rescue", "line": 10}, {"node": "rescue", "line": 11}, {"node": "rescue", "line": 12}, {"node": "rescue", "line": 13}, {"node": "rescue", "line": 14}, {"node": "rescue", "line": 15}, {"node": "rescue", "line": 16}, {"node": "rescue", "line": 17}, {"node": "rescue", "line": 18}, {"node": "rescue", "line": 19}, {"node": "rescue", "line": 20}, {"node": "rescue", "line": 21}, {"node": "rescue", "line": 22}, {"node": "rescue", "line": 23}, {"node": "rescue", "line": 24}, {"node": "rescue", "line": 25}, {"node": "rescue", "line": 26}, {"node": "rescue", "line": 27}, {"node": "rescue", "line": 28}, {"node": "rescue", "line": 29}, {"node": "rescue", "line": 30}, {"node": "rescue", "line": 32}, {"node": "rescue", "line": 33}, {"node": "rescue", "line": 34}, {"node": "rescue", "line": 35}, {"node": "rescue", "line": 36}, {"node": "rescue", "line": 37}, {"node": "rescue", "line": 38}, {"node": "rescue", "line": 39}, {"node": "rescue", "line": 40}, {"node": "rescue", "line": 41}, {"node": "rescue", "line": 42}, {"node": "rescue", "line": 43}, {"node": "rescue", "line": 44}, {"node": "rescue", "line": 51}, {"node": "rescue", "line": 52}, {"node": "rescue", "line": 55}, {"node": "rescue", "line": 56}], "brother": [{"node": "brother", "line": 0}, {"node": "brother", "line": 1}, {"node": "brother", "line": 2}, {"node": "brother", "line": 3}, {"node": "brother", "line": 4}, {"node": "brother", "line": 5}, {"node": "brother", "line": 6}, {"node": "brother", "line": 7}, {"node": "brother", "line": 8}, {"node": "brother", "line": 9}, {"node": "brother", "line": 10}, {"node": "brother", "line": 11}, {"node": "brother", "line": 12}, {"node": "brother", "line": 13}, {"node": "brother", "line": 14}, {"node": "brother", "line": 15}, {"node": "brother", "line": 16}, {"node": "brother", "line": 17}, {"node": "brother", "line": 18}, {"node": "brother", "line": 19}, {"node": "brother", "line": 20}, {"node": "brother", "line": 21}, {"node": "brother", "line": 22}, {"node": "brother", "line": 23}, {"node": "brother", "line": 24}, {"node": "brother", "line": 25}, {"node": "brother", "line": 26}, {"node": "brother", "line": 27}, {"node": "brother", "line": 28}, {"node": "brother", "line": 29}, {"node": "brother", "line": 30}, {"node": "brother", "line": 31}, {"node": "brother", "line": 32}, {"node": "brother", "line": 33}], "scholar": [{"node": "scholar", "line": 0}, {"node": "scholar", "line": 1}, {"node": "scholar", "line": 2}, {"node": "scholar", "line": 3}, {"node": "scholar", "line": 4}, {"node": "scholar", "line": 5}, {"node": "scholar", "line": 6}, {"node": "scholar", "line": 7}, {"node": "scholar", "line": 8}, {"node": "scholar", "line": 9}, {"node": "scholar", "line": 10}, {"node": "scholar", "line": 11}, {"node": "scholar", "line": 12}, {"node": "scholar", "line": 13}, {"node": "scholar", "line": 14}, {"node": "scholar", "line": 15}, {"node": "scholar", "line": 16}, {"node": "scholar", "line": 17}, {"node": "scholar", "line": 18}, {"node": "scholar", "line": 19}, {"node": "scholar", "line": 20}, {"node": "scholar", "line": 21}, {"node": "scholar", "line": 22}, {"node": "scholar", "line": 23}, {"node": "scholar", "line": 24}, {"node": "scholar", "line": 25}, {"node": "scholar", "line": 26}, {"node": "scholar", "line": 27}, {"node": "scholar", "line": 28}, {"node": "scholar", "line": 29}, {"node": "scholar", "line": 30}, {"node": "scholar", "line": 31}, {"node": "scholar", "line": 32}, {"node": "scholar", "line": 33}, {"node": "scholar", "line": 34}, {"node": "scholar", "line": 35}, {"node": "scholar", "line": 36}, {"node": "scholar", "line": 37}, {"node": "scholar", "line": 38}, {"node": "scholar", "line": 39}, {"node": "scholar", "line": 40}, {"node": "scholar", "line": 41}, {"node": "scholar", "line": 42}, {"node": "scholar", "line": 43}, {"node": "scholar", "line": 44}, {"node": "scholar", "line": 45}, {"node": "scholar", "line": 46}, {"node": "scholar", "line": 47}, {"node": "scholar", "line": 48}, {"node": "scholar", "line": 49}, {"node": "scholar", "line": 50}, {"node": "scholar", "line": 51}, {"node": "scholar", "line": 52}, {"node": "scholar", "line": 53}, {"node": "scholar", "line": 54}, {"node": "scholar", "line": 55}, {"node": "scholar", "line": 56}, {"node": "scholar", "line": 57}, {"node": "scholar", "line": 58}], "arena": [{"node": "arena", "line": 0}, {"node": "arena", "line": 1}, {"node": "arena", "line": 2}, {"node": "arena", "line": 3}, {"node": "arena", "line": 4}, {"node": "arena", "line": 5}, {"node": "arena", "line": 6}, {"node": "arena", "line": 7}, {"node": "arena", "line": 8}, {"node": "arena", "line": 9}, {"node": "arena", "line": 10}, {"node": "arena", "line": 11}, {"node": "arena", "line": 12}, {"node": "arena", "line": 13}, {"node": "arena", "line": 14}, {"node": "arena", "line": 15}, {"node": "arena", "line": 16}, {"node": "arena", "line": 17}, {"node": "arena", "line": 18}, {"node": "arena", "line": 19}, {"node": "arena", "line": 20}, {"node": "arena", "line": 21}, {"node": "arena", "line": 22}, {"node": "arena", "line": 23}, {"node": "arena", "line": 24}, {"node": "arena", "line": 25}, {"node": "arena", "line": 26}, {"node": "arena", "line": 27}, {"node": "arena", "line": 28}, {"node": "arena", "line": 29}, {"node": "arena", "line": 30}, {"node": "arena", "line": 31}, {"node": "arena", "line": 32}, {"node": "arena", "line": 33}, {"node": "arena", "line": 34}, {"node": "arena", "line": 35}, {"node": "arena", "line": 36}, {"node": "arena", "line": 37}, {"node": "arena", "line": 38}, {"node": "arena", "line": 39}, {"node": "arena", "line": 40}, {"node": "arena", "line": 41}, {"node": "arena", "line": 42}, {"node": "arena", "line": 43}, {"node": "arena", "line": 44}, {"node": "arena", "line": 45}, {"node": "arena", "line": 46}, {"node": "arena", "line": 47}, {"node": "arena", "line": 48}, {"node": "arena", "line": 49}, {"node": "arena", "line": 50}, {"node": "arena", "line": 51}, {"node": "arena", "line": 52}, {"node": "arena", "line": 53}, {"node": "arena", "line": 54}, {"node": "arena", "line": 55}, {"node": "arena", "line": 56}, {"node": "arena", "line": 57}, {"node": "arena", "line": 58}, {"node": "arena", "line": 59}, {"node": "arena", "line": 60}, {"node": "arena", "line": 61}, {"node": "arena", "line": 62}, {"node": "arena", "line": 63}, {"node": "arena", "line": 64}, {"node": "arena", "line": 65}, {"node": "arena", "line": 66}, {"node": "arena", "line": 67}, {"node": "arena", "line": 68}, {"node": "arena", "line": 69}, {"node": "arena", "line": 70}, {"node": "arena", "line": 71}, {"node": "arena", "line": 72}, {"node": "arena", "line": 73}, {"node": "arena", "line": 74}, {"node": "arena", "line": 75}, {"node": "arena", "line": 76}, {"node": "arena", "line": 77}, {"node": "arena", "line": 78}, {"node": "arena", "line": 79}, {"node": "arena", "line": 80}, {"node": "arena", "line": 81}, {"node": "arena", "line": 82}, {"node": "arena", "line": 83}, {"node": "arena", "line": 84}, {"node": "arena", "line": 85}, {"node": "arena", "line": 86}, {"node": "arena", "line": 87}, {"node": "arena", "line": 88}, {"node": "arena", "line": 89}, {"node": "arena", "line": 90}], "court": [{"node": "court", "line": 0}, {"node": "court", "line": 24}, {"node": "court", "line": 33}, {"node": "court", "line": 58}], "border": [{"node": "border", "line": 0}, {"node": "border", "line": 20}, {"node": "border", "line": 38}, {"node": "border", "line": 75}], "races": [{"node": "races", "line": 0}, {"node": "races", "line": 0}, {"node": "races", "line": 0}, {"node": "races", "line": 0}, {"node": "races", "line": 0}], "neia": [{"node": "neia", "line": 0}, {"node": "neia", "line": 0}, {"node": "neia", "line": 0}, {"node": "neia", "line": 0}, {"node": "neia", "line": 0}], "prayer": [{"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}], "confession": [{"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}], "resolve": [{"node": "resolve", "line": 0}, {"node": "resolve", "line": 0}, {"node": "resolve", "line": 0}, {"node": "resolve", "line": 0}], "agreement": [{"node": "@plan", "line": 0}, {"node": "@plan", "line": 0}, {"node": "@plan", "line": 0}], "alone": [{"node": "alone", "line": 0}, {"node": "alone", "line": 0}], "battle": [{"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}], "lonely": [{"node": "lonely", "line": 0}, {"node": "lonely", "line": 0}, {"node": "lonely", "line": 0}, {"node": "lonely", "line": 0}], "end_harmony": [{"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}], "end_sacrifice": [{"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}], "end_collapse": [{"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}], "end_true": [{"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}], "end_god": [{"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}]}, "unmarked-original": {"prologue": [{"node": "prologue", "line": 0}, {"node": "prologue", "line": 3}, {"node": "prologue", "line": 4}, {"node": "prologue", "line": 6}, {"node": "prologue", "line": 8}, {"node": "prologue", "line": 9}], "alley": [{"node": "alley", "line": 0}, {"node": "alley", "line": 2}, {"node": "alley", "line": 24}], "rescue": [{"node": "rescue", "line": 3}, {"node": "rescue", "line": 14}, {"node": "rescue", "line": 15}, {"node": "rescue", "line": 21}, {"node": "rescue", "line": 56}], "brother": [{"node": "brother", "line": 15}, {"node": "brother", "line": 16}, {"node": "brother", "line": 18}, {"node": "brother", "line": 25}, {"node": "brother", "line": 33}], "scholar": [{"node": "scholar", "line": 0}, {"node": "scholar", "line": 4}, {"node": "scholar", "line": 36}, {"node": "scholar", "line": 37}, {"node": "scholar", "line": 58}], "arena": [{"node": "arena", "line": 7}, {"node": "arena", "line": 25}, {"node": "arena", "line": 47}, {"node": "arena", "line": 57}, {"node": "arena", "line": 90}], "court": [{"node": "court", "line": 0}, {"node": "court", "line": 24}, {"node": "court", "line": 33}, {"node": "court", "line": 58}], "border": [{"node": "border", "line": 0}, {"node": "border", "line": 20}, {"node": "border", "line": 38}, {"node": "border", "line": 75}], "races": [{"node": "races", "line": 0}, {"node": "races", "line": 0}, {"node": "races", "line": 0}, {"node": "races", "line": 0}, {"node": "races", "line": 0}], "neia": [{"node": "neia", "line": 0}, {"node": "neia", "line": 0}, {"node": "neia", "line": 0}, {"node": "neia", "line": 0}, {"node": "neia", "line": 0}], "prayer": [{"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}, {"node": "prayer-inn", "line": 0}], "confession": [{"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}, {"node": "confession-road", "line": 0}], "resolve": [{"node": "resolve", "line": 0}, {"node": "resolve", "line": 0}, {"node": "resolve", "line": 0}, {"node": "resolve", "line": 0}], "agreement": [{"node": "@plan", "line": 0}, {"node": "@plan", "line": 0}, {"node": "@plan", "line": 0}], "alone": [{"node": "alone", "line": 0}, {"node": "alone", "line": 0}], "battle": [{"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}, {"node": "battle-approach", "line": 0}], "lonely": [{"node": "lonely", "line": 0}, {"node": "lonely", "line": 0}, {"node": "lonely", "line": 0}, {"node": "lonely", "line": 0}], "end_harmony": [{"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}, {"node": "end_harmony", "line": 0}], "end_sacrifice": [{"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}, {"node": "end_sacrifice", "line": 0}], "end_collapse": [{"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}, {"node": "end_collapse", "line": 0}], "end_true": [{"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}, {"node": "end_true", "line": 0}], "end_god": [{"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}, {"node": "end_god", "line": 0}]}};
const V1_TO_V2={"scholar":[0, 1, 2, 3, 4, 8, 6, 7, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]};
// full-v2 → full-v3 の行の対応（旧行の添字 → 新しい行の添字）。
const V2_TO_V3={"scholar": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 75, 74, 75, 71, 72, 76], "court-after": [0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41], "border-road": [0, 1, 2, 3, 4, 5, 6, 7, 22, 23, 24, 25], "races-yard": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]};
// 意味が変わった旧 full-v2 の行。位置は移すが、既読は引き継がない（新しい文章として読み直す）。
const V2_REPLACED={"scholar": [63, 64, 65, 66, 67, 68, 69]};
// 同じ行数でも意味を変えた旧 full-v3 の行。位置は移すが、既読は引き継がない。
const V3_REPLACED={"prologue": [3, 5, 6, 7]};
// full-v4 → full-v5（推敲）。行の位置が変わった場面だけ、旧行 → 新行の対応を持つ。
const V4_TO_V5={"prologue":[0,1,2,3,4,5,6,7,8,9],"scholar":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77],"confession":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63],"prayer-method":[0,1,2,3,4,5,6,7,8,9,10],"agreement-method":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,17],"alone":[0,1,2,3,4],"collapse-agreement":[0,1,2,3,4,6,7],"end_true":[0,1,3,4,5,6,7,8,8,11,12,13,14,15,15,15,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44],"end_god":[0,1,2,3,4,5,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51]};
// 意味を変えた行（書き換え・新規行）。位置は移すが、既読は引き継がない。
const V4_REPLACED={"prologue":[2,8],"scholar":[23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,45],"confession":[29],"prayer-method":[1],"agreement-method":[14,15,16,17],"alone":[1,4],"collapse-agreement":[5],"end_true":[1,2,3,5,6,7,8,9,10,11,13,15,16,17,18,19],"end_god":[3,4,5,6,7,16,21,25,26,27]};
function v5Position(node,line){
 if(!Object.hasOwn(STORY,node))return null;
 const a=V4_TO_V5[node];
 if(!a)return Number.isInteger(line)&&line>=0&&line<STORY[node].lines.length?line:null;
 if(!Number.isInteger(line)||line<0||line>=a.length)return null;
 return a[line];
}
// full-v5 → full-v6（文章の推敲）。行の位置が変わった場面だけ、旧行 → 新行の対応を持つ。
const V5_TO_V6={"neia-listen":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,16,17,18],"end_god":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]};
// 文章を書き換えた行・新規の行（既読は引き継がない）。空白・改行だけの変更は含めない。
const V5_REPLACED={"prologue":[1,2,5,8],"alley":[1,3,4,7,11,18,19,23],"rescue":[0,3,4,5,10,16,21,22,35,37,55,56],"brother":[6,9,16,26],"scholar":[0,2,23,31],"arena":[0,9,13,33,68,79],"court":[8,50],"court-after":[4],"border-road":[7,9],"border":[1,6,43],"races-road":[13],"neia":[6],"neia-listen":[9,15],"neia-after":[6],"prayer-weeks":[2,17],"prayer-night":[1],"prayer-contact":[4],"prayer-stone":[11],"confession":[38],"agreement-yes":[4],"agreement-method":[0,16],"agreement-no":[1],"collapse-agreement":[0],"battle":[1,2,13],"end_harmony":[3],"end_sacrifice":[37],"end_true":[35,37],"end_god":[23]};
function v6Position(node,line){
 if(!Object.hasOwn(STORY,node))return null;
 const a=V5_TO_V6[node];
 if(!a)return Number.isInteger(line)&&line>=0&&line<STORY[node].lines.length?line:null;
 if(!Number.isInteger(line)||line<0||line>=a.length)return null;
 return a[line];
}
// full-v6 → full-v7。行の位置は変わらない。書き換えた行の既読は引き継がない。
const V6_REPLACED={"border":[67]};
// full-v7 → full-v8。行の位置は変わらない。書き換えた行の既読は引き継がない（prologue-004、battle-035）。
const V7_REPLACED={"prologue":[3],"battle":[34]};
// full-v8 → full-v9。語彙と呼称の校正（行数・話者・分岐は同じ）。書き換えた行の既読は引き継がない。
const V8_REPLACED={"alley":[2,9,13],"rescue":[0,3,8,10,35,41,51],"brother":[6,16,26,31],"scholar":[10,17],"arena":[60],"court-road":[4,7],"court":[25],"court-after":[4],"border-road":[9,10,13,21],"border-after":[14],"races-road":[0,4,15],"races-yard":[6,23,47],"races":[23],"races-talk":[22],"races-stone":[0],"neia-road":[9],"neia":[9,22],"prayer-inn":[7],"prayer-weeks":[1,14,17],"prayer-compare":[0,10],"prayer-method":[7],"prayer-stone":[0],"prayer-night":[0],"prayer-contact":[2,4],"prayer-six":[0,7],"confession":[35],"agreement-method":[16],"alone":[1,2,4],"battle-approach":[21],"collapse-agreement":[5],"end_collapse":[15],"end_god":[6],"lonely":[16]};
// full-v9 → full-v10。語句の校正（行数・話者・分岐は同じ）。書き換えた行の既読は引き継がない。
const V9_REPLACED={"rescue":[4,18],"court-road":[11],"border":[19,26],"border-share":[3],"border-after":[11],"prayer-night":[1],"prayer-contact":[4],"agreement-method":[16],"alone":[2],"battle":[25]};
// full-v10 → full-v11。序盤の孤児院の別れを差し替え（alley の 4 行を 5 行にした）。alley の行位置は、旧 3〜6 を新 3 へ、旧 7 以降を +1 へ移す。
const V10_REPLACED={"alley":[1,3,4,5,6,7],"confession":[3]};
function alleyV11Line(line){
 if(!Number.isInteger(line))return line;
 return line<=2?line:line<=6?3:line+1;
}
// 旧版の位置を移す。書き換えた行の既読は、既読の移行の最後に外す。
// full-v13 → full-v14。紐の描写（握る・結ぶ・ほどく）の整理。行数・位置は同じ。書き換えた行の既読は引き継がない。
const V13_REPLACED={"rescue":[51,56],"scholar":[17],"court-after":[15,37],"races-yard":[6,15],"neia":[9]};
// full-v12 → full-v13。lonely の 3 行の文章を整える（行数・位置は同じ）。書き換えた行の既読は引き継がない。
const V12_REPLACED={"lonely":[18,26,27]};
// full-v11 → full-v12。ネイアとの遭遇前の独白（lonely）の 2 行を削除（旧 8 行目と 30 行目）。行位置は 8 以降を −1、旧 30 行目以降を −2。
const V11_REPLACED={"lonely":[2,4,8,13,15,18,26,27,29,30,34]};
function lonelyV12Line(line){
 if(!Number.isInteger(line))return line;
 return line<=6?line:line===7?7:line===29?28:line<=28?line-1:line-2;
}
function mapV11SeenKey(k){
 const i=k.lastIndexOf(':'),node=k.slice(0,i);
 return node==='lonely'?node+':'+lonelyV12Line(Number(k.slice(i+1))):k;
}
// 旧版の位置を現在の版へ移す。alley は full-v11 より前の版だけ、lonely は full-v12 より前の版すべてを移す。
// 保存の版の順。revAt が −1 は full-v10 より前の版。
// full-v14 → full-v15。闘技場の後の料理対決を、翌朝の朝食作りへ差し替え（arena は 91 行 → 82 行）。
// 旧 arena の行位置を新しい位置へ移す（削除した行は次に残る行へ）。書き換えた行の既読は引き継がない。
const ARENA_V15_MAP=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,55,55,56,56,57,58,59,60,61,62,63,64,65,66,67,68,69,69,69,70,71,71,71,72,73,74,75,75,75,76,77,78,79,80,81];
const V15_REPLACED={"arena":[52,53,54,55,57,58,63,64,65,66,67,69,70,73,74],"resolve":[15]};
function arenaV15Line(line){
 if(!Number.isInteger(line)||line<0||line>=ARENA_V15_MAP.length)return line;
 return ARENA_V15_MAP[line];
}
function arenaV15SeenKey(k){
 const i=k.lastIndexOf(':'),node=k.slice(0,i);
 return node==='arena'?node+':'+arenaV15Line(Number(k.slice(i+1))):k;
}
// full-v15 → full-v16。朝食場面の 1 行の文章を整える（行数・位置は同じ）。書き換えた行の既読は引き継がない。
const V16_REPLACED={"arena":[72]};
// full-v16 → full-v17。水車小屋の説明を、てこの実演（石と棒）に沿って書き直し、実演 10 行を追加（scholar は 78 → 88 行）。
// 旧 scholar の行位置は、旧 50 行目まで同じ、旧 51 行目以降を +10。書き換えた行の既読は引き継がない。
const SCHOLAR_V17_MAP=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87];
const V17_REPLACED={"scholar":[36,37,46,47,48,49,50,79,80,81,82],"end_god":[23],"resolve":[21]};
function scholarV17Line(line){
 if(!Number.isInteger(line)||line<0||line>=SCHOLAR_V17_MAP.length)return line;
 return SCHOLAR_V17_MAP[line];
}
function scholarV17SeenKey(k){
 const i=k.lastIndexOf(':'),node=k.slice(0,i);
 return node==='scholar'?node+':'+scholarV17Line(Number(k.slice(i+1))):k;
}
// full-v17 → full-v18。水車小屋の説明を、てこの原理（支点・力点・作用点）と滑車の話へ書き直し（scholar は 88 → 92 行）。
// 旧 scholar の行位置は、新しい位置へ移す（削除した行は次に残る行へ）。書き換えた行の既読は引き継がない。
const SCHOLAR_V18_MAP=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,50,51,52,53,54,55,56,57,58,59,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,86,87,88,89,90,91];
const V18_REPLACED={"scholar":[47,49,50,51,53,54,55,56,57,58,59,81,82,83]};
function scholarV18Line(line){
 if(!Number.isInteger(line)||line<0||line>=SCHOLAR_V18_MAP.length)return line;
 return SCHOLAR_V18_MAP[line];
}
function scholarV18SeenKey(k){
 const i=k.lastIndexOf(':'),node=k.slice(0,i);
 return node==='scholar'?node+':'+scholarV18Line(Number(k.slice(i+1))):k;
}
// full-v18 → full-v19。てこの実演の 2 行（真ん中で支えた場合の比較）を文章だけ整える。行数・位置は同じ。書き換えた行の既読は引き継がない。
const V19_REPLACED={"scholar":[54,55]};
// full-v19 → full-v20。滑車と数の説明の 3 行を、具体的な動作の言葉へ差し替え（行数・位置は同じ）。書き換えた行の既読は引き継がない。
const V20_REPLACED={"scholar":[56,84,85]};
const REV_ORDER=['full-v10','full-v11','full-v12','full-v13','full-v14','full-v15','full-v16','full-v17','full-v18','full-v19','full-v20'];
const revAt=r=>REV_ORDER.indexOf(r);
function toCurrent(t,fromRev){
 const at=revAt(fromRev);
 if(at<1&&t.node==='alley')t.line=alleyV11Line(t.line);
 if(at<2&&t.node==='lonely')t.line=lonelyV12Line(t.line);
 if(at<5&&t.node==='arena')t.line=arenaV15Line(t.line);
 if(at<7&&t.node==='scholar')t.line=scholarV17Line(t.line);
 if(at<8&&t.node==='scholar')t.line=scholarV18Line(t.line);
 t.contentRevision=OPENING_REV;
 return t;
}
function mapV10SeenKey(k){
 const i=k.lastIndexOf(':'),node=k.slice(0,i);
 return node==='alley'?node+':'+alleyV11Line(Number(k.slice(i+1))):k;
}
// 既読の判定に使う旧版の行数（full-v11 までの lonely は 39 行、full-v14 までの arena は 91 行だった）。
const OLD_LINE_LIMIT={lonely:39,arena:91};
function v8Position(node,line){
 if(!Object.hasOwn(STORY,node))return null;
 const len=Math.max(STORY[node].lines.length,Object.hasOwn(OLD_LINE_LIMIT,node)?OLD_LINE_LIMIT[node]:0);
 return Number.isInteger(line)&&line>=0&&line<len?line:null;
}
function migrateSeenV7(seen){
 if(!Array.isArray(seen))return [];
 const out=[];
 for(const id of seen){
  if(typeof id!=='string')continue;
  const i=id.lastIndexOf(':');const node=id.slice(0,i),line=Number(id.slice(i+1));
  const l8=v8Position(node,line);
  if(l8===null)continue;
  const key=node+':'+l8;if(!out.includes(key))out.push(key);
 }
 return out;
}
function v7Position(node,line){
 if(!Object.hasOwn(STORY,node))return null;
 return Number.isInteger(line)&&line>=0&&line<STORY[node].lines.length?line:null;
}
function migrateSeenV6(seen){
 if(!Array.isArray(seen))return [];
 const out=[];
 for(const id of seen){
  if(typeof id!=='string')continue;
  const i=id.lastIndexOf(':');const node=id.slice(0,i),line=Number(id.slice(i+1));
  const l7=v7Position(node,line);
  if(l7===null||own(V6_REPLACED,node).includes(l7))continue;
  const key=node+':'+l7;if(!out.includes(key))out.push(key);
 }
 return out;
}
function migrateSeenV5(seen){
 if(!Array.isArray(seen))return [];
 const out=[];
 for(const id of seen){
  if(typeof id!=='string')continue;
  const i=id.lastIndexOf(':');const node=id.slice(0,i),line=Number(id.slice(i+1));
  if(!Object.hasOwn(STORY,node)||!Number.isInteger(line)||line<0||line>=STORY[node].lines.length)continue;
  const l6=v6Position(node,line);
  if(l6===null||own(V5_REPLACED,node).includes(l6)||own(V6_REPLACED,node).includes(l6))continue;
  const key=node+':'+l6;if(!out.includes(key))out.push(key);
 }
 return out;
}
function migrateSeenV4(seen){
 if(!Array.isArray(seen))return [];
 const out=[];
 for(const id of seen){
  if(typeof id!=='string')continue;
  const i=id.lastIndexOf(':');const node=id.slice(0,i),line=Number(id.slice(i+1));
  if(!Object.hasOwn(STORY,node)||!Number.isInteger(line)||line<0||line>=STORY[node].lines.length)continue;
  const l5=v5Position(node,line);
  if(l5===null)continue;
  if(own(V4_REPLACED,node).includes(l5))continue;
  const l6=v6Position(node,l5);
  if(l6===null||own(V5_REPLACED,node).includes(l6)||own(V6_REPLACED,node).includes(l6))continue;
  const key=node+':'+l6;if(!out.includes(key))out.push(key);
 }
 return out;
}

function v3Position(node,line){
 if(!Object.hasOwn(STORY,node))return null;
 const a=V2_TO_V3[node];
 if(!a)return Number.isInteger(line)&&line>=0&&line<STORY[node].lines.length?line:null;
 if(!Number.isInteger(line)||line<0||line>=a.length)return null;
 return a[line];
}
// 既読は full-v1 / full-v2 / full-v3 からの移行だけ、行の対応で移す。それ以外の旧版の既読はリセットする（従来の方針）。
// 既読の移行の最後に、最新の書き換え（V7_REPLACED）の既読を外す。旧版の既読もここを通る。
const uniqueKeys=list=>list.filter((x,i)=>list.indexOf(x)===i);
// full-v8〜v19 の既読は、生成した移行表（seen-map.js）で行を対応させる。行ID・話者・本文（空白を除く）が一致した行だけを引き継ぎ、
// 本文が変わった行や対応の決まらない行は既読にしない。表にない版（full-v7 以前）は従来の経路のまま。
function migrateSeenByMap(seen,rev){
 const map=SEEN_MAP[rev],out=new Set();
 for(const id of seen){
  if(typeof id!=='string')continue;
  const i=id.lastIndexOf(':');if(i<0)continue;
  const node=id.slice(0,i),line=Number(id.slice(i+1));
  const arr=Object.hasOwn(map,node)?map[node]:null;
  if(!arr||!Number.isInteger(line)||line<0||line>=arr.length)continue;
  const t=arr[line];
  if(t>=0)out.add(node+':'+t);
 }
 return [...out];
}
function migrateSeen(seen,rev){
 if(Object.hasOwn(SEEN_MAP,rev))return migrateSeenByMap(seen,rev);
 const at=revAt(rev);
 const keep=(list,filter)=>list.filter(x=>{const i=x.lastIndexOf(':'),node=x.slice(0,i),line=Number(x.slice(i+1));return !own(filter,node).includes(line);});
 let k=migrateSeenBase(seen,rev);
 if(at<0){k=keep(k,V7_REPLACED);k=keep(k,V8_REPLACED);k=keep(k,V9_REPLACED);}
 if(at<1){k=uniqueKeys(k.map(mapV10SeenKey));k=keep(k,V10_REPLACED);}
 if(at<2){k=uniqueKeys(k.map(mapV11SeenKey));k=keep(k,V11_REPLACED);}
 if(at<5)k=uniqueKeys(k.map(arenaV15SeenKey));
 if(at<7)k=uniqueKeys(k.map(scholarV17SeenKey));
 if(at<3)k=keep(k,V12_REPLACED);
 if(at<4)k=keep(k,V13_REPLACED);
 if(at<5)k=keep(k,V15_REPLACED);
 if(at<6)k=keep(k,V16_REPLACED);
 if(at<7)k=keep(k,V17_REPLACED);
 if(at<8)k=uniqueKeys(k.map(scholarV18SeenKey));
 if(at<8)k=keep(k,V18_REPLACED);
 if(at<9)k=keep(k,V19_REPLACED);
 if(at<10)k=keep(k,V20_REPLACED);
 return k;
}
function migrateSeenBase(seen,rev){
 if(['full-v19','full-v18','full-v17','full-v16','full-v15','full-v14','full-v13','full-v12','full-v11','full-v10','full-v9','full-v8','full-v7'].includes(rev))return migrateSeenV7(seen);
 if(rev==='full-v6')return migrateSeenV6(seen);
 if(rev==='full-v5')return migrateSeenV5(seen);
 if(rev==='full-v4')return migrateSeenV4(seen);
 if(!Array.isArray(seen)||(rev!=='full-v1'&&rev!=='full-v2'&&rev!=='full-v3'))return [];
 const out=[];
 for(const id of seen){
  if(typeof id!=='string')continue;
  const i=id.lastIndexOf(':');const node=id.slice(0,i),line=Number(id.slice(i+1));
  if(!Object.hasOwn(STORY,node))continue;
  let l3=null;
  if(rev==='full-v3'){if(Number.isInteger(line)&&line>=0&&line<STORY[node].lines.length)l3=line;}
  else{
   let l2=line;
   if(rev==='full-v1'){const a=Object.hasOwn(V1_TO_V2,node)?V1_TO_V2[node]:null;if(a){if(!Number.isInteger(line)||line<0||line>=a.length)continue;l2=a[line];}}
   if(own(V2_REPLACED,node).includes(l2))continue;
   l3=v3Position(node,l2);
  }
  if(l3===null)continue;
  if(own(V3_REPLACED,node).includes(l3))continue;
  const l5=v5Position(node,l3);
  if(l5===null||own(V4_REPLACED,node).includes(l5))continue;
  const l6=v6Position(node,l5);
  if(l6===null||own(V5_REPLACED,node).includes(l6)||own(V6_REPLACED,node).includes(l6))continue;
  const key=node+':'+l6;if(!out.includes(key))out.push(key);
 }
 return out;
}
function migrateState(s){
 if(!s||typeof s!=='object'||typeof s.node!=='string')return{ok:false,reason:'セーブの中身が読めません'};
 if(s.contentRevision===OPENING_REV)return valid(s)?{ok:true,state:s}:{ok:false,reason:cleanFlags(s.flags)===null?'進行の記録（フラグ）が読めません。':'本文の位置が範囲外です'};
 if(['full-v11','full-v12','full-v13','full-v14','full-v15','full-v16','full-v17','full-v18','full-v19'].includes(s.contentRevision)){const t=toCurrent({...clone(s)},s.contentRevision);return valid(t)?{ok:true,state:t}:{ok:false,reason:'本文の位置が範囲外です'};}
 if(s.contentRevision==='full-v10'||s.contentRevision==='full-v9'||s.contentRevision==='full-v8'||s.contentRevision==='full-v7'){const t=toCurrent({...clone(s)},s.contentRevision);return valid(t)?{ok:true,state:t}:{ok:false,reason:'本文の位置が範囲外です'};}
 if(s.contentRevision==='full-v6'){const t=toCurrent({...clone(s)},'full-v6');return valid(t)?{ok:true,state:t}:{ok:false,reason:'本文の位置が範囲外です'};}
 const rev=s.contentRevision===undefined?'unmarked-original':s.contentRevision;
 let v3node,v3line;
 if(rev==='full-v3'||rev==='full-v4'||rev==='full-v5'){
  if(!Object.hasOwn(STORY,s.node)||!Number.isInteger(s.line)||s.line<0||s.line>=STORY[s.node].lines.length)return{ok:false,reason:'本文の位置が範囲外です'};
  v3node=s.node;v3line=s.line;
 }else{
  let v2node,v2line;
  if(rev==='full-v2'){v2node=s.node;v2line=s.line;}
  else{
   let n1=s.node,l1=s.line;
   if(rev!=='full-v1'){
    const arr=Object.hasOwn(FULL_MIGRATIONS,rev)&&Object.hasOwn(FULL_MIGRATIONS[rev],s.node)?FULL_MIGRATIONS[rev][s.node]:null;
    if(!arr||!Number.isInteger(s.line)||s.line<0||s.line>=arr.length)return{ok:false,reason:'この本文版の位置を移せません'};
    const pos=arr[s.line];n1=resolveStoryTarget(pos.node,s);l1=pos.line;
   }
   const a=Object.hasOwn(V1_TO_V2,n1)?V1_TO_V2[n1]:null;
   if(a){if(!Number.isInteger(l1)||l1<0||l1>=a.length)return{ok:false,reason:'この本文版の位置を移せません'};v2line=a[l1];}
   else{if(!Object.hasOwn(STORY,n1)||!Number.isInteger(l1)||l1<0||l1>=STORY[n1].lines.length)return{ok:false,reason:'この本文版の位置を移せません'};v2line=l1;}
   v2node=n1;
  }
  v3node=v2node;v3line=v3Position(v2node,v2line);
  if(v3line===null)return{ok:false,reason:'移行後の位置が本文の範囲外です'};
 }
 const v5line=rev==='full-v5'?v3line:v5Position(v3node,v3line);
 if(v5line===null)return{ok:false,reason:'移行後の位置が本文の範囲外です'};
 const v6line=v6Position(v3node,v5line);
 if(v6line===null)return{ok:false,reason:'移行後の位置が本文の範囲外です'};
 const t=toCurrent({...clone(s),node:v3node,line:v6line},rev);
 if(!valid(t))return{ok:false,reason:'移行後の位置が本文の範囲外です'};
 return{ok:true,state:t};
}
function saveReason(s){if(!s)return'空のセーブ';if(valid(s))return null;return s.contentRevision!==undefined&&s.contentRevision!==OPENING_REV?'未知の本文版のセーブです':'旧版の位置を移せないセーブです';}
function migrateImport(p){
 if(!p||!p.state)return{ok:false,reason:'有効なセーブコードを入力してください。'};
 if(!Array.isArray(p.seen)||p.seen.length>SEEN_MAX||!p.seen.every(x=>typeof x==='string'&&SEEN_KEY.test(x)))return{ok:false,reason:'既読の記録が読めません。'};
 const old=p.state.contentRevision!==OPENING_REV;
 const m=migrateState(p.state);
 if(!m.ok)return{ok:false,reason:m.reason};
 return{ok:true,state:m.state,seen:keepCurrentSeen(old?migrateSeen(p.seen,p.state.contentRevision):p.seen)};
}
// 起動時に一度だけ：旧データを専用キーへバックアップ（既にあれば上書きしない）してから、既読と各セーブを移す。データは削除しない。
function migrateStorage(){
 if(persist.seenRev===OPENING_REV)persist.seen=keepCurrentSeen(persist.seen);
 let raw=null;try{raw=localStorage.getItem(KEY);}catch{}
 const seenPending=persist.seenRev!==OPENING_REV;
 const pendingState=s=>s&&typeof s==='object'&&s.contentRevision!==OPENING_REV;
 const slotsPending=persist.slots.some(x=>pendingState(x?.state));
 if(!seenPending&&!pendingState(persist.auto?.state)&&!slotsPending)return;
 if(raw!==null){try{if(localStorage.getItem(OPENING_BACKUP_KEY)===null)localStorage.setItem(OPENING_BACKUP_KEY,raw);}catch{toast('バックアップを保存できないため、セーブの移行を中止しました。');return;}}
 if(seenPending){persist.seen=keepCurrentSeen(migrateSeen(persist.seen.filter(x=>typeof x==='string'),persist.seenRev));persist.seenRev=OPENING_REV;}
 const failed=[];
 const move=(holder)=>{if(pendingState(holder.state)){const m=migrateState(holder.state);if(m.ok)holder.state=m.state;else failed.push(m.reason);}};
 if(persist.auto)move(persist.auto);
 persist.slots.forEach(x=>{if(x)move(x);});
 write();
 if(failed.length)toast('移せなかったセーブがあります（データは残しています）：'+failed[0]);
}
function archiveState(){if(!st)return null;return{state:clone(st),time:Date.now()};}
function checkpoint(){persist.auto=archiveState();write();}
function stopTimers(){clearInterval(typing);typing=null;clearTimeout(autoTimer);clearInterval(skipTimer);skipTimer=null;auto=false;skip=false;$('auto').classList.remove('active');$('skip').classList.remove('active');;AudioCue.settle();}
function title(){stopTimers();AudioCue.stopEnv();AudioCue.onTitle();applyCG(null);document.body.classList.remove('dream-on');applyBackground(document.querySelector('.scenery'),null);$('game').hidden=true;$('ending').hidden=true;$('title').hidden=false;document.body.classList.remove('playing');$('continue').disabled=!persist.auto?.state;$('end-count').textContent=persist.ends.length+' / 6';}
function start(s,o){stopTimers();quietRender=!!o?.quiet;st=clone(s);st.flags=cleanFlags(st.flags);$('title').hidden=true;$('ending').hidden=true;$('game').hidden=false;document.body.classList.add('playing');render();}
// CG鑑賞を開く間は本文の進行を止める。閉じたときに、同じ行・途中まで表示した文・オート/スキップの状態へ戻す。
function pauseForGallery(){const s={auto,skip,partial:at<chars.length};stopTimers();return s;}
function resumeAfterGallery(s){
 if(s.partial&&at<chars.length)typing=setInterval(()=>{$('prose').textContent=chars.slice(0,++at).join('');if(at>=chars.length)complete();},persist.settings.speed);
 if(s.skip)$('skip').click();else if(s.auto)$('auto').click();
}
function remember(){const id=st.node+':'+st.line;if(!persist.seen.includes(id))persist.seen.push(id);}
function complete(){clearInterval(typing);typing=null;at=chars.length;$('prose').textContent=full;remember();if(auto)autoTimer=setTimeout(next,Math.max(1800,full.length*75));}
// 分岐の管理用の名前（「分岐A：…」）は表示しない。同じ章の本筋の場面名を使う（データは変えない）。
const BRANCH_TITLE=/^分岐[A-Z]：/;
function chapterTitle(node){const s=STORY[node],t=s.title;if(!BRANCH_TITLE.test(t))return t;const keys=Object.keys(STORY);for(let i=keys.indexOf(node)-1;i>=0;i--){const p=STORY[keys[i]];if(p.ch===s.ch&&!BRANCH_TITLE.test(p.title))return p.title;}return t.replace(BRANCH_TITLE,'');}
function render(){AudioCue.onLine(st.node,st.line,{fire:!quietRender&&!skip,defer:skip&&!quietRender,restore:quietRender});quietRender=false;clearInterval(typing);clearTimeout(autoTimer);document.body.classList.toggle('dream-on',st.node===DREAM_SCENE);applyBackground(document.querySelector('.scenery'),bgFor(st.node,st.line));preloadNextBackground(st.node,st.line);applyCG(cgFor(st.node,st.line));preloadNextCG(st.node,st.line);galleryReachLine(st.node,st.line);$('choices').replaceChildren();const s=STORY[st.node],line=storyLine(st.node,st.line,st);updatePortraits(st.node,st.line,line[0]);$('chapterNo').textContent=s.ch;$('chapterName').textContent=chapterTitle(st.node);$('speaker').textContent=line[0]||'　';full=displayText(line[1]);chars=Array.from(full);at=0;$('prose').textContent='';$('page').textContent=String(st.line+1).padStart(2,'0')+' / '+String(s.lines.length).padStart(2,'0');
if(!st.log.length||st.log.at(-1)[1]!==full)st.log.push(line);if(st.log.length>2000)st.log.shift();checkpoint();
// 既読SKIPは、表示した時点で既読だった行だけを送る。未読の行は通常どおり表示して読ませ、そこで止める。
readAtShow=persist.seen.includes(st.node+':'+st.line);
if(skip&&!readAtShow)stopTimers();
if(persist.settings.speed===0||skip){complete();}else{typing=setInterval(()=>{$('prose').textContent=chars.slice(0,++at).join('');if(at>=chars.length)complete();},persist.settings.speed);}}
const portraitMQ=matchMedia('(orientation: portrait)');
// 選択肢は、表示された後に始まったポインター押下かキー押下でだけ決まる。表示前から押していた指や、押しっぱなしのキーのリピートでは決めない。
let pressedAt=0,keyedAt=0,readAtShow=false;
document.addEventListener('pointerdown',()=>{pressedAt=performance.now();},true);
document.addEventListener('keydown',e=>{if(!e.repeat)keyedAt=performance.now();},true);
function next(){if(portraitMQ.matches||$('modal').open||$('game').hidden||!st||galleryOpen())return;if(typing){complete();return;}const s=STORY[st.node];if(st.line<s.lines.length-1){st.line++;render();return;}if(s.choices){if($('choices').childElementCount)return;const openedAt=performance.now();stopTimers();setPortraitChoice(true);s.choices.forEach(c=>{const b=document.createElement('button');b.type='button';b.textContent=c.text;const sm=document.createElement('small');sm.textContent='→';b.append(sm);b.onclick=e=>{if((e.detail?pressedAt:keyedAt)<openedAt)return;stopTimers();for(const[k,v]of Object.entries(c.rel))st.rel[k]=(st.rel[k]||0)+v;for(const f of c.fragments)if(!st.fragments.includes(f)){st.fragments.push(f);toast('記憶の断片を入手しました');}Object.assign(st.flags,c.flags);go(c.to);};$('choices').append(b);});return;}go(s.next);}
function go(id){id=resolveStoryTarget(id,st);if(id==='$resolve'){go('end_'+resolveEnding(st));return;}if(id.startsWith('$')){finish(id.slice(1));return;}st.node=id;st.line=0;render();}
function finish(id){stopTimers();if(!persist.ends.includes(id))persist.ends.push(id);write();$('game').hidden=true;$('ending').hidden=false;const e=ENDINGS[id];$('ending').innerHTML='<div><div class="eyebrow">ENDING '+e.no+' / VI</div><div class="muted">'+e.label+'</div><h2>'+e.name+'</h2><p>'+e.desc+'</p><p class="muted">'+e.hint+'</p><button class="btn" id="again">もう一度、旅をする</button><button class="btn" id="endHome">タイトルへ</button></div>';$('again').onclick=()=>start(fresh());$('endHome').onclick=title;}
function modal(name,content){stopTimers();$('modalTitle').textContent=name;$('modalBody').replaceChildren();if(typeof content==='string')$('modalBody').innerHTML=content;else $('modalBody').append(content);$('modal').showModal();}
function relationships(){return Object.entries(CAST).map(([k,v])=>'<div class="row"><span>'+v+'</span><span class="meter"><i style="width:'+Math.min(100,(st?.rel[k]||0)*20)+'%"></i></span></div>').join('');}
function memories(){modal('記憶の断片','<p class="muted">旅で集めた、人が確かに生きていた証。 '+(st?.fragments.length||0)+' / 5</p>'+Object.entries(FRAGMENTS).map(([id,f])=>st?.fragments.includes(id)?'<div class="line"><span class="badge">◇</span>'+f[0]+'<p class="muted">'+f[1]+'</p></div>':'<div class="line muted">◇　まだ見つかっていない記憶</div>').join('')+'<h3>旅で結んだ関係</h3>'+relationships());}
function collection(){modal('記憶の書庫','<p class="muted">辿り着いた結末 '+persist.ends.length+' / 6　未到達の結末は伏せられています。</p>'+Object.entries(ENDINGS).map(([id,e])=>persist.ends.includes(id)?'<div class="line"><span class="badge">'+e.no+'</span>'+e.name+'<p class="muted">'+e.hint+'</p></div>':'<div class="line muted"><span class="badge">'+e.no+'</span>封じられた記憶</div>').join(''));}
function encodeSaveJSON(data){const bytes=new TextEncoder().encode(JSON.stringify(data));let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
function saves(){AudioCue.setPreviewOpen(true);modal('設定・セーブ','<div class="row"><label for="speed">文字の速さ</label><input id="speed" type="range" min="0" max="75" value="'+(75-persist.settings.speed)+'"><span>速い →</span></div><h3>音声</h3><div class="mix"><label for="mixBgm">BGM</label><input id="mixBgm" type="range" min="0" max="100" step="1" value="'+persist.settings.mix.bgm+'"><output id="mixBgmOut" for="mixBgm">'+persist.settings.mix.bgm+'%</output></div><div class="mix"><label for="mixAmb">環境音</label><input id="mixAmb" type="range" min="0" max="100" step="1" value="'+persist.settings.mix.amb+'"><output id="mixAmbOut" for="mixAmb">'+persist.settings.mix.amb+'%</output></div><div class="mix"><label for="mixSe">効果音</label><input id="mixSe" type="range" min="0" max="100" step="1" value="'+persist.settings.mix.se+'"><output id="mixSeOut" for="mixSe">'+persist.settings.mix.se+'%</output></div><p class="muted">進行は自動保存されます。手動スロットは各ボタンで保存・復元できます。</p><div id="slots"></div><h3>セーブコードで端末間の引き継ぎ</h3><textarea id="code" aria-label="セーブコード" placeholder="書き出したコードを、ここへ貼り付けて復元できます"></textarea><div class="row"><button class="btn" id="export">コードを書き出す</button><button class="btn" id="import">コードから復元</button></div><p class="muted">全6結末。横向きで、文章をタップして進みます。端末のブラウザごとに保存されます。</p>');
$('speed').oninput=e=>{persist.settings.speed=75-Number(e.target.value);write();};for(const k of ['bgm','amb','se']){const id=k==='amb'?'mixAmb':k==='bgm'?'mixBgm':'mixSe';$(id).oninput=e=>{const p=Number(e.target.value);persist.settings.mix[k]=p;$(id+'Out').textContent=p+'%';AudioCue.setMix(k,p);write();};}
// 参考音：操作が終わったとき（指を離す・キーを離す）に一回だけ。BGM には無い。
for(const k of ['amb','se']){const id=k==='amb'?'mixAmb':'mixSe';$(id).onchange=()=>AudioCue.preview(k);}
slotUI();
$('export').onclick=()=>{const state=st||persist.auto?.state;if(!valid(state)){toast('まず物語をはじめてください');return;}const data={v:1,state,ends:persist.ends,seen:persist.seen};$('code').value='ZELG1.'+encodeSaveJSON(data);$('code').select();toast('コードを選択しました。コピーして保管してください。');};
$('import').onclick=()=>{try{const code=$('code').value.trim();if(!code.startsWith('ZELG1.')||code.length>1000000)throw Error();const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.slice(6)),c=>c.charCodeAt(0))));if(p.v!==1)throw Error();const mig=migrateImport(p);if(!mig.ok){toast(mig.reason);return;}p.state=mig.state;p.seen=mig.seen;if(!valid(p.state)||!Array.isArray(p.ends)||!p.ends.every(e=>Object.hasOwn(ENDINGS,e))||!Array.isArray(p.seen))throw Error();persist.ends=[...new Set([...persist.ends,...p.ends])];persist.seen=[...new Set([...persist.seen,...p.seen])];$('modal').close();start(p.state,{quiet:true});toast('セーブコードを復元しました');}catch{toast('有効なセーブコードを入力してください。');}};}
function slotUI(){$('slots').innerHTML='';persist.slots.slice(0,3).forEach((slot,i)=>{const row=document.createElement('div');row.className='row';const label=document.createElement('span');label.textContent='0'+(i+1)+'　'+(valid(slot?.state)?chapterTitle(slot.state.node)+' · '+new Date(slot.time).toLocaleString('ja-JP'):(slot?.state?'読めないセーブ：'+saveReason(slot.state):'空のスロット'));const buttons=document.createElement('span'),save=document.createElement('button'),load=document.createElement('button');save.className=load.className='btn';save.textContent='保存';load.textContent='読込';save.disabled=!st;load.disabled=!valid(slot?.state);save.onclick=()=>{if(slot&&!confirm('このスロットを上書きしますか？'))return;persist.slots[i]=archiveState();write();slotUI();toast('保存しました');};load.onclick=()=>{if(st&&!confirm('現在の進行を、このセーブの状態へ戻しますか？'))return;$('modal').close();start(slot.state,{quiet:true});};buttons.append(save,load);row.append(label,buttons);$('slots').append(row);});}
const SND_ON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SND_OFF='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function soundLabel(){const on=AudioCue.isOn(),b=$('sound');b.setAttribute('aria-pressed',String(on));b.classList.toggle('is-on',on);b.classList.toggle('is-off',!on);b.innerHTML=on?SND_ON:SND_OFF;}
function audio(){const want=!AudioCue.isOn();if(!AudioCue.set(want)){toast('このブラウザでは音を再生できません');return;}persist.settings.sound=want;write();soundLabel();}
$('new').onclick=()=>start(fresh());$('continue').onclick=()=>{if(valid(persist.auto?.state)){start(persist.auto.state,{quiet:true});}else toast('つづきから読めません：'+saveReason(persist.auto?.state));};$('dialogue').onclick=next;$('sound').onclick=audio;$('collection').onclick=collection;$('settings').onclick=saves;$('save').onclick=saves;$('memory').onclick=memories;$('close').onclick=()=>$('modal').close();$('log').onclick=()=>{const list=document.createElement('div');for(const[n,t]of st.log){const line=document.createElement('div');line.className='line';const name=document.createElement('div');name.className='badge';name.textContent=n||'地の文';const body=document.createElement('div');body.textContent=displayText(t);line.append(name,body);list.append(line);}modal('旅の履歴',list);$('modal').scrollTop=$('modal').scrollHeight;};
$('auto').onclick=()=>{if(skip)stopTimers();auto=!auto;$('auto').classList.toggle('active',auto);clearTimeout(autoTimer);if(auto&&!typing)autoTimer=setTimeout(next,2000);};$('skip').onclick=()=>{if(skip){stopTimers();return;}clearTimeout(autoTimer);auto=false;$('auto').classList.remove('active');skip=true;$('skip').classList.add('active');skipTimer=setInterval(()=>{if(!readAtShow){stopTimers();return;}next();},160);};
function home(){if(st&&!$('game').hidden)checkpoint();title();}$('brand').onclick=home;$('menu').onclick=()=>{modal('旅をひと休み','<p class="muted">現在の進行は自動保存されています。</p><div class="row"><button class="btn" id="menuSave">設定・セーブ</button><button class="btn" id="menuCG">CG鑑賞</button><button class="btn" id="menuHome">タイトルへ戻る</button></div>');$('menuSave').onclick=()=>{$('modal').close();saves();};$('menuCG').onclick=()=>{$('modal').close();openGallery(true);};$('menuHome').onclick=()=>{$('modal').close();home();};};
const goFullscreen=async()=>{try{await document.documentElement.requestFullscreen();await screen.orientation.lock('landscape');}catch{toast('端末を横向きにしてください');}};
$('rotateFull').onclick=goFullscreen;$('titleFull').onclick=goFullscreen;
// 全画面APIがない環境（iPhoneのSafariなど）では、押しても何も起きないのでリンクを出さない。
if(!document.fullscreenEnabled)$('titleFull').hidden=true;
// 縦向きでは案内で操作を止め、本文を進めない。戻ったら同じ位置で続けられるよう、表示中の行は全文を出してから止める。
portraitMQ.addEventListener('change',e=>{if(!e.matches)return;if(typing)complete();stopTimers();if($('modal').open)$('modal').close();});document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.code==='Space'||e.code==='Enter'){if(!$('modal').open&&!$('game').hidden&&!galleryOpen()){e.preventDefault();next();}}});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTimers();AudioCue.pause();}else AudioCue.resume();});// ホーム画面からのWebアプリ起動の案内。自動では表示しない（補助リンクを押したときだけ開く）。
// ホーム画面で起動しているとき（standalone）は、この案内を隠す。
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
$('appGuide').hidden=standalone;
const isIOS=/iPhone|iPod|iPad/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function steps(list,items){const ol=document.createElement('ol');for(const t of items){const li=document.createElement('li');li.textContent=t;ol.append(li);}list.append(ol);}
function appGuide(){
 const body=document.createElement('div'),para=(t,c)=>{const e=document.createElement('p');e.textContent=t;if(c)e.className=c;return e;},head=t=>{const h=document.createElement('h3');h.textContent=t;return h;};
 body.append(para('ホーム画面に追加すると、Safariのタブやアドレス欄なしで遊べます。追加せず、このまま遊ぶこともできます。'));
 if(isIOS){
  body.append(head('iPhoneでの追加手順'));
  steps(body,['Safariの共有メニューを開く','「ホーム画面に追加」を選ぶ','「Webアプリとして開く」をオンにして追加','ホーム画面のアイコンから起動する']);
 }else{
  body.append(para('この手順はiPhone向けです。お使いの端末では、ブラウザのメニューから「ホーム画面に追加」などを探してください。表示名は端末やブラウザによって異なります。','muted'));
 }
 body.append(head('今までのセーブを移す場合'));
 body.append(para('Safariとホーム画面のアプリは、保存される場所が別々です。進行は自動では共有されません。セーブコードで移してください。','muted'));
 steps(body,['通常のSafariで、タイトル画面の「設定・セーブ」を開く','「コードを書き出す」を押し、表示されたコードをすべてコピーする（一度でも物語を進めていれば書き出せます）','ホーム画面のアプリを開き、「設定・セーブ」の入力欄にコードを貼り付けて「コードから復元」を押す']);
 body.append(para('移るのは、現在の進行・既読・到達した結末です。手動セーブの3スロットはコードに含まれません。','muted'));
 const row=document.createElement('div');row.className='row';
 const to=document.createElement('button');to.className='btn';to.textContent='設定・セーブを開く';to.onclick=()=>saves();
 const close=document.createElement('button');close.className='btn';close.textContent='閉じる';close.onclick=()=>$('modal').close();
 row.append(to,close);body.append(row);
 modal('ブラウザの操作欄なしで遊ぶ',body);
}
$('appGuide').onclick=appGuide;
migrateStorage();
galleryScan(persist);
initGallery();
AudioCue.init(persist.settings.sound===true,persist.settings.mix);soundLabel();
$('modal').addEventListener('close',()=>AudioCue.setPreviewOpen(false));
title();
