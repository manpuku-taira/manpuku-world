/* =========================================================
  Manpuku World - app.js (FULL REPLACE)
  修正:
  - タイトル画面で "JS: ..." が前面に出て開始できない問題を修正
  - タイトルロゴが出ない問題を修正（titleArtが無くても自動IMG生成）
  - btnStartが無くてもタイトル画面タップで開始できるフォールバック追加
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

function safeEl(id){
  const e = $(id);
  return e ? e : null;
}
function setText(e, t){ if(e) e.textContent = t; }
function addClass(e, c){ if(e) e.classList.add(c); }
function removeClass(e, c){ if(e) e.classList.remove(c); }
function toggleClass(e, c, on){ if(e) e.classList.toggle(c, !!on); }

const el = {
  // screens
  title: safeEl("title"),
  game: safeEl("game"),

  // title
  boot: safeEl("boot"),
  btnStart: safeEl("btnStart"),
  titleArt: safeEl("titleArt"),

  // hud
  chipTurn: safeEl("chipTurn"),
  chipPhase: safeEl("chipPhase"),
  chipActive: safeEl("chipActive"),
  firstInfo: safeEl("firstInfo"),

  btnHelp: safeEl("btnHelp"),
  btnSettings: safeEl("btnSettings"),
  btnNext: safeEl("btnNext"),
  btnEnd: safeEl("btnEnd"),
  btnLog: safeEl("btnLog"),

  fieldTop: safeEl("fieldTop"),
  fieldBottom: safeEl("fieldBottom"),

  aiC: safeEl("aiC"),
  aiE: safeEl("aiE"),
  pC: safeEl("pC"),
  pE: safeEl("pE"),

  hand: safeEl("hand"),
  aiHand: safeEl("aiHand"),
  enemyHandLabel: safeEl("enemyHandLabel"),

  aiDeckN: safeEl("aiDeckN"),
  aiWingN: safeEl("aiWingN"),
  aiOutN: safeEl("aiOutN"),
  pDeckN: safeEl("pDeckN"),
  pWingN: safeEl("pWingN"),
  pOutN: safeEl("pOutN"),

  aiDirectHint: safeEl("aiDirectHint"),
  pDirectHint: safeEl("pDirectHint"),

  // modals
  viewerM: safeEl("viewerM"),
  viewerTitle: safeEl("viewerTitle"),
  viewerImg: safeEl("viewerImg"),
  viewerText: safeEl("viewerText"),
  btnCardAct: safeEl("btnCardAct"),

  choiceM: safeEl("choiceM"),
  choiceTitle: safeEl("choiceTitle"),
  choiceBody: safeEl("choiceBody"),

  zoneM: safeEl("zoneM"),
  zoneTitle: safeEl("zoneTitle"),
  zoneBody: safeEl("zoneBody"),

  resultM: safeEl("resultM"),
  resultText: safeEl("resultText"),
  btnNextGame: safeEl("btnNextGame"),
  btnBackTitle: safeEl("btnBackTitle"),

  logM: safeEl("logM"),
  logBody: safeEl("logBody"),

  settingsM: safeEl("settingsM"),
  repoInput: safeEl("repoInput"),
  btnRepoSave: safeEl("btnRepoSave"),
  btnRescan: safeEl("btnRescan"),
  btnClearCache: safeEl("btnClearCache"),

  helpM: safeEl("helpM"),
};

const LOGS = [];
function log(msg, kind="muted"){
  LOGS.unshift({msg, kind, t: Date.now()});
  if(el.logM && el.logM.classList.contains("show")) renderLogModal();
  // タイトル画面で邪魔になる「JS: ...」等の表示をしないため、bootにはログを出さない
  console.log(`[LOG/${kind}]`, msg);
}
window.addEventListener("error", (e)=> log(`JSエラー: ${e.message || e.type}`, "warn"));
window.addEventListener("unhandledrejection", (e)=> log(`Promiseエラー: ${String(e.reason || "")}`, "warn"));

function renderLogModal(){
  if(!el.logBody) return;
  el.logBody.innerHTML = "";
  if(!LOGS.length){
    const d = document.createElement("div");
    d.className = "logLine";
    d.textContent = "（ログはまだありません）";
    el.logBody.appendChild(d);
    return;
  }
  for(const it of LOGS.slice(0, 240)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind==="warn"?"warn":""}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

function bindLongPress(node, fn, ms=620){
  if(!node) return;
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(()=>fn(), ms); };
  const end = ()=> clearTimeout(t);
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
}
function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function validateImage(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=> resolve(true);
    img.onerror = ()=> resolve(false);
    img.src = url;
  });
}

/* ---------------- Cards (No.01〜20) ---------------- */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", type:"character",
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウイングからカード名に「黒魔法」を含むカード1枚を手札に加える。"
    ),
    rank:5, atk:2500, summon:"kensan" },

  { no:2,  name:"黒魔法-フレイムバレット", type:"effect",
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ステージに「クルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    ),
    rank:0, atk:0 },

  { no:3,  name:"トナカイの少女ニコラ", type:"character",
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ),
    rank:5, atk:2000, summon:"kensan" },

  { no:4,  name:"聖ラウス", type:"character",
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    ),
    rank:3, atk:1800 },

  { no:5,  name:"統括AI タータ", type:"character",
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ),
    rank:4, atk:1000 },

  { no:6,  name:"麗し令嬢エフィ", type:"character",
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    ),
    rank:5, atk:2000, summon:"kensan" },

  { no:7,  name:"狩樹 まひる", type:"character",
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃する事ができる。\n" +
      "相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    ),
    rank:4, atk:1700 },

  { no:8,  name:"組織の男 手形", type:"character",
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText(
      "相手ターンに1度発動できる。相手が発動した効果を無効にする。\n" +
      "（キャラクター／エフェクト／アイテム、すべての効果に対して無効にできる）"
    ),
    rank:3, atk:1900 },

  { no:9,  name:"小太郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n" +
      "自分ステージに「小次郎」カードがある時、このカードのATK+500。"
    ),
    rank:3, atk:1600 },

  { no:10, name:"小次郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n" +
      "自分ステージに「小太郎」カードがある時、このカードのATK+500。"
    ),
    rank:3, atk:1500 },

  { no:11, name:"司令", type:"character",
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。\n" +
      "（発動条件：自分ステージにこのカード以外のキャラクターがいる時のみ）"
    ),
    rank:2, atk:1200 },

  { no:12, name:"班目プロデューサー", type:"character",
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"),
    rank:2, atk:800 },

  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character",
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:1, atk:100 },

  { no:14, name:"記憶抹消", type:"effect",
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。"),
    rank:0, atk:0 },

  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect",
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    rank:0, atk:0 },

  { no:16, name:"力こそパワー！！", type:"effect",
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"),
    rank:0, atk:0 },

  { no:17, name:"キャトルミューティレーション", type:"effect",
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    rank:0, atk:0 },

  { no:18, name:"a-xブラスター01 -放射型-", type:"item",
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    ),
    rank:0, atk:0 },

  { no:19, name:"-聖剣- アロングダイト", type:"item",
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    ),
    rank:0, atk:0 },

  { no:20, name:"普通の棒", type:"item",
    tags:["木の棒","可能性"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\n" +
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    ),
    rank:0, atk:0 },
];

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push(makeInstance(c));
    deck.push(makeInstance(c));
  }
  shuffle(deck);
  return deck;
}

