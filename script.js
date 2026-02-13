/* =========================================================
   Manpuku World  確認プレイ版（画像ゼロでも進行可）
   - カード画像：jpg / png / jpeg すべて自動対応
   - 「.png.JPG」など二重拡張子も吸収
   - 画像が無くても名前でプレイできる
   ========================================================= */

const $ = (id) => document.getElementById(id);

// Elements
const el = {
  titleScreen: $("titleScreen"),
  gameScreen: $("gameScreen"),
  btnStart: $("btnStart"),

  turnChip: $("turnChip"),
  phaseChip: $("phaseChip"),
  whoChip: $("whoChip"),
  btnNextPhase: $("btnNextPhase"),
  btnEndTurn: $("btnEndTurn"),
  btnSkipFx: $("btnSkipFx"),

  matImg: $("matImg"),

  aiStage: $("aiStage"),
  p1Stage: $("p1Stage"),
  hand: $("hand"),
  log: $("log"),

  aiDeckCount: $("aiDeckCount"),
  aiWingCount: $("aiWingCount"),
  aiOutsideCount: $("aiOutsideCount"),
  aiShieldCount: $("aiShieldCount"),
  p1DeckCount: $("p1DeckCount"),
  p1WingCount: $("p1WingCount"),
  p1OutsideCount: $("p1OutsideCount"),
  p1ShieldCount: $("p1ShieldCount"),

  viewerModal: $("viewerModal"),
  viewerClose: $("viewerClose"),
  viewerCloseBtn: $("viewerCloseBtn"),
  viewerTitle: $("viewerTitle"),
  viewerImg: $("viewerImg"),
  viewerText: $("viewerText"),

  confirmModal: $("confirmModal"),
  confirmBack: $("confirmBack"),
  confirmText: $("confirmText"),
  confirmYes: $("confirmYes"),
  confirmNo: $("confirmNo"),
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const LS_KEY = "manpuku_asset_paths_v3";

function log(msg, kind="") {
  const d = document.createElement("div");
  d.className = "logLine" + (kind ? ` ${kind}` : "");
  d.textContent = msg;
  el.log.prepend(d);
}

function pad2(n){ return String(n).padStart(2,"0"); }
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}
function encodePath(u){
  try{
    const [p,q] = u.split("?");
    const ep = encodeURI(p);
    return q ? `${ep}?${q}` : ep;
  }catch{ return u; }
}
function imgExists(url){
  return new Promise((resolve)=>{
    const im = new Image();
    im.onload = ()=>resolve(true);
    im.onerror = ()=>resolve(false);
    const u = encodePath(url);
    im.src = u + (u.includes("?") ? "&" : "?") + "t=" + Date.now();
  });
}

function loadPaths(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { field:"", cards:{} };
    const obj = JSON.parse(raw);
    return { field: obj.field || "", cards: obj.cards || {} };
  }catch{
    return { field:"", cards:{} };
  }
}
function savePaths(){
  localStorage.setItem(LS_KEY, JSON.stringify(state.paths));
}

