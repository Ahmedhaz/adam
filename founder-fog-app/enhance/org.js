  // ================================================================ org
  // Phase 3 of the content plan: people and capital as strategy.
  //   * every hire has a job (engineer, sales, support, marketer, designer,
  //     operator) that changes what the company can do, after a 4-week ramp
  //   * the first 10 hires set the culture, which pulls morale up or down
  //   * term sheets carry terms (liquidation preference, board seat, control),
  //     close only after due diligence, and can fall through; a pass leaves a signal
  //   * other money: revenue-based financing, an innovation grant, an angel bridge
  //   * a board meets every 12 weeks, sets a target and can replace you
  //   * the co-founder relationship can break, and vesting decides the damage
  // shares App's scope (see economy.js / market.js).

  const ROLE_FNS = {
    engineer: { icon: "🛠️", name: "Engineer", title: "Software Engineer", does: "Pays down tech debt and makes every build land harder.", pay: 1.2, weight: 30 },
    sales: { icon: "💼", name: "Sales", title: "B2B Sales Lead", does: "Closes bigger deals: revenue gains +10% each. Overpromises, so tech debt creeps.", pay: 1, weight: 15 },
    support: { icon: "🫶", name: "Support", title: "Customer Support Lead", does: "Looks after 900 more users and lowers churn.", pay: 0.7, weight: 15 },
    marketer: { icon: "📣", name: "Marketer", title: "Growth Marketer", does: "Cheaper, stronger campaigns, but only once fit is above 40%.", pay: 0.9, weight: 15 },
    designer: { icon: "🎨", name: "Designer", title: "Product Designer", does: "Customer insights turn into better product: build gains +30%.", pay: 1, weight: 12 },
    operator: { icon: "🧭", name: "Operator", title: "Operations Lead (COO)", does: "Takes work off your plate: clarity drains slower. Can clash with the culture.", pay: 1.4, weight: 13 },
  };
  const CULTURE_HIT = { star_performer: 4, enthusiastic_junior: 3, brilliant_jerk: -12, burned_out_senior: -4 };

  function pickFn() {
    const all = Object.keys(ROLE_FNS),
      total = all.reduce((a, k) => a + ROLE_FNS[k].weight, 0);
    let r = Math.random() * total;
    for (const k of all) if ((r -= ROLE_FNS[k].weight) < 0) return k;
    return "engineer";
  }
  const hash = (str) => [...String(str)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  function fnOf(m) {
    if (m.fn) return m.fn;
    if (m.id === "emp_founder") return null;
    if (m.id === "emp_cto") return "engineer";
    const all = Object.keys(ROLE_FNS);
    return (m.fn = all[hash(m.id) % all.length]);
  }

  function ensureOrg(s) {
    if (!s.org)
      s.org = { culture: 60, hires: 0, vested: false, cofounderGone: false, coTalkWeek: -99, pending: null, passUntil: 0, debt: null, grant: null, notes: 0, bridgeStage: 0, prefs: 0, board: null, events: [] };
    if (!s.org.events) s.org.events = [];
    (s.candidatePool || []).forEach((c) => {
      if (c.fn) return;
      c.fn = pickFn();
      c.role = ROLE_FNS[c.fn].title;
      c.salary = Math.round((c.salary * ROLE_FNS[c.fn].pay) / 50) * 50;
    });
    return s.org;
  }

  // effective head count per job, with a 4-week ramp for new hires
  function staff(s) {
    const out = { engineer: 0, sales: 0, support: 0, marketer: 0, designer: 0, operator: 0 };
    s.team.forEach((m) => {
      const f = fnOf(m);
      if (f) out[f] += m.hiredWeek ? clamp((s.week - m.hiredWeek) / 4, 0.25, 1) : 1;
    });
    return out;
  }
  const headcount = (s) => {
    const out = { engineer: 0, sales: 0, support: 0, marketer: 0, designer: 0, operator: 0 };
    s.team.forEach((m) => fnOf(m) && (out[fnOf(m)] += 1));
    return out;
  };

  // used by market.js (revenue gains) and economy.js (support capacity, debt)
  function teamMult(s, isMarketing) {
    const n = staff(s),
      fit = s.mkt ? s.mkt.pmf : 30;
    let m = 1 + Math.min(0.5, 0.1 * n.sales);
    if (isMarketing && fit >= 40) m *= 1 + Math.min(0.75, 0.25 * n.marketer);
    if (s.org && s.org.pending) m *= 0.85; // fundraising distracts the founder
    return m;
  }
  function supportCapacity(s) {
    return 300 * Math.max(1, s.team.length) + 900 * staff(s).support;
  }
  function debtMonthly(s) {
    const d = s.org && s.org.debt;
    return d && s.week < d.until ? d.perMonth : 0;
  }
  const founderSeats = (s) => 1 + (s.team.some((m) => m.id === "emp_cto") ? 1 : 0);
  const boardControl = (s) => !!(s.org && s.org.board && s.org.board.investors >= founderSeats(s));
  // what the founder takes home if the company sold at today's valuation
  const takeHome = (s) => (Math.max(0, s.valuation - ((s.org && s.org.prefs) || 0)) * (s.equity == null ? 100 : s.equity)) / 100;

  // custom dilemmas reuse the engine's dilemma card; choices are handled here
  function orgEvent(s, ev) {
    s.pendingEvent = { category: "Board & Team", ...ev };
  }

  const BOARD_ASKS = {
    growth: (s) => ({ kind: "growth", target: Math.round(Math.max(s.monthlyRevenue * 1.3, s.monthlyRevenue + 2000) / 100) * 100, text: (t) => `Grow MRR to ${money(t)} by the next meeting.` }),
    burn: (s) => ({ kind: "burn", target: Math.round((s.netBurn * 0.8) / 100) * 100, text: (t) => `Get net burn under ${money(t)} a month by the next meeting.` }),
    fit: () => ({ kind: "fit", target: 40, text: () => "Show product-market fit above 40% by the next meeting." }),
  };
  function askMet(s, ask) {
    if (ask.kind === "growth") return s.monthlyRevenue >= ask.target;
    if (ask.kind === "burn") return s.netBurn <= ask.target;
    return (s.mkt ? s.mkt.pmf : 0) >= ask.target;
  }
  function newAsk(s) {
    const fit = s.mkt ? s.mkt.pmf : 30;
    const kind = fit < 35 ? "fit" : s.netBurn > 0 && Math.random() < 0.4 ? "burn" : "growth";
    const a = BOARD_ASKS[kind](s);
    return { kind: a.kind, target: a.target, text: a.text(a.target) };
  }

  function orgWeek(engine) {
    const s = engine.state,
      o = ensureOrg(s),
      note = (icon, text, tone) => (s.mkt ? s.mkt.notes : []).push([icon, text, tone]);
    const n = staff(s);

    // jobs at work
    s.techDebt = clamp(s.techDebt - 0.5 * n.engineer + 0.2 * n.sales, 0, 100);
    s.churnRate = Math.max(0.5, s.churnRate - Math.min(0.3, 0.05 * n.support));
    if (s.mkt && s.mkt.pmf >= 40 && n.marketer) s.cac = Math.max(20, s.cac * (1 - Math.min(0.06, 0.02 * n.marketer)));
    if (n.operator) {
      s.mentalClarity = Math.min(100, s.mentalClarity + Math.min(2, n.operator));
      s.teamMorale = Math.max(0, s.teamMorale - 0.3 * n.operator);
    }
    // culture pulls morale towards itself
    s.teamMorale = clamp(s.teamMorale + (o.culture - 50) * 0.02, 0, 100);

    // fundraising: due diligence, then the money lands (or doesn't)
    const p = o.pending;
    if (p) {
      s.mentalClarity = Math.max(0, s.mentalClarity - 1.5);
      const shaky = s.monthlyRevenue < p.mrrAtSign * 0.9 || (s.econ && s.econ.mood === "winter" && p.moodAtSign !== "winter");
      if (shaky && !p.warned) {
        p.warned = true;
        if (Math.random() < 0.35) {
          o.pending = null;
          s.rounds = (s.rounds || []).filter((r) => !r.pending);
          s.investorTrust = Math.max(0, (s.investorTrust || 80) - 15);
          o.passUntil = s.week + 12;
          const why = s.econ && s.econ.mood === "winter" ? "The market turned." : "Your numbers slipped while they were checking them.";
          engine.addLog("💔 The term sheet was pulled", `${p.investor} pulled out in due diligence. ${why} Other investors will ask why.`, "negative");
          note("💔", `${p.investor} pulled the term sheet in due diligence.`, -1);
        }
      }
      if (o.pending && s.week >= p.closeWeek) closeRound(engine);
    }

    // innovation grant decision
    if (o.grant && o.grant.status === "applied" && s.week >= o.grant.decideWeek) {
      if (Math.random() < 0.5) {
        o.grant.status = "won";
        s.cash += o.grant.amount;
        engine.addLog("🏛️ Grant approved", `The innovation fund approved ${money(o.grant.amount)}. Non-dilutive: you keep every share.`, "mentor");
        note("🏛️", `Grant approved: ${money(o.grant.amount)}.`, 1);
      } else {
        o.grant.status = "lost";
        engine.addLog("🏛️ Grant rejected", "The committee chose eight other startups. The application still sharpened your story.", "negative");
        note("🏛️", "The grant application was rejected.", -1);
      }
    }

    // the board
    const b = o.board;
    if (b) {
      b.trust = clamp(b.trust + ((s.investorTrust == null ? 80 : s.investorTrust) - 60) * 0.02, 0, 100);
      if (s.week >= b.nextMeeting && !s.pendingEvent) {
        b.nextMeeting = s.week + 12;
        let review = "First meeting. Everyone is polite.";
        if (b.ask) {
          const met = askMet(s, b.ask);
          b.trust = clamp(b.trust + (met ? 15 : -20), 0, 100);
          review = met ? "You hit the target you committed to. The room relaxes." : "You missed the target you committed to. The room goes quiet.";
        }
        if (b.trust < 20 && boardControl(s)) {
          s.gameOver = !0;
          s.overType = "board";
          s.endReason = "The board replaced you.";
          engine.addLog("🪑 The board voted", "They thanked you for everything you built and asked for your laptop by Friday.", "negative");
          return;
        }
        if (b.trust < 20) {
          engine.addLog("🪑 The board wants you out", "They can't outvote you, so you stay. Every meeting from now on is a negotiation.", "negative");
          note("🪑", "The board wants you out, but you control the votes.", -1);
        }
        const ask = newAsk(s);
        b.offer = ask;
        orgEvent(s, {
          id: "ORG_BOARD",
          icon: "🪑",
          title: "📋 Board meeting",
          description: `${review} Board trust is ${Math.round(b.trust)}%. Their ask: ${ask.text}`,
          option_A: { title: "Commit to their target", preview: "Board trust +5", effects: {}, log_text: "You committed in front of the whole board." },
          option_B: { title: "Push back with your own plan", preview: "Board trust −8 | Clarity +6 | Easier target", effects: {}, log_text: "You argued for your own plan and got a softer target." },
        });
      }
    }

    // the co-founder
    const cto = s.team.find((m) => m.id === "emp_cto"),
      rel = (s.relationships || []).find((r) => r.id === "co");
    if (cto && rel) {
      if (s.mentalClarity < 25) rel.health = Math.max(0, rel.health - 1); // stress leaks into the partnership
      if (s.mkt && s.mkt.pmf >= 40) rel.health = Math.min(100, rel.health + 1); // winning together heals
      if (rel.health < 8) {
        s.team = s.team.filter((m) => m.id !== "emp_cto");
      } else if (rel.health < 35 && s.week - o.coTalkWeek >= 12 && !s.pendingEvent) {
        o.coTalkWeek = s.week;
        orgEvent(s, {
          id: "ORG_COFOUNDER",
          icon: "🤝",
          title: "Tariq wants to talk",
          description: "He says he's doing half the work for none of the credit, and he's not sure he still believes in the plan. He wants an answer this week.",
          option_A: { title: "More equity and the CTO title, publicly", preview: "Equity −3% | Co-founder +30", effects: {}, log_text: "You gave him more of the company and the credit he asked for." },
          option_B: { title: "Tell him the plan isn't changing", preview: "Co-founder −10 | Clarity +3", effects: {}, log_text: "You held your ground. He went quiet." },
        });
      }
    }
    if (!o.cofounderGone && !s.team.some((m) => m.id === "emp_cto")) cofounderLeft(engine);
  }

  function cofounderLeft(engine) {
    const s = engine.state,
      o = ensureOrg(s);
    o.cofounderGone = true;
    s.techDebt = Math.min(100, s.techDebt + 10);
    s.teamMorale = Math.max(0, s.teamMorale - 10);
    if (s.mkt) s.mkt.pmf = Math.max(0, s.mkt.pmf - 4);
    let text;
    if (o.vested) text = "Vesting did its job: he keeps only the shares he earned, and the rest come back to the company.";
    else {
      s.equity = Math.max(1, (s.equity == null ? 100 : s.equity) - 12);
      s.investorTrust = Math.max(0, (s.investorTrust || 80) - 15);
      text = "There was no vesting, so he walks away with a big block of shares and does no more work for them. Investors call it dead equity. Your stake −12%.";
    }
    engine.addLog("💔 Your co-founder left", text, "negative");
    if (s.mkt) s.mkt.notes.push(["💔", "Tariq left the company. " + (o.vested ? "Vesting protected the cap table." : "No vesting: dead equity on your cap table."), -1]);
    if (s.monthlyRevenue < 2000 && s.week < 30 && !s.gameOver) {
      s.gameOver = !0;
      s.overType = "cofounder";
      s.endReason = "Tariq left, and the company went with him.";
    }
  }

  function closeRound(engine) {
    const s = engine.state,
      o = ensureOrg(s),
      p = o.pending;
    o.pending = null;
    // an angel bridge converts into this round at a 20% discount
    let extra = 0;
    if (o.notes > 0) {
      extra = o.notes / (p.post * 0.8);
      engine.addLog("🔁 Bridge note converted", `Your ${money(o.notes)} angel bridge converted into this round at a 20% discount: another ${(extra * 100).toFixed(1)}% of the company.`, "mentor");
      o.notes = 0;
    }
    s.cash += p.amount;
    s.equity = (s.equity == null ? 100 : s.equity) * (1 - p.pct) * (1 - extra);
    s.valuation = Math.max(s.valuation, p.post);
    o.prefs += p.amount * p.pref;
    (s.rounds || []).forEach((r) => r.pending && (r.pending = false));
    if (p.seat) {
      if (!o.board) o.board = { investors: 0, trust: 70, nextMeeting: s.week + 12, ask: null };
      o.board.investors += p.control ? 2 : 1;
    }
    const seat = p.seat ? (p.control ? " Investors now control the board." : " They take a board seat.") : "";
    const pref = p.pref > 1 ? " Their 2× preference means they get paid twice their money before you see a dollar." : "";
    engine.addLog("💼 Round closed", `${p.investor}'s ${money(p.amount)} landed after due diligence. You own ${s.equity.toFixed(1)}%.${seat}${pref}`, "mentor");
    if (s.mkt) s.mkt.notes.push(["💼", `Round closed: ${money(p.amount)} landed.`, 1]);
  }

  (function () {
    const P = Engine.StartupEngine.prototype;
    if (P.__org) return;
    P.__org = true;
    const recalc = P.recalculate;
    P.recalculate = function () {
      ensureOrg(this.state);
      return recalc.call(this);
    };
    const advance = P.advanceWeek;
    P.advanceWeek = function () {
      advance.call(this);
      if (!this.state.gameOver && !this.state.victory) orgWeek(this);
      return this.recalculate();
    };

    const hire = P.hireCandidate;
    P.hireCandidate = function (id) {
      const s = this.state,
        o = ensureOrg(s),
        cand = (s.candidatePool || []).find((c) => c.id === id);
      const res = hire.call(this, id);
      if (res && res.success && cand) {
        const m = s.team.find((x) => x.id === cand.id);
        if (m) {
          m.fn = cand.fn;
          m.role = cand.role;
          m.hiredWeek = s.week;
        }
        o.hires += 1;
        if (o.hires <= 10) o.culture = clamp(o.culture + (CULTURE_HIT[cand.archetypeKey] || 0) + (cand.fn === "operator" ? 3 : 0), 0, 100);
        ensureOrg(s);
        this.recalculate();
      }
      return res && res.state ? { ...res, state: this.state } : res;
    };
    const fire = P.fireEmployee;
    P.fireEmployee = function (id) {
      const s = this.state,
        o = ensureOrg(s),
        m = s.team.find((x) => x.id === id);
      const res = fire.call(this, id);
      if (res && res.success && m && m.archetypeKey === "brilliant_jerk") {
        o.culture = clamp(o.culture + 8, 0, 100);
        this.addLog("🧹 Culture recovering", "The room got easier to be in the day they left. Culture +8.", "mentor");
      }
      return res && res.state ? { ...res, state: this.state } : res;
    };

    const strat = P.executeTargetStrategy;
    P.executeTargetStrategy = function (id) {
      const res = strat.call(this, id);
      if (res && res.success && id === "w1_strat_2") ensureOrg(this.state).vested = true;
      return res;
    };

    const build = P.buildProduct;
    P.buildProduct = function (idx) {
      const s = this.state,
        before = s.mkt ? s.mkt.pmf : 0;
      const res = build.call(this, idx);
      const d = (s.mkt ? s.mkt.pmf : 0) - before;
      if (res && res.success && d > 0) {
        const n = staff(s),
          bonus = Math.min(0.4, 0.1 * n.engineer) + Math.min(0.6, 0.3 * n.designer);
        s.mkt.pmf = clamp(s.mkt.pmf + Math.round(d * bonus), 0, 100);
      }
      return res && res.state ? { ...res, state: this.recalculate() } : res;
    };

    const resolve = P.resolveEventChoice;
    P.resolveEventChoice = function (key = "option_A") {
      const s = this.state,
        o = ensureOrg(s),
        ev = s.pendingEvent;
      if (ev && ev.id === "POP_001" && key === "option_B") o.vested = true;
      const res = resolve.call(this, key);
      if (ev && ev.id === "ORG_BOARD" && o.board) {
        const ask = o.board.offer;
        if (key === "option_A") o.board.trust = clamp(o.board.trust + 5, 0, 100);
        else {
          o.board.trust = clamp(o.board.trust - 8, 0, 100);
          s.mentalClarity = Math.min(100, s.mentalClarity + 6);
          if (ask && ask.kind === "growth") ask.target = Math.round((s.monthlyRevenue + (ask.target - s.monthlyRevenue) * 0.6) / 100) * 100;
          if (ask && ask.kind === "burn") ask.target = Math.round((ask.target * 1.15) / 100) * 100;
          if (ask && ask.kind === "fit") ask.target = 35;
        }
        o.board.ask = ask;
        o.board.offer = null;
      }
      if (ev && ev.id === "ORG_COFOUNDER") {
        const rel = (s.relationships || []).find((r) => r.id === "co");
        if (key === "option_A") {
          s.equity = Math.max(1, (s.equity == null ? 100 : s.equity) - 3);
          if (rel) rel.health = Math.min(100, rel.health + 30);
        } else {
          if (rel) rel.health = Math.max(0, rel.health - 10);
          s.mentalClarity = Math.min(100, s.mentalClarity + 3);
        }
      }
      return this.recalculate();
    };

    const ok = (engine) => ({ success: !0, state: engine.recalculate() });
    const no = (reason) => ({ success: !1, reason: reason });

    // a signed term sheet: the money lands after due diligence
    P.signTermSheet = function (t) {
      const s = this.state,
        o = ensureOrg(s);
      if (o.pending) return no("A round is already in due diligence.");
      const weeks = rand(3, 6);
      o.pending = { ...t, closeWeek: s.week + weeks, mrrAtSign: s.monthlyRevenue, moodAtSign: s.econ && s.econ.mood, warned: false };
      s.rounds = (s.rounds || []).concat([{ week: s.week, stage: s.stage, name: t.round, amount: t.amount, pct: t.pct, investor: t.investor, pending: true }]);
      this.addLog("📝 Term sheet signed", `${t.investor}: ${money(t.amount)} for ${Math.round(t.pct * 100)}%. Due diligence takes about ${weeks} weeks. Keep the numbers steady until the money lands.`, "mentor");
      return ok(this);
    };
    P.passedOn = function () {
      ensureOrg(this.state).passUntil = this.state.week + 12;
      return this.state;
    };

    P.takeRBF = function () {
      const s = this.state,
        o = ensureOrg(s);
      if (s.monthlyRevenue < 3000) return no("Revenue-based financing needs at least $3,000 MRR.");
      if (debtMonthly(s) > 0) return no("You're still repaying the last one.");
      const amount = Math.round((s.monthlyRevenue * 6) / 500) * 500;
      o.debt = { amount: amount, perMonth: Math.round((amount * 1.2) / 12), until: s.week + 52 };
      s.cash += amount;
      this.addLog("💳 Revenue-based financing", `${money(amount)} now, no shares given. You repay ${money(o.debt.perMonth)} a month for a year: 20% more than you borrowed.`, "mentor");
      return ok(this);
    };
    P.applyForGrant = function () {
      const s = this.state,
        o = ensureOrg(s);
      if (o.grant) return no("You can only apply for this grant once.");
      if (s.slotUsed) return no("The application takes this week's action.");
      s.slotUsed = !0;
      s.mentalClarity = Math.max(0, s.mentalClarity - 6);
      o.grant = { status: "applied", decideWeek: s.week + 8, amount: 20000 };
      this.addLog("🏛️ Grant application sent", "Forty pages about your impact, your team and your market. The committee decides in 8 weeks.", "mentor");
      return ok(this);
    };
    P.takeBridge = function () {
      const s = this.state,
        o = ensureOrg(s);
      if (s.slotUsed) return no("Raising a bridge takes this week's action.");
      if (o.bridgeStage === s.stage) return no("One bridge per stage. Angels want to see progress first.");
      if ((s.investorTrust == null ? 80 : s.investorTrust) < 50) return no("Investor trust is too low for angels to write a cheque.");
      s.slotUsed = !0;
      const amount = 15000;
      o.bridgeStage = s.stage;
      o.notes += amount;
      s.cash += amount;
      this.addLog("👼 Angel bridge", `${money(amount)} on a convertible note. No valuation today; it turns into shares at your next round, at a 20% discount.`, "mentor");
      return ok(this);
    };
  })();

  // ------------------------------------------------------------- UI: team card
  function TeamCard({ S }) {
    const o = ensureOrg(S),
      hc = headcount(S),
      rel = (S.relationships || []).find((r) => r.id === "co"),
      cto = S.team.some((m) => m.id === "emp_cto");
    return jsxs(View, {
      style: ost.card,
      children: [
        jsxs(View, {
          style: ost.rowBetween,
          children: [
            jsx(Text, { style: ost.kicker, children: "WHO DOES WHAT" }),
            jsx(Text, { style: [ost.kicker, { color: o.culture >= 55 ? COLOR.vital : o.culture >= 40 ? COLOR.fog : COLOR.crit }], children: "CULTURE " + Math.round(o.culture) }),
          ],
        }),
        jsx(View, {
          style: ost.fnGrid,
          children: Object.keys(ROLE_FNS).map((k) =>
            jsxs(View, { style: [ost.fn, !hc[k] && { opacity: 0.45 }], children: [jsx(Pic, { e: ROLE_FNS[k].icon, size: 22 }), jsx(Text, { style: ost.fnName, numberOfLines: 1, children: ROLE_FNS[k].name }), jsx(Text, { style: ost.fnN, children: String(hc[k]) })] }, k),
          ),
        }),
        jsx(Text, { style: ost.hint, children: "New hires take 4 weeks to reach full speed. Your first 10 hires set the culture: one brilliant jerk costs more than they ship." }),
        jsxs(View, {
          style: [ost.rowBetween, { marginTop: 10 }],
          children: [
            jsx(Text, { style: ost.label, children: cto ? "🤝 Co-founder trust" : "🤝 Co-founder" }),
            jsx(Text, { style: [ost.value, { color: !cto ? COLOR.text3 : rel && rel.health < 35 ? COLOR.crit : COLOR.vital }], children: cto ? Math.round(rel ? rel.health : 0) + "%" : "Left" }),
          ],
        }),
        jsx(Text, { style: ost.hint, children: o.vested ? "Vesting is signed: if he leaves, unearned shares come back." : "No vesting yet. If he leaves now, he keeps his shares." }),
      ],
    });
  }

  // ---------------------------------------------------------- UI: board card
  function BoardCard({ S }) {
    const o = ensureOrg(S),
      b = o.board,
      p = o.pending;
    return jsxs(View, {
      style: ost.card,
      children: [
        jsx(Text, { style: ost.kicker, children: "CAP TABLE & BOARD" }),
        jsxs(View, { style: [ost.rowBetween, { marginTop: 8 }], children: [jsx(Text, { style: ost.label, children: "You own" }), jsx(Text, { style: ost.value, children: (S.equity == null ? 100 : S.equity).toFixed(1) + "%" })] }),
        o.prefs > 0 && jsxs(View, { style: ost.rowBetween, children: [jsx(Text, { style: ost.label, children: "Paid to investors first" }), jsx(Text, { style: [ost.value, { color: COLOR.crit }], children: compact(o.prefs) })] }),
        jsxs(View, { style: ost.rowBetween, children: [jsx(Text, { style: ost.label, children: "Your take if you sold today" }), jsx(Text, { style: [ost.value, { color: COLOR.gold }], children: compact(takeHome(S)) })] }),
        o.notes > 0 && jsx(Text, { style: ost.hint, children: `${money(o.notes)} bridge note converts at your next round.` }),
        p && jsx(Text, { style: [ost.hint, { color: COLOR.act }], children: `${p.investor}: ${money(p.amount)} in due diligence, closes around week ${p.closeWeek}.` }),
        b
          ? jsxs(View, {
              style: { marginTop: 8 },
              children: [
                jsxs(View, { style: ost.rowBetween, children: [jsx(Text, { style: ost.label, children: "Board" }), jsx(Text, { style: ost.value, children: `${founderSeats(S)} founder · ${b.investors} investor` })] }),
                jsxs(View, { style: ost.rowBetween, children: [jsx(Text, { style: ost.label, children: "Board trust" }), jsx(Text, { style: [ost.value, { color: b.trust < 30 ? COLOR.crit : b.trust < 55 ? COLOR.fog : COLOR.vital }], children: Math.round(b.trust) + "%" })] }),
                jsx(Text, { style: ost.hint, children: (b.ask ? "Their target: " + b.ask.text + " " : "") + `Next meeting: week ${b.nextMeeting}.` + (boardControl(S) ? " Investors control the board: if trust falls below 20%, they can replace you." : "") }),
              ],
            })
          : jsx(Text, { style: ost.hint, children: "No board yet. Your first priced round with a seat creates one." }),
      ],
    });
  }

  // ------------------------------------------------- UI: other ways to fund
  function FundingOptions({ S, onDo }) {
    const o = ensureOrg(S),
      opt = (icon, title, sub, onPress, disabled, key) =>
        jsxs(
          Touchable,
          {
            style: [ost.opt, disabled && { opacity: 0.45 }],
            disabled: disabled,
            activeOpacity: 0.85,
            onPress: onPress,
            children: [jsx(Pic, { e: icon, size: 26 }), jsxs(View, { style: { flex: 1 }, children: [jsx(Text, { style: ost.optTitle, children: title }), jsx(Text, { style: ost.optSub, children: sub })] })],
          },
          key,
        );
    return jsxs(View, {
      children: [
        jsx(Text, { style: [est.kicker, { marginTop: 18 }], children: "OTHER WAYS TO FUND" }),
        debtMonthly(S) > 0 && jsx(Text, { style: est.hint, children: `Repaying ${money(o.debt.perMonth)} a month until week ${o.debt.until}.` }),
        opt("💳", "Revenue-based financing", S.monthlyRevenue >= 3000 ? `${money(Math.round((S.monthlyRevenue * 6) / 500) * 500)} now · repay 1.2× over 12 months · no shares` : "Needs $3,000 MRR", () => onDo((e) => e.takeRBF(), "Cash in. Repayments start now."), S.monthlyRevenue < 3000 || debtMonthly(S) > 0, "rbf"),
        opt("🏛️", "Innovation grant", o.grant ? (o.grant.status === "applied" ? `Decision in week ${o.grant.decideWeek}` : o.grant.status === "won" ? "Won" : "Rejected") : "$20,000, no shares · 50% odds · 8 weeks · uses this week's action", () => onDo((e) => e.applyForGrant(), "Application sent."), !!o.grant || S.slotUsed, "grant"),
        opt("👼", "Angel bridge", o.bridgeStage === S.stage ? "Used at this stage" : "$15,000 convertible note · converts at your next round at 20% off · uses this week's action", () => onDo((e) => e.takeBridge(), "Bridge in the bank."), o.bridgeStage === S.stage || S.slotUsed, "bridge"),
      ],
    });
  }

  const ost = StyleSheet.create({
    card: { backgroundColor: COLOR.panel, borderRadius: 18, padding: 14, marginHorizontal: 12, marginTop: 10, borderWidth: 1, borderColor: COLOR.line },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, paddingVertical: 3 },
    kicker: { fontFamily: "AzeretMono_500Medium", fontSize: 10, letterSpacing: 1, color: COLOR.text3 },
    fnGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
    fn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLOR.panel2, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 6, width: "31.8%" },
    fnName: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 11.5, color: COLOR.text },
    fnN: { fontFamily: "AzeretMono_600SemiBold", fontSize: 13, color: COLOR.text },
    label: { fontFamily: "Archivo_500Medium", fontSize: 13.5, color: COLOR.text2 },
    value: { fontFamily: "AzeretMono_600SemiBold", fontSize: 13.5, color: COLOR.text },
    hint: { fontFamily: "Archivo_400Regular", fontSize: 12, lineHeight: 17, color: COLOR.text3, marginTop: 6 },
    opt: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLOR.panel2, borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: COLOR.line },
    optTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 14.5, color: COLOR.text },
    optSub: { fontFamily: "Archivo_400Regular", fontSize: 12, lineHeight: 16, color: COLOR.text3, marginTop: 2 },
  });