let _uid = 1;
function makeInstance(cardDef){
  return {
    uid: `u${_uid++}`,
    no: cardDef.no,
    name: cardDef.name,
    type: cardDef.type,
    tags: [...(cardDef.tags||[])],
    titleTag: cardDef.titleTag || "",
    text: cardDef.text || "",
    rank: cardDef.rank || 0,
    baseAtk: cardDef.atk || 0,
    summon: cardDef.summon || "normal",
    tempAtk: 0,
    equipUid: null,
    equippedToUid: null,
    used: { perTurn:false },
    flags: { producerSavedThisTurn:false, attackedCountThisTurn:0 }
  };
}

/* ---------------- State ---------------- */
const state = {
  started:false,
  gameOver:false,

  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",

  normalSummonUsed:false,
  selectedHandIndex:null,

  battle: { attackerUid:null, attackerPos:null, attackerSide:null },
  viewer: { side:null, zone:null, pos:null, uid:null },

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },

  limits: {
    P1: { handgataUsed:false, cruellaUsed:false, tataUsed:false },
    AI: { handgataUsed:false, cruellaUsed:false, tataUsed:false },
  }
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(c){ return c && c.type==="character"; }
function isEffect(c){ return c && c.type==="effect"; }
function isItem(c){ return c && c.type==="item"; }
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function opponent(side){ return side==="P1" ? "AI" : "P1"; }
function isFirstTurnBattleLocked(){ return state.turn===1; }

