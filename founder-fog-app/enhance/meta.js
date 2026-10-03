  // ================================================================ meta
  // Everything that outlives a single run: anonymous analytics, trophies,
  // founder backgrounds earned across runs, the daily challenge with its
  // shared leaderboard, and sound. Cross-run progress lives in localStorage;
  // analytics and daily scores go to two insert-only Supabase tables through
  // the public (publishable) key. shares App's scope.

  const FF_API = "https://gawicpqglcdiufvogvkv.supabase.co/rest/v1/";
  const FF_KEY = "sb_publishable_xrU4z3QuWbH94NBZJdqYJA_MgH61__v";
  const META_KEY = "founderFog.meta";

  function lsGet(key, fallback) {
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }
  function lsSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }
  function readMeta() {
    const m = lsGet(META_KEY, null) || {};
    m.first = m.first || Date.now();
    m.runs = m.runs || 0;
    m.ends = m.ends || 0;
    m.sectors = m.sectors || {};
    m.trophies = m.trophies || {};
    m.daily = m.daily || {};
    if (m.sound == null) m.sound = true;
    return m;
  }
  const META = readMeta();
  const saveMeta = () => lsSet(META_KEY, META);

  // ------------------------------------------------------------ analytics
  // A random id per device, nothing personal. Off on local dev servers (any
  // page served with a port), so test runs never reach the table.
  function ffDevice() {
    let d = lsGet("founderFog.device", null);
    if (!d) {
      d = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "d" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
      lsSet("founderFog.device", d);
    }
    return d;
  }
  const TRACKING = typeof location !== "undefined" && !location.port && typeof fetch === "function";
  function post(table, row) {
    // daily scores always go (the leaderboard needs them); play events respect the switch
    if (!TRACKING || (table === "ff_events" && META.noTrack)) return Promise.resolve(null);
    return fetch(FF_API + table, {
      method: "POST",
      keepalive: true,
      headers: { apikey: FF_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    }).catch(() => null);
  }
  function track(name, s, props) {
    try {
      post("ff_events", { device: ffDevice(), run: (s && s.runId) || null, name: name, lang: IS_AR ? "ar" : "en", week: s && s.week != null ? Math.min(200, Math.round(s.week)) : null, props: props || {} });
    } catch (e) {}
  }
  let opened = false;
  function trackOpen() {
    if (opened) return;
    opened = true;
    track("app_open", null, { runs: META.runs, days: Math.floor((Date.now() - META.first) / 864e5), trophies: Object.keys(META.trophies).length });
  }
  const bucket = (v) => (v <= 0 ? 0 : Math.pow(10, Math.floor(Math.log10(v))));

  // ---------------------------------------------------------------- sound
  // Tiny synthesised effects (no audio files). Browsers only allow sound after
  // the first tap, which every effect here follows.
  let audio = null;
  const SFX = {
    coin: [[988, 0, 0.07], [1319, 0.06, 0.16]],
    tick: [[523, 0, 0.06], [784, 0.08, 0.09]],
    bad: [[233, 0, 0.16, "triangle"], [175, 0.12, 0.24, "triangle"]],
    alert: [[880, 0, 0.09], [660, 0.12, 0.12]],
    trophy: [[523, 0, 0.1], [659, 0.09, 0.1], [784, 0.18, 0.1], [1047, 0.27, 0.32]],
    win: [[392, 0, 0.14], [523, 0.13, 0.14], [659, 0.26, 0.14], [784, 0.39, 0.4]],
    lose: [[392, 0, 0.22, "triangle"], [330, 0.2, 0.22, "triangle"], [262, 0.4, 0.5, "triangle"]],
  };
  function sfx(kind) {
    if (!META.sound || !SFX[kind]) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = audio || new AC();
      if (audio.state === "suspended") audio.resume();
      const now = audio.currentTime + 0.01;
      SFX[kind].forEach(([f, at, dur, type]) => {
        const o = audio.createOscillator(),
          g = audio.createGain();
        o.type = type || "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + at);
        g.gain.exponentialRampToValueAtTime(0.09, now + at + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
        o.connect(g).connect(audio.destination);
        o.start(now + at);
        o.stop(now + at + dur + 0.05);
      });
    } catch (e) {}
  }
  function toggleSound() {
    META.sound = !META.sound;
    saveMeta();
    if (META.sound) sfx("coin");
    return META.sound;
  }

  // -------------------------------------------------------------- trophies
  const roundsClosed = (s) => (s.rounds || []).some((r) => !r.pending);
  const TROPHIES = [
    { id: "week2", icon: "🗓️", name: "First week done", desc: "Finish your first week.", check: (s) => s.week >= 2 },
    { id: "tutorial", icon: "🎓", name: "Learned the ropes", desc: "Finish the tutorial.", check: () => false },
    { id: "talk", icon: "🔍", name: "Went outside", desc: "Talk to your customers.", check: (s) => s.teach && s.teach.talks >= 1 },
    { id: "talk10", icon: "👂", name: "Customer whisperer", desc: "Talk to customers 10 times in one company.", check: (s) => s.teach && s.teach.talks >= 10 },
    { id: "fit", icon: "🧩", name: "Product-market fit", desc: "Reach 40% product-market fit.", check: (s) => s.mkt && s.mkt.pmf >= 40 },
    { id: "alive", icon: "🌱", name: "Default alive", desc: "Earn more than you spend.", check: (s) => !!s.defaultAlive },
    { id: "seed", icon: "🏛️", name: "Seed stage", desc: "Reach $5k in monthly revenue.", check: (s) => s.stage >= 2 },
    { id: "seriesa", icon: "🚀", name: "Series A", desc: "Reach $40k in monthly revenue.", check: (s) => s.stage >= 3 },
    { id: "unicorn", icon: "🦄", name: "Unicorn", desc: "Reach $250k in monthly revenue.", check: (s) => s.stage >= 4 },
    { id: "raised", icon: "💼", name: "Closed a round", desc: "Get investor money into the bank.", check: roundsClosed },
    { id: "control", icon: "🪑", name: "Kept control", desc: "Close a round and still own 70% or more.", check: (s) => roundsClosed(s) && (s.equity == null ? 100 : s.equity) >= 70 },
    { id: "team10", icon: "👥", name: "Ten people", desc: "Grow the team to ten.", check: (s) => s.team && s.team.length >= 10 },
    { id: "streak5", icon: "🔥", name: "On a roll", desc: "Hit five weekly targets in a row.", check: (s) => (s.streak || 0) >= 5 },
    { id: "rest", icon: "🧘", name: "Looked after yourself", desc: "Rest five times in one company.", check: (s) => s.teach && s.teach.rests >= 5 },
    { id: "clear", icon: "🧠", name: "Clear head", desc: "Reach week 26 with Clarity at 70% or more.", check: (s) => s.week >= 26 && s.mentalClarity >= 70 },
    { id: "year", icon: "🎂", name: "One year in", desc: "Survive 52 weeks.", check: (s) => s.week >= 52 && !s.gameOver },
    { id: "broke", icon: "💸", name: "Out of cash", desc: "Run out of money. Everyone does once.", check: (s) => s.gameOver && s.overType === "bank" },
    { id: "burnout", icon: "🌫️", name: "Into the fog", desc: "Burn out. It happens to real founders too.", check: (s) => s.gameOver && s.overType === "burn" },
    { id: "challenge", icon: "🎯", name: "Challenger", desc: "Complete any challenge.", check: (s) => s.victory && s.overType === "challenge" && !s.daily },
    { id: "daily", icon: "📅", name: "Daily player", desc: "Finish a daily challenge.", check: (s) => !!s.daily && (s.gameOver || s.victory) },
    { id: "pages10", icon: "📓", name: "Student", desc: "Collect 10 Founder Playbook pages.", check: () => BOOK.size >= 10 },
    { id: "sectors", icon: "🌍", name: "Every market", desc: "Start a company in all five markets.", check: () => Object.keys(META.sectors).length >= 5 },
  ];
  const trophyCount = () => TROPHIES.filter((t) => META.trophies[t.id]).length;

  // returns the trophies earned just now
  function checkTrophies(s, also) {
    const got = [];
    TROPHIES.forEach((t) => {
      if (META.trophies[t.id]) return;
      let ok = also === t.id;
      try {
        ok = ok || !!t.check(s);
      } catch (e) {}
      if (!ok) return;
      META.trophies[t.id] = Date.now();
      got.push(t);
      if (s) (s.metaTrophies = s.metaTrophies || []).push(t.id);
      track("achievement", s, { id: t.id });
    });
    if (got.length) saveMeta(), sfx("trophy");
    return got;
  }
  const trophyToast = (got) => (got.length === 1 ? `🏆 Trophy: ${got[0].name}` : `🏆 ${got.length} new trophies`);

  // ------------------------------------------------- founder backgrounds
  // Earned across runs; each changes how a new company starts.
  const BACKGROUNDS = [
    { id: "first", icon: "🎒", name: "First-timer", desc: "No head start. Everyone begins here.", how: "", unlocked: () => true, apply: () => {} },
    { id: "second", icon: "🔁", name: "Second-time founder", desc: "Investors take you seriously: Trust +10, Clarity +5.", how: "Finish any company.", unlocked: () => META.ends >= 1, apply: (s) => ((s.investorTrust = Math.min(100, (s.investorTrust || 80) + 10)), (s.mentalClarity = Math.min(100, s.mentalClarity + 5))) },
    { id: "engineer", icon: "🛠️", name: "Ex-engineer", desc: "You build clean: no tech debt, churn 0.5% lower.", how: "Reach 40% product-market fit once.", unlocked: () => !!META.trophies.fit, apply: (s) => ((s.techDebt = 0), (s.churnRate = Math.max(0.5, s.churnRate - 0.5))) },
    { id: "banker", icon: "🏦", name: "Ex-banker", desc: "You saved before you jumped: 20% more cash, Morale -5.", how: "Reach default alive once.", unlocked: () => !!META.trophies.alive, apply: (s) => ((s.cash = Math.round(s.cash * 1.2)), (s.teamMorale = Math.max(0, s.teamMorale - 5))) },
    { id: "connector", icon: "🤝", name: "Connector", desc: "Everyone knows you: 60 early users, stronger relationships.", how: "Earn 8 trophies.", unlocked: () => trophyCount() >= 8, apply: (s) => ((s.activeUsers += 60), (s.relationships || []).forEach((r) => (r.health = Math.min(100, r.health + 15)))) },
  ];
  function applyBackground(s, id) {
    const b = BACKGROUNDS.find((x) => x.id === id && x.unlocked()) || BACKGROUNDS[0];
    b.apply(s);
    s.background = b.id;
  }

  // ------------------------------------------------------ daily challenge
  // Everyone gets the same market, difficulty and luck for the day: the
  // engine's randomness is seeded by the date and the week.
  function dailyInfo() {
    const now = new Date(),
      day = now.toISOString().slice(0, 10),
      n = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 864e5),
      sectors = Engine.SECTORS;
    return {
      day: day,
      n: n,
      sectorId: sectors[(n * 3) % sectors.length].id,
      mode: ["venture", "winter", "bootstrapped", "venture", "hard", "venture", "winter"][n % 7],
      played: META.daily[day] || null,
    };
  }
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function withSeed(seed, fn) {
    if (seed == null) return fn();
    const real = Math.random;
    Math.random = seeded(seed);
    try {
      return fn();
    } finally {
      Math.random = real;
    }
  }
  (function () {
    const P = Engine.StartupEngine.prototype;
    if (P.__meta) return;
    P.__meta = true;
    const adv = P.advanceWeek;
    P.advanceWeek = function (...args) {
      const d = this.state.daily;
      return withSeed(d ? d.n * 1009 + this.state.week * 7919 : null, () => adv.apply(this, args));
    };
  })();
  CHALLENGES.daily = { icon: "📅", name: "Daily challenge", goal: "Still running at week 26, with the highest valuation you can build.", mode: "venture", deadline: 26, done: (s) => s.week >= 26 };
  const dailyScore = (s) => (s.victory ? Math.max(0, Math.round(s.valuation || 0)) : 0);

  function dailyTop(day) {
    if (typeof fetch !== "function") return Promise.reject(new Error("offline"));
    return fetch(FF_API + "ff_daily_scores?day=eq." + day + "&select=device,name,company,score,weeks,outcome&order=score.desc,weeks.desc,created_at.asc&limit=50", { headers: { apikey: FF_KEY } }).then((r) => {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }

  // once per company, when it ends
  function metaRunEnd(s) {
    if (s.metaEnded) return [];
    s.metaEnded = true;
    META.ends += 1;
    const outcome = s.victory ? "survived" : s.overType === "bank" ? "broke" : s.overType === "burn" ? "burnout" : "other";
    if (s.daily && !META.daily[s.daily.day]) {
      const score = dailyScore(s);
      META.daily[s.daily.day] = { score: score, weeks: s.week, outcome: outcome };
      post("ff_daily_scores", { day: s.daily.day, device: ffDevice(), name: String(s.founderName || "Founder").slice(0, 24) || "Founder", company: String(s.companyName || "Company").slice(0, 32) || "Company", score: score, weeks: Math.min(60, s.week), outcome: outcome, lang: IS_AR ? "ar" : "en" });
    }
    saveMeta();
    sfx(s.victory ? "win" : "lose");
    track("game_end", s, { outcome: outcome, type: s.overType || null, mrr: bucket(s.monthlyRevenue), valuation: bucket(s.valuation), stage: s.stage, daily: !!s.daily, challenge: s.challenge || null, background: s.background || null });
    return checkTrophies(s);
  }

  // when a company is founded
  function metaRunStart(s, opts) {
    s.runId = "r" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    META.runs += 1;
    META.sectors[s.sector && s.sector.id] = 1;
    saveMeta();
    track(s.daily ? "daily_start" : "game_start", s, { sector: s.sector && s.sector.id, mode: s.mode, guided: !!(s.guide && !s.guide.off), challenge: s.challenge || null, background: s.background || null, run: META.runs });
    return checkTrophies(s);
  }

  // ------------------------------------------------------------- screens
  function DailyBoard({ day, limit }) {
    const [rows, setRows] = React.useState(null);
    React.useEffect(() => {
      let live = true;
      dailyTop(day)
        .then((r) => live && setRows(r))
        .catch(() => live && setRows(false));
      return () => {
        live = false;
      };
    }, [day]);
    const me = ffDevice();
    if (rows === null) return jsx(Text, { style: tst.hint, children: "Loading today's leaderboard…" });
    if (rows === false) return jsx(Text, { style: tst.hint, children: "The leaderboard needs an internet connection." });
    if (!rows.length) return jsx(Text, { style: tst.hint, children: "Nobody has finished today's challenge yet. Be the first." });
    return jsx(View, {
      children: rows.slice(0, limit || 10).map((r, i) =>
        jsxs(
          View,
          {
            style: [xst.row, r.device === me && xst.rowMe],
            children: [
              jsx(Text, { style: xst.rank, children: i < 3 ? ["🥇", "🥈", "🥉"][i] : String(i + 1) }),
              jsxs(View, { style: { flex: 1 }, children: [jsx(Text, { style: xst.who, numberOfLines: 1, children: r.device === me ? "You · " + r.company : r.name + " · " + r.company }), jsx(Text, { style: xst.how, children: r.outcome === "survived" ? `Survived ${r.weeks} weeks` : `Ended at week ${r.weeks}` })] }),
              jsx(Text, { style: xst.score, children: r.score > 0 ? compact(r.score) : "—" }),
            ],
          },
          i,
        ),
      ),
    });
  }

  function DailyPanel() {
    const d = dailyInfo(),
      sector = Engine.SECTORS.find((x) => x.id === d.sectorId) || {},
      sectorLabel = String((IS_AR ? sector.name_ar : sector.name_en) || "").replace(/^[\d٠-٩]+\.\s*/, "");
    return jsxs(View, {
      children: [
        jsxs(View, {
          style: tst.card,
          children: [
            jsx(Text, { style: tst.cardKicker, children: "TODAY" }),
            jsx(Text, { style: tst.cardTitle, children: sectorLabel }),
            jsx(Text, { style: tst.cardText, children: (MODES[d.mode] || MODES.venture).name + " · 26 weeks · the highest valuation wins" }),
            d.played && jsx(Text, { style: [tst.cardText, { color: COLOR.vital }], children: d.played.score > 0 ? `Your result today: ${compact(d.played.score)} valuation` : `Your result today: ended at week ${d.played.weeks}` }),
          ],
        }),
        jsxs(View, { style: tst.card, children: [jsx(Text, { style: tst.cardKicker, children: "LEADERBOARD" }), jsx(DailyBoard, { day: d.day, limit: 10 })] }),
      ],
    });
  }

  function TrophyPanel() {
    const n = trophyCount(),
      [, redraw] = React.useState(0);
    const setting = (label, on, flip) =>
      jsxs(Touchable, { style: xst.row, activeOpacity: 0.8, onPress: () => (flip(), redraw((x) => x + 1)), children: [jsx(Text, { style: [xst.who, { flex: 1 }], children: label }), jsx(Text, { style: [xst.score, !on && { color: COLOR.text3 }], children: on ? "On" : "Off" })] });
    return jsxs(View, {
      children: [
        jsxs(View, {
          style: tst.card,
          children: [
            jsx(Text, { style: tst.cardKicker, children: "FOUNDER BACKGROUNDS" }),
            jsx(Text, { style: tst.hint, children: "Unlock a background and pick it when you found a company." }),
            ...BACKGROUNDS.slice(1).map((b) =>
              jsxs(View, { style: [xst.row, !b.unlocked() && { opacity: 0.45 }], children: [jsx(Pic, { e: b.icon, size: 30 }), jsxs(View, { style: { flex: 1 }, children: [jsx(Text, { style: xst.who, children: b.name }), jsx(Text, { style: xst.how, children: b.unlocked() ? b.desc : "🔒 " + b.how })] })] }, b.id),
            ),
          ],
        }),
        jsxs(View, {
          style: tst.card,
          children: [
            jsx(Text, { style: tst.cardKicker, children: `TROPHIES · ${n}/${TROPHIES.length}` }),
            ...TROPHIES.map((t) =>
              jsxs(View, { style: [xst.row, !META.trophies[t.id] && { opacity: 0.4 }], children: [jsx(Pic, { e: META.trophies[t.id] ? t.icon : "🔒", size: 30 }), jsxs(View, { style: { flex: 1 }, children: [jsx(Text, { style: xst.who, children: t.name }), jsx(Text, { style: xst.how, children: t.desc })] })] }, t.id),
            ),
          ],
        }),
        jsxs(View, {
          style: tst.card,
          children: [
            jsx(Text, { style: tst.cardKicker, children: "SETTINGS" }),
            setting("Sound effects", META.sound, toggleSound),
            setting("Anonymous play statistics", !META.noTrack, () => ((META.noTrack = !META.noTrack), saveMeta())),
            jsx(Text, { style: tst.hint, children: "Statistics are counted under a random id, never your name, and help make the game better. Daily challenge scores always go to the public leaderboard." }),
          ],
        }),
      ],
    });
  }

  // on the report card: what this company earned, and today's board for a daily
  function MetaReport({ S }) {
    const got = (S.metaTrophies || []).map((id) => TROPHIES.find((t) => t.id === id)).filter(Boolean);
    return jsxs(View, {
      children: [
        S.daily &&
          jsxs(View, {
            style: tst.card,
            children: [
              jsx(Text, { style: tst.cardKicker, children: "DAILY CHALLENGE" }),
              jsx(Text, { style: tst.cardTitle, children: dailyScore(S) > 0 ? `Your score: ${compact(dailyScore(S))}` : "No score today: the company didn't reach week 26" }),
              jsx(Text, { style: tst.hint, children: "A new challenge starts every day at midnight UTC." }),
              jsx(DailyBoard, { day: S.daily.day, limit: 10 }),
            ],
          }),
        got.length > 0 &&
          jsxs(View, {
            style: tst.card,
            children: [
              jsx(Text, { style: tst.cardKicker, children: "TROPHIES EARNED" }),
              ...got.map((t) => jsxs(View, { style: xst.row, children: [jsx(Pic, { e: t.icon, size: 30 }), jsxs(View, { style: { flex: 1 }, children: [jsx(Text, { style: xst.who, children: t.name }), jsx(Text, { style: xst.how, children: t.desc })] })] }, t.id)),
            ],
          }),
      ],
    });
  }

  const xst = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLOR.line },
    rowMe: { backgroundColor: "#FFF4D6", borderRadius: 10, paddingHorizontal: 6 },
    rank: { width: 28, textAlign: "center", fontFamily: "AzeretMono_600SemiBold", fontSize: 15, color: COLOR.text2 },
    who: { fontFamily: "Archivo_600SemiBold", fontSize: 14.5, color: COLOR.text },
    how: { fontFamily: "Archivo_400Regular", fontSize: 12.5, lineHeight: 17, color: COLOR.text3, marginTop: 1 },
    score: { fontFamily: "AzeretMono_600SemiBold", fontSize: 15, color: COLOR.vital },
  });
