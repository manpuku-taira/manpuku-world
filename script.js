/* =========================================================
  Manpuku World - Product Base v40002
  FIX:
   - Encode filenames (Japanese / spaces / .png.JPG) so images load
   - Auto set card names from detected filenames
   - Ensure field shows both halves + board stays tappable on mobile
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
  chipWho: $("chipWho"),
  chipNet: $("chipNet"),

  btnHelp: $("btnHelp"),
  btnSettings: $("btnSettings"),
  btnNext: $("btnNext"),
  btnEnd: $("btnEnd"),

  fieldTop: $("fieldTop"),
  fieldBottom: $("fieldBottom"),

  aiC: $("aiC"),
  aiE: $("aiE"),
  pC: $("pC"),
  pE: $("pE"),
  hand: $("hand"),

  aiDeckN: $("aiDeckN"),
  aiShieldN: $("aiShieldN"),
  aiWingN: $("aiWingN"),
  aiOutN: $("aiOutN"),
  pDeckN: $("pDeckN"),
  pShieldN: $("pShieldN"),
  pWingN: $("pWingN"),
  pOutN: $("pOutN"),

  log: $("log"),
  btnLog: $("btnLog"),

  arrowLine: $("arrowLine"),

  viewerM: $("viewerM"),
  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),

  zoneM: $("zoneM"),
  zoneTitle: $("zoneTitle"),
  zoneList: $("zoneList"),

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
function log(msg, kind="muted"){
  const d = document.createElement("div");
  d.className = `logLine ${kind}`;
  d.textContent = msg;
  el.log.prepend(d);
}
window.addEventListener("error", (e)=> log(`JSエラー: ${e.message || e.type}`, "warn"));
window.addEventListener("unhandledrejection", (e)=> log(`Promiseエラー: ${String(e.reason || "")}`, "warn"));

/* ---------- Storage Keys ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v3";

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){
  return (t || "")
    .replaceAll("又は","または")
    .replaceAll("出来る","できる");
}

/* ---------- Starter deck (20 types x2) ----------
   name is auto-filled from filename if detected
-------------------------------------------------- */
const CardRegistry = Array.from({length:20}, (_,i)=> {
  const no = i+1;
  const rank = ((i%5)+1);
  const atkMax = rank*500;
  const atk = atkMax; // placeholder
  return {
    no,
    name: `カード${no}`, // will be overwritten by filename-derived name if available
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
  normalSummonUsed:false,

  selectedHandIndex:null,
  selectedAttackerPos:null,

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: {
    fieldUrl:"",
    cardUrlByNo:{},      // "01" -> "/assets/cards/<encoded>"
    cardFileByNo:{},     // "01" -> original filename
    ready:false,
  }
};

function updateTop(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  el.chipWho.textContent = "YOU";
  el.chipNet.textContent = state.img.ready ? "IMG: OK" : "IMG: ...";
}
function updateCounts(){
  el.aiDeckN.textContent = state.AI.deck.length;
  el.aiShieldN.textContent = state.AI.shield.length;
  el.aiWingN.textContent = state.AI.wing.length;
  el.aiOutN.textContent = state.AI.outside.length;

  el.pDeckN.textContent = state.P1.deck.length;
  el.pShieldN.textContent = state.P1.shield.length;
  el.pWingN.textContent = state.P1.wing.length;
  el.pOutN.textContent = state.P1.outside.length;
}

/* ---------- GitHub API Image Auto Detection ---------- */
function getRepo(){
  return localStorage.getItem(LS_REPO) || "manpuku-taira/manpuku-world";
}
function setRepo(v){
  localStorage.setItem(LS_REPO, v);
}
function getCache(){
  try{ return JSON.parse(localStorage.getItem(LS_IMG_CACHE) || "{}"); }catch{ return {}; }
}
function setCache(obj){
  localStorage.setItem(LS_IMG_CACHE, JSON.stringify(obj));
}
function clearCache(){
  localStorage.removeItem(LS_IMG_CACHE);
}

async function ghList(path){
  const repo = getRepo();
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=main`;
  const res = await fetch(url, { headers: { "Accept":"application/vnd.github+json" }});
  if(!res.ok) throw new Error(`GitHub API NG: ${res.status}`);
  const data = await res.json();
  if(!Array.isArray(data)) return [];
  return data.filter(x=>x && x.type === "file").map(x=>x.name);
}

/* IMPORTANT: encode filenames so Japanese names work */
function encFile(name){
  return encodeURIComponent(name);
}
function vercelPathCards(filename){
  return `/assets/cards/${encFile(filename)}`;
}
function vercelPathAssets(filename){
  return `/assets/${encFile(filename)}`;
}

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
      if(sc > best.score){
        best = {name:f, score:sc};
      }
    }
    if(best.score >= 60){
      map[pad2(no)] = best.name;
    }
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

/* filename -> card display name */
function stripExtAll(name){
  let base = name;
  // remove multiple extensions (".png.JPG" etc)
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
  // remove leading "01_" or "1_" etc
  base = base.replace(new RegExp(`^${pad2(no)}_`), "");
  base = base.replace(new RegExp(`^${no}_`), "");
  // visual cleanup
  base = base.replaceAll("_"," ");
  base = base.trim();
  return base || `カード${no}`;
}

/* apply derived names to registry */
function applyNamesFromMap(cardMap){
  for(let no=1; no<=20; no++){
    const k = pad2(no);
    const fn = cardMap[k];
    if(fn){
      const nm = nameFromFilename(fn, no);
      CardRegistry[no-1].name = nm;
    }
  }
}

async function rescanImages(){
  state.img.ready = false;
  updateTop();
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
    cache.cardMap = buildCardMapFromFileList(cardFiles);

    setCache(cache);

    log(`OK assets: ${assetFiles.length}件 / cards: ${cardFiles.length}件`, "muted");
    if(cache.fieldFile) log(`OK フィールド検出: ${cache.fieldFile}`, "muted");
    else log("NG フィールド未検出（assets/field.* を確認）", "warn");

    const mapped = Object.keys(cache.cardMap || {}).length;
    if(mapped >= 20) log("OK カード画像：No.01〜20を自動紐付けしました", "muted");
    else log(`注意：自動紐付け不足（${mapped}/20）… 先頭が 01_ などの形式か確認してください`, "warn");

  }catch(err){
    log(`NG GitHub API取得失敗：${String(err.message || err)}`, "warn");
    log("※リポジトリが公開か／設定の owner/repo が正しいか確認してください", "warn");
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
    }
  }

  // Cards
  state.img.cardUrlByNo = {};
  state.img.cardFileByNo = {};
  const map = cache.cardMap || {};
  applyNamesFromMap(map); // <<< 手札に名前を出す

  for(const k of Object.keys(map)){
    const file = map[k];
    state.img.cardFileByNo[k] = file;
    state.img.cardUrlByNo[k] = vercelPathCards(file);
  }

  state.img.ready = true;
  updateTop();

  const miss = [];
  for(let no=1; no<=20; no++){
    const key = pad2(no);
    if(!state.img.cardUrlByNo[key]) miss.push(key);
  }
  if(miss.length){
    log(`カード画像未検出：${miss.join(", ")}`, "warn");
  }else{
    log("カード画像：20種すべて検出", "muted");
  }

  renderAll();
}

/* ---------- Rendering ---------- */
function faceForCard(card){
  const face = document.createElement("div");
  face.className = "face fallback";

  const b1 = document.createElement("div");
  b1.className="badge";
  b1.textContent = `No.${card.no}`;

  const b2 = document.createElement("div");
  b2.className="badge atk";
  b2.textContent = `ATK ${card.atk}`;

  const nm = document.createElement("div");
  nm.className="name";
  nm.textContent = card.name;

  face.appendChild(b1);
  face.appendChild(b2);
  face.appendChild(nm);

  const url = state.img.cardUrlByNo[pad2(card.no)];
  if(url) face.style.backgroundImage = `url("${url}")`;
  else face.classList.add("fallback");

  return face;
}

function makeSlot(card, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");

  if(card){
    slot.appendChild(faceForCard(card));
    bindLongPress(slot, ()=> openViewer(card));
  }
  return slot;
}

function bindLongPress(node, fn){
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(fn, 420); };
  const end = ()=> clearTimeout(t);
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
}

function renderZones(){
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++) el.aiE.appendChild(makeSlot(state.AI.E[i]));

  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c);
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.phase==="MAIN" && !state.normalSummonUsed && state.selectedHandIndex!=null && !c);
    const sel = (state.selectedAttackerPos===i);
    const slot = makeSlot(c, {glow, sel});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c){
      bindLongPress(slot, ()=> onLongPressEmptySlotForKenSan(i));
    }
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

    const playable = (state.phase==="MAIN" && !state.normalSummonUsed);
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}")`;
      h.style.backgroundSize = "cover";
      h.style.backgroundPosition = "center";
    }

    const no = document.createElement("div");
    no.className = "handNo";
    no.textContent = `No.${c.no}`;

    const nm = document.createElement("div");
    nm.className = "handName";
    nm.textContent = c.name;

    h.appendChild(no);
    h.appendChild(nm);

    h.addEventListener("click", ()=>{
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=> openViewer(c));
    el.hand.appendChild(h);
  }
}

function renderAll(){
  updateTop();
  updateCounts();
  renderZones();
  renderHand();
}

/* ---------- Viewer / Zone viewer ---------- */
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
});

