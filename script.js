/* Manpuku World - Single File Prototype (Web)
   - Enemy/You full field visible (top/bottom)
   - Shield 3 (back cards)
   - Hand 4 at start
   - Turn/phase indicator
   - Simple AI (A: play whatever -> attack -> end)
   - Long press: card detail
   - Wing/Outside list (modal via tap on piles)
   - Image auto-detect + manual mapping
   - Card text data paste (JSON) supported
*/

(() => {
  const $ = (id) => document.getElementById(id);

  // Screens
  const titleScreen = $("titleScreen");
  const gameScreen = $("gameScreen");
  const startBtn = $("startBtn");

  // HUD
  const turnChip = $("turnChip");
  const phaseChip = $("phaseChip");
  const whoChip = $("whoChip");
  const btnNextPhase = $("btnNextPhase");
  const btnEndTurn = $("btnEndTurn");
  const btnLog = $("btnLog");
  const btnSettings = $("btnSettings");

  // Hand
  const handRow = $("handRow");

  // Piles counts
  const youDeckCount = $("youDeckCount");
  const enemyDeckCount = $("enemyDeckCount");
  const youWingCount = $("youWingCount");
  const enemyWingCount = $("enemyWingCount");
  const youOutCount = $("youOutCount");
  const enemyOutCount = $("enemyOutCount");
  const enemyHandCount = $("enemyHandCount");

  // Mats
  const enemyMat = $("enemyMat");
  const youMat = $("youMat");

  // Shields cells
  const youSCells = [$("youS0"), $("youS1"), $("youS2")];
  const enemySCells = [$("enemyS0"), $("enemyS1"), $("enemyS2")];

  // Zones (each is a single slot cell, but we treat as three slots across row by order)
  const youCCells = [$("youC"), $("youC2"), $("youC3")];
  const youECells = [$("youE"), $("youE2"), $("youE3")];
  const enemyCCells = [$("enemyC"), $("enemyC2"), $("enemyC3")];
  const enemyECells = [$("enemyE"), $("enemyE2"), $("enemyE3")];

  // Piles clickable
  const youW = $("youW");
  const youO = $("youO");
  const enemyW = $("enemyW");
  const enemyO = $("enemyO");

  // Modals
  const cardModal = $("cardModal");
  const cardModalTitle = $("cardModalTitle");
  const cardModalImg = $("cardModalImg");
  const cardModalText = $("cardModalText");

  const logModal = $("logModal");
  const logBox = $("logBox");

  const settingsModal = $("settingsModal");
  const fieldInput = $("fieldInput");
  const saveFieldBtn = $("saveFieldBtn");
  const backInput = $("backInput");
  const saveBackBtn = $("saveBackBtn");
  const autoScanBtn = $("autoScanBtn");
  const openMapBtn = $("openMapBtn");
  const mapList = $("mapList");
  const cardJsonArea = $("cardJsonArea");
  const loadJsonBtn = $("loadJsonBtn");
  const exportJsonBtn = $("exportJsonBtn");

  // Arrow overlay (future)
  const arrowLayer = $("arrowLayer");

  // ===== Constants =====
  const PHASES = ["スタート", "ドロー", "メイン", "バトル", "エンド"];
  const START_HAND = 4;
  const SHIELDS = 3;
  const STAGE_SLOTS = 3;
  const DECK_SIZE = 40; // 20種×2枚想定（仮）
  const MAX_HAND = 7;

  // ===== Utility =====
  const log = (msg, type = "normal") => {
    const div = document.createElement("div");
    div.className = "logLine" + (type === "warn" ? " warn" : type === "muted" ? " muted" : "");
    div.textContent = msg;
    logBox.prepend(div);
  };

  const showModal = (el) => el.classList.add("show");
  const hideModal = (el) => el.classList.remove("show");

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) {
      hideModal($(t.dataset.close));
    }
  });

  // ===== Local Storage Keys =====
  const LS_FIELD = "mw_field_url";
  const LS_BACK = "mw_back_url";
  const LS_IMG_MAP = "mw_img_map_v2";
  const LS_CARD_DATA = "mw_card_data_v2";

  // ===== Card Registry (placeholder; will be overwritten by pasted JSON or our later OCR draft) =====
  // NOTE: "または" / "できる" ルールは、データ作成時点で適用する方針（このコード側でも置換を軽く掛けます）
  const defaultCardData = (() => {
    const obj = {};
    for (let i = 1; i <= 20; i++) {
      const no = String(i).padStart(2, "0");
      obj[no] = {
        name: `カード${i}`,
        titleTag: "",
        tags: [],
        rank: 1,
        atk: 500,
        type: "character", // character / effect / item / permanent
        text: "（未登録）長押しで確認。カードテキストは後ほど反映します。"
      };
    }
    // 既に康臣さんから確定で貰っている一部の名称だけ反映（確定情報）
    // ※他の19枚分テキストは「次」で私が下書きを入れます（誤読チェック用）
    obj["05"].name = "統括AI  タータ";
    obj["08"].name = "組織の男　手形";
    obj["13"].name = "超弩級砲塔列車スタマックス氏";
    obj["15"].name = "桜蘭の陰陽術 - 闘 -";
    // タイトルタグなど（確定分）
    obj["07"].titleTag = "恋愛疾患特殊医療機a-xブラスター";
    obj["17"].titleTag = "Eバリアーズ";
    return obj;
  })();

  const normalizeText = (s) => {
    if (!s) return s;
    return String(s)
      .replace(/又は/g, "または")
      .replace(/出来る/g, "できる");
  };

  const loadCardData = () => {
    try {
      const raw = localStorage.getItem(LS_CARD_DATA);
      if (raw) {
        const parsed = JSON.parse(raw);
        // normalize
        for (const k of Object.keys(parsed)) {
          if (parsed[k]?.text) parsed[k].text = normalizeText(parsed[k].text);
          if (parsed[k]?.name) parsed[k].name = normalizeText(parsed[k].name);
        }
        return parsed;
      }
    } catch {}
    return JSON.parse(JSON.stringify(defaultCardData));
  };

  const saveCardData = (data) => {
    localStorage.setItem(LS_CARD_DATA, JSON.stringify(data));
  };

  let CARD = loadCardData();

  // ===== Image mapping =====
  const loadImgMap = () => {
    try {
      const raw = localStorage.getItem(LS_IMG_MAP);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {}; // { "01": "/assets/cards/01_xxx.jpg" }
  };
  const saveImgMap = (m) => localStorage.setItem(LS_IMG_MAP, JSON.stringify(m));
  let IMG_MAP = loadImgMap();

  // Field & Back URLs
  const loadFieldUrl = () => localStorage.getItem(LS_FIELD) || "";
  const saveFieldUrl = (u) => localStorage.setItem(LS_FIELD, u || "");
  const loadBackUrl = () => localStorage.getItem(LS_BACK) || "";
  const saveBackUrl = (u) => localStorage.setItem(LS_BACK, u || "");
  let FIELD_URL = loadFieldUrl();
  let BACK_URL = loadBackUrl();

  // ===== Layout sizing =====
  const computeCardW = () => {
    // field width min is viewport; set card width by shorter side
    const w = window.innerWidth;
    const h = window.innerHeight;
    // want 3 columns of cards inside a cell row; base on width
    const base = Math.max(62, Math.min(88, Math.floor(Math.min(w, h) / 7)));
    document.documentElement.style.setProperty("--cardW", base + "px");
  };
  window.addEventListener("resize", computeCardW);

  // ===== Game State =====
  const makeDeck = () => {
    // 20 kinds x 2 = 40
    const deck = [];
    for (let i = 1; i <= 20; i++) {
      const no = String(i).padStart(2, "0");
      deck.push(no);
      deck.push(no);
    }
    return shuffle(deck);
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const state = {
    turn: 1,
    phaseIndex: 0,
    current: "YOU", // "YOU" or "ENEMY"
    first: "YOU", // who starts
    you: {
      deck: [],
      hand: [],
      wing: [],
      out: [],
      shields: [],
      stageC: Array(STAGE_SLOTS).fill(null), // card no
      stageE: Array(STAGE_SLOTS).fill(null),
      attacked: Array(STAGE_SLOTS).fill(false),
    },
    enemy: {
      deck: [],
      hand: [],
      wing: [],
      out: [],
      shields: [],
      stageC: Array(STAGE_SLOTS).fill(null),
      stageE: Array(STAGE_SLOTS).fill(null),
      attacked: Array(STAGE_SLOTS).fill(false),
    },
    selection: {
      handIndex: null,
      mode: null, // "playC" | "playE" | "attackFrom"
      fromSlot: null,
    },
    busy: false
  };

  // ===== Asset helpers =====
  const tryLoadImage = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
    });

  const candidatesForField = () => ([
    FIELD_URL,
    "/assets/field.png",
    "/assets/field.jpg",
    "/assets/field.jpeg",
    "/assets/field.PNG",
    "/assets/field.JPG",
    "/assets/field.png.jpg",
    "/assets/field.jpg.png",
  ].filter(Boolean));

  const candidatesForBack = () => ([
    BACK_URL,
    "/assets/back.png",
    "/assets/back.jpg",
    "/assets/back.jpeg",
    "/assets/back.PNG",
    "/assets/back.JPG",
  ].filter(Boolean));

  const nameSafe = (s) =>
    String(s || "")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const candidatesForCard = (no2, cardName) => {
    const no = String(no2).padStart(2, "0");
    const nm = nameSafe(cardName);
    const base = "/assets/cards/";
    const list = [];

    // Manual map first
    if (IMG_MAP[no]) list.push(IMG_MAP[no]);

    // Most common patterns
    const stems = [
      `${no}_${nm}`,
      `${no}-${nm}`,
      `${no}${nm}`,
      `${no}`,
    ];

    const exts = [
      ".png", ".jpg", ".jpeg",
      ".PNG", ".JPG", ".JPEG",
      ".png.JPG", ".png.jpg", ".jpg.png", ".JPG.png",
      ".jpg.JPG", ".JPG.JPG"
    ];

    for (const st of stems) {
      for (const ex of exts) list.push(base + st + ex);
    }
    // Also tolerate the example: 12_班目プロデューサー.png.JPG (double ext)
    return Array.from(new Set(list));
  };

  let resolvedBackUrl = ""; // resolved one
  const resolveBackUrl = async () => {
    const c = candidatesForBack();
    for (const u of c) {
      if (await tryLoadImage(u)) return u;
    }
    return ""; // fallback to gradient
  };

  let resolvedFieldUrl = "";
  const resolveFieldUrl = async () => {
    const c = candidatesForField();
    for (const u of c) {
      if (await tryLoadImage(u)) return u;
    }
    return "";
  };

  const resolveCardImg = async (no) => {
    const no2 = String(no).padStart(2, "0");
    const cd = CARD[no2] || { name: `カード${parseInt(no2, 10)}` };
    const cands = candidatesForCard(no2, cd.name);
    for (const u of cands) {
      if (await tryLoadImage(u)) return u;
    }
    return "";
  };

  // cache
  const cardImgCache = {}; // no -> url or ""
  const getCardImg = async (no) => {
    const k = String(no).padStart(2, "0");
    if (k in cardImgCache) return cardImgCache[k];
    const u = await resolveCardImg(k);
    cardImgCache[k] = u;
    return u;
  };

  // ===== Rendering =====
  const clearCell = (cell) => { cell.innerHTML = ""; };

  const makeZoneSlot = (cardNo, owner, zone, index) => {
    const el = document.createElement("div");
    el.className = "zoneSlot";
    if (cardNo) {
      const face = document.createElement("div");
      face.className = "cardFace";
      el.appendChild(face);
      // fill image async
      getCardImg(cardNo).then((u) => {
        if (u) face.style.backgroundImage = `url("${u}")`;
        else face.style.background = "linear-gradient(180deg, rgba(0,0,0,.35), rgba(10,12,22,.85))";
      });
    }
    // interactions
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onZoneClick(owner, zone, index);
    });
    attachLongPress(el, () => {
      if (!cardNo) return;
      openCardViewer(cardNo);
    });
    return el;
  };

  const renderZoneRow = (cells, arr, owner, zoneName) => {
    for (let i = 0; i < STAGE_SLOTS; i++) {
      const cell = cells[i];
      clearCell(cell);
      const slot = makeZoneSlot(arr[i], owner, zoneName, i);
      cell.appendChild(slot);
    }
  };

  const renderShields = async (cells, shieldsArr) => {
    const back = resolvedBackUrl;
    for (let i = 0; i < SHIELDS; i++) {
      const cell = cells[i];
      clearCell(cell);
      const count = shieldsArr.length;
      // each shield cell shows ONE card if exists, else empty
      if (i < count) {
        const b = document.createElement("div");
        b.className = "backCard outline";
        if (back) b.style.backgroundImage = `url("${back}")`;
        cell.appendChild(b);
      } else {
        // empty
      }
    }
  };

  const renderHand = async () => {
    handRow.innerHTML = "";
    const you = state.you;
    you.hand.forEach((no, idx) => {
      const el = document.createElement("div");
      el.className = "handCard";
      const face = document.createElement("div");
      face.className = "cardFace";
      el.appendChild(face);

      getCardImg(no).then((u) => {
        if (u) face.style.backgroundImage = `url("${u}")`;
        else face.style.background = "linear-gradient(180deg, rgba(0,0,0,.35), rgba(10,12,22,.85))";
      });

      // playable hint: if your turn and main, allow play
      if (state.current === "YOU" && PHASES[state.phaseIndex] === "メイン") {
        el.classList.add("playable");
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectHand(idx);
      });
      attachLongPress(el, () => openCardViewer(no));

      handRow.appendChild(el);
    });
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

  const renderHUD = () => {
    turnChip.textContent = `TURN ${state.turn}`;
    phaseChip.textContent = `PHASE ${PHASES[state.phaseIndex]}`;
    whoChip.textContent = state.current === "YOU" ? "YOU TURN" : "ENEMY TURN";
  };

  const renderAll = async () => {
    renderHUD();
    renderCounts();

    renderZoneRow(youCCells, state.you.stageC, "YOU", "C");
    renderZoneRow(youECells, state.you.stageE, "YOU", "E");
    renderZoneRow(enemyCCells, state.enemy.stageC, "ENEMY", "C");
    renderZoneRow(enemyECells, state.enemy.stageE, "ENEMY", "E");

    await renderShields(youSCells, state.you.shields);
    await renderShields(enemySCells, state.enemy.shields);

    await renderHand();
  };

  // ===== Long press =====
  function attachLongPress(el, onLong) {
    let timer = null;
    let moved = false;
    const start = (e) => {
      moved = false;
      timer = setTimeout(() => {
        timer = null;
        if (!moved) onLong();
      }, 420);
    };
    const move = () => { moved = true; };
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", cancel, { passive: true });
    el.addEventListener("mousedown", start);
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseup", cancel);
    el.addEventListener("mouseleave", cancel);
  }

  // ===== Card viewer =====
  async function openCardViewer(cardNo) {
    const no = String(cardNo).padStart(2, "0");
    const cd = CARD[no] || { name: `カード${parseInt(no, 10)}`, text: "" };
    cardModalTitle.textContent = cd.name || `カード${parseInt(no, 10)}`;
    cardModalText.textContent = normalizeText(cd.text || "");
    const img = await getCardImg(no);
    if (img) cardModalImg.src = img + "?v=" + Date.now();
    else cardModalImg.removeAttribute("src");
    showModal(cardModal);
  }

  // ===== Selection / Actions =====
  function clearSelection() {
    state.selection.handIndex = null;
    state.selection.mode = null;
    state.selection.fromSlot = null;
  }

  function selectHand(idx) {
    if (state.current !== "YOU") return;
    if (PHASES[state.phaseIndex] !== "メイン") return;

    state.selection.handIndex = idx;
    state.selection.mode = "play"; // then choose C or E by tapping zone
    log(`手札を選択しました（登場/設置先をタップ）`, "muted");
  }

  function onZoneClick(owner, zone, index) {
    if (state.busy) return;

    // You zones are interactive in your turn
    if (owner === "YOU") {
      if (state.current !== "YOU") return;

      const phase = PHASES[state.phaseIndex];

      // Main: play to C/E
      if (phase === "メイン") {
        if (state.selection.handIndex == null) return;
        const cardNo = state.you.hand[state.selection.handIndex];
        if (!cardNo) return;

        if (zone === "C") {
          playToZone("YOU", "C", index, cardNo);
          return;
        }
        if (zone === "E") {
          playToZone("YOU", "E", index, cardNo);
          return;
        }
      }

      // Battle: choose attacker then target
      if (phase === "バトル") {
        if (zone !== "C") return;

        // if no attacker selected, select your attacker
        if (state.selection.mode !== "attackFrom") {
          if (!state.you.stageC[index]) return;
          if (state.you.attacked[index]) {
            log("そのキャラクターはこのターン既に攻撃しています", "warn");
            return;
          }
          state.selection.mode = "attackFrom";
          state.selection.fromSlot = index;
          log("攻撃先をタップしてください（相手キャラ→いなければシールド）", "muted");
          return;
        }
      }
    }

    // Enemy zones as targets (battle)
    if (owner === "ENEMY") {
      if (state.current !== "YOU") return;
      const phase = PHASES[state.phaseIndex];
      if (phase !== "バトル") return;

      if (state.selection.mode === "attackFrom") {
        // target enemy character if exists
        if (zone !== "C") return;
        const from = state.selection.fromSlot;
        if (from == null) return;
        const attacker = state.you.stageC[from];
        const defender = state.enemy.stageC[index];
        if (!attacker) return;
        if (!defender) {
          log("その枠に相手キャラがいません", "warn");
          return;
        }
        confirmAction(
          `攻撃しますか？\n${CARD_NAME(attacker)} → ${CARD_NAME(defender)}`,
          () => doBattle(attacker, defender, from, index)
        );
      }
    }
  }

  function CARD_NAME(no) {
    const k = String(no).padStart(2, "0");
    return CARD[k]?.name || `カード${parseInt(k, 10)}`;
  }

  function playToZone(side, zone, index, cardNo) {
    // Only YOU main for now
    if (side !== "YOU") return;

    const you = state.you;
    if (zone === "C") {
      if (you.stageC[index]) {
        log("そのキャラ枠には既にカードがあります", "warn");
        return;
      }
      // "登場"はターン1回の制約（簡易：rank4以下のみ無コスト登場想定、見参は今後）
      // いったんプロトとして「メイン中は置ける（登場制約は後で厳密化）」にして動作優先
      you.stageC[index] = cardNo;
      you.hand.splice(state.selection.handIndex, 1);
      clearSelection();
      log(`登場：${CARD_NAME(cardNo)}`);
      renderAll();
      return;
    }

    if (zone === "E") {
      if (you.stageE[index]) {
        log("そのE枠には既にカードがあります", "warn");
        return;
      }
      you.stageE[index] = cardNo;
      you.hand.splice(state.selection.handIndex, 1);
      clearSelection();
      log(`設置：${CARD_NAME(cardNo)}`);
      renderAll();
      return;
    }
  }

  function confirmAction(text, onYes) {
    // Simple confirm (native). keeps user safe from mis-tap.
    const ok = window.confirm(text);
    if (ok) onYes();
    else log("キャンセルしました", "muted");
  }

  function getAtk(no) {
    const k = String(no).padStart(2, "0");
    return CARD[k]?.atk ?? 500;
  }

  function doBattle(attackerNo, defenderNo, fromIndex, targetIndex) {
    const atkA = getAtk(attackerNo);
    const atkD = getAtk(defenderNo);

    log(`バトル：${CARD_NAME(attackerNo)}(${atkA}) vs ${CARD_NAME(defenderNo)}(${atkD})`);

    // Rule: lower ATK loses; same = both destroyed to wing
    if (atkA === atkD) {
      destroyToWing("YOU", fromIndex);
      destroyToWing("ENEMY", targetIndex);
      log("同値：両方破壊→ウイング");
    } else if (atkA > atkD) {
      destroyToWing("ENEMY", targetIndex);
      log("勝利：相手キャラ破壊→ウイング");
    } else {
      destroyToWing("YOU", fromIndex);
      log("敗北：自キャラ破壊→ウイング");
    }

    state.you.attacked[fromIndex] = true;
    clearSelection();

    // if enemy has no characters after battle, allow shield attack by tapping shield (simplified auto step)
    renderAll();
    // After battle, if enemy has no C and you still have attacker alive and not all shields? allow tap-to-attack shields later.
  }

  function destroyToWing(side, slotIndex) {
    const p = side === "YOU" ? state.you : state.enemy;
    const cardNo = p.stageC[slotIndex];
    if (!cardNo) return;
    p.stageC[slotIndex] = null;
    p.wing.unshift(cardNo);
    if (side === "YOU") youWingCount.textContent = p.wing.length;
    else enemyWingCount.textContent = p.wing.length;
  }

  // ===== Shield logic =====
  function breakShield(targetSide) {
    const p = targetSide === "YOU" ? state.you : state.enemy;
    if (p.stageC.some(Boolean)) {
      // If any character exists, shield is protected (unless future effect)
      log("ステージにキャラがいるため、シールドに攻撃できません（基本ルール）", "warn");
      return false;
    }
    if (p.shields.length <= 0) return false;

    const broken = p.shields.shift(); // top of shields (we treat shields ordered)
    // rule: broken shield goes to hand
    p.hand.push(broken);
    log(`${targetSide}のシールドが破壊され、手札になりました`, "muted");

    // if no shields remaining and direct attack occurred -> win condition later
    return true;
  }

  // ===== Turn flow =====
  function resetAttackFlags(side) {
    const p = side === "YOU" ? state.you : state.enemy;
    p.attacked = Array(STAGE_SLOTS).fill(false);
  }

  function draw(side, n = 1) {
    const p = side === "YOU" ? state.you : state.enemy;
    for (let i = 0; i < n; i++) {
      if (p.deck.length === 0) {
        // deck-out lose
        log(`${side}：ドローできない→デッキ切れ敗北`, "warn");
        // simple end: reload to title
        setTimeout(() => alert(`${side}の敗北（デッキ切れ）`), 10);
        return false;
      }
      p.hand.push(p.deck.shift());
    }
    return true;
  }

  function nextPhase() {
    if (state.busy) return;
    if (state.current !== "YOU") return; // player only presses during your turn

    state.phaseIndex++;
    if (state.phaseIndex >= PHASES.length) {
      // end turn
      endTurn();
      return;
    }

    const phase = PHASES[state.phaseIndex];
    log(`PHASE：${phase}`, "muted");

    if (phase === "ドロー") {
      draw("YOU", 1);
    }
    if (phase === "エンド") {
      endPhaseCleanup("YOU");
    }
    renderAll();
  }

  function endPhaseCleanup(side) {
    const p = side === "YOU" ? state.you : state.enemy;
    // hand limit: at end of your turn, discard to wing until 7
    while (p.hand.length > MAX_HAND) {
      const c = p.hand.shift(); // simplest discard from front
      p.wing.unshift(c);
      log(`${side}：手札上限→ウイングへ送る`, "muted");
    }
  }

  function endTurn() {
    if (state.busy) return;

    if (state.current === "YOU") {
      // ensure end cleanup if not reached
      endPhaseCleanup("YOU");
      state.current = "ENEMY";
      state.phaseIndex = 0;
      resetAttackFlags("ENEMY");
      log("ENEMY TURN 開始", "muted");
      renderAll();
      runEnemyTurn();
      return;
    }

    // enemy -> you
    endPhaseCleanup("ENEMY");
    state.current = "YOU";
    state.turn++;
    state.phaseIndex = 0;
    resetAttackFlags("YOU");
    log("YOU TURN 開始", "muted");
    renderAll();
  }

  // ===== Enemy AI (A: play what you can, then attack, then end) =====
  async function runEnemyTurn() {
    if (state.busy) return;
    state.busy = true;

    try {
      // Start -> Draw -> Main -> Battle -> End
      const doPhase = async (name) => {
        state.phaseIndex = PHASES.indexOf(name);
        renderAll();
        await wait(220);

        if (name === "ドロー") {
          draw("ENEMY", 1);
          renderAll();
          await wait(220);
        }

        if (name === "メイン") {
          // play first card to first empty C, else E
          await enemyMain();
        }

        if (name === "バトル") {
          await enemyBattle();
        }

        if (name === "エンド") {
          endPhaseCleanup("ENEMY");
          renderAll();
          await wait(180);
        }
      };

      log("AI：思考開始（A）", "muted");
      await doPhase("スタート");
      await doPhase("ドロー");
      await doPhase("メイン");
      await doPhase("バトル");
      await doPhase("エンド");

      // End enemy turn
      state.busy = false;
      endTurn();
    } catch (e) {
      state.busy = false;
      log("AIエラー：" + (e?.message || e), "warn");
      // fail-safe: return to you
      state.current = "YOU";
      state.phaseIndex = 0;
      resetAttackFlags("YOU");
      renderAll();
    }
  }

  async function enemyMain() {
    const p = state.enemy;

    // play at most 1 card for now (simple)
    if (p.hand.length === 0) return;

    // prefer character if empty slot exists
    const emptyC = p.stageC.findIndex((x) => !x);
    const emptyE = p.stageE.findIndex((x) => !x);

    // pick first card
    const cardNo = p.hand.shift();

    if (emptyC !== -1) {
      p.stageC[emptyC] = cardNo;
      log(`AI：登場 ${CARD_NAME(cardNo)}`, "muted");
    } else if (emptyE !== -1) {
      p.stageE[emptyE] = cardNo;
      log(`AI：設置 ${CARD_NAME(cardNo)}`, "muted");
    } else {
      // nowhere to place -> keep in hand
      p.hand.unshift(cardNo);
    }
    renderAll();
    await wait(260);
  }

  async function enemyBattle() {
    const A = state.enemy;
    const D = state.you;

    // For each enemy character, if not attacked, target strongest your character else shield
    for (let i = 0; i < STAGE_SLOTS; i++) {
      const attacker = A.stageC[i];
      if (!attacker) continue;
      if (A.attacked[i]) continue;

      // if you have characters -> attack one (simple: highest ATK)
      const targets = D.stageC
        .map((no, idx) => ({ no, idx, atk: no ? getAtk(no) : -1 }))
        .filter((t) => t.no);

      if (targets.length > 0) {
        targets.sort((a, b) => b.atk - a.atk);
        const t = targets[0];
        // battle
        const atkA = getAtk(attacker);
        const atkD = getAtk(t.no);

        log(`AIバトル：${CARD_NAME(attacker)}(${atkA}) → ${CARD_NAME(t.no)}(${atkD})`, "muted");
        await wait(260);

        if (atkA === atkD) {
          destroyToWing("ENEMY", i);
          destroyToWing("YOU", t.idx);
          log("同値：両方破壊→ウイング", "muted");
        } else if (atkA > atkD) {
          destroyToWing("YOU", t.idx);
          log("AI勝利：自キャラ生存", "muted");
        } else {
          destroyToWing("ENEMY", i);
          log("AI敗北：自キャラ破壊", "muted");
        }

        A.attacked[i] = true;
        renderAll();
        await wait(300);
        continue;
      }

      // no your characters -> break your shield (if any)
      if (D.shields.length > 0) {
        log("AI：シールドを攻撃", "muted");
        await wait(220);
        // if you have no characters, shield breaks to your hand
        // you have no characters here by condition
        const broken = D.shields.shift();
        D.hand.push(broken);
        log("シールド破壊→手札へ", "muted");
        A.attacked[i] = true;
        renderAll();
        await wait(280);
        continue;
      }

      // no shields -> direct attack (win)
      log("AI：ダイレクトアタック！", "warn");
      await wait(200);
      alert("あなたの敗北（ダイレクトアタック）");
      return;
    }
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ===== Start game =====
  async function startGame() {
    computeCardW();

    // setup images
    resolvedFieldUrl = await resolveFieldUrl();
    if (resolvedFieldUrl) {
      youMat.style.backgroundImage = `url("${resolvedFieldUrl}")`;
      enemyMat.style.backgroundImage = `url("${resolvedFieldUrl}")`;
      log(`OK フィールド：${resolvedFieldUrl}`, "muted");
    } else {
      youMat.style.backgroundImage = "";
      enemyMat.style.backgroundImage = "";
      log("NG フィールド画像が見つかりません（/assets/field.jpg など）", "warn");
    }

    resolvedBackUrl = await resolveBackUrl();
    if (resolvedBackUrl) {
      log(`OK 裏面：${resolvedBackUrl}`, "muted");
    } else {
      log("裏面：未設定（黒カードで表示）", "muted");
    }

    // init decks
    state.you.deck = makeDeck();
    state.enemy.deck = makeDeck();

    // shields from top 3 after shuffle
    state.you.shields = state.you.deck.splice(0, SHIELDS);
    state.enemy.shields = state.enemy.deck.splice(0, SHIELDS);

    // hands
    state.you.hand = state.you.deck.splice(0, START_HAND);
    state.enemy.hand = state.enemy.deck.splice(0, START_HAND);

    // reset stages
    state.you.stageC = Array(STAGE_SLOTS).fill(null);
    state.you.stageE = Array(STAGE_SLOTS).fill(null);
    state.enemy.stageC = Array(STAGE_SLOTS).fill(null);
    state.enemy.stageE = Array(STAGE_SLOTS).fill(null);
    resetAttackFlags("YOU");
    resetAttackFlags("ENEMY");

    // who starts random
    state.first = Math.random() < 0.5 ? "YOU" : "ENEMY";
    state.current = state.first;
    state.turn = 1;
    state.phaseIndex = 0;

    log(`ゲーム開始：シールド${SHIELDS} / 初手${START_HAND}`, "muted");
    log(`先攻：${state.first}`, "muted");

    // enter game screen
    titleScreen.classList.remove("active");
    gameScreen.classList.add("active");

    await renderAll();

    // if enemy starts, run AI immediately
    if (state.current === "ENEMY") {
      log("ENEMY TURN 開始", "muted");
      runEnemyTurn();
    } else {
      log("YOU TURN 開始", "muted");
    }
  }

  // ===== Settings UI =====
  btnSettings.addEventListener("click", () => {
    fieldInput.value = loadFieldUrl();
    backInput.value = loadBackUrl();
    cardJsonArea.value = "";
    mapList.classList.add("hidden");
    showModal(settingsModal);
  });

  btnLog.addEventListener("click", () => showModal(logModal));

  saveFieldBtn.addEventListener("click", async () => {
    FIELD_URL = fieldInput.value.trim();
    saveFieldUrl(FIELD_URL);
    resolvedFieldUrl = await resolveFieldUrl();
    if (resolvedFieldUrl) {
      youMat.style.backgroundImage = `url("${resolvedFieldUrl}")`;
      enemyMat.style.backgroundImage = `url("${resolvedFieldUrl}")`;
      log(`OK フィールド保存：${resolvedFieldUrl}`, "muted");
    } else {
      log("NG フィールドが読み込めません", "warn");
    }
    hideModal(settingsModal);
  });

  saveBackBtn.addEventListener("click", async () => {
    BACK_URL = backInput.value.trim();
    saveBackUrl(BACK_URL);
    resolvedBackUrl = await resolveBackUrl();
    if (resolvedBackUrl) log(`OK 裏面保存：${resolvedBackUrl}`, "muted");
    else log("裏面：未設定（黒カードで表示）", "muted");
    await renderAll();
    hideModal(settingsModal);
  });

  openMapBtn.addEventListener("click", () => {
    mapList.classList.toggle("hidden");
    renderMapList();
  });

  function renderMapList() {
    mapList.innerHTML = "";
    for (let i = 1; i <= 20; i++) {
      const no = String(i).padStart(2, "0");
      const row = document.createElement("div");
      row.className = "cardMapRow";
      const noEl = document.createElement("div");
      noEl.className = "no";
      noEl.textContent = no;
      const nameEl = document.createElement("div");
      nameEl.className = "name";
      nameEl.textContent = CARD[no]?.name || `カード${i}`;
      const btn = document.createElement("button");
      btn.className = "btn small ghost";
      btn.textContent = "URLを入力";
      btn.addEventListener("click", () => {
        const cur = IMG_MAP[no] || "";
        const u = prompt(`No.${no} の画像URLを入力\n例：/assets/cards/${no}_カード名.png.JPG`, cur);
        if (u == null) return;
        IMG_MAP[no] = u.trim();
        saveImgMap(IMG_MAP);
        // clear cache
        delete cardImgCache[no];
        log(`画像マップ保存：${no}`, "muted");
      });

      row.appendChild(noEl);
      row.appendChild(nameEl);
      row.appendChild(btn);
      mapList.appendChild(row);
    }
  }

  autoScanBtn.addEventListener("click", async () => {
    log("画像探索開始（No.01〜20）", "muted");
    for (let i = 1; i <= 20; i++) {
      const no = String(i).padStart(2, "0");
      const u = await resolveCardImg(no);
      if (u) {
        IMG_MAP[no] = u;
        saveImgMap(IMG_MAP);
        delete cardImgCache[no];
        log(`OK ${no}: ${u}`, "muted");
      } else {
        log(`NG ${no}: 未検出（assets/cards を確認）`, "warn");
      }
    }
    renderMapList();
    await renderAll();
  });

  loadJsonBtn.addEventListener("click", () => {
    const raw = cardJsonArea.value.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      for (const k of Object.keys(parsed)) {
        const no = String(k).padStart(2, "0");
        CARD[no] = CARD[no] || {};
        const src = parsed[k] || {};
        if (src.name != null) CARD[no].name = normalizeText(src.name);
        if (src.text != null) CARD[no].text = normalizeText(src.text);
        if (src.rank != null) CARD[no].rank = src.rank;
        if (src.atk != null) CARD[no].atk = src.atk;
        if (src.type != null) CARD[no].type = src.type;
        if (src.titleTag != null) CARD[no].titleTag = src.titleTag;
        if (src.tags != null) CARD[no].tags = src.tags;
      }
      saveCardData(CARD);
      log("カードデータを反映しました", "muted");
      renderMapList();
    } catch (e) {
      log("JSONが不正です：" + e.message, "warn");
    }
  });

  exportJsonBtn.addEventListener("click", () => {
    const out = {};
    for (let i = 1; i <= 20; i++) {
      const no = String(i).padStart(2, "0");
      out[no] = {
        name: CARD[no]?.name || "",
        text: CARD[no]?.text || "",
        rank: CARD[no]?.rank ?? 1,
        atk: CARD[no]?.atk ?? 500,
        type: CARD[no]?.type || "character",
        titleTag: CARD[no]?.titleTag || "",
        tags: CARD[no]?.tags || []
      };
    }
    cardJsonArea.value = JSON.stringify(out, null, 2);
    log("カードデータを書き出しました（textareaに出力）", "muted");
  });

  // ===== Buttons =====
  btnNextPhase.addEventListener("click", nextPhase);
  btnEndTurn.addEventListener("click", () => {
    if (state.current !== "YOU") return;
    // go to end immediately
    state.phaseIndex = PHASES.length - 1;
    endPhaseCleanup("YOU");
    renderAll();
    endTurn();
  });

  // ===== Piles (Wing/Outside) viewer simplified: show names in log modal =====
  function openZoneList(side, zoneName) {
    const p = side === "YOU" ? state.you : state.enemy;
    const arr = zoneName === "W" ? p.wing : p.out;
    log(`--- ${side} ${zoneName} (${arr.length}) ---`, "muted");
    arr.slice(0, 40).forEach((no) => log(CARD_NAME(no), "muted"));
    showModal(logModal);
  }

  youW.addEventListener("click", () => openZoneList("YOU", "W"));
  youO.addEventListener("click", () => openZoneList("YOU", "O"));
  enemyW.addEventListener("click", () => openZoneList("ENEMY", "W"));
  enemyO.addEventListener("click", () => openZoneList("ENEMY", "O"));

  // ===== Start button =====
  startBtn.addEventListener("click", startGame);

  // ===== Boot =====
  computeCardW();
  log("JS起動OK", "muted");

})();