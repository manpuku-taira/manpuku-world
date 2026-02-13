/* =========================================================
  Manpuku World - Shield/Turn Visibility v40004
  - Random first/second displayed
  - Active turn clearly shown (HUD + board glow)
  - Shield displayed as facedown 3 cards (black back)
  - Enemy hand hidden: backs only + count
  - Back image optional: assets/card_back.png(jpg) auto-detect
========================================================= */

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
  if(el.logM.classList.contains("show")) renderLogModal();
}
window.addEventListener("error", (e)=> log(`JSエラー: ${e.message || e.type}`, "warn"));
window.addEventListener("unhandledrejection", (e)=> log(`Promiseエラー: ${String(e.reason || "")}`, "warn"));

function renderLogModal(){
  el.logBody.innerHTML = "";
  if(!LOGS.length){
    const d = document.createElement("div");
    d.className = "logLine muted";
    d.textContent = "（ログはまだありません）";
    el.logBody.appendChild(d);
    return;
  }
  for(const it of LOGS.slice(0, 160)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------- Storage Keys ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v4";

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){
  return (t || "")
    .replaceAll("又は","または")
    .replaceAll("出来る","できる");
}

/* ---------- Starter deck (20 types x2) ---------- */
const CardRegistry = Array.from({length:20}, (_,i)=> {
  const no = i+1;
  const rank = ((i%5)+1);
  const atkMax = rank*500;
  const atk = atkMax; // placeholder
  return {
    no,
    name: `カード${no}`, // filename-based if available
    rank,
    atk,
    type: "character",
    text: normalizeText("（テキストは後で確定）"),
  };
});

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push({...c});
    deck.push({...c});
  }
  shuffle(deck);
  return deck;
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

/* ---------- Game State ---------- */
const state = {
  started:false,
  turn:1,
  phase:"START",

  // active turn side
  activeSide: "P1",         // "P1" or "AI"
  firstSide: "P1",          // start side
  normalSummonUsed:false,

  selectedHandIndex:null,
  selectedAttackerPos:null,

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: {
    fieldUrl:"",
    backUrl:"",             // optional card back image
    cardUrlByNo:{},
    cardFileByNo:{},
    ready:false,
  },

  busyAI:false,
};

function setActiveUI(){
  const you = (state.activeSide==="P1");
  el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
  el.chipActive.classList.toggle("enemy", !you);

  el.matRoot.classList.toggle("youTurn", you);
  el.matRoot.classList.toggle("enemyTurn", !you);

  // buttons: during AI turn, prevent accidental taps
  el.btnNext.disabled = !you;
  el.btnEnd.disabled  = !you;
  el.btnNext.style.opacity = you ? "1" : ".45";
  el.btnEnd.style.opacity  = you ? "1" : ".45";
}

function updateHUD(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  setActiveUI();
}

function updateCounts(){
  el.aiDeckN.textContent = state.AI.deck.length;
  el.aiWingN.textContent = state.AI.wing.length;
  el.aiOutN.textContent = state.AI.outside.length;

  el.pDeckN.textContent = state.P1.deck.length;
  el.pWingN.textContent = state.P1.wing.length;
  el.pOutN.textContent = state.P1.outside.length;
}

/* ---------- GitHub API Image Auto Detection ---------- */
function getRepo(){
  return localStorage.getItem(LS_REPO) || "manpuku-taira/manpuku-world";
}
function setRepo(v){ localStorage.setItem(LS_REPO, v); }
function getCache(){
  try{ return JSON.parse(localStorage.getItem(LS_IMG_CACHE) || "{}"); }catch{ return {}; }
}
function setCache(obj){ localStorage.setItem(LS_IMG_CACHE, JSON.stringify(obj)); }
function clearCache(){ localStorage.removeItem(LS_IMG_CACHE); }