function openViewer(card){
  el.viewerTitle.textContent = `No.${card.no} ${card.name}`;
  el.viewerText.textContent = card.text || "";
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
      t.textContent = `No.${c.no} ${c.name}`;
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

/* ---------- Gameplay Core ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
  state.normalSummonUsed = false;
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

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

  log("ゲーム開始：シールド3 / 初手4", "muted");
  renderAll();
}

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

function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  state.phase = PHASES[(i+1)%PHASES.length];

  if(state.phase==="START"){
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
  }

  if(state.phase==="DRAW"){
    draw("P1",1);
    draw("AI",1);
    log("ドロー +1", "muted");
  }

  if(state.phase==="MAIN"){
    aiMain();
  }

  if(state.phase==="BATTLE"){
    state.selectedAttackerPos = null;
  }

  if(state.phase==="END"){
    enforceHandLimit("P1");
    enforceHandLimit("AI");
  }

  renderAll();
}

function endTurn(){
  state.turn++;
  state.phase = "START";
  state.normalSummonUsed = false;
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  log(`TURN ${state.turn} 開始`, "muted");
  renderAll();
}

function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限でウイングへ → ${c.name}`, "muted");
  }
}

/* ---------- Summon ---------- */
function onClickYourC(pos){
  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null){
      if(state.P1.C[pos]) log("手札を選ぶか、BATTLEで攻撃者を選択してください", "muted");
      return;
    }
    if(state.P1.C[pos]){
      log("ここは埋まっています", "muted");
      return;
    }
    const card = state.P1.hand[state.selectedHandIndex];

    if(state.normalSummonUsed){
      log("登場（通常召喚）はターン1回です", "warn");
      return;
    }
    if(card.rank >= 5){
      log("RANK5以上は見参（空スロット長押し）で仮実装です", "warn");
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
    if(!state.P1.C[pos]){
      log("攻撃者がいません", "muted");
      return;
    }
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }
}

