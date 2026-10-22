'use strict';
// 背景の定義とページ別の指定。本編（app.js）と立ち絵の確認ページ（character-preview.js）で共有する。
// 指定は場面ID→[開始行, 終了行, 背景名]（行は STORY の lines の添字・両端を含む）。指定のない行は既定の背景（cathedral）。
// 背景は必要になった時だけ読み込む。起動時の一括読み込みはしない。画像は cover で表示し、縦横比は変えない。
// 画像を差し替えた時は BG_VERSION を上げる（同じパスでもブラウザが新しい画像を取り直す）。
const BG_VERSION='3';
const BACKGROUNDS={
  cathedral:'assets/cathedral.webp',
  arena_day:'assets/backgrounds/arena_day.webp',
  camp_morning:'assets/backgrounds/camp_morning.webp',
  camp_night:'assets/backgrounds/camp_night.webp',
  capital_gate_day:'assets/backgrounds/capital_gate_day.webp',
  capital_hall_day:'assets/backgrounds/capital_hall_day.webp',
  capital_office_day:'assets/backgrounds/capital_office_day.webp',
  cottage_day:'assets/backgrounds/cottage_day.webp',
  cottage_room_day:'assets/backgrounds/cottage_room_day.webp',
  forest_path_day:'assets/backgrounds/forest_path_day.webp',
  fort_courtyard_day:'assets/backgrounds/fort_courtyard_day.webp',
  inn_room_day:'assets/backgrounds/inn_room_day.webp',
  inn_room_night:'assets/backgrounds/inn_room_night.webp',
  memorial_day:'assets/backgrounds/memorial_day.webp',
  mill_day:'assets/backgrounds/mill_day.webp',
  mill_room_evening:'assets/backgrounds/mill_room_evening.webp',
  mountain_hut_room:'assets/backgrounds/mountain_hut_room.webp',
  orphanage_gate_day:'assets/backgrounds/orphanage_gate_day.webp',
  pass_fog:'assets/backgrounds/pass_fog.webp',
  river_bridge_day:'assets/backgrounds/river_bridge_day.webp',
  river_crossing_day:'assets/backgrounds/river_crossing_day.webp',
  road_day:'assets/backgrounds/road_day.webp',
  shrine_day:'assets/backgrounds/shrine_day.webp',
  shrine_night:'assets/backgrounds/shrine_night.webp',
  tower_path_day:'assets/backgrounds/tower_path_day.webp',
  tower_top:'assets/backgrounds/tower_top.webp',
  tower_top_night:'assets/backgrounds/tower_top_night.webp',
  town_alley_day:'assets/backgrounds/town_alley_day.webp',
  town_day:'assets/backgrounds/town_day.webp',
  town_gate_closed_day:'assets/backgrounds/town_gate_closed_day.webp',
  war_road_day:'assets/backgrounds/war_road_day.webp',
};for(const k of Object.keys(BACKGROUNDS))BACKGROUNDS[k]+='?v='+BG_VERSION;

