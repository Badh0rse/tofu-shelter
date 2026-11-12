// TOFU Shelter rules. No drawing in here, so tools/sim.js can play whole games.
(function () {
  const D = globalThis.SHELTER_DATA, G = globalThis.GEN;
  const E = {};
  const scav = () => globalThis.TOFU_SCAV_DATA, scene = () => globalThis.TOFU_LOOT_SCENES.earth;
  const d10 = () => 1 + Math.floor(Math.random() * 10), d100 = () => 1 + Math.floor(Math.random() * 100);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cls = p => D.CLASSES[p.cls];
  const R = r => D.ROOMS[r.type];
  E.d10 = d10; E.pick = pick;
  E.classNameOf = p => D.CLASSES[p.cls].name;
  const allSkills = () => [...D.SKILLS.physical, ...D.SKILLS.mental, ...D.SKILLS.social];
  E.skillName = s => D.SKILL_NAME[s] || s[0].toUpperCase() + s.slice(1);

  // ---------- dice (CANON)
  // pool of d10s, each die at or above DR is a success; first 2 dice (3 with a Cosmic Die) holding a 1 and a 10 is a Cosmic Crit.
  function roll(pool, dr, o = {}) {
    const zero = pool <= 0, n = clamp(pool, 1, 10), dice = Array.from({ length: n }, d10), win = dice.slice(0, o.cosmic ? 3 : 2);
    return { dice, dr, succ: dice.filter(x => x >= dr).length, crit: !zero && win.includes(1) && win.includes(10) };
  }
  E.roll = roll;
  E.score = (p, cat) => p.prio[cat] + Math.floor(p.level / 3); // CANON: 6/4/2 + 1 per 3 levels, defense only
  E.maxHp = p => p.level * 2 + p.skills.athletics + (p.cls === 'bruiser' ? Math.floor(p.level / 2) : 0) + (has(p, 'Rotscale Hide') ? p.level : 0) + (p.damned ? p.level : 0);
  const has = (p, k) => p.perks.includes(k);
  E.has = has;
  const exh = p => Math.max(0, p.exh - (has(p, 'Burning Will') ? 1 : 0));
  // effective dice for a skill: rating plus Leverage, minus Exhaustion and hunger
  E.pool = (p, s, lev = 0) => p.skills[s] + lev - exh(p) - (p.penalty || 0);
  const isCosmic = (p, s) => cls(p).cosmic.includes(s);
  E.rollSkill = (p, s, dr, lev = 0) => roll(E.pool(p, s, lev), dr, { cosmic: isCosmic(p, s) });

  // ---------- people
  function allocate(p) { // CANON: points per level = priority x level; each skill capped at Level + 1, hard cap 10
    const cap = Math.min(p.level + 1, 10), out = {};
    for (const [cat, list] of Object.entries(D.SKILLS)) {
      let pts = p.prio[cat] * p.level;
      list.forEach(s => out[s] = 0);
      const order = [...p.pref.filter(s => list.includes(s)), ...list.filter(s => !p.pref.includes(s))];
      order.slice(0, 2).forEach(s => { const g = Math.min(cap, pts); out[s] += g; pts -= g; });
      for (let guard = 0; pts > 0 && guard < 200; guard++) for (const s of order) { if (pts > 0 && out[s] < cap) { out[s]++; pts--; } }
    }
    p.skills = out;
  }
  function newPerson(S, o = {}) {
    const used = new Set(S.people.map(p => p.sprite));
    const free = Object.keys(G.people).filter(n => !used.has(n));
    const sprite = o.sprite || pick(free.length ? free : Object.keys(G.people));
    const cl = o.cls || pick(['survivor', 'survivor', 'medic', 'bruiser', 'sharpshooter', 'scavenger', 'shepherd']);
    const c = D.CLASSES[cl], vals = [6, 4, 2], prio = {};
    let order = c.prio; if (cl === 'survivor') order = ['physical', 'mental', 'social'].sort(() => Math.random() - .5); // a Survivor can be anyone
    order.forEach((k, i) => prio[k] = vals[i]);
    const p = { id: S.nextId++, name: sprite[0].toUpperCase() + sprite.slice(1), last: pick(D.SURNAMES), sprite, he: G.people[sprite], cls: cl, level: o.level || 1, xp: 0, prio, pref: c.pref.slice(), skills: {}, hp: 0, stress: 0, exh: 0, dmd: o.dmd || 0, room: null, away: false, weapon: null, armor: null, perks: [], strains: [], wait: null, damned: false, thirst: 0, hunger: 0, penalty: 0, fears: null, cooldown: 0, sealed: false, alive: true, joined: S.day, used: false };
    allocate(p); p.hp = E.maxHp(p);
    return p;
  }
  E.newPerson = newPerson;
  E.allocate = allocate;
  const living = S => S.people.filter(p => p.alive);
  const humans = S => living(S).filter(p => !p.damned);
  const home = S => living(S).filter(p => !p.away);
  E.living = living; E.humans = humans; E.home = home;
  const roomOf = (S, id) => S.rooms.find(r => r.id === id);
  E.roomOf = roomOf;
  E.workers = (S, r) => home(S).filter(p => p.room === r.id && !p.sealed);
  E.sealed = (S) => home(S).filter(p => p.sealed);
  const down = p => p.exh >= 6; // CANON: Incapacitated at 6 Exhaustion
  E.COLS = 4; E.MAXW = 3; E.MAXADULT = 40;
  // difficulty (invented): yield = room output, raid = raid chance, raidB = raid size, foe = enemy levels, down = d10 to survive being downed, hang = d10 to hang on while bleeding, start = starting supplies
  E.DIFF = {
    easy: { n: 'Easy', yield: 1.4, raid: .55, raidB: .7, foe: -1, down: 3, hang: 5, start: 2, score: .6, x: 'More food, smaller raids, the downed usually live.' },
    normal: { n: 'Normal', yield: 1.12, raid: .85, raidB: .95, foe: 0, down: 4, hang: 7, start: 1.15, score: 1, x: 'The intended game. Grim, but a careful leader can last the year.' },
    hard: { n: 'Hard', yield: 1, raid: 1, raidB: 1, foe: 0, down: 5, hang: 8, start: 1, score: 1.5, x: 'Leaner harvests, more raids, and the downed mostly stay down.' },
    nightmare: { n: 'Nightmare', yield: .95, raid: 1.1, raidB: 1.1, foe: 0, down: 6, hang: 9, start: .85, score: 2.5, x: 'Fewer supplies, harder raids, and almost nobody gets back up.' },
  };
  E.dif = S => E.DIFF[(S && S.diff) || 'normal'] || E.DIFF.normal;
  E.roomFor = S => humans(S).length < E.MAXADULT;
  const W = r => r.w || 1;
  E.W = W;
  E.covers = (r, row, col) => r.row === row && col >= r.col && col < r.col + W(r);
  E.roomAt = (S, row, col) => S.rooms.find(r => E.covers(r, row, col));
  E.capOf = r => (R(r).cap ? (R(r).cap >= 2 ? R(r).cap + 1 : R(r).cap) * W(r) + (r.tier >= 2 ? 1 : 0) + (r.tier >= 4 ? 1 : 0) + (r.link ? 1 : 0) : 0);
  E.expandCost = r => Math.round(R(r).build * .8 + 15 * W(r));
  E.canExpand = (S, r) => W(r) < E.MAXW && !r.broken && S.slots.some(s => s.row === r.row && s.col === r.col + W(r)) && !E.roomAt(S, r.row, r.col + W(r));
  E.expand = (S, r) => { if (!E.canExpand(S, r)) return false; const c = E.expandCost(r); if (S.res.scrap < c) return false; addRes(S, 'scrap', -c); r.w = W(r) + 1; return true; };
  const cellsOf = r => r.tier + W(r);
  E.bedsOf = S => S.rooms.filter(r => r.type === 'bunks').reduce((n, r) => n + 6 * W(r) + r.tier * 3, 0);
  const log = (S, t, k = '') => S.log.push({ t, k });
  const addRes = (S, k, n) => { S.res[k] = Math.max(0, Math.round((S.res[k] + n) * 10) / 10); };
  const say = (S, title, text, art) => S.queue.push({ k: 'note', p: { title, text, art } });
  const push = (S, k, p = {}) => S.queue.push({ k, p });
  E.say = say;

  function kill(S, p, why) {
    if (E.onDeath && p.alive) E.onDeath(S, p, why);
    const body = !p.away && !/sent away|exile|left in the night|walked out|thrown out/i.test(why);
    p.alive = false; p.room = null; p.sealed = false; p.away = false; p.diedDay = S.day; p.why = why;
    S.memorial.push({ name: `${p.name} ${p.last}`, sprite: p.sprite, cls: cls(p).name, day: S.day, why, damned: p.damned, level: p.level, ep: E.epitaph ? E.epitaph(S, p) : '' });
    home(S).forEach(o => addStress(S, o, 1));
    if (E.grieve) E.grieve(S, p);
    log(S, `${p.name} is gone. ${why}`, 'bad');
    if (body && humans(S).some(o => !o.away)) { const q = S.queue.find(x => x.k === 'body'); if (q) q.p.ids.push(p.id); else push(S, 'body', { ids: [p.id], law: E.lawOn(S, 'dead') }); }
  }
  E.kill = kill;
  // invented: most people who go down come home hurt instead of dying
  E.downed = (S, p, odds = E.dif(S).down) => { if (d10() >= odds) { p.hp = 1; p.exh = Math.min(8, p.exh + 2); addStress(S, p, 3); p.hurtDay = S.day; return true; } return false; };
  E.uncannyOk = (S, k) => { S.unc = S.unc || { last: -99, seen: {} }; return S.day - S.unc.last >= 12 && !S.unc.seen[k]; };
  E.breachPath = S => S.rooms.filter(r => r.type !== 'gate' && r.type !== 'quarantine').sort((a, b) => E.pathDist(a) - E.pathDist(b));
  E.prose = t => { let s = String(t).replace(/<\/?b>/g, '').replace(/\s*\([^()]*\)/g, '').replace(/^\d+ (?:Scrap|Parts)(?: and \d+ (?:Scrap|Parts))?$/i, 'Salvage: wire, bolts, a few good parts').replace(/^\d+ Med supplies$/i, 'A handful of medical supplies').replace(/^\d+ (\w)/, (m, c) => c).replace(/\s*\((?:[^()]*\b(?:lbs?|oz|worth|per|Leverage|uses?|days?|gal)\b[^()]*)\)/gi, '').replace(/\s*\+\d+ Leverage[^.;]*/gi, '').replace(/\bRoll on [^.]*list\b\.?/gi, 'More of the same').replace(/^Found: /, '').replace(/\s{2,}/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
  E.placeName = n => String(n).replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
  E.staffed = (S, type) => S.rooms.some(r => r.type === type && !r.broken && E.workers(S, r).some(p => !down(p)));
  E.kitchenMult = S => (E.staffed(S, 'kitchen') ? .8 : 1);
  E.lawOn = (S, k) => !!(S.laws && S.laws.includes(k));
  E.orderMult = S => (S.order === undefined ? 1 : .8 + S.order * .0035);
  E.log = log;
  function addStress(S, p, n) {
    if (!p.alive || p.damned) return;
    p.stress += n;
    if (p.stress >= 10) { // CANON: Break Test
      p.stress = 0;
      if (d10() <= 5) { p.exh += 1; log(S, `${p.name} broke down. Exhaustion +1.`, 'bad'); checkExh(S, p); } else { p.snap = true; log(S, `${p.name} snapped into a desperate burst of work.`, 'good'); }
    }
  }
  E.addStress = addStress;
  function checkExh(S, p) { if (p.exh >= 10 && p.alive) kill(S, p, 'Worked and starved to death.'); }

  // ---------- DMD (CANON)
  function expose(S, p, amt, dr, why, strain) {
    if (!p.alive || p.damned) return 0;
    if (strain && !p.strains.includes(strain) && D.MUTATIONS[strain]) p.strains.push(strain);
    if (has(p, 'Slimed Immunity') && /slime|spore/i.test(why)) return 0;
    if (/spore|black rain/i.test(why)) { const i = E.packOf(p).findIndex(x => x.k === 'filter'); if (i >= 0) { E.spend(p, i); log(S, `${p.name}'s gas mask filter stopped the ${why}.`, 'good'); return 0; } }
    let r = roll(E.score(p, 'physical') + (has(p, 'Resistant') ? 1 : 0) - (p.exh > 3 ? 1 : 0), clamp(dr, 1, 10));
    if (has(p, 'Iron Will') && !p.used) { p.used = true; r = { succ: 2 }; }
    const taken = r.succ >= 2 ? 0 : r.succ === 1 ? Math.ceil(amt / 2) : amt;
    if (taken || p.dmd >= 32) {
      const was = p.dmd;
      p.dmd = Math.min(32, p.dmd + taken);
      if (taken) addStress(S, p, 1);
      if (p.dmd >= 32 && (taken || was < 32)) startWait(S, p, amt >= 3 ? 'bite' : 'exposure', why);
    }
    return taken;
  }
  E.expose = expose;
  function startWait(S, p, kind, why) {
    if (E.lawOn(S, 'shoot') && !p.away) { const L = E.leader && E.leader(S); kill(S, p, 'Shot at 32, by order of the leader.'); humans(S).filter(o => !o.away).forEach(o => addStress(S, o, 1)); say(S, `${p.name} reached 32`, `The law is the law. ${L && L !== p ? L.name : 'Someone'} did it in the corridor, quickly, while ${p.name} was still asking for a minute to think.`, { p: p.sprite }); return; }
    const dr = d10(), r = roll(E.score(p, 'physical'), dr), turns = r.succ < 2, days = kind === 'bite' ? 1 : 3;
    if (p.wait) { p.wait.turns = p.wait.turns || turns; p.wait.days = Math.max(p.wait.days, days); } else p.wait = { turns, days, total: days, why, kind };
    S.stat.waits++;
    log(S, `${p.name} has reached 32 DMD. Nobody knows what happens now.`, 'bad');
    if (!S.queue.some(q => q.k === 'at32' && q.p.id === p.id)) push(S, 'at32', { id: p.id });
  }
  const SYMPTOMS = ['A fever that comes and goes', 'A wound that will not close', 'Sweating through a cold night', 'A craving nobody wants to talk about', "The dog won't stop growling", 'Black under the fingernails', 'Calling people by the wrong names', 'Woke up standing at the door', 'A new taste for raw meat', 'Hands that keep shaking'];
  E.seal = (S, p) => { const q = S.rooms.find(r => r.type === 'quarantine'); if (!q || E.sealed(S).length >= cellsOf(q)) return false; p.sealed = true; p.room = q.id; return true; };
  E.unseal = (S, p) => { p.sealed = false; p.room = null; };
  E.cells = S => { const q = S.rooms.find(r => r.type === 'quarantine'); return q ? cellsOf(q) : 0; };
  function processWaits(S) {
    for (const p of living(S)) {
      if (!p.wait) continue;
      p.wait.sym = p.wait.sym || [];
      if (Math.random() < (p.wait.turns ? .85 : .45)) { const s = pick(SYMPTOMS.filter(x => !p.wait.sym.includes(x))); if (s) { p.wait.sym.push(s); log(S, `${p.name}: ${s.toLowerCase()}.`, 'bad'); } }
      p.wait.days--;
      if (p.wait.days > 0) continue;
      const w = p.wait; p.wait = null;
      if (w.turns) turn(S, p); else { S.stat.survivedWait++; S.score += 40; p.sealedOk = true; if (p.sealed) { E.unseal(S, p); } push(S, 'cleared', { id: p.id }); }
    }
  }
  function turn(S, p) {
    S.stat.turned++;
    const r = roll(E.score(p, 'social'), 9);
    if (r.succ >= 1) { push(S, 'kept', { id: p.id, sealed: p.sealed }); return; }
    if (p.sealed) { kill(S, p, `Turned in Quarantine. The door held.`); say(S, `${p.name} turned`, `There was nothing left of ${p.name} behind the wire. It took a long time to go quiet.`, { d: p.sprite }); return; }
    breakout(S, p);
  }
  function breakout(S, p) { // a resident turns where they stand
    const r = roomOf(S, p.room), names = home(S).filter(x => x.room === p.room && x.id !== p.id).map(x => x);
    const lv = clamp(p.level + 1, 1, 10);
    const foe = { n: p.name, g: 'infected', t: 'Knight', s: 'Medium', a: 3, ar: 0, hp: { [lv]: Math.max(8, E.maxHp(p) + 2) }, lo: lv, hi: lv, dmd: 3, art: '', sprite: p.sprite, k: '' };
    kill(S, p, 'Turned, and had to be put down.');
    const nb = r ? nextTo(S, r).flatMap(x => E.workers(S, x)).filter(down0) : [];
    const defenders = [...names, ...nb].slice(0, 4).length ? [...names, ...nb].slice(0, 4) : home(S).filter(down0).slice(0, 2);
    const fight = E.fight(S, defenders, [mk(foe, lv)], { where: r ? R(r).name : 'the shelter', inside: true });
    say(S, `${p.name} turned`, `It happened in ${r ? R(r).name : 'the corridor'}. No warning.`, { d: p.sprite, fight });
  }
  const down0 = p => !p.sealed && p.exh < 6;
  // CANON: Damned. Meter details are invented for this game (DESIGN.md).
  E.makeDamned = (S, p) => {
    p.damned = true; p.cls = 'damned'; p.dmd = 0; p.wait = null; p.sealed = false; p.room = null; p.stress = 0; p.perkN = 0;
    p.prio = { physical: 6, mental: 4, social: 2 }; allocate(p); p.hp = E.maxHp(p);
    S.stat.damned++;
    home(S).forEach(o => meetDamned(o));
  };
  function meetDamned(o) { if (!o.damned && o.fears === null) o.fears = d10() <= 7; }
  E.meetDamned = meetDamned;
  E.hasDamned = S => living(S).some(p => p.damned);
  E.trustCount = S => { const h = humans(S); return [h.filter(p => p.fears === false).length, h.length]; };
  function processDamned(S) {
    for (const p of living(S).filter(x => x.damned)) {
      p.dmd = Math.min(32, p.dmd + 1);
      if (p.dmd >= 32) { const nm = p.name; p.damned = true; breakoutDamned(S, p); continue; }
      if (p.dmd === 28) log(S, `${p.name} has four days left. Everyone can tell.`, 'bad');
      const near = home(S).filter(o => o.id !== p.id && !o.damned && !o.sealed && o.room === p.room && o.hp < E.maxHp(o));
      if (near.length) {
        const t = near.sort((a, b) => a.hp - b.hp)[0], dr = t.hp < E.maxHp(t) / 2 ? 10 : 8;
        if (roll(E.score(p, 'social'), dr).succ < 1) {
          const dmg = p.level + 1; t.hp -= dmg; p.hp = E.maxHp(p); p.dmd = Math.min(32, p.dmd + 3);
          home(S).filter(o => o.room === p.room).forEach(o => { addStress(S, o, 2); if (o.fears === false && d10() <= 5) o.fears = true; });
          expose(S, t, 3, p.skills.melee, 'a bite', null);
          log(S, `${p.name} couldn't hold back and fed on ${t.name}.`, 'bad');
          say(S, `${p.name} fed`, `${t.name} was bleeding and ${p.name} was too close. ${p.he === 'he' ? 'He' : 'She'} is stronger now, with less time left.`, { d: p.sprite });
          if (t.hp <= -E.maxHp(t) || t.hp < 0) kill(S, t, `Fed on by ${p.name}.`);
        }
      }
    }
  }
  function breakoutDamned(S, p) {
    const r = roomOf(S, p.room), lv = clamp(p.level + 2, 1, 10);
    const hp = Math.max(14, E.maxHp(p) * 2), foe = { n: p.name, g: 'infected', t: 'Rook', s: 'Medium', a: 3, ar: 1, hp: { [lv]: hp }, lo: lv, hi: lv, dmd: 3, art: '', sprite: p.sprite, k: '' };
    const defenders = home(S).filter(x => !x.damned && (x.room === p.room || (R(roomOf(S, x.room) || { type: 'bunks' }) === D.ROOMS.gate))).filter(down0);
    kill(S, p, 'The meter filled. Everyone knew it would.');
    const fight = E.fight(S, defenders.length ? defenders : home(S).filter(down0).slice(0, 3), [mk(foe, lv)], { where: r ? R(r).name : 'the shelter', inside: true });
    say(S, `${p.name} turned on you`, `Thirty-two. The last of ${p.name} left all at once.`, { d: p.sprite, fight });
  }

  // ---------- gear
  function gearFromWeapon(S, w, cond = 'Standard') { return { id: S.nextId++, n: w.n, kind: w.kind, gun: !!w.gun, tr: w.tr || [], cond, wt: w.wt || 3 }; }
  const WMAP = Object.fromEntries(G.weapons.map(w => [w.n.toLowerCase(), w]));
  E.findWeapon = name => WMAP[name.toLowerCase()];
  E.condition = () => { const r = d10(); return r === 1 ? 'Broken' : r <= 4 ? 'Shoddy' : r <= 9 ? 'Standard' : 'High-Quality'; }; // CANON
  const gear = (S, id) => S.gear.find(g => g.id === id);
  E.gear = gear;
  const condLev = g => (g && g.cond === 'Shoddy' ? -1 : g && g.cond === 'High-Quality' ? 1 : 0);
  E.addCrafted = (S, c) => {
    let g;
    if (c.ar) g = { id: S.nextId++, n: c.n, kind: 'armor', ar: c.ar, acl: c.cls, cond: 'Standard', tr: [], wt: 8 * c.ar };
    else g = gearFromWeapon(S, E.findWeapon(c.n) || { n: c.n, kind: 'melee', tr: [] });
    S.gear.push(g); return g;
  };
  E.craft = (S, i) => { const c = D.CRAFT[i]; if (S.res.scrap < c.c) return null; addRes(S, 'scrap', -c.c); if (c.item) { E.addItem(S, c.item, c.q || 1); log(S, `Made ${c.n}.`, 'good'); return true; } const g = E.addCrafted(S, c); log(S, `Made a ${c.n}.`, 'good'); return g; };
  E.equip = (S, p, g) => {
    if (g.kind === 'armor') { p.armor = g.id; } else { p.weapon = g.id; }
    S.people.forEach(o => { if (o.id !== p.id) { if (o.weapon === g.id) o.weapon = null; if (o.armor === g.id) o.armor = null; } });
  };
  E.unequip = (S, p, slot) => { p[slot] = null; };
  // ---------- supplies: a stock in the shelter, and two carried slots each
  E.PACK = 2;
  E.items = S => S.items || (S.items = {});
  E.packOf = p => p.pack || (p.pack = []);
  E.addItem = (S, k, n = 1) => { const it = E.items(S); it[k] = (it[k] || 0) + n; };
  E.carried = (p, k) => E.packOf(p).some(x => x.k === k);
  E.pack = (S, p, k) => { const it = E.items(S), pk = E.packOf(p); if (!it[k] || pk.length >= E.PACK) return false; const u = Math.min(D.ITEMS[k].uses || 1, it[k]); it[k] -= u; pk.push({ k, u }); return true; };
  E.unpack = (S, p, i) => { const pk = E.packOf(p), x = pk[i]; if (!x) return false; E.addItem(S, x.k, x.u); pk.splice(i, 1); return true; };
  E.spend = (p, i) => { const pk = E.packOf(p); if (--pk[i].u <= 0) pk.splice(i, 1); };
  E.useAtHome = (S, p, k) => { // from the shelter's stock, between fights
    const it = E.items(S), d = D.ITEMS[k]; if (!it[k] || !d.home || !p.alive) return null;
    let msg = '';
    if (d.use === 'heal') { if (p.hp >= E.maxHp(p)) return null; const r = E.rollSkill(p, 'medicine', 5, d.lev || 0), n = r.succ * 2; if (n) p.hp = Math.min(E.maxHp(p), Math.max(p.hp, 0) + n); msg = n ? `${p.name}: +${n} Health.` : `${p.name} fumbles the dressing.`; }
    if (d.use === 'exh') { if (p.exh <= 0) return null; p.exh -= 1; msg = `${p.name}: 1 less Exhaustion.`; }
    if (d.use === 'calm') { if (p.stress <= 0) return null; p.stress = Math.max(0, p.stress - 3); msg = `${p.name}: 3 less Stress.`; }
    it[k] -= 1; return msg;
  };

  // ---------- combat (CANON numbers; rounds are automated)
  const SIZE_BAND = { Tiny: 0, Small: 1, Medium: 1, Large: 1, Huge: 2, Giant: 2, Monstrous: 2, Colossal: 3, Titanic: 3, Leviathan: 3 };
  const SIZE_MULT = { Tiny: .5, Small: 1, Medium: 1, Large: 1, Huge: 2, Giant: 2, Monstrous: 2, Colossal: 3, Titanic: 3, Leviathan: 3 };
  function mk(c, lv) {
    const levels = Object.keys(c.hp).map(Number), L = clamp(lv, Math.min(...levels), Math.max(...levels));
    return { c, n: c.n, L, hp: c.hp[L] || c.hp[levels[0]], max: c.hp[L] || c.hp[levels[0]], ar: c.ar, s: c.s, attacks: Math.max(1, c.a - 1), guard: c.a >= 3, pool: clamp(L + 1, 1, 10), dodge: L, dmd: c.dmd, g: c.g, art: c.art, sprite: c.sprite };
  }
  const TIER_PTS = { Pawn: 1, Bishop: 2, Knight: 3, Rook: 7, Paragon: 18 };
  E.pickFoes = (groups, level, budget, maxN = 10) => {
    const L = clamp(level, 1, 10), pool = G.creatures.filter(c => groups.includes(c.g) && c.lo <= L && c.hi >= L && c.t !== 'Paragon');
    const out = []; let left = budget;
    while (left >= 1 && out.length < maxN) {
      const opts = pool.filter(c => TIER_PTS[c.t] <= left); if (!opts.length) break;
      const weighted = opts.flatMap(c => Array(c.t === 'Pawn' ? 5 : c.t === 'Knight' ? 3 : c.t === 'Bishop' ? 3 : 1).fill(c));
      const c = pick(weighted); out.push(mk(c, L)); left -= TIER_PTS[c.t];
    }
    return out;
  };
  E.named = (n, lv) => { const c = G.creatures.find(x => x.n === n); return c ? mk(c, clamp(lv, c.lo, c.hi)) : null; };
  function attackSkill(p, g) { return g && g.kind === 'ranged' ? 'ranged' : 'melee'; }
  E.fight = (S, party, foes, o = {}) => {
    const f = { where: o.where || 'the gate', foes: foes.map(x => ({ n: x.n, t: x.c.t, art: x.art, sprite: x.sprite, g: x.g })), lines: [], won: false, fled: false, dead: [] };
    const say2 = (t, k = '') => f.lines.push({ t, k });
    const team = party.filter(p => p.alive && p.hp > 0);
    team.forEach(p => { p.called = false; p.frenzy = 0; });
    const st = p => ({ armor: gear(S, p.armor), weapon: gear(S, p.weapon) });
    if (!team.length || !foes.length) { f.won = !foes.length; return f; }
    say2(`${team.map(p => p.name).join(', ')} against ${foes.length > 1 ? foes.length + ' enemies' : foes[0].n} at ${f.where}.`, 'head');
    if (team.some(p => has(p, "Banshee's Wail")) && foes.length > 1) { const g = foes.pop(); say2(`A shriek from the team drives off ${g.n}.`); }
    if (foes.some(x => x.g === 'infected') && team.some(p => has(p, 'Infected Master')) && foes.length > 1) { const g = foes.findIndex(x => x.g === 'infected'); say2(`${foes[g].n} turns on its own, for a moment.`); foes[g].hp = Math.ceil(foes[g].hp / 2); }
    const liveF = () => foes.filter(x => x.hp > 0), liveT = () => team.filter(p => p.alive && p.hp > 0);
    const heroHit = (p, foe, extra = {}) => {
      const g = st(p).weapon; let sk = attackSkill(p, g), lev = condLev(g);
      if (sk === 'ranged' && g.gun) { if (S.res.rounds >= 1) addRes(S, 'rounds', -1); else { sk = 'melee'; lev = -1; } }
      if (sk === 'melee') { if (!g && !p.damned) lev -= 1; if (p.damned) lev += 1; if (has(p, 'Vicious Attack') || has(p, 'Grasping Tendril')) lev += 1; if (has(p, 'Ironfist')) lev += 2; } else if (has(p, 'Thermal Hunter')) lev += 1;
      if (S.blackout && !has(p, 'Blind Fighter') && o.inside) lev -= 1;
      lev += p.frenzy || 0;
      const er = 6 + (SIZE_BAND.Medium - SIZE_BAND[foe.s]), r = E.rollSkill(p, sk, er, lev), pool = clamp(E.pool(p, sk, lev), 1, 10);
      const tr = g ? g.tr : [], piercing = tr.includes('Armor Piercing') ? 2 : 0;
      let dmg = r.succ;
      if (r.crit) { dmg = pool * 2; say2(`COSMIC CRIT! ${p.name} hits ${foe.n} with everything.`, 'crit'); }
      let defended = false;
      if (!r.crit && dmg > 0 && foe.guard && foe.guarded !== f.round) {
        foe.guarded = f.round;
        const dr = clamp(pool, 1, 10), def = roll(foe.dodge, dr);
        if (def.succ >= 2) { say2(`${foe.n} avoids ${p.name}'s attack.`); return; }
        if (def.succ === 1) { dmg = Math.ceil(dmg / 2); defended = true; }
      }
      if (dmg <= 0) { return; }
      let ar = foe.ar - piercing; if (p.cls === 'sharpshooter' && sk === 'ranged' && !p.called) { p.called = true; ar = 0; }
      let dealt = Math.max(defended ? 0 : 1, dmg - Math.max(0, ar));
      if (tr.includes('Incendiary')) dealt += 1;
      foe.hp -= dealt;
      say2(`${p.name} hits ${foe.n} for ${dealt}.${foe.hp <= 0 ? ` ${foe.n} falls.` : ''}`, foe.hp <= 0 ? 'good' : '');
      if (foe.hp <= 0) {
        if (p.damned) { p.hp = Math.min(E.maxHp(p), p.hp + p.level); p.frenzy = 1; }
        if (/burster/i.test(foe.n) && !extra.noburst) { liveT().filter(x => !has(x, 'Blast Shielding')).forEach(x => expose(S, x, 1, 5, 'burst spray', 'Burster')); say2('It bursts. The spray gets everywhere.', 'bad'); }
        if (/bloat/i.test(foe.n)) { liveT().forEach(x => expose(S, x, 1, 6, 'slime', 'Bloat')); say2('The Bloat ruptures, soaking everyone in slime.', 'bad'); }
      }
      if ((tr.includes('Spread') || tr.includes('Burst Fire') || tr.includes('Full Auto') || (has(p, 'Whirlwind Attack') && sk === 'melee')) && !extra.second) {
        const others = liveF().filter(x => x !== foe); if (others.length && dmg > 1) { const o2 = pick(others), d2 = Math.ceil(dmg / 2) - Math.max(0, o2.ar); if (d2 > 0) { o2.hp -= d2; say2(`The same attack catches ${o2.n} for ${d2}.${o2.hp <= 0 ? ` ${o2.n} falls.` : ''}`, o2.hp <= 0 ? 'good' : ''); } }
      }
    };
    const foeHit = (foe, p) => {
      const er = 6 + (SIZE_BAND[foe.s] - SIZE_BAND.Medium), s = st(p), r = roll(foe.pool, clamp(er, 1, 10));
      let dmg = r.succ;
      if (r.crit) { dmg = foe.pool * 2; addStress(S, p, 1); say2(`COSMIC CRIT! ${foe.n} tears into ${p.name}.`, 'crit'); }
      if (dmg <= 0) return;
      let defended = false;
      if (!r.crit && p.guardRound !== f.round) {
        p.guardRound = f.round;
        const acl = s.armor && s.armor.acl, weaponLight = s.weapon && (s.weapon.tr || []).includes('Light');
        const mod = acl === 'Medium' ? -1 : 0, dodgeMod = (!acl ? 1 : 0) + mod + (has(p, 'Adrenal Surge') || has(p, 'Inhuman Agility') || has(p, 'Kinetic Jumper') || has(p, 'Shrug it Off') ? 1 : 0), blockMod = mod + (has(p, 'Unyielding') ? 1 : 0);
        const useBlock = acl === 'Heavy' || E.pool(p, 'block', blockMod) > E.pool(p, 'dodge', dodgeMod);
        const sk = useBlock ? 'block' : 'dodge', def = E.rollSkill(p, sk, clamp(foe.pool, 1, 10), useBlock ? blockMod : dodgeMod);
        if (def.succ === 0) addStressFail(S, p);
        if (def.succ >= 2) {
          say2(`${p.name} ${useBlock ? 'blocks' : 'dodges'} ${foe.n} and strikes back.`);
          if (liveF().includes(foe)) heroHit(p, foe, { second: true });
          return;
        }
        if (def.succ === 1) { dmg = Math.ceil(dmg / 2); defended = true; }
      }
      const ar = (s.armor ? s.armor.ar : 0) + (has(p, 'Acid Endurance') ? 1 : 0);
      let dealt = Math.max(defended ? 0 : 1, dmg - ar);
      dealt = Math.ceil(dealt * (SIZE_MULT[foe.s] || 1));
      if (dealt <= 0) { say2(`${p.name}'s armor takes it.`); return; }
      p.hp -= dealt;
      say2(`${foe.n} hits ${p.name} for ${dealt}.`, 'bad');
      if (foe.dmd) { const wh = foe.dmd >= 3 ? 'a bite' : foe.dmd === 2 ? 'a scratch' : 'spores'; const t = expose(S, p, foe.dmd, foe.pool, wh, foe.c.n in D.MUTATIONS ? foe.c.n : (foe.n in D.MUTATIONS ? foe.n : null)); if (t) say2(`${wh[0].toUpperCase() + wh.slice(1)}. ${p.name} takes ${t} DMD (now ${p.dmd}).`, 'dmd'); else say2(`${p.name} shakes off the infection this time.`); }
      if (p.hp <= 0) {
        if (p.hp <= -E.maxHp(p)) { kill(S, p, `Killed by ${foe.n}.`); f.dead.push(p.name); say2(`${p.name} is dead.`, 'bad'); home(S).forEach(() => { }); return; }
        say2(`${p.name} goes down.`, 'bad'); p.dyingRound = p.hp < 0 ? f.round + 1 : null; if (p.hp === 0) p.ko = true;
        team.filter(x => x !== p && x.alive && !x.damned).forEach(x => addStress(S, x, 1));
      }
    };
    for (f.round = 1; f.round <= 14; f.round++) {
      if (!liveF().length || !liveT().length) break;
      say2(`Round ${f.round}`, 'round');
      const order = [...liveT().map(p => ({ p, q: has(p, 'Quick') || has(p, 'Adrenal Surge') ? 2 : Math.random() })), ...liveF().map(x => ({ x, q: Math.random() }))].sort((a, b) => b.q - a.q);
      for (const a of order) {
        if (!liveF().length || !liveT().length) break;
        if (a.p) { if (a.p.hp <= 0) continue; for (let i = 0; i < 2; i++) { const t = liveF().sort((m, n) => m.hp - n.hp)[0]; if (t) heroHit(a.p, t); } } else { if (a.x.hp <= 0) continue; for (let i = 0; i < a.x.attacks; i++) { const t = pick(liveT()); if (t) foeHit(a.x, t); } }
      }
      // CANON: below 0 you die at the end of the next full round unless the fight is over and someone gets to you
      team.filter(p => p.alive && p.hp < 0 && p.dyingRound != null && f.round >= p.dyingRound).forEach(p => { if (liveF().length) { if (d10() >= E.dif(S).hang) { p.dyingRound = f.round + 1; say2(`${p.name} is still hanging on.`, 'bad'); return; } kill(S, p, `Bled out at ${f.where}.`); f.dead.push(p.name); say2(`${p.name} bled out.`, 'bad'); } });
      if (o.canFlee && f.round >= 2 && liveF().length && (liveT().length <= Math.ceil(team.length / 2) || team.some(p => p.alive && p.hp <= 0))) { f.fled = true; say2('They break and run.', 'bad'); team.filter(p => p.alive && p.hp <= 0).forEach(p => { if (d10() >= 3) { p.hp = 1; delete p.dyingRound; say2(`${p.name} was dragged out, barely alive.`, 'bad'); } else { kill(S, p, `Left behind at ${f.where}.`); f.dead.push(p.name); say2(`Nobody could reach ${p.name}.`, 'bad'); } }); break; }
    }
    f.won = liveF().length === 0 && liveT().length > 0;
    const stand = liveT();
    if (f.won || f.fled) {
      team.filter(p => p.alive && p.hp < 0).forEach(p => { const saver = stand[0]; if (saver && E.rollSkill(saver, 'medicine', 5).succ >= 1) { p.hp = 1; p.exh += 1; p.dyingRound = null; say2(`${saver.name} keeps ${p.name} alive.`, 'good'); } else { kill(S, p, `Bled out at ${f.where}.`); f.dead.push(p.name); say2(`Nobody could stop ${p.name}'s bleeding.`, 'bad'); } });
      team.filter(p => p.alive && p.hp === 0).forEach(p => { p.hp = 1; addStress(S, p, 5); });
      if (f.won) stand.forEach(p => { // CANON: Patch-up after a fight
        const wounded = team.filter(x => x.alive && x.hp < E.maxHp(x)).sort((a, b) => a.hp - b.hp)[0];
        if (!wounded) return;
        const n = E.rollSkill(p, 'medicine', 5).succ * (p.cls === 'medic' ? 3 : 2);
        if (n) wounded.hp = Math.min(E.maxHp(wounded), wounded.hp + n);
      });
      if (stand.some(p => p.cls === 'shepherd')) team.forEach(p => { if (p.alive) p.stress = Math.max(0, p.stress - 2); });
    } else if (!stand.length) {
      team.filter(p => p.alive).forEach(p => { if (E.downed(S, p)) { f.hurt = (f.hurt || []).concat(p.name); say2(o.inside ? `${p.name} is left for dead, and lives.` : `${p.name} came to hours later and crawled home.`, 'bad'); return; } kill(S, p, `Lost at ${f.where}.`); f.dead.push(p.name); });
    } else { say2('The fight breaks off with nobody winning.'); team.filter(p => p.alive && p.hp <= 0).forEach(p => { p.hp = 1; }); }
    team.forEach(p => { if (p.alive) { p.xp += f.won ? 6 : 3; } delete p.frenzy; delete p.called; delete p.dyingRound; delete p.guardRound; delete p.ko; });
    S.stat.fights++; if (f.won) { S.stat.foes += foes.length; S.score += foes.length * 3; }
    return f;
  };
  function addStressFail(S, p) { addStress(S, p, 1); } // CANON: a failed roll (0 successes) is +1 Stress

  // ---------- loot (CANON tables from the site; the sorter that turns a line of text into stock is this game's)
  function amounts(t) {
    t = t.replace(/half a d10/gi, () => String(Math.ceil(d10() / 2)));
    return t.replace(/(\d*)d10(?!\s*:)(\s*[x×]\s*(\d+))?(\s*([+-])\s*(\d+))?/g, (m, k, _x, mul, _p, sg, add) => { let v = 0; for (let i = 0; i < +(k || 1); i++) v += d10(); if (add) v += (sg === '-' ? -1 : 1) * +add; v = Math.max(1, v); if (mul) v *= +mul; return String(v); });
  }
  function findOne(place) {
    const data = scav(), P = data.places[place], r = P.die === 'd10' ? d10() : d100(), row = P.rows.find(x => r >= x[0] && r <= x[1]) || P.rows[0];
    const m = /Roll on (.+?) list/i.exec(row[2]);
    if (m && data.stores[m[1]]) { const L = data.stores[m[1]], it = L[d100() - 1] || L[0]; return { text: it[0], wt: it[1] || 0 }; }
    return { text: amounts(row[2]), wt: 0 };
  }
  E.findOne = findOne;
  const num = t => { const m = /(\d[\d,]*)/.exec(t); return m ? +m[1].replace(',', '') : 1; };
  const FOODRE = /\b(cans?|canned|food|rations?|mre|rice|beans|pasta|cereal|cracker|noodle|ramen|granola|jerky|spam|peanut butter|soup|oatmeal|flour|sugar|lentil|potato|corn|tuna|salmon|sardine|sausage|chili|cookies?|trail mix|dried|honey|popcorn|candy|chips|meal|meat|vegetable|fruit|eggs?|chicken|pudding|applesauce|pickles|milk|grain|seed|nuts|dog food|deer|fish|venison|rabbit|game|berries|mushrooms|broth|oil\b(?!.*(motor|gun|lamp)))/i;
  const WATERRE = /\b(bottled water|water|juice|soda|sports drink|energy drink|drink mix|coffee|tea bags|beer|whiskey|bottles? of)\b/i;
  const MEDRE = /first aid|bandage|gauze|antibiotic|antiseptic|painkill|pain reliev|medicine|medication|med supplies|suture|surgical|tourniquet|iv bag|saline|ibuprofen|aspirin|acetaminophen|naproxen|amoxicillin|morphine|epinephrine|insulin|medical|alcohol wipes|rubbing alcohol|hydrogen peroxide|medkit|pills?\b|trauma kit|antiviral|ointment/i;
  const AMMORE = /ammunition|\brounds?\b|shotgun shells?|\d+ shells|cartridges?(?! holder)|9mm(?! .*(handgun|pistol))/i;
  const SCRAPRE = /scrap|parts?\b|tool|wrench|hammer|nails|screw|wire|pipe|metal|battery|batteries|tape|rope|cable|alternator|starter|motor|engine|rotor|brake|tire|radiator|hose|belt\b|filter|electronics|laptop|phone|radio|circuit|generator|solar|panel|lumber|plywood|bolts?|chain|tarp|bucket|shovel|pliers|drill|saw\b|ladder|welder|jack|winch|machine|equipment|monitor|scanner|bench|kit\b|set\b|press\b|\bcase\b/i;
  const COMFORTRE = /playing cards|board game|books?\b|cigarettes|candles?|whiskey|liquor|chocolate|photo|guitar|teddy|magazine|novel|toys?\b|coffee/i;
  const FUELRE = /gasoline|diesel|propane|kerosene|fuel\b|gal(lons?)? of (gas|fuel)|jerry can/i;
  const GUNRE = [[/shotgun/i, 'M870 Shotgun'], [/ar-15|m4\b|assault rifle|m16/i, 'M16'], [/ak-47/i, 'AK-47'], [/hunting rifle|bolt-action|remington 700|deer rifle|rifle\b/i, 'Remington 700'], [/revolver|\.357|model 29/i, 'Smith & Wesson Model 29'], [/handgun|pistol|glock|1911|beretta|sig sauer/i, 'Glock 19'], [/crossbow/i, 'Crossbow'], [/compound bow|archery|\bbow\b/i, 'Compound Bow']];
  const MELEERE = [[/machete/i, 'Machete'], [/crowbar/i, 'Crowbar'], [/baseball bat/i, 'Baseball Bat'], [/hunting knife|bowie/i, 'Bowie Knife'], [/combat knife|tactical knife/i, 'Combat Knife'], [/\baxe\b|hatchet|tomahawk/i, 'Tomahawk'], [/sledge/i, 'Sledgehammer'], [/chainsaw/i, 'Chainsaw'], [/\bknife\b|knives/i, 'Bowie Knife']];
  E.classify = (text, wt) => { // what a found line means for the shelter
    const t = text.replace(/<\/?b>/g, ''), n = num(t), out = {}, multi = /^\d/.test(t) ? n : 1;
    if (/^(nothing|ransacked|empty|stripped|picked clean)/i.test(t) || /stripped|nothing but/i.test(t.slice(0, 22))) return { none: true };
    if (/horde|infected in|bodies on|nest of|something moved/i.test(t)) return { danger: true };
    for (const [re, nm] of [...GUNRE]) if (re.test(t) && !/ammunition|rounds|shell|case|cleaning|safe|lock|sling|\bscope\b|grip|bench|tool|vise|holder|bipod|target|stand\b|rest\b|rack\b/i.test(t)) return { weapon: nm };
    for (const [re, nm] of MELEERE) if (re.test(t) && !/sharpener|set\b|kitchen|box cutter|fillet|pocket/i.test(t)) return { weapon: nm };
    for (const a of D.ARMOR_FOUND) if (a[0].test(t)) return { armor: a };
    if (FUELRE.test(t)) { const g = /(\d+)[^\d]*gal/i.exec(t); return { fuel: clamp(g ? +g[1] : Math.max(1, multi), 1, 24) }; }
    if (MEDRE.test(t)) return { meds: clamp(multi, 1, 4) };
    if (AMMORE.test(t) && !/gun safe|ammunition box/i.test(t)) { const r = /(\d+) ?(rounds?|shells?)/i.exec(t); return { rounds: clamp(r ? +r[1] : (/per (\d+)/i.exec(t) ? +(/per (\d+)/i.exec(t)[1]) : Math.max(10, multi)), 1, 100) }; }
    const day = /(\d+)\s*days? of food/i.exec(t), per = /1 day of food per (\d+)/i.exec(t);
    if (per) return { food: Math.max(1, Math.round(multi / +per[1])) };
    if (day) return { food: +day[1] };
    if (WATERRE.test(t) && !/filter|purif|heater|bladder(?!.*water)|wading|proof|tablet|gun\b|proofing/i.test(t)) { const l = wt || 2; const gal = /(\d+)\s*gal/i.exec(t); return { water: clamp(gal ? +gal[1] * 2 : Math.max(1, multi * Math.round(Math.max(1, l / 3))), 1, 30) }; }
    if (COMFORTRE.test(t)) return { comfort: 1 };
    if (FOODRE.test(t) && !/oil filter|foodsaver|dehydrator|cooler/i.test(t)) { const per2 = Math.max(.5, (wt || 1) / 2); return { food: clamp(Math.ceil(multi * per2), 1, 30) }; }
    if (SCRAPRE.test(t)) return { scrap: Math.max(1, Math.round(Math.min(8, 1 + (wt || 3) / 3))) * (multi > 1 && multi < 6 ? multi : 1) };
    return { scrap: 1 };
  };
  const BIG = /mall|warehouse|hospital|school|prepper|military|distribution/i;
  const STATUS_NAME = ['Heavily looted', 'Partially looted', 'Barely looted'];
  E.STATUS_NAME = STATUS_NAME;
  function genSite(S, place, near) {
    const r = d10(), status = r <= 5 ? 0 : r <= 8 ? 1 : 2; // CANON picked-over roll
    return { id: S.nextId++, place, name: place.split('/')[0].replace(/ or .*/, '').trim(), street: pick(D.STREETS), miles: near ? 1 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 6), hot: Math.random() < (near ? .15 : .35), status, known: false, visits: 0, big: BIG.test(place) };
  }
  E.teamCarry = (S, team, truck) => team.reduce((a, p) => a + 30 + 5 * p.skills.athletics + (has(p, 'Packrat') ? 20 : 0), 0) + (truck ? 200 : 0);
  E.startRun = (S, siteId, ids, hours, truck) => {
    const site = S.sites.find(x => x.id === siteId), team = ids.map(i => S.people.find(p => p.id === i));
    if (!site || !team.length) return false;
    if (truck) { const f = 2 + Math.ceil(site.miles / 3); if (S.res.fuel < f) return false; addRes(S, 'fuel', -f); }
    team.forEach(p => { p.away = true; p.room = null; });
    S.runs.push({ id: S.nextId++, site: siteId, team: ids, hours, truck: !!truck, left: site.miles >= 5 ? 2 : 1, started: S.day });
    return true;
  };
  function resolveRun(S, run) {
    const site = S.sites.find(x => x.id === run.site), team = run.team.map(i => S.people.find(p => p.id === i)).filter(p => p.alive);
    const rep = { place: site.name, street: site.street, team: team.map(p => p.name), status: STATUS_NAME[site.status], finds: [], left: [], fights: [], notes: [], got: {}, gear: [], people: 0 };
    if (!team.length) return;
    const avgL = Math.max(1, Math.round(team.reduce((a, p) => a + p.level, 0) / team.length));
    const w = D.WEATHER[S.weather];
    if (w.dr) { team.forEach(p => { if (expose(S, p, 1, w.dr, 'black rain', null)) rep.notes.push(`${p.name} got soaked in black rain. DMD +${1}.`); }); }
    // road d10
    const rd = d10();
    if (rd >= 4 && rd <= 7) rep.notes.push(pick(['They passed a dead traveler by the road.', 'An abandoned car had a little worth taking.', 'A roadside building gave up a few scraps.']));
    if (rd >= 8) { const n = amounts('half a d10'); addRes(S, 'scrap', +n); rep.notes.push(`Scavenged a crashed vehicle on the way: +${n} scrap.`); }
    // CANON: count by how picked-over it is
    const c = d10(); let count = site.status === 0 ? Math.ceil(c / 2) : site.status === 1 ? c : c + 2;
    if (site.big) count *= 2;
    const searcher = team.slice().sort((a, b) => Math.max(b.skills.survival, b.skills.analysis) - Math.max(a.skills.survival, a.skills.analysis))[0];
    const sk = searcher.skills.survival >= searcher.skills.analysis ? 'survival' : 'analysis', search = E.rollSkill(searcher, sk, 6);
    if (search.succ === 0) { addStress(S, searcher, 1); count = Math.ceil(count / 2); rep.notes.push(`${searcher.name}'s search went badly.`); }
    if (search.crit) { count *= 2; rep.notes.push(`COSMIC CRIT: ${searcher.name} found a hidden stash room.`); }
    count = Math.max(1, Math.round(count * [0, .5, .75, 1, 1.25, 1.4, 1.5][clamp(run.hours, 1, 6)]));
    count += team.reduce((a, p) => a + (has(p, 'Scavenger') ? 2 : 0) + (p.cls === 'scavenger' ? 1 : 0), 0);
    const raw = [];
    for (let i = 0; i < count; i++) raw.push(findOne(site.place));
    const r10 = d10(); let mn = r10 <= 3 ? 0 : r10 <= 7 ? 1 : r10 <= 9 ? 2 : 3; // CANON medicine roll
    if (scene().medPlaces.test(site.place)) mn += 1 + Math.floor(r10 / 4);
    if (site.status === 0) mn = Math.floor(mn / 2);
    if (mn) raw.push({ text: `${mn} Med supplies`, wt: mn, med: mn });
    // CANON noise: a d10 each hour, 1 draws trouble (1-2 in a hot zone)
    let trouble = 0, aborted = false;
    const quiet = team.some(p => has(p, 'Silent Step') || has(p, 'Perceptive'));
    if (raw.some(f => !f.med && E.classify(f.text, f.wt).danger)) trouble++;
    for (let h = 1; h <= run.hours; h++) if (d10() <= (site.hot ? 2 : 1) && !(quiet && d10() <= 5)) trouble++;
    // complications d10
    const comp = d10();
    if (comp === 1 || comp === 2 && false) trouble++;
    if (comp === 1) rep.notes.push('Something was already inside.');
    if (comp === 2) { const v = team[0]; if (E.rollSkill(v, 'insight', 6).succ < 1) { v.hp -= 2; rep.notes.push(`${v.name} set off a trap. -2 Health.`); if (v.hp < 0) kill(S, v, 'Caught in a trap on a run.'); } else rep.notes.push(`${v.name} spotted a tripwire in time.`); }
    if (comp === 3) { const v = pick(team); if (v.alive && E.rollSkill(v, 'acrobatics', 6).succ < 1) { v.hp -= 2; rep.notes.push(`The floor gave way under ${v.name}. -2 Health.`); if (v.hp < 0) kill(S, v, 'Fell through a floor on a run.'); } }
    if (comp === 4) { rep.soaked = true; rep.notes.push('Black rain got in through the roof. Anything uncovered carries DMD.'); }
    if (comp === 7) { const n = 1 + d10(); raw.push({ text: `${n} items behind a locked door`, wt: n }); addRes(S, 'scrap', n); }
    if (comp === 8) raw.push(findOne(site.place));
    if (comp === 9) { const nsite = genSite(S, pick(Object.keys(scav().places)), false); nsite.known = true; S.sites.push(nsite); rep.notes.push(`A note on the wall pointed to ${nsite.name} on ${nsite.street}.`); }
    if (comp === 10 && humans(S).length < E.bedsOf(S)) { rep.people = 1; }
    while (trouble-- > 0 && team.some(p => p.alive && p.hp > 0)) {
      const n = d10(), cur = team.filter(p => p.alive && p.hp > 0), size = cur.length;
      const lv = clamp(Math.min(avgL + (S.day > 120 ? 1 : 0), E.foeLevel(S) + 1), 1, 10);
      const siren = cur.some(p => has(p, "Siren's Song"));
      let foes;
      if (n <= 4) foes = siren ? [] : E.pickFoes(['infected'], lv, Math.min(Math.ceil(d10() / 2), size * 2));
      else if (n <= 6) foes = siren ? [] : E.pickFoes(['infected'], lv, Math.min(d10(), size * 2 + 1));
      else if (n === 7) foes = E.pickFoes(['animal'], lv, size * 2);
      else if (n === 8) foes = E.pickFoes(['human'], lv, Math.min(Math.ceil(d10() / 2), size * 2));
      else if (n === 9) foes = E.pickFoes(['human'], lv, Math.min(d10(), size * 2 + 2));
      else { const big = E.named(pick(['Bloat', 'Banshee', 'Goliath']), Math.max(lv, 4)) || E.named('Bloat', lv); foes = lv >= 4 ? [big] : [E.named('Bloat', lv)]; }
      if (!foes.length) continue;
      const f = E.fight(S, cur, foes, { where: site.name, canFlee: true });
      rep.fights.push(f);
      if (f.fled || !f.won) { aborted = true; break; }
    }
    const alive = team.filter(p => p.alive);
    if (aborted) { raw.splice(Math.ceil(raw.length / 2)); rep.notes.push('They dropped half of it to get away.'); }
    let cap = E.teamCarry(S, alive, run.truck) + alive.filter(p => E.carried(p, 'backpack')).length * 20, used = 0;
    const ranks = f => (f.med ? 0 : MEDRE.test(f.text) ? 1 : FOODRE.test(f.text) ? 2 : 3);
    raw.sort((a, b) => ranks(a) - ranks(b));
    if (alive.length) for (const f of raw) {
      const cl = f.med ? { meds: f.med } : E.classify(f.text, f.wt);
      if (cl.none) { rep.finds.push({ t: E.prose(f.text), none: 1 }); continue; }
      if (cl.danger) { rep.finds.push({ t: E.prose(f.text), none: 1, danger: 1 }); continue; }
      const w2 = f.wt || (cl.food ? cl.food * 2 : cl.water ? cl.water * 4 : cl.scrap ? cl.scrap * 2 : 1);
      if (used + w2 > cap) { rep.left.push(f.text); continue; }
      used += w2;
      const line = { t: E.prose(f.text) };
      for (const k of ['food', 'water', 'fuel', 'meds', 'scrap', 'rounds']) if (cl[k]) { let v = k === 'food' ? Math.max(1, Math.round(cl[k] * .45)) : cl[k]; if ((k === 'food' || k === 'water') && rep.soaked) { for (let i = 0; i < 1; i++) { } } addRes(S, k, v); rep.got[k] = (rep.got[k] || 0) + v; line.res = k; line.v = v; }
      if (cl.comfort) { alive.forEach(p => p.stress = Math.max(0, p.stress - 1)); line.comfort = 1; }
      if (cl.weapon) { const base = E.findWeapon(cl.weapon); if (base) { const cond = E.condition(); if (cond === 'Broken') { addRes(S, 'scrap', 2); line.broken = 1; } else { const g = gearFromWeapon(S, base, cond); S.gear.push(g); rep.gear.push(`${g.n} (${cond})`); line.gear = g.n; } } }
      if (cl.armor) { const g = { id: S.nextId++, n: cl.armor[1], kind: 'armor', ar: cl.armor[2], acl: cl.armor[3], cond: 'Standard', tr: [], wt: 12 }; S.gear.push(g); rep.gear.push(g.n); line.gear = g.n; }
      for (const [re, k, n] of D.ITEM_FOUND) if (re.test(f.text)) { E.addItem(S, k, n); rep.gear.push(D.ITEMS[k].n); line.gear = D.ITEMS[k].n; break; }
      rep.finds.push(line);
    }
    if (E.dogs) alive.forEach(p => { const d = E.dogOf(S, p); if (d && d.role === 'find' && d.hp > 0) { const k = pick(['food', 'food', 'meds', 'scrap', 'water']), v = k === 'meds' ? 1 + d10() % 2 : 2 + Math.floor(d10() / 2); addRes(S, k, v); rep.got[k] = (rep.got[k] || 0) + v; rep.finds.push({ t: `${d.name} found a hidden stash under the floor: ${v} ${D.RES_NAME[k].toLowerCase()}`, res: k, v }); } });
    if (rep.soaked && (rep.got.food || rep.got.water) && alive.length) alive.forEach(p => expose(S, p, 1, 4, 'soaked supplies', null));
    site.visits++; site.known = true; site.status = Math.max(0, site.status - 1);
    if (site.visits >= 3) site.status = 0;
    alive.forEach(p => { p.away = false; p.room = p.lastRoom && roomOf(S, p.lastRoom) && E.capOf(roomOf(S, p.lastRoom)) > E.workers(S, roomOf(S, p.lastRoom)).length ? p.lastRoom : null; p.xp += 3; });
    S.stat.runs++;
    rep.dead = team.filter(p => !p.alive).map(p => p.name);
    if (E.runProse) rep.story = E.runProse(S, rep);
    push(S, 'runreport', rep);
    if (rep.people && alive.length && E.roomFor(S)) push(S, 'found_survivors', {});
    log(S, `${rep.team.join(' and ')} came back from ${site.name}.`, 'good');
  }

  // ---------- rooms
  E.powerDemand = S => S.rooms.filter(r => R(r).power && E.workers(S, r).length && !r.broken).length;
  E.powerSupply = S => S.rooms.filter(r => r.type === 'generator' && !r.broken).reduce((a, r) => a + (E.workers(S, r).length ? 4 + r.tier * 2 : 0), 0);
  E.fuelBurn = S => { const d = E.powerDemand(S); return d ? Math.max(1, Math.ceil(d / 4) - S.rooms.filter(r => r.type === 'generator').reduce((a, r) => a + (E.workers(S, r).some(w => w.skills.engineering >= 4) ? 1 : 0), 0)) : 0; };
  E.blackout = S => E.powerDemand(S) > 0 && (E.powerSupply(S) < E.powerDemand(S) || S.res.fuel < E.fuelBurn(S));
  E.moldPenalty = r => (r.mold ? clamp(1 - r.mold * .25, .25, 1) : 1);
  function fearMult(S, r) { // CANON flavor: people distrust the Damned. Numbers invented.
    const ws = E.workers(S, r); if (!ws.some(p => p.damned) || E.lawOn(S, 'ours')) return 1;
    return ws.some(p => !p.damned && p.fears) ? .75 : 1;
  }
  E.fearMult = fearMult;
  E.outputOf = (S, r, blackout) => {
    const def = R(r); if (!def.res || r.broken) return 0;
    const ws = E.workers(S, r).filter(p => !down(p));
    let t = 0;
    const full = (def.cap || 0) * W(r) + 1;
    ws.forEach((p, wi) => { let v = def.base + def.perTier * r.tier + Math.max(0, E.pool(p, def.skill)) * def.k; if (def.res === 'food') { if (has(p, 'Gatherer')) v += 1; if (has(p, 'Hunter')) v += 1; } if (p.snap) v *= 2; if (p.hunger >= 2) v *= .5; if (wi >= full) v *= .6; t += v; });
    if (ws.length && r.lay) t = (t + (r.lay.out || 0)) * (1 + (r.lay.wide || 0));
    if (def.power && blackout) t *= .5;
    t *= 1 + (W(r) - 1) * .1;
    if (S.lockdown && r.type !== 'gate') t *= .5;
    if (E.socialMult) t *= E.socialMult(S, r);
    t *= E.dif(S).yield;
    if (r.type === 'pens' && E.staffed(S, 'butcher')) t *= 1.4;
    t *= E.moldPenalty(r) * fearMult(S, r) * E.orderMult(S) * (E.lawOn(S, 'labour') ? 1.3 : 1);
    return Math.round(t * 10) / 10;
  };
  E.forecast = S => { const b = E.blackout(S), o = {}; S.rooms.forEach(r => { const def = R(r); if (def.res) o[def.res] = (o[def.res] || 0) + E.outputOf(S, r, b); }); return o; };
  E.needs = S => { let f = 0, w = 0; home(S).concat(living(S).filter(p => p.away)).forEach(p => { if (p.damned) return; f += (has(p, 'Light Eater') ? .5 : 1) * (E.lawOn(S, 'rations') ? .6 : 1) * E.kitchenMult(S); w += has(p, 'Light Drinker') ? .75 : 1; }); f += E.kidFood ? E.kidFood(S) : 0; w += E.kidFood ? E.kidFood(S) : 0; return { food: f, water: w }; };
  E.assign = (S, p, r) => { // true if moved
    if (p.away || p.sealed || !p.alive) return false;
    if (!r) { p.room = null; p.lastRoom = null; return true; }
    if (r.type === 'quarantine') return E.seal(S, p);
    if (!E.capOf(r) || !E.reachable(S, r.row, r.col)) return false;
    if (E.workers(S, r).length >= E.capOf(r) && p.room !== r.id) return false;
    p.room = r.id; p.lastRoom = r.id; return true;
  };
  // ---------- layout: what a room gets from whatever is built beside, above or below it (invented for this game)
  const LAY = [
    ['grow', 'filter', 'Watered by the Rain Filter: +1.5 food', { out: 1.5 }],
    ['filter', 'generator', 'Pump wired to the Generator: +1 water', { out: 1 }],
    ['workshop', 'generator', 'Power tools from the Generator: +1 scrap', { out: 1 }],
    ['bench', 'workshop', 'Shares tools with the Workshop: +6 rounds', { rounds: 6 }],
    ['clinic', 'bunks', 'Beds close by: treats 1 more patient', { treat: 1 }],
    ['common', 'bunks', 'Next to the beds: 1 more Stress off', { stress: 1 }],
    ['radio', 'generator', 'Clean power: finds signals faster', { radio: 15 }],
    ['training', 'gate', 'Drills by the Gate: faster learning', { xp: 2 }],
    ['butcher', 'cold', 'Meat goes straight to the Cold Room: +2 food a day', { out: 0 }],
    ['pens', 'bunks', 'Animals next to the beds: rest removes less Stress', { rest: 1 }, 1],
    ['bunks', 'pens', 'Animals next to the beds: rest removes less Stress', { rest: 1 }, 1],
    ['bunks', 'generator', 'Generator noise: rest removes less Stress', { rest: 1 }, 1],
    ['bunks', 'bench', 'Hammering all night: rest removes less Stress', { rest: 1 }, 1],
    ['bunks', 'workshop', 'Workshop noise: rest removes less Stress', { rest: 1 }, 1],
    ['bunks', 'quarantine', 'Sleeping beside the cells: rest removes less Stress', { rest: 1 }, 1],
    ['common', 'quarantine', 'Nobody relaxes beside the cells: 1 less Stress off', { stress: -1 }, 1],
    ['clinic', 'quarantine', 'Infection next door: treats 1 fewer patient', { treat: -1 }, 1],
  ];
  const nextTo = (S, r) => S.rooms.filter(x => x !== r && ((x.row === r.row && (x.col + W(x) === r.col || r.col + W(r) === x.col)) || (Math.abs(x.row - r.row) === 1 && x.col < r.col + W(r) && r.col < x.col + W(x))));
  E.nextTo = nextTo;
  E.relayout = S => {
    S.rooms.forEach(r => {
      const near = nextTo(S, r), lay = { good: [], bad: [] };
      r.link = near.some(x => x.row === r.row && x.type === r.type) && !!D.ROOMS[r.type].cap;
      if (r.link) { lay.good.push('Linked with the room beside it: +1 worker, +20% output'); lay.wide = .2; }
      for (const [a, b, text, fx, bad] of LAY) if (r.type === a && near.some(x => x.type === b)) { (bad ? lay.bad : lay.good).push(text); for (const k in fx) lay[k] = (lay[k] || 0) + fx[k]; }
      r.lay = lay;
    });
  };
  E.layoutPreview = (S, type, slot) => { const t = { id: -1, type, tier: 0, row: slot.row, col: slot.col, broken: false, mold: 0 }; S.rooms.push(t); E.relayout(S); const l = t.lay; S.rooms.pop(); E.relayout(S); return l; };
  E.layoutScore = (S, type, slot) => { const l = E.layoutPreview(S, type, slot); return l.good.length - l.bad.length * 1.5; };

  // Rooms join up left to right from the ladder shaft, one door at a time.
  E.reachable = (S, row, col) => { for (let c = 0; c < col; c++) if (!E.roomAt(S, row, c)) return false; return true; };
  E.pathDist = r => r.row + r.col; // steps from the Gate, which is beside the shaft on the top level
  E.digCost = S => { const row = Math.max(...S.slots.map(s => s.row)) + 1; return row < 3 ? 6 : 25 * (row - 2); };
  E.dig = (S) => { const c = E.digCost(S); if (S.res.scrap < c) return false; addRes(S, 'scrap', -c); const row = Math.max(...S.slots.map(s => s.row)) + 1; for (let c = 0; c < E.COLS; c++) S.slots.push({ row, col: c }); return true; };
  E.buildable = (S) => Object.entries(D.ROOMS).filter(([k, d]) => k !== 'gate' && (!d.unique || !S.rooms.some(r => r.type === k)));
  E.build = (S, type, slot) => { const d = D.ROOMS[type]; if (!E.reachable(S, slot.row, slot.col) || S.res.scrap < d.build || E.roomAt(S, slot.row, slot.col)) return null; addRes(S, 'scrap', -d.build); const r = { id: S.nextId++, type, tier: 0, row: slot.row, col: slot.col, broken: false, mold: 0, pushed: false }; S.rooms.push(r); E.relayout(S); log(S, `Built ${d.name}.`, 'good'); return r; };
  E.upgradeCost = r => D.UPGRADE[r.tier];
  E.upgrade = (S, r) => { const c = E.upgradeCost(r); if (!c || S.res.scrap < c) return false; addRes(S, 'scrap', -c); r.tier++; return true; };
  E.repairCost = r => 4 + r.tier * 3;
  E.repair = (S, r) => { const c = E.repairCost(r); if (S.res.scrap < c) return false; addRes(S, 'scrap', -c); r.broken = false; return true; };
  E.burnMold = (S, r) => { if (S.res.fuel < 2) return false; addRes(S, 'fuel', -2); r.mold = 0; E.workers(S, r).forEach(p => expose(S, p, 1, 4, 'spores', null)); return true; };
  // Push: this game's version of pushing your luck. CANON dice: a Crit doubles, 0 successes is +1 Stress.
  E.push = (S, r) => {
    const def = R(r); if (r.pushed || r.broken || !def.skill) return null;
    const p = E.workers(S, r).filter(x => !down(x)).sort((a, b) => b.skills[def.skill] - a.skills[def.skill])[0]; if (!p) return null;
    r.pushed = true;
    const res = E.rollSkill(p, def.skill, 6), o = { who: p.name, skill: E.skillName(def.skill), dice: res.dice, succ: res.succ, crit: res.crit, gain: 0 };
    if (res.succ === 0) { addStress(S, p, 1); r.broken = true; p.hp = Math.max(1, p.hp - 1); o.bad = true; o.msg = `${p.name} pushed too hard and something broke.`; } else {
      const k = def.res || (r.type === 'bench' ? 'rounds' : r.type === 'clinic' ? 'meds' : null);
      if (k) { const v = (k === 'rounds' ? res.succ * 5 : k === 'meds' ? Math.ceil(res.succ / 2) : res.succ * 2) * (res.crit ? 2 : 1); addRes(S, k, v); o.gain = v; o.res = k; }
      if (r.type === 'common') { home(S).forEach(x => x.stress = Math.max(0, x.stress - res.succ)); o.msg = `Everyone breathes easier. Stress -${res.succ}.`; }
      if (r.type === 'radio') { S.radio += res.succ * 20; o.msg = 'Stronger signal tonight.'; }
      if (r.type === 'gate') { S.gateBonus = res.succ; o.msg = 'The gate is ready for tonight.'; }
      if (r.type === 'training') { E.workers(S, r).forEach(x => x.xp += res.succ * 2); o.msg = 'A hard session.'; }
      p.xp += 1; addStress(S, p, 0);
    }
    return o;
  };
  E.talk = (S, shep, who) => { if (shep.talked === S.day || !who.fears) return null; shep.talked = S.day; const r = E.rollSkill(shep, 'negotiation', 7); if (r.succ >= 1) who.fears = false; else addStress(S, shep, 1); return r.succ >= 1; };
  // ---------- trade
  E.tradeDeals = S => {
    if (S.deals && S.deals.day === S.day) return S.deals.list;
    const r = S.rooms.find(x => x.type === 'trade'), w = r && E.workers(S, r)[0], mood = d10(), disc = 1 - (w ? clamp(w.skills.negotiation * .04, 0, .3) : 0);
    const moodMul = mood <= 2 ? 1.3 : mood >= 9 ? .8 : 1, list = [];
    for (const k of ['food', 'water', 'fuel', 'meds', 'scrap']) {
      const sc = d10(), m = sc <= 4 ? 1 : sc <= 7 ? 2 : sc <= 9 ? 3 : 5, qty = k === 'meds' ? 2 : 6; // CANON scarcity
      list.push({ k, qty, price: Math.ceil(D.VALUE[k] * qty * m * moodMul * disc / 2) / 1, sell: Math.floor(D.VALUE[k] * qty / 2.4), sc: ['', 'Common', 'Scarce', 'Rare', '', 'Precious'][m], done: 0 });
    }
    S.deals = { day: S.day, list, mood: mood <= 2 ? 'grumpy' : mood >= 9 ? 'friendly' : 'even' };
    return list;
  };
  E.buy = (S, d) => { if (S.res.rounds < d.price || d.done >= 3) return false; addRes(S, 'rounds', -d.price); addRes(S, d.k, d.qty); d.done++; return true; };
  E.sell = (S, d) => { if (S.res[d.k] < d.qty || d.done >= 3) return false; addRes(S, d.k, -d.qty); addRes(S, 'rounds', d.sell); d.done++; return true; };

  // Past L8 a monster's dice pool makes Block and Dodge close to impossible (DR = its pool), so those levels are held back for the endgame.
  E.foeLevel = S => Math.max(1, Math.min(Math.ceil(S.day / 30), 7 + Math.max(0, Math.floor((S.day - 330) / 60))) + E.dif(S).foe);
  E.storeCaps = S => { const n = Math.max(1, humans(S).length); return { food: 36 + n * 5 + S.rooms.filter(r => r.type === 'cold').reduce((a, r) => a + 40 * W(r) + 20 * r.tier, 0), water: 60 + n * 8, fuel: 120, meds: 30 + n * 2, rounds: 500, scrap: 400 }; };

  // ---------- night
  // A threat is known a day ahead, so you can move fighters to the Gate before it lands.
  function planThreat(S) {
    S.threat = null;
    if (S.day < 6) return;
    const lure = E.lure ? E.lure(S) : 0, chance = Math.min(.18 + lure * .04, (.06 + S.day * .0012 + (S.noise || 0)) * (1 + lure * .25)) * (E.lawOn(S, 'sealed') ? .6 : 1) * E.dif(S).raid;
    S.noise = Math.max(0, (S.noise || 0) * .5) + S.rooms.filter(r => r.type === 'pens').length * .015;
    if (Math.random() >= chance) return;
    const groups = S.day < 14 ? ['infected', 'animal'] : pick([['infected'], ['infected', 'animal'], ['human'], ['human'], S.day > 30 ? ['machine'] : ['infected']]);
    const lookout = ['gate', 'radio'].some(t => S.rooms.some(r => r.type === t && E.workers(S, r).length));
    S.threat = { groups, known: lookout || (E.dogs && E.dogs(S).some(d => d.alive && !d.pup)) || (E.anyDef && E.anyDef(S, 'alarm')) || Math.random() < .5 };
    if (S.threat.known) log(S, E.threatText(S.threat), 'bad');
  }
  E.threatText = t => (t.groups.includes('human') ? 'Armed people on the road. They will be here tonight.' : t.groups.includes('machine') ? 'Machines moving this way. They will be here tonight.' : 'Infected are gathering outside. They will come tonight.');
  function nightAttack(S) {
    if (!S.threat) return;
    const groups = S.threat.groups, team = humansAtHome(S), meanL = team.length ? Math.round(team.reduce((a, p) => a + p.level, 0) / team.length) : 1;
    S.threat = null;
    const L = clamp(Math.min(E.foeLevel(S), meanL), 1, 10), surge = S.day > 20 && Math.random() < .15 ? 1.7 : 1;
    const gate = S.rooms.find(r => r.type === 'gate'), guards = E.workers(S, gate).filter(down0);
    const budget = clamp(Math.round((guards.length * 1.35 + Math.min(S.day, 220) * .018 + Math.max(0, humans(S).length - 12) * .3) * surge * E.dif(S).raidB * (1 + (E.lure ? E.lure(S) : 0) * .12)), 2, 18);
    const foes = E.pickFoes(groups, L, budget, 10);
    if (!foes.length) return;
    let fights = [], rest = foes, breached = false;
    const tunnel = S.day > 25 && S.rooms.some(r => r.row >= 2) && !groups.includes('machine') && Math.random() < .18;
    if (guards.length && !tunnel && foes.length <= 2 && guards.length >= 2) { const f = E.fight(S, guards, foes, { where: 'the Gate' }); S.stat.raids++; push(S, 'raid', { kind: 'Scouts at the Gate. The watch handled it.', foes: foes.map(x => ({ n: x.n, art: x.art })), fights: [f], breached: false, broke: 0 }); return; }
    if (guards.length && !tunnel) { // you fight this one yourself in the morning
      if (S.gateBonus) guards.forEach(p => { p.xp += 1; });
      S.gateBonus = 0; S.stat.raids++;
      S.raidNow = { foes, ids: guards.map(p => p.id).slice(0, 4), kind: groups.includes('human') ? 'People came for what you have.' : groups.includes('machine') ? 'Machines at the door.' : 'Something heard you.' };
      return;
    }
    const others = S.rooms.filter(r => r.id !== gate.id && r.type !== 'quarantine').sort(tunnel ? (a, b) => a.row - b.row || a.col - b.col : (a, b) => E.pathDist(b) - E.pathDist(a));
    if (tunnel) log(S, 'They did not come through the Gate. They dug up through the floor of the lowest level.', 'bad');
    while (rest.length && others.length) {
      breached = true;
      const r = others.pop(), ws = S.lockdown ? [] : E.workers(S, r).filter(down0);
      rest = E.defendRoom ? E.defendRoom(S, r, rest) : rest; if (!rest.length) break;
      if (E.hasDef && E.hasDef(r, 'door') && Math.random() < .5) continue;
      if (Math.random() < .3) r.broken = true;
      if (ws.length) { const f = E.fight(S, ws, rest, { where: R(r).name, inside: true, canFlee: true }); fights.push(f); rest = rest.filter(x => x.hp > 0); }
    }
    if (rest.length) { const n = Math.min(rest.length, 3); log(S, 'Something got in and tore through the shelter before leaving.', 'bad'); for (let i = 0; i < n; i++) { addRes(S, 'food', -3); } }
    S.gateBonus = 0;
    const kind = tunnel ? 'Something dug in from underneath.' : groups.includes('human') ? 'People came for what you have.' : groups.includes('machine') ? 'Machines at the door.' : 'Something heard you.';
    S.stat.raids++;
    push(S, 'raid', { kind, foes: foes.map(x => ({ n: x.n, art: x.art })), fights, breached, broke: 0 });
  }
  // whatever gets past the Gate goes through the shelter on its own
  E.raidRoam = (S, foes) => {
    let rest = foes.filter(x => x.hp > 0); const fights = [], others = S.rooms.filter(r => r.type !== 'gate' && r.type !== 'quarantine').sort((a, b) => E.pathDist(b) - E.pathDist(a)); // they come through the nearest rooms first
    while (rest.length && others.length) {
      const r = others.pop(), ws = E.workers(S, r).filter(down0);
      rest = E.defendRoom ? E.defendRoom(S, r, rest) : rest; if (!rest.length) break;
      if (E.hasDef && E.hasDef(r, 'door') && Math.random() < .5) continue;
      if (Math.random() < .3) r.broken = true;
      if (ws.length) { fights.push(E.fight(S, ws, rest, { where: R(r).name, inside: true, canFlee: true })); rest = rest.filter(x => x.hp > 0); }
    }
    if (rest.length) { log(S, 'Something got in and tore through the shelter before leaving.', 'bad'); S.res.food = Math.max(0, S.res.food - Math.min(rest.length, 3) * 3); }
    push(S, 'raid', { kind: 'It got past the Gate.', foes: foes.map(x => ({ n: x.n, art: x.art })), fights, breached: true });
  };
  const humansAtHome = S => home(S).filter(p => !p.damned && !p.sealed);
  function moldStep(S) {
    S.rooms.forEach(r => {
      if (!r.mold) return;
      if (Math.random() < .35) r.mold = Math.min(4, r.mold + 1);
      E.workers(S, r).forEach(p => { if (Math.random() < .3) expose(S, p, 1, 4, 'spores', null); });
      if (r.mold >= 3 && Math.random() < .3) { const n = nextTo(S, r).filter(x => !x.mold); if (n.length) { pick(n).mold = 1; log(S, 'The black mold has spread to another room.', 'bad'); } }
    });
  }
  function spawnMold(S) { const opts = S.rooms.filter(r => r.type !== 'gate' && !r.mold).sort((a, b) => (a.row - b.row) + (Math.random() - .5) * 2).slice(0, 3); if (opts.length) { pick(opts).mold = 1; log(S, 'Black mold has started growing in the shelter.', 'bad'); } }
  E.spawnMold = spawnMold;

  // ---------- the 11th Hour. CANON: the debris field and the Fall, Push, Debris table (1d10 DC 6, 2d10 DC 8, 4d10 DC 9).
  // Invented: the first fragments reach Earth on Day 365 (DB's call), ahead of the main field, then come more often.
  E.STRIKE_DAY = 365;
  function strikeStep(S) {
    const t = S.day - E.STRIKE_DAY;
    const OMEN = { 300: 'The lines in the sky do not fade by morning now.', 335: 'A flash at noon, far to the west. The ground shook twice.', 355: 'Priests and engineers on the radio are saying the same number.', 364: 'Everyone can see it tonight. Nobody is sleeping.' };
    if (OMEN[S.day]) say(S, 'The 11th Hour', OMEN[S.day], { s: 1 });
    if (t >= 0 && t < 90 && S.day % 15 === 0) log(S, 'More of the sky came down in the night. The deep rooms never even shook.', 'bad');
    if (t < 0) return;
    if (Math.random() >= Math.min(.85, .12 + t * .004) && t > 0) return;
    if (t > 0 && E.strikeMercy && E.strikeMercy(S)) { say(S, 'It missed', 'She told you where it would fall, and you were somewhere else. It came down a mile away. The whole shelter shook, and nobody was hurt.', { s: 1 }); return; }
    const hit = t < 60 ? { n: 1, dr: 6, name: 'Burning fragments' } : t < 180 ? { n: 2, dr: 8, name: 'Heavy debris' } : { n: 4, dr: 9, name: 'Colossal debris' };
    const lines = [], rooms = S.rooms.filter(r => r.row < 3).sort((a, b) => (a.row - b.row) + (Math.random() - .5) * 2.2).slice(0, Math.min(4, 1 + Math.floor(t / 60)));
    const hurt = p => {
      const r = E.rollSkill(p, 'acrobatics', hit.dr); let dmg = 0;
      for (let i = 0; i < hit.n; i++) dmg += d10();
      if (r.succ >= 1) dmg = Math.ceil(dmg / 2); else addStress(S, p, 1);
      p.hp -= dmg;
      if (p.hp < 0) { kill(S, p, 'Killed by falling debris.'); lines.push(`${p.name} was killed.`); } else { if (p.hp === 0) p.hp = 1; lines.push(`${p.name} was hit for ${dmg}.`); }
    };
    rooms.forEach(r => { r.broken = true; lines.unshift(`${R(r).name} was smashed.`); home(S).filter(p => p.room === r.id).forEach(hurt); });
    { const safe = id => { const rr = id && E.roomOf(S, id); return rr && rr.row >= 3; }; home(S).filter(p => !safe(p.room) && !rooms.some(r => r.id === p.room) && Math.random() < .25).forEach(hurt); }
    if (Math.random() < .4) living(S).filter(p => p.away).forEach(hurt);
    home(S).forEach(p => addStress(S, p, 1));
    S.stat.strikes = (S.stat.strikes || 0) + 1;
    S.score += 150 + (t === 0 ? 1000 : 0);
    push(S, 'strike', { name: hit.name, lines, first: t === 0 });
  }

  // ---------- room emergencies: invented for this game, resolved with TOFU dice. Ignore one and End Day makes it worse.
  const INCIDENTS = {
    fire: { n: 'Fire!', sk: 'engineering', dr: 6, ok: 'Out before it spread.', bad: 'The fire took the room.' },
    short: { n: 'Power short!', sk: 'technology', dr: 6, ok: 'Back on.', bad: 'Something blew and it stayed blown.' },
    rats: { n: 'Infected rats!', sk: 'melee', dr: 6, ok: 'Stamped out.', bad: 'They got into everything, and into someone.' },
    brawl: { n: 'A fight broke out!', sk: 'insight', dr: 6, ok: 'Talked down.', bad: 'Somebody got hurt. Nobody will say who started it.' },
    leak: { n: 'Black leak!', sk: 'survival', dr: 6, ok: 'Sealed.', bad: 'It got in the walls.' },
    cave: { n: 'Ceiling coming down!', sk: 'athletics', dr: 7, ok: 'Propped up in time.', bad: 'It came down on them.' },
  };
  E.INCIDENTS = INCIDENTS;
  function spawnIncidents(S) {
    S.incidents = [];
    if (S.day < 3 || Math.random() >= Math.min(.75, .35 + S.day * .004)) return;
    const n = S.day > 30 && Math.random() < .35 ? 2 : 1, opts = S.rooms.filter(r => r.type !== 'quarantine' && E.workers(S, r).length).sort(() => Math.random() - .5);
    opts.slice(0, n).forEach(r => S.incidents.push({ id: S.nextId++, room: r.id, type: pick(Object.keys(INCIDENTS)) }));
  }
  function incidentFail(S, i, ignored) {
    const r = roomOf(S, i.room), def = INCIDENTS[i.type]; if (!r) return;
    const ws = E.workers(S, r);
    log(S, `${def.n.replace('!', '')} in ${R(r).name}. ${def.bad}`, 'bad');
    if (i.type === 'fire' || i.type === 'short') r.broken = true;
    if (i.type === 'cave') { r.broken = true; ws.forEach(p => { p.hp -= 2; if (p.hp < 0) kill(S, p, 'Crushed in a ceiling collapse.'); else if (p.hp === 0) p.hp = 1; }); }
    if (i.type === 'fire') ws.forEach(p => { p.hp = Math.max(1, p.hp - 1); });
    if (i.type === 'rats') ws.forEach(p => expose(S, p, 2, 4, 'a scratch', null));
    if (i.type === 'brawl') ws.forEach(p => addStress(S, p, 2));
    if (i.type === 'leak') r.mold = Math.min(4, (r.mold || 0) + 1);
    if (i.type === 'fire' && ignored) nextTo(S, r).forEach(x => { if (Math.random() < .5) { x.broken = true; log(S, `The fire spread to ${R(x).name}.`, 'bad'); } });
  }
  E.resolveIncident = (S, id) => {
    const i = (S.incidents || []).find(x => x.id === id); if (!i) return null;
    const r = roomOf(S, i.room), def = INCIDENTS[i.type], p = E.workers(S, r).filter(x => !down(x) && !x.sealed).sort((a, b) => b.skills[def.sk] - a.skills[def.sk])[0];
    if (!p) return { none: true };
    S.incidents = S.incidents.filter(x => x !== i);
    const res = E.rollSkill(p, def.sk, def.dr), o = { who: p.name, verb: 'handles it', skill: E.skillName(def.sk), dr: def.dr, dice: res.dice, succ: res.succ, crit: res.crit, gain: 0 };
    if (res.succ === 0) { addStress(S, p, 1); o.bad = true; o.msg = def.bad; incidentFail(S, i); } else { o.msg = def.ok; p.xp += 3; S.score += 10; if (res.crit) { p.stress = 0; addRes(S, 'scrap', 6); o.res = 'scrap'; o.gain = 6; } }
    return o;
  };

  // ---------- leveling
  E.xpNeed = p => 12 + (p.level - 1) * 14;
  function levelCheck(S, p) {
    const need = E.xpNeed(p);
    while (p.xp >= need && p.level < 10) {
      p.xp -= need; p.level++; const was = E.maxHp(p); allocate(p); p.hp += E.maxHp(p) - was; S.score += 15;
      log(S, `${p.name} reached Level ${p.level}.`, 'good');
      if (p.level % cls(p).perkEvery === 0) { if (E.perkLater) E.perkLater(S, p); else push(S, 'perk', { id: p.id }); }
    }
  }
  E.perkOptions = (S, p) => {
    if (p.damned) return Object.keys(D.DAMNED_PERKS).filter(k => !has(p, k)).sort(() => Math.random() - .5).slice(0, 3);
    const opts = Object.keys(D.PERKS).filter(k => !has(p, k)).sort(() => Math.random() - .5).slice(0, 3);
    if (p.cls === 'survivor') p.strains.map(s => D.MUTATIONS[s][0]).filter(k => !has(p, k)).slice(0, 2).forEach(k => opts.unshift(k));
    return opts.slice(0, 4);
  };
  E.perkDesc = k => D.PERKS[k] || D.DAMNED_PERKS[k] || (Object.values(D.MUTATIONS).find(m => m[0] === k) || [])[1] || '';

  // ---------- End Day
  E.endDay = S => {
    if (S.queue.length || S.over || S.quest || S.raidNow) return false;
    S.log = [];
    E.relayout(S);
    (S.incidents || []).slice().forEach(i => incidentFail(S, i, true)); S.incidents = [];
    const blackout = E.blackout(S); S.blackout = blackout;
    if (blackout) log(S, 'The lights went out. Powered rooms ran at half.', 'bad');
    else if (E.fuelBurn(S)) addRes(S, 'fuel', -E.fuelBurn(S));
    // production
    const made = {};
    S.rooms.forEach(r => {
      const def = R(r), ws = E.workers(S, r);
      if (r.broken) return;
      if (def.res) { const v = E.outputOf(S, r, blackout); if (v) { addRes(S, def.res, v); made[def.res] = (made[def.res] || 0) + v; } }
      if (r.type === 'bench' && ws.length && S.res.scrap >= 8) { const w = ws[0], make = 2 + r.tier + Math.floor(Math.max(0, E.pool(w, 'engineering')) / 2); addRes(S, 'scrap', -2); addRes(S, 'rounds', make * 3 + ((r.lay && r.lay.rounds) || 0)); }
      if (r.type === 'radio' && ws.length && !blackout) S.radio += 12 + ws[0].skills.technology * 5 + r.tier * 6 + ((r.lay && r.lay.radio) || 0);
      if (r.type === 'common' && ws.length) { const n = Math.max(0, 1 + Math.floor(r.tier / 2) + (ws[0].skills.performance >= 4 ? 1 : 0) + ((r.lay && r.lay.stress) || 0)); home(S).forEach(p => { p.stress = Math.max(0, p.stress - n); }); }
      if (r.type === 'trade' && ws.length) addRes(S, 'rounds', 2 + Math.floor(ws[0].skills.negotiation / 2));
      ws.forEach(p => { p.xp += r.type === 'training' ? 4 + r.tier + ((r.lay && r.lay.xp) || 0) : 2; delete p.snap; if (p.damned && false) { } });
      // CANON flavor: fear of the Damned costs Stress
      if (ws.some(p => p.damned)) ws.forEach(p => { if (!p.damned && p.fears) addStress(S, p, 1); });
      if (r.mold) { }
    });
    // an unimproved Rain Filter lets some of the black rain through (invented)
    if (D.WEATHER[S.weather].dr >= 8 && S.rooms.some(r => r.type === 'filter') && !S.rooms.some(r => r.type === 'filter' && r.tier >= 1)) { log(S, 'The filter could not keep up with the rain. Something got in the water.', 'bad'); humans(S).filter(p => !p.away).forEach(p => expose(S, p, 1, 4, 'tainted water', null)); }
    // eating and drinking (CANON: 2 lbs food, half a gallon water; missing a day is +1 Exhaustion)
    const need = E.needs(S);
    ['food', 'water'].forEach(k => {
      const eaters = living(S).filter(p => !p.damned).sort((a, b) => (k === 'food' ? a.hunger - b.hunger : a.thirst - b.thirst));
      let have = S.res[k];
      eaters.reverse().forEach(p => {
        const c = k === 'food' ? (has(p, 'Light Eater') ? .5 : 1) * (E.lawOn(S, 'rations') ? .6 : 1) * E.kitchenMult(S) : (has(p, 'Light Drinker') ? .75 : 1);
        if (have >= c) { have -= c; if (k === 'food') p.hunger = 0; else p.thirst = 0; } else { if (k === 'food') { p.hunger++; if (p.hunger % 2 === 0) p.exh++; } else { p.thirst++; p.exh++; } }
      });
      if (E.kidFood) have = Math.max(0, have - E.kidFood(S));
      if (E.dogFood && k === 'food') have = Math.max(0, have - E.dogFood(S));
      S.res[k] = Math.round(have * 10) / 10;
    });
    living(S).forEach(p => {
      if (p.damned) return;
      p.penalty = p.thirst + Math.floor(p.hunger / 3);
      if (p.thirst >= 4) kill(S, p, 'Died of thirst.'); else checkExh(S, p);
    });
    if (need.food > 0 && S.res.food === 0) log(S, 'The food ran out.', 'bad');
    const starving = humans(S).filter(p => !p.away && !p.sealed && p.hunger >= 3);
    if (S.res.food === 0 && starving.length && humans(S).filter(p => !p.away).length >= 3 && !S.queue.some(q => q.k === 'lots') && S.day - (S.lotsDay || -99) >= 4) { S.lotsDay = S.day; push(S, 'lots', {}); }
    humans(S).forEach(p => { if (p.ate && S.day - p.ate >= 8 && Math.random() < .03) { p.ate = null; push(S, 'shakes', { id: p.id }); } });
    if (need.water > 0 && S.res.water === 0) log(S, 'The water ran out.', 'bad');
    E.Q.back(S);
    // runs
    for (const run of S.runs.slice()) { run.left--; if (run.left <= 0) { resolveRun(S, run); S.runs = S.runs.filter(x => x !== run); } }
    nightAttack(S); S.lockdown = false; strikeStep(S); moldStep(S); processWaits(S); processDamned(S);
    // CANON rest table
    const beds = E.bedsOf(S), bunk = S.rooms.find(r => r.type === 'bunks'), clinic = S.rooms.find(r => r.type === 'clinic'), rest = home(S).filter(p => p.alive);
    const treat = [];
    if (clinic && !clinic.broken) { const ws = E.workers(S, clinic).filter(p => !down(p)); if (ws.length) { let slots = Math.max(1, ws.length * (1 + clinic.tier) + ((clinic.lay && clinic.lay.treat) || 0)); rest.filter(p => p.hp < E.maxHp(p) || p.exh > 0).sort((a, b) => (a.hp / E.maxHp(a)) - (b.hp / E.maxHp(b))).forEach(p => { if (slots > 0 && S.res.meds >= 1) { slots--; addRes(S, 'meds', -1); treat.push(p); } }); ws.forEach(w => w.xp += 1); } }
    let bedsLeft = beds;
    rest.forEach(p => {
      const ph = E.score(p, 'physical'); let row;
      if (treat.includes(p)) row = clinic.tier >= 3 ? [p.level * 3 + ph, 3, 10] : [p.level * 2 + ph, 2, 5];
      else if (bedsLeft > 0 && !p.sealed) { bedsLeft--; row = bunk && bunk.tier >= 1 ? [p.level + ph, 1, Math.max(0, 2 - ((bunk.lay && bunk.lay.rest) || 0))] : [ph, 0, 0]; } else if (p.sealed) row = [ph, 0, 0]; else { row = [Math.ceil(ph / 2), 0, -1]; }
      if (treat.includes(p) && has(p, 'First Aid Expert')) row[0] *= 2;
      if (p.hp < E.maxHp(p)) p.hp = Math.min(E.maxHp(p), p.hp + row[0] + (has(p, 'Bestial Resilience') ? 2 : 0));
      p.exh = Math.max(0, p.exh - (p.hunger >= 2 ? 0 : row[1]));
      if (row[2] > 0) p.stress = Math.max(0, p.stress - row[2] - (has(p, 'Efficient Sleeper') ? 1 : 0)); else if (row[2] < 0) addStress(S, p, 1);
      p.used = false;
      if (p.sealed && !p.wait && !p.damned) { addStress(S, p, 1); }
    });
    rest.forEach(p => levelCheck(S, p));
    if (S.queue.length) { }
    // storage limits: nothing piles up forever
    const cap = E.storeCaps(S); for (const k in cap) if (S.res[k] > cap[k]) S.res[k] = cap[k];
    // morning
    S.made = Object.entries(made).map(([k, v]) => `${Math.round(v)} ${D.RES_NAME[k].toLowerCase()}`).join(', ');
    S.day++;
    planThreat(S);
    spawnIncidents(S);
    if (S.day === 25 || S.day === 50 || S.day === 75 || S.day === 100 || (S.day > 100 && S.day % 50 === 0)) push(S, 'milestone', { d: S.day });
    S.score += 10 + humans(S).length * 2;
    S.rooms.forEach(r => r.pushed = false);
    S.weather = weatherRoll(S);
    if (S.day % 7 === 0) S.queue.push({ k: 'weekly', p: { r: d10() } });
    // radio finds
    if (S.radio >= 100) { S.radio -= 100; if (Math.random() < .55 && humans(S).length < E.bedsOf(S) + 1 && (!E.evOk || E.evOk(S, 'signal'))) { if (E.evMark) E.evMark(S, 'signal'); push(S, 'signal', {}); } else { const s = genSite(S, pick(Object.keys(scav().places)), Math.random() < .5); s.known = true; S.sites.push(s); log(S, `The radio turned up ${s.name} on ${s.street}.`, 'good'); } }
    if (E.leaderDay) E.leaderDay(S);
    if (E.socialDay) E.socialDay(S);
    if (E.familyDay) E.familyDay(S);
    if (E.dogDay) E.dogDay(S);
    if (E.illnessDay) E.illnessDay(S);
    if (E.storyDay) E.storyDay(S);
    if (E.endingDay) E.endingDay(S);
    if (E.truthDay) E.truthDay(S);
    if (E.staffed(S, 'butcher') && S.rooms.some(r => r.type === 'cold')) addRes(S, 'food', 2);
    if (E.staffed(S, 'kitchen')) home(S).filter(p => !p.damned && p.hunger === 0).forEach(p => { if (Math.random() < .3) p.stress = Math.max(0, p.stress - 1); });
    if (E.staffed(S, 'chapel')) { const c = S.rooms.find(r => r.type === 'chapel'); S.order = Math.min(100, (S.order ?? 55) + .6 + c.tier * .3); home(S).filter(p => p.fears || p.stress >= 6).forEach(p => { if (Math.random() < .35) p.stress = Math.max(0, p.stress - 1); }); }
    if (E.staffed(S, 'armory')) S.gear.forEach(g => { if (g.cond === 'Shoddy' && Math.random() < .08) { g.cond = 'Standard'; log(S, `The ${g.n} was fixed up in the Armory.`, 'good'); } });
    S.rooms.filter(r => r.type === 'cellar' && !r.broken).forEach(r => { if (Math.random() < .07) { const ws = E.workers(S, r).filter(p => !p.damned); if (ws.length) { log(S, 'Spores drifted out of the Mushroom Cellar.', 'bad'); ws.forEach(p => expose(S, p, 1, 5, 'cellar spores', null)); } } });
    if (E.lawOn(S, 'open') && Math.random() < .2 && E.roomFor(S) && humans(S).length < E.bedsOf(S) + 2 && (!E.evOk || E.evOk(S, 'gatecomer'))) S.queue.push({ k: 'gatecomer', p: globalThis.SHELTER_EVENTS.gatecomer.make(S, E) });
    randomEvent(S);
    if (!humans(S).length) { S.over = true; finish(S); }
    return true;
  };
  function weatherRoll(S) { const r = d10(); return r <= 5 ? 0 : r <= 8 ? 1 : 2; }
  function finish(S) { S.queue = S.queue.filter(q => q.k !== 'perk'); }
  function randomEvent(S) {
    if (S.day < 3) return;
    const ev = globalThis.SHELTER_EVENTS, keys = Object.keys(ev).filter(k => ev[k].chance && (!ev[k].when || ev[k].when(S, E)) && (E.roomFor(S) || !['gatecomer', 'signal', 'mercenary', 'refugees'].includes(k)) && (!E.evOk || E.evOk(S, k)));
    if (Math.random() > .42) return;
    const w = keys.flatMap(k => Array(ev[k].chance).fill(k)), k = pick(w); if (k && ev[k].uncanny) { S.unc = S.unc || { last: -99, seen: {} }; S.unc.last = S.day; S.unc.seen[k] = 1; } if (k) { if (E.evMark) E.evMark(S, k); S.queue.push({ k, p: ev[k].make ? ev[k].make(S, E) : {} }); }
  }
  // ---------- decisions
  E.current = S => { if (!S.queue.length) return null; const q = S.queue[0], ev = globalThis.SHELTER_EVENTS[q.k]; return { key: q.k, ...ev.view(S, q.p, E) }; };
  E.decide = (S, i) => { const q = S.queue.shift(), ev = globalThis.SHELTER_EVENTS[q.k]; if (ev.pick) ev.pick(S, q.p, i, E); if (!humans(S).length) S.over = true; };
  E.addSurvivor = (S, o = {}) => { o.dmd = o.dmd ?? 4 + Math.floor(Math.random() * 18); o.level = o.level || clamp(Math.ceil(S.day / 25), 1, 6); const p = newPerson(S, o); const vn = E.nameHook && E.nameHook(); if (vn) { p.name = vn; p.viewer = true; } S.people.push(p); if (E.hasDamned(S)) meetDamned(p); S.stat.rescued++; S.score += 25; return p; };

  // ---------- new game
  E.newGame = (diff = 'normal') => {
    const S = { v: 1, diff, day: 1, score: 0, nextId: 1, res: { food: 28, water: 28, fuel: 22, meds: 6, scrap: 40, rounds: 50 }, rooms: [], people: [], gear: [], items: { antibiotics: 1, bandages: 3, painkillers: 1, grenade: 1, flare: 2 }, sites: [], runs: [], queue: [], log: [], memorial: [], slots: [], weather: 0, radio: 0, noise: 0, stat: { rescued: 0, runs: 0, fights: 0, foes: 0, turned: 0, waits: 0, survivedWait: 0, damned: 0, quest: 0, raids: 0, quests: 0, strikes: 0 }, over: false };
    for (let r = 0; r < 3; r++) for (let c = 0; c < E.COLS; c++) S.slots.push({ row: r, col: c });
    const mk0 = (type, row, col) => { const x = { id: S.nextId++, type, tier: 0, row, col, broken: false, mold: 0, pushed: false }; S.rooms.push(x); return x; };
    const gate = mk0('gate', 0, 0), grow = mk0('grow', 1, 0), filter = mk0('filter', 1, 1), gen = mk0('generator', 1, 2); mk0('bunks', 2, 0);
    const shuf = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const men = shuf(Object.keys(G.people).filter(n => G.people[n] === 'he')), women = shuf(Object.keys(G.people).filter(n => G.people[n] === 'she'));
    const sprites = shuf([...men.slice(0, 3), ...women.slice(0, 3)]), classes = shuf(['bruiser', 'survivor', 'scavenger', 'survivor', 'medic', 'sharpshooter']), meters = shuf([9, 29, 14, 25, 6, 11]);
    const jobs = { bruiser: gate, sharpshooter: gate, medic: grow, scavenger: filter }; let spare = [grow, gen, filter, gen];
    sprites.forEach((sprite, i) => { const cl = classes[i], p = newPerson(S, { sprite, cls: cl, level: 2, dmd: meters[i] }); S.people.push(p); const r = jobs[cl] || spare.shift() || grow; p.room = r.id; p.lastRoom = r.id; });
    const give = (n, cl) => { const p = S.people.find(x => x.cls === cl && !x.weapon); if (!p) return; const g = gearFromWeapon(S, E.findWeapon(n)); S.gear.push(g); p.weapon = g.id; };
    give('Baseball Bat', 'bruiser'); give('Crowbar', 'scavenger'); give('Remington 700', 'sharpshooter');
    S.qday = {}; ['fema', 'convoy', 'church', 'mall', 'pit', 'lab', 'marina', 'relay'].forEach(k => { S.qday[k] = Math.floor(Math.random() * 7) - 2; });
    const nearby = ['Suburban house', 'Gas station', 'Grocery store', 'Pharmacy', 'Hardware store', 'Apartment block'];
    nearby.forEach(n => { const s = genSite(S, n, true); s.known = true; S.sites.push(s); });
    S.log = [{ t: 'The hatch is sealed. Six people, and whatever you can find.', k: '' }];
    S.weather = 0;
    const st = E.dif(S).start; for (const k of ['food', 'water', 'fuel', 'meds', 'scrap', 'rounds']) S.res[k] = Math.round(S.res[k] * st);
    E.relayout(S);
    return S;
  };
  E.SIZE_BAND = SIZE_BAND; E.SIZE_MULT = SIZE_MULT; E.condLev = condLev;
  globalThis.ShelterEngine = E;
})();
