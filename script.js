/* =========================================================
  Manpuku World - v50012
  FIX:
  ① 自分/相手デッキ位置に常に裏面表示（未取得時もフォールバック柄で維持）
  ② 小太郎/小次郎 相互見参（コストなし）実装
  ③ BATTLEで各キャラ1回ずつ攻撃可能（まひる装備時2回も維持）
  ④ 両者ウイング：タップで一覧表示
  ⑤ 見参キャラ：空きCをタップで即コスト選択へ（長押し不要）
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

function ensureResultModal(){
  if(document.getElementById("resultM")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div id="resultM" class="modal">
    <div class="back" data-close="result"></div>
    <div class="box smallBox">
      <div class="boxHead">
        <div id="resultTitle" class="boxTitle">RESULT</div>
        <button class="btn small ghost" data-close="result">閉じる</button>
      </div>
      <div class="settings">
        <div id="resultText" class="choiceMsg"></div>
        <div class="setRow" style="margin-top:10px;">
          <button id="btnToTitle" class="btn primary small">タイトルへ</button>
          <button id="btnNextGame" class="btn small">次のゲーム</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

ensureResultModal();

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

const LONG_MS = 620; // 長押し +0.2秒

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
  { no:1,  name:"黒の魔法使いクルエラ", type:"character", rank:5, atk:2500,
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウイングからカード名に「黒魔法」を含むカード1枚を手札に加える。"
    )
  },
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect", rank:0, atk:0,
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ステージに「クルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    )
  },
  { no:3,  name:"トナカイの少女ニコラ", type:"character", rank:5, atk:2000,
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    )
  },
  { no:4,  name:"聖ラウス", type:"character", rank:3, atk:1800,
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    )
  },
  { no:5,  name:"統括AI タータ", type:"character", rank:4, atk:1000,
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    )
  },
  { no:6,  name:"麗し令嬢エフィ", type:"character", rank:5, atk:2000,
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    summon:"kensan",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    )
  },
  { no:7,  name:"狩樹 まひる", type:"character", rank:4, atk:1700,
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃する事ができる。\n" +
      "相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    )
  },
  { no:8,  name:"組織の男 手形", type:"character", rank:4, atk:1900,
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。")
  },
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character", rank:3, atk:1600,
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n" +
      "自分ステージに「小次郎」カードがある時、このカードのATK+500。"
    )
  },
  { no:10, name:"小次郎・孫悟空Lv17", type:"character", rank:3, atk:1500,
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n" +
      "自分ステージに「小太郎」カードがある時、このカードのATK+500。"
    )
  },
  { no:11, name:"司令", type:"character", rank:2, atk:1200,
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"
    )
  },
  { no:12, name:"班目プロデューサー", type:"character", rank:2, atk:800,
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。")
  },
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character", rank:1, atk:100,
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    )
  },
  { no:14, name:"記憶抹消", type:"effect", rank:0, atk:0,
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。")
  },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect", rank:0, atk:0,
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。")
  },
  { no:16, name:"力こそパワー！！", type:"effect", rank:0, atk:0,
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。")
  },
  { no:17, name:"キャトルミューティレーション", type:"effect", rank:0, atk:0,
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。")
  },
  { no:18, name:"a-xブラスター01 -放射型-", type:"item", rank:0, atk:0,
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    )
  },
  { no:19, name:"-聖剣- アロングダイト", type:"item", rank:0, atk:0,
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    )
  },
  { no:20, name:"普通の棒", type:"item", rank:0, atk:0,
    tags:["木の棒","可能性"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\n" +
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    )
  },
];

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push(JSON.parse(JSON.stringify(c)));
    deck.push(JSON.parse(JSON.stringify(c)));
  }
  shuffle(deck);
  return deck;
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

  perTurn: {
    P1:{ cruellaUsed:false, nicolaUsed:false, tartaUsed:false, tegataNegateUsed:false, producerSaved:false, attacks: {}, pairKensanUsed:false },
    AI:{ cruellaUsed:false, nicolaUsed:false, tartaUsed:false, tegataNegateUsed:false, producerSaved:false, attacks: {}, pairKensanUsed:false },
  },

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
function sideName(side){ return (side==="P1") ? "あなた" : "AI"; }

function showModal(id){ const m=$(id); if(m) m.classList.add("show"); }
function hideModal(id){ const m=$(id); if(m) m.classList.remove("show"); }

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

/* ================= Viewer / Choice ================= */
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
  Images
