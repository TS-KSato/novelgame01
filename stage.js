'use strict';
// 場面ごとの立ち絵指定。配列の添字は story.js の各場面 lines の添字（0始まり）。
// 表情名は portraits.js の PORTRAITS に定義したもの。null・未指定・配列の範囲外は非表示。
// 人物が本文に登場する場面・ページだけを指定する。登場前、またはその人物が描かれていないページは非表示。
// 登場から退場まで連続して表示し、途中で消える・出るのは本文に人物が現れたとき・消えたときだけにする。
// 話者（台詞の人物）は必ず表示されるように指定する。
const STAGE={
 rescue:{riene:[null,'worried','worried','worried','normal']},
 brother:{riene:['normal','normal','normal','sad','sad']},
 // セリオンは学者として登場する。「説明してください」は未知の言葉へ食いつく場面なので好奇心の差分を使う。
 scholar:{serion:['thinking','normal','amused','curious','thinking']},
 // ティアは冒頭の「獣人の少女」から登場し、台詞の後も場面に残る。
 // 勝負に負けて鍋が焦げた（arena[4]）場面で悔しがる差分を使う。
 arena:{riene:['worried','worried','normal','happy','happy'],tia:['annoyed','annoyed','embarrassed','annoyed','frustrated']},
 // ガレスは王都の場面に実際にいる（0〜3行目）。過去の判断を訂正する行は apologetic、責任ある判断の行は serious。
 // 記録の説明（2行目）は通常。smile は本文に安堵・信頼が読み取れる行がないため未使用。
 court:{riene:['normal','normal','worried','worried'],gares:['normal','apologetic','normal','serious']},
 border:{riene:['normal','normal','normal','sad']},
 // セリオンが、規則ではないと真剣に説明する場面（races[2]）で真剣な表情を使う。
 races:{riene:['worried','worried','worried','worried','sad'],serion:[null,null,'serious','thinking',null]},
 neia:{riene:['worried','worried','sad','sad','sad']},
 // ティアは台詞のページだけ登場する。セリオンは台詞のページだけ登場する。
 prayer:{riene:['worried','normal','normal','happy','normal'],serion:[null,'thinking',null,null,null],tia:[null,null,null,'serious','normal']},
 confession:{riene:['worried','worried','worried','angry','angry','angry']},
 // 3人が並ぶのは2行目（セリオンの台詞）まで。選択肢が出る最終行は中央を空けるため、セリオンは外す。
 resolve:{riene:['angry','sad','normal','normal'],tia:[null,'serious','normal','normal'],serion:[null,null,'amused',null]},
 agreement:{riene:['worried','normal','normal']},
 alone:{riene:['worried','worried']},
 // ティアは「前へ出た」ページから登場する。
 battle:{
  riene:['worried','sad','worried','sad','sad','sad','sad','crying','crying','crying','crying','crying','crying'],
  tia:[null,null,null,null,null,null,null,null,'serious','serious','embarrassed','embarrassed','serious']
 },
 end_harmony:{riene:['worried','worried','sad','sad','sad','sad','sad']},
 end_sacrifice:{tia:['serious','serious','serious','serious','sad',null,null]},
 end_collapse:{serion:[null,'sad',null,null,null]},
 // 3人が並ぶ（ティアの台詞、セリオンの台詞）。
 end_true:{
  riene:['sad','sad','normal','normal','sad','crying','crying','crying','normal','normal'],
  tia:[null,null,null,null,null,null,'happy','normal',null,null],
  serion:[null,null,null,null,null,null,null,'amused',null,null]
 },
 end_god:{
  riene:['worried','worried','worried','worried','worried','worried','worried','worried','sad','sad','sad','sad','crying','crying'],
  serion:[null,null,null,null,null,null,'thinking']
 }
};

// 場面・ページに表示する立ち絵を返す。同時に出る人数に応じて配置名を決める（portraitSlots）。
function stagePortraits(node,page){
 const picked=Object.keys(PORTRAITS).map(char=>{
  const expr=STAGE[node]?.[char]?.[page];
  return expr&&isPortraitExpression(char,expr)?{char,expr}:null;
 }).filter(Boolean);
 const slots=portraitSlots(picked.map(i=>i.char));
 return picked.map(item=>({...item,slot:slots[item.char]}));
}

function updatePortraits(node,page,speaker){
 const host=document.getElementById('portraits'),items=stagePortraits(node,page);
 if(!host.children.length)createPortraitLayer(host);
 items.forEach(i=>preloadPortrait(i.char,i.expr));
 renderPortraits(host,items,speaker);
 const game=document.getElementById('game');
 game.classList.toggle('has-portrait',items.length>0);
 game.classList.remove('in-choice');
}
// 選択肢の表示中は、立ち絵を左右の端へ寄せて選択肢の下に顔が隠れないようにする（縮尺・接地位置は変えない）。
function setPortraitChoice(on){document.getElementById('game').classList.toggle('in-choice',on);}

if(typeof module!=='undefined')module.exports={STAGE,stagePortraits};
