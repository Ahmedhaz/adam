// Founder Fog — main game shell (replaces Metro module 144 of the original build).
// Same dependency list as the original module, so the require indices match:
// React, StyleSheet, Text, View, SafeAreaView, TouchableOpacity, StatusBar, Modal,
// ScrollView, fonts, engine, screens, fog helpers, theme, jsx runtime.
//
// Layout: a persistent HUD (hidden on HQ, which shows the full dashboard), one
// content area per tab, an "End week" bar and a bottom nav. Animations and the
// fog itself are CSS, attached through dataSet (see HEAD in build.py).
function (g, r, i, a, m, _e, d) {
  "use strict";
  function e(e) {
    return e && e.__esModule ? e : { default: e };
  }
  Object.defineProperty(_e, "__esModule", { value: !0 });
  Object.defineProperty(_e, "default", { enumerable: !0, get: function () { return App; } });

  var React = r(d[0]),
    StyleSheet = e(r(d[1])).default,
    Text = e(r(d[2])).default,
    View = e(r(d[3])).default,
    Screen = e(r(d[4])).default,
    Touchable = e(r(d[5])).default,
    StatusBar = e(r(d[6])).default,
    Modal = e(r(d[7])).default,
    ScrollView = e(r(d[8])).default,
    ArchivoFonts = r(d[9]),
    AzeretFonts = r(d[10]),
    Engine = r(d[11]),
    Onboarding = r(d[12]),
    Journal = r(d[13]),
    Assets = r(d[14]),
    Circle = r(d[15]),
    Team = r(d[16]),
    Actions = r(d[17]),
    GameOver = r(d[18]),
    Fog = r(d[19]),
    Theme = r(d[20]),
    J = r(d[21]);

  const COLOR = Theme.COLOR,
    TYPE = Theme.TYPE,
    jsx = J.jsx,
    jsxs = J.jsxs;

  const TABS = [
    { key: "team", icon: "👥", label: "Team" },
    { key: "assets", icon: "🏢", label: "Company" },
    { key: "advance" },
    { key: "circle", icon: "🤝", label: "Circle" },
    { key: "actions", icon: "⚡", label: "Actions" },
  ];
  const STAGE_NAMES = { 1: "Pre-seed", 2: "Seed", 3: "Series A", 4: "Unicorn" };

  // ---------- persistence ----------
  const SAVE_KEY = "founderFog.save.v1";
  function readSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const save = JSON.parse(raw);
      return save && save.state && !save.state.gameOver && !save.state.victory ? save : null;
    } catch (err) {
      return null;
    }
  }
  function writeSave(state) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), state: state }));
    } catch (err) {}
  }
  function clearSave() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (err) {}
  }
  // Language: index.html is English, ar.html is Arabic. Switching mid-game reloads the
  // other page and picks the saved game straight back up.
  const IS_AR = typeof document !== "undefined" && document.documentElement.lang === "ar";
  const RESUME_KEY = "founderFog.resumeAfterSwitch";
  function switchLanguage() {
    try {
      window.localStorage.setItem("founderFog.lang", IS_AR ? "en" : "ar");
      window.sessionStorage.setItem(RESUME_KEY, "1");
    } catch (err) {}
    window.location.replace(IS_AR ? "index.html" : "ar.html");
  }

  function restoreEngine(state) {
    const engine = new Engine.StartupEngine(state.founderName, state.companyName, state.sector && state.sector.id);
    engine.state = state;
    engine.recalculate(); // re-reads the week's target from this page's (possibly other-language) data
    return engine;
  }

  function buzz(ms) {
    try {
      navigator.vibrate && navigator.vibrate(ms);
    } catch (err) {}
  }

  // ---------- formatting ----------
  // Numbers are wrapped in left-to-right isolates so "+$3,000" keeps its order inside Arabic text.
  const ltr = (x) => "\u2066" + x + "\u2069";
  const money = (v) => ltr((v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString());
  const compact = (v) => {
    const a = Math.abs(v),
      s = v < 0 ? "−$" : "$";
    if (a >= 1e6) return ltr(s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M");
    if (a >= 1e4) return ltr(s + Math.round(a / 1e3) + "k");
    return ltr(s + Math.round(a).toLocaleString());
  };
  const signed = (v, unit) => ltr((v > 0 ? "+" : "−") + Math.abs(Math.round(v)).toLocaleString() + (unit || ""));
  const signedMoney = (v) => ltr((v > 0 ? "+$" : "−$") + Math.abs(Math.round(v)).toLocaleString());

  // Higher is worse for these metrics, so their "+" is shown in red.
  const BAD_UP = /tech debt|churn|cac|burn|\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u062a\u0642\u0646\u064a|\u0627\u0644\u062a\u0633\u0631\u0651?\u0628|\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0627\u0633\u062a\u062d\u0648\u0627\u0630|\u0627\u0644\u062d\u0631\u0642/i;
  const BAD_KEYS = ["techDebt", "churnRate", "cac", "baseBurn"];
  const EFFECT_LABELS = {
    cash: ["Cash", "$"],
    monthlyRevenue: ["MRR", "$"],
    mentalClarity: ["Clarity", "%"],
    teamMorale: ["Morale", "%"],
    investorTrust: ["Trust", "%"],
    techDebt: ["Tech debt", ""],
    churnRate: ["Churn", "%"],
    activeUsers: ["Users", ""],
    arpu: ["ARPU", "$"],
    cac: ["CAC", "$"],
    founderExp: ["EXP", ""],
    valuation: ["Valuation", "$"],
    equity: ["Equity", "%"],
    baseBurn: ["Burn", "$"],
  };

  function effectChips(effects) {
    const out = [];
    Object.keys(effects || {}).forEach((k) => {
      const v = effects[k];
      if (k === "hire" && v && v.count) {
        out.push({ text: "+" + v.count + " " + (v.seniority === "senior" ? "senior" : "junior") + " hire", tone: 0 });
        return;
      }
      const meta = EFFECT_LABELS[k];
      if (!meta || typeof v !== "number" || v === 0) return;
      const label = meta[0],
        unit = meta[1];
      const txt = unit === "$" ? label + " " + signedMoney(v) : label + " " + signed(v, unit);
      const good = BAD_KEYS.includes(k) ? v < 0 : v > 0;
      out.push({ text: txt, tone: k === "founderExp" ? 2 : good ? 1 : -1 });
    });
    return out;
  }

  // "MRR +$3,500 | Tech Debt +25% | Cash $0" -> coloured chips
  function previewChips(preview) {
    return String(preview || "")
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const m = p.match(/[+\-−]/);
        const text = p.replace(/[+\-\u2212]?\$?[\d][\d,.]*[%kM]?\$?/g, ltr);
        if (!m || /\$0\b/.test(p)) return { text: text, tone: 0 };
        const up = m[0] === "+";
        const good = BAD_UP.test(p) ? !up : up;
        return { text: text, tone: good ? 1 : -1 };
      });
  }

  // Drop a leading emoji from engine titles; the card already has its own icon.
  const questTitle = (t) => String(t || "").replace(/^\S+\s/, (m) => (/[a-z0-9]/i.test(m) ? m : ""));

  // 3D pictures (Fluent emoji, bundled in img/) drawn via CSS on [data-pic]; emoji text as fallback.
  const PICS = /*@PICS*/ {};
  const picKey = (e) => PICS[String(e || "").replace(/\uFE0F/g, "")];
  function Pic({ e, size, style }) {
    const k = picKey(e);
    if (k) return jsx(View, { dataSet: { pic: k }, style: [{ width: size, height: size }, style] });
    return jsx(Text, { style: [{ fontSize: Math.round(size * 0.78), lineHeight: size, width: size, textAlign: "center" }, style], children: e });
  }
  const leadEmoji = (t) => {
    const str = String(t || "");
    const m = str.match(/^\s*(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)\s*/u);
    return m ? [m[1], str.slice(m[0].length)] : [null, str];
  };

  function Chips({ items, style }) {
    return jsx(View, {
      style: [st.chips, style],
      children: items.map((c, idx) =>
        jsx(
          View,
          {
            style: [st.chip, c.tone === 1 ? st.chipGood : c.tone === -1 ? st.chipBad : c.tone === 2 ? st.chipGold : st.chipNeutral],
            children: jsx(Text, {
              style: [st.chipTxt, { color: c.tone === 1 ? COLOR.vital : c.tone === -1 ? COLOR.crit : c.tone === 2 ? COLOR.gold : COLOR.text2 }],
              children: c.text,
            }),
          },
          idx,
        ),
      ),
    });
  }

  function snapshot(s) {
    return {
      week: s.week,
      cash: s.cash,
      monthlyRevenue: s.monthlyRevenue,
      mentalClarity: s.mentalClarity,
      teamMorale: s.teamMorale,
      teamSize: s.team.length,
      stage: s.stage,
      badges: (s.unlockedBadges || []).length,
      slotUsed: s.slotUsed,
      streak: s.streak || 0,
    };
  }

