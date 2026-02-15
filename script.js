/* =========================================================
  Manpuku World - v50001 (Stable Interaction Build)
  FIX:
   - iOSでボタン/枠が押せない：z-index / touch-action / passive回避
   - C/E枠が消える：空でもslotを必ず描画
   - card_back.png.PNG など二重拡張子も検出
   - Wing/Outsideは「裏面を貼らない」：エリアとして表示→タップで一覧
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

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

/* ---------- Announce ---------- */
let announceTimer = null;
function announce(msg){
  el.announce.textContent = msg || " ";
  if(announceTimer) clearTimeout(announceTimer);
  announceTimer = setTimeout(()=>{ el.announce.textContent = " "; }, 2400);
}

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
  for(const it of LOGS.slice(0, 200)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v5";

/* ---------- Text normalize rules ---------- */
function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}

/* ---------- Phases ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];

/* ---------- Starter Registry (placeholder meta; effects wired later) ---------- */
const CardRegistry = Array.from({length:20}, (_,i)=> {
  const no = i+1;
  const rank = ((i%5)+1);
  const atk = rank*500;
  return { no, name:`カード${no}`, rank, atk, type:"character", text: normalizeText("（テキストは後で確定）") };
});

/* ---------- Utils ---------- */
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){ deck.push({...c}); deck.push({...c}); }
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

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: {
    fieldUrl:"",
    backUrl:"",
    cardUrlByNo:{},
    cardFileByNo:{},
    ready:false,
  },

  aiRunning:false,
};

/* ---------- UI helpers ---------- */
function setActiveUI(){
  const you = (state.activeSide==="P1");
  el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
  el.chipActive.classList.toggle("enemy", !you);

  // Player buttons disabled on AI turn
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

  $("enemyHandLabel").textContent = `ENEMY HAND ×${state.AI.hand.length}`;
}

/* ---------- GitHub image scan ---------- */
function getRepo(){ return localStorage.getItem(LS_REPO) || "manpuku-taira/manpuku-world"; }
function setRepo(v){ localStorage.setItem(LS_REPO, v); }
function getCache(){ try{ return JSON.parse(localStorage.getItem(LS_IMG_CACHE) || "{}"); }catch{ return {}; } }
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

/* ★ 修正：card_back.png.PNG のような二重拡張子も拾う */
function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());

  // まず card_back を含む最優先
  const idxAny = lowers.findIndex(n=> n.includes("card_back"));
  if(idxAny>=0) return assetFiles[idxAny];

  // 次点：cardback / back
  const idx2 = lowers.findIndex(n=> n.startsWith("cardback") || n.startsWith("back."));
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
  if(s.includes(`${p2}_`)) score += 30;
  if(s.includes(`${p1}_`)) score += 20;
  if(s.includes(".jpg")) score += 5;
  if(s.includes(".png")) score += 5;
  if(s.includes(".jpeg")) score += 4;
  if(s.includes(".png.jpg") || s.includes(".png.jpeg") || s.includes(".png.png")) score += 6;
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
  for(let i=0;i<4;i++){
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

  // field
  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)){
      state.img.fieldUrl = u;
      el.fieldTop.style.backgroundImage = `url("${u}")`;
      el.fieldBottom.style.backgroundImage = `url("${u}")`;
      log("OK フィールド読込：上下同時表示", "muted");
    }else{
      state.img.fieldUrl = "";
      el.fieldTop.style.backgroundImage = "";
      el.fieldBottom.style.backgroundImage = "";
      log(`NG フィールド読込失敗: ${u}`, "warn");
    }
  }else{
    state.img.fieldUrl = "";
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
  }

  // back
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

  // cards
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
  const start = (ev)=> {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
  const end = ()=> clearTimeout(t);

  node.addEventListener("pointerdown", start, {passive:true});
  node.addEventListener("pointerup", end, {passive:true});
  node.addEventListener("pointercancel", end, {passive:true});
  node.addEventListener("pointerleave", end, {passive:true});
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
  slot.dataset.kind = opts.kind || "";
  slot.dataset.side = opts.side || "";
  slot.dataset.pos = String(opts.pos ?? "");

  // 空でもslotを必ず描画（枠消失防止）
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
}, {passive:true});

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

