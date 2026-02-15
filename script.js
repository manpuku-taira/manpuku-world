/* =========================================================
  Manpuku World - v40022
  - iPhone: remove empty gaps, matScale +35% area usage
  - Field cards smaller than hand (iPhone stageSlotMaxW)
  - Attack: each character can attack once per turn
  - Equip: if equipped character is sent to Wing, equipped items also go to Wing
  - Kuruerra search: only "黒魔法" EFFECT cards (prevents searching Kuruerra itself)
========================================================= */

const $ = (id) => document.getElementById(id);

const el = {
  title: $("title"),
  game: $("game"),
  boot: $("boot"),
  btnStart: $("btnStart"),

  chipTurn: $("chipTurn"),
  chipPhase: $("chipPhase"),
  chipActive: $("chipActive"),
  firstInfo: $("firstInfo"),

  notice: $("notice"),

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

  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),

  zoneTitle: $("zoneTitle"),
  zoneList: $("zoneList"),

  logBody: $("logBody"),

  confirmTitle: $("confirmTitle"),
  confirmBody: $("confirmBody"),
  btnYes: $("btnYes"),
  btnNo: $("btnNo"),

  pickTitle: $("pickTitle"),
  pickHint: $("pickHint"),
  pickList: $("pickList"),

  repoInput: $("repoInput"),
  btnRepoSave: $("btnRepoSave"),
  btnRescan: $("btnRescan"),
  btnClearCache: $("btnClearCache"),
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const LOGS = [];
function log(msg, kind="muted"){
  LOGS.unshift({msg, kind, t: Date.now()});
  if($("logM").classList.contains("show")) renderLogModal();
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
  for(const it of LOGS.slice(0, 260)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

let noticeTimer = null;
function setNotice(text){ el.notice.textContent = text; }
function flashNotice(text, ms=2400){
  setNotice(text);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(()=> updateNoticeByState(), ms);
}

const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){
  return (t || "").replaceAll("又は","または").replaceAll("出来る","できる");
}

/* ---------------- Cards ---------------- */
const CardRegistry = [
  { no:1,  id:"card_01", name:"黒の魔法使いクルエラ", type:"character", rank:5, atk:2500, tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    cannotNormalSummon:true, kensanCost:"any_card",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。"
    ]
  },
  { no:2,  id:"card_02", name:"黒魔法-フレイムバレット", type:"effect", rank:3, atk:0, tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ステージに「クルエラ」がある時、手札から発動できる。相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。",
      "・相手ステージのATKが1番高いキャラクター1体をウイングに送る。",
      "・相手ステージのrank4以下のキャラクターをすべてウイングに送る。"
    ]
  },
  { no:3,  id:"card_03", name:"トナカイの少女ニコラ", type:"character", rank:5, atk:2000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    cannotNormalSummon:true, kensanCost:"any_card",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ]
  },
  { no:4,  id:"card_04", name:"聖ラウス", type:"character", rank:4, atk:2000, tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。"
    ]
  },
  { no:5,  id:"card_05", name:"統括AI タータ", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:[
      "このカードが登場した時、発動できる。デッキから2枚ドローする。",
      "自分ターンに1度発動できる。手札から2枚までウイングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ]
  },
  { no:6,  id:"card_06", name:"麗し令嬢エフィ", type:"character", rank:5, atk:2000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    cannotNormalSummon:true, kensanCost:"any_card",
    effects:[
      "このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。",
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    ]
  },
  { no:7,  id:"card_07", name:"狩猟まひる", type:"character", rank:3, atk:1500, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[ "（効果テキスト未確定：後で差し替え）" ]
  },

  { no:8,  id:"card_08", name:"組織の男 手形", type:"character", rank:3, atk:1000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[ "相手ターンに1度発動できる。相手が発動した効果を無効にする。" ]
  },

  { no:9,  id:"card_09", name:"小太郎・孫悟空Lv17", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:[
      "このカードが自分ステージに存在する時、発動できる。手札の「小次郎」カードを見参させる。",
      "自分ステージに「小次郎」カードがある時、このカードのATK+500。"
    ]
  },
  { no:10, id:"card_10", name:"小次郎・孫悟空Lv17", type:"character", rank:4, atk:2000, tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記",
    effects:[
      "このカードが自分ステージに存在する時、発動できる。手札の「小太郎」カードを見参させる。",
      "自分ステージに「小太郎」カードがある時、このカードのATK+500。"
    ]
  },

  { no:11, id:"card_11", name:"司令", type:"item", rank:2, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。"
    ]
  },
  { no:12, id:"card_12", name:"班目プロデューサー", type:"character", rank:3, atk:1500, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[ "このカードは1ターンに1度、バトルでは破壊されない。" ]
  },
  { no:13, id:"card_13", name:"超弩級砲塔列車スタマックス氏", type:"character", rank:4, atk:2000, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "このカードが自分ステージに存在する時、発動できる。このカードをウイングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。",
      "この効果は相手ターンでも発動できる。"
    ]
  },
  { no:14, id:"card_14", name:"記憶抹消", type:"effect", rank:3, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[ "相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。" ]
  },
  { no:15, id:"card_15", name:"桜蘭の陰陽術 - 闘 -", type:"effect", rank:3, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[ "自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。" ]
  },
  { no:16, id:"card_16", name:"力こそパワー！！", type:"effect", rank:3, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[ "自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。" ]
  },
  { no:17, id:"card_17", name:"キャトルミューティレーション", type:"effect", rank:3, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[ "自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。" ]
  },
  { no:18, id:"card_18", name:"a-xブラスター01 -放射型-", type:"item", rank:2, atk:0, tags:["射手"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。",
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウイングに送る。"
    ]
  },
  { no:19, id:"card_19", name:"-聖剣- アロングダイト", type:"item", rank:2, atk:0, tags:["勇者","剣士"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。",
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウイングに送った時、カードを1枚ドローする。"
    ]
  },
  { no:20, id:"card_20", name:"普通の棒", type:"item", rank:1, atk:0, tags:["勇者"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    effects:[
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。",
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    ]
  },
].map(c => ({ ...c, text: normalizeText((c.effects || []).join("\n")) }));

function cloneCard(c){
  return {
    ...c,
    _uid: crypto.randomUUID(),
    _oncePerTurnFlags: {},
  };
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){
    deck.push(cloneCard(c));
    deck.push(cloneCard(c));
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
  selectedAttackerPos:null,

  // ★各キャラの攻撃済みフラグ（ターンごとにリセット）
  attackedThisTurn: { P1:[false,false,false], AI:[false,false,false] },

  flags: {
    kuruerraSearchUsed:false,
    tartaExchangeUsed:false,
  },

  tempMods: [],

  P1: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI: { deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  equipMeta: { P1:[null,null,null], AI:[null,null,null] },

  img: { fieldUrl:"", backUrl:"", cardUrlByNo:{}, cardFileByNo:{}, ready:false },
  aiRunning:false,
};

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
  if(close==="pick") hideModal("pickM");
});

