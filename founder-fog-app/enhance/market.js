  // ================================================================ market
  // Phase 2 of the content plan: learn first, scale second.
  //   * product-market fit (0-100) multiplies every revenue gain, pulls churn
  //     towards its own level and, above 60, adds word of mouth
  //   * PMF starts hidden: talking to customers reveals it and deals insight
  //     cards; building on an insight raises it, building on a hunch is a gamble
  //   * experiments test one hypothesis a week; a matching insight improves the odds
  //   * pivot: a new PMF roll for a big cut in revenue and clarity
  //   * competitors grow and act: copy features, raise rounds, cut prices
  //   * sector rules: fintech licence, marketplace liquidity, edtech seasons,
  //     health trust, SaaS retention
  // Engine methods (talkToCustomers, runExperiment, buildProduct, pivot) are
  // added to StartupEngine so the UI and the balance bot use the same code.
  // shares App's scope (see economy.js) plus economy's helpers.

  const INSIGHTS = [
    { area: "onboarding", text: "Users love the product once it's set up, but half of them quit during onboarding." },
    { area: "onboarding", text: "Nobody watches the tutorial. They want a working example in two minutes." },
    { area: "onboarding", text: "Customers don't know what to do on day two. Give them a reason to come back." },
    { area: "pricing", text: "Price isn't the problem. Customers don't understand what each plan includes." },
    { area: "pricing", text: "Your best customers would pay double for an annual plan with priority support." },
    { area: "feature", text: "Users love the export button and ignore the dashboard you spent a month on." },
    { area: "feature", text: "Three customers built the same spreadsheet workaround. That's your next feature." },
    { area: "feature", text: "The feature everyone asks for isn't what they'd pay for. Speed is." },
    { area: "channel", text: "Most of your best users came from one online community, not from ads." },
    { area: "channel", text: "Customers found you through a partner's recommendation. Nobody clicked an ad." },
    { area: "support", text: "People stay because someone answered them fast. Support is part of the product." },
    { area: "support", text: "Users leave quietly after their first bug. They never report it." },
  ];
  const AREAS = {
    onboarding: { icon: "🧩", name: "Onboarding" },
    pricing: { icon: "🏷️", name: "Pricing" },
    feature: { icon: "🛠️", name: "Product" },
    channel: { icon: "📡", name: "Channel" },
    support: { icon: "🫶", name: "Support" },
  };
  const BUILD = {
    onboarding: { pmf: 10, apply: (s) => (s.churnRate = Math.max(0.5, s.churnRate - 0.8)), text: "Onboarding rebuilt around what customers told you. Churn −0.8%." },
    pricing: { pmf: 6, apply: (s) => (s.arpu += 4), text: "Plans repackaged the way customers think about them. Revenue per user +$4." },
    feature: { pmf: 12, apply: (s) => (s.techDebt = Math.min(100, s.techDebt + 4)), text: "You built exactly what customers were hacking together. Tech debt +4." },
    channel: { pmf: 5, apply: (s) => (s.cac = Math.max(10, s.cac * 0.85)), text: "You doubled down on the channel your best users came from. Acquisition cost −15%." },
    support: { pmf: 7, apply: (s) => (s.churnRate = Math.max(0.5, s.churnRate - 1)), text: "Fast, human support became part of the product. Churn −1%." },
  };
  const EXPERIMENTS = [
    { id: "x_price", area: "pricing", title: "Test a higher price on new signups", win: (s) => ((s.arpu += 5), 3), winText: "New signups paid more and didn't blink. Revenue per user +$5.", lose: (s) => ((s.churnRate += 0.5), 0), loseText: "Signups dropped. Price wasn't the lever. Churn +0.5%." },
    { id: "x_channel", area: "channel", title: "Try a new channel for two weeks", win: (s) => ((s.cac = Math.max(10, s.cac * 0.8)), 2), winText: "The new channel converts. Acquisition cost −20%.", lose: () => 0, loseText: "Nobody there was looking for you. Money spent, lesson learned." },
    { id: "x_fake", area: "feature", title: "Fake-door test a new feature", win: () => 6, winText: "Hundreds clicked the button for a feature that doesn't exist yet. Build it.", lose: () => 1, loseText: "Almost nobody clicked. Good thing you didn't build it." },
    { id: "x_onb", area: "onboarding", title: "Rewrite onboarding for one cohort", win: (s) => ((s.churnRate = Math.max(0.5, s.churnRate - 1)), 4), winText: "That cohort stayed. Rolled out to everyone: churn −1%.", lose: () => 0, loseText: "No difference. Onboarding wasn't where people got stuck." },
    { id: "x_conc", area: "support", title: "Concierge support for 10 customers", win: (s) => ((s.churnRate = Math.max(0.5, s.churnRate - 0.8)), 4), winText: "White-glove support turned 10 users into fans. Churn −0.8%.", lose: () => 1, loseText: "They were polite, but nothing changed." },
  ];
  const EXPERIMENT_COST = 1500;

  const STYLES = {
    copycat: { icon: "🕵️", name: "Copycat", growth: 0.02 },
    funded: { icon: "🦈", name: "Well-funded", growth: 0.025 },
    cheap: { icon: "🏷️", name: "Cheap", growth: 0.015 },
  };
  const RIVALS = {
    saas_ai: [["Flowly", "copycat"], ["Nimbus AI", "funded"], ["Taskr", "cheap"]],
    fintech: [["PayNest", "copycat"], ["Dinar Labs", "funded"], ["Sahm Pay", "cheap"]],
    ecommerce_marketplace: [["Bazaarist", "copycat"], ["Souqly", "funded"], ["DealDrop", "cheap"]],
    healthtech: [["Dr. Now", "copycat"], ["CareLink", "funded"], ["Shifa Go", "cheap"]],
    edtech: [["CodeCamp+", "copycat"], ["SkillUp Arabia", "funded"], ["LearnLite", "cheap"]],
  };
  // one line per sector, shown on the sector picker
  const SECTOR_RULES = {
    saas_ai: "Customers stay longest here: churn settles 1% lower.",
    fintech: "No real growth until the central bank licence lands (weeks 8–14). Compliance costs $800/mo.",
    ecommerce_marketplace: "Chicken and egg: growth is slow until $5k MRR, then the network kicks in.",
    healthtech: "Trust builds slowly: growth runs 15% slower, churn settles 1.5% lower.",
    edtech: "Seasons: back-to-school weeks grow 40% faster, summer 30% slower. Churn settles 1% higher.",
  };

  function ensureMarket(s) {
    if (s.mkt) return s.mkt;
    const sid = (s.sector && s.sector.id) || "saas_ai";
    const base = rand(12, 30);
    s.mkt = {
      base: base, // where fit settles if you stop learning
      pmf: base,
      seen: null, // { week, value } of the last customer talks
      talkWeek: 0,
      expWeek: 0,
      insights: [],
      used: [],
      pivots: 0,
      licensed: sid !== "fintech",
      licenceWeek: sid === "fintech" ? rand(8, 14) : 0,
      rivals: (RIVALS[sid] || RIVALS.saas_ai).map(([name, style]) => ({ name: name, style: style, rev: rand(3, 15) * 1000 })),
      nextRival: s.week + rand(7, 11),
      notes: [],
    };
    if (sid === "fintech") s.baseBurn += 800;
    return s.mkt;
  }

  // how much of any revenue gain actually lands
  function growthMult(s) {
    const m = ensureMarket(s),
      sid = s.sector && s.sector.id,
      wk = s.week % 52;
    let mult = clamp(0.25 + m.pmf / 50, 0.25, 2);
    if (sid === "fintech" && !m.licensed) mult *= 0.4;
    if (sid === "ecommerce_marketplace") mult *= s.monthlyRevenue < 5000 ? 0.7 : 1.15;
    if (sid === "healthtech") mult *= 0.85;
    if (sid === "edtech") mult *= wk >= 30 && wk <= 40 ? 1.4 : wk >= 20 && wk < 30 ? 0.7 : 1;
    return mult;
  }
  // the closer to full fit, the harder each step: gains shrink as fit grows
  const gainFit = (m, pts) => {
    const g = pts > 0 ? Math.max(1, Math.round(pts * (1 - m.pmf / 110))) : pts;
    m.pmf = clamp(m.pmf + g, 0, 100);
    return g;
  };
  const fitNote = (g) => (g > 0 ? ` Fit +${g}.` : g < 0 ? ` Fit ${g}.` : "");
  const CHURN_OFFSET = { saas_ai: -1, healthtech: -1.5, edtech: 1, ecommerce_marketplace: 0.5 };
  const pmfBand = (v) =>
    v < 25 ? "No fit yet. Marketing mostly buys churn." : v < 40 ? "Some users care. Find out who, and why." : v < 60 ? "Fit with a niche. Growth compounds from here." : "Strong pull. Word of mouth is doing your marketing.";
  const share = (s) => {
    const m = ensureMarket(s),
      total = s.monthlyRevenue + m.rivals.reduce((a, r) => a + r.rev, 0);
    return total > 0 ? (s.monthlyRevenue / total) * 100 : 0;
  };

  function scaleGains(engine, before, isMarketing) {
    const s = engine.state,
      d = s.monthlyRevenue - before;
    if (d > 0) s.monthlyRevenue = Math.round(before + d * growthMult(s));
    // before fit, paid users don't stick
    if (isMarketing && ensureMarket(s).pmf < 40) s.churnRate = Math.min(25, s.churnRate + 0.4);
  }

  function marketWeek(engine) {
    const s = engine.state,
      m = ensureMarket(s),
      note = (icon, text, tone) => m.notes.push([icon, text, tone]);
    m.notes = [];

    // the market moves on: without learning, fit settles back to the idea's natural level; bugs erode it
    if (m.base == null) m.base = Math.min(m.pmf, 30);
    m.pmf = clamp(m.pmf + (m.base - m.pmf) * 0.03 - (s.techDebt > 60 ? 0.5 : 0), 0, 100);
    // churn drifts towards what this level of fit deserves
    const target = clamp(11 - m.pmf * 0.09 + (CHURN_OFFSET[s.sector && s.sector.id] || 0), 1.5, 20);
    s.churnRate = Math.max(0.5, s.churnRate + (target - s.churnRate) * 0.06);
    // word of mouth
    if (m.pmf > 60 && s.monthlyRevenue > 0) {
      const g = (m.pmf - 60) / 2000;
      s.monthlyRevenue *= 1 + g;
      s.activeUsers *= 1 + g;
    }

    // fintech licence
    if (!m.licensed && s.week >= m.licenceWeek) {
      m.licensed = true;
      engine.addLog("🏦 Licence approved", "The central bank sandbox approved your licence. You can finally onboard customers at full speed.", "mentor");
      note("🏦", "Licence approved. Growth is no longer capped.", 1);
    }

    // competitors grow, faster when you're weak
    m.rivals.forEach((r) => (r.rev *= 1 + STYLES[r.style].growth * (m.pmf > 60 ? 0.5 : 1)));
    if (s.week >= m.nextRival) {
      m.nextRival = s.week + rand(7, 11);
      const r = m.rivals[Math.floor(Math.random() * m.rivals.length)];
      let text;
      if (r.style === "copycat") {
        const hit = m.pmf >= 70 ? 1 : 5;
        m.pmf = Math.max(0, m.pmf - hit);
        text = m.pmf >= 70 ? `${r.name} copied your best feature. Your users shrugged: they love the original.` : `${r.name} copied your best feature and undercut you on it. Some of your users are trying them.`;
      } else if (r.style === "funded") {
        r.rev *= 1.3;
        s.cac *= 1.2;
        text = `${r.name} raised $20M and is buying every ad in your market. Acquisition cost +20%.`;
        const poachable = s.team.filter((x) => x.id !== "emp_founder" && x.id !== "emp_cto");
        if (poachable.length && Math.random() < 0.4) {
          const p = poachable.reduce((a, b) => ((b.salary || 0) > (a.salary || 0) ? b : a), poachable[0]);
          s.team = s.team.filter((x) => x.id !== p.id);
          s.teamMorale = Math.max(0, s.teamMorale - 6);
          text += ` They also hired away ${p.name}.`;
        }
      } else {
        s.churnRate = Math.min(25, s.churnRate + (m.pmf >= 60 ? 0.3 : 1));
        const why = m.pmf >= 60 ? "Most of your users stayed: they're here for the product." : "Price-sensitive users are leaving.";
        text = `${r.name} cut prices in half. ${why}`;
      }
      engine.addLog(STYLES[r.style].icon + " " + r.name, text, "negative");
      note(STYLES[r.style].icon, text, -1);
    }
  }

  (function () {
    const P = Engine.StartupEngine.prototype;
    if (P.__market) return;
    P.__market = true;
    const wrapGrowth = (name) => {
      const orig = P[name];
      P[name] = function (...args) {
        const before = this.state.monthlyRevenue;
        const res = orig.apply(this, args);
        scaleGains(this, before, name === "executeDepartmentAction" && args[1] === "marketing");
        this.recalculate();
        return res && res.state ? { ...res, state: this.state } : res;
      };
    };
    ["executeTargetStrategy", "executeDepartmentAction", "executeMoonshotGamble", "resolveEventChoice"].forEach(wrapGrowth);
    const advance = P.advanceWeek;
    P.advanceWeek = function () {
      advance.call(this);
      if (!this.state.gameOver && !this.state.victory) marketWeek(this);
      return this.recalculate();
    };

    const ok = (engine) => ({ success: !0, state: engine.recalculate() });
    const no = (reason) => ({ success: !1, reason: reason });

    P.talkToCustomers = function () {
      const s = this.state,
        m = ensureMarket(s);
      if (m.talkWeek === s.week) return no("You already talked to customers this week.");
      const first = !m.seen && !m.used.length;
      m.talkWeek = s.week;
      m.seen = { week: s.week, value: m.pmf };
      s.mentalClarity = Math.max(0, s.mentalClarity - 4);
      const pool = INSIGHTS.filter((x) => !m.used.includes(x.text) && !m.insights.some((y) => y.text === x.text));
      const card = first || Math.random() < 0.6 ? pool[Math.floor(Math.random() * pool.length)] : null;
      if (card) m.insights = m.insights.concat([card]).slice(-4);
      const heard = card ? "One thing stood out: “" + card.text + "”" : "Nothing new this time. Mostly polite feedback.";
      this.addLog("🔍 Talked to 5 customers", `About ${Math.round(m.pmf / 5) * 5}% would be very disappointed without you. ${heard}`, "mentor");
      return ok(this);
    };

    P.buildProduct = function (idx) {
      const s = this.state,
        m = ensureMarket(s);
      if (s.slotUsed) return no("Building takes this week's action, and it's already used.");
      s.slotUsed = !0;
      const card = idx == null ? null : m.insights[idx];
      if (card) {
        const b = BUILD[card.area];
        m.insights = m.insights.filter((_, i) => i !== idx);
        m.used.push(card.text);
        const g = gainFit(m, b.pmf);
        b.apply(s);
        this.addLog(AREAS[card.area].icon + " Built on a customer insight", b.text + fitNote(g), "mentor");
      } else {
        const d = gainFit(m, rand(-3, 4));
        s.techDebt = Math.min(100, s.techDebt + 4);
        this.addLog("💡 Built what you believed in", (d > 0 ? "Some users liked it. Hard to say why." : "Nobody used it. It felt so obvious in the shower.") + fitNote(d), d > 0 ? "mentor" : "negative");
      }
      return ok(this);
    };

    P.runExperiment = function (id) {
      const s = this.state,
        m = ensureMarket(s),
        x = EXPERIMENTS.find((e) => e.id === id);
      if (!x) return no("Experiment not found.");
      if (m.expWeek === s.week) return no("One experiment a week. Let this one run.");
      if (s.cash < EXPERIMENT_COST) return no("Experiments cost $1,500.");
      m.expWeek = s.week;
      s.cash -= EXPERIMENT_COST;
      const informed = m.insights.some((c) => c.area === x.area);
      const win = Math.random() < (informed ? 0.75 : 0.35);
      const g = gainFit(m, win ? x.win(s) : x.lose(s));
      const text = (win ? x.winText : x.loseText) + fitNote(g);
      this.addLog((win ? "🧪 Experiment worked: " : "🧪 Experiment failed: ") + x.title, text, win ? "mentor" : "negative");
      return { ...ok(this), win: win, text: text };
    };

    P.pivot = function () {
      const s = this.state,
        m = ensureMarket(s);
      if (s.week < 8) return no("Too early to pivot. Give the idea at least 8 weeks.");
      if (!m.seen) return no("Talk to customers first. You can't pivot away from something you haven't measured.");
      if (m.pmf >= 40) return no("You have fit. Pivoting now would throw it away.");
      m.pivots += 1;
      m.base = rand(15, 45);
      m.pmf = m.base;
      m.seen = null;
      m.insights = [];
      s.monthlyRevenue = Math.round(s.monthlyRevenue * 0.6);
      s.activeUsers = Math.round(s.activeUsers * 0.6);
      s.mentalClarity = Math.max(0, s.mentalClarity - 15);
      s.teamMorale = Math.max(0, s.teamMorale - 10);
      this.addLog("🔄 Pivot", "You kept the team and the cash, and changed what you sell and to whom. 40% of revenue walked away with the old idea. Talk to customers again: the fit is a new unknown.", "negative");
      return ok(this);
    };
  })();

  // ---------------------------------------------------------- UI: customers
  function CustomersModal({ S, onClose, onDo }) {
    const m = ensureMarket(S),
      known = !!m.seen,
      talked = m.talkWeek === S.week,
      tested = m.expWeek === S.week,
      exps = [0, 1, 2].map((i) => EXPERIMENTS[(S.week + i * 2) % EXPERIMENTS.length]),
      mine = share(S);
    const btn = (label, sub, onPress, disabled, key, tone) =>
      jsxs(
        Touchable,
        {
          style: [mst.btn, tone === "primary" && mst.btnPrimary, disabled && { opacity: 0.45 }],
          disabled: disabled,
          activeOpacity: 0.85,
          onPress: onPress,
          children: [jsx(Text, { style: [mst.btnTxt, tone === "primary" && { color: "#fff" }], children: label }), sub ? jsx(Text, { style: [mst.btnSub, tone === "primary" && { color: "rgba(255,255,255,.85)" }], children: sub }) : null],
        },
        key,
      );
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
              jsx(Text, { style: est.kicker, children: "CUSTOMERS" }, "k"),
              jsx(Text, { style: est.title, children: "Product–market fit" }, "t"),
              jsxs(
                View,
                {
                  style: mst.fitCard,
                  children: [
                    jsx(Text, { style: [mst.fitValue, !known && { color: COLOR.text3 }], children: known ? "~" + Math.round(m.seen.value / 5) * 5 + "%" : "?" }),
                    jsxs(View, {
                      style: { flex: 1 },
                      children: [
                        jsx(Text, { style: mst.fitQ, children: "would be very disappointed without you" }),
                        jsx(Text, { style: mst.fitBand, children: known ? pmfBand(m.seen.value) : "You don't know yet. Nobody does until they ask." }),
                        known && m.seen.week < S.week && jsx(Text, { style: est.hint, children: `Measured ${S.week - m.seen.week} wk ago. It drifts.` }),
                      ],
                    }),
                  ],
                },
                "fit",
              ),
              jsx(Text, { style: est.hint, children: "40% or more means fit. Below it, every dollar of marketing leaks out through churn." }, "fh"),

              jsx(Text, { style: [est.kicker, { marginTop: 16 }], children: "LEARN" }, "lk"),
              btn("🗣️  Talk to 5 customers", talked ? "Done this week" : "Free · clarity −4 · reveals fit and an insight", () => onDo((e) => e.talkToCustomers(), "Insight added."), talked, "talk", "primary"),

              jsx(Text, { style: [est.kicker, { marginTop: 16 }], children: "INSIGHTS" }, "ik"),
              m.insights.length
                ? m.insights.map((c, i) =>
                    jsxs(
                      View,
                      {
                        style: mst.insight,
                        children: [
                          jsxs(View, { style: mst.insightTop, children: [jsx(Pic, { e: AREAS[c.area].icon, size: 22 }), jsx(Text, { style: mst.insightArea, children: AREAS[c.area].name })] }),
                          jsx(Text, { style: mst.insightTxt, children: "“" + c.text + "”" }),
                          btn("Build on this", S.slotUsed ? "Needs this week's action" : "Uses this week's action", () => onDo((e) => e.buildProduct(i), "Built. Fit is rising."), S.slotUsed, "b" + i),
                        ],
                      },
                      "in" + i,
                    ),
                  )
                : jsx(Text, { style: est.hint, children: "No insights yet. Talk to customers to collect them." }, "noin"),
              btn("💡  Build what you believe in", "Uses this week's action · a gamble without evidence", () => onDo((e) => e.buildProduct(null), "Shipped."), S.slotUsed, "hunch"),

              jsx(Text, { style: [est.kicker, { marginTop: 16 }], children: "EXPERIMENT · $1,500" }, "xk"),
              ...exps.map((x) => {
                const informed = m.insights.some((c) => c.area === x.area);
                return btn(AREAS[x.area].icon + "  " + x.title, tested ? "One experiment a week" : informed ? "✓ An insight backs this: good odds" : "No insight behind it: long odds", () => onDo((e) => e.runExperiment(x.id), null), tested || S.cash < EXPERIMENT_COST, x.id);
              }),

              known && m.seen.value < 40 && S.week >= 8 &&
                jsxs(
                  View,
                  {
                    style: mst.pivot,
                    children: [
                      jsx(Text, { style: mst.pivotTitle, children: "🔄  Pivot?" }),
                      jsx(Text, { style: est.hint, children: "Keep the team and the cash, change what you sell. You lose 40% of revenue, and the new fit is unknown." }),
                      btn("Pivot the company", null, () => onDo((e) => e.pivot(), "Pivoted. Go talk to customers."), false, "pv"),
                    ],
                  },
                  "pivot",
                ),

              jsx(Text, { style: [est.kicker, { marginTop: 16 }], children: "COMPETITION" }, "ck"),
              jsxs(View, { style: mst.rival, children: [jsx(Text, { style: [mst.rivalName, { color: COLOR.act, width: 128 }], numberOfLines: 1, children: S.companyName }), jsx(View, { style: mst.shareTrack, children: jsx(View, { style: [mst.shareFill, { width: Math.max(2, mine) + "%", backgroundColor: COLOR.act }] }) }), jsx(Text, { style: mst.sharePct, children: Math.round(mine) + "%" })] }, "me"),
              ...m.rivals.map((r) => {
                const total = S.monthlyRevenue + m.rivals.reduce((a, x) => a + x.rev, 0),
                  pct = total ? (r.rev / total) * 100 : 0;
                return jsxs(
                  View,
                  {
                    style: mst.rival,
                    children: [
                      jsxs(View, { style: mst.rivalNameWrap, children: [jsx(Pic, { e: STYLES[r.style].icon, size: 20 }), jsxs(View, { style: { flex: 1 }, children: [jsx(Text, { style: mst.rivalName, numberOfLines: 1, children: r.name }), jsx(Text, { style: mst.rivalStyle, children: STYLES[r.style].name })] })] }),
                      jsx(View, { style: mst.shareTrack, children: jsx(View, { style: [mst.shareFill, { width: Math.max(2, pct) + "%" }] }) }),
                      jsx(Text, { style: mst.sharePct, children: Math.round(pct) + "%" }),
                    ],
                  },
                  r.name,
                );
              }),
              jsx(Text, { style: est.hint, children: "Market share by monthly revenue. Strong fit protects you from copycats and price cuts." }, "ch"),
              jsx(Touchable, { style: est.btn, onPress: onClose, activeOpacity: 0.85, children: jsx(Text, { style: est.btnTxt, children: "Close" }) }, "close"),
            ],
          }),
        }),
      }),
    });
  }

  const mst = StyleSheet.create({
    fitCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#EEF4FF", borderRadius: 16, padding: 14 },
    fitValue: { fontFamily: "AzeretMono_600SemiBold", fontSize: 30, color: COLOR.act, minWidth: 84, textAlign: "center" },
    fitQ: { fontFamily: "Archivo_500Medium", fontSize: 12, color: COLOR.text3 },
    fitBand: { fontFamily: "Archivo_600SemiBold", fontSize: 14, lineHeight: 19, color: COLOR.text, marginTop: 3 },
    btn: { backgroundColor: COLOR.panel2, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, marginTop: 8, borderWidth: 1, borderColor: COLOR.line },
    btnPrimary: { backgroundColor: COLOR.act, borderColor: COLOR.act },
    btnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14.5, color: COLOR.text },
    btnSub: { fontFamily: "Archivo_400Regular", fontSize: 12, color: COLOR.text3, marginTop: 2 },
    insight: { backgroundColor: "#FFF8E6", borderRadius: 14, padding: 12, marginTop: 8 },
    insightTop: { flexDirection: "row", alignItems: "center", gap: 6 },
    insightArea: { fontFamily: "Archivo_600SemiBold", fontSize: 12, color: COLOR.gold },
    insightTxt: { fontFamily: "Archivo_500Medium", fontSize: 14, lineHeight: 20, color: COLOR.text, marginTop: 6 },
    pivot: { backgroundColor: "#FDECEC", borderRadius: 14, padding: 12, marginTop: 16 },
    pivotTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: COLOR.crit },
    rival: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    rivalNameWrap: { flexDirection: "row", alignItems: "center", gap: 6, width: 128 },
    rivalName: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: COLOR.text },
    rivalStyle: { fontFamily: "Archivo_400Regular", fontSize: 11, color: COLOR.text3 },
    shareTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: COLOR.panel2, overflow: "hidden" },
    shareFill: { height: 10, borderRadius: 5, backgroundColor: COLOR.text3 },
    sharePct: { fontFamily: "AzeretMono_600SemiBold", fontSize: 12, color: COLOR.text2, width: 40, textAlign: "right" },
  });
