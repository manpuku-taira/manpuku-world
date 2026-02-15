/* =========================================================
  Manpuku World - v50002 (SCROLL STABLE / FIELD FIX)
  FIX:
   - タイトル画面にフィールド画像が出ない
   - フィールド画像は #game の背景にのみ適用（bodyには貼らない）
   - iOS崩壊要因になりやすい background-attachment: fixed を廃止
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}

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

  announce: $("announce"),

  aiC: $("aiC"),
  aiE: $("aiE"),
  aiS: $("aiS"),
  pC: $("pC"),
  pE: $("pE"),
  pS: $("pS"),

  hand: $("hand"),
  aiHand: $("aiHand"),
  enemyHandLabel: $("enemyHandLabel"),

  aiDeckN: $("aiDeckN"),
  aiWingN: $("aiWingN"),
  aiOutN: $("aiOutN"),
  pDeckN: $("pDeckN"),
  pWingN: $("pWingN"),
  pOutN: $("pOutN"),

  aiDeckFace: $("aiDeckFace"),
  pDeckFace: $("pDeckFace"),

  aiWingFace: $("aiWingFace"),
  aiOutFace: $("aiOutFace"),
  pWingFace: $("pWingFace"),
  pOutFace: $("pOutFace"),

  viewerM: $("viewerM"),
  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),

  zoneM: $("zoneM"),
  zoneTitle: $("zoneTitle"),
  zoneList: $("zoneList"),

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
  for(const it of LOGS.slice(0, 250)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

function say(text, tone="muted"){
  el.announce.textContent = text;
  el.announce.style.color =
    (tone==="warn") ? "rgba(255,77,109,.95)" :
    (tone==="ok") ? "rgba(89,242,255,.95)" :
    "rgba(167,176,217,.92)";
}

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v5";

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];

/* ---------- Card registry (20) ---------- */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", kind:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:1500, rank:5,
    text:normalizeText(
`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。
・1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。`
    )
  },
  { no:2,  name:"黒魔法-フレイムバレット", kind:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(
`・自分ステージに「クルエラ」がある時、手札から発動できる。
・相手ステージのキャラクター1体を選び、以下から1つ選ぶ。
  A：ATKが1番高いキャラ1体をウイングに送る
  B：rank4以下のキャラをすべてウイングに送る`
    )
  },
  { no:3,  name:"トナカイの少女ニコラ", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:2000, rank:5,
    text:normalizeText(
`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。
・自分ターンに発動できる。このターンの終わりまでATK+1000。`
    )
  },
  { no:4,  name:"聖ラウス", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:1000, rank:3,
    text:normalizeText(
`・このカードが登場した時、デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。`
    )
  },
  { no:5,  name:"統括AI タータ", kind:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    baseAtk:1000, rank:3,
    text:normalizeText(
`・登場した時、デッキから2枚ドローする。
・自分ターンに1度：手札から2枚までウイングへ送り、その後同枚数だけタイトルタグ「BUGBUG西遊記」をデッキから手札へ。`
    )
  },
  { no:6,  name:"麗し令嬢エフィ", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:1500, rank:5,
    text:normalizeText(
`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。
・自分ターン：相手キャラ1体を選び、このターンの終わりまでATK-1000。`
    )
  },
  { no:7,  name:"狩猟まひる", kind:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:1500, rank:4,
    text:normalizeText("（効果文言未確定：現版では効果なし）")
  },
  { no:8,  name:"組織の男 手形", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(`・相手ターンに1度発動できる。相手が発動した効果を無効にする。`)
  },
  { no:9,  name:"小太郎・孫悟空Lv17", kind:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    baseAtk:2000, rank:4,
    text:normalizeText(`・自分ステージに存在：手札の「小次郎」を見参させる。\n・自分ステージに「小次郎」がある時ATK+500。`)
  },
  { no:10, name:"小次郎・孫悟空Lv17", kind:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    baseAtk:2000, rank:4,
    text:normalizeText(`・自分ステージに存在：手札の「小太郎」を見参させる。\n・自分ステージに「小太郎」がある時ATK+500。`)
  },
  { no:11, name:"司令", kind:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(`・登場した時：自分キャラ1体に装備（このカードはアイテム扱い）。装備キャラATK+500。`)
  },
  { no:12, name:"班目プロデューサー", kind:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:1500, rank:4,
    text:normalizeText(`・このカードは1ターンに1度、バトルでは破壊されない。`)
  },
  { no:13, name:"超弩級砲塔列車スタマックス氏", kind:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:2500, rank:4,
    text:normalizeText(`・自分ステージに存在：このカードをウイングに送り、相手キャラ1体をこのターンATK-1000（相手ターンでも可）。`)
  },
  { no:14, name:"記憶抹消", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(`・相手が効果発動した時：手札から発動。無効にしてウイングに送る。`)
  },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(`・バトルする時：手札から発動。自分キャラ1体をこのターンATK+1000。`)
  },
  { no:16, name:"力こそパワー！！", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(`・自分ターンのみ：相手のATKが1番低いキャラ1体をウイングに送る。`)
  },
  { no:17, name:"キャトルミューティレーション", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(`・自分キャラがバトルでウイングに送られた時：手札から発動。相手キャラ1体を手札に戻す。`)
  },
  { no:18, name:"a-xブラスター01 -放射型-", kind:"item", tags:["射手"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(
`・自分ターン：手札から発動。自分キャラ1体に装備。ATK+500。
・装備者がタグ「射手」ならさらにATK+500。
・相手ターン開始時：相手手札をランダム1枚ウイングへ。`
    )
  },
  { no:19, name:"-聖剣- アロングダイト", kind:"item", tags:["勇者","剣士"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:2,
    text:normalizeText(
`・自分ターン：装備。ATK+500。
・装備者が「勇者」または「剣士」ならさらにATK+500。
・装備者がバトルで相手キャラをウイングに送った時：1ドロー。`
    )
  },
  { no:20, name:"普通の棒", kind:"item", tags:["勇者"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    baseAtk:0, rank:1,
    text:normalizeText(
`・自分ターン：装備。ATK+300。
・装備者が「勇者」ならさらにATK+500。`
    )
  },
];

function cloneCard(no){
  const c = CardRegistry.find(x=>x.no===no);
  const base = {...c};
  base.uid = `${no}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  base.atk = base.baseAtk || 0;
  base.equips = [];
  base.battleImmuneOnce = (no===12);
  base.immuneUsedThisTurn = false;
  return base;
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck = [];
  for(let no=1; no<=20; no++){
    deck.push(cloneCard(no));
    deck.push(cloneCard(no));
  }
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

  selectedHandIndex:null,
  selectedAttackerPos:null,

  attackedThisTurn: { P1:[false,false,false], AI:[false,false,false] },

  pending: null,

  P1: { deck:[], hand:[], shield:[null,null,null], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[null,null,null], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: {
    fieldUrl:"",
    backUrl:"",
    cardUrlByNo:{},
    ready:false,
  },

  aiRunning:false,
  gameOver:false,
};

/* =========================================================
   FIELD BACKGROUND CONTROL (v50002)
   - タイトルでは出さない
   - ゲーム(#game)背景にだけ適用
========================================================= */
function clearFieldBackground(){
  // title/game両方を「何も貼ってない」状態に戻す
  if(el.title){
    el.title.style.backgroundImage = "";
    el.title.style.backgroundSize = "";
    el.title.style.backgroundPosition = "";
    el.title.style.backgroundRepeat = "";
  }
  if(el.game){
    el.game.style.backgroundImage = "";
    el.game.style.backgroundSize = "";
    el.game.style.backgroundPosition = "";
    el.game.style.backgroundRepeat = "";
    // fixedは使わない（iOS崩壊回避）
    el.game.style.backgroundAttachment = "";
  }
}
function applyFieldBackgroundToGame(){
  // フィールド画像が無ければ何もしない（既存のCSSでOK）
  if(!state.img.fieldUrl || !el.game) return;

  // “bodyではなく game” に貼ることでレイアウト崩壊を避ける
  el.game.style.backgroundImage =
    `radial-gradient(1200px 900px at 50% 0%, rgba(89,242,255,.12), transparent 60%),
     radial-gradient(900px 700px at 80% 40%, rgba(179,91,255,.10), transparent 55%),
     url("${state.img.fieldUrl}")`;

  el.game.style.backgroundSize = "auto, auto, cover";
  el.game.style.backgroundPosition = "center, center, center";
  el.game.style.backgroundRepeat = "no-repeat, no-repeat, no-repeat";
  el.game.style.backgroundAttachment = "scroll"; // ← fixed禁止
}
function syncFieldBackgroundVisibility(){
  // started + game.active のときだけ貼る
  clearFieldBackground();
  if(state.started && el.game && el.game.classList.contains("active")){
    applyFieldBackgroundToGame();
  }
}

/* ---------- UI helpers ---------- */
function setActiveUI(){
  const you = (state.activeSide==="P1");
  el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
  el.chipActive.classList.toggle("enemy", !you);

  el.btnNext.disabled = !you || state.gameOver;
  el.btnEnd.disabled  = !you || state.gameOver;
  el.btnNext.style.opacity = (!you||state.gameOver) ? ".45" : "1";
  el.btnEnd.style.opacity  = (!you||state.gameOver) ? ".45" : "1";
}
function updateHUD(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  setActiveUI();
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

/* ---------- Image scan (GitHub) ---------- */
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

function pickFieldFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());
  const idx = lowers.findIndex(n=>n.startsWith("field."));
  if(idx>=0) return assetFiles[idx];
  const cand = ["field.png.jpg","field.jpg","field.png","field.jpeg"];
  for(const c of cand){
    const k = lowers.findIndex(n=>n === c);
    if(k>=0) return assetFiles[k];
  }
  return "";
}
function isBackNameLower(l){
  return (
    l === "card_back.png" ||
    l === "card_back.jpg" ||
    l === "card_back.jpeg" ||
    l === "card_back.png.png" ||
    l === "card_back.png.jpg" ||
    l === "card_back.png.jpeg" ||
    l === "card_back.jpg.jpg" ||
    l === "card_back.jpeg.jpeg" ||
    l.startsWith("card_back.") ||
    l.startsWith("cardback.") ||
    l.startsWith("back.")
  );
}
function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());
  for(let i=0;i<assetFiles.length;i++){
    if(isBackNameLower(lowers[i])) return assetFiles[i];
  }
  return "";
}

function scoreCardFilename(name, no){
  const s = name.toLowerCase();
  const p2 = pad2(no).toLowerCase();
  const p1 = String(no).toLowerCase();
  let score = 0;
  if(s.startsWith(`${p2}_`)) score += 100;
  if(s.startsWith(`${p1}_`)) score += 80;
  if(s.includes(`${p2}_`)) score += 30;
  if(s.includes(`${p1}_`)) score += 20;
  if(s.includes(".jpg")) score += 5;
  if(s.includes(".png")) score += 5;
  if(s.includes(".jpeg")) score += 4;
  if(s.includes(".png.jpg") || s.includes(".png.jpeg") || s.includes(".png.png")) score += 6;
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
async function validateImage(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=> resolve(true);
    img.onerror = ()=> resolve(false);
    img.src = url;
  });
}

async function rescanImages(){
  state.img.ready = false;
  log("画像スキャン開始：GitHubから assets を取得します…", "muted");
  const cache = {};
  const repo = getRepo();
  try{
    const [assetFiles, cardFiles] = await Promise.all([
      ghList("assets"),
      ghList("assets/cards"),
    ]);
    cache.repo = repo;
    cache.assetFiles = assetFiles;
    cache.cardFiles = cardFiles;
    cache.scannedAt = Date.now();

    cache.fieldFile = pickFieldFile(assetFiles) || "";
    cache.backFile  = pickBackFile(assetFiles) || "";
    cache.cardMap   = buildCardMapFromFileList(cardFiles);

    setCache(cache);

    if(cache.fieldFile) log(`OK フィールド検出: ${cache.fieldFile}`, "muted");
    else log("NG フィールド未検出（assets/field.* を確認）", "warn");

    if(cache.backFile) log(`OK 裏面検出: ${cache.backFile}`, "muted");
    else log("裏面：未検出（黒い裏面で動作）", "warn");

    const mapped = Object.keys(cache.cardMap || {}).length;
    if(mapped >= 20) log("OK カード画像：No.01〜20を自動紐付け", "muted");
    else log(`注意：カード画像自動紐付け不足（${mapped}/20）`, "warn");
  }catch(err){
    log(`NG GitHub API取得失敗：${String(err.message || err)}`, "warn");
  }
  await applyImagesFromCache();
}

async function applyImagesFromCache(){
  const cache = getCache();
  if(cache.repo && cache.repo !== getRepo()){
    log("画像キャッシュは別リポジトリのため破棄します", "warn");
    clearCache();
    return;
  }

  // field（※ v50002: ここでは state.img.fieldUrl をセットするだけ。背景適用は開始後のみ）
  state.img.fieldUrl = "";
  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)){
      state.img.fieldUrl = u;
      log("OK フィールド読込：準備完了（タイトルには表示しません）", "muted");
    }else{
      state.img.fieldUrl = "";
      log(`NG フィールド読込失敗: ${u}`, "warn");
    }
  }

  // back
  state.img.backUrl = "";
  if(cache.backFile){
    const b = vercelPathAssets(cache.backFile);
    if(await validateImage(b)){
      state.img.backUrl = b;
      log(`OK 裏面読込：適用（${cache.backFile}）`, "muted");
    }else{
      log(`NG 裏面読込失敗: ${b}（黒で継続）`, "warn");
      state.img.backUrl = "";
    }
  }else{
    const tries = [
      "/assets/card_back.png.PNG",
      "/assets/card_back.png.png",
      "/assets/card_back.png",
      "/assets/card_back.jpg",
      "/assets/card_back.jpeg",
      "/assets/back.png",
      "/assets/back.jpg",
    ];
    for(const t of tries){
      if(await validateImage(t)){
        state.img.backUrl = t;
        log(`OK 裏面読込：推測成功（${t}）`, "muted");
        break;
      }
    }
  }

  // cards
  state.img.cardUrlByNo = {};
  const map = cache.cardMap || {};
  for(const k of Object.keys(map)){
    state.img.cardUrlByNo[k] = vercelPathCards(map[k]);
  }

  state.img.ready = true;

  const miss = [];
  for(let no=1; no<=20; no++){
    const key = pad2(no);
    if(!state.img.cardUrlByNo[key]) miss.push(key);
  }
  if(miss.length) log(`カード画像未検出：${miss.join(", ")}`, "warn");
  else log("カード画像：20種すべて検出", "muted");

  // v50002: 背景の見え方はここで同期（開始前は非表示）
  syncFieldBackgroundVisibility();

  renderAll();
}

/* ---------- UI building blocks ---------- */
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

function faceForCard(card, opts={}){
  const face = document.createElement("div");
  face.className = "face";
  const url = state.img.cardUrlByNo[pad2(card.no)];
  if(url){
    face.style.backgroundImage = `url("${url}")`;
  }else{
    face.classList.add("fallback");
  }
  if(opts.enemy) face.classList.add("enemyFlip");
  return face;
}

function makeSlot(card, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.small) slot.classList.add("small");
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");
  if(opts.disabled) slot.classList.add("disabled");

  if(card){
    slot.appendChild(faceForCard(card, {enemy:!!opts.enemy}));
    if(card.kind==="character"){
      const b = document.createElement("div");
      b.className = "slotBadge";
      b.textContent = `ATK ${card.atk}`;
      slot.appendChild(b);
    }
    bindLongPress(slot, ()=> openViewer(card));
  }else{
    bindLongPress(slot, ()=> {
      if(opts.onEmptyLong) opts.onEmptyLong();
    });
  }

  if(opts.onClick){
    slot.addEventListener("click", (e)=>{
      e.preventDefault();
      opts.onClick();
    }, {passive:false});
  }
  return slot;
}

function setBackTo(elm){
  if(state.img.backUrl){
    elm.style.backgroundImage = `url("${state.img.backUrl}")`;
    elm.style.backgroundColor = "";
  }else{
    elm.style.backgroundImage = "";
    elm.style.backgroundColor = "#070914";
  }
}

/* ---------- Modals ---------- */
function showModal(id){ $(id).classList.add("show"); }
function hideModal(id){ $(id).classList.remove("show"); }

document.addEventListener("click", (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  const close = t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");
  if(close==="zone") hideModal("zoneM");
  if(close==="confirm") hideModal("confirmM");
  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
});

function openViewer(card){
  el.viewerTitle.textContent = `${card.name}`;
  const cur = (card.kind==="character") ? `\n\n現在ATK：${card.atk}\n基本ATK：${card.baseAtk}` : "";
  el.viewerText.textContent = (card.text || "") + cur;
  const url = state.img.cardUrlByNo[pad2(card.no)];
  el.viewerImg.src = url || "";
  showModal("viewerM");
}

function openZone(title, cards){
  el.zoneTitle.textContent = title;
  el.zoneList.innerHTML = "";

  if(!cards.length){
    const empty = document.createElement("div");
    empty.className = "logLine muted";
    empty.textContent = "（空です）";
    el.zoneList.appendChild(empty);
  }else{
    cards.forEach((c)=>{
      const it = document.createElement("div");
      it.className = "zoneItem";

      const th = document.createElement("div");
      th.className = "zThumb";
      const url = state.img.cardUrlByNo[pad2(c.no)];
      if(url) th.style.backgroundImage = `url("${url}")`;

      const meta = document.createElement("div");
      meta.className = "zMeta";
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = `${c.name}`;
      const s = document.createElement("div");
      s.className = "s";
      s.textContent = (c.kind==="character")
        ? `RANK ${c.rank} / ATK ${c.atk}`
        : `${c.kind.toUpperCase()} / RANK ${c.rank}`;

      meta.appendChild(t); meta.appendChild(s);
      it.appendChild(th); it.appendChild(meta);

      it.addEventListener("click", ()=> openViewer(c), {passive:true});
      el.zoneList.appendChild(it);
    });
  }
  showModal("zoneM");
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

/* ---------- Core helpers ---------- */
function setActiveSide(side){
  state.activeSide = side;
  setActiveUI();
}
function setPhase(p){
  state.phase = p;
  updateHUD();
  renderAll();
}
function sideName(side){ return (side==="P1") ? "あなた" : "AI"; }

function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${sideName(side)}：デッキ切れ（ドロー不能）`, "warn");
      endByDeckOut(side);
      return;
    }
    p.hand.push(p.deck.shift());
  }
}
function endByDeckOut(side){
  state.gameOver = true;
  if(side==="P1") log("敗北：デッキ切れ", "warn");
  else log("勝利：相手デッキ切れ", "muted");
  say("ゲーム終了（デッキ切れ）", "warn");
  setActiveUI();
}

