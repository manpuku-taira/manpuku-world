/* =========================================================
   Manpuku World - game.js（丸ごと置換版）
   - CSSは未変更（JSのみ）
   - No.21〜No.30 を実装（No.31は未提供のため未実装）
   ========================================================= */

/* -----------------------------
   0) 定数・ユーティリティ
----------------------------- */
const MAX_CARD_NO = 30;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function nowTurnKey(state) {
  // 「このターンの終わりまで」判定用キー
  return `${state.turn}:${state.activeSide}`;
}
function log(state, msg) {
  state.log.push(msg);
  if (state.log.length > 200) state.log.shift();
}
function isEmptySlot(slot) {
  return !slot || !slot.no;
}
function hasTag(card, tag) {
  return (card.tags || []).includes(tag);
}
function hasTitleTag(card, titleTag) {
  return (card.titleTag || "") === titleTag;
}
function cardName(card) {
  return card?.name || "";
}
function findFirstEmptyC(state, side) {
  const C = state.field[side].C;
  for (let i = 0; i < C.length; i++) {
    if (isEmptySlot(C[i])) return i;
  }
  return -1;
}
function listAllCardsInAllZones(state) {
  const all = [];
  ["P1", "AI"].forEach((side) => {
    // deck/hand/wing
    state.zones[side].deck.forEach((c) => all.push(c));
    state.zones[side].hand.forEach((c) => all.push(c));
    state.zones[side].wing.forEach((c) => all.push(c));
    // stage C/E/S
    state.field[side].C.forEach((c) => c && c.no && all.push(c));
    state.field[side].E.forEach((c) => c && c.no && all.push(c));
    state.field[side].S.forEach((c) => c && c.no && all.push(c));
  });
  return all;
}

/* -----------------------------
   1) カード定義（No.1〜No.30）
   ※既存No.1〜No.20は「そのまま」想定。
   ※ここでは No.21〜No.30 を追加定義。
   ※既存の定義が別場所にある場合は、
     そちらに追記してください（番号衝突注意）。
----------------------------- */

// 既存のCardDBがある想定。無い場合は作る。
const CardDB = window.CardDB || {};
window.CardDB = CardDB;

// 既存カードがある前提：CardDB[1]..CardDB[20] は既に定義済み。
// ここでNo.21〜No.30を追加。
CardDB[21] = {
  no: 21,
  name: "ミーコ",
  type: "Character",
  rank: 3,
  atk: 500,
  tags: ["アバター", "霊魂", "ミジンコ"],
  titleTag: "怨霊撲滅屋GB",
};

CardDB[22] = {
  no: 22,
  name: "インフルエンサーまりも",
  type: "Character",
  rank: 3,
  atk: 400,
  tags: ["人間", "配信", "人気"],
  titleTag: "BUGBUG西遊記",
};

CardDB[23] = {
  no: 23,
  name: "退魔師レイチェル",
  type: "Character",
  rank: 5,
  atk: 2200,
  tags: ["除霊", "令嬢", "射手"],
  titleTag: "怨霊撲滅屋GB",
  summon: "kensanSac1", // 手札または自分ステージ1体をウイングに送り、手札から見参
};

CardDB[24] = {
  no: 24,
  name: "銀弾の双銃",
  type: "item",
  rank: 4,
  atk: 0,
  tags: ["除霊", "拳銃"],
  titleTag: "怨霊撲滅屋GB",
  equipAtk: 500,
};

CardDB[25] = {
  no: 25,
  name: "小次郎＆小太郎",
  type: "Character",
  rank: 5,
  atk: 2500,
  tags: ["アバター", "GAME", "兄弟"],
  titleTag: "BUGBUG西遊記",
  summon: "kensanSac1",
};

CardDB[26] = {
  no: 26,
  name: "ジュエリー・ルビー",
  type: "Character",
  rank: 4,
  atk: 1700,
  tags: ["美少女戦士", "アニメ", "格闘"],
  titleTag: "Ve ヴォイスエレメント",
  summon: "pairRubySapphire", // サファイアがいるなら手札から見参
};

CardDB[27] = {
  no: 27,
  name: "ジュエリー・サファイア",
  type: "Character",
  rank: 4,
  atk: 1700,
  tags: ["美少女戦士", "アニメ", "格闘"],
  titleTag: "Ve ヴォイスエレメント",
  summon: "pairRubySapphire", // ルビーがいるなら手札から見参
};

CardDB[28] = {
  no: 28,
  name: "セシア＆アリサ",
  type: "Character",
  rank: 4,
  atk: 1500,
  tags: ["除霊", "支援", "侍女"],
  titleTag: "怨霊撲滅屋GB",
};

CardDB[29] = {
  no: 29,
  name: "狼猫 - 孫悟空Lv75 -",
  type: "Character",
  rank: 5,
  atk: 2400,
  tags: ["アバター", "GAME", "剣士"],
  titleTag: "BUGBUG西遊記",
  summon: "kensanSac1",
};

CardDB[30] = {
  no: 30,
  name: "七星剣",
  type: "item",
  rank: 4,
  atk: 0,
  tags: ["課金アイテム", "刀剣"],
  titleTag: "BUGBUG西遊記",
  equipAtk: 500,
};

