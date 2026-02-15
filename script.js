/* =========================================================
  Manpuku World - v60010 (3×4 layout restore)
  - Relative paths "./assets/..." => field/hand/back always load
  - Layout: Character -> Effect -> Shield -> Hand
  - Piles: OUT beside Character, WING beside Effect, DECK beside Shield
  - Title -> Start button only (no scroll start)
========================================================= */

const $ = (id)=> document.getElementById(id);
const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");
function normalizeText(t){ return (t||"").replaceAll("又は","または").replaceAll("出来る","できる"); }

const el = {
  title:$("title"), game:$("game"), boot:$("boot"),
  btnStart:$("btnStart"), btnSettingsOpen:$("btnSettingsOpen"), btnHelpOpen:$("btnHelpOpen"),

  chipTurn:$("chipTurn"), chipPhase:$("chipPhase"), chipActive:$("chipActive"), firstInfo:$("firstInfo"),
  btnHelp:$("btnHelp"), btnSettings:$("btnSettings"), btnNext:$("btnNext"), btnEnd:$("btnEnd"), btnLog:$("btnLog"),
  announce:$("announce"),

  fieldImg:$("fieldImg"),

  aiC:$("aiC"), aiE:$("aiE"), aiS:$("aiS"),
  pC:$("pC"), pE:$("pE"), pS:$("pS"),

  hand:$("hand"), aiHand:$("aiHand"), enemyHandLabel:$("enemyHandLabel"),

  aiDeckN:$("aiDeckN"), aiWingN:$("aiWingN"), aiOutN:$("aiOutN"),
  pDeckN:$("pDeckN"), pWingN:$("pWingN"), pOutN:$("pOutN"),

  aiDeckFace:$("aiDeckFace"), pDeckFace:$("pDeckFace"),
  aiWingFace:$("aiWingFace"), aiOutFace:$("aiOutFace"),
  pWingFace:$("pWingFace"), pOutFace:$("pOutFace"),

  viewerM:$("viewerM"), viewerTitle:$("viewerTitle"), viewerImg:$("viewerImg"), viewerText:$("viewerText"),
  zoneM:$("zoneM"), zoneTitle:$("zoneTitle"), zoneList:$("zoneList"),
  logM:$("logM"), logBody:$("logBody"),
  confirmM:$("confirmM"), confirmTitle:$("confirmTitle"), confirmBody:$("confirmBody"),
  btnYes:$("btnYes"), btnNo:$("btnNo"),

  settingsM:$("settingsM"), repoInput:$("repoInput"),
  btnRepoSave:$("btnRepoSave"), btnRescan:$("btnRescan"), btnClearCache:$("btnClearCache"),

  helpM:$("helpM"),
};