function bindLongPress(node, fn, ms=420){
  let timer = null;
  const start = ()=> { clearTimeout(timer); timer = setTimeout(fn, ms); };
  const end = ()=> clearTimeout(timer);
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
}

/* ---------- Storage ---------- */
const LS_REPO = "mw_repo";
const LS_IMG_CACHE = "mw_img_cache_v7";
function getRepo(){ return localStorage.getItem(LS_REPO) || "manpuku-taira/manpuku-world"; }
function setRepo(v){ localStorage.setItem(LS_REPO, v); }
function getCache(){ try{ return JSON.parse(localStorage.getItem(LS_IMG_CACHE) || "{}"); }catch{ return {}; } }
function setCache(obj){ localStorage.setItem(LS_IMG_CACHE, JSON.stringify(obj)); }
function clearCache(){ localStorage.removeItem(LS_IMG_CACHE); }

/* GitHub image scan */
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
  return idx>=0 ? assetFiles[idx] : "";
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
  if(s.includes(`${p2}_`)) score += 30;
  if(s.includes(`${p1}_`)) score += 20;
  if(s.endsWith(".png")) score += 5;
  if(s.endsWith(".jpg")) score += 5;
  if(s.endsWith(".jpeg")) score += 4;
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
    const [assetFiles, cardFiles] = await Promise.all([ ghList("assets"), ghList("assets/cards") ]);

    cache.repo = repo;
    cache.assetFiles = assetFiles;
    cache.cardFiles = cardFiles;
    cache.scannedAt = Date.now();

    cache.fieldFile = pickFieldFile(assetFiles) || "";
    cache.backFile  = pickBackFile(assetFiles) || "";
    cache.cardMap   = buildCardMapFromFileList(cardFiles);

    setCache(cache);

    if(cache.fieldFile) log(`OK フィールド検出: ${cache.fieldFile}`, "muted");
    else log("注意：フィールド未検出（assets/field.* を確認）", "warn");

    if(cache.backFile) log(`OK 裏面検出: ${cache.backFile}`, "muted");
    else log("裏面：未設定（黒い裏面で動作）", "muted");

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

  if(cache.fieldFile){
    const u = vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)){
      state.img.fieldUrl = u;
      el.fieldTop.style.backgroundImage = `url("${u}")`;
      el.fieldBottom.style.backgroundImage = `url("${u}")`;
      log("OK フィールド読込：上下同時表示", "muted");
    }else{
      el.fieldTop.style.backgroundImage = "";
      el.fieldBottom.style.backgroundImage = "";
      log(`NG フィールド読込失敗: ${u}`, "warn");
    }
  }

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

  state.img.cardUrlByNo = {};
  state.img.cardFileByNo = {};
  const map = cache.cardMap || {};
  for(const k of Object.keys(map)){
    const file = map[k];
    state.img.cardFileByNo[k] = file;
    state.img.cardUrlByNo[k] = vercelPathCards(file);
  }

  state.img.ready = true;
  renderAll();
}

/* ---------- HUD/Counts ---------- */
function setActiveUI(){
  const you = (state.activeSide==="P1") && !state.aiRunning;
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
  updateNoticeByState();
}
function updateCounts(){
  el.aiDeckN.textContent = state.AI.deck.length;
  el.aiWingN.textContent = state.AI.wing.length;
  el.aiOutN.textContent = state.AI.outside.length;

  el.pDeckN.textContent = state.P1.deck.length;
  el.pWingN.textContent = state.P1.wing.length;
  el.pOutN.textContent = state.P1.outside.length;
}
function updateNoticeByState(){
  const you = (state.activeSide==="P1") && !state.aiRunning;
  if(!state.started){ setNotice("読み込み中…"); return; }
  if(!you){ setNotice("相手ターンです（操作できません）"); return; }

  if(state.phase==="MAIN"){
    if(state.selectedHandIndex==null){
      setNotice("手札を選択→C/Eへ。場のキャラをタップで起動効果（ある場合）も発動できます。");
      return;
    }
    const c = state.P1.hand[state.selectedHandIndex];
    if(!c){ setNotice("手札を選択してください"); return; }
    if(c.type==="character"){
      if(c.cannotNormalSummon) setNotice("登場できないキャラ：空Cを長押しで見参（コスト選択・無制限）");
      else setNotice("キャラ：空Cをタップで登場（1ターン1回）");
    }else if(c.type==="item"){
      setNotice("アイテム：空Eをタップ → 装備先キャラを選択（ATK加算）");
    }else{
      setNotice("エフェクト：空Eをタップ → 対象/効果 → 解決後ウイングへ（使い切り）");
    }
    return;
  }

  if(state.phase==="BATTLE"){
    if(state.selectedAttackerPos==null) setNotice("攻撃する自分キャラをタップで選択 → 相手キャラ/シールドをタップで攻撃（各キャラ1回/ターン）");
    else setNotice("攻撃先をタップしてください（OKで解決）");
    return;
  }

  setNotice("次のフェイズへ進めてください");
}

/* ---------- Viewer/Zone ---------- */
function hasTag(card, tag){ return (card.tags || []).includes(tag); }
function isTitle(card, titleTag){ return (card.titleTag || "") === titleTag; }

function equipBonus(itemCard, targetChar){
  if(!itemCard || !targetChar) return 0;
  if(itemCard.no === 11) return 500;
  if(itemCard.no === 18) return 500 + (hasTag(targetChar,"射手") ? 500 : 0);
  if(itemCard.no === 19) return 500 + ((hasTag(targetChar,"勇者") || hasTag(targetChar,"剣士")) ? 500 : 0);
  if(itemCard.no === 20) return 300 + (hasTag(targetChar,"勇者") ? 500 : 0);
  return 0;
}

function unwrapE(side, eIndex){
  const v = state[side].E[eIndex];
  if(!v) return null;
  if(v._kind === "E_ITEM_WRAPPER") return v.item;
  if(v._kind === "E_EFFECT_WRAPPER") return v.effect;
  return v;
}

function isCardOnStageByName(side, namePart){
  const p = state[side];
  for(const c of p.C){ if(c && c.name.includes(namePart)) return true; }
  for(let i=0;i<3;i++){
    const e = unwrapE(side,i);
    if(e && e.name.includes(namePart)) return true;
  }
  return false;
}

function computedATK(side, cIndex){
  const ch = state[side].C[cIndex];
  if(!ch) return 0;
  let atk = ch.atk || 0;

  for(const b of state.tempMods){
    if(b.side===side && b.cIndex===cIndex && state.turn <= b.untilTurn){
      atk += b.amount;
    }
  }

  if(ch.no===9 && isCardOnStageByName(side,"小次郎")) atk += 500;
  if(ch.no===10 && isCardOnStageByName(side,"小太郎")) atk += 500;

  const metas = state.equipMeta[side] || [null,null,null];
  for(let ei=0; ei<3; ei++){
    const m = metas[ei];
    if(!m) continue;
    if(m.equipTo && m.equipTo.side===side && m.equipTo.cIndex===cIndex){
      atk += equipBonus(m.item, ch);
    }
  }
  return atk;
}

