/* =========================================================
  Manpuku World - v40010
  FIX:
   - iPhoneでC/E枠が1つしか見えない -> HTMLでspan3化 + slot幅固定で安定化
   - 裏面 card_back.png.PNG 等（二重拡張子/大文字）を確実に検出
   - デッキは裏面表示、ウィング/アウトサイドは裏面を貼らない
   - FABの押下が効かない（レイヤー被り） -> CSSでz-index保証（style側）
   - AIがキャラ無しで装備だけ出す不具合を抑止
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

  banner: $("banner"),

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
  for(const it of LOGS.slice(0, 220)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------- Banner ---------- */
let bannerTimer = null;
function say(msg){
  if(!msg){
    el.banner.classList.remove("show");
    el.banner.textContent = "";
    return;
  }
  el.banner.textContent = msg;
  el.banner.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(()=>{ /* keep for important flow */ }, 10);
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

/* ---------- Card texts (No.01〜20) ---------- */
const CardDB = [
  {no:1,  name:"黒の魔法使いクルエラ", type:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。"
    ]},
  {no:2,  name:"黒魔法-フレイムバレット", type:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ステージに「クルエラ」がある時、手札から発動できる。",
      "相手ステージのキャラクター1体を選び、ATKが1番高いキャラクター1体をウイングに送る、またはrank4以下のキャラクターをすべてウイングに送る。"
    ]},
  // ※ラウスの「クランプス」サーチにニコラを含める要望に合わせ、ニコラにクランプス付与
  {no:3,  name:"トナカイの少女ニコラ", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。このターンの終わりまでATK+1000。"
    ]},
  {no:4,  name:"聖ラウス", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードが登場した時、デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    ]},
  {no:5,  name:"統括AI タータ", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:[
      "このカードが登場した時、デッキから2枚ドローする。",
      "自分ターンに1度発動できる。手札から2枚までウイングに送り、その後同枚数だけタイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ]},
  {no:6,  name:"麗し令嬢エフィ", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。相手キャラクター1体のATK-1000（このターンの終わりまで）。"
    ]},
  // No.07はユーザー側で確定済みが「組織の男 手形」だったため、番号ズレを防ぐためここは空枠にせず「狩猟まひる」を仮登録
  {no:7,  name:"狩猟まひる（仮）", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["（テキスト未確定：後で差し替え）"]},
  {no:8,  name:"組織の男 手形", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["相手ターンに1度発動できる。相手が発動した効果を無効にする。"]},
  {no:9,  name:"小太郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:["このカードが自分ステージに存在する時、手札の「小次郎」カードを見参させる。","自分ステージに「小次郎」がある時ATK+500。"]},
  {no:10, name:"小次郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:["このカードが自分ステージに存在する時、手札の「小太郎」カードを見参させる。","自分ステージに「小太郎」がある時ATK+500。"]},
  {no:11, name:"司令", type:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["このカードが登場した時、自分キャラクター1体に装備する。そのキャラクターのATK+500。"]},
  {no:12, name:"班目プロデューサー", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["このカードは1ターンに1度、バトルでは破壊されない。"]},
  {no:13, name:"超弩級砲塔列車スタマックス氏", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["自分ステージに存在する時、このカードをウイングに送り、相手キャラクター1体のATK-1000（このターンの終わりまで）。相手ターンでも発動できる。"]},
  {no:14, name:"記憶抹消", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["相手が効果を発動した時、手札から発動できる。その効果を無効にして、このカードをウイングに送る。"]},
  {no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["自分・相手のキャラクターがバトルする時、手札から発動できる。自分キャラクター1体のATK+1000（このターンの終わりまで）。"]},
  {no:16, name:"力こそパワー！！", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["自分ターンにのみ発動できる。相手のATKが1番低いキャラクター1体をウイングに送る。"]},
  {no:17, name:"キャトルミューティレーション", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["自分キャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を手札に戻す。"]},
  {no:18, name:"a-xブラスター01 -放射型-", type:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["自分ターンに手札から発動できる。自分キャラクター1体に装備しATK+500。タグ「射手」ならさらにATK+500し、相手ターン開始時に相手手札1枚をランダムにウイングへ送る。"]},
  {no:19, name:"-聖剣- アロングダイト", type:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["自分ターンに手札から発動できる。自分キャラクター1体に装備しATK+500。タグ「勇者」「剣士」ならさらにATK+500し、相手キャラをバトルでウイングに送った時1枚ドローする。"]},
  {no:20, name:"普通の棒", type:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:["自分ターンに手札から発動できる。自分キャラクター1体に装備しATK+300。タグ「勇者」ならさらにATK+500。"]},
];

/* ---------- Starter deck (20 types x2) ----------
   rank/atk は仮（テスト用） */
const CardRegistry = CardDB.map((c, i)=>{
  const rank = ((i % 5) + 1);
  const baseAtk = rank * 500;
  return {
    no: c.no,
    name: c.name,
    type: c.type,                  // character/effect/item
    tags: c.tags || [],
    titleTag: c.titleTag || "",
    text: normalizeText((c.effects || []).join("\n")),
    rank,
    baseAtk,
    tempAtk: 0,                    // turn until end
    equip: [],                     // attached items
    onceAttackUsed: false,
    onceEffectUsedTurn: -1,
    indestructibleTurn: -1,        // for No.12
  };
});

function currentAtk(card){
  return (card?.baseAtk || 0) + (card?.tempAtk || 0) + (card?.equip?.reduce((s,it)=> s + (it.atkBonus||0), 0) || 0);
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){ deck.push(structuredClone(c)); deck.push(structuredClone(c)); }
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
  pending: null, // {type, ...}
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

/* 裏面：card_back.png.PNG のような二重拡張子／大文字拡張子を確実に拾う */
function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());

  // 1) card_back を含むものを優先（拡張子や大小問わず）
  const bestIdx = lowers.findIndex(n=> n.startsWith("card_back") );
  if(bestIdx >= 0) return assetFiles[bestIdx];

  // 2) cardback / back
  const pri = ["cardback","back"];
  for(const p of pri){
    const i = lowers.findIndex(n=> n.startsWith(p) );
    if(i>=0) return assetFiles[i];
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
  if(s.includes(`${p2}_`)) score += 30;
  if(s.includes(`${p1}_`)) score += 20;
  // accept double ext
  if(s.includes(".png.jpg") || s.includes(".png.jpeg") || s.includes(".png.png")) score += 12;
  if(s.includes(".jpg")) score += 6;
  if(s.includes(".png")) score += 6;
  if(s.includes(".jpeg")) score += 5;
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
      log(`OK 裏面読込：適用 (${cache.backFile})`, "muted");
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

  applyBackToDeckPiles();
  renderAll();
}

function applyBackToDeckPiles(){
  // deck pile mini back
  const piles = document.querySelectorAll(".deckPile .pileBack");
  piles.forEach((p)=>{
    if(state.img.backUrl) p.style.backgroundImage = `url("${state.img.backUrl}")`;
    else p.style.backgroundImage = "";
  });
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
    bindLongPress(slot, ()=> openViewer(card, opts), 380);
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
  const atk = currentAtk(card);
  el.viewerTitle.textContent = `${card.name}`;
  el.viewerText.textContent = `${card.text || ""}\n\n【現在ATK】${atk}  /  RANK ${card.rank}`;
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
      s.textContent = `RANK ${c.rank} / ATK ${currentAtk(c)}`;

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

/* ---------- Turn / Phase core ---------- */
function setActiveSide(side){
  state.activeSide = side;
  setActiveUI();
  say(side==="P1" ? "あなたのターンです" : "相手のターンです");
}
function setPhase(p){
  state.phase = p;
  updateHUD();
  renderAll();
  if(state.activeSide==="P1"){
    if(p==="MAIN") say("手札を選んで、置く場所をタップしてください（見参は空きC長押し）");
    if(p==="BATTLE") say("攻撃する自分キャラをタップ → 相手キャラ/シールドをタップ");
    if(p==="DRAW") say("ドローしました");
  }
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

function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限でウイングへ → ${c.name}`, "muted");
  }
}

function clearTurnFlags(side){
  const p = state[side];
  for(const c of p.C){
    if(c) c.onceAttackUsed = false;
  }
  // ターン終了時に一時ATKを戻す（ターン中バフ）
  for(const c of p.C){
    if(c) c.tempAtk = 0;
  }
}

/* ---------- Battle ---------- */
function sendToWing(side, card){
  if(!card) return;
  // 装備も一緒に破壊
  if(card.equip && card.equip.length){
    for(const it of card.equip){
      state[side].wing.push(it.srcCard);
      log(`${side==="P1"?"あなた":"AI"}：装備破壊 → ${it.srcCard.name}`, "muted");
    }
    card.equip = [];
  }
  state[side].wing.push(card);
}

function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  const aAtk = currentAtk(A);
  const dAtk = currentAtk(D);
  log(`バトル：${A.name}(${aAtk}) vs ${D.name}(${dAtk})`, "muted");

  // No.12: 1ターンに1度バトルでは破壊されない（簡易：そのターンに初回だけ耐える）
  const A_ind = (A.no===12 && A.indestructibleTurn!==state.turn);
  const D_ind = (D.no===12 && D.indestructibleTurn!==state.turn);

  if(aAtk === dAtk){
    if(A_ind){ A.indestructibleTurn = state.turn; log(`${A.name}：耐えた（1ターン1度）`, "muted"); }
    else { state[aSide].C[aPos]=null; sendToWing(aSide, A); }
    if(D_ind){ D.indestructibleTurn = state.turn; log(`${D.name}：耐えた（1ターン1度）`, "muted"); }
    else { state[dSide].C[dPos]=null; sendToWing(dSide, D); }
    return;
  }

  if(aAtk > dAtk){
    if(D_ind){
      D.indestructibleTurn = state.turn;
      log(`${D.name}：耐えた（1ターン1度）`, "muted");
    }else{
      state[dSide].C[dPos]=null;
      sendToWing(dSide, D);
      log(`破壊：${D.name} → ウイング`, "muted");
    }
  }else{
    if(A_ind){
      A.indestructibleTurn = state.turn;
      log(`${A.name}：耐えた（1ターン1度）`, "muted");
    }else{
      state[aSide].C[aPos]=null;
      sendToWing(aSide, A);
      log(`破壊：${A.name} → ウイング`, "muted");
    }
  }
}

/* ---------- Effects core (最低限の実用版) ---------- */
function hasCardOnStageByName(side, name){
  const p = state[side];
  return p.C.some(c=>c?.name?.includes(name)) || p.E.some(e=>e?.name?.includes(name));
}

function findFromDeckOrWingByTag(side, tag){
  const p = state[side];
  const d = p.deck.findIndex(c=> (c.tags||[]).includes(tag));
  if(d>=0) return {from:"deck", idx:d};
  const w = p.wing.findIndex(c=> (c.tags||[]).includes(tag));
  if(w>=0) return {from:"wing", idx:w};
  return null;
}

function pullFromDeckBy(predicate, side){
  const p = state[side];
  const idx = p.deck.findIndex(predicate);
  if(idx<0) return null;
  return p.deck.splice(idx,1)[0];
}

function pullFromWingBy(predicate, side){
  const p = state[side];
  const idx = p.wing.findIndex(predicate);
  if(idx<0) return null;
  return p.wing.splice(idx,1)[0];
}

function equipToCharacter(side, charPos, itemCard, atkBonus){
  const ch = state[side].C[charPos];
  if(!ch) return false;
  ch.equip = ch.equip || [];
  ch.equip.push({srcCard:itemCard, atkBonus: atkBonus||0});
  log(`${side==="P1"?"あなた":"AI"}：装備 → ${itemCard.name}（ATK+${atkBonus||0}）`, "muted");
  return true;
}

/* --- KenSan: cost selection (hand OR stage(any card)) --- */
async function doKenSan(playerSide, handIndex, targetCPos){
  const p = state[playerSide];
  const card = p.hand[handIndex];
  if(!card) return;

  // KenSan can be unlimited, but requires cost if the card says so (Cruella/Nicola/Effie)
  // and also rank>=5 uses ken-san rule (cost: 1 card to wing) in this prototype.
  const needsCost = (card.no===1 || card.no===3 || card.no===6 || card.rank>=5);
  if(!needsCost){
    p.C[targetCPos] = p.hand.splice(handIndex,1)[0];
    log(`見参：${card.name}`, "muted");
    return;
  }

  // prepare pending state: choose cost source
  state.pending = {
    type:"kensan_cost",
    side: playerSide,
    handIndex,
    targetCPos,
    step:"choose_cost",
  };
  say("見参コスト：手札 または 自分ステージのカードを1枚選んでください");
  renderAll();
}

function payCostFromHand(side, idx){
  const p = state[side];
  const c = p.hand[idx];
  if(!c) return false;
  p.hand.splice(idx,1);
  p.wing.push(c);
  log(`${side==="P1"?"あなた":"AI"}：コスト → ${c.name} をウイング`, "muted");
  return true;
}
function payCostFromStage(side, zone, pos){
  const p = state[side];
  if(zone==="C"){
    const c = p.C[pos];
    if(!c) return false;
    p.C[pos]=null;
    sendToWing(side, c);
    log(`${side==="P1"?"あなた":"AI"}：コスト → ${c.name}（場）をウイング`, "muted");
    return true;
  }
  if(zone==="E"){
    const c = p.E[pos];
    if(!c) return false;
    p.E[pos]=null;
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：コスト → ${c.name}（E）をウイング`, "muted");
    return true;
  }
  return false;
}