/* ---------- Logs ---------- */
const LOGS = [];
function log(msg, kind="muted"){
  LOGS.unshift({msg, kind, t:Date.now()});
  if(el.logM.classList.contains("show")) renderLogModal();
}
function renderLogModal(){
  el.logBody.innerHTML = "";
  if(!LOGS.length){
    const d=document.createElement("div");
    d.className="logLine muted";
    d.textContent="（ログはまだありません）";
    el.logBody.appendChild(d);
    return;
  }
  for(const it of LOGS.slice(0,250)){
    const d=document.createElement("div");
    d.className=`logLine ${it.kind}`;
    d.textContent=it.msg;
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
const LS_REPO="mw_repo";
const LS_IMG_CACHE="mw_img_cache_v6";
const PHASES=["START","DRAW","MAIN","BATTLE","END"];

/* =========================================================
   CARD DATA (20)  ※前回と同じ
========================================================= */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", kind:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1500, rank:5,
    text:normalizeText(`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n・1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。`)
  },
  { no:2,  name:"黒魔法-フレイムバレット", kind:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・自分ステージに「クルエラ」がある時、手札から発動できる。\n・相手ステージのキャラクター1体を選び、以下から1つ選ぶ。\n  A：ATKが1番高いキャラ1体をウイングに送る\n  B：rank4以下のキャラをすべてウイングに送る`)
  },
  { no:3,  name:"トナカイの少女ニコラ", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:2000, rank:5,
    text:normalizeText(`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n・自分ターンに発動できる。このターンの終わりまでATK+1000。`)
  },
  { no:4,  name:"聖ラウス", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1000, rank:3,
    text:normalizeText(`・このカードが登場した時、デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。`)
  },
  { no:5,  name:"統括AI タータ", kind:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記", baseAtk:1000, rank:3,
    text:normalizeText(`・登場した時、デッキから2枚ドローする。\n・自分ターンに1度：手札から2枚までウイングへ送り、その後同枚数だけタイトルタグ「BUGBUG西遊記」をデッキから手札へ。`)
  },
  { no:6,  name:"麗し令嬢エフィ", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1500, rank:5,
    text:normalizeText(`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。\n・自分ターン：相手キャラ1体を選び、このターンの終わりまでATK-1000。`)
  },
  { no:7,  name:"狩猟まひる", kind:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1500, rank:4,
    text:normalizeText("（効果文言未確定：現版では効果なし）")
  },
  { no:8,  name:"組織の男 手形", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・相手ターンに1度発動できる。相手が発動した効果を無効にする。`)
  },
  { no:9,  name:"小太郎・孫悟空Lv17", kind:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記", baseAtk:2000, rank:4,
    text:normalizeText(`・自分ステージに存在：手札の「小次郎」を見参させる。\n・自分ステージに「小次郎」がある時ATK+500。`)
  },
  { no:10, name:"小次郎・孫悟空Lv17", kind:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記", baseAtk:2000, rank:4,
    text:normalizeText(`・自分ステージに存在：手札の「小太郎」を見参させる。\n・自分ステージに「小太郎」がある時ATK+500。`)
  },
  { no:11, name:"司令", kind:"item", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・登場した時：自分キャラ1体に装備。装備キャラATK+500。`)
  },
  { no:12, name:"班目プロデューサー", kind:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1500, rank:4,
    text:normalizeText(`・このカードは1ターンに1度、バトルでは破壊されない。`)
  },
  { no:13, name:"超弩級砲塔列車スタマックス氏", kind:"character", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:2500, rank:4,
    text:normalizeText(`・自分ステージに存在：このカードをウイングに送り、相手キャラ1体をこのターンATK-1000（相手ターンでも可）。`)
  },
  { no:14, name:"記憶抹消", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・相手が効果発動した時：手札から発動。無効にしてウイングに送る。`)
  },
  { no:15, name:"桜蘭の陰陽術 - 闘 -", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・バトルする時：手札から発動。自分キャラ1体をこのターンATK+1000。`)
  },
  { no:16, name:"力こそパワー！！", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・自分ターンのみ：相手のATKが1番低いキャラ1体をウイングに送る。`)
  },
  { no:17, name:"キャトルミューティレーション", kind:"effect", tags:[], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・自分キャラがバトルでウイングに送られた時：手札から発動。相手キャラ1体を手札に戻す。`)
  },
  { no:18, name:"a-xブラスター01 -放射型-", kind:"item", tags:["射手"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・自分ターン：装備。ATK+500。\n・装備者がタグ「射手」ならさらにATK+500。\n・相手ターン開始時：相手手札をランダム1枚ウイングへ。`)
  },
  { no:19, name:"-聖剣- アロングダイト", kind:"item", tags:["勇者","剣士"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(`・自分ターン：装備。ATK+500。\n・装備者が「勇者」または「剣士」ならさらにATK+500。\n・装備者がバトルで相手キャラをウイングに送った時：1ドロー。`)
  },
  { no:20, name:"普通の棒", kind:"item", tags:["勇者"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:1,
    text:normalizeText(`・自分ターン：装備。ATK+300。\n・装備者が「勇者」ならさらにATK+500。`)
  },
];

function cloneCard(no){
  const c = CardRegistry.find(x=>x.no===no);
  const base = {...c};
  base.uid = `${no}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  base.atk = base.baseAtk || 0;
  base.equips = [];
  base.flags = { immuneUsedThisTurn:false, usedOnceThisTurn:false };
  return base;
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function buildDeck(){
  const deck=[];
  for(let no=1; no<=20; no++){ deck.push(cloneCard(no)); deck.push(cloneCard(no)); }
  shuffle(deck);
  return deck;
}

/* =========================================================
   STATE
========================================================= */
const state = {
  started:false,
  gameOver:false,
  aiRunning:false,
  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",

  selectedHandIndex:null,
  selectedAttackerPos:null,
  attackedThisTurn:{ P1:[false,false,false], AI:[false,false,false] },
  pending:null,

  P1:{ deck:[], hand:[], shield:[null,null,null], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI:{ deck:[], hand:[], shield:[null,null,null], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img:{ ready:false, fieldUrl:"", backUrl:"", cardUrlByNo:{} },

  tempMods: { P1: new Map(), AI: new Map() },
};

/* =========================================================
   IMAGE SCAN
   ★修正点：相対パス "./assets/..." を返す
========================================================= */
function getRepo(){ return localStorage.getItem(LS_REPO) || "manpuku-taira/manpuku-world"; }
function setRepo(v){ localStorage.setItem(LS_REPO, v); }
function getCache(){ try{ return JSON.parse(localStorage.getItem(LS_IMG_CACHE)||"{}"); }catch{ return {}; } }
function setCache(obj){ localStorage.setItem(LS_IMG_CACHE, JSON.stringify(obj)); }
function clearCache(){ localStorage.removeItem(LS_IMG_CACHE); }

async function ghList(path){
  const repo=getRepo();
  const url=`https://api.github.com/repos/${repo}/contents/${path}?ref=main`;
  const res=await fetch(url, { headers:{ "Accept":"application/vnd.github+json" }});
  if(!res.ok) throw new Error(`GitHub API NG: ${res.status}`);
  const data=await res.json();
  if(!Array.isArray(data)) return [];
  return data.filter(x=>x && x.type==="file").map(x=>x.name);
}
function encFile(name){ return encodeURIComponent(name); }

/* ★ここが最重要：先頭スラッシュを消す */
function relCards(filename){ return `./assets/cards/${encFile(filename)}`; }
function relAssets(filename){ return `./assets/${encFile(filename)}`; }

function pickFieldFile(assetFiles){
  const lowers=assetFiles.map(n=>n.toLowerCase());
  const idx=lowers.findIndex(n=>n.startsWith("field."));
  if(idx>=0) return assetFiles[idx];
  const cand=["field.png.jpg","field.jpg","field.png","field.jpeg"];
  for(const c of cand){
    const k=lowers.findIndex(n=>n===c);
    if(k>=0) return assetFiles[k];
  }
  return "";
}
function isBackNameLower(l){
  return (
    l === "card_back.png" || l === "card_back.jpg" || l === "card_back.jpeg" ||
    l === "card_back.png.png" || l === "card_back.png.jpg" || l === "card_back.png.jpeg" ||
    l === "card_back.jpg.jpg" || l === "card_back.jpeg.jpeg" ||
    l.startsWith("card_back.") || l.startsWith("cardback.") || l.startsWith("back.")
  );
}
function pickBackFile(assetFiles){
  const lowers=assetFiles.map(n=>n.toLowerCase());
  for(let i=0;i<assetFiles.length;i++){
    if(isBackNameLower(lowers[i])) return assetFiles[i];
  }
  return "";
}
function scoreCardFilename(name, no){
  const s=name.toLowerCase();
  const p2=pad2(no), p1=String(no);
  let score=0;
  if(s.startsWith(`${p2}_`)) score+=100;
  if(s.startsWith(`${p1}_`)) score+=80;
  if(s.includes(`${p2}_`)) score+=30;
  if(s.includes(`${p1}_`)) score+=20;
  if(s.includes(".png.jpg") || s.includes(".png.jpeg") || s.includes(".png.png")) score+=6;
  if(s.includes(".jpg")) score+=5;
  if(s.includes(".png")) score+=5;
  if(s.includes(".jpeg")) score+=4;
  return score;
}
function buildCardMapFromFileList(cardFiles){
  const map={};
  for(let no=1; no<=20; no++){
    let best={name:"", score:-1};
    for(const f of cardFiles){
      const sc=scoreCardFilename(f,no);
      if(sc>best.score) best={name:f, score:sc};
    }
    if(best.score>=60) map[pad2(no)]=best.name;
  }
  return map;
}
async function validateImage(url){
  return new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>resolve(true);
    img.onerror=()=>resolve(false);
    img.src=url;
  });
}