/* ---------- Core rules (current baseline) ---------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（ドロー不能）`, "warn");
      announce("デッキ切れ");
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

function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  log(`バトル：${A.name}(${A.atk}) vs ${D.name}(${D.atk})`, "muted");
  announce("バトル解決");

  if(A.atk === D.atk){
    state[aSide].C[aPos]=null;
    state[dSide].C[dPos]=null;
    state[aSide].wing.push(A);
    state[dSide].wing.push(D);
    log("相打ち：両方ウイング", "muted");
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

/* ---------- AI (baseline only; full effects are next step) ---------- */
function aiMain(){
  const emptyC = state.AI.C.findIndex(x=>!x);
  if(emptyC>=0){
    const idx = state.AI.hand.findIndex(c=>c.type==="character");
    if(idx>=0){
      const c = state.AI.hand.splice(idx,1)[0];
      state.AI.C[emptyC]=c;
      log(`AI：登場 → ${c.name}`, "muted");
    }
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
      const sidx = state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        const sh = state.P1.shield[sidx];
        state.P1.shield[sidx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊 → あなた手札へ ${sh.name}`, "warn");
      }else{
        log("敗北：ダイレクト（仮）", "warn");
        announce("敗北（仮）");
      }
    }
  }
}

async function runAITurn(){
  if(state.aiRunning) return;
  if(state.activeSide !== "AI") return;

  state.aiRunning = true;
  try{
    log("相手ターン開始", "warn");
    announce("相手ターン");
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;

    setPhase("START");
    await sleep(200);

    setPhase("DRAW");
    draw("AI", 1);
    log("AI：ドロー +1", "muted");
    renderAll();
    await sleep(260);

    setPhase("MAIN");
    aiMain();
    renderAll();
    await sleep(320);

    setPhase("BATTLE");
    aiBattle();
    renderAll();
    await sleep(420);

    setPhase("END");
    enforceHandLimit("AI");
    renderAll();
    await sleep(220);

    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    announce("あなたのターン");
    updateHUD();
    renderAll();

  }finally{
    state.aiRunning = false;
  }
}

/* ---------- Turn/Phase ---------- */
function setActiveSide(side){
  state.activeSide = side;
  setActiveUI();
}
function setPhase(p){
  state.phase = p;
  updateHUD();
  renderAll();
}

/* ---------- Player actions ---------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];
    if(card.type !== "character"){
      log("キャラクターはCにのみ置けます", "warn");
      announce("キャラはCへ");
      return;
    }
    if(state.normalSummonUsed){
      log("登場はターン1回です（見参は別処理）", "warn");
      announce("登場は1回");
      return;
    }

    state.P1.C[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    state.normalSummonUsed = true;
    log(`登場：${card.name}`, "muted");
    announce("登場");
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

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase !== "MAIN") return;

  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(card.type === "character"){
    log("キャラクターはEに置けません", "warn");
    announce("キャラはCへ");
    return;
  }

  // baseline: place effect/item
  state.P1.E[pos] = card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;

  log(`Eに配置：${card.name}`, "muted");
  announce("Eに配置");
  renderAll();
}

/* ---------- Enemy target clicks ---------- */
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

function onClickEnemyShield(idx){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  if(!atkCard) return;

  const enemyHasC = state.AI.C.some(Boolean);
  if(enemyHasC){
    log("相手キャラがいる間はシールドを攻撃できません", "warn");
    announce("キャラ優先");
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
    announce("シールド破壊");

    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- Render ---------- */
function renderZones(){
  // Enemy E (always 3 slots)
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    el.aiE.appendChild(makeSlot(state.AI.E[i], {enemy:true, kind:"E", side:"AI", pos:i}));
  }

  // Enemy C (always 3 slots)
  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, {enemy:true, kind:"C", side:"AI", pos:i});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  // Your C (always 3 slots)
  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const sel = (state.selectedAttackerPos===i);
    const slot = makeSlot(c, {glow, sel, kind:"C", side:"P1", pos:i});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(slot);
  }

  // Your E (always 3 slots)
  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const ecard = state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !ecard);
    const slot = makeSlot(ecard, {glow, kind:"E", side:"P1", pos:i});
    slot.addEventListener("click", ()=> onClickYourE(i), {passive:true});
    el.pE.appendChild(slot);
  }
}

function renderHand(){
  el.hand.innerHTML = "";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className = "handCard";

    const playable = (state.activeSide==="P1" && state.phase==="MAIN");
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
      announce(state.selectedHandIndex==null ? "選択解除" : "カード選択");
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=> openViewer(c));
    el.hand.appendChild(h);
  }
}

function renderEnemyHand(){
  el.aiHand.innerHTML = "";
  const n = state.AI.hand.length;
  const show = Math.min(n, 12);
  for(let i=0;i<show;i++){
    const b = document.createElement("div");
    b.className = "handBack";
    if(state.img.backUrl) b.style.backgroundImage = `url("${state.img.backUrl}")`;
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

function ensureShieldCountBadge(cell){
  let b = cell.querySelector(".shieldCount");
  if(!b){
    b = document.createElement("div");
    b.className = "shieldCount";
    cell.appendChild(b);
  }
  return b;
}

function renderShields(){
  const nodes = document.querySelectorAll(".shieldSlot");
  nodes.forEach((cell)=>{
    const side = cell.getAttribute("data-side");
    const idx = Number(cell.getAttribute("data-idx") || "0");
    const back = cell.querySelector(".backCard");
    const sh = state[side].shield[idx];
    const exists = !!sh;

    back.classList.toggle("empty", !exists);

    if(exists){
      if(state.img.backUrl){
        back.style.backgroundImage = `url("${state.img.backUrl}")`;
        back.style.backgroundColor = "";
      }else{
        back.style.backgroundImage = "";
        back.style.backgroundColor = "#070914";
      }
    }else{
      back.style.backgroundImage = "";
      back.style.backgroundColor = "#070914";
    }

    const count = state[side].shield.filter(Boolean).length;
    const badge = ensureShieldCountBadge(cell);
    badge.textContent = `${count}/3`;

    cell.onclick = ()=> { if(side==="AI") onClickEnemyShield(idx); };
  });
}

function renderAll(){
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
}

/* ---------- Board clicks (Wing/Outside are FACE-UP piles; open list) ---------- */
function bindBoardClicks(){
  const grid = $("grid");
  grid.addEventListener("click", (e)=>{
    const cell = e.target.closest(".cell");
    if(!cell) return;

    const act = cell.getAttribute("data-click");
    if(!act) return;

    if(act==="aiWing") openZone("ENEMY WING", state.AI.wing.slice().reverse());
    if(act==="aiOutside") openZone("ENEMY OUTSIDE", state.AI.outside.slice().reverse());

    if(act==="pWing") openZone("YOUR WING", state.P1.wing.slice().reverse());
    if(act==="pOutside") openZone("YOUR OUTSIDE", state.P1.outside.slice().reverse());
  }, {passive:true});
}

/* ---------- Phase Buttons (iOSクリック不発対策：pointerupでも発火) ---------- */
function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${state.activeSide==="P1"?"あなた":"AI"}：ドロー +1`, "muted");
    announce("ドロー +1");
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
  }

  updateHUD();
  renderAll();
}