function onLongPressEmptySlotForKenSan(pos){
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null){
    log("見参：先に手札を選択してください", "muted");
    return;
  }
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(card.rank < 5){
    log("見参：RANK5以上のカードで使用します", "muted");
    return;
  }
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
    log(`見参：${c2.name}（仮コスト→${disc.name} をウイング）`, "muted");
    renderAll();
  });
}

/* ---------- Battle ---------- */
function onClickEnemyCard(enemyPos){
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null){
    log("先に自分の攻撃者をタップしてください", "muted");
    return;
  }
  const atkCard = state.P1.C[state.selectedAttackerPos];
  if(!atkCard){ state.selectedAttackerPos=null; renderAll(); return; }

  const defCard = state.AI.C[enemyPos];
  if(!defCard){
    log("相手キャラがいません（シールドを攻撃できます）", "muted");
    return;
  }

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

function attackShieldOrDirect(){
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null){
    log("先に自分の攻撃者をタップしてください", "muted");
    return;
  }
  const atkCard = state.P1.C[state.selectedAttackerPos];
  if(!atkCard){ state.selectedAttackerPos=null; renderAll(); return; }

  const enemyHasC = state.AI.C.some(Boolean);
  if(enemyHasC){
    log("相手キャラがいる間はシールドを攻撃できません", "warn");
    return;
  }

  if(state.AI.shield.length>0){
    askConfirm("攻撃確認", `${atkCard.name} がシールドを攻撃します。\nシールドを1枚破壊（→相手手札）しますか？`, ()=>{
      const sh = state.AI.shield.shift();
      state.AI.hand.push(sh);
      log(`シールド破壊：相手手札へ → ${sh.name}`, "muted");
      state.selectedAttackerPos=null;
      renderAll();
    });
  }else{
    askConfirm("フィニッシュ確認", `${atkCard.name} がダイレクトアタックします。\n勝利しますか？`, ()=>{
      log("勝利：ダイレクトアタック成功！", "muted");
      state.selectedAttackerPos=null;
      renderAll();
    });
  }
}

