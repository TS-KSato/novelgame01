'use strict';
// イベントCGと鑑賞の定義。背景（backgrounds.js）とは独立している。CG表示中は通常背景と立ち絵を隠す（stage.js の指定は変えない）。
// CGS: 名前 → 画像・代替文・題名・分類。group は 'story'（本編で表示するCG）か 'trip'（本編では表示しない「旅のひとこま」）。
//   pos は本編の表示位置（object-position）。鑑賞画面は contain で表示し、pos を使わない。
// CG_SEGMENTS: 場面ID → [開始の行ID, 終了の行ID, CG名]（両端を含む）。行は PAGE_IDS の安定IDで指定し、配列の位置には依存しない。
// TRIP_UNLOCKS: 「旅のひとこま」の解放位置（場面ID・行ID）。本文には画像を出さない。
// END_SCENE: 結末ID → その結末の場面。結末に到達した記録から、その場面のCGを解放する。
// GALLERY_ORDER: 鑑賞一覧の並び順。
const CGS={
  riene_first_aid:{group:'story',title:'温かな光',src:'assets/cg/riene_first_aid.webp?v=1',pos:'50% 30%',alt:'傷を支えるリーネ'},
  kyle_reunion:{group:'story',title:'立ち止まる手',src:'assets/cg/kyle_reunion.webp?v=1',pos:'50% 100%',alt:'手を上げてリーネを止めるカイル'},
  calamity_battle:{group:'story',title:'刃を合わせて',src:'assets/cg/calamity_battle.webp?v=1',pos:'50% 50%',alt:'刃を合わせるミナトと厄災のカイル'},
  kyle_last_words:{group:'story',title:'最後の言葉',src:'assets/cg/kyle_last_words.webp?v=1',pos:'50% 70%',alt:'カイルを支えるミナトと治癒するリーネ'},
  reunion:{group:'story',title:'兄との再会',src:'assets/cg/reunion.webp?v=1',pos:'50% 30%',alt:'厄災となった兄カイルと向き合うリーネ'},
  scholar_detour:{group:'story',title:'寄り道の理由',src:'assets/cg/scholar_detour.webp?v=1',pos:'50% 30%',alt:'石板に夢中のセリオンと待つティア、食べ物を持つリーネ'},
  confrontation:{group:'story',title:'ヴァルゼンとの決戦',src:'assets/cg/confrontation.webp?v=1',pos:'50% 30%',alt:'ヴァルゼンと戦う昔の勇者一行'},
  farewell:{group:'story',title:'旅立ちの約束',src:'assets/cg/farewell.webp?v=1',pos:'50% 50%',alt:'孤児院を去るカイルと幼いリーネ'},
  first_hand:{group:'story',title:'差し伸べられた手',src:'assets/cg/first_hand.webp?v=1',pos:'50% 50%',alt:'学生服のミナトに手を差し伸べる若いカイル'},
  riene_tia_care:{group:'story',title:'旅の手当て',src:'assets/cg/riene_tia_care.webp?v=1',pos:'50% 50%',alt:'ティアの傷を手当てするリーネ'},
  confession:{group:'story',title:'打ち明けた真実',src:'assets/cg/confession.webp?v=1',pos:'50% 50%',alt:'兄のことを明かされ、言葉を失うリーネ'},
  garden:{group:'story',title:'小さな命を育てる',src:'assets/cg/garden.webp?v=1',pos:'50% 50%',alt:'小さな植物を世話するヴァルゼン（回想）'},
  ending_harmony:{group:'story',title:'静かな調和',src:'assets/cg/ending_harmony.webp?v=1',pos:'50% 60%',alt:'山小屋で火のそばに座る二人'},
  ending_sacrifice:{group:'story',title:'君の敵になる',src:'assets/cg/ending_sacrifice.webp?v=1',pos:'50% 10%',alt:'門の前で手を取り合うミナトとティア'},
  ending_collapse:{group:'story',title:'砕けた天秤',src:'assets/cg/ending_collapse.webp?v=1',pos:'50% 85%',alt:'机に紙を置くセリオン'},
  ending_true:{group:'story',title:'名を呼ぶ朝',src:'assets/cg/ending_true.webp?v=1',pos:'50% 70%',alt:'橋のそばで朝食をとる二人と空の椅子'},
  ending_god:{group:'story',title:'神のいない空',src:'assets/cg/ending_god.webp?v=1',pos:'50% 100%',alt:'雷光の下でカイルの手を額に当てるミナト'},
  ending_bad:{group:'story',title:'誰もいない道',src:'assets/cg/ending_bad.webp?v=1',pos:'50% 50%',alt:'道端で靴紐を結ぶリーネ'},
  camp_old_friends:{group:'trip',title:'焚き火を囲んで',src:'assets/cg/camp_old_friends.webp?v=1',alt:'昔の仲間と焚き火を囲むミナト'},
  first_town:{group:'trip',title:'見知らぬ町',src:'assets/cg/first_town.webp?v=1',alt:'旅の初めに訪れた町の市場'},
  after_rain:{group:'trip',title:'雨上がり',src:'assets/cg/after_rain.webp?v=1',alt:'石橋の下から外へ向かう若い一行'},
  questions:{group:'trip',title:'尽きない質問',src:'assets/cg/questions.webp?v=1',alt:'食卓でセリオンの質問に囲まれるミナトたち'},
};
const CG_SEGMENTS={
  rescue:[['rescue-037','rescue-039','riene_first_aid']],
  'battle-approach':[['battle-approach-016','battle-approach-021','reunion'],['battle-approach-031','battle-approach-032','kyle_reunion']],
  battle:[['battle-011','battle-011','calamity_battle'],['battle-039','battle-041','kyle_last_words']],
  'races-yard':[['races-yard-018','races-yard-023','scholar_detour'],['races-yard-024k','races-yard-024s','riene_tia_care']],
  brother:[['brother-014','brother-016','farewell']],
  confession:[['confession-014','confession-018','confession'],['confession-027','confession-028','confrontation']],
  'confession-honest':[['confession-honest-002','confession-honest-002','first_hand']],
  end_harmony:[['end-harmony-023','end-harmony-023','garden'],['end-harmony-035','end-harmony-037','ending_harmony']],
  end_sacrifice:[['end-sacrifice-031','end-sacrifice-033','ending_sacrifice']],
  end_collapse:[['end-collapse-024','end-collapse-026','ending_collapse']],
  end_true:[['end-true-038','end-true-040','ending_true']],
  end_god:[['end-god-032','end-god-033','ending_god']],
  lonely:[['lonely-017','lonely-022','ending_bad']],
};
const TRIP_UNLOCKS=[
  {cg:'questions',scene:'arena',id:'arena-063'},
  {cg:'camp_old_friends',scene:'confession',id:'confession-028'},
  {cg:'after_rain',scene:'confession',id:'confession-028'},
  {cg:'first_town',scene:'confession',id:'confession-042'},
];
const END_SCENE={bad:'lonely',harmony:'end_harmony',sacrifice:'end_sacrifice',collapse:'end_collapse',true:'end_true',god:'end_god'};
const GALLERY_ORDER=['riene_first_aid','kyle_reunion','riene_tia_care','scholar_detour','calamity_battle','kyle_last_words','reunion','confrontation','farewell','first_hand','confession','garden','ending_harmony','ending_sacrifice','ending_collapse','ending_true','ending_god','ending_bad','camp_old_friends','first_town','after_rain','questions'];
// 場面の行IDを行の位置へ変換する（PAGE_IDS は story.js の安定ID）。見つからない行の指定は無視する。
const CG_RANGES={};
function cgRanges(scene){
 if(!CG_RANGES[scene]){
  const ids=PAGE_IDS[scene]||[];
  CG_RANGES[scene]=(CG_SEGMENTS[scene]||[]).map(([a,b,name])=>[ids.indexOf(a),ids.indexOf(b),name]).filter(([f,t])=>f>=0&&t>=f);
 }
 return CG_RANGES[scene];
}
function cgFor(scene,index){
 for(const [from,to,name] of cgRanges(scene))if(index>=from&&index<=to)return name;
 return null;
}
// 読み込み済みの画像を覚える。CGは必要になったときだけ取得し、起動時には一括取得しない。
const cgImages={};
function cgImage(name){
 if(!cgImages[name]){
  const img=new Image();
  img.src=CGS[name].src;
  cgImages[name]=img;
 }
 return cgImages[name];
}
// 次の行のCGを先読みする（背景と同じく、直前で取得しておく）。先読みは解放の根拠にしない。
function preloadNextCG(scene,index){
 const name=cgFor(scene,index+1);
 if(name)cgImage(name);
}
// 画像を読み終えてから表示する。読み込みに失敗したら CG は出さず、通常の背景と立ち絵のままにする（文章送りは止めない）。
// 古い要求は token で捨てる。読み込み完了前にタイトルへ戻った・別の場面へ移った場合、後から古い CG は出ない。
let cgToken=0;
function applyCG(name){
 const el=document.getElementById('cg');
 const img=el.querySelector('img');
 const token=++cgToken;
 const def=name&&CGS[name];
 if(!def||def.group!=='story'){
  el.hidden=true;
  document.body.classList.remove('cg-on');
  img.removeAttribute('src');
  return;
 }
 const pre=cgImage(name);
 const show=()=>{
  if(token!==cgToken)return;
  img.src=def.src;
  img.alt=def.alt;
  img.style.objectPosition=def.pos;
  el.hidden=false;
  document.body.classList.add('cg-on');
 };
 const fail=()=>{
  if(token!==cgToken)return;
  el.hidden=true;
  document.body.classList.remove('cg-on');
 };
 if(pre.complete){if(pre.naturalWidth>0)show();else fail();return;}
 pre.onload=show;
 pre.onerror=fail;
}
