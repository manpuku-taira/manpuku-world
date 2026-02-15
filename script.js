/* =========================================================
  Manpuku World - v40017
  FIX (確実に遊べる優先):
   1) C/E枠を固定小型スロット化（常に視認できる）
   2) 空スロットは点線+ラベル表示（どこを押すか明確）
   3) ターン開始時にターン内フラグを必ずリセット（次ターン置けない問題を修正）
   4) 見参コスト：手札 or ステージ から1枚を“選んで”ウイングへ（UI実装）
   5) Notice（常時アナウンス）を追加
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

  logM: $("logM"),
  logBody: $("logBody"),

  confirmTitle: $("confirmTitle"),
  confirmBody: $("confirmBody"),
  btnYes: $("btnYes"),
  btnNo: $("btnNo"),

  pickTitle: $("pickTitle"),
  pickHint: $("pickHint"),
  pickList: $("pickList"),

  settingsM: $("settingsM"),
  repoInput: $("repoInput"),
  btnRepoSave: $("btnRepoSave"),
  btnRescan: $("btnRescan"),
  btnClearCache: $("btnClearCache"),
};

/* ---------- Logs ---------- */
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
  for(const it of LOGS.slice(0, 200)){
    const d = document.createElement("div");
    d.className = `logLine ${it.kind}`;
    d.textContent = it.msg;
    el.logBody.appendChild(d);
  }
}

/* ---------- Notice ---------- */
let noticeTimer = null;
function setNotice(text){
  el.notice.textContent = text;
}
function flashNotice(text, ms=2200){
  setNotice(text);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(()=> updateNoticeByState(), ms);
}
function updateNoticeByState(){
  const you = (state.activeSide==="P1");
  if(!state.started){ setNotice("読み込み中…"); return; }

  if(!you){
    setNotice("相手ターンです（操作できません）");
    return;
  }

  if(state.phase==="MAIN"){
    if(state.selectedHandIndex==null){
      setNotice("手札をタップして選択 → C（登場）/ E（配置）／登場不可キャラは空C長押しで見参");
      return;
    }
    const c = state.P1.hand[state.selectedHandIndex];
    if(!c){
      setNotice("手札を選択してください");
      return;
    }
    if(c.type==="character"){
      if(c.cannotNormalSummon){
        setNotice("登場不可キャラ：空Cを長押しで見参（コスト選択）");
      }else{
        setNotice("キャラ：空Cをタップで登場（1ターン1回）");
      }
    }else{
      setNotice("エフェクト/アイテム：空Eをタップで配置");
    }
    return;
  }

  if(state.phase==="BATTLE"){
    if(state.selectedAttackerPos==null){
      setNotice("攻撃する自分キャラをタップで選択 → 相手キャラ/シールドをタップ");
    }else{
      setNotice("攻撃先をタップしてください（相手キャラ or シールド）");
    }
    return;
  }

  setNotice("次のフェイズへ進めてください");
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
  Cards No.01〜20（最低限のルール基盤）
========================================================= */
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
  { no:8,  id:"card_08", name:"組織の男 手形", type:"effect", rank:3, atk:0, tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター",
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
].map(c => ({
  ...c,
  text: normalizeText((c.effects || []).join("\n")),
}));

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

function buildDeck(){
  const deck = [];
  for(const c of CardRegistry){ deck.push({...c}); deck.push({...c}); } // 40枚
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

  // ターン内フラグ
  normalSummonUsed:false,

  // selections
  selectedHandIndex:null,
  selectedAttackerPos:null,

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
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(fn, ms); };
  const end = ()=> clearTimeout(t);
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
}

/* ---------- HUD / Counts ---------- */
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

/* ---------- Viewer / Zone ---------- */
function openViewer(card){
  $("viewerTitle").textContent = `${card.name}`;
  $("viewerText").textContent = (card.text || "");
  const url = state.img.cardUrlByNo[pad2(card.no)];
  $("viewerImg").src = url || "";
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
  if(confirmYes){ const fn = confirmYes; confirmYes=null; fn(); }
}, {passive:true});

