/* =========================================================
  Manpuku World - v50014 (iPhone First / Full Replace)
  + FIXES (Requested)
  ① Cruella search: allow duplicates in hand (no hand-check), deck+wing
  ② TURN 1: No battle for both sides
  ③ Smarter AI: avoid suicidal attacks, protect shields; auto-use key skills
  - 40枚デッキ(20種×2)
  - 20枚効果実装（簡易AI含む）
  - 装備はE枠占有、キャラ破壊で装備もウイング
  - エフェクトは解決後ウイング
  - 置く/見参/発動のUIを“止めない”方向へ
  - 長押し反応 0.2秒延長（620ms）
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

function bindLongPress(node, fn, ms=620){ // ★0.2秒延長（420→620）
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
  // 01
  { no:1,  name:"黒の魔法使いクルエラ", type:"character",
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウイングからカード名に「黒魔法」を含むカード1枚を手札に加える。"
    ),
    rank:5, atk:2500, summon:"kensan" },

  // 02
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect",
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ステージに「クルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    ),
    rank:0, atk:0 },

  // 03
  { no:3,  name:"トナカイの少女ニコラ", type:"character",
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ),
    rank:5, atk:2000, summon:"kensan" },

  // 04
  { no:4,  name:"聖ラウス", type:"character",
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    ),
    rank:3, atk:1800 },

  // 05
  { no:5,  name:"統括AI タータ", type:"character",
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ),
    rank:4, atk:1000 },

  // 06
  { no:6,  name:"麗し令嬢エフィ", type:"character",
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    ),
    rank:5, atk:2000, summon:"kensan" },

  // 07
  { no:7,  name:"狩樹 まひる", type:"character",
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃する事ができる。\n" +
      "相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    ),
    rank:4, atk:1700 },

  // 08（手形はキャラクター扱い）
  { no:8,  name:"組織の男 手形", type:"character",
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText(
      "相手ターンに1度発動できる。相手が発動した効果を無効にする。\n" +
      "（キャラクター／エフェクト／アイテム、すべての効果に対して無効にできる）"
    ),
    rank:3, atk:1900 },

  // 09
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n" +
      "自分ステージに「小次郎」カードがある時、このカードのATK+500。"
    ),
    rank:3, atk:1600 },

  // 10
  { no:10, name:"小次郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n" +
      "自分ステージに「小太郎」カードがある時、このカードのATK+500。"
    ),
    rank:3, atk:1500 },

  // 11（司令はキャラクター、効果で“装備アイテム扱い”に化ける）
  { no:11, name:"司令", type:"character",
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。\n" +
      "（発動条件：自分ステージにこのカード以外のキャラクターがいる時のみ）"
    ),
    rank:2, atk:1200 },

  // 12
  { no:12, name:"班目プロデューサー", type:"character",
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"),
    rank:2, atk:800 },

  // 13
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character",
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:1, atk:100 },

  // 14
  { no:14, name:"記憶抹消", type:"effect",
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。"),
    rank:0, atk:0 },

  // 15（タイトルタグ「封印壊除」）
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect",
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    rank:0, atk:0 },

  // 16
  { no:16, name:"力こそパワー！！", type:"effect",
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"),
    rank:0, atk:0 },

  // 17
  { no:17, name:"キャトルミューティレーション", type:"effect",
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    rank:0, atk:0 },

  // 18
  { no:18, name:"a-xブラスター01 -放射型-", type:"item",
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    ),
    rank:0, atk:0 },

  // 19
  { no:19, name:"-聖剣- アロングダイト", type:"item",
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    ),
    rank:0, atk:0 },

  // 20
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
    summon: cardDef.summon || "normal", // normal / kensan
    // runtime
    tempAtk: 0, // end of turn
    equipUid: null, // このキャラに装備しているアイテム(1枚想定、必要なら拡張)
    // Eスロット側（装備カード側）
    equippedToUid: null, // itemが誰に装備されているか
    used: { perTurn:false }, // 汎用：1ターン1回
    flags: {
      producerSavedThisTurn:false, // No12
      attackedCountThisTurn:0,     // 攻撃回数
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

  // バトル状態
  battle: {
    attackerUid:null,
    attackerPos:null,
    attackerSide:null,
  },

  // viewer context
  viewer: { side:null, zone:null, pos:null, uid:null },

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },

  // ターン毎の制限（手形/クルエラ等）
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

/* ===== FIX②：TURN1 バトル不可（両者） ===== */
function isBattleLockedThisTurn(){
  return state.turn === 1;
}

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

