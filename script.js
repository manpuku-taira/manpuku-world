/* =========================================================
  Manpuku World - v50010
  - v50000ベースのiPhoneレイアウト維持
  - C1(左端)タップ不具合の回避を強化
  - 20種×2枚=40枚デッキ
  - アイテムはEスロット占有して装備維持（キャラ退場で同時にウイング）
  - エフェクトは発動後に自動でウイング
  - 装備/強化の視認性（枠色＋ATK差分＋長押しで現在ATK表示）
  - AI：最低限の配置＋効果（できる範囲）＋攻撃
  - 相手先攻でも進行停止しない
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
  for(const it of LOGS.slice(0, 240)){
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
function hasTag(card, tag){
  if(!card || !Array.isArray(card.tags)) return false;
  return card.tags.includes(tag);
}
function hasTitle(card, t){
  return !!card && String(card.titleTag||"") === String(t||"");
}

/* ---------------- Cards (No.01〜20 / タグ確定反映) ----------------
  ※ご主人様から明示されたATK/Rankは厳守。
  ※未提示の数値は「ゲームが動くための仮値」として置いています。
  （必要なら後で数値だけ差し替えできます）
------------------------------------------------------------------ */
const CardRegistry = [
  // 01
  { no:1,  name:"黒の魔法使いクルエラ", type:"character",
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウイングからカード名に「黒魔法」を含むカード1枚を手札に加える。"
    ),
    rank:5, atk:2500
  },
  // 02
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect",
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ステージに「黒の魔法使いクルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    ),
    rank:0, atk:0
  },
  // 03
  { no:3,  name:"トナカイの少女ニコラ", type:"character",
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ),
    rank:5, atk:2000
  },
  // 04
  { no:4,  name:"聖ラウス", type:"character",
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    ),
    rank:3, atk:1500
  },
  // 05
  { no:5,  name:"統括AI タータ", type:"character",
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ),
    rank:4, atk:2000
  },
  // 06
  { no:6,  name:"麗し令嬢エフィ", type:"character",
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    ),
    rank:5, atk:2000
  },
  // 07
  { no:7,  name:"狩樹 まひる", type:"character",
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃することができる。\n" +
      "相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    ),
    rank:4, atk:1700
  },
  // 08
  { no:8,  name:"組織の男 手形", type:"effect",
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。"),
    rank:0, atk:0
  },
  // 09
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小次郎・孫悟空Lv17」カードを見参させる。\n" +
      "自分ステージに「小次郎・孫悟空Lv17」カードがある時、このカードのATK+500。"
    ),
    rank:4, atk:1800
  },
  // 10
  { no:10, name:"小次郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小太郎・孫悟空Lv17」カードを見参させる。\n" +
      "自分ステージに「小太郎・孫悟空Lv17」カードがある時、このカードのATK+500。"
    ),
    rank:4, atk:1800
  },
  // 11
  { no:11, name:"司令", type:"item",
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"
    ),
    rank:0, atk:0
  },
  // 12
  { no:12, name:"班目プロデューサー", type:"character",
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"),
    rank:3, atk:1600
  },
  // 13
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character",
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:5, atk:2200
  },
  // 14
  { no:14, name:"記憶抹消", type:"effect",
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。"),
    rank:0, atk:0
  },
  // 15
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect",
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    rank:0, atk:0
  },
  // 16
  { no:16, name:"力こそパワー！！", type:"effect",
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"),
    rank:0, atk:0
  },
  // 17
  { no:17, name:"キャトルミューティレーション", type:"effect",
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    rank:0, atk:0
  },
  // 18
  { no:18, name:"a-xブラスター01 -放射型-", type:"item",
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    ),
    rank:0, atk:0
  },
  // 19
  { no:19, name:"-聖剣- アロングダイト", type:"item",
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    ),
    rank:0, atk:0
  },
  // 20
  { no:20, name:"普通の棒", type:"item",
    tags:["木の棒","可能性"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\n" +
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    ),
    rank:0, atk:0
  },
];

function getCardByNo(no){
  const c = CardRegistry.find(x=>x.no===no);
  return c ? {...c} : null;
}
function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push({...c});
    deck.push({...c});
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
  battle: {
    attackerPos: null, // 0..2
  },

  // per turn flags
  flags: {
    P1: { negUsed:false, battleSave12:[false,false,false], attacks:[0,0,0] },
    AI: { negUsed:false, battleSave12:[false,false,false], attacks:[0,0,0] },
  },

  P1: {
    deck:[], hand:[], shield:[],
    C:[null,null,null],
    E:[null,null,null],
    wing:[], outside:[],
    // E装備の紐付け: Eスロット側に equipTo を持たせる
  },
  AI: {
    deck:[], hand:[], shield:[],
    C:[null,null,null],
    E:[null,null,null],
    wing:[], outside:[],
  },

  // temp buffs/debuffs until end of turn
  temp: {
    atkDelta: { P1:[0,0,0], AI:[0,0,0] }, // C位置に対する増減
  },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(card){ return card && card.type==="character"; }
function isEffect(card){ return card && card.type==="effect"; }
function isItem(card){ return card && card.type==="item"; }
function isEffectOrItem(card){ return card && card.type!=="character"; }

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
      bindLongPress(row, ()=> openViewer(it.card, it.viewerTextOverride), 380);
    }
    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);
  showModal("choiceM");
  return new Promise((resolve)=>{ choiceResolver = resolve; });
}

