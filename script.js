/* Manpuku World v50019 Hotfix Boot (iPhone First)
 * Purpose: recover from "操作" modal-only state by:
 *  1) Showing an on-screen console for runtime errors
 *  2) Forcibly enabling modal close + background click close
 *  3) Adding a visible "START" button if start UI is missing
 *  4) If the main game never initializes, fall back to a minimal playable board (no assets required)
 *
 * This file is designed to be safe to drop-in as the main game JS.
 */
(() => {
  'use strict';

  // ---------- tiny util ----------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ---------- on-screen debug console ----------
  const dbg = (() => {
    const box = document.createElement('div');
    box.id = '__mw_dbg__';
    box.style.cssText = [
      'position:fixed','left:8px','right:8px','bottom:8px','z-index:2147483647',
      'max-height:40vh','overflow:auto','padding:10px',
      'background:rgba(0,0,0,.78)','color:#e6f0ff','font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial',
      'border:1px solid rgba(255,255,255,.15)','border-radius:12px',
      'backdrop-filter: blur(8px)','display:none'
    ].join(';');
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px;';
    const title = document.createElement('div');
    title.textContent = 'Manpuku World デバッグ';
    title.style.cssText = 'font-weight:700;';
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;';

    const mkBtn = (txt) => {
      const b = document.createElement('button');
      b.textContent = txt;
      b.style.cssText = 'appearance:none;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:6px 10px;font-weight:700;';
      return b;
    };
    const bHide = mkBtn('閉じる');
    const bClear = mkBtn('クリア');
    bHide.onclick = () => (box.style.display='none');
    bClear.onclick = () => { logArea.textContent=''; };
    btns.append(bClear, bHide);

    const logArea = document.createElement('pre');
    logArea.style.cssText = 'white-space:pre-wrap;word-break:break-word;margin:0;';

    head.append(title, btns);
    box.append(head, logArea);

    const ensure = () => {
      if (!document.body) return;
      if (!document.getElementById('__mw_dbg__')) document.body.appendChild(box);
    };
    const show = () => { ensure(); box.style.display='block'; };
    const log = (msg) => {
      ensure();
      const t = new Date();
      const stamp = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
      logArea.textContent += `[${stamp}] ${msg}\n`;
    };
    return { show, log };
  })();

  window.addEventListener('error', (e) => {
    dbg.show();
    dbg.log(`ERROR: ${e.message || e.type}`);
    if (e.filename) dbg.log(` at ${e.filename}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    dbg.show();
    dbg.log(`PROMISE: ${(e.reason && (e.reason.stack||e.reason.message)) || String(e.reason)}`);
  });

  // ---------- modal rescue ----------
  function attachModalRescue() {
    // Make any button/link with text "閉じる" close its nearest overlay-like container.
    const closers = $$('button, a').filter(el => (el.textContent||'').trim() === '閉じる');
    closers.forEach(btn => {
      if (btn.__mw_modal_bound__) return;
      btn.__mw_modal_bound__ = true;
      btn.addEventListener('click', () => {
        const modal = btn.closest('[role="dialog"], .modal, .overlay, #helpM, #help, #howto, #modal, [data-modal]') || btn.closest('div');
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('show','open','active');
        }
        // Also hide any full-screen backdrops
        $$('[class*="backdrop"], [class*="overlay"], .modal-backdrop').forEach(b => {
          b.style.display='none';
          b.classList.remove('show','open','active');
        });
      }, { capture: true });
    });

    // If there's a visible dialog-like overlay on load, allow tap on the dark background to close.
    const candidates = $$('[role="dialog"], .modal, .overlay, #helpM, #help, #howto, #modal, [data-modal]');
    candidates.forEach(m => {
      if (m.__mw_bg_close__) return;
      m.__mw_bg_close__ = true;
      m.addEventListener('click', (ev) => {
        if (ev.target === m) {
          m.style.display='none';
          m.classList.remove('show','open','active');
        }
      });
    });
  }

  // ---------- minimal fallback game (no assets) ----------
  function mountFallbackGame(reason='unknown') {
    dbg.show();
    dbg.log(`Fallback起動: ${reason}`);

    // Clear page
    document.body.innerHTML = '';
    document.documentElement.style.height = '100%';
    document.body.style.cssText = 'margin:0;min-height:100%;background:#0b1020;color:#eaf0ff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial;';

    const root = document.createElement('div');
    root.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;max-width:980px;margin:0 auto;';

    const h = document.createElement('div');
    h.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;';
    h.innerHTML = `<div style="font-weight:800;font-size:18px;">Manpuku World（簡易復旧モード）</div>
      <div style="opacity:.8;font-size:12px;">※ 画面が操作説明だけで止まる場合の緊急起動用</div>`;

    const note = document.createElement('div');
    note.style.cssText = 'padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(255,255,255,.06);line-height:1.5;';
    note.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;">できること</div>
      <ul style="margin:0;padding-left:18px;">
        <li>最低限のターン進行（MAIN→BATTLE→END）</li>
        <li>手札からキャラを出す（Cスロットに配置）</li>
        <li>エフェ/アイテムをEに置く（このモードでは効果未実装）</li>
      </ul>
      <div style="margin-top:8px;opacity:.85;">通常モードが起動できるようになったら、このJSは外してください。</div>
    `;

    const board = document.createElement('div');
    board.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

    const makeZone = (title) => {
      const z = document.createElement('div');
      z.style.cssText = 'padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(255,255,255,.06);';
      const t = document.createElement('div');
      t.textContent = title;
      t.style.cssText = 'font-weight:800;margin-bottom:8px;';
      const slots = document.createElement('div');
      slots.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';
      for (let i=0;i<3;i++) {
        const s = document.createElement('button');
        s.textContent = '空';
        s.style.cssText = 'height:64px;border-radius:12px;border:1px dashed rgba(255,255,255,.25);background:rgba(0,0,0,.15);color:#fff;font-weight:800;';
        slots.appendChild(s);
      }
      z.append(t, slots);
      return { z, slots };
    };

    const meC = makeZone('自分C（キャラ）');
    const meE = makeZone('自分E（エフェ/アイテム）');
    const enC = makeZone('相手C（キャラ）');
    const enE = makeZone('相手E（エフェ/アイテム）');

    board.append(meC.z, enC.z, meE.z, enE.z);

    const hand = document.createElement('div');
    hand.style.cssText = 'padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(255,255,255,.06);';
    const handTitle = document.createElement('div');
    handTitle.textContent = '手札（タップで選択）';
    handTitle.style.cssText = 'font-weight:800;margin-bottom:8px;';

    const handRow = document.createElement('div');
    handRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    let selected = null;
    const cards = [
      { id:'C-01', name:'テストキャラA', kind:'C' },
      { id:'C-02', name:'テストキャラB', kind:'C' },
      { id:'E-01', name:'テストエフェX', kind:'E' },
      { id:'I-01', name:'テストアイテムY', kind:'E' },
    ];
    function renderHand() {
      handRow.innerHTML='';
      cards.forEach(c => {
        const b = document.createElement('button');
        b.style.cssText = 'min-width:120px;max-width:180px;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.18);color:#fff;text-align:left;';
        if (selected && selected.id===c.id) b.style.border='2px solid rgba(255,255,255,.7)';
        b.innerHTML = `<div style="font-weight:900;">${c.name}</div><div style="opacity:.85;font-size:12px;">${c.id} / ${c.kind}</div>`;
        b.onclick = () => { selected = c; renderHand(); };
        handRow.appendChild(b);
      });
    }
    renderHand();

    hand.append(handTitle, handRow);

    // place logic
    function bindPlace(slots, kind) {
      Array.from(slots.children).forEach(btn => {
        btn.onclick = () => {
          if (!selected) return;
          if (kind==='C' && selected.kind!=='C') return;
          if (kind==='E' && selected.kind!=='E') return;
          if (btn.textContent !== '空') return;
          btn.textContent = selected.name;
          btn.style.border = '1px solid rgba(255,255,255,.22)';
          btn.style.background = 'rgba(0,0,0,.35)';
        };
      });
    }
    bindPlace(meC.slots, 'C');
    bindPlace(meE.slots, 'E');

    const ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;';

    const phase = document.createElement('div');
    phase.style.cssText = 'font-weight:900;';
    let p = 'MAIN';
    phase.textContent = `Phase: ${p}`;

    const mk = (txt) => {
      const b = document.createElement('button');
      b.textContent = txt;
      b.style.cssText = 'appearance:none;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:14px;padding:10px 14px;font-weight:900;';
      return b;
    };
    const bNext = mk('次のフェーズ');
    const bDbg = mk('デバッグ表示');

    bNext.onclick = () => {
      p = (p==='MAIN') ? 'BATTLE' : (p==='BATTLE') ? 'END' : 'MAIN';
      phase.textContent = `Phase: ${p}`;
    };
    bDbg.onclick = () => dbg.show();

    ctrl.append(phase, bNext, bDbg);

    root.append(h, note, ctrl, board, hand);
    document.body.appendChild(root);
  }

  // ---------- start recovery ----------
  async function recover() {
    // Give the existing app a chance to boot
    await sleep(50);
    attachModalRescue();

    // If there is a modal covering and nothing else interactive, offer a forced start button.
    const forceBtnId = '__mw_force_start__';
    if (!document.getElementById(forceBtnId)) {
      const b = document.createElement('button');
      b.id = forceBtnId;
      b.textContent = '強制START（復旧）';
      b.style.cssText = [
        'position:fixed','top:12px','left:12px','z-index:2147483646',
        'appearance:none','border:1px solid rgba(255,255,255,.22)','background:rgba(0,0,0,.55)',
        'color:#fff','border-radius:14px','padding:10px 12px','font-weight:900',
        'backdrop-filter: blur(8px)'
      ].join(';');
      b.onclick = () => mountFallbackGame('user_force');
      document.body.appendChild(b);
    }

    // Heuristic: if after a short delay there is still no obvious game root, start fallback.
    await sleep(900);

    // If the original game has a known root, it should exist.
    const hasCanvas = !!$('canvas');
    const hasGameRoot = !!$('#gameRoot') || !!$('#app') || !!$('#root') || !!$('[data-game-root]');
    const hasStartUI = !!$('[data-start]') || !!$('#btnStart') || $$('button').some(b => (b.textContent||'').includes('START') || (b.textContent||'').includes('開始'));

    // If we only see a help/modal and nothing else, likely initialization failed.
    const visibleDialogs = $$('[role="dialog"], .modal, .overlay, #helpM, #help, #howto, #modal, [data-modal]')
      .filter(m => getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().width > 50);

    if (!hasCanvas && !hasGameRoot && (visibleDialogs.length >= 1 || !hasStartUI)) {
      mountFallbackGame('init_not_detected');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recover);
  } else {
    recover();
  }
})();
