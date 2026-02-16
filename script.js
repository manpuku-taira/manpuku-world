/* =========================================================
  Manpuku World - v50030
  FIX:
  - AIが見参（コスト支払い）も行うように強化
  - No.08「組織の男 手形」をCharacter化（Cに置ける）
  - ENEMYのレーン見た目を（上：SHIELD→中：E→下：C）で固定
  - シールド0後：DIRECT表示＆「DIRECTしますか？」選択UI
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

/* =========================
   Cards 01-20 (確定版)
   - No.08 を Character として扱う（Cに置ける）
========================= */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", type:"character",
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    summon:"kensan", rank:5, atk:2500,
    text: normalizeText(
`このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。
1ターンに1度発動できる。デッキ・ウイングから「黒魔法」をカード名に含むカード1枚を手札に加える。`
    )
  },
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect",
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    rank:0, atk:0,
    text: normalizeText(
`自分ステージに「クルエラ」がある時、手札から発動できる。
相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。
・相手ステージのATKが1番高いキャラクター1体をウイングに送る。
・相手ステージのrank4以下のキャラクターをすべてウイングに送る。`
    )
  },
  { no:3,  name:"トナカイの少女ニコラ", type:"character",
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    summon:"kensan", rank:5, atk:2000,
    text: normalizeText(
`このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。
自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。`
    )
  },
  { no:4,  name:"聖ラウス", type:"character",
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    rank:3, atk:1500,
    text: normalizeText(
`このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。`
    )
  },
  { no:5,  name:"統括AI タータ", type:"character",
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    rank:4, atk:2000,
    text: normalizeText(
`このカードが登場した時、発動できる。デッキから2枚ドローする。
自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。`
    )
  },
  { no:6,  name:"麗し令嬢エフィ", type:"character",
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    summon:"kensan", rank:5, atk:2000,
    text: normalizeText(
`このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。
自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。`
    )
  },
  { no:7,  name:"狩樹 まひる", type:"character",
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    rank:4, atk:1700,
    text: normalizeText(
`このカードがアイテムを装備している時、1ターンに2回まで攻撃する事ができる。
相手のシールドが0枚の時、このカードは相手に直接攻撃できない。`
    )
  },

  /* ✅ No.08：Character化（Cに置ける） */
  { no:8,  name:"組織の男 手形", type:"character",
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    rank:3, atk:1500,
    text: normalizeText(
`相手ターンに1度発動できる。相手が発動した効果を無効にする。`
    )
  },

  { no:9,  name:"小太郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    rank:4, atk:1800,
    text: normalizeText(
`このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。
自分ステージに「小次郎」カードがある時、このカードのATK+500。`
    )
  },
  { no:10,  name:"小次郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    rank:4, atk:1800,
    text: normalizeText(
`このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。
自分ステージに「小太郎」カードがある時、このカードのATK+500。`
    )
  },
  { no:11, name:"司令", type:"item",
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    rank:0, atk:0,
    text: normalizeText(
`このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。`
    )
  },
  { no:12, name:"班目プロデューサー", type:"character",
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    rank:3, atk:1600,
    text: normalizeText(
`このカードは1ターンに1度、バトルでは破壊されない。`
    )
  },
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character",
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    rank:5, atk:2600,
    text: normalizeText(
`このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。
この効果は相手ターンでも発動できる。`
    )
  },
  { no:14, name:"記憶抹消", type:"effect",
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    rank:0, atk:0,
    text: normalizeText(
`相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。`
    )
  },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect",
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    rank:0, atk:0,
    text: normalizeText(
`自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。`
    )
  },
  { no:16, name:"力こそパワー！！", type:"effect",
    tags:["怪力","脳筋"], titleTag:"SYNAPSE-シナプス-",
    rank:0, atk:0,
    text: normalizeText(
`自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。`
    )
  },
  { no:17, name:"キャトルミューティレーション", type:"effect",
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    rank:0, atk:0,
    text: normalizeText(
`自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。`
    )
  },
  { no:18, name:"a-xブラスター01 -放射型-", type:"item",
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    rank:0, atk:0,
    text: normalizeText(
`自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。
タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。`
    )
  },
  { no:19, name:"-聖剣- アロングダイト", type:"item",
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    rank:0, atk:0,
    text: normalizeText(
`自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。
タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。`
    )
  },
  { no:20, name:"普通の棒", type:"item",
    tags:["木の棒","可能性"], titleTag:"MAGIAGIA-マギアギア-",
    rank:0, atk:0,
    text: normalizeText(
`自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。
タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。`
    )
  },
];

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){ deck.push(cloneCard(c)); deck.push(cloneCard(c)); }
  shuffle(deck);
  return deck;
}
function cloneCard(c){
  return {
    ...c,
    uid: `${c.no}-${Math.random().toString(16).slice(2)}`,
    equipAtk: 0,
    tempAtk: 0,
    tempUntilTurn: null,
    tempUntilPhase: null,
    equippedTo: null,
    battleSaveUsedTurn: null,
    attackedTurn: null,
    attackedCount: 0,
    // ✅ No.08用：相手ターンに1度の無効使用管理
    negatedTurn: null,
  };
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

  selectedAttackerPos:null,

  used: {
    P1: { cruellaSearchTurn:null, tartaTurn:null },
    AI: { cruellaSearchTurn:null, tartaTurn:null },
  },

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(card){ return card && card.type==="character"; }
function isEffect(card){ return card && card.type==="effect"; }
function isItem(card){ return card && card.type==="item"; }
function isEffectOrItem(card){ return card && card.type!=="character"; }
function hasTag(card, tag){ return !!card && Array.isArray(card.tags) && card.tags.includes(tag); }
function nameIncludes(card, s){ return !!card && (card.name||"").includes(s); }

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
function getCurrentAtkCard(card){
  const base = card.atk||0;
  const eq = card.equipAtk||0;
  const tmp = card.tempAtk||0;
  return base + eq + tmp;
}
function findEquippedItemFor(characterCard){
  for(const side of ["P1","AI"]){
    for(let i=0;i<3;i++){
      const e = state[side].E[i];
      if(!e || !isItem(e) || !e.equippedTo) continue;
      const {side:cs, cPos} = e.equippedTo;
      const cc = state[cs].C[cPos];
      if(cc && cc.uid === characterCard.uid) return e;
    }
  }
  return null;
}
function openViewer(card){
  const cur = getCurrentAtkCard(card);
  const base = card.atk||0;
  const eq = card.equipAtk||0;
  const tmp = card.tempAtk||0;

  const eqItem = findEquippedItemFor(card);
  const equipLine = eqItem ? `装備：${eqItem.name}（+${eqItem.equipAtk||0}）` : "装備：なし";

  el.viewerTitle.textContent = card.name;
  el.viewerText.textContent =
`${card.name}
RANK ${card.rank||0}
ATK ${cur}（基礎${base}${eq?` +装備${eq}`:""}${tmp?` +一時${tmp}`:""}）

${equipLine}
タグ：${(card.tags||[]).join("／") || "—"}
タイトルタグ：${card.titleTag || "—"}

${card.text||""}`;
  el.viewerImg.src = state.img.cardUrlByNo[pad2(card.no)] || "";
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
    if(it.card){
      const cur = getCurrentAtkCard(it.card);
      s.textContent = `RANK ${it.card.rank||0} / ATK ${cur}`;
    }else{
      s.textContent = it.sub || "";
    }

    meta.appendChild(t);
    if(s.textContent) meta.appendChild(s);

    row.appendChild(th);
    row.appendChild(meta);

    row.addEventListener("click", ()=>{
      hideModal("choiceM");
      if(choiceResolver){ const r = choiceResolver; choiceResolver=null; r(it.value); }
    }, {passive:true});

    if(it.card) bindLongPress(row, ()=> openViewer(it.card), 380);

    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);
  showModal("choiceM");
  return new Promise((resolve)=>{ choiceResolver = resolve; });
}
async function promptYesNo(side, title, message){
  if(side==="P1"){
    const pick = await askChoice(title, message, [
      {label:"はい", value:"YES"},
      {label:"いいえ", value:"NO"}
    ]);
    return pick==="YES";
  }else{
    await sleep(250);
    return Math.random()<0.7;
  }
}

