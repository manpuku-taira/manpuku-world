/* =========================================================
  app.js（確実にSTARTできる版）
  - boot（JS:...等）は常に非表示＆クリックを奪わない
  - タイトルロゴ /assets/title.PNG または title.png を確実に表示（両方試す）
  - STARTボタンが押せない環境でも「タイトル画面どこでもタップ」で開始
========================================================= */

const $ = (id)=>document.getElementById(id);

const el = {
  title: $("title"),
  game: $("game"),
  boot: $("boot"),

  titleArt: $("titleArt"),
  btnStart: $("btnStart"),

  chipTurn: $("chipTurn"),
  chipPhase: $("chipPhase"),
  chipActive: $("chipActive"),

  aiE: $("aiE"),
  aiC: $("aiC"),
  pC: $("pC"),
  pE: $("pE"),

  hand: $("hand"),
  aiHand: $("aiHand"),
  enemyHandLabel: $("enemyHandLabel"),

  fieldTop: $("fieldTop"),
  fieldBottom: $("fieldBottom"),

  btnNext: $("btnNext"),
  btnEnd: $("btnEnd"),
};

function hideBootHard(){
  // HTMLに「JS: ...」が残っていても確実に表示させない＆クリックを奪わせない
  if(el.boot){
    el.boot.textContent = "";
    el.boot.style.display = "none";
    el.boot.style.pointerEvents = "none";
  }
  // もし "JS:" という文字がどこかに出ていたら、見つけ次第消す（保険）
  document.querySelectorAll("body *").forEach(node=>{
    if(!(node instanceof HTMLElement)) return;
    if(node.id === "boot") return;
    const t = (node.textContent || "").trim();
    if(t.startsWith("JS:")){
      node.textContent = "";
      node.style.display = "none";
      node.style.pointerEvents = "none";
    }
  });
}

async function validateImage(url){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=> resolve(true);
    img.onerror = ()=> resolve(false);
    img.src = url;
  });
}

async function applyTitleLogo(){
  const candidates = ["/assets/title.PNG", "/assets/title.png"];
  let found = "";
  for(const u of candidates){
    // cache-bust（iOSで更新が効かない対策）
    const uu = `${u}?v=${Date.now()}`;
    // validateはキャッシュバスト無しで先に試す
    const ok = await validateImage(u);
    if(ok){ found = uu; break; }
  }

  if(el.titleArt){
    el.titleArt.style.backgroundImage = found ? `url("${found}")` : "";
  }

  // titleArtが効かないDOMでも確実に見せる：imgを自動挿入
  if(el.title){
    let img = $("titleLogoAuto");
    if(!img){
      img = document.createElement("img");
      img.id = "titleLogoAuto";
      img.alt = "TITLE";
      img.style.display = "none";
      img.style.maxWidth = "92%";
      img.style.maxHeight = "38vh";
      img.style.objectFit = "contain";
      img.style.margin = "0 auto 10px auto";
      img.style.pointerEvents = "none";
      const inner = $("titleInner") || el.title;
      inner.insertBefore(img, inner.firstChild);
    }
    if(found){
      img.src = found;
      img.style.display = "block";
    }else{
      img.style.display = "none";
      console.warn("タイトルロゴが見つかりません：/assets/title.PNG または /assets/title.png を確認してください");
    }
  }
}

function showTitle(){
  if(el.game) el.game.classList.remove("active");
  if(el.title) el.title.classList.add("active");
  hideBootHard();
}

function showGame(){
  if(el.title) el.title.classList.remove("active");
  if(el.game) el.game.classList.add("active");
  hideBootHard();
}

const state = {
  started:false,
  turn:1,
  phase:"START",
  active:"YOUR TURN",
};

function renderHUD(){
  if(el.chipTurn) el.chipTurn.textContent = `TURN ${state.turn}`;
  if(el.chipPhase) el.chipPhase.textContent = state.phase;
  if(el.chipActive) el.chipActive.textContent = state.active;
}

function renderSlots(container){
  if(!container) return;
  container.innerHTML = "";
  for(let i=0;i<3;i++){
    const d = document.createElement("div");
    d.className = "slot";
    const face = document.createElement("div");
    face.className = "face fallback";
    face.textContent = "EMPTY";
    d.appendChild(face);
    container.appendChild(d);
  }
}

function renderHands(){
  if(el.hand){
    el.hand.innerHTML = "";
    for(let i=0;i<5;i++){
      const c = document.createElement("div");
      c.className = "handCard";
      el.hand.appendChild(c);
    }
  }
  if(el.aiHand){
    el.aiHand.innerHTML = "";
    for(let i=0;i<5;i++){
      const c = document.createElement("div");
      c.className = "handBack";
      el.aiHand.appendChild(c);
    }
  }
  if(el.enemyHandLabel) el.enemyHandLabel.textContent = "ENEMY HAND ×5";
}

function startGame(){
  state.started = true;
  state.turn = 1;
  state.phase = "MAIN";
  state.active = "YOUR TURN";
  showGame();

  renderHUD();
  renderSlots(el.aiE);
  renderSlots(el.aiC);
  renderSlots(el.pC);
  renderSlots(el.pE);
  renderHands();

  // フィールド背景（任意）：存在すれば表示
  // /assets/field.* がある場合は、ここで差し替え可能（今は必須ではないので省略）
}

function bindStartGuaranteed(){
  const go = ()=>{
    if(state.started) return;
    startGame();
  };

  // STARTボタン
  if(el.btnStart){
    el.btnStart.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      go();
    }, {passive:false});
  }

  // タイトル画面どこでも開始（必ず効く）
  if(el.title){
    el.title.addEventListener("click", ()=> go(), {passive:true});
    el.title.addEventListener("touchend", ()=> go(), {passive:true});
  }
}

function bindHUDButtons(){
  if(el.btnNext){
    el.btnNext.addEventListener("click", ()=>{
      if(!state.started) return;
      state.phase = (state.phase==="MAIN") ? "BATTLE" : (state.phase==="BATTLE") ? "END" : "MAIN";
      renderHUD();
    }, {passive:true});
  }
  if(el.btnEnd){
    el.btnEnd.addEventListener("click", ()=>{
      if(!state.started) return;
      state.turn += 1;
      state.phase = "MAIN";
      renderHUD();
    }, {passive:true});
  }
}

async function init(){
  hideBootHard();
  showTitle();
  await applyTitleLogo();
  bindStartGuaranteed();
  bindHUDButtons();

  // 万一、他スクリプトが boot を復活させても消す（確実性優先）
  setInterval(hideBootHard, 500);
}

document.addEventListener("DOMContentLoaded", init);