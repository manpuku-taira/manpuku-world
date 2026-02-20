/**
 * Manpuku World - Cards 21-30 Minimal Test Engine (Single JS File)
 * - Purpose: Quick test-play for card effects 21-30 (as provided in conversation)
 * - Zones: deck, hand, stage, wing, shield
 * - Notes:
 *   - Card text style rules: 「または」「できる」準拠
 *   - Series term: 「タイトルタグ」
 *   - No.21 / No.30 effects are NOT confirmed from images in this chat -> safe placeholder
 *
 * Run (Node.js):
 *   node manpuku_cards_21_30_test.js
 */

"use strict";

/** -----------------------------
 * Utilities
 * ----------------------------- */
const nowId = (() => {
  let n = 1;
  return () => `c_${(n++).toString().padStart(4, "0")}`;
})();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function pickFirst(arr) {
  return (arr && arr.length) ? arr[0] : null;
}

/** -----------------------------
 * Core Types
 * ----------------------------- */
/**
 * CardDefinition shape:
 * {
 *   no: 22,
 *   name: "インフルエンサーまりも",
 *   kind: "character" | "item",
 *   rank: 3,
 *   atk: 400,
 *   tags: ["人間","配信","人気"],
 *   titleTag: "BUGBUG西遊記",
 *   cannotEnterStage: boolean,
 *   kensanCost: function(ctx) -> boolean (performs cost) OR null
 *   abilities: { ...hooks }
 * }
 */

/** -----------------------------
 * Game Engine
 * ----------------------------- */
