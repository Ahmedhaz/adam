  // ================================================================ stories
  // Phase 4 of the content plan: depth.
  //   * a library of 80+ dilemmas (content/dl_*.js) dealt alongside the
  //     original events, never repeating within a run
  //   * echoes: choices that come back 4-30 weeks later, naming the week you
  //     made them
  //   * a Middle East calendar: Ramadan, the two Eids, the summer slowdown
  //   * Nour and your parents join the Circle; neglect has its own ending
  //   * the inbox gets noise and threads that remember (content/mail.js)
  // shares App's scope (see economy.js / market.js / org.js).

  // general dilemmas, minus the B2B-only stories for consumer industries, plus
  // each industry's own pack (shown only in that industry, and favoured there)
  const B2B_ONLY = ["dl_prod_01", "dl_prod_02", "dl_prod_11", "dl_prod_16", "dl_ppl_15", "dl_life_01", "dl_life_02", "dl_mena_09"];
  const onlyIn = (sectors, d, extra) => ({ ...d, ...extra, when: (s) => !!s.sector && sectors.includes(s.sector.id) && (!d.when || d.when(s)) });
  const INDUSTRY = (id, list) => list.map((d) => onlyIn([id], d, { industry: true }));
  const LIBRARY = []
    .concat(DL_PRODUCT, DL_PEOPLE, DL_LIFE, DL_MENA)
    .map((d) => (B2B_ONLY.includes(d.id) ? onlyIn(["saas_ai", "fintech"], d) : d))
    .concat(INDUSTRY("saas_ai", DL_SAAS), INDUSTRY("fintech", DL_FIN), INDUSTRY("ecommerce_marketplace", DL_MKT), INDUSTRY("healthtech", DL_HEALTH), INDUSTRY("edtech", DL_EDU));
  const MAIL_ALL = [].concat(
    MAIL_EXTRA,
    INDUSTRY("saas_ai", MAIL_SAAS),
    INDUSTRY("fintech", MAIL_FIN),
    INDUSTRY("ecommerce_marketplace", MAIL_MKT),
    INDUSTRY("healthtech", MAIL_HEALTH),
    INDUSTRY("edtech", MAIL_EDU),
  );

  // new mail: noise to learn to ignore, and threads that follow up earlier answers
  MAIL_ALL.forEach((c) => {
    const side = (x) => x && { label: x.label, log: x.log, effects: {}, mx: x.fx };
    INBOX.push({
      id: c.id,
      from: c.from,
      title: c.title,
      body: c.body,
      when: c.after
        ? (s) => {
            const h = s.mailLog && s.mailLog[c.after.id];
            return !!h && h.side === c.after.side && s.week - h.week >= c.after.weeks && !(s.inboxSeen || {})[c.id];
          }
        : c.when,
      left: side(c.left),
      right: side(c.right),
      ignore: c.ignore && { log: c.ignore.log, effects: {}, mx: c.ignore.fx },
    });
  });

  // labels for effect previews; Arabic BAD_UP words cover churn, tech debt and burn
  const FX_LABELS = {
    cash: "Cash",
    mrrPct: "MRR",
    users: "Users",
    churn: "Churn",
    morale: "Morale",
    clarity: "Clarity",
    techDebt: "Tech Debt",
    trust: "Investor Trust",
    arpu: "ARPU",
    pmf: "Fit",
    culture: "Culture",
    cofounder: "Co‑founder", // non-breaking hyphen: a plain "-" would read as a minus sign in the effect chips
    boardTrust: "Board trust",
    equity: "Equity",
    baseBurn: "Burn",
    family: "Family",
    partner: "Nour",
    xp: "EXP",
  };
  const sign = (v) => (v < 0 ? "-" : "+");
  function previewOf(fx) {
    return Object.keys(fx || {})
      .map((k) => {
        const v = fx[k],
          a = Math.abs(v);
        if (k === "cash" || k === "baseBurn" || k === "arpu") return FX_LABELS[k] + " " + sign(v) + "$" + Math.round(a).toLocaleString();
        if (k === "mrrPct") return FX_LABELS[k] + " " + sign(v) + Math.round(a * 100) + "%";
        if (k === "churn" || k === "equity") return FX_LABELS[k] + " " + sign(v) + a + "%";
        return FX_LABELS[k] + " " + sign(v) + Math.round(a);
      })
      .join(" | ");
  }

  const rel = (s, id) => (s.relationships || []).find((r) => r.id === id);
  function applyFx(engine, fx) {
    const s = engine.state,
      o = ensureOrg(s),
      m = ensureMarket(s);
    for (const k in fx || {}) {
      const v = fx[k];
      if (k === "cash") s.cash += v;
      else if (k === "mrrPct") {
        let d = s.monthlyRevenue * v;
        if (s.monthlyRevenue > 0 && Math.abs(d) < 150) d = 150 * Math.sign(v);
        if (d > 0) d *= growthMult(s) * teamMult(s) * seasonMult(s);
        s.monthlyRevenue = Math.max(0, Math.round(s.monthlyRevenue + d));
      } else if (k === "users") s.activeUsers = Math.max(0, s.activeUsers + v);
      else if (k === "churn") s.churnRate = clamp(s.churnRate + v, 0.5, 25);
      else if (k === "morale") s.teamMorale = clamp(s.teamMorale + v, 0, 100);
      else if (k === "clarity") s.mentalClarity = clamp(s.mentalClarity + v, 0, 100);
      else if (k === "techDebt") s.techDebt = clamp(s.techDebt + v, 0, 100);
      else if (k === "trust") s.investorTrust = clamp((s.investorTrust == null ? 80 : s.investorTrust) + v, 0, 100);
      else if (k === "arpu") s.arpu = Math.max(5, s.arpu + v);
      else if (k === "pmf") m.pmf = clamp(m.pmf + v, 0, 100);
      else if (k === "culture") o.culture = clamp(o.culture + v, 0, 100);
      else if (k === "cofounder") rel(s, "co") && (rel(s, "co").health = clamp(rel(s, "co").health + v, 0, 100));
      else if (k === "boardTrust") o.board && (o.board.trust = clamp(o.board.trust + v, 0, 100));
      else if (k === "equity") s.equity = clamp((s.equity == null ? 100 : s.equity) + v, 1, 100);
      else if (k === "baseBurn") s.baseBurn = Math.max(0, s.baseBurn + (v > 0 ? v * 0.5 : v)); // permanent costs stack up over a run
      else if (k === "family") rel(s, "fam") && (rel(s, "fam").health = clamp(rel(s, "fam").health + v, 0, 100));
      else if (k === "partner") rel(s, "nour") && (rel(s, "nour").health = clamp(rel(s, "nour").health + v, 0, 100));
      else if (k === "xp") s.founderExp += v;
    }
    engine.recalculate();
  }

  // consequences for some of the original game's dilemmas
  const ENGINE_ECHOES = {
    POP_002: { option_A: { after: [6, 12], icon: "🕳", title: "The bugs you shipped are now tickets", text: "The fast launch is still being paid for. Support spends half its week on bugs from launch day, and two customers asked for refunds.", fx: { techDebt: 8, churn: 0.5 } } },
    POP_003: { option_A: { after: [8, 16], icon: "🚪", title: "Two good engineers resigned the same week", text: "They didn't mention the star performer in their exit interviews. They didn't have to.", fx: { morale: -12, culture: -8, techDebt: 6 } } },
    POP_004: {
      option_A: { after: [10, 20], icon: "🤝", title: "The apology is still paying off", text: "A customer who stayed after the outage just referred two companies. They said it was because you told the truth.", fx: { mrrPct: 0.05, trust: 4 } },
      option_B: { after: [10, 22], icon: "📰", title: "A journalist found the outage logs", text: "The story about the \"routine maintenance\" ran this morning, right in the middle of your investor conversations.", fx: { trust: -12, churn: 1, clarity: -6 } },
    },
    POP_009: { option_B: { after: [8, 18], icon: "🌱", title: "She sent you a senior engineer", text: "The engineer you let go well referred a friend who was tired of big tech. He starts Monday at a fair salary.", fx: { techDebt: -8, morale: 6, xp: 40 } } },
    POP_011: {
      option_A: { after: [6, 12], icon: "🧘", title: "The week off is still paying off", text: "You've made fewer panicked decisions since you came back. The team noticed before you did.", fx: { clarity: 8, morale: 4 } },
      option_B: { after: [6, 14], icon: "😵‍💫", title: "Your body sent the bill", text: "A migraine on a Tuesday, a week of bad sleep, and a doctor who said the word \"burnout\" twice.", fx: { clarity: -14, partner: -6 } },
    },
    POP_012: { option_A: { after: [12, 24], icon: "🏷", title: "Everyone wants the prepay discount", text: "Word got around. Three customers now ask for the same deal, and your new pricing page looks negotiable.", fx: { arpu: -3, mrrPct: -0.03 } } },
  };

  // ---------------------------------------------------------- the calendar
  // A 52-week year. Ramadan moves about 11 days earlier every year.
  function season(s) {
    const year = Math.floor((s.week - 1) / 52),
      w = ((s.week - 1) % 52) + 1,
      ram = Math.max(2, 14 - 2 * year);
    if (w >= ram && w < ram + 4) return "ramadan";
    if (w === ram + 4) return "eid";
    if (w === ram + 10) return "adha";
    if (w >= 27 && w <= 34) return "summer";
    return null;
  }
  const CONSUMER = { ecommerce_marketplace: 1, edtech: 1 };
  function seasonMult(s) {
    const t = season(s),
      consumer = CONSUMER[s.sector && s.sector.id];
    if (t === "ramadan") return consumer ? 1.15 : 0.9;
    if (t === "summer") return consumer ? 0.9 : 0.75;
    return 1;
  }
  const SEASON_NEWS = {
    ramadan: ["🌅 Ramadan begins", "Shorter working days, long nights, and usage that peaks after iftar. Consumer products get busier; B2B decisions slow down."],
    eid: ["🎉 Eid al-Fitr", "The office empties for a few days. Shoppers spend, and the team comes back rested."],
    adha: ["🎉 Eid al-Adha", "A long holiday. Nobody answers email, and that's fine."],
    summer: ["⛰ Summer slowdown", "Decision makers are travelling until September. B2B deals stall; plan for a slow two months."],
  };

  function ensureStory(s) {
    if (!s.story) s.story = { seen: {}, echoes: [], season: null, nourWeek: -99, lonely: 0 };
    if (s.relationships && !rel(s, "nour")) {
      s.relationships.push({ id: "nour", name: "Nour", role: "Partner", health: 75, weeksSinceContact: 0 });
      s.relationships.push({ id: "fam", name: "Mum & Dad", role: "Family", health: 70, weeksSinceContact: 0 });
    }
    return s.story;
  }

  // seasonal dilemmas only appear in their season, and open it when they can
  const SEASONAL = { dl_mena_07: "ramadan", dl_mena_08: "eid", dl_mena_09: "summer" };
  function libraryEvent(s, only) {
    const st = ensureStory(s),
      pool = LIBRARY.filter((d) => {
        if (st.seen[d.id] || (only && d.id !== only)) return false;
        if (SEASONAL[d.id] && SEASONAL[d.id] !== season(s)) return false;
        try {
          return !d.when || d.when(s);
        } catch (e) {
          return false;
        }
      });
    if (!pool.length) return null;
    // the industry's own dilemmas come up about every other time while any are left
    const own = pool.filter((x) => x.industry),
      from = own.length && Math.random() < 0.45 ? own : pool;
    const d = from[Math.floor(Math.random() * from.length)];
    st.seen[d.id] = s.week;
    return {
      id: d.id,
      icon: d.icon,
      category: d.cat,
      title: d.title,
      description: d.desc,
      option_A: { title: d.A.title, preview: previewOf(d.A.fx), effects: {}, log_text: d.A.log },
      option_B: { title: d.B.title, preview: previewOf(d.B.fx), effects: {}, log_text: d.B.log },
    };
  }

  function storyWeek(engine) {
    const s = engine.state,
      st = ensureStory(s),
      notes = s.mkt ? s.mkt.notes : [];

    // echoes that are due
    const due = st.echoes.filter((e) => s.week >= e.due);
    st.echoes = st.echoes.filter((e) => s.week < e.due);
    due.forEach((e) => {
      applyFx(engine, e.fx);
      const good = Object.keys(e.fx).reduce((a, k) => a + (["churn", "techDebt", "baseBurn"].includes(k) ? -e.fx[k] : e.fx[k]), 0) > 0;
      const when = `Your decision in week ${e.from}.`;
      engine.addLog("⏪ " + e.title, e.text + " " + when, good ? "mentor" : "negative");
      notes.push([e.icon, e.title + ". " + when, good ? 1 : -1]);
    });

    // the calendar
    const now = season(s);
    if (now !== st.season) {
      st.season = now;
      if (now) {
        const [title, text] = SEASON_NEWS[now];
        engine.addLog(title, text, "mentor");
        notes.push([leadEmoji(title)[0], text, 0]);
        if (now === "eid" || now === "adha") s.teamMorale = Math.min(100, s.teamMorale + 5);
        if (now === "eid" && CONSUMER[s.sector && s.sector.id]) s.monthlyRevenue = Math.round(s.monthlyRevenue * 1.06);
        const id = Object.keys(SEASONAL).find((k) => SEASONAL[k] === now);
        if (id && (!s.pendingEvent || /^POP_/.test(s.pendingEvent.id))) s.pendingEvent = libraryEvent(s, id) || s.pendingEvent;
      }
    }

    // the people outside work: they fade half as fast as business contacts
    const nour = rel(s, "nour"),
      fam = rel(s, "fam");
    [nour, fam].forEach((r) => r && (r.health = Math.min(100, r.health + 1)));
    if (nour && nour.health < 25 && s.week - st.nourWeek >= 12 && !s.pendingEvent) {
      st.nourWeek = s.week;
      s.pendingEvent = {
        id: "ST_NOUR",
        icon: "❤",
        category: "Personal",
        title: "Nour asks you to choose",
        description: "\"I'm not asking you to quit. I'm asking whether there's still room for us in this.\" Nour has packed a bag for the weekend, for two.",
        option_A: { title: "Go. Phone off for 48 hours", preview: "Nour +30 | Clarity +10 | Morale -4", effects: {}, log_text: "Two days, no laptop. You remembered why you started all of this." },
        option_B: { title: "Ask for one more month", preview: "Nour -12 | EXP +30", effects: {}, log_text: "Nour unpacked the bag without saying anything." },
      };
    }
    if (nour && nour.health <= 0 && (!fam || fam.health < 15)) {
      if (++st.lonely >= 3 && !s.gameOver) {
        s.gameOver = !0;
        s.overType = "alone";
        s.endReason = "You built a company, and lost everyone who'd have celebrated it.";
      }
    } else st.lonely = 0;

    // more dilemmas: the original events mostly give way to the library
    if (s.pendingEvent && /^POP_/.test(s.pendingEvent.id) && Math.random() < 0.6) {
      const ev = libraryEvent(s);
      if (ev) s.pendingEvent = ev;
    } else if (!s.pendingEvent && s.week % 3 === 1 && s.week > 2 && Math.random() < 0.35) {
      s.pendingEvent = libraryEvent(s);
    }
  }

  (function () {
    const P = Engine.StartupEngine.prototype;
    if (P.__story) return;
    P.__story = true;
    const recalc = P.recalculate;
    P.recalculate = function () {
      ensureStory(this.state);
      return recalc.call(this);
    };
    const advance = P.advanceWeek;
    P.advanceWeek = function () {
      advance.call(this);
      if (!this.state.gameOver && !this.state.victory) storyWeek(this);
      return this.recalculate();
    };
    const resolve = P.resolveEventChoice;
    P.resolveEventChoice = function (key = "option_A") {
      const s = this.state,
        st = ensureStory(s),
        ev = s.pendingEvent;
      const res = resolve.call(this, key);
      if (!ev) return res;
      const d = LIBRARY.find((x) => x.id === ev.id);
      const opt = d ? d[key === "option_A" ? "A" : "B"] : null;
      if (opt) applyFx(this, opt.fx);
      if (ev.id === "ST_NOUR") applyFx(this, key === "option_A" ? { partner: 30, clarity: 10, morale: -4 } : { partner: -12, xp: 30 });
      const echo = opt ? opt.echo : ENGINE_ECHOES[ev.id] && ENGINE_ECHOES[ev.id][key];
      if (echo) st.echoes.push({ due: s.week + rand(echo.after[0], echo.after[1]), from: s.week, icon: echo.icon, title: echo.title, text: echo.text, fx: echo.fx });
      return this.recalculate();
    };
  })();