/* Viewer */
function calcEquipBonus(side, cPos){
  const p = state[side];
  let bonus = 0;
  // Eスロットにあるアイテムで equipTo がこのCを指しているものを合算
  for(let e=0;e<3;e++){
    const item = p.E[e];
    if(item && isItem(item) && item.equipTo && item.equipTo.pos===cPos){
      bonus += computeItemBonus(item, p.C[cPos]);
    }
  }
  return bonus;
}
function calcPairBonus(side, cPos){
  const c = state[side].C[cPos];
  if(!c) return 0;
  if(c.no===9){
    return state[side].C.some(x=>x && x.no===10) ? 500 : 0;
  }
  if(c.no===10){
    return state[side].C.some(x=>x && x.no===9) ? 500 : 0;
  }
  return 0;
}
function getCurrentATK(side, cPos){
  const base = state[side].C[cPos]?.atk || 0;
  const equip = calcEquipBonus(side, cPos);
  const pair = calcPairBonus(side, cPos);
  const temp = state.temp.atkDelta[side][cPos] || 0;
  return base + equip + pair + temp;
}
function openViewer(card, viewerTextOverride){
  el.viewerTitle.textContent = card.name;

  let extra = "";
  // もし場のキャラなら現在ATK表示を付与
  const posInfo = findCardOnStage(card);
  if(posInfo && posInfo.zone==="C"){
    const now = getCurrentATK(posInfo.side, posInfo.pos);
    const base = card.atk||0;
    const diff = now - base;
    extra = `\n\n【現在ATK】${now}（基礎${base}${diff!==0 ? ` / 変動${diff>0?"+":""}${diff}`:""}）`;
  }

  el.viewerText.textContent = viewerTextOverride
    ? viewerTextOverride
    : `${card.name}\nRANK ${card.rank||0} / ATK ${card.atk||0}\n\n${card.text||""}${extra}`;

  el.viewerImg.src = state.img.cardUrlByNo[pad2(card.no)] || "";
  showModal("viewerM");
}
function findCardOnStage(card){
  // 参照一致ではなく no で検索（複製カードがあるため厳密には難しいが、Viewer補助用途）
  for(const side of ["P1","AI"]){
    for(let i=0;i<3;i++){
      const c = state[side].C[i];
      if(c && c.no===card.no && c.name===card.name) return {side, zone:"C", pos:i};
    }
  }
  return null;
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
  slot.style.pointerEvents = "auto";
  slot.style.zIndex = "5";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");
  if(opts.buffed) slot.classList.add("buffed");

  // バッジ（装備/強化の視認性）
  if(opts.badgeText){
    const b = document.createElement("div");
    b.className = "badge";
    b.textContent = opts.badgeText;
    slot.appendChild(b);
  }

  if(card){
    slot.appendChild(faceForCard(card, !!opts.enemy));
    bindLongPress(slot, ()=> openViewer(card, opts.viewerTextOverride));
  }
  return slot;
}

/* ---------------- Core rules helpers ---------------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){ log(`${side==="P1"?"あなた":"AI"}：デッキ切れ`, "warn"); return false; }
    p.hand.push(p.deck.shift());
  }
  return true;
}
function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限→ウイング ${c.name}`);
  }
}

function listStageChars(side){
  const p = state[side];
  const out = [];
  for(let i=0;i<3;i++){
    if(p.C[i]) out.push({pos:i, card:p.C[i]});
  }
  return out;
}
function listEnemyChars(side){
  const enemy = (side==="P1") ? "AI" : "P1";
  return listStageChars(enemy);
}
function countShields(side){
  return state[side].shield.filter(Boolean).length;
}

function moveCharToWingWithEquip(side, cPos){
  const p = state[side];
  const ch = p.C[cPos];
  if(!ch) return;

  // 装備アイテム（E占有）を剥がして同時にウイングへ
  for(let e=0;e<3;e++){
    const it = p.E[e];
    if(it && isItem(it) && it.equipTo && it.equipTo.pos===cPos){
      p.E[e] = null;
      p.wing.push(it);
      log(`${side==="P1"?"あなた":"AI"}：装備解除→ウイング ${it.name}`);
    }
  }
  p.C[cPos] = null;
  p.wing.push(ch);
  log(`${side==="P1"?"あなた":"AI"}：ウイングへ ${ch.name}`);
}

function computeItemBonus(item, wearer){
  if(!item || !wearer) return 0;
  if(item.no===11) return 500;

  if(item.no===18){
    let b = 500;
    if(hasTag(wearer,"射手")) b += 500;
    return b;
  }
  if(item.no===19){
    let b = 500;
    if(hasTag(wearer,"勇者") || hasTag(wearer,"剣士")) b += 500;
    return b;
  }
  if(item.no===20){
    let b = 300;
    if(hasTag(wearer,"勇者")) b += 500;
    return b;
  }
  return 0;
}

/* ---------------- Trigger / Effect resolution ---------------- */
async function maybePromptOnEnter(side, cPos){
  const c = state[side].C[cPos];
  if(!c) return;

  // No04: search クランプス
  if(c.no===4){
    if(side!=="P1") return; // 今回はプレイヤー側優先で実装（AIも後で拡張可能）
    const yes = await askYesNo("登場時効果", "聖ラウス：タグ「クランプス」をサーチしますか？");
    if(yes) await doSearchByTag(side, "クランプス", 1);
    return;
  }

  // No05: draw2
  if(c.no===5){
    if(side!=="P1") return;
    const yes = await askYesNo("登場時効果", "統括AI タータ：2枚ドローしますか？");
    if(yes){
      draw(side, 2);
      log("あなた：2枚ドロー");
      renderAll();
    }
    return;
  }

  // No01: enter (kensan) -> optional search
  if(c.no===1){
    if(side!=="P1") return;
    const yes = await askYesNo("見参/登場時効果", "クルエラ：カード名に「黒魔法」を含むカードをサーチしますか？（1ターンに1度）");
    if(yes){
      await doSearchByNameContains(side, "黒魔法", 1);
      state.flags.P1.c01Used = true;
    }
    return;
  }
}

function askYesNo(title, message){
  return askChoice(title, message, [
    {label:"はい", value:true},
    {label:"いいえ", value:false},
  ]);
}

async function doSearchByTag(side, tag, n=1){
  const p = state[side];
  const candidates = [];
  for(const c of p.deck) if(hasTag(c, tag)) candidates.push({from:"deck", card:c});
  for(const c of p.wing) if(hasTag(c, tag)) candidates.push({from:"wing", card:c});
  if(!candidates.length){
    log(`${side==="P1"?"あなた":"AI"}：サーチ対象なし（タグ:${tag}）`, "warn");
    return;
  }
  for(let k=0;k<n;k++){
    const items = candidates.map((x, idx)=>({
      label: `${x.card.name}（${x.from.toUpperCase()}）`,
      sub: `RANK ${x.card.rank||0} / ATK ${x.card.atk||0}`,
      value: idx,
      card: x.card
    }));
    const pick = await askChoice("サーチ", `タグ「${tag}」から手札に加えるカードを選んでください。`, items);
    const chosen = candidates[Number(pick)];
    if(!chosen) return;

    if(chosen.from==="deck"){
      const di = p.deck.findIndex(x=>x===chosen.card);
      const got = p.deck.splice(di,1)[0];
      p.hand.push(got);
    }else{
      const wi = p.wing.findIndex(x=>x===chosen.card);
      const got = p.wing.splice(wi,1)[0];
      p.hand.push(got);
    }
    log(`${side==="P1"?"あなた":"AI"}：サーチ→手札 ${chosen.card.name}`);
    renderAll();
  }
}

