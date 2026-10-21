'use strict';
// 音声。一つの AudioContext で、環境音（ループ）と単発の効果音を鳴らす。音源の指定がない場面は無音を保つ（合成の基調音は鳴らさない）。
// 音と行は安定した行ID（PAGE_IDS）で結ぶ。行に入ったとき onLine を呼ぶ。fire=false（ロード・再開・スキップ中）では単発音を鳴らさない。
// 音声ファイルは変換・加工しない。ここで決めるのは再生時の倍率だけ（ファイル差の補正と、本文を読む邪魔にならない音量）。
const AudioCue=(function(){
const AMB_FILE=n=>'assets/audio/ambience/'+n+'.mp3';
const SE_FILE=n=>'assets/audio/se/'+n+'.mp3';
// 再生時の倍率。環境音は各ファイルの平均音量を揃え（ピークは0dBFSを超えない範囲）、効果音はピークを約-10dBに揃える。
const AMB_GAIN={town_ambience:.51,watermill:.57,rain:3.1,campfire:4.4,tower_wind:12,country_ambience:7.6};
const SE_GAIN={town_bell:.39,sword_clash:.32,stone_break:.28,healing:.33};
const XFADE=1.5,FADE=1.2,LOOKAHEAD=1,TICK=200;
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
];
// 単発の効果音: [場面, 発火させる行ID, 効果音]。行に入ったときに一度だけ鳴る。
const SOUNDS=[
 ['alley','alley-001','town_bell'],
 ['rescue','rescue-037','healing'],
 ['rescue','rescue-047','town_bell'],
 ['battle','battle-001','stone_break'],
 ['battle','battle-011','sword_clash'],
 ['lonely','lonely-001','town_bell'],
];
let ctx=null,master=null,on=false,vol=.22,wanted=null,cur=null,failed=[],fired=0;
const bufs={},seActive=new Set();

// 行IDを行の位置へ。場面や行が見つからない指定は無視する（範囲に入らない扱い）。
function at(scene,id){return id===null?null:(PAGE_IDS[scene]||[]).indexOf(id);}
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
 const D=L.buf.duration,step=D-XFADE;
 while(L.nextAt<ctx.currentTime+LOOKAHEAD){
  const t=L.nextAt,src=ctx.createBufferSource(),seg=ctx.createGain();
  src.buffer=L.buf;
  seg.gain.setValueAtTime(0,t);
  seg.gain.setValueCurveAtTime(EQ_IN,t,XFADE);
  seg.gain.setValueCurveAtTime(EQ_OUT,t+D-XFADE,XFADE);
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
 g.connect(f);f.connect(master);
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
function playSe(name){
 fired++;
 const go=buf=>{
  if(!buf||!on||!ctx)return;
  const s=ctx.createBufferSource(),g=ctx.createGain();
  s.buffer=buf;g.gain.value=SE_GAIN[name];s.connect(g);g.connect(master);
  seActive.add(s);s.onended=()=>seActive.delete(s);
  s.start();
 };
 load(SE_FILE(name)).then(go);
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
   setEnv(wanted);
   return true;
  }
  on=false;applyMaster();
  stopEnv(true);
  for(const s of seActive){try{s.stop();}catch{}}
  seActive.clear();
  return true;
 },
 setVolume(v){vol=v;applyMaster();},
 // 行に入ったとき。fire=true のときだけ単発の効果音を鳴らす。
 onLine(node,line,fire){
  setEnv(ambienceAt(node,line));
  if(fire&&on){const n=seAt(node,line);if(n)playSe(n);}
 },
 // タイトルへ戻る：ゲーム中の環境音を止める。音は鳴らさない。
 stopEnv(){wanted=null;stopEnv(false);},
 // 非表示・バックグラウンド：止める（位置は保つ）。復帰で続きから。
 pause(){if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});},
 resume(){if(ctx&&on)ctx.resume().catch(()=>{});},
 plan(node,line){return{amb:ambienceAt(node,line),se:seAt(node,line)};},
 // 確認用。現在鳴っている環境音・単発音の数など（操作には使わない）。
 status(){return{on,ctxState:ctx?ctx.state:null,env:cur?cur.name:null,wanted:wanted?wanted.name:null,loopSources:cur?cur.sources.length:0,seActive:seActive.size,fired,failed:failed.slice(),masterGain:master?master.gain.value:null};},
 failedFiles(){return failed.slice();}
};
})();