/* Viewer */
function calcCurrentAtk(side, card){
  if(!card) return 0;
  let atk = card.baseAtk + (card.tempAtk||0);

  // 装備の加算（Eスロットに装備カードがある場合）
  if(card.equipUid){
    const equip = getCardByUid(side, card.equipUid) || findEquipInE(side, card.equipUid);
    if(equip && equip._equipBonus) atk += equip._equipBonus;
    if(equip && equip._equipBonus2) atk += equip._equipBonus2;
  }

  // 小太郎/小次郎のペアバフ
  if(card.no===9 && hasOnStage(side, (c)=>c && c.no===10)) atk += 500;
  if(card.no===10 && hasOnStage(side, (c)=>c && c.no===9)) atk += 500;

  return atk;
}

function findEquipInE(side, equipUid){
  const E = state[side].E;
  for(const it of E){
    if(it && it.uid===equipUid) return it;
  }
  return null;
}

function openViewer(card, ctx){
  // ctx: {side, zone, pos}
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

  // viewer context
  state.viewer = { side: ctx?.side||null, zone: ctx?.zone||null, pos: ctx?.pos??null, uid: card.uid };

  // 効果発動ボタン可否
  el.btnCardAct.style.display = canActivateFromViewer(card, ctx) ? "inline-block" : "none";

  showModal("viewerM");
}

function canActivateFromViewer(card, ctx){
  if(state.gameOver) return false;
  const side = ctx?.side;
  const zone = ctx?.zone;

  if(!side) return false;
  // フィールド上カードのみ（C/Eにあるもの）
  if(zone!=="C" && zone!=="E") return false;

  if(side==="P1"){
    if(state.activeSide!=="P1") {
      // 相手ターンでもOK: スタマックス(13)のみ
      return card.no===13;
    }
    if(state.phase!=="MAIN") return card.no===13;
    if([1,3,5,6,9,10,11,13].includes(card.no)) return true;
  }else{
    // AI側はviewerで押させない
    return false;
  }
  return false;
}

el.btnCardAct.addEventListener("click", async ()=>{
  hideModal("viewerM");
  const side = state.viewer.side;
  const zone = state.viewer.zone;
  const pos  = state.viewer.pos;
  const uid  = state.viewer.uid;
  if(!side || !zone || pos==null || !uid) return;

  const card = (zone==="C" ? state[side].C[pos] : state[side].E[pos]);
  if(!card || card.uid!==uid) return;

  await activateFieldCardAbility(side, zone, pos, card);
}, {passive:true});

