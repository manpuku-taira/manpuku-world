/* =========================================================
  Manpuku World - v40200
  FIX:
   - C/Eエリアが左に崩壊 -> grid span3 をHTML構造で保証
   - シールドを縦長カード比率に固定（shieldCard）
   - 裏面：GitHubスキャンに失敗しても /assets/card_back.png.PNG を直試しして必ず拾う
   - サーチ/見参コスト選択：画像サムネ付きChoice UIへ復帰
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

/* ---------- Elements ---------- */
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

  confirmM: $("confirmM"),
  confirmTitle: $("confirmTitle"),
  confirmBody: $("confirmBody"),
  btnYes: $("btnYes"),
  btnNo: $("btnNo"),

  settingsM: $("settingsM"),
  repoInput: $("repoInput"),
  btnRepoSave: $("btnRepoSave"),
  btnRescan: $("btnRescan"),
  btnClearCache: $("btnClearCache"),

  helpM: $("helpM"),
};

/* ---------- Logs ---------- */
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
    d.className = "logLine muted";
    d.textContent = "（ログはまだありません）";
    el.logBody.appendChild(d);
    return;
  }
  for(const it of LOGS.slice(0, 200)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v6";

/* ---------- Helpers ---------- */
function bindLongPress(node, fn, ms=420){
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(fn, ms); };
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
   Card data (必要部分のみ）
========================================================= */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", type:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    summon:"kensan", text: normalizeText("このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。"),
    rank:5, atk:2500 },
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ステージに「クルエラ」がある時、手札から発動できる。\n相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"),
    rank:0, atk:0 },
  { no:3,  name:"トナカイの少女ニコラ", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    summon:"kensan", text: normalizeText("このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"),
    rank:5, atk:2000 },
  { no:4,  name:"聖ラウス", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"),
    rank:3, atk:1500 },

  { no:5,  name:"統括AI タータ", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが登場した時、発動できる。デッキから2枚ドローする。\n自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"),
    rank:4, atk:2000 },
  { no:6,  name:"麗し令嬢エフィ", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    summon:"kensan", text: normalizeText("このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"),
    rank:5, atk:2000 },

  { no:7,  name:"狩猟まひる", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("（テキスト未確定）"),
    rank:3, atk:1500 },

  { no:8,  name:"組織の男 手形", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。"),
    rank:0, atk:0 },

  { no:9,  name:"小太郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n自分ステージに「小次郎」カードがある時、このカードのATK+500。"),
    rank:4, atk:2000 },
  { no:10, name:"小次郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n自分ステージに「小太郎」カードがある時、このカードのATK+500。"),
    rank:4, atk:2000 },

  { no:11, name:"司令", type:"item", tags:[], titleTag:"",
    text: normalizeText("このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"),
    rank:0, atk:0 },
  { no:12, name:"班目プロデューサー", type:"character", tags:[], titleTag:"",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"),
    rank:2, atk:1000 },
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character", tags:[], titleTag:"",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。この効果は相手ターンでも発動できる。"),
    rank:4, atk:2000 },
  { no:14, name:"記憶抹消", type:"effect", tags:[], titleTag:"",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。"),
    rank:0, atk:0 },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect", tags:[], titleTag:"",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    rank:0, atk:0 },
  { no:16, name:"力こそパワー！！", type:"effect", tags:[], titleTag:"",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"),
    rank:0, atk:0 },
  { no:17, name:"キャトルミューティレーション", type:"effect", tags:[], titleTag:"",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    rank:0, atk:0 },
  { no:18, name:"a-xブラスター01 -放射型-", type:"item", tags:["射手"], titleTag:"",
    text: normalizeText("自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"),
    rank:0, atk:0 },
  { no:19, name:"-聖剣- アロングダイト", type:"item", tags:["勇者","剣士"], titleTag:"",
    text: normalizeText("自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"),
    rank:0, atk:0 },
  { no:20, name:"普通の棒", type:"item", tags:["勇者"], titleTag:"",
    text: normalizeText("自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\nタグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"),
    rank:0, atk:0 },
];

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){ deck.push({...c}); deck.push({...c}); }
  shuffle(deck);
  return deck;
}

/* ---------- State ---------- */
const state = {
  started:false,
  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",
  normalSummonUsed:false,
  selectedHandIndex:null,
  selectedAttackerPos:null,
  aiRunning:false,

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },
};

/* ---------- Rules/UI ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
function isCharacter(card){ return card && card.type==="character"; }
function isEffectOrItem(card){ return card && card.type!=="character"; }

/* ---------- UI core ---------- */
function updateHUD(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  const you = (state.activeSide==="P1");
  el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
  el.btnNext.disabled = !you;
  el.btnEnd.disabled  = !you;
  el.btnNext.style.opacity = you ? "1" : ".45";
  el.btnEnd.style.opacity  = you ? "1" : ".45";
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

/* ---------- Modals ---------- */
function showModal(id){ $(id).classList.add("show"); }
function hideModal(id){ $(id).classList.remove("show"); }

document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");
  if(close==="choice") hideModal("choiceM");
  if(close==="confirm") hideModal("confirmM");
  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
});

