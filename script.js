/* script.js（丸ごと置換・v40008）
  FIX:
   - フィールド上カード/枠が選択できない問題：UI層のクリック透過はCSSで保証 + クリックハンドラ整理
  ADD:
   - 見参（必要カード）を「長押し不要」で実行可能（Cに置こうとするとコスト選択へ）
   - 見参回数：無制限
   - コスト選択 / 装備対象選択 / 効果対象選択 を「大きいアナウンス」で誘導
*/

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
  for(const it of LOGS.slice(0, 200)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v4";

/* ---------- Rules ---------- */
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}

/* ---------- Card DB (20) ---------- */
/* まずはテストプレイ優先：rank/atkは仮置き。
   効果処理は「導線（選択UI）」を中心に実装し、個別効果の完全自動処理は次段で拡張。 */
const CardRegistry = [
  { no:1,  id:"card_01", name:"黒の魔法使いクルエラ", type:"character", rank:5, atk:2500, tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。"),
    kensan:{ required:true, cost:{ hand:"any", stage:"character", count:1 } }
  },
  { no:2,  id:"card_02", name:"黒魔法-フレイムバレット", type:"effect", rank:2, atk:0, tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ステージに「クルエラ」がある時、手札から発動できる。相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n・相手ステージのATKが1番高いキャラクター1体をウイングに送る。\n・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"),
    target:{ kind:"enemyCharacterOptional" }
  },
  { no:3,  id:"card_03", name:"トナカイの少女ニコラ", type:"character", rank:5, atk:2000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"),
    kensan:{ required:true, cost:{ hand:"any", stage:"character", count:1 } }
  },
  { no:4,  id:"card_04", name:"聖ラウス", type:"character", rank:3, atk:1500, tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。")
  },
  { no:5,  id:"card_05", name:"統括AI タータ", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが登場した時、発動できる。デッキから2枚ドローする。\n自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。")
  },
  { no:6,  id:"card_06", name:"麗し令嬢エフィ", type:"character", rank:5, atk:2200, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。\n自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"),
    kensan:{ required:true, cost:{ hand:"any", stage:"character", count:1 } },
    target:{ kind:"enemyCharacter" }
  },
  { no:7,  id:"card_07", name:"狩猟まひる", type:"character", rank:3, atk:1500, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("（効果は後で確定）")
  },
  { no:8,  id:"card_08", name:"組織の男 手形", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。")
  },
  { no:9,  id:"card_09", name:"小太郎・孫悟空Lv17", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。\n自分ステージに「小次郎」カードがある時、このカードのATK+500。")
  },
  { no:10, id:"card_10", name:"小次郎・孫悟空Lv17", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。\n自分ステージに「小太郎」カードがある時、このカードのATK+500。")
  },
  { no:11, id:"card_11", name:"司令", type:"item", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"),
    equip:{ bonus:500 }
  },
  { no:12, id:"card_12", name:"班目プロデューサー", type:"character", rank:3, atk:1500, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。")
  },
  { no:13, id:"card_13", name:"超弩級砲塔列車スタマックス氏", type:"character", rank:4, atk:2000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\nこの効果は相手ターンでも発動できる。"),
    target:{ kind:"enemyCharacter" }
  },
  { no:14, id:"card_14", name:"記憶抹消", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。")
  },
  { no:15, id:"card_15", name:"桜蘭の陰陽術 - 闘 -", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    target:{ kind:"yourCharacter" }
  },
  { no:16, id:"card_16", name:"力こそパワー！！", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。"),
    target:{ kind:"enemyCharacter" }
  },
  { no:17, id:"card_17", name:"キャトルミューティレーション", type:"effect", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    target:{ kind:"enemyCharacter" }
  },
  { no:18, id:"card_18", name:"a-xブラスター01 -放射型-", type:"item", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"),
    equip:{ bonus:500 }
  },
  { no:19, id:"card_19", name:"-聖剣- アロングダイト", type:"item", rank:2, atk:0, tags:["勇者","剣士"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"),
    equip:{ bonus:500 }
  },
  { no:20, id:"card_20", name:"普通の棒", type:"item", rank:1, atk:0, tags:["勇者"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText("自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\nタグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"),
    equip:{ bonus:300 }
  },
];

function cloneCard(no){
  const base = CardRegistry.find(c=>c.no===no);
  const c = JSON.parse(JSON.stringify(base));
  c.baseAtk = c.atk || 0;
  c.bonusAtk = 0;
  return c;
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

/* デッキ：20種×2 */
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
  normalSummonUsed:false,

  selectedHandIndex:null,
  selectedAttackerPos:null,

  // selection flow
  flow: null, // {kind, ...}

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

/* ---------- Announce ---------- */
function setAnnounce(text, kind=""){
  if(!text){
    el.announce.textContent = "";
    el.announce.classList.add("hide");
    el.announce.classList.remove("warn");
    return;
  }
  el.announce.classList.remove("hide");
  el.announce.textContent = text;
  el.announce.classList.toggle("warn", kind==="warn");
}

/* ---------- UI helpers ---------- */
function setActiveUI(){
  const you = (state.activeSide==="P1");
  el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
  el.chipActive.classList.toggle("enemy", !you);

  el.matRoot.classList.toggle("youTurn", you);
  el.matRoot.classList.toggle("enemyTurn", !you);

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

  const n = state.AI.hand.length;
  const lab = document.getElementById("enemyHandLabel");
  if(lab) lab.textContent = `ENEMY HAND ×${n}`;
}

function calcAtk(card){
  if(!card) return 0;
  const base = card.baseAtk ?? card.atk ?? 0;
  const bonus = card.bonusAtk ?? 0;
  return base + bonus;
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
  const cand = ["field.png.jpg","field.jpg","field.png","field.jpeg","field.PNG","field.JPG"];
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
  if(s.startsWith(`${p2}_`)) score += 100;
  if(s.startsWith(`${p1}_`)) score += 80;
  if(s.startsWith(`${p2}.`)) score += 70;
  if(s.startsWith(`${p1}.`)) score += 60;
  if(s.includes(`${p2}_`)) score += 30;
  if(s.includes(`${p1}_`)) score += 20;
  if(s.includes(".jpg")) score += 5;
  if(s.includes(".png")) score += 5;
  if(s.includes(".jpeg")) score += 4;
  if(s.includes(".png.jpg") || s.includes(".png.jpeg")) score += 6;
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
      log("OK 裏面読込：適用", "muted");
    }else{
      log(`NG 裏面読込失敗: ${b}（黒で継続）`, "warn");
      state.img.backUrl = "";
    }
  }

  // cards
  state.img.cardUrlByNo = {};
  state.img.cardFileByNo = {};
  const map = (cache.cardMap || {});
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
  if(opts.need) slot.classList.add("need");
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
  el.viewerTitle.textContent = `${card.name}`;
  el.viewerText.textContent = (card.text || "");
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
      s.textContent = `RANK ${c.rank} / ATK ${calcAtk(c)}`;

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

/* ---------- Turn / Phase core ---------- */
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
      if(side==="P1") log("敗北：デッキ切れ", "warn");
      else log("勝利：相手デッキ切れ", "muted");
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

function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  log(`バトル：${A.name}(${calcAtk(A)}) vs ${D.name}(${calcAtk(D)})`, "muted");

  if(calcAtk(A) === calcAtk(D)){
    state[aSide].C[aPos]=null;
    state[dSide].C[dPos]=null;
    state[aSide].wing.push(A);
    state[dSide].wing.push(D);
    log("同値処理：相打ち（両方ウイング）", "muted");
    return;
  }
  if(calcAtk(A) > calcAtk(D)){
    state[dSide].C[dPos]=null;
    state[dSide].wing.push(D);
    log(`破壊：${D.name} → ウイング`, "muted");
  }else{
    state[aSide].C[aPos]=null;
    state[aSide].wing.push(A);
    log(`破壊：${A.name} → ウイング`, "muted");
  }
}

/* ---------- Flow / Selection helpers ---------- */
function clearFlow(){
  state.flow = null;
  setAnnounce("");
}
function startFlow(flow){
  state.flow = flow;
  setAnnounce(flow.announce || "選択してください");
}

/* コストとして選べるカードの一覧（ハンド or ステージ） */
function isSelectableAsCost(card, filter){
  if(!card) return false;
  if(filter === "any") return true;
  if(filter === "character") return card.type === "character";
  if(filter === "effect") return card.type === "effect";
  if(filter === "item") return card.type === "item";
  return true;
}

/* ---------- AI（簡易） ---------- */
function aiMain(){
  const empty = state.AI.C.findIndex(x=>!x);
  if(empty>=0){
    const idx = state.AI.hand.findIndex(c=>c.type==="character" && !c.kensan?.required && c.rank<=4);
    if(idx>=0){
      const c = state.AI.hand.splice(idx,1)[0];
      state.AI.C[empty]=c;
      log(`AI：登場 → ${c.name}`, "muted");
      return;
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
      }else{
        log("敗北：相手のダイレクトアタック（仮）", "warn");
      }
    }
  }
}

