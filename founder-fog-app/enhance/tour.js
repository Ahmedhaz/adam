  // ================================================================ tour
  // A hands-on tutorial for the very first week. Three short slides say what
  // the game is, then a spotlight walks the player through one whole turn
  // (weekly target, personal action, +1 Week) by having them do it, not read
  // about it. Plain DOM on top of everything, so it can also talk over the
  // open target sheet. The step lives in s.guide.tour; old saves never see it.
  // shares App's scope.

  const TOUR_TEXT = {
    slides: [
      { icon: "🚀", title: "You just started a company", text: (S) => `You have ${money(S.cash)} in the bank, and every week costs money. Your job: grow the company before the money runs out.` },
      { icon: "📅", title: "One week = one turn", text: () => "Every week you do three things: 1. pick this week's target, 2. use your one personal action, 3. press +1 Week." },
      { icon: "🏆", title: "How you win, how you lose", text: () => "You win by growing the company to a $100M valuation. You lose if the bank hits $0, or if your Clarity drops to 5%. So rest when you're tired." },
    ],
    bank: { title: "Your bank", text: (S) => `This is your money. You spend about ${money(S.weeklyBurn)} a week. Tap it any time to see where it goes.` },
    clarity: { title: "Your head", text: () => "Clarity is your energy. Stress drains it. Below 40%, a fog hides your numbers. At 5%, you burn out and the game ends." },
    target: { title: "Step 1 of 3: this week's target", text: () => "Tap the target to see what this week is about." },
    targetOpen: { title: "Step 1 of 3: pick a path", text: () => "Read the options and tap “Go with this” on one. Free paths save cash; paid ones give more." },
    action: { title: "Step 2 of 3: your personal action", text: () => "Once a week you do one thing for yourself or the company. Tap it." },
    actionOpen: { title: "Step 2 of 3: pick one action", text: () => "Pick any one. Wellness restores your Clarity, networking builds investor Trust. Each has a price." },
    week: { title: "Step 3 of 3: end the week", text: () => "Press +1 Week. Time moves on, money is spent and things happen." },
    done: { icon: "🎉", title: "That's the whole game", text: () => "Every week: target, action, +1 Week. New things unlock as you go, and the first one is waiting for you now." },
  };
  const TOUR_SPOT = { bank: "bank", clarity: "stats", target: "tile-t", action: "tile-a", week: "week" };

  let tourCtx = null,
    tourEl = null,
    tourRaf = 0,
    tourSlide = 0,
    tourDrawn = "";

  function tourHide() {
    if (tourEl) tourEl.style.display = "none";
    if (tourRaf) cancelAnimationFrame(tourRaf);
    tourRaf = 0;
    tourDrawn = "";
  }

  // which step the player is really on, given what they've already done
  function tourStep(c) {
    const g = c.S.guide;
    let step = g && !g.off && g.tour;
    if (!step) return null;
    if (step !== "done" && c.S.week >= 2) step = "done";
    if (step === "target" && (c.targetDone || !c.hasTarget)) step = "action";
    if (step === "action" && c.S.slotUsed) step = "week";
    return step;
  }

  // called on every render of the main screen
  function tourSync(c) {
    tourCtx = c;
    const step = tourStep(c);
    if (!step) return tourHide();
    if (step !== c.S.guide.tour) setTimeout(() => tourCtx && tourCtx.go(step), 0);
    // let the game's own pop-ups (week report, dilemma, mentor) go first
    if (c.busy) return tourHide();
    if (step === "target" && c.guideOpen) return tourDraw("targetOpen", null);
    if (step === "action" && c.tab === "actions") return tourDraw("actionOpen", null);
    if (step === "slides" || step === "done") return tourDraw(step, null);
    tourDraw(step, TOUR_SPOT[step]);
  }

  function tourNode(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function tourPic(emoji) {
    const k = PICS[String(emoji).replace(/️/g, "")];
    const n = tourNode("div", "ft-pic", k ? null : emoji);
    if (k) n.setAttribute("data-pic", k);
    return n;
  }
  function tourButton(label, cls, onClick) {
    const b = tourNode("button", cls, label);
    b.type = "button";
    b.addEventListener("click", (e) => (e.stopPropagation(), buzz(8), onClick()));
    return b;
  }

  function tourDraw(key, spot) {
    if (!tourEl) {
      tourEl = tourNode("div", null);
      tourEl.id = "ff-tour";
      document.body.appendChild(tourEl);
    }
    tourEl.style.display = "block";
    const id = key + "|" + (key === "slides" ? tourSlide : "") + "|" + tourCtx.S.week;
    if (id !== tourDrawn) {
      tourDrawn = id;
      tourEl.textContent = "";
      tourEl.className = spot ? "ft-spot" : key.endsWith("Open") ? "ft-banner" : "ft-modal";
      if (spot || !key.endsWith("Open")) ["t", "r", "b", "l", "c"].forEach((s) => tourEl.appendChild(tourNode("div", "ft-block ft-" + s)));
      if (spot) tourEl.appendChild(tourNode("div", "ft-ring"));
      tourEl.appendChild(tourCard(key, spot));
      if (spot) {
        const t = document.querySelector('[data-tour="' + spot + '"]');
        if (t && t.scrollIntoView) t.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
    if (!tourRaf) tourRaf = requestAnimationFrame(tourPlace);
  }

  function tourCard(key, spot) {
    const S = tourCtx.S,
      card = tourNode("div", "ft-card");
    card.setAttribute("role", "dialog");
    const info = key === "slides" ? TOUR_TEXT.slides[tourSlide] : TOUR_TEXT[key];
    if (info.icon) card.appendChild(tourPic(info.icon));
    card.appendChild(tourNode("div", "ft-title", info.title));
    card.appendChild(tourNode("div", "ft-text", info.text(S)));
    const row = tourNode("div", "ft-row");
    if (key === "slides") {
      const dots = tourNode("div", "ft-dots");
      TOUR_TEXT.slides.forEach((_, i) => dots.appendChild(tourNode("i", i === tourSlide ? "on" : null)));
      card.appendChild(dots);
      const last = tourSlide === TOUR_TEXT.slides.length - 1;
      row.appendChild(tourButton("Skip tutorial", "ft-skip", () => tourCtx.go(null)));
      row.appendChild(
        tourButton(last ? "Show me how" : "Next", "ft-next", () => {
          if (last) (tourSlide = 0), tourCtx.go("bank");
          else (tourSlide += 1), (tourDrawn = ""), tourSync(tourCtx);
        }),
      );
    } else if (key === "bank") row.appendChild(tourButton("Next", "ft-next", () => tourCtx.go("clarity")));
    else if (key === "clarity") row.appendChild(tourButton("Got it", "ft-next", () => tourCtx.go("target")));
    else if (key === "done") row.appendChild(tourButton("Let's play", "ft-next", () => tourCtx.go(null)));
    else row.appendChild(tourNode("div", "ft-hint", spot ? "👆 " + "Tap the highlighted button" : ""));
    card.appendChild(row);
    return card;
  }

  // keep the spotlight on its target while the layout moves
  function tourPlace() {
    tourRaf = 0;
    if (!tourEl || tourEl.style.display === "none") return;
    const spot = tourEl.className === "ft-spot" && TOUR_SPOT[tourStep(tourCtx)];
    const card = tourEl.querySelector(".ft-card");
    const W = window.innerWidth,
      H = window.innerHeight;
    const set = (sel, x, y, w, h) => {
      const n = tourEl.querySelector(sel);
      if (n) n.style.cssText = `left:${x}px;top:${y}px;width:${Math.max(0, w)}px;height:${Math.max(0, h)}px`;
    };
    if (spot) {
      const t = document.querySelector('[data-tour="' + spot + '"]');
      if (!t) {
        tourEl.style.visibility = "hidden";
      } else {
        tourEl.style.visibility = "";
        const r = t.getBoundingClientRect(),
          p = 6,
          x = r.left - p,
          y = r.top - p,
          w = r.width + 2 * p,
          h = r.height + 2 * p;
        set(".ft-t", 0, 0, W, y);
        set(".ft-b", 0, y + h, W, H - y - h);
        set(".ft-l", 0, y, x, h);
        set(".ft-r", x + w, y, W - x - w, h);
        // the target itself is only tappable when tapping it is the step
        const tap = spot === "tile-t" || spot === "tile-a" || spot === "week";
        set(".ft-c", x, y, tap ? 0 : w, tap ? 0 : h);
        set(".ft-ring", x, y, w, h);
        // the card sits on whichever side has more room
        const below = y + h + 14,
          ch = card.offsetHeight,
          cw = Math.min(340, W - 32),
          cx = Math.min(Math.max(16, x + w / 2 - cw / 2), W - 16 - cw),
          cy = H - below > ch + 16 ? below : Math.max(16, y - 14 - ch);
        card.style.cssText = `left:${cx}px;top:${cy}px;width:${cw}px`;
      }
    }
    tourRaf = requestAnimationFrame(tourPlace);
  }
