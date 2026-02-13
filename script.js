/* =========================================================
   Manpuku World 製品向け“完成版（Web版）”
   - 横レイアウト前提（縦でもガイド）
   - フィールド画像：contain表示 + 4x3グリッド一体化 → 枠ズレしにくい
   - カード画像：自動探索 + アプリ内「画像設定」でNoごとにURL保存（以後コピペ更新不要）
   - 操作：長押しで拡大 / WING-OUTSIDE一覧 / 攻撃は確認付き / 矢印表示
   - ルール：スターター40枚(20種×2) / 初手4 / シールド3 / 1ドロー / ATK比較・同値相打ち
   ========================================================= */

const $ = (id)=>document.getElementById(id);

// ===== Elements =====
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
  btnSettings: $("btnSettings"),

  rotateHint: $("rotateHint"),
  btnCloseRotateHint: $("btnCloseRotateHint"),

  playmat: $("playmat"),
  matImg: $("matImg"),
  matGrid: $("matGrid"),

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

  zoneModal: $("zoneModal"),
  zoneClose: $("zoneClose"),
  zoneCloseBtn: $("zoneCloseBtn"),
  zoneTitle: $("zoneTitle"),
  zoneList: $("zoneList"),

  confirmModal: $("confirmModal"),
  confirmText: $("confirmText"),
  confirmYes: $("confirmYes"),
  confirmNo: $("confirmNo"),

  // Arrow
  arrowLayer: $("arrowLayer"),
  attackLine: $("attackLine"),

  // Settings
  settingsModal: $("settingsModal"),
  settingsClose: $("settingsClose"),
  settingsCloseBtn: $("settingsCloseBtn"),
  fieldUrlInput: $("fieldUrlInput"),
  btnSaveFieldUrl: $("btnSaveFieldUrl"),
  btnAutoField: $("btnAutoField"),
  cardMapList: $("cardMapList"),
  btnAutoCards: $("btnAutoCards"),
  btnClearMap: $("btnClearMap"),
};

// ===== Constants =====
const PHASES = ["START","DRAW","MAIN","BATTLE","END"];
const LS_KEY = "manpuku_image_map_v1";

// ===== Card data (仮) =====
// ※康臣さんがカード画像から文字起こし→後でここを差し替えて“本カード”にします。
const Cards = [
  {no:1,  name:"黒の魔法使いクルエラ", rank:5, atk:2500, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:2,  name:"黒魔法フレイムバレット", rank:5, atk:0,    type:"effect",    text:"（後で確定テキストに差し替え）"},
  {no:3,  name:"トナカイの少女ニコラ", rank:5, atk:2000, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:4,  name:"聖ラウス", rank:4, atk:1800, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:5,  name:"統括AI タータ", rank:4, atk:1000, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:6,  name:"麗しの令嬢エフィ", rank:5, atk:2000, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:7,  name:"狩樹まひる", rank:4, atk:1700, type:"character", text:"タイトルタグ：恋愛疾患特殊医療機a-xブラスター\n（後で確定テキストに差し替え）"},
  {no:8,  name:"組織の男手形", rank:4, atk:1900, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:9,  name:"小太郎孫悟空Lv17", rank:3, atk:1600, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:10, name:"小次郎孫悟空Lv17", rank:3, atk:1500, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:11, name:"司令", rank:3, atk:1200, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:12, name:"班目プロデューサー", rank:2, atk:800, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:13, name:"超弩級砲塔列車スタマックス氏", rank:1, atk:100, type:"character", text:"（後で確定テキストに差し替え）"},
  {no:14, name:"記憶抹消", rank:4, atk:0, type:"effect", text:"（後で確定テキストに差し替え）"},
  {no:15, name:"桜蘭の陰陽術 - 闘 -", rank:3, atk:0, type:"effect", text:"（後で確定テキストに差し替え）"},
  {no:16, name:"力こそパワー", rank:3, atk:0, type:"effect", text:"（後で確定テキストに差し替え）"},
  {no:17, name:"キャトルミューティレーション", rank:3, atk:0, type:"effect", text:"タイトルタグ：Eバリアーズ\n（後で確定テキストに差し替え）"},
  {no:18, name:"a-xブラスター01放射型", rank:4, atk:0, type:"item", text:"タイトルタグ：恋愛疾患特殊医療機a-xブラスター\n（後で確定テキストに差し替え）"},
  {no:19, name:"聖剣アロンダイト", rank:3, atk:0, type:"item", text:"（後で確定テキストに差し替え）"},
  {no:20, name:"普通の棒", rank:1, atk:0, type:"item", text:"（後で確定テキストに差し替え）"},
];

