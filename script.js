/* =========================================================
  Manpuku World - v40100
  FIX/ADD:
   - back file supports double ext like card_back.png.PNG
   - deck/wing/outside show back image card-sized
   - iPhone bottom half clipping mitigated (100dvh + stage bottom padding)
   - YOUR rows shifted right a bit / pile shifted left / slot gap adjusted
   - Zone rule: character->C only, effect/item->E only
   - Flame Bullet: immediate choice UI on play; then send itself to wing
   - Laous search: tag "クランプス" candidates includes Nicola (tag added)
========================================================= */

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
  enemyHandLabel: $("enemyHandLabel"),

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

  choiceM: $("choiceM"),
  choiceTitle: $("choiceTitle"),
  choiceBody: $("choiceBody"),

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

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}

/* =========================================================
   Card data (minimal wiring for requested fixes)
   - tags, type (character/effect/item)
========================================================= */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", type:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    summon:"kensan", text: normalizeText("登場不可。手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n1ターンに1度：デッキ・ウイングから「黒魔法」1枚を手札に加える。"),
    rank:5, atk:2500 },
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ステージに「クルエラ」がある時、手札から発動できる。\n①相手ATK最高1体をウイング\n②相手RANK4以下をすべてウイング"),
    rank:0, atk:0 },
  // ★FIX: ニコラを「クランプス」候補に入れる（ユーザー要望）
  { no:3,  name:"トナカイの少女ニコラ", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    summon:"kensan", text: normalizeText("登場不可。手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n自分ターン：このターンの終わりまでATK+1000。"),
    rank:5, atk:2000 },
  { no:4,  name:"聖ラウス", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("登場時：デッキ・ウイングからタグ「クランプス」1枚を手札に加える。"),
    rank:3, atk:1500 },
  // 以降は詳細ロジック未配線でも最低限プレイ継続できるように保持
  { no:5,  name:"統括AI タータ", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("登場時：2枚ドロー。\n自分ターン1度：手札から2枚までウイング→同枚数だけBUGBUG西遊記をデッキから手札。"),
    rank:4, atk:2000 },
  { no:6,  name:"麗し令嬢エフィ", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    summon:"kensan", text: normalizeText("登場不可。手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n自分ターン：相手キャラ1体をこのターン-1000。"),
    rank:5, atk:2000 },
  { no:7,  name:"狩猟まひる", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("（テキスト未確定）"),
    rank:3, atk:1500 },
  { no:8,  name:"組織の男 手形", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手ターンに1度：相手が発動した効果を無効。"),
    rank:0, atk:0 },
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("場にある時：手札の「小次郎」を見参。\n場に「小次郎」がある時ATK+500。"),
    rank:4, atk:2000 },
  { no:10, name:"小次郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("場にある時：手札の「小太郎」を見参。\n場に「小太郎」がある時ATK+500。"),
    rank:4, atk:2000 },
  { no:11, name:"司令", type:"item", tags:[], titleTag:"",
    text: normalizeText("登場時：自分キャラ1体に装備（ATK+500）。"),
    rank:0, atk:0 },
  { no:12, name:"班目プロデューサー", type:"character", tags:[], titleTag:"",
    text: normalizeText("1ターンに1度、バトルでは破壊されない。"),
    rank:2, atk:1000 },
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character", tags:[], titleTag:"",
    text: normalizeText("場にある時：自身をウイング→相手キャラ1体をこのターン-1000（相手ターンも可）。"),
    rank:4, atk:2000 },
  { no:14, name:"記憶抹消", type:"effect", tags:[], titleTag:"",
    text: normalizeText("相手が効果発動時：手札から発動。無効にしてこのカードをウイング。"),
    rank:0, atk:0 },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect", tags:[], titleTag:"",
    text: normalizeText("バトル時：手札から発動。自分キャラ1体をこのターン+1000。"),
    rank:0, atk:0 },
  { no:16, name:"力こそパワー！！", type:"effect", tags:[], titleTag:"",
    text: normalizeText("自分ターン：相手ATK最小1体をウイング。"),
    rank:0, atk:0 },
  { no:17, name:"キャトルミューティレーション", type:"effect", tags:[], titleTag:"",
    text: normalizeText("自分キャラがバトルでウイングに送られた時：手札から発動。相手キャラ1体を手札に戻す。"),
    rank:0, atk:0 },
  { no:18, name:"a-xブラスター01 -放射型-", type:"item", tags:["射手"], titleTag:"",
    text: normalizeText("自分ターン：自分キャラに装備（+500）。射手ならさらに+500＆相手ターン開始時に相手手札1枚ランダムでウイング。"),
    rank:0, atk:0 },
  { no:19, name:"-聖剣- アロングダイト", type:"item", tags:["勇者","剣士"], titleTag:"",
    text: normalizeText("自分ターン：装備（+500）。勇者/剣士ならさらに+500＆相手をバトルでウイングに送った時1ドロー。"),
    rank:0, atk:0 },
  { no:20, name:"普通の棒", type:"item", tags:["勇者"], titleTag:"",
    text: normalizeText("自分ターン：装備（+300）。勇者ならさらに+500。"),
    rank:0, atk:0 },
];