// 背景名の一覧（確認ページの選択肢）。未使用の素材も含め、assets/backgrounds の webp を名前で列挙する。
const BACKGROUND_NAMES=Object.keys(BACKGROUNDS);
const BG_SEGMENTS={
  'prologue':[[0,9,'tower_top_night']],
  'alley':[[0,0,'town_day'],[1,7,'orphanage_gate_day'],[8,25,'town_day']],
  'rescue':[[0,22,'town_alley_day'],[23,56,'town_day']],
  'brother':[[0,33,'road_day']],
  'scholar':[[0,53,'mill_day'],[54,77,'mill_room_evening']],
  'arena':[[0,61,'arena_day'],[62,67,'camp_night'],[68,90,'camp_morning']],
  'court-road':[[0,18,'capital_gate_day']],
  'court':[[0,65,'capital_office_day']],
  'court-disclose':[[0,8,'capital_office_day']],
  'court-private':[[0,5,'capital_office_day']],
  'court-after':[[0,16,'capital_office_day'],[17,41,'capital_hall_day']],
  'border-road':[[0,5,'road_day'],[6,22,'forest_path_day'],[23,25,'cottage_day']],
  'border':[[0,63,'cottage_room_day'],[64,68,'cottage_day'],[69,76,'cottage_room_day']],
  'border-share':[[0,9,'cottage_room_day']],
  'border-copy':[[0,5,'cottage_room_day']],
  'border-after':[[0,9,'cottage_room_day'],[10,23,'cottage_day']],
  'races-road':[[0,4,'road_day'],[5,30,'fort_courtyard_day']],
  'races-yard':[[0,47,'fort_courtyard_day']],
  'races':[[0,30,'inn_room_day']],
  'races-talk':[[0,13,'inn_room_day'],[14,22,'river_crossing_day']],
  'races-enemy':[[0,7,'inn_room_day'],[8,8,'river_crossing_day']],
  'races-stone':[[0,24,'memorial_day']],
  'neia-road':[[0,11,'pass_fog']],
  'neia':[[0,28,'pass_fog']],
  'neia-listen':[[0,18,'pass_fog']],
  'neia-defend':[[0,8,'pass_fog']],
  'neia-after':[[0,28,'pass_fog']],
  'prayer-inn':[[0,30,'inn_room_day']],
  'prayer-weeks':[[0,0,'road_day'],[1,1,'river_crossing_day'],[2,18,'road_day'],[19,30,'inn_room_night']],
  'prayer-compare':[[0,16,'inn_room_day']],
  'prayer-method':[[0,10,'inn_room_day']],
  'prayer-stone':[[0,21,'shrine_day']],
  'prayer-night':[[0,8,'shrine_night']],
  'prayer-contact':[[0,10,'shrine_night']],
  'prayer-send':[[0,3,'shrine_day'],[4,6,'town_day']],
  'prayer-six':[[0,8,'inn_room_day']],
  'prayer-return':[[0,10,'camp_night']],
  'confession-road':[[0,20,'tower_path_day']],
  'confession':[[0,63,'tower_path_day']],
  'confession-honest':[[0,8,'camp_night']],
  'confession-protect':[[0,10,'camp_night']],
  'resolve':[[0,6,'camp_night'],[7,28,'camp_morning']],
  'resolve-plan':[[0,16,'camp_morning']],
  'agreement-yes':[[0,18,'capital_hall_day']],
  'agreement-method':[[0,13,'inn_room_day'],[14,17,'inn_room_night']],
  'agreement-no':[[0,4,'inn_room_day']],
  'alone':[[0,4,'camp_night']],
  'collapse-agreement':[[0,7,'camp_night']],
  'battle-approach':[[0,10,'tower_path_day'],[11,51,'tower_top']],
  'battle':[[0,30,'tower_top'],[31,51,'tower_top_night']],
  'end_harmony':[[0,10,'tower_top_night'],[11,14,'town_day'],[15,19,'mountain_hut_room'],[20,21,'town_day'],[22,23,'cottage_day'],[24,37,'mountain_hut_room']],
  'end_sacrifice':[[0,11,'tower_top_night'],[12,16,'tower_path_day'],[17,18,'pass_fog'],[19,34,'town_gate_closed_day'],[35,38,'road_day']],
  'end_collapse':[[0,12,'tower_top_night'],[13,14,'road_day'],[15,15,'river_bridge_day'],[16,21,'town_day'],[22,26,'inn_room_day']],
  'end_true':[[0,25,'tower_top_night'],[26,26,'tower_path_day'],[27,37,'river_crossing_day'],[38,44,'river_bridge_day']],
  'end_god':[[0,35,'tower_top_night'],[36,45,'pass_fog'],[46,50,'capital_office_day']],
  'lonely':[[0,2,'town_day'],[3,8,'road_day'],[9,9,'tower_path_day'],[10,13,'tower_top'],[14,14,'tower_top_night'],[15,30,'road_day'],[31,34,'orphanage_gate_day'],[35,35,'road_day'],[36,38,'pass_fog']],
};

