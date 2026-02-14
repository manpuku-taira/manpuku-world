/* =========================================================
  Manpuku World - v40007
  GOALS:
   - 画像が見つからなくても「仮カード」で止まらずプレイ可能
   - jpg/png/二重拡張子(.png.JPG等)の自動紐付け
   - C=キャラのみ / E=エフェクト&アイテムのみ
   - 見参は無制限（コスト：手札1枚 or ステージ1枚をウイングへ）
   - 相手ターン停止の再発防止（awaitで必ず進む）
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

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v5";
const LS_SOUND = "mw_sound_on";

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];

/* ---------- Card data (No.01-20) ---------- */
/* 画像ファイル名から自動的に name を上書きする（≒最終的に画像名が正になる） */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", type:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText([
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。",
      "1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。"
    ].join("\n")) , logic:["special_summon_self","search_black_magic"]
  },
  { no:2,  name:"黒魔法-フレイムバレット", type:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText([
      "自分ステージに「クルエラ」がある時、手札から発動できる。",
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。",
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。",
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    ].join("\n")), logic:["conditional_activate","destroy_enemy"]
  },
  { no:3,  name:"トナカイの少女ニコラ", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText([
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ].join("\n")), logic:["special_summon_self","buff_self"]
  },
  { no:4,  name:"聖ラウス", type:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが登場した時、デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"), logic:["search_clan"]
  },
  { no:5,  name:"統括AI タータ", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText([
      "このカードが登場した時、デッキから2枚ドローする。",
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ].join("\n")), logic:["draw2","exchange_bugbug"]
  },
  { no:6,  name:"麗し令嬢エフィ", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText([
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    ].join("\n")), logic:["special_summon_self","debuff_enemy"]
  },
  { no:7,  name:"狩猟まひる", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("（効果文言未確定：後で差し替え）"), logic:[]
  },
  { no:8,  name:"組織の男 手形", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。"), logic:["negate_once"]
  },
  { no:9,  name:"小太郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText([
      "このカードが自分ステージに存在する時、手札の「小次郎」カードを見参させる。",
      "自分ステージに「小次郎」カードがある時、このカードのATK+500。"
    ].join("\n")), logic:["summon_partner","buff_pair"]
  },
  { no:10, name:"小次郎・孫悟空Lv17", type:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText([
      "このカードが自分ステージに存在する時、手札の「小太郎」カードを見参させる。",
      "自分ステージに「小太郎」カードがある時、このカードのATK+500。"
    ].join("\n")), logic:["summon_partner","buff_pair"]
  },
  { no:11, name:"司令", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが登場した時、自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"), logic:["equip_buff"]
  },
  { no:12, name:"班目プロデューサー", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"), logic:["battle_survive_once"]
  },
  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText([
      "このカードが自分ステージに存在する時、このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。",
      "この効果は相手ターンでも発動できる。"
    ].join("\n")), logic:["self_sac_debuff"]
  },
  { no:14, name:"記憶抹消", type:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。"), logic:["negate_send_wing"]
  },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect", tags:[], titleTag:"Eバリアーズ",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"), logic:["battle_buff"]
  },
  { no:16, name:"力こそパワー！！", type:"effect", tags:[], titleTag:"Eバリアーズ",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"), logic:["send_lowest"]
  },
  { no:17, name:"キャトルミューティレーション", type:"effect", tags:[], titleTag:"Eバリアーズ",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"), logic:["bounce_on_loss"]
  },
  { no:18, name:"a-xブラスター01 -放射型-", type:"effect", tags:["射手"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText([
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。",
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    ].join("\n")), logic:["equip_archer"]
  },
  { no:19, name:"-聖剣- アロングダイト", type:"effect", tags:["勇者","剣士"], titleTag:"Eバリアーズ",
    text: normalizeText([
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。",
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    ].join("\n")), logic:["equip_sword"]
  },
  { no:20, name:"普通の棒", type:"effect", tags:["勇者"], titleTag:"Eバリアーズ",
    text: normalizeText([
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。",
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    ].join("\n")), logic:["equip_stick"]
  },
].map((c,i)=>({ ...c, no: c.no, id:`card_${pad2(c.no)}`, atk: 1000 + (i%5)*500 })); // ATKは暫定

