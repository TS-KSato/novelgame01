'use strict';
// 立ち絵の確認ページ。本編と同じ portraits.js の表示処理で描画する。
// 物語の進行・セーブ・既読情報には触れない（localStorage を使わず、story.js も読まない）。
const DEFAULT_CHARACTER='riene',DEFAULT_EXPRESSION='normal';
const $=id=>document.getElementById(id);
const state={char:DEFAULT_CHARACTER,expr:{},duo:false,group:['riene','tia'],mode:'game',bg:'game',speaker:'char'};
// 並列表示に入れる人物。同時に表示できるのは3人まで（本編の配置と同じ上限）。4人目を選ぶと最も前に選んだ人物が外れる。
const GROUP_MAX=3;
for(const char of Object.keys(PORTRAITS))state.expr[char]=DEFAULT_EXPRESSION;
const SAMPLE_NARRATION='　';

// URL の character / expression を読む。定義済みの名前以外は既定値へ戻す。
// bg は既存背景（game）・暗色・明色・市松、または背景名（assets/backgrounds の webp の名前）。bg=town_day_repaint は旧指定の互換として town_day と同じ表示にする。
// mode は game / full / bgonly。duo=1 と group=riene,thug で並列表示を指定できる。
const BG_KINDS=['game','dark','light','checker'];
const BG_ALIASES={town_day_repaint:'town_day'};
const MODES=['game','full','bgonly'];
function readParams(){
 const p=new URLSearchParams(location.search),char=p.get('character'),expr=p.get('expression');
 if(Object.hasOwn(PORTRAITS,char))state.char=char;
 if(isPortraitExpression(state.char,expr))state.expr[state.char]=expr;
 const bg=BG_ALIASES[p.get('bg')]||p.get('bg');
 if(BG_KINDS.includes(bg)||BACKGROUND_NAMES.includes(bg))state.bg=bg;
 if(MODES.includes(p.get('mode')))state.mode=p.get('mode');
 if(p.get('duo')==='1')state.duo=true;
 const group=(p.get('group')||'').split(',').filter(c=>Object.hasOwn(PORTRAITS,c)).slice(0,GROUP_MAX);
 if(group.length)state.group=group;
}
function writeParams(){
 const duo=state.duo?'&duo=1&group='+state.group.join(','):'';
 const mode=state.mode==='game'?'':'&mode='+state.mode;
 try{history.replaceState(null,'','?character='+state.char+'&expression='+state.expr[state.char]+'&bg='+state.bg+mode+duo);}catch{}
}

// 画像を一度だけ読み込み、寸法・透過率を得る。失敗は ok:false で返す。
const probes=new Map();
function probe(path){
 if(!probes.has(path))probes.set(path,new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve({ok:true,w:img.naturalWidth,h:img.naturalHeight,transparent:transparentRatio(img)});
  img.onerror=()=>resolve({ok:false});
  img.src=path;
 }));
 return probes.get(path);
}
// 透過の内訳。完全透明（α=0）と半透明（0<α<255）を分けて数える。キャンバスに描けない環境（file:// など）では null。
function transparentRatio(img){
 try{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  const d=ctx.getImageData(0,0,c.width,c.height).data;let zero=0,partial=0;
  for(let i=3;i<d.length;i+=4){if(d[i]===0)zero++;else if(d[i]<255)partial++;}
  const total=d.length/4;
  return {zero:zero/total,partial:partial/total};
 }catch{return null;}
}
// 基準（686×1024）と寸法が違っても、縦横比が同じなら表示は同じ比率で縮小される。
function sizeNote(r){
 const same=r.w===PORTRAIT_SIZE.w&&r.h===PORTRAIT_SIZE.h;
 if(same)return '（規定どおり）';
 const ratioOk=Math.abs(r.w/r.h-PORTRAIT_SIZE.w/PORTRAIT_SIZE.h)<0.005;
 return ratioOk?'（基準と縦横比が同じ。表示は同じ比率で縮小）':'（基準 '+PORTRAIT_SIZE.w+' × '+PORTRAIT_SIZE.h+' と縦横比が違います）';
}
// 配信ファイルの HTTP 状態と大きさを HEAD で確認する。
const heads=new Map();
function headOf(path){
 if(!heads.has(path))heads.set(path,fetch(path,{method:'HEAD',cache:'no-cache'})
  .then(r=>({status:r.status,size:Number(r.headers.get('content-length'))||null}))
  .catch(()=>({status:null,size:null})));
 return heads.get(path);
}

