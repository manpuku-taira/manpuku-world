/* =========================================================
  Manpuku World - v50010 (v50000 base)
  - ①司令の解釈修正（キャラ→登場時に装備化）
  - ②クルエラ：自分ターン毎に1回（リセット）
  - ③ウイング長押しで一覧表示／直前カードの表示
  - ④勝敗後：タイトルor次のゲーム
  - ⑤攻撃宣言直後に割り込み（手札エフェクト）
  - ⑥長押し反応 +0.2秒（420→620ms）
  - ATK確定値反映
  - 手形＝キャラクター扱い
  - 装備カードはE枠を占有し、キャラ破壊時に同時ウイングへ
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

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

  choiceM: $("choiceM"),
  choiceTitle: $("choiceTitle"),
  choiceBody: $("choiceBody"),

  logM: $("logM"),
  logBody: $("logBody"),

  settingsM: $("settingsM"),
  repoInput: $("repoInput"),
  btnRepoSave: $("btnRepoSave"),
  btnRescan: $("btnRescan"),
  btnClearCache: $("btnClearCache"),

  helpM: $("helpM"),

  resultM: $("resultM"),
  resultTitle: $("resultTitle"),
  resultText: $("resultText"),
  btnToTitle: $("btnToTitle"),
  btnNextGame: $("btnNextGame"),
};

const LONG_MS = 620; // ★長押し +0.2秒

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
  for(const it of LOGS.slice(0, 250)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind==="warn"?"warn":""}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

function bindLongPress(node, fn, ms=LONG_MS){
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

/* =========================================================
  Cards (No.01〜20) / ATK確定値反映
========================================================= */

const CardRegistry = [
  // 01
  { no:1,  name:"黒の魔法使いクルエラ", type:"character", rank:5, atk:2500,
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウイングからカード名に「黒魔法」を含むカード1枚を手札に加える。"
    )
  },
  // 02
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect", rank:0, atk:0,
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ステージに「クルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    )
  },
  // 03
  { no:3,  name:"トナカイの少女ニコラ", type:"character", rank:5, atk:2000,
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    )
  },
  // 04
  { no:4,  name:"聖ラウス", type:"character", rank:3, atk:1800,
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    )
  },
  // 05
  { no:5,  name:"統括AI タータ", type:"character", rank:4, atk:1000,
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    )
  },
  // 06
  { no:6,  name:"麗し令嬢エフィ", type:"character", rank:5, atk:2000,
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    )
  },
  // 07
  { no:7,  name:"狩樹 まひる", type:"character", rank:4, atk:1700,
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃する事ができる。\n" +
      "相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    )
  },
  // 08（★手形：キャラクター扱い）
  { no:8,  name:"組織の男 手形", type:"character", rank:4, atk:1900,
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText(
      "相手ターンに1度発動できる。相手が発動した効果を無効にする。"
    )
  },
  // 09
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character", rank:3, atk:1600,
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n" +
      "自分ステージに「小次郎」カードがある時、このカードのATK+500。"
    )
  },
  // 10
  { no:10,  name:"小次郎・孫悟空Lv17", type:"character", rank:3, atk:1500,
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n" +
      "自分ステージに「小太郎」カードがある時、このカードのATK+500。"
    )
  },
  // 11（★司令：キャラクター。登場時に自分を装備化できる）
  { no:11,  name:"司令", type:"character", rank:2, atk:1200,
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    special:"shirei_transform",
    text: normalizeText(
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"
    )
  },
  // 12
  { no:12,  name:"班目プロデューサー", type:"character", rank:2, atk:800,
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。")
  },
  // 13
  { no:13,  name:"超弩級砲塔列車スタマックス氏", type:"character", rank:1, atk:100,
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    )
  },
  // 14
  { no:14,  name:"記憶抹消", type:"effect", rank:0, atk:0,
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText(
      "相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。"
    )
  },
  // 15
  { no:15,  name:"桜蘭の陰陽術 - 闘 -", type:"effect", rank:0, atk:0,
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    text: normalizeText(
      "自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"
    )
  },
  // 16
  { no:16,  name:"力こそパワー！！", type:"effect", rank:0, atk:0,
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText(
      "自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"
    )
  },
  // 17
  { no:17,  name:"キャトルミューティレーション", type:"effect", rank:0, atk:0,
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"
    )
  },
  // 18
  { no:18,  name:"a-xブラスター01 -放射型-", type:"item", rank:0, atk:0,
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    )
  },
  // 19
  { no:19,  name:"-聖剣- アロングダイト", type:"item", rank:0, atk:0,
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    )
  },
  // 20
  { no:20,  name:"普通の棒", type:"item", rank:0, atk:0,
    tags:["木の棒","可能性"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\n" +
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    )
  },
];

function cloneCard(no){
  const c = CardRegistry.find(x=>x.no===no);
  return c ? JSON.parse(JSON.stringify(c)) : null;
}

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push(JSON.parse(JSON.stringify(c)));
    deck.push(JSON.parse(JSON.stringify(c)));
  }
  shuffle(deck);
  return deck; // 40枚
}

/* =========================================================
  State
========================================================= */

const state = {
  started:false,
  ended:false,

  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",
  normalSummonUsed:false,
  selectedHandIndex:null,

  lastWingCard: { P1:null, AI:null },

  // ターン毎リセット系
  perTurn: {
    P1:{ cruellaUsed:false, nicolaUsed:false, tartaUsed:false, tegataNegateUsed:false, producerSaved:false, attacks: {} },
    AI:{ cruellaUsed:false, nicolaUsed:false, tartaUsed:false, tegataNegateUsed:false, producerSaved:false, attacks: {} },
  },

  // バフ/デバフの「ターン終了まで」管理（簡易）
  tempAtkDelta: { P1:[0,0,0], AI:[0,0,0] },

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(card){ return card && card.type==="character"; }
function isEffect(card){ return card && card.type==="effect"; }
function isItem(card){ return card && card.type==="item"; }
function hasTag(card, tag){ return !!(card && card.tags && card.tags.includes(tag)); }
function hasNameIncludes(card, s){ return !!(card && card.name && card.name.includes(s)); }

/* =========================================================
  Modals
========================================================= */
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
  if(close==="result") hideModal("resultM");
});

/* Viewer */
function calcEquipBonusForChar(charCard){
  const equips = (charCard && charCard.equips) ? charCard.equips : [];
  return equips.reduce((s,e)=> s + (e.atkBonus||0), 0);
}
function currentAtkOfChar(side, idx){
  const c = state[side].C[idx];
  if(!c) return 0;
  const base = c.atk||0;
  const equip = calcEquipBonusForChar(c);
  const temp = (state.tempAtkDelta[side] && state.tempAtkDelta[side][idx]) ? state.tempAtkDelta[side][idx] : 0;
  // 小太郎/小次郎の相互+500
  let pair = 0;
  if(c.name.includes("小太郎") && state[side].C.some(x=>x && x.name.includes("小次郎"))) pair += 500;
  if(c.name.includes("小次郎") && state[side].C.some(x=>x && x.name.includes("小太郎"))) pair += 500;
  return base + equip + temp + pair;
}
function openViewer(card, extraText=""){
  el.viewerTitle.textContent = card.name;
  el.viewerImg.src = state.img.cardUrlByNo[pad2(card.no)] || "";
  el.viewerText.textContent = `${card.name}\nRANK ${card.rank||0} / ATK ${card.atk||0}\n\n${card.text||""}${extraText?("\n\n---\n"+extraText):""}`;
  showModal("viewerM");
}