function openViewer(card, ctx=null){
  el.viewerTitle.textContent = `${card.name}`;
  const lines = [];
  lines.push(card.text || "");
  if(ctx && ctx.zone==="C" && card.type==="character"){
    const cur = computedATK(ctx.side, ctx.index);
    lines.unshift(`【現在ATK】${cur}`);
  }
  el.viewerText.textContent = lines.join("\n\n");
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
      s.textContent = `${c.type.toUpperCase()} / RANK ${c.rank}` + (c.type==="character" ? ` / ATK ${c.atk}` : "");
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
  const fn = confirmYes;
  confirmYes = null;
  if(fn) fn();
}, {passive:true});

/* ---------- Picker ---------- */
let pickResolve = null;
function openPick(title, hint, options){
  el.pickTitle.textContent = title;
  el.pickHint.textContent = hint;
  el.pickList.innerHTML = "";

  for(const opt of options){
    const it = document.createElement("div");
    it.className = "pickItem";

    const th = document.createElement("div");
    th.className = "pickThumb";
    const url = opt.card ? state.img.cardUrlByNo[pad2(opt.card.no)] : "";
    if(url) th.style.backgroundImage = `url("${url}")`;
    else th.style.backgroundImage = "linear-gradient(135deg, rgba(89,242,255,.10), rgba(179,91,255,.08))";

    const meta = document.createElement("div");
    meta.className = "pickMeta";
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = opt.title || (opt.card ? opt.card.name : "—");
    const s = document.createElement("div");
    s.className = "s";
    s.textContent = opt.subtitle || "";
    meta.appendChild(t); meta.appendChild(s);

    it.appendChild(th); it.appendChild(meta);

    it.addEventListener("click", ()=>{
      hideModal("pickM");
      const fn = pickResolve;
      pickResolve = null;
      if(fn) fn(opt);
    }, {passive:true});

    el.pickList.appendChild(it);
  }

  showModal("pickM");
  return new Promise((resolve)=>{ pickResolve = resolve; });
}

/* ---------- Core helpers ---------- */
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

function resetTurnFlagsFor(side){
  if(side==="P1"){
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
    state.flags.kuruerraSearchUsed = false;
    state.flags.tartaExchangeUsed = false;
  }
  // ★攻撃済みリセット
  state.attackedThisTurn[side] = [false,false,false];
}

function enforceHandLimit(side){
  const p = state[side];
  while(p.hand.length > 7){
    const c = p.hand.pop();
    p.wing.push(c);
    log(`${side==="P1"?"あなた":"AI"}：手札上限でウイングへ → ${c.name}`, "muted");
  }
}

function findInDeckOrWing(side, predicate){
  const p = state[side];
  const di = p.deck.findIndex(predicate);
  if(di>=0) return { where:"deck", index:di, card:p.deck[di] };
  const wi = p.wing.findIndex(predicate);
  if(wi>=0) return { where:"wing", index:wi, card:p.wing[wi] };
  return null;
}

/* ===== Equip destruction on character death ===== */
function sendEquippedItemsToWing(side, cIndex){
  const metas = state.equipMeta[side] || [null,null,null];
  for(let ei=0; ei<3; ei++){
    const m = metas[ei];
    if(!m || !m.item || !m.equipTo) continue;
    if(m.equipTo.side===side && m.equipTo.cIndex===cIndex){
      const raw = state[side].E[ei];
      state[side].E[ei] = null;
      state.equipMeta[side][ei] = null;

      // wrapperから取り出してウイングへ
      const item = (raw && raw._kind==="E_ITEM_WRAPPER") ? raw.item : m.item;
      if(item){
        state[side].wing.push(item);
        log(`装備破壊：${item.name} → ウイング（装備者が敗北）`, "warn");
      }
    }
  }
}

/* ===== Direct Attack ===== */
function winYou(){
  flashNotice("勝利！", 999999);
  log("勝利：相手にダイレクトアタック成功", "warn");
  askConfirm("勝利！","ダイレクトアタックが成立しました。\nあなたの勝利です。", ()=>{});
}
function loseYou(){
  flashNotice("敗北…", 999999);
  log("敗北：相手のダイレクトアタックを受けました", "warn");
  askConfirm("敗北…","相手のダイレクトアタックが成立しました。\nあなたの敗北です。", ()=>{});
}
function canDirectAttackAgainst(side){
  const enemy = (side==="P1") ? "AI" : "P1";
  const enemyHasC = state[enemy].C.some(Boolean);
  const enemyShields = state[enemy].shield.filter(Boolean).length;
  return (!enemyHasC && enemyShields===0);
}

/* ===== Equip ===== */
function attackerHasAlongditeBonus(side, aPos){
  const metas = state.equipMeta[side] || [null,null,null];
  const ch = state[side].C[aPos];
  if(!ch) return false;
  for(const m of metas){
    if(!m) continue;
    if(m.item && m.item.no===19 && m.equipTo && m.equipTo.cIndex===aPos){
      if(hasTag(ch,"勇者") || hasTag(ch,"剣士")) return true;
    }
  }
  return false;
}

/* ---------- Activated / On Summon ---------- */
function afterSummonTrigger(side, card){
  if(card.no === 5){
    askConfirm("起動効果（タータ）","「統括AI タータ」登場時効果：デッキから2枚ドローしますか？", ()=>{
      draw(side,2);
      log(`${side==="P1"?"あなた":"AI"}：タータ効果で2ドロー`, "muted");
      renderAll();
    });
    return;
  }
  if(card.no === 4){
    askConfirm("起動効果（聖ラウス）","タグ「クランプス」カード1枚をデッキ・ウイングから手札に加えますか？", ()=>{
      const got = findInDeckOrWing(side, x=>x && hasTag(x,"クランプス"));
      if(!got){ flashNotice("対象が見つかりませんでした", 2000); return; }
      const p = state[side];
      const c = (got.where==="deck") ? p.deck.splice(got.index,1)[0] : p.wing.splice(got.index,1)[0];
      p.hand.push(c);
      log(`${side==="P1"?"あなた":"AI"}：ラウス効果（${got.where}）→手札：${c.name}`, "muted");
      renderAll();
    });
    return;
  }
}

