'use strict';
// 立ち絵の素材定義と表示処理。本編（stage.js / app.js）と character-preview.html で共有する。
// 表示位置・縮尺は portraits.css で指定する。ここでは素材の場所と表情の一覧、表示の切り替えだけを扱う。
const PORTRAIT_SIZE={w:686,h:1024};
const PORTRAITS={
 riene:{name:'リーネ',dir:'assets/characters/riene/',expressions:[['normal','通常'],['happy','喜び'],['worried','心配'],['sad','悲しみ'],['angry','怒り'],['crying','涙']]},
 tia:{name:'ティア',dir:'assets/characters/tia/',expressions:[['normal','通常'],['happy','満面の笑み・両拳を上げる'],['annoyed','不機嫌・腕組み'],['embarrassed','照れ隠し・後頭部に手'],['serious','真剣・仲間を守る構え'],['sad','悲しみ・肩を落とす']]}
};
const portraitPath=(char,expr)=>PORTRAITS[char].dir+expr+'.png';
const isPortraitExpression=(char,expr)=>Object.hasOwn(PORTRAITS,char)&&PORTRAITS[char].expressions.some(([id])=>id===expr);

// 立ち絵の要素を作る。キャラごとに1つずつ置き、表示を切り替えても要素は作り直さない。
function createPortraitLayer(host){
 host.replaceChildren();
 for(const char of Object.keys(PORTRAITS)){
  const fig=document.createElement('figure'),img=new Image(PORTRAIT_SIZE.w,PORTRAIT_SIZE.h);
  fig.className='portrait';fig.dataset.char=char;fig.dataset.state='empty';fig.hidden=true;
  img.alt='';img.decoding='async';img.draggable=false;
  fig.append(img);host.append(fig);
  fig.addEventListener('animationend',()=>fig.classList.remove('enter'));
 }
 return host;
}

// 読み込み済みの表情は先に取得しておく。失敗しても文章送りは止めない（呼び出し側で待たない）。
const portraitPreloaded=new Set();
function preloadPortraits(char){
 if(portraitPreloaded.has(char))return;
 portraitPreloaded.add(char);
 for(const [expr] of PORTRAITS[char].expressions)new Image().src=portraitPath(char,expr);
}

function reveal(fig){
 if(!fig.hidden)return;
 fig.hidden=false;
 fig.classList.remove('enter');void fig.offsetWidth;fig.classList.add('enter');
}

// 表情を切り替える。読み込み中は前の表情を残し、読み込み完了後に差し替える（人物が一瞬消えたり縮んだりしない）。
// 読み込みに失敗した立ち絵は非表示にする。代替画像は使わない。
function showPortrait(fig,char,expr){
 const img=fig.querySelector('img'),src=portraitPath(char,expr);
 if(img.getAttribute('src')===src){
  fig.dataset.want=src;
  if(img.complete&&img.naturalWidth>0){fig.dataset.state='ok';reveal(fig);}
  return;
 }
 fig.dataset.want=src;fig.dataset.state='loading';
 img.onload=()=>{if(fig.dataset.want!==src)return;fig.dataset.state='ok';reveal(fig);};
 img.onerror=()=>{if(fig.dataset.want!==src)return;fig.dataset.state='error';fig.hidden=true;console.warn('立ち絵を読み込めませんでした: '+src);};
 img.src=src;
}

// items: [{char, expr, slot}]。slot は 'solo' | 'left' | 'right'（portraits.css の位置）。
// speaker は話者名。空文字は地の文。話者以外の立ち絵は少し暗くして、話者を分かりやすくする。
function renderPortraits(host,items,speaker=''){
 for(const fig of host.querySelectorAll('.portrait')){
  const char=fig.dataset.char,item=items.find(i=>i.char===char);
  if(!item){fig.hidden=true;fig.dataset.want='';fig.dataset.state='empty';continue;}
  const speaking=speaker!==''&&speaker===PORTRAITS[char].name;
  fig.dataset.slot=item.slot;
  fig.classList.toggle('is-speaking',speaking);
  fig.classList.toggle('is-dim',speaker!==''&&!speaking);
  showPortrait(fig,char,item.expr);
 }
}

if(typeof module!=='undefined')module.exports={PORTRAITS,PORTRAIT_SIZE,portraitPath,isPortraitExpression};