async function doSearchByTitle(side, titleTag, n=1){
  const p = state[side];
  const candidates = [];
  for(const c of p.deck) if(hasTitle(c, titleTag)) candidates.push({from:"deck", card:c});
  if(!candidates.length){
    log(`${side==="P1"?"あなた":"AI"}：サーチ対象なし（タイトルタグ:${titleTag}）`, "warn");
    return;
  }
  for(let k=0;k<n;k++){
    const items = candidates.map((x, idx)=>({
      label: `${x.card.name}（DECK）`,
      sub: `RANK ${x.card.rank||0} / ATK ${x.card.atk||0}`,
      value: idx,
      card: x.card
    }));
    const pick = await askChoice("サーチ", `タイトルタグ「${titleTag}」から手札に加えるカードを選んでください。`, items);
    const chosen = candidates[Number(pick)];
    if(!chosen) return;
    const di = p.deck.findIndex(x=>x===chosen.card);
    const got = p.deck.splice(di,1)[0];
    p.hand.push(got);
    log(`${side==="P1"?"あなた":"AI"}：サーチ→手札 ${got.name}`);
    renderAll();
  }
}

async function doSearchByNameContains(side, text, n=1){
  const p = state[side];
  const candidates = [];
  for(const c of p.deck) if((c.name||"").includes(text)) candidates.push({from:"deck", card:c});
  for(const c of p.wing) if((c.name||"").includes(text)) candidates.push({from:"wing", card:c});
  if(!candidates.length){
    log(`${side==="P1"?"あなた":"AI"}：サーチ対象なし（名前に${text}）`, "warn");
    return;
  }
  for(let k=0;k<n;k++){
    const items = candidates.map((x, idx)=>({
      label: `${x.card.name}（${x.from.toUpperCase()}）`,
      sub: `RANK ${x.card.rank||0} / ATK ${x.card.atk||0}`,
      value: idx,
      card: x.card
    }));
    const pick = await askChoice("サーチ", `カード名に「${text}」を含むカードを選んでください。`, items);
    const chosen = candidates[Number(pick)];
    if(!chosen) return;

    if(chosen.from==="deck"){
      const di = p.deck.findIndex(x=>x===chosen.card);
      const got = p.deck.splice(di,1)[0];
      p.hand.push(got);
    }else{
      const wi = p.wing.findIndex(x=>x===chosen.card);
      const got = p.wing.splice(wi,1)[0];
      p.hand.push(got);
    }
    log(`${side==="P1"?"あなた":"AI"}：サーチ→手札 ${chosen.card.name}`);
    renderAll();
  }
}

/* ---------------- Interactions (Player) ---------------- */
function canPlayNow(){
  return state.activeSide==="P1" && state.phase==="MAIN";
}

async function onClickYourC(pos){
  // 置く（手札選択中）
  if(canPlayNow() && state.selectedHandIndex!=null){
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];
    if(!isCharacter(card)){ log("Cにはキャラクターのみ置けます", "warn"); return; }
    if(card.summon==="kensan"){ log("このカードは登場できません。空きCを長押しして見参してください", "warn"); return; }
    if(state.normalSummonUsed){ log("登場（通常）はターン1回です", "warn"); return; }

    state.P1.C[pos]=card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex=null;
    state.normalSummonUsed=true;

    log(`登場：${card.name}`);
    renderAll();
    await maybePromptOnEnter("P1", pos);
    return;
  }

  // BATTLE：攻撃選択（タップで攻撃者選択）
  if(state.activeSide==="P1" && state.phase==="BATTLE"){
    if(!state.P1.C[pos]) return;
    state.battle.attackerPos = pos;
    log(`攻撃者選択：${state.P1.C[pos].name}`);
    renderAll();
    return;
  }

  // 手札未選択の時：カードアクション（任意効果）
  const c = state.P1.C[pos];
  if(!c) return;
  if(state.activeSide!=="P1") return;

  if(state.phase==="MAIN"){
    await openCharActionMenu("P1", pos);
  }else{
    openViewer(c);
  }
}