/* ---------- Deck (20 types x2) ---------- */
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push({...c}); deck.push({...c});
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

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img: {
    fieldUrl:"",
    backUrl:"",
    cardUrlByNo:{},   // "01" -> "/assets/cards/filename"
    cardFileByNo:{},  // "01" -> "filename"
    ready:false,
  },

  aiRunning:false,
  soundOn: (localStorage.getItem(LS_SOUND) ?? "1") === "1",
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
  el.enemyHandLabel.textContent = `ENEMY HAND ×${state.AI.hand.length}`;
}
function updateCounts(){
  el.aiDeckN.textContent = state.AI.deck.length;
  el.aiWingN.textContent = state.AI.wing.length;
  el.aiOutN.textContent = state.AI.outside.length;

  el.pDeckN.textContent = state.P1.deck.length;
  el.pWingN.textContent = state.P1.wing.length;
  el.pOutN.textContent = state.P1.outside.length;
}

/* ---------- Simple SE ---------- */
let ac = null;
function beep(freq=660, dur=0.06, type="square", gain=0.06){
  if(!state.soundOn) return;
  try{
    if(!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  }catch{}
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
  const cand = ["field.png.jpg","field.jpg","field.png","field.jpeg","field.PNG","field.JPG","field.png.JPG","field.jpg.png"];
  for(const c of cand){
    const k = assetFiles.findIndex(n=>n.toLowerCase() === c.toLowerCase());
    if(k>=0) return assetFiles[k];
  }
  return "";
}
function pickBackFile(assetFiles){
  const lowers = assetFiles.map(n=>n.toLowerCase());
  const pri = ["card_back.png","card_back.jpg","card_back.jpeg","cardback.png","cardback.jpg","back.png","back.jpg","back.jpeg"];
  for(const p of pri){
    const i = lowers.findIndex(n=>n === p);
    if(i>=0) return assetFiles[i];
  }
  const idx = lowers.findIndex(n=>n.startsWith("card_back."));
  if(idx>=0) return assetFiles[idx];
  const idx2 = lowers.findIndex(n=>n.startsWith("back."));
  if(idx2>=0) return assetFiles[idx2];
  return "";
}
function scoreCardFilename(name, no){
  const s = name.toLowerCase();
  const p2 = pad2(no).toLowerCase();
  const p1 = String(no).toLowerCase();
  let score = 0;
  if(s.startsWith(`${p2}_`)) score += 120;
  if(s.startsWith(`${p1}_`)) score += 100;
  if(s.includes(`${p2}_`)) score += 40;
  if(s.includes(`${p1}_`)) score += 30;
  if(s.includes(".png.jpg") || s.includes(".png.jpeg") || s.includes(".png.png") || s.includes(".png.jpg")) score += 20;
  if(s.endsWith(".jpg") || s.endsWith(".jpeg") || s.endsWith(".png") || s.endsWith(".webp")) score += 8;
  if(s.includes(".jpg")) score += 4;
  if(s.includes(".png")) score += 4;
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
    if(best.score >= 80) map[pad2(no)] = best.name;
  }
  return map;
}
async function validateImage(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=> resolve(true);
    img.onerror = ()=> resolve(false);
    img.src = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now(); // 強制更新（キャッシュに勝つ）
  });
}
function stripExtAll(name){
  let base = name;
  for(let i=0;i<3;i++){
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
  return base || `カード${no}`;
}
function applyNamesFromMap(cardMap){
  for(let no=1; no<=20; no++){
    const k = pad2(no);
    const fn = cardMap[k];
    if(fn){
      const nm = nameFromFilename(fn, no);
      const idx = CardRegistry.findIndex(c=>c.no===no);
      if(idx>=0) CardRegistry[idx].name = nm;
    }
  }
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
    else log("裏面：未設定（黒い裏面で動作）", "muted");

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
    const ok = await validateImage(u);
    if(ok){
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
    const ok = await validateImage(b);
    if(ok){
      state.img.backUrl = b;
      log("OK 裏面読込：適用", "muted");
    }else{
      log(`NG 裏面読込失敗: ${b}（黒で継続）`, "warn");
      state.img.backUrl = "";
    }
  }

  // cards
  state.img.cardUrlByNo = {};
  state.img.cardFileByNo = {};
  const map = cache.cardMap || {};
  applyNamesFromMap(map);
  for(const k of Object.keys(map)){
    const file = map[k];
    state.img.cardFileByNo[k] = file;
    state.img.cardUrlByNo[k] = vercelPathCards(file);
  }
  state.img.ready = true;

  const miss = [];
  for(let no=1; no<=20; no++){
    const key = pad2(no);
    if(!state.img.cardUrlByNo[key]) miss.push(key);
  }
  if(miss.length) log(`カード画像未検出：${miss.join(", ")}（未検出でも仮カードでプレイ可能）`, "warn");
  else log("カード画像：20種すべて検出", "muted");

  renderAll();
}

/* ---------- Long press ---------- */
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

/* ---------- Viewer ---------- */
function openViewer(card){
  el.viewerTitle.textContent = `${card.name}`;
  el.viewerText.textContent = (card.text || "");
  const url = state.img.cardUrlByNo[pad2(card.no)];
  el.viewerImg.src = url ? (url + `?v=${Date.now()}`) : "";
  showModal("viewerM");
}

/* ---------- Zone Modal ---------- */
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
      if(url) th.style.backgroundImage = `url("${url}?v=${Date.now()}")`;

      const meta = document.createElement("div");
      meta.className = "zMeta";
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = `${c.name}`;
      const s = document.createElement("div");
      s.className = "s";
      s.textContent = `${c.type.toUpperCase()} / ATK ${c.atk}`;

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

/* ---------- Card face ---------- */
function faceForCard(card, isEnemy=false){
  const face = document.createElement("div");
  face.className = "face";
  const url = state.img.cardUrlByNo[pad2(card.no)];
  if(url){
    face.style.backgroundImage = `url("${url}?v=${Date.now()}")`;
  }else{
    face.classList.add("fallback"); // 仮カード
  }
  if(isEnemy) face.style.transform = "rotate(180deg)";
  return face;
}
function makeSlot(card, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");
  if(opts.bad) slot.classList.add("bad");
  if(card){
    slot.appendChild(faceForCard(card, !!opts.enemy));
    bindLongPress(slot, ()=> openViewer(card));
  }
  return slot;
}

/* ---------- Draw / deck ---------- */
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（ドロー不能）`, "warn");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}
function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限でウイングへ → ${c.name}`, "muted");
  }
}

