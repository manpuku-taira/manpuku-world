/* =========================================================
   MANPUKU WORLD - Stable Restore Build
   - 画像が無くてもプレイ確認可（枠は必ず出す）
   - フィールド画像：1枚を上下に表示（上は逆向き）
   - 手札：No/カード名の文字を表示しない（画像のみ）
   - 長押し：カード詳細（名前/効果）
   - 20種類×2枚の40枚デッキ
   ========================================================= */

const $ = (s)=>document.querySelector(s);
const elTitle = $("#titleScreen");
const elGame  = $("#gameScreen");
const startBtn= $("#startBtn");

const btnNext = $("#btnNextPhase");
const btnEnd  = $("#btnEndTurn");
const btnLog  = $("#btnLog");

const turnBadge = $("#turnBadge");
const phaseBadge = $("#phaseBadge");
const whoBadge = $("#whoBadge");

const handEl = $("#hand");

const modalCard = $("#modalCard");
const modalCardClose = $("#modalCardClose");
const modalCardTitle = $("#modalCardTitle");
const modalCardImg = $("#modalCardImg");
const modalCardText = $("#modalCardText");

const modalLog = $("#modalLog");
const modalLogClose = $("#modalLogClose");
const logBox = $("#logBox");

const fieldTop = document.querySelector(".fieldTop");
const fieldBottom = document.querySelector(".fieldBottom");

const youDeckCount = $("#youDeckCount");
const enemyDeckCount = $("#enemyDeckCount");
const youWingCount = $("#youWingCount");
const enemyWingCount = $("#enemyWingCount");
const youOutsideCount = $("#youOutsideCount");
const enemyOutsideCount = $("#enemyOutsideCount");

const youShieldEl = document.querySelector('[data-zone="you_shield"]');
const enemyShieldEl = document.querySelector('[data-zone="enemy_shield"]');

const enemyHandFan = $("#enemyHandFan");
const enemyHandCount = $("#enemyHandCount");

/* --------- GAME DATA (最低限・後で差し替えOK) --------- */
/* ※あなたの「効果文まとめ」は保留との事なので、ここは最小のデモデータにしてあります */
const CARD_MASTER = Array.from({length:20}, (_,i)=>({
  no: i+1,
  name: `カード${i+1}`,
  type: (i%3===0) ? "character" : (i%3===1) ? "effect" : "item",
  effects: []
}));

/* 20種×2枚 = 40枚（Noのみ持つ） */
function buildStarterDeck(){
  const deck = [];
  for(let n=1;n<=20;n++){
    deck.push({no:n});
    deck.push({no:n});
  }
  shuffle(deck);
  return deck;
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j = (Math.random()*(i+1))|0;
    [a[i],a[j]]=[a[j],a[i]];
  }
}

/* --------- IMAGE RESOLUTION ---------
   ・jpg/png両対応
   ・二重拡張子 .png.JPG なども許容（そのままファイル名を使う）
   ・最終的に「表示できたURL」を覚える（localStorage）
------------------------------------- */

const LS_KEY = "mw_image_map_v2";
let imageMap = loadImageMap();

/* 例：01_班目プロデューサー.png.JPG のようなケースに対応
   ここでは「候補リスト」を作って順番に試す */
function pad2(n){ return String(n).padStart(2,"0"); }

function makeCardFileCandidates(no){
  const p = pad2(no);
  // 画像が手元で "12_班目プロデューサー.png.JPG" みたいに保存される前提に寄せる
  // ただし、こちらは確実に知らないので、複数候補を試す
  const candidates = [];

  // 1) ユーザーが設定したURLがあればそれを最優先
  if(imageMap.cards && imageMap.cards[p]) candidates.push(imageMap.cards[p]);

  // 2) 一般的候補（カード名は未知なので No_*.ext を全部は探索できない）
  //    → そこで「Noだけ」の画像も許容する（01.jpg / 01.png など）
  candidates.push(`/assets/cards/${p}.jpg`);
  candidates.push(`/assets/cards/${p}.png`);
  candidates.push(`/assets/cards/${p}.jpeg`);
  candidates.push(`/assets/cards/${p}.png.jpg`);
  candidates.push(`/assets/cards/${p}.png.JPG`);
  candidates.push(`/assets/cards/${p}.jpg.png`);

  return candidates;
}