async function activateOnTapAbility(side, cIndex){
  const ch = state[side].C[cIndex];
  if(!ch) return;

  const isYourTurn = (state.activeSide === side) && !state.aiRunning;
  if(!isYourTurn){ flashNotice("相手ターン中は発動できません"); return; }

  if(ch.no===1){
    if(state.flags.kuruerraSearchUsed){ flashNotice("クルエラ：このターンは既に使用済みです"); return; }

    askConfirm("起動効果（クルエラ）","デッキ・ウイングから「黒魔法」カード1枚を手札に加えますか？", ()=>{
      // ★黒魔法（エフェクト）だけを対象にする（＝クルエラ自身を拾わない）
      const got = findInDeckOrWing(side, x=>x && x.type==="effect" && hasTag(x,"黒魔法"));
      if(!got){
        flashNotice("黒魔法（エフェクト）が見つかりませんでした", 2200);
        return;
      }
      const p = state[side];
      const c = (got.where==="deck") ? p.deck.splice(got.index,1)[0] : p.wing.splice(got.index,1)[0];
      p.hand.push(c);
      state.flags.kuruerraSearchUsed = true;
      log(`クルエラ効果：${c.name} を手札へ（${got.where}）`, "muted");
      flashNotice("クルエラ効果を発動しました", 1600);
      renderAll();
    });
    return;
  }

  if(ch.no===3){
    if(state.phase!=="MAIN"){ flashNotice("ニコラ：MAINでのみ発動できます"); return; }
    state.tempMods.push({ side, cIndex, amount: 1000, untilTurn: state.turn });
    log(`ニコラ：${ch.name} にATK+1000（ターン終了まで）`, "muted");
    flashNotice("ATK+1000（ターン終了まで）", 1600);
    renderAll();
    return;
  }

  if(ch.no===6){
    if(state.phase!=="MAIN"){ flashNotice("エフィ：MAINでのみ発動できます"); return; }
    const enemy = (side==="P1") ? "AI" : "P1";
    const opts = [];
    for(let i=0;i<3;i++){
      const ec = state[enemy].C[i];
      if(!ec) continue;
      opts.push({ kind:"enemyC", idx:i, card:ec, title: ec.name, subtitle:`現在ATK ${computedATK(enemy,i)} → -1000` });
    }
    if(!opts.length){ flashNotice("相手キャラクターがいません"); return; }
    const chosen = await openPick("対象選択","ATKを下げる相手キャラを選んでください", opts);
    if(!chosen) return;
    state.tempMods.push({ side: enemy, cIndex: chosen.idx, amount: -1000, untilTurn: state.turn });
    log(`エフィ：${chosen.card.name} にATK-1000（ターン終了まで）`, "muted");
    flashNotice("相手ATK-1000（ターン終了まで）", 1600);
    renderAll();
    return;
  }

  if(ch.no===9 || ch.no===10){
    if(state.phase!=="MAIN"){ flashNotice("この効果はMAINで使用します"); return; }
    const partnerName = (ch.no===9) ? "小次郎" : "小太郎";
    const idx = state[side].hand.findIndex(x=>x && x.name.includes(partnerName));
    if(idx<0){ flashNotice(`手札に「${partnerName}」がありません`); return; }
    const empty = state[side].C.findIndex(x=>!x);
    if(empty<0){ flashNotice("C枠が満杯です"); return; }
    askConfirm("相方見参", `手札の「${partnerName}」を見参させますか？（Cに登場）`, ()=>{
      const c = state[side].hand.splice(idx,1)[0];
      state[side].C[empty] = c;
      log(`相方見参：${c.name} をCへ`, "muted");
      renderAll();
    });
    return;
  }

  flashNotice("このキャラクターの起動効果は未実装です", 1800);
}

/* ---------- Effect resolution ---------- */
async function resolveEffectCard(side, card){
  log(`効果発動：${card.name}`, "muted");

  if(card.no === 2){
    if(!isCardOnStageByName(side, "クルエラ")){
      flashNotice("フレイムバレット：自分ステージにクルエラがいないため発動できません", 2600);
      return false;
    }

    const enemy = (side==="P1") ? "AI" : "P1";
    const targets = [];
    for(let i=0;i<3;i++){
      const ch = state[enemy].C[i];
      if(!ch) continue;
      targets.push({ kind:"enemyC", idx:i, card: ch, title: ch.name, subtitle: `RANK ${ch.rank} / ATK ${computedATK(enemy,i)}` });
    }
    if(!targets.length){
      flashNotice("フレイムバレット：相手キャラクターがいません", 2000);
      return false;
    }

    await openPick("対象選択","相手キャラクター1体を選択してください", targets);

    const options = [
      { kind:"opt1", title:"ATKが1番高いキャラ1体をウイングへ", subtitle:"相手ステージの最大ATKを1体送る" },
      { kind:"opt2", title:"rank4以下をすべてウイングへ", subtitle:"相手ステージのrank4以下を全処理" },
    ];
    const chosen = await openPick("効果選択","以下から1つ選択してください", options);
    if(!chosen) return false;

    if(chosen.kind==="opt1"){
      let bestIdx = -1, bestAtk = -1;
      for(let i=0;i<3;i++){
        const ch = state[enemy].C[i];
        if(!ch) continue;
        const a = computedATK(enemy,i);
        if(a > bestAtk){ bestAtk=a; bestIdx=i; }
      }
      if(bestIdx>=0){
        const removed = state[enemy].C[bestIdx];
        state[enemy].C[bestIdx]=null;
        // ★装備破壊連動（相手側でも適用）
        sendEquippedItemsToWing(enemy, bestIdx);
        state[enemy].wing.push(removed);
        log(`フレイムバレット：最大ATK→ウイング：${removed.name}`, "warn");
      }
    }else{
      let moved = 0;
      for(let i=0;i<3;i++){
        const ch = state[enemy].C[i];
        if(!ch) continue;
        if((ch.rank||0) <= 4){
          state[enemy].C[i]=null;
          sendEquippedItemsToWing(enemy, i);
          state[enemy].wing.push(ch);
          moved++;
          log(`フレイムバレット：rank4以下→ウイング：${ch.name}`, "warn");
        }
      }
      if(moved===0) log("フレイムバレット：対象がありませんでした", "muted");
    }

    flashNotice("フレイムバレットを解決しました", 1600);
    renderAll();
    return true;
  }

  if(card.no === 15){
    const opts = [];
    for(let i=0;i<3;i++){
      const ch = state[side].C[i];
      if(!ch) continue;
      opts.push({ kind:"myC", idx:i, card:ch, title: ch.name, subtitle: `現在ATK ${computedATK(side,i)} → +1000` });
    }
    if(!opts.length){
      flashNotice("陰陽術：自分キャラクターがいません", 2000);
      return false;
    }
    const chosen = await openPick("対象選択","ATKを上げる自分キャラを選んでください", opts);
    if(!chosen) return false;

    state.tempMods.push({ side, cIndex: chosen.idx, amount: 1000, untilTurn: state.turn });
    log(`陰陽術：${chosen.card.name} にATK+1000（ターン終了まで）`, "muted");
    flashNotice("陰陽術を解決しました", 1600);
    renderAll();
    return true;
  }

  if(card.no === 16){
    if(state.activeSide !== side){
      flashNotice("力こそパワー！！：自分ターンにのみ発動できます", 2400);
      return false;
    }
    const enemy = (side==="P1") ? "AI" : "P1";
    const idxs = [];
    for(let i=0;i<3;i++) if(state[enemy].C[i]) idxs.push(i);
    if(!idxs.length){
      flashNotice("力こそパワー！！：相手キャラクターがいません", 2000);
      return false;
    }
    let bestIdx = idxs[0];
    let bestAtk = computedATK(enemy, bestIdx);
    for(const i of idxs.slice(1)){
      const a = computedATK(enemy,i);
      if(a < bestAtk){ bestAtk=a; bestIdx=i; }
    }
    const removed = state[enemy].C[bestIdx];
    state[enemy].C[bestIdx]=null;
    sendEquippedItemsToWing(enemy, bestIdx);
    state[enemy].wing.push(removed);
    log(`力こそパワー！！：最小ATK→ウイング：${removed.name}`, "warn");
    flashNotice("力こそパワー！！を解決しました", 1600);
    renderAll();
    return true;
  }

  flashNotice(`未実装の効果です：${card.name}`, 2200);
  return true;
}