/* ---------- Shields (facedown) ---------- */
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
        back.style.backgroundImage = `url("${state.img.backUrl}?v=${Date.now()}")`;
        back.style.backgroundColor = "";
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

/* ---------- Battle core (暫定) ---------- */
function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  log(`バトル：${A.name}(${A.atk}) vs ${D.name}(${D.atk})`, "muted");
  beep(520,0.05);

  if(A.atk === D.atk){
    state[aSide].C[aPos]=null;
    state[dSide].C[dPos]=null;
    state[aSide].wing.push(A);
    state[dSide].wing.push(D);
    log("同値：相打ち（両方ウイング）", "muted");
    return;
  }
  if(A.atk > D.atk){
    state[dSide].C[dPos]=null;
    state[dSide].wing.push(D);
    log(`破壊：${D.name} → ウイング`, "muted");
  }else{
    state[aSide].C[aPos]=null;
    state[aSide].wing.push(A);
    log(`破壊：${A.name} → ウイング`, "muted");
  }
}

/* ---------- Placement rules ---------- */
function canPlaceToC(card){ return card && card.type === "character"; }
function canPlaceToE(card){ return card && card.type !== "character"; } // effect + item を同じ枠

function needsKenSan(card){
  return !!card?.logic?.includes("special_summon_self");
}

