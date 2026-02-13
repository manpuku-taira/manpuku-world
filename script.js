/* =========================================================
   Manpuku World 強制ログ版（ここでログが出ない＝script未読み込み確定）
   ========================================================= */

const $ = (id) => document.getElementById(id);

const el = {
  titleScreen: $("titleScreen"),
  gameScreen: $("gameScreen"),
  btnStart: $("btnStart"),
  bootStatus: $("bootStatus"),
  jsChip: $("jsChip"),

  turnChip: $("turnChip"),
  phaseChip: $("phaseChip"),
  whoChip: $("whoChip"),
  btnNextPhase: $("btnNextPhase"),
  btnEndTurn: $("btnEndTurn"),

  aiStage: $("aiStage"),
  p1Stage: $("p1Stage"),
  hand: $("hand"),
  log: $("log"),

  aiDeckCount: $("aiDeckCount"),
  aiWingCount: $("aiWingCount"),
  aiOutsideCount: $("aiOutsideCount"),
  aiShieldCount: $("aiShieldCount"),
  p1DeckCount: $("p1DeckCount"),
  p1WingCount: $("p1WingCount"),
  p1OutsideCount: $("p1OutsideCount"),
  p1ShieldCount: $("p1ShieldCount"),

  viewerModal: $("viewerModal"),
  viewerClose: $("viewerClose"),
  viewerCloseBtn: $("viewerCloseBtn"),
  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),

  confirmModal: $("confirmModal"),
  confirmBack: $("confirmBack"),
  confirmText: $("confirmText"),
  confirmYes: $("confirmYes"),
  confirmNo: $("confirmNo"),
};

function log(msg, kind="muted"){
  if(!el.log) return;
  const d = document.createElement("div");
  d.className = "logLine " + kind;
  d.textContent = msg;
  el.log.prepend(d);
}

// 例外を必ずログに
window.addEventListener("error", (e)=>{
  log(`JSエラー: ${e.message || e.type}`, "warn");
});
window.addEventListener("unhandledrejection", (e)=>{
  log(`Promiseエラー: ${String(e.reason || "")}`, "warn");
});

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const Cards = Array.from({length:20}, (_,i)=>({
  no:i+1,
  name:`カード${i+1}`,
  rank: ((i%5)+1),
  atk: ((i%5)+1)*500,
  type:"character",
  text:"（テキストは後で確定）"
}));

const state = {
  started:false,
  turn:1,
  phase:"START",
  P1:{ deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },
  AI:{ deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },
  selectedHand:null
};

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const d=[];
  for(const c of Cards){ d.push({...c}); d.push({...c}); }
  shuffle(d);
  return d;
}
function draw(side,n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){ log(`${side==="P1"?"あなた":"AI"}：デッキ切れ`, "warn"); return; }
    p.hand.push(p.deck.shift());
  }
}

function renderCounts(){
  el.turnChip.textContent = `TURN ${state.turn}`;
  el.phaseChip.textContent = state.phase;
  el.whoChip.textContent = "YOU";

  el.aiDeckCount.textContent = state.AI.deck.length;
  el.p1DeckCount.textContent = state.P1.deck.length;
  el.aiShieldCount.textContent = state.AI.shield.length;
  el.p1ShieldCount.textContent = state.P1.shield.length;
  el.aiWingCount.textContent = state.AI.wing.length;
  el.p1WingCount.textContent = state.P1.wing.length;
  el.aiOutsideCount.textContent = state.AI.outside.length;
  el.p1OutsideCount.textContent = state.P1.outside.length;
}

function makeSlot(card){
  const s = document.createElement("div");
  s.className = "slot";
  if(card){
    const face = document.createElement("div");
    face.className = "cardFace fallback";

    const b1 = document.createElement("div");
    b1.className="badge";
    b1.textContent=`R${card.rank}`;

    const b2 = document.createElement("div");
    b2.className="badge atk";
    b2.textContent=`ATK ${card.atk}`;

    const nm = document.createElement("div");
    nm.className="cardName";
    nm.textContent = card.name;

    face.appendChild(b1); face.appendChild(b2); face.appendChild(nm);
    s.appendChild(face);

    // 長押し簡易（今はクリックでOK）
    s.addEventListener("click", ()=>{
      log(`カード確認：${card.name}`, "muted");
    }, {passive:true});
  }
  return s;
}

