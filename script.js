/* ==========================================
   Manpuku World 最終救済版（拡張子・配置ミス吸収）
   - フィールド：png/jpg/jpeg/png.jpg を自動探索
   - カード：png/jpg/jpeg/png.jpg を自動探索
   - 置き場所：ルート /assets /assets/cards /cards も探索
   - 見つからないものはログに一覧表示
   ========================================== */

const el = {
  titleScreen: document.getElementById("titleScreen"),
  gameScreen: document.getElementById("gameScreen"),
  fieldBg: document.getElementById("fieldBg"),

  turnChip: document.getElementById("turnChip"),
  phaseChip: document.getElementById("phaseChip"),
  btnNextPhase: document.getElementById("btnNextPhase"),
  btnEndTurn: document.getElementById("btnEndTurn"),
  btnSkipFx: document.getElementById("btnSkipFx"),

  enemyStage: document.getElementById("enemyStage"),
  playerStage: document.getElementById("playerStage"),
  hand: document.getElementById("hand"),
  log: document.getElementById("log"),

  playerDeckCount: document.getElementById("playerDeckCount"),
  playerWingCount: document.getElementById("playerWingCount"),
  playerOutsideCount: document.getElementById("playerOutsideCount"),
  playerShieldCount: document.getElementById("playerShieldCount"),

  enemyDeckCount: document.getElementById("enemyDeckCount"),
  enemyWingCount: document.getElementById("enemyWingCount"),
  enemyOutsideCount: document.getElementById("enemyOutsideCount"),
  enemyShieldCount: document.getElementById("enemyShieldCount"),

  playerWingPile: document.getElementById("playerWingPile"),
  playerOutsidePile: document.getElementById("playerOutsidePile"),
  enemyWingPile: document.getElementById("enemyWingPile"),
  enemyOutsidePile: document.getElementById("enemyOutsidePile"),

  viewerModal: document.getElementById("viewerModal"),
  viewerClose: document.getElementById("viewerClose"),
  viewerCloseBtn: document.getElementById("viewerCloseBtn"),
  viewerTitle: document.getElementById("viewerTitle"),
  viewerImg: document.getElementById("viewerImg"),
  viewerText: document.getElementById("viewerText"),

  zoneModal: document.getElementById("zoneModal"),
  zoneClose: document.getElementById("zoneClose"),
  zoneCloseBtn: document.getElementById("zoneCloseBtn"),
  zoneTitle: document.getElementById("zoneTitle"),
  zoneList: document.getElementById("zoneList"),

  confirmModal: document.getElementById("confirmModal"),
  confirmText: document.getElementById("confirmText"),
  confirmYes: document.getElementById("confirmYes"),
  confirmNo: document.getElementById("confirmNo"),
};

const PHASES = ["START","DRAW","MAIN","BATTLE","END"];

const Cards = [
  {no:1,  name:"黒の魔法使いクルエラ", rank:5, atk:2500, type:"character", text:"（後で差し替え）"},
  {no:2,  name:"黒魔法フレイムバレット", rank:5, atk:0, type:"effect", text:"（後で差し替え）"},
  {no:3,  name:"トナカイの少女ニコラ", rank:5, atk:2000, type:"character", text:"（後で差し替え）"},
  {no:4,  name:"聖ラウス", rank:4, atk:1800, type:"character", text:"（後で差し替え）"},
  {no:5,  name:"統括AI タータ", rank:4, atk:1000, type:"character", text:"（後で差し替え）"},
  {no:6,  name:"麗しの令嬢エフィ", rank:5, atk:2000, type:"character", text:"（後で差し替え）"},
  {no:7,  name:"狩樹まひる", rank:4, atk:1700, type:"character", text:"（後で差し替え）"},
  {no:8,  name:"組織の男手形", rank:4, atk:1900, type:"character", text:"（後で差し替え）"},
  {no:9,  name:"小太郎孫悟空Lv17", rank:3, atk:1600, type:"character", text:"（後で差し替え）"},
  {no:10, name:"小次郎孫悟空Lv17", rank:3, atk:1500, type:"character", text:"（後で差し替え）"},
  {no:11, name:"司令", rank:3, atk:1200, type:"character", text:"（後で差し替え）"},
  {no:12, name:"班目プロデューサー", rank:2, atk:800, type:"character", text:"（後で差し替え）"},
  {no:13, name:"超弩級砲塔列車スタマックス氏", rank:1, atk:100, type:"character", text:"（後で差し替え）"},
  {no:14, name:"記憶抹消", rank:4, atk:0, type:"effect", text:"（後で差し替え）"},
  {no:15, name:"桜蘭の陰陽術 - 闘 -", rank:3, atk:0, type:"effect", text:"（後で差し替え）"},
  {no:16, name:"力こそパワー", rank:3, atk:0, type:"effect", text:"（後で差し替え）"},
  {no:17, name:"キャトルミューティレーション", rank:3, atk:0, type:"effect", text:"（後で差し替え）"},
  {no:18, name:"a-xブラスター01放射型", rank:4, atk:0, type:"item", text:"タイトルタグ：恋愛疾患特殊医療機a-xブラスター"},
  {no:19, name:"聖剣アロンダイト", rank:3, atk:0, type:"item", text:"（後で差し替え）"},
  {no:20, name:"普通の棒", rank:1, atk:0, type:"item", text:"（後で差し替え）"},
];