/* ---------- Starter deck (20 types x2) ---------- */
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

  el.enemyHandLabel.textContent = `ENEMY HAND ×${state.AI.hand.length}`;
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

/* ★FIX: card_back.png.PNG のような “card_back で始まる” ものは全部OK */
function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());

  // まず “card_back” で始まるものを優先（card_back.png.png なども拾う）
  const idxAny = lowers.findIndex(n=>n.startsWith("card_back"));
  if(idxAny>=0) return assetFiles[idxAny];

  // 次に back / cardback 系
  const pri = ["card_back.png","card_back.jpg","card_back.jpeg","cardback.png","cardback.jpg","back.png","back.jpg","back.jpeg"];
  for(const p of pri){
    const i = lowers.findIndex(n=>n === p);
    if(i>=0) return assetFiles[i];
  }
  const idx2 = lowers.findIndex(n=>n.startsWith("back"));
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
      log(`OK 裏面読込：適用（${cache.backFile}）`, "muted");
    }else{
      log(`NG 裏面読込失敗: ${b}（黒で継続）`, "warn");
      state.img.backUrl = "";
    }
  }

  // cards
  state.img.cardUrlByNo = {};
  state.img.cardFileByNo = {};
  const map = cache.cardMap || {};
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

/* ---------- Rendering ---------- */
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
  if(close==="choice") hideModal("choiceM");
});

function openViewer(card){
  const base = `${card.name}\nRANK ${card.rank || 0} / ATK ${card.atk || 0}`;
  el.viewerTitle.textContent = card.name;
  el.viewerText.textContent = `${base}\n\n${card.text || ""}`;
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
      const tt = document.createElement("div");
      tt.className = "t";
      tt.textContent = c.name;
      const ss = document.createElement("div");
      ss.className = "s";
      ss.textContent = `RANK ${c.rank || 0} / ATK ${c.atk || 0}`;

      meta.appendChild(tt); meta.appendChild(ss);
      it.appendChild(th); it.appendChild(meta);

      it.addEventListener("click", ()=> openViewer(c), {passive:true});
      el.zoneList.appendChild(it);
    });
  }
  showModal("zoneM");
}