async function openCharActionMenu(side, pos){
  const c = state[side].C[pos];
  if(!c) return;

  const items = [{label:"詳細を見る", value:"view", card:c, sub:`現在ATK ${getCurrentATK(side,pos)}`}];

  // 01: search black magic once per turn
  if(c.no===1){
    const used = !!state.flags.P1.c01Used;
    items.push({label:`効果：黒魔法サーチ（${used?"使用済":"未使用"}）`, value:"c01"});
  }
  // 03: buff self
  if(c.no===3){
    items.push({label:"効果：ATK+1000（このターン）", value:"c03"});
  }
  // 05: exchange BUGBUG
  if(c.no===5){
    items.push({label:"効果：手札→ウイング交換（最大2）", value:"c05"});
  }
  // 06: debuff enemy
  if(c.no===6){
    items.push({label:"効果：相手ATK-1000（このターン）", value:"c06"});
  }
  // 09/10: partner summon
  if(c.no===9){
    items.push({label:"効果：手札の小次郎を見参", value:"c09"});
  }
  if(c.no===10){
    items.push({label:"効果：手札の小太郎を見参", value:"c10"});
  }
  // 13: quick debuff by sacrificing self
  if(c.no===13){
    items.push({label:"効果：自分をウイング→相手ATK-1000（このターン）", value:"c13"});
  }

  const pick = await askChoice("キャラクター操作", c.name, items);
  if(pick==="view"){ openViewer(c); return; }

  if(pick==="c01"){
    if(state.flags.P1.c01Used){ log("クルエラ：このターンは既に使用済です", "warn"); return; }
    await doSearchByNameContains("P1","黒魔法",1);
    state.flags.P1.c01Used = true;
    return;
  }
  if(pick==="c03"){
    state.temp.atkDelta.P1[pos] += 1000;
    log(`ニコラ：ATK+1000（このターン）`);
    renderAll();
    return;
  }
  if(pick==="c05"){
    // send up to 2 hand to wing, then search BUGBUG same count
    const p = state.P1;
    if(p.hand.length===0){ log("手札がありません", "warn"); return; }

    const maxSend = Math.min(2, p.hand.length);
    const toSend = [];

    for(let k=0;k<maxSend;k++){
      const handItems = p.hand.map((hc, idx)=>({
        label:`手札：${hc.name}`,
        sub:`RANK ${hc.rank||0} / ATK ${hc.atk||0}`,
        value: idx,
        card: hc
      }));
      handItems.unshift({label:"ここで終了", value:"stop"});
      const sel = await askChoice("交換（送るカード）", `ウイングへ送るカードを選択（${toSend.length}/${maxSend}）`, handItems);
      if(sel==="stop") break;
      const idx = Number(sel);
      const moved = p.hand.splice(idx,1)[0];
      p.wing.push(moved);
      toSend.push(moved);
      log(`タータ：手札→ウイング ${moved.name}`);
      renderAll();
      if(p.hand.length===0) break;
    }
    if(toSend.length>0){
      await doSearchByTitle("P1","BUGBUG西遊記", toSend.length);
    }
    return;
  }
  if(pick==="c06"){
    const enemies = listEnemyChars("P1");
    if(!enemies.length){ log("相手キャラクターがいません", "warn"); return; }
    const sel = await askChoice("エフィ：ATK-1000", "対象を選んでください（このターン）",
      enemies.map(x=>({label:`相手C${x.pos+1}：${x.card.name}`, value:x.pos, card:x.card, sub:`現在ATK ${getCurrentATK("AI",x.pos)}`}))
    );
    const ePos = Number(sel);
    state.temp.atkDelta.AI[ePos] -= 1000;
    log(`エフィ：相手ATK-1000（このターン）`);
    renderAll();
    return;
  }
  if(pick==="c09"){
    await doPartnerSummonFromHand(9, 10);
    return;
  }
  if(pick==="c10"){
    await doPartnerSummonFromHand(10, 9);
    return;
  }
  if(pick==="c13"){
    const enemies = listEnemyChars("P1");
    if(!enemies.length){ log("相手キャラクターがいません", "warn"); return; }
    const sel = await askChoice("スタマックス：ATK-1000", "対象を選んでください（このターン）",
      enemies.map(x=>({label:`相手C${x.pos+1}：${x.card.name}`, value:x.pos, card:x.card, sub:`現在ATK ${getCurrentATK("AI",x.pos)}`}))
    );
    const ePos = Number(sel);
    // 自分をウイング
    moveCharToWingWithEquip("P1", pos);
    state.temp.atkDelta.AI[ePos] -= 1000;
    log(`スタマックス：相手ATK-1000（このターン）`);
    renderAll();
    return;
  }
}

async function doPartnerSummonFromHand(selfNo, partnerNo){
  if(!canPlayNow()) return;
  const p = state.P1;
  const partnerIdx = p.hand.findIndex(x=>x.no===partnerNo);
  if(partnerIdx<0){ log("手札に相方がいません", "warn"); return; }
  const empty = p.C.map((x,i)=> x?null:i).filter(x=>x!=null);
  if(!empty.length){ log("空きCがありません", "warn"); return; }
  const cands = empty.map(i=>({label:`空きC${i+1}`, value:i}));
  const pos = Number(await askChoice("見参", "置く場所を選んでください。", cands));
  const card = p.hand.splice(partnerIdx,1)[0];
  p.C[pos]=card;
  log(`見参：${card.name}`);
  renderAll();
  await maybePromptOnEnter("P1", pos);
}

async function onLongPressEmptyCForKensan(pos){
  if(!canPlayNow()) return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card) || card.summon!=="kensan") return;

  // cost candidates (hand except selected, plus stage C/E)
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
    state.P1.wing.push(moved);
    if(idx < state.selectedHandIndex) state.selectedHandIndex -= 1;
  }else if(from==="C"){
    moveCharToWingWithEquip("P1", idx);
  }else if(from==="E"){
    const moved = state.P1.E[idx];
    state.P1.E[idx]=null;
    state.P1.wing.push(moved);
    log(`あなた：E→ウイング ${moved.name}`);
  }

  const placed = state.P1.hand.splice(state.selectedHandIndex,1)[0];
  state.P1.C[pos]=placed;
  state.selectedHandIndex=null;

  log(`見参：${placed.name}`);
  renderAll();
  await maybePromptOnEnter("P1", pos);
}

async function onClickYourE(pos){
  if(!canPlayNow()) return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]){ log("そのEは埋まっています", "warn"); return; }

  const card = state.P1.hand[state.selectedHandIndex];

  // キャラはEに置けない
  if(isCharacter(card)){ log("Eにはエフェクト/アイテムのみ置けます", "warn"); return; }

  // エフェクト：即時発動 → ウイング（Eは占有しない）
  if(isEffect(card)){
    const ok = await resolveEffectFromHand_P1(card);
    // 成功したら手札からウイングへ（カード自体）
    if(ok){
      state.P1.hand.splice(state.selectedHandIndex,1);
      state.P1.wing.push(card);
      state.selectedHandIndex=null;
      log(`発動→ウイング：${card.name}`);
      renderAll();
    }
    return;
  }

  // アイテム：Eスロット占有→装備先選択→Eに残る
  if(isItem(card)){
    const chars = listStageChars("P1");
    if(!chars.length){ log("装備先のキャラクターがいません", "warn"); return; }

    const sel = await askChoice("装備先選択", `${card.name}：装備するキャラクターを選んでください。`,
      chars.map(x=>({
        label:`C${x.pos+1}：${x.card.name}`,
        value:x.pos,
        card:x.card,
        sub:`現在ATK ${getCurrentATK("P1",x.pos)}`
      }))
    );
    const cPos = Number(sel);

    // Eに配置し、equipTo を記録
    card.equipTo = { side:"P1", pos:cPos };
    state.P1.E[pos]=card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex=null;

    log(`装備：${card.name} → ${state.P1.C[cPos].name}（E${pos+1}占有）`);

    // No11は「登場した時」＝配置時に即装備なのでここでOK
    // ほかアイテムも同様
    renderAll();
    return;
  }
}