/* ---------------- Modal close ---------------- */
document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close==="viewer") el.viewerM && el.viewerM.classList.remove("show");
  if(close==="choice") el.choiceM && el.choiceM.classList.remove("show");
  if(close==="settings") el.settingsM && el.settingsM.classList.remove("show");
  if(close==="help") el.helpM && el.helpM.classList.remove("show");
  if(close==="log") el.logM && el.logM.classList.remove("show");
  if(close==="zone") el.zoneM && el.zoneM.classList.remove("show");
  if(close==="result") el.resultM && el.resultM.classList.remove("show");
});

/* ---------------- Choice ---------------- */
let choiceResolver = null;
function showModal(m){ m && m.classList.add("show"); }
function hideModal(m){ m && m.classList.remove("show"); }

function askChoice(title, message, items){
  if(!el.choiceM || !el.choiceTitle || !el.choiceBody){
    // 最低限フォールバック（choice UIが無い環境でも止めない）
    log(`Choice UIが見つかりません: ${title} / ${message}`, "warn");
    return Promise.resolve(items?.[0]?.value ?? null);
  }

  el.choiceTitle.textContent = title;
  el.choiceBody.innerHTML = "";

  const msg = document.createElement("div");
  msg.className = "choiceMsg";
  msg.textContent = message;
  el.choiceBody.appendChild(msg);

  const list = document.createElement("div");
  list.className = "choiceList";

  for(const it of items){
    const row = document.createElement("div");
    row.className = "choiceItem";

    const th = document.createElement("div");
    th.className = "choiceThumb";
    if(it.card){
      const url = state.img.cardUrlByNo[pad2(it.card.no)];
      if(url) th.style.backgroundImage = `url("${url}")`;
    }

    const meta = document.createElement("div");
    meta.className = "choiceMeta";
    const tt = document.createElement("div");
    tt.className = "t";
    tt.textContent = it.label;
    const ss = document.createElement("div");
    ss.className = "s";
    ss.textContent = it.sub || "";
    meta.appendChild(tt);
    if(ss.textContent) meta.appendChild(ss);

    row.appendChild(th);
    row.appendChild(meta);

    row.addEventListener("click", ()=>{
      hideModal(el.choiceM);
      if(choiceResolver){ const r = choiceResolver; choiceResolver=null; r(it.value); }
    }, {passive:true});

    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);
  showModal(el.choiceM);
  return new Promise((resolve)=>{ choiceResolver = resolve; });
}
async function askYesNo(title, message){
  const v = await askChoice(title, message, [
    {label:"はい", value:"Y"},
    {label:"いいえ", value:"N"},
  ]);
  return v==="Y";
}

