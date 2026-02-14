const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  matRoot: $("matRoot"),
  fieldTop: $("fieldTop"),
  fieldBottom: $("fieldBottom"),

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

  zoneM: $("zoneM"),
  zoneTitle: $("zoneTitle"),
  zoneList: $("zoneList"),

  logM: $("logM"),
  logBody: $("logBody"),

  confirmM: $("confirmM"),
  confirmTitle: $("confirmTitle"),
  confirmBody: $("confirmBody"),
  btnYes: $("btnYes"),
  btnNo: $("btnNo"),

  settingsM: $("settingsM"),
  repoInput: $("repoInput"),
  btnRepoSave: $("btnRepoSave"),
  btnRescan: $("btnRescan"),
  btnClearCache: $("btnClearCache"),

  helpM: $("helpM"),
};

/* ---------- Logs ---------- */
const LOGS = [];
function log(msg, kind="muted"){
  LOGS.unshift({msg, kind, t: Date.now()});
  if(el.logM?.classList?.contains("show")) renderLogModal();
  console.log(`[LOG:${kind}] ${msg}`);
}
window.addEventListener("error", (e)=> log(`JSエラー: ${e.message || e.type}`, "warn"));
window.addEventListener("unhandledrejection", (e)=> log(`Promiseエラー: ${String(e.reason || "")}`, "warn"));

