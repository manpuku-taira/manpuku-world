/* =========================================================
  Manpuku World - v50001
  - v50000 layout keep
  - enemy lane order fixed (SHIELD->E->C)
  - field bg scaled down
  - Wing/Outside pile : no back image
  - 40-card deck (20x2)
  - Effect: auto resolve + send to Wing
  - Item: equip flow + auto send when equipped char loses
  - On-enter optional prompts (summon / kensan)
  - FlameBullet: resolve choice immediately on activation
  - Direct Attack: shield 0 => show DIRECT icon on shield area
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
  for(const it of LOGS.slice(0, 200)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind==="warn"?"warn":""}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

function bindLongPress(node, fn, ms=420){
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

/* ---------------- Card helpers ---------------- */
function mkCard(def){
  // runtime fields:
  // - uid: unique per copy
  // - buffs: [{atk:+1000, untilTurn: N}]
  // - items: [itemCard, ...]
  // - flags: { usedThisTurn: {key:true}, ... }
  return {
    ...def,
    uid: `${def.no}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
    buffs: [],
    items: [],
    flags: { usedThisTurn:{} },
  };
}
function hasTag(card, tag){ return !!card && Array.isArray(card.tags) && card.tags.includes(tag); }
function titleIs(card, t){ return !!card && (card.titleTag || "") === t; }
function isCharacter(card){ return card && card.type==="character"; }
function isEffect(card){ return card && card.type==="effect"; }
function isItem(card){ return card && card.type==="item"; }
function isEffectOrItem(card){ return card && card.type!=="character"; }
function currentAtk(card){
  if(!card) return 0;
  let base = Number(card.atk||0);

  // item bonuses stored as item.bonusAtk
  for(const it of (card.items||[])){
    base += Number(it.bonusAtk||0);
  }

  // buffs active this turn
  for(const b of (card.buffs||[])){
    if(b.untilTurn >= state.turn) base += Number(b.atk||0);
  }
  return base;
}
function markUsedThisTurn(card, key){
  if(!card) return;
  card.flags.usedThisTurn[key] = true;
}
function usedThisTurn(card, key){
  return !!(card && card.flags && card.flags.usedThisTurn && card.flags.usedThisTurn[key]);
}
function resetUsedThisTurn(side){
  const p = state[side];
  for(const c of [...p.C, ...p.E].filter(Boolean)){
    c.flags.usedThisTurn = {};
  }
}

/* ---------------- Cards (No.01-20 fixed) ----------------
   ※ Rank/ATK：ご主人様が未提示のものは、表示・戦闘のための暫定値を入れています。
   もし正式ATK/RANKがあるカードがあれば、その値へ差し替え可能です（ロジックは保持されます）。
---------------------------------------------------------- */
const CardRegistry = [
  // 01
  { no:1,  name:"黒の魔法使いクルエラ", type:"character",
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    summon:"kensan", rank:5, atk:2500,
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウイングから「黒魔法」を含むカード名のカード1枚を手札に加える。"
    ),
  },
  // 02
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect",
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    rank:0, atk:0,
    text: normalizeText(
      "自分ステージに「クルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    ),
  },
  // 03
  { no:3,  name:"トナカイの少女ニコラ", type:"character",
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    summon:"kensan", rank:5, atk:2000,
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ),
  },
  // 04
  { no:4,  name:"聖ラウス", type:"character",
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    rank:3, atk:1500,
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    ),
  },
  // 05
  { no:5,  name:"統括AI タータ", type:"character",
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    rank:4, atk:2000,
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ),
  },
  // 06
  { no:6,  name:"麗し令嬢エフィ", type:"character",
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    summon:"kensan", rank:5, atk:2000,
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    ),
  },
  // 07
  { no:7,  name:"狩樹 まひる", type:"character",
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    rank:4, atk:1700,
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃することができる。\n" +
      "相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    ),
  },
  // 08
  { no:8,  name:"組織の男 手形", type:"effect",
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    rank:0, atk:0,
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。"),
  },
  // 09
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    rank:4, atk:1900,
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n" +
      "自分ステージに「小次郎」カードがある時、このカードのATK+500。"
    ),
  },
  // 10
  { no:10,  name:"小次郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    rank:4, atk:1900,
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n" +
      "自分ステージに「小太郎」カードがある時、このカードのATK+500。"
    ),
  },
  // 11
  { no:11, name:"司令", type:"item",
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    rank:0, atk:0,
    text: normalizeText(
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"
    ),
  },
  // 12
  { no:12, name:"班目プロデューサー", type:"character",
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    rank:3, atk:1600,
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"),
  },
  // 13
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character",
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    rank:4, atk:2100,
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
  },
  // 14
  { no:14, name:"記憶抹消", type:"effect",
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    rank:0, atk:0,
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。"),
  },
  // 15
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect",
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    rank:0, atk:0,
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
  },
  // 16
  { no:16, name:"力こそパワー！！", type:"effect",
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    rank:0, atk:0,
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"),
  },
  // 17
  { no:17, name:"キャトルミューティレーション", type:"effect",
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    rank:0, atk:0,
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
  },
  // 18
  { no:18, name:"a-xブラスター01 -放射型-", type:"item",
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    rank:0, atk:0,
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    ),
  },
  // 19
  { no:19, name:"-聖剣- アロングダイト", type:"item",
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    rank:0, atk:0,
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    ),
  },
  // 20
  { no:20, name:"普通の棒", type:"item",
    tags:["木の棒","可能性"], titleTag:"MAGIAGIA-マギアギア-",
    rank:0, atk:0,
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\n" +
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    ),
  },
];

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push(mkCard(c));
    deck.push(mkCard(c));
  }
  shuffle(deck);
  return deck;
}

/* ---------------- State ---------------- */
const state = {
  started:false,
  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",
  normalSummonUsed:false,
  selectedHandIndex:null,

  // battle selection
  battle: { attackerPos:null, attacksUsedThisTurn:{0:0,1:0,2:0} },

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },

  // reaction windows
  stack: { resolving:false },
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];

/* ---------------- Modals basic ---------------- */
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
});

/* Viewer */
function openViewer(card){
  const atkNow = currentAtk(card);
  el.viewerTitle.textContent = card.name;
  el.viewerText.textContent =
    `${card.name}\nRANK ${card.rank||0} / ATK ${atkNow}\n` +
    `タグ：${(card.tags||[]).join("／")}\n` +
    `タイトルタグ：${card.titleTag||"—"}\n\n` +
    `${card.text||""}`;
  el.viewerImg.src = state.img.cardUrlByNo[pad2(card.no)] || "";
  showModal("viewerM");
}

/* Choice with thumbs */
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
    s.textContent = it.sub || (it.card ? `RANK ${it.card.rank||0} / ATK ${currentAtk(it.card)}` : "");
    meta.appendChild(t);
    if(s.textContent) meta.appendChild(s);

    row.appendChild(th);
    row.appendChild(meta);

    row.addEventListener("click", ()=>{
      hideModal("choiceM");
      if(choiceResolver){ const r = choiceResolver; choiceResolver=null; r(it.value); }
    }, {passive:true});

    if(it.card){
      bindLongPress(row, ()=> openViewer(it.card), 380);
    }
    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);
  showModal("choiceM");
  return new Promise((resolve)=>{ choiceResolver = resolve; });
}
async function askYesNo(title, message, yesLabel="使う", noLabel="使わない"){
  const v = await askChoice(title, message, [
    {label: yesLabel, value:true},
    {label: noLabel, value:false},
  ]);
  return !!v;
}

/* ---------------- Images ---------------- */
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

/* ---------------- Render helpers ---------------- */
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

/* ---------------- Core piles / move ---------------- */
function toWing(side, card, reason=""){
  if(!card) return;
  state[side].wing.push(card);
  if(reason) log(`${side==="P1"?"あなた":"AI"}：${reason} →ウイング「${card.name}」`);
}
function removeFromZone(side, zone, idx){
  const p = state[side];
  if(zone==="hand") return p.hand.splice(idx,1)[0];
  if(zone==="C"){ const c = p.C[idx]; p.C[idx]=null; return c; }
  if(zone==="E"){ const c = p.E[idx]; p.E[idx]=null; return c; }
  if(zone==="shield"){ const c = p.shield[idx]; p.shield[idx]=null; return c; }
  return null;
}
function findEmptyC(side){
  const p = state[side];
  for(let i=0;i<3;i++) if(!p.C[i]) return i;
  return -1;
}

/* ---------------- Draw / limit ---------------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){ log(`${side==="P1"?"あなた":"AI"}：デッキ切れ`, "warn"); return; }
    p.hand.push(p.deck.shift());
  }
}
function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    toWing(side, c, "手札上限");
  }
}

/* ---------------- Effects: selection helpers ---------------- */
async function chooseYourCharacter(side, message="装備/対象にするキャラクターを選んでください。"){
  const p = state[side];
  const items = [];
  for(let i=0;i<3;i++){
    if(p.C[i]){
      items.push({label:`C${i+1}：${p.C[i].name}`, value:i, card:p.C[i]});
    }
  }
  if(!items.length) return -1;
  return await askChoice("対象選択", message, items);
}
async function chooseEnemyCharacter(enemySide, message="対象の相手キャラクターを選んでください。"){
  const p = state[enemySide];
  const items = [];
  for(let i=0;i<3;i++){
    if(p.C[i]){
      items.push({label:`相手C${i+1}：${p.C[i].name}`, value:i, card:p.C[i]});
    }
  }
  if(!items.length) return -1;
  return await askChoice("対象選択", message, items);
}

/* ---------------- Trigger window: 記憶抹消（No.14） ---------------- */
function findHandCardIndexByNo(side, no){
  const p = state[side];
  return p.hand.findIndex(c=>c && c.no===no);
}
async function tryMemoryErase(reactorSide, activatedCardName){
  // reactorSide = side that may react with No.14 from hand
  const idx = findHandCardIndexByNo(reactorSide, 14);
  if(idx<0) return false;

  const yes = await askYesNo("記憶抹消", `相手が効果を発動しました。\n「記憶抹消」を発動して無効にしますか？\n（対象：${activatedCardName}）`, "無効にする", "しない");
  if(!yes) return false;

  const used = removeFromZone(reactorSide, "hand", idx);
  toWing(reactorSide, used, "記憶抹消 発動");
  log(`${reactorSide==="P1"?"あなた":"AI"}：相手の効果を無効にしました`);
  return true;
}

/* ---------------- On-enter optional prompts ---------------- */
async function handleOnEnter(side, card){
  if(!card) return;

  // 04: 聖ラウス search クランプス
  if(card.no===4){
    const yes = await askYesNo("登場時効果", "「聖ラウス」の効果を使いますか？\n（デッキ・ウイングからタグ「クランプス」を手札に）");
    if(!yes) return;
    await searchAndAddByTag(side, "クランプス");
    return;
  }

  // 05: タータ draw2
  if(card.no===5){
    const yes = await askYesNo("登場時効果", "「統括AI タータ」の効果を使いますか？\n（2枚ドロー）");
    if(!yes) return;
    draw(side, 2);
    log(`${side==="P1"?"あなた":"AI"}：タータ 2枚ドロー`);
    return;
  }

  // 11: 司令 auto equip
  if(card.no===11){
    const yes = await askYesNo("登場時効果", "「司令」を装備しますか？\n（自分キャラクターに装備：ATK+500）");
    if(!yes) return;
    await equipItemFlow(side, card, {baseBonus:500});
    return;
  }
}

/* ---------------- Search helpers ---------------- */
async function searchAndAddByTag(side, tag){
  const p = state[side];

  const fromDeck = p.deck.filter(c=>hasTag(c, tag));
  const fromWing = p.wing.filter(c=>hasTag(c, tag));

  const pool = [...fromDeck.map(c=>({src:"deck", card:c})), ...fromWing.map(c=>({src:"wing", card:c}))];
  if(!pool.length){ log(`${side==="P1"?"あなた":"AI"}：検索失敗（${tag}なし）`, "warn"); return; }

  const items = pool.slice(0, 24).map((x, i)=>({
    label:`${x.card.name}（${x.src==="deck"?"デッキ":"ウィング"}）`,
    value:`${x.src}:${x.card.uid}`,
    card:x.card,
  }));
  const pick = await askChoice("検索", `タグ「${tag}」を1枚選んで手札に加えます。`, items);
  const [src, uid] = String(pick).split(":");

  let chosen=null;
  if(src==="deck"){
    const idx = p.deck.findIndex(c=>c.uid===uid);
    if(idx>=0) chosen = p.deck.splice(idx,1)[0];
  }else{
    const idx = p.wing.findIndex(c=>c.uid===uid);
    if(idx>=0) chosen = p.wing.splice(idx,1)[0];
  }
  if(!chosen){ log("検索：選択カードが見つかりません", "warn"); return; }

  p.hand.push(chosen);
  log(`${side==="P1"?"あなた":"AI"}：検索→手札「${chosen.name}」`);
}

async function searchAndAddByNameIncludes(side, needle){
  const p = state[side];
  const pool = [
    ...p.deck.filter(c=>(c.name||"").includes(needle)).map(c=>({src:"deck", card:c})),
    ...p.wing.filter(c=>(c.name||"").includes(needle)).map(c=>({src:"wing", card:c})),
  ];
  if(!pool.length){ log(`${side==="P1"?"あなた":"AI"}：検索失敗（「${needle}」なし）`, "warn"); return; }

  const items = pool.slice(0, 24).map(x=>({
    label:`${x.card.name}（${x.src==="deck"?"デッキ":"ウィング"}）`,
    value:`${x.src}:${x.card.uid}`,
    card:x.card,
  }));
  const pick = await askChoice("検索", `カード名に「${needle}」を含むカードを1枚選んで手札に加えます。`, items);
  const [src, uid] = String(pick).split(":");

  let chosen=null;
  if(src==="deck"){
    const idx = p.deck.findIndex(c=>c.uid===uid);
    if(idx>=0) chosen = p.deck.splice(idx,1)[0];
  }else{
    const idx = p.wing.findIndex(c=>c.uid===uid);
    if(idx>=0) chosen = p.wing.splice(idx,1)[0];
  }
  if(!chosen){ log("検索：選択カードが見つかりません", "warn"); return; }

  p.hand.push(chosen);
  log(`${side==="P1"?"あなた":"AI"}：検索→手札「${chosen.name}」`);
}

/* ---------------- Item equip flow ---------------- */
async function equipItemFlow(side, itemCard, opt={}){
  const targetPos = await chooseYourCharacter(side, "装備するキャラクターを選んでください。");
  if(targetPos<0){ log("装備：キャラクターがいません", "warn"); return false; }
  const ch = state[side].C[targetPos];
  if(!ch){ log("装備：対象不在", "warn"); return false; }

  // compute bonus
  let bonus = opt.baseBonus || 0;

  if(itemCard.no===18){
    // base +500
    bonus = 500;
    if(hasTag(ch,"射手")) bonus += 500;
  }else if(itemCard.no===19){
    bonus = 500;
    // (勇者 or 剣士) => +500
    if(hasTag(ch,"勇者") || hasTag(ch,"剣士")) bonus += 500;
  }else if(itemCard.no===20){
    bonus = 300;
    if(hasTag(ch,"勇者")) bonus += 500;
  }else if(itemCard.no===11){
    bonus = 500;
  }

  itemCard.bonusAtk = bonus;
  ch.items = ch.items || [];
  ch.items.push(itemCard);

  log(`${side==="P1"?"あなた":"AI"}：装備「${itemCard.name}」→ ${ch.name}（ATK+${bonus}）`);
  return true;
}

/* ---------------- Play actions from hand ---------------- */
async function playCharacterNormal(side, handIndex, pos){
  const p = state[side];
  const card = p.hand[handIndex];
  if(!card || !isCharacter(card)) return;

  p.C[pos] = card;
  p.hand.splice(handIndex,1);

  log(`${side==="P1"?"あなた":"AI"}：登場「${card.name}」`);
  await handleOnEnter(side, card);
}

async function playCharacterKensan(side, handIndex, pos){
  const p = state[side];
  const card = p.hand[handIndex];
  if(!card || !isCharacter(card) || card.summon!=="kensan") return;

  // cost candidates (hand except selected, plus stage C/E)
  const cands = [];
  for(let i=0;i<p.hand.length;i++){
    if(i===handIndex) continue;
    cands.push({from:"hand", idx:i, card:p.hand[i], label:`手札：${p.hand[i].name}`});
  }
  for(let i=0;i<3;i++){
    if(p.C[i]) cands.push({from:"C", idx:i, card:p.C[i], label:`C${i+1}：${p.C[i].name}`});
    if(p.E[i]) cands.push({from:"E", idx:i, card:p.E[i], label:`E${i+1}：${p.E[i].name}`});
  }
  if(!cands.length){ log("見参：コスト候補なし", "warn"); return; }

  const pick = await askChoice("見参（コスト）", "ウイングへ送るカードを1枚選んでください。", cands.map(x=>({
    label:x.label, value:`${x.from}:${x.idx}`, card:x.card
  })));

  const [from, idxStr] = String(pick).split(":");
  const idx = Number(idxStr);

  if(from==="hand"){
    const moved = p.hand.splice(idx,1)[0];
    toWing(side, moved, "見参コスト");
    if(idx < handIndex) handIndex -= 1;
  }else if(from==="C"){
    const moved = p.C[idx];
    p.C[idx]=null;
    toWing(side, moved, "見参コスト");
  }else if(from==="E"){
    const moved = p.E[idx];
    p.E[idx]=null;
    toWing(side, moved, "見参コスト");
  }

  const placed = p.hand.splice(handIndex,1)[0];
  p.C[pos]=placed;
  log(`${side==="P1"?"あなた":"AI"}：見参「${placed.name}」`);
  await handleOnEnter(side, placed);
}

/* ---------------- Effect resolve ---------------- */
async function resolveEffectFromHand(side, handIndex, effectCard){
  // Opponent reaction (記憶抹消) check:
  const enemy = (side==="P1") ? "AI" : "P1";
  const negated = await tryMemoryErase(enemy, effectCard.name);
  if(negated){
    // the effect card is still used (sent to wing)
    const used = removeFromZone(side, "hand", handIndex);
    toWing(side, used, "効果（無効化された）");
    return;
  }

  // 02 flame bullet
  if(effectCard.no===2){
    if(!existsOnStageByName(side, "黒の魔法使いクルエラ")){
      log("フレイムバレット：自分ステージにクルエラが必要です", "warn");
      return;
    }
    const mode = await askChoice("フレイムバレット", "効果を選んでください。", [
      {label:"ATKが1番高い相手キャラをウイングへ", value:"max"},
      {label:"rank4以下の相手キャラをすべてウイングへ", value:"r4"},
    ]);

    if(mode==="max"){
      const enemyChars = state[enemy].C.map((c,i)=>({c,i})).filter(x=>x.c);
      if(!enemyChars.length){ log("対象：相手キャラがいません", "warn"); }
      else{
        let best = enemyChars[0];
        for(const x of enemyChars){
          if(currentAtk(x.c) > currentAtk(best.c)) best = x;
        }
        const removed = removeFromZone(enemy, "C", best.i);
        // equipped items go wing too (loser rule)
        await sendEquippedItemsToWing(enemy, removed, "効果で除去");
        toWing(enemy, removed, "フレイムバレット");
      }
    }else{
      for(let i=0;i<3;i++){
        const c = state[enemy].C[i];
        if(c && Number(c.rank||0) <= 4){
          const removed = removeFromZone(enemy, "C", i);
          await sendEquippedItemsToWing(enemy, removed, "効果で除去");
          toWing(enemy, removed, "フレイムバレット");
        }
      }
    }

    // used card -> wing
    const used = removeFromZone(side, "hand", handIndex);
    toWing(side, used, "エフェクト使用");
    return;
  }

  // 15 battle buff
  if(effectCard.no===15){
    if(state.phase!=="BATTLE"){
      log("桜蘭の陰陽術：バトル中のみ発動できます", "warn");
      return;
    }
    const pos = await chooseYourCharacter(side, "ATK+1000する自分キャラクターを選んでください。");
    if(pos<0) return;
    const ch = state[side].C[pos];
    if(!ch) return;
    ch.buffs.push({atk:1000, untilTurn: state.turn});
    log(`${side==="P1"?"あなた":"AI"}：${ch.name} ATK+1000（ターン終了まで）`);

    const used = removeFromZone(side, "hand", handIndex);
    toWing(side, used, "エフェクト使用");
    return;
  }

  // 16 remove lowest enemy atk (your turn only)
  if(effectCard.no===16){
    if(side!=="P1" || state.activeSide!=="P1" || state.phase!=="MAIN"){
      log("力こそパワー！！：自分ターンMAINのみ", "warn");
      return;
    }
    const enemyChars = state.AI.C.map((c,i)=>({c,i})).filter(x=>x.c);
    if(!enemyChars.length){ log("対象：相手キャラがいません", "warn"); }
    else{
      let best = enemyChars[0];
      for(const x of enemyChars){
        if(currentAtk(x.c) < currentAtk(best.c)) best = x;
      }
      const removed = removeFromZone("AI", "C", best.i);
      await sendEquippedItemsToWing("AI", removed, "効果で除去");
      toWing("AI", removed, "力こそパワー！！");
    }
    const used = removeFromZone(side, "hand", handIndex);
    toWing(side, used, "エフェクト使用");
    return;
  }

  // 17 reaction only (handled in battle hook) -> if played at wrong time, warn
  if(effectCard.no===17){
    log("キャトルミューティレーション：発動タイミング（自分キャラがバトルでウイングへ送られた時）で自動確認します", "warn");
    return;
  }

  // 08 (手形) is opponent-turn only negate; simplified: allow only when opponent effect resolves -> handled separately
  if(effectCard.no===8){
    log("組織の男 手形：相手ターンの効果無効は、相手が効果を使った時に自動確認します", "warn");
    return;
  }

  // 14 is reaction; handled automatically by tryMemoryErase
  if(effectCard.no===14){
    log("記憶抹消：相手が効果を発動した時に自動で確認します", "warn");
    return;
  }

  // default: consume
  const used = removeFromZone(side, "hand", handIndex);
  toWing(side, used, "エフェクト使用");
}

/* ---------------- Utilities: stage search ---------------- */
function existsOnStageByName(side, name){
  const p = state[side];
  return p.C.some(c=>c && c.name===name);
}

/* ---------------- Character activated abilities ---------------- */
async function tryActivateCharacterAbility(side, pos){
  const p = state[side];
  const ch = p.C[pos];
  if(!ch) return;

  const isYourTurn = (state.activeSide===side);
  const inMain = (state.phase==="MAIN");
  const inBattle = (state.phase==="BATTLE");

  // 01 クルエラ: once per turn search name includes "黒魔法"
  if(ch.no===1){
    if(!isYourTurn || !inMain) { log("クルエラ：自分ターンMAINのみ", "warn"); return; }
    if(usedThisTurn(ch, "search_black")) { log("クルエラ：このターンは使用済みです", "warn"); return; }
    const yes = await askYesNo("クルエラ", "効果を使いますか？\n（デッキ・ウイングからカード名に「黒魔法」を含むカードを手札に）");
    if(!yes) return;
    await searchAndAddByNameIncludes(side, "黒魔法");
    markUsedThisTurn(ch, "search_black");
    renderAll();
    return;
  }

  // 03 ニコラ: self buff
  if(ch.no===3){
    if(!isYourTurn || !inMain) { log("ニコラ：自分ターンMAINのみ", "warn"); return; }
    if(usedThisTurn(ch, "buff")) { log("ニコラ：このターンは使用済みです", "warn"); return; }
    const yes = await askYesNo("ニコラ", "効果を使いますか？\n（ATK+1000：ターン終了まで）");
    if(!yes) return;
    ch.buffs.push({atk:1000, untilTurn: state.turn});
    markUsedThisTurn(ch, "buff");
    log("ニコラ：ATK+1000");
    renderAll();
    return;
  }

  // 06 エフィ: debuff enemy
  if(ch.no===6){
    if(!isYourTurn || !inMain) { log("エフィ：自分ターンMAINのみ", "warn"); return; }
    if(usedThisTurn(ch, "debuff")) { log("エフィ：このターンは使用済みです", "warn"); return; }
    const yes = await askYesNo("エフィ", "効果を使いますか？\n（相手キャラ1体 ATK-1000：ターン終了まで）");
    if(!yes) return;
    const tpos = await chooseEnemyCharacter(side==="P1"?"AI":"P1", "ATK-1000する相手キャラクターを選んでください。");
    if(tpos<0) return;
    const enemySide = side==="P1"?"AI":"P1";
    const target = state[enemySide].C[tpos];
    if(!target) return;
    target.buffs.push({atk:-1000, untilTurn: state.turn});
    markUsedThisTurn(ch, "debuff");
    log(`エフィ：${target.name} ATK-1000`);
    renderAll();
    return;
  }

  // 05 タータ: exchange BUGBUG
  if(ch.no===5){
    if(!isYourTurn || !inMain) { log("タータ：自分ターンMAINのみ", "warn"); return; }
    if(usedThisTurn(ch, "exchange")) { log("タータ：このターンは使用済みです", "warn"); return; }

    const yes = await askYesNo("タータ", "効果を使いますか？\n（手札から最大2枚をウイング→同枚数だけBUGBUG西遊記をデッキから手札へ）");
    if(!yes) return;

    const toSend = Math.min(2, state[side].hand.length);
    if(toSend<=0){ log("タータ：手札がありません", "warn"); return; }

    // choose 0-2 by repeating choice
    let count=0;
    for(let k=0;k<2;k++){
      const items = state[side].hand.map((c,i)=>({label:`手札：${c.name}`, value:i, card:c}));
      items.unshift({label:"送るのをやめる", value:-1});
      const pick = await askChoice("タータ（送るカード）", `ウイングへ送るカードを選んでください（残り ${2-k} 回）`, items);
      const idx = Number(pick);
      if(idx<0) break;
      const moved = removeFromZone(side, "hand", idx);
      toWing(side, moved, "タータ交換");
      count++;
    }

    if(count>0){
      // search from deck: titleTag BUGBUG西遊記
      const p = state[side];
      for(let i=0;i<count;i++){
        const idx = p.deck.findIndex(c=>titleIs(c,"BUGBUG西遊記"));
        if(idx<0){ log("タータ：BUGBUG西遊記がデッキにありません", "warn"); break; }
        const got = p.deck.splice(idx,1)[0];
        p.hand.push(got);
        log(`タータ：手札へ「${got.name}」`);
      }
    }
    markUsedThisTurn(ch, "exchange");
    renderAll();
    return;
  }

  // 09/10 pair summon partner (kensan-like without cost)
  if(ch.no===9 || ch.no===10){
    if(!isYourTurn || !inMain) { log("小太郎/小次郎：自分ターンMAINのみ", "warn"); return; }
    const partnerName = (ch.no===9) ? "小次郎・孫悟空Lv17" : "小太郎・孫悟空Lv17";
    const idx = state[side].hand.findIndex(c=>c && c.name===partnerName);
    if(idx<0){ log(`手札に「${partnerName}」がありません`, "warn"); return; }
    const empty = findEmptyC(side);
    if(empty<0){ log("空きCがありません", "warn"); return; }

    const yes = await askYesNo("見参", `「${partnerName}」を見参させますか？`);
    if(!yes) return;

    const partner = removeFromZone(side, "hand", idx);
    state[side].C[empty] = partner;
    log(`見参：${partner.name}`);
    await handleOnEnter(side, partner);
    renderAll();
    return;
  }

  // 13 スタマックス：self-sacrifice debuff enemy (allow even on opponent turn)
  if(ch.no===13){
    if(usedThisTurn(ch, "stamax")) { log("スタマックス：このターンは使用済みです", "warn"); return; }
    const yes = await askYesNo("スタマックス", "効果を使いますか？\n（このカードをウイング→相手キャラ1体 ATK-1000：ターン終了まで）");
    if(!yes) return;

    const enemySide = (side==="P1")?"AI":"P1";
    const tpos = await chooseEnemyCharacter(enemySide, "ATK-1000する相手キャラクターを選んでください。");
    if(tpos<0) return;

    const removedSelf = removeFromZone(side, "C", pos);
    toWing(side, removedSelf, "スタマックス 効果");

    const target = state[enemySide].C[tpos];
    if(target){
      target.buffs.push({atk:-1000, untilTurn: state.turn});
      log(`スタマックス：${target.name} ATK-1000`);
    }
    markUsedThisTurn(ch, "stamax");
    renderAll();
    return;
  }

  // 12 班目：battle immunity handled in battle resolution
}

/* ---------------- Equipment loss on defeat ---------------- */
async function sendEquippedItemsToWing(side, defeatedChar, reason=""){
  if(!defeatedChar) return;
  const items = defeatedChar.items || [];
  if(items.length){
    for(const it of items){
      toWing(side, it, reason || "装備破棄");
    }
    defeatedChar.items = [];
  }
}

/* ---------------- Battle logic ---------------- */
function shieldsRemaining(side){
  return state[side].shield.filter(Boolean).length;
}
function canDirectAttack(attacker){
  // 07: cannot direct if enemy shields 0
  if(attacker && attacker.no===7) return false;
  return true;
}
async function handleBattleAttack(attSide, attPos, defSide, defPosOrShield){
  const attacker = state[attSide].C[attPos];
  if(!attacker) return;

  // attack limit: default 1, but 07 with item => 2
  const baseMax = (attacker.no===7 && (attacker.items||[]).length>0) ? 2 : 1;
  const used = state.battle.attacksUsedThisTurn[attPos] || 0;
  if(used >= baseMax){
    log("このキャラクターはこのターンこれ以上攻撃できません", "warn");
    return;
  }

  // If targeting shield/direct:
  if(defPosOrShield==="shield"){
    const rem = shieldsRemaining(defSide);
    if(rem<=0){
      // direct
      if(!canDirectAttack(attacker)){
        log("このカードは相手のシールドが0枚の時、直接攻撃できません（狩樹 まひる）", "warn");
        return;
      }
      log("DIRECT ATTACK！ 勝利条件を満たしました");
      log("※このデモ版では、DIRECT ATTACK時点で勝利扱いにします");
      // simple end: reset to title
      await sleep(450);
      state.started=false;
      el.game.classList.remove("active");
      el.title.classList.add("active");
      LOGS.unshift({msg:"ゲーム終了（DIRECT ATTACK）", kind:"muted", t:Date.now()});
      return;
    }

    // break one shield (choose which)
    const shieldIdxs = state[defSide].shield.map((c,i)=>({c,i})).filter(x=>x.c);
    const pick = await askChoice("シールド破壊", "破壊するシールドを選んでください。", shieldIdxs.map(x=>({
      label:`シールド${x.i+1}`, value:x.i
    })));
    const idx = Number(pick);
    const broken = removeFromZone(defSide, "shield", idx);
    toWing(defSide, broken, "シールド破壊");
    state.battle.attacksUsedThisTurn[attPos] = used + 1;
    renderAll();
    return;
  }

  // Target character battle
  const defPos = Number(defPosOrShield);
  const defender = state[defSide].C[defPos];
  if(!defender){ log("対象がいません", "warn"); return; }

  // battle buff chance: allow using 15 from hand if attacker side is P1 and has it
  // (simple prompt to reduce stress)
  if(attSide==="P1"){
    const idx15 = findHandCardIndexByNo("P1", 15);
    if(idx15>=0){
      const yes = await askYesNo("バトル前", "手札の「桜蘭の陰陽術 - 闘 -」を発動しますか？\n（ATK+1000：ターン終了まで）", "発動する", "しない");
      if(yes){
        const usedCard = removeFromZone("P1", "hand", idx15);
        // choose attacker (fixed)
        attacker.buffs.push({atk:1000, untilTurn: state.turn});
        toWing("P1", usedCard, "エフェクト使用");
      }
    }
  }

  const atkA = currentAtk(attacker);
  const atkD = currentAtk(defender);

  // 12 班目：once per turn cannot be destroyed by battle
  const defenderIsMadame = (defender.no===12);
  const defenderImmune = defenderIsMadame && !usedThisTurn(defender, "immune");

  if(atkA > atkD){
    // defender loses (unless immune)
    if(defenderImmune){
      markUsedThisTurn(defender, "immune");
      log("班目プロデューサー：バトル破壊を1回無効にしました");
    }else{
      const removed = removeFromZone(defSide, "C", defPos);
      await sendEquippedItemsToWing(defSide, removed, "バトル敗北");
      toWing(defSide, removed, "バトル敗北");
      // 19 alongdite: if equipped and hero/swordsman => on win draw 1
      if((attacker.items||[]).some(it=>it.no===19) && (hasTag(attacker,"勇者") || hasTag(attacker,"剣士"))){
        draw(attSide, 1);
        log("アロングダイト：勝利時ドロー +1");
      }
    }
  }else if(atkA < atkD){
    // attacker loses
    const removed = removeFromZone(attSide, "C", attPos);
    await sendEquippedItemsToWing(attSide, removed, "バトル敗北");
    toWing(attSide, removed, "バトル敗北");

    // 17 キャトルミューティレーション（手札から反応）
    if(attSide==="P1"){
      const idx17 = findHandCardIndexByNo("P1", 17);
      if(idx17>=0){
        const yes = await askYesNo("キャトルミューティレーション", "自分キャラがバトルでウイングへ送られました。\n「キャトルミューティレーション」を発動しますか？\n（相手キャラ1体を手札に戻す）", "発動する", "しない");
        if(yes){
          const enemySide = defSide;
          const tpos = await chooseEnemyCharacter(enemySide, "手札に戻す相手キャラクターを選んでください。");
          if(tpos>=0){
            const bounced = removeFromZone(enemySide, "C", tpos);
            if(bounced){
              state[enemySide].hand.push(bounced);
              log(`キャトル：${bounced.name} を相手手札に戻しました`);
            }
          }
          const used = removeFromZone("P1", "hand", idx17);
          toWing("P1", used, "エフェクト使用");
        }
      }
    }
  }else{
    // tie: both to wing
    const remA = removeFromZone(attSide, "C", attPos);
    const remD = removeFromZone(defSide, "C", defPos);
    await sendEquippedItemsToWing(attSide, remA, "相打ち");
    await sendEquippedItemsToWing(defSide, remD, "相打ち");
    toWing(attSide, remA, "相打ち");
    toWing(defSide, remD, "相打ち");
  }

  state.battle.attacksUsedThisTurn[attPos] = used + 1;
  renderAll();
}

/* ---------------- Interactions: Your zones ---------------- */
async function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  // MAIN: summon / kensan / ability
  if(state.phase==="MAIN"){
    // if hand selected => place
    if(state.selectedHandIndex!=null && !state.P1.C[pos]){
      const card = state.P1.hand[state.selectedHandIndex];
      if(!card) return;

      if(isCharacter(card)){
        if(card.summon==="kensan"){
          await playCharacterKensan("P1", state.selectedHandIndex, pos);
        }else{
          if(state.normalSummonUsed){
            log("登場（通常）はターン1回です（見参は別）", "warn"); return;
          }
          await playCharacterNormal("P1", state.selectedHandIndex, pos);
          state.normalSummonUsed = true;
        }
        state.selectedHandIndex = null;
        renderAll();
        return;
      }

      log("Cにはキャラクターのみ置けます", "warn");
      return;
    }

    // tap a placed character => ability menu (if exists)
    if(state.P1.C[pos]){
      await tryActivateCharacterAbility("P1", pos);
      return;
    }
  }

  // BATTLE: choose attacker
  if(state.phase==="BATTLE"){
    if(!state.P1.C[pos]) return;
    state.battle.attackerPos = pos;
    log(`攻撃キャラ選択：C${pos+1}「${state.P1.C[pos].name}」`);
    renderAll();
    return;
  }
}

async function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card) return;

  // Place & resolve immediately for effect/item
  if(isEffect(card)){
    // auto resolve on activation (no extra tap)
    await resolveEffectFromHand("P1", state.selectedHandIndex, card);
    state.selectedHandIndex=null;
    renderAll();
    return;
  }

  if(isItem(card)){
    // items: equip immediately (no lingering on E)
    const yes = await askYesNo("アイテム", `「${card.name}」を装備しますか？`, "装備する", "やめる");
    if(!yes) return;

    const used = removeFromZone("P1","hand", state.selectedHandIndex);
    state.selectedHandIndex=null;

    const ok = await equipItemFlow("P1", used);
    if(!ok){
      // if failed, return to hand
      state.P1.hand.push(used);
      log("装備失敗：手札に戻しました", "warn");
    }
    renderAll();
    return;
  }

  log("Eにはエフェクト/アイテムのみ置けます", "warn");
}

async function onClickEnemyC(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  const attPos = state.battle.attackerPos;
  if(attPos==null){ log("先に自分の攻撃キャラを選んでください", "warn"); return; }
  await handleBattleAttack("P1", attPos, "AI", pos);
}

async function onClickEnemyShield(){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  const attPos = state.battle.attackerPos;
  if(attPos==null){ log("先に自分の攻撃キャラを選んでください", "warn"); return; }
  await handleBattleAttack("P1", attPos, "AI", "shield");
}

/* ---------------- Rendering ---------------- */
function updateHUD(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  el.chipActive.textContent = (state.activeSide==="P1") ? "YOUR TURN" : "ENEMY TURN";
  el.btnNext.disabled = (state.activeSide!=="P1");
  el.btnEnd.disabled  = (state.activeSide!=="P1");
  el.btnNext.style.opacity = (state.activeSide==="P1") ? "1" : ".45";
  el.btnEnd.style.opacity  = (state.activeSide==="P1") ? "1" : ".45";
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
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const slot = makeSlot(state.AI.E[i], {enemy:true});
    el.aiE.appendChild(slot);
  }

  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const slot = makeSlot(state.AI.C[i], {enemy:true, sel:(state.phase==="BATTLE" && state.battle.attackerPos!=null)});
    slot.addEventListener("click", ()=> onClickEnemyC(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const sel = (state.phase==="BATTLE" && state.battle.attackerPos===i);
    const slot = makeSlot(c, {glow, sel});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(slot);
  }

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

    const playable = (state.activeSide==="P1" && state.phase==="MAIN");
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1") return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      renderAll();
    }, {passive:true});
    bindLongPress(h, ()=> openViewer(c), 420);
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

    // DIRECT icon: show only when all shields are gone
    const rem = shieldsRemaining(side);
    slot.classList.toggle("direct", rem===0);

    // Enemy shield tap in battle to break/direct
    if(side==="AI"){
      slot.onclick = null;
      slot.addEventListener("click", ()=> onClickEnemyShield(), {passive:true});
    }
  });
}

function renderPiles(){
  // Deck only shows back. Wing/Outside stays blank (CSS already)
  document.querySelectorAll(".pileCard").forEach((n)=>{
    const pile = n.getAttribute("data-pile") || "";
    if(pile==="P_DECK" || pile==="AI_DECK"){
      if(state.img.backUrl) n.style.backgroundImage = `url("${state.img.backUrl}")`;
      else n.style.backgroundImage = "";
    }else{
      n.style.backgroundImage = "";
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

/* ---------------- Turn controls ---------------- */
async function onTurnStart(side){
  // reset per-turn usage on both sides each new turn
  resetUsedThisTurn("P1");
  resetUsedThisTurn("AI");
  state.battle.attackerPos = null;
  state.battle.attacksUsedThisTurn = {0:0,1:0,2:0};

  // 18 blaster: if equipped on "射手", at opponent turn start discard random hand to wing
  const enemy = (side==="P1") ? "AI" : "P1";
  const p = state[side];
  for(const ch of p.C.filter(Boolean)){
    for(const it of (ch.items||[])){
      if(it.no===18 && hasTag(ch,"射手")){
        if(state[enemy].hand.length>0){
          const r = Math.floor(Math.random()*state[enemy].hand.length);
          const moved = removeFromZone(enemy, "hand", r);
          toWing(enemy, moved, "a-xブラスター01（手札ランダム破棄）");
        }
      }
    }
  }
}

function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.battle.attackerPos=null;
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${state.activeSide==="P1"?"あなた":"AI"}：ドロー +1`);
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
  }
  renderAll();
}

