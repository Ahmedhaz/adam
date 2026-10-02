// Founder Fog — main game screen (replaces Metro module 144 of the original build).
// Written against the same dependency list as the original module, so the
// require indices below match: React, StyleSheet, Text, View, SafeAreaView,
// TouchableOpacity, StatusBar, Modal, ScrollView, fonts, engine, screens, fog, theme, jsx.
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
    { key: "Journal", mono: "JRN", label: "Journal" },
    { key: "Assets", mono: "AST", label: "Assets" },
    { key: "Relationships", mono: "REL", label: "Circle" },
    { key: "Departments", mono: "TEAM", label: "Team" },
    { key: "Activities", mono: "ACT", label: "Actions" },
  ];

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

  const money = (v) => (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString();
  const signed = (v, unit) => (v > 0 ? "+" : "−") + Math.abs(Math.round(v)).toLocaleString() + (unit || "");
  const signedMoney = (v) => (v > 0 ? "+$" : "−$") + Math.abs(Math.round(v)).toLocaleString();

  function weekSummary(before, after) {
    const parts = [];
    const dCash = after.cash - before.cash;
    if (Math.round(dCash) !== 0) parts.push("Cash " + signedMoney(dCash));
    const dMrr = after.monthlyRevenue - before.monthlyRevenue;
    if (Math.abs(dMrr) >= 25) parts.push("MRR " + signedMoney(dMrr));
    const dClarity = after.mentalClarity - before.mentalClarity;
    if (Math.round(dClarity) !== 0) parts.push("Clarity " + signed(dClarity, "%"));
    const dMorale = after.teamMorale - before.teamMorale;
    if (Math.round(dMorale) !== 0) parts.push("Morale " + signed(dMorale, "%"));
    if (after.team.length < before.team.length) parts.push("Someone quit");
    return parts.join(" · ") || "A quiet week.";
  }

  function snapshot(s) {
    return {
      cash: s.cash,
      monthlyRevenue: s.monthlyRevenue,
      mentalClarity: s.mentalClarity,
      teamMorale: s.teamMorale,
      team: s.team.slice(),
    };
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
      [tab, setTab] = React.useState("Journal"),
      [guideOpen, setGuideOpen] = React.useState(false),
      [targetOpen, setTargetOpen] = React.useState(false),
      [saved, setSaved] = React.useState(readSave),
      [toast, setToast] = React.useState(null);
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
      toastTimer.current = setTimeout(() => setToast(null), kind === "bad" ? 3200 : 2600);
    };

    // Runs an engine call that returns {success, reason, state}; failures are
    // surfaced instead of silently ignored.
    const act = (result, okText) => {
      if (!result) return false;
      if (result.success) {
        setS({ ...result.state });
        okText && notify(okText, "ok");
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
      setTab("Journal");
      setTargetOpen(true);
    };
    const resume = () => {
      if (!saved) return;
      const eng = restoreEngine(saved.state);
      setEngine(eng);
      setS({ ...eng.state });
      setTab("Journal");
      notify("Welcome back. Week " + saved.state.week + ".", "ok");
    };
    const restart = () => {
      clearSave();
      setSaved(null);
      setEngine(null);
      setS(null);
      setTab("Journal");
    };

    if (!engine || !S)
      return jsxs(Screen, {
        style: st.container,
        children: [
          jsx(StatusBar, { barStyle: "light-content" }),
          saved &&
            jsxs(View, {
              style: st.resumeCard,
              children: [
                jsxs(View, {
                  style: { flex: 1 },
                  children: [
                    jsx(Text, { style: st.resumeKicker, children: "SAVED GAME" }),
                    jsx(Text, { style: st.resumeTitle, numberOfLines: 1, children: saved.state.companyName }),
                    jsx(Text, {
                      style: st.resumeSub,
                      children: "Week " + saved.state.week + " · " + money(saved.state.cash) + " in the bank",
                    }),
                  ],
                }),
                jsxs(View, {
                  style: { alignItems: "flex-end", gap: 6 },
                  children: [
                    jsx(Touchable, {
                      style: st.resumeBtn,
                      onPress: resume,
                      children: jsx(Text, { style: st.resumeBtnTxt, children: "Continue ▸" }),
                    }),
                    jsx(Touchable, {
                      onPress: () => {
                        clearSave();
                        setSaved(null);
                      },
                      children: jsx(Text, { style: st.resumeDiscard, children: "Discard" }),
                    }),
                  ],
                }),
              ],
            }),
          jsx(Onboarding.OnboardingScreen, { onStartGame: start }),
        ],
      });

    if (S.gameOver || S.victory)
      return jsxs(Screen, {
        style: st.container,
        children: [
          jsx(StatusBar, { barStyle: "light-content" }),
          jsx(GameOver.GameOverScreen, { gameState: S, onRestart: restart }),
        ],
      });

    const target = S.currentTarget,
      guide = target && target.howToGuide,
      targetDone = !!target && S.completedTargets.includes(target.week),
      cashColor = S.cash < 4 * S.weeklyBurn ? COLOR.crit : COLOR.vital,
      moraleColor = S.teamMorale < 40 ? COLOR.crit : COLOR.vital,
      clarityColor = Fog.isFogged(S.mentalClarity) ? COLOR.fog : COLOR.act,
      runway = parseFloat(S.runwayMonths),
      runwayLabel = runway >= 999 ? "∞" : runway.toFixed(1),
      runwayColor = runway < 4 ? COLOR.crit : runway < 8 ? COLOR.fog : COLOR.vital,
      fogOp = Fog.fogOpacity(S.mentalClarity),
      narrow = typeof window !== "undefined" && window.innerWidth < 360;

    const advance = () => {
      const before = snapshot(S);
      const skipped = !S.slotUsed;
      const next = engine.advanceWeek();
      setS({ ...next });
      setTargetOpen(!next.completedTargets.includes(next.currentTarget && next.currentTarget.week));
      buzz(8);
      if (next.gameOver || next.victory || next.pendingEvent) return;
      const summary = "Week " + next.week + " · " + weekSummary(before, next);
      notify(skipped ? summary + "\nYou skipped last week's action." : summary, next.mentalClarity < before.mentalClarity - 4 ? "warn" : "info");
    };

    const tile = (label, figure, figColor, barPct, barColor, sub, subColor, fogged) =>
      jsxs(View, {
        style: st.tile,
        children: [
          jsx(Text, { style: [st.tileLabel, fogged && { opacity: fogOp }], numberOfLines: 1, children: label }),
          jsx(Text, {
            style: [st.tileFigure, narrow && st.tileFigureNarrow, { color: figColor }, fogged && { opacity: fogOp }],
            numberOfLines: 1,
            adjustsFontSizeToFit: !0,
            children: figure,
          }),
          jsx(View, {
            style: st.barTrack,
            children: jsx(View, {
              style: [st.barFill, { width: Math.max(0, Math.min(100, barPct)) + "%", backgroundColor: barColor }, fogged && { opacity: fogOp }],
            }),
          }),
          jsx(Text, { style: [st.tileSub, { color: subColor || COLOR.text3 }, fogged && { opacity: fogOp }], numberOfLines: 1, children: sub }),
        ],
      });

    return jsxs(Screen, {
      style: st.container,
      children: [
        jsx(StatusBar, { barStyle: "light-content" }),
        jsxs(View, {
          style: st.header,
          children: [
            jsxs(View, {
              style: { flex: 1 },
              children: [
                jsx(Text, { style: st.companyTitle, numberOfLines: 1, children: S.companyName }),
                jsx(Text, {
                  style: st.founderSub,
                  numberOfLines: 1,
                  children: S.founderName + " · Week " + S.week + " · Month " + S.month,
                }),
              ],
            }),
            jsx(View, {
              style: st.expChip,
              children: jsx(Text, { style: st.expChipTxt, children: S.founderExp + " EXP" }),
            }),
          ],
        }),
        jsxs(View, {
          style: st.statRow,
          children: [
            tile(
              "CASH",
              Fog.fogText(money(S.cash), S.mentalClarity, "cash", S.week),
              cashColor,
              (S.cash / Math.max(1, S.sector && S.sector.initial_cash ? S.sector.initial_cash : 25e3)) * 100,
              cashColor,
              Fog.fogText("MRR " + money(S.monthlyRevenue), S.mentalClarity, "mrr", S.week),
              null,
              true,
            ),
            tile(
              "BURN/WK",
              Fog.fogText(money(S.weeklyBurn), S.mentalClarity, "burn", S.week),
              COLOR.crit,
              (Math.min(runway, 12) / 12) * 100,
              runwayColor,
              Fog.fogText(runwayLabel + (narrow ? " mo" : " mo runway"), S.mentalClarity, "runway", S.week),
              runwayColor,
              true,
            ),
            tile("CLARITY", S.mentalClarity + "%", clarityColor, S.mentalClarity, clarityColor, Fog.isFogged(S.mentalClarity) ? "in the fog" : "clear head", Fog.isFogged(S.mentalClarity) ? COLOR.fog : null, false),
            tile("MORALE", Math.round(S.teamMorale) + "%", moraleColor, S.teamMorale, moraleColor, "team of " + S.team.length, null, false),
          ],
        }),
        Fog.isFogged(S.mentalClarity) &&
          jsxs(Touchable, {
            style: st.fogNotice,
            onPress: () => setTab("Activities"),
            children: [
              jsx(Text, { style: st.fogNoticeTxt, numberOfLines: 2, children: Fog.fogNotice(S.mentalClarity) }),
              jsx(Text, { style: st.fogNoticeCta, children: "Rest ▸" }),
            ],
          }),
        target &&
          jsxs(View, {
            style: [st.targetCard, targetDone && st.targetCardDone],
            children: [
              jsxs(Touchable, {
                style: st.targetHeader,
                onPress: () => setTargetOpen(!targetOpen),
                children: [
                  jsx(Text, { style: st.targetTitle, numberOfLines: targetOpen ? 3 : 1, children: target.title }),
                  jsx(View, {
                    style: [st.chip, targetDone ? st.chipDone : st.chipTodo],
                    children: jsx(Text, {
                      style: [st.chipTxt, { color: targetDone ? COLOR.vital : COLOR.gold }],
                      children: targetDone ? "✓ Done" : "+" + (target.reward_exp || 50) + " EXP",
                    }),
                  }),
                  jsx(Text, { style: st.chevron, children: targetOpen ? "▴" : "▾" }),
                ],
              }),
              targetOpen &&
                jsx(Text, { style: st.targetTasks, children: target.tasks }),
              targetOpen &&
                guide &&
                jsx(Touchable, {
                  style: [st.guideBtn, targetDone && st.guideBtnDone],
                  onPress: () => setGuideOpen(true),
                  children: jsx(Text, {
                    style: [st.guideBtnTxt, targetDone && { color: COLOR.text2 }],
                    children: targetDone ? "Target done · review strategies" : "Choose a strategy ▸",
                  }),
                }),
            ],
          }),
        jsxs(View, {
          style: st.screenContainer,
          children: [
            "Journal" === tab && jsx(Journal.JournalScreen, { journalLog: S.journalLog, gameState: S }),
            "Assets" === tab && jsx(Assets.AssetsScreen, { gameState: S }),
            "Relationships" === tab &&
              jsx(Circle.RelationshipsScreen, {
                gameState: S,
                onContact: (id) => engine && act(engine.contactRelationship(id), "Reached out. Relationship +11."),
              }),
            "Departments" === tab &&
              jsx(Team.DepartmentsScreen, {
                gameState: S,
                onHire: (id) => engine && act(engine.hireCandidate(id), "Welcome to the team."),
                onFire: (id) => engine && act(engine.fireEmployee(id), "Let go. Morale −10%."),
                onRefreshCandidates: () => engine && act(engine.refreshCandidatePool(), "3 new candidates sourced."),
                onRunDeptAction: (id) => {
                  if (engine && act(engine.executeDepartmentAction("dept", id), "Done. Logged in your journal.")) setTab("Journal");
                },
              }),
            "Activities" === tab &&
              jsx(Actions.ActivitiesScreen, {
                gameState: S,
                onSelectActivity: (activity) => {
                  if (engine && act(engine.executeActivity(activity), (activity.name_en || activity.name) + " ✓")) setTab("Journal");
                },
              }),
          ],
        }),
        jsxs(View, {
          style: st.weekFooter,
          children: [
            jsxs(View, {
              children: [
                jsx(Text, { style: st.weekFooterLabel, children: "WEEK " + S.week }),
                jsx(Text, {
                  style: [st.slotLabel, { color: S.slotUsed ? COLOR.text3 : COLOR.vital }],
                  children: S.slotUsed ? "Action used" : "● One action available",
                }),
              ],
            }),
            jsx(Touchable, {
              style: st.advanceBtn,
              onPress: advance,
              children: jsx(Text, { style: st.advanceBtnTxt, children: "Advance week ▸" }),
            }),
          ],
        }),
        jsx(View, {
          style: st.bottomNav,
          children: TABS.map((t) => {
            const on = tab === t.key;
            const dot = t.key === "Activities" && !S.slotUsed;
            return jsxs(
              Touchable,
              {
                style: st.navItem,
                onPress: () => setTab(t.key),
                children: [
                  jsx(View, { style: [st.navMarker, on && st.navMarkerActive] }),
                  jsxs(Text, { style: [st.navMono, on && st.navMonoActive], children: [t.mono, dot ? " ·" : ""] }),
                  jsx(Text, { style: [st.navLabel, on && st.activeLabel], children: t.label }),
                ],
              },
              t.key,
            );
          }),
        }),
        toast &&
          jsx(View, {
            pointerEvents: "none",
            style: st.toastWrap,
            children: jsx(View, {
              style: [
                st.toast,
                { borderLeftColor: toast.kind === "bad" ? COLOR.crit : toast.kind === "warn" ? COLOR.fog : toast.kind === "ok" ? COLOR.vital : COLOR.act },
              ],
              children: jsx(Text, { style: st.toastTxt, children: toast.text }),
            }),
          }, toast.id),
        S.pendingEvent &&
          jsx(Modal, {
            visible: !0,
            transparent: !0,
            animationType: "fade",
            children: jsx(View, {
              style: st.modalOverlay,
              children: jsx(View, {
                style: st.modalCard,
                children: jsx(ScrollView, {
                  showsVerticalScrollIndicator: !1,
                  children: [
                    jsx(Text, { style: st.dilemmaKicker, children: "DILEMMA · WEEK " + S.week }, "k"),
                    jsx(Text, { style: st.modalCategory, children: S.pendingEvent.category }, "c"),
                    jsx(Text, { style: st.modalTitle, children: S.pendingEvent.title }, "t"),
                    jsx(Text, { style: st.modalDesc, children: S.pendingEvent.description }, "d"),
                    ["option_A", "option_B"].map((key) =>
                      jsxs(
                        Touchable,
                        {
                          style: [st.optionBtn, { borderLeftColor: key === "option_A" ? COLOR.vital : COLOR.crit }],
                          onPress: () => {
                            const before = snapshot(S);
                            const next = engine.resolveEventChoice(key);
                            setS({ ...next });
                            buzz(12);
                            if (!next.gameOver && !next.victory) notify("Decided. " + weekSummary(before, next), "info");
                          },
                          children: [
                            jsx(Text, { style: st.optionTitle, children: S.pendingEvent[key].title }),
                            jsx(Text, { style: st.optionPreview, children: S.pendingEvent[key].preview }),
                          ],
                        },
                        key,
                      ),
                    ),
                    jsx(Text, { style: st.noRightOption, children: "THERE IS NO RIGHT OPTION" }, "n"),
                  ],
                }),
              }),
            }),
          }),
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
                style: st.sheet,
                children: [
                  jsxs(View, {
                    style: st.sheetHeader,
                    children: [
                      jsxs(View, {
                        style: { flex: 1 },
                        children: [
                          jsx(Text, { style: st.sheetKicker, children: "STRATEGY GUIDE · WEEK " + S.week }),
                          jsx(Text, { style: st.sheetTitle, numberOfLines: 2, children: target.title }),
                        ],
                      }),
                      jsx(Touchable, {
                        style: st.closeBtn,
                        onPress: () => setGuideOpen(false),
                        children: jsx(Text, { style: st.closeTxt, children: "✕" }),
                      }),
                    ],
                  }),
                  jsxs(ScrollView, {
                    showsVerticalScrollIndicator: !1,
                    style: { flexGrow: 0 },
                    children: [
                      jsxs(View, {
                        style: st.whyCard,
                        children: [
                          jsx(Text, { style: st.whyTitle, children: "Why this matters" }),
                          jsx(Text, { style: st.whyText, children: guide.whyItMatters }),
                        ],
                      }),
                      jsx(Text, {
                        style: st.strategiesTitle,
                        children: targetDone ? "You already hit this target this week" : "Pick one way to hit this target",
                      }),
                      guide.strategies.map((s) => {
                        const tooPoor = S.cash < s.cost;
                        const disabled = targetDone || tooPoor;
                        return jsxs(
                          View,
                          {
                            style: st.stratCard,
                            children: [
                              jsxs(View, {
                                style: st.stratTop,
                                children: [
                                  jsx(View, {
                                    style: [st.stratBadge, { backgroundColor: s.badgeBg }],
                                    children: jsx(Text, { style: [st.stratBadgeTxt, { color: s.badgeColor }], children: s.badge }),
                                  }),
                                  jsx(Text, { style: [st.stratCost, tooPoor && { color: COLOR.crit }], children: s.costLabel }),
                                ],
                              }),
                              jsx(Text, { style: st.stratTitle, children: s.title }),
                              jsx(Text, { style: st.stratDesc, children: s.desc }),
                              jsx(Touchable, {
                                style: [st.stratBtn, disabled && st.stratBtnOff],
                                disabled: disabled,
                                onPress: () => {
                                  const res = engine.executeTargetStrategy(s.id);
                                  if (act(res, "🎯 Target hit · +" + (target.reward_exp || 50) + " EXP")) {
                                    setGuideOpen(false);
                                    setTargetOpen(false);
                                    res.targetTab && setTab(res.targetTab);
                                  }
                                },
                                children: jsx(Text, {
                                  style: [st.stratBtnTxt, disabled && { color: COLOR.text3 }],
                                  children: targetDone ? "Target already done" : tooPoor ? "Not enough cash" : "Execute this strategy ▸",
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
          }),
      ],
    });
  }

  const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLOR.ink },
    header: {
      backgroundColor: COLOR.panel,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLOR.line,
    },
    companyTitle: { ...TYPE.screenTitle, color: COLOR.text },
    founderSub: { ...TYPE.label, color: COLOR.text3, marginTop: 3, textTransform: "none" },
    expChip: {
      backgroundColor: COLOR.panel2,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLOR.line,
    },
    expChipTxt: { ...TYPE.label, color: COLOR.gold },
    statRow: {
      backgroundColor: COLOR.panel,
      paddingHorizontal: 8,
      paddingBottom: 8,
      paddingTop: 2,
      flexDirection: "row",
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: COLOR.line,
    },
    tile: {
      flex: 1,
      minWidth: 0,
      backgroundColor: COLOR.panel2,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLOR.line,
    },
    tileLabel: { fontFamily: "AzeretMono_500Medium", fontSize: 9, letterSpacing: 0.6, color: COLOR.text3, marginBottom: 3 },
    tileFigure: { fontFamily: "AzeretMono_600SemiBold", fontSize: 14, letterSpacing: -0.3, marginBottom: 5 },
    tileFigureNarrow: { fontSize: 11.5, letterSpacing: -0.5 },
    tileSub: { fontFamily: "Archivo_500Medium", fontSize: 9.5, marginTop: 4 },
    barTrack: { height: 3, backgroundColor: COLOR.panel, borderRadius: 2, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 2 },
    fogNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: COLOR.panel2,
      marginHorizontal: 8,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: COLOR.fog,
    },
    fogNoticeTxt: { ...TYPE.body, fontSize: 12, color: COLOR.text, flex: 1 },
    fogNoticeCta: { ...TYPE.label, color: COLOR.fog, textTransform: "none" },
    targetCard: {
      backgroundColor: COLOR.panel,
      marginHorizontal: 8,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLOR.lineHot,
    },
    targetCardDone: { borderColor: COLOR.line, opacity: 0.85 },
    targetHeader: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
    targetTitle: { ...TYPE.sectionHeading, color: COLOR.text, flex: 1 },
    chevron: { color: COLOR.text3, fontSize: 12, width: 12, textAlign: "center" },
    chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    chipTodo: { borderColor: "#4a3d10", backgroundColor: "#1f1a08" },
    chipDone: { borderColor: "#1f4a33", backgroundColor: "#0f2219" },
    chipTxt: { ...TYPE.label, textTransform: "none" },
    targetTasks: { ...TYPE.body, color: COLOR.text2, marginTop: 6, marginBottom: 10 },
    guideBtn: {
      backgroundColor: COLOR.act,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
    },
    guideBtnDone: { backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.line },
    guideBtnTxt: { ...TYPE.label, color: "#ffffff", textTransform: "none" },
    screenContainer: { flex: 1 },
    weekFooter: {
      backgroundColor: COLOR.panel,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: COLOR.line,
    },
    weekFooterLabel: { ...TYPE.label, color: COLOR.text3 },
    slotLabel: { fontFamily: "Archivo_600SemiBold", fontSize: 11, letterSpacing: 0.3, marginTop: 2 },
    advanceBtn: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: COLOR.accent,
      minHeight: 46,
      justifyContent: "center",
    },
    advanceBtnTxt: { ...TYPE.label, color: "#ffffff", textTransform: "none", fontSize: 13 },
    bottomNav: {
      minHeight: 54,
      backgroundColor: COLOR.panel,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: COLOR.line,
      paddingTop: 2,
      paddingBottom: 4,
    },
    navItem: { alignItems: "center", flex: 1, paddingVertical: 4, minHeight: 44, justifyContent: "center" },
    navMarker: { height: 2, width: 20, backgroundColor: "transparent", marginBottom: 4 },
    navMarkerActive: { backgroundColor: COLOR.accent },
    navMono: { fontFamily: "AzeretMono_600SemiBold", fontSize: 10, color: COLOR.text3, letterSpacing: 0.5 },
    navMonoActive: { color: COLOR.text },
    navLabel: { ...TYPE.tabLabel, color: COLOR.text3, marginTop: 2 },
    activeLabel: { color: COLOR.text },
    toastWrap: { position: "absolute", left: 12, right: 12, bottom: 128, alignItems: "center", zIndex: 50 },
    toast: {
      maxWidth: 420,
      width: "100%",
      backgroundColor: "#222b35",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderLeftWidth: 3,
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    toastTxt: { fontFamily: "Archivo_500Medium", fontSize: 12.5, lineHeight: 18, color: COLOR.text },
    resumeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: COLOR.panel,
      margin: 12,
      marginBottom: 0,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLOR.lineHot,
      borderLeftWidth: 3,
      borderLeftColor: COLOR.vital,
    },
    resumeKicker: { ...TYPE.label, color: COLOR.vital },
    resumeTitle: { ...TYPE.screenTitle, color: COLOR.text, marginTop: 2 },
    resumeSub: { ...TYPE.body, fontSize: 12, color: COLOR.text2, marginTop: 2 },
    resumeBtn: { backgroundColor: COLOR.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minHeight: 40, justifyContent: "center" },
    resumeBtnTxt: { ...TYPE.label, color: "#ffffff", textTransform: "none" },
    resumeDiscard: { ...TYPE.label, color: COLOR.text3, textTransform: "none", paddingVertical: 4 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(6,9,12,0.78)", justifyContent: "center", alignItems: "center", padding: 16 },
    modalCard: {
      backgroundColor: COLOR.panel,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      maxHeight: "90%",
      borderTopWidth: 2,
      borderTopColor: COLOR.fog,
    },
    dilemmaKicker: { ...TYPE.label, color: COLOR.fog, marginBottom: 8 },
    modalCategory: { ...TYPE.label, color: COLOR.text3, marginBottom: 4, textTransform: "uppercase" },
    modalTitle: { ...TYPE.screenTitle, fontSize: 18, color: COLOR.text, marginBottom: 8 },
    modalDesc: { ...TYPE.body, fontSize: 13.5, lineHeight: 20, color: COLOR.text2, marginBottom: 16 },
    optionBtn: {
      backgroundColor: COLOR.panel2,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      borderLeftWidth: 3,
      minHeight: 52,
      justifyContent: "center",
    },
    optionTitle: { ...TYPE.sectionHeading, color: COLOR.text, marginBottom: 4 },
    optionPreview: { ...TYPE.bodySmall, fontSize: 12, color: COLOR.text2 },
    noRightOption: { ...TYPE.label, color: COLOR.text3, textAlign: "center", marginTop: 8 },
    sheetOverlay: { flex: 1, backgroundColor: "rgba(6,9,12,0.78)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: COLOR.panel,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
      maxHeight: "88%",
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      borderTopWidth: 2,
      borderTopColor: COLOR.act,
    },
    sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    sheetKicker: { ...TYPE.label, color: COLOR.vital },
    sheetTitle: { ...TYPE.screenTitle, color: COLOR.text, marginTop: 3 },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: COLOR.panel2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: COLOR.line,
    },
    closeTxt: { color: COLOR.text, fontSize: 14, fontFamily: "Archivo_600SemiBold" },
    whyCard: { backgroundColor: COLOR.panel2, padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: COLOR.line },
    whyTitle: { ...TYPE.sectionHeading, color: COLOR.fog, marginBottom: 6 },
    whyText: { ...TYPE.bodySmall, fontSize: 12.5, lineHeight: 18, color: COLOR.text2 },
    strategiesTitle: { ...TYPE.sectionHeading, color: COLOR.text, marginBottom: 10 },
    stratCard: { backgroundColor: COLOR.panel2, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLOR.line },
    stratTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 },
    stratBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, flexShrink: 1 },
    stratBadgeTxt: { ...TYPE.label, textTransform: "none" },
    stratCost: { ...TYPE.label, color: COLOR.act, textTransform: "none" },
    stratTitle: { ...TYPE.sectionHeading, color: COLOR.text, marginBottom: 2 },
    stratDesc: { ...TYPE.bodySmall, fontSize: 12, lineHeight: 17, color: COLOR.text2, marginBottom: 10 },
    stratBtn: { backgroundColor: COLOR.act, paddingVertical: 10, borderRadius: 8, alignItems: "center", minHeight: 42, justifyContent: "center" },
    stratBtnOff: { backgroundColor: COLOR.panel, borderWidth: 1, borderColor: COLOR.line },
    stratBtnTxt: { ...TYPE.label, color: "#ffffff", textTransform: "none" },
  });
}
