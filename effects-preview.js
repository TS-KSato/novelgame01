'use strict';
// 演出の比較ページ（確認用）。本編の進行・セーブ・既読・結末には触れない（localStorage を使わない）。
(function(){
 const SAMPLE='確認用のサンプル文です。効果の見え方を比べるための文章で、本編の台詞ではありません。';
 const TYPE_MS=40;
 const LEVELS=['none','weak','mid','strong'],BGS=['dark','light'],EFFECTS=['all','noise','static'];
 const q=new URLSearchParams(location.search);
 const pick=(v,list,def)=>list.includes(v)?v:def;
 const state={level:pick(q.get('level'),LEVELS,'mid'),bg:pick(q.get('bg'),BGS,'dark'),effect:pick(q.get('effect'),EFFECTS,'all'),timing:'now'};
 const $=id=>document.getElementById(id);
 const app=$('app'),prose=$('prose'),panel=$('fxPanel'),openBtn=$('fxOpen');
 let typeTimer=null,loopOn=false;

 Dream.init(app);
 const host=$('portraits');createPortraitLayer(host);renderPortraits(host,[{char:'riene',expr:'normal',slot:'solo'}],'');
 prose.textContent=SAMPLE;

 function syncUrl(){
  const u=new URL(location.href);
  u.searchParams.set('level',state.level);u.searchParams.set('bg',state.bg);u.searchParams.set('effect',state.effect);
  history.replaceState(null,'',u.pathname+u.search);
  $('fxUrl').value=u.href;
 }
 function syncButtons(){
  document.querySelectorAll('#fxLevels button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===state.level)));
  document.querySelectorAll('#fxBg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bg===state.bg)));
  document.querySelectorAll('#fxTiming button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.timing===state.timing)));
  app.dataset.bg=state.bg;
 }
 const MODE_TEXT={idle:'停止中',playing:'再生中',paused:'一時停止中',still:'静止ノイズ表示中'};
 function syncState(){
  const s=Dream.state();
  const label=loopOn&&s.mode==='playing'?'連続プレビュー中':(s.mode==='paused'&&loopOn?'一時停止中（連続プレビュー）':MODE_TEXT[s.mode]);
  $('fxState').textContent='状態：'+label+(s.level==='none'?'（効果なし）':'');
  $('fxLoop').setAttribute('aria-pressed',String(loopOn));
  $('fxLoop').textContent=loopOn?'連続プレビューを止める':'連続プレビュー';
  $('fxPause').disabled=!(s.mode==='playing'||s.mode==='paused');
  $('fxPause').textContent=s.mode==='paused'?'再開':'一時停止';
  $('fxPause').setAttribute('aria-pressed',String(s.mode==='paused'));
  $('fxStill').disabled=!s.active||s.level==='none';
 }
 app.addEventListener('fxstatechange',()=>{if(Dream.state().mode==='idle')loopOn=false;syncState();});
 function syncReduce(){
  const reduced=Dream.reduced();
  const grain=$('fxGrain');
  grain.disabled=reduced;
  if(reduced){grain.checked=false;}
  $('fxReduceNote').hidden=!reduced;
  $('fxNotice').hidden=!reduced;
  if(reduced)Dream.stopNoise();
  syncState();
 }
 function cancelTyping(){clearInterval(typeTimer);typeTimer=null;}
 // 再生。再生中の再操作は、前の文字送りと粒状ノイズを止めてから始め直す（重複させない）。
 function play(){
  cancelTyping();loopOn=false;Dream.stopNoise();
  Dream.activate();
  if(state.timing==='now'){
   prose.textContent=SAMPLE;
   Dream.fireOnce();
  }else{
   prose.textContent='';
   const chars=Array.from(SAMPLE);let i=0;
   typeTimer=setInterval(()=>{
    prose.textContent=chars.slice(0,++i).join('');
    if(i>=chars.length){cancelTyping();Dream.fireOnce();}
   },TYPE_MS);
  }
  syncState();
 }
 function continuous(){
  if(loopOn){loopOn=false;Dream.stopNoise();syncState();return;}
  cancelTyping();Dream.stopNoise();
  Dream.activate();loopOn=true;Dream.startLoop();syncState();
 }
 function pauseToggle(){
  const s=Dream.state();
  if(s.mode==='playing')Dream.pause();else if(s.mode==='paused')Dream.resume();
  syncState();
 }
 function still(){
  cancelTyping();loopOn=false;Dream.stopNoise();Dream.activate();Dream.drawStill();syncState();
 }
 function stop(){
  cancelTyping();loopOn=false;Dream.deactivate();prose.textContent=SAMPLE;syncState();
 }
 function applyEffect(){
  // 動くノイズだけ・静的効果だけを切り替える（URL の effect と同じ意味）
  const staticEl=$('fxStatic'),grainEl=$('fxGrain');
  staticEl.checked=state.effect!=='noise';
  grainEl.checked=state.effect!=='static'&&!Dream.reduced();
  Dream.setStatic(staticEl.checked);
  if(!grainEl.checked)Dream.stopNoise();
 }

 document.querySelectorAll('#fxLevels button').forEach(b=>b.addEventListener('click',()=>{state.level=b.dataset.level;loopOn=false;Dream.setLevel(state.level);Dream.setStatic($('fxStatic').checked);syncButtons();syncUrl();syncState();}));
 document.querySelectorAll('#fxBg button').forEach(b=>b.addEventListener('click',()=>{state.bg=b.dataset.bg;syncButtons();syncUrl();}));
 document.querySelectorAll('#fxTiming button').forEach(b=>b.addEventListener('click',()=>{state.timing=b.dataset.timing;syncButtons();}));
 $('fxStatic').addEventListener('change',e=>{Dream.setStatic(e.target.checked);syncState();});
 $('fxGrain').addEventListener('change',e=>{if(!e.target.checked){Dream.stopNoise();loopOn=false;}syncState();});
 $('fxColor').addEventListener('change',e=>Dream.setColorShift(e.target.checked));
 $('fxPlay').addEventListener('click',()=>{if($('fxGrain').checked)play();else{Dream.activate();cancelTyping();prose.textContent=SAMPLE;syncState();}});
 $('fxLoop').addEventListener('click',()=>{if($('fxGrain').checked)continuous();});
 $('fxPause').addEventListener('click',pauseToggle);
 $('fxStill').addEventListener('click',still);
 $('fxStop').addEventListener('click',stop);
 openBtn.addEventListener('click',()=>{panel.hidden=false;document.body.classList.add('panel-open');openBtn.setAttribute('aria-expanded','true');openBtn.hidden=true;});
 $('fxClose').addEventListener('click',()=>{panel.hidden=true;document.body.classList.remove('panel-open');openBtn.setAttribute('aria-expanded','false');openBtn.hidden=false;});
 $('fxColor').checked=false;
 Dream.setLevel(state.level);
 applyEffect();
 Dream.onReduceChange(syncReduce);
 syncReduce();syncButtons();syncUrl();syncState();
 window.fxPreview={play,continuous,pauseToggle,still,stop,setLevel:n=>{$('fxLevels').querySelector('[data-level='+n+']').click();},state:()=>({...state,...Dream.state(),loop:loopOn,typing:typeTimer!==null})};
})();