/* Choice */
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
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = it.label;
    const s = document.createElement("div");
    s.className = "s";
    s.textContent = it.sub || "";
    meta.appendChild(t);
    if(s.textContent) meta.appendChild(s);

    row.appendChild(th);
    row.appendChild(meta);

    row.addEventListener("click", ()=>{
      hideModal("choiceM");
      if(choiceResolver){ const r = choiceResolver; choiceResolver=null; r(it.value); }
    }, {passive:true});

    if(it.card){
      bindLongPress(row, ()=> openViewer(it.card), LONG_MS);
    }
    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);
  showModal("choiceM");
  return new Promise((resolve)=>{ choiceResolver = resolve; });
}

async function askYesNo(title, message, yesLabel="はい", noLabel="いいえ"){
  const v = await askChoice(title, message, [
    { label: yesLabel, value:true },
    { label: noLabel, value:false },
  ]);
  return !!v;
}

/* =========================================================
  Images (same approach as v50000)
========================================================= */
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

  state.img.ready = true;
  renderAll();
}

/* =========================================================
  Render helpers
========================================================= */
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
  if(opts.boosted) slot.classList.add("boosted");

  if(card){
    slot.appendChild(faceForCard(card, !!opts.enemy));
    bindLongPress(slot, ()=> openViewer(card, opts.extraViewer||""), LONG_MS);
  }
  if(opts.badgeText){
    const b = document.createElement("div");
    b.className = "atkBadge" + (opts.badgePlus ? " plus" : "");
    b.textContent = opts.badgeText;
    slot.appendChild(b);
  }
  return slot;
}

/* =========================================================
  Core utilities
========================================================= */
function sideName(side){ return (side==="P1") ? "あなた" : "AI"; }

function allChars(side){
  return state[side].C.map((c,idx)=>({c,idx})).filter(x=>!!x.c);
}

function anyOnStageByName(side, nameIncludes){
  return state[side].C.some(c=>c && c.name.includes(nameIncludes));
}

function resetPerTurn(side){
  state.perTurn[side].cruellaUsed = false;
  state.perTurn[side].nicolaUsed = false;
  state.perTurn[side].tartaUsed = false;
  state.perTurn[side].tegataNegateUsed = false;
  state.perTurn[side].producerSaved = false;
  state.perTurn[side].attacks = { 0:0, 1:0, 2:0 };
  state.tempAtkDelta[side] = [0,0,0];
}

