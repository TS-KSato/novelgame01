'use strict';
// 音声。一つの AudioContext で、BGM（一度に1曲）、環境音（ループ）、単発の効果音を鳴らす。音源の指定がない場面は無音を保つ。
// 音と行は安定した行ID（PAGE_IDS）で結ぶ。行に入ったとき onLine を呼ぶ。fire=false（ロード・再開・スキップ中）では単発音を鳴らさない。
// 音声ファイルは変換・加工しない。ここで決めるのは再生時の倍率だけ（ファイル差の補正と、本文を読む邪魔にならない音量）。
const AudioCue=(function(){
const AMB_FILE=n=>'assets/audio/ambience/'+n+'.mp3';
const SE_FILE=n=>'assets/audio/se/'+n+'.mp3';
// 再生時の倍率。環境音は各ファイルの平均音量を揃え（ピークは0dBFSを超えない範囲）、効果音はピークを約-10dBに揃える。
const AMB_GAIN={town_ambience:.51,watermill:.57,rain:3.1,campfire:4.4,tower_wind:12,country_ambience:7.6,tavern_ambience:4};
const SE_GAIN={town_bell:.39,sword_clash:.32,stone_break:.28,healing:.33,footsteps_stone:.25,footsteps_dirt:2.1,door_open:.21,door_close:.2,paper_unfold:2,cloth_rustle:4};
const XFADE=1.5,FADE=1.2,LOOKAHEAD=1,TICK=200;
// BGM。各曲の平均音量（RMS）を約 -26dBFS（母線前）に揃えた再生倍率。ピークは -6dBFS を超えない。
// 測定 RMS（dBFS）: main_theme -20.0 / journey -18.8 / companions -18.8 / unease -20.0 / memories -19.1 / battle -19.7 / parting -19.8 / resolve -19.6 / ending_true -18.8 / ending_harmony -19.3 / ending_sacrifice -19.6 / ending_collapse -19.8 / ending_god -19.2 / ending_bad -19.7
const BGM_FILE=n=>'assets/audio/bgm/'+n+'.mp3';
const BGM_GAIN={main_theme:.501,journey:.436,companions:.436,unease:.501,memories:.450,battle:.483,parting:.489,resolve:.478,ending_true:.436,ending_harmony:.463,ending_sacrifice:.478,ending_collapse:.489,ending_god:.457,ending_bad:.483};
// 通常の曲は継ぎ目をクロスフェードで繋ぐ。結末の曲は一回だけ再生し、終わったら止める。
const BGM_XFADE=3;
const BGM_ONCE=new Set(['ending_true','ending_harmony','ending_sacrifice','ending_collapse','ending_god','ending_bad']);
// 内部ゲイン。BGM・環境音・効果音を独立して調整する（全体の音量とON/OFFは master で扱う）。
const BUS={bgm:.85,amb:1,se:1};
const EQ_IN=new Float32Array(64),EQ_OUT=new Float32Array(64);
for(let i=0;i<64;i++){EQ_IN[i]=Math.sin(Math.PI/2*i/63);EQ_OUT[i]=Math.cos(Math.PI/2*i/63);}
// 環境音の範囲: [場面, 開始の行ID, 終了の行ID, 環境音, 音量の比, くぐもらせるか]。行IDを null にすると場面全体。先に書いた範囲が優先。
const AMBIENCE=[
 ['alley','alley-001','alley-020','town_ambience',1,false],
 ['border',null,null,'rain',.5,false],
 ['border-share',null,null,'rain',.5,false],
 ['border-copy',null,null,'rain',.5,false],
 ['border-road',null,null,'country_ambience',1,false],
 ['border-after',null,null,'country_ambience',1,false],
 ['races-road',null,null,'country_ambience',1,false],
 ['neia-road',null,null,'country_ambience',1,false],
 ['scholar','scholar-023r','scholar-053','watermill',1,false],
 ['scholar','scholar-054','scholar-071','watermill',.5,true],
 ['confession-road',null,null,'tower_wind',1,false],
 ['battle-approach','battle-approach-001','battle-approach-015','tower_wind',1,false],
 ['battle-approach','battle-approach-016','battle-approach-035','tower_wind',.5,false],
 ['battle-approach','battle-approach-036','battle-approach-052','tower_wind',1,false],
 ['battle','battle-001','battle-030','tower_wind',.8,false],
 ['prayer-night',null,null,'campfire',1,false],
 ['prayer-contact',null,null,'campfire',1,false],
 ['prayer-return',null,null,'campfire',1,false],
 ['confession-honest',null,null,'campfire',1,false],
 ['arena','arena-063','arena-091','campfire',1,false],
 // 宿の食堂の客の喧騒。races-017 で客が静まるため、そこで止める。
 ['races','races-001','races-016','tavern_ambience',1,false],
];
// 単発の効果音: [場面, 発火させる行ID, 効果音]。行に入ったときに一度だけ鳴る。
const SOUNDS=[
 ['alley','alley-001','town_bell'],
 ['rescue','rescue-037','healing'],
 ['rescue','rescue-047','town_bell'],
 ['battle','battle-001','stone_break'],
 ['battle','battle-011','sword_clash'],
 ['lonely','lonely-001','town_bell'],
 ['rescue','rescue-022','footsteps_stone'],
 ['brother','brother-034','footsteps_dirt'],
 ['border','border-002','door_open'],
 ['end_harmony','end-harmony-013','door_close'],
 ['end_true','end-true-004','paper_unfold'],
 ['collapse-agreement','collapse-agreement-005a','paper_unfold'],
 ['arena','arena-001','cloth_rustle'],
 ['border','border-020','cloth_rustle'],
];
let ctx=null,master=null,bgmBus=null,ambBus=null,seBus=null,on=false,vol=.22,wanted=null,cur=null,failed=[],fired=0;
let bgmWant=null,bgmCur=null,deferred=false,bgmStarts=0;
const lastSe={};const SE_COOLDOWN=1.5; // 同じ行への再入場や連続操作で、同じ効果音が重なるのを防ぐ（別の行の同じ音は妨げない）
const bufs={},seActive=new Set();

// BGMの範囲: [場面, 開始の行ID, 終了の行ID（null は場面の終わりまで）, 曲]。先に書いた範囲が優先。
// 同じ曲が続く範囲は、場面が変わっても再生し直さない（曲名で同一性を判断する）。
const BGM=[
 ['rescue','rescue-001','rescue-009','unease'],
 ['brother','brother-003','brother-010','companions'],
 ['court-after','court-after-021',null,'journey'],
 ['court','court-040','court-058','unease'],
 ['arena','arena-027','arena-040','unease'],
 ['arena','arena-053','arena-091','companions'],
 ['scholar','scholar-041','scholar-058','companions'],
 ['border','border-045','border-049','memories'],
 ['neia','neia-001','neia-029','unease'],
 ['neia-listen','neia-listen-007','neia-listen-013','memories'],
 ['alone','alone-001','alone-005','unease'],
 ['races-yard','races-yard-024b','races-yard-024x','companions'],
 ['prayer-weeks','prayer-weeks-021','prayer-weeks-031','companions'],
 ['prayer-return','prayer-return-002','prayer-return-011','companions'],
 ['resolve','resolve-010','resolve-029','resolve'],
 ['agreement-method','agreement-method-013','agreement-method-016','resolve'],
 ['battle','battle-002','battle-031','battle'],
 ['battle','battle-039','battle-052','parting'],
 ['end_harmony','end-harmony-016',null,'ending_harmony'],
 ['end_sacrifice','end-sacrifice-013',null,'ending_sacrifice'],
 ['end_collapse','end-collapse-014',null,'ending_collapse'],
 ['end_true','end-true-010',null,'ending_true'],
 ['end_god','end-god-029',null,'ending_god'],
 ['lonely','lonely-006',null,'ending_bad'],
];
// 行IDを行の位置へ。場面や行が見つからない指定は無視する（範囲に入らない扱い）。
function at(scene,id){return id===null?null:(PAGE_IDS[scene]||[]).indexOf(id);}
function bgmAt(node,line){
 for(const [scene,a,b,track] of BGM){
  if(scene!==node)continue;
  const f=at(scene,a);
  if(f<0)continue;
  const t=b===null?(PAGE_IDS[scene]||[]).length-1:at(scene,b);
  if(line>=f&&line<=t)return{track,once:BGM_ONCE.has(track)};
 }
 return null;
}
function ambienceAt(node,line){
 for(const [scene,a,b,name,level,muffle] of AMBIENCE){
  if(scene!==node)continue;
  if(a===null)return{name,level,muffle};
  const f=at(scene,a),t=at(scene,b);
  if(f>=0&&t>=f&&line>=f&&line<=t)return{name,level,muffle};
 }
 return null;
}
function seAt(node,line){
 for(const [scene,id,name] of SOUNDS)if(scene===node&&at(scene,id)===line)return name;
 return null;
}

// 読み込みは一度だけ。失敗しても進行は止めない（記録だけして null を返す）。
function load(url){
 if(!bufs[url])bufs[url]=fetch(url).then(r=>{if(!r.ok)throw new Error(url);return r.arrayBuffer();}).then(ab=>ctx.decodeAudioData(ab)).catch(()=>{failed.push(url);return null;});
 return bufs[url];
}
function ensure(){
 if(ctx)return true;
 try{
  ctx=new(window.AudioContext||window.webkitAudioContext)();
  master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
  bgmBus=ctx.createGain();bgmBus.gain.value=BUS.bgm;bgmBus.connect(master);
  ambBus=ctx.createGain();ambBus.gain.value=BUS.amb;ambBus.connect(master);
  seBus=ctx.createGain();seBus.gain.value=BUS.se;seBus.connect(master);
  return true;
 }catch{ctx=null;return false;}
}
function applyMaster(){
 if(!master)return;
 const t=ctx.currentTime,g=master.gain;
 g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);
 if(on)g.setTargetAtTime(vol,t,.4);else g.linearRampToValueAtTime(0,t+.05);
}

// 環境音のループ。町の通りだけは、冒頭が強く末尾がほぼ無音のため、区間を等パワーで重ねて切れ目を埋める。
// それ以外は、ファイル自体が切れ目で滑らかに続くので、標準のループ（loop）で繋ぐ（重ねると切れ目に膨らみが出るため）。
function schedule(L){
 const X=L.xf||XFADE,D=L.buf.duration,step=D-X;
 while(L.nextAt<ctx.currentTime+LOOKAHEAD){
  const t=L.nextAt,src=ctx.createBufferSource(),seg=ctx.createGain();
  src.buffer=L.buf;
  seg.gain.setValueAtTime(0,t);
  seg.gain.setValueCurveAtTime(EQ_IN,t,X);
  seg.gain.setValueCurveAtTime(EQ_OUT,t+D-X,X);
  src.connect(seg);seg.connect(L.gain);
  src.start(t);src.stop(t+D);
  src.onended=()=>{src.disconnect();seg.disconnect();L.sources=L.sources.filter(x=>x!==src);};
  L.sources.push(src);L.nextAt+=step;
 }
}
function level(a){return a.level*AMB_GAIN[a.name]*(a.muffle?.6:1);}
function startLoop(buf,a){
 const now=ctx.currentTime,g=ctx.createGain(),f=ctx.createBiquadFilter();
 f.type='lowpass';f.frequency.value=a.muffle?900:20000;f.Q.value=.7;
 g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(level(a),now+FADE);
 g.connect(f);f.connect(ambBus);
 const L={name:a.name,buf,gain:g,filter:f,sources:[],nextAt:now+.05,timer:null};
 if(a.name==='town_ambience'){schedule(L);L.timer=setInterval(()=>schedule(L),TICK);}
 else{const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;src.connect(g);src.start(now+.05);L.sources.push(src);}
 return L;
}
function fadeOut(L){
 clearInterval(L.timer);
 const now=ctx.currentTime;
 L.gain.gain.cancelScheduledValues(now);L.gain.gain.setValueAtTime(L.gain.gain.value,now);L.gain.gain.linearRampToValueAtTime(0,now+FADE);
 setTimeout(()=>stopLoop(L),FADE*1000+200);
}
function stopLoop(L){
 clearInterval(L.timer);
 for(const s of L.sources){try{s.stop();}catch{}}
 try{L.gain.disconnect();L.filter.disconnect();}catch{}
}
// 環境音の切り替え。同じ音が続くときは再生し直さず、音量とくぐもりだけを変える。切り替えは短く fade する。
function setEnv(a){
 wanted=a;
 if(!on||!ensure())return;
 const name=a?a.name:null;
 if(cur&&cur.name===name){
  const t=ctx.currentTime;
  cur.gain.gain.setTargetAtTime(level(a),t,.6);
  cur.filter.frequency.setTargetAtTime(a.muffle?900:20000,t,.6);
  return;
 }
 if(cur){fadeOut(cur);cur=null;}
 if(!name)return;
 load(AMB_FILE(name)).then(buf=>{
  if(!buf||!on||!wanted||wanted.name!==name||cur)return;
  cur=startLoop(buf,wanted);
 });
}
// 環境音を止める。wanted（今の場面の指定）は残す。OFFからONへ戻したとき、同じ場面の環境音へ戻れるように。
function stopEnv(immediate){
 if(cur){if(immediate)stopLoop(cur);else fadeOut(cur);cur=null;}
}
function playSe(name,key){
 if(ctx&&lastSe[key]!==undefined&&ctx.currentTime-lastSe[key]<SE_COOLDOWN)return;
 if(ctx)lastSe[key]=ctx.currentTime;
 fired++;
 const go=buf=>{
  if(!buf||!on||!ctx)return;
  const s=ctx.createBufferSource(),g=ctx.createGain();
  s.buffer=buf;g.gain.value=SE_GAIN[name];s.connect(g);g.connect(seBus);
  seActive.add(s);s.onended=()=>seActive.delete(s);
  s.start();
 };
 load(SE_FILE(name)).then(go);
}
// BGM の一曲。通常の曲は継ぎ目をクロスフェードで繰り返し、結末の曲は一回だけ鳴らす。
function startTrack(buf,track,once){
 bgmStarts++;
 const now=ctx.currentTime,g=ctx.createGain(),f=ctx.createBiquadFilter();
 f.type='lowpass';f.frequency.value=20000;f.Q.value=.7;
 g.gain.setValueAtTime(once?0:BGM_GAIN[track],now);
 if(once)g.gain.linearRampToValueAtTime(BGM_GAIN[track],now+1.5);
 g.connect(f);f.connect(bgmBus);
 const L={name:track,buf,gain:g,filter:f,sources:[],nextAt:now+.05,timer:null,xf:once?0:BGM_XFADE,once,done:false};
 if(once){
  const src=ctx.createBufferSource();src.buffer=buf;src.connect(g);
  src.onended=()=>{L.done=true;};
  src.start(now+.05);L.sources.push(src);
 }else{schedule(L);L.timer=setInterval(()=>schedule(L),TICK);}
 return L;
}
// BGM の切り替え。同じ曲なら何もしない（再生し直さない）。違う曲なら、古い曲を短く fade してから新しい曲を読み込む。
function applyBgm(){
 const w=bgmWant,track=w?w.track:null;
 if(bgmCur&&bgmCur.name===track)return;
 if(bgmCur){fadeOut(bgmCur);bgmCur=null;}
 if(!w||!on||!ensure())return;
 load(BGM_FILE(track)).then(buf=>{
  // 読み込み中に場面が変わっていたら、その曲は鳴らさない（古い曲が遅れて鳴るのを防ぐ）。
  if(!buf||!on||!bgmWant||bgmWant.track!==track||bgmCur)return;
  bgmCur=startTrack(buf,track,bgmWant.once);
 });
}
function preload(){
 for(const n of Object.keys(AMB_GAIN))load(AMB_FILE(n));
 for(const n of Object.keys(SE_GAIN))load(SE_FILE(n));
}

return {
 // 起動時：保存された音のON/OFFを反映する。ブラウザは操作前の再生を許さないため、最初の操作で再開する。
 init(v,volume){
  vol=volume;
  if(v)this.set(true);
  document.addEventListener('pointerdown',()=>{if(ctx&&on)ctx.resume().catch(()=>{});},{capture:true});
 },
 isOn(){return on;},
 // 音のON/OFF。ONのときは現在の場面の環境音を鳴らす。失敗したら false。
 set(v){
  if(v){
   if(!ensure())return false;
   on=true;applyMaster();preload();
   ctx.resume().catch(()=>{});
   setEnv(wanted);applyBgm();
   return true;
  }
  on=false;applyMaster();
  stopEnv(true);
  if(bgmCur){stopLoop(bgmCur);bgmCur=null;}
  for(const s of seActive){try{s.stop();}catch{}}
  seActive.clear();
  return true;
 },
 setVolume(v){vol=v;applyMaster();},
 // 行に入ったとき。o.fire=true のときだけ単発の効果音を鳴らす。o.defer=true（スキップ中）は音を切り替えず、停止後に settle で合わせる。
 onLine(node,line,o){
  const a=ambienceAt(node,line);
  wanted=a;bgmWant=bgmAt(node,line);
  if(o.defer){deferred=true;return;}
  deferred=false;
  setEnv(a);applyBgm();
  if(o.fire&&on){const n=seAt(node,line);if(n)playSe(n,node+':'+line);}
 },
 // スキップが止まったとき、現在の行に合う環境音・BGMへ落ち着かせる。
 settle(){if(!deferred)return;deferred=false;setEnv(wanted);applyBgm();},
 // タイトル画面：候補の曲（main_theme）を、音が許可された後に流す。本編の行に入ると、その行の曲へ切り替わる。
 onTitle(){bgmWant={track:'main_theme',once:false};deferred=false;applyBgm();},
 // タイトルへ戻る：ゲーム中の環境音を止める。音は鳴らさない。
 stopEnv(){wanted=null;stopEnv(false);},
 // 非表示・バックグラウンド：止める（位置は保つ）。復帰で続きから。
 pause(){if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});},
 resume(){if(ctx&&on)ctx.resume().catch(()=>{});},
 plan(node,line){return{amb:ambienceAt(node,line),se:seAt(node,line),bgm:bgmAt(node,line)};},
 // 確認用。現在鳴っている環境音・単発音の数など（操作には使わない）。
 status(){return{on,ctxState:ctx?ctx.state:null,env:cur?cur.name:null,wanted:wanted?wanted.name:null,loopSources:cur?cur.sources.length:0,bgm:bgmCur?bgmCur.name:null,bgmStarts,bgmWant:bgmWant?bgmWant.track:null,bgmDone:bgmCur?bgmCur.done:null,seActive:seActive.size,fired,failed:failed.slice(),masterGain:master?master.gain.value:null};},
 failedFiles(){return failed.slice();}
};
})();