/* ---------- AI logic (simple but safe) ---------- */
function aiTrySummon(){
  // place a character if empty
  const empty = state.AI.C.findIndex(x=>!x);
  if(empty<0) return;

  // prefer normal summonable (rank<=4 and not special-only)
  const idx = state.AI.hand.findIndex(c=> c.type==="character" && c.rank<=4 && ![1,3,6].includes(c.no));
  if(idx>=0){
    const c = state.AI.hand.splice(idx,1)[0];
    state.AI.C[empty]=c;
    log(`AI：登場 → ${c.name}`, "muted");
    // on-summon triggers
    aiOnSummon(c);
    return;
  }

  // ken-san for rank>=5 or special-only, pay cost from hand if possible
  const idx2 = state.AI.hand.findIndex(c=> c.type==="character" && (c.rank>=5 || [1,3,6].includes(c.no)));
  if(idx2>=0 && state.AI.hand.length>=2){
    // pay one cost
    const cost = state.AI.hand.splice(idx2===0?1:0,1)[0];
    state.AI.wing.push(cost);
    const c = state.AI.hand.splice(idx2>0?idx2-1:idx2,1)[0];
    state.AI.C[empty]=c;
    log(`AI：見参 → ${c.name}`, "muted");
    aiOnSummon(c);
  }
}

