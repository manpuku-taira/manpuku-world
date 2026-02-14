const $ = (id) => document.getElementById(id);

/* ---------- Elements ---------- */
const el = {
  title: $("title"),
  game: $("game"),
  boot: $("boot"),
  btnStart: $("btnStart"),

  chipTurn: $("chipTurn"),
  chipPhase: $("chipPhase"),
  chipActive: $("chipActive"),
  firstInfo: $("firstInfo"),

  announce: $("announce"),

  btnHelp: $("btnHelp"),
  btnSettings: $("btnSettings"),
  btnNext: $("btnNext"),
  btnEnd: $("btnEnd"),
  btnLog: $("btnLog"),

  aiC: $("aiC"),
  aiE: $("aiE"),
  pC: $("pC"),
  pE: $("pE"),
  hand: $("hand"),
  aiHand: $("aiHand"),

  aiDeckN: $("aiDeckN"),
  aiWingN: $("aiWingN"),
  aiOutN: $("aiOutN"),
  pDeckN: $("pDeckN"),
  pWingN: $("pWingN"),
  pOutN: $("pOutN"),

  viewerM: $("viewerM"),
  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),

  logM: $("logM"),
  logBody: $("logBody"),

  helpM: $("helpM"),
  settingsM: $("settingsM"),
};

/* ---------- Logs ---------- */
const LOGS = [];
function log(msg, kind="muted"){
  LOGS.unshift({msg, kind, t: Date.now()});
  console.log(`[LOG:${kind}] ${msg}`);
}

/* ---------- Announce ---------- */
function setAnnounce(text, kind=""){
  if(!el.announce) return;
  if(!text){
    el.announce.textContent = "";
    el.announce.classList.add("hide");
    el.announce.classList.remove("warn");
    return;
  }
  el.announce.classList.remove("hide");
  el.announce.textContent = text;
  el.announce.classList.toggle("warn", kind==="warn");
}

/* ---------- Basic Card DB (place test) ---------- */
const pad2 = (n)=> String(n).padStart(2,"0");
const CardRegistry = Array.from({length:20}, (_,i)=>({
  no:i+1,
  name:`カード${i+1}`,
  type:(i%5===1) ? "effect" : ((i%5===2) ? "item" : "character"),
  rank: (i%5)+1,
  atk: ((i%5)+1)*500,
  text:"（テスト用）"
}));
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck=[];
  for(const c of CardRegistry){
    deck.push(JSON.parse(JSON.stringify(c)));
    deck.push(JSON.parse(JSON.stringify(c)));
  }
  shuffle(deck);
  return deck;
}

/* ---------- State ---------- */
const state = {
  started:false,
  turn:1,
  phase:"MAIN",
  activeSide:"P1",
  selectedHandIndex:null,
  P1:{ deck:[], hand:[], C:[null,null,null], E:[null,null,null] },
  AI:{ deck:[], hand:[], C:[null,null,null], E:[null,null,null] },
  img:{ cardUrlByNo:{} }
};

/* ---------- Rendering ---------- */
function makeSlot(card, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.sel) slot.classList.add("sel");
  if(opts.glow) slot.classList.add("glow");

  if(card){
    const face = document.createElement("div");
    face.className = "face fallback";
    const url = state.img.cardUrlByNo[pad2(card.no)];
    if(url){
      face.classList.remove("fallback");
      face.style.backgroundImage = `url("${url}")`;
    }
    if(opts.enemy) face.style.transform = "rotate(180deg)";
    slot.appendChild(face);
    slot.addEventListener("contextmenu",(e)=>e.preventDefault());
  }
  return slot;
}

function renderZones(){
  if(!el.pC || !el.pE || !el.aiC || !el.aiE) return;

  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const s = makeSlot(state.P1.C[i], {});
    s.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(s);
  }

  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const s = makeSlot(state.P1.E[i], {});
    s.addEventListener("click", ()=> onClickYourE(i), {passive:true});
    el.pE.appendChild(s);
  }

  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    el.aiC.appendChild(makeSlot(state.AI.C[i], {enemy:true}));
  }
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    el.aiE.appendChild(makeSlot(state.AI.E[i], {enemy:true}));
  }
}