function makeFieldCandidates(){
  const c = [];
  if(imageMap.field) c.push(imageMap.field);

  // よくある候補を広めに
  c.push(`/assets/field.png`);
  c.push(`/assets/field.jpg`);
  c.push(`/assets/field.jpeg`);
  c.push(`/assets/field.png.jpg`);
  c.push(`/assets/Field.png`);
  c.push(`/assets/Field.jpg`);
  c.push(`/assets/field.PNG`);
  c.push(`/assets/Field.PNG`);
  c.push(`/assets/field.png.JPG`);
  c.push(`/assets/field.png.JPEG`);
  return c;
}

function loadImageMap(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { field:"", cards:{} };
    const obj = JSON.parse(raw);
    if(!obj.cards) obj.cards = {};
    return obj;
  }catch(e){
    return { field:"", cards:{} };
  }
}

function saveImageMap(){
  localStorage.setItem(LS_KEY, JSON.stringify(imageMap));
}

/* URL候補を順にimgロードして「最初に成功したURL」を返す */
function resolveFirstWorkingURL(candidates, timeoutMs=1200){
  return new Promise((resolve)=>{
    let done = false;
    const tryOne = (idx)=>{
      if(done) return;
      if(idx>=candidates.length){ done=true; resolve(""); return; }
      const url = candidates[idx];
      const img = new Image();
      let t = setTimeout(()=>{
        img.onload = null; img.onerror = null;
        tryOne(idx+1);
      }, timeoutMs);
      img.onload = ()=>{
        if(done) return;
        clearTimeout(t);
        done=true;
        resolve(url);
      };
      img.onerror = ()=>{
        clearTimeout(t);
        tryOne(idx+1);
      };
      img.src = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now(); // cache bust
    };
    tryOne(0);
  });
}

/* --------- UI HELPERS --------- */
const LOG = [];
function log(msg, type=""){
  const line = {msg, type, t:Date.now()};
  LOG.push(line);
  if(LOG.length>300) LOG.shift();
  renderLog();
}

function renderLog(){
  if(!logBox) return;
  logBox.innerHTML = "";
  for(const l of LOG.slice().reverse()){
    const div = document.createElement("div");
    div.className = "logLine" + (l.type ? ` ${l.type}` : "");
    div.textContent = l.msg;
    logBox.appendChild(div);
  }
}

/* Long-press */
function attachLongPress(el, onLong, ms=420){
  let timer = null;
  let moved = false;

  const clear = ()=>{
    if(timer){ clearTimeout(timer); timer=null; }
  };

  el.addEventListener("touchstart", ()=>{
    moved = false;
    clear();
    timer = setTimeout(()=>{ if(!moved) onLong(); }, ms);
  }, {passive:true});
  el.addEventListener("touchmove", ()=>{ moved = true; clear(); }, {passive:true});
  el.addEventListener("touchend", clear, {passive:true});
  el.addEventListener("touchcancel", clear, {passive:true});

  // desktop fallback
  el.addEventListener("mousedown", ()=>{
    moved=false; clear();
    timer=setTimeout(()=>{ if(!moved) onLong(); }, ms);
  });
  el.addEventListener("mousemove", ()=>{ moved=true; });
  el.addEventListener("mouseup", clear);
  el.addEventListener("mouseleave", clear);
}

/* --------- GAME STATE --------- */
let state = null;

function newGame(){
  const deckYou = buildStarterDeck();
  const deckEnemy = buildStarterDeck();

  state = {
    turn: 1,
    phaseIndex: 0,
    phases: ["START","MAIN","BATTLE","END"],
    current: Math.random()<0.5 ? "YOU" : "ENEMY",
    you: {
      deck: deckYou,
      hand: [],
      shield: [],
      c: [null,null,null],
      e: [null,null,null],
      wing: [],
      outside: []
    },
    enemy: {
      deck: deckEnemy,
      hand: [],
      shield: [],
      c: [null,null,null],
      e: [null,null,null],
      wing: [],
      outside: []
    },
    selectedHandIndex: null
  };

  LOG.length = 0;
  log("JS起動OK");
  log("対戦画面：表示OK");
  log(`先攻：${state.current === "YOU" ? "YOU" : "ENEMY"}`);

  // shield: 3 face-down from deck (as black cards)
  for(let i=0;i<3;i++){
    state.you.shield.push(drawFrom(state.you.deck));
    state.enemy.shield.push(drawFrom(state.enemy.deck));
  }
  // opening hand: 4
  for(let i=0;i<4;i++){
    state.you.hand.push(drawFrom(state.you.deck));
    state.enemy.hand.push(drawFrom(state.enemy.deck));
  }

  syncCounts();
  renderShields();
  renderEnemyHandBacks();
  renderHand();
  updateHUD();

  // if enemy starts -> simple AI perform then pass
  if(state.current === "ENEMY"){
    setTimeout(()=>enemyAITurnStart(), 250);
  }
}

