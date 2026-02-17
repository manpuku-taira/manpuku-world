/* =========================================================
  Manpuku World - v50030 (Full Replace JS)
  修正内容：
  ✅ プレイヤー：MAINでキャラ登場/見参、アイテム装備、エフェクト発動が可能（クリック復旧）
  ✅ プレイヤー：BATTLEで攻撃操作可能（攻撃者→対象クリック）
  ✅ 視認性：BATTLE中、攻撃可能キャラに「⚔」表示。攻撃済みは半透明化＆アイコン消滅
  ✅ TURN1（各プレイヤー初回ターン）は双方バトル不可（確定ロック）
  ✅ チェーン（手形08 / 記憶抹消14）選択UI＆同時選択
  ✅ 無効化時：発動カードは発動者ウイングへ（E残留なし）
  ✅ 放射型(18)相手ターン開始：手札ランダムウイング（射手装備時）
  ✅ 手札上限7 → 超過分はウイング（ログあり）
  ✅ レイアウト（HTML/CSS）非変更。可視化はJSのインライン描画で実装
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

const el = {
  title: $("title"),
  game: $("game"),
  boot: $("boot"),
  btnStart: $("btnStart"),
  titleArt: $("titleArt"),

  chipTurn: $("chipTurn"),
  chipPhase: $("chipPhase"),
  chipActive: $("chipActive"),
  firstInfo: $("firstInfo"),

  btnHelp: $("btnHelp"),
  btnSettings: $("btnSettings"),
  btnNext: $("btnNext"),
  btnEnd: $("btnEnd"),
  btnLog: $("btnLog"),

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

  aiDirectHint: $("aiDirectHint"),
  pDirectHint: $("pDirectHint"),

  viewerM: $("viewerM"),
  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),
  btnCardAct: $("btnCardAct"),

  choiceM: $("choiceM"),
  choiceTitle: $("choiceTitle"),
  choiceBody: $("choiceBody"),

  zoneM: $("zoneM"),
  zoneTitle: $("zoneTitle"),
  zoneBody: $("zoneBody"),

  resultM: $("resultM"),
  resultText: $("resultText"),
  btnNextGame: $("btnNextGame"),
  btnBackTitle: $("btnBackTitle"),

  logM: $("logM"),
  logBody: $("logBody"),

  settingsM: $("settingsM"),
  repoInput: $("repoInput"),
  btnRepoSave: $("btnRepoSave"),
  btnRescan: $("btnRescan"),
  btnClearCache: $("btnClearCache"),

  helpM: $("helpM"),
};

/* ---------------- Logs ---------------- */
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
    d.className = "logLine";
    d.textContent = "（ログはまだありません）";
    el.logBody.appendChild(d);
    return;
  }
  for(const it of LOGS.slice(0, 320)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind==="warn"?"warn":""}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

function bindLongPress(node, fn, ms=620){
  let t = null;
  const start = (e)=> { clearTimeout(t); t = setTimeout(()=>fn(e), ms); };
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
    flags: {
      producerSavedThisTurn:false,
      attackedCountThisTurn:0,
    }
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

  sideTurnCount: { P1:0, AI:0 },
  normalSummonUsed:false,

  selectedHandIndex:null,

  // ✅プレイヤー攻撃操作用
  battleUI: {
    attackerPos: null,
  },

  viewer: { side:null, zone:null, pos:null, uid:null },

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },

  limits: {
    P1: { handgataUsed:false, cruellaUsed:false, tataUsed:false },
    AI: { handgataUsed:false, cruellaUsed:false, tataUsed:false },
  },

  chain: { depth:0 }
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(c){ return c && c.type==="character"; }
function isEffect(c){ return c && c.type==="effect"; }
function isItem(c){ return c && c.type==="item"; }
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function opponent(side){ return side==="P1" ? "AI" : "P1"; }

/* ---------------- Modals ---------------- */
function showModal(id){ $(id).classList.add("show"); }
function hideModal(id){ $(id).classList.remove("show"); }

document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");
  if(close==="choice") hideModal("choiceM");
  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
  if(close==="zone") hideModal("zoneM");
  if(close==="result") hideModal("resultM");
});

let choiceResolver = null;
function askChoice(title, message, items){
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
      hideModal("choiceM");
      if(choiceResolver){ const r = choiceResolver; choiceResolver=null; r(it.value); }
    }, {passive:true});

    if(it.card){
      bindLongPress(row, ()=> openViewer(it.card, it.viewerCtx||null), 620);
    }
    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);
  showModal("choiceM");
  return new Promise((resolve)=>{ choiceResolver = resolve; });
}

