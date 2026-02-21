/**
 * Manpuku World - Cards 21-30 Minimal Test Engine (Single JS File)
 * Browser/Node compatible (NO crash on load)
 *
 * How to use (Browser):
 *   1) <script src="this_file.js"></script>
 *   2) console: ManpukuWorldTest.demo()  または  ManpukuWorldTest.createGame()
 *
 * How to use (Node):
 *   node this_file.js        // runs nothing by default
 *   const api = require("./this_file.js"); api.demo();
 */

"use strict";

/** -----------------------------
 * Utilities
 * ----------------------------- */
const nowId = (() => {
  let n = 1;
  return () => `c_${(n++).toString().padStart(4, "0")}`;
})();

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function pickFirst(arr) {
  return arr && arr.length ? arr[0] : null;
}

/** -----------------------------
 * Game Engine
 * ----------------------------- */
class Game {
  constructor(options = {}) {
    this.turn = 1;
    this.activePlayerIndex = 0;
    this.players = [new Player("P1"), new Player("P2")];
    this.logEnabled = options.logEnabled ?? true;

    this.turnFlags = {
      negatedCardIds: new Set(),
      oncePerTurn: new Set(),
      battleEndedThisTurn: false,
    };
  }

  log(...args) {
    if (this.logEnabled) console.log(...args);
  }

  get activePlayer() {
    return this.players[this.activePlayerIndex];
  }
  get nonActivePlayer() {
    return this.players[1 - this.activePlayerIndex];
  }

  startTurn() {
    const p = this.activePlayer;
    this.turnFlags.battleEndedThisTurn = false;
    this.log(`\n=== TURN ${this.turn} START: ${p.name} ===`);
    p.resetTurnState();
    p.draw(1);
  }

  endTurn() {
    this.log(`=== TURN ${this.turn} END ===\n`);
    this.turnFlags.negatedCardIds.clear();
    this.turnFlags.oncePerTurn.clear();
    this.turnFlags.battleEndedThisTurn = false;
    this.turn += 1;
    this.activePlayerIndex = 1 - this.activePlayerIndex;
  }

  moveCard(card, fromZone, toZone, reason = "") {
    const owner = card.owner;
    const fromArr = owner.zones[fromZone];
    const toArr = owner.zones[toZone];

    const idx = fromArr.findIndex((c) => c.id === card.id);
    if (idx >= 0) fromArr.splice(idx, 1);

    toArr.push(card);
    this.log(
      `[MOVE] ${owner.name}: ${card.def.no}_${card.def.name} ${fromZone} -> ${toZone}${
        reason ? " (" + reason + ")" : ""
      }`
    );

    if (toZone === "wing") this.onSentToWing(card, reason);
  }

  onEnterStage(card) {
    const ctx = this.makeCtx(card.owner, 1 - this.players.indexOf(card.owner));
    if (card.def.abilities?.onEnterStage) card.def.abilities.onEnterStage(ctx, card);
  }

  onSentToWing(card, reason) {
    const ctx = this.makeCtx(card.owner, 1 - this.players.indexOf(card.owner));
    if (card.def.abilities?.onSentToWing) card.def.abilities.onSentToWing(ctx, card, reason);
  }

  activateEffect({ player, sourceCard, effectType, payload }) {
    const opponent = this.players[1 - this.players.indexOf(player)];
    this.log(
      `[EFFECT] ${player.name} activates ${effectType} from ${sourceCard.def.no}_${sourceCard.def.name}`
    );

    this.tryReactInfluencerMarimo(opponent, sourceCard, effectType);

    if (this.turnFlags.negatedCardIds.has(sourceCard.id)) {
      this.log(`[NEGATED] ${sourceCard.def.no}_${sourceCard.def.name} effects are negated this turn.`);
      return;
    }

    if (effectType === "SEARCH_ADD_TO_HAND") {
      const found = player.searchZonesForCard(["deck"], payload.queryFn);
      if (found) {
        player.addToHand(found);
        this.log(`[RESOLVE] Added to hand: ${found.def.no}_${found.def.name}`);
      } else {
        this.log(`[RESOLVE] No card found for SEARCH_ADD_TO_HAND.`);
      }
      return;
    }

    if (effectType === "SEARCH_LOOK_AT_CHARACTER") {
      const list = player.peekFromDeck(payload.count ?? 1, payload.queryFn);
      this.log(
        `[RESOLVE] Looked at ${list.length} card(s): ${list
          .map((c) => `${c.def.no}_${c.def.name}`)
          .join(", ") || "(none)"}`
      );
      return;
    }

    if (effectType === "CUSTOM") {
      if (typeof payload?.run === "function") payload.run(this, player, opponent);
      return;
    }

    this.log(`[WARN] Unknown effectType: ${effectType}.`);
  }

