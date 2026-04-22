/* =========================================================
  Manpuku World - v50021 (iPhone First / Full Replace JS)
  - レイアウトは触らない（JSのみ）
  - 既存の有効部分を壊さず最小変更
  - カウンターの再カウンター対応維持
  - No.21 ミーコ 追加
  - No.28 セシア＆アリサ 追加
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

/* ---------------- DOM refs ---------------- */
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
  if(el.logM && el.logM.classList.contains("show")) renderLogModal();
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
  for(const it of LOGS.slice(0, 280)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind==="warn"?"warn":""}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------------- Utilities ---------------- */
function bindLongPress(node, fn, ms=620){
  if(!node) return;
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(()=>fn(), ms); };
  const end = ()=> clearTimeout(t);

  node.addEventListener("pointerdown", start, {passive:true});
  node.addEventListener("pointerup", end, {passive:true});
  node.addEventListener("pointercancel", end, {passive:true});
  node.addEventListener("pointerleave", end, {passive:true});

  node.addEventListener("mousedown", start, {passive:true});
  node.addEventListener("mouseup", end, {passive:true});
  node.addEventListener("mouseleave", end, {passive:true});

  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
  node.addEventListener("touchcancel", end, {passive:true});
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

/* ---------------- Cards ---------------- */
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

  { no:21, name:"ミーコ", type:"character",
    tags:["アバター","霊魂","ミジンコ"], titleTag:"怨霊撲滅屋GB",
    text: normalizeText(
      "このカードは1ターンに1度、バトルで破壊されない。\n" +
      "自分シールドが0枚で相手の直接攻撃を受ける時、手札から見参できる。\n" +
      "その攻撃を無効にし、このターンのバトルを終了する。"
    ),
    rank:3, atk:500 },

  { no:23, name:"退魔師レイチェル", type:"character",
    tags:["除霊","令嬢","射手"], titleTag:"怨霊撲滅屋GB",
    text: normalizeText(
      "登場できない。\n" +
      "手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。\n" +
      "このカードがアイテムを装備している時、相手ステージのタグ「怨霊」「霊魂」を持つキャラクターは効果を発動できない。\n" +
      "バトルで相手キャラクターをウイングに送った時、相手シールドを1枚破壊する。"
    ),
    rank:5, atk:2200, summon:"kensan" },

  { no:24, name:"銀弾の双銃", type:"item",
    tags:["除霊","拳銃"], titleTag:"怨霊撲滅屋GB",
    text: normalizeText(
      "自分ターンに発動できる。\n" +
      "自分ステージのキャラクター1体に装備する。ATK+500。\n" +
      "タグ「除霊」を持つキャラクターが装備した場合、さらにATK+500し、このターンの攻撃回数を2回追加する。"
    ),
    rank:4, atk:0 },

  { no:26, name:"ジュエリー・ルビー", type:"character",
    tags:["美少女戦士","アニメ","格闘"], titleTag:"Ve ヴォイスエレメント",
    text: normalizeText(
      "自分ステージに「サファイア」が存在する時、手札から見参できる。\n" +
      "登場した時、手札を1枚ウイングに送り、デッキ・ウイングからタグ「アニメ」カード1枚を手札に加える。\n" +
      "このカードが自分ステージに存在する間、タグ「美少女戦士」のATK+500。"
    ),
    rank:4, atk:1700 },

  { no:27, name:"ジュエリー・サファイア", type:"character",
    tags:["美少女戦士","アニメ","格闘"], titleTag:"Ve ヴォイスエレメント",
    text: normalizeText(
      "自分ステージに「ルビー」が存在する時、手札から見参できる。\n" +
      "登場した時、手札を1枚ウイングに送り、デッキ・ウイングからタグ「アニメ」カード1枚を手札に加える。\n" +
      "このカードが自分ステージに存在する間、タグ「美少女戦士」のATK+500。"
    ),
    rank:4, atk:1700 },

  { no:28, name:"セシア＆アリサ", type:"character",
    tags:["除霊","支援","侍女"], titleTag:"怨霊撲滅屋GB",
    text: normalizeText(
      "登場した時、デッキからタイトルタグ「怨霊撲滅屋GB」アイテムカード1枚を手札に加える。\n" +
      "自分ターンに発動できる。このカードが自分ステージに存在する時、手札のrank5以下の「レイチェル」キャラクター1体を条件無視で見参させる。"
    ),
    rank:4, atk:1500 },
];

const CARD_NOS = [...new Set(CardRegistry.map(c=>c.no))].sort((a,b)=>a-b);
const INITIAL_DECK_NOS = Array.from({length:20}, (_,i)=> i+1);

function getCardDef(no){
  return CardRegistry.find(c=>c.no===no) || null;
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

/* =========================================================
   デッキ編集
========================================================= */
const LS_COLLECTION = "mw_collection_v1";
const LS_DECK = "mw_deck_v1";
const LS_AI_DECK = "mw_ai_deck_v1";

function safeJSONParse(s, fallback){
  try{ return JSON.parse(s); }catch{ return fallback; }
}

function ensureInitialCollectionAndDeck(){
  let col = safeJSONParse(localStorage.getItem(LS_COLLECTION) || "", null);
  let changed = false;

  if(!col || typeof col!=="object"){
    col = {};
    changed = true;
  }

  for(const no of CARD_NOS){
    const k = pad2(no);
    if(typeof col[k] !== "number"){
      col[k] = 3;
      changed = true;
    }
  }

  if(changed){
    localStorage.setItem(LS_COLLECTION, JSON.stringify(col));
    log("デッキ編集：所持カードを更新しました");
  }

  let deck = safeJSONParse(localStorage.getItem(LS_DECK) || "", null);
  if(!Array.isArray(deck) || deck.length!==40){
    deck = [];
    for(const no of INITIAL_DECK_NOS){ deck.push(no); deck.push(no); }
    localStorage.setItem(LS_DECK, JSON.stringify(deck));
    log("デッキ編集：初期デッキ（1〜20を各2枚）を作成");
  }

  let aideck = safeJSONParse(localStorage.getItem(LS_AI_DECK) || "", null);
  if(!Array.isArray(aideck) || aideck.length!==40){
    aideck = [];
    for(const no of INITIAL_DECK_NOS){ aideck.push(no); aideck.push(no); }
    localStorage.setItem(LS_AI_DECK, JSON.stringify(aideck));
  }
}
function readCollection(){
  const col = safeJSONParse(localStorage.getItem(LS_COLLECTION) || "", {});
  for(const no of CARD_NOS){
    const k = pad2(no);
    if(typeof col[k] !== "number") col[k] = 0;
  }
  return col;
}
function readDeck(){
  const d = safeJSONParse(localStorage.getItem(LS_DECK) || "", []);
  return Array.isArray(d) ? d.slice() : [];
}
function writeDeck(deck){
  localStorage.setItem(LS_DECK, JSON.stringify(deck.slice()));
}
function readAIDeck(){
  const d = safeJSONParse(localStorage.getItem(LS_AI_DECK) || "", []);
  return Array.isArray(d) ? d.slice() : [];
}
function countDeckByNo(deck){
  const m = {};
  for(const no of deck){
    const k = pad2(no);
    m[k] = (m[k]||0) + 1;
  }
  for(const no of CARD_NOS){
    const k = pad2(no);
    if(!m[k]) m[k]=0;
  }
  return m;
}
function totalDeckCount(deck){ return deck.length; }
function deckEditorSummaryLine(deck){
  const c = countDeckByNo(deck);
  let kinds = 0;
  for(const no of CARD_NOS){
    if(c[pad2(no)]>0) kinds++;
  }
  return `40枚固定 / 採用${kinds}種 / 同名最大3枚`;
}
function canAddToDeck(col, deck, no){
  const k = pad2(no);
  const inDeck = countDeckByNo(deck)[k] || 0;
  const owned = col[k] || 0;
  if(totalDeckCount(deck) >= 40) return {ok:false, reason:"デッキが40枚です"};
  if(inDeck >= 3) return {ok:false, reason:"同名は3枚までです"};
  if(inDeck >= owned) return {ok:false, reason:"所持枚数が足りません"};
  return {ok:true, reason:""};
}
function canRemoveFromDeck(deck, no){
  const k = pad2(no);
  const inDeck = countDeckByNo(deck)[k] || 0;
  if(inDeck<=0) return {ok:false, reason:"デッキに入っていません"};
  return {ok:true, reason:""};
}
function buildDeckFromList(list){
  const deck = [];
  for(const no of list){
    const def = getCardDef(no);
    if(def) deck.push(makeInstance(def));
  }
  shuffle(deck);
  return deck;
}
function closeDeckEditor(){
  hideModal("zoneM");
  log("デッキ編集：閉じました");
}
function renderDeckEditor(){
  const col = readCollection();
  const deck = readDeck();
  const counts = countDeckByNo(deck);

  if(!el.zoneTitle || !el.zoneBody) return;

  el.zoneTitle.textContent = "DECK EDIT（テキスト）";
  el.zoneBody.innerHTML = "";

  const head = document.createElement("div");
  head.className = "choiceMsg";
  head.textContent =
    "操作：＋で追加 / －で削除（同名最大3枚・所持枚数以内）\n" +
    "※保存は40枚ちょうどのときのみ可能\n" +
    "戻る：右上×（枠外タップでもOK）";
  el.zoneBody.appendChild(head);

  const stat = document.createElement("div");
  stat.className = "choiceMsg";
  stat.style.whiteSpace = "pre-line";
  stat.textContent = `現在デッキ：${deck.length}枚\n${deckEditorSummaryLine(deck)}`;
  el.zoneBody.appendChild(stat);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "8px";
  btnRow.style.flexWrap = "wrap";
  btnRow.style.margin = "10px 0 6px 0";

  const mkBtn = (label, onClick)=>{
    const b = document.createElement("button");
    b.textContent = label;
    b.style.padding = "8px 10px";
    b.style.borderRadius = "10px";
    b.style.border = "1px solid rgba(255,255,255,.18)";
    b.style.background = "rgba(0,0,0,.35)";
    b.style.color = "white";
    b.style.fontWeight = "800";
    b.addEventListener("click", onClick, {passive:true});
    return b;
  };

  const btnSave = mkBtn("保存して戻る", ()=>{
    const d = readDeck();
    if(d.length !== 40){
      log(`デッキ編集：保存不可（${d.length}枚）`, "warn");
      renderDeckEditor();
      return;
    }
    writeDeck(d);
    log("デッキ編集：保存しました（このデッキでバトル開始できます）");
    closeDeckEditor();
  });

  const btnReset = mkBtn("初期デッキへ戻す", ()=>{
    const d = [];
    for(const no of INITIAL_DECK_NOS){ d.push(no); d.push(no); }
    writeDeck(d);
    log("デッキ編集：初期デッキへ戻しました");
    renderDeckEditor();
  });

  btnRow.appendChild(btnSave);
  btnRow.appendChild(btnReset);
  el.zoneBody.appendChild(btnRow);

  const list = document.createElement("div");
  list.className = "choiceList";

  for(const no of CARD_NOS){
    const def = getCardDef(no);
    if(!def) continue;
    const k = pad2(no);
    const owned = col[k] || 0;
    const inDeck = counts[k] || 0;

    const row = document.createElement("div");
    row.className = "choiceItem";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "56px 1fr auto";
    row.style.alignItems = "center";
    row.style.gap = "10px";

    const th = document.createElement("div");
    th.className = "choiceThumb";
    const url = state.img.cardUrlByNo[k];
    if(url) th.style.backgroundImage = `url("${url}")`;

    const meta = document.createElement("div");
    meta.className = "choiceMeta";
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = `No.${k}  ${def.name}`;
    const s = document.createElement("div");
    s.className = "s";
    s.textContent = `${def.type.toUpperCase()} / R${def.rank||0} / ATK ${def.atk||0} / 所持${owned} / デッキ${inDeck}`;
    meta.appendChild(t);
    meta.appendChild(s);

    const ops = document.createElement("div");
    ops.style.display = "flex";
    ops.style.gap = "6px";
    ops.style.alignItems = "center";

    const mkMini = (label)=>{
      const b = document.createElement("button");
      b.textContent = label;
      b.style.width = "40px";
      b.style.height = "36px";
      b.style.borderRadius = "10px";
      b.style.border = "1px solid rgba(255,255,255,.18)";
      b.style.background = "rgba(0,0,0,.35)";
      b.style.color = "white";
      b.style.fontWeight = "900";
      return b;
    };

    const btnMinus = mkMini("－");
    btnMinus.addEventListener("click", ()=>{
      const deckNow = readDeck();
      const can = canRemoveFromDeck(deckNow, no);
      if(!can.ok){
        log(`削除不可：${can.reason}`, "warn");
        return;
      }
      for(let i=deckNow.length-1;i>=0;i--){
        if(deckNow[i]===no){ deckNow.splice(i,1); break; }
      }
      writeDeck(deckNow);
      log(`デッキ編集：-1（No.${k}）`);
      renderDeckEditor();
    }, {passive:true});

    const btnPlus = mkMini("＋");
    btnPlus.addEventListener("click", ()=>{
      const deckNow = readDeck();
      const colNow = readCollection();
      const can = canAddToDeck(colNow, deckNow, no);
      if(!can.ok){
        log(`追加不可：${can.reason}`, "warn");
        return;
      }
      deckNow.push(no);
      writeDeck(deckNow);
      log(`デッキ編集：+1（No.${k}）`);
      renderDeckEditor();
    }, {passive:true});

    ops.appendChild(btnMinus);
    ops.appendChild(btnPlus);

    row.appendChild(th);
    row.appendChild(meta);
    row.appendChild(ops);

    bindLongPress(row, ()=>{
      const tmp = makeInstance(def);
      openViewer(tmp, {side:"P1", zone:"DECKEDIT", pos:null});
    }, 620);

    list.appendChild(row);
  }

  el.zoneBody.appendChild(list);
}
function openDeckEditor(){
  ensureInitialCollectionAndDeck();
  renderDeckEditor();
  showModal("zoneM");
  log("デッキ編集：表示（保存後、このデッキでスタート）");
}

/* ---------------- State ---------------- */
const state = {
  started:false,
  gameOver:false,

  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",

  turnsTaken: { P1:0, AI:0 },

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

  titleLongPressed:false,
  startLock:false,
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(c){ return c && c.type==="character"; }
function isEffect(c){ return c && c.type==="effect"; }
function isItem(c){ return c && c.type==="item"; }
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function opponent(side){ return side==="P1" ? "AI" : "P1"; }

/* =========================================================
   先攻1ターン目のみ攻撃不可
========================================================= */
function canBattleThisTurn(side){
  if(side === state.firstSide){
    return (state.turnsTaken[side] >= 2);
  }
  return true;
}
function battleBanReason(side){
  return `${sideName(side)}の1ターン目は攻撃できません`;
}
function beginTurn(side){
  state.turnsTaken[side] = (state.turnsTaken[side]||0) + 1;
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.announce.lastSelUid=null;
  state.battle.attackerUid=null;
  resetPerTurn(side);
  applyOppTurnStartEffects(side);
  if(!canBattleThisTurn(side)){
    log(`攻撃制限：${battleBanReason(side)}`);
  }
}

/* ---------------- Basic helpers ---------------- */
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
function removeFromHandByUid(side, uid){
  return removeFromZone(state[side].hand, uid);
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
function clearEndTurnTemps(side){
  const p = state[side];
  for(const c of p.C){
    if(!c) continue;
    c.tempAtk = 0;
    c.flags.attackedCountThisTurn = 0;
    c.flags.producerSavedThisTurn = false;
  }
}
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
function hasOnStage(side, pred){
  const p = state[side];
  for(const c of p.C) if(pred(c)) return true;
  return false;
}
function findEquipInE(side, equipUid){
  const E = state[side].E;
  for(const it of E){
    if(it && it.uid===equipUid) return it;
  }
  return null;
}
function getEquippedItem(side, characterCard){
  if(!characterCard || !characterCard.equipUid) return null;
  return findEquipInE(side, characterCard.equipUid);
}
function getRubySapphireStageBuffCount(side){
  let n = 0;
  for(const c of state[side].C){
    if(c && (c.no===26 || c.no===27)) n++;
  }
  return n;
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

  if(card.tags.includes("美少女戦士")){
    atk += getRubySapphireStageBuffCount(side) * 500;
  }

  return atk;
}
function isRachelSealActiveAgainst(side, card){
  if(!card || !isCharacter(card)) return false;
  const opp = opponent(side);
  const rachel = state[opp].C.find(c=>c && c.no===23 && c.equipUid);
  if(!rachel) return false;
  return card.tags.includes("怨霊") || card.tags.includes("霊魂");
}
function getMaxAttacks(side, card){
  if(!card || !isCharacter(card)) return 0;
  let max = 1;
  if(card.no===7 && card.equipUid) max = Math.max(max, 2);
  const eq = getEquippedItem(side, card);
  if(eq && eq._extraAttacks) max += eq._extraAttacks;
  return max;
}
function pickFirstShieldIndex(side){
  return state[side].shield.findIndex(Boolean);
}
async function breakOneShieldByEffect(defSide, sourceName){
  const idx = pickFirstShieldIndex(defSide);
  if(idx < 0){
    log(`${sourceName}：破壊できるシールドがありません`);
    return false;
  }
  const sh = state[defSide].shield[idx];
  state[defSide].shield[idx] = null;
  state[defSide].hand.push(sh);
  log(`${sourceName}：${sideName(defSide)}のシールドを1枚破壊 → 手札へ`);
  renderAll();
  return true;
}
function isRubySapphire(card){
  return !!card && (card.no===26 || card.no===27);
}
function canRubySapphireKensan(side, card){
  if(!card) return false;
  if(card.no===26) return state[side].C.some(c=>c && c.no===27);
  if(card.no===27) return state[side].C.some(c=>c && c.no===26);
  return false;
}
function chooseAIDiscardIndex(side){
  const hand = state[side].hand;
  if(!hand.length) return -1;
  let bestIdx = 0;
  let bestScore = Infinity;
  for(let i=0;i<hand.length;i++){
    const c = hand[i];
    let s = (c.baseAtk||0) + (c.rank||0)*120;
    if(c.no===14) s += 500;
    if(c.no===17) s += 380;
    if(c.no===21) s += 260;
    if(c.no===23) s += 260;
    if(c.no===26 || c.no===27) s += 220;
    if(c.no===28) s += 200;
    if(isItem(c)) s += 50;
    if(isEffect(c)) s += 80;
    if(s < bestScore){
      bestScore = s;
      bestIdx = i;
    }
  }
  return bestIdx;
}
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

/* ---------------- Modals ---------------- */
function showModal(id){
  const n = $(id);
  if(n) n.classList.add("show");
}
function hideModal(id){
  const n = $(id);
  if(n) n.classList.remove("show");
}
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
  if(!el.choiceTitle || !el.choiceBody) return Promise.resolve(items?.[0]?.value ?? null);

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
  if(s.startsWith(`${p2}_`)) score += 120;
  if(s.includes(`${p2}_`)) score += 40;
  if(s.startsWith(`${p2}-`)) score += 30;
  if(s.startsWith(p2)) score += 20;
  if(s.includes(".png.png")) score += 6;
  if(s.includes(".png")) score += 5;
  if(s.includes(".jpg")) score += 5;
  if(s.includes(".jpeg")) score += 4;
  return score;
}
function buildCardMapFromFileList(cardFiles){
  const map = {};
  for(const no of CARD_NOS){
    let best = {name:"", score:-1};
    for(const f of cardFiles){
      const sc = scoreCardFilename(f, no);
      if(sc > best.score) best = {name:f, score:sc};
    }
    if(best.score >= 30) map[pad2(no)] = best.name;
  }
  return map;
}
async function resolveBackUrl(cacheBackFile){
  const directCandidates = [
    "/assets/card_back.png",
    "/assets/card_back.PNG",
    "/assets/card_back.png.png",
    "/assets/card_back.png.PNG",
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
  if(state.img.fieldUrl && el.fieldTop && el.fieldBottom){
    el.fieldTop.style.backgroundImage = `url("${state.img.fieldUrl}")`;
    el.fieldBottom.style.backgroundImage = `url("${state.img.fieldUrl}")`;
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

  if(el.titleArt){
    const titleCandidates = ["/assets/title.png", "/assets/title.PNG"];
    for(const u of titleCandidates){
      if(await validateImage(u)){
        el.titleArt.style.backgroundImage = `url("${u}")`;
        break;
      }
    }
  }

  state.img.ready = true;
  renderAll();
}

/* =========================================================
   チェーンエンジン
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
function canUseHandgata(side, prevActivatorSide){
  if(prevActivatorSide === side) return false;
  if(state.activeSide === side) return false;
  return hasHandgataOnField(side) && !state.limits[side].handgataUsed;
}
function canUseMemoryErase(side, prevActivatorSide){
  if(prevActivatorSide === side) return false;
  return hasMemoryEraseInHand(side);
}
async function chooseCounterForSide(side, prevLink){
  const items = [];
  if(canUseHandgata(side, prevLink.activatorSide)){
    items.push({label:"手形で無効", value:"HANDGATA"});
  }
  if(canUseMemoryErase(side, prevLink.activatorSide)){
    items.push({label:"記憶抹消で無効", value:"MEMORY"});
  }
  items.push({label:"しない", value:"PASS"});

  if(side === "P1"){
    return await askChoice(
      "チェーン確認",
      `${sideName(prevLink.activatorSide)}が「${prevLink.label}」を発動しました。\n反応しますか？`,
      items
    );
  }

  if(canUseMemoryErase(side, prevLink.activatorSide)) return "MEMORY";
  if(canUseHandgata(side, prevLink.activatorSide)) return "HANDGATA";
  return "PASS";
}
async function runCounterChain(initialLink){
  const chain = [initialLink];
  let priority = opponent(initialLink.activatorSide);
  let passCount = 0;

  while(passCount < 2){
    const prevLink = chain[chain.length - 1];
    const choice = await chooseCounterForSide(priority, prevLink);

    if(choice === "HANDGATA"){
      state.limits[priority].handgataUsed = true;
      chain.push({
        kind:"HANDGATA",
        label:"手形",
        activatorSide: priority,
      });
      log(`${sideName(priority)}：手形を発動`);
      priority = opponent(priority);
      passCount = 0;
      continue;
    }

    if(choice === "MEMORY"){
      const me = takeMemoryEraseFromHand(priority);
      if(me){
        moveToWing(priority, me);
        chain.push({
          kind:"MEMORY",
          label:"記憶抹消",
          activatorSide: priority,
        });
        log(`${sideName(priority)}：記憶抹消を発動`);
        priority = opponent(priority);
        passCount = 0;
        continue;
      }
    }

    passCount += 1;
    priority = opponent(priority);
  }

  const active = Array(chain.length).fill(true);
  for(let i=chain.length-1; i>=1; i--){
    if(active[i]) active[i-1] = false;
  }

  for(let i=1;i<chain.length;i++){
    if(active[i]) log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：直前の効果を無効`);
    else log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効にされた`);
  }

  const negated = !active[0];
  const negatorKind = negated && chain[1] ? chain[1].kind : null;
  return { negated, negatorKind, chain, active };
}
async function processActivatedEffect(link){
  const r = await runCounterChain(link);
  if(r.negated){
    if(link.onNegated) await link.onNegated(r);
    return {ok:false, detail:r};
  }
  await link.resolve();
  return {ok:true, detail:r};
}

/* ---------------- Viewer ---------------- */
function openViewer(card, ctx){
  if(!el.viewerTitle || !el.viewerText || !el.viewerImg || !el.btnCardAct) return;

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

  el.btnCardAct.style.display = "inline-block";
  showModal("viewerM");
}
function canActivateFromViewer(card, ctx){
  if(state.gameOver) return {ok:false, reason:"ゲームが終了しています"};
  const side = ctx?.side;
  const zone = ctx?.zone;
  if(!side) return {ok:false, reason:"参照側が不明です"};
  if(zone!=="C" && zone!=="E") return {ok:false, reason:"フィールド上のカードではありません"};

  if(isRachelSealActiveAgainst(side, card)){
    return {ok:false, reason:"退魔師レイチェルの効果により発動できません"};
  }

  if(side==="P1"){
    if(state.activeSide!=="P1"){
      if(card.no===13) return {ok:true, reason:""};
      return {ok:false, reason:"あなたのターンではありません"};
    }
    if(state.phase!=="MAIN"){
      if(card.no===13) return {ok:true, reason:""};
      return {ok:false, reason:"メインフェイズではありません"};
    }
    if([1,3,5,6,9,10,11,13,28].includes(card.no)) return {ok:true, reason:""};
    return {ok:false, reason:"このカードは任意発動の対象外です"};
  }

  return {ok:false, reason:"AI側カードは手動発動できません"};
}
if(el.btnCardAct){
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
function isAttackableNow_P1(card){
  if(!card || !isCharacter(card)) return false;
  if(state.gameOver) return false;
  if(state.activeSide!=="P1") return false;
  if(state.phase!=="BATTLE") return false;
  if(!canBattleThisTurn("P1")) return false;
  return (card.flags.attackedCountThisTurn < getMaxAttacks("P1", card));
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
      const maxAtk = getMaxAttacks("P1", card);
      const usedUp = (card.flags.attackedCountThisTurn >= maxAtk);
      slot.style.opacity = usedUp ? "0.55" : "1";

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
  if(el.chipTurn) el.chipTurn.textContent = `TURN ${state.turn}`;
  if(el.chipPhase) el.chipPhase.textContent = state.phase;
  if(el.chipActive) el.chipActive.textContent = (state.activeSide==="P1") ? "YOUR TURN" : "ENEMY TURN";

  const isYour = (state.activeSide==="P1" && !state.gameOver);
  if(el.btnNext){
    el.btnNext.disabled = !isYour;
    el.btnNext.style.opacity = isYour ? "1" : ".45";
  }
  if(el.btnEnd){
    el.btnEnd.disabled  = !isYour;
    el.btnEnd.style.opacity  = isYour ? "1" : ".45";
  }
}
function updateCounts(){
  if(el.aiDeckN) el.aiDeckN.textContent = state.AI.deck.length;
  if(el.aiWingN) el.aiWingN.textContent = state.AI.wing.length;
  if(el.aiOutN) el.aiOutN.textContent = state.AI.outside.length;
  if(el.pDeckN) el.pDeckN.textContent = state.P1.deck.length;
  if(el.pWingN) el.pWingN.textContent = state.P1.wing.length;
  if(el.pOutN) el.pOutN.textContent = state.P1.outside.length;
  if(el.enemyHandLabel) el.enemyHandLabel.textContent = `ENEMY HAND ×${state.AI.hand.length}`;
}
function renderDirectHints(){
  const p0 = countShields("P1")==0;
  const a0 = countShields("AI")==0;
  if(el.pDirectHint) el.pDirectHint.classList.toggle("show", p0);
  if(el.aiDirectHint) el.aiDirectHint.classList.toggle("show", a0);
}
function renderZones(){
  if(el.aiE){
    el.aiE.innerHTML="";
    for(let i=0;i<3;i++){
      const c = state.AI.E[i];
      const ctx = {side:"AI", zone:"E", pos:i};
      el.aiE.appendChild(makeSlot(c, "AI", ctx, {enemy:true}));
    }
  }
  if(el.aiC){
    el.aiC.innerHTML="";
    for(let i=0;i<3;i++){
      const c = state.AI.C[i];
      const ctx = {side:"AI", zone:"C", pos:i};
      el.aiC.appendChild(makeSlot(c, "AI", ctx, {enemy:true}));
    }
  }
  if(el.pC){
    el.pC.innerHTML="";
    for(let i=0;i<3;i++){
      const c = state.P1.C[i];
      const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
      const ctx = {side:"P1", zone:"C", pos:i};
      const slot = makeSlot(c, "P1", ctx, {glow});
      slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
      el.pC.appendChild(slot);
    }
  }
  if(el.pE){
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
      log(`案内：見参キャラです。空きCをタップ→コスト選択→登場`);
    }else if(isRubySapphire(c) && canRubySapphireKensan("P1", c)){
      log(`案内：通常登場または見参できます。空きCをタップしてください`);
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
  document.querySelectorAll(".shieldSlot").forEach((slot)=>{
    const side = slot.getAttribute("data-side");
    const idx = Number(slot.getAttribute("data-idx")||"0");
    const cardNode = slot.querySelector(".shieldCard");
    const sh = state[side].shield[idx];
    const exists = !!sh;
    if(cardNode){
      cardNode.classList.toggle("empty", !exists);
      if(exists && state.img.backUrl){
        cardNode.style.backgroundImage = `url("${state.img.backUrl}")`;
      }else{
        cardNode.style.backgroundImage = "";
      }
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
function nextPhase(){
  if(state.gameOver) return;
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;
  if(next==="START") beginTurn(state.activeSide);
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
    beginTurn("AI");
    renderAll();

    await aiTakeTurn();

    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    beginTurn("P1");
    log(`TURN ${state.turn} あなたのターン`);
    renderAll();
  }
}

/* ---------------- Start game ---------------- */
function startGame(){
  ensureInitialCollectionAndDeck();

  state.gameOver=false;
  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.announce.lastSelUid=null;
  state.battle.attackerUid=null;
  state.turnsTaken = { P1:0, AI:0 };

  const deckList = readDeck();
  if(deckList.length!==40){
    log(`警告：デッキが${deckList.length}枚です。デッキ編集で40枚にして下さい`, "warn");
  }
  state.P1.deck = buildDeckFromList(deckList);

  const aiList = readAIDeck();
  state.AI.deck = buildDeckFromList(aiList.length===40 ? aiList : deckList);

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
  log(`ゲーム開始：初手4 / シールド3 / 先攻=${el.firstInfo?el.firstInfo.textContent:(state.firstSide==="P1"?"先攻：あなた":"先攻：相手")}`);
  log(`あなたのデッキ：${readDeck().length}枚（編集反映）`);

  beginTurn(state.activeSide);
  renderAll();

  if(state.activeSide==="AI"){
    (async ()=>{
      await aiTakeTurn();
      state.activeSide="P1";
      state.turn=2;
      state.phase="START";
      beginTurn("P1");
      log(`TURN ${state.turn} あなたのターン`);
      renderAll();
    })();
  }
}

/* ---------------- Zone viewer ---------------- */
function openZoneList(side, zoneName){
  const p = state[side];
  const list = (zoneName==="WING") ? p.wing : p.outside;
  if(!el.zoneTitle || !el.zoneBody) return;

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
    row.addEventListener("click", ()=> openViewer(c, {side, zone: zoneName, pos:null}), {passive:true});
    wrap.appendChild(row);
  }

  el.zoneBody.appendChild(wrap);
  showModal("zoneM");
}

/* ---------------- Search ---------------- */
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
async function searchDeckByTitleTagItem(side, titleTag, n, opt={}){
  const p = state[side];
  const pool = p.deck.filter(c=>c && c.titleTag===titleTag && c.type==="item");
  if(!pool.length){
    log(`サーチ失敗：タイトルタグ「${titleTag}」のアイテムが見つかりません`, "warn");
    return;
  }

  for(let k=0;k<n;k++){
    const current = p.deck.filter(c=>c && c.titleTag===titleTag && c.type==="item");
    if(!current.length) break;

    if(opt.aiAuto){
      const picked = current[0];
      const moved = removeFromZone(p.deck, picked.uid);
      if(moved) p.hand.push(moved);
      log(`AI：サーチ（${titleTag} アイテム）`);
      continue;
    }

    const items = current.map(c=>({
      label: c.name,
      sub: `DECK / ITEM / ${titleTag}`,
      value: c.uid,
      card: c
    }));
    const pick = await askChoice("サーチ", `タイトルタグ「${titleTag}」のアイテムを手札に加える（${k+1}/${n}）`, items);
    const moved = removeFromZone(p.deck, String(pick));
    if(moved) p.hand.push(moved);
  }
  log(`サーチ：タイトルタグ「${titleTag}」のアイテムを手札へ`);
}

/* ---------------- E装備 / 効果解決 ---------------- */
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

  let cPos = 0;
  if(side==="AI"){
    let best = targets[0];
    let bestScore = -999999;
    for(const t of targets){
      let s = calcCurrentAtk(side, t.c);
      if(itemCard.no===24 && t.c.tags.includes("除霊")) s += 900;
      if(itemCard.no===18 && t.c.tags.includes("射手")) s += 700;
      if(itemCard.no===19 && (t.c.tags.includes("勇者") || t.c.tags.includes("剣士"))) s += 700;
      if(itemCard.no===20 && t.c.tags.includes("勇者")) s += 600;
      if(s > bestScore){ bestScore=s; best=t; }
    }
    cPos = best.i;
  }else{
    const pick = await askChoice("装備先を選択", "装備するキャラクターを選んでください。", targets.map(x=>({
      label:`C${x.i+1}：${x.c.name}`, sub:`ATK ${calcCurrentAtk(side, x.c)}`, value:`${x.i}`, card:x.c
    })));
    cPos = Number(pick);
  }

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
  itemCard._extraAttacks = 0;

  if(itemCard.no===18){
    itemCard._equipBonus = 500;
    if(host.tags.includes("射手")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===19){
    itemCard._equipBonus = 500;
    if(host.tags.includes("勇者") || host.tags.includes("剣士")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===20){
    itemCard._equipBonus = 300;
    if(host.tags.includes("勇者")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===24){
    itemCard._equipBonus = 500;
    if(host.tags.includes("除霊")){
      itemCard._equipBonus2 = 500;
      itemCard._extraAttacks = 2;
    }
  }

  itemCard.equippedToUid = host.uid;
  host.equipUid = itemCard.uid;
  log(`装備：${itemCard.name} → ${host.name}`);
  renderAll();
}
async function canActivateEffectNow(side, eff){
  if(eff.no===2) return hasOnStage(side, (c)=>c && c.no===1);
  if(eff.no===14) return false;
  if(eff.no===15) return false;
  if(eff.no===16) return (state.activeSide===side && state.phase==="MAIN");
  if(eff.no===17) return false;
  return (state.activeSide===side && state.phase==="MAIN");
}
function estimateRemoveValue(card){
  if(!card) return 0;
  let v = (card.baseAtk||0);
  v += (card.rank||0) * 120;
  if(card.no===8) v += 300;
  if(card.no===12) v += 200;
  if(card.no===21) v += 260;
  if(card.no===23) v += 260;
  if(card.no===26 || card.no===27) v += 220;
  if(card.no===28) v += 210;
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
        for(const c of r4) await sendCharacterToWing(enemy, c.uid);
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
      for(const c of toSend) await sendCharacterToWing(enemy, c.uid);
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

/* ---------------- Enter / Field abilities ---------------- */
async function resolveRubySapphireEnter(side, card, ctx){
  const p = state[side];
  if(p.hand.length <= 0){
    log(`${card.name}：手札がないため、登場時効果は不発`, "warn");
    return;
  }

  if(side==="AI"){
    const idx = chooseAIDiscardIndex(side);
    if(idx >= 0){
      const moved = p.hand.splice(idx,1)[0];
      moveToWing(side, moved);
      log(`AI：${card.name} 登場時 → 手札1枚をウイング (${moved.name})`);
    }else{
      return;
    }
    await searchFromDeckOrWingByTag(side, "アニメ", 1, {aiAuto:true});
    renderAll();
    return;
  }

  const items = p.hand.map((c, i)=>({
    label:`手札：${c.name}`,
    sub:`No.${pad2(c.no)} / ${c.type.toUpperCase()}`,
    value:String(i),
    card:c
  }));
  const pick = await askChoice(card.name, "手札を1枚ウイングに送ってください。", items);
  const idx = Number(pick);
  if(Number.isNaN(idx) || !p.hand[idx]){
    log(`${card.name}：手札選択が無効です`, "warn");
    return;
  }

  const moved = p.hand.splice(idx,1)[0];
  moveToWing(side, moved);
  log(`${card.name}：手札1枚をウイング (${moved.name})`);
  await searchFromDeckOrWingByTag(side, "アニメ", 1);
  renderAll();
}
async function activateSeshiaArisaSummon(side, pos, card){
  const p = state[side];
  const empty = findEmptyIndex(p.C);
  if(empty < 0){
    log("セシア＆アリサ：空きCがありません", "warn");
    return;
  }

  const candidates = p.hand.filter(c=>c && c.type==="character" && c.rank<=5 && c.name.includes("レイチェル"));
  if(!candidates.length){
    log("セシア＆アリサ：手札に条件を満たすレイチェルがいません", "warn");
    return;
  }

  let chosen = null;
  if(side==="AI"){
    chosen = candidates.sort((a,b)=> calcCurrentAtk(side,b)-calcCurrentAtk(side,a))[0];
  }else{
    const pick = await askChoice("セシア＆アリサ", "条件無視で見参させるレイチェルを選んでください。", candidates.map(c=>({
      label: c.name,
      sub: `RANK ${c.rank} / ATK ${c.baseAtk}`,
      value: c.uid,
      card: c
    })));
    chosen = p.hand.find(c=>c && c.uid===String(pick)) || null;
  }
  if(!chosen) return;

  const moved = removeFromHandByUid(side, chosen.uid);
  if(!moved) return;
  p.C[empty] = moved;
  log(`セシア＆アリサ：条件無視で見参 ${moved.name}`);
  renderAll();
  await onEnterTriggers(side, {zone:"C", pos:empty, card:moved});
}
async function onEnterTriggers(side, ctx){
  const {card, pos} = ctx;

  if(isRachelSealActiveAgainst(side, card)){
    log(`${card.name}：退魔師レイチェルの効果により発動できません`, "warn");
    return;
  }

  if(card.no===4){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{
        if(side==="AI") await searchFromDeckOrWingByTag("AI", "クランプス", 1, {aiAuto:true});
        else if(await askYesNo("効果確認", "聖ラウスの効果を使用しますか？（クランプスをサーチ）")) await searchFromDeckOrWingByTag(side, "クランプス", 1);
      },
      onNegated: async (r)=>{
        if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
        log(`${card.name} の登場時効果は無効`);
      }
    };
    await processActivatedEffect(act);
    return;
  }

  if(card.no===5){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{
        draw(side, 2);
        log(`${sideName(side)}：タータ登場→2ドロー`);
        renderAll();
      },
      onNegated: async (r)=>{
        if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
        log(`${card.name} の登場時効果は無効`);
      }
    };
    await processActivatedEffect(act);
    return;
  }

  if(card.no===11){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{
        if(side==="AI"){
          await aiTryShireiEquip("AI", pos);
          return;
        }
        const others = state[side].C.filter(x=>x && x.uid!==card.uid);
        if(!others.length){
          log("司令：他の自分キャラがいないため効果は発動できません", "warn");
          return;
        }
        if(await askYesNo("効果確認", "司令の効果を使用しますか？（このカードを装備扱いにしてATK+500）")){
          await activateShireiEquip(side, pos, card);
        }
      },
      onNegated: async (r)=>{
        if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
        log(`${card.name} の登場時効果は無効`);
      }
    };
    await processActivatedEffect(act);
    return;
  }

  if(card.no===26 || card.no===27){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=> await resolveRubySapphireEnter(side, card, ctx),
      onNegated: async (r)=>{
        if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
        log(`${card.name} の登場時効果は無効`);
      }
    };
    await processActivatedEffect(act);
    return;
  }

  if(card.no===28){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{
        await searchDeckByTitleTagItem(side, "怨霊撲滅屋GB", 1, {aiAuto: side==="AI"});
      },
      onNegated: async (r)=>{
        if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
        log(`${card.name} の登場時効果は無効`);
      }
    };
    await processActivatedEffect(act);
    return;
  }
}
async function activateCruellaSearch(side, card){
  if(state.activeSide!==side || state.phase!=="MAIN") { log("今は発動できません", "warn"); return; }
  if(state.limits[side].cruellaUsed){ log("クルエラ：このターンは既に使用しています", "warn"); return; }

  if(side==="P1" && !(await askYesNo("クルエラ", "効果を発動しますか？（カード名に「黒魔法」を含むカードをサーチ）"))){
    return;
  }
  state.limits[side].cruellaUsed = true;
  await searchFromDeckOrWingByNameIncludes(side, "黒魔法", 1);
  renderAll();
}
async function activateNikolaBuff(side, cPos, card){
  if(card.used.perTurn){ log("ニコラ：このターンは既に使用しています", "warn"); return; }
  if(side==="P1" && !(await askYesNo("ニコラ", "ATK+1000（ターン終了まで）を発動しますか？"))) return;
  card.used.perTurn = true;
  card.tempAtk += 1000;
  log("ニコラ：ATK+1000（ターン終了まで）");
  renderAll();
}
async function activateEfiDebuff(side, card){
  if(card.used.perTurn){ log("エフィ：このターンは既に使用しています", "warn"); return; }
  const enemy = opponent(side);
  let t = null;
  if(side==="AI"){
    const cands = state[enemy].C.filter(Boolean);
    if(!cands.length){ log("対象がいません", "warn"); return; }
    t = cands[0];
    let bestAtk = calcCurrentAtk(enemy, t);
    for(const c of cands){
      const a = calcCurrentAtk(enemy, c);
      if(a > bestAtk){ bestAtk=a; t=c; }
    }
  }else{
    t = await pickEnemyCharacter(enemy, "エフィ", "ATK-1000する相手キャラクターを選んでください。");
    if(!t) return;
  }
  card.used.perTurn = true;
  t.tempAtk -= 1000;
  log(`エフィ：${t.name} ATK-1000（ターン終了まで）`);
  renderAll();
}
async function activateTataExchange(side, card){
  if(state.limits[side].tataUsed){ log("タータ：このターンは既に使用しています", "warn"); return; }
  state.limits[side].tataUsed = true;

  const p = state[side];
  const max = Math.min(2, p.hand.length);
  if(max===0){ log("手札がありません", "warn"); return; }

  const picks = [];
  if(side==="AI"){
    const n = Math.min(2, p.hand.length);
    for(let k=0;k<n;k++){
      const idx = chooseAIDiscardIndex(side);
      if(idx<0) break;
      const moved = p.hand.splice(idx,1)[0];
      moveToWing(side, moved);
      picks.push(moved);
    }
  }else{
    if(!(await askYesNo("タータ", "手札2枚までウイング→同数だけBUGBUG西遊記をサーチしますか？"))) return;
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

  let hostPos = 0;
  if(side==="AI"){
    let best = others[0];
    let bestAtk = calcCurrentAtk(side, best.c);
    for(const o of others){
      const a = calcCurrentAtk(side, o.c);
      if(a > bestAtk){ best=o; bestAtk=a; }
    }
    hostPos = best.i;
  }else{
    const pick = await askChoice("司令（装備先）", "装備するキャラクターを選んでください。", others.map(x=>({
      label:`C${x.i+1}：${x.c.name}`, sub:`ATK ${calcCurrentAtk(side, x.c)}`, value:String(x.i), card:x.c
    })));
    hostPos = Number(pick);
  }

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
  card._extraAttacks = 0;
  host.equipUid = card.uid;

  log(`司令：装備化 → ${host.name} ATK+500`);
  renderAll();
}
async function activateFieldCardAbility(side, zone, pos, card){
  if(side!=="P1") return;

  if(isRachelSealActiveAgainst(side, card)){
    log(`効果発動不可：${card.name} は退魔師レイチェルの効果により発動できません`, "warn");
    return;
  }

  const act = {
    kind:"ACT",
    label:card.name,
    activatorSide: side,
    resolve: async ()=>{
      if(card.no===13){ await activateStamax(side, pos, card); return; }
      if(state.activeSide!=="P1" || state.phase!=="MAIN"){
        log("このタイミングでは発動できません", "warn");
        return;
      }
      if(card.no===1) return await activateCruellaSearch(side, card);
      if(card.no===3) return await activateNikolaBuff(side, pos, card);
      if(card.no===5) return await activateTataExchange(side, card);
      if(card.no===6) return await activateEfiDebuff(side, card);
      if(card.no===11) return await activateShireiEquip(side, pos, card);
      if(card.no===28) return await activateSeshiaArisaSummon(side, pos, card);
      log("このカードは任意発動の対象外です", "warn");
    },
    onNegated: async (r)=>{
      if(r.negatorKind==="MEMORY"){
        await sendCharacterToWing(side, card.uid);
      }
      log(`${card.name} の効果は無効`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
}

/* ---------------- Player interactions ---------------- */
async function doKensanSummon(side, cPos, handIdx){
  const p = state[side];
  const card = p.hand[handIdx];
  if(!card || card.summon!=="kensan" || p.C[cPos]) return;

  const cands = [];
  for(let i=0;i<p.hand.length;i++){
    if(i===handIdx) continue;
    if(isCharacter(p.hand[i])) cands.push({from:"hand", idx:i, card:p.hand[i], label:`手札：${p.hand[i].name}`});
  }
  for(let i=0;i<3;i++){
    if(p.C[i]) cands.push({from:"C", idx:i, card:p.C[i], label:`C${i+1}：${p.C[i].name}`});
  }
  if(!cands.length){
    log("見参：コスト候補なし", "warn");
    return;
  }

  const pick = await askChoice("見参（コスト）", "ウイングへ送るキャラクターを1体選んでください。", cands.map(x=>({
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
  }

  const placed = p.hand.splice(handIdx,1)[0];
  p.C[cPos]=placed;
  state.selectedHandIndex=null;
  state.announce.lastSelUid=null;

  log(`見参：${placed.name}`);
  renderAll();
  await onEnterTriggers(side, {zone:"C", pos:cPos, card:placed});
}
async function doRubySapphireKensan(side, cPos, handIdx){
  const p = state[side];
  const card = p.hand[handIdx];
  if(!card || !isRubySapphire(card) || p.C[cPos]) return;
  if(!canRubySapphireKensan(side, card)){
    log(`${card.name}：見参条件を満たしていません`, "warn");
    return;
  }

  const placed = p.hand.splice(handIdx,1)[0];
  p.C[cPos] = placed;
  state.selectedHandIndex = null;
  state.announce.lastSelUid = null;

  log(`見参：${placed.name}`);
  renderAll();
  await onEnterTriggers(side, {zone:"C", pos:cPos, card:placed});
}
async function onClickYourC(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;

  if(state.phase==="BATTLE"){
    if(!canBattleThisTurn("P1")){
      log(battleBanReason("P1"), "warn");
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

  if(isRubySapphire(card) && canRubySapphireKensan("P1", card)){
    const useKensan = await askYesNo("登場方法", `${card.name}を見参で登場しますか？\n（いいえで通常登場）`);
    if(useKensan){
      await doRubySapphireKensan("P1", pos, state.selectedHandIndex);
      return;
    }
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

  const act = {
    kind:"ACT",
    label:card.name,
    activatorSide:"P1",
    resolve: async ()=>{
      if(isItem(card)){
        await equipItemFromE("P1", pos, card);
      }else{
        const ok = await canActivateEffectNow("P1", card);
        if(!ok){
          log(`発動できません：${card.name}`, "warn");
          state.P1.E[pos]=null;
          moveToWing("P1", card);
          return;
        }
        await resolveEffect("P1", card);
        state.P1.E[pos]=null;
        moveToWing("P1", card);
        log(`効果解決→ウイング：${card.name}`);
      }
      renderAll();
    },
    onNegated: async ()=>{
      if(state.P1.E[pos] && state.P1.E[pos].uid === card.uid) state.P1.E[pos]=null;
      moveToWing("P1", card);
      log(`無効化：${card.name} → あなたウイング`);
      renderAll();
    }
  };

  await processActivatedEffect(act);
}

/* ---------------- Battle support ---------------- */
async function tryBattleSurvive(side, card){
  if(!card) return false;
  if(card.flags.producerSavedThisTurn) return false;
  if(card.no===12 || card.no===21){
    card.flags.producerSavedThisTurn = true;
    log(`${card.name}：このターン1度だけバトル破壊を無効`);
    return true;
  }
  return false;
}
async function tryMiikoDirectGuard(defSide){
  const p = state[defSide];
  if(countShields(defSide) > 0) return false;
  const empty = findEmptyIndex(p.C);
  if(empty < 0) return false;

  const miiko = p.hand.find(c=>c && c.no===21);
  if(!miiko) return false;

  if(defSide==="P1"){
    const use = await askYesNo("ミーコ", "ミーコを見参させて直接攻撃を無効にし、このターンのバトルを終了しますか？");
    if(!use) return false;
  }

  const act = {
    kind:"ACT",
    label:"ミーコ",
    activatorSide:defSide,
    resolve: async ()=>{
      const moved = removeFromHandByUid(defSide, miiko.uid);
      if(!moved) return;
      p.C[empty] = moved;
      log(`${sideName(defSide)}：ミーコを見参`);
      log(`ミーコ：直接攻撃を無効にし、このターンのバトルを終了`);
      state.battle.attackerUid = null;
      state.battle.attackerPos = null;
      state.phase = "END";
      renderAll();
    },
    onNegated: async (r)=>{
      if(r.negatorKind==="MEMORY"){
        const moved = removeFromHandByUid(defSide, miiko.uid);
        if(moved) moveToWing(defSide, moved);
        log(`ミーコ：記憶抹消で無効 → ウイング`);
      }else{
        log(`ミーコ：効果は無効`);
      }
      renderAll();
    }
  };

  const result = await processActivatedEffect(act);
  return result.ok;
}

/* ---------------- Battle ---------------- */
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

  const ok = await askYesNo("キャトルミューティレーション", "発動しますか？（相手キャラクター1体を手札に戻す）");
  if(!ok) return;

  const cattle = takeCattleFromHand_P1();
  if(!cattle) return;

  const enemyChars = state.AI.C.filter(Boolean);
  if(!enemyChars.length){
    moveToWing("P1", cattle);
    log("キャトル：相手キャラがいません（不発）", "warn");
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
async function resolveBattle(attacker, defenderUid){
  const enemySide = "AI";
  const defender = state[enemySide].C.find(c=>c && c.uid===defenderUid);
  if(!defender){ log("対象が無効です", "warn"); return; }

  const atkA = calcCurrentAtk("P1", attacker);
  const atkD = calcCurrentAtk("AI", defender);
  log(`バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  if(atkA > atkD){
    await sendCharacterToWing("AI", defender.uid);
    log(`撃破：${defender.name} → AIウイング`);
    if(attacker.no===23) await breakOneShieldByEffect("AI", attacker.name);
  }else if(atkA < atkD){
    const saved = await tryBattleSurvive("P1", attacker);
    if(!saved){
      await sendCharacterToWing("P1", attacker.uid);
      log(`敗北：${attacker.name} → あなたウイング`);
      await tryCattleTrigger_P1();
    }
  }else{
    const savedA = await tryBattleSurvive("P1", attacker);
    const savedD = await tryBattleSurvive("AI", defender);
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
async function chooseAttackTarget(){
  if(state.phase!=="BATTLE") return;
  if(!canBattleThisTurn("P1")){
    log(battleBanReason("P1"), "warn");
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

  const guarded = await tryMiikoDirectGuard("AI");
  attacker.flags.attackedCountThisTurn += 1;
  state.battle.attackerUid = null;
  state.battle.attackerPos = null;
  renderAll();
  if(guarded) return;

  await finishGame("P1");
}
async function selectAttacker(side, pos, card){
  if(side!=="P1") return;
  if(!canBattleThisTurn("P1")){
    log(battleBanReason("P1"), "warn");
    return;
  }

  const maxAtk = getMaxAttacks("P1", card);
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
function onShieldClicked(side, idx){
  if(state.gameOver) return;
  if(state.phase!=="BATTLE") return;
  if(state.activeSide!=="P1") return;
  if(side!=="AI") return;

  if(!canBattleThisTurn("P1")){
    log(battleBanReason("P1"), "warn");
    return;
  }
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
  }
}

/* ---------------- Opponent turn start effects ---------------- */
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
  }else if(item.no===24){
    b = 500 + (host.tags.includes("除霊") ? 500 : 0) + (host.tags.includes("除霊") ? 180 : 0);
  }
  return b;
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

  const act = {
    kind:"ACT",
    label:eff.name,
    activatorSide:"AI",
    resolve: async ()=>{
      const ok = await canActivateEffectNow("AI", eff);
      if(!ok){
        log(`発動できません：${eff.name}`, "warn");
        state.AI.E[ePos]=null;
        moveToWing("AI", eff);
        return;
      }
      await resolveEffect("AI", eff);
      state.AI.E[ePos]=null;
      moveToWing("AI", eff);
      log(`効果解決→ウイング：${eff.name}`);
      renderAll();
    },
    onNegated: async ()=>{
      if(state.AI.E[ePos] && state.AI.E[ePos].uid===eff.uid) state.AI.E[ePos]=null;
      moveToWing("AI", eff);
      log(`AI：無効化され ${eff.name} → AIウイング`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
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
        best = {itemIndex: it.i, item: it.c, hostPos: hs.i, score};
      }
    }
  }
  if(!best) return false;

  const item = p.hand.splice(best.itemIndex,1)[0];
  p.E[ePos]=item;
  log(`AI：E配置（発動） ${item.name}`);
  renderAll();

  const act = {
    kind:"ACT",
    label:item.name,
    activatorSide:"AI",
    resolve: async ()=>{ await equipItemFromE("AI", ePos, item); },
    onNegated: async ()=>{
      if(state.AI.E[ePos] && state.AI.E[ePos].uid===item.uid) state.AI.E[ePos]=null;
      moveToWing("AI", item);
      log(`AI：無効化され ${item.name} → AIウイング`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
  return true;
}
async function aiTryPlayBestCharacter(){
  const p = state.AI;
  const empty = findEmptyIndex(p.C);
  if(empty<0) return false;

  const candidates = [];
  for(let i=0;i<p.hand.length;i++){
    const c = p.hand[i];
    if(!c || !isCharacter(c)) continue;
    if(c.summon==="kensan") continue;

    let s = (c.baseAtk||0) + (c.rank||0)*120;
    if(c.no===8) s += 260;
    if(c.no===4) s += 140;
    if(c.no===5) s += 220;
    if(c.no===21) s += 230;
    if(c.no===23) s += 240;
    if(c.no===26 || c.no===27) s += 220;
    if(c.no===28) s += 230;
    candidates.push({i, c, s});
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
  card._extraAttacks = 0;
  best.c.equipUid = card.uid;

  log(`AI：司令 装備化 → ${best.c.name} ATK+500`);
  renderAll();
  return true;
}
async function aiTryActivateSeshiaArisa(){
  const p = state.AI;
  const cPos = p.C.findIndex(c=>c && c.no===28);
  if(cPos < 0) return false;
  if(state.phase!=="MAIN") return false;

  const hasTarget = p.hand.some(c=>c && c.type==="character" && c.rank<=5 && c.name.includes("レイチェル"));
  if(!hasTarget) return false;
  if(findEmptyIndex(p.C) < 0) return false;

  const card = p.C[cPos];
  const act = {
    kind:"ACT",
    label:card.name,
    activatorSide:"AI",
    resolve: async ()=>{ await activateSeshiaArisaSummon("AI", cPos, card); },
    onNegated: async (r)=>{
      if(r.negatorKind==="MEMORY") await sendCharacterToWing("AI", card.uid);
      log(`${card.name} の効果は無効`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
  return true;
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
      if(attacker.no===23 && countShields("P1")>0) score += 240;
    }else if(atkA < atkD){
      const selfLoss = estimateRemoveValue(attacker) + 380;
      const canSave = ((attacker.no===12 || attacker.no===21) && !attacker.flags.producerSavedThisTurn);
      score -= canSave ? (selfLoss*0.35) : selfLoss;
      score -= 120;
    }else{
      score += estimateRemoveValue(t)*0.35;
      score -= estimateRemoveValue(attacker)*0.55;
    }

    if(t.no===8) score += 460;
    if(!best || score > best.score) best = {type:"C", uid:t.uid, score};
  }

  if(!enemyChars.length){
    const shields = state.P1.shield.map((c, idx)=>({c, idx})).filter(x=>!!x.c);
    if(shields.length){
      const pick = shields[0];
      const score = 450 + countShields("P1")*60;
      if(!best || score > best.score) best = {type:"S", idx:pick.idx, score};
    }else{
      best = {type:"D", score:999999};
    }
  }
  return best;
}
async function aiBattleBest(){
  const p = state.AI;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;
    if(a.flags.attackedCountThisTurn >= getMaxAttacks("AI", a)) continue;

    const best = pickBestAIAttackFor(a);
    if(!best) continue;

    if(best.type==="C"){
      const t = state.P1.C.find(c=>c && c.uid===best.uid);
      if(!t) continue;

      const atkA = calcCurrentAtk("AI", a);
      const atkD = calcCurrentAtk("P1", t);
      log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

      if(atkA > atkD){
        await sendCharacterToWing("P1", t.uid);
        log(`AI：撃破 ${t.name} → あなたウイング`);
        await tryCattleTrigger_P1();
        if(a.no===23) await breakOneShieldByEffect("P1", a.name);
      }else if(atkA < atkD){
        const saved = await tryBattleSurvive("AI", a);
        if(!saved){
          await sendCharacterToWing("AI", a.uid);
          log(`AI：敗北 ${a.name} → AIウイング`);
        }
      }else{
        const savedA = await tryBattleSurvive("AI", a);
        const savedD = await tryBattleSurvive("P1", t);
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
      const guarded = await tryMiikoDirectGuard("P1");
      a.flags.attackedCountThisTurn += 1;
      renderAll();
      if(guarded) break;
      await finishGame("AI");
      break;
    }
  }
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
  didSomething = (await aiTryActivateSeshiaArisa()) || didSomething;
  await sleep(90);

  if(state.AI.hand.length >= 6){
    didSomething = (await aiTryPlayBestCharacter()) || didSomething;
    await sleep(80);
    didSomething = (await aiTryActivateSeshiaArisa()) || didSomething;
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

  if(!canBattleThisTurn("AI")){
    log(`AI：${battleBanReason("AI")}（BATTLEスキップ）`);
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

/* ---------------- Win / Result ---------------- */
async function finishGame(winnerSide){
  state.gameOver=true;
  renderAll();
  const text = (winnerSide==="P1") ? "YOU WIN！" : "YOU LOSE…";
  if(el.resultText) el.resultText.textContent = text;
  showModal("resultM");
}

/* ---------------- Bindings ---------------- */
function bindStart(){
  if(el.boot) el.boot.textContent="JS: OK";

  const openDeck = ()=>{
    state.titleLongPressed = true;
    openDeckEditor();
    setTimeout(()=>{ state.titleLongPressed=false; }, 420);
  };

  bindLongPress(el.btnStart, openDeck, 620);
  bindLongPress(el.title, openDeck, 620);

  const go = ()=>{
    if(state.startLock) return;
    if(state.titleLongPressed) return;
    if(state.started) return;

    state.startLock = true;
    setTimeout(()=>{ state.startLock=false; }, 350);

    state.started=true;
    if(el.title) el.title.classList.remove("active");
    if(el.game) el.game.classList.add("active");
    startGame();
  };

  const bindTap = (node)=>{
    if(!node) return;
    node.addEventListener("click", (e)=>{
      e.stopPropagation();
      go();
    }, {passive:false});

    node.addEventListener("pointerup", ()=>{
      if(state.titleLongPressed) return;
      go();
    }, {passive:true});

    node.addEventListener("touchend", ()=>{
      if(state.titleLongPressed) return;
      go();
    }, {passive:true});
  };

  bindTap(el.btnStart);
  bindTap(el.title);
}
function bindHUD(){
  if(el.btnHelp) el.btnHelp.addEventListener("click", ()=> showModal("helpM"), {passive:true});
  if(el.btnSettings) el.btnSettings.addEventListener("click", ()=>{
    if(el.repoInput) el.repoInput.value = getRepo();
    showModal("settingsM");
  }, {passive:true});

  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 620);

  if(el.btnNext) el.btnNext.addEventListener("click", ()=>{
    if(state.activeSide!=="P1" || state.gameOver) return;
    nextPhase();
  }, {passive:true});

  if(el.btnEnd) el.btnEnd.addEventListener("click", ()=>{
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
  if(el.btnRepoSave) el.btnRepoSave.addEventListener("click", async ()=>{
    const v = (el.repoInput?.value||"").trim();
    if(!v.includes("/")){
      log("設定NG：owner/repo 形式で入力してください", "warn");
      return;
    }
    setRepo(v);
    clearCache();
    log(`設定：repo=${v}`);
    await rescanImages();
  }, {passive:true});

  if(el.btnRescan) el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});
  if(el.btnClearCache) el.btnClearCache.addEventListener("click", ()=>{ clearCache(); log("キャッシュ削除"); }, {passive:true});
}
function bindResult(){
  if(el.btnNextGame) el.btnNextGame.addEventListener("click", ()=>{
    hideModal("resultM");
    startGame();
  }, {passive:true});

  if(el.btnBackTitle) el.btnBackTitle.addEventListener("click", ()=>{
    hideModal("resultM");
    state.started=false;
    state.gameOver=false;
    if(el.game) el.game.classList.remove("active");
    if(el.title) el.title.classList.add("active");
    if(el.boot) el.boot.textContent="JS: OK（準備完了）";
  }, {passive:true});
}

/* ---------------- init ---------------- */
async function init(){
  ensureInitialCollectionAndDeck();

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

  if(el.boot) el.boot.textContent="JS: OK（準備完了）";
  log("v50021：完全版（丸ごと置換）");
  log("追加：No.21 ミーコ");
  log("追加：No.28 セシア＆アリサ");
  log("画像対応：21_ミーコ.png.PNG");
  log("画像対応：28_セシア&アリサ.png.PNG");
}

document.addEventListener("DOMContentLoaded", init);
/* =========================================================
  Manpuku World - v50021 末尾追記パッチ
  - AIロジック強化
  - AIデッキを毎回ランダム生成（シナジー重視）
  - 既存本体の末尾にそのまま追記
========================================================= */

const MW_AI_PATCH_VERSION = "AI_PATCH_V1";

/* ---------------- AI deck builder ---------------- */
function mwCountCopies(list, no){
  let n = 0;
  for(const x of list) if(x===no) n++;
  return n;
}
function mwCanPush(list, no, max=3){
  return !!getCardDef(no) && mwCountCopies(list, no) < max && list.length < 40;
}
function mwPushCopies(list, no, n, max=3){
  for(let i=0;i<n;i++){
    if(!mwCanPush(list, no, max)) break;
    list.push(no);
  }
}
function mwPushMany(list, arr, max=3){
  for(const no of arr){
    if(mwCanPush(list, no, max)) list.push(no);
    if(list.length>=40) break;
  }
}
function mwShuffled(arr){
  const a = arr.slice();
  shuffle(a);
  return a;
}
function mwDeckScoreByTheme(list, recipe){
  let s = 0;
  for(const no of list){
    if(recipe.core.includes(no)) s += 6;
    if(recipe.support.includes(no)) s += 3;
    if(recipe.tech.includes(no)) s += 1;
  }
  return s;
}
function buildSmartAIDeckList(){
  const recipes = [
    {
      key:"GB_CONTROL",
      name:"怨霊撲滅屋GB制圧",
      core:[23,24,28,21],
      support:[8,14,16,12,17],
      tech:[11,13,15,18,19,20],
      build(){
        const d = [];
        mwPushCopies(d, 23, 3);
        mwPushCopies(d, 24, 3);
        mwPushCopies(d, 28, 3);
        mwPushCopies(d, 21, 2);
        mwPushCopies(d, 8, 3);
        mwPushCopies(d, 14, 3);
        mwPushCopies(d, 16, 3);
        mwPushCopies(d, 12, 2);
        mwPushCopies(d, 17, 2);
        mwPushCopies(d, 11, 2);
        mwPushCopies(d, 13, 2);
        mwPushCopies(d, 15, 2);
        mwPushCopies(d, 18, 2);
        mwPushCopies(d, 19, 1);
        mwPushCopies(d, 20, 1);
        const filler = mwShuffled([4,5,6,7,9,10,26,27,1,2,3]);
        while(d.length < 40) mwPushMany(d, filler, 3);
        return d.slice(0,40);
      }
    },
    {
      key:"MAGIA_CONTROL",
      name:"黒魔法制圧",
      core:[1,2,6,20],
      support:[8,14,16,12,13,15],
      tech:[11,17,18,19,21,23,24,28],
      build(){
        const d = [];
        mwPushCopies(d, 1, 3);
        mwPushCopies(d, 2, 3);
        mwPushCopies(d, 6, 3);
        mwPushCopies(d, 20, 3);
        mwPushCopies(d, 8, 3);
        mwPushCopies(d, 14, 3);
        mwPushCopies(d, 16, 3);
        mwPushCopies(d, 12, 2);
        mwPushCopies(d, 13, 2);
        mwPushCopies(d, 15, 2);
        mwPushCopies(d, 11, 2);
        mwPushCopies(d, 17, 2);
        mwPushCopies(d, 21, 2);
        mwPushCopies(d, 23, 2);
        mwPushCopies(d, 24, 2);
        mwPushCopies(d, 28, 1);
        const filler = mwShuffled([4,5,7,18,19,26,27,3,9,10]);
        while(d.length < 40) mwPushMany(d, filler, 3);
        return d.slice(0,40);
      }
    },
    {
      key:"BUGBUG_COMBO",
      name:"BUGBUG展開",
      core:[5,9,10],
      support:[8,14,16,11,12,13],
      tech:[17,18,19,20,21,23,24,26,27,28],
      build(){
        const d = [];
        mwPushCopies(d, 5, 3);
        mwPushCopies(d, 9, 3);
        mwPushCopies(d, 10, 3);
        mwPushCopies(d, 8, 3);
        mwPushCopies(d, 14, 3);
        mwPushCopies(d, 16, 3);
        mwPushCopies(d, 11, 2);
        mwPushCopies(d, 12, 2);
        mwPushCopies(d, 13, 2);
        mwPushCopies(d, 17, 2);
        mwPushCopies(d, 18, 2);
        mwPushCopies(d, 19, 2);
        mwPushCopies(d, 20, 2);
        mwPushCopies(d, 21, 2);
        mwPushCopies(d, 23, 2);
        mwPushCopies(d, 24, 1);
        const filler = mwShuffled([4,6,7,26,27,28,1,2,3,15]);
        while(d.length < 40) mwPushMany(d, filler, 3);
        return d.slice(0,40);
      }
    },
    {
      key:"RUBY_SAPPHIRE",
      name:"美少女戦士連携",
      core:[26,27,11,12],
      support:[8,14,16,18,19,20,17],
      tech:[5,9,10,13,15,21,23,24,28,7],
      build(){
        const d = [];
        mwPushCopies(d, 26, 3);
        mwPushCopies(d, 27, 3);
        mwPushCopies(d, 11, 3);
        mwPushCopies(d, 12, 2);
        mwPushCopies(d, 8, 3);
        mwPushCopies(d, 14, 3);
        mwPushCopies(d, 16, 3);
        mwPushCopies(d, 18, 2);
        mwPushCopies(d, 19, 2);
        mwPushCopies(d, 20, 2);
        mwPushCopies(d, 17, 2);
        mwPushCopies(d, 21, 2);
        mwPushCopies(d, 13, 2);
        mwPushCopies(d, 23, 2);
        mwPushCopies(d, 24, 2);
        mwPushCopies(d, 28, 2);
        const filler = mwShuffled([1,2,3,4,5,6,7,9,10,15]);
        while(d.length < 40) mwPushMany(d, filler, 3);
        return d.slice(0,40);
      }
    }
  ];

  const recipe = recipes[Math.floor(Math.random()*recipes.length)];
  let deck = recipe.build();

  if(deck.length > 40) deck = deck.slice(0,40);
  while(deck.length < 40){
    const pool = mwShuffled(recipe.core.concat(recipe.support).concat(recipe.tech));
    mwPushMany(deck, pool, 3);
    if(pool.length===0) break;
  }

  localStorage.setItem(LS_AI_DECK, JSON.stringify(deck.slice()));
  log(`AIデッキ生成：${recipe.name} / 40枚`);
  return deck;
}

/* ---------------- AI heuristics ---------------- */
function aiCardValue(side, c){
  if(!c) return -99999;
  let s = (c.baseAtk||0) + (c.rank||0)*130;
  if(c.no===8) s += 360;
  if(c.no===23) s += 480;
  if(c.no===28) s += 260;
  if(c.no===5) s += 230;
  if(c.no===1) s += 240;
  if(c.no===26 || c.no===27) s += 210;
  if(c.no===21) s += 180;
  if(c.equipUid) s += 250;
  if(c.tags?.includes("除霊")) s += 120;
  if(c.tags?.includes("射手")) s += 90;
  if(c.tags?.includes("美少女戦士")) s += 80;
  s += calcCurrentAtk(side, c) * 0.35;
  return s;
}
function chooseAISacrificeFromField(side, excludeUid=null){
  const arr = state[side].C
    .map((c,i)=>({c,i}))
    .filter(x=>x.c && x.c.uid!==excludeUid)
    .sort((a,b)=> aiCardValue(side,a.c) - aiCardValue(side,b.c));
  return arr[0] || null;
}
function chooseAISacrificeFromHand(side, excludeUid=null){
  const arr = state[side].hand
    .map((c,i)=>({c,i}))
    .filter(x=>x.c && x.c.uid!==excludeUid && isCharacter(x.c))
    .sort((a,b)=> aiCardValue(side,a.c) - aiCardValue(side,b.c));
  return arr[0] || null;
}
function aiHasDeckOrWingTargetByName(side, word){
  return state[side].deck.some(c=>c && c.name.includes(word)) || state[side].wing.some(c=>c && c.name.includes(word));
}
function aiHasDeckTargetByTitleItem(side, titleTag){
  return state[side].deck.some(c=>c && c.titleTag===titleTag && c.type==="item");
}
function aiShouldUseCruella(side, card){
  if(state.limits[side].cruellaUsed) return false;
  return aiHasDeckOrWingTargetByName(side, "黒魔法");
}
function aiShouldUseNikola(side, card){
  if(card.used.perTurn) return false;
  const enemy = opponent(side);
  const foes = state[enemy].C.filter(Boolean);
  if(!foes.length) return countShields(enemy) > 0;
  const myAtk = calcCurrentAtk(side, card);
  const boosted = myAtk + 1000;
  return foes.some(f=> boosted >= calcCurrentAtk(enemy, f) && myAtk < calcCurrentAtk(enemy, f));
}
function aiShouldUseEfi(side, card){
  if(card.used.perTurn) return false;
  return state[opponent(side)].C.some(Boolean);
}
function aiShouldUseTata(side, card){
  if(state.limits[side].tataUsed) return false;
  if(!state[side].deck.some(c=>c && c.titleTag==="BUGBUG西遊記")) return false;
  return state[side].hand.length >= 2;
}
async function aiTryUseFieldAbilities(){
  let acted = false;
  const p = state.AI;

  for(let i=0;i<3;i++){
    const card = p.C[i];
    if(!card) continue;
    if(isRachelSealActiveAgainst("AI", card)) continue;

    if(card.no===28){
      const did = await aiTryActivateSeshiaArisa();
      acted = did || acted;
    }
  }

  for(let i=0;i<3;i++){
    const card = p.C[i];
    if(!card) continue;
    if(isRachelSealActiveAgainst("AI", card)) continue;

    if(card.no===1 && aiShouldUseCruella("AI", card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:"AI",
        resolve: async ()=>{ await activateCruellaSearch("AI", card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing("AI", card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }

    if(card.no===3 && aiShouldUseNikola("AI", card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:"AI",
        resolve: async ()=>{ await activateNikolaBuff("AI", i, card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing("AI", card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }

    if(card.no===5 && aiShouldUseTata("AI", card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:"AI",
        resolve: async ()=>{ await activateTataExchange("AI", card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing("AI", card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }

    if(card.no===6 && aiShouldUseEfi("AI", card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:"AI",
        resolve: async ()=>{ await activateEfiDebuff("AI", card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing("AI", card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }
  }

  return acted;
}

/* ---------------- AI summon improvements ---------------- */
async function aiDoKensanSummon(cPos, handIdx){
  const p = state.AI;
  const card = p.hand[handIdx];
  if(!card || card.summon!=="kensan" || p.C[cPos]) return false;

  let cost = chooseAISacrificeFromField("AI", null);
  if(cost){
    const moved = p.C[cost.i];
    await stripEquipIfAny("AI", moved);
    p.C[cost.i] = null;
    moveToWing("AI", moved);
  }else{
    const handCost = chooseAISacrificeFromHand("AI", card.uid);
    if(!handCost) return false;
    const moved = p.hand.splice(handCost.i,1)[0];
    moveToWing("AI", moved);
    if(handCost.i < handIdx) handIdx -= 1;
  }

  const placed = p.hand.splice(handIdx,1)[0];
  p.C[cPos] = placed;
  log(`AI：見参 ${placed.name}`);
  renderAll();
  await onEnterTriggers("AI", {zone:"C", pos:cPos, card:placed});
  return true;
}
async function aiDoRubySapphireKensan(cPos, handIdx){
  const p = state.AI;
  const card = p.hand[handIdx];
  if(!card || !isRubySapphire(card) || p.C[cPos]) return false;
  if(!canRubySapphireKensan("AI", card)) return false;

  const placed = p.hand.splice(handIdx,1)[0];
  p.C[cPos] = placed;
  log(`AI：見参 ${placed.name}`);
  renderAll();
  await onEnterTriggers("AI", {zone:"C", pos:cPos, card:placed});
  return true;
}
function aiScoreCharacterToPlay(side, c){
  let s = aiCardValue(side, c);
  const empty = findEmptyIndex(state[side].C);
  if(empty < 0) return -999999;

  if(c.summon==="kensan"){
    const hasFieldCost = !!chooseAISacrificeFromField(side, null);
    const hasHandCost = !!chooseAISacrificeFromHand(side, c.uid);
    if(!(hasFieldCost || hasHandCost)) return -999999;
    s += 120;
  }

  if(isRubySapphire(c) && canRubySapphireKensan(side, c)) s += 180;
  if(c.no===28 && state[side].hand.some(x=>x && x.type==="character" && x.rank<=5 && x.name.includes("レイチェル"))) s += 320;
  if(c.no===23) s += 240;
  if(c.no===5) s += 220;
  if(c.no===4 && state[side].deck.some(x=>x && x.tags.includes("クランプス"))) s += 180;
  if(c.no===26 || c.no===27) s += 140;
  return s;
}
async function aiTryPlayBestCharacter(){
  const p = state.AI;
  const empty = findEmptyIndex(p.C);
  if(empty<0) return false;

  const candidates = [];
  for(let i=0;i<p.hand.length;i++){
    const c = p.hand[i];
    if(!c || !isCharacter(c)) continue;
    if(state.normalSummonUsed && c.summon!=="kensan" && !(isRubySapphire(c) && canRubySapphireKensan("AI", c))) continue;
    const s = aiScoreCharacterToPlay("AI", c);
    if(s <= -999999) continue;
    candidates.push({i, c, s});
  }
  if(!candidates.length) return false;

  candidates.sort((a,b)=> b.s - a.s);
  const pick = candidates[0];

  if(pick.c.summon==="kensan"){
    return await aiDoKensanSummon(empty, pick.i);
  }
  if(isRubySapphire(pick.c) && canRubySapphireKensan("AI", pick.c) && pick.s >= aiCardValue("AI", pick.c)+150){
    return await aiDoRubySapphireKensan(empty, pick.i);
  }

  const c = p.hand.splice(pick.i,1)[0];
  p.C[empty]=c;
  state.normalSummonUsed = true;
  log(`AI：登場 ${c.name}`);
  renderAll();
  await onEnterTriggers("AI", {zone:"C", pos:empty, card:c});
  return true;
}

/* ---------------- AI spell/item ordering ---------------- */
function aiEffectPriority(effectNo){
  if(effectNo===2) return 90;
  if(effectNo===16) return 80;
  return 10;
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

  const act = {
    kind:"ACT",
    label:eff.name,
    activatorSide:"AI",
    resolve: async ()=>{
      const ok = await canActivateEffectNow("AI", eff);
      if(!ok){
        log(`発動できません：${eff.name}`, "warn");
        state.AI.E[ePos]=null;
        moveToWing("AI", eff);
        return;
      }
      await resolveEffect("AI", eff);
      state.AI.E[ePos]=null;
      moveToWing("AI", eff);
      log(`効果解決→ウイング：${eff.name}`);
      renderAll();
    },
    onNegated: async ()=>{
      if(state.AI.E[ePos] && state.AI.E[ePos].uid===eff.uid) state.AI.E[ePos]=null;
      moveToWing("AI", eff);
      log(`AI：無効化され ${eff.name} → AIウイング`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
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
      let score = bonus + hostAtk*0.2 + aiCardValue("AI", hs.h)*0.12;
      if(it.c.no===24 && hs.h.no===23) score += 700;
      if(it.c.no===18 && hs.h.no===7) score += 620;
      if(it.c.no===19 && (hs.h.tags.includes("勇者") || hs.h.tags.includes("剣士"))) score += 260;
      if(score <= 0) continue;
      if(!best || score > best.score){
        best = {itemIndex: it.i, item: it.c, hostPos: hs.i, score};
      }
    }
  }
  if(!best) return false;

  const item = p.hand.splice(best.itemIndex,1)[0];
  p.E[ePos]=item;
  log(`AI：E配置（発動） ${item.name}`);
  renderAll();

  const act = {
    kind:"ACT",
    label:item.name,
    activatorSide:"AI",
    resolve: async ()=>{ await equipItemFromE("AI", ePos, item); },
    onNegated: async ()=>{
      if(state.AI.E[ePos] && state.AI.E[ePos].uid===item.uid) state.AI.E[ePos]=null;
      moveToWing("AI", item);
      log(`AI：無効化され ${item.name} → AIウイング`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
  return true;
}

/* ---------------- AI battle improvements ---------------- */
function pickBestAIAttackFor(attacker){
  const atkA = calcCurrentAtk("AI", attacker);
  const enemyChars = state.P1.C.filter(Boolean);
  let best = null;

  for(const t of enemyChars){
    const atkD = calcCurrentAtk("P1", t);
    let score = 0;

    if(atkA > atkD){
      score += estimateRemoveValue(t) + 520;
      if(attacker.no===23 && countShields("P1")>0) score += 280;
      if(t.no===8) score += 260;
    }else if(atkA === atkD){
      const selfCanSave = ((attacker.no===12 || attacker.no===21) && !attacker.flags.producerSavedThisTurn);
      const foeCanSave = ((t.no===12 || t.no===21) && !t.flags.producerSavedThisTurn);
      score += foeCanSave ? 160 : estimateRemoveValue(t)*0.45;
      score -= selfCanSave ? 40 : estimateRemoveValue(attacker)*0.55;
    }else{
      const selfCanSave = ((attacker.no===12 || attacker.no===21) && !attacker.flags.producerSavedThisTurn);
      score -= selfCanSave ? 120 : (estimateRemoveValue(attacker) + 360);
      if(t.no===8) score += 120;
    }

    if(attacker.no===7 && countShields("P1")===0) score -= 999999;
    if(!best || score > best.score) best = {type:"C", uid:t.uid, score};
  }

  if(!enemyChars.length){
    const shields = state.P1.shield.map((c, idx)=>({c, idx})).filter(x=>!!x.c);
    if(shields.length){
      const score = 600 + countShields("P1")*70;
      best = {type:"S", idx:shields[0].idx, score};
    }else if(attacker.no!==7){
      best = {type:"D", score:999999};
    }
  }
  return best;
}
async function aiBattleBest(){
  const p = state.AI;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;

    while(a && state.AI.C[i] && state.AI.C[i].uid===a.uid && a.flags.attackedCountThisTurn < getMaxAttacks("AI", a)){
      const best = pickBestAIAttackFor(a);
      if(!best || best.score < -1000) break;

      if(best.type==="C"){
        const t = state.P1.C.find(c=>c && c.uid===best.uid);
        if(!t) break;

        const atkA = calcCurrentAtk("AI", a);
        const atkD = calcCurrentAtk("P1", t);
        log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

        if(atkA > atkD){
          await sendCharacterToWing("P1", t.uid);
          log(`AI：撃破 ${t.name} → あなたウイング`);
          await tryCattleTrigger_P1();
          if(a.no===23) await breakOneShieldByEffect("P1", a.name);
        }else if(atkA < atkD){
          const saved = await tryBattleSurvive("AI", a);
          if(!saved){
            await sendCharacterToWing("AI", a.uid);
            log(`AI：敗北 ${a.name} → AIウイング`);
          }
        }else{
          const savedA = await tryBattleSurvive("AI", a);
          const savedD = await tryBattleSurvive("P1", t);
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
        if(!state.AI.C[i] || state.AI.C[i].uid!==a.uid) break;
        continue;
      }

      if(best.type==="S"){
        const sh = state.P1.shield[best.idx];
        if(!sh) break;
        state.P1.shield[best.idx]=null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊（あなた）${best.idx+1} → あなた手札へ`);
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        await sleep(150);
        continue;
      }

      if(best.type==="D"){
        const guarded = await tryMiikoDirectGuard("P1");
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        if(guarded) break;
        await finishGame("AI");
        return;
      }

      break;
    }
  }
}

/* ---------------- AI main loop ---------------- */
async function aiTakeTurn(){
  state.phase = "DRAW";
  draw("AI", 1);
  enforceHandLimit("AI");
  renderAll();
  await sleep(120);

  state.phase = "MAIN";
  renderAll();
  await sleep(120);

  let actions = 0;
  let acted = true;

  while(acted && actions < 10 && !state.gameOver){
    acted = false;

    if(await aiTryPlayBestCharacter()){ acted = true; actions++; await sleep(70); continue; }
    if(await aiTryActivateSeshiaArisa()){ acted = true; actions++; await sleep(70); continue; }
    if(await aiTryUseFieldAbilities()){ acted = true; actions++; await sleep(70); continue; }
    if(await aiTryPlayBestItem()){ acted = true; actions++; await sleep(70); continue; }

    const effectPlan = [2,16];
    for(const no of effectPlan){
      if(await aiTryPlayEffect(no)){
        acted = true;
        actions++;
        await sleep(70);
        break;
      }
    }
  }

  if(actions===0){
    log("AI：有効なプレイが見つからず（このターンは展開なし）", "warn");
  }

  state.phase = "BATTLE";
  renderAll();
  await sleep(120);

  if(!canBattleThisTurn("AI")){
    log(`AI：${battleBanReason("AI")}（BATTLEスキップ）`);
  }else{
    await aiBattleBest();
  }

  state.phase = "END";
  enforceHandLimit("AI");
  clearEndTurnTemps("AI");
  renderAll();
  await sleep(100);

  log("AI：ターン終了");
}

/* ---------------- startGame override: AI uses smart random deck ---------------- */
function startGame(){
  ensureInitialCollectionAndDeck();

  state.gameOver=false;
  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.announce.lastSelUid=null;
  state.battle.attackerUid=null;
  state.turnsTaken = { P1:0, AI:0 };

  const deckList = readDeck();
  if(deckList.length!==40){
    log(`警告：デッキが${deckList.length}枚です。デッキ編集で40枚にして下さい`, "warn");
  }
  state.P1.deck = buildDeckFromList(deckList);

  const aiList = buildSmartAIDeckList();
  state.AI.deck = buildDeckFromList(aiList);

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
  log(`ゲーム開始：初手4 / シールド3 / 先攻=${el.firstInfo?el.firstInfo.textContent:(state.firstSide==="P1"?"先攻：あなた":"先攻：相手")}`);
  log(`あなたのデッキ：${readDeck().length}枚（編集反映）`);
  log(`AI：ランダム構築デッキを使用`);

  beginTurn(state.activeSide);
  renderAll();

  if(state.activeSide==="AI"){
    (async ()=>{
      await aiTakeTurn();
      state.activeSide="P1";
      state.turn=2;
      state.phase="START";
      beginTurn("P1");
      log(`TURN ${state.turn} あなたのターン`);
      renderAll();
    })();
  }
}

log(`${MW_AI_PATCH_VERSION} 読み込み完了`);
/* =========================================================
  PATCH 01
  ターン進行を一方向化
  START → DRAW → MAIN → BATTLE → END → 相手ターン
========================================================= */

function nextPhase(){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  if(state.phase==="START"){
    state.phase = "DRAW";
    draw("P1", 1);
    log("あなた：ドロー +1");
    renderAll();
    return;
  }

  if(state.phase==="DRAW"){
    state.phase = "MAIN";
    renderAll();
    return;
  }

  if(state.phase==="MAIN"){
    state.phase = "BATTLE";
    renderAll();
    return;
  }

  if(state.phase==="BATTLE"){
    endTurn();
    return;
  }

  if(state.phase==="END"){
    return;
  }
}
/* =========================================================
  PATCH 02
  カウンター選択停止バグ修正
  - 反応札が無い時は確認UIを出さず自動PASS
  - 選択後に対象札が無い場合も自動PASS
  - 停止せず相手処理を続行
========================================================= */

function getAvailableCounters(side, prevLink){
  const out = [];

  if(canUseHandgata(side, prevLink.activatorSide)){
    out.push("HANDGATA");
  }
  if(canUseMemoryErase(side, prevLink.activatorSide)){
    out.push("MEMORY");
  }

  return out;
}

async function chooseCounterForSide(side, prevLink){
  const available = getAvailableCounters(side, prevLink);

  // 反応手段が無いなら確認UIを出さず自動PASS
  if(available.length === 0){
    return "PASS";
  }

  const items = [];
  if(available.includes("HANDGATA")){
    items.push({label:"手形で無効", value:"HANDGATA"});
  }
  if(available.includes("MEMORY")){
    items.push({label:"記憶抹消で無効", value:"MEMORY"});
  }
  items.push({label:"しない", value:"PASS"});

  if(side === "P1"){
    return await askChoice(
      "チェーン確認",
      `${sideName(prevLink.activatorSide)}が「${prevLink.label}」を発動しました。\n反応しますか？`,
      items
    );
  }

  // AIは使えるものだけ選ぶ
  if(available.includes("MEMORY")) return "MEMORY";
  if(available.includes("HANDGATA")) return "HANDGATA";
  return "PASS";
}

async function runCounterChain(initialLink){
  const chain = [initialLink];
  let priority = opponent(initialLink.activatorSide);
  let passCount = 0;

  while(passCount < 2){
    const prevLink = chain[chain.length - 1];
    let choice = await chooseCounterForSide(priority, prevLink);

    // 念のため、選択後に状態が変わっていても再検証する
    const availableNow = getAvailableCounters(priority, prevLink);

    if(choice === "HANDGATA" && !availableNow.includes("HANDGATA")){
      choice = "PASS";
    }
    if(choice === "MEMORY" && !availableNow.includes("MEMORY")){
      choice = "PASS";
    }

    if(choice === "HANDGATA"){
      state.limits[priority].handgataUsed = true;
      chain.push({
        kind:"HANDGATA",
        label:"手形",
        activatorSide: priority,
      });
      log(`${sideName(priority)}：手形を発動`);
      priority = opponent(priority);
      passCount = 0;
      continue;
    }

    if(choice === "MEMORY"){
      const me = takeMemoryEraseFromHand(priority);

      // 選択時点では使える判定でも、実体が無ければ自動PASS
      if(me){
        moveToWing(priority, me);
        chain.push({
          kind:"MEMORY",
          label:"記憶抹消",
          activatorSide: priority,
        });
        log(`${sideName(priority)}：記憶抹消を発動`);
        priority = opponent(priority);
        passCount = 0;
        continue;
      }else{
        choice = "PASS";
      }
    }

    passCount += 1;
    priority = opponent(priority);
  }

  const active = Array(chain.length).fill(true);
  for(let i=chain.length-1; i>=1; i--){
    if(active[i]) active[i-1] = false;
  }

  for(let i=1;i<chain.length;i++){
    if(active[i]) log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：直前の効果を無効`);
    else log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効にされた`);
  }

  const negated = !active[0];
  const negatorKind = negated && chain[1] ? chain[1].kind : null;
  return { negated, negatorKind, chain, active };
}
/* =========================================================
  PATCH 03
  選択ウィンドウ閉じで停止する不具合修正
  + AIのクルエラサーチをAI内完結化
========================================================= */

/* -----------------------------------------
  choice modal を閉じても停止しないようにする
----------------------------------------- */
let __mwChoiceFallbackValue = null;

function __mwResolveChoiceByClose(){
  if(choiceResolver){
    const r = choiceResolver;
    choiceResolver = null;
    hideModal("choiceM");
    r(__mwChoiceFallbackValue);
  }
}

function askChoice(title, message, items){
  if(!el.choiceTitle || !el.choiceBody){
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
      hideModal("choiceM");
      if(choiceResolver){
        const r = choiceResolver;
        choiceResolver = null;
        r(it.value);
      }
    }, {passive:true});

    if(it.card){
      bindLongPress(row, ()=> openViewer(it.card, it.viewerCtx||null), 620);
    }
    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);

  /* 閉じる時の既定値を決める
     PASS > X > N > null の順で安全に倒す */
  __mwChoiceFallbackValue = null;
  if(Array.isArray(items)){
    const vals = items.map(x=>x?.value);
    if(vals.includes("PASS")) __mwChoiceFallbackValue = "PASS";
    else if(vals.includes("X")) __mwChoiceFallbackValue = "X";
    else if(vals.includes("N")) __mwChoiceFallbackValue = "N";
    else __mwChoiceFallbackValue = null;
  }

  showModal("choiceM");
  return new Promise((resolve)=>{
    choiceResolver = resolve;
  });
}

/* choiceモーダルを閉じた時に未解決のまま残さない */
document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close === "choice"){
    __mwResolveChoiceByClose();
  }
}, {passive:true});

/* -----------------------------------------
  クルエラの名称サーチにAI自動選択を追加
----------------------------------------- */
async function searchFromDeckOrWingByNameIncludes(side, word, n, opt={}){
  const p = state[side];
  const poolBase = ()=>[
    ...p.deck.map(c=>({src:"deck", c})),
    ...p.wing.map(c=>({src:"wing", c}))
  ].filter(x=>x.c && x.c.name.includes(word));

  const firstPool = poolBase();
  if(!firstPool.length){
    log(`サーチ失敗：名称「${word}」が見つかりません`, "warn");
    return;
  }

  for(let k=0;k<n;k++){
    const pool = poolBase();
    if(!pool.length) break;

    if(opt.aiAuto){
      /* AIは内部で完結。基本は deck 優先、なければ wing */
      let pick = pool.find(x=>x.src==="deck") || pool[0];
      if(pick.src==="deck"){
        const moved = removeFromZone(p.deck, pick.c.uid);
        if(moved) p.hand.push(moved);
      }else{
        const moved = removeFromZone(p.wing, pick.c.uid);
        if(moved) p.hand.push(moved);
      }
      log(`AI：サーチ（名称「${word}」）`);
      continue;
    }

    const items = pool.map(x=>({
      label:`${x.c.name}`,
      sub:`${x.src.toUpperCase()} / NAME:${word}`,
      value:`${x.src}:${x.c.uid}`,
      card:x.c
    }));

    const pick = await askChoice("サーチ", `名称「${word}」を手札に加える（${k+1}/${n}）`, items);
    if(!pick){
      log(`サーチ中断：名称「${word}」`, "warn");
      return;
    }

    const [src, uid] = String(pick).split(":");
    if(src==="deck"){
      const moved = removeFromZone(p.deck, uid);
      if(moved) p.hand.push(moved);
    }else if(src==="wing"){
      const moved = removeFromZone(p.wing, uid);
      if(moved) p.hand.push(moved);
    }
  }
  log(`サーチ：名称「${word}」を手札へ`);
}

/* -----------------------------------------
  クルエラ発動時、AIはAI内でサーチ完結
----------------------------------------- */
async function activateCruellaSearch(side, card){
  if(state.activeSide!==side || state.phase!=="MAIN"){
    log("今は発動できません", "warn");
    return;
  }
  if(state.limits[side].cruellaUsed){
    log("クルエラ：このターンは既に使用しています", "warn");
    return;
  }

  if(side==="AI"){
    state.limits[side].cruellaUsed = true;
    await searchFromDeckOrWingByNameIncludes(side, "黒魔法", 1, {aiAuto:true});
    renderAll();
    return;
  }

  if(side==="P1"){
    if(!(await askYesNo("クルエラ", "効果を発動しますか？（カード名に「黒魔法」を含むカードをサーチ）"))){
      return;
    }
    state.limits[side].cruellaUsed = true;
    await searchFromDeckOrWingByNameIncludes(side, "黒魔法", 1);
    renderAll();
  }
}

/* -----------------------------------------
  カウンター確認を閉じても停止しないよう補強
----------------------------------------- */
async function chooseCounterForSide(side, prevLink){
  const available = getAvailableCounters(side, prevLink);

  if(available.length === 0){
    return "PASS";
  }

  const items = [];
  if(available.includes("HANDGATA")){
    items.push({label:"手形で無効", value:"HANDGATA"});
  }
  if(available.includes("MEMORY")){
    items.push({label:"記憶抹消で無効", value:"MEMORY"});
  }
  items.push({label:"しない", value:"PASS"});

  if(side === "P1"){
    const v = await askChoice(
      "チェーン確認",
      `${sideName(prevLink.activatorSide)}が「${prevLink.label}」を発動しました。\n反応しますか？`,
      items
    );
    return v || "PASS";
  }

  if(available.includes("MEMORY")) return "MEMORY";
  if(available.includes("HANDGATA")) return "HANDGATA";
  return "PASS";
}
/* =========================================================
  PATCH 04
  No.25 / No.29 / No.30 追加
  - 25 小次郎＆小太郎
  - 29 狼猫 - 孫悟空Lv75 -
  - 30 七星剣
========================================================= */

/* ---------------- カード定義追加 ---------------- */
(function addNewCards_v50022_patch04(){
  const addIfMissing = (def)=>{
    if(!CardRegistry.find(c=>c.no===def.no)){
      CardRegistry.push(def);
    }
    if(!CARD_NOS.includes(def.no)){
      CARD_NOS.push(def.no);
      CARD_NOS.sort((a,b)=>a-b);
    }
  };

  addIfMissing({
    no:25,
    name:"小次郎＆小太郎",
    type:"character",
    tags:["アバター","GAME","兄弟"],
    titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "登場できない。\n" +
      "手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。\n" +
      "このカードが相手の効果、またはバトルでウイングに送られた時、\n" +
      "手札・デッキ・ウイングからrank4以下の「小太郎」「小次郎」キャラクターを2体まで見参させる。"
    ),
    rank:5,
    atk:2500,
    summon:"kensan"
  });

  addIfMissing({
    no:29,
    name:"狼猫 - 孫悟空Lv75 -",
    type:"character",
    tags:["アバター","GAME","剣士"],
    titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "登場できない。\n" +
      "手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。\n" +
      "1ターンに1度、デッキ・ウイングからタイトルタグ「BUGBUG西遊記」アイテムカード1枚を手札に加える。"
    ),
    rank:5,
    atk:2400,
    summon:"kensan"
  });

  addIfMissing({
    no:30,
    name:"七星剣",
    type:"item",
    tags:["課金アイテム","刀剣"],
    titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "自分ターンに発動できる。\n" +
      "自分ステージのキャラクター1体に装備する。ATK+500。\n" +
      "タグ「剣士」を持つキャラクターが装備した場合、さらにATK+500し、自分ターンに相手ステージの全てのキャラクターに1度ずつ攻撃できる。"
    ),
    rank:4,
    atk:0
  });

  ensureInitialCollectionAndDeck();
  log("PATCH04：No.25 / 29 / 30 を登録");
})();

/* ---------------- 補助 ---------------- */
function isKotaroKojiroName(card){
  if(!card || !isCharacter(card)) return false;
  return card.name.includes("小太郎") || card.name.includes("小次郎");
}
function getEmptyCPositions(side){
  const out = [];
  for(let i=0;i<3;i++) if(!state[side].C[i]) out.push(i);
  return out;
}
function getKotaroKojiroPool(side){
  const p = state[side];
  return [
    ...p.hand.map(c=>({src:"hand", c})),
    ...p.deck.map(c=>({src:"deck", c})),
    ...p.wing.map(c=>({src:"wing", c}))
  ].filter(x=>x.c && isCharacter(x.c) && (x.c.rank||0) <= 4 && isKotaroKojiroName(x.c));
}
function removeCardFromAnySource(side, src, uid){
  const p = state[side];
  if(src==="hand") return removeFromZone(p.hand, uid);
  if(src==="deck") return removeFromZone(p.deck, uid);
  if(src==="wing") return removeFromZone(p.wing, uid);
  return null;
}
async function specialSummonKotaroKojiroFrom25(side){
  const p = state[side];
  let empties = getEmptyCPositions(side);
  if(!empties.length){
    log("小次郎＆小太郎：空きCがないため不発", "warn");
    return;
  }

  let maxCount = Math.min(2, empties.length);
  for(let n=0; n<maxCount; n++){
    const pool = getKotaroKojiroPool(side);
    if(!pool.length) break;

    let picked = null;

    if(side==="AI"){
      const preferNos = [9,10];
      picked =
        pool.find(x=>preferNos.includes(x.c.no) && x.src==="deck") ||
        pool.find(x=>preferNos.includes(x.c.no)) ||
        pool.find(x=>x.src==="deck") ||
        pool[0];
    }else{
      const v = await askChoice(
        "小次郎＆小太郎",
        `見参させる「小太郎」「小次郎」を選択してください（${n+1}/${maxCount}）`,
        pool.map(x=>({
          label: x.c.name,
          sub: `${x.src.toUpperCase()} / RANK ${x.c.rank} / ATK ${x.c.baseAtk}`,
          value: `${x.src}:${x.c.uid}`,
          card: x.c
        })).concat([{label:"終了", value:"STOP"}])
      );
      if(v==="STOP" || !v) break;
      const [src, uid] = String(v).split(":");
      picked = pool.find(x=>x.src===src && x.c.uid===uid) || null;
    }

    if(!picked) break;

    const moved = removeCardFromAnySource(side, picked.src, picked.c.uid);
    if(!moved) continue;

    empties = getEmptyCPositions(side);
    if(!empties.length){
      if(picked.src!=="wing") moveToWing(side, moved);
      break;
    }

    const pos = empties[0];
    p.C[pos] = moved;
    log(`${sideName(side)}：${moved.name} を見参`);
    renderAll();
    await onEnterTriggers(side, {zone:"C", pos, card:moved});
  }
}
function hasSevenStarSwordBonus(side, card){
  if(!card || !isCharacter(card) || !card.equipUid) return false;
  const eq = findEquipInE(side, card.equipUid);
  if(!eq || eq.no!==30) return false;
  return card.tags.includes("剣士");
}
function getRemainingSevenStarTargets(side, card){
  if(!hasSevenStarSwordBonus(side, card)) return [];
  const enemy = opponent(side);
  const hit = Array.isArray(card.flags?.sevenStarHitUidsThisTurn) ? card.flags.sevenStarHitUidsThisTurn : [];
  return state[enemy].C.filter(c=>c && !hit.includes(c.uid));
}
function markSevenStarHit(card, targetUid){
  if(!card) return;
  if(!card.flags) card.flags = {};
  if(!Array.isArray(card.flags.sevenStarHitUidsThisTurn)){
    card.flags.sevenStarHitUidsThisTurn = [];
  }
  if(targetUid && !card.flags.sevenStarHitUidsThisTurn.includes(targetUid)){
    card.flags.sevenStarHitUidsThisTurn.push(targetUid);
  }
}

/* ---------------- makeInstance 補強 ---------------- */
const __mw_makeInstance_patch04 = makeInstance;
makeInstance = function(cardDef){
  const c = __mw_makeInstance_patch04(cardDef);
  if(!c.flags) c.flags = {};
  if(!Array.isArray(c.flags.sevenStarHitUidsThisTurn)){
    c.flags.sevenStarHitUidsThisTurn = [];
  }
  return c;
};

/* ---------------- ターン初期化 補強 ---------------- */
const __mw_resetPerTurn_patch04 = resetPerTurn;
resetPerTurn = function(side){
  __mw_resetPerTurn_patch04(side);
  const p = state[side];
  for(const c of p.C){
    if(!c) continue;
    if(!c.flags) c.flags = {};
    c.flags.sevenStarHitUidsThisTurn = [];
  }
};

const __mw_clearEndTurnTemps_patch04 = clearEndTurnTemps;
clearEndTurnTemps = function(side){
  __mw_clearEndTurnTemps_patch04(side);
  const p = state[side];
  for(const c of p.C){
    if(!c) continue;
    if(!c.flags) c.flags = {};
    c.flags.sevenStarHitUidsThisTurn = [];
  }
};

/* ---------------- BUGBUG西遊記アイテムサーチ ---------------- */
async function searchDeckOrWingByTitleTagItem(side, titleTag, n, opt={}){
  const p = state[side];
  const poolBase = ()=>[
    ...p.deck.map(c=>({src:"deck", c})),
    ...p.wing.map(c=>({src:"wing", c}))
  ].filter(x=>x.c && x.c.type==="item" && x.c.titleTag===titleTag);

  let pool = poolBase();
  if(!pool.length){
    log(`サーチ失敗：タイトルタグ「${titleTag}」アイテムが見つかりません`, "warn");
    return;
  }

  for(let k=0;k<n;k++){
    pool = poolBase();
    if(!pool.length) break;

    let picked = null;
    if(opt.aiAuto){
      picked = pool.find(x=>x.src==="deck") || pool[0];
    }else{
      const v = await askChoice(
        "サーチ",
        `タイトルタグ「${titleTag}」アイテムを手札に加える（${k+1}/${n}）`,
        pool.map(x=>({
          label: x.c.name,
          sub: `${x.src.toUpperCase()} / ITEM / ${titleTag}`,
          value: `${x.src}:${x.c.uid}`,
          card: x.c
        }))
      );
      if(!v) return;
      const [src, uid] = String(v).split(":");
      picked = pool.find(x=>x.src===src && x.c.uid===uid) || null;
    }

    if(!picked) continue;

    if(picked.src==="deck"){
      const moved = removeFromZone(p.deck, picked.c.uid);
      if(moved) p.hand.push(moved);
    }else{
      const moved = removeFromZone(p.wing, picked.c.uid);
      if(moved) p.hand.push(moved);
    }
    log(`${sideName(side)}：BUGBUG西遊記アイテムをサーチ`);
  }
}

/* ---------------- getMaxAttacks 拡張 ---------------- */
const __mw_getMaxAttacks_patch04 = getMaxAttacks;
getMaxAttacks = function(side, card){
  let max = __mw_getMaxAttacks_patch04(side, card);
  if(!card || !isCharacter(card)) return max;

  if(hasSevenStarSwordBonus(side, card)){
    const enemy = opponent(side);
    const enemyCount = state[enemy].C.filter(Boolean).length;
    if(enemyCount > 0){
      max = Math.max(max, enemyCount);
    }
  }
  return max;
};

/* ---------------- アイテム装備 拡張 ---------------- */
const __mw_equipItemFromE_patch04 = equipItemFromE;
equipItemFromE = async function(side, ePos, itemCard){
  const isTarget = itemCard && itemCard.no===30;
  await __mw_equipItemFromE_patch04(side, ePos, itemCard);

  if(isTarget){
    const p = state[side];
    const hosts = p.C.filter(c=>c && c.equipUid===itemCard.uid);
    const host = hosts[0] || null;
    if(host){
      itemCard._equipBonus = 500;
      itemCard._equipBonus2 = host.tags.includes("剣士") ? 500 : 0;
      itemCard._extraAttacks = 0;
      itemCard._allEnemyOnce = host.tags.includes("剣士");
      log(`装備補正：七星剣 → ${host.name}${host.tags.includes("剣士") ? "（全体連撃有効）" : ""}`);
      renderAll();
    }
  }
};

/* ---------------- アイテム価値評価 拡張 ---------------- */
const __mw_itemBonusForHost_patch04 = itemBonusForHost;
itemBonusForHost = function(item, host){
  let b = __mw_itemBonusForHost_patch04(item, host);
  if(item && item.no===30){
    b = 500 + (host.tags.includes("剣士") ? 900 : 0);
  }
  return b;
};

/* ---------------- ビューア任意発動 拡張 ---------------- */
const __mw_canActivateFromViewer_patch04 = canActivateFromViewer;
canActivateFromViewer = function(card, ctx){
  const res = __mw_canActivateFromViewer_patch04(card, ctx);
  if(res.ok) return res;

  const side = ctx?.side;
  const zone = ctx?.zone;
  if(!card || side!=="P1" || zone!=="C") return res;
  if(state.gameOver) return {ok:false, reason:"ゲームが終了しています"};
  if(state.activeSide!=="P1") return {ok:false, reason:"あなたのターンではありません"};
  if(state.phase!=="MAIN") return {ok:false, reason:"メインフェイズではありません"};
  if(isRachelSealActiveAgainst(side, card)) return {ok:false, reason:"退魔師レイチェルの効果により発動できません"};

  if(card.no===29) return {ok:true, reason:""};
  return res;
};

/* ---------------- 場の効果発動 拡張 ---------------- */
const __mw_activateFieldCardAbility_patch04 = activateFieldCardAbility;
activateFieldCardAbility = async function(side, zone, pos, card){
  if(card && card.no===29 && side==="P1"){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{
        if(state.activeSide!=="P1" || state.phase!=="MAIN"){
          log("このタイミングでは発動できません", "warn");
          return;
        }
        if(card.used.perTurn){
          log("狼猫 - 孫悟空Lv75 -：このターンは既に使用しています", "warn");
          return;
        }
        card.used.perTurn = true;
        await searchDeckOrWingByTitleTagItem(side, "BUGBUG西遊記", 1);
        renderAll();
      },
      onNegated: async (r)=>{
        if(r.negatorKind==="MEMORY"){
          await sendCharacterToWing(side, card.uid);
        }
        log(`${card.name} の効果は無効`);
        renderAll();
      }
    };
    await processActivatedEffect(act);
    return;
  }

  await __mw_activateFieldCardAbility_patch04(side, zone, pos, card);
};

/* ---------------- AIの29使用 ---------------- */
const __mw_aiTakeTurn_patch04 = aiTakeTurn;
async function aiTryActivateRoumao29(){
  const pos = state.AI.C.findIndex(c=>c && c.no===29);
  if(pos < 0) return false;
  if(state.phase!=="MAIN") return false;

  const card = state.AI.C[pos];
  if(card.used.perTurn) return false;

  const hasItem = [
    ...state.AI.deck,
    ...state.AI.wing
  ].some(c=>c && c.type==="item" && c.titleTag==="BUGBUG西遊記");
  if(!hasItem) return false;

  const act = {
    kind:"ACT",
    label:card.name,
    activatorSide:"AI",
    resolve: async ()=>{
      card.used.perTurn = true;
      await searchDeckOrWingByTitleTagItem("AI", "BUGBUG西遊記", 1, {aiAuto:true});
      renderAll();
    },
    onNegated: async (r)=>{
      if(r.negatorKind==="MEMORY"){
        await sendCharacterToWing("AI", card.uid);
      }
      log(`${card.name} の効果は無効`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
  return true;
}

aiTakeTurn = async function(){
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
  didSomething = (await aiTryActivateSeshiaArisa()) || didSomething;
  await sleep(90);
  didSomething = (await aiTryActivateRoumao29()) || didSomething;
  await sleep(90);

  if(state.AI.hand.length >= 6){
    didSomething = (await aiTryPlayBestCharacter()) || didSomething;
    await sleep(80);
    didSomething = (await aiTryActivateSeshiaArisa()) || didSomething;
    await sleep(80);
    didSomething = (await aiTryActivateRoumao29()) || didSomething;
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

  if(!canBattleThisTurn("AI")){
    log(`AI：${battleBanReason("AI")}（BATTLEスキップ）`);
  }else{
    await aiBattleBest();
  }

  state.phase = "END";
  enforceHandLimit("AI");
  clearEndTurnTemps("AI");
  renderAll();
  await sleep(120);

  log("AI：ターン終了");
};

/* ---------------- 25 の離脱時効果 ---------------- */
const __mw_sendCharacterToWing_patch04 = sendCharacterToWing;
sendCharacterToWing = async function(side, uid){
  const p = state[side];
  const pos = p.C.findIndex(c=>c && c.uid===uid);
  if(pos<0) return;

  const card = p.C[pos];
  const enemy = opponent(side);

  await stripEquipIfAny(side, card);
  p.C[pos] = null;
  moveToWing(side, card);
  renderAll();

  if(card.no===25){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{
        await specialSummonKotaroKojiroFrom25(side);
      },
      onNegated: async ()=>{
        log(`${card.name} の離脱時効果は無効`);
      }
    };

    /* 相手の効果・バトルで送られた時を想定。
       既存構造では sendCharacterToWing 経由でこの条件をまとめて扱う */
    log(`${card.name}：離脱時効果を確認`);
    await processActivatedEffect(act);
  }
};

/* ---------------- プレイヤー攻撃対象選択 拡張（七星剣） ---------------- */
const __mw_chooseAttackTarget_patch04 = chooseAttackTarget;
chooseAttackTarget = async function(){
  if(state.phase!=="BATTLE") return;
  if(!canBattleThisTurn("P1")){
    log(battleBanReason("P1"), "warn");
    state.battle.attackerUid=null;
    state.battle.attackerPos=null;
    renderAll();
    return;
  }

  const attacker = state.P1.C[state.battle.attackerPos];
  if(!attacker || attacker.uid!==state.battle.attackerUid) return;

  const enemySide = "AI";
  const sevenTargets = getRemainingSevenStarTargets("P1", attacker);

  if(sevenTargets.length){
    const pick = await askChoice(
      "攻撃対象",
      "七星剣：まだ攻撃していない相手キャラクターを選択してください。",
      sevenTargets.map(c=>({
        label:`${c.name}`,
        sub:`ATK ${calcCurrentAtk(enemySide, c)}`,
        value:`C:${c.uid}`,
        card:c
      }))
    );
    const [, uid] = String(pick).split(":");
    await resolveBattle(attacker, uid);
    return;
  }

  await __mw_chooseAttackTarget_patch04();
};

/* ---------------- バトル解決 拡張（七星剣） ---------------- */
const __mw_resolveBattle_patch04 = resolveBattle;
resolveBattle = async function(attacker, defenderUid){
  if(attacker && defenderUid){
    markSevenStarHit(attacker, defenderUid);
  }
  await __mw_resolveBattle_patch04(attacker, defenderUid);
};

/* ---------------- AI攻撃評価 拡張（七星剣） ---------------- */
const __mw_pickBestAIAttackFor_patch04 = pickBestAIAttackFor;
pickBestAIAttackFor = function(attacker){
  const base = __mw_pickBestAIAttackFor_patch04(attacker);
  if(!hasSevenStarSwordBonus("AI", attacker)) return base;

  const available = getRemainingSevenStarTargets("AI", attacker);
  if(!available.length) return base;

  let best = null;
  const atkA = calcCurrentAtk("AI", attacker);

  for(const t of available){
    const atkD = calcCurrentAtk("P1", t);
    let score = 0;

    if(atkA > atkD){
      score += estimateRemoveValue(t) + 500;
      if(t.no===8) score += 240;
    }else if(atkA === atkD){
      score += estimateRemoveValue(t) * 0.25;
      score -= estimateRemoveValue(attacker) * 0.45;
    }else{
      score -= estimateRemoveValue(attacker) * 0.9;
      score -= 160;
    }

    if(!best || score > best.score){
      best = {type:"C", uid:t.uid, score};
    }
  }

  return best || base;
};

const __mw_aiBattleBest_patch04 = aiBattleBest;
aiBattleBest = async function(){
  const p = state.AI;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;
    if(a.flags.attackedCountThisTurn >= getMaxAttacks("AI", a)) continue;

    while(a && a.flags.attackedCountThisTurn < getMaxAttacks("AI", a)){
      const best = pickBestAIAttackFor(a);
      if(!best) break;

      if(best.type==="C"){
        const t = state.P1.C.find(c=>c && c.uid===best.uid);
        if(!t) break;

        markSevenStarHit(a, t.uid);

        const atkA = calcCurrentAtk("AI", a);
        const atkD = calcCurrentAtk("P1", t);
        log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

        if(atkA > atkD){
          await sendCharacterToWing("P1", t.uid);
          log(`AI：撃破 ${t.name} → あなたウイング`);
          await tryCattleTrigger_P1();
          if(a.no===23) await breakOneShieldByEffect("P1", a.name);
        }else if(atkA < atkD){
          const saved = await tryBattleSurvive("AI", a);
          if(!saved){
            await sendCharacterToWing("AI", a.uid);
            log(`AI：敗北 ${a.name} → AIウイング`);
          }
        }else{
          const savedA = await tryBattleSurvive("AI", a);
          const savedD = await tryBattleSurvive("P1", t);
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

        if(!state.AI.C[i] || state.AI.C[i].uid!==a.uid) break;
        continue;
      }

      if(best.type==="S"){
        const sh = state.P1.shield[best.idx];
        if(!sh) break;
        state.P1.shield[best.idx]=null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊（あなた）${best.idx+1} → あなた手札へ`);
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        await sleep(150);
        break;
      }

      if(best.type==="D"){
        const guarded = await tryMiikoDirectGuard("P1");
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        if(guarded) break;
        await finishGame("AI");
        return;
      }

      break;
    }
  }
};

/* ---------------- 画像反映補助 ---------------- */
(async function patch04_refreshImageCache(){
  try{
    ensureInitialCollectionAndDeck();
    const cache = getCache();
    if(cache && cache.cardFiles){
      const addMap = buildCardMapFromFileList(cache.cardFiles);
      for(const k of Object.keys(addMap||{})){
        state.img.cardUrlByNo[k] = vercelPathCards(addMap[k]);
      }
      renderAll();
    }
    log("PATCH04：画像反映補助完了（必要なら画像再スキャンを実行してください）");
  }catch(err){
    log(`PATCH04：画像反映補助失敗 ${String(err.message||err)}`, "warn");
  }
})();
/* =========================================================
  PATCH 05_06_07_08 FIX
  - 桜蘭の陰陽術（バトル時発動）
  - レイチェルのシールド破壊を装備時のみに修正
  - タータのBUGBUG西遊記サーチを選択式に修正
  - 見参で場のキャラクターを先にコストにして入れ替え可能化
========================================================= */

/* ---------------- 桜蘭の陰陽術 ---------------- */
function hasOuranInHand(side){
  return state[side].hand.some(c=>c && c.no===15);
}
function takeOuranFromHand(side){
  const idx = state[side].hand.findIndex(c=>c && c.no===15);
  if(idx < 0) return null;
  return state[side].hand.splice(idx,1)[0];
}
async function pickOwnCharacterForOuran(side){
  const chars = state[side].C.filter(Boolean);
  if(!chars.length) return null;

  if(side==="AI"){
    return chars.slice().sort((a,b)=>calcCurrentAtk(side,b)-calcCurrentAtk(side,a))[0] || null;
  }

  const v = await askChoice(
    "桜蘭の陰陽術 - 闘 -",
    "ATK+1000する自分キャラクターを選んでください。",
    chars.map(c=>({
      label: c.name,
      sub: `ATK ${calcCurrentAtk(side, c)}`,
      value: c.uid,
      card: c
    }))
  );
  if(!v) return null;
  return state[side].C.find(c=>c && c.uid===String(v)) || null;
}
async function tryUseOuranDuringBattle(side, ownBattler, enemyBattler){
  if(!hasOuranInHand(side)) return false;
  if(!ownBattler) return false;

  if(side==="P1"){
    const ok = await askYesNo(
      "桜蘭の陰陽術 - 闘 -",
      "バトル中です。桜蘭の陰陽術 - 闘 - を発動しますか？"
    );
    if(!ok) return false;

    const target = await pickOwnCharacterForOuran(side);
    if(!target) return false;

    const card = takeOuranFromHand(side);
    if(!card) return false;

    moveToWing(side, card);
    target.tempAtk += 1000;
    log(`桜蘭の陰陽術 - 闘 -：${target.name} ATK+1000（ターン終了まで）`);
    renderAll();
    return true;
  }

  if(side==="AI"){
    const myAtk = calcCurrentAtk(side, ownBattler);
    const enAtk = enemyBattler ? calcCurrentAtk(opponent(side), enemyBattler) : 0;
    if(!(myAtk <= enAtk && myAtk + 1000 > enAtk)) return false;

    const card = takeOuranFromHand(side);
    if(!card) return false;

    moveToWing(side, card);
    ownBattler.tempAtk += 1000;
    log(`AI：桜蘭の陰陽術 - 闘 - → ${ownBattler.name} ATK+1000`);
    renderAll();
    return true;
  }

  return false;
}

/* ---------------- タータ：選択式サーチ ---------------- */
async function searchDeckByTitleTagSelectable(side, titleTag, n, opt={}){
  const p = state[side];

  for(let k=0;k<n;k++){
    const pool = p.deck.filter(c=>c && c.titleTag===titleTag);
    if(!pool.length){
      if(k===0) log(`サーチ失敗：タイトルタグ「${titleTag}」がデッキにありません`, "warn");
      break;
    }

    if(opt.aiAuto){
      const picked = pool[0];
      const moved = removeFromZone(p.deck, picked.uid);
      if(moved) p.hand.push(moved);
      log(`AI：サーチ（${titleTag}）`);
      continue;
    }

    const pick = await askChoice(
      "タータ",
      `デッキからタイトルタグ「${titleTag}」のカードを選択してください（${k+1}/${n}）`,
      pool.map(c=>({
        label: c.name,
        sub: `DECK / ${c.type.toUpperCase()} / ${c.titleTag}`,
        value: c.uid,
        card: c
      })).concat([{label:"終了", value:"STOP"}])
    );

    if(!pick || pick==="STOP") break;

    const moved = removeFromZone(p.deck, String(pick));
    if(moved) p.hand.push(moved);
  }

  renderAll();
}

activateTataExchange = async function(side, card){
  if(state.limits[side].tataUsed){
    log("タータ：このターンは既に使用しています", "warn");
    return;
  }

  const p = state[side];
  const max = Math.min(2, p.hand.length);
  if(max===0){
    log("タータ：手札がありません", "warn");
    return;
  }

  const sent = [];

  if(side==="AI"){
    state.limits[side].tataUsed = true;

    const n = Math.min(2, p.hand.length);
    for(let k=0;k<n;k++){
      const idx = chooseAIDiscardIndex(side);
      if(idx < 0) break;
      const moved = p.hand.splice(idx,1)[0];
      moveToWing(side, moved);
      sent.push(moved);
    }

    if(sent.length > 0){
      await searchDeckByTitleTagSelectable(side, "BUGBUG西遊記", sent.length, {aiAuto:true});
      log(`AI：タータ ${sent.length}枚交換`);
    }else{
      log("AI：タータ 不発");
      state.limits[side].tataUsed = false;
    }
    renderAll();
    return;
  }

  const ok = await askYesNo(
    "タータ",
    "手札を1〜2枚ウイングに送り、同じ枚数だけデッキからタイトルタグ「BUGBUG西遊記」のカードを選んで手札に加えますか？"
  );
  if(!ok){
    return;
  }

  state.limits[side].tataUsed = true;

  for(let k=0;k<max;k++){
    const items = p.hand.map((c, i)=>({
      label:`手札：${c.name}`,
      sub:`No.${pad2(c.no)} / ${c.type.toUpperCase()}`,
      value:String(i),
      card:c
    })).concat([{label:"終了", value:"STOP"}]);

    const v = await askChoice(
      "タータ（コスト）",
      `ウイングへ送るカードを選択してください（${k+1}/${max}）`,
      items
    );

    if(!v || v==="STOP") break;

    const idx = Number(v);
    if(Number.isNaN(idx) || !p.hand[idx]) break;

    const moved = p.hand.splice(idx,1)[0];
    moveToWing(side, moved);
    sent.push(moved);
    renderAll();
  }

  if(sent.length <= 0){
    log("タータ：送ったカードがないため終了");
    state.limits[side].tataUsed = false;
    renderAll();
    return;
  }

  await searchDeckByTitleTagSelectable(side, "BUGBUG西遊記", sent.length);
  log(`タータ：${sent.length}枚交換（選択サーチ）`);
  renderAll();
};

/* ---------------- 見参：場のキャラを先にコストへ送って入れ替え ---------------- */
async function doKensanSummonUsingOccupiedC(side, cPos, handIdx){
  const p = state[side];
  const card = p.hand[handIdx];
  if(!card || card.summon!=="kensan") return false;

  const current = p.C[cPos];
  if(!current) return false;

  if(side==="P1"){
    const ok = await askYesNo(
      "見参",
      `C${cPos+1}の「${current.name}」をコストにして、同じ場所へ「${card.name}」を見参しますか？`
    );
    if(!ok) return false;
  }

  await stripEquipIfAny(side, current);
  p.C[cPos] = null;
  moveToWing(side, current);
  log(`見参コスト：${current.name} → ${sideName(side)}ウイング`);

  const placed = p.hand.splice(handIdx,1)[0];
  p.C[cPos] = placed;
  state.selectedHandIndex = null;
  state.announce.lastSelUid = null;

  log(`見参：${placed.name}`);
  renderAll();
  await onEnterTriggers(side, {zone:"C", pos:cPos, card:placed});
  return true;
}

const __mw_onClickYourC_fix = onClickYourC;
onClickYourC = async function(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;

  if(state.phase==="BATTLE"){
    if(!canBattleThisTurn("P1")){
      log(battleBanReason("P1"), "warn");
      return;
    }
    const c = state.P1.C[pos];
    if(!c) return;
    await selectAttacker("P1", pos, c);
    return;
  }

  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card || !isCharacter(card)) return;

  if(card.summon==="kensan" && state.P1.C[pos]){
    await doKensanSummonUsingOccupiedC("P1", pos, state.selectedHandIndex);
    return;
  }

  return await __mw_onClickYourC_fix(pos);
};

/* ---------------- プレイヤー側バトル解決（桜蘭 + レイチェル条件） ---------------- */
resolveBattle = async function(attacker, defenderUid){
  const enemySide = "AI";
  const defender = state[enemySide].C.find(c=>c && c.uid===defenderUid);
  if(!defender){
    log("対象が無効です", "warn");
    return;
  }

  if(typeof markSevenStarHit === "function" && attacker && defenderUid){
    markSevenStarHit(attacker, defenderUid);
  }

  await tryUseOuranDuringBattle("P1", attacker, defender);
  await tryUseOuranDuringBattle("AI", defender, attacker);

  const atkA = calcCurrentAtk("P1", attacker);
  const atkD = calcCurrentAtk("AI", defender);
  log(`バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  if(atkA > atkD){
    await sendCharacterToWing("AI", defender.uid);
    log(`撃破：${defender.name} → AIウイング`);
    if(attacker.no===23 && attacker.equipUid){
      await breakOneShieldByEffect("AI", attacker.name);
    }
  }else if(atkA < atkD){
    const saved = await tryBattleSurvive("P1", attacker);
    if(!saved){
      await sendCharacterToWing("P1", attacker.uid);
      log(`敗北：${attacker.name} → あなたウイング`);
      await tryCattleTrigger_P1();
    }
  }else{
    const savedA = await tryBattleSurvive("P1", attacker);
    const savedD = await tryBattleSurvive("AI", defender);
    if(!savedA){
      await sendCharacterToWing("P1", attacker.uid);
      await tryCattleTrigger_P1();
    }
    if(!savedD) await sendCharacterToWing("AI", defender.uid);
    log("相打ち：双方ウイング");
  }

  attacker.flags.attackedCountThisTurn += 1;
  state.battle.attackerUid = null;
  state.battle.attackerPos = null;
  renderAll();
};

/* ---------------- AI側バトル解決（桜蘭 + レイチェル条件を維持） ---------------- */
aiBattleBest = async function(){
  const p = state.AI;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;
    if(a.flags.attackedCountThisTurn >= getMaxAttacks("AI", a)) continue;

    while(a && a.flags.attackedCountThisTurn < getMaxAttacks("AI", a)){
      const best = pickBestAIAttackFor(a);
      if(!best) break;

      if(best.type==="C"){
        const t = state.P1.C.find(c=>c && c.uid===best.uid);
        if(!t) break;

        if(typeof markSevenStarHit === "function"){
          markSevenStarHit(a, t.uid);
        }

        await tryUseOuranDuringBattle("AI", a, t);
        await tryUseOuranDuringBattle("P1", t, a);

        const atkA = calcCurrentAtk("AI", a);
        const atkD = calcCurrentAtk("P1", t);
        log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

        if(atkA > atkD){
          await sendCharacterToWing("P1", t.uid);
          log(`AI：撃破 ${t.name} → あなたウイング`);
          await tryCattleTrigger_P1();
          if(a.no===23 && a.equipUid){
            await breakOneShieldByEffect("P1", a.name);
          }
        }else if(atkA < atkD){
          const saved = await tryBattleSurvive("AI", a);
          if(!saved){
            await sendCharacterToWing("AI", a.uid);
            log(`AI：敗北 ${a.name} → AIウイング`);
          }
        }else{
          const savedA = await tryBattleSurvive("AI", a);
          const savedD = await tryBattleSurvive("P1", t);
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

        if(!state.AI.C[i] || state.AI.C[i].uid!==a.uid) break;
        continue;
      }

      if(best.type==="S"){
        const sh = state.P1.shield[best.idx];
        if(!sh) break;
        state.P1.shield[best.idx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊（あなた）${best.idx+1} → あなた手札へ`);
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        await sleep(150);
        break;
      }

      if(best.type==="D"){
        const guarded = await tryMiikoDirectGuard("P1");
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        if(guarded) break;
        await finishGame("AI");
        return;
      }

      break;
    }
  }
};

log("PATCH 05_06_07_08 FIX 読み込み完了");

/* =========================================================
  PATCH 11
  - 見参コストと見参先を分離
  - 場に空きがあっても場キャラをコストに選択可能
  - 見参先を自由に選べるように修正
========================================================= */

function getOpenCPositions(side){
  const out = [];
  for(let i=0;i<3;i++){
    if(!state[side].C[i]) out.push(i);
  }
  return out;
}

async function chooseKensanDestination(side, availablePositions, summonCard){
  if(!availablePositions.length) return null;

  if(side==="AI"){
    return availablePositions[0];
  }

  if(availablePositions.length===1){
    return availablePositions[0];
  }

  const pick = await askChoice(
    "見参先を選択",
    `「${summonCard.name}」を出す場所を選んでください。`,
    availablePositions.map(pos=>({
      label:`C${pos+1}`,
      sub:`見参先`,
      value:String(pos)
    }))
  );

  if(pick==null) return null;
  return Number(pick);
}

async function doKensanSummonFlexible(side, summonPos, handIdx){
  const p = state[side];
  const card = p.hand[handIdx];
  if(!card || card.summon!=="kensan") return false;

  const cands = [];

  /* 手札コスト */
  for(let i=0;i<p.hand.length;i++){
    if(i===handIdx) continue;
    if(isCharacter(p.hand[i])){
      cands.push({
        from:"hand",
        idx:i,
        card:p.hand[i],
        label:`手札：${p.hand[i].name}`
      });
    }
  }

  /* 場コスト */
  for(let i=0;i<3;i++){
    if(p.C[i]){
      cands.push({
        from:"C",
        idx:i,
        card:p.C[i],
        label:`C${i+1}：${p.C[i].name}`
      });
    }
  }

  if(!cands.length){
    log("見参：コスト候補なし", "warn");
    return false;
  }

  let chosen = null;

  if(side==="AI"){
    /* AIは基本的に最も価値の低いキャラをコストにする */
    const sorted = cands.slice().sort((a,b)=>{
      const av = aiCardValue ? aiCardValue(side, a.card) : estimateRemoveValue(a.card);
      const bv = aiCardValue ? aiCardValue(side, b.card) : estimateRemoveValue(b.card);
      return av - bv;
    });
    chosen = sorted[0] || null;
  }else{
    const pick = await askChoice(
      "見参（コスト）",
      "ウイングへ送るキャラクターを選んでください。",
      cands.map(x=>({
        label:x.label,
        value:`${x.from}:${x.idx}`,
        card:x.card
      }))
    );
    if(!pick) return false;

    const [from, idxStr] = String(pick).split(":");
    const idx = Number(idxStr);
    chosen = cands.find(x=>x.from===from && x.idx===idx) || null;
  }

  if(!chosen) return false;

  let freedPos = null;

  /* 先にコスト処理 */
  if(chosen.from==="hand"){
    const moved = p.hand.splice(chosen.idx,1)[0];
    moveToWing(side, moved);
    log(`見参コスト：${moved.name} → ${sideName(side)}ウイング`);
    if(chosen.idx < handIdx) handIdx -= 1;
  }else if(chosen.from==="C"){
    const moved = p.C[chosen.idx];
    await stripEquipIfAny(side, moved);
    p.C[chosen.idx] = null;
    moveToWing(side, moved);
    freedPos = chosen.idx;
    log(`見参コスト：${moved.name} → ${sideName(side)}ウイング`);
  }

  /* 見参先候補を確定 */
  const availablePositions = getOpenCPositions(side);

  /* summonPos が空いていれば優先候補として先頭に */
  let finalCandidates = availablePositions.slice();
  if(Number.isInteger(summonPos) && finalCandidates.includes(summonPos)){
    finalCandidates = [summonPos].concat(finalCandidates.filter(x=>x!==summonPos));
  }

  /* 場コストで空いた場所も当然候補に含まれる */
  const dest = await chooseKensanDestination(side, finalCandidates, card);
  if(dest==null || !finalCandidates.includes(dest)){
    log("見参：見参先が無効です", "warn");
    return false;
  }

  const placed = p.hand.splice(handIdx,1)[0];
  if(!placed) return false;

  p.C[dest] = placed;
  state.selectedHandIndex = null;
  state.announce.lastSelUid = null;

  log(`見参：${placed.name} → C${dest+1}`);
  renderAll();
  await onEnterTriggers(side, {zone:"C", pos:dest, card:placed});
  return true;
}

/* 場キャラを直接タップした時の専用処理 */
async function doKensanSummonByTappingOccupiedC(side, occupiedPos, handIdx){
  const p = state[side];
  const summonCard = p.hand[handIdx];
  const costCard = p.C[occupiedPos];

  if(!summonCard || summonCard.summon!=="kensan" || !costCard) return false;

  if(side==="P1"){
    const ok = await askYesNo(
      "見参",
      `C${occupiedPos+1}の「${costCard.name}」を見参コストにしますか？`
    );
    if(!ok) return false;
  }

  await stripEquipIfAny(side, costCard);
  p.C[occupiedPos] = null;
  moveToWing(side, costCard);
  log(`見参コスト：${costCard.name} → ${sideName(side)}ウイング`);

  const availablePositions = getOpenCPositions(side);
  const dest = await chooseKensanDestination(side, availablePositions, summonCard);
  if(dest==null || !availablePositions.includes(dest)){
    log("見参：見参先が無効です", "warn");
    return false;
  }

  const placed = p.hand.splice(handIdx,1)[0];
  if(!placed) return false;

  p.C[dest] = placed;
  state.selectedHandIndex = null;
  state.announce.lastSelUid = null;

  log(`見参：${placed.name} → C${dest+1}`);
  renderAll();
  await onEnterTriggers(side, {zone:"C", pos:dest, card:placed});
  return true;
}

/* 既存の onClickYourC を上書き */
const __mw_onClickYourC_patch11 = onClickYourC;
onClickYourC = async function(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;

  if(state.phase==="BATTLE"){
    if(!canBattleThisTurn("P1")){
      log(battleBanReason("P1"), "warn");
      return;
    }
    const c = state.P1.C[pos];
    if(!c) return;
    await selectAttacker("P1", pos, c);
    return;
  }

  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card || !isCharacter(card)) return;

  /* 見参キャラなら、空き/埋まりに関係なくCタップで処理 */
  if(card.summon==="kensan"){
    if(state.P1.C[pos]){
      await doKensanSummonByTappingOccupiedC("P1", pos, state.selectedHandIndex);
      return;
    }else{
      await doKensanSummonFlexible("P1", pos, state.selectedHandIndex);
      return;
    }
  }

  return await __mw_onClickYourC_patch11(pos);
};

log("PATCH 11 読み込み完了");
/* =========================================================
  PATCH 12
  - 装備先キャラが離れたら装備カードも必ずウイングへ
  - AIの自爆特攻をさらに抑制
========================================================= */

/* ---------------- 装備整合チェック ---------------- */
function cleanupDanglingEquips(side){
  const p = state[side];
  let changed = false;

  for(let i=0;i<p.E.length;i++){
    const eq = p.E[i];
    if(!eq) continue;

    /* 装備カードだけを対象にする */
    if(!eq.equippedToUid) continue;

    const host = p.C.find(c=>c && c.uid===eq.equippedToUid);
    if(!host){
      p.E[i] = null;
      eq.equippedToUid = null;
      moveToWing(side, eq);
      log(`装備解除：${eq.name} → ${sideName(side)}ウイング`);
      changed = true;
      continue;
    }

    /* host側のequipUidが壊れている場合も補正 */
    if(host.equipUid !== eq.uid){
      host.equipUid = eq.uid;
      changed = true;
    }
  }

  return changed;
}

/* ---------------- キャラ離脱時は必ず装備も処理 ---------------- */
const __mw_sendCharacterToWing_patch12 = sendCharacterToWing;
sendCharacterToWing = async function(side, uid){
  const p = state[side];
  const pos = p.C.findIndex(c=>c && c.uid===uid);
  if(pos < 0) return;

  const card = p.C[pos];
  if(card && card.equipUid){
    await stripEquipIfAny(side, card);
  }

  p.C[pos] = null;
  moveToWing(side, card);

  /* 念のため盤面整合も取る */
  const changed = cleanupDanglingEquips(side);
  if(changed) renderAll();

  /* No.25 の既存処理を維持 */
  if(card && card.no===25){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{
        if(typeof specialSummonKotaroKojiroFrom25 === "function"){
          await specialSummonKotaroKojiroFrom25(side);
        }
      },
      onNegated: async ()=>{
        log(`${card.name} の離脱時効果は無効`);
      }
    };
    log(`${card.name}：離脱時効果を確認`);
    await processActivatedEffect(act);
  }
};

/* ---------------- 見参コストや直接除去でも装備を取りこぼさないよう補強 ---------------- */
const __mw_doKensanSummonUsingOccupiedC_patch12 = typeof doKensanSummonUsingOccupiedC === "function" ? doKensanSummonUsingOccupiedC : null;
if(__mw_doKensanSummonUsingOccupiedC_patch12){
  doKensanSummonUsingOccupiedC = async function(side, cPos, handIdx){
    const ok = await __mw_doKensanSummonUsingOccupiedC_patch12(side, cPos, handIdx);
    cleanupDanglingEquips(side);
    renderAll();
    return ok;
  };
}

const __mw_doKensanSummonByTappingOccupiedC_patch12 = typeof doKensanSummonByTappingOccupiedC === "function" ? doKensanSummonByTappingOccupiedC : null;
if(__mw_doKensanSummonByTappingOccupiedC_patch12){
  doKensanSummonByTappingOccupiedC = async function(side, occupiedPos, handIdx){
    const ok = await __mw_doKensanSummonByTappingOccupiedC_patch12(side, occupiedPos, handIdx);
    cleanupDanglingEquips(side);
    renderAll();
    return ok;
  };
}

const __mw_doKensanSummonFlexible_patch12 = typeof doKensanSummonFlexible === "function" ? doKensanSummonFlexible : null;
if(__mw_doKensanSummonFlexible_patch12){
  doKensanSummonFlexible = async function(side, summonPos, handIdx){
    const ok = await __mw_doKensanSummonFlexible_patch12(side, summonPos, handIdx);
    cleanupDanglingEquips(side);
    renderAll();
    return ok;
  };
}

/* ---------------- 毎描画時にも安全確認 ---------------- */
const __mw_renderAll_patch12 = renderAll;
renderAll = function(){
  cleanupDanglingEquips("P1");
  cleanupDanglingEquips("AI");
  __mw_renderAll_patch12();
};

/* ---------------- AI攻撃評価をさらに保守的に ---------------- */
pickBestAIAttackFor = function(attacker){
  const atkA = calcCurrentAtk("AI", attacker);
  const enemyChars = state.P1.C.filter(Boolean);
  let best = null;

  for(const t of enemyChars){
    const atkD = calcCurrentAtk("P1", t);
    let score = 0;

    const selfCanSave = ((attacker.no===12 || attacker.no===21) && !attacker.flags.producerSavedThisTurn);
    const foeCanSave  = ((t.no===12 || t.no===21) && !t.flags.producerSavedThisTurn);

    if(atkA > atkD){
      score += estimateRemoveValue(t) + 600;
      if(attacker.no===23 && attacker.equipUid && countShields("P1") > 0) score += 320;
      if(t.no===8) score += 260;
    }else if(atkA === atkD){
      /* 相打ちはかなり慎重に */
      score += foeCanSave ? 80 : estimateRemoveValue(t) * 0.20;
      score -= selfCanSave ? 60 : estimateRemoveValue(attacker) * 0.65;
    }else{
      /* 明確な不利はほぼ禁止 */
      score -= selfCanSave ? 260 : (estimateRemoveValue(attacker) + 800);
      if(t.no===8) score += 40;
    }

    if(attacker.no===7 && countShields("P1")===0) score -= 999999;

    if(!best || score > best.score){
      best = {type:"C", uid:t.uid, score};
    }
  }

  if(!enemyChars.length){
    const shields = state.P1.shield.map((c, idx)=>({c, idx})).filter(x=>!!x.c);
    if(shields.length){
      best = {type:"S", idx:shields[0].idx, score: 720 + countShields("P1") * 70};
    }else if(attacker.no!==7){
      best = {type:"D", score: 999999};
    }
  }

  return best;
};

/* ---------------- AIバトル：不利手なら攻撃しない ---------------- */
aiBattleBest = async function(){
  const p = state.AI;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;

    while(a && state.AI.C[i] && state.AI.C[i].uid===a.uid && a.flags.attackedCountThisTurn < getMaxAttacks("AI", a)){
      const best = pickBestAIAttackFor(a);

      /* ここを厳格化 */
      if(!best || best.score <= 120){
        break;
      }

      if(best.type==="C"){
        const t = state.P1.C.find(c=>c && c.uid===best.uid);
        if(!t) break;

        if(typeof markSevenStarHit === "function"){
          markSevenStarHit(a, t.uid);
        }

        if(typeof tryUseOuranDuringBattle === "function"){
          await tryUseOuranDuringBattle("AI", a, t);
          await tryUseOuranDuringBattle("P1", t, a);
        }

        const atkA = calcCurrentAtk("AI", a);
        const atkD = calcCurrentAtk("P1", t);
        log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

        if(atkA > atkD){
          await sendCharacterToWing("P1", t.uid);
          log(`AI：撃破 ${t.name} → あなたウイング`);
          await tryCattleTrigger_P1();
          if(a.no===23 && a.equipUid){
            await breakOneShieldByEffect("P1", a.name);
          }
        }else if(atkA < atkD){
          const saved = await tryBattleSurvive("AI", a);
          if(!saved){
            await sendCharacterToWing("AI", a.uid);
            log(`AI：敗北 ${a.name} → AIウイング`);
          }
        }else{
          const savedA = await tryBattleSurvive("AI", a);
          const savedD = await tryBattleSurvive("P1", t);
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

        if(!state.AI.C[i] || state.AI.C[i].uid!==a.uid) break;
        continue;
      }

      if(best.type==="S"){
        const sh = state.P1.shield[best.idx];
        if(!sh) break;
        state.P1.shield[best.idx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊（あなた）${best.idx+1} → あなた手札へ`);
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        await sleep(150);
        continue;
      }

      if(best.type==="D"){
        const guarded = await tryMiikoDirectGuard("P1");
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        if(guarded) break;
        await finishGame("AI");
        return;
      }

      break;
    }
  }
};

/* =========================================================
  PATCH 13+14
  - デッキ編集中の長押しでカード詳細を前面表示
  - AIが場の任意効果（特にエフィ）をメイン中に使うよう修正
========================================================= */

if(!state.deckEditPreview){
  state.deckEditPreview = {
    returning:false
  };
}

/* =========================================================
  1. デッキ編集画面の長押しプレビュー修正
========================================================= */

/* デッキ編集からの詳細表示は、いったん zoneM を閉じて viewerM を前面で開く */
const __mw_openViewer_patch13_14 = openViewer;
openViewer = function(card, ctx){
  if(ctx && ctx.zone==="DECKEDIT"){
    state.deckEditPreview.returning = true;
    hideModal("zoneM");
  }
  return __mw_openViewer_patch13_14(card, ctx);
};

/* viewer を閉じた時、デッキ編集プレビューから来ていたらデッキ編集を復帰 */
const __mw_hideModal_patch13_14 = hideModal;
hideModal = function(id){
  __mw_hideModal_patch13_14(id);

  if(id==="viewerM" && state.deckEditPreview && state.deckEditPreview.returning){
    state.deckEditPreview.returning = false;
    try{
      renderDeckEditor();
      showModal("zoneM");
    }catch(err){
      log(`PATCH13+14: デッキ編集復帰失敗 ${String(err.message||err)}`, "warn");
    }
  }
};

/* =========================================================
  2. AIの場の任意効果使用修正
========================================================= */

function aiShouldUseCruella_Field(side, card){
  if(!card || card.no!==1) return false;
  if(state.limits[side].cruellaUsed) return false;
  return (
    state[side].deck.some(c=>c && c.name.includes("黒魔法")) ||
    state[side].wing.some(c=>c && c.name.includes("黒魔法"))
  );
}

function aiShouldUseNikola_Field(side, card){
  if(!card || card.no!==3) return false;
  if(card.used.perTurn) return false;

  const enemy = opponent(side);
  const foes = state[enemy].C.filter(Boolean);
  if(!foes.length) return countShields(enemy) > 0;

  const myAtk = calcCurrentAtk(side, card);
  const boosted = myAtk + 1000;
  return foes.some(f => boosted > calcCurrentAtk(enemy, f) && myAtk <= calcCurrentAtk(enemy, f));
}

function aiShouldUseEfi_Field(side, card){
  if(!card || card.no!==6) return false;
  if(card.used.perTurn) return false;

  const enemy = opponent(side);
  const foes = state[enemy].C.filter(Boolean);
  if(!foes.length) return false;

  const myAtk = calcCurrentAtk(side, card);

  /* -1000後に倒せる相手がいるなら最優先 */
  const canWinAfterDebuff = foes.some(f => myAtk > (calcCurrentAtk(enemy, f) - 1000));
  if(canWinAfterDebuff) return true;

  /* 単純に相手最大打点を下げる価値が高い時も使う */
  const maxEnemyAtk = Math.max(...foes.map(f=>calcCurrentAtk(enemy, f)));
  return maxEnemyAtk >= myAtk;
}

function aiShouldUseTata_Field(side, card){
  if(!card || card.no!==5) return false;
  if(state.limits[side].tataUsed) return false;
  if(!state[side].deck.some(c=>c && c.titleTag==="BUGBUG西遊記")) return false;
  return state[side].hand.length >= 2;
}

async function aiTryUseFieldAbilities_Strict(){
  let acted = false;
  const side = "AI";
  const p = state[side];

  /* まずセシア＆アリサ */
  const seshiaPos = p.C.findIndex(c=>c && c.no===28);
  if(seshiaPos >= 0 && state.phase==="MAIN"){
    const hasTarget = p.hand.some(c=>c && c.type==="character" && c.rank<=5 && c.name.includes("レイチェル"));
    const hasEmpty = findEmptyIndex(p.C) >= 0;
    if(hasTarget && hasEmpty){
      const card = p.C[seshiaPos];
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:side,
        resolve: async ()=>{ await activateSeshiaArisaSummon(side, seshiaPos, card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
    }
  }

  for(let i=0;i<3;i++){
    const card = p.C[i];
    if(!card) continue;
    if(isRachelSealActiveAgainst(side, card)) continue;

    if(card.no===1 && aiShouldUseCruella_Field(side, card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:side,
        resolve: async ()=>{ await activateCruellaSearch(side, card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }

    if(card.no===3 && aiShouldUseNikola_Field(side, card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:side,
        resolve: async ()=>{ await activateNikolaBuff(side, i, card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }

    if(card.no===5 && aiShouldUseTata_Field(side, card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:side,
        resolve: async ()=>{ await activateTataExchange(side, card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }

    if(card.no===6 && aiShouldUseEfi_Field(side, card)){
      const act = {
        kind:"ACT",
        label:card.name,
        activatorSide:side,
        resolve: async ()=>{ await activateEfiDebuff(side, card); },
        onNegated: async (r)=>{
          if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
          log(`${card.name} の効果は無効`);
          renderAll();
        }
      };
      await processActivatedEffect(act);
      acted = true;
      continue;
    }

    if(card.no===29 && state.phase==="MAIN" && !card.used.perTurn){
      const hasItem = [
        ...state[side].deck,
        ...state[side].wing
      ].some(c=>c && c.type==="item" && c.titleTag==="BUGBUG西遊記");

      if(hasItem){
        const act = {
          kind:"ACT",
          label:card.name,
          activatorSide:side,
          resolve: async ()=>{
            card.used.perTurn = true;
            if(typeof searchDeckOrWingByTitleTagItem === "function"){
              await searchDeckOrWingByTitleTagItem(side, "BUGBUG西遊記", 1, {aiAuto:true});
            }
            renderAll();
          },
          onNegated: async (r)=>{
            if(r.negatorKind==="MEMORY") await sendCharacterToWing(side, card.uid);
            log(`${card.name} の効果は無効`);
            renderAll();
          }
        };
        await processActivatedEffect(act);
        acted = true;
        continue;
      }
    }
  }

  return acted;
}

/* AIメインループを、場の任意効果を必ず評価する形に上書き */
aiTakeTurn = async function(){
  state.phase = "DRAW";
  draw("AI", 1);
  enforceHandLimit("AI");
  renderAll();
  await sleep(120);

  state.phase = "MAIN";
  renderAll();
  await sleep(120);

  let actions = 0;
  let acted = true;

  while(acted && actions < 12 && !state.gameOver){
    acted = false;

    if(await aiTryPlayBestCharacter()){
      acted = true; actions++; await sleep(70); continue;
    }

    if(await aiTryUseFieldAbilities_Strict()){
      acted = true; actions++; await sleep(70); continue;
    }

    if(await aiTryPlayBestItem()){
      acted = true; actions++; await sleep(70); continue;
    }

    const effectPlan = [2,16];
    for(const no of effectPlan){
      if(await aiTryPlayEffect(no)){
        acted = true;
        actions++;
        await sleep(70);
        break;
      }
    }
  }

  if(actions===0){
    log("AI：有効なプレイが見つからず（このターンは展開なし）", "warn");
  }

  state.phase = "BATTLE";
  renderAll();
  await sleep(120);

  if(!canBattleThisTurn("AI")){
    log(`AI：${battleBanReason("AI")}（BATTLEスキップ）`);
  }else{
    await aiBattleBest();
  }

  state.phase = "END";
  enforceHandLimit("AI");
  clearEndTurnTemps("AI");
  renderAll();
  await sleep(100);

  log("AI：ターン終了");
};

log("PATCH 13+14 読み込み完了");
/* =========================================================
  PATCH 15
  - No.22 インフルエンサーまりも 追加
  - サーチ/デッキ見参に反応して、そのカードをターン中無効
  - 将来の無効基盤の下準備
========================================================= */

/* ---------------- カード追加 ---------------- */
(function addCard22_Marimo(){
  const def = {
    no:22,
    name:"インフルエンサーまりも",
    type:"character",
    tags:["人間","配信","人気"],
    titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "相手の以下のいずれかの効果が発動した時、手札からウイングに送り発動できる。\n" +
      "そのターンの終わりまで、その効果を発動したカードの効果を全て無効にする。\n" +
      "対象：\n" +
      "・デッキからカードを手札に加える効果\n" +
      "・デッキからキャラクターを見参する効果"
    ),
    rank:3,
    atk:400
  };

  const idx = CardRegistry.findIndex(c=>c.no===22);
  if(idx >= 0) CardRegistry[idx] = def;
  else CardRegistry.push(def);

  if(!CARD_NOS.includes(22)){
    CARD_NOS.push(22);
    CARD_NOS.sort((a,b)=>a-b);
  }

  ensureInitialCollectionAndDeck();
  log("PATCH15：No.22 インフルエンサーまりも を登録");
})();

/* ---------------- まりも無効基盤 ---------------- */
if(!state.effectLocks){
  state.effectLocks = [];
}
if(!state.effectContext){
  state.effectContext = null;
}

function mwCurrentTurnLockToken(){
  return `${state.turn}:${state.activeSide}`;
}
function mwCleanupEffectLocks(){
  const token = mwCurrentTurnLockToken();
  state.effectLocks = state.effectLocks.filter(x => x && x.token === token);
}
function mwRegisterTurnMute(sourceCard, sourceSide, reason="MARIMO"){
  if(!sourceCard) return;
  mwCleanupEffectLocks();

  const exists = state.effectLocks.some(x =>
    x &&
    x.uid === sourceCard.uid &&
    x.token === mwCurrentTurnLockToken() &&
    x.reason === reason
  );
  if(exists) return;

  state.effectLocks.push({
    uid: sourceCard.uid,
    side: sourceSide,
    token: mwCurrentTurnLockToken(),
    reason
  });
}
function mwIsCardMutedThisTurn(card){
  if(!card) return false;
  mwCleanupEffectLocks();
  return state.effectLocks.some(x => x && x.uid === card.uid && x.token === mwCurrentTurnLockToken());
}
function mwFindCardByUidEverywhere(side, uid){
  if(!uid) return null;
  const p = state[side];
  const zones = [
    ...(p.C || []),
    ...(p.E || []),
    ...(p.hand || []),
    ...(p.wing || []),
    ...(p.deck || []),
    ...(p.outside || [])
  ];
  return zones.find(c=>c && c.uid===uid) || null;
}
function mwFindLikelySourceCard(link){
  if(!link) return null;
  if(link.sourceCard && link.sourceCard.uid){
    const live = mwFindCardByUidEverywhere(link.activatorSide, link.sourceCard.uid);
    return live || link.sourceCard;
  }

  const side = link.activatorSide;
  const label = link.label;
  if(!side || !label) return null;

  const p = state[side];
  const zones = [
    ...(p.C || []),
    ...(p.E || []),
    ...(p.wing || []),
    ...(p.hand || [])
  ];
  return zones.find(c=>c && c.name===label) || null;
}
function mwFindMarimoInHand(side){
  return state[side].hand.find(c=>c && c.no===22) || null;
}
function mwTakeMarimoFromHand(side){
  const idx = state[side].hand.findIndex(c=>c && c.no===22);
  if(idx < 0) return null;
  return state[side].hand.splice(idx,1)[0];
}

/* ---------------- まりも発動 ---------------- */
async function mwTryActivateMarimoAgainst(sourceSide, sourceCard, triggerType){
  if(!sourceCard) return false;

  const marimoSide = opponent(sourceSide);
  const marimo = mwFindMarimoInHand(marimoSide);
  if(!marimo) return false;

  if(mwIsCardMutedThisTurn(sourceCard)){
    return true; // すでに封印済みなら現効果も不成立扱い
  }

  if(marimoSide==="P1"){
    const ok = await askYesNo(
      "インフルエンサーまりも",
      `${sideName(sourceSide)}の「${sourceCard.name}」が対象効果（${triggerType}）を発動しました。\n` +
      "インフルエンサーまりもを手札からウイングに送り、\n" +
      "そのターンの終わりまでこのカードの効果を全て無効にしますか？"
    );
    if(!ok) return false;
  }

  const moved = mwTakeMarimoFromHand(marimoSide);
  if(!moved) return false;

  moveToWing(marimoSide, moved);
  mwRegisterTurnMute(sourceCard, sourceSide, "MARIMO");
  log(`${sideName(marimoSide)}：インフルエンサーまりもを発動 → ${sourceCard.name} をターン中無効`);
  renderAll();
  return true;
}

/* ---------------- 効果処理入口で「既にまりもで封印済み」を止める ---------------- */
const __mw_processActivatedEffect_patch15 = processActivatedEffect;
processActivatedEffect = async function(link){
  mwCleanupEffectLocks();

  const sourceCard = mwFindLikelySourceCard(link);
  if(sourceCard && mwIsCardMutedThisTurn(sourceCard)){
    log(`${sourceCard.name}：インフルエンサーまりもによりこのターン効果を発動できない`, "warn");
    if(link && link.onNegated){
      await link.onNegated({negated:true, negatorKind:"MARIMO"});
    }
    return {
      ok:false,
      detail:{negated:true, negatorKind:"MARIMO"}
    };
  }

  state.effectContext = {
    sourceCard: sourceCard || null,
    sourceSide: link ? link.activatorSide : null,
    label: link ? link.label : ""
  };

  try{
    return await __mw_processActivatedEffect_patch15(link);
  }finally{
    state.effectContext = null;
  }
};

/* ---------------- サーチ系にまりも割り込み ---------------- */
async function mwCheckMarimoForDeckToHand(){
  const ctx = state.effectContext;
  if(!ctx || !ctx.sourceCard || !ctx.sourceSide) return false;
  return await mwTryActivateMarimoAgainst(ctx.sourceSide, ctx.sourceCard, "デッキから手札に加える効果");
}

const __mw_searchFromDeckOrWingByTag_patch15 = searchFromDeckOrWingByTag;
searchFromDeckOrWingByTag = async function(side, tag, n, opt={}){
  if(await mwCheckMarimoForDeckToHand()){
    log("まりも：サーチ効果を無効");
    return;
  }
  return await __mw_searchFromDeckOrWingByTag_patch15(side, tag, n, opt);
};

const __mw_searchFromDeckOrWingByNameIncludes_patch15 = searchFromDeckOrWingByNameIncludes;
searchFromDeckOrWingByNameIncludes = async function(side, word, n, opt={}){
  if(await mwCheckMarimoForDeckToHand()){
    log("まりも：サーチ効果を無効");
    return;
  }
  return await __mw_searchFromDeckOrWingByNameIncludes_patch15(side, word, n, opt);
};

const __mw_searchDeckByTitleTagItem_patch15 = searchDeckByTitleTagItem;
searchDeckByTitleTagItem = async function(side, titleTag, n, opt={}){
  if(await mwCheckMarimoForDeckToHand()){
    log("まりも：サーチ効果を無効");
    return;
  }
  return await __mw_searchDeckByTitleTagItem_patch15(side, titleTag, n, opt);
};

if(typeof searchDeckOrWingByTitleTagItem === "function"){
  const __mw_searchDeckOrWingByTitleTagItem_patch15 = searchDeckOrWingByTitleTagItem;
  searchDeckOrWingByTitleTagItem = async function(side, titleTag, n, opt={}){
    if(await mwCheckMarimoForDeckToHand()){
      log("まりも：サーチ効果を無効");
      return;
    }
    return await __mw_searchDeckOrWingByTitleTagItem_patch15(side, titleTag, n, opt);
  };
}

if(typeof searchDeckByTitleTagSelectable === "function"){
  const __mw_searchDeckByTitleTagSelectable_patch15 = searchDeckByTitleTagSelectable;
  searchDeckByTitleTagSelectable = async function(side, titleTag, n, opt={}){
    if(await mwCheckMarimoForDeckToHand()){
      log("まりも：サーチ効果を無効");
      return;
    }
    return await __mw_searchDeckByTitleTagSelectable_patch15(side, titleTag, n, opt);
  };
}

/* ---------------- デッキ見参系にまりも割り込み ---------------- */
async function mwCheckMarimoForDeckKensan(){
  const ctx = state.effectContext;
  if(!ctx || !ctx.sourceCard || !ctx.sourceSide) return false;
  return await mwTryActivateMarimoAgainst(ctx.sourceSide, ctx.sourceCard, "デッキからキャラクターを見参する効果");
}

const __mw_activateSeshiaArisaSummon_patch15 = activateSeshiaArisaSummon;
activateSeshiaArisaSummon = async function(side, pos, card){
  /* 元効果文は手札からレイチェル見参だが、今後の対象拡張に備え source 情報を持たせておく */
  return await __mw_activateSeshiaArisaSummon_patch15(side, pos, card);
};

if(typeof specialSummonKotaroKojiroFrom25 === "function"){
  const __mw_specialSummonKotaroKojiroFrom25_patch15 = specialSummonKotaroKojiroFrom25;
  specialSummonKotaroKojiroFrom25 = async function(side){
    if(await mwCheckMarimoForDeckKensan()){
      log("まりも：デッキ見参効果を無効");
      return;
    }
    return await __mw_specialSummonKotaroKojiroFrom25_patch15(side);
  };
}

/* ---------------- 明示的な sourceCard を持たせる補助 ---------------- */
const __mw_activateFieldCardAbility_patch15 = activateFieldCardAbility;
activateFieldCardAbility = async function(side, zone, pos, card){
  if(card && mwIsCardMutedThisTurn(card)){
    log(`${card.name}：インフルエンサーまりもによりこのターン効果を発動できない`, "warn");
    return;
  }
  return await __mw_activateFieldCardAbility_patch15(side, zone, pos, card);
};

const __mw_onEnterTriggers_patch15 = onEnterTriggers;
onEnterTriggers = async function(side, ctx){
  if(ctx && ctx.card && mwIsCardMutedThisTurn(ctx.card)){
    log(`${ctx.card.name}：インフルエンサーまりもによりこのターン効果を発動できない`, "warn");
    return;
  }
  return await __mw_onEnterTriggers_patch15(side, ctx);
};

/* ---------------- まりもの価値をAIにも認識させる ---------------- */
const __mw_chooseAIDiscardIndex_patch15 = chooseAIDiscardIndex;
chooseAIDiscardIndex = function(side){
  const hand = state[side].hand;
  if(!hand.length) return -1;

  let bestIdx = 0;
  let bestScore = Infinity;

  const aiShield0 = countShields(side) === 0;
  const foeCanThreatenDirect =
    countShields(side) === 0 &&
    state[opponent(side)].C.some(c=>c && c.no!==7);

  for(let i=0;i<hand.length;i++){
    const c = hand[i];
    let s = (c.baseAtk||0) + (c.rank||0)*120;

    if(c.no===14) s += 1100;
    if(c.no===17) s += 320;
    if(c.no===21) s += aiShield0 ? 3000 : 1200;
    if(c.no===22) s += 900;   // まりもは残し寄り
    if(c.no===23) s += 320;
    if(c.no===25) s += 280;
    if(c.no===28) s += 260;
    if(c.no===29) s += 260;
    if(c.no===26 || c.no===27) s += 220;
    if(c.no===30) s += 180;
    if(isItem(c)) s += 70;
    if(isEffect(c)) s += 90;

    if(foeCanThreatenDirect && c.no===21) s += 3000;

    if(s < bestScore){
      bestScore = s;
      bestIdx = i;
    }
  }
  return bestIdx;
};

/* ---------------- 画像反映補助 ---------------- */
(async function patch15_refreshImageCache(){
  try{
    ensureInitialCollectionAndDeck();
    const cache = getCache();
    if(cache && cache.cardFiles){
      const addMap = buildCardMapFromFileList(cache.cardFiles);
      for(const k of Object.keys(addMap||{})){
        state.img.cardUrlByNo[k] = vercelPathCards(addMap[k]);
      }
      renderAll();
    }
    log("PATCH15：画像反映補助完了（必要なら画像再スキャン）");
  }catch(err){
    log(`PATCH15：画像反映補助失敗 ${String(err.message||err)}`, "warn");
  }
})();

log("PATCH 15 読み込み完了");
/* =========================================================
  PATCH 18+19
  - 記憶抹消で無効にされた手形を必ずウイングへ送る
  - 小太郎 / 小次郎 の相互バフ条件を厳密化
========================================================= */

/* =========================================================
  1. 記憶抹消で無効にされた手形をウイングへ
========================================================= */

function mwFindHandgataOnField(side){
  return state[side].C.find(c=>c && c.no===8) || null;
}

runCounterChain = async function(initialLink){
  const chain = [initialLink];
  let priority = opponent(initialLink.activatorSide);
  let passCount = 0;

  while(passCount < 2){
    const prevLink = chain[chain.length - 1];
    let choice = await chooseCounterForSide(priority, prevLink);

    const availableNow = (typeof getAvailableCounters === "function")
      ? getAvailableCounters(priority, prevLink)
      : [];

    if(choice === "HANDGATA" && availableNow.length && !availableNow.includes("HANDGATA")){
      choice = "PASS";
    }
    if(choice === "MEMORY" && availableNow.length && !availableNow.includes("MEMORY")){
      choice = "PASS";
    }

    if(choice === "HANDGATA"){
      const source = mwFindHandgataOnField(priority);

      state.limits[priority].handgataUsed = true;
      chain.push({
        kind:"HANDGATA",
        label:"手形",
        activatorSide: priority,
        sourceUid: source ? source.uid : null
      });
      log(`${sideName(priority)}：手形を発動`);
      priority = opponent(priority);
      passCount = 0;
      continue;
    }

    if(choice === "MEMORY"){
      const me = takeMemoryEraseFromHand(priority);
      if(me){
        moveToWing(priority, me);
        chain.push({
          kind:"MEMORY",
          label:"記憶抹消",
          activatorSide: priority
        });
        log(`${sideName(priority)}：記憶抹消を発動`);
        priority = opponent(priority);
        passCount = 0;
        continue;
      }else{
        choice = "PASS";
      }
    }

    passCount += 1;
    priority = opponent(priority);
  }

  const active = Array(chain.length).fill(true);
  for(let i=chain.length-1; i>=1; i--){
    if(active[i]) active[i-1] = false;
  }

  for(let i=1;i<chain.length;i++){
    if(active[i]){
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：直前の効果を無効`);

      const prev = chain[i-1];
      const cur  = chain[i];

      if(cur.kind === "MEMORY" && prev.kind === "HANDGATA"){
        const targetSide = prev.activatorSide;

        let handgata = null;
        if(prev.sourceUid){
          handgata = state[targetSide].C.find(c=>c && c.uid===prev.sourceUid) || null;
        }
        if(!handgata){
          handgata = mwFindHandgataOnField(targetSide);
        }

        if(handgata){
          await sendCharacterToWing(targetSide, handgata.uid);
          log(`記憶抹消：${sideName(targetSide)}の手形をウイングへ`);
          renderAll();
        }
      }
    }else{
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効にされた`);
    }
  }

  const negated = !active[0];
  const negatorKind = negated && chain[1] ? chain[1].kind : null;
  return { negated, negatorKind, chain, active };
};

/* =========================================================
  2. 小太郎 / 小次郎 の相互バフを厳密化
========================================================= */

function mwHasKotaroOnStage(side){
  return state[side].C.some(c=>c && c.no===9);
}
function mwHasKojiroOnStage(side){
  return state[side].C.some(c=>c && c.no===10);
}

/* 現在ATK計算を上書きして、No.9 / No.10 のみ厳密に補正 */
const __mw_calcCurrentAtk_patch19_base = calcCurrentAtk;
calcCurrentAtk = function(side, card){
  if(!card) return 0;

  let atk = card.baseAtk + (card.tempAtk||0);

  if(card.equipUid){
    const equip = findEquipInE(side, card.equipUid);
    if(equip && equip._equipBonus) atk += equip._equipBonus;
    if(equip && equip._equipBonus2) atk += equip._equipBonus2;
  }

  /* 小太郎 / 小次郎の相互バフ
     - 小太郎(No.9) は 小次郎(No.10) がいる時だけ +500
     - 小次郎(No.10) は 小太郎(No.9) がいる時だけ +500
     - 同名2枚のみでは発動しない
     - No.25 は代用しない
  */
  if(card.no === 9 && mwHasKojiroOnStage(side)){
    atk += 500;
  }
  if(card.no === 10 && mwHasKotaroOnStage(side)){
    atk += 500;
  }

  if(card.tags && card.tags.includes("美少女戦士")){
    atk += getRubySapphireStageBuffCount(side) * 500;
  }

  return atk;
};

log("PATCH 18+19 読み込み完了");
/* =========================================================
  PATCH 18R
  - 記憶抹消で無効化された発動元カードを、種類を問わず必ずウイングへ送る
  - 手形のみ限定ではなく、全発動カード共通ルール化
========================================================= */

function mw18rFindCardByUidEverywhere(side, uid){
  if(!uid) return null;
  const p = state[side];
  const zones = [
    ...(p.C || []),
    ...(p.E || []),
    ...(p.hand || []),
    ...(p.wing || []),
    ...(p.deck || []),
    ...(p.outside || [])
  ];
  return zones.find(c=>c && c.uid===uid) || null;
}

function mw18rFindLikelySourceCard(link){
  if(!link) return null;

  if(link.sourceCard && link.sourceCard.uid){
    const live = mw18rFindCardByUidEverywhere(link.activatorSide, link.sourceCard.uid);
    return live || link.sourceCard;
  }

  const side = link.activatorSide;
  const label = link.label;
  if(!side || !label) return null;

  const p = state[side];
  const zones = [
    ...(p.C || []),
    ...(p.E || []),
    ...(p.hand || [])
  ];

  return zones.find(c=>c && c.name===label) || null;
}

async function mw18rSendNegatedSourceToWing(side, sourceCard){
  if(!side || !sourceCard) return false;

  const p = state[side];

  /* すでに場を離れているなら何もしない */
  const inC = p.C.find(c=>c && c.uid===sourceCard.uid);
  if(inC){
    await sendCharacterToWing(side, inC.uid);
    return true;
  }

  const ePos = p.E.findIndex(c=>c && c.uid===sourceCard.uid);
  if(ePos >= 0){
    const card = p.E[ePos];
    p.E[ePos] = null;

    if(card && card.equippedToUid){
      const host = p.C.find(c=>c && c.uid===card.equippedToUid);
      if(host && host.equipUid === card.uid){
        host.equipUid = null;
      }
      card.equippedToUid = null;
    }

    moveToWing(side, card);
    return true;
  }

  const hPos = p.hand.findIndex(c=>c && c.uid===sourceCard.uid);
  if(hPos >= 0){
    const card = p.hand.splice(hPos,1)[0];
    moveToWing(side, card);
    return true;
  }

  return false;
}

/* ---------------------------------------------------------
  既存の processActivatedEffect を包んで、
  記憶抹消で無効化された発動元カードを一律ウイングへ送る
--------------------------------------------------------- */
const __mw_processActivatedEffect_patch18R = processActivatedEffect;
processActivatedEffect = async function(link){
  const sourceCard = mw18rFindLikelySourceCard(link);
  const sourceSide = link ? link.activatorSide : null;

  const result = await __mw_processActivatedEffect_patch18R(link);

  if(
    result &&
    result.ok === false &&
    result.detail &&
    result.detail.negatorKind === "MEMORY" &&
    sourceCard &&
    sourceSide
  ){
    const moved = await mw18rSendNegatedSourceToWing(sourceSide, sourceCard);
    if(moved){
      log(`記憶抹消：${sideName(sourceSide)}の「${sourceCard.name}」をウイングへ`);
      renderAll();
    }
  }

  return result;
};

/* ---------------------------------------------------------
  念のため、runCounterChain も sourceUid を持つ形に統一
  （手形など link.sourceCard を持たないケースの補強）
--------------------------------------------------------- */
function mw18rFindHandgataOnField(side){
  return state[side].C.find(c=>c && c.no===8) || null;
}

runCounterChain = async function(initialLink){
  const chain = [initialLink];
  let priority = opponent(initialLink.activatorSide);
  let passCount = 0;

  while(passCount < 2){
    const prevLink = chain[chain.length - 1];
    let choice = await chooseCounterForSide(priority, prevLink);

    const availableNow = (typeof getAvailableCounters === "function")
      ? getAvailableCounters(priority, prevLink)
      : [];

    if(choice === "HANDGATA" && availableNow.length && !availableNow.includes("HANDGATA")){
      choice = "PASS";
    }
    if(choice === "MEMORY" && availableNow.length && !availableNow.includes("MEMORY")){
      choice = "PASS";
    }

    if(choice === "HANDGATA"){
      const source = mw18rFindHandgataOnField(priority);

      state.limits[priority].handgataUsed = true;
      chain.push({
        kind:"HANDGATA",
        label:"手形",
        activatorSide: priority,
        sourceCard: source || null,
        sourceUid: source ? source.uid : null
      });
      log(`${sideName(priority)}：手形を発動`);
      priority = opponent(priority);
      passCount = 0;
      continue;
    }

    if(choice === "MEMORY"){
      const me = takeMemoryEraseFromHand(priority);
      if(me){
        moveToWing(priority, me);
        chain.push({
          kind:"MEMORY",
          label:"記憶抹消",
          activatorSide: priority,
          sourceCard: me,
          sourceUid: me.uid
        });
        log(`${sideName(priority)}：記憶抹消を発動`);
        priority = opponent(priority);
        passCount = 0;
        continue;
      }else{
        choice = "PASS";
      }
    }

    passCount += 1;
    priority = opponent(priority);
  }

  const active = Array(chain.length).fill(true);
  for(let i=chain.length-1; i>=1; i--){
    if(active[i]) active[i-1] = false;
  }

  for(let i=1;i<chain.length;i++){
    if(active[i]){
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：直前の効果を無効`);
    }else{
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効にされた`);
    }
  }

  const negated = !active[0];
  const negatorKind = negated && chain[1] ? chain[1].kind : null;
  return { negated, negatorKind, chain, active };
};

log("PATCH 18R 読み込み完了");
/* =========================================================
  PATCH 20
  - 七星剣装備時、P1側でも未攻撃の相手が残っていれば再攻撃可能にする
  - 1回攻撃後に半透明になって選べなくなる不具合を修正
========================================================= */

function mw20HasSevenStarMultiAttack(side, card){
  if(!card || !isCharacter(card)) return false;
  if(typeof hasSevenStarSwordBonus === "function"){
    return hasSevenStarSwordBonus(side, card);
  }

  if(!card.equipUid) return false;
  const eq = getEquippedItem(side, card);
  if(!eq || eq.no !== 30) return false;
  return card.tags && card.tags.includes("剣士");
}

function mw20RemainingSevenStarTargets(side, card){
  if(!mw20HasSevenStarMultiAttack(side, card)) return [];
  if(typeof getRemainingSevenStarTargets === "function"){
    return getRemainingSevenStarTargets(side, card) || [];
  }

  const enemy = opponent(side);
  const hit = Array.isArray(card.flags?.sevenStarHitUidsThisTurn)
    ? card.flags.sevenStarHitUidsThisTurn
    : [];

  return state[enemy].C.filter(c=>c && !hit.includes(c.uid));
}

/* ---------------- P1の攻撃可能判定を上書き ---------------- */
isAttackableNow_P1 = function(card){
  if(!card || !isCharacter(card)) return false;
  if(state.gameOver) return false;
  if(state.activeSide!=="P1") return false;
  if(state.phase!=="BATTLE") return false;
  if(!canBattleThisTurn("P1")) return false;

  /* 七星剣の全体攻撃中は、未攻撃対象が残っている限り攻撃可能 */
  if(mw20HasSevenStarMultiAttack("P1", card)){
    const remain = mw20RemainingSevenStarTargets("P1", card);
    if(remain.length > 0) return true;
  }

  return (card.flags.attackedCountThisTurn < getMaxAttacks("P1", card));
};

/* ---------------- プレイヤー攻撃者選択を補強 ---------------- */
const __mw_selectAttacker_patch20 = selectAttacker;
selectAttacker = async function(side, pos, card){
  if(side!=="P1") return;
  if(!canBattleThisTurn("P1")){
    log(battleBanReason("P1"), "warn");
    return;
  }

  if(mw20HasSevenStarMultiAttack("P1", card)){
    const remain = mw20RemainingSevenStarTargets("P1", card);

    /* 未攻撃対象が残っているなら attackedCountThisTurn に関係なく選択可 */
    if(remain.length > 0){
      state.battle.attackerUid = card.uid;
      state.battle.attackerPos = pos;
      state.battle.attackerSide = side;
      log(`攻撃者選択：${card.name}（七星剣連撃）`);
      renderAll();
      await chooseAttackTarget();
      return;
    }
  }

  return await __mw_selectAttacker_patch20(side, pos, card);
};

/* ---------------- 描画上の半透明化も補正 ---------------- */
const __mw_makeSlot_patch20 = makeSlot;
makeSlot = function(card, side, ctx, opts={}){
  const slot = __mw_makeSlot_patch20(card, side, ctx, opts);

  if(
    card &&
    ctx?.side==="P1" &&
    ctx?.zone==="C" &&
    isCharacter(card) &&
    state.activeSide==="P1" &&
    state.phase==="BATTLE"
  ){
    if(mw20HasSevenStarMultiAttack("P1", card)){
      const remain = mw20RemainingSevenStarTargets("P1", card);
      if(remain.length > 0){
        slot.style.opacity = "1";

        const hasAtkBadge = Array.from(slot.children).some(n =>
          n instanceof HTMLElement &&
          n.textContent === "⚔"
        );

        if(!hasAtkBadge){
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
    }
  }

  return slot;
};

log("PATCH 20 読み込み完了");
/* =========================================================
  PATCH 21
  ① レイチェルのシールド破壊は必ず手札へ
  ② 装備アイテムを複数装備可能化
  ③ デッキ編集で複数デッキ保存対応
  + 将来の禁止 / 制限枚数の土台
========================================================= */

/* =========================================================
  0. 将来の制限枚数土台
========================================================= */
if(!window.MW_DECK_RULES){
  window.MW_DECK_RULES = {
    defaultMaxCopies: 3,
    byNo: {
      /* 例:
      14: 2,
      23: 1
      */
    }
  };
}
function mwGetDeckMaxCopies(no){
  const n = window.MW_DECK_RULES?.byNo?.[no];
  return (typeof n === "number") ? n : (window.MW_DECK_RULES?.defaultMaxCopies || 3);
}

/* canAddToDeck を将来の制限枚数対応版で上書き */
canAddToDeck = function(col, deck, no){
  const k = pad2(no);
  const inDeck = countDeckByNo(deck)[k] || 0;
  const owned = col[k] || 0;
  const maxCopies = mwGetDeckMaxCopies(no);

  if(totalDeckCount(deck) >= 40) return {ok:false, reason:"デッキが40枚です"};
  if(inDeck >= maxCopies) return {ok:false, reason:`同名は${maxCopies}枚までです`};
  if(inDeck >= owned) return {ok:false, reason:"所持枚数が足りません"};
  return {ok:true, reason:""};
};

deckEditorSummaryLine = function(deck){
  const c = countDeckByNo(deck);
  let kinds = 0;
  for(const no of CARD_NOS){
    if(c[pad2(no)]>0) kinds++;
  }
  return `40枚固定 / 採用${kinds}種 / 基本同名最大${window.MW_DECK_RULES.defaultMaxCopies}枚`;
};

/* =========================================================
  1. レイチェルのシールド破壊は必ず手札へ
========================================================= */
breakOneShieldByEffect = async function(defSide, sourceName){
  const idx = pickFirstShieldIndex(defSide);
  if(idx < 0){
    log(`${sourceName}：破壊できるシールドがありません`);
    return false;
  }
  const sh = state[defSide].shield[idx];
  state[defSide].shield[idx] = null;
  state[defSide].hand.push(sh);
  log(`${sourceName}：${sideName(defSide)}のシールドを1枚破壊 → 手札へ`);
  renderAll();
  return true;
};

/* =========================================================
  2. 複数装備対応
========================================================= */

/* 既存の単一 equipUid を残しつつ、複数装備は equipUids で管理 */
function mwEnsureEquipArray(card){
  if(!card) return;
  if(!Array.isArray(card.equipUids)){
    card.equipUids = [];
    if(card.equipUid){
      card.equipUids.push(card.equipUid);
    }
  }
}

function mwGetEquipsForCharacter(side, characterCard){
  if(!characterCard) return [];
  mwEnsureEquipArray(characterCard);
  const out = [];
  for(const uid of characterCard.equipUids){
    const eq = findEquipInE(side, uid);
    if(eq) out.push(eq);
  }
  return out;
}

function mwAddEquipToCharacter(side, host, itemCard){
  mwEnsureEquipArray(host);
  if(!host.equipUids.includes(itemCard.uid)){
    host.equipUids.push(itemCard.uid);
  }
  host.equipUid = host.equipUids[0] || null; /* 旧参照互換 */
  itemCard.equippedToUid = host.uid;
}

function mwRemoveEquipFromCharacter(host, equipUid){
  if(!host) return;
  mwEnsureEquipArray(host);
  host.equipUids = host.equipUids.filter(uid => uid !== equipUid);
  host.equipUid = host.equipUids[0] || null;
}

function mwApplySingleEquipBonuses(itemCard, host){
  itemCard._equipBonus = 0;
  itemCard._equipBonus2 = 0;
  itemCard._extraAttacks = 0;
  itemCard._allEnemyOnce = false;

  if(itemCard.no===18){
    itemCard._equipBonus = 500;
    if(host.tags.includes("射手")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===19){
    itemCard._equipBonus = 500;
    if(host.tags.includes("勇者") || host.tags.includes("剣士")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===20){
    itemCard._equipBonus = 300;
    if(host.tags.includes("勇者")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===24){
    itemCard._equipBonus = 500;
    if(host.tags.includes("除霊")){
      itemCard._equipBonus2 = 500;
      itemCard._extraAttacks = 2;
    }
  }else if(itemCard.no===30){
    itemCard._equipBonus = 500;
    if(host.tags.includes("剣士")){
      itemCard._equipBonus2 = 500;
      itemCard._allEnemyOnce = true;
    }
  }
}

/* 複数装備分を合算 */
calcCurrentAtk = function(side, card){
  if(!card) return 0;
  let atk = card.baseAtk + (card.tempAtk||0);

  const equips = mwGetEquipsForCharacter(side, card);
  for(const eq of equips){
    if(eq._equipBonus) atk += eq._equipBonus;
    if(eq._equipBonus2) atk += eq._equipBonus2;
  }

  if(card.no === 9 && state[side].C.some(c=>c && c.no===10)) atk += 500;
  if(card.no === 10 && state[side].C.some(c=>c && c.no===9)) atk += 500;

  if(card.tags && card.tags.includes("美少女戦士")){
    atk += getRubySapphireStageBuffCount(side) * 500;
  }

  return atk;
};

getEquippedItem = function(side, characterCard){
  const arr = mwGetEquipsForCharacter(side, characterCard);
  return arr[0] || null; /* 旧互換 */
};

getMaxAttacks = function(side, card){
  if(!card || !isCharacter(card)) return 0;
  let max = 1;

  const equips = mwGetEquipsForCharacter(side, card);

  /* まひる：アイテムを1枚でも装備していれば2回 */
  if(card.no===7 && equips.length>0) max = Math.max(max, 2);

  for(const eq of equips){
    if(eq._extraAttacks) max += eq._extraAttacks;
  }

  /* 七星剣の全体1回ずつ攻撃は別ロジック側で対象数を使う */
  const hasSevenStarMulti = equips.some(eq=>eq.no===30 && card.tags.includes("剣士"));
  if(hasSevenStarMulti){
    const enemyCount = state[opponent(side)].C.filter(Boolean).length;
    if(enemyCount > 0) max = Math.max(max, enemyCount);
  }

  return max;
};

function hasSevenStarSwordBonus(side, card){
  if(!card || !isCharacter(card)) return false;
  const equips = mwGetEquipsForCharacter(side, card);
  return equips.some(eq=>eq.no===30 && card.tags.includes("剣士"));
}

/* 装備先が場を離れたら、そのキャラの全装備をまとめてウイングへ */
stripEquipIfAny = async function(side, characterCard){
  if(!characterCard) return;
  mwEnsureEquipArray(characterCard);

  const p = state[side];
  const targetUids = [...characterCard.equipUids];

  for(const eqUid of targetUids){
    const eq = findEquipInE(side, eqUid);
    if(!eq) continue;

    const ePos = p.E.findIndex(x=>x && x.uid===eq.uid);
    if(ePos>=0) p.E[ePos]=null;

    eq.equippedToUid = null;
    moveToWing(side, eq);
    log(`装備剥がれ：${eq.name} → ${sideName(side)}ウイング`);
  }

  characterCard.equipUids = [];
  characterCard.equipUid = null;
};

function cleanupDanglingEquips(side){
  const p = state[side];
  let changed = false;

  for(let i=0;i<p.E.length;i++){
    const eq = p.E[i];
    if(!eq || !eq.equippedToUid) continue;

    const host = p.C.find(c=>c && c.uid===eq.equippedToUid);
    if(!host){
      p.E[i] = null;
      eq.equippedToUid = null;
      moveToWing(side, eq);
      log(`装備解除：${eq.name} → ${sideName(side)}ウイング`);
      changed = true;
      continue;
    }

    mwEnsureEquipArray(host);
    if(!host.equipUids.includes(eq.uid)){
      host.equipUids.push(eq.uid);
      host.equipUid = host.equipUids[0] || null;
      changed = true;
    }
  }

  return changed;
}

/* 装備は複数可能。既存装備を剥がさない */
equipItemFromE = async function(side, ePos, itemCard){
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
    renderAll();
    return;
  }

  let cPos = 0;
  if(side==="AI"){
    let best = targets[0];
    let bestScore = -999999;
    for(const t of targets){
      let s = calcCurrentAtk(side, t.c);
      if(itemCard.no===24 && t.c.tags.includes("除霊")) s += 900;
      if(itemCard.no===18 && t.c.tags.includes("射手")) s += 700;
      if(itemCard.no===19 && (t.c.tags.includes("勇者") || t.c.tags.includes("剣士"))) s += 700;
      if(itemCard.no===20 && t.c.tags.includes("勇者")) s += 600;
      if(itemCard.no===30 && t.c.tags.includes("剣士")) s += 800;
      if(s > bestScore){ bestScore=s; best=t; }
    }
    cPos = best.i;
  }else{
    const pick = await askChoice(
      "装備先を選択",
      "装備するキャラクターを選んでください。",
      targets.map(x=>({
        label:`C${x.i+1}：${x.c.name}`,
        sub:`ATK ${calcCurrentAtk(side, x.c)}`,
        value:`${x.i}`,
        card:x.c
      }))
    );
    cPos = Number(pick);
  }

  const host = p.C[cPos];
  if(!host){
    log("装備：対象が無効です", "warn");
    p.E[ePos]=null;
    moveToWing(side, itemCard);
    renderAll();
    return;
  }

  mwApplySingleEquipBonuses(itemCard, host);
  mwAddEquipToCharacter(side, host, itemCard);

  log(`装備：${itemCard.name} → ${host.name}`);
  renderAll();
};

/* アイテム評価はそのまま使い、装備先に複数積めるように */
aiTryPlayBestItem = async function(){
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
      let bonus = 0;
      if(it.c.no===18){
        bonus = 500 + (hs.h.tags.includes("射手") ? 500 : 0);
      }else if(it.c.no===19){
        bonus = 500 + ((hs.h.tags.includes("勇者") || hs.h.tags.includes("剣士")) ? 500 : 0);
      }else if(it.c.no===20){
        bonus = 300 + (hs.h.tags.includes("勇者") ? 500 : 0);
      }else if(it.c.no===24){
        bonus = 500 + (hs.h.tags.includes("除霊") ? 500 : 0) + (hs.h.tags.includes("除霊") ? 180 : 0);
      }else if(it.c.no===30){
        bonus = 500 + (hs.h.tags.includes("剣士") ? 900 : 0);
      }

      let score = bonus + calcCurrentAtk("AI", hs.h)*0.2;
      if(it.c.no===24 && hs.h.no===23) score += 700;
      if(it.c.no===18 && hs.h.no===7) score += 620;
      if(it.c.no===30 && hs.h.tags.includes("剣士")) score += 360;

      if(score <= 0) continue;
      if(!best || score > best.score){
        best = {itemIndex: it.i, item: it.c, hostPos: hs.i, score};
      }
    }
  }
  if(!best) return false;

  const item = p.hand.splice(best.itemIndex,1)[0];
  p.E[ePos]=item;
  log(`AI：E配置（発動） ${item.name}`);
  renderAll();

  const act = {
    kind:"ACT",
    label:item.name,
    activatorSide:"AI",
    sourceCard:item,
    resolve: async ()=>{ await equipItemFromE("AI", ePos, item); },
    onNegated: async ()=>{
      if(state.AI.E[ePos] && state.AI.E[ePos].uid===item.uid) state.AI.E[ePos]=null;
      moveToWing("AI", item);
      log(`AI：無効化され ${item.name} → AIウイング`);
      renderAll();
    }
  };
  await processActivatedEffect(act);
  return true;
};

/* =========================================================
  3. 複数デッキ保存
========================================================= */
const LS_DECK_SLOTS = "mw_deck_slots_v1";

function mwReadDeckSlots(){
  const raw = safeJSONParse(localStorage.getItem(LS_DECK_SLOTS) || "", null);
  if(raw && typeof raw==="object") return raw;
  return {
    A: readDeck(),
    B: [],
    C: []
  };
}
function mwWriteDeckSlots(slots){
  localStorage.setItem(LS_DECK_SLOTS, JSON.stringify(slots));
}
function mwSaveCurrentDeckToSlot(slotKey){
  const slots = mwReadDeckSlots();
  slots[slotKey] = readDeck().slice();
  mwWriteDeckSlots(slots);
  log(`デッキ編集：スロット${slotKey}に保存`);
}
function mwLoadDeckFromSlot(slotKey){
  const slots = mwReadDeckSlots();
  const deck = Array.isArray(slots[slotKey]) ? slots[slotKey].slice() : [];
  if(!deck.length){
    log(`デッキ編集：スロット${slotKey}は空です`, "warn");
    return false;
  }
  writeDeck(deck);
  log(`デッキ編集：スロット${slotKey}を読み込み`);
  return true;
}

/* デッキ編集UIを拡張 */
const __mw_renderDeckEditor_patch21 = renderDeckEditor;
renderDeckEditor = function(){
  __mw_renderDeckEditor_patch21();

  if(!el.zoneBody) return;

  const panel = document.createElement("div");
  panel.className = "choiceMsg";
  panel.style.whiteSpace = "pre-line";
  panel.style.marginTop = "10px";
  panel.textContent = "デッキスロット：保存 / 読み込み";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.flexWrap = "wrap";
  row.style.gap = "8px";
  row.style.marginTop = "8px";

  const mkBtn = (label, fn)=>{
    const b = document.createElement("button");
    b.textContent = label;
    b.style.padding = "8px 10px";
    b.style.borderRadius = "10px";
    b.style.border = "1px solid rgba(255,255,255,.18)";
    b.style.background = "rgba(0,0,0,.35)";
    b.style.color = "white";
    b.style.fontWeight = "800";
    b.addEventListener("click", fn, {passive:true});
    return b;
  };

  for(const key of ["A","B","C"]){
    row.appendChild(mkBtn(`保存 ${key}`, ()=>{
      mwSaveCurrentDeckToSlot(key);
      renderDeckEditor();
    }));
    row.appendChild(mkBtn(`読込 ${key}`, ()=>{
      if(mwLoadDeckFromSlot(key)){
        renderDeckEditor();
      }
    }));
  }

  panel.appendChild(row);
  el.zoneBody.appendChild(panel);
};

log("PATCH 21 読み込み完了");
/* =========================================================
  PATCH 23
  完全チェーン対応版
  - 手形→手形→記憶抹消→記憶抹消 無限対応
========================================================= */

function mw23GetCounters(side){
  const list = [];

  /* 手形 */
  if(
    state.activeSide !== side &&
    !state.limits[side].handgataUsed &&
    state[side].C.some(c=>c && c.no===8)
  ){
    list.push("HANDGATA");
  }

  /* 記憶抹消 */
  if(state[side].hand.some(c=>c && c.no===14)){
    list.push("MEMORY");
  }

  return list;
}

function mw23FindHandgata(side){
  return state[side].C.find(c=>c && c.no===8) || null;
}

/* ================================
  完全チェーン処理
================================ */
runCounterChain = async function(initialLink){

  const chain = [initialLink];
  let priority = opponent(initialLink.activatorSide);
  let passCount = 0;

  while(true){

    /* 毎回最新状態で取得 */
    const available = mw23GetCounters(priority);

    let choice = "PASS";

    if(available.length > 0){

      if(priority === "P1"){
        const items = [];

        if(available.includes("HANDGATA")){
          items.push({label:"手形で無効", value:"HANDGATA"});
        }
        if(available.includes("MEMORY")){
          items.push({label:"記憶抹消で無効", value:"MEMORY"});
        }

        items.push({label:"しない", value:"PASS"});

        choice = await askChoice(
          "チェーン確認",
          `${sideName(chain[chain.length-1].activatorSide)}の「${chain[chain.length-1].label}」に反応しますか？`,
          items
        ) || "PASS";

      }else{
        /* AI優先 */
        if(available.includes("MEMORY")) choice = "MEMORY";
        else if(available.includes("HANDGATA")) choice = "HANDGATA";
      }
    }

    /* ===== 発動処理 ===== */

    if(choice === "HANDGATA"){
      const src = mw23FindHandgata(priority);

      state.limits[priority].handgataUsed = true;

      chain.push({
        kind:"HANDGATA",
        label:"手形",
        activatorSide: priority,
        sourceCard: src,
        sourceUid: src ? src.uid : null
      });

      log(`${sideName(priority)}：手形発動`);

      priority = opponent(priority);
      passCount = 0;
      continue;
    }

    if(choice === "MEMORY"){
      const card = takeMemoryEraseFromHand(priority);
      if(card){
        moveToWing(priority, card);

        chain.push({
          kind:"MEMORY",
          label:"記憶抹消",
          activatorSide: priority,
          sourceCard: card,
          sourceUid: card.uid
        });

        log(`${sideName(priority)}：記憶抹消発動`);

        priority = opponent(priority);
        passCount = 0;
        continue;
      }
    }

    /* ===== PASS処理 ===== */

    passCount++;

    if(passCount >= 2){
      break;
    }

    priority = opponent(priority);
  }

  /* ================================
    解決処理（後ろから）
  =============================== */

  const active = Array(chain.length).fill(true);

  for(let i = chain.length - 1; i >= 1; i--){
    if(active[i]){
      active[i - 1] = false;
    }
  }

  for(let i=1;i<chain.length;i++){
    if(active[i]){
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効成功`);
    }else{
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効化された`);
    }
  }

  const negated = !active[0];
  const negatorKind = negated ? chain[1].kind : null;

  return {negated, negatorKind, chain, active};
};

log("PATCH 23 完全チェーン対応");
/* =========================================================
  PATCH 24 COMPLETE
  ・バトル中ATK表示
  ・ダメージ確定演出
========================================================= */

/* =========================
  ATK取得
========================= */
function mw24GetBattleView(){

  if(!state.battle) return null;

  const atk = state.battle.attacker;
  const def = state.battle.defender;

  if(!atk || !def) return null;

  return {
    atkSide: atk.side,
    atkValue: atk.currentAtk ?? atk.atk ?? 0,
    defSide: def.side,
    defValue: def.currentAtk ?? def.atk ?? 0
  };
}

/* =========================
  現在ATK表示
========================= */
function mw24ShowCurrentBattle(){

  const v = mw24GetBattleView();
  if(!v) return;

  log(
    `現在のバトル：\n` +
    `${sideName(v.atkSide)} ${v.atkValue} vs ${sideName(v.defSide)} ${v.defValue}`
  );
}

/* =========================
  ダメージ確定演出
========================= */
function mw24ShowBattleResult(){

  const v = mw24GetBattleView();
  if(!v) return;

  let result = "";

  if(v.atkValue > v.defValue){
    result = `▶ ${sideName(v.atkSide)}の勝利`;
  }else if(v.atkValue < v.defValue){
    result = `▶ ${sideName(v.defSide)}の勝利`;
  }else{
    result = "▶ 相打ち";
  }

  log(
    `【バトル確定】\n` +
    `${sideName(v.atkSide)} ${v.atkValue} vs ${sideName(v.defSide)} ${v.defValue}\n\n` +
    result
  );
}

/* =========================
  logフック（効果発動時）
========================= */
const _mw24_originalLog = log;

log = function(msg){

  _mw24_originalLog(msg);

  if(state.phase === "BATTLE"){

    /* 効果発動系で現在値表示 */
    if(
      msg.includes("発動") ||
      msg.includes("ATK") ||
      msg.includes("上昇") ||
      msg.includes("減少")
    ){
      mw24ShowCurrentBattle();
    }

    /* 解決・ダメージ直前っぽいログで確定演出 */
    if(
      msg.includes("解決") ||
      msg.includes("ダメージ") ||
      msg.includes("バトル")
    ){
      mw24ShowBattleResult();
    }
  }
};

log("PATCH 24 COMPLETE loaded");
/* =========================================================
  PATCH 25
  - 記憶抹消で無効化された発動元カードを正しくウイングへ送る
  - AIが自分の効果に自分で手形 / 記憶抹消を使わない
========================================================= */

/* ---------------- 共通：発動元カード探索 ---------------- */
function mw25FindCardByUid(side, uid){
  if(!uid) return null;
  const p = state[side];
  const zones = [
    ...(p.C || []),
    ...(p.E || []),
    ...(p.hand || []),
    ...(p.wing || []),
    ...(p.deck || []),
    ...(p.outside || [])
  ];
  return zones.find(c=>c && c.uid===uid) || null;
}

function mw25FindLikelySourceCard(link){
  if(!link) return null;

  if(link.sourceCard && link.sourceCard.uid){
    return mw25FindCardByUid(link.activatorSide, link.sourceCard.uid) || link.sourceCard;
  }

  if(link.sourceUid){
    return mw25FindCardByUid(link.activatorSide, link.sourceUid);
  }

  const side = link.activatorSide;
  const label = link.label;
  if(!side || !label) return null;

  const p = state[side];
  const zones = [
    ...(p.C || []),
    ...(p.E || []),
    ...(p.hand || [])
  ];
  return zones.find(c=>c && c.name===label) || null;
}

async function mw25SendNegatedSourceToWing(side, sourceCard){
  if(!side || !sourceCard) return false;

  const p = state[side];

  /* C */
  const inC = p.C.find(c=>c && c.uid===sourceCard.uid);
  if(inC){
    await sendCharacterToWing(side, inC.uid);
    return true;
  }

  /* E */
  const ePos = p.E.findIndex(c=>c && c.uid===sourceCard.uid);
  if(ePos >= 0){
    const card = p.E[ePos];
    p.E[ePos] = null;

    if(card && card.equippedToUid){
      const host = p.C.find(c=>c && c.uid===card.equippedToUid);
      if(host){
        if(Array.isArray(host.equipUids)){
          host.equipUids = host.equipUids.filter(uid => uid !== card.uid);
          host.equipUid = host.equipUids[0] || null;
        }else if(host.equipUid === card.uid){
          host.equipUid = null;
        }
      }
      card.equippedToUid = null;
    }

    moveToWing(side, card);
    return true;
  }

  /* hand */
  const hPos = p.hand.findIndex(c=>c && c.uid===sourceCard.uid);
  if(hPos >= 0){
    const card = p.hand.splice(hPos,1)[0];
    moveToWing(side, card);
    return true;
  }

  return false;
}

/* ---------------- カウンター可能判定 ----------------
   自分の効果には自分で反応しない
----------------------------------------------------- */
function mw25GetCounters(side, prevLink){
  const list = [];
  if(!prevLink) return list;

  /* 自分が発動したリンクには自分で反応しない */
  if(prevLink.activatorSide === side) return list;

  /* 手形 */
  if(
    state.activeSide !== side &&
    !state.limits[side].handgataUsed &&
    state[side].C.some(c=>c && c.no===8)
  ){
    list.push("HANDGATA");
  }

  /* 記憶抹消 */
  if(state[side].hand.some(c=>c && c.no===14)){
    list.push("MEMORY");
  }

  return list;
}

function mw25FindHandgata(side){
  return state[side].C.find(c=>c && c.no===8) || null;
}

/* ---------------- 選択UI ---------------- */
chooseCounterForSide = async function(side, prevLink){
  const available = mw25GetCounters(side, prevLink);

  if(available.length === 0){
    return "PASS";
  }

  const items = [];
  if(available.includes("HANDGATA")){
    items.push({label:"手形で無効", value:"HANDGATA"});
  }
  if(available.includes("MEMORY")){
    items.push({label:"記憶抹消で無効", value:"MEMORY"});
  }
  items.push({label:"しない", value:"PASS"});

  if(side === "P1"){
    const v = await askChoice(
      "チェーン確認",
      `${sideName(prevLink.activatorSide)}が「${prevLink.label}」を発動しました。\n反応しますか？`,
      items
    );
    return v || "PASS";
  }

  /* AIは相手の効果にだけ反応する */
  if(available.includes("MEMORY")) return "MEMORY";
  if(available.includes("HANDGATA")) return "HANDGATA";
  return "PASS";
};

/* ---------------- 完全チェーン再定義 ----------------
   各リンクに sourceCard / sourceUid を必ず持たせる
----------------------------------------------------- */
runCounterChain = async function(initialLink){
  if(initialLink && !initialLink.sourceCard){
    initialLink.sourceCard = mw25FindLikelySourceCard(initialLink);
  }
  if(initialLink && !initialLink.sourceUid && initialLink.sourceCard){
    initialLink.sourceUid = initialLink.sourceCard.uid;
  }

  const chain = [initialLink];
  let priority = opponent(initialLink.activatorSide);
  let passCount = 0;

  while(true){
    const prevLink = chain[chain.length - 1];
    const available = mw25GetCounters(priority, prevLink);

    let choice = "PASS";

    if(available.length > 0){
      choice = await chooseCounterForSide(priority, prevLink);
      if(!choice) choice = "PASS";
    }

    const availableNow = mw25GetCounters(priority, prevLink);
    if(choice === "HANDGATA" && !availableNow.includes("HANDGATA")) choice = "PASS";
    if(choice === "MEMORY" && !availableNow.includes("MEMORY")) choice = "PASS";

    if(choice === "HANDGATA"){
      const src = mw25FindHandgata(priority);

      state.limits[priority].handgataUsed = true;
      chain.push({
        kind:"HANDGATA",
        label:"手形",
        activatorSide: priority,
        sourceCard: src || null,
        sourceUid: src ? src.uid : null
      });

      log(`${sideName(priority)}：手形発動`);
      priority = opponent(priority);
      passCount = 0;
      continue;
    }

    if(choice === "MEMORY"){
      const card = takeMemoryEraseFromHand(priority);
      if(card){
        moveToWing(priority, card);

        chain.push({
          kind:"MEMORY",
          label:"記憶抹消",
          activatorSide: priority,
          sourceCard: card,
          sourceUid: card.uid
        });

        log(`${sideName(priority)}：記憶抹消発動`);
        priority = opponent(priority);
        passCount = 0;
        continue;
      }
    }

    passCount++;
    if(passCount >= 2) break;
    priority = opponent(priority);
  }

  const active = Array(chain.length).fill(true);
  for(let i = chain.length - 1; i >= 1; i--){
    if(active[i]){
      active[i - 1] = false;
    }
  }

  for(let i=1;i<chain.length;i++){
    if(active[i]){
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効成功`);
    }else{
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効化された`);
    }
  }

  const negated = !active[0];
  const negatorKind = negated && chain[1] ? chain[1].kind : null;

  return {
    negated,
    negatorKind,
    chain,
    active,
    finalNegatorLink: negated && chain[1] ? chain[1] : null
  };
};

/* ---------------- 記憶抹消成功後、発動元を必ずウイングへ ---------------- */
const __mw25_processActivatedEffect = processActivatedEffect;
processActivatedEffect = async function(link){
  if(link && !link.sourceCard){
    link.sourceCard = mw25FindLikelySourceCard(link);
  }
  if(link && !link.sourceUid && link.sourceCard){
    link.sourceUid = link.sourceCard.uid;
  }

  const result = await __mw25_processActivatedEffect(link);

  if(
    result &&
    result.ok === false &&
    result.detail &&
    result.detail.negatorKind === "MEMORY"
  ){
    const sourceSide = link ? link.activatorSide : null;
    const sourceCard = (link && (link.sourceCard || mw25FindLikelySourceCard(link))) || null;

    if(sourceSide && sourceCard){
      const moved = await mw25SendNegatedSourceToWing(sourceSide, sourceCard);
      if(moved){
        log(`記憶抹消：${sideName(sourceSide)}の「${sourceCard.name}」をウイングへ`);
        renderAll();
      }
    }
  }

  return result;
};

log("PATCH 25 読み込み完了");
/* =========================================================
  PATCH 26
  - 手形の発動条件を「相手ターン中」ではなく
    「直前の効果を相手が発動した時」に修正
  - クルエラ → AI手形 → 自分手形 のような再カウンターを正しく表示
========================================================= */

/* ---------------- 手形 / 記憶抹消の候補判定を修正 ---------------- */
function mw26GetCounters(side, prevLink){
  const list = [];
  if(!prevLink) return list;

  /* 自分が今発動したリンクには自分で反応しない */
  if(prevLink.activatorSide === side) return list;

  /* 手形
     相手が直前リンクを発動したなら、ターン中かどうかに関係なく反応可能
  */
  if(
    !state.limits[side].handgataUsed &&
    state[side].C.some(c => c && c.no === 8)
  ){
    list.push("HANDGATA");
  }

  /* 記憶抹消
     相手が直前リンクを発動したなら反応可能
  */
  if(state[side].hand.some(c => c && c.no === 14)){
    list.push("MEMORY");
  }

  return list;
}

/* ---------------- 選択UI上書き ---------------- */
chooseCounterForSide = async function(side, prevLink){
  const available = mw26GetCounters(side, prevLink);

  if(available.length === 0){
    return "PASS";
  }

  const items = [];
  if(available.includes("HANDGATA")){
    items.push({label:"手形で無効", value:"HANDGATA"});
  }
  if(available.includes("MEMORY")){
    items.push({label:"記憶抹消で無効", value:"MEMORY"});
  }
  items.push({label:"しない", value:"PASS"});

  if(side === "P1"){
    const v = await askChoice(
      "チェーン確認",
      `${sideName(prevLink.activatorSide)}が「${prevLink.label}」を発動しました。\n反応しますか？`,
      items
    );
    return v || "PASS";
  }

  /* AI優先順
     1. 記憶抹消
     2. 手形
  */
  if(available.includes("MEMORY")) return "MEMORY";
  if(available.includes("HANDGATA")) return "HANDGATA";
  return "PASS";
};

/* ---------------- runCounterChain も同じ判定系に統一 ---------------- */
runCounterChain = async function(initialLink){
  if(initialLink && !initialLink.sourceCard){
    initialLink.sourceCard = (typeof mw25FindLikelySourceCard === "function")
      ? mw25FindLikelySourceCard(initialLink)
      : null;
  }
  if(initialLink && !initialLink.sourceUid && initialLink.sourceCard){
    initialLink.sourceUid = initialLink.sourceCard.uid;
  }

  const chain = [initialLink];
  let priority = opponent(initialLink.activatorSide);
  let passCount = 0;

  while(true){
    const prevLink = chain[chain.length - 1];
    const available = mw26GetCounters(priority, prevLink);

    let choice = "PASS";

    if(available.length > 0){
      choice = await chooseCounterForSide(priority, prevLink);
      if(!choice) choice = "PASS";
    }

    const availableNow = mw26GetCounters(priority, prevLink);
    if(choice === "HANDGATA" && !availableNow.includes("HANDGATA")) choice = "PASS";
    if(choice === "MEMORY" && !availableNow.includes("MEMORY")) choice = "PASS";

    if(choice === "HANDGATA"){
      const src = state[priority].C.find(c=>c && c.no===8) || null;

      state.limits[priority].handgataUsed = true;
      chain.push({
        kind:"HANDGATA",
        label:"手形",
        activatorSide: priority,
        sourceCard: src,
        sourceUid: src ? src.uid : null
      });

      log(`${sideName(priority)}：手形発動`);
      priority = opponent(priority);
      passCount = 0;
      continue;
    }

    if(choice === "MEMORY"){
      const card = takeMemoryEraseFromHand(priority);
      if(card){
        moveToWing(priority, card);

        chain.push({
          kind:"MEMORY",
          label:"記憶抹消",
          activatorSide: priority,
          sourceCard: card,
          sourceUid: card.uid
        });

        log(`${sideName(priority)}：記憶抹消発動`);
        priority = opponent(priority);
        passCount = 0;
        continue;
      }
    }

    passCount++;
    if(passCount >= 2) break;
    priority = opponent(priority);
  }

  const active = Array(chain.length).fill(true);
  for(let i = chain.length - 1; i >= 1; i--){
    if(active[i]){
      active[i - 1] = false;
    }
  }

  for(let i=1;i<chain.length;i++){
    if(active[i]){
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効成功`);
    }else{
      log(`${sideName(chain[i].activatorSide)}の${chain[i].label}：無効化された`);
    }
  }

  const negated = !active[0];
  const negatorKind = negated && chain[1] ? chain[1].kind : null;

  return {
    negated,
    negatorKind,
    chain,
    active,
    finalNegatorLink: negated && chain[1] ? chain[1] : null
  };
};

log("PATCH 26 読み込み完了");


/* =========================================================
  PATCH 30 SAFE UI PREVIEW
  - バトル中の発動確認文に現在ATKを表示
  - 装備アイテムのチェーン確認に装備先候補とATK変化予測を表示
  - ask系を壊さない最小上書き
========================================================= */

function mw30FindCardByUid(side, uid){
  if(!uid || !state[side]) return null;
  const p = state[side];
  const zones = [
    ...(p.C||[]), ...(p.E||[]), ...(p.hand||[]), ...(p.wing||[]), ...(p.outside||[])
  ];
  return zones.find(c=>c && c.uid===uid) || null;
}

function mw30GetBattlePair(){
  const atkSide = state?.battle?.attackerSide || null;
  const atkUid  = state?.battle?.attackerUid || null;
  if(!atkSide || !atkUid) return null;
  const atkCard = state[atkSide].C.find(c=>c && c.uid===atkUid) || null;
  if(!atkCard) return null;

  const defSide = opponent(atkSide);
  let defCard = null;

  const defUid = state.__mw29BattleDefenderUid || state.__mw30BattleDefenderUid || null;
  if(defUid){
    defCard = state[defSide].C.find(c=>c && c.uid===defUid) || null;
  }
  if(!defCard){
    // バトル時の確認UIで最低限使えるよう、相手場の先頭を暫定表示
    defCard = state[defSide].C.find(Boolean) || null;
  }
  if(!defCard) return null;

  return { atkSide, defSide, atkCard, defCard };
}

const __mw30_resolveBattle = resolveBattle;
resolveBattle = async function(attacker, defenderUid){
  state.__mw30BattleDefenderUid = defenderUid || null;
  try{
    return await __mw30_resolveBattle(attacker, defenderUid);
  } finally {
    state.__mw30BattleDefenderUid = null;
  }
};

function mw30BuildBattleStatusText(extraLines=[]){
  const pair = mw30GetBattlePair();
  if(!pair) return "";
  const atkNow = calcCurrentAtk(pair.atkSide, pair.atkCard);
  const defNow = calcCurrentAtk(pair.defSide, pair.defCard);
  let txt =
    `\n\n【現在のバトル】\n` +
    `${sideName(pair.atkSide)}：${pair.atkCard.name} ATK ${atkNow}\n` +
    `${sideName(pair.defSide)}：${pair.defCard.name} ATK ${defNow}`;
  if(extraLines && extraLines.length){
    txt += `\n\n` + extraLines.join("\n");
  }
  return txt;
}

function mw30FindEffectSourceCard(title, message){
  const all = [
    ...(state.P1.C||[]), ...(state.P1.E||[]), ...(state.P1.hand||[]),
    ...(state.AI.C||[]), ...(state.AI.E||[]), ...(state.AI.hand||[])
  ].filter(Boolean);

  // viewer selected
  if(state.viewer?.uid){
    const found = all.find(c=>c.uid===state.viewer.uid);
    if(found) return found;
  }
  // selected hand
  if(state.activeSide==="P1" && state.selectedHandIndex!=null){
    const c = state.P1.hand[state.selectedHandIndex];
    if(c) return c;
  }
  return all.find(c => (title && title.includes(c.name)) || (message && message.includes(c.name))) || null;
}

function mw30ShouldAnnotateBattlePrompt(title, message, sourceCard){
  if(state.phase !== "BATTLE") return false;
  if(!mw30GetBattlePair()) return false;
  if(sourceCard){
    if(typeof sourceCard._previewAtkDelta === "number") return true;
    if([3,6,13,15].includes(sourceCard.no)) return true;
  }
  const raw = `${title}\n${message}`;
  return /ATK|攻撃力|陰陽術|バトル中/.test(raw);
}

const __mw30_askYesNo = askYesNo;
askYesNo = async function(title, message){
  const sourceCard = mw30FindEffectSourceCard(title, message);
  if(mw30ShouldAnnotateBattlePrompt(title, message, sourceCard)){
    let extra = [];
    if(sourceCard){
      const pair = mw30GetBattlePair();
      if(pair){
        let delta = 0;
        if(sourceCard.no===15 || sourceCard.no===3) delta = 1000;
        if(sourceCard.no===6 || sourceCard.no===13) delta = -1000;
        if(delta!==0){
          const targetSelf = (sourceCard.no===15 || sourceCard.no===3);
          if(targetSelf){
            // own battler side of sourceCard owner
            const ownerSide = state.activeSide;
            if(ownerSide===pair.atkSide){
              extra.push(`発動後予測：${pair.atkCard.name} ATK ${calcCurrentAtk(pair.atkSide, pair.atkCard)+delta}`);
            }else if(ownerSide===pair.defSide){
              extra.push(`発動後予測：${pair.defCard.name} ATK ${calcCurrentAtk(pair.defSide, pair.defCard)+delta}`);
            }
          }else{
            const ownerSide = state.activeSide;
            if(ownerSide===pair.atkSide){
              extra.push(`発動後予測：${pair.defCard.name} ATK ${calcCurrentAtk(pair.defSide, pair.defCard)+delta}`);
            }else if(ownerSide===pair.defSide){
              extra.push(`発動後予測：${pair.atkCard.name} ATK ${calcCurrentAtk(pair.atkSide, pair.atkCard)+delta}`);
            }
          }
        }
      }
    }
    message = message + mw30BuildBattleStatusText(extra);
  }
  return await __mw30_askYesNo(title, message);
};

function mw30PredictEquipPreview(side, itemCard){
  if(!itemCard || !isItem(itemCard)) return null;
  const hosts = [];
  for(let i=0;i<3;i++){
    const h = state[side].C[i];
    if(h) hosts.push(h);
  }
  if(!hosts.length) return null;

  let host = hosts[0];
  if(side==="AI"){
    let best = hosts[0];
    let bestScore = -999999;
    for(const h of hosts){
      const bonus = itemBonusForHost(itemCard, h);
      const score = calcCurrentAtk(side, h) + bonus;
      if(score > bestScore){ bestScore = score; best = h; }
    }
    host = best;
  }
  const before = calcCurrentAtk(side, host);
  const after  = before + itemBonusForHost(itemCard, host);
  return { host, before, after };
}

const __mw30_chooseCounterForSide = chooseCounterForSide;
chooseCounterForSide = async function(side, prevLink){
  if(side !== "P1" || !prevLink){
    return await __mw30_chooseCounterForSide(side, prevLink);
  }

  const available = [];
  if(typeof mw26GetCounters === "function"){
    for(const x of mw26GetCounters(side, prevLink)) available.push(x);
  } else if(typeof mw25GetCounters === "function"){
    for(const x of mw25GetCounters(side, prevLink)) available.push(x);
  } else {
    if(hasHandgataOnField(side) && !state.limits[side].handgataUsed && prevLink.activatorSide!==side) available.push("HANDGATA");
    if(hasMemoryEraseInHand(side) && prevLink.activatorSide!==side) available.push("MEMORY");
  }

  if(available.length===0) return "PASS";

  const items = [];
  if(available.includes("HANDGATA")) items.push({label:"手形で無効", value:"HANDGATA"});
  if(available.includes("MEMORY")) items.push({label:"記憶抹消で無効", value:"MEMORY"});
  items.push({label:"しない", value:"PASS"});

  let msg = `${sideName(prevLink.activatorSide)}が「${prevLink.label}」を発動しました。`;

  // 相手装備アイテム時のATK予測
  let sourceCard = prevLink.sourceCard || (prevLink.sourceUid ? mw30FindCardByUid(prevLink.activatorSide, prevLink.sourceUid) : null);
  if(!sourceCard){
    sourceCard = (state[prevLink.activatorSide].E||[]).find(c=>c && c.name===prevLink.label) || null;
  }
  if(sourceCard && isItem(sourceCard)){
    const pv = mw30PredictEquipPreview(prevLink.activatorSide, sourceCard);
    if(pv){
      msg += `\n\n【装備予測】\n${pv.host.name}\nATK ${pv.before} → ${pv.after}`;
    }
  }

  if(state.phase === "BATTLE"){
    msg += mw30BuildBattleStatusText();
  }

  msg += `\n\n反応しますか？`;

  const v = await askChoice("チェーン確認", msg, items);
  return v || "PASS";
};

log("PATCH 30 SAFE UI PREVIEW 読み込み完了");
/* =========================================================
  PATCH 32
  1) 班目プロデューサーの戦闘1回耐久を完全修正
  2) 桜蘭の陰陽術の確認UIを汎用バトル比較つきに修正
  3) 複数装備に対応
========================================================= */

/* ------------------------------
  共通ヘルパ
------------------------------ */
function mw32FindCardByUid(side, uid){
  if(!uid || !state[side]) return null;
  const p = state[side];
  const zones = [
    ...(p.C || []),
    ...(p.E || []),
    ...(p.hand || []),
    ...(p.deck || []),
    ...(p.wing || []),
    ...(p.outside || []),
    ...(p.shield || [])
  ];
  return zones.find(c => c && c.uid === uid) || null;
}
function mw32EnsureEquipState(card){
  if(!card) return;
  if(!Array.isArray(card.equipUids)) card.equipUids = [];
  if(card.equipUid && !card.equipUids.includes(card.equipUid)){
    card.equipUids.unshift(card.equipUid);
  }
  card.equipUids = [...new Set(card.equipUids.filter(Boolean))];
  card.equipUid = card.equipUids[0] || null; // 既存互換
}
function mw32GetEquipUids(card){
  if(!card) return [];
  mw32EnsureEquipState(card);
  return card.equipUids.slice();
}
function mw32GetEquippedItems(side, card){
  if(!card) return [];
  const uids = mw32GetEquipUids(card);
  return uids
    .map(uid => findEquipInE(side, uid))
    .filter(Boolean);
}
function mw32HasAnyEquip(card){
  return mw32GetEquipUids(card).length > 0;
}
function mw32HasEquipNo(side, card, no){
  return mw32GetEquippedItems(side, card).some(eq => eq && eq.no === no);
}

/* ------------------------------
  makeInstance補強
------------------------------ */
const __mw32_makeInstance = makeInstance;
makeInstance = function(cardDef){
  const c = __mw32_makeInstance(cardDef);
  c.equipUids = [];
  return c;
};

/* ------------------------------
  ATK計算を複数装備対応化
------------------------------ */
calcCurrentAtk = function(side, card){
  if(!card) return 0;

  mw32EnsureEquipState(card);

  let atk = (card.baseAtk || 0) + (card.tempAtk || 0);

  const equips = mw32GetEquippedItems(side, card);
  for(const equip of equips){
    atk += (equip._equipBonus || 0);
    atk += (equip._equipBonus2 || 0);
  }

  /* 小太郎 / 小次郎 相互のみ */
  if(card.no===9 && hasOnStage(side, (c)=>c && c.no===10)) atk += 500;
  if(card.no===10 && hasOnStage(side, (c)=>c && c.no===9)) atk += 500;

  /* 美少女戦士支援 */
  if(card.tags && card.tags.includes("美少女戦士")){
    atk += getRubySapphireStageBuffCount(side) * 500;
  }

  return atk;
};

/* ------------------------------
  攻撃回数を複数装備対応化
------------------------------ */
getMaxAttacks = function(side, card){
  if(!card || !isCharacter(card)) return 0;

  mw32EnsureEquipState(card);

  let max = 1;

  /* まひるは装備していれば2回 */
  if(card.no===7 && mw32HasAnyEquip(card)){
    max = Math.max(max, 2);
  }

  /* 装備由来の追加回数 */
  for(const eq of mw32GetEquippedItems(side, card)){
    if(eq && eq._extraAttacks) max += eq._extraAttacks;
  }

  /* 七星剣＋剣士：相手ステージ全員に1回ずつ */
  if(mw32HasEquipNo(side, card, 30) && card.tags.includes("剣士")){
    const enemyCount = state[opponent(side)].C.filter(Boolean).length;
    if(enemyCount > 0) max = Math.max(max, enemyCount);
  }

  return max;
};

/* ------------------------------
  1枚取得関数は先頭装備を返す互換にする
------------------------------ */
getEquippedItem = function(side, characterCard){
  const items = mw32GetEquippedItems(side, characterCard);
  return items[0] || null;
};

/* ------------------------------
  装備解除：キャラが離れた時は全装備を剥がす
------------------------------ */
stripEquipIfAny = async function(side, characterCard){
  if(!characterCard) return;

  mw32EnsureEquipState(characterCard);

  const p = state[side];
  const equips = mw32GetEquippedItems(side, characterCard);

  for(const eq of equips){
    const ePos = p.E.findIndex(x => x && x.uid === eq.uid);
    if(ePos >= 0) p.E[ePos] = null;
    eq.equippedToUid = null;
    moveToWing(side, eq);
    log(`装備剥がれ：${eq.name} → ${sideName(side)}ウイング`);
  }

  characterCard.equipUids = [];
  characterCard.equipUid = null;
};

/* ------------------------------
  アイテム装備：複数装備対応
------------------------------ */
equipItemFromE = async function(side, ePos, itemCard){
  const p = state[side];
  const targets = [];

  for(let i=0;i<3;i++){
    const c = p.C[i];
    if(c) targets.push({i, c});
  }

  if(!targets.length){
    log("装備：対象キャラがいません（カードはウイングへ）", "warn");
    p.E[ePos] = null;
    moveToWing(side, itemCard);
    renderAll();
    return;
  }

  let cPos = 0;

  if(side==="AI"){
    let best = targets[0];
    let bestScore = -999999;
    for(const t of targets){
      let s = calcCurrentAtk(side, t.c);
      if(itemCard.no===24 && t.c.tags.includes("除霊")) s += 900;
      if(itemCard.no===18 && t.c.tags.includes("射手")) s += 700;
      if(itemCard.no===19 && (t.c.tags.includes("勇者") || t.c.tags.includes("剣士"))) s += 700;
      if(itemCard.no===20 && t.c.tags.includes("勇者")) s += 600;
      if(itemCard.no===30 && t.c.tags.includes("剣士")) s += 900;
      if(s > bestScore){ bestScore = s; best = t; }
    }
    cPos = best.i;
  }else{
    const pick = await askChoice(
      "装備先を選択",
      "装備するキャラクターを選んでください。",
      targets.map(x=>({
        label:`C${x.i+1}：${x.c.name}`,
        sub:`ATK ${calcCurrentAtk(side, x.c)}`,
        value:String(x.i),
        card:x.c
      }))
    );
    cPos = Number(pick);
  }

  const host = p.C[cPos];
  if(!host){
    log("装備：対象が無効です（取り消し）", "warn");
    return;
  }

  mw32EnsureEquipState(host);

  /* 装備ボーナス初期化 */
  itemCard._equipBonus = 0;
  itemCard._equipBonus2 = 0;
  itemCard._extraAttacks = 0;

  if(itemCard.no===18){
    itemCard._equipBonus = 500;
    if(host.tags.includes("射手")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===19){
    itemCard._equipBonus = 500;
    if(host.tags.includes("勇者") || host.tags.includes("剣士")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===20){
    itemCard._equipBonus = 300;
    if(host.tags.includes("勇者")) itemCard._equipBonus2 = 500;
  }else if(itemCard.no===24){
    itemCard._equipBonus = 500;
    if(host.tags.includes("除霊")){
      itemCard._equipBonus2 = 500;
      itemCard._extraAttacks = 2;
    }
  }else if(itemCard.no===30){
    itemCard._equipBonus = 500;
    if(host.tags.includes("剣士")) itemCard._equipBonus2 = 500;
  }

  itemCard.equippedToUid = host.uid;

  if(!host.equipUids.includes(itemCard.uid)){
    host.equipUids.push(itemCard.uid);
  }
  host.equipUid = host.equipUids[0] || itemCard.uid; // 既存互換

  log(`装備：${itemCard.name} → ${host.name}`);
  renderAll();
};

/* ------------------------------
  バトル確認UIの汎用ヘルパ
  今後のATK上下カードはこれを呼べば同じ表示形式で使える
------------------------------ */
function mw32BuildBattlePreview(attackerSide, attackerCard, defenderCard, previewLines=[]){
  if(!attackerSide || !attackerCard || !defenderCard) return "";
  const defenderSide = opponent(attackerSide);

  const atkNow = calcCurrentAtk(attackerSide, attackerCard);
  const defNow = calcCurrentAtk(defenderSide, defenderCard);

  let msg =
    `\n\n【現在のバトル】\n` +
    `${sideName(attackerSide)}：${attackerCard.name} ATK ${atkNow}\n` +
    `${sideName(defenderSide)}：${defenderCard.name} ATK ${defNow}`;

  if(previewLines.length){
    msg += `\n\n【発動後の予測】\n` + previewLines.join("\n");
  }

  return msg;
}

/* ------------------------------
  桜蘭の陰陽術：確認UIを強化
------------------------------ */
tryUseOuranDuringBattle = async function(side, ownBattler, enemyBattler){
  if(!hasOuranInHand(side)) return false;
  if(!ownBattler || !enemyBattler) return false;

  if(side==="P1"){
    const enemySide = state.AI.C.includes(enemyBattler) ? "AI" : "P1";
    const previewMsg =
      "バトル中です。桜蘭の陰陽術 - 闘 - を発動しますか？" +
      mw32BuildBattlePreview(
        enemySide,
        enemyBattler,
        ownBattler,
        [`自分側の選択キャラ ATK +1000`]
      );

    const ok = await askYesNo("桜蘭の陰陽術 - 闘 -", previewMsg);
    if(!ok) return false;

    const target = await pickOwnCharacterForOuran(side);
    if(!target) return false;

    const card = takeOuranFromHand(side);
    if(!card) return false;

    moveToWing(side, card);
    target.tempAtk += 1000;
    log(`桜蘭の陰陽術 - 闘 -：${target.name} ATK+1000（ターン終了まで）`);
    renderAll();
    return true;
  }

  if(side==="AI"){
    const myAtk = calcCurrentAtk(side, ownBattler);
    const enAtk = calcCurrentAtk(opponent(side), enemyBattler);
    if(!(myAtk <= enAtk && myAtk + 1000 > enAtk)) return false;

    const card = takeOuranFromHand(side);
    if(!card) return false;

    moveToWing(side, card);
    ownBattler.tempAtk += 1000;
    log(`AI：桜蘭の陰陽術 - 闘 - → ${ownBattler.name} ATK+1000`);
    renderAll();
    return true;
  }

  return false;
};

/* ------------------------------
  班目 / ミーコの戦闘1回耐久を全分岐で通す
------------------------------ */
resolveBattle = async function(attacker, defenderUid){
  const enemySide = "AI";
  const defender = state[enemySide].C.find(c=>c && c.uid===defenderUid);
  if(!defender){
    log("対象が無効です", "warn");
    return;
  }

  if(typeof markSevenStarHit === "function" && attacker && defenderUid){
    markSevenStarHit(attacker, defenderUid);
  }

  await tryUseOuranDuringBattle("P1", attacker, defender);
  await tryUseOuranDuringBattle("AI", defender, attacker);

  const atkA = calcCurrentAtk("P1", attacker);
  const atkD = calcCurrentAtk("AI", defender);
  log(`バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  if(atkA > atkD){
    const savedD = await tryBattleSurvive("AI", defender);
    if(!savedD){
      await sendCharacterToWing("AI", defender.uid);
      log(`撃破：${defender.name} → AIウイング`);
      if(attacker.no===23 && mw32HasAnyEquip(attacker)){
        await breakOneShieldByEffect("AI", attacker.name);
      }
    }
  }else if(atkA < atkD){
    const savedA = await tryBattleSurvive("P1", attacker);
    if(!savedA){
      await sendCharacterToWing("P1", attacker.uid);
      log(`敗北：${attacker.name} → あなたウイング`);
      await tryCattleTrigger_P1();
    }
  }else{
    const savedA = await tryBattleSurvive("P1", attacker);
    const savedD = await tryBattleSurvive("AI", defender);
    if(!savedA){
      await sendCharacterToWing("P1", attacker.uid);
      await tryCattleTrigger_P1();
    }
    if(!savedD){
      await sendCharacterToWing("AI", defender.uid);
    }
    log("相打ち：双方ウイング");
  }

  attacker.flags.attackedCountThisTurn += 1;
  state.battle.attackerUid = null;
  state.battle.attackerPos = null;
  renderAll();
};

/* ------------------------------
  AI側バトルも同様に修正
------------------------------ */
aiBattleBest = async function(){
  const p = state.AI;

  for(let i=0;i<3;i++){
    const a = p.C[i];
    if(!a) continue;

    while(a && state.AI.C[i] && state.AI.C[i].uid===a.uid && a.flags.attackedCountThisTurn < getMaxAttacks("AI", a)){
      const best = pickBestAIAttackFor(a);
      if(!best || best.score <= 120) break;

      if(best.type==="C"){
        const t = state.P1.C.find(c=>c && c.uid===best.uid);
        if(!t) break;

        if(typeof markSevenStarHit === "function"){
          markSevenStarHit(a, t.uid);
        }

        await tryUseOuranDuringBattle("AI", a, t);
        await tryUseOuranDuringBattle("P1", t, a);

        const atkA = calcCurrentAtk("AI", a);
        const atkD = calcCurrentAtk("P1", t);
        log(`AIバトル：${a.name}(${atkA}) → ${t.name}(${atkD})`);

        if(atkA > atkD){
          const savedD = await tryBattleSurvive("P1", t);
          if(!savedD){
            await sendCharacterToWing("P1", t.uid);
            log(`AI：撃破 ${t.name} → あなたウイング`);
            await tryCattleTrigger_P1();
            if(a.no===23 && mw32HasAnyEquip(a)){
              await breakOneShieldByEffect("P1", a.name);
            }
          }
        }else if(atkA < atkD){
          const savedA = await tryBattleSurvive("AI", a);
          if(!savedA){
            await sendCharacterToWing("AI", a.uid);
            log(`AI：敗北 ${a.name} → AIウイング`);
          }
        }else{
          const savedA = await tryBattleSurvive("AI", a);
          const savedD = await tryBattleSurvive("P1", t);
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

        if(!state.AI.C[i] || state.AI.C[i].uid!==a.uid) break;
        continue;
      }

      if(best.type==="S"){
        const sh = state.P1.shield[best.idx];
        if(!sh) break;
        state.P1.shield[best.idx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊（あなた）${best.idx+1} → あなた手札へ`);
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        await sleep(150);
        break;
      }

      if(best.type==="D"){
        const guarded = await tryMiikoDirectGuard("P1");
        a.flags.attackedCountThisTurn += 1;
        renderAll();
        if(guarded) break;
        await finishGame("AI");
        return;
      }

      break;
    }
  }
};

/* ------------------------------
  装備先が離れたら全装備を必ずウイングへ
------------------------------ */
sendCharacterToWing = async function(side, uid){
  const p = state[side];
  const pos = p.C.findIndex(c=>c && c.uid===uid);
  if(pos<0) return;

  const card = p.C[pos];
  await stripEquipIfAny(side, card);
  p.C[pos] = null;
  moveToWing(side, card);

  if(card && card.no===25 && typeof specialSummonKotaroKojiroFrom25 === "function"){
    const act = {
      kind:"ACT",
      label:card.name,
      activatorSide: side,
      resolve: async ()=>{ await specialSummonKotaroKojiroFrom25(side); },
      onNegated: async ()=>{ log(`${card.name} の離脱時効果は無効`); }
    };
    log(`${card.name}：離脱時効果を確認`);
    await processActivatedEffect(act);
  }
};

log("PATCH 32 読み込み完了");
/* =========================================================
  PATCH 33
  - セシア＆アリサの効果で、空きCが複数ある時は
    P1側のみ見参場所を選択できるようにする
========================================================= */

activateSeshiaArisaSummon = async function(side, pos, card){
  const p = state[side];

  const emptyPositions = [];
  for(let i=0;i<3;i++){
    if(!p.C[i]) emptyPositions.push(i);
  }

  if(emptyPositions.length <= 0){
    log("セシア＆アリサ：空きCがありません", "warn");
    return;
  }

  const candidates = p.hand.filter(c =>
    c && c.type==="character" && c.rank<=5 && c.name.includes("レイチェル")
  );
  if(!candidates.length){
    log("セシア＆アリサ：手札に条件を満たすレイチェルがいません", "warn");
    return;
  }

  let chosen = null;
  if(side==="AI"){
    chosen = candidates.sort((a,b)=> calcCurrentAtk(side,b)-calcCurrentAtk(side,a))[0];
  }else{
    const pick = await askChoice(
      "セシア＆アリサ",
      "条件無視で見参させるレイチェルを選んでください。",
      candidates.map(c=>({
        label: c.name,
        sub: `RANK ${c.rank} / ATK ${c.baseAtk}`,
        value: c.uid,
        card: c
      }))
    );
    chosen = p.hand.find(c=>c && c.uid===String(pick)) || null;
  }
  if(!chosen) return;

  let summonPos = emptyPositions[0];

  if(side==="P1" && emptyPositions.length >= 2){
    const posPick = await askChoice(
      "見参場所を選択",
      `${chosen.name} を見参させる場所を選んでください。`,
      emptyPositions.map(i=>({
        label: `C${i+1}`,
        sub: "空きエリア",
        value: String(i)
      }))
    );
    const pickedPos = Number(posPick);
    if(Number.isNaN(pickedPos) || !emptyPositions.includes(pickedPos)){
      log("セシア＆アリサ：見参場所の選択が無効です", "warn");
      return;
    }
    summonPos = pickedPos;
  }

  const moved = removeFromHandByUid(side, chosen.uid);
  if(!moved) return;

  p.C[summonPos] = moved;
  log(`セシア＆アリサ：条件無視で見参 ${moved.name} → C${summonPos+1}`);
  renderAll();
  await onEnterTriggers(side, {zone:"C", pos:summonPos, card:moved});
};

log("PATCH 33 読み込み完了");
/* =========================================================
 * Manpuku World 追記パッチ
 * 目的：
 * 1) AIターンの見せ方を少しゆっくりにする
 * 2) 中央フェイズバーを追加する
 * 3) MAIN→BATTLE / BATTLE→END の確認を入れる
 *
 * 使い方：
 * - このコードを script.js の末尾にそのまま追記
 * - 関数名が異なる場合は CONFIG だけ調整
 * ========================================================= */
(() => {
  'use strict';

  /* =========================
   * 0. 設定
   * ========================= */
  const CONFIG = {
    phaseOrder: ['START', 'DRAW', 'MAIN', 'BATTLE', 'END'],

    // 現在フェイズを取得する候補
    phaseStateCandidates: [
      () => window.currentPhase,
      () => window.phase,
      () => window.gameState?.phase,
      () => window.state?.phase,
      () => window.turnState?.phase
    ],

    // フェイズ進行関数候補
    nextPhaseFunctionNames: [
      'nextPhase',
      'advancePhase',
      'goNextPhase',
      'proceedPhase',
      'onNextPhase',
      'endPhase'
    ],

    // AIターン関数候補
    enemyTurnFunctionNames: [
      'enemyTurn',
      'aiTurn',
      'startEnemyTurn',
      'runEnemyTurn',
      'doEnemyTurn'
    ],

    // AI行動として遅延を入れたい関数候補
    aiActionFunctionNames: [
      'drawCard',
      'enemyDraw',
      'aiDraw',
      'summonAI',
      'enemySummon',
      'aiSummon',
      'playAICard',
      'enemyPlayCard',
      'performAttack',
      'enemyAttack',
      'aiAttack',
      'resolveAttack',
      'startBattle',
      'activateCardEffect',
      'enemyUseEffect',
      'aiUseEffect',
      'endTurn',
      'enemyEndTurn',
      'aiEndTurn'
    ],

    // フェイズバーを差し込む位置
    // body直下に固定配置します。既存HTML変更不要です。
    phaseBarId: 'mw-phase-bar',

    // AIターンの見せ方
    pacing: {
      enabled: true,
      preDelay: 180,
      postDelay: 260,
      afterEnemyTurnDelay: 180,
      maxQueueTime: 12000
    },

    // フェイズ確認
    confirmPhaseTransition: true,

    // 表示更新間隔
    phasePollMs: 120
  };

  /* =========================
   * 1. 共通ユーティリティ
   * ========================= */
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function normalizePhase(value) {
    if (value == null) return '';
    const s = String(value).trim().toUpperCase();

    if (s.includes('START')) return 'START';
    if (s.includes('DRAW')) return 'DRAW';
    if (s.includes('MAIN')) return 'MAIN';
    if (s.includes('BATTLE')) return 'BATTLE';
    if (s.includes('END')) return 'END';

    // 日本語表記への保険
    if (s.includes('スタート')) return 'START';
    if (s.includes('ドロー')) return 'DRAW';
    if (s.includes('メイン')) return 'MAIN';
    if (s.includes('バトル')) return 'BATTLE';
    if (s.includes('エンド')) return 'END';

    return s;
  }

  function getCurrentPhase() {
    for (const getter of CONFIG.phaseStateCandidates) {
      try {
        const v = getter();
        const normalized = normalizePhase(v);
        if (normalized) return normalized;
      } catch (_) {}
    }

    // 左上など既存表示から拾う保険
    const phaseTextCandidates = [
      document.querySelector('#phase'),
      document.querySelector('.phase'),
      document.querySelector('.phase-label'),
      document.querySelector('.turn-phase'),
      document.querySelector('[data-phase]')
    ];

    for (const el of phaseTextCandidates) {
      if (!el) continue;
      const v = el.dataset?.phase || el.textContent || '';
      const normalized = normalizePhase(v);
      if (normalized) return normalized;
    }

    return '';
  }

  function findExistingFunctionName(names) {
    for (const name of names) {
      if (typeof window[name] === 'function') return name;
    }
    return null;
  }

  function findExistingFunctionNames(names) {
    return names.filter(name => typeof window[name] === 'function');
  }

  function safeAnnounce(message) {
    if (typeof window.showAnnouncement === 'function') {
      window.showAnnouncement(message);
      return;
    }
    if (typeof window.announce === 'function') {
      window.announce(message);
      return;
    }
    if (typeof window.pushLog === 'function') {
      window.pushLog(message);
      return;
    }
    if (typeof window.addLog === 'function') {
      window.addLog(message);
      return;
    }
    console.log('[Manpuku World]', message);
  }

  /* =========================
   * 2. フェイズバーDOM/CSSをJSだけで追加
   * ========================= */
  function injectPhaseBarStyle() {
    if (document.getElementById('mw-phase-style')) return;

    const style = document.createElement('style');
    style.id = 'mw-phase-style';
    style.textContent = `
      #${CONFIG.phaseBarId} {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 14px;
        background: rgba(10, 12, 18, 0.52);
        backdrop-filter: blur(4px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.28);
        border: 1px solid rgba(255,255,255,0.10);
      }

      #${CONFIG.phaseBarId}.is-hidden {
        opacity: 0;
      }

      #${CONFIG.phaseBarId} .mw-phase-item {
        min-width: 64px;
        text-align: center;
        font-size: 11px;
        letter-spacing: 0.08em;
        font-weight: 700;
        color: rgba(255,255,255,0.45);
        padding: 6px 8px;
        border-radius: 10px;
        transition:
          transform 0.18s ease,
          color 0.18s ease,
          background 0.18s ease,
          box-shadow 0.18s ease,
          opacity 0.18s ease;
        opacity: 0.82;
      }

      #${CONFIG.phaseBarId} .mw-phase-item.is-active {
        color: rgba(255,255,255,0.98);
        background: rgba(255,255,255,0.12);
        transform: scale(1.16);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.10) inset,
                    0 0 14px rgba(255,255,255,0.12);
        opacity: 1;
      }

      #${CONFIG.phaseBarId} .mw-phase-item.is-done {
        color: rgba(255,255,255,0.68);
        opacity: 0.95;
      }

      /* カード系に軽い遷移を追加（既存HTML/CSS変更不要） */
      .card, .hand-card, .field-card, .zone-card, [data-card-id] {
        transition:
          transform 0.18s ease,
          left 0.18s ease,
          top 0.18s ease,
          opacity 0.18s ease,
          filter 0.18s ease;
        will-change: transform, left, top, opacity;
      }

      /* 盤面がとても狭い場合の簡易対応 */
      @media (max-width: 520px) {
        #${CONFIG.phaseBarId} {
          gap: 5px;
          padding: 6px 8px;
        }
        #${CONFIG.phaseBarId} .mw-phase-item {
          min-width: 52px;
          font-size: 10px;
          padding: 5px 6px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectPhaseBarDom() {
    if (document.getElementById(CONFIG.phaseBarId)) return;

    const bar = document.createElement('div');
    bar.id = CONFIG.phaseBarId;
    bar.setAttribute('aria-hidden', 'true');

    CONFIG.phaseOrder.forEach(phase => {
      const item = document.createElement('div');
      item.className = 'mw-phase-item';
      item.dataset.phase = phase;
      item.textContent = phase;
      bar.appendChild(item);
    });

    document.body.appendChild(bar);
  }

  function updatePhaseBar() {
    const bar = document.getElementById(CONFIG.phaseBarId);
    if (!bar) return;

    const current = getCurrentPhase();
    const items = bar.querySelectorAll('.mw-phase-item');

    if (!current) {
      bar.classList.add('is-hidden');
      return;
    }

    bar.classList.remove('is-hidden');

    const currentIndex = CONFIG.phaseOrder.indexOf(current);

    items.forEach((item, index) => {
      item.classList.remove('is-active', 'is-done');

      if (index < currentIndex) item.classList.add('is-done');
      if (CONFIG.phaseOrder[index] === current) item.classList.add('is-active');
    });
  }

  function startPhaseBarUpdater() {
    updatePhaseBar();
    setInterval(updatePhaseBar, CONFIG.phasePollMs);
  }

  /* =========================
   * 3. フェイズ進行確認の差し込み
   * ========================= */
  function shouldConfirmPhaseTransition(currentPhase) {
    if (!CONFIG.confirmPhaseTransition) return null;

    if (currentPhase === 'MAIN') {
      return 'バトルフェイズに入ってよろしいですか？';
    }
    if (currentPhase === 'BATTLE') {
      return 'バトルフェイズを終了してエンドフェイズに進んでよろしいですか？';
    }
    return null;
  }

  function patchPhaseAdvance() {
    const fnName = findExistingFunctionName(CONFIG.nextPhaseFunctionNames);
    if (!fnName) {
      console.warn('[Manpuku World] フェイズ進行関数が見つかりませんでした。CONFIG.nextPhaseFunctionNames を確認してください。');
      return;
    }

    if (window[fnName].__mwPatchedPhaseAdvance) return;

    const original = window[fnName];

    window[fnName] = function patchedPhaseAdvance(...args) {
      const currentPhase = getCurrentPhase();
      const message = shouldConfirmPhaseTransition(currentPhase);

      if (message) {
        const ok = window.confirm(message);
        if (!ok) return;
      }

      const result = original.apply(this, args);

      // フェイズ表示を即更新
      setTimeout(updatePhaseBar, 0);
      setTimeout(updatePhaseBar, 80);
      setTimeout(updatePhaseBar, 180);

      return result;
    };

    window[fnName].__mwPatchedPhaseAdvance = true;
    console.log(`[Manpuku World] フェイズ進行関数 ${fnName} に確認処理を追加しました。`);
  }

  /* =========================
   * 4. AIターンの“見せ方”を少しゆっくりにする
   *
   * 方式：
   * - AIターン関数を包む
   * - その間だけ、登録済みAI行動関数をキューに積む
   * - 少しずつ実行して「相手が動いている感」を出す
   *
   * 注意：
   * - 既存AIが「1アクションずつ順に実行する」構造なら有効
   * - 既存AIが1フレーム内で高度に再計算している場合は、
   *   体験改善はできても、完全最適にはならない可能性があります
   * ========================= */
  const AI_PACING = {
    active: false,
    queue: Promise.resolve(),
    wrappedActionNames: [],
    originals: new Map()
  };

  function wrapAiActionFunctions() {
    const names = findExistingFunctionNames(CONFIG.aiActionFunctionNames);

    names.forEach(name => {
      if (AI_PACING.originals.has(name)) return;

      const original = window[name];
      AI_PACING.originals.set(name, original);

      window[name] = function pacedAiActionWrapper(...args) {
        // AIターン中のみキュー制御
        if (!AI_PACING.active) {
          return original.apply(this, args);
        }

        AI_PACING.queue = AI_PACING.queue.then(async () => {
          await wait(CONFIG.pacing.preDelay);

          try {
            original.apply(this, args);
          } catch (err) {
            console.error(`[Manpuku World] AI行動関数 ${name} の実行中にエラー`, err);
          }

          updatePhaseBar();
          await wait(CONFIG.pacing.postDelay);
        });

        // 呼び元が返り値を使っていない前提の見せ方パッチ
        return undefined;
      };

      AI_PACING.wrappedActionNames.push(name);
    });

    if (AI_PACING.wrappedActionNames.length) {
      console.log('[Manpuku World] AI演出用にラップした関数:', AI_PACING.wrappedActionNames.join(', '));
    } else {
      console.warn('[Manpuku World] AI演出用にラップできる行動関数が見つかりませんでした。CONFIG.aiActionFunctionNames を確認してください。');
    }
  }

  function patchEnemyTurn() {
    if (!CONFIG.pacing.enabled) return;

    const fnName = findExistingFunctionName(CONFIG.enemyTurnFunctionNames);
    if (!fnName) {
      console.warn('[Manpuku World] AIターン関数が見つかりませんでした。CONFIG.enemyTurnFunctionNames を確認してください。');
      return;
    }

    if (window[fnName].__mwPatchedEnemyTurn) return;

    wrapAiActionFunctions();

    const original = window[fnName];

    window[fnName] = async function patchedEnemyTurn(...args) {
      AI_PACING.active = true;
      AI_PACING.queue = Promise.resolve();

      safeAnnounce('ENEMY TURN');

      // original が同期関数でも非同期関数でも対応
      const result = await Promise.resolve(original.apply(this, args));

      // 行動キューの完了待ち
      const queueDone = AI_PACING.queue;
      const timeout = wait(CONFIG.pacing.maxQueueTime);

      await Promise.race([queueDone, timeout]);

      await wait(CONFIG.pacing.afterEnemyTurnDelay);
      AI_PACING.active = false;

      return result;
    };

    window[fnName].__mwPatchedEnemyTurn = true;
    console.log(`[Manpuku World] AIターン関数 ${fnName} に速度演出を追加しました。`);
  }

  /* =========================
   * 5. 初期化
   * ========================= */
  function init() {
    injectPhaseBarStyle();
    injectPhaseBarDom();
    startPhaseBarUpdater();
    patchPhaseAdvance();
    patchEnemyTurn();

    safeAnnounce('演出パッチを適用しました');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* =========================================================
 * Manpuku World 追加追記パッチ v2
 * 目的：
 * 1) フェイズバーを「次フェイズへ進むボタン」のすぐ上へ固定
 * 2) フェイズ表示を現在フェイズと強く同期
 * 3) 手形の無効化を自動発動させず、必ずプレイヤー選択にする
 *
 * 使い方：
 * - 前回の追記パッチのさらに下にそのまま追記
 * - 関数名が異なる場合は CONFIG の候補名だけ合わせる
 * ========================================================= */
(() => {
  'use strict';

  const CONFIG = {
    phaseOrder: ['START', 'DRAW', 'MAIN', 'BATTLE', 'END'],

    // 現在フェイズ取得候補
    phaseStateCandidates: [
      () => window.currentPhase,
      () => window.phase,
      () => window.gameState?.phase,
      () => window.state?.phase,
      () => window.turnState?.phase,
      () => window.game?.phase
    ],

    // フェイズ進行関数候補
    nextPhaseFunctionNames: [
      'nextPhase',
      'advancePhase',
      'goNextPhase',
      'proceedPhase',
      'onNextPhase',
      'endPhase'
    ],

    // 各フェイズへ直接切り替える系の候補があれば拾う
    setPhaseFunctionNames: [
      'setPhase',
      'changePhase',
      'gotoPhase',
      'moveToPhase',
      'enterPhase'
    ],

    // 「次フェイズへ進む」ボタン候補
    nextPhaseButtonSelectors: [
      '#nextPhaseBtn',
      '#phaseNextBtn',
      '#btnNextPhase',
      '#next-phase-btn',
      '.next-phase-btn',
      '.phase-next-btn',
      'button[data-action="next-phase"]',
      'button[onclick*="nextPhase"]',
      'button[onclick*="advancePhase"]'
    ],

    phaseBarId: 'mw-phase-bar-v2',
    phaseBarStyleId: 'mw-phase-style-v2',

    // 手形・無効関連の候補
    counterNegateFunctionNames: [
      'tryAutoCounterNegate',
      'autoCounterNegate',
      'checkCounterNegate',
      'resolveCounterNegate',
      'tryHandShapeNegate',
      'resolveHandShapeNegate',
      'checkHandShapeNegate',
      'reactToNegate',
      'handleNegateReaction'
    ],

    playerChoiceFunctionNames: [
      'showChoiceDialog',
      'showConfirmDialog',
      'showYesNoDialog',
      'openChoiceModal',
      'askPlayerChoice'
    ],

    phasePollMs: 80
  };

  /* =========================
   * 共通
   * ========================= */
  function normalizePhase(value) {
    if (value == null) return '';
    const s = String(value).trim().toUpperCase();
    if (s.includes('START') || s.includes('スタート')) return 'START';
    if (s.includes('DRAW') || s.includes('ドロー')) return 'DRAW';
    if (s.includes('MAIN') || s.includes('メイン')) return 'MAIN';
    if (s.includes('BATTLE') || s.includes('バトル')) return 'BATTLE';
    if (s.includes('END') || s.includes('エンド')) return 'END';
    return '';
  }

  function getCurrentPhase() {
    for (const getter of CONFIG.phaseStateCandidates) {
      try {
        const v = normalizePhase(getter());
        if (v) return v;
      } catch (_) {}
    }

    const textCandidates = [
      document.querySelector('#phase'),
      document.querySelector('.phase'),
      document.querySelector('.phase-label'),
      document.querySelector('.turn-phase'),
      document.querySelector('[data-phase]')
    ];

    for (const el of textCandidates) {
      if (!el) continue;
      const v = normalizePhase(el.dataset?.phase || el.textContent || '');
      if (v) return v;
    }

    return '';
  }

  function findExistingFunctionName(names) {
    for (const name of names) {
      if (typeof window[name] === 'function') return name;
    }
    return null;
  }

  function safeAnnounce(message) {
    if (typeof window.showAnnouncement === 'function') return window.showAnnouncement(message);
    if (typeof window.announce === 'function') return window.announce(message);
    if (typeof window.pushLog === 'function') return window.pushLog(message);
    if (typeof window.addLog === 'function') return window.addLog(message);
    console.log('[Manpuku World]', message);
  }

  /* =========================
   * 1. フェイズバー再構築
   * ========================= */
  function removeOldPhaseBars() {
    const oldIds = ['mw-phase-bar', 'mw-phase-bar-v2'];
    oldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    const oldStyles = ['mw-phase-style', 'mw-phase-style-v2'];
    oldStyles.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function injectPhaseBarStyle() {
    if (document.getElementById(CONFIG.phaseBarStyleId)) return;

    const style = document.createElement('style');
    style.id = CONFIG.phaseBarStyleId;
    style.textContent = `
      #${CONFIG.phaseBarId} {
        position: fixed;
        left: 50%;
        bottom: 92px;
        transform: translateX(-50%);
        z-index: 9999;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 7px 9px;
        border-radius: 14px;
        background: rgba(8, 10, 16, 0.82);
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 6px 20px rgba(0,0,0,0.30);
        backdrop-filter: blur(4px);
        transition: left 0.12s ease, bottom 0.12s ease, opacity 0.12s ease;
      }

      #${CONFIG.phaseBarId}.is-hidden {
        opacity: 0;
      }

      #${CONFIG.phaseBarId} .mw-phase-item {
        min-width: 52px;
        text-align: center;
        font-size: 10px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: rgba(255,255,255,0.42);
        padding: 7px 6px;
        border-radius: 10px;
        transition:
          transform 0.16s ease,
          color 0.16s ease,
          background 0.16s ease,
          box-shadow 0.16s ease,
          opacity 0.16s ease;
        opacity: 0.92;
      }

      #${CONFIG.phaseBarId} .mw-phase-item.is-done {
        color: rgba(255,255,255,0.65);
      }

      #${CONFIG.phaseBarId} .mw-phase-item.is-active {
        color: rgba(255,255,255,1);
        background: rgba(255,255,255,0.12);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.12) inset,
                    0 0 10px rgba(255,255,255,0.10);
        transform: scale(1.16);
      }

      @media (max-width: 520px) {
        #${CONFIG.phaseBarId} {
          gap: 4px;
          padding: 6px 7px;
        }
        #${CONFIG.phaseBarId} .mw-phase-item {
          min-width: 46px;
          font-size: 9px;
          padding: 6px 5px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectPhaseBarDom() {
    if (document.getElementById(CONFIG.phaseBarId)) return;

    const bar = document.createElement('div');
    bar.id = CONFIG.phaseBarId;
    bar.setAttribute('aria-hidden', 'true');

    CONFIG.phaseOrder.forEach(phase => {
      const item = document.createElement('div');
      item.className = 'mw-phase-item';
      item.dataset.phase = phase;
      item.textContent = phase;
      bar.appendChild(item);
    });

    document.body.appendChild(bar);
  }

  function findNextPhaseButton() {
    for (const selector of CONFIG.nextPhaseButtonSelectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }

    // 文言検索の保険
    const buttons = Array.from(document.querySelectorAll('button'));
    const byText = buttons.find(btn => {
      const t = (btn.textContent || '').replace(/\s+/g, '');
      return t.includes('次フェイズ') || t.includes('フェイズ進行') || t.includes('次へ');
    });
    return byText || null;
  }

  function placePhaseBarAboveButton() {
    const bar = document.getElementById(CONFIG.phaseBarId);
    if (!bar) return;

    const btn = findNextPhaseButton();
    if (!btn) {
      bar.style.left = '50%';
      bar.style.bottom = '92px';
      return;
    }

    const rect = btn.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const gap = 10;
    const targetBottom = Math.max(window.innerHeight - rect.top + gap, 70);

    // 画面外にはみ出ないよう軽く補正
    const halfBar = Math.max(barRect.width / 2, 140);
    const minX = halfBar + 8;
    const maxX = window.innerWidth - halfBar - 8;
    const clampedX = Math.min(Math.max(centerX, minX), maxX);

    bar.style.left = `${clampedX}px`;
    bar.style.bottom = `${targetBottom}px`;
  }

  function updatePhaseBar(forcePhase) {
    const bar = document.getElementById(CONFIG.phaseBarId);
    if (!bar) return;

    const current = forcePhase || getCurrentPhase();
    const items = bar.querySelectorAll('.mw-phase-item');

    if (!current) {
      bar.classList.add('is-hidden');
      return;
    }

    bar.classList.remove('is-hidden');

    const currentIndex = CONFIG.phaseOrder.indexOf(current);

    items.forEach((item, index) => {
      item.classList.remove('is-active', 'is-done');
      if (index < currentIndex) item.classList.add('is-done');
      if (CONFIG.phaseOrder[index] === current) item.classList.add('is-active');
    });

    placePhaseBarAboveButton();
  }

  function startPhaseBarUpdater() {
    updatePhaseBar();
    setInterval(() => updatePhaseBar(), CONFIG.phasePollMs);

    window.addEventListener('resize', () => placePhaseBarAboveButton());
    window.addEventListener('scroll', () => placePhaseBarAboveButton(), true);
  }

  /* =========================
   * 2. フェイズ進行関数に強く同期
   * ========================= */
  function wrapPhaseFunction(name) {
    const original = window[name];
    if (typeof original !== 'function') return;
    if (original.__mwPhaseSyncWrapped) return;

    window[name] = function (...args) {
      const result = original.apply(this, args);

      // 進行直後と少し後でも再同期
      setTimeout(() => updatePhaseBar(), 0);
      setTimeout(() => updatePhaseBar(), 30);
      setTimeout(() => updatePhaseBar(), 120);
      setTimeout(() => updatePhaseBar(), 220);

      return result;
    };
    window[name].__mwPhaseSyncWrapped = true;
  }

  function patchPhaseSync() {
    CONFIG.nextPhaseFunctionNames.forEach(name => wrapPhaseFunction(name));
    CONFIG.setPhaseFunctionNames.forEach(name => wrapPhaseFunction(name));

    // 既存左上フェイズ表示が書き換わる場合にも追従
    const watchTargets = [
      document.querySelector('#phase'),
      document.querySelector('.phase'),
      document.querySelector('.phase-label'),
      document.querySelector('.turn-phase')
    ].filter(Boolean);

    watchTargets.forEach(target => {
      const observer = new MutationObserver(() => updatePhaseBar());
      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    });
  }

  /* =========================
   * 3. 手形の自動無効を禁止して選択制へ
   *
   * 方針：
   * - 候補関数をラップし、「自動で無効化」しようとしたら確認を挟む
   * - 確認を拒否した場合は無効化処理を発動しない
   *
   * 注意：
   * - 実際の関数名が別の場合は CONFIG.counterNegateFunctionNames に追加が必要
   * ========================= */
  function chooseWithUi(message) {
    // 既存の選択UIがあれば優先
    for (const fnName of CONFIG.playerChoiceFunctionNames) {
      if (typeof window[fnName] === 'function') {
        try {
          const result = window[fnName](message, ['はい', 'いいえ']);
          if (typeof result === 'boolean') return result;
        } catch (_) {}
      }
    }
    return window.confirm(message);
  }

  function patchCounterNegateSelection() {
    let patchedCount = 0;

    CONFIG.counterNegateFunctionNames.forEach(fnName => {
      const original = window[fnName];
      if (typeof original !== 'function') return;
      if (original.__mwCounterChoiceWrapped) return;

      window[fnName] = function (...args) {
        // 相手の手形がこちらの効果を無効にした後、
        // こちらの手形でさらに無効にし返すかを必ず確認
        const ok = chooseWithUi('こちらの手形で相手の無効効果を無効にしますか？');
        if (!ok) {
          safeAnnounce('手形の無効化は行いませんでした');
          return false;
        }
        return original.apply(this, args);
      };

      window[fnName].__mwCounterChoiceWrapped = true;
      patchedCount++;
    });

    if (!patchedCount) {
      console.warn(
        '[Manpuku World] 手形の自動無効を止める対象関数が見つかりませんでした。CONFIG.counterNegateFunctionNames に実際の関数名を追加してください。'
      );
    }
  }

  /* =========================
   * 4. 初期化
   * ========================= */
  function init() {
    removeOldPhaseBars();
    injectPhaseBarStyle();
    injectPhaseBarDom();
    patchPhaseSync();
    patchCounterNegateSelection();
    startPhaseBarUpdater();

    setTimeout(() => {
      updatePhaseBar();
      placePhaseBarAboveButton();
    }, 0);

    setTimeout(() => {
      updatePhaseBar();
      placePhaseBarAboveButton();
    }, 120);

    safeAnnounce('UI追加修正版を適用しました');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* =========================================================
 * Manpuku World フェイズバー修正版 v3
 * 目的：
 * 1) 左上の現在フェイズ表示と完全同期
 * 2) タイトル画面では非表示、ゲーム開始後のみ表示
 * 3) 次のフェイズボタンのすぐ上に、前回より少し下げて配置
 * ========================================================= */
(() => {
  'use strict';

  const CONFIG = {
    phaseOrder: ['START', 'DRAW', 'MAIN', 'BATTLE', 'END'],
    phaseBarId: 'mw-phase-bar-v3',
    phaseStyleId: 'mw-phase-style-v3',

    // 既存バーを掃除
    oldBarIds: ['mw-phase-bar', 'mw-phase-bar-v2', 'mw-phase-bar-v3'],
    oldStyleIds: ['mw-phase-style', 'mw-phase-style-v2', 'mw-phase-style-v3'],

    // 左上のフェイズ表示候補
    phaseBadgeSelectors: [
      '.phase',
      '#phase',
      '.phase-label',
      '.turn-phase',
      '.phaseBadge',
      '.phase-badge',
      'button.phase',
      'button.phase-badge'
    ],

    // 「次のフェイズ」ボタン候補
    nextPhaseButtonSelectors: [
      '#nextPhaseBtn',
      '#phaseNextBtn',
      '#btnNextPhase',
      '#next-phase-btn',
      '.next-phase-btn',
      '.phase-next-btn',
      'button[data-action="next-phase"]'
    ],

    // ターン終了ボタン候補（位置補助）
    endTurnButtonSelectors: [
      '#endTurnBtn',
      '#btnEndTurn',
      '#turnEndBtn',
      '.end-turn-btn',
      'button[data-action="end-turn"]'
    ],

    pollMs: 80
  };

  function normalizePhase(value) {
    if (value == null) return '';
    const s = String(value).trim().toUpperCase();
    if (s.includes('START') || s.includes('スタート')) return 'START';
    if (s.includes('DRAW') || s.includes('ドロー')) return 'DRAW';
    if (s.includes('MAIN') || s.includes('メイン')) return 'MAIN';
    if (s.includes('BATTLE') || s.includes('バトル')) return 'BATTLE';
    if (s.includes('END') || s.includes('エンド')) return 'END';
    return '';
  }

  function removeOldBars() {
    CONFIG.oldBarIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    CONFIG.oldStyleIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function injectStyle() {
    if (document.getElementById(CONFIG.phaseStyleId)) return;

    const style = document.createElement('style');
    style.id = CONFIG.phaseStyleId;
    style.textContent = `
      #${CONFIG.phaseBarId} {
        position: fixed;
        left: 50%;
        bottom: 108px;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 10px;
        border-radius: 16px;
        background: rgba(14, 15, 24, 0.88);
        border: 1px solid rgba(255,255,255,0.10);
        box-shadow: 0 8px 24px rgba(0,0,0,0.34);
        backdrop-filter: blur(6px);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.18s ease, left 0.12s ease, bottom 0.12s ease;
      }

      #${CONFIG.phaseBarId}.is-visible {
        opacity: 1;
      }

      #${CONFIG.phaseBarId} .mw-phase-item {
        min-width: 52px;
        text-align: center;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: rgba(255,255,255,0.36);
        padding: 7px 6px;
        border-radius: 10px;
        transition:
          transform 0.16s ease,
          color 0.16s ease,
          background 0.16s ease,
          box-shadow 0.16s ease,
          opacity 0.16s ease;
      }

      #${CONFIG.phaseBarId} .mw-phase-item.is-done {
        color: rgba(255,255,255,0.62);
      }

      #${CONFIG.phaseBarId} .mw-phase-item.is-active {
        color: rgba(255,255,255,1);
        background: rgba(255,255,255,0.13);
        box-shadow:
          0 0 0 1px rgba(255,255,255,0.10) inset,
          0 0 10px rgba(255,255,255,0.10);
        transform: scale(1.14);
      }

      @media (max-width: 520px) {
        #${CONFIG.phaseBarId} {
          padding: 7px 8px;
          gap: 3px;
        }
        #${CONFIG.phaseBarId} .mw-phase-item {
          min-width: 48px;
          font-size: 9px;
          padding: 6px 5px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectDom() {
    if (document.getElementById(CONFIG.phaseBarId)) return;

    const bar = document.createElement('div');
    bar.id = CONFIG.phaseBarId;

    CONFIG.phaseOrder.forEach(phase => {
      const item = document.createElement('div');
      item.className = 'mw-phase-item';
      item.dataset.phase = phase;
      item.textContent = phase;
      bar.appendChild(item);
    });

    document.body.appendChild(bar);
  }

  function findFirstVisible(selectors) {
    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        ) {
          return el;
        }
      }
    }
    return null;
  }

  function findPhaseBadge() {
    // まず候補セレクタ
    let badge = findFirstVisible(CONFIG.phaseBadgeSelectors);
    if (badge) return badge;

    // 補助：左上付近のボタン/ラベルから START/DRAW/MAIN/BATTLE/END を探す
    const candidates = Array.from(document.querySelectorAll('button, div, span'));
    badge = candidates.find(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top > 220 || rect.left > 220) return false;
      const text = normalizePhase(el.textContent || '');
      return !!text;
    });

    return badge || null;
  }

  function getPhaseFromBadge() {
    const badge = findPhaseBadge();
    if (!badge) return '';
    return normalizePhase(badge.textContent || badge.dataset?.phase || '');
  }

  function findNextPhaseButton() {
    let btn = findFirstVisible(CONFIG.nextPhaseButtonSelectors);
    if (btn) return btn;

    const buttons = Array.from(document.querySelectorAll('button'));
    btn = buttons.find(btn => {
      const t = (btn.textContent || '').replace(/\s+/g, '');
      return t.includes('次のフェイズ') || t.includes('次フェイズ') || t.includes('フェイズ');
    });

    return btn || null;
  }

  function findEndTurnButton() {
    let btn = findFirstVisible(CONFIG.endTurnButtonSelectors);
    if (btn) return btn;

    const buttons = Array.from(document.querySelectorAll('button'));
    btn = buttons.find(btn => {
      const t = (btn.textContent || '').replace(/\s+/g, '');
      return t.includes('ターン終了') || t.includes('終了');
    });

    return btn || null;
  }

  function isGameStarted() {
    // 「次のフェイズ」ボタンが見えている = ゲーム開始後 とみなす
    const nextBtn = findNextPhaseButton();
    if (!nextBtn) return false;

    // フェイズ表示も取れているとさらに確実
    const phase = getPhaseFromBadge();
    if (!phase) return false;

    return true;
  }

  function placeBar() {
    const bar = document.getElementById(CONFIG.phaseBarId);
    if (!bar) return;

    const nextBtn = findNextPhaseButton();
    const endBtn = findEndTurnButton();

    if (!nextBtn) {
      bar.style.left = '50%';
      bar.style.bottom = '96px';
      return;
    }

    const nextRect = nextBtn.getBoundingClientRect();
    const endRect = endBtn ? endBtn.getBoundingClientRect() : nextRect;

    const centerX = (nextRect.left + endRect.right) / 2;

    // 前回より少し下げる
    // ボタン上端から +4px 程度まで寄せる
    const targetBottom = Math.max(window.innerHeight - nextRect.top + 4, 84);

    bar.style.left = `${centerX}px`;
    bar.style.bottom = `${targetBottom}px`;
  }

  function updateBar() {
    const bar = document.getElementById(CONFIG.phaseBarId);
    if (!bar) return;

    const started = isGameStarted();
    if (!started) {
      bar.classList.remove('is-visible');
      return;
    }

    const currentPhase = getPhaseFromBadge();
    if (!currentPhase) {
      bar.classList.remove('is-visible');
      return;
    }

    const items = bar.querySelectorAll('.mw-phase-item');
    const currentIndex = CONFIG.phaseOrder.indexOf(currentPhase);

    items.forEach((item, index) => {
      item.classList.remove('is-active', 'is-done');

      if (index < currentIndex) item.classList.add('is-done');
      if (CONFIG.phaseOrder[index] === currentPhase) item.classList.add('is-active');
    });

    placeBar();
    bar.classList.add('is-visible');
  }

  function observePhaseBadge() {
    const badge = findPhaseBadge();
    if (!badge || badge.__mwObservedPhaseBadge) return;

    const observer = new MutationObserver(() => {
      updateBar();
    });

    observer.observe(badge, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });

    badge.__mwObservedPhaseBadge = true;
  }

  function startUpdater() {
    updateBar();
    observePhaseBadge();

    setInterval(() => {
      updateBar();
      observePhaseBadge();
    }, CONFIG.pollMs);

    window.addEventListener('resize', updateBar);
    window.addEventListener('scroll', updateBar, true);
  }

  function init() {
    removeOldBars();
    injectStyle();
    injectDom();
    startUpdater();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* =========================================================
 * Manpuku World フェイズバー復旧パッチ（追記専用）
 * 使い方：
 * - script.js の一番下に、そのまま追記するだけ
 * - 既存コードは消さない
 * 目的：
 * 1) これまでの追加バーを強制的に隠す
 * 2) 背景・カード・盤面が見えなくなる副作用を打ち消す
 * 3) 左上フェイズ表示と連動する安全な新バーを出す
 * 4) タイトルでは出さない
 * 5) バーを「次のフェイズ」ボタンのすぐ上に寄せる
 * ========================================================= */
(() => {
  'use strict';

  const CFG = {
    barId: 'mw-recovery-phase-bar',
    styleId: 'mw-recovery-phase-style',
    phaseOrder: ['START', 'DRAW', 'MAIN', 'BATTLE', 'END'],
    pollMs: 120
  };

  function normalizePhase(value) {
    if (value == null) return '';
    const s = String(value).trim().toUpperCase();
    if (s.includes('START') || s.includes('スタート')) return 'START';
    if (s.includes('DRAW') || s.includes('ドロー')) return 'DRAW';
    if (s.includes('MAIN') || s.includes('メイン')) return 'MAIN';
    if (s.includes('BATTLE') || s.includes('バトル')) return 'BATTLE';
    if (s.includes('END') || s.includes('エンド')) return 'END';
    return '';
  }

  function injectStyle() {
    if (document.getElementById(CFG.styleId)) return;

    const style = document.createElement('style');
    style.id = CFG.styleId;
    style.textContent = `
      /* 以前のバーを全部無効化 */
      #mw-phase-bar,
      #mw-phase-bar-v2,
      #mw-phase-bar-v3,
      #mw-safe-phase-bar {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      /* 以前の追記で崩れた場合の最低限の復旧 */
      .card, .hand-card, .field-card, .zone-card, [data-card-id],
      .board, .field, .play-field, .game-board, .game-field,
      canvas, img {
        visibility: visible !important;
        opacity: 1 !important;
      }

      #${CFG.barId} {
        position: fixed;
        left: 50%;
        bottom: 96px;
        transform: translateX(-50%);
        z-index: 3000;
        display: none;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 10px;
        border-radius: 16px;
        background: rgba(14, 15, 24, 0.92);
        border: 1px solid rgba(255,255,255,0.10);
        box-shadow: 0 8px 24px rgba(0,0,0,0.30);
        backdrop-filter: blur(6px);
        pointer-events: none;
      }

      #${CFG.barId}.is-visible {
        display: flex;
      }

      #${CFG.barId} .mw-phase-item {
        min-width: 52px;
        text-align: center;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: rgba(255,255,255,0.36);
        padding: 7px 6px;
        border-radius: 10px;
        transition:
          transform 0.16s ease,
          color 0.16s ease,
          background 0.16s ease,
          box-shadow 0.16s ease;
      }

      #${CFG.barId} .mw-phase-item.is-done {
        color: rgba(255,255,255,0.62);
      }

      #${CFG.barId} .mw-phase-item.is-active {
        color: rgba(255,255,255,1);
        background: rgba(255,255,255,0.13);
        box-shadow:
          0 0 0 1px rgba(255,255,255,0.10) inset,
          0 0 10px rgba(255,255,255,0.10);
        transform: scale(1.14);
      }

      @media (max-width: 520px) {
        #${CFG.barId} {
          padding: 7px 8px;
          gap: 3px;
        }
        #${CFG.barId} .mw-phase-item {
          min-width: 48px;
          font-size: 9px;
          padding: 6px 5px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectDom() {
    if (document.getElementById(CFG.barId)) return;

    const bar = document.createElement('div');
    bar.id = CFG.barId;

    CFG.phaseOrder.forEach(phase => {
      const item = document.createElement('div');
      item.className = 'mw-phase-item';
      item.dataset.phase = phase;
      item.textContent = phase;
      bar.appendChild(item);
    });

    document.body.appendChild(bar);
  }

  function getVisibleElements() {
    return Array.from(document.querySelectorAll('button, div, span')).filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 &&
             rect.height > 0 &&
             style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0';
    });
  }

  function findPhaseBadge() {
    return getVisibleElements().find(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top > 240 || rect.left > 240) return false;
      return !!normalizePhase(el.textContent || '');
    }) || null;
  }

  function getCurrentPhase() {
    const badge = findPhaseBadge();
    return badge ? normalizePhase(badge.textContent || '') : '';
  }

  function findNextPhaseButton() {
    return getVisibleElements().find(el => {
      if (el.tagName !== 'BUTTON') return false;
      const t = (el.textContent || '').replace(/\s+/g, '');
      return t.includes('次のフェイズ') || t.includes('次フェイズ');
    }) || null;
  }

  function findEndTurnButton() {
    return getVisibleElements().find(el => {
      if (el.tagName !== 'BUTTON') return false;
      const t = (el.textContent || '').replace(/\s+/g, '');
      return t.includes('ターン終了');
    }) || null;
  }

  function placeBar() {
    const bar = document.getElementById(CFG.barId);
    if (!bar) return;

    const nextBtn = findNextPhaseButton();
    const endBtn = findEndTurnButton();

    if (!nextBtn) return;

    const nextRect = nextBtn.getBoundingClientRect();
    const endRect = endBtn ? endBtn.getBoundingClientRect() : nextRect;
    const centerX = (nextRect.left + endRect.right) / 2;

    /* ボタンにかなり近づける */
    const bottom = Math.max(window.innerHeight - nextRect.top + 2, 80);

    bar.style.left = `${centerX}px`;
    bar.style.bottom = `${bottom}px`;
  }

  function updateBar() {
    const bar = document.getElementById(CFG.barId);
    if (!bar) return;

    const nextBtn = findNextPhaseButton();
    const currentPhase = getCurrentPhase();

    /* タイトル画面や未開始時は非表示 */
    if (!nextBtn || !currentPhase) {
      bar.classList.remove('is-visible');
      return;
    }

    const currentIndex = CFG.phaseOrder.indexOf(currentPhase);
    const items = bar.querySelectorAll('.mw-phase-item');

    items.forEach((item, index) => {
      item.classList.remove('is-active', 'is-done');
      if (index < currentIndex) item.classList.add('is-done');
      if (CFG.phaseOrder[index] === currentPhase) item.classList.add('is-active');
    });

    placeBar();
    bar.classList.add('is-visible');
  }

  function init() {
    injectStyle();
    injectDom();
    updateBar();

    setInterval(() => {
      updateBar();
    }, CFG.pollMs);

    window.addEventListener('resize', updateBar);
    window.addEventListener('scroll', updateBar, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* =========================================================
  PATCH 27
  - 手形が記憶抹消で無効化された時、手形本体を必ずウイングへ送る
  - ミーコの見参は「発動する効果」ではなく、無効化対象外にする
  - 手形 / 記憶抹消 は「発動した効果」にのみ反応
========================================================= */

/* ---------------- 共通ヘルパ ---------------- */
function mw27FindStageCardByUid(side, uid){
  if(!uid) return null;
  const p = state[side];
  if(!p) return null;
  return p.C.find(c => c && c.uid === uid) || p.E.find(c => c && c.uid === uid) || null;
}

function mw27FindHandgataOnStage(side){
  const p = state[side];
  if(!p) return null;
  return p.C.find(c => c && c.no === 8) || null;
}

function mw27IsMikoKensanLink(link){
  if(!link) return false;
  if(link.noCounter === true) return true;
  if(link.counterable === false) return true;
  if(link.activationKind === "nonActivated") return true;
  if(link.activationType === "nonActivated") return true;
  if(link.reason === "MIKO_DIRECT_GUARD") return true;
  if(link.sourceCard && link.sourceCard.no === 21){
    const txt = `${link.label || ""}\n${link.reason || ""}\n${link.kind || ""}`;
    if(txt.includes("見参") || txt.includes("直接攻撃") || txt.includes("バトル終了") || txt.includes("ミーコ")){
      return true;
    }
  }
  return false;
}

function mw27IsCounterableLink(link){
  if(!link) return false;
  if(mw27IsMikoKensanLink(link)) return false;
  return true;
}

/* ---------------- 記憶抹消成功時の移動先を強化 ---------------- */
const __mw27_processActivatedEffect = processActivatedEffect;
processActivatedEffect = async function(link){
  const result = await __mw27_processActivatedEffect(link);

  if(
    result &&
    result.ok === false &&
    result.detail &&
    result.detail.negatorKind === "MEMORY"
  ){
    const sourceSide = link ? link.activatorSide : null;
    if(!sourceSide) return result;

    let sourceCard = null;

    if(link && link.sourceCard){
      sourceCard = link.sourceCard;
    }else if(link && link.sourceUid){
      sourceCard = mw27FindStageCardByUid(sourceSide, link.sourceUid);
    }

    /* 手形は sourceCard/sourceUid が抜けても盤面から拾って確実に送る */
    if(!sourceCard && link && link.kind === "HANDGATA"){
      sourceCard = mw27FindHandgataOnStage(sourceSide);
    }

    if(sourceCard){
      if(sourceCard.type === "character"){
        await sendCharacterToWing(sourceSide, sourceCard.uid);
        log(`記憶抹消：${sideName(sourceSide)}の「${sourceCard.name}」をウイングへ`);
      }else if(sourceCard.type === "item" || sourceCard.type === "effect"){
        const p = state[sourceSide];
        let moved = false;

        const cIdx = p.C.findIndex(c => c && c.uid === sourceCard.uid);
        if(cIdx >= 0){
          const card = p.C[cIdx];
          p.C[cIdx] = null;
          moveToWing(sourceSide, card);
          moved = true;
        }

        const eIdx = p.E.findIndex(c => c && c.uid === sourceCard.uid);
        if(eIdx >= 0){
          const card = p.E[eIdx];
          p.E[eIdx] = null;
          moveToWing(sourceSide, card);
          moved = true;
        }

        if(moved){
          log(`記憶抹消：${sideName(sourceSide)}の「${sourceCard.name}」をウイングへ`);
        }
      }

      renderAll();
    }
  }

  return result;
};

/* ---------------- 手形 / 記憶抹消の反応対象を限定 ---------------- */
const __mw27_chooseCounterForSide = chooseCounterForSide;
chooseCounterForSide = async function(side, prevLink){
  if(!mw27IsCounterableLink(prevLink)){
    return "PASS";
  }
  return await __mw27_chooseCounterForSide(side, prevLink);
};

const __mw27_runCounterChain = runCounterChain;
runCounterChain = async function(initialLink){
  if(!mw27IsCounterableLink(initialLink)){
    return {
      negated: false,
      negatorKind: null,
      chain: [initialLink],
      active: [true]
    };
  }
  return await __mw27_runCounterChain(initialLink);
};

/* ---------------- ミーコ見参専用の起動効果フラグ付け補助 ----------------
   既存処理側で link を作る時に sourceCard=no.21 だけでも拾えるようにしているが、
   もし見参処理で専用 link を作っている場合は、下の形に合わせれば確実に無効化対象外になる。

   例:
   {
     kind: "MIKO_KENSAN",
     label: "ミーコの見参",
     activatorSide: side,
     sourceCard: mikoCard,
     sourceUid: mikoCard.uid,
     reason: "MIKO_DIRECT_GUARD",
     noCounter: true,
     activationKind: "nonActivated"
   }
---------------------------------------------------------------- */

log("PATCH 27 適用：手形→記憶抹消時のウイング送り / ミーコ見参は無効化対象外");

/* =========================================================
  PATCH 28
  勝利報酬システム
  - YOU WIN 後に裏向き3枚から1枚選択
  - 選んだカードを3枚獲得
  - 獲得カードを表向き1枚 + ×3 で確認
  - デッキプール（LS_COLLECTION）へ反映
========================================================= */

const MW_REWARD_PATCH_VERSION = "REWARD_PATCH_V1";

const rewardState = {
  pending: null,   // { choices:[no,no,no], chosenNo:null, claimed:false }
};

function rewardReadCollection(){
  const col = safeJSONParse(localStorage.getItem(LS_COLLECTION) || "", {});
  for(const no of CARD_NOS){
    const k = pad2(no);
    if(typeof col[k] !== "number") col[k] = 0;
  }
  return col;
}
function rewardWriteCollection(col){
  localStorage.setItem(LS_COLLECTION, JSON.stringify(col));
}
function rewardGrantCardTriplet(no){
  const col = rewardReadCollection();
  const k = pad2(no);
  col[k] = (col[k] || 0) + 3;
  rewardWriteCollection(col);
}
function rewardPick3RandomNos(){
  const pool = CARD_NOS.slice();
  shuffle(pool);
  return pool.slice(0, 3);
}
function rewardReset(){
  rewardState.pending = null;
}
function rewardEnsurePending(){
  if(!rewardState.pending){
    rewardState.pending = {
      choices: rewardPick3RandomNos(),
      chosenNo: null,
      claimed: false,
    };
  }
  return rewardState.pending;
}
function rewardCardThumbStyle(no){
  const url = state.img.cardUrlByNo[pad2(no)] || "";
  return url ? `background-image:url("${url}")` : "";
}
function rewardBackThumbStyle(){
  return state.img.backUrl ? `background-image:url("${state.img.backUrl}")` : "";
}
function rewardCloseChoice(){
  hideModal("choiceM");
  if(el.choiceTitle) el.choiceTitle.textContent = "";
  if(el.choiceBody) el.choiceBody.innerHTML = "";
}
function rewardOpenPickModal(){
  const rw = rewardEnsurePending();
  if(!el.choiceTitle || !el.choiceBody) return;

  el.choiceTitle.textContent = "報酬カード選択";
  el.choiceBody.innerHTML = "";

  const msg = document.createElement("div");
  msg.className = "choiceMsg";
  msg.textContent = "裏向きのカードを1枚選んでください";
  el.choiceBody.appendChild(msg);

  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  row.style.gap = "12px";
  row.style.marginTop = "10px";

  rw.choices.forEach((no, idx)=>{
    const cardBtn = document.createElement("button");
    cardBtn.type = "button";
    cardBtn.style.height = "160px";
    cardBtn.style.borderRadius = "14px";
    cardBtn.style.border = "1px solid rgba(255,255,255,.18)";
    cardBtn.style.background = "rgba(0,0,0,.35)";
    cardBtn.style.backgroundSize = "cover";
    cardBtn.style.backgroundPosition = "center";
    cardBtn.style.boxShadow = "0 4px 16px rgba(0,0,0,.28)";
    const backStyle = rewardBackThumbStyle();
    if(backStyle) cardBtn.setAttribute("style", cardBtn.getAttribute("style") + ";" + backStyle);

    cardBtn.addEventListener("click", async ()=>{
      rw.chosenNo = no;
      rw.claimed = true;
      rewardGrantCardTriplet(no);
      rewardCloseChoice();
      await rewardOpenRevealModal(no);
    }, {passive:true});

    row.appendChild(cardBtn);
  });

  el.choiceBody.appendChild(row);
  showModal("choiceM");
}
async function rewardOpenRevealModal(no){
  const def = getCardDef(no);
  if(!def || !el.choiceTitle || !el.choiceBody) return;

  el.choiceTitle.textContent = "報酬獲得";
  el.choiceBody.innerHTML = "";

  const msg = document.createElement("div");
  msg.className = "choiceMsg";
  msg.textContent = `${def.name} を3枚獲得しました`;
  el.choiceBody.appendChild(msg);

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.justifyContent = "center";
  wrap.style.marginTop = "10px";

  const card = document.createElement("div");
  card.style.width = "120px";
  card.style.height = "168px";
  card.style.borderRadius = "14px";
  card.style.border = "1px solid rgba(255,255,255,.18)";
  card.style.background = "rgba(0,0,0,.35)";
  card.style.backgroundSize = "cover";
  card.style.backgroundPosition = "center";
  const faceStyle = rewardCardThumbStyle(no);
  if(faceStyle) card.setAttribute("style", card.getAttribute("style") + ";" + faceStyle);
  wrap.appendChild(card);

  const x3 = document.createElement("div");
  x3.style.marginTop = "8px";
  x3.style.textAlign = "center";
  x3.style.fontWeight = "800";
  x3.style.fontSize = "18px";
  x3.textContent = "×3";

  el.choiceBody.appendChild(wrap);
  el.choiceBody.appendChild(x3);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "8px";
  btnRow.style.justifyContent = "center";
  btnRow.style.flexWrap = "wrap";
  btnRow.style.marginTop = "14px";

  const mkBtn = (label, onClick)=>{
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.padding = "10px 14px";
    b.style.borderRadius = "10px";
    b.style.border = "1px solid rgba(255,255,255,.18)";
    b.style.background = "rgba(0,0,0,.35)";
    b.style.color = "white";
    b.style.fontWeight = "800";
    b.addEventListener("click", onClick, {passive:true});
    return b;
  };

  btnRow.appendChild(mkBtn("次のゲームへ", ()=>{
    rewardCloseChoice();
    hideModal("resultM");
    rewardReset();
    startGame();
  }));
  btnRow.appendChild(mkBtn("タイトルへ", ()=>{
    rewardCloseChoice();
    hideModal("resultM");
    rewardReset();
    state.started=false;
    state.gameOver=false;
    if(el.game) el.game.classList.remove("active");
    if(el.title) el.title.classList.add("active");
    if(el.boot) el.boot.textContent="JS: OK（準備完了）";
  }));

  el.choiceBody.appendChild(btnRow);
  showModal("choiceM");
}

/* ---------------- Win / Result override ---------------- */
const __mw28_finishGame = finishGame;
finishGame = async function(winnerSide){
  state.gameOver = true;
  renderAll();

  const isWin = (winnerSide === "P1");
  if(isWin){
    rewardEnsurePending();
  }else{
    rewardReset();
  }

  if(el.resultText){
    el.resultText.textContent = isWin ? "YOU WIN！" : "YOU LOSE…";
  }
  if(el.btnNextGame){
    el.btnNextGame.textContent = isWin ? "報酬を見る" : "次のゲームへ";
  }
  showModal("resultM");
};

/* ---------------- bindResult override ---------------- */
bindResult = function(){
  if(el.btnNextGame){
    el.btnNextGame.onclick = null;
    el.btnNextGame.addEventListener("click", ()=>{
      if(rewardState.pending && rewardState.pending.claimed === false){
        hideModal("resultM");
        rewardOpenPickModal();
        return;
      }
      hideModal("resultM");
      rewardReset();
      startGame();
    }, {passive:true});
  }

  if(el.btnBackTitle){
    el.btnBackTitle.onclick = null;
    el.btnBackTitle.addEventListener("click", ()=>{
      rewardCloseChoice();
      hideModal("resultM");
      rewardReset();
      state.started=false;
      state.gameOver=false;
      if(el.game) el.game.classList.remove("active");
      if(el.title) el.title.classList.add("active");
      if(el.boot) el.boot.textContent="JS: OK（準備完了）";
    }, {passive:true});
  }
};

log(`${MW_REWARD_PATCH_VERSION} 読み込み完了`);
/* =========================================================
  PATCH REWARD-02
  勝利報酬を
  「裏面3択 → 選んだ束の中身がランダム3枚（重複なし）」
  に変更
========================================================= */

(function(){
  "use strict";

  const MW_REWARD_DELAY_MS = 650;

  function mwRewardWriteCollection(col){
    localStorage.setItem(LS_COLLECTION, JSON.stringify(col));
  }

  function mwRewardAddCards(nos){
    const col = readCollection();
    for(const no of nos){
      const k = pad2(no);
      col[k] = (col[k] || 0) + 1;
    }
    mwRewardWriteCollection(col);
  }

  function mwRewardSampleDistinct(arr, count){
    const pool = arr.slice();
    shuffle(pool);
    return pool.slice(0, Math.min(count, pool.length));
  }

  function mwRewardBuildThreePacks(){
    const allNos = CARD_NOS.filter(no => !!getCardDef(no));
    const totalNeed = 9;

    // 9枚以上ある前提だが、足りない時も安全に処理
    let picked = mwRewardSampleDistinct(allNos, Math.min(totalNeed, allNos.length));

    // 念のため足りない場合は残りから補充（重複なし優先）
    if(picked.length < totalNeed){
      const rest = allNos.filter(no => !picked.includes(no));
      picked = picked.concat(mwRewardSampleDistinct(rest, totalNeed - picked.length));
    }

    // それでも足りない特殊ケースだけは再利用
    while(picked.length < totalNeed && allNos.length){
      const no = allNos[Math.floor(Math.random() * allNos.length)];
      if(!picked.includes(no) || allNos.length < totalNeed){
        picked.push(no);
      }
    }

    return [
      picked.slice(0, 3),
      picked.slice(3, 6),
      picked.slice(6, 9),
    ];
  }

  function mwRewardHideAllCoreModals(){
    hideModal("resultM");
    hideModal("choiceM");
    hideModal("zoneM");
  }

  function mwRewardBackThumbNode(){
    const th = document.createElement("div");
    th.className = "choiceThumb";
    if(state.img.backUrl){
      th.style.backgroundImage = `url("${state.img.backUrl}")`;
      th.style.backgroundSize = "cover";
      th.style.backgroundPosition = "center";
    }
    return th;
  }

  function mwRewardCardThumbNode(card){
    const th = document.createElement("div");
    th.className = "choiceThumb";
    const url = state.img.cardUrlByNo[pad2(card.no)];
    if(url){
      th.style.backgroundImage = `url("${url}")`;
      th.style.backgroundSize = "cover";
      th.style.backgroundPosition = "center";
    }
    return th;
  }

  function mwRewardGoNextGame(){
    mwRewardHideAllCoreModals();

    state.started = true;
    if(el.title) el.title.classList.remove("active");
    if(el.game) el.game.classList.add("active");

    startGame();
  }

  function mwRewardGoTitle(){
    mwRewardHideAllCoreModals();

    state.started = false;
    state.gameOver = false;

    if(el.game) el.game.classList.remove("active");
    if(el.title) el.title.classList.add("active");
  }

  async function mwRewardRevealPack(packNos){
    const cards = packNos.map(no => makeInstance(getCardDef(no))).filter(Boolean);

    mwRewardAddCards(packNos);

    if(!el.zoneTitle || !el.zoneBody){
      log(`報酬獲得：${cards.map(c=>c.name).join(" / ")}`);
      mwRewardGoNextGame();
      return;
    }

    el.zoneTitle.textContent = "REWARD GET";
    el.zoneBody.innerHTML = "";

    const msg = document.createElement("div");
    msg.className = "choiceMsg";
    msg.style.whiteSpace = "pre-line";
    msg.textContent =
      "報酬カードを獲得しました。\n" +
      "以下の3枚がデッキプールへ追加されます。";
    el.zoneBody.appendChild(msg);

    const list = document.createElement("div");
    list.className = "choiceList";

    for(const card of cards){
      const row = document.createElement("div");
      row.className = "choiceItem";

      const th = mwRewardCardThumbNode(card);

      const meta = document.createElement("div");
      meta.className = "choiceMeta";

      const t = document.createElement("div");
      t.className = "t";
      t.textContent = card.name;

      const s = document.createElement("div");
      s.className = "s";
      s.textContent = `No.${pad2(card.no)} / 1枚獲得`;

      meta.appendChild(t);
      meta.appendChild(s);

      row.appendChild(th);
      row.appendChild(meta);

      bindLongPress(row, ()=> openViewer(card, {side:"P1", zone:"REWARD", pos:null}), 620);

      list.appendChild(row);
    }

    el.zoneBody.appendChild(list);

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "12px";
    btnRow.style.flexWrap = "wrap";

    const mkBtn = (label, onClick)=>{
      const b = document.createElement("button");
      b.textContent = label;
      b.style.padding = "10px 14px";
      b.style.borderRadius = "10px";
      b.style.border = "1px solid rgba(255,255,255,.18)";
      b.style.background = "rgba(0,0,0,.35)";
      b.style.color = "white";
      b.style.fontWeight = "800";
      b.addEventListener("click", onClick, {passive:true});
      return b;
    };

    btnRow.appendChild(mkBtn("次のゲームへ", mwRewardGoNextGame));
    btnRow.appendChild(mkBtn("タイトルへ", mwRewardGoTitle));

    el.zoneBody.appendChild(btnRow);
    showModal("zoneM");

    log(`報酬獲得：${cards.map(c=>c.name).join(" / ")}`);
  }

  async function mwRewardOpenSelect(){
    const packs = mwRewardBuildThreePacks();

    if(!el.choiceTitle || !el.choiceBody){
      // 万一モーダルが無い場合でも最低限進行
      await mwRewardRevealPack(packs[0]);
      return;
    }

    el.choiceTitle.textContent = "REWARD SELECT";
    el.choiceBody.innerHTML = "";

    const msg = document.createElement("div");
    msg.className = "choiceMsg";
    msg.style.whiteSpace = "pre-line";
    msg.textContent =
      "裏向きの報酬を1つ選んでください。\n" +
      "選んだ束から、ランダムな3枚のカードを獲得します。";
    el.choiceBody.appendChild(msg);

    const list = document.createElement("div");
    list.className = "choiceList";

    packs.forEach((pack, idx) => {
      const row = document.createElement("div");
      row.className = "choiceItem";

      const th = mwRewardBackThumbNode();

      const meta = document.createElement("div");
      meta.className = "choiceMeta";

      const t = document.createElement("div");
      t.className = "t";
      t.textContent = `REWARD ${idx + 1}`;

      const s = document.createElement("div");
      s.className = "s";
      s.textContent = "カード3枚入り";

      meta.appendChild(t);
      meta.appendChild(s);

      row.appendChild(th);
      row.appendChild(meta);

      row.addEventListener("click", async ()=>{
        hideModal("choiceM");
        await mwRewardRevealPack(pack);
      }, {passive:true});

      list.appendChild(row);
    });

    el.choiceBody.appendChild(list);
    showModal("choiceM");
  }

  /* ------------------------------
     勝利時フロー上書き
  ------------------------------ */
  const __mwReward_finishGame = finishGame;
  finishGame = async function(winnerSide){
    state.gameOver = true;
    renderAll();

    if(winnerSide !== "P1"){
      const text = "YOU LOSE…";
      if(el.resultText) el.resultText.textContent = text;
      showModal("resultM");
      return;
    }

    // 勝利画面を一度見せてから報酬へ
    if(el.resultText) el.resultText.textContent = "YOU WIN！";
    showModal("resultM");

    await sleep(MW_REWARD_DELAY_MS);
    hideModal("resultM");
    await mwRewardOpenSelect();
  };

  log("PATCH REWARD-02 読み込み完了");
})();
/* =========================================================
  PATCH REWARD-03
  - 報酬をガチャ寄りに変更
  - 裏面3択 → 1つ選ぶ
  - 選んだ束の中身は「レアリティ抽選された3枚」
  - 3枚は同一束内で重複なし
  - 排出率：
      N  62%
      R  25%
      SR 10%
      UR 3%
========================================================= */
(function(){
  "use strict";

  /* ---------------- レアリティ定義 ---------------- */
  const MW_RARITY_BY_NO = {
    1:"UR", 2:"UR", 3:"UR", 4:"SR", 5:"UR", 6:"SR", 7:"SR", 8:"SR", 9:"R", 10:"R",
    11:"N", 12:"N", 13:"N", 14:"UR", 15:"R", 16:"SR", 17:"R", 18:"R", 19:"N", 20:"N",
    21:"UR", 22:"UR", 23:"UR", 24:"SR", 25:"SR", 26:"R", 27:"R", 28:"SR", 29:"UR", 30:"SR"
  };

  const MW_RARITY_RATE = {
    N: 62,
    R: 25,
    SR: 10,
    UR: 3
  };

  function mwRarityOfNo(no){
    return MW_RARITY_BY_NO[Number(no)] || "N";
  }

  function mwPoolByRarity(rarity){
    return CARD_NOS.filter(no => {
      const def = getCardDef(no);
      return !!def && mwRarityOfNo(no) === rarity;
    });
  }

  function mwRollRarity(){
    const r = Math.random() * 100;
    if(r < MW_RARITY_RATE.UR) return "UR";                    // 0 - 2.999...
    if(r < MW_RARITY_RATE.UR + MW_RARITY_RATE.SR) return "SR"; // 3 - 12.999...
    if(r < MW_RARITY_RATE.UR + MW_RARITY_RATE.SR + MW_RARITY_RATE.R) return "R"; // 13 - 37.999...
    return "N";
  }

  function mwSampleOne(arr){
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* 3枚生成：同一束の中では重複なし */
  function mwGenerateDistinctRewardPack(){
    const result = [];
    let guard = 0;

    while(result.length < 3 && guard < 300){
      guard++;

      const rarity = mwRollRarity();
      const pool = mwPoolByRarity(rarity).filter(no => !result.includes(no));

      if(pool.length <= 0){
        // そのレアリティで未取得候補が無いなら全体から補完
        const fallback = CARD_NOS.filter(no => !!getCardDef(no) && !result.includes(no));
        if(fallback.length <= 0) break;
        result.push(mwSampleOne(fallback));
        continue;
      }

      result.push(mwSampleOne(pool));
    }

    return result;
  }

  function mwBuildRewardThreeChoices(){
    return [
      mwGenerateDistinctRewardPack(),
      mwGenerateDistinctRewardPack(),
      mwGenerateDistinctRewardPack()
    ];
  }

  /* ---------------- 所持追加 ---------------- */
  function mwRewardAddPackToCollection(packNos){
    const col = readCollection();
    for(const no of packNos){
      const k = pad2(no);
      col[k] = (col[k] || 0) + 1;
    }
    localStorage.setItem(LS_COLLECTION, JSON.stringify(col));
  }

  /* ---------------- サムネイル ---------------- */
  function mwRewardBackThumb(){
    const th = document.createElement("div");
    th.className = "choiceThumb";
    if(state.img.backUrl){
      th.style.backgroundImage = `url("${state.img.backUrl}")`;
      th.style.backgroundSize = "cover";
      th.style.backgroundPosition = "center";
    }
    return th;
  }

  function mwRewardFaceThumb(no){
    const th = document.createElement("div");
    th.className = "choiceThumb";
    const url = state.img.cardUrlByNo[pad2(no)];
    if(url){
      th.style.backgroundImage = `url("${url}")`;
      th.style.backgroundSize = "cover";
      th.style.backgroundPosition = "center";
    }
    return th;
  }

  function mwRewardRarityLabel(no){
    return mwRarityOfNo(no);
  }

  /* ---------------- 遷移 ---------------- */
  function mwRewardCloseAll(){
    hideModal("resultM");
    hideModal("choiceM");
    hideModal("zoneM");
  }

  function mwRewardToNextGame(){
    mwRewardCloseAll();
    startGame();
  }

  function mwRewardToTitle(){
    mwRewardCloseAll();
    state.started = false;
    state.gameOver = false;
    if(el.game) el.game.classList.remove("active");
    if(el.title) el.title.classList.add("active");
  }

  /* ---------------- 選択後の公開 ---------------- */
  async function mwRewardRevealSelectedPack(packNos){
    mwRewardAddPackToCollection(packNos);

    if(!el.zoneTitle || !el.zoneBody){
      log(`報酬獲得：${packNos.map(no => getCardDef(no)?.name || `No.${pad2(no)}`).join(" / ")}`);
      mwRewardToNextGame();
      return;
    }

    el.zoneTitle.textContent = "REWARD GET";
    el.zoneBody.innerHTML = "";

    const msg = document.createElement("div");
    msg.className = "choiceMsg";
    msg.style.whiteSpace = "pre-line";
    msg.textContent = "報酬カードを獲得しました。\n以下の3枚がデッキプールへ追加されます。";
    el.zoneBody.appendChild(msg);

    const list = document.createElement("div");
    list.className = "choiceList";

    for(const no of packNos){
      const def = getCardDef(no);
      if(!def) continue;

      const row = document.createElement("div");
      row.className = "choiceItem";

      const th = mwRewardFaceThumb(no);

      const meta = document.createElement("div");
      meta.className = "choiceMeta";

      const t = document.createElement("div");
      t.className = "t";
      t.textContent = def.name;

      const s = document.createElement("div");
      s.className = "s";
      s.textContent = `${mwRewardRarityLabel(no)} / No.${pad2(no)} / 1枚獲得`;

      meta.appendChild(t);
      meta.appendChild(s);
      row.appendChild(th);
      row.appendChild(meta);

      bindLongPress(row, ()=> openViewer(makeInstance(def), {side:"P1", zone:"REWARD", pos:null}), 620);

      list.appendChild(row);
    }

    el.zoneBody.appendChild(list);

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.flexWrap = "wrap";
    btnRow.style.marginTop = "12px";

    const mkBtn = (label, onClick)=>{
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.padding = "10px 14px";
      b.style.borderRadius = "10px";
      b.style.border = "1px solid rgba(255,255,255,.18)";
      b.style.background = "rgba(0,0,0,.35)";
      b.style.color = "white";
      b.style.fontWeight = "800";
      b.addEventListener("click", onClick, {passive:true});
      return b;
    };

    btnRow.appendChild(mkBtn("次のゲームへ", mwRewardToNextGame));
    btnRow.appendChild(mkBtn("タイトルへ", mwRewardToTitle));
    el.zoneBody.appendChild(btnRow);

    showModal("zoneM");

    log(`報酬獲得：${packNos.map(no => `${getCardDef(no)?.name || no}[${mwRewardRarityLabel(no)}]`).join(" / ")}`);
  }

  /* ---------------- 裏面3択 ---------------- */
  async function mwRewardOpenThreeChoices(){
    const packs = mwBuildRewardThreeChoices();

    if(!el.choiceTitle || !el.choiceBody){
      await mwRewardRevealSelectedPack(packs[0]);
      return;
    }

    el.choiceTitle.textContent = "REWARD SELECT";
    el.choiceBody.innerHTML = "";

    const msg = document.createElement("div");
    msg.className = "choiceMsg";
    msg.style.whiteSpace = "pre-line";
    msg.textContent = "裏向きの報酬を1つ選んでください。\n選んだ束から、レアリティ抽選された3枚のカードを獲得します。";
    el.choiceBody.appendChild(msg);

    const list = document.createElement("div");
    list.className = "choiceList";

    packs.forEach((pack, idx) => {
      const row = document.createElement("div");
      row.className = "choiceItem";

      const th = mwRewardBackThumb();

      const meta = document.createElement("div");
      meta.className = "choiceMeta";

      const t = document.createElement("div");
      t.className = "t";
      t.textContent = `REWARD ${idx + 1}`;

      const s = document.createElement("div");
      s.className = "s";
      s.textContent = "カード3枚入り";

      meta.appendChild(t);
      meta.appendChild(s);

      row.appendChild(th);
      row.appendChild(meta);

      row.addEventListener("click", async ()=>{
        hideModal("choiceM");
        await mwRewardRevealSelectedPack(pack);
      }, {passive:true});

      list.appendChild(row);
    });

    el.choiceBody.appendChild(list);
    showModal("choiceM");
  }

  /* ---------------- 勝利画面から報酬へ ----------------
     既存の finishGame を上書きし、P1勝利時だけ報酬へ進める
  --------------------------------------------------- */
  const __mw_reward03_finishGame = finishGame;
  finishGame = async function(winnerSide){
    state.gameOver = true;
    renderAll();

    if(winnerSide !== "P1"){
      if(el.resultText) el.resultText.textContent = "YOU LOSE…";
      showModal("resultM");
      return;
    }

    if(el.resultText) el.resultText.textContent = "YOU WIN！";
    showModal("resultM");

    await sleep(650);
    hideModal("resultM");
    await mwRewardOpenThreeChoices();
  };

  log("PATCH REWARD-03 適用：レアリティ排出率つき3枚報酬");
})();
/* =========================================================
  PATCH STARTER + AI SCALING
========================================================= */
(function(){
  "use strict";

  /* ---------------- 初期デッキ ---------------- */
  const LS_FIRST_INIT_DONE = "MW_FIRST_INIT_DONE";

  function mwBuildStarterCollection(){
    const col = {};
    for(const no of CARD_NOS){
      col[pad2(no)] = 0;
    }
    for(let no=1; no<=20; no++){
      col[pad2(no)] = 2;
    }
    return col;
  }

  function mwBuildStarterDeck(){
    const deck = [];
    for(let no=1; no<=20; no++){
      deck.push(no, no);
    }
    return deck;
  }

  function mwInitStarterIfNeeded(){

    const already = localStorage.getItem(LS_FIRST_INIT_DONE);
    if(already === "1") return;

    const existingCol = safeJSONParse(localStorage.getItem(LS_COLLECTION) || "", null);
    if(existingCol && Object.keys(existingCol).length > 0){
      localStorage.setItem(LS_FIRST_INIT_DONE, "1");
      return;
    }

    const col = mwBuildStarterCollection();
    const deck = mwBuildStarterDeck();

    localStorage.setItem(LS_COLLECTION, JSON.stringify(col));
    localStorage.setItem(LS_DECK, JSON.stringify(deck));
    localStorage.setItem(LS_FIRST_INIT_DONE, "1");

    log("初期デッキ配布完了");
  }

  /* ---------------- AIデッキ構築 ---------------- */

  function mwBuildAIDeckFromCollection(){

    const col = readCollection();

    const pool = [];

    for(const no of CARD_NOS){
      const count = col[pad2(no)] || 0;
      for(let i=0; i<count; i++){
        pool.push(no);
      }
    }

    // 安全：カードが少なすぎる場合
    if(pool.length < 40){
      // fallback：1〜20で補完
      for(let no=1; no<=20; no++){
        pool.push(no, no);
      }
    }

    shuffle(pool);

    return pool.slice(0, 40);
  }

  function mwApplyAIDeck(){
    const aiDeck = mwBuildAIDeckFromCollection();

    state.AI.deck = aiDeck.map(no => makeInstance(getCardDef(no)));
    shuffle(state.AI.deck);

    log("AIデッキを所持カードベースで生成");
  }

  /* ---------------- startGameフック ---------------- */

  const __mw_startGame = startGame;
  startGame = function(){

    // 初期デッキ
    mwInitStarterIfNeeded();

    // 通常開始
    __mw_startGame();

    // AIデッキ差し替え
    mwApplyAIDeck();
  };

})();
/* =========================================================
  PATCH ANNOUNCE-02
  - 無効化アナウンス
  - 除去カード発動アナウンス
  - キャラがウイングへ送られる前のアナウンス
  - 装備/ATK変動アナウンス
========================================================= */
(function(){
  "use strict";

  /* ------------------------------
    アナウンスUI
  ------------------------------ */
  function mwEnsureAnnounceUI(){
    if(document.getElementById("mwAnnounceOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "mwAnnounceOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,.62)";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";

    const box = document.createElement("div");
    box.style.width = "min(86vw, 420px)";
    box.style.background = "rgba(10,10,16,.96)";
    box.style.border = "1px solid rgba(255,255,255,.14)";
    box.style.borderRadius = "14px";
    box.style.padding = "18px 16px 14px";
    box.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)";
    box.style.color = "#fff";
    box.style.textAlign = "center";

    const title = document.createElement("div");
    title.id = "mwAnnounceTitle";
    title.style.fontWeight = "900";
    title.style.fontSize = "16px";
    title.style.marginBottom = "10px";
    title.textContent = "アナウンス";

    const body = document.createElement("div");
    body.id = "mwAnnounceBody";
    body.style.whiteSpace = "pre-line";
    body.style.lineHeight = "1.6";
    body.style.fontSize = "14px";
    body.style.marginBottom = "14px";

    const ok = document.createElement("button");
    ok.textContent = "OK";
    ok.style.padding = "10px 18px";
    ok.style.borderRadius = "10px";
    ok.style.border = "1px solid rgba(255,255,255,.18)";
    ok.style.background = "rgba(255,255,255,.08)";
    ok.style.color = "#fff";
    ok.style.fontWeight = "800";

    ok.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      mwHideAnnounce();
    }, {passive:false});

    box.addEventListener("click", (e)=>{
      e.stopPropagation();
    });

    overlay.addEventListener("click", ()=>{
      mwHideAnnounce();
    });

    box.appendChild(title);
    box.appendChild(body);
    box.appendChild(ok);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  let mwAnnounceQueue = [];
  let mwAnnounceBusy = false;

  function mwPushAnnounce(title, text){
    mwEnsureAnnounceUI();
    mwAnnounceQueue.push({title, text});
    mwFlushAnnounceQueue();
  }

  function mwFlushAnnounceQueue(){
    if(mwAnnounceBusy) return;
    const next = mwAnnounceQueue.shift();
    if(!next) return;

    mwAnnounceBusy = true;

    const overlay = document.getElementById("mwAnnounceOverlay");
    const title = document.getElementById("mwAnnounceTitle");
    const body = document.getElementById("mwAnnounceBody");
    if(!overlay || !title || !body){
      mwAnnounceBusy = false;
      return;
    }

    title.textContent = next.title || "アナウンス";
    body.textContent = next.text || "";
    overlay.style.display = "flex";
  }

  function mwHideAnnounce(){
    const overlay = document.getElementById("mwAnnounceOverlay");
    if(overlay) overlay.style.display = "none";
    mwAnnounceBusy = false;
    setTimeout(mwFlushAnnounceQueue, 0);
  }

  function mwCardName(card){
    return card?.name || "不明なカード";
  }

  /* ------------------------------
    1) 無効化アナウンス
  ------------------------------ */
  const __mwAnnounce_processActivatedEffect = processActivatedEffect;
  processActivatedEffect = async function(link){
    const result = await __mwAnnounce_processActivatedEffect(link);

    if(result && result.ok === false && result.detail){
      const src = link?.sourceCard?.name || link?.label || "効果";
      let by = "無効効果";

      if(result.detail.negatorKind === "HANDGATA") by = "手形";
      if(result.detail.negatorKind === "MEMORY") by = "記憶抹消";

      mwPushAnnounce(
        "効果が無効化されました",
        `${src}\nは\n${by}\nによって無効化されました。`
      );
    }

    return result;
  };

  /* ------------------------------
    2) 除去系エフェクト発動アナウンス
       「ウイングに送る」を含む効果を発動した時に表示
  ------------------------------ */
  const __mwAnnounce_activateHandCard = (typeof activateHandCard === "function") ? activateHandCard : null;
  if(__mwAnnounce_activateHandCard){
    activateHandCard = async function(side, handIndex, card, targetZone, targetPos){
      if(card && /ウイングに送る/.test(card.text || "")){
        mwPushAnnounce(
          "除去効果が発動しました",
          `${sideName(side)}が\n${card.name}\nを発動しました。`
        );
      }
      return await __mwAnnounce_activateHandCard(side, handIndex, card, targetZone, targetPos);
    };
  }

  /* ------------------------------
    3) こちら/相手のキャラがウイングへ送られる時のアナウンス
  ------------------------------ */
  const __mwAnnounce_sendCharacterToWing = sendCharacterToWing;
  sendCharacterToWing = async function(side, uid){
    const p = state[side];
    const pos = p.C.findIndex(c=>c && c.uid===uid);
    const card = (pos >= 0) ? p.C[pos] : null;

    if(card){
      mwPushAnnounce(
        "キャラクターが除去されました",
        `${sideName(side)}の\n${card.name}\nはウイングへ送られます。`
      );
    }

    return await __mwAnnounce_sendCharacterToWing(side, uid);
  };

  /* ------------------------------
    4) 装備/ATK変動アナウンス用ヘルパ
  ------------------------------ */
  function mwAnnounceAtkChange(side, card, beforeAtk, afterAtk, reason){
    if(!card) return;
    if(beforeAtk === afterAtk) return;
    mwPushAnnounce(
      "ATKが変化しました",
      `${card.name}\n${reason || ""}\nATK ${beforeAtk} → ${afterAtk}`
    );
  }

  /* ------------------------------
    5) アイテム装備時のアナウンス
       equipToCharacter がある前提で差し込む
  ------------------------------ */
  const __mwAnnounce_equipToCharacter = (typeof equipToCharacter === "function") ? equipToCharacter : null;
  if(__mwAnnounce_equipToCharacter){
    equipToCharacter = async function(side, itemCard, hostCard){
      const beforeAtk = hostCard ? calcCurrentAtk(side, hostCard) : 0;
      const result = await __mwAnnounce_equipToCharacter(side, itemCard, hostCard);
      const afterAtk = hostCard ? calcCurrentAtk(side, hostCard) : 0;

      if(itemCard && hostCard){
        mwPushAnnounce(
          "装備しました",
          `${hostCard.name} に\n${itemCard.name}\nを装備しました。`
        );
        mwAnnounceAtkChange(side, hostCard, beforeAtk, afterAtk, "装備により");
      }

      return result;
    };
  }

  /* ------------------------------
    6) 一部の代表的な一時ATK変動を通知
       activateFieldCardAbility を経由する任意効果向け
  ------------------------------ */
  const __mwAnnounce_activateFieldCardAbility = activateFieldCardAbility;
  activateFieldCardAbility = async function(side, zone, pos, card){
    let beforeMap = new Map();
    for(const c of state[side].C){
      if(c) beforeMap.set(c.uid, calcCurrentAtk(side, c));
    }
    const opp = opponent(side);
    for(const c of state[opp].C){
      if(c) beforeMap.set(c.uid, calcCurrentAtk(opp, c));
    }

    const result = await __mwAnnounce_activateFieldCardAbility(side, zone, pos, card);

    for(const c of state[side].C){
      if(!c) continue;
      const beforeAtk = beforeMap.has(c.uid) ? beforeMap.get(c.uid) : calcCurrentAtk(side, c);
      const afterAtk = calcCurrentAtk(side, c);
      if(beforeAtk !== afterAtk){
        mwAnnounceAtkChange(side, c, beforeAtk, afterAtk, `${mwCardName(card)} の効果で`);
      }
    }
    for(const c of state[opp].C){
      if(!c) continue;
      const beforeAtk = beforeMap.has(c.uid) ? beforeMap.get(c.uid) : calcCurrentAtk(opp, c);
      const afterAtk = calcCurrentAtk(opp, c);
      if(beforeAtk !== afterAtk){
        mwAnnounceAtkChange(opp, c, beforeAtk, afterAtk, `${mwCardName(card)} の効果で`);
      }
    }

    return result;
  };

  log("PATCH ANNOUNCE-02 読み込み完了");
})();
/* =========================================================
  PATCH ANNOUNCE-03（文章修正版）
========================================================= */
(function(){
  "use strict";

  let lastRemoveContext = null;

  function mwPushAnnounce(title, text){
    if(typeof window.mwPushAnnounce === "function"){
      window.mwPushAnnounce(title, text);
    }
  }

  /* ------------------------------
    バトル検知
  ------------------------------ */
  const _battle = battle;
  battle = async function(attackerSide, attackerPos, targetSide, targetPos){

    const atkCard = state[attackerSide].C[attackerPos];
    const defCard = state[targetSide].C[targetPos];

    const result = await _battle(attackerSide, attackerPos, targetSide, targetPos);

    if(atkCard && defCard){
      const atkAtk = calcCurrentAtk(attackerSide, atkCard);
      const defAtk = calcCurrentAtk(targetSide, defCard);

      let loser = null;

      if(atkAtk > defAtk){
        loser = defCard;
      }else if(defAtk > atkAtk){
        loser = atkCard;
      }

      if(loser){
        lastRemoveContext = {
          type: "battle",
          attacker: atkCard,
          defender: defCard,
          loser: loser
        };
      }
    }

    return result;
  };

  /* ------------------------------
    除去効果検知
  ------------------------------ */
  const _activateHandCard = activateHandCard;
  activateHandCard = async function(side, index, card){

    if(card && /ウイングに送る/.test(card.text || "")){
      lastRemoveContext = {
        type: "effect",
        card: card
      };
    }

    return await _activateHandCard(side, index, card);
  };

  /* ------------------------------
    実際にウイングへ送られる瞬間
  ------------------------------ */
  const _send = sendCharacterToWing;
  sendCharacterToWing = async function(side, uid){

    const p = state[side];
    const pos = p.C.findIndex(c=>c && c.uid===uid);
    const target = (pos>=0)? p.C[pos] : null;

    if(target && lastRemoveContext){

      if(lastRemoveContext.type === "battle"){
        const atk = lastRemoveContext.attacker;
        const def = lastRemoveContext.defender;

        mwPushAnnounce(
          "バトル結果",
          `${atk.name} VS ${def.name}\n${target.name}はウイングに送られます。`
        );
      }

      if(lastRemoveContext.type === "effect"){
        const card = lastRemoveContext.card;

        mwPushAnnounce(
          "効果による除去",
          `${card.name}の効果で\n${target.name}はウイングに送られます。`
        );
      }
    }

    lastRemoveContext = null;

    return await _send(side, uid);
  };

  log("PATCH ANNOUNCE-03 適用完了");
})();
/* =========================================================
  PATCH ENTER-OPTIONAL-01
  - 登場時効果を任意化
  - P1側は必ず「発動しますか？」確認
  - 対象：
    No.04 聖ラウス
    No.05 統括AI タータ
    No.11 司令
    No.26 ジュエリー・ルビー
    No.27 ジュエリー・サファイア
    No.28 セシア＆アリサ
========================================================= */
(function(){
  "use strict";

  function mwEnterItemSearchFn(){
    if(typeof searchDeckOrWingByTitleTagItem === "function") return searchDeckOrWingByTitleTagItem;
    if(typeof searchDeckByTitleTagItem === "function") return searchDeckByTitleTagItem;
    return null;
  }

  async function mwEnterProcessOptionalEffect(side, card, resolveFn){
    const act = {
      kind: "ACT",
      label: card.name,
      activatorSide: side,
      sourceCard: card,
      sourceUid: card.uid,
      resolve: resolveFn,
      onNegated: async (r)=>{
        if(r && r.negatorKind === "MEMORY"){
          await sendCharacterToWing(side, card.uid);
        }
        log(`${card.name} の登場時効果は無効`);
        renderAll();
      }
    };
    return await processActivatedEffect(act);
  }

  const __mw_onEnterTriggers_optional_patch = onEnterTriggers;
  onEnterTriggers = async function(side, ctx){
    const { card, pos } = ctx || {};
    if(!card) return;

    /* 既存の封印条件は先に尊重 */
    if(typeof mwIsCardMutedThisTurn === "function" && mwIsCardMutedThisTurn(card)){
      log(`${card.name}：このターン効果を発動できません`, "warn");
      return;
    }
    if(typeof isRachelSealActiveAgainst === "function" && isRachelSealActiveAgainst(side, card)){
      log(`${card.name}：退魔師レイチェルの効果により発動できません`, "warn");
      return;
    }

    /* ---------- No.04 聖ラウス ---------- */
    if(card.no === 4){
      const shouldUse = (side === "AI")
        ? true
        : await askYesNo("効果確認", "聖ラウスの登場時効果を発動しますか？（クランプスをサーチ）");

      if(!shouldUse){
        log("聖ラウス：登場時効果を使用しませんでした");
        return;
      }

      await mwEnterProcessOptionalEffect(side, card, async ()=>{
        await searchFromDeckOrWingByTag(side, "クランプス", 1, { aiAuto: side==="AI" });
      });
      return;
    }

    /* ---------- No.05 統括AI タータ ---------- */
    if(card.no === 5){
      const shouldUse = (side === "AI")
        ? true
        : await askYesNo("効果確認", "統括AI タータの登場時効果を発動しますか？（2ドロー）");

      if(!shouldUse){
        log("統括AI タータ：登場時効果を使用しませんでした");
        return;
      }

      await mwEnterProcessOptionalEffect(side, card, async ()=>{
        draw(side, 2);
        log(`${sideName(side)}：タータ登場 → 2ドロー`);
        renderAll();
      });
      return;
    }

    /* ---------- No.11 司令 ---------- */
    if(card.no === 11){
      const p = state[side];
      const others = p.C.filter(x=>x && x.uid !== card.uid);
      if(!others.length){
        log("司令：他の自分キャラがいないため効果は発動できません", "warn");
        return;
      }

      const shouldUse = (side === "AI")
        ? true
        : await askYesNo("効果確認", "司令の登場時効果を発動しますか？（装備化してATK+500）");

      if(!shouldUse){
        log("司令：登場時効果を使用しませんでした");
        return;
      }

      await mwEnterProcessOptionalEffect(side, card, async ()=>{
        if(side === "AI"){
          if(typeof aiTryShireiEquip === "function"){
            await aiTryShireiEquip("AI", pos);
          }
          return;
        }
        await activateShireiEquip(side, pos, card);
      });
      return;
    }

    /* ---------- No.26 / 27 ルビー・サファイア ---------- */
    if(card.no === 26 || card.no === 27){
      const shouldUse = (side === "AI")
        ? true
        : await askYesNo("効果確認", `${card.name}の登場時効果を発動しますか？`);

      if(!shouldUse){
        log(`${card.name}：登場時効果を使用しませんでした`);
        return;
      }

      await mwEnterProcessOptionalEffect(side, card, async ()=>{
        await resolveRubySapphireEnter(side, card, ctx);
      });
      return;
    }

    /* ---------- No.28 セシア＆アリサ ---------- */
    if(card.no === 28){
      const shouldUse = (side === "AI")
        ? true
        : await askYesNo("効果確認", "セシア＆アリサの登場時効果を発動しますか？（怨霊撲滅屋GBのアイテムをサーチ）");

      if(!shouldUse){
        log("セシア＆アリサ：登場時効果を使用しませんでした");
        return;
      }

      await mwEnterProcessOptionalEffect(side, card, async ()=>{
        const fn = mwEnterItemSearchFn();
        if(!fn){
          log("セシア＆アリサ：アイテムサーチ関数が見つかりません", "warn");
          return;
        }
        await fn(side, "怨霊撲滅屋GB", 1, { aiAuto: side==="AI" });
      });
      return;
    }

    /* それ以外は既存処理へ */
    return await __mw_onEnterTriggers_optional_patch(side, ctx);
  };

  log("PATCH ENTER-OPTIONAL-01 読み込み完了");
})();
/* =========================================================
  PATCH ANNOUNCE-BATTLE-FIX-01
  - バトル時の「〇〇 VS 〇〇」を確実に表示
  - 効果除去時は「〇〇の効果で 〇〇はウイングに送られます」
========================================================= */
(function(){
  "use strict";

  let mwBattleAnnounceContext = null;

  function mwAnnText(title, body){
    if(typeof mwPushAnnounce === "function"){
      mwPushAnnounce(title, body);
      return;
    }
    if(typeof showAnnounce === "function"){
      showAnnounce(`${title}\n${body}`);
      return;
    }
    log(`${title}\n${body}`);
  }

  /* ------------------------------
    resolveBattle に直接フック
  ------------------------------ */
  const __mwBattleFix_resolveBattle = resolveBattle;
  resolveBattle = async function(attacker, defenderUid){
    const atkCard = attacker || null;
    const defCard =
      state.AI.C.find(c => c && c.uid === defenderUid) ||
      state.P1.C.find(c => c && c.uid === defenderUid) ||
      null;

    mwBattleAnnounceContext = null;
    if(atkCard && defCard){
      mwBattleAnnounceContext = {
        type: "battle",
        attackerName: atkCard.name,
        defenderName: defCard.name
      };
    }

    return await __mwBattleFix_resolveBattle(attacker, defenderUid);
  };

  /* ------------------------------
    activateHandCard がある場合だけ効果除去を記録
  ------------------------------ */
  if(typeof activateHandCard === "function"){
    const __mwBattleFix_activateHandCard = activateHandCard;
    activateHandCard = async function(side, handIndex, card, targetZone, targetPos){
      if(card && /ウイングに送る/.test(card.text || "")){
        mwBattleAnnounceContext = {
          type: "effect",
          effectName: card.name
        };
      } else {
        mwBattleAnnounceContext = null;
      }
      return await __mwBattleFix_activateHandCard(side, handIndex, card, targetZone, targetPos);
    };
  }

  /* ------------------------------
    実際にウイングへ送られる瞬間に表示
  ------------------------------ */
  const __mwBattleFix_sendCharacterToWing = sendCharacterToWing;
  sendCharacterToWing = async function(side, uid){
    const p = state[side];
    const pos = p.C.findIndex(c => c && c.uid === uid);
    const target = pos >= 0 ? p.C[pos] : null;

    if(target && mwBattleAnnounceContext){
      if(mwBattleAnnounceContext.type === "battle"){
        mwAnnText(
          "バトル結果",
          `${mwBattleAnnounceContext.attackerName} VS ${mwBattleAnnounceContext.defenderName}\n${target.name}はウイングに送られます。`
        );
      }else if(mwBattleAnnounceContext.type === "effect"){
        mwAnnText(
          "効果による除去",
          `${mwBattleAnnounceContext.effectName}の効果で\n${target.name}はウイングに送られます。`
        );
      }
    }

    mwBattleAnnounceContext = null;
    return await __mwBattleFix_sendCharacterToWing(side, uid);
  };

  log("PATCH ANNOUNCE-BATTLE-FIX-01 読み込み完了");
})();
/* =========================================================
  PATCH BATTLE+ENTER-FIX-01
  - バトル時の「〇〇 VS 〇〇」を確実表示
  - 効果除去時の「〇〇の効果で 〇〇はウイングに送られます。」を維持
  - 登場時に「発動できる」系をP1側で任意化
  対象：
    No.04 聖ラウス
    No.05 統括AI タータ
    No.11 司令
    No.26 ジュエリー・ルビー
    No.27 ジュエリー・サファイア
    No.28 セシア＆アリサ
========================================================= */
(function(){
  "use strict";

  /* ------------------------------
    既存アナウンス関数へ接続
  ------------------------------ */
  function mwAnn(title, body){
    if(typeof mwPushAnnounce === "function"){
      mwPushAnnounce(title, body);
      return;
    }
    if(typeof showAnnounce === "function"){
      showAnnounce(`${title}\n${body}`);
      return;
    }
    log(`${title}\n${body}`);
  }

  let mwRemoveReason = null;

  /* ------------------------------
    1) まず sendCharacterToWing を最終上書き
       - ここで battle / effect の表示を出す
  ------------------------------ */
  const __mw_fix_sendCharacterToWing = sendCharacterToWing;
  sendCharacterToWing = async function(side, uid){
    const p = state[side];
    const pos = p.C.findIndex(c => c && c.uid === uid);
    const target = pos >= 0 ? p.C[pos] : null;

    if(target && mwRemoveReason){
      if(mwRemoveReason.type === "battle"){
        mwAnn(
          "バトル結果",
          `${mwRemoveReason.attackerName} VS ${mwRemoveReason.defenderName}\n${target.name}はウイングに送られます。`
        );
      }else if(mwRemoveReason.type === "effect"){
        mwAnn(
          "効果による除去",
          `${mwRemoveReason.effectName}の効果で\n${target.name}はウイングに送られます。`
        );
      }
    }

    mwRemoveReason = null;
    return await __mw_fix_sendCharacterToWing(side, uid);
  };

  /* ------------------------------
    2) 現在使われている resolveBattle を最終上書き
       - ここで直前の battle 文脈を必ず入れる
  ------------------------------ */
  const __mw_fix_resolveBattle = resolveBattle;
  resolveBattle = async function(attacker, defenderUid){
    const defender =
      state.AI.C.find(c => c && c.uid === defenderUid) ||
      state.P1.C.find(c => c && c.uid === defenderUid) ||
      null;

    if(attacker && defender){
      mwRemoveReason = {
        type: "battle",
        attackerName: attacker.name,
        defenderName: defender.name
      };
    }else{
      mwRemoveReason = null;
    }

    return await __mw_fix_resolveBattle(attacker, defenderUid);
  };

  /* ------------------------------
    3) 効果除去の文脈を残す
       - activateHandCard があればそこに差す
  ------------------------------ */
  if(typeof activateHandCard === "function"){
    const __mw_fix_activateHandCard = activateHandCard;
    activateHandCard = async function(side, handIndex, card, targetZone, targetPos){
      if(card && /ウイングに送る/.test(card.text || "")){
        mwRemoveReason = {
          type: "effect",
          effectName: card.name
        };
      }else{
        mwRemoveReason = null;
      }
      return await __mw_fix_activateHandCard(side, handIndex, card, targetZone, targetPos);
    };
  }

  /* ------------------------------
    4) 力こそパワー！！など、hand経由でない効果除去も拾うため
       発動効果本体の直前に effect 文脈を差す
  ------------------------------ */
  if(typeof resolveEffectCard === "function"){
    const __mw_fix_resolveEffectCard = resolveEffectCard;
    resolveEffectCard = async function(side, eff){
      if(eff && /ウイングに送る/.test(eff.text || "")){
        mwRemoveReason = {
          type: "effect",
          effectName: eff.name
        };
      }else{
        mwRemoveReason = null;
      }
      return await __mw_fix_resolveEffectCard(side, eff);
    };
  }

  /* ------------------------------
    5) 登場時効果を任意化する共通
  ------------------------------ */
  async function mwRunOptionalEnterEffect(side, card, message, resolveFn){
    const shouldUse = (side === "AI")
      ? true
      : await askYesNo("効果確認", message);

    if(!shouldUse){
      log(`${card.name}：登場時効果を使用しませんでした`);
      return;
    }

    const act = {
      kind: "ACT",
      label: card.name,
      activatorSide: side,
      sourceCard: card,
      sourceUid: card.uid,
      resolve: resolveFn,
      onNegated: async (r)=>{
        if(r && r.negatorKind === "MEMORY"){
          await sendCharacterToWing(side, card.uid);
        }
        log(`${card.name} の登場時効果は無効`);
        renderAll();
      }
    };
    await processActivatedEffect(act);
  }

  /* ------------------------------
    6) 最新の onEnterTriggers を最終上書き
  ------------------------------ */
  const __mw_fix_onEnterTriggers = onEnterTriggers;
  onEnterTriggers = async function(side, ctx){
    const { card, pos } = ctx || {};
    if(!card) return;

    if(typeof mwIsCardMutedThisTurn === "function" && mwIsCardMutedThisTurn(card)){
      log(`${card.name}：インフルエンサーまりもによりこのターン効果を発動できない`, "warn");
      return;
    }

    if(isRachelSealActiveAgainst(side, card)){
      log(`${card.name}：退魔師レイチェルの効果により発動できません`, "warn");
      return;
    }

    /* No.04 聖ラウス */
    if(card.no === 4){
      await mwRunOptionalEnterEffect(
        side,
        card,
        "聖ラウスの登場時効果を発動しますか？（クランプスをサーチ）",
        async ()=>{
          if(side === "AI"){
            await searchFromDeckOrWingByTag("AI", "クランプス", 1, { aiAuto:true });
          }else{
            await searchFromDeckOrWingByTag(side, "クランプス", 1);
          }
        }
      );
      return;
    }

    /* No.05 統括AI タータ */
    if(card.no === 5){
      await mwRunOptionalEnterEffect(
        side,
        card,
        "統括AI タータの登場時効果を発動しますか？（2ドロー）",
        async ()=>{
          draw(side, 2);
          log(`${sideName(side)}：タータ登場 → 2ドロー`);
          renderAll();
        }
      );
      return;
    }

    /* No.11 司令 */
    if(card.no === 11){
      const p = state[side];
      const others = p.C.filter(x => x && x.uid !== card.uid);
      if(!others.length){
        log("司令：他の自分キャラがいないため効果は発動できません", "warn");
        return;
      }

      await mwRunOptionalEnterEffect(
        side,
        card,
        "司令の登場時効果を発動しますか？（装備化してATK+500）",
        async ()=>{
          await activateShireiEquip(side, pos, card);
        }
      );
      return;
    }

    /* No.26 / 27 ルビー / サファイア */
    if(card.no === 26 || card.no === 27){
      await mwRunOptionalEnterEffect(
        side,
        card,
        `${card.name}の登場時効果を発動しますか？`,
        async ()=>{
          await resolveRubySapphireEnter(side, card, ctx);
        }
      );
      return;
    }

    /* No.28 セシア＆アリサ */
    if(card.no === 28){
      await mwRunOptionalEnterEffect(
        side,
        card,
        "セシア＆アリサの登場時効果を発動しますか？（怨霊撲滅屋GBのアイテムをサーチ）",
        async ()=>{
          if(typeof searchDeckOrWingByTitleTagItem === "function"){
            await searchDeckOrWingByTitleTagItem(side, "怨霊撲滅屋GB", 1, { aiAuto: side==="AI" });
            return;
          }
          if(typeof searchDeckOrWingByTitleTagItem === "undefined" && typeof searchDeckOrWingByTag === "function"){
            // 保険：titleTag item 専用関数が無ければ既存関数へ逃がす
            await searchDeckOrWingByTag(side, "怨霊撲滅屋GB", 1, { aiAuto: side==="AI" });
          }
        }
      );
      return;
    }

    return await __mw_fix_onEnterTriggers(side, ctx);
  };

  log("PATCH BATTLE+ENTER-FIX-01 読み込み完了");
})();
/* =========================================================
  PATCH BATTLE+OURAN-FIX-02
  - バトル時の「〇〇 VS 〇〇」を確実表示
  - 桜蘭の陰陽術 - 闘 - を processActivatedEffect 経由にし、
    手形 / 記憶抹消 のチェーン対象にする
========================================================= */
(function(){
  "use strict";

  function mwAnnounce(title, body){
    if(typeof mwPushAnnounce === "function"){
      mwPushAnnounce(title, body);
      return;
    }
    if(typeof showAnnounce === "function"){
      showAnnounce(`${title}\n${body}`);
      return;
    }
    log(`${title}\n${body}`);
  }

  /* ------------------------------
    バトルの対戦カード保持
  ------------------------------ */
  let mwBattlePairCtx = null;

  const __mw_fix02_resolveBattle = resolveBattle;
  resolveBattle = async function(attacker, defenderUid){
    const enemySide = "AI";
    const defender = state[enemySide]?.C?.find(c => c && c.uid === defenderUid) || null;

    mwBattlePairCtx = null;
    if(attacker && defender){
      mwBattlePairCtx = {
        attackerUid: attacker.uid,
        defenderUid: defender.uid,
        attackerName: attacker.name,
        defenderName: defender.name
      };
    }

    try{
      return await __mw_fix02_resolveBattle(attacker, defenderUid);
    } finally {
      /* ここでは消さない。
         sendCharacterToWing 側で1回使ってから消す */
      setTimeout(()=>{
        mwBattlePairCtx = null;
      }, 0);
    }
  };

  /* ------------------------------
    効果除去の原因保持
  ------------------------------ */
  let mwEffectRemoveCtx = null;

  if(typeof activateHandCard === "function"){
    const __mw_fix02_activateHandCard = activateHandCard;
    activateHandCard = async function(side, handIndex, card, targetZone, targetPos){
      if(card && /ウイングに送る/.test(card.text || "")){
        mwEffectRemoveCtx = { effectName: card.name };
      }else{
        mwEffectRemoveCtx = null;
      }
      return await __mw_fix02_activateHandCard(side, handIndex, card, targetZone, targetPos);
    };
  }

  if(typeof resolveEffectCard === "function"){
    const __mw_fix02_resolveEffectCard = resolveEffectCard;
    resolveEffectCard = async function(side, eff){
      if(eff && /ウイングに送る/.test(eff.text || "")){
        mwEffectRemoveCtx = { effectName: eff.name };
      }else{
        mwEffectRemoveCtx = null;
      }
      return await __mw_fix02_resolveEffectCard(side, eff);
    };
  }

  /* ------------------------------
    実際にウイングへ送られる瞬間の表示
  ------------------------------ */
  const __mw_fix02_sendCharacterToWing = sendCharacterToWing;
  sendCharacterToWing = async function(side, uid){
    const p = state[side];
    const pos = p.C.findIndex(c => c && c.uid === uid);
    const target = pos >= 0 ? p.C[pos] : null;

    if(target){
      if(
        mwBattlePairCtx &&
        (uid === mwBattlePairCtx.attackerUid || uid === mwBattlePairCtx.defenderUid)
      ){
        mwAnnounce(
          "バトル結果",
          `${mwBattlePairCtx.attackerName} VS ${mwBattlePairCtx.defenderName}\n${target.name}はウイングに送られます。`
        );
      }else if(mwEffectRemoveCtx){
        mwAnnounce(
          "効果による除去",
          `${mwEffectRemoveCtx.effectName}の効果で\n${target.name}はウイングに送られます。`
        );
      }
    }

    const result = await __mw_fix02_sendCharacterToWing(side, uid);

    if(target){
      if(mwBattlePairCtx && (uid === mwBattlePairCtx.attackerUid || uid === mwBattlePairCtx.defenderUid)){
        mwBattlePairCtx = null;
      }
      if(mwEffectRemoveCtx){
        mwEffectRemoveCtx = null;
      }
    }

    return result;
  };

  /* ------------------------------
    桜蘭の陰陽術 - 闘 - を「発動」扱いへ
    → 手形 / 記憶抹消 / 無効アナウンス対象にする
  ------------------------------ */
  const __mw_fix02_tryUseOuranDuringBattle = tryUseOuranDuringBattle;
  tryUseOuranDuringBattle = async function(side, ownBattler, enemyBattler){
    if(!hasOuranInHand(side)) return false;
    if(!ownBattler || !enemyBattler) return false;

    /* P1側 */
    if(side === "P1"){
      const enemySide = state.AI.C.includes(enemyBattler) ? "AI" : "P1";
      const previewMsg =
        "バトル中です。桜蘭の陰陽術 - 闘 - を発動しますか？" +
        (typeof mw32BuildBattlePreview === "function"
          ? mw32BuildBattlePreview(
              enemySide,
              enemyBattler,
              ownBattler,
              [`自分側の選択キャラ ATK +1000`]
            )
          : "");

      const ok = await askYesNo("桜蘭の陰陽術 - 闘 -", previewMsg);
      if(!ok) return false;

      const target = await pickOwnCharacterForOuran(side);
      if(!target) return false;

      const card = takeOuranFromHand(side);
      if(!card) return false;

      /* 発動したのでウイングへ */
      moveToWing(side, card);

      const act = {
        kind: "ACT",
        label: card.name,
        activatorSide: side,
        sourceCard: card,
        sourceUid: card.uid,
        resolve: async ()=>{
          target.tempAtk += 1000;
          log(`桜蘭の陰陽術 - 闘 -：${target.name} ATK+1000（ターン終了まで）`);
          renderAll();
        },
        onNegated: async ()=>{
          log(`桜蘭の陰陽術 - 闘 -：無効にされました`, "warn");
          renderAll();
        }
      };

      const r = await processActivatedEffect(act);
      return !!r?.ok;
    }

    /* AI側 */
    if(side === "AI"){
      const myAtk = calcCurrentAtk(side, ownBattler);
      const enAtk = calcCurrentAtk(opponent(side), enemyBattler);
      if(!(myAtk <= enAtk && myAtk + 1000 > enAtk)) return false;

      const card = takeOuranFromHand(side);
      if(!card) return false;

      moveToWing(side, card);

      const act = {
        kind: "ACT",
        label: card.name,
        activatorSide: side,
        sourceCard: card,
        sourceUid: card.uid,
        resolve: async ()=>{
          ownBattler.tempAtk += 1000;
          log(`AI：桜蘭の陰陽術 - 闘 - → ${ownBattler.name} ATK+1000`);
          renderAll();
        },
        onNegated: async ()=>{
          log(`AI：桜蘭の陰陽術 - 闘 - は無効にされました`, "warn");
          renderAll();
        }
      };

      const r = await processActivatedEffect(act);
      return !!r?.ok;
    }

    return await __mw_fix02_tryUseOuranDuringBattle(side, ownBattler, enemyBattler);
  };

  log("PATCH BATTLE+OURAN-FIX-02 読み込み完了");
})();