function aiOnSummon(card){
  // No.4 search krampus
  if(card.no===4){
    const pick = pullFromDeckBy(c=> (c.tags||[]).includes("クランプス"), "AI") || pullFromWingBy(c=> (c.tags||[]).includes("クランプス"), "AI");
    if(pick){
      state.AI.hand.push(pick);
      log(`AI：ラウス効果 → 手札に ${pick.name}`, "muted");
    }
  }
  // No.5 draw2
  if(card.no===5){
    draw("AI",2);
    log("AI：タータ効果 → 2ドロー", "muted");
  }
}

function aiTryUseItem(){
  // AI: do not use items/effects if no character to attach or target
  if(!state.AI.C.some(Boolean)) return;

  // simple: equip first item to first character
  const charPos = state.AI.C.findIndex(Boolean);
  const idx = state.AI.hand.findIndex(c=> c.type==="item");
  if(idx>=0 && charPos>=0){
    const it = state.AI.hand.splice(idx,1)[0];
    const bonus = (it.no===20)?300:(it.no===11||it.no===18||it.no===19)?500:0;
    equipToCharacter("AI", charPos, it, bonus);
  }
}

function aiBattle(){
  for(let i=0;i<3;i++){
    const atk = state.AI.C[i];
    if(!atk) continue;
    if(atk.onceAttackUsed) continue;
    atk.onceAttackUsed = true;

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
        log("敗北：ダイレクトアタック", "warn");
        say("敗北：ダイレクトアタック");
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
    say("相手ターンです");
    log("相手ターン開始", "warn");

    // START
    setPhase("START");
    clearTurnFlags("AI");
    await sleep(220);

    // DRAW
    setPhase("DRAW");
    draw("AI", 1);
    log("AI：ドロー +1", "muted");
    renderAll();
    await sleep(260);

    // MAIN
    setPhase("MAIN");
    aiTrySummon();
    aiTryUseItem();
    renderAll();
    await sleep(320);

    // BATTLE
    setPhase("BATTLE");
    aiBattle();
    renderAll();
    await sleep(420);

    // END
    setPhase("END");
    enforceHandLimit("AI");
    renderAll();
    await sleep(220);

    // switch to YOU
    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    clearTurnFlags("P1");
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    updateHUD();
    renderAll();

  }finally{
    state.aiRunning = false;
  }
}