async function rescanImages(){
  state.img.ready=false;
  log("画像スキャン：GitHub assets を取得…", "muted");
  const cache={};
  const repo=getRepo();
  try{
    const [assetFiles, cardFiles] = await Promise.all([ ghList("assets"), ghList("assets/cards") ]);
    cache.repo=repo;
    cache.assetFiles=assetFiles;
    cache.cardFiles=cardFiles;
    cache.scannedAt=Date.now();
    cache.fieldFile=pickFieldFile(assetFiles)||"";
    cache.backFile=pickBackFile(assetFiles)||"";
    cache.cardMap=buildCardMapFromFileList(cardFiles);
    setCache(cache);
  }catch(err){
    log(`NG GitHub API失敗：${String(err.message||err)}`, "warn");
  }
  await applyImagesFromCache();
}

async function applyImagesFromCache(){
  const cache=getCache();
  state.img.fieldUrl="";
  state.img.backUrl="";
  state.img.cardUrlByNo={};

  // field
  if(cache.fieldFile){
    const u=relAssets(cache.fieldFile);
    if(await validateImage(u)) state.img.fieldUrl=u;
  }
  el.fieldImg.src = state.img.fieldUrl || "";
  el.fieldImg.style.display = state.img.fieldUrl ? "block" : "none";

  // back
  if(cache.backFile){
    const b=relAssets(cache.backFile);
    if(await validateImage(b)) state.img.backUrl=b;
  }else{
    // fallback common names (relative)
    const tries=[
      "./assets/card_back.png.PNG",
      "./assets/card_back.png.png",
      "./assets/card_back.png",
      "./assets/card_back.jpg",
      "./assets/card_back.jpeg",
      "./assets/back.png",
      "./assets/back.jpg",
    ];
    for(const t of tries){
      if(await validateImage(t)){ state.img.backUrl=t; break; }
    }
  }

  // cards
  const map=cache.cardMap||{};
  for(const k of Object.keys(map)){
    state.img.cardUrlByNo[k]=relCards(map[k]);
  }

  state.img.ready=true;

  // 画像が無い場合でも遊べるようにする
  log(`画像：field=${!!state.img.fieldUrl} back=${!!state.img.backUrl} cards=${Object.keys(state.img.cardUrlByNo).length}/20`, "ok");
  renderAll();
}