class Game {
  constructor(options = {}) {
    this.turn = 1;
    this.activePlayerIndex = 0;
    this.players = [
      new Player("P1"),
      new Player("P2"),
    ];
    this.logEnabled = options.logEnabled ?? true;

    // Temporary turn-based flags
    this.turnFlags = {
      // effectNegations: Map(cardInstanceId -> { untilTurnEnd: true })
      negatedCardIds: new Set(),
      // per-turn once flags: Map(key -> true)
      oncePerTurn: new Set(),
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
    this.log(`\n=== TURN ${this.turn} START: ${p.name} ===`);
    p.resetTurnState();
    // Draw 1 for test convenience
    p.draw(1);
  }

  endTurn() {
    this.log(`=== TURN ${this.turn} END ===\n`);
    // clear turn negations & once-per-turn
    this.turnFlags.negatedCardIds.clear();
    this.turnFlags.oncePerTurn.clear();

    this.turn += 1;
    this.activePlayerIndex = 1 - this.activePlayerIndex;
  }

  /**
   * Moves card instance between zones.
   */
  moveCard(card, fromZone, toZone, reason = "") {
    const owner = card.owner;
    const fromArr = owner.zones[fromZone];
    const toArr = owner.zones[toZone];
    const idx = fromArr.findIndex(c => c.id === card.id);
    if (idx >= 0) fromArr.splice(idx, 1);
    toArr.push(card);
    this.log(`[MOVE] ${owner.name}: ${card.def.no}_${card.def.name} ${fromZone} -> ${toZone}${reason ? " (" + reason + ")" : ""}`);

    // Hook: when sent to wing
    if (toZone === "wing") {
      this.onSentToWing(card, reason);
    }
  }

  /**
   * Called when a card enters stage.
   */
  onEnterStage(card) {
    const ctx = this.makeCtx(card.owner, 1 - this.players.indexOf(card.owner));
    const def = card.def;
    if (def.abilities?.onEnterStage) {
      def.abilities.onEnterStage(ctx, card);
    }
  }

  /**
   * Called when a card is sent to wing.
   */
  onSentToWing(card, reason) {
    const ctx = this.makeCtx(card.owner, 1 - this.players.indexOf(card.owner));
    const def = card.def;
    if (def.abilities?.onSentToWing) {
      def.abilities.onSentToWing(ctx, card, reason);
    }
  }

  /**
   * Effect activation pipeline:
   * - attacker uses effect from some card
   * - defender may react (No.22)
   * - if negated -> do nothing
   */
  activateEffect({ player, sourceCard, effectType, payload }) {
    const opponent = this.players[1 - this.players.indexOf(player)];
    this.log(`[EFFECT] ${player.name} activates ${effectType} from ${sourceCard.def.no}_${sourceCard.def.name}`);

    // Defender reaction: No.22 (インフルエンサーまりも)
    this.tryReactInfluencerMarimo(opponent, sourceCard, effectType);

    // If source card is negated for this turn, skip resolving
    if (this.turnFlags.negatedCardIds.has(sourceCard.id)) {
      this.log(`[NEGATED] ${sourceCard.def.no}_${sourceCard.def.name} effects are negated until end of turn.`);
      return;
    }

    // Resolve common effect types for this test engine
    if (effectType === "SEARCH_ADD_TO_HAND") {
      // payload: { queryFn(cardDef) }
      const found = player.searchZonesForCard(["deck"], payload.queryFn);
      if (found) {
        player.addToHand(found, "effect:SEARCH_ADD_TO_HAND");
        this.log(`[RESOLVE] Added to hand: ${found.def.no}_${found.def.name}`);
      } else {
        this.log(`[RESOLVE] No card found for SEARCH_ADD_TO_HAND.`);
      }
      return;
    }

    if (effectType === "SEARCH_LOOK_AT_CHARACTER") {
      // payload: { queryFn(cardDef), count }
      const list = player.peekFromDeck(payload.count ?? 1, payload.queryFn);
      this.log(`[RESOLVE] Looked at ${list.length} card(s): ${list.map(c => `${c.def.no}_${c.def.name}`).join(", ") || "(none)"}`);
      return;
    }

    if (effectType === "CUSTOM") {
      // payload: { run(game, player, opponent) }
      if (typeof payload?.run === "function") payload.run(this, player, opponent);
      return;
    }

    this.log(`[WARN] Unknown effectType: ${effectType}. No resolution performed.`);
  }

  /**
   * No.22 reaction:
   * Trigger when opponent activates:
   *  - "add card from deck to hand"
   *  - "look at character from deck"
   * Cost: send No.22 from hand to wing
   * Result: negate all effects of that card until end of turn
   */
  tryReactInfluencerMarimo(defender, attackerSourceCard, attackerEffectType) {
    const isTrigger =
      attackerEffectType === "SEARCH_ADD_TO_HAND" ||
      attackerEffectType === "SEARCH_LOOK_AT_CHARACTER";

    if (!isTrigger) return;

    const marimo = defender.findInZone("hand", (c) => c.def.no === 22);
    if (!marimo) return;

    // For test engine: auto-react ON
    this.log(`[REACT] ${defender.name} can react with 22_インフルエンサーまりも from hand -> wing, negating source card this turn.`);
    this.moveCard(marimo, "hand", "wing", "No.22 reaction");
    this.turnFlags.negatedCardIds.add(attackerSourceCard.id);
  }

  makeCtx(activePlayer, opponentIndex) {
    const opponent = this.players[opponentIndex];
    return {
      game: this,
      you: activePlayer,
      opp: opponent,
      // Convenience helpers
      oncePerTurn: (key) => {
        if (this.turnFlags.oncePerTurn.has(key)) return false;
        this.turnFlags.oncePerTurn.add(key);
        return true;
      },
      log: (...args) => this.log(...args),
    };
  }

  /** -----------------------------
   * Gameplay actions
   * ----------------------------- */

  /**
   * Kensan from hand:
   * - If card cannot enter stage: try special kensanCost OR reject
   * - Else place on stage if slot
   */
  kensanFromHand(player, card, { ignoreConditions = false } = {}) {
    assert(card.owner === player, "You can only kensan your own card.");
    const def = card.def;

    // condition: stage capacity
    if (!player.hasStageSlot()) {
      this.log(`[FAIL] ${player.name} stage is full.`);
      return false;
    }

    // If cannot enter stage normally, require kensanCost unless ignored
    if (def.cannotEnterStage && !ignoreConditions) {
      if (typeof def.kensanCost !== "function") {
        this.log(`[FAIL] ${def.no}_${def.name} cannot enter stage and has no kensanCost defined.`);
        return false;
      }
      const ctx = this.makeCtx(player, 1 - this.players.indexOf(player));
      const ok = def.kensanCost(ctx, card);
      if (!ok) {
        this.log(`[FAIL] Kensan cost not paid for ${def.no}_${def.name}.`);
        return false;
      }
    } else if (def.cannotEnterStage && ignoreConditions) {
      this.log(`[INFO] Kensan ignoreConditions applied for ${def.no}_${def.name}.`);
    }

    // Move hand -> stage
    this.moveCard(card, "hand", "stage", "kensan");
    this.onEnterStage(card);
    return true;
  }

  /**
   * Equip an item from hand to a target character on stage.
   */
  equipItem(player, itemCard, targetChar) {
    assert(itemCard.owner === player, "You can only equip your own item.");
    assert(targetChar.owner === player, "You can only equip to your own character.");
    assert(itemCard.def.kind === "item", "Item required.");
    assert(targetChar.def.kind === "character", "Target must be character.");

    // Move item to stage-attached (we keep it in stage but mark equippedTo)
    this.moveCard(itemCard, "hand", "stage", `equip to ${targetChar.def.no}_${targetChar.def.name}`);
    itemCard.equippedTo = targetChar.id;
    targetChar.equipment.push(itemCard.id);

    // Apply equip effect hook
    const ctx = this.makeCtx(player, 1 - this.players.indexOf(player));
    if (itemCard.def.abilities?.onEquip) {
      itemCard.def.abilities.onEquip(ctx, itemCard, targetChar);
    }
    return true;
  }

  /**
   * Battle: attacker attacks defenderChar.
   * - Uses attack counters per turn
   * - If defender removed -> send to wing
   * - If specific triggers -> resolve
   */
  battle(attackerChar, defenderChar) {
    const atkOwner = attackerChar.owner;
    const defOwner = defenderChar.owner;

    assert(atkOwner !== defOwner, "Battle must be between opposing players.");

    if (!attackerChar.canAttack()) {
      this.log(`[FAIL] ${atkOwner.name} attacker cannot attack (no attacks left).`);
      return false;
    }

    attackerChar.consumeAttack();
    const atk = attackerChar.getAtk();
    const defAtk = defenderChar.getAtk();
    this.log(`[BATTLE] ${atkOwner.name} ${attackerChar.def.no}_${attackerChar.def.name} (${atk}) vs ${defOwner.name} ${defenderChar.def.no}_${defenderChar.def.name} (${defAtk})`);

    if (atk >= defAtk) {
      // defender loses -> to wing
      this.moveCard(defenderChar, "stage", "wing", "battle defeated");

      // Trigger: if attacker is No.23 and sent opponent to wing by battle -> destroy 1 shield
      if (attackerChar.def.no === 23) {
        const shield = defOwner.zones.shield.pop();
        if (shield) {
          this.moveCard(shield, "shield", "wing", "No.23 battle shield break");
          this.log(`[TRIGGER] No.23 destroyed 1 opponent shield.`);
        } else {
          this.log(`[INFO] Opponent has no shield to destroy.`);
        }
      }

      return true;
    }

    // attacker loses -> to wing
    this.moveCard(attackerChar, "stage", "wing", "battle defeated");
    return true;
  }
}

/** -----------------------------
 * Player
 * ----------------------------- */
class Player {
  constructor(name) {
    this.name = name;
    this.zones = {
      deck: [],
      hand: [],
      stage: [],
      wing: [],
      shield: [],
    };
  }