/* ---------------- Images / GitHub scan ---------------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v7";
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

async function applyImagesFromCache(){
  const cache = getCache();

  state.img.fieldUrl = "";
  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)) state.img.fieldUrl = u;
  }
  if(state.img.fieldUrl){
    el.fieldTop.style.backgroundImage = `url("${state.img.fieldUrl}")`;
    el.fieldBottom.style.backgroundImage = `url("${state.img.fieldUrl}")`;
  }else{
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
  }

  state.img.backUrl = await resolveBackUrl(cache.backFile || "");

  state.img.cardUrlByNo = {};
  const map = (cache.cardMap || {});
  for(const k of Object.keys(map)){
    state.img.cardUrlByNo[k] = vercelPathCards(map[k]);
  }

  const titleCandidates = ["/assets/title.png", "/assets/title.PNG"];
  for(const u of titleCandidates){
    if(await validateImage(u)){
      el.titleArt.style.backgroundImage = `url("${u}")`;
      break;
    }
  }

  state.img.ready = true;
  renderAll();
}

/* ---------------- Helpers ---------------- */
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
function firstShieldIndex(side){
  const sh = state[side].shield;
  for(let i=0;i<sh.length;i++) if(sh[i]) return i;
  return -1;
}
function moveToWing(side, card){
  if(!card) return;
  state[side].wing.unshift(card);
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

/* =========================================================
   ✅TURN1バトルロック（確定）
========================================================= */
function isBattleLockedNow(){
  const s = state.activeSide;
  return state.sideTurnCount[s] === 1;
}
function battleLockReason(){
  const s = state.activeSide;
  return `${sideName(s)}の1ターン目はバトル不可`;
}

/* ---------------- Equip / ATK ---------------- */
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
function canDirectAttack(attackerSide, attackerCard){
  const def = opponent(attackerSide);
  if(countShields(def) > 0) return false;
  if(attackerCard && attackerCard.no===7) return false; // まひる
  return true;
}
function maxAttacksThisTurn(attacker){
  if(!attacker) return 0;
  if(attacker.no===7 && attacker.equipUid) return 2;
  return 1;
}
function isAttackExhausted(side, card){
  const used = card?.flags?.attackedCountThisTurn || 0;
  const maxA = maxAttacksThisTurn(card);
  return used >= maxA;
}

/* ---------------- Viewer ---------------- */
function openViewer(card, ctx){
  el.viewerTitle.textContent = card.name;

  const side = ctx?.side || state.activeSide;
  const curAtk = isCharacter(card) ? calcCurrentAtk(side, card) : (card.baseAtk||0);
  const plus = isCharacter(card) ? (curAtk - (card.baseAtk||0)) : 0;

  const lines = [];
  lines.push(card.name);
  lines.push(`RANK ${card.rank||0}`);
  if(isCharacter(card)){
    lines.push(`ATK ${card.baseAtk||0}${plus!==0?`  (${plus>0?"+":""}${plus})  =>  ${curAtk}`:""}`);
  }else{
    lines.push(`ATK ${card.baseAtk||0}`);
  }
  if(card.tags?.length) lines.push(`TAG: ${card.tags.join(" / ")}`);
  if(card.titleTag) lines.push(`TITLE: ${card.titleTag}`);
  lines.push("");
  lines.push(card.text||"");

  el.viewerText.textContent = lines.join("\n");
  el.viewerImg.src = state.img.cardUrlByNo[pad2(card.no)] || "";

  state.viewer = { side: ctx?.side||null, zone: ctx?.zone||null, pos: ctx?.pos??null, uid: card.uid };
  el.btnCardAct.style.display = "none";
  showModal("viewerM");
}

/* ---------------- Rendering helpers ---------------- */
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

/* ✅ 攻撃可能アイコン＆攻撃済み半透明：CSSを触らずインラインで描画 */
function addAttackBadge(slot, exhausted){
  const b = document.createElement("div");
  b.textContent = exhausted ? "" : "⚔";
  b.style.position = "absolute";
  b.style.right = "6px";
  b.style.top = "6px";
  b.style.width = "26px";
  b.style.height = "26px";
  b.style.display = exhausted ? "none" : "flex";
  b.style.alignItems = "center";
  b.style.justifyContent = "center";
  b.style.fontWeight = "800";
  b.style.fontSize = "16px";
  b.style.borderRadius = "999px";
  b.style.background = "rgba(0,0,0,.55)";
  b.style.color = "white";
  b.style.backdropFilter = "blur(2px)";
  b.style.pointerEvents = "none";
  slot.appendChild(b);
}

function makeSlot(card, side, ctx, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.style.position = "relative";

  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");

  // 攻撃済み半透明
  if(opts.exhausted){
    slot.style.opacity = "0.55";
    slot.style.filter = "grayscale(0.25)";
  }else{
    slot.style.opacity = "";
    slot.style.filter = "";
  }

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

    if(opts.attackable){
      addAttackBadge(slot, !!opts.exhausted);
    }

    bindLongPress(slot, ()=> openViewer(card, ctx), 620);
  }else{
    // 空スロットにもクリックできるようにする（召喚のため）
    slot.style.background = "rgba(0,0,0,.06)";
  }

  return slot;
}

/* ---------------- HUD / counts ---------------- */
function updateHUD(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  el.chipActive.textContent = (state.activeSide==="P1") ? "YOUR TURN" : "ENEMY TURN";

  const isYour = (state.activeSide==="P1" && !state.gameOver);
  el.btnNext.disabled = !isYour;
  el.btnEnd.disabled  = !isYour;
  el.btnNext.style.opacity = isYour ? "1" : ".45";
  el.btnEnd.style.opacity  = isYour ? "1" : ".45";
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
function renderDirectHints(){
  el.pDirectHint.classList.toggle("show", countShields("P1")==0);
  el.aiDirectHint.classList.toggle("show", countShields("AI")==0);
}

/* =========================================================
   プレイヤー入力（MAIN：召喚/見参/装備/効果）
========================================================= */
function selectedHandCard(){
  if(state.selectedHandIndex==null) return null;
  return state.P1.hand[state.selectedHandIndex] || null;
}
function clearHandSelection(){
  state.selectedHandIndex = null;
  renderAll();
}

function removeFromHandByUid(side, uid){
  const p = state[side];
  const idx = p.hand.findIndex(c=>c && c.uid===uid);
  if(idx<0) return null;
  return p.hand.splice(idx,1)[0];
}

function forceRemoveFromEIfPresent(side, card){
  if(!card) return;
  const p = state[side];
  const i = p.E.findIndex(x=>x && x.uid===card.uid);
  if(i>=0) p.E[i] = null;
}
function putItemToEAndEquip(side, itemCard, targetPos){
  const p = state[side];
  const t = p.C[targetPos];
  if(!t) return false;

  const ePos = findEmptyIndex(p.E);
  if(ePos<0) return false;

  if(t.equipUid){
    const old = findEquipInE(side, t.equipUid);
    if(old) old.equippedToUid = null;
    t.equipUid = null;
  }

  itemCard._equipBonus = 0;
  itemCard._equipBonus2 = 0;

  if(itemCard.no===18){
    itemCard._equipBonus = 500;
    if(t.tags.includes("射手")) itemCard._equipBonus2 = 500;
  }
  if(itemCard.no===19){
    itemCard._equipBonus = 500;
    if(t.tags.includes("勇者") || t.tags.includes("剣士")) itemCard._equipBonus2 = 500;
  }
  if(itemCard.no===20){
    itemCard._equipBonus = 300;
    if(t.tags.includes("勇者")) itemCard._equipBonus2 = 500;
  }

  itemCard.equippedToUid = t.uid;
  t.equipUid = itemCard.uid;
  p.E[ePos] = itemCard;
  log(`${sideName(side)}：装備 ${itemCard.name} → ${t.name}`);
  return true;
}

function canKensan(side, card){
  if(!card || card.summon!=="kensan") return false;
  const p = state[side];
  const hasSacHand = p.hand.some(c=>isCharacter(c) && c.uid!==card.uid);
  const hasSacField = p.C.some(c=>isCharacter(c));
  return hasSacHand || hasSacField;
}

async function chooseKensanSacrifice(side, exceptUid){
  const p = state[side];
  const items = [];

  // 手札のキャラ
  for(let i=0;i<p.hand.length;i++){
    const c = p.hand[i];
    if(!isCharacter(c) || c.uid===exceptUid) continue;
    items.push({
      label:`（手札）${c.name}`,
      sub:`ATK ${c.baseAtk||0}`,
      value:{from:"HAND", idx:i},
      card:c,
      viewerCtx:{side, zone:"HAND", pos:i},
    });
  }
  // フィールドのキャラ
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(!isCharacter(c)) continue;
    items.push({
      label:`（場）${c.name}`,
      sub:`ATK ${calcCurrentAtk(side,c)}`,
      value:{from:"FIELD", idx:i},
      card:c,
      viewerCtx:{side, zone:"C", pos:i},
    });
  }
  items.push({label:"やめる", value:null});

  return await askChoice("見参コスト", "ウイングへ送るキャラクターを選んでください。", items);
}