/* ---------- Player actions ---------- */
function canPlaceToC(card){
  return card && card.type==="character";
}
function canPlaceToE(card){
  return card && (card.type==="effect" || card.type==="item");
}

function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  // pending kensan: choose stage cost
  if(state.pending && state.pending.type==="kensan_cost" && state.pending.step==="choose_cost"){
    // if player taps an occupied C -> pay from stage
    if(state.P1.C[pos]){
      payCostFromStage("P1", "C", pos);
      const {handIndex, targetCPos} = state.pending;
      state.pending = null;
      // after cost, summon
      const card = state.P1.hand[handIndex];
      if(card){
        state.P1.C[targetCPos] = state.P1.hand.splice(handIndex,1)[0];
        log(`見参：${card.name}`, "muted");
      }
      say("見参完了");
      renderAll();
      return;
    }
  }

  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;

    const card = state.P1.hand[state.selectedHandIndex];
    if(!card) return;

    // empty slot to place character (normal summon)
    if(!state.P1.C[pos]){
      if(!canPlaceToC(card)){
        log("このカードはCに置けません（キャラクターのみ）", "warn");
        say("Cはキャラクター専用です");
        return;
      }

      // special-only cannot normal summon
      if([1,3,6].includes(card.no)){
        log("このキャラクターは登場できません。見参で出してください（空きC長押し）", "warn");
        say("このキャラは見参のみです（空きC長押し）");
        return;
      }

      // normal summon: rank<=4 only (prototype)
      if(card.rank >= 5){
        log("RANK5以上は見参で出してください（空きC長押し）", "warn");
        say("RANK5以上は見参です（空きC長押し）");
        return;
      }

      state.P1.C[pos] = state.P1.hand.splice(state.selectedHandIndex,1)[0];
      state.selectedHandIndex = null;
      log(`登場：${card.name}`, "muted");

      // on summon triggers
      onPlayerSummon(card);

      renderAll();
      return;
    }
  }

  if(state.phase === "BATTLE"){
    if(!state.P1.C[pos]) return;
    const c = state.P1.C[pos];
    if(c.onceAttackUsed){
      log("このキャラクターはこのターン既に攻撃しました", "warn");
      say("1ターン1回攻撃です");
      return;
    }
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }
}