/* ---------------- Images ---------------- */
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
function makeBadge(text, cls){
  const b = document.createElement("div");
  b.className = `badge ${cls||""}`.trim();
  b.textContent = text;
  return b;
}
function makeSlot(card, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");

  if(card){
    slot.appendChild(faceForCard(card, !!opts.enemy));
    bindLongPress(slot, ()=> openViewer(card));

    const cur = getCurrentAtkCard(card);
    const base = card.atk||0;
    if(cur !== base) slot.classList.add("buff");
    const eqItem = findEquippedItemFor(card);
    if(eqItem) slot.classList.add("equipped");

    const diff = cur - base;
    if(diff !== 0) slot.appendChild(makeBadge(`${diff>0?"+":""}${diff}`, "atk"));
    if(eqItem) slot.appendChild(makeBadge("EQ", "equip"));
  }
  return slot;
}

/* =========================
   Core rules
========================= */
function cleanupTempBuffs(){
  for(const side of ["P1","AI"]){
    for(let i=0;i<3;i++){
      const c = state[side].C[i];
      if(!c) continue;
      if(c.tempUntilTurn !== null && c.tempUntilTurn < state.turn){
        c.tempAtk = 0; c.tempUntilTurn = null; c.tempUntilPhase = null;
      }
    }
  }
}
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
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限→ウイング ${c.name}`);
  }
}

function applyEquipBonus(itemCard, charCard){
  if(itemCard.no===11){
    itemCard.equipAtk = 500;
    charCard.equipAtk += 500;
    return;
  }
  if(itemCard.no===18){
    let add = 500;
    if(hasTag(charCard,"射手")) add += 500;
    itemCard.equipAtk = add;
    charCard.equipAtk += add;
    return;
  }
  if(itemCard.no===19){
    let add = 500;
    if(hasTag(charCard,"勇者") || hasTag(charCard,"剣士")) add += 500;
    itemCard.equipAtk = add;
    charCard.equipAtk += add;
    return;
  }
  if(itemCard.no===20){
    let add = 300;
    if(hasTag(charCard,"勇者")) add += 500;
    itemCard.equipAtk = add;
    charCard.equipAtk += add;
    return;
  }
  itemCard.equipAtk = 0;
}

function detachEquipIfNeeded(side, cPos){
  for(let i=0;i<3;i++){
    const e = state[side].E[i];
    if(!e || !isItem(e) || !e.equippedTo) continue;
    if(e.equippedTo.cPos !== cPos) continue;
    state[side].E[i] = null;
    e.equippedTo = null;
    state[side].wing.push(e);
    log(`${side==="P1"?"あなた":"AI"}：装備解除→ウイング ${e.name}`);
  }
}

async function handleOnSummonAbility(side, card){
  if(card.no===4){
    const use = await promptYesNo(side, "聖ラウス", "登場時効果：クランプスをサーチしますか？");
    if(use) await effectSearchByTag(side, "クランプス");
  }
  if(card.no===5){
    const use = await promptYesNo(side, "統括AI タータ", "登場時効果：2枚ドローしますか？");
    if(use){ draw(side,2); log(`${side==="P1"?"あなた":"AI"}：タータ効果 ドロー+2`); }
  }
}
async function effectSearchByTag(side, tag){
  const p = state[side];
  const candidates = [];
  for(const c of p.deck) if(hasTag(c, tag)) candidates.push({from:"deck", card:c});
  for(const c of p.wing) if(hasTag(c, tag)) candidates.push({from:"wing", card:c});
  if(!candidates.length){ log(`${side==="P1"?"あなた":"AI"}：サーチ失敗（${tag}なし）`, "warn"); return; }

  let picked = candidates[0];
  if(side==="P1" && candidates.length>1){
    const pick = await askChoice("サーチ", `タグ「${tag}」のカードを選んで手札に加えます。`, candidates.map((x,idx)=>({
      label:`${x.card.name}（${x.from}）`, value:String(idx), card:x.card
    })));
    picked = candidates[Number(pick)];
  }

  if(picked.from==="deck"){
    const idx = p.deck.findIndex(c=>c.uid===picked.card.uid);
    if(idx>=0) p.deck.splice(idx,1);
  }else{
    const idx = p.wing.findIndex(c=>c.uid===picked.card.uid);
    if(idx>=0) p.wing.splice(idx,1);
  }
  p.hand.push(picked.card);
  log(`${side==="P1"?"あなた":"AI"}：サーチ→手札 ${picked.card.name}`);
}

/* =========================
   No.08（手形）  相手ターンに1度：無効（Characterの起動効果として処理）
========================= */
function findTegataOnStage(side){
  for(let i=0;i<3;i++){
    const c = state[side].C[i];
    if(c && c.no===8) return {pos:i, card:c};
  }
  return null;
}
async function maybeNegateByTegata(negaterSide){
  const f = findTegataOnStage(negaterSide);
  if(!f) return false;
  const te = f.card;
  if(te.negatedTurn === state.turn) return false; // 1ターン1回
  const ok = await promptYesNo(negaterSide, "組織の男 手形", "効果を無効にしますか？（相手ターンに1度）");
  if(!ok) return false;
  te.negatedTurn = state.turn;
  log(`${negaterSide==="P1"?"あなた":"AI"}：手形 → 効果を無効`, negaterSide==="P1"?"muted":"warn");
  return true;
}

/* =========================
   Battle / DIRECT
========================= */
async function sendCharacterToWing(side, cPos, reason=""){
  const p = state[side];
  const c = p.C[cPos];
  if(!c) return;
  detachEquipIfNeeded(side, cPos);
  p.C[cPos] = null;
  p.wing.push(c);
  if(reason) log(`${side==="P1"?"あなた":"AI"}：${c.name} → ウイング（${reason}）`);
}

function canAttackTimes(side, cPos){
  const c = state[side].C[cPos];
  if(!c) return 0;
  const eq = findEquippedItemFor(c);
  if(c.no===7 && eq) return 2;
  return 1;
}
function getAttackedCountThisTurn(card){
  if(card.attackedTurn !== state.turn) return 0;
  return card.attackedCount || 0;
}
function addAttackCount(card){
  if(card.attackedTurn !== state.turn){
    card.attackedTurn = state.turn;
    card.attackedCount = 0;
  }
  card.attackedCount += 1;
}

async function battle(side, atkPos, target){
  const enemy = (side==="P1")?"AI":"P1";
  const attacker = state[side].C[atkPos];
  if(!attacker) return;

  const maxAtk = canAttackTimes(side, atkPos);
  const used = getAttackedCountThisTurn(attacker);
  if(used >= maxAtk){
    log("このキャラは今ターンこれ以上攻撃できません", "warn");
    return;
  }

  if(target.type==="DIRECT"){
    // No.07 まひる：DIRECT不可
    if(attacker.no===7){
      log("狩樹まひる：相手シールド0の時、直接攻撃できません", "warn");
      return;
    }
    addAttackCount(attacker);
    log(`${side==="P1"?"あなた":"AI"}：ダイレクトアタック！`);
    return;
  }

  if(target.type==="SHIELD"){
    const alive = state[enemy].shield.filter(x=>!!x).length;
    if(alive===0){
      log("相手シールドが0です。DIRECTを選択してください。", "warn");
      return;
    }
    const sh = state[enemy].shield[target.idx];
    if(!sh){ log("そのシールドは既にありません", "warn"); return; }
    state[enemy].shield[target.idx] = null;
    state[enemy].wing.push(sh);
    addAttackCount(attacker);
    log(`${side==="P1"?"あなた":"AI"}：シールド破壊 → 相手ウイング`);
    return;
  }

  if(target.type==="C"){
    const defender = state[enemy].C[target.pos];
    if(!defender){ log("相手キャラがいません", "warn"); return; }

    const aAtk = getCurrentAtkCard(attacker);
    const dAtk = getCurrentAtkCard(defender);

    const save12 = (defender.no===12 && defender.battleSaveUsedTurn !== state.turn);
    addAttackCount(attacker);

    if(aAtk > dAtk){
      await sendCharacterToWing(enemy, target.pos, "バトル敗北");
      log(`${side==="P1"?"あなた":"AI"}：バトル勝利`);
    }else if(aAtk < dAtk){
      if(save12){
        defender.battleSaveUsedTurn = state.turn;
        log(`班目プロデューサー：バトル破壊を1回防いだ`);
      }else{
        await sendCharacterToWing(side, atkPos, "バトル敗北");
      }
      log(`${side==="P1"?"あなた":"AI"}：バトル敗北`, "warn");
    }else{
      if(save12){
        defender.battleSaveUsedTurn = state.turn;
        await sendCharacterToWing(side, atkPos, "相打ち");
        log(`同値：相手は班目で耐えた／自分のみウイング`, "warn");
      }else{
        await sendCharacterToWing(enemy, target.pos, "相打ち");
        await sendCharacterToWing(side, atkPos, "相打ち");
        log("相打ち：両者ウイング");
      }
    }
  }
}

/* =========================
   Player interactions
========================= */
function findStageCharPositions(side){
  const out=[];
  for(let i=0;i<3;i++) if(state[side].C[i]) out.push(i);
  return out;
}

async function onLongPressEmptyCForKensan(pos){
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
    const moved = state.P1.C[idx];
    state.P1.C[idx]=null;
    state.P1.wing.push(moved);
    detachEquipIfNeeded("P1", idx);
  }

  const placed = state.P1.hand.splice(state.selectedHandIndex,1)[0];
  state.P1.C[pos]=placed;
  state.selectedHandIndex=null;

  log(`見参：${placed.name}`);
  await handleOnSummonAbility("P1", placed);
  renderAll();
}

function onClickYourC(pos){
  if(state.activeSide==="P1" && state.phase==="MAIN"){
    if(state.selectedHandIndex!=null && !state.P1.C[pos]){
      const card = state.P1.hand[state.selectedHandIndex];
      if(isCharacter(card)){
        if(card.summon==="kensan"){
          log("このカードは登場できません。空きCを長押しして見参してください", "warn");
          return;
        }
        if(state.normalSummonUsed){ log("登場（通常）はターン1回です", "warn"); return; }
        state.P1.C[pos]=card;
        state.P1.hand.splice(state.selectedHandIndex,1);
        state.selectedHandIndex=null;
        state.normalSummonUsed=true;
        log(`登場：${card.name}`);
        handleOnSummonAbility("P1", card).then(()=> renderAll());
        renderAll();
        return;
      }else{
        log("Cにはキャラクターのみ置けます", "warn");
        return;
      }
    }
  }

  if(state.activeSide==="P1" && state.phase==="BATTLE"){
    if(!state.P1.C[pos]) return;
    state.selectedAttackerPos = pos;
    log(`攻撃者：C${pos+1} ${state.P1.C[pos].name}`);
    renderAll();
  }
}

async function equipFromE(side, ePos){
  const item = state[side].E[ePos];
  if(!item || !isItem(item)) return;

  const cpos = findStageCharPositions(side);
  if(!cpos.length){
    log("装備：装備するキャラがいません（アイテムはEに残ります）", "warn");
    return;
  }
  let pickPos = cpos[0];
  if(side==="P1" && cpos.length>1){
    const pick = await askChoice("装備先選択", "装備するキャラクターを選択してください。", cpos.map(p=>({
      label:`C${p+1}：${state[side].C[p].name}`, value:String(p), card:state[side].C[p]
    })));
    pickPos = Number(pick);
  }
  const charCard = state[side].C[pickPos];
  if(!charCard){ log("装備：キャラがいません", "warn"); return; }

  if(item.equippedTo){
    const old = item.equippedTo;
    const oldChar = state[old.side].C[old.cPos];
    if(oldChar) oldChar.equipAtk -= (item.equipAtk||0);
  }
  item.equippedTo = {side, cPos: pickPos};
  item.equipAtk = 0;
  applyEquipBonus(item, charCard);
  log(`装備：${item.name} → ${charCard.name}`);
}

async function playEffectFromE(side, ePos){
  const card = state[side].E[ePos];
  if(!card || !isEffect(card)) return;

  // ✅ 手形（No.08）で無効できる（相手ターンに1度）
  const enemy = (side==="P1")?"AI":"P1";
  const negated = await maybeNegateByTegata(enemy);
  if(negated){
    state[side].E[ePos] = null;
    state[side].wing.push(card);
    log(`効果カード：無効→ウイング ${card.name}`, "warn");
    return;
  }

  // ここはv50020からの主要効果だけ：必要なら追加していきます
  log(`効果（簡易）：${card.name}`);
  state[side].E[ePos] = null;
  state[side].wing.push(card);
  log(`${side==="P1"?"あなた":"AI"}：使用後→ウイング ${card.name}`);
}

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(isCharacter(card)){ log("Eにはエフェクト/アイテムのみ置けます", "warn"); return; }

  state.P1.E[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  log(`E配置：${card.name}`);
  renderAll();

  if(isEffect(card)){
    playEffectFromE("P1", pos).then(()=>renderAll());
  }
  if(isItem(card)){
    equipFromE("P1", pos).then(()=>renderAll());
  }
}

/* ✅ DIRECT：シールド0のとき「DIRECTしますか？」 */
async function onClickEnemyShield(idx){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null){ log("先に攻撃する自分キャラを選択してください", "warn"); return; }

  const alive = state.AI.shield.filter(x=>!!x).length;
  if(alive===0){
    const ok = await promptYesNo("P1", "DIRECT ATTACK", "ダイレクトアタックをしますか？");
    if(!ok) return;
    await battle("P1", state.selectedAttackerPos, {type:"DIRECT"});
    renderAll();
    return;
  }
  await battle("P1", state.selectedAttackerPos, {type:"SHIELD", idx});
  renderAll();
}

function onClickEnemyC(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null){ log("先に攻撃する自分キャラを選択してください", "warn"); return; }
  if(!state.AI.C[pos]){ log("相手キャラがいません", "warn"); return; }
  battle("P1", state.selectedAttackerPos, {type:"C", pos}).then(()=>renderAll());
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
    const slot = makeSlot(state.AI.C[i], {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyC(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const selAtk = (state.phase==="BATTLE" && state.activeSide==="P1" && state.selectedAttackerPos===i);
    const slot = makeSlot(c, {glow, sel:selAtk});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c) bindLongPress(slot, ()=> onLongPressEmptyCForKensan(i), 420);
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
    const alive = state[side].shield.filter(x=>!!x).length;

    cardNode.classList.toggle("empty", !exists);
    cardNode.classList.remove("direct");

    if(exists && state.img.backUrl){
      cardNode.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      cardNode.style.backgroundImage = "";
      if(alive===0){
        cardNode.classList.add("direct"); // ✅ DIRECT表示
      }
    }

    if(side==="AI"){
      slot.onclick = ()=> onClickEnemyShield(idx);
    }
  });
}
function renderPiles(){
  document.querySelectorAll(".pileCard").forEach((n)=>{
    const p = n.getAttribute("data-pile")||"";
    const isDeck = (p==="AI_DECK" || p==="P_DECK");
    if(isDeck && state.img.backUrl) n.style.backgroundImage = `url("${state.img.backUrl}")`;
    else n.style.backgroundImage = "";
  });
}
function renderAll(){
  cleanupTempBuffs();
  updateHUD();
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
  renderPiles();
}

/* ---------------- Turn controls ---------------- */
async function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.selectedAttackerPos=null;
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
    state.selectedAttackerPos=null;
    renderAll();

    await runAITurn();

    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    state.normalSummonUsed=false;
    state.selectedAttackerPos=null;
    log(`TURN ${state.turn} あなたのターン`);
    renderAll();
  }
}

/* =========================
   AI v50030
   - 通常登場
   - 見参（kensan）も実行（手札からコスト捨て）
   - アイテム装備
   - 攻撃
========================= */
function findEmptyC(side){
  for(let i=0;i<3;i++) if(!state[side].C[i]) return i;
  return -1;
}
function findEmptyE(side){
  for(let i=0;i<3;i++) if(!state[side].E[i]) return i;
  return -1;
}
async function aiDoKensanIfPossible(){
  const side = "AI";
  const empty = findEmptyC(side);
  if(empty<0) return false;

  const idxK = state.AI.hand.findIndex(c=>isCharacter(c) && c.summon==="kensan");
  if(idxK<0) return false;

  // コスト：手札から（見参カード以外）1枚捨てるのを優先
  const candidates = [];
  for(let i=0;i<state.AI.hand.length;i++){
    if(i===idxK) continue;
    candidates.push(i);
  }
  // ステージから払うより、まず手札で払う（AIの挙動安定）
  if(candidates.length<=0) return false;

  // コスト捨て
  const costIdx = candidates[Math.floor(Math.random()*candidates.length)];
  const costCard = state.AI.hand.splice(costIdx,1)[0];
  state.AI.wing.push(costCard);

  // idxKはズレる可能性があるので再検索
  const idxK2 = state.AI.hand.findIndex(c=>isCharacter(c) && c.summon==="kensan");
  if(idxK2<0) return false;

  const kensan = state.AI.hand.splice(idxK2,1)[0];
  state.AI.C[empty] = kensan;
  log(`AI：見参 ${kensan.name}（コスト→${costCard.name}）`, "warn");
  await handleOnSummonAbility("AI", kensan);
  await sleep(250);
  return true;
}

async function runAITurn(){
  log("AIターン開始", "warn");
  await sleep(220);

  state.phase="DRAW";
  draw("AI",1);
  log("AI：ドロー +1", "warn");
  await sleep(220);

  state.phase="MAIN";
  await sleep(220);

  // 1) 通常登場（kensan以外）
  const emptyC = findEmptyC("AI");
  if(emptyC>=0){
    const idx = state.AI.hand.findIndex(c=>isCharacter(c) && c.summon!=="kensan");
    if(idx>=0){
      const card = state.AI.hand.splice(idx,1)[0];
      state.AI.C[emptyC]=card;
      log(`AI：登場 ${card.name}`, "warn");
      await handleOnSummonAbility("AI", card);
      await sleep(220);
    }else{
      // 2) 見参（kensan）
      await aiDoKensanIfPossible();
    }
  }

  // 3) アイテムをEに置いて装備
  const emptyE = findEmptyE("AI");
  if(emptyE>=0){
    const idxItem = state.AI.hand.findIndex(c=>isItem(c));
    if(idxItem>=0){
      const it = state.AI.hand.splice(idxItem,1)[0];
      state.AI.E[emptyE]=it;
      log(`AI：E配置 ${it.name}`, "warn");
      await sleep(200);
      await equipFromE("AI", emptyE);
      await sleep(200);
    }
  }

  // 4) BATTLE：攻撃
  state.phase="BATTLE";
  await sleep(220);

  const myPos = findStageCharPositions("AI");
  if(myPos.length){
    const atkPos = myPos[0];
    const enemyC = findStageCharPositions("P1");
    if(enemyC.length){
      await battle("AI", atkPos, {type:"C", pos: enemyC[0]});
    }else{
      const alive = state.P1.shield.filter(x=>!!x).length;
      if(alive>0){
        const idx = state.P1.shield.findIndex(x=>!!x);
        await battle("AI", atkPos, {type:"SHIELD", idx});
      }else{
        await battle("AI", atkPos, {type:"DIRECT"});
      }
    }
  }

  state.phase="END";
  enforceHandLimit("AI");
  await sleep(180);
  log("AIターン終了", "warn");
}

/* ---------------- Start game ---------------- */
function startGame(){
  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.selectedAttackerPos=null;

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
  log(`ゲーム開始：初手4 / シールド3 / 先攻=${el.firstInfo.textContent}`);

  renderAll();

  if(state.activeSide==="AI"){
    endTurn();
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
  log("v50030：AI見参対応／手形C化／DIRECT確認UI");
}

document.addEventListener("DOMContentLoaded", init);