async function ghList(path){
  const repo = getRepo();
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=main`;
  const res = await fetch(url, { headers: { "Accept":"application/vnd.github+json" }});
  if(!res.ok) throw new Error(`GitHub API NG: ${res.status}`);
  const data = await res.json();
  if(!Array.isArray(data)) return [];
  return data.filter(x=>x && x.type === "file").map(x=>x.name);
}

function encFile(name){ return encodeURIComponent(name); }
function vercelPathCards(filename){ return `/assets/cards/${encFile(filename)}`; }
function vercelPathAssets(filename){ return `/assets/${encFile(filename)}`; }

function pickFieldFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());
  const idx = lowers.findIndex(n=>n.startsWith("field."));
  if(idx>=0) return assetFiles[idx];

  const cand = ["field.png.jpg","field.jpg","field.png","field.jpeg","field.PNG","field.JPG"];
  for(const c of cand){
    const k = assetFiles.findIndex(n=>n.toLowerCase() === c.toLowerCase());
    if(k>=0) return assetFiles[k];
  }
  return "";
}

// NEW: card back autodetect: card_back.* or back.*
function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());
  const pri = ["card_back.png","card_back.jpg","card_back.jpeg","cardback.png","cardback.jpg","back.png","back.jpg","back.jpeg"];
  for(const p of pri){
    const i = lowers.findIndex(n=>n === p);
    if(i>=0) return assetFiles[i];
  }
  const idx = lowers.findIndex(n=>n.startsWith("card_back."));
  if(idx>=0) return assetFiles[idx];
  const idx2 = lowers.findIndex(n=>n.startsWith("back."));
  if(idx2>=0) return assetFiles[idx2];
  return "";
}

function scoreCardFilename(name, no){
  const s = name.toLowerCase();
  const p2 = pad2(no).toLowerCase();
  const p1 = String(no).toLowerCase();
  let score = 0;
  if(s.startsWith(`${p2}_`)) score += 100;
  if(s.startsWith(`${p1}_`)) score += 80;
  if(s.startsWith(`${p2}.`)) score += 70;
  if(s.startsWith(`${p1}.`)) score += 60;
  if(s.includes(`${p2}_`)) score += 30;
  if(s.includes(`${p1}_`)) score += 20;
  if(s.includes(".jpg")) score += 5;
  if(s.includes(".png")) score += 5;
  if(s.includes(".jpeg")) score += 4;
  if(s.includes(".png.jpg") || s.includes(".png.jpeg")) score += 6;
  return score;
}
function buildCardMapFromFileList(cardFiles){
  const map = {};
  for(let no=1; no<=20; no++){
    let best = {name:"", score:-1};
    for(const f of cardFiles){
      const sc = scoreCardFilename(f, no);
      if(sc > best.score) best = {name:f, score:sc};
    }
    if(best.score >= 60) map[pad2(no)] = best.name;
  }
  return map;
}
async function validateImage(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=> resolve(true);
    img.onerror = ()=> resolve(false);
    img.src = url;
  });
}

function stripExtAll(name){
  let base = name;
  for(let i=0;i<3;i++){
    const dot = base.lastIndexOf(".");
    if(dot <= 0) break;
    const ext = base.slice(dot+1).toLowerCase();
    if(["png","jpg","jpeg","webp","gif"].includes(ext)) base = base.slice(0,dot);
    else break;
  }
  return base;
}
function nameFromFilename(filename, no){
  let base = stripExtAll(filename);
  base = base.replace(new RegExp(`^${pad2(no)}_`), "");
  base = base.replace(new RegExp(`^${no}_`), "");
  base = base.replaceAll("_"," ");
  base = base.trim();
  return base || `カード${no}`;
}
function applyNamesFromMap(cardMap){
  for(let no=1; no<=20; no++){
    const k = pad2(no);
    const fn = cardMap[k];
    if(fn) CardRegistry[no-1].name = nameFromFilename(fn, no);
  }
}

async function rescanImages(){
  state.img.ready = false;
  log("画像スキャン開始：GitHubから assets を取得します…", "muted");

  const cache = {};
  const repo = getRepo();

  try{
    const [assetFiles, cardFiles] = await Promise.all([
      ghList("assets"),
      ghList("assets/cards"),
    ]);

    cache.repo = repo;
    cache.assetFiles = assetFiles;
    cache.cardFiles = cardFiles;
    cache.scannedAt = Date.now();

    cache.fieldFile = pickFieldFile(assetFiles) || "";
    cache.backFile  = pickBackFile(assetFiles) || "";
    cache.cardMap   = buildCardMapFromFileList(cardFiles);

    setCache(cache);

    if(cache.fieldFile) log(`OK フィールド検出: ${cache.fieldFile}`, "muted");
    else log("NG フィールド未検出（assets/field.* を確認）", "warn");

    if(cache.backFile) log(`OK 裏面検出: ${cache.backFile}`, "muted");
    else log("裏面：未設定（黒い裏面で動作）", "muted");

    const mapped = Object.keys(cache.cardMap || {}).length;
    if(mapped >= 20) log("OK カード画像：No.01〜20を自動紐付け", "muted");
    else log(`注意：カード画像自動紐付け不足（${mapped}/20）`, "warn");

  }catch(err){
    log(`NG GitHub API取得失敗：${String(err.message || err)}`, "warn");
  }

  await applyImagesFromCache();
}

async function applyImagesFromCache(){
  const cache = getCache();
  if(cache.repo && cache.repo !== getRepo()){
    log("画像キャッシュは別リポジトリのため破棄します", "warn");
    clearCache();
    return;
  }

  // Field
  state.img.fieldUrl = "";
  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)){
      state.img.fieldUrl = u;
      el.fieldTop.style.backgroundImage = `url("${u}")`;
      el.fieldBottom.style.backgroundImage = `url("${u}")`;
      log("OK フィールド読込：上下同時表示", "muted");
    }else{
      log(`NG フィールド読込失敗: ${u}`, "warn");
      el.fieldTop.style.backgroundImage = "";
      el.fieldBottom.style.backgroundImage = "";
    }
  }else{
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
  }

  // Back
  state.img.backUrl = "";
  if(cache.backFile){
    const b = vercelPathAssets(cache.backFile);
    if(await validateImage(b)){
      state.img.backUrl = b;
      log("OK 裏面読込：適用", "muted");
    }else{
      log(`NG 裏面読込失敗: ${b}（黒で継続）`, "warn");
      state.img.backUrl = "";
    }
  }

  // Cards
  state.img.cardUrlByNo = {};
  state.img.cardFileByNo = {};
  const map = cache.cardMap || {};
  applyNamesFromMap(map);

  for(const k of Object.keys(map)){
    const file = map[k];
    state.img.cardFileByNo[k] = file;
    state.img.cardUrlByNo[k] = vercelPathCards(file);
  }

  state.img.ready = true;

  const miss = [];
  for(let no=1; no<=20; no++){
    const key = pad2(no);
    if(!state.img.cardUrlByNo[key]) miss.push(key);
  }
  if(miss.length) log(`カード画像未検出：${miss.join(", ")}`, "warn");
  else log("カード画像：20種すべて検出", "muted");

  renderAll();
}

/* ---------- Rendering helpers ---------- */
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

function faceForCard(card, isEnemy=false){
  const face = document.createElement("div");
  face.className = "face";
  const url = state.img.cardUrlByNo[pad2(card.no)];
  if(url){
    face.style.backgroundImage = `url("${url}")`;
  }else{
    face.classList.add("fallback");
  }
  if(isEnemy) face.style.transform = "rotate(180deg)";
  return face;
}

function makeSlot(card, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");
  if(card){
    slot.appendChild(faceForCard(card, !!opts.enemy));
    bindLongPress(slot, ()=> openViewer(card));
  }
  return slot;
}

/* ---------- Modals ---------- */
function showModal(id){ $(id).classList.add("show"); }
function hideModal(id){ $(id).classList.remove("show"); }

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
  el.viewerTitle.textContent = `${card.name}`;
  el.viewerText.textContent = (card.text || "");
  const url = state.img.cardUrlByNo[pad2(card.no)];
  el.viewerImg.src = url || "";
  showModal("viewerM");
}

function openZone(title, cards){
  el.zoneTitle.textContent = title;
  el.zoneList.innerHTML = "";

  if(!cards.length){
    const empty = document.createElement("div");
    empty.className = "logLine muted";
    empty.textContent = "（空です）";
    el.zoneList.appendChild(empty);
  }else{
    cards.forEach((c)=>{
      const it = document.createElement("div");
      it.className = "zoneItem";

      const th = document.createElement("div");
      th.className = "zThumb";
      const url = state.img.cardUrlByNo[pad2(c.no)];
      if(url) th.style.backgroundImage = `url("${url}")`;

      const meta = document.createElement("div");
      meta.className = "zMeta";
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = `${c.name}`;
      const s = document.createElement("div");
      s.className = "s";
      s.textContent = `RANK ${c.rank} / ATK ${c.atk}`;

      meta.appendChild(t); meta.appendChild(s);
      it.appendChild(th); it.appendChild(meta);

      it.addEventListener("click", ()=> openViewer(c), {passive:true});
      el.zoneList.appendChild(it);
    });
  }
  showModal("zoneM");
}

/* ---------- Confirm ---------- */
let confirmYes = null;
function askConfirm(title, body, onYes){
  el.confirmTitle.textContent = title;
  el.confirmBody.textContent = body;
  confirmYes = onYes;
  showModal("confirmM");
}
el.btnNo.addEventListener("click", ()=> hideModal("confirmM"), {passive:true});
el.btnYes.addEventListener("click", ()=>{
  hideModal("confirmM");
  if(confirmYes){ const fn = confirmYes; confirmYes=null; fn(); }
}, {passive:true});

/* ---------- Turn / Phase ---------- */
function setActiveSide(side){
  state.activeSide = side;
  setActiveUI();
}

function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  state.phase = PHASES[(i+1)%PHASES.length];

  if(state.phase==="START"){
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
  }

  if(state.phase==="DRAW"){
    draw(state.activeSide, 1);
    log(`${state.activeSide==="P1"?"あなた":"AI"}：ドロー +1`, "muted");
  }

  if(state.phase==="MAIN"){
    if(state.activeSide==="AI") aiMain();
  }

  if(state.phase==="BATTLE"){
    state.selectedAttackerPos = null;
    if(state.activeSide==="AI") aiBattle();
  }

  if(state.phase==="END"){
    enforceHandLimit(state.activeSide);
  }

  updateHUD();
  renderAll();

  // If AI turn, auto-advance to keepテンポ
  if(state.activeSide==="AI") autoAdvanceAI();
}

function endTurn(){
  // finish end phase effects already handled by NEXT (but allow END anytime)
  state.phase = "END";
  enforceHandLimit(state.activeSide);

  if(state.activeSide==="P1"){
    // switch to AI
    setActiveSide("AI");
    state.phase = "START";
    log("相手のターン開始", "warn");
    updateHUD(); renderAll();
    autoAdvanceAI(true);
  }else{
    // switch to you, increment turn count (1ターン=両者が動くのではなく、ここでは便宜上「あなたのターン開始」をTURN+1扱い）
    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    updateHUD(); renderAll();
  }
}

/* AI auto flow (START→DRAW→MAIN→BATTLE→END→endTurn) */
function autoAdvanceAI(forceStart=false){
  if(state.busyAI) return;
  if(state.activeSide!=="AI") return;

  state.busyAI = true;

  const step = ()=>{
    if(state.activeSide!=="AI"){ state.busyAI=false; return; }

    // ensure start
    if(forceStart){
      forceStart=false;
      state.phase = "START";
      updateHUD(); renderAll();
    }

    // advance until END then endTurn
    if(state.phase !== "END"){
      nextPhase();
      setTimeout(step, 320);
      return;
    }

    // END reached -> switch to you
    setTimeout(()=>{
      state.busyAI=false;
      endTurn();
    }, 420);
  };

  setTimeout(step, 260);
}

/* ---------- Deck / Hand / Shield ---------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（ドロー不能）`, "warn");
      if(side==="P1") log("敗北：デッキ切れ", "warn");
      else log("勝利：相手デッキ切れ", "muted");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}