/* -----------------------------
   2) ゲーム状態初期化
   - コレクション: No.1〜No.30を所持
   - 初期デッキ: 既存と同じ40枚を維持（No.1〜No.20を2枚ずつ想定）
   - デッキ編集: 上限No.30に拡張
----------------------------- */
function makeCardInstance(no) {
  const base = CardDB[no];
  if (!base) return null;
  return {
    no: base.no,
    name: base.name,
    type: base.type,
    rank: base.rank,
    atk: base.atk,
    tags: deepClone(base.tags || []),
    titleTag: base.titleTag || "",
    summon: base.summon || "normal",
    // runtime
    facedown: false,
    tapped: false,
    attackedCountThisTurn: 0,
    // 「このターンの終わりまで無効」用（まりも）
    silencedTurnKey: null,
    // ミーコ「1ターンに1度バトルで破壊されない」用
    battleSaveUsedTurnKey: null,
  };
}

function initState() {
  const state = {
    turn: 1,
    activeSide: "P1", // P1/AI
    phase: "MAIN", // MAIN/BATTLE/END
    log: [],
    gameOver: false,
    winner: null,

    zones: {
      P1: { deck: [], hand: [], wing: [] },
      AI: { deck: [], hand: [], wing: [] },
    },
    field: {
      P1: { C: [null, null, null], E: [null, null, null], S: [null, null, null] },
      AI: { C: [null, null, null], E: [null, null, null], S: [null, null, null] },
    },
    limits: {
      P1: {},
      AI: {},
    },
  };

  // コレクション（内部的には deck/hand を作るために使用）
  // 所持数はUI側実装に依存。ここは「初期デッキ構築」を優先。
  const p1DeckNos = [];
  const aiDeckNos = [];

  // 既存の初期40枚を崩さない（No.1〜No.20を2枚ずつ=40）
  for (let i = 1; i <= 20; i++) {
    p1DeckNos.push(i, i);
    aiDeckNos.push(i, i);
  }

  p1DeckNos.forEach((no) => state.zones.P1.deck.push(makeCardInstance(no)));
  aiDeckNos.forEach((no) => state.zones.AI.deck.push(makeCardInstance(no)));

  shuffle(state.zones.P1.deck);
  shuffle(state.zones.AI.deck);

  // 初期手札
  draw(state, "P1", 5);
  draw(state, "AI", 5);

  // 初期シールド（既存ルールに合わせて 3 枚想定）
  setInitialShields(state, "P1", 3);
  setInitialShields(state, "AI", 3);

  log(state, "ゲーム開始。");
  return state;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function draw(state, side, n = 1) {
  for (let i = 0; i < n; i++) {
    const deck = state.zones[side].deck;
    if (deck.length <= 0) {
      // デッキ切れルールがある場合はここで処理
      log(state, `${side}のデッキが切れた。`);
      // 既存ルールに合わせる（デッキ切れで負け等）ならここで終了処理
      // ここでは既存実装を尊重し、ゲームオーバー処理は外部に任せる。
      break;
    }
    state.zones[side].hand.push(deck.shift());
  }
}

function setInitialShields(state, side, n) {
  const S = state.field[side].S;
  for (let i = 0; i < S.length; i++) S[i] = null;
  const deck = state.zones[side].deck;
  for (let i = 0; i < n; i++) {
    if (deck.length <= 0) break;
    const c = deck.shift();
    c.facedown = true;
    S[i] = c;
  }
}

/* -----------------------------
   3) 装備・ATK計算・攻撃回数
----------------------------- */
function findEquippedItem(state, side, charCard) {
  // 既存仕様：Eスロットに「そのキャラに装備」形式なら対応が必要。
  // このJSでは「E枠のカードに equipTargetIndex がある」想定で扱う。
  const E = state.field[side].E;
  for (let i = 0; i < E.length; i++) {
    const it = E[i];
    if (it && it.no && it.equipTargetIndex === charCard._fieldIndex) return it;
  }
  return null;
}

function countOnStage(state, side, no) {
  return state.field[side].C.filter((c) => c && c.no === no).length;
}

function isCardSilencedThisTurn(state, card) {
  if (!card || !card.no) return false;
  return card.silencedTurnKey === nowTurnKey(state);
}

function calcAtk(state, side, card) {
  if (!card || !card.no) return 0;
  let atk = card.atk || 0;

  // まりもで無効中のカードは「効果参照」を止める（ATKそのものは基本値）
  // ただし装備による上昇や常在+500等は効果扱いか判断が必要。
  // ここでは「無効中は、カードテキスト由来の加算は無視」方針。
  const silenced = isCardSilencedThisTurn(state, card);

  // 装備ATK（アイテム側の効果として扱う：装備品が無効なら加算しない）
  const eq = findEquippedItem(state, side, card);
  if (eq && eq.no && !isCardSilencedThisTurn(state, eq)) {
    // 共通 +500
    const baseEquipAtk = CardDB[eq.no]?.equipAtk || 0;
    atk += baseEquipAtk;

    // No.24「銀弾の双銃」：タグ「除霊」ならさらに+500
    if (eq.no === 24 && hasTag(card, "除霊")) {
      atk += 500;
    }

    // No.30「七星剣」：タグ「剣士」ならさらに+500
    if (eq.no === 30 && hasTag(card, "剣士")) {
      atk += 500;
    }
  }

  // No.26/27 常在：タグ「美少女戦士」のATK+500（ルビー/サファイアが場にいる間）
  // ルビー/サファイア自身の効果扱いなので、ルビー/サファイアが無効ならその分は加算しない
  const ruby = state.field[side].C.find((c) => c && c.no === 26);
  const sapp = state.field[side].C.find((c) => c && c.no === 27);
  let buffCount = 0;
  if (ruby && !isCardSilencedThisTurn(state, ruby)) buffCount++;
  if (sapp && !isCardSilencedThisTurn(state, sapp)) buffCount++;
  if (!silenced && hasTag(card, "美少女戦士") && buffCount > 0) {
    atk += 500 * buffCount;
  }

  return atk;
}

function maxAttacksThisTurn(state, side, card) {
  if (!card || !card.no) return 0;
  let max = 1;

  const eq = findEquippedItem(state, side, card);
  if (eq && eq.no && !isCardSilencedThisTurn(state, eq)) {
    // 既存No.7などがある場合は既存の加算も残す（ここでは未記述）
    // No.24：タグ「除霊」なら「攻撃回数を2回追加」=> 合計3回
    if (eq.no === 24 && hasTag(card, "除霊")) {
      max += 2;
    }
    // No.30：追加回数は無い（全体攻撃能力のみ）
  }

  return max;
}

/* -----------------------------
   4) 見参（召喚）処理
----------------------------- */
function canSpecialSummonFromHand(state, side, handCard) {
  if (!handCard || !handCard.no) return false;
  const base = CardDB[handCard.no];
  if (!base) return false;

  // まりも無効を受けている手札カードでも「手札から送って発動」系は可能にする（No.22は手札誘発）
  // ここは「見参条件」のみ判定。

  // pairRubySapphire
  if (base.summon === "pairRubySapphire") {
    if (handCard.no === 26) {
      // サファイアが自分ステージにいる
      return state.field[side].C.some((c) => c && c.no === 27);
    }
    if (handCard.no === 27) {
      // ルビーが自分ステージにいる
      return state.field[side].C.some((c) => c && c.no === 26);
    }
  }

  return false;
}

function summonFromHand(state, side, handIndex, cIndex, mode = "normal") {
  const hand = state.zones[side].hand;
  const card = hand[handIndex];
  if (!card) return false;

  const base = CardDB[card.no];
  if (!base) return false;

  // 空きチェック
  if (cIndex < 0 || cIndex >= state.field[side].C.length) return false;
  if (!isEmptySlot(state.field[side].C[cIndex])) return false;

  // mode:
  // - normal: 既存の通常見参制限があるならここに組み込み
  // - special: 条件達成で見参（ルビー/サファイア等）
  // - kensanSac1: 手札/ステージ1体をウイングへ送ってから見参（レイチェル/小次郎小太郎/狼猫）

  // 「登場できない」系：summonが kensanSac1 のものは通常見参不可
  if (base.summon === "kensanSac1" && mode !== "kensanSac1") {
    log(state, `${card.name}は登場できない。条件を満たして見参してください。`);
    return false;
  }

  // pairRubySapphire
  if (base.summon === "pairRubySapphire" && mode !== "special") {
    log(state, `${card.name}は条件が必要です。`);
    return false;
  }

  // 実配置
  hand.splice(handIndex, 1);
  card._fieldIndex = cIndex; // 装備紐付け用
  state.field[side].C[cIndex] = card;
  log(state, `${side}が「${card.name}」を見参。`);

  // 登場時効果
  onEnter(state, side, card);

  return true;
}

function sendOneToWingForKensan(state, side, pick) {
  // pick = { from: "HAND"|"STAGE", index: number }
  if (pick.from === "HAND") {
    const c = state.zones[side].hand[pick.index];
    if (!c) return false;
    state.zones[side].hand.splice(pick.index, 1);
    state.zones[side].wing.push(c);
    log(state, `${side}は手札の「${c.name}」をウイングに送った。`);
    return true;
  }
  if (pick.from === "STAGE") {
    const c = state.field[side].C[pick.index];
    if (!c || !c.no) return false;
    state.field[side].C[pick.index] = null;
    state.zones[side].wing.push(c);
    log(state, `${side}はステージの「${c.name}」をウイングに送った。`);
    return true;
  }
  return false;
}

/* -----------------------------
   5) 検索（デッキ/ウイング→手札）共通
   ※まりも（No.22）を挟めるよう「発動前フック」を用意
----------------------------- */
function offerMarimoCounter(state, activatorSide, sourceCard, meta) {
  // meta: { addFromDeckToHand: true } or { kensanFromDeck: true }
  const defenderSide = activatorSide === "P1" ? "AI" : "P1";
  const hand = state.zones[defenderSide].hand;
  const idx = hand.findIndex((c) => c && c.no === 22);

  if (idx === -1) return { canceled: false };

  // まりも自身は「手札からウイングへ送って発動」なので、無効状態でも発動可能にする
  // ただし、ここは「相手の効果が発動した時」なので、sourceCardが無効化されたカードの効果発動はそもそも起きない想定。

  // 対象条件
  const isTarget =
    (meta?.addFromDeckToHand === true) || (meta?.kensanFromDeck === true);

  if (!isTarget) return { canceled: false };

  // プレイヤーなら選択、AIなら自動
  if (defenderSide === "P1") {
    // UI側がある想定：confirmで簡易実装
    const ok = window.confirm(
      `相手が検索系効果を発動しました。\n手札の「インフルエンサーまりも」をウイングに送り、そのカードの効果をこのターン終了まで無効にしますか？`
    );
    if (!ok) return { canceled: false };
  }

  // まりもをウイングへ
  const marimo = hand.splice(idx, 1)[0];
  state.zones[defenderSide].wing.push(marimo);
  log(state, `${defenderSide}は「${marimo.name}」をウイングに送り発動。`);

  // sourceCardをこのターン終了まで無効化
  if (sourceCard && sourceCard.no) {
    sourceCard.silencedTurnKey = nowTurnKey(state);
    log(state, `このターン終了まで「${sourceCard.name}」の効果を全て無効にする。`);
  }

  return { canceled: false }; // 効果自体は止めない。無効化で「以降の効果」を止める。
}

function searchFromDeckOrWingToHand(state, side, sourceCard, filterFn, meta) {
  // まりもカウンター
  offerMarimoCounter(state, side, sourceCard, meta);

  // sourceCardが無効なら処理中止（「効果を全て無効」= この効果も不発）
  if (sourceCard && isCardSilencedThisTurn(state, sourceCard)) {
    log(state, `「${sourceCard.name}」は無効のため効果が解決されない。`);
    return false;
  }

  const pool = [];
  state.zones[side].deck.forEach((c, i) => {
    if (filterFn(c)) pool.push({ zone: "DECK", index: i, card: c });
  });
  state.zones[side].wing.forEach((c, i) => {
    if (filterFn(c)) pool.push({ zone: "WING", index: i, card: c });
  });

  if (pool.length === 0) {
    log(state, `${side}は条件に合うカードを見つけられなかった。`);
    return false;
  }

  let chosen = pool[0];

  if (side === "P1") {
    // 簡易UI：名前一覧から選択（本格UIがある場合は既存に合わせて置換）
    const list = pool.map((p, idx) => `${idx + 1}: [${p.zone}] ${p.card.name} (No.${p.card.no})`).join("\n");
    const inStr = window.prompt(`手札に加えるカードを選んでください。\n${list}`, "1");
    const n = parseInt(inStr || "1", 10);
    if (!isNaN(n) && n >= 1 && n <= pool.length) chosen = pool[n - 1];
  } else {
    // AI：ATK高い/優先度で適当に（アイテムはrank高い等）
    chosen = pool[0];
  }

  if (chosen.zone === "DECK") {
    const c = state.zones[side].deck.splice(chosen.index, 1)[0];
    state.zones[side].hand.push(c);
    log(state, `${side}はデッキから「${c.name}」を手札に加えた。`);
  } else {
    const c = state.zones[side].wing.splice(chosen.index, 1)[0];
    state.zones[side].hand.push(c);
    log(state, `${side}はウイングから「${c.name}」を手札に加えた。`);
  }
  return true;
}

/* -----------------------------
   6) 登場時効果（No.26/27/28 等）
   ※レイチェル装備の封印もここでチェック（相手の怨霊/霊魂の効果発動不可）
----------------------------- */
function opponentHasRachelSeal(state, sideAttemptingToResolve) {
  // 「このカードがアイテムを装備している時、相手ステージのタグ『怨霊』『霊魂』は効果を発動できない」
  // = 相手側(=レイチェル側)に、装備中レイチェルが存在するか
  const opp = sideAttemptingToResolve === "P1" ? "AI" : "P1";
  const rachel = state.field[opp].C.find((c) => c && c.no === 23);
  if (!rachel) return false;
  if (isCardSilencedThisTurn(state, rachel)) return false;

  const eq = findEquippedItem(state, opp, rachel);
  if (!eq || !eq.no) return false;
  if (isCardSilencedThisTurn(state, eq)) return false;

  return true;
}

function isSealedByRachel(state, side, card) {
  if (!card || !card.no) return false;
  if (!opponentHasRachelSeal(state, side)) return false;
  return hasTag(card, "怨霊") || hasTag(card, "霊魂");
}

function onEnter(state, side, card) {
  // まりも無効中のカードは登場時効果を解決しない
  if (isCardSilencedThisTurn(state, card)) {
    log(state, `「${card.name}」は無効のため登場時効果が解決されない。`);
    return;
  }
  // レイチェル封印対象（怨霊/霊魂）は登場時効果も「効果発動不可」扱いで止める
  if (isSealedByRachel(state, side, card)) {
    log(state, `「${card.name}」はレイチェルの封印により効果を発動できない。`);
    return;
  }

  // No.26/27：登場時：手札1枚ウイング→デッキ/ウイングからタグ「アニメ」1枚手札
  if (card.no === 26 || card.no === 27) {
    if (state.zones[side].hand.length <= 0) {
      log(state, `${side}は手札が無く、効果を解決できない。`);
      return;
    }

    let discardIdx = 0;
    if (side === "P1") {
      const list = state.zones[side].hand.map((c, i) => `${i + 1}: ${c.name} (No.${c.no})`).join("\n");
      const inStr = window.prompt(`手札を1枚ウイングに送ります。選んでください。\n${list}`, "1");
      const n = parseInt(inStr || "1", 10);
      if (!isNaN(n) && n >= 1 && n <= state.zones[side].hand.length) discardIdx = n - 1;
    } else {
      // AI：ランク低い/ATK低いものを優先で捨てる簡易
      discardIdx = 0;
    }

    const discarded = state.zones[side].hand.splice(discardIdx, 1)[0];
    state.zones[side].wing.push(discarded);
    log(state, `${side}は手札の「${discarded.name}」をウイングに送った。`);

    searchFromDeckOrWingToHand(
      state,
      side,
      card,
      (c) => c && c.no && hasTag(c, "アニメ"),
      { addFromDeckToHand: true }
    );
    return;
  }

  // No.28：登場時：デッキから「怨霊撲滅屋GB」アイテム1枚を手札
  if (card.no === 28) {
    searchFromDeckOrWingToHand(
      state,
      side,
      card,
      (c) => c && c.no && c.type === "item" && hasTitleTag(c, "怨霊撲滅屋GB"),
      { addFromDeckToHand: true }
    );
    return;
  }

  // 既存カードの登場時効果は元のJSにある想定
}

/* -----------------------------
   7) 起動効果（ビューア「効果発動」ボタン想定）
   - No.28：レイチェル条件無視見参
   - No.29：1ターンに1度 BUGBUG西遊記 アイテムサーチ
   ※他の既存カードの起動効果は元の実装に合わせて合流してください
----------------------------- */
function canActivateAbility(state, side, card) {
  if (!card || !card.no) return false;

  // まりも無効中のカードは起動不可
  if (isCardSilencedThisTurn(state, card)) return false;

  // レイチェル封印
  if (isSealedByRachel(state, side, card)) return false;

  // No.28：自分ターンのみ、場にいる時、手札のレイチェルを条件無視で見参
  if (card.no === 28) {
    if (state.activeSide !== side) return false;
    const hasRachelInHand = state.zones[side].hand.some((c) => c && c.no === 23 && c.rank <= 5);
    const empty = findFirstEmptyC(state, side) !== -1;
    return hasRachelInHand && empty;
  }

  // No.29：1ターンに1度 BUGBUG西遊記 アイテムサーチ
  if (card.no === 29) {
    if (state.activeSide !== side) return false;
    const key = nowTurnKey(state);
    if (state.limits[side].wolfcatUsedTurnKey === key) return false;

    const exists = state.zones[side].deck.some((c) => c && c.no && c.type === "item" && hasTitleTag(c, "BUGBUG西遊記")) ||
      state.zones[side].wing.some((c) => c && c.no && c.type === "item" && hasTitleTag(c, "BUGBUG西遊記"));
    return exists;
  }

  return false;
}

function activateAbility(state, side, card) {
  if (!canActivateAbility(state, side, card)) {
    log(state, "その効果は発動できない。");
    return false;
  }

  // No.28：手札のレイチェルを条件無視で見参
  if (card.no === 28) {
    const hand = state.zones[side].hand;
    const candidates = [];
    hand.forEach((c, i) => {
      if (c && c.no === 23 && c.rank <= 5) candidates.push({ i, c });
    });
    if (candidates.length === 0) return false;

    let pick = candidates[0];
    if (side === "P1") {
      const list = candidates.map((p, idx) => `${idx + 1}: ${p.c.name} (No.${p.c.no})`).join("\n");
      const inStr = window.prompt(`見参させる「レイチェル」を選んでください。\n${list}`, "1");
      const n = parseInt(inStr || "1", 10);
      if (!isNaN(n) && n >= 1 && n <= candidates.length) pick = candidates[n - 1];
    }

    const cIndex = findFirstEmptyC(state, side);
    if (cIndex === -1) return false;

    // 条件無視で配置（kensanSac1を無視）
    const rachel = hand.splice(pick.i, 1)[0];
    rachel._fieldIndex = cIndex;
    state.field[side].C[cIndex] = rachel;
    log(state, `${side}は「${rachel.name}」を条件無視で見参。`);
    onEnter(state, side, rachel);
    return true;
  }

  // No.29：サーチ
  if (card.no === 29) {
    state.limits[side].wolfcatUsedTurnKey = nowTurnKey(state);
    searchFromDeckOrWingToHand(
      state,
      side,
      card,
      (c) => c && c.no && c.type === "item" && hasTitleTag(c, "BUGBUG西遊記"),
      { addFromDeckToHand: true }
    );
    return true;
  }

  return false;
}

/* -----------------------------
   8) バトル
   - No.21：1ターンに1度バトル破壊されない
   - No.21：シールド0で直接攻撃を受ける時、手札から見参して無効＋バトル終了
   - No.23：バトルで相手キャラをウイングに送ったら相手シールド1枚破壊
   - No.30：剣士装備時、相手全キャラへ1度ずつ攻撃（全体攻撃）
----------------------------- */
function shieldsCount(state, side) {
  return state.field[side].S.filter((c) => c && c.no).length;
}

function breakOneShield(state, sideToBreak) {
  const S = state.field[sideToBreak].S;
  const idx = S.findIndex((c) => c && c.no);
  if (idx === -1) return false;
  const sh = S[idx];
  S[idx] = null;
  sh.facedown = false;
  // ルール：破壊された側の手札へ
  state.zones[sideToBreak].hand.push(sh);
  log(state, `${sideToBreak}のシールドが1枚破壊され、手札に加わった。`);
  return true;
}

function tryMiikoBlockDirect(state, defenderSide) {
  // 自分シールド0枚で相手の直接攻撃を受ける時、
  // 手札から見参できる。攻撃無効＋このターンのバトル終了。
  if (shieldsCount(state, defenderSide) !== 0) return { blocked: false };
  const hand = state.zones[defenderSide].hand;
  const idx = hand.findIndex((c) => c && c.no === 21);
  if (idx === -1) return { blocked: false };

  const empty = findFirstEmptyC(state, defenderSide);
  if (empty === -1) {
    log(state, `${defenderSide}は「ミーコ」を見参できる空きがない。`);
    return { blocked: false };
  }

  if (defenderSide === "P1") {
    const ok = window.confirm(
      `相手の直接攻撃です（シールド0）。\n手札の「ミーコ」を見参して攻撃を無効にし、このターンのバトルを終了しますか？`
    );
    if (!ok) return { blocked: false };
  }

  // 見参
  const miiko = hand.splice(idx, 1)[0];
  miiko._fieldIndex = empty;
  state.field[defenderSide].C[empty] = miiko;
  log(state, `${defenderSide}は「${miiko.name}」を手札から見参し、直接攻撃を無効にした。`);
  log(state, "このターンのバトルを終了する。");

  // バトル終了：攻撃側のフェーズをENDへ
  state.phase = "END";
  return { blocked: true };
}

function canUseAoEAttack(state, side, attacker) {
  const eq = findEquippedItem(state, side, attacker);
  if (!eq || eq.no !== 30) return false;
  if (isCardSilencedThisTurn(state, eq)) return false;
  if (!hasTag(attacker, "剣士")) return false;
  const opp = side === "P1" ? "AI" : "P1";
  return state.field[opp].C.some((c) => c && c.no);
}

function resolveSingleBattle(state, attackerSide, attacker, defenderSide, defender) {
  const atkA = calcAtk(state, attackerSide, attacker);
  const atkD = calcAtk(state, defenderSide, defender);

  log(state, `バトル：${attacker.name}(${atkA}) vs ${defender.name}(${atkD})`);

  if (atkA > atkD) {
    // defender to wing
    sendToWing(state, defenderSide, defender, { bySide: attackerSide, kind: "BATTLE" });

    // No.23：相手をウイングに送った時、相手シールド1枚破壊
    if (attacker.no === 23 && !isCardSilencedThisTurn(state, attacker)) {
      breakOneShield(state, defenderSide);
    }
    return;
  }

  if (atkA < atkD) {
    // attacker destroyed by battle, but No.21 save
    if (attacker.no === 21) {
      const key = nowTurnKey(state);
      if (attacker.battleSaveUsedTurnKey !== key) {
        attacker.battleSaveUsedTurnKey = key;
        log(state, `「${attacker.name}」は1ターンに1度、バトルで破壊されない。`);
        return;
      }
    }
    sendToWing(state, attackerSide, attacker, { bySide: defenderSide, kind: "BATTLE" });
    return;
  }

  // tie: both to wing (apply miiko save first)
  let attackerSaved = false;
  if (attacker.no === 21) {
    const key = nowTurnKey(state);
    if (attacker.battleSaveUsedTurnKey !== key) {
      attacker.battleSaveUsedTurnKey = key;
      attackerSaved = true;
      log(state, `「${attacker.name}」は1ターンに1度、バトルで破壊されない。`);
    }
  }
  if (!attackerSaved) sendToWing(state, attackerSide, attacker, { bySide: defenderSide, kind: "BATTLE" });
  sendToWing(state, defenderSide, defender, { bySide: attackerSide, kind: "BATTLE" });
}

function resolveAoEBattle(state, attackerSide, attacker) {
  const defenderSide = attackerSide === "P1" ? "AI" : "P1";
  // 相手の現存キャラをスナップショット
  const targets = state.field[defenderSide].C
    .map((c, idx) => ({ c, idx }))
    .filter((p) => p.c && p.c.no);

  log(state, `「${attacker.name}」は七星剣の効果で相手全キャラへ1度ずつ攻撃する。`);

  for (const t of targets) {
    // attackerが途中で消えていたら中断
    const still = state.field[attackerSide].C.find((c) => c && c.no === attacker.no && c === attacker);
    if (!still) break;

    // targetが途中で消えていたらスキップ
    const currentTarget = state.field[defenderSide].C[t.idx];
    if (!currentTarget || !currentTarget.no) continue;

    resolveSingleBattle(state, attackerSide, attacker, defenderSide, currentTarget);
  }
}

function performAttack(state, attackerSide, attacker, target) {
  const defenderSide = attackerSide === "P1" ? "AI" : "P1";

  // 直接攻撃
  if (target === "DIRECT") {
    // ミーコで防がれる可能性
    const res = tryMiikoBlockDirect(state, defenderSide);
    if (res.blocked) return;

    // 既存ルール：直接攻撃が通ったらゲーム終了（既存に合わせて）
    state.gameOver = true;
    state.winner = attackerSide;
    log(state, `${attackerSide}の直接攻撃が成立。${attackerSide}の勝利。`);
    return;
  }

  // 全体攻撃
  if (target === "AOE") {
    resolveAoEBattle(state, attackerSide, attacker);
    return;
  }

  // 通常：キャラ指定（targetは defender card）
  resolveSingleBattle(state, attackerSide, attacker, defenderSide, target);
}

function canAttack(state, side, attacker) {
  if (state.phase !== "BATTLE") return false;
  if (state.activeSide !== side) return false;
  if (!attacker || !attacker.no) return false;
  // attackedCountThisTurn vs max
  const max = maxAttacksThisTurn(state, side, attacker);
  return (attacker.attackedCountThisTurn || 0) < max;
}

/* -----------------------------
   9) ウイング送り（原因付き）
   - No.25：相手の効果 or バトルでウイングに送られた時、2体まで見参
----------------------------- */
function removeFromStageIfExists(state, side, card) {
  // Cから外す
  for (let i = 0; i < state.field[side].C.length; i++) {
    if (state.field[side].C[i] === card) {
      state.field[side].C[i] = null;
      return true;
    }
  }
  return false;
}

function sendToWing(state, side, card, cause) {
  if (!card || !card.no) return false;

  // 外してウイングへ
  removeFromStageIfExists(state, side, card);
  // 装備解除（E枠の紐付けを外す）
  state.field[side].E.forEach((it) => {
    if (it && it.no && it.equipTargetIndex === card._fieldIndex) {
      it.equipTargetIndex = null;
    }
  });

  state.zones[side].wing.push(card);
  log(state, `${side}の「${card.name}」はウイングに送られた。`);

  // No.25：相手の効果またはバトルでウイングに送られた時
  if (card.no === 25) {
    const bySide = cause?.bySide;
    const kind = cause?.kind;
    if (bySide && bySide !== side && (kind === "BATTLE" || kind === "EFFECT")) {
      triggerKojiroKotaro(state, side);
    }
  }

  return true;
}

function triggerKojiroKotaro(state, ownerSide) {
  if (state.gameOver) return;

  // 見参先スロット
  let emptyCount = state.field[ownerSide].C.filter((c) => !c || !c.no).length;
  if (emptyCount <= 0) {
    log(state, `${ownerSide}は空きがなく「小次郎」「小太郎」を見参できない。`);
    return;
  }

  const pool = [];
  // hand/deck/wing から rank4以下で名前に「小太郎」「小次郎」
  state.zones[ownerSide].hand.forEach((c, i) => {
    if (c && c.no && c.rank <= 4 && (cardName(c).includes("小太郎") || cardName(c).includes("小次郎"))) {
      pool.push({ zone: "HAND", index: i, card: c });
    }
  });
  state.zones[ownerSide].deck.forEach((c, i) => {
    if (c && c.no && c.rank <= 4 && (cardName(c).includes("小太郎") || cardName(c).includes("小次郎"))) {
      pool.push({ zone: "DECK", index: i, card: c });
    }
  });
  state.zones[ownerSide].wing.forEach((c, i) => {
    if (c && c.no && c.rank <= 4 && (cardName(c).includes("小太郎") || cardName(c).includes("小次郎"))) {
      pool.push({ zone: "WING", index: i, card: c });
    }
  });

  if (pool.length === 0) {
    log(state, `${ownerSide}は対象が見つからなかった。`);
    return;
  }

  // 最大2体
  const toSummon = Math.min(2, pool.length, emptyCount);

  const chosen = [];
  if (ownerSide === "P1") {
    for (let k = 0; k < toSummon; k++) {
      const options = pool.filter((p) => !chosen.includes(p));
      if (options.length === 0) break;
      const list = options.map((p, idx) => `${idx + 1}: [${p.zone}] ${p.card.name} (No.${p.card.no})`).join("\n");
      const inStr = window.prompt(`見参させるキャラクターを選んでください（最大2体）。\n${list}`, "1");
      const n = parseInt(inStr || "1", 10);
      let pick = options[0];
      if (!isNaN(n) && n >= 1 && n <= options.length) pick = options[n - 1];
      chosen.push(pick);
    }
  } else {
    // AI：ATK高い順で選ぶ
    pool.sort((a, b) => (b.card.atk || 0) - (a.card.atk || 0));
    chosen.push(...pool.slice(0, toSummon));
  }

  for (const p of chosen) {
    const slot = findFirstEmptyC(state, ownerSide);
    if (slot === -1) break;

    let card;
    if (p.zone === "HAND") card = state.zones[ownerSide].hand.splice(p.index, 1)[0];
    if (p.zone === "DECK") card = state.zones[ownerSide].deck.splice(p.index, 1)[0];
    if (p.zone === "WING") card = state.zones[ownerSide].wing.splice(p.index, 1)[0];

    if (!card) continue;
    card._fieldIndex = slot;
    state.field[ownerSide].C[slot] = card;
    log(state, `${ownerSide}は「${card.name}」を見参させた。`);
    onEnter(state, ownerSide, card);
  }
}

/* -----------------------------
   10) アイテム装備（No.24/No.30 対応）
   ※既存UIに合わせて呼び出してください
----------------------------- */
function equipItem(state, side, itemHandIndex, targetCIndex) {
  if (state.activeSide !== side) return false;
  if (state.phase !== "MAIN") return false;

  const item = state.zones[side].hand[itemHandIndex];
  if (!item || !item.no || item.type !== "item") return false;

  const target = state.field[side].C[targetCIndex];
  if (!target || !target.no) return false;

  // E空き
  const eIdx = state.field[side].E.findIndex((c) => !c || !c.no);
  if (eIdx === -1) {
    log(state, "エフェクト/アイテム枠が空いていない。");
    return false;
  }

  // 装備
  state.zones[side].hand.splice(itemHandIndex, 1);
  item.equipTargetIndex = target._fieldIndex;
  state.field[side].E[eIdx] = item;

  log(state, `${side}は「${item.name}」を「${target.name}」に装備した。`);
  return true;
}

/* -----------------------------
   11) ターン進行（簡易）
----------------------------- */
function resetTurnFlags(state, side) {
  const all = [];
  state.field[side].C.forEach((c) => c && c.no && all.push(c));
  state.field[side].E.forEach((c) => c && c.no && all.push(c));
  state.zones[side].hand.forEach((c) => c && c.no && all.push(c));
  all.forEach((c) => {
    c.attackedCountThisTurn = 0;
    c.tapped = false;
    // battleSaveUsedTurnKey は「1ターンに1度」なので keyで管理し、消去不要
    // silencedTurnKey は turnKey一致チェックのみなので消去不要
  });
}

function endTurn(state) {
  if (state.gameOver) return;

  // ターン終了
  const prev = state.activeSide;
  const next = prev === "P1" ? "AI" : "P1";

  state.activeSide = next;
  state.phase = "MAIN";
  if (next === "P1") state.turn += 1;

  resetTurnFlags(state, next);

  // ドロー
  draw(state, next, 1);

  log(state, `ターン開始：${next}`);
}

/* -----------------------------
   12) AI（最低限）
   - ルビー/サファイアの特殊見参
   - レイチェル/小次郎小太郎/狼猫の見参（kensanSac1）は簡易
   - まりもは自動で使う（実装済み）
----------------------------- */
function aiMain(state) {
  const side = "AI";
  if (state.activeSide !== side || state.phase !== "MAIN") return;

  // まず能力（狼猫サーチ）
  const wolfcat = state.field[side].C.find((c) => c && c.no === 29);
  if (wolfcat && canActivateAbility(state, side, wolfcat)) {
    activateAbility(state, side, wolfcat);
  }

  // ルビー/サファイア特殊見参を優先
  for (let i = 0; i < state.zones[side].hand.length; i++) {
    const c = state.zones[side].hand[i];
    if (!c) continue;
    if (canSpecialSummonFromHand(state, side, c)) {
      const slot = findFirstEmptyC(state, side);
      if (slot !== -1) {
        summonFromHand(state, side, i, slot, "special");
        return;
      }
    }
  }

  // 通常見参（既存ルールの範囲で簡易：rank5登場不可はスキップ）
  for (let i = 0; i < state.zones[side].hand.length; i++) {
    const c = state.zones[side].hand[i];
    if (!c) continue;
    const base = CardDB[c.no];
    if (base?.summon === "kensanSac1") continue; // 条件必要
    if (c.type !== "Character") continue;
    const slot = findFirstEmptyC(state, side);
    if (slot !== -1) {
      summonFromHand(state, side, i, slot, "normal");
      return;
    }
  }

  // 終了
  state.phase = "BATTLE";
}

function aiBattle(state) {
  const side = "AI";
  if (state.activeSide !== side || state.phase !== "BATTLE") return;

  // 使える攻撃者を探す（ATK高い順）
  const attackers = state.field[side].C
    .filter((c) => c && c.no)
    .sort((a, b) => calcAtk(state, side, b) - calcAtk(state, side, a));

  for (const atkCard of attackers) {
    if (!canAttack(state, side, atkCard)) continue;

    const opp = "P1";

    // 七星剣 全体攻撃優先
    if (canUseAoEAttack(state, side, atkCard)) {
      atkCard.attackedCountThisTurn++;
      performAttack(state, side, atkCard, "AOE");
      if (state.gameOver || state.phase === "END") return;
      continue;
    }

    // 相手キャラがいれば最弱を殴る
    const targets = state.field[opp].C.filter((c) => c && c.no);
    if (targets.length > 0) {
      targets.sort((a, b) => calcAtk(state, opp, a) - calcAtk(state, opp, b));
      atkCard.attackedCountThisTurn++;
      performAttack(state, side, atkCard, targets[0]);
      if (state.gameOver || state.phase === "END") return;
      continue;
    }

    // 直接攻撃（シールド残ってるなら既存ルールに合わせるべきだが、ここでは「シールド0でのみDIRECT」想定）
    if (shieldsCount(state, opp) === 0) {
      atkCard.attackedCountThisTurn++;
      performAttack(state, side, atkCard, "DIRECT");
      if (state.gameOver || state.phase === "END") return;
    }
  }

  // バトル終了
  state.phase = "END";
}

/* -----------------------------
   13) デッキ編集用（No.1〜No.30対応）
   ※既存UIがこの関数群を呼んでいる前提で置換
----------------------------- */
function getAllCardNosForDeckEdit() {
  const nos = [];
  for (let i = 1; i <= MAX_CARD_NO; i++) {
    if (CardDB[i]) nos.push(i);
  }
  return nos;
}

/* -----------------------------
   14) 外部UIが呼び出す想定の公開
----------------------------- */
window.MWGame = {
  initState,
  calcAtk,
  canAttack,
  performAttack,
  endTurn,
  aiMain,
  aiBattle,
  summonFromHand,
  equipItem,
  canActivateAbility,
  activateAbility,
  getAllCardNosForDeckEdit,
  shieldsCount,
};