// 並列表示のときは全キャラを、通常は選択中のキャラ1人を表示する。配置名は本編と同じ portraitSlots で決める。
function toggleGroup(char){
 const i=state.group.indexOf(char);
 if(i>=0){if(state.group.length>1)state.group.splice(i,1);}
 else{state.group.push(char);if(state.group.length>GROUP_MAX)state.group.shift();}
}
function activeItems(){
 const chars=state.duo?Object.keys(PORTRAITS).filter(c=>state.group.includes(c)):[state.char];
 const slots=portraitSlots(chars);
 return chars.map(char=>({char,expr:state.expr[char],slot:slots[char]}));
}

function setPressed(container,selector,match){
 container.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(match(b))));
}

function buildControls(){
 const bgPick=$('bgPick');
 for(const name of BACKGROUND_NAMES){const o=document.createElement('option');o.value=name;o.textContent=BACKGROUND_LABELS[name]+'　'+name+'.webp';bgPick.append(o);}
 bgPick.onchange=()=>{state.bg=bgPick.value;render();};
 const charSeg=$('charSeg');
 for(const [char,def] of Object.entries(PORTRAITS)){
  const b=document.createElement('button');b.type='button';b.dataset.value=char;b.textContent=def.name;
  b.onclick=()=>{state.char=char;if(state.duo&&!state.group.includes(char))toggleGroup(char);render();};
  charSeg.append(b);
 }
 const groupSeg=$('groupSeg');
 for(const [char,def] of Object.entries(PORTRAITS)){
  const b=document.createElement('button');b.type='button';b.dataset.value=char;b.textContent=def.name;
  b.onclick=()=>{toggleGroup(char);render();};
  groupSeg.append(b);
 }
 $('duo').onchange=e=>{state.duo=e.target.checked;render();};
 for(const seg of ['modeSeg','bgSeg','speakerSeg']){
  $(seg).querySelectorAll('button').forEach(b=>b.onclick=()=>{
   if(seg==='modeSeg')state.mode=b.dataset.value;
   if(seg==='bgSeg')state.bg=b.dataset.value;
   if(seg==='speakerSeg')state.speaker=b.dataset.value;
   render();
  });
 }
 $('toggle').onclick=()=>setPanel(true);
 $('close').onclick=()=>setPanel(false);
}

function renderExpressionChips(){
 const list=$('exprList');list.replaceChildren();
 for(const [id,label] of PORTRAITS[state.char].expressions){
  const b=document.createElement('button');b.type='button';b.dataset.value=id;
  b.setAttribute('aria-pressed',String(id===state.expr[state.char]));
  b.append(label);
  const small=document.createElement('small');small.textContent=id+'.png';b.append(small);
  b.onclick=()=>{state.expr[state.char]=id;render();};
  list.append(b);
 }
}

function setPanel(open){
 $('panel').hidden=!open;
 $('toggle').setAttribute('aria-expanded',String(open));
 $('preview').classList.toggle('panel-open',open);
}

function render(){
 const preview=$('preview');
 const named=BACKGROUND_NAMES.includes(state.bg);
 preview.className='bg-'+(named?'scene':state.bg)+' mode-'+state.mode+(preview.classList.contains('panel-open')?' panel-open':'');
 applyBackground(preview.querySelector('.scenery'),named?state.bg:null);
 const layer=$('portraits');
 layer.className='portraits mode-'+state.mode;
 const speakerName=state.speaker==='char'?PORTRAITS[state.char].name:'';
 renderPortraits(layer,activeItems(),speakerName);
 $('speaker').textContent=speakerName||SAMPLE_NARRATION;
 $('label').textContent=PORTRAITS[state.char].name;
 setPressed($('charSeg'),'button',b=>b.dataset.value===state.char);
 setPressed($('groupSeg'),'button',b=>state.group.includes(b.dataset.value));
 $('duo').checked=state.duo;
 setPressed($('modeSeg'),'button',b=>b.dataset.value===state.mode);
 setPressed($('bgSeg'),'button',b=>b.dataset.value===(BG_KINDS.includes(state.bg)?state.bg:''));
 $('bgPick').value=BACKGROUND_NAMES.includes(state.bg)?state.bg:'';
 setPressed($('speakerSeg'),'button',b=>b.dataset.value===state.speaker);
 renderExpressionChips();
 writeParams();
 updateStatus();
}

