/* =========================================================
  Manpuku World - v40007
  FIX (iPhone/iPad):
   - YOUR C / YOUR E が 1枠しか見えない問題を根本修正：
     HTMLのgridをspan構造にし、slotsを3列gridで固定。
   - 裏面 card_back.png.PNG を含む “二重拡張子” を検出して適用。
   - デッキ/両シールド/相手手札に裏面を表示（未検出なら黒）。
   - ウィング/アウトサイドは裏面を貼らず「ゾーン」表示（タップで一覧）。
   - 初期手札は双方4枚。先行もDRAWで+1して5枚に。
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  announce: $("announce"),

  btnHelp: $("btnHelp"),
  btnSettings: $("btnSettings"),
  btnNext: $("btnNext"),
  btnEnd: $("btnEnd"),
  btnLog: $("btnLog"),

  matRoot: $("matRoot"),
  fieldTop: $("fieldTop"),
  fieldBottom: $("fieldBottom"),

  aiC: $("aiC"),
  aiE: $("aiE"),
  pC: $("pC"),
  pE: $("pE"),
  hand: $("hand"),
  aiHand: $("aiHand"),

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

/* ---------- Announce ---------- */
let announceTimer = null;
function announce(html, ms=2400){
  el.announce.innerHTML = html || "";
  clearTimeout(announceTimer);
  if(ms>0){
    announceTimer = setTimeout(()=> { el.announce.innerHTML=""; }, ms);
  }
}

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v5";

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}

/* =========================================================
   Card Data (No.01〜20) - machine friendly
   ※ATK/rank は暫定（後でご主人様の定義に合わせて調整可能）
========================================================= */
const CARD_DB = [
  { no:1,  name:"黒の魔法使いクルエラ", type:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。"
    ],
  },
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ステージに「クルエラ」がある時、手札から発動できる。相手ステージのキャラクター1体を選び、効果を1つ選択する。",
      "（A）相手ステージのATKが1番高いキャラクター1体をウイングに送る。",
      "（B）相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    ],
  },
  { no:3,  name:"トナカイの少女ニコラ", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ],
  },
  { no:4,  name:"聖ラウス", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードが登場した時、デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    ],
  },
  { no:5,  name:"統括AI タータ", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:[
      "このカードが登場した時、デッキから2枚ドローする。",
      "自分ターンに1度発動できる。手札から2枚までウイングに送り、その後同枚数だけタイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ],
  },
  { no:6,  name:"麗し令嬢エフィ", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体のATK-1000。"
    ],
  },
  { no:7,  name:"狩猟まひる", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "（テキスト確定待ち：仮）"
    ],
  },
  { no:8,  name:"組織の男 手形", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "相手ターンに1度発動できる。相手が発動した効果を無効にする。"
    ],
  },
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:[
      "このカードが自分ステージに存在する時、手札の「小次郎」カードを見参させる。",
      "自分ステージに「小次郎」がある時ATK+500。"
    ],
  },
  { no:10, name:"小次郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:[
      "このカードが自分ステージに存在する時、手札の「小太郎」カードを見参させる。",
      "自分ステージに「小太郎」がある時ATK+500。"
    ],
  },
  { no:11, name:"司令", type:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードが登場した時、自分ステージのキャラクター1体を選び、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"
    ],
  },
  { no:12, name:"班目プロデューサー", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードは1ターンに1度、バトルでは破壊されない。"
    ],
  },
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ステージに存在する時、このカードをウイングに送り、相手ステージのキャラクター1体を選び、このターンの終わりまでATK-1000。（相手ターンでも可）"
    ],
  },
  { no:14, name:"記憶抹消", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてこのカードをウイングに送る。"
    ],
  },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分・相手のキャラクターがバトルする時、手札から発動できる。自分ステージのキャラクター1体を選び、このターンの終わりまでATK+1000。"
    ],
  },
  { no:16, name:"力こそパワー！！", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選び、ウイングに送る。"
    ],
  },
  { no:17, name:"キャトルミューティレーション", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を手札に戻す。"
    ],
  },
  { no:18, name:"a-xブラスター01 -放射型-", type:"item", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選び装備する。ATK+500。",
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500し、相手ターン開始時に相手の手札を1枚ランダムにウイングに送る。"
    ],
  },
  { no:19, name:"-聖剣- アロングダイト", type:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選び装備する。ATK+500。",
      "タグ「勇者」「剣士」が装備した場合さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    ],
  },
  { no:20, name:"普通の棒", type:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選び装備する。ATK+300。",
      "タグ「勇者」が装備した場合さらにATK+500。"
    ],
  },
];

function baseStatsByNo(no){
  // 暫定：ご主人様の最終ATK/Rankが決まり次第ここを置換できます
  const rank = ((no-1)%5)+1;
  const atk = rank*500;
  return { rank, atk };
}