/* ---------- KenSan cost (自動選択版) ---------- */
function payKenSanCost(side, selectedHandIdx){
  const p = state[side];

  // 1) 手札に他カードがあれば 1枚をウイングへ（選択カード以外）
  if(p.hand.length >= 2){
    const idx = (selectedHandIdx === p.hand.length-1) ? 0 : p.hand.length-1;
    const disc = p.hand.splice(idx,1)[0];
    p.wing.push(disc);
    return { ok:true, costCard:disc, from:"hand" };
  }

  // 2) ステージから 1枚をウイングへ（C/Eの先頭から）
  for(let i=0;i<3;i++){
    if(p.C[i]){
      const c = p.C[i];
      p.C[i] = null;
      p.wing.push(c);
      return { ok:true, costCard:c, from:"stage" };
    }
  }
  for(let i=0;i<3;i++){
    if(p.E[i]){
      const c = p.E[i];
      p.E[i] = null;
      p.wing.push(c);
      return { ok:true, costCard:c, from:"stage" };
    }
  }

  return { ok:false };
}

/* ---------- Player actions ---------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase !== "MAIN" && state.phase !== "BATTLE") return;

  // MAIN: Place character (normal summon)
  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];
    if(!canPlaceToC(card)){
      log("Cにはキャラクターのみ置けます", "warn");
      beep(220,0.06,"sawtooth",0.05);
      return;
    }
    if(needsKenSan(card)){
      log("このカードは登場できません。空Cを長押しで見参してください。", "warn");
      beep(240,0.06,"triangle",0.05);
      return;
    }

    // Place
    state.P1.C[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    log(`登場：${card.name}`, "muted");
    beep(740,0.06);
    renderAll();
    return;
  }

  // BATTLE: Select attacker
  if(state.phase === "BATTLE"){
    if(!state.P1.C[pos]) return;
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }
}

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase !== "MAIN") return;

  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!canPlaceToE(card)){
    log("Eにはエフェクト/アイテムのみ置けます", "warn");
    beep(220,0.06,"sawtooth",0.05);
    return;
  }

  state.P1.E[pos] = card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;
  log(`配置：${card.name}`, "muted");
  beep(660,0.05,"square",0.05);
  renderAll();
}

function onLongPressEmptyCForKenSan(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.C[pos]) return;

  const card = state.P1.hand[state.selectedHandIndex];
  if(!canPlaceToC(card)) return;

  // 見参は無制限。必要カード（登場不可）は見参必須。その他も見参で置ける。
  askConfirm("見参", `${card.name} を見参しますか？\nコスト：手札1枚 または ステージのカード1枚をウイングへ送ります（自動選択）`, ()=>{
    const pay = payKenSanCost("P1", state.selectedHandIndex);
    if(!pay.ok){
      log("見参できません：コストがありません（手札2枚以上 または ステージにカードが必要）", "warn");
      beep(180,0.07,"triangle",0.05);
      return;
    }
    const costName = pay.costCard?.name || "（不明）";
    log(`見参コスト：${pay.from==="hand"?"手札":"ステージ"}から → ${costName}`, "muted");

    const c2 = state.P1.hand.splice(state.selectedHandIndex,1)[0];
    state.P1.C[pos]=c2;
    state.selectedHandIndex=null;

    log(`見参：${c2.name}`, "muted");
    beep(880,0.07,"square",0.06);
    renderAll();
  });
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

  const enemyHasC = state.AI.C.some(Boolean);
  if(enemyHasC){
    log("相手キャラがいる間はシールドを攻撃できません", "warn");
    beep(200,0.06,"triangle",0.05);
    return;
  }
  if(!state.AI.shield[idx]){
    log("そのシールドは既にありません", "warn");
    return;
  }

  askConfirm("攻撃確認", `${atkCard.name} がシールドを攻撃します。\nシールドを破壊（→相手手札）しますか？`, ()=>{
    const sh = state.AI.shield[idx];
    state.AI.shield[idx] = null;
    state.AI.hand.push(sh);
    log(`シールド破壊：相手手札へ → ${sh.name}`, "muted");
    beep(420,0.06,"square",0.06);
    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- AI logic (止まらない簡易AI) ---------- */