function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${sideName(side)}：デッキ切れ`, "warn");
      endGame(side==="P1" ? "AI" : "P1", "デッキ切れ");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}

function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    sendToWing(side, c, "手札上限");
  }
}

function sendToWing(side, card, reason=""){
  if(!card) return;
  state[side].wing.push(card);
  state.lastWingCard[side] = card;
  log(`${sideName(side)}：ウイングへ ${card.name}${reason?`（${reason}）`:""}`);
}

function removeCardFromE(side, eIdx){
  const c = state[side].E[eIdx];
  state[side].E[eIdx] = null;
  return c;
}

function removeCardFromC(side, cIdx){
  const c = state[side].C[cIdx];
  state[side].C[cIdx] = null;
  return c;
}

function findEmptyIndex(arr){
  for(let i=0;i<arr.length;i++) if(!arr[i]) return i;
  return -1;
}

function findCardInDeckOrWing(side, predicate){
  const p = state[side];
  const dIdx = p.deck.findIndex(predicate);
  if(dIdx>=0){
    return {from:"deck", idx:dIdx, card:p.deck[dIdx]};
  }
  const wIdx = p.wing.findIndex(predicate);
  if(wIdx>=0){
    return {from:"wing", idx:wIdx, card:p.wing[wIdx]};
  }
  return null;
}

function takeFromPile(side, from, idx){
  const p = state[side];
  if(from==="deck") return p.deck.splice(idx,1)[0];
  if(from==="wing") return p.wing.splice(idx,1)[0];
  return null;
}

function listCharactersForChoice(side, message){
  const cands = [];
  for(let i=0;i<3;i++){
    const c = state[side].C[i];
    if(c){
      cands.push({
        label:`C${i+1}：${c.name}`,
        sub:`現在ATK ${currentAtkOfChar(side,i)}`,
        value:i,
        card:c
      });
    }
  }
  return cands;
}

/* =========================================================
  Interrupt / Negate
========================================================= */
function hasTegataOnStage(side){
  return state[side].C.some(c=>c && c.name==="組織の男 手形");
}
function hasMemoryEraseInHand(side){
  return state[side].hand.some(c=>c && c.name==="記憶抹消");
}

async function tryNegateByDefender(defenderSide, attackerSide, sourceCardName){
  // 1) 手形（相手ターンに1度）
  if(state.activeSide === attackerSide && hasTegataOnStage(defenderSide) && !state.perTurn[defenderSide].tegataNegateUsed){
    const use = await askYesNo("無効化（手形）", `${sideName(attackerSide)}が効果を発動：${sourceCardName}\n「組織の男 手形」で無効にしますか？`);
    if(use){
      state.perTurn[defenderSide].tegataNegateUsed = true;
      log(`${sideName(defenderSide)}：手形で無効化`);
      return true;
    }
  }
  // 2) 記憶抹消（手札から）
  if(state.activeSide === attackerSide && hasMemoryEraseInHand(defenderSide)){
    const use = await askYesNo("記憶抹消", `${sideName(attackerSide)}が効果を発動：${sourceCardName}\n手札「記憶抹消」を発動しますか？`);
    if(use){
      // 手札から1枚消費してウイング、効果は無効
      const p = state[defenderSide];
      const idx = p.hand.findIndex(c=>c && c.name==="記憶抹消");
      const used = p.hand.splice(idx,1)[0];
      sendToWing(defenderSide, used, "発動後");
      log(`${sideName(defenderSide)}：記憶抹消で無効化`);
      return true;
    }
  }
  return false;
}

/* =========================================================
  Effects (activate immediately after placing)
========================================================= */
async function resolveOnEnter(side, cIdx, card){
  if(!card) return;

  // 04：聖ラウス（登場時サーチ：タグ クランプス）
  if(card.name==="聖ラウス"){
    const use = await askYesNo("登場時効果", "聖ラウス：タグ「クランプス」をサーチしますか？");
    if(!use) return;
    const found = findCardInDeckOrWing(side, x=>x && x.tags && x.tags.includes("クランプス"));
    if(!found){
      log(`${sideName(side)}：サーチ対象なし`, "warn");
      return;
    }
    const got = takeFromPile(side, found.from, found.idx);
    state[side].hand.push(got);
    log(`${sideName(side)}：サーチ ${got.name}`);
    return;
  }

  // 05：タータ（登場時 2ドロー）
  if(card.name==="統括AI タータ"){
    const use = await askYesNo("登場時効果", "統括AI タータ：2枚ドローしますか？");
    if(!use) return;
    draw(side, 2);
    log(`${sideName(side)}：2ドロー`);
    return;
  }

  // 11：司令（登場時：自身を装備化）
  if(card.name==="司令"){
    const use = await askYesNo("登場時効果", "司令：自身を「装備カード化」してキャラクター1体に装備しますか？");
    if(!use) return;

    // 装備先キャラ候補（自分ステージ）
    const cands = listCharactersForChoice(side, "");
    // 自分自身（司令）が今Cにいるので、装備先は「司令以外」もOKだが、ルール上「キャラ1体」なので司令自身も候補に含めてよい。
    const pick = await askChoice("装備先選択", "装備するキャラクターを選んでください。", cands);
    const targetIdx = Number(pick);

    // E枠空き必須（司令は装備化するとE枠を占有）
    const eIdx = findEmptyIndex(state[side].E);
    if(eIdx<0){
      log(`${sideName(side)}：E枠が空いていないため装備化できません`, "warn");
      return;
    }

    // 司令をCから外してEへ（装備として保持）
    const removed = removeCardFromC(side, cIdx);
    // removedは司令
    state[side].E[eIdx] = removed; // E枠を占有（見た目にも残る）

    // 対象へ装備付与
    const tgt = state[side].C[targetIdx];
    if(!tgt){
      // 対象がいない（競合など）→司令はEに残すが装備できないので戻す
      log(`${sideName(side)}：装備先が消失。司令はEに残ります`, "warn");
      return;
    }
    if(!tgt.equips) tgt.equips = [];
    tgt.equips.push({ cardNo:11, name:"司令", atkBonus:500, eSlot:eIdx });

    log(`${sideName(side)}：司令を装備化（E${eIdx+1}占有）→ ${tgt.name} ATK+500`);
    return;
  }
}

async function activateOncePerTurnAbilities(side){
  // クルエラ：自分ターンに1回（カード名に黒魔法含むサーチ）
  if(state.activeSide!==side || state.phase!=="MAIN") return;
  if(state.perTurn[side].cruellaUsed) return;
  const has = state[side].C.some(c=>c && c.name==="黒の魔法使いクルエラ");
  if(has){
    const use = await askYesNo("起動効果", "クルエラ：カード名に「黒魔法」を含むカードをサーチしますか？");
    if(use){
      const found = findCardInDeckOrWing(side, x=>x && x.name && x.name.includes("黒魔法"));
      if(!found){
        log(`${sideName(side)}：サーチ対象なし`, "warn");
      }else{
        const got = takeFromPile(side, found.from, found.idx);
        state[side].hand.push(got);
        state.perTurn[side].cruellaUsed = true;
        log(`${sideName(side)}：クルエラでサーチ ${got.name}`);
      }
      renderAll();
    }
  }

  // ニコラ：自分ターンに1回（自己+1000）
  if(state.perTurn[side].nicolaUsed) return;
  const nIdx = state[side].C.findIndex(c=>c && c.name==="トナカイの少女ニコラ");
  if(nIdx>=0){
    const use = await askYesNo("起動効果", "ニコラ：このターンATK+1000しますか？");
    if(use){
      state.tempAtkDelta[side][nIdx] += 1000;
      state.perTurn[side].nicolaUsed = true;
      log(`${sideName(side)}：ニコラ ATK+1000（ターン終了まで）`);
      renderAll();
    }
  }

  // タータ：自分ターンに1回（最大2枚捨て→BUGBUGを同枚数サーチ）
  if(state.perTurn[side].tartaUsed) return;
  const tIdx = state[side].C.findIndex(c=>c && c.name==="統括AI タータ");
  if(tIdx>=0){
    const use = await askYesNo("起動効果", "タータ：手札から最大2枚ウイング→同枚数BUGBUGカードをサーチしますか？");
    if(use){
      // 捨てる枚数選択
      const max = Math.min(2, state[side].hand.length);
      if(max<=0){ log(`${sideName(side)}：手札がありません`, "warn"); return; }

      const pickN = await askChoice("枚数選択", "ウイングへ送る枚数を選んでください。", [
        { label:"1枚", value:1 },
        ...(max>=2 ? [{ label:"2枚", value:2 }] : []),
        { label:"やめる", value:0 }
      ]);
      const n = Number(pickN);
      if(n<=0) return;

      // 手札から選択して送る
      for(let k=0;k<n;k++){
        const items = state[side].hand.map((c,i)=>({
          label:`手札：${c.name}`, sub:"", value:i, card:c
        }));
        const pi = Number(await askChoice("捨てるカード", `${k+1}/${n}：ウイングへ送るカードを選んでください。`, items));
        const moved = state[side].hand.splice(pi,1)[0];
        sendToWing(side, moved, "タータ効果");
      }

      // 同枚数だけ titleTag=BUGBUG西遊記 をデッキから手札へ（優先デッキ）
      for(let k=0;k<n;k++){
        const found = findCardInDeckOrWing(side, x=>x && x.titleTag==="BUGBUG西遊記");
        if(!found){
          log(`${sideName(side)}：BUGBUGサーチ対象なし`, "warn");
          break;
        }
        const got = takeFromPile(side, found.from, found.idx);
        state[side].hand.push(got);
        log(`${sideName(side)}：BUGBUGサーチ ${got.name}`);
      }
      state.perTurn[side].tartaUsed = true;
      renderAll();
    }
  }

  // 小太郎/小次郎：場にいる時、相方を手札から見参（簡易：自分ターンMAINで確認）
  await trySummonPartner(side);
}

async function trySummonPartner(side){
  if(state.activeSide!==side || state.phase!=="MAIN") return;

  const hasKotaro = state[side].C.some(c=>c && c.name.includes("小太郎"));
  const hasKojirou = state[side].C.some(c=>c && c.name.includes("小次郎"));

  // 小太郎がいる → 手札の小次郎を見参
  if(hasKotaro){
    const idx = state[side].hand.findIndex(c=>c && c.name.includes("小次郎"));
    if(idx>=0){
      const emptyC = findEmptyIndex(state[side].C);
      if(emptyC>=0){
        const use = await askYesNo("連携（見参）", "小太郎：手札の小次郎を見参させますか？");
        if(use){
          const card = state[side].hand.splice(idx,1)[0];
          state[side].C[emptyC] = card;
          log(`${sideName(side)}：見参 小次郎（連携）`);
          // 登場時効果があれば
          await resolveOnEnter(side, emptyC, card);
          renderAll();
        }
      }
    }
  }
  // 小次郎がいる → 手札の小太郎を見参
  if(hasKojirou){
    const idx = state[side].hand.findIndex(c=>c && c.name.includes("小太郎"));
    if(idx>=0){
      const emptyC = findEmptyIndex(state[side].C);
      if(emptyC>=0){
        const use = await askYesNo("連携（見参）", "小次郎：手札の小太郎を見参させますか？");
        if(use){
          const card = state[side].hand.splice(idx,1)[0];
          state[side].C[emptyC] = card;
          log(`${sideName(side)}：見参 小太郎（連携）`);
          await resolveOnEnter(side, emptyC, card);
          renderAll();
        }
      }
    }
  }
}

async function resolveEffectFromHand(side, card){
  const opp = (side==="P1") ? "AI" : "P1";

  // 発動を相手に無効化される可能性
  const negated = await tryNegateByDefender(opp, side, card.name);
  if(negated){
    sendToWing(side, card, "無効化された");
    return;
  }

  // 02 フレイムバレット（クルエラがいる時のみ）
  if(card.name==="黒魔法-フレイムバレット"){
    if(!state[side].C.some(c=>c && c.name==="黒の魔法使いクルエラ")){
      log(`${sideName(side)}：クルエラ不在のため発動できません`, "warn");
      sendToWing(side, card, "不発");
      return;
    }

    const mode = await askChoice("フレイムバレット", "効果を選んでください。", [
      { label:"ATKが1番高い敵キャラ1体をウイングへ", value:"highest" },
      { label:"rank4以下の敵キャラをすべてウイングへ", value:"rank4" },
      { label:"やめる（不発）", value:"cancel" },
    ]);
    if(mode==="cancel"){
      sendToWing(side, card, "不発");
      return;
    }

    if(mode==="highest"){
      const list = allChars(opp);
      if(!list.length){
        log("相手にキャラクターがいません", "warn");
      }else{
        let best = list[0];
        for(const it of list){
          if(currentAtkOfChar(opp, it.idx) > currentAtkOfChar(opp, best.idx)) best = it;
        }
        const removed = removeCardFromC(opp, best.idx);
        // 装備があれば剥がす
        await stripEquipsToWingIfAny(opp, best.idx, removed);
        sendToWing(opp, removed, "フレイムバレット");
      }
    }else if(mode==="rank4"){
      for(let i=0;i<3;i++){
        const c = state[opp].C[i];
        if(c && (c.rank||0) <= 4){
          const removed = removeCardFromC(opp, i);
          await stripEquipsToWingIfAny(opp, i, removed);
          sendToWing(opp, removed, "フレイムバレット");
        }
      }
    }
    sendToWing(side, card, "発動後");
    return;
  }

  // 14 記憶抹消：本来は相手の効果に反応だが、手動発動は不発扱い
  if(card.name==="記憶抹消"){
    log("記憶抹消：相手の効果に反応して発動します（手動は不発）", "warn");
    sendToWing(side, card, "不発");
    return;
  }

  // 15 闘：バトル中のみ（割り込みで呼ばれる）
  if(card.name==="桜蘭の陰陽術 - 闘 -"){
    log("闘：バトル中に割り込みで発動します（手動は不発）", "warn");
    sendToWing(side, card, "不発");
    return;
  }

  // 16 力こそパワー（自分ターンのみ）
  if(card.name==="力こそパワー！！"){
    if(state.activeSide!==side || state.phase!=="MAIN"){
      log("力こそパワー：自分ターンMAINのみ発動できます", "warn");
      sendToWing(side, card, "不発");
      return;
    }
    const list = allChars(opp);
    if(!list.length){
      log("相手キャラクターがいません", "warn");
      sendToWing(side, card, "発動後");
      return;
    }
    let low = list[0];
    for(const it of list){
      if(currentAtkOfChar(opp, it.idx) < currentAtkOfChar(opp, low.idx)) low = it;
    }
    const removed = removeCardFromC(opp, low.idx);
    await stripEquipsToWingIfAny(opp, low.idx, removed);
    sendToWing(opp, removed, "力こそパワー");
    sendToWing(side, card, "発動後");
    return;
  }

  // 17 キャトル：誘発専用
  if(card.name==="キャトルミューティレーション"){
    log("キャトルミューティレーション：バトル敗北時に誘発します（手動は不発）", "warn");
    sendToWing(side, card, "不発");
    return;
  }

  // デフォルト：発動してウイング
  sendToWing(side, card, "発動後");
}

/* アイテム装備（E枠を占有して残る） */
async function resolveItemEquip(side, itemCard, eIdx){
  const cands = listCharactersForChoice(side, "");
  if(!cands.length){
    log("装備先キャラクターがいません", "warn");
    return false;
  }
  const pick = await askChoice("装備先選択", "装備するキャラクターを選んでください。", cands);
  const targetIdx = Number(pick);
  const tgt = state[side].C[targetIdx];
  if(!tgt) return false;

  let bonus = 0;
  let special = null;

  if(itemCard.name==="a-xブラスター01 -放射型-"){
    bonus = 500;
    if(hasTag(tgt,"射手")){
      bonus += 500;
      special = "blaster_shooter";
    }
  }else if(itemCard.name==="-聖剣- アロングダイト"){
    bonus = 500;
    if(hasTag(tgt,"勇者") || hasTag(tgt,"剣士")){
      bonus += 500;
      special = "alongdite_draw";
    }
  }else if(itemCard.name==="普通の棒"){
    bonus = 300;
    if(hasTag(tgt,"勇者")){
      bonus += 500;
      special = "stick_hero";
    }
  }else{
    // 想定外
    bonus = 0;
  }

  if(!tgt.equips) tgt.equips = [];
  tgt.equips.push({ cardNo:itemCard.no, name:itemCard.name, atkBonus:bonus, special, eSlot:eIdx });

  log(`${sideName(side)}：装備 ${itemCard.name}（E${eIdx+1}占有）→ ${tgt.name} ATK+${bonus}`);
  return true;
}

async function stripEquipsToWingIfAny(side, cIdx, removedChar){
  if(!removedChar) return;

  const equips = removedChar.equips || [];
  if(!equips.length) return;

  // それぞれE枠からカードを外し、ウイングへ
  for(const eq of equips){
    const eSlot = eq.eSlot;
    if(typeof eSlot==="number" && state[side].E[eSlot]){
      const equipCard = removeCardFromE(side, eSlot);
      sendToWing(side, equipCard, "装備剥離");
    }
  }
  removedChar.equips = [];
}

/* =========================================================
  Battle
========================================================= */

async function openAttackWindow(attackerSide){
  // BATTLE開始時：攻撃するキャラを選ぶ（最低限）
  const items = [];
  for(let i=0;i<3;i++){
    const c = state[attackerSide].C[i];
    if(!c) continue;

    // まひる：装備中なら最大2回
    const maxAtk = (c.name==="狩樹 まひる" && calcEquipBonusForChar(c)>0) ? 2 : 1;
    const used = state.perTurn[attackerSide].attacks[i] || 0;
    if(used >= maxAtk) continue;

    items.push({
      label:`C${i+1}：${c.name}`,
      sub:`現在ATK ${currentAtkOfChar(attackerSide,i)} / 攻撃 ${used}/${maxAtk}`,
      value:i,
      card:c
    });
  }
  if(!items.length){
    log(`${sideName(attackerSide)}：攻撃できるキャラがいません`);
    return null;
  }
  const pick = await askChoice("攻撃キャラ選択", "攻撃するキャラクターを選んでください。", [
    ...items,
    { label:"攻撃しない", value:"cancel" }
  ]);
  if(pick==="cancel") return null;
  return Number(pick);
}

async function interruptAfterAttackDeclared(defenderSide, attackerSide){
  // ⑤：攻撃宣言直後に割り込み（手札の闘など）
  // 今回は「闘（No15）」を実装（バトル中手札発動）
  const hand = state[defenderSide].hand;

  const idxTou = hand.findIndex(c=>c && c.name==="桜蘭の陰陽術 - 闘 -");
  if(idxTou<0) return;

  const use = await askYesNo("割り込み", `${sideName(attackerSide)}が攻撃を宣言しました。\n手札「闘」を発動しますか？`);
  if(!use) return;

  const card = hand.splice(idxTou,1)[0];
  // 対象：自分キャラ1体に+1000（ターン終了まで）
  const cands = listCharactersForChoice(defenderSide, "");
  if(!cands.length){
    sendToWing(defenderSide, card, "不発");
    return;
  }
  const pick = Number(await askChoice("闘：対象選択", "ATK+1000するキャラクターを選んでください。", cands));
  state.tempAtkDelta[defenderSide][pick] += 1000;

  sendToWing(defenderSide, card, "発動後");
  log(`${sideName(defenderSide)}：闘 → C${pick+1} ATK+1000（ターン終了まで）`);
  renderAll();
}

async function doOneAttack(attackerSide, aIdx){
  const defenderSide = (attackerSide==="P1") ? "AI" : "P1";
  const a = state[attackerSide].C[aIdx];
  if(!a) return;

  // まひる：相手シールド0の時、直接攻撃できない
  const defenderShields = state[defenderSide].shield.filter(Boolean).length;
  const canDirect = (defenderShields===0);
  const mahiruNoDirect = (a.name==="狩樹 まひる" && canDirect);

  // 攻撃対象選択：敵キャラ or シールド/ダイレクト
  const targets = [];

  // 敵キャラ
  for(let i=0;i<3;i++){
    const c = state[defenderSide].C[i];
    if(c){
      targets.push({
        label:`敵C${i+1}：${c.name}`,
        sub:`現在ATK ${currentAtkOfChar(defenderSide,i)}`,
        value:`C:${i}`,
        card:c
      });
    }
  }

  // シールドが残っていればシールド攻撃
  if(defenderShields>0){
    targets.push({ label:"相手シールドを攻撃", sub:`残り${defenderShields}`, value:"SHIELD" });
  }else{
    // ダイレクト
    if(!mahiruNoDirect){
      targets.push({ label:"ダイレクトアタック", sub:"勝敗が決まります", value:"DIRECT" });
    }else{
      // まひる制限
      targets.push({ label:"（まひるはシールド0で直接攻撃できない）", sub:"敵キャラを攻撃してください", value:"NONE" });
    }
  }

  const pick = await askChoice("攻撃対象", "攻撃対象を選んでください。", targets);
  if(pick==="NONE") return;

  // 宣言直後：割り込み
  await interruptAfterAttackDeclared(defenderSide, attackerSide);

  const atkA = currentAtkOfChar(attackerSide, aIdx);

  if(pick==="SHIELD"){
    // シールド1枚破壊 → ウイングへ
    const sIdx = state[defenderSide].shield.findIndex(Boolean);
    if(sIdx>=0){
      const broken = state[defenderSide].shield[sIdx];
      state[defenderSide].shield[sIdx] = null;
      sendToWing(defenderSide, broken, "シールド破壊");
      log(`${sideName(attackerSide)}：シールドを破壊`);
    }
    renderAll();
    return;
  }

  if(pick==="DIRECT"){
    endGame(attackerSide, "ダイレクトアタック");
    return;
  }

  if(String(pick).startsWith("C:")){
    const dIdx = Number(String(pick).split(":")[1]);
    const d = state[defenderSide].C[dIdx];
    if(!d) return;

    const atkD = currentAtkOfChar(defenderSide, dIdx);

    // バトル解決
    if(atkA > atkD){
      // 防御側破壊
      const removed = removeCardFromC(defenderSide, dIdx);
      // 装備剥離
      await stripEquipsToWingIfAny(defenderSide, dIdx, removed);
      sendToWing(defenderSide, removed, "バトル敗北");

      // アロングダイト（条件付き）のドロー：装備側が敵をウイングへ送った時
      const aChar = state[attackerSide].C[aIdx];
      if(aChar && aChar.equips && aChar.equips.some(e=>e && e.special==="alongdite_draw")){
        draw(attackerSide, 1);
        log(`${sideName(attackerSide)}：アロングダイト→1ドロー`);
      }
    }else if(atkA < atkD){
      // 攻撃側破壊（ただし班目Pは1ターンに1度バトル破壊されない）
      const aCard = state[attackerSide].C[aIdx];
      if(aCard && aCard.name==="班目プロデューサー" && !state.perTurn[attackerSide].producerSaved){
        state.perTurn[attackerSide].producerSaved = true;
        log(`${sideName(attackerSide)}：班目P（1ターンに1度）でバトル破壊を無効`);
      }else{
        const removed = removeCardFromC(attackerSide, aIdx);
        await stripEquipsToWingIfAny(attackerSide, aIdx, removed);
        sendToWing(attackerSide, removed, "バトル敗北");

        // 17 キャトル：自分キャラがバトルでウイングに送られた時（手札から）
        await tryCattleMutilation(attackerSide, defenderSide);
      }
    }else{
      // 相打ち（班目Pの保護は各自に適用）
      // 防御側
      const dCard = state[defenderSide].C[dIdx];
      if(dCard && dCard.name==="班目プロデューサー" && !state.perTurn[defenderSide].producerSaved){
        state.perTurn[defenderSide].producerSaved = true;
        log(`${sideName(defenderSide)}：班目Pで相打ち破壊を無効`);
      }else{
        const removedD = removeCardFromC(defenderSide, dIdx);
        await stripEquipsToWingIfAny(defenderSide, dIdx, removedD);
        sendToWing(defenderSide, removedD, "相打ち");
      }
      // 攻撃側
      const aCard = state[attackerSide].C[aIdx];
      if(aCard && aCard.name==="班目プロデューサー" && !state.perTurn[attackerSide].producerSaved){
        state.perTurn[attackerSide].producerSaved = true;
        log(`${sideName(attackerSide)}：班目Pで相打ち破壊を無効`);
      }else{
        const removedA = removeCardFromC(attackerSide, aIdx);
        await stripEquipsToWingIfAny(attackerSide, aIdx, removedA);
        sendToWing(attackerSide, removedA, "相打ち");
        await tryCattleMutilation(attackerSide, defenderSide);
      }
    }

    renderAll();
    return;
  }
}

async function tryCattleMutilation(loserSide, winnerSide){
  // 17：自分キャラがバトルでウイングに送られた時（手札）
  const p = state[loserSide];
  const idx = p.hand.findIndex(c=>c && c.name==="キャトルミューティレーション");
  if(idx<0) return;

  const use = await askYesNo("誘発", "キャトルミューティレーションを発動しますか？（相手キャラ1体を手札に戻す）");
  if(!use) return;

  const card = p.hand.splice(idx,1)[0];

  // 対象：相手キャラ
  const cands = [];
  for(let i=0;i<3;i++){
    const c = state[winnerSide].C[i];
    if(c){
      cands.push({
        label:`相手C${i+1}：${c.name}`,
        sub:`現在ATK ${currentAtkOfChar(winnerSide,i)}`,
        value:i,
        card:c
      });
    }
  }
  if(!cands.length){
    sendToWing(loserSide, card, "不発");
    return;
  }
  const pick = Number(await askChoice("戻す対象", "手札に戻す相手キャラを選択してください。", cands));
  const removed = removeCardFromC(winnerSide, pick);
  // 装備剥離（装備はウイングへ）
  await stripEquipsToWingIfAny(winnerSide, pick, removed);
  state[winnerSide].hand.push(removed);
  log(`${sideName(loserSide)}：キャトル→相手キャラを手札へ戻す`);

  sendToWing(loserSide, card, "発動後");
}

function endGame(winnerSide, reason){
  if(state.ended) return;
  state.ended = true;
  const winName = (winnerSide==="P1") ? "あなたの勝ち" : "相手の勝ち";
  el.resultTitle.textContent = "RESULT";
  el.resultText.textContent = `${winName}\n（理由：${reason}）`;
  showModal("resultM");
  log(`ゲーム終了：${winName}（${reason}）`);
  renderAll();
}

/* =========================================================
  Click handlers (P1)
========================================================= */
async function onClickYourC(pos){
  if(state.ended) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];

  if(!isCharacter(card)){
    log("Cにはキャラクターのみ置けます", "warn");
    return;
  }

  // 見参のみ：空きCを長押しで処理
  if(card.summon==="kensan"){
    log("このカードは登場できません。空きCを長押しして見参してください", "warn");
    return;
  }
  if(state.normalSummonUsed){
    log("登場（通常）はターン1回です", "warn");
    return;
  }

  state.P1.C[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  state.normalSummonUsed=true;

  log(`登場：${card.name}`);
  renderAll();

  // 登場時効果：即確認UI
  await resolveOnEnter("P1", pos, card);

  renderAll();
}

async function onLongPressEmptyCForKensan(pos){
  if(state.ended) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card) || card.summon!=="kensan") return;

  // cost candidates: hand except selected, plus stage C/E
  const cands = [];
  for(let i=0;i<state.P1.hand.length;i++){
    if(i===state.selectedHandIndex) continue;
    cands.push({from:"hand", idx:i, card:state.P1.hand[i], label:`手札：${state.P1.hand[i].name}`});
  }
  for(let i=0;i<3;i++){
    if(state.P1.C[i]) cands.push({from:"C", idx:i, card:state.P1.C[i], label:`C${i+1}：${state.P1.C[i].name}`});
    if(state.P1.E[i]) cands.push({from:"E", idx:i, card:state.P1.E[i], label:`E${i+1}：${state.P1.E[i].name}`});
  }
  if(!cands.length){ log("見参：コスト候補なし", "warn"); return; }

  const pick = await askChoice("見参（コスト）", "ウイングへ送るカードを1枚選んでください。", cands.map(x=>({
    label:x.label, value:`${x.from}:${x.idx}`, card:x.card
  })));

  const [from, idxStr] = String(pick).split(":");
  const idx = Number(idxStr);

  if(from==="hand"){
    const moved = state.P1.hand.splice(idx,1)[0];
    sendToWing("P1", moved, "見参コスト");
    if(idx < state.selectedHandIndex) state.selectedHandIndex -= 1;
  }else if(from==="C"){
    const moved = removeCardFromC("P1", idx);
    // 装備剥離
    await stripEquipsToWingIfAny("P1", idx, moved);
    sendToWing("P1", moved, "見参コスト");
  }else if(from==="E"){
    const moved = removeCardFromE("P1", idx);
    sendToWing("P1", moved, "見参コスト");
  }

  const placed = state.P1.hand.splice(state.selectedHandIndex,1)[0];
  state.P1.C[pos]=placed;
  state.selectedHandIndex=null;

  log(`見参：${placed.name}`);
  renderAll();

  // 見参時も「登場時」扱いの効果を確認（司令は登場できないが、他も入る）
  await resolveOnEnter("P1", pos, placed);
  renderAll();
}

async function onClickYourE(pos){
  if(state.ended) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];

  if(isCharacter(card)){
    log("Eにはエフェクト/アイテムのみ置けます", "warn");
    return;
  }

  // Eに置く（見た目として残す／エフェクトは解決後ウイングへ）
  state.P1.E[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;

  renderAll();

  // ★発動した瞬間に選択を出す（ユーザー操作ストレス軽減）
  if(isEffect(card)){
    log(`発動：${card.name}`);
    await resolveEffectFromHand("P1", card);
    // E枠から除去（発動後はウイングへ行っている）
    // resolveEffectFromHand内でsendToWing済みなので、E枠は空にする
    state.P1.E[pos]=null;
    renderAll();
    return;
  }

  if(isItem(card)){
    log(`装備：${card.name}`);
    const ok = await resolveItemEquip("P1", card, pos);
    if(!ok){
      // 装備失敗→ウイングへ（カードは場に残せない）
      state.P1.E[pos]=null;
      sendToWing("P1", card, "装備失敗");
    }
    renderAll();
    return;
  }
}

/* =========================================================
  Wing viewer (③)
========================================================= */
async function openPileViewer(side, pileKey){
  const p = state[side];
  const arr = (pileKey==="wing") ? p.wing : (pileKey==="outside") ? p.outside : p.deck;

  if(pileKey!=="wing"){
    log("この山札は一覧表示を行いません（ウイングのみ）");
    return;
  }

  if(!arr.length){
    await askChoice("ウイング", "（ウイングは空です）", [{label:"閉じる", value:"close"}]);
    return;
  }

  // 直前カード表示（可能）
  const last = state.lastWingCard[side];
  const headMsg = last ? `直前：${last.name}` : "直前：—";

  const items = arr.slice().reverse().slice(0, 25).map((c,idx)=>({
    label:`${c.name}`,
    sub:`（ウイング）`,
    value:`view:${arr.length-1-idx}`,
    card:c
  }));

  const pick = await askChoice(`${sideName(side)}のウイング`, headMsg + "\n（最新25枚まで表示）", [
    ...items,
    { label:"閉じる", value:"close" }
  ]);
  if(String(pick).startsWith("view:")){
    const i = Number(String(pick).split(":")[1]);
    const c = arr[i];
    if(c) openViewer(c);
  }
}

/* =========================================================
  Rendering
========================================================= */
function updateHUD(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  el.chipActive.textContent = (state.activeSide==="P1") ? "YOUR TURN" : "ENEMY TURN";
  el.btnNext.disabled = (state.activeSide!=="P1" || state.ended);
  el.btnEnd.disabled  = (state.activeSide!=="P1" || state.ended);
  el.btnNext.style.opacity = (state.activeSide==="P1" && !state.ended) ? "1" : ".45";
  el.btnEnd.style.opacity  = (state.activeSide==="P1" && !state.ended) ? "1" : ".45";
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

function renderZones(){
  // enemy E
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.E[i];
    el.aiE.appendChild(makeSlot(c, {enemy:true}));
  }

  // enemy C
  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    let badgeText = "";
    let badgePlus = false;
    let boosted = false;
    if(c){
      const cur = currentAtkOfChar("AI", i);
      if(cur !== (c.atk||0)){
        badgeText = `${cur}`;
        badgePlus = true;
        boosted = true;
      }
    }
    el.aiC.appendChild(makeSlot(c, {enemy:true, badgeText, badgePlus, boosted}));
  }

  // your C
  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);

    let badgeText = "";
    let badgePlus = false;
    let boosted = false;
    let extraViewer = "";

    if(c){
      const cur = currentAtkOfChar("P1", i);
      const base = c.atk||0;
      const equip = calcEquipBonusForChar(c);
      const temp = state.tempAtkDelta.P1[i] || 0;
      if(cur !== base){
        badgeText = `${cur}`;
        badgePlus = true;
        boosted = true;
      }
      const eqs = (c.equips||[]).map(e=>`・${e.name} ATK+${e.atkBonus||0}`).join("\n");
      extraViewer =
        `【現在ATK】${cur}\n` +
        `（内訳）base ${base} / 装備+${equip} / 一時+${temp}` +
        (eqs?`\n\n【装備】\n${eqs}`:"");
    }

    const slot = makeSlot(c, {glow, badgeText, badgePlus, boosted, extraViewer});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c) bindLongPress(slot, ()=> onLongPressEmptyCForKensan(i), LONG_MS);
    el.pC.appendChild(slot);
  }

  // your E
  el.pE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {glow});
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

    const playable = (state.activeSide==="P1" && state.phase==="MAIN" && !state.ended);
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1" || state.ended) return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      renderAll();
    }, {passive:true});
    bindLongPress(h, ()=> openViewer(c), LONG_MS);
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

    const shieldCount = state[side].shield.filter(Boolean).length;
    const direct = (shieldCount===0);
    cardNode.classList.toggle("direct", direct);

    if(exists && state.img.backUrl){
      cardNode.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      cardNode.style.backgroundImage = "";
    }

    // 自分のシールド領域：0ならタップでダイレクト防止ではなく、攻撃側で選択するのでここでは説明のみ
    cardNode.onclick = async ()=>{
      if(state.ended) return;
      if(side==="AI"){
        // 敵シールドは直接操作しない
        return;
      }
      // P1側のシールド：情報表示（DIRECT表示で分かりやすくしたのでメッセージは控えめ）
      if(shieldCount===0){
        log("あなたのシールドは0です（DIRECT表示）");
      }else{
        log(`あなたのシールド残り：${shieldCount}`);
      }
    };
  });
}

function renderPiles(){
  // deckだけ裏面表示
  document.querySelectorAll(".pile").forEach((p)=>{
    const key = p.getAttribute("data-pile");
    const card = p.querySelector(".pileCard");
    const isDeck = (key==="AI_DECK" || key==="P_DECK");
    if(isDeck && state.img.backUrl){
      card.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      card.style.backgroundImage = "";
    }
  });
}

function renderAll(){
  updateHUD();
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
  renderPiles();
}

/* =========================================================
  Turn controls
========================================================= */
async function nextPhase(){
  if(state.ended) return;

  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    resetPerTurn(state.activeSide);
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${sideName(state.activeSide)}：ドロー +1`);
  }
  if(next==="MAIN"){
    // 起動効果の自動確認（ストレス軽減）
    await activateOncePerTurnAbilities(state.activeSide);
  }
  if(next==="BATTLE"){
    if(state.activeSide==="P1"){
      const aIdx = await openAttackWindow("P1");
      if(aIdx!=null){
        state.perTurn.P1.attacks[aIdx] = (state.perTurn.P1.attacks[aIdx]||0) + 1;
        await doOneAttack("P1", aIdx);
      }
    }else{
      await aiBattle();
    }
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
    // ターン終了で一時バフ/デバフは消える（tempAtkDeltaを次ターンSTARTでリセット）
  }
  renderAll();
}