function renderHand(){
  if(!el.hand) return;
  el.hand.innerHTML = "";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className = "handCard";
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;

    h.addEventListener("click", ()=>{
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      setAnnounce("");
      renderAll();
    }, {passive:true});

    el.hand.appendChild(h);
  }
}

function renderEnemyHand(){
  if(!el.aiHand) return;
  el.aiHand.innerHTML = "";
  const n = state.AI.hand.length;
  const show = Math.min(n, 12);
  for(let i=0;i<show;i++){
    const b = document.createElement("div");
    b.className = "handBack";
    el.aiHand.appendChild(b);
  }
  const lab = $("enemyHandLabel");
  if(lab) lab.textContent = `ENEMY HAND ×${n}`;
}

function updateHUD(){
  if(el.chipTurn) el.chipTurn.textContent = `TURN ${state.turn}`;
  if(el.chipPhase) el.chipPhase.textContent = state.phase;
  if(el.chipActive) el.chipActive.textContent = "YOUR TURN";
}

function renderAll(){
  updateHUD();
  renderZones();
  renderHand();
  renderEnemyHand();
}

/* ---------- Place Rules ---------- */
function onClickYourC(pos){
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;
  const card = state.P1.hand[state.selectedHandIndex];
  if(card.type !== "character"){
    setAnnounce("キャラクター以外はCに置けません（Eへ置いてください）", "warn");
    return;
  }
  state.P1.C[pos] = card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;
  setAnnounce(`登場：${card.name}`);
  renderAll();
}

function onClickYourE(pos){
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;
  const card = state.P1.hand[state.selectedHandIndex];
  if(card.type === "character"){
    setAnnounce("キャラクターはEに置けません（Cへ置いてください）", "warn");
    return;
  }
  state.P1.E[pos] = card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;
  setAnnounce(`配置：${card.name}`);
  renderAll();
}

/* ---------- Start ---------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0) break;
    p.hand.push(p.deck.shift());
  }
}
function startGame(){
  state.turn = 1;
  state.phase = "MAIN";
  state.selectedHandIndex = null;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();
  state.P1.hand = [];
  state.AI.hand = [];
  draw("P1", 6);
  draw("AI", 6);

  state.P1.C = [null,null,null];
  state.P1.E = [null,null,null];
  state.AI.C = [null,null,null];
  state.AI.E = [null,null,null];

  setAnnounce("MAIN：手札を選んで、C/Eの枠をタップしてください。");
  renderAll();
}

/* ---------- Modals (minimal) ---------- */
function showModal(id){ $(id)?.classList.add("show"); }
function hideModal(id){ $(id)?.classList.remove("show"); }
document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close==="help") hideModal("helpM");
  if(close==="settings") hideModal("settingsM");
  if(close==="log") hideModal("logM");
});

/* ---------- Bind ---------- */
function bindStart(){
  el.boot.textContent = "JS: OK（読み込み成功）";
  const go = ()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    startGame();
  };
  el.btnStart.addEventListener("click", go, {passive:true});
  el.title.addEventListener("click", go, {passive:true});
}
function bindHUDButtons(){
  el.btnHelp?.addEventListener("click", ()=> showModal("helpM"), {passive:true});
  el.btnSettings?.addEventListener("click", ()=> showModal("settingsM"), {passive:true});
}
function bindPhaseButtons(){
  el.btnNext?.addEventListener("click", ()=>{ renderAll(); }, {passive:true});
  el.btnEnd?.addEventListener("click", ()=>{ renderAll(); }, {passive:true});
}
function bindLogButton(){
  el.btnLog?.addEventListener("click", ()=>{
    showModal("logM");
    if(el.logBody){
      el.logBody.innerHTML = LOGS.slice(0,120).map(x=>`<div class="logLine ${x.kind}">${x.msg}</div>`).join("");
    }
  }, {passive:true});
}

/* ---------- init ---------- */
function init(){
  log("init", "muted");
  updateHUD();
  setAnnounce("");
  bindStart();
  bindHUDButtons();
  bindPhaseButtons();
  bindLogButton();
  el.boot.textContent = "JS: OK（準備完了）";
}
document.addEventListener("DOMContentLoaded", init);