// 20カード（仮：後で確定テキストへ）
const Cards = [
  {no:1,  name:"黒の魔法使いクルエラ", rank:5, atk:2500, type:"character", text:"（後で確定テキスト）"},
  {no:2,  name:"黒魔法フレイムバレット", rank:5, atk:0,    type:"effect",    text:"（後で確定テキスト）"},
  {no:3,  name:"トナカイの少女ニコラ", rank:5, atk:2000, type:"character", text:"このカードは登場できず、手札、または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。"},
  {no:4,  name:"聖ラウス", rank:4, atk:1800, type:"character", text:"（後で確定テキスト）"},
  {no:5,  name:"統括AI タータ", rank:4, atk:1000, type:"character", text:"（後で確定テキスト）"},
  {no:6,  name:"麗しの令嬢エフィ", rank:5, atk:2000, type:"character", text:"（後で確定テキスト）"},
  {no:7,  name:"狩樹まひる", rank:4, atk:1700, type:"character", text:"タイトルタグ：恋愛疾患特殊医療機a-xブラスター\n（後で確定テキスト）"},
  {no:8,  name:"組織の男手形", rank:4, atk:1900, type:"character", text:"（後で確定テキスト）"},
  {no:9,  name:"小太郎孫悟空Lv17", rank:3, atk:1600, type:"character", text:"（後で確定テキスト）"},
  {no:10, name:"小次郎孫悟空Lv17", rank:3, atk:1500, type:"character", text:"（後で確定テキスト）"},
  {no:11, name:"司令", rank:3, atk:1200, type:"character", text:"（後で確定テキスト）"},
  {no:12, name:"班目プロデューサー", rank:2, atk:800, type:"character", text:"（後で確定テキスト）"},
  {no:13, name:"超弩級砲塔列車スタマックス氏", rank:1, atk:100, type:"character", text:"（後で確定テキスト）"},
  {no:14, name:"記憶抹消", rank:4, atk:0, type:"effect", text:"（後で確定テキスト）"},
  {no:15, name:"桜蘭の陰陽術 - 闘 -", rank:3, atk:0, type:"effect", text:"（後で確定テキスト）"},
  {no:16, name:"力こそパワー", rank:3, atk:0, type:"effect", text:"（後で確定テキスト）"},
  {no:17, name:"キャトルミューティレーション", rank:3, atk:0, type:"effect", text:"タイトルタグ：Eバリアーズ\n（後で確定テキスト）"},
  {no:18, name:"a-xブラスター01放射型", rank:4, atk:0, type:"item", text:"タイトルタグ：恋愛疾患特殊医療機a-xブラスター\n（後で確定テキスト）"},
  {no:19, name:"聖剣アロンダイト", rank:3, atk:0, type:"item", text:"（後で確定テキスト）"},
  {no:20, name:"普通の棒", rank:1, atk:0, type:"item", text:"（後で確定テキスト）"},
];

// State
const state = {
  started:false,
  turn:1,
  phase:"START",
  skipFx:false,

  P1:{ deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },
  AI:{ deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },

  selectedHand:null,
  selectedAttacker:null,

  paths: loadPaths(), // {field:"", cards:{ "1":"/assets/cards/..jpg" } }
};

// ------- 画像探索（jpg/png両対応：二重拡張子も完全対応）-------
const DIRS = ["assets/cards/","/assets/cards/","assets/","/assets/",""];

// ★ここが重要：康臣さんの「.png.JPG」用にバリエーションを追加
const EXTS = [
  "jpg","jpeg","png","JPG","JPEG","PNG",
  "png.jpg","png.jpeg","png.JPG","png.JPEG","png.PNG",
  "jpg.png","jpeg.png","JPG.png","JPEG.png","PNG.jpg",
  "jpeg.JPG","jpg.JPG","JPG.JPG","PNG.JPG"
];

function makeCandidates(base){
  const out=[];
  for(const d of DIRS){
    for(const e of EXTS){
      out.push(`${d}${base}.${e}`);
    }
  }
  return Array.from(new Set(out));
}

async function resolveOne(cands){
  for(const u of cands){
    if(await imgExists(u)) return u.startsWith("/") ? u : "/" + u.replace(/^\/+/,"");
  }
  return "";
}

function baseNamesForCard(no){
  const c = Cards.find(x=>x.no===no);
  const p = String(no);         // 12
  const p2 = pad2(no);          // 12
  const s = new Set();

  if(c){
    const nm = c.name;
    s.add(`${p2}_${nm}`);
    s.add(`${p2}_${nm.replace(/\s+/g,"")}`);
    s.add(`${p2}_${nm.replace(/　/g,"")}`);
    s.add(`${p2}-${nm}`);
    s.add(`${p2}${nm}`);
    s.add(`${p2}`);
    s.add(String(no));

    // 重要：康臣さんの例「12_班目プロデューサー.png.JPG」想定で、
    // baseが「12_班目プロデューサー.png」になっているケースも拾えるようにする
    s.add(`${p2}_${nm}.png`);
    s.add(`${p2}_${nm}.PNG`);
    s.add(`${p}_${nm}.png`);
  }

  // 揺れ吸収
  if(no===8){ s.add("08_組織の男　手形"); s.add("08_組織の男手形"); s.add("8_組織の男手形"); }
  if(no===5){ s.add("05_統括AIタータ"); s.add("05_統括AI  タータ"); }
  if(no===13){ s.add("13_超弩級記憶列車グスタフマックス氏"); s.add("13_超弩級砲塔列車スタマックス氏"); }

  return Array.from(s);
}