async function endTurn(){
  if(state.ended) return;

  enforceHandLimit(state.activeSide);

  if(state.activeSide==="P1"){
    state.activeSide="AI";
    state.phase="START";
    resetPerTurn("AI");
    renderAll();

    await runAITurn();

    // 戻す
    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    resetPerTurn("P1");
    log(`TURN ${state.turn} あなたのターン`);
    renderAll();
  }
}

/* =========================================================
  AI (最低限：配置→装備→攻撃)
========================================================= */
function aiPickHandCard(predicate){
  const h = state.AI.hand;
  const idx = h.findIndex(predicate);
  if(idx<0) return null;
  return { idx, card:h[idx] };
}

async function runAITurn(){
  if(state.ended) return;

  // START → DRAW
  state.phase="DRAW";
  draw("AI", 1);
  log("AI：ドロー +1");
  renderAll();
  await sleep(250);

  // MAIN
  state.phase="MAIN";
  renderAll();
  await sleep(200);

  // ①：相手AIが「司令」を正しく処理（登場→効果）
  // まずキャラ登場（通常1回）
  if(!state.perTurn.AI.normalSummonUsed){
    const emptyC = findEmptyIndex(state.AI.C);
    if(emptyC>=0){
      // 登場可能キャラ（kensan不可）
      const pick = aiPickHandCard(c=>isCharacter(c) && c.summon!=="kensan");
      if(pick){
        const {idx, card} = pick;
        state.AI.hand.splice(idx,1);
        state.AI.C[emptyC]=card;
        state.perTurn.AI.normalSummonUsed = true; // AI専用
        log(`AI：登場 ${card.name}`);
        renderAll();
        await resolveOnEnter("AI", emptyC, card);
        renderAll();
        await sleep(250);
      }
    }
  }

  // 見参（kensan）も最低限（コストがあれば）
  for(let loop=0; loop<2; loop++){
    const emptyC = findEmptyIndex(state.AI.C);
    if(emptyC<0) break;
    const k = aiPickHandCard(c=>isCharacter(c) && c.summon==="kensan");
    if(!k) break;

    // コスト候補：手札の別カード優先
    let cost = null;
    const h = state.AI.hand;
    const costIdx = h.findIndex((c,i)=> i!==k.idx);
    if(costIdx>=0){
      cost = h.splice(costIdx,1)[0];
      sendToWing("AI", cost, "見参コスト");
      if(costIdx < k.idx) k.idx -= 1;
    }else{
      // 場からでも良い
      const cidx = state.AI.C.findIndex(Boolean);
      if(cidx>=0){
        const moved = removeCardFromC("AI", cidx);
        await stripEquipsToWingIfAny("AI", cidx, moved);
        sendToWing("AI", moved, "見参コスト");
      }else{
        break;
      }
    }
    const placed = state.AI.hand.splice(k.idx,1)[0];
    state.AI.C[emptyC]=placed;
    log(`AI：見参 ${placed.name}`);
    await resolveOnEnter("AI", emptyC, placed);
    renderAll();
    await sleep(250);
  }

  // 起動効果（クルエラ/ニコラ/タータ/連携）
  await activateOncePerTurnAbilities("AI");
  renderAll();
  await sleep(200);

  // アイテムを装備（E枠空きがあり、キャラがいる時）
  const emptyE = findEmptyIndex(state.AI.E);
  if(emptyE>=0 && state.AI.C.some(Boolean)){
    const pickItem = aiPickHandCard(c=>isItem(c));
    if(pickItem){
      const card = state.AI.hand.splice(pickItem.idx,1)[0];
      state.AI.E[emptyE]=card;
      log(`AI：装備 ${card.name}`);
      // 装備先：ATKが高いキャラ
      let bestIdx = -1;
      for(let i=0;i<3;i++){
        if(state.AI.C[i]){
          if(bestIdx<0 || currentAtkOfChar("AI",i) > currentAtkOfChar("AI",bestIdx)) bestIdx=i;
        }
      }
      // resolveItemEquip は選択UIが出るので、AI用に簡易付与
      const tgt = state.AI.C[bestIdx];
      let bonus=0, special=null;
      if(card.name==="a-xブラスター01 -放射型-"){
        bonus=500; if(hasTag(tgt,"射手")){ bonus+=500; special="blaster_shooter"; }
      }else if(card.name==="-聖剣- アロングダイト"){
        bonus=500; if(hasTag(tgt,"勇者")||hasTag(tgt,"剣士")){ bonus+=500; special="alongdite_draw"; }
      }else if(card.name==="普通の棒"){
        bonus=300; if(hasTag(tgt,"勇者")){ bonus+=500; special="stick_hero"; }
      }
      if(!tgt.equips) tgt.equips=[];
      tgt.equips.push({ cardNo:card.no, name:card.name, atkBonus:bonus, special, eSlot:emptyE });
      log(`AI：${tgt.name} ATK+${bonus}`);
      renderAll();
      await sleep(250);
    }
  }

  // 効果カード（簡易：力こそパワーがあれば使う）
  const idxP = state.AI.hand.findIndex(c=>c && c.name==="力こそパワー！！");
  if(idxP>=0 && state.P1.C.some(Boolean)){
    const card = state.AI.hand.splice(idxP,1)[0];
    // E枠は使わず直接解決（UI簡略）
    log("AI：力こそパワー！！");
    await resolveEffectFromHand("AI", card);
    renderAll();
    await sleep(250);
  }

  // BATTLE
  state.phase="BATTLE";
  renderAll();
  await sleep(200);
  await aiBattle();

  // END
  state.phase="END";
  enforceHandLimit("AI");
  renderAll();
  await sleep(150);
}