// 表示中の立ち絵の読み込み結果と、参照パス・寸法・透過率を表示する。
async function updateStatus(){
 const info=$('info');
 const items=activeItems();
 const rows=[];
 const missing=[];
 for(const item of items){
  const path=portraitPath(item.char,item.expr);
  const fig=document.querySelector('#portraits [data-char="'+item.char+'"]');
  const r=await probe(path);
  // 実際に表示した要素の結果を優先する（キャッシュ済みの結果より新しい）。
  const failed=fig.dataset.want===path&&fig.dataset.state==='error'||!r.ok;
  if(failed)missing.push(path);
  if(item.char===state.char){
   const head=await headOf(path);
   rows.push(['参照パス',path]);
   rows.push(['読み込み',failed?'失敗（画像が無い、または壊れています）':'成功']);
   rows.push(['寸法',r.ok?r.w+' × '+r.h+' px'+sizeNote(r):'-']);
   rows.push(['透過',r.ok&&!failed?(r.transparent===null?'未確認（この環境では画素を読めません）':'完全透明 '+(r.transparent.zero*100).toFixed(1)+'%・半透明 '+(r.transparent.partial*100).toFixed(1)+'%'):'-']);
   rows.push(['配信',head.status===null?'未確認':'HTTP '+head.status+(head.size?' / '+(head.size/1024).toFixed(0)+' KB':'')]);
  }
 }
 info.replaceChildren();
 for(const [k,v] of rows){
  const dt=document.createElement('dt');dt.textContent=k;
  const dd=document.createElement('dd');dd.textContent=v;
  info.append(dt,dd);
 }
 const alert=$('missing');
 if(missing.length){
  alert.textContent='画像を読み込めません: '+missing.join('、')+'（不足または破損）。立ち絵は表示せず、他の表示はそのまま続きます。';
  alert.hidden=false;
 }else alert.hidden=true;
}

// 全素材の配信状態を一覧にする。HEAD で確認するので画像本体は読まない。
async function buildAssetTable(){
 const body=$('assetRows');body.replaceChildren();
 let ok=0,total=0,ng=0;
 const pending=[];
 for(const [char,def] of Object.entries(PORTRAITS)){
  for(const [expr,label] of def.expressions){
   const path=portraitPath(char,expr),tr=document.createElement('tr');
   const name=document.createElement('td'),file=document.createElement('td'),state=document.createElement('td');
   name.textContent=def.name+' '+expr;
   file.textContent=path;
   state.textContent='確認中';
   tr.append(name,file,state);body.append(tr);
   total++;
   pending.push(headOf(path).then(h=>{
    const st=h.status;
    if(st===200){ok++;state.textContent='OK';state.className='ok';}
    else if(st===null){state.textContent='確認不可';state.className='unk';}
    else{ng++;state.textContent='不足 '+st;state.className='ng';}
   }));
  }
 }
 await Promise.all(pending);
 $('summary').textContent=ng?'不足 '+ng+' 件 / 全 '+total+' 件':(ok?'OK '+ok+' / '+total:'確認不可');
}

readParams();
createPortraitLayer($('portraits'));
for(const img of $('portraits').querySelectorAll('img')){
 // 表示側の load/error ハンドラが状態を書いた後に読むため、1タスク遅らせる。
 img.addEventListener('load',()=>setTimeout(updateStatus));
 img.addEventListener('error',()=>setTimeout(updateStatus));
}
buildControls();
setPanel(matchMedia('(min-width:800px) and (min-height:600px)').matches);
render();
buildAssetTable();
