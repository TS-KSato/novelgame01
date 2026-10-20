'use strict';
// CGの確認ページ。ゲームの進行・セーブには触れない（localStorage を使わず、表示は URL の指定だけで決める）。
// 表示は本編と同じ規則（cgFor）で決まる。文章は割り当て先の実際の本文。
// URL: ?cg=<名前>&scene=<場面>&line=<行>&ui=1（ui=0 で文章欄だけを隠す。画像の位置と大きさは変わらない）
const $=id=>document.getElementById(id);
const p=new URLSearchParams(location.search);
const names=Object.keys(CGS);
const startOf=name=>{
 for(const scene of Object.keys(CG_SEGMENTS))for(const [from,,n] of cgRanges(scene))if(n===name)return {scene,line:from};
 const t=TRIP_UNLOCKS.find(u=>u.cg===name);
 if(t)return {scene:t.scene,line:PAGE_IDS[t.scene].indexOf(t.id)};
 return null;
};
let cgSel=CGS[p.get('cg')]?p.get('cg'):names[0];
let sceneId=STORY[p.get('scene')]?p.get('scene'):startOf(cgSel).scene;
let lines=STORY[sceneId].lines;
let line=Number(p.get('line'));
if(!Number.isInteger(line)||line<0||line>=lines.length)line=p.get('scene')?0:startOf(cgSel).line;
let ui=p.get('ui')!=='0';
for(const n of names){
 const o=document.createElement('option');
 const s=startOf(n);
 o.value=n;
 o.textContent=n+'（'+s.scene+' '+(PAGE_IDS[s.scene][s.line]||'')+'〜）';
 $('cgSel').append(o);
}
$('cgSel').onchange=()=>{
 cgSel=$('cgSel').value;
 const s=startOf(cgSel);
 sceneId=s.scene;lines=STORY[sceneId].lines;line=s.line;
 render();
};
function render(){
 const [speaker,text]=lines[line];
 const cgNow=cgFor(sceneId,line);
 const id=PAGE_IDS[sceneId][line]||'';
 $('cgSel').value=cgNow||cgSel;
 $('speaker').textContent=speaker||'';
 $('prose').textContent=text;
 $('label').textContent=sceneId+' '+id;
 $('app').classList.toggle('cg-only',!ui);
 $('ui').setAttribute('aria-pressed',String(ui));
 $('ui').textContent=ui?'文章欄を隠す（画像のみ）':'文章欄を表示';
 $('info').textContent=(cgNow?'CG: '+cgNow:'この行はCGの範囲外（通常背景）')+'　'+id;
 const q=new URLSearchParams({cg:cgNow||cgSel,scene:sceneId,line:String(line),ui:ui?'1':'0'});
 history.replaceState(null,'','?'+q.toString());
 applyCG(cgNow);
}
$('ui').onclick=()=>{ui=!ui;render();};
$('prev').onclick=()=>{if(line>0){line--;render();}};
$('next').onclick=()=>{if(line<lines.length-1){line++;render();}};
$('dialogue').onclick=$('next').onclick;
render();