function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限でウイングへ → ${c.name}`, "muted");
  }
}

/* ---------- Game start ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
  state.normalSummonUsed = false;
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  state.busyAI = false;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  // shield: top3
  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  // hand 4
  state.P1.hand = [];
  state.AI.hand = [];
  draw("P1", 4);
  draw("AI", 4);

  state.P1.C = [null,null,null];
  state.AI.C = [null,null,null];
  state.P1.E = [null,null,null];
  state.AI.E = [null,null,null];
  state.P1.wing = [];
  state.AI.wing = [];
  state.P1.outside = [];
  state.AI.outside = [];

  // random first/second
  state.firstSide = (Math.random() < 0.5) ? "P1" : "AI";
  setActiveSide(state.firstSide);

  // show who goes first
  if(state.firstSide==="P1"){
    el.firstInfo.textContent = "先攻：あなた";
    log("先攻：あなた", "muted");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
  }

  log("ゲーム開始：シールド3（裏向き）/ 初手4", "muted");

  updateHUD();
  renderAll();

  // If AI is first, auto start
  if(state.activeSide==="AI"){
    log("相手のターン開始", "warn");
    autoAdvanceAI(true);
  }else{
    log("あなたのターン開始", "muted");
  }
}

/* ---------- Rendering ---------- */
function renderZones(){
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++) el.aiE.appendChild(makeSlot(state.AI.E[i], {enemy:true}));

  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && !state.normalSummonUsed && state.selectedHandIndex!=null && !c);
    const sel = (state.selectedAttackerPos===i);
    const slot = makeSlot(c, {glow, sel});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c) bindLongPress(slot, ()=> onLongPressEmptySlotForKenSan(i));
    el.pC.appendChild(slot);
  }

  el.pE.innerHTML = "";
  for(let i=0;i<3;i++) el.pE.appendChild(makeSlot(state.P1.E[i]));
}

function renderHand(){
  el.hand.innerHTML = "";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className = "handCard";

    const playable = (state.activeSide==="P1" && state.phase==="MAIN" && !state.normalSummonUsed);
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}")`;
      h.style.backgroundSize = "cover";
      h.style.backgroundPosition = "center";
    }

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1") return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=> openViewer(c));
    el.hand.appendChild(h);
  }
}

