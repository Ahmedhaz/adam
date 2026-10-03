  // ================================================================ guide
  // A guided first month: a new player meets one system at a time instead of
  // ten at once. Features unlock by week, each with a one-card intro; the
  // engine keeps running underneath (nothing is paused, only hidden), except
  // the inbox, which isn't dealt until it unlocks so unseen mail can't
  // punish anyone. Off for old saves, challenges and players who turn it off.
  // shares App's scope.

  const GUIDE_KEY = "founderFog.guided";
  const FEATURES = [
    { id: "welcome", week: 1, icon: "🚀", title: "Your first week", text: "Hit the weekly target, use your one action, then press +1 Week. Tap your bank balance any time to see where the money goes." },
    { id: "customers", week: 2, icon: "🔍", title: "Customers", text: "Growth only works when people really want what you make. Talking to 5 customers each week is free, and it shows you your product-market fit." },
    { id: "inbox", week: 3, icon: "📨", title: "Your inbox", text: "Customers, investors and your team will write to you. Swipe to answer. Some messages punish silence; some are noise worth ignoring." },
    { id: "team", week: 4, icon: "👥", title: "Hiring", text: "Every hire has a job, and your first ten set the culture. New people take 4 weeks to reach full speed, so hire before the pain is daily." },
    { id: "fundraise", week: 5, icon: "💼", title: "Fundraising", text: "Investors will take a meeting now. Read the whole term sheet, not just the valuation. The money lands only after due diligence." },
    { id: "circle", week: 6, icon: "🤝", title: "Your circle", text: "Your co-founder, your investors, key customers and the people at home. Every relationship fades unless you reach out." },
  ];

  function guidedDefault() {
    try {
      return window.localStorage.getItem(GUIDE_KEY) !== "off";
    } catch (e) {
      return true;
    }
  }
  function setGuidedDefault(on) {
    try {
      window.localStorage.setItem(GUIDE_KEY, on ? "on" : "off");
    } catch (e) {}
  }

  // a save without s.guide (older versions) sees everything
  const unlocked = (s, id) => !s.guide || s.guide.off || s.week >= (FEATURES.find((f) => f.id === id) || { week: 0 }).week;
  const unlockWeek = (id) => (FEATURES.find((f) => f.id === id) || { week: 0 }).week;

  function startGuide(s, on) {
    s.guide = { off: !on, seen: {}, intro: null, tour: null };
    // brand-new players get the hands-on tour (tour.js) instead of the welcome card
    if (on) (s.guide.tour = "slides"), (s.guide.seen.welcome = 1), queueIntros(s);
  }
  // the next feature whose week has come and whose card hasn't been shown
  function queueIntros(s) {
    const g = s.guide;
    if (!g || g.off || g.intro) return;
    const f = FEATURES.find((x) => s.week >= x.week && !g.seen[x.id]);
    if (f) g.intro = f.id;
  }

  function IntroCard({ S, onDone, onOpen }) {
    const f = FEATURES.find((x) => x.id === S.guide.intro);
    if (!f) return null;
    const step = FEATURES.indexOf(f) + 1;
    return jsx(Modal, {
      visible: !0,
      transparent: !0,
      animationType: "fade",
      onRequestClose: onDone,
      children: jsx(View, {
        style: tst.overlay,
        children: jsxs(View, {
          style: [tst.note, { borderTopColor: COLOR.vital }],
          dataSet: { ff: "pop" },
          children: [
            jsx(Text, { style: [tst.kicker, { color: COLOR.vital }], children: f.id === "welcome" ? "WELCOME" : `NEW · ${step}/${FEATURES.length}` }),
            jsx(View, { style: { alignSelf: "center", marginTop: 10 }, dataSet: { ff: "float" }, children: jsx(Pic, { e: f.icon, size: 72 }) }),
            jsx(Text, { style: [tst.lesson, { textAlign: "center" }], children: f.title }),
            jsx(Text, { style: [tst.example, { textAlign: "center" }], children: f.text }),
            f.id !== "welcome" && jsx(Touchable, { style: tst.primary, activeOpacity: 0.85, onPress: () => onOpen(f.id), children: jsx(Text, { style: tst.primaryTxt, children: "Show me" }) }),
            jsx(Touchable, { style: f.id === "welcome" ? tst.primary : tst.secondary, activeOpacity: 0.85, onPress: onDone, children: jsx(Text, { style: f.id === "welcome" ? tst.primaryTxt : tst.secondaryTxt, children: f.id === "welcome" ? "Let's go" : "Later" }) }),
          ],
        }),
      }),
    });
  }