/* draw helper */
function drawFrom(deck){
  if(deck.length===0) return null;
  return deck.pop();
}

function updateHUD(){
  turnBadge.textContent = `TURN ${state.turn}`;
  phaseBadge.textContent = state.phases[state.phaseIndex];
  whoBadge.textContent = state.current;
  whoBadge.classList.toggle("subtle", false);
}

function syncCounts(){
  youDeckCount.textContent = state.you.deck.length;
  enemyDeckCount.textContent = state.enemy.deck.length;
  youWingCount.textContent = state.you.wing.length;
  enemyWingCount.textContent = state.enemy.wing.length;
  youOutsideCount.textContent = state.you.outside.length;
  enemyOutsideCount.textContent = state.enemy.outside.length;
  enemyHandCount.textContent = state.enemy.hand.filter(Boolean).length;
}

function renderShields(){
  youShieldEl.innerHTML = "";
  enemyShieldEl.innerHTML = "";

  for(let i=0;i<3;i++){
    const y = document.createElement("div");
    y.className = "shieldCard";
    if(!state.you.shield[i]) y.style.opacity = "0.15";
    youShieldEl.appendChild(y);

    const e = document.createElement("div");
    e.className = "shieldCard";
    if(!state.enemy.shield[i]) e.style.opacity = "0.15";
    enemyShieldEl.appendChild(e);
  }
}

function renderEnemyHandBacks(){
  enemyHandFan.innerHTML = "";
  const count = state.enemy.hand.filter(Boolean).length;
  for(let i=0;i<count;i++){
    const b = document.createElement("div");
    b.className = "enemyBack";
    enemyHandFan.appendChild(b);
  }
}

/* --------- ZONES RENDER (C/E slots) --------- */
function ensureSlots(){
  // create 3 slots per zone container if not created
  document.querySelectorAll(".slots").forEach(container=>{
    if(container.children.length===0){
      for(let i=0;i<3;i++){
        const s = document.createElement("div");
        s.className = "slot";
        s.dataset.index = String(i);
        const img = document.createElement("div");
        img.className = "img";
        s.appendChild(img);
        container.appendChild(s);
      }
    }
  });
}

function renderZones(){
  ensureSlots();

  renderZoneSet("you_c", state.you.c);
  renderZoneSet("you_e", state.you.e);
  renderZoneSet("enemy_c", state.enemy.c, true);
  renderZoneSet("enemy_e", state.enemy.e, true);
}

function renderZoneSet(zoneName, arr, isEnemy=false){
  const container = document.querySelector(`[data-zone="${zoneName}"]`);
  if(!container) return;

  [...container.children].forEach((slotEl, idx)=>{
    const card = arr[idx];
    slotEl.classList.toggle("selected", false);
    const img = slotEl.querySelector(".img");
    if(!card){
      img.style.backgroundImage = "";
      img.style.opacity = "0.0";
      slotEl.style.borderColor = "rgba(89,242,255,.18)";
      return;
    }
    img.style.opacity = "1.0";
    // enemy cards are hidden (face-down black) for now to keep rules safe
    if(isEnemy){
      img.style.backgroundImage = "";
      img.style.backgroundColor = "rgba(0,0,0,.88)";
      img.style.filter = "none";
      slotEl.style.borderColor = "rgba(233,236,255,.22)";
    }else{
      img.style.backgroundColor = "transparent";
      slotEl.style.borderColor = "rgba(89,242,255,.18)";
      setCardImageTo(img, card.no);
    }
  });
}

