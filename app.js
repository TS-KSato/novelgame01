'use strict';
// 全編統合稿 v6（full-v6）。v5 からは行の位置が変わる場面だけを V5_TO_V6 で移す。旧版は FULL_MIGRATIONS → V1_TO_V2 → V2_TO_V3 → 同じ位置 → V4_TO_V5 → V5_TO_V6 の順に通す。
const OPENING_REV='full-v7',OPENING_BACKUP_KEY='zelg-v1-backup-full-v7';
// 序章の周辺減光・ぼかし（body.dream-on）の対象場面。
const DREAM_SCENE='prologue';
const $=s=>document.getElementById(s),KEY='zelg-v1';let persist={seen:[],ends:[],slots:[null,null,null],auto:null,settings:{speed:38,volume:.22,sound:false}},st=null,typing=null,autoTimer=null,skipTimer=null,auto=false,skip=false,full='',chars=[],at=0,quietRender=false;
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&Array.isArray(p.seen)&&Array.isArray(p.ends)&&Array.isArray(p.slots))persist={...persist,...p,settings:{...persist.settings,...p.settings}};}catch{}
// 表示用の改行。空行は一つにまとめ、句点の後で改行する（閉じ括弧の後で改行）。本文データは変えない。
function displayText(t){
 return String(t).split(/\n+/).map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/。([」』）]?)/g,(m,q,o,str)=>o+m.length<str.length?m+'\n':m)).join('\n');
}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600);}
function write(){try{localStorage.setItem(KEY,JSON.stringify(persist));return true;}catch{toast('ブラウザ保存が使えません。セーブコードを書き出してください。');return false;}}
const clone=x=>JSON.parse(JSON.stringify(x));
function fresh(){return{contentRevision:OPENING_REV,node:'prologue',line:0,rel:{},fragments:[],flags:{},log:[],started:Date.now()};}
function valid(s){return s&&s.contentRevision===OPENING_REV&&Object.hasOwn(STORY,s.node)&&Number.isInteger(s.line)&&s.line>=0&&s.line<STORY[s.node].lines.length&&s.rel&&typeof s.rel==='object'&&Object.values(s.rel).every(x=>Number.isFinite(x)&&x>=0&&x<=100)&&s.flags&&typeof s.flags==='object'&&Array.isArray(s.fragments)&&s.fragments.every(f=>Object.hasOwn(FRAGMENTS,f))&&Array.isArray(s.log)&&s.log.length<=2000&&s.log.every(x=>Array.isArray(x)&&x.length===2&&x.every(v=>typeof v==='string'&&v.length<2000));}
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
  if(l7===null||(V6_REPLACED[node]||[]).includes(l7))continue;
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
  if(l6===null||(V5_REPLACED[node]||[]).includes(l6)||(V6_REPLACED[node]||[]).includes(l6))continue;
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
  if((V4_REPLACED[node]||[]).includes(l5))continue;
  const l6=v6Position(node,l5);
  if(l6===null||(V5_REPLACED[node]||[]).includes(l6)||(V6_REPLACED[node]||[]).includes(l6))continue;
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
function migrateSeen(seen,rev){
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
   if(rev==='full-v1'){const a=V1_TO_V2[node];if(a){if(!Number.isInteger(line)||line<0||line>=a.length)continue;l2=a[line];}}
   if((V2_REPLACED[node]||[]).includes(l2))continue;
   l3=v3Position(node,l2);
  }
  if(l3===null)continue;
  if((V3_REPLACED[node]||[]).includes(l3))continue;
  const l5=v5Position(node,l3);
  if(l5===null||(V4_REPLACED[node]||[]).includes(l5))continue;
  const l6=v6Position(node,l5);
  if(l6===null||(V5_REPLACED[node]||[]).includes(l6)||(V6_REPLACED[node]||[]).includes(l6))continue;
  const key=node+':'+l6;if(!out.includes(key))out.push(key);
 }
 return out;
}
function migrateState(s){
 if(!s||typeof s!=='object'||typeof s.node!=='string')return{ok:false,reason:'セーブの中身が読めません'};
 if(s.contentRevision===OPENING_REV)return valid(s)?{ok:true,state:s}:{ok:false,reason:'本文の位置が範囲外です'};
 if(s.contentRevision==='full-v6'){const t={...clone(s),contentRevision:OPENING_REV};return valid(t)?{ok:true,state:t}:{ok:false,reason:'本文の位置が範囲外です'};}
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
    const arr=FULL_MIGRATIONS[rev]?.[s.node];
    if(!arr||!Number.isInteger(s.line)||s.line<0||s.line>=arr.length)return{ok:false,reason:'この本文版の位置を移せません'};
    const pos=arr[s.line];n1=resolveStoryTarget(pos.node,s);l1=pos.line;
   }
   const a=V1_TO_V2[n1];
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
 const t={...clone(s),node:v3node,line:v6line,contentRevision:OPENING_REV};
 if(!valid(t))return{ok:false,reason:'移行後の位置が本文の範囲外です'};
 return{ok:true,state:t};
}
function saveReason(s){if(!s)return'空のセーブ';if(valid(s))return null;return s.contentRevision!==undefined&&s.contentRevision!==OPENING_REV?'未知の本文版のセーブです':'旧版の位置を移せないセーブです';}
function migrateImport(p){
 if(!p||!p.state)return{ok:false,reason:'有効なセーブコードを入力してください。'};
 const old=p.state.contentRevision!==OPENING_REV;
 const m=migrateState(p.state);
 if(!m.ok)return{ok:false,reason:m.reason};
 return{ok:true,state:m.state,seen:old?migrateSeen(p.seen,p.state.contentRevision):p.seen};
}
// 起動時に一度だけ：旧データを専用キーへバックアップ（既にあれば上書きしない）してから、既読と各セーブを移す。データは削除しない。
function migrateStorage(){
 let raw=null;try{raw=localStorage.getItem(KEY);}catch{}
 const seenPending=persist.seenRev!==OPENING_REV;
 const pendingState=s=>s&&typeof s==='object'&&s.contentRevision!==OPENING_REV;
 const slotsPending=persist.slots.some(x=>pendingState(x?.state));
 if(!seenPending&&!pendingState(persist.auto?.state)&&!slotsPending)return;
 if(raw!==null){try{if(localStorage.getItem(OPENING_BACKUP_KEY)===null)localStorage.setItem(OPENING_BACKUP_KEY,raw);}catch{toast('バックアップを保存できないため、セーブの移行を中止しました。');return;}}
 if(seenPending){persist.seen=migrateSeen(persist.seen,persist.seenRev);persist.seenRev=OPENING_REV;}
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
function start(s,o){stopTimers();quietRender=!!o?.quiet;st=clone(s);$('title').hidden=true;$('ending').hidden=true;$('game').hidden=false;document.body.classList.add('playing');render();}
// CG鑑賞を開く間は本文の進行を止める。閉じたときに、同じ行・途中まで表示した文・オート/スキップの状態へ戻す。
function pauseForGallery(){const s={auto,skip,partial:at<chars.length};stopTimers();return s;}
function resumeAfterGallery(s){
 if(s.partial&&at<chars.length)typing=setInterval(()=>{$('prose').textContent=chars.slice(0,++at).join('');if(at>=chars.length)complete();},persist.settings.speed);
 if(s.skip)$('skip').click();else if(s.auto)$('auto').click();
}
function remember(){const id=st.node+':'+st.line;if(!persist.seen.includes(id))persist.seen.push(id);}
function complete(){clearInterval(typing);typing=null;at=chars.length;$('prose').textContent=full;remember();if(auto&&!(STORY[st.node].choices&&st.line===STORY[st.node].lines.length-1))autoTimer=setTimeout(next,Math.max(1800,full.length*75));}
function render(){AudioCue.onLine(st.node,st.line,{fire:!quietRender&&!skip,defer:skip&&!quietRender,restore:quietRender});quietRender=false;clearInterval(typing);clearTimeout(autoTimer);document.body.classList.toggle('dream-on',st.node===DREAM_SCENE);applyBackground(document.querySelector('.scenery'),bgFor(st.node,st.line));preloadNextBackground(st.node,st.line);applyCG(cgFor(st.node,st.line));preloadNextCG(st.node,st.line);galleryReachLine(st.node,st.line);$('choices').replaceChildren();const s=STORY[st.node],line=storyLine(st.node,st.line,st);updatePortraits(st.node,st.line,line[0]);$('chapterNo').textContent=s.ch;$('chapterName').textContent=s.title;$('sceneWord').textContent=s.ch==='PROLOGUE'?'何も、終わらない。':s.title;$('speaker').textContent=line[0]||'　';full=displayText(line[1]);chars=Array.from(full);at=0;$('prose').textContent='';$('page').textContent=String(st.line+1).padStart(2,'0')+' / '+String(s.lines.length).padStart(2,'0');
if(!st.log.length||st.log.at(-1)[1]!==full)st.log.push(line);if(st.log.length>2000)st.log.shift();checkpoint();
if(persist.settings.speed===0||skip){complete();}else{typing=setInterval(()=>{$('prose').textContent=chars.slice(0,++at).join('');if(at>=chars.length)complete();},persist.settings.speed);}}
function next(){if($('modal').open||$('game').hidden||!st||galleryOpen())return;if(typing){complete();return;}const s=STORY[st.node];if(st.line<s.lines.length-1){st.line++;render();return;}if(s.choices){if($('choices').childElementCount)return;clearTimeout(autoTimer);setPortraitChoice(true);s.choices.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c.text;const sm=document.createElement('small');sm.textContent=String(i+1).padStart(2,'0')+' →';b.append(sm);b.onclick=()=>{stopTimers();for(const[k,v]of Object.entries(c.rel))st.rel[k]=(st.rel[k]||0)+v;for(const f of c.fragments)if(!st.fragments.includes(f)){st.fragments.push(f);toast('記憶の断片を入手しました');}Object.assign(st.flags,c.flags);go(c.to);};$('choices').append(b);});return;}go(s.next);}
function go(id){id=resolveStoryTarget(id,st);if(id==='$resolve'){go('end_'+resolveEnding(st));return;}if(id.startsWith('$')){finish(id.slice(1));return;}st.node=id;st.line=0;render();}
function finish(id){stopTimers();if(!persist.ends.includes(id))persist.ends.push(id);write();$('game').hidden=true;$('ending').hidden=false;const e=ENDINGS[id];$('ending').innerHTML='<div><div class="eyebrow">ENDING '+e.no+' / VI</div><div class="muted">'+e.label+'</div><h2>'+e.name+'</h2><p>'+e.desc+'</p><p class="muted">'+e.hint+'</p><button class="btn" id="again">もう一度、旅をする</button><button class="btn" id="endHome">タイトルへ</button></div>';$('again').onclick=()=>start(fresh());$('endHome').onclick=title;}
function modal(name,content){stopTimers();$('modalTitle').textContent=name;$('modalBody').replaceChildren();if(typeof content==='string')$('modalBody').innerHTML=content;else $('modalBody').append(content);$('modal').showModal();}
function relationships(){return Object.entries(CAST).map(([k,v])=>'<div class="row"><span>'+v+'</span><span class="meter"><i style="width:'+Math.min(100,(st?.rel[k]||0)*20)+'%"></i></span></div>').join('');}
function memories(){modal('記憶の断片','<p class="muted">旅で集めた、人が確かに生きていた証。 '+(st?.fragments.length||0)+' / 5</p>'+Object.entries(FRAGMENTS).map(([id,f])=>st?.fragments.includes(id)?'<div class="line"><span class="badge">◇</span>'+f[0]+'<p class="muted">'+f[1]+'</p></div>':'<div class="line muted">◇　まだ見つかっていない記憶</div>').join('')+'<h3>旅で結んだ関係</h3>'+relationships());}
function collection(){modal('記憶の書庫','<p class="muted">辿り着いた結末 '+persist.ends.length+' / 6　未到達の結末は伏せられています。</p>'+Object.entries(ENDINGS).map(([id,e])=>persist.ends.includes(id)?'<div class="line"><span class="badge">'+e.no+'</span>'+e.name+'<p class="muted">'+e.hint+'</p></div>':'<div class="line muted"><span class="badge">'+e.no+'</span>封じられた記憶</div>').join(''));}
function encodeSaveJSON(data){const bytes=new TextEncoder().encode(JSON.stringify(data));let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
function saves(){modal('設定・セーブ','<div class="row"><label for="speed">文字の速さ</label><input id="speed" type="range" min="0" max="75" value="'+(75-persist.settings.speed)+'"><span>速い →</span></div><div class="row"><label for="volume">環境音の音量</label><input id="volume" type="range" min="0" max="50" value="'+persist.settings.volume*100+'"></div><p class="muted">進行は自動保存されます。手動スロットは各ボタンで保存・復元できます。</p><div id="slots"></div><h3>セーブコードで端末間の引き継ぎ</h3><textarea id="code" aria-label="セーブコード" placeholder="書き出したコードを、ここへ貼り付けて復元できます"></textarea><div class="row"><button class="btn" id="export">コードを書き出す</button><button class="btn" id="import">コードから復元</button></div><p class="muted">全6結末。横向きで、文章をタップして進みます。端末のブラウザごとに保存されます。</p>');
$('speed').oninput=e=>{persist.settings.speed=75-Number(e.target.value);write();};$('volume').oninput=e=>{persist.settings.volume=Number(e.target.value)/100;AudioCue.setVolume(persist.settings.volume);write();};slotUI();
$('export').onclick=()=>{const state=st||persist.auto?.state;if(!valid(state)){toast('まず物語をはじめてください');return;}const data={v:1,state,ends:persist.ends,seen:persist.seen};$('code').value='ZELG1.'+encodeSaveJSON(data);$('code').select();toast('コードを選択しました。コピーして保管してください。');};
$('import').onclick=()=>{try{const code=$('code').value.trim();if(!code.startsWith('ZELG1.')||code.length>1000000)throw Error();const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.slice(6)),c=>c.charCodeAt(0))));if(p.v!==1)throw Error();const mig=migrateImport(p);if(!mig.ok){toast(mig.reason);return;}p.state=mig.state;p.seen=mig.seen;if(!valid(p.state)||!Array.isArray(p.ends)||!p.ends.every(e=>Object.hasOwn(ENDINGS,e))||!Array.isArray(p.seen)||!p.seen.every(x=>typeof x==='string'&&x.length<100))throw Error();persist.ends=[...new Set([...persist.ends,...p.ends])];persist.seen=[...new Set([...persist.seen,...p.seen])];$('modal').close();start(p.state,{quiet:true});toast('セーブコードを復元しました');}catch{toast('有効なセーブコードを入力してください。');}};}
function slotUI(){$('slots').innerHTML='';persist.slots.slice(0,3).forEach((slot,i)=>{const row=document.createElement('div');row.className='row';const label=document.createElement('span');label.textContent='0'+(i+1)+'　'+(valid(slot?.state)?STORY[slot.state.node].title+' · '+new Date(slot.time).toLocaleString('ja-JP'):(slot?.state?'読めないセーブ：'+saveReason(slot.state):'空のスロット'));const buttons=document.createElement('span'),save=document.createElement('button'),load=document.createElement('button');save.className=load.className='btn';save.textContent='保存';load.textContent='読込';save.disabled=!st;load.disabled=!valid(slot?.state);save.onclick=()=>{if(slot&&!confirm('このスロットを上書きしますか？'))return;persist.slots[i]=archiveState();write();slotUI();toast('保存しました');};load.onclick=()=>{if(st&&!confirm('現在の進行を、このセーブの状態へ戻しますか？'))return;$('modal').close();start(slot.state,{quiet:true});};buttons.append(save,load);row.append(label,buttons);$('slots').append(row);});}
function soundLabel(){$('sound').innerHTML='♪ <span>音 '+(AudioCue.isOn()?'ON':'OFF')+'</span>';}
function audio(){const want=!AudioCue.isOn();if(!AudioCue.set(want)){toast('このブラウザでは音を再生できません');return;}persist.settings.sound=want;write();soundLabel();}
$('new').onclick=()=>{if(persist.auto&& !confirm('新しい旅を始めます。自動セーブは更新されます。よろしいですか？'))return;if(!AudioCue.isOn())audio();start(fresh());};$('continue').onclick=()=>{if(valid(persist.auto?.state)){if(!AudioCue.isOn())audio();start(persist.auto.state,{quiet:true});}else toast('つづきから読めません：'+saveReason(persist.auto?.state));};$('dialogue').onclick=next;$('sound').onclick=audio;$('collection').onclick=collection;$('settings').onclick=saves;$('save').onclick=saves;$('memory').onclick=memories;$('close').onclick=()=>$('modal').close();$('log').onclick=()=>{const list=document.createElement('div');for(const[n,t]of st.log){const line=document.createElement('div');line.className='line';const name=document.createElement('div');name.className='badge';name.textContent=n||'地の文';const body=document.createElement('div');body.textContent=displayText(t);line.append(name,body);list.append(line);}modal('旅の履歴',list);$('modal').scrollTop=$('modal').scrollHeight;};
$('auto').onclick=()=>{if(skip)stopTimers();auto=!auto;$('auto').classList.toggle('active',auto);clearTimeout(autoTimer);if(auto&&!typing)autoTimer=setTimeout(next,2000);};$('skip').onclick=()=>{if(skip){stopTimers();return;}clearTimeout(autoTimer);auto=false;$('auto').classList.remove('active');skip=true;$('skip').classList.add('active');skipTimer=setInterval(()=>{if(!persist.seen.includes(st.node+':'+st.line)||STORY[st.node].choices&&st.line===STORY[st.node].lines.length-1){stopTimers();return;}next();},160);};
function home(){if(st&&!$('game').hidden)checkpoint();title();}$('brand').onclick=home;$('menu').onclick=()=>{modal('旅をひと休み','<p class="muted">現在の進行は自動保存されています。</p><div class="row"><button class="btn" id="menuSave">設定・セーブ</button><button class="btn" id="menuCG">CG鑑賞</button><button class="btn" id="menuHome">タイトルへ戻る</button></div>');$('menuSave').onclick=()=>{$('modal').close();saves();};$('menuCG').onclick=()=>{$('modal').close();openGallery(true);};$('menuHome').onclick=()=>{$('modal').close();home();};};
$('rotateFull').onclick=async()=>{try{await document.documentElement.requestFullscreen();await screen.orientation.lock('landscape');}catch{toast('端末を横向きにしてください');}};document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.code==='Space'||e.code==='Enter'){if(!$('modal').open&&!$('game').hidden&&!galleryOpen()){e.preventDefault();next();}}});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTimers();AudioCue.pause();}else AudioCue.resume();});// ホーム画面からのWebアプリ起動の案内。自動では表示しない（補助リンクを押したときだけ開く）。
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
AudioCue.init(persist.settings.sound===true,persist.settings.volume);soundLabel();
title();
