// Playable quests: you run the team through stages and fight turn by turn. Combat numbers are TOFU's; the quests are written for this game.
(function () {
  const E = globalThis.ShelterEngine, D = globalThis.SHELTER_DATA;
  const Q = {};
  const F = (text, foes, extra = {}) => ({ t: 'fight', text, foes, ...extra });
  const QUESTS = [
    { k: 'fema', name: 'Tents at the Fairground', art: 'fema', day: 2, lv: 2, place: 'Military checkpoint / FEMA camp', blurb: 'A family is trapped in an abandoned relief camp. There are medical stores there too.', stages: [
      { t: 'text', text: 'Rows of white tents, sagging under black water. A child is banging on a pipe somewhere in the middle of it.' },
      { t: 'choice', text: 'The main gate is chained. Something shuffles behind the fence.', opts: [
        { l: 'Cut through the side fence', sk: 'engineering', dr: 6, ok: 'The fence opens without a sound.', okFx: { skip: 1 }, no: 'The cutters slip and the whole fence rings like a bell.', noFx: { stress: 1 } },
        { l: 'Sneak past along the ditch', sk: 'stealth', dr: 6, ok: 'Nothing looks up.', okFx: { skip: 1 }, no: 'Black water to the waist, and now everyone knows.', noFx: { dmd: 1 } },
        { l: 'Go in loud', ok: 'Fine. Loud it is.' }] },
      F('They come out between the tents.', { g: ['infected'], b: 4 }),
      { t: 'loot', text: 'The medical tent still has its crates.', place: 'Military checkpoint / FEMA camp', n: 4, fx: { meds: 4 } },
      F('The banging stops. Something big was listening for it too.', ['Bloat']),
      { t: 'reward', text: 'A mother and her son climb out of a water tank. She can stitch a wound with her eyes shut.', fx: { people: 1, food: 6 } }] },
    { k: 'convoy', name: 'The Last Convoy', art: 'convoy', day: 3, lv: 2, place: 'Crashed convoy or vehicle', blurb: 'A supply convoy went off the highway. Somebody else is already picking it clean.', stages: [
      { t: 'text', text: 'Six trucks in a ditch, doors open, cargo all over the road.' },
      F('Road raiders turn from the wreck with their hands full.', { g: ['human'], b: 3 }),
      { t: 'choice', text: 'One tanker is still upright, and it is leaking.', opts: [
        { l: 'Siphon it carefully', sk: 'engineering', dr: 6, ok: 'Every drop you can carry.', okFx: { fuel: 18 }, no: 'It catches. You get what you can.', noFx: { fuel: 6, hurt: 2 } },
        { l: 'Search the cabs', sk: 'survival', dr: 5, ok: 'A driver who planned ahead.', okFx: { food: 12, rounds: 30 }, no: 'Mostly old sandwiches.', noFx: { food: 3 } }] },
      { t: 'loot', text: 'You strip what you can from the rest.', place: 'Crashed convoy or vehicle', n: 5 },
      { t: 'reward', text: 'You drive the good truck as far as it will go.', fx: { scrap: 20 } }] },
    { k: 'church', name: 'Thirty-Two Roads', art: 'church', day: 8, lv: 3, place: 'Church or shelter', blurb: 'The cult at the old church is hoarding antibiotics, and they have been "walking people home".', stages: [
      { t: 'text', text: 'Thirty-two candles in the windows. Somebody inside is singing the numbers.' },
      { t: 'choice', text: 'A woman in a black slicker blocks the door and smiles at you.', opts: [
        { l: 'Talk your way in', sk: 'negotiation', dr: 7, ok: 'She steps aside. She looks at your hands the whole time.', okFx: { skip: 1 }, no: 'She whistles.', noFx: { stress: 1 } },
        { l: 'Lie: you bring a thirty-two', sk: 'deception', dr: 6, ok: 'Her eyes shine. She leads you in herself.', okFx: { skip: 1 }, no: 'She checks your arm first.', noFx: {} },
        { l: 'Put her down', ok: 'The singing stops.' }] },
      F('The congregation stands up.', ['Thirty-Two Roads Cultist', 'Thirty-Two Roads Cultist', 'Black Rain Acolyte']),
      { t: 'choice', text: 'In the crypt there are people chained to the wall, and every one of them is at the end of their meter.', opts: [
        { l: 'Free them', ok: 'Most of them can not walk. One can.', okFx: { people: 1, stress: 1 } },
        { l: 'Leave them', ok: 'Nobody talks on the way out.', okFx: { stress: 2, rounds: 20 } }] },
      { t: 'loot', text: 'The antibiotics are behind the altar.', place: 'Church or shelter', n: 3, fx: { meds: 6 } },
      { t: 'reward', text: 'Thirty-two candles, and you blew them out.', fx: {} }] },
    { k: 'mall', name: 'The Mall', art: 'mall', day: 14, lv: 4, place: 'Shopping mall', blurb: 'A whole mall nobody has cleared. Something very large is why.', stages: [
      { t: 'text', text: 'Skylight down, escalators frozen, every storefront a mouth.' },
      F('The food court is full.', { g: ['infected'], b: 6 }),
      { t: 'loot', text: 'The sporting goods store is half full.', place: 'Sporting goods / outdoor store', n: 6 },
      { t: 'choice', text: 'The floor shakes. There is a service corridor, or there is the atrium.', opts: [
        { l: 'Slip out the service corridor', sk: 'stealth', dr: 7, ok: 'You get out with the bags.', okFx: { skip: 1 }, no: 'It heard the bags.', noFx: {} },
        { l: 'Hold the atrium and kill it', ok: 'You set up behind the fountain.', okFx: { rounds: 20 } }] },
      F('It comes through the wall of a shoe store.', ['Goliath'], { boss: 1 }),
      { t: 'reward', text: 'The mall is yours to pick over for weeks.', fx: { scrap: 40, food: 15 } }] },
    { k: 'pit', name: 'The Fight Pit', art: 'pit', day: 18, lv: 4, place: 'Warehouse / distribution center', blurb: 'Slavers are running a pit in a warehouse. They took someone you know of.', stages: [
      { t: 'text', text: 'Floodlights, a ring of shipping containers, a crowd paying in bullets.' },
      { t: 'choice', text: 'The guard at the side door is drunk and bored.', opts: [
        { l: 'Bribe him (15 rounds)', cost: { rounds: 15 }, ok: 'He counts it twice and walks off.', okFx: { skip: 1 } },
        { l: 'Scare him off', sk: 'intimidation', dr: 7, ok: 'He leaves without his shoes.', okFx: { skip: 1 }, no: 'He yells instead.', noFx: {} },
        { l: 'Knock him out', sk: 'grappling', dr: 6, ok: 'Quiet.', okFx: { skip: 1 }, no: 'Not quiet.', noFx: { hurt: 1 } }] },
      F('Catchers with cattle prods and shotguns.', ['Slaver Catcher', 'Slaver Catcher']),
      F('The Overseer drops the gate and walks out into the ring himself.', ['Slaver Overseer', 'Fight Pit Champion'], { boss: 1 }),
      { t: 'reward', text: 'You open every cage. Most of them run. One stays.', fx: { people: 1, rounds: 60, food: 10 } }] },
    { k: 'lab', name: 'Patient Zero', art: 'lab', day: 25, lv: 5, radio: 1, place: 'Research lab / Q.U.E.S.T. site', blurb: 'The radio says there is a lab where it started. Whatever is left in there, someone still feeds it.', stages: [
      { t: 'text', text: 'Emergency lights. Air that tastes like a coin. Every door has been opened from the inside.' },
      { t: 'choice', text: 'A terminal still has power, and it knows you are here.', opts: [
        { l: 'Hack the doors', sk: 'technology', dr: 7, ok: 'The route opens up.', okFx: { skip: 1 }, no: 'Every alarm in the building.', noFx: { stress: 1 } },
        { l: 'Force the stairwell', sk: 'athletics', dr: 6, ok: 'Your shoulder will remember this.', okFx: { skip: 1 }, no: 'It holds. Something behind it does not.', noFx: { hurt: 1 } }] },
      F('Ward patients, still in their gowns.', { g: ['infected'], b: 7 }),
      { t: 'loot', text: 'Sample freezers, ruined. The med stores are not.', place: 'Hospital', n: 5, fx: { meds: 5 } },
      F('At the bottom, in a chair, facing the door.', ['Controller', 'Spitter'], { boss: 1 }),
      { t: 'reward', text: 'You were told it would be Patient Zero. It was only somebody who got here first.', fx: { scrap: 30, rounds: 40 } }] },
    { k: 'marina', name: 'Black Water', art: 'marina', day: 12, lv: 3, place: 'Marina / boat dock', blurb: 'Boats at the marina still have fuel in them, and the water around them is moving.', stages: [
      { t: 'text', text: 'Hulls knocking together in the dark. The river is not reflecting anything.' },
      F('Something comes up over the dock.', { g: ['infected', 'animal'], b: 4 }),
      { t: 'choice', text: 'The biggest yacht is at the end of a broken pier.', opts: [
        { l: 'Swim for it', sk: 'athletics', dr: 7, ok: 'You come up gasping, and the tanks are full.', okFx: { fuel: 25, dmd: 1 }, no: 'You come back with a mouthful of the river.', noFx: { dmd: 3 } },
        { l: 'Rig a line across', sk: 'engineering', dr: 7, ok: 'Slow and dry.', okFx: { fuel: 25 }, no: 'The line snaps with a hose in your hands.', noFx: { fuel: 8 } },
        { l: 'Strip the near boats', ok: 'Less, but nobody gets wet.', okFx: { fuel: 10 } }] },
      { t: 'loot', text: 'The dock store still has a back room.', place: 'Marina / boat dock', n: 4 },
      { t: 'reward', text: 'You leave before the tide does whatever it does here.', fx: { food: 8 } }] },
    { k: 'relay', name: 'The Relay Tower', art: 'relay', day: 30, lv: 6, radio: 1, place: 'Electronics store', blurb: 'One of Q.U.E.S.T.\'s towers is standing on the ridge. She knows you are coming, and she does not seem to mind.', stages: [
      { t: 'text', text: 'The tower hums at a note you can feel in your teeth. A speaker somewhere says your name, politely.' },
      F('Her machines step out of the tree line.', ['Q.U.E.S.T. Hunter Drone', 'Security Bot', 'Dog Bot']),
      { t: 'choice', text: '"You could take the batteries. You could also just ask."', opts: [
        { l: 'Rip out the batteries', sk: 'engineering', dr: 7, ok: 'She does not stop you.', okFx: { scrap: 40, fuel: 10 }, no: 'It bites back.', noFx: { hurt: 3, scrap: 15 } },
        { l: 'Ask her what she wants', ok: '"Patience. Thank you for yours."', okFx: { radio: 200, stress: 1 } }] },
      F('She sends one more, to see what you do.', ['Q.U.E.S.T. Avatar'], { boss: 1 }),
      { t: 'reward', text: 'The hum stops behind you. A minute later it starts again.', fx: { rounds: 60 } }] },
  ];
  Q.QUESTS = QUESTS;
  Q.def = q => q.dyn || QUESTS.find(x => x.k === q.key);
  Q.startRaid = S => {
    const r = S.raidNow; if (!r) return; S.raidNow = null;
    S.quest = { key: 'raid', dyn: { k: 'raid', name: 'Attack on the Gate', bg: 'rooms/gate', stages: [{ t: 'fight', text: r.kind, made: r.foes }] }, defend: true, team: r.ids, stage: -1, view: 'text', text: '', log: [], rep: { got: {}, gear: [], dead: [] }, skip: 0, fight: null };
    Q.next(S);
  };
  Q.available = S => QUESTS.filter(q => S.day >= q.day + ((S.qday || {})[q.k] || 0) && (!q.radio || S.rooms.some(r => r.type === 'radio')) && !(S.qdone && S.qdone[q.k] !== undefined && S.day - S.qdone[q.k] < 40));
  const level = (S, d) => Math.max(1, Math.min(10, d.lv + 2 * ((S.qcount || {})[d.k] || 0) + Math.floor(S.day / 40) + E.dif(S).foe));
  Q.level = level;
  const pOf = (S, id) => S.people.find(p => p.id === id);
  const team = S => S.quest.team.map(id => pOf(S, id));
  const up = S => team(S).filter(p => p.alive && p.hp > 0);
  Q.team = team;
  const say = (S, t, k = '', roll) => {
    const q = S.quest, l = { t, k, roll };
    if (q.fight) l.snap = { h: Object.fromEntries(q.team.map(id => { const p = pOf(S, id); return [id, p.alive ? p.hp : -999]; })), f: q.fight.foes.map(x => x.hp) };
    q.log.push(l);
  };
  const best = (S, sk) => up(S).slice().sort((a, b) => E.pool(b, sk) - E.pool(a, sk))[0];

  Q.start = (S, key, ids) => {
    const d = QUESTS.find(x => x.k === key); if (!d || S.quest || !ids.length) return false;
    S.quest = { key, team: ids, stage: -1, view: 'text', text: '', log: [], rep: { got: {}, gear: [], dead: [] }, skip: 0, fight: null };
    ids.forEach(i => { const p = pOf(S, i); p.away = true; p.room = null; });
    if (Q.trip) Q.trip(S, 'out'); else Q.next(S);
    return true;
  };
  Q.next = S => { // move to the next stage
    const q = S.quest, d = Q.def(q);
    if (!up(S).length) { q.view = 'end'; q.rep.failed = true; return; }
    q.stage++;
    let st = d.stages[q.stage];
    while (st && st.t === 'fight' && q.skip > 0) { q.skip--; q.stage++; say(S, 'You slipped past that group without a fight.', 'good'); st = d.stages[q.stage]; }
    if (!st) { if (!q.defend && !q.rep.failed) { const k = ['antibiotics', 'antibiotics', 'bandages', 'first_aid', 'painkillers', 'morphine', 'epinephrine', 'grenade', 'flare', 'filter', 'backpack'][Math.floor(Math.random() * 11)], n = k === 'first_aid' ? 5 : 1; E.addItem(S, k, n); q.rep.gear.push(SHELTER_DATA.ITEMS[k].n); } q.view = 'end'; return; }
    q.text = st.text || '';
    if (st.t === 'text') q.view = 'text';
    if (st.t === 'choice') q.view = 'choice';
    if (st.t === 'loot') { lootStage(S, st); q.view = 'text'; }
    if (st.t === 'reward') { fx(S, st.fx || {}); S.score += 200; q.view = 'text'; q.reward = true; }
    if (st.t === 'fight') startFight(S, st);
  };
  const repeat = S => ((S.qcount || {})[S.quest.key] || 0) > 0 && !S.quest.defend; // a place you already cleared has less left in it
  function give(S, k, v) { if (repeat(S)) v = Math.round(v * .5); S.res[k] = Math.round((S.res[k] + v) * 10) / 10; S.quest.rep.got[k] = (S.quest.rep.got[k] || 0) + v; }
  function fx(S, f) {
    for (const k of ['food', 'water', 'fuel', 'meds', 'scrap', 'rounds']) if (f[k]) give(S, k, f[k]);
    if (f.skip) S.quest.skip += f.skip;
    if (f.radio) S.radio += f.radio;
    if (f.stress) up(S).forEach(p => E.addStress(S, p, f.stress));
    if (f.hurt) { const p = E.pick(up(S)); if (p) { p.hp -= f.hurt; say(S, `${p.name} is hurt. -${f.hurt} Health.`, 'bad'); if (p.hp <= 0) p.hp = 1; } }
    if (f.dmd) up(S).forEach(p => { const t = E.expose(S, p, f.dmd, 6, 'black water', null); if (t) say(S, `${p.name} takes ${t} DMD.`, 'dmd'); });
    if (f.people && (!repeat(S) || Math.random() < .5)) { for (let i = 0; i < f.people && E.roomFor(S); i++) { const x = E.addSurvivor(S, { level: Math.max(1, level(S, Q.def(S.quest)) - 1) }); say(S, `${x.name} ${x.last} comes home with you.`, 'good'); S.quest.rep.joined = (S.quest.rep.joined || []).concat(x.name); } }
  }
  function lootStage(S, st) {
    const q = S.quest, lines = [];
    for (let i = 0; i < st.n; i++) {
      const f = E.findOne(st.place), c = E.classify(f.text, f.wt), t = f.text.replace(/<\/?b>/g, '');
      if (c.none || c.danger) continue;
      for (const k of ['food', 'water', 'fuel', 'meds', 'scrap', 'rounds']) if (c[k]) give(S, k, c[k]);
      if (c.weapon) { const b = E.findWeapon(c.weapon), cd = E.condition(); if (b && cd !== 'Broken') { const g = { id: S.nextId++, n: b.n, kind: b.kind, gun: !!b.gun, tr: b.tr || [], cond: cd, wt: b.wt || 3 }; S.gear.push(g); q.rep.gear.push(`${g.n} (${cd})`); } }
      if (c.armor) { const g = { id: S.nextId++, n: c.armor[1], kind: 'armor', ar: c.armor[2], acl: c.armor[3], cond: 'Standard', tr: [], wt: 12 }; S.gear.push(g); q.rep.gear.push(g.n); }
      lines.push(t);
    }
    if (st.fx) fx(S, st.fx);
    { const L = [...new Set(lines.map(t => E.prose(t)).filter(t => t && !(E.junkFind && E.junkFind(t))).map(t => (E.tidyFind ? E.tidyFind(t) : t)))].slice(0, 5).map((t, i) => (i || true) && !/^[A-Z]{2}/.test(t) ? t[0].toLowerCase() + t.slice(1).replace(/\.$/, '') : t.replace(/\.$/, '')); q.text = `${st.text} ${L.length ? `They came away with ${L.length > 1 ? L.slice(0, -1).join(', ') + ' and ' + L[L.length - 1] : L[0]}.` : 'They came away with nothing worth carrying.'}`; }
  }
  Q.choose = (S, i) => {
    const q = S.quest, st = Q.def(q).stages[q.stage], o = st.opts[i]; if (q.view !== 'choice') return;
    if (o.cost) { for (const k in o.cost) if (S.res[k] < o.cost[k]) return false; for (const k in o.cost) S.res[k] -= o.cost[k]; }
    let ok = true;
    if (o.sk) {
      const p = best(S, o.sk), r = E.rollSkill(p, o.sk, o.dr); ok = r.succ >= 1 || r.crit;
      if (r.succ === 0) E.addStress(S, p, 1);
      say(S, `${p.name} rolls ${E.skillName(o.sk)} against DR ${o.dr}: ${r.succ} success${r.succ === 1 ? '' : 'es'}.`, ok ? 'good' : 'bad', { dice: r.dice, dr: o.dr, crit: r.crit });
      p.xp += 2;
    }
    q.text = ok ? o.ok : o.no;
    fx(S, (ok ? o.okFx : o.noFx) || {});
    q.view = 'text';
    return true;
  };
  function startFight(S, st) {
    const q = S.quest, d = Q.def(q), lv = level(S, d), size = up(S).length;
    let foes = [];
    if (st.made) foes = st.made;
    else if (Array.isArray(st.foes)) foes = st.foes.map(n => E.named(n, lv)).filter(Boolean);
    else foes = E.pickFoes(st.foes.g, lv, Math.max(2, Math.round(st.foes.b * size / 3)), 6);
    if (q.defend && E.defendRoom) { const g = S.rooms.find(r => r.type === 'gate'); foes = E.defendRoom(S, g, foes); if (!foes.length) { say(S, 'The Gate defenses killed every one of them before they reached the door.', 'good'); q.view = 'end'; return; } }
    if (!foes.length) foes = E.pickFoes(['infected'], lv, 3, 4);
    q.fight = { foes, round: 1, acts: {}, feint: {} };
    up(S).forEach(p => { q.fight.acts[p.id] = 3; }); // CANON: 3 actions a turn
    q.view = 'fight';
    say(S, st.text, 'head');
  }
  const BAND = E.SIZE_BAND, MULT = E.SIZE_MULT;
  const dmgVerb = (sk, g) => (sk === 'ranged' ? 'shoots' : g ? 'hits' : 'punches');
  // one hero attack. riposte attacks cost no action
  Q.attack = (S, id, i, riposte) => {
    const q = S.quest, f = q.fight, p = pOf(S, id), foe = f.foes[i]; if (!f || !foe || foe.hp <= 0 || !p.alive || p.hp <= 0) return false;
    if (!riposte) { if (f.acts[id] <= 0) return false; f.acts[id]--; }
    const g = E.gear(S, p.weapon); let sk = g && g.kind === 'ranged' ? 'ranged' : 'melee', lev = E.condLev(g);
    if (sk === 'ranged' && g.gun) { if (S.res.rounds >= 1) S.res.rounds -= 1; else { sk = 'melee'; lev = -1; } }
    if (q.defend && E.staffed(S, 'armory')) lev += 1;
    if (q.defend && S.rivalAid && S.day <= S.rivalAid) lev += 1;
    if (q.defend && E.gateDogs) lev += E.gateDogs(S);
    const dogLev = E.dogBite ? E.dogBite(S, p) : 0; if (dogLev && sk === 'melee') lev += dogLev;
    if (q.defend && E.hasDef && E.hasDef(S.rooms.find(r => r.type === 'gate'), 'alarm')) lev += 1;
    if (sk === 'melee') { if (!g && !p.damned) lev -= 1; if (p.damned) lev += 1; if (E.has(p, 'Vicious Attack') || E.has(p, 'Grasping Tendril')) lev += 1; if (E.has(p, 'Ironfist')) lev += 2; } else if (E.has(p, 'Thermal Hunter')) lev += 1;
    const er = 6 + (BAND.Medium - BAND[foe.s]), r = E.rollSkill(p, sk, er, lev), pool = Math.max(1, Math.min(10, E.pool(p, sk, lev)));
    if (r.succ === 0 && !r.crit) E.addStress(S, p, 1);
    const roll = { dice: r.dice, dr: er, crit: r.crit };
    let dmg = r.succ, defended = false;
    if (r.crit) dmg = pool * 2;
    if (dmg <= 0) { say(S, `${p.name} misses ${foe.n}.`, '', roll); return true; }
    const noDef = r.crit || f.feint[id] === i;
    if (!noDef && foe.guard && foe.guarded !== f.round) {
      foe.guarded = f.round;
      const def = E.roll(foe.dodge, Math.max(1, Math.min(10, pool)));
      if (def.succ >= 2) { say(S, `${foe.n} avoids ${p.name}'s attack.`, '', roll); return true; }
      if (def.succ === 1) { dmg = Math.ceil(dmg / 2); defended = true; }
    }
    delete f.feint[id];
    const tr = g ? g.tr : [], ar0 = foe.ar - (tr.includes('Armor Piercing') ? 2 : 0);
    let ar = Math.max(0, ar0);
    if (p.cls === 'sharpshooter' && sk === 'ranged' && !f['called' + id]) { f['called' + id] = true; ar = 0; }
    let dealt = Math.max(defended ? 0 : 1, dmg - ar) + (tr.includes('Incendiary') ? 1 : 0);
    foe.hp -= dealt; foe.hit = Date.now();
    say(S, `${r.crit ? 'COSMIC CRIT! ' : ''}${p.name} ${dmgVerb(sk, g)} ${foe.n} for ${dealt}.${foe.hp <= 0 ? ` ${foe.n} falls.` : ''}`, r.crit ? 'crit' : foe.hp <= 0 ? 'good' : '', roll);
    if (foe.hp <= 0) {
      { const dg = E.dogOf && E.dogOf(S, p); if (dg && sk === 'melee') dg.kills = (dg.kills || 0) + 1; }
      if (p.damned) p.hp = Math.min(E.maxHp(p), p.hp + p.level);
      if (/burster/i.test(foe.n)) { up(S).filter(x => !E.has(x, 'Blast Shielding')).forEach(x => { const t = E.expose(S, x, 1, 5, 'burst spray', 'Burster'); if (t) say(S, `The burst sprays ${x.name}. DMD +${t}.`, 'dmd'); }); }
      if (/bloat/i.test(foe.n)) up(S).forEach(x => { const t = E.expose(S, x, 1, 6, 'slime', 'Bloat'); if (t) say(S, `Slime soaks ${x.name}. DMD +${t}.`, 'dmd'); });
    } else if ((tr.includes('Spread') || tr.includes('Burst Fire') || tr.includes('Full Auto') || (E.has(p, 'Whirlwind Attack') && sk === 'melee'))) {
      const other = f.foes.filter(x => x.hp > 0 && x !== foe)[0]; if (other && dmg > 1) { const d2 = Math.max(0, Math.ceil(dmg / 2) - other.ar); if (d2) { other.hp -= d2; say(S, `The same attack catches ${other.n} for ${d2}.${other.hp <= 0 ? ` ${other.n} falls.` : ''}`, other.hp <= 0 ? 'good' : ''); } }
    }
    checkWin(S);
    return true;
  };
  Q.feint = (S, id, i) => { // CANON: Feint is a Versus roll against the enemy's attack pool; win and your next attack can't be defended
    const q = S.quest, f = q.fight, p = pOf(S, id), foe = f.foes[i]; if (!foe || foe.hp <= 0 || f.acts[id] <= 0) return false;
    f.acts[id]--;
    const r = E.rollSkill(p, 'feint', 6), o = E.roll(foe.pool, 6), won = r.succ > o.succ;
    if (won) f.feint[id] = i;
    say(S, won ? `${p.name} feints ${foe.n}. The next attack can't be blocked.` : `${p.name}'s feint fools nobody.`, won ? 'good' : '', { dice: r.dice, dr: 6, crit: r.crit });
    return true;
  };
  Q.patch = (S, id, tid) => { // Med supply in the field
    const q = S.quest, f = q.fight, p = pOf(S, id), t = pOf(S, tid); if (f.acts[id] <= 0 || S.res.meds < 1 || !t.alive) return false;
    f.acts[id]--; S.res.meds -= 1;
    const r = E.rollSkill(p, 'medicine', 5), n = r.succ * (p.cls === 'medic' ? 3 : 2) * (E.has(p, 'First Aid Expert') ? 2 : 1);
    if (n) { t.hp = Math.min(E.maxHp(t), Math.max(t.hp, 0) + n); delete t.dyingRound; }
    say(S, n ? `${p.name} treats ${t.name}: +${n} Health.` : `${p.name} fumbles the bandage.`, n ? 'good' : 'bad', { dice: r.dice, dr: 5, crit: r.crit });
    return true;
  };
  Q.useItem = (S, id, i) => { // one action, from what this person carried on the quest
    const q = S.quest, f = q.fight, p = pOf(S, id), x = f && E.packOf(p)[i], D = SHELTER_DATA; if (!x || f.acts[id] <= 0 || p.hp <= 0) return false;
    const d = D.ITEMS[x.k], mates = team(S).filter(a => a.alive); if (d.passive) return false;
    if (d.use === 'heal') {
      const t = mates.filter(a => a.hp < E.maxHp(a)).sort((a, b) => a.hp - b.hp)[0]; if (!t) return false;
      const r = E.rollSkill(p, 'medicine', 5, d.lev || 0), n = r.succ * (p.cls === 'medic' ? 3 : 2) * (E.has(p, 'First Aid Expert') ? 2 : 1);
      f.acts[id]--; E.spend(p, i);
      if (n) { t.hp = Math.min(E.maxHp(t), Math.max(t.hp, 0) + n); delete t.dyingRound; }
      say(S, n ? `${p.name} treats ${t.name}: +${n} Health.` : `${p.name} fumbles the dressing.`, n ? 'good' : 'bad', { dice: r.dice, dr: 5, crit: r.crit });
    } else if (d.use === 'exh') {
      const t = mates.filter(a => a.exh > 0).sort((a, b) => b.exh - a.exh)[0]; if (!t) return false;
      f.acts[id]--; E.spend(p, i); t.exh -= 1; say(S, `${t.name} takes the painkillers and keeps moving.`, 'good');
    } else if (d.use === 'calm') {
      const t = mates.filter(a => a.stress > 0).sort((a, b) => b.stress - a.stress)[0]; if (!t) return false;
      f.acts[id]--; E.spend(p, i); t.stress = Math.max(0, t.stress - 3); say(S, `${p.name} gives ${t.name} morphine. The shaking stops.`, 'good');
    } else if (d.use === 'revive') {
      const t = mates.filter(a => a.hp <= 0)[0]; if (!t) return false;
      f.acts[id]--; E.spend(p, i); t.hp = 1; delete t.dyingRound; say(S, `${p.name} drives the needle into ${t.name}. ${t.name} is back up.`, 'good');
    } else if (d.use === 'flare') {
      if (f.flare === f.round) return false;
      f.acts[id]--; E.spend(p, i); f.flare = f.round; say(S, `${p.name} lights a flare. They can't see through it.`, 'good');
    } else if (d.use === 'blast') {
      f.acts[id]--; E.spend(p, i); S.noise = (S.noise || 0) + .05;
      const r = E.rollSkill(p, 'ranged', 6), live = f.foes.filter(a => a.hp > 0);
      say(S, r.succ ? `${p.name} throws a grenade.` : `${p.name}'s grenade lands wide.`, r.succ ? 'crit' : 'bad', { dice: r.dice, dr: 6, crit: r.crit });
      if (r.succ) live.forEach(a => { const n = Math.max(1, r.succ - a.ar); a.hp -= n; say(S, `The blast hits ${a.n} for ${n}.${a.hp <= 0 ? ` ${a.n} falls.` : ''}`, a.hp <= 0 ? 'good' : ''); });
      checkWin(S);
    }
    return true;
  };
  function foeAttack(S, foe, t) {
    const q = S.quest, f = q.fight, er = 6 + (BAND[foe.s] - BAND.Medium), r = E.roll(Math.max(1, foe.pool - (f.flare === f.round ? 2 : 0)), Math.max(1, Math.min(10, er)));
    let dmg = r.succ;
    const roll = { dice: r.dice, dr: er, crit: r.crit };
    if (r.crit) { dmg = foe.pool * 2; E.addStress(S, t, 1); }
    if (dmg <= 0) { say(S, `${foe.n} misses ${t.name}.`, '', roll); return; }
    if (E.dogGuard) { dmg = E.dogGuard(S, t, dmg, (txt, k) => say(S, txt, k)); if (dmg <= 0) return; }
    let defended = false;
    if (!r.crit && f.acts[t.id] > 0) {
      f.acts[t.id]--;
      const a = E.gear(S, t.armor), acl = a && a.acl, mod = acl === 'Medium' ? -1 : 0, dm = (!acl ? 1 : 0) + mod + (E.has(t, 'Adrenal Surge') || E.has(t, 'Kinetic Jumper') || E.has(t, 'Inhuman Agility') || E.has(t, 'Shrug it Off') ? 1 : 0), bm = mod + (E.has(t, 'Unyielding') ? 1 : 0);
      const block = acl === 'Heavy' || E.pool(t, 'block', bm) > E.pool(t, 'dodge', dm), sk = block ? 'block' : 'dodge', def = E.rollSkill(t, sk, Math.max(1, Math.min(10, foe.pool)), block ? bm : dm);
      if (def.succ === 0) E.addStress(S, t, 1);
      if (def.succ >= 2) {
        say(S, `${t.name} ${block ? 'blocks' : 'dodges'} ${foe.n} and strikes back!`, 'good', { dice: def.dice, dr: foe.pool });
        const i = f.foes.indexOf(foe); if (foe.hp > 0) Q.attack(S, t.id, i, true); // CANON: Riposte
        return;
      }
      if (def.succ === 1) { dmg = Math.ceil(dmg / 2); defended = true; }
    }
    const a = E.gear(S, t.armor), ar = (a ? a.ar : 0) + (E.has(t, 'Acid Endurance') ? 1 : 0);
    let dealt = Math.ceil(Math.max(defended ? 0 : 1, dmg - ar) * (MULT[foe.s] || 1));
    if (dealt <= 0) { say(S, `${t.name}'s armor takes the hit from ${foe.n}.`, '', roll); return; }
    t.hp -= dealt; t.hit = Date.now();
    say(S, `${r.crit ? 'COSMIC CRIT! ' : ''}${foe.n} hits ${t.name} for ${dealt}.`, r.crit ? 'crit' : 'bad', roll);
    if (foe.dmd) { const wh = foe.dmd >= 3 ? 'A bite' : foe.dmd === 2 ? 'A scratch' : 'Spores', got = E.expose(S, t, foe.dmd, foe.pool, wh.toLowerCase(), D.MUTATIONS[foe.n] ? foe.n : null); if (got) say(S, `${wh}. ${t.name} takes ${got} DMD (now ${t.dmd}).`, 'dmd'); }
    if (t.hp <= 0) {
      if (t.hp <= -E.maxHp(t)) { E.kill(S, t, `Killed by ${foe.n}.`); q.rep.dead.push(t.name); say(S, `${t.name} is dead.`, 'bad'); return; }
      t.dyingRound = t.hp < 0 ? f.round + 1 : null; say(S, `${t.name} goes down.`, 'bad');
      up(S).filter(x => x !== t && !x.damned).forEach(x => E.addStress(S, x, 1));
    }
  }
  Q.endTurn = S => {
    const q = S.quest, f = q.fight; if (!f || q.view !== 'fight') return;
    for (const foe of f.foes.filter(x => x.hp > 0)) for (let a = 0; a < foe.attacks; a++) { const list = up(S); if (!list.length || !q.fight) break; foeAttack(S, foe, E.pick(list)); }
    if (!q.fight) return;
    // CANON: below 0 you die at the end of the next full round
    team(S).filter(p => p.alive && p.hp < 0 && p.dyingRound != null && f.round >= p.dyingRound).forEach(p => { if (E.d10() >= E.dif(S).hang) { p.dyingRound = f.round + 1; say(S, `${p.name} is still hanging on.`, 'bad'); return; } E.kill(S, p, `Bled out at ${Q.def(q).name}.`); q.rep.dead.push(p.name); say(S, `${p.name} bled out.`, 'bad'); });
    if (!up(S).length) return lose(S);
    if (!checkWin(S)) { f.round++; up(S).forEach(p => { f.acts[p.id] = 3; }); say(S, `Round ${f.round}`, 'round'); }
  };
  function checkWin(S) {
    const q = S.quest, f = q.fight; if (!f || f.foes.some(x => x.hp > 0)) return false;
    const st = up(S);
    team(S).filter(p => p.alive && p.hp < 0).forEach(p => { const s = st[0]; if (s && E.rollSkill(s, 'medicine', 5).succ >= 1) { p.hp = 1; p.exh += 1; delete p.dyingRound; say(S, `${s.name} keeps ${p.name} alive.`, 'good'); } else { E.kill(S, p, `Bled out at ${Q.def(q).name}.`); q.rep.dead.push(p.name); say(S, `Nobody could save ${p.name}.`, 'bad'); } });
    team(S).filter(p => p.alive && p.hp === 0).forEach(p => { p.hp = 1; E.addStress(S, p, 5); });
    up(S).forEach(p => { // CANON: Patch-up after a fight
      const w = team(S).filter(x => x.alive && x.hp < E.maxHp(x)).sort((a, b) => a.hp - b.hp)[0]; if (!w) return;
      const n = E.rollSkill(p, 'medicine', 5).succ * (p.cls === 'medic' ? 3 : 2); if (n) w.hp = Math.min(E.maxHp(w), w.hp + n);
      p.xp += 6;
    });
    if (st.some(p => p.cls === 'shepherd')) team(S).forEach(p => { if (p.alive) p.stress = Math.max(0, p.stress - 2); });
    S.stat.foes += f.foes.length; S.score += f.foes.length * 5; S.stat.fights++;
    q.fight = null; q.view = 'text'; q.text = ['It is over. Everyone catches their breath.', 'Silence. Somebody is laughing and can\'t stop.', 'It is done. Nobody says anything for a long time.', 'The last one stops moving. Somebody checks it twice.', 'Done. Hands shaking, somebody counts heads.', 'Quiet again. The rain is louder than it was.'][Math.floor(Math.random() * 6)];
    return true;
  }
  function lose(S) {
    const q = S.quest;
    team(S).filter(p => p.alive).forEach(p => { if (E.downed(S, p)) { delete p.dyingRound; say(S, `${p.name} came to hours later and crawled home.`, 'bad'); return; } E.kill(S, p, `Lost at ${Q.def(q).name}.`); q.rep.dead.push(p.name); });
    q.rest = q.fight ? q.fight.foes.filter(x => x.hp > 0) : [];
    q.fight = null; q.view = 'end'; q.rep.failed = true;
  }
  Q.flee = S => {
    const q = S.quest, f = q.fight; if (!f) return;
    f.foes.filter(x => x.hp > 0).forEach(foe => { const list = up(S); if (list.length && q.fight) foeAttack(S, foe, E.pick(list)); });
    if (!q.fight) return;
    q.rest = f.foes.filter(x => x.hp > 0);
    team(S).filter(p => p.alive && p.hp <= 0).forEach(p => { if (E.downed(S, p)) { delete p.dyingRound; say(S, `${p.name} was left behind, and still made it home a day later.`, 'bad'); return; } E.kill(S, p, `Left behind at ${Q.def(q).name}.`); q.rep.dead.push(p.name); });
    q.fight = null; q.view = 'end'; q.rep.failed = true; q.rep.fled = true;
    up(S).forEach(p => E.addStress(S, p, 1));
    if (!up(S).length) q.rep.fled = false;
  };
  Q.finish = S => {
    const q = S.quest, d = Q.def(q);
    if (!q.defend && !q.home && Q.trip && up(S).length) { Q.trip(S, 'back'); return; }
    S.qdone = S.qdone || {}; S.qcount = S.qcount || {};
    if (q.defend) {
      team(S).forEach(p => { if (p.alive) { p.xp += q.rep.failed ? 2 : 8; delete p.dyingRound; } });
      S.quest = null;
      if (q.rest && q.rest.length) E.raidRoam(S, q.rest);
      if (!E.humans(S).length) S.over = true;
      return;
    }
    if (!q.rep.failed) { S.qdone[d.k] = S.day; S.qcount[d.k] = (S.qcount[d.k] || 0) + 1; S.stat.quests = (S.stat.quests || 0) + 1; }
    team(S).forEach(p => { if (p.alive) { p.questBack = true; p.xp += q.rep.failed ? 2 : 10; delete p.dyingRound; } });
    S.quest = null;
    if (!E.humans(S).length) S.over = true;
  };
  // they get back at the end of the day
  Q.back = S => S.people.filter(p => p.alive && p.questBack).forEach(p => { p.questBack = false; p.away = false; p.room = p.lastRoom && E.roomOf(S, p.lastRoom) && E.workers(S, E.roomOf(S, p.lastRoom)).length < E.capOf(E.roomOf(S, p.lastRoom)) ? p.lastRoom : null; });
  E.Q = Q;
})();
