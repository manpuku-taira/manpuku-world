/**
 * Manpuku World - Cards 21-30 Minimal Test Engine (Single JS File)
 * - Purpose: Quick test-play for card effects 21-30 (as provided in conversation)
 * - Zones: deck, hand, stage, wing, shield
 *
 * Implemented from images/text in this chat:
 *  - No.21 ミーコ:
 *    1) 1ターンに1度、バトルで破壊されない（＝このターンの最初の「バトル敗北」を無効化）
 *    2) 自分シールド0で相手のダイレクトアタックを受ける時、手札から見参できる。
 *       その攻撃を無効にし、このターンのバトルを終了する。
 *
 *  - No.30 七星剣:
 *    自分ターンに発動できる。自分ステージのキャラクター1体を選択し装備。ATK+500。
 *    タグ「剣士」を持つキャラクターが装備した場合、さらにATK+500し、
 *    自分ターンに相手ステージの全てのキャラクターに1度ずつ攻撃する事ができる。
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

    // Temporary turn-based flags
    this.turnFlags = {
      negatedCardIds: new Set(), // "this turn card's effects are negated"
      oncePerTurn: new Set(),    // generic once-per-turn keys
      battleEndedThisTurn: false // for No.21 direct-attack negate
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
    // Draw 1 for test convenience
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

  /**
   * Moves card instance between zones.
   * Safe even if the card was already removed from fromZone.
   */
  moveCard(card, fromZone, toZone, reason = "") {
    const owner = card.owner;
    const fromArr = owner.zones[fromZone];
    const toArr = owner.zones[toZone];

    // remove if still in fromZone
    const idx = fromArr.findIndex((c) => c.id === card.id);
    if (idx >= 0) fromArr.splice(idx, 1);

    toArr.push(card);
    this.log(
      `[MOVE] ${owner.name}: ${card.def.no}_${card.def.name} ${fromZone} -> ${toZone}${
        reason ? " (" + reason + ")" : ""
      }`
    );

    if (toZone === "wing") {
      this.onSentToWing(card, reason);
    }
  }

  onEnterStage(card) {
    const ctx = this.makeCtx(card.owner, 1 - this.players.indexOf(card.owner));
    const def = card.def;
    if (def.abilities?.onEnterStage) {
      def.abilities.onEnterStage(ctx, card);
    }
  }

  onSentToWing(card, reason) {
    const ctx = this.makeCtx(card.owner, 1 - this.players.indexOf(card.owner));
    const def = card.def;
    if (def.abilities?.onSentToWing) {
      def.abilities.onSentToWing(ctx, card, reason);
    }
  }

  /**
   * Effect activation pipeline:
   * - defender may react (No.22)
   * - if negated -> do nothing
   */
  activateEffect({ player, sourceCard, effectType, payload }) {
    const opponent = this.players[1 - this.players.indexOf(player)];
    this.log(
      `[EFFECT] ${player.name} activates ${effectType} from ${sourceCard.def.no}_${sourceCard.def.name}`
    );

    // Defender reaction: No.22
    this.tryReactInfluencerMarimo(opponent, sourceCard, effectType);

    if (this.turnFlags.negatedCardIds.has(sourceCard.id)) {
      this.log(
        `[NEGATED] ${sourceCard.def.no}_${sourceCard.def.name} effects are negated until end of turn.`
      );
      return;
    }

    if (effectType === "SEARCH_ADD_TO_HAND") {
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

    // auto-react ON for test
    this.log(
      `[REACT] ${defender.name} reacts with 22_インフルエンサーまりも (hand -> wing), negating source card this turn.`
    );
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

  /** -----------------------------
   * Gameplay actions
   * ----------------------------- */

  kensanFromHand(player, card, { ignoreConditions = false } = {}) {
    assert(card.owner === player, "You can only kensan your own card.");
    const def = card.def;

    if (!player.hasStageSlot()) {
      this.log(`[FAIL] ${player.name} stage is full.`);
      return false;
    }

    if (def.cannotEnterStage && !ignoreConditions) {
      if (typeof def.kensanCost !== "function") {
        this.log(
          `[FAIL] ${def.no}_${def.name} cannot enter stage and has no kensanCost defined.`
        );
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

    this.moveCard(card, "hand", "stage", "kensan");
    this.onEnterStage(card);
    return true;
  }

  equipItem(player, itemCard, targetChar) {
    assert(itemCard.owner === player, "You can only equip your own item.");
    assert(targetChar.owner === player, "You can only equip to your own character.");
    assert(itemCard.def.kind === "item", "Item required.");
    assert(targetChar.def.kind === "character", "Target must be character.");

    this.moveCard(
      itemCard,
      "hand",
      "stage",
      `equip to ${targetChar.def.no}_${targetChar.def.name}`
    );
    itemCard.equippedTo = targetChar.id;
    targetChar.equipment.push(itemCard.id);

    const ctx = this.makeCtx(player, 1 - this.players.indexOf(player));
    if (itemCard.def.abilities?.onEquip) {
      itemCard.def.abilities.onEquip(ctx, itemCard, targetChar);
    }
    return true;
  }

  /**
   * Battle: attacker attacks defenderChar (character vs character)
   */
  battle(attackerChar, defenderChar) {
    if (this.turnFlags.battleEndedThisTurn) {
      this.log(`[INFO] Battle is ended for this turn. No further battles can be performed.`);
      return false;
    }

    const atkOwner = attackerChar.owner;
    const defOwner = defenderChar.owner;
    assert(atkOwner !== defOwner, "Battle must be between opposing players.");

    if (!attackerChar.canAttackTarget(defenderChar)) {
      this.log(`[FAIL] ${atkOwner.name} attacker cannot attack this target (no attacks left).`);
      return false;
    }

    attackerChar.consumeAttackTo(defenderChar);
    const atk = attackerChar.getAtk();
    const defAtk = defenderChar.getAtk();
    this.log(
      `[BATTLE] ${atkOwner.name} ${attackerChar.def.no}_${attackerChar.def.name} (${atk}) vs ${defOwner.name} ${defenderChar.def.no}_${defenderChar.def.name} (${defAtk})`
    );

    if (atk >= defAtk) {
      // defender would be sent to wing, but No.21 can prevent "battle destruction" once per turn
      if (this.tryPreventBattleDestruction(defenderChar)) {
        this.log(`[PREVENT] No.21 effect prevented battle destruction this turn.`);
        return true;
      }

      this.moveCard(defenderChar, "stage", "wing", "battle defeated");

      // Trigger: No.23 destroys 1 opponent shield if it sent opponent char to wing by battle
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

    // attacker loses
    if (this.tryPreventBattleDestruction(attackerChar)) {
      this.log(`[PREVENT] No.21 effect prevented battle destruction this turn.`);
      return true;
    }

    this.moveCard(attackerChar, "stage", "wing", "battle defeated");
    return true;
  }

  /**
   * Direct attack (no defender character).
   * If defender shield is 0, No.21 can kensan from hand to negate and end battle this turn.
   */
  directAttack(attackerChar, defenderPlayer) {
    if (this.turnFlags.battleEndedThisTurn) {
      this.log(`[INFO] Battle is ended for this turn. No further battles can be performed.`);
      return false;
    }

    assert(attackerChar.owner !== defenderPlayer, "Direct attack must target opponent.");

    // if defender has shields >0, we treat as "break 1 shield" for test
    if (defenderPlayer.zones.shield.length > 0) {
      const shield = defenderPlayer.zones.shield.pop();
      if (shield) {
        this.moveCard(shield, "shield", "wing", "direct attack -> shield broken");
        this.log(`[DIRECT] Broke 1 shield.`);
      }
      return true;
    }

    // shield is 0: No.21 reaction window
    const defender = defenderPlayer;
    const miiko = defender.findInZone("hand", (c) => c.def.no === 21);
    if (miiko) {
      const ctx = this.makeCtx(defender, 1 - this.players.indexOf(defender));
      const ok = miiko.def.abilities?.onDirectAttackWhenShield0?.(ctx, miiko, attackerChar);
      if (ok) {
        this.log(`[DIRECT] Attack was negated by No.21. Battle is ended for this turn.`);
        this.turnFlags.battleEndedThisTurn = true;
        return true;
      }
    }

    // If no prevention, for minimal engine we just log "hit"
    this.log(`[DIRECT] Shield is 0 and no prevention. Direct attack hits (minimal engine).`);
    return true;
  }

  /**
   * No.21: 1ターンに1度、バトルで破壊されない（＝そのターンの最初の敗北を無効化）
   */
  tryPreventBattleDestruction(card) {
    if (card.def.no !== 21) return false;
    const key = `${card.owner.name}:No21:preventBattleDestruction:TURN${this.turn}`;
    // "1ターンに1度" -> use oncePerTurn table
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

    // runtime
    this.equippedTo = null; // item -> characterId
    this.equipment = [];    // character -> itemIds
    this.bonusAtk = 0;

    // attack state
    this.baseAttacksPerTurn = 1;
    this.extraAttacksThisTurn = 0;
    this.attacksUsedThisTurn = 0;

    // 七星剣「全員に1度ずつ攻撃」管理
    this.flags = {
      sweepAttackEnabled: false, // 七星剣が剣士に付いている
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
    // 七星剣「剣士」装備時：相手ステージの全キャラクターへ1度ずつ攻撃できる
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

// common cost: send 1 character from hand OR your stage to wing
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
    ctx.log(`[COST FAIL] 手札または自分ステージに、コストでウイングへ送れるキャラクターがいません。`);
    return false;
  }
  const fromZone = fromHand ? "hand" : "stage";
  g.moveCard(sacrifice, fromZone, "wing", "kensan cost");
  return true;
}

const CARD_DEFS = [
  // 21 ミーコ（画像テキスト反映）
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
      // 1ターンに1度バトルで破壊されない -> Game.tryPreventBattleDestruction で処理
      onDirectAttackWhenShield0: (ctx, selfCard, attackerChar) => {
        // 条件: 自分シールド0で相手のダイレクトアタックを受ける時、手札から見参できる
        // 解決: その攻撃を無効にし、このターンのバトルを終了する
        const key = `${ctx.you.name}:No21:directAttackNegate`;
        // このテストでは回数制限が記載されていないため、同ターン複数回も理屈上可能だが、
        // 実運用で事故を避けるため「1ターンに1度」に寄せる（必要なら外します）
        if (!ctx.oncePerTurn(key)) {
          ctx.log(`[INFO] No.21 ダイレクトアタック無効はこのターン既に使用しています。`);
          return false;
        }
        // 手札から見参
        ctx.log(`[REACT] No.21 ミーコ：手札から見参し、ダイレクトアタックを無効にする。`);
        ctx.game.kensanFromHand(ctx.you, selfCard, { ignoreConditions: true });
        // 攻撃無効＋バトル終了
        return true;
      },
    },
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
      ctx._selfCardId = selfCard.id;
      return cost_sendOneHandOrOwnStageCharToWing(ctx);
    },
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
        targetChar.bonusAtk += 500;
        ctx.log(`[EQUIP] No.24 -> ${targetChar.def.no}_${targetChar.def.name}: ATK +500`);

        // タグ「除霊」を持つキャラクターが装備した場合：さらにATK+500、攻撃回数を2回追加（このターン）
        if (targetChar.hasTag("除霊")) {
          targetChar.bonusAtk += 500;
          targetChar.extraAttacksThisTurn += 2;
          ctx.log(`[EQUIP BONUS] タグ「除霊」: さらにATK +500、このターン攻撃回数+2`);
        }
      },
    },
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
        const byOpponentOrBattle =
          reason.includes("battle") ||
          reason.includes("opponent") ||
          reason.includes("effect") ||
          reason.includes("defeated");
        if (!byOpponentOrBattle) return;

        const g = ctx.game;
        const you = ctx.you;

        ctx.log(`[TRIGGER] No.25：ウイングへ送られた時、rank4以下の「小太郎」「小次郎」を2体まで見参できる。`);

        const targetNames = new Set(["小太郎", "小次郎"]);
        const query = (def) =>
          def.kind === "character" &&
          def.rank !== null &&
          def.rank <= 4 &&
          targetNames.has(def.name);

        let count = 0;
        const zones = ["hand", "deck", "wing"];
        for (const z of zones) {
          for (let i = 0; i < you.zones[z].length && count < 2; i++) {
            const c = you.zones[z][i];
            if (!query(c.def)) continue;

            you.zones[z].splice(i, 1);
            i--;

            if (you.hasStageSlot()) {
              g.moveCard(c, z, "stage", "No.25 special kensan");
              g.onEnterStage(c);
              count++;
            } else {
              you.zones.hand.push(c);
              ctx.log(`[INFO] ステージ満員のため手札へ: ${c.def.no}_${c.def.name}`);
              count++;
            }
          }
        }

        if (count === 0) ctx.log(`[INFO] 対象の小太郎/小次郎が見つかりませんでした。`);
      },
    },
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
    cannotEnterStage: true,
    kensanCost: (ctx) => {
      const hasSapphire = ctx.you.zones.stage.some((c) => c.def.no === 27);
      if (!hasSapphire) {
        ctx.log(`[COST FAIL] No.26は自分ステージにNo.27が存在する時のみ手札から見参できる。`);
        return false;
      }
      return true;
    },
    abilities: {
      onEnterStage: (ctx) => {
        const g = ctx.game;
        const you = ctx.you;

        if (you.zones.hand.length > 0) {
          const toWing = you.zones.hand.shift();
          g.moveCard(toWing, "hand", "wing", "No.26 enter cost");
        } else {
          ctx.log(`[INFO] No.26：手札が0のためウイング送りはスキップ。`);
        }

        const found = you.searchZonesForCard(["deck", "wing"], (def) =>
          (def.tags || []).includes("アニメ")
        );
        if (found) {
          you.addToHand(found);
          ctx.log(`[RESOLVE] No.26：タグ「アニメ」を手札に加えた: ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.26：タグ「アニメ」が見つかりませんでした。`);
        }
      },
    },
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
    cannotEnterStage: true,
    kensanCost: (ctx) => {
      const hasRuby = ctx.you.zones.stage.some((c) => c.def.no === 26);
      if (!hasRuby) {
        ctx.log(`[COST FAIL] No.27は自分ステージにNo.26が存在する時のみ手札から見参できる。`);
        return false;
      }
      return true;
    },
    abilities: {
      onEnterStage: (ctx) => {
        const g = ctx.game;
        const you = ctx.you;

        if (you.zones.hand.length > 0) {
          const toWing = you.zones.hand.shift();
          g.moveCard(toWing, "hand", "wing", "No.27 enter cost");
        } else {
          ctx.log(`[INFO] No.27：手札が0のためウイング送りはスキップ。`);
        }

        const found = you.searchZonesForCard(["deck", "wing"], (def) =>
          (def.tags || []).includes("アニメ")
        );
        if (found) {
          you.addToHand(found);
          ctx.log(`[RESOLVE] No.27：タグ「アニメ」を手札に加えた: ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.27：タグ「アニメ」が見つかりませんでした。`);
        }
      },
    },
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
      onEnterStage: (ctx) => {
        const you = ctx.you;
        const found = you.searchZonesForCard(["deck"], (def) => def.kind === "item" && def.titleTag === "怨霊撲滅屋GB");
        if (found) {
          you.addToHand(found);
          ctx.log(`[RESOLVE] No.28：タイトルタグ「怨霊撲滅屋GB」のアイテムを手札に加えた: ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.28：該当アイテムがデッキにありません。`);
        }
      },
    },
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
      onCustomOncePerTurn: (ctx) => {
        const key = `${ctx.you.name}:No29:searchItem`;
        if (!ctx.oncePerTurn(key)) {
          ctx.log(`[INFO] No.29：このターン既に使用しています。`);
          return;
        }
        const you = ctx.you;
        const found = you.searchZonesForCard(["deck", "wing"], (def) => def.kind === "item" && def.titleTag === "BUGBUG西遊記");
        if (found) {
          you.addToHand(found);
          ctx.log(`[RESOLVE] No.29：BUGBUG西遊記のアイテムを手札に加えた: ${found.def.no}_${found.def.name}`);
        } else {
          ctx.log(`[RESOLVE] No.29：BUGBUG西遊記のアイテムが見つかりません。`);
        }
      },
    },
  },

  // 30 七星剣（画像テキスト反映）
  {
    no: 30,
    name: "七星剣",
    kind: "item",
    rank: 0,
    atk: 0,
    tags: ["課金アイテム", "刀剣"],
    titleTag: "BUGBUG西遊記",
    abilities: {
      onEquip: (ctx, selfItem, targetChar) => {
        targetChar.bonusAtk += 500;
        ctx.log(`[EQUIP] No.30 -> ${targetChar.def.no}_${targetChar.def.name}: ATK +500`);

        if (targetChar.hasTag("剣士")) {
          targetChar.bonusAtk += 500;
          targetChar.flags.sweepAttackEnabled = true;
          ctx.log(`[EQUIP BONUS] タグ「剣士」: さらにATK +500、自分ターンに相手全キャラへ1度ずつ攻撃できる`);
        }
      },
    },
  },
];

