// fx-build: fx-diag-1
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
 const app=$('app'),prose=$('prose'),panel=$('fxPanel'),openBtn=$('fxOpen'),root=app;
 let typeTimer=null,loopOn=false,serve=null;

 Dream.init(app);
 const host=$('portraits');createPortraitLayer(host);renderPortraits(host,[{char:'riene',expr:'normal',slot:'solo'}],'');
 prose.textContent=SAMPLE;

 // ---- 版の確認 ----
 const expectedJs=document.body.dataset.expectedJs||'';
 const htmlVersion=document.body.dataset.htmlVersion||'';
 function bootOk(){
  const b=$('fxBoot');b.textContent='演出JS起動: 実装版 '+Dream.BUILD;b.classList.add('ok');
  const v=$('fxVer');
  if(Dream.BUILD!==expectedJs||Dream.BUILD!==htmlVersion){
   v.textContent='版が一致していません（HTML期待版 '+expectedJs+' / JS実装版 '+Dream.BUILD+'）';v.classList.add('ng');
  }else{
   v.textContent='版: HTML '+htmlVersion+' ・ JS '+Dream.BUILD+'（一致）';v.classList.remove('ng');
  }
 }
 // 配信内容を no-store で取り直し、版の印を読む（ページURLの ?v= だけでは保証されない）
 async function checkServed(){
  const files=[['effects-preview.html','html'],['effects.js','js'],['effects.css','css'],['effects-preview.js','pjs'],['effects-preview.css','pcss'],['portraits.js','plain'],['portraits.css','plain'],['style.css','plain']];
  const out={};
  for(const [f,kind] of files){
   try{
    const r=await fetch(f+'?check='+Date.now(),{cache:'no-store'});
    const t=r.ok?await r.text():'';
    let mark='';
    if(kind==='html'){const m=t.match(/data-expected-js="([^"]+)"/);mark=m?m[1]:'印なし';}
    if(kind==='js'){const m=t.match(/const BUILD='([^']+)'/);mark=m?m[1]:'印なし';}
    if(kind==='css'){const m=t.match(/--fx-build:"([^"]+)"/);mark=m?m[1]:'印なし';}
    if(kind==='pjs'){const m=t.match(/fx-build: ([\w-]+)/);mark=m?m[1]:'印なし';}
    if(kind==='pcss'){const m=t.match(/(fx-diag-\d+)/);mark=m?m[1]:'印なし';}
    out[f]={status:r.status,mark:kind==='plain'?'（印なし・配信確認のみ）':mark};
   }catch(e){out[f]={status:'取得失敗',mark:String(e&&e.message||e)};}
  }
  serve=out;renderDiag();
 }
 function loadedCssBuild(){
  const v=getComputedStyle(root).getPropertyValue('--fx-build').trim().replace(/^"|"$/g,'');
  return v||'読めません';
 }
 function resourceSummary(){
  const names=['effects.js','effects.css','effects-preview.js','effects-preview.css','portraits.js'];
  const list=performance.getEntriesByType('resource');
  return names.map(n=>{
   const e=list.filter(x=>x.name.includes('/'+n)).pop();
   if(!e)return n+': 記録なし';
   const cached=e.transferSize===0&&e.decodedBodySize>0;
   return n+': '+(cached?'キャッシュから':'通信で取得')+'（'+e.transferSize+'B）';
  }).join('\n');
 }

 // ---- 状態表示（パネル外） ----
 const MODE_TEXT={idle:'停止中',playing:'再生中',paused:'一時停止中',still:'静止ノイズ表示中',solid:'単色テスト表示中',diagstill:'静止ノイズ（診断）表示中'};
 function row(label,value){return '<dt>'+label+'</dt><dd>'+value+'</dd>';}
 function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
 function renderDiag(){
  const d=Dream.diagnostics();
  const sv=serve||{};
  const svJs=sv['effects.js']?sv['effects.js'].mark:'確認中';
  const svHtml=sv['effects-preview.html']?sv['effects-preview.html'].mark:'確認中';
  const svCss=sv['effects.css']?sv['effects.css'].mark:'確認中';
  const cssBuild=loadedCssBuild();
  const parts=[
   row('演出JS 実装版',esc(Dream.BUILD)),
   row('HTML 期待版',esc(expectedJs)+' ／ 読込HTML '+esc(htmlVersion)),
   row('配信版（no-store取得）','HTML '+esc(svHtml)+' ／ JS '+esc(svJs)+' ／ CSS '+esc(svCss)),
   row('CSS 読込版（computed）',esc(cssBuild)),
   row('版の判定',(Dream.BUILD===expectedJs&&svJs===Dream.BUILD&&svHtml===expectedJs)?'一致':'<b>不一致あり（配信・読込を確認）</b>'),
   row('モード',esc(MODE_TEXT[d.mode]||d.mode)+' ／ 強さ '+esc(d.level)+' ／ 有効 '+d.active+' ／ 診断抑止 '+d.suppressed),
   row('Canvas 内部寸法',d.canvasInternal?d.canvasInternal.join('×')+'（1粒 '+d.cellCss+'px）':'取得できません'),
   row('Canvas 画面上の矩形',d.canvasRect?d.canvasRect.join(', '):'-'),
   row('2D コンテキスト',d.ctxOk===null?'未取得':(d.ctxOk?'取得成功':'<b>取得失敗</b>')),
   row('最後の描画 ／ 回数',esc(d.lastDraw)+' ／ '+d.drawCount),
   row('描画エラー',d.lastError==='なし'?'なし':'<b>'+esc(d.lastError)+'</b>'),
   row('prefers-reduced-motion',d.reduced?'有効（動く効果は自動で省略）':'無効'),
   row('Canvas の表示値',('opacity '+d.canvasOpacity+' ／ visibility '+d.canvasVisibility+' ／ display '+d.canvasDisplay+' ／ 合成 '+d.canvasBlend)),
   row('表示層',('z '+d.layerZ+' ／ overflow '+d.layerOverflow+' ／ pointer-events '+d.layerPointer+' ／ 矩形 '+(d.layerRect||[]).join(', '))),
   row('親（#app）',('overflow '+d.appOverflow+' ／ position '+d.appPosition)),
   row('中心点で上にある要素',esc(d.hitTop)),
   row('静的効果のクラス',d.staticClass?'あり':'なし'),
   row('読込リソース',esc(resourceSummary()).replace(/\n/g,'<br>'))
  ];
  $('dgStatus').innerHTML=parts.join('');
 }

 function syncUrl(){
  const u=new URL(location.href);
  u.searchParams.set('v','fx-diag-1');
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
 function syncState(){
  const s=Dream.state();
  const label=loopOn&&s.mode==='playing'?'連続プレビュー中':(s.mode==='paused'&&loopOn?'一時停止中（連続プレビュー）':(MODE_TEXT[s.mode]||s.mode));
  $('fxState').textContent='状態：'+label+(s.level==='none'?'（効果なし）':'');
  $('fxLoop').setAttribute('aria-pressed',String(loopOn));
  $('fxLoop').textContent=loopOn?'連続プレビューを止める':'連続プレビュー';
  $('fxPause').disabled=!(s.mode==='playing'||s.mode==='paused');
  $('fxPause').textContent=s.mode==='paused'?'再開':'一時停止';
  $('fxPause').setAttribute('aria-pressed',String(s.mode==='paused'));
  $('fxStill').disabled=!s.active||s.level==='none';
  renderDiag();
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
 // 診断（確認用限定）。単色・静止ノイズは操作するまで残る。タイマーは使わない。
 function diagSolid(){cancelTyping();loopOn=false;Dream.solid();prose.textContent=SAMPLE;syncState();}
 function diagStill(){cancelTyping();loopOn=false;Dream.coarseStill();prose.textContent=SAMPLE;syncState();}
 function diagClear(){cancelTyping();loopOn=false;Dream.clearAll();prose.textContent=SAMPLE;syncState();}

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
 $('dgSolid').addEventListener('click',diagSolid);
 $('dgStill').addEventListener('click',diagStill);
 $('dgClear').addEventListener('click',diagClear);
 $('dgToggle').addEventListener('click',()=>{const dock=$('fxDock');const c=dock.classList.toggle('fx-collapsed');$('dgToggle').textContent=c?'状態を開く':'状態を閉じる';$('dgToggle').setAttribute('aria-expanded',String(!c));});
 openBtn.addEventListener('click',()=>{panel.hidden=false;document.body.classList.add('panel-open');openBtn.setAttribute('aria-expanded','true');});
 $('fxClose').addEventListener('click',()=>{panel.hidden=true;document.body.classList.remove('panel-open');openBtn.setAttribute('aria-expanded','false');});
 Dream.setLevel(state.level);
 Dream.setStatic(true);
 Dream.onReduceChange(syncReduce);
 bootOk();
 syncReduce();syncButtons();syncUrl();syncState();
 checkServed();
 // 状態表示の更新（描画は行わない）。タイマーは1本だけ。
 setInterval(renderDiag,500);
 window.fxPreview={play,continuous,pauseToggle,still,stop,diagSolid,diagStill,diagClear,setLevel:n=>{$('fxLevels').querySelector('[data-level='+n+']').click();},state:()=>({...state,...Dream.state(),loop:loopOn,typing:typeTimer!==null})};
})();