async function playerSummonToPos(targetPos){
  if(state.activeSide!=="P1" || state.gameOver) return;
  if(state.phase!=="MAIN"){
    log("登場はMAINで行えます", "warn");
    return;
  }
  const p = state.P1;
  if(p.C[targetPos]){
    log("その場所にはすでにキャラクターがいます", "warn");
    return;
  }
  const card = selectedHandCard();
  if(!card){
    log("手札のカードを選択してください", "warn");
    return;
  }
  if(!isCharacter(card)){
    log("キャラクターのみ登場できます（アイテム/エフェクトは別操作）", "warn");
    return;
  }

  // 見参カードはコスト選択
  if(card.summon==="kensan"){
    if(!canKensan("P1", card)){
      log("見参コストを支払えません（手札/場に他キャラが必要）", "warn");
      return;
    }
    const pick = await chooseKensanSacrifice("P1", card.uid);
    if(!pick){
      log("見参をキャンセルしました");
      return;
    }
    if(pick.from==="HAND"){
      const sac = p.hand.splice(pick.idx,1)[0];
      moveToWing("P1", sac);
      log(`見参コスト（手札）→ ${sac.name} をウイング`);
    }else{
      const sac = p.C[pick.idx];
      p.C[pick.idx] = null;
      moveToWing("P1", sac);
      log(`見参コスト（場）→ ${sac.name} をウイング`);
    }
  }

  // 実際に登場
  const inst = removeFromHandByUid("P1", card.uid);
  if(!inst){
    log("登場失敗：手札カードが見つかりません", "warn");
    return;
  }
  p.C[targetPos] = inst;
  log(`あなた：${inst.summon==="kensan"?"見参":"登場"} ${inst.name}`);

  // 登場時効果（最低限：ラウス/タータ/司令）
  if(inst.no===5){
    draw("P1", 2);
    log("あなた：タータ登場 → 2ドロー");
  }
  if(inst.no===4){
    const pool = [...p.deck, ...p.wing];
    const idx = pool.findIndex(c=>c && c.tags?.includes("クランプス"));
    if(idx>=0){
      let picked = null;
      const did = p.deck.findIndex(c=>c && c.tags?.includes("クランプス"));
      if(did>=0) picked = p.deck.splice(did,1)[0];
      else{
        const wid = p.wing.findIndex(c=>c && c.tags?.includes("クランプス"));
        if(wid>=0) picked = p.wing.splice(wid,1)[0];
      }
      if(picked){
        p.hand.push(picked);
        log("あなた：ラウス登場 → クランプスを手札へ");
      }
    }else{
      log("あなた：ラウス登場 → クランプスなし（不発）");
    }
  }
  if(inst.no===11){
    // 司令は「場に他キャラがいる時のみ」装備化（簡易：選択させる）
    const targets = [];
    for(let i=0;i<3;i++){
      const c = p.C[i];
      if(c && c.uid!==inst.uid){
        targets.push({label:c.name, value:i, card:c, viewerCtx:{side:"P1", zone:"C", pos:i}});
      }
    }
    if(targets.length){
      targets.push({label:"今回は装備しない（通常キャラとして置く）", value:null});
      const pos = await askChoice("司令の効果", "装備先キャラクターを選んでください。", targets);
      if(pos!=null){
        // 司令カードを場から取り外し、アイテム扱いとしてEへ装備
        p.C[targetPos] = null;
        inst.type = "item";
        inst._equipBonus = 500;
        const ok = putItemToEAndEquip("P1", inst, pos);
        if(!ok){
          // 装備できなければウイングへ
          moveToWing("P1", inst);
          log("司令：装備できず → ウイング", "warn");
        }
      }
    }
  }

  enforceHandLimit("P1");
  clearHandSelection();
}

/* =========================================================
   チェーン処理（手形08 / 記憶抹消14）
========================================================= */
function hasHandgataOnField(side){
  return state[side].C.some(c=>c && c.no===8);
}
function hasMemoryEraseInHand(side){
  return state[side].hand.some(c=>c && c.no===14);
}
function takeMemoryEraseFromHand(side){
  const p = state[side];
  const idx = p.hand.findIndex(c=>c && c.no===14);
  if(idx<0) return null;
  return p.hand.splice(idx,1)[0];
}

async function chooseCounter(defenderSide, activatedCard){
  const canHandgata =
    (state.activeSide !== defenderSide) &&
    hasHandgataOnField(defenderSide) &&
    !state.limits[defenderSide].handgataUsed;

  const canMemoryErase =
    (state.activeSide !== defenderSide) &&
    hasMemoryEraseInHand(defenderSide);

  if(!canHandgata && !canMemoryErase) return "NO";

  if(defenderSide==="P1"){
    const items = [];
    if(canHandgata) items.push({label:"手形で無効（相手ターンに1度）", value:"HANDGATA"});
    if(canMemoryErase) items.push({label:"記憶抹消で無効（記憶抹消→ウイング）", value:"MEMORY"});
    items.push({label:"何もしない", value:"NO"});
    log(`反応可能：${activatedCard.name} に対してカウンター可能`);
    const v = await askChoice("チェーン（カウンター）", `相手が「${activatedCard.name}」を発動しました。`, items);
    return v;
  }

  if(defenderSide==="AI"){
    if(canMemoryErase) return "MEMORY";
    if(canHandgata) return "HANDGATA";
  }
  return "NO";
}

async function resolveChainForActivation(activatorSide, activatedCard){
  if(state.chain.depth >= 4){
    log("チェーン深度上限：これ以上は反応できません", "warn");
    return false;
  }
  const defender = opponent(activatorSide);

  state.chain.depth += 1;
  const choice = await chooseCounter(defender, activatedCard);

  if(choice==="NO"){
    state.chain.depth -= 1;
    return false;
  }

  if(choice==="HANDGATA"){
    state.limits[defender].handgataUsed = true;
    log(`${sideName(defender)}：手形で無効`);
    const counterVirtual = { name:"手形（カウンター）", no:8, type:"effect" };

    const negatedCounter = await resolveChainForActivation(defender, counterVirtual);
    if(negatedCounter){
      log(`手形（カウンター）が無効化→元の効果「${activatedCard.name}」は続行`);
      state.chain.depth -= 1;
      return false;
    }

    forceRemoveFromEIfPresent(activatorSide, activatedCard);
    moveToWing(activatorSide, activatedCard);
    log(`無効：${activatedCard.name} → ${sideName(activatorSide)}ウイング`);
    state.chain.depth -= 1;
    return true;
  }

  if(choice==="MEMORY"){
    const me = takeMemoryEraseFromHand(defender);
    if(!me){
      log(`${sideName(defender)}：記憶抹消がありません（不発）`, "warn");
      state.chain.depth -= 1;
      return false;
    }
    moveToWing(defender, me);
    log(`${sideName(defender)}：記憶抹消で無効（記憶抹消→ウイング）`);

    const negatedCounter = await resolveChainForActivation(defender, me);
    if(negatedCounter){
      log(`記憶抹消（カウンター）が無効化→元の効果「${activatedCard.name}」は続行`);
      state.chain.depth -= 1;
      return false;
    }

    forceRemoveFromEIfPresent(activatorSide, activatedCard);
    moveToWing(activatorSide, activatedCard);
    log(`無効：${activatedCard.name} → ${sideName(activatorSide)}ウイング`);
    state.chain.depth -= 1;
    return true;
  }

  state.chain.depth -= 1;
  return false;
}