// Enemy hand: backs only (count visible, content hidden)
function renderEnemyHand(){
  el.aiHand.innerHTML = "";
  const n = state.AI.hand.length;
  const show = Math.min(n, 12);
  for(let i=0;i<show;i++){
    const b = document.createElement("div");
    b.className = "handBack";
    if(state.img.backUrl){
      b.style.backgroundImage = `url("${state.img.backUrl}")`;
    }
    el.aiHand.appendChild(b);
  }
  if(n > show){
    const more = document.createElement("div");
    more.className = "handBack";
    more.textContent = `+${n-show}`;
    more.style.display = "flex";
    more.style.alignItems = "center";
    more.style.justifyContent = "center";
    more.style.fontWeight = "1000";
    more.style.color = "rgba(233,236,255,.92)";
    el.aiHand.appendChild(more);
  }
}

// Shield slots: show back if shield exists else dim
function renderShields(){
  const nodes = document.querySelectorAll(".shieldSlot");
  nodes.forEach((cell)=>{
    const side = cell.getAttribute("data-side");
    const idx = Number(cell.getAttribute("data-idx") || "0");
    const back = cell.querySelector(".backCard");
    const exists = !!state[side].shield[idx];
    back.classList.toggle("empty", !exists);

    if(state.img.backUrl){
      back.style.backgroundImage = exists ? `url("${state.img.backUrl}")` : "";
    }else{
      back.style.backgroundImage = "";
    }

    // click to attack shield only when it is enemy shield and player is attacking and enemy has no chars
    cell.onclick = ()=>{
      if(side==="AI") onClickEnemyShield(idx);
    };
  });
}

