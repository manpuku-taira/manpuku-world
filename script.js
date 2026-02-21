/**
 * Manpuku World - Cards 21-30 Browser Test (Single JS File)
 * iOS Safari friendly: START button always works, no console / no extra "load" step.
 *
 * - Your work: replace your JS file entirely with THIS.
 * - It auto-hooks the landing START button (text: "START") and starts game UI immediately.
 *
 * Card rules text style:
 *  - 「または」「できる」準拠
 *  - 「タイトルタグ」表記
 */

(() => {
  "use strict";

  /*************************
   * Small helpers
   *************************/
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const uid = (() => {
    let n = 1;
    return () => `c_${String(n++).padStart(4, "0")}`;
  })();

  function safeText(s) {
    return String(s ?? "");
  }

  /*************************
   * Card definitions 21-30
   *************************
   * NOTE: numbers are the list you provided:
   * 21 ミーコ
   * 22 インフルエンサーまりも
   * 23 退魔師レイチェル
   * 24 銀弾の双銃
   * 25 小次郎&小太郎
   * 26 ジュエリー・ルビー
   * 27 ジュエリー・サファイア
   * 28 セシア&アリサ
   * 29 狼猫-孫悟空Lv75-
   * 30 七星剣
   */

  const CARD_DEFS = {
    21: {
      no: 21,
      name: "ミーコ",
      kind: "character",
      rank: 3,
      atk: 300,
      tags: ["アバター", "霊魂", "ミジンコ"],
      titleTag: "BUGBUG西遊記",
      cannotEnterStage: false,
      // 実装（画像テキストより）
      // ・1ターンに1度、バトルで破壊されない
      // ・自分シールド0枚で相手の直接攻撃を受ける時、手札から見参できる。
      //   相手の攻撃を無効にし、このターンのバトルを終了する。
      abilities: {
        onBeforeDestroyedByBattle: (ctx, self) => {
          const key = `${self.owner.name}:No21:saveOncePerTurn`;
          if (ctx.oncePerTurn(key)) {
            ctx.log(`[No.21] 1ターンに1度、バトルで破壊されない（発動）。`);
            return { prevent: true };
          }
          return { prevent: false };
        },
        onDirectAttackIncomingWhenYourShieldZero: (ctx, self) => {
          // from hand kensan allowed, negate attack and end battle
          ctx.log(`[No.21] 自分シールド0枚の直接攻撃時、手札から見参。攻撃を無効にし、このターンのバトルを終了する。`);
          return true;
        },
      },
    },

    22: {
      no: 22,
      name: "インフルエンサーまりも",
      kind: "character",
      rank: 3,
      atk: 400,
      tags: ["人間", "配信", "人気"],
      titleTag: "BUGBUG西遊記",
      cannotEnterStage: false,
      // 反応：
      // 以下のいずれかの相手の効果が発動した時、このカードを手札からウイングに送り発動できる。
      // このターンの終わりまで、その効果を発動したカードの効果を全て無効にする。
      // ●デッキからカードを手札に加える効果
      // ●デッキからキャラクターを見参する効果
      abilities: {},
    },

    23: {
      no: 23,
      name: "退魔師レイチェル",
      kind: "character",
      rank: 5,
      atk: 2200,
      tags: ["除霊", "伶嬢", "射手"],
      titleTag: "怨霊撲滅屋GB",
      cannotEnterStage: true,
      kensanCost: "SEND_1_CHAR_HAND_OR_OWN_STAGE_TO_WING",
      // ・このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。
      // ・このカードがアイテムを装備している時、相手ステージのタグ「怨霊」「霊魂」を持つキャラクターは効果を発動できない。
      //   バトルで相手キャラクターをウイングに送った時、相手シールドを1枚破壊する。
      abilities: {
        onAfterWinBattleAndSendOpponentToWing: (ctx, self) => {
          ctx.log(`[No.23] バトルで相手キャラをウイングに送った→相手シールドを1枚破壊。`);
          ctx.game.breakOpponentShield(self.owner);
        },
      },
    },

    24: {
      no: 24,
      name: "銀弾の双銃",
      kind: "item",
      rank: 4,
      atk: 0,
      tags: ["除霊", "拳銃"],
      titleTag: "怨霊撲滅屋GB",
      // ・自分ターンに発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。
      // ・タグ「除霊」を持つキャラクターが装備した場合、さらにATK+500し、このターンの攻撃回数を2回追加する。
      abilities: {
        onEquip: (ctx, item, target) => {
          target.bonusAtk += 500;
          ctx.log(`[No.24] 装備：ATK+500`);

          if (target.hasTag("除霊")) {
            target.bonusAtk += 500;
            target.extraAttacksThisTurn += 2;
            ctx.log(`[No.24] 追加：タグ「除霊」→さらにATK+500、攻撃回数+2（このターン）`);
          }
        },
      },
    },

    25: {
      no: 25,
      name: "小次郎&小太郎",
      kind: "character",
      rank: 5,
      atk: 2500,
      tags: ["アバター", "GAME", "兄弟"],
      titleTag: "BUGBUG西遊記",
      cannotEnterStage: true,
      kensanCost: "SEND_1_CHAR_HAND_OR_OWN_STAGE_TO_WING",
      // ・このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。
      // ・このカードが相手の効果、またはバトルでウイングに送られた時、発動できる。
      //   手札、デッキ、ウイングからrank4以下の「小太郎」「小次郎」キャラクターを2体まで見参させる。
      abilities: {
        onSentToWing: (ctx, self, reason) => {
          const byBattleOrOpponent =
            reason === "BATTLE_LOSE" ||
            reason === "BATTLE_WIN_OPPONENT_EFFECT" ||
            reason === "OPPONENT_EFFECT" ||
            reason === "BATTLE_DEFEATED" ||
            reason === "BATTLE";

          if (!byBattleOrOpponent) return;

          ctx.log(`[No.25] ウイングへ（相手効果またはバトル）→ rank4以下「小太郎」「小次郎」を2体まで見参。`);
          ctx.game.specialKensanKotaroJiro(self.owner, 2);
        },
      },
    },

    26: {
      no: 26,
      name: "ジュエリー・ルビー",
      kind: "character",
      rank: 4,
      atk: 1700,
      tags: ["美少女戦士", "アニメ", "格闘"],
      titleTag: "Ve ヴォイスエレメント",
      cannotEnterStage: true,
      // 自分ステージに「サファイア」が存在する時、手札から見参できる
      kensanCondition: (ctx) => ctx.you.stage.some((c) => c.def.no === 27),
      abilities: {
        onEnterStage: (ctx, self) => {
          // 手札1枚ウイング→デッキ・ウイングからタグ「アニメ」1枚手札へ
          ctx.game.sendFirstHandToWing(self.owner, "[No.26] 登場時コスト");
          ctx.game.searchAddToHand(self.owner, ["deck", "wing"], (def) => (def.tags || []).includes("アニメ"), "[No.26] タグ「アニメ」サーチ");
        },
        onWhileOnStageContinuous: (ctx, self) => {
          // タグ「美少女戦士」のATK+500（自身含む）
          // ※UI簡易のため、ATK計算時に参照
        },
      },
    },

    27: {
      no: 27,
      name: "ジュエリー・サファイア",
      kind: "character",
      rank: 4,
      atk: 1700,
      tags: ["美少女戦士", "アニメ", "格闘"],
      titleTag: "Ve ヴォイスエレメント",
      cannotEnterStage: true,
      kensanCondition: (ctx) => ctx.you.stage.some((c) => c.def.no === 26),
      abilities: {
        onEnterStage: (ctx, self) => {
          ctx.game.sendFirstHandToWing(self.owner, "[No.27] 登場時コスト");
          ctx.game.searchAddToHand(self.owner, ["deck", "wing"], (def) => (def.tags || []).includes("アニメ"), "[No.27] タグ「アニメ」サーチ");
        },
        onWhileOnStageContinuous: () => {},
      },
    },

    28: {
      no: 28,
      name: "セシア&アリサ",
      kind: "character",
      rank: 4,
      atk: 1500,
      tags: ["除霊", "支援", "侍女"],
      titleTag: "怨霊撲滅屋GB",
      cannotEnterStage: false,
      // ・登場時：デッキからタイトルタグ「怨霊撲滅屋GB」アイテム1枚手札へ
      // ・自分ターン：このカードが自分ステージに存在する時、手札のrank5以下「レイチェル」1体を条件無視して見参
      abilities: {
        onEnterStage: (ctx, self) => {
          ctx.game.searchAddToHand(self.owner, ["deck"], (def) => def.kind === "item" && def.titleTag === "怨霊撲滅屋GB", "[No.28] 登場時アイテムサーチ");
        },
      },
    },

    29: {
      no: 29,
      name: "狼猫-孫悟空Lv75-",
      kind: "character",
      rank: 5,
      atk: 2400,
      tags: ["アバター", "GAME", "剣士"],
      titleTag: "BUGBUG西遊記",
      cannotEnterStage: true,
      kensanCost: "SEND_1_CHAR_HAND_OR_OWN_STAGE_TO_WING",
      // ・1ターンに1度：デッキ・ウイングからタイトルタグ「BUGBUG西遊記」アイテム1枚手札へ
      abilities: {
        onOncePerTurnSearchBugbugItem: (ctx, self) => {
          const key = `${self.owner.name}:No29:searchBugbugItem`;
          if (!ctx.oncePerTurn(key)) {
            ctx.log(`[No.29] このターンは既に使用済み。`);
            return;
          }
          ctx.game.searchAddToHand(self.owner, ["deck", "wing"], (def) => def.kind === "item" && def.titleTag === "BUGBUG西遊記", "[No.29] BUGBUGアイテムサーチ(1/turn)");
        },
      },
    },

    30: {
      no: 30,
      name: "七星剣",
      kind: "item",
      rank: 4,
      atk: 0,
      tags: ["課金アイテム", "刀剣"],
      titleTag: "BUGBUG西遊記",
      // 実装（画像テキストより）
      // ・自分ターン：自分ステージのキャラ1体に装備。ATK+500
      // ・タグ「剣士」を持つキャラが装備→さらにATK+500し、自分ターンに相手ステージ全キャラへ1度ずつ攻撃できる
      abilities: {
        onEquip: (ctx, item, target) => {
          target.bonusAtk += 500;
          ctx.log(`[No.30] 装備：ATK+500`);

          if (target.hasTag("剣士")) {
            target.bonusAtk += 500;
            target.flags.canSweepAllThisTurn = true; // 全体攻撃権
            ctx.log(`[No.30] 追加：タグ「剣士」→さらにATK+500、全体攻撃（各1回）をできる（このターン）`);
          }
        },
      },
    },
  };

  function mustDef(no) {
    const d = CARD_DEFS[no];
    if (!d) throw new Error(`Card def not found: ${no}`);
    return d;
  }

  /*************************
   * Core classes
   *************************/
  class Card {
    constructor(owner, def) {
      this.id = uid();
      this.owner = owner;
      this.def = def;

      this.equippedTo = null;     // for items
      this.equipment = [];        // for characters (store item ids)

      this.bonusAtk = 0;

      this.baseAttacksPerTurn = 1;
      this.extraAttacksThisTurn = 0;
      this.attacksUsedThisTurn = 0;

      this.flags = {}; // runtime flags
    }

    hasTag(tag) {
      return (this.def.tags || []).includes(tag);
    }

    resetTurn() {
      this.extraAttacksThisTurn = 0;
      this.attacksUsedThisTurn = 0;
      this.flags.canSweepAllThisTurn = false;
    }

    getAtk(game) {
      // continuous buff: if Ruby/Sapphire exists on your stage, any 「美少女戦士」 +500
      let cont = 0;
      if (this.def.kind === "character" && this.hasTag("美少女戦士")) {
        const you = this.owner;
        const hasRuby = you.stage.some((c) => c.def.no === 26);
        const hasSapp = you.stage.some((c) => c.def.no === 27);
        if (hasRuby || hasSapp) cont += 500;
      }
      return (this.def.atk || 0) + (this.bonusAtk || 0) + cont;
    }

    canAttack() {
      const total = this.baseAttacksPerTurn + this.extraAttacksThisTurn;
      return this.attacksUsedThisTurn < total;
    }

    useAttack() {
      this.attacksUsedThisTurn += 1;
    }
  }

  class PlayerState {
    constructor(name) {
      this.name = name;
      this.deck = [];
      this.hand = [];
      this.stage = [];
      this.wing = [];
      this.shield = [];
    }
  }

  class Game {
    constructor(logFn) {
      this.turn = 1;
      this.active = 0;
      this.players = [new PlayerState("P1"), new PlayerState("P2")];

      this.log = logFn;

      this.turnFlags = {
        negatedSourceCardIds: new Set(),
        oncePerTurn: new Set(),
      };

      // UI selection
      this.selected = null; // { zone, cardId, ownerIndex }
      this.ui = null;
    }

    get you() {
      return this.players[this.active];
    }
    get opp() {
      return this.players[1 - this.active];
    }

    oncePerTurn(key) {
      if (this.turnFlags.oncePerTurn.has(key)) return false;
      this.turnFlags.oncePerTurn.add(key);
      return true;
    }

    resetTurnFlags() {
      this.turnFlags.negatedSourceCardIds.clear();
      this.turnFlags.oncePerTurn.clear();
    }

    ctxFor(player) {
      const youIndex = this.players.indexOf(player);
      const opp = this.players[1 - youIndex];
      return {
        game: this,
        you: player,
        opp,
        oncePerTurn: (k) => this.oncePerTurn(k),
        log: (...a) => this.log(...a),
      };
    }

    // --- move helpers ---
    findCardInZone(player, zoneName, cardId) {
      const z = player[zoneName];
      return z.find((c) => c.id === cardId) || null;
    }

    removeCardFromZone(player, zoneName, cardId) {
      const z = player[zoneName];
      const idx = z.findIndex((c) => c.id === cardId);
      if (idx < 0) return null;
      return z.splice(idx, 1)[0];
    }

    moveCard(playerFrom, zoneFrom, playerTo, zoneTo, card, reason) {
      // remove from from-zone if exists there
      if (zoneFrom) {
        const removed = this.removeCardFromZone(playerFrom, zoneFrom, card.id);
        if (!removed) {
          // already removed (ok)
        }
      }
      playerTo[zoneTo].push(card);
      this.log(`[MOVE] ${playerFrom.name}:${card.def.no}_${card.def.name} ${zoneFrom || "-"} -> ${zoneTo} ${reason ? `(${reason})` : ""}`);

      // triggers
      if (zoneTo === "wing" && card.def.abilities?.onSentToWing) {
        const ctx = this.ctxFor(card.owner);
        card.def.abilities.onSentToWing(ctx, card, reason);
      }
    }

    // --- basic flow ---
    startGame() {
      this.turn = 1;
      this.active = 0;
      this.resetTurnFlags();

      // reset per-card runtime
      for (const p of this.players) {
        for (const z of ["deck", "hand", "stage", "wing", "shield"]) {
          for (const c of p[z]) {
            c.bonusAtk = 0;
            c.equipment = [];
            c.equippedTo = null;
            c.flags = {};
            c.resetTurn?.();
          }
        }
      }

      this.log("=== GAME START ===");
      this.startTurn();
    }

    startTurn() {
      const p = this.you;
      this.log(`=== TURN ${this.turn} START: ${p.name} ===`);

      // reset stage cards turn state
      for (const c of p.stage) c.resetTurn?.();

      // draw 1
      this.draw(p, 1);
    }

    endTurn() {
      this.log(`=== TURN ${this.turn} END ===`);
      this.resetTurnFlags();

      this.turn += 1;
      this.active = 1 - this.active;

      this.startTurn();
    }

    draw(player, n) {
      for (let i = 0; i < n; i++) {
        const card = player.deck.shift();
        if (!card) {
          this.log(`[DRAW] deck empty`);
          return;
        }
        player.hand.push(card);
        this.log(`[DRAW] +1 (${card.def.no}_${card.def.name})`);
      }
    }

    // --- rule helpers required by cards ---
    hasStageSlot(player) {
      const chars = player.stage.filter((c) => c.def.kind === "character").length;
      return chars < 3;
    }

    sendFirstHandToWing(player, reason) {
      const c = player.hand.shift();
      if (!c) {
        this.log(`${reason}：手札がないためスキップ`);
        return false;
      }
      this.moveCard(player, "hand", player, "wing", c, reason);
      return true;
    }

    searchAddToHand(player, zones, pred, reason) {
      for (const z of zones) {
        const idx = player[z].findIndex((c) => pred(c.def));
        if (idx >= 0) {
          const c = player[z].splice(idx, 1)[0];
          player.hand.push(c);
          this.log(`${reason}：手札に加えた → ${c.def.no}_${c.def.name}`);
          return true;
        }
      }
      this.log(`${reason}：該当なし`);
      return false;
    }

    breakOpponentShield(attackerOwner) {
      const opp = this.players[1 - this.players.indexOf(attackerOwner)];
      const s = opp.shield.pop();
      if (!s) {
        this.log(`[INFO] 相手シールドがない`);
        return false;
      }
      this.moveCard(opp, "shield", opp, "wing", s, "SHIELD_BREAK");
      return true;
    }

    specialKensanKotaroJiro(player, maxCount) {
      // rank4以下「小太郎」「小次郎」 from hand/deck/wing up to maxCount -> stage (if slot) else hand
      const names = new Set(["小太郎", "小次郎"]);
      const isTarget = (c) => c.def.kind === "character" && (c.def.rank || 0) <= 4 && names.has(c.def.name);

      let done = 0;
      const zones = ["hand", "deck", "wing"];
      for (const z of zones) {
        for (let i = 0; i < player[z].length && done < maxCount; i++) {
          const c = player[z][i];
          if (!isTarget(c)) continue;

          player[z].splice(i, 1);
          i--;

          if (this.hasStageSlot(player)) {
            player.stage.push(c);
            this.log(`[No.25] 見参：${c.def.no}_${c.def.name}`);
            this.onEnterStage(c);
          } else {
            player.hand.push(c);
            this.log(`[No.25] ステージ満杯→手札へ：${c.def.no}_${c.def.name}`);
          }

          done++;
        }
      }
      if (done === 0) this.log(`[No.25] 対象が見つからない`);
    }

    // --- Enter stage trigger ---
    onEnterStage(card) {
      const def = card.def;
      if (def.abilities?.onEnterStage) {
        const ctx = this.ctxFor(card.owner);
        def.abilities.onEnterStage(ctx, card);
      }
    }

    // --- No.22 reaction pipeline (only for two effect types used here) ---
    tryReactMarimo(defenderPlayer, attackerSourceCard, effectType) {
      const trigger = effectType === "SEARCH_ADD_TO_HAND" || effectType === "SEARCH_LOOK_AT_CHARACTER";
      if (!trigger) return;

      const marimo = defenderPlayer.hand.find((c) => c.def.no === 22);
      if (!marimo) return;

      this.log(`[REACT] ${defenderPlayer.name}：No.22を手札→ウイング（相手カード効果をこのターン無効）`);
      this.moveCard(defenderPlayer, "hand", defenderPlayer, "wing", marimo, "No22_REACT");
      this.turnFlags.negatedSourceCardIds.add(attackerSourceCard.id);
    }

    activateEffect(player, sourceCard, effectType, payload) {
      const opponent = this.players[1 - this.players.indexOf(player)];
      this.log(`[EFFECT] ${player.name} activates ${effectType} from ${sourceCard.def.no}_${sourceCard.def.name}`);

      // reaction
      this.tryReactMarimo(opponent, sourceCard, effectType);

      // negated?
      if (this.turnFlags.negatedSourceCardIds.has(sourceCard.id)) {
        this.log(`[NEGATED] このターン、そのカードの効果は全て無効。`);
        return;
      }

      // resolve
      if (effectType === "SEARCH_ADD_TO_HAND") {
        this.searchAddToHand(player, ["deck"], payload.query, "[EFFECT] サーチ");
      } else if (effectType === "SEARCH_LOOK_AT_CHARACTER") {
        // simplified: just log top matching
        const found = player.deck.filter((c) => payload.query(c.def)).slice(0, payload.count || 1);
        this.log(`[LOOK] ${found.map((c) => `${c.def.no}_${c.def.name}`).join(", ") || "(none)"}`);
      } else {
        this.log(`[WARN] unknown effectType`);
      }
    }

    /*************************
     * Actions exposed to UI
     *************************/
    action_kensanSelected() {
      const sel = this.selectedResolved();
      if (!sel) return;

      const { player, zone, card } = sel;
      if (player !== this.you) {
        this.log(`[FAIL] 自分のカードのみ操作できます。`);
        return;
      }
      if (zone !== "hand") {
        this.log(`[FAIL] 手札のカードを選択してください。`);
        return;
      }
      if (card.def.kind !== "character") {
        this.log(`[FAIL] 見参はキャラクターのみです。`);
        return;
      }
      if (!this.hasStageSlot(player)) {
        this.log(`[FAIL] ステージが満杯です。`);
        return;
      }

      const def = card.def;
      const ctx = this.ctxFor(player);

      // cannotEnterStage => needs cost or condition
      if (def.cannotEnterStage) {
        // special condition-based (Ruby/Sapphire)
        if (typeof def.kensanCondition === "function") {
          if (!def.kensanCondition(ctx)) {
            this.log(`[FAIL] 条件を満たしていないため見参できません。`);
            return;
          }
        }

        // cost-based
        if (def.kensanCost === "SEND_1_CHAR_HAND_OR_OWN_STAGE_TO_WING") {
          const ok = this.payCost_send1CharHandOrOwnStageToWing(player, card.id);
          if (!ok) {
            this.log(`[FAIL] コストを払えないため見参できません。`);
            return;
          }
        }
      }

      // move hand -> stage
      this.moveCard(player, "hand", player, "stage", card, "KENSAN");
      this.onEnterStage(card);
      this.render();
    }

    payCost_send1CharHandOrOwnStageToWing(player, excludeCardId) {
      // choose: first other char in hand else first char on stage
      const fromHand = player.hand.find((c) => c.def.kind === "character" && c.id !== excludeCardId);
      const fromStage = player.stage.find((c) => c.def.kind === "character" && c.id !== excludeCardId);
      const sac = fromHand || fromStage;
      if (!sac) return false;

      const zone = fromHand ? "hand" : "stage";
      this.moveCard(player, zone, player, "wing", sac, "COST");
      return true;
    }

    action_equipSelectedToFirstStageChar() {
      const sel = this.selectedResolved();
      if (!sel) return;

      const { player, zone, card } = sel;
      if (player !== this.you) return this.log(`[FAIL] 自分のカードのみ操作できます。`);
      if (zone !== "hand") return this.log(`[FAIL] 手札のアイテムを選択してください。`);
      if (card.def.kind !== "item") return this.log(`[FAIL] アイテムを選択してください。`);
      const target = this.you.stage.find((c) => c.def.kind === "character");
      if (!target) return this.log(`[FAIL] 装備先のキャラがステージにいません。`);

      // move to stage as equipped
      this.moveCard(this.you, "hand", this.you, "stage", card, `EQUIP->${target.def.no}`);
      card.equippedTo = target.id;
      target.equipment.push(card.id);

      // trigger item equip effect
      const ctx = this.ctxFor(this.you);
      card.def.abilities?.onEquip?.(ctx, card, target);

      this.render();
    }

    action_battleSelected() {
      // simplified battle: selected must be your stage character, target is first opponent stage character
      const sel = this.selectedResolved();
      if (!sel) return;

      const { player, zone, card } = sel;
      if (player !== this.you) return this.log(`[FAIL] 自分のキャラを選択してください。`);
      if (zone !== "stage") return this.log(`[FAIL] ステージのキャラを選択してください。`);
      if (card.def.kind !== "character") return this.log(`[FAIL] キャラを選択してください。`);

      const attacker = card;
      const defender = this.opp.stage.find((c) => c.def.kind === "character");
      if (!defender) return this.log(`[FAIL] 相手ステージにキャラがいません。`);

      // attacker attacks left?
      if (!attacker.canAttack()) return this.log(`[FAIL] このターンの攻撃回数が残っていません。`);

      // If attacker has sweep ability (No.30 on 剣士), we still do single in this button.
      attacker.useAttack();

      const atk = attacker.getAtk(this);
      const defAtk = defender.getAtk(this);
      this.log(`[BATTLE] ${this.you.name} ${attacker.def.no}_${attacker.def.name}(${atk}) vs ${this.opp.name} ${defender.def.no}_${defender.def.name}(${defAtk})`);

      if (atk >= defAtk) {
        // defender destroyed - BUT check No.21 prevention if defender is No.21
        const prevented = this.checkPreventDestroyByBattle(defender);
        if (prevented) {
          this.log(`[BATTLE] 破壊が防がれたため、相手は場に残る。`);
          this.render();
          return;
        }

        this.moveCard(this.opp, "stage", this.opp, "wing", defender, "BATTLE_DEFEATED");
        // No.23 shield break trigger
        if (attacker.def.no === 23 && attacker.def.abilities?.onAfterWinBattleAndSendOpponentToWing) {
          const ctx = this.ctxFor(attacker.owner);
          attacker.def.abilities.onAfterWinBattleAndSendOpponentToWing(ctx, attacker);
        }
      } else {
        // attacker destroyed - check No.21 prevention
        const prevented = this.checkPreventDestroyByBattle(attacker);
        if (prevented) {
          this.log(`[BATTLE] 破壊が防がれたため、自分は場に残る。`);
          this.render();
          return;
        }

        this.moveCard(this.you, "stage", this.you, "wing", attacker, "BATTLE_LOSE");
      }

      this.render();
    }

    checkPreventDestroyByBattle(target) {
      if (target.def.no !== 21) return false;
      const ctx = this.ctxFor(target.owner);
      const res = target.def.abilities?.onBeforeDestroyedByBattle?.(ctx, target);
      return !!res?.prevent;
    }

    action_28_ignoreKensanRachel() {
      // button: while No.28 exists on your stage, kensan No.23 from hand ignoring conditions
      const has28 = this.you.stage.some((c) => c.def.no === 28);
      if (!has28) return this.log(`[FAIL] No.28がステージにいません。`);

      const rachel = this.you.hand.find((c) => c.def.no === 23 && c.def.rank <= 5);
      if (!rachel) return this.log(`[FAIL] 手札にNo.23がいません。`);

      if (!this.hasStageSlot(this.you)) return this.log(`[FAIL] ステージが満杯です。`);

      // ignore conditions: move without cost/condition
      this.moveCard(this.you, "hand", this.you, "stage", rachel, "No28_IGNORE_KENSAN");
      this.onEnterStage(rachel);
      this.log(`[No.28] 条件無視でNo.23を見参。`);
      this.render();
    }

    action_29_searchBugbugItem() {
      const wolf = this.you.stage.find((c) => c.def.no === 29);
      if (!wolf) return this.log(`[FAIL] No.29がステージにいません。`);

      const ctx = this.ctxFor(this.you);
      wolf.def.abilities?.onOncePerTurnSearchBugbugItem?.(ctx, wolf);
      this.render();
    }

    action_21_stopDirectAttack_test() {
      // Test button: simulate direct attack incoming while your shield is 0; allow No.21 from hand to appear and stop it.
      if (this.you.shield.length !== 0) return this.log(`[FAIL] 自分シールドが0枚の時のみ（テスト）。`);

      const miiko = this.you.hand.find((c) => c.def.no === 21);
      if (!miiko) return this.log(`[FAIL] 手札にNo.21がいません。`);

      // Kensan from hand (no extra cost)
      if (!this.hasStageSlot(this.you)) return this.log(`[FAIL] ステージが満杯です。`);

      const ctx = this.ctxFor(this.you);
      const ok = miiko.def.abilities?.onDirectAttackIncomingWhenYourShieldZero?.(ctx, miiko);
      if (!ok) return this.log(`[FAIL] No.21の条件を満たしません。`);

      this.moveCard(this.you, "hand", this.you, "stage", miiko, "No21_DIRECT_ATTACK_STOP");
      this.onEnterStage(miiko);

      this.log(`[No.21] 攻撃を無効。バトル終了（テスト扱い）。`);
      this.render();
    }

    action_30_sweepAll() {
      // If you have a stage character with No.30 equipped AND that character has canSweepAllThisTurn,
      // attack all opponent stage characters once each.
      const sweeper = this.you.stage.find((c) => c.def.kind === "character" && c.flags.canSweepAllThisTurn);
      if (!sweeper) return this.log(`[FAIL] 七星剣(30)の全体攻撃条件を満たすキャラがいません（剣士に装備が必要）。`);

      const enemies = this.opp.stage.filter((c) => c.def.kind === "character");
      if (enemies.length === 0) return this.log(`[FAIL] 相手ステージにキャラがいません。`);

      // one attack per enemy (as effect); doesn't consume normal attack counts here for simplicity
      this.log(`[No.30] 全体攻撃：相手ステージ全キャラに1度ずつ攻撃。`);

      for (const defender of [...enemies]) {
        const atk = sweeper.getAtk(this);
        const defAtk = defender.getAtk(this);
        this.log(` - vs ${defender.def.no}_${defender.def.name} (${atk} vs ${defAtk})`);

        if (atk >= defAtk) {
          const prevented = this.checkPreventDestroyByBattle(defender);
          if (prevented) {
            this.log(`   -> No.21により破壊防止`);
            continue;
          }
          this.moveCard(this.opp, "stage", this.opp, "wing", defender, "No30_SWEEP");
          if (sweeper.def.no === 23 && sweeper.def.abilities?.onAfterWinBattleAndSendOpponentToWing) {
            const ctx = this.ctxFor(sweeper.owner);
            sweeper.def.abilities.onAfterWinBattleAndSendOpponentToWing(ctx, sweeper);
          }
        } else {
          this.log(`   -> 相手が耐えた`);
        }
      }

      this.render();
    }

    selectedResolved() {
      if (!this.selected) return null;
      const p = this.players[this.selected.ownerIndex];
      const card = this.findCardInZone(p, this.selected.zone, this.selected.cardId);
      if (!card) return null;
      return { player: p, zone: this.selected.zone, card };
    }

    /*************************
     * UI
     *************************/
    mountUI() {
      if ($("#mw_test_root")) return;

      const style = document.createElement("style");
      style.textContent = `
        #mw_test_root{
          position:fixed; inset:0; z-index:999999;
          display:flex; justify-content:center; align-items:flex-start;
          padding:12px; overflow:auto;
          -webkit-overflow-scrolling:touch;
          background:rgba(0,0,0,.35);
          font-family: system-ui, -apple-system, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif;
        }
        #mw_test_card{
          width:min(780px, 100%);
          border-radius:16px;
          background:rgba(18,18,22,.92);
          color:#fff;
          box-shadow:0 10px 30px rgba(0,0,0,.35);
          padding:12px;
          backdrop-filter: blur(10px);
        }
        #mw_test_header{
          display:flex; align-items:center; justify-content:space-between;
          gap:8px;
          margin-bottom:8px;
        }
        #mw_test_title{
          font-size:18px; font-weight:800;
          letter-spacing:.2px;
        }
        #mw_test_sub{
          font-size:12px; opacity:.8;
        }
        #mw_test_close{
          border:0; background:rgba(255,255,255,.12);
          color:#fff; padding:8px 12px; border-radius:12px;
          font-size:14px;
        }
        #mw_test_body{
          display:grid; grid-template-columns: 1fr;
          gap:10px;
        }
        .mw_box{
          border-radius:14px;
          background:rgba(255,255,255,.06);
          padding:10px;
        }
        .mw_row{
          display:flex; gap:8px; flex-wrap:wrap;
        }
        .mw_btn{
          border:0;
          background:rgba(255,255,255,.10);
          color:#fff;
          padding:10px 12px;
          border-radius:12px;
          font-size:14px;
          white-space:nowrap;
        }
        .mw_btn:active{ transform: translateY(1px); }
        .mw_btn_primary{
          background:rgba(76, 201, 240, .20);
          outline: 1px solid rgba(76,201,240,.25);
        }
        .mw_hint{
          font-size:12px; opacity:.8; line-height:1.4;
        }
        .mw_zone_title{
          font-size:13px; font-weight:800; margin:0 0 8px 0;
        }
        .mw_cards{
          display:flex; flex-direction:column; gap:8px;
        }
        .mw_card{
          border-radius:12px;
          background:rgba(255,255,255,.08);
          padding:10px;
          outline: 1px solid rgba(255,255,255,.06);
        }
        .mw_card_selected{
          outline: 2px solid rgba(76,201,240,.9);
          background:rgba(76,201,240,.12);
        }
        .mw_card_title{
          font-size:16px; font-weight:800;
          margin-bottom:4px;
        }
        .mw_card_meta{
          font-size:12px; opacity:.85;
        }
        #mw_log{
          white-space:pre-wrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
          font-size:12px;
          line-height:1.35;
          max-height:40vh;
          overflow:auto;
          -webkit-overflow-scrolling:touch;
          background:rgba(0,0,0,.25);
          border-radius:12px;
          padding:10px;
        }
      `;
      document.head.appendChild(style);

      const root = document.createElement("div");
      root.id = "mw_test_root";
      root.innerHTML = `
        <div id="mw_test_card">
          <div id="mw_test_header">
            <div>
              <div id="mw_test_title">Manpuku World Test (Cards 21-30)</div>
              <div id="mw_test_sub">global: window.ManpukuWorldTest</div>
            </div>
            <button id="mw_test_close">×</button>
          </div>

          <div class="mw_box mw_hint">
            <div style="font-weight:800; margin-bottom:6px;">操作</div>
            ① 手札/ステージのカードをタップして選択 → ② 下のボタンで実行<br>
            （選べていないと [FAIL] が出ます）<br>
            ※ 最初のSTARTはこのJSが自動で補修し、押した瞬間にゲームを開始します。
          </div>

          <div id="mw_test_body">
            <div class="mw_box">
              <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;">
                <div>
                  <div style="font-size:16px;font-weight:900;">あなた（<span id="mw_you_name">P1</span>）</div>
                  <div class="mw_hint">TURN: <span id="mw_turn">1</span> / 手番: <span id="mw_active">P1</span></div>
                </div>
                <div class="mw_hint">選択: <span id="mw_selected">なし</span></div>
              </div>
            </div>

            <div class="mw_box">
              <div class="mw_zone_title">手札（タップして選択）</div>
              <div id="mw_hand" class="mw_cards"></div>
            </div>

            <div class="mw_box">
              <div class="mw_zone_title">ステージ（タップして選択）</div>
              <div id="mw_stage" class="mw_cards"></div>
            </div>

            <div class="mw_box">
              <div class="mw_zone_title">操作ボタン</div>
              <div class="mw_row">
                <button class="mw_btn mw_btn_primary" id="mw_btn_start">Start</button>
                <button class="mw_btn" id="mw_btn_endturn">End Turn</button>
                <button class="mw_btn" id="mw_btn_draw">Draw +1</button>
              </div>
              <div class="mw_row" style="margin-top:8px;">
                <button class="mw_btn" id="mw_btn_kensan">見参（手札選択）</button>
                <button class="mw_btn" id="mw_btn_equip">装備（手札アイテム→自分ステージ）</button>
                <button class="mw_btn" id="mw_btn_battle">バトル（自→相手）</button>
              </div>
              <div class="mw_row" style="margin-top:8px;">
                <button class="mw_btn" id="mw_btn_28">28効果：23を条件無視で見参</button>
                <button class="mw_btn" id="mw_btn_29">29効果：BUGBUGアイテムサーチ(1/turn)</button>
              </div>
              <div class="mw_row" style="margin-top:8px;">
                <button class="mw_btn" id="mw_btn_21">（テスト）直接攻撃→21で止める</button>
                <button class="mw_btn" id="mw_btn_30">30効果：全体攻撃（剣士+七星剣）</button>
              </div>
            </div>

            <div class="mw_box">
              <div class="mw_zone_title">ログ</div>
              <div id="mw_log"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(root);

      $("#mw_test_close").addEventListener("click", () => {
        root.remove();
      });

      // Buttons
      $("#mw_btn_start").addEventListener("click", () => {
        this.startGame();
        this.render();
      });
      $("#mw_btn_endturn").addEventListener("click", () => {
        this.endTurn();
        this.render();
      });
      $("#mw_btn_draw").addEventListener("click", () => {
        this.draw(this.you, 1);
        this.render();
      });
      $("#mw_btn_kensan").addEventListener("click", () => this.action_kensanSelected());
      $("#mw_btn_equip").addEventListener("click", () => this.action_equipSelectedToFirstStageChar());
      $("#mw_btn_battle").addEventListener("click", () => this.action_battleSelected());
      $("#mw_btn_28").addEventListener("click", () => this.action_28_ignoreKensanRachel());
      $("#mw_btn_29").addEventListener("click", () => this.action_29_searchBugbugItem());
      $("#mw_btn_21").addEventListener("click", () => this.action_21_stopDirectAttack_test());
      $("#mw_btn_30").addEventListener("click", () => this.action_30_sweepAll());

      this.ui = {
        root,
        hand: $("#mw_hand"),
        stage: $("#mw_stage"),
        log: $("#mw_log"),
        youName: $("#mw_you_name"),
        turn: $("#mw_turn"),
        active: $("#mw_active"),
        selected: $("#mw_selected"),
      };

      this.render();
      this.log("UI mounted. Tap Start to begin.");
    }

    render() {
      if (!this.ui) return;
      const you = this.you;

      this.ui.youName.textContent = you.name;
      this.ui.turn.textContent = String(this.turn);
      this.ui.active.textContent = this.you.name;

      const sel = this.selectedResolved();
      this.ui.selected.textContent = sel ? `${sel.card.def.no}_${sel.card.def.name} (${sel.zone})` : "なし";

      // Hand
      this.ui.hand.innerHTML = "";
      you.hand.forEach((c) => {
        const el = this.makeCardRow(you, "hand", c);
        this.ui.hand.appendChild(el);
      });

      // Stage (only your stage displayed for selection; opponent stage is used internally)
      this.ui.stage.innerHTML = "";
      you.stage.forEach((c) => {
        const el = this.makeCardRow(you, "stage", c);
        this.ui.stage.appendChild(el);
      });

      // Log
      this.ui.log.textContent = this._logLines.join("\n");
      this.ui.log.scrollTop = this.ui.log.scrollHeight;
    }

    makeCardRow(player, zone, card) {
      const isSel = this.selected && this.selected.cardId === card.id && this.selected.zone === zone && this.selected.ownerIndex === this.players.indexOf(player);

      const el = document.createElement("div");
      el.className = `mw_card ${isSel ? "mw_card_selected" : ""}`;

      const atkStr = card.def.kind === "character" ? ` ATK:${card.getAtk(this)}` : "";
      const meta = [
        `kind:${card.def.kind}`,
        card.def.rank != null ? `rank:${card.def.rank}` : `rank:-`,
        `タイトルタグ:${card.def.titleTag || "-"}`,
      ].join(" / ");

      el.innerHTML = `
        <div class="mw_card_title">${card.def.no}_${card.def.name}${atkStr}</div>
        <div class="mw_card_meta">${meta}</div>
      `;

      el.addEventListener("click", () => {
        this.selected = { ownerIndex: this.players.indexOf(player), zone, cardId: card.id };
        this.render();
      });

      return el;
    }

    // --- log buffer ---
    _logLines = [];
    log(...args) {
      const line = args.map((a) => safeText(a)).join(" ");
      this._logLines.push(line);
      // cap
      if (this._logLines.length > 220) this._logLines.splice(0, this._logLines.length - 220);
      if (this.ui) this.render();
    }
  }

  /*************************
   * Build a simple test deck
   *************************/
  function makeCard(player, no) {
    const def = mustDef(no);
    return new Card(player, def);
  }

  function setupGame(game) {
    const p1 = game.players[0];
    const p2 = game.players[1];

    // shields
    for (let i = 0; i < 3; i++) {
      const dummyDef = { no: 900 + i, name: `シールド${i + 1}`, kind: "item", rank: 0, atk: 0, tags: [], titleTag: "-" };
      p1.shield.push(new Card(p1, dummyDef));
      p2.shield.push(new Card(p2, dummyDef));
    }

    // Add a few fillers
    const animeFillerDef = { no: 701, name: "アニメ汎用カード", kind: "item", rank: 1, atk: 0, tags: ["アニメ"], titleTag: "Ve ヴォイスエレメント" };
    const bugbugItemDef = { no: 702, name: "BUGBUG汎用アイテム", kind: "item", rank: 1, atk: 0, tags: [], titleTag: "BUGBUG西遊記" };
    const oppCharDef = { no: 703, name: "相手の汎用札", kind: "character", rank: 3, atk: 1200, tags: ["怨霊"], titleTag: "-" };

    // decks
    p1.deck.push(
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
    );

    p2.deck.push(
      makeCard(p2, 22),
      makeCard(p2, 29),
      new Card(p2, oppCharDef),
      new Card(p2, oppCharDef),
    );

    // shuffle
    p1.deck.sort(() => Math.random() - 0.5);
    p2.deck.sort(() => Math.random() - 0.5);

    // opening draw
    for (let i = 0; i < 5; i++) {
      if (p1.deck.length) p1.hand.push(p1.deck.shift());
      if (p2.deck.length) p2.hand.push(p2.deck.shift());
    }

    // Put an enemy character on opponent stage for quick battle test
    if (p2.hand.length) {
      const firstEnemyChar = p2.hand.find((c) => c.def.kind === "character");
      if (firstEnemyChar) {
        p2.hand.splice(p2.hand.indexOf(firstEnemyChar), 1);
        p2.stage.push(firstEnemyChar);
      }
    }
  }

  /*************************
   * START button auto-fix for iOS Safari
   *************************/
  async function hookLandingStartButton(startFn) {
    // The site has a landing START button.
    // We robustly bind:
    // - any button whose innerText includes "START"
    // - any element with id containing "start"
    // - also allow tapping the title area if button is blocked
    const bind = (el) => {
      if (!el) return false;
      if (el.__mwBound) return true;
      el.__mwBound = true;

      // Make sure it can receive taps
      try {
        el.style.pointerEvents = "auto";
        el.style.touchAction = "manipulation";
        el.style.webkitTapHighlightColor = "rgba(0,0,0,0)";
      } catch (_) {}

      const handler = (e) => {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
        startFn();
      };

      // iOS Safari sometimes ignores click if only click is used; bind both.
      el.addEventListener("click", handler, { passive: false });
      el.addEventListener("touchend", handler, { passive: false });

      return true;
    };

    // Try a few times (SPA rendering delay)
    for (let i = 0; i < 40; i++) {
      const btnByText = $$("button").find((b) => safeText(b.textContent).trim().toUpperCase() === "START");
      const btnById = $$("[id]").find((x) => safeText(x.id).toLowerCase().includes("start"));
      const candidates = [btnByText, btnById].filter(Boolean);

      let ok = false;
      for (const el of candidates) ok = bind(el) || ok;

      // also bind tap on the title box as fallback
      const title = $$("*").find((x) => safeText(x.textContent).includes("Manpuku World") && x.getBoundingClientRect().height < 200);
      if (title) ok = bind(title) || ok;

      if (ok) return true;
      await sleep(100);
    }
    return false;
  }

  /*************************
   * Boot
   *************************/
  function boot() {
    const game = new Game((...a) => game.log(...a));
    setupGame(game);

    const startUI = () => {
      game.mountUI();
      // auto start game immediately after UI open (so "Start押せない"を根絶)
      game.startGame();
      game.render();
    };

    // Expose global (for your debug if needed, but not required)
    window.ManpukuWorldTest = {
      start: startUI,
      reset: () => {
        // rebuild
        const root = $("#mw_test_root");
        if (root) root.remove();

        const g2 = new Game((...a) => g2.log(...a));
        setupGame(g2);

        // replace
        window.ManpukuWorldTest._game = g2;
        g2.mountUI();
        g2.startGame();
        g2.render();
      },
      _game: game,
    };

    // Hook landing START so it always starts
    hookLandingStartButton(startUI);

    // Also: if landing START is blocked, user can tap anywhere to start (failsafe)
    // But we do not force auto-start without user gesture (iOS audio/tap restrictions).
    document.addEventListener(
      "touchend",
      (e) => {
        // if already mounted, ignore
        if ($("#mw_test_root")) return;
        // If the user taps near the START area, start.
        const t = e.target;
        if (!t) return;
        const text = safeText(t.textContent).toUpperCase();
        if (text.includes("START") || text.includes("MANPUKU WORLD")) {
          startUI();
        }
      },
      { passive: true }
    );
  }

  // Ensure boot after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();