  tryReactInfluencerMarimo(defender, attackerSourceCard, attackerEffectType) {
    const isTrigger =
      attackerEffectType === "SEARCH_ADD_TO_HAND" ||
      attackerEffectType === "SEARCH_LOOK_AT_CHARACTER";
    if (!isTrigger) return;

    const marimo = defender.findInZone("hand", (c) => c.def.no === 22);
    if (!marimo) return;

    this.log(`[REACT] ${defender.name} uses 22_インフルエンサーまりも (hand->wing), negate source card.`);
    this.moveCard(marimo, "hand", "wing", "No.22 reaction");
    this.turnFlags.negatedCardIds.add(attackerSourceCard.id);
  }

  makeCtx(activePlayer, opponentIndex) {
    const opponent = this.players[opponentIndex];
    return {
      game: this,
      you: activePlayer,
      opp: opponent,
      oncePerTurn: (key) => {
        if (this.turnFlags.oncePerTurn.has(key)) return false;
        this.turnFlags.oncePerTurn.add(key);
        return true;
      },
      log: (...args) => this.log(...args),
    };
  }

  kensanFromHand(player, card, { ignoreConditions = false } = {}) {
    assert(card.owner === player, "You can only kensan your own card.");
    const def = card.def;

    if (!player.hasStageSlot()) {
      this.log(`[FAIL] ${player.name} stage is full.`);
      return false;
    }

    if (def.cannotEnterStage && !ignoreConditions) {
      if (typeof def.kensanCost !== "function") {
        this.log(`[FAIL] ${def.no}_${def.name} cannot enter stage and has no kensanCost.`);
        return false;
      }
      const ctx = this.makeCtx(player, 1 - this.players.indexOf(player));
      const ok = def.kensanCost(ctx, card);
      if (!ok) {
        this.log(`[FAIL] Kensan cost not paid for ${def.no}_${def.name}.`);
        return false;
      }
    } else if (def.cannotEnterStage && ignoreConditions) {
      this.log(`[INFO] ignoreConditions applied for ${def.no}_${def.name}.`);
    }

    this.moveCard(card, "hand", "stage", "kensan");
    this.onEnterStage(card);
    return true;
  }

  equipItem(player, itemCard, targetChar) {
    assert(itemCard.owner === player, "You can only equip your own item.");
    assert(targetChar.owner === player, "You can only equip to your own character.");
    assert(itemCard.def.kind === "item", "Item required.");
    assert(targetChar.def.kind === "character", "Target must be character.");

    this.moveCard(itemCard, "hand", "stage", `equip to ${targetChar.def.no}_${targetChar.def.name}`);
    itemCard.equippedTo = targetChar.id;
    targetChar.equipment.push(itemCard.id);

    const ctx = this.makeCtx(player, 1 - this.players.indexOf(player));
    if (itemCard.def.abilities?.onEquip) itemCard.def.abilities.onEquip(ctx, itemCard, targetChar);
    return true;
  }

