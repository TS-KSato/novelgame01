'use strict';
// 演出層（画像とは独立）。本編と確認ページで共通に使う。
// 描画は paint() に集約し、描画回数・最後の描画・エラー・2Dコンテキストの取得結果を記録する。
// モードは排他（idle / playing / paused / still / solid / diagstill）。切り替えの前に必ず前の状態を止める。
// タイマーは最大1本。確認ページ限定の単色・静止表示は、操作するまで消えない（タイマーを使わない）。
(function(){
const BUILD='fx-diag-3';
const LEVELS={
 none:{label:'効果なし',vig:0,blurBg:0,blurFg:0,peak:0,cell:0,density:0},
 weak:{label:'弱',vig:.28,blurBg:.5,blurFg:.3,peak:.4,cell:3,density:.10},
 mid:{label:'中',vig:.5,blurBg:1.2,blurFg:.8,peak:.7,cell:4,density:.18},
 strong:{label:'強',vig:.7,blurBg:2.2,blurFg:1.6,peak:.9,cell:6,density:.28}
};
const DEFAULT='weak';
const NOISE_SCALES=[1,.75,.5,.25];       // ノイズ層だけの不透明度倍率（現在の弱を100%とする）
const DEFAULT_NOISE_SCALE=.5;
const DURATION=1000,GAP=350,FRAME=90;
const STILL_CELL=6,STILL_DENSITY=.5;   // 確認用の静止ノイズ（粗い白黒の粒）
const motionQuery=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;

let root=null,layers={},level=DEFAULT,staticOn=true,colorOn=false,active=false,suppressed=false;
let mode='idle',timer=null,cycleStart=0,pausedElapsed=0,loop=false,cw=0,ch=0,bufs={},cellNow=4;
let drawCount=0,lastDraw='なし',lastError='なし',ctxOk=null,lastCellCss=0;
let noiseScale=DEFAULT_NOISE_SCALE,lastBase=null,diagMode=null;   // diagMode: 診断表示（'solid' / 'opaque'）。通常の操作で必ず解除される   // lastBase: 直前の描画の基準不透明度（倍率を掛ける前）。診断表示では null

function emit(){if(root)root.dispatchEvent(new CustomEvent('fxstatechange',{detail:{mode,level,active}}));}
function ensureSize(cell){
 const c=cell||LEVELS[level].cell||4;
 const W=Math.max(1,root.clientWidth),H=Math.max(1,root.clientHeight);
 const nw=Math.ceil(W/c),nh=Math.ceil(H/c);
 cellNow=c;
 if(nw===cw&&nh===ch)return;
 cw=nw;ch=nh;bufs={};
 for(const k in layers){layers[k].width=cw;layers[k].height=ch;}
}
function clearLayers(){
 for(const k in layers){const c=layers[k];const x=c.getContext('2d');if(x)x.clearRect(0,0,c.width,c.height);c.style.opacity='0';}
 lastBase=null;
}
// すべての描画はここを通る。エラーは記録し、呼び出し側へ例外を投げない。
function paint(name,fn){
 try{
  const r=fn();drawCount++;lastDraw=name+' #'+drawCount;return r;
 }catch(e){lastError=name+': '+(e&&e.message?e.message:String(e));return false;}
}
function ctxFor(kind){
 const c=layers[kind];const x=c.getContext('2d');
 if(kind==='main')ctxOk=!!x;
 return x;
}
function fillPixels(kind,fn){
 const c=layers[kind];const x=ctxFor(kind);if(!x)throw new Error('2Dコンテキストを取得できません');
 let buf=bufs[kind];
 if(!buf||buf.width!==cw||buf.height!==ch){buf=x.createImageData(cw,ch);bufs[kind]=buf;}
 const px=new Uint32Array(buf.data.buffer);
 fn(px);
 x.putImageData(buf,0,0);
}
// 動くノイズの1枚（白か黒の粒を、密度で置く）
function paintNoise(kind,dens){
 fillPixels(kind,px=>{
  const on=kind==='red'?0xFF0000FF:kind==='cyan'?0xFFFFFF00:0;
  for(let i=0;i<px.length;i++){px[i]=Math.random()<dens?(on||(Math.random()<.5?0xFFFFFFFF:0xFF000000)):0;}
 });
}
function envelope(p){
 if(p<=0||p>=1)return 0;
 if(p<.12)return p/.12;
 if(p<.5)return 1;
 const q=(1-p)/.5;return q*q*(3-2*q);
}
function drawFrame(p){
 const L=LEVELS[level];
 const e=envelope(p);
 if(e<=0||L.density===0){clearLayers();return;}
 ensureSize();
 paint('動くノイズ',()=>paintNoise('main',L.density*e));
 lastBase=L.peak*e;
 layers.main.style.opacity=(lastBase*noiseScale).toFixed(3);
 if(colorOn){
  paint('色ずれ',()=>{paintNoise('red',L.density*e*.6);paintNoise('cyan',L.density*e*.6);});
  layers.red.style.opacity=(lastBase*noiseScale).toFixed(3);layers.cyan.style.opacity=(lastBase*noiseScale).toFixed(3);
 }else{
  for(const k of ['red','cyan']){const c=layers[k];const x=c.getContext('2d');if(x)x.clearRect(0,0,c.width,c.height);c.style.opacity='0';}
 }
}
function stopTimer(){if(timer!==null){clearInterval(timer);timer=null;}}
function tick(){
 const cycle=loop?DURATION+GAP:DURATION;
 let t=performance.now()-cycleStart;
 if(t>=cycle){
  if(!loop){finish();return;}
  cycleStart=performance.now();t=0;
 }
 paint('動くノイズ(フレーム)',()=>drawFrame(t/DURATION));
}
function finish(){stopTimer();clearLayers();setMode('idle');}
function setMode(m){mode=m;applyStatic();emit();}
// 静止表示の基準フレーム。動く粒と同じ密度・同じ粒径で、包絡が最大（=現在の弱の基準不透明度）の1枚を描く。
// 倍率は不透明度だけに掛ける。白と黒の粒は同じ不透明度で重なる（Canvas全体の不透明度）。
function paintStillRef(){
 ensureSize();
 const L=LEVELS[level];
 paint('静止ノイズ(基準)',()=>paintNoise('main',L.density));
 lastBase=L.peak;
 layers.main.style.opacity=(lastBase*noiseScale).toFixed(3);
 if(colorOn){
  paint('静止色ずれ',()=>{paintNoise('red',L.density*.6);paintNoise('cyan',L.density*.6);});
  layers.red.style.opacity=(lastBase*noiseScale).toFixed(3);layers.cyan.style.opacity=(lastBase*noiseScale).toFixed(3);
 }else{for(const k of ['red','cyan']){const c=layers[k];const x=c.getContext('2d');if(x)x.clearRect(0,0,c.width,c.height);c.style.opacity='0';}}
}
function applyStatic(){root.classList.toggle('fx-static',active&&staticOn&&!suppressed&&level!=='none');}
// 前の状態を完全に止める（タイマー・描画・診断表示）。すべての操作の最初に呼ぶ。
function halt(){stopTimer();clearLayers();suppressed=false;diagMode=null;}

const Dream={
 BUILD,LEVELS,DEFAULT,DURATION,GAP,FRAME,
 init(rootEl){
  root=rootEl;
  root.querySelectorAll('canvas.fx-noise').forEach(c=>{layers[c.dataset.kind]=c;});
  this.setLevel(DEFAULT);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')this.pause();});
  window.addEventListener('pagehide',()=>{if(mode==='playing')this.pause();});
 },
 reduced(){return !!(motionQuery&&motionQuery.matches);},
 noiseAvailable(){return !this.reduced()&&level!=='none';},
 onReduceChange(fn){if(motionQuery)motionQuery.addEventListener('change',()=>fn(Dream.reduced()));},
 level(){return level;},
 state(){return{mode,level,active,colorOn,staticOn,suppressed,diag:diagMode,noiseScale};},
 setLevel(name){
  if(!Object.prototype.hasOwnProperty.call(LEVELS,name))name=DEFAULT;
  halt();level=name;const L=LEVELS[name];
  root.style.setProperty('--fx-vig',L.vig);
  root.style.setProperty('--fx-blur-bg',L.blurBg+'px');
  root.style.setProperty('--fx-blur-fg',L.blurFg+'px');
  mode='idle';applyStatic();emit();return name;
 },
 setStatic(on){staticOn=!!on;applyStatic();},
 setNoiseScale(v){
  const n=Number(v);
  noiseScale=NOISE_SCALES.includes(n)?n:DEFAULT_NOISE_SCALE;
  // 描き直さずに不透明度だけ更新する（同じ粒の状態で比べられる）
  if(lastBase!==null){layers.main.style.opacity=(lastBase*noiseScale).toFixed(3);if(colorOn){layers.red.style.opacity=(lastBase*noiseScale).toFixed(3);layers.cyan.style.opacity=(lastBase*noiseScale).toFixed(3);}}
  emit();return noiseScale;
 },
 noiseScale(){return noiseScale;},
 NOISE_SCALES,DEFAULT_NOISE_SCALE,
 setColorShift(on){colorOn=!!on;if(!colorOn)for(const k of ['red','cyan']){const c=layers[k];if(c){const x=c.getContext('2d');if(x)x.clearRect(0,0,c.width,c.height);c.style.opacity='0';}}},
 activate(){active=true;applyStatic();emit();},
 deactivate(){halt();active=false;mode='idle';applyStatic();emit();},
 fireOnce(){return this._start(false);},
 startLoop(){return this._start(true);},
 _start(isLoop){
  halt();
  if(!active||!this.noiseAvailable())return false;
  loop=isLoop;cycleStart=performance.now();mode='playing';
  timer=setInterval(tick,FRAME);tick();emit();return true;
 },
 pause(){
  if(mode!=='playing')return;
  pausedElapsed=performance.now()-cycleStart;stopTimer();setMode('paused');
 },
 resume(){
  if(mode!=='paused'||!active)return;
  cycleStart=performance.now()-pausedElapsed;timer=setInterval(tick,FRAME);mode='playing';tick();emit();
 },
 stopNoise(){halt();if(mode!=='idle'){mode='idle';applyStatic();emit();}},
 // 動かないノイズを1枚（通常の強度）
 drawStill(){
  if(!active||level==='none')return false;
  halt();paintStillRef();
  setMode('still');return true;
 },
 // ---- 確認ページ用の診断表示（操作するまで消えない。タイマーなし） ----
 solid(){
  halt();active=true;suppressed=true;diagMode='solid';ensureSize(STILL_CELL);lastBase=null;
  paint('単色(マゼンタ)',()=>{
   layers.main.style.opacity='1';
   fillPixels('main',px=>{px.fill(0xFFFF00FF);});
  });
  for(const k of ['red','cyan']){const c=layers[k];const x=c.getContext('2d');if(x)x.clearRect(0,0,c.width,c.height);c.style.opacity='0';}
  applyStatic();mode='solid';emit();return true;
 },
 coarseStill(){
  halt();active=true;suppressed=true;diagMode='opaque';ensureSize(STILL_CELL);lastBase=null;
  paint('診断：不透明ノイズ',()=>{
   layers.main.style.opacity='1';
   paintNoise('main',STILL_DENSITY);
  });
  for(const k of ['red','cyan']){const c=layers[k];const x=c.getContext('2d');if(x)x.clearRect(0,0,c.width,c.height);c.style.opacity='0';}
  applyStatic();mode='diagstill';emit();return true;
 },
 clearAll(){halt();active=false;mode='idle';applyStatic();emit();},
 isGrainRunning(){return mode==='playing';},
 isActive(){return active;},
 // 診断用：表示の状態を実測値で返す（数値が動いていることだけで「見えている」と判断しないため、位置・重なり・合成も返す）
 diagnostics(){
  const out={build:BUILD,mode,level,active,suppressed,diagMode,reduced:this.reduced(),drawCount,lastDraw,lastError,ctxOk,noiseScale,refOpacity:LEVELS[level].peak,stillApplied:+(LEVELS[level].peak*noiseScale).toFixed(3)};
  const m=layers.main;
  if(!m)return out;
  const r=m.getBoundingClientRect();const cs=getComputedStyle(m);
  out.canvasInternal=[m.width,m.height];
  out.cellCss=cellNow;
  out.canvasRect=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];
  out.canvasOpacity=cs.opacity;out.canvasVisibility=cs.visibility;out.canvasDisplay=cs.display;out.canvasBlend=cs.mixBlendMode;
  const lay=m.parentElement;const ls=getComputedStyle(lay);const lr=lay.getBoundingClientRect();
  out.layerRect=[Math.round(lr.left),Math.round(lr.top),Math.round(lr.width),Math.round(lr.height)];
  out.layerZ=ls.zIndex;out.layerOverflow=ls.overflow;out.layerPointer=ls.pointerEvents;
  out.appOverflow=getComputedStyle(root).overflow;out.appPosition=getComputedStyle(root).position;
  out.staticClass=root.classList.contains('fx-static');
  // 中心点で、表示層より上にある要素（タップを受ける要素）
  const top=document.elementFromPoint(window.innerWidth/2,window.innerHeight/2);
  out.hitTop=top?(top.id?'#'+top.id:(top.className&&String(top.className).trim()?top.tagName+'.'+String(top.className).trim().split(/\s+/)[0]:top.tagName)):'なし';
  return out;
 }
};
window.Dream=Dream;
})();