/* ---------------- Effect resolution (player + AI 共通の最低限) ---------------- */
function wingLowestAtkCharPos(side){
  const p = state[side];
  let best = {pos:-1, atk: Infinity};
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(!c) continue;
    const atk = calcCurrentAtk(side, c);
    if(atk < best.atk){
      best = {pos:i, atk};
    }
  }
  return best.pos;
}
function wingHighestAtkCharPos(side){
  const p = state[side];
  let best = {pos:-1, atk: -Infinity};
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(!c) continue;
    const atk = calcCurrentAtk(side, c);
    if(atk > best.atk){
      best = {pos:i, atk};
    }
  }
  return best.pos;
}

async function resolveEffect(side, effectCard){
  const negated = await resolveChainForActivation(side, effectCard);
  if(negated) return false;

  const me = state[side];
  const opp = state[opponent(side)];

  if(effectCard.no===16){
    const pos = wingLowestAtkCharPos(opponent(side));
    if(pos>=0){
      const target = opp.C[pos];
      opp.C[pos] = null;
      moveToWing(opponent(side), target);
      log(`${sideName(side)}：力こそパワー！！ → ${sideName(opponent(side))} ${target.name} をウイング`);
    }else{
      log(`${sideName(side)}：力こそパワー！！（対象なし）`);
    }
  }

  if(effectCard.no===15){
    // プレイヤーは選べる。AIは最大ATK。
    if(side==="P1"){
      const items = [];
      for(let i=0;i<3;i++){
        const c = me.C[i];
        if(!c) continue;
        items.push({
          label: c.name,
          sub: `ATK ${calcCurrentAtk(side,c)} → +1000`,
          value: i,
          card: c,
          viewerCtx:{side, zone:"C", pos:i}
        });
      }
      if(!items.length){
        log("陰陽術-闘-（対象なし）");
      }else{
        const pos = await askChoice("陰陽術 - 闘 -", "ATK+1000する自分キャラクターを選択してください。", items);
        if(pos!=null && me.C[pos]){
          me.C[pos].tempAtk += 1000;
          log(`あなた：陰陽術-闘- → ${me.C[pos].name} ATK+1000（ターン終了まで）`);
        }
      }
    }else{
      const pos = wingHighestAtkCharPos(side);
      if(pos>=0){
        const t = me.C[pos];
        t.tempAtk += 1000;
        log(`${sideName(side)}：陰陽術-闘- → ${t.name} ATK+1000（ターン終了まで）`);
      }else{
        log(`${sideName(side)}：陰陽術-闘-（対象なし）`);
      }
    }
  }

  if(effectCard.no===2){
    if(!hasOnStage(side, c=>c && c.no===1)){
      log(`${sideName(side)}：フレイムバレット（条件未達）`, "warn");
    }else{
      const posHi = wingHighestAtkCharPos(opponent(side));
      if(posHi>=0){
        const t = opp.C[posHi];
        opp.C[posHi]=null;
        moveToWing(opponent(side), t);
        log(`${sideName(side)}：フレイムバレット → 最高ATK ${t.name} をウイング`);
      }else{
        log(`${sideName(side)}：フレイムバレット（対象なし）`);
      }
    }
  }

  moveToWing(side, effectCard);
  return true;
}

/* ---------------- Opponent turn start effects (No18) ---------------- */
function applyOppTurnStartEffects(sideWhoStartsTurn){
  const enemy = sideWhoStartsTurn;
  const owner = opponent(enemy);

  const p = state[owner];
  for(const c of p.C){
    if(!c || !c.equipUid) continue;
    const eq = findEquipInE(owner, c.equipUid);
    if(!eq) continue;

    if(eq.no===18 && c.tags.includes("射手")){
      const eh = state[enemy].hand;
      if(eh.length){
        const r = Math.floor(Math.random()*eh.length);
        const moved = eh.splice(r,1)[0];
        moveToWing(enemy, moved);
        log(`放射型：相手ターン開始→${sideName(enemy)}手札1枚ウイング（${moved.name}）`);
      }else{
        log(`放射型：相手ターン開始→相手手札0（不発）`);
      }
    }
  }
}

/* =========================================================
   Battle Resolution（共通）
========================================================= */
function sendShieldToHand(defSide, shieldIdx){
  const def = state[defSide];
  const card = def.shield[shieldIdx];
  if(!card) return null;
  def.shield[shieldIdx] = null;
  def.hand.push(card);
  return card;
}

async function doAttackShield(attSide, attackerPos){
  const defSide = opponent(attSide);
  const shIdx = firstShieldIndex(defSide);
  if(shIdx<0) return false;

  const att = state[attSide].C[attackerPos];
  if(!att) return false;

  log(`${sideName(attSide)}：${att.name} → シールド攻撃`);
  await sleep(120);

  const gained = sendShieldToHand(defSide, shIdx);
  if(gained){
    log(`${sideName(defSide)}：シールド破壊 → 手札へ（${gained.name}）`);
  }
  att.flags.attackedCountThisTurn = (att.flags.attackedCountThisTurn||0) + 1;

  enforceHandLimit(defSide);
  renderAll();
  return true;
}

async function doAttackDirect(attSide, attackerPos){
  const defSide = opponent(attSide);
  const att = state[attSide].C[attackerPos];
  if(!att) return false;
  if(!canDirectAttack(attSide, att)) return false;

  log(`${sideName(attSide)}：${att.name} → 直接攻撃`);
  await sleep(160);

  state.gameOver = true;
  el.resultText.textContent = `${sideName(attSide)}の勝利！（直接攻撃）`;
  showModal("resultM");
  log(`ゲーム終了：${sideName(attSide)}勝利`);
  renderAll();
  return true;
}