  resetTurnState() {
    // Reset attack counts each turn
    for (const c of this.zones.stage) {
      if (c.def.kind === "character") c.resetAttacks();
      if (c.def.kind === "item") c.temp = {}; // clear item temp if needed
    }
  }

  draw(n = 1) {
    for (let i = 0; i < n; i++) {
      const card = this.zones.deck.shift();
      if (!card) return;
      this.zones.hand.push(card);
      // console log handled by Game usually; keep silent here
    }
  }

  hasStageSlot() {
    // For test: allow up to 3 stage cards (characters only counted)
    const chars = this.zones.stage.filter(c => c.def.kind === "character").length;
    return chars < 3;
  }

  findInZone(zone, pred) {
    return this.zones[zone].find(pred) || null;
  }

  searchZonesForCard(zones, queryFn) {
    for (const z of zones) {
      const idx = this.zones[z].findIndex(c => queryFn(c.def));
      if (idx >= 0) return this.zones[z].splice(idx, 1)[0];
    }
    return null;
  }

  addToHand(card, reason = "") {
    // card is already removed from source zone by caller
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

    // runtime
    this.equippedTo = null;     // item -> characterId
    this.equipment = [];        // character -> itemIds
    this.bonusAtk = 0;

    // attack state
    this.baseAttacksPerTurn = 1;
    this.extraAttacksThisTurn = 0;
    this.attacksUsedThisTurn = 0;

    // flags
    this.flags = {};
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
  }