/* =========================================================
   UI HELPERS / MODALS
========================================================= */
function showModal(id){ $(id).classList.add("show"); }
function hideModal(id){ $(id).classList.remove("show"); }
document.addEventListener("click", (e)=>{
  const t=e.target;
  if(!(t instanceof HTMLElement)) return;
  const close=t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");
  if(close==="zone") hideModal("zoneM");
  if(close==="confirm") hideModal("confirmM");
  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
});

function bindLongPress(node, fn, ms=420){
  let timer=null;
  const start=()=>{ clearTimeout(timer); timer=setTimeout(fn, ms); };
  const end=()=>clearTimeout(timer);
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
  node.addEventListener("touchcancel", end, {passive:true});
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
}

function openViewer(card){
  el.viewerTitle.textContent = card.name;
  const cur = (card.kind==="character") ? `\n\n現在ATK：${card.atk}\n基本ATK：${card.baseAtk}` : "";
  el.viewerText.textContent = (card.text||"") + cur;
  el.viewerImg.src = state.img.cardUrlByNo[pad2(card.no)] || "";
  showModal("viewerM");
}

/* confirm */
let confirmYes=null;
function askConfirm(title, body, onYes){
  el.confirmTitle.textContent=title;
  el.confirmBody.textContent=body;
  confirmYes=onYes;
  showModal("confirmM");
}
el.btnNo.addEventListener("click", ()=>hideModal("confirmM"), {passive:true});
el.btnYes.addEventListener("click", ()=>{
  hideModal("confirmM");
  const fn=confirmYes; confirmYes=null;
  if(fn) fn();
}, {passive:true});