async function aiBattle(){
  if(state.ended) return;

  // 攻撃できるキャラがいれば、最もATKの高いキャラで攻撃
  const list = allChars("AI");
  if(!list.length){
    log("AI：攻撃なし");
    return;
  }
  let best = list[0];
  for(const it of list){
    if(currentAtkOfChar("AI", it.idx) > currentAtkOfChar("AI", best.idx)) best = it;
  }

  // まひる制限はAI側でも同様
  state.perTurn.AI.attacks[best.idx] = (state.perTurn.AI.attacks[best.idx]||0) + 1;
  await doOneAttack("AI", best.idx);
}

/* =========================================================
  Start game
========================================================= */
function startGame(){
  state.ended=false;

  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;

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

  state.lastWingCard = { P1:null, AI:null };

  state.firstSide = (Math.random()<0.5) ? "P1" : "AI";
  state.activeSide = state.firstSide;

  resetPerTurn("P1");
  resetPerTurn("AI");

  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log(`ゲーム開始：40枚デッキ / 初手4 / シールド3 / ${el.firstInfo.textContent}`);

  renderAll();

  // 先攻がAIなら即進行（フリーズ回避）
  if(state.activeSide==="AI"){
    (async ()=>{
      await sleep(250);
      await runAITurn();
      // AIターン終了後にあなたへ
      state.activeSide="P1";
      state.turn=2;
      state.phase="START";
      resetPerTurn("P1");
      log(`TURN ${state.turn} あなたのターン`);
      renderAll();
    })();
  }
}