function moveToWing(side, card){
  state[side].wing.push(card);
}
function moveToOutside(side, card){
  state[side].outside.push(card);
}

/* ---------- Equip handling ---------- */
function equipItemTo(side, charPos, itemCard){
  const ch = state[side].C[charPos];
  if(!ch) return false;
  ch.equips = ch.equips || [];
  ch.equips.push(itemCard);

  if(itemCard.no===11) ch.atk += 500;
  if(itemCard.no===18){
    ch.atk += 500;
    if((ch.tags||[]).includes("射手")) ch.atk += 500;
  }
  if(itemCard.no===19){
    ch.atk += 500;
    if((ch.tags||[]).includes("勇者") || (ch.tags||[]).includes("剣士")) ch.atk += 500;
  }
  if(itemCard.no===20){
    ch.atk += 300;
    if((ch.tags||[]).includes("勇者")) ch.atk += 500;
  }
  return true;
}

/* ---------- Summon rules (including 見参) ---------- */
function canNormalSummon(card){
  return card.kind==="character" && card.rank <= 4 && !isKensanOnly(card.no);
}
function isKensanOnly(no){
  return (no===1 || no===3 || no===6);
}
function needsKensan(card){
  return card.kind==="character" && isKensanOnly(card.no);
}

function kensanCostSelectFlow(side, card, targetPos){
  state.pending = { type:"kensan_cost", side, card, targetPos, step:"select" };
  say("見参コスト：手札または自分ステージのカードを1枚選んでください（長押しで詳細）", "ok");
  renderAll();
}
function resolveKensan(side, card, targetPos, costCard, costFrom){
  if(costFrom==="hand"){
    const idx = state[side].hand.findIndex(x=>x.uid===costCard.uid);
    if(idx>=0) state[side].hand.splice(idx,1);
  }else if(costFrom==="C"){
    const i = state[side].C.findIndex(x=>x && x.uid===costCard.uid);
    if(i>=0) state[side].C[i]=null;
  }else if(costFrom==="E"){
    const i = state[side].E.findIndex(x=>x && x.uid===costCard.uid);
    if(i>=0) state[side].E[i]=null;
  }
  moveToWing(side, costCard);

  const hidx = state[side].hand.findIndex(x=>x.uid===card.uid);
  if(hidx>=0) state[side].hand.splice(hidx,1);

  state[side].C[targetPos] = card;
  log(`${sideName(side)}：見参 → ${card.name}（コスト：${costCard.name}）`, "muted");
  say("見参完了", "muted");

  state.pending = null;
  onSummonTriggers(side, card);
  renderAll();
}