function onPlayerSummon(card){
  // No.4: search krampus
  if(card.no===4){
    say("ラウス効果：クランプスをサーチします");
    const pick = pullFromDeckBy(c=> (c.tags||[]).includes("クランプス"), "P1") || pullFromWingBy(c=> (c.tags||[]).includes("クランプス"), "P1");
    if(pick){
      state.P1.hand.push(pick);
      log(`ラウス効果：手札に ${pick.name}`, "muted");
    }else{
      log("ラウス効果：対象なし", "warn");
    }
  }
  // No.5: draw2
  if(card.no===5){
    draw("P1", 2);
    log("タータ効果：2ドロー", "muted");
    say("タータ効果：2ドロー");
  }
}

/* long press empty slot => KenSan */
function onLongPressEmptySlotForKenSan(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card || card.type!=="character") return;

  askConfirm("見参", `${card.name} を見参しますか？\nコスト：手札 または 自分ステージのカードを1枚ウイングへ`, ()=>{
    doKenSan("P1", state.selectedHandIndex, pos);
    // doKenSan sets pending; cost selection continues
  });
}

/* If pending cost, hand click pays cost */
function onClickHand(i){
  if(state.activeSide!=="P1") return;

  // pending kensan cost: click a hand card to pay cost
  if(state.pending && state.pending.type==="kensan_cost" && state.pending.step==="choose_cost"){
    // cannot pay with the summoning card itself
    const {handIndex, targetCPos} = state.pending;
    if(i===handIndex){
      say("コストにするカードを別で選んでください");
      return;
    }
    payCostFromHand("P1", i);
    const card = state.P1.hand[handIndex > i ? handIndex-1 : handIndex]; // index shift
    state.pending = null;
    if(card){
      // summon
      const realIndex = (handIndex > i) ? handIndex-1 : handIndex;
      state.P1.C[targetCPos] = state.P1.hand.splice(realIndex,1)[0];
      log(`見参：${card.name}`, "muted");
    }
    state.selectedHandIndex = null;
    say("見参完了");
    renderAll();
    return;
  }

  // normal select
  state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
  state.selectedAttackerPos = null;
  renderAll();
}

