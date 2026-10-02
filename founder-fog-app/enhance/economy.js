  // ================================================================ economy
  // Phase 1 of the content plan: make the money behave like a real company's.
  //   * costs that grow with the company (servers, support, fees; price creep;
  //     every new stage re-prices rent, tools and salaries)
  //   * honest runway: revenue counts after gross margin, "default alive"
  //     replaces infinite runway, and shocks keep coming
  //   * valuation = ARR x a multiple (sector, growth, retention, market mood),
  //     plus a slowly fading premium from deals, perks and events
  //   * market cycles (hot market / normal / funding winter)
  //   * difficulty modes chosen at the start
  // Hooked in by wrapping StartupEngine.recalculate and advanceWeek, so all
  // engine code paths (actions, events, saves) go through it.
  // shares App's scope: React, View, Text, Touchable, Modal, ScrollView, Pic,
  // COLOR, money, compact, clamp, STAGE_NAMES, jsx, jsxs, StyleSheet, Engine.

  const MODES = {
    venture: { icon: "🚀", name: "Venture-backed", desc: "The classic story. Normal cash, normal market.", cash: 1, shock: 1 },
    bootstrapped: { icon: "🧾", name: "Bootstrapped", desc: "40% less cash, and investors won't meet you before week 26.", cash: 0.6, shock: 1, pitchFrom: 26 },
    winter: { icon: "🧊", name: "Funding winter", desc: "You start in a downturn: valuations are low and winters come back more often.", cash: 1, shock: 1.25, mood: "winter" },
    hard: { icon: "🌫️", name: "Founder Fog", desc: "40% less cash and almost three times the shocks. For bragging rights.", cash: 0.6, shock: 2.8 },
  };
  const MOODS = {
    bull: { icon: "📈", name: "Hot market", mult: 1.3, interest: 1 },
    normal: { icon: "🌅", name: "Normal market", mult: 1, interest: 0 },
    winter: { icon: "🧊", name: "Funding winter", mult: 0.6, interest: -1 },
  };
  const MOOD_NEWS = {
    bull: ["📈 Hot market", "VCs are writing fast cheques again. Valuation multiples are up 30%, and investors are easier to impress."],
    normal: ["🌅 The market is back to normal", "Multiples have settled. Investors are looking at fundamentals again: growth, retention, burn."],
    winter: ["🧊 Funding winter", "Interest rates are up and VCs are cutting multiples by 40%. Rounds get harder. Default-alive companies sleep well tonight."],
  };
  // what a dollar of ARR is worth in each sector, in a normal market
  const SECTOR_MULTIPLE = { saas_ai: 10, fintech: 8, ecommerce_marketplace: 4, healthtech: 7, edtech: 6 };
  const pitchFrom = (s) => (MODES[s.mode] || MODES.venture).pitchFrom || 3;
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  function ensureEcon(s) {
    if (!s.mode) s.mode = "venture";
    if (!s.econ)
      s.econ = { mood: "normal", moodUntil: s.week + rand(20, 28), hist: [s.monthlyRevenue], premium: null, base: null, shown: null, stage: s.stage, nextCreep: s.week + 13, lastShock: 0, strain: false, notes: [] };
    return s.econ;
  }

  function applyMode(engine, mode) {
    const s = engine.state,
      m = MODES[mode] || MODES.venture,
      e = ensureEcon(s);
    s.mode = mode in MODES ? mode : "venture";
    s.cash = Math.round(s.cash * m.cash);
    if (m.mood) {
      e.mood = m.mood;
      e.moodUntil = s.week + rand(24, 30);
    }
    e.premium = e.base = e.shown = null;
    s.valuation = valuationParts(s).floor; // start at the mode's market price
    engine.recalculate();
  }

  // monthly money flows
  function moneyFlows(s) {
    const ops = Math.round(s.monthlyRevenue * 0.12 + s.activeUsers * 0.5),
      gm = (s.sector && s.sector.gross_margin) || 1,
      out = s.baseBurn + s.teamPayroll + ops,
      inflow = s.monthlyRevenue * gm;
    return { ops: ops, gm: gm, out: out, inflow: inflow, surplus: inflow - out };
  }

  function valuationParts(s) {
    const e = ensureEcon(s),
      mood = MOODS[e.mood] || MOODS.normal,
      arr = s.monthlyRevenue * 12,
      sector = SECTOR_MULTIPLE[s.sector && s.sector.id] || 6,
      past = e.hist.length >= 5 ? e.hist[e.hist.length - 5] : e.hist[0] || 0,
      growth = past >= 500 ? (s.monthlyRevenue / past - 1) * 100 : 0,
      gF = clamp(0.5 + growth / 8, 0.4, 3),
      rF = clamp(1.5 - s.churnRate / 10, 0.5, 1.3),
      mult = sector * gF * rF * mood.mult,
      floor = ((s.sector && s.sector.initial_cash) || 25000) * 10 * mood.mult;
    return { arr: arr, sector: sector, growth: growth, gF: gF, rF: rF, moodF: mood.mult, mult: mult, floor: floor, base: Math.max(arr * mult, floor) };
  }

  function econRecalc(engine) {
    const s = engine.state,
      e = ensureEcon(s);

    // success is expensive: each new stage re-prices the company
    if (s.stage > e.stage) {
      const steps = s.stage - e.stage;
      e.stage = s.stage;
      s.baseBurn = Math.round(s.baseBurn * Math.pow(1.2, steps));
      engine.addLog("💸 Success is expensive", `You're a ${STAGE_NAMES[s.stage] || "bigger"} company now. Rent, tools and salaries all re-price: base burn +20%.`, "negative");
    }

    // burn and runway, with revenue counted after gross margin
    const f = moneyFlows(s);
    s.opsCost = f.ops;
    s.weeklyBurn = f.out / 4;
    s.netBurn = Math.max(0, f.out - f.inflow);
    s.surplus = f.surplus;
    s.defaultAlive = f.surplus >= 0 && s.monthlyRevenue > 0;
    s.runwayMonths = s.netBurn > 0 ? (Math.max(0, s.cash) / s.netBurn).toFixed(1) : 999;
    s.forecast3 = s.cash + f.surplus * 3;
    s.runwayText = s.defaultAlive ? "default alive" : s.runwayMonths >= 999 ? "no revenue yet" : `${s.runwayMonths} mo runway`;

    // valuation: whatever else moved it since our last pass becomes premium
    const v = valuationParts(s);
    if (e.base == null) e.base = v.base;
    if (e.premium == null) e.premium = Math.max(0, s.valuation - e.base);
    else if (e.shown != null && Math.abs(s.valuation - e.shown) > 0.5) e.premium += s.valuation - e.shown;
    s.valuation = Math.max(0, Math.round(e.base + e.premium));
    e.shown = s.valuation;

    if (s.valuation >= 1e8 && !s.victory && !s.gameOver && s.cash > 0) {
      engine.unlockBadge("unicorn_slayer");
      s.victory = !0;
      s.overType = "exit";
      s.endReason = "A hundred million dollars. You could read the number the whole way.";
    }
  }

  const SHOCKS = [
    {
      icon: "📉",
      title: "Your biggest customer left",
      when: (s) => s.monthlyRevenue >= 2000,
      apply: (s) => {
        const lost = Math.round(s.monthlyRevenue * 0.12);
        s.monthlyRevenue -= lost;
        s.activeUsers = Math.round(s.activeUsers * 0.96);
        return `They were ${money(lost)}/mo of your revenue. They found a cheaper tool and didn't even ask for a discount.`;
      },
    },
    {
      icon: "⚔️",
      title: "Price war",
      when: (s) => s.monthlyRevenue >= 1000,
      apply: (s) => {
        s.monthlyRevenue = Math.round(s.monthlyRevenue * 0.95);
        s.churnRate = Math.min(20, s.churnRate + 1);
        return "A competitor halved their prices. Some customers left, the rest want a discount. Churn +1%.";
      },
    },
    {
      icon: "🧾",
      title: "Vendor price hike",
      when: () => true,
      apply: (s) => {
        s.baseBurn = Math.round(s.baseBurn * 1.08);
        return "Your cloud provider and payment processor raised their fees in the same week. Base burn +8%.";
      },
    },
    {
      icon: "💸",
      title: "Surprise server bill",
      when: () => true,
      apply: (s) => {
        const bill = Math.max(1500, Math.round((s.opsCost || 0) * 1.5));
        s.cash -= bill;
        return `A forgotten test cluster ran all month. The invoice: ${money(bill)}.`;
      },
    },
    {
      icon: "🏛️",
      title: "Back taxes",
      when: (s) => s.monthlyRevenue >= 3000,
      apply: (s) => {
        const due = Math.round(Math.max(2000, s.monthlyRevenue * 0.6));
        s.cash -= due;
        return `Your accountant found unpaid VAT from last year. ${money(due)} is due now.`;
      },
    },
  ];

  function econWeek(engine) {
    const s = engine.state,
      e = ensureEcon(s),
      note = (icon, text, tone) => e.notes.push([icon, text, tone]);
    e.notes = [];
    e.hist = e.hist.concat([s.monthlyRevenue]).slice(-9);

    // valuation re-rates once a week (smoothed), deal premiums fade slowly
    e.base = e.base == null ? valuationParts(s).base : e.base * 0.5 + valuationParts(s).base * 0.5;
    if (e.premium) e.premium *= 0.985;

    // costs creep: subscriptions, rent and tools renew at higher prices
    if (s.week >= e.nextCreep) {
      e.nextCreep += 13;
      s.baseBurn = Math.round(s.baseBurn * 1.03);
      engine.addLog("🧾 Costs crept up", "A quarter of renewals: tools, rent and subscriptions all came back a little pricier. Base burn +3%.", "negative");
    }

    // support load: too many users per person and churn starts creeping
    const capacity = 400 * Math.max(1, s.team.length);
    if (s.activeUsers > capacity) {
      s.churnRate = Math.min(25, s.churnRate + 0.3);
      s.teamMorale = Math.max(0, s.teamMorale - 1.5); // overworked
      if (!e.strain) {
        e.strain = true;
        engine.addLog("🚨 Support queue is overflowing", `${Math.round(s.activeUsers).toLocaleString()} users and ${s.team.length} people to answer them. Churn keeps creeping up and the team is wearing out until you hire.`, "negative");
        note("🚨", "Support is overwhelmed. Churn and morale will slide until you hire.", -1);
      }
    } else e.strain = false;

    // market cycles
    if (s.week >= e.moodUntil) {
      const winterBias = s.mode === "winter" ? 0.25 : 0,
        r = Math.random();
      let next;
      if (e.mood === "bull") next = r < 0.6 - winterBias ? "normal" : "winter";
      else if (e.mood === "winter") next = r < 0.7 - winterBias ? "normal" : r < 0.95 - winterBias ? "bull" : "winter";
      else next = r < 0.35 + winterBias ? "winter" : r < 0.75 ? "bull" : "normal";
      e.moodUntil = s.week + rand(18, 30);
      if (next !== e.mood) {
        e.mood = next;
        const [title, text] = MOOD_NEWS[next];
        engine.addLog(title, text, next === "winter" ? "negative" : "mentor");
        note(MOODS[next].icon, text, next === "winter" ? -1 : next === "bull" ? 1 : 0);
      }
    }

    // shocks: nobody is ever fully safe
    const mode = MODES[s.mode] || MODES.venture,
      odds = (s.defaultAlive ? 0.08 : 0.035) * mode.shock;
    if (s.week >= 8 && s.week - e.lastShock >= 5 && Math.random() < odds) {
      const pool = SHOCKS.filter((x) => x.when(s));
      const shock = pool[Math.floor(Math.random() * pool.length)];
      if (shock) {
        e.lastShock = s.week;
        const text = shock.apply(s);
        engine.addLog(shock.icon + " " + shock.title, text, "negative");
        note(shock.icon, shock.title + ". " + text, -1);
      }
    }
  }

  // wrap the engine once; every engine path now runs through the economy
  (function () {
    const P = Engine.StartupEngine.prototype;
    if (P.__econ) return;
    P.__econ = true;
    const recalc = P.recalculate,
      advance = P.advanceWeek;
    P.recalculate = function () {
      recalc.call(this);
      econRecalc(this);
      return this.state;
    };
    P.advanceWeek = function () {
      advance.call(this);
      if (!this.state.gameOver && !this.state.victory) econWeek(this);
      return this.recalculate();
    };
  })();

  // -------------------------------------------------------------- UI: money
  function MoneyModal({ S, ft, onClose }) {
    const f = moneyFlows(S),
      v = valuationParts(S),
      e = ensureEcon(S),
      mood = MOODS[e.mood] || MOODS.normal,
      runway = parseFloat(S.runwayMonths),
      premium = Math.max(0, S.valuation - (e.base || v.base));
    const row = (label, value, color, bold, key) =>
      jsxs(
        View,
        {
          style: [est.row, bold && est.rowTotal],
          children: [
            jsx(Text, { style: [est.rowLabel, bold && { color: COLOR.text }], children: label }),
            jsx(Text, { style: [est.rowValue, color && { color: color }], children: ft(value, key) }),
          ],
        },
        key,
      );
    const tip = S.defaultAlive
      ? "Default alive: revenue after margin covers every cost. Protect the margin. Shocks still happen."
      : runway < 6
        ? "Under 6 months. Start raising now or cut burn: a round takes 3 months or more."
        : "Default dead until revenue after margin covers your spend. Know the date you run out.";
    return jsx(Modal, {
      visible: !0,
      transparent: !0,
      animationType: "fade",
      onRequestClose: onClose,
      children: jsx(Touchable, {
        activeOpacity: 1,
        style: est.overlay,
        onPress: onClose,
        children: jsx(Touchable, {
          activeOpacity: 1,
          onPress: () => {},
          style: est.sheet,
          dataSet: { ff: "pop" },
          children: jsx(ScrollView, {
            showsVerticalScrollIndicator: !1,
            children: [
              jsx(Text, { style: est.kicker, children: "MONEY · PER MONTH" }, "k"),
              jsx(Text, { style: est.title, children: "Where the cash goes" }, "t"),
              jsxs(View, { style: est.moodChip, children: [jsx(Pic, { e: mood.icon, size: 22 }), jsx(Text, { style: est.moodTxt, children: mood.name + (S.mode && S.mode !== "venture" && MODES[S.mode].name !== mood.name ? " · " + MODES[S.mode].name : "") })] }, "m"),
              row("Salaries", money(S.teamPayroll), null, false, "pay"),
              row("Rent, tools & base costs", money(S.baseBurn), null, false, "base"),
              row("Servers, support & fees", money(f.ops), null, false, "ops"),
              jsx(Text, { style: est.hint, children: "Grows with revenue and users." }, "h1"),
              row("Total spend", money(f.out), COLOR.crit, true, "out"),
              row("Revenue after " + Math.round((1 - f.gm) * 100) + "% costs", money(f.inflow), COLOR.vital, false, "in"),
              row(f.surplus >= 0 ? "Monthly surplus" : "Net burn", money(Math.abs(f.surplus)), f.surplus >= 0 ? COLOR.vital : COLOR.crit, true, "net"),
              row("Runway", S.defaultAlive ? "Default alive" : runway >= 999 ? "No revenue yet" : runway.toFixed(1) + " months", S.defaultAlive ? COLOR.vital : runway < 6 ? COLOR.crit : COLOR.text, false, "rw"),
              row("Cash in 3 months", money(S.forecast3), S.forecast3 < 0 ? COLOR.crit : COLOR.text, false, "fc"),
              jsx(Text, { style: est.tip, children: tip }, "tip"),
              jsx(Text, { style: [est.kicker, { marginTop: 18 }], children: "VALUATION" }, "vk"),
              row("Valuation", compact(S.valuation), COLOR.gold, true, "val"),
              v.arr * v.mult >= v.floor
                ? jsx(Text, { style: est.hint, children: `ARR ${compact(v.arr)} × ${v.mult.toFixed(1)} (sector ${v.sector}× · growth ${v.gF.toFixed(1)}× · retention ${v.rF.toFixed(1)}× · market ${v.moodF}×)` }, "vb")
                : jsx(Text, { style: est.hint, children: "Too little revenue to value on numbers yet. Investors are pricing the team and the story." }, "vb"),
              premium > 1000 && jsx(Text, { style: est.hint, children: `+ ${compact(premium)} premium from deals and buzz. It fades unless the numbers catch up.` }, "vp"),
              jsx(Text, { style: est.hint, children: `Monthly growth ${v.growth.toFixed(1)}% · churn ${S.churnRate.toFixed(1)}%. Faster growth and lower churn raise the multiple.` }, "vg"),
              jsx(Touchable, { style: est.btn, onPress: onClose, activeOpacity: 0.85, children: jsx(Text, { style: est.btnTxt, children: "Got it" }) }, "b"),
            ],
          }),
        }),
      }),
    });
  }

  const est = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(24,34,48,0.42)", justifyContent: "flex-end", cursor: "default" },
    sheet: { backgroundColor: COLOR.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 22, width: "100%", maxWidth: 600, maxHeight: "92%", alignSelf: "center", cursor: "default" },
    kicker: { fontFamily: "AzeretMono_500Medium", fontSize: 10, letterSpacing: 1, color: COLOR.text3 },
    title: { fontFamily: "Archivo_600SemiBold", fontSize: 22, letterSpacing: -0.5, color: COLOR.text, marginTop: 4, marginBottom: 10 },
    moodChip: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: COLOR.panel2, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 10 },
    moodTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: COLOR.text2 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLOR.line },
    rowTotal: { borderBottomWidth: 0, backgroundColor: COLOR.panel2, borderRadius: 10, paddingHorizontal: 10, marginTop: 4 },
    rowLabel: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 14, color: COLOR.text2 },
    rowValue: { fontFamily: "AzeretMono_600SemiBold", fontSize: 14, color: COLOR.text },
    hint: { fontFamily: "Archivo_400Regular", fontSize: 12.5, lineHeight: 18, color: COLOR.text3, marginTop: 6 },
    tip: { fontFamily: "Archivo_500Medium", fontSize: 13, lineHeight: 19, color: COLOR.text, backgroundColor: "#FFF4D6", borderRadius: 12, padding: 12, marginTop: 12 },
    btn: { backgroundColor: COLOR.accent, borderRadius: 14, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 16 },
    btnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: "#fff" },
  });
