const $ = (id) => document.getElementById(id);

const el = {
  titleScreen: $("titleScreen"),
  gameScreen: $("gameScreen"),
  btnStart: $("btnStart"),
  bootStatus: $("bootStatus"),
  jsChip: $("jsChip"),

  btnImages: $("btnImages"),
  btnNextPhase: $("btnNextPhase"),
  btnEndTurn: $("btnEndTurn"),

  turnChip: $("turnChip"),
  phaseChip: $("phaseChip"),
  whoChip: $("whoChip"),

  matTop: $("matTop"),
  matBottom: $("matBottom"),

  aiStage: $("aiStage"),
  p1Stage: $("p1Stage"),
  aiEff: $("aiEff"),
  p1Eff: $("p1Eff"),

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

  imgModal: $("imgModal"),
  imgClose: $("imgClose"),
  imgCloseBtn: $("imgCloseBtn"),
  fieldInput: $("fieldInput"),
  btnSaveField: $("btnSaveField"),
  bulkMap: $("bulkMap"),
  btnClearMap: $("btnClearMap"),
  btnSaveMap: $("btnSaveMap"),
};

function log(msg, kind="muted"){
  const d = document.createElement("div");
  d.className = "logLine " + kind;
  d.textContent = msg;
  el.log.prepend(d);
}
window.addEventListener("error", (e)=> log(`JSエラー: ${e.message || e.type}`, "warn"));
window.addEventListener("unhandledrejection", (e)=> log(`Promiseエラー: ${String(e.reason || "")}`, "warn"));

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const pad2 = (n)=> String(n).padStart(2,"0");

/* いまは仮データ（画像が出ることが目的）。カード確定後に置換 */
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
  P1:{ deck:[], hand:[], stage:[null,null,null], eff:[null,null,null], wing:[], outside:[], shield:[] },
  AI:{ deck:[], hand:[], stage:[null,null,null], eff:[null,null,null], wing:[], outside:[], shield:[] },
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

/* ===== 画像解決 ===== */
const LS_FIELD = "mw_field_url";
const LS_MAP = "mw_card_map_v1";

function getSavedMap(){
  try{ return JSON.parse(localStorage.getItem(LS_MAP) || "{}"); }catch{ return {}; }
}
function setSavedMap(map){
  localStorage.setItem(LS_MAP, JSON.stringify(map));
}
function normalizeCardPath(v){
  if(!v) return "";
  if(v.startsWith("/")) return v;
  return `/assets/cards/${v}`;
}
function tryLoadImage(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=> resolve(true);
    img.onerror = ()=> resolve(false);
    img.src = url;
  });
}

async function resolveField(){
  const saved = localStorage.getItem(LS_FIELD);
  if(saved && await tryLoadImage(saved)) return saved;

  const cands = [
    "/assets/field.png",
    "/assets/field.jpg",
    "/assets/field.jpeg",
    "/assets/field.png.jpg",
    "/assets/field.jpg.png",
    "/assets/Field.png",
    "/assets/Field.jpg",
    "/assets/Field.PNG",
    "/assets/Field.JPG",
    "/assets/field.PNG",
    "/assets/field.JPG",
  ];
  for(const u of cands){
    if(await tryLoadImage(u)) return u;
  }
  return "";
}

async function resolveCardUrl(card){
  const map = getSavedMap();
  const key = pad2(card.no);
  if(map[key]){
    const u = normalizeCardPath(map[key]);
    if(await tryLoadImage(u)) return u;
  }

  // 標準探索（Noだけで探す）
  const bases = [
    `/assets/cards/${pad2(card.no)}`,
    `/assets/cards/${card.no}`,
  ];
  const exts = [
    ".jpg",".png",".jpeg",".webp",
    ".JPG",".PNG",".JPEG",".WEBP",
    ".png.JPG",".PNG.JPG",".png.jpg",".PNG.jpg",
    ".jpg.png",".JPG.PNG",
  ];

  for(const b of bases){
    for(const e of exts){
      const u = b + e;
      if(await tryLoadImage(u)) return u;
    }
  }
  return "";
}