/* ---------------- Images / GitHub scan ---------------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v8"; // bump
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

function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());
  const idxAny = lowers.findIndex(n=>n.startsWith("card_back"));
  if(idxAny>=0) return assetFiles[idxAny];
  return "";
}
function pickFieldFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());
  const idxAny = lowers.findIndex(n=>n.startsWith("field."));
  if(idxAny>=0) return assetFiles[idxAny];
  return "";
}
function scoreCardFilename(name, no){
  const s = name.toLowerCase();
  const p2 = pad2(no).toLowerCase();
  let score = 0;
  if(s.startsWith(`${p2}_`)) score += 100;
  if(s.includes(`${p2}_`)) score += 30;
  if(s.includes(".png")) score += 5;
  if(s.includes(".jpg")) score += 5;
  if(s.includes(".jpeg")) score += 4;
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

async function resolveBackUrl(cacheBackFile){
  const directCandidates = [
    "/assets/card_back.png.PNG",
    "/assets/card_back.png.png",
    "/assets/card_back.png",
    "/assets/card_back.PNG",
    "/assets/card_back.PNG.png",
    "/assets/card_back.PNG.PNG",
    "/assets/card_back.jpg",
    "/assets/card_back.jpeg",
  ];
  if(cacheBackFile){
    const u = vercelPathAssets(cacheBackFile);
    if(await validateImage(u)) return u;
  }
  for(const u of directCandidates){
    if(await validateImage(u)) return u;
  }
  return "";
}

async function rescanImages(){
  state.img.ready = false;
  log("画像スキャン開始（GitHub）…");

  const cache = { repo:getRepo(), scannedAt:Date.now() };
  try{
    const [assetFiles, cardFiles] = await Promise.all([
      ghList("assets"),
      ghList("assets/cards"),
    ]);
    cache.assetFiles = assetFiles;
    cache.cardFiles = cardFiles;
    cache.fieldFile = pickFieldFile(assetFiles) || "";
    cache.backFile  = pickBackFile(assetFiles) || "";
    cache.cardMap   = buildCardMapFromFileList(cardFiles);
    setCache(cache);
    log("画像スキャン完了：適用します");
  }catch(err){
    setCache(cache);
    log(`GitHubスキャン失敗：${String(err.message||err)}（直接パスで復旧）`, "warn");
  }
  await applyImagesFromCache();
}

/** タイトルロゴを「確実に」見せる：titleArtがなくてもimgを自動生成 */
async function applyTitleLogo(){
  const candidates = ["/assets/title.PNG", "/assets/title.png"];
  let found = "";
  for(const u of candidates){
    if(await validateImage(u)){ found = u; break; }
  }

  // 1) titleArt があるなら background-image
  if(el.titleArt){
    el.titleArt.style.pointerEvents = "none"; // クリックを邪魔しない
    el.titleArt.style.backgroundRepeat = "no-repeat";
    el.titleArt.style.backgroundPosition = "center";
    el.titleArt.style.backgroundSize = "contain";
    el.titleArt.style.backgroundImage = found ? `url("${found}")` : "";
  }

  // 2) titleArt が無い or CSSで出ない場合の保険：imgを自動生成
  if(el.title){
    let img = $("titleLogoAuto");
    if(!img){
      img = document.createElement("img");
      img.id = "titleLogoAuto";
      img.alt = "TITLE";
      img.style.display = found ? "block" : "none";
      img.style.maxWidth = "92%";
      img.style.maxHeight = "38vh";
      img.style.objectFit = "contain";
      img.style.margin = "0 auto 10px auto";
      img.style.pointerEvents = "none"; // クリック阻害しない
      // title内の先頭に入れる
      el.title.insertBefore(img, el.title.firstChild);
    }
    if(found){
      img.src = found;
      img.style.display = "block";
    }else{
      img.style.display = "none";
      log("タイトルロゴが見つかりません：/assets/title.PNG または /assets/title.png を確認してください", "warn");
    }
  }
}

async function applyImagesFromCache(){
  const cache = getCache();

  state.img.fieldUrl = "";
  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)) state.img.fieldUrl = u;
  }
  if(state.img.fieldUrl){
    if(el.fieldTop) el.fieldTop.style.backgroundImage = `url("${state.img.fieldUrl}")`;
    if(el.fieldBottom) el.fieldBottom.style.backgroundImage = `url("${state.img.fieldUrl}")`;
  }else{
    if(el.fieldTop) el.fieldTop.style.backgroundImage = "";
    if(el.fieldBottom) el.fieldBottom.style.backgroundImage = "";
  }

  state.img.backUrl = await resolveBackUrl(cache.backFile || "");

  state.img.cardUrlByNo = {};
  const map = (cache.cardMap || {});
  for(const k of Object.keys(map)){
    state.img.cardUrlByNo[k] = vercelPathCards(map[k]);
  }

  await applyTitleLogo();

  state.img.ready = true;
  renderAll();
}

/* ---------------- Minimal helpers ---------------- */
function moveToWing(side, card){ if(card) state[side].wing.unshift(card); }
function removeFromZone(zoneArr, uid){
  const idx = zoneArr.findIndex(x=>x && x.uid===uid);
  if(idx>=0){ return zoneArr.splice(idx,1)[0]; }
  return null;
}
function clearEndTurnTemps(side){
  const p = state[side];
  for(const c of p.C){
    if(!c) continue;
    c.tempAtk = 0;
    c.flags.attackedCountThisTurn = 0;
    c.flags.producerSavedThisTurn = false;
  }
}
function hasOnStage(side, pred){
  const p = state[side];
  for(const c of p.C) if(pred(c)) return true;
  return false;
}
function findEmptyIndex(arr){
  for(let i=0;i<arr.length;i++) if(!arr[i]) return i;
  return -1;
}
function countShields(side){
  return state[side].shield.filter(Boolean).length;
}
function findEquipInE(side, equipUid){
  const E = state[side].E;
  for(const it of E){
    if(it && it.uid===equipUid) return it;
  }
  return null;
}
function calcCurrentAtk(side, card){
  if(!card) return 0;
  let atk = card.baseAtk + (card.tempAtk||0);
  if(card.equipUid){
    const equip = findEquipInE(side, card.equipUid);
    if(equip && equip._equipBonus) atk += equip._equipBonus;
    if(equip && equip._equipBonus2) atk += equip._equipBonus2;
  }
  if(card.no===9 && hasOnStage(side, (c)=>c && c.no===10)) atk += 500;
  if(card.no===10 && hasOnStage(side, (c)=>c && c.no===9)) atk += 500;
  return atk;
}