function endTurn(){
  enforceHandLimit(state.activeSide);

  if(state.activeSide==="P1"){
    setActiveSide("AI");
    state.phase = "START";
    updateHUD();
    renderAll();
    runAITurn();
  }else{
    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    announce("あなたのターン");
    updateHUD();
    renderAll();
  }
}

/* ---------- Start Game ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
  state.normalSummonUsed = false;
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  state.aiRunning = false;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  // 初期手札は必ず4（ご指定）
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

  state.firstSide = (Math.random() < 0.5) ? "P1" : "AI";
  setActiveSide(state.firstSide);

  if(state.firstSide==="P1"){
    el.firstInfo.textContent = "先攻：あなた";
    log("先攻：あなた", "muted");
    announce("先攻：あなた");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
    announce("先攻：相手");
  }

  log("ゲーム開始：シールド3（裏向き）/ 初手4", "muted");

  updateHUD();
  renderAll();

  if(state.activeSide==="AI"){
    runAITurn();
  }
}

/* ---------- Start / Buttons / Settings ---------- */
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
      announce("repo形式NG");
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

/* ★ iOS: clickが死ぬ環境があるため pointerup でも発火させる */
function bindPhaseButtons(){
  const safeFire = (btn, fn)=>{
    btn.addEventListener("click", (e)=>{ fn(); }, {passive:true});
    btn.addEventListener("pointerup", (e)=>{ fn(); }, {passive:true});
  };

  safeFire(el.btnNext, ()=>{
    if(state.activeSide!=="P1") return;
    nextPhase();
  });

  safeFire(el.btnEnd, ()=>{
    if(state.activeSide!=="P1") return;
    endTurn();
  });
}

function bindLogButton(){
  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 320);

  // 通常タップは「ワンライン」案内
  el.btnLog.addEventListener("click", ()=> announce("LOGは長押しで表示"), {passive:true});
}

/* ---------- init ---------- */
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
  log("盤面はスクロールで両面確認／詳細は長押し／ボタンは常時押下可能", "muted");
  announce("準備完了");
}

document.addEventListener("DOMContentLoaded", init);