// The autoplay player. Used by the Autoplay button and by tools/sim.js, so what you watch is what the balance tests measure.
(function () {
  const E = globalThis.ShelterEngine, D = globalThis.SHELTER_DATA;
  const BUILD = ['quarantine', 'clinic', 'workshop', 'radio', 'grow', 'filter', 'bench', 'common', 'bunks', 'grow', 'filter', 'trade'];

  // one day of management. Returns short notes saying what it did.
  function plan(S) {
    if (E.leader && E.leader(S) && S.lawDay !== S.day) { const n = E.needs(S).food, on = E.lawOn(S, 'rations'); if (!on && S.res.food < n * 4 && S.order > 30) E.toggleLaw(S, 'rations'); else if (on && S.res.food > n * 12) E.toggleLaw(S, 'rations'); }
    (S.incidents || []).slice().forEach(i => E.resolveIncident(S, i.id));
    const notes = [], find = t => S.rooms.filter(r => r.type === t);
    const free = () => S.slots.find(s => E.reachable(S, s.row, s.col) && !E.roomAt(S, s.row, s.col));
    if (S.couples && S.couples.length && !find('nursery').length && S.res.scrap >= 45) { const s = free(); if (s && E.build(S, 'nursery', s)) notes.push('Built Nursery.'); }
    if (E.kids && E.kids(S).length > 1 && !find('school').length && S.res.scrap >= 45) { const s = free(); if (s && E.build(S, 'school', s)) notes.push('Built School.'); }
    { const g = find('gate')[0]; if (g && S.res.scrap > 70) for (const k of ['alarm', 'traps', 'door', 'flood', 'turret']) { if (!E.hasDef(g, k) && S.res.scrap - E.DEFS[k].c.scrap > 50) { if (E.addDef(S, g, k)) notes.push(`Built ${E.DEFS[k].n} at the Gate.`); break; } } }
    if (S.deepTold) for (const t of ['vault', 'well', 'geo']) { const d = D.ROOMS[t]; if (find(t).length || S.res.scrap < d.build + 30) continue; let s = S.slots.find(x => x.row >= d.minRow && E.reachable(S, x.row, x.col) && !E.roomAt(S, x.row, x.col)); if (!s && S.res.scrap >= d.build + 40) { E.dig(S); s = S.slots.find(x => x.row >= d.minRow && E.reachable(S, x.row, x.col) && !E.roomAt(S, x.row, x.col)); } if (s && E.build(S, t, s)) { notes.push(`Built ${d.name}.`); break; } if (!s) break; }
    for (const t of BUILD) {
      const count = find(t).length, want = BUILD.slice(0, BUILD.indexOf(t) + 1).filter(x => x === t).length;
      if (count < want && S.res.scrap >= D.ROOMS[t].build + 8) {
        const best = () => S.slots.filter(s => E.reachable(S, s.row, s.col) && !E.roomAt(S, s.row, s.col)).sort((a, b) => E.layoutScore(S, t, b) - E.layoutScore(S, t, a))[0];
        let s = best();
        if (!s && S.res.scrap > 20) { E.dig(S); s = best(); }
        if (s && E.build(S, t, s)) notes.push(`Built ${D.ROOMS[t].name}.`);
        break;
      }
    }
    { // growing: more beds and more food rooms as headcount rises
      const n = E.humans(S).length, beds = E.bedsOf(S), need = E.needs(S);
      const bunk = find('bunks').filter(r => E.canExpand(S, r))[0];
      if (beds < n + 3 && E.roomFor(S)) { if (bunk && S.res.scrap >= 40 && E.expand(S, bunk)) notes.push('Widened the Bunks.'); else if (S.res.scrap >= D.ROOMS.bunks.build + 20) { let s = free(); if (!s && S.res.scrap > 50) { E.dig(S); s = free(); } if (s && E.build(S, 'bunks', s)) notes.push('Built Bunks.'); } }
      if (E.powerSupply(S) < E.powerDemand(S) + 2 && S.res.scrap >= D.ROOMS.generator.build + 10) { const g = find('generator').find(r => r.tier < 2 && S.res.scrap > E.upgradeCost(r) + 10); if (g && E.upgrade(S, g)) notes.push('Upgraded the Generator.'); else { let s = free(); if (!s && S.res.scrap > 50) { E.dig(S); s = free(); } if (s && E.build(S, 'generator', s)) notes.push('Built a Generator.'); } }
      const seats = t => find(t).reduce((a, r) => a + E.capOf(r), 0);
      if (n > seats('grow') + seats('cellar') + seats('pens') + seats('filter') + 4 && S.res.scrap >= 40 && E.powerSupply(S) >= E.powerDemand(S) + 1) { const t = S.res.food / Math.max(1, need.food) < S.res.water / Math.max(1, need.water) ? (find('cellar').length < find('grow').length ? 'cellar' : 'grow') : 'filter'; let s = free(); if (!s && S.res.scrap > 50) { E.dig(S); s = free(); } if (s && E.build(S, t, s)) notes.push(`Built ${D.ROOMS[t].name}.`); }
    }
    for (const r of S.rooms) if (['grow', 'filter', 'bunks'].includes(r.type) && r.tier < 2 && S.res.scrap > E.upgradeCost(r) + 25) { if (E.upgrade(S, r)) notes.push(`Upgraded ${D.ROOMS[r.type].name}.`); break; }
    if (S.res.scrap > 90) { const g = S.rooms.filter(r => (r.type === 'grow' || r.type === 'filter' || r.type === 'cellar') && E.canExpand(S, r)).sort((a, b) => E.W(a) - E.W(b))[0]; if (g && E.expand(S, g)) notes.push(`Widened the ${D.ROOMS[g.type].name}.`); }
    S.rooms.filter(r => r.broken).forEach(r => { if (E.repair(S, r)) notes.push(`Repaired ${D.ROOMS[r.type].name}.`); });
    S.rooms.filter(r => r.mold).forEach(r => { if (E.burnMold(S, r)) notes.push('Burned out the mold.'); });
    const usable = S.gear.filter(g => !S.people.some(p => p.alive && (p.weapon === g.id || p.armor === g.id)));
    for (const p of E.living(S).filter(x => !x.damned)) {
      if (!p.weapon) { const g = usable.find(x => x.kind !== 'armor'); if (g) { E.equip(S, p, g); usable.splice(usable.indexOf(g), 1); } }
      if (!p.armor) { const g = usable.find(x => x.kind === 'armor'); if (g) { E.equip(S, p, g); usable.splice(usable.indexOf(g), 1); } }
    }
    for (const p of E.living(S).filter(x => !x.damned && !x.away)) for (const k of ['epinephrine', 'grenade', 'first_aid', 'bandages', 'filter', 'backpack', 'flare']) { if (E.packOf(p).length >= E.PACK) break; if ((E.items(S)[k] || 0) > 0 && !E.carried(p, k)) E.pack(S, p, k); }
    if (find('workshop').length && S.res.scrap > 45) { if (E.living(S).some(p => !p.weapon)) E.craft(S, 0); else if (E.living(S).some(p => !p.armor)) E.craft(S, 9); }
    // take a quest about once a week, if a healthy armed team can be spared and nothing is coming tonight
    const Q = E.Q, hold = E.home(S).filter(p => !p.sealed && !p.damned && p.exh < 2 && p.hp >= E.maxHp(p) * .8 && p.stress < 7);
    if (!S.quest && S.day >= 4 && S.day % 6 === 4 && !(S.threat && S.threat.known) && E.home(S).filter(p => !p.sealed).length >= 6 && hold.length >= 3) {
      const opts = Q.available(S).filter(q => Q.level(S, q) <= 2 + Math.round(hold.reduce((a, p) => a + p.level, 0) / hold.length));
      if (opts.length) { const t = hold.sort((a, b) => (b.skills.melee + b.skills.ranged + (S.people.find(x => x === b).weapon ? 3 : 0)) - (a.skills.melee + a.skills.ranged + (a.weapon ? 3 : 0))).slice(0, 3); if (Q.start(S, opts[0].k, t.map(p => p.id))) notes.push(`${t.map(p => p.name).join(', ')} set out on ${opts[0].name}.`); }
    }
    const h = E.home(S).filter(p => !p.sealed);
    // staff the jobs that keep people alive first, best skill for each
    h.forEach(p => { if (p.room) p.room = null; });
    const jobs = [];
    if (S.threat && S.threat.known) find('gate').forEach(r => { jobs.push(r); jobs.push(r); }); // fighters first when trouble is coming
    find('generator').forEach(r => jobs.push(r));
    const need = E.needs(S), fc = E.forecast(S), first = S.res.water / Math.max(1, need.water) <= S.res.food / Math.max(1, need.food) ? ['filter', 'grow'] : ['grow', 'filter'];
    first.forEach(t => find(t).forEach(r => jobs.push(r)));
    find('gate').forEach(r => jobs.push(r));
    first.forEach(t => find(t).forEach(r => jobs.push(r)));
    ['clinic', 'workshop', 'radio', 'bench', 'common', 'trade'].forEach(t => find(t).forEach(r => jobs.push(r)));
    find('gate').forEach(r => jobs.push(r));
    const avail = h.filter(p => p.exh < 6);
    let runners = [];
    if (S.day >= 2 && !S.runs.length && avail.length >= 5) { avail.sort((a, b) => b.skills.survival + b.skills.melee - a.skills.survival - a.skills.melee); runners = avail.splice(0, 2); }
    for (const r of jobs) { const d = D.ROOMS[r.type]; if (!d.cap || E.workers(S, r).length >= E.capOf(r) || !avail.length) continue; avail.sort((a, b) => b.skills[d.skill] - a.skills[d.skill]); E.assign(S, avail.shift(), r); }
    avail.forEach(p => { const r = S.rooms.find(x => D.ROOMS[x.type].cap && E.workers(S, x).length < E.capOf(x)); if (r) E.assign(S, p, r); });
    if (runners.length) {
      const wantFuel = S.res.fuel < 8, open = S.sites.filter(s => s.visits < 3), fuelSites = open.filter(s => /gas|truck|auto|marina|farm/i.test(s.place));
      const sites = wantFuel && fuelSites.length ? fuelSites : open.slice().sort((a, b) => (b.status - a.status) || (a.miles - b.miles));
      if (sites.length && E.startRun(S, sites[0].id, runners.map(p => p.id), 2, false)) notes.push(`Sent ${runners.map(p => p.name).join(' and ')} to ${sites[0].name}.`);
    }
    if (S.res.rounds > 60 && S.rooms.some(r => r.type === 'trade')) for (const d of E.tradeDeals(S)) if ((d.k === 'food' && S.res.food < 12) || (d.k === 'water' && S.res.water < 12) || (d.k === 'meds' && S.res.meds < 3)) { if (E.buy(S, d)) notes.push(`Traded for ${D.RES_NAME[d.k].toLowerCase()}.`); }
    return notes;
  }
  // one step of playing a quest by hand
  function questStep(S) {
    const Q = E.Q, q = S.quest; if (!q) return;
    if (q.view === 'choice') {
      const st = Q.def(q).stages[q.stage], i = st.opts.findIndex(o => !o.cost || Object.keys(o.cost).every(k => S.res[k] >= o.cost[k])), j = st.opts.findIndex(o => o.sk && Q.team(S).some(p => p.alive && p.hp > 0 && E.pool(p, o.sk) >= 3));
      return void Q.choose(S, j >= 0 ? j : Math.max(0, i));
    }
    if (q.view === 'travel') {
      if (q.trip.res) { if (Q.tripNext(S)) Q.arrive(S); return; }
      const r = Q.tripStop(S);
      if (r) { for (let i = 0; i < r.o.length; i++) if (Q.road(S, i)) return; return; }
      if (Q.tripNext(S)) Q.arrive(S); return;
    }
    if (q.view === 'text') return void Q.next(S);
    if (q.view === 'end') return void Q.finish(S);
    const f = q.fight, up = Q.team(S).filter(p => p.alive && p.hp > 0);
    const dying = Q.team(S).find(p => p.alive && p.hp < 0), medic = up.filter(p => f.acts[p.id] > 0).sort((a, b) => b.skills.medicine - a.skills.medicine)[0];
    if (dying && medic && S.res.meds >= 1) return void Q.patch(S, medic.id, dying.id);
    for (const a of up) { if (f.acts[a.id] <= 0) continue; const pk = E.packOf(a), live = f.foes.filter(x => x.hp > 0).length, hurt = Q.team(S).some(b => b.alive && b.hp < E.maxHp(b) / 2), down = Q.team(S).some(b => b.alive && b.hp <= 0); for (let i = 0; i < pk.length; i++) { const k = pk[i].k; if ((k === 'grenade' && live >= 2) || (k === 'epinephrine' && down) || ((k === 'bandages' || k === 'first_aid') && hurt)) { if (Q.useItem(S, a.id, i)) return; } } }
    const p = up.find(x => f.acts[x.id] > 1); // keeps one action back to Block or Dodge
    if (p) { const list = f.foes.map((x, i) => [x, i]).filter(a => a[0].hp > 0).sort((a, b) => a[0].hp - b[0].hp); if (list.length) return void Q.attack(S, p.id, list[0][1]); }
    Q.endTurn(S);
  }
  // which button it presses on a story card
  function choose(S, c) {
    const k = c.key;
    if (k === 'sick') { const x = S.people.find(o => o.id === S.queue[0].p.id), d = x && x.ill && E.ILL[x.ill.k]; if (!d) return 2; if (d.bact && (E.items(S).antibiotics || 0) > 0) return 0; if (S.res.meds >= 4) return 1; return d.spread && E.cells(S) > E.sealed(S).length ? 3 : 2; }
    if (k === 'lawprompt') return c.choices[0].includes('Half rations') || c.choices[0].includes('Seal') ? 0 : 1;
    if (k === 'mercenary') return E.humans(S).length < E.bedsOf(S) ? 0 : 1;
    if (k === 'appoint' || k === 'succession') return 0;
    if (k === 'unrest') return 0;
    if (k === 'coup') return 1;
    if (k === 'body') { const n = E.needs(S).food; return S.res.food < n * 3 ? 2 : 0; }
    if (k === 'lots') return c.choices.length - 1 === 3 && E.humans(S).some(p => p.hunger >= 4) ? 2 : E.humans(S).some(p => p.hunger >= 4) ? 0 : c.choices.length - 1;
    if (k === 'kept') return S.res.food > 0 ? 0 : 2;
    if (k === 'signal' || k === 'gatecomer' || k === 'found_survivors') return E.humans(S).length < E.bedsOf(S) ? 0 : 1;
    if (k === 'quest') return 1;
    if (k === 'q_take') return E.humans(S).length > 8 ? 0 : 1;
    if (k === 'q_seats') return 1;
    if (k === 'q_first' || k === 'q_deep' || k === 'q_count') return 0;
    if (k === 'q_rival') return 0;
    if (k === 'truth') return Math.floor(Math.random() * 4);
    if (k === 'truth_q') return 0;
    if (k === 'q_end') return Math.floor(Math.random() * c.choices.length);
    if (k === 'rv_threat') return S.res.food >= 40 && S.res.water >= 40 ? 0 : 1;
    if (k === 'rv_ask') return (E.items(S).antibiotics || 0) > 1 || S.res.meds >= 12 ? 0 : 1;
    if (k === 'milestone') return S.res.food < 25 || S.res.water < 25 ? 0 : E.humans(S).length < E.bedsOf(S) ? 1 : 2;
    if (k === 'refugees') return !E.roomFor(S) ? 2 : E.humans(S).length + 2 <= E.bedsOf(S) && S.res.food > E.needs(S).food * 10 ? 0 : E.humans(S).length < E.bedsOf(S) ? 1 : 2;
    if (k === 'exodus') return S.res.food >= 6 ? 0 : 2;
    if (k === 'faction') { const n = (S.queue[0].p.ids || []).length; return E.home(S).length - n >= n * 2.5 ? 0 : E.home(S).length - n >= n * 1.5 ? 2 : 1; }
    if (k === 'toll') return S.res.rounds > 40 ? 0 : 1;
    return 0;
  }
  globalThis.ShelterBot = { plan, choose, questStep };
})();