function makeCard(no){
  const def = CARD_DB.find(x=>x.no===no) || {no, name:`カード${no}`, type:"character", tags:[], titleTag:"", effects:["（未定義）"]};
  const st = baseStatsByNo(no);
  return {
    uid: `${no}_${Math.random().toString(16).slice(2)}`,
    no,
    name: def.name,
    type: def.type, // character / effect / item
    tags: def.tags || [],
    titleTag: def.titleTag || "",
    effects: def.effects || [],
    rank: st.rank,
    baseAtk: st.atk,
    atkMod: 0, // temporary buffs/debuffs
    equips: [], // item cards attached
    attackedThisTurn: false,
  };
}
function currentAtk(card){
  if(!card) return 0;
  const equipAtk = (card.equips||[]).reduce((s,it)=> s + (it.equipAtk||0), 0);
  return (card.baseAtk||0) + (card.atkMod||0) + equipAtk;
}

/* ---------- Starter deck (20 types x2) ---------- */
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck = [];
  for(let no=1; no<=20; no++){
    deck.push(makeCard(no));
    deck.push(makeCard(no));
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

  // pending interaction
  pending: null, // {kind, ...}

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: {
    fieldUrl:"",
    backUrl:"",
    cardUrlByNo:{},
    cardFileByNo:{},
    ready:false,
  },

  aiRunning:false,
};

/* ---------- UI helpers ---------- */
function setActiveUI(){
  const you = (state.activeSide==="P1");
  el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
  el.chipActive.classList.toggle("enemy", !you);
  el.btnNext.disabled = !you;
  el.btnEnd.disabled  = !you;
  el.btnNext.style.opacity = you ? "1" : ".45";
  el.btnEnd.style.opacity  = you ? "1" : ".45";
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

  $("enemyHandLabel").textContent = `ENEMY HAND ×${state.AI.hand.length}`;
}

/* ---------- GitHub image scan ---------- */
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
  const cand = ["field.png.jpg","field.jpg","field.png","field.jpeg","field.PNG","field.JPG","field.png.PNG","field.jpg.JPG"];
  for(const c of cand){
    const k = assetFiles.findIndex(n=>n.toLowerCase() === c.toLowerCase());
    if(k>=0) return assetFiles[k];
  }
  return "";
}
function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());

  // 最優先：card_back.*（二重拡張子も許容）
  for(let i=0;i<assetFiles.length;i++){
    const s = lowers[i];
    if(s.startsWith("card_back.")) return assetFiles[i];
    if(s.startsWith("cardback.")) return assetFiles[i];
    // ご主人様のケース：card_back.png.PNG など
    if(s.startsWith("card_back") && s.includes(".")) return assetFiles[i];
  }
  // 次点：back.*
  for(let i=0;i<assetFiles.length;i++){
    const s = lowers[i];
    if(s.startsWith("back.")) return assetFiles[i];
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
  if(s.includes(".png.jpg") || s.includes(".png.jpeg") || s.includes(".png.png") || s.includes(".jpg.jpg")) score += 6;
  if(s.endsWith(".png.jpg") || s.endsWith(".png.jpeg") || s.endsWith(".png.png") || s.endsWith(".jpg.jpg")) score += 8;
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
function stripExtAll(name){
  let base = name;
  for(let i=0;i<4;i++){
    const dot = base.lastIndexOf(".");
    if(dot <= 0) break;
    const ext = base.slice(dot+1).toLowerCase();
    if(["png","jpg","jpeg","webp","gif"].includes(ext)) base = base.slice(0,dot);
    else break;
  }
  return base;
}
function nameFromFilename(filename, no){
  let base = stripExtAll(filename);
  base = base.replace(new RegExp(`^${pad2(no)}_`), "");
  base = base.replace(new RegExp(`^${no}_`), "");
  base = base.replaceAll("_"," ");
  base = base.trim();
  return base || (CARD_DB.find(c=>c.no===no)?.name ?? `カード${no}`);
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
    else log("裏面：未設定（黒い裏面で動作）", "warn");

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

  // field
  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)){
      state.img.fieldUrl = u;
      el.fieldTop.style.backgroundImage = `url("${u}")`;
      el.fieldBottom.style.backgroundImage = `url("${u}")`;
      log("OK フィールド読込：上下同時表示", "muted");
    }else{
      state.img.fieldUrl = "";
      el.fieldTop.style.backgroundImage = "";
      el.fieldBottom.style.backgroundImage = "";
      log(`NG フィールド読込失敗: ${u}`, "warn");
    }
  }else{
    state.img.fieldUrl = "";
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
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
  }

  // cards
  state.img.cardUrlByNo = {};
  state.img.cardFileByNo = {};
  const map = cache.cardMap || {};
  for(const k of Object.keys(map)){
    const file = map[k];
    state.img.cardFileByNo[k] = file;
    state.img.cardUrlByNo[k] = vercelPathCards(file);
  }

  // also update CARD_DB names from filenames if present
  for(let no=1; no<=20; no++){
    const k = pad2(no);
    const fn = map[k];
    if(fn){
      const nm = nameFromFilename(fn, no);
      const row = CARD_DB.find(c=>c.no===no);
      if(row) row.name = nm;
    }
  }

  state.img.ready = true;

  const miss = [];
  for(let no=1; no<=20; no++){
    const key = pad2(no);
    if(!state.img.cardUrlByNo[key]) miss.push(key);
  }
  if(miss.length) log(`カード画像未検出：${miss.join(", ")}`, "warn");
  else log("カード画像：20種すべて検出", "muted");

  renderAll();
}