/* ---------------- Rendering (null safe) ---------------- */
function updateHUD(){
  setText(el.chipTurn, `TURN ${state.turn}`);
  setText(el.chipPhase, state.phase);
  setText(el.chipActive, (state.activeSide==="P1") ? "YOUR TURN" : "ENEMY TURN");

  const isYour = (state.activeSide==="P1" && !state.gameOver);
  if(el.btnNext){
    el.btnNext.disabled = !isYour;
    el.btnNext.style.opacity = isYour ? "1" : ".45";
  }
  if(el.btnEnd){
    el.btnEnd.disabled = !isYour;
    el.btnEnd.style.opacity = isYour ? "1" : ".45";
  }
}
function updateCounts(){
  if(el.aiDeckN) setText(el.aiDeckN, state.AI.deck.length);
  if(el.aiWingN) setText(el.aiWingN, state.AI.wing.length);
  if(el.aiOutN) setText(el.aiOutN, state.AI.outside.length);
  if(el.pDeckN) setText(el.pDeckN, state.P1.deck.length);
  if(el.pWingN) setText(el.pWingN, state.P1.wing.length);
  if(el.pOutN) setText(el.pOutN, state.P1.outside.length);
  if(el.enemyHandLabel) setText(el.enemyHandLabel, `ENEMY HAND ×${state.AI.hand.length}`);
}
function renderDirectHints(){
  const p0 = countShields("P1")==0;
  const a0 = countShields("AI")==0;
  toggleClass(el.pDirectHint, "show", p0);
  toggleClass(el.aiDirectHint, "show", a0);
}
function renderAll(){
  updateHUD();
  updateCounts();
  renderDirectHints();
  // ここから先の盤面描画は、HTML側のIDが揃っている時のみ動く（揃っていない環境でも止めない）
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
  renderPiles();
}

/* ---------- 盤面描画（元仕様：IDが無い場合はスキップ） ---------- */
function faceForCard(card, side, opts={}){
  const face = document.createElement("div");
  face.className = "face";
  const url = state.img.cardUrlByNo[pad2(card.no)];
  if(url){
    face.style.backgroundImage = `url("${url}")`;
  }else{
    face.classList.add("fallback");
  }
  if(opts.enemy) face.style.transform = "rotate(180deg)";
  return face;
}
function makeSlot(card, side, ctx, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");
  if(card){
    slot.appendChild(faceForCard(card, side, {enemy:!!opts.enemy}));
    if(isCharacter(card) && card.equipUid){
      const eb = document.createElement("div");
      eb.className = "equipBadge";
      slot.appendChild(eb);
    }
    if(isCharacter(card)){
      const cur = calcCurrentAtk(side, card);
      const plus = cur - (card.baseAtk||0);
      const b = document.createElement("div");
      b.className = "atkBadge" + (plus>0 ? " plus" : "");
      b.textContent = `${cur}`;
      slot.appendChild(b);
    }
  }
  return slot;
}
function renderZones(){
  if(!el.aiE || !el.aiC || !el.pC || !el.pE) return;

  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    el.aiE.appendChild(makeSlot(state.AI.E[i], "AI", {side:"AI", zone:"E", pos:i}, {enemy:true}));
  }
  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    el.aiC.appendChild(makeSlot(state.AI.C[i], "AI", {side:"AI", zone:"C", pos:i}, {enemy:true}));
  }

  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, "P1", {side:"P1", zone:"C", pos:i}, {glow});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(slot);
  }
  el.pE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, "P1", {side:"P1", zone:"E", pos:i}, {glow});
    slot.addEventListener("click", ()=> onClickYourE(i), {passive:true});
    el.pE.appendChild(slot);
  }
}
function renderHand(){
  if(!el.hand) return;
  el.hand.innerHTML="";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className="handCard";
    const playable = (state.activeSide==="P1" && state.phase==="MAIN" && !state.gameOver);
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");
    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;
    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1" || state.gameOver) return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      renderAll();
    }, {passive:true});
    el.hand.appendChild(h);
  }
}
function renderEnemyHand(){
  if(!el.aiHand) return;
  el.aiHand.innerHTML="";
  const n = state.AI.hand.length;
  const show = Math.min(n, 12);
  for(let i=0;i<show;i++){
    const b = document.createElement("div");
    b.className="handBack";
    if(state.img.backUrl) b.style.backgroundImage = `url("${state.img.backUrl}")`;
    el.aiHand.appendChild(b);
  }
}
function renderShields(){
  const slots = document.querySelectorAll(".shieldSlot");
  if(!slots.length) return;

  slots.forEach((slot)=>{
    const side = slot.getAttribute("data-side");
    const idx = Number(slot.getAttribute("data-idx")||"0");
    const cardNode = slot.querySelector(".shieldCard");
    if(!cardNode) return;
    const sh = state[side]?.shield?.[idx];
    const exists = !!sh;
    cardNode.classList.toggle("empty", !exists);
    if(exists && state.img.backUrl){
      cardNode.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      cardNode.style.backgroundImage = "";
    }
  });

  slots.forEach((slot)=>{
    slot.onclick = null;
    slot.addEventListener("click", ()=>{
      const side = slot.getAttribute("data-side");
      const idx = Number(slot.getAttribute("data-idx")||"0");
      onShieldClicked(side, idx);
    }, {passive:true});
  });
}
function renderPiles(){
  const backs = document.querySelectorAll(".pileCard.deckBack");
  backs.forEach((n)=>{
    if(state.img.backUrl) n.style.backgroundImage = `url("${state.img.backUrl}")`;
    else n.style.backgroundImage = "";
  });
}