/* ---------- Effect framework ---------- */
function hasCardOnStage(side, name){
  return [...state[side].C, ...state[side].E].some(c=>c && c.name.includes(name));
}
function findAllCardsInDeckOrWing(side, predicate){
  const res = [];
  for(const c of state[side].deck) if(predicate(c)) res.push(c);
  for(const c of state[side].wing) if(predicate(c)) res.push(c);
  return res;
}
function pullFromDeckOrWingToHand(side, predicate){
  const deckIdx = state[side].deck.findIndex(predicate);
  if(deckIdx>=0){
    const c = state[side].deck.splice(deckIdx,1)[0];
    state[side].hand.push(c);
    return c;
  }
  for(let i=state[side].wing.length-1;i>=0;i--){
    if(predicate(state[side].wing[i])){
      const c = state[side].wing.splice(i,1)[0];
      state[side].hand.push(c);
      return c;
    }
  }
  return null;
}

function onSummonTriggers(side, card){
  if(card.no===4){
    const list = findAllCardsInDeckOrWing(side, c=> (c.tags||[]).includes("クランプス"));
    if(!list.length){
      log(`${sideName(side)}：ラウスのサーチ対象なし`, "warn");
      return;
    }
    state.pending = { type:"search_pick", side, title:"ラウス：クランプスを1枚選択", pool:list };
    say("サーチ：クランプスカードを1枚選んでください", "ok");
    renderAll();
    return;
  }
  if(card.no===5){
    draw(side, 2);
    log(`${sideName(side)}：タータ登場→2ドロー`, "muted");
    renderAll();
    return;
  }
}