/* ---------------- Effect implementations (P1) ---------------- */
async function resolveEffectFromHand_P1(card){
  // 条件チェックなどを含めて「発動できた/できない」を返す
  if(card.no===2){
    // クルエラが場にいる時のみ
    const ok = state.P1.C.some(x=>x && x.name==="黒の魔法使いクルエラ");
    if(!ok){ log("フレイムバレット：クルエラが場にいません", "warn"); return false; }

    const mode = await askChoice("フレイムバレット", "効果を選んでください。", [
      {label:"ATKが最も高い相手キャラ1体をウイングへ", value:"high"},
      {label:"rank4以下の相手キャラをすべてウイングへ", value:"r4"},
    ]);

    if(mode==="high"){
      const enemies = listEnemyChars("P1");
      if(!enemies.length){ log("相手キャラクターがいません", "warn"); return false; }
      // 現在ATKで最大
      let best = enemies[0];
      for(const e of enemies){
        if(getCurrentATK("AI", e.pos) > getCurrentATK("AI", best.pos)) best = e;
      }
      moveCharToWingWithEquip("AI", best.pos);
      log(`フレイムバレット：最大ATKをウイング`);
      return true;
    }else{
      // rank4以下をすべて
      let moved = 0;
      for(let i=0;i<3;i++){
        const ec = state.AI.C[i];
        if(ec && (ec.rank||0) <= 4){
          moveCharToWingWithEquip("AI", i);
          moved++;
        }
      }
      if(moved===0){ log("対象がいません（rank4以下）", "warn"); return false; }
      log(`フレイムバレット：rank4以下をウイング（${moved}体）`);
      return true;
    }
  }

  if(card.no===8){
    log("手形：これは相手ターンに自動で発動確認します（今は手札から通常発動できません）", "warn");
    return false;
  }

  if(card.no===14){
    log("記憶抹消：これは相手が効果発動した時に自動で発動確認します（今は手札から通常発動できません）", "warn");
    return false;
  }

  if(card.no===15){
    log("闘：BATTLE中に自分キャラを選んで発動してください（手札選択→自分Cタップ）", "warn");
    return false;
  }

  if(card.no===16){
    // 自分ターンのみ：最低ATKの相手をウイング
    const enemies = listEnemyChars("P1");
    if(!enemies.length){ log("相手キャラクターがいません", "warn"); return false; }
    let best = enemies[0];
    for(const e of enemies){
      if(getCurrentATK("AI", e.pos) < getCurrentATK("AI", best.pos)) best = e;
    }
    moveCharToWingWithEquip("AI", best.pos);
    log("力こそパワー！！：最小ATKをウイング");
    return true;
  }

  if(card.no===17){
    log("キャトル：味方がバトルでウイングへ送られた時に自動で発動確認します", "warn");
    return false;
  }

  // その他：未実装扱い
  log(`未実装エフェクト：${card.name}`, "warn");
  return false;
}

