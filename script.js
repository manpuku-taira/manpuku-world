/* Manpuku World - Cards 21-30 Browser Test Engine (Single JS, iOS friendly)
 * - UI hotfix: iOS Safari safe-area supported, controls always visible
 * - Exposes: window.ManpukuWorldTest
 */
(function () {
  "use strict";

  const GLOBAL_NAME = "ManpukuWorldTest";

  const uid = (() => {
    let n = 1;
    return () => `c_${String(n++).padStart(4, "0")}`;
  })();

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  /** -----------------------------
   * UI
   * ----------------------------- */
  const UI = {
    root: null,
    logEl: null,
    stateEl: null,
    controlsEl: null,
    helpEl: null,
    selected: { handCardId: null, stageCardId: null, opponentStageCardId: null },
    logLines: [],
    maxLog: 300,
    mounted: false,

    mount() {
      if (this.mounted) return;
      this.mounted = true;

      const root = document.createElement("div");
      root.id = "mw_test_root";

      // iOS safe-area: bottom uses env(safe-area-inset-bottom)
      root.style.position = "fixed";
      root.style.right = "10px";
      root.style.bottom = "calc(10px + env(safe-area-inset-bottom))";
      root.style.width = "min(440px, calc(100vw - 20px))";
      root.style.maxHeight = "calc(100vh - 20px - env(safe-area-inset-bottom) - env(safe-area-inset-top))";
      root.style.overflow = "hidden";
      root.style.zIndex = "999999";
      root.style.borderRadius = "14px";
      root.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)";
      root.style.background = "rgba(20,20,22,.92)";
      root.style.color = "#fff";
      root.style.fontFamily =
        "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Hiragino Sans','Noto Sans JP',sans-serif";
      root.style.fontSize = "13px";
      root.style.backdropFilter = "blur(10px)";

      const header = document.createElement("div");
      header.style.padding = "10px 12px";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.borderBottom = "1px solid rgba(255,255,255,.12)";

      const left = document.createElement("div");
      const title = document.createElement("div");
      title.textContent = "Manpuku World Test (Cards 21-30)";
      title.style.fontWeight = "800";
      title.style.fontSize = "13px";

      const small = document.createElement("div");
      small.textContent = `global: window.${GLOBAL_NAME}`;
      small.style.opacity = "0.7";
      small.style.fontSize = "11px";

      left.appendChild(title);
      left.appendChild(small);

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "×";
      closeBtn.style.width = "32px";
      closeBtn.style.height = "32px";
      closeBtn.style.borderRadius = "10px";
      closeBtn.style.border = "1px solid rgba(255,255,255,.2)";
      closeBtn.style.background = "rgba(255,255,255,.08)";
      closeBtn.style.color = "#fff";
      closeBtn.style.fontSize = "18px";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.touchAction = "manipulation";
      closeBtn.addEventListener("click", () => {
        root.remove();
        this.mounted = false;
      });

      header.appendChild(left);
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.style.display = "grid";
      // Controls ALWAYS visible at bottom (sticky-like layout)
      body.style.gridTemplateRows = "auto auto 1fr";
      body.style.gap = "8px";
      body.style.padding = "10px 12px";
      body.style.height = "100%";
      body.style.boxSizing = "border-box";

      const helpEl = document.createElement("div");
      helpEl.style.padding = "8px";
      helpEl.style.borderRadius = "10px";
      helpEl.style.border = "1px solid rgba(255,255,255,.12)";
      helpEl.style.background = "rgba(255,255,255,.06)";
      helpEl.style.fontSize = "12px";
      helpEl.style.opacity = "0.92";
      helpEl.innerHTML =
        `<div style="font-weight:800;margin-bottom:4px">操作</div>
         <div>① 手札/ステージのカードを<strong>タップして選択</strong> → ② 下のボタンで実行</div>
         <div style="opacity:.85">（選べていないと [FAIL] が出ます）</div>`;

      const stateEl = document.createElement("div");
      stateEl.style.padding = "8px";
      stateEl.style.borderRadius = "10px";
      stateEl.style.border = "1px solid rgba(255,255,255,.12)";
      stateEl.style.background = "rgba(255,255,255,.06)";
      stateEl.style.maxHeight = "260px";
      stateEl.style.overflow = "auto";

      const logEl = document.createElement("div");
      logEl.style.padding = "8px";
      logEl.style.borderRadius = "10px";
      logEl.style.border = "1px solid rgba(255,255,255,.12)";
      logEl.style.background = "rgba(0,0,0,.25)";
      logEl.style.overflow = "auto";
      logEl.style.whiteSpace = "pre-wrap";
      logEl.style.lineHeight = "1.25";
      logEl.style.minHeight = "140px";

      const controlsWrap = document.createElement("div");
      controlsWrap.style.position = "sticky";
      controlsWrap.style.bottom = "0";
      controlsWrap.style.paddingBottom = "calc(6px + env(safe-area-inset-bottom))";
      controlsWrap.style.background = "linear-gradient(to top, rgba(20,20,22,.95), rgba(20,20,22,.25))";
      controlsWrap.style.borderRadius = "12px";

      const controlsEl = document.createElement("div");
      controlsEl.style.display = "flex";
      controlsEl.style.flexWrap = "wrap";
      controlsEl.style.gap = "6px";
      controlsEl.style.padding = "8px";
      controlsEl.style.borderRadius = "12px";
      controlsEl.style.border = "1px solid rgba(255,255,255,.12)";
      controlsEl.style.background = "rgba(255,255,255,.05)";

      controlsWrap.appendChild(controlsEl);

      body.appendChild(helpEl);
      body.appendChild(stateEl);
      body.appendChild(logEl);
      body.appendChild(controlsWrap);

      root.appendChild(header);
      root.appendChild(body);
      document.body.appendChild(root);

      this.root = root;
      this.logEl = logEl;
      this.stateEl = stateEl;
      this.controlsEl = controlsEl;
      this.helpEl = helpEl;

      this.log("UI mounted. Tap Start to begin.");
    },

    btn(label, onClick) {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.padding = "10px 12px";
      b.style.borderRadius = "10px";
      b.style.border = "1px solid rgba(255,255,255,.16)";
      b.style.background = "rgba(255,255,255,.08)";
      b.style.color = "#fff";
      b.style.cursor = "pointer";
      b.style.touchAction = "manipulation";
      b.style.fontWeight = "700";
      b.addEventListener("click", onClick);
      return b;
    },

    setControls(buttons) {
      if (!this.controlsEl) return;
      this.controlsEl.innerHTML = "";
      buttons.forEach((b) => this.controlsEl.appendChild(b));
    },

    log(msg) {
      this.logLines.push(String(msg));
      if (this.logLines.length > this.maxLog) {
        this.logLines.splice(0, this.logLines.length - this.maxLog);
      }
      if (this.logEl) {
        this.logEl.textContent = this.logLines.join("\n");
        this.logEl.scrollTop = this.logEl.scrollHeight;
      }
    },

    setState(html) {
      if (!this.stateEl) return;
      this.stateEl.innerHTML = html;
    },

    escape(s) {
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    },
  };

  /** -----------------------------
   * Core
   * ----------------------------- */
  class Card {
    constructor(owner, def) {
      this.id = uid();
      this.owner = owner;
      this.def = def;

      this.equippedTo = null;
      this.equipment = [];
      this.bonusAtk = 0;

      this.baseAttacksPerTurn = 1;
      this.extraAttacksThisTurn = 0;
      this.attacksUsedThisTurn = 0;

      this.sweepTargetsThisTurn = new Set();
      this.sweepEnabledThisTurn = false;
    }
    isCharacter() { return this.def.kind === "character"; }
    isItem() { return this.def.kind === "item"; }
    hasTag(tag) { return (this.def.tags || []).includes(tag); }
    getAtk() { return (this.def.atk || 0) + (this.bonusAtk || 0); }
    resetTurnState() {
      this.attacksUsedThisTurn = 0;
      this.extraAttacksThisTurn = 0;
      this.sweepTargetsThisTurn.clear();
      this.sweepEnabledThisTurn = false;
    }
    canAttackNormally() {
      const total = this.baseAttacksPerTurn + this.extraAttacksThisTurn;
      return this.attacksUsedThisTurn < total;
    }
    consumeNormalAttack() { this.attacksUsedThisTurn += 1; }
  }

  class Player {
    constructor(name) {
      this.name = name;
      this.zones = { deck: [], hand: [], stage: [], wing: [], shield: [] };
      this.flags = { miikoPreventOnceUsedTurn: -1 };
    }
    draw(n = 1) {
      for (let i = 0; i < n; i++) {
        const c = this.zones.deck.shift();
        if (!c) return;
        this.zones.hand.push(c);
      }
    }
    hasStageSlot() {
      const chars = this.zones.stage.filter((c) => c.isCharacter()).length;
      return chars < 3;
    }
    findIn(zone, pred) { return this.zones[zone].find(pred) || null; }
    searchFromZones(zones, pred) {
      for (const z of zones) {
        const arr = this.zones[z];
        const idx = arr.findIndex((c) => pred(c.def));
        if (idx >= 0) return arr.splice(idx, 1)[0];
      }
      return null;
    }
    addToHand(card) { this.zones.hand.push(card); }
  }

  class Game {
    constructor() {
      this.turn = 1;
      this.activePlayerIndex = 0;
      this.players = [new Player("P1"), new Player("P2")];
      this.turnFlags = {
        negatedCardIds: new Set(),
        oncePerTurn: new Set(),
        battleEndedThisTurn: false,
      };
      this.started = false;
    }
    get you() { return this.players[this.activePlayerIndex]; }
    get opp() { return this.players[1 - this.activePlayerIndex]; }
    log(s) { UI.log(s); }
    oncePerTurn(key) {
      if (this.turnFlags.oncePerTurn.has(key)) return false;
      this.turnFlags.oncePerTurn.add(key);
      return true;
    }
    start() {
      this.started = true;
      this.log(`=== GAME START ===`);
      this.startTurn();
    }
    startTurn() {
      this.turnFlags.negatedCardIds.clear();
      this.turnFlags.oncePerTurn.clear();
      this.turnFlags.battleEndedThisTurn = false;
      for (const p of this.players) for (const c of p.zones.stage) c.resetTurnState();
      this.log(`\n=== TURN ${this.turn} START: ${this.you.name} ===`);
      this.you.draw(1);
      this.render();
    }
    endTurn() {
      this.log(`=== TURN ${this.turn} END ===`);
      this.turn += 1;
      this.activePlayerIndex = 1 - this.activePlayerIndex;
      this.startTurn();
    }
    ctx(player) {
      const opponent = this.players[1 - this.players.indexOf(player)];
      return {
        game: this,
        you: player,
        opp: opponent,
        oncePerTurn: (key) => this.oncePerTurn(key),
        log: (s) => this.log(s),
      };
    }
    moveCard(card, fromZone, toZone, reason) {
      const owner = card.owner;
      const fromArr = owner.zones[fromZone];
      const toArr = owner.zones[toZone];
      const idx = fromArr.findIndex((c) => c.id === card.id);
      if (idx >= 0) fromArr.splice(idx, 1);
      toArr.push(card);
      this.log(`[MOVE] ${owner.name}: ${card.def.no}_${card.def.name} ${fromZone} -> ${toZone}${reason ? " (" + reason + ")" : ""}`);
      if (toZone === "wing") this.onSentToWing(card, reason || "");
    }
    onEnterStage(card) {
      const ctx = this.ctx(card.owner);
      const fn = card.def.abilities && card.def.abilities.onEnterStage;
      if (typeof fn === "function") fn(ctx, card);
    }
    onSentToWing(card, reason) {
      const ctx = this.ctx(card.owner);
      const fn = card.def.abilities && card.def.abilities.onSentToWing;
      if (typeof fn === "function") fn(ctx, card, reason);
    }

    kensanFromHand(card, { ignoreConditions = false } = {}) {
      const p = card.owner;
      assert(p === this.you, "自分の手札のみ見参できます。");
      if (!p.hasStageSlot()) { this.log(`[FAIL] ステージが満員です。`); return false; }

      if (card.def.cannotEnterStage && !ignoreConditions) {
        const cond = card.def.kensanCondition;
        if (typeof cond !== "function") { this.log(`[FAIL] ${card.def.no}_${card.def.name} は通常見参できません。`); return false; }
        const ok = cond(this.ctx(p), card);
        if (!ok) { this.log(`[FAIL] 見参条件を満たしていません。`); return false; }
      }
      if (card.def.cannotEnterStage && ignoreConditions) this.log(`[INFO] 条件無視で見参：${card.def.no}_${card.def.name}`);

      this.moveCard(card, "hand", "stage", "kensan");
      this.onEnterStage(card);
      this.render();
      return true;
    }

    equipItemFromHand(itemCard, targetChar) {
      assert(itemCard.owner === this.you, "自分の手札のみ装備できます。");
      assert(targetChar.owner === this.you, "自分のステージにのみ装備できます。");
      if (!itemCard.isItem() || !targetChar.isCharacter()) { this.log(`[FAIL] 手札(アイテム)と自ステージ(キャラ)を選択してください。`); return false; }

      this.moveCard(itemCard, "hand", "stage", `equip to ${targetChar.def.no}_${targetChar.def.name}`);
      itemCard.equippedTo = targetChar.id;
      targetChar.equipment.push(itemCard.id);

      const ctx = this.ctx(this.you);
      const fn = itemCard.def.abilities && itemCard.def.abilities.onEquip;
      if (typeof fn === "function") fn(ctx, itemCard, targetChar);

      this.render();
      return true;
    }

    reactDirectAttackWithMiiko() {
      if (this.you.zones.shield.length !== 0) { this.log(`[FAIL] 21_ミーコは自分シールドが0枚の時のみ反応できます。`); return; }
      const miiko = this.you.findIn("hand", (c) => c.def.no === 21);
      if (!miiko) { this.log(`[FAIL] 手札に21_ミーコがありません。`); return; }
      if (!this.you.hasStageSlot()) { this.log(`[FAIL] ステージが満員で見参できません。`); return; }
      this.moveCard(miiko, "hand", "stage", "No.21 reaction (direct attack)");
      this.turnFlags.battleEndedThisTurn = true;
      this.log(`[RESOLVE] 相手の攻撃を無効にし、このターンのバトルを終了します。`);
      this.render();
    }

    battle(attackerId, defenderId) {
      if (this.turnFlags.battleEndedThisTurn) { this.log(`[FAIL] このターンのバトルは終了しています（21の効果など）。`); return; }

      const atk = this.you.zones.stage.find((c) => c.id === attackerId);
      const def = this.opp.zones.stage.find((c) => c.id === defenderId);
      if (!atk || !def) { this.log(`[FAIL] 攻撃側/防御側の選択が不正です。`); return; }
      if (!atk.isCharacter() || !def.isCharacter()) { this.log(`[FAIL] バトルはキャラクター同士です。`); return; }

      const hasSevenStar = atk.equipment
        .map((eid) => this.you.zones.stage.find((x) => x.id === eid))
        .filter(Boolean)
        .some((it) => it.def.no === 30);
      const sevenStarSweepEnabled = hasSevenStar && atk.hasTag("剣士") && atk.sweepEnabledThisTurn;

      const canNormal = atk.canAttackNormally();
      const canSweep = sevenStarSweepEnabled && !atk.sweepTargetsThisTurn.has(def.id);
      if (!canNormal && !canSweep) { this.log(`[FAIL] 攻撃回数が足りません。または七星剣の対象制限です。`); return; }

      if (canSweep && !canNormal) atk.sweepTargetsThisTurn.add(def.id);
      else {
        atk.consumeNormalAttack();
        if (sevenStarSweepEnabled) atk.sweepTargetsThisTurn.add(def.id);
      }

      const atkVal = atk.getAtk();
      const defVal = def.getAtk();
      this.log(`[BATTLE] ${this.you.name} ${atk.def.no}_${atk.def.name}(${atkVal}) vs ${this.opp.name} ${def.def.no}_${def.def.name}(${defVal})`);

      const miikoPrevents = (card, ownerPlayer) => {
        if (card.def.no !== 21) return false;
        if (ownerPlayer.flags.miikoPreventOnceUsedTurn === this.turn) return false;
        ownerPlayer.flags.miikoPreventOnceUsedTurn = this.turn;
        this.log(`[TRIGGER] 21_ミーコ：このターン1度、バトルで破壊されません。`);
        return true;
      };

      if (atkVal >= defVal) {
        if (!miikoPrevents(def, this.opp)) {
          this.moveCard(def, "stage", "wing", "battle defeated");
          if (atk.def.no === 23) {
            const shield = this.opp.zones.shield.pop();
            if (shield) {
              this.moveCard(shield, "shield", "wing", "No.23 shield break");
              this.log(`[TRIGGER] 23_退魔師レイチェル：相手シールドを1枚破壊しました。`);
            }
          }
        }
      } else {
        if (!miikoPrevents(atk, this.you)) {
          this.moveCard(atk, "stage", "wing", "battle defeated");
        }
      }

      this.render();
    }

    render() {
      const you = this.you;
      const opp = this.opp;

      const renderZone = (p, zone, clickable) => {
        const arr = p.zones[zone];
        if (!arr.length) return `<div style="opacity:.6">（なし）</div>`;
        return arr.map((c) => {
          const label = `${c.def.no}_${c.def.name}${c.isCharacter() ? ` ATK:${c.getAtk()}` : ""}`;
          const isSelected =
            (zone === "hand" && UI.selected.handCardId === c.id) ||
            (zone === "stage" && clickable === "yourStage" && UI.selected.stageCardId === c.id) ||
            (zone === "stage" && clickable === "oppStage" && UI.selected.opponentStageCardId === c.id);

          const bg = isSelected ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.06)";
          const border = isSelected ? "1px solid rgba(255,255,255,.35)" : "1px solid rgba(255,255,255,.12)";
          const clickHint = clickable ? `data-click="${clickable}" data-id="${c.id}"` : "";

          return `
            <div ${clickHint}
              style="padding:8px 10px;margin:6px 0;border-radius:10px;background:${bg};border:${border};">
              <div style="font-weight:800">${UI.escape(label)}</div>
              <div style="opacity:.75;font-size:11px">
                kind:${UI.escape(c.def.kind)} / rank:${UI.escape(c.def.rank ?? "-")} / タイトルタグ:${UI.escape(c.def.titleTag ?? "-")}
              </div>
            </div>`;
        }).join("");
      };

      UI.setState(`
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:180px">
            <div style="font-weight:900;margin-bottom:6px">あなた（${UI.escape(you.name)}）</div>
            <div style="opacity:.85">TURN: ${this.turn} / 手番: ${UI.escape(this.you.name)}</div>
            <div style="margin-top:8px;font-weight:800">手札（タップして選択）</div>
            ${renderZone(you, "hand", "hand")}
            <div style="margin-top:8px;font-weight:800">ステージ（タップして選択）</div>
            ${renderZone(you, "stage", "yourStage")}
            <div style="margin-top:8px;font-weight:700;opacity:.9">
              シールド:${you.zones.shield.length} / ウイング:${you.zones.wing.length} / デッキ:${you.zones.deck.length}
            </div>
          </div>

          <div style="flex:1;min-width:180px">
            <div style="font-weight:900;margin-bottom:6px">相手（${UI.escape(opp.name)}）</div>
            <div style="opacity:.85">シールド:${opp.zones.shield.length} / ウイング:${opp.zones.wing.length} / デッキ:${opp.zones.deck.length}</div>
            <div style="margin-top:8px;font-weight:800">相手ステージ（タップして選択）</div>
            ${renderZone(opp, "stage", "oppStage")}
            <div style="margin-top:8px;font-weight:700">相手手札（枚数のみ）</div>
            <div style="padding:8px 10px;margin:6px 0;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)">
              ${opp.zones.hand.length} 枚
            </div>
          </div>
        </div>

        <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.12);opacity:.9;font-size:12px">
          <div style="font-weight:800;margin-bottom:4px">選択</div>
          <div>手札: ${UI.escape(UI.selected.handCardId || "-")}</div>
          <div>自ステージ: ${UI.escape(UI.selected.stageCardId || "-")}</div>
          <div>相手ステージ: ${UI.escape(UI.selected.opponentStageCardId || "-")}</div>
        </div>
      `);

      const root = UI.stateEl;
      if (root) {
        root.querySelectorAll("[data-click]").forEach((el) => {
          el.addEventListener("click", () => {
            const kind = el.getAttribute("data-click");
            const id = el.getAttribute("data-id");
            if (kind === "hand") UI.selected.handCardId = id;
            if (kind === "yourStage") UI.selected.stageCardId = id;
            if (kind === "oppStage") UI.selected.opponentStageCardId = id;
            this.render();
          });
        });
      }

      this.renderControls();
    }

    renderControls() {
      const buttons = [];

      if (!this.started) {
        buttons.push(UI.btn("Start", () => this.start()));
        buttons.push(UI.btn("Reset", () => {
          const g = setupNewGame();
          MW._setGame(g);
          UI.log(`(reset) Ready. Tap Start.`);
          g.render();
        }));
        UI.setControls(buttons);
        return;
      }

      buttons.push(UI.btn("End Turn", () => this.endTurn()));
      buttons.push(UI.btn("Draw +1", () => { this.you.draw(1); this.log(`[DRAW] +1`); this.render(); }));

      buttons.push(UI.btn("見参（手札選択）", () => {
        const id = UI.selected.handCardId;
        const card = this.you.zones.hand.find((c) => c.id === id);
        if (!card) return this.log(`[FAIL] 手札カードをタップして選択してください。`);
        this.kensanFromHand(card);
      }));

      buttons.push(UI.btn("装備（手札アイテム→自ステージ）", () => {
        const itemId = UI.selected.handCardId;
        const targetId = UI.selected.stageCardId;
        const item = this.you.zones.hand.find((c) => c.id === itemId);
        const target = this.you.zones.stage.find((c) => c.id === targetId);
        if (!item || !target) return this.log(`[FAIL] 手札(アイテム)と自ステージ(キャラ)をタップして選択してください。`);
        this.equipItemFromHand(item, target);
      }));

      buttons.push(UI.btn("バトル（自→相手）", () => {
        const atkId = UI.selected.stageCardId;
        const defId = UI.selected.opponentStageCardId;
        if (!atkId || !defId) return this.log(`[FAIL] 自ステージと相手ステージをタップして選択してください。`);
        this.battle(atkId, defId);
      }));

      buttons.push(UI.btn("28効果：23を条件無視で見参", () => {
        const seshia = this.you.zones.stage.find((c) => c.def.no === 28);
        if (!seshia) return this.log(`[FAIL] ステージに28_セシア&アリサが必要です。`);
        const reichel = this.you.zones.hand.find((c) => c.def.no === 23);
        if (!reichel) return this.log(`[FAIL] 手札に23_退魔師レイチェルがありません。`);
        this.log(`[ACTION] 28効果：条件を無視して23を見参します。`);
        this.kensanFromHand(reichel, { ignoreConditions: true });
      }));

      buttons.push(UI.btn("29効果：BUGBUGアイテムサーチ(1/turn)", () => {
        const wolf = this.you.zones.stage.find((c) => c.def.no === 29);
        if (!wolf) return this.log(`[FAIL] ステージに29_狼猫-孫悟空Lv75-が必要です。`);
        const ctx = this.ctx(this.you);
        wolf.def.abilities.onCustomOncePerTurn(ctx, wolf);
        this.render();
      }));

      buttons.push(UI.btn("（テスト）直接攻撃→21で止める", () => {
        this.log(`[TEST] 相手の直接攻撃を受ける想定です。`);
        this.reactDirectAttackWithMiiko();
      }));

      buttons.push(UI.btn("30効果：全体攻撃ON(剣士+七星剣)", () => {
        const id = UI.selected.stageCardId;
        const c = this.you.zones.stage.find((x) => x.id === id);
        if (!c) return this.log(`[FAIL] 自ステージのキャラをタップして選択してください。`);
        const hasSeven = c.equipment
          .map((eid) => this.you.zones.stage.find((x) => x.id === eid))
          .filter(Boolean)
          .some((it) => it.def.no === 30);
        if (!hasSeven) return this.log(`[FAIL] そのキャラに30_七星剣が装備されていません。`);
        if (!c.hasTag("剣士")) return this.log(`[FAIL] タグ「剣士」を持つキャラのみ全体攻撃できます。`);
        c.sweepEnabledThisTurn = true;
        this.log(`[RESOLVE] 全体攻撃ON：相手ステージ各キャラに1度ずつ攻撃できます（同一対象は同ターン2回不可）。`);
        this.render();
      }));

      UI.setControls(buttons);
    }
  }

  function cost_sendOneHandOrOwnStageCharToWing(ctx, selfCardId) {
    const you = ctx.you;
    const g = ctx.game;
    const fromHand = you.zones.hand.find((c) => c.isCharacter() && c.id !== selfCardId);
    const fromStage = you.zones.stage.find((c) => c.isCharacter() && c.id !== selfCardId);
    const sacrifice = fromHand || fromStage;
    if (!sacrifice) { ctx.log(`[COST FAIL] コスト用のキャラが手札/ステージにありません。`); return false; }
    const zone = fromHand ? "hand" : "stage";
    g.moveCard(sacrifice, zone, "wing", "kensan cost");
    return true;
  }

  // 21 & 30 are implemented per provided text images in this chat.
  const CARD_DEFS = [
    { no: 21, name: "ミーコ", kind: "character", rank: 3, atk: 900, tags: ["アバター", "霊魂", "ミジンコ"], titleTag: "BUGBUG西遊記", cannotEnterStage: false, abilities: {} },
    { no: 22, name: "インフルエンサーまりも", kind: "character", rank: 3, atk: 400, tags: ["人間", "配信", "人気"], titleTag: "BUGBUG西遊記", cannotEnterStage: false, abilities: {} },
    { no: 23, name: "退魔師レイチェル", kind: "character", rank: 5, atk: 2200, tags: ["除霊", "伶嬢", "射手"], titleTag: "怨霊撲滅屋GB", cannotEnterStage: true,
      kensanCondition: (ctx, self) => cost_sendOneHandOrOwnStageCharToWing(ctx, self.id), abilities: {} },
    { no: 24, name: "銀弾の双銃", kind: "item", rank: 4, atk: 0, tags: ["除霊", "拳銃"], titleTag: "怨霊撲滅屋GB", cannotEnterStage: false,
      abilities: { onEquip: (ctx, item, target) => {
        target.bonusAtk += 500; ctx.log(`[EQUIP] 24_銀弾の双銃：装備 ATK+500`);
        if (target.hasTag("除霊")) { target.bonusAtk += 500; target.extraAttacksThisTurn += 2; ctx.log(`[EQUIP BONUS] タグ「除霊」：さらにATK+500、攻撃回数+2（このターン）`); }
      } } },
    { no: 25, name: "小次郎&小太郎", kind: "character", rank: 5, atk: 2500, tags: ["アバター", "GAME", "兄弟"], titleTag: "BUGBUG西遊記", cannotEnterStage: true,
      kensanCondition: (ctx, self) => cost_sendOneHandOrOwnStageCharToWing(ctx, self.id),
      abilities: { onSentToWing: (ctx, self, reason) => { /* 最小テストでは省略（本体実装で統合） */ } } },
    { no: 26, name: "ジュエリー・ルビー", kind: "character", rank: 4, atk: 1700, tags: ["美少女戦士", "アニメ", "格闘"], titleTag: "Ve ヴォイスエレメント", cannotEnterStage: true,
      kensanCondition: (ctx) => ctx.you.zones.stage.some((c) => c.def.no === 27), abilities: {} },
    { no: 27, name: "ジュエリー・サファイア", kind: "character", rank: 4, atk: 1700, tags: ["美少女戦士", "アニメ", "格闘"], titleTag: "Ve ヴォイスエレメント", cannotEnterStage: true,
      kensanCondition: (ctx) => ctx.you.zones.stage.some((c) => c.def.no === 26), abilities: {} },
    { no: 28, name: "セシア&アリサ", kind: "character", rank: 4, atk: 1500, tags: ["除霊", "支援", "侍女"], titleTag: "怨霊撲滅屋GB", cannotEnterStage: false, abilities: {} },
    { no: 29, name: "狼猫-孫悟空Lv75-", kind: "character", rank: 5, atk: 2400, tags: ["アバター", "GAME", "剣士"], titleTag: "BUGBUG西遊記", cannotEnterStage: true,
      kensanCondition: (ctx, self) => cost_sendOneHandOrOwnStageCharToWing(ctx, self.id),
      abilities: { onCustomOncePerTurn: (ctx) => { const key = `${ctx.you.name}:29:T${ctx.game.turn}`; if (!ctx.oncePerTurn(key)) return ctx.log(`[INFO] 29：このターンは既に使用済みです。`);
        const found = ctx.you.searchFromZones(["deck", "wing"], (def) => def.kind === "item" && def.titleTag === "BUGBUG西遊記");
        if (found) { ctx.you.addToHand(found); ctx.log(`[RESOLVE] 29：BUGBUG西遊記のアイテムを手札に加えました：${found.def.no}_${found.def.name}`); } else { ctx.log(`[RESOLVE] 29：対象アイテムが見つかりませんでした。`); } } } },
    { no: 30, name: "七星剣", kind: "item", rank: 4, atk: 0, tags: ["課金アイテム", "刀剣"], titleTag: "BUGBUG西遊記", cannotEnterStage: false,
      abilities: { onEquip: (ctx, item, target) => { target.bonusAtk += 500; ctx.log(`[EQUIP] 30_七星剣：装備 ATK+500`);
        if (target.hasTag("剣士")) { target.bonusAtk += 500; ctx.log(`[EQUIP BONUS] タグ「剣士」：さらにATK+500。全体攻撃は下のボタンでON。`); } } } },
  ];
  const DEF_MAP = new Map(CARD_DEFS.map((d) => [d.no, d]));

  function makeCard(owner, defOrNo) {
    const def = typeof defOrNo === "number" ? DEF_MAP.get(defOrNo) : defOrNo;
    assert(def, "card def missing");
    return new Card(owner, def);
  }

  function setupNewGame() {
    const game = new Game();
    const p1 = game.players[0];
    const p2 = game.players[1];

    for (let i = 0; i < 3; i++) {
      const sDef = { no: 900 + i, name: `シールド${i + 1}`, kind: "item", rank: 0, atk: 0, tags: [], titleTag: null };
      p1.zones.shield.push(makeCard(p1, sDef));
      p2.zones.shield.push(makeCard(p2, sDef));
    }

    const animeFillerDef = { no: 701, name: "アニメ汎用カード", kind: "item", rank: 0, atk: 0, tags: ["アニメ"], titleTag: "Ve ヴォイスエレメント", cannotEnterStage: false, abilities: {} };
    const bugbugItemDef = { no: 702, name: "BUGBUG汎用アイテム", kind: "item", rank: 0, atk: 0, tags: [], titleTag: "BUGBUG西遊記", cannotEnterStage: false, abilities: {} };

    [28, 24, 23, 22, 25, 26, 27, 29, 21, 30].forEach((no) => p1.zones.deck.push(makeCard(p1, no)));
    p1.zones.deck.push(makeCard(p1, animeFillerDef));
    p1.zones.deck.push(makeCard(p1, bugbugItemDef));

    [22, 24, 29].forEach((no) => p2.zones.deck.push(makeCard(p2, no)));
    p2.zones.deck.push(makeCard(p2, { no: 703, name: "相手の汎用札", kind: "character", rank: 3, atk: 1200, tags: ["怨霊"], titleTag: null, cannotEnterStage: false, abilities: {} }));

    p1.zones.deck.sort(() => Math.random() - 0.5);
    p2.zones.deck.sort(() => Math.random() - 0.5);

    p1.draw(5);
    p2.draw(5);

    const enemyChar = makeCard(p2, { no: 800, name: "敵キャラ", kind: "character", rank: 3, atk: 1000, tags: ["怨霊"], titleTag: null, cannotEnterStage: false, abilities: {} });
    p2.zones.stage.push(enemyChar);

    return game;
  }

  const MW = {
    version: "1.0.1-uihotfix",
    game: null,
    init() {
      try {
        UI.mount();
        this.game = setupNewGame();
        UI.log(`Ready. Tap Start.`);
        this.game.render();
      } catch (e) {
        console.error(e);
        try { UI.mount(); UI.log(`[FATAL] ${e && e.message ? e.message : e}`); } catch (_) {}
      }
    },
    _setGame(g) { this.game = g; },
  };

  try { window[GLOBAL_NAME] = MW; } catch (_) {}

  const boot = () => MW.init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();