async function endTurn(){
  enforceHandLimit(state.activeSide);

  if(state.activeSide==="P1"){
    state.activeSide="AI";
    state.phase="START";
    renderAll();

    await onTurnStart("AI");

    // AI簡易（安定優先）
    draw("AI", 1);
    enforceHandLimit("AI");

    // ここではAI行動を最小化（将来拡張）
    // 例：手札からキャラ1枚置けるなら置く、などは後段で。

    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    await onTurnStart("P1");

    log(`TURN ${state.turn} あなたのターン`);
    renderAll();
  }
}

/* ---------------- Start game ---------------- */
function startGame(){
  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.battle = { attackerPos:null, attacksUsedThisTurn:{0:0,1:0,2:0} };

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

  state.firstSide = (Math.random()<0.5) ? "P1" : "AI";
  state.activeSide = state.firstSide;

  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log(`ゲーム開始：初手4 / シールド3 / デッキ40 / 先攻=${el.firstInfo.textContent}`);

  // start-of-turn triggers
  onTurnStart(state.activeSide);

  renderAll();
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
  }, 360);

  el.btnNext.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
    nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
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

/* ---------------- init ---------------- */
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
  log("v50001：カード効果UIを自動化（発動→即選択/登場→即確認）+ 装備/敗北処理 + DIRECTアイコン");
}
document.addEventListener("DOMContentLoaded", init);