========================================================= */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v8";
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

  if(card){
    slot.appendChild(faceForCard(card, !!opts.enemy));
    bindLongPress(slot, ()=> openViewer(card, opts.extraViewer||""), LONG_MS);
  }
  if(opts.badgeText){
    const b = document.createElement("div");
    b.className = "atkBadge" + (opts.badgePlus ? " plus" : "");
    b.textContent = opts.badgeText;
    b.style.position="absolute";
    b.style.right="6px";
    b.style.bottom="6px";
    b.style.padding="4px 6px";
    b.style.borderRadius="10px";
    b.style.fontSize="11px";
    b.style.fontWeight="1000";
    b.style.border="1px solid rgba(89,242,255,.22)";
    b.style.background = opts.badgePlus ? "rgba(89,242,255,.16)" : "rgba(0,0,0,.35)";
    slot.appendChild(b);
  }
  return slot;
}

/* =========================================================
  Core utilities
========================================================= */
function resetPerTurn(side){
  state.perTurn[side].cruellaUsed = false;
  state.perTurn[side].nicolaUsed = false;
  state.perTurn[side].tartaUsed = false;
  state.perTurn[side].tegataNegateUsed = false;
  state.perTurn[side].producerSaved = false;
  state.perTurn[side].pairKensanUsed = false; // ★②
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
function allChars(side){
  return state[side].C.map((c,idx)=>({c,idx})).filter(x=>!!x.c);
}
function findCardInDeckOrWing(side, predicate){
  const p = state[side];
  const dIdx = p.deck.findIndex(predicate);
  if(dIdx>=0) return {from:"deck", idx:dIdx, card:p.deck[dIdx]};
  const wIdx = p.wing.findIndex(predicate);
  if(wIdx>=0) return {from:"wing", idx:wIdx, card:p.wing[wIdx]};
  return null;
}
function takeFromPile(side, from, idx){
  const p = state[side];
  if(from==="deck") return p.deck.splice(idx,1)[0];
  if(from==="wing") return p.wing.splice(idx,1)[0];
  return null;
}
function listCharactersForChoice(side){
  const cands = [];
  for(let i=0;i<3;i++){
    const c = state[side].C[i];
    if(c){
      cands.push({ label:`C${i+1}：${c.name}`, sub:`現在ATK ${currentAtkOfChar(side,i)}`, value:i, card:c });
    }
  }
  return cands;
}

/* =========================================================
  Wing viewer (タップで表示) ★④
========================================================= */
async function openPileViewer(side){
  const arr = state[side].wing;
  if(!arr.length){
    await askChoice(`${sideName(side)}のウイング`, "（ウイングは空です）", [{label:"閉じる", value:"close"}]);
    return;
  }

  const last = state.lastWingCard[side];
  const headMsg = last ? `直前：${last.name}` : "直前：—";

  const items = arr.slice().reverse().slice(0, 40).map((c,idx)=>({
    label:`${c.name}`, sub:`（ウイング）`, value:`view:${arr.length-1-idx}`, card:c
  }));

  const pick = await askChoice(`${sideName(side)}のウイング`, headMsg + "\n（最新40枚まで表示）", [
    ...items, { label:"閉じる", value:"close" }
  ]);
  if(String(pick).startsWith("view:")){
    const i = Number(String(pick).split(":")[1]);
    const c = arr[i];
    if(c) openViewer(c);
  }
}

/* =========================================================
  Equip helpers
========================================================= */
async function stripEquipsToWingIfAny(side, removedChar){
  if(!removedChar) return;
  const equips = removedChar.equips || [];
  if(!equips.length) return;
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
  Pair Kensan (小太郎/小次郎) ★②
========================================================= */
function hasKotaro(side){ return state[side].C.some(c=>c && c.name.includes("小太郎")); }
function hasKojirou(side){ return state[side].C.some(c=>c && c.name.includes("小次郎")); }

function findPartnerInHand(side){
  const h = state[side].hand;
  const idxKotaro = h.findIndex(c=>c && c.name.includes("小太郎"));
  const idxKojirou = h.findIndex(c=>c && c.name.includes("小次郎"));
  return { idxKotaro, idxKojirou };
}

async function tryPairKensan(side){
  if(state.phase!=="MAIN") return;
  if(state.perTurn[side].pairKensanUsed) return;

  const empty = findEmptyIndex(state[side].C);
  if(empty<0) return;

  const onKotaro = hasKotaro(side);
  const onKojirou = hasKojirou(side);
  if(!onKotaro && !onKojirou) return;

  const { idxKotaro, idxKojirou } = findPartnerInHand(side);

  // 片方が場にいる → 手札に相方がある
  let idx = -1;
  if(onKotaro && idxKojirou>=0) idx = idxKojirou;
  if(onKojirou && idxKotaro>=0) idx = idxKotaro;
  if(idx<0) return;

  const card = state[side].hand[idx];

  if(side==="AI"){
    state[side].hand.splice(idx,1);
    state[side].C[empty] = card;
    state.perTurn[side].pairKensanUsed = true;
    log(`AI：効果で見参 ${card.name}`);
    return;
  }

  const use = await askYesNo("効果：見参", `${card.name} を効果で見参しますか？（コストなし）`);
  if(!use) return;

  state[side].hand.splice(idx,1);
  state[side].C[empty] = card;
  state.perTurn[side].pairKensanUsed = true;
  log(`${sideName(side)}：効果で見参 ${card.name}`);
}

/* =========================================================
  On Enter / Once-per-turn
========================================================= */
async function resolveOnEnter(side, cIdx, card){
  if(!card) return;

  // ★② 相互見参：登場/見参した瞬間にも判定
  await tryPairKensan(side);

  if(card.name==="聖ラウス"){
    if(side==="AI"){
      const found = findCardInDeckOrWing(side, x=>x && x.tags && x.tags.includes("クランプス"));
      if(found){
        const got = takeFromPile(side, found.from, found.idx);
        state[side].hand.push(got);
        log(`AI：サーチ ${got.name}`);
      }
      return;
    }
    const use = await askYesNo("登場時効果", "聖ラウス：タグ「クランプス」をサーチしますか？");
    if(!use) return;
    const found = findCardInDeckOrWing(side, x=>x && x.tags && x.tags.includes("クランプス"));
    if(!found){ log(`${sideName(side)}：サーチ対象なし`, "warn"); return; }
    const got = takeFromPile(side, found.from, found.idx);
    state[side].hand.push(got);
    log(`${sideName(side)}：サーチ ${got.name}`);
    return;
  }

  if(card.name==="統括AI タータ"){
    if(side==="AI"){
      draw(side, 2);
      log("AI：タータで2ドロー");
      return;
    }
    const use = await askYesNo("登場時効果", "統括AI タータ：2枚ドローしますか？");
    if(!use) return;
    draw(side, 2);
    log(`${sideName(side)}：2ドロー`);
    return;
  }

  if(card.name==="司令"){
    // 司令以外の自分キャラがいる時のみ発動可
    const others = state[side].C.some((c,idx)=> c && idx!==cIdx);
    if(!others){
      log(`${sideName(side)}：司令の効果は他の自分キャラがいる時のみ発動できます`, "warn");
      return;
    }

    const eIdx = findEmptyIndex(state[side].E);
    if(eIdx<0){ log(`${sideName(side)}：E枠が空いていないため装備化できません`, "warn"); return; }

    if(side==="AI"){
      // 装備先：現在ATK最大（司令自身以外）
      let bestIdx = -1;
      for(let i=0;i<3;i++){
        if(i===cIdx) continue;
        if(state[side].C[i]){
          if(bestIdx<0 || currentAtkOfChar(side,i) > currentAtkOfChar(side,bestIdx)) bestIdx=i;
        }
      }
      if(bestIdx<0) return;

      const removed = removeCardFromC(side, cIdx);
      state[side].E[eIdx] = removed;

      const tgt = state[side].C[bestIdx];
      if(!tgt) return;
      if(!tgt.equips) tgt.equips = [];
      tgt.equips.push({ cardNo:11, name:"司令", atkBonus:500, eSlot:eIdx });

      log(`AI：司令を装備化（E${eIdx+1}占有）→ ${tgt.name} ATK+500`);
      return;
    }

    const use = await askYesNo("登場時効果", "司令：自身を「装備カード化」してキャラクター1体に装備しますか？");
    if(!use) return;

    const cands = listCharactersForChoice(side).filter(x=>x.value!==cIdx);
    const pick = await askChoice("装備先選択", "装備するキャラクターを選んでください。", cands);
    const targetIdx = Number(pick);

    const removed = removeCardFromC(side, cIdx);
    state[side].E[eIdx] = removed;

    const tgt = state[side].C[targetIdx];
    if(!tgt){ log(`${sideName(side)}：装備先が消失。司令はEに残ります`, "warn"); return; }
    if(!tgt.equips) tgt.equips = [];
    tgt.equips.push({ cardNo:11, name:"司令", atkBonus:500, eSlot:eIdx });

    log(`${sideName(side)}：司令を装備化（E${eIdx+1}占有）→ ${tgt.name} ATK+500`);
    return;
  }
}

async function activateOncePerTurnAbilities(side){
  if(state.activeSide!==side || state.phase!=="MAIN") return;

  // ★② MAIN開始時にも相互見参判定
  await tryPairKensan(side);

  // クルエラ：自分ターン毎に1回
  if(!state.perTurn[side].cruellaUsed){
    const has = state[side].C.some(c=>c && c.name==="黒の魔法使いクルエラ");
    if(has){
      if(side==="AI"){
        const found = findCardInDeckOrWing(side, x=>x && x.name && x.name.includes("黒魔法"));
        if(found){
          const got = takeFromPile(side, found.from, found.idx);
          state[side].hand.push(got);
          state.perTurn[side].cruellaUsed = true;
          log(`AI：クルエラでサーチ ${got.name}`);
        }
      }else{
        const use = await askYesNo("起動効果", "クルエラ：カード名に「黒魔法」を含むカードをサーチしますか？");
        if(use){
          const found = findCardInDeckOrWing(side, x=>x && x.name && x.name.includes("黒魔法"));
          if(!found){ log(`${sideName(side)}：サーチ対象なし`, "warn"); }
          else{
            const got = takeFromPile(side, found.from, found.idx);
            state[side].hand.push(got);
            state.perTurn[side].cruellaUsed = true;
            log(`${sideName(side)}：クルエラでサーチ ${got.name}`);
          }
          renderAll();
        }
      }
    }
  }

  // ニコラ：自分ターンに1回
  if(!state.perTurn[side].nicolaUsed){
    const nIdx = state[side].C.findIndex(c=>c && c.name==="トナカイの少女ニコラ");
    if(nIdx>=0){
      if(side==="AI"){
        state.tempAtkDelta[side][nIdx] += 1000;
        state.perTurn[side].nicolaUsed = true;
        log("AI：ニコラ ATK+1000（ターン終了まで）");
      }else{
        const use = await askYesNo("起動効果", "ニコラ：このターンATK+1000しますか？");
        if(use){
          state.tempAtkDelta[side][nIdx] += 1000;
          state.perTurn[side].nicolaUsed = true;
          log(`${sideName(side)}：ニコラ ATK+1000（ターン終了まで）`);
          renderAll();
        }
      }
    }
  }
}

/* =========================================================
  Items / Effects
========================================================= */
async function resolveItemEquip(side, itemCard, eIdx){
  const cands = listCharactersForChoice(side);
  if(!cands.length){ log("装備先キャラクターがいません", "warn"); return false; }

  const pick = await askChoice("装備先選択", "装備するキャラクターを選んでください。", cands);
  const targetIdx = Number(pick);
  const tgt = state[side].C[targetIdx];
  if(!tgt) return false;

  let bonus = 0;
  let special = null;

  if(itemCard.name==="a-xブラスター01 -放射型-"){
    bonus = 500;
    if(hasTag(tgt,"射手")){ bonus += 500; special="blaster_shooter"; }
  }else if(itemCard.name==="-聖剣- アロングダイト"){
    bonus = 500;
    if(hasTag(tgt,"勇者") || hasTag(tgt,"剣士")){ bonus += 500; special="alongdite_draw"; }
  }else if(itemCard.name==="普通の棒"){
    bonus = 300;
    if(hasTag(tgt,"勇者")){ bonus += 500; special="stick_hero"; }
  }

  if(!tgt.equips) tgt.equips = [];
  tgt.equips.push({ cardNo:itemCard.no, name:itemCard.name, atkBonus:bonus, special, eSlot:eIdx });

  log(`${sideName(side)}：装備 ${itemCard.name}（E${eIdx+1}占有）→ ${tgt.name} ATK+${bonus}`);
  return true;
}

async function resolveEffectFromHand(side, card){
  const opp = (side==="P1") ? "AI" : "P1";

  // 今回は否定/割り込みは省略（既存挙動維持）
  if(card.name==="黒魔法-フレイムバレット"){
    if(!state[side].C.some(c=>c && c.name==="黒の魔法使いクルエラ")){
      log(`${sideName(side)}：クルエラ不在のため発動できません`, "warn");
      sendToWing(side, card, "不発");
      return;
    }

    let mode = "highest";
    if(side==="P1"){
      mode = await askChoice("フレイムバレット", "効果を選んでください。", [
        { label:"ATKが1番高い敵キャラ1体をウイングへ", value:"highest" },
        { label:"rank4以下の敵キャラをすべてウイングへ", value:"rank4" },
        { label:"やめる（不発）", value:"cancel" },
      ]);
      if(mode==="cancel"){ sendToWing(side, card, "不発"); return; }
    }else{
      const enemyCount = state[opp].C.filter(Boolean).length;
      mode = (enemyCount>=2) ? "rank4" : "highest";
    }

    if(mode==="highest"){
      const list = allChars(opp);
      if(list.length){
        let best = list[0];
        for(const it of list){
          if(currentAtkOfChar(opp, it.idx) > currentAtkOfChar(opp, best.idx)) best = it;
        }
        const removed = removeCardFromC(opp, best.idx);
        await stripEquipsToWingIfAny(opp, removed);
        sendToWing(opp, removed, "フレイムバレット");
      }
    }else{
      for(let i=0;i<3;i++){
        const c = state[opp].C[i];
        if(c && (c.rank||0) <= 4){
          const removed = removeCardFromC(opp, i);
          await stripEquipsToWingIfAny(opp, removed);
          sendToWing(opp, removed, "フレイムバレット");
        }
      }
    }

    sendToWing(side, card, "発動後");
    return;
  }

  if(card.name==="力こそパワー！！"){
    if(state.activeSide!==side || state.phase!=="MAIN"){
      sendToWing(side, card, "不発");
      return;
    }
    const list = allChars(opp);
    if(list.length){
      let low = list[0];
      for(const it of list){
        if(currentAtkOfChar(opp, it.idx) < currentAtkOfChar(opp, low.idx)) low = it;
      }
      const removed = removeCardFromC(opp, low.idx);
      await stripEquipsToWingIfAny(opp, removed);
      sendToWing(opp, removed, "力こそパワー");
    }
    sendToWing(side, card, "発動後");
    return;
  }

  sendToWing(side, card, "発動後");
}

/* =========================================================
  Battle (複数攻撃) ★③
========================================================= */
async function openAttackWindow(attackerSide){
  const items = [];
  for(let i=0;i<3;i++){
    const c = state[attackerSide].C[i];
    if(!c) continue;
    const maxAtk = (c.name==="狩樹 まひる" && calcEquipBonusForChar(c)>0) ? 2 : 1;
    const used = state.perTurn[attackerSide].attacks[i] || 0;
    if(used >= maxAtk) continue;
    items.push({ label:`C${i+1}：${c.name}`, sub:`現在ATK ${currentAtkOfChar(attackerSide,i)} / 攻撃 ${used}/${maxAtk}`, value:i, card:c });
  }
  if(!items.length) return null;

  if(attackerSide==="AI"){
    let best = items[0];
    for(const it of items){
      if(currentAtkOfChar("AI", it.value) > currentAtkOfChar("AI", best.value)) best = it;
    }
    return best.value;
  }

  const pick = await askChoice("攻撃キャラ選択", "攻撃するキャラクターを選んでください。（攻撃を続けられます）", [
    ...items,
    { label:"攻撃を終了する", value:"cancel" }
  ]);
  if(pick==="cancel") return null;
  return Number(pick);
}

async function doOneAttack(attackerSide, aIdx){
  const defenderSide = (attackerSide==="P1") ? "AI" : "P1";
  const a = state[attackerSide].C[aIdx];
  if(!a) return;

  const defenderShields = state[defenderSide].shield.filter(Boolean).length;
  const canDirect = (defenderShields===0);
  const mahiruNoDirect = (a.name==="狩樹 まひる" && canDirect);

  let target = null;

  if(attackerSide==="AI"){
    if(defenderShields>0) target = "SHIELD";
    else target = mahiruNoDirect ? "C" : "DIRECT";

    if(target==="C"){
      const list = allChars(defenderSide);
      if(!list.length) return;
      let best = list[0];
      for(const it of list){
        if(currentAtkOfChar(defenderSide, it.idx) > currentAtkOfChar(defenderSide, best.idx)) best = it;
      }
      target = `C:${best.idx}`;
    }
  } else {
    const targets = [];
    for(let i=0;i<3;i++){
      const c = state[defenderSide].C[i];
      if(c) targets.push({ label:`敵C${i+1}：${c.name}`, sub:`現在ATK ${currentAtkOfChar(defenderSide,i)}`, value:`C:${i}`, card:c });
    }
    if(defenderShields>0) targets.push({ label:"相手シールドを攻撃", sub:`残り${defenderShields}`, value:"SHIELD" });
    else {
      if(!mahiruNoDirect) targets.push({ label:"ダイレクトアタック", sub:"勝敗が決まります", value:"DIRECT" });
      else targets.push({ label:"（まひるはシールド0で直接攻撃できない）", sub:"敵キャラを攻撃してください", value:"NONE" });
    }
    const pick = await askChoice("攻撃対象", "攻撃対象を選んでください。", targets);
    if(pick==="NONE") return;
    target = pick;
  }

  if(target==="SHIELD"){
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

  if(target==="DIRECT"){
    endGame(attackerSide, "ダイレクトアタック");
    return;
  }

  if(String(target).startsWith("C:")){
    const dIdx = Number(String(target).split(":")[1]);
    const d = state[defenderSide].C[dIdx];
    if(!d) return;

    const atkA = currentAtkOfChar(attackerSide, aIdx);
    const atkD = currentAtkOfChar(defenderSide, dIdx);

    if(atkA > atkD){
      const removed = removeCardFromC(defenderSide, dIdx);
      await stripEquipsToWingIfAny(defenderSide, removed);
      sendToWing(defenderSide, removed, "バトル敗北");
    }else if(atkA < atkD){
      const aCard = state[attackerSide].C[aIdx];
      if(aCard && aCard.name==="班目プロデューサー" && !state.perTurn[attackerSide].producerSaved){
        state.perTurn[attackerSide].producerSaved = true;
        log(`${sideName(attackerSide)}：班目Pでバトル破壊を無効`);
      }else{
        const removed = removeCardFromC(attackerSide, aIdx);
        await stripEquipsToWingIfAny(attackerSide, removed);
        sendToWing(attackerSide, removed, "バトル敗北");
      }
    }else{
      const removedD = removeCardFromC(defenderSide, dIdx);
      if(removedD){
        await stripEquipsToWingIfAny(defenderSide, removedD);
        sendToWing(defenderSide, removedD, "相打ち");
      }
      const removedA = removeCardFromC(attackerSide, aIdx);
      if(removedA){
        await stripEquipsToWingIfAny(attackerSide, removedA);
        sendToWing(attackerSide, removedA, "相打ち");
      }
    }

    renderAll();
  }
}

function endGame(winnerSide, reason){
  if(state.ended) return;
  state.ended = true;
  const winName = (winnerSide==="P1") ? "あなたの勝ち" : "相手の勝ち";
  if(el.resultTitle) el.resultTitle.textContent = "RESULT";
  if(el.resultText) el.resultText.textContent = `${winName}\n（理由：${reason}）`;
  showModal("resultM");
  log(`ゲーム終了：${winName}（${reason}）`);
  renderAll();
}

/* =========================================================
  P1 Click handlers（見参タップ対応） ★⑤
========================================================= */
async function onTapEmptyCForKensan(pos){
  if(state.ended) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card) || card.summon!=="kensan") return;

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
    await stripEquipsToWingIfAny("P1", moved);
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
  await resolveOnEnter("P1", pos, placed);
  renderAll();
}

async function onClickYourC(pos){
  if(state.ended) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card)){ log("Cにはキャラクターのみ置けます", "warn"); return; }

  // ★⑤ 見参はタップで即コストへ
  if(card.summon==="kensan"){
    await onTapEmptyCForKensan(pos);
    return;
  }

  if(state.normalSummonUsed){ log("登場（通常）はターン1回です", "warn"); return; }

  state.P1.C[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  state.normalSummonUsed=true;

  log(`登場：${card.name}`);
  renderAll();
  await resolveOnEnter("P1", pos, card);
  renderAll();
}