  canAttack() {
    const total = this.baseAttacksPerTurn + this.extraAttacksThisTurn;
    return this.attacksUsedThisTurn < total;
  }

  consumeAttack() {
    this.attacksUsedThisTurn += 1;
  }
}

/** -----------------------------
 * Card Definitions (21-30)
 * ----------------------------- */

// Helpers for common costs
function cost_sendOneHandOrOwnStageCharToWing(ctx) {
  const you = ctx.you;
  const g = ctx.game;

  // prefer sending from hand (other than the card itself) if possible
  const fromHand = you.zones.hand.find(c => c.def.kind === "character" && c.id !== ctx._selfCardId);
  const fromStage = you.zones.stage.find(c => c.def.kind === "character" && c.id !== ctx._selfCardId);

  const sacrifice = fromHand || fromStage;
  if (!sacrifice) {
    ctx.log(`[COST FAIL] No character in hand or stage to send to wing as cost.`);
    return false;
  }
  const fromZone = fromHand ? "hand" : "stage";
  g.moveCard(sacrifice, fromZone, "wing", "kensan cost");
  return true;
}

const CARD_DEFS = [
  // 21 ミーコ (未確定)
  {
    no: 21,
    name: "ミーコ",
    kind: "character",
    rank: null,
    atk: null,
    tags: [],
    titleTag: null,
    cannotEnterStage: false,
    abilities: {
      onEnterStage: (ctx, self) => {
        ctx.log(`[WARN] No.21 ミーコ の効果は未確定です。画像共有後に確定実装します。`);
      }
    }
  },

  // 22 インフルエンサーまりも
  {
    no: 22,
    name: "インフルエンサーまりも",
    kind: "character",
    rank: 3,
    atk: 400,
    tags: ["人間", "配信", "人気"],
    titleTag: "BUGBUG西遊記",
    cannotEnterStage: false,
    abilities: {
      // Reaction is implemented at Game.tryReactInfluencerMarimo
    }
  },

  // 23 退魔師レイチェル
  {
    no: 23,
    name: "退魔師レイチェル",
    kind: "character",
    rank: 5,
    atk: 2200,
    tags: ["除霊", "伶嬢", "射手"],
    titleTag: "怨霊撲滅屋GB",
    cannotEnterStage: true,
    kensanCost: (ctx, selfCard) => {
      // cost: send 1 character from hand or your stage to wing
      ctx._selfCardId = selfCard.id;
      return cost_sendOneHandOrOwnStageCharToWing(ctx);
    },
    abilities: {
      // Passive lock: while equipped with item, opponent characters with tag 怨霊 or 霊魂 cannot activate effects
      // In this minimal engine we enforce it via a helper when opponent tries to activate effects,
      // but since we don't have full opponent effect system here, we just expose a check function.
    }
  },

  // 24 銀弾の双銃 (item)
  {
    no: 24,
    name: "銀弾の双銃",
    kind: "item",
    rank: 4,
    atk: 0,
    tags: ["除霊", "拳銃"],
    titleTag: "怨霊撲滅屋GB",
    abilities: {
      onEquip: (ctx, selfItem, targetChar) => {
        // Base equip: ATK +500
        targetChar.bonusAtk += 500;
        ctx.log(`[EQUIP] No.24 -> ${targetChar.def.no}_${targetChar.def.name}: ATK +500`);

        // If target has tag "除霊": additional +500 and +2 attacks this turn
        if (targetChar.hasTag("除霊")) {
          targetChar.bonusAtk += 500;
          targetChar.extraAttacksThisTurn += 2;
          ctx.log(`[EQUIP BONUS] Target has tag「除霊」: additional ATK +500, +2 attacks this turn`);
        }
      }
    }
  },

  // 25 小次郎&小太郎
  {
    no: 25,
    name: "小次郎&小太郎",
    kind: "character",
    rank: 5,
    atk: 2500,
    tags: ["アバター", "GAME", "兄弟"],
    titleTag: "BUGBUG西遊記",
    cannotEnterStage: true,
    kensanCost: (ctx, selfCard) => {
      ctx._selfCardId = selfCard.id;
      return cost_sendOneHandOrOwnStageCharToWing(ctx);
    },
    abilities: {
      onSentToWing: (ctx, self, reason) => {
        // Trigger: if sent to wing by opponent effect OR battle
        // In this test engine, we check reason text; in your full engine replace with real cause flags.
        const byOpponentOrBattle =
          reason.includes("battle") || reason.includes("opponent") || reason.includes("effect") || reason.includes("defeated");
        if (!byOpponentOrBattle) return;

        const g = ctx.game;
        const you = ctx.you;

        ctx.log(`[TRIGGER] No.25 sent to wing -> may kensan up to 2 rank4以下の「小太郎」「小次郎」 from hand/deck/wing`);

        const targetNames = new Set(["小太郎", "小次郎"]);
        const query = (def) =>
          def.kind === "character" &&
          def.rank !== null &&
          def.rank <= 4 &&
          targetNames.has(def.name);

        // gather up to 2 from zones in priority: hand -> deck -> wing
        let count = 0;
        const zones = ["hand", "deck", "wing"];
        for (const z of zones) {
          // iterate with manual loop because we may splice
          for (let i = 0; i < you.zones[z].length && count < 2; i++) {
            const c = you.zones[z][i];
            if (!query(c.def)) continue;

            // remove from current zone
            you.zones[z].splice(i, 1);
            i--;

            // kensan to stage if slot, else add to hand
            if (you.hasStageSlot()) {
              g.moveCard(c, z, "stage", "No.25 special kensan");
              g.onEnterStage(c);
              count++;
            } else {
              you.zones.hand.push(c);
              ctx.log(`[INFO] Stage full -> moved to hand instead: ${c.def.no}_${c.def.name}`);
              count++;
            }
          }
        }

        if (count === 0) ctx.log(`[INFO] No valid 小太郎/小次郎 found.`);
      }
    }
  },

  // 26 ジュエリー・ルビー
  {
    no: 26,
    name: "ジュエリー・ルビー",
    kind: "character",
    rank: 4,
    atk: 1700,
    tags: ["美少女戦士", "アニメ", "格闘"],
    titleTag: "Ve ヴォイスエレメント",
    cannotEnterStage: true, // can be kensan from hand if Sapphire exists on your stage
    kensanCost: (ctx, selfCard) => {
      // condition: your stage has "ジュエリー・サファイア"
      const hasSapphire = ctx.you.zones.stage.some(c => c.def.no === 27);
      if (!hasSapphire) {
        ctx.log(`[COST FAIL] No.26 can be kensan only if your stage has No.27 ジュエリー・サファイア.`);
        return false;
      }
      return true;
    },
    abilities: {
      onEnterStage: (ctx, self) => {
        const g = ctx.game;
        const you = ctx.you;

        // on enter: send 1 card from hand to wing, then add 1 tag「アニメ」 card from deck or wing to hand
        if (you.zones.hand.length > 0) {
          const toWing = you.zones.hand.shift();
          g.moveCard(toWing, "hand", "wing", "No.26 enter cost");
        } else {
          ctx.log(`[INFO] No.26 enter: hand is empty, cannot send 1 to wing (skipped).`);
        }

        const found = you.searchZonesForCard(["deck", "wing"], (def) => (def.tags || []).includes("アニメ"));
        if (found) {
          you.addToHand(found, "No.26 add anime");
          ctx.log(`[RESOLVE] No.26 added to hand (tag「アニメ」): ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.26 could not find tag「アニメ」 card in deck/wing.`);
        }
      }
    }
  },

  // 27 ジュエリー・サファイア
  {
    no: 27,
    name: "ジュエリー・サファイア",
    kind: "character",
    rank: 4,
    atk: 1700,
    tags: ["美少女戦士", "アニメ", "格闘"],
    titleTag: "Ve ヴォイスエレメント",
    cannotEnterStage: true, // can be kensan from hand if Ruby exists on your stage
    kensanCost: (ctx, selfCard) => {
      const hasRuby = ctx.you.zones.stage.some(c => c.def.no === 26);
      if (!hasRuby) {
        ctx.log(`[COST FAIL] No.27 can be kensan only if your stage has No.26 ジュエリー・ルビー.`);
        return false;
      }
      return true;
    },
    abilities: {
      onEnterStage: (ctx, self) => {
        const g = ctx.game;
        const you = ctx.you;

        // same as No.26
        if (you.zones.hand.length > 0) {
          const toWing = you.zones.hand.shift();
          g.moveCard(toWing, "hand", "wing", "No.27 enter cost");
        } else {
          ctx.log(`[INFO] No.27 enter: hand is empty, cannot send 1 to wing (skipped).`);
        }

        const found = you.searchZonesForCard(["deck", "wing"], (def) => (def.tags || []).includes("アニメ"));
        if (found) {
          you.addToHand(found, "No.27 add anime");
          ctx.log(`[RESOLVE] No.27 added to hand (tag「アニメ」): ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.27 could not find tag「アニメ」 card in deck/wing.`);
        }
      }
    }
  },

  // 28 セシア&アリサ
  {
    no: 28,
    name: "セシア&アリサ",
    kind: "character",
    rank: 4,
    atk: 1500,
    tags: ["除霊", "支援", "侍女"],
    titleTag: "怨霊撲滅屋GB",
    cannotEnterStage: false,
    abilities: {
      onEnterStage: (ctx, self) => {
        const g = ctx.game;
        const you = ctx.you;

        // On enter: add 1 item card with titleTag 怨霊撲滅屋GB from deck to hand
        const found = you.searchZonesForCard(["deck"], (def) => def.kind === "item" && def.titleTag === "怨霊撲滅屋GB");
        if (found) {
          you.addToHand(found, "No.28 enter search");
          ctx.log(`[RESOLVE] No.28 added item to hand (titleTag「怨霊撲滅屋GB」): ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.28 could not find matching item in deck.`);
        }
      },

      // Active: during your turn, while exists on stage, you can ignore conditions to kensan 1 rank<=5 "レイチェル" from hand
      // We'll expose helper in test harness (see demo actions).
    }
  },

  // 29 狼猫-孫悟空Lv75-
  {
    no: 29,
    name: "狼猫-孫悟空Lv75-",
    kind: "character",
    rank: 5,
    atk: 2400,
    tags: ["アバター", "GAME", "剣士"],
    titleTag: "BUGBUG西遊記",
    cannotEnterStage: true,
    kensanCost: (ctx, selfCard) => {
      ctx._selfCardId = selfCard.id;
      return cost_sendOneHandOrOwnStageCharToWing(ctx);
    },
    abilities: {
      // 1ターンに1度: add 1 BUGBUG西遊記 item from deck or wing to hand
      onCustomOncePerTurn: (ctx, self) => {
        const key = `${ctx.you.name}:No29:searchItem`;
        if (!ctx.oncePerTurn(key)) {
          ctx.log(`[INFO] No.29 effect already used this turn.`);
          return;
        }
        const you = ctx.you;
        const found = you.searchZonesForCard(["deck", "wing"], (def) => def.kind === "item" && def.titleTag === "BUGBUG西遊記");
        if (found) {
          you.addToHand(found, "No.29 search item");
          ctx.log(`[RESOLVE] No.29 added to hand: ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.29 could not find BUGBUG西遊記 item in deck/wing.`);
        }
      }
    }
  },

  // 30 七星剣 (未確定)
  {
    no: 30,
    name: "七星剣",
    kind: "item",
    rank: null,
    atk: 0,
    tags: [],
    titleTag: null,
    abilities: {
      onEquip: (ctx, selfItem, targetChar) => {
        ctx.log(`[WARN] No.30 七星剣 の効果は未確定です。画像共有後に確定実装します。`);
      }
    }
  },
];

const CARD_DEF_MAP = new Map(CARD_DEFS.map(d => [d.no, d]));

/** -----------------------------
 * Build sample decks for testing
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

  // Simple shields (dummy cards)
  for (let i = 0; i < 3; i++) {
    const dummyDef = { no: 900 + i, name: `シールド${i + 1}`, kind: "item", atk: 0, tags: [], titleTag: null };
    p1.zones.shield.push(new Card(p1, dummyDef));
    p2.zones.shield.push(new Card(p2, dummyDef));
  }

  // P1 deck: include our cards + some filler "アニメ" cards + BUGBUG items
  const animeFillerDef = { no: 701, name: "アニメ汎用カード", kind: "item", atk: 0, tags: ["アニメ"], titleTag: "Ve ヴォイスエレメント" };
  const bugbugItemDef = { no: 702, name: "BUGBUG汎用アイテム", kind: "item", atk: 0, tags: [], titleTag: "BUGBUG西遊記" };
  const bugbugItem = new Card(p1, bugbugItemDef);
  const animeFiller = new Card(p1, animeFillerDef);

  p1.zones.deck.push(
    makeCard(p1, 28),
    makeCard(p1, 24),
    makeCard(p1, 23),
    makeCard(p1, 22),
    makeCard(p1, 25),
    makeCard(p1, 26),
    makeCard(p1, 27),
    makeCard(p1, 29),
    makeCard(p1, 21),
    makeCard(p1, 30),
    animeFiller,
    bugbugItem,
  );

  // P2 deck: include No.22 for reaction test and some search effects simulation
  p2.zones.deck.push(
    makeCard(p2, 22),
    makeCard(p2, 24),
    makeCard(p2, 29),
    new Card(p2, { no: 703, name: "相手のサーチ札", kind: "item", atk: 0, tags: [], titleTag: null }),
  );

  // Shuffle (simple)
  p1.zones.deck.sort(() => Math.random() - 0.5);
  p2.zones.deck.sort(() => Math.random() - 0.5);

  // Opening draw
  p1.draw(5);
  p2.draw(5);

  return game;
}

/** -----------------------------
 * Passive checks (No.23 lock)
 * ----------------------------- */
function opponentCanActivateEffects(game, opponent, targetCard) {
  // If your opponent has No.23 on stage and it is equipped with any item,
  // then opponent's characters with tag 怨霊 or 霊魂 cannot activate effects.
  const enemy = game.players[1 - game.players.indexOf(opponent)];
  const reichel = enemy.zones.stage.find(c => c.def.no === 23);
  if (!reichel) return true;

  const isEquipped = (reichel.equipment && reichel.equipment.length > 0);
  if (!isEquipped) return true;

  const hasBlockedTag =
    (targetCard.def.tags || []).includes("怨霊") ||
    (targetCard.def.tags || []).includes("霊魂");

  if (hasBlockedTag) {
    game.log(`[LOCK] No.23 equipped -> opponent character with tag「怨霊/霊魂」 cannot activate effects.`);
    return false;
  }
  return true;
}

/** -----------------------------
 * Demo / Test Play Script
 * ----------------------------- */
function demo() {
  const game = setupTestGame();

  // TURN 1: P1
  game.startTurn();
  const p1 = game.activePlayer;
  const p2 = game.nonActivePlayer;

  // Put No.28 on stage (if in hand)
  const seshia = p1.findInZone("hand", c => c.def.no === 28);
  if (seshia) game.kensanFromHand(p1, seshia);

  // Equip No.24 to No.28 if possible
  const dualguns = p1.findInZone("hand", c => c.def.no === 24);
  const seshiaOnStage = p1.findInZone("stage", c => c.def.no === 28);
  if (dualguns && seshiaOnStage) {
    game.equipItem(p1, dualguns, seshiaOnStage);
  }

  // Use No.28 helper: ignore conditions to kensan 1 rank<=5 "退魔師レイチェル" from hand
  // (In real UI you'd have a button. Here we do it directly.)
  if (seshiaOnStage) {
    const reichel = p1.findInZone("hand", c => c.def.no === 23);
    if (reichel) {
      game.log(`[ACTION] No.28 effect: ignore conditions to kensan No.23 from hand`);
      game.kensanFromHand(p1, reichel, { ignoreConditions: true });
    }
  }

  // TURN 1: P1 ends
  game.endTurn();

  // TURN 2: P2 (reaction test for No.22)
  game.startTurn();
  const p2a = game.activePlayer;

  // Ensure P2 has No.22 in hand (reaction)
  const marimoP2 = p2a.findInZone("hand", c => c.def.no === 22);
  if (!marimoP2) game.log(`[INFO] P2 does not have No.22 in hand right now; reaction may not occur.`);

  // P2 uses a dummy "search add to hand" effect from some source card in hand (simulate)
  const source = pickFirst(p2a.zones.hand.filter(c => c.def.kind === "item")) || pickFirst(p2a.zones.hand);
  if (source) {
    game.activateEffect({
      player: p2a,
      sourceCard: source,
      effectType: "SEARCH_ADD_TO_HAND",
      payload: {
        queryFn: (def) => true // pick anything
      }
    });
  }

  // TURN 2 end
  game.endTurn();

  // TURN 3: P1 battle test (No.23 shield break)
  game.startTurn();
  const p1a = game.activePlayer;
  const reichelOnStage = p1a.findInZone("stage", c => c.def.no === 23);

  // Put a dummy enemy character to battle with
  const enemyDummyDef = { no: 800, name: "敵キャラ", kind: "character", rank: 3, atk: 1000, tags: ["怨霊"], titleTag: null };
  const enemyDummy = new Card(game.nonActivePlayer, enemyDummyDef);
  game.nonActivePlayer.zones.stage.push(enemyDummy);

  if (reichelOnStage) {
    // Equip any item to No.23 if available (so lock condition becomes true)
    const itemToEquip = p1a.findInZone("hand", c => c.def.kind === "item");
    if (itemToEquip) {
      game.equipItem(p1a, itemToEquip, reichelOnStage);
    }

    // Attempt to activate enemy dummy effect (should be locked if No.23 equipped)
    const can = opponentCanActivateEffects(game, game.nonActivePlayer, enemyDummy);
    if (!can) {
      game.log(`[CHECK] Enemy dummy effect activation prevented as expected.`);
    }

    // Battle: No.23 defeats enemy -> destroys 1 shield
    game.battle(reichelOnStage, enemyDummy);
  } else {
    game.log(`[INFO] No.23 not on stage; skipping battle test.`);
  }

  // TURN 3 end
  game.endTurn();

  // TURN 4: P1 uses No.29 once-per-turn search
  game.startTurn();
  const p1b = game.activePlayer;
  const wolfcat = p1b.findInZone("hand", c => c.def.no === 29);
  if (wolfcat) {
    // kensan No.29 (requires cost)
    game.kensanFromHand(p1b, wolfcat);
    const wolfOnStage = p1b.findInZone("stage", c => c.def.no === 29);
    if (wolfOnStage) {
      const ctx = game.makeCtx(p1b, 1 - game.players.indexOf(p1b));
      wolfOnStage.def.abilities.onCustomOncePerTurn(ctx, wolfOnStage);
      // try again (should fail once-per-turn)
      wolfOnStage.def.abilities.onCustomOncePerTurn(ctx, wolfOnStage);
    }
  } else {
    game.log(`[INFO] No.29 not in hand; skipping No.29 test.`);
  }

  game.log("\n=== DEMO END ===");
}

demo();