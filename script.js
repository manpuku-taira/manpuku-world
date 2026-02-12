/***********************
 * Manpuku World - MVP（操作感重視）
 * - 長押しでカード拡大＋大文字テキスト
 * - Wing/Outside タップで一覧 → タップで詳細
 * - 攻撃は「攻撃元→攻撃先→確認Yes/No」(誤操作防止)
 * - 矢印で視覚化
 * - 派手な勝利演出（スキップ可）
 *
 * 画像：
 *  - フィールド：assets/field.png
 *  - カード：
 *      assets/cards/01_カード名.png
 *      または assets/cards/01.png
 *    ※どちらでも表示できる（両対応）
 ************************/

const ASSET_FIELD_PNG = "assets/field.png";
const PHASES = ["START", "DRAW", "MAIN", "BATTLE", "END"];

// ===== 表記ルール =====
const normalizeText = (s) =>
  (s || "").replaceAll("又は", "または").replaceAll("出来る", "できる");

// ===== ファイル名安全化（日本語OK）=====
function safeFileNameJP(name) {
  return (name || "")
    .replace(/\s+/g, "")
    .replace(/[―‐-–—]/g, "")
    .replace(/[・]/g, "")
    .replace(/[「」『』【】\[\]\(\)]/g, "")
    .replace(/[!！?？]/g, "")
    .replace(/[\/\\:;'"“”]/g, "")
    .replace(/[～~]/g, "")
    .trim();
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

// ===== 画像候補（番号_カード名 / 番号のみ）=====
function cardImageCandidates(card) {
  const no = pad2(card.no);
  const nm = safeFileNameJP(card.name);
  return [`assets/cards/${no}_${nm}.png`, `assets/cards/${no}.png`];
}

async function firstExistingImage(urls) {
  for (const u of urls) {
    const ok = await new Promise((res) => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = u + `?v=${Date.now()}`;
    });
    if (ok) return u;
  }
  return null;
}

// ======== カードDB（20種）=====
// ※ここは「確定テキスト」へ後で強化しやすい形で保持
const Cards = [
  {
    no: 1,
    name: "黒の魔法使い クルエラ",
    type: "character",
    rank: 5,
    atk: 2500,
    titleTag: "MAGIAGIA-マギアギア-",
    tags: ["魔法使い", "冒険者"],
    text: normalizeText(
      "このカードは登場できず、手札、または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。"
    ),
  },
  {
    no: 2,
    name: "-黒魔法- フレイムバレット",
    type: "effect",
    rank: 5,
    atk: 0,
    titleTag: "MAGIAGIA-マギアギア-",
    tags: ["魔法使い", "火焔", "黒魔法"],
    text: normalizeText(
      "自分ステージに「クルエラ」が存在する時、手札から発動できる。以下から1つ選ぶ。（※効果本実装は次段階）"
    ),
  },
  {
    no: 3,
    name: "トナカイの少女 ニコラ",
    type: "character",
    rank: 5,
    atk: 2000,
    titleTag: "NIKORA-ニコラ-",
    tags: ["クランプス", "怪力"],
    text: normalizeText(
      "このカードは登場できず、手札、または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。"
    ),
  },
  {
    no: 4,
    name: "聖 ラウス",
    type: "character",
    rank: 4,
    atk: 1800,
    titleTag: "NIKORA-ニコラ-",
    tags: ["サンタ", "運び屋", "父親", "クランプス"],
    text: normalizeText(
      "このカードが登場した時、発動できる。デッキ・ウイングからタグ「クランプス」カード1枚を手札に加える。（※本実装は次段階）"
    ),
  },
  {
    no: 5,
    name: "統括AI タータ",
    type: "character",
    rank: 4,
    atk: 1000,
    titleTag: "BUGBUG西遊記",
    tags: ["AI", "管理者", "GAME"],
    text: normalizeText("このカードが登場した時、発動できる。デッキからカードを2枚ドローする。（※本実装は次段階）"),
  },
  {
    no: 6,
    name: "麗しの令嬢 エフィ",
    type: "character",
    rank: 5,
    atk: 2000,
    titleTag: "ハガネノコドウ A-E",
    tags: ["資産家", "格闘"],
    text: normalizeText(
      "このカードは登場できず、手札、または自分ステージのキャラクターカード1枚をウイングに送り、手札から見参できる。"
    ),
  },
  {
    no: 7,
    name: "狩樹 まひる",
    type: "character",
    rank: 4,
    atk: 1700,
    titleTag: "恋愛疾患特殊医療機a-xブラスター",
    tags: ["人間", "射手", "組織"],
    text: normalizeText(
      "このカードがアイテムを装備している時、1ターンに2回まで攻撃できる。相手のシールドが0枚の時、このカードは相手に直接攻撃できない。"
    ),
  },
  {
    no: 8,
    name: "組織の男 手形",
    type: "character",
    rank: 4,
    atk: 1900,
    titleTag: "SYNAPSE-シナプス-",
    tags: ["狐憑き", "組織", "格闘"],
    text: normalizeText("相手ターンに1度発動できる。相手が発動した効果を無効にする。（※チェーン本実装は次段階）"),
  },
  {
    no: 9,
    name: "小太郎・孫悟空Lv17",
    type: "character",
    rank: 3,
    atk: 1600,
    titleTag: "BUGBUG西遊記",
    tags: ["アバター", "GAME"],
    text: normalizeText("自分ステージに『小次郎』がある時、このカードのATK+500。"),
  },
  {
    no: 10,
    name: "小次郎・孫悟空Lv17",
    type: "character",
    rank: 3,
    atk: 1500,
    titleTag: "BUGBUG西遊記",
    tags: ["アバター", "GAME"],
    text: normalizeText("自分ステージに『小太郎』がある時、このカードのATK+500。"),
  },
  {
    no: 11,
    name: "司令",
    type: "character",
    rank: 3,
    atk: 1200,
    titleTag: "音霊戦隊ディスクレンジャー2021",
    tags: ["人間", "発明家"],
    text: normalizeText(
      "登場時：自分ステージのキャラクター1体を選択し、このカードをアイテム扱いとして装備する。そのキャラクターのATK+500。（※本実装は次段階）"
    ),
  },
  {
    no: 12,
    name: "班目プロデューサー",
    type: "character",
    rank: 2,
    atk: 800,
    titleTag: "ハガネノコドウ A-E",
    tags: ["人間", "取材"],
    text: normalizeText("このカードは1ターンに1度、バトルでは破壊されない。"),
  },
  {
    no: 13,
    name: "超弩級砲塔列車スタマックス氏",
    type: "character",
    rank: 1,
    atk: 100,
    titleTag: "音霊戦隊ディスクレンジャー2021",
    tags: ["人間", "ヲタク"],
    text: normalizeText(
      "このカードをウイングに送り、相手キャラクター1体のATK-1000（このターン）。相手ターンでも発動できる。（※本実装は次段階）"
    ),
  },
  {
    no: 14,
    name: "記憶抹消",
    type: "effect",
    rank: 4,
    atk: 0,
    titleTag: "SYNAPSE-シナプス-",
    tags: ["組織", "任務"],
    text: normalizeText(
      "相手がカードの効果を発動した時、手札から発動できる。その効果を無効にしてウイングに送る。（※チェーン本実装は次段階）"
    ),
  },
  {
    no: 15,
    name: "桜蘭の陰陽術 - 闘 -",
    type: "effect",
    rank: 3,
    atk: 0,
    titleTag: "封印壊除",
    tags: ["陰陽術", "過去"],
    text: normalizeText(
      "自分・相手のキャラクターがバトルする時、手札から発動できる。このターンの終わりまで自分ステージのキャラクター1体のATK+1000。（※本実装は次段階）"
    ),
  },
  {
    no: 16,
    name: "力こそパワー！！",
    type: "effect",
    rank: 3,
    atk: 0,
    titleTag: "SYNAPSE-シナプス-",
    tags: ["怪力", "脳筋"],
    text: normalizeText("自分ターンにのみ発動できる。相手ステージのATKが1番低いキャラクター1体を選択し、ウイングに送る。（※本実装は次段階）"),
  },
  {
    no: 17,
    name: "キャトルミューティレーション",
    type: "effect",
    rank: 3,
    atk: 0,
    titleTag: "Eバリアーズ",
    tags: ["オールネス", "宇宙"],
    text: normalizeText(
      "自分ステージのキャラクターがバトルでウイングに送られた時、手札から発動できる。相手キャラクター1体を選択し手札に戻す。（※簡易実装あり）"
    ),
  },
  {
    no: 18,
    name: "a-xブラスター01 - 放射型 -",
    type: "item",
    rank: 4,
    atk: 0,
    titleTag: "恋愛疾患特殊医療機a-xブラスター",
    tags: ["医療機器", "任務"],
    text: normalizeText(
      "装備：ATK+500。タグ「射手」を持つキャラクターが装備した場合さらに+500。相手ターン開始時：相手手札を1枚ランダムにウイングに送る。（※本実装は次段階）"
    ),
  },
  {
    no: 19,
    name: "-聖剣- アロンダイト",
    type: "item",
    rank: 3,
    atk: 0,
    titleTag: "Eバリアーズ",
    tags: ["聖剣", "神器"],
    text: normalizeText(
      "装備：ATK+500。タグ「勇者」「剣士」を持つキャラクターが装備した場合さらに+500。相手キャラをバトルでウイングに送った時、1枚ドローする。（※簡易実装あり）"
    ),
  },
  {
    no: 20,
    name: "普通の棒",
    type: "item",
    rank: 1,
    atk: 0,
    titleTag: "MAGIAGIA-マギアギア-",
    tags: ["木の棒", "可能性"],
    text: normalizeText("装備：ATK+300。タグ「勇者」を持つキャラクターが装備した場合さらに+500。"),
  },
];

// ======== 状態 ========
const state = {
  started: false,
  phase: "START",
  turn: 1,
  cur: "P1", // "P1" or "AI"
  skipFx: false,
  winLocked: false,

  // 攻撃選択
  attackFrom: null, // { cardId, elRef }
  players: {
    P1: mkPlayer(),
    AI: mkPlayer(),
  },
};

function mkPlayer() {
  return {
    deck: [],
    hand: [],
    stage: [null, null, null],
    ei: [null, null, null],
    shield: [null, null, null],
    wing: [],
    outside: [],
    attackedThisTurn: new Map(), // cardId -> count
    normalSummoned: false, // 登場(通常召喚)ターン1回
  };
}

// ======== DOM ========
const el = {
  title: document.getElementById("titleScreen"),
  game: document.getElementById("gameScreen"),

  turnChip: document.getElementById("turnChip"),
  phaseChip: document.getElementById("phaseChip"),
  hand: document.getElementById("hand"),
  log: document.getElementById("log"),
  tips: document.getElementById("tips"),
  focus: document.getElementById("focus"),

  btnSkipFx: document.getElementById("btnSkipFx"),
  btnRestart: document.getElementById("btnRestart"),
  btnNextPhase: document.getElementById("btnNextPhase"),
  btnEndTurn: document.getElementById("btnEndTurn"),
  btnCancelSelect: document.getElementById("btnCancelSelect"),

  fx: document.getElementById("fxOverlay"),
  fxCard: document.querySelector("#fxOverlay .fxCard"),
  fxText: document.querySelector("#fxOverlay .fxText"),
  btnFxSkip2: document.getElementById("btnFxSkip2"),

  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  modalActions: document.getElementById("modalActions"),
  modalClose: document.getElementById("modalClose"),

  viewer: document.getElementById("viewer"),
  viewerTitle: document.getElementById("viewerTitle"),
  viewerImg: document.getElementById("viewerImg"),
  viewerMeta: document.getElementById("viewerMeta"),
  viewerBody: document.getElementById("viewerBody"),
  viewerClose: document.getElementById("viewerClose"),

  win: document.getElementById("win"),
  winTitle: document.getElementById("winTitle"),
  winSub: document.getElementById("winSub"),
  winRestart: document.getElementById("winRestart"),

  fieldBg: document.getElementById("fieldBg"),

  arrowPath: document.getElementById("arrowPath"),

  playerWingPile: document.getElementById("playerWingPile"),
  playerOutsidePile: document.getElementById("playerOutsidePile"),
  enemyWingPile: document.getElementById("enemyWingPile"),
  enemyOutsidePile: document.getElementById("enemyOutsidePile"),
};

function qsSlots(zoneSel) {
  return document.querySelector(`[data-zone="${zoneSel}"]`);
}
function qsPile(name) {
  return document.querySelector(`[data-pile="${name}"]`);
}

// ======== ログ/UI ========
function log(msg) {
  const d = document.createElement("div");
  d.className = "m";
  d.textContent = msg;
  el.log.prepend(d);
}
function setTips(t) {
  el.tips.textContent = t || "";
}
function setFocus(t) {
  el.focus.textContent = t || "";
}

// ======== 乱数/シャッフル ========
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ======== カードインスタンス ========
let nextId = 1;
function makeCardInstance(base) {
  return {
    id: "C" + nextId++,
    ...structuredClone(base),
    tempAtkPlus: 0,
    tempAtkMinus: 0,
    equips: [], // item card ids equipped to this character
    equippedTo: null, // if this card is an item
    _img: null,
    _usedBattleImmune: false, // for No.12
  };
}

function buildDeck() {
  const deck = [];
  for (const c of Cards) {
    deck.push(makeCardInstance(c));
    deck.push(makeCardInstance(c));
  }
  shuffle(deck);
  return deck;
}

function findCardById(id) {
  for (const who of ["P1", "AI"]) {
    const p = state.players[who];
    const pools = [
      p.hand,
      p.deck,
      p.wing,
      p.outside,
      p.stage.filter(Boolean),
      p.ei.filter(Boolean),
      p.shield.filter(Boolean),
    ];
    for (const arr of pools) {
      const f = arr.find((c) => c?.id === id);
      if (f) return f;
    }
  }
  return null;
}

// ======== 画像解決 ========
async function resolveCardImage(card) {
  if (!card) return "";
  if (card._img !== null) return card._img;
  card._img = ""; // 仮埋め
  const found = await firstExistingImage(cardImageCandidates(card));
  card._img = found || "";
  return card._img;
}

// ======== 装備ATKボーナス ========
function equipAtkBonus(item, host) {
  if (!item || !host) return 0;

  if (item.no === 18) {
    let b = 500;
    if ((host.tags || []).includes("射手")) b += 500;
    return b;
  }
  if (item.no === 19) {
    let b = 500;
    const tags = host.tags || [];
    if (tags.includes("勇者") || tags.includes("剣士")) b += 500;
    return b;
  }
  if (item.no === 20) {
    let b = 300;
    const tags = host.tags || [];
    if (tags.includes("勇者")) b += 500;
    return b;
  }
  if (item.no === 11) {
    return 500; // 「司令」を装備扱いにする場合の補正（次段階で本格化）
  }
  return 0;
}

function calcATK(who, card) {
  if (!card) return 0;
  let atk = card.atk || 0;

  // 小太郎/小次郎相互
  if (card.no === 9 && state.players[who].stage.some((c) => c?.no === 10)) atk += 500;
  if (card.no === 10 && state.players[who].stage.some((c) => c?.no === 9)) atk += 500;

  // 装備
  if (card.equips?.length) {
    for (const itemId of card.equips) {
      const item = findCardById(itemId);
      atk += equipAtkBonus(item, card);
    }
  }

  atk += card.tempAtkPlus || 0;
  atk -= card.tempAtkMinus || 0;
  return atk;
}

// ======== 勝敗 ========
function win(winner, reason) {
  if (state.winLocked) return;
  state.winLocked = true;
  cancelSelection();
  el.winTitle.textContent = winner === "P1" ? "YOU WIN" : "AI WIN";
  el.winSub.textContent = reason || "";
  el.win.classList.remove("hidden");
}

// ======== ドロー/敗北（デッキ切れ） ========
function draw(who, n = 1) {
  const pl = state.players[who];
  for (let i = 0; i < n; i++) {
    if (pl.deck.length === 0) {
      win(who === "P1" ? "AI" : "P1", "デッキ切れ");
      return;
    }
    pl.hand.push(pl.deck.shift());
  }
}

// ======== ゾーン移動（ウイングへ） ========
function detachFromStage(who, cardId) {
  const pl = state.players[who];
  const idx = pl.stage.findIndex((c) => c?.id === cardId);
  if (idx >= 0) pl.stage[idx] = null;
}
function sendToWing(who, card, reason = "") {
  if (!card) return;
  const pl = state.players[who];

  // stageから外す
  detachFromStage(who, card.id);

  // 装備解除
  if (card.equippedTo) {
    const host = findCardById(card.equippedTo);
    if (host) host.equips = (host.equips || []).filter((x) => x !== card.id);
    card.equippedTo = null;
  }

  pl.wing.push(card);
  log(`${card.name} → Wing（${reason}）`);

  // No.17 簡易：自分キャラがバトルでウイングへ行った時、手札に17があれば発動して相手1体を手札へ戻す
  if (reason.includes("バトル")) {
    const hand17 = pl.hand.find((c) => c.no === 17);
    if (hand17) {
      const enemySide = who === "P1" ? "AI" : "P1";
      const enemy = state.players[enemySide];
      const targets = enemy.stage.filter(Boolean);
      if (targets.length) {
        const t = targets[0];
        detachFromStage(enemySide, t.id);
        enemy.hand.push(t);

        pl.hand = pl.hand.filter((c) => c.id !== hand17.id);
        pl.wing.push(hand17);

        log(`キャトルミューティレーション：${t.name} を手札に戻した`);
      }
    }
  }

  renderAll();
}

// ======== エフェクト表示 ========
async function fxCard(card, text) {
  if (state.skipFx) return;
  await resolveCardImage(card);
  el.fxCard.style.backgroundImage = card._img ? `url(${card._img})` : "";
  el.fxText.textContent = text || "";
  el.fx.classList.remove("hidden");
  await sleep(520);
  hideFx();
}
async function fxText(text) {
  if (state.skipFx) return;
  el.fxCard.style.backgroundImage = "";
  el.fxText.textContent = text || "";
  el.fx.classList.remove("hidden");
  await sleep(420);
  hideFx();
}
function hideFx() {
  el.fx.classList.add("hidden");
}

// ======== 矢印 ========
function drawArrowFromTo(fromEl, toEl) {
  if (!fromEl || !toEl) return;
  const boardRect = document.querySelector(".board").getBoundingClientRect();
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const x1 = ((a.left + a.right) / 2 - boardRect.left) / boardRect.width * 100;
  const y1 = ((a.top + a.bottom) / 2 - boardRect.top) / boardRect.height * 100;
  const x2 = ((b.left + b.right) / 2 - boardRect.left) / boardRect.width * 100;
  const y2 = ((b.top + b.bottom) / 2 - boardRect.top) / boardRect.height * 100;
  el.arrowPath.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
}
function clearArrow() {
  el.arrowPath.setAttribute("d", "");
}

// ======== 長押し ========
function attachLongPress(dom, onLong) {
  let timer = null;
  const start = () => {
    timer = setTimeout(() => {
      timer = null;
      onLong?.();
    }, 420);
  };
  const end = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  dom.addEventListener("touchstart", start, { passive: true });
  dom.addEventListener("touchend", end);
  dom.addEventListener("touchmove", end);
  dom.addEventListener("mousedown", start);
  dom.addEventListener("mouseup", end);
  dom.addEventListener("mouseleave", end);
}

// ======== Viewer（拡大表示） ========
async function showViewer(card, ownerWho) {
  if (!card) return;
  await resolveCardImage(card);
  el.viewerTitle.textContent = card.name;
  el.viewerImg.style.backgroundImage = card._img ? `url(${card._img})` : "";
  el.viewerMeta.textContent =
    `No.${card.no} / rank ${card.rank} / ${card.type}` +
    ` / タイトルタグ：${card.titleTag || "-"}` +
    ` / タグ：${(card.tags || []).join("・") || "-"}`;
  el.viewerBody.textContent = card.text || "（テキスト未設定）";
  el.viewer.classList.remove("hidden");
}
function hideViewer() {
  el.viewer.classList.add("hidden");
}

// ======== Modal ========
function hideModal() {
  el.modal.classList.add("hidden");
  el.modalTitle.textContent = "";
  el.modalBody.innerHTML = "";
  el.modalActions.innerHTML = `<button class="btn ghost" id="modalClose">閉じる</button>`;
  document.getElementById("modalClose").addEventListener("click", hideModal);
}

function infoModal(title, body) {
  return new Promise((resolve) => {
    el.modalTitle.textContent = title;
    el.modalBody.textContent = body;
    el.modalActions.innerHTML = `<button class="btn ghost" id="modalClose2">閉じる</button>`;
    el.modal.classList.remove("hidden");
    document.getElementById("modalClose2").onclick = () => {
      hideModal();
      resolve(true);
    };
  });
}

function confirmModal(title, body, yesLabel = "はい", noLabel = "いいえ") {
  return new Promise((resolve) => {
    el.modalTitle.textContent = title;
    el.modalBody.textContent = body;
    el.modalActions.innerHTML = `
      <button class="btn" id="modalYes">${yesLabel}</button>
      <button class="btn ghost" id="modalNo">${noLabel}</button>
    `;
    el.modal.classList.remove("hidden");
    document.getElementById("modalYes").onclick = () => {
      hideModal();
      resolve(true);
    };
    document.getElementById("modalNo").onclick = () => {
      hideModal();
      resolve(false);
    };
  });
}

function listPickModal(title, body, cards, opts = {}) {
  return new Promise(async (resolve) => {
    el.modalTitle.textContent = title;

    const wrap = document.createElement("div");
    const p = document.createElement("div");
    p.style.marginBottom = "10px";
    p.textContent = body;
    wrap.appendChild(p);

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      await resolveCardImage(c);

      const btn = document.createElement("button");
      btn.className = "listBtn";
      const prefix = opts.showIndex ? `${i + 1}. ` : "";
      btn.textContent = `${prefix}No.${c.no} ${c.name}（R${c.rank} / ${c.type}）`;
      btn.onclick = () => {
        hideModal();
        resolve(c);
      };
      attachLongPress(btn, () => showViewer(c, "P1"));
      wrap.appendChild(btn);
    }

    el.modalBody.innerHTML = "";
    el.modalBody.appendChild(wrap);
    el.modalActions.innerHTML = `<button class="btn ghost" id="modalClose3">閉じる</button>`;
    el.modal.classList.remove("hidden");
    document.getElementById("modalClose3").onclick = () => {
      hideModal();
      resolve(null);
    };
  });
}

// ======== Wing/Outside：一覧 ========
async function openZoneList(who, zoneKey) {
  const pl = state.players[who];
  const list = pl[zoneKey];
  const title = `${who === "P1" ? "あなた" : "AI"} の ${zoneKey === "wing" ? "Wing" : "Outside"}`;

  if (!list.length) {
    await infoModal(title, "（空）");
    return;
  }
  const picked = await listPickModal(title, "タップで詳細（長押しでも可）", list, { showIndex: true });
  if (!picked) return;
  showViewer(picked, who);
}

// ======== ターン/フェイズ ========
function nextPhase() {
  if (state.winLocked) return;
  cancelSelection();

  const idx = PHASES.indexOf(state.phase);
  const next = PHASES[(idx + 1) % PHASES.length];
  state.phase = next;

  if (next === "DRAW") {
    log("ドローフェイズ：1枚ドロー");
    draw(state.cur, 1);
  }

  if (next === "END") {
    endTurn();
    return;
  }

  renderAll();
  maybeAI();
}

function endTurn() {
  if (state.winLocked) return;
  cancelSelection();

  const pl = state.players[state.cur];

  // 手札上限7 → 超過分はウイングへ
  while (pl.hand.length > 7) {
    const c = pl.hand.pop();
    pl.wing.push(c);
    log(`手札上限：${c.name} をウイングへ`);
  }

  // 一時効果/ターンフラグリセット
  for (const who of ["P1", "AI"]) {
    const p = state.players[who];
    p.attackedThisTurn = new Map();
    p.normalSummoned = false;
    for (const c of p.stage.filter(Boolean)) {
      c.tempAtkPlus = 0;
      c.tempAtkMinus = 0;
      c._usedBattleImmune = false;
    }
  }

  state.cur = state.cur === "P1" ? "AI" : "P1";
  if (state.cur === "P1") state.turn += 1;
  state.phase = "START";
  log(`ターン交代：${state.cur === "P1" ? "あなた" : "AI"} のターン`);
  renderAll();
  maybeAI();
}

// ======== バトル処理 ========
async function battle(attSide, atkCard, defSide, defCard) {
  log(`バトル：${atkCard.name} → ${defCard.name}`);
  await fxCard(atkCard, "アタック！");
  await fxCard(defCard, "ディフェンド！");

  const atk = calcATK(attSide, atkCard);
  const def = calcATK(defSide, defCard);

  // 同値：相打ち
  if (atk === def) {
    sendToWing(attSide, atkCard, "同値相打ち");
    sendToWing(defSide, defCard, "同値相打ち");
    return;
  }

  if (atk > def) {
    sendToWing(defSide, defCard, "バトル敗北");

    // No.19 アロンダイト：倒したら1ドロー（簡易）
    if ((atkCard.equips || []).some((id) => findCardById(id)?.no === 19)) {
      draw(attSide, 1);
      log("アロンダイト：1ドロー");
      const item = atkCard.equips.map(findCardById).find((x) => x?.no === 19);
      if (item) await fxCard(item, "1ドロー");
    }
  } else {
    // No.12：毎ターン1回、バトル破壊を無効
    if (atkCard.no === 12 && !atkCard._usedBattleImmune) {
      atkCard._usedBattleImmune = true;
      log(`耐性：${atkCard.name} はバトル破壊を無効（このターン1回）`);
      await fxText("耐性発動！");
      return;
    }
    sendToWing(attSide, atkCard, "バトル敗北");
  }
}

// 相手場にキャラがいない時：シールド → 0ならダイレクト
async function attackShieldOrDirect(attSide, atkCard) {
  const defSide = attSide === "P1" ? "AI" : "P1";
  const def = state.players[defSide];

  const idx = def.shield.findIndex(Boolean);
  if (idx >= 0) {
    const broken = def.shield[idx];
    def.shield[idx] = null;
    def.hand.push(broken);
    log(`シールドブレイク：${defSide === "P1" ? "あなた" : "AI"} のシールドが手札に`);
    await fxCard(broken, "シールドが手札に！");
    renderAll();
    return;
  }

  // ダイレクト（相手場にキャラがいない時のみ）
  if (def.stage.filter(Boolean).length === 0) {
    // No.7：相手シールド0の時、直接攻撃不可
    if (atkCard.no === 7) {
      log("まひる：相手のシールドが0のため直接攻撃できない");
      await fxText("直接攻撃不可");
      return;
    }
    win(attSide, "ダイレクトアタック！");
  }
}

// ======== プレイヤー操作 ========
function cancelSelection() {
  state.attackFrom = null;
  clearArrow();
  setFocus("");
  renderAll();
}

async function playerAttack(attacker, kind, target, targetEl) {
  const pl = state.players.P1;

  // 攻撃回数制限（基本1、No.7が装備中なら2）
  const count = pl.attackedThisTurn.get(attacker.id) || 0;
  let limit = 1;
  if (attacker.no === 7 && (attacker.equips || []).length) limit = 2;

  if (count >= limit) {
    log("このキャラはもう攻撃できない");
    await fxText("攻撃回数上限");
    return;
  }
  pl.attackedThisTurn.set(attacker.id, count + 1);

  if (targetEl && state.attackFrom?.elRef) {
    drawArrowFromTo(state.attackFrom.elRef, targetEl);
  }

  if (kind === "char") {
    await battle("P1", attacker, "AI", target);
  } else {
    await attackShieldOrDirect("P1", attacker);
  }
  renderAll();
}

// ======== 手札プレイ（MVP） ========
async function playFromHand(card) {
  const pl = state.players.P1;

  // キャラ
  if (card.type === "character") {
    const empty = pl.stage.findIndex((x) => !x);
    if (empty < 0) {
      log("ステージが満員（3体まで）");
      await fxText("ステージ満員");
      return;
    }

    // 登場（rank4以下）ターン1回
    if (card.rank <= 4) {
      if (pl.normalSummoned) {
        log("登場はターンに1回まで");
        await fxText("登場は1回");
        return;
      }
      pl.normalSummoned = true;
      pl.hand = pl.hand.filter((c) => c.id !== card.id);
      pl.stage[empty] = card;
      log(`登場：${card.name}`);
      await fxCard(card, "登場！");
      renderAll();
      return;
    }

    // 見参（rank5以上）：手札 or ステージのキャラ1枚をウイングへ
    const candidates = [];
    for (const c of pl.hand) if (c.type === "character" && c.id !== card.id) candidates.push(c);
    for (const c of pl.stage) if (c) candidates.push(c);

    if (!candidates.length) {
      log("見参コストが払えない");
      await fxText("見参コスト不足");
      return;
    }

    const picked = await listPickModal("見参コスト", "ウイングに送るキャラを選択", candidates);
    if (!picked) return;

    // 支払い
    if (pl.hand.some((c) => c.id === picked.id)) {
      pl.hand = pl.hand.filter((c) => c.id !== picked.id);
      pl.wing.push(picked);
    } else {
      detachFromStage("P1", picked.id);
      pl.wing.push(picked);
    }

    // 見参
    pl.hand = pl.hand.filter((c) => c.id !== card.id);
    pl.stage[empty] = card;
    log(`見参：${card.name}`);
    await fxCard(card, "見参！");
    renderAll();
    return;
  }

  // アイテム：装備（EI枠に置き、キャラに紐付け）
  if (card.type === "item") {
    const hosts = pl.stage.filter(Boolean);
    if (!hosts.length) {
      log("装備先がいない");
      await fxText("装備先なし");
      return;
    }
    const host = await listPickModal("装備", "装備するキャラを選択", hosts);
    if (!host) return;

    const eiIdx = pl.ei.findIndex((x) => !x);
    if (eiIdx < 0) {
      log("Effect/Item枠が満員");
      await fxText("EI枠満員");
      return;
    }

    pl.hand = pl.hand.filter((c) => c.id !== card.id);
    pl.ei[eiIdx] = card;
    card.equippedTo = host.id;
    host.equips.push(card.id);

    log(`装備：${host.name} ← ${card.name}`);
    await fxCard(card, "装備！");
    renderAll();
    return;
  }

  // エフェクト：MVPは「発動演出→ウイング」（効果本実装は次段階）
  if (card.type === "effect") {
    const ok = await confirmModal("発動確認", `${card.name} を発動しますか？`, "発動する", "やめる");
    if (!ok) return;

    pl.hand = pl.hand.filter((c) => c.id !== card.id);
    pl.wing.push(card);

    log(`発動：${card.name}`);
    await fxCard(card, "発動！");
    renderAll();
    return;
  }
}

// ======== 描画 ========
function renderAll() {
  el.turnChip.textContent = `TURN ${state.turn}`;
  el.phaseChip.textContent = state.phase;

  // piles
  for (const who of ["P1", "AI"]) {
    const pl = state.players[who];
    qsPile(who === "P1" ? "playerDeck" : "enemyDeck").textContent = `x${pl.deck.length}`;
    qsPile(who === "P1" ? "playerWing" : "enemyWing").textContent = `x${pl.wing.length}`;
    qsPile(who === "P1" ? "playerOutside" : "enemyOutside").textContent = `x${pl.outside.length}`;
  }

  renderZone("playerChars", "P1", "stage");
  renderZone("enemyChars", "AI", "stage");
  renderZone("playerEI", "P1", "ei");
  renderZone("enemyEI", "AI", "ei");
  renderZone("playerShield", "P1", "shield", true);
  renderZone("enemyShield", "AI", "shield", true);

  renderHand();

  if (state.cur === "P1") {
    if (state.phase === "MAIN") setTips("手札タップで使用。長押しで拡大。");
    else if (state.phase === "BATTLE") setTips("自分の攻撃キャラ→攻撃先→確認で攻撃。キャンセル可。");
    else setTips("次のフェイズで進行。");
  } else {
    setTips("AI思考中…");
  }
}

function renderZone(zoneSel, who, key, hideCard = false) {
  const cont = qsSlots(zoneSel);
  cont.innerHTML = "";
  const pl = state.players[who];

  for (let i = 0; i < 3; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    const card = pl[key][i];

    if (card) {
      slot.classList.add("filled");

      const mini = document.createElement("div");
      mini.className = "mini";
      if (!hideCard) mini.style.backgroundImage = card._img ? `url(${card._img})` : "";
      slot.appendChild(mini);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = hideCard ? "SHIELD" : `No.${card.no}`;
      slot.appendChild(badge);

      if (card.type === "character" && !hideCard) {
        const atk = document.createElement("div");
        atk.className = "atk";
        atk.textContent = String(calcATK(who, card));
        slot.appendChild(atk);
      }

      // バトルフェイズ：選択ハイライト
      if (state.cur === "P1" && state.phase === "BATTLE") {
        if (who === "P1" && key === "stage") {
          if (state.attackFrom?.cardId === card.id) slot.classList.add("attacker");
        }
        if (who === "AI" && key === "stage") {
          if (state.attackFrom) slot.classList.add("selectable");
        }
      }

      // タップ挙動
      slot.addEventListener("click", async () => {
        if (state.winLocked) return;

        // バトル：攻撃元/先
        if (state.cur === "P1" && state.phase === "BATTLE") {
          if (who === "P1" && key === "stage") {
            state.attackFrom = { cardId: card.id, elRef: slot };
            clearArrow();
            setFocus(`攻撃元：${card.name}（攻撃先をタップ）`);
            renderAll();
            return;
          }

          if (who === "AI" && key === "stage") {
            if (!state.attackFrom) {
              await fxText("先に攻撃する自分キャラを選んで");
              return;
            }
            const attacker = findCardById(state.attackFrom.cardId);
            drawArrowFromTo(state.attackFrom.elRef, slot);
            const ok = await confirmModal("攻撃確認", `相手「${card.name}」に攻撃しますか？`, "攻撃する", "やめる");
            if (!ok) {
              cancelSelection();
              return;
            }
            await playerAttack(attacker, "char", card, slot);
            cancelSelection();
            return;
          }
        }

        // 通常：詳細
        showViewer(card, who);
      });

      // 長押し：拡大
      attachLongPress(slot, () => showViewer(card, who));

      // 画像解決
      resolveCardImage(card).then(() => {
        if (!hideCard) mini.style.backgroundImage = card._img ? `url(${card._img})` : "";
      });
    }

    cont.appendChild(slot);
  }

  // enemyShield：相手キャラがいない時、攻撃先にできる（確認つき）
  if (zoneSel === "enemyShield" && state.cur === "P1" && state.phase === "BATTLE") {
    const enemyHasChar = state.players.AI.stage.some(Boolean);
    const shieldSlots = cont.querySelectorAll(".slot");
    shieldSlots.forEach((s) => {
      const canTarget = !!state.attackFrom && !enemyHasChar;
      s.classList.toggle("selectable", canTarget);
      s.onclick = async () => {
        if (!canTarget || state.winLocked) return;

        const attacker = findCardById(state.attackFrom.cardId);
        const enemyShieldLeft = state.players.AI.shield.some(Boolean);

        drawArrowFromTo(state.attackFrom.elRef, s);
        const ok = await confirmModal(
          "攻撃確認",
          enemyShieldLeft ? "シールドを攻撃しますか？" : "ダイレクトアタックしますか？",
          "攻撃する",
          "やめる"
        );
        if (!ok) {
          cancelSelection();
          return;
        }
        await playerAttack(attacker, enemyShieldLeft ? "shield" : "direct", null, s);
        cancelSelection();
      };
    });
  }
}

async function renderHand() {
  const pl = state.players.P1;
  el.hand.innerHTML = "";

  for (const card of pl.hand) {
    if (card._img === null) resolveCardImage(card);

    const d = document.createElement("div");
    d.className = "card";
    if (state.cur === "P1" && state.phase === "MAIN") d.classList.add("playable");

    const img = document.createElement("div");
    img.className = "img";
    img.style.backgroundImage = card._img ? `url(${card._img})` : "";
    d.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    const p1 = document.createElement("div");
    p1.className = "pill";
    p1.textContent = `No.${card.no}`;
    const p2 = document.createElement("div");
    p2.className = "pill";
    p2.textContent = `R${card.rank} ${card.type}`;
    meta.appendChild(p1);
    meta.appendChild(p2);
    d.appendChild(meta);

    d.addEventListener("click", async () => {
      if (state.winLocked) return;
      if (state.cur !== "P1") return;

      if (state.phase === "MAIN") {
        await playFromHand(card);
      } else {
        showViewer(card, "P1");
      }
    });
    attachLongPress(d, () => showViewer(card, "P1"));

    resolveCardImage(card).then(() => {
      img.style.backgroundImage = card._img ? `url(${card._img})` : "";
    });

    el.hand.appendChild(d);
  }
}

// ======== AI（A：出せるカードを出す） ========
async function maybeAI() {
  if (state.winLocked) return;
  if (state.cur !== "AI") return;

  await sleep(320);

  if (state.phase === "START") {
    nextPhase();
    return;
  }
  if (state.phase === "DRAW") {
    nextPhase();
    return;
  }

  if (state.phase === "MAIN") {
    const ai = state.players.AI;

    // 登場（rank4以下）ターン1回
    if (!ai.normalSummoned) {
      const empty = ai.stage.findIndex((x) => !x);
      if (empty >= 0) {
        const c = ai.hand.find((x) => x.type === "character" && x.rank <= 4);
        if (c) {
          ai.hand = ai.hand.filter((x) => x.id !== c.id);
          ai.stage[empty] = c;
          ai.normalSummoned = true;
          log(`AI：${c.name} を登場`);
          await fxCard(c, "AIが登場");
        }
      }
    }
    nextPhase(); // BATTLEへ
    return;
  }

  if (state.phase === "BATTLE") {
    await aiBattle();
    nextPhase(); // ENDへ
    return;
  }
}

async function aiBattle() {
  const ai = state.players.AI;
  const me = state.players.P1;

  const attackers = ai.stage.filter(Boolean);
  for (const a of attackers) {
    if (state.winLocked) return;

    // 1回攻撃（MVP）
    const myChars = me.stage.filter(Boolean);
    if (myChars.length > 0) {
      const t = myChars[Math.floor(Math.random() * myChars.length)];
      await battle("AI", a, "P1", t);
    } else {
      await attackShieldOrDirect("AI", a);
    }
    await sleep(140);
  }
}

// ======== 初期化 ========
async function bootGame() {
  log("ゲーム開始：デッキをシャッフル");
  const p1 = state.players.P1;
  const ai = state.players.AI;

  p1.deck = buildDeck();
  ai.deck = buildDeck();

  // シールド：デッキトップ3
  for (let i = 0; i < 3; i++) {
    p1.shield[i] = p1.deck.shift();
    ai.shield[i] = ai.deck.shift();
  }

  // 初期手札：4枚
  draw("P1", 4);
  draw("AI", 4);

  // 先攻ランダム
  state.cur = Math.random() < 0.5 ? "P1" : "AI";
  state.turn = 1;
  state.phase = "START";

  log(`${state.cur === "P1" ? "あなた" : "AI"} が先攻`);
  renderAll();
  setTips("「次のフェイズ」で進める。MAINでカードを使える。長押しで拡大。");

  maybeAI();
}

// ======== イベント ========
el.title?.addEventListener("click", () => {
  if (state.started) return;
  state.started = true;
  el.title.classList.remove("active");
  el.game.classList.add("active");
  bootGame();
});

el.btnSkipFx?.addEventListener("click", () => {
  state.skipFx = !state.skipFx;
  log(`演出スキップ：${state.skipFx ? "ON" : "OFF"}`);
});

el.btnFxSkip2?.addEventListener("click", hideFx);
el.btnRestart?.addEventListener("click", () => location.reload());
el.winRestart?.addEventListener("click", () => location.reload());

el.btnNextPhase?.addEventListener("click", () => nextPhase());
el.btnEndTurn?.addEventListener("click", () => endTurn());
el.btnCancelSelect?.addEventListener("click", () => cancelSelection());

el.modalClose?.addEventListener("click", () => hideModal());
el.viewerClose?.addEventListener("click", () => hideViewer());

// Wing/Outside
el.playerWingPile?.addEventListener("click", () => openZoneList("P1", "wing"));
el.playerOutsidePile?.addEventListener("click", () => openZoneList("P1", "outside"));
el.enemyWingPile?.addEventListener("click", () => openZoneList("AI", "wing"));
el.enemyOutsidePile?.addEventListener("click", () => openZoneList("AI", "outside"));

// フィールド背景
(async () => {
  const fieldOk = await firstExistingImage([ASSET_FIELD_PNG]);
  if (fieldOk && el.fieldBg) {
    el.fieldBg.style.backgroundImage = `url(${fieldOk})`;
  }
})();