/* ---------- Choice Modal ---------- */
let choiceResolver = null;
function askChoice(title, message, buttons){
  // buttons: [{label, value}]
  el.choiceTitle.textContent = title;
  el.choiceBody.innerHTML = "";

  const msg = document.createElement("div");
  msg.className = "choiceMsg";
  msg.textContent = message;
  el.choiceBody.appendChild(msg);

  const wrap = document.createElement("div");
  wrap.className = "choiceBtns";
  for(const b of buttons){
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = b.label;
    btn.addEventListener("click", ()=>{
      hideModal("choiceM");
      if(choiceResolver){ const r = choiceResolver; choiceResolver=null; r(b.value); }
    }, {passive:true});
    wrap.appendChild(btn);
  }
  el.choiceBody.appendChild(wrap);

  showModal("choiceM");
  return new Promise((resolve)=>{ choiceResolver = resolve; });
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

/* ---------- Turn / Phase core ---------- */
function setActiveSide(side){
  state.activeSide = side;
  setActiveUI();
}
function setPhase(p){
  state.phase = p;
  updateHUD();
  renderAll();
}

function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（ドロー不能）`, "warn");
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

/* ---------- AI logic (minimal stable) ---------- */
function aiMain(){
  // キャラがいない時にアイテムだけ置かない（ユーザー要望）
  const hasChar = state.AI.C.some(Boolean);

  // キャラを出せるなら出す
  const empty = state.AI.C.findIndex(x=>!x);
  if(empty>=0){
    const idx = state.AI.hand.findIndex(c=>c.type==="character" && c.summon!=="kensan");
    if(idx>=0){
      const c = state.AI.hand.splice(idx,1)[0];
      state.AI.C[empty]=c;
      log(`AI：登場 → ${c.name}`, "muted");
      // ラウス登場時サーチ（簡易：自動で1枚）
      if(c.no===4) aiResolveLaousSearch();
    }
  }

  // 効果/アイテムは「キャラがいる時のみ」置く（空発動を防止）
  if(hasChar){
    const eEmpty = state.AI.E.findIndex(x=>!x);
    if(eEmpty>=0){
      const idxE = state.AI.hand.findIndex(c=>c.type!=="character");
      if(idxE>=0){
        const c = state.AI.hand.splice(idxE,1)[0];
        state.AI.E[eEmpty]=c;
        log(`AI：E配置 → ${c.name}`, "muted");
        // 即時効果カードならAIは即発動してウイングへ（フレイムバレット等）
        if(c.type==="effect") aiResolveImmediateEffect(c, eEmpty);
      }
    }
  }
}

function aiResolveLaousSearch(){
  const pool = [...state.AI.deck, ...state.AI.wing].filter(c=> (c.tags||[]).includes("クランプス"));
  if(!pool.length) return;
  const pick = pool[0];
  // remove from wherever
  const idxD = state.AI.deck.findIndex(x=>x===pick);
  if(idxD>=0) state.AI.deck.splice(idxD,1);
  else{
    const idxW = state.AI.wing.findIndex(x=>x===pick);
    if(idxW>=0) state.AI.wing.splice(idxW,1);
  }
  state.AI.hand.push(pick);
  log(`AI：ラウスサーチ → ${pick.name}`, "muted");
}

function aiResolveImmediateEffect(card, ePos){
  // now only implement Flame Bullet basic
  if(card.no===2){
    const hasCruella = state.AI.C.some(c=>c && c.no===1);
    if(!hasCruella){
      // 発動条件満たせない -> Eに残さない（空発動禁止）
      state.AI.E[ePos]=null;
      state.AI.hand.push(card);
      log("AI：フレイムバレット条件不足→不発（手札に戻す）", "warn");
      return;
    }
    // choose simple: highest atk
    const enemy = state.P1.C.filter(Boolean);
    if(enemy.length){
      const max = enemy.slice().sort((a,b)=> (b.atk||0)-(a.atk||0))[0];
      const pos = state.P1.C.findIndex(c=>c===max);
      state.P1.C[pos]=null;
      state.P1.wing.push(max);
      log(`AI：フレイムバレット→最高ATK ${max.name} をウイング`, "warn");
    }
    // send itself to wing (one-shot)
    state.AI.E[ePos]=null;
    state.AI.wing.push(card);
    log("AI：フレイムバレット→使用後ウイング", "muted");
  }
}

function aiBattle(){
  // 各キャラ1回攻撃（簡易）
  for(let i=0;i<3;i++){
    const atk = state.AI.C[i];
    if(!atk) continue;

    const playerIdxs = state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(playerIdxs.length){
      const t = playerIdxs[Math.floor(Math.random()*playerIdxs.length)];
      resolveBattle_CvC("AI", i, "P1", t);
    }else{
      // シールド破壊（裏向き→手札）
      const sidx = state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        const sh = state.P1.shield[sidx];
        state.P1.shield[sidx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊 → あなた手札へ ${sh.name}`, "warn");
      }else{
        log("敗北：ダイレクトアタック（仮）", "warn");
      }
    }
  }
}

