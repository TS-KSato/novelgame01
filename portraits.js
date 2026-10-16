'use strict';
// 立ち絵の素材定義と表示処理。本編（stage.js / app.js）と character-preview.html で共有する。
// 表示位置・縮尺は portraits.css で指定する。ここでは素材の場所と表情の一覧、表示の切り替えだけを扱う。
const PORTRAIT_SIZE={w:686,h:1024};
// 表示順。同時に2人以上出るとき、この順で左から並べる（同じ人物が常に同じ側に来る）。
const PORTRAITS={
 riene:{name:'リーネ',dir:'assets/characters/riene/',expressions:[['normal','通常'],['happy','喜び'],['worried','心配'],['sad','悲しみ'],['angry','怒り'],['crying','涙']]},
 serion:{name:'セリオン',dir:'assets/characters/serion/',expressions:[['normal','通常'],['curious','好奇心・ギャグ（大きく崩れる）'],['thinking','思考'],['amused','控えめな笑み'],['serious','真剣'],['sad','悲しみ']]},
 gares:{name:'ガレス',dir:'assets/characters/gares/',expressions:[['normal','通常・記録の説明'],['serious','真剣・責任を伴う判断'],['apologetic','謝罪・過去の判断の訂正'],['smile','安堵・信頼']]},
 tia:{name:'ティア',dir:'assets/characters/tia/',expressions:[['normal','通常'],['happy','満面の笑み・両拳を上げる'],['annoyed','不機嫌・腕組み'],['embarrassed','照れ隠し・後頭部に手'],['serious','真剣・仲間を守る構え'],['sad','悲しみ・肩を落とす'],['frustrated','悔しがる・ギャグ（大きく崩れる）']]},
 yuri:{name:'ユーリ',dir:'assets/characters/yuri/',expressions:[['normal','通常・穏やかな説明'],['nostalgic','懐かしさ・共有した過去'],['sad','失われる記憶への悲しみ'],['serious','真実を伝える・静かな決意']]},
 neia:{name:'ネイア',dir:'assets/characters/neia/',expressions:[['normal','通常・警戒を残す証言'],['angry','怒り・追及'],['sad','薄れる記憶への悲しみ'],['trust','警戒を解き、信頼・承認']]},
 kyle:{name:'カイル',dir:'assets/characters/kyle/',expressions:[['normal','寛大で親しみやすい通常の会話'],['nostalgic','成長した妹や親友への懐かしさと愛情'],['serious','冷静な判断・重要な決意'],['relieved','別れの悲しみを含む安堵と感謝'],['calamity','厄災の力に覆われた姿（巨大・異形）']]}
};
// 表情ごとの位置補正。素材の足元の高さが通常と違う場合に、縦方向だけずらして接地位置を揃える（画像は変形しない）。
// 値は立ち絵の高さに対する%。正の値で下へ移動する。
const PORTRAIT_ADJUST={
 'serion/curious':{dy:2.83},
 'tia/frustrated':{dy:1.17},
 // ネイアは画像の高さがほぼ目一杯で、足元がほかの立ち絵より約1%低い。全表情で同じ量だけ上げ、接地位置を揃える。
 'neia/normal':{dy:-1.0},
 'neia/angry':{dy:-1.0},
 'neia/sad':{dy:-1.0},
 'neia/trust':{dy:-1.0}
};
// 同時表示する人数に応じた配置名。1人は solo、2人は left/right、3人は left3/center3/right3。
function portraitSlots(chars){
 const order=Object.keys(PORTRAITS).filter(c=>chars.includes(c));
 const names=order.length===1?['solo']:order.length===2?['left','right']:['left3','center3','right3'];
 if(order.length>3)throw new Error('同時に表示できるのは3人までです');
 return Object.fromEntries(order.map((c,i)=>[c,names[i]]));
}
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

// 表示予定の表情だけ先に取得しておく。失敗しても文章送りは止めない（呼び出し側で待たない）。
const portraitPreloaded=new Set();
function preloadPortrait(char,expr){
 const src=portraitPath(char,expr);
 if(portraitPreloaded.has(src))return;
 portraitPreloaded.add(src);
 new Image().src=src;
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
  fig.dataset.expr=item.expr;
  const adjust=PORTRAIT_ADJUST[char+'/'+item.expr];
  fig.style.setProperty('--dy',adjust?adjust.dy+'%':'0%');
  fig.classList.toggle('is-speaking',speaking);
  fig.classList.toggle('is-dim',speaker!==''&&!speaking);
  showPortrait(fig,char,item.expr);
 }
}

if(typeof module!=='undefined')module.exports={PORTRAITS,PORTRAIT_SIZE,PORTRAIT_ADJUST,portraitPath,isPortraitExpression,portraitSlots};
