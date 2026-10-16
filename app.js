'use strict';
// 序盤増補稿 v1（opening-v1）。旧版の序盤セーブを新しい行番号へ移す。対象は下の6場面だけ（旧行番号→新行番号）。
const OPENING_REV='opening-v1',OPENING_BACKUP_KEY='zelg-v1-backup-opening-v1';
const OPENING_SCENES={
  prologue:[0,3,4,6,8,9],
  alley:[0,2,24],
  rescue:[3,14,15,21,47],
  brother:[15,16,18,25,33],
  scholar:[0,4,36,37,58],
  arena:[7,25,47,57,90]
};
const $=s=>document.getElementById(s),KEY='zelg-v1';let persist={seen:[],ends:[],slots:[null,null,null],auto:null,settings:{speed:38,volume:.22}},st=null,typing=null,autoTimer=null,skipTimer=null,auto=false,skip=false,full='',chars=[],at=0,ctx=null,master=null,musicTimer=null,sound=false;
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&Array.isArray(p.seen)&&Array.isArray(p.ends)&&Array.isArray(p.slots))persist={...persist,...p,settings:{...persist.settings,...p.settings}};}catch{}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600);}
function write(){try{localStorage.setItem(KEY,JSON.stringify(persist));return true;}catch{toast('ブラウザ保存が使えません。セーブコードを書き出してください。');return false;}}
const clone=x=>JSON.parse(JSON.stringify(x));
function fresh(){return{contentRevision:OPENING_REV,node:'prologue',line:0,rel:{},fragments:[],flags:{},log:[],started:Date.now()};}
function valid(s){return s&&s.contentRevision===OPENING_REV&&Object.hasOwn(STORY,s.node)&&Number.isInteger(s.line)&&s.line>=0&&s.line<STORY[s.node].lines.length&&s.rel&&typeof s.rel==='object'&&Object.values(s.rel).every(x=>Number.isFinite(x)&&x>=0&&x<=100)&&s.flags&&typeof s.flags==='object'&&Array.isArray(s.fragments)&&s.fragments.every(f=>Object.hasOwn(FRAGMENTS,f))&&Array.isArray(s.log)&&s.log.length<=2000&&s.log.every(x=>Array.isArray(x)&&x.length===2&&x.every(v=>typeof v==='string'&&v.length<2000));}
// 旧版の序盤セーブの移行。revision のない state は、序盤6場面だけ行番号を対応表で移す。他の場面は行番号のまま版の印だけ付ける。
function isOpeningSeen(id){const i=String(id).lastIndexOf(':');return i>0&&Object.hasOwn(OPENING_SCENES,String(id).slice(0,i));}
function migrateSeen(seen){return (Array.isArray(seen)?seen:[]).filter(id=>typeof id!=='string'||!isOpeningSeen(id));}
function migrateState(s){
 if(!s||typeof s!=='object'||typeof s.node!=='string')return{ok:false,reason:'セーブの中身が読めません'};
 if(s.contentRevision===OPENING_REV)return{ok:true,state:s};
 if(s.contentRevision!==undefined)return{ok:false,reason:'未知の本文版（'+String(s.contentRevision).slice(0,20)+'）のセーブです'};
 let line=s.line;
 if(Object.hasOwn(OPENING_SCENES,s.node)){
  if(!Number.isInteger(line)||line<0||line>=OPENING_SCENES[s.node].length)return{ok:false,reason:'旧版の序盤の位置（'+s.node+'）を新しい本文へ移せません'};
  line=OPENING_SCENES[s.node][line];
 }
 const t={...clone(s),line,contentRevision:OPENING_REV};
 if(!valid(t))return{ok:false,reason:'移行後の位置が本文の範囲外です（'+s.node+'）'};
 return{ok:true,state:t};
}
function saveReason(s){if(!s)return'空のセーブ';if(valid(s))return null;return s.contentRevision!==undefined&&s.contentRevision!==OPENING_REV?'未知の本文版のセーブです':'旧版の位置を移せないセーブです';}
function migrateImport(p){
 if(!p||!p.state)return{ok:false,reason:'有効なセーブコードを入力してください。'};
 const old=p.state.contentRevision!==OPENING_REV;
 const m=migrateState(p.state);
 if(!m.ok)return{ok:false,reason:m.reason};
 return{ok:true,state:m.state,seen:old?migrateSeen(p.seen):p.seen};
}
// 起動時に一度だけ：旧データを専用キーへバックアップ（既にあれば上書きしない）してから、既読と各セーブを移す。データは削除しない。
function migrateStorage(){
 let raw=null;try{raw=localStorage.getItem(KEY);}catch{}
 const seenPending=persist.seenRev!==OPENING_REV;
 const pendingState=s=>s&&typeof s==='object'&&s.contentRevision!==OPENING_REV;
 const slotsPending=persist.slots.some(x=>pendingState(x?.state));
 if(!seenPending&&!pendingState(persist.auto?.state)&&!slotsPending)return;
 if(raw!==null){try{if(localStorage.getItem(OPENING_BACKUP_KEY)===null)localStorage.setItem(OPENING_BACKUP_KEY,raw);}catch{toast('バックアップを保存できないため、セーブの移行を中止しました。');return;}}
 if(seenPending){persist.seen=migrateSeen(persist.seen);persist.seenRev=OPENING_REV;}
 const failed=[];
 const move=(holder)=>{if(pendingState(holder.state)){const m=migrateState(holder.state);if(m.ok)holder.state=m.state;else failed.push(m.reason);}};
 if(persist.auto)move(persist.auto);
 persist.slots.forEach(x=>{if(x)move(x);});
 write();
 if(failed.length)toast('移せなかったセーブがあります（データは残しています）：'+failed[0]);
}
function archiveState(){if(!st)return null;return{state:clone(st),time:Date.now()};}
function checkpoint(){persist.auto=archiveState();write();}
function stopTimers(){clearInterval(typing);typing=null;clearTimeout(autoTimer);clearInterval(skipTimer);skipTimer=null;auto=false;skip=false;$('auto').classList.remove('active');$('skip').classList.remove('active');}
function title(){stopTimers();$('game').hidden=true;$('ending').hidden=true;$('title').hidden=false;document.body.classList.remove('playing');$('continue').disabled=!persist.auto?.state;$('end-count').textContent=persist.ends.length+' / 6';}
function start(s){stopTimers();st=clone(s);$('title').hidden=true;$('ending').hidden=true;$('game').hidden=false;document.body.classList.add('playing');render();}
function remember(){const id=st.node+':'+st.line;if(!persist.seen.includes(id))persist.seen.push(id);}
function complete(){clearInterval(typing);typing=null;at=chars.length;$('prose').textContent=full;remember();if(auto&&!(STORY[st.node].choices&&st.line===STORY[st.node].lines.length-1))autoTimer=setTimeout(next,Math.max(1800,full.length*75));}
function render(){clearInterval(typing);clearTimeout(autoTimer);$('choices').replaceChildren();const s=STORY[st.node],line=s.lines[st.line];updatePortraits(st.node,st.line,line[0]);$('chapterNo').textContent=s.ch;$('chapterName').textContent=s.title;$('sceneWord').textContent=s.ch==='PROLOGUE'?'何も、終わらない。':s.title;$('speaker').textContent=line[0]||'　';full=line[1];chars=Array.from(full);at=0;$('prose').textContent='';$('page').textContent=String(st.line+1).padStart(2,'0')+' / '+String(s.lines.length).padStart(2,'0');
if(!st.log.length||st.log.at(-1)[1]!==full)st.log.push(line);if(st.log.length>2000)st.log.shift();checkpoint();
if(persist.settings.speed===0||skip){complete();}else{typing=setInterval(()=>{$('prose').textContent=chars.slice(0,++at).join('');if(at>=chars.length)complete();},persist.settings.speed);}}
function next(){if($('modal').open||$('game').hidden||!st)return;if(typing){complete();return;}const s=STORY[st.node];if(st.line<s.lines.length-1){st.line++;render();return;}if(s.choices){if($('choices').childElementCount)return;clearTimeout(autoTimer);setPortraitChoice(true);s.choices.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c.text;const sm=document.createElement('small');sm.textContent=String(i+1).padStart(2,'0')+' →';b.append(sm);b.onclick=()=>{stopTimers();for(const[k,v]of Object.entries(c.rel))st.rel[k]=(st.rel[k]||0)+v;for(const f of c.fragments)if(!st.fragments.includes(f)){st.fragments.push(f);toast('記憶の断片を入手しました');}Object.assign(st.flags,c.flags);go(c.to);};$('choices').append(b);});return;}go(s.next);}
function go(id){if(id==='$resolve'){go('end_'+resolveEnding(st));return;}if(id.startsWith('$')){finish(id.slice(1));return;}st.node=id;st.line=0;render();}
function finish(id){stopTimers();if(!persist.ends.includes(id))persist.ends.push(id);write();$('game').hidden=true;$('ending').hidden=false;const e=ENDINGS[id];$('ending').innerHTML='<div><div class="eyebrow">ENDING '+e.no+' / VI</div><div class="muted">'+e.label+'</div><h2>'+e.name+'</h2><p>'+e.desc+'</p><p class="muted">'+e.hint+'</p><button class="btn" id="again">もう一度、旅をする</button><button class="btn" id="endHome">タイトルへ</button></div>';$('again').onclick=()=>start(fresh());$('endHome').onclick=title;}
function modal(name,content){stopTimers();$('modalTitle').textContent=name;$('modalBody').replaceChildren();if(typeof content==='string')$('modalBody').innerHTML=content;else $('modalBody').append(content);$('modal').showModal();}
function relationships(){return Object.entries(CAST).map(([k,v])=>'<div class="row"><span>'+v+'</span><span class="meter"><i style="width:'+Math.min(100,(st?.rel[k]||0)*20)+'%"></i></span></div>').join('');}
function memories(){modal('記憶の断片','<p class="muted">旅で集めた、人が確かに生きていた証。 '+(st?.fragments.length||0)+' / 5</p>'+Object.entries(FRAGMENTS).map(([id,f])=>st?.fragments.includes(id)?'<div class="line"><span class="badge">◇</span>'+f[0]+'<p class="muted">'+f[1]+'</p></div>':'<div class="line muted">◇　まだ見つかっていない記憶</div>').join('')+'<h3>旅で結んだ関係</h3>'+relationships());}
function collection(){modal('記憶の書庫','<p class="muted">辿り着いた結末 '+persist.ends.length+' / 6　未到達の結末は伏せられています。</p>'+Object.entries(ENDINGS).map(([id,e])=>persist.ends.includes(id)?'<div class="line"><span class="badge">'+e.no+'</span>'+e.name+'<p class="muted">'+e.hint+'</p></div>':'<div class="line muted"><span class="badge">'+e.no+'</span>封じられた記憶</div>').join(''));}
function saves(){modal('設定・セーブ','<div class="row"><label for="speed">文字の速さ</label><input id="speed" type="range" min="0" max="75" value="'+(75-persist.settings.speed)+'"><span>速い →</span></div><div class="row"><label for="volume">環境音の音量</label><input id="volume" type="range" min="0" max="50" value="'+persist.settings.volume*100+'"></div><p class="muted">進行は自動保存されます。手動スロットは各ボタンで保存・復元できます。</p><div id="slots"></div><h3>セーブコードで端末間の引き継ぎ</h3><textarea id="code" aria-label="セーブコード" placeholder="書き出したコードを、ここへ貼り付けて復元できます"></textarea><div class="row"><button class="btn" id="export">コードを書き出す</button><button class="btn" id="import">コードから復元</button></div><p class="muted">短編版・全6結末。横向きで、文章をタップして進みます。端末のブラウザごとに保存されます。</p>');
$('speed').oninput=e=>{persist.settings.speed=75-Number(e.target.value);write();};$('volume').oninput=e=>{persist.settings.volume=Number(e.target.value)/100;if(master)master.gain.setTargetAtTime(sound?persist.settings.volume:0,ctx.currentTime,.1);write();};slotUI();
$('export').onclick=()=>{const state=st||persist.auto?.state;if(!valid(state)){toast('まず物語をはじめてください');return;}const data={v:1,state,ends:persist.ends,seen:persist.seen};$('code').value='ZELG1.'+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))));$('code').select();toast('コードを選択しました。コピーして保管してください。');};
$('import').onclick=()=>{try{const code=$('code').value.trim();if(!code.startsWith('ZELG1.')||code.length>1000000)throw Error();const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.slice(6)),c=>c.charCodeAt(0))));if(p.v!==1)throw Error();const mig=migrateImport(p);if(!mig.ok){toast(mig.reason);return;}p.state=mig.state;p.seen=mig.seen;if(!valid(p.state)||!Array.isArray(p.ends)||!p.ends.every(e=>Object.hasOwn(ENDINGS,e))||!Array.isArray(p.seen)||!p.seen.every(x=>typeof x==='string'&&x.length<100))throw Error();persist.ends=[...new Set([...persist.ends,...p.ends])];persist.seen=[...new Set([...persist.seen,...p.seen])];$('modal').close();start(p.state);toast('セーブコードを復元しました');}catch{toast('有効なセーブコードを入力してください。');}};}
function slotUI(){$('slots').innerHTML='';persist.slots.slice(0,3).forEach((slot,i)=>{const row=document.createElement('div');row.className='row';const label=document.createElement('span');label.textContent='0'+(i+1)+'　'+(valid(slot?.state)?STORY[slot.state.node].title+' · '+new Date(slot.time).toLocaleString('ja-JP'):(slot?.state?'読めないセーブ：'+saveReason(slot.state):'空のスロット'));const buttons=document.createElement('span'),save=document.createElement('button'),load=document.createElement('button');save.className=load.className='btn';save.textContent='保存';load.textContent='読込';save.disabled=!st;load.disabled=!valid(slot?.state);save.onclick=()=>{if(slot&&!confirm('このスロットを上書きしますか？'))return;persist.slots[i]=archiveState();write();slotUI();toast('保存しました');};load.onclick=()=>{if(st&&!confirm('現在の進行を、このセーブの状態へ戻しますか？'))return;$('modal').close();start(slot.state);};buttons.append(save,load);row.append(label,buttons);$('slots').append(row);});}
function audio(){try{if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.connect(ctx.destination);master.gain.value=0;}ctx.resume();sound=!sound;master.gain.setTargetAtTime(sound?persist.settings.volume:0,ctx.currentTime,.4);if(!musicTimer){let i=0;const notes=[130.81,196,261.63,155.56,233.08,196,146.83,220];const play=()=>{if(!sound)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=notes[i++%notes.length];o.connect(g);g.connect(master);const t=ctx.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+1);g.gain.exponentialRampToValueAtTime(.001,t+5);o.start(t);o.stop(t+5);};play();musicTimer=setInterval(play,2800);}$('sound').innerHTML='♪ <span>音 '+(sound?'ON':'OFF')+'</span>';}catch{toast('このブラウザでは音を再生できません');}}
$('new').onclick=()=>{if(persist.auto&& !confirm('新しい旅を始めます。自動セーブは更新されます。よろしいですか？'))return;if(!sound)audio();start(fresh());};$('continue').onclick=()=>{if(valid(persist.auto?.state)){if(!sound)audio();start(persist.auto.state);}else toast('つづきから読めません：'+saveReason(persist.auto?.state));};$('dialogue').onclick=next;$('sound').onclick=audio;$('collection').onclick=collection;$('settings').onclick=saves;$('save').onclick=saves;$('memory').onclick=memories;$('close').onclick=()=>$('modal').close();$('log').onclick=()=>{const list=document.createElement('div');for(const[n,t]of st.log){const line=document.createElement('div');line.className='line';const name=document.createElement('div');name.className='badge';name.textContent=n||'地の文';const body=document.createElement('div');body.textContent=t;line.append(name,body);list.append(line);}modal('旅の履歴',list);$('modal').scrollTop=$('modal').scrollHeight;};
$('auto').onclick=()=>{if(skip)stopTimers();auto=!auto;$('auto').classList.toggle('active',auto);clearTimeout(autoTimer);if(auto&&!typing)autoTimer=setTimeout(next,2000);};$('skip').onclick=()=>{if(skip){stopTimers();return;}clearTimeout(autoTimer);auto=false;$('auto').classList.remove('active');skip=true;$('skip').classList.add('active');skipTimer=setInterval(()=>{if(!persist.seen.includes(st.node+':'+st.line)||STORY[st.node].choices&&st.line===STORY[st.node].lines.length-1){stopTimers();return;}next();},160);};
function home(){if(st&&!$('game').hidden)checkpoint();title();}$('brand').onclick=home;$('menu').onclick=()=>{modal('旅をひと休み','<p class="muted">現在の進行は自動保存されています。</p><div class="row"><button class="btn" id="menuSave">設定・セーブ</button><button class="btn" id="menuHome">タイトルへ戻る</button></div>');$('menuSave').onclick=()=>{$('modal').close();saves();};$('menuHome').onclick=()=>{$('modal').close();home();};};
$('rotateFull').onclick=async()=>{try{await document.documentElement.requestFullscreen();await screen.orientation.lock('landscape');}catch{toast('端末を横向きにしてください');}};document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.code==='Space'||e.code==='Enter'){if(!$('modal').open&&!$('game').hidden){e.preventDefault();next();}}});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTimers();if(ctx)ctx.suspend();}else if(sound&&ctx)ctx.resume();});// ホーム画面からのWebアプリ起動の案内。自動では表示しない（補助リンクを押したときだけ開く）。
// ホーム画面で起動しているとき（standalone）は、この案内を隠す。
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
$('appGuide').hidden=standalone;
const isIOS=/iPhone|iPod|iPad/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function steps(list,items){const ol=document.createElement('ol');for(const t of items){const li=document.createElement('li');li.textContent=t;ol.append(li);}list.append(ol);}
function appGuide(){
 const body=document.createElement('div'),para=(t,c)=>{const e=document.createElement('p');e.textContent=t;if(c)e.className=c;return e;},head=t=>{const h=document.createElement('h3');h.textContent=t;return h;};
 body.append(para('ホーム画面に追加すると、Safariのタブやアドレス欄なしで遊べます。追加せず、このまま遊ぶこともできます。'));
 if(isIOS){
  body.append(head('iPhoneでの追加手順'));
  steps(body,['Safariの共有メニューを開く','「ホーム画面に追加」を選ぶ','「Webアプリとして開く」をオンにして追加','ホーム画面のアイコンから起動する']);
 }else{
  body.append(para('この手順はiPhone向けです。お使いの端末では、ブラウザのメニューから「ホーム画面に追加」などを探してください。表示名は端末やブラウザによって異なります。','muted'));
 }
 body.append(head('今までのセーブを移す場合'));
 body.append(para('Safariとホーム画面のアプリは、保存される場所が別々です。進行は自動では共有されません。セーブコードで移してください。','muted'));
 steps(body,['通常のSafariで、タイトル画面の「設定・セーブ」を開く','「コードを書き出す」を押し、表示されたコードをすべてコピーする（一度でも物語を進めていれば書き出せます）','ホーム画面のアプリを開き、「設定・セーブ」の入力欄にコードを貼り付けて「コードから復元」を押す']);
 body.append(para('移るのは、現在の進行・既読・到達した結末です。手動セーブの3スロットはコードに含まれません。','muted'));
 const row=document.createElement('div');row.className='row';
 const to=document.createElement('button');to.className='btn';to.textContent='設定・セーブを開く';to.onclick=()=>saves();
 const close=document.createElement('button');close.className='btn';close.textContent='閉じる';close.onclick=()=>$('modal').close();
 row.append(to,close);body.append(row);
 modal('ブラウザの操作欄なしで遊ぶ',body);
}
$('appGuide').onclick=appGuide;
migrateStorage();
title();