async function resolveEffectFromE(side, eIndex){
  const raw = state[side].E[eIndex];
  if(!raw || raw._kind !== "E_EFFECT_WRAPPER") return;
  const effectCard = raw.effect;
  if(!effectCard) return;

  const ok = await resolveEffectCard(side, effectCard);
  if(!ok) return;

  state[side].E[eIndex] = null;
  state[side].wing.push(effectCard);
  log(`${side==="P1"?"あなた":"AI"}：エフェクト使用→ウイング：${effectCard.name}`, "muted");
  renderAll();
}

/* ---------- Rendering ---------- */
function faceForCard(card){
  const face = document.createElement("div");
  face.className = "face";
  const url = state.img.cardUrlByNo[pad2(card.no)];
  if(url) face.style.backgroundImage = `url("${url}")`;
  else face.classList.add("fallback");
  return face;
}

function makeSlot(card, label, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.enemy) slot.classList.add("enemySlot");
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel)  slot.classList.add("sel");
  if(opts.disabled){ slot.style.opacity = ".55"; }

  if(card){
    slot.classList.add("filled");
    slot.appendChild(faceForCard(card));
  }else{
    const hint = document.createElement("div");
    hint.className = "slotHint";
    hint.textContent = label;
    slot.appendChild(hint);
  }
  return slot;
}

function renderEnemyHand(){
  el.aiHand.innerHTML = "";
  const n = state.AI.hand.length;
  const show = Math.min(n, 16);
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
    ensureShieldCountBadge(cell).textContent = `${count}/3`;

    cell.onclick = ()=> { if(side==="AI") onClickEnemyShield(idx); };
  });
}

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

function renderHand(){
  el.hand.innerHTML = "";
  for(let i=0;i<state.P1.hand.length;i++){
    const c = state.P1.hand[i];
    const h = document.createElement("div");
    h.className = "handCard";
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage = `url("${url}")`;
    else h.style.backgroundImage = "linear-gradient(135deg, rgba(89,242,255,.10), rgba(179,91,255,.08))";

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1" || state.aiRunning) return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=> openViewer(c, {zone:"HAND"}));
    el.hand.appendChild(h);
  }
}

function renderZones(){
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    const card = unwrapE("AI", i);
    const slot = makeSlot(card, `E${i+1}`, {enemy:true});
    if(card) bindLongPress(slot, ()=> openViewer(card, {side:"AI", zone:"E", index:i}));
    el.aiE.appendChild(slot);
  }

  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.AI.C[i];
    const slot = makeSlot(c, `C${i+1}`, {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    if(c) bindLongPress(slot, ()=> openViewer(c, {side:"AI", zone:"C", index:i}));
    el.aiC.appendChild(slot);
  }

  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const used = state.attackedThisTurn.P1[i];
    const slot = makeSlot(c, `C${i+1}`, {sel: state.selectedAttackerPos===i, disabled: (state.phase==="BATTLE" && used)});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c) bindLongPress(slot, ()=> onLongPressEmptyCForKenSan(i));
    if(c) bindLongPress(slot, ()=> openViewer(c, {side:"P1", zone:"C", index:i}));
    el.pC.appendChild(slot);
  }

  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const card = unwrapE("P1", i);
    const slot = makeSlot(card, `E${i+1}`, {});
    slot.addEventListener("click", async ()=>{
      if(state.activeSide!=="P1" || state.aiRunning) return;
      const raw = state.P1.E[i];
      if(raw && raw._kind==="E_EFFECT_WRAPPER"){
        await resolveEffectFromE("P1", i);
        return;
      }
      onClickYourE(i);
    }, {passive:true});
    if(card) bindLongPress(slot, ()=> openViewer(card, {side:"P1", zone:"E", index:i}));
    el.pE.appendChild(slot);
  }
}

function renderAll(){
  try{
    updateCounts();
    updateHUD();
    renderZones();
    renderHand();
    renderEnemyHand();
    renderShields();
  }catch(e){
    log(`描画エラー: ${String(e?.message || e)}`, "warn");
  }
}

/* ---------- Placement rules ---------- */
function canPlaceToC(card){ return card && card.type==="character"; }
function canPlaceToE(card){ return card && (card.type==="effect" || card.type==="item"); }

/* ---------- Kensan ---------- */
function listCostCandidatesForKensan(side, excludeUid){
  const p = state[side];
  const opts = [];
  for(let i=0;i<p.hand.length;i++){
    const c = p.hand[i];
    if(!c) continue;
    if(c._uid === excludeUid) continue;
    opts.push({ kind:"hand", handIndex:i, card:c, title:c.name, subtitle:"手札" });
  }
  for(let i=0;i<3;i++){
    if(p.C[i]) opts.push({ kind:"stageC", stageIndex:i, card:p.C[i], title:p.C[i].name, subtitle:`自分C${i+1}` });
    const eCard = unwrapE(side,i);
    if(eCard) opts.push({ kind:"stageE", stageIndex:i, card:eCard, title:eCard.name, subtitle:`自分E${i+1}` });
  }
  return opts;
}
function payChosenCost(side, opt){
  const p = state[side];
  if(opt.kind==="hand"){
    const c = p.hand.splice(opt.handIndex,1)[0];
    p.wing.push(c);
    return c;
  }
  if(opt.kind==="stageC"){
    const c = p.C[opt.stageIndex];
    p.C[opt.stageIndex]=null;
    // ★装備破壊連動（コストで場から送った場合でも装備を処理）
    sendEquippedItemsToWing(side, opt.stageIndex);
    p.wing.push(c);
    return c;
  }
  if(opt.kind==="stageE"){
    const raw = p.E[opt.stageIndex];
    p.E[opt.stageIndex]=null;
    state.equipMeta[side][opt.stageIndex] = null;

    const c = (raw && raw._kind==="E_ITEM_WRAPPER") ? raw.item
            : (raw && raw._kind==="E_EFFECT_WRAPPER") ? raw.effect
            : raw;
    if(c) p.wing.push(c);
    return c;
  }
  return null;
}

