/* =========================================================
  Manpuku World - v50018 (iPhone First / Full Replace JS)
  - レイアウトは触らない（JSのみ）
  - FIX: TURN1 AI攻撃禁止（先攻AIでも1ターン目BATTLEしない）
  - FIX: Viewer「効果発動」ボタン常時表示（押下で可否判定→不可理由ログ）
  - FIX: 手形(08)/記憶抹消(14) 反応UI/不可理由ログ強化
  - FIX: 無効化された発動カードがEに残る問題を必ず掃除→ウイング
  - FIX: 攻撃済みの視覚化（⚔/半透明）
  - FIX: キャトルミューティレーション(17) 条件成立時の案内＋任意発動
  - FIX: シールド破壊カードは破壊された側の手札へ（P1/AI両方）
  - FIX: 見参コストは「キャラクターカードのみ」（手札/ステージCのみ、Eは不可）
  - FIX: 桜蘭の陰陽術(15) バトル時の使用確認を必ず表示（ATK数値明示）
  - FIX: 選択モーダルを枠外タップで閉じても停止しない（NO扱いで続行）
  - AI: 可能な限り最適解寄り＋「何もせずターンエンド」抑止
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
  for(const it of LOGS.slice(0, 280)){
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

/* ---------------- Cards (No.01〜20 確定反映) ---------------- */
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
    P1: { handgataUsed:false, cruellaUsed:false, tataUsed:false },
    AI: { handgataUsed:false, cruellaUsed:false, tataUsed:false },
  },

  announce: { lastSelUid:null },

  // TURN1攻撃禁止（先攻がAIでも）
  noBattleOnTurn1: true,
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(c){ return c && c.type==="character"; }
function isEffect(c){ return c && c.type==="effect"; }
function isItem(c){ return c && c.type==="item"; }
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function opponent(side){ return side==="P1" ? "AI" : "P1"; }

function getCardByUid(side, uid){
  const p = state[side];
  const zones = [p.hand, p.deck, p.shield, p.wing, p.outside, p.C, p.E];
  for(const z of zones){
    for(const it of z){
      if(it && it.uid === uid) return it;
    }
  }
  return null;
}

/* ---------------- Modals ---------------- */
function showModal(id){ $(id).classList.add("show"); }
function hideModal(id){ $(id).classList.remove("show"); }

/* ★ v50018: choiceモーダルが閉じられる時は必ずNOでresolve */
let choiceResolver = null;
function resolveChoiceIfOpenAsNo(){
  if(choiceResolver){
    const r = choiceResolver;
    choiceResolver = null;
    r("NO");
  }
}

document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;

  // 枠外タップ（choiceモーダル背景）＝NO扱い
  if(t === el.choiceM && el.choiceM.classList.contains("show")){
    hideModal("choiceM");
    resolveChoiceIfOpenAsNo();
    return;
  }

  const close = t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");
  if(close==="choice"){
    hideModal("choiceM");
    resolveChoiceIfOpenAsNo();
  }
  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
  if(close==="zone") hideModal("zoneM");
  if(close==="result") hideModal("resultM");
});

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
        const r = choiceResolver;
        choiceResolver=null;
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
  ]);
  return v==="Y";
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

  if(card.no===9 && hasOnStage(side, (c)=>c && c.no===10)) atk += 500;
  if(card.no===10 && hasOnStage(side, (c)=>c && c.no===9)) atk += 500;

  return atk;
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

  // ★必ず表示（押したら判定）
  el.btnCardAct.style.display = "inline-block";
  showModal("viewerM");
}

function canActivateFromViewer(card, ctx){
  if(state.gameOver) return {ok:false, reason:"ゲームが終了しています"};
  const side = ctx?.side;
  const zone = ctx?.zone;
  if(!side) return {ok:false, reason:"参照側が不明です"};
  if(zone!=="C" && zone!=="E") return {ok:false, reason:"フィールド上のカードではありません"};

  if(side==="P1"){
    if(state.activeSide!=="P1"){
      if(card.no===13) return {ok:true, reason:""};
      return {ok:false, reason:"あなたのターンではありません"};
    }
    if(state.phase!=="MAIN"){
      if(card.no===13) return {ok:true, reason:""};
      return {ok:false, reason:"メインフェイズではありません"};
    }
    if([1,3,5,6,9,10,11,13].includes(card.no)) return {ok:true, reason:""};
    return {ok:false, reason:"このカードは任意発動の対象外です"};
  }

  return {ok:false, reason:"AI側カードは手動発動できません"};
}