/* ---------- Rendering helpers ---------- */
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
  const atk = currentAtk(card);
  el.viewerTitle.textContent = `${card.name}`;
  const lines = [];
  lines.push(`TYPE: ${card.type.toUpperCase()}`);
  lines.push(`RANK: ${card.rank} / ATK: ${atk}（現在） / BASE: ${card.baseAtk}`);
  if(card.equips && card.equips.length){
    lines.push(`装備: ${card.equips.map(x=>x.name).join(" / ")}`);
  }
  lines.push("");
  for(const ef of (card.effects||[])){
    lines.push(`・${normalizeText(ef)}`);
  }
  el.viewerText.textContent = lines.join("\n");

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
      s.textContent = `RANK ${c.rank} / ATK ${currentAtk(c)}`;

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

/* ---------- Core mechanics ---------- */
function setActiveSide(side){
  state.activeSide = side;
  setActiveUI();
}
function setPhase(p){
  state.phase = p;
  updateHUD();
  renderAll();
}

function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（ドロー不能）`, "warn");
      announce(`<strong>${side==="P1"?"敗北":"勝利"}</strong>：デッキ切れ`, 0);
      return false;
    }
    p.hand.push(p.deck.shift());
  }
  return true;
}

function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限でウイングへ → ${c.name}`, "muted");
  }
}

function moveToWing(side, card){
  if(!card) return;
  // equipも一緒に破壊（要望）
  if(card.equips && card.equips.length){
    for(const it of card.equips){
      state[side].wing.push(it);
      log(`${side==="P1"?"あなた":"AI"}：装備も破壊 → ${it.name}`, "muted");
    }
    card.equips = [];
  }
  state[side].wing.push(card);
}

function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  const aAtk = currentAtk(A);
  const dAtk = currentAtk(D);

  // 1ターン1回攻撃
  if(A.attackedThisTurn){
    log("このキャラクターは既に攻撃済みです", "warn");
    announce("このキャラクターは<strong>このターン攻撃済み</strong>です。", 1800);
    return;
  }

  A.attackedThisTurn = true;

  log(`バトル：${A.name}(${aAtk}) vs ${D.name}(${dAtk})`, "muted");

  // No.12：1ターン1度バトル破壊されない（簡易）
  const dImmune = (D.no===12 && !D._immuneUsed);
  const aImmune = (A.no===12 && !A._immuneUsed);

  if(aAtk === dAtk){
    if(aImmune){
      A._immuneUsed = true;
      moveToWing(dSide, D);
      state[dSide].C[dPos]=null;
      log("班目：相打ちを耐えて勝利（仮）", "muted");
      return;
    }
    if(dImmune){
      D._immuneUsed = true;
      moveToWing(aSide, A);
      state[aSide].C[aPos]=null;
      log("班目：相打ちを耐えて勝利（仮）", "muted");
      return;
    }
    state[aSide].C[aPos]=null;
    state[dSide].C[dPos]=null;
    moveToWing(aSide, A);
    moveToWing(dSide, D);
    log("同値処理：相打ち（両方ウイング）", "muted");
    return;
  }

  if(aAtk > dAtk){
    if(dImmune){
      D._immuneUsed = true;
      log("班目：バトル破壊を1回無効", "muted");
      announce("班目：<strong>バトル破壊を無効</strong>", 1800);
      return;
    }
    state[dSide].C[dPos]=null;
    moveToWing(dSide, D);
    log(`破壊：${D.name} → ウイング`, "muted");

    // No.19: 勝利ドロー（タグ判定は後で拡張）
    if(A.equips?.some(it=>it.no===19)){
      draw(aSide,1);
      log("アロングダイト：撃破ドロー +1", "muted");
      announce("アロングダイト：<strong>撃破ドロー +1</strong>", 1800);
    }
  }else{
    if(aImmune){
      A._immuneUsed = true;
      log("班目：バトル破壊を1回無効", "muted");
      announce("班目：<strong>バトル破壊を無効</strong>", 1800);
      return;
    }
    state[aSide].C[aPos]=null;
    moveToWing(aSide, A);
    log(`破壊：${A.name} → ウイング`, "muted");
  }
}

/* ---------- Effects (minimal but functional core) ---------- */
function hasOnStage(side, name){
  const p = state[side];
  return p.C.some(c=>c && c.name.includes(name)) || p.E.some(c=>c && c.name.includes(name));
}
function searchFromDeckOrWing(side, predicate){
  const p = state[side];
  // preference: deck first
  let idx = p.deck.findIndex(predicate);
  if(idx>=0){
    const c = p.deck.splice(idx,1)[0];
    return c;
  }
  idx = p.wing.findIndex(predicate);
  if(idx>=0){
    const c = p.wing.splice(idx,1)[0];
    return c;
  }
  return null;
}