async function doBattleCharacter(attSide, attackerPos, targetPos){
  const defSide = opponent(attSide);
  const att = state[attSide].C[attackerPos];
  const def = state[defSide].C[targetPos];
  if(!att || !def) return false;

  const attAtk = calcCurrentAtk(attSide, att);
  const defAtk = calcCurrentAtk(defSide, def);

  log(`${sideName(attSide)}：${att.name}（${attAtk}）→ ${def.name}（${defAtk}）`);
  await sleep(180);

  if(def.no===12 && !def.flags.producerSavedThisTurn){
    def.flags.producerSavedThisTurn = true;
    log(`${sideName(defSide)}：班目プロデューサー → 破壊無効（このターン1度）`);
    att.flags.attackedCountThisTurn = (att.flags.attackedCountThisTurn||0) + 1;
    renderAll();
    return true;
  }

  if(attAtk > defAtk){
    state[defSide].C[targetPos] = null;
    moveToWing(defSide, def);
    log(`${sideName(defSide)}：${def.name} → ウイング`);
  }else if(attAtk < defAtk){
    state[attSide].C[attackerPos] = null;
    moveToWing(attSide, att);
    log(`${sideName(attSide)}：${att.name} → ウイング`);
  }else{
    state[defSide].C[targetPos] = null;
    state[attSide].C[attackerPos] = null;
    moveToWing(defSide, def);
    moveToWing(attSide, att);
    log(`相打ち：両者ウイング`);
  }

  const still = state[attSide].C[attackerPos];
  if(still){
    still.flags.attackedCountThisTurn = (still.flags.attackedCountThisTurn||0) + 1;
  }
  renderAll();
  return true;
}

/* =========================================================
   Player Battle UI
   - 自分キャラをクリック → 攻撃者選択
   - 敵キャラ or 敵シールド or 直接（シールド0）をクリック → 攻撃解決
========================================================= */
function canPlayerOperate(){
  return state.activeSide==="P1" && !state.gameOver;
}
function playerBattleSelectable(pos){
  const c = state.P1.C[pos];
  if(!c) return false;
  if(isBattleLockedNow()) return false;
  if(state.phase!=="BATTLE") return false;
  if(isAttackExhausted("P1", c)) return false;
  return true;
}
function clearBattleSelection(){
  state.battleUI.attackerPos = null;
  renderAll();
}

async function playerAttackToEnemyChar(targetPos){
  if(!canPlayerOperate()) return;
  if(state.phase!=="BATTLE") return;
  if(isBattleLockedNow()){
    log(`BATTLE不可：${battleLockReason()}`, "warn");
    return;
  }
  const aPos = state.battleUI.attackerPos;
  if(aPos==null){
    log("先に攻撃する自分キャラを選んでください", "warn");
    return;
  }
  const att = state.P1.C[aPos];
  if(!att || isAttackExhausted("P1", att)){
    log("そのキャラは攻撃できません", "warn");
    clearBattleSelection();
    return;
  }
  if(!state.AI.C[targetPos]){
    log("対象がいません", "warn");
    return;
  }
  await doBattleCharacter("P1", aPos, targetPos);
  // 攻撃後：自動で次の選択へ（攻撃回数が残るなら維持しても良いが、誤操作防止で解除）
  clearBattleSelection();
}

async function playerAttackShield(){
  if(!canPlayerOperate()) return;
  if(state.phase!=="BATTLE") return;
  if(isBattleLockedNow()){
    log(`BATTLE不可：${battleLockReason()}`, "warn");
    return;
  }
  const aPos = state.battleUI.attackerPos;
  if(aPos==null){
    log("先に攻撃する自分キャラを選んでください", "warn");
    return;
  }
  const att = state.P1.C[aPos];
  if(!att || isAttackExhausted("P1", att)){
    log("そのキャラは攻撃できません", "warn");
    clearBattleSelection();
    return;
  }
  if(countShields("AI")<=0){
    log("相手シールドがありません（直接攻撃/キャラ攻撃へ）", "warn");
    return;
  }
  await doAttackShield("P1", aPos);
  clearBattleSelection();
}

async function playerAttackDirect(){
  if(!canPlayerOperate()) return;
  if(state.phase!=="BATTLE") return;
  if(isBattleLockedNow()){
    log(`BATTLE不可：${battleLockReason()}`, "warn");
    return;
  }
  const aPos = state.battleUI.attackerPos;
  if(aPos==null){
    log("先に攻撃する自分キャラを選んでください", "warn");
    return;
  }
  const att = state.P1.C[aPos];
  if(!att || isAttackExhausted("P1", att)){
    log("そのキャラは攻撃できません", "warn");
    clearBattleSelection();
    return;
  }
  if(!canDirectAttack("P1", att)){
    log("直接攻撃できません（シールドが残っている、または条件で不可）", "warn");
    return;
  }
  await doAttackDirect("P1", aPos);
  clearBattleSelection();
}

/* =========================================================
   Turn / Phase / Draw / Hand limit
========================================================= */
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

function beginTurn(side){
  state.activeSide = side;
  state.phase = "START";
  state.normalSummonUsed = false;
  state.selectedHandIndex = null;
  state.battleUI.attackerPos = null;

  state.sideTurnCount[side] += 1;
  resetPerTurn(side);

  log(`${sideName(side)}：ターン開始（${state.sideTurnCount[side]}回目）`);
  if(state.sideTurnCount[side] === 1){
    log(`バトル制限：${battleLockReason()}`);
  }

  applyOppTurnStartEffects(side);
  renderAll();
}