/* ---------- Picker (見参コスト選択) ---------- */
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
    const url = state.img.cardUrlByNo[pad2(opt.card.no)];
    if(url) th.style.backgroundImage = `url("${url}")`;
    else th.style.backgroundImage = "linear-gradient(135deg, rgba(89,242,255,.10), rgba(179,91,255,.08))";

    const meta = document.createElement("div");
    meta.className = "pickMeta";
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = opt.card.name;
    const s = document.createElement("div");
    s.className = "s";
    s.textContent = `${opt.from} / ${opt.card.type.toUpperCase()}`;
    meta.appendChild(t); meta.appendChild(s);

    it.appendChild(th); it.appendChild(meta);

    it.addEventListener("click", ()=>{
      hideModal("pickM");
      if(pickResolve){ const fn = pickResolve; pickResolve=null; fn(opt); }
    }, {passive:true});

    el.pickList.appendChild(it);
  }

  showModal("pickM");
  return new Promise((resolve)=>{ pickResolve = resolve; });
}

/* ---------- Core game ---------- */
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

/* ターン開始時のリセット（ここが次ターン置けない原因の根） */
function resetTurnFlagsFor(side){
  if(side==="P1"){
    state.normalSummonUsed = false;
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
  }
}

/* ---------- Slot render（小型固定） ---------- */
function faceForCard(card){
  const face = document.createElement("div");
  face.className = "face";
  const url = state.img.cardUrlByNo[pad2(card.no)];
  if(url){
    face.style.backgroundImage = `url("${url}")`;
  }else{
    face.classList.add("fallback");
  }
  return face;
}

function makeSlot(card, label, opts={}){
  const slot = document.createElement("div");
  slot.className = "slot";
  if(opts.enemy) slot.classList.add("enemySlot");
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel)  slot.classList.add("sel");

  if(card){
    slot.classList.add("filled");
    slot.appendChild(faceForCard(card));
    bindLongPress(slot, ()=> openViewer(card));
  }else{
    const hint = document.createElement("div");
    hint.className = "slotHint";
    hint.textContent = label;
    slot.appendChild(hint);
  }
  return slot;
}

