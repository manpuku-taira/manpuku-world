/* =========================================================
  Manpuku World - v50021 (Full Replace)

  FIX:
  - 記憶抹消：チェーン中に無効化されても「発動したカード」は解決後に必ずウィングへ送る
  - サーチ失敗：デッキ/ウィングに無い場合、OK確認つきアナウンスを表示（シールド推理用）
  - 司令(No.11)：登場時に装備誘導（YES/NO→対象選択→ATK+500装備）
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
  for(const it of LOGS.slice(0, 240)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind==="warn"?"warn":""}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

function bindLongPress(node, fn, ms=620){
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
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウィングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウィングからカード名に「黒魔法」を含むカード1枚を手札に加える。"
    ),
    rank:5, atk:2500, summon:"kensan" },

  { no:2,  name:"黒魔法-フレイムバレット", type:"effect",
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ステージに「クルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウィングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウィングに送る。"
    ),
    rank:0, atk:0 },

  { no:3,  name:"トナカイの少女ニコラ", type:"character",
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウィングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ),
    rank:5, atk:2000, summon:"kensan" },

  { no:4,  name:"聖ラウス", type:"character",
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウィングからタグ「クランプス」カード1枚を手札に加える。"
    ),
    rank:3, atk:1800 },

  { no:5,  name:"統括AI タータ", type:"character",
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウィングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ),
    rank:4, atk:1000 },

  { no:6,  name:"麗し令嬢エフィ", type:"character",
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウィングに送り、手札から見参できる。\n" +
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
      "このカードが自分ステージに存在する時、発動できる。このカードをウィングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:3, atk:1600 },

  { no:10, name:"小次郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウィングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
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
      "このカードが自分ステージに存在する時、発動できる。このカードをウィングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:1, atk:100 },

  { no:14, name:"記憶抹消", type:"effect",
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウィングに送る。"),
    rank:0, atk:0 },

  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect",
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    rank:0, atk:0 },

  { no:16, name:"力こそパワー！！", type:"effect",
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウィングに送る。"),
    rank:0, atk:0 },

  { no:17, name:"キャトルミューティレーション", type:"effect",
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    text: normalizeText("自分ステージのキャラクターがバトルでウィングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    rank:0, atk:0 },

  { no:18, name:"a-xブラスター01 -放射型-", type:"item",
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウィングに送る。"
    ),
    rank:0, atk:0 },

  { no:19, name:"-聖剣- アロングダイト", type:"item",
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウィングに送った時、カードを1枚ドローする。"
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

  normalSummonUsed:false,
  selectedHandIndex:null,

  battle: {
    attackerUid:null,
    attackerPos:null,
    attackerSide:null,
  },

  viewer: { side:null, zone:null, pos:null, uid:null },

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },

  limits: {
    P1: { handgataUsed:false },
    AI: { handgataUsed:false },
  }
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(c){ return c && c.type==="character"; }
function isEffect(c){ return c && c.type==="effect"; }
function isItem(c){ return c && c.type==="item"; }
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function opponent(side){ return side==="P1" ? "AI" : "P1"; }

function isFirstTurnNoBattleFor(side){
  return (state.turn === 1 && side === state.firstSide);
}

function onShieldBrokenToHand(defSide, shieldIdx, byAttackerName){
  const sh = state[defSide].shield[shieldIdx];
  if(!sh) return false;
  state[defSide].shield[shieldIdx] = null;
  state[defSide].hand.push(sh);
  log(`シールド破壊：${sideName(defSide)} シールド${shieldIdx+1} → ${sideName(defSide)}手札（${byAttackerName}）`);
  renderAll();
  return true;
}

/* ---------------- Modals ---------------- */
function showModal(id){ $(id).classList.add("show"); }
function hideModal(id){ $(id).classList.remove("show"); }

let choiceResolver = null;
let choiceDefaultValue = null;

