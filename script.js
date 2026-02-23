(function(){
  'use strict';
  function __mw_boot(){
    /* =========================================================
      Manpuku World - v50019+ (iPhone First / Full Replace JS)
      23〜29 実装版（21・22・30は今回除外）
      ※ このファイルは「丸ごと置換」用に、単体で動くようにUI/ロジックを同梱した JS です。
      ※ 既存プロジェクト側にHTMLがある場合でも、最低限 #app が無ければ自動生成します。
    ========================================================= */
    
    (() => {
      "use strict";
    
      
      // ---- Startup cleanup (in case an old "操作" overlay remains in HTML) ----
      (function cleanupLegacyOverlays(){
        const selectors = ["#opsModal", ".ops-modal", "#mw_ops", "#mw_help"];
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            try { el.remove(); } catch(e) {}
          });
        });
      })();
    /* ================================
        0) ユーティリティ
      ================================= */
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const pad2 = (n) => String(n).padStart(2, "0");
      const uid = () => "u" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
      const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0;
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };
    
      const logLines = [];
      const LOG_MAX = 200;
      function log(msg) {
        const t = new Date();
        const hh = pad2(t.getHours());
        const mm = pad2(t.getMinutes());
        const ss = pad2(t.getSeconds());
        logLines.push(`[${hh}:${mm}:${ss}] ${msg}`);
        while (logLines.length > LOG_MAX) logLines.shift();
        renderLog();
      }
    
      function pickFirstEmpty(slotArr) {
        for (let i = 0; i < slotArr.length; i++) if (!slotArr[i]) return i;
        return -1;
      }
    
      function countIn(arr, pred) {
        let c = 0;
        for (const x of arr) if (pred(x)) c++;
        return c;
      }
    
      /* ================================
        1) ルール定数
      ================================= */
      const MAX_CARD_NO = 29; // 今回は 23〜29 を実装（21・22・30は除外）
      const HAND_LIMIT = 7;
      const FIELD_C = 3; // Cスロット
      const FIELD_E = 3; // Eスロット
      const SHIELD_COUNT = 5;
    
      const PHASE_MAIN = "MAIN";
      const PHASE_BATTLE = "BATTLE";
    
      const SIDE_P1 = 0;
      const SIDE_AI = 1;
    
      function sideName(s) {
        return s === SIDE_P1 ? "あなた" : "AI";
      }
    
      /* ================================
        2) カード定義
      ================================= */
      // NOTE:
      // 既存の1〜20は「最低限の稼働」を優先し、基本ステータス中心の簡易定義です。
      // 08/14 はチェーン反応として実装（ご主人様の要件に合わせて 14 は無効化後に発動カードをウイングへ）。
      // 23〜29 は今回の要望分を実装しています。
    
      const Cards = (() => {
        /** @type {Record<number, any>} */
        const defs = {};
    
        // 便利：タグ判定
        const hasTag = (card, tag) => (card.tags || []).includes(tag);
    
        // -------- 1〜20（簡易）--------
        // ここは「ゲームが動く」ことを優先。必要なら後続で各カード固有効果を追記可能です。
        for (let no = 1; no <= 20; no++) {
          defs[no] = {
            no,
            name: `No.${pad2(no)}`,
            type: "char",
            cost: clamp(((no - 1) % 4) + 1, 1, 4),
            atk: 1000 + (no % 5) * 300,
            tags: [],
            titleTag: "BASIC",
            text: "（簡易定義）",
            summon: "normal", // normal / kensan
          };
        }
    
        // 08 手形（カウンター・簡易）
        defs[8] = {
          ...defs[8],
          name: "手形",
          type: "effect",
          cost: 2,
          atk: 0,
          tags: ["カウンター"],
          titleTag: "BASIC",
          text: "相手の発動を無効化する（簡易）。",
          summon: "none",
        };
    
        // 14 記憶抹消（カウンター）
        defs[14] = {
          ...defs[14],
          name: "記憶抹消",
          type: "effect",
          cost: 3,
          atk: 0,
          tags: ["カウンター"],
          titleTag: "BASIC",
          text: "相手の発動を無効化し、その発動カードをウイングへ送る（要件対応）。",
          summon: "none",
        };
    
        // 07（アイテム装備時に攻撃回数+1 という要件が過去にあったため）
        defs[7] = {
          ...defs[7],
          name: "No.07（連撃）",
          type: "char",
          cost: 3,
          atk: 1700,
          tags: ["BASIC"],
          titleTag: "BASIC",
          text: "アイテム装備中：攻撃回数+1（最大2回）",
          summon: "normal",
        };
    
        // -------- 21〜22（除外：今回未実装）--------
        // defs[21] ... defs[22] は今回入れません（デッキ編集にも表示しない）
    
        // -------- 23〜29（今回実装）--------
    
        // 23 レイチェル
        defs[23] = {
          no: 23,
          name: "レイチェル",
          type: "char",
          cost: 4,
          atk: 2300,
          tags: ["退魔師", "除霊", "美少女戦士"],
          titleTag: "退魔師",
          text:
            "存在中（アイテム装備時）：相手のタグ「怨霊」「霊魂」は効果発動不可。\n" +
            "バトル勝利時：相手シールド1枚破壊。",
          summon: "kensan",
        };
    
        // 24 シルバーバレット（二丁拳銃）アイテム
        defs[24] = {
          no: 24,
          name: "シルバーバレット（二丁拳銃）",
          type: "item",
          cost: 2,
          atk: 0,
          tags: ["装備", "武器"],
          titleTag: "退魔師",
          text: "装備：ATK+500。装備者がタグ「除霊」ならさらにATK+500。攻撃回数+2。",
          equip: { atk: 500, atkIfTag: { tag: "除霊", add: 500 }, addAttacks: 2 },
          summon: "none",
        };
    
        // 25 小次郎＆小太郎
        defs[25] = {
          no: 25,
          name: "小次郎＆小太郎",
          type: "char",
          cost: 4,
          atk: 2100,
          tags: ["忍者", "双子"],
          titleTag: "忍",
          text:
            "見参。\n" +
            "相手効果またはバトルでウイングへ送られた時：ランク4以下の「小太郎」「小次郎」を2体まで見参（空きスロットに特殊登場）。",
          summon: "kensan",
        };
    
        // 26 ルビー
        defs[26] = {
          no: 26,
          name: "ルビー",
          type: "char",
          cost: 3,
          atk: 1800,
          tags: ["美少女戦士"],
          titleTag: "美少女戦士",
          text:
            "見参（サファイアが自分ステージにいる時のみ）。\n" +
            "登場時：手札を1枚捨てる→デッキからタグ「美少女戦士」を1枚サーチして手札へ。\n" +
            "存在中：自分のタグ「美少女戦士」ATK+500。",
          summon: "kensan",
        };
    
        // 27 サファイア
        defs[27] = {
          no: 27,
          name: "サファイア",
          type: "char",
          cost: 3,
          atk: 1800,
          tags: ["美少女戦士"],
          titleTag: "美少女戦士",
          text:
            "見参（ルビーが自分ステージにいる時のみ）。\n" +
            "登場時：手札を1枚捨てる→デッキからタグ「美少女戦士」を1枚サーチして手札へ。\n" +
            "存在中：自分のタグ「美少女戦士」ATK+500。",
          summon: "kensan",
        };
    
        // 28 セシア＆アリサ
        defs[28] = {
          no: 28,
          name: "セシア＆アリサ",
          type: "char",
          cost: 3,
          atk: 1700,
          tags: ["退魔師", "美少女戦士"],
          titleTag: "退魔師",
          text:
            "見参。\n" +
            "登場時：デッキから「怨霊撲滅屋GB」をサーチして手札へ。\n" +
            "自ターン：レイチェルを条件無視で見参（1ターン1回）。",
          summon: "kensan",
        };
    
        // 29 ウルフキャット
        defs[29] = {
          no: 29,
          name: "ウルフキャット",
          type: "char",
          cost: 2,
          atk: 1400,
          tags: ["BUGBUG", "獣"],
          titleTag: "BUGBUG西遊記",
          text:
            "見参。\n" +
            "自ターン：BUGBUGアイテムサーチ（1ターン1回）。",
          summon: "kensan",
        };
    
        return {
          get(no) {
            const d = defs[no];
            if (!d) throw new Error("Unknown card no=" + no);
            return d;
          },
          has(no) {
            return !!defs[no];
          },
          allNos() {
            return Object.keys(defs).map((k) => Number(k)).sort((a, b) => a - b);
          },
          hasTag,
        };
      })();
    
      /* ================================
        3) 永続データ（所持/デッキ）
      ================================= */
      const LS_KEY = "ManpukuWorld_v50019_plus_save";
    
      function makeDefaultCollection() {
        // 1〜29 を各3枚所持
        const col = {};
        for (let no = 1; no <= MAX_CARD_NO; no++) {
          if (!Cards.has(no)) continue; // 21,22 除外など
          col[pad2(no)] = 3;
        }
        return col;
      }
    
      function makeDefaultDeck40() {
        // 初期デッキ：1〜20を2枚ずつ(40枚)
        const deck = [];
        for (let i = 1; i <= 20; i++) {
          if (!Cards.has(i)) continue;
          deck.push(i, i);
        }
        return deck.slice(0, 40);
      }
    
      function loadSave() {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (!raw) return null;
          const s = JSON.parse(raw);
          if (!s || typeof s !== "object") return null;
          return s;
        } catch {
          return null;
        }
      }
    
      function saveSave(s) {
        localStorage.setItem(LS_KEY, JSON.stringify(s));
      }
    
      function ensureSave() {
        let s = loadSave();
        if (!s) s = {};
        if (!s.collection) s.collection = makeDefaultCollection();
        if (!s.deck) s.deck = makeDefaultDeck40();
    
        // 追加カード（1〜MAX_CARD_NO）のキーが無ければ追加
        for (let no = 1; no <= MAX_CARD_NO; no++) {
          if (!Cards.has(no)) continue;
          const k = pad2(no);
          if (typeof s.collection[k] !== "number") s.collection[k] = 3;
        }
        // デッキは常に40枚に補正
        if (!Array.isArray(s.deck)) s.deck = makeDefaultDeck40();
        if (s.deck.length !== 40) {
          const fixed = s.deck.filter((n) => typeof n === "number" && Cards.has(n));
          while (fixed.length < 40) fixed.push(1);
          s.deck = fixed.slice(0, 40);
        }
    
        saveSave(s);
        return s;
      }
    
      /* ================================
        4) ゲーム状態
      ================================= */
      const game = {
        screen: "menu", // menu / deck / game
        save: ensureSave(),
    
        // ランタイム状態
        state: null,
      };
    
      function freshMatchState() {
        const mkDeck = (side) => {
          const base = side === SIDE_P1 ? game.save.deck : game.save.deck; // AIも同じデッキ（簡易）
          const cards = base.map((no) => ({ uid: uid(), no }));
          shuffle(cards);
          return cards;
        };
    
        return {
          turn: 1,
          currentSide: SIDE_P1,
          phase: PHASE_MAIN,
    
          defeatedCostSum: [0, 0],
    
          sides: [
            {
              deck: mkDeck(SIDE_P1),
              hand: [],
              wing: [],
              shield: [],
              C: Array(FIELD_C).fill(null),
              E: Array(FIELD_E).fill(null),
              equipOf: {}, // charUid -> itemUid
              attacksUsed: {}, // charUid -> count
              perTurnUsed: {}, // charUid -> bool (field abilities)
              turn1BattleLock: true, // 先行ターン1はバトル不可
            },
            {
              deck: mkDeck(SIDE_AI),
              hand: [],
              wing: [],
              shield: [],
              C: Array(FIELD_C).fill(null),
              E: Array(FIELD_E).fill(null),
              equipOf: {},
              attacksUsed: {},
              perTurnUsed: {},
              turn1BattleLock: true,
            },
          ],
    
          chain: [], // stack
          pendingActivation: null, // {side, card, fromZone, slotIndex, kind}
          ui: {
            selectedHandIndex: -1,
            selectedField: null, // {zone:"C"/"E", idx, side}
            selectedAttackFrom: -1,
            selectedAttackTo: -1,
          },
        };
      }
    
      function state() {
        if (!game.state) game.state = freshMatchState();
        return game.state;
      }
    
      /* ================================
        5) ルール：基本操作
      ================================= */
      function draw(side, n = 1) {
        const st = state();
        const S = st.sides[side];
        for (let i = 0; i < n; i++) {
          if (S.deck.length === 0) {
            // デッキ切れ（敗北）
            log(`${sideName(side)}のデッキが0枚になりました。デッキ切れで敗北です。`);
            endGame(side === SIDE_P1 ? SIDE_AI : SIDE_P1, "deckout");
            return;
          }
          S.hand.push(S.deck.shift());
        }
      }
    
      function initGame() {
        game.state = freshMatchState();
        const st = state();
        // シールド5、手札5
        for (const side of [SIDE_P1, SIDE_AI]) {
          const S = st.sides[side];
          draw(side, 5);
          // シールドはデッキトップから
          for (let i = 0; i < SHIELD_COUNT; i++) {
            if (S.deck.length === 0) break;
            S.shield.push(S.deck.shift());
          }
        }
        log("ゲーム開始。先攻：あなた。ターン1は双方バトル不可。");
        render();
      }
    
      function endGame(winnerSide, reason) {
        const st = state();
        st.phase = "END";
        log(`勝者：${sideName(winnerSide)}（理由：${reason}）`);
        render();
      }
    
      function other(side) {
        return side === SIDE_P1 ? SIDE_AI : SIDE_P1;
      }
    
      function getCardDef(cardOrNo) {
        const no = typeof cardOrNo === "number" ? cardOrNo : cardOrNo.no;
        return Cards.get(no);
      }
    
      function zoneRemoveCard(S, zoneName, idxOrUid) {
        // zoneName: "hand" | "deck" | "wing" | "shield" | "C" | "E"
        const zone = S[zoneName];
        if (!zone) return null;
    
        if (Array.isArray(zone)) {
          if (typeof idxOrUid === "number") {
            const c = zone[idxOrUid];
            zone.splice(idxOrUid, 1);
            return c || null;
          } else {
            const i = zone.findIndex((x) => x && x.uid === idxOrUid);
            if (i >= 0) {
              const c = zone[i];
              zone.splice(i, 1);
              return c;
            }
          }
        } else {
          // object map
        }
        return null;
      }
    
      function sendToWing(side, card, meta = {}) {
        const st = state();
        const S = st.sides[side];
        if (!card) return;
    
        // 装備解除
        if (card && getCardDef(card).type === "char") {
          const equipUid = S.equipOf[card.uid];
          if (equipUid) {
            // 装備カードは E ではなく「ウイング」へ送る（破壊扱い）
            delete S.equipOf[card.uid];
            const itemCard = removeCardByUidFromAnyZone(side, equipUid);
            if (itemCard) {
              S.wing.push(itemCard);
              log(`${sideName(side)}の装備が外れ、${getCardDef(itemCard).name}はウイングへ。`);
            }
          }
        }
    
        S.wing.push(card);
    
        // トリガー
        onSentToWing(side, card, meta);
    
        // 勝敗チェック：倒されたキャラのコスト合計が10
        if (getCardDef(card).type === "char" && (meta.reason === "battle" || meta.reason === "effect")) {
          const cost = getCardDef(card).cost || 0;
          const killerSide = meta.bySide;
          if (killerSide === SIDE_P1 || killerSide === SIDE_AI) {
            st.defeatedCostSum[killerSide] += cost;
            if (st.defeatedCostSum[killerSide] >= 10) {
              endGame(killerSide, "defeatedCost>=10");
            }
          }
        }
    
        // 手札上限：自分ターン終了時に処理（ここではしない）
      }
    
      function removeCardByUidFromAnyZone(side, uidValue) {
        const st = state();
        const S = st.sides[side];
    
        // hand/deck/wing/shield
        for (const z of ["hand", "deck", "wing", "shield"]) {
          const idx = S[z].findIndex((c) => c && c.uid === uidValue);
          if (idx >= 0) return zoneRemoveCard(S, z, idx);
        }
    
        // C/E
        for (const z of ["C", "E"]) {
          for (let i = 0; i < S[z].length; i++) {
            const c = S[z][i];
            if (c && c.uid === uidValue) {
              S[z][i] = null;
              return c;
            }
          }
        }
        return null;
      }
    
      function breakOneShieldToHand(targetSide, reasonText) {
        const st = state();
        const T = st.sides[targetSide];
        if (T.shield.length === 0) {
          log(`${sideName(targetSide)}のシールドは残っていません。`);
          return;
        }
        const shieldCard = T.shield.shift(); // 先頭
        T.hand.push(shieldCard); // 要件：破壊された側の手札へ
        log(`${sideName(targetSide)}のシールドが破壊され、${getCardDef(shieldCard).name}は手札へ。（${reasonText}）`);
      }
    
      /* ================================
        6) カード効果：常時参照
      ================================= */
      function hasOnStage(side, cardNo) {
        const st = state();
        return st.sides[side].C.some((c) => c && c.no === cardNo);
      }
    
      function getEquippedItemCard(side, charUid) {
        const st = state();
        const S = st.sides[side];
        const itemUid = S.equipOf[charUid];
        if (!itemUid) return null;
        // item は E に残さず「装備として扱う」ので、フィールド/E/手札/ウイングから探す
        // （実装簡易：装備時に E から remove して equip slot に "カード本体" を持つ方式にする）
        // → このゲームでは、装備カードは equipSlots に実体として持つ
        // そのため別に探す必要はないが、互換のため any zone 探索も残す
        return removeCardByUidFromAnyZone(side, itemUid) || null;
      }
    
      // 装備の実体を保持する（簡易・堅牢）：equipSlots[charUid] = itemCard
      // ※ equipOf は uid 参照として残す（既存要件に合わせる）
      function getEquippedItem(side, charUid) {
        const st = state();
        const S = st.sides[side];
        if (!S._equipSlots) S._equipSlots = {};
        return S._equipSlots[charUid] || null;
      }
      function setEquippedItem(side, charUid, itemCardOrNull) {
        const st = state();
        const S = st.sides[side];
        if (!S._equipSlots) S._equipSlots = {};
        if (!itemCardOrNull) delete S._equipSlots[charUid];
        else S._equipSlots[charUid] = itemCardOrNull;
      }
    
      function isSealedByRachel(activatorSide, cardDef) {
        // 相手に「レイチェル（装備中）」がいるなら、怨霊/霊魂タグの効果発動不可
        const st = state();
        const opp = other(activatorSide);
        const OppS = st.sides[opp];
        const rachel = OppS.C.find((c) => c && c.no === 23);
        if (!rachel) return false;
        const hasEquip = !!OppS.equipOf[rachel.uid] && !!getEquippedItem(opp, rachel.uid);
        if (!hasEquip) return false;
        const tags = cardDef.tags || [];
        return tags.includes("怨霊") || tags.includes("霊魂");
      }
    
      function calcAtk(side, charCard) {
        const st = state();
        const S = st.sides[side];
        const d = getCardDef(charCard);
        let a = d.atk || 0;
    
        // 装備
        const item = getEquippedItem(side, charCard.uid);
        if (item) {
          const id = getCardDef(item);
          if (id.type === "item" && id.equip) {
            a += id.equip.atk || 0;
            if (id.equip.atkIfTag && (d.tags || []).includes(id.equip.atkIfTag.tag)) {
              a += id.equip.atkIfTag.add || 0;
            }
          }
        }
    
        // 26/27存在中：美少女戦士+500
        const buffMG = hasOnStage(side, 26) || hasOnStage(side, 27);
        if (buffMG && (d.tags || []).includes("美少女戦士")) a += 500;
    
        return a;
      }
    
      function maxAttacks(side, charCard) {
        const st = state();
        const S = st.sides[side];
        const d = getCardDef(charCard);
        let m = 1;
    
        // No7: アイテム装備中なら+1（最大2）
        if (d.no === 7) {
          const item = getEquippedItem(side, charCard.uid);
          if (item) m = Math.max(m, 2);
        }
    
        // 24装備：攻撃回数+2
        const item = getEquippedItem(side, charCard.uid);
        if (item) {
          const id = getCardDef(item);
          if (id.no === 24 && id.equip && id.equip.addAttacks) {
            m += id.equip.addAttacks;
          }
        }
        return m;
      }
    
      function canBattleNow(side) {
        const st = state();
        const S = st.sides[side];
        if (st.phase !== PHASE_BATTLE) return false;
        // 先攻1ターン目は双方バトル不可（要件）
        if (st.turn === 1) return false;
        if (S.turn1BattleLock) return false;
        return st.currentSide === side;
      }
    
      /* ================================
        7) 見参（召喚）
      ================================= */
      function canKensanSummon(side, cardNo) {
        const d = Cards.get(cardNo);
        if (d.summon !== "kensan") return false;
    
        // 26/27 条件
        if (cardNo === 26) return hasOnStage(side, 27);
        if (cardNo === 27) return hasOnStage(side, 26);
    
        return true;
      }
    
      function kensanSummonFromHand(side, handIndex) {
        const st = state();
        const S = st.sides[side];
        const card = S.hand[handIndex];
        if (!card) return;
    
        const d = getCardDef(card);
        if (d.type !== "char") {
          log("見参できるのはキャラクターのみです。");
          return;
        }
        if (d.summon !== "kensan") {
          log(`${d.name}は見参ではありません。通常召喚を使ってください。`);
          return;
        }
        if (!canKensanSummon(side, card.no)) {
          log(`${d.name}は条件を満たしていないため見参できません。`);
          return;
        }
        const empty = pickFirstEmpty(S.C);
        if (empty < 0) {
          log("Cスロットが埋まっています。");
          return;
        }
    
        // コスト：手札から「コスト枚数」捨て（簡易：手札から選ばず後ろから）
        const cost = d.cost || 0;
        if (S.hand.length - 1 < cost) {
          log(`手札が足りません（必要：${cost}枚捨て）。`);
          return;
        }
        // 召喚カードを一旦抜く
        const summonCard = S.hand.splice(handIndex, 1)[0];
    
        // 捨て札処理（手札の末尾から cost 枚をウイングへ）
        for (let i = 0; i < cost; i++) {
          const dump = S.hand.pop();
          if (dump) sendToWing(side, dump, { reason: "cost", bySide: side });
        }
    
        // 登場
        S.C[empty] = summonCard;
        log(`${sideName(side)}は【見参】で ${d.name} を登場（C${empty + 1}）。`);
    
        onEnterField(side, summonCard);
    
        render();
      }
    
      function normalSummonFromHand(side, handIndex) {
        const st = state();
        const S = st.sides[side];
        const card = S.hand[handIndex];
        if (!card) return;
    
        const d = getCardDef(card);
        if (d.type !== "char") {
          log("通常召喚できるのはキャラクターのみです。");
          return;
        }
        if (d.summon === "kensan") {
          log(`${d.name}は見参です。見参ボタンを使ってください。`);
          return;
        }
        const empty = pickFirstEmpty(S.C);
        if (empty < 0) {
          log("Cスロットが埋まっています。");
          return;
        }
    
        // コスト：手札から「コスト枚数」捨て（簡易）
        const cost = d.cost || 0;
        if (S.hand.length - 1 < cost) {
          log(`手札が足りません（必要：${cost}枚捨て）。`);
          return;
        }
    
        const summonCard = S.hand.splice(handIndex, 1)[0];
        for (let i = 0; i < cost; i++) {
          const dump = S.hand.pop();
          if (dump) sendToWing(side, dump, { reason: "cost", bySide: side });
        }
    
        S.C[empty] = summonCard;
        log(`${sideName(side)}は ${d.name} を通常召喚（C${empty + 1}）。`);
    
        onEnterField(side, summonCard);
    
        render();
      }
    
      function onEnterField(side, charCard) {
        const st = state();
        const d = getCardDef(charCard);
    
        // 26/27：登場時（捨て→美少女戦士サーチ）
        if (d.no === 26 || d.no === 27) {
          const S = st.sides[side];
          if (S.hand.length === 0) {
            log(`${d.name}：手札が無いため、捨てられずサーチ不発。`);
            return;
          }
          // 1枚捨て（末尾）
          const dump = S.hand.pop();
          if (dump) sendToWing(side, dump, { reason: "cost", bySide: side });
          // サーチ：デッキからタグ「美少女戦士」
          const idx = S.deck.findIndex((c) => (Cards.get(c.no).tags || []).includes("美少女戦士"));
          if (idx >= 0) {
            const found = S.deck.splice(idx, 1)[0];
            S.hand.push(found);
            log(`${d.name}：デッキから【${Cards.get(found.no).name}】をサーチし手札へ。`);
          } else {
            log(`${d.name}：デッキにタグ「美少女戦士」が見つからず不発。`);
          }
          return;
        }
    
        // 28：登場時「怨霊撲滅屋GB」サーチ
        if (d.no === 28) {
          const S = st.sides[side];
          const idx = S.deck.findIndex((c) => Cards.get(c.no).name.includes("怨霊撲滅屋GB"));
          if (idx >= 0) {
            const found = S.deck.splice(idx, 1)[0];
            S.hand.push(found);
            log(`${d.name}：デッキから【${Cards.get(found.no).name}】をサーチし手札へ。`);
          } else {
            log(`${d.name}：デッキに「怨霊撲滅屋GB」が見つからず不発（カード未収録の可能性）。`);
          }
          return;
        }
      }
    
      /* ================================
        8) アイテム・エフェ/カウンター
      ================================= */
      function placeToEFromHand(side, handIndex) {
        const st = state();
        const S = st.sides[side];
        const card = S.hand[handIndex];
        if (!card) return;
    
        const d = getCardDef(card);
        if (d.type !== "effect" && d.type !== "item") {
          log("Eに置けるのはエフェクト/アイテムです。");
          return;
        }
        const empty = pickFirstEmpty(S.E);
        if (empty < 0) {
          log("Eスロットが埋まっています。");
          return;
        }
    
        // コスト：手札から「コスト枚数」捨て（簡易）
        const cost = d.cost || 0;
        if (S.hand.length - 1 < cost) {
          log(`手札が足りません（必要：${cost}枚捨て）。`);
          return;
        }
    
        const placeCard = S.hand.splice(handIndex, 1)[0];
        for (let i = 0; i < cost; i++) {
          const dump = S.hand.pop();
          if (dump) sendToWing(side, dump, { reason: "cost", bySide: side });
        }
    
        S.E[empty] = placeCard;
        log(`${sideName(side)}は ${d.name} をE${empty + 1}に配置。`);
        render();
      }
    
      function equipItem(side, eIndex, cIndex) {
        const st = state();
        const S = st.sides[side];
        const item = S.E[eIndex];
        const chr = S.C[cIndex];
        if (!item || !chr) return;
    
        const id = getCardDef(item);
        const cd = getCardDef(chr);
        if (id.type !== "item") {
          log("装備できるのはアイテムのみです。");
          return;
        }
    
        // レイチェル封印：装備は相手側に関係ないのでOK
        // 既に装備している場合は外してウイングへ
        const prev = getEquippedItem(side, chr.uid);
        if (prev) {
          setEquippedItem(side, chr.uid, null);
          delete S.equipOf[chr.uid];
          sendToWing(side, prev, { reason: "equipReplace", bySide: side });
          log(`${sideName(side)}は装備を交換。旧装備はウイングへ。`);
        }
    
        // Eから外して装備スロットへ
        S.E[eIndex] = null;
        S.equipOf[chr.uid] = item.uid;
        setEquippedItem(side, chr.uid, item);
        log(`${sideName(side)}は ${cd.name} に ${id.name} を装備。`);
        render();
      }
    
      // 発動処理（効果/アイテム）
      function requestActivateFromE(side, eIndex) {
        const st = state();
        const S = st.sides[side];
        const card = S.E[eIndex];
        if (!card) return;
    
        const d = getCardDef(card);
        if (d.type !== "effect" && d.type !== "item") return;
    
        // レイチェル封印チェック
        if (isSealedByRachel(side, d)) {
          log(`${d.name}はレイチェルの封印により効果発動できません。`);
          return;
        }
    
        st.pendingActivation = { side, cardUid: card.uid, fromZone: "E", slotIndex: eIndex, kind: d.type };
        st.chain = [{ type: "activate", side, cardUid: card.uid, fromZone: "E", slotIndex: eIndex, kind: d.type }];
    
        // 反応候補を提示
        openReactionWindow(side, card);
      }
    
      function openReactionWindow(activatorSide, activatedCard) {
        const st = state();
        const reactiveSide = other(activatorSide);
        const R = st.sides[reactiveSide];
    
        const activatedDef = getCardDef(activatedCard);
    
        // 反応カード（手札に 08/14 があるか）
        const idx08 = R.hand.findIndex((c) => c.no === 8);
        const idx14 = R.hand.findIndex((c) => c.no === 14);
    
        // 先にUI上は「常時表示ボタン」の要件を満たすため、ここでモーダルを出す
        st.ui.reaction = {
          open: true,
          activatorSide,
          activatedUid: activatedCard.uid,
          options: [],
        };
    
        if (idx08 >= 0) st.ui.reaction.options.push({ no: 8, handIndex: idx08, name: "手形(08)で無効化" });
        if (idx14 >= 0) st.ui.reaction.options.push({ no: 14, handIndex: idx14, name: "記憶抹消(14)で無効化" });
        st.ui.reaction.options.push({ no: 0, handIndex: -1, name: "反応しない（発動を通す）" });
    
        // AIなら自動選択
        if (reactiveSide === SIDE_AI) {
          // 優先：14 > 08 > 通す
          let pick = 0;
          if (idx14 >= 0) pick = 14;
          else if (idx08 >= 0) pick = 8;
          resolveReactionChoice(pick);
          return;
        }
    
        render();
      }
    
      function resolveReactionChoice(chosenNo) {
        const st = state();
        const rx = st.ui.reaction;
        if (!rx || !rx.open) return;
    
        const activatorSide = rx.activatorSide;
        const reactiveSide = other(activatorSide);
        const R = st.sides[reactiveSide];
    
        const activation = st.pendingActivation;
        if (!activation) {
          rx.open = false;
          render();
          return;
        }
    
        const activatedCard = removeCardByUidFromAnyZone(activatorSide, activation.cardUid);
        // 発動カードは「一時的に外す」→結果に応じてウイングへor解決
        // （無効化でウイングへ、通ったら効果解決後にウイングへ）
        const activatedDef = getCardDef(activatedCard);
    
        rx.open = false;
        st.ui.reaction = null;
    
        if (chosenNo === 0 || !activatedCard) {
          if (!activatedCard) {
            log("発動カードが見つかりません（既に移動済み）。");
            st.pendingActivation = null;
            st.chain = [];
            render();
            return;
          }
          // 通す
          log(`${sideName(reactiveSide)}は反応しない。${activatedDef.name}の発動が通ります。`);
          resolveActivatedCard(activatorSide, activatedCard, activation);
          return;
        }
    
        // カウンターを支払う（手札から取り除きウイングへ）
        const idx = R.hand.findIndex((c) => c.no === chosenNo);
        if (idx < 0) {
          log("反応カードが見つかりません。発動を通します。");
          resolveActivatedCard(activatorSide, activatedCard, activation);
          return;
        }
        const counterCard = R.hand.splice(idx, 1)[0];
        const counterDef = getCardDef(counterCard);
    
        log(`${sideName(reactiveSide)}は【${counterDef.name}】で発動を無効化。`);
    
        // 無効化結果：
        // 14 の場合：発動カードをウイングへ（要件）
        // 08 の場合：簡易として同様に発動カードをウイングへ
        sendToWing(reactiveSide, counterCard, { reason: "counter", bySide: reactiveSide });
    
        // 発動カードの移動先
        sendToWing(activatorSide, activatedCard, { reason: "negated", bySide: reactiveSide });
        log(`無効化されたため、${activatedDef.name}はウイングへ送られました。`);
    
        st.pendingActivation = null;
        st.chain = [];
        render();
      }
    
      function resolveActivatedCard(side, activatedCard, activationMeta) {
        const st = state();
        const d = getCardDef(activatedCard);
    
        // 効果解決（簡易）
        if (d.type === "effect") {
          // 今回の 23〜29 には効果カードが追加されていないため、汎用の簡易効果：
          // 「相手キャラ1体を破壊（ATKが低い順）」として実装
          const opp = other(side);
          const O = st.sides[opp];
          const targetIdx = O.C.findIndex((c) => c);
          if (targetIdx >= 0) {
            const target = O.C[targetIdx];
            O.C[targetIdx] = null;
            log(`${d.name}：相手の ${getCardDef(target).name} を破壊。`);
            sendToWing(opp, target, { reason: "effect", bySide: side });
          } else {
            log(`${d.name}：相手に対象がなく不発。`);
          }
          sendToWing(side, activatedCard, { reason: "resolved", bySide: side });
          st.pendingActivation = null;
          st.chain = [];
          render();
          return;
        }
    
        if (d.type === "item") {
          // アイテムを「自動装備」する仕様は危険なので、解決はウイングへ（発動型アイテムの想定）
          log(`${d.name}：この簡易版では「発動型アイテム」は処理せずウイングへ送ります（装備はE→装備ボタン）。`);
          sendToWing(side, activatedCard, { reason: "resolved", bySide: side });
          st.pendingActivation = null;
          st.chain = [];
          render();
          return;
        }
      }
    
      /* ================================
        9) フィールド能力（23〜29）
      ================================= */
      function canActivateFieldAbility(side, cIndex) {
        const st = state();
        const S = st.sides[side];
        const card = S.C[cIndex];
        if (!card) return { ok: false, reason: "空です" };
        if (st.currentSide !== side) return { ok: false, reason: "自分のターンのみ" };
        if (st.phase !== PHASE_MAIN) return { ok: false, reason: "メインでのみ" };
    
        const d = getCardDef(card);
    
        // レイチェル封印は「相手の怨霊/霊魂」だけなので、自分の能力には関係なし
        if (d.no === 28 || d.no === 29) {
          if (S.perTurnUsed[card.uid]) return { ok: false, reason: "このターンは既に使用済み" };
          return { ok: true, reason: "" };
        }
    
        return { ok: false, reason: "能力なし" };
      }
    
      function activateFieldAbility(side, cIndex) {
        const st = state();
        const S = st.sides[side];
        const card = S.C[cIndex];
        if (!card) return;
    
        const chk = canActivateFieldAbility(side, cIndex);
        if (!chk.ok) {
          log(`能力発動不可：${chk.reason}`);
          return;
        }
    
        const d = getCardDef(card);
    
        // 28：レイチェル条件無視見参（1T1）
        if (d.no === 28) {
          const empty = pickFirstEmpty(S.C);
          if (empty < 0) {
            log("Cスロットが埋まっているため、レイチェルを出せません。");
            return;
          }
          const idx = S.hand.findIndex((c) => c.no === 23);
          if (idx < 0) {
            log("手札にレイチェルがいません。");
            return;
          }
          const rachel = S.hand.splice(idx, 1)[0];
          S.C[empty] = rachel;
          S.perTurnUsed[card.uid] = true;
          log(`${d.name}：条件無視で レイチェル を見参（C${empty + 1}）。`);
          onEnterField(side, rachel);
          render();
          return;
        }
    
        // 29：BUGBUGアイテムサーチ（1T1）
        if (d.no === 29) {
          // サーチ対象：titleTag が BUGBUG西遊記 かつ item
          const found = searchFromDeckThenWing(side, (c) => {
            const cd = Cards.get(c.no);
            return cd.type === "item" && cd.titleTag === "BUGBUG西遊記";
          });
          if (found) {
            S.hand.push(found.card);
            S.perTurnUsed[card.uid] = true;
            log(`${d.name}：サーチ成功 → ${Cards.get(found.card.no).name} を手札へ（出所：${found.from}）。`);
          } else {
            S.perTurnUsed[card.uid] = true;
            log(`${d.name}：BUGBUGアイテムが見つからず不発（カード未収録の可能性）。`);
          }
          render();
          return;
        }
      }
    
      function searchFromDeckThenWing(side, predicate) {
        const st = state();
        const S = st.sides[side];
        let idx = S.deck.findIndex(predicate);
        if (idx >= 0) {
          const card = S.deck.splice(idx, 1)[0];
          return { from: "deck", card };
        }
        idx = S.wing.findIndex(predicate);
        if (idx >= 0) {
          const card = S.wing.splice(idx, 1)[0];
          return { from: "wing", card };
        }
        return null;
      }
    
      /* ================================
        10) 戦闘
      ================================= */
      function beginBattlePhase(side) {
        const st = state();
        if (st.currentSide !== side) return;
        if (st.turn === 1) {
          log("ターン1はバトルに入れません。");
          return;
        }
        st.phase = PHASE_BATTLE;
        log(`${sideName(side)}のバトルフェイズ。`);
        render();
      }
    
      function endPhase(side) {
        const st = state();
        if (st.currentSide !== side) return;
    
        if (st.phase === PHASE_MAIN) {
          beginBattlePhase(side);
          return;
        }
        if (st.phase === PHASE_BATTLE) {
          endTurn(side);
          return;
        }
      }
    
      function endTurn(side) {
        const st = state();
        const S = st.sides[side];
    
        // 手札上限（要件）：超過分は自分で選んでウイングへ → 簡易版は末尾から
        while (S.hand.length > HAND_LIMIT) {
          const dump = S.hand.pop();
          if (dump) {
            sendToWing(side, dump, { reason: "handLimit", bySide: side });
            log(`手札上限により ${getCardDef(dump).name} をウイングへ。`);
          }
        }
    
        // ターン終了：攻撃回数/能力使用リセット
        S.attacksUsed = {};
        S.perTurnUsed = {};
    
        // 次のターンへ
        const next = other(side);
        st.currentSide = next;
        st.turn += next === SIDE_P1 ? 1 : 0; // 1ターン = 両者が行動、表示上はあなた開始時に+1（簡易）
    
        // バトル不可ロック解除（ターン1終了後）
        for (const sd of [SIDE_P1, SIDE_AI]) state().sides[sd].turn1BattleLock = false;
    
        st.phase = PHASE_MAIN;
        log(`ターン交代：${sideName(next)}のメインフェイズ。`);
    
        // ドロー
        draw(next, 1);
    
        render();
    
        if (next === SIDE_AI) {
          aiTakeTurn();
        }
      }
    
      function requestAttack(attackerIdx, defenderIdx) {
        const st = state();
        const side = st.currentSide;
        const opp = other(side);
    
        if (!canBattleNow(side)) {
          log("今はバトルできません。");
          return;
        }
    
        const S = st.sides[side];
        const O = st.sides[opp];
    
        const attacker = S.C[attackerIdx];
        const defender = O.C[defenderIdx];
        if (!attacker) return;
    
        const used = S.attacksUsed[attacker.uid] || 0;
        const max = maxAttacks(side, attacker);
        if (used >= max) {
          log(`${getCardDef(attacker).name} はこのターンこれ以上攻撃できません（${used}/${max}）。`);
          return;
        }
    
        // 直接攻撃（相手にキャラがいなければシールドへ）
        if (!defender) {
          if (O.shield.length > 0) {
            S.attacksUsed[attacker.uid] = used + 1;
            breakOneShieldToHand(opp, "直接攻撃");
            render();
            return;
          } else {
            // シールド無しなら勝利
            endGame(side, "directAttack");
            return;
          }
        }
    
        // バトル
        const aAtk = calcAtk(side, attacker);
        const dAtk = calcAtk(opp, defender);
    
        S.attacksUsed[attacker.uid] = used + 1;
    
        log(`${getCardDef(attacker).name}（ATK ${aAtk}）が ${getCardDef(defender).name}（ATK ${dAtk}）へ攻撃。`);
    
        if (aAtk > dAtk) {
          // defender 破壊
          O.C[defenderIdx] = null;
          log(`${getCardDef(defender).name} は破壊されウイングへ。`);
          sendToWing(opp, defender, { reason: "battle", bySide: side });
    
          // 23：勝利時シールド破壊
          if (attacker.no === 23) {
            breakOneShieldToHand(opp, "レイチェルの勝利効果");
          }
    
        } else if (aAtk < dAtk) {
          // attacker 破壊
          S.C[attackerIdx] = null;
          log(`${getCardDef(attacker).name} は破壊されウイングへ。`);
          sendToWing(side, attacker, { reason: "battle", bySide: opp });
        } else {
          // 相打ち
          O.C[defenderIdx] = null;
          S.C[attackerIdx] = null;
          log("相打ち：双方ウイングへ。");
          sendToWing(opp, defender, { reason: "battle", bySide: side });
          sendToWing(side, attacker, { reason: "battle", bySide: opp });
        }
    
        render();
      }
    
      /* ================================
        11) 25 のトリガー（送られた時）
      ================================= */
      function onSentToWing(cardSide, card, meta) {
        const st = state();
        const d = getCardDef(card);
    
        // 25：相手の効果 or バトルでウイングへ送られた時
        if (d.no === 25) {
          const by = meta.bySide;
          const reason = meta.reason;
          if ((reason === "battle" || reason === "effect") && (by === SIDE_P1 || by === SIDE_AI) && by !== cardSide) {
            const S = st.sides[cardSide];
            const emptyCount = S.C.filter((x) => !x).length;
            if (emptyCount <= 0) {
              log("小次郎＆小太郎：空きがないため見参できず。");
              return;
            }
            // サーチ：デッキ→ウイングの順で、名称に小次郎/小太郎を含み、cost<=4 を最大2体
            const picks = [];
            const collect = (zoneName) => {
              const Z = S[zoneName];
              for (let i = 0; i < Z.length; i++) {
                const c = Z[i];
                if (!c) continue;
                const cd = Cards.get(c.no);
                const okName = cd.name.includes("小次郎") || cd.name.includes("小太郎");
                if (!okName) continue;
                if ((cd.cost || 99) > 4) continue;
                picks.push({ zoneName, idx: i, card: c, atk: cd.atk || 0 });
              }
            };
            collect("deck");
            collect("wing");
    
            if (picks.length === 0) {
              log("小次郎＆小太郎：対象が見つからず不発。");
              return;
            }
    
            // プレイヤーは強制で最大2体：簡易としてATKが高い順に選ぶ
            picks.sort((a, b) => b.atk - a.atk);
            const take = picks.slice(0, Math.min(2, emptyCount, picks.length));
    
            for (const p of take) {
              const S2 = st.sides[cardSide];
              const empty = pickFirstEmpty(S2.C);
              if (empty < 0) break;
    
              const got = S2[p.zoneName].splice(p.idx, 1)[0];
              S2.C[empty] = got;
              log(`小次郎＆小太郎：${Cards.get(got.no).name} を見参（C${empty + 1}／出所:${p.zoneName}）。`);
              onEnterField(cardSide, got);
            }
          }
        }
      }
    
      /* ================================
        12) AI（簡易）
      ================================= */
      function aiTakeTurn() {
        const st = state();
        if (st.phase === "END") return;
    
        const side = SIDE_AI;
        const S = st.sides[side];
    
        // 1) 可能ならキャラを見参/召喚
        let acted = false;
    
        // 優先：見参できるやつ（コスト支払いは簡易）
        for (let i = 0; i < S.hand.length; i++) {
          const c = S.hand[i];
          const d = Cards.get(c.no);
          if (d.type === "char" && d.summon === "kensan" && canKensanSummon(side, c.no)) {
            if (pickFirstEmpty(S.C) >= 0 && S.hand.length - 1 >= (d.cost || 0)) {
              kensanSummonFromHand(side, i);
              acted = true;
              break;
            }
          }
        }
    
        if (!acted) {
          for (let i = 0; i < S.hand.length; i++) {
            const c = S.hand[i];
            const d = Cards.get(c.no);
            if (d.type === "char" && d.summon === "normal") {
              if (pickFirstEmpty(S.C) >= 0 && S.hand.length - 1 >= (d.cost || 0)) {
                normalSummonFromHand(side, i);
                acted = true;
                break;
              }
            }
          }
        }
    
        // 2) アイテムをEに置く
        for (let i = 0; i < S.hand.length; i++) {
          const c = S.hand[i];
          const d = Cards.get(c.no);
          if ((d.type === "item" || d.type === "effect") && pickFirstEmpty(S.E) >= 0 && S.hand.length - 1 >= (d.cost || 0)) {
            placeToEFromHand(side, i);
            break;
          }
        }
    
        // 3) 装備（最初のアイテムを最初のキャラに）
        const eIdx = S.E.findIndex((c) => c && Cards.get(c.no).type === "item");
        const cIdx = S.C.findIndex((c) => c);
        if (eIdx >= 0 && cIdx >= 0) {
          equipItem(side, eIdx, cIdx);
        }
    
        // 4) 28/29の能力（あれば使う）
        const idx28 = S.C.findIndex((c) => c && c.no === 28);
        if (idx28 >= 0) activateFieldAbility(side, idx28);
        const idx29 = S.C.findIndex((c) => c && c.no === 29);
        if (idx29 >= 0) activateFieldAbility(side, idx29);
    
        // 5) バトルへ
        if (state().turn !== 1) beginBattlePhase(side);
    
        // 6) 攻撃（前から順に、相手の前から）
        if (state().phase === PHASE_BATTLE) {
          const opp = SIDE_P1;
          const O = st.sides[opp];
    
          for (let a = 0; a < S.C.length; a++) {
            const attacker = S.C[a];
            if (!attacker) continue;
    
            const maxA = maxAttacks(side, attacker);
            for (let k = 0; k < maxA; k++) {
              // 攻撃先：相手の最初のキャラ、いなければ直接
              const dIdx = O.C.findIndex((c) => c);
              requestAttack(a, dIdx >= 0 ? dIdx : 0);
              if (st.phase === "END") return;
            }
          }
        }
    
        // 7) ターン終了
        endTurn(side);
      }
    
      /* ================================
        13) 画面/UI
      ================================= */
      const root = (() => {
        let app = document.getElementById("app");
        if (!app) {
          app = document.createElement("div");
          app.id = "app";
          document.body.appendChild(app);
        }
        return app;
      })();
    
      const style = document.createElement("style");
      style.textContent = `
        :root { --bg:#0b0f14; --panel:#111826; --panel2:#0f1522; --text:#e7edf6; --muted:#9aa7b5; --acc:#49a6ff; --bad:#ff5a72; --good:#5dff9c; }
        body{ margin:0; background:var(--bg); color:var(--text); font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif; }
        #app{ max-width: 980px; margin: 0 auto; padding: 10px; }
        .row{ display:flex; gap:10px; flex-wrap:wrap; }
        .col{ flex:1; min-width: 280px; }
        .panel{ background:linear-gradient(180deg,var(--panel),var(--panel2)); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:10px; }
        .title{ font-weight:700; font-size:16px; margin:0 0 8px; }
        .btn{ appearance:none; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:var(--text); padding:10px 12px; border-radius:12px; font-weight:700; }
        .btn:active{ transform: translateY(1px); }
        .btn.primary{ background: rgba(73,166,255,.16); border-color: rgba(73,166,255,.35); }
        .btn.danger{ background: rgba(255,90,114,.14); border-color: rgba(255,90,114,.35); }
        .btn.small{ padding:7px 10px; border-radius:10px; font-weight:600; font-size:12px; }
        .grid{ display:grid; gap:8px; }
        .grid.cards{ grid-template-columns: repeat(2, 1fr); }
        .card{ border:1px solid rgba(255,255,255,.10); border-radius:12px; padding:8px; background:rgba(255,255,255,.04); }
        .card .name{ font-weight:800; font-size:13px; }
        .card .meta{ font-size:11px; color:var(--muted); margin-top:2px; }
        .card .txt{ white-space:pre-wrap; font-size:11px; color:rgba(231,237,246,.92); margin-top:6px; line-height:1.35; max-height: 90px; overflow:auto; }
        .zoneTitle{ font-weight:800; font-size:12px; color:var(--muted); margin: 6px 0 4px; }
        .slots{ display:flex; gap:6px; }
        .slot{ flex:1; min-width: 0; border:1px dashed rgba(255,255,255,.18); border-radius:12px; padding:6px; background:rgba(255,255,255,.02); }
        .slot .mini{ font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .slot .atk{ font-size:11px; color:var(--muted); }
        .slot .actions{ margin-top:6px; display:flex; gap:6px; flex-wrap:wrap; }
        .log{ height: 220px; overflow:auto; font-size:12px; line-height:1.35; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:8px; }
        .kbd{ font-size:11px; color:var(--muted); }
        .modal{ position:fixed; inset:0; background:rgba(0,0,0,.62); display:flex; align-items:center; justify-content:center; padding:14px; z-index:999; }
        .modal .box{ width:min(520px, 100%); background:linear-gradient(180deg,var(--panel),var(--panel2)); border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:12px; }
        .modal .box h3{ margin:0 0 8px; font-size:14px; }
        .modal .opts{ display:flex; flex-direction:column; gap:8px; }
      `;
      document.head.appendChild(style);
    
      function button(label, cls, onClick) {
        const b = document.createElement("button");
        b.className = "btn " + (cls || "");
        b.textContent = label;
        b.onclick = onClick;
        return b;
      }
    
      function cardView(card, side, extra = {}) {
        const d = getCardDef(card);
        const div = document.createElement("div");
        div.className = "card";
        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = d.name;
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `No.${pad2(d.no)} / ${d.type.toUpperCase()} / COST ${d.cost || 0}` + (d.type === "char" ? ` / ATK ${d.atk}` : "");
        const txt = document.createElement("div");
        txt.className = "txt";
        txt.textContent = d.text || "";
        div.appendChild(nm);
        div.appendChild(meta);
        div.appendChild(txt);
        return div;
      }
    
      function renderLog() {
        const el = document.getElementById("mw_log");
        if (!el) return;
        el.textContent = logLines.join("\n");
        el.scrollTop = el.scrollHeight;
      }
    
      function renderMenu() {
        root.innerHTML = "";
        const p = document.createElement("div");
        p.className = "panel";
        const h = document.createElement("div");
        h.className = "title";
        h.textContent = "Manpuku World（v50019+ / 23〜29実装版）";
        p.appendChild(h);
    
        const s = document.createElement("div");
        s.className = "kbd";
        s.textContent = "※ 21・22・30は今回除外。23〜29は実装。08/14のカウンター反応は簡易実装。";
        p.appendChild(s);
    
        const row = document.createElement("div");
        row.className = "row";
        row.appendChild(button("ゲーム開始", "primary", () => { game.screen = "game"; initGame(); }));
        row.appendChild(button("デッキ編集", "", () => { game.screen = "deck"; render(); }));
        row.appendChild(button("セーブ初期化", "danger", () => {
          localStorage.removeItem(LS_KEY);
          game.save = ensureSave();
          log("セーブを初期化しました。");
          render();
        }));
        p.appendChild(row);
    
        root.appendChild(p);
    
        const logPanel = document.createElement("div");
        logPanel.className = "panel";
        const ht = document.createElement("div");
        ht.className = "title";
        ht.textContent = "ログ";
        logPanel.appendChild(ht);
        const logBox = document.createElement("div");
        logBox.id = "mw_log";
        logBox.className = "log";
        logPanel.appendChild(logBox);
        root.appendChild(logPanel);
    
        renderLog();
      }
    
      function renderDeck() {
        root.innerHTML = "";
        const p = document.createElement("div");
        p.className = "panel";
        const h = document.createElement("div");
        h.className = "title";
        h.textContent = "デッキ編集（40枚固定）";
        p.appendChild(h);
    
        const back = button("戻る", "", () => { game.screen = "menu"; render(); });
        p.appendChild(back);
    
        const deck = game.save.deck.slice();
        const col = game.save.collection;
    
        const info = document.createElement("div");
        info.className = "kbd";
        info.textContent = `所持：各3枚（1〜29）。デッキ：${deck.length}/40`;
        p.appendChild(info);
    
        const wrap = document.createElement("div");
        wrap.className = "row";
    
        // 所持一覧
        const left = document.createElement("div");
        left.className = "col panel";
        const lt = document.createElement("div");
        lt.className = "title";
        lt.textContent = "所持カード（タップでデッキへ追加）";
        left.appendChild(lt);
    
        const grid = document.createElement("div");
        grid.className = "grid cards";
    
        const usedCount = {};
        for (const n of deck) usedCount[n] = (usedCount[n] || 0) + 1;
    
        for (let no = 1; no <= MAX_CARD_NO; no++) {
          if (!Cards.has(no)) continue;
          const owned = col[pad2(no)] || 0;
          const used = usedCount[no] || 0;
          const remain = owned - used;
    
          const d = Cards.get(no);
          const tile = document.createElement("div");
          tile.className = "card";
          const nm = document.createElement("div");
          nm.className = "name";
          nm.textContent = `${d.name}`;
          const meta = document.createElement("div");
          meta.className = "meta";
          meta.textContent = `${d.type.toUpperCase()} / COST ${d.cost || 0}` + (d.type === "char" ? ` / ATK ${d.atk}` : "") + ` / 残り ${remain}`;
          tile.appendChild(nm);
          tile.appendChild(meta);
    
          tile.onclick = () => {
            if (deck.length >= 40) return;
            if (remain <= 0) return;
            deck.push(no);
            applyDeck(deck);
          };
    
          grid.appendChild(tile);
        }
    
        left.appendChild(grid);
    
        // デッキ側
        const right = document.createElement("div");
        right.className = "col panel";
        const rt = document.createElement("div");
        rt.className = "title";
        rt.textContent = "デッキ（タップで削除）";
        right.appendChild(rt);
    
        const list = document.createElement("div");
        list.className = "grid";
        for (let i = 0; i < deck.length; i++) {
          const no = deck[i];
          const d = Cards.get(no);
          const tile = document.createElement("div");
          tile.className = "card";
          const nm = document.createElement("div");
          nm.className = "name";
          nm.textContent = `${i + 1}. ${d.name}`;
          const meta = document.createElement("div");
          meta.className = "meta";
          meta.textContent = `${d.type.toUpperCase()} / COST ${d.cost || 0}` + (d.type === "char" ? ` / ATK ${d.atk}` : "");
          tile.appendChild(nm);
          tile.appendChild(meta);
          tile.onclick = () => {
            deck.splice(i, 1);
            applyDeck(deck);
          };
          list.appendChild(tile);
        }
    
        const saveBtn = button("保存", "primary", () => {
          if (deck.length !== 40) {
            alert("デッキは40枚固定です。");
            return;
          }
          game.save.deck = deck.slice();
          saveSave(game.save);
          log("デッキを保存しました。");
          render();
        });
    
        right.appendChild(saveBtn);
        right.appendChild(list);
    
        wrap.appendChild(left);
        wrap.appendChild(right);
    
        root.appendChild(p);
        root.appendChild(wrap);
      }
    
      function applyDeck(newDeck) {
        // 再描画（リアルタイム編集）
        game.save.deck = newDeck.slice();
        renderDeck();
      }
    
      function renderGame() {
        root.innerHTML = "";
        const st = state();
    
        const top = document.createElement("div");
        top.className = "panel";
        const title = document.createElement("div");
        title.className = "title";
        const p = st.phase;
        title.textContent = `ターン：${st.turn} / 手番：${sideName(st.currentSide)} / フェイズ：${p}`;
        top.appendChild(title);
    
        const btnRow = document.createElement("div");
        btnRow.className = "row";
    
        btnRow.appendChild(button("メニューへ", "", () => { game.screen = "menu"; render(); }));
    
        if (st.phase !== "END") {
          btnRow.appendChild(button("フェイズ進行（MAIN→BATTLE→END）", "primary", () => endPhase(st.currentSide)));
        }
    
        top.appendChild(btnRow);
        root.appendChild(top);
    
        const board = document.createElement("div");
        board.className = "row";
    
        const mkSidePanel = (side) => {
          const S = st.sides[side];
          const panel = document.createElement("div");
          panel.className = "col panel";
    
          const t = document.createElement("div");
          t.className = "title";
          t.textContent = `${sideName(side)}（Deck:${S.deck.length} / Hand:${S.hand.length} / Shield:${S.shield.length} / Wing:${S.wing.length}）`;
          panel.appendChild(t);
    
          // C
          const zc = document.createElement("div");
          zc.className = "zoneTitle";
          zc.textContent = "C（キャラ）";
          panel.appendChild(zc);
    
          const cSlots = document.createElement("div");
          cSlots.className = "slots";
          for (let i = 0; i < S.C.length; i++) {
            const slot = document.createElement("div");
            slot.className = "slot";
            const c = S.C[i];
            if (!c) {
              slot.innerHTML = `<div class="mini">（空）</div>`;
            } else {
              const d = getCardDef(c);
              const atkNow = calcAtk(side, c);
              const used = S.attacksUsed[c.uid] || 0;
              const mx = maxAttacks(side, c);
              const eq = getEquippedItem(side, c.uid);
              const eqName = eq ? Cards.get(eq.no).name : "なし";
    
              slot.innerHTML =
                `<div class="mini"><b>${d.name}</b></div>` +
                `<div class="atk">ATK ${atkNow}（基礎${d.atk}） / 攻撃 ${used}/${mx}</div>` +
                `<div class="atk">装備：${eqName}</div>`;
    
              const actions = document.createElement("div");
              actions.className = "actions";
    
              // 能力ボタン（常時表示・押して判定）
              const abil = button("効果発動", "small", () => {
                const res = canActivateFieldAbility(side, i);
                if (!res.ok) {
                  log(`効果発動不可：${res.reason}`);
                  return;
                }
                activateFieldAbility(side, i);
              });
              actions.appendChild(abil);
    
              // 攻撃ボタン（自分が攻撃側の時のみ）
              if (side === st.currentSide && side === SIDE_P1 && st.phase === PHASE_BATTLE && st.turn !== 1) {
                const atkBtn = button("攻撃", "small primary", () => {
                  // 対象は相手の最初のキャラ（簡易）／いなければ直接
                  const opp = other(side);
                  const O = st.sides[opp];
                  const dIdx = O.C.findIndex((x) => x);
                  requestAttack(i, dIdx >= 0 ? dIdx : 0);
                });
                actions.appendChild(atkBtn);
              }
    
              slot.appendChild(actions);
            }
            cSlots.appendChild(slot);
          }
          panel.appendChild(cSlots);
    
          // E
          const ze = document.createElement("div");
          ze.className = "zoneTitle";
          ze.textContent = "E（エフェ/アイテム）";
          panel.appendChild(ze);
    
          const eSlots = document.createElement("div");
          eSlots.className = "slots";
          for (let i = 0; i < S.E.length; i++) {
            const slot = document.createElement("div");
            slot.className = "slot";
            const c = S.E[i];
            if (!c) {
              slot.innerHTML = `<div class="mini">（空）</div>`;
            } else {
              const d = getCardDef(c);
              slot.innerHTML = `<div class="mini"><b>${d.name}</b></div><div class="atk">${d.type.toUpperCase()} / COST ${d.cost || 0}</div>`;
              const actions = document.createElement("div");
              actions.className = "actions";
    
              if (side === SIDE_P1 && st.currentSide === SIDE_P1 && st.phase === PHASE_MAIN) {
                if (d.type === "item") {
                  // 装備先：最初の自分C
                  actions.appendChild(button("装備", "small primary", () => {
                    const ci = st.sides[side].C.findIndex((x) => x);
                    if (ci < 0) {
                      log("装備先のキャラがいません。");
                      return;
                    }
                    equipItem(side, i, ci);
                  }));
                }
                // 発動（常時表示ボタンの要件）
                actions.appendChild(button("発動", "small", () => requestActivateFromE(side, i)));
              }
    
              slot.appendChild(actions);
            }
            eSlots.appendChild(slot);
          }
          panel.appendChild(eSlots);
    
          // 手札（P1のみ表示）
          if (side === SIDE_P1) {
            const zh = document.createElement("div");
            zh.className = "zoneTitle";
            zh.textContent = "手札（タップで選択→下の操作）";
            panel.appendChild(zh);
    
            const handGrid = document.createElement("div");
            handGrid.className = "grid cards";
            for (let i = 0; i < S.hand.length; i++) {
              const c = S.hand[i];
              const d = getCardDef(c);
              const tile = document.createElement("div");
              tile.className = "card";
              tile.style.outline = st.ui.selectedHandIndex === i ? "2px solid rgba(73,166,255,.7)" : "";
              tile.innerHTML =
                `<div class="name">${d.name}</div>` +
                `<div class="meta">${d.type.toUpperCase()} / COST ${d.cost || 0}` + (d.type === "char" ? ` / ATK ${d.atk}` : "") + `</div>` +
                `<div class="txt">${(d.text || "").slice(0, 120)}</div>`;
              tile.onclick = () => {
                st.ui.selectedHandIndex = st.ui.selectedHandIndex === i ? -1 : i;
                render();
              };
              handGrid.appendChild(tile);
            }
            panel.appendChild(handGrid);
    
            // 手札操作
            const act = document.createElement("div");
            act.className = "row";
            const idx = st.ui.selectedHandIndex;
    
            act.appendChild(button("通常召喚", "small primary", () => {
              if (idx < 0) return log("手札を選択してください。");
              if (st.currentSide !== SIDE_P1 || st.phase !== PHASE_MAIN) return log("自分メインでのみ。");
              normalSummonFromHand(SIDE_P1, idx);
              st.ui.selectedHandIndex = -1;
            }));
    
            act.appendChild(button("見参", "small primary", () => {
              if (idx < 0) return log("手札を選択してください。");
              if (st.currentSide !== SIDE_P1 || st.phase !== PHASE_MAIN) return log("自分メインでのみ。");
              kensanSummonFromHand(SIDE_P1, idx);
              st.ui.selectedHandIndex = -1;
            }));
    
            act.appendChild(button("Eに配置", "small", () => {
              if (idx < 0) return log("手札を選択してください。");
              if (st.currentSide !== SIDE_P1 || st.phase !== PHASE_MAIN) return log("自分メインでのみ。");
              placeToEFromHand(SIDE_P1, idx);
              st.ui.selectedHandIndex = -1;
            }));
    
            panel.appendChild(act);
          }
    
          return panel;
        };
    
        // AI（上）→P1（下）の順
        board.appendChild(mkSidePanel(SIDE_AI));
        board.appendChild(mkSidePanel(SIDE_P1));
    
        root.appendChild(board);
    
        const logPanel = document.createElement("div");
        logPanel.className = "panel";
        const ht = document.createElement("div");
        ht.className = "title";
        ht.textContent = "ログ";
        logPanel.appendChild(ht);
        const logBox = document.createElement("div");
        logBox.id = "mw_log";
        logBox.className = "log";
        logPanel.appendChild(logBox);
        root.appendChild(logPanel);
    
        renderLog();
    
        // 反応モーダル
        if (st.ui.reaction && st.ui.reaction.open) {
          const rx = st.ui.reaction;
          const activatorSide = rx.activatorSide;
          const modal = document.createElement("div");
          modal.className = "modal";
          const box = document.createElement("div");
          box.className = "box";
          const h3 = document.createElement("h3");
          h3.textContent = `チェーン反応（${sideName(other(activatorSide))}）`;
          box.appendChild(h3);
          const p = document.createElement("div");
          p.className = "kbd";
          p.textContent = "手形(08)/記憶抹消(14)が使える場合、どちらで反応するか選択します。";
          box.appendChild(p);
    
          const opts = document.createElement("div");
          opts.className = "opts";
          for (const opt of rx.options) {
            const b = button(opt.name, opt.no === 0 ? "" : "primary", () => resolveReactionChoice(opt.no));
            opts.appendChild(b);
          }
          box.appendChild(opts);
          modal.appendChild(box);
          document.body.appendChild(modal);
    
          // クリックで閉じない（誤タップ防止）
        }
      }
    
      function render() {
        if (game.screen === "menu") renderMenu();
        else if (game.screen === "deck") renderDeck();
        else if (game.screen === "game") renderGame();
      }
    
      // 初期表示
      render();
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __mw_boot, { once: true });
  } else {
    __mw_boot();
  }
})();