// ===== State =====
const state = {
  started:false,
  turn:1,
  phase:"START",
  active:"P1",   // "P1" or "AI"
  skipFx:false,

  P1: { deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },
  AI: { deck:[], hand:[], stage:[null,null,null], wing:[], outside:[], shield:[] },

  // selections
  selectedHandIndex:null,
  selectedAttackerIndex:null,

  // image map
  imgMap: loadMap(), // { fieldUrl?: string, cards?: { [no]: url } }
};

// ===== Logging =====
function log(msg, kind=""){
  const div = document.createElement("div");
  div.className = "logLine" + (kind ? ` ${kind}` : "");
  div.textContent = msg;
  el.log.prepend(div);
}

function loadMap(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { fieldUrl:"", cards:{} };
    const obj = JSON.parse(raw);
    return { fieldUrl: obj.fieldUrl || "", cards: obj.cards || {} };
  }catch{
    return { fieldUrl:"", cards:{} };
  }
}
function saveMap(){
  localStorage.setItem(LS_KEY, JSON.stringify(state.imgMap));
}

// ===== Helpers =====
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}
function pad2(n){ return String(n).padStart(2,"0"); }

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

// ===== Image resolving =====
const baseDirs = ["", "assets/", "assets/cards/", "cards/"];
const exts = ["png","jpg","jpeg","PNG","JPG","JPEG","png.jpg","PNG.JPG","png.jpeg","PNG.JPEG"];

function imgExists(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=>resolve(true);
    img.onerror = ()=>resolve(false);
    img.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  });
}
function candidatesFor(baseName){
  const list = [];
  for(const dir of baseDirs){
    for(const ext of exts){
      list.push(`${dir}${baseName}.${ext}`);
    }
  }
  return list;
}
async function resolveOne(cands){
  for(const u of cands){
    if(await imgExists(u)) return u;
  }
  return "";
}

function cardBaseNames(no){
  const c = Cards.find(x=>x.no===no);
  const p = pad2(no);
  const names = [];

  if(c){
    names.push(`${p}_${c.name}`);
    names.push(`${p}_${c.name.replace(/\s+/g,"")}`);
    names.push(`${p}_${c.name.replace(/　/g," ")}`);
  }
  // 救済（よくある揺れ）
  if(no===8){ names.push("08_組織の男　手形","08_組織の男手形"); }
  if(no===5){ names.push("05_統括AIタータ","05_統括AI タータ","05_統括AI  タータ"); }
  if(no===13){ names.push("13_超弩級砲塔列車スタマックス氏","13_超弩級記憶列車グスタフマックス氏"); }

  return Array.from(new Set(names));
}

async function resolveFieldAuto(){
  const cands = [
    ...candidatesFor("field"),
    "field.png.jpg","assets/field.png.jpg","assets/field.jpg","field.jpg"
  ];
  const found = await resolveOne(cands);
  if(found){
    state.imgMap.fieldUrl = "/" + found.replace(/^\/+/,"");
    saveMap();
    applyField();
    log(`OK フィールド: ${found}`, "muted");
  }else{
    log("NG フィールド画像が見つかりません（画像設定でURLを入れてください）", "warn");
  }
}

async function resolveCardsAuto(){
  let ok=0, ng=0;
  for(let no=1; no<=20; no++){
    if(state.imgMap.cards[String(no)]) { ok++; continue; }
    let found="";
    const bases = cardBaseNames(no);
    for(const b of bases){
      found = await resolveOne(candidatesFor(b));
      if(found) break;
    }
    if(found){
      state.imgMap.cards[String(no)] = "/" + found.replace(/^\/+/,"");
      ok++;
    }else{
      ng++;
    }
  }
  saveMap();
  log(`カード画像 自動探索：OK=${ok} / NG=${ng}`, ng? "warn":"muted");
  renderAll();
}