function renderStage(){
  el.aiStage.innerHTML="";
  for(let i=0;i<3;i++){
    const slot = makeSlot(state.AI.stage[i]);
    slot.addEventListener("click", ()=>log(`相手スロット${i+1} タップ`, "muted"), {passive:true});
    el.aiStage.appendChild(slot);
  }

  el.p1Stage.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.stage[i];
    const slot = makeSlot(c);

    slot.addEventListener("click", ()=>{
      log(`自分スロット${i+1} タップ`, "muted");
      if(state.phase!=="MAIN"){ log("MAINで登場できます", "muted"); return; }
      if(c){ log("ここは埋まっています", "muted"); return; }
      if(state.selectedHand==null){ log("先に手札をタップしてください", "muted"); return; }
      const hc = state.P1.hand[state.selectedHand];
      state.P1.stage[i]=hc;
      state.P1.hand.splice(state.selectedHand,1);
      state.selectedHand=null;
      log(`登場：${hc.name}`, "muted");
      renderAll();
    }, {passive:true});

    el.p1Stage.appendChild(slot);
  }
}

function renderHand(){
  el.hand.innerHTML="";
  state.P1.hand.forEach((c,idx)=>{
    const h = document.createElement("div");
    h.className = "handCard" + (state.selectedHand===idx ? " selected":"");
    const face = document.createElement("div");
    face.className = "cardFace fallback";

    const b = document.createElement("div");
    b.className="badge";
    b.textContent=`No.${c.no}`;

    const nm = document.createElement("div");
    nm.className="cardName";
    nm.textContent = c.name;

    face.appendChild(b); face.appendChild(nm);
    h.appendChild(face);

    h.addEventListener("click", ()=>{
      state.selectedHand = (state.selectedHand===idx) ? null : idx;
      log(`手札タップ：${c.name}`, "muted");
      renderAll();
    }, {passive:true});

    el.hand.appendChild(h);
  });
}

function renderAll(){
  renderCounts();
  renderStage();
  renderHand();
}

function startGame(){
  state.turn=1; state.phase="START";
  state.selectedHand=null;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();
  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];
  state.P1.hand=[]; state.AI.hand=[];
  draw("P1",4); draw("AI",4);
  state.P1.stage=[null,null,null];
  state.AI.stage=[null,null,null];

  log("ゲーム開始：シールド3 / 初手4", "muted");
  renderAll();
}

function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  state.phase = PHASES[(i+1)%PHASES.length];
  log(`フェイズ：${state.phase}`, "muted");
  if(state.phase==="DRAW"){
    draw("P1",1); draw("AI",1);
    log("ドロー +1", "muted");
  }
  renderAll();
}
function endTurn(){
  state.turn++;
  state.phase="START";
  log(`TURN ${state.turn} 開始`, "muted");
  renderAll();
}

function startToGame(){
  el.titleScreen.classList.remove("active");
  el.gameScreen.classList.add("active");
  log("対戦画面：表示OK", "muted");
  startGame();
}

function bindUI(){
  // ここが出ない＝script.js未読み込み
  if(el.bootStatus) el.bootStatus.textContent = "JS: OK（読み込み成功）";
  if(el.jsChip) el.jsChip.textContent = "JS: OK";
  log("JS起動OK：ログ表示テスト成功", "muted");

  const start = ()=>{
    if(state.started) return;
    state.started=true;
    log("タイトルタップ：開始", "muted");
    startToGame();
  };

  // iOS対策：click / touchend 両方
  el.btnStart.addEventListener("click", start, {passive:true});
  el.btnStart.addEventListener("touchend", start, {passive:true});
  el.titleScreen.addEventListener("click", start, {passive:true});
  el.titleScreen.addEventListener("touchend", start, {passive:true});

  el.btnNextPhase.addEventListener("click", nextPhase, {passive:true});
  el.btnEndTurn.addEventListener("click", endTurn, {passive:true});

  log("バインド完了（ボタンでログが増えるはず）", "muted");
}

document.addEventListener("DOMContentLoaded", bindUI);