/* ---------------- Images / GitHub scan (v50000継承) ---------------- */
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

  // field
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

  // back
  state.img.backUrl = await resolveBackUrl(cache.backFile || "");

  // cards
  state.img.cardUrlByNo = {};
  const map = (cache.cardMap || {});
  for(const k of Object.keys(map)){
    state.img.cardUrlByNo[k] = vercelPathCards(map[k]);
  }

  // タイトル画像（任意）：assets/title.png を自動で拾う（なければ枠のみ）
  const titleCandidate = "/assets/title.png";
  if(await validateImage(titleCandidate)){
    el.titleArt.style.backgroundImage = `url("${titleCandidate}")`;
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
function anyEnemyCharacters(side){
  const enemy = side==="P1" ? "AI" : "P1";
  return state[enemy].C.some(Boolean);
}
function opponent(side){ return side==="P1" ? "AI" : "P1"; }

function moveToWing(side, card){
  if(!card) return;
  state[side].wing.unshift(card); // 最新を先頭に
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

    // 装備表示（キャラに装備がある場合）
    if(isCharacter(card) && card.equipUid){
      const eb = document.createElement("div");
      eb.className = "equipBadge";
      slot.appendChild(eb);
    }

    // ATK表示（キャラクターのみ）
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
  el.chipPhase.textContent = state.phase + (state.phase==="BATTLE" && isBattleLockedThisTurn() ? "（LOCK）" : "");
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

  // P1 C
  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const ctx = {side:"P1", zone:"C", pos:i};
    const slot = makeSlot(c, "P1", ctx, {glow});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(slot);
  }

  // P1 E
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

/* ---------------- Turn / Phase core ---------------- */
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

function nextPhase(){
  if(state.gameOver) return;

  const i = PHASES.indexOf(state.phase);
  let next = PHASES[(i+1)%PHASES.length];

  // ===== FIX②：TURN1はBATTLEへ進めない（押してもENDへ） =====
  if(next==="BATTLE" && isBattleLockedThisTurn()){
    next = "END";
    log("TURN 1：バトルはできません（ENDへ移行）");
  }

  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.battle.attackerUid=null;
    resetPerTurn(state.activeSide);

    if(state.activeSide==="AI"){
      applyOppTurnStartEffects("AI");
    }else{
      applyOppTurnStartEffects("P1");
    }
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

/* ---------------- Pile click -> Zone list ---------------- */
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

/* ---------------- Interactions (Your side) ---------------- */
async function onClickYourC(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;

  if(state.phase==="BATTLE"){
    // ===== FIX②：TURN1は攻撃選択不可 =====
    if(isBattleLockedThisTurn()){
      log("TURN 1：バトルはできません", "warn");
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

  renderAll();
  log(`E配置：${card.name}`);

  if(isItem(card)){
    await equipItemFromE("P1", pos, card);
    renderAll();
    return;
  }

  await resolveEffectFromE("P1", pos, card);
  renderAll();
}

async function doKensanSummon(side, cPos, handIdx){
  const p = state[side];
  const card = p.hand[handIdx];
  if(!card) return;
  if(card.summon!=="kensan"){ return; }
  if(p.C[cPos]) return;

  const cands = [];
  for(let i=0;i<p.hand.length;i++){
    if(i===handIdx) continue;
    cands.push({from:"hand", idx:i, card:p.hand[i], label:`手札：${p.hand[i].name}`});
  }
  for(let i=0;i<3;i++){
    if(p.C[i]) cands.push({from:"C", idx:i, card:p.C[i], label:`C${i+1}：${p.C[i].name}`});
    if(p.E[i]) cands.push({from:"E", idx:i, card:p.E[i], label:`E${i+1}：${p.E[i].name}`});
  }
  if(!cands.length){
    log("見参：コスト候補なし", "warn");
    return;
  }

  const pick = await askChoice("見参（コスト）", "ウイングへ送るカードを1枚選んでください。", cands.map(x=>({
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
  }else if(from==="E"){
    const moved = p.E[idx];
    p.E[idx]=null;
    moveToWing(side, moved);
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
  }else{
    itemCard._equipBonus = 0;
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

  if(card.no===9 || card.no===10){
    if(side==="AI"){
      await aiTryPartnerSummon(side);
      return;
    }
    await tryPartnerSummonUI(side);
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

  if(card.no===1){
    await activateCruellaSearch(side, card);
    return;
  }
  if(card.no===3){
    await activateNikolaBuff(side, pos, card);
    return;
  }
  if(card.no===5){
    await activateTataExchange(side, card);
    return;
  }
  if(card.no===6){
    await activateEfiDebuff(side, card);
    return;
  }
  if(card.no===9 || card.no===10){
    await tryPartnerSummonUI(side);
    return;
  }
  if(card.no===11){
    await activateShireiEquip(side, pos, card);
    return;
  }

  log("このカードは任意発動の対象外です", "warn");
}

async function askYesNo(title, message){
  const v = await askChoice(title, message, [
    {label:"はい", value:"Y"},
    {label:"いいえ", value:"N"},
  ]);
  return v==="Y";
}

/* ---------------- Individual card logic ---------------- */
async function activateCruellaSearch(side, card){
  if(state.activeSide!==side || state.phase!=="MAIN") { log("今は発動できません", "warn"); return; }
  if(state.limits[side].cruellaUsed){ log("クルエラ：このターンは既に使用しています", "warn"); return; }

  if(await askYesNo("クルエラ", "効果を発動しますか？（カード名に「黒魔法」を含むカードをサーチ）")){
    state.limits[side].cruellaUsed = true;
    await searchFromDeckOrWingByNameIncludes(side, "黒魔法", 1); // FIX①：重複所持チェックなし
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
  if(side!=="P1"){ return; }
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

async function tryPartnerSummonUI(side){
  const p = state[side];
  if(state.activeSide!==side || state.phase!=="MAIN") return;

  const hasKotaro = p.C.some(c=>c && c.no===9);
  const hasKojiro = p.C.some(c=>c && c.no===10);

  const idxKotaro = p.hand.findIndex(c=>c && c.no===9);
  const idxKojiro = p.hand.findIndex(c=>c && c.no===10);

  let want = null;
  if(hasKotaro && idxKojiro>=0) want = {idx: idxKojiro, name:"小次郎・孫悟空Lv17"};
  if(hasKojiro && idxKotaro>=0) want = {idx: idxKotaro, name:"小太郎・孫悟空Lv17"};
  if(!want) return;

  const empty = findEmptyIndex(p.C);
  if(empty<0){
    log("相方見参：C枠が空いていません", "warn");
    return;
  }

  if(await askYesNo("相方見参", `手札の「${want.name}」を見参しますか？`)){
    const fake = p.hand[want.idx];
    fake.summon = "kensan";
    await doKensanSummon(side, empty, want.idx);
  }
}

async function canActivateEffectNow(side, eff){
  if(eff.no===2){
    return hasOnStage(side, (c)=>c && c.no===1);
  }
  if(eff.no===14) return false;
  if(eff.no===15) return false;
  if(eff.no===16){
    return (state.activeSide===side && state.phase==="MAIN");
  }
  if(eff.no===17) return false;
  return (state.activeSide===side && state.phase==="MAIN");
}

async function resolveEffect(side, eff){
  const enemy = opponent(side);

  if(eff.no===2){
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
      await sendCharacterToWing(enemy, best.uid, {by:"effect", note:"フレイムバレット(MAX)"});
      log(`フレイムバレット：${best.name} をウイングへ`);
      return;
    }else{
      const toSend = state[enemy].C.filter(c=>c && (c.rank||0)<=4);
      if(!toSend.length){ log("対象がいません", "warn"); return; }
      for(const c of toSend){
        await sendCharacterToWing(enemy, c.uid, {by:"effect", note:"フレイムバレット(R4)"});
      }
      log(`フレイムバレット：rank4以下を全てウイングへ`);
      return;
    }
  }

  if(eff.no===16){
    const cands = state[enemy].C.filter(Boolean);
    if(!cands.length){ log("相手キャラがいません", "warn"); return; }
    let best = cands[0];
    let bestAtk = calcCurrentAtk(enemy, best);
    for(const c of cands){
      const a = calcCurrentAtk(enemy, c);
      if(a < bestAtk){ best=c; bestAtk=a; }
    }
    await sendCharacterToWing(enemy, best.uid, {by:"effect", note:"力こそパワー"});
    log(`力こそパワー！！：ATK最低の ${best.name} をウイングへ`);
    return;
  }

  log(`（未実装効果）${eff.name}`, "warn");
}

/* ---------------- Search helpers ---------------- */
async function searchFromDeckOrWingByTag(side, tag, n){
  const p = state[side];

  for(let k=0;k<n;k++){
    const pool = [
      ...p.deck.map(c=>({src:"deck", c})),
      ...p.wing.map(c=>({src:"wing", c}))
    ].filter(x=>x.c && x.c.tags.includes(tag));

    if(!pool.length){ log(`サーチ失敗：タグ「${tag}」が見つかりません`, "warn"); return; }

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

/* ===== FIX①：手札に同名があってもOK（チェックしない） ===== */
async function searchFromDeckOrWingByNameIncludes(side, word, n){
  const p = state[side];

  for(let k=0;k<n;k++){
    const pool = [
      ...p.deck.map(c=>({src:"deck", c})),
      ...p.wing.map(c=>({src:"wing", c}))
    ].filter(x=>x.c && x.c.name.includes(word));

    if(!pool.length){ log(`サーチ失敗：名称「${word}」が見つかりません`, "warn"); return; }

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

  // ===== FIX②：TURN1はバトル不可 =====
  if(isBattleLockedThisTurn()){
    log("TURN 1：バトルはできません", "warn");
    return;
  }

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

  // ===== FIX②：TURN1はバトル不可 =====
  if(isBattleLockedThisTurn()){
    log("TURN 1：バトルはできません", "warn");
    state.battle.attackerUid=null;
    state.battle.attackerPos=null;
    renderAll();
    return;
  }

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

  // ===== FIX②：TURN1はバトル不可 =====
  if(isBattleLockedThisTurn()){
    log("TURN 1：バトルはできません", "warn");
    return;
  }

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
  log("攻撃対象は「攻撃対象選択」から選べます（または攻撃者再選択）");
}

async function resolveBattle(attacker, defenderUid){
  const enemySide = "AI";
  const defender = state[enemySide].C.find(c=>c && c.uid===defenderUid);
  if(!defender){ log("対象が無効です", "warn"); return; }

  await maybeBattleBuff15("P1", attacker);

  const atkA = calcCurrentAtk("P1", attacker);
  const atkD = calcCurrentAtk("AI", defender);

  log(`バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  if(atkA > atkD){
    await sendCharacterToWing("AI", defender.uid, {by:"battle", note:"defeated"});
    await maybeAlongditeDrawOnWin(attacker);
    log(`撃破：${defender.name} → AIウイング`);
  }else if(atkA < atkD){
    const saved = await tryProducerSave("P1", attacker);
    if(!saved){
      await sendCharacterToWing("P1", attacker.uid, {by:"battle", note:"defeated"});
      log(`敗北：${attacker.name} → あなたウイング`);
      await maybeQuatreMutation("P1");
    }else{
      log(`班目プロデューサー：バトル破壊を無効（このターン1回）`);
    }
  }else{
    const savedA = await tryProducerSave("P1", attacker);
    const savedD = await tryProducerSave("AI", defender);
    if(!savedA) await sendCharacterToWing("P1", attacker.uid, {by:"battle", note:"trade"});
    if(!savedD) await sendCharacterToWing("AI", defender.uid, {by:"battle", note:"trade"});
    log("相打ち：双方ウイング");
    if(!savedA) await maybeQuatreMutation("P1");
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
  moveToWing(defSide, sh);
  log(`シールド破壊：${sideName(defSide)} シールド${shieldIdx+1} → ウイング`);

  attacker.flags.attackedCountThisTurn += 1;
  state.battle.attackerUid=null;
  state.battle.attackerPos=null;

  renderAll();
}

async function maybeBattleBuff15(side, attacker){
  const p = state[side];
  const idx = p.hand.findIndex(c=>c && c.no===15);
  if(idx<0) return;

  const ok = await askYesNo("陰陽術 - 闘 -", "バトル中にATK+1000を発動しますか？");
  if(!ok) return;

  attacker.tempAtk += 1000;

  const eff = p.hand.splice(idx,1)[0];
  moveToWing(side, eff);
  log("陰陽術 - 闘 -：攻撃者 ATK+1000（ターン終了まで）／カード→ウイング");
}

async function maybeAlongditeDrawOnWin(attacker){
  if(!attacker.equipUid) return;
  const eq = findEquipInE("P1", attacker.equipUid);
  if(!eq || eq.no!==19) return;

  if(attacker.tags.includes("勇者") || attacker.tags.includes("剣士")){
    draw("P1", 1);
    log("アロングダイト：撃破→1ドロー");
    renderAll();
  }
}

async function tryProducerSave(side, card){
  if(card.no!==12) return false;
  if(card.flags.producerSavedThisTurn) return false;
  card.flags.producerSavedThisTurn = true;
  return true;
}

async function maybeQuatreMutation(side){
  const p = state[side];
  const idx = p.hand.findIndex(c=>c && c.no===17);
  if(idx<0) return;

  const enemy = opponent(side);
  const t = await pickEnemyCharacter(enemy, "キャトルミューティレーション", "手札に戻す相手キャラクターを選択してください。");
  if(!t) return;

  await stripEquipIfAny(enemy, t);
  const ep = state[enemy];
  const pos = ep.C.findIndex(c=>c && c.uid===t.uid);
  if(pos>=0) ep.C[pos]=null;
  ep.hand.push(t);

  const eff = p.hand.splice(idx,1)[0];
  moveToWing(side, eff);

  log(`キャトルミューティレーション：${t.name} を相手手札へ／カード→ウイング`);
  renderAll();
}

/* ---------------- Sending to wing (with equip handling) ---------------- */
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

async function sendCharacterToWing(side, uid, meta){
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
          log(`放射型：相手ターン開始→相手手札1枚ウイング`);
        }
      }
    }
  }
}

/* ---------------- Reactive negation (Handgata / Memory erase) ---------------- */
async function tryNegateByHandgata(side, effectLabel){
  const p = state[side];
  const handgata = p.C.find(c=>c && c.no===8);
  if(!handgata) return false;
  if(state.limits[side].handgataUsed) return false;

  if(side==="P1"){
    const ok = await askYesNo("手形", `相手の効果「${effectLabel}」を無効にしますか？（相手ターンに1度）`);
    if(!ok) return false;
  }

  state.limits[side].handgataUsed = true;
  log(`${sideName(side)}：手形→効果無効`);
  return true;
}

async function tryNegateByMemoryErase(side, effectLabel){
  const p = state[side];
  const idx = p.hand.findIndex(c=>c && c.no===14);
  if(idx<0) return false;

  if(side==="P1"){
    const ok = await askYesNo("記憶抹消", `相手の効果「${effectLabel}」を無効にしますか？（発動後カードはウイング）`);
    if(!ok) return false;
  }

  const eff = p.hand.splice(idx,1)[0];
  moveToWing(side, eff);
  log(`${sideName(side)}：記憶抹消→効果無効／カード→ウイング`);
  return true;
}

/* =========================================================
   FIX③：AI強化（自滅攻撃しない／守りを優先）
   - 勝てる相手がいない時は攻撃しない（壁を残す）
   - MAINでエフィ/ニコラ/クルエラを自動使用（可能な範囲）
========================================================= */

function aiEnemyMaxAtk(){
  const list = state.P1.C.filter(Boolean);
  if(!list.length) return 0;
  let m = 0;
  for(const c of list){
    const a = calcCurrentAtk("P1", c);
    if(a > m) m = a;
  }
  return m;
}

async function aiAutoUseEfi(){
  const p = state.AI;
  const efiPos = p.C.findIndex(c=>c && c.no===6);
  if(efiPos<0) return false;
  const efi = p.C[efiPos];
  if(efi.used.perTurn) return false;

  const enemyChars = state.P1.C.filter(Boolean);
  if(!enemyChars.length) return false;

  // 相手最大ATKを-1000
  let best = enemyChars[0];
  let bestAtk = calcCurrentAtk("P1", best);
  for(const c of enemyChars){
    const a = calcCurrentAtk("P1", c);
    if(a > bestAtk){ best=c; bestAtk=a; }
  }

  efi.used.perTurn = true;
  best.tempAtk -= 1000;
  log("AI：エフィ→相手最大ATKを-1000");
  renderAll();
  await sleep(80);
  return true;
}

async function aiAutoUseNikola(){
  const p = state.AI;
  const nkPos = p.C.findIndex(c=>c && c.no===3);
  if(nkPos<0) return false;
  const nk = p.C[nkPos];
  if(nk.used.perTurn) return false;

  const enemyMax = aiEnemyMaxAtk();
  const myAtk = calcCurrentAtk("AI", nk);
  // 「明らかにATKが上」＝相手最大が自分より上なら守り強化
  if(enemyMax > myAtk){
    nk.used.perTurn = true;
    nk.tempAtk += 1000;
    log("AI：ニコラ→ATK+1000（守り）");
    renderAll();
    await sleep(80);
    return true;
  }
  return false;
}

async function aiAutoUseCruella(){
  const p = state.AI;
  if(state.limits.AI.cruellaUsed) return false;
  if(!p.C.some(c=>c && c.no===1)) return false;

  // デッキ＋ウイングから「黒魔法」を1枚取得（優先：フレイム）
  const poolDeck = p.deck.filter(c=>c && c.name.includes("黒魔法"));
  const poolWing = p.wing.filter(c=>c && c.name.includes("黒魔法"));
  const pool = [...poolDeck.map(c=>({src:"deck", c})), ...poolWing.map(c=>({src:"wing", c}))];

  if(!pool.length) return false;

  // フレイム優先
  let pick = pool.find(x=>x.c.no===2) || pool[0];

  state.limits.AI.cruellaUsed = true;

  if(pick.src==="deck"){
    const moved = removeFromZone(p.deck, pick.c.uid);
    if(moved) p.hand.push(moved);
  }else{
    const moved = removeFromZone(p.wing, pick.c.uid);
    if(moved) p.hand.push(moved);
  }

  log("AI：クルエラ→黒魔法サーチ");
  renderAll();
  await sleep(80);
  return true;
}

/* ---------------- AI (最低ライン：登場/装備/攻撃/行動不可なら終了) ---------------- */
async function aiTakeTurn(){
  state.phase = "DRAW";
  draw("AI", 1);
  enforceHandLimit("AI");
  renderAll();
  await sleep(220);

  state.phase = "MAIN";
  renderAll();
  await sleep(180);

  let acted = false;

  acted = await aiPlayCharacterIfPossible();
  if(acted) await sleep(200);

  acted = await aiPlayItemIfPossible() || acted;
  if(acted) await sleep(200);

  await aiTryAnyShirei();

  // ===== FIX③：AI 自動スキル（守り寄り） =====
  // 相手が強い時：エフィで下げる / ニコラで上げる / クルエラで手札整える
  await aiAutoUseEfi();
  await aiAutoUseNikola();
  await aiAutoUseCruella();

  acted = await aiPlayFlameIfPossible() || acted;
  if(acted) await sleep(200);

  acted = await aiPlayPowerIfPossible() || acted;
  if(acted) await sleep(200);

  // ===== FIX②：TURN1はBATTLEしない =====
  if(isBattleLockedThisTurn()){
    state.phase = "END";
    enforceHandLimit("AI");
    clearEndTurnTemps("AI");
    renderAll();
    await sleep(120);
    log("AI：TURN 1（バトル不可）→ターン終了");
    return;
  }

  state.phase = "BATTLE";
  renderAll();
  await sleep(200);

  const attacked = await aiBattle();
  acted = acted || attacked;

  state.phase = "END";
  enforceHandLimit("AI");
  clearEndTurnTemps("AI");
  renderAll();
  await sleep(160);

  log("AI：ターン終了");
}

async function aiPlayCharacterIfPossible(){
  const p = state.AI;
  const empty = findEmptyIndex(p.C);
  if(empty<0) return false;

  const idxNormal = p.hand.findIndex(c=>c && isCharacter(c) && c.summon!=="kensan");
  if(idxNormal>=0){
    const c = p.hand.splice(idxNormal,1)[0];
    p.C[empty]=c;
    log(`AI：登場 ${c.name}`);
    renderAll();
    await onEnterTriggers("AI", {zone:"C", pos:empty, card:c});
    return true;
  }

  const idxKen = p.hand.findIndex(c=>c && isCharacter(c) && c.summon==="kensan");
  if(idxKen>=0){
    let cost = null;
    let costFrom = null;

    for(let i=0;i<p.hand.length;i++){
      if(i===idxKen) continue;
      cost = p.hand[i]; costFrom = {zone:"hand", idx:i}; break;
    }
    if(!cost){
      const anyC = p.C.find(Boolean);
      if(anyC) cost = anyC, costFrom = {zone:"C", uid:anyC.uid};
    }
    if(!cost) return false;

    if(costFrom.zone==="hand"){
      const moved = p.hand.splice(costFrom.idx,1)[0];
      moveToWing("AI", moved);
    }else{
      const pos = p.C.findIndex(x=>x && x.uid===costFrom.uid);
      const moved = p.C[pos];
      await stripEquipIfAny("AI", moved);
      p.C[pos]=null;
      moveToWing("AI", moved);
    }

    const placed = p.hand.splice(idxKen,1)[0];
    p.C[empty]=placed;
    log(`AI：見参 ${placed.name}`);
    renderAll();
    await onEnterTriggers("AI", {zone:"C", pos:empty, card:placed});
    return true;
  }

  return false;
}

async function aiPlayItemIfPossible(){
  const p = state.AI;
  const ePos = findEmptyIndex(p.E);
  if(ePos<0) return false;

  const idxItem = p.hand.findIndex(c=>c && isItem(c));
  if(idxItem<0) return false;

  const hostPos = p.C.findIndex(Boolean);
  if(hostPos<0) return false;

  const item = p.hand.splice(idxItem,1)[0];
  p.E[ePos]=item;

  const host = p.C[hostPos];

  if(host.equipUid){
    const old = findEquipInE("AI", host.equipUid);
    if(old){
      const oldPos = p.E.findIndex(x=>x && x.uid===old.uid);
      if(oldPos>=0) p.E[oldPos]=null;
      moveToWing("AI", old);
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

async function aiPlayFlameIfPossible(){
  const p = state.AI;
  if(!p.C.some(c=>c && c.no===1)) return false;
  const idx = p.hand.findIndex(c=>c && c.no===2);
  if(idx<0) return false;

  const enemyChars = state.P1.C.filter(Boolean);
  if(!enemyChars.length) return false;

  const eff = p.hand.splice(idx,1)[0];
  moveToWing("AI", eff);

  let best = enemyChars[0];
  let bestAtk = calcCurrentAtk("P1", best);
  for(const c of enemyChars){
    const a = calcCurrentAtk("P1", c);
    if(a > bestAtk){ best=c; bestAtk=a; }
  }
  await sendCharacterToWing("P1", best.uid, {by:"effect", note:"AIフレイム"});
  log(`AI：フレイムバレット→ ${best.name} をウイング`);
  renderAll();
  return true;
}

async function aiPlayPowerIfPossible(){
  const p = state.AI;
  const idx = p.hand.findIndex(c=>c && c.no===16);
  if(idx<0) return false;

  const enemyChars = state.P1.C.filter(Boolean);
  if(!enemyChars.length) return false;

  const eff = p.hand.splice(idx,1)[0];
  moveToWing("AI", eff);

  let best = enemyChars[0];
  let bestAtk = calcCurrentAtk("P1", best);
  for(const c of enemyChars){
    const a = calcCurrentAtk("P1", c);
    if(a < bestAtk){ best=c; bestAtk=a; }
  }
  await sendCharacterToWing("P1", best.uid, {by:"effect", note:"AI力こそ"});
  log(`AI：力こそパワー！！→ ${best.name} をウイング`);
  renderAll();
  return true;
}

/* ===== FIX③：AIバトル（勝てる相手だけ殴る／勝てないなら殴らない） ===== */
async function aiBattle(){
  const p = state.AI;
  let acted = false;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;
    if(a.flags.attackedCountThisTurn>=1) continue;

    const enemyChars = state.P1.C.filter(Boolean);

    if(enemyChars.length){
      const atkA = calcCurrentAtk("AI", a);

      // 勝てる相手だけ抽出
      const winTargets = enemyChars
        .map(t=>({t, atkD: calcCurrentAtk("P1", t)}))
        .filter(x=>atkA > x.atkD);

      if(!winTargets.length){
        // ★自滅攻撃しない：壁として残す（シールドを守る）
        continue;
      }

      // 勝てる中で一番ATK高い相手を倒す（次ターンの危険を減らす）
      winTargets.sort((x,y)=> y.atkD - x.atkD);
      const t = winTargets[0].t;
      const atkD = winTargets[0].atkD;

      log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

      await sendCharacterToWing("P1", t.uid, {by:"battle", note:"AIwin"});
      log(`AI：撃破 ${t.name} → あなたウイング`);
      await maybeQuatreMutation("P1");

      a.flags.attackedCountThisTurn += 1;
      acted = true;
      renderAll();
      await sleep(220);
      continue;
    }

    // 相手キャラがいない→シールドを割る（自然）
    const shields = state.P1.shield.map((c, idx)=>({c, idx})).filter(x=>!!x.c);
    if(shields.length){
      const pick = shields[0];
      state.P1.shield[pick.idx]=null;
      moveToWing("P1", pick.c);
      log(`AI：シールド破壊（あなた）${pick.idx+1}`);
      a.flags.attackedCountThisTurn += 1;
      acted = true;
      renderAll();
      await sleep(200);
      continue;
    }

    await finishGame("AI");
    acted = true;
    break;
  }

  return acted;
}

async function aiTryAnyShirei(){
  const p = state.AI;
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(c && c.no===11){
      await aiTryShireiEquip("AI", i);
      return;
    }
  }
}
async function aiTryShireiEquip(side, cPos){
  const p = state[side];
  const card = p.C[cPos];
  if(!card || card.no!==11) return;

  const others = [];
  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(c && c.uid!==card.uid) others.push({i, c});
  }
  if(!others.length) return;

  const ePos = findEmptyIndex(p.E);
  if(ePos<0) return;

  let best = others[0];
  let bestAtk = calcCurrentAtk(side, best.c);
  for(const x of others){
    const a = calcCurrentAtk(side, x.c);
    if(a > bestAtk){ best=x; bestAtk=a; }
  }

  p.C[cPos]=null;
  p.E[ePos]=card;
  card.type="item";
  card.equippedToUid = best.c.uid;
  card._equipBonus = 500;
  card._equipBonus2 = 0;
  best.c.equipUid = card.uid;

  log("AI：司令→装備化（ATK+500）");
  renderAll();
}

async function aiTryPartnerSummon(side){
  await sleep(80);
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
  log("v50014：完全版（修正①②③反映／丸ごと置換）");
}

document.addEventListener("DOMContentLoaded", init);