async function onClickYourE(pos){
  if(state.ended) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(isCharacter(card)){ log("Eにはエフェクト/アイテムのみ置けます", "warn"); return; }

  state.P1.E[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  renderAll();

  if(isEffect(card)){
    log(`発動：${card.name}`);
    await resolveEffectFromHand("P1", card);
    state.P1.E[pos]=null;
    renderAll();
    return;
  }

  if(isItem(card)){
    log(`装備：${card.name}`);
    const ok = await resolveItemEquip("P1", card, pos);
    if(!ok){
      state.P1.E[pos]=null;
      sendToWing("P1", card, "装備失敗");
    }
    renderAll();
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
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.E[i];
    el.aiE.appendChild(makeSlot(c, {enemy:true}));
  }

  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    let badgeText = "";
    let badgePlus = false;
    if(c){
      const cur = currentAtkOfChar("AI", i);
      if(cur !== (c.atk||0)){ badgeText = `${cur}`; badgePlus = true; }
    }
    el.aiC.appendChild(makeSlot(c, {enemy:true, badgeText, badgePlus}));
  }

  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);

    let badgeText = "";
    let badgePlus = false;
    let extraViewer = "";

    if(c){
      const cur = currentAtkOfChar("P1", i);
      const base = c.atk||0;
      const equip = calcEquipBonusForChar(c);
      const temp = state.tempAtkDelta.P1[i] || 0;
      if(cur !== base){ badgeText = `${cur}`; badgePlus = true; }
      const eqs = (c.equips||[]).map(e=>`・${e.name} ATK+${e.atkBonus||0}`).join("\n");
      extraViewer =
        `【現在ATK】${cur}\n` +
        `（内訳）base ${base} / 装備+${equip} / 一時+${temp}` +
        (eqs?`\n\n【装備】\n${eqs}`:"");
    }

    const slot = makeSlot(c, {glow, badgeText, badgePlus, extraViewer});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    // 長押しでも見参可能（残す）
    if(!c) bindLongPress(slot, ()=> onTapEmptyCForKensan(i), LONG_MS);
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
    if(exists && state.img.backUrl){
      cardNode.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      cardNode.style.backgroundImage = "";
    }
  });
}

