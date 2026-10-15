'use strict';
// 場面ごとの立ち絵指定。配列の添字は story.js の各場面 lines の添字（0始まり）。
// 表情名は portraits.js の PORTRAITS に定義したもの。null・未指定・配列の範囲外は非表示。
// 人物が本文に登場する場面・ページだけを指定する。登場前、またはその人物が描かれていないページは非表示。
// 登場から退場まで連続して表示し、途中で消える・出るのは本文に人物が現れたとき・消えたときだけにする。
const STAGE={
 rescue:{riene:[null,null,'worried','worried','normal']},
 brother:{riene:['normal','normal','normal','sad','sad']},
 scholar:{riene:['normal','normal','normal','normal','normal']},
 // ティアは冒頭の「獣人の少女」から登場し、台詞の後も場面に残る。
 arena:{riene:['worried','worried','normal','happy','happy'],tia:['annoyed','annoyed','embarrassed','annoyed','serious']},
 court:{riene:['normal','normal','worried','worried']},
 border:{riene:['normal','normal','normal','sad']},
 races:{riene:['worried','worried','worried','worried','sad']},
 neia:{riene:['worried','worried','sad','sad','sad']},
 // ティアは台詞のページだけ登場する。
 prayer:{riene:['worried','normal','normal','happy','normal'],tia:[null,null,null,'serious','normal']},
 confession:{riene:['worried','worried','worried','angry','angry','angry']},
 resolve:{riene:['angry','sad','normal','normal'],tia:[null,'serious','normal','normal']},
 agreement:{riene:['worried','normal','normal']},
 alone:{riene:['worried','worried']},
 // ティアは「前へ出た」ページから登場する。
 battle:{
  riene:['worried','sad','worried','sad','sad','sad','sad','crying','crying','crying','crying','crying','crying'],
  tia:[null,null,null,null,null,null,null,null,'serious','serious','embarrassed','embarrassed','serious']
 },
 end_harmony:{riene:['worried','worried','sad','sad','sad','sad','sad']},
 end_true:{riene:['sad','sad','normal','normal','sad','crying','crying','crying','normal','normal'],tia:[null,null,null,null,null,null,null,'happy',null,null]},
 end_god:{riene:['worried','worried','worried','worried','worried','worried','worried','worried','sad','sad','sad','sad','crying','crying']},
 end_sacrifice:{tia:['serious','serious','serious','serious','sad',null,null]}
};

// 場面・ページに表示する立ち絵を返す。2人いるときはリーネを左、ティアを右に置く。
function stagePortraits(node,page){
 const picked=Object.keys(PORTRAITS).map(char=>{
  const expr=STAGE[node]?.[char]?.[page];
  return expr&&isPortraitExpression(char,expr)?{char,expr}:null;
 }).filter(Boolean);
 return picked.map(item=>({...item,slot:picked.length===1?'solo':item.char==='riene'?'left':'right'}));
}

function updatePortraits(node,page,speaker){
 const host=document.getElementById('portraits'),items=stagePortraits(node,page);
 if(!host.children.length)createPortraitLayer(host);
 if(items.length)items.forEach(i=>preloadPortraits(i.char));
 renderPortraits(host,items,speaker);
 const game=document.getElementById('game');
 game.classList.toggle('has-portrait',items.length>0);
 game.classList.remove('in-choice');
}
// 選択肢の表示中は、立ち絵を左右の端へ寄せて選択肢の下に顔が隠れないようにする（縮尺・接地位置は変えない）。
function setPortraitChoice(on){document.getElementById('game').classList.toggle('in-choice',on);}

if(typeof module!=='undefined')module.exports={STAGE,stagePortraits};