function openViewer(card){
  el.viewerTitle.textContent = card.name;
  el.viewerText.textContent = `${card.name}\nRANK ${card.rank||0} / ATK ${card.atk||0}\n\n${card.text||""}`;
  el.viewerImg.src = state.img.cardUrlByNo[pad2(card.no)] || "";
  showModal("viewerM");
}

/* ---------- Choice UI with thumbs ---------- */
let choiceResolver = null;
function askChoice(title, message, items){
  // items: [{label, value, card(optional)}]
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
    s.textContent = it.card ? `RANK ${it.card.rank||0} / ATK ${it.card.atk||0}` : "";
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

/* ---------- Confirm ---------- */
let confirmYes = null;
function askConfirm(title, body, onYes){
  el.confirmTitle.textContent = title;
  el.confirmBody.textContent = body;
  confirmYes = onYes;
  showModal("confirmM");
}
el.btnNo.addEventListener("click", ()=> hideModal("confirmM"), {passive:true});
el.btnYes.addEventListener("click", ()=>{
  hideModal("confirmM");
  if(confirmYes){ const fn = confirmYes; confirmYes=null; fn(); }
}, {passive:true});

/* ---------- Images (Back: direct fallback) ---------- */
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

/* ★裏面は「スキャン結果」＋「直接候補」を両方試す */
async function resolveBackUrl(cacheBackFile){
  const directCandidates = [
    "/assets/card_back.png.PNG",
    "/assets/card_back.png.png",
    "/assets/card_back.png",
    "/assets/card_back.PNG",
    "/assets/back.png",
    "/assets/back.jpg",
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
  log("画像スキャン開始（GitHub）…", "muted");

  const cache = {};
  cache.repo = getRepo();

  try{
    const [assetFiles, cardFiles] = await Promise.all([
      ghList("assets"),
      ghList("assets/cards"),
    ]);

    cache.assetFiles = assetFiles;
    cache.cardFiles = cardFiles;
    cache.scannedAt = Date.now();

    cache.fieldFile = pickFieldFile(assetFiles) || "";
    cache.backFile  = pickBackFile(assetFiles) || "";
    cache.cardMap   = buildCardMapFromFileList(cardFiles);

    setCache(cache);
    log("画像スキャン完了：適用します", "muted");
  }catch(err){
    log(`GitHubスキャン失敗：${String(err.message||err)}（直接パスで復旧します）`, "warn");
    // 失敗しても back の直接チェックは行う
    setCache({ repo:getRepo(), scannedAt:Date.now() });
  }

  await applyImagesFromCache();
}

async function applyImagesFromCache(){
  const cache = getCache();

  // field
  state.img.fieldUrl = "";
  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)){
      state.img.fieldUrl = u;
    }
  }
  if(state.img.fieldUrl){
    el.fieldTop.style.backgroundImage = `url("${state.img.fieldUrl}")`;
    el.fieldBottom.style.backgroundImage = `url("${state.img.fieldUrl}")`;
    log("フィールド：読込OK", "muted");
  }else{
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
    log("フィールド：未設定（表示なし）", "warn");
  }

  // back (必ず direct fallback も試す)
  state.img.backUrl = await resolveBackUrl(cache.backFile || "");
  if(state.img.backUrl){
    log(`裏面：読込OK → ${state.img.backUrl}`, "muted");
  }else{
    log("裏面：見つかりません（黒裏で継続）", "warn");
  }

  // cards
  state.img.cardUrlByNo = {};
  const map = (cache.cardMap || {});
  for(const k of Object.keys(map)){
    state.img.cardUrlByNo[k] = vercelPathCards(map[k]);
  }

  state.img.ready = true;
  renderAll();
}

/* ---------- Render helpers ---------- */
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

/* ---------- Core game ---------- */
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
    log(`${side==="P1"?"あなた":"AI"}：手札上限→ウイング ${c.name}`, "muted");
  }
}
function findCruellaOnYourStage(){
  return state.P1.C.some(c=>c && c.no===1);
}