/* ---------- Combat (簡易) ---------- */
function resolveBattle_CvC(aSide, aPos, dSide, dPos){
  const A = state[aSide].C[aPos];
  const D = state[dSide].C[dPos];
  if(!A || !D) return;

  log(`バトル：${A.name}(${A.atk}) vs ${D.name}(${D.atk})`, "muted");

  if(A.atk === D.atk){
    state[aSide].C[aPos]=null;
    state[dSide].C[dPos]=null;
    state[aSide].wing.push(A);
    state[dSide].wing.push(D);
    log("同値処理：相打ち（両方ウイング）", "muted");
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

/* ---------- 見参コスト候補（手札 or ステージ、対象自身を除外） ---------- */
function listCostCandidatesForKensan(side, excludeHandIndex){
  const p = state[side];
  const opts = [];

  // hand
  for(let i=0;i<p.hand.length;i++){
    if(i===excludeHandIndex) continue;
    const c = p.hand[i];
    if(!c) continue;
    opts.push({
      from: "手札",
      kind: "hand",
      handIndex: i,
      card: c
    });
  }

  // stage C/E
  for(let i=0;i<3;i++){
    if(p.C[i]){
      opts.push({ from: `自分C${i+1}`, kind:"stageC", stageIndex:i, card:p.C[i] });
    }
    if(p.E[i]){
      opts.push({ from: `自分E${i+1}`, kind:"stageE", stageIndex:i, card:p.E[i] });
    }
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
    p.wing.push(c);
    return c;
  }
  if(opt.kind==="stageE"){
    const c = p.E[opt.stageIndex];
    p.E[opt.stageIndex]=null;
    p.wing.push(c);
    return c;
  }
  return null;
}

/* ---------- Player actions ---------- */
function onClickYourC(pos){
  if(state.activeSide!=="P1") return;

  if(state.phase === "MAIN"){
    if(state.selectedHandIndex==null){
      flashNotice("手札を選択してください");
      return;
    }
    if(state.P1.C[pos]){ flashNotice("そのC枠は埋まっています"); return; }

    const card = state.P1.hand[state.selectedHandIndex];
    if(!card){ flashNotice("手札を選択してください"); return; }

    if(card.type !== "character"){
      flashNotice("Cにはキャラクターのみ置けます");
      return;
    }
    if(card.cannotNormalSummon){
      flashNotice("このキャラは登場できません。空Cを長押しで見参してください");
      return;
    }
    if(state.normalSummonUsed){
      flashNotice("登場（通常召喚）は1ターン1回です");
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

  if(state.phase === "BATTLE"){
    if(!state.P1.C[pos]){ flashNotice("攻撃に使うキャラを選んでください"); return; }
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    renderAll();
    return;
  }
}

function onClickYourE(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN"){ flashNotice("MAINでのみ配置できます"); return; }
  if(state.selectedHandIndex==null){ flashNotice("手札を選択してください"); return; }
  if(state.P1.E[pos]){ flashNotice("そのE枠は埋まっています"); return; }

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card){ flashNotice("手札を選択してください"); return; }

  if(card.type === "character"){
    flashNotice("Eにはエフェクト/アイテムのみ置けます");
    return;
  }

  state.P1.E[pos] = card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex = null;
  log(`配置：${card.name}`, "muted");
  renderAll();
}

/* 見参：空C長押し（無制限・コスト選択UI） */
async function onLongPressEmptyCForKenSan(pos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="MAIN"){ flashNotice("MAINでのみ見参できます"); return; }
  if(state.selectedHandIndex==null){ flashNotice("見参するカードを手札から選択してください"); return; }
  if(state.P1.C[pos]){ flashNotice("そのC枠は埋まっています"); return; }

  const card = state.P1.hand[state.selectedHandIndex];
  if(!card){ flashNotice("手札を選択してください"); return; }
  if(card.type!=="character"){ flashNotice("見参できるのはキャラクターのみです"); return; }
  if(!card.cannotNormalSummon){ flashNotice("このキャラは登場できます（空Cをタップ）"); return; }

  const candidates = listCostCandidatesForKensan("P1", state.selectedHandIndex);
  if(candidates.length<=0){
    flashNotice("見参：コスト不足（手札またはステージのカード1枚が必要）");
    return;
  }

  flashNotice("見参コストを選択してください（手札 or ステージから1枚）", 3000);
  const chosen = await openPick(
    "見参コスト選択",
    `「${card.name}」を見参します。コストにするカードを1枚選んでください`,
    candidates
  );

  if(!chosen){
    flashNotice("見参をキャンセルしました");
    return;
  }

  // コスト支払い
  const paid = payChosenCost("P1", chosen);
  if(!paid){
    flashNotice("見参：コスト処理に失敗しました");
    renderAll();
    return;
  }

  // 見参対象を場へ
  const summonCard = state.P1.hand.splice(state.selectedHandIndex,1)[0];
  state.P1.C[pos] = summonCard;
  state.selectedHandIndex = null;

  log(`見参：${summonCard.name}（コスト：${paid.name}）`, "muted");
  renderAll();
}

function onClickEnemyCard(enemyPos){
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null){ flashNotice("自分の攻撃キャラを選択してください"); return; }

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
  if(state.selectedAttackerPos==null){ flashNotice("自分の攻撃キャラを選択してください"); return; }

  const atkCard = state.P1.C[state.selectedAttackerPos];
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
    state.selectedAttackerPos = null;
    renderAll();
  });
}