  battle(attackerChar, defenderChar) {
    if (this.turnFlags.battleEndedThisTurn) {
      this.log(`[INFO] Battle is ended for this turn.`);
      return false;
    }

    const atkOwner = attackerChar.owner;
    const defOwner = defenderChar.owner;
    assert(atkOwner !== defOwner, "Battle must be between opposing players.");

    if (!attackerChar.canAttackTarget(defenderChar)) {
      this.log(`[FAIL] ${atkOwner.name} attacker cannot attack this target.`);
      return false;
    }

    attackerChar.consumeAttackTo(defenderChar);
    const atk = attackerChar.getAtk();
    const defAtk = defenderChar.getAtk();
    this.log(
      `[BATTLE] ${atkOwner.name} ${attackerChar.def.no}_${attackerChar.def.name} (${atk}) vs ${defOwner.name} ${defenderChar.def.no}_${defenderChar.def.name} (${defAtk})`
    );

    if (atk >= defAtk) {
      if (this.tryPreventBattleDestruction(defenderChar)) {
        this.log(`[PREVENT] No.21 prevented battle destruction.`);
        return true;
      }

      this.moveCard(defenderChar, "stage", "wing", "battle defeated");

      if (attackerChar.def.no === 23) {
        const shield = defOwner.zones.shield.pop();
        if (shield) {
          this.moveCard(shield, "shield", "wing", "No.23 battle shield break");
          this.log(`[TRIGGER] No.23 destroyed 1 opponent shield.`);
        } else {
          this.log(`[INFO] Opponent has no shield.`);
        }
      }
      return true;
    }

    if (this.tryPreventBattleDestruction(attackerChar)) {
      this.log(`[PREVENT] No.21 prevented battle destruction.`);
      return true;
    }

    this.moveCard(attackerChar, "stage", "wing", "battle defeated");
    return true;
  }

  directAttack(attackerChar, defenderPlayer) {
    if (this.turnFlags.battleEndedThisTurn) {
      this.log(`[INFO] Battle is ended for this turn.`);
      return false;
    }

    assert(attackerChar.owner !== defenderPlayer, "Direct attack must target opponent.");

    if (defenderPlayer.zones.shield.length > 0) {
      const shield = defenderPlayer.zones.shield.pop();
      if (shield) {
        this.moveCard(shield, "shield", "wing", "direct attack -> shield broken");
        this.log(`[DIRECT] Broke 1 shield.`);
      }
      return true;
    }

    // shield 0 -> No.21 hand kensan window
    const miiko = defenderPlayer.findInZone("hand", (c) => c.def.no === 21);
    if (miiko) {
      const ctx = this.makeCtx(defenderPlayer, 1 - this.players.indexOf(defenderPlayer));
      const ok = miiko.def.abilities?.onDirectAttackWhenShield0?.(ctx, miiko, attackerChar);
      if (ok) {
        this.turnFlags.battleEndedThisTurn = true;
        return true;
      }
    }

    this.log(`[DIRECT] Shield=0. No prevention. (minimal engine hit)`);
    return true;
  }

  tryPreventBattleDestruction(card) {
    if (card.def.no !== 21) return false;
    const key = `${card.owner.name}:No21:preventBattleDestruction:TURN${this.turn}`;
    if (this.turnFlags.oncePerTurn.has(key)) return false;
    this.turnFlags.oncePerTurn.add(key);
    return true;
  }
}

/** -----------------------------
 * Player
 * ----------------------------- */
class Player {
  constructor(name) {
    this.name = name;
    this.zones = { deck: [], hand: [], stage: [], wing: [], shield: [] };
  }

  resetTurnState() {
    for (const c of this.zones.stage) {
      if (c.def.kind === "character") c.resetAttacks();
    }
  }

  draw(n = 1) {
    for (let i = 0; i < n; i++) {
      const card = this.zones.deck.shift();
      if (!card) return;
      this.zones.hand.push(card);
    }
  }

  hasStageSlot() {
    const chars = this.zones.stage.filter((c) => c.def.kind === "character").length;
    return chars < 3;
  }

  findInZone(zone, pred) {
    return this.zones[zone].find(pred) || null;
  }

  searchZonesForCard(zones, queryFn) {
    for (const z of zones) {
      const idx = this.zones[z].findIndex((c) => queryFn(c.def));
      if (idx >= 0) return this.zones[z].splice(idx, 1)[0];
    }
    return null;
  }