/* ---------- Battle ---------- */
function destroyCharacter(side, pos, reason=""){
  const ch = state[side].C[pos];
  if(!ch) return;
  if(ch.no===12 && !ch.immuneUsedThisTurn){
    ch.immuneUsedThisTurn = true;
    log(`${sideName(side)}：班目プロデューサーはバトル破壊無効（1回）`, "muted");
    return;
  }

  const equips = (ch.equips||[]);
  state[side].C[pos]=null;
  moveToWing(side, ch);
  for(const it of equips){
    moveToWing(side, it);
  }
  log(`${sideName(side)}：破壊→ウイング ${ch.name}${reason?`（${reason}）`:""}`, "muted");
}

function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  log(`バトル：${A.name}(ATK ${A.atk}) vs ${D.name}(ATK ${D.atk})`, "muted");

  if(A.atk === D.atk){
    destroyCharacter(aSide, aPos, "相打ち");
    destroyCharacter(dSide, dPos, "相打ち");
    return;
  }
  if(A.atk > D.atk){
    destroyCharacter(dSide, dPos, "負け");
    if(A.equips && A.equips.some(x=>x.no===19)){
      draw(aSide, 1);
      log(`${sideName(aSide)}：アロングダイト効果→1ドロー`, "muted");
    }
  }else{
    destroyCharacter(aSide, aPos, "負け");
    if(D.equips && D.equips.some(x=>x.no===19)){
      draw(dSide, 1);
      log(`${sideName(dSide)}：アロングダイト効果→1ドロー`, "muted");
    }
  }
}