/* ---------- AI (簡易) ---------- */
function aiMain(){
  const emptyC = state.AI.C.findIndex(x=>!x);
  if(emptyC>=0){
    const idx = state.AI.hand.findIndex(c=>c.type==="character" && !c.cannotNormalSummon);
    if(idx>=0){
      const c = state.AI.hand.splice(idx,1)[0];
      state.AI.C[emptyC]=c;
      log(`AI：登場 → ${c.name}`, "muted");
    }
  }

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
      }
    }
  }
}
async function runAITurn(){
  if(state.aiRunning) return;
  if(state.activeSide !== "AI") return;

  state.aiRunning = true;
  try{
    state.phase="START"; renderAll(); await sleep(160);
    state.phase="DRAW";  draw("AI", 1); renderAll(); await sleep(180);
    state.phase="MAIN";  aiMain(); renderAll(); await sleep(220);
    state.phase="BATTLE"; aiBattle(); renderAll(); await sleep(240);
    state.phase="END"; enforceHandLimit("AI"); renderAll(); await sleep(160);

    // AIターン終了 → プレイヤーターン開始
    state.turn++;
    state.activeSide = "P1";
    state.phase = "START";
    resetTurnFlagsFor("P1");
    renderAll();
    flashNotice("あなたのターンです：DRAWへ進めてください");
  }finally{
    state.aiRunning = false;
  }
}

/* ---------- Rendering ---------- */
function renderZones(){
  // Enemy E
  el.aiE.innerHTML = "";
  for(let i=0;i<3;i++){
    el.aiE.appendChild(makeSlot(state.AI.E[i], `E${i+1}`, {enemy:true}));
  }

  // Enemy C
  el.aiC.innerHTML = "";
  for(let i=0;i<3;i++){
    const slot = makeSlot(state.AI.C[i], `C${i+1}`, {enemy:true});
    slot.addEventListener("click", ()=> onClickEnemyCard(i), {passive:true});
    el.aiC.appendChild(slot);
  }

  // Your C
  el.pC.innerHTML = "";
  for(let i=0;i<3;i++){
    const c = state.P1.C[i];
    const slot = makeSlot(c, `C${i+1}`, {sel: state.selectedAttackerPos===i});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    if(!c) bindLongPress(slot, ()=> onLongPressEmptyCForKenSan(i));
    el.pC.appendChild(slot);
  }

  // Your E
  el.pE.innerHTML = "";
  for(let i=0;i<3;i++){
    const slot = makeSlot(state.P1.E[i], `E${i+1}`, {});
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

    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url = state.img.cardUrlByNo[pad2(c.no)];
    if(url){
      h.style.backgroundImage = `url("${url}")`;
    }else{
      h.style.backgroundImage = "linear-gradient(135deg, rgba(89,242,255,.10), rgba(179,91,255,.08))";
    }

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1") return;
      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=> openViewer(c));
    el.hand.appendChild(h);
  }
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

/* ---------- Board clicks ---------- */
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
    resetTurnFlagsFor(state.activeSide);
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
    // プレイヤー→AI
    state.activeSide = "AI";
    state.phase = "START";
    state.selectedHandIndex = null;
    state.selectedAttackerPos = null;
    renderAll();
    runAITurn();
  }else{
    // （基本通らないが保険）
    state.activeSide = "P1";
    state.turn++;
    state.phase = "START";
    resetTurnFlagsFor("P1");
    renderAll();
  }
}

/* ---------- Start Game ---------- */
function startGame(){
  state.turn = 1;
  state.phase = "START";
  resetTurnFlagsFor("P1");
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
    flashNotice("あなたのターンです：DRAWへ進めてください");
  }else{
    el.firstInfo.textContent = "先攻：相手";
    log("先攻：相手", "warn");
    flashNotice("相手ターン開始：少々お待ちください");
  }

  log("ゲーム開始：シールド3（裏向き）/ 初手4", "muted");
  renderAll();

  if(state.activeSide==="AI"){
    runAITurn();
  }
}

/* ---------- Bind ---------- */
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
  const btn = $("btnLog");
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(()=>{ renderLogModal(); showModal("logM"); }, 360); };
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
  log("v40017：C/E枠は常時小型表示、空枠はラベル表示、見参はコスト選択UI", "muted");
}

document.addEventListener("DOMContentLoaded", init);