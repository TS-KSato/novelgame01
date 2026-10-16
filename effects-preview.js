'use strict';
// 演出の比較ページ。本編の進行・セーブ・既読・結末には触れない（localStorage を使わない）。
(function(){
 const SAMPLE='確認用のサンプル文です。効果の見え方を比べるための文章で、本編の台詞ではありません。';
 const TYPE_MS=40;
 const q=new URLSearchParams(location.search);
 const LEVELS=['none','weak','mid','strong'];
 const state={level:LEVELS.includes(q.get('level'))?q.get('level'):'mid',bg:['dark','light'].includes(q.get('bg'))?q.get('bg'):'dark',timing:'now'};
 const $=id=>document.getElementById(id);
 const app=$('app'),prose=$('prose'),panel=$('fxPanel'),openBtn=$('fxOpen');
 let typeTimer=null;

 Dream.init(app);
 const host=$('portraits');createPortraitLayer(host);renderPortraits(host,[{char:'riene',expr:'normal',slot:'solo'}],'');
 prose.textContent=SAMPLE;

 function syncUrl(){
  const u=new URL(location.href);u.searchParams.set('level',state.level);u.searchParams.set('bg',state.bg);
  history.replaceState(null,'',u.pathname+u.search);
  $('fxUrl').value=u.href;
 }
 function syncButtons(){
  document.querySelectorAll('#fxLevels button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===state.level)));
  document.querySelectorAll('#fxBg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bg===state.bg)));
  document.querySelectorAll('#fxTiming button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.timing===state.timing)));
  app.dataset.bg=state.bg;
 }
 function syncReduce(){
  const reduced=Dream.reduced();
  const grain=$('fxGrain');
  grain.disabled=reduced;
  if(reduced)grain.checked=false;
  $('fxReduceNote').hidden=!reduced;
  $('fxNotice').hidden=!reduced;
  Dream.setGrain(grain.checked);
 }
 function cancelTyping(){clearInterval(typeTimer);typeTimer=null;}
 // 再生。再生中の再操作は、前の文字送りと粒状ノイズを止めてから始め直す（重複させない）。
 function play(){
  cancelTyping();Dream.stopGrain();
  Dream.activate();
  if(state.timing==='now'){
   prose.textContent=SAMPLE;
   Dream.fireGrain();
  }else{
   prose.textContent='';
   const chars=Array.from(SAMPLE);let i=0;
   typeTimer=setInterval(()=>{
    prose.textContent=chars.slice(0,++i).join('');
    if(i>=chars.length){cancelTyping();Dream.fireGrain();}
   },TYPE_MS);
  }
 }
 function stop(){
  cancelTyping();Dream.deactivate();prose.textContent=SAMPLE;
 }
 function setLevel(name){
  state.level=name;Dream.setLevel(name);syncButtons();syncUrl();
 }
 document.querySelectorAll('#fxLevels button').forEach(b=>b.addEventListener('click',()=>setLevel(b.dataset.level)));
 document.querySelectorAll('#fxBg button').forEach(b=>b.addEventListener('click',()=>{state.bg=b.dataset.bg;syncButtons();syncUrl();}));
 document.querySelectorAll('#fxTiming button').forEach(b=>b.addEventListener('click',()=>{state.timing=b.dataset.timing;syncButtons();}));
 $('fxStatic').addEventListener('change',e=>Dream.setStatic(e.target.checked));
 $('fxGrain').addEventListener('change',e=>{Dream.setGrain(e.target.checked);if(!e.target.checked)Dream.stopGrain();});
 $('fxPlay').addEventListener('click',play);
 $('fxStop').addEventListener('click',stop);
 openBtn.addEventListener('click',()=>{panel.hidden=false;document.body.classList.add('panel-open');openBtn.setAttribute('aria-expanded','true');openBtn.hidden=true;});
 $('fxClose').addEventListener('click',()=>{panel.hidden=true;document.body.classList.remove('panel-open');openBtn.setAttribute('aria-expanded','false');openBtn.hidden=false;});
 Dream.onReduceChange(syncReduce);
 Dream.setLevel(state.level);Dream.setStatic(true);
 syncReduce();syncButtons();syncUrl();
 // expose the controls for the checks in this session (no game state involved)
 window.fxPreview={play,stop,setLevel,state:()=>({...state,active:Dream.isActive(),grainRunning:Dream.isGrainRunning(),typing:typeTimer!==null})};
})();