const CARD_DEF_MAP = new Map(CARD_DEFS.map((d) => [d.no, d]));

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

  // shields (dummy)
  for (let i = 0; i < 3; i++) {
    const dummyDef = { no: 900 + i, name: `シールド${i + 1}`, kind: "item", atk: 0, tags: [], titleTag: null };
    p1.zones.shield.push(new Card(p1, dummyDef));
    p2.zones.shield.push(new Card(p2, dummyDef));
  }

  // fillers
  const animeFillerDef = { no: 701, name: "アニメ汎用カード", kind: "item", atk: 0, tags: ["アニメ"], titleTag: "Ve ヴォイスエレメント" };
  const bugbugItemDef = { no: 702, name: "BUGBUG汎用アイテム", kind: "item", atk: 0, tags: [], titleTag: "BUGBUG西遊記" };
  const gbItemDef = { no: 704, name: "GB汎用アイテム", kind: "item", atk: 0, tags: [], titleTag: "怨霊撲滅屋GB" };

  p1.zones.deck.push(
    makeCard(p1, 21),
    makeCard(p1, 22),
    makeCard(p1, 23),
    makeCard(p1, 24),
    makeCard(p1, 25),
    makeCard(p1, 26),
    makeCard(p1, 27),
    makeCard(p1, 28),
    makeCard(p1, 29),
    makeCard(p1, 30),
    new Card(p1, animeFillerDef),
    new Card(p1, bugbugItemDef),
    new Card(p1, gbItemDef)
  );

  p2.zones.deck.push(
    makeCard(p2, 22),
    makeCard(p2, 24),
    makeCard(p2, 29),
    makeCard(p2, 30),
    new Card(p2, { no: 703, name: "相手のサーチ札", kind: "item", atk: 0, tags: [], titleTag: null })
  );

  // shuffle
  p1.zones.deck.sort(() => Math.random() - 0.5);
  p2.zones.deck.sort(() => Math.random() - 0.5);

  // opening draw
  p1.draw(5);
  p2.draw(5);

  return game;
}