async function autoResolveField(){
  if(state.paths.field) return;
  const cands = [
    ...makeCandidates("field"),
    ...makeCandidates("Field"),
    "/assets/field.png.jpg","/assets/field.jpg","/assets/field.jpeg","/assets/field.png",
    "/assets/field.png.JPG","/assets/field.PNG.JPG"
  ];
  const found = await resolveOne(cands);
  if(found){
    state.paths.field = found;
    savePaths();
    applyField();
    log(`OK フィールド画像：${found}`,"muted");
  }else{
    log("NG フィールド画像が見つかりません（ただしゲームはプレイできます）","warn");
  }
}

async function autoResolveCards(){
  let ok=0, ng=0;
  for(let no=1; no<=20; no++){
    if(state.paths.cards[String(no)]){ ok++; continue; }
    let found="";
    for(const b of baseNamesForCard(no)){
      found = await resolveOne(makeCandidates(b));
      if(found) break;
    }
    if(found){
      state.paths.cards[String(no)] = found;
      ok++;
    }else{
      ng++;
    }
  }
  savePaths();
  log(`カード画像探索：OK=${ok} / NG=${ng}`,(ng? "warn":"muted"));
}

function cardImg(no){
  const u = state.paths.cards[String(no)];
  return u ? encodePath(u) : "";
}

function applyField(){
  const u = state.paths.field;
  if(u) el.matImg.style.backgroundImage = `url(${encodePath(u)})`;
}

// ------- UI補助 -------
function bindLongPress(node, fn){
  let t=null;
  const start=()=>{ if(t) clearTimeout(t); t=setTimeout(()=>{ t=null; fn(); }, 380); };
  const end=()=>{ if(t){ clearTimeout(t); t=null; } };
  node.addEventListener("touchstart",start,{passive:true});
  node.addEventListener("touchend",end,{passive:true});
  node.addEventListener("touchcancel",end,{passive:true});
  node.addEventListener("mousedown",start);
  node.addEventListener("mouseup",end);
  node.addEventListener("mouseleave",end);
}

function openViewer(card){
  el.viewerTitle.textContent = `No.${card.no} ${card.name}`;
  const img = cardImg(card.no);
  el.viewerImg.src = img || "";
  el.viewerText.textContent = card.text || "（テキスト未登録）";
  el.viewerModal.classList.add("show");
}
function closeViewer(){ el.viewerModal.classList.remove("show"); }

let confirmResolve=null;
function confirmDialog(text){
  el.confirmText.textContent = text;
  el.confirmModal.classList.add("show");
  return new Promise((resolve)=>{ confirmResolve=resolve; });
}
function closeConfirm(result){
  el.confirmModal.classList.remove("show");
  if(confirmResolve){ confirmResolve(result); confirmResolve=null; }
}