function breakShield(defSide, idx, bySide){
  const sh = state[defSide].shield[idx];
  if(!sh) return false;
  state[defSide].shield[idx] = null;
  state[defSide].hand.push(sh);
  log(`${sideName(bySide)}：シールド破壊 → ${sideName(defSide)}の手札へ ${sh.name}`, "warn");
  return true;
}

function checkDirectAndEnd(attackerSide){
  const defSide = (attackerSide==="P1") ? "AI" : "P1";
  const anyShield = state[defSide].shield.some(Boolean);
  if(!anyShield){
    state.gameOver = true;
    const msg = (attackerSide==="P1") ? "勝利：ダイレクトアタック成立" : "敗北：ダイレクトアタック被弾";
    log(msg, (attackerSide==="P1") ? "muted" : "warn");
    say(msg, (attackerSide==="P1") ? "ok" : "warn");
    setActiveUI();
    return true;
  }
  return false;
}

/* ---------- Click handlers ---------- */
function onClickYourC(pos){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  if(state.pending && state.pending.type==="kensan_cost"){
    const c = state.P1.C[pos];
    if(c){
      resolveKensan("P1", state.pending.card, state.pending.targetPos, c, "C");
      return;
    }
    return;
  }
  if(state.pending && state.pending.type==="equip_pick"){
    const ch = state.P1.C[pos];
    if(!ch) return;
    const item = state.pending.item;
    equipItemTo("P1", pos, item);
    log(`装備：${item.name} → ${ch.name}`, "muted");
    state.pending = null;
    say("装備完了", "muted");
    renderAll();
    return;
  }
  if(state.pending && state.pending.type==="target_enemy_pick") return;
  if(state.pending && state.pending.type==="search_pick") return;

  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];
    if(!card) return;

    if(card.kind!=="character"){
      say("キャラクターはCへ、エフェクト/アイテムはEへ置きます", "warn");
      return;
    }

    if(needsKensan(card)){
      kensanCostSelectFlow("P1", card, pos);
      return;
    }

    if(!canNormalSummon(card)){
      say("このキャラは通常登場できません（見参または条件）", "warn");
      return;
    }

    state.P1.C[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;

    log(`登場：${card.name}`, "muted");
    say("登場完了", "muted");

    onSummonTriggers("P1", card);
    renderAll();
    return;
  }

  if(state.phase === "BATTLE"){
    if(!state.P1.C[pos]) return;
    if(state.attackedThisTurn.P1[pos]){
      say("このキャラはこのターン既に攻撃しました", "warn");
      return;
    }
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    say(state.selectedAttackerPos==null ? "攻撃者選択を解除" : "攻撃対象を選んでください", "ok");
    renderAll();
    return;
  }
}