const resolved = {
  field: null,
  cards: {}, // no -> path
};

function log(msg, kind=""){
  const div = document.createElement("div");
  div.className = "logLine" + (kind ? ` ${kind}` : "");
  div.textContent = msg;
  el.log.prepend(div);
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

function imgExists(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=>resolve(true);
    img.onerror = ()=>resolve(false);
    img.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  });
}

// 置き場所候補（全部見る）
const baseDirs = [
  "",               // ルート
  "assets/",
  "assets/cards/",
  "cards/",
];

// 拡張子候補（png/jpg/jpeg と “png.jpg” も）
const exts = ["png","jpg","jpeg","PNG","JPG","JPEG","png.jpg","PNG.JPG","png.jpeg","PNG.JPEG"];

function makeCandidates(baseName){
  // baseName 例: "field"  or "01_黒の魔法使いクルエラ"
  const list = [];
  for(const dir of baseDirs){
    // baseName.ext
    for(const ext of exts){
      list.push(`${dir}${baseName}.${ext}`);
    }
  }
  return list;
}

async function resolveOne(candidates){
  for(const p of candidates){
    if(await imgExists(p)) return p;
  }
  return null;
}

// フィールド：field.* を全部探索（field.png.jpgも拾う）
async function resolveField(){
  const candidates = makeCandidates("field");
  // すでに field.png.jpg と分かってる場合もあるので追加で直指定も入れる
  candidates.unshift("field.png.jpg", "assets/field.png.jpg", "assets/field.jpg", "field.jpg");

  resolved.field = await resolveOne(candidates);
  if(resolved.field){
    el.fieldBg.style.backgroundImage = `url(${resolved.field})`;
    log(`OK フィールド: ${resolved.field}`, "muted");
  }else{
    log(`NG フィールド画像が見つかりません`, "warn");
    log(`候補: ${candidates.slice(0,12).join(" / ")} ...`, "warn");
  }
}

// カード候補名（“No_カード名” を基本に、揺れも少しだけ救済）
function cardBaseNames(no){
  const c = Cards.find(x=>x.no===no);
  const pad = String(no).padStart(2,"0");
  const names = [];

  // 基本： "01_カード名"
  if(c) names.push(`${pad}_${c.name}`);

  // よくある揺れ（スペース除去・全角スペース混入）
  if(c){
    names.push(`${pad}_${c.name.replace(/\s+/g,"")}`);
    names.push(`${pad}_${c.name.replace(/　/g," ")}`);
  }

  // 個別救済（康臣さんが以前指定したブレ）
  if(no===5){
    names.push("05_統括AIタータ","05_統括AI タータ","05_統括AI  タータ");
  }
  if(no===8){
    names.push("08_組織の男　手形","08_組織の男手形");
  }
  if(no===13){
    names.push("13_超弩級砲塔列車スタマックス氏","13_超弩級記憶列車グスタフマックス氏");
  }
  if(no===15){
    names.push("15_桜蘭の陰陽術 - 闘 -","15_桜蘭の陰陽術闘");
  }
  if(no===18){
    names.push("18_a-xブラスター01放射型","18_axブラスター01放射型","18_axブラスター01_放射型");
  }

  // 重複除去
  return Array.from(new Set(names));
}