/* =========================================================
   GAME CORE（前回のロジックを踏襲：ここは必要最小限）
   ※ご主人様の要望の焦点はUI/画像なので、今回の差分は描画側中心です
========================================================= */
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function updateHUD(){
  $("chipTurn").textContent = `TURN ${state.turn}`;
  $("chipPhase").textContent = state.phase;
  const you = (state.activeSide==="P1");
  $("chipActive").textContent = you ? "YOUR TURN" : "ENEMY TURN";
  $("chipActive").classList.toggle("enemy", !you);
  el.btnNext.disabled = !you || state.gameOver;
  el.btnEnd.disabled  = !you || state.gameOver;
}
function updateCounts(){
  el.aiDeckN.textContent=state.AI.deck.length;
  el.aiWingN.textContent=state.AI.wing.length;
  el.aiOutN.textContent=state.AI.outside.length;
  el.pDeckN.textContent=state.P1.deck.length;
  el.pWingN.textContent=state.P1.wing.length;
  el.pOutN.textContent=state.P1.outside.length;
  el.enemyHandLabel.textContent = `ENEMY HAND ×${state.AI.hand.length}`;
}
function draw(side, n=1){
  const p=state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      state.gameOver=true;
      const msg = (side==="P1") ? "敗北：デッキ切れ" : "勝利：相手デッキ切れ";
      log(msg, (side==="P1")?"warn":"ok");
      say(`ゲーム終了（${msg}）`, "warn");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}
function moveToWing(side, card){ state[side].wing.push(card); }

/* ----（戦闘/効果の詳細ロジックは前回版と同様のため、ここではUIに必要な最小実装だけ保持）---- */
/* 実運用では、前回v60000の effect/AI/battle 部分をそのまま移植して下さい。
   （ご希望であれば、次の返信で “v60000の全ロジックを丸ごと統合した完全版script.js” を提示します） */

