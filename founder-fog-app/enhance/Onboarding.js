// Founder Fog — title screen + new-company setup (replaces Metro module 265).
// Same dependency list as the original module: React, View, Text, TextInput,
// StyleSheet, ScrollView, TouchableOpacity, engine, theme, jsx runtime.
function (g, r, i, a, m, _e, d) {
  "use strict";
  function e(e) {
    return e && e.__esModule ? e : { default: e };
  }
  Object.defineProperty(_e, "__esModule", { value: !0 });

  var React = r(d[0]),
    View = e(r(d[1])).default,
    Text = e(r(d[2])).default,
    TextInput = e(r(d[3])).default,
    StyleSheet = e(r(d[4])).default,
    ScrollView = e(r(d[5])).default,
    Touchable = e(r(d[6])).default,
    Engine = r(d[7]),
    Theme = r(d[8]),
    J = r(d[9]);

  const COLOR = Theme.COLOR,
    TYPE = Theme.TYPE,
    jsx = J.jsx,
    jsxs = J.jsxs;

  const ICONS = { saas_ai: "🤖", fintech: "💳", ecommerce_marketplace: "🛍️", healthtech: "🩺", edtech: "🎓" };
  const DIFF_COLOR = { Hard: COLOR.crit, Moderate: COLOR.fog, Easy: COLOR.vital };

  const money = (v) => "$" + Math.round(v).toLocaleString();
  const cleanName = (n) => String(n || "").replace(/^[\d\u0660-\u0669]+\.\s*/, "");

  // The Arabic build is the same code served as ar.html with <html lang="ar" dir="rtl">.
  const IS_AR = typeof document !== "undefined" && document.documentElement.lang === "ar";
  const sectorName = (s) => cleanName(IS_AR ? s.name_ar || s.name_en : s.name_en);
  const sectorAlt = (s) => cleanName(IS_AR ? s.name_en : s.name_ar);
  function switchLanguage() {
    try {
      window.localStorage.setItem("founderFog.lang", IS_AR ? "en" : "ar");
    } catch (err) {}
    window.location.replace(IS_AR ? "index.html" : "ar.html");
  }
  function sectorNumbers(s) {
    const monthlyBurn = 2e3 * (s.burn_multiplier || 1) + 1500;
    return { burnWeek: monthlyBurn / 4, runway: s.initial_cash / monthlyBurn };
  }

  function Title({ saved, onNew, onResume, onDiscard }) {
    return jsxs(View, {
      style: st.titleWrap,
      children: [
        jsx(View, { dataSet: { ff: "fogbank" }, pointerEvents: "none", style: st.titleFog }),
        // EN | عربي switch, always visible at the top of the title screen
        jsx(View, {
          style: st.langSwitch,
          children: [
            ["EN", false],
            ["\u0639\u0631\u0628\u064a", true],
          ].map(([label, ar]) =>
            jsx(
              Touchable,
              {
                style: [st.langOpt, ar === IS_AR && st.langOptOn],
                onPress: () => ar !== IS_AR && switchLanguage(),
                children: jsx(Text, { style: [st.langTxt, ar === IS_AR && st.langTxtOn], children: label }),
              },
              label,
            ),
          ),
        }),
        jsxs(View, {
          style: st.titleCenter,
          children: [
            jsx(View, { dataSet: { ff: "float" }, children: jsx(Text, { style: st.logoMark, children: "⛰️" }) }),
            jsx(Text, { style: st.logo, children: "FOUNDER FOG" }),
            jsx(Text, { style: st.logoTag, children: "Build a company. Keep your head clear.\nYou will not always be able to read the numbers." }),
          ],
        }),
        jsxs(View, {
          style: st.titleActions,
          children: [
            saved &&
              jsxs(Touchable, {
                style: st.saveCard,
                onPress: onResume,
                activeOpacity: 0.85,
                dataSet: { ff: "rise1" },
                children: [
                  jsxs(View, {
                    style: { flex: 1 },
                    children: [
                      jsx(Text, { style: st.saveKicker, children: "CONTINUE" }),
                      jsx(Text, { style: st.saveTitle, numberOfLines: 1, children: saved.state.companyName }),
                      jsx(Text, { style: st.saveSub, children: "Week " + saved.state.week + " · " + money(saved.state.cash) + " in the bank" }),
                    ],
                  }),
                  jsx(Text, { style: st.saveArrow, children: "▸" }),
                ],
              }),
            jsx(Touchable, {
              style: [st.primaryBtn, saved && st.secondaryBtn],
              onPress: onNew,
              activeOpacity: 0.85,
              dataSet: { ff: "rise2" },
              children: jsx(Text, { style: [st.primaryTxt, saved && st.secondaryTxt], children: saved ? "Start a new company" : "Start your company ▸" }),
            }),
            saved &&
              jsx(Touchable, {
                onPress: onDiscard,
                style: st.discard,
                children: jsx(Text, { style: st.discardTxt, children: "Delete saved game" }),
              }),
          ],
        }),
      ],
    });
  }

  function StepHeader({ step, title, sub, onBack }) {
    return jsxs(View, {
      style: st.stepHeader,
      children: [
        jsxs(View, {
          style: st.stepTop,
          children: [
            jsx(Touchable, { onPress: onBack, style: st.backBtn, children: jsx(Text, { style: st.backTxt, children: "‹" }) }),
            jsx(View, {
              style: st.dots,
              children: [1, 2].map((n) => jsx(View, { style: [st.dot, n <= step && st.dotOn] }, n)),
            }),
            jsx(View, { style: { width: 40 } }),
          ],
        }),
        jsx(Text, { style: st.stepTitle, children: title }),
        jsx(Text, { style: st.stepSub, children: sub }),
      ],
    });
  }

  _e.OnboardingScreen = function ({ onStartGame, saved, onResume, onDiscard }) {
    const [step, setStep] = React.useState(0),
      [sectorId, setSectorId] = React.useState(Engine.SECTORS[0].id),
      [founder, setFounder] = React.useState("Ahmed"),
      [company, setCompany] = React.useState("Adamos AI");

    if (step === 0)
      return jsx(Title, { saved: saved, onResume: onResume, onDiscard: onDiscard, onNew: () => setStep(1) });

    const sector = Engine.SECTORS.find((s) => s.id === sectorId) || Engine.SECTORS[0];
    const nums = sectorNumbers(sector);

    if (step === 1)
      return jsxs(View, {
        style: st.container,
        children: [
          jsx(StepHeader, { step: 1, title: "Pick your market", sub: "Each sector starts with different cash, margins and pressure.", onBack: () => setStep(0) }),
          jsx(ScrollView, {
            style: { flex: 1 },
            contentContainerStyle: st.list,
            showsVerticalScrollIndicator: !1,
            children: Engine.SECTORS.map((s, idx) => {
              const on = s.id === sectorId;
              const n = sectorNumbers(s);
              return jsxs(
                Touchable,
                {
                  style: [st.sector, on && st.sectorOn],
                  onPress: () => setSectorId(s.id),
                  activeOpacity: 0.85,
                  dataSet: { ff: "rise" + Math.min(idx + 1, 4) },
                  children: [
                    jsxs(View, {
                      style: st.sectorTop,
                      children: [
                        jsx(View, { style: [st.sectorIcon, on && st.sectorIconOn], children: jsx(Text, { style: st.sectorEmoji, children: ICONS[s.id] || "🚀" }) }),
                        jsxs(View, {
                          style: { flex: 1 },
                          children: [
                            jsx(Text, { style: st.sectorName, children: sectorName(s) }),
                            jsx(Text, { style: st.sectorAr, numberOfLines: 1, children: sectorAlt(s) }),
                          ],
                        }),
                        jsx(View, {
                          style: [st.diff, { borderColor: DIFF_COLOR[s.difficulty_en] || COLOR.line }],
                          children: jsx(Text, { style: [st.diffTxt, { color: DIFF_COLOR[s.difficulty_en] || COLOR.text2 }], children: IS_AR ? s.difficulty_ar || s.difficulty_en : s.difficulty_en }),
                        }),
                      ],
                    }),
                    jsx(Text, { style: st.tagline, children: s.tagline }),
                    jsxs(View, {
                      style: st.statsRow,
                      children: [
                        [money(s.initial_cash), "starting cash"],
                        [Math.round((s.gross_margin || 0) * 100) + "%", "margin"],
                        [n.runway.toFixed(1) + " mo", "runway"],
                      ].map(([v, l]) =>
                        jsxs(View, { style: st.stat, children: [jsx(Text, { style: st.statV, children: v }), jsx(Text, { style: st.statL, children: l })] }, l),
                      ),
                    }),
                    on && jsx(Text, { style: st.desc, children: IS_AR ? s.what_it_does : s.desc_en }),
                    on && s.what_it_sells && jsx(Text, { style: st.descAr, children: s.what_it_sells }),
                  ],
                },
                s.id,
              );
            }),
          }),
          jsx(View, {
            style: st.footer,
            children: jsx(Touchable, {
              style: st.primaryBtn,
              onPress: () => setStep(2),
              activeOpacity: 0.85,
              children: jsx(Text, { style: st.primaryTxt, children: "Continue with " + sectorName(sector).split(" ")[0] + " ▸" }),
            }),
          }),
        ],
      });

    const ready = founder.trim() && company.trim();
    return jsxs(View, {
      style: st.container,
      children: [
        jsx(StepHeader, { step: 2, title: "Name your company", sub: ICONS[sector.id] + "  " + sectorName(sector), onBack: () => setStep(1) }),
        jsxs(ScrollView, {
          style: { flex: 1 },
          contentContainerStyle: st.list,
          keyboardShouldPersistTaps: "handled",
          children: [
            jsx(Text, { style: st.inputLabel, children: "FOUNDER" }),
            jsx(TextInput, { style: st.input, value: founder, onChangeText: setFounder, placeholder: "Your name", placeholderTextColor: COLOR.text3, maxLength: 24 }),
            jsx(Text, { style: st.inputLabel, children: "COMPANY" }),
            jsx(TextInput, { style: st.input, value: company, onChangeText: setCompany, placeholder: "Company name", placeholderTextColor: COLOR.text3, maxLength: 28 }),
            jsxs(View, {
              style: st.brief,
              dataSet: { ff: "rise1" },
              children: [
                jsx(Text, { style: st.briefKicker, children: "DAY ONE" }),
                jsxs(View, {
                  style: st.statsRow,
                  children: [
                    [money(sector.initial_cash), "in the bank", COLOR.vital],
                    [money(nums.burnWeek), "burn / week", COLOR.crit],
                    [nums.runway.toFixed(1) + " mo", "runway", COLOR.fog],
                  ].map(([v, l, c]) =>
                    jsxs(View, { style: st.stat, children: [jsx(Text, { style: [st.statV, { color: c }], children: v }), jsx(Text, { style: st.statL, children: l })] }, l),
                  ),
                }),
              ],
            }),
            jsxs(View, {
              style: st.rules,
              dataSet: { ff: "rise2" },
              children: [
                jsx(Text, { style: st.briefKicker, children: "HOW A WEEK WORKS" }),
                [
                  ["🎯", "Hit the weekly target by picking one strategy."],
                  ["⚡", "You get one personal action a week: rest, network, or reach out."],
                  ["⚖️", "Every few weeks a dilemma lands. There is no right option."],
                  ["🌫️", "Stress drains clarity. Below 40% the fog hides your numbers. At 5% it's over."],
                ].map(([icon, text]) =>
                  jsxs(View, { style: st.rule, children: [jsx(Text, { style: st.ruleIcon, children: icon }), jsx(Text, { style: st.ruleTxt, children: text })] }, icon),
                ),
                jsx(Text, { style: st.goal, children: "Goal: reach a $100M valuation before the cash — or you — run out." }),
              ],
            }),
          ],
        }),
        jsx(View, {
          style: st.footer,
          children: jsx(Touchable, {
            style: [st.primaryBtn, !ready && { opacity: 0.4 }],
            disabled: !ready,
            onPress: () => onStartGame({ founderName: founder.trim(), companyName: company.trim(), sectorId: sector.id }),
            activeOpacity: 0.85,
            children: jsx(Text, { style: st.primaryTxt, children: "Found " + (company.trim() || "the company") + " ▸" }),
          }),
        }),
      ],
    });
  };

  const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLOR.ink },
    titleWrap: { flex: 1, backgroundColor: COLOR.ink, justifyContent: "space-between", padding: 24, overflow: "hidden" },
    titleFog: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    titleCenter: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
    logoMark: { fontSize: 64, textAlign: "center" },
    logo: { fontFamily: "AzeretMono_600SemiBold", fontSize: 26, letterSpacing: 4, color: COLOR.text, textAlign: "center" },
    logoTag: { ...TYPE.body, fontSize: 14, lineHeight: 21, color: COLOR.text2, textAlign: "center", maxWidth: 300 },
    langSwitch: { direction: "ltr", flexDirection: "row", alignSelf: "center", marginTop: 8, padding: 3, borderRadius: 999, backgroundColor: COLOR.panel, borderWidth: 1, borderColor: COLOR.lineHot, zIndex: 5 },
    langOpt: { minWidth: 64, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
    langOptOn: { backgroundColor: COLOR.accent },
    langTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: COLOR.text2 },
    langTxtOn: { color: "#fff" },
    titleActions: { gap: 12, width: "100%", maxWidth: 440, alignSelf: "center" },
    saveCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLOR.panel,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: COLOR.lineHot,
      borderLeftWidth: 4,
      borderLeftColor: COLOR.vital,
    },
    saveKicker: { ...TYPE.label, color: COLOR.vital },
    saveTitle: { ...TYPE.screenTitle, fontSize: 18, color: COLOR.text, marginTop: 2 },
    saveSub: { ...TYPE.body, color: COLOR.text2, marginTop: 2 },
    saveArrow: { color: COLOR.vital, fontSize: 22, marginLeft: 8 },
    primaryBtn: { backgroundColor: COLOR.accent, borderRadius: 14, minHeight: 54, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
    primaryTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 16, color: "#fff", letterSpacing: 0.2 },
    secondaryBtn: { backgroundColor: COLOR.panel2, borderWidth: 1, borderColor: COLOR.line },
    secondaryTxt: { color: COLOR.text },
    discard: { alignItems: "center", paddingVertical: 8 },
    discardTxt: { ...TYPE.label, color: COLOR.text3, textTransform: "none" },
    stepHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    stepTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLOR.panel, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLOR.line },
    backTxt: { color: COLOR.text, fontSize: 24, lineHeight: 26, marginTop: -2 },
    dots: { flexDirection: "row", gap: 6 },
    dot: { width: 22, height: 4, borderRadius: 2, backgroundColor: COLOR.line },
    dotOn: { backgroundColor: COLOR.accent },
    stepTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 26, letterSpacing: -0.6, color: COLOR.text },
    stepSub: { ...TYPE.body, fontSize: 13.5, color: COLOR.text2, marginTop: 4 },
    list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, gap: 10, width: "100%", maxWidth: 560, alignSelf: "center" },
    sector: { backgroundColor: COLOR.panel, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: COLOR.line },
    sectorOn: { borderColor: COLOR.accent, backgroundColor: "#1c1a1d" },
    sectorTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    sectorIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: COLOR.panel2, alignItems: "center", justifyContent: "center" },
    sectorIconOn: { backgroundColor: "#3a1610" },
    sectorEmoji: { fontSize: 24 },
    sectorName: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: COLOR.text, letterSpacing: -0.2 },
    sectorAr: { ...TYPE.body, fontSize: 12, color: COLOR.text3, marginTop: 1, textAlign: "left" },
    diff: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
    diffTxt: { fontFamily: "AzeretMono_500Medium", fontSize: 10, letterSpacing: 0.4 },
    tagline: { ...TYPE.body, color: COLOR.act, marginTop: 10 },
    statsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    stat: { flex: 1, backgroundColor: COLOR.panel2, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
    statV: { fontFamily: "AzeretMono_600SemiBold", fontSize: 14, color: COLOR.text, letterSpacing: -0.3 },
    statL: { ...TYPE.body, fontSize: 10.5, color: COLOR.text3, marginTop: 2 },
    desc: { ...TYPE.body, fontSize: 13, lineHeight: 19, color: COLOR.text2, marginTop: 12 },
    descAr: { ...TYPE.body, fontSize: 12.5, lineHeight: 19, color: COLOR.text3, marginTop: 6, writingDirection: "rtl", textAlign: "right" },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLOR.line, backgroundColor: COLOR.ink },
    inputLabel: { ...TYPE.label, color: COLOR.text3, marginTop: 8 },
    input: {
      backgroundColor: COLOR.panel,
      borderWidth: 1.5,
      borderColor: COLOR.line,
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 54,
      fontFamily: "Archivo_600SemiBold",
      fontSize: 17,
      color: COLOR.text,
      outlineStyle: "none",
    },
    brief: { backgroundColor: COLOR.panel, borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1, borderColor: COLOR.line },
    briefKicker: { ...TYPE.label, color: COLOR.text3 },
    rules: { backgroundColor: COLOR.panel, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: COLOR.line },
    rule: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    ruleIcon: { fontSize: 16, width: 22, textAlign: "center" },
    ruleTxt: { ...TYPE.body, fontSize: 13, lineHeight: 19, color: COLOR.text2, flex: 1 },
    goal: { ...TYPE.body, fontSize: 13, color: COLOR.gold, marginTop: 2 },
  });
}