function startSelectTarget(kind, payload){
  state.pending = { kind, ...payload };
  renderAll();
}

function clearPending(){
  state.pending = null;
  announce("");
  renderAll();
}

/* ---------- AI logic (simple, avoids illegal item-only board) ---------- */
function aiMain(){
  // 1) キャラがいないならキャラ優先で出す
  const emptyC = state.AI.C.findIndex(x=>!x);
  if(emptyC>=0){
    const idxChar = state.AI.hand.findIndex(c=>c.type==="character" && !isKensanOnly(c));
    if(idxChar>=0){
      const c = state.AI.hand.splice(idxChar,1)[0];
      state.AI.C[emptyC]=c;
      log(`AI：登場 → ${c.name}`, "muted");
      // ラウス/タータの登場時効果（簡易）
      if(c.no===4){
        const found = searchFromDeckOrWing("AI", x=> (x.tags||[]).includes("クランプス"));
        if(found){ state.AI.hand.push(found); log("AI：ラウス効果（クランプスサーチ）", "muted"); }
      }
      if(c.no===5){
        draw("AI",2);
        log("AI：タータ効果（ドロー2）", "muted");
      }
    }
  }

  // 2) キャラがいるなら装備(item)を1枚だけ装備（空発動禁止）
  if(state.AI.C.some(Boolean)){
    const idxItem = state.AI.hand.findIndex(c=>c.type==="item");
    if(idxItem>=0){
      const it = state.AI.hand.splice(idxItem,1)[0];
      const target = state.AI.C.find(c=>!!c);
      if(target){
        equipItem("AI", target, it);
        log(`AI：装備 → ${it.name}`, "muted");
      }
    }
  }

  // 3) エフェクトは条件が合えば使用（即時→ウイング）
  const idxFx = state.AI.hand.findIndex(c=>c.type==="effect");
  if(idxFx>=0){
    const fx = state.AI.hand[idxFx];
    // フレイムバレットはクルエラがいなければ撃てない
    if(fx.no===2 && !hasOnStage("AI","クルエラ")) return;
    state.AI.hand.splice(idxFx,1);
    resolveEffectImmediate("AI", fx);
  }
}