/* ---------- Guaranteed AI Turn Runner ---------- */
async function runAITurn(){
  if(state.aiRunning) return;
  if(state.activeSide !== "AI") return;

  state.aiRunning = true;
  try{
    log("相手ターン開始", "warn");

    setPhase("START");
    await sleep(220);

    setPhase("DRAW");
    draw("AI", 1);
    log("AI：ドロー +1", "muted");
    renderAll();
    await sleep(260);

    setPhase("MAIN");
    aiMain();
    renderAll();
    await sleep(340);

    setPhase("BATTLE");
    aiBattle();
    renderAll();
    await sleep(380);

    setPhase("END");
    enforceHandLimit("AI");
    renderAll();
    await sleep(220);

    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    updateHUD();
    renderAll();

  }finally{
    state.aiRunning = false;
  }
}

/* ---------- Player: zone rule + instant effects ---------- */
function isCharacter(card){ return card && card.type==="character"; }
function isEffectOrItem(card){ return card && card.type!=="character"; }

function findCruellaOnYourStage(){
  return state.P1.C.some(c=>c && c.no===1);
}

async function resolveImmediateEffect_P1(card, placedEPos){
  // Flame Bullet: immediate choice UI
  if(card.no===2){
    if(!findCruellaOnYourStage()){
      log("フレイムバレット：条件（クルエラ）がありません", "warn");
      // cancel placement -> return to hand
      state.P1.E[placedEPos] = null;
      state.P1.hand.push(card);
      renderAll();
      return;
    }
    const choice = await askChoice(
      "黒魔法-フレイムバレット",
      "効果を選択してください。",
      [
        { label:"ATKが1番高い相手キャラ1体をウイング", value:"maxAtk" },
        { label:"相手のRANK4以下キャラをすべてウイング", value:"rank4all" },
      ]
    );

    if(choice==="maxAtk"){
      const enemy = state.AI.C.filter(Boolean);
      if(!enemy.length){
        log("対象がいません（相手キャラ不在）", "warn");
      }else{
        const max = enemy.slice().sort((a,b)=> (b.atk||0)-(a.atk||0))[0];
        const pos = state.AI.C.findIndex(c=>c===max);
        state.AI.C[pos]=null;
        state.AI.wing.push(max);
        log(`フレイムバレット：最高ATK ${max.name} をウイング`, "muted");
      }
    }else{
      let moved = 0;
      for(let i=0;i<3;i++){
        const c = state.AI.C[i];
        if(c && (c.rank||0) <= 4){
          state.AI.C[i]=null;
          state.AI.wing.push(c);
          moved++;
        }
      }
      log(`フレイムバレット：RANK4以下 ${moved} 体をウイング`, "muted");
    }

    // one-shot -> send to wing
    state.P1.E[placedEPos]=null;
    state.P1.wing.push(card);
    log("フレイムバレット：使用後ウイング", "muted");
    renderAll();
    return;
  }

  // other effect cards: for now just send to wing (safe default) if desired later
}