/* ---------- Effects used in this fix set ---------- */
async function resolveLaousSearch_P1(){
  const pool = [...state.P1.deck, ...state.P1.wing].filter(c=> (c.tags||[]).includes("クランプス"));
  if(!pool.length){ log("ラウス：クランプス候補なし", "warn"); return; }

  const items = pool.slice(0, 8).map(c=>({
    label: c.name,
    value: c.no,
    card: c
  }));

  const pickNo = await askChoice("聖ラウス（サーチ）", "手札に加えるカードを選択してください。", items);
  const picked = pool.find(c=>c.no===pickNo);
  if(!picked) return;

  const idxD = state.P1.deck.findIndex(x=>x===picked);
  if(idxD>=0) state.P1.deck.splice(idxD,1);
  else{
    const idxW = state.P1.wing.findIndex(x=>x===picked);
    if(idxW>=0) state.P1.wing.splice(idxW,1);
  }
  state.P1.hand.push(picked);
  log(`ラウス：サーチ → ${picked.name}`, "muted");
  renderAll();
}

function listKensanCostCandidates(excludeHandIndex){
  const out = [];
  for(let i=0;i<state.P1.hand.length;i++){
    if(i===excludeHandIndex) continue;
    out.push({from:"hand", idx:i, card:state.P1.hand[i], label:`手札：${state.P1.hand[i].name}`});
  }
  for(let i=0;i<3;i++){
    if(state.P1.C[i]) out.push({from:"C", idx:i, card:state.P1.C[i], label:`C${i+1}：${state.P1.C[i].name}`});
  }
  for(let i=0;i<3;i++){
    if(state.P1.E[i]) out.push({from:"E", idx:i, card:state.P1.E[i], label:`E${i+1}：${state.P1.E[i].name}`});
  }
  return out;
}

async function payKensanCost(excludeHandIndex){
  const cands = listKensanCostCandidates(excludeHandIndex);
  if(!cands.length){ log("見参：コスト候補がありません", "warn"); return null; }

  const items = cands.slice(0, 10).map(x=>({
    label: x.label,
    value: `${x.from}:${x.idx}`,
    card: x.card
  }));

  const pick = await askChoice("見参（コスト）", "ウイングへ送るカードを1枚選んでください。", items);
  const [from, idxStr] = String(pick).split(":");
  const idx = Number(idxStr);

  if(from==="hand"){
    const moved = state.P1.hand.splice(idx,1)[0];
    state.P1.wing.push(moved);
    log(`見参コスト：手札→ウイング ${moved.name}`, "muted");
    return {from, idx, moved};
  }
  if(from==="C"){
    const moved = state.P1.C[idx];
    state.P1.C[idx]=null;
    state.P1.wing.push(moved);
    log(`見参コスト：C→ウイング ${moved.name}`, "muted");
    return {from, idx, moved};
  }
  if(from==="E"){
    const moved = state.P1.E[idx];
    state.P1.E[idx]=null;
    state.P1.wing.push(moved);
    log(`見参コスト：E→ウイング ${moved.name}`, "muted");
    return {from, idx, moved};
  }
  return null;
}

async function resolveImmediateEffect_FlameBullet_P1(card, placedEPos){
  if(!findCruellaOnYourStage()){
    log("フレイムバレット：条件（クルエラ）がありません→不発", "warn");
    // 置けたように見せない：手札へ戻す
    state.P1.E[placedEPos]=null;
    state.P1.hand.push(card);
    renderAll();
    return;
  }

  const items = [
    { label:"ATKが1番高い相手キャラ1体をウイング", value:"maxAtk" },
    { label:"相手のRANK4以下キャラをすべてウイング", value:"rank4all" },
  ];
  const choice = await askChoice("黒魔法-フレイムバレット", "効果を選択してください。", items);

  if(choice==="maxAtk"){
    const enemy = state.AI.C.filter(Boolean);
    if(!enemy.length) log("対象なし：相手キャラ不在", "warn");
    else{
      const max = enemy.slice().sort((a,b)=> (b.atk||0)-(a.atk||0))[0];
      const pos = state.AI.C.findIndex(c=>c===max);
      state.AI.C[pos]=null;
      state.AI.wing.push(max);
      log(`フレイムバレット：${max.name} をウイング`, "muted");
    }
  }else{
    let moved = 0;
    for(let i=0;i<3;i++){
      const c = state.AI.C[i];
      if(c && (c.rank||0) <= 4){
        state.AI.C[i]=null;
        state.AI.wing.push(c);
        moved++;
      }
    }
    log(`フレイムバレット：RANK4以下 ${moved} 体をウイング`, "muted");
  }

  // one-shot -> wing
  state.P1.E[placedEPos]=null;
  state.P1.wing.push(card);
  log("フレイムバレット：使用後ウイング", "muted");
  renderAll();
}