/* ---------------- Game core (必要最低限：開始できることを優先) ---------------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${sideName(side)}：デッキ切れ`, "warn");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}
function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.unshift(c);
    log(`${sideName(side)}：手札上限→ウイング ${c.name}`);
  }
}
function resetPerTurn(side){
  state.limits[side].handgataUsed = false;
  state.limits[side].cruellaUsed = false;
  state.limits[side].tataUsed = false;
  const p = state[side];
  for(const c of p.C){
    if(!c) continue;
    c.used.perTurn = false;
    c.flags.attackedCountThisTurn = 0;
    c.flags.producerSavedThisTurn = false;
  }
}

function startGame(){
  state.gameOver=false;
  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.battle.attackerUid=null;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  state.P1.hand=[]; state.AI.hand=[];
  draw("P1", 4);
  draw("AI", 4);

  state.P1.C=[null,null,null]; state.P1.E=[null,null,null];
  state.AI.C=[null,null,null]; state.AI.E=[null,null,null];
  state.P1.wing=[]; state.AI.wing=[];
  state.P1.outside=[]; state.AI.outside=[];

  resetPerTurn("P1");
  resetPerTurn("AI");

  state.firstSide = (Math.random()<0.5) ? "P1" : "AI";
  state.activeSide = state.firstSide;

  if(el.firstInfo) el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log(`ゲーム開始：初手4 / シールド3 / 先攻=${state.firstSide}`);

  renderAll();
}

/* ---------------- Input events (最低限) ---------------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;
  if(state.phase!=="MAIN") return;
  if(state.P1.C[pos]) return;
  if(state.selectedHandIndex==null) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card)){
    log("Cにはキャラクターのみ置けます", "warn");
    return;
  }
  // ここでは詳細ルールは省略（開始できることを優先）
  state.P1.C[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  log(`登場：${card.name}`);
  renderAll();
}
function onClickYourE(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;
  if(state.phase!=="MAIN") return;
  if(state.P1.E[pos]) return;
  if(state.selectedHandIndex==null) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(isCharacter(card)){
    log("Eにはエフェクト/アイテムのみ置けます", "warn");
    return;
  }
  state.P1.E[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  log(`E配置：${card.name}`);
  renderAll();
}
function onShieldClicked(){ /* タイトル問題修正のため今回は無処理 */ }

