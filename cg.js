'use strict';
// イベントCGの定義と表示範囲。背景（backgrounds.js）とは独立しており、CG表示中は通常背景と立ち絵を隠す（stage.js の指定は変えない）。
// CGS: 名前 → 画像・代替文・表示位置（pos は object-position。画像ごとに指定し、全画像へ一律に当てない）。
// CG_SEGMENTS: 場面ID → [開始行, 終了行, CG名]（行は STORY の lines の添字・両端を含む）。
// 表示は通常背景と同じ画面全体（style.css の .cg：cover）。文章欄と操作UIはその上に重なる。
const CGS={
  riene_first_aid:{src:'assets/cg/riene_first_aid.webp?v=1',pos:'50% 30%',alt:'傷を支えるリーネ'},
  reunion:{src:'assets/cg/reunion.webp?v=1',pos:'50% 30%',alt:'厄災となった兄カイルと向き合うリーネ'},
  scholar_detour:{src:'assets/cg/scholar_detour.webp?v=1',pos:'50% 30%',alt:'石板に夢中のセリオンと待つティア、食べ物を持つリーネ'},
  confrontation:{src:'assets/cg/confrontation.webp?v=1',pos:'50% 30%',alt:'ヴァルゼンと戦う昔の勇者一行'},
  kyle_reunion:{src:'assets/cg/kyle_reunion.webp?v=1',pos:'50% 100%',alt:'手を上げてリーネを止めるカイル'},
  calamity_battle:{src:'assets/cg/calamity_battle.webp?v=1',pos:'50% 50%',alt:'刃を合わせるミナトと厄災のカイル'},
  kyle_last_words:{src:'assets/cg/kyle_last_words.webp?v=1',pos:'50% 70%',alt:'カイルを支えるミナトと治癒するリーネ'},
  ending_harmony:{src:'assets/cg/ending_harmony.webp?v=1',pos:'50% 60%',alt:'山小屋で火のそばに座る二人'},
  ending_sacrifice:{src:'assets/cg/ending_sacrifice.webp?v=1',pos:'50% 10%',alt:'門の前で手を取り合うミナトとティア'},
  ending_collapse:{src:'assets/cg/ending_collapse.webp?v=1',pos:'50% 85%',alt:'机に紙を置くセリオン'},
  ending_true:{src:'assets/cg/ending_true.webp?v=1',pos:'50% 70%',alt:'橋のそばで朝食をとる二人と空の椅子'},
  ending_god:{src:'assets/cg/ending_god.webp?v=1',pos:'50% 100%',alt:'雷光の下でカイルの手を額に当てるミナト'},
  ending_bad:{src:'assets/cg/ending_bad.webp?v=1',pos:'50% 50%',alt:'道端で靴紐を結ぶリーネ'},
  first_hand:{src:'assets/cg/first_hand.webp?v=1',pos:'50% 50%',alt:'学生服のミナトに手を差し伸べる若いカイル'},
  riene_tia_care:{src:'assets/cg/riene_tia_care.webp?v=1',pos:'50% 50%',alt:'ティアの傷を手当てするリーネ'},
  farewell:{src:'assets/cg/farewell.webp?v=1',pos:'50% 50%',alt:'孤児院を去るカイルと幼いリーネ'},
  garden:{src:'assets/cg/garden.webp?v=1',pos:'50% 50%',alt:'小さな植物を世話するヴァルゼン（回想）'},
  confession:{src:'assets/cg/confession.webp?v=1',pos:'50% 50%',alt:'兄のことを明かされ、言葉を失うリーネ'},
};
const CG_SEGMENTS={
  'battle-approach':[[15,20,'reunion'],[30,31,'kyle_reunion']],
  battle:[[10,10,'calamity_battle'],[38,40,'kyle_last_words']],
  rescue:[[37,39,'riene_first_aid']],
  end_harmony:[[34,36,'ending_harmony']],
  end_sacrifice:[[30,32,'ending_sacrifice']],
  end_collapse:[[23,25,'ending_collapse']],
  end_true:[[37,39,'ending_true']],
  end_god:[[31,32,'ending_god']],
  lonely:[[16,21,'ending_bad']],
  'confession-honest':[[1,1,'first_hand']],
  'races-yard':[[17,22,'scholar_detour'],[34,42,'riene_tia_care']],
  brother:[[13,15,'farewell']],
  confession:[[13,17,'confession'],[26,27,'confrontation']],
  end_harmony:[[22,22,'garden'],[34,36,'ending_harmony']],
};
function cgFor(scene,index){
 const segs=CG_SEGMENTS[scene];
 if(!segs)return null;
 for(const [from,to,name] of segs)if(index>=from&&index<=to)return name;
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
// 次の行のCGを先読みする（背景と同じく、直前で取得しておく）。
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
 if(!def){
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