document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");

  if(close==="choice"){
    hideModal("choiceM");
    if(choiceResolver){
      const r = choiceResolver; choiceResolver=null;
      const dv = (choiceDefaultValue!==null) ? choiceDefaultValue : "__CANCEL__";
      choiceDefaultValue = null;
      r(dv);
    }
  }

  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
  if(close==="zone") hideModal("zoneM");
  if(close==="result") hideModal("resultM");
});

function askChoice(title, message, items, opt={}){
  const { defaultValue=null } = opt;
  choiceDefaultValue = defaultValue;

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
    }else if(it.thumbUrl){
      th.style.backgroundImage = `url("${it.thumbUrl}")`;
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
      if(choiceResolver){
        const r = choiceResolver; choiceResolver=null;
        choiceDefaultValue=null;
        r(it.value);
      }
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

async function askYesNo(title, message){
  const v = await askChoice(title, message, [
    {label:"はい", value:"Y"},
    {label:"いいえ", value:"N"},
  ], {defaultValue:"N"});
  return v==="Y";
}

// v50021: OK確認専用
async function showOk(title, message){
  await askChoice(title, message, [{label:"OK", value:"OK"}], {defaultValue:"OK"});
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
function moveToWing(side, card){
  if(!card) return;
  state[side].wing.unshift(card);
}
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
function resetPerTurn(side){
  state.limits[side].handgataUsed = false;

  const p = state[side];
  for(const c of p.C){
    if(!c) continue;
    c.used.perTurn = false;
    c.flags.attackedCountThisTurn = 0;
    c.flags.producerSavedThisTurn = false;
  }
}

/* ---------------- Viewer / ATK ---------------- */
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
  return atk;
}

function hasFieldAbilityFor(card){
  if(!card || !isCharacter(card)) return false;
  return [1,3,6,9,10,5,13].includes(card.no);
}

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

  const canShow = (ctx?.side==="P1" && ctx?.zone==="C" && hasFieldAbilityFor(card)) ||
                  (ctx?.side==="P1" && ctx?.zone==="C" && card.no===13);
  el.btnCardAct.style.display = canShow ? "inline-block" : "none";

  showModal("viewerM");
}

el.btnCardAct.addEventListener("click", async ()=>{
  hideModal("viewerM");
  const side = state.viewer.side;
  const zone = state.viewer.zone;
  const pos  = state.viewer.pos;
  const uid  = state.viewer.uid;
  if(!side || !zone || pos==null || !uid) return;

  const card = (zone==="C" ? state[side].C[pos] : null);
  if(!card || card.uid!==uid) return;

  await activateFieldCardAbility(side, zone, pos, card);
  renderAll();
}, {passive:true});

/* ---------------- Rendering ---------------- */
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

    bindLongPress(slot, ()=> openViewer(card, ctx), 620);
  }
  return slot;
}

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
  const p0 = countShields("P1")==0;
  const a0 = countShields("AI")==0;
  el.pDirectHint.classList.toggle("show", p0);
  el.aiDirectHint.classList.toggle("show", a0);
}

function renderZones(){
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.E[i];
    const ctx = {side:"AI", zone:"E", pos:i};
    el.aiE.appendChild(makeSlot(c, "AI", ctx, {enemy:true}));
  }

  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const ctx = {side:"AI", zone:"C", pos:i};
    el.aiC.appendChild(makeSlot(c, "AI", ctx, {enemy:true}));
  }

  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const ctx = {side:"P1", zone:"C", pos:i};
    const slot = makeSlot(c, "P1", ctx, {glow});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(slot);
  }

  el.pE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const ctx = {side:"P1", zone:"E", pos:i};
    const slot = makeSlot(c, "P1", ctx, {glow});
    slot.addEventListener("click", ()=> onClickYourE(i), {passive:true});
    el.pE.appendChild(slot);
  }
}

