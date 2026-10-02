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
    { key: "HQ", icon: "🏢", label: "HQ" },
    { key: "Journal", icon: "📓", label: "Journal" },
    { key: "Departments", icon: "👥", label: "Team" },
    { key: "Relationships", icon: "🤝", label: "Circle" },
    { key: "Activities", icon: "⚡", label: "Actions" },
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
  function restoreEngine(state) {
    const engine = new Engine.StartupEngine(state.founderName, state.companyName, state.sector && state.sector.id);
    engine.state = state;
    return engine;
  }

  function buzz(ms) {
    try {
      navigator.vibrate && navigator.vibrate(ms);
    } catch (err) {}
  }

  // ---------- formatting ----------
  const money = (v) => (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString();
  const compact = (v) => {
    const a = Math.abs(v),
      s = v < 0 ? "−$" : "$";
    if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    if (a >= 1e4) return s + Math.round(a / 1e3) + "k";
    return s + Math.round(a).toLocaleString();
  };
  const signed = (v, unit) => (v > 0 ? "+" : "−") + Math.abs(Math.round(v)).toLocaleString() + (unit || "");
  const signedMoney = (v) => (v > 0 ? "+$" : "−$") + Math.abs(Math.round(v)).toLocaleString();

  // Higher is worse for these metrics, so their "+" is shown in red.
  const BAD_UP = /tech debt|churn|cac|burn/i;
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
      const good = BAD_UP.test(label) ? v < 0 : v > 0;
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
        if (!m || /\$0\b/.test(p)) return { text: p, tone: 0 };
        const up = m[0] === "+";
        const good = BAD_UP.test(p) ? !up : up;
        return { text: p, tone: good ? 1 : -1 };
      });
  }

  // Drop a leading emoji from engine titles; the card already has its own icon.
  const questTitle = (t) => String(t || "").replace(/^\S+\s/, (m) => (/[a-z0-9]/i.test(m) ? m : ""));

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
    };
  }

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
    return { week: before.week, rows: rows, notes: notes, quest: after.currentTarget && after.currentTarget.title, nextWeek: after.week };
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
      [tab, setTab] = React.useState("HQ"),
      [guideOpen, setGuideOpen] = React.useState(false),
      [saved, setSaved] = React.useState(readSave),
      [toast, setToast] = React.useState(null),
      [report, setReport] = React.useState(null);
    const toastTimer = React.useRef(null);

    React.useEffect(() => {
      if (!S) return;
      if (S.gameOver || S.victory) clearSave();
      else writeSave(S);
    }, [S]);

    React.useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

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
        children: jsx(StatusBar, { barStyle: "light-content" }),
      });

    const start = ({ founderName, companyName, sectorId }) => {
      const eng = new Engine.StartupEngine(founderName, companyName, sectorId);
      clearSave();
      setSaved(null);
      setEngine(eng);
      setS({ ...eng.state });
      setTab("HQ");
      setReport(null);
    };
    const resume = () => {
      if (!saved) return;
      const eng = restoreEngine(saved.state);
      setEngine(eng);
      setS({ ...eng.state });
      setTab("HQ");
    };
    const restart = () => {
      clearSave();
      setSaved(null);
      setEngine(null);
      setS(null);
      setTab("HQ");
      setReport(null);
    };

    if (!engine || !S)
      return jsxs(Screen, {
        style: st.container,
        children: [
          jsx(StatusBar, { barStyle: "light-content" }),
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
        children: [jsx(StatusBar, { barStyle: "light-content" }), jsx(GameOver.GameOverScreen, { gameState: S, onRestart: restart })],
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
      const next = engine.advanceWeek();
      setS({ ...next });
      buzz(12);
      if (next.gameOver || next.victory) return;
      setReport(buildReport(before, next));
      setTab("HQ");
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

    const runwayPips = jsx(View, {
      style: st.pips,
      children: Array.from({ length: 12 }, (_, k) =>
        jsx(View, { style: [st.pip, k < Math.min(12, Math.floor(runway)) && { backgroundColor: runwayColor }, k === Math.floor(runway) && runway < 12 && { backgroundColor: runwayColor, opacity: (runway % 1) * 0.9 + 0.1 }] }, k),
      ),
    });

    const hero = jsxs(View, {
      style: st.hero,
      dataSet: { ff: "rise1" },
      children: [
        jsxs(View, {
          style: st.heroTop,
          children: [
            jsxs(View, {
              style: { flex: 1 },
              children: [
                jsx(Text, { style: st.kicker, children: "RUNWAY" }),
                jsxs(Text, {
                  style: [st.heroBig, { color: runwayColor, opacity: fogOp }],
                  children: [ft(runwayLabel, "runwayBig"), jsx(Text, { style: st.heroUnit, children: " months" }, "u")],
                }),
              ],
            }),
            jsxs(View, {
              style: { alignItems: "flex-end" },
              children: [
                jsx(Text, { style: st.kicker, children: "IN THE BANK" }),
                jsx(Text, { style: [st.heroCash, { opacity: fogOp }], children: ft(money(S.cash), "cashBig") }),
              ],
            }),
          ],
        }),
        runwayPips,
        jsxs(View, {
          style: st.heroRow,
          children: [
            [ft(money(S.monthlyRevenue), "mrr"), "MRR", COLOR.vital],
            [ft(money(S.weeklyBurn), "burn"), "burn / wk", COLOR.crit],
            [ft(String(Math.round(S.activeUsers).toLocaleString()), "users"), "users", COLOR.text],
          ].map(([v, l, c]) =>
            jsxs(View, { style: st.heroStat, children: [jsx(Text, { style: [st.heroStatV, { color: c, opacity: fogOp }], numberOfLines: 1, children: v }), jsx(Text, { style: st.heroStatL, children: l })] }, l),
          ),
        }),
        jsxs(View, {
          style: st.vitals,
          children: [
            [["🧠", "Clarity"], S.mentalClarity, clarityColor, fogged ? "in the fog" : S.mentalClarity < 60 ? "getting tired" : "clear head"],
            [["🤝", "Morale"], S.teamMorale, moraleColor, S.teamMorale < 40 ? "people may quit" : "team of " + S.team.length],
          ].map(([[icon, label], v, c, sub]) =>
            jsxs(
              View,
              {
                style: st.vital,
                children: [
                  jsxs(View, {
                    style: st.vitalTop,
                    children: [
                      jsx(Text, { style: st.vitalLabel, children: icon + "  " + label }),
                      jsx(Text, { style: [st.vitalValue, { color: c }], children: Math.round(v) + "%" }),
                    ],
                  }),
                  jsx(View, { style: st.vitalTrack, children: jsx(View, { style: [st.vitalFill, { width: Math.max(2, v) + "%", backgroundColor: c }] }) }),
                  jsx(Text, { style: st.vitalSub, children: sub }),
                ],
              },
              label,
            ),
          ),
        }),
        fogged && jsx(View, { pointerEvents: "none", dataSet: { ff: "fog" }, style: [st.fogLayer, { opacity: 0.3 + 0.65 * fogAmt, bottom: 92 }] }),
      ],
    });

    const milestone = nextStage
      ? jsxs(View, {
          style: st.card,
          dataSet: { ff: "rise2" },
          children: [
            jsxs(View, {
              style: st.rowBetween,
              children: [
                jsx(Text, { style: st.kicker, children: "NEXT MILESTONE" }),
                jsx(Text, { style: [st.kicker, { color: COLOR.gold }], children: stageName + " → " + (STAGE_NAMES[nextStage.stage] || "Stage " + nextStage.stage) }),
              ],
            }),
            jsx(Text, { style: st.cardTitle, children: "Reach " + money(nextStage.mrr) + " MRR" }),
            jsx(View, {
              style: st.goalTrack,
              children: jsx(View, { style: [st.goalFill, { width: Math.max(2, Math.min(100, (S.monthlyRevenue / nextStage.mrr) * 100)) + "%" }] }),
            }),
            jsx(Text, { style: st.cardSub, children: ft(money(S.monthlyRevenue), "mrr2") + " of " + money(nextStage.mrr) + " · valuation re-rates to " + compact(nextStage.valuation) }),
          ],
        })
      : null;

    const quest =
      target &&
      jsxs(View, {
        style: [st.card, st.quest, targetDone && st.questDone],
        dataSet: { ff: "rise3" },
        children: [
          jsxs(View, {
            style: st.rowBetween,
            children: [
              jsx(Text, { style: [st.kicker, { color: targetDone ? COLOR.vital : COLOR.accent }], children: targetDone ? "✓ WEEKLY TARGET DONE" : "🎯 WEEKLY TARGET" }),
              jsx(Chips, { items: [{ text: "+" + (target.reward_exp || 50) + " EXP", tone: 2 }].concat(target.reward_cash ? [{ text: "+" + money(target.reward_cash), tone: 1 }] : []) }),
            ],
          }),
          jsx(Text, { style: st.cardTitle, children: questTitle(target.title) }),
          jsx(Text, { style: st.questTasks, children: String(target.tasks || "").replace(/\s*\|\s*/g, "\n") }),
          guide &&
            jsx(Touchable, {
              style: [st.questBtn, targetDone && st.questBtnDone],
              onPress: () => setGuideOpen(true),
              activeOpacity: 0.85,
              children: jsx(Text, {
                style: [st.questBtnTxt, targetDone && { color: COLOR.text2 }],
                children: targetDone ? "Review strategies" : "Choose a strategy ▸",
              }),
            }),
        ],
      });

    const actionCard = jsxs(View, {
      style: st.card,
      dataSet: { ff: "rise4" },
      children: [
        jsxs(View, {
          style: st.rowBetween,
          children: [
            jsx(Text, { style: st.kicker, children: "YOUR ACTION THIS WEEK" }),
            jsxs(View, {
              style: st.token,
              children: [
                jsx(View, { dataSet: S.slotUsed ? undefined : { ff: "glow" }, style: [st.tokenDot, { backgroundColor: S.slotUsed ? COLOR.text3 : COLOR.vital }] }),
                jsx(Text, { style: [st.tokenTxt, { color: S.slotUsed ? COLOR.text3 : COLOR.vital }], children: S.slotUsed ? "used" : "1 left" }),
              ],
            }),
          ],
        }),
        jsx(Text, {
          style: st.cardSub,
          children: S.slotUsed
            ? "Done for this week. End the week when you're ready."
            : fogged
              ? "You're in the fog. Resting is the smart play this week."
              : "Rest, learn, or reach out to someone who matters.",
        }),
        jsxs(View, {
          style: st.actionRow,
          children: [
            jsx(Touchable, { style: [st.actionBtn, fogged && !S.slotUsed && st.actionBtnHot], onPress: () => setTab("Activities"), children: jsx(Text, { style: st.actionBtnTxt, children: "⚡ Actions" }) }),
            jsx(Touchable, {
              style: st.actionBtn,
              onPress: () => setTab("Relationships"),
              children: jsx(Text, { style: st.actionBtnTxt, children: "🤝 Circle" + (weakTie ? " · !" : "") }),
            }),
          ],
        }),
      ],
    });

    const recent = jsxs(View, {
      style: st.card,
      children: [
        jsxs(View, {
          style: st.rowBetween,
          children: [
            jsx(Text, { style: st.kicker, children: "LATELY" }),
            jsx(Touchable, { onPress: () => setTab("Journal"), children: jsx(Text, { style: st.link, children: "Full journal ▸" }) }),
          ],
        }),
        S.journalLog.slice(0, 3).map((x, idx) =>
          jsxs(
            View,
            {
              style: [st.logItem, idx > 0 && st.logDivider],
              children: [
                jsx(View, { style: [st.logBar, { backgroundColor: x.type === "negative" ? COLOR.crit : COLOR.act }] }),
                jsxs(View, {
                  style: { flex: 1 },
                  children: [
                    jsx(Text, { style: st.logTitle, numberOfLines: 1, children: x.title }),
                    jsx(Text, { style: st.logText, numberOfLines: 2, children: x.text }),
                  ],
                }),
                jsx(Text, { style: st.logWeek, children: "W" + x.week }),
              ],
            },
            idx,
          ),
        ),
        jsx(Touchable, { onPress: () => setTab("Assets"), style: st.companyLink, children: jsx(Text, { style: st.link, children: "Company, KPIs & assets ▸" }) }),
      ],
    });

    const hq = jsx(ScrollView, {
      style: { flex: 1 },
      contentContainerStyle: st.hqContent,
      showsVerticalScrollIndicator: !1,
      children: [
        jsx(React.Fragment, { children: hero }, "hero"),
        fogged &&
          jsxs(
            Touchable,
            {
              style: st.fogBanner,
              onPress: () => setTab("Activities"),
              children: [jsx(Text, { style: st.fogBannerTxt, children: Fog.fogNotice(S.mentalClarity) }), jsx(Text, { style: st.fogBannerCta, children: "Rest ▸" })],
            },
            "fogb",
          ),
        jsx(React.Fragment, { children: quest }, "quest"),
        jsx(React.Fragment, { children: actionCard }, "action"),
        jsx(React.Fragment, { children: milestone }, "ms"),
        jsx(React.Fragment, { children: recent }, "recent"),
      ],
    });

    let content;
    if (tab === "HQ") content = hq;
    else if (tab === "Journal") content = jsx(Journal.JournalScreen, { journalLog: S.journalLog, gameState: S });
    else if (tab === "Assets") content = jsx(Assets.AssetsScreen, { gameState: S });
    else if (tab === "Relationships")
      content = jsx(Circle.RelationshipsScreen, { gameState: S, onContact: (id) => act(engine.contactRelationship(id), "Reached out. Relationship +11.") });
    else if (tab === "Departments")
      content = jsx(Team.DepartmentsScreen, {
        gameState: S,
        onHire: (id) => act(engine.hireCandidate(id), "Welcome to the team."),
        onFire: (id) => act(engine.fireEmployee(id), "Let go. Morale −10%."),
        onRefreshCandidates: () => act(engine.refreshCandidatePool(), "3 new candidates sourced."),
        onRunDeptAction: (id) => act(engine.executeDepartmentAction("dept", id), "Done. Logged in your journal."),
      });
    else if (tab === "Activities")
      content = jsx(Actions.ActivitiesScreen, {
        gameState: S,
        onSelectActivity: (activity) => {
          if (act(engine.executeActivity(activity), (activity.name_en || activity.name) + " ✓")) setTab("HQ");
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
                        children: [jsx(Text, { style: st.noteIcon, children: icon }), jsx(Text, { style: st.noteTxt, children: text })],
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
        jsx(StatusBar, { barStyle: "light-content" }),
        jsxs(View, {
          style: st.topBar,
          children: [
            jsxs(View, {
              style: { flex: 1 },
              children: [
                jsx(Text, { style: st.company, numberOfLines: 1, children: S.companyName }),
                jsx(Text, { style: st.weekLine, numberOfLines: 1, children: "Week " + S.week + " · Month " + S.month + " · " + S.founderName }),
              ],
            }),
            jsx(View, { style: st.stagePill, children: jsx(Text, { style: st.stagePillTxt, children: stageName }) }),
            jsx(View, { style: st.expPill, children: jsx(Text, { style: st.expPillTxt, children: S.founderExp + " XP" }) }),
          ],
        }),
        tab !== "HQ" && hud,
        jsx(View, { style: st.content, children: content }),
        jsxs(View, {
          style: st.endBar,
          children: [
            jsx(Text, {
              style: [st.endHint, { color: allDone ? COLOR.vital : COLOR.text3 }],
              numberOfLines: 1,
              children: allDone ? "All set for this week" : [!targetDone && guide ? "target open" : null, !S.slotUsed ? "action unused" : null].filter(Boolean).join(" · "),
            }),
            jsx(Touchable, {
              style: st.endBtn,
              onPress: advance,
              activeOpacity: 0.85,
              dataSet: allDone ? { ff: "pulse" } : undefined,
              children: jsx(Text, { style: st.endBtnTxt, children: "End week " + S.week + " ▸" }),
            }),
          ],
        }),
        jsx(View, {
          style: st.nav,
          children: TABS.map((t) => {
            const on = tab === t.key || (t.key === "HQ" && tab === "Assets");
            const dot = (t.key === "Activities" && !S.slotUsed) || (t.key === "Relationships" && weakTie);
            return jsxs(
              Touchable,
              {
                style: st.navItem,
                onPress: () => setTab(t.key),
                activeOpacity: 0.7,
                children: [
                  jsxs(View, {
                    style: [st.navIconWrap, on && st.navIconOn],
                    children: [jsx(Text, { style: [st.navIcon, !on && { opacity: 0.55 }], children: t.icon }), dot && jsx(View, { style: st.navDot })],
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
    stagePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#1d2733", borderWidth: 1, borderColor: "#2b3a4c" },
    stagePillTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 10.5, color: COLOR.act },
    expPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#211c0c", borderWidth: 1, borderColor: "#4a3d10" },
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
    fogBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#2a2111", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#5a4416" },
    fogBannerTxt: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 13, lineHeight: 18, color: "#f0d39b" },
    fogBannerCta: { fontFamily: "Archivo_600SemiBold", fontSize: 13, color: COLOR.fog },
    card: card,
    cardTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 17, letterSpacing: -0.3, color: COLOR.text, marginTop: 8 },
    cardSub: { fontFamily: "Archivo_400Regular", fontSize: 13, lineHeight: 19, color: COLOR.text2, marginTop: 6 },
    goalTrack: { height: 10, borderRadius: 5, backgroundColor: COLOR.panel2, marginTop: 12, overflow: "hidden" },
    goalFill: { height: "100%", borderRadius: 5, backgroundColor: COLOR.gold },
    quest: { borderColor: "#5a2a20", backgroundColor: "#1a1716" },
    questDone: { borderColor: "#1f4a33", backgroundColor: "#121b17" },
    questTasks: { fontFamily: "Archivo_400Regular", fontSize: 13, lineHeight: 20, color: COLOR.text2, marginTop: 6, marginBottom: 12 },
    questBtn: { backgroundColor: COLOR.accent, borderRadius: 12, minHeight: 46, alignItems: "center", justifyContent: "center" },
    questBtnDone: { backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.line },
    questBtnTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: "#fff" },
    token: { flexDirection: "row", alignItems: "center", gap: 6 },
    tokenDot: { width: 9, height: 9, borderRadius: 5 },
    tokenTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 11 },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    actionBtn: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.line, alignItems: "center", justifyContent: "center" },
    actionBtnHot: { borderColor: COLOR.fog, backgroundColor: "#2a2111" },
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
    navIconOn: { backgroundColor: "#2a3442" },
    navIcon: { fontSize: 17 },
    navDot: { position: "absolute", top: 3, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR.accent, borderWidth: 1.5, borderColor: COLOR.panel },
    navLabel: { fontFamily: "Archivo_500Medium", fontSize: 10.5, color: COLOR.text3, marginTop: 2 },
    navLabelOn: { color: COLOR.text },
    vignette: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },

    // chips
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
    chipGood: { backgroundColor: "#10241a", borderColor: "#1f4a33" },
    chipBad: { backgroundColor: "#2a1513", borderColor: "#5a2622" },
    chipGold: { backgroundColor: "#211c0c", borderColor: "#4a3d10" },
    chipNeutral: { backgroundColor: COLOR.panel2, borderColor: COLOR.line },
    chipTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 11 },

    // toast
    toastWrap: { position: "absolute", left: 12, right: 12, bottom: 132, alignItems: "center", zIndex: 50 },
    toast: { maxWidth: 440, width: "100%", backgroundColor: "#243040", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderLeftWidth: 4, shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    toastTxt: { fontFamily: "Archivo_500Medium", fontSize: 13, lineHeight: 18, color: COLOR.text },

    // sheets & modals
    sheetOverlay: { flex: 1, backgroundColor: "rgba(6,9,12,0.8)", justifyContent: "flex-end", cursor: "default" },
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
    noteBad: { backgroundColor: "#2a1513" },
    noteGood: { backgroundColor: "#10241a" },
    noteIcon: { fontSize: 15, width: 20, textAlign: "center" },
    noteTxt: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 13, lineHeight: 18, color: COLOR.text },
    reportQuest: { fontFamily: "Archivo_500Medium", fontSize: 13, color: COLOR.text2, marginTop: 14, marginBottom: 2 },
    primaryBtn: { backgroundColor: COLOR.accent, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 14 },
    primaryTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 15.5, color: "#fff" },
    centerOverlay: { flex: 1, backgroundColor: "rgba(6,9,12,0.84)", justifyContent: "center", alignItems: "center", padding: 14 },
    dilemma: { backgroundColor: COLOR.panel, borderRadius: 22, padding: 18, width: "100%", maxWidth: 460, maxHeight: "92%", borderWidth: 1, borderColor: "#5a4416", borderTopWidth: 3, borderTopColor: COLOR.fog },
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
  });
}