/* ---------- Actions ---------- */
async function equipItemFlowFromHandToE(eIndex, itemCard){
  const options = [];
  for(let ci=0; ci<3; ci++){
    const ch = state.P1.C[ci];
    if(!ch) continue;
    const add = equipBonus(itemCard, ch);
    options.push({ kind:"equip", cIndex: ci, card: ch, title: ch.name, subtitle: `装備でATK +${add}（現在 ${computedATK("P1",ci)}）` });
  }
  if(!options.length){
    flashNotice("装備先がありません（先にキャラクターをCに登場させてください）", 2600);
    return false;
  }

  const chosen = await openPick("装備先を選択", `「${itemCard.name}」を装備するキャラクターを選んでください`, options);
  if(!chosen) return false;

  state.P1.E[eIndex] = { _kind:"E_ITEM_WRAPPER", item: itemCard };
  state.equipMeta.P1[eIndex] = { item: itemCard, equipTo:{ side:"P1", cIndex: chosen.cIndex } };

  log(`装備：${itemCard.name} → ${state.P1.C[chosen.cIndex].name}`, "muted");
  return true;
}

function onClickYourC(pos){
  if(state.activeSide!=="P1" || state.aiRunning) return;

  if(state.phase==="BATTLE"){
    const ch = state.P1.C[pos];
    if(!ch){ flashNotice("攻撃に使うキャラを選んでください"); return; }

    // ★このターン攻撃済みなら選択不可
    if(state.attackedThisTurn.P1[pos]){
      flashNotice("このキャラクターはこのターン既に攻撃しています");
      return;
    }

    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }

  if(state.phase==="MAIN"){
    const occupied = state.P1.C[pos];

    if(state.selectedHandIndex==null){
      if(!occupied){ flashNotice("手札を選択して配置するか、空C長押しで見参してください"); return; }
      activateOnTapAbility("P1", pos);
      return;
    }

    if(occupied){ flashNotice("そのC枠は埋まっています"); return; }

    const card = state.P1.hand[state.selectedHandIndex];
    if(!card){ flashNotice("手札を選択してください"); return; }
    if(!canPlaceToC(card)){ flashNotice("Cにはキャラクターのみ置けます"); return; }
    if(card.cannotNormalSummon){ flashNotice("このキャラは登場できません。空Cを長押しで見参してください"); return; }
    if(state.normalSummonUsed){ flashNotice("登場は1ターン1回です"); return; }

    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    state.normalSummonUsed = true;
    state.P1.C[pos] = card;
    log(`登場：${card.name}`, "muted");
    afterSummonTrigger("P1", card);
    renderAll();
    return;
  }

  flashNotice("このフェイズでは操作できません");
}

async function onClickYourE(pos){
  if(state.activeSide!=="P1" || state.aiRunning) return;
  if(state.phase!=="MAIN"){ flashNotice("MAINでのみ配置できます"); return; }
  if(state.selectedHandIndex==null){ flashNotice("手札を選択してください"); return; }

  const existing = state.P1.E[pos];
  if(existing){ flashNotice("そのE枠は埋まっています（エフェクトはタップで発動）"); return; }

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card){ flashNotice("手札を選択してください"); return; }
  if(!canPlaceToE(card)){ flashNotice("Eにはエフェクト/アイテムのみ置けます"); return; }

  if(card.type === "item"){
    const ok = await equipItemFlowFromHandToE(pos, card);
    if(!ok){ renderAll(); return; }
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex = null;
    renderAll();
    return;
  }

  if(card.no === 2 && !isCardOnStageByName("P1","クルエラ")){
    flashNotice("フレイムバレット：クルエラがいないため配置できません", 2600);
    return;
  }

  state.P1.E[pos] = { _kind:"E_EFFECT_WRAPPER", effect: card };
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;

  log(`エフェクト配置：${card.name}（タップで発動→ウイング）`, "muted");
  flashNotice("配置したエフェクトをタップして発動してください", 2000);
  renderAll();
}

/* ★Kensan UID fix（継続） */
async function onLongPressEmptyCForKenSan(pos){
  if(state.activeSide!=="P1" || state.aiRunning) return;
  if(state.phase!=="MAIN"){ flashNotice("MAINでのみ見参できます"); return; }
  if(state.selectedHandIndex==null){ flashNotice("見参するカードを手札から選択してください"); return; }
  if(state.P1.C[pos]){ flashNotice("そのC枠は埋まっています"); return; }

  const selected = state.P1.hand[state.selectedHandIndex];
  if(!selected){ flashNotice("手札を選択してください"); return; }
  if(selected.type!=="character"){ flashNotice("見参できるのはキャラクターのみです"); return; }
  if(!selected.cannotNormalSummon){ flashNotice("このキャラは登場できます（空Cをタップ）"); return; }

  const summonUid = selected._uid;

  const candidates = listCostCandidatesForKensan("P1", summonUid);
  if(!candidates.length){
    flashNotice("見参：コスト不足（手札またはステージのカード1枚が必要）", 2600);
    return;
  }

  const chosen = await openPick("見参コスト選択", `「${selected.name}」を見参します。コストにするカードを1枚選んでください`, candidates);
  if(!chosen){ flashNotice("見参をキャンセルしました"); return; }

  const paid = payChosenCost("P1", chosen);
  if(!paid){
    flashNotice("見参：コスト処理に失敗しました");
    renderAll();
    return;
  }

  const newIndex = state.P1.hand.findIndex(c => c && c._uid === summonUid);
  if(newIndex < 0){
    flashNotice("見参：対象カードが手札から消失しました（不整合）", 2600);
    renderAll();
    return;
  }

  const summonCard = state.P1.hand.splice(newIndex, 1)[0];
  state.P1.C[pos] = summonCard;
  state.selectedHandIndex = null;

  log(`見参：${summonCard.name}（コスト：${paid.name}）`, "muted");
  afterSummonTrigger("P1", summonCard);
  renderAll();
}

/* ---------- Battle ---------- */
async function maybeTriggerCattleMutilation(loserSide, enemySide){
  if(loserSide!=="P1") return;

  const idx = state.P1.hand.findIndex(c=>c && c.no===17);
  if(idx<0) return;

  const opts = [];
  for(let i=0;i<3;i++){
    const ec = state[enemySide].C[i];
    if(!ec) continue;
    opts.push({ kind:"enemyC", idx:i, card:ec, title: ec.name, subtitle:"手札に戻す" });
  }
  if(!opts.length) return;

  askConfirm("誘発（キャトルミューティレーション）","バトルで自分キャラがウイングに送られました。\n「キャトルミューティレーション」を発動しますか？", async ()=>{
    const eff = state.P1.hand.splice(idx,1)[0];
    const chosen = await openPick("対象選択","手札に戻す相手キャラを選択してください", opts);
    if(!chosen){
      state.P1.hand.push(eff);
      flashNotice("キャンセルしました", 1200);
      renderAll();
      return;
    }
    const target = state[enemySide].C[chosen.idx];
    state[enemySide].C[chosen.idx] = null;

    // ★装備破壊連動：相手が装備していたら装備もウイングへ（戻す前に）
    sendEquippedItemsToWing(enemySide, chosen.idx);

    state[enemySide].hand.push(target);
    state.P1.wing.push(eff);
    log(`キャトルミューティレーション：${target.name} を相手手札へ`, "warn");
    flashNotice("キャトルミューティレーションを解決しました", 1600);
    renderAll();
  });
}