/* ---------- Guaranteed AI Turn Runner ---------- */
async function runAITurn(){
  if(state.aiRunning) return;
  if(state.activeSide !== "AI") return;

  state.aiRunning = true;
  try{
    clearFlow();
    log("相手ターン開始", "warn");
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;

    setPhase("START"); await sleep(200);

    setPhase("DRAW");
    draw("AI", 1);
    log("AI：ドロー +1", "muted");
    renderAll(); await sleep(240);

    setPhase("MAIN");
    aiMain();
    renderAll(); await sleep(260);

    setPhase("BATTLE");
    aiBattle();
    renderAll(); await sleep(300);

    setPhase("END");
    enforceHandLimit("AI");
    renderAll(); await sleep(220);

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

/* ---------- Player actions ---------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  // flow: equip target
  if(state.flow?.kind === "equipTarget"){
    if(!state.P1.C[pos]){ log("装備先はキャラクターを選んでください", "warn"); return; }
    const { ePos, itemCard, bonus } = state.flow;
    // equip
    itemCard.equippedTo = { side:"P1", zone:"C", pos };
    state.P1.E[ePos] = itemCard;
    state.P1.C[pos].bonusAtk = (state.P1.C[pos].bonusAtk || 0) + bonus;
    log(`装備：${itemCard.name} → ${state.P1.C[pos].name}（ATK+${bonus}）`, "muted");
    clearFlow();
    renderAll();
    return;
  }

  // flow: kensan cost selection (stage)
  if(state.flow?.kind === "kCost"){
    const f = state.flow;
    const cand = state.P1.C[pos];
    if(!cand){ log("コストにするカードを選んでください（キャラ枠）", "warn"); return; }
    if(!isSelectableAsCost(cand, f.costStageFilter)){ log("この枠のカードはコストにできません", "warn"); return; }
    // pay cost from stage
    state.P1.C[pos] = null;
    state.P1.wing.push(cand);
    log(`コスト：ステージから → ${cand.name}`, "muted");
    // place kensan card
    state.P1.C[f.placePos] = f.card;
    // remove from hand (stored at handIndex)
    state.P1.hand.splice(f.handIndex, 1);
    state.selectedHandIndex = null;
    clearFlow();
    log(`見参：${f.card.name}`, "muted");
    renderAll();
    return;
  }

  // normal MAIN interactions
  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null) return;
    if(state.P1.C[pos]) return;

    const card = state.P1.hand[state.selectedHandIndex];

    // only character to C
    if(card.type !== "character"){
      log("キャラクター以外はCに置けません（Eへ置いてください）", "warn");
      return;
    }

    // kensan required -> start cost select flow
    if(card.kensan?.required){
      // needs 1 cost from hand(any) or stage(character)
      const canPayHand = state.P1.hand.length >= 2; // besides itself
      const canPayStage = state.P1.C.some(Boolean); // character only will be checked on tap
      if(!canPayHand && !canPayStage){
        log("見参：コストが足りません（手札かステージに1枚必要）", "warn");
        setAnnounce("見参：手札またはステージからコスト1枚が必要です。", "warn");
        return;
      }
      startFlow({
        kind:"kCost",
        announce:`見参：コストにするカードを選んでください（手札1枚 または ステージのキャラクター1枚）`,
        card,
        handIndex: state.selectedHandIndex,
        placePos: pos,
        costHandFilter: card.kensan.cost.hand || "any",
        costStageFilter: card.kensan.cost.stage || "character",
      });
      renderAll();
      return;
    }

    // normal summon (once per turn) : rank<=4
    if(state.normalSummonUsed){
      log("登場（通常召喚）はターン1回です", "warn");
      return;
    }
    if(card.rank >= 5){
      log("RANK5以上は見参が必要です（該当カードのみ）", "warn");
      return;
    }

    state.P1.C[pos] = card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    state.normalSummonUsed = true;
    log(`登場：${card.name}`, "muted");
    renderAll();
    return;
  }

  // BATTLE
  if(state.phase === "BATTLE"){
    if(!state.P1.C[pos]) return;
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }
}

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;

  // flow: kensan cost selection (stage E if allowed)
  if(state.flow?.kind === "kCost"){
    const f = state.flow;
    // Only allow stage E as cost when stage filter is "any"
    if(f.costStageFilter !== "any"){
      log("この見参はステージのキャラクターのみコストにできます", "warn");
      return;
    }
    const cand = state.P1.E[pos];
    if(!cand){ log("コストにするカードを選んでください（E枠）", "warn"); return; }
    // pay cost
    state.P1.E[pos] = null;
    state.P1.wing.push(cand);
    log(`コスト：ステージから → ${cand.name}`, "muted");
    // place
    state.P1.C[f.placePos] = f.card;
    state.P1.hand.splice(f.handIndex, 1);
    state.selectedHandIndex = null;
    clearFlow();
    log(`見参：${f.card.name}`, "muted");
    renderAll();
    return;
  }

  if(state.phase !== "MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]){ log("そのE枠は埋まっています", "warn"); return; }

  const card = state.P1.hand[state.selectedHandIndex];

  // Only effect/item to E
  if(card.type === "character"){
    log("キャラクターはEに置けません（Cへ置いてください）", "warn");
    return;
  }

  // place to E (max 3 by design)
  const placed = state.P1.hand.splice(state.selectedHandIndex,1)[0];
  state.selectedHandIndex = null;

  // If item -> require equip target selection
  if(placed.type === "item"){
    startFlow({
      kind:"equipTarget",
      announce:`装備：装備する自分キャラクターを選んでください（YOUR C）`,
      ePos: pos,
      itemCard: placed,
      bonus: placed.equip?.bonus ?? 0,
    });
    log(`アイテム配置：${placed.name}（装備先を選択してください）`, "muted");
    renderAll();
    return;
  }

  // effect -> for now just place, and if needs target show prompt
  state.P1.E[pos] = placed;
  if(placed.target?.kind){
    setAnnounce(`効果：対象を選んでください（まだ自動処理は準備中：テスト導線）`);
  }else{
    setAnnounce("");
  }
  log(`エフェクト配置：${placed.name}`, "muted");
  renderAll();
}

function onClickEnemyCard(enemyPos){
  if(state.activeSide!=="P1") return;

  // flow: target selection (minimal UX now)
  if(state.flow?.kind === "effectTargetEnemy"){
    // will be expanded later
    clearFlow();
    return;
  }

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

    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- Render parts ---------- */
function renderZones(){
  // AI E
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.E[i];
    el.aiE.appendChild(makeSlot(c, {enemy:true}));
  }

  // AI C
  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  // YOUR C
  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];

    // glow hint: when MAIN and selected character and empty slot
    const selHand = (state.selectedHandIndex!=null) ? state.P1.hand[state.selectedHandIndex] : null;
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && selHand && selHand.type==="character" && !c);
    const sel = (state.selectedAttackerPos===i);

    // need highlight when flow expects target
    const need = (state.flow?.kind === "equipTarget" && !!state.P1.C[i]);

    const slot = makeSlot(c, {glow, sel, need});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(slot);
  }

  // YOUR E
  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.E[i];

    const selHand = (state.selectedHandIndex!=null) ? state.P1.hand[state.selectedHandIndex] : null;
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && selHand && selHand.type!=="character" && !c);

    // need highlight when flow expects cost from E (only when allowed)
    const need = (state.flow?.kind === "kCost" && state.flow?.costStageFilter === "any" && !!state.P1.E[i]);

    const slot = makeSlot(c, {glow, need});
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

    // cost select highlight
    const need = (state.flow?.kind === "kCost" && i !== state.flow.handIndex);
    if(need) h.classList.add("need");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}")`;
      h.style.backgroundSize = "cover";
      h.style.backgroundPosition = "center";
    }else{
      // fallback
      h.style.backgroundImage = "";
    }

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1") return;

      // if flow is kCost, clicking a hand card chooses cost
      if(state.flow?.kind === "kCost"){
        if(i === state.flow.handIndex){
          log("このカード自身はコストにできません", "warn");
          return;
        }
        const costCard = state.P1.hand[i];
        if(!isSelectableAsCost(costCard, state.flow.costHandFilter)){
          log("このカードはコストにできません", "warn");
          return;
        }

        // pay: remove cost first (be careful with indices)
        const f = state.flow;
        const hi = f.handIndex;
        const ci = i;

        const cost = state.P1.hand.splice(ci,1)[0];
        state.P1.wing.push(cost);
        log(`コスト：手札から → ${cost.name}`, "muted");

        // adjust handIndex after removal
        let newHandIndex = hi;
        if(ci < hi) newHandIndex = hi - 1;

        // place kensan card
        const kcard = state.P1.hand.splice(newHandIndex,1)[0];
        state.P1.C[f.placePos] = kcard;

        state.selectedHandIndex = null;
        clearFlow();
        log(`見参：${kcard.name}`, "muted");
        renderAll();
        return;
      }

      // normal select
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      setAnnounce("");
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