/* Place/Use E (items/effects) */
function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card) return;

  if(!canPlaceToE(card)){
    log("このカードはEに置けません（アイテム/エフェクトのみ）", "warn");
    say("Eはアイテム/エフェクト専用です");
    return;
  }

  // E slot may be used as a staging area, but:
  // - effect: resolve immediately and goes to wing
  // - item: requires choose your character to equip (cannot if no character)
  if(card.type==="effect"){
    useEffectFromHand_P1(card);
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex=null;
    renderAll();
    return;
  }

  // item
  if(!state.P1.C.some(Boolean)){
    log("装備対象のキャラクターがいません", "warn");
    say("装備するキャラを先に出してください");
    return;
  }

  // choose target character
  state.pending = {type:"equip_choose", itemIndex: state.selectedHandIndex, ePos: pos};
  say("装備する自分キャラクターをタップしてください");
  renderAll();
}

function useEffectFromHand_P1(card){
  // Flame Bullet (No.2) condition: Cruella on stage
  if(card.no===2){
    if(!hasCardOnStageByName("P1","クルエラ")){
      log("フレイムバレット：クルエラがいないため発動できません", "warn");
      say("クルエラがいないため発動できません");
      state.P1.wing.push(card); // discard used card
      return;
    }
    // Choose mode
    askConfirm("フレイムバレット", "効果を選択してください\nOK：ATK最高1体をウイング\nキャンセル：rank4以下をすべてウイング", ()=>{
      // OK path
      const targets = state.AI.C.filter(Boolean);
      if(!targets.length){
        log("相手キャラがいません", "warn");
      }else{
        let bestPos = -1;
        let bestAtk = -1;
        for(let i=0;i<3;i++){
          const c = state.AI.C[i];
          if(!c) continue;
          const a = currentAtk(c);
          if(a > bestAtk){ bestAtk=a; bestPos=i; }
        }
        if(bestPos>=0){
          const d = state.AI.C[bestPos];
          state.AI.C[bestPos]=null;
          sendToWing("AI", d);
          log(`フレイムバレット：ATK最高を破壊 → ${d.name}`, "muted");
        }
      }
      state.P1.wing.push(card);
      say("フレイムバレット発動");
      renderAll();
    });
    // cancel path uses on close by user; keep simple:
    el.btnNo.onclick = ()=>{
      hideModal("confirmM");
      // rank<=4 all
      for(let i=0;i<3;i++){
        const c = state.AI.C[i];
        if(c && c.rank<=4){
          state.AI.C[i]=null;
          sendToWing("AI", c);
          log(`フレイムバレット：rank4以下破壊 → ${c.name}`, "muted");
        }
      }
      state.P1.wing.push(card);
      say("フレイムバレット発動");
      renderAll();
    };
    return;
  }

  // 力こそパワー (No.16)
  if(card.no===16){
    if(state.phase!=="MAIN") { state.P1.wing.push(card); return; }
    let minPos=-1, minAtk=1e9;
    for(let i=0;i<3;i++){
      const c=state.AI.C[i];
      if(!c) continue;
      const a=currentAtk(c);
      if(a<minAtk){ minAtk=a; minPos=i; }
    }
    if(minPos>=0){
      const t=state.AI.C[minPos];
      state.AI.C[minPos]=null;
      sendToWing("AI", t);
      log(`力こそパワー：ATK最小をウイング → ${t.name}`, "muted");
    }else{
      log("力こそパワー：相手キャラなし", "warn");
    }
    state.P1.wing.push(card);
    say("効果発動");
    return;
  }

  // 桜蘭の陰陽術 (No.15)：簡易＝自分キャラ選択して+1000
  if(card.no===15){
    if(!state.P1.C.some(Boolean)){
      log("闘：対象キャラがいません", "warn");
      state.P1.wing.push(card);
      return;
    }
    state.pending = {type:"buff_choose", card};
    say("ATK+1000する自分キャラをタップしてください");
    return;
  }

  // その他：とりあえず使用→ウイング（後で精密化）
  log(`効果発動：${card.name}（簡易）`, "muted");
  state.P1.wing.push(card);
  say("効果発動（簡易）");
}