/* ---------------- Title screen control (ここが今回の主修正) ---------------- */
function showTitleScreen(){
  state.started = false;
  state.gameOver = false;

  // 表示切替（HTML側classが違っても、最低限表示は維持）
  if(el.game) el.game.classList.remove("active");
  if(el.title) el.title.classList.add("active");

  // bootの邪魔排除：タイトル画面では非表示＆クリック透過
  if(el.boot){
    el.boot.style.display = "none";
    el.boot.style.pointerEvents = "none";
  }
}
function showGameScreen(){
  if(el.title) el.title.classList.remove("active");
  if(el.game) el.game.classList.add("active");

  // bootはゲーム中も邪魔になる場合があるので、常時非表示にする
  if(el.boot){
    el.boot.style.display = "none";
    el.boot.style.pointerEvents = "none";
  }
}

function bindStart(){
  showTitleScreen();

  const go = ()=>{
    if(state.started) return;
    state.started = true;
    showGameScreen();
    startGame();
  };

  // 1) btnStart があればそれを優先
  if(el.btnStart){
    el.btnStart.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      go();
    }, {passive:false});
  }

  // 2) フォールバック：タイトル画面全体タップで開始（btnStartが無くても開始できる）
  if(el.title){
    el.title.style.cursor = "pointer";
    el.title.addEventListener("click", (e)=>{
      // モーダル等がある場合はそれを除外したいが、今回は開始最優先
      go();
    }, {passive:true});
  }
}

/* ---------------- Settings / HUD bind (存在する時だけ) ---------------- */
function bindHUD(){
  if(el.btnHelp && el.helpM){
    el.btnHelp.addEventListener("click", ()=> showModal(el.helpM), {passive:true});
  }
  if(el.btnSettings && el.settingsM && el.repoInput){
    el.btnSettings.addEventListener("click", ()=>{
      el.repoInput.value = getRepo();
      showModal(el.settingsM);
    }, {passive:true});
  }
  if(el.btnLog && el.logM){
    bindLongPress(el.btnLog, ()=>{
      renderLogModal();
      showModal(el.logM);
    }, 620);
  }
  if(el.btnNext){
    el.btnNext.addEventListener("click", ()=>{
      if(state.activeSide!=="P1" || state.gameOver) return;
      // 最低限：MAINへ進める
      const i = PHASES.indexOf(state.phase);
      state.phase = PHASES[Math.min(i+1, PHASES.length-1)];
      renderAll();
    }, {passive:true});
  }
  if(el.btnEnd){
    el.btnEnd.addEventListener("click", ()=>{
      if(state.activeSide!=="P1" || state.gameOver) return;
      // 最低限：ターン終了
      state.activeSide = "AI";
      state.phase = "START";
      renderAll();
      state.activeSide = "P1";
      state.turn += 1;
      state.phase = "START";
      renderAll();
    }, {passive:true});
  }

  // pile click（存在する場合のみ）
  document.querySelectorAll(".pile").forEach((p)=>{
    p.addEventListener("click", ()=>{}, {passive:true});
  });
}

function bindSettings(){
  if(el.btnRepoSave && el.repoInput){
    el.btnRepoSave.addEventListener("click", async ()=>{
      const v = (el.repoInput.value||"").trim();
      if(!v.includes("/")){
        log("設定NG：owner/repo 形式で入力してください", "warn");
        return;
      }
      setRepo(v);
      clearCache();
      log(`設定：repo=${v}`);
      await rescanImages();
    }, {passive:true});
  }
  if(el.btnRescan){
    el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});
  }
  if(el.btnClearCache){
    el.btnClearCache.addEventListener("click", ()=>{ clearCache(); log("キャッシュ削除"); }, {passive:true});
  }
}

function bindResult(){
  if(el.btnNextGame && el.resultM){
    el.btnNextGame.addEventListener("click", ()=>{
      hideModal(el.resultM);
      startGame();
    }, {passive:true});
  }
  if(el.btnBackTitle && el.resultM){
    el.btnBackTitle.addEventListener("click", ()=>{
      hideModal(el.resultM);
      showTitleScreen();
    }, {passive:true});
  }
}

/* ---------------- init ---------------- */
async function init(){
  bindStart();
  bindHUD();
  bindSettings();
  bindResult();

  const cache = getCache();
  if(cache && cache.repo===getRepo()){
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  // タイトル画面上に "JS: ..." を絶対に出さない（出る場合、HTML側で直書きしている可能性あり）
  if(el.boot){
    el.boot.style.display = "none";
    el.boot.style.pointerEvents = "none";
  }

  log("init完了（タイトル開始OK / ロゴ表示強化）");
}

document.addEventListener("DOMContentLoaded", init);