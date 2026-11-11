// Couples, pregnancy, babies, children, the Nursery and the School. Invented for this game, for DB's review.
// A pregnancy lasts 40 days, a baby needs the Nursery for 30, a child goes to School until 90 days old, then joins the shelter.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
  const NAMES = { he: ['Eli', 'Noah', 'Jonah', 'Ezra', 'Silas', 'Abel', 'Micah', 'Owen', 'Caleb', 'Rafe', 'Tobias', 'Wren', 'Asa', 'Jude'], she: ['Hope', 'Ada', 'June', 'Mercy', 'Rain', 'Lily', 'Esme', 'Clara', 'Nell', 'Iris', 'Ruby', 'Faith', 'Maya', 'Sol'] };
  D.ROOMS.nursery = { name: 'Nursery', art: 'nursery', skill: 'medicine', cap: 1, build: 30, unique: true, desc: 'Cribs and someone awake at night. Babies here survive. Without it, some do not. Deliveries go better too.' };
  D.ROOMS.school = { name: 'School', art: 'school', skill: 'culture', cap: 1, build: 30, unique: true, desc: 'A teacher, a chalkboard and something like childhood. Children who are taught grow up stronger and calmer.' };
  const AGE = { baby: 30, adult: 90, preg: 40 };
  E.kids = S => S.kids || (S.kids = []);
  E.kidAge = (S, k) => S.day - k.born;
  E.kidStage = (S, k) => (E.kidAge(S, k) < AGE.baby ? 'baby' : 'child');
  E.kidFood = S => E.kids(S).length * .5;
  const parentsOf = (S, k) => [k.mom, k.dad].map(id => S.people.find(p => p.id === id && p.alive)).filter(Boolean);
  const home = (S, p) => p && p.alive && !p.away && !p.sealed;

  E.familyDay = S => {
    const kids = E.kids(S), nurse = E.staffed(S, 'nursery'), school = E.staffed(S, 'school');
    // conception
    (S.couples || []).forEach(c => {
      const [a, b] = c.map(id => S.people.find(p => p.id === id)); if (!a || !b || a.he === b.he) return;
      const mom = a.he === 'she' ? a : b, dad = mom === a ? b : a;
      if (!home(S, mom) || !home(S, dad) || mom.damned || dad.damned || mom.preg || mom.hunger > 0 || (mom.lastBirth && S.day - mom.lastBirth < 30)) return;
      if (Math.random() < (nurse ? .04 : .025)) { mom.preg = { due: S.day + AGE.preg, dad: dad.id }; S.queue.push({ k: 'expecting', p: { id: mom.id } }); }
    });
    // pregnancy and birth
    E.humans(S).filter(p => p.preg).forEach(p => {
      if (p.room && S.day % 5 === 0) p.exh += 1;
      if (S.day >= p.preg.due && !p.away) S.queue.push({ k: 'birth', p: { id: p.id } });
    });
    // babies and children
    kids.slice().forEach(k => {
      const st = E.kidStage(S, k), ps = parentsOf(S, k);
      if (st === 'baby' && !nurse && Math.random() < .015) { kidDies(S, k, 'Stopped breathing in the night. There was nobody awake to notice.'); return; }
      if (S.res.food <= 0 && Math.random() < .04) { kidDies(S, k, 'Starved. The smallest go first.'); return; }
      if (st === 'baby' && nurse) ps.forEach(p => { if (Math.random() < .3) p.stress = Math.max(0, p.stress - 1); });
      if (st === 'child' && school) k.school = (k.school || 0) + 1;
      if (st === 'child' && Math.random() < .06) E.log(S, `${k.name}: "${pick(['Is it raining outside?', 'Why does Mom count the cans?', 'I drew the sun. What color was it?', 'When can I go up the ladder?', 'Someone was talking in the vent again.', 'Is the lady on the radio nice?'])}"`);
      if (E.kidAge(S, k) >= AGE.adult) growUp(S, k);
    });
    // children make everyone a little softer, and a little more afraid
    if (kids.length && Math.random() < .2) E.home(S).filter(p => !p.damned).forEach(p => { p.stress = Math.max(0, p.stress - 1); });
  };
  // what a child gets from each parent: temperament, build, talents, class leanings, and looks
  function genes(S, m, d, he) {
    const ps = [m, d].filter(Boolean), mix = k => Math.max(1, Math.min(10, Math.round(ps.reduce((a, p) => a + E.psy(p)[k], 0) / ps.length + R(-2, 2))));
    const prioSum = { physical: 0, mental: 0, social: 0 }; ps.forEach(p => { for (const c in prioSum) prioSum[c] += p.prio[c]; });
    const order = Object.keys(prioSum).sort((a, b) => prioSum[b] + Math.random() * 3 - (prioSum[a] + Math.random() * 3));
    const top = ps.flatMap(p => Object.entries(p.skills).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]));
    const same = ps.find(p => p.he === he) || ps[0], other = ps.find(p => p !== same);
    const look = Math.random() < .7 ? same : (other || same);
    return { psy: { o: mix('o'), c: mix('c'), e: mix('e'), a: mix('a'), n: mix('n') }, order, talents: [...new Set(top)].slice(0, 5), cls: pick(ps).cls, look: look.sprite, lookName: look.name, quirk: Math.random() < .5 ? pick(E.psy(pick(ps)).quirks) : null };
  }
  E.kidGenes = genes;
  // the grown child's painting: a young version of the parent they take after, when it has been painted; otherwise the closest free face
  function lookSprite(S, g) {
    const kit = globalThis.GEN_KIT || {}, jr = g.look + '_jr';
    if (kit[jr]) return jr;
    const used = new Set(S.people.filter(p => p.alive).map(p => p.sprite)), G = globalThis.GEN.people, sex = G[g.look];
    const free = Object.keys(G).filter(n => G[n] === sex && !used.has(n));
    return free.length ? pick(free) : g.look;
  }
  function kidDies(S, k, why) {
    S.kids = E.kids(S).filter(x => x !== k);
    S.memorial.push({ name: k.name, sprite: (parentsOf(S, k)[0] || {}).sprite || 'ana', cls: 'Child', day: S.day, why, damned: false, level: 0 });
    parentsOf(S, k).forEach(p => { E.addStress(S, p, 7); p.exh += 1; });
    E.home(S).forEach(p => E.addStress(S, p, 1));
    S.queue.push({ k: 'note', p: { title: `${k.name} is gone`, text: `${k.name} was ${E.kidAge(S, k)} days old. ${why} Nobody speaks at dinner.`, art: {} } });
  }
  function growUp(S, k) {
    S.kids = E.kids(S).filter(x => x !== k);
    const g = k.genes || genes(S, parentsOf(S, k)[0], parentsOf(S, k)[1], k.he);
    const x = E.addSurvivor(S, { level: 1 + (k.school >= 40 ? 1 : 0), dmd: Math.min(20, k.dmd || 0), cls: g.cls, sprite: lookSprite(S, g) });
    x.name = k.name; x.he = k.he; x.joined = S.day; x.bornHere = true;
    const par = parentsOf(S, k); { const fam = S.people.find(p => p.id === k.dad) || S.people.find(p => p.id === k.mom); if (fam) x.last = fam.last; }
    [6, 4, 2].forEach((v, i) => { x.prio[g.order[i]] = v; });
    x.pref = [...g.talents, ...x.pref.filter(s => !g.talents.includes(s))];
    x.skills = {}; E.allocate(x); x.hp = E.maxHp(x);
    x.psy = { ...g.psy, quirks: [] }; const own = E.psy({ cls: x.cls }).quirks; x.psy.quirks = [g.quirk || own[0], own[1]].filter((q, i, a) => q && a.indexOf(q) === i).slice(0, 2);
    if (k.school >= 20) { x.stress = 0; x.psy.n = Math.max(1, x.psy.n - 2); x.psy.o = Math.min(10, x.psy.o + 2); }
    x.takesAfter = g.lookName;
    parentsOf(S, k).forEach(p => { E.addRel(S, p, x, 70); p.stress = Math.max(0, p.stress - 2); });
    S.queue.push({ k: 'note', p: { title: `${k.name} is grown`, text: `${k.name} has never seen the sky without black in it. ${k.name} thinks of the shelter as home, and of you as family. Everyone says ${k.name} has ${g.lookName || 'a parent'}'s face and ${par.length > 1 ? `${par[1].name}'s temper` : 'the same stubborn streak'}. ${k.school >= 40 ? 'The School made a difference: sharp, steady, and stronger than the rest of you were at that age.' : k.school ? 'A little schooling took.' : 'Nobody had time to teach much.'}`, art: { p: x.sprite } } });
  }

  EV.expecting = {
    view: (S, p) => { const m = S.people.find(o => o.id === p.id), dad = m && S.people.find(o => o.id === m.preg.dad); return { title: `${m.name} is pregnant`, text: `${m.name} told ${dad ? dad.name : 'the father'} first, in a whisper, then everyone at dinner. Some people cried. Some people looked at the food stores and said nothing. A baby is another mouth, another reason, another thing to lose.`, art: { p: m.sprite }, choices: ['We will find a way', `End it now (Medicine roll, DR 6)`] }; },
    pick: (S, p, i) => {
      const m = S.people.find(o => o.id === p.id); if (!m || !m.preg) return;
      if (i === 0) { E.home(S).forEach(o => { if (E.psy(o).a >= 6) o.stress = Math.max(0, o.stress - 1); }); return; }
      const med = E.home(S).filter(o => !o.sealed && !o.damned).sort((a, b) => E.pool(b, 'medicine') - E.pool(a, 'medicine'))[0], r = E.rollSkill(med, 'medicine', 6);
      const dad = S.people.find(o => o.id === m.preg.dad); m.preg = null; E.addStress(S, m, 4); if (dad) E.addStress(S, dad, 3);
      if (!r.succ) { m.hp = Math.max(1, m.hp - 4); E.expose(S, m, 1, 6, 'infection afterward', null); E.say(S, 'It went badly', `${med.name} did what ${med.he} could. ${m.name} bled for a long time.`); }
    },
  };
  EV.birth = {
    view: (S, p) => { const m = S.people.find(o => o.id === p.id); return { title: `${m.name} is in labor`, text: `It starts in the middle of the night, the way it always does. ${E.staffed(S, 'nursery') || E.staffed(S, 'clinic') ? 'Someone is ready, with clean water and a lamp.' : 'Nobody here has done this before, and everybody knows it.'}`, art: { p: m.sprite }, choices: ['Bring the baby into the world'] }; },
    pick: (S, p) => {
      const m = S.people.find(o => o.id === p.id); if (!m || !m.alive || !m.preg) return;
      const dad = S.people.find(o => o.id === m.preg.dad), med = E.home(S).filter(o => !o.sealed && !o.damned && o !== m).sort((a, b) => E.pool(b, 'medicine') - E.pool(a, 'medicine'))[0];
      const lev = (E.staffed(S, 'nursery') ? 1 : 0) + (E.staffed(S, 'clinic') ? 1 : 0), r = med ? E.rollSkill(med, 'medicine', 6, lev) : { succ: 0, crit: false };
      m.preg = null; m.lastBirth = S.day; m.exh += 2;
      const make = () => { const he = Math.random() < .5 ? 'he' : 'she', taken = new Set([...E.kids(S).map(k => k.name), ...S.people.map(o => o.name)]), opts = NAMES[he].filter(n => !taken.has(n)), k = { id: S.nextId++, name: pick(opts.length ? opts : NAMES[he]), he, mom: m.id, dad: dad ? dad.id : null, born: S.day, school: 0, dmd: Math.floor(m.dmd / 2), genes: genes(S, m, dad, he) }; E.kids(S).push(k); S.stat.born = (S.stat.born || 0) + 1; S.score += 30; return k; };
      let text;
      if (r.crit) { const a = make(), b = make(); text = `Twins. ${a.name} and ${b.name}, loud and furious and alive. ${m.name} laughed until ${m.he === 'he' ? 'he' : 'she'} cried.`; }
      else if (r.succ >= 1) { const k = make(); text = `${k.name}. Small, red, screaming. The whole shelter heard the first cry and nobody minded.${k.dmd >= 10 ? ` ${m.name}'s meter was high. ${k.name}'s eyes are a little too dark, and ${k.he} never seems to blink.` : ''}`; }
      else if (Math.random() < .4) { text = `The baby never breathed. ${m.name} held it until morning and would not let anyone take it.`; E.addStress(S, m, 8); if (dad) E.addStress(S, dad, 6); S.memorial.push({ name: `${m.name}'s baby`, sprite: m.sprite, cls: 'Child', day: S.day, why: 'Stillborn.', damned: false, level: 0 }); }
      else if (Math.random() < .25) { const k = make(); E.kill(S, m, `Died giving birth to ${k.name}.`); text = `${k.name} lived. ${m.name} did not.`; }
      else { const k = make(); m.hp = Math.max(1, m.hp - 5); text = `${k.name} came out blue and then, suddenly, pink. ${m.name} lost a lot of blood and will be weak for days.`; }
      E.home(S).forEach(o => E.addStress(S, o, -0)); E.say(S, 'A birth', text, { p: m.sprite });
    },
  };
})();
