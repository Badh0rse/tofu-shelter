// Research: points earned every day, spent on six trees of upgrades (Buddy 2026-11-16, "like Infection Free Zone").
// Simple on purpose: each tree is a line of 4 or 5 upgrades, bought in order. The last upgrade of three trees opens a new ending.
// Invented for this game, for DB's review.
(function () {
  const E = globalThis.ShelterEngine, D = globalThis.SHELTER_DATA, EV = globalThis.SHELTER_EVENTS;
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // the Lab: where research gets done faster
  D.ROOMS.lab = { name: 'Lab', art: 'radio', skill: 'analysis', power: 1, cap: 2, build: 30, unique: true, desc: 'Benches, notebooks and a microscope from the high school. Each worker here adds Research Points every day (Analysis).' };

  E.TREES = [
    { k: 'arms', n: 'Arms', d: 'Guns, ammo, and the hands to keep them working.' },
    { k: 'food', n: 'Food & Water', d: 'Eat tomorrow as well as today.' },
    { k: 'med', n: 'Medicine & Science', d: 'Keep people alive. Learn what the rain does to them.' },
    { k: 'def', n: 'Defense', d: 'See them coming. Make them pay for every step.' },
    { k: 'trans', n: 'Salvage & Transport', d: 'Go further, carry more, hear further.' },
    { k: 'com', n: 'Community', d: 'What holds people together down here, for better or worse.' },
  ];
  E.TECH = {
    a1: { t: 'arms', c: 10, n: 'Reloading Drills', d: 'The Reloading Bench makes half again as many rounds.' },
    a2: { t: 'arms', c: 24, n: 'Ammo Discipline', d: 'Burst and full-auto guns use one round less per attack.' },
    a3: { t: 'arms', c: 40, n: 'Gun Care', d: 'Repair Shoddy weapons to Standard in the Inventory, for 6 scrap.' },
    a4: { t: 'arms', c: 60, n: 'Pipe Guns', d: 'The Workshop can make a Pipe Pistol (9mm) and a Slam-Fire Shotgun (12-gauge).' },
    a5: { t: 'arms', c: 78, n: 'Gunsmith', d: 'Make a Bolt Rifle (.308) and a Rebuilt AR (5.56mm). Every gun fires with +1 die. Repair Standard weapons to High-Quality for 16 scrap.' },
    f1: { t: 'food', c: 10, n: 'Hydroponics', d: 'Grow Beds and the Mushroom Cellar make 25% more food.' },
    f2: { t: 'food', c: 24, n: 'Canning', d: 'Store 40 more food.' },
    f3: { t: 'food', c: 40, n: 'Black-Rain Filters', d: 'Rain Filters make 25% more water, and heavy black rain never gets into the water.' },
    f4: { t: 'food', c: 60, n: 'Breeding Stock', d: 'Animal Pens make half again as much food.' },
    m1: { t: 'med', c: 10, n: 'Antibiotic Cultures', d: 'With a Clinic built, you grow one dose of antibiotics every 6 days.' },
    m2: { t: 'med', c: 24, n: 'Sterile Practice', d: 'Sick people roll +1 die to get better every day.' },
    m3: { t: 'med', c: 40, n: 'Damned Studies', d: 'Everyone sealed in Quarantine adds 1 Research Point a day. The Checkpoint always spots hidden infection.' },
    m4: { t: 'med', c: 60, n: 'The Cure', d: 'Something that might reverse the rain. At the 11th Hour, you can choose to release it.', end: 1 },
    d1: { t: 'def', c: 10, n: 'Watch Rotation', d: 'Anyone fighting at the Gate rolls +1 die.' },
    d2: { t: 'def', c: 24, n: 'Patrols', d: 'People in the Guard Room patrol at dawn. They spot what is coming tonight, and sometimes bring back scrap or food. Patrols can get hurt.' },
    d3: { t: 'def', c: 40, n: 'Kill Zones', d: 'Spike pits and tripwires hit for 5 instead of 3.' },
    d4: { t: 'def', c: 60, n: 'Turret Gunners', d: 'Scrap turrets fire at three enemies and use 2 rounds a fight instead of 4.' },
    t1: { t: 'trans', c: 10, n: 'Bicycles', d: 'Runs to far places come back in one day instead of two.' },
    t2: { t: 'trans', c: 24, n: 'Hand Carts', d: 'Every runner carries 30 lb more.' },
    t3: { t: 'trans', c: 40, n: 'Scout Maps', d: 'The Radio Room finds new places half again as fast.' },
    t4: { t: 'trans', c: 60, n: 'Radio Relay', d: 'A trade caravan comes every 7 days. At the 11th Hour you can always answer the other signal in the sky.', end: 1 },
    c1: { t: 'com', c: 10, n: 'Lessons', d: 'Everyone gains 1 extra experience a day.' },
    c2: { t: 'com', c: 24, n: 'Rituals', d: 'A staffed Chapel or Common Room takes 1 more Stress off everyone each day.' },
    c3: { t: 'com', c: 40, n: 'Shared Table', d: 'Everyone eats 10% less.' },
    c4: { t: 'com', c: 60, n: 'The Council', d: 'Elected heads of each room. The Trade Post earns double and Order rises every day. Opens an ending. Locks out The Congregation.', end: 1, lock: 'c5' },
    c5: { t: 'com', c: 60, n: 'The Congregation', d: 'One faith, one voice. Order and calm every day, and Stress melts away. Every 12 days, someone goes up into the rain at the end of the sermon. Opens an ending. Locks out The Council.', end: 1, lock: 'c4' },
  };
  const order = t => Object.keys(E.TECH).filter(k => E.TECH[k].t === t);
  const tech = S => S.tech || (S.tech = { rp: 0, got: [], earned: 0 });
  E.techOn = (S, k) => !!(S && S.tech && S.tech.got.includes(k));
  E.techRP = S => tech(S).rp;
  E.techState = (S, k) => { // 'got' | 'open' | 'locked' | 'later'
    const d = E.TECH[k], T = tech(S); if (T.got.includes(k)) return 'got';
    if (d.lock && T.got.includes(d.lock)) return 'locked';
    const line = order(d.t).filter(x => !E.TECH[x].lock || x === k), i = line.indexOf(k), prev = k === 'c5' ? 'c3' : line[i - 1];
    return !prev || T.got.includes(prev) ? 'open' : 'later';
  };
  E.buyTech = (S, k) => { const d = E.TECH[k], T = tech(S); if (!d || E.techState(S, k) !== 'open' || T.rp < d.c) return false; T.rp -= d.c; T.got.push(k); E.log(S, `Research done: ${d.n}.`, 'good'); return true; };
  E.techIncome = S => { // Research Points a day
    const lab = S.rooms.find(r => r.type === 'lab'), ws = lab && !lab.broken ? E.workers(S, lab) : [];
    let n = 1 + ws.reduce((a, p) => a + .5 + p.skills.analysis / 4, 0) + (ws.length ? lab.tier * .5 : 0);
    if (E.techOn(S, 'm3')) n += E.sealed(S).length;
    return Math.round(n * 10) / 10;
  };

  // ---- hooks into the rest of the game
  const oOut = E.outputOf; E.outputOf = (S, r, bo) => { let v = oOut(S, r, bo); if (!v) return v;
    if ((r.type === 'grow' || r.type === 'cellar') && E.techOn(S, 'f1')) v *= 1.25;
    if (r.type === 'filter' && E.techOn(S, 'f3')) v *= 1.25;
    if (r.type === 'pens' && E.techOn(S, 'f4')) v *= 1.5;
    return Math.round(v * 10) / 10; };
  const oCaps = E.storeCaps; E.storeCaps = S => { const c = oCaps(S); if (E.techOn(S, 'f2') && c.food != null) c.food += 40; return c; };
  const oKit = E.kitchenMult; E.kitchenMult = S => oKit(S) * (E.techOn(S, 'c3') ? .9 : 1);
  const oCarry = E.teamCarry; E.teamCarry = (S, team, truck) => oCarry(S, team, truck) + (E.techOn(S, 't2') ? team.length * 30 : 0);
  const oRun = E.startRun; E.startRun = (S, ...a) => { const ok = oRun(S, ...a); if (ok && E.techOn(S, 't1')) { const r = S.runs[S.runs.length - 1]; if (r) r.left = 1; } return ok; };
  E.repairCost = (S, g) => (!g || g.kind === 'armor') ? null : g.cond === 'Shoddy' && E.techOn(S, 'a3') ? 6 : g.cond === 'Standard' && E.techOn(S, 'a5') ? 16 : null;
  E.repairGear = (S, g) => { const c = E.repairCost(S, g); if (c == null || S.res.scrap < c) return false; S.res.scrap -= c; g.cond = g.cond === 'Shoddy' ? 'Standard' : 'High-Quality'; E.log(S, `Repaired the ${g.n}. It is ${g.cond} now.`, 'good'); return true; };

  // every morning
  const oEnd = E.endDay; E.endDay = S => {
    const d0 = S.day, before = { radio: S.radio }; const ok = oEnd(S); if (S.day === d0 || S.over) return ok;
    const T = tech(S), gain = E.techIncome(S); T.rp += gain; T.earned += gain;
    const home = E.home(S).filter(p => !p.sealed && !p.away), staffed = t => S.rooms.filter(r => r.type === t && !r.broken).some(r => E.workers(S, r).length);
    if (E.techOn(S, 'a1')) { const b = S.rooms.find(r => r.type === 'bench'), w = b && E.workers(S, b)[0]; if (w && !b.broken) { const add = Math.round((2 + b.tier + Math.floor(Math.max(0, E.pool(w, 'engineering')) / 2)) * 3 * .5); S.res.rounds += add; } }
    if (E.techOn(S, 'm1') && S.rooms.some(r => r.type === 'clinic') && S.day % 6 === 0) { E.addItem(S, 'antibiotics', 1); E.log(S, 'A new dose of antibiotics is ready.', 'good'); }
    if (E.techOn(S, 't3') && staffed('radio') && before.radio != null && S.radio > before.radio) S.radio += Math.round((S.radio - before.radio) * .5);
    if (E.techOn(S, 't4') && S.day % 7 === 0 && !S.queue.some(q => q.k === 'caravan')) S.queue.push({ k: 'caravan', p: {} });
    if (E.techOn(S, 'c1')) home.forEach(p => { p.xp += 1; });
    if (E.techOn(S, 'c2') && (staffed('chapel') || staffed('common'))) home.forEach(p => { p.stress = Math.max(0, p.stress - 1); });
    if (E.techOn(S, 'c4')) { if (staffed('trade')) { const w = E.workers(S, S.rooms.find(r => r.type === 'trade'))[0]; S.res.rounds += 2 + Math.floor(w.skills.negotiation / 2); } S.order = Math.min(100, (S.order || 50) + 1); }
    if (E.techOn(S, 'c5')) {
      S.order = Math.min(100, (S.order || 50) + 2); home.forEach(p => { p.stress = Math.max(0, p.stress - 1); });
      if (S.day % 12 === 0) { const h = E.humans(S).filter(p => !p.away && !p.sealed && !p.damned); if (h.length > 4) { const v = h.slice().sort((a, b) => (a.level - b.level) || (b.stress - a.stress))[0]; E.kill(S, v, 'Walked up into the rain at the end of the sermon. Everyone sang.'); E.say(S, 'The offering', `${v.name} raised a hand when the question was asked. Nobody stopped ${v.he === 'he' ? 'him' : 'her'}. The hatch was opened, and closed, and the singing went on a long time after.`); } }
    }
    if (E.techOn(S, 'd2') && S.threat) { // dawn patrol from the Guard Room
      const gr = S.rooms.find(r => r.type === 'guardroom'), ps = gr ? E.workers(S, gr).filter(p => p.hp > 0) : [];
      if (ps.length) {
        const best = ps.map(p => E.rollSkill(p, 'survival', 6)).reduce((a, r) => Math.max(a, r.succ), 0);
        if (best >= 1 && !S.threat.known) { S.threat.known = true; E.log(S, `The patrol saw signs of what is coming tonight: ${E.threatText ? E.threatText(S.threat) : 'trouble'}.`, 'good'); }
        if (best >= 2 && Math.random() < .5) { const s = 1 + Math.floor(Math.random() * 4); S.res.scrap += s; E.log(S, `The patrol brought back ${s} scrap.`, 'good'); }
        if (Math.random() < .1) { const p = pick(ps); p.hp = Math.max(1, p.hp - 2 - Math.floor(Math.random() * 3)); E.log(S, `${p.name} came back from patrol bleeding.`, 'bad'); }
        ps.forEach(p => { p.xp += 1; });
      }
    }
    return ok;
  };
  // the quest for the cure and the rest are spent in the morning; quests and runs also teach something
  const oQend = E.Q && E.Q.back; if (oQend) E.Q.back = S => { const n0 = (S.stat && S.stat.quests) || 0; const r = oQend(S); if (((S.stat && S.stat.quests) || 0) > n0) { tech(S).rp += 4; tech(S).earned += 4; } return r; };

  // ---- the endings research opens
  Object.assign(E.END, {
    cure: { t: 'The Cure', s: 'mixed', x: S => `You released it into the last of the rain. It worked. Every Damned in the county lay down in the street that week and got up as themselves, weeping, remembering everything they had done. They remembered you, too. Some of them forgave you. ${E.humans(S).length} of you lived to hear which ones did not.` },
    curefail: { t: 'The Second Rain', s: 'worst', x: S => `It was not a cure. It was a better version of the thing it was meant to stop. By morning the people above were not changing anymore. They were finished. By the next morning, so were you.` },
    council: { t: 'The Council', s: 'good', x: S => `The Council voted to open the hatch after the sky stopped falling, and you built a town on top of the shelter: walls, gardens, a school, a gallows. It is still running. Every spring the Council votes on who eats, and every spring the vote is very close.` },
    cult: { t: 'The Congregation', s: 'worst', x: S => `When the sky came down the whole shelter was singing. Nobody was afraid. Nobody had been afraid for months. The hatch stood open all night, and one by one, smiling, holding hands, ${E.humans(S).length ? 'they' : 'you'} walked up into the fire to meet it.` },
  });
  if (EV && EV.q_end) {
    const oV = EV.q_end.view, oP = EV.q_end.pick;
    EV.q_end.view = (S, p) => { const v = oV(S, p), extra = [];
      if (E.techOn(S, 'm4')) extra.push(['Release the cure into the rain', 'cure']);
      if (E.techOn(S, 'c4')) extra.push(['Let the Council decide: open the hatch and rebuild', 'council']);
      if (E.techOn(S, 'c5')) extra.push(['Gather the Congregation and open the hatch', 'cult']);
      if (E.techOn(S, 't4') && !(S.qend || []).includes('ships')) extra.push(['Answer the other signal in the sky', 'ships']);
      extra.forEach(([l, k]) => { const at = Math.max(0, v.choices.length - 1); v.choices.splice(at, 0, l); S.qend.splice(at, 0, k); });
      return v; };
    EV.q_end.pick = (S, p, i) => { const c = (S.qend || [])[i];
      if (c === 'cure') { const m = E.humans(S).slice().sort((a, b) => E.pool(b, 'medicine') - E.pool(a, 'medicine'))[0], r = m ? E.rollSkill(m, 'medicine', 7).succ : 0; return E.finish(S, r + Math.floor(Math.random() * 3) >= 2 ? 'cure' : 'curefail'); }
      if (c === 'council') return E.finish(S, 'council');
      if (c === 'cult') return E.finish(S, 'cult');
      return oP(S, p, i); };
  }
  if (E.END_HINT) Object.assign(E.END_HINT, { cure: 'Finish The Cure, and have a steady hand on the medicine.', curefail: 'Finish The Cure, with nobody who really knows medicine.', council: 'Form The Council.', cult: 'Join The Congregation.' });
})();