/* --------- HAND RENDER --------- */
function renderHand(){
  handEl.innerHTML = "";
  state.you.hand.forEach((card, idx)=>{
    if(!card) return;
    const h = document.createElement("div");
    h.className = "handCard";
    if(state.selectedHandIndex === idx) h.classList.add("selected");

    const img = document.createElement("div");
    img.className = "img";
    h.appendChild(img);

    // 手札は「文字表示しない」ので、画像のみ
    // 画像が無い場合は missing 表示
    setCardImageTo(img, card.no).then(ok=>{
      if(!ok) h.classList.add("missing");
    });

    h.addEventListener("click", ()=>{
      if(state.current !== "YOU") return;
      state.selectedHandIndex = (state.selectedHandIndex === idx) ? null : idx;
      renderHand();
    });

    attachLongPress(h, ()=>{
      openCardModal(card.no, false);
    });

    handEl.appendChild(h);
  });
}

/* --------- IMAGE SETTERS --------- */
async function setCardImageTo(imgEl, no){
  const candidates = makeCardFileCandidates(no);
  const url = await resolveFirstWorkingURL(candidates);
  if(!url){
    imgEl.style.backgroundImage = "";
    return false;
  }
  // remember the first working url as mapping for this no
  const key = pad2(no);
  imageMap.cards[key] = url;
  saveImageMap();

  imgEl.style.backgroundImage = `url("${url}")`;
  return true;
}

async function applyFieldImage(){
  const url = await resolveFirstWorkingURL(makeFieldCandidates(), 1400);
  if(!url){
    log("NG フィールド画像が見つかりません（assets/field.* を確認）", "warn");
    // keep dark background, but game works
    fieldTop.style.backgroundImage = "";
    fieldBottom.style.backgroundImage = "";
    return;
  }
  imageMap.field = url;
  saveImageMap();
  fieldTop.style.backgroundImage = `url("${url}")`;
  fieldBottom.style.backgroundImage = `url("${url}")`;
  log(`OK フィールド：${url}`);
}

/* --------- INTERACTION: PLAY FROM HAND TO ZONE --------- */
function bindZoneInteractions(){
  // place to YOU C or YOU E only
  document.querySelectorAll(".slots").forEach(container=>{
    container.addEventListener("click", async (ev)=>{
      const zone = container.dataset.zone; // you_c etc
      if(!zone || !zone.startsWith("you_")) return;
      if(state.current !== "YOU") return;

      const slotEl = ev.target.closest(".slot");
      if(!slotEl) return;
      const idx = Number(slotEl.dataset.index);

      // long press on field card -> open modal
      const isC = zone === "you_c";
      const isE = zone === "you_e";

      // if no card selected, longpress already exists, but click can open if card exists
      const arr = isC ? state.you.c : isE ? state.you.e : null;
      if(!arr) return;

      const existing = arr[idx];

      if(state.selectedHandIndex == null){
        if(existing){
          openCardModal(existing.no, false);
        }
        return;
      }

      // place selected hand card if empty
      if(existing){
        log("そこにはすでにカードがあります", "muted");
        return;
      }

      const handCard = state.you.hand[state.selectedHandIndex];
      if(!handCard) return;

      // simple rule: character -> C, item/effect -> E
      const meta = CARD_MASTER[handCard.no-1];
      if(isC && meta.type !== "character"){
        log("ここはキャラクター枠です（E枠へ）", "muted");
        return;
      }
      if(isE && meta.type === "character"){
        log("ここはE（エフェクト/アイテム）枠です（C枠へ）", "muted");
        return;
      }

      arr[idx] = handCard;
      state.you.hand[state.selectedHandIndex] = null;
      state.selectedHandIndex = null;

      log(`配置：${meta.name}`);
      renderHand();
      renderZones();
      syncCounts();
    });

    // long-press slot for details (YOU side only)
    [...container.children].forEach(slotEl=>{
      attachLongPress(slotEl, ()=>{
        const zone = container.dataset.zone;
        if(!zone || !zone.startsWith("you_")) return;
        const idx = Number(slotEl.dataset.index);
        const arr = zone==="you_c" ? state.you.c : zone==="you_e" ? state.you.e : null;
        const card = arr ? arr[idx] : null;
        if(card) openCardModal(card.no, false);
      });
    });
  });
}