function onClickShieldCell(side){
  if(side==="AI"){
    attackShieldOrDirect();
  }else{
    log("自分のシールドは閲覧のみ（後で詳細UI追加）", "muted");
  }
}

/* ---------- AI (simple) ---------- */
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
  for(let i=0;i<3;i++){
    const atk = state.AI.C[i];
    if(!atk) continue;

    const playerIdxs = state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(playerIdxs.length){
      const t = playerIdxs[Math.floor(Math.random()*playerIdxs.length)];
      resolveBattle_CvC("AI", i, "P1", t);
    }else{
      if(state.P1.shield.length>0){
        const sh = state.P1.shield.shift();
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
    if(act==="aiDeck") log("相手デッキは非公開（枚数のみ）", "muted");
    if(act==="aiShield") onClickShieldCell("AI");

    if(act==="pWing") openZone("YOUR WING", state.P1.wing.slice().reverse());
    if(act==="pOutside") openZone("YOUR OUTSIDE", state.P1.outside.slice().reverse());
    if(act==="pDeck") log("自分デッキは非公開（枚数のみ）", "muted");
    if(act==="pShield") onClickShieldCell("P1");
  }, {passive:true});
}

/* ---------- UI binds ---------- */
function startToGame(){
  el.title.classList.remove("active");
  el.game.classList.add("active");
  log("対戦画面：表示OK", "muted");
  startGame();
}

function bindModalsButtons(){
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
    renderAll();
  }, {passive:true});
}

function bindPhaseButtons(){
  el.btnNext.addEventListener("click", ()=>{
    if(state.phase==="BATTLE") aiBattle();
    nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", ()=>{
    if(state.phase==="BATTLE") aiBattle();
    endTurn();
  }, {passive:true});
}

function bindStart(){
  el.boot.textContent = "JS: OK（読み込み成功）";
  el.btnStart.addEventListener("click", ()=>{
    if(state.started) return;
    state.started=true;
    startToGame();
  }, {passive:true});
  el.title.addEventListener("click", ()=>{
    if(state.started) return;
    state.started=true;
    startToGame();
  }, {passive:true});
}

function bindLogToggle(){
  el.btnLog.addEventListener("click", ()=>{
    el.log.classList.toggle("hide");
  }, {passive:true});
}

/* ---------- Init ---------- */
async function init(){
  el.boot.textContent = "JS: OK（初期化中…）";
  updateTop();

  bindStart();
  bindModalsButtons();
  bindSettings();
  bindPhaseButtons();
  bindBoardClicks();
  bindLogToggle();

  const cache = getCache();
  if(cache && cache.assetFiles && cache.cardFiles && cache.repo === getRepo()){
    log("画像：キャッシュを使用（必要なら設定→再取得）", "muted");
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent = "JS: OK（準備完了）";
}

document.addEventListener("DOMContentLoaded", init);