function applyField(){
  const url = (state.imgMap.fieldUrl || "").trim();
  if(url){
    el.matImg.style.backgroundImage = `url(${url})`;
  }
}

function cardImg(no){
  const u = state.imgMap.cards[String(no)];
  return u ? u : "";
}

// ===== UI: Viewer / Zone / Confirm =====
function openCardViewer(card){
  el.viewerTitle.textContent = `No.${card.no} ${card.name}`;
  const img = cardImg(card.no);
  el.viewerImg.src = img || "";
  el.viewerText.textContent = card.text || "（テキスト未登録）";
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
    const empty = document.createElement("div");
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

// ===== Attack arrow =====
function clearArrow(){
  el.attackLine.setAttribute("x1","0");
  el.attackLine.setAttribute("y1","0");
  el.attackLine.setAttribute("x2","0");
  el.attackLine.setAttribute("y2","0");
}
function drawArrow(fromEl, toEl){
  const r1 = fromEl.getBoundingClientRect();
  const r2 = toEl.getBoundingClientRect();
  const base = el.playmat.getBoundingClientRect();

  // map to 0..100 viewBox
  const x1 = ((r1.left + r1.width/2) - base.left) / base.width * 100;
  const y1 = ((r1.top  + r1.height/2) - base.top ) / base.height* 100;
  const x2 = ((r2.left + r2.width/2) - base.left) / base.width * 100;
  const y2 = ((r2.top  + r2.height/2) - base.top ) / base.height* 100;

  el.attackLine.setAttribute("x1", String(x1));
  el.attackLine.setAttribute("y1", String(y1));
  el.attackLine.setAttribute("x2", String(x2));
  el.attackLine.setAttribute("y2", String(y2));
}

// ===== Game logic =====
function buildStarterDeck(){
  const deck=[];
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
      log(`${side==="P1"?"あなた":"AI"}：デッキ切れ（仮：敗北扱い）`, "warn");
      return;
    }
    p.hand.push(p.deck.shift());
  }
}

function startGame(){
  state.turn=1;
  state.phase="START";
  state.active="P1";
  state.selectedHandIndex=null;
  state.selectedAttackerIndex=null;
  clearArrow();

  state.P1.deck = buildStarterDeck();
  state.AI.deck = buildStarterDeck();

  // shield 3
  state.P1.shield = [state.P1.deck.shift(), state.P1.deck.shift(), state.P1.deck.shift()];
  state.AI.shield = [state.AI.deck.shift(), state.AI.deck.shift(), state.AI.deck.shift()];

  state.P1.hand=[]; state.AI.hand=[];
  draw("P1",4); draw("AI",4);  // 初手4

  state.P1.stage=[null,null,null];
  state.AI.stage=[null,null,null];
  state.P1.wing=[]; state.AI.wing=[];
  state.P1.outside=[]; state.AI.outside=[];

  renderAll();
  log("ゲーム開始：シールド3 / 初手4", "muted");
}

function nextPhase(){
  const idx = PHASES.indexOf(state.phase);
  state.phase = PHASES[(idx+1)%PHASES.length];

  if(state.phase==="DRAW"){
    draw("P1",1);
    draw("AI",1);
    log("ドロー +1", "muted");
  }

  if(state.phase!=="BATTLE"){
    state.selectedAttackerIndex=null;
    clearArrow();
  }
  renderAll();
}

function endTurn(){
  // hand limit 7 -> wing
  while(state.P1.hand.length>7){
    const c = state.P1.hand.pop();
    state.P1.wing.unshift(c);
    log(`手札上限：${c.name} をWINGへ`, "muted");
  }

  state.turn++;
  state.phase="START";
  state.selectedHandIndex=null;
  state.selectedAttackerIndex=null;
  clearArrow();
  renderAll();
  log(`TURN ${state.turn} 開始`, "muted");
}