async function applyField(){
  const u = await resolveField();
  if(u){
    // ★上下2枚に同時適用（上＝逆向きはCSSで回転）
    el.matTop.style.backgroundImage = `url("${u}")`;
    el.matBottom.style.backgroundImage = `url("${u}")`;
    log(`OK フィールド：${u}（上=相手/下=自分）`, "muted");
  }else{
    log("NG フィールド画像が見つかりません（assets/field.jpg など）", "warn");
  }
}

/* ===== 描画 ===== */
async function setCardFaceImage(faceEl, card){
  const url = await resolveCardUrl(card);
  if(url){
    faceEl.style.backgroundImage = `url("${url}")`;
    faceEl.classList.remove("fallback");
  }else{
    faceEl.classList.add("fallback");
  }
}

function makeSlot(card){
  const s = document.createElement("div");
  s.className = "slot";
  if(card){
    const face = document.createElement("div");
    face.className = "cardFace fallback";

    const nm = document.createElement("div");
    nm.className="cardName";
    nm.textContent = card.name;

    const b1 = document.createElement("div");
    b1.className="badge";
    b1.textContent=`No.${card.no}`;

    const b2 = document.createElement("div");
    b2.className="badge atk";
    b2.textContent=`ATK ${card.atk}`;

    face.appendChild(b1); face.appendChild(b2); face.appendChild(nm);
    s.appendChild(face);

    // 長押しで詳細
    let holdTimer=null;
    const open=()=>openViewer(card);
    const startHold=()=>{ clearTimeout(holdTimer); holdTimer=setTimeout(open,420); };
    const endHold=()=>clearTimeout(holdTimer);

    s.addEventListener("mousedown", startHold);
    s.addEventListener("mouseup", endHold);
    s.addEventListener("mouseleave", endHold);
    s.addEventListener("touchstart", startHold, {passive:true});
    s.addEventListener("touchend", endHold, {passive:true});
  }
  return s;
}

async function renderStage(){
  // 相手E
  el.aiEff.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.eff[i];
    const slot = makeSlot(c);
    if(c){
      const face = slot.querySelector(".cardFace");
      await setCardFaceImage(face, c);
    }
    el.aiEff.appendChild(slot);
  }

  // 相手C
  el.aiStage.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.stage[i];
    const slot = makeSlot(c);
    if(c){
      const face = slot.querySelector(".cardFace");
      await setCardFaceImage(face, c);
    }
    el.aiStage.appendChild(slot);
  }

  // 自分C（登場）
  el.p1Stage.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.stage[i];
    const slot = makeSlot(c);

    slot.addEventListener("click", ()=>{
      if(state.phase!=="MAIN"){ log("MAINで登場できます", "muted"); return; }
      if(state.P1.stage[i]){ log("ここは埋まっています", "muted"); return; }
      if(state.selectedHand==null){ log("先に手札をタップしてください", "muted"); return; }
      const hc = state.P1.hand[state.selectedHand];
      state.P1.stage[i]=hc;
      state.P1.hand.splice(state.selectedHand,1);
      state.selectedHand=null;
      log(`登場：${hc.name}`, "muted");
      renderAll();
    }, {passive:true});

    if(c){
      const face = slot.querySelector(".cardFace");
      await setCardFaceImage(face, c);
    }
    el.p1Stage.appendChild(slot);
  }

  // 自分E
  el.p1Eff.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.eff[i];
    const slot = makeSlot(c);
    if(c){
      const face = slot.querySelector(".cardFace");
      await setCardFaceImage(face, c);
    }
    el.p1Eff.appendChild(slot);
  }
}