function aiPlace(){
  // 1) 置けるキャラをCへ（登場可能優先、なければ見参で置く）
  const emptyC = state.AI.C.findIndex(x=>!x);
  if(emptyC>=0){
    const idxChar = state.AI.hand.findIndex(c=>c.type==="character" && !needsKenSan(c));
    if(idxChar>=0){
      const c = state.AI.hand.splice(idxChar,1)[0];
      state.AI.C[emptyC]=c;
      log(`AI：登場 → ${c.name}`, "muted");
      return;
    }
    const idxKen = state.AI.hand.findIndex(c=>c.type==="character");
    if(idxKen>=0){
      // 見参（AIも同じルール：コスト自動）
      const pay = payKenSanCost("AI", idxKen);
      if(pay.ok){
        const c = state.AI.hand.splice(idxKen,1)[0];
        state.AI.C[emptyC]=c;
        log(`AI：見参 → ${c.name}`, "muted");
        return;
      }
    }
  }

  // 2) エフェクト/アイテムをEへ
  const emptyE = state.AI.E.findIndex(x=>!x);
  if(emptyE>=0){
    const idxE = state.AI.hand.findIndex(c=>c.type!=="character");
    if(idxE>=0){
      const c = state.AI.hand.splice(idxE,1)[0];
      state.AI.E[emptyE]=c;
      log(`AI：配置 → ${c.name}`, "muted");
    }
  }
}
function aiBattle(){
  for(let i=0;i<3;i++){
    const atk = state.AI.C[i];
    if(!atk) continue;

    const playerIdxs = state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(playerIdxs.length){
      const t = playerIdxs[Math.floor(Math.random()*playerIdxs.length)];
      resolveBattle_CvC("AI", i, "P1", t);
    }else{
      const sidx = state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        const sh = state.P1.shield[sidx];
        state.P1.shield[sidx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊 → あなた手札へ ${sh.name}`, "warn");
        beep(360,0.06,"square",0.06);
      }else{
        log("敗北：ダイレクトアタック（仮）", "warn");
      }
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

    state.phase = "START"; updateHUD(); renderAll();
    await sleep(220);

    state.phase = "DRAW"; updateHUD();
    draw("AI", 1);
    log("AI：ドロー +1", "muted");
    renderAll();
    await sleep(260);

    state.phase = "MAIN"; updateHUD();
    aiPlace();
    renderAll();
    await sleep(320);

    state.phase = "BATTLE"; updateHUD();
    aiBattle();
    renderAll();
    await sleep(420);

    state.phase = "END"; updateHUD();
    enforceHandLimit("AI");
    renderAll();
    await sleep(220);

    state.activeSide = "P1";
    state.turn++;
    state.phase = "START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    updateHUD();
    renderAll();

  }finally{
    state.aiRunning = false;
  }
}

/* ---------- Rendering ---------- */
function renderZones(){
  // AI E
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    const slot = makeSlot(state.AI.E[i], {enemy:true});
    el.aiE.appendChild(slot);
  }

  // AI C
  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  // Player C
  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const canDrop = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const selAtk = (state.selectedAttackerPos===i);
    const slot = makeSlot(c, {glow:canDrop, sel:selAtk});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c){
      bindLongPress(slot, ()=> onLongPressEmptyCForKenSan(i));
    }
    el.pC.appendChild(slot);
  }

  // Player E
  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];
    const canDrop = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot = makeSlot(c, {glow:canDrop});
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

    if(state.activeSide==="P1" && state.phase==="MAIN") h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}?v=${Date.now()}")`;
    }else{
      // 仮カード（黒塗りにしない：テストしやすく）
      h.style.backgroundImage = "";
      h.style.background = "linear-gradient(135deg, rgba(89,242,255,.10), rgba(179,91,255,.08))";
      h.style.borderColor = "rgba(179,91,255,.24)";
    }

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1") return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      beep(980,0.03,"square",0.04);
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
    if(state.img.backUrl) b.style.backgroundImage = `url("${state.img.backUrl}?v=${Date.now()}")`;
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

function renderAll(){
  updateCounts();
  updateHUD();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
}

/* ---------- Board clicks ---------- */
function bindBoardClicks(){
  const grid = $("grid");
  grid.addEventListener("click", (e)=>{
    const cell = e.target.closest(".cell");
    if(!cell) return;
    const act = cell.getAttribute("data-click");
    if(!act) return;

    if(act==="aiWing") openZone("ENEMY WING", state.AI.wing.slice().reverse());
    if(act==="aiOutside") openZone("ENEMY OUTSIDE", state.AI.outside.slice().reverse());
    if(act==="pWing") openZone("YOUR WING", state.P1.wing.slice().reverse());
    if(act==="pOutside") openZone("YOUR OUTSIDE", state.P1.outside.slice().reverse());
  }, {passive:true});
}

/* ---------- Phase Buttons ---------- */
function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${state.activeSide==="P1"?"あなた":"AI"}：ドロー +1`, "muted");
    beep(700,0.04);
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
    runAITurn();
  }else{
    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    renderAll();
  }
}

/* ---------- Start Game ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  state.aiRunning = false;

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
  state.activeSide = state.firstSide;

  if(state.firstSide==="P1"){
    el.firstInfo.textContent = "先攻：あなた";
    log("先攻：あなた", "muted");
    log("あなたのターン開始", "muted");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
  }

  log("ゲーム開始：シールド3（裏向き）/ 初手4", "muted");
  renderAll();

  if(state.activeSide==="AI") runAITurn();
}

/* ---------- Buttons / Settings ---------- */
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
    el.fieldTop.style.backgroundImage = "";
    el.fieldBottom.style.backgroundImage = "";
    state.img.cardUrlByNo = {};
    state.img.cardFileByNo = {};
    state.img.backUrl = "";
    renderAll();
  }, {passive:true});

  // sound button (exists in HTML)
  const btnSound = $("btnSound");
  if(btnSound){
    const refresh = ()=>{
      btnSound.textContent = `SE: ${state.soundOn ? "ON" : "OFF"}`;
      btnSound.classList.toggle("primary", state.soundOn);
    };
    refresh();
    btnSound.addEventListener("click", ()=>{
      state.soundOn = !state.soundOn;
      localStorage.setItem(LS_SOUND, state.soundOn ? "1":"0");
      refresh();
      beep(880,0.05);
    }, {passive:true});
  }
}

function bindPhaseButtons(){
  el.btnNext.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
    nextPhase();
  }, {passive:true});

  el.btnEnd.addEventListener("click", ()=>{
    if(state.activeSide!=="P1") return;
    endTurn();
  }, {passive:true});
}

function bindLogButton(){
  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 320);
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
    log("画像：キャッシュを使用（必要なら設定→再スキャン）", "muted");
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent = "JS: OK（準備完了）";
  log("盤面は常時フル表示／詳細は長押し／画像未検出でも仮カードでプレイ可能", "muted");
}

document.addEventListener("DOMContentLoaded", init);