// @include features.js

  function buildReport(before, after) {
    const rows = [
      { label: "Cash", value: money(after.cash), delta: after.cash - before.cash, fmt: signedMoney, fogged: true },
      { label: "MRR", value: money(after.monthlyRevenue), delta: after.monthlyRevenue - before.monthlyRevenue, fmt: signedMoney, fogged: true },
      { label: "Clarity", value: Math.round(after.mentalClarity) + "%", delta: after.mentalClarity - before.mentalClarity, fmt: (v) => signed(v, "%") },
      { label: "Morale", value: Math.round(after.teamMorale) + "%", delta: after.teamMorale - before.teamMorale, fmt: (v) => signed(v, "%") },
    ];
    const notes = [];
    if (after.stage > before.stage) notes.push(["🏛️", "Stage up: " + (STAGE_NAMES[after.stage] || "Stage " + after.stage) + ". Valuation re-rated.", 1]);
    if ((after.unlockedBadges || []).length > before.badges) notes.push(["🏆", "New badge unlocked. Check the journal.", 1]);
    if (after.team.length < before.teamSize) notes.push(["🚪", "Someone resigned. Morale was too low.", -1]);
    if (before.mentalClarity >= 40 && after.mentalClarity < 40) notes.push(["🌫️", "The fog is rolling in. Your numbers are getting hard to read. Rest this week.", -1]);
    if (parseFloat(after.runwayMonths) < 3) notes.push(["⏳", "Under 3 months of runway. Cut burn or bring in cash.", -1]);
    if (!before.slotUsed) notes.push(["⚡", "You didn't use last week's personal action.", 0]);
    if (after.pendingEvent) notes.push(["⚖️", "A decision is waiting for you.", 0]);
    if (after.inbox && after.inbox.length) notes.push(["📨", after.inbox.length === 1 ? "1 new message in your inbox." : after.inbox.length + " new messages in your inbox.", 0]);
    return { week: before.week, rows: rows, notes: notes, quest: after.currentTarget && after.currentTarget.title, nextWeek: after.week };
  }
  function addNote(report, note) {
    report.notes.unshift(note);
  }

  function App() {
    const [fontsLoaded] = (0, ArchivoFonts.useFonts)({
      Archivo_400Regular: ArchivoFonts.Archivo_400Regular,
      Archivo_500Medium: ArchivoFonts.Archivo_500Medium,
      Archivo_600SemiBold: ArchivoFonts.Archivo_600SemiBold,
      AzeretMono_400Regular: AzeretFonts.AzeretMono_400Regular,
      AzeretMono_500Medium: AzeretFonts.AzeretMono_500Medium,
      AzeretMono_600SemiBold: AzeretFonts.AzeretMono_600SemiBold,
    });
    const [engine, setEngine] = React.useState(null),
      [S, setS] = React.useState(null),
      [tab, setTab] = React.useState("hq"),
      [guideOpen, setGuideOpen] = React.useState(false),
      [saved, setSaved] = React.useState(readSave),
      [toast, setToast] = React.useState(null),
      [report, setReport] = React.useState(null),
      [inboxOpen, setInboxOpen] = React.useState(false),
      [pitchOpen, setPitchOpen] = React.useState(false);
    const toastTimer = React.useRef(null);
    const feedRef = React.useRef(null);
    // keep the life log scrolled to the latest week, BitLife style
    React.useEffect(() => {
      const t = setTimeout(() => feedRef.current && feedRef.current.scrollToEnd && feedRef.current.scrollToEnd({ animated: !0 }), 80);
      return () => clearTimeout(t);
    }, [S && S.week, S && S.journalLog.length, tab]);

    React.useEffect(() => {
      if (!S) return;
      if (S.gameOver || S.victory) clearSave();
      else writeSave(S);
    }, [S]);

    React.useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

    // Came here from the language switch: jump straight back into the saved game.
    React.useEffect(() => {
      try {
        if (!window.sessionStorage.getItem(RESUME_KEY)) return;
        window.sessionStorage.removeItem(RESUME_KEY);
      } catch (err) {
        return;
      }
      const sv = readSave();
      if (!sv) return;
      const eng = restoreEngine(sv.state);
      ensureFeatureState(eng.state);
      setEngine(eng);
      setS({ ...eng.state });
    }, []);

    // XP can arrive from anywhere (targets, inbox, dilemmas); level up as soon as it does.
    React.useEffect(() => {
      if (engine && S && !S.gameOver && !S.victory && checkLevelUp(engine.state)) setS({ ...engine.state });
    }, [S]);

    const notify = (text, kind) => {
      toastTimer.current && clearTimeout(toastTimer.current);
      setToast({ text: text, kind: kind || "info", id: Date.now() });
      toastTimer.current = setTimeout(() => setToast(null), kind === "bad" ? 3200 : 2400);
    };

    // Runs an engine call that returns {success, reason, state}; failures are
    // surfaced instead of silently ignored.
    const act = (result, okText) => {
      if (!result) return false;
      if (result.success) {
        setS({ ...result.state });
        okText && notify(okText, "ok");
        buzz(10);
        return true;
      }
      buzz(30);
      notify(result.reason || "That didn't work.", "bad");
      return false;
    };

    if (!fontsLoaded)
      return jsx(Screen, {
        style: [st.container, { justifyContent: "center", alignItems: "center" }],
        children: jsx(StatusBar, { barStyle: "dark-content" }),
      });

    const start = ({ founderName, companyName, sectorId, avatar }) => {
      const eng = new Engine.StartupEngine(founderName, companyName, sectorId);
      eng.state.avatar = avatar || "avatar_m1";
      ensureFeatureState(eng.state);
      dealInbox(eng.state, 1);
      clearSave();
      setSaved(null);
      setEngine(eng);
      setS({ ...eng.state });
      setTab("hq");
      setReport(null);
    };
    const resume = () => {
      if (!saved) return;
      const eng = restoreEngine(saved.state);
      ensureFeatureState(eng.state);
      setEngine(eng);
      setS({ ...eng.state });
      setTab("hq");
    };
    const restart = () => {
      clearSave();
      setSaved(null);
      setEngine(null);
      setS(null);
      setTab("hq");
      setReport(null);
    };

    if (!engine || !S)
      return jsxs(Screen, {
        style: st.container,
        children: [
          jsx(StatusBar, { barStyle: "dark-content" }),
          jsx(Onboarding.OnboardingScreen, {
            onStartGame: start,
            saved: saved,
            onResume: resume,
            onDiscard: () => {
              clearSave();
              setSaved(null);
            },
          }),
        ],
      });

    if (S.gameOver || S.victory)
      return jsxs(Screen, {
        style: st.container,
        children: [jsx(StatusBar, { barStyle: "dark-content" }), jsx(GameOver.GameOverScreen, { gameState: S, onRestart: restart })],
      });

    // ---------- derived ----------
    const target = S.currentTarget,
      guide = target && target.howToGuide,
      targetDone = !!target && S.completedTargets.includes(target.week),
      fogged = Fog.isFogged(S.mentalClarity),
      fogAmt = Fog.fogIntensity(S.mentalClarity),
      fogOp = Fog.fogOpacity(S.mentalClarity),
      ft = (text, key) => Fog.fogText(text, S.mentalClarity, key, S.week),
      runway = parseFloat(S.runwayMonths),
      runwayLabel = runway >= 999 ? "∞" : runway.toFixed(1),
      runwayColor = runway < 3 ? COLOR.crit : runway < 6 ? COLOR.fog : COLOR.vital,
      clarityColor = S.mentalClarity < 25 ? COLOR.crit : fogged ? COLOR.fog : COLOR.act,
      moraleColor = S.teamMorale < 40 ? COLOR.crit : S.teamMorale < 60 ? COLOR.fog : COLOR.vital,
      nextStage = (Engine.STAGES || []).find((x) => x.stage > S.stage),
      stageName = STAGE_NAMES[S.stage] || "Stage " + S.stage,
      weakTie = (S.relationships || []).some((x) => x.health < 40),
      allDone = S.slotUsed && (targetDone || !guide);

    const advance = () => {
      const before = snapshot(S);
      const hitTarget = targetDone;
      const ignored = expireInbox(engine);
      if (engine.state.gameOver || engine.state.victory) return setS({ ...engine.state });
      const next = engine.advanceWeek();
      ensureFeatureState(next);
      // streaks: consecutive weekly targets pay out
      let streakNote = null;
      if (hitTarget) {
        next.streak += 1;
        next.bestStreak = Math.max(next.bestStreak, next.streak);
        const bonus = streakReward(next.streak);
        if (bonus) {
          next.cash += bonus.cash || 0;
          if (bonus.clarity) next.mentalClarity = Math.min(100, next.mentalClarity + bonus.clarity);
          engine.addLog("🔥 " + next.streak + "-week streak", "You hit " + next.streak + " weekly targets in a row. Bonus: " + bonus.text + ".", "mentor");
          streakNote = ["🔥", next.streak + "-week streak! Bonus " + bonus.text + ".", 1];
        } else streakNote = ["🔥", next.streak + "-week target streak. Keep it going.", 1];
      } else if (before.streak > 0) {
        streakNote = ["🧊", "Streak lost at " + before.streak + ". You missed last week's target.", -1];
        next.streak = 0;
      }
      dealInbox(next, next.pendingEvent ? 1 : 2);
      engine.recalculate();
      setS({ ...next });
      buzz(12);
      if (next.gameOver || next.victory) return;
      const rep = buildReport(before, next);
      if (ignored) addNote(rep, ["📭", (ignored === 1 ? "1 message went unanswered." : ignored + " messages went unanswered.") + (has(next, "delegator") ? " Delegator: no harm done." : ""), -1]);
      if (streakNote) addNote(rep, streakNote);
      setReport(rep);
      setTab("hq");
    };

    const chooseMail = (card, side) => {
      const s = engine.state;
      s.inbox = s.inbox.filter((m) => m.id !== card.id);
      const next = applyEffects(engine, card.title, card[side].label, fx(card[side], s), card[side].log);
      setS({ ...next });
      buzz(12);
      notify(card[side].log, "info");
      if (!next.inbox.length) setInboxOpen(false);
    };
    const pickPerk = (p) => {
      const s = engine.state;
      p.apply && p.apply(s);
      s.perks.push(p.id);
      s.level += 1;
      s.perkChoice = null;
      engine.addLog("⭐ Level " + s.level + ": " + p.name, p.desc, "mentor");
      setS({ ...engine.recalculate() });
      buzz(20);
      notify(p.icon + " " + p.name + " unlocked", "ok");
    };
    const roundName = ROUND_NAMES[S.stage] || "Growth";
    const pitchDone = (title, effects, log) => {
      const s = engine.state;
      s.slotUsed = true;
      s.lastPitchWeek = s.week;
      setS({ ...applyEffects(engine, title, "Pitch", effects, log) });
    };
    const signRound = (inv, sheet, negotiated) => {
      const s = engine.state;
      s.equity = s.equity * (1 - sheet.pct);
      s.valuation = Math.max(s.valuation, sheet.post);
      s.rounds.push({ week: s.week, stage: s.stage, name: roundName, amount: sheet.amount, pct: sheet.pct, investor: inv.name });
      pitchDone(
        "💼 Closed a " + roundName + " round",
        { cash: sheet.amount, investorTrust: 10, founderExp: 120 },
        inv.name + " invested " + money(sheet.amount) + " for " + Math.round(sheet.pct * 100) + "%" + (negotiated ? " after you pushed for more" : "") + ". You now own " + s.equity.toFixed(1) + "%.",
      );
    };

    // ---------- pieces ----------
    const meter = (label, value, pct, color, fogMe) =>
      jsxs(View, {
        style: st.hudCell,
        children: [
          jsx(Text, { style: st.hudLabel, numberOfLines: 1, children: label }),
          jsx(Text, { style: [st.hudValue, { color: color }, fogMe && { opacity: fogOp }], numberOfLines: 1, children: value }),
          jsx(View, {
            style: st.hudTrack,
            children: jsx(View, { style: [st.hudFill, { width: Math.max(2, Math.min(100, pct)) + "%", backgroundColor: color }, fogMe && { opacity: fogOp }] }),
          }),
        ],
      });

    const hud = jsxs(View, {
      style: st.hud,
      children: [
        meter("CASH", ft(compact(S.cash), "cash"), (S.cash / Math.max(1, S.sector.initial_cash)) * 100, S.cash < 4 * S.weeklyBurn ? COLOR.crit : COLOR.vital, true),
        meter("RUNWAY", ft(runwayLabel + "mo", "runway"), (Math.min(runway, 12) / 12) * 100, runwayColor, true),
        meter("CLARITY", Math.round(S.mentalClarity) + "%", S.mentalClarity, clarityColor, false),
        meter("MORALE", Math.round(S.teamMorale) + "%", S.teamMorale, moraleColor, false),
        fogged && jsx(View, { pointerEvents: "none", dataSet: { ff: "fog" }, style: [st.fogLayer, { opacity: 0.35 + 0.6 * fogAmt }] }),
      ],
    });

    const lvlFrom = xpForLevel(S.level),
      lvlTo = xpForLevel(S.level + 1);
    const levelRow = jsxs(View, {
      style: st.levelRow,
      children: [
        jsxs(View, {
          style: st.rowBetween,
          children: [
            jsx(Text, { style: st.kicker, children: "FOUNDER LEVEL " + S.level }),
            jsx(Text, { style: [st.kicker, { color: COLOR.gold }], children: S.founderExp + " / " + lvlTo + " XP" }),
          ],
        }),
        jsx(View, { style: st.levelTrack, children: jsx(View, { style: [st.levelFill, { width: clamp(((S.founderExp - lvlFrom) / Math.max(1, lvlTo - lvlFrom)) * 100, 2, 100) + "%" }] }) }),
        jsx(Text, {
          style: st.levelPerks,
          children: (S.perks || []).length ? "Perks: " + S.perks.map((id) => { const p = PERKS.find((x) => x.id === id); return p ? p.icon + " " + p.name : ""; }).join("  ·  ") : "Level up to unlock a perk.",
        }),
      ],
    });

    // ---------- BitLife-style home ----------
    const mood = S.mentalClarity >= 70 ? "😎" : S.mentalClarity >= 50 ? "🙂" : S.mentalClarity >= 40 ? "😐" : S.mentalClarity >= 20 ? "😵‍💫" : "🥴";
    const barColor = (v) => (v >= 60 ? "#34C759" : v >= 30 ? "#FFB020" : "#FF453A");

    const header = jsxs(View, {
      style: st.header,
      children: [
        jsxs(View, {
          style: st.avatarWrap,
          children: [
            jsx(Pic, { e: S.avatar || "avatar_m1", size: 58 }),
            jsx(View, { style: st.moodBadge, children: jsx(Pic, { e: mood, size: 24 }) }),
          ],
        }),
        jsxs(View, {
          style: { flex: 1, minWidth: 0 },
          children: [
            jsx(Text, { style: st.hName, numberOfLines: 1, children: S.founderName }),
            jsx(Text, { style: st.hSub, numberOfLines: 1, children: "Founder · " + S.companyName }),
            jsxs(View, {
              style: st.hChips,
              children: [
                jsx(View, { style: st.stagePill, children: jsx(Text, { style: st.stagePillTxt, children: stageName }) }),
                jsx(View, { style: st.expPill, children: jsx(Text, { style: st.expPillTxt, children: "Lv " + S.level }) }),
                jsx(Touchable, { style: st.langBtn, onPress: switchLanguage, children: jsx(Text, { style: st.langBtnTxt, children: IS_AR ? "EN" : "عربي" }) }),
              ],
            }),
          ],
        }),
        jsxs(View, {
          style: st.bank,
          children: [
            jsx(Text, { style: st.bankLabel, children: "BANK" }),
            jsx(Text, { style: [st.bankValue, { color: S.cash < 4 * S.weeklyBurn ? "#FF453A" : "#1F9D55", opacity: fogOp }], numberOfLines: 1, children: ft(compact(S.cash), "cash") }),
            jsx(View, { style: st.weekPill, children: jsx(Text, { style: st.weekPillTxt, children: "Week " + S.week }) }),
          ],
        }),
        fogged && jsx(View, { pointerEvents: "none", dataSet: { ff: "fog" }, style: [st.fogLayer, { opacity: 0.35 + 0.6 * fogAmt, left: "62%" }] }),
      ],
    });

    // tappable "this week" tiles
    const tile = (key, icon, label, sub, color, onPress, badge, done) =>
      jsxs(
        Touchable,
        {
          style: [st.tile, { backgroundColor: color }, done && { opacity: 0.55 }],
          activeOpacity: 0.85,
          onPress: onPress,
          children: [
            jsx(Pic, { e: icon, size: 40 }),
            jsx(Text, { style: st.tileLabel, numberOfLines: 1, children: label }),
            jsx(Text, { style: st.tileSub, numberOfLines: 1, children: sub }),
            badge ? jsx(View, { style: st.tileBadge, children: jsx(Text, { style: st.tileBadgeTxt, children: String(badge) }) }) : null,
          ],
        },
        key,
      );
    const inboxN = (S.inbox || []).length;
    const tiles = jsx(ScrollView, {
      horizontal: !0,
      showsHorizontalScrollIndicator: !1,
      contentContainerStyle: st.tiles,
      children: [
        guide && tile("t", targetDone ? "✅" : "🎯", targetDone ? "Target done" : "Weekly target", targetDone ? "+" + (S.streak || 0) + " streak" : "+" + (target.reward_exp || 50) + " XP", "#FFE8E1", () => setGuideOpen(true), S.streak ? "🔥" + S.streak : null, targetDone),
        tile("i", "📨", "Inbox", inboxN ? inboxN + " new" : "All clear", "#FFF4D6", () => inboxN && setInboxOpen(true), inboxN || null, !inboxN),
        tile("a", fogged && !S.slotUsed ? "🧘" : "⚡", fogged && !S.slotUsed ? "Rest now" : "Your action", S.slotUsed ? "used" : "1 left", "#E3F7EA", () => setTab("actions"), null, S.slotUsed),
        tile("p", "💼", "Fundraise", raisedThisStage(S) ? "Raised ✓" : canPitch(S) ? roundName : S.week < 3 ? "Week 3+" : "Not now", "#E5EEFF", () => (canPitch(S) ? setPitchOpen(true) : notify(raisedThisStage(S) ? "Next round opens at the next milestone." : S.slotUsed ? "Pitching needs this week's action." : S.week < 3 ? "Investors take meetings from week 3." : "Investors will take a meeting in " + pitchCooldown(S) + " wk.", "info")), null, !canPitch(S)),
        tile("c", "🤝", "Circle", weakTie ? "Needs you" : "All good", "#F1E8FF", () => setTab("circle"), weakTie ? "!" : null, false),
      ],
    });

    // the life log, oldest first, grouped by week (BitLife's "age" feed)
    const isRoutine = (x) => leadEmoji(x.title)[0] === "📊" && /\d/.test(x.title);
    const lastWeeks = S.journalLog.filter((x) => x.week > S.week - 8 && !isRoutine(x)).slice().reverse();
    const feedRows = [];
    let lastW = null;
    lastWeeks.forEach((x, idx) => {
      if (x.week !== lastW) {
        for (let w = (lastW == null ? x.week : lastW + 1); w < x.week; w++)
          feedRows.push(jsx(View, { style: st.weekHead, children: jsx(Text, { style: st.weekHeadTxt, children: "Week " + w + "  ·  a quiet week" }) }, "q" + w));
        lastW = x.week;
        feedRows.push(jsx(View, { style: st.weekHead, children: jsx(Text, { style: st.weekHeadTxt, children: "Week " + x.week }) }, "w" + x.week + "_" + idx));
      }
      const [icon, title] = leadEmoji(x.title);
      feedRows.push(
        jsxs(
          View,
          {
            style: st.logRow,
            children: [
              jsx(View, { style: [st.logIcon, x.type === "negative" && { backgroundColor: "#FFE7E5" }], children: jsx(Pic, { e: icon || (x.type === "negative" ? "⚠️" : "📝"), size: 26 }) }),
              jsxs(View, {
                style: { flex: 1, minWidth: 0 },
                children: [
                  jsx(Text, { style: [st.logTitle, x.type === "negative" && { color: "#D93A30" }], children: title }),
                  jsx(Text, { style: st.logText, numberOfLines: 3, children: x.text }),
                ],
              }),
            ],
          },
          "e" + idx,
        ),
      );
    });


    const hq = jsxs(View, {
      style: { flex: 1 },
      children: [
        jsx(View, { children: tiles }),
        fogged &&
          jsxs(Touchable, {
            style: st.fogBanner,
            onPress: () => setTab("actions"),
            children: [jsx(Pic, { e: "🌫️", size: 28 }), jsx(Text, { style: st.fogBannerTxt, children: Fog.fogNotice(S.mentalClarity) }), jsx(Text, { style: st.fogBannerCta, children: "Rest ▸" })],
          }),
        jsx(ScrollView, { ref: feedRef, style: st.feed, contentContainerStyle: st.feedInner, showsVerticalScrollIndicator: !1, children: feedRows }),
      ],
    });

    // BitLife-style stat bars
    const statBar = (icon, label, pct, valueText, fogMe) =>
      jsxs(
        View,
        {
          style: st.statRow,
          children: [
            jsx(Pic, { e: icon, size: 22 }),
            jsx(Text, { style: st.statLabel, numberOfLines: 1, children: label }),
            jsxs(View, {
              style: st.statTrack,
              children: [
                jsx(View, { style: [st.statFill, { width: Math.max(4, Math.min(100, pct)) + "%", backgroundColor: barColor(pct) }, fogMe && { opacity: fogOp }] }),
                jsx(Text, { style: [st.statPct, fogMe && { opacity: fogOp }], children: valueText }),
              ],
            }),
          ],
        },
        label,
      );
    const statsPanel = jsxs(View, {
      style: st.statsPanel,
      children: [
        statBar("🧠", "Clarity", S.mentalClarity, Math.round(S.mentalClarity) + "%"),
        statBar("🤝", "Morale", S.teamMorale, Math.round(S.teamMorale) + "%"),
        statBar("⏳", "Runway", (Math.min(runway, 12) / 12) * 100, ft(runwayLabel + " mo", "runway"), true),
        statBar("💼", "Trust", S.investorTrust == null ? 80 : S.investorTrust, Math.round(S.investorTrust == null ? 80 : S.investorTrust) + "%"),
        fogged && jsx(View, { pointerEvents: "none", dataSet: { ff: "fog" }, style: [st.fogLayer, { opacity: 0.2 + 0.4 * fogAmt }] }),
      ],
    });

    // company overview (milestone, level, equity, rounds) above the original assets screen
    const company = jsxs(View, {
      style: { flex: 1 },
      children: [
        jsxs(View, {
          style: st.companyCard,
          children: [
            nextStage
              ? jsxs(View, {
                  children: [
                    jsxs(View, {
                      style: st.rowBetween,
                      children: [
                        jsx(Text, { style: st.kicker, children: "NEXT MILESTONE" }),
                        jsx(Text, { style: [st.kicker, { color: COLOR.gold }], children: stageName + " → " + (STAGE_NAMES[nextStage.stage] || "Stage " + nextStage.stage) }),
                      ],
                    }),
                    jsx(Text, { style: st.cardTitle, children: "Reach " + money(nextStage.mrr) + " MRR" }),
                    jsx(View, { style: st.goalTrack, children: jsx(View, { style: [st.goalFill, { width: Math.max(2, Math.min(100, (S.monthlyRevenue / nextStage.mrr) * 100)) + "%" }] }) }),
                    jsx(Text, { style: st.cardSub, children: ft(money(S.monthlyRevenue), "mrr2") + " of " + money(nextStage.mrr) + " · valuation re-rates to " + compact(nextStage.valuation) }),
                  ],
                })
              : null,
            levelRow,
            jsx(Text, { style: st.levelPerks, children: "you own " + ltr((S.equity == null ? 100 : S.equity).toFixed(S.equity < 100 ? 1 : 0) + "%") + " · valuation " + compact(S.valuation) }),
          ],
        }),
        jsx(View, { style: { flex: 1 }, children: jsx(Assets.AssetsScreen, { gameState: S }) }),
      ],
    });

    let content;
    if (tab === "hq") content = hq;
    else if (tab === "journal") content = jsx(Journal.JournalScreen, { journalLog: S.journalLog, gameState: S });
    else if (tab === "assets") content = company;
    else if (tab === "circle")
      content = jsx(Circle.RelationshipsScreen, { gameState: S, onContact: (id) => act(engine.contactRelationship(id), "Reached out. Relationship +11.") });
    else if (tab === "team")
      content = jsx(Team.DepartmentsScreen, {
        gameState: S,
        onHire: (id) => act(engine.hireCandidate(id), "Welcome to the team."),
        onFire: (id) => act(engine.fireEmployee(id), "Let go. Morale −10%."),
        onRefreshCandidates: () => act(engine.refreshCandidatePool(), "3 new candidates sourced."),
        onRunDeptAction: (id) => act(engine.executeDepartmentAction("dept", id), "Done. Logged in your journal."),
      });
    else if (tab === "actions")
      content = jsx(Actions.ActivitiesScreen, {
        gameState: S,
        onSelectActivity: (activity) => {
          if (act(engine.executeActivity(activity), (activity.name_en || activity.name) + " ✓")) setTab("hq");
        },
      });

    // ---------- modals ----------
    const reportModal =
      report &&
      jsx(Modal, {
        visible: !0,
        transparent: !0,
        animationType: "fade",
        onRequestClose: () => setReport(null),
        children: jsx(Touchable, {
          activeOpacity: 1,
          style: st.sheetOverlay,
          onPress: () => setReport(null),
          children: jsxs(Touchable, {
            activeOpacity: 1,
            onPress: () => {},
            style: st.sheet,
            dataSet: { ff: "pop" },
            children: [
              jsx(Text, { style: [st.kicker, { color: COLOR.act }], children: "WEEKLY REPORT" }),
              jsx(Text, { style: st.sheetTitle, children: "Week " + report.week + " wrapped" }),
              jsx(View, {
                style: st.reportRows,
                children: report.rows.map((row, idx) => {
                  const zero = Math.round(row.delta) === 0;
                  const good = row.delta > 0;
                  return jsxs(
                    View,
                    {
                      style: st.reportRow,
                      dataSet: { ff: "rise" + (idx + 1) },
                      children: [
                        jsx(Text, { style: st.reportLabel, children: row.label }),
                        jsx(Text, { style: [st.reportValue, row.fogged && { opacity: fogOp }], children: row.fogged ? ft(row.value, "r" + idx) : row.value }),
                        jsx(View, {
                          style: [st.deltaPill, zero ? st.chipNeutral : good ? st.chipGood : st.chipBad],
                          children: jsx(Text, {
                            style: [st.deltaTxt, { color: zero ? COLOR.text3 : good ? COLOR.vital : COLOR.crit }, row.fogged && { opacity: fogOp }],
                            children: zero ? "—" : row.fogged ? ft(row.fmt(row.delta), "d" + idx) : row.fmt(row.delta),
                          }),
                        }),
                      ],
                    },
                    row.label,
                  );
                }),
              }),
              report.notes.length > 0 &&
                jsx(View, {
                  style: st.notes,
                  children: report.notes.map(([icon, text, tone], idx) =>
                    jsxs(
                      View,
                      {
                        style: [st.note, tone === -1 && st.noteBad, tone === 1 && st.noteGood],
                        children: [jsx(Pic, { e: icon, size: 24 }), jsx(Text, { style: st.noteTxt, children: text })],
                      },
                      idx,
                    ),
                  ),
                }),
              report.quest && jsx(Text, { style: st.reportQuest, children: "Next up: " + report.quest }),
              jsx(Touchable, {
                style: st.primaryBtn,
                onPress: () => setReport(null),
                activeOpacity: 0.85,
                children: jsx(Text, { style: st.primaryTxt, children: S.pendingEvent ? "Face the decision ▸" : "Start week " + report.nextWeek + " ▸" }),
              }),
            ],
          }),
        }),
      });

    const dilemmaModal =
      S.pendingEvent &&
      !report &&
      jsx(Modal, {
        visible: !0,
        transparent: !0,
        animationType: "fade",
        children: jsx(View, {
          style: st.centerOverlay,
          children: jsx(View, {
            style: st.dilemma,
            dataSet: { ff: "pop" },
            children: jsx(ScrollView, {
              showsVerticalScrollIndicator: !1,
              children: [
                jsxs(
                  View,
                  {
                    style: st.rowBetween,
                    children: [
                      jsx(Text, { style: [st.kicker, { color: COLOR.fog }], children: "⚖️ DILEMMA · WEEK " + S.week }),
                      jsx(Text, { style: st.kicker, children: String(S.pendingEvent.category || "").toUpperCase() }),
                    ],
                  },
                  "k",
                ),
                jsx(View, { style: st.dilemmaPic, dataSet: { ff: "float" }, children: jsx(Pic, { e: S.pendingEvent.icon || "⚖️", size: 84 }) }, "pic"),
                jsx(Text, { style: st.dilemmaTitle, children: S.pendingEvent.title }, "t"),
                jsx(Text, { style: st.dilemmaDesc, children: S.pendingEvent.description }, "d"),
                ["option_A", "option_B"].map((key, idx) =>
                  jsxs(
                    Touchable,
                    {
                      style: st.option,
                      activeOpacity: 0.85,
                      dataSet: { ff: "rise" + (idx + 2) },
                      onPress: () => {
                        const next = engine.resolveEventChoice(key);
                        setS({ ...next });
                        buzz(14);
                        if (!next.gameOver && !next.victory) notify("Decision made. It's in your journal.", "info");
                      },
                      children: [
                        jsxs(View, {
                          style: st.optionTop,
                          children: [
                            jsx(View, { style: st.optionKey, children: jsx(Text, { style: st.optionKeyTxt, children: idx ? "B" : "A" }) }),
                            jsx(Text, { style: st.optionTitle, children: S.pendingEvent[key].title }),
                          ],
                        }),
                        jsx(Chips, { items: previewChips(S.pendingEvent[key].preview), style: { marginTop: 10 } }),
                      ],
                    },
                    key,
                  ),
                ),
                jsx(Text, { style: st.noRight, children: "THERE IS NO RIGHT OPTION" }, "n"),
              ],
            }),
          }),
        }),
      });

    const guideModal =
      guideOpen &&
      guide &&
      jsx(Modal, {
        visible: !0,
        transparent: !0,
        animationType: "slide",
        onRequestClose: () => setGuideOpen(false),
        children: jsx(View, {
          style: st.sheetOverlay,
          children: jsxs(View, {
            style: [st.sheet, { maxHeight: "90%" }],
            children: [
              jsxs(View, {
                style: st.sheetHeader,
                children: [
                  jsxs(View, {
                    style: { flex: 1 },
                    children: [
                      jsx(Text, { style: [st.kicker, { color: COLOR.accent }], children: "🎯 WEEK " + S.week + " TARGET" }),
                      jsx(Text, { style: st.sheetTitle, numberOfLines: 2, children: questTitle(target.title) }),
                    ],
                  }),
                  jsx(Touchable, { style: st.closeBtn, onPress: () => setGuideOpen(false), children: jsx(Text, { style: st.closeTxt, children: "✕" }) }),
                ],
              }),
              jsxs(ScrollView, {
                showsVerticalScrollIndicator: !1,
                style: { flexGrow: 0 },
                children: [
                  jsxs(View, {
                    style: st.why,
                    children: [jsx(Text, { style: [st.kicker, { color: COLOR.fog }], children: "WHY IT MATTERS" }), jsx(Text, { style: st.whyTxt, children: guide.whyItMatters })],
                  }),
                  jsx(Text, { style: st.pickTitle, children: targetDone ? "Already done this week" : "Pick one. You only get one shot per week." }),
                  guide.strategies.map((s, idx) => {
                    const tooPoor = S.cash < s.cost;
                    const disabled = targetDone || tooPoor;
                    return jsxs(
                      View,
                      {
                        style: [st.strat, disabled && { opacity: 0.6 }],
                        dataSet: { ff: "rise" + (idx + 1) },
                        children: [
                          jsxs(View, {
                            style: st.rowBetween,
                            children: [
                              jsx(View, {
                                style: [st.stratBadge, { backgroundColor: s.badgeBg }],
                                children: jsx(Text, { style: [st.stratBadgeTxt, { color: s.badgeColor }], children: s.badge }),
                              }),
                              jsx(Text, { style: [st.stratCost, tooPoor && { color: COLOR.crit }], children: s.costLabel }),
                            ],
                          }),
                          jsx(Text, { style: st.stratTitle, children: String(s.title || "").replace(/^\d+\.\s*/, "") }),
                          jsx(Text, { style: st.stratDesc, children: s.desc }),
                          jsx(Chips, { items: effectChips(s.effects), style: { marginBottom: 12 } }),
                          jsx(Touchable, {
                            style: [st.stratBtn, disabled && st.stratBtnOff],
                            disabled: disabled,
                            activeOpacity: 0.85,
                            onPress: () => {
                              const res = engine.executeTargetStrategy(s.id);
                              if (act(res, "🎯 Target hit · +" + (target.reward_exp || 50) + " EXP")) setGuideOpen(false);
                            },
                            children: jsx(Text, {
                              style: [st.stratBtnTxt, disabled && { color: COLOR.text3 }],
                              children: targetDone ? "Target already done" : tooPoor ? "Not enough cash" : "Go with this ▸",
                            }),
                          }),
                        ],
                      },
                      s.id,
                    );
                  }),
                ],
              }),
            ],
          }),
        }),
      });

    // ---------- shell ----------
    return jsxs(Screen, {
      style: st.container,
      children: [
        jsx(StatusBar, { barStyle: "dark-content" }),
        header,
        tab !== "hq" &&
          jsxs(Touchable, {
            style: st.backBar,
            onPress: () => setTab("hq"),
            children: [jsx(Text, { style: st.backTxt, children: "‹  Home" }), jsx(Text, { style: st.backTitle, children: (TABS.find((t) => t.key === tab) || {}).label || "" })],
          }),
        tab !== "hq" && tab !== "assets" && hud,
        jsx(View, { style: st.content, children: content }),
        tab === "hq" && statsPanel,
        jsx(View, {
          style: st.nav,
          children: TABS.map((t) => {
            if (t.key === "advance")
              return jsxs(
                View,
                {
                  style: st.navCenter,
                  children: [
                    jsxs(Touchable, {
                      style: st.ageBtn,
                      onPress: advance,
                      activeOpacity: 0.85,
                      dataSet: allDone && !inboxN ? { ff: "pulse" } : undefined,
                      children: [jsx(Text, { style: st.agePlus, children: "+" }), jsx(Text, { style: st.ageTxt, children: "1 Week" })],
                    }),
                    jsx(Text, {
                      style: [st.ageHint, { color: allDone && !inboxN ? COLOR.vital : COLOR.text3 }],
                      numberOfLines: 1,
                      children: allDone && !inboxN ? "Ready" : [inboxN ? inboxN + " unread" : null, !targetDone && guide ? "target open" : null, !S.slotUsed ? "action unused" : null].filter(Boolean)[0] || "",
                    }),
                  ],
                },
                "adv",
              );
            const on = tab === t.key;
            const dot = (t.key === "actions" && !S.slotUsed) || (t.key === "circle" && weakTie);
            return jsxs(
              Touchable,
              {
                style: st.navItem,
                onPress: () => setTab(on ? "hq" : t.key),
                activeOpacity: 0.7,
                children: [
                  jsxs(View, {
                    style: [st.navIconWrap, on && st.navIconOn],
                    children: [jsx(Pic, { e: t.icon, size: 30 }), dot && jsx(View, { style: st.navDot })],
                  }),
                  jsx(Text, { style: [st.navLabel, on && st.navLabelOn], children: t.label }),
                ],
              },
              t.key,
            );
          }),
        }),
        fogged && jsx(View, { pointerEvents: "none", dataSet: { ff: "vignette" }, style: [st.vignette, { opacity: 0.4 + 0.6 * fogAmt }] }),
        toast &&
          jsx(
            View,
            {
              pointerEvents: "none",
              style: st.toastWrap,
              children: jsx(View, {
                dataSet: { ff: "toast" },
                style: [st.toast, { borderLeftColor: toast.kind === "bad" ? COLOR.crit : toast.kind === "warn" ? COLOR.fog : toast.kind === "ok" ? COLOR.vital : COLOR.act }],
                children: jsx(Text, { style: st.toastTxt, children: toast.text }),
              }),
            },
            toast.id,
          ),
        reportModal,
        dilemmaModal,
        guideModal,
        S.perkChoice && !report && !S.pendingEvent && jsx(PerkModal, { S: S, onPick: pickPerk }),
        inboxOpen && !report && !S.pendingEvent && !S.perkChoice && jsx(InboxModal, { S: S, onChoose: chooseMail, onClose: () => setInboxOpen(false) }),
        pitchOpen &&
          jsx(PitchModal, {
            S: S,
            onClose: () => setPitchOpen(false),
            onSign: signRound,
            onFail: () => pitchDone("💼 Pitch went nowhere", { investorTrust: -8, mentalClarity: -5 }, "They passed. “Come back when the numbers say it for you.”"),
            onWalk: () => pitchDone("💼 Investor walked", { investorTrust: -5, mentalClarity: -3 }, "You pushed for more and they walked."),
          }),
      ],
    });
  }

  const card = { backgroundColor: COLOR.panel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLOR.line };
  const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLOR.ink },
    content: { flex: 1 },
    kicker: { fontFamily: "AzeretMono_500Medium", fontSize: 10, letterSpacing: 1, color: COLOR.text3 },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    link: { fontFamily: "Archivo_600SemiBold", fontSize: 12.5, color: COLOR.act },

    // top bar + HUD
    topBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: COLOR.ink },
    company: { fontFamily: "Archivo_600SemiBold", fontSize: 18, letterSpacing: -0.4, color: COLOR.text },
    weekLine: { fontFamily: "Archivo_500Medium", fontSize: 12, color: COLOR.text3, marginTop: 2 },
    stagePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#E3EEFF", borderWidth: 1, borderColor: "#B9D2FB" },
    stagePillTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 10.5, color: COLOR.act },
    langBtn: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, minHeight: 28, justifyContent: "center", backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.lineHot },
    langBtnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 12, color: COLOR.text },
    expPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#FFF6D6", borderWidth: 1, borderColor: "#F1D27A" },
    expPillTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 10.5, color: COLOR.gold },
    hud: { flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingBottom: 10, overflow: "hidden" },
    hudCell: { flex: 1, minWidth: 0, backgroundColor: COLOR.panel, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 8, borderWidth: 1, borderColor: COLOR.line },
    hudLabel: { fontFamily: "AzeretMono_500Medium", fontSize: 8.5, letterSpacing: 0.8, color: COLOR.text3 },
    hudValue: { fontFamily: "AzeretMono_600SemiBold", fontSize: 14, letterSpacing: -0.4, marginTop: 3, marginBottom: 5 },
    hudTrack: { height: 3, borderRadius: 2, backgroundColor: COLOR.ink, overflow: "hidden" },
    hudFill: { height: "100%", borderRadius: 2 },
    fogLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },

    // HQ
    hqContent: { padding: 12, paddingBottom: 20, gap: 12, width: "100%", maxWidth: 600, alignSelf: "center" },
    hero: { ...card, padding: 18, overflow: "hidden", borderColor: COLOR.lineHot },
    heroTop: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
    heroBig: { fontFamily: "AzeretMono_600SemiBold", fontSize: 40, letterSpacing: -2, marginTop: 2 },
    heroUnit: { fontFamily: "Archivo_500Medium", fontSize: 14, letterSpacing: 0, color: COLOR.text2 },
    heroEquity: { fontFamily: "AzeretMono_500Medium", fontSize: 10.5, color: COLOR.gold, marginTop: 4, textAlign: "right" },
    heroCash: { fontFamily: "AzeretMono_600SemiBold", fontSize: 20, letterSpacing: -0.6, color: COLOR.text, marginTop: 4 },
    pips: { flexDirection: "row", gap: 4, marginTop: 14 },
    pip: { flex: 1, height: 8, borderRadius: 3, backgroundColor: COLOR.panel2 },
    heroRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    heroStat: { flex: 1, minWidth: 0, backgroundColor: COLOR.panel2, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10 },
    heroStatV: { fontFamily: "AzeretMono_600SemiBold", fontSize: 14, letterSpacing: -0.4 },
    heroStatL: { fontFamily: "Archivo_500Medium", fontSize: 10.5, color: COLOR.text3, marginTop: 2 },
    vitals: { flexDirection: "row", gap: 8, marginTop: 8 },
    vital: { flex: 1, backgroundColor: COLOR.panel2, borderRadius: 12, padding: 10 },
    vitalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    vitalLabel: { fontFamily: "Archivo_600SemiBold", fontSize: 12, color: COLOR.text2 },
    vitalValue: { fontFamily: "AzeretMono_600SemiBold", fontSize: 15, letterSpacing: -0.4 },
    vitalTrack: { height: 6, borderRadius: 3, backgroundColor: COLOR.ink, marginTop: 8, overflow: "hidden" },
    vitalFill: { height: "100%", borderRadius: 3 },
    vitalSub: { fontFamily: "Archivo_500Medium", fontSize: 10.5, color: COLOR.text3, marginTop: 6 },
    fogBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF1DB", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#F3C77A" },
    fogBannerTxt: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 13, lineHeight: 18, color: "#8A5A00" },
    fogBannerCta: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: COLOR.fog },
    card: card,
    cardTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 17, letterSpacing: -0.3, color: COLOR.text, marginTop: 8 },
    cardSub: { fontFamily: "Archivo_400Regular", fontSize: 13, lineHeight: 19, color: COLOR.text2, marginTop: 6 },
    levelRow: { borderTopWidth: 1, borderTopColor: COLOR.line, marginTop: 14, paddingTop: 12 },
    levelTrack: { height: 6, borderRadius: 3, backgroundColor: COLOR.panel2, marginTop: 8, overflow: "hidden" },
    levelFill: { height: "100%", borderRadius: 3, backgroundColor: "#a77bf3" },
    levelPerks: { fontFamily: "Archivo_500Medium", fontSize: 12, color: COLOR.text2, marginTop: 8 },
    pitchBtn: { marginTop: 8, borderRadius: 12, padding: 12, backgroundColor: "#E8F0FF", borderWidth: 1, borderColor: "#B9D2FB" },
    pitchBtnOff: { backgroundColor: COLOR.panel2, borderColor: COLOR.line },
    pitchTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13.5, color: COLOR.text },
    pitchSub: { fontFamily: "Archivo_400Regular", fontSize: 11.5, color: COLOR.text3, marginTop: 3 },
    inboxCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF8E8", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EBD9A8" },
    inboxIcon: { fontSize: 26 },
    inboxTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: "#3B2F1A", marginTop: 4 },
    inboxArrow: { color: "#8A6D3B", fontSize: 20 },
    goalTrack: { height: 10, borderRadius: 5, backgroundColor: COLOR.panel2, marginTop: 12, overflow: "hidden" },
    goalFill: { height: "100%", borderRadius: 5, backgroundColor: COLOR.gold },
    quest: { borderColor: "#FFC9B8", backgroundColor: "#FFF4EF" },
    questDone: { borderColor: "#A8E0BE", backgroundColor: "#EFFAF3" },
    questTasks: { fontFamily: "Archivo_400Regular", fontSize: 13, lineHeight: 20, color: COLOR.text2, marginTop: 6, marginBottom: 12 },
    questBtn: { backgroundColor: COLOR.accent, borderRadius: 12, minHeight: 46, alignItems: "center", justifyContent: "center" },
    questBtnDone: { backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.line },
    questBtnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: "#fff" },
    token: { flexDirection: "row", alignItems: "center", gap: 6 },
    tokenDot: { width: 9, height: 9, borderRadius: 5 },
    tokenTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 11 },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    actionBtn: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.line, alignItems: "center", justifyContent: "center" },
    actionBtnHot: { borderColor: COLOR.fog, backgroundColor: "#FFF1DB" },
    actionBtnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13.5, color: COLOR.text },
    logItem: { flexDirection: "row", gap: 10, paddingVertical: 10, alignItems: "flex-start" },
    logDivider: { borderTopWidth: 1, borderTopColor: COLOR.line },
    logBar: { width: 3, alignSelf: "stretch", borderRadius: 2 },
    logTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: COLOR.text },
    logText: { fontFamily: "Archivo_400Regular", fontSize: 12, lineHeight: 17, color: COLOR.text2, marginTop: 2 },
    logWeek: { fontFamily: "AzeretMono_500Medium", fontSize: 10, color: COLOR.text3 },
    companyLink: { borderTopWidth: 1, borderTopColor: COLOR.line, paddingTop: 12, marginTop: 4 },

    // end bar + nav
    endBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLOR.panel, borderTopWidth: 1, borderTopColor: COLOR.line },
    endHint: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 12 },
    endBtn: { backgroundColor: COLOR.accent, borderRadius: 14, minHeight: 48, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
    endBtnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: "#fff" },
    nav: { flexDirection: "row", backgroundColor: COLOR.panel, paddingBottom: 6, paddingTop: 4 },
    navItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 52 },
    navIconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    navIconOn: { backgroundColor: "#E3EEFF" },
    navIcon: { fontSize: 17 },
    navDot: { position: "absolute", top: 3, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR.accent, borderWidth: 1.5, borderColor: COLOR.panel },
    navLabel: { fontFamily: "Archivo_500Medium", fontSize: 10.5, color: COLOR.text3, marginTop: 2 },
    navLabelOn: { color: COLOR.text },
    vignette: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },

    // chips
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
    chipGood: { backgroundColor: "#E2F6EA", borderColor: "#A8E0BE" },
    chipBad: { backgroundColor: "#FDE7E7", borderColor: "#F6B8B8" },
    chipGold: { backgroundColor: "#FFF6D6", borderColor: "#F1D27A" },
    chipNeutral: { backgroundColor: COLOR.panel2, borderColor: COLOR.line },
    chipTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 11 },

    // toast
    toastWrap: { position: "absolute", left: 12, right: 12, bottom: 132, alignItems: "center", zIndex: 50 },
    toast: { maxWidth: 440, width: "100%", backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderLeftWidth: 4, shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    toastTxt: { fontFamily: "Archivo_500Medium", fontSize: 13, lineHeight: 18, color: COLOR.text },

    // sheets & modals
    sheetOverlay: { flex: 1, backgroundColor: "rgba(24,34,48,0.42)", justifyContent: "flex-end", cursor: "default" },
    sheet: {
      backgroundColor: COLOR.panel,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 26,
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      borderTopWidth: 1,
      borderColor: COLOR.lineHot,
      cursor: "default",
    },
    sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
    sheetTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 22, letterSpacing: -0.5, color: COLOR.text, marginTop: 4 },
    closeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLOR.panel2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLOR.line },
    closeTxt: { color: COLOR.text, fontSize: 15, fontFamily: "Archivo_600SemiBold" },
    reportRows: { marginTop: 16, gap: 8 },
    reportRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLOR.panel2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    reportLabel: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: COLOR.text2, width: 70 },
    reportValue: { flex: 1, fontFamily: "AzeretMono_600SemiBold", fontSize: 15, color: COLOR.text, letterSpacing: -0.3 },
    deltaPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, minWidth: 64, alignItems: "center" },
    deltaTxt: { fontFamily: "AzeretMono_600SemiBold", fontSize: 12 },
    notes: { marginTop: 12, gap: 6 },
    note: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: COLOR.panel2, borderRadius: 12, padding: 10 },
    noteBad: { backgroundColor: "#FDE7E7" },
    noteGood: { backgroundColor: "#E2F6EA" },
    noteIcon: { fontSize: 15, width: 20, textAlign: "center" },
    noteTxt: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 13, lineHeight: 18, color: COLOR.text },
    reportQuest: { fontFamily: "Archivo_500Medium", fontSize: 13, color: COLOR.text2, marginTop: 14, marginBottom: 2 },
    primaryBtn: { backgroundColor: COLOR.accent, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 14 },
    primaryTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 15.5, color: "#fff" },
    centerOverlay: { flex: 1, backgroundColor: "rgba(24,34,48,0.45)", justifyContent: "center", alignItems: "center", padding: 14 },
    dilemma: { backgroundColor: COLOR.panel, borderRadius: 22, padding: 18, width: "100%", maxWidth: 460, maxHeight: "92%", borderWidth: 1, borderColor: "#F3C77A", borderTopWidth: 3, borderTopColor: COLOR.fog },
    dilemmaPic: { alignSelf: "center", marginTop: 8 },
    dilemmaTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 22, letterSpacing: -0.5, color: COLOR.text, marginTop: 12 },
    dilemmaDesc: { fontFamily: "Archivo_400Regular", fontSize: 14.5, lineHeight: 22, color: COLOR.text2, marginTop: 8, marginBottom: 16 },
    option: { backgroundColor: COLOR.panel2, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLOR.line },
    optionTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    optionKey: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLOR.ink, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLOR.lineHot },
    optionKeyTxt: { fontFamily: "AzeretMono_600SemiBold", fontSize: 13, color: COLOR.text },
    optionTitle: { flex: 1, fontFamily: "Archivo_600SemiBold", fontSize: 15, color: COLOR.text },
    noRight: { fontFamily: "AzeretMono_500Medium", fontSize: 10, letterSpacing: 1.5, color: COLOR.text3, textAlign: "center", marginTop: 6 },
    why: { backgroundColor: COLOR.panel2, borderRadius: 14, padding: 12, marginBottom: 14 },
    whyTxt: { fontFamily: "Archivo_400Regular", fontSize: 13, lineHeight: 19, color: COLOR.text2, marginTop: 6 },
    pickTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: COLOR.text, marginBottom: 10 },
    strat: { backgroundColor: COLOR.panel2, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLOR.line },
    stratBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexShrink: 1 },
    stratBadgeTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 11 },
    stratCost: { fontFamily: "AzeretMono_600SemiBold", fontSize: 13, color: COLOR.text },
    stratTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 15.5, color: COLOR.text, marginTop: 10 },
    stratDesc: { fontFamily: "Archivo_400Regular", fontSize: 13, lineHeight: 19, color: COLOR.text2, marginTop: 4, marginBottom: 10 },
    stratBtn: { backgroundColor: COLOR.act, borderRadius: 12, minHeight: 44, alignItems: "center", justifyContent: "center" },
    stratBtnOff: { backgroundColor: COLOR.panel, borderWidth: 1, borderColor: COLOR.line },
    stratBtnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: "#fff" },

    // ---- BitLife-style home ----
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, backgroundColor: "#FFFFFF", borderBottomLeftRadius: 22, borderBottomRightRadius: 22, shadowColor: "#2B3A55", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, zIndex: 2, overflow: "hidden" },
    avatarWrap: { width: 66, height: 66, borderRadius: 33, backgroundColor: "#E9F0FF", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#2D7FF9", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    moodBadge: { position: "absolute", right: -6, bottom: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    hName: { fontFamily: "Archivo_600SemiBold", fontSize: 19, letterSpacing: -0.4, color: COLOR.text },
    hSub: { fontFamily: "Archivo_500Medium", fontSize: 12.5, color: COLOR.text2, marginTop: 1 },
    hChips: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
    bank: { alignItems: "flex-end", gap: 2 },
    bankLabel: { fontFamily: "AzeretMono_500Medium", fontSize: 9.5, letterSpacing: 1, color: COLOR.text3 },
    bankValue: { fontFamily: "AzeretMono_600SemiBold", fontSize: 20, letterSpacing: -0.6 },
    weekPill: { marginTop: 4, backgroundColor: "#2D7FF9", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    weekPillTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 11.5, color: "#FFFFFF" },
    stagePill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: "#E3EEFF" },
    stagePillTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 11, color: "#1F5FD1" },
    expPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: "#FFF2C7" },
    expPillTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 11, color: "#8A6400" },
    langBtn: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: "#F1F3F7" },
    langBtnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 11, color: COLOR.text2 },
    tiles: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
    tile: { width: 112, borderRadius: 20, padding: 12, gap: 4, shadowColor: "#2B3A55", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    tileLabel: { fontFamily: "Archivo_600SemiBold", fontSize: 13.5, color: COLOR.text, marginTop: 6 },
    tileSub: { fontFamily: "Archivo_500Medium", fontSize: 11.5, color: COLOR.text2 },
    tileBadge: { position: "absolute", top: 8, right: 8, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: "#FF453A", alignItems: "center", justifyContent: "center" },
    tileBadgeTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 11, color: "#FFFFFF" },
    fogBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 12, marginBottom: 8, backgroundColor: "#FFF1DB", borderRadius: 16, padding: 10, borderWidth: 1, borderColor: "#F3C77A" },
    feed: { flex: 1, marginHorizontal: 12, backgroundColor: "#FFFFFF", borderRadius: 22, shadowColor: "#2B3A55", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
    feedInner: { padding: 14, paddingBottom: 18 },
    weekHead: { alignSelf: "flex-start", marginTop: 10, marginBottom: 6, backgroundColor: "#E9F0FF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    weekHeadTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: "#1F5FD1" },
    logRow: { flexDirection: "row", gap: 10, paddingVertical: 7, alignItems: "flex-start" },
    logIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F2F5FA", alignItems: "center", justifyContent: "center" },
    logTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: COLOR.text },
    logText: { fontFamily: "Archivo_400Regular", fontSize: 13, lineHeight: 18.5, color: COLOR.text2, marginTop: 2 },
    statsPanel: { marginHorizontal: 12, marginTop: 10, backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, gap: 7, overflow: "hidden", shadowColor: "#2B3A55", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
    statRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    statLabel: { width: 64, fontFamily: "Archivo_600SemiBold", fontSize: 13, color: COLOR.text },
    statTrack: { flex: 1, height: 20, borderRadius: 10, backgroundColor: "#EEF1F6", overflow: "hidden", justifyContent: "center" },
    statFill: { position: "absolute", start: 0, top: 0, bottom: 0, borderRadius: 10 },
    statPct: { fontFamily: "AzeretMono_600SemiBold", fontSize: 11, color: "#1C2430", paddingHorizontal: 8, textAlign: "right" },
    companyCard: { margin: 12, marginBottom: 0, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLOR.line },
    backBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    backTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: "#2D7FF9" },
    backTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 16, color: COLOR.text },
    nav: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#FFFFFF", marginTop: 10, paddingTop: 6, paddingBottom: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#2B3A55", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
    navItem: { flex: 1, alignItems: "center", justifyContent: "flex-end", minHeight: 58 },
    navIconWrap: { width: 50, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    navIconOn: { backgroundColor: "#E9F0FF" },
    navLabel: { fontFamily: "Archivo_600SemiBold", fontSize: 11, color: COLOR.text3, marginTop: 2 },
    navLabelOn: { color: "#1F5FD1" },
    navCenter: { flex: 1.2, alignItems: "center" },
    ageBtn: { width: 76, height: 76, borderRadius: 38, marginTop: -30, backgroundColor: "#34C759", alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "#FFFFFF", shadowColor: "#1E8E3E", shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
    agePlus: { fontFamily: "Archivo_600SemiBold", fontSize: 30, lineHeight: 30, color: "#FFFFFF", marginTop: -2 },
    ageTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 11, color: "#FFFFFF", marginTop: -1 },
    ageHint: { fontFamily: "Archivo_500Medium", fontSize: 10.5, marginTop: 4, maxWidth: 96, textAlign: "center" },
    toast: { maxWidth: 440, width: "100%", backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, borderLeftWidth: 5, shadowColor: "#2B3A55", shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
    toastWrap: { position: "absolute", left: 12, right: 12, top: 96, alignItems: "center", zIndex: 50 },
  });
}