function ensureShieldCountBadge(cell){
  let b = cell.querySelector(".shieldCount");
  if(!b){
    b = document.createElement("div");
    b.className = "shieldCount";
    cell.appendChild(b);
  }
  return b;
}

// Shield: FORCE black back always when exists
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

function renderAll(){
  updateCounts();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
}

/* ---------- Board clicks (wing/outside) ---------- */
function bindBoardClicks(){
  const grid = $("grid");
  grid.addEventListener("click", (e)=>{
    const t = e.target.closest(".cell");
    if(!t) return;
    const act = t.getAttribute("data-click");
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
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
    clearFlow();
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`${state.activeSide==="P1"?"あなた":"AI"}：ドロー +1`, "muted");
  }
  if(next==="END"){
    enforceHandLimit(state.activeSide);
    clearFlow();
  }

  updateHUD();
  renderAll();
}

function endTurn(){
  enforceHandLimit(state.activeSide);
  clearFlow();

  if(state.activeSide==="P1"){
    setActiveSide("AI");
    state.phase = "START";
    updateHUD();
    renderAll();
    runAITurn();
  }else{
    setActiveSide("P1");
    state.turn++;
    state.phase = "START";
    log(`TURN ${state.turn} あなたのターン開始`, "muted");
    updateHUD();
    renderAll();
  }
}

/* ---------- Start Game ---------- */
function startGame(){
  setAnnounce("");
  state.turn = 1;
  state.phase = "START";
  state.normalSummonUsed = false;
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;
  state.aiRunning = false;
  state.flow = null;

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
    log("あなたのターン開始", "muted");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
  }

  log("ゲーム開始：シールド3（裏向き）/ 初手4", "muted");

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
  }, 360);
}

/* ---------- init ---------- */
async function init(){
  el.boot.textContent = "JS: OK（初期化中…）";
  updateHUD();
  setAnnounce("");

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
  log("盤面は常時フル表示／詳細は長押し／シールドは裏向きで表示", "muted");
}

document.addEventListener("DOMContentLoaded", init);