async function resolveCards(){
  const missing = [];
  for(let no=1; no<=20; no++){
    const bases = cardBaseNames(no);
    let found = null;
    let tried = [];

    for(const b of bases){
      const cand = makeCandidates(b);
      tried = tried.concat(cand);
      found = await resolveOne(cand);
      if(found) break;
    }

    if(found){
      resolved.cards[no] = found;
    }else{
      missing.push({no, tried: tried.slice(0,10)});
    }
  }

  if(missing.length===0){
    log("OK カード画像：20種すべて見つかりました", "muted");
  }else{
    log(`NG カード画像：見つからない ${missing.length} 枚`, "warn");
    for(const m of missing){
      log(`No.${m.no} 例: ${m.tried.join(" / ")} ...`, "warn");
    }
  }
}

function cardImg(no){
  return resolved.cards[no] || "";
}

function bindLongPress(node, fn){
  let t=null;
  const start=()=>{ if(t)clearTimeout(t); t=setTimeout(()=>{t=null;fn();},380); };
  const end=()=>{ if(t){clearTimeout(t); t=null;} };
  node.addEventListener("touchstart", start, {passive:true});
  node.addEventListener("touchend", end, {passive:true});
  node.addEventListener("touchcancel", end, {passive:true});
  node.addEventListener("mousedown", start);
  node.addEventListener("mouseup", end);
  node.addEventListener("mouseleave", end);
}

function openCardViewer(card){
  el.viewerTitle.textContent = `No.${card.no} ${card.name}`;
  el.viewerImg.src = cardImg(card.no) || "";
  el.viewerText.textContent = card.text || "（テキストは後で差し替え）";
  el.viewerModal.classList.add("show");
}
function closeViewer(){ el.viewerModal.classList.remove("show"); }

function openZoneList(side, zoneKey){
  const p = state[side];
  const zoneName = (zoneKey==="wing") ? "WING" : "OUTSIDE";
  el.zoneTitle.textContent = `${side==="P1" ? "YOUR" : "ENEMY"} ${zoneName}`;
  el.zoneList.innerHTML = "";

  const list = p[zoneKey];
  if(list.length===0){
    const empty=document.createElement("div");
    empty.className="logLine muted";
    empty.textContent="（空）";
    el.zoneList.appendChild(empty);
  }else{
    list.forEach((c)=>{
      const item=document.createElement("div");
      item.className="zoneItem";
      const th=document.createElement("div");
      th.className="zoneThumb";
      const pth = cardImg(c.no);
      if(pth) th.style.backgroundImage = `url(${pth})`;
      const meta=document.createElement("div");
      meta.className="zoneMeta";
      const n=document.createElement("div");
      n.className="n";
      n.textContent=`No.${c.no} ${c.name}`;
      const s=document.createElement("div");
      s.className="s";
      s.textContent=`R${c.rank} / ${c.type}`;
      meta.appendChild(n); meta.appendChild(s);
      item.appendChild(th); item.appendChild(meta);
      item.addEventListener("click", ()=>openCardViewer(c), {passive:true});
      el.zoneList.appendChild(item);
    });
  }
  el.zoneModal.classList.add("show");
}
function closeZone(){ el.zoneModal.classList.remove("show"); }

// 確認モーダル
let confirmResolve=null;
function confirmDialog(text){
  el.confirmText.textContent=text;
  el.confirmModal.classList.add("show");
  return new Promise((resolve)=>{ confirmResolve=resolve; });
}
function closeConfirm(result){
  el.confirmModal.classList.remove("show");
  if(confirmResolve){ confirmResolve(result); confirmResolve=null; }
}

const state = {
  started:false,
  turn:1,
  phase:"START",
  skipFx:false,

  P1: { deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },
  AI: { deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },

  selectedHandIndex: null,
  selectedAttacker: null,
};

