(() => {
  const $ = (id) => document.getElementById(id);

  // Screens
  const titleScreen = $("titleScreen");
  const gameScreen  = $("gameScreen");
  const startBtn    = $("startBtn");

  // HUD
  const turnChip  = $("turnChip");
  const phaseChip = $("phaseChip");
  const whoChip   = $("whoChip");

  const btnNextPhase = $("btnNextPhase");
  const btnEndTurn   = $("btnEndTurn");
  const btnLog       = $("btnLog");
  const btnSettings  = $("btnSettings");

  // Counts
  const youDeckCount   = $("youDeckCount");
  const enemyDeckCount = $("enemyDeckCount");
  const youWingCount   = $("youWingCount");
  const enemyWingCount = $("enemyWingCount");
  const youOutCount    = $("youOutCount");
  const enemyOutCount  = $("enemyOutCount");
  const enemyHandCount = $("enemyHandCount");

  // Mats
  const enemyMat = $("enemyMat");
  const youMat   = $("youMat");

  // Hand + Action
  const handRow   = $("handRow");
  const actionBar = $("actionBar");
  const selLabel  = $("selLabel");
  const btnPlayC  = $("btnPlayC");
  const btnPlayE  = $("btnPlayE");
  const btnCancelSel = $("btnCancelSel");

  // Zones DOM ids
  const youC = [$("youC0"), $("youC1"), $("youC2")];
  const youE = [$("youE0"), $("youE1"), $("youE2")];
  const enemyC = [$("enemyC0"), $("enemyC1"), $("enemyC2")];
  const enemyE = [$("enemyE0"), $("enemyE1"), $("enemyE2")];

  // Shields DOM
  const youS   = [$("youS0"), $("youS1"), $("youS2")];
  const enemyS = [$("enemyS0"), $("enemyS1"), $("enemyS2")];

  // Piles (tap opens log list)
  const youW = $("youW"), youO = $("youO");
  const enemyW = $("enemyW"), enemyO = $("enemyO");

  // Modals
  const cardModal = $("cardModal");
  const cardModalTitle = $("cardModalTitle");
  const cardModalImg   = $("cardModalImg");
  const cardModalText  = $("cardModalText");

  const logModal = $("logModal");
  const logBox = $("logBox");

  const settingsModal = $("settingsModal");
  const fieldInput = $("fieldInput");
  const backInput  = $("backInput");
  const saveFieldBtn = $("saveFieldBtn");
  const saveBackBtn  = $("saveBackBtn");
  const cardJsonArea = $("cardJsonArea");
  const loadJsonBtn  = $("loadJsonBtn");
  const exportJsonBtn= $("exportJsonBtn");

  // ===== Rules =====
  const PHASES = ["スタート","ドロー","メイン","バトル","エンド"];
  const START_HAND = 4;
  const SHIELDS = 3;
  const SLOTS = 3;
  const MAX_HAND = 7;

  // ===== Storage =====
  const LS_FIELD = "mw_field_url";
  const LS_BACK  = "mw_back_url";
  const LS_CARDS = "mw_card_data_v3";
  const LS_IMG_MAP = "mw_img_map_v3";

  // ===== Logger =====
  const log = (msg, type="normal") => {
    const div = document.createElement("div");
    div.className = "logLine" + (type==="warn" ? " warn" : type==="muted" ? " muted" : "");
    div.textContent = msg;
    logBox.prepend(div);
  };

  // close modals
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) $(t.dataset.close).classList.remove("show");
  });
  const show = (el) => el.classList.add("show");
  const hide = (el) => el.classList.remove("show");

  // ===== Helpers =====
  const normalizeText = (s) => String(s||"").replace(/又は/g,"または").replace(/出来る/g,"できる");

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  };

  const makeDeck = () => {
    const d=[];
    for (let i=1;i<=20;i++){
      const no = String(i).padStart(2,"0");
      d.push(no,no);
    }
    return shuffle(d);
  };

  // ===== Card data =====
  const defaultCards = (() => {
    const o={};
    for (let i=1;i<=20;i++){
      const no=String(i).padStart(2,"0");
      o[no]={ name:`カード${i}`, text:"（未登録）", rank:1, atk:500, type:"character" };
    }
    // 確定名称（康臣さん指定分）
    o["05"].name="統括AI  タータ";
    o["08"].name="組織の男　手形";
    o["13"].name="超弩級砲塔列車スタマックス氏";
    o["15"].name="桜蘭の陰陽術 - 闘 -";
    return o;
  })();

  const loadCards = () => {
    try{
      const raw=localStorage.getItem(LS_CARDS);
      if(raw){
        const p=JSON.parse(raw);
        for(const k of Object.keys(p)){
          if(p[k].name) p[k].name=normalizeText(p[k].name);
          if(p[k].text) p[k].text=normalizeText(p[k].text);
        }
        return p;
      }
    }catch{}
    return JSON.parse(JSON.stringify(defaultCards));
  };
  const saveCards = (c) => localStorage.setItem(LS_CARDS, JSON.stringify(c));
  let CARD = loadCards();

  // Image map (optional)
  const loadImgMap = () => {
    try{ return JSON.parse(localStorage.getItem(LS_IMG_MAP)||"{}"); }catch{ return {}; }
  };
  const saveImgMap = (m) => localStorage.setItem(LS_IMG_MAP, JSON.stringify(m));
  let IMG_MAP = loadImgMap();

  // ===== Assets resolve (best-effort; if not found -> placeholder) =====
  const tryLoadImage = (url) => new Promise((res)=>{
    const img=new Image();
    img.onload=()=>res(true);
    img.onerror=()=>res(false);
    img.src=url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
  });

  const nameSafe = (s)=>String(s||"").replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g," ").trim();

  const candidatesCard = (no) => {
    const k=String(no).padStart(2,"0");
    const nm=nameSafe(CARD[k]?.name||`カード${parseInt(k,10)}`);
    const base="/assets/cards/";
    const exts=[".jpg",".png",".jpeg",".JPG",".PNG",".JPEG",".png.JPG",".png.jpg",".jpg.png",".JPG.png",".jpg.JPG",".JPG.JPG"];
    const stems=[ IMG_MAP[k], `${k}_${nm}`, `${k}-${nm}`, `${k}${nm}`, `${k}` ].filter(Boolean);
    const list=[];
    for(const st of stems){
      if(st.startsWith("/")){ list.push(st); continue; }
      for(const ex of exts) list.push(base+st+ex);
    }
    return Array.from(new Set(list));
  };

  const cardImgCache = {};
  const getCardImg = async (no) => {
    const k=String(no).padStart(2,"0");
    if(k in cardImgCache) return cardImgCache[k];
    const cands=candidatesCard(k);
    for(const u of cands){
      if(await tryLoadImage(u)){
        cardImgCache[k]=u;
        return u;
      }
    }
    cardImgCache[k]="";
    return "";
  };

  let FIELD_URL = localStorage.getItem(LS_FIELD)||"";
  let BACK_URL  = localStorage.getItem(LS_BACK)||"";

  let resolvedField="", resolvedBack="";

  const resolveField = async () => {
    const c=[FIELD_URL,"/assets/field.jpg","/assets/field.png","/assets/field.jpeg","/assets/field.png.jpg"].filter(Boolean);
    for(const u of c){ if(await tryLoadImage(u)) return u; }
    return "";
  };
  const resolveBack = async () => {
    const c=[BACK_URL,"/assets/back.jpg","/assets/back.png","/assets/back.jpeg"].filter(Boolean);
    for(const u of c){ if(await tryLoadImage(u)) return u; }
    return "";
  };

  // ===== State =====
  const state = {
    turn:1,
    phaseIndex:0,
    current:"YOU",
    first:"YOU",
    you:   { deck:[], hand:[], wing:[], out:[], shields:[], C:[null,null,null], E:[null,null,null], attacked:[false,false,false] },
    enemy: { deck:[], hand:[], wing:[], out:[], shields:[], C:[null,null,null], E:[null,null,null], attacked:[false,false,false] },
    select: { handIndex:null, placeMode:null }, // placeMode "C" or "E"
    busy:false
  };

  const phase = ()=>PHASES[state.phaseIndex];

  const cardName = (no)=>CARD[String(no).padStart(2,"0")]?.name || `カード${parseInt(no,10)}`;
  const cardText = (no)=>normalizeText(CARD[String(no).padStart(2,"0")]?.text||"");
  const cardAtk  = (no)=>CARD[String(no).padStart(2,"0")]?.atk ?? 500;

  // ===== UI updates =====
  const computeCardW = () => {
    const w=window.innerWidth, h=window.innerHeight;
    const base=Math.max(64, Math.min(92, Math.floor(Math.min(w,h)/7)));
    document.documentElement.style.setProperty("--cardW", base+"px");
  };
  window.addEventListener("resize", computeCardW);

  const renderHUD = () => {
    turnChip.textContent = `TURN ${state.turn}`;
    phaseChip.textContent = `PHASE ${phase()}`;
    whoChip.textContent = (state.current==="YOU") ? "YOU TURN" : "ENEMY TURN";
  };

  const renderCounts = () => {
    youDeckCount.textContent = state.you.deck.length;
    enemyDeckCount.textContent = state.enemy.deck.length;
    youWingCount.textContent = state.you.wing.length;
    enemyWingCount.textContent = state.enemy.wing.length;
    youOutCount.textContent = state.you.out.length;
    enemyOutCount.textContent = state.enemy.out.length;
    enemyHandCount.textContent = state.enemy.hand.length;
  };

  const attachLongPress = (el, fn) => {
    let t=null, moved=false;
    const start=()=>{ moved=false; t=setTimeout(()=>{t=null; if(!moved) fn();}, 420); };
    const move=()=>{ moved=true; };
    const cancel=()=>{ if(t) clearTimeout(t); t=null; };
    el.addEventListener("touchstart", start, {passive:true});
    el.addEventListener("touchmove", move, {passive:true});
    el.addEventListener("touchend", cancel, {passive:true});
    el.addEventListener("mousedown", start);
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseup", cancel);
    el.addEventListener("mouseleave", cancel);
  };

  const makeCardEl = async (no, selected=false) => {
    const wrap=document.createElement("div");
    wrap.className="zoneSlot" + (selected ? " selected" : "");
    const face=document.createElement("div");
    face.className="face";
    wrap.appendChild(face);

    const url=await getCardImg(no);
    if(url){
      face.style.backgroundImage=`url("${url}")`;
    }else{
      const ph=document.createElement("div");
      ph.className="placeholder";
      ph.textContent=cardName(no);
      wrap.appendChild(ph);
    }
    return wrap;
  };

  const renderZone = async (cells, arr, owner, zoneType) => {
    for(let i=0;i<SLOTS;i++){
      const cell=cells[i];
      cell.innerHTML="";
      const no=arr[i];
      const slot = document.createElement("div");
      slot.style.display="flex";
      slot.style.alignItems="center";
      slot.style.justifyContent="center";
      slot.style.width="100%";
      slot.style.height="100%";

      if(no){
        const el=await makeCardEl(no,false);
        slot.appendChild(el);
        el.addEventListener("click",(e)=>{ e.stopPropagation(); onSlotTap(owner, zoneType, i); });
        attachLongPress(el, ()=>openViewer(no));
      }else{
        const empty=document.createElement("div");
        empty.className="zoneSlot";
        empty.style.opacity="0.35";
        empty.innerHTML=`<div class="placeholder">${zoneType}</div>`;
        slot.appendChild(empty);
        empty.addEventListener("click",(e)=>{ e.stopPropagation(); onSlotTap(owner, zoneType, i); });
      }
      cell.appendChild(slot);
    }
  };

  const renderShields = async (cells, shieldsArr) => {
    for(let i=0;i<SHIELDS;i++){
      const cell=cells[i];
      cell.innerHTML="";
      if(i < shieldsArr.length){
        const b=document.createElement("div");
        b.className="backCard outline";
        if(resolvedBack) b.style.backgroundImage=`url("${resolvedBack}")`;
        cell.appendChild(b);
      }
    }
  };

  const renderHand = async () => {
    handRow.innerHTML="";
    for(let i=0;i<state.you.hand.length;i++){
      const no=state.you.hand[i];
      const el=document.createElement("div");
      el.className="handCard" + (state.select.handIndex===i ? " selected" : "");
      const face=document.createElement("div");
      face.className="face";
      el.appendChild(face);

      const url=await getCardImg(no);
      if(url){
        face.style.backgroundImage=`url("${url}")`;
      }else{
        const ph=document.createElement("div");
        ph.className="placeholder";
        ph.textContent=cardName(no);
        el.appendChild(ph);
      }

      el.addEventListener("click",(e)=>{
        e.stopPropagation();
        state.select.handIndex=i;
        state.select.placeMode=null;
        selLabel.textContent = `選択中：${cardName(no)}（登場/設置を選んで置き先をタップ）`;
        renderHand(); // selection update
      });
      attachLongPress(el, ()=>openViewer(no));

      handRow.appendChild(el);
    }
  };

  const renderAll = async () => {
    renderHUD();
    renderCounts();

    await renderZone(youC, state.you.C, "YOU", "C");
    await renderZone(youE, state.you.E, "YOU", "E");
    await renderZone(enemyC, state.enemy.C, "ENEMY", "C");
    await renderZone(enemyE, state.enemy.E, "ENEMY", "E");

    await renderShields(youS, state.you.shields);
    await renderShields(enemyS, state.enemy.shields);

    await renderHand();
  };

  // ===== Viewer =====
  const openViewer = async (no) => {
    cardModalTitle.textContent = cardName(no);
    cardModalText.textContent  = cardText(no);
    const url=await getCardImg(no);
    if(url) cardModalImg.src=url + "?v=" + Date.now();
    else cardModalImg.removeAttribute("src");
    show(cardModal);
  };

  // ===== Selection actions =====
  const clearSelection = () => {
    state.select.handIndex=null;
    state.select.placeMode=null;
    selLabel.textContent="手札を選択してください";
  };

  btnCancelSel.addEventListener("click", ()=>{ clearSelection(); renderHand(); });

  btnPlayC.addEventListener("click", ()=>{
    if(state.select.handIndex==null) return;
    state.select.placeMode="C";
    selLabel.textContent = `登場(C)モード：置きたいC枠をタップ`;
  });

  btnPlayE.addEventListener("click", ()=>{
    if(state.select.handIndex==null) return;
    state.select.placeMode="E";
    selLabel.textContent = `設置(E)モード：置きたいE枠をタップ`;
  });

  // ===== Slot tap =====
  const onSlotTap = (owner, zoneType, idx) => {
    if(state.busy) return;

    // placing only on YOU in YOUR turn, MAIN phase
    if(owner==="YOU"){
      if(state.current!=="YOU"){
        log("相手ターン中は操作できません", "warn");
        return;
      }
      if(phase()!=="メイン"){
        log("メインフェイズで置けます（次のフェイズで進めてください）", "warn");
        return;
      }
      if(state.select.handIndex==null || !state.select.placeMode){
        log("手札を選び、登場(C)または設置(E)を押してください", "warn");
        return;
      }
      const mode=state.select.placeMode;
      if(zoneType!==mode){
        log(`いまは ${mode} モードです（${mode}段の枠をタップしてください）`, "warn");
        return;
      }
      const arr = (mode==="C") ? state.you.C : state.you.E;
      if(arr[idx]){
        log("その枠には既にカードがあります", "warn");
        return;
      }

      const cardNo = state.you.hand[state.select.handIndex];
      arr[idx]=cardNo;
      state.you.hand.splice(state.select.handIndex,1);
      log(`${mode==="C"?"登場":"設置"}：${cardName(cardNo)}`, "muted");

      clearSelection();
      renderAll();
      return;
    }

    // target selection (battle) は後で段階実装（今は土台優先）
    if(owner==="ENEMY"){
      // no-op for now
    }
  };

  // ===== Turn flow =====
  const resetAttacked = (side)=>{
    const p = (side==="YOU") ? state.you : state.enemy;
    p.attacked=[false,false,false];
  };

  const draw = (side, n=1) => {
    const p = (side==="YOU") ? state.you : state.enemy;
    for(let i=0;i<n;i++){
      if(p.deck.length===0){
        alert(`${side}敗北（デッキ切れ）`);
        return false;
      }
      p.hand.push(p.deck.shift());
    }
    return true;
  };

  const endCleanup = (side)=>{
    const p = (side==="YOU") ? state.you : state.enemy;
    while(p.hand.length > MAX_HAND){
      const c=p.hand.shift();
      p.wing.unshift(c);
    }
  };

  const nextPhase = async ()=>{
    if(state.busy) return;
    if(state.current!=="YOU") return;

    state.phaseIndex++;
    if(state.phaseIndex>=PHASES.length){
      await endTurn();
      return;
    }
    if(phase()==="ドロー") draw("YOU",1);
    if(phase()==="エンド") endCleanup("YOU");
    renderAll();
  };

  const endTurn = async ()=>{
    if(state.busy) return;

    if(state.current==="YOU"){
      endCleanup("YOU");
      state.current="ENEMY";
      state.phaseIndex=0;
      resetAttacked("ENEMY");
      renderAll();
      await runAI(); // AIが必ず終わる
      return;
    }else{
      endCleanup("ENEMY");
      state.current="YOU";
      state.turn++;
      state.phaseIndex=0;
      resetAttacked("YOU");
      renderAll();
    }
  };

  // ===== Minimal AI (止まらないのを最優先) =====
  const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

  const runAI = async ()=>{
    state.busy=true;
    try{
      // start->draw->main->end (battleは次段)
      await wait(200);
      state.phaseIndex = 1; // draw
      draw("ENEMY",1);
      renderAll();

      await wait(250);
      state.phaseIndex = 2; // main
      renderAll();

      // 1枚だけ置く（空きC優先→E）
      const p=state.enemy;
      if(p.hand.length>0){
        const cardNo=p.hand.shift();
        const ci=p.C.findIndex(x=>!x);
        const ei=p.E.findIndex(x=>!x);
        if(ci!==-1){ p.C[ci]=cardNo; log(`AI：登場 ${cardName(cardNo)}`, "muted"); }
        else if(ei!==-1){ p.E[ei]=cardNo; log(`AI：設置 ${cardName(cardNo)}`, "muted"); }
        else { p.hand.unshift(cardNo); }
      }
      renderAll();

      await wait(250);
      state.phaseIndex = 4; // end
      endCleanup("ENEMY");
      renderAll();

      await wait(180);
    }catch(e){
      log("AIエラー："+(e?.message||e), "warn");
    }
    state.busy=false;
    await endTurn(); // 必ずYOUへ戻す
  };

  // ===== Settings =====
  btnSettings.addEventListener("click", ()=>{
    fieldInput.value = localStorage.getItem(LS_FIELD)||"";
    backInput.value  = localStorage.getItem(LS_BACK)||"";
    cardJsonArea.value="";
    show(settingsModal);
  });

  btnLog.addEventListener("click", ()=>show(logModal));
  btnNextPhase.addEventListener("click", nextPhase);
  btnEndTurn.addEventListener("click", endTurn);

  saveFieldBtn.addEventListener("click", async ()=>{
    FIELD_URL = fieldInput.value.trim();
    localStorage.setItem(LS_FIELD, FIELD_URL);
    resolvedField = await resolveField();
    if(resolvedField){
      youMat.style.backgroundImage=`url("${resolvedField}")`;
      enemyMat.style.backgroundImage=`url("${resolvedField}")`;
      log("フィールド設定OK", "muted");
    }else{
      youMat.style.backgroundImage="";
      enemyMat.style.backgroundImage="";
      log("フィールド画像が見つかりません", "warn");
    }
    hide(settingsModal);
  });

  saveBackBtn.addEventListener("click", async ()=>{
    BACK_URL = backInput.value.trim();
    localStorage.setItem(LS_BACK, BACK_URL);
    resolvedBack = await resolveBack();
    log(resolvedBack ? "裏面設定OK" : "裏面未設定（黒で表示）", "muted");
    renderAll();
    hide(settingsModal);
  });

  loadJsonBtn.addEventListener("click", ()=>{
    const raw=cardJsonArea.value.trim();
    if(!raw) return;
    try{
      const parsed=JSON.parse(raw);
      for(const k of Object.keys(parsed)){
        const no=String(k).padStart(2,"0");
        CARD[no]=CARD[no]||{};
        const src=parsed[k]||{};
        if(src.name!=null) CARD[no].name=normalizeText(src.name);
        if(src.text!=null) CARD[no].text=normalizeText(src.text);
        if(src.rank!=null) CARD[no].rank=src.rank;
        if(src.atk!=null)  CARD[no].atk=src.atk;
        if(src.type!=null) CARD[no].type=src.type;
        delete cardImgCache[no]; // name changed -> image candidates change
      }
      saveCards(CARD);
      log("カードデータ反映OK", "muted");
      renderAll();
      hide(settingsModal);
    }catch(e){
      log("JSONが不正："+e.message, "warn");
    }
  });

  exportJsonBtn.addEventListener("click", ()=>{
    const out={};
    for(let i=1;i<=20;i++){
      const no=String(i).padStart(2,"0");
      out[no]={
        name: CARD[no]?.name||"",
        text: CARD[no]?.text||"",
        rank: CARD[no]?.rank??1,
        atk:  CARD[no]?.atk??500,
        type: CARD[no]?.type||"character"
      };
    }
    cardJsonArea.value = JSON.stringify(out,null,2);
    log("JSONを書き出しました（textareaに出力）", "muted");
  });

  // ===== Start game =====
  const startGame = async ()=>{
    computeCardW();
    log("JS起動OK", "muted");

    resolvedField = await resolveField();
    if(resolvedField){
      youMat.style.backgroundImage=`url("${resolvedField}")`;
      enemyMat.style.backgroundImage=`url("${resolvedField}")`;
    }
    resolvedBack = await resolveBack();

    // init
    state.you.deck = makeDeck();
    state.enemy.deck = makeDeck();

    state.you.shields = state.you.deck.splice(0, SHIELDS);
    state.enemy.shields = state.enemy.deck.splice(0, SHIELDS);

    state.you.hand = state.you.deck.splice(0, START_HAND);
    state.enemy.hand = state.enemy.deck.splice(0, START_HAND);

    state.you.C=[null,null,null]; state.you.E=[null,null,null];
    state.enemy.C=[null,null,null]; state.enemy.E=[null,null,null];
    resetAttacked("YOU"); resetAttacked("ENEMY");

    state.turn=1;
    state.phaseIndex=0;
    state.first = (Math.random()<0.5) ? "YOU" : "ENEMY";
    state.current = state.first;

    clearSelection();

    titleScreen.classList.remove("active");
    gameScreen.classList.add("active");

    log(`ゲーム開始：シールド${SHIELDS} / 初手${START_HAND}`, "muted");
    log(`先攻：${state.first}`, "muted");

    await renderAll();

    // 先攻がENEMYならAIを回して止まらない
    if(state.current==="ENEMY"){
      await runAI();
    }
  };

  startBtn.addEventListener("click", startGame);

  // piles viewer
  const openZoneList = (side, zoneName)=>{
    const p = (side==="YOU") ? state.you : state.enemy;
    const arr = (zoneName==="W") ? p.wing : p.out;
    log(`--- ${side} ${zoneName} (${arr.length}) ---`, "muted");
    arr.slice(0,40).forEach(no=>log(cardName(no), "muted"));
    show(logModal);
  };
  youW.addEventListener("click", ()=>openZoneList("YOU","W"));
  youO.addEventListener("click", ()=>openZoneList("YOU","O"));
  enemyW.addEventListener("click", ()=>openZoneList("ENEMY","W"));
  enemyO.addEventListener("click", ()=>openZoneList("ENEMY","O"));
})();