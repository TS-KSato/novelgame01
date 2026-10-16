'use strict';
// 演出層（画像とは独立）。本編と確認ページで共通に使う。タイマーは持たず、呼び出し側が
// activate / fireGrain / stopGrain / deactivate で明示的に制御する。CSS 変数と class だけを操作する。
(function(){
const LEVELS={
 none:{label:'効果なし',vig:0,blurBg:0,blurFg:0,grain:0,dur:1},
 weak:{label:'弱',vig:.28,blurBg:.5,blurFg:.3,grain:.14,dur:1},
 mid:{label:'中',vig:.5,blurBg:1.2,blurFg:.8,grain:.3,dur:1},
 strong:{label:'強',vig:.7,blurBg:2.2,blurFg:1.6,grain:.46,dur:1.1}
};
const DEFAULT='mid';
const motionQuery=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
let root=null,grain=null,level=DEFAULT,staticOn=true,grainOn=true,active=false;
const Dream={
 LEVELS,DEFAULT,
 init(rootEl){root=rootEl;grain=root.querySelector('.fx-grain');this.setLevel(DEFAULT);},
 reduced(){return !!(motionQuery&&motionQuery.matches);},
 onReduceChange(fn){if(motionQuery)motionQuery.addEventListener('change',()=>fn(Dream.reduced()));},
 level(){return level;},
 setLevel(name){
  if(!Object.prototype.hasOwnProperty.call(LEVELS,name))name=DEFAULT;
  level=name;const L=LEVELS[name];
  root.style.setProperty('--fx-vig',L.vig);
  root.style.setProperty('--fx-blur-bg',L.blurBg+'px');
  root.style.setProperty('--fx-blur-fg',L.blurFg+'px');
  root.style.setProperty('--fx-grain-op',L.grain);
  root.style.setProperty('--fx-grain-dur',L.dur+'s');
  this.stopGrain();this.applyStatic();return name;
 },
 setStatic(on){staticOn=!!on;this.applyStatic();},
 setGrain(on){grainOn=!!on;if(!grainOn)this.stopGrain();},
 applyStatic(){root.classList.toggle('fx-static',active&&staticOn&&level!=='none');},
 grainAvailable(){return grainOn&&level!=='none'&&!this.reduced();},
 activate(){active=true;this.applyStatic();},
 // 粒状ノイズを1回だけ出す。再生中に呼ばれても、アニメーションを作り直すだけで重ならない。
 fireGrain(){
  if(!active||!this.grainAvailable()||!grain)return false;
  grain.classList.remove('fx-run');void grain.offsetWidth;
  grain.onanimationend=()=>{grain.classList.remove('fx-run');grain.onanimationend=null;};
  grain.classList.add('fx-run');return true;
 },
 stopGrain(){if(!grain)return;grain.onanimationend=null;grain.classList.remove('fx-run');},
 deactivate(){active=false;this.stopGrain();this.applyStatic();},
 isGrainRunning(){return !!grain&&grain.classList.contains('fx-run');},
 isActive(){return active;}
};
window.Dream=Dream;
})();