async function renderHand(){
  el.hand.innerHTML="";
  for(let idx=0; idx<state.P1.hand.length; idx++){
    const c = state.P1.hand[idx];
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

    await setCardFaceImage(face, c);

    h.addEventListener("click", ()=>{
      state.selectedHand = (state.selectedHand===idx) ? null : idx;
      log(`手札タップ：${c.name}`, "muted");
      renderAll();
    }, {passive:true});

    // 長押し詳細
    let holdTimer=null;
    const open=()=>openViewer(c);
    const startHold=()=>{ clearTimeout(holdTimer); holdTimer=setTimeout(open,420); };
    const endHold=()=>clearTimeout(holdTimer);
    h.addEventListener("mousedown", startHold);
    h.addEventListener("mouseup", endHold);
    h.addEventListener("mouseleave", endHold);
    h.addEventListener("touchstart", startHold, {passive:true});
    h.addEventListener("touchend", endHold, {passive:true});

    el.hand.appendChild(h);
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

async function renderAll(){
  renderCounts();
  await applyField();
  await renderStage();
  await renderHand();

  // 画像が無いカード番号をログで一括提示（康臣さんの“手間最小”用）
  const missing = [];
  for(const c of Cards){
    const u = await resolveCardUrl(c);
    if(!u) missing.push(pad2(c.no));
  }
  if(missing.length){
    log(`カード画像が未検出：${missing.join(", ")}（右上「画像設定」で一括貼り付けできます）`, "warn");
  }else{
    log("OK カード画像：20種すべて検出", "muted");
  }
}

/* ===== Viewer ===== */
async function openViewer(card){
  el.viewerTitle.textContent = `No.${card.no} ${card.name}`;
  el.viewerText.textContent = card.text || "";
  const url = await resolveCardUrl(card);
  el.viewerImg.src = url || "";
  el.viewerModal.classList.add("show");
}
function closeViewer(){ el.viewerModal.classList.remove("show"); }

/* ===== 画像設定 ===== */
function openImgModal(){
  el.imgModal.classList.add("show");
  el.fieldInput.value = localStorage.getItem(LS_FIELD) || "";
  const map = getSavedMap();
  const lines = Object.keys(map).sort().map(k=>`${k}=${map[k]}`);
  el.bulkMap.value = lines.join("\n");
}
function closeImgModal(){ el.imgModal.classList.remove("show"); }

function saveField(){
  const v = (el.fieldInput.value || "").trim();
  if(v){
    localStorage.setItem(LS_FIELD, v);
    log(`保存：フィールドURL = ${v}`, "muted");
  }else{
    localStorage.removeItem(LS_FIELD);
    log("フィールドURL：自動探索に戻しました", "muted");
  }
  renderAll();
}

function saveBulkMap(){
  const raw = el.bulkMap.value || "";
  const map = {};
  raw.split("\n").forEach(line=>{
    const s = line.trim();
    if(!s) return;
    const idx = s.indexOf("=");
    if(idx<0) return;
    const k = s.slice(0,idx).trim();
    const v = s.slice(idx+1).trim();
    if(!k || !v) return;
    map[k.padStart(2,"0")] = v;
  });
  setSavedMap(map);
  log(`保存：カード画像マップ ${Object.keys(map).length}件`, "muted");
  renderAll();
}
function clearMap(){
  localStorage.removeItem(LS_MAP);
  el.bulkMap.value = "";
  log("カード画像マップ：全消ししました", "muted");
  renderAll();
}

/* ===== Flow ===== */
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
  state.P1.eff=[null,null,null];
  state.AI.eff=[null,null,null];

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
  el.bootStatus.textContent = "JS: OK（読み込み成功）";
  el.jsChip.textContent = "JS: OK";
  log("JS起動OK", "muted");

  const start = ()=>{
    if(state.started) return;
    state.started=true;
    log("タイトルタップ：開始", "muted");
    startToGame();
  };

  el.btnStart.addEventListener("click", start, {passive:true});
  el.btnStart.addEventListener("touchend", start, {passive:true});
  el.titleScreen.addEventListener("click", start, {passive:true});
  el.titleScreen.addEventListener("touchend", start, {passive:true});

  el.btnNextPhase.addEventListener("click", nextPhase, {passive:true});
  el.btnEndTurn.addEventListener("click", endTurn, {passive:true});

  el.viewerClose.addEventListener("click", closeViewer, {passive:true});
  el.viewerCloseBtn.addEventListener("click", closeViewer, {passive:true});

  el.btnImages.addEventListener("click", openImgModal, {passive:true});
  el.imgClose.addEventListener("click", closeImgModal, {passive:true});
  el.imgCloseBtn.addEventListener("click", closeImgModal, {passive:true});
  el.btnSaveField.addEventListener("click", saveField, {passive:true});
  el.btnSaveMap.addEventListener("click", saveBulkMap, {passive:true});
  el.btnClearMap.addEventListener("click", clearMap, {passive:true});
}

document.addEventListener("DOMContentLoaded", bindUI);