/* =========================================================
  Bindings
========================================================= */
function bindStart(){
  el.boot.textContent="JS: OK";
  const go = ()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    startGame();
  };
  el.btnStart.addEventListener("click", go, {passive:true});
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
  }, LONG_MS);

  el.btnNext.addEventListener("click", async ()=>{
    if(state.activeSide!=="P1") return;
    await nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", async ()=>{
    if(state.activeSide!=="P1") return;
    await endTurn();
  }, {passive:true});

  // Result buttons
  el.btnToTitle.addEventListener("click", ()=>{
    hideModal("resultM");
    state.started=false;
    state.ended=false;
    el.game.classList.remove("active");
    el.title.classList.add("active");
    log("タイトルへ戻りました");
  }, {passive:true});

  el.btnNextGame.addEventListener("click", ()=>{
    hideModal("resultM");
    startGame();
  }, {passive:true});

  // Piles: wing long press viewer
  document.querySelectorAll(".pile").forEach((p)=>{
    const clickKey = p.getAttribute("data-click");
    if(!clickKey) return;

    if(clickKey==="pWing"){
      bindLongPress(p, ()=> openPileViewer("P1","wing"), LONG_MS);
    }
    if(clickKey==="aiWing"){
      bindLongPress(p, ()=> openPileViewer("AI","wing"), LONG_MS);
    }

    p.addEventListener("click", ()=>{
      // クリックはログ表示（誤タップでも壊れない）
      if(clickKey==="pWing") log("P1：ウイング（長押しで一覧）");
      if(clickKey==="aiWing") log("AI：ウイング（長押しで一覧）");
      if(clickKey==="pDeck") log("P1：デッキ");
      if(clickKey==="aiDeck") log("AI：デッキ");
      if(clickKey==="pOutside") log("P1：アウトサイド");
      if(clickKey==="aiOutside") log("AI：アウトサイド");
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

/* =========================================================
  init
========================================================= */
async function init(){
  bindStart();
  bindHUD();
  bindSettings();

  const cache = getCache();
  if(cache && cache.repo===getRepo()){
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent="JS: OK（準備完了）";
  log("v50010：完成版ベース（司令/手形/AI/割り込み/勝敗/ウイング閲覧/ATK確定）");
}

document.addEventListener("DOMContentLoaded", init);