/* ---------------- Battle ---------------- */
async function battleAttack_P1(targetSide, targetPos){
  // attacker selected?
  const aPos = state.battle.attackerPos;
  if(aPos==null){ log("攻撃者を選択してください（自分Cをタップ）", "warn"); return; }
  const attacker = state.P1.C[aPos];
  if(!attacker){ log("攻撃者がいません", "warn"); return; }

  // attack limit per turn
  const limit = getAttackLimit("P1", aPos);
  if(state.flags.P1.attacks[aPos] >= limit){
    log("そのキャラクターはこのターンこれ以上攻撃できません", "warn");
    return;
  }

  // No07 direct attack restriction
  if(attacker.no===7 && targetSide==="AI" && targetPos==="DIRECT"){
    log("まひる：相手シールド0の時、直接攻撃できません", "warn");
    return;
  }

  // 闘（No15）：BATTLE中の手札→自分キャラタップで発動
  // （ここでは攻撃処理）

  state.flags.P1.attacks[aPos]++;

  // Direct attack (shield)
  if(targetPos==="DIRECT"){
    log(`攻撃：${attacker.name} → 相手シールド`);
    await applyAttackToShield("P1");
    state.battle.attackerPos = null;
    renderAll();
    return;
  }

  const defender = state.AI.C[targetPos];
  if(!defender){ log("攻撃先がいません", "warn"); return; }

  // Attack resolve
  const atkA = getCurrentATK("P1", aPos);
  const atkD = getCurrentATK("AI", targetPos);

  log(`バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  // battle indestructible (No12) once per turn
  const defIs12 = defender.no===12;
  const attIs12 = attacker.no===12;

  if(atkA > atkD){
    // defender loses
    if(defIs12 && !state.flags.AI.battleSave12[targetPos]){
      state.flags.AI.battleSave12[targetPos] = true;
      log("班目プロデューサー：このターンはバトル破壊を1回無効");
    }else{
      moveCharToWingWithEquip("AI", targetPos);

      // No19 draw on kill (if equipped and wearer has proper tags -> already in bonus; draw trigger regardless? text says if equipped by 勇者/剣士)
      await maybeDrawOnAlongditeKill("P1", aPos);
    }
  }else if(atkA < atkD){
    // attacker loses
    if(attIs12 && !state.flags.P1.battleSave12[aPos]){
      state.flags.P1.battleSave12[aPos] = true;
      log("班目プロデューサー：このターンはバトル破壊を1回無効");
    }else{
      moveCharToWingWithEquip("P1", aPos);

      // No17 trigger if player lost by battle
      await maybeTriggerQuatre("P1");
    }
  }else{
    // tie: both to wing (No12 may save)
    let savedA = false;
    let savedD = false;

    if(attIs12 && !state.flags.P1.battleSave12[aPos]){
      state.flags.P1.battleSave12[aPos] = true;
      savedA = true;
      log("班目プロデューサー：このターンはバトル破壊を1回無効（引き分け）");
    }
    if(defIs12 && !state.flags.AI.battleSave12[targetPos]){
      state.flags.AI.battleSave12[targetPos] = true;
      savedD = true;
      log("班目プロデューサー：このターンはバトル破壊を1回無効（引き分け）");
    }
    if(!savedA) moveCharToWingWithEquip("P1", aPos);
    if(!savedD) moveCharToWingWithEquip("AI", targetPos);
    if(!savedA) await maybeTriggerQuatre("P1");
  }

  // clear selection
  state.battle.attackerPos = null;
  renderAll();
}

function getAttackLimit(side, cPos){
  const c = state[side].C[cPos];
  if(!c) return 0;
  // No07: if has any equipped item -> 2 attacks
  if(c.no===7){
    const hasEquip = state[side].E.some(it=> it && isItem(it) && it.equipTo && it.equipTo.pos===cPos);
    if(hasEquip) return 2;
  }
  return 1;
}

async function applyAttackToShield(attackerSide){
  const defenderSide = (attackerSide==="P1") ? "AI" : "P1";
  const shields = state[defenderSide].shield;
  const idx = shields.findIndex(Boolean);
  if(idx<0){
    log("相手シールドがありません（ダイレクト扱い）");
    return;
  }
  // 1枚割ってウイングへ
  const card = shields[idx];
  shields[idx] = null;
  state[defenderSide].wing.push(card);
  log(`${defenderSide==="AI"?"相手":"あなた"}：シールド破壊→ウイング（${card.name}）`);
}

async function maybeTriggerQuatre(playerSide){
  // playerSide is P1 only in current call
  const p = state[playerSide];
  const idx = p.hand.findIndex(x=>x.no===17);
  if(idx<0) return;
  const yes = await askYesNo("キャトルミューティレーション", "発動しますか？（相手キャラ1体を手札に戻す）");
  if(!yes) return;

  const enemies = listEnemyChars(playerSide);
  if(!enemies.length){ log("相手キャラクターがいません", "warn"); return; }

  const sel = await askChoice("戻す対象", "相手キャラクターを選んでください。",
    enemies.map(x=>({
      label:`相手C${x.pos+1}：${x.card.name}`,
      value:x.pos,
      card:x.card,
      sub:`現在ATK ${getCurrentATK("AI",x.pos)}`
    }))
  );
  const ePos = Number(sel);

  // remove enemy char (and its equips)
  const enemy = "AI";
  const c = state[enemy].C[ePos];
  // 装備剥がし→ウイング
  for(let e=0;e<3;e++){
    const it = state[enemy].E[e];
    if(it && isItem(it) && it.equipTo && it.equipTo.pos===ePos){
      state[enemy].E[e]=null;
      state[enemy].wing.push(it);
      log(`相手：装備解除→ウイング ${it.name}`);
    }
  }
  state[enemy].C[ePos]=null;
  state[enemy].hand.push(c);
  log(`キャトル：相手キャラを手札へ戻した（${c.name}）`);

  // move Quatre from hand to wing
  const used = p.hand.splice(idx,1)[0];
  p.wing.push(used);
  log("キャトル：発動→ウイング");
  renderAll();
}

async function maybeDrawOnAlongditeKill(side, attackerPos){
  // No19 equipped on attacker and wearer has (勇者 or 剣士) -> draw 1 on kill
  const p = state[side];
  const ch = p.C[attackerPos];
  if(!ch) return;

  // find item 19 equipped to attacker
  let has19 = false;
  for(let e=0;e<3;e++){
    const it = p.E[e];
    if(it && isItem(it) && it.no===19 && it.equipTo && it.equipTo.pos===attackerPos){
      has19 = true;
      break;
    }
  }
  if(!has19) return;
  if(!(hasTag(ch,"勇者") || hasTag(ch,"剣士"))) return;

  draw(side,1);
  log(`${side==="P1"?"あなた":"AI"}：アロングダイト効果→1ドロー`);
}

/* ---------------- Hand tap logic (BATTLE + 闘の発動) ---------------- */
async function tryApplyTouToYourC(targetPos){
  // No15 in hand selected?
  if(state.selectedHandIndex==null) return false;
  const card = state.P1.hand[state.selectedHandIndex];
  if(!card || card.no!==15) return false;
  if(!(state.phase==="BATTLE")){ log("闘はBATTLE中のみ発動できます", "warn"); return true; }

  // apply +1000 to your chosen character
  state.temp.atkDelta.P1[targetPos] += 1000;
  // move Tou to wing
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.P1.wing.push(card);
  state.selectedHandIndex=null;

  log("闘：ATK+1000（このターン）→発動後ウイング");
  renderAll();
  return true;
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
  // enemy E
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const eCard = state.AI.E[i];
    el.aiE.appendChild(makeSlot(eCard, {enemy:true}));
  }

  // enemy C
  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    let badge = "";
    let buffed = false;
    if(c){
      const now = getCurrentATK("AI", i);
      const base = c.atk||0;
      const diff = now-base;
      if(diff!==0){ badge = `${diff>0?"+":""}${diff}`; buffed=true; }
      // 装備中
      const hasEquip = state.AI.E.some(it=> it && isItem(it) && it.equipTo && it.equipTo.pos===i);
      if(hasEquip){ badge = badge ? `${badge}/EQ` : "EQ"; buffed=true; }
    }
    el.aiC.appendChild(makeSlot(c, {enemy:true, badgeText:badge, buffed}));
  }

  // your C
  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (canPlayNow() && state.selectedHandIndex!=null && !c);
    const sel = (state.phase==="BATTLE" && state.battle.attackerPos===i);

    let badge = "";
    let buffed = false;
    if(c){
      const now = getCurrentATK("P1", i);
      const base = c.atk||0;
      const diff = now-base;
      if(diff!==0){ badge = `${diff>0?"+":""}${diff}`; buffed=true; }
      const hasEquip = state.P1.E.some(it=> it && isItem(it) && it.equipTo && it.equipTo.pos===i);
      if(hasEquip){ badge = badge ? `${badge}/EQ` : "EQ"; buffed=true; }
    }

    const slot = makeSlot(c, {glow, sel, badgeText:badge, buffed});
    // ★左端不具合回避：passiveを外し、click優先
    slot.addEventListener("click", async (ev)=>{ ev.preventDefault(); ev.stopPropagation();
      // BATTLE中：手札の闘を適用できる
      if(state.activeSide==="P1" && state.phase==="BATTLE"){
        const applied = await tryApplyTouToYourC(i);
        if(applied) return;
      }
      await onClickYourC(i);
    });
    if(!c) bindLongPress(slot, ()=> onLongPressEmptyCForKensan(i), 420);
    el.pC.appendChild(slot);
  }

  // your E
  el.pE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const glow = (canPlayNow() && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {glow});
    slot.addEventListener("click", async (ev)=>{ ev.preventDefault(); ev.stopPropagation(); await onClickYourE(i); });
    el.pE.appendChild(slot);
  }
}

function renderHand(){
  el.hand.innerHTML="";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className="handCard";

    const playable = canPlayNow() || (state.phase==="BATTLE" && state.activeSide==="P1");
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;

    h.addEventListener("click", (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if(state.activeSide!=="P1") return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      renderAll();
    });
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

    // BATTLE中：シールドを攻撃対象にできる（相手側のみ）
    if(side==="AI"){
      slot.onclick = async (ev)=>{
        if(state.activeSide!=="P1" || state.phase!=="BATTLE") return;
        ev.preventDefault(); ev.stopPropagation();

        const remain = countShields("AI");
        if(remain<=0){ log("相手シールドがありません", "warn"); return; }
        await battleAttack_P1("AI","DIRECT");
      };
    }
  });
}

function renderPiles(){
  // デッキのみ裏面を貼る。wing/outside は dim のまま。
  document.querySelectorAll(".pileCard").forEach((n)=>{
    const pile = n.getAttribute("data-pile") || "";
    if(pile.includes("DECK")){
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
function resetTurnFlags(side){
  state.flags[side].negUsed = false;
  state.flags[side].attacks = [0,0,0];
  state.flags[side].battleSave12 = [false,false,false];
}
function clearTempDeltas(){
  state.temp.atkDelta.P1 = [0,0,0];
  state.temp.atkDelta.AI = [0,0,0];
}

function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.battle.attackerPos=null;
    clearTempDeltas();
    resetTurnFlags(state.activeSide);
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
    // enemy turn start
    state.activeSide="AI";
    state.phase="START";
    state.selectedHandIndex=null;
    state.battle.attackerPos=null;
    clearTempDeltas();
    resetTurnFlags("AI");

    renderAll();
    await runAITurn();
  }
}

/* ---------------- AI (C案寄り：置く・簡易効果・攻撃) ---------------- */
async function runAITurn(){
  log("相手ターン開始");
  // 相手ターン開始時（P1装備18のランダムウイング）
  await applyRadiationStartTrigger();

  // AI START -> DRAW
  state.phase="DRAW";
  draw("AI", 1);
  renderAll();
  await sleep(250);

  // MAIN
  state.phase="MAIN";
  renderAll();

  // 1) 可能ならキャラを置く（通常1回）
  let placed = false;
  if(!state.normalSummonUsed){
    const idxChar = state.AI.hand.findIndex(c=>isCharacter(c) && c.summon!=="kensan");
    const emptyC = state.AI.C.findIndex(x=>!x);
    if(idxChar>=0 && emptyC>=0){
      const card = state.AI.hand.splice(idxChar,1)[0];
      state.AI.C[emptyC] = card;
      state.normalSummonUsed = true;
      placed = true;
      log(`相手：登場 ${card.name}`);
    }
  }

  // 2) 可能ならアイテムを装備（E空きがあり、装備先がいる）
  {
    const emptyE = state.AI.E.findIndex(x=>!x);
    const idxItem = state.AI.hand.findIndex(c=>isItem(c));
    const chars = listStageChars("AI");
    if(emptyE>=0 && idxItem>=0 && chars.length){
      const it = state.AI.hand.splice(idxItem,1)[0];
      // 装備先はランダム
      const target = chars[Math.floor(Math.random()*chars.length)].pos;
      it.equipTo = {side:"AI", pos:target};
      state.AI.E[emptyE] = it;
      log(`相手：装備 ${it.name}`);
      placed = true;
    }
  }

  // 3) 可能ならエフェクト（最小限）：No16 / No2（条件満たす時）など
  //    ここでは簡略：No16があれば優先で使用
  {
    const idx16 = state.AI.hand.findIndex(c=>c.no===16);
    if(idx16>=0 && listEnemyChars("AI").length){
      // 相手(=P1)の最低ATKをウイング
      const enemies = listEnemyChars("AI"); // P1のキャラ一覧
      let best = enemies[0];
      for(const e of enemies){
        if(getCurrentATK("P1", e.pos) < getCurrentATK("P1", best.pos)) best = e;
      }
      // プレイヤー側の「無効」(08/14) チェック
      const neg = await maybePlayerNegate("AI", "effect", "力こそパワー！！");
      if(!neg){
        moveCharToWingWithEquip("P1", best.pos);
        log("相手：力こそパワー！！ 発動");
        const used = state.AI.hand.splice(idx16,1)[0];
        state.AI.wing.push(used);
      }else{
        // negate handled inside
        const used = state.AI.hand.splice(idx16,1)[0];
        state.AI.wing.push(used);
      }
      placed = true;
    }
  }

  renderAll();
  await sleep(300);

  // BATTLE：可能なら攻撃（最大1体だけでも良い）
  state.phase="BATTLE";
  renderAll();
  await sleep(220);

  await aiDoAttackOnceOrTwice();

  // END
  state.phase="END";
  enforceHandLimit("AI");
  renderAll();

  // back to player
  state.activeSide="P1";
  state.turn++;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.battle.attackerPos=null;
  clearTempDeltas();
  resetTurnFlags("P1");

  log(`TURN ${state.turn} あなたのターン`);
  renderAll();

  // 相手先攻の場合でも止まらないように：ここで必ず復帰
}

/* 相手ターン開始時：P1が「18(射手装備)」なら相手手札1枚ランダム→ウイング */
async function applyRadiationStartTrigger(){
  // P1のEを見て、18が装備されていて、装備者が射手なら発動
  const p = state.P1;
  for(let e=0;e<3;e++){
    const it = p.E[e];
    if(it && isItem(it) && it.no===18 && it.equipTo){
      const wearer = p.C[it.equipTo.pos];
      if(wearer && hasTag(wearer,"射手")){
        if(state.AI.hand.length>0){
          const idx = Math.floor(Math.random()*state.AI.hand.length);
          const moved = state.AI.hand.splice(idx,1)[0];
          state.AI.wing.push(moved);
          log(`放射型：相手手札→ウイング（ランダム）`);
          renderAll();
          await sleep(220);
        }
      }
    }
  }
}

/* プレイヤーの無効カード（08/14）をAIの効果発動時に確認 */
async function maybePlayerNegate(aiSide, kind, effectName){
  // 08：相手ターンに1度
  if(!state.flags.P1.negUsed){
    const idx8 = state.P1.hand.findIndex(x=>x.no===8);
    if(idx8>=0){
      const yes = await askYesNo("無効確認", `相手が効果を発動：${effectName}\n手形で無効にしますか？（この相手ターン1度）`);
      if(yes){
        state.flags.P1.negUsed = true;
        const used = state.P1.hand.splice(idx8,1)[0];
        state.P1.wing.push(used);
        log("手形：相手の効果を無効");
        renderAll();
        return true;
      }
    }
  }
  // 14：効果発動に反応
  const idx14 = state.P1.hand.findIndex(x=>x.no===14);
  if(idx14>=0){
    const yes = await askYesNo("無効確認", `相手が効果を発動：${effectName}\n記憶抹消で無効にしますか？`);
    if(yes){
      const used = state.P1.hand.splice(idx14,1)[0];
      state.P1.wing.push(used);
      log("記憶抹消：相手の効果を無効 → ウイング");
      renderAll();
      return true;
    }
  }
  return false;
}

async function aiDoAttackOnceOrTwice(){
  // AI側の攻撃：まず攻撃者を選ぶ（ATK高い順）
  const attackers = listStageChars("AI")
    .map(x=>({pos:x.pos, card:x.card, atk:getCurrentATK("AI",x.pos)}))
    .sort((a,b)=>b.atk-a.atk);

  if(!attackers.length){
    log("相手：攻撃できるキャラがいない");
    return;
  }

  // 相手は最大2回分も含め、1〜2回程度攻撃
  for(const a of attackers){
    const limit = getAttackLimit("AI", a.pos);
    for(let k=0;k<limit;k++){
      // まだ攻撃回数残ってるか
      if(state.flags.AI.attacks[a.pos] >= limit) break;

      // 攻撃先：プレイヤーのキャラがいるなら最弱を狙う、いなければシールド
      const pChars = listStageChars("P1");
      if(pChars.length){
        let target = pChars[0];
        for(const t of pChars){
          if(getCurrentATK("P1", t.pos) < getCurrentATK("P1", target.pos)) target = t;
        }
        await aiBattleResolve(a.pos, target.pos);
        renderAll();
        await sleep(260);
      }else{
        // シールド攻撃
        if(countShields("P1")>0){
          log(`相手攻撃：${state.AI.C[a.pos].name} → あなたシールド`);
          state.flags.AI.attacks[a.pos]++;
          await applyAttackToShield("AI");
          renderAll();
          await sleep(240);
        }else{
          // 直接勝ち扱いはまだ入れていない（演出なしで終わらないように）
          log("あなたのシールドがありません（※勝敗演出は次段階で実装）");
          break;
        }
      }
    }
  }
}

async function aiBattleResolve(aPos, pPos){
  const attacker = state.AI.C[aPos];
  const defender = state.P1.C[pPos];
  if(!attacker || !defender) return;

  // プレイヤー側「闘」はAI戦闘中に自動では使いません（後で拡張可）

  const limit = getAttackLimit("AI", aPos);
  if(state.flags.AI.attacks[aPos] >= limit) return;
  state.flags.AI.attacks[aPos]++;

  // No07 restriction only for that card (player-side)
  const atkA = getCurrentATK("AI", aPos);
  const atkD = getCurrentATK("P1", pPos);

  log(`相手バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  const defIs12 = defender.no===12;
  const attIs12 = attacker.no===12;

  if(atkA > atkD){
    if(defIs12 && !state.flags.P1.battleSave12[pPos]){
      state.flags.P1.battleSave12[pPos]=true;
      log("班目プロデューサー：このターンはバトル破壊を1回無効");
    }else{
      moveCharToWingWithEquip("P1", pPos);
      await maybeTriggerQuatre("P1");
      await maybeDrawOnAlongditeKill("AI", aPos);
    }
  }else if(atkA < atkD){
    if(attIs12 && !state.flags.AI.battleSave12[aPos]){
      state.flags.AI.battleSave12[aPos]=true;
      log("相手：班目プロデューサーが破壊無効");
    }else{
      moveCharToWingWithEquip("AI", aPos);
    }
  }else{
    let savedA=false, savedD=false;
    if(attIs12 && !state.flags.AI.battleSave12[aPos]){
      state.flags.AI.battleSave12[aPos]=true; savedA=true;
      log("相手：班目プロデューサー破壊無効（引き分け）");
    }
    if(defIs12 && !state.flags.P1.battleSave12[pPos]){
      state.flags.P1.battleSave12[pPos]=true; savedD=true;
      log("班目プロデューサー破壊無効（引き分け）");
    }
    if(!savedA) moveCharToWingWithEquip("AI", aPos);
    if(!savedD) moveCharToWingWithEquip("P1", pPos);
    if(!savedD) await maybeTriggerQuatre("P1");
  }
}

/* ---------------- Start game ---------------- */
function startGame(){
  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.battle.attackerPos=null;

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

  clearTempDeltas();
  resetTurnFlags("P1");
  resetTurnFlags("AI");
  state.flags.P1.c01Used = false;

  state.firstSide = (Math.random()<0.5) ? "P1" : "AI";
  state.activeSide = state.firstSide;

  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log(`ゲーム開始：初手4 / シールド3 / 先攻=${el.firstInfo.textContent}`);

  renderAll();

  // ★相手先攻でも止めない：ここで即AIターンを走らせる
  if(state.firstSide==="AI"){
    // 相手が先に動いてからあなたに返す
    (async ()=>{
      await sleep(350);
      await runAITurn();
    })();
  }
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
  el.btnStart.addEventListener("click", go);
  el.title.addEventListener("click", go);
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

  // BATTLE中：相手Cをタップで攻撃対象に
  el.aiC.addEventListener("click", async (ev)=>{
    if(state.activeSide!=="P1" || state.phase!=="BATTLE") return;
    const target = ev.target.closest?.(".slot");
    if(!target) return;
    // indexを取る
    const slots = Array.from(el.aiC.querySelectorAll(".slot"));
    const idx = slots.indexOf(target);
    if(idx<0) return;
    await battleAttack_P1("AI", idx);
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
  log("v50010：装備=E占有/効果自動ウイング/AI攻撃/左端C1タップ修正 を反映");
}

document.addEventListener("DOMContentLoaded", init);