function onClickYourE(pos){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  if(state.pending && state.pending.type==="kensan_cost"){
    const c = state.P1.E[pos];
    if(c){
      resolveKensan("P1", state.pending.card, state.pending.targetPos, c, "E");
      return;
    }
    return;
  }

  if(state.phase !== "MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card) return;

  if(card.kind==="character"){
    say("キャラクターはCへ置いてください", "warn");
    return;
  }

  if(card.kind==="effect"){
    resolveEffectFromHand("P1", card);
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    moveToWing("P1", card);
    renderAll();
    return;
  }

  if(card.kind==="item"){
    const anyChar = state.P1.C.some(Boolean);
    if(!anyChar){
      say("装備先のキャラクターがいません（先にキャラを出してください）", "warn");
      return;
    }
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    state.pending = { type:"equip_pick", item: card };
    say("装備先キャラクターを選んでください", "ok");
    renderAll();
    return;
  }
}

function onClickEnemyCard(enemyPos){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  const defCard = state.AI.C[enemyPos];
  if(!atkCard || !defCard) return;

  askConfirm("攻撃確認", `${atkCard.name} → ${defCard.name}\n攻撃しますか？`, ()=>{
    resolveBattle_CvC("P1", state.selectedAttackerPos, "AI", enemyPos);
    state.attackedThisTurn.P1[state.selectedAttackerPos] = true;
    state.selectedAttackerPos = null;
    say("攻撃処理完了", "muted");
    renderAll();
  });
}

function onClickEnemyShield(idx){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  if(!atkCard) return;

  const enemyHasC = state.AI.C.some(Boolean);
  if(enemyHasC){
    say("相手キャラがいる間はシールドを攻撃できません", "warn");
    return;
  }
  if(!state.AI.shield[idx]){
    say("そのシールドは既にありません", "warn");
    return;
  }

  const anyShieldAfter = state.AI.shield.filter(Boolean).length;

  askConfirm("攻撃確認", `${atkCard.name} がシールドを攻撃します。\nシールドを破壊（→相手手札）しますか？`, ()=>{
    breakShield("AI", idx, "P1");
    state.attackedThisTurn.P1[state.selectedAttackerPos] = true;
    state.selectedAttackerPos = null;

    if(state.AI.shield.every(x=>!x)){
      say("相手シールド全破壊：次の攻撃でダイレクト可能", "ok");
      log("相手シールド全破壊：次の攻撃でダイレクト可能", "muted");
    }else{
      say(`相手シールド残り：${anyShieldAfter-1}`, "muted");
    }
    renderAll();
  });
}

/* ---------- Effect resolution (Player) ---------- */
function resolveEffectFromHand(side, card){
  log(`${sideName(side)}：効果発動 → ${card.name}`, "muted");
  say(`効果発動：${card.name}`, "ok");

  if(card.no===2){
    if(!hasCardOnStage(side, "クルエラ")){
      log("条件未満：クルエラがいません（フレイムバレット発動不可）", "warn");
      say("クルエラがいないため発動できません", "warn");
      return;
    }
    const enemyChars = state.AI.C.filter(Boolean);
    if(!enemyChars.length){
      log("対象なし：相手キャラがいません", "warn");
      say("相手キャラがいません", "warn");
      return;
    }
    askConfirm("フレイムバレット", "効果を選択してください。\nOK：ATK最高1体をウイング\nキャンセル：rank4以下を全ウイング", ()=>{
      let bestPos = -1;
      let bestAtk = -999999;
      for(let i=0;i<3;i++){
        const c = state.AI.C[i];
        if(c && c.atk > bestAtk){ bestAtk=c.atk; bestPos=i; }
      }
      if(bestPos>=0) destroyCharacter("AI", bestPos, "フレイムバレット");
      renderAll();
    });
    return;
  }

  if(card.no===15){
    const targets = state[side].C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(!targets.length){
      log("対象なし：自分キャラがいません", "warn");
      say("自分キャラがいません", "warn");
      return;
    }
    state.pending = { type:"buff_pick", side, amount:1000, until:"turn_end" };
    say("強化対象の自分キャラを選んでください（ATK+1000）", "ok");
    renderAll();
    return;
  }

  if(card.no===16){
    const enemy = state.AI.C.map((c,idx)=>c?({c,idx}):null).filter(Boolean);
    if(!enemy.length){
      log("対象なし：相手キャラがいません", "warn");
      say("相手キャラがいません", "warn");
      return;
    }
    enemy.sort((a,b)=>a.c.atk-b.c.atk);
    destroyCharacter("AI", enemy[0].idx, "力こそパワー！！");
    return;
  }

  if(card.no===8 || card.no===14){
    log("このカードは相手効果へのリアクション用です（現版：手動発動はログのみ）", "warn");
    say("リアクション用（現版：手動発動は無効処理のみ未実装）", "warn");
    return;
  }

  log("（現版：この効果はフレームのみ実装・詳細は次更新で確定）", "warn");
}

/* ---------- Pending flows on clicks ---------- */
function handlePendingOnClick(side, zone, pos){
  const pend = state.pending;
  if(!pend) return false;

  if(pend.type==="kensan_cost"){
    return true;
  }

  if(pend.type==="buff_pick" && side==="P1" && zone==="C"){
    const ch = state.P1.C[pos];
    if(!ch) return true;
    ch.atk += pend.amount;
    log(`強化：${ch.name} ATK+${pend.amount}`, "muted");
    say("強化完了", "muted");
    state.pending = null;
    renderAll();
    return true;
  }

  if(pend.type==="debuff_pick" && side==="P1" && zone==="AI_C"){
    const ch = state.AI.C[pos];
    if(!ch) return true;
    ch.atk += pend.amount;
    log(`弱体：${ch.name} ATK${pend.amount}`, "muted");
    say("弱体完了", "muted");
    state.pending = null;
    renderAll();
    return true;
  }

  return false;
}

/* ---------- Rendering ---------- */
function renderZones(){
  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, {
      enemy:true,
      onClick: ()=> {
        if(handlePendingOnClick("AI","AI_C",i)) return;
        onClickEnemyCard(i);
      }
    });
    el.aiC.appendChild(slot);
  }

  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.E[i];
    el.aiE.appendChild(makeSlot(c, {enemy:true}));
  }

  el.aiS.innerHTML = "";
  for(let i=0;i<3;i++){
    const exists = !!state.AI.shield[i];
    const slot = document.createElement("div");
    slot.className = "slot small";
    if(!exists) slot.classList.add("disabled");

    const face = document.createElement("div");
    face.className = "face enemyFlip";
    if(exists){
      if(state.img.backUrl) face.style.backgroundImage = `url("${state.img.backUrl}")`;
      else face.style.background = "#070914";
      face.style.backgroundSize = "cover";
      face.style.backgroundPosition = "center";
    }else{
      face.classList.add("fallback");
      face.style.opacity = ".25";
    }
    slot.appendChild(face);

    const badge = document.createElement("div");
    badge.className = "slotBadge";
    badge.textContent = `${state.AI.shield.filter(Boolean).length}/3`;
    slot.appendChild(badge);

    slot.addEventListener("click", (e)=>{
      e.preventDefault();
      onClickEnemyShield(i);
    }, {passive:false});

    el.aiS.appendChild(slot);
  }

  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const sel = (state.selectedAttackerPos===i);
    const slot = makeSlot(c, {
      glow,
      sel,
      onClick: ()=> {
        if(handlePendingOnClick("P1","C",i)) return;
        onClickYourC(i);
      },
      onEmptyLong: ()=> {
        if(state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null){
          const card = state.P1.hand[state.selectedHandIndex];
          if(card && needsKensan(card)){
            kensanCostSelectFlow("P1", card, i);
          }
        }
      }
    });
    el.pC.appendChild(slot);
  }

  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {
      glow,
      onClick: ()=> onClickYourE(i),
    });
    el.pE.appendChild(slot);
  }

  el.pS.innerHTML = "";
  for(let i=0;i<3;i++){
    const exists = !!state.P1.shield[i];
    const slot = document.createElement("div");
    slot.className = "slot small";
    if(!exists) slot.classList.add("disabled");

    const face = document.createElement("div");
    face.className = "face";
    if(exists){
      if(state.img.backUrl) face.style.backgroundImage = `url("${state.img.backUrl}")`;
      else face.style.background = "#070914";
      face.style.backgroundSize = "cover";
      face.style.backgroundPosition = "center";
    }else{
      face.classList.add("fallback");
      face.style.opacity = ".25";
    }
    slot.appendChild(face);

    const badge = document.createElement("div");
    badge.className = "slotBadge";
    badge.textContent = `${state.P1.shield.filter(Boolean).length}/3`;
    slot.appendChild(badge);

    el.pS.appendChild(slot);
  }
}

