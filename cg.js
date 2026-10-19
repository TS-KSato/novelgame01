'use strict';
// イベントCGの定義と表示範囲。背景（backgrounds.js）とは独立しており、CG表示中は立ち絵を隠す（stage.js の指定は変えない）。
// 指定は場面ID→[開始行, 終了行, CG名]（行は STORY の lines の添字・両端を含む）。
// 表示は通常背景と同じ画面全体（style.css の .cg：cover）。文章欄と操作UIはその上に重なる。
const CGS={
  riene_first_aid:{src:'assets/cg/riene_first_aid.webp?v=1',alt:'傷を支えるリーネ'},
};
const CG_SEGMENTS={
  rescue:[[37,39,'riene_first_aid']],
};
function cgFor(scene,index){
 const segs=CG_SEGMENTS[scene];
 if(!segs)return null;
 for(const [from,to,name] of segs)if(index>=from&&index<=to)return name;
 return null;
}
// 画像を読み終えてから表示する。読み込みに失敗したら CG は出さず、通常の背景と立ち絵のままにする（文章送りは止めない）。
let cgToken=0;
function applyCG(name){
 const el=document.getElementById('cg');
 const img=el.querySelector('img');
 const token=++cgToken;
 const def=name&&CGS[name];
 if(!def){
  el.hidden=true;
  document.body.classList.remove('cg-on');
  img.removeAttribute('src');
  return;
 }
 const pre=new Image();
 pre.onload=()=>{
  if(token!==cgToken)return;
  img.src=def.src;
  img.alt=def.alt;
  el.hidden=false;
  document.body.classList.add('cg-on');
 };
 pre.onerror=()=>{
  if(token!==cgToken)return;
  el.hidden=true;
  document.body.classList.remove('cg-on');
 };
 pre.src=def.src;
}