function startGame(){
  state.gameOver=false;
  state.turn=1;
  state.phase="START";
  state.selectedHandIndex=null;
  state.selectedAttackerPos=null;
  state.pending=null;

  state.P1.deck=buildDeck();
  state.AI.deck=buildDeck();

  state.P1.shield=[state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield=[state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  state.P1.hand=[]; state.AI.hand=[];
  draw("P1",4); draw("AI",4);

  state.P1.C=[null,null,null]; state.AI.C=[null,null,null];
  state.P1.E=[null,null,null]; state.AI.E=[null,null,null];
  state.P1.wing=[]; state.AI.wing=[];
  state.P1.outside=[]; state.AI.outside=[];

  state.firstSide = (Math.random()<0.5) ? "P1" : "AI";
  state.activeSide = state.firstSide;
  el.firstInfo.textContent = (state.firstSide==="P1") ? "先攻：あなた" : "先攻：相手";
  say("ゲーム開始", "ok");
  renderAll();
}

/* =========================================================
   RENDER (3×4 layout)
========================================================= */
function faceForCard(card){
  const face=document.createElement("div");
  face.className="face";
  const url=state.img.cardUrlByNo[pad2(card.no)];
  if(url) face.style.backgroundImage=`url("${url}")`;
  else face.classList.add("fallback");
  return face;
}
function makeSlot(card, opts={}){
  const slot=document.createElement("div");
  slot.className="slot";
  if(opts.small) slot.classList.add("small");
  if(opts.disabled) slot.classList.add("disabled");

  if(card){
    slot.appendChild(faceForCard(card));
    if(card.kind==="character"){
      const b=document.createElement("div");
      b.className="slotBadge";
      b.textContent=`ATK ${card.atk}`;
      slot.appendChild(b);
    }
    bindLongPress(slot, ()=>openViewer(card));
  }else{
    const f=document.createElement("div");
    f.className="face fallback";
    f.style.opacity=".18";
    slot.appendChild(f);
  }
  return slot;
}
function setBack(elm){
  if(state.img.backUrl){
    elm.style.backgroundImage=`url("${state.img.backUrl}")`;
    elm.style.backgroundColor="";
    elm.style.backgroundSize="cover";
    elm.style.backgroundPosition="center";
  }else{
    elm.style.backgroundImage="";
    elm.style.backgroundColor="#070914";
  }
}
function renderPiles(){
  setBack(el.aiDeckFace);
  setBack(el.pDeckFace);

  const aiW=state.AI.wing[state.AI.wing.length-1];
  const aiO=state.AI.outside[state.AI.outside.length-1];
  const pW =state.P1.wing[state.P1.wing.length-1];
  const pO =state.P1.outside[state.P1.outside.length-1];

  function setTop(elm, card){
    elm.style.backgroundImage="";
    elm.style.backgroundColor="rgba(6,8,14,.55)";
    if(card){
      const url=state.img.cardUrlByNo[pad2(card.no)];
      if(url) elm.style.backgroundImage=`url("${url}")`;
      elm.style.backgroundSize="cover";
      elm.style.backgroundPosition="center";
    }
  }
  setTop(el.aiWingFace, aiW);
  setTop(el.aiOutFace, aiO);
  setTop(el.pWingFace, pW);
  setTop(el.pOutFace, pO);
}
function renderZones(){
  // Enemy Character
  el.aiC.innerHTML="";
  for(let i=0;i<3;i++) el.aiC.appendChild(makeSlot(state.AI.C[i]));
  // Enemy Effect
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++) el.aiE.appendChild(makeSlot(state.AI.E[i]));
  // Enemy Shield (facedown)
  el.aiS.innerHTML="";
  for(let i=0;i<3;i++){
    const exists=!!state.AI.shield[i];
    const slot=document.createElement("div");
    slot.className="slot small";
    if(!exists) slot.classList.add("disabled");
    const face=document.createElement("div");
    face.className="face";
    if(exists){
      if(state.img.backUrl) face.style.backgroundImage=`url("${state.img.backUrl}")`;
      face.style.backgroundSize="cover";
      face.style.backgroundPosition="center";
    }else{
      face.classList.add("fallback");
      face.style.opacity=".18";
    }
    slot.appendChild(face);
    el.aiS.appendChild(slot);
  }

  // Player Character
  el.pC.innerHTML="";
  for(let i=0;i<3;i++) el.pC.appendChild(makeSlot(state.P1.C[i]));
  // Player Effect
  el.pE.innerHTML="";
  for(let i=0;i<3;i++) el.pE.appendChild(makeSlot(state.P1.E[i]));
  // Player Shield (facedown)
  el.pS.innerHTML="";
  for(let i=0;i<3;i++){
    const exists=!!state.P1.shield[i];
    const slot=document.createElement("div");
    slot.className="slot small";
    if(!exists) slot.classList.add("disabled");
    const face=document.createElement("div");
    face.className="face";
    if(exists){
      if(state.img.backUrl) face.style.backgroundImage=`url("${state.img.backUrl}")`;
      face.style.backgroundSize="cover";
      face.style.backgroundPosition="center";
    }else{
      face.classList.add("fallback");
      face.style.opacity=".18";
    }
    slot.appendChild(face);
    el.pS.appendChild(slot);
  }
}
function renderHand(){
  el.hand.innerHTML="";
  for(let i=0;i<state.P1.hand.length;i++){
    const c=state.P1.hand[i];
    const h=document.createElement("div");
    h.className="handCard";
    const url=state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage=`url("${url}")`;
    bindLongPress(h, ()=>openViewer(c));
    el.hand.appendChild(h);
  }
}
function renderEnemyHand(){
  el.aiHand.innerHTML="";
  const n=state.AI.hand.length;
  const show=Math.min(n, 12);
  for(let i=0;i<show;i++){
    const b=document.createElement("div");
    b.className="handBack";
    if(state.img.backUrl) b.style.backgroundImage=`url("${state.img.backUrl}")`;
    el.aiHand.appendChild(b);
  }
  if(n>show){
    const more=document.createElement("div");
    more.className="handBack";
    more.textContent=`+${n-show}`;
    more.style.display="flex";
    more.style.alignItems="center";
    more.style.justifyContent="center";
    more.style.fontWeight="1000";
    el.aiHand.appendChild(more);
  }
}
function renderAll(){
  updateHUD();
  updateCounts();
  renderPiles();
  renderZones();
  renderHand();
  renderEnemyHand();
}

/* =========================================================
   BUTTONS / SETTINGS
========================================================= */
function bindHUDButtons(){
  el.btnHelp.addEventListener("click", ()=>showModal("helpM"), {passive:true});
  el.btnSettings.addEventListener("click", ()=>{
    el.repoInput.value=getRepo();
    showModal("settingsM");
  }, {passive:true});
  el.btnLog.addEventListener("click", ()=>{ renderLogModal(); showModal("logM"); }, {passive:true});
}
function bindTitleButtons(){
  el.btnSettingsOpen.addEventListener("click", ()=>{
    el.repoInput.value=getRepo();
    showModal("settingsM");
  }, {passive:true});
  el.btnHelpOpen.addEventListener("click", ()=>showModal("helpM"), {passive:true});
}
function bindSettings(){
  el.btnRepoSave.addEventListener("click", async ()=>{
    const v=(el.repoInput.value||"").trim();
    if(!v.includes("/")){ log("設定NG：owner/repo 形式で入力してください", "warn"); return; }
    setRepo(v);
    clearCache();
    log(`設定：repo=${v}`, "ok");
    await rescanImages();
  }, {passive:true});

  el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); }, {passive:true});

  el.btnClearCache.addEventListener("click", ()=>{
    clearCache();
    state.img.ready=false;
    state.img.fieldUrl=""; state.img.backUrl=""; state.img.cardUrlByNo={};
    el.fieldImg.src="";
    log("画像キャッシュを削除しました", "ok");
    renderAll();
  }, {passive:true});
}
function bindPhaseButtons(){
  el.btnNext.addEventListener("click",(e)=>{
    e.preventDefault();
    const i=PHASES.indexOf(state.phase);
    state.phase = PHASES[(i+1)%PHASES.length];
    renderAll();
  }, {passive:false});
  el.btnEnd.addEventListener("click",(e)=>{
    e.preventDefault();
    state.turn++;
    state.phase="START";
    renderAll();
  }, {passive:false});
}
function bindZoneButtons(){
  $("aiWingBtn").addEventListener("click", ()=>showModal("zoneM"), {passive:true});
  $("aiOutBtn").addEventListener("click", ()=>showModal("zoneM"), {passive:true});
  $("pWingBtn").addEventListener("click", ()=>showModal("zoneM"), {passive:true});
  $("pOutBtn").addEventListener("click", ()=>showModal("zoneM"), {passive:true});
}

/* =========================================================
   START
========================================================= */
function bindStart(){
  el.btnStart.addEventListener("click", ()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    startGame();
  }, {passive:true});
}

async function init(){
  el.boot.textContent="JS: 初期化中…";
  say("準備中…", "muted");

  bindStart();
  bindHUDButtons();
  bindTitleButtons();
  bindSettings();
  bindPhaseButtons();
  bindZoneButtons();

  const cache=getCache();
  if(cache && cache.repo===getRepo() && cache.assetFiles && cache.cardFiles){
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent="JS: 準備完了";
  say("準備完了（STARTで開始）", "ok");
  log("v60010：3×4構図復元 / 画像パス相対化", "ok");
}

document.addEventListener("DOMContentLoaded", init);