/* --------- Laous search (P1) --------- */
async function resolveLaousSearch_P1(){
  const pool = [...state.P1.deck, ...state.P1.wing].filter(c=> (c.tags||[]).includes("クランプス"));
  if(!pool.length){
    log("ラウス：クランプス候補がありません", "warn");
    return;
  }

  // list up to 6 for UI
  const top = pool.slice(0, 6);
  const btns = top.map(c=> ({label: c.name, value: c.no}));
  const pickNo = await askChoice("聖ラウス（サーチ）", "手札に加えるカードを選択してください。", btns);

  const picked = pool.find(c=>c.no===pickNo);
  if(!picked) return;

  // remove from deck or wing
  const idxD = state.P1.deck.findIndex(x=>x===picked);
  if(idxD>=0) state.P1.deck.splice(idxD,1);
  else{
    const idxW = state.P1.wing.findIndex(x=>x===picked);
    if(idxW>=0) state.P1.wing.splice(idxW,1);
  }
  state.P1.hand.push(picked);
  log(`ラウス：サーチ → ${picked.name}`, "muted");
}

/* ---------- Kensan (見参) ---------- */
function listKensanCostCandidates(){
  // rule: "手札またはステージのカード1枚"（キャラ/エフェ/アイテムすべて可）
  const candidates = [];

  // hand candidates: any card except selected kensan card
  for(let i=0;i<state.P1.hand.length;i++){
    candidates.push({ from:"hand", idx:i, card: state.P1.hand[i] });
  }

  // stage candidates: any C/E that exists
  for(let i=0;i<3;i++){
    if(state.P1.C[i]) candidates.push({ from:"C", idx:i, card: state.P1.C[i] });
  }
  for(let i=0;i<3;i++){
    if(state.P1.E[i]) candidates.push({ from:"E", idx:i, card: state.P1.E[i] });
  }
  return candidates;
}

async function payKensanCost(excludeHandIndex){
  const cands = listKensanCostCandidates()
    .filter(x=> !(x.from==="hand" && x.idx===excludeHandIndex));

  if(!cands.length){
    log("見参：コストにできるカードがありません", "warn");
    return false;
  }

  const show = cands.slice(0, 8);
  const btns = show.map(x=>{
    const loc = x.from==="hand" ? "手札" : (x.from==="C" ? `C${x.idx+1}` : `E${x.idx+1}`);
    return { label:`${loc}：${x.card.name}`, value:`${x.from}:${x.idx}` };
  });

  const pick = await askChoice("見参（コスト）", "ウイングへ送るカードを1枚選んでください。", btns);
  const [from, idxStr] = String(pick).split(":");
  const idx = Number(idxStr);

  if(from==="hand"){
    const moved = state.P1.hand.splice(idx,1)[0];
    state.P1.wing.push(moved);
    log(`見参コスト：手札 → ウイング (${moved.name})`, "muted");
    // if index shift affected selectedHandIndex, fix later in caller
    return {from, idx, moved};
  }
  if(from==="C"){
    const moved = state.P1.C[idx];
    state.P1.C[idx]=null;
    state.P1.wing.push(moved);
    log(`見参コスト：C → ウイング (${moved.name})`, "muted");
    return {from, idx, moved};
  }
  if(from==="E"){
    const moved = state.P1.E[idx];
    state.P1.E[idx]=null;
    state.P1.wing.push(moved);
    log(`見参コスト：E → ウイング (${moved.name})`, "muted");
    return {from, idx, moved};
  }
  return false;
}

