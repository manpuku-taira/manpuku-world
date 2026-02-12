const Cards = [
  {no:1,name:"黒の魔法使い クルエラ",rank:5,atk:2500,type:"character"},
  {no:2,name:"黒魔法フレイムバレット",rank:5,atk:0,type:"effect"},
  {no:3,name:"トナカイの少女 ニコラ",rank:5,atk:2000,type:"character"},
  {no:4,name:"聖 ラウス",rank:4,atk:1800,type:"character"},
  {no:5,name:"統括AI タータ",rank:4,atk:1000,type:"character"},
  {no:6,name:"麗しの令嬢 エフィ",rank:5,atk:2000,type:"character"},
  {no:7,name:"狩樹 まひる",rank:4,atk:1700,type:"character"},
  {no:8,name:"組織の男 手形",rank:4,atk:1900,type:"character"},
  {no:9,name:"小太郎孫悟空Lv17",rank:3,atk:1600,type:"character"},
  {no:10,name:"小次郎孫悟空Lv17",rank:3,atk:1500,type:"character"},
  {no:11,name:"司令",rank:3,atk:1200,type:"character"},
  {no:12,name:"班目プロデューサー",rank:2,atk:800,type:"character"},
  {no:13,name:"超弩級砲塔列車スタマックス氏",rank:1,atk:100,type:"character"},
  {no:14,name:"記憶抹消",rank:4,atk:0,type:"effect"},
  {no:15,name:"桜蘭の陰陽術闘",rank:3,atk:0,type:"effect"},
  {no:16,name:"力こそパワー",rank:3,atk:0,type:"effect"},
  {no:17,name:"キャトルミューティレーション",rank:3,atk:0,type:"effect"},
  {no:18,name:"axブラスター01放射型",rank:4,atk:0,type:"item"},
  {no:19,name:"聖剣アロンダイト",rank:3,atk:0,type:"item"},
  {no:20,name:"普通の棒",rank:1,atk:0,type:"item"}
];

let state = {
  started:false,
  turn:1,
  phase:"START",
  deck:[],
  hand:[]
};

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

function buildDeck(){
  let d=[];
  Cards.forEach(c=>{
    d.push({...c});
    d.push({...c});
  });
  shuffle(d);
  return d;
}

function draw(n=1){
  for(let i=0;i<n;i++){
    if(state.deck.length>0){
      state.hand.push(state.deck.shift());
    }
  }
}

function render(){
  document.getElementById("turnChip").innerText="TURN "+state.turn;
  document.getElementById("phaseChip").innerText=state.phase;

  const handEl=document.getElementById("hand");
  handEl.innerHTML="";
  state.hand.forEach(c=>{
    const div=document.createElement("div");
    div.className="card";
    div.innerText=c.name;
    handEl.appendChild(div);
  });
}

function nextPhase(){
  const order=["START","DRAW","MAIN","BATTLE","END"];
  let idx=order.indexOf(state.phase);
  idx++;
  if(idx>=order.length){
    state.phase="START";
    state.turn++;
  } else {
    state.phase=order[idx];
  }
  if(state.phase==="DRAW") draw(1);
  render();
}

document.getElementById("btnNextPhase").onclick=nextPhase;

document.getElementById("btnEndTurn").onclick=()=>{
  state.phase="START";
  state.turn++;
  render();
};

document.getElementById("titleScreen").onclick=()=>{
  if(state.started) return;
  state.started=true;
  document.getElementById("titleScreen").classList.remove("active");
  document.getElementById("gameScreen").classList.add("active");
  state.deck=buildDeck();
  draw(4);
  render();
};