/** -----------------------------
 * Passive checks (No.23 lock)
 * ----------------------------- */
function opponentCanActivateEffects(game, opponent, targetCard) {
  // If enemy has No.23 on stage and it is equipped, opponent's "怨霊/霊魂" cannot activate effects.
  const enemy = game.players[1 - game.players.indexOf(opponent)];
  const reichel = enemy.zones.stage.find((c) => c.def.no === 23);
  if (!reichel) return true;

  const isEquipped = reichel.equipment && reichel.equipment.length > 0;
  if (!isEquipped) return true;

  const hasBlockedTag =
    (targetCard.def.tags || []).includes("怨霊") ||
    (targetCard.def.tags || []).includes("霊魂");

  if (hasBlockedTag) {
    game.log(`[LOCK] No.23装備中：タグ「怨霊/霊魂」は効果を発動できない。`);
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

  // Put No.28 on stage if in hand
  const seshia = p1.findInZone("hand", (c) => c.def.no === 28);
  if (seshia) game.kensanFromHand(p1, seshia);

  // Equip No.24 to No.28 if possible
  const dualguns = p1.findInZone("hand", (c) => c.def.no === 24);
  const seshiaOnStage = p1.findInZone("stage", (c) => c.def.no === 28);
  if (dualguns && seshiaOnStage) game.equipItem(p1, dualguns, seshiaOnStage);

  // TURN 1 end
  game.endTurn();

  // TURN 2: P2 (No.22 reaction test)
  game.startTurn();
  const p2 = game.activePlayer;
  const source = pickFirst(p2.zones.hand.filter((c) => c.def.kind === "item")) || pickFirst(p2.zones.hand);

  if (source) {
    game.activateEffect({
      player: p2,
      sourceCard: source,
      effectType: "SEARCH_ADD_TO_HAND",
      payload: { queryFn: () => true },
    });
  }
  game.endTurn();

  // TURN 3: P1 set No.23 and battle test + No.21 battle-prevent test
  game.startTurn();
  const p1a = game.activePlayer;

  // kensan No.23 ignoring for demo (if have No.28 on stage, in real rules you would use its effect)
  const reichel = p1a.findInZone("hand", (c) => c.def.no === 23);
  if (reichel) game.kensanFromHand(p1a, reichel, { ignoreConditions: true });

  // Put No.21 on stage if in hand
  const miiko = p1a.findInZone("hand", (c) => c.def.no === 21);
  if (miiko) game.kensanFromHand(p1a, miiko);

  // Enemy dummy on stage
  const enemyDummyDef = { no: 800, name: "敵キャラ", kind: "character", rank: 3, atk: 2600, tags: ["怨霊"], titleTag: null };
  const enemyDummy = new Card(game.nonActivePlayer, enemyDummyDef);
  game.nonActivePlayer.zones.stage.push(enemyDummy);

  // If Miiko is on stage, let it "lose" once and survive
  const miikoOnStage = p1a.findInZone("stage", (c) => c.def.no === 21);
  if (miikoOnStage) {
    // make Miiko attack into stronger enemy so Miiko would be destroyed, then prevent once
    game.battle(miikoOnStage, enemyDummy); // Miiko likely loses -> prevented once
  }

  game.endTurn();

  // TURN 4: P1 七星剣 sweep demo + direct attack demo (No.21)
  game.startTurn();
  const p1b = game.activePlayer;
  const p2b = game.nonActivePlayer;

  // Reduce P2 shields to 0 quickly (for direct attack test)
  p2b.zones.shield.length = 0;

  // Put No.29 on stage (cost required)
  const wolfcat = p1b.findInZone("hand", (c) => c.def.no === 29);
  if (wolfcat) game.kensanFromHand(p1b, wolfcat);

  // Equip No.30 to No.29 if possible
  const seven = p1b.findInZone("hand", (c) => c.def.no === 30);
  const wolfOnStage = p1b.findInZone("stage", (c) => c.def.no === 29);
  if (seven && wolfOnStage) game.equipItem(p1b, seven, wolfOnStage);

  // Create 2 enemy stage chars to show sweep (attack each once)
  const e1 = new Card(p2b, { no: 801, name: "敵1", kind: "character", rank: 3, atk: 1000, tags: [], titleTag: null });
  const e2 = new Card(p2b, { no: 802, name: "敵2", kind: "character", rank: 3, atk: 1100, tags: [], titleTag: null });
  p2b.zones.stage.push(e1, e2);

  if (wolfOnStage) {
    game.battle(wolfOnStage, e1);
    game.battle(wolfOnStage, e2);
    // third time to same target should fail in sweep mode
    game.battle(wolfOnStage, e2);
  }

  // Direct attack when defender shield = 0 -> No.21 can kensan from hand to negate
  const miikoHand = p2b.findInZone("hand", (c) => c.def.no === 21);
  if (!miikoHand) {
    // if not in hand, we add one for demo
    p2b.zones.hand.push(makeCard(p2b, 21));
  }
  if (wolfOnStage) {
    game.directAttack(wolfOnStage, p2b);
    // further battle this turn is ended if No.21 negated
    game.directAttack(wolfOnStage, p2b);
  }

  game.log("\n=== DEMO END ===");
}

/**
 * Export for external runner (browser bundler etc.)
 * - If you import this file, it will NOT auto-run demo.
 */
module.exports = {
  Game,
  Player,
  Card,
  CARD_DEFS,
  setupTestGame,
  opponentCanActivateEffects,
  demo,
};

// Node direct execution only
if (typeof require !== "undefined" && require.main === module) {
  try {
    demo();
  } catch (e) {
    console.error("[FATAL]", e);
    process.exitCode = 1;
  }
}