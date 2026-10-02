  // ======================================================================
  // features.js — gameplay systems layered on top of the original engine.
  // Inlined into App.js at build time (see "@include" in build.py), so it
  // shares App's scope: React, View, Text, Touchable, Modal, ScrollView,
  // StyleSheet, COLOR, jsx/jsxs, Chips, effectChips, money, compact, buzz.
  //
  //   1. Inbox      — 1–2 quick swipe decisions every week
  //   2. Pitch      — fundraising mini-game: pick an investor, answer 3
  //                   questions, negotiate a term sheet (costs equity)
  //   3. Perks      — XP levels up the founder; pick 1 of 3 perks
  //   4. Streaks    — consecutive weekly targets pay out bonuses
  // All new state lives on engine.state so it is saved with the game.
  // ======================================================================

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function pickN(arr, n) {
    const a = arr.slice(),
      out = [];
    while (a.length && out.length < n) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
    return out;
  }
  const has = (s, perk) => (s.perks || []).includes(perk);
  const fx = (choice, s) => (typeof choice.effects === "function" ? choice.effects(s) : choice.effects || {});

  function ensureFeatureState(s) {
    if (s.equity == null) s.equity = 100;
    if (s.level == null) s.level = 1;
    if (!s.perks) s.perks = [];
    if (s.streak == null) s.streak = 0;
    if (s.bestStreak == null) s.bestStreak = 0;
    if (!s.inbox) s.inbox = [];
    if (!s.inboxSeen) s.inboxSeen = {};
    if (s.lastPitchWeek == null) s.lastPitchWeek = -99;
    if (!s.rounds) s.rounds = [];
    return s;
  }

  // Applies an effects object through the engine's own event resolver so the
  // clamps, journal entry and recalculation stay consistent with the game.
  // `equity` and `baseBurn` are handled here because the engine has no such keys.
  function applyEffects(engine, title, label, effects, log) {
    const s = engine.state;
    const rest = { ...effects };
    if (rest.equity) s.equity = clamp(s.equity + rest.equity, 0, 100);
    if (rest.baseBurn) s.baseBurn = Math.max(0, s.baseBurn + rest.baseBurn);
    delete rest.equity;
    delete rest.baseBurn;
    const keep = s.pendingEvent;
    s.pendingEvent = { title: title, option_A: { title: label, effects: rest, log_text: log } };
    engine.resolveEventChoice("option_A");
    engine.state.pendingEvent = keep;
    return engine.recalculate();
  }

  // ---------------------------------------------------------------- inbox
  const mrrPct = (s, p, min) => Math.max(min || 0, Math.round((s.monthlyRevenue * p) / 50) * 50);
  const INBOX = [
    {
      id: "demo_crash",
      from: "📧 Omar Sabry · Key customer",
      title: "Your app crashed during our board demo.",
      body: "Fix it this weekend or we start looking at alternatives.",
      when: (s) => s.monthlyRevenue > 0,
      left: { label: "All-nighter, fix it", effects: { mentalClarity: -10, techDebt: -6, founderExp: 30 }, log: "You fixed it at 4am. Omar stayed. You are running on fumes." },
      right: { label: "Offer a discount", effects: (s) => ({ monthlyRevenue: -mrrPct(s, 0.06, 150) }), log: "A discount bought patience, not trust." },
      ignore: { effects: (s) => ({ monthlyRevenue: -mrrPct(s, 0.12, 300), churnRate: 0.8 }), log: "Omar never got a reply. Neither did his invoice." },
    },
    {
      id: "roast",
      from: "🐦 @bigfounder · 200k followers",
      title: "“Worst onboarding I've seen this year.”",
      body: "The post is going viral. Your team is watching what you do.",
      left: { label: "Reply with humour", effects: { activeUsers: 180, mentalClarity: -4, founderExp: 40 }, log: "Your reply got more likes than the roast. Sign-ups spiked." },
      right: { label: "Stay quiet, fix it", effects: { techDebt: -5, teamMorale: -3 }, log: "You shipped a better onboarding in silence." },
    },
    {
      id: "poach",
      from: "💼 Tariq Mansour · CTO",
      title: "Big Tech offered me double.",
      body: "I don't want to leave. But I have a family to think about.",
      when: (s) => s.team.some((t) => t.id === "emp_cto"),
      left: { label: "Give him 3% more equity", effects: { equity: -3, teamMorale: 8 }, log: "Tariq stayed, and now owns a bigger slice of the outcome." },
      right: { label: "Match the salary", effects: { baseBurn: 900, teamMorale: 4 }, log: "Tariq stayed. Your burn went up for good." },
      ignore: { effects: { teamMorale: -15, techDebt: 10 }, log: "Tariq stayed, barely. Something broke between you." },
    },
    {
      id: "summit",
      from: "🎪 Riyadh Tech Summit",
      title: "A free booth opened up. Can you fly out this week?",
      body: "Flights and hotel are on you. 8,000 attendees.",
      when: (s) => s.week >= 3,
      left: { label: "Book the flight", effects: { cash: -1400, activeUsers: 220, monthlyRevenue: 900, mentalClarity: -8 }, log: "Three days, four hundred handshakes, a dozen real leads." },
      right: { label: "Skip it", effects: { mentalClarity: 3 }, log: "You stayed home and slept." },
    },
    {
      id: "press",
      from: "📰 Tech reporter",
      title: "Want to be in this week's founder profile?",
      body: "She has heard good things. She asks hard questions.",
      left: { label: "Give the interview", effects: { investorTrust: 8, activeUsers: 120, mentalClarity: -4 }, log: "The profile ran. Your inbox filled with intros." },
      right: { label: "Not yet", effects: {}, log: "You said not yet. She said she'd remember." },
    },
    {
      id: "mother",
      from: "📱 Mom",
      title: "You've missed three family dinners.",
      body: "Your father won't say it, so I will. We miss you.",
      left: { label: "Go home tonight", effects: { mentalClarity: 12, teamMorale: -2 }, log: "Molokhia, arguments about football, your old bedroom. You slept nine hours." },
      right: { label: "Next week, promise", effects: { mentalClarity: -6 }, log: "You promised next week. You both knew." },
      ignore: { effects: { mentalClarity: -8 }, log: "You saw the missed call at 1am." },
    },
    {
      id: "bank_pilot",
      from: "🏦 Regional bank",
      title: "Paid pilot, starting Monday.",
      body: "We need security paperwork you don't have yet.",
      when: (s) => s.week >= 4,
      left: { label: "Say yes, figure it out", effects: { monthlyRevenue: 2500, techDebt: 12, mentalClarity: -8 }, log: "You signed first and wrote the security policy over the weekend." },
      right: { label: "Decline politely", effects: { investorTrust: -2 }, log: "They said come back when you're ready." },
    },
    {
      id: "roadmap_fight",
      from: "💼 Tariq Mansour · CTO",
      title: "Disagreed with your roadmap in front of the team.",
      body: "Everyone saw it. They're waiting to see who blinks.",
      left: { label: "Hash it out privately", effects: { mentalClarity: -4, teamMorale: 6 }, log: "Two hours, one whiteboard, one better roadmap." },
      right: { label: "Pull rank", effects: { teamMorale: -10, techDebt: -3 }, log: "You won the argument. The room went quiet." },
    },
    {
      id: "credits",
      from: "☁️ Cloud provider",
      title: "$5k in credits if you migrate this month.",
      body: "Migration estimate: one painful sprint.",
      left: { label: "Migrate", effects: { cash: 3000, techDebt: 8 }, log: "Credits landed. Two services broke in the move." },
      right: { label: "Stay put", effects: {}, log: "Not worth the sprint." },
    },
    {
      id: "intern",
      from: "🎓 University student",
      title: "Can I intern for free? I've read all your posts.",
      body: "Their GitHub is better than half the CVs you've seen.",
      left: { label: "Bring them in", effects: { teamMorale: 4, techDebt: -4, mentalClarity: -2 }, log: "The intern fixed a bug that had been open for six weeks." },
      right: { label: "No bandwidth", effects: {}, log: "You said no. You felt bad about it." },
    },
    {
      id: "rival_raise",
      from: "📊 Industry newsletter",
      title: "Your biggest competitor just raised $10M.",
      body: "Three of your customers forwarded you the article.",
      when: (s) => s.week >= 5,
      left: { label: "Heads down on product", effects: { techDebt: -6, teamMorale: 3 }, log: "You stopped reading the news and shipped." },
      right: { label: "Match their ad spend", effects: { cash: -2500, activeUsers: 260, monthlyRevenue: 1200 }, log: "You outbid them for a week. It worked, expensively." },
    },
    {
      id: "tired_dev",
      from: "👥 Team",
      title: "Your best engineer looks exhausted.",
      body: "The release is due Thursday.",
      when: (s) => s.team.length >= 3,
      left: { label: "Force a week off", effects: { teamMorale: 8, techDebt: 4 }, log: "The release slipped. The engineer came back human." },
      right: { label: "Push to ship", effects: { teamMorale: -8, monthlyRevenue: 700 }, log: "You shipped Thursday. Nobody celebrated." },
    },
    {
      id: "price_test",
      from: "📈 Growth",
      title: "Let's test +20% pricing on new sign-ups.",
      body: "Worst case, some people bounce.",
      when: (s) => s.monthlyRevenue > 0,
      left: { label: "Run the test", effects: { arpu: 5, churnRate: 0.6, monthlyRevenue: 400 }, log: "Most new users paid the higher price without blinking." },
      right: { label: "Keep prices", effects: {}, log: "Prices stayed put." },
    },
    {
      id: "angel_update",
      from: "👼 Layla Fahmy · Lead angel",
      title: "Haven't heard from you in a while.",
      body: "No update is the scariest update.",
      left: { label: "Send an honest update", effects: { investorTrust: 10, mentalClarity: -2 }, log: "You wrote the bad news first. Layla replied with two intros." },
      right: { label: "Send highlights only", effects: { investorTrust: 3 }, log: "She read between the lines." },
      ignore: { effects: { investorTrust: -8 }, log: "Layla stopped asking." },
    },
    {
      id: "hackathon",
      from: "👥 Team",
      title: "Weekend hackathon?",
      body: "Pizza, no meetings, build anything.",
      left: { label: "Do it", effects: { techDebt: 5, teamMorale: 10, activeUsers: 60 }, log: "Someone built a feature customers had begged for. In a weekend." },
      right: { label: "Everyone rests", effects: { mentalClarity: 5, teamMorale: 2 }, log: "A quiet weekend. Monday felt lighter." },
    },
    {
      id: "sunrise_run",
      from: "🏃 Old friend",
      title: "Sunrise run on the Corniche tomorrow?",
      body: "Like old times. 6am.",
      left: { label: "I'm in", effects: { mentalClarity: 8 }, log: "Ten kilometres and the first clear thought in weeks." },
      right: { label: "Sleep in", effects: { mentalClarity: 3 }, log: "You slept. It helped a little." },
    },
    {
      id: "refund",
      from: "🧾 Customer",
      title: "I want a full refund. All 11 months.",
      body: "They used the product every single day.",
      when: (s) => s.monthlyRevenue > 0,
      left: { label: "Refund it", effects: { cash: -600, churnRate: -0.3 }, log: "You refunded. They left a five-star review anyway." },
      right: { label: "Refuse", effects: { churnRate: 0.5, investorTrust: -1 }, log: "They posted about it. Twice." },
    },
    {
      id: "ai_story",
      from: "👼 Investor intro",
      title: "“What's your AI story?”",
      body: "Every investor asks this now.",
      left: { label: "Rebrand as AI-first", effects: { valuation: 150000, techDebt: 6, mentalClarity: -4 }, log: "New deck, new tagline, same product. Valuation chats got easier." },
      right: { label: "Stay honest", effects: { investorTrust: 4 }, log: "You told the truth. One investor respected it." },
    },
    {
      id: "telco",
      from: "📡 Telco partnerships",
      title: "Bundle your product with our plans?",
      body: "We take 30% of revenue. We bring millions of subscribers.",
      when: (s) => s.monthlyRevenue >= 3000,
      left: { label: "Sign the deal", effects: { monthlyRevenue: 3200, arpu: -3, activeUsers: 400 }, log: "The bundle launched. Volume up, margins down." },
      right: { label: "Hold out", effects: { investorTrust: 2 }, log: "You held out for better terms." },
    },
    {
      id: "office",
      from: "🏢 Landlord",
      title: "A bigger office just opened up, 20% off.",
      body: "Natural light. A real meeting room.",
      when: (s) => s.team.length >= 3,
      left: { label: "Move in", effects: { cash: -2000, baseBurn: 400, teamMorale: 12 }, log: "The team loves the new space. So does your burn rate." },
      right: { label: "Stay scrappy", effects: {}, log: "Still squeezed in. Still shipping." },
    },
    {
      id: "leak",
      from: "🕵️ Unknown",
      title: "Your roadmap leaked on social media.",
      body: "Competitors are already quoting it.",
      when: (s) => s.week >= 6,
      left: { label: "Find the leaker", effects: { teamMorale: -8, mentalClarity: -5 }, log: "You never found them. Everyone felt watched." },
      right: { label: "Laugh it off", effects: { investorTrust: -3, founderExp: 30 }, log: "“Good luck building it faster than us.” The post did numbers." },
    },
    {
      id: "mentor_call",
      from: "🧓 Exited founder",
      title: "Happy to give you 30 minutes.",
      body: "He sold his company for $200M. He's blunt.",
      left: { label: "Take the call", effects: { mentalClarity: 6, founderExp: 60 }, log: "“You're not tired, you're unfocused.” He was right." },
      right: { label: "Too busy", effects: {}, log: "Maybe next quarter." },
    },
    {
      id: "four_day_week",
      from: "👥 Team",
      title: "Holidays are coming. Four-day week?",
      body: "Just for the next month.",
      when: (s) => s.week >= 4,
      left: { label: "Yes", effects: { teamMorale: 12, techDebt: 3 }, log: "The team came back sharper than they left." },
      right: { label: "Not now", effects: { teamMorale: -6 }, log: "Nobody argued. Nobody was happy." },
    },
    {
      id: "dd_fee",
      from: "💼 “Investor”",
      title: "Pay a $1,000 due-diligence fee to proceed.",
      body: "Term sheet ready the moment it clears.",
      left: { label: "Pay it", effects: { cash: -1000, mentalClarity: -5 }, log: "It was a scam. Real investors never charge founders." },
      right: { label: "Block them", effects: { founderExp: 40 }, log: "You blocked them. Real investors never charge founders." },
    },
  ];

  function dealInbox(s, count) {
    const seen = s.inboxSeen || {};
    const pool = INBOX.filter((c) => (!c.when || c.when(s)) && (seen[c.id] == null || s.week - seen[c.id] >= 10) && !s.inbox.some((x) => x.id === c.id));
    pickN(pool, count).forEach((c) => {
      s.inbox.push({ id: c.id, week: s.week });
      seen[c.id] = s.week;
    });
    s.inboxSeen = seen;
  }
  const cardById = (id) => INBOX.find((c) => c.id === id);

  // Unanswered mail expires at week end; some messages punish silence.
  function expireInbox(engine) {
    const s = engine.state;
    let ignored = 0;
    (s.inbox || []).forEach((m) => {
      const c = cardById(m.id);
      if (!c) return;
      ignored++;
      if (c.ignore && !has(s, "delegator")) applyEffects(engine, c.title, "Ignored", fx(c.ignore, s), c.ignore.log);
    });
    s.inbox = [];
    return ignored;
  }

  // ---------------------------------------------------------------- perks
  const PERKS = [
    { id: "stoic", icon: "🧘", name: "Stoic", desc: "Stress hits you less: clarity drains 1% slower every week." },
    { id: "frugal", icon: "🧾", name: "Frugal operator", desc: "Base burn drops 15%, permanently.", apply: (s) => (s.baseBurn *= 0.85) },
    { id: "closer", icon: "🤝", name: "Closer", desc: "+1 investor interest on every pitch answer, better negotiating odds." },
    { id: "magnetic", icon: "🧲", name: "Magnetic", desc: "Relationships decay half as fast." },
    { id: "rainmaker", icon: "🌧️", name: "Rainmaker", desc: "Close a big deal now: +$1,500 MRR.", apply: (s) => (s.monthlyRevenue += 1500) },
    { id: "glue", icon: "🫶", name: "Culture glue", desc: "+20% team morale right now.", apply: (s) => (s.teamMorale = Math.min(100, s.teamMorale + 20)) },
    { id: "secondwind", icon: "🌅", name: "Second wind", desc: "+30% clarity right now.", apply: (s) => (s.mentalClarity = Math.min(100, s.mentalClarity + 30)) },
    { id: "product", icon: "🧪", name: "Product sense", desc: "Churn −1.5% and tech debt −10, permanently.", apply: (s) => ((s.churnRate = Math.max(0.5, s.churnRate - 1.5)), (s.techDebt = Math.max(0, s.techDebt - 10))) },
    { id: "delegator", icon: "📨", name: "Delegator", desc: "Ignored inbox messages no longer have downsides." },
    { id: "visionary", icon: "🔭", name: "Visionary", desc: "Investors buy the story: valuation +25% now.", apply: (s) => (s.valuation = Math.round(s.valuation * 1.25)) },
  ];
  const LEVEL_XP = [0, 0, 400, 900, 1500, 2200, 3000, 3900, 4900, 6000];
  const xpForLevel = (l) => (l < LEVEL_XP.length ? LEVEL_XP[l] : LEVEL_XP[LEVEL_XP.length - 1] + (l - LEVEL_XP.length + 1) * 1200);

  function checkLevelUp(s) {
    if (s.perkChoice) return false;
    if (s.founderExp >= xpForLevel(s.level + 1)) {
      const options = PERKS.filter((p) => !has(s, p.id));
      if (!options.length) {
        s.level += 1;
        return false;
      }
      s.perkChoice = pickN(options, 3).map((p) => p.id);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- streaks
  const STREAK_REWARDS = { 3: { cash: 1000, text: "+$1,000" }, 5: { cash: 2500, clarity: 10, text: "+$2,500 · +10% clarity" } };
  function streakReward(n) {
    if (STREAK_REWARDS[n]) return STREAK_REWARDS[n];
    if (n > 5 && n % 5 === 0) return { cash: 4000, clarity: 5, text: "+$4,000 · +5% clarity" };
    return null;
  }

  // ---------------------------------------------------------------- pitch
  const ROUND_NAMES = { 1: "Pre-seed", 2: "Seed", 3: "Series A", 4: "Series B" };
  const INVESTORS = [
    { id: "angel", icon: "👼", name: "Angel investor", blurb: "Quick yes or no. Small cheque.", pct: 0.08, bar: 4, premium: 1 },
    { id: "fund", icon: "🏦", name: "Seed fund", blurb: "Real money, real diligence.", pct: 0.15, bar: 6, premium: 1.1 },
    { id: "whale", icon: "🐳", name: "Top-tier VC", blurb: "Pays a premium. Rarely says yes.", pct: 0.2, bar: 8, premium: 1.35 },
  ];
  // Each answer scores against the real state of the company.
  const QUESTIONS = [
    {
      q: "What's your traction?",
      a: [
        ["Show the revenue dashboard", (s) => (s.monthlyRevenue >= 5000 ? [3, "Leans in. “Now we're talking.”"] : s.monthlyRevenue >= 1000 ? [1, "“Early, but real.”"] : [-2, "Long pause at the $0 line."])],
        ["Tell the vision story", () => [1, "“Big vision. Numbers?”"]],
        ["Talk about user love", (s) => (s.activeUsers >= 500 ? [2, "“That retention curve is nice.”"] : [0, "“How many users, exactly?”"])],
      ],
    },
    {
      q: "How will you use the money?",
      a: [
        ["Hire senior engineers", (s) => (s.techDebt > 35 ? [2, "“Good, your stack needs it.”"] : [1, "Nods."])],
        ["Marketing blitz", (s) => (parseFloat(s.ltvCacRatio) >= 3 ? [2, "“Your unit economics can take it.”"] : [-1, "“Your CAC says otherwise.”"])],
        ["Extend runway, stay lean", (s) => (parseFloat(s.runwayMonths) < 4 ? [2, "“Disciplined. I like it.”"] : [0, "“So… why raise?”"])],
      ],
    },
    {
      q: "Why are you the one to build this?",
      a: [
        ["I've lived this problem", () => [2, "“Founder-market fit.”"]],
        ["My co-founder is a 10x engineer", (s) => (s.team.some((t) => t.id === "emp_cto") ? [1, "“Can I meet Tariq?”"] : [-1, "“Where is he?”"])],
        ["Honestly, I'm still figuring it out", (s) => (s.mentalClarity < 40 ? [1, "“At least you're honest.”"] : [-1, "Writes something down."])],
      ],
    },
    {
      q: "What keeps you up at night?",
      a: [
        ["Churn", (s) => (s.churnRate > 5 ? [2, "“Good. It should.”"] : [1, "“Fair.”"])],
        ["Nothing, we've got this", () => [-2, "“Founders who sleep well worry me.”"]],
        ["My own burnout", (s) => (s.mentalClarity < 50 ? [1, "Softens. “Respect.”"] : [0, "“Hmm.”"])],
      ],
    },
    {
      q: "Who's your competition?",
      a: [
        ["Nobody does what we do", () => [-2, "Visible eye-roll."]],
        ["Big incumbents, but they're slow", () => [2, "“Classic wedge. Good.”"]],
        ["Walk them through a market map", (s) => (s.techDebt < 30 ? [1, "“You know your space.”"] : [0, "“Busy slide.”"])],
      ],
    },
    {
      q: "What's your monthly burn?",
      a: [
        ["Give the exact figure", (s) => (s.mentalClarity < 40 ? [-1, "You hesitated. They noticed."] : [2, "“You know your numbers.”"])],
        ["Round it off", () => [0, "“Roughly is a strange word for money.”"]],
        ["Change the subject", () => [-2, "“Let's come back to that.” They don't."]],
      ],
    },
  ];

  const pitchCooldown = (s) => Math.max(0, s.lastPitchWeek + 4 - s.week);
  // One round per company stage: the next round unlocks at the next MRR milestone.
  const raisedThisStage = (s) => (s.rounds || []).some((r) => r.stage === s.stage);
  const canPitch = (s) => s.week >= pitchFrom(s) && !s.slotUsed && pitchCooldown(s) === 0 && !raisedThisStage(s);
  // the market mood moves every investor: hot markets add interest, winters take it away
  const baseInterest = (s) =>
    Math.round(((s.investorTrust == null ? 80 : s.investorTrust) - 60) / 10) + ((MOODS[s.econ && s.econ.mood] || {}).interest || 0) - (s.org && s.org.passUntil > s.week ? 1 : 0); // a recent pass is a signal

  function termSheet(s, inv, interest) {
    const over = Math.max(0, interest - inv.bar);
    const pct = inv.pct;
    const pre = s.valuation * inv.premium * (1 + over * 0.05);
    const amount = Math.round((pre * pct) / (1 - pct) / 500) * 500;
    // angels don't take seats; funds do. 1x non-participating preference is the clean standard.
    return { amount: amount, pct: pct, post: Math.round(pre + amount), pref: 1, seat: inv.id !== "angel", control: false };
  }
  // the classic trap: a bigger number with terms that cost you the company
  function trapSheet(sheet) {
    const pre = (sheet.post - sheet.amount) * 1.35,
      amount = Math.round((pre * sheet.pct) / (1 - sheet.pct) / 500) * 500;
    return { amount: amount, pct: sheet.pct, post: Math.round(pre + amount), pref: 2, seat: true, control: true };
  }

  // -------------------------------------------------------------- UI: inbox
  function InboxModal({ S, onChoose, onClose }) {
    const msg = S.inbox[0];
    const card = msg && cardById(msg.id);
    const [dx, setDx] = React.useState(0);
    const start = React.useRef(0);
    React.useEffect(() => setDx(0), [msg && msg.id]);
    if (!card) return null;
    const choose = (side) => {
      setDx(0);
      onChoose(card, side);
    };
    const tilt = clamp(dx / 14, -14, 14);
    const lean = dx < -40 ? "left" : dx > 40 ? "right" : null;
    return jsx(Modal, {
      visible: !0,
      transparent: !0,
      animationType: "fade",
      onRequestClose: onClose,
      children: jsxs(View, {
        style: fst.overlay,
        children: [
          jsxs(View, {
            style: fst.inboxTop,
            children: [
              jsx(Text, { style: fst.kicker, children: "📨 INBOX · " + S.inbox.length + " LEFT" }),
              jsx(Touchable, { onPress: onClose, style: fst.later, children: jsx(Text, { style: fst.laterTxt, children: "Later" }) }),
            ],
          }),
          jsxs(View, {
            dataSet: { ff: "pop" },
            style: [fst.mail, { transform: [{ translateX: dx }, { rotate: tilt + "deg" }] }],
            onStartShouldSetResponder: () => true,
            onMoveShouldSetResponder: () => true,
            onResponderGrant: (e) => (start.current = e.nativeEvent.pageX),
            onResponderMove: (e) => setDx(e.nativeEvent.pageX - start.current),
            onResponderRelease: () => (dx < -90 ? choose("left") : dx > 90 ? choose("right") : setDx(0)),
            onResponderTerminate: () => setDx(0),
            children: [
              lean && jsx(View, { style: [fst.stamp, lean === "left" ? fst.stampLeft : fst.stampRight], children: jsx(Text, { style: fst.stampTxt, children: card[lean].label }) }),
              jsxs(View, {
                style: fst.fromRow,
                children: [jsx(Pic, { e: leadEmoji(card.from)[0] || "📧", size: 52 }), jsx(Text, { style: [fst.from, { flex: 1 }], children: leadEmoji(card.from)[1] })],
              }),
              jsx(Text, { style: fst.mailTitle, children: card.title }),
              jsx(Text, { style: fst.mailBody, children: card.body }),
              card.ignore && jsx(Text, { style: fst.warn, children: has(S, "delegator") ? "Ignoring is safe (Delegator)." : "⚠️ Ignoring this has consequences." }),
              jsx(Text, { style: fst.swipeHint, children: "← swipe or tap →" }),
            ],
          }, msg.id),
          jsx(View, {
            style: fst.choiceRow,
            children: ["left", "right"].map((side) =>
              jsxs(
                Touchable,
                {
                  style: [fst.choice, lean === side && fst.choiceOn],
                  activeOpacity: 0.85,
                  onPress: () => choose(side),
                  children: [
                    jsx(Text, { style: fst.choiceLabel, children: (side === "left" ? "← " : "") + card[side].label + (side === "right" ? " →" : "") }),
                    jsx(Chips, { items: effectChips(fx(card[side], S)), style: { marginTop: 8, justifyContent: "center" } }),
                  ],
                },
                side,
              ),
            ),
          }),
        ],
      }),
    });
  }

  // -------------------------------------------------------------- UI: perks
  function PerkModal({ S, onPick }) {
    return jsx(Modal, {
      visible: !0,
      transparent: !0,
      animationType: "fade",
      children: jsx(View, {
        style: fst.overlay,
        children: jsxs(View, {
          style: fst.panel,
          dataSet: { ff: "pop" },
          children: [
            jsx(Text, { style: [fst.kicker, { color: COLOR.gold }], children: "⭐ LEVEL UP" }),
            jsx(Text, { style: fst.panelTitle, children: "Founder level " + (S.level + 1) }),
            jsx(Text, { style: fst.panelSub, children: "Pick one. Perks stay for the rest of the run." }),
            S.perkChoice.map((id, idx) => {
              const p = PERKS.find((x) => x.id === id);
              return jsxs(
                Touchable,
                {
                  style: fst.perk,
                  activeOpacity: 0.85,
                  dataSet: { ff: "rise" + (idx + 1) },
                  onPress: () => onPick(p),
                  children: [
                    jsx(Pic, { e: p.icon, size: 46 }),
                    jsxs(View, { style: { flex: 1 }, children: [jsx(Text, { style: fst.perkName, children: p.name }), jsx(Text, { style: fst.perkDesc, children: p.desc })] }),
                  ],
                },
                id,
              );
            }),
            (S.perks || []).length > 0 && jsx(Text, { style: fst.owned, children: "You have: " + S.perks.map((id) => (PERKS.find((p) => p.id === id) || {}).icon).join(" ") }),
          ],
        }),
      }),
    });
  }

  // -------------------------------------------------------------- UI: pitch
  function PitchModal({ S, onClose, onSign, onFail, onWalk }) {
    const [phase, setPhase] = React.useState("pick"); // pick | q | sheet | result
    const [inv, setInv] = React.useState(null);
    const [qs] = React.useState(() => pickN(QUESTIONS, 3));
    const [qi, setQi] = React.useState(0);
    const [interest, setInterest] = React.useState(baseInterest(S));
    const [reaction, setReaction] = React.useState(null);
    const [sheet, setSheet] = React.useState(null);
    const [result, setResult] = React.useState(null);
    const fogPenalty = S.mentalClarity < 40 ? 1 : 0;
    const closer = has(S, "closer") ? 1 : 0;
    const round = ROUND_NAMES[S.stage] || "Growth";

    const meter = inv &&
      jsxs(View, {
        style: fst.meterWrap,
        children: [
          jsxs(View, {
            style: fst.meterLabels,
            children: [jsx(Text, { style: fst.kicker, children: "INTEREST" }), jsx(Text, { style: [fst.kicker, { color: interest >= inv.bar ? COLOR.vital : COLOR.text3 }], children: interest + " / " + inv.bar + " needed" })],
          }),
          jsxs(View, {
            style: fst.meter,
            children: [
              jsx(View, { style: [fst.meterFill, { width: clamp((interest / 12) * 100, 2, 100) + "%", backgroundColor: interest >= inv.bar ? COLOR.vital : COLOR.fog }] }),
              jsx(View, { style: [fst.meterBar, { left: clamp((inv.bar / 12) * 100, 0, 100) + "%" }] }),
            ],
          }),
        ],
      });

    let body;
    if (phase === "pick")
      body = [
        jsx(Text, { style: fst.panelTitle, children: "Raise a " + round + " round" }, "t"),
        jsx(Text, { style: fst.panelSub, children: "Uses your action this week. Investor trust " + Math.round(S.investorTrust) + "% gives you a " + (baseInterest(S) >= 0 ? "+" : "") + baseInterest(S) + " head start." + (fogPenalty ? " You're in the fog: −1 on every answer." : "") }, "s"),
        INVESTORS.map((x, idx) => {
          const t = termSheet(S, x, x.bar);
          return jsxs(
            Touchable,
            {
              style: fst.investor,
              activeOpacity: 0.85,
              dataSet: { ff: "rise" + (idx + 1) },
              onPress: () => {
                setInv(x);
                setPhase("q");
              },
              children: [
                jsx(Pic, { e: x.icon, size: 46 }),
                jsxs(View, {
                  style: { flex: 1 },
                  children: [
                    jsx(Text, { style: fst.perkName, children: x.name }),
                    jsx(Text, { style: fst.perkDesc, children: x.blurb }),
                    jsx(Chips, { items: [{ text: "~" + compact(t.amount), tone: 1 }, { text: Math.round(x.pct * 100) + "% equity", tone: -1 }, { text: "needs " + x.bar, tone: 0 }], style: { marginTop: 8 } }),
                  ],
                }),
              ],
            },
            x.id,
          );
        }),
      ];
    else if (phase === "q") {
      const q = qs[qi];
      body = [
        jsxs(View, { style: fst.investorHead, children: [jsx(Pic, { e: inv.icon, size: 40 }), jsx(Text, { style: fst.perkName, children: inv.name })] }, "h"),
        jsx(React.Fragment, { children: meter }, "m"),
        reaction && jsx(View, { style: [fst.reaction, reaction.score > 0 ? fst.reactGood : reaction.score < 0 ? fst.reactBad : null], dataSet: { ff: "pop" }, children: jsx(Text, { style: fst.reactionTxt, children: (reaction.score > 1 ? "🤩 " : reaction.score > 0 ? "🙂 " : reaction.score < 0 ? "😬 " : "😐 ") + reaction.text }) }, "r" + qi),
        jsx(Text, { style: fst.question, children: "Q" + (qi + 1) + ". " + q.q }, "q"),
        q.a.map(([label, score], idx) =>
          jsx(
            Touchable,
            {
              style: fst.answer,
              activeOpacity: 0.85,
              dataSet: { ff: "rise" + (idx + 1) },
              onPress: () => {
                const [pts, line] = score(S);
                const total = pts + closer - fogPenalty;
                const next = interest + total;
                setInterest(next);
                setReaction({ score: total, text: line });
                buzz(total > 0 ? 10 : 30);
                if (qi < qs.length - 1) setQi(qi + 1);
                else if (next >= inv.bar) {
                  setSheet(termSheet(S, inv, next));
                  setPhase("sheet");
                } else {
                  setResult({ ok: false });
                  setPhase("result");
                  onFail(inv);
                }
              },
              children: jsx(Text, { style: fst.answerTxt, children: label }),
            },
            label,
          ),
        ),
      ];
    } else if (phase === "sheet") {
      const odds = clamp(0.35 + (interest - inv.bar) * 0.1 + closer * 0.15, 0.1, 0.85);
      const trap = trapSheet(sheet);
      const terms = (t) => [
        ["Investment", money(t.amount), "#1f7a4a"],
        ["Equity", Math.round(t.pct * 100) + "%", "#b33a2a"],
        ["Post-money", compact(t.post), "#1b1712"],
        ["Preference", t.pref + "×", t.pref > 1 ? "#b33a2a" : "#1b1712"],
        ["Board", t.control ? "Investors control" : t.seat ? "1 investor seat" : "No seat", t.control ? "#b33a2a" : "#1b1712"],
      ];
      const box = (t, key) =>
        jsx(
          View,
          {
            style: fst.sheetBox,
            dataSet: { ff: "pop" },
            children: terms(t).map(([l, v, c]) => jsxs(View, { style: fst.sheetRow, children: [jsx(Text, { style: fst.sheetL, children: l }), jsx(Text, { style: [fst.sheetV, { color: c }], children: v })] }, l)),
          },
          key,
        );
      const sign = (t, negotiated) => (onSign(inv, t, negotiated), setResult({ ok: true, sheet: t, negotiated: negotiated }), setPhase("result"));
      body = [
        jsx(Text, { style: [fst.kicker, { color: COLOR.vital }], children: "📝 TERM SHEET" }, "k"),
        jsx(Text, { style: fst.panelTitle, children: inv.name + " is in." }, "t"),
        jsx(Text, { style: fst.panelSub, children: "Clean terms. You'd own " + (S.equity * (1 - sheet.pct)).toFixed(1) + "% after it closes." }, "s1"),
        box(sheet, "b"),
        jsx(Touchable, { style: fst.primary, activeOpacity: 0.85, onPress: () => sign(sheet, false), children: jsx(Text, { style: fst.primaryTxt, children: "Sign clean terms · " + compact(sheet.amount) }) }, "sign"),
        jsx(
          Touchable,
          {
            style: fst.secondary,
            activeOpacity: 0.85,
            onPress: () => {
              if (Math.random() < odds) {
                const better = { ...sheet, amount: Math.round((sheet.amount * 1.3) / 500) * 500, post: Math.round(sheet.post + sheet.amount * 0.3) };
                buzz(20);
                sign(better, true);
              } else {
                buzz(40);
                onWalk(inv);
                setResult({ ok: false, walked: true });
                setPhase("result");
              }
            },
            children: jsx(Text, { style: fst.secondaryTxt, children: "Push for 30% more · " + Math.round(odds * 100) + "% chance" }),
          },
          "neg",
        ),
        jsx(Text, { style: [fst.kicker, { marginTop: 18, color: COLOR.crit }], children: "⚠️ THEIR OTHER OFFER" }, "k2"),
        jsx(Text, { style: fst.panelSub, children: "35% higher valuation. Read the last two lines." }, "s2"),
        box(trap, "b2"),
        jsx(Touchable, { style: fst.secondary, activeOpacity: 0.85, onPress: () => sign(trap, false), children: jsx(Text, { style: fst.secondaryTxt, children: "Take the higher valuation · " + compact(trap.amount) }) }, "trap"),
      ];
    } else {
      body = [
        jsx(Text, { style: fst.bigIcon, children: result.ok ? "🎉" : "🚪" }, "i"),
        jsx(Text, { style: [fst.panelTitle, { textAlign: "center" }], children: result.ok ? (result.negotiated ? "You pushed. They agreed." : "Term sheet signed.") : result.walked ? "They walked away." : "They passed." }, "t"),
        jsx(
          Text,
          {
            style: [fst.panelSub, { textAlign: "center" }],
            children: result.ok
              ? "Term sheet signed for " + money(result.sheet.amount) + ". The money lands after due diligence, in 3 to 6 weeks. Keep the numbers steady until then."
              : result.walked
                ? "You asked for too much. Trust took a hit."
                : "“Come back when the numbers say it for you.” Trust and clarity took a hit.",
          },
          "s",
        ),
        jsx(Touchable, { style: fst.primary, activeOpacity: 0.85, onPress: onClose, children: jsx(Text, { style: fst.primaryTxt, children: "Back to HQ" }) }, "b"),
      ];
    }

    return jsx(Modal, {
      visible: !0,
      transparent: !0,
      animationType: "slide",
      onRequestClose: phase === "q" || phase === "sheet" ? () => {} : onClose,
      children: jsx(View, {
        style: fst.sheetOverlay,
        children: jsxs(View, {
          style: fst.sheet,
          children: [
            jsxs(View, {
              style: fst.inboxTop,
              children: [
                jsx(Text, { style: [fst.kicker, { color: COLOR.act }], children: "💼 FUNDRAISING" }),
                phase === "pick" && jsx(Touchable, { onPress: onClose, style: fst.later, children: jsx(Text, { style: fst.laterTxt, children: "Not now" }) }),
              ],
            }),
            jsx(ScrollView, { showsVerticalScrollIndicator: !1, style: { flexGrow: 0 }, children: body }),
          ],
        }),
      }),
    });
  }

  const fst = StyleSheet.create({
    kicker: { fontFamily: "AzeretMono_500Medium", fontSize: 10, letterSpacing: 1, color: COLOR.text3 },
    overlay: { flex: 1, backgroundColor: "rgba(24,34,48,0.5)", justifyContent: "center", alignItems: "center", padding: 16 },
    inboxTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 460, marginBottom: 12 },
    later: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.line },
    laterTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: COLOR.text2 },
    mail: { width: "100%", maxWidth: 460, minHeight: 260, backgroundColor: "#f1ece2", borderRadius: 22, padding: 22, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, cursor: "grab", userSelect: "none" },
    fromRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    from: { fontFamily: "AzeretMono_500Medium", fontSize: 11, color: "#6b6152", letterSpacing: 0.3 },
    mailTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 23, lineHeight: 29, letterSpacing: -0.5, color: "#1b1712", marginTop: 14 },
    mailBody: { fontFamily: "Archivo_400Regular", fontSize: 15, lineHeight: 22, color: "#4b4236", marginTop: 10 },
    warn: { fontFamily: "Archivo_600SemiBold", fontSize: 12, color: "#a23b1d", marginTop: 14 },
    swipeHint: { fontFamily: "AzeretMono_500Medium", fontSize: 10, color: "#9b8f7c", letterSpacing: 1, textAlign: "center", marginTop: "auto", paddingTop: 18 },
    stamp: { position: "absolute", top: 18, borderWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, zIndex: 2, maxWidth: "70%" },
    stampLeft: { right: 18, borderColor: "#2f6fd0", transform: [{ rotate: "8deg" }] },
    stampRight: { left: 18, borderColor: "#1f8a52", transform: [{ rotate: "-8deg" }] },
    stampTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: "#1b1712", textTransform: "uppercase" },
    // stays left-to-right in Arabic so the buttons sit on the side you swipe toward
    choiceRow: { direction: "ltr", flexDirection: "row", gap: 10, width: "100%", maxWidth: 460, marginTop: 14 },
    choice: { flex: 1, backgroundColor: COLOR.panel, borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: COLOR.line, alignItems: "center", minHeight: 64, justifyContent: "center" },
    choiceOn: { borderColor: COLOR.act, backgroundColor: "#E3EEFF" },
    choiceLabel: { fontFamily: "Archivo_600SemiBold", fontSize: 13.5, color: COLOR.text, textAlign: "center" },
    panel: { width: "100%", maxWidth: 460, backgroundColor: COLOR.panel, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "#F1D27A", borderTopWidth: 3, borderTopColor: COLOR.gold },
    panelTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 22, letterSpacing: -0.5, color: COLOR.text, marginTop: 6 },
    panelSub: { fontFamily: "Archivo_400Regular", fontSize: 13.5, lineHeight: 19, color: COLOR.text2, marginTop: 6, marginBottom: 14 },
    perk: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: COLOR.panel2, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLOR.line },
    perkIcon: { fontSize: 28, width: 38, textAlign: "center" },
    perkName: { fontFamily: "Archivo_600SemiBold", fontSize: 15.5, color: COLOR.text },
    perkDesc: { fontFamily: "Archivo_400Regular", fontSize: 12.5, lineHeight: 18, color: COLOR.text2, marginTop: 2 },
    owned: { fontFamily: "Archivo_500Medium", fontSize: 12, color: COLOR.text3, marginTop: 4, textAlign: "center" },
    sheetOverlay: { flex: 1, backgroundColor: "rgba(24,34,48,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: COLOR.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 26, maxHeight: "92%", width: "100%", maxWidth: 600, alignSelf: "center", borderTopWidth: 2, borderTopColor: COLOR.act },
    investor: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: COLOR.panel2, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLOR.line },
    investorHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    meterWrap: { marginTop: 12 },
    meterLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    meter: { height: 12, borderRadius: 6, backgroundColor: COLOR.panel2, overflow: "hidden" },
    meterFill: { height: "100%", borderRadius: 6 },
    meterBar: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: COLOR.text },
    reaction: { marginTop: 12, borderRadius: 12, padding: 10, backgroundColor: COLOR.panel2 },
    reactGood: { backgroundColor: "#E2F6EA" },
    reactBad: { backgroundColor: "#FDE7E7" },
    reactionTxt: { fontFamily: "Archivo_500Medium", fontSize: 13.5, color: COLOR.text },
    question: { fontFamily: "Archivo_600SemiBold", fontSize: 19, letterSpacing: -0.4, color: COLOR.text, marginTop: 16, marginBottom: 10 },
    answer: { backgroundColor: COLOR.panel2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, borderWidth: 1, borderColor: COLOR.line },
    answerTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14.5, color: COLOR.text },
    sheetBox: { backgroundColor: "#f1ece2", borderRadius: 16, padding: 16, marginTop: 12, gap: 10 },
    sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#d9d0bf", paddingBottom: 8 },
    sheetL: { fontFamily: "Archivo_500Medium", fontSize: 13.5, color: "#4b4236" },
    sheetV: { fontFamily: "AzeretMono_600SemiBold", fontSize: 16, color: "#1b1712" },
    primary: { backgroundColor: COLOR.accent, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 14 },
    primaryTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 15.5, color: "#fff" },
    secondary: { backgroundColor: COLOR.panel2, borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: COLOR.line },
    secondaryTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: COLOR.text },
    bigIcon: { fontSize: 54, textAlign: "center", marginTop: 6 },
  });