function aiBattle(){
  for(let i=0;i<3;i++){
    const atk = state.AI.C[i];
    if(!atk) continue;
    if(atk.attackedThisTurn) continue;
    const playerIdxs = state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(playerIdxs.length){
      const t = playerIdxs[Math.floor(Math.random()*playerIdxs.length)];
      resolveBattle_CvC("AI", i, "P1", t);
    }else{
      // シールド破壊（裏向き→手札）
      const sidx = state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        const sh = state.P1.shield[sidx];
        state.P1.shield[sidx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊 → あなた手札へ ${sh.name}`, "warn");
      }else{
        announce("<strong>敗北</strong>：ダイレクトアタック", 0);
        log("敗北：ダイレクトアタック", "warn");
      }
      atk.attackedThisTurn = true;
    }
  }
}

async function runAITurn(){
  if(state.aiRunning) return;
  if(state.activeSide !== "AI") return;

  state.aiRunning = true;
  try{
    log("相手ターン開始", "warn");
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
    clearPending();

    // reset attack flags
    for(const c of state.AI.C){ if(c){ c.attackedThisTurn=false; c._immuneUsed=false; } }
    for(const c of state.P1.C){ if(c){ c._immuneUsed=false; } }

    setPhase("START");
    await sleep(220);

    setPhase("DRAW");
    draw("AI", 1);
    log("AI：ドロー +1", "muted");
    renderAll();
    await sleep(260);

    // a-x ブラスター装備の追加効果（射手）などは後でタグ確定後に拡張可

    setPhase("MAIN");
    aiMain();
    renderAll();
    await sleep(320);

    setPhase("BATTLE");
    aiBattle();
    renderAll();
    await sleep(380);

    setPhase("END");
    enforceHandLimit("AI");
    renderAll();
    await sleep(260);

    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    updateHUD();
    renderAll();

  }finally{
    state.aiRunning = false;
  }
}

/* ---------- Summon restrictions ---------- */
function isKensanOnly(card){
  return [1,3,6].includes(card.no);
}
function canPlaceToZone(card, zone){
  if(zone==="C") return card.type==="character";
  if(zone==="E") return card.type==="effect" || card.type==="item";
  return false;
}

/* ---------- Equip / Effect ---------- */
function equipItem(side, targetChar, itemCard){
  if(!targetChar || !itemCard) return;
  // 暫定：装備ATK
  let add = 0;
  if(itemCard.no===18) add = 500;
  if(itemCard.no===19) add = 500;
  if(itemCard.no===20) add = 300;
  if(itemCard.no===11) add = 500;
  itemCard.equipAtk = add;
  targetChar.equips = targetChar.equips || [];
  targetChar.equips.push(itemCard);
}

function resolveEffectImmediate(side, fx){
  const you = side==="P1";
  // フレイムバレット
  if(fx.no===2){
    if(!hasOnStage(side,"クルエラ")){
      log("フレイムバレット：クルエラ不在で発動不可 → 取消", "warn");
      announce("フレイムバレット：<strong>クルエラが必要</strong>", 2200);
      // 取消扱い：手札に戻す
      state[side].hand.push(fx);
      return;
    }
    // 選択UI（A/B）
    announce("フレイムバレット：<strong>効果を選んでください</strong>（LOG参照でも可）", 0);
    askConfirm("フレイムバレット", "効果A（最大ATKを1体破壊）を選びますか？\nキャンセルで効果B（rank4以下全破壊）", ()=>{
      const enemy = (side==="P1") ? "AI" : "P1";
      if(true){
        // A
        const candidates = state[enemy].C.filter(Boolean);
        if(!candidates.length){ log("フレイムバレット：対象なし", "warn"); }
        else{
          let bestPos = -1, bestAtk = -999;
          for(let i=0;i<3;i++){
            const c = state[enemy].C[i];
            if(!c) continue;
            const a = currentAtk(c);
            if(a>bestAtk){ bestAtk=a; bestPos=i; }
          }
          if(bestPos>=0){
            const killed = state[enemy].C[bestPos];
            state[enemy].C[bestPos]=null;
            moveToWing(enemy, killed);
            log(`フレイムバレット：最大ATK破壊 → ${killed.name}`, "muted");
          }
        }
        // effect used -> wing
        moveToWing(side, fx);
        announce("フレイムバレット：<strong>発動</strong>（ウイングへ）", 1800);
        renderAll();
      }
    });
    // キャンセルでBにしたいが confirm modal の仕様上、簡略化：
    // ご主人様が必要なら「選択モーダル」に差し替えます
    // ここでは：OK= A / キャンセル=B を実装
    el.btnNo.onclick = ()=>{
      hideModal("confirmM");
      const enemy = (side==="P1") ? "AI" : "P1";
      for(let i=0;i<3;i++){
        const c = state[enemy].C[i];
        if(c && c.rank<=4){
          state[enemy].C[i]=null;
          moveToWing(enemy, c);
        }
      }
      moveToWing(side, fx);
      log("フレイムバレット：rank4以下を全破壊", "muted");
      announce("フレイムバレット：<strong>発動</strong>（ウイングへ）", 1800);
      renderAll();
      el.btnNo.onclick = ()=> hideModal("confirmM");
    };
    return;
  }

  // 力こそパワー！！
  if(fx.no===16){
    if(state.phase!=="MAIN" || state.activeSide!==side){
      log("力こそパワー：自分ターンのみ", "warn");
      state[side].hand.push(fx);
      return;
    }
    const enemy = (side==="P1") ? "AI" : "P1";
    let bestPos=-1, bestAtk=999999;
    for(let i=0;i<3;i++){
      const c = state[enemy].C[i];
      if(!c) continue;
      const a=currentAtk(c);
      if(a<bestAtk){ bestAtk=a; bestPos=i; }
    }
    if(bestPos>=0){
      const killed = state[enemy].C[bestPos];
      state[enemy].C[bestPos]=null;
      moveToWing(enemy, killed);
      log(`力こそパワー：最小ATK破壊 → ${killed.name}`, "muted");
      announce("力こそパワー：<strong>発動</strong>", 1800);
    }else{
      log("力こそパワー：対象なし", "warn");
    }
    moveToWing(side, fx);
    renderAll();
    return;
  }

  // 記憶抹消 / 手形 / キャトルミューティレーション などは「割り込み」系のため、
  // 現段階ではログに残し、次段でスタック処理を入れます（ただし発動自体は可能）
  moveToWing(side, fx);
  log(`${fx.name}：発動（処理は簡易）→ ウイング`, "muted");
  announce(`${fx.name}：<strong>発動</strong>`, 1600);
  renderAll();
}

/* ---------- Player interactions ---------- */
function resetAttackFlags(side){
  for(const c of state[side].C){
    if(c){
      c.attackedThisTurn=false;
      c._immuneUsed=false;
      // 一時ATK補正は「ターン終了で戻す」方針（必要なら）
    }
  }
}

function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  // pending: kensan cost selection on stage
  if(state.pending?.kind==="kensan_cost"){
    // stage card as cost
    const c = state.P1.C[pos];
    if(!c) return;
    payKensanCostFromStage("C", pos);
    return;
  }

  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];
    if(!canPlaceToZone(card,"C")){
      announce("このカードは<strong>Cに置けません</strong>（キャラクターのみ）", 1800);
      log("C：キャラクター以外は配置不可", "warn");
      return;
    }

    // kensan-only
    if(isKensanOnly(card)){
      announce("<strong>見参</strong>：コストにするカードを1枚選択してください（手札またはステージ）", 0);
      startSelectTarget("kensan_cost", { summonPos: pos, handIndex: state.selectedHandIndex });
      return;
    }

    // normal summon
    state.P1.C[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    log(`登場：${card.name}`, "muted");

    // on-summon effects (部分実装)
    if(card.no===4){
      const found = searchFromDeckOrWing("P1", x=> (x.tags||[]).includes("クランプス"));
      if(found){
        state.P1.hand.push(found);
        log("ラウス効果：クランプスサーチ +1", "muted");
        announce("ラウス：<strong>クランプスをサーチ</strong>", 1800);
      }else{
        log("ラウス効果：対象なし", "warn");
      }
    }
    if(card.no===5){
      draw("P1",2);
      log("タータ効果：ドロー2", "muted");
      announce("タータ：<strong>ドロー2</strong>", 1800);
    }

    renderAll();
    return;
  }

  if(state.phase === "BATTLE"){
    if(!state.P1.C[pos]) return;
    const me = state.P1.C[pos];
    if(me.attackedThisTurn){
      announce("このキャラクターは<strong>このターン攻撃済み</strong>です。", 1800);
      return;
    }
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }
}

function payKensanCostFromHand(costHandIndex){
  const pend = state.pending;
  if(!pend || pend.kind!=="kensan_cost") return;
  const summonCard = state.P1.hand[pend.handIndex];
  if(!summonCard) { clearPending(); return; }

  if(costHandIndex===pend.handIndex){
    announce("そのカード自身はコストにできません。", 1600);
    return;
  }
  const cost = state.P1.hand.splice(costHandIndex,1)[0];
  moveToWing("P1", cost);

  // summon
  state.P1.C[pend.summonPos] = summonCard;
  state.P1.hand.splice(pend.handIndex > costHandIndex ? pend.handIndex-1 : pend.handIndex, 1);

  log(`見参：${summonCard.name}（コスト→${cost.name}）`, "muted");
  announce(`<strong>見参</strong>：${summonCard.name}`, 1600);
  state.selectedHandIndex = null;
  clearPending();
}

function payKensanCostFromStage(zone, pos){
  const pend = state.pending;
  if(!pend || pend.kind!=="kensan_cost") return;
  const summonCard = state.P1.hand[pend.handIndex];
  if(!summonCard) { clearPending(); return; }

  let cost = null;
  if(zone==="C"){
    cost = state.P1.C[pos];
    if(!cost) return;
    state.P1.C[pos] = null;
  }
  if(zone==="E"){
    cost = state.P1.E[pos];
    if(!cost) return;
    state.P1.E[pos] = null;
  }
  moveToWing("P1", cost);

  // summon
  state.P1.C[pend.summonPos] = summonCard;
  state.P1.hand.splice(pend.handIndex,1);

  log(`見参：${summonCard.name}（コスト→${cost.name}）`, "muted");
  announce(`<strong>見参</strong>：${summonCard.name}`, 1600);
  state.selectedHandIndex = null;
  clearPending();
}

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;

  if(state.pending?.kind==="kensan_cost"){
    const c = state.P1.E[pos];
    if(!c) return;
    payKensanCostFromStage("E", pos);
    return;
  }

  if(state.phase !== "MAIN") return;
  if(state.selectedHandIndex==null) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!canPlaceToZone(card,"E")){
    announce("このカードは<strong>Eに置けません</strong>（アイテム/エフェクトのみ）", 1800);
    log("E：キャラクターは配置不可", "warn");
    return;
  }

  // Eは最大3枠。空きへ置く
  if(state.P1.E[pos]) return;

  // effect: 置いたら即発動→ウイング
  if(card.type==="effect"){
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    log(`発動：${card.name}`, "muted");
    announce(`${card.name}：<strong>発動</strong>（解決します）`, 1600);
    resolveEffectImmediate("P1", card);
    return;
  }

  // item: まずEに置く→装備先選択（キャラが必要）
  if(card.type==="item"){
    if(!state.P1.C.some(Boolean)){
      announce("装備先の<strong>キャラクターが必要</strong>です。", 2000);
      log("アイテム：キャラ不在で装備不可", "warn");
      return;
    }
    // 一旦Eに置く
    state.P1.E[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;

    announce("<strong>装備</strong>：装備するキャラクターを選択してください（YOUR Cをタップ）", 0);
    startSelectTarget("equip_target", { ePos: pos });
    renderAll();
    return;
  }
}

function onClickYourC_forEquip(pos){
  if(state.pending?.kind!=="equip_target") return false;
  const target = state.P1.C[pos];
  if(!target) return true;

  const it = state.P1.E[state.pending.ePos];
  if(!it){
    clearPending();
    return true;
  }
  // 装備：Eから外してキャラへ
  state.P1.E[state.pending.ePos] = null;
  equipItem("P1", target, it);
  log(`装備：${it.name} → ${target.name}`, "muted");
  announce(`装備：<strong>${target.name}</strong>`, 1800);
  clearPending();
  return true;
}

function onClickEnemyCard(enemyPos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  const defCard = state.AI.C[enemyPos];
  if(!atkCard || !defCard) return;

  askConfirm("攻撃確認", `${atkCard.name} → ${defCard.name}\n攻撃しますか？`, ()=>{
    resolveBattle_CvC("P1", state.selectedAttackerPos, "AI", enemyPos);
    state.selectedAttackerPos = null;
    renderAll();
  });
}

function onClickEnemyShield(idx){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atkCard = state.P1.C[state.selectedAttackerPos];
  if(!atkCard) return;

  if(atkCard.attackedThisTurn){
    announce("このキャラクターは<strong>このターン攻撃済み</strong>です。", 1800);
    return;
  }

  const enemyHasC = state.AI.C.some(Boolean);
  if(enemyHasC){
    log("相手キャラがいる間はシールドを攻撃できません", "warn");
    announce("相手キャラがいる間は<strong>シールド攻撃不可</strong>", 1800);
    return;
  }
  if(!state.AI.shield[idx]){
    log("そのシールドは既にありません", "warn");
    return;
  }

  askConfirm("攻撃確認", `${atkCard.name} がシールドを攻撃します。\n破壊（→相手手札）しますか？`, ()=>{
    const sh = state.AI.shield[idx];
    state.AI.shield[idx] = null;
    state.AI.hand.push(sh);
    atkCard.attackedThisTurn = true;
    log(`シールド破壊：相手手札へ → ${sh.name}`, "muted");

    if(state.AI.shield.every(x=>!x)){
      log("相手シールド全破壊：次の攻撃でダイレクト可能", "muted");
      announce("相手シールドが<strong>すべて破壊</strong>されました。", 2200);
    }

    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- Render parts ---------- */
function renderZones(){
  // enemy E
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    const slot = makeSlot(state.AI.E[i], {enemy:true});
    el.aiE.appendChild(slot);
  }

  // enemy C
  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  // your C
  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const sel = (state.selectedAttackerPos===i);
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {glow, sel});

    slot.addEventListener("click", ()=>{
      if(onClickYourC_forEquip(i)) return;
      onClickYourC(i);
    }, {passive:true});

    el.pC.appendChild(slot);
  }

  // your E
  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {glow});
    slot.addEventListener("click", ()=> onClickYourE(i), {passive:true});
    el.pE.appendChild(slot);
  }
}

function renderHand(){
  el.hand.innerHTML = "";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className = "handCard";

    const playable = (state.activeSide==="P1" && state.phase==="MAIN");
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}")`;
    }else{
      // fallback
      h.style.backgroundImage = "";
    }

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1") return;

      // pending kensan cost selection by hand
      if(state.pending?.kind==="kensan_cost"){
        payKensanCostFromHand(i);
        return;
      }

      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;

      const card = state.P1.hand[state.selectedHandIndex ?? i];
      if(state.selectedHandIndex!=null){
        const zoneHint = (card.type==="character") ? "C" : "E";
        announce(`選択：<strong>${card.name}</strong> → 置き先：${zoneHint}`, 1600);
      }else{
        announce("");
      }

      renderAll();
    }, {passive:true});

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
    if(state.img.backUrl){
      b.style.backgroundImage = `url("${state.img.backUrl}")`;
    }else{
      b.style.backgroundImage = "";
      b.style.backgroundColor = "#070914";
    }
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

function ensureShieldCountBadge(cell){
  let b = cell.querySelector(".shieldCount");
  if(!b){
    b = document.createElement("div");
    b.className = "shieldCount";
    cell.appendChild(b);
  }
  return b;
}

function renderShields(){
  const nodes = document.querySelectorAll(".shieldSlot");
  nodes.forEach((cell)=>{
    const side = cell.getAttribute("data-side");
    const idx = Number(cell.getAttribute("data-idx") || "0");
    const back = cell.querySelector(".backCard");
    const sh = state[side].shield[idx];
    const exists = !!sh;

    back.classList.toggle("empty", !exists);

    if(exists){
      if(state.img.backUrl){
        back.style.backgroundImage = `url("${state.img.backUrl}")`;
        back.style.backgroundColor = "transparent";
      }else{
        back.style.backgroundImage = "";
        back.style.backgroundColor = "#070914";
      }
    }else{
      back.style.backgroundImage = "";
      back.style.backgroundColor = "#070914";
    }

    const count = state[side].shield.filter(Boolean).length;
    const badge = ensureShieldCountBadge(cell);
    badge.textContent = `${count}/3`;

    cell.onclick = ()=> { if(side==="AI") onClickEnemyShield(idx); };
  });
}

function renderAll(){
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
}

/* ---------- Board clicks (zones) ---------- */
function bindBoardClicks(){
  const grid = $("grid");
  grid.addEventListener("click", (e)=>{
    const cell = e.target.closest(".cell");
    if(!cell) return;
    const act = cell.getAttribute("data-click");
    if(!act) return;

    // Deck: 裏面表示だけ（一覧は出さない）
    if(act==="aiDeck"){ announce("ENEMY DECK", 1200); return; }
    if(act==="pDeck"){ announce("YOUR DECK", 1200); return; }

    // Wing/Outside: 表向きの最新が溜まる（一覧表示）
    if(act==="aiWing") openZone("ENEMY WING", state.AI.wing.slice().reverse());
    if(act==="aiOutside") openZone("ENEMY OUTSIDE", state.AI.outside.slice().reverse());
    if(act==="pWing") openZone("YOUR WING", state.P1.wing.slice().reverse());
    if(act==="pOutside") openZone("YOUR OUTSIDE", state.P1.outside.slice().reverse());
  }, {passive:true});
}

/* ---------- Phase Buttons ---------- */
function nextPhase(){
  if(state.activeSide!=="P1") return;

  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    // reset for new cycle
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
    clearPending();
    resetAttackFlags("P1");
    announce("START", 700);
  }
  if(next==="DRAW"){
    draw("P1", 1);
    log("あなた：ドロー +1", "muted");
    announce("<strong>ドロー +1</strong>", 1200);
  }
  if(next==="END"){
    enforceHandLimit("P1");
    // 一時ATK補正を戻す（ターンバフ/デバフ）
    for(const c of state.P1.C){ if(c){ c.atkMod = 0; } }
    announce("END", 700);
  }

  updateHUD();
  renderAll();
}