// ===== Battle =====
async function attack(targetIdx, attackerSlotEl, targetSlotEl){
  const attacker = state.P1.stage[state.selectedAttackerIndex];
  const target = state.AI.stage[targetIdx];
  if(!attacker || !target) return;

  drawArrow(attackerSlotEl, targetSlotEl);

  const ok = await confirmDialog(`「${attacker.name}」で「${target.name}」を攻撃しますか？`);
  if(!ok){
    log("攻撃キャンセル", "muted");
    state.selectedAttackerIndex=null;
    clearArrow();
    renderAll();
    return;
  }

  if(attacker.atk === target.atk){
    log(`同値：相打ち → 両方WING`, "muted");
    state.P1.wing.unshift(attacker);
    state.AI.wing.unshift(target);
    state.P1.stage[state.selectedAttackerIndex]=null;
    state.AI.stage[targetIdx]=null;
  }else if(attacker.atk > target.atk){
    log(`勝利：${target.name} を破壊 → 相手WING`, "muted");
    state.AI.wing.unshift(target);
    state.AI.stage[targetIdx]=null;
  }else{
    log(`敗北：${attacker.name} を破壊 → あなたWING`, "warn");
    state.P1.wing.unshift(attacker);
    state.P1.stage[state.selectedAttackerIndex]=null;
  }

  state.selectedAttackerIndex=null;
  clearArrow();
  renderAll();
}

// ===== Rendering =====
function makeSlot(card, {selected=false, onClick=null, onLongPress=null}={}){
  const slot=document.createElement("div");
  slot.className="slot" + (selected ? " selected" : "");
  if(card){
    const face=document.createElement("div");
    face.className="cardFace";
    const pth = cardImg(card.no);
    if(pth) face.style.backgroundImage = `url(${pth})`;

    const b1=document.createElement("div");
    b1.className="badge";
    b1.textContent=`R${card.rank}`;
    const b2=document.createElement("div");
    b2.className="badge atk";
    b2.textContent=card.atk ? `ATK ${card.atk}` : `ATK -`;
    const nm=document.createElement("div");
    nm.className="cardName";
    nm.textContent=card.name;

    face.appendChild(b1); face.appendChild(b2); face.appendChild(nm);
    slot.appendChild(face);
  }
  if(onClick) slot.addEventListener("click", onClick, {passive:true});
  if(onLongPress) bindLongPress(slot, onLongPress);
  return slot;
}

function renderStage(side, root){
  root.innerHTML="";
  const p = state[side];

  for(let i=0;i<3;i++){
    const c = p.stage[i];

    if(side==="P1"){
      // player
      if(c){
        const slotEl = makeSlot(c, {
          selected: state.phase==="BATTLE" && state.selectedAttackerIndex===i,
          onClick: ()=>{
            if(state.phase!=="BATTLE") return;
            state.selectedAttackerIndex = (state.selectedAttackerIndex===i) ? null : i;
            log(state.selectedAttackerIndex===i ? `攻撃者選択：${c.name}` : "攻撃者解除", "muted");
            clearArrow();
            renderAll();
          },
          onLongPress: ()=>openCardViewer(c)
        });
        root.appendChild(slotEl);
      }else{
        // empty slot: summon by tapping while main and hand selected
        const slotEl = makeSlot(null, {
          onClick: ()=>{
            if(state.phase!=="MAIN") return;
            if(state.selectedHandIndex==null) return;

            const handCard = state.P1.hand[state.selectedHandIndex];
            if(!handCard) return;

            if(handCard.type!=="character"){
              log("（仮）いまはキャラのみ登場できます", "muted");
              return;
            }

            state.P1.stage[i]=handCard;
            state.P1.hand.splice(state.selectedHandIndex,1);
            state.selectedHandIndex=null;
            log(`登場：${handCard.name}`, "muted");
            renderAll();
          }
        });
        root.appendChild(slotEl);
      }
    }else{
      // enemy stage
      if(c){
        const slotEl = makeSlot(c, {
          onClick: async (ev)=>{
            if(state.phase!=="BATTLE") return;
            if(state.selectedAttackerIndex==null) return;

            // find attacker slot el for arrow
            const pSlots = el.p1Stage.querySelectorAll(".slot");
            const attackerEl = pSlots[state.selectedAttackerIndex];
            const targetEl = ev.currentTarget;

            await attack(i, attackerEl, targetEl);
          },
          onLongPress: ()=>openCardViewer(c)
        });
        root.appendChild(slotEl);
      }else{
        root.appendChild(makeSlot(null));
      }
    }
  }
}