function buildStarterDeck(){
  const deck = [];
  for(const c of Cards){
    deck.push(structuredClone(c));
    deck.push(structuredClone(c));
  }
  shuffle(deck);
  return deck;
}
function draw(side, n=1){
  const p = state[side];
  for(let i=0;i<n;i++){
    if(p.deck.length<=0){
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（仮）`, "warn");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}

async function doAttack(targetIdx){
  const atkSel = state.selectedAttacker;
  if(!atkSel) return;
  const attacker = state.P1.stage[atkSel.idx];
  const target = state.AI.stage[targetIdx];
  if(!attacker || !target) return;

  const ok = await confirmDialog(`「${attacker.name}」で「${target.name}」を攻撃しますか？`);
  if(!ok){
    log("攻撃キャンセル", "muted");
    state.selectedAttacker=null;
    renderAll();
    return;
  }

  if(attacker.atk === target.atk){
    log(`相打ち：${attacker.name} / ${target.name}（WINGへ）`);
    state.P1.wing.unshift(attacker);
    state.AI.wing.unshift(target);
    state.P1.stage[atkSel.idx]=null;
    state.AI.stage[targetIdx]=null;
  }else if(attacker.atk > target.atk){
    log(`破壊：${target.name}（相手WINGへ）`);
    state.AI.wing.unshift(target);
    state.AI.stage[targetIdx]=null;
  }else{
    log(`破壊：${attacker.name}（あなたWINGへ）`);
    state.P1.wing.unshift(attacker);
    state.P1.stage[atkSel.idx]=null;
  }

  state.selectedAttacker=null;
  renderAll();
}

function renderStage(side, root){
  root.innerHTML="";
  const p=state[side];
  for(let i=0;i<3;i++){
    const slot=document.createElement("div");
    slot.className="slot";
    const c=p.stage[i];

    if(c){
      const face=document.createElement("div");
      face.className="cardFace";
      const pth = cardImg(c.no);
      if(pth) face.style.backgroundImage = `url(${pth})`;

      const b1=document.createElement("div");
      b1.className="badge";
      b1.textContent=`R${c.rank}`;
      const b2=document.createElement("div");
      b2.className="badge atk";
      b2.textContent=c.atk?`ATK ${c.atk}`:`ATK -`;
      const nm=document.createElement("div");
      nm.className="cardName";
      nm.textContent=c.name;

      face.appendChild(b1); face.appendChild(b2); face.appendChild(nm);
      slot.appendChild(face);

      bindLongPress(slot, ()=>openCardViewer(c));

      if(side==="P1"){
        slot.addEventListener("click", ()=>{
          if(state.phase!=="BATTLE") return;
          state.selectedAttacker={side:"P1", idx:i};
          log(`攻撃者：${c.name}`);
          renderAll();
        }, {passive:true});
      }else{
        slot.addEventListener("click", ()=>{
          if(state.phase!=="BATTLE") return;
          if(!state.selectedAttacker) return;
          doAttack(i);
        }, {passive:true});
      }
    }else{
      if(side==="P1"){
        slot.addEventListener("click", ()=>{
          if(state.phase!=="MAIN") return;
          if(state.selectedHandIndex==null) return;

          const handCard=state.P1.hand[state.selectedHandIndex];
          if(!handCard) return;
          if(handCard.type!=="character"){
            log("（仮）いまはキャラだけ登場できます", "muted");
            return;
          }
          p.stage[i]=handCard;
          state.P1.hand.splice(state.selectedHandIndex,1);
          state.selectedHandIndex=null;
          log(`登場：${handCard.name}`);
          renderAll();
        }, {passive:true});
      }
    }
    root.appendChild(slot);
  }
}

function renderHand(){
  el.hand.innerHTML="";
  state.P1.hand.forEach((c, idx)=>{
    const h=document.createElement("div");
    h.className="handCard";
    if(state.phase==="MAIN" && c.type==="character") h.classList.add("playable");

    const face=document.createElement("div");
    face.className="cardFace";
    const pth = cardImg(c.no);
    if(pth) face.style.backgroundImage = `url(${pth})`;

    const b1=document.createElement("div");
    b1.className="badge";
    b1.textContent=`No.${c.no}`;
    const nm=document.createElement("div");
    nm.className="cardName";
    nm.textContent=c.name;

    face.appendChild(b1); face.appendChild(nm);
    h.appendChild(face);

    h.addEventListener("click", ()=>{
      state.selectedHandIndex = (state.selectedHandIndex===idx) ? null : idx;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=>openCardViewer(c));
    el.hand.appendChild(h);
  });
}

function renderAll(){
  el.turnChip.textContent = `TURN ${state.turn}`;
  el.phaseChip.textContent = state.phase;
  el.btnSkipFx.textContent = `演出スキップ: ${state.skipFx ? "ON" : "OFF"}`;

  el.playerDeckCount.textContent = state.P1.deck.length;
  el.playerWingCount.textContent = state.P1.wing.length;
  el.playerOutsideCount.textContent = state.P1.outside.length;
  el.playerShieldCount.textContent = state.P1.shield.length;

  el.enemyDeckCount.textContent = state.AI.deck.length;
  el.enemyWingCount.textContent = state.AI.wing.length;
  el.enemyOutsideCount.textContent = state.AI.outside.length;
  el.enemyShieldCount.textContent = state.AI.shield.length;

  renderStage("AI", el.enemyStage);
  renderStage("P1", el.playerStage);
  renderHand();
}

function startGame(){
  state.turn=1;
  state.phase="START";
  state.selectedHandIndex=null;
  state.selectedAttacker=null;

  state.P1.deck = buildStarterDeck();
  state.AI.deck = buildStarterDeck();

  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  state.P1.hand=[]; state.AI.hand=[];
  draw("P1",4); draw("AI",4);

  state.P1.stage=[null,null,null];
  state.AI.stage=[null,null,null];
  state.P1.wing=[]; state.AI.wing=[];
  state.P1.outside=[]; state.AI.outside=[];
  renderAll();
}

function nextPhase(){
  const idx=PHASES.indexOf(state.phase);
  state.phase=PHASES[(idx+1)%PHASES.length];

  if(state.phase==="DRAW"){
    draw("P1",1);
    draw("AI",1);
    log("ドロー +1");
  }
  if(state.phase!=="BATTLE") state.selectedAttacker=null;
  renderAll();
}

function endTurn(){
  while(state.P1.hand.length>7){
    const c=state.P1.hand.pop();
    state.P1.wing.unshift(c);
    log(`手札上限：${c.name} をWINGへ`, "muted");
  }
  state.turn++;
  state.phase="START";
  state.selectedHandIndex=null;
  state.selectedAttacker=null;
  renderAll();
  log(`TURN ${state.turn} 開始`);
}

async function resolveAllAssets(){
  log("画像チェック開始（拡張子・場所を全部自動探索します）", "muted");
  await resolveField();
  await resolveCards();
  log("画像チェック終了（NGが出たら、その行だけ直せばOKです）", "muted");
}

function bindUI(){
  const start = async ()=>{
    if(state.started) return;
    state.started=true;

    el.titleScreen.classList.remove("active");
    el.gameScreen.classList.add("active");

    await resolveAllAssets();
    startGame();
  };

  el.titleScreen.addEventListener("click", start, {passive:true});
  el.titleScreen.addEventListener("touchend", start, {passive:true});

  el.btnNextPhase.addEventListener("click", nextPhase, {passive:true});
  el.btnEndTurn.addEventListener("click", endTurn, {passive:true});
  el.btnSkipFx.addEventListener("click", ()=>{
    state.skipFx=!state.skipFx;
    el.btnSkipFx.textContent=`演出スキップ: ${state.skipFx?"ON":"OFF"}`;
  }, {passive:true});

  el.viewerClose.addEventListener("click", closeViewer, {passive:true});
  el.viewerCloseBtn.addEventListener("click", closeViewer, {passive:true});

  el.zoneClose.addEventListener("click", closeZone, {passive:true});
  el.zoneCloseBtn.addEventListener("click", closeZone, {passive:true});

  el.playerWingPile.addEventListener("click", ()=>openZoneList("P1","wing"), {passive:true});
  el.playerOutsidePile.addEventListener("click", ()=>openZoneList("P1","outside"), {passive:true});
  el.enemyWingPile.addEventListener("click", ()=>openZoneList("AI","wing"), {passive:true});
  el.enemyOutsidePile.addEventListener("click", ()=>openZoneList("AI","outside"), {passive:true});

  el.confirmYes.addEventListener("click", ()=>closeConfirm(true), {passive:true});
  el.confirmNo.addEventListener("click", ()=>closeConfirm(false), {passive:true});
  el.confirmModal.querySelector(".modalBack").addEventListener("click", ()=>closeConfirm(false), {passive:true});
}

document.addEventListener("DOMContentLoaded", bindUI);