function endTurn(){
  if(state.activeSide!=="P1") return;

  enforceHandLimit("P1");
  for(const c of state.P1.C){ if(c){ c.atkMod = 0; } }

  setActiveSide("AI");
  state.phase = "START";
  update_toggle_for_ai();
  updateHUD();
  renderAll();
  runAITurn();
}

function update_toggle_for_ai(){
  // placeholder (kept for safety)
}

/* ---------- Start Game ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  state.aiRunning = false;
  clearPending();

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  // shield: top3
  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  // hand:4 (双方4枚)
  state.P1.hand = [];
  state.AI.hand = [];
  draw("P1", 4);
  draw("AI", 4);

  // reset zones
  state.P1.C = [null,null,null];
  state.AI.C = [null,null,null];
  state.P1.E = [null,null,null];
  state.AI.E = [null,null,null];
  state.P1.wing = [];
  state.AI.wing = [];
  state.P1.outside = [];
  state.AI.outside = [];

  // random first
  state.firstSide = (Math.random() < 0.5) ? "P1" : "AI";
  setActiveSide(state.firstSide);

  if(state.firstSide==="P1"){
    el.firstInfo.textContent = "先攻：あなた";
    log("先攻：あなた", "muted");
    announce("先攻：<strong>あなた</strong>（DRAWで+1）", 2400);
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
    announce("先攻：<strong>相手</strong>", 2400);
  }

  log("ゲーム開始：初期手札4 / シールド3（裏向き）", "muted");

  updateHUD();
  renderAll();

  // If AI first -> run AI turn immediately
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
    el.title.classList.remove("active");
    el.game.classList.add("active");
    log("対戦画面：表示OK", "muted");
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
      announce("設定：<strong>owner/repo</strong>形式で入力してください", 2400);
      return;
    }
    setRepo(v);
    clearCache();
    log(`設定：リポジトリ = ${v}`, "muted");
    announce("設定を保存しました。<strong>画像を再スキャン</strong>します。", 2000);
    await rescanImages();
  }, {passive:true});

  el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});

  el.btnClearCache.addEventListener("click", ()=>{
    clearCache();
    log("画像キャッシュを消去しました", "muted");
    announce("画像キャッシュを消去しました。", 1500);
    state.img.ready=false;
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
    state.img.cardUrlByNo = {};
    state.img.cardFileByNo = {};
    state.img.backUrl = "";
    renderAll();
  }, {passive:true});
}

function bindPhaseButtons(){
  el.btnNext.addEventListener("click", nextPhase, {passive:true});
  el.btnEnd.addEventListener("click", endTurn, {passive:true});
}

function bindLogButton(){
  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 360);
}

/* ---------- init ---------- */
async function init(){
  el.boot.textContent = "JS: OK（初期化中…）";
  updateHUD();

  bindStart();
  bindHUDButtons();
  bindSettings();
  bindPhaseButtons();
  bindBoardClicks();
  bindLogButton();

  const cache = getCache();
  if(cache && cache.assetFiles && cache.cardFiles && cache.repo === getRepo()){
    log("画像：キャッシュを使用（必要なら設定→再取得）", "muted");
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent = "JS: OK（準備完了）";
  log("盤面：iPhone/iPad両対応（C/E 3枠固定）／裏面：card_back.* 自動検出", "muted");
  announce("準備完了：<strong>START</strong>で開始できます。", 2200);
}

document.addEventListener("DOMContentLoaded", init);