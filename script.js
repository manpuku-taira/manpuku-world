/* =========================================================
  Manpuku World - COMPLETE (v50022 Full Replace)
  - ラウス登場時サーチ：選択→即手札（デッキ/ウィングから正しく抜く）
  - AI停止修正：チェーン/キャンセル後も必ず行動継続→ターン終了
  - 記憶抹消：無効化 + 元カードをウィングへ（発動元が手札/場/ゾーン問わず）
  - シールド破壊：即 破壊された側の手札へ
  - 先行1ターン目：バトル不可（シールド攻撃含め禁止）
  - ターン終了：手札上限7 超過分は選んでウィングへ（AIは自動）
========================================================= */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pad2 = (n)=> String(n).padStart(2,"0");

const el = {
  title: $("title"),
  game: $("game"),
  boot: $("boot"),
  btnStart: $("btnStart"),
  titleArt: $("titleArt"),

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

  aiDirectHint: $("aiDirectHint"),
  pDirectHint: $("pDirectHint"),

  viewerM: $("viewerM"),
  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),
  btnCardAct: $("btnCardAct"),

  choiceM: $("choiceM"),
  choiceTitle: $("choiceTitle"),
  choiceBody: $("choiceBody"),

  zoneM: $("zoneM"),
  zoneTitle: $("zoneTitle"),
  zoneBody: $("zoneBody"),

  resultM: $("resultM"),
  resultText: $("resultText"),
  btnNextGame: $("btnNextGame"),
  btnBackTitle: $("btnBackTitle"),

  logM: $("logM"),
  logBody: $("logBody"),

  settingsM: $("settingsM"),
  repoInput: $("repoInput"),
  btnRepoSave: $("btnRepoSave"),
  btnRescan: $("btnRescan"),
  btnClearCache: $("btnClearCache"),

  helpM: $("helpM"),
};

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

const LOGS = [];
function log(msg, kind="muted"){
  LOGS.unshift({msg, kind, t: Date.now()});
  if(el.logM?.classList.contains("show")) renderLogModal();
  // console.log(msg);
}
window.addEventListener("error", (e)=> log(`JSエラー: ${e.message || e.type}`, "warn"));
window.addEventListener("unhandledrejection", (e)=> log(`Promiseエラー: ${String(e.reason || "")}`, "warn"));

