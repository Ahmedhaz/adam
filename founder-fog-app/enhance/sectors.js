  // ================================================================ sectors
  // Industry packs: each sector gets its own dilemmas, mail and mentor notes
  // (wired in stories.js and teach.js) plus, from content/sector_*.js, the
  // role names of its key relationships, customer insights, experiments,
  // weekly targets, a challenge and a Founder Playbook page.
  // shares App's scope.

  const SECTOR_PACKS = [SECTOR_SAAS, SECTOR_FIN, SECTOR_MKT, SECTOR_HEALTH, SECTOR_EDU];
  function sectorPack(s) {
    const id = s && s.sector && s.sector.id;
    return SECTOR_PACKS.find((p) => p.sector === id) || null;
  }

  // what customers say in this industry, mixed with the general insights
  function sectorInsights(s) {
    const p = sectorPack(s);
    return p ? p.insights : [];
  }

  // two industry experiments, run like the general ones
  const XFX = {
    arpu: (s, v) => (s.arpu = Math.max(1, s.arpu + v)),
    churn: (s, v) => (s.churnRate = Math.min(25, Math.max(0.5, s.churnRate + v))),
    cacPct: (s, v) => (s.cac = Math.max(10, Math.round(s.cac * (1 + v)))),
    users: (s, v) => (s.activeUsers = Math.max(0, s.activeUsers + v)),
    clarity: (s, v) => (s.mentalClarity = Math.min(100, Math.max(0, s.mentalClarity + v))),
    techDebt: (s, v) => (s.techDebt = Math.min(100, Math.max(0, s.techDebt + v))),
    trust: (s, v) => (s.investorTrust = Math.min(100, Math.max(0, (s.investorTrust == null ? 80 : s.investorTrust) + v))),
  };
  const runXfx = (s, fx) => {
    Object.keys(fx || {}).forEach((k) => XFX[k] && XFX[k](s, fx[k]));
    return (fx && fx.pmf) || 0;
  };
  const SECTOR_EXPERIMENTS = [].concat(
    ...SECTOR_PACKS.map((p) =>
      p.experiments.map((x) => ({ id: x.id, sector: p.sector, area: x.area, title: x.title, win: (s) => runXfx(s, x.win), winText: x.winText, lose: (s) => runXfx(s, x.lose), loseText: x.loseText })),
    ),
  );
  function experimentsFor(s) {
    const id = s && s.sector && s.sector.id;
    return SECTOR_EXPERIMENTS.filter((x) => x.sector === id).concat(EXPERIMENTS);
  }

  // the weekly target generator (engine module 264) gets each industry's targets
  (function () {
    const G = typeof __r === "function" ? __r(264) : null;
    if (!G || !G.__addTemplates || G.__sectors) return;
    G.__sectors = true;
    const H = G.__helpers;
    const scale = (fx, stage) => {
      const out = {};
      Object.keys(fx).forEach((k) => (out[k] = k === "monthlyRevenue" || k === "cash" ? Math.sign(fx[k]) * H.t(Math.abs(fx[k]), stage) : fx[k]));
      return out;
    };
    const templates = [];
    SECTOR_PACKS.forEach((p) =>
      p.targets.forEach((t) =>
        templates.push({
          id: t.id,
          urgency: t.urgency,
          condition: (s) => !!s.sector && s.sector.id === p.sector && (!t.once || !(s.msDone || []).includes(t.id)) && t.when(s),
          build: (s) => {
            if (t.once) (s.msDone = s.msDone || []).push(t.id);
            return {
              title: t.title,
              tasks: t.tasks,
              reward_exp: t.once ? 120 : 95,
              whyItMatters: t.why,
              strategies: t.strategies.map((x, i) => H.o(t.id + "_" + (i + 1), x.path, x.title, x.desc, x.cost, s.stage, x.tab, scale(x.fx, s.stage), x.log)),
            };
          },
        }),
      ),
    );
    G.__addTemplates(templates);
  })();

  // one challenge per industry (the setup screen fixes the market)
  SECTOR_PACKS.forEach((p) => {
    const c = p.challenge;
    CHALLENGES[c.id] = { icon: c.icon, name: c.name, goal: c.goal, mode: c.mode, deadline: c.deadline, done: c.done, sector: p.sector };
  });
  const sectorChallenges = () => SECTOR_PACKS.map((p) => ({ id: p.challenge.id, icon: p.challenge.icon, name: p.challenge.name, goal: p.challenge.goal, mode: p.challenge.mode, sector: p.sector }));

  // and one Founder Playbook page each
  SECTOR_PACKS.forEach((p) => {
    if (PAGE_BY_ID[p.page.id]) return;
    PLAYBOOK.push(p.page);
    PAGE_BY_ID[p.page.id] = p.page;
  });

  // who Northwind Retail and Omar Sabry are to a company in this industry
  function applySectorRoles(s) {
    const p = sectorPack(s);
    if (!p) return;
    (s.relationships || []).forEach((r) => {
      if (r.id === "c1" && p.roles.c1) r.role = p.roles.c1;
      if (r.id === "c2" && p.roles.c2) r.role = p.roles.c2;
    });
  }