/* --------- MODALS --------- */
function openCardModal(no, isHidden){
  const meta = CARD_MASTER[no-1] || {name:`カード${no}`, effects:[]};
  modalCardTitle.textContent = meta.name;

  // image
  modalCardImg.src = ""; // reset
  modalCardImg.alt = meta.name;

  // hidden card uses black
  if(isHidden){
    modalCardImg.style.background = "rgba(0,0,0,.88)";
    modalCardImg.removeAttribute("src");
  }else{
    modalCardImg.style.background = "rgba(6,8,14,.55)";
    // try resolved mapping; if missing then show blank
    const key = pad2(no);
    const url = imageMap.cards[key] || "";
    if(url) modalCardImg.src = url;
  }

  // text (Noは出さない方針)
  const lines = [];
  lines.push(`タイプ：${meta.type || "unknown"}`);
  if(meta.effects && meta.effects.length){
    lines.push("");
    for(const e of meta.effects) lines.push(`・${e}`);
  }else{
    lines.push("");
    lines.push("（効果テキスト未登録）");
  }
  modalCardText.textContent = lines.join("\n");

  modalCard.classList.add("show");
}

function closeCardModal(){ modalCard.classList.remove("show"); }
function openLogModal(){ modalLog.classList.add("show"); }
function closeLogModal(){ modalLog.classList.remove("show"); }

/* --------- PHASE/TURN --------- */
function nextPhase(){
  if(!state) return;
  state.phaseIndex = (state.phaseIndex + 1) % state.phases.length;
  updateHUD();
  log(`PHASE: ${state.phases[state.phaseIndex]}`, "muted");
}

function endTurn(){
  if(!state) return;

  // force end phase to END
  state.phaseIndex = 0;

  // swap
  if(state.current === "YOU"){
    state.current = "ENEMY";
    state.turn += 1;
    updateHUD();
    log("ENEMY TURN", "muted");
    setTimeout(()=>enemyAITurnStart(), 250);
  }else{
    state.current = "YOU";
    updateHUD();
    log("YOU TURN", "muted");
  }

  // redraw UI
  renderZones();
  renderHand();
  renderShields();
  renderEnemyHandBacks();
  syncCounts();
}

function drawFor(who){
  const p = (who==="YOU") ? state.you : state.enemy;
  const c = drawFrom(p.deck);
  if(!c){ log(`${who}: デッキ切れ`, "warn"); return; }
  p.hand.push(c);
  if(who==="YOU") renderHand();
  syncCounts();
  if(who==="ENEMY") renderEnemyHandBacks();
}

/* --------- ENEMY AI (最低限) --------- */
function enemyAITurnStart(){
  // enemy draw 1
  drawFor("ENEMY");

  // AI: if has a character and has empty C slot -> play first
  const enemy = state.enemy;
  const firstCharIndex = enemy.hand.findIndex(h=>{
    if(!h) return false;
    const meta = CARD_MASTER[h.no-1];
    return meta && meta.type === "character";
  });
  if(firstCharIndex >= 0){
    const empty = enemy.c.findIndex(x=>!x);
    if(empty >= 0){
      enemy.c[empty] = enemy.hand[firstCharIndex];
      enemy.hand[firstCharIndex] = null;
      log("ENEMY: キャラクターを配置", "muted");
    }
  }

  // end enemy turn automatically (so game never freezes)
  setTimeout(()=>{
    renderZones();
    renderShields();
    syncCounts();
    renderEnemyHandBacks();
    endTurn();
  }, 400);
}

/* --------- BOOT --------- */
function showGame(){
  elTitle.classList.remove("active");
  elGame.classList.add("active");
}

startBtn.addEventListener("click", async ()=>{
  showGame();
  ensureSlots();
  renderZones();
  bindZoneInteractions();

  await applyFieldImage(); // field load (works or fails safely)
  newGame();
  renderZones();
});

btnNext.addEventListener("click", ()=>nextPhase());
btnEnd.addEventListener("click", ()=>{
  if(state.current !== "YOU"){
    log("相手ターン中です", "muted");
    return;
  }
  endTurn();
});

btnLog.addEventListener("click", ()=>openLogModal());

modalCardClose.addEventListener("click", closeCardModal);
modalLogClose.addEventListener("click", closeLogModal);
modalCard.querySelector(".modalBack").addEventListener("click", closeCardModal);
modalLog.querySelector(".modalBack").addEventListener("click", closeLogModal);

/* 初期ログ（ゲーム起動確認） */
log("READY");
log("タイトルの START を押してください", "muted");