// 行の背景名（指定がなければ null = 既定の背景）
function bgFor(scene,index){
 const segs=BG_SEGMENTS[scene];
 if(!segs)return null;
 for(const [from,to,name] of segs)if(index>=from&&index<=to)return name;
 return null;
}

// 背景の画像は名前ごとに1つだけ作り、必要になった時に読み込む（同じ画像を何度も取りに行かない）。
const bgImages=new Map();
function bgImage(name){
 let img=bgImages.get(name);
 if(img&&img.complete&&img.naturalWidth===0)img=null;   // 失敗した画像は取り直す
 if(!img){img=new Image();img.src=BACKGROUNDS[name];bgImages.set(name,img);}
 return img;
}

// 背景を element（.scenery）へ反映する。新しい画像は読み終えてから差し替え、前の場面の画像を残し続けない。
// 読み込みが1.2秒を超えるか失敗した場合は既定の背景へ戻す。本文の進行は待たない。
const bgState=new WeakMap();
function applyBackground(el,name){
 if(!el)return;
 const target=name&&BACKGROUNDS[name]?name:null;
 const state=bgState.get(el)||{token:0};
 bgState.set(el,state);
 const token=++state.token;
 const current=()=>bgState.get(el).token===token;
 const clear=()=>{if(!current())return;el.style.backgroundImage='';el.dataset.bg='';};
 if((el.dataset.bg||null)===target)return;
 if(!target){clear();return;}
 const img=bgImage(target);
 const show=()=>{if(!current())return;el.style.backgroundImage=`url("${BACKGROUNDS[target]}")`;el.dataset.bg=target;};
 if(img.complete&&img.naturalWidth>0){show();return;}
 img.addEventListener('load',show,{once:true});
 img.addEventListener('error',clear,{once:true});
 setTimeout(()=>{if(current()&&!(img.complete&&img.naturalWidth>0))clear();},1200);
}

// 次の行の背景だけ、必要なら先に読み込む（それ以上は読まない）。
function preloadNextBackground(scene,index){
 const name=bgFor(scene,index+1);
 if(name)bgImage(name);
}

// 確認ページに表示する名前（内容に合わせた表示。ファイル名と内容が食い違う素材は、その旨を名前に残す）。
const BACKGROUND_LABELS={
  cathedral:'既存の背景（大聖堂）',
  arena_day:'闘技場の広場（昼）',
  camp_morning:'野営地（朝）',
  camp_night:'野営地（夜）',
  capital_gate_day:'王都の門（昼）',
  capital_hall_day:'王都の廊下（昼）',
  capital_office_day:'ガレスの執務室（昼）',
  cottage_day:'ユーリの家（外・昼）',
  cottage_room_day:'ユーリの家（内・昼）',
  forest_path_day:'森の道（昼）',
  fort_courtyard_day:'砦の広場（昼）',
  inn_room_day:'宿の食堂（昼）',
  inn_room_night:'宿の室内（夜）',
  memorial_day:'供養石（昼）',
  mill_day:'水車小屋（外・昼）',
  mill_room_evening:'水車小屋（内・夕）',
  mountain_hut_room:'山小屋（内）',
  orphanage_gate_day:'孤児院の門（昼）',
  pass_fog:'霧の峠（昼）',
  river_bridge_day:'川の橋（復旧後・昼）',
  river_crossing_day:'川と橋桁（外されたまま・昼）',
  road_day:'街道（昼）',
  shrine_day:'祭場（昼）',
  shrine_night:'祭場（夜）',
  tower_path_day:'塔へ続く道（昼）',
  tower_top:'塔の最上部（昼・天井なし）',
  tower_top_night:'塔の最上部（夜・天井なし）',
  town_alley_day:'路地（昼）',
  town_day:'町（昼）',
  town_gate_closed_day:'閉じた西門（昼）',
  war_road_day:'荒れた町の通り（昼・未使用）',
};
