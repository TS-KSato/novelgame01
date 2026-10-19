'use strict';
// CGの確認ページ。ゲームの進行・セーブには触れない（localStorage を使わず、表示は URL の指定だけで決める）。
// URL: ?cg=riene_first_aid&scene=rescue&line=37&ui=1（ui=0 で文章欄と操作を隠し、画像だけを表示）
const $=id=>document.getElementById(id);
const p=new URLSearchParams(location.search);
const sceneId=STORY[p.get('scene')]?p.get('scene'):'rescue';
const lines=STORY[sceneId].lines;
let line=Number(p.get('line'));
if(!Number.isInteger(line)||line<0||line>=lines.length)line=(CG_SEGMENTS[sceneId]||[[0]])[0][0];
const cgName=CGS[p.get('cg')]?p.get('cg'):(cgFor(sceneId,line)||Object.keys(CGS)[0]);
let ui=p.get('ui')!=='0';
function render(){
 const [speaker,text]=lines[line];
 $('speaker').textContent=speaker||'';
 $('prose').textContent=text;
 $('label').textContent=sceneId+' '+(PAGE_IDS[sceneId][line]||'');
 $('app').classList.toggle('cg-only',!ui);
 $('ui').setAttribute('aria-pressed',String(ui));
 $('ui').textContent=ui?'文章欄を隠す（画像のみ）':'文章欄を表示';
 $('info').textContent='CG: '+cgName+'　'+(PAGE_IDS[sceneId][line]||'');
 const q=new URLSearchParams({cg:cgName,scene:sceneId,line:String(line),ui:ui?'1':'0'});
 history.replaceState(null,'','?'+q.toString());
 applyCG(cgName);
}
$('ui').onclick=()=>{ui=!ui;render();};
$('dialogue').onclick=()=>{if(line<lines.length-1){line++;render();}};
render();