function renderHand(){
  el.hand.innerHTML = "";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className = "handCard";

    if(state.selectedHandIndex===i) h.classList.add("sel");
    if(state.activeSide==="P1" && state.phase==="MAIN") h.classList.add("glow");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}")`;
      h.style.backgroundSize = "cover";
      h.style.backgroundPosition = "center";
    }

    h.addEventListener("click", (e)=>{
      e.preventDefault();
      if(state.gameOver) return;
      if(state.activeSide!=="P1") return;

      if(state.pending && state.pending.type==="kensan_cost"){
        const cost = c;
        resolveKensan("P1", state.pending.card, state.pending.targetPos, cost, "hand");
        return;
      }

      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      say(state.selectedHandIndex==null ? "手札選択を解除" : "配置先（CまたはE）をタップしてください", "muted");
      renderAll();
    }, {passive:false});

    bindLongPress(h, ()=> openViewer(c));
    el.hand.appendChild(h);
  }
}

function renderEnemyHand(){
  el.aiHand.innerHTML = "";
  const n = state.AI.hand.length;
  const show = Math.min(n, 12);
  for(let i=0;i<show;i++){
    const b = document.createElement("div");
    b.className = "handBack";
    if(state.img.backUrl) b.style.backgroundImage = `url("${state.img.backUrl}")`;
    el.aiHand.appendChild(b);
  }
  if(n > show){
    const more = document.createElement("div");
    more.className = "handBack";
    more.textContent = `+${n-show}`;
    more.style.display = "flex";
    more.style.alignItems = "center";
    more.style.justifyContent = "center";
    more.style.fontWeight = "1000";
    more.style.color = "rgba(233,236,255,.92)";
    el.aiHand.appendChild(more);
  }
}

function renderPiles(){
  setBackTo(el.aiDeckFace);
  setBackTo(el.pDeckFace);

  const aiW = state.AI.wing[state.AI.wing.length-1];
  const aiO = state.AI.outside[state.AI.outside.length-1];
  const pW  = state.P1.wing[state.P1.wing.length-1];
  const pO  = state.P1.outside[state.P1.outside.length-1];

  const setTopFace = (elm, card)=>{
    elm.style.backgroundImage = "";
    elm.style.backgroundColor = "rgba(6,8,14,.55)";
    if(card){
      const url = state.img.cardUrlByNo[pad2(card.no)];
      if(url) elm.style.backgroundImage = `url("${url}")`;
      else elm.style.backgroundImage = "";
      elm.style.backgroundSize = "cover";
      elm.style.backgroundPosition = "center";
    }
  };
  setTopFace(el.aiWingFace, aiW);
  setTopFace(el.aiOutFace, aiO);
  setTopFace(el.pWingFace, pW);
  setTopFace(el.pOutFace, pO);
}

function renderAll(){
  updateHUD();
  updateCounts();
  renderPiles();
  renderZones();
  renderHand();
  renderEnemyHand();
}

/* ---------- Zone buttons ---------- */
function bindZoneButtons(){
  $("aiWingBtn").addEventListener("click", ()=> openZone("ENEMY WING", state.AI.wing.slice().reverse()), {passive:true});
  $("aiOutBtn").addEventListener("click", ()=> openZone("ENEMY OUTSIDE", state.AI.outside.slice().reverse()), {passive:true});
  $("pWingBtn").addEventListener("click", ()=> openZone("YOUR WING", state.P1.wing.slice().reverse()), {passive:true});
  $("pOutBtn").addEventListener("click", ()=> openZone("YOUR OUTSIDE", state.P1.outside.slice().reverse()), {passive:true});
}

/* ---------- Turn & Phase ---------- */
function resetTurnFlags(){
  state.attackedThisTurn.P1 = [false,false,false];
  state.attackedThisTurn.AI = [false,false,false];
  for(const s of ["P1","AI"]){
    for(const c of state[s].C){
      if(c && c.no===12) c.immuneUsedThisTurn = false;
    }
  }
}

function nextPhase(){
  if(state.gameOver) return;
  const you = state.activeSide==="P1";
  if(!you) return;

  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
    state.pending = null;
    say("START", "muted");
  }
  if(next==="DRAW"){
    draw("P1", 1);
    log("あなた：ドロー +1", "muted");
    say("ドロー +1", "ok");
  }
  if(next==="MAIN"){
    say("MAIN：配置/発動", "muted");
  }
  if(next==="BATTLE"){
    say("BATTLE：攻撃者→対象を選択", "muted");
  }
  if(next==="END"){
    say("END：ターン終了できます", "muted");
  }
  updateHUD();
  renderAll();
}

function endTurn(){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  state.pending = null;
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;

  setActiveSide("AI");
  state.phase = "START";
  updateHUD();
  renderAll();
  runAITurn();
}

/* ---------- AI (simple & safe) ---------- */
function aiChooseSummon(){
  const empty = state.AI.C.findIndex(x=>!x);
  if(empty<0) return false;

  const idx = state.AI.hand
    .map((c,i)=>({c,i}))
    .filter(x=>canNormalSummon(x.c))
    .sort((a,b)=>b.c.baseAtk-a.c.baseAtk)[0];

  if(!idx) return false;
  const card = state.AI.hand.splice(idx.i,1)[0];
  state.AI.C[empty]=card;
  log(`AI：登場 → ${card.name}`, "muted");
  onSummonTriggers("AI", card);
  return true;
}

function aiTryEquip(){
  if(!state.AI.C.some(Boolean)) return false;
  const idx = state.AI.hand.findIndex(c=>c.kind==="item");
  if(idx<0) return false;
  const item = state.AI.hand.splice(idx,1)[0];

  let bestPos=-1, bestAtk=-1;
  for(let i=0;i<3;i++){
    const ch = state.AI.C[i];
    if(ch && ch.atk>bestAtk){ bestAtk=ch.atk; bestPos=i; }
  }
  if(bestPos>=0){
    equipItemTo("AI", bestPos, item);
    log(`AI：装備 → ${item.name}（対象：${state.AI.C[bestPos].name}）`, "muted");
    return true;
  }
  moveToWing("AI", item);
  return false;
}

