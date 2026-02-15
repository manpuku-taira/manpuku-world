/* =========================================================
  Manpuku World - v60000 (iPhone FIRST / PRODUCT)
  - Field is NOT background. It's an <img> underlay (object-fit:contain) => never crops/zooms.
  - Vertical scroll stable + sticky bottom (hand+buttons never overlap)
  - C/E/Shield are always 3 slots
  - card_back.* auto-detect (case/double ext)
  - Effect engine implemented for all cards (No.07 no effect by spec)
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
window.addEventListener("error", (e)=> log(`JSエラー: ${e.message||e.type}`, "warn"));
window.addEventListener("unhandledrejection", (e)=> log(`Promiseエラー: ${String(e.reason||"")}`, "warn"));

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

/* ---------- Rules ---------- */
const PHASES=["START","DRAW","MAIN","BATTLE","END"];

/* =========================================================
   CARD DATA (20)
========================================================= */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", kind:"character", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1500, rank:5,
    text:normalizeText(
`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。
・1ターンに1度発動できる。デッキ・ウイングから「黒魔法」カード1枚を手札に加える。`
    )
  },
  { no:2,  name:"黒魔法-フレイムバレット", kind:"effect", tags:["黒魔法"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(
`・自分ステージに「クルエラ」がある時、手札から発動できる。
・相手ステージのキャラクター1体を選び、以下から1つ選ぶ。
  A：ATKが1番高いキャラ1体をウイングに送る
  B：rank4以下のキャラをすべてウイングに送る`
    )
  },
  { no:3,  name:"トナカイの少女ニコラ", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:2000, rank:5,
    text:normalizeText(
`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。
・自分ターンに発動できる。このターンの終わりまでATK+1000。`
    )
  },
  { no:4,  name:"聖ラウス", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1000, rank:3,
    text:normalizeText(`・このカードが登場した時、デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。`)
  },
  { no:5,  name:"統括AI タータ", kind:"character", tags:["BUGBUG西遊記"], titleTag:"BUGBUG西遊記", baseAtk:1000, rank:3,
    text:normalizeText(
`・登場した時、デッキから2枚ドローする。
・自分ターンに1度：手札から2枚までウイングへ送り、その後同枚数だけタイトルタグ「BUGBUG西遊記」をデッキから手札へ。`
    )
  },
  { no:6,  name:"麗し令嬢エフィ", kind:"character", tags:["クランプス"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:1500, rank:5,
    text:normalizeText(
`・このカードは登場できず、手札または自分ステージのカード1枚をウイングに送り、手札から見参できる。
・自分ターン：相手キャラ1体を選び、このターンの終わりまでATK-1000。`
    )
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
    text:normalizeText(
`・自分ターン：装備。ATK+500。
・装備者がタグ「射手」ならさらにATK+500。
・相手ターン開始時：相手手札をランダム1枚ウイングへ。`
    )
  },
  { no:19, name:"-聖剣- アロングダイト", kind:"item", tags:["勇者","剣士"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:2,
    text:normalizeText(
`・自分ターン：装備。ATK+500。
・装備者が「勇者」または「剣士」ならさらにATK+500。
・装備者がバトルで相手キャラをウイングに送った時：1ドロー。`
    )
  },
  { no:20, name:"普通の棒", kind:"item", tags:["勇者"], titleTag:"恋愛疾患特殊医療機a-xブラスター", baseAtk:0, rank:1,
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
  base.flags = {
    immuneUsedThisTurn:false,     // No.12
    usedOnceThisTurn:false,       // No.1/5 activation once per turn etc
  };
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

  // pending UI flows
  pending:null, // {type,...}

  P1:{ deck:[], hand:[], shield:[null,null,null], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI:{ deck:[], hand:[], shield:[null,null,null], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  img:{ ready:false, fieldUrl:"", backUrl:"", cardUrlByNo:{} },

  // “this turn temporary atk modifications” safely reversible
  tempMods: { P1: new Map(), AI: new Map() },
};

/* =========================================================
   IMAGE SCAN (GitHub -> /assets)
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
function vercelPathCards(filename){ return `/assets/cards/${encFile(filename)}`; }
function vercelPathAssets(filename){ return `/assets/${encFile(filename)}`; }

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

    cache.fieldFile ? log(`OK フィールド検出: ${cache.fieldFile}`, "muted") : log("NG フィールド未検出（assets/field.*）", "warn");
    cache.backFile ? log(`OK 裏面検出: ${cache.backFile}`, "muted") : log("裏面：未検出（黒裏で動作）", "warn");

    const mapped=Object.keys(cache.cardMap||{}).length;
    mapped>=20 ? log("OK カード画像：No.01〜20 自動紐付け", "muted") : log(`注意：カード画像不足（${mapped}/20）`, "warn");
  }catch(err){
    log(`NG GitHub API失敗：${String(err.message||err)}`, "warn");
  }
  await applyImagesFromCache();
}

async function applyImagesFromCache(){
  const cache=getCache();
  if(cache.repo && cache.repo!==getRepo()){
    log("画像キャッシュ：別repoのため破棄", "warn");
    clearCache();
    return;
  }

  // field (underlay image)
  state.img.fieldUrl="";
  if(cache.fieldFile){
    const u=vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)){ state.img.fieldUrl=u; }
  }
  el.fieldImg.src = state.img.fieldUrl || "";
  // back
  state.img.backUrl="";
  if(cache.backFile){
    const b=vercelPathAssets(cache.backFile);
    if(await validateImage(b)) state.img.backUrl=b;
  }else{
    const tries=[
      "/assets/card_back.png.PNG",
      "/assets/card_back.png.png",
      "/assets/card_back.png",
      "/assets/card_back.jpg",
      "/assets/card_back.jpeg",
      "/assets/back.png",
      "/assets/back.jpg",
    ];
    for(const t of tries){
      if(await validateImage(t)){ state.img.backUrl=t; break; }
    }
  }

  // cards
  state.img.cardUrlByNo={};
  const map=cache.cardMap||{};
  for(const k of Object.keys(map)) state.img.cardUrlByNo[k]=vercelPathCards(map[k]);

  state.img.ready=true;

  const miss=[];
  for(let no=1; no<=20; no++){
    if(!state.img.cardUrlByNo[pad2(no)]) miss.push(pad2(no));
  }
  miss.length ? log(`カード画像未検出：${miss.join(", ")}`, "warn") : log("カード画像：20種すべて検出", "muted");

  renderAll();
}

/* =========================================================
   UI HELPERS
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

function openZone(title, cards){
  el.zoneTitle.textContent=title;
  el.zoneList.innerHTML="";
  if(!cards.length){
    const d=document.createElement("div");
    d.className="logLine muted";
    d.textContent="（空です）";
    el.zoneList.appendChild(d);
  }else{
    for(const c of cards){
      const it=document.createElement("div");
      it.className="zoneItem";
      const th=document.createElement("div");
      th.className="zThumb";
      const url=state.img.cardUrlByNo[pad2(c.no)];
      if(url) th.style.backgroundImage=`url("${url}")`;
      const meta=document.createElement("div");
      meta.className="zMeta";
      const t=document.createElement("div"); t.className="t"; t.textContent=c.name;
      const s=document.createElement("div"); s.className="s";
      s.textContent = (c.kind==="character") ? `RANK ${c.rank} / ATK ${c.atk}` : `${c.kind.toUpperCase()} / RANK ${c.rank}`;
      meta.appendChild(t); meta.appendChild(s);
      it.appendChild(th); it.appendChild(meta);
      it.addEventListener("click", ()=>openViewer(c), {passive:true});
      el.zoneList.appendChild(it);
    }
  }
  showModal("zoneM");
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
   GAME CORE
========================================================= */
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function setActiveUI(){
  const you = (state.activeSide==="P1");
  el.chipActive.textContent = you ? "YOUR TURN" : "ENEMY TURN";
  el.chipActive.classList.toggle("enemy", !you);
  el.btnNext.disabled = !you || state.gameOver;
  el.btnEnd.disabled  = !you || state.gameOver;
}
function updateHUD(){
  el.chipTurn.textContent = `TURN ${state.turn}`;
  el.chipPhase.textContent = state.phase;
  setActiveUI();
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
function moveToOutside(side, card){ state[side].outside.push(card); }

function resetTurnFlags(){
  state.attackedThisTurn.P1=[false,false,false];
  state.attackedThisTurn.AI=[false,false,false];
  // reset per-turn flags for characters on stage
  for(const s of ["P1","AI"]){
    for(const c of state[s].C){
      if(!c) continue;
      c.flags.usedOnceThisTurn=false;
      if(c.no===12) c.flags.immuneUsedThisTurn=false;
    }
  }
  // clear temp mods map (revert)
  for(const s of ["P1","AI"]){
    for(const [uid, delta] of state.tempMods[s]){
      const all = [...state[s].C, ...state[s].hand, ...state[s].wing, ...state[s].outside, ...state[s].shield].filter(Boolean);
      const card = all.find(x=>x.uid===uid);
      if(card && card.kind==="character") card.atk -= delta;
    }
    state.tempMods[s].clear();
  }
}

/* =========================================================
   SUMMON / EQUIP RULES
========================================================= */
function isKensanOnly(no){ return (no===1 || no===3 || no===6); }
function needsKensan(card){ return card.kind==="character" && isKensanOnly(card.no); }
function canNormalSummon(card){ return card.kind==="character" && card.rank<=4 && !isKensanOnly(card.no); }

function equipItemTo(side, charPos, item){
  const ch=state[side].C[charPos];
  if(!ch) return false;
  ch.equips = ch.equips || [];
  ch.equips.push(item);

  // base equip buffs
  if(item.no===11) ch.atk += 500;
  if(item.no===18){
    ch.atk += 500;
    if((ch.tags||[]).includes("射手")) ch.atk += 500;
  }
  if(item.no===19){
    ch.atk += 500;
    if((ch.tags||[]).includes("勇者") || (ch.tags||[]).includes("剣士")) ch.atk += 500;
  }
  if(item.no===20){
    ch.atk += 300;
    if((ch.tags||[]).includes("勇者")) ch.atk += 500;
  }
  return true;
}

/* =========================================================
   EFFECT ENGINE (PRODUCT)
   - reactive counters (8,14)
   - on-death reaction (17)
   - turn-start forced discard (18)
========================================================= */
function hasOnStage(side, namePart){
  return [...state[side].C, ...state[side].E].some(c=>c && c.name.includes(namePart));
}
function findInDeckOrWing(side, pred){
  // deck priority then wing (latest first)
  const deckIdx=state[side].deck.findIndex(pred);
  if(deckIdx>=0){
    return {from:"deck", idx:deckIdx, card:state[side].deck[deckIdx]};
  }
  for(let i=state[side].wing.length-1;i>=0;i--){
    if(pred(state[side].wing[i])) return {from:"wing", idx:i, card:state[side].wing[i]};
  }
  return null;
}
function takeFromDeckOrWingToHand(side, pred){
  const f=findInDeckOrWing(side, pred);
  if(!f) return null;
  let c=null;
  if(f.from==="deck") c=state[side].deck.splice(f.idx,1)[0];
  else c=state[side].wing.splice(f.idx,1)[0];
  state[side].hand.push(c);
  return c;
}

// “counter check” when someone tries to resolve an effect
async function offerCounter(defSide, effectCard, bySide){
  // defSide can negate with No.14 (when opponent activates effect) OR No.8 (once per opponent turn)
  const hand=state[defSide].hand;

  const idx14 = hand.findIndex(c=>c.no===14);
  const idx8  = hand.findIndex(c=>c.no===8);

  // No counter
  if(idx14<0 && idx8<0) return false;

  // pick which counter to use (prefer 14 first)
  const pick = (idx14>=0) ? {no:14, idx:idx14} : {no:8, idx:idx8};
  const counterCard = hand[pick.idx];

  // AI auto decision: 60% use counter vs strong effects, else random
  if(defSide==="AI"){
    const strong = [2,16,15].includes(effectCard.no);
    const use = strong ? (Math.random()<0.7) : (Math.random()<0.35);
    if(!use) return false;
    hand.splice(pick.idx,1);
    moveToWing("AI", counterCard);
    log(`AI：カウンター → ${counterCard.name}（${effectCard.name}を無効）`, "warn");
    say("AIが効果を無効化", "warn");
    return true;
  }

  // Player confirm
  return await new Promise((resolve)=>{
    askConfirm("カウンター可能", `${sideName(defSide)}の手札：${counterCard.name}\n相手の効果「${effectCard.name}」を無効にしますか？`, ()=>{
      const nowIdx = state[defSide].hand.findIndex(c=>c.uid===counterCard.uid);
      if(nowIdx>=0) state[defSide].hand.splice(nowIdx,1);
      moveToWing(defSide, counterCard);
      log(`${sideName(defSide)}：カウンター → ${counterCard.name}（${effectCard.name}を無効）`, "warn");
      say("効果を無効化しました", "ok");
      renderAll();
      resolve(true);
    });
    // cancel => not counter
    el.btnNo.onclick = ()=>{
      hideModal("confirmM");
      resolve(false);
    };
  });
}

function applyTempAtk(side, card, delta){
  if(card.kind!=="character") return;
  card.atk += delta;
  const old = state.tempMods[side].get(card.uid) || 0;
  state.tempMods[side].set(card.uid, old + delta);
}

function destroyCharacter(side, pos, reason=""){
  const ch=state[side].C[pos];
  if(!ch) return null;

  if(ch.no===12 && !ch.flags.immuneUsedThisTurn){
    ch.flags.immuneUsedThisTurn=true;
    log(`${sideName(side)}：班目プロデューサーはバトル破壊無効（1回）`, "muted");
    return null;
  }

  const equips = ch.equips || [];
  state[side].C[pos]=null;
  moveToWing(side, ch);
  for(const it of equips) moveToWing(side, it);

  log(`${sideName(side)}：破壊→ウイング ${ch.name}${reason?`（${reason}）`:""}`, "muted");
  return ch;
}

function breakShield(defSide, idx, bySide){
  const sh=state[defSide].shield[idx];
  if(!sh) return false;
  state[defSide].shield[idx]=null;
  state[defSide].hand.push(sh);
  log(`${sideName(bySide)}：シールド破壊 → ${sideName(defSide)}の手札へ ${sh.name}`, "warn");
  return true;
}

function checkDirectWin(attackerSide){
  const def = attackerSide==="P1" ? "AI" : "P1";
  if(state[def].shield.some(Boolean)) return false;
  state.gameOver=true;
  const msg = (attackerSide==="P1") ? "勝利：ダイレクトアタック成立" : "敗北：ダイレクトアタック被弾";
  log(msg, (attackerSide==="P1")?"ok":"warn");
  say(msg, (attackerSide==="P1")?"ok":"warn");
  return true;
}

async function resolveBattle(aSide, aPos, dSide, dPos){
  const A=state[aSide].C[aPos];
  const D=state[dSide].C[dPos];
  if(!A || !D) return;

  log(`バトル：${A.name}(ATK ${A.atk}) vs ${D.name}(ATK ${D.atk})`, "muted");

  if(A.atk===D.atk){
    const deadA = destroyCharacter(aSide, aPos, "相打ち");
    const deadD = destroyCharacter(dSide, dPos, "相打ち");
    await maybeCattleOnDeath(deadA, dSide, aSide); // 17: owner of dead can bounce opponent
    await maybeCattleOnDeath(deadD, aSide, dSide);
    return;
  }

  if(A.atk > D.atk){
    const deadD = destroyCharacter(dSide, dPos, "負け");
    // No.19 draw on kill
    if(A.equips?.some(x=>x.no===19)){
      draw(aSide, 1);
      log(`${sideName(aSide)}：アロングダイト→1ドロー`, "ok");
    }
    await maybeCattleOnDeath(deadD, aSide, dSide);
  }else{
    const deadA = destroyCharacter(aSide, aPos, "負け");
    if(D.equips?.some(x=>x.no===19)){
      draw(dSide, 1);
      log(`${sideName(dSide)}：アロングダイト→1ドロー`, "ok");
    }
    await maybeCattleOnDeath(deadA, dSide, aSide);
  }
}

// No.17: when your char is sent to wing by battle -> you may return an opponent character to hand
async function maybeCattleOnDeath(deadCard, ownerSide, opponentSide){
  if(!deadCard) return;
  // did owner have No.17 in hand?
  const idx = state[ownerSide].hand.findIndex(c=>c.no===17);
  if(idx<0) return;

  // opponent must have a character
  const oppPos = state[opponentSide].C.map((c,i)=>c?i:-1).filter(i=>i>=0);
  if(!oppPos.length) return;

  const trigger = async ()=>{
    // consume No.17
    const card17 = state[ownerSide].hand.splice(idx,1)[0];
    moveToWing(ownerSide, card17);

    // choose target: strongest by default for AI, or confirm select for player
    if(ownerSide==="AI"){
      let best=-1, bestAtk=-1;
      for(const p of oppPos){
        const c=state[opponentSide].C[p];
        if(c && c.atk>bestAtk){ bestAtk=c.atk; best=p; }
      }
      const tgt=state[opponentSide].C[best];
      state[opponentSide].C[best]=null;
      state[opponentSide].hand.push(tgt);
      log(`AI：キャトルミューティレーション → ${tgt.name}を手札へ戻す`, "warn");
      return;
    }

    // player: pick which enemy char to return
    state.pending = { type:"pick_enemy_to_hand", ownerSide, opponentSide, pool: oppPos.slice() };
    say("キャトルミューティレーション：戻す相手キャラを選んでください", "ok");
    renderAll();
  };

  if(ownerSide==="AI"){
    // AI uses with 50% chance
    if(Math.random()<0.55) await trigger();
  }else{
    await new Promise((resolve)=>{
      askConfirm("発動確認", `キャラがバトルでウイングへ。\n手札の「キャトルミューティレーション」を発動して相手キャラ1体を手札に戻しますか？`, ()=>{
        trigger().then(resolve);
      });
      el.btnNo.onclick = ()=>{ hideModal("confirmM"); resolve(); };
    });
  }
}

/* =========================================================
   SUMMON TRIGGERS / ACTIVATIONS
========================================================= */
function onSummon(side, card){
  // No.4: search クランプス
  if(card.no===4){
    const list = [];
    for(const c of state[side].deck) if((c.tags||[]).includes("クランプス")) list.push(c);
    for(const c of state[side].wing) if((c.tags||[]).includes("クランプス")) list.push(c);

    if(!list.length){
      log(`${sideName(side)}：ラウスのサーチ対象なし`, "warn");
      return;
    }

    // auto for AI
    if(side==="AI"){
      const picked = takeFromDeckOrWingToHand("AI", (c)=>(c.tags||[]).includes("クランプス"));
      if(picked) log(`AI：ラウス→サーチ ${picked.name}`, "ok");
      return;
    }

    state.pending = { type:"search_pick", side, title:"ラウス：クランプスを1枚選択", pool: list };
    say("ラウス：クランプスカードを1枚選んでください", "ok");
    renderAll();
    return;
  }

  // No.5: draw2
  if(card.no===5){
    draw(side,2);
    log(`${sideName(side)}：タータ登場→2ドロー`, "ok");
  }
}

// No.1 activation: search 黒魔法 once per turn (manual: long-press button not present; so use "tap your character in MAIN while hand none" to open action)
async function tryActivateCharacterAbility(side, pos){
  const ch = state[side].C[pos];
  if(!ch) return false;
  if(ch.flags.usedOnceThisTurn) { say("このターン既に使用しました", "warn"); return true; }

  // Only allow on your turn MAIN
  if(state.activeSide!==side || state.phase!=="MAIN") return false;

  // No.1: add 黑魔法 from deck/wing
  if(ch.no===1){
    const can = findInDeckOrWing(side, c=>(c.tags||[]).includes("黒魔法"));
    if(!can){ log(`${sideName(side)}：クルエラ サーチ対象なし`, "warn"); say("サーチ対象なし", "warn"); return true; }
    if(side==="AI"){
      const got = takeFromDeckOrWingToHand("AI", c=>(c.tags||[]).includes("黒魔法"));
      if(got){ ch.flags.usedOnceThisTurn=true; log(`AI：クルエラ→サーチ ${got.name}`, "ok"); }
      return true;
    }
    await new Promise((resolve)=>{
      askConfirm("発動確認", "クルエラ：デッキ/ウイングから「黒魔法」を1枚手札へ。\n発動しますか？", ()=>{
        const got = takeFromDeckOrWingToHand("P1", c=>(c.tags||[]).includes("黒魔法"));
        if(got){ ch.flags.usedOnceThisTurn=true; log(`あなた：クルエラ→サーチ ${got.name}`, "ok"); say("サーチ完了", "ok"); renderAll(); }
        resolve();
      });
      el.btnNo.onclick=()=>{ hideModal("confirmM"); resolve(); };
    });
    return true;
  }

  // No.3: +1000 until end of turn
  if(ch.no===3){
    applyTempAtk(side, ch, +1000);
    ch.flags.usedOnceThisTurn=true;
    log(`${sideName(side)}：ニコラ→ATK+1000（ターン終了まで）`, "ok");
    say("ニコラ強化", "ok");
    renderAll();
    return true;
  }

  // No.6: target enemy -1000 until end turn
  if(ch.no===6){
    const def = side==="P1" ? "AI" : "P1";
    const pool = state[def].C.map((c,i)=>c?i:-1).filter(i=>i>=0);
    if(!pool.length){ say("相手キャラがいません", "warn"); return true; }

    if(side==="AI"){
      // debuff strongest
      let best=-1, bestAtk=-1;
      for(const p of pool){ const c=state[def].C[p]; if(c && c.atk>bestAtk){bestAtk=c.atk; best=p;} }
      applyTempAtk(def, state[def].C[best], -1000);
      ch.flags.usedOnceThisTurn=true;
      log(`AI：エフィ→${state[def].C[best].name} ATK-1000（ターン終了まで）`, "warn");
      return true;
    }

    state.pending = { type:"pick_enemy_debuff", side, fromPos:pos, amount:-1000, defSide:def, pool };
    say("エフィ：弱体化する相手キャラを選んでください（ATK-1000）", "ok");
    renderAll();
    return true;
  }

  // No.5: hand->wing up to2 then fetch BUGBUG same count (once per turn)
  if(ch.no===5){
    if(side==="AI"){
      // AI simple: if has >=2 hand then do it 30%
      if(state.AI.hand.length>=2 && Math.random()<0.35){
        const send = state.AI.hand.splice(0, Math.min(2, state.AI.hand.length));
        for(const c of send) moveToWing("AI", c);
        let fetched=0;
        for(let i=0;i<send.length;i++){
          const got = takeFromDeckOrWingToHand("AI", c=>c.titleTag==="BUGBUG西遊記");
          if(got) fetched++;
        }
        ch.flags.usedOnceThisTurn=true;
        log(`AI：タータ起動→手札${send.length}ウイング/BUGBUG${fetched}サーチ`, "ok");
      }
      return true;
    }

    if(state.P1.hand.length<=0){ say("手札がありません", "warn"); return true; }
    state.pending = { type:"tarta_pay", side, step:"select_hand", picks:[] };
    say("タータ：手札を0〜2枚タップして選択→もう一度タータをタップで確定", "ok");
    renderAll();
    return true;
  }

  // No.13: send itself to wing to debuff -1000 (can on opponent turn too => here allow always when it's your active or opponent active if side is activeSide OR special permission)
  if(ch.no===13){
    const def = side==="P1" ? "AI" : "P1";
    const pool = state[def].C.map((c,i)=>c?i:-1).filter(i=>i>=0);
    if(!pool.length){ say("相手キャラがいません", "warn"); return true; }

    if(side==="AI"){
      // AI use 40% if enemy has card
      if(Math.random()<0.45){
        // send self to wing
        state.AI.C[pos]=null;
        moveToWing("AI", ch);
        // debuff strongest
        let best=-1, bestAtk=-1;
        for(const p of pool){ const c=state[def].C[p]; if(c && c.atk>bestAtk){bestAtk=c.atk; best=p;} }
        applyTempAtk(def, state[def].C[best], -1000);
        log(`AI：スタマックス→自身をウイング/ ${state[def].C[best].name} ATK-1000`, "warn");
        renderAll();
      }
      return true;
    }

    state.pending = { type:"stamax_fire", side, fromPos:pos, defSide:def, pool };
    say("スタマックス：弱体化する相手キャラを選んでください（自身はウイングへ）", "ok");
    renderAll();
    return true;
  }

  return false;
}

/* =========================================================
   EFFECTS FROM HAND (2,15,16) + ITEMS (11,18,19,20)
========================================================= */
async function resolveEffectCard(bySide, card){
  // offer counter from defender
  const defSide = bySide==="P1" ? "AI" : "P1";
  const countered = await offerCounter(defSide, card, bySide);
  if(countered){
    // effect is negated, goes to wing
    moveToWing(bySide, card);
    log(`${sideName(bySide)}：効果は無効化されました → ${card.name}はウイング`, "warn");
    return;
  }

  log(`${sideName(bySide)}：効果発動 → ${card.name}`, "ok");
  say(`効果発動：${card.name}`, "ok");

  // No.2 Flame Bullet
  if(card.no===2){
    if(!hasOnStage(bySide, "クルエラ")){
      log("条件未満：クルエラがいません", "warn");
      say("クルエラがいないため発動不可", "warn");
      moveToWing(bySide, card);
      return;
    }
    const enemySide = defSide;
    const enemyChars = state[enemySide].C.map((c,i)=>c?i:-1).filter(i=>i>=0);
    if(!enemyChars.length){
      say("相手キャラがいません", "warn");
      moveToWing(bySide, card);
      return;
    }

    if(bySide==="AI"){
      // AI choose: 50% A else B
      const chooseA = Math.random()<0.55;
      if(chooseA){
        let best=-1, bestAtk=-1;
        for(const p of enemyChars){ const c=state[enemySide].C[p]; if(c.atk>bestAtk){bestAtk=c.atk; best=p;} }
        destroyCharacter(enemySide, best, "フレイムバレット(A)");
      }else{
        for(const p of enemyChars){
          const c=state[enemySide].C[p];
          if(c && c.rank<=4) destroyCharacter(enemySide, p, "フレイムバレット(B)");
        }
      }
      moveToWing(bySide, card);
      renderAll();
      return;
    }

    await new Promise((resolve)=>{
      askConfirm("フレイムバレット", "OK：ATK最高1体をウイング\nキャンセル：rank4以下を全てウイング", ()=>{
        let best=-1, bestAtk=-1;
        for(const p of enemyChars){ const c=state[enemySide].C[p]; if(c.atk>bestAtk){bestAtk=c.atk; best=p;} }
        destroyCharacter(enemySide, best, "フレイムバレット(A)");
        resolve();
      });
      el.btnNo.onclick=()=>{
        hideModal("confirmM");
        for(const p of enemyChars){
          const c=state[enemySide].C[p];
          if(c && c.rank<=4) destroyCharacter(enemySide, p, "フレイムバレット(B)");
        }
        resolve();
      };
    });

    moveToWing(bySide, card);
    renderAll();
    return;
  }

  // No.15: +1000 one of your characters until end of turn
  if(card.no===15){
    const pool = state[bySide].C.map((c,i)=>c?i:-1).filter(i=>i>=0);
    if(!pool.length){
      say("自分キャラがいません", "warn");
      moveToWing(bySide, card);
      return;
    }
    if(bySide==="AI"){
      // buff strongest attacker
      let best=-1, bestAtk=-1;
      for(const p of pool){ const c=state.AI.C[p]; if(c.atk>bestAtk){bestAtk=c.atk; best=p;} }
      applyTempAtk("AI", state.AI.C[best], +1000);
      log(`AI：陰陽術→${state.AI.C[best].name} ATK+1000（ターン終了まで）`, "ok");
      moveToWing(bySide, card);
      renderAll();
      return;
    }
    state.pending = { type:"pick_own_buff", side:bySide, amount:+1000, pool, consumeCard:card };
    say("陰陽術：強化する自分キャラを選んでください（ATK+1000）", "ok");
    renderAll();
    return;
  }

  // No.16: send lowest ATK enemy to wing (your turn only rule => enforce for player; AI only uses on its turn)
  if(card.no===16){
    if(state.activeSide!==bySide || state.phase!=="MAIN"){
      say("この効果は自分ターンのみです", "warn");
      moveToWing(bySide, card);
      return;
    }
    const enemySide = defSide;
    const enemy = state[enemySide].C.map((c,i)=>c?({c,i}):null).filter(Boolean);
    if(!enemy.length){
      say("相手キャラがいません", "warn");
      moveToWing(bySide, card);
      return;
    }
    enemy.sort((a,b)=>a.c.atk-b.c.atk);
    destroyCharacter(enemySide, enemy[0].i, "力こそパワー！！");
    moveToWing(bySide, card);
    renderAll();
    return;
  }

  // others (8,14,17 are reactive)
  log("この効果はリアクション/条件付きです（自動トリガーで処理します）", "warn");
  moveToWing(bySide, card);
  renderAll();
}

async function resolveItemCard(bySide, itemCard){
  // must equip to a character
  const pool = state[bySide].C.map((c,i)=>c?i:-1).filter(i=>i>=0);
  if(!pool.length){
    say("装備先キャラクターがいません", "warn");
    moveToWing(bySide, itemCard);
    return;
  }

  if(bySide==="AI"){
    // equip to strongest
    let best=-1, bestAtk=-1;
    for(const p of pool){ const c=state.AI.C[p]; if(c.atk>bestAtk){bestAtk=c.atk; best=p;} }
    equipItemTo("AI", best, itemCard);
    log(`AI：装備 → ${itemCard.name}（${state.AI.C[best].name}）`, "ok");
    renderAll();
    return;
  }

  state.pending = { type:"pick_equip_target", side:bySide, item:itemCard, pool };
  say("装備先キャラクターを選んでください", "ok");
  renderAll();
}

/* =========================================================
   CLICK HANDLERS
========================================================= */
function faceForCard(card, opts={}){
  const face=document.createElement("div");
  face.className="face";
  const url=state.img.cardUrlByNo[pad2(card.no)];
  if(url) face.style.backgroundImage=`url("${url}")`;
  else face.classList.add("fallback");
  if(opts.enemy) face.classList.add("enemyFlip");
  return face;
}

function makeSlot(card, opts={}){
  const slot=document.createElement("div");
  slot.className="slot";
  if(opts.small) slot.classList.add("small");
  if(opts.disabled) slot.classList.add("disabled");
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");

  if(card){
    slot.appendChild(faceForCard(card, {enemy:!!opts.enemy}));
    if(card.kind==="character"){
      const b=document.createElement("div");
      b.className="slotBadge";
      b.textContent=`ATK ${card.atk}`;
      slot.appendChild(b);
    }
    bindLongPress(slot, ()=>openViewer(card));
  }else{
    bindLongPress(slot, ()=>{ if(opts.onEmptyLong) opts.onEmptyLong(); });
  }

  if(opts.onClick){
    slot.addEventListener("click",(e)=>{
      e.preventDefault();
      opts.onClick();
    }, {passive:false});
  }
  return slot;
}

function setBack(elm){
  if(state.img.backUrl){
    elm.style.backgroundImage=`url("${state.img.backUrl}")`;
    elm.style.backgroundColor="";
  }else{
    elm.style.backgroundImage="";
    elm.style.backgroundColor="#070914";
  }
}

/* =========================================================
   PENDING FLOW HANDLING
========================================================= */
function handlePendingPickOnEnemy(pos){
  const pend=state.pending;
  if(!pend) return false;

  // pick enemy to return to hand (No.17)
  if(pend.type==="pick_enemy_to_hand"){
    const {opponentSide} = pend;
    const c=state[opponentSide].C[pos];
    if(!c) return true;
    state[opponentSide].C[pos]=null;
    state[opponentSide].hand.push(c);
    log(`${sideName(pend.ownerSide)}：キャトルミューティレーション → ${c.name}を手札へ`, "warn");
    say("相手キャラを手札へ戻しました", "ok");
    state.pending=null;
    renderAll();
    return true;
  }

  // No.6 debuff pick
  if(pend.type==="pick_enemy_debuff"){
    const c=state[pend.defSide].C[pos];
    if(!c) return true;
    applyTempAtk(pend.defSide, c, pend.amount);
    const src=state[pend.side].C[pend.fromPos];
    if(src) src.flags.usedOnceThisTurn=true;
    log(`${sideName(pend.side)}：弱体 → ${c.name} ATK${pend.amount}（ターン終了まで）`, "warn");
    say("弱体完了", "ok");
    state.pending=null;
    renderAll();
    return true;
  }

  // No.13 fire pick
  if(pend.type==="stamax_fire"){
    const tgt=state[pend.defSide].C[pos];
    const src=state[pend.side].C[pend.fromPos];
    if(!tgt || !src) return true;
    // send src to wing
    state[pend.side].C[pend.fromPos]=null;
    moveToWing(pend.side, src);
    applyTempAtk(pend.defSide, tgt, -1000);
    log(`${sideName(pend.side)}：スタマックス→自身をウイング / ${tgt.name} ATK-1000（ターン終了まで）`, "warn");
    say("発射完了", "ok");
    state.pending=null;
    renderAll();
    return true;
  }

  return false;
}

function handlePendingPickOnOwnC(side, pos){
  const pend=state.pending;
  if(!pend) return false;

  if(pend.type==="pick_own_buff"){
    const c=state[side].C[pos];
    if(!c) return true;
    applyTempAtk(side, c, pend.amount);
    moveToWing(side, pend.consumeCard);
    log(`${sideName(side)}：強化 → ${c.name} ATK+${pend.amount}（ターン終了まで）`, "ok");
    say("強化完了", "ok");
    state.pending=null;
    renderAll();
    return true;
  }

  if(pend.type==="pick_equip_target"){
    const c=state[side].C[pos];
    if(!c) return true;
    equipItemTo(side, pos, pend.item);
    log(`${sideName(side)}：装備 → ${pend.item.name}（${c.name}）`, "ok");
    say("装備完了", "ok");
    state.pending=null;
    renderAll();
    return true;
  }

  if(pend.type==="kensan_cost"){
    // cost from stage card (C)
    const cost=state[side].C[pos];
    if(!cost) return true;
    resolveKensan(side, pend.card, pend.targetPos, cost, "C");
    return true;
  }

  if(pend.type==="tarta_pay"){
    // picking hand cards is handled in hand click; confirm is by re-tapping Tarta
    return true;
  }

  return false;
}

/* =========================================================
   KENSAN
========================================================= */
function kensanFlow(side, card, targetPos){
  state.pending = { type:"kensan_cost", side, card, targetPos };
  say("見参コスト：手札または自分ステージのカードを1枚選んでください", "ok");
  renderAll();
}
function resolveKensan(side, card, targetPos, costCard, costFrom){
  // pay cost
  if(costFrom==="hand"){
    const idx=state[side].hand.findIndex(x=>x.uid===costCard.uid);
    if(idx>=0) state[side].hand.splice(idx,1);
  }else if(costFrom==="C"){
    const idx=state[side].C.findIndex(x=>x && x.uid===costCard.uid);
    if(idx>=0) state[side].C[idx]=null;
  }else if(costFrom==="E"){
    const idx=state[side].E.findIndex(x=>x && x.uid===costCard.uid);
    if(idx>=0) state[side].E[idx]=null;
  }
  moveToWing(side, costCard);

  // remove main card from hand
  const hidx=state[side].hand.findIndex(x=>x.uid===card.uid);
  if(hidx>=0) state[side].hand.splice(hidx,1);

  state[side].C[targetPos]=card;
  state.pending=null;
  log(`${sideName(side)}：見参 → ${card.name}（コスト：${costCard.name}）`, "ok");
  say("見参完了", "ok");
  onSummon(side, card);
  renderAll();
}

/* =========================================================
   MAIN CLICK LOGIC
========================================================= */
function onClickYourC(pos){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  // pending on your C
  if(handlePendingPickOnOwnC("P1", pos)) return;

  // MAIN: place character
  if(state.phase==="MAIN"){
    // If no hand selected, allow “character ability activation” by tapping your character
    if(state.selectedHandIndex==null){
      tryActivateCharacterAbility("P1", pos);
      return;
    }

    const card=state.P1.hand[state.selectedHandIndex];
    if(!card) return;
    if(state.P1.C[pos]){ say("その枠は埋まっています", "warn"); return; }

    if(card.kind!=="character"){ say("キャラクターはCへ置きます", "warn"); return; }

    if(needsKensan(card)){ kensanFlow("P1", card, pos); return; }
    if(!canNormalSummon(card)){ say("このキャラは通常登場できません", "warn"); return; }

    state.P1.C[pos]=card;
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex=null;
    log(`登場：${card.name}`, "ok");
    say("登場完了", "ok");
    onSummon("P1", card);
    renderAll();
    return;
  }

  // BATTLE: select attacker
  if(state.phase==="BATTLE"){
    const c=state.P1.C[pos];
    if(!c) return;
    if(state.attackedThisTurn.P1[pos]){ say("このターン既に攻撃しました", "warn"); return; }
    state.selectedAttackerPos = (state.selectedAttackerPos===pos) ? null : pos;
    say(state.selectedAttackerPos==null ? "攻撃者選択を解除" : "対象を選んでください", "ok");
    renderAll();
  }
}

async function onClickYourE(pos){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  // kensan cost from E
  if(state.pending?.type==="kensan_cost"){
    const cost=state.P1.E[pos];
    if(cost) resolveKensan("P1", state.pending.card, state.pending.targetPos, cost, "E");
    return;
  }

  if(state.phase!=="MAIN") return;
  if(state.selectedHandIndex==null) return;
  if(state.P1.E[pos]){ say("その枠は埋まっています", "warn"); return; }

  const card=state.P1.hand[state.selectedHandIndex];
  if(!card) return;

  if(card.kind==="character"){ say("キャラクターはCへ置いてください", "warn"); return; }

  // effects are one-shot: resolve then wing
  if(card.kind==="effect"){
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex=null;
    await resolveEffectCard("P1", card);
    renderAll();
    return;
  }

  // items: resolve equip flow (do not occupy E slot in this product build)
  if(card.kind==="item"){
    state.P1.hand.splice(state.selectedHandIndex,1);
    state.selectedHandIndex=null;
    await resolveItemCard("P1", card);
    renderAll();
    return;
  }
}

async function onClickEnemyC(pos){
  if(state.gameOver) return;

  // pending enemy pick
  if(handlePendingPickOnEnemy(pos)) return;

  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  const atk=state.P1.C[state.selectedAttackerPos];
  const def=state.AI.C[pos];
  if(!atk || !def) return;

  askConfirm("攻撃確認", `${atk.name} → ${def.name}\n攻撃しますか？`, async ()=>{
    await resolveBattle("P1", state.selectedAttackerPos, "AI", pos);
    state.attackedThisTurn.P1[state.selectedAttackerPos]=true;
    state.selectedAttackerPos=null;
    say("攻撃完了", "ok");
    renderAll();
  });
}

function onClickEnemyShield(idx){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;
  if(state.phase!=="BATTLE") return;
  if(state.selectedAttackerPos==null) return;

  if(state.AI.C.some(Boolean)){ say("相手キャラがいる間はシールドを攻撃できません", "warn"); return; }
  if(!state.AI.shield[idx]){ say("そのシールドはありません", "warn"); return; }

  const atk=state.P1.C[state.selectedAttackerPos];
  if(!atk) return;

  askConfirm("攻撃確認", `${atk.name} がシールドを攻撃します。\n破壊して相手手札へ送りますか？`, ()=>{
    breakShield("AI", idx, "P1");
    state.attackedThisTurn.P1[state.selectedAttackerPos]=true;
    state.selectedAttackerPos=null;

    if(state.AI.shield.every(x=>!x)){
      log("相手シールド全破壊：次の攻撃でダイレクト可能", "ok");
      say("相手シールド全破壊：次でダイレクト", "ok");
    }else{
      say("シールドを破壊しました", "ok");
    }
    renderAll();
  });
}

/* hand click */
function bindHand(){
  // built in renderHand
}

/* =========================================================
   RENDERING
========================================================= */
function renderZones(){
  // enemy C
  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.AI.C[i];
    el.aiC.appendChild(makeSlot(c, { enemy:true, onClick: ()=>onClickEnemyC(i) }));
  }
  // enemy E (not used but keep 3 slots)
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.AI.E[i];
    el.aiE.appendChild(makeSlot(c, { enemy:true }));
  }
  // enemy shields (facedown)
  el.aiS.innerHTML="";
  const remainE = state.AI.shield.filter(Boolean).length;
  for(let i=0;i<3;i++){
    const exists=!!state.AI.shield[i];
    const slot=document.createElement("div");
    slot.className="slot small";
    if(!exists) slot.classList.add("disabled");

    const face=document.createElement("div");
    face.className="face enemyFlip";
    if(exists){
      if(state.img.backUrl) face.style.backgroundImage=`url("${state.img.backUrl}")`;
      else face.style.background="#070914";
      face.style.backgroundSize="cover";
      face.style.backgroundPosition="center";
    }else{
      face.classList.add("fallback");
      face.style.opacity=".25";
    }
    slot.appendChild(face);

    const b=document.createElement("div");
    b.className="slotBadge";
    b.textContent=`${remainE}/3`;
    slot.appendChild(b);

    slot.addEventListener("click",(e)=>{ e.preventDefault(); onClickEnemyShield(i); }, {passive:false});
    el.aiS.appendChild(slot);
  }

  // your C
  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.P1.C[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const sel = (state.selectedAttackerPos===i);
    el.pC.appendChild(makeSlot(c, {
      glow, sel,
      onClick: ()=>onClickYourC(i),
      onEmptyLong: ()=>{
        // guide for kensan: if selected card needs kensan, entering flow
        if(state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null){
          const card=state.P1.hand[state.selectedHandIndex];
          if(card && needsKensan(card)) kensanFlow("P1", card, i);
        }
      }
    }));
  }

  // your E (3 slots, tappable for placing effects/items)
  el.pE.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.P1.E[i];
    const glow = (state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null);
    el.pE.appendChild(makeSlot(c, { glow, onClick: ()=>onClickYourE(i) }));
  }

  // your shields (facedown)
  el.pS.innerHTML="";
  const remainP = state.P1.shield.filter(Boolean).length;
  for(let i=0;i<3;i++){
    const exists=!!state.P1.shield[i];
    const slot=document.createElement("div");
    slot.className="slot small";
    if(!exists) slot.classList.add("disabled");
    const face=document.createElement("div");
    face.className="face";
    if(exists){
      if(state.img.backUrl) face.style.backgroundImage=`url("${state.img.backUrl}")`;
      else face.style.background="#070914";
      face.style.backgroundSize="cover";
      face.style.backgroundPosition="center";
    }else{
      face.classList.add("fallback");
      face.style.opacity=".25";
    }
    slot.appendChild(face);
    const b=document.createElement("div");
    b.className="slotBadge";
    b.textContent=`${remainP}/3`;
    slot.appendChild(b);
    el.pS.appendChild(slot);
  }
}

function renderHand(){
  el.hand.innerHTML="";
  for(let i=0;i<state.P1.hand.length;i++){
    const c=state.P1.hand[i];
    const h=document.createElement("div");
    h.className="handCard";
    if(state.selectedHandIndex===i) h.classList.add("sel");

    const url=state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage=`url("${url}")`;

    h.addEventListener("click",(e)=>{
      e.preventDefault();
      if(state.gameOver) return;
      if(state.activeSide!=="P1") return;

      // kensan cost selection by tapping a hand card while pending
      if(state.pending?.type==="kensan_cost"){
        resolveKensan("P1", state.pending.card, state.pending.targetPos, c, "hand");
        return;
      }

      // Tarta payment selection
      if(state.pending?.type==="tarta_pay"){
        // toggle pick up to 2 cards (not including Tarta itself if in hand; ok either way)
        const picks=state.pending.picks;
        const idx=picks.indexOf(c.uid);
        if(idx>=0) picks.splice(idx,1);
        else{
          if(picks.length>=2){ say("最大2枚までです", "warn"); return; }
          picks.push(c.uid);
        }
        say(`タータ：選択 ${picks.length}/2（確定はタータをもう一度タップ）`, "ok");
        renderAll();
        return;
      }

      state.selectedHandIndex = (state.selectedHandIndex===i) ? null : i;
      state.selectedAttackerPos = null;
      say(state.selectedHandIndex==null ? "手札選択を解除" : "配置先（CまたはE）をタップしてください", "muted");
      renderAll();
    }, {passive:false});

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
    more.style.color="rgba(233,236,255,.92)";
    el.aiHand.appendChild(more);
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

function renderAll(){
  updateHUD();
  updateCounts();
  renderPiles();
  renderZones();
  renderHand();
  renderEnemyHand();
}

/* =========================================================
   ZONE BUTTONS
========================================================= */
function bindZoneButtons(){
  $("aiWingBtn").addEventListener("click", ()=>openZone("ENEMY WING", state.AI.wing.slice().reverse()), {passive:true});
  $("aiOutBtn").addEventListener("click", ()=>openZone("ENEMY OUTSIDE", state.AI.outside.slice().reverse()), {passive:true});
  $("pWingBtn").addEventListener("click", ()=>openZone("YOUR WING", state.P1.wing.slice().reverse()), {passive:true});
  $("pOutBtn").addEventListener("click", ()=>openZone("YOUR OUTSIDE", state.P1.outside.slice().reverse()), {passive:true});
}

/* =========================================================
   PHASE / TURN
========================================================= */
function nextPhase(){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  const i=PHASES.indexOf(state.phase);
  const next=PHASES[(i+1)%PHASES.length];
  state.phase=next;

  if(next==="START"){
    state.selectedHandIndex=null;
    state.selectedAttackerPos=null;
    state.pending=null;
    say("START", "muted");
  }
  if(next==="DRAW"){
    draw("P1",1);
    log("あなた：ドロー +1", "ok");
    say("ドロー +1", "ok");
  }
  if(next==="MAIN"){
    say("MAIN：配置/発動（キャラ能力はCタップ）", "muted");
  }
  if(next==="BATTLE"){
    say("BATTLE：攻撃者→対象", "muted");
  }
  if(next==="END"){
    say("END：ターン終了できます", "muted");
  }
  renderAll();
}

async function endTurn(){
  if(state.gameOver) return;
  if(state.activeSide!=="P1") return;

  state.pending=null;
  state.selectedHandIndex=null;
  state.selectedAttackerPos=null;

  state.activeSide="AI";
  state.phase="START";
  renderAll();
  await runAITurn();
}

/* =========================================================
   AI TURN (SAFE)
========================================================= */
function aiChooseSummon(){
  const empty=state.AI.C.findIndex(x=>!x);
  if(empty<0) return false;

  // prefer normal summon best ATK rank<=4
  let bestIdx=-1, bestAtk=-1;
  for(let i=0;i<state.AI.hand.length;i++){
    const c=state.AI.hand[i];
    if(canNormalSummon(c) && c.baseAtk>bestAtk){ bestAtk=c.baseAtk; bestIdx=i; }
  }
  if(bestIdx<0) return false;

  const card=state.AI.hand.splice(bestIdx,1)[0];
  state.AI.C[empty]=card;
  log(`AI：登場 → ${card.name}`, "ok");
  onSummon("AI", card);
  return true;
}

async function aiPlayEffectIfAny(){
  // AI plays one strong effect if possible
  const idx2 = state.AI.hand.findIndex(c=>c.no===2);
  const idx16 = state.AI.hand.findIndex(c=>c.no===16);
  const idx15 = state.AI.hand.findIndex(c=>c.no===15);

  const pick = (idx2>=0) ? idx2 : (idx16>=0 ? idx16 : (idx15>=0 ? idx15 : -1));
  if(pick<0) return false;

  const card=state.AI.hand.splice(pick,1)[0];
  await resolveEffectCard("AI", card);
  return true;
}

async function aiEquipIfAny(){
  if(!state.AI.C.some(Boolean)) return false;
  const idx=state.AI.hand.findIndex(c=>c.kind==="item");
  if(idx<0) return false;
  const item=state.AI.hand.splice(idx,1)[0];
  await resolveItemCard("AI", item);
  return true;
}

async function aiActivateAbilities(){
  // try activate first available once
  for(let i=0;i<3;i++){
    const c=state.AI.C[i];
    if(!c) continue;
    // allow abilities in MAIN
    await tryActivateCharacterAbility("AI", i);
  }
}

async function aiBattle(){
  for(let i=0;i<3;i++){
    if(state.attackedThisTurn.AI[i]) continue;
    const atk=state.AI.C[i];
    if(!atk) continue;

    // if player has character => attack random
    const pool=state.P1.C.map((c,idx)=>c?idx:-1).filter(x=>x>=0);
    if(pool.length){
      const t=pool[Math.floor(Math.random()*pool.length)];
      await resolveBattle("AI", i, "P1", t);
      state.attackedThisTurn.AI[i]=true;
      renderAll();
      await sleep(180);
    }else{
      // break shield if exists else direct
      const sidx=state.P1.shield.findIndex(x=>!!x);
      if(sidx>=0){
        breakShield("P1", sidx, "AI");
        state.attackedThisTurn.AI[i]=true;
        renderAll();
        await sleep(160);
      }else{
        const win=checkDirectWin("AI");
        state.attackedThisTurn.AI[i]=true;
        renderAll();
        if(win) return;
      }
    }
  }
}

function applyBlaster18StartOfOpponentTurn(opponentSide){
  // for each character on active side that has item 18 equipped => opponent random discard to wing
  const active = state.activeSide; // current active
  const side = active; // owner of equips
  for(const ch of state[side].C){
    if(!ch) continue;
    if(ch.equips?.some(x=>x.no===18)){
      const hand=state[opponentSide].hand;
      if(!hand.length) continue;
      const r=Math.floor(Math.random()*hand.length);
      const lost=hand.splice(r,1)[0];
      moveToWing(opponentSide, lost);
      log(`${sideName(side)}：a-xブラスター01→相手手札をランダム1枚ウイング`, "warn");
    }
  }
}

async function runAITurn(){
  if(state.aiRunning || state.gameOver) return;
  if(state.activeSide!=="AI") return;

  state.aiRunning=true;
  try{
    resetTurnFlags();
    say("相手ターン", "warn");
    log("AIターン開始", "warn");

    state.phase="START"; renderAll();
    await sleep(180);

    // start of AI turn: if P1 has item18 equipped => AI discards random 1
    applyBlaster18StartOfOpponentTurn("AI");

    state.phase="DRAW"; renderAll();
    draw("AI",1);
    log("AI：ドロー +1", "ok");
    await sleep(180);

    state.phase="MAIN"; renderAll();
    aiChooseSummon();
    await aiEquipIfAny();
    await aiPlayEffectIfAny();
    await aiActivateAbilities();
    await sleep(220);

    state.phase="BATTLE"; renderAll();
    await aiBattle();
    await sleep(200);

    state.phase="END"; renderAll();
    await sleep(120);

    // to player
    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    resetTurnFlags();

    // start of P1 turn: if AI has item18 equipped => P1 discards random 1
    applyBlaster18StartOfOpponentTurn("P1");

    log(`TURN ${state.turn} あなたのターン`, "ok");
    say(`TURN ${state.turn} あなたのターン`, "ok");
    renderAll();

  }finally{
    state.aiRunning=false;
  }
}

/* =========================================================
   START GAME
========================================================= */
function startGame(){
  state.gameOver=false;
  state.aiRunning=false;
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

  if(state.firstSide==="P1"){
    el.firstInfo.textContent="先攻：あなた";
    say("あなたのターン開始（DRAWで5枚）", "ok");
    log("先攻：あなた", "ok");
  }else{
    el.firstInfo.textContent="先攻：相手";
    say("相手が先攻です", "warn");
    log("先攻：相手", "warn");
  }

  resetTurnFlags();
  renderAll();

  if(state.activeSide==="AI") runAITurn();
}

/* =========================================================
   SETTINGS / BUTTONS
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
  el.btnNext.addEventListener("click",(e)=>{ e.preventDefault(); nextPhase(); }, {passive:false});
  el.btnEnd.addEventListener("click",(e)=>{ e.preventDefault(); endTurn(); }, {passive:false});
}

/* =========================================================
   EXTRA: pending search selection for Laus (No.4)
========================================================= */
function renderSearchPickIfNeeded(){
  if(!state.pending || state.pending.type!=="search_pick") return;
  // show in zone modal list
  const {title, pool, side} = state.pending;
  el.zoneTitle.textContent = title;
  el.zoneList.innerHTML="";
  pool.forEach((c)=>{
    const it=document.createElement("div");
    it.className="zoneItem";
    const th=document.createElement("div");
    th.className="zThumb";
    const url=state.img.cardUrlByNo[pad2(c.no)];
    if(url) th.style.backgroundImage=`url("${url}")`;
    const meta=document.createElement("div");
    meta.className="zMeta";
    const t=document.createElement("div"); t.className="t"; t.textContent=c.name;
    const s=document.createElement("div"); s.className="s";
    s.textContent = (c.kind==="character") ? `RANK ${c.rank} / ATK ${c.atk}` : `${c.kind.toUpperCase()} / RANK ${c.rank}`;
    meta.appendChild(t); meta.appendChild(s);
    it.appendChild(th); it.appendChild(meta);

    it.addEventListener("click", ()=>{
      // take chosen from deck/wing to hand
      const got = takeFromDeckOrWingToHand(side, x=>x.uid===c.uid);
      if(got){
        log(`${sideName(side)}：サーチ → ${got.name}`, "ok");
        say("サーチ完了", "ok");
      }
      state.pending=null;
      hideModal("zoneM");
      renderAll();
    }, {passive:true});

    el.zoneList.appendChild(it);
  });
  showModal("zoneM");
}

/* =========================================================
   FINAL: renderAll hook: if search_pick pending, open list
========================================================= */
const _renderAll = renderAll;
renderAll = function(){
  _renderAll();
  // if need show search
  if(state.pending?.type==="search_pick"){
    renderSearchPickIfNeeded();
  }
};

/* =========================================================
   INIT / START
========================================================= */
function bindStart(){
  el.btnStart.addEventListener("click", ()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    log("対戦画面：表示OK（iPhone FIRST）", "ok");
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

  // iOS: prevent accidental zooming by double tap on buttons
  document.addEventListener("touchmove", ()=>{}, {passive:true});

  const cache=getCache();
  if(cache && cache.repo===getRepo() && cache.assetFiles && cache.cardFiles){
    log("画像：キャッシュを使用（必要なら設定→再取得）", "muted");
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent="JS: 準備完了";
  say("準備完了", "ok");
  log("v60000：フィールドは<img>下敷き（切れない）/ iPhone特化レイアウト", "ok");
}

document.addEventListener("DOMContentLoaded", init);