function renderLogModal(){
  if(!el.logBody) return;
  el.logBody.innerHTML = "";
  if(!LOGS.length){
    const d = document.createElement("div");
    d.className = "logLine muted";
    d.textContent = "（ログはまだありません）";
    el.logBody.appendChild(d);
    return;
  }
  for(const it of LOGS.slice(0, 200)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v4";

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}

/* ---------- Card DB (20) ---------- */
const CardRegistry = [
  { no:1,  id:"card_01", name:"黒の魔法使いクルエラ", type:"character", rank:5, atk:2500, tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。"),
    kensan:{ required:true, cost:{ hand:"any", stage:"character", count:1 } }
  },
  { no:2,  id:"card_02", name:"黒魔法-フレイムバレット", type:"effect", rank:2, atk:0, tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ステージに「クルエラ」がある時、手札から発動できる。相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"),
    target:{ kind:"enemyCharacterOptional" }
  },
  { no:3,  id:"card_03", name:"トナカイの少女ニコラ", type:"character", rank:5, atk:2000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"),
    kensan:{ required:true, cost:{ hand:"any", stage:"character", count:1 } }
  },
  { no:4,  id:"card_04", name:"聖ラウス", type:"character", rank:3, atk:1500, tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。")
  },
  { no:5,  id:"card_05", name:"統括AI タータ", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが登場した時、発動できる。デッキから2枚ドローする。\n自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。")
  },
  { no:6,  id:"card_06", name:"麗し令嬢エフィ", type:"character", rank:5, atk:2200, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"),
    kensan:{ required:true, cost:{ hand:"any", stage:"character", count:1 } },
    target:{ kind:"enemyCharacter" }
  },
  { no:7,  id:"card_07", name:"狩猟まひる", type:"character", rank:3, atk:1500, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("（効果は後で確定）")
  },
  { no:8,  id:"card_08", name:"組織の男 手形", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。")
  },
  { no:9,  id:"card_09", name:"小太郎・孫悟空Lv17", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n自分ステージに「小次郎」カードがある時、このカードのATK+500。")
  },
  { no:10, id:"card_10", name:"小次郎・孫悟空Lv17", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n自分ステージに「小太郎」カードがある時、このカードのATK+500。")
  },
  { no:11, id:"card_11", name:"司令", type:"item", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"),
    equip:{ bonus:500 }
  },
  { no:12, id:"card_12", name:"班目プロデューサー", type:"character", rank:3, atk:1500, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。")
  },
  { no:13, id:"card_13", name:"超弩級砲塔列車スタマックス氏", type:"character", rank:4, atk:2000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\nこの効果は相手ターンでも発動できる。"),
    target:{ kind:"enemyCharacter" }
  },
  { no:14, id:"card_14", name:"記憶抹消", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。")
  },
  { no:15, id:"card_15", name:"桜蘭の陰陽術 - 闘 -", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    target:{ kind:"yourCharacter" }
  },
  { no:16, id:"card_16", name:"力こそパワー！！", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"),
    target:{ kind:"enemyCharacter" }
  },
  { no:17, id:"card_17", name:"キャトルミューティレーション", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    target:{ kind:"enemyCharacter" }
  },
  { no:18, id:"card_18", name:"a-xブラスター01 -放射型-", type:"item", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"),
    equip:{ bonus:500 }
  },
  { no:19, id:"card_19", name:"-聖剣- アロングダイト", type:"item", rank:2, atk:0, tags:["勇者","剣士"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"),
    equip:{ bonus:500 }
  },
  { no:20, id:"card_20", name:"普通の棒", type:"item", rank:1, atk:0, tags:["勇者"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\nタグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"),
    equip:{ bonus:300 }
  },
];

function cloneCard(no){
  const base = CardRegistry.find(c=>c.no===no);
  const c = JSON.parse(JSON.stringify(base));
  c.baseAtk = c.atk || 0;
  c.bonusAtk = 0;
  return c;
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck = [];
  for(let no=1; no<=20; no++){
    deck.push(cloneCard(no));
    deck.push(cloneCard(no));
  }
  shuffle(deck);
  return deck;
}

/* ---------- State ---------- */
const state = {
  started:false,
  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",
  normalSummonUsed:false,

  selectedHandIndex:null,
  selectedAttackerPos:null,

  flow: null,

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },
  aiRunning:false,
};

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

/* ---------- UI ---------- */
function updateHUD(){
  if(el.chipTurn) el.chipTurn.textContent = `TURN ${state.turn}`;
  if(el.chipPhase) el.chipPhase.textContent = state.phase;
  const you = state.activeSide==="P1";
  if(el.chipActive){
    el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
    el.chipActive.classList.toggle("enemy", !you);
  }
  if(el.btnNext){
    el.btnNext.disabled = !you;
    el.btnNext.style.opacity = you ? "1" : ".45";
  }
  if(el.btnEnd){
    el.btnEnd.disabled = !you;
    el.btnEnd.style.opacity = you ? "1" : ".45";
  }
}
function updateCounts(){
  if(el.aiDeckN) el.aiDeckN.textContent = state.AI.deck.length;
  if(el.aiWingN) el.aiWingN.textContent = state.AI.wing.length;
  if(el.aiOutN) el.aiOutN.textContent = state.AI.outside.length;
  if(el.pDeckN) el.pDeckN.textContent = state.P1.deck.length;
  if(el.pWingN) el.pWingN.textContent = state.P1.wing.length;
  if(el.pOutN) el.pOutN.textContent = state.P1.outside.length;

  const lab = $("enemyHandLabel");
  if(lab) lab.textContent = `ENEMY HAND ×${state.AI.hand.length}`;
}

/* ---------- Long press ---------- */
function bindLongPress(node, fn, ms=420){
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(fn, ms); };
  const end = ()=> clearTimeout(t);
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
}

/* ---------- Slots (VISIBILITY GUARANTEE) ---------- */
function makeSlot(card, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");
  if(opts.need) slot.classList.add("need");

  // card face
  if(card){
    const face = document.createElement("div");
    face.className = "face";
    const url = state.img.cardUrlByNo[pad2(card.no)];
    if(url) face.style.backgroundImage = `url("${url}")`;
    else face.classList.add("fallback");
    if(opts.enemy) face.style.transform = "rotate(180deg)";
    slot.appendChild(face);
    bindLongPress(slot, ()=> openViewer(card));
  }
  return slot;
}

/* ---------- Modals ---------- */
function showModal(id){ $(id)?.classList.add("show"); }
function hideModal(id){ $(id)?.classList.remove("show"); }

document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");
  if(close==="zone") hideModal("zoneM");
  if(close==="confirm") hideModal("confirmM");
  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
});

function openViewer(card){
  if(!el.viewerTitle || !el.viewerText || !el.viewerImg) return;
  el.viewerTitle.textContent = `${card.name}`;
  el.viewerText.textContent = (card.text || "");
  const url = state.img.cardUrlByNo[pad2(card.no)];
  el.viewerImg.src = url || "";
  showModal("viewerM");
}

/* ---------- Render (FORCE 3 SLOTS ALWAYS) ---------- */
function forceSlotsContainerOk(){
  const must = ["pC","pE","aiC","aiE","hand","aiHand"];
  for(const id of must){
    if(!$(id)){
      log(`致命：DOMが見つかりません id=${id}（index.htmlの置換漏れ）`, "warn");
    }
  }
}