function aiBattle(){
  for(let i=0;i<3;i++){
    if(state.attackedThisTurn.AI[i]) continue;
    const atk = state.AI.C[i];
    if(!atk) continue;

    const playerIdxs = state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(playerIdxs.length){
      const t = playerIdxs[Math.floor(Math.random()*playerIdxs.length)];
      resolveBattle_CvC("AI", i, "P1", t);
      state.attackedThisTurn.AI[i] = true;
    }else{
      const sidx = state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        breakShield("P1", sidx, "AI");
        state.attackedThisTurn.AI[i] = true;
        if(state.P1.shield.every(x=>!x)){
          log("あなたのシールド全破壊：次でダイレクト可能", "warn");
        }
      }else{
        const win = checkDirectAndEnd("AI");
        state.attackedThisTurn.AI[i] = true;
        if(win) return;
      }
    }
  }
}

async function runAITurn(){
  if(state.aiRunning || state.gameOver) return;
  if(state.activeSide !== "AI") return;

  state.aiRunning = true;
  try{
    resetTurnFlags();
    say("相手ターン", "warn");
    log("相手ターン開始", "warn");

    setPhase("START");
    await sleep(220);

    setPhase("DRAW");
    draw("AI", 1);
    log("AI：ドロー +1", "muted");
    await sleep(260);

    setPhase("MAIN");
    aiChooseSummon();
    aiTryEquip();
    await sleep(320);

    setPhase("BATTLE");
    aiBattle();
    await sleep(420);

    setPhase("END");
    await sleep(220);

    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    resetTurnFlags();
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    say(`TURN ${state.turn} あなたのターン`, "ok");
    updateHUD();
    renderAll();

  }finally{
    state.aiRunning = false;
  }
}

/* ---------- Start Game ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  state.pending = null;
  state.gameOver = false;
  state.aiRunning = false;
  resetTurnFlags();

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  state.P1.hand = [];
  state.AI.hand = [];
  draw("P1", 4);
  draw("AI", 4);

  state.P1.C = [null,null,null];
  state.AI.C = [null,null,null];
  state.P1.E = [null,null,null];
  state.AI.E = [null,null,null];
  state.P1.wing = [];
  state.AI.wing = [];
  state.P1.outside = [];
  state.AI.outside = [];

  state.firstSide = (Math.random() < 0.5) ? "P1" : "AI";
  setActiveSide(state.firstSide);

  if(state.firstSide==="P1"){
    el.firstInfo.textContent = "先攻：あなた";
    log("先攻：あなた", "muted");
    say("あなたのターン開始（DRAWで1枚引いて5枚）", "ok");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
    say("相手が先攻です", "warn");
  }

  log("ゲーム開始：お互い手札4 / シールド3（裏向き）", "muted");
  updateHUD();
  renderAll();

  if(state.activeSide==="AI"){
    runAITurn();
  }
}

/* ---------- Start / Buttons / Settings ---------- */
function bindStart(){
  el.boot.textContent = "JS: OK（読み込み成功）";
  const go = ()=>{
    if(state.started) return;
    state.started=true;

    // 画面切替
    el.title.classList.remove("active");
    el.game.classList.add("active");

    // v50002: ゲーム画面にだけフィールド背景を適用
    syncFieldBackgroundVisibility();

    log("対戦画面：表示OK（SCROLL / FIELD FIX）", "muted");
    startGame();
  };
  el.btnStart.addEventListener("click", go, {passive:true});
  el.title.addEventListener("click", go, {passive:true});
}

function bindHUDButtons(){
  el.btnHelp.addEventListener("click", ()=> showModal("helpM"), {passive:true});
  el.btnSettings.addEventListener("click", ()=>{
    el.repoInput.value = getRepo();
    showModal("settingsM");
  }, {passive:true});
}

function bindSettings(){
  el.btnRepoSave.addEventListener("click", async ()=>{
    const v = (el.repoInput.value || "").trim();
    if(!v.includes("/")){
      log("設定NG：owner/repo 形式で入力してください", "warn");
      return;
    }
    setRepo(v);
    clearCache();
    log(`設定：リポジトリ = ${v}`, "muted");
    await rescanImages();
  }, {passive:true});

  el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});

  el.btnClearCache.addEventListener("click", ()=>{
    clearCache();
    log("画像キャッシュを消去しました", "muted");
    state.img.ready=false;
    state.img.cardUrlByNo = {};
    state.img.backUrl = "";
    state.img.fieldUrl = "";
    syncFieldBackgroundVisibility();
    renderAll();
  }, {passive:true});
}

function bindPhaseButtons(){
  el.btnNext.addEventListener("click", (e)=>{
    e.preventDefault();
    nextPhase();
  }, {passive:false});

  el.btnEnd.addEventListener("click", (e)=>{
    e.preventDefault();
    endTurn();
  }, {passive:false});
}

function bindLogButton(){
  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 320);
}

function bindCloseFix(){
  document.addEventListener("touchmove", ()=>{}, {passive:true});
}

/* ---------- init ---------- */
async function init(){
  el.boot.textContent = "JS: OK（初期化中…）";
  updateHUD();

  // v50002: 初期は「タイトル」なので背景を必ず消す
  clearFieldBackground();

  bindStart();
  bindHUDButtons();
  bindSettings();
  bindPhaseButtons();
  bindZoneButtons();
  bindLogButton();
  bindCloseFix();

  const cache = getCache();
  if(cache && cache.assetFiles && cache.cardFiles && cache.repo === getRepo()){
    log("画像：キャッシュを使用（必要なら設定→再取得）", "muted");
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  // v50002: ここでも「開始前」は背景を出さないことを保証
  syncFieldBackgroundVisibility();

  el.boot.textContent = "JS: OK（準備完了）";
  say("準備完了", "ok");
  log("SCROLL版：iPhone/iPad両対応 / 裏面自動検出 / フィールドはゲーム内のみ", "muted");
}

document.addEventListener("DOMContentLoaded", init);