/* ---------- Player interactions ---------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  if(state.phase==="MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];

    if(!isCharacter(card)){ log("Cにはキャラクターのみ置けます", "warn"); return; }
    if(card.summon==="kensan"){ log("このカードは登場できません。空きCを長押しして見参してください", "warn"); return; }
    if(state.normalSummonUsed){ log("登場（通常）はターン1回です", "warn"); return; }

    state.P1.C[pos]=card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex=null;
    state.normalSummonUsed=true;

    log(`登場：${card.name}`, "muted");
    renderAll();

    if(card.no===4){ resolveLaousSearch_P1(); }
    return;
  }
}

async function onLongPressEmptyCForKensan(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card) || card.summon!=="kensan") return;

  const paid = await payKensanCost(state.selectedHandIndex);
  if(!paid) return;

  if(paid.from==="hand" && paid.idx < state.selectedHandIndex){
    state.selectedHandIndex -= 1;
  }

  const placed = state.P1.hand.splice(state.selectedHandIndex,1)[0];
  state.P1.C[pos]=placed;
  state.selectedHandIndex=null;

  log(`見参：${placed.name}`, "muted");
  renderAll();
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

  log(`E配置：${card.name}`, "muted");
  renderAll();

  if(card.no===2){ resolveImmediateEffect_FlameBullet_P1(card, pos); }
}

/* ---------- Rendering ---------- */
function renderZones(){
  // enemy
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++) el.aiE.appendChild(makeSlot(state.AI.E[i], {enemy:true}));

  el.aiC.innerHTML="";
  for(let i=0;i<3;i++) el.aiC.appendChild(makeSlot(state.AI.C[i], {enemy:true}));

  // your C
  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {glow});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c) bindLongPress(slot, ()=> onLongPressEmptyCForKensan(i), 420);
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

    const playable = (state.activeSide==="P1" && state.phase==="MAIN");
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}")`;
      h.style.backgroundSize="cover";
      h.style.backgroundPosition="center";
    }else{
      h.style.background = "linear-gradient(135deg, rgba(89,242,255,.10), rgba(179,91,255,.08))";
    }

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

function ensureShieldBadge(cell){
  let b = cell.querySelector(".shieldCount");
  if(!b){
    b = document.createElement("div");
    b.className="shieldCount";
    cell.appendChild(b);
  }
  return b;
}

function renderShields(){
  const nodes = document.querySelectorAll(".shieldSlot");
  nodes.forEach((cell)=>{
    const side = cell.getAttribute("data-side");
    const idx = Number(cell.getAttribute("data-idx")||"0");
    const cardNode = cell.querySelector(".shieldCard");
    const sh = state[side].shield[idx];
    const exists = !!sh;

    cardNode.classList.toggle("empty", !exists);

    if(exists){
      if(state.img.backUrl){
        cardNode.style.backgroundImage = `url("${state.img.backUrl}")`;
      }else{
        cardNode.style.backgroundImage = "";
        cardNode.style.backgroundColor = "#070914";
      }
    }else{
      cardNode.style.backgroundImage = "";
    }

    const count = state[side].shield.filter(Boolean).length;
    const badge = ensureShieldBadge(cell);
    badge.textContent = `${count}/3`;
  });
}

function renderPiles(){
  document.querySelectorAll(".pileCard").forEach((n)=>{
    if(state.img.backUrl){
      n.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      n.style.backgroundImage = "";
      n.style.backgroundColor = "#070914";
    }
    n.style.backgroundSize="cover";
    n.style.backgroundPosition="center";
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

/* ---------- Turn controls ---------- */
function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${state.activeSide==="P1"?"あなた":"AI"}：ドロー +1`, "muted");
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
  }
  renderAll();
}

function endTurn(){
  enforceHandLimit(state.activeSide);

  if(state.activeSide==="P1"){
    state.activeSide="AI";
    state.phase="START";
    renderAll();
    // AIは簡易：ドローだけして終了（安定優先）
    draw("AI", 1);
    enforceHandLimit("AI");
    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    log(`TURN ${state.turn} あなたのターン`, "muted");
    renderAll();
  }
}

/* ---------- Start Game ---------- */
function startGame(){
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

  state.firstSide = (Math.random()<0.5) ? "P1" : "AI";
  state.activeSide = state.firstSide;

  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log(`ゲーム開始：初手4 / シールド3（裏） / 先攻=${el.firstInfo.textContent}`, "muted");

  renderAll();
}

/* ---------- Bindings ---------- */
function bindStart(){
  el.boot.textContent="JS: OK（読み込み成功）";
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
    log(`設定：repo=${v}`, "muted");
    await rescanImages();
  }, {passive:true});

  el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});
  el.btnClearCache.addEventListener("click", ()=>{
    clearCache();
    log("キャッシュ削除", "muted");
  }, {passive:true});
}

/* ---------- init ---------- */
async function init(){
  bindStart();
  bindHUD();
  bindSettings();

  // 画像はキャッシュがあってもまず back の直試しが効く
  const cache = getCache();
  if(cache && cache.repo===getRepo()){
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent="JS: OK（準備完了）";
  log("v40200：位置崩れ修正／シールド縦長化／裏面強制検出／選択UI画像復活", "muted");
}

document.addEventListener("DOMContentLoaded", init);