function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  const atkA = computedATK(aSide, aPos);
  const atkD = computedATK(dSide, dPos);

  log(`バトル：${A.name}(${atkA}) vs ${D.name}(${atkD})`, "muted");

  const guardTurnKey = `guardTurn_${state.turn}`;
  const canGuardA = (A.no===12 && A._oncePerTurnFlags[guardTurnKey] !== true);
  const canGuardD = (D.no===12 && D._oncePerTurnFlags[guardTurnKey] !== true);

  if(atkA === atkD){
    if(canGuardA){
      A._oncePerTurnFlags[guardTurnKey] = true;
      log(`班目：${A.name} はバトル破壊を1回無効にしました`, "muted");
    }else{
      state[aSide].C[aPos]=null;
      // ★装備破壊連動
      sendEquippedItemsToWing(aSide, aPos);
      state[aSide].wing.push(A);
    }

    if(canGuardD){
      D._oncePerTurnFlags[guardTurnKey] = true;
      log(`班目：${D.name} はバトル破壊を1回無効にしました`, "muted");
    }else{
      state[dSide].C[dPos]=null;
      sendEquippedItemsToWing(dSide, dPos);
      state[dSide].wing.push(D);
    }

    if(aSide==="P1" && !state.P1.C[aPos]) maybeTriggerCattleMutilation("P1", "AI");
    if(dSide==="P1" && !state.P1.C[dPos]) maybeTriggerCattleMutilation("P1", "AI");
    return;
  }

  if(atkA > atkD){
    if(canGuardD){
      D._oncePerTurnFlags[guardTurnKey] = true;
      log(`班目：${D.name} はバトル破壊を1回無効にしました`, "muted");
    }else{
      state[dSide].C[dPos]=null;
      sendEquippedItemsToWing(dSide, dPos);
      state[dSide].wing.push(D);
      log(`勝利：${A.name} → 相手「${D.name}」をウイングへ`, "muted");

      if(aSide==="P1" && attackerHasAlongditeBonus(aSide, aPos)){
        draw("P1", 1);
        log("アロングダイト：撃破ドロー +1", "muted");
      }
    }
  }else{
    if(canGuardA){
      A._oncePerTurnFlags[guardTurnKey] = true;
      log(`班目：${A.name} はバトル破壊を1回無効にしました`, "muted");
    }else{
      state[aSide].C[aPos]=null;
      sendEquippedItemsToWing(aSide, aPos);
      state[aSide].wing.push(A);
      log(`敗北：${D.name} → 自分「${A.name}」がウイングへ`, "warn");
      if(aSide==="P1") maybeTriggerCattleMutilation("P1", "AI");
    }
  }
}

function onClickEnemyCard(enemyPos){
  if(state.activeSide!=="P1" || state.aiRunning) return;
  if(state.phase!=="BATTLE"){ flashNotice("BATTLEフェイズで攻撃できます"); return; }
  if(state.selectedAttackerPos==null){ flashNotice("攻撃する自分キャラを選択してください"); return; }

  const atkPos = state.selectedAttackerPos;
  if(state.attackedThisTurn.P1[atkPos]){
    flashNotice("そのキャラクターはこのターン既に攻撃しています");
    state.selectedAttackerPos = null;
    renderAll();
    return;
  }

  const atkCard = state.P1.C[atkPos];
  const defCard = state.AI.C[enemyPos];
  if(!atkCard || !defCard){ flashNotice("攻撃対象がいません"); return; }

  const atkA = computedATK("P1", atkPos);
  const atkD = computedATK("AI", enemyPos);

  askConfirm("攻撃確認", `${atkCard.name}（ATK ${atkA}） → ${defCard.name}（ATK ${atkD}）\n攻撃しますか？`, ()=>{
    resolveBattle_CvC("P1", atkPos, "AI", enemyPos);

    // ★攻撃済みを確定
    state.attackedThisTurn.P1[atkPos] = true;

    state.selectedAttackerPos = null;
    renderAll();
    flashNotice("バトル解決しました", 1200);
  });
}