function renderHand(){
  el.hand.innerHTML="";
  state.P1.hand.forEach((c, idx)=>{
    const h=document.createElement("div");
    const img = cardImg(c.no);

    h.className="handCard";
    if(state.phase==="MAIN" && c.type==="character") h.classList.add("playable");
    if(state.selectedHandIndex===idx) h.classList.add("selected");
    if(!img) h.classList.add("missing");

    const face=document.createElement("div");
    face.className="cardFace";
    if(img) face.style.backgroundImage = `url(${img})`;

    const b=document.createElement("div");
    b.className="badge";
    b.textContent=`No.${c.no}`;

    const nm=document.createElement("div");
    nm.className="cardName";
    nm.textContent=c.name;

    face.appendChild(b);
    face.appendChild(nm);
    h.appendChild(face);

    h.addEventListener("click", ()=>{
      state.selectedHandIndex = (state.selectedHandIndex===idx) ? null : idx;
      renderAll();
    }, {passive:true});

    bindLongPress(h, ()=>openCardViewer(c));
    el.hand.appendChild(h);
  });
}

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

function renderAll(){
  renderCounts();
  renderStage("AI", el.aiStage);
  renderStage("P1", el.p1Stage);
  renderHand();

  // rotate hint on portrait (first time)
  const isPortrait = window.matchMedia("(max-width: 900px)").matches;
  if(isPortrait && !sessionStorage.getItem("mw_hide_rotate_hint")){
    el.rotateHint.classList.add("show");
  }
}

// ===== Settings UI =====
function openSettings(){
  buildCardMapList();
  el.fieldUrlInput.value = state.imgMap.fieldUrl || "";
  el.settingsModal.classList.add("show");
}
function closeSettings(){
  el.settingsModal.classList.remove("show");
  applyField();
  renderAll();
}

function buildCardMapList(){
  el.cardMapList.innerHTML = "";
  for(let no=1; no<=20; no++){
    const c = Cards.find(x=>x.no===no);
    const row = document.createElement("div");
    row.className="cardMapRow";

    const left = document.createElement("div");
    left.className="no";
    left.textContent = `No.${no}`;

    const name = document.createElement("div");
    name.className="name";
    name.textContent = c ? c.name : "";

    const btn = document.createElement("button");
    btn.className="btn small miniBtn";
    btn.textContent = "URLを入力して保存";
    btn.addEventListener("click", ()=>{
      const cur = state.imgMap.cards[String(no)] || "";
      const u = prompt(`No.${no} の画像URLを入力してください（例：/assets/cards/01_....png）`, cur);
      if(u==null) return;
      const v = u.trim();
      if(!v){
        delete state.imgMap.cards[String(no)];
        saveMap();
        log(`No.${no} の画像URLを削除`, "muted");
      }else{
        state.imgMap.cards[String(no)] = v.startsWith("/") ? v : "/" + v;
        saveMap();
        log(`No.${no} を保存：${state.imgMap.cards[String(no)]}`, "muted");
      }
      buildCardMapList();
      renderAll();
    }, {passive:true});

    row.appendChild(left);
    row.appendChild(name);
    row.appendChild(btn);
    el.cardMapList.appendChild(row);
  }
}

// ===== Zone clicks (pile cells) =====
function bindZoneClicks(){
  // matGrid cells with data-zone
  el.matGrid.querySelectorAll("[data-zone]").forEach((cell)=>{
    cell.addEventListener("click", ()=>{
      const z = cell.getAttribute("data-zone");
      if(z==="P1_wing") openZoneList("P1","wing");
      if(z==="P1_outside") openZoneList("P1","outside");
      if(z==="AI_wing") openZoneList("AI","wing");
      if(z==="AI_outside") openZoneList("AI","outside");
      // deck/shield etc are display only for now
    }, {passive:true});
  });
}