  addToHand(card) {
    this.zones.hand.push(card);
  }

  peekFromDeck(count, queryFn = null) {
    const out = [];
    for (const c of this.zones.deck) {
      if (queryFn && !queryFn(c.def)) continue;
      out.push(c);
      if (out.length >= count) break;
    }
    return out;
  }
}

/** -----------------------------
 * Card Instance
 * ----------------------------- */
class Card {
  constructor(owner, def) {
    this.id = nowId();
    this.owner = owner;
    this.def = def;

    this.equippedTo = null;
    this.equipment = [];
    this.bonusAtk = 0;

    this.baseAttacksPerTurn = 1;
    this.extraAttacksThisTurn = 0;
    this.attacksUsedThisTurn = 0;

    this.flags = {
      sweepAttackEnabled: false,
      sweepAttackedIdsThisTurn: new Set(),
    };
  }

  getAtk() {
    return (this.def.atk ?? 0) + (this.bonusAtk ?? 0);
  }

  hasTag(tag) {
    return (this.def.tags || []).includes(tag);
  }

  resetAttacks() {
    this.attacksUsedThisTurn = 0;
    this.extraAttacksThisTurn = 0;
    this.flags.sweepAttackedIdsThisTurn = new Set();
  }

  canAttackTarget(defenderChar) {
    if (this.flags.sweepAttackEnabled) {
      return !this.flags.sweepAttackedIdsThisTurn.has(defenderChar.id);
    }
    const total = this.baseAttacksPerTurn + this.extraAttacksThisTurn;
    return this.attacksUsedThisTurn < total;
  }

  consumeAttackTo(defenderChar) {
    if (this.flags.sweepAttackEnabled) {
      this.flags.sweepAttackedIdsThisTurn.add(defenderChar.id);
      return;
    }
    this.attacksUsedThisTurn += 1;
  }
}

/** -----------------------------
 * Card Definitions (21-30)
 * ----------------------------- */
function cost_sendOneHandOrOwnStageCharToWing(ctx) {
  const you = ctx.you;
  const g = ctx.game;

  const fromHand = you.zones.hand.find(
    (c) => c.def.kind === "character" && c.id !== ctx._selfCardId
  );
  const fromStage = you.zones.stage.find(
    (c) => c.def.kind === "character" && c.id !== ctx._selfCardId
  );

  const sacrifice = fromHand || fromStage;
  if (!sacrifice) {
    ctx.log(`[COST FAIL] コストでウイングへ送れるキャラクターがいません。`);
    return false;
  }
  const fromZone = fromHand ? "hand" : "stage";
  g.moveCard(sacrifice, fromZone, "wing", "kensan cost");
  return true;
}