function nextPhase(){
  if(state.gameOver) return;

  const i = PHASES.indexOf(state.phase);
  let next = PHASES[(i+1)%PHASES.length];

  if(next==="BATTLE" && isBattleLockedNow()){
    log(`BATTLEスキップ：${battleLockReason()}`, "warn");
    next = "END";
  }

  state.phase = next;

  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${sideName(state.activeSide)}：ドロー +1`);
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
    clearEndTurnTemps(state.activeSide);
    state.battleUI.attackerPos = null;
  }

  renderAll();
}

async function endTurn(){
  if(state.gameOver) return;

  enforceHandLimit(state.activeSide);
  clearEndTurnTemps(state.activeSide);
  state.battleUI.attackerPos = null;

  if(state.activeSide==="P1"){
    beginTurn("AI");
    state.phase = "DRAW";
    draw("AI", 1);
    enforceHandLimit("AI");
    renderAll();
    await aiTakeTurnCore();

    state.turn++;
    beginTurn("P1");
    log(`TURN ${state.turn} あなたのターン`);
  }
}

/* ---------------- Start game ---------------- */
function startGame(){
  state.gameOver=false;
  state.turn=1;

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

  state.sideTurnCount = {P1:0, AI:0};
  state.selectedHandIndex = null;
  state.battleUI.attackerPos = null;

  state.firstSide = (Math.random()<0.5) ? "P1" : "AI";
  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log(`ゲーム開始：先攻=${el.firstInfo.textContent}`);
  log("ルール：双方の『各1ターン目』はバトル不可（確定ロック）");

  if(state.firstSide==="P1"){
    beginTurn("P1");
    log(`TURN ${state.turn} あなたのターン`);
  }else{
    beginTurn("AI");
    state.phase="DRAW";
    draw("AI", 1);
    enforceHandLimit("AI");
    renderAll();
    (async ()=>{
      await aiTakeTurnCore();
      state.turn=2;
      beginTurn("P1");
      log(`TURN ${state.turn} あなたのターン`);
    })();
  }
}

/* =========================================================
   Rendering
========================================================= */
function renderZones(){
  // AI E
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.E[i];
    const ctx = {side:"AI", zone:"E", pos:i};
    el.aiE.appendChild(makeSlot(c, "AI", ctx, {enemy:true}));
  }

  // AI C
  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const ctx = {side:"AI", zone:"C", pos:i};
    el.aiC.appendChild(makeSlot(c, "AI", ctx, {enemy:true}));
  }

  // P1 C（✅クリック復旧：召喚/装備/攻撃者選択）
  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const ctx = {side:"P1", zone:"C", pos:i};

    const attackable =
      canPlayerOperate() &&
      state.phase==="BATTLE" &&
      !isBattleLockedNow() &&
      c &&
      !isAttackExhausted("P1", c);

    const exhausted =
      c && isAttackExhausted("P1", c);

    const slot = makeSlot(c, "P1", ctx, {attackable, exhausted});

    // ✅クリック処理：ここが前回欠けていて召喚不能になっていました
    slot.addEventListener("click", async ()=>{
      if(!canPlayerOperate()) return;

      const sel = selectedHandCard();

      // MAIN：空スロットならキャラ登場（手札キャラが選択されている場合）
      if(state.phase==="MAIN"){
        if(!c){
          if(sel && isCharacter(sel)){
            await playerSummonToPos(i);
          }else if(sel && isItem(sel)){
            log("装備は『装備先のキャラ』を押します（空きには置けません）", "warn");
          }else if(sel && isEffect(sel)){
            // エフェクトは空スロット関係なく発動
            const inst = removeFromHandByUid("P1", sel.uid);
            if(inst){
              await resolveEffect("P1", inst);
              enforceHandLimit("P1");
              clearHandSelection();
              renderAll();
            }
          }else{
            log("手札のキャラを選んで、空きスロットを押すと登場します", "warn");
          }
          return;
        }

        // MAIN：キャラがいるスロット → アイテム装備 or キャラの起動効果（最低限）
        if(c){
          if(sel && isItem(sel)){
            const inst = removeFromHandByUid("P1", sel.uid);
            if(inst){
              const neg = await resolveChainForActivation("P1", inst);
              if(!neg){
                const ok = putItemToEAndEquip("P1", inst, i);
                if(!ok){
                  moveToWing("P1", inst);
                  log("装備失敗 → ウイング", "warn");
                }
              }
              clearHandSelection();
              renderAll();
            }
            return;
          }

          // MAIN：キャラ固有の簡易起動（例：ニコラ/エフィ/クルエラ などは今後拡張）
          // ここは「押したら起動」だと誤爆が起きやすいので、今回はログだけに留めます。
          // （必要なら「起動しますか？」選択を追加します）
          return;
        }
      }

      // BATTLE：自分キャラを押すと攻撃者選択
      if(state.phase==="BATTLE"){
        if(isBattleLockedNow()){
          log(`BATTLE不可：${battleLockReason()}`, "warn");
          return;
        }
        if(!c){
          return;
        }
        if(isAttackExhausted("P1", c)){
          log("そのキャラはすでに攻撃済みです", "warn");
          return;
        }
        state.battleUI.attackerPos = i;
        log(`攻撃者選択：${c.name}`);
        renderAll();
      }
    }, {passive:true});

    // 選択中攻撃者の見た目を軽く強調（CSSを触らずインライン）
    if(state.battleUI.attackerPos===i && state.phase==="BATTLE"){
      slot.style.outline = "2px solid rgba(255,255,255,.75)";
      slot.style.boxShadow = "0 0 0 3px rgba(0,0,0,.25)";
    }

    el.pC.appendChild(slot);
  }

  // P1 E
  el.pE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const ctx = {side:"P1", zone:"E", pos:i};
    el.pE.appendChild(makeSlot(c, "P1", ctx, {}));
  }

  // ✅敵側へのクリック（キャラ攻撃対象）
  // 既存のDOMを再生成するため、レンダー後に子を走査してイベント付与
  // AIキャラ列
  const aiSlots = el.aiC.querySelectorAll(".slot");
  aiSlots.forEach((node, idx)=>{
    node.addEventListener("click", async ()=>{
      if(!canPlayerOperate()) return;
      if(state.phase!=="BATTLE") return;
      await playerAttackToEnemyChar(idx);
    }, {passive:true});
  });

  // シールド：HTML側に .shieldSlot がある前提。クリックで「シールド攻撃」試行
  document.querySelectorAll(".shieldSlot").forEach((slot)=>{
    const side = slot.getAttribute("data-side");
    if(side!=="AI") return;
    slot.addEventListener("click", async ()=>{
      if(!canPlayerOperate()) return;
      if(state.phase!=="BATTLE") return;
      await playerAttackShield();
    }, {passive:true});
  });

  // 直接攻撃：相手シールド0の時、敵フィールド全体（aiC）クリックで直接攻撃を試行
  el.aiC.addEventListener("click", async ()=>{
    if(!canPlayerOperate()) return;
    if(state.phase!=="BATTLE") return;
    if(countShields("AI")>0) return;
    // すでにキャラクリックが優先されるので、ここは「空所クリックの救済」として扱う
    await playerAttackDirect();
  }, {passive:true});
}

function renderHand(){
  el.hand.innerHTML="";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className="handCard";

    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;

    h.addEventListener("click", ()=>{
      if(!canPlayerOperate()) return;
      const next = (state.selectedHandIndex===i) ? null : i;
      state.selectedHandIndex = next;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=> openViewer(c, {side:"P1", zone:"HAND", pos:i}), 620);
    el.hand.appendChild(h);
  }
}

function renderEnemyHand(){
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
  document.querySelectorAll(".shieldSlot").forEach((slot)=>{
    const side = slot.getAttribute("data-side");
    const idx = Number(slot.getAttribute("data-idx")||"0");
    const cardNode = slot.querySelector(".shieldCard");
    const sh = state[side].shield[idx];
    const exists = !!sh;
    cardNode.classList.toggle("empty", !exists);
    if(exists && state.img.backUrl){
      cardNode.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      cardNode.style.backgroundImage = "";
    }
  });
}
function renderPiles(){
  document.querySelectorAll(".pileCard.deckBack").forEach((n)=>{
    if(state.img.backUrl) n.style.backgroundImage = `url("${state.img.backUrl}")`;
    else n.style.backgroundImage = "";
  });
}

function renderAll(){
  updateHUD();
  updateCounts();
  renderDirectHints();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
  renderPiles();
}

/* =========================================================
   AI（前回の強化版を維持）
========================================================= */
function aiPickBestSummonCard(){
  const h = state.AI.hand;
  const cand = h.filter(c=>isCharacter(c));
  if(!cand.length) return null;
  const score = (c)=>{
    let s = 0;
    if(c.summon==="kensan") s += 2000;
    s += (c.baseAtk||0);
    s += (c.rank||0)*10;
    if(c.no===5) s += 300;
    if(c.no===8) s += 200;
    return s;
  };
  cand.sort((a,b)=>score(b)-score(a));
  return cand[0];
}
function aiCanKensan(card){
  if(!card || card.summon!=="kensan") return false;
  const ai = state.AI;
  const hasSacHand = ai.hand.some(c=>isCharacter(c) && c.uid!==card.uid);
  const hasSacField = ai.C.some(c=>isCharacter(c));
  return hasSacHand || hasSacField;
}
function aiSacrificeForKensan(exceptUid){
  const ai = state.AI;
  let best = {from:"", idx:-1, atk:Infinity, card:null};

  for(let i=0;i<3;i++){
    const c = ai.C[i];
    if(!c) continue;
    const atk = calcCurrentAtk("AI", c);
    if(atk < best.atk){
      best = {from:"FIELD", idx:i, atk, card:c};
    }
  }
  for(let i=0;i<ai.hand.length;i++){
    const c = ai.hand[i];
    if(!isCharacter(c) || c.uid===exceptUid) continue;
    const atk = c.baseAtk||0;
    if(atk < best.atk){
      best = {from:"HAND", idx:i, atk, card:c};
    }
  }
  return best.card ? best : null;
}

async function aiMainPhasePlay(){
  const ai = state.AI;

  const empty = findEmptyIndex(ai.C);
  if(empty>=0){
    const card = aiPickBestSummonCard();
    if(card){
      if(card.summon==="kensan"){
        if(aiCanKensan(card)){
          const sac = aiSacrificeForKensan(card.uid);
          if(sac){
            if(sac.from==="FIELD"){
              const c = ai.C[sac.idx];
              ai.C[sac.idx]=null;
              moveToWing("AI", c);
              log(`AI：見参コスト（場）→ ${c.name} をウイング`);
            }else{
              const c = ai.hand.splice(sac.idx,1)[0];
              moveToWing("AI", c);
              log(`AI：見参コスト（手札）→ ${c.name} をウイング`);
            }
            const inst = removeFromHandByUid("AI", card.uid);
            ai.C[empty] = inst;
            log(`AI：見参 ${inst.name}`);
          }
        }
      }else{
        const inst = removeFromHandByUid("AI", card.uid);
        ai.C[empty] = inst;
        log(`AI：登場 ${inst.name}`);
        if(inst.no===5){
          draw("AI", 2);
          log("AI：タータ登場 → 2ドロー");
        }
        if(inst.no===4){
          const pool = [...ai.deck, ...ai.wing];
          const idx = pool.findIndex(c=>c && c.tags?.includes("クランプス"));
          if(idx>=0){
            let picked = null;
            const did = ai.deck.findIndex(c=>c && c.tags?.includes("クランプス"));
            if(did>=0) picked = ai.deck.splice(did,1)[0];
            else{
              const wid = ai.wing.findIndex(c=>c && c.tags?.includes("クランプス"));
              if(wid>=0) picked = ai.wing.splice(wid,1)[0];
            }
            if(picked){
              ai.hand.push(picked);
              log("AI：ラウス登場 → クランプスを手札へ");
            }
          }else{
            log("AI：ラウス登場 → クランプスなし（不発）");
          }
        }
      }
      await sleep(140);
      enforceHandLimit("AI");
      renderAll();
    }
  }

  const eEmpty = findEmptyIndex(ai.E);
  if(eEmpty>=0){
    const items = ai.hand.filter(c=>isItem(c));
    if(items.length){
      const itemScore = (c)=>{
        if(c.no===18) return 3000;
        if(c.no===19) return 2000;
        if(c.no===20) return 1000;
        return 0;
      };
      items.sort((a,b)=>itemScore(b)-itemScore(a));
      const pick = items[0];

      let targetPos = -1;
      if(pick.no===18){
        for(let i=0;i<3;i++){
          const cc = ai.C[i];
          if(cc && cc.tags.includes("射手")){ targetPos=i; break; }
        }
      }
      if(targetPos<0) targetPos = wingHighestAtkCharPos("AI");

      if(targetPos>=0){
        const inst = removeFromHandByUid("AI", pick.uid);
        const neg = await resolveChainForActivation("AI", inst);
        if(!neg){
          const ok = putItemToEAndEquip("AI", inst, targetPos);
          if(!ok){
            moveToWing("AI", inst);
            log("AI：装備失敗 → ウイング", "warn");
          }
        }
        await sleep(120);
        renderAll();
      }
    }
  }

  const effects = ai.hand.filter(c=>isEffect(c));
  if(effects.length){
    const hasThreat = (()=>{
      const pos = wingHighestAtkCharPos("P1");
      if(pos<0) return false;
      const t = state.P1.C[pos];
      const atk = calcCurrentAtk("P1", t);
      return atk >= 2500;
    })();

    const pickEff = ()=>{
      const e16 = effects.find(c=>c.no===16);
      if(e16) return e16;
      const e2 = effects.find(c=>c.no===2);
      if(e2 && hasOnStage("AI", c=>c && c.no===1)) return e2;
      if(hasThreat){
        const e15 = effects.find(c=>c.no===15);
        if(e15) return e15;
      }
      return null;
    };

    const pe = pickEff();
    if(pe){
      const inst = removeFromHandByUid("AI", pe.uid);
      await resolveEffect("AI", inst);
      await sleep(140);
      renderAll();
    }
  }
}

function battleOutcomeScore(attAtk, defAtk, defenderIsProducer){
  if(attAtk > defAtk){
    return 1200 + Math.min(800, attAtk - defAtk);
  }
  if(attAtk < defAtk){
    if(defenderIsProducer) return -400;
    return -1200 - Math.min(800, defAtk - attAtk);
  }
  if(defenderIsProducer) return -200;
  return -300;
}

function aiBuildAttackPlan(){
  const ai = state.AI;
  const meAtkList = [];
  for(let i=0;i<3;i++){
    const c = ai.C[i];
    if(!c) continue;
    const atk = calcCurrentAtk("AI", c);
    const maxA = maxAttacksThisTurn(c);
    const used = c.flags.attackedCountThisTurn || 0;
    const remain = Math.max(0, maxA - used);
    if(remain<=0) continue;
    meAtkList.push({pos:i, card:c, atk, remain});
  }
  meAtkList.sort((a,b)=>b.atk-a.atk);

  const def = state.P1;
  const defChars = [];
  for(let i=0;i<3;i++){
    const c = def.C[i];
    if(!c) continue;
    defChars.push({pos:i, card:c, atk: calcCurrentAtk("P1", c)});
  }
  defChars.sort((a,b)=>b.atk-a.atk);

  const actions = [];
  for(const a of meAtkList){
    for(let k=0;k<a.remain;k++){
      const remainingShields = countShields("P1") - actions.filter(x=>x.kind==="SHIELD").length;
      if(remainingShields > 0){
        actions.push({kind:"SHIELD", attackerPos:a.pos});
        continue;
      }

      if(canDirectAttack("AI", a.card)){
        actions.push({kind:"DIRECT", attackerPos:a.pos});
        continue;
      }

      if(defChars.length){
        let best = null;
        for(const d of defChars){
          const score = battleOutcomeScore(a.atk, d.atk, d.card.no===12);
          if(!best || score > best.score) best = {pos:d.pos, score};
        }
        if(best && best.score > 0){
          actions.push({kind:"CHAR", attackerPos:a.pos, targetPos:best.pos});
        }else{
          actions.push({kind:"PASS", attackerPos:a.pos});
        }
      }else{
        actions.push({kind:"PASS", attackerPos:a.pos});
      }
    }
  }

  const good = actions.filter(a=>a.kind==="SHIELD"||a.kind==="DIRECT"||a.kind==="CHAR").length;
  const bad  = actions.filter(a=>a.kind==="PASS").length;
  const hasShieldHit = actions.some(a=>a.kind==="SHIELD");
  const shouldBattle = hasShieldHit || (good >= 1 && bad <= good+1);

  return {shouldBattle, actions};
}

async function aiTakeTurnCore(){
  state.phase = "MAIN";
  renderAll();
  await sleep(120);

  await aiMainPhasePlay();
  enforceHandLimit("AI");
  renderAll();
  await sleep(120);

  if(isBattleLockedNow()){
    log(`AI：BATTLEスキップ（${battleLockReason()}）`, "warn");
    state.phase = "END";
    renderAll();
    await sleep(100);
    log("AI：ターン終了");
    return;
  }

  const plan = aiBuildAttackPlan();

  if(!plan.shouldBattle){
    log("AI：駆け引き → バトル見送り（様子見）");
    state.phase = "END";
    renderAll();
    await sleep(100);
    log("AI：ターン終了");
    return;
  }

  state.phase = "BATTLE";
  renderAll();
  await sleep(120);
  log("AI：バトル開始");

  const ai = state.AI;
  const e15 = ai.hand.find(c=>c && c.no===15);
  if(e15){
    const myMaxPos = wingHighestAtkCharPos("AI");
    const oppMaxPos = wingHighestAtkCharPos("P1");
    const myMax = myMaxPos>=0 ? calcCurrentAtk("AI", ai.C[myMaxPos]) : 0;
    const oppMax = oppMaxPos>=0 ? calcCurrentAtk("P1", state.P1.C[oppMaxPos]) : 0;
    if(myMax >= oppMax){
      const inst = removeFromHandByUid("AI", e15.uid);
      await resolveEffect("AI", inst);
      await sleep(100);
      renderAll();
    }
  }

  for(const act of plan.actions){
    if(state.gameOver) break;

    const att = state.AI.C[act.attackerPos];
    if(!att) continue;

    const maxA = maxAttacksThisTurn(att);
    const used = att.flags.attackedCountThisTurn || 0;
    if(used >= maxA) continue;

    if(countShields("P1")>0){
      await doAttackShield("AI", act.attackerPos);
      await sleep(80);
      continue;
    }

    if(canDirectAttack("AI", att)){
      await doAttackDirect("AI", act.attackerPos);
      await sleep(80);
      continue;
    }

    const oppChars = state.P1.C.map((c,i)=>c?({c,i,atk:calcCurrentAtk("P1",c)}):null).filter(Boolean);
    if(!oppChars.length) continue;

    let best = null;
    const attAtk = calcCurrentAtk("AI", att);
    for(const d of oppChars){
      const sc = battleOutcomeScore(attAtk, d.atk, d.c.no===12);
      if(!best || sc > best.sc) best = {pos:d.i, sc};
    }
    if(best && best.sc > 0){
      await doBattleCharacter("AI", act.attackerPos, best.pos);
      await sleep(80);
    }else{
      continue;
    }
  }

  state.phase = "END";
  renderAll();
  await sleep(100);
  log("AI：ターン終了");
}

/* ---------------- Bindings / UI ---------------- */
function bindStart(){
  el.boot.textContent="JS: OK";
  const go = ()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    startGame();
  };
  el.btnStart.addEventListener("click", (e)=>{ e.stopPropagation(); go(); }, {passive:false});
  el.title.addEventListener("click", go, {passive:true});
}

function bindHUD(){
  el.btnHelp.addEventListener("click", ()=> showModal("helpM"), {passive:true});
  el.btnSettings.addEventListener("click", ()=>{
    el.repoInput.value = getRepo();
    showModal("settingsM");
  }, {passive:true});

  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 620);

  el.btnNext.addEventListener("click", ()=>{
    if(!canPlayerOperate()) return;
    nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", ()=>{
    if(!canPlayerOperate()) return;
    endTurn();
  }, {passive:true});
}

function bindSettings(){
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

  el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});
  el.btnClearCache.addEventListener("click", ()=>{ clearCache(); log("キャッシュ削除"); }, {passive:true});
}

function bindResult(){
  el.btnNextGame.addEventListener("click", ()=>{
    hideModal("resultM");
    startGame();
  }, {passive:true});

  el.btnBackTitle.addEventListener("click", ()=>{
    hideModal("resultM");
    state.started=false;
    state.gameOver=false;
    el.game.classList.remove("active");
    el.title.classList.add("active");
    el.boot.textContent="JS: OK（準備完了）";
  }, {passive:true});
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

  el.boot.textContent="JS: OK（準備完了）";
  log("v50030：プレイヤー召喚クリック復旧＋攻撃済み可視化（⚔＋半透明）");
}
document.addEventListener("DOMContentLoaded", init);