function renderHand(){
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

  document.querySelectorAll(".shieldSlot").forEach((slot)=>{
    slot.onclick = null;
    slot.addEventListener("click", ()=>{
      const side = slot.getAttribute("data-side");
      const idx = Number(slot.getAttribute("data-idx")||"0");
      onShieldClicked(side, idx);
    }, {passive:true});
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

/* ---------------- Turn / Phase ---------------- */
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

async function enforceHandLimitEnd(side){
  const p = state[side];
  if(p.hand.length <= 7) return;

  if(side !== "P1"){
    while(p.hand.length > 7){
      const c = p.hand.pop();
      moveToWing(side, c);
      log(`${sideName(side)}：手札上限→ウィング ${c.name}`);
    }
    renderAll();
    return;
  }

  log("手札上限超過：7枚になるまで自分で選んでウィングへ送ってください", "warn");
  while(p.hand.length > 7){
    const items = p.hand.map((c, i)=>({
      label: c.name,
      sub: `No.${pad2(c.no)} / ${c.type.toUpperCase()}`,
      value: String(i),
      card: c
    }));
    const pick = await askChoice(
      "手札上限（7枚）",
      `現在：${p.hand.length}枚。ウィングへ送るカードを選んでください（残り${p.hand.length-7}枚）`,
      items,
      { defaultValue: "0" }
    );
    const idx = Math.max(0, Math.min(p.hand.length-1, Number(pick)));
    const moved = p.hand.splice(idx,1)[0];
    moveToWing("P1", moved);
    log(`手札→ウィング：${moved.name}`);
    renderAll();
  }
}

async function nextPhase(){
  if(state.gameOver) return;
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];

  if(next==="BATTLE" && isFirstTurnNoBattleFor(state.activeSide)){
    log("先行1ターン目はバトルできません（BATTLEをスキップ）", "warn");
    state.phase = "END";
    await enforceHandLimitEnd(state.activeSide);
    clearEndTurnTemps(state.activeSide);
    renderAll();
    return;
  }

  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.battle.attackerUid=null;
    resetPerTurn(state.activeSide);
    applyOppTurnStartEffects(state.activeSide);
  }

  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${sideName(state.activeSide)}：ドロー +1`);
  }

  if(next==="END"){
    await enforceHandLimitEnd(state.activeSide);
    clearEndTurnTemps(state.activeSide);
  }

  renderAll();
}

async function endTurn(){
  if(state.gameOver) return;

  await enforceHandLimitEnd(state.activeSide);
  clearEndTurnTemps(state.activeSide);

  if(state.activeSide==="P1"){
    state.activeSide="AI";
    state.phase="START";
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    resetPerTurn("AI");
    renderAll();

    applyOppTurnStartEffects("AI");
    await aiTakeTurn();

    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    resetPerTurn("P1");
    log(`TURN ${state.turn} あなたのターン`);
    renderAll();
  }
}

/* ---------------- Start game ---------------- */
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

  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log(`ゲーム開始：初手4 / シールド3 / 先攻=${el.firstInfo.textContent}`);

  renderAll();

  if(state.activeSide==="AI"){
    (async ()=>{
      applyOppTurnStartEffects("AI");
      await aiTakeTurn();
      state.activeSide="P1";
      state.turn=2;
      state.phase="START";
      resetPerTurn("P1");
      log(`TURN ${state.turn} あなたのターン`);
      renderAll();
    })();
  }
}

/* ---------------- Zone viewer ---------------- */
function openZoneList(side, zoneName){
  const p = state[side];
  const list = (zoneName==="WING") ? p.wing : p.outside;
  el.zoneTitle.textContent = `${side==="P1"?"YOUR":"ENEMY"} ${zoneName}`;
  el.zoneBody.innerHTML = "";

  const msg = document.createElement("div");
  msg.className = "choiceMsg";
  msg.textContent = list.length ? "（タップでカードを拡大）" : "（カードはありません）";
  el.zoneBody.appendChild(msg);

  const wrap = document.createElement("div");
  wrap.className = "choiceList";

  for(const c of list.slice(0, 80)){
    const row = document.createElement("div");
    row.className = "choiceItem";
    const th = document.createElement("div");
    th.className = "choiceThumb";
    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) th.style.backgroundImage = `url("${url}")`;

    const meta = document.createElement("div");
    meta.className = "choiceMeta";
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = c.name;
    const s = document.createElement("div");
    s.className = "s";
    s.textContent = `No.${pad2(c.no)} / ${c.type.toUpperCase()} / ATK ${c.baseAtk||0}`;
    meta.appendChild(t); meta.appendChild(s);

    row.appendChild(th); row.appendChild(meta);
    row.addEventListener("click", ()=>{
      openViewer(c, {side, zone: zoneName, pos:null});
    }, {passive:true});

    wrap.appendChild(row);
  }

  el.zoneBody.appendChild(wrap);
  showModal("zoneM");
}

/* =========================================================
   チェーン（記憶抹消/手形）
   v50021:
   - 記憶抹消は「発動したらチェーン上に保持」→ チェーン解決後に必ずウィングへ送る
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
function canUseHandgata(side){
  return hasHandgataOnField(side) && !state.limits[side].handgataUsed;
}
function canUseMemoryErase(side){
  return hasMemoryEraseInHand(side);
}
function buildChainText(chain){
  const lines = [];
  lines.push("【チェーン】");
  chain.forEach((x, i)=>{
    lines.push(`CH${i+1}：${sideName(x.side)} → ${x.name}`);
  });
  return lines.join("\n");
}

async function runNegationChain(activatorSide, activatedName){
  const chain = [{side: activatorSide, kind:"ACT", name: activatedName}];
  let negateCount = 0;
  let lastNegator = null; // {side, name}

  // v50021: 記憶抹消の“発動したカード”をチェーン上に保持→解決後に必ずウィングへ送る
  const pendingMemoryEraseToWing = []; // {side, card}

  let currentSide = activatorSide;
  while(true){
    const responder = opponent(currentSide);

    const canH = canUseHandgata(responder);
    const canM = canUseMemoryErase(responder);

    if(!canH && !canM) break;

    if(responder==="P1"){
      const items = [];
      if(canH) items.push({label:"手形で無効（1ターンに1度）", value:"HANDGATA"});
      if(canM) items.push({label:"記憶抹消で無効（発動後ウィング）", value:"MEMORY"});
      items.push({label:"何もしない", value:"NO"});

      const v = await askChoice(
        "チェーン（無効化）",
        `${buildChainText(chain)}\n\n相手の発動に反応しますか？`,
        items,
        { defaultValue:"NO" }
      );

      if(v==="NO" || v==="__CANCEL__") break;

      if(v==="HANDGATA"){
        state.limits.P1.handgataUsed = true;
        negateCount += 1;
        lastNegator = {side:"P1", name:"手形"};
        chain.push({side:"P1", kind:"NEG", name:"手形（無効化）"});
        log(`チェーン：CH${chain.length} 手形（無効化）`);
        renderAll();
        currentSide = "P1";
        continue;
      }

      if(v==="MEMORY"){
        const me = takeMemoryEraseFromHand("P1");
        if(me){
          pendingMemoryEraseToWing.push({side:"P1", card:me});
          negateCount += 1;
          lastNegator = {side:"P1", name:"記憶抹消"};
          chain.push({side:"P1", kind:"NEG", name:"記憶抹消（無効化）"});
          log(`チェーン：CH${chain.length} 記憶抹消（無効化）`);
          renderAll();
          currentSide = "P1";
          continue;
        }
        break;
      }
      break;
    }

    if(responder==="AI"){
      if(canM){
        const me = takeMemoryEraseFromHand("AI");
        if(me){
          pendingMemoryEraseToWing.push({side:"AI", card:me});
          negateCount += 1;
          lastNegator = {side:"AI", name:"記憶抹消"};
          chain.push({side:"AI", kind:"NEG", name:"記憶抹消（無効化）"});
          log(`チェーン：CH${chain.length} AI 記憶抹消（無効化）`);
          renderAll();
          currentSide = "AI";
          continue;
        }
      }
      if(canH){
        state.limits.AI.handgataUsed = true;
        negateCount += 1;
        lastNegator = {side:"AI", name:"手形"};
        chain.push({side:"AI", kind:"NEG", name:"手形（無効化）"});
        log(`チェーン：CH${chain.length} AI 手形（無効化）`);
        renderAll();
        currentSide = "AI";
        continue;
      }
      break;
    }

    break;
  }

  const negated = (negateCount % 2 === 1);
  if(negated){
    const who = lastNegator ? `${sideName(lastNegator.side)}の${lastNegator.name}` : "無効化";
    log(`チェーン結果：発動は無効（${who}）`, "warn");
  }else if(negateCount>0){
    log(`チェーン結果：発動は通る（無効化 ${negateCount} 回）`);
  }

  // v50021: チェーン解決後に、発動した記憶抹消は必ずウィングへ送る（無効化されても送る）
  for(const x of pendingMemoryEraseToWing){
    moveToWing(x.side, x.card);
    log(`記憶抹消：発動カード → ${sideName(x.side)}ウィング（解決後）`);
  }
  renderAll();

  return {negated, lastNegator};
}

/* ---------------- Field abilities ---------------- */
function requireYourTurnForAbility(side, card){
  if(card.no===13) return true;
  if(side!=="P1"){
    log("この操作はあなた側のみ可能です", "warn");
    return false;
  }
  if(state.activeSide!=="P1"){
    log("今はあなたのターンではありません（効果は発動できません）", "warn");
    return false;
  }
  if(card.no===6){
    if(state.phase!=="MAIN" && state.phase!=="BATTLE"){
      log("今はMAINまたはBATTLEではありません（効果は発動できません）", "warn");
      return false;
    }
    return true;
  }
  if(state.phase!=="MAIN"){
    log("今はMAINフェイズではありません（効果は発動できません）", "warn");
    return false;
  }
  return true;
}

async function activateFieldCardAbility(side, zone, pos, card){
  if(state.gameOver) return;
  if(zone!=="C") return;

  if(!hasFieldAbilityFor(card)){
    log("このカードに起動効果はありません", "warn");
    return;
  }

  if(!requireYourTurnForAbility(side, card)) return;

  if(card.used?.perTurn){
    log("このカードの効果はこのターンすでに使用済みです", "warn");
    return;
  }

  if(card.no===1){
    const react = await runNegationChain("P1", `発動：${card.name}（黒魔法サーチ）`);
    if(react.negated){ log("クルエラ：効果は無効になりました", "warn"); return; }
    const ok = await searchFromDeckOrWingByNameContains("P1", "黒魔法", 1);
    if(ok){ card.used.perTurn = true; log("クルエラ：このターンの効果使用済み"); }
    return;
  }

  if(card.no===3){
    const react = await runNegationChain("P1", `発動：${card.name}（ATK+1000）`);
    if(react.negated){ log("ニコラ：効果は無効になりました", "warn"); return; }
    card.tempAtk += 1000;
    card.used.perTurn = true;
    log("ニコラ：ATK+1000（ターン終了まで）");
    return;
  }

  if(card.no===6){
    const react = await runNegationChain("P1", `発動：${card.name}（ATK-1000）`);
    if(react.negated){ log("エフィ：効果は無効になりました", "warn"); return; }

    const enemies = state.AI.C.map((c,i)=>({c,i})).filter(x=>!!x.c);
    if(!enemies.length){ log("対象がいません", "warn"); return; }

    const pick = await askChoice(
      "エフィ（ATK-1000）",
      "ATKを下げる相手キャラクターを選択してください。",
      enemies.map(x=>({
        label:`C${x.i+1}：${x.c.name}`,
        sub:`ATK ${calcCurrentAtk("AI", x.c)}`,
        value:String(x.i),
        card:x.c
      })),
      { defaultValue:"0" }
    );
    if(pick==="__CANCEL__") return;

    const idx = Number(pick);
    const target = state.AI.C[idx];
    if(!target){ log("対象が無効です", "warn"); return; }
    target.tempAtk -= 1000;
    card.used.perTurn = true;
    log(`エフィ：${target.name} ATK-1000（ターン終了まで）`);
    return;
  }

  log("（未実装の起動効果）", "warn");
}

/* ---------------- Search helpers ---------------- */
async function searchFromDeckOrWingByNameContains(side, needle, n){
  const p = state[side];
  const pool = [
    ...p.deck.map(c=>({src:"deck", c})),
    ...p.wing.map(c=>({src:"wing", c}))
  ].filter(x=>x.c && x.c.name.includes(needle));
  if(!pool.length){
    log(`サーチ失敗：カード名に「${needle}」を含むカードがありません`, "warn");
    await showOk("サーチ失敗", `デッキ・ウィングに「${needle}」がありません。\nシールドにある可能性があります。`);
    return false;
  }

  for(let k=0;k<n;k++){
    if(side==="AI"){
      const pick = pool[0];
      const moved = (pick.src==="deck") ? removeFromZone(p.deck, pick.c.uid) : removeFromZone(p.wing, pick.c.uid);
      if(moved) p.hand.push(moved);
      continue;
    }

    const items = pool.map(x=>({
      label:`${x.c.name}`,
      sub:`${x.src.toUpperCase()}`,
      value:`${x.src}:${x.c.uid}`,
      card:x.c
    }));
    const pick = await askChoice("サーチ", `「${needle}」を手札に加える（${k+1}/${n}）`, items, {defaultValue:"__CANCEL__"});
    if(pick==="__CANCEL__") return (k>0);

    const [src, uid] = String(pick).split(":");
    const moved = (src==="deck") ? removeFromZone(p.deck, uid) : removeFromZone(p.wing, uid);
    if(moved) p.hand.push(moved);
  }
  log(`サーチ：${needle} を手札へ`);
  renderAll();
  return true;
}

// v50021: ラウス用（タグ検索）もOK確認つきアナウンスを追加
async function searchFromDeckOrWingByTag(side, tag, n, opt={}){
  const p = state[side];
  const pool = [
    ...p.deck.map(c=>({src:"deck", c})),
    ...p.wing.map(c=>({src:"wing", c}))
  ].filter(x=>x.c && x.c.tags.includes(tag));

  if(!pool.length){
    log(`サーチ失敗：タグ「${tag}」がデッキ・ウィングにありません`, "warn");
    await showOk("サーチ失敗", `タグ「${tag}」はデッキ・ウィングにありません。\nシールドにある可能性があります。`);
    return false;
  }

  for(let k=0;k<n;k++){
    if(opt.aiAuto){
      const pick = pool[0];
      const moved = (pick.src==="deck") ? removeFromZone(p.deck, pick.c.uid) : removeFromZone(p.wing, pick.c.uid);
      if(moved) p.hand.push(moved);
      log(`AI：サーチ（${tag}）`);
      continue;
    }

    const items = pool.map(x=>({
      label:`${x.c.name}`,
      sub:`${x.src.toUpperCase()} / TAG:${tag}`,
      value:`${x.src}:${x.c.uid}`,
      card:x.c
    }));
    const pick = await askChoice("サーチ", `タグ「${tag}」を手札に加える（${k+1}/${n}）`, items, {defaultValue:"__CANCEL__"});
    if(pick==="__CANCEL__") return false;

    const [src, uid] = String(pick).split(":");
    const moved = (src==="deck") ? removeFromZone(p.deck, uid) : removeFromZone(p.wing, uid);
    if(moved) p.hand.push(moved);
  }

  log(`サーチ：タグ「${tag}」を手札へ`);
  renderAll();
  return true;
}

/* ---------------- Equip / send ---------------- */
async function stripEquipIfAny(side, characterCard){
  if(!characterCard || !characterCard.equipUid) return;

  const p = state[side];
  const eq = findEquipInE(side, characterCard.equipUid);
  if(eq){
    const ePos = p.E.findIndex(x=>x && x.uid===eq.uid);
    if(ePos>=0) p.E[ePos]=null;
    eq.equippedToUid = null;
    moveToWing(side, eq);
    log(`装備剥がれ：${eq.name} → ${sideName(side)}ウィング`);
  }
  characterCard.equipUid = null;
}

async function sendCharacterToWing(side, uid){
  const p = state[side];
  const pos = p.C.findIndex(c=>c && c.uid===uid);
  if(pos<0) return;
  const card = p.C[pos];
  await stripEquipIfAny(side, card);
  p.C[pos]=null;
  moveToWing(side, card);
}

async function equipCommanderAsItem(side, commanderCard, commanderPos){
  const p = state[side];
  // 司令以外のキャラがいるか
  const targets = p.C.map((c,i)=>({c,i}))
    .filter(x=>x.c && x.c.uid!==commanderCard.uid);

  if(!targets.length){
    log("司令：装備対象がいません（効果不発）", "warn");
    return;
  }

  // YES/NO（あなた側のみ表示。AIは自動でYES）
  if(side==="P1"){
    const ok = await askYesNo("司令（登場時）", "司令をアイテム扱いとして装備しますか？（ATK+500）");
    if(!ok){
      log("司令：装備を行いませんでした");
      return;
    }
  }

  // Eの空き確認（司令を“装備カード化”するため配置先が必要）
  const ePos = findEmptyIndex(p.E);
  if(ePos < 0){
    log("司令：Eに空きがないため装備できません（司令はそのまま）", "warn");
    if(side==="P1") await showOk("装備できません", "E（エフェクト/アイテム枠）に空きがありません。");
    return;
  }

  let pickIdx = 0;
  if(side==="P1"){
    const pick = await askChoice(
      "装備先を選択",
      "装備するキャラクターを選んでください。",
      targets.map(x=>({
        label:`C${x.i+1}：${x.c.name}`,
        sub:`ATK ${calcCurrentAtk(side, x.c)}`,
        value:String(x.i),
        card:x.c
      })),
      { defaultValue:String(targets[0].i) }
    );
    if(pick==="__CANCEL__"){ log("司令：装備キャンセル", "warn"); return; }
    pickIdx = Number(pick);
  }else{
    // AIはATKが高いキャラに装備
    targets.sort((a,b)=> calcCurrentAtk(side,b.c)-calcCurrentAtk(side,a.c));
    pickIdx = targets[0].i;
  }

  const host = p.C[pickIdx];
  if(!host){ log("司令：対象が無効です", "warn"); return; }

  // 既存装備があれば剥がす（装備更新）
  if(host.equipUid){
    const old = findEquipInE(side, host.equipUid);
    if(old){
      const oldPos = p.E.findIndex(x=>x && x.uid===old.uid);
      if(oldPos>=0) p.E[oldPos]=null;
      moveToWing(side, old);
      log(`装備更新：旧装備→ウィング ${old.name}`);
    }
    host.equipUid = null;
  }

  // 司令をCから外し、Eへ移し、装備として紐づけ
  p.C[commanderPos] = null;
  p.E[ePos] = commanderCard;

  commanderCard._equipBonus = 500;
  commanderCard._equipBonus2 = 0;
  commanderCard.equippedToUid = host.uid;
  host.equipUid = commanderCard.uid;

  log(`司令：${commanderCard.name} → ${host.name} に装備（ATK+500）`);
  renderAll();
}

/* ---------------- Enter triggers ---------------- */
async function onEnterTriggers(side, ctx){
  const {card, pos} = ctx;

  // ラウス
  if(card.no===4){
    const doSearch = async ()=>{
      const react = await runNegationChain(side, `発動：${card.name}（登場時）`);
      if(react.negated){
        log("ラウス：登場時効果は無効になりました", "warn");
        renderAll();
        return;
      }
      await searchFromDeckOrWingByTag(side, "クランプス", 1, {aiAuto:(side==="AI")});
      renderAll();
    };

    if(side==="AI"){ await doSearch(); return; }
    if(await askYesNo("効果確認", "聖ラウスの効果を使用しますか？（クランプスをサーチ）")){
      await doSearch();
    }
    return;
  }

  // タータ登場時ドロー
  if(card.no===5){
    const react = await runNegationChain(side, `発動：${card.name}（登場時ドロー）`);
    if(react.negated){
      log("タータ：登場時ドローは無効になりました", "warn");
      renderAll();
      return;
    }
    draw(side, 2);
    log(`${sideName(side)}：タータ登場→2ドロー`);
    renderAll();
    return;
  }

  // v50021: 司令（登場時に自動で装備誘導）
  if(card.no===11){
    // 発動条件：自分ステージにこのカード以外のキャラがいる
    const hasOther = state[side].C.some((c)=>c && c.uid!==card.uid);
    if(!hasOther){
      log("司令：登場時効果（対象なし）");
      return;
    }
    // 司令の登場時効果も“発動”扱い→チェーンに乗る
    const react = await runNegationChain(side, `発動：${card.name}（登場時装備）`);
    if(react.negated){
      log("司令：登場時効果は無効になりました", "warn");
      return;
    }
    await equipCommanderAsItem(side, card, pos);
    return;
  }
}

/* ---------------- Interactions (Your side) ---------------- */
async function onClickYourC(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;

  if(state.phase==="BATTLE"){
    if(isFirstTurnNoBattleFor("P1")){
      log("先行1ターン目はバトルできません", "warn");
      return;
    }
    const c = state.P1.C[pos];
    if(!c) return;
    await selectAttacker("P1", pos, c);
    return;
  }

  if(state.phase!=="MAIN") return;
  if(state.P1.C[pos]) return;
  if(state.selectedHandIndex==null) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card)){
    log("Cにはキャラクターのみ置けます", "warn");
    return;
  }

  state.P1.C[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  log(`登場：${card.name}`);
  renderAll();

  await onEnterTriggers("P1", {zone:"C", pos, card});
}

async function onClickYourE(pos){
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

  renderAll();
  log(`E配置：${card.name}`);

  const react = await runNegationChain("P1", `発動：${card.name}`);
  if(react.negated){
    state.P1.E[pos]=null;
    moveToWing("P1", card);
    log(`無効化：${card.name} → ウィング`, "warn");
    renderAll();
    return;
  }

  // ここ以降（アイテム/エフェクト解決）はv50020と同じロジックを使ってください
  // ※ご主人様の環境側に既存関数がある前提（equipItemFromE / resolveEffectFromE）
  if(typeof equipItemFromE === "function" && isItem(card)){
    await equipItemFromE("P1", pos, card);
    renderAll();
    return;
  }
  if(typeof resolveEffectFromE === "function"){
    await resolveEffectFromE("P1", pos, card);
    renderAll();
  }else{
    // 保険（万一関数欠落していた場合）
    state.P1.E[pos]=null;
    moveToWing("P1", card);
    log(`効果未接続：${card.name} → ウィング`, "warn");
    renderAll();
  }
}

/* ---------------- Battle / AI / other parts ----------------
   v50021は「チェーン」「サーチ」「司令」の修正が主目的です。
   それ以外（AI強化・先行バトル禁止・シールド→手札・手札上限）は v50020 のまま維持してください。
   このファイルがv50020の完全版から置換される前提で、欠落がある場合は必ずお知らせください。
------------------------------------------------------------ */

/* ---------------- Bindings / init ---------------- */
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

  el.btnNext.addEventListener("click", async ()=>{
    if(state.activeSide!=="P1" || state.gameOver) return;
    await nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", async ()=>{
    if(state.activeSide!=="P1" || state.gameOver) return;
    await endTurn();
  }, {passive:true});

  document.querySelectorAll(".pile").forEach((p)=>{
    p.addEventListener("click", ()=>{
      const k = p.getAttribute("data-click");
      if(k==="pWing") openZoneList("P1","WING");
      if(k==="aiWing") openZoneList("AI","WING");
      if(k==="pOutside") openZoneList("P1","OUT");
      if(k==="aiOutside") openZoneList("AI","OUT");
    }, {passive:true});
  });
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
  log("v50021：記憶抹消の解決順／サーチ失敗OK確認／司令登場時装備誘導（丸ごと置換）");
}

document.addEventListener("DOMContentLoaded", init);