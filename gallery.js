'use strict';
// CG鑑賞。解放状況はセーブ枠とは別のキー（zelg-gallery-v1）に、解放済みの名前だけを保存する。
// 解放は本編で該当の行に到達したときだけ行う。画像の先読み・プレビュー・鑑賞画面の表示では解放しない。
const GALLERY_KEY='zelg-gallery-v1';
function galleryRead(){
 try{
  const p=JSON.parse(localStorage.getItem(GALLERY_KEY));
  if(p&&p.v===1&&p.unlocked&&typeof p.unlocked==='object'){
   const out={};
   for(const k of Object.keys(p.unlocked))if(CGS[k]&&p.unlocked[k]===true)out[k]=true;
   return out;
  }
 }catch{}
 return {};
}
let galleryUnlocked=galleryRead();
function galleryCount(){return Object.keys(galleryUnlocked).length;}
function galleryUnlock(name){
 if(!CGS[name]||galleryUnlocked[name])return;
 galleryUnlocked[name]=true;
 try{localStorage.setItem(GALLERY_KEY,JSON.stringify({v:1,unlocked:galleryUnlocked}));}catch{}
 updateCGCount();
}
// 本編で行に到達したときに呼ぶ。表示区間のCGと、その行で開く「旅のひとこま」を解放する。
function galleryReachLine(scene,index){
 const name=cgFor(scene,index);
 if(name)galleryUnlock(name);
 const ids=PAGE_IDS[scene]||[];
 for(const t of TRIP_UNLOCKS){
  if(t.scene!==scene)continue;
  const from=ids.indexOf(t.id),to=t.to?ids.indexOf(t.to):from;
  if(from>=0&&index>=from&&index<=to)galleryUnlock(t.cg);
 }
}
// 既存の記録から、到達が確実なものだけを解放する（何度呼んでも結果は同じ。データは書き換えない）。
// 既読履歴（場面:行番号）、完了した結末、各セーブの現在位置を見る。
function galleryScan(p){
 for(const e of p.seen||[]){
  const s=String(e),i=s.lastIndexOf(':');
  const scene=s.slice(0,i),idx=Number(s.slice(i+1));
  if(STORY[scene]&&Number.isInteger(idx)&&idx>=0&&idx<STORY[scene].lines.length)galleryReachLine(scene,idx);
 }
 for(const id of p.ends||[]){
  const scene=END_SCENE[id];
  if(scene)for(const [,,name] of cgRanges(scene))galleryUnlock(name);
 }
 for(const holder of [p.auto,...(p.slots||[])]){
  const s=holder?.state;
  if(s&&STORY[s.node]&&Number.isInteger(s.line)&&s.line>=0&&s.line<STORY[s.node].lines.length)galleryReachLine(s.node,s.line);
 }
}
function updateCGCount(){
 const el=document.getElementById('cgCount');
 if(el)el.textContent=galleryCount()+' / '+GALLERY_ORDER.length;
}

// ---- 画面 ----
let cgTab='story',cgFromGame=false,cgSaved=null;
const LOCK_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
function galleryOpen(){return !document.getElementById('cgList').hidden||!document.getElementById('cgView').hidden;}
function openGallery(fromGame){
 if(galleryOpen())return;
 cgFromGame=!!fromGame;
 cgSaved=cgFromGame?pauseForGallery():null;
 renderGallery();
 document.getElementById('cgList').hidden=false;
}
function closeGallery(){
 document.getElementById('cgView').hidden=true;
 document.getElementById('cgList').hidden=true;
 const saved=cgSaved,back=cgFromGame;
 cgSaved=null;cgFromGame=false;
 if(back&&saved)resumeAfterGallery(saved);
}
function renderGallery(){
 const grid=document.getElementById('cgGrid');
 grid.replaceChildren();
 const tabs=document.querySelectorAll('#cgTabs button');
 tabs.forEach(b=>{
  const group=b.dataset.tab;
  const all=GALLERY_ORDER.filter(n=>CGS[n].group===group);
  const got=all.filter(n=>galleryUnlocked[n]).length;
  b.setAttribute('aria-pressed',String(b.dataset.tab===cgTab));
  b.querySelector('small').textContent=got+' / '+all.length;
 });
 for(const name of GALLERY_ORDER.filter(n=>CGS[n].group===cgTab)){
  const def=CGS[name];
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='cg-card';
  if(galleryUnlocked[name]){
   const img=new Image();
   img.loading='lazy';
   img.alt='';
   img.src=def.src;
   img.onerror=()=>btn.classList.add('broken');
   const label=document.createElement('span');
   label.className='cg-name';
   label.textContent=def.title;
   btn.setAttribute('aria-label',def.title);
   btn.append(img,label);
   btn.onclick=()=>openViewer(name);
  }else{
   btn.disabled=true;
   btn.classList.add('locked');
   btn.setAttribute('aria-label','未解放');
   btn.innerHTML=LOCK_SVG;
  }
  grid.append(btn);
 }
}
function openViewer(name){
 const def=CGS[name];
 const img=document.getElementById('cgImg');
 const msg=document.getElementById('cgMsg');
 msg.textContent='';
 img.onerror=()=>{msg.textContent='画像を読み込めませんでした';};
 img.alt=def.alt;
 img.src=def.src;
 document.getElementById('cgTitle').textContent=def.title;
 document.getElementById('cgView').classList.remove('bars-hidden');
 document.getElementById('cgView').hidden=false;
}
function closeViewer(){
 document.getElementById('cgView').hidden=true;
 document.getElementById('cgImg').removeAttribute('src');
}
function initGallery(){
 document.getElementById('cgOpen').onclick=()=>openGallery(false);
 document.getElementById('cgCloseList').onclick=closeGallery;
 document.getElementById('cgCloseView').onclick=closeGallery;
 document.getElementById('cgBack').onclick=closeViewer;
 document.querySelectorAll('#cgTabs button').forEach(b=>b.onclick=()=>{cgTab=b.dataset.tab;renderGallery();});
 // 鑑賞画面の画像をタップすると、題名と操作を隠す・再表示する。
 document.getElementById('cgView').addEventListener('click',e=>{
  if(e.target.closest('button'))return;
  document.getElementById('cgView').classList.toggle('bars-hidden');
 });
 updateCGCount();
}