function renderZones(){
  // If containers missing, stop early (but log)
  if(!el.pC || !el.pE || !el.aiC || !el.aiE){
    log("盤面DOMが不足しているため枠を描画できません（index.htmlの置換を再確認）", "warn");
    return;
  }

  // AI E
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    el.aiE.appendChild(makeSlot(state.AI.E[i], {enemy:true}));
  }

  // AI C
  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const s = makeSlot(state.AI.C[i], {enemy:true});
    el.aiC.appendChild(s);
  }

  // YOUR C
  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const s = makeSlot(state.P1.C[i], {});
    // click handler
    s.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(s);
  }

  // YOUR E
  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const s = makeSlot(state.P1.E[i], {});
    s.addEventListener("click", ()=> onClickYourE(i), {passive:true});
    el.pE.appendChild(s);
  }
}

function renderHand(){
  if(!el.hand) return;
  el.hand.innerHTML = "";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className = "handCard";
    if(state.activeSide==="P1" && state.phase==="MAIN") h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1") return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      setAnnounce("");
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=> openViewer(c));
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
}

function renderAll(){
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
}

/* ---------- Gameplay (minimal: place to C/E) ---------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0) return;
    p.hand.push(p.deck.shift());
  }
}

function onClickYourC(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(card.type !== "character"){
    log("キャラクター以外はCに置けません（Eへ）", "warn");
    setAnnounce("キャラクター以外はCに置けません（Eへ置いてください）", "warn");
    return;
  }

  state.P1.C[pos] = card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;
  log(`登場：${card.name}`, "muted");
  renderAll();
}

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(card.type === "character"){
    log("キャラクターはEに置けません（Cへ）", "warn");
    setAnnounce("キャラクターはEに置けません（Cへ置いてください）", "warn");
    return;
  }

  state.P1.E[pos] = card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;
  log(`配置：${card.name}`, "muted");
  renderAll();
}

/* ---------- Start Game ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "MAIN"; // テストしやすいようMAIN開始
  state.selectedHandIndex = null;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  state.P1.hand = [];
  state.AI.hand = [];
  draw("P1", 5);
  draw("AI", 5);

  state.P1.C = [null,null,null];
  state.P1.E = [null,null,null];
  state.AI.C = [null,null,null];
  state.AI.E = [null,null,null];

  updateHUD();
  setAnnounce("MAIN：手札を選んで、C/Eの枠をタップしてください。");
  renderAll();
  log("ゲーム開始（MAIN開始・置くテスト優先）", "muted");
}

/* ---------- Bindings ---------- */
function bindStart(){
  el.boot.textContent = "JS: OK（読み込み成功）";
  const go = ()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    forceSlotsContainerOk();
    startGame();
  };
  el.btnStart.addEventListener("click", go, {passive:true});
  el.title.addEventListener("click", go, {passive:true});
}
function bindHUDButtons(){
  el.btnHelp.addEventListener("click", ()=> showModal("helpM"), {passive:true});
  el.btnSettings.addEventListener("click", ()=> showModal("settingsM"), {passive:true});
}
function bindPhaseButtons(){
  el.btnNext.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
    // テスト版：フェイズ循環
    const i = PHASES.indexOf(state.phase);
    state.phase = PHASES[(i+1)%PHASES.length];
    updateHUD();
    setAnnounce(`PHASE：${state.phase}`);
    renderAll();
  }, {passive:true});
  el.btnEnd.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
    state.phase = "MAIN";
    updateHUD();
    setAnnounce("MAIN：手札を選んで、C/Eの枠をタップしてください。");
    renderAll();
  }, {passive:true});
}
function bindLogButton(){
  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 360);
}

/* ---------- init ---------- */
function init(){
  log("init start", "muted");
  updateHUD();
  setAnnounce("");
  bindStart();
  bindHUDButtons();
  bindPhaseButtons();
  bindLogButton();

  // 画像が無くても枠は出る仕様（まず遊べることを優先）
  // カード画像URLは後段で復活させます（今回の目的は「枠が出て置ける」こと）
  el.boot.textContent = "JS: OK（準備完了）";
}
document.addEventListener("DOMContentLoaded", init);