/* ───────────────────────────────────────────────────────────────
   Adam OS — Shared client (v2)
   Modal · drilldowns · quick-fire · data fetch
   ─────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ═══════════════════ CONTACT BOOK (dummy) ═══════════════════ */
  const CONTACTS = {
    hagar:  { name: 'Hagar Selim',   role: 'Samsung Egypt · HR',   wa: '+20 1xx xxx 1247', email: 'hagar.selim@samsung.com',     avatar: 'HS', tone: 'peach' },
    marwan: { name: 'Marwan Fekry',  role: 'Commercial Director',  wa: '+20 1xx xxx 0431', email: 'marwan@wellnesshouse.co',     avatar: 'MF', tone: 'violet' },
    hazem:  { name: 'Hazem',         role: 'CTO',                  wa: '+20 1xx xxx 8821', email: 'hazem@astraform.tech',        avatar: 'HZ', tone: 'mint' },
    sara:   { name: 'Sara Sabahi',   role: 'Ops Lead · WH',        wa: '+20 1xx xxx 9912', email: 'sara@wellnesshouse.co',       avatar: 'SR', tone: 'pink' },
    nour:   { name: 'Nour',          role: 'Marketing · WH',       wa: '+20 1xx xxx 2210', email: 'nour@wellnesshouse.co',       avatar: 'NF', tone: 'sky' },
    maged:  { name: 'Maged',         role: 'M Empire · investor',  wa: '+20 1xx xxx 7711', email: 'maged@mempire.eg',            avatar: 'MG', tone: 'peach' },
    yara:   { name: 'Dr. Yara',      role: 'Clinical Lead · WH',   wa: '+20 1xx xxx 4400', email: 'yara@wellnesshouse.co',       avatar: 'YR', tone: 'mint' },
    asma:   { name: 'Asma',          role: 'Nasco · partner',      wa: '+20 1xx xxx 6601', email: 'asma@nasco.eg',               avatar: 'AS', tone: 'pink' },
    saden:  { name: 'Saden Group',   role: 'Procurement · AF',     wa: '+20 1xx xxx 3344', email: 'procurement@saden.com',       avatar: 'SD', tone: 'sky' },
  };

  /* ═══════════════════ DRAFTS (suggested messages) ═══════════════════ */
  const DRAFTS = {
    'hagar:wa':    "Hi Hagar — sending the deck v2 + Wellness Day playbook this morning. Lead with the playbook so your team can review Sunday. Free Tuesday 11am for the next call?",
    'hagar:email': "Hi Hagar,\n\nAttached is deck v2 of the Wellness Day pilot for Samsung's 270 employees, plus the Wellness Day Playbook your team can use to plan Sunday's review.\n\nProposing Tuesday 11am for our next call to walk through the program structure and answer questions.\n\nLet me know if Tuesday doesn't work — happy to flex.\n\nBest,\nAhmed",
    'marwan:wa':   "20K EGP bundle confirmed. Route Sarah → Alia (contents) and Shibl (packaging). Don't promise dates until Sarah locks SKU.",
    'hazem:wa':    "Got time for a 15-min call this afternoon? Need to lock priority split between Orion and Wellness+. Be specific.",
    'sara:wa':     "Confirmed for 14:00 on the Wellness Box bundle review. Bring the SKU lock + cost breakdown.",
    'nour:wa':     "Wellness day teaser numbers look strong. Push the Foundever HR comment into our pipeline channel.",
    'maged:wa':    "Quick update on milestones since the close — Samsung deck due Sunday, Wellness Box pricing locked, AstraForm Saden signing Monday.",
    'yara:wa':     "Sending eyes on the retention guide v2 today. Want a 30-min sync this week to align?",
    'asma:wa':     "Bassant from Foundever wants 30 min this week. Tuesday 3pm or Thursday 11am — your pick.",
    'saden:wa':    "Annex B confirmed on our side. Ready to sign Monday morning.",
    'default:wa':  "Quick one — ",
    'default:email': "Hi,\n\n\n\nBest,\nAhmed",
  };

  function getDraft(contactKey, channel) {
    return DRAFTS[`${contactKey}:${channel}`] || DRAFTS[`default:${channel}`];
  }

  /* ═══════════════════ MODAL ═══════════════════ */
  function injectModal() {
    if (document.getElementById('adam-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'adam-modal';
    wrap.className = 'adam-modal';
    wrap.innerHTML = `
      <div class="adam-modal-scrim"></div>
      <div class="adam-modal-card">
        <div class="adam-modal-head">
          <div class="adam-modal-channel">
            <span class="adam-modal-channel-icon"></span>
            <span class="adam-modal-channel-name"></span>
          </div>
          <button class="adam-modal-close" aria-label="Close">×</button>
        </div>

        <div class="adam-modal-recipient">
          <div class="adam-modal-recipient-avatar"></div>
          <div>
            <div class="adam-modal-recipient-name"></div>
            <div class="adam-modal-recipient-role"></div>
            <div class="adam-modal-recipient-channel"></div>
          </div>
        </div>

        <div class="adam-modal-body-label">Drafted message · edit before sending</div>
        <textarea class="adam-modal-body" rows="6"></textarea>

        <details class="adam-modal-reasoning">
          <summary>Adam's reasoning</summary>
          <div class="adam-modal-reasoning-text">Pulled context from your last 3 threads with this contact, the active deal stage, and your communication style profile. The tone matches your typical short-form WhatsApp voice: direct, no preamble, ends with a clear next step.</div>
        </details>

        <div class="adam-modal-foot">
          <button class="btn-action">Cancel</button>
          <button class="btn-action primary adam-modal-send">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // Wire close handlers
    wrap.querySelector('.adam-modal-scrim').addEventListener('click', closeModal);
    wrap.querySelector('.adam-modal-close').addEventListener('click', closeModal);
    wrap.querySelector('.adam-modal-foot .btn-action:not(.primary)').addEventListener('click', closeModal);
    wrap.querySelector('.adam-modal-send').addEventListener('click', () => {
      const body = wrap.querySelector('.adam-modal-body').value;
      const channel = wrap.dataset.channel;
      const recipient = wrap.dataset.recipient;
      // Real impl: POST to wa_send.sh / email gateway
      console.log('[Adam OS] SEND', { channel, recipient, body });
      flashSent();
    });

    // ESC to close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && wrap.classList.contains('open')) closeModal();
    });
  }

  function flashSent() {
    const wrap = document.getElementById('adam-modal');
    const send = wrap.querySelector('.adam-modal-send');
    send.textContent = '✓ Sent';
    send.style.background = '#22C55E';
    send.style.color = '#FFFFFF';
    setTimeout(() => closeModal(), 900);
  }

  function openModal(opts) {
    injectModal();
    const wrap = document.getElementById('adam-modal');
    const channel = opts.channel || 'wa';
    const contact = opts.contact || {};

    const channelMeta = {
      wa:    { icon: '💬', name: 'WhatsApp',  via: contact.wa    || '—' },
      email: { icon: '✉️', name: 'Email',     via: contact.email || '—' },
      cal:   { icon: '📅', name: 'Calendar',  via: 'Schedule a call' },
    }[channel] || { icon: '💬', name: 'WhatsApp', via: '—' };

    wrap.dataset.channel = channel;
    wrap.dataset.recipient = contact.name || 'Recipient';

    wrap.querySelector('.adam-modal-channel-icon').textContent = channelMeta.icon;
    wrap.querySelector('.adam-modal-channel-name').textContent = channelMeta.name;

    const av = wrap.querySelector('.adam-modal-recipient-avatar');
    av.textContent = (contact.avatar || (contact.name || '?').slice(0, 2)).toUpperCase();
    av.className = 'adam-modal-recipient-avatar tone-' + (contact.tone || 'peach');

    wrap.querySelector('.adam-modal-recipient-name').textContent = contact.name || 'Pick a recipient';
    wrap.querySelector('.adam-modal-recipient-role').textContent = contact.role || '';
    wrap.querySelector('.adam-modal-recipient-channel').textContent = channelMeta.via;

    wrap.querySelector('.adam-modal-body').value = opts.body || '';

    // Reset send button
    const send = wrap.querySelector('.adam-modal-send');
    send.textContent = 'Send';
    send.style.background = '';
    send.style.color = '';

    requestAnimationFrame(() => wrap.classList.add('open'));
    setTimeout(() => wrap.querySelector('.adam-modal-body').focus(), 150);
  }

  function closeModal() {
    const wrap = document.getElementById('adam-modal');
    if (wrap) wrap.classList.remove('open');
  }

  /* ═══════════════════ STYLES (injected) ═══════════════════ */
  function injectStyles() {
    if (document.getElementById('adam-modal-styles')) return;
    const s = document.createElement('style');
    s.id = 'adam-modal-styles';
    s.textContent = `
      .adam-modal {
        position: fixed; inset: 0; z-index: 9999;
        display: none; pointer-events: none;
      }
      .adam-modal.open { display: block; pointer-events: auto; }

      .adam-modal-scrim {
        position: absolute; inset: 0;
        background: rgba(26, 26, 34, 0.42);
        backdrop-filter: blur(4px);
        opacity: 0; transition: opacity 0.18s;
      }
      .adam-modal.open .adam-modal-scrim { opacity: 1; }

      .adam-modal-card {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -48%) scale(0.96);
        width: 520px; max-width: calc(100vw - 32px);
        max-height: calc(100vh - 64px);
        overflow-y: auto;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--r-lg);
        padding: 22px;
        opacity: 0;
        transition: opacity 0.22s cubic-bezier(.2,.8,.2,1), transform 0.22s cubic-bezier(.2,.8,.2,1);
        box-shadow: 0 24px 64px rgba(26,26,34,0.20);
      }
      .adam-modal.open .adam-modal-card {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .adam-modal-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 14px;
      }
      .adam-modal-channel {
        display: flex; align-items: center; gap: 8px;
        font-family: var(--font-display);
        font-weight: 600; font-size: 13px;
        color: var(--ink);
        background: var(--lime);
        padding: 6px 14px;
        border-radius: 999px;
      }
      .adam-modal-channel-icon { font-size: 14px; }
      .adam-modal-close {
        width: 32px; height: 32px;
        border-radius: 50%; cursor: pointer;
        background: var(--card-soft);
        font-size: 18px; line-height: 1;
        color: var(--ink);
        transition: all 0.12s;
      }
      .adam-modal-close:hover { background: var(--bg-warm); }

      .adam-modal-recipient {
        display: flex; align-items: center; gap: 12px;
        background: var(--card-soft);
        padding: 12px 14px;
        border-radius: var(--r-md);
        margin-bottom: 14px;
      }
      .adam-modal-recipient-avatar {
        width: 44px; height: 44px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-family: var(--font-display);
        font-weight: 700; font-size: 14px;
        color: var(--ink);
      }
      .adam-modal-recipient-avatar.tone-peach  { background: var(--peach-soft); }
      .adam-modal-recipient-avatar.tone-violet { background: rgba(184,160,255,0.4); }
      .adam-modal-recipient-avatar.tone-mint   { background: rgba(160,232,200,0.45); }
      .adam-modal-recipient-avatar.tone-pink   { background: rgba(255,163,199,0.4); }
      .adam-modal-recipient-avatar.tone-sky    { background: rgba(160,208,255,0.45); }

      .adam-modal-recipient-name {
        font-family: var(--font-display);
        font-weight: 600; font-size: 14px;
      }
      .adam-modal-recipient-role { font-size: 12px; color: var(--muted); margin-top: 1px; }
      .adam-modal-recipient-channel { font-size: 11px; color: var(--muted-soft); margin-top: 4px; font-family: monospace; }

      .adam-modal-body-label {
        font-size: 11px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.06em;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .adam-modal-body {
        width: 100%;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--r-md);
        padding: 12px 14px;
        font-family: var(--font-body);
        font-size: 14px;
        color: var(--ink);
        line-height: 1.5;
        resize: vertical;
        min-height: 120px;
        outline: none;
        transition: border-color 0.12s;
      }
      .adam-modal-body:focus { border-color: var(--ink); }

      .adam-modal-reasoning {
        margin-top: 12px;
        padding: 10px 14px;
        background: var(--card-soft);
        border-radius: var(--r-md);
        font-size: 12px;
      }
      .adam-modal-reasoning summary {
        cursor: pointer;
        font-weight: 600;
        color: var(--ink-soft);
        list-style: none;
      }
      .adam-modal-reasoning summary::before { content: "▸  "; color: var(--muted); }
      .adam-modal-reasoning[open] summary::before { content: "▾  "; }
      .adam-modal-reasoning-text {
        margin-top: 8px; line-height: 1.5;
        color: var(--muted);
      }

      .adam-modal-foot {
        display: flex; justify-content: flex-end; gap: 8px;
        margin-top: 16px;
      }

      /* Quick-fire interpretation banner */
      .qf-interpret {
        font-size: 11px;
        color: var(--muted);
        padding: 4px 12px;
        margin: 6px 0 0;
      }
      .qf-interpret strong { color: var(--ink); font-weight: 600; }
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════ ACTION BUTTON HOOK ═══════════════════ */
  function hookActionButtons() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const channel = btn.dataset.action; // 'wa' | 'email' | 'cal'
        const contactKey = btn.dataset.contact;
        const contact = CONTACTS[contactKey];
        if (!contact) {
          console.warn('[Adam OS] Unknown contact:', contactKey);
          return;
        }
        openModal({
          channel,
          contact,
          body: getDraft(contactKey, channel),
        });
      });
    });
  }

  /* ═══════════════════ QUICK-FIRE PARSER ═══════════════════ */
  function parseQuickFire(text) {
    text = text.trim();
    if (!text) return null;

    // /wa Hazem call me   → wa to Hazem
    let m = text.match(/^\/?(wa|whatsapp|message|msg)\s+(\w+)\s*[:,\-]?\s*(.*)$/i);
    if (m) {
      const contactKey = findContact(m[2]);
      if (contactKey) return { channel: 'wa', contact: contactKey, body: m[3] || getDraft(contactKey, 'wa') };
    }

    // send X to Y    OR    send Y: X
    m = text.match(/^send\s+(\w+)\s*[:,]\s*(.+)$/i);
    if (m) {
      const contactKey = findContact(m[1]);
      if (contactKey) return { channel: 'wa', contact: contactKey, body: m[2] };
    }
    m = text.match(/^send\s+(.+?)\s+to\s+(\w+)$/i);
    if (m) {
      const contactKey = findContact(m[2]);
      if (contactKey) return { channel: 'wa', contact: contactKey, body: m[1] };
    }

    // /email Hagar about deck
    m = text.match(/^\/?(email|mail)\s+(\w+)\s*(?:about|re:|:|,\-)?\s*(.*)$/i);
    if (m) {
      const contactKey = findContact(m[2]);
      if (contactKey) return { channel: 'email', contact: contactKey, body: m[3] || getDraft(contactKey, 'email') };
    }
    m = text.match(/^draft\s+(?:an\s+)?email\s+to\s+(\w+)\s*(?:about|re:)?\s*(.*)$/i);
    if (m) {
      const contactKey = findContact(m[1]);
      if (contactKey) return { channel: 'email', contact: contactKey, body: m[2] || getDraft(contactKey, 'email') };
    }

    // /meet Hazem 3pm
    m = text.match(/^\/?(meet|call|schedule)\s+(\w+)\s*(.*)$/i);
    if (m) {
      const contactKey = findContact(m[2]);
      if (contactKey) return { channel: 'cal', contact: contactKey, body: m[3] || 'Quick 15-min sync.' };
    }

    return null;
  }

  function findContact(token) {
    if (!token) return null;
    const t = token.toLowerCase();
    if (CONTACTS[t]) return t;
    for (const k in CONTACTS) {
      const name = CONTACTS[k].name.toLowerCase();
      if (name.includes(t) || t.length >= 3 && name.split(' ').some(part => part.startsWith(t))) {
        return k;
      }
    }
    return null;
  }

  function hookQuickFire() {
    const inputs = document.querySelectorAll('.quick-fire input, .qf-input');
    inputs.forEach(input => {
      const wrap = input.closest('.quick-fire') || input.parentElement;
      const interp = document.createElement('div');
      interp.className = 'qf-interpret';
      interp.style.display = 'none';
      wrap.parentElement.insertBefore(interp, wrap.nextSibling);

      input.addEventListener('input', () => {
        const parsed = parseQuickFire(input.value);
        if (parsed) {
          const c = CONTACTS[parsed.contact];
          interp.style.display = '';
          interp.innerHTML = `→ <strong>${parsed.channel.toUpperCase()}</strong> to <strong>${c.name}</strong> · press Enter`;
        } else if (input.value.trim()) {
          interp.style.display = '';
          interp.innerHTML = `<em>Couldn't parse · try "send hagar: hi" or "/wa hazem call me"</em>`;
        } else {
          interp.style.display = 'none';
        }
      });

      input.addEventListener('keypress', e => {
        if (e.key !== 'Enter') return;
        const parsed = parseQuickFire(input.value);
        if (!parsed) return;
        openModal({
          channel: parsed.channel,
          contact: CONTACTS[parsed.contact],
          body: parsed.body,
        });
        input.value = '';
        interp.style.display = 'none';
      });

      // Go button on quick-fire
      const goBtn = wrap.querySelector('.quick-fire-go');
      if (goBtn) {
        goBtn.addEventListener('click', () => {
          input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
        });
      }
    });
  }

  /* ═══════════════════ DATA FETCH ═══════════════════ */
  async function loadData() {
    try {
      const r = await fetch('public/data.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('No data.json yet');
      const data = await r.json();
      window.adamData = data;
      applyData(data);
      console.log('[Adam OS] data.json loaded', data);
    } catch (e) {
      console.log('[Adam OS] using dummy data (data.json not available):', e.message);
    }
  }

  function applyData(d) {
    // Priority sentence
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle && d.priority && d.priority.text) {
      heroTitle.innerHTML = d.priority.text;
    }

    // Hero pre (sync time)
    const heroPre = document.querySelector('.hero-pre');
    if (heroPre && d.snapshot_at) {
      const t = new Date(d.snapshot_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dot = heroPre.querySelector('.dot');
      heroPre.innerHTML = '';
      if (dot) heroPre.appendChild(dot);
      heroPre.appendChild(document.createTextNode(' Live · synced ' + t));
    }

    // Verve
    const verveDelta = document.querySelector('.companion-status');
    if (verveDelta && d.signal) {
      verveDelta.innerHTML = `<span class="dot"></span>${d.signal.headline || 'system healthy'}`;
    }

    // Pulse feed (home page) — mix Plaud + Gmail + WA into one stream
    const feedContainer = document.querySelector('.feed');
    if (feedContainer && (d.plaud || d.gmail)) {
      injectPulseFeed(feedContainer, d);
    }

    // WH page — top emails panel
    const isWH = document.body.dataset.brand === 'wh' ||
                 document.documentElement.dataset.brand === 'wh';
    if (isWH && d.gmail) {
      injectEmailPanel('wh', d.gmail);
    }
    const isAF = document.body.dataset.brand === 'af' ||
                 document.documentElement.dataset.brand === 'af';
    if (isAF && d.gmail) {
      injectEmailPanel('af', d.gmail);
    }
  }

  function injectPulseFeed(container, d) {
    // Combine Plaud + Gmail by date
    const items = [];
    (d.plaud || []).slice(0, 3).forEach(p => items.push({
      type: 'plaud',
      avatar: 'mic',
      tone: p.tag === 'samsung' ? 'lime' : 'peach',
      name: p.title_en || p.title,
      msg: p.snippet || '',
      time: p.time || p.date,
      sortKey: `${p.date} ${p.time||''}`,
    }));
    (d.gmail || []).slice(0, 4).forEach(e => items.push({
      type: 'email',
      avatar: emailInitials(e.from),
      tone: e.priority === 'hot' ? 'pink' : e.priority === 'warm' ? 'violet' : 'sky',
      name: `${e.from} · ${e.tag.toUpperCase()}`,
      msg: e.subject_en || e.subject,
      time: e.time || e.date,
      sortKey: `${e.date} ${e.time||''}`,
    }));

    items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    const head = container.querySelector('.feed-head');
    const newRows = items.slice(0, 6).map(it => {
      const avatarInner = it.avatar === 'mic'
        ? `<img src="https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Microphone/3D/microphone_3d.png" style="width:22px;height:22px;">`
        : it.avatar;
      const toneBg = {
        lime: 'rgba(220,252,79,0.6)',
        peach: 'var(--peach-soft, #FFD4B8)',
        violet: 'rgba(184,160,255,0.4)',
        mint: 'rgba(160,232,200,0.45)',
        pink: 'rgba(255,163,199,0.4)',
        sky: 'rgba(160,208,255,0.45)',
      }[it.tone] || 'var(--peach-soft, #FFD4B8)';
      return `
        <div class="feed-item">
          <div class="feed-avatar" style="background:${toneBg};">${avatarInner}</div>
          <div class="feed-body">
            <div class="feed-name" dir="auto">${escapeHtml(it.name)}</div>
            <div class="feed-msg" dir="auto">${escapeHtml(it.msg)}</div>
            <div class="feed-time">${escapeHtml(it.time)} · ${it.type}</div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = (head ? head.outerHTML : '<div class="feed-head"><h3>Pulse · live</h3><button class="btn-action">All</button></div>') + newRows;
  }

  function injectEmailPanel(brand, gmail) {
    const panels = document.querySelectorAll('.panel');
    let target = null;
    panels.forEach(p => {
      const h3 = p.querySelector('.panel-head h3');
      if (h3 && /top emails/i.test(h3.textContent)) target = p;
    });
    if (!target) return;

    const filtered = gmail
      .filter(e => e.tag === brand || e.tag === 'personal' && brand === 'wh')
      .slice(0, 8);

    if (filtered.length === 0) return;

    const head = target.querySelector('.panel-head');
    const list = filtered.map(e => `
      <div class="email-row">
        <div class="email-priority ${e.priority || ''}"></div>
        <div>
          <div class="email-from" dir="auto">${escapeHtml(e.from)}</div>
          <div class="email-subject" dir="auto">${escapeHtml(e.subject_en || e.subject)}</div>
        </div>
        <div class="email-time">${escapeHtml(e.time || e.date)}</div>
      </div>`).join('');

    target.innerHTML = head.outerHTML + `<div class="email-list">${list}</div>`;
  }

  function emailInitials(from) {
    if (!from) return '??';
    const parts = from.replace(/[<>]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return from.slice(0, 2).toUpperCase();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ═══════════════════ BOOT ═══════════════════ */
  function boot() {
    injectStyles();
    injectModal();
    hookActionButtons();
    hookQuickFire();
    loadData();

    // Expose for debugging
    window.AdamOS = { openModal, closeModal, parseQuickFire, CONTACTS };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