// ★① デッキ裏面：常に見せる（未取得時はフォールバック柄）
function cardBackFallback(){
  return `repeating-linear-gradient(
    45deg,
    rgba(89,242,255,.18) 0px,
    rgba(89,242,255,.18) 4px,
    rgba(179,91,255,.14) 4px,
    rgba(179,91,255,.14) 8px
  )`;
}
function renderPiles(){
  document.querySelectorAll(".pile").forEach((p)=>{
    const key = p.querySelector(".pileCard")?.getAttribute("data-pile");
    const card = p.querySelector(".pileCard");
    if(!card) return;

    const isDeck = (key==="AI_DECK" || key==="P_DECK");
    if(isDeck){
      if(state.img.backUrl){
        card.style.backgroundImage = `url("${state.img.backUrl}")`;
      }else{
        card.style.backgroundImage = cardBackFallback();
      }
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
    await activateOncePerTurnAbilities(state.activeSide);
  }
  if(next==="BATTLE"){
    // ★③ 複数攻撃ループ（P1）
    while(true){
      if(state.ended) break;
      const aIdx = await openAttackWindow(state.activeSide);
      if(aIdx==null) break;
      state.perTurn[state.activeSide].attacks[aIdx] = (state.perTurn[state.activeSide].attacks[aIdx]||0) + 1;
      await doOneAttack(state.activeSide, aIdx);
      renderAll();
    }
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
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

    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    resetPerTurn("P1");
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    log(`TURN ${state.turn} あなたのターン`);
    renderAll();
  }
}

/* =========================================================
  AI Turn（複数攻撃対応）
========================================================= */
function aiPickHandCard(predicate){
  const h = state.AI.hand;
  const idx = h.findIndex(predicate);
  if(idx<0) return null;
  return { idx, card:h[idx] };
}

async function runAITurn(){
  if(state.ended) return;

  state.phase="DRAW";
  draw("AI", 1);
  renderAll();
  await sleep(120);

  state.phase="MAIN";
  renderAll();
  await sleep(120);

  // MAIN開始：相互見参判定
  await activateOncePerTurnAbilities("AI");

  // 登場（通常1回）
  const emptyC = findEmptyIndex(state.AI.C);
  if(emptyC>=0){
    const pick = aiPickHandCard(c=>isCharacter(c) && c.summon!=="kensan");
    if(pick){
      const {idx, card} = pick;
      state.AI.hand.splice(idx,1);
      state.AI.C[emptyC]=card;
      log(`AI：登場 ${card.name}`);
      renderAll();
      await resolveOnEnter("AI", emptyC, card);
      renderAll();
      await sleep(100);
    }
  }

  // 相互見参（再判定）
  await tryPairKensan("AI");
  renderAll();
  await sleep(80);

  // 装備（E枠空き＆キャラがいる）
  const emptyE = findEmptyIndex(state.AI.E);
  if(emptyE>=0 && state.AI.C.some(Boolean)){
    const pickItem = aiPickHandCard(c=>isItem(c));
    if(pickItem){
      const card = state.AI.hand.splice(pickItem.idx,1)[0];
      state.AI.E[emptyE]=card;

      let bestIdx = -1;
      for(let i=0;i<3;i++){
        if(state.AI.C[i]){
          if(bestIdx<0 || currentAtkOfChar("AI",i) > currentAtkOfChar("AI",bestIdx)) bestIdx=i;
        }
      }
      const tgt = state.AI.C[bestIdx];
      let bonus=0;

      if(card.name==="a-xブラスター01 -放射型-"){
        bonus=500; if(hasTag(tgt,"射手")) bonus+=500;
      }else if(card.name==="-聖剣- アロングダイト"){
        bonus=500; if(hasTag(tgt,"勇者")||hasTag(tgt,"剣士")) bonus+=500;
      }else if(card.name==="普通の棒"){
        bonus=300; if(hasTag(tgt,"勇者")) bonus+=500;
      }
      if(!tgt.equips) tgt.equips=[];
      tgt.equips.push({ cardNo:card.no, name:card.name, atkBonus:bonus, eSlot:emptyE });

      log(`AI：装備 ${card.name} → ${tgt.name} ATK+${bonus}`);
      renderAll();
      await sleep(100);
    }
  }

  // 効果（力こそパワー）
  const idxPow = state.AI.hand.findIndex(c=>c && c.name==="力こそパワー！！");
  if(idxPow>=0){
    const card = state.AI.hand.splice(idxPow,1)[0];
    await resolveEffectFromHand("AI", card);
    renderAll();
    await sleep(90);
  }

  // BATTLE：★③ 複数攻撃
  state.phase="BATTLE";
  renderAll();
  await sleep(90);

  while(true){
    if(state.ended) break;
    const aIdx = await openAttackWindow("AI");
    if(aIdx==null) break;
    state.perTurn.AI.attacks[aIdx] = (state.perTurn.AI.attacks[aIdx]||0) + 1;
    await doOneAttack("AI", aIdx);
    renderAll();
    await sleep(80);
  }

  state.phase="END";
  enforceHandLimit("AI");
  renderAll();
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

  if(state.activeSide==="AI"){
    (async ()=>{
      await sleep(120);
      await runAITurn();
      state.activeSide="P1";
      state.turn=2;
      state.phase="START";
      resetPerTurn("P1");
      state.normalSummonUsed=false;
      state.selectedHandIndex=null;
      log(`TURN ${state.turn} あなたのターン`);
      renderAll();
    })();
  }
}

/* =========================================================
  Bindings
========================================================= */
function bindStart(){
  if(el.boot) el.boot.textContent="JS: OK";
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

  if(el.btnToTitle) el.btnToTitle.addEventListener("click", ()=>{
    hideModal("resultM");
    state.started=false;
    state.ended=false;
    el.game.classList.remove("active");
    el.title.classList.add("active");
    log("タイトルへ戻りました");
  }, {passive:true});

  if(el.btnNextGame) el.btnNextGame.addEventListener("click", ()=>{
    hideModal("resultM");
    startGame();
  }, {passive:true});

  // ★④ ウイングは「タップ」で表示（両者）
  document.querySelectorAll(".pile").forEach((p)=>{
    const clickKey = p.getAttribute("data-click");
    if(clickKey==="pWing"){
      p.addEventListener("click", ()=> openPileViewer("P1"), {passive:true});
    }
    if(clickKey==="aiWing"){
      p.addEventListener("click", ()=> openPileViewer("AI"), {passive:true});
    }
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

  if(el.boot) el.boot.textContent="JS: OK（準備完了）";
  log("v50012：デッキ裏面常時表示/小太郎小次郎見参/複数攻撃/ウイングタップ表示/見参タップ化");
}
document.addEventListener("DOMContentLoaded", init);