/* ---------- Player actions ---------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];

    // Zone rule: character only
    if(!isCharacter(card)){
      log("Cにはキャラクターのみ置けます", "warn");
      return;
    }

    // Kensan-only cards cannot normal summon
    if(card.summon==="kensan"){
      log("このカードは登場できません。空きCを長押しして見参してください", "warn");
      return;
    }

    // normal summon once
    if(state.normalSummonUsed){
      log("登場（通常召喚）はターン1回です", "warn");
      return;
    }

    state.P1.C[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    state.normalSummonUsed = true;
    log(`登場：${card.name}`, "muted");

    // Laous on-summon search
    if(card.no===4){
      resolveLaousSearch_P1().then(()=> renderAll());
    }

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

async function onLongPressEmptySlotForKensan(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card)) return;
  if(card.summon!=="kensan") return;

  // cost: choose one card from hand or stage (any type)
  const paid = await payKensanCost(state.selectedHandIndex);
  if(!paid) return;

  // if cost removed from hand before selected index, adjust
  if(paid.from==="hand" && paid.idx < state.selectedHandIndex){
    state.selectedHandIndex -= 1;
  }

  // place kensan card
  const placed = state.P1.hand.splice(state.selectedHandIndex,1)[0];
  state.P1.C[pos]=placed;
  state.selectedHandIndex=null;

  log(`見参：${placed.name}`, "muted");
  renderAll();
}

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase !== "MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];

  // Zone rule: effect/item only
  if(isCharacter(card)){
    log("Eにはエフェクト/アイテムのみ置けます", "warn");
    return;
  }

  state.P1.E[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  log(`E配置：${card.name}`, "muted");
  renderAll();

  // immediate effects
  if(card.type==="effect"){
    resolveImmediateEffect_P1(card, pos);
  }
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
    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- Render parts ---------- */
function renderZones(){
  // enemy E/C
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++) el.aiE.appendChild(makeSlot(state.AI.E[i], {enemy:true}));

  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  // your C
  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const sel = (state.selectedAttackerPos===i);
    const slot = makeSlot(c, {glow, sel});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c) bindLongPress(slot, ()=> onLongPressEmptySlotForKensan(i));
    el.pC.appendChild(slot);
  }

  // your E
  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {glow});
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
    }else{
      // fallback
      h.style.backgroundImage = "";
      h.style.background = "linear-gradient(135deg, rgba(89,242,255,.10), rgba(179,91,255,.08))";
    }
    h.style.backgroundSize = "cover";
    h.style.backgroundPosition = "center";

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
      }else{
        back.style.backgroundImage = "";
        back.style.backgroundColor = "#070914";
      }
    }else{
      back.style.backgroundImage = "";
    }

    const count = state[side].shield.filter(Boolean).length;
    const badge = ensureShieldCountBadge(cell);
    badge.textContent = `${count}/3`;

    cell.onclick = ()=> { if(side==="AI") onClickEnemyShield(idx); };
  });
}

function renderPiles(){
  const pileNodes = document.querySelectorAll(".pileCard");
  pileNodes.forEach((n)=>{
    const key = n.getAttribute("data-pile") || "";
    if(state.img.backUrl){
      n.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      n.style.backgroundImage = "";
      n.style.backgroundColor = "#070914";
    }
    n.style.backgroundSize = "cover";
    n.style.backgroundPosition = "center";
    // click on parent cell handled by grid click
  });
}

function renderAll(){
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
  renderPiles();
}

/* ---------- Board clicks (wing/outside) ---------- */
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

/* ---------- Phase Buttons ---------- */
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

  // shield: top3
  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  // hand:4 (両者4枚スタート)
  state.P1.hand = [];
  state.AI.hand = [];
  draw("P1", 4);
  draw("AI", 4);

  // reset zones
  state.P1.C = [null,null,null];
  state.AI.C = [null,null,null];
  state.P1.E = [null,null,null];
  state.AI.E = [null,null,null];
  state.P1.wing = [];
  state.AI.wing = [];
  state.P1.outside = [];
  state.AI.outside = [];

  // random first
  state.firstSide = (Math.random() < 0.5) ? "P1" : "AI";
  setActiveSide(state.firstSide);

  if(state.firstSide==="P1"){
    el.firstInfo.textContent = "先攻：あなた";
    log("先攻：あなた", "muted");
    log("あなたのターン開始", "muted");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
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

function bindLogButton(){
  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 360);
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
  log("盤面は常時フル表示／詳細は長押し／裏面はcard_back*を自動検出", "muted");
}

document.addEventListener("DOMContentLoaded", init);