function onClickEnemyShield(idx){
  if(state.activeSide!=="P1" || state.aiRunning) return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null){ flashNotice("自分の攻撃キャラを選択してください"); return; }

  const atkPos = state.selectedAttackerPos;
  if(state.attackedThisTurn.P1[atkPos]){
    flashNotice("そのキャラクターはこのターン既に攻撃しています");
    state.selectedAttackerPos = null;
    renderAll();
    return;
  }

  if(canDirectAttackAgainst("P1")){
    askConfirm("ダイレクトアタック", "相手のシールドが0、キャラクターも0です。\nダイレクトアタックを行いますか？", ()=>{
      log("ダイレクトアタック：あなた→相手", "warn");
      // ★攻撃済み扱い（演出上）
      state.attackedThisTurn.P1[atkPos] = true;
      winYou();
    });
    return;
  }

  const atkCard = state.P1.C[atkPos];
  if(!atkCard) return;

  const enemyHasC = state.AI.C.some(Boolean);
  if(enemyHasC){
    flashNotice("相手キャラがいる間はシールドを攻撃できません");
    return;
  }
  if(!state.AI.shield[idx]){
    flashNotice("そのシールドは既にありません");
    return;
  }

  askConfirm("攻撃確認", `${atkCard.name} がシールドを攻撃します。\nシールドを破壊（→相手手札）しますか？`, ()=>{
    const sh = state.AI.shield[idx];
    state.AI.shield[idx] = null;
    state.AI.hand.push(sh);
    log(`シールド破壊：相手手札へ → ${sh.name}`, "warn");

    // ★攻撃済み
    state.attackedThisTurn.P1[atkPos] = true;

    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- AI (simple) ---------- */
function aiMain(){
  const emptyC = state.AI.C.findIndex(x=>!x);
  if(emptyC>=0){
    const idx = state.AI.hand.findIndex(c=>c.type==="character" && !c.cannotNormalSummon);
    if(idx>=0){
      const c = state.AI.hand.splice(idx,1)[0];
      state.AI.C[emptyC]=c;
      log(`AI：登場 → ${c.name}`, "muted");
      if(c.no===5) draw("AI",2);
    }
  }

  const emptyE = state.AI.E.findIndex(x=>!x);
  if(emptyE>=0){
    const idxE = state.AI.hand.findIndex(c=>c.type!=="character");
    if(idxE>=0){
      const c = state.AI.hand.splice(idxE,1)[0];
      if(c.type==="effect"){
        state.AI.E[emptyE] = { _kind:"E_EFFECT_WRAPPER", effect:c };
      }else{
        state.AI.E[emptyE] = { _kind:"E_ITEM_WRAPPER", item:c };
      }
      log(`AI：配置 → ${c.name}`, "muted");
    }
  }
}

function aiBattle(){
  if(canDirectAttackAgainst("AI")){
    log("ダイレクトアタック：相手→あなた", "warn");
    loseYou();
    return;
  }

  for(let i=0;i<3;i++){
    const atk = state.AI.C[i];
    if(!atk) continue;

    // ★AIも1回/ターン
    if(state.attackedThisTurn.AI[i]) continue;

    const playerIdxs = state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(playerIdxs.length){
      const t = playerIdxs[Math.floor(Math.random()*playerIdxs.length)];
      resolveBattle_CvC("AI", i, "P1", t);
      state.attackedThisTurn.AI[i] = true;
    }else{
      const sidx = state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        const sh = state.P1.shield[sidx];
        state.P1.shield[sidx] = null;
        state.P1.hand.push(sh);
        log(`AI：シールド破壊 → あなた手札へ ${sh.name}`, "warn");
        state.attackedThisTurn.AI[i] = true;
      }
    }
  }
}

function applyStartOfOpponentTurnTriggers(){
  if(state.activeSide !== "AI") return;
  for(let ei=0; ei<3; ei++){
    const m = state.equipMeta.P1[ei];
    if(!m || !m.item || m.item.no!==18) continue;
    const to = m.equipTo;
    if(!to) continue;
    const wearer = state.P1.C[to.cIndex];
    if(!wearer) continue;

    if(hasTag(wearer, "射手")){
      if(state.AI.hand.length>0){
        const r = Math.floor(Math.random()*state.AI.hand.length);
        const lost = state.AI.hand.splice(r,1)[0];
        state.AI.wing.push(lost);
        log(`放射型：相手手札をランダムにウイングへ → ${lost.name}`, "warn");
        flashNotice("放射型：相手手札を1枚ウイングへ", 1600);
      }
    }
  }
}

async function runAITurn(){
  if(state.aiRunning) return;
  if(state.activeSide !== "AI") return;

  state.aiRunning = true;
  try{
    state.phase="START"; resetTurnFlagsFor("AI"); renderAll();
    applyStartOfOpponentTurnTriggers();

    state.phase="DRAW";  draw("AI", 1); renderAll();
    state.phase="MAIN";  aiMain(); renderAll();
    state.phase="BATTLE"; aiBattle(); renderAll();
    state.phase="END"; enforceHandLimit("AI"); renderAll();

    state.turn++;
    state.activeSide = "P1";
    state.phase = "START";
    resetTurnFlagsFor("P1");

    state.tempMods = state.tempMods.filter(b => b.untilTurn >= state.turn);

    renderAll();
    flashNotice("あなたのターンです：DRAWへ進めてください");
  }finally{
    state.aiRunning = false;
    renderAll();
  }
}

/* ---------- Phase control ---------- */
function nextPhase(){
  if(state.activeSide!=="P1" || state.aiRunning) return;

  const i = PHASES.indexOf(state.phase);
  const next = PHASES[(i+1)%PHASES.length];
  state.phase = next;

  if(next==="START"){
    resetTurnFlagsFor(state.activeSide);
  }
  if(next==="DRAW"){
    draw(state.activeSide, 1);
    log(`あなた：ドロー +1`, "muted");
  }
  if(next==="END"){
    state.tempMods = state.tempMods.filter(b => !(b.side===state.activeSide && b.untilTurn===state.turn));
    enforceHandLimit(state.activeSide);
  }

  renderAll();
}

function endTurn(){
  if(state.activeSide!=="P1" || state.aiRunning) return;

  state.tempMods = state.tempMods.filter(b => !(b.side===state.activeSide && b.untilTurn===state.turn));
  enforceHandLimit("P1");

  // ★確実に相手ターンへ
  state.activeSide = "AI";
  state.phase = "START";
  state.selectedHandIndex = null;
  state.selectedAttackerPos = null;

  renderAll();
  runAITurn();
}

/* ---------- Start Game ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
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
  state.equipMeta.P1 = [null,null,null];
  state.equipMeta.AI = [null,null,null];

  state.P1.wing = [];
  state.AI.wing = [];
  state.P1.outside = [];
  state.AI.outside = [];

  state.tempMods = [];
  state.flags.kuruerraSearchUsed = false;
  state.flags.tartaExchangeUsed = false;

  state.firstSide = (Math.random() < 0.5) ? "P1" : "AI";
  state.activeSide = state.firstSide;

  // ★攻撃リセット
  state.attackedThisTurn.P1 = [false,false,false];
  state.attackedThisTurn.AI = [false,false,false];

  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  log("ゲーム開始：初期手札4（双方）／DRAWで+1して5になります", "muted");

  resetTurnFlagsFor("P1");
  renderAll();

  if(state.activeSide==="AI"){
    flashNotice("相手が先攻です：相手ターン開始");
    runAITurn();
  }else{
    flashNotice("あなたが先攻です：DRAWへ進めてください");
  }
}

/* ---------- Bind UI ---------- */
function bindStart(){
  el.boot.textContent = "JS: OK（読み込み成功）";
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

function bindHUDButtons(){
  $("btnHelp").addEventListener("click", ()=> showModal("helpM"), {passive:true});
  $("btnSettings").addEventListener("click", ()=>{
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
  el.btnNext.addEventListener("click", ()=> nextPhase(), {passive:true});
  el.btnEnd.addEventListener("click", ()=> endTurn(), {passive:true});
}

function bindLogButton(){
  const btn = $("btnLog");
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(()=>{ renderLogModal(); showModal("logM"); }, 320); };
  const end = ()=> clearTimeout(t);
  btn.addEventListener("mousedown", start);
  btn.addEventListener("mouseup", end);
  btn.addEventListener("mouseleave", end);
  btn.addEventListener("touchstart", start, {passive:true});
  btn.addEventListener("touchend", end, {passive:true});
}

/* ---------- init ---------- */
async function init(){
  el.boot.textContent = "JS: OK（初期化中…）";
  setNotice("読み込み中…");

  bindStart();
  bindHUDButtons();
  bindSettings();
  bindPhaseButtons();
  bindBoardClicks();
  bindLogButton();

  const cache = getCache();
  if(cache && cache.assetFiles && cache.cardFiles && cache.repo === getRepo()){
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent = "JS: OK（準備完了）";
  setNotice("準備完了：STARTで開始してください");
  log("v40022：iPhone盤面拡大/余白詰め・フィールドカード縮小・攻撃1回/ターン・装備同時破壊・クルエラサーチ修正", "muted");
}

document.addEventListener("DOMContentLoaded", init);