el.btnCardAct.addEventListener("click", async ()=>{
  hideModal("viewerM");
  const side = state.viewer.side;
  const zone = state.viewer.zone;
  const pos  = state.viewer.pos;
  const uid  = state.viewer.uid;
  if(!side || !zone || pos==null || !uid) { log("効果発動：参照情報が不完全です", "warn"); return; }

  const card = (zone==="C" ? state[side].C[pos] : state[side].E[pos]);
  if(!card || card.uid!==uid) { log("効果発動：カード参照が一致しません", "warn"); return; }

  const judge = canActivateFromViewer(card, {side, zone, pos});
  if(!judge.ok){
    log(`効果発動不可：${judge.reason}`, "warn");
    return;
  }

  await activateFieldCardAbility(side, zone, pos, card);
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

function isAttackableNow_P1(card){
  if(!card || !isCharacter(card)) return false;
  if(state.gameOver) return false;
  if(state.activeSide!=="P1") return false;
  if(state.phase!=="BATTLE") return false;
  const maxAtk = (card.no===7 && card.equipUid) ? 2 : 1;
  return (card.flags.attackedCountThisTurn < maxAtk);
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

    if(ctx?.side==="P1" && ctx?.zone==="C" && isCharacter(card)){
      const atkable = isAttackableNow_P1(card);
      const maxAtk = (card.no===7 && card.equipUid) ? 2 : 1;
      const usedUp = (card.flags.attackedCountThisTurn >= maxAtk);

      if(usedUp){
        slot.style.opacity = "0.55";
      }else{
        slot.style.opacity = "1";
      }

      if(atkable){
        const m = document.createElement("div");
        m.style.position = "absolute";
        m.style.left = "6px";
        m.style.bottom = "6px";
        m.style.width = "18px";
        m.style.height = "18px";
        m.style.borderRadius = "9px";
        m.style.display = "flex";
        m.style.alignItems = "center";
        m.style.justifyContent = "center";
        m.style.fontSize = "12px";
        m.style.fontWeight = "1000";
        m.style.background = "rgba(0,0,0,.55)";
        m.style.border = "1px solid rgba(89,242,255,.28)";
        m.textContent = "⚔";
        slot.appendChild(m);
      }
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

function announceHandSelection(){
  if(state.activeSide!=="P1" || state.phase!=="MAIN" || state.gameOver) return;
  if(state.selectedHandIndex==null) return;

  const c = state.P1.hand[state.selectedHandIndex];
  if(!c) return;

  if(state.announce.lastSelUid === c.uid) return;
  state.announce.lastSelUid = c.uid;

  if(isCharacter(c)){
    if(c.summon==="kensan"){
      log(`案内：見参キャラです。空きCをタップ→コスト選択（キャラのみ）→登場`);
    }else{
      log(`案内：キャラです。空きCをタップ→登場（通常はターン1回）`);
    }
    return;
  }

  if(isItem(c)){
    const hasHost = state.P1.C.some(Boolean);
    const hasE = findEmptyIndex(state.P1.E) >= 0;
    if(hasHost && hasE){
      log(`案内：アイテムです。空きEをタップ→発動→装備先を選択`);
    }else if(!hasHost){
      log(`案内：アイテムですが装備先（自分C）がいません`, "warn");
    }else{
      log(`案内：アイテムですがE枠が空いていません`, "warn");
    }
    return;
  }

  if(isEffect(c)){
    log(`案内：エフェクトです。空きEをタップ→発動→解決→ウイング`);
    return;
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
      const next = (state.selectedHandIndex===i) ? null : i;
      state.selectedHandIndex = next;
      if(next==null) state.announce.lastSelUid = null;
      renderAll();
      announceHandSelection();
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
function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.unshift(c);
    log(`${sideName(side)}：手札上限→ウイング ${c.name}`);
  }
}

function nextPhase(){
  if(state.gameOver) return;
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.announce.lastSelUid=null;
    state.battle.attackerUid=null;
    resetPerTurn(state.activeSide);
    applyOppTurnStartEffects(state.activeSide);
  }

  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${sideName(state.activeSide)}：ドロー +1`);
  }

  if(next==="END"){
    enforceHandLimit(state.activeSide);
    clearEndTurnTemps(state.activeSide);
  }

  renderAll();
}

async function endTurn(){
  if(state.gameOver) return;

  enforceHandLimit(state.activeSide);
  clearEndTurnTemps(state.activeSide);

  if(state.activeSide==="P1"){
    state.activeSide="AI";
    state.phase="START";
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.announce.lastSelUid=null;
    resetPerTurn("AI");
    renderAll();

    applyOppTurnStartEffects("AI");
    await aiTakeTurn();

    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.announce.lastSelUid=null;
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
  state.announce.lastSelUid=null;
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
   反応（手形/記憶抹消）：発動時フック
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
function forceRemoveFromEIfPresent(side, card, ctx){
  if(!ctx || ctx.zone!=="E" || ctx.pos==null) return;
  const p = state[side];
  const pos = Number(ctx.pos);
  if(Number.isNaN(pos)) return;
  if(p.E[pos] && p.E[pos].uid === card.uid){
    p.E[pos] = null;
  }else{
    const i = p.E.findIndex(x=>x && x.uid===card.uid);
    if(i>=0) p.E[i] = null;
  }
}

// 戻り：{negated:boolean, counter:"HANDGATA"|"MEMORY"|null}
async function checkReactiveNegation(activatorSide, activatedCard, ctx){
  const defenderSide = opponent(activatorSide);

  const isOppTurnForDefender = (state.activeSide === activatorSide);

  const canHandgata =
    isOppTurnForDefender &&
    hasHandgataOnField(defenderSide) &&
    !state.limits[defenderSide].handgataUsed;

  const canMemoryErase =
    isOppTurnForDefender &&
    hasMemoryEraseInHand(defenderSide);

  if(!canHandgata && !canMemoryErase){
    if(defenderSide==="P1" && isOppTurnForDefender){
      const why = [];
      if(!hasHandgataOnField("P1")) why.push("手形（場にいない）");
      else if(state.limits.P1.handgataUsed) why.push("手形（この相手ターンは使用済み）");
      if(!hasMemoryEraseInHand("P1")) why.push("記憶抹消（手札にない）");
      if(why.length) log(`反応不可：${why.join(" / ")}`, "warn");
    }
    return {negated:false, counter:null};
  }

  if(defenderSide==="P1"){
    const items = [];
    if(canHandgata){
      items.push({label:"手形で無効（相手ターンに1度）", value:"HANDGATA"});
    }
    if(canMemoryErase){
      items.push({label:"記憶抹消で無効（記憶抹消→ウイング）", value:"MEMORY"});
    }
    items.push({label:"何もしない", value:"NO"});

    const v = await askChoice(
      "反応（カウンター）",
      `相手が「${activatedCard.name}」を発動しました。反応しますか？`,
      items
    );

    if(v==="HANDGATA"){
      state.limits.P1.handgataUsed = true;
      log("手形：相手の効果を無効");
      return {negated:true, counter:"HANDGATA"};
    }
    if(v==="MEMORY"){
      const me = takeMemoryEraseFromHand("P1");
      if(me){
        moveToWing("P1", me);
        log("記憶抹消：相手の効果を無効（記憶抹消→ウイング）");
        return {negated:true, counter:"MEMORY"};
      }
      log("記憶抹消：手札にありません（失敗）", "warn");
      return {negated:false, counter:null};
    }
    return {negated:false, counter:null};
  }

  if(defenderSide==="AI"){
    if(canMemoryErase){
      const me = takeMemoryEraseFromHand("AI");
      if(me){
        moveToWing("AI", me);
        log("AI：記憶抹消で無効");
        return {negated:true, counter:"MEMORY"};
      }
    }
    if(canHandgata){
      state.limits.AI.handgataUsed = true;
      log("AI：手形で無効");
      return {negated:true, counter:"HANDGATA"};
    }
  }

  return {negated:false, counter:null};
}

/* ---------------- 桜蘭の陰陽術(15) バトル時処理 ---------------- */
function hasSakuraRanInHand(side){
  return state[side].hand.some(c=>c && c.no===15);
}
function takeSakuraRanFromHand(side){
  const idx = state[side].hand.findIndex(c=>c && c.no===15);
  if(idx<0) return null;
  return state[side].hand.splice(idx,1)[0];
}

async function promptSakuraRanIfPossible_P1(attackerSide, attackerCard, defenderSide, defenderCard){
  // P1の手札にある時だけUIを出す
  if(!hasSakuraRanInHand("P1")) return false;

  // バトルは「キャラ同士」の時のみ
  if(!isCharacter(attackerCard) || !isCharacter(defenderCard)) return false;

  // P1がバトルに関係している時だけ（攻撃側でも防御側でも）
  const involved = (attackerSide==="P1" || defenderSide==="P1");
  if(!involved) return false;

  // 強化するのは「自分ステージのキャラ1体」＝基本は“自分が操作している側”のキャラ
  // ここでは「P1の場のキャラ」を選べるようにする（テキスト通り）
  const pChars = state.P1.C.filter(Boolean);
  if(!pChars.length) return false;

  const atkA = calcCurrentAtk(attackerSide, attackerCard);
  const atkD = calcCurrentAtk(defenderSide, defenderCard);

  // どれを+1000するかの候補を提示（親切）
  const items = pChars.map(c=>{
    const cur = calcCurrentAtk("P1", c);
    return {
      label:`${c.name}`,
      sub:`現在ATK ${cur} → 使用後ATK ${cur+1000}`,
      value:c.uid,
      card:c
    };
  });

  const msg =
`現在のバトル
攻撃側：${attackerCard.name}（ATK ${atkA}）
防御側：${defenderCard.name}（ATK ${atkD}）

「桜蘭の陰陽術 - 闘 -」を使用して
自分ステージのキャラクター1体をATK+1000しますか？
（枠外タップ＝使用しない）`;

  const v = await askChoice("桜蘭の陰陽術 - 闘 -", msg, items.concat([{label:"使用しない", value:"NO"}]));
  if(v==="NO") return false;

  const target = state.P1.C.find(c=>c && c.uid===v);
  if(!target){
    log("桜蘭：対象が無効です（不発）", "warn");
    return false;
  }

  const card = takeSakuraRanFromHand("P1");
  if(!card){
    log("桜蘭：手札にありません（不発）", "warn");
    return false;
  }

  target.tempAtk += 1000;
  moveToWing("P1", card);
  log(`桜蘭：${target.name} ATK+1000（ターン終了まで） / 桜蘭→あなたウイング`);
  renderAll();
  return true;
}

function aiShouldUseSakuraRan(attackerSide, attackerCard, defenderSide, defenderCard){
  if(!hasSakuraRanInHand("AI")) return null;
  if(!isCharacter(attackerCard) || !isCharacter(defenderCard)) return null;

  // AIの場のキャラを+1000できる（テキスト通り）
  const aChars = state.AI.C.filter(Boolean);
  if(!aChars.length) return null;

  // AIのバトルが関係している時のみ
  const involved = (attackerSide==="AI" || defenderSide==="AI");
  if(!involved) return null;

  // 目的：このバトルで有利にする、または次ターンの有利を作る
  // まずは「今バトルに参加しているAIキャラ」を優先し、
  // それでも有利にならないなら最大ATKのAIキャラに付与する
  const atkA = calcCurrentAtk(attackerSide, attackerCard);
  const atkD = calcCurrentAtk(defenderSide, defenderCard);

  // AIが攻撃側の場合、+1000で勝てるなら使う
  if(attackerSide==="AI"){
    if(atkA <= atkD && (atkA + 1000) > atkD){
      return attackerCard.uid;
    }
  }

  // AIが防御側の場合、+1000で負け回避できるなら使う（=相打ち以上にする）
  if(defenderSide==="AI"){
    if(atkD < atkA && (atkD + 1000) >= atkA){
      return defenderCard.uid;
    }
  }

  // それ以外：最大ATKキャラ強化（任意）
  let best = aChars[0];
  let bestAtk = calcCurrentAtk("AI", best);
  for(const c of aChars){
    const a = calcCurrentAtk("AI", c);
    if(a > bestAtk){ best=c; bestAtk=a; }
  }
  // ただし温存した方が良い局面もあるので、ここは控えめに
  // 目安：AIの場が1体だけ or こちらの場が強い時にのみ使う
  if(state.AI.C.filter(Boolean).length===1 || state.P1.C.filter(Boolean).length>=2){
    return best.uid;
  }
  return null;
}

function aiUseSakuraRanIfDecided(targetUid){
  const target = state.AI.C.find(c=>c && c.uid===targetUid);
  if(!target) return false;
  const card = takeSakuraRanFromHand("AI");
  if(!card) return false;
  target.tempAtk += 1000;
  moveToWing("AI", card);
  log(`AI：桜蘭の陰陽術 - 闘 -（${target.name} ATK+1000）`);
  return true;
}

/* ---------------- Interactions (Your side) ---------------- */
async function onClickYourC(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;

  if(state.phase==="BATTLE"){
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

  if(card.summon==="kensan"){
    await doKensanSummon("P1", pos, state.selectedHandIndex);
    return;
  }

  if(state.normalSummonUsed){
    log("登場（通常）はターン1回です", "warn");
    return;
  }

  state.P1.C[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  state.announce.lastSelUid=null;
  state.normalSummonUsed=true;

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
  state.announce.lastSelUid=null;

  renderAll();
  log(`E配置：${card.name}`);

  const react = await checkReactiveNegation("P1", card, {zone:"E", pos});

  if(react.negated){
    forceRemoveFromEIfPresent("P1", card, {zone:"E", pos});
    moveToWing("P1", card);
    log(`無効化：${card.name} → あなたウイング`);
    renderAll();
    return;
  }

  if(isItem(card)){
    await equipItemFromE("P1", pos, card);
    renderAll();
    return;
  }

  await resolveEffectFromE("P1", pos, card);
  renderAll();
}

/* ★ v50018: 見参コストは「キャラクターカードのみ」 */
async function doKensanSummon(side, cPos, handIdx){
  const p = state[side];
  const card = p.hand[handIdx];
  if(!card) return;
  if(card.summon!=="kensan") return;
  if(p.C[cPos]) return;

  const cands = [];

  // 手札：キャラのみ（見参本人以外）
  for(let i=0;i<p.hand.length;i++){
    if(i===handIdx) continue;
    const c = p.hand[i];
    if(!c) continue;
    if(isCharacter(c)){
      cands.push({from:"hand", idx:i, card:c, label:`手札：${c.name}`});
    }
  }

  // ステージ：Cのキャラのみ（Eは対象外）
  for(let i=0;i<3;i++){
    if(p.C[i]) cands.push({from:"C", idx:i, card:p.C[i], label:`C${i+1}：${p.C[i].name}`});
  }

  if(!cands.length){
    log("見参：コスト候補（キャラクター）がありません", "warn");
    return;
  }

  const pick = await askChoice("見参（コスト）", "ウイングへ送るキャラクターカードを1枚選んでください。", cands.map(x=>({
    label:x.label, value:`${x.from}:${x.idx}`, card:x.card
  })));

  const [from, idxStr] = String(pick).split(":");
  const idx = Number(idxStr);

  if(from==="hand"){
    const moved = p.hand.splice(idx,1)[0];
    moveToWing(side, moved);
    if(idx < handIdx) handIdx -= 1;
  }else if(from==="C"){
    const moved = p.C[idx];
    await stripEquipIfAny(side, moved);
    p.C[idx]=null;
    moveToWing(side, moved);
  }else{
    log("見参：不正な参照です", "warn");
    return;
  }

  const placed = p.hand.splice(handIdx,1)[0];
  p.C[cPos]=placed;

  log(`見参：${placed.name}`);
  renderAll();

  await onEnterTriggers(side, {zone:"C", pos:cPos, card:placed});
}

/* ---------------- Equip / Effect resolution ---------------- */
async function equipItemFromE(side, ePos, itemCard){
  const p = state[side];

  const targets = [];
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(c) targets.push({i, c});
  }
  if(!targets.length){
    log("装備：対象キャラがいません（カードはウイングへ）", "warn");
    p.E[ePos]=null;
    moveToWing(side, itemCard);
    return;
  }

  const pick = await askChoice("装備先を選択", "装備するキャラクターを選んでください。", targets.map(x=>({
    label:`C${x.i+1}：${x.c.name}`, sub:`ATK ${calcCurrentAtk(side, x.c)}`, value:`${x.i}`, card:x.c
  })));
  const cPos = Number(pick);
  const host = p.C[cPos];
  if(!host){
    log("装備：対象が無効です（取り消し）", "warn");
    return;
  }

  if(host.equipUid){
    const old = findEquipInE(side, host.equipUid);
    if(old){
      const oldPos = p.E.findIndex(x=>x && x.uid===old.uid);
      if(oldPos>=0) p.E[oldPos]=null;
      moveToWing(side, old);
      log(`装備更新：旧装備→ウイング ${old.name}`);
    }
    host.equipUid = null;
  }

  itemCard._equipBonus = 0;
  itemCard._equipBonus2 = 0;

  if(itemCard.no===18){
    itemCard._equipBonus = 500;
    if(host.tags.includes("射手")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===19){
    itemCard._equipBonus = 500;
    if(host.tags.includes("勇者") || host.tags.includes("剣士")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===20){
    itemCard._equipBonus = 300;
    if(host.tags.includes("勇者")) itemCard._equipBonus2 = 500;
  }

  itemCard.equippedToUid = host.uid;
  host.equipUid = itemCard.uid;

  log(`装備：${itemCard.name} → ${host.name}`);
  renderAll();
}

async function resolveEffectFromE(side, ePos, eff){
  const ok = await canActivateEffectNow(side, eff);
  if(!ok){
    log(`発動できません：${eff.name}`, "warn");
    state[side].E[ePos]=null;
    moveToWing(side, eff);
    return;
  }

  await resolveEffect(side, eff);

  state[side].E[ePos]=null;
  moveToWing(side, eff);
  log(`効果解決→ウイング：${eff.name}`);
}

/* ---------------- Triggers / Abilities ---------------- */
async function onEnterTriggers(side, ctx){
  const {card} = ctx;

  if(card.no===4){
    if(side==="AI"){
      await searchFromDeckOrWingByTag("AI", "クランプス", 1, {aiAuto:true});
      return;
    }
    if(await askYesNo("効果確認", "聖ラウスの効果を使用しますか？（クランプスをサーチ）")){
      await searchFromDeckOrWingByTag(side, "クランプス", 1);
    }
    return;
  }

  if(card.no===5){
    draw(side, 2);
    log(`${sideName(side)}：タータ登場→2ドロー`);
    renderAll();
    return;
  }

  if(card.no===11){
    if(side==="AI"){
      await aiTryShireiEquip("AI", ctx.pos);
      return;
    }
    const others = state[side].C.filter(x=>x && x.uid!==card.uid);
    if(!others.length){
      log("司令：他の自分キャラがいないため効果は発動できません", "warn");
      return;
    }
    if(await askYesNo("効果確認", "司令の効果を使用しますか？（このカードを装備扱いにしてATK+500）")){
      await activateShireiEquip(side, ctx.pos, card);
    }
    return;
  }
}

async function activateFieldCardAbility(side, zone, pos, card){
  if(side!=="P1") return;

  if(card.no===13){
    await activateStamax(side, pos, card);
    renderAll();
    return;
  }

  if(state.activeSide!=="P1" || state.phase!=="MAIN"){
    log("このタイミングでは発動できません", "warn");
    return;
  }

  if(card.no===1){ await activateCruellaSearch(side, card); return; }
  if(card.no===3){ await activateNikolaBuff(side, pos, card); return; }
  if(card.no===5){ await activateTataExchange(side, card); return; }
  if(card.no===6){ await activateEfiDebuff(side, card); return; }
  if(card.no===11){ await activateShireiEquip(side, pos, card); return; }

  log("このカードは任意発動の対象外です", "warn");
}

/* ---------------- Individual card logic ---------------- */
async function activateCruellaSearch(side, card){
  if(state.activeSide!==side || state.phase!=="MAIN") { log("今は発動できません", "warn"); return; }
  if(state.limits[side].cruellaUsed){ log("クルエラ：このターンは既に使用しています", "warn"); return; }

  if(await askYesNo("クルエラ", "効果を発動しますか？（カード名に「黒魔法」を含むカードをサーチ）")){
    state.limits[side].cruellaUsed = true;
    await searchFromDeckOrWingByNameIncludes(side, "黒魔法", 1);
    renderAll();
  }
}

async function activateNikolaBuff(side, cPos, card){
  if(card.used.perTurn){ log("ニコラ：このターンは既に使用しています", "warn"); return; }
  if(await askYesNo("ニコラ", "ATK+1000（ターン終了まで）を発動しますか？")){
    card.used.perTurn = true;
    card.tempAtk += 1000;
    log("ニコラ：ATK+1000（ターン終了まで）");
    renderAll();
  }
}

async function activateEfiDebuff(side, card){
  if(card.used.perTurn){ log("エフィ：このターンは既に使用しています", "warn"); return; }
  const enemy = opponent(side);
  const t = await pickEnemyCharacter(enemy, "エフィ", "ATK-1000する相手キャラクターを選んでください。");
  if(!t) return;
  card.used.perTurn = true;
  t.tempAtk -= 1000;
  log(`エフィ：${t.name} ATK-1000（ターン終了まで）`);
  renderAll();
}

async function activateTataExchange(side, card){
  if(state.limits[side].tataUsed){ log("タータ：このターンは既に使用しています", "warn"); return; }
  if(await askYesNo("タータ", "手札2枚までウイング→同数だけBUGBUG西遊記をサーチしますか？")){
    state.limits[side].tataUsed = true;

    const p = state[side];
    const max = Math.min(2, p.hand.length);
    if(max===0){ log("手札がありません", "warn"); return; }

    const picks = [];
    for(let k=0;k<max;k++){
      const items = p.hand.map((c, i)=>({
        label:`手札：${c.name}`,
        sub:`No.${pad2(c.no)} / ${c.type.toUpperCase()}`,
        value:String(i),
        card:c
      }));
      const v = await askChoice("タータ（コスト）", `ウイングへ送るカードを選択（${k+1}/${max}）\n※「キャンセル」で終了`, items.concat([{label:"キャンセル", value:"X"}]));
      if(v==="X") break;
      const idx = Number(v);
      const moved = p.hand.splice(idx,1)[0];
      moveToWing(side, moved);
      picks.push(moved);
    }

    const n = picks.length;
    if(n<=0){ log("タータ：送ったカードがないため終了"); renderAll(); return; }

    for(let i=0;i<n;i++){
      const idx = p.deck.findIndex(c=>c && c.titleTag==="BUGBUG西遊記");
      if(idx<0) break;
      p.hand.push(p.deck.splice(idx,1)[0]);
    }
    log(`タータ：${n}枚交換（BUGBUGサーチ）`);
    renderAll();
  }
}

async function activateStamax(side, cPos, card){
  const enemy = opponent(side);
  const t = await pickEnemyCharacter(enemy, "スタマックス氏", "ATK-1000する相手キャラクターを選んでください。");
  if(!t) return;

  await stripEquipIfAny(side, card);
  state[side].C[cPos] = null;
  moveToWing(side, card);

  t.tempAtk -= 1000;
  log(`スタマックス氏：自身→ウイング / ${t.name} ATK-1000（ターン終了まで）`);
  renderAll();
}

async function activateShireiEquip(side, cPos, card){
  const p = state[side];
  const others = [];
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(c && c.uid!==card.uid) others.push({i, c});
  }
  if(!others.length){
    log("司令：他の自分キャラがいないため発動できません", "warn");
    return;
  }

  const ePos = findEmptyIndex(p.E);
  if(ePos<0){
    log("司令：E枠が空いていません（装備できません）", "warn");
    return;
  }

  const pick = await askChoice("司令（装備先）", "装備するキャラクターを選んでください。", others.map(x=>({
    label:`C${x.i+1}：${x.c.name}`, sub:`ATK ${calcCurrentAtk(side, x.c)}`, value:String(x.i), card:x.c
  })));
  const hostPos = Number(pick);
  const host = p.C[hostPos];
  if(!host || host.uid===card.uid){
    log("司令：装備先が無効です", "warn");
    return;
  }

  p.C[cPos] = null;
  p.E[ePos] = card;
  card.type = "item";
  card.equippedToUid = host.uid;
  card._equipBonus = 500;
  card._equipBonus2 = 0;
  host.equipUid = card.uid;

  log(`司令：装備化 → ${host.name} ATK+500`);
  renderAll();
}

/* ---------------- Effect checks & resolve ---------------- */
async function canActivateEffectNow(side, eff){
  if(eff.no===2){
    return hasOnStage(side, (c)=>c && c.no===1);
  }
  if(eff.no===14) return false; // 記憶抹消は反応専用
  if(eff.no===15) return false; // 桜蘭の陰陽術はバトル時専用（下で処理）
  if(eff.no===16){
    return (state.activeSide===side && state.phase==="MAIN");
  }
  if(eff.no===17) return false; // キャトルは反応専用
  return (state.activeSide===side && state.phase==="MAIN");
}

function estimateRemoveValue(card){
  if(!card) return 0;
  let v = (card.baseAtk||0);
  v += (card.rank||0) * 120;
  if(card.no===8) v += 300;
  if(card.no===12) v += 200;
  return v;
}

async function resolveEffect(side, eff){
  const enemy = opponent(side);

  if(eff.no===2){
    if(side==="AI"){
      const enemyChars = state[enemy].C.filter(Boolean);
      if(!enemyChars.length){ log("AI：フレイム対象なし", "warn"); return; }

      let best = enemyChars[0];
      let bestAtk = calcCurrentAtk(enemy, best);
      for(const c of enemyChars){
        const a = calcCurrentAtk(enemy, c);
        if(a > bestAtk){ best=c; bestAtk=a; }
      }
      const maxValue = estimateRemoveValue(best);

      const r4 = enemyChars.filter(c=> (c.rank||0)<=4);
      const r4Value = r4.reduce((s,c)=>s+estimateRemoveValue(c),0);

      const mode = (r4.length>=2 && r4Value >= maxValue*1.05) ? "R4" : "MAX";

      if(mode==="MAX"){
        await sendCharacterToWing(enemy, best.uid);
        log(`AI：フレイムバレット（MAX）→ ${best.name} をウイングへ`);
        return;
      }else{
        for(const c of r4){
          await sendCharacterToWing(enemy, c.uid);
        }
        log(`AI：フレイムバレット（R4）→ rank4以下を全てウイングへ`);
        return;
      }
    }

    const mode = await askChoice("フレイムバレット", "効果を選択してください。", [
      {label:"ATKが1番高い相手キャラ1体をウイングへ", value:"MAX"},
      {label:"rank4以下の相手キャラをすべてウイングへ", value:"R4"},
    ]);
    if(mode==="MAX"){
      const cands = state[enemy].C.filter(Boolean);
      if(!cands.length){ log("相手キャラがいません", "warn"); return; }
      let best = cands[0];
      let bestAtk = calcCurrentAtk(enemy, best);
      for(const c of cands){
        const a = calcCurrentAtk(enemy, c);
        if(a > bestAtk){ best=c; bestAtk=a; }
      }
      await sendCharacterToWing(enemy, best.uid);
      log(`フレイムバレット：${best.name} をウイングへ`);
      return;
    }else{
      const toSend = state[enemy].C.filter(c=>c && (c.rank||0)<=4);
      if(!toSend.length){ log("対象がいません", "warn"); return; }
      for(const c of toSend){
        await sendCharacterToWing(enemy, c.uid);
      }
      log(`フレイムバレット：rank4以下を全てウイングへ`);
      return;
    }
  }

  if(eff.no===16){
    const cands = state[enemy].C.filter(Boolean);
    if(!cands.length){ log("相手キャラがいません", "warn"); return; }

    if(side==="AI"){
      let best = cands[0];
      let bestAtk = calcCurrentAtk(enemy, best);
      let bestVal = estimateRemoveValue(best);
      for(const c of cands){
        const a = calcCurrentAtk(enemy, c);
        if(a < bestAtk){
          best = c; bestAtk = a; bestVal = estimateRemoveValue(c);
        }else if(a===bestAtk){
          const v = estimateRemoveValue(c);
          if(v > bestVal){ best=c; bestVal=v; }
        }
      }
      await sendCharacterToWing(enemy, best.uid);
      log(`AI：力こそパワー！！→ ${best.name} をウイングへ`);
      return;
    }

    let best = cands[0];
    let bestAtk = calcCurrentAtk(enemy, best);
    for(const c of cands){
      const a = calcCurrentAtk(enemy, c);
      if(a < bestAtk){ best=c; bestAtk=a; }
    }
    await sendCharacterToWing(enemy, best.uid);
    log(`力こそパワー！！：ATK最低の ${best.name} をウイングへ`);
    return;
  }

  log(`（未実装効果）${eff.name}`, "warn");
}

/* ---------------- Search helpers ---------------- */
async function searchFromDeckOrWingByTag(side, tag, n, opt={}){
  const p = state[side];
  const pool = [
    ...p.deck.map(c=>({src:"deck", c})),
    ...p.wing.map(c=>({src:"wing", c}))
  ].filter(x=>x.c && x.c.tags.includes(tag));
  if(!pool.length){ log(`サーチ失敗：タグ「${tag}」が見つかりません`, "warn"); return; }

  for(let k=0;k<n;k++){
    if(opt.aiAuto){
      const pick = pool[0];
      if(pick.src==="deck"){
        const moved = removeFromZone(p.deck, pick.c.uid);
        if(moved) p.hand.push(moved);
      }else{
        const moved = removeFromZone(p.wing, pick.c.uid);
        if(moved) p.hand.push(moved);
      }
      log(`AI：サーチ（${tag}）`);
      continue;
    }

    const items = pool.map(x=>({
      label:`${x.c.name}`,
      sub:`${x.src.toUpperCase()} / TAG:${tag}`,
      value:`${x.src}:${x.c.uid}`,
      card:x.c
    }));
    const pick = await askChoice("サーチ", `タグ「${tag}」を手札に加える（${k+1}/${n}）`, items);
    const [src, uid] = String(pick).split(":");
    if(src==="deck"){
      const moved = removeFromZone(p.deck, uid);
      if(moved) p.hand.push(moved);
    }else{
      const moved = removeFromZone(p.wing, uid);
      if(moved) p.hand.push(moved);
    }
  }
  log(`サーチ：タグ「${tag}」を手札へ`);
}

async function searchFromDeckOrWingByNameIncludes(side, word, n){
  const p = state[side];
  const pool = [
    ...p.deck.map(c=>({src:"deck", c})),
    ...p.wing.map(c=>({src:"wing", c}))
  ].filter(x=>x.c && x.c.name.includes(word));
  if(!pool.length){ log(`サーチ失敗：名称「${word}」が見つかりません`, "warn"); return; }

  for(let k=0;k<n;k++){
    const items = pool.map(x=>({
      label:`${x.c.name}`,
      sub:`${x.src.toUpperCase()} / NAME:${word}`,
      value:`${x.src}:${x.c.uid}`,
      card:x.c
    }));
    const pick = await askChoice("サーチ", `名称「${word}」を手札に加える（${k+1}/${n}）`, items);
    const [src, uid] = String(pick).split(":");
    if(src==="deck"){
      const moved = removeFromZone(p.deck, uid);
      if(moved) p.hand.push(moved);
    }else{
      const moved = removeFromZone(p.wing, uid);
      if(moved) p.hand.push(moved);
    }
  }
  log(`サーチ：名称「${word}」を手札へ`);
}

/* ---------------- Battle ---------------- */
async function selectAttacker(side, pos, card){
  if(side!=="P1") return;

  const maxAtk = (card.no===7 && card.equipUid) ? 2 : 1;
  if(card.flags.attackedCountThisTurn >= maxAtk){
    log("このキャラクターはこのターン攻撃済みです", "warn");
    return;
  }

  state.battle.attackerUid = card.uid;
  state.battle.attackerPos = pos;
  state.battle.attackerSide = side;
  log(`攻撃者選択：${card.name}`);
  renderAll();

  await chooseAttackTarget();
}

async function chooseAttackTarget(){
  if(state.phase!=="BATTLE") return;
  const attacker = state.P1.C[state.battle.attackerPos];
  if(!attacker || attacker.uid!==state.battle.attackerUid) return;

  const enemySide = "AI";
  const enemyChars = state[enemySide].C.filter(Boolean);

  if(enemyChars.length){
    const items = enemyChars.map(c=>({
      label:`${c.name}`,
      sub:`ATK ${calcCurrentAtk(enemySide, c)}`,
      value:`C:${c.uid}`,
      card:c
    }));
    const pick = await askChoice("攻撃対象", "攻撃する相手キャラクターを選択してください。", items);
    const [, uid] = String(pick).split(":");
    await resolveBattle(attacker, uid);
    return;
  }

  const shields = state[enemySide].shield.map((c, idx)=>({c, idx})).filter(x=>!!x.c);
  if(shields.length){
    const items = shields.map(x=>({
      label:`シールド ${x.idx+1}`,
      sub:`（裏向き）`,
      value:`S:${x.idx}`
    }));
    const pick = await askChoice("攻撃対象", "破壊するシールドを選択してください。", items);
    const [, idxStr] = String(pick).split(":");
    await breakShield(enemySide, Number(idxStr), attacker);
    return;
  }

  if(attacker.no===7){
    log("まひる：相手シールド0の時は直接攻撃できません", "warn");
    return;
  }

  const ok = await askYesNo("DIRECT", "ダイレクトアタックをしますか？");
  if(!ok) return;
  await finishGame("P1");
}

function onShieldClicked(side, idx){
  if(state.gameOver) return;
  if(state.phase!=="BATTLE") return;
  if(state.activeSide!=="P1") return;
  if(side!=="AI") return;

  if(!state.battle.attackerUid){
    log("先に自分の攻撃者（C）を選択してください", "warn");
    return;
  }
  if(state.AI.C.some(Boolean)){
    log("相手にキャラクターがいるため、シールドは攻撃できません", "warn");
    return;
  }
  if(!state.AI.shield[idx]){
    log("シールドがありません（DIRECTを選択してください）", "warn");
    return;
  }
  log("攻撃対象は「攻撃対象選択」から選べます");
}

async function resolveBattle(attacker, defenderUid){
  const enemySide = "AI";
  const defender = state[enemySide].C.find(c=>c && c.uid===defenderUid);
  if(!defender){ log("対象が無効です", "warn"); return; }

  // ★ v50018: 桜蘭の陰陽術（P1→AIの順で判定）
  await promptSakuraRanIfPossible_P1("P1", attacker, "AI", defender);
  const aiTargetUid = aiShouldUseSakuraRan("P1", attacker, "AI", defender);
  if(aiTargetUid) aiUseSakuraRanIfDecided(aiTargetUid);

  const atkA = calcCurrentAtk("P1", attacker);
  const atkD = calcCurrentAtk("AI", defender);
  log(`バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  if(atkA > atkD){
    await sendCharacterToWing("AI", defender.uid);
    log(`撃破：${defender.name} → AIウイング`);
  }else if(atkA < atkD){
    const saved = await tryProducerSave("P1", attacker);
    if(!saved){
      await sendCharacterToWing("P1", attacker.uid);
      log(`敗北：${attacker.name} → あなたウイング`);
      await tryCattleTrigger_P1();
    }else{
      log(`班目プロデューサー：バトル破壊を無効（このターン1回）`);
    }
  }else{
    const savedA = await tryProducerSave("P1", attacker);
    const savedD = await tryProducerSave("AI", defender);
    if(!savedA){
      await sendCharacterToWing("P1", attacker.uid);
      await tryCattleTrigger_P1();
    }
    if(!savedD) await sendCharacterToWing("AI", defender.uid);
    log("相打ち：双方ウイング");
  }

  attacker.flags.attackedCountThisTurn += 1;
  state.battle.attackerUid=null;
  state.battle.attackerPos=null;
  renderAll();
}

async function breakShield(defSide, shieldIdx, attacker){
  const sh = state[defSide].shield[shieldIdx];
  if(!sh) return;
  state[defSide].shield[shieldIdx] = null;

  state[defSide].hand.push(sh);
  log(`シールド破壊：${sideName(defSide)} シールド${shieldIdx+1} → 手札へ`);

  attacker.flags.attackedCountThisTurn += 1;
  state.battle.attackerUid=null;
  state.battle.attackerPos=null;
  renderAll();
}

async function tryProducerSave(side, card){
  if(card.no!==12) return false;
  if(card.flags.producerSavedThisTurn) return false;
  card.flags.producerSavedThisTurn = true;
  return true;
}

/* ---------------- Equip stripping / send to wing ---------------- */
async function stripEquipIfAny(side, characterCard){
  if(!characterCard || !characterCard.equipUid) return;

  const p = state[side];
  const eq = findEquipInE(side, characterCard.equipUid);
  if(eq){
    const ePos = p.E.findIndex(x=>x && x.uid===eq.uid);
    if(ePos>=0) p.E[ePos]=null;
    eq.equippedToUid = null;
    moveToWing(side, eq);
    log(`装備剥がれ：${eq.name} → ${sideName(side)}ウイング`);
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

/* ---------------- Enemy picker for P1 ---------------- */
async function pickEnemyCharacter(enemySide, title, message){
  const cands = state[enemySide].C.filter(Boolean);
  if(!cands.length){ log("対象となる相手キャラがいません", "warn"); return null; }

  const pick = await askChoice(title, message, cands.map(c=>({
    label:`${c.name}`,
    sub:`ATK ${calcCurrentAtk(enemySide, c)}`,
    value:c.uid,
    card:c
  })));
  return state[enemySide].C.find(c=>c && c.uid===pick) || null;
}

/* ---------------- キャトルミューティレーション(17) ---------------- */
function hasCattleInHand_P1(){
  return state.P1.hand.some(c=>c && c.no===17);
}
function takeCattleFromHand_P1(){
  const idx = state.P1.hand.findIndex(c=>c && c.no===17);
  if(idx<0) return null;
  return state.P1.hand.splice(idx,1)[0];
}
async function tryCattleTrigger_P1(){
  if(state.gameOver) return;
  if(!hasCattleInHand_P1()){
    log("キャトル：条件成立（手札にないため不発）", "warn");
    return;
  }
  log("キャトル：発動可能（相手キャラ1体を手札に戻す）");

  const ok = await askYesNo("キャトルミューティレーション", "発動しますか？（相手キャラクター1体を手札に戻す）");
  if(!ok) return;

  const cattle = takeCattleFromHand_P1();
  if(!cattle){ log("キャトル：手札にありません（失敗）", "warn"); return; }

  const enemyChars = state.AI.C.filter(Boolean);
  if(!enemyChars.length){
    log("キャトル：相手キャラがいません（不発）", "warn");
    moveToWing("P1", cattle);
    return;
  }

  const pick = await askChoice("キャトル", "手札に戻す相手キャラクターを選択してください。", enemyChars.map(c=>({
    label:`${c.name}`,
    sub:`ATK ${calcCurrentAtk("AI", c)}`,
    value:c.uid,
    card:c
  })));

  const uid = String(pick);
  const pos = state.AI.C.findIndex(c=>c && c.uid===uid);
  if(pos<0){
    log("キャトル：対象が無効です", "warn");
    moveToWing("P1", cattle);
    return;
  }
  const target = state.AI.C[pos];
  await stripEquipIfAny("AI", target);
  state.AI.C[pos]=null;
  state.AI.hand.push(target);
  moveToWing("P1", cattle);
  log(`キャトル：${target.name} をAI手札へ戻した / キャトル→あなたウイング`);
  renderAll();
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

    if(eq.no===18){
      if(c.tags.includes("射手")){
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
}

/* ---------------- AI ---------------- */
function itemBonusForHost(item, host){
  if(!item || !host) return 0;
  let b = 0;
  if(item.no===18){
    b = 500 + (host.tags.includes("射手") ? 500 : 0);
  }else if(item.no===19){
    b = 500 + ((host.tags.includes("勇者") || host.tags.includes("剣士")) ? 500 : 0);
  }else if(item.no===20){
    b = 300 + (host.tags.includes("勇者") ? 500 : 0);
  }
  return b;
}

async function aiTakeTurn(){
  state.phase = "DRAW";
  draw("AI", 1);
  enforceHandLimit("AI");
  renderAll();
  await sleep(160);

  state.phase = "MAIN";
  renderAll();
  await sleep(140);

  let didSomething = false;

  didSomething = (await aiTryPlayEffect(2)) || didSomething;
  await sleep(90);
  didSomething = (await aiTryPlayEffect(16)) || didSomething;
  await sleep(90);

  didSomething = (await aiTryPlayBestItem()) || didSomething;
  await sleep(90);

  didSomething = (await aiTryPlayBestCharacter()) || didSomething;
  await sleep(90);

  if(state.AI.hand.length >= 6){
    didSomething = (await aiTryPlayBestCharacter()) || didSomething;
    await sleep(80);
    didSomething = (await aiTryPlayBestItem()) || didSomething;
    await sleep(80);
    didSomething = (await aiTryPlayEffect(16)) || didSomething;
    await sleep(80);
  }

  if(!didSomething){
    log("AI：有効なプレイが見つからず（このターンは展開なし）", "warn");
  }

  state.phase = "BATTLE";
  renderAll();
  await sleep(140);

  if(state.noBattleOnTurn1 && state.turn===1){
    log("AI：TURN1は攻撃禁止（BATTLEスキップ）");
  }else{
    await aiBattleBest();
  }

  state.phase = "END";
  enforceHandLimit("AI");
  clearEndTurnTemps("AI");
  renderAll();
  await sleep(120);

  log("AI：ターン終了");
}

async function aiTryPlayBestCharacter(){
  const p = state.AI;
  const empty = findEmptyIndex(p.C);
  if(empty<0) return false;

  const candidates = [];
  for(let i=0;i<p.hand.length;i++){
    const c = p.hand[i];
    if(c && isCharacter(c) && c.summon!=="kensan"){
      let s = (c.baseAtk||0) + (c.rank||0)*120;
      if(c.no===8) s += 260;
      if(c.no===4) s += 140;
      if(c.no===5) s += 220;
      candidates.push({i, c, s});
    }
  }
  if(!candidates.length) return false;

  candidates.sort((a,b)=> b.s - a.s);
  const pick = candidates[0];

  const c = p.hand.splice(pick.i,1)[0];
  p.C[empty]=c;
  log(`AI：登場 ${c.name}`);
  renderAll();
  await onEnterTriggers("AI", {zone:"C", pos:empty, card:c});
  return true;
}

async function aiTryPlayBestItem(){
  const p = state.AI;
  const ePos = findEmptyIndex(p.E);
  if(ePos<0) return false;

  const items = [];
  for(let i=0;i<p.hand.length;i++){
    const c = p.hand[i];
    if(c && isItem(c)) items.push({i, c});
  }
  if(!items.length) return false;

  const hosts = [];
  for(let i=0;i<3;i++){
    const h = p.C[i];
    if(h) hosts.push({i, h});
  }
  if(!hosts.length) return false;

  let best = null;
  for(const it of items){
    for(const hs of hosts){
      const bonus = itemBonusForHost(it.c, hs.h);
      const hostAtk = calcCurrentAtk("AI", hs.h);
      const score = bonus + hostAtk*0.2;
      if(!best || score > best.score){
        best = {itemIndex: it.i, item: it.c, hostPos: hs.i, host: hs.h, score};
      }
    }
  }
  if(!best) return false;

  const item = p.hand.splice(best.itemIndex,1)[0];
  p.E[ePos]=item;
  log(`AI：E配置（発動） ${item.name}`);
  renderAll();

  const react = await checkReactiveNegation("AI", item, {zone:"E", pos:ePos});
  if(react.negated){
    forceRemoveFromEIfPresent("AI", item, {zone:"E", pos:ePos});
    moveToWing("AI", item);
    log(`AI：無効化され ${item.name} → AIウイング`);
    renderAll();
    return true;
  }

  const host = p.C[best.hostPos];
  if(!host){
    p.E[ePos]=null;
    moveToWing("AI", item);
    log(`AI：装備先不在→ ${item.name} はウイングへ`, "warn");
    renderAll();
    return true;
  }

  if(host.equipUid){
    const old = findEquipInE("AI", host.equipUid);
    if(old){
      const oldPos = p.E.findIndex(x=>x && x.uid===old.uid);
      if(oldPos>=0) p.E[oldPos]=null;
      moveToWing("AI", old);
      log(`AI：装備更新 旧→ウイング ${old.name}`);
    }
    host.equipUid=null;
  }

  item._equipBonus = 0;
  item._equipBonus2 = 0;
  if(item.no===18){
    item._equipBonus = 500;
    if(host.tags.includes("射手")) item._equipBonus2 = 500;
  }else if(item.no===19){
    item._equipBonus = 500;
    if(host.tags.includes("勇者") || host.tags.includes("剣士")) item._equipBonus2 = 500;
  }else if(item.no===20){
    item._equipBonus = 300;
    if(host.tags.includes("勇者")) item._equipBonus2 = 500;
  }

  item.equippedToUid = host.uid;
  host.equipUid = item.uid;

  log(`AI：装備 ${item.name} → ${host.name}`);
  renderAll();
  return true;
}

async function aiTryPlayEffect(effectNo){
  const p = state.AI;
  const ePos = findEmptyIndex(p.E);
  if(ePos<0) return false;

  const idx = p.hand.findIndex(c=>c && c.no===effectNo && isEffect(c));
  if(idx<0) return false;

  if(effectNo===2){
    if(!p.C.some(c=>c && c.no===1)) return false;
    if(!state.P1.C.some(Boolean)) return false;
  }
  if(effectNo===16){
    if(!state.P1.C.some(Boolean)) return false;
  }

  const eff = p.hand.splice(idx,1)[0];
  p.E[ePos]=eff;
  log(`AI：E配置（発動） ${eff.name}`);
  renderAll();

  const react = await checkReactiveNegation("AI", eff, {zone:"E", pos:ePos});
  if(react.negated){
    forceRemoveFromEIfPresent("AI", eff, {zone:"E", pos:ePos});
    moveToWing("AI", eff);
    log(`AI：無効化され ${eff.name} → AIウイング`);
    renderAll();
    return true;
  }

  await resolveEffectFromE("AI", ePos, eff);
  renderAll();
  return true;
}

async function aiTryShireiEquip(side, cPos){
  const p = state[side];
  const card = p.C[cPos];
  if(!card || card.no!==11) return false;

  const others = [];
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(c && c.uid!==card.uid) others.push({i, c});
  }
  if(!others.length) return false;

  const ePos = findEmptyIndex(p.E);
  if(ePos<0) return false;

  let best = others[0];
  let bestAtk = calcCurrentAtk(side, best.c);
  for(const o of others){
    const a = calcCurrentAtk(side, o.c);
    if(a > bestAtk){ best=o; bestAtk=a; }
  }

  p.C[cPos] = null;
  p.E[ePos] = card;
  card.type = "item";
  card.equippedToUid = best.c.uid;
  card._equipBonus = 500;
  card._equipBonus2 = 0;
  best.c.equipUid = card.uid;

  log(`AI：司令 装備化 → ${best.c.name} ATK+500`);
  renderAll();
  return true;
}

async function aiBattleBest(){
  const p = state.AI;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;
    if(a.flags.attackedCountThisTurn>=1) continue;

    const best = pickBestAIAttackFor(a);
    if(!best) continue;

    if(best.type==="C"){
      const t = state.P1.C.find(c=>c && c.uid===best.uid);
      if(!t) continue;

      // ★ v50018: 桜蘭の陰陽術（P1→AI）
      await promptSakuraRanIfPossible_P1("AI", a, "P1", t);
      const aiTargetUid = aiShouldUseSakuraRan("AI", a, "P1", t);
      if(aiTargetUid) aiUseSakuraRanIfDecided(aiTargetUid);

      const atkA = calcCurrentAtk("AI", a);
      const atkD = calcCurrentAtk("P1", t);
      log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

      if(atkA > atkD){
        await sendCharacterToWing("P1", t.uid);
        log(`AI：撃破 ${t.name} → あなたウイング`);
        await tryCattleTrigger_P1();
      }else if(atkA < atkD){
        const saved = await tryProducerSave("AI", a);
        if(!saved){
          await sendCharacterToWing("AI", a.uid);
          log(`AI：敗北 ${a.name} → AIウイング`);
        }else{
          log(`AI：班目プロデューサー耐え（1回）`);
        }
      }else{
        const savedA = await tryProducerSave("AI", a);
        const savedD = await tryProducerSave("P1", t);
        if(!savedA) await sendCharacterToWing("AI", a.uid);
        if(!savedD){
          await sendCharacterToWing("P1", t.uid);
          await tryCattleTrigger_P1();
        }
        log("AI：相打ち");
      }

      a.flags.attackedCountThisTurn += 1;
      renderAll();
      await sleep(180);
      continue;
    }

    if(best.type==="S"){
      const sh = state.P1.shield[best.idx];
      if(!sh) continue;
      state.P1.shield[best.idx]=null;

      state.P1.hand.push(sh);
      log(`AI：シールド破壊（あなた）${best.idx+1} → あなた手札へ`);

      a.flags.attackedCountThisTurn += 1;
      renderAll();
      await sleep(150);
      continue;
    }

    if(best.type==="D"){
      await finishGame("AI");
      break;
    }
  }
}

function pickBestAIAttackFor(attacker){
  const atkA = calcCurrentAtk("AI", attacker);

  const enemyChars = state.P1.C.filter(Boolean);
  let best = null;

  for(const t of enemyChars){
    const atkD = calcCurrentAtk("P1", t);

    let score = 0;
    if(atkA > atkD){
      score += estimateRemoveValue(t) + 420;
      score += 220;
    }else if(atkA < atkD){
      const selfLoss = estimateRemoveValue(attacker) + 380;
      const canSave = (attacker.no===12 && !attacker.flags.producerSavedThisTurn);
      score -= canSave ? (selfLoss*0.35) : selfLoss;
      score -= 120;
    }else{
      score += estimateRemoveValue(t)*0.35;
      score -= estimateRemoveValue(attacker)*0.55;
    }

    if(t.no===8) score += 460;

    if(!best || score > best.score){
      best = {type:"C", uid:t.uid, score};
    }
  }

  if(!enemyChars.length){
    const shields = state.P1.shield.map((c, idx)=>({c, idx})).filter(x=>!!x.c);
    if(shields.length){
      const pick = shields[0];
      const score = 450 + countShields("P1")*60;
      if(!best || score > best.score){
        best = {type:"S", idx:pick.idx, score};
      }
    }else{
      best = {type:"D", score:999999};
    }
  }

  return best;
}

/* ---------------- Win / Result ---------------- */
async function finishGame(winnerSide){
  state.gameOver=true;
  renderAll();
  const text = (winnerSide==="P1") ? "YOU WIN！" : "YOU LOSE…";
  el.resultText.textContent = text;
  showModal("resultM");
}

/* ---------------- Bindings ---------------- */
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
    if(state.activeSide!=="P1" || state.gameOver) return;
    nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", ()=>{
    if(state.activeSide!=="P1" || state.gameOver) return;
    endTurn();
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
  log("v50018：完全版（丸ごと置換）");
  log("確認：TURN1 AI攻撃禁止 / Viewerボタン常時表示 / 反応UI改善 / シールド破壊→手札 / 攻撃済み可視化 / キャトル案内");
  log("追加：桜蘭の陰陽術（バトル時確認・ATK明示・枠外タップNOで続行）");
  log("追加：見参コストはキャラクターのみ（手札キャラ / ステージCキャラ）");
}

document.addEventListener("DOMContentLoaded", init);