function renderLogModal(){
  if(!el.logBody) return;
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

function bindLongPress(node, fn, ms=620){
  let t = null;
  const start = ()=> { clearTimeout(t); t = setTimeout(()=>fn(), ms); };
  const end = ()=> clearTimeout(t);
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
}

/* ---------------- Cards ---------------- */
const CardRegistry = [
  { no:1,  name:"黒の魔法使いクルエラ", type:"character",
    tags:["魔法使い","冒険者"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウィングに送り、手札から見参できる。\n" +
      "1ターンに1度発動できる。デッキ・ウィングからカード名に「黒魔法」を含むカード1枚を手札に加える。"
    ),
    rank:5, atk:2500, summon:"kensan" },

  { no:2,  name:"黒魔法-フレイムバレット", type:"effect",
    tags:["魔法使い","火焔"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ステージに「クルエラ」がある時、手札から発動できる。\n" +
      "相手ステージのキャラクター1体を選び、以下の効果を1つ選択する。\n" +
      "・相手ステージのATKが1番高いキャラクター1体をウィングに送る。\n" +
      "・相手ステージのrank4以下のキャラクターをすべてウィングに送る。"
    ),
    rank:0, atk:0 },

  { no:3,  name:"トナカイの少女ニコラ", type:"character",
    tags:["クランプス","怪力"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウィングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、このキャラクターのATK+1000。"
    ),
    rank:5, atk:2000, summon:"kensan" },

  { no:4,  name:"聖ラウス", type:"character",
    tags:["サンタ","運び屋","父親"], titleTag:"NIKORA-ニコラー",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウィングからタグ「クランプス」カード1枚を手札に加える。"
    ),
    rank:3, atk:1800 },

  { no:5,  name:"統括AI タータ", type:"character",
    tags:["AI","管理者","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキから2枚ドローする。\n" +
      "自分ターンに1度発動できる。手札から2枚までウィングに送る。その後、送った枚数と同じ枚数だけ、タイトルタグ「BUGBUG西遊記」カードをデッキから手札に加える。"
    ),
    rank:4, atk:1000 },

  { no:6,  name:"麗し令嬢エフィ", type:"character",
    tags:["資産家","格闘"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText(
      "このカードは登場できず、手札または自分ステージのキャラクターカード1枚をウィングに送り、手札から見参できる。\n" +
      "自分ターンに発動できる。このターンの終わりまで、相手ステージのキャラクター1体を選び、ATK-1000。"
    ),
    rank:5, atk:2000, summon:"kensan" },

  { no:7,  name:"狩樹 まひる", type:"character",
    tags:["人間","射手","組織"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃する事ができる。\n" +
      "相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    ),
    rank:4, atk:1700 },

  { no:8,  name:"組織の男 手形", type:"character",
    tags:["狐憑き","組織","格闘"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText(
      "相手ターンに1度発動できる。相手が発動した効果を無効にする。\n" +
      "（キャラクター／エフェクト／アイテム、すべての効果に対して無効にできる）"
    ),
    rank:3, atk:1900 },

  { no:9,  name:"小太郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウィングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:3, atk:1600 },

  { no:10, name:"小次郎・孫悟空Lv17", type:"character",
    tags:["アバター","GAME"], titleTag:"BUGBUG西遊記",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウィングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:3, atk:1500 },

  { no:11, name:"司令", type:"character",
    tags:["人間","発明家"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが登場した時、発動できる。自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。\n" +
      "（発動条件：自分ステージにこのカード以外のキャラクターがいる時のみ）"
    ),
    rank:2, atk:1200 },

  { no:12, name:"班目プロデューサー", type:"character",
    tags:["人間","取材"], titleTag:"ハガネノコドウ A-E",
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"),
    rank:2, atk:800 },

  { no:13, name:"超弩級砲塔列車スタマックス氏", type:"character",
    tags:["人間","ヲタク"], titleTag:"音霊戦隊ディスクレンジャー2021",
    text: normalizeText(
      "このカードが自分ステージに存在する時、発動できる。このカードをウィングに送り、相手ステージのキャラクター1体を選択し、このターンの終わりまでATK-1000。\n" +
      "この効果は相手ターンでも発動できる。"
    ),
    rank:1, atk:100 },

  { no:14, name:"記憶抹消", type:"effect",
    tags:["組織","任務"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウィングに送る。"),
    rank:0, atk:0 },

  { no:15, name:"桜蘭の陰陽術 - 闘 -", type:"effect",
    tags:["陰陽術","過去"], titleTag:"封印壊除",
    text: normalizeText("自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体を選択し、ATK+1000。"),
    rank:0, atk:0 },

  { no:16, name:"力こそパワー！！", type:"effect",
    tags:["怪力","脑筋"], titleTag:"SYNAPSE-シナプス-",
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウィングに送る。"),
    rank:0, atk:0 },

  { no:17, name:"キャトルミューティレーション", type:"effect",
    tags:["オールネス","宇宙"], titleTag:"Eバリアーズ",
    text: normalizeText("自分ステージのキャラクターがバトルでウィングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。"),
    rank:0, atk:0 },

  { no:18, name:"a-xブラスター01 -放射型-", type:"item",
    tags:["医療機器","任務"], titleTag:"恋愛疾患特殊医療機a-xブラスター",
    text: normalizeText(
      "自分のターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「射手」をもつキャラクターが装備した場合、さらにATK+500させ、相手ターンの開始時に相手の手札を1枚ランダムにウィングに送る。"
    ),
    rank:0, atk:0 },

  { no:19, name:"-聖剣- アロングダイト", type:"item",
    tags:["聖剣","神器"], titleTag:"Eバリアーズ",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\n" +
      "タグ「勇者」「剣士」を持つキャラクターがこのカードを装備した場合、さらにATK+500し、相手キャラクターをバトルでウィングに送った時、カードを1枚ドローする。"
    ),
    rank:0, atk:0 },

  { no:20, name:"普通の棒", type:"item",
    tags:["木の棒","可能性"], titleTag:"MAGIAGIA-マギアギア-",
    text: normalizeText(
      "自分ターンに手札から発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+300。\n" +
      "タグ「勇者」を持つキャラクターがこのカードを装備した場合、さらにATK+500。"
    ),
    rank:0, atk:0 },
];

let _uid = 1;
function makeInstance(def){
  return {
    uid: `u${_uid++}`,
    no:def.no, name:def.name, type:def.type,
    tags:[...(def.tags||[])],
    titleTag:def.titleTag||"",
    text:def.text||"",
    rank:def.rank||0,
    baseAtk:def.atk||0,
    summon:def.summon||"normal",
    tempAtk:0,
    equipUid:null,
    equippedToUid:null,
    used:{ perTurn:false },
    flags:{ attackedCountThisTurn:0, producerSavedThisTurn:false },
    _equipBonus:0,
    _equipBonus2:0,
  };
}
function buildDeck(){
  const deck=[];
  for(const c of CardRegistry){
    deck.push(makeInstance(c));
    deck.push(makeInstance(c));
  }
  shuffle(deck);
  return deck;
}
function isCharacter(c){ return c && c.type==="character"; }
function isEffect(c){ return c && c.type==="effect"; }
function isItem(c){ return c && c.type==="item"; }
function sideName(side){ return side==="P1" ? "あなた" : "AI"; }
function opponent(side){ return side==="P1" ? "AI" : "P1"; }

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];

const state = {
  started:false,
  gameOver:false,
  turn:1,
  phase:"START",
  activeSide:"P1",
  firstSide:"P1",
  normalSummonUsed:false,
  selectedHandIndex:null,

  P1:{ deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },
  AI:{ deck:[], hand:[], shield:[], C:[null,null,null], E:[null,null,null], wing:[], outside:[] },

  limits:{
    P1:{ handgataUsed:false },
    AI:{ handgataUsed:false },
  },

  img:{ fieldUrl:"", backUrl:"", cardUrlByNo:{}, ready:false },

  // クリック戦闘
  battle:{ attackerSide:null, attackerPos:null, attackerUid:null },

  viewer:{ side:null, zone:null, pos:null, uid:null },
};

/* ---------------- Modals ---------------- */
function showModal(id){ $(id)?.classList.add("show"); }
function hideModal(id){ $(id)?.classList.remove("show"); }

let choiceResolver=null;
let choiceDefaultValue=null;

document.addEventListener("click", (e)=>{
  const t=e.target;
  if(!(t instanceof HTMLElement)) return;
  const close=t.getAttribute("data-close");
  if(close==="viewer") hideModal("viewerM");
  if(close==="settings") hideModal("settingsM");
  if(close==="help") hideModal("helpM");
  if(close==="log") hideModal("logM");
  if(close==="zone") hideModal("zoneM");
  if(close==="result") hideModal("resultM");
  if(close==="choice"){
    hideModal("choiceM");
    if(choiceResolver){
      const r=choiceResolver; choiceResolver=null;
      const dv=(choiceDefaultValue!==null)?choiceDefaultValue:"__CANCEL__";
      choiceDefaultValue=null;
      r(dv);
    }
  }
});

function askChoice(title, message, items, opt={}){
  const { defaultValue=null } = opt;
  choiceDefaultValue = defaultValue;

  el.choiceTitle.textContent = title;
  el.choiceBody.innerHTML = "";

  const msg = document.createElement("div");
  msg.className="choiceMsg";
  msg.textContent=message;
  el.choiceBody.appendChild(msg);

  const list=document.createElement("div");
  list.className="choiceList";

  for(const it of items){
    const row=document.createElement("div");
    row.className="choiceItem";

    const th=document.createElement("div");
    th.className="choiceThumb";
    if(it.card){
      const url=state.img.cardUrlByNo[pad2(it.card.no)];
      if(url) th.style.backgroundImage=`url("${url}")`;
    }else if(it.thumbUrl){
      th.style.backgroundImage=`url("${it.thumbUrl}")`;
    }

    const meta=document.createElement("div");
    meta.className="choiceMeta";
    const tt=document.createElement("div");
    tt.className="t";
    tt.textContent=it.label;
    const ss=document.createElement("div");
    ss.className="s";
    ss.textContent=it.sub||"";
    meta.appendChild(tt);
    if(ss.textContent) meta.appendChild(ss);

    row.appendChild(th);
    row.appendChild(meta);

    row.addEventListener("click", ()=>{
      hideModal("choiceM");
      if(choiceResolver){
        const r=choiceResolver; choiceResolver=null;
        choiceDefaultValue=null;
        r(it.value);
      }
    }, {passive:true});

    if(it.card){
      bindLongPress(row, ()=> openViewer(it.card, it.viewerCtx||null), 620);
    }

    list.appendChild(row);
  }

  el.choiceBody.appendChild(list);
  showModal("choiceM");
  return new Promise((resolve)=>{ choiceResolver=resolve; });
}

async function askYesNo(title, message){
  const v=await askChoice(title, message, [
    {label:"はい", value:"Y"},
    {label:"いいえ", value:"N"},
  ], {defaultValue:"N"});
  return v==="Y";
}
async function showOk(title, message){
  await askChoice(title, message, [{label:"OK", value:"OK"}], {defaultValue:"OK"});
}

/* ---------------- GitHub image scan (kept) ---------------- */
const LS_REPO="mw_repo";
const LS_IMG_CACHE="mw_img_cache_v7";
function getRepo(){ return localStorage.getItem(LS_REPO) || "manpuku-taira/manpuku-world"; }
function setRepo(v){ localStorage.setItem(LS_REPO, v); }
function getCache(){ try{ return JSON.parse(localStorage.getItem(LS_IMG_CACHE) || "{}"); }catch{ return {}; } }
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

function pickBackFile(assetFiles){
  const lowers=assetFiles.map(n=>n.toLowerCase());
  const idx=lowers.findIndex(n=>n.startsWith("card_back"));
  return idx>=0 ? assetFiles[idx] : "";
}
function pickFieldFile(assetFiles){
  const lowers=assetFiles.map(n=>n.toLowerCase());
  const idx=lowers.findIndex(n=>n.startsWith("field."));
  return idx>=0 ? assetFiles[idx] : "";
}
function scoreCardFilename(name, no){
  const s=name.toLowerCase();
  const p2=pad2(no).toLowerCase();
  let score=0;
  if(s.startsWith(`${p2}_`)) score+=100;
  if(s.includes(`${p2}_`)) score+=30;
  if(s.includes(".png")) score+=5;
  if(s.includes(".jpg")) score+=5;
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
async function resolveBackUrl(cacheBackFile){
  const directCandidates=[
    "/assets/card_back.png.PNG",
    "/assets/card_back.png.png",
    "/assets/card_back.png",
    "/assets/card_back.PNG",
  ];
  if(cacheBackFile){
    const u=vercelPathAssets(cacheBackFile);
    if(await validateImage(u)) return u;
  }
  for(const u of directCandidates){
    if(await validateImage(u)) return u;
  }
  return "";
}
async function rescanImages(){
  state.img.ready=false;
  log("画像スキャン開始（GitHub）…");
  const cache={ repo:getRepo(), scannedAt:Date.now() };
  try{
    const [assetFiles, cardFiles]=await Promise.all([ ghList("assets"), ghList("assets/cards") ]);
    cache.assetFiles=assetFiles;
    cache.cardFiles=cardFiles;
    cache.fieldFile=pickFieldFile(assetFiles)||"";
    cache.backFile=pickBackFile(assetFiles)||"";
    cache.cardMap=buildCardMapFromFileList(cardFiles);
    setCache(cache);
    log("画像スキャン完了：適用します");
  }catch(err){
    setCache(cache);
    log(`GitHubスキャン失敗：${String(err.message||err)}（直接パスで復旧）`, "warn");
  }
  await applyImagesFromCache();
}
async function applyImagesFromCache(){
  const cache=getCache();

  state.img.fieldUrl="";
  if(cache.fieldFile){
    const u=vercelPathAssets(cache.fieldFile);
    if(await validateImage(u)) state.img.fieldUrl=u;
  }
  if(state.img.fieldUrl){
    el.fieldTop.style.backgroundImage=`url("${state.img.fieldUrl}")`;
    el.fieldBottom.style.backgroundImage=`url("${state.img.fieldUrl}")`;
  }else{
    el.fieldTop.style.backgroundImage="";
    el.fieldBottom.style.backgroundImage="";
  }

  state.img.backUrl = await resolveBackUrl(cache.backFile||"");

  state.img.cardUrlByNo={};
  const map=(cache.cardMap||{});
  for(const k of Object.keys(map)){
    state.img.cardUrlByNo[k]=vercelPathCards(map[k]);
  }

  const titleCandidates=["/assets/title.png","/assets/title.PNG"];
  for(const u of titleCandidates){
    if(await validateImage(u)){
      el.titleArt.style.backgroundImage=`url("${u}")`;
      break;
    }
  }

  state.img.ready=true;
  renderAll();
}

/* ---------------- Helpers / zones ---------------- */
function findEmptyIndex(arr){
  for(let i=0;i<arr.length;i++) if(!arr[i]) return i;
  return -1;
}
function removeByUid(arr, uid){
  const idx=arr.findIndex(x=>x && x.uid===uid);
  if(idx>=0) return arr.splice(idx,1)[0];
  return null;
}
function countShields(side){
  return state[side].shield.filter(Boolean).length;
}
function moveToWing(side, card){
  if(!card) return;
  state[side].wing.unshift(card);
}
function draw(side, n=1){
  const p=state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${sideName(side)}：デッキ切れ`, "warn");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}
function resetPerTurn(side){
  state.limits[side].handgataUsed=false;
  const p=state[side];
  for(const c of p.C){
    if(!c) continue;
    c.used.perTurn=false;
    c.flags.attackedCountThisTurn=0;
    c.flags.producerSavedThisTurn=false;
  }
}
function clearEndTurnTemps(side){
  const p=state[side];
  for(const c of p.C){
    if(!c) continue;
    c.tempAtk=0;
    c.flags.attackedCountThisTurn=0;
    c.flags.producerSavedThisTurn=false;
  }
}

/* ---------------- ATK / Equip ---------------- */
function findEquipInE(side, equipUid){
  const E=state[side].E;
  for(const it of E){
    if(it && it.uid===equipUid) return it;
  }
  return null;
}
function calcCurrentAtk(side, card){
  if(!card) return 0;
  let atk = card.baseAtk + (card.tempAtk||0);
  if(card.equipUid){
    const eq=findEquipInE(side, card.equipUid);
    if(eq){
      atk += (eq._equipBonus||0);
      atk += (eq._equipBonus2||0);
    }
  }
  return atk;
}

async function stripEquipIfAny(side, ch){
  if(!ch || !ch.equipUid) return;
  const p=state[side];
  const eq=findEquipInE(side, ch.equipUid);
  if(eq){
    const ePos=p.E.findIndex(x=>x && x.uid===eq.uid);
    if(ePos>=0) p.E[ePos]=null;
    eq.equippedToUid=null;
    moveToWing(side, eq);
    log(`装備剥がれ：${eq.name} → ${sideName(side)}ウィング`);
  }
  ch.equipUid=null;
}
async function sendCharacterToWing(side, pos){
  const p=state[side];
  const card=p.C[pos];
  if(!card) return;
  await stripEquipIfAny(side, card);
  p.C[pos]=null;
  moveToWing(side, card);
}

/* ---------------- Shields: break => hand (RULE) ---------------- */
function breakShieldToHand(defSide, idx, byName=""){
  const sh=state[defSide].shield[idx];
  if(!sh) return false;
  state[defSide].shield[idx]=null;
  state[defSide].hand.push(sh);
  log(`シールド破壊：${sideName(defSide)} シールド${idx+1} → 手札（${byName}）`);
  renderAll();
  return true;
}

/* ---------------- Turn rules: first turn no battle ---------------- */
function isFirstTurnNoBattleFor(side){
  return (state.turn===1 && side===state.firstSide);
}

/* ---------------- Hand limit (END) ---------------- */
async function enforceHandLimitEnd(side){
  const p=state[side];
  if(p.hand.length<=7) return;

  if(side!=="P1"){
    while(p.hand.length>7){
      const c=p.hand.pop();
      moveToWing(side, c);
      log(`AI：手札上限→ウィング ${c.name}`);
    }
    renderAll();
    return;
  }

  log("手札上限超過：7枚になるまで選んでウィングへ送ってください", "warn");
  while(p.hand.length>7){
    const items=p.hand.map((c,i)=>({
      label:c.name,
      sub:`No.${pad2(c.no)} / ${c.type.toUpperCase()}`,
      value:String(i),
      card:c
    }));
    const pick=await askChoice(
      "手札上限（7枚）",
      `現在：${p.hand.length}枚。ウィングへ送るカードを選んでください（残り${p.hand.length-7}枚）`,
      items,
      {defaultValue:"0"}
    );
    const idx=Math.max(0, Math.min(p.hand.length-1, Number(pick)));
    const moved=p.hand.splice(idx,1)[0];
    moveToWing("P1", moved);
    log(`手札→ウィング：${moved.name}`);
    renderAll();
  }
}

/* ---------------- Viewer ---------------- */
function openViewer(card, ctx){
  el.viewerTitle.textContent=card.name;
  const side = ctx?.side || state.activeSide;

  const lines=[];
  lines.push(card.name);
  lines.push(`RANK ${card.rank||0}`);
  if(isCharacter(card)){
    const cur=calcCurrentAtk(side, card);
    const plus=cur-(card.baseAtk||0);
    lines.push(`ATK ${card.baseAtk||0}${plus!==0?`（${plus>0?"+":""}${plus}）=> ${cur}`:""}`);
  }else{
    lines.push(`ATK ${card.baseAtk||0}`);
  }
  if(card.tags?.length) lines.push(`TAG: ${card.tags.join(" / ")}`);
  if(card.titleTag) lines.push(`TITLE: ${card.titleTag}`);
  lines.push("");
  lines.push(card.text||"");

  el.viewerText.textContent=lines.join("\n");
  el.viewerImg.src=state.img.cardUrlByNo[pad2(card.no)] || "";

  showModal("viewerM");
}

/* ---------------- UI rendering ---------------- */
function faceForCard(card, opts={}){
  const face=document.createElement("div");
  face.className="face";
  const url=state.img.cardUrlByNo[pad2(card.no)];
  if(url) face.style.backgroundImage=`url("${url}")`;
  else face.classList.add("fallback");
  if(opts.enemy) face.style.transform="rotate(180deg)";
  return face;
}
function makeSlot(card, ctx, opts={}){
  const slot=document.createElement("div");
  slot.className="slot";
  if(opts.glow) slot.classList.add("glow");
  if(opts.sel) slot.classList.add("sel");

  if(card){
    slot.appendChild(faceForCard(card, {enemy:!!opts.enemy}));

    if(isCharacter(card) && card.equipUid){
      const eb=document.createElement("div");
      eb.className="equipBadge";
      slot.appendChild(eb);
    }
    if(isCharacter(card)){
      const cur=calcCurrentAtk(ctx.side, card);
      const plus=cur-(card.baseAtk||0);
      const b=document.createElement("div");
      b.className="atkBadge"+(plus>0?" plus":"");
      b.textContent=`${cur}`;
      slot.appendChild(b);
    }

    bindLongPress(slot, ()=>openViewer(card, ctx), 620);
  }
  return slot;
}

function updateHUD(){
  el.chipTurn.textContent=`TURN ${state.turn}`;
  el.chipPhase.textContent=state.phase;
  el.chipActive.textContent=(state.activeSide==="P1") ? "YOUR TURN" : "ENEMY TURN";

  const isYour=(state.activeSide==="P1" && !state.gameOver);
  el.btnNext.disabled=!isYour;
  el.btnEnd.disabled=!isYour;
  el.btnNext.style.opacity=isYour?"1":".45";
  el.btnEnd.style.opacity=isYour?"1":".45";
}
function updateCounts(){
  el.aiDeckN.textContent=state.AI.deck.length;
  el.aiWingN.textContent=state.AI.wing.length;
  el.aiOutN.textContent=state.AI.outside.length;
  el.pDeckN.textContent=state.P1.deck.length;
  el.pWingN.textContent=state.P1.wing.length;
  el.pOutN.textContent=state.P1.outside.length;
  el.enemyHandLabel.textContent=`ENEMY HAND ×${state.AI.hand.length}`;
}
function renderDirectHints(){
  el.pDirectHint.classList.toggle("show", countShields("P1")===0);
  el.aiDirectHint.classList.toggle("show", countShields("AI")===0);
}
function renderZones(){
  el.aiE.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.AI.E[i];
    el.aiE.appendChild(makeSlot(c,{side:"AI",zone:"E",pos:i},{enemy:true}));
  }
  el.aiC.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.AI.C[i];
    el.aiC.appendChild(makeSlot(c,{side:"AI",zone:"C",pos:i},{enemy:true}));
  }

  el.pC.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.P1.C[i];
    const glow=(state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot=makeSlot(c,{side:"P1",zone:"C",pos:i},{glow});
    slot.addEventListener("click", ()=> onClickYourC(i), {passive:true});
    el.pC.appendChild(slot);
  }

  el.pE.innerHTML="";
  for(let i=0;i<3;i++){
    const c=state.P1.E[i];
    const glow=(state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null && !c);
    const slot=makeSlot(c,{side:"P1",zone:"E",pos:i},{glow});
    slot.addEventListener("click", ()=> onClickYourE(i), {passive:true});
    el.pE.appendChild(slot);
  }
}
function renderHand(){
  el.hand.innerHTML="";
  for(let i=0;i<state.P1.hand.length;i++){
    const c=state.P1.hand[i];
    const h=document.createElement("div");
    h.className="handCard";
    const playable=(state.activeSide==="P1" && state.phase==="MAIN" && !state.gameOver);
    if(playable) h.classList.add("glow");
    if(state.selectedHandIndex===i) h.classList.add("sel");
    const url=state.img.cardUrlByNo[pad2(c.no)];
    if(url) h.style.backgroundImage=`url("${url}")`;

    h.addEventListener("click", ()=>{
      if(state.activeSide!=="P1" || state.gameOver) return;
      state.selectedHandIndex = (state.selectedHandIndex===i)?null:i;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=>openViewer(c,{side:"P1",zone:"HAND",pos:i}), 620);
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
}
function renderShields(){
  document.querySelectorAll(".shieldSlot").forEach((slot)=>{
    const side=slot.getAttribute("data-side");
    const idx=Number(slot.getAttribute("data-idx")||"0");
    const cardNode=slot.querySelector(".shieldCard");
    const sh=state[side].shield[idx];
    const exists=!!sh;
    cardNode.classList.toggle("empty", !exists);
    if(exists && state.img.backUrl){
      cardNode.style.backgroundImage=`url("${state.img.backUrl}")`;
    }else{
      cardNode.style.backgroundImage="";
    }
  });
  document.querySelectorAll(".shieldSlot").forEach((slot)=>{
    slot.onclick=null;
    slot.addEventListener("click", ()=>{
      const side=slot.getAttribute("data-side");
      const idx=Number(slot.getAttribute("data-idx")||"0");
      onShieldClicked(side, idx);
    }, {passive:true});
  });
}
function renderPiles(){
  document.querySelectorAll(".pileCard.deckBack").forEach((n)=>{
    if(state.img.backUrl) n.style.backgroundImage=`url("${state.img.backUrl}")`;
    else n.style.backgroundImage="";
  });
}
function renderAll(){
  updateHUD();
  updateCounts();
  renderDirectHints();
  renderZones();
  renderHand();
  renderEnemyHand();
  renderShields();
  renderPiles();
}

/* ---------------- Start game ---------------- */
function startGame(){
  state.gameOver=false;
  state.turn=1;
  state.phase="START";
  state.normalSummonUsed=false;
  state.selectedHandIndex=null;
  state.battle={attackerSide:null,attackerPos:null,attackerUid:null};

  state.P1.deck=buildDeck();
  state.AI.deck=buildDeck();

  state.P1.shield=[state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield=[state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  state.P1.hand=[]; state.AI.hand=[];
  draw("P1",4); draw("AI",4);

  state.P1.C=[null,null,null]; state.P1.E=[null,null,null];
  state.AI.C=[null,null,null]; state.AI.E=[null,null,null];
  state.P1.wing=[]; state.AI.wing=[];
  state.P1.outside=[]; state.AI.outside=[];

  resetPerTurn("P1"); resetPerTurn("AI");

  state.firstSide=(Math.random()<0.5)?"P1":"AI";
  state.activeSide=state.firstSide;

  el.firstInfo.textContent=(state.firstSide==="P1")?"先攻：あなた":"先攻：相手";
  log(`ゲーム開始：初手4 / シールド3 / ${el.firstInfo.textContent}`);

  renderAll();

  if(state.activeSide==="AI"){
    (async ()=>{
      await aiTakeTurnSafe();
      state.activeSide="P1";
      state.turn=2;
      state.phase="START";
      resetPerTurn("P1");
      log(`TURN ${state.turn} あなたのターン`);
      renderAll();
    })();
  }
}

/* =========================================================
   チェーン（記憶抹消 / 手形）
   - 記憶抹消：無効化した「元カード」をウィングへ送る（発動元に依存しない）
   - 記憶抹消（発動したカード自体）は解決後に必ずウィングへ
========================================================= */
function hasHandgataOnField(side){
  return state[side].C.some(c=>c && c.no===8);
}
function hasMemoryEraseInHand(side){
  return state[side].hand.some(c=>c && c.no===14);
}
function takeMemoryEraseFromHand(side){
  const p=state[side];
  const idx=p.hand.findIndex(c=>c && c.no===14);
  if(idx<0) return null;
  return p.hand.splice(idx,1)[0];
}
function canUseHandgata(side){
  return hasHandgataOnField(side) && !state.limits[side].handgataUsed;
}
function canUseMemoryErase(side){
  return hasMemoryEraseInHand(side);
}
function buildChainText(chain){
  const lines=["【チェーン】"];
  chain.forEach((x,i)=> lines.push(`CH${i+1}：${sideName(x.side)} → ${x.name}`));
  return lines.join("\n");
}

/**
 * activateWithChain(ctx, resolveFn)
 * ctx: { sourceSide, sourceZone, sourcePos, sourceCard, label }
 * resolveFn: async ()=> void  (効果本体)
 */
async function activateWithChain(ctx, resolveFn){
  // チェーン構築：相手の「記憶抹消（手札）」、場の「手形」も可能
  const chain=[{side:ctx.sourceSide, kind:"ACT", name:ctx.label}];
  let negateCount=0;
  let lastEffectiveNegator=null; // {side, kind:"MEMORY"|"HANDGATA"}
  const pendingMemoryEraseToWing=[]; // {side, card}  発動した記憶抹消は必ずウィングへ

  let currentSide=ctx.sourceSide;

  // 最大安全回数（無限ループ防止）
  for(let guard=0; guard<12; guard++){
    const responder=opponent(currentSide);
    const canH=canUseHandgata(responder);
    const canM=canUseMemoryErase(responder);
    if(!canH && !canM) break;

    // 先にプレイヤーに選ばせる／AIは最適寄り
    if(responder==="P1"){
      const items=[];
      if(canH) items.push({label:"手形で無効（1ターンに1度）", value:"HANDGATA"});
      if(canM) items.push({label:"記憶抹消で無効（無効化+元カードをウィング）", value:"MEMORY"});
      items.push({label:"何もしない", value:"NO"});

      const v=await askChoice(
        "チェーン（無効化）",
        `${buildChainText(chain)}\n\n相手の発動に反応しますか？`,
        items,
        {defaultValue:"NO"}
      );

      if(v==="NO" || v==="__CANCEL__") break;

      if(v==="HANDGATA"){
        state.limits.P1.handgataUsed=true;
        negateCount++;
        lastEffectiveNegator={side:"P1", kind:"HANDGATA"};
        chain.push({side:"P1", kind:"NEG", name:"手形（無効化）"});
        log(`チェーン：CH${chain.length} 手形（無効化）`);
        renderAll();
        currentSide="P1";
        continue;
      }

      if(v==="MEMORY"){
        const me=takeMemoryEraseFromHand("P1");
        if(!me) break;
        pendingMemoryEraseToWing.push({side:"P1", card:me});
        negateCount++;
        lastEffectiveNegator={side:"P1", kind:"MEMORY"};
        chain.push({side:"P1", kind:"NEG", name:"記憶抹消（無効化）"});
        log(`チェーン：CH${chain.length} 記憶抹消（無効化）`);
        renderAll();
        currentSide="P1";
        continue;
      }

      break;
    }

    if(responder==="AI"){
      // AI優先：まず記憶抹消、次に手形
      if(canM){
        const me=takeMemoryEraseFromHand("AI");
        if(me){
          pendingMemoryEraseToWing.push({side:"AI", card:me});
          negateCount++;
          lastEffectiveNegator={side:"AI", kind:"MEMORY"};
          chain.push({side:"AI", kind:"NEG", name:"記憶抹消（無効化）"});
          log(`チェーン：CH${chain.length} AI 記憶抹消（無効化）`);
          renderAll();
          currentSide="AI";
          continue;
        }
      }
      if(canH){
        state.limits.AI.handgataUsed=true;
        negateCount++;
        lastEffectiveNegator={side:"AI", kind:"HANDGATA"};
        chain.push({side:"AI", kind:"NEG", name:"手形（無効化）"});
        log(`チェーン：CH${chain.length} AI 手形（無効化）`);
        renderAll();
        currentSide="AI";
        continue;
      }
      break;
    }
  }

  const negated = (negateCount%2===1);

  // 発動した記憶抹消カードは、チェーン解決後に必ずウィングへ（無効化されても“発動カード”なので送る）
  // ただし、これは「記憶抹消カードそのもの」の移動であり、
  // 「元カードをウィングへ」は “最後に有効だった無効化が記憶抹消の場合のみ” 発生する。
  if(negated){
    if(lastEffectiveNegator?.kind==="MEMORY"){
      log(`チェーン結果：発動は無効（記憶抹消）`, "warn");
    }else{
      log(`チェーン結果：発動は無効（手形）`, "warn");
    }
  }else if(negateCount>0){
    log(`チェーン結果：発動は通る（無効化 ${negateCount} 回）`);
  }

  // 効果本体
  if(!negated){
    await resolveFn();
  }else{
    // 無効化された場合：記憶抹消が最後に効いているなら「元カードをウィングへ」
    if(lastEffectiveNegator?.kind==="MEMORY"){
      await sendSourceCardToWing(ctx);
    }
  }

  // 発動した記憶抹消カードをウィングへ
  for(const x of pendingMemoryEraseToWing){
    moveToWing(x.side, x.card);
    log(`記憶抹消：発動カード → ${sideName(x.side)}ウィング（解決後）`);
  }
  renderAll();

  return {negated, lastEffectiveNegator};
}

async function sendSourceCardToWing(ctx){
  // ctx.sourceCard を、発動元に応じてウィングへ
  const s=ctx.sourceSide;
  const p=state[s];

  if(ctx.sourceZone==="HAND"){
    const removed = removeByUid(p.hand, ctx.sourceCard.uid);
    if(removed){
      moveToWing(s, removed);
      log(`記憶抹消：無効化されたカード（手札）→ ${sideName(s)}ウィング`);
    }
    return;
  }

  if(ctx.sourceZone==="C"){
    const pos=ctx.sourcePos;
    // 念のため一致確認
    if(p.C[pos] && p.C[pos].uid===ctx.sourceCard.uid){
      await sendCharacterToWing(s, pos);
      log(`記憶抹消：無効化されたカード（C）→ ${sideName(s)}ウィング`);
    }
    return;
  }

  if(ctx.sourceZone==="E"){
    const pos=ctx.sourcePos;
    if(p.E[pos] && p.E[pos].uid===ctx.sourceCard.uid){
      const removed=p.E[pos];
      p.E[pos]=null;
      moveToWing(s, removed);
      log(`記憶抹消：無効化されたカード（E）→ ${sideName(s)}ウィング`);
    }
    return;
  }
}

/* ---------------- Search helpers (FIXED) ---------------- */
function poolDeckWingByTag(side, tag){
  const p=state[side];
  const res=[];
  for(const c of p.deck) if(c && c.tags.includes(tag)) res.push({src:"deck", uid:c.uid, c});
  for(const c of p.wing) if(c && c.tags.includes(tag)) res.push({src:"wing", uid:c.uid, c});
  return res;
}
function pullFromDeckOrWing(side, src, uid){
  const p=state[side];
  if(src==="deck") return removeByUid(p.deck, uid);
  if(src==="wing") return removeByUid(p.wing, uid);
  return null;
}

async function searchTagToHand(side, tag, count=1, opt={}){
  const p=state[side];

  for(let k=0;k<count;k++){
    const pool=poolDeckWingByTag(side, tag);

    if(!pool.length){
      log(`サーチ失敗：タグ「${tag}」がデッキ・ウィングにありません`, "warn");
      if(side==="P1"){
        await showOk("サーチ失敗", `デッキ・ウィングにタグ「${tag}」がありません。\nシールドにある可能性があります。`);
      }
      return false;
    }

    if(side==="AI" || opt.aiAuto){
      // AIは最初の1枚（デッキ優先）を取る
      const pick = pool.find(x=>x.src==="deck") || pool[0];
      const moved = pullFromDeckOrWing(side, pick.src, pick.uid);
      if(moved){
        p.hand.push(moved);
        log(`AI：サーチ成功（${tag}）→手札 ${moved.name}`);
      }
      continue;
    }

    const items=pool.map(x=>({
      label:x.c.name,
      sub:`${x.src.toUpperCase()} / TAG:${tag}`,
      value:`${x.src}:${x.uid}`,
      card:x.c
    }));
    const v=await askChoice("サーチ", `タグ「${tag}」を手札に加える（${k+1}/${count}）`, items, {defaultValue:"__CANCEL__"});
    if(v==="__CANCEL__") return false;

    const [src, uid]=String(v).split(":");
    const moved=pullFromDeckOrWing(side, src, uid);

    // ★ここが最重要：必ず手札に入る（今回の不具合の根）
    if(moved){
      p.hand.push(moved);
      log(`サーチ成功：${moved.name} → 手札`);
    }else{
      log("サーチ失敗：選択したカードが見つかりません（同期ズレ）", "warn");
      if(side==="P1") await showOk("サーチ失敗", "選択したカードが見つかりませんでした。リロード後に再テストしてください。");
      return false;
    }
  }

  renderAll();
  return true;
}

/* ---------------- Enter triggers ---------------- */
async function onEnterTriggers(side, zone, pos, card){
  // ラウス（登場時サーチ）
  if(card.no===4 && zone==="C"){
    if(side==="P1"){
      const yes = await askYesNo("効果確認", "聖ラウスの効果を使用しますか？（クランプスをサーチ）");
      if(!yes) return;

      await activateWithChain(
        {sourceSide:side, sourceZone:"C", sourcePos:pos, sourceCard:card, label:`発動：${card.name}（登場時サーチ）`},
        async ()=>{
          // ★FIX：選択→即手札（デッキ/ウィングから抜く）
          await searchTagToHand("P1", "クランプス", 1);
        }
      );
      return;
    }

    // AIは自動使用
    await activateWithChain(
      {sourceSide:side, sourceZone:"C", sourcePos:pos, sourceCard:card, label:`発動：${card.name}（登場時サーチ）`},
      async ()=>{
        await searchTagToHand("AI", "クランプス", 1, {aiAuto:true});
      }
    );
    return;
  }

  // タータ（登場時2ドロー）
  if(card.no===5 && zone==="C"){
    await activateWithChain(
      {sourceSide:side, sourceZone:"C", sourcePos:pos, sourceCard:card, label:`発動：${card.name}（登場時ドロー）`},
      async ()=>{
        draw(side, 2);
        log(`${sideName(side)}：タータ登場→2ドロー`);
      }
    );
    return;
  }

  // 司令（登場時装備誘導）
  if(card.no===11 && zone==="C"){
    const p=state[side];
    const hasOther=p.C.some(x=>x && x.uid!==card.uid);
    if(!hasOther) return;

    await activateWithChain(
      {sourceSide:side, sourceZone:"C", sourcePos:pos, sourceCard:card, label:`発動：${card.name}（登場時装備）`},
      async ()=>{
        await equipCommanderAsItem(side, pos);
      }
    );
    return;
  }
}

/* ---------------- Equip logic ---------------- */
async function equipItemCardFromHand(side, handIdx){
  const p=state[side];
  const card=p.hand[handIdx];
  if(!card || !isItem(card)) return false;

  // 対象キャラ選択
  const targets=p.C.map((c,i)=>({c,i})).filter(x=>x.c);
  if(!targets.length){
    log("装備先がいません", "warn");
    if(side==="P1") await showOk("装備できません", "ステージにキャラクターがいません。");
    return false;
  }

  let pickIdx=targets[0].i;
  if(side==="P1"){
    const v=await askChoice(
      "装備先を選択",
      "装備するキャラクターを選んでください。",
      targets.map(x=>({
        label:`C${x.i+1}：${x.c.name}`,
        sub:`ATK ${calcCurrentAtk(side, x.c)}`,
        value:String(x.i),
        card:x.c
      })),
      {defaultValue:String(targets[0].i)}
    );
    if(v==="__CANCEL__") return false;
    pickIdx=Number(v);
  }else{
    targets.sort((a,b)=> calcCurrentAtk(side,b.c)-calcCurrentAtk(side,a.c));
    pickIdx=targets[0].i;
  }

  const host=p.C[pickIdx];
  if(!host) return false;

  const ePos=findEmptyIndex(p.E);
  if(ePos<0){
    log("Eに空きがないため装備できません", "warn");
    if(side==="P1") await showOk("装備できません", "E（エフェクト/アイテム枠）に空きがありません。");
    return false;
  }

  // 既存装備があれば剥がす
  if(host.equipUid){
    const old=findEquipInE(side, host.equipUid);
    if(old){
      const oldPos=p.E.findIndex(x=>x && x.uid===old.uid);
      if(oldPos>=0) p.E[oldPos]=null;
      moveToWing(side, old);
      log(`装備更新：旧装備→ウィング ${old.name}`);
    }
    host.equipUid=null;
  }

  // 手札からEへ配置
  const moved=p.hand.splice(handIdx,1)[0];
  p.E[ePos]=moved;
  moved.equippedToUid=host.uid;

  // 基本ボーナス
  moved._equipBonus=500; moved._equipBonus2=0;

  // 例外：No.20 普通の棒は+300
  if(moved.no===20){ moved._equipBonus=300; moved._equipBonus2=0; }

  // 例外：No.18 a-xブラスター 射手なら追加+500
  if(moved.no===18 && host.tags.includes("射手")){
    moved._equipBonus=500;
    moved._equipBonus2=500;
  }

  // 例外：No.19 アロングダイト 勇者/剣士なら追加+500
  if(moved.no===19 && (host.tags.includes("勇者") || host.tags.includes("剣士"))){
    moved._equipBonus=500;
    moved._equipBonus2=500;
  }

  host.equipUid=moved.uid;

  log(`装備：${moved.name} → ${host.name}`);
  renderAll();
  return true;
}

async function equipCommanderAsItem(side, commanderPos){
  const p=state[side];
  const commander=p.C[commanderPos];
  if(!commander || commander.no!==11) return;

  const targets=p.C.map((c,i)=>({c,i})).filter(x=>x.c && x.i!==commanderPos);
  if(!targets.length){
    log("司令：装備対象がいません", "warn");
    return;
  }

  if(side==="P1"){
    const ok=await askYesNo("司令（登場時）", "司令をアイテム扱いとして装備しますか？（ATK+500）");
    if(!ok){
      log("司令：装備しませんでした");
      return;
    }
  }

  const ePos=findEmptyIndex(p.E);
  if(ePos<0){
    log("司令：Eに空きがないため装備できません", "warn");
    if(side==="P1") await showOk("装備できません", "E（エフェクト/アイテム枠）に空きがありません。");
    return;
  }

  let pickIdx=targets[0].i;
  if(side==="P1"){
    const v=await askChoice(
      "装備先を選択",
      "装備するキャラクターを選んでください。",
      targets.map(x=>({
        label:`C${x.i+1}：${x.c.name}`,
        sub:`ATK ${calcCurrentAtk(side, x.c)}`,
        value:String(x.i),
        card:x.c
      })),
      {defaultValue:String(targets[0].i)}
    );
    if(v==="__CANCEL__") return;
    pickIdx=Number(v);
  }else{
    targets.sort((a,b)=> calcCurrentAtk(side,b.c)-calcCurrentAtk(side,a.c));
    pickIdx=targets[0].i;
  }

  const host=p.C[pickIdx];
  if(!host) return;

  // 既存装備剥がし
  if(host.equipUid){
    const old=findEquipInE(side, host.equipUid);
    if(old){
      const oldPos=p.E.findIndex(x=>x && x.uid===old.uid);
      if(oldPos>=0) p.E[oldPos]=null;
      moveToWing(side, old);
      log(`装備更新：旧装備→ウィング ${old.name}`);
    }
    host.equipUid=null;
  }

  // 司令をC→Eへ移動（装備カード化）
  p.C[commanderPos]=null;
  p.E[ePos]=commander;
  commander._equipBonus=500;
  commander._equipBonus2=0;
  commander.equippedToUid=host.uid;
  host.equipUid=commander.uid;

  log(`司令：${commander.name} → ${host.name} に装備（ATK+500）`);
  renderAll();
}

/* ---------------- Your actions (MAIN / BATTLE) ---------------- */
async function onClickYourC(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;

  if(state.phase==="BATTLE"){
    if(isFirstTurnNoBattleFor("P1")){
      log("先行1ターン目はバトルできません", "warn");
      return;
    }
    const c=state.P1.C[pos];
    if(!c) return;
    await playerSelectAttacker(pos);
    return;
  }

  if(state.phase!=="MAIN") return;

  // 召喚
  if(state.P1.C[pos]) return;
  if(state.selectedHandIndex==null) return;

  const card=state.P1.hand[state.selectedHandIndex];
  if(!isCharacter(card)){
    log("Cにはキャラクターのみ置けます", "warn");
    return;
  }

  state.P1.C[pos]=card;
  state.P1.hand.splice(state.selectedHandIndex,1);
  state.selectedHandIndex=null;
  log(`登場：${card.name}`);
  renderAll();

  await onEnterTriggers("P1","C",pos,card);
}

async function onClickYourE(pos){
  if(state.activeSide!=="P1" || state.gameOver) return;
  if(state.phase!=="MAIN") return;

  // ここでは“手札のアイテム/エフェクト”は直接置かず、手札選択→装備/発動に寄せる方が事故が少ない
  // 既存UIに合わせ、E枠クリックは何もしない（安全）
  log("E枠へ直接配置は無効です。手札のアイテム/エフェクトを選択して発動してください。", "warn");
}

async function onShieldClicked(side, idx){
  // プレイヤーはシールド中身は見ない（操作なし）
  // ここでは何もしない
  return;
}

/* ---------------- Player: use selected hand card ---------------- */
async function playerUseSelectedHandCard(){
  if(state.activeSide!=="P1" || state.phase!=="MAIN" || state.gameOver) return;
  if(state.selectedHandIndex==null) return;

  const p=state.P1;
  const card=p.hand[state.selectedHandIndex];
  if(!card) return;

  // アイテムは装備処理
  if(isItem(card)){
    // チェーンに乗る「発動」
    const ctx={sourceSide:"P1", sourceZone:"HAND", sourcePos:state.selectedHandIndex, sourceCard:card, label:`発動：${card.name}（装備）`};
    await activateWithChain(ctx, async ()=>{
      // 実際の装備
      await equipItemCardFromHand("P1", state.selectedHandIndex);
      state.selectedHandIndex=null;
    });
    renderAll();
    return;
  }

  // エフェクトは本作では簡易：条件を満たすなら解決、満たさないなら弾く
  if(isEffect(card)){
    const ctx={sourceSide:"P1", sourceZone:"HAND", sourcePos:state.selectedHandIndex, sourceCard:card, label:`発動：${card.name}`};
    await activateWithChain(ctx, async ()=>{
      const ok = await resolveEffectFromHand("P1", state.selectedHandIndex);
      if(ok) state.selectedHandIndex=null;
    });
    renderAll();
    return;
  }

  // キャラは場に置く必要があるのでここでは何もしない
  log("キャラクターはステージ（C枠）に登場させてください。", "warn");
}

async function resolveEffectFromHand(side, handIdx){
  const p=state[side];
  const card=p.hand[handIdx];
  if(!card || !isEffect(card)) return false;

  // No.2 黒魔法-フレイムバレット：クルエラがいる時のみ
  if(card.no===2){
    const hasCruella = state[side].C.some(c=>c && c.no===1);
    if(!hasCruella){
      if(side==="P1") await showOk("発動できません", "自分ステージに「クルエラ」がいないため発動できません。");
      return false;
    }

    // 対象選択（相手のC）
    const opp=opponent(side);
    const enemies=state[opp].C.map((c,i)=>({c,i})).filter(x=>x.c);
    if(!enemies.length){
      if(side==="P1") await showOk("対象なし", "相手ステージにキャラクターがいません。");
      return false;
    }

    // モード選択
    let mode="HIGH";
    if(side==="P1"){
      const v=await askChoice("フレイムバレット", "効果を選んでください。", [
        {label:"相手ステージのATKが1番高いキャラクター1体をウィングへ", value:"HIGH"},
        {label:"相手ステージのrank4以下をすべてウィングへ", value:"R4"},
      ], {defaultValue:"HIGH"});
      if(v==="__CANCEL__") return false;
      mode=v;
    }else{
      mode="HIGH";
    }

    if(mode==="HIGH"){
      enemies.sort((a,b)=> calcCurrentAtk(opp,b.c)-calcCurrentAtk(opp,a.c));
      const t=enemies[0];
      await sendCharacterToWing(opp, t.i);
      log(`フレイムバレット：${sideName(opp)} ${t.c.name} → ウィング`);
    }else{
      for(const t of enemies){
        if((t.c.rank||0)<=4){
          await sendCharacterToWing(opp, t.i);
          log(`フレイムバレット：${sideName(opp)} ${t.c.name} → ウィング`);
        }
      }
    }

    // エフェクト自体は解決後にウィングへ
    const used=p.hand.splice(handIdx,1)[0];
    moveToWing(side, used);
    log(`${sideName(side)}：エフェクト解決 → ウィング ${used.name}`);
    return true;
  }

  // No.15 闘：バトル時専用（ここでは弾く）
  if(card.no===15){
    if(side==="P1") await showOk("発動できません", "このカードはバトル時にのみ発動できます。");
    return false;
  }

  // No.16 力こそパワー：自分ターンのみ
  if(card.no===16){
    if(state.activeSide!==side){
      if(side==="P1") await showOk("発動できません", "自分ターンにのみ発動できます。");
      return false;
    }
    const opp=opponent(side);
    const enemies=state[opp].C.map((c,i)=>({c,i})).filter(x=>x.c);
    if(!enemies.length){
      if(side==="P1") await showOk("対象なし", "相手ステージにキャラクターがいません。");
      return false;
    }
    enemies.sort((a,b)=> calcCurrentAtk(opp,a.c)-calcCurrentAtk(opp,b.c));
    const t=enemies[0];
    await sendCharacterToWing(opp, t.i);
    log(`力こそパワー！！：${sideName(opp)} ${t.c.name} → ウィング`);

    const used=p.hand.splice(handIdx,1)[0];
    moveToWing(side, used);
    log(`${sideName(side)}：エフェクト解決 → ウィング ${used.name}`);
    return true;
  }

  // その他未実装：安全にウィングへ送らない（誤作動防止）
  if(side==="P1") await showOk("未実装", "このエフェクトの処理は未実装です。");
  return false;
}

/* ---------------- Battle (Player) ---------------- */
async function playerSelectAttacker(pos){
  const c=state.P1.C[pos];
  if(!c) return;

  // まひるの2回攻撃（装備時）を簡易対応
  const maxAttacks = (c.no===7 && c.equipUid) ? 2 : 1;
  if(c.flags.attackedCountThisTurn >= maxAttacks){
    log("このキャラクターはこのターンすでに攻撃回数上限です", "warn");
    return;
  }

  // 対象選択：相手C or シールド
  const opp="AI";
  const enemies=state.AI.C.map((x,i)=>({x,i})).filter(t=>t.x);
  const shields=countShields("AI");

  const items=[];
  for(const t of enemies){
    items.push({
      label:`相手C${t.i+1}：${t.x.name}`,
      sub:`ATK ${calcCurrentAtk("AI", t.x)}`,
      value:`C:${t.i}`,
      card:t.x
    });
  }
  if(shields>0){
    items.push({label:`シールドを攻撃（残り${shields}）`, value:"S", sub:"破壊されたシールドは相手手札へ"});
  }else{
    // 直接攻撃（ただし、まひるは直接不可）
    if(c.no===7){
      items.push({label:"直接攻撃（不可：まひる）", value:"DNG", sub:"このカードは直接攻撃できません"});
    }else{
      items.push({label:"直接攻撃（勝利）", value:"D", sub:"相手のシールドが0枚の場合"});
    }
  }

  const pick=await askChoice("攻撃先", "攻撃先を選んでください。", items, {defaultValue:items[0]?.value||"__CANCEL__"});
  if(pick==="__CANCEL__") return;
  if(pick==="DNG"){ log("まひるは直接攻撃できません", "warn"); return; }

  await resolveBattleAttack("P1", pos, pick);
}

async function resolveBattleAttack(attSide, attPos, pick){
  const defSide=opponent(attSide);
  const A=state[attSide].C[attPos];
  if(!A) return;

  // 先行1ターン目は攻撃禁止（シールド含む）
  if(isFirstTurnNoBattleFor(attSide)){
    log("先行1ターン目はバトルできません", "warn");
    return;
  }

  const atkA=calcCurrentAtk(attSide, A);

  // 直接攻撃
  if(pick==="D"){
    endGame(attSide);
    return;
  }

  // シールド攻撃
  if(pick==="S"){
    // 最初の残っているシールドを破壊
    const idx = state[defSide].shield.findIndex(Boolean);
    if(idx<0) return;
    breakShieldToHand(defSide, idx, A.name);
    A.flags.attackedCountThisTurn++;
    renderAll();
    return;
  }

  // キャラ攻撃
  if(String(pick).startsWith("C:")){
    const defPos=Number(String(pick).split(":")[1]);
    const D=state[defSide].C[defPos];
    if(!D) return;

    const atkD=calcCurrentAtk(defSide, D);

    // 班目プロデューサー：1ターン1度バトル破壊されない
    if(D.no===12 && !D.flags.producerSavedThisTurn){
      D.flags.producerSavedThisTurn=true;
      log(`班目プロデューサー：バトル破壊を無効（1ターンに1度）`, "warn");
      A.flags.attackedCountThisTurn++;
      renderAll();
      return;
    }

    if(atkA>atkD){
      await sendCharacterToWing(defSide, defPos);
      log(`バトル：${A.name}（${atkA}）が ${D.name}（${atkD}）を撃破`);
    }else if(atkA<atkD){
      await sendCharacterToWing(attSide, attPos);
      log(`バトル：${A.name}（${atkA}）が ${D.name}（${atkD}）に敗北`);
    }else{
      await sendCharacterToWing(attSide, attPos);
      await sendCharacterToWing(defSide, defPos);
      log(`バトル：相打ち（${A.name} / ${D.name}）`);
    }

    A.flags.attackedCountThisTurn++;
    renderAll();
    return;
  }
}

/* ---------------- End game ---------------- */
function endGame(winnerSide){
  state.gameOver=true;
  el.resultText.textContent = (winnerSide==="P1") ? "WIN" : "LOSE";
  showModal("resultM");
}

/* ---------------- Phase flow ---------------- */
async function nextPhase(){
  if(state.gameOver) return;

  const i=PHASES.indexOf(state.phase);
  const next=PHASES[(i+1)%PHASES.length];

  // 先行1ターン目はBATTLEへ進まない
  if(next==="BATTLE" && isFirstTurnNoBattleFor(state.activeSide)){
    log("先行1ターン目はバトルできません（BATTLEスキップ）", "warn");
    state.phase="END";
    await enforceHandLimitEnd(state.activeSide);
    clearEndTurnTemps(state.activeSide);
    renderAll();
    return;
  }

  state.phase=next;

  if(next==="START"){
    state.normalSummonUsed=false;
    state.selectedHandIndex=null;
    state.battle={attackerSide:null,attackerPos:null,attackerUid:null};
    resetPerTurn(state.activeSide);
  }
  if(next==="DRAW"){
    draw(state.activeSide,1);
    log(`${sideName(state.activeSide)}：ドロー +1`);
  }
  if(next==="END"){
    await enforceHandLimitEnd(state.activeSide);
    clearEndTurnTemps(state.activeSide);
  }

  renderAll();
}

async function endTurn(){
  if(state.gameOver) return;

  // END処理を先に
  await enforceHandLimitEnd(state.activeSide);
  clearEndTurnTemps(state.activeSide);

  if(state.activeSide==="P1"){
    // AIターンへ
    state.activeSide="AI";
    state.phase="START";
    resetPerTurn("AI");
    renderAll();

    await aiTakeTurnSafe();

    // 次ターンあなたへ
    state.activeSide="P1";
    state.turn++;
    state.phase="START";
    resetPerTurn("P1");
    log(`TURN ${state.turn} あなたのターン`);
    renderAll();
  }
}

/* =========================================================
   AI (FIX: never freeze)
   - MAINで可能な範囲で最適寄りに行動
   - 不利なら無理に攻撃しない（ご主人様仕様）
========================================================= */
async function aiTakeTurnSafe(){
  try{
    await aiTakeTurn();
  }catch(err){
    log(`AIターン例外：${String(err?.message||err)}`, "warn");
    // 例外が起きても必ずターンを終える
  }finally{
    // AIのEND処理
    await enforceHandLimitEnd("AI");
    clearEndTurnTemps("AI");
    renderAll();
  }
}

async function aiTakeTurn(){
  if(state.gameOver) return;

  // START
  state.phase="START";
  renderAll();
  await sleep(200);

  // DRAW
  state.phase="DRAW";
  draw("AI",1);
  log("AI：ドロー +1");
  renderAll();
  await sleep(200);

  // MAIN
  state.phase="MAIN";
  renderAll();
  await sleep(200);

  // 1) 召喚：手札からATK高いキャラを空きCへ
  await aiMainSummonBest();
  await sleep(150);

  // 2) アイテム：手札からアイテムがあれば最も強い味方に装備
  await aiMainEquipBest();
  await sleep(150);

  // 3) 起動効果：簡易（ニコラ/クルエラ/エフィなどは未自動に近い）→まず停止しないこと優先
  // （必要になったらAI用に個別最適化します）

  // BATTLE（先行1ターン目は不可）
  if(!isFirstTurnNoBattleFor("AI")){
    state.phase="BATTLE";
    renderAll();
    await sleep(200);

    await aiBattleStep();
  }else{
    log("AI：先行1ターン目のためバトルなし");
  }

  // END
  state.phase="END";
  renderAll();
  await sleep(150);

  // ここでreturn（finallyで上限処理）
}

async function aiMainSummonBest(){
  const p=state.AI;
  const empty=findEmptyIndex(p.C);
  if(empty<0) return;

  // キャラのみ
  const chars=p.hand.map((c,i)=>({c,i})).filter(x=>x.c && isCharacter(x.c));
  if(!chars.length) return;

  // ATK高い順
  chars.sort((a,b)=> (b.c.baseAtk||0)-(a.c.baseAtk||0));
  const pick=chars[0];

  p.C[empty]=pick.c;
  p.hand.splice(pick.i,1);
  log(`AI：登場 ${pick.c.name}`);
  renderAll();

  await onEnterTriggers("AI","C",empty,pick.c);
}

async function aiMainEquipBest(){
  const p=state.AI;
  const items=p.hand.map((c,i)=>({c,i})).filter(x=>x.c && isItem(x.c));
  if(!items.length) return;

  const targets=p.C.map((c,i)=>({c,i})).filter(x=>x.c);
  if(!targets.length) return;

  // 最もATKの高いキャラに装備
  targets.sort((a,b)=> calcCurrentAtk("AI",b.c)-calcCurrentAtk("AI",a.c));
  const host=targets[0];

  const ePos=findEmptyIndex(p.E);
  if(ePos<0) return;

  // 最も強いアイテム（期待値：基本+500、棒+300）を選ぶ
  items.sort((a,b)=> scoreItem(b.c)-scoreItem(a.c));
  const pick=items[0];

  // チェーンに乗る「発動：装備」
  const ctx={sourceSide:"AI", sourceZone:"HAND", sourcePos:pick.i, sourceCard:pick.c, label:`発動：${pick.c.name}（装備）`};
  await activateWithChain(ctx, async ()=>{
    // AIは自動で装備：手札から抜き、Eへ置き、hostへ紐づけ
    const moved=p.hand.splice(pick.i,1)[0];
    p.E[ePos]=moved;
    moved.equippedToUid=host.c.uid;

    moved._equipBonus=500; moved._equipBonus2=0;
    if(moved.no===20){ moved._equipBonus=300; moved._equipBonus2=0; }
    if(moved.no===18 && host.c.tags.includes("射手")){ moved._equipBonus=500; moved._equipBonus2=500; }
    if(moved.no===19 && (host.c.tags.includes("勇者") || host.c.tags.includes("剣士"))){ moved._equipBonus=500; moved._equipBonus2=500; }

    // 既存装備を剥がす
    if(host.c.equipUid){
      const old=findEquipInE("AI", host.c.equipUid);
      if(old){
        const oldPos=p.E.findIndex(x=>x && x.uid===old.uid);
        if(oldPos>=0) p.E[oldPos]=null;
        moveToWing("AI", old);
      }
      host.c.equipUid=null;
    }
    host.c.equipUid=moved.uid;

    log(`AI：装備 ${moved.name} → ${host.c.name}`);
    renderAll();
  });
}

function scoreItem(item){
  if(!item) return 0;
  if(item.no===20) return 300;
  if(item.no===18) return 900; // 射手なら強い
  if(item.no===19) return 900; // 条件で強い
  return 500;
}

async function aiBattleStep(){
  const A=state.AI;
  const P=state.P1;

  const attackers=A.C.map((c,i)=>({c,i})).filter(x=>x.c);
  if(!attackers.length) return;

  // まず「勝てる攻撃」があるか評価
  // ルール：相手の盤面より低いATKしか出せない場合は攻撃しない（ご主人様仕様）
  const oppMax = Math.max(0, ...P.C.filter(Boolean).map(c=>calcCurrentAtk("P1", c)));
  const myMax  = Math.max(0, ...A.C.filter(Boolean).map(c=>calcCurrentAtk("AI", c)));
  if(P.C.some(Boolean) && myMax < oppMax){
    log("AI：不利（最大ATKが相手より低い）→攻撃せずターン終了（シールド温存）");
    return;
  }

  // 攻撃：優先順位
  // 1) シールドが残っているならシールドを攻撃（1回）
  if(countShields("P1")>0){
    // 最強アタッカーで殴る
    attackers.sort((a,b)=> calcCurrentAtk("AI",b.c)-calcCurrentAtk("AI",a.c));
    const att=attackers[0];
    await resolveBattleAttack("AI", att.i, "S");
    return;
  }

  // 2) シールド0：直接攻撃（ただし まひるは不可）
  attackers.sort((a,b)=> calcCurrentAtk("AI",b.c)-calcCurrentAtk("AI",a.c));
  for(const att of attackers){
    if(att.c.no===7) continue;
    await resolveBattleAttack("AI", att.i, "D");
    return;
  }

  // 全員まひるなら直接不可なので攻撃しない
  log("AI：直接攻撃できるキャラがいないため攻撃しません");
}

/* ---------------- Player quick-action: use hand card button ----------------
   既存UIにボタンが無い場合でも、手札カード選択後に
   「NEXT」押しても使えないため、ここで“手札の発動”を自動補助：
   - MAIN中、手札にアイテム/エフェクトを選んでいる状態で
     「NEXT」を押す前に、長押し/別UIがない場合の救済として
     btnNext長押しで発動できるようにする
------------------------------------------------------------ */
function bindHandQuickUse(){
  if(!el.btnNext) return;
  bindLongPress(el.btnNext, async ()=>{
    if(state.activeSide==="P1" && state.phase==="MAIN" && state.selectedHandIndex!=null){
      await playerUseSelectedHandCard();
    }
  }, 620);
}

/* ---------------- Buttons / init ---------------- */
function bindStart(){
  el.boot.textContent="JS: OK";
  const go=()=>{
    if(state.started) return;
    state.started=true;
    el.title.classList.remove("active");
    el.game.classList.add("active");
    startGame();
  };
  el.btnStart.addEventListener("click",(e)=>{ e.stopPropagation(); go(); },{passive:false});
  el.title.addEventListener("click",go,{passive:true});
}
function bindHUD(){
  el.btnHelp?.addEventListener("click",()=>showModal("helpM"),{passive:true});
  el.btnSettings?.addEventListener("click",()=>{
    el.repoInput.value=getRepo();
    showModal("settingsM");
  },{passive:true});

  bindLongPress(el.btnLog, ()=>{
    renderLogModal();
    showModal("logM");
  }, 620);

  el.btnNext.addEventListener("click", async ()=>{
    if(state.activeSide!=="P1" || state.gameOver) return;

    // MAIN中で手札が選択されていて、アイテム/エフェクトなら「次へ」より先に発動誘導
    if(state.phase==="MAIN" && state.selectedHandIndex!=null){
      const c=state.P1.hand[state.selectedHandIndex];
      if(c && (isItem(c) || isEffect(c))){
        const yes=await askYesNo("手札の発動", `${c.name} を発動しますか？`);
        if(yes){
          await playerUseSelectedHandCard();
          return;
        }
      }
    }

    await nextPhase();
  },{passive:true});

  el.btnEnd.addEventListener("click", async ()=>{
    if(state.activeSide!=="P1" || state.gameOver) return;
    await endTurn();
  },{passive:true});
}
function bindSettings(){
  el.btnRepoSave.addEventListener("click", async ()=>{
    const v=(el.repoInput.value||"").trim();
    if(!v.includes("/")){
      log("設定NG：owner/repo 形式で入力してください","warn");
      return;
    }
    setRepo(v);
    clearCache();
    log(`設定：repo=${v}`);
    await rescanImages();
  },{passive:true});
  el.btnRescan.addEventListener("click", async ()=>{ await rescanImages(); },{passive:true});
  el.btnClearCache.addEventListener("click", ()=>{ clearCache(); log("キャッシュ削除"); },{passive:true});
}
function bindResult(){
  el.btnNextGame.addEventListener("click", ()=>{
    hideModal("resultM");
    startGame();
  },{passive:true});
  el.btnBackTitle.addEventListener("click", ()=>{
    hideModal("resultM");
    state.started=false;
    state.gameOver=false;
    el.game.classList.remove("active");
    el.title.classList.add("active");
    el.boot.textContent="JS: OK（準備完了）";
  },{passive:true});
}

async function init(){
  bindStart();
  bindHUD();
  bindSettings();
  bindResult();
  bindHandQuickUse();

  const cache=getCache();
  if(cache && cache.repo===getRepo()){
    await applyImagesFromCache();
  }else{
    await rescanImages();
  }

  el.boot.textContent="JS: OK（準備完了）";
  log("v50022：完全版（ラウスサーチ修正/AI停止修正/記憶抹消=無効+元カードウィング）");
}

document.addEventListener("DOMContentLoaded", init);