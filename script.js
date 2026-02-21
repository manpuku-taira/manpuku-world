/**
 * Manpuku World - Inject Cards 21-30 into Deck Editor (Single JS)
 * - UI/レイアウトは変更しない
 * - 既存アプリの「カードマスター（一覧/デッキ編集）」へ 21〜30 を追加登録する
 * - iOS Safari 対応：ロード後に自動注入
 *
 * 目的：
 *  - デッキ編集に21〜30が出ない問題を解消
 *
 * 注意：
 *  - 本体側のカードDB変数名が環境で異なるため、複数候補へ自動注入（安全なヒューリスティック）
 */

(() => {
  "use strict";

  /**********************
   * 定義：カード21〜30（デッキ編集用のメタ情報）
   * ※本体のデータ構造に合わせるため、複数のキーを併記（id/no/name/type/kind 等）
   **********************/
  const CARDS_21_30 = [
    // 21 ミーコ（※効果実装はゲーム側、ここはデッキ編集に出すためのマスター登録）
    {
      id: 21, no: 21, cardNo: 21,
      name: "ミーコ",
      type: "character", kind: "character", cardType: "character",
      rank: 3,
      atk: 300, ATK: 300,
      tags: ["アバター", "霊魂", "ミジンコ"],
      titleTag: "BUGBUG西遊記",
      text: "【自動】1ターンに1度、バトルで破壊されない。\n【自動】自分シールドが0枚で相手の直接攻撃を受ける時、手札から見参できる。相手の攻撃を無効にし、このターンのバトルを終了する。",
    },

    // 22 インフルエンサーまりも
    {
      id: 22, no: 22, cardNo: 22,
      name: "インフルエンサーまりも",
      type: "character", kind: "character", cardType: "character",
      rank: 3,
      atk: 400, ATK: 400,
      tags: ["人間", "配信", "人気"],
      titleTag: "BUGBUG西遊記",
      text: "【反応】相手が「デッキから手札に加える」または「デッキからキャラクターを見参する」効果を発動した時、このカードを手札からウイングに送り発動できる。このターンの終わりまで、その効果を発動したカードの効果を全て無効にする。",
    },

    // 23 退魔師レイチェル
    {
      id: 23, no: 23, cardNo: 23,
      name: "退魔師レイチェル",
      type: "character", kind: "character", cardType: "character",
      rank: 5,
      atk: 2200, ATK: 2200,
      tags: ["除霊", "伶嬢", "射手"],
      titleTag: "怨霊撲滅屋GB",
      text: "このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。\nこのカードがアイテムを装備している時、相手ステージのタグ『怨霊』『霊魂』を持つキャラクターは効果を発動できない。\nバトルで相手キャラクターをウイングに送った時、相手シールドを1枚破壊する。",
    },

    // 24 銀弾の双銃
    {
      id: 24, no: 24, cardNo: 24,
      name: "銀弾の双銃",
      type: "item", kind: "item", cardType: "item",
      rank: 4,
      atk: 0, ATK: 0,
      tags: ["除霊", "拳銃"],
      titleTag: "怨霊撲滅屋GB",
      text: "自分ターンに発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ『除霊』を持つキャラクターが装備した場合、さらにATK+500し、このターンの攻撃回数を2回追加する。",
    },

    // 25 小次郎&小太郎
    {
      id: 25, no: 25, cardNo: 25,
      name: "小次郎&小太郎",
      type: "character", kind: "character", cardType: "character",
      rank: 5,
      atk: 2500, ATK: 2500,
      tags: ["アバター", "GAME", "兄弟"],
      titleTag: "BUGBUG西遊記",
      text: "このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。\nこのカードが相手の効果、またはバトルでウイングに送られた時、発動できる。手札、デッキ、ウイングからrank4以下の『小太郎』『小次郎』キャラクターを2体まで見参させる。",
    },

    // 26 ジュエリー・ルビー
    {
      id: 26, no: 26, cardNo: 26,
      name: "ジュエリー・ルビー",
      type: "character", kind: "character", cardType: "character",
      rank: 4,
      atk: 1700, ATK: 1700,
      tags: ["美少女戦士", "アニメ", "格闘"],
      titleTag: "Ve ヴォイスエレメント",
      text: "このカードは登場できず、自分ステージに『ジュエリー・サファイア』が存在する時、手札から見参できる。\n登場時、手札から1枚をウイングに送る。デッキまたはウイングからタグ『アニメ』を持つカード1枚を手札に加える。",
    },

    // 27 ジュエリー・サファイア
    {
      id: 27, no: 27, cardNo: 27,
      name: "ジュエリー・サファイア",
      type: "character", kind: "character", cardType: "character",
      rank: 4,
      atk: 1700, ATK: 1700,
      tags: ["美少女戦士", "アニメ", "格闘"],
      titleTag: "Ve ヴォイスエレメント",
      text: "このカードは登場できず、自分ステージに『ジュエリー・ルビー』が存在する時、手札から見参できる。\n登場時、手札から1枚をウイングに送る。デッキまたはウイングからタグ『アニメ』を持つカード1枚を手札に加える。",
    },

    // 28 セシア&アリサ
    {
      id: 28, no: 28, cardNo: 28,
      name: "セシア&アリサ",
      type: "character", kind: "character", cardType: "character",
      rank: 4,
      atk: 1500, ATK: 1500,
      tags: ["除霊", "支援", "侍女"],
      titleTag: "怨霊撲滅屋GB",
      text: "登場時、デッキからタイトルタグ『怨霊撲滅屋GB』のアイテムカード1枚を手札に加える。\n自分ターンに発動できる。このカードが自分ステージに存在する時、手札のrank5以下『退魔師レイチェル』1体を条件を無視して見参させる。",
    },

    // 29 狼猫-孫悟空Lv75-
    {
      id: 29, no: 29, cardNo: 29,
      name: "狼猫-孫悟空Lv75-",
      type: "character", kind: "character", cardType: "character",
      rank: 5,
      atk: 2400, ATK: 2400,
      tags: ["アバター", "GAME", "剣士"],
      titleTag: "BUGBUG西遊記",
      text: "このカードは登場できず、手札または自分ステージのキャラクター1体をウイングに送り、手札から見参できる。\n1ターンに1度、発動できる。デッキ、ウイングからタイトルタグ『BUGBUG西遊記』アイテムカード1枚を手札に加える。",
    },

    // 30 七星剣
    {
      id: 30, no: 30, cardNo: 30,
      name: "七星剣",
      type: "item", kind: "item", cardType: "item",
      rank: 4,
      atk: 0, ATK: 0,
      tags: ["課金アイテム", "刀剣"],
      titleTag: "BUGBUG西遊記",
      text: "自分ターンに発動できる。自分ステージのキャラクター1体を選択し、このカードを装備する。ATK+500。\nタグ『剣士』を持つキャラクターが装備した場合、さらにATK+500し、自分ターンに相手ステージ全キャラクターを1度ずつ攻撃できる。",
    },
  ];

  /**********************
   * 注入先（カードマスター）探索
   * - 既知の変数名を優先
   * - なければ window の中から「カード配列/カード辞書っぽいもの」をヒューリスティックに探す
   **********************/
  const KNOWN_MASTER_KEYS = [
    "CARD_MASTER",
    "CARD_MASTERS",
    "CARD_DATABASE",
    "CARD_DB",
    "CARDS",
    "ALL_CARDS",
    "cards",
    "cardList",
    "cardMaster",
    "masterCards",
    "MASTER_CARDS",
  ];

  function isCardLike(obj) {
    if (!obj || typeof obj !== "object") return false;
    const hasName = typeof obj.name === "string";
    const hasNo = typeof obj.no === "number" || typeof obj.id === "number" || typeof obj.cardNo === "number";
    const hasType = typeof obj.type === "string" || typeof obj.kind === "string" || typeof obj.cardType === "string";
    return hasName && hasNo && hasType;
  }

  function tryGetAsArray(val) {
    if (Array.isArray(val)) return val;
    return null;
  }

  function tryGetAsObject(val) {
    if (val && typeof val === "object" && !Array.isArray(val)) return val;
    return null;
  }

  // 1) known keys
  function findMasterByKnownKeys() {
    for (const k of KNOWN_MASTER_KEYS) {
      const v = window[k];
      if (!v) continue;
      const arr = tryGetAsArray(v);
      if (arr && arr.length && arr.some(isCardLike)) return { kind: "array", ref: arr, key: k };

      const obj = tryGetAsObject(v);
      if (obj) {
        // object where values are card-like
        const vals = Object.values(obj);
        if (vals.length && vals.some(isCardLike)) return { kind: "object", ref: obj, key: k };
      }
    }
    return null;
  }

  // 2) heuristic scan (safe + limited)
  function findMasterByScan() {
    const keys = Object.keys(window);
    // limit scan to avoid heavy cost
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      // skip noisy
      if (k.startsWith("webkit") || k.startsWith("webkit")) continue;
      if (k.startsWith("Apple") || k.startsWith("webkit")) continue;

      let v;
      try { v = window[k]; } catch { continue; }

      const arr = tryGetAsArray(v);
      if (arr && arr.length >= 20 && arr.length <= 5000) {
        // card master arrays are often mid-large, with objects
        const sample = arr.slice(0, 20);
        if (sample.some(isCardLike)) return { kind: "array", ref: arr, key: k };
      }

      const obj = tryGetAsObject(v);
      if (obj) {
        const vals = Object.values(obj);
        if (vals.length >= 20 && vals.length <= 5000) {
          const sample = vals.slice(0, 20);
          if (sample.some(isCardLike)) return { kind: "object", ref: obj, key: k };
        }
      }
    }
    return null;
  }

  function normalizeNo(card) {
    return Number.isFinite(card.no) ? card.no : (Number.isFinite(card.id) ? card.id : (Number.isFinite(card.cardNo) ? card.cardNo : null));
  }

  function hasCard(master, no) {
    if (!master) return false;
    if (master.kind === "array") {
      return master.ref.some((c) => normalizeNo(c) === no);
    }
    if (master.kind === "object") {
      // may be keyed by number or string
      if (master.ref[no] || master.ref[String(no)]) return true;
      // also check values
      return Object.values(master.ref).some((c) => normalizeNo(c) === no);
    }
    return false;
  }

  function injectCards(master) {
    if (!master) return { ok: false, msg: "master not found" };

    let added = 0;

    for (const c of CARDS_21_30) {
      const no = c.no;
      if (hasCard(master, no)) continue;

      if (master.kind === "array") {
        master.ref.push(c);
        added++;
        continue;
      }

      if (master.kind === "object") {
        // choose numeric key if possible
        master.ref[no] = c;
        // also fill string key if object is string-keyed
        master.ref[String(no)] = c;
        added++;
        continue;
      }
    }

    return { ok: true, added, key: master.key, kind: master.kind };
  }

  function bustCacheDeckEditorIfNeeded() {
    // デッキ編集が localStorage にカード一覧をキャッシュしている可能性に備えて、軽く揺らす
    // ただし危険な削除はしない（UI/レイアウト維持最優先）
    try {
      const k = "mw_card_master_injected_21_30";
      localStorage.setItem(k, String(Date.now()));
    } catch (_) {}
  }

  function runInject() {
    const master =
      findMasterByKnownKeys() ||
      findMasterByScan();

    if (!master) {
      console.warn("[MW Inject] Card master not found. (The app may load it later. Will retry.)");
      return false;
    }

    const res = injectCards(master);
    if (res.ok) {
      bustCacheDeckEditorIfNeeded();
      console.log(`[MW Inject] Injected cards 21-30 into ${res.key} (${res.kind}). added=${res.added}`);
      return true;
    }
    return false;
  }

  async function boot() {
    // アプリ側ロード待ち：少し待って複数回トライ
    for (let i = 0; i < 60; i++) {
      const ok = runInject();
      if (ok) return;
      await new Promise((r) => setTimeout(r, 150));
    }

    console.warn("[MW Inject] Failed to inject after retries. Please open deck editor once, then reload.");
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // いつでも呼べるように（必須ではありません）
  window.__MW_INJECT_21_30__ = () => runInject();

})();