const CARD_DEFS = [
  {
    no: 21,
    name: "ミーコ",
    kind: "character",
    rank: 0,
    atk: 0,
    tags: ["アバター", "霊魂", "ミジンコ"],
    titleTag: null,
    cannotEnterStage: false,
    abilities: {
      onDirectAttackWhenShield0: (ctx, selfCard) => {
        const key = `${ctx.you.name}:No21:directAttackNegate`;
        if (!ctx.oncePerTurn(key)) {
          ctx.log(`[INFO] No.21 ダイレクトアタック無効はこのターン既に使用しています。`);
          return false;
        }
        ctx.log(`[REACT] No.21 ミーコ：手札から見参し、ダイレクトアタックを無効。バトル終了。`);
        ctx.game.kensanFromHand(ctx.you, selfCard, { ignoreConditions: true });
        return true;
      },
    },
  },

  { no: 22, name: "インフルエンサーまりも", kind: "character", rank: 3, atk: 400, tags: ["人間", "配信", "人気"], titleTag: "BUGBUG西遊記", cannotEnterStage: false },

  { no: 23, name: "退魔師レイチェル", kind: "character", rank: 5, atk: 2200, tags: ["除霊", "伶嬢", "射手"], titleTag: "怨霊撲滅屋GB", cannotEnterStage: true,
    kensanCost: (ctx, selfCard) => { ctx._selfCardId = selfCard.id; return cost_sendOneHandOrOwnStageCharToWing(ctx); } },

  { no: 24, name: "銀弾の双銃", kind: "item", rank: 4, atk: 0, tags: ["除霊", "拳銃"], titleTag: "怨霊撲滅屋GB",
    abilities: { onEquip: (ctx, selfItem, targetChar) => {
      targetChar.bonusAtk += 500;
      ctx.log(`[EQUIP] No.24 -> ${targetChar.def.no}_${targetChar.def.name}: ATK +500`);
      if (targetChar.hasTag("除霊")) {
        targetChar.bonusAtk += 500;
        targetChar.extraAttacksThisTurn += 2;
        ctx.log(`[EQUIP BONUS] タグ「除霊」: さらにATK +500、このターン攻撃回数+2`);
      }
    } } },

  { no: 25, name: "小次郎&小太郎", kind: "character", rank: 5, atk: 2500, tags: ["アバター", "GAME", "兄弟"], titleTag: "BUGBUG西遊記", cannotEnterStage: true,
    kensanCost: (ctx, selfCard) => { ctx._selfCardId = selfCard.id; return cost_sendOneHandOrOwnStageCharToWing(ctx); } },

  { no: 26, name: "ジュエリー・ルビー", kind: "character", rank: 4, atk: 1700, tags: ["美少女戦士", "アニメ", "格闘"], titleTag: "Ve ヴォイスエレメント",
    cannotEnterStage: true,
    kensanCost: (ctx) => ctx.you.zones.stage.some((c) => c.def.no === 27) || (ctx.log(`[COST FAIL] No.26は自分ステージにNo.27が存在する時のみ見参できる。`), false),
    abilities: { onEnterStage: (ctx) => {
      const g = ctx.game, you = ctx.you;
      if (you.zones.hand.length > 0) g.moveCard(you.zones.hand.shift(), "hand", "wing", "No.26 enter cost");
      const found = you.searchZonesForCard(["deck", "wing"], (def) => (def.tags || []).includes("アニメ"));
      if (found) { you.addToHand(found); ctx.log(`[RESOLVE] No.26：タグ「アニメ」を手札に加えた: ${found.def.no}_${found.def.name}`); }
    } } },

  { no: 27, name: "ジュエリー・サファイア", kind: "character", rank: 4, atk: 1700, tags: ["美少女戦士", "アニメ", "格闘"], titleTag: "Ve ヴォイスエレメント",
    cannotEnterStage: true,
    kensanCost: (ctx) => ctx.you.zones.stage.some((c) => c.def.no === 26) || (ctx.log(`[COST FAIL] No.27は自分ステージにNo.26が存在する時のみ見参できる。`), false),
    abilities: { onEnterStage: (ctx) => {
      const g = ctx.game, you = ctx.you;
      if (you.zones.hand.length > 0) g.moveCard(you.zones.hand.shift(), "hand", "wing", "No.27 enter cost");
      const found = you.searchZonesForCard(["deck", "wing"], (def) => (def.tags || []).includes("アニメ"));
      if (found) { you.addToHand(found); ctx.log(`[RESOLVE] No.27：タグ「アニメ」を手札に加えた: ${found.def.no}_${found.def.name}`); }
    } } },

  { no: 28, name: "セシア&アリサ", kind: "character", rank: 4, atk: 1500, tags: ["除霊", "支援", "侍女"], titleTag: "怨霊撲滅屋GB", cannotEnterStage: false },

  { no: 29, name: "狼猫-孫悟空Lv75-", kind: "character", rank: 5, atk: 2400, tags: ["アバター", "GAME", "剣士"], titleTag: "BUGBUG西遊記", cannotEnterStage: true,
    kensanCost: (ctx, selfCard) => { ctx._selfCardId = selfCard.id; return cost_sendOneHandOrOwnStageCharToWing(ctx); } },

  { no: 30, name: "七星剣", kind: "item", rank: 0, atk: 0, tags: ["課金アイテム", "刀剣"], titleTag: "BUGBUG西遊記",
    abilities: { onEquip: (ctx, selfItem, targetChar) => {
      targetChar.bonusAtk += 500;
      ctx.log(`[EQUIP] No.30 -> ${targetChar.def.no}_${targetChar.def.name}: ATK +500`);
      if (targetChar.hasTag("剣士")) {
        targetChar.bonusAtk += 500;
        targetChar.flags.sweepAttackEnabled = true;
        ctx.log(`[EQUIP BONUS] タグ「剣士」: さらにATK +500、自分ターンに相手全キャラへ1度ずつ攻撃できる`);
      }
    } } },
];