// ===== Boot =====
async function initialAssetCheck(){
  // apply saved field first
  applyField();

  if(!state.imgMap.fieldUrl){
    log("フィールド：未設定 → 自動探索します", "muted");
    await resolveFieldAuto();
  }else{
    log(`フィールド：保存済み ${state.imgMap.fieldUrl}`, "muted");
  }

  // cards: auto fill missing
  await resolveCardsAuto();

  // report still-missing
  let missing = [];
  for(let no=1; no<=20; no++){
    if(!cardImg(no)) missing.push(no);
  }
  if(missing.length){
    log(`カード画像が不足：${missing.join(", ")}（画像設定でNoごとにURL保存すると解決）`, "warn");
  }else{
    log("カード画像：20種すべてOK", "muted");
  }
}

function bindUI(){
  // Title start
  const start = async ()=>{
    if(state.started) return;
    state.started = true;

    el.titleScreen.classList.remove("active");
    el.gameScreen.classList.add("active");

    log("ロード開始…", "muted");
    await initialAssetCheck();
    startGame();
  };
  el.btnStart.addEventListener("click", start, {passive:true});
  el.titleScreen.addEventListener("click", start, {passive:true});
  el.titleScreen.addEventListener("touchend", start, {passive:true});

  // rotate hint
  el.btnCloseRotateHint.addEventListener("click", ()=>{
    sessionStorage.setItem("mw_hide_rotate_hint","1");
    el.rotateHint.classList.remove("show");
  }, {passive:true});

  // phase / turn
  el.btnNextPhase.addEventListener("click", nextPhase, {passive:true});
  el.btnEndTurn.addEventListener("click", endTurn, {passive:true});

  // skip
  el.btnSkipFx.addEventListener("click", ()=>{
    state.skipFx = !state.skipFx;
    el.btnSkipFx.textContent = `演出スキップ: ${state.skipFx ? "ON" : "OFF"}`;
  }, {passive:true});

  // viewer
  el.viewerClose.addEventListener("click", closeViewer, {passive:true});
  el.viewerCloseBtn.addEventListener("click", closeViewer, {passive:true});

  // zone
  el.zoneClose.addEventListener("click", closeZone, {passive:true});
  el.zoneCloseBtn.addEventListener("click", closeZone, {passive:true});

  // confirm
  el.confirmYes.addEventListener("click", ()=>closeConfirm(true), {passive:true});
  el.confirmNo.addEventListener("click", ()=>closeConfirm(false), {passive:true});
  el.confirmModal.querySelector(".modalBack").addEventListener("click", ()=>closeConfirm(false), {passive:true});

  // settings
  el.btnSettings.addEventListener("click", openSettings, {passive:true});
  el.settingsClose.addEventListener("click", closeSettings, {passive:true});
  el.settingsCloseBtn.addEventListener("click", closeSettings, {passive:true});

  el.btnSaveFieldUrl.addEventListener("click", ()=>{
    const v = (el.fieldUrlInput.value||"").trim();
    state.imgMap.fieldUrl = v ? (v.startsWith("/") ? v : "/" + v) : "";
    saveMap();
    applyField();
    log(`フィールドURL保存：${state.imgMap.fieldUrl || "（空）"}`, "muted");
    renderAll();
  }, {passive:true});

  el.btnAutoField.addEventListener("click", async ()=>{
    await resolveFieldAuto();
    el.fieldUrlInput.value = state.imgMap.fieldUrl || "";
  }, {passive:true});

  el.btnAutoCards.addEventListener("click", async ()=>{
    await resolveCardsAuto();
    buildCardMapList();
  }, {passive:true});

  el.btnClearMap.addEventListener("click", ()=>{
    if(!confirm("保存した画像の紐付けをすべて消しますか？")) return;
    state.imgMap = { fieldUrl:"", cards:{} };
    saveMap();
    applyField();
    buildCardMapList();
    log("画像の紐付けを全消去しました", "warn");
    renderAll();
  }, {passive:true});

  // zone clicks
  bindZoneClicks();

  // resize rerender
  window.addEventListener("resize", ()=>renderAll(), {passive:true});
}

document.addEventListener("DOMContentLoaded", bindUI);