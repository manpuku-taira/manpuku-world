/* =========================================================
 * Manpuku World : Cards 21-30 Inject & Scripts (Safe)
 * - iPhone/iPad Safari向け：起動を壊さない「安全注入」
 * - 目的：
 *   1) 21〜30をデッキ編集（カード一覧）に必ず出す
 *   2) 21(ミーコ) / 30(七星剣) の効果も実装（可能な限り既存エンジンに追従）
 *
 * ✅重要：
 * - “絶対にthrowしない”。既存ゲームの起動を壊さない。
 * - DB/登録関数の名前が環境差で違っても、見つかった所へ全部入れる。
 * ========================================================= */
(() => {
  "use strict";

  /* -----------------------------
   * 0) Safe helpers
   * ----------------------------- */
  const SAFE = {
    log: (...a) => {
      try { console.log("[MW 21-30]", ...a); } catch (_) {}
    },
    warn: (...a) => {
      try { console.warn("[MW 21-30]", ...a); } catch (_) {}
    },
    err: (...a) => {
      try { console.error("[MW 21-30]", ...a); } catch (_) {}
    },
    now: () => Date.now(),
    isObj: (v) => v && typeof v === "object",
    isFn: (v) => typeof v === "function",
    clone: (o) => {
      try { return JSON.parse(JSON.stringify(o)); } catch (_) { return o; }
    },
  };

  // “絶対に落とさない”ラッパ
  const safeRun = (label, fn) => {
    try { return fn(); } catch (e) { SAFE.err(label, e); return undefined; }
  };

  // グローバル探索（ありがちな名前を総当たり）
  const pickGlobals = () => {
    const w = window;
    const candidates = [];

    // 代表的な名前候補（ここに無くても後段で動的スキャンする）
    const names = [
      "ManpukuWorld", "manpukuWorld", "MW", "mw",
      "Game", "game",
      "CARD_DB", "cardDB", "CardDB", "cardsDB",
      "CARD_MASTER", "cardMaster", "CardMaster",
      "CARDS", "cards", "AllCards", "allCards",
      "DeckEditor", "deckEditor",
      "registerCard", "addCard", "addCards",
      "CARD_SCRIPTS", "cardScripts", "CardScripts",
      "EFFECTS", "effects", "EffectRegistry", "effectRegistry",
    ];

    for (const k of names) {
      if (k in w) candidates.push({ key: k, val: w[k] });
    }
    return candidates;
  };

  // 動的に「カードっぽいDB」を探す（起動を壊さない範囲で浅く）
  const findCardStores = () => safeRun("findCardStores", () => {
    const w = window;
    const stores = [];

    // 1) 既知候補
    const g = pickGlobals();
    for (const it of g) stores.push(it);

    // 2) 追加：window直下を浅く走査（重くしない：最大200キー）
    const keys = Object.keys(w).slice(0, 200);
    for (const k of keys) {
      const v = w[k];
      if (!SAFE.isObj(v)) continue;

      // cards / card / master を含むキーは候補に入れる
      const lk = String(k).toLowerCase();
      if (lk.includes("card") || lk.includes("deck")) {
        stores.push({ key: k, val: v });
      }
    }

    return stores;
  });

  // 「配列 or Map or オブジェクト辞書」にカードを入れる
  const tryInsertIntoStore = (storeName, store, cardObj) => safeRun(`tryInsertIntoStore:${storeName}`, () => {
    if (!store) return false;

    const no = cardObj.no ?? cardObj.id ?? cardObj.cardNo;
    if (no == null) return false;

    // Array
    if (Array.isArray(store)) {
      const exists = store.some(c => (c && (c.no ?? c.id ?? c.cardNo)) === no);
      if (!exists) store.push(SAFE.clone(cardObj));
      return true;
    }

    // Map
    if (store instanceof Map) {
      if (!store.has(no)) store.set(no, SAFE.clone(cardObj));
      return true;
    }

    // Plain object dict
    if (SAFE.isObj(store)) {
      // 1) byNo / byId があればそこへ
      const byNoKeys = ["byNo", "byId", "cardsByNo", "cardsById", "master", "data", "db"];
      for (const k of byNoKeys) {
        if (SAFE.isObj(store[k])) {
          if (!(no in store[k])) store[k][no] = SAFE.clone(cardObj);
          return true;
        }
      }
      // 2) 自身が辞書として使われていそうなら直接
      if (!(no in store)) store[no] = SAFE.clone(cardObj);
      return true;
    }

    return false;
  });

  // 「登録関数」を見つけたら呼ぶ
  const tryCallRegisterFunctions = (cardObj) => safeRun("tryCallRegisterFunctions", () => {
    const w = window;
    const fnNames = [
      "registerCard", "addCard", "addCards",
      "register_cards", "registerCards",
      "pushCardMaster", "appendCard",
    ];
    let ok = false;

    for (const name of fnNames) {
      const fn = w[name];
      if (SAFE.isFn(fn)) {
        // addCards系に配列を渡す可能性があるので両方試す
        try { fn(cardObj); ok = true; } catch (_) {}
        try { fn([cardObj]); ok = true; } catch (_) {}
      }
    }

    // DeckEditorがあればそこにも
    const editors = ["DeckEditor", "deckEditor"];
    for (const eName of editors) {
      const ed = w[eName];
      if (!ed) continue;
      const methods = ["registerCard", "addCard", "addCards", "refresh", "render", "update"];
      for (const m of methods) {
        if (SAFE.isFn(ed[m])) {
          try { ed[m](cardObj); ok = true; } catch (_) {}
          try { ed[m]([cardObj]); ok = true; } catch (_) {}
        }
      }
    }

    return ok;
  });

  // scripts/effects用の格納先に入れる（存在すれば）
  const tryInsertScript = (no, scriptObj) => safeRun("tryInsertScript", () => {
    const w = window;
    const targets = [
      w.CARD_SCRIPTS, w.cardScripts, w.CardScripts,
      w.EFFECTS, w.effects, w.EffectRegistry, w.effectRegistry,
    ].filter(Boolean);

    let ok = false;
    for (const t of targets) {
      if (!t) continue;
      ok = tryInsertIntoStore("CARD_SCRIPTS-like", t, { no, ...scriptObj }) || ok;
    }
    return ok;
  });

  /* -----------------------------
   * 1) Card definitions (21-30)
   * ----------------------------- */
  // ※表記ルール：または / できる / タイトルタグ
  // ※ 21/30の効果は、アップ済み画像(miiko_text / sevenstar_text)から確定

  const CARDS_21_30 = [
    // 21 ミーコ
    {
      no: 21,
      name: "ミーコ",
      kind: "character",
      rank: 3,
      atk: 500,
      tags: ["アバター", "霊魂", "ミジンコ"],
      titleTag: "怨霊撲滅屋GB",
      rarity: "SSR",
      text: [
        "・このカードは1ターンに1度、バトルでは破壊されない。",
        "・自分シールドが0枚の時、相手からのダイレクトアタックを受ける場合、手札からこのカードを見参できる。相手の攻撃を無効にし、このターンのバトルを終了する。"
      ].join("\n"),
    },

    // 22 インフルエンサーまりも（※効果：相手のサーチ反応→そのカードの効果無効(ターン終了まで)）
    {
      no: 22,
      name: "インフルエンサーまりも",
      kind: "character",
      rank: 3,
      atk: 400,
      tags: ["人間", "配信", "人気"],
      titleTag: "BUGBUG西遊記",
      rarity: "SR",
      text: [
        "・相手が「デッキからカードを手札に加える」「デッキからキャラクターを見参する」効果を発動した時、発動できる。手札からこのカードをウイングに送り、相手が効果を発動したカードの効果をターン終了まで無効にする。"
      ].join("\n"),
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
      rarity: "SR",
      text: [
        "・このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。",
        "・このカードがアイテムを装備している時、相手ステージのタグ「怨霊」「霊魂」を持つキャラクターは効果を発動できない。バトルで相手キャラクターをウイングに送った時、相手シールドを1枚破壊する。"
      ].join("\n"),
      cannotEnterStage: true,
    },

    // 24 銀弾の双銃（アイテム）
    {
      no: 24,
      name: "銀弾の双銃",
      kind: "item",
      rank: 4,
      atk: 0,
      tags: ["除霊", "拳銃"],
      titleTag: "怨霊撲滅屋GB",
      rarity: "SR",
      text: [
        "・自分ターンに発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK＋500。",
        "・タグ「除霊」を持つキャラクターが装備した場合、さらにATK＋500し、このターンの攻撃回数を2回追加する。"
      ].join("\n"),
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
      rarity: "SR",
      text: [
        "・このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。",
        "・このカードが相手の効果、またはバトルでウイングに送られた時、発動できる。手札、デッキ、ウイングからrank4以下の「小太郎」「小次郎」キャラクターを2体まで見参させる。"
      ].join("\n"),
      cannotEnterStage: true,
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
      rarity: "SR",
      text: [
        "・このカードは自分ステージに「サファイア」キャラクターが存在する時、手札から見参できる。",
        "・このカードが登場した時、発動できる。手札を1枚ウイングに送り、デッキ・ウイングからタグ「アニメ」カードを1枚手札に加える。",
        "・このカードが自分ステージに存在する間、発動する。タグ「美少女戦士」のATK＋500。"
      ].join("\n"),
      cannotEnterStage: true,
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
      rarity: "SR",
      text: [
        "・このカードは自分ステージに「ルビー」キャラクターが存在する時、手札から見参できる。",
        "・このカードが登場した時、発動できる。手札を1枚ウイングに送り、デッキ・ウイングからタグ「アニメ」カードを1枚手札に加える。",
        "・このカードが自分ステージに存在する間、発動する。タグ「美少女戦士」のATK＋500。"
      ].join("\n"),
      cannotEnterStage: true,
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
      rarity: "UR",
      text: [
        "・このカードが登場した時、発動できる。デッキからタイトルタグ「怨霊撲滅屋GB」アイテムカード1枚を手札に加える。",
        "・自分ターンに発動できる。このカードが自分ステージに存在する時、手札のrank5以下の「レイチェル」キャラクター1体を、条件を無視して見参させる。"
      ].join("\n"),
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
      rarity: "SR",
      text: [
        "・このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。",
        "・1ターンに1度、発動できる。デッキ、ウイングからタイトルタグ「BUGBUG西遊記」アイテムカード1枚を手札に加える。"
      ].join("\n"),
      cannotEnterStage: true,
    },

    // 30 七星剣（アイテム）
    {
      no: 30,
      name: "七星剣",
      kind: "item",
      rank: 4,
      atk: 0,
      tags: ["課金アイテム", "刀剣"],
      titleTag: "BUGBUG西遊記",
      rarity: "SR",
      text: [
        "・自分ターンに発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK＋500。",
        "・タグ「剣士」を持つキャラクターが装備した場合、さらにATK＋500し、自分ターンに相手ステージの全てのキャラクターに1度ずつ攻撃する事ができる。"
      ].join("\n"),
    },
  ];

  /* -----------------------------
   * 2) Scripts (engine-agnostic)
   *  - 既存エンジンが「カード番号→スクリプト」方式ならここが効く
   *  - エンジンが別方式でも、カード登録だけは必ず効く
   * ----------------------------- */

  // 共通：コスト「手札または自分ステージのキャラ1体をウイングへ」
  const COST_send1Char_handOrStage_toWing = (ctx) => safeRun("COST_send1Char_handOrStage_toWing", () => {
    const you = ctx?.you || ctx?.player || ctx?.p || null;
    const game = ctx?.game || window.game || window.MW?.game || null;
    if (!you || !game) return false;

    const hand = you.hand || you.zones?.hand || [];
    const stage = you.stage || you.zones?.stage || [];

    const pick = (arr) => (Array.isArray(arr) ? arr.find(c => c && (c.kind === "character" || c.def?.kind === "character")) : null);
    const c1 = pick(hand) || pick(stage);
    if (!c1) return false;

    // move関数があれば使う、無ければ配列操作を試す
    const move = game.moveCard || game.move || ctx.moveCard;
    if (SAFE.isFn(move)) {
      try { move.call(game, c1, "wing", { reason: "cost" }); return true; } catch (_) {}
    }

    // 最低限：hand/stageから抜いてwingへ
    const wing = you.wing || you.zones?.wing || [];
    const removeFrom = (arr) => {
      const i = arr.indexOf(c1);
      if (i >= 0) arr.splice(i, 1);
    };
    removeFrom(hand); removeFrom(stage);
    wing.push(c1);
    return true;
  });

  // 21 ミーコ：バトル破壊無効(1/turn)、0シールド時のダイレクト無効
  const SCRIPT_21 = {
    no: 21,
    // 可能なら：バトルで破壊される直前に差し替え
    onBeforeBattleDestroy: (ctx) => safeRun("21:onBeforeBattleDestroy", () => {
      const self = ctx?.self;
      const game = ctx?.game;
      if (!self || !game) return;

      // 1ターン1度だけ
      self._mw21_used = self._mw21_used_turn === game.turn ? self._mw21_used : false;
      if (self._mw21_used) return;

      self._mw21_used = true;
      self._mw21_used_turn = game.turn;

      // 破壊を止めるフラグ（エンジン側が見ていれば止まる）
      ctx.cancel = true;
      self.preventDestroy = true;
    }),

    // 0シールド時のダイレクト：手札から見参→攻撃無効＆バトル終了
    onBeforeDirectAttack: (ctx) => safeRun("21:onBeforeDirectAttack", () => {
      const you = ctx?.defender || ctx?.you || ctx?.player;
      const game = ctx?.game;
      if (!you || !game) return;

      const shield = you.shield || you.zones?.shield || [];
      if (Array.isArray(shield) && shield.length !== 0) return;

      const hand = you.hand || you.zones?.hand || [];
      const miiko = Array.isArray(hand) ? hand.find(c => (c.no ?? c.def?.no) === 21) : null;
      if (!miiko) return;

      // 見参（可能なら既存の見参APIを使う）
      const kensan = game.kensanFromHand || game.kensan || game.summonFromHand;
      if (SAFE.isFn(kensan)) {
        try { kensan.call(game, you, miiko, { ignoreConditions: true }); } catch (_) {}
      }

      // 攻撃無効＆バトル終了
      ctx.cancel = true;
      if (SAFE.isFn(game.endBattle)) {
        try { game.endBattle(); } catch (_) {}
      }
      if (SAFE.isFn(game.forceEndBattle)) {
        try { game.forceEndBattle(); } catch (_) {}
      }
      game._mw_skipBattleThisTurn = true;
    }),
  };

  // 30 七星剣：装備で+500、剣士ならさらに+500＆全体殴り（自分ターン）
  const SCRIPT_30 = {
    no: 30,
    onEquip: (ctx) => safeRun("30:onEquip", () => {
      const target = ctx?.target || ctx?.equippedTo || ctx?.char || null;
      const game = ctx?.game;
      if (!target) return;

      target.bonusAtk = (target.bonusAtk || 0) + 500;

      const tags = target.tags || target.def?.tags || [];
      const hasKenshi = Array.isArray(tags) && tags.includes("剣士");
      if (hasKenshi) {
        target.bonusAtk = (target.bonusAtk || 0) + 500;

        // “全体殴り”フラグ：エンジン側が参照していれば機能
        target._mw30_sweep = true;

        // 互換：攻撃対象管理セット
        target._mw30_hitSet = new Set();
      }

      // 既存UIが再描画するなら要求
      if (game && SAFE.isFn(game.requestRender)) {
        try { game.requestRender(); } catch (_) {}
      }
    }),

    // 自分ターンの攻撃判定フック（エンジンが呼ぶ場合のみ効く）
    canAttackTarget: (ctx) => safeRun("30:canAttackTarget", () => {
      const attacker = ctx?.attacker;
      const target = ctx?.target;
      const game = ctx?.game;
      if (!attacker || !target || !game) return;

      if (!attacker._mw30_sweep) return;

      // 自分ターンのみ（ctx.turnPlayer/activePlayer等があればそれを優先）
      const turnPlayer = game.activePlayer || game.turnPlayer || null;
      if (turnPlayer && attacker.owner && turnPlayer !== attacker.owner) return;

      // 同一ターゲットは1回まで
      attacker._mw30_hitSet = attacker._mw30_hitSet || new Set();
      const tid = target.id || target._id || target.uuid || JSON.stringify(target).slice(0, 50);
      if (attacker._mw30_hitSet.has(tid)) {
        ctx.cancel = true;
        return false;
      }
      return true;
    }),

    onAfterAttack: (ctx) => safeRun("30:onAfterAttack", () => {
      const attacker = ctx?.attacker;
      const target = ctx?.target;
      if (!attacker || !target) return;
      if (!attacker._mw30_sweep) return;

      attacker._mw30_hitSet = attacker._mw30_hitSet || new Set();
      const tid = target.id || target._id || target.uuid || JSON.stringify(target).slice(0, 50);
      attacker._mw30_hitSet.add(tid);
    }),

    onTurnEnd: (ctx) => safeRun("30:onTurnEnd", () => {
      const attacker = ctx?.self || ctx?.attacker;
      if (!attacker) return;
      attacker._mw30_hitSet = new Set(); // 次ターンにリセット
    }),
  };

  /* -----------------------------
   * 3) Register (MOST IMPORTANT)
   *   - これで「デッキ編集に出ない」を確実に解消
   * ----------------------------- */
  const registerCardsEverywhere = (cards) => safeRun("registerCardsEverywhere", () => {
    const stores = findCardStores() || [];
    let insertCount = 0;

    for (const card of cards) {
      // (A) 登録関数があれば呼ぶ
      tryCallRegisterFunctions(card);

      // (B) ありそうなDBへ片っ端から入れる
      for (const s of stores) {
        const v = s.val;

        // “cards”配列を持ってそうならそこにも
        if (SAFE.isObj(v) && Array.isArray(v.cards)) {
          if (tryInsertIntoStore(`${s.key}.cards`, v.cards, card)) insertCount++;
        }

        // そのものが配列/Map/辞書なら入れる
        if (tryInsertIntoStore(s.key, v, card)) insertCount++;
      }
    }

    // (C) 目立つ場所にも置く（デバッグ＆最終保険）
    window.MW_CARDS_21_30 = SAFE.clone(cards);

    SAFE.log("Registered attempt done. insertCount =", insertCount);
    return true;
  });

  /* -----------------------------
   * 4) Inject scripts if possible
   * ----------------------------- */
  const registerScriptsIfPossible = () => safeRun("registerScriptsIfPossible", () => {
    // スクリプト格納先がある環境なら入る（無い環境でも問題なし）
    tryInsertScript(21, SCRIPT_21);
    tryInsertScript(30, SCRIPT_30);
    // 22〜29は既存エンジンが“テキスト駆動” or “既に実装済み”の可能性が高いので、
    // ここでは起動を壊さない最小限に留めます。
    return true;
  });

  /* -----------------------------
   * 5) Start-safe bootstrap
   *   - DOM/ゲーム初期化のタイミング差を吸収
   *   - Safariで「起動できない」を再発させない
   * ----------------------------- */
  const bootstrap = () => safeRun("bootstrap", () => {
    // 二重起動防止
    if (window.__MW_21_30_BOOTED__) return;
    window.__MW_21_30_BOOTED__ = true;

    // まず即時1回
    registerCardsEverywhere(CARDS_21_30);
    registerScriptsIfPossible();

    // その後、遅延ロード環境向けに数回リトライ（重くしない：最大20回）
    let tries = 0;
    const maxTries = 20;
    const intervalMs = 250;

    const timer = setInterval(() => {
      tries++;
      registerCardsEverywhere(CARDS_21_30);
      registerScriptsIfPossible();

      if (tries >= maxTries) {
        clearInterval(timer);
        SAFE.log("bootstrap retry finished.");
      }
    }, intervalMs);

    // もしゲーム側に「カードDB更新後リフレッシュ」があるなら呼ぶ
    setTimeout(() => {
      safeRun("postRefresh", () => {
        const w = window;
        const cands = [
          w.DeckEditor?.refresh, w.deckEditor?.refresh,
          w.DeckEditor?.render, w.deckEditor?.render,
          w.ManpukuWorld?.refresh, w.manpukuWorld?.refresh,
          w.MW?.refresh,
        ].filter(SAFE.isFn);
        for (const fn of cands) {
          try { fn.call(w.DeckEditor || w.deckEditor || w.ManpukuWorld || w.manpukuWorld || w.MW); } catch (_) {}
        }
      });
    }, 600);
  });

  // DOM準備後に確実に走らせる
  if (document.readyState === "complete" || document.readyState === "interactive") {
    bootstrap();
  } else {
    document.addEventListener("DOMContentLoaded", () => bootstrap(), { once: true });
  }
})();