/* Enemy targets on battle */
function onClickEnemyCard(enemyPos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  const defCard = state.AI.C[enemyPos];
  if(!atkCard || !defCard) return;

  askConfirm("攻撃確認", `${atkCard.name} → ${defCard.name}\n攻撃しますか？`, ()=>{
    atkCard.onceAttackUsed = true;
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
    say("相手キャラがいる間はシールド不可");
    return;
  }
  if(!state.AI.shield[idx]){
    log("そのシールドは既にありません", "warn");
    return;
  }

  askConfirm("攻撃確認", `${atkCard.name} がシールドを攻撃します。\nシールド破壊（→相手手札）しますか？`, ()=>{
    atkCard.onceAttackUsed = true;
    const sh = state.AI.shield[idx];
    state.AI.shield[idx] = null;
    state.AI.hand.push(sh);
    log(`シールド破壊：相手手札へ → ${sh.name}`, "muted");

    if(state.AI.shield.every(x=>!x)){
      log("相手シールド全破壊：次の攻撃でダイレクト可能", "muted");
      say("相手シールド全破壊：ダイレクト可能");
    }

    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- Render parts ---------- */
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
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const sel = (state.selectedAttackerPos===i);
    const slot = makeSlot(c, {glow, sel});

    slot.addEventListener("click", ()=>{
      // pending equip choose
      if(state.pending && state.pending.type==="equip_choose"){
        const it = state.P1.hand[state.pending.itemIndex];
        if(!it) return;
        const bonus = (it.no===20)?300:(it.no===11||it.no===18||it.no===19)?500:0;
        equipToCharacter("P1", i, it, bonus);
        state.P1.hand.splice(state.pending.itemIndex,1);
        state.pending = null;
        state.selectedHandIndex=null;
        say("装備しました");
        renderAll();
        return;
      }

      // pending buff choose
      if(state.pending && state.pending.type==="buff_choose"){
        const ef = state.pending.card;
        const ch = state.P1.C[i];
        if(ch){
          ch.tempAtk += 1000;
          log(`闘：${ch.name} ATK+1000（ターン終了まで）`, "muted");
        }
        state.P1.wing.push(ef);
        state.pending = null;
        state.selectedHandIndex=null;
        say("強化しました");
        renderAll();
        return;
      }

      onClickYourC(i);
    }, {passive:true});

    if(!c) bindLongPress(slot, ()=> onLongPressEmptySlotForKenSan(i));
    el.pC.appendChild(slot);
  }

  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const slot = makeSlot(c, {});
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
    }

    h.addEventListener("click", ()=> onClickHand(i), {passive:true});
    bindLongPress(h, ()=> openViewer(c), 380);
    el.hand.appendChild(h);
  }
}

function renderEnemyHand(){
  el.aiHand.innerHTML = "";
  const n = state.AI.hand.length;
  el.enemyHandLabel.textContent = `ENEMY HAND ×${n}`;
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
  applyBackToDeckPiles();
}

/* ---------- Board clicks (wing/outside) ---------- */
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

/* ---------- Phase Buttons ---------- */
function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
    state.pending = null;
    say("ターン開始");
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${state.activeSide==="P1"?"あなた":"AI"}：ドロー +1`, "muted");
    say("ドロー +1");
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
    say("エンド");
  }

  updateHUD();
  renderAll();
}

function endTurn(){
  enforceHandLimit(state.activeSide);

  if(state.activeSide==="P1"){
    // switch to AI and run AI turn guaranteed
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
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  state.pending = null;
  state.aiRunning = false;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  // shield: top3
  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  // hand: 4 (先攻も初期は4、ドローで5になる)
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
    say("先攻：あなた");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
    say("先攻：相手");
  }

  log("ゲーム開始：シールド3（裏向き）/ 初手4", "muted");

  updateHUD();
  renderAll();

  // If AI first -> run AI turn immediately
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
  }, 320);
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
  log("盤面は常時表示／詳細は長押し／シールド・デッキ・相手手札は裏面", "muted");
  say("準備完了。STARTで開始");
}

document.addEventListener("DOMContentLoaded", init);