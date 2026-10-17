'use strict';
// 演出層（画像とは独立）。本編と確認ページで共通に使う。
// 粒状ノイズは低解像度 Canvas を毎フレーム描き直す（粒の位置そのものが動く）。タイマーは1本だけで、
// 開始・一時停止・再開・停止のたびに止めてから始める。ページが隠れたら止める。
(function(){
const LEVELS={
 none:{label:'効果なし',vig:0,blurBg:0,blurFg:0,peak:0,cell:0,density:0},
 weak:{label:'弱',vig:.28,blurBg:.5,blurFg:.3,peak:.4,cell:3,density:.10},
 mid:{label:'中',vig:.5,blurBg:1.2,blurFg:.8,peak:.7,cell:4,density:.18},
 strong:{label:'強',vig:.7,blurBg:2.2,blurFg:1.6,peak:.9,cell:6,density:.28}
};
const DEFAULT='mid';
const DURATION=1000;   // 1回の発火（ms）。終わり際に消える
const GAP=350;         // 連続再生で次の発火までの間（ms）
const FRAME=90;        // 粒の描き直し間隔（ms）。約11fps
const motionQuery=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;

let root=null,layers={},level=DEFAULT,staticOn=true,colorOn=false,active=false;
let mode='idle',timer=null,cycleStart=0,pausedElapsed=0,loop=false,cw=0,ch=0,bufs={};

function emit(){if(root)root.dispatchEvent(new CustomEvent('fxstatechange',{detail:{mode,level,active}}));}
function ensureSize(){
 const L=LEVELS[level];const cell=L.cell||4;
 const W=Math.max(1,root.clientWidth),H=Math.max(1,root.clientHeight);
 const nw=Math.ceil(W/cell),nh=Math.ceil(H/cell);
 if(nw===cw&&nh===ch)return;
 cw=nw;ch=nh;bufs={};
 for(const k in layers){layers[k].width=cw;layers[k].height=ch;}
}
function clearLayers(){
 for(const k in layers){const c=layers[k];c.getContext('2d').clearRect(0,0,c.width,c.height);c.style.opacity='0';}
}
// 1枚分の粒を描く。main は白か黒の粒、red / cyan は色ずれ用の粒。
function paint(kind,dens){
 const c=layers[kind];const ctx=c.getContext('2d');
 let buf=bufs[kind];
 if(!buf||buf.width!==cw||buf.height!==ch){buf=ctx.createImageData(cw,ch);bufs[kind]=buf;}
 const px=new Uint32Array(buf.data.buffer);const n=px.length;
 const on=kind==='red'?0xFF0000FF:kind==='cyan'?0xFFFFFF00:0;
 for(let i=0;i<n;i++){
  if(Math.random()<dens){
   px[i]=on||(Math.random()<.5?0xFFFFFFFF:0xFF000000);
  }else px[i]=0;
 }
 ctx.putImageData(buf,0,0);
}
// 粒の密度と濃さは、発火の中の位置（0〜1）で決まる。立ち上がりは速く、終わり際に静かに消える。
function envelope(p){
 if(p<=0||p>=1)return 0;
 if(p<.12)return p/.12;
 if(p<.5)return 1;
 const q=(1-p)/.5;return q*q*(3-2*q);
}
function drawFrame(p){
 ensureSize();
 const L=LEVELS[level];
 const e=envelope(p);
 if(e<=0||L.density===0){clearLayers();return;}
 paint('main',L.density*e);
 layers.main.style.opacity=(L.peak*e).toFixed(3);
 if(colorOn){
  paint('red',L.density*e*.6);paint('cyan',L.density*e*.6);
  layers.red.style.opacity=(L.peak*e).toFixed(3);layers.cyan.style.opacity=(L.peak*e).toFixed(3);
 }else{
  for(const k of ['red','cyan']){layers[k].getContext('2d').clearRect(0,0,layers[k].width,layers[k].height);layers[k].style.opacity='0';}
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
 drawFrame(t/DURATION);
}
function finish(){stopTimer();clearLayers();mode='idle';emit();}
function start(isLoop){
 stopTimer();
 if(!active||Dream.noiseAvailable()===false)return false;
 loop=isLoop;cycleStart=performance.now();mode=isLoop?'playing':'playing';
 timer=setInterval(tick,FRAME);tick();emit();return true;
}
function applyStatic(){root.classList.toggle('fx-static',active&&staticOn&&level!=='none');}

const Dream={
 LEVELS,DEFAULT,DURATION,GAP,FRAME,
 init(rootEl){
  root=rootEl;
  root.querySelectorAll('canvas.fx-noise').forEach(c=>{layers[c.dataset.kind]=c;});
  this.setLevel(DEFAULT);
  // 画面が隠れたら連続描画を止める（復帰しても自動では再開しない）
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')this.pause();});
  window.addEventListener('pagehide',()=>{if(mode==='playing')this.pause();});
 },
 reduced(){return !!(motionQuery&&motionQuery.matches);},
 noiseAvailable(){return !this.reduced()&&level!=='none';},
 onReduceChange(fn){if(motionQuery)motionQuery.addEventListener('change',()=>fn(Dream.reduced()));},
 level(){return level;},
 state(){return{mode,level,active,colorOn,staticOn};},
 setLevel(name){
  if(!Object.prototype.hasOwnProperty.call(LEVELS,name))name=DEFAULT;
  stopTimer();clearLayers();cw=0;ch=0;
  level=name;const L=LEVELS[name];
  root.style.setProperty('--fx-vig',L.vig);
  root.style.setProperty('--fx-blur-bg',L.blurBg+'px');
  root.style.setProperty('--fx-blur-fg',L.blurFg+'px');
  mode='idle';applyStatic();emit();return name;
 },
 setStatic(on){staticOn=!!on;applyStatic();},
 setColorShift(on){colorOn=!!on;if(!colorOn)for(const k of ['red','cyan']){if(layers[k]){layers[k].getContext('2d').clearRect(0,0,layers[k].width,layers[k].height);layers[k].style.opacity='0';}}},
 activate(){active=true;applyStatic();emit();},
 deactivate(){active=false;stopTimer();clearLayers();mode='idle';applyStatic();emit();},
 // 1回だけ再生する（終わり際に消える）
 fireOnce(){return start(false);},
 // 連続プレビュー（停止・一時停止まで繰り返す）
 startLoop(){return start(true);},
 pause(){
  if(mode!=='playing')return;
  pausedElapsed=performance.now()-cycleStart;stopTimer();mode='paused';emit();
 },
 resume(){
  if(mode!=='paused'||!active)return;
  cycleStart=performance.now()-pausedElapsed;timer=setInterval(tick,FRAME);mode='playing';tick();emit();
 },
 stopNoise(){stopTimer();clearLayers();if(mode!=='idle'){mode='idle';emit();}},
 // 動かないノイズを1枚だけ表示する（確認用・動く効果を省くときの静止表示）
 drawStill(){
  if(!active||level==='none')return false;
  stopTimer();drawFrame(0.3);mode='still';emit();return true;
 },
 isGrainRunning(){return mode==='playing';}
};
window.Dream=Dream;
})();
