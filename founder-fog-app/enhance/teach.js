  // ================================================================ teach
  // Phase 5 of the content plan: the player can name what they learned.
  //   * a mentor note after every dilemma (lesson, real-world example, reading)
  //     that also unlocks a page of the Founder Playbook
  //   * the Founder Playbook: 40 pages collected across runs, plus a glossary
  //   * an end-of-run founder report card: the ending's lesson, the turning
  //     point, six skill grades, what a veteran would have done, a shareable card
  //   * scenario challenges: short runs with one goal
  // Content lives in content/notes_*.js and content/playbook.js.
  // shares App's scope (see economy.js and the other modules).

  const NOTES = Object.assign({}, NOTES_A, NOTES_B, NOTES_C, NOTES_SAAS, NOTES_FIN, NOTES_MKT, NOTES_HEALTH, NOTES_EDU);
  const PAGE_BY_ID = {};
  PLAYBOOK.forEach((p) => (PAGE_BY_ID[p.id] = p));
  const SKILLS = [
    { id: "discovery", icon: "🔍", name: "Discovery" },
    { id: "frugality", icon: "🧾", name: "Frugality" },
    { id: "hiring", icon: "👥", name: "Hiring" },
    { id: "fundraising", icon: "💼", name: "Fundraising" },
    { id: "selfcare", icon: "🧘", name: "Self-care" },
    { id: "integrity", icon: "🛡", name: "Integrity" },
  ];

  // ------------------------------------------------- playbook (across runs)
  const BOOK_KEY = "founderFog.playbook",
    MENTOR_KEY = "founderFog.mentorNotes";
  function readBook() {
    try {
      return new Set(JSON.parse(window.localStorage.getItem(BOOK_KEY) || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  const BOOK = readBook();
  function unlockPage(s, id) {
    if (!PAGE_BY_ID[id]) return false;
    const t = ensureTeach(s);
    if (!t.pages.includes(id)) t.pages.push(id);
    if (BOOK.has(id)) return false;
    BOOK.add(id);
    try {
      window.localStorage.setItem(BOOK_KEY, JSON.stringify([...BOOK]));
    } catch (e) {}
    return true;
  }
  function mentorOn() {
    try {
      return window.localStorage.getItem(MENTOR_KEY) !== "off";
    } catch (e) {
      return true;
    }
  }
  function setMentor(on) {
    try {
      window.localStorage.setItem(MENTOR_KEY, on ? "on" : "off");
    } catch (e) {}
  }

  // ------------------------------------------------------------ challenges
  const CHALLENGES = {
    winter26: { icon: "🧊", name: "Survive the funding winter", goal: "Still running at week 26, in a downturn.", mode: "winter", deadline: 26, done: (s) => s.week >= 26 },
    fit20: { icon: "🔍", name: "Find fit in 20 weeks", goal: "Reach 40% product-market fit by week 20.", mode: "venture", deadline: 20, done: (s) => s.mkt && s.mkt.pmf >= 40 },
    control30: {
      icon: "🪑",
      name: "Raise and keep control",
      goal: "Close a round by week 30, keep 70% of the company and control of the board.",
      mode: "venture",
      deadline: 30,
      done: (s) => (s.rounds || []).some((r) => !r.pending) && (s.equity == null ? 100 : s.equity) >= 70 && !boardControl(s),
    },
    boot40: { icon: "🌱", name: "Default alive, bootstrapped", goal: "Reach default alive by week 40 without investors.", mode: "bootstrapped", deadline: 40, done: (s) => !!s.defaultAlive },
  };

  // --------------------------------------------------------------- tracking
  function ensureTeach(s) {
    if (!s.teach)
      s.teach = { talks: 0, builds: 0, hunches: 0, experiments: 0, rests: 0, contacts: 0, traps: 0, clarity: 0, weeks: 0, peakPmf: 0, everAlive: false, skill: {}, decisions: [], pages: [], note: null };
    return s.teach;
  }
  const W = { cash: 1 / 2000, monthlyRevenue: 1 / 400, mrrPct: 40, pmf: 0.5, clarity: 0.25, mentalClarity: 0.25, morale: 0.2, teamMorale: 0.2, equity: 1, churn: 2, churnRate: 2, trust: 0.2, investorTrust: 0.2, techDebt: 0.2, baseBurn: 1 / 300, cofounder: 0.2, partner: 0.2, family: 0.2, culture: 0.3, users: 1 / 200, activeUsers: 1 / 200, valuation: 1 / 100000 };
  const weightOf = (fx) => Object.keys(fx || {}).reduce((a, k) => a + Math.abs(fx[k]) * (W[k] || 0), 0);

  (function () {
    const P = Engine.StartupEngine.prototype;
    if (P.__teach) return;
    P.__teach = true;
    const count = (name, key, when) => {
      const orig = P[name];
      P[name] = function (...args) {
        const res = orig.apply(this, args);
        if (res && res.success !== false && (!when || when(args, this.state))) ensureTeach(this.state)[key] += 1;
        return res;
      };
    };
    count("talkToCustomers", "talks");
    count("buildProduct", "builds", (a) => a[0] != null);
    count("buildProduct", "hunches", (a) => a[0] == null);
    count("runExperiment", "experiments");
    count("executeActivity", "rests", (a) => a[0] && /Wellness|\u0627\u0644\u0639\u0627\u0641\u064a\u0629/.test(a[0].category || ""));
    count("contactRelationship", "contacts");
    count("signTermSheet", "traps", (a) => a[0] && a[0].control);

    const resolve = P.resolveEventChoice;
    P.resolveEventChoice = function (key = "option_A") {
      const s = this.state,
        t = ensureTeach(s),
        ev = s.pendingEvent;
      const res = resolve.call(this, key);
      if (ev && ev.id) {
        const note = NOTES[ev.id],
          side = key === "option_A" ? "A" : "B",
          lib = LIBRARY.find((d) => d.id === ev.id),
          fx = lib ? lib[side].fx : (ev[key] && ev[key].effects) || {};
        t.decisions.push({ week: s.week, id: ev.id, title: ev.title, choice: ev[key] && ev[key].title, weight: weightOf(fx) });
        if (note) {
          const sk = (note.skills || {})[side] || {};
          for (const k in sk) t.skill[k] = (t.skill[k] || 0) + sk[k];
          const fresh = unlockPage(s, note.page);
          t.note = { id: ev.id, fresh: fresh };
        }
      }
      return res;
    };

    const advance = P.advanceWeek;
    P.advanceWeek = function () {
      advance.call(this);
      const s = this.state,
        t = ensureTeach(s);
      t.weeks += 1;
      t.clarity += s.mentalClarity;
      t.peakPmf = Math.max(t.peakPmf, (s.mkt && s.mkt.pmf) || 0);
      if (s.defaultAlive && !t.everAlive) {
        t.everAlive = true;
        unlockPage(s, "default_alive");
      }
      if ((s.rounds || []).some((r) => !r.pending)) unlockPage(s, "term_sheet");
      // challenges
      const c = s.challenge && CHALLENGES[s.challenge];
      if (c && !s.gameOver && !s.victory) {
        if (c.done(s)) {
          s.victory = !0;
          s.overType = "challenge";
          s.endReason = `Challenge complete: ${c.name}.`;
        } else if (s.week >= c.deadline) {
          s.gameOver = !0;
          s.overType = "challenge_failed";
          s.endReason = `Challenge failed: ${c.name}.`;
        }
      }
      return s;
    };
  })();

  // ----------------------------------------------------------- report card
  const grade = (v) => (v >= 85 ? "A" : v >= 70 ? "B" : v >= 55 ? "C" : v >= 40 ? "D" : "F");
  function skillScores(s) {
    const t = ensureTeach(s),
      o = s.org || {},
      wk = Math.max(1, t.weeks),
      sk = (k) => (t.skill[k] || 0) * 6,
      nour = rel(s, "nour"),
      fam = rel(s, "fam"),
      end = s.overType;
    const v = {
      discovery: 35 + Math.min(30, (t.talks / wk) * 45) + t.builds * 3 + t.experiments * 2 - t.hunches * 3 + (t.peakPmf - 30) * 0.6 + sk("discovery"),
      frugality: 50 + (t.everAlive ? 20 : 0) - (end === "bank" ? 25 : 0) + Math.min(10, wk / 5) + sk("frugality"),
      hiring: 45 + ((o.culture == null ? 60 : o.culture) - 60) * 0.8 + (o.cofounderGone ? -12 : 10) + sk("hiring") - (end === "cofounder" ? 20 : 0),
      fundraising: 50 + (s.rounds || []).filter((r) => !r.pending).length * 8 - t.traps * 12 + ((s.equity == null ? 100 : s.equity) - 60) * 0.3 + (o.board ? (o.board.trust - 50) * 0.3 : 0) + sk("fundraising") - (end === "board" ? 30 : 0),
      selfcare: t.clarity / wk - 15 + ((nour ? nour.health : 60) + (fam ? fam.health : 60) - 100) * 0.2 + t.rests * 2 + sk("selfcare") - (end === "burn" || end === "alone" ? 25 : 0),
      integrity: 60 + sk("integrity") * 1.3,
    };
    const out = {};
    for (const k in v) out[k] = clamp(Math.round(v[k]), 0, 100);
    return out;
  }
  function turningPoint(s) {
    const t = ensureTeach(s),
      hits = (s.echoLog || []).map((e) => ({ week: e.from, weight: weightOf(e.fx) * 1.5 }));
    let best = null;
    t.decisions.forEach((d) => {
      const echo = hits.filter((h) => h.week === d.week).reduce((a, h) => a + h.weight, 0);
      const w = d.weight + echo;
      if (!best || w > best.w) best = { ...d, w: w };
    });
    return best;
  }

  function ReportCard({ S, onEnding, onRestart }) {
    const sc = skillScores(S),
      t = ensureTeach(S),
      tp = turningPoint(S),
      weakest = SKILLS.slice().sort((a, b) => sc[a.id] - sc[b.id]).slice(0, 2),
      c = S.challenge && CHALLENGES[S.challenge],
      win = !!S.victory,
      tpTitle = tp ? leadEmoji(String(tp.title || ""))[1] : "";
    const share = () => shareCard(S, sc);
    return jsx(Screen, {
      style: { flex: 1, backgroundColor: COLOR.ink },
      children: jsx(ScrollView, {
        contentContainerStyle: tst.wrap,
        children: [
          jsx(Text, { style: [tst.kicker, { color: win ? COLOR.gold : COLOR.crit }], children: "FOUNDER REPORT CARD" }, "k"),
          jsx(Text, { style: tst.title, children: S.companyName }, "t"),
          jsx(Text, { style: tst.sub, children: `${S.founderName} · ${S.week} weeks · ${(MODES[S.mode] || MODES.venture).name}` + (c ? " · " + c.name : "") }, "s"),
          jsxs(
            View,
            {
              style: [tst.endBox, { borderColor: win ? COLOR.gold : COLOR.crit }],
              children: [jsx(Text, { style: tst.endTitle, children: S.endReason || "" }), END_LESSONS[S.overType] ? jsx(Text, { style: tst.endLesson, children: END_LESSONS[S.overType] }) : null],
            },
            "end",
          ),
          jsx(MetaReport, { S: S }, "meta"),
          tp &&
            jsxs(
              View,
              {
                style: tst.card,
                children: [
                  jsx(Text, { style: tst.cardKicker, children: "THE TURNING POINT" }),
                  jsx(Text, { style: tst.cardTitle, children: `Week ${tp.week}: ${tpTitle}` }),
                  tp.choice ? jsx(Text, { style: tst.cardText, children: "You chose: " + tp.choice }) : null,
                  jsx(Text, { style: tst.hint, children: "The decision that moved your company most, including what came back later." }),
                ],
              },
              "tp",
            ),
          jsxs(
            View,
            {
              style: tst.card,
              children: [
                jsx(Text, { style: tst.cardKicker, children: "SKILLS" }),
                ...SKILLS.map((k) =>
                  jsxs(
                    View,
                    {
                      style: tst.skillRow,
                      children: [
                        jsx(Pic, { e: k.icon, size: 24 }),
                        jsx(Text, { style: tst.skillName, children: k.name }),
                        jsx(View, { style: tst.track, children: jsx(View, { style: [tst.fill, { width: Math.max(4, sc[k.id]) + "%", backgroundColor: sc[k.id] >= 70 ? COLOR.vital : sc[k.id] >= 40 ? COLOR.fog : COLOR.crit }] }) }),
                        jsx(Text, { style: [tst.grade, { color: sc[k.id] >= 70 ? COLOR.vital : sc[k.id] >= 40 ? COLOR.fog : COLOR.crit }], children: grade(sc[k.id]) }),
                      ],
                    },
                    k.id,
                  ),
                ),
              ],
            },
            "sk",
          ),
          jsxs(
            View,
            {
              style: tst.card,
              children: [
                jsx(Text, { style: tst.cardKicker, children: "WHAT A VETERAN WOULD HAVE DONE" }),
                ...weakest.map((k) => jsxs(View, { style: tst.advice, children: [jsx(Pic, { e: k.icon, size: 22 }), jsx(Text, { style: tst.cardText, children: SKILL_ADVICE[k.id][0] })] }, k.id)),
              ],
            },
            "adv",
          ),
          jsx(Text, { style: tst.hint, children: `Playbook: ${t.pages.length} pages this run · ${BOOK.size}/${PLAYBOOK.length} collected` }, "pb"),
          jsx(Touchable, { style: tst.primary, activeOpacity: 0.85, onPress: share, children: jsx(Text, { style: tst.primaryTxt, children: "📤  Share my card" }) }, "sh"),
          jsx(Touchable, { style: tst.secondary, activeOpacity: 0.85, onPress: onEnding, children: jsx(Text, { style: tst.secondaryTxt, children: "See the ending" }) }, "en"),
          jsx(Touchable, { style: tst.secondary, activeOpacity: 0.85, onPress: onRestart, children: jsx(Text, { style: tst.secondaryTxt, children: "Play again" }) }, "re"),
        ],
      }),
    });
  }

  // a 1080x1350 image of the report card, shared or downloaded
  function shareCard(S, sc) {
    try {
      const W = 1080,
        H = 1350,
        cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const g = cv.getContext("2d"),
        rtl = IS_AR,
        x0 = rtl ? W - 90 : 90;
      g.direction = rtl ? "rtl" : "ltr";
      g.textAlign = rtl ? "right" : "left";
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#CFE3FF");
      bg.addColorStop(1, "#F7F9FC");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#1C2430";
      g.font = "600 40px Archivo_600SemiBold, sans-serif";
      g.fillText("FOUNDER FOG", x0, 120);
      g.font = "600 76px Archivo_600SemiBold, sans-serif";
      g.fillText(S.companyName, x0, 230);
      g.font = "500 40px Archivo_500Medium, sans-serif";
      g.fillStyle = "#4E5A6B";
      g.fillText(`${S.founderName} · ${S.week} weeks`, x0, 300);
      g.fillStyle = S.victory ? "#B07D00" : "#E5484D";
      g.font = "600 46px Archivo_600SemiBold, sans-serif";
      const words = String(S.endReason || "").split(" ");
      let line = "",
        y = 400;
      words.forEach((w) => {
        if (g.measureText(line + w).width > W - 180) {
          g.fillText(line.trim(), x0, y);
          line = "";
          y += 60;
        }
        line += w + " ";
      });
      g.fillText(line.trim(), x0, y);
      y += 110;
      SKILLS.forEach((k) => {
        g.fillStyle = "#FFFFFF";
        g.fillRect(90, y - 60, W - 180, 96);
        g.fillStyle = "#1C2430";
        g.font = "500 42px Archivo_500Medium, sans-serif";
        g.textAlign = rtl ? "right" : "left";
        g.fillText(k.name, rtl ? W - 130 : 130, y);
        g.font = "600 56px AzeretMono_600SemiBold, monospace";
        g.fillStyle = sc[k.id] >= 70 ? "#22A559" : sc[k.id] >= 40 ? "#E38A00" : "#E5484D";
        g.textAlign = rtl ? "left" : "right";
        g.fillText(grade(sc[k.id]), rtl ? 130 : W - 130, y + 6);
        y += 120;
      });
      g.textAlign = "center";
      g.fillStyle = "#4E5A6B";
      g.font = "500 34px Archivo_500Medium, sans-serif";
      g.fillText("Can you do better? Play Founder Fog.", W / 2, H - 70);
      cv.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "founder-fog-report.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: "Founder Fog" }).catch(() => {});
        else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "founder-fog-report.png";
          a.click();
        }
      }, "image/png");
    } catch (e) {}
  }

  // ------------------------------------------------------------ mentor note
  function MentorModal({ S, onClose }) {
    const t = ensureTeach(S),
      n = t.note && NOTES[t.note.id],
      page = n && PAGE_BY_ID[n.page];
    if (!n) return null;
    return jsx(Modal, {
      visible: !0,
      transparent: !0,
      animationType: "fade",
      onRequestClose: () => onClose(true),
      children: jsx(View, {
        style: tst.overlay,
        children: jsxs(View, {
          style: tst.note,
          dataSet: { ff: "pop" },
          children: [
            jsxs(View, { style: tst.noteTop, children: [jsx(Pic, { e: "🎓", size: 40 }), jsx(Text, { style: [tst.kicker, { color: COLOR.act }], children: "MENTOR NOTE" })] }),
            jsx(Text, { style: tst.lesson, children: n.lesson }),
            jsx(Text, { style: tst.example, children: n.example }),
            jsx(Text, { style: tst.read, children: "📚 " + n.read }),
            page && jsx(View, { style: tst.unlock, children: jsx(Text, { style: tst.unlockTxt, children: (t.note.fresh ? "📖 New playbook page: " : "📖 Playbook: ") + page.title }) }),
            jsx(Touchable, { style: tst.primary, activeOpacity: 0.85, onPress: () => onClose(true), children: jsx(Text, { style: tst.primaryTxt, children: "Got it" }) }),
            jsx(Touchable, { style: { alignSelf: "center", padding: 8 }, onPress: () => (setMentor(false), onClose(false)), children: jsx(Text, { style: tst.off, children: "Turn off mentor notes" }) }),
          ],
        }),
      }),
    });
  }

  // --------------------------------------------------------------- playbook
  function PlaybookModal({ onClose, notify }) {
    const [tab, setTab] = React.useState("pages"),
      [open, setOpen] = React.useState(null),
      [on, setOn] = React.useState(mentorOn());
    const page = open && PAGE_BY_ID[open];
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
          children: page
            ? jsx(ScrollView, {
                children: [
                  jsx(Touchable, { onPress: () => setOpen(null), style: { paddingVertical: 6 }, children: jsx(Text, { style: tst.back, children: "‹ All pages" }) }, "b"),
                  jsx(Pic, { e: page.icon, size: 56 }, "i"),
                  jsx(Text, { style: est.title, children: page.title }, "t"),
                  jsx(Text, { style: tst.pageBody, children: page.body }, "p"),
                  jsx(Text, { style: tst.read, children: "📚 " + page.source }, "s"),
                ],
              })
            : jsx(ScrollView, {
                children: [
                  jsx(Text, { style: est.kicker, children: `FOUNDER PLAYBOOK · ${BOOK.size}/${PLAYBOOK.length}` }, "k"),
                  jsx(Text, { style: est.title, children: tab === "pages" ? "What you've learned" : "Glossary" }, "t"),
                  jsx(
                    View,
                    {
                      style: tst.tabs,
                      children: [
                        ["pages", "Pages"],
                        ["glossary", "Glossary"],
                      ].map(([k, l]) => jsx(Touchable, { style: [tst.tab, tab === k && tst.tabOn], onPress: () => setTab(k), children: jsx(Text, { style: [tst.tabTxt, tab === k && { color: "#fff" }], children: l }) }, k)),
                    },
                    "tabs",
                  ),
                  ...(tab === "pages"
                    ? PLAYBOOK.map((p) => {
                        const got = BOOK.has(p.id);
                        return jsxs(
                          Touchable,
                          {
                            style: [tst.pageRow, !got && { opacity: 0.5 }],
                            activeOpacity: 0.85,
                            onPress: () => (got ? setOpen(p.id) : notify("Unlock it by facing the dilemma that teaches it.", "info")),
                            children: [jsx(Pic, { e: got ? p.icon : "🔒", size: 26 }), jsx(Text, { style: tst.pageTitle, children: p.title })],
                          },
                          p.id,
                        );
                      })
                    : GLOSSARY.map((g) => jsxs(View, { style: tst.gloss, children: [jsx(Text, { style: tst.term, children: g.term }), jsx(Text, { style: tst.cardText, children: g.def })] }, g.term))),
                  jsx(
                    Touchable,
                    {
                      style: [tst.secondary, { marginTop: 16 }],
                      onPress: () => (setMentor(!on), setOn(!on)),
                      children: jsx(Text, { style: tst.secondaryTxt, children: on ? "Mentor notes: on" : "Mentor notes: off" }),
                    },
                    "mn",
                  ),
                ],
              }),
        }),
      }),
    });
  }
  const glossaryDef = (term) => (GLOSSARY.find((g) => g.term === term) || {}).def;

  const tst = StyleSheet.create({
    wrap: { padding: 20, paddingBottom: 40, maxWidth: 600, width: "100%", alignSelf: "center" },
    kicker: { fontFamily: "AzeretMono_500Medium", fontSize: 11, letterSpacing: 1.2, color: COLOR.text3 },
    title: { fontFamily: "Archivo_600SemiBold", fontSize: 30, letterSpacing: -0.6, color: COLOR.text, marginTop: 6 },
    sub: { fontFamily: "Archivo_500Medium", fontSize: 13.5, color: COLOR.text2, marginTop: 4 },
    endBox: { backgroundColor: COLOR.panel, borderRadius: 18, padding: 16, marginTop: 16, borderLeftWidth: 4, borderWidth: 1 },
    endTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 19, lineHeight: 25, color: COLOR.text },
    endLesson: { fontFamily: "Archivo_400Regular", fontSize: 14.5, lineHeight: 21, color: COLOR.text2, marginTop: 8, fontStyle: "italic" },
    card: { backgroundColor: COLOR.panel, borderRadius: 18, padding: 16, marginTop: 12, borderWidth: 1, borderColor: COLOR.line },
    cardKicker: { fontFamily: "AzeretMono_500Medium", fontSize: 10, letterSpacing: 1.2, color: COLOR.text3, marginBottom: 8 },
    cardTitle: { fontFamily: "Archivo_600SemiBold", fontSize: 16, lineHeight: 22, color: COLOR.text },
    cardText: { flex: 1, fontFamily: "Archivo_400Regular", fontSize: 14, lineHeight: 20, color: COLOR.text2, marginTop: 4 },
    hint: { fontFamily: "Archivo_400Regular", fontSize: 12.5, lineHeight: 18, color: COLOR.text3, marginTop: 8 },
    skillRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
    skillName: { width: 92, fontFamily: "Archivo_500Medium", fontSize: 14, color: COLOR.text },
    track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: COLOR.panel2, overflow: "hidden" },
    fill: { height: 10, borderRadius: 5 },
    grade: { width: 28, textAlign: "center", fontFamily: "AzeretMono_600SemiBold", fontSize: 20 },
    advice: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 6 },
    primary: { backgroundColor: COLOR.accent, borderRadius: 14, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 16 },
    primaryTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 15.5, color: "#fff" },
    secondary: { backgroundColor: COLOR.panel, borderRadius: 14, minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: COLOR.line },
    secondaryTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 14.5, color: COLOR.text },
    overlay: { flex: 1, backgroundColor: "rgba(24,34,48,0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
    note: { backgroundColor: COLOR.panel, borderRadius: 22, padding: 20, width: "100%", maxWidth: 460, borderTopWidth: 3, borderTopColor: COLOR.act },
    noteTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    lesson: { fontFamily: "Archivo_600SemiBold", fontSize: 19, lineHeight: 26, color: COLOR.text, marginTop: 12 },
    example: { fontFamily: "Archivo_400Regular", fontSize: 14.5, lineHeight: 21, color: COLOR.text2, marginTop: 10 },
    read: { fontFamily: "Archivo_500Medium", fontSize: 13, color: COLOR.text3, marginTop: 12 },
    unlock: { backgroundColor: "#FFF4D6", borderRadius: 12, padding: 10, marginTop: 12 },
    unlockTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13.5, color: COLOR.gold },
    off: { fontFamily: "Archivo_500Medium", fontSize: 12.5, color: COLOR.text3 },
    tabs: { flexDirection: "row", gap: 8, marginBottom: 8 },
    tab: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: "center", backgroundColor: COLOR.panel2 },
    tabOn: { backgroundColor: COLOR.act },
    tabTxt: { fontFamily: "Archivo_600SemiBold", fontSize: 13.5, color: COLOR.text2 },
    pageRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLOR.line },
    pageTitle: { flex: 1, fontFamily: "Archivo_500Medium", fontSize: 15, color: COLOR.text },
    pageBody: { fontFamily: "Archivo_400Regular", fontSize: 15.5, lineHeight: 24, color: COLOR.text, marginTop: 6 },
    back: { fontFamily: "Archivo_600SemiBold", fontSize: 14, color: COLOR.act },
    gloss: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLOR.line },
    term: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: COLOR.text },
  });