const CARD_DEF_MAP = new Map(CARD_DEFS.map((d) => [d.no, d]));

/** -----------------------------
 * Factory
 * ----------------------------- */
function makeCard(owner, no) {
  const def = CARD_DEF_MAP.get(no);
  assert(def, `Card def not found for no=${no}`);
  return new Card(owner, def);
}

function setupTestGame() {
  const game = new Game({ logEnabled: true });
  const p1 = game.players[0];
  const p2 = game.players[1];

  // shields
  for (let i = 0; i < 3; i++) {
    const dummyDef = { no: 900 + i, name: `シールド${i + 1}`, kind: "item", atk: 0, tags: [], titleTag: null };
    p1.zones.shield.push(new Card(p1, dummyDef));
    p2.zones.shield.push(new Card(p2, dummyDef));
  }

  // decks (simple)
  p1.zones.deck.push(
    makeCard(p1, 21),
    makeCard(p1, 22),
    makeCard(p1, 23),
    makeCard(p1, 24),
    makeCard(p1, 26),
    makeCard(p1, 27),
    makeCard(p1, 28),
    makeCard(p1, 29),
    makeCard(p1, 30)
  );

  p2.zones.deck.push(makeCard(p2, 21), makeCard(p2, 22), makeCard(p2, 29), makeCard(p2, 30));

  // shuffle
  p1.zones.deck.sort(() => Math.random() - 0.5);
  p2.zones.deck.sort(() => Math.random() - 0.5);

  // opening draw
  p1.draw(5);
  p2.draw(5);

  return game;
}

/** -----------------------------
 * Demo (manual call only)
 * ----------------------------- */
function demo() {
  const game = setupTestGame();

  // Turn 1 P1
  game.startTurn();
  game.endTurn();

  // Turn 2 P2 (direct attack test with No.21 in hand)
  game.startTurn();
  const p2 = game.activePlayer;
  const p1 = game.nonActivePlayer;

  // force shields to 0 for target
  p1.zones.shield.length = 0;

  // ensure attacker on stage: kensan No.29 ignoring for demo
  const wolf = p2.findInZone("hand", (c) => c.def.no === 29) || makeCard(p2, 29);
  if (!p2.zones.hand.includes(wolf)) p2.zones.hand.push(wolf);
  game.kensanFromHand(p2, wolf, { ignoreConditions: true });

  // direct attack -> P1 may react with No.21 from hand
  const wolfOnStage = p2.findInZone("stage", (c) => c.def.no === 29);
  if (wolfOnStage) game.directAttack(wolfOnStage, p1);

  game.endTurn();
  game.log("=== DEMO END ===");
}

/** -----------------------------
 * Public API (Browser + Node safe)
 * ----------------------------- */
const API = {
  Game,
  Player,
  Card,
  CARD_DEFS,
  makeCard,
  setupTestGame,
  demo,
  createGame: setupTestGame, // alias
};

// Browser global
try {
  if (typeof window !== "undefined") {
    window.ManpukuWorldTest = API;
  }
} catch (_) { /* ignore */ }

// Node export (only if module exists)
try {
  if (typeof module !== "undefined" && module && module.exports) {
    module.exports = API;
  }
} catch (_) { /* ignore */ }

// IMPORTANT: Do NOT auto-run demo. (Start button / host app should control)