// ------- Game logic（画像無関係に進行）-------
function buildDeck(){
  const deck=[];
  for(const c of Cards){ deck.push(structuredClone(c)); deck.push(structuredClone(c)); }
  shuffle(deck);
  return deck;
}
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（仮：敗北扱い）`,"warn");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}
function startGame(){
  state.turn=1;
  state.phase="START";
  state.selectedHand=null;
  state.selectedAttacker=null;

  state.P1.deck = buildDeck();
  state.AI.deck = buildDeck();

  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  state.P1.hand=[]; state.AI.hand=[];
  draw("P1",4); draw("AI",4);

  state.P1.stage=[null,null,null];
  state.AI.stage=[null,null,null];

  state.P1.wing=[]; state.AI.wing=[];
  state.P1.outside=[]; state.AI.outside=[];

  log("ゲーム開始：シールド3 / 初手4","muted");
  renderAll();
}
function nextPhase(){
  const i = PHASES.indexOf(state.phase);
  state.phase = PHASES[(i+1)%PHASES.length];
  if(state.phase==="DRAW"){
    draw("P1",1); draw("AI",1);
    log("ドロー +1","muted");
  }
  if(state.phase!=="BATTLE"){
    state.selectedAttacker=null;
  }
  renderAll();
}
function endTurn(){
  while(state.P1.hand.length>7){
    const c = state.P1.hand.pop();
    state.P1.wing.unshift(c);
    log(`手札上限：${c.name} をWINGへ`,"muted");
  }
  state.turn++;
  state.phase="START";
  state.selectedHand=null;
  state.selectedAttacker=null;
  log(`TURN ${state.turn} 開始`,"muted");
  renderAll();
}

async function doAttack(targetIdx){
  const atkIdx = state.selectedAttacker;
  const A = state.P1.stage[atkIdx];
  const D = state.AI.stage[targetIdx];
  if(!A || !D) return;

  const ok = await confirmDialog(`「${A.name}」で「${D.name}」を攻撃しますか？`);
  if(!ok){
    log("攻撃キャンセル","muted");
    state.selectedAttacker=null;
    renderAll();
    return;
  }

  if(A.atk===D.atk){
    log("同値：相打ち → 両方WING","muted");
    state.P1.wing.unshift(A);
    state.AI.wing.unshift(D);
    state.P1.stage[atkIdx]=null;
    state.AI.stage[targetIdx]=null;
  }else if(A.atk>D.atk){
    log(`勝利：${D.name} を破壊 → 相手WING`,"muted");
    state.AI.wing.unshift(D);
    state.AI.stage[targetIdx]=null;
  }else{
    log(`敗北：${A.name} を破壊 → あなたWING`,"warn");
    state.P1.wing.unshift(A);
    state.P1.stage[atkIdx]=null;
  }

  state.selectedAttacker=null;
  renderAll();
}

// ------- Render -------
function renderCounts(){
  el.turnChip.textContent = `TURN ${state.turn}`;
  el.phaseChip.textContent = state.phase;
  el.whoChip.textContent = "YOU";
  el.btnSkipFx.textContent = `演出スキップ: ${state.skipFx ? "ON" : "OFF"}`;

  el.p1DeckCount.textContent = state.P1.deck.length;
  el.p1WingCount.textContent = state.P1.wing.length;
  el.p1OutsideCount.textContent = state.P1.outside.length;
  el.p1ShieldCount.textContent = state.P1.shield.length;

  el.aiDeckCount.textContent = state.AI.deck.length;
  el.aiWingCount.textContent = state.AI.wing.length;
  el.aiOutsideCount.textContent = state.AI.outside.length;
  el.aiShieldCount.textContent = state.AI.shield.length;
}
function makeSlot(card, selected=false){
  const s = document.createElement("div");
  s.className = "slot" + (selected ? " selected":"");
  if(card){
    const face = document.createElement("div");
    const img = cardImg(card.no);
    face.className = "cardFace" + (img ? "" : " fallback");
    if(img) face.style.backgroundImage = `url(${img})`;

    const b1 = document.createElement("div");
    b1.className="badge";
    b1.textContent=`R${card.rank}`;

    const b2 = document.createElement("div");
    b2.className="badge atk";
    b2.textContent = card.atk ? `ATK ${card.atk}` : `ATK -`;

    const nm = document.createElement("div");
    nm.className="cardName";
    nm.textContent = card.name;

    face.appendChild(b1); face.appendChild(b2); face.appendChild(nm);
    s.appendChild(face);

    bindLongPress(s, ()=>openViewer(card));
  }
  return s;
}
function renderStage(){
  el.aiStage.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.AI.stage[i];
    const slot = makeSlot(c,false);
    slot.addEventListener("click", async ()=>{
      if(state.phase!=="BATTLE") return;
      if(state.selectedAttacker==null) return;
      await doAttack(i);
    }, {passive:true});
    el.aiStage.appendChild(slot);
  }

  el.p1Stage.innerHTML="";
  for(let i=0;i<3;i++){
    const c = state.P1.stage[i];
    const slot = makeSlot(c, state.phase==="BATTLE" && state.selectedAttacker===i);

    if(c){
      slot.addEventListener("click", ()=>{
        if(state.phase!=="BATTLE") return;
        state.selectedAttacker = (state.selectedAttacker===i) ? null : i;
        log(state.selectedAttacker===i ? `攻撃者選択：${c.name}` : "攻撃者解除","muted");
        renderAll();
      }, {passive:true});
    }else{
      slot.addEventListener("click", ()=>{
        if(state.phase!=="MAIN") return;
        if(state.selectedHand==null) return;
        const hc = state.P1.hand[state.selectedHand];
        if(!hc) return;
        if(hc.type!=="character"){
          log("（確認プレイ）今はキャラのみ登場できます","muted");
          return;
        }
        state.P1.stage[i]=hc;
        state.P1.hand.splice(state.selectedHand,1);
        state.selectedHand=null;
        log(`登場：${hc.name}`,"muted");
        renderAll();
      }, {passive:true});
    }

    el.p1Stage.appendChild(slot);
  }
}
function renderHand(){
  el.hand.innerHTML="";
  state.P1.hand.forEach((c,idx)=>{
    const h = document.createElement("div");
    h.className="handCard" + (state.selectedHand===idx ? " selected":"");

    const face = document.createElement("div");
    const img = cardImg(c.no);
    face.className="cardFace" + (img ? "" : " fallback");
    if(img) face.style.backgroundImage = `url(${img})`;

    const b = document.createElement("div");
    b.className="badge";
    b.textContent = `No.${c.no}`;

    const nm = document.createElement("div");
    nm.className="cardName";
    nm.textContent = c.name;

    face.appendChild(b);
    face.appendChild(nm);
    h.appendChild(face);

    h.addEventListener("click", ()=>{
      state.selectedHand = (state.selectedHand===idx) ? null : idx;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=>openViewer(c));
    el.hand.appendChild(h);
  });
}
function renderAll(){
  renderCounts();
  renderStage();
  renderHand();
}

// ------- Bind -------
function bindUI(){
  const start = async ()=>{
    if(state.started) return;
    state.started=true;

    el.titleScreen.classList.remove("active");
    el.gameScreen.classList.add("active");

    log("起動OK（画像が無くてもプレイできます）","muted");

    applyField();
    await autoResolveField();
    await autoResolveCards();
    applyField();

    startGame();
  };

  el.btnStart.addEventListener("click", start, {passive:true});
  el.titleScreen.addEventListener("click", start, {passive:true});
  el.titleScreen.addEventListener("touchend", start, {passive:true});

  el.btnNextPhase.addEventListener("click", nextPhase, {passive:true});
  el.btnEndTurn.addEventListener("click", endTurn, {passive:true});
  el.btnSkipFx.addEventListener("click", ()=>{
    state.skipFx=!state.skipFx;
    el.btnSkipFx.textContent = `演出スキップ: ${state.skipFx ? "ON":"OFF"}`;
  }, {passive:true});

  el.viewerClose.addEventListener("click", closeViewer, {passive:true});
  el.viewerCloseBtn.addEventListener("click", closeViewer, {passive:true});

  el.confirmYes.addEventListener("click", ()=>closeConfirm(true), {passive:true});
  el.confirmNo.addEventListener("click", ()=>closeConfirm(false), {passive:true});
  el.confirmBack.addEventListener("click", ()=>closeConfirm(false), {passive:true});
}

document.addEventListener("DOMContentLoaded", bindUI);