function renderAll(){
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
}

/* ---------- Battle / Summon ---------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];

    if(state.normalSummonUsed){
      log("登場（通常召喚）はターン1回です", "warn");
      return;
    }
    if(card.rank >= 5){
      log("RANK5以上は見参（空スロット長押し）です", "warn");
      return;
    }

    state.P1.C[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    state.normalSummonUsed = true;
    log(`登場：${card.name}`, "muted");
    renderAll();
    return;
  }

  if(state.phase === "BATTLE"){
    if(!state.P1.C[pos]) return;
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }
}

function onLongPressEmptySlotForKenSan(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(card.rank < 5) return;

  if(state.P1.hand.length < 2){
    log("見参：仮コスト（手札1枚）が足りません", "warn");
    return;
  }

  askConfirm("見参（仮）", `${card.name} を見参しますか？\n仮コスト：手札を1枚ウイングへ送ります`, ()=>{
    const discIdx = (state.selectedHandIndex===state.P1.hand.length-1) ? 0 : state.P1.hand.length-1;
    const disc = state.P1.hand.splice(discIdx,1)[0];
    state.P1.wing.push(disc);

    const c2 = state.P1.hand.splice(state.selectedHandIndex,1)[0];
    state.P1.C[pos]=c2;

    state.selectedHandIndex=null;
    log(`見参：${c2.name}`, "muted");
    renderAll();
  });
}

function onClickEnemyCard(enemyPos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  const defCard = state.AI.C[enemyPos];
  if(!atkCard || !defCard) return;

  askConfirm("攻撃確認", `${atkCard.name} → ${defCard.name}\n攻撃しますか？`, ()=>{
    resolveBattle_CvC("P1", state.selectedAttackerPos, "AI", enemyPos);
    state.selectedAttackerPos = null;
    renderAll();
  });
}

function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  log(`バトル：${A.name}(${A.atk}) vs ${D.name}(${D.atk})`, "muted");

  if(A.atk === D.atk){
    state[aSide].C[aPos]=null;
    state[dSide].C[dPos]=null;
    state[aSide].wing.push(A);
    state[dSide].wing.push(D);
    log("同値処理：相打ち（両方ウイング）", "muted");
    return;
  }

  if(A.atk > D.atk){
    state[dSide].C[dPos]=null;
    state[dSide].wing.push(D);
    log(`破壊：${D.name} → ウイング`, "muted");
  }else{
    state[aSide].C[aPos]=null;
    state[aSide].wing.push(A);
    log(`破壊：${A.name} → ウイング`, "muted");
  }
}

// Player attacks shield (if no enemy characters)
function onClickEnemyShield(idx){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  if(!atkCard) return;

  const enemyHasC = state.AI.C.some(Boolean);
  if(enemyHasC){
    log("相手キャラがいる間はシールドを攻撃できません", "warn");
    return;
  }

  if(!state.AI.shield[idx]){
    log("そのシールドは既にありません", "warn");
    return;
  }

  askConfirm("攻撃確認", `${atkCard.name} がシールドを攻撃します。\nシールドを破壊（→相手手札）しますか？`, ()=>{
    const sh = state.AI.shield[idx];
    state.AI.shield[idx] = null;
    state.AI.hand.push(sh);
    log(`シールド破壊：相手手札へ → ${sh.name}`, "muted");

    // victory check: all shields gone and direct attack
    if(state.AI.shield.every(x=>!x)){
      log("相手シールド全破壊：次の攻撃でダイレクト可能", "muted");
    }

    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- AI ---------- */
function aiMain(){
  const empty = state.AI.C.findIndex(x=>!x);
  if(empty>=0){
    const idx = state.AI.hand.findIndex(c=>c.rank<=4);
    if(idx>=0){
      const c = state.AI.hand.splice(idx,1)[0];
      state.AI.C[empty]=c;
      log(`AI：登場 → ${c.name}`, "muted");
    }
  }

  for(let tries=0; tries<3; tries++){
    const empty2 = state.AI.C.findIndex(x=>!x);
    const idx5 = state.AI.hand.findIndex(c=>c.rank>=5);
    if(empty2<0 || idx5<0 || state.AI.hand.length<2) break;
    const disc = state.AI.hand.pop();
    state.AI.wing.push(disc);
    const c = state.AI.hand.splice(idx5,1)[0];
    state.AI.C[empty2]=c;
    log(`AI：見参（仮）→ ${c.name}`, "muted");
  }
}

function aiBattle(){
  // each AI character attacks once
  for(let i=0;i<3;i++){
    const atk = state.AI.C[i];
    if(!atk) continue;

    const playerIdxs = state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(playerIdxs.length){
      const t = playerIdxs[Math.floor(Math.random()*playerIdxs.length)];
      resolveBattle_CvC("AI", i, "P1", t);
    }else{
      // attack shields if any, else direct
      const sidx = state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        const sh = state.P1.shield[sidx];
        state.P1.shield[sidx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊 → あなた手札へ ${sh.name}`, "warn");
      }else{
        log("敗北：相手のダイレクトアタック", "warn");
      }
    }
  }
}

/* ---------- Board clicks ---------- */
function bindBoardClicks(){
  const grid = $("grid");
  grid.addEventListener("click", (e)=>{
    const t = e.target.closest(".cell");
    if(!t) return;
    const act = t.getAttribute("data-click");
    if(!act) return;

    if(act==="aiWing") openZone("ENEMY WING", state.AI.wing.slice().reverse());
    if(act==="aiOutside") openZone("ENEMY OUTSIDE", state.AI.outside.slice().reverse());

    if(act==="pWing") openZone("YOUR WING", state.P1.wing.slice().reverse());
    if(act==="pOutside") openZone("YOUR OUTSIDE", state.P1.outside.slice().reverse());
  }, {passive:true});
}

/* ---------- UI binds ---------- */
function bindStart(){
  el.boot.textContent = "JS: OK（読み込み成功）";
  const go = ()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    log("対戦画面：表示OK", "muted");
    startGame();
  };
  el.btnStart.addEventListener("click", go, {passive:true});
  el.title.addEventListener("click", go, {passive:true});
}

function bindHUDButtons(){
  el.btnHelp.addEventListener("click", ()=> showModal("helpM"), {passive:true});
  el.btnSettings.addEventListener("click", ()=>{
    el.repoInput.value = getRepo();
    showModal("settingsM");
  }, {passive:true});
}

function bindSettings(){
  el.btnRepoSave.addEventListener("click", async ()=>{
    const v = (el.repoInput.value || "").trim();
    if(!v.includes("/")){
      log("設定NG：owner/repo 形式で入力してください", "warn");
      return;
    }
    setRepo(v);
    clearCache();
    log(`設定：リポジトリ = ${v}`, "muted");
    await rescanImages();
  }, {passive:true});

  el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});

  el.btnClearCache.addEventListener("click", ()=>{
    clearCache();
    log("画像キャッシュを消去しました", "muted");
    state.img.ready=false;
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
    state.img.cardUrlByNo = {};
    state.img.cardFileByNo = {};
    state.img.backUrl = "";
    renderAll();
  }, {passive:true});
}

function bindPhaseButtons(){
  el.btnNext.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
    nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
    endTurn();
  }, {passive:true});
}

/* LOG button: long-press opens modal */
function bindLogButton(){
  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 360);
}

/* ---------- Init ---------- */
async function init(){
  el.boot.textContent = "JS: OK（初期化中…）";
  updateHUD();

  bindStart();
  bindHUDButtons();
  bindSettings();
  bindPhaseButtons();
  bindBoardClicks();
  bindLogButton();

  const cache = getCache();
  if(cache && cache.assetFiles && cache.cardFiles && cache.repo === getRepo()){
    log("画像：キャッシュを使用（必要なら設定→再取得）", "muted");
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent = "JS: OK（準備完了）";
  log("盤面は常時フル表示／詳細は長押し／シールドは裏向きで表示", "muted");
}

document.addEventListener("DOMContentLoaded", init);