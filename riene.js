'use strict';
// Array indices correspond to the zero-based page indices in story.js.
const RIENE_PORTRAITS={
 rescue:[null,null,'worried','worried','normal'],
 brother:['normal','normal','normal','sad','sad'],
 scholar:['normal','normal','normal','normal','normal'],
 arena:['worried','worried','normal','happy','happy'],
 court:['normal','normal','worried','worried'],
 border:['normal','normal','normal','sad'],
 races:['worried','worried','worried','worried','sad'],
 neia:['worried','worried','sad','sad','sad'],
 prayer:['worried','normal','normal','happy','normal'],
 confession:['worried','worried','worried','angry','angry','angry'],
 resolve:['angry','sad','normal','normal'],
 agreement:['worried','normal','normal'],
 alone:['worried','worried'],
 battle:['worried','sad','worried','sad','sad','sad','sad','crying','crying','crying','crying','crying','crying'],
 end_harmony:['worried','worried','sad','sad','sad','sad','sad'],
 end_true:['sad','sad','normal','normal','sad','crying','crying','crying','normal','normal'],
 end_god:['worried','worried','worried','worried','worried','worried','worried','worried','sad','sad','sad','sad','crying','crying']
};
let rienePreloaded=false;
function updateRienePortrait(node,page,speaker){
 const stage=document.getElementById('rieneStage'),img=document.getElementById('rienePortrait'),scene=document.getElementById('game');
 const expression=RIENE_PORTRAITS[node]?.[page];
 if(!expression){stage.hidden=true;scene.classList.remove('has-riene');return;}
 if(!rienePreloaded){rienePreloaded=true;for(const name of ['normal','happy','worried','sad','angry','crying']){const preload=new Image();preload.src='assets/characters/riene/'+name+'.png';}}
 const source='assets/characters/riene/'+expression+'.png';
 stage.classList.toggle('listening',speaker!==''&&speaker!=='リーネ');
 scene.classList.add('has-riene');
 if(img.getAttribute('src')!==source){
  img.onload=()=>{if(RIENE_PORTRAITS[st.node]?.[st.line]===expression&&!document.getElementById('game').hidden)stage.hidden=false;};
  img.onerror=()=>{stage.hidden=true;scene.classList.remove('has-riene');};
  img.src=source;
 }
 if(img.complete&&img.naturalWidth>0)stage.hidden=false;
}
