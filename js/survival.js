// When the stores run low: people walk out instead of starving, and sometimes an armed few try to take what is left.
// Invented for this game, for DB's review.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS;
  const pr = (p, a, b, c) => (p.he === 'he' ? a : p.he === 'she' ? b : c);
  const He = p => pr(p, 'He', 'She', 'They'), him = p => pr(p, 'him', 'her', 'them'), his = p => pr(p, 'his', 'her', 'their');
  const at = S => E.home(S).filter(o => o.alive && !o.sealed && !o.damned && !o.away);
  const psy = p => (E.psy ? E.psy(p) : { a: 5, c: 5, n: 5, e: 5, o: 5 });

  // someone leaves alive: no body, no grave, but the Wall remembers
  E.depart = (S, p, why) => {
    p.alive = false; p.left = true; p.room = null; p.away = false; p.sealed = false; p.why = why; p.diedDay = S.day;
    S.memorial.push({ name: `${p.name} ${p.last}`, sprite: p.sprite, cls: '', day: S.day, why, left: true, level: p.level, ep: '' });
    const mate = E.partnerOf && E.partnerOf(S, p); if (mate) E.addStress(S, mate, 4);
    E.log(S, `${p.name} is gone. ${why}`, 'bad');
  };

  const day = S => {
    const h = at(S), need = E.needs(S), L = E.leader && E.leader(S);
    const crowd = E.humans(S).length - 16; if (crowd > 0) { S.order = Math.max(0, (S.order ?? 55) - crowd * .1); h.forEach(o => { if (Math.random() < crowd * .006) E.addStress(S, o, 1); }); }
    // walking out: stores under two days, people hungry, enough of you left to notice
    if (h.length >= 4 && S.res.food < need.food * 2 && h.some(o => o.hunger >= 2) && S.day - (S.exoDay || -99) >= 9 && Math.random() < .35 && !S.queue.some(q => q.k === 'exodus')) {
      const c = h.filter(o => o !== L).sort((a, b) => (psy(a).a + psy(a).c - a.hunger) - (psy(b).a + psy(b).c - b.hunger))[0];
      if (c) { S.exoDay = S.day; const fr = h.length >= 14 && E.rel ? h.filter(o => o !== c && o !== L && E.rel(S, c, o) >= 25).slice(0, Math.min(3, Math.floor(h.length / 8))).map(o => o.id) : []; S.queue.push({ k: 'exodus', p: { id: c.id, with: fr } }); }
    }
    // an armed faction: rare, late, and only when things are already bad
    if (S.day >= 50 && h.length >= 6 && (S.res.food < need.food * 4 || (S.order ?? 55) < 30) && S.day - (S.facDay || -999) >= 70 && Math.random() < .025 + Math.max(0, h.length - 18) * .002 && !S.queue.some(q => q.k === 'faction')) {
      const pool = h.filter(o => o !== L).sort((a, b) => psy(a).a - psy(b).a), ring = pool[0];
      if (ring) {
        const n = Math.min(5, Math.max(2, Math.floor(h.length / 5)));
        const crew = [ring, ...pool.slice(1).sort((a, b) => (E.rel ? E.rel(S, ring, b) - E.rel(S, ring, a) : 0)).slice(0, n - 1)];
        S.facDay = S.day; S.queue.push({ k: 'faction', p: { ids: crew.map(o => o.id) } });
      }
    }
  };
  const t0 = E.truthDay; E.truthDay = S => { t0(S); day(S); };

  EV.refugees = {
    chance: 2, when: S => S.day >= 20 && E.roomFor(S) && !(E.lawOn && E.lawOn(S, 'sealed')),
    make: S => { const n = 2 + Math.floor(Math.random() * (E.humans(S).length >= 12 ? 4 : 2)); return { n: Math.max(1, Math.min(n, E.MAXADULT - E.humans(S).length)) }; },
    view: (S, p) => {
      const kinds = [`${p.n} people at the hatch: a family, by the look of them, or what is left of one. The youngest is carrying the oldest's shoes.`, `${p.n} survivors from a shelter that flooded. They have their own blankets and nothing else. One of them keeps counting the rest of them, over and over.`, `A knock in a pattern, then ${p.n} people climbing down out of the rain without being asked. "We heard you had beds. Please. We can work."`, `${p.n} people from a church group that walked here from the river. They are polite and very hungry, and they pray before they ask for anything.`];
      return { title: 'A group at the hatch', text: kinds[Math.floor(Math.random() * kinds.length)] + `\n\nBeds: ${E.bedsOf(S)} for ${E.humans(S).length} people. Every one of them eats.`, art: {}, choices: [`Let all ${p.n} in`, 'Take two, turn the rest away', 'Turn them all away'] };
    },
    pick: (S, p, i) => {
      if (i === 2) { at(S).forEach(o => { if (psy(o).a >= 7) E.addStress(S, o, 1); }); E.say(S, 'Turned away', 'They stood in the rain a long time after the hatch closed. In the morning there were handprints on it.'); return; }
      const n = Math.min(i === 0 ? p.n : 2, E.MAXADULT - E.humans(S).length), got = [];
      for (let k = 0; k < n; k++) { const x = E.addSurvivor(S); if (x) got.push(x); }
      if (i === 1 && p.n > 2) at(S).forEach(o => { if (psy(o).a >= 6) E.addStress(S, o, 1); });
      if (got.length) E.say(S, got.length > 1 ? 'New faces' : 'New face', got.map(x => `${x.name} ${x.last}, ${E.classNameOf(x)}.`).join('\n') + (i === 1 && p.n > 2 ? `\n\nThe ${p.n - 2} you turned away did not argue. That was the worst part.` : ''), { p: got[0].sprite });
    },
  };

  EV.exodus = {
    view: S => {
      const p = S.queue[0] && S.queue[0].p, x = S.people.find(o => o.id === (p && p.id) && o.alive);
      if (!x) return { title: 'An empty bunk', text: 'Somebody was going to leave. It does not matter now.', art: {}, choices: ['Go on'] };
      const lines = [
        `${x.name} is packing a bag by the hatch. "There's nothing here. I'd rather starve walking than starve waiting." ${He(x)} won't look at anyone.`,
        `${x.name} has ${his(x)} boots on at three in the morning. "One less mouth. That's the best thing I can do for you now." ${He(x)} sounds like ${pr(x, "he's", "she's", "they've")} practiced saying it.`,
        `${x.name} says it at dinner, over an empty plate. "I'm going. Somewhere south. Maybe it's better." Nobody believes that, including ${him(x)}.`,
        `${x.name} is at the door with a blanket and a knife. "Don't make this a thing. You'd do it too if you had the guts."`,
      ];
      const fr = (p.with || []).map(id => S.people.find(o => o.id === id && o.alive)).filter(Boolean);
      return { title: fr.length ? `${x.name} and ${fr.length} more want to leave` : `${x.name} wants to leave`, text: lines[Math.floor(Math.random() * lines.length)] + (fr.length ? ` ${fr.map(o => o.name).join(', ')} ${fr.length > 1 ? 'are' : 'is'} going too.` : '') + `\n\nThe stores are nearly empty.`, art: { p: x.sprite }, choices: ['Give them a share and say goodbye', 'Let them go with nothing', 'Talk them into staying'] };
    },
    pick: (S, p, i) => {
      const x = S.people.find(o => o.id === p.id && o.alive); if (!x) return;
      const fr = (p.with || []).map(id => S.people.find(o => o.id === id && o.alive)).filter(Boolean), go = why => fr.forEach(o => E.depart(S, o, why));
      const L = E.leader && E.leader(S), h = at(S).filter(o => o !== x && !fr.includes(o));
      if (i === 0) { const f = Math.min(3 * (1 + fr.length), S.res.food), w = Math.min(3 * (1 + fr.length), S.res.water); S.res.food -= f; S.res.water -= w; E.depart(S, x, 'Walked out into the rain with a share of the food.'); go('Walked out into the rain with a share of the food.'); h.forEach(o => E.addStress(S, o, 1)); E.say(S, 'Goodbye', `Everybody hugged ${x.name} at the hatch, even the ones who didn't like ${him(x)}. The bag was heavier than it should have been. Somebody keeps saying ${x.name} will be fine.`, { p: x.sprite }); return; }
      if (i === 1) { S.order = Math.max(0, (S.order ?? 55) - 4); E.depart(S, x, 'Walked out into the rain with nothing.'); go('Walked out into the rain with nothing.'); h.forEach(o => { if (psy(o).a >= 6) E.addStress(S, o, 2); }); E.say(S, 'Nothing to give', `${x.name} left with the clothes ${pr(x, 'he', 'she', 'they')} had on. The hatch closed and nobody went to the periscope to watch which way ${pr(x, 'he', 'she', 'they')} went.`, { p: x.sprite }); return; }
      const talker = L && L !== x ? L : h.slice().sort((a, b) => E.pool(b, 'politics') - E.pool(a, 'politics'))[0];
      const r = talker ? E.rollSkill(talker, 'politics', 6) : { succ: 0 };
      if (r.succ >= 1 || r.crit) { x.stress = Math.max(0, x.stress - 2); E.say(S, 'Stay', `${talker.name} sat with ${x.name} by the hatch until the bag was unpacked again. "We starve together or we don't starve at all." It is not much of a promise. It was enough, for now.`, { p: x.sprite }); return; }
      const f = Math.min(6 * (1 + fr.length), S.res.food); S.res.food -= f;
      E.depart(S, x, 'Left in the night and took food.'); go('Left in the night and took food.');
      h.forEach(o => E.addStress(S, o, 2)); S.order = Math.max(0, (S.order ?? 55) - 6);
      E.say(S, 'Gone by morning', `${x.name} nodded and said ${pr(x, "he'd", "she'd", "they'd")} stay. In the morning ${his(x)} bunk was empty${f ? ` and ${f} days of food were gone with ${him(x)}` : ''}. Somebody left the hatch unbolted.`, { p: x.sprite });
    },
  };

  // a fight between residents, settled with dice (TOFU skill rolls, numbers invented)
  const brawl = (S, us, them) => {
    const side = g => g.reduce((t, o) => { const sk = E.pool(o, 'ranged') >= E.pool(o, 'melee') ? 'ranged' : 'melee', r = E.rollSkill(o, sk, 6); return t + r.succ + (r.crit ? 2 : 0) + (o.weapon ? 1 : 0); }, 0);
    const a = side(us) + (S.rooms.some(r => r.type === 'armory') ? 2 : 0), b = side(them) + 1;
    const win = a >= b, lost = win ? them : us, won = win ? us : them, dead = [];
    lost.forEach(o => { if (E.d10() <= 4) { E.kill(S, o, win ? 'Shot taking the stores.' : 'Killed defending the stores.'); dead.push(o.name); } else { o.hp = Math.max(1, Math.floor(o.hp / 3)); E.addStress(S, o, 3); } });
    const w = won[Math.floor(Math.random() * won.length)]; if (w && E.d10() <= 2) { E.kill(S, w, win ? 'Killed retaking the stores.' : 'Killed holding the stores.'); dead.push(w.name); }
    won.forEach(o => { if (o.alive) { o.hp = Math.max(1, o.hp - 3); E.addStress(S, o, 2); } });
    return { win, dead };
  };

  EV.faction = {
    view: S => {
      const ids = (S.queue[0] && S.queue[0].p.ids) || [], crew = ids.map(id => S.people.find(o => o.id === id && o.alive)).filter(Boolean);
      if (crew.length < 2) return { title: 'Whispers', text: 'There was talk of taking the stores. It came to nothing.', art: {}, choices: ['Go on'] };
      const r = crew[0], names = crew.map(o => o.name).join(' and ').replace(/ and (?=.* and )/g, ', ');
      return { title: 'They took the stores', text: `${names} barricaded the storeroom in the night. They have the guns from the rack. ${r.name} did the talking through the door: "From now on we decide who eats. You can be on this side of the door or that side. Pick."\n\nEveryone else is looking at the leader.`, art: { p: r.sprite }, choices: ['Take the stores back by force', 'Cut a deal: they eat first', 'Exile them'] };
    },
    pick: (S, p, i) => {
      const crew = (p.ids || []).map(id => S.people.find(o => o.id === id && o.alive)).filter(Boolean); if (crew.length < 2) return;
      const L = E.leader && E.leader(S), us = at(S).filter(o => !crew.includes(o));
      const fightIt = why => {
        const { win, dead } = brawl(S, us, crew), d = dead.length ? ` ${dead.join(', ')} ${dead.length > 1 ? 'are' : 'is'} dead.` : ' Somehow nobody died.';
        if (win) { S.order = Math.min(100, (S.order ?? 55) + 8); crew.filter(o => o.alive).forEach(o => E.addStress(S, o, 3)); E.say(S, 'The storeroom', `${why}It was over in under a minute, and it was the worst minute anyone has had down here.${d} The ones still alive from their side are sitting against the wall with their hands on their heads. They will have to be fed, like everyone else.`, { p: crew[0].sprite }); }
        else { const f = Math.floor(S.res.food / 2), w = Math.floor(S.res.water / 2); S.res.food -= f; S.res.water -= w; crew.filter(o => o.alive).forEach(o => E.depart(S, o, 'Took the stores and left.')); S.order = Math.max(0, (S.order ?? 55) - 12); if (L && L.alive) E.addStress(S, L, 4); E.say(S, 'The storeroom', `${why}It went wrong fast.${d} By dawn they were gone through the hatch with half of everything you had. Nobody went after them.`, { p: crew[0].sprite }); }
      };
      if (i === 0) return fightIt('You went through the door. ');
      if (i === 1) { S.order = Math.max(0, (S.order ?? 55) - 10); crew.forEach(o => { o.stress = Math.max(0, o.stress - 3); o.hunger = 0; }); us.forEach(o => E.addStress(S, o, 2)); if (L) E.addStress(S, L, 3); S.facDeal = S.day; S.facDay = S.day - 40; E.say(S, 'The deal', `${crew[0].name} gets the key to the storeroom, and ${crew.length > 2 ? 'the others eat' : crew[1].name + ' eats'} first. Everyone else gets what's left. Nobody calls it what it is out loud. The kids are told it's a new rule.`, { p: crew[0].sprite }); return; }
      const talker = L && !crew.includes(L) ? L : us.slice().sort((a, b) => E.pool(b, 'intimidation') - E.pool(a, 'intimidation'))[0];
      const r = talker ? E.rollSkill(talker, 'intimidation', 5 + crew.length - Math.min(3, Math.floor(us.length / 3))) : { succ: 0 };
      if (r.succ >= 1 || r.crit) { const f = Math.floor(S.res.food / 5); S.res.food -= f; crew.forEach(o => E.depart(S, o, 'Exiled for taking the stores.')); us.forEach(o => E.addStress(S, o, 1)); E.say(S, 'Exile', `${talker.name} stood at the barricade and said it plainly: leave with a fifth of the food, or don't leave at all. They believed it. They went up the ladder one at a time, and nobody said goodbye.`, { p: crew[0].sprite }); return; }
      fightIt(`${talker ? talker.name : 'The leader'} told them to get out. ${crew[0].name} laughed. `);
    },
  };
})();

// ---------- Critic pass (2026-11-12): a full larder draws the dark, one-off moments stay one-off, every name means one person,
// every newcomer gets a line and a callback, and run reports read like what happened. All invented for this game, for DB's review.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS;
  const pr = (p, a, b) => (p.he === 'he' ? a : b);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const list = a => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' and ' + a[a.length - 1]);
  const low = t => (t && !/^[A-Z]{2}|^Q\.U|^I\b/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
  const dot = t => (/[.!?"]$/.test(t) ? t : t + '.');

  // ===== 1. Names: one name, one person, for the whole run (the dead keep theirs)
  const FIRST = {
    he: ['Arlo', 'Benny', 'Curtis', 'Dmitri', 'Eddie', 'Felix', 'Glenn', 'Hector', 'Ian', 'Jamal', 'Kurt', 'Lionel', 'Marcus', 'Nate', 'Oscar', 'Pete', 'Quinn', 'Ray', 'Stan', 'Teddy', 'Ulysses', 'Victor', 'Walt', 'Xavier', 'Yusuf', 'Zeke', 'Bram', 'Desmond', 'Frank', 'Hollis', 'Joaquin', 'Lyle', 'Mateo', 'Otis', 'Russ', 'Sergei', 'Tariq', 'Vince', 'Wade', 'Elliot'],
    she: ['Alma', 'Bonnie', 'Carmen', 'Dora', 'Edie', 'Fran', 'Greta', 'Hattie', 'Inez', 'Jolene', 'Kat', 'Lorna', 'Marisol', 'Nadia', 'Opal', 'Paula', 'Queenie', 'Rhoda', 'Shay', 'Tess', 'Uma', 'Vera', 'Winnie', 'Yara', 'Zoe', 'Bridget', 'Delia', 'Fern', 'Gloria', 'Helga', 'Imani', 'Lucia', 'Mabel', 'Noreen', 'Petra', 'Rosalind', 'Sunny', 'Trudy', 'Viv', 'Hazel'],
  };
  const takenNames = (S, self) => {
    const t = new Set();
    S.people.forEach(o => { if (o !== self) t.add(o.name); });
    (S.memorial || []).forEach(m => t.add(String(m.name).split(' ')[0]));
    if (E.kids) E.kids(S).forEach(k => t.add(k.name));
    return t;
  };
  E.uniqueName = (S, p) => {
    if (p.viewer) return;
    const t = takenNames(S, p);
    if (t.has(p.name)) { const opts = FIRST[p.he === 'he' ? 'he' : 'she'].filter(n => !t.has(n)); if (opts.length) p.name = pick(opts); else { let k = 2; while (t.has(`${p.name} ${k}`)) k++; p.name = `${p.name} ${k}`; } }
    const D = globalThis.SHELTER_DATA, fulls = new Set(S.people.filter(o => o !== p).map(o => `${o.name} ${o.last}`));
    for (let g = 0; g < 30 && (p.last === p.name || fulls.has(`${p.name} ${p.last}`)); g++) p.last = pick(D.SURNAMES);
  };

  // ===== 2. Newcomers: one personal line when they arrive, one callback a few days later, and their own epitaph
  const BIOS = [
    { i: x => 'Drove a school bus before. Counts heads without meaning to.', c: x => `${x.name} counted heads at dinner again, got the number right, then said it twice to be sure. People have started waiting for it.`, e: 'Counted us every night. Somebody has to now.' },
    { i: x => 'Carries a wedding ring on a bootlace. Does not say whose.', c: x => `${x.name} finally said whose ring it is. ${pr(x, 'His', 'Her')} sister's. ${pr(x, 'He', 'She')} was supposed to give it back at the wedding.`, e: 'Still had the ring. We buried it with them.' },
    { i: x => "Was a dental hygienist. Checks everyone's gums for black.", c: x => `${x.name} made everyone open wide in the corridor, one by one, with a torch. Nobody had black gums. ${pr(x, 'He', 'She')} cried a little, from relief.`, e: 'Checked our teeth. Nobody checked theirs.' },
    { i: x => 'Asks if you have a piano. Laughs when you say no.', c: x => `${x.name} drew a keyboard on a plank in charcoal and plays it after lights out. You can almost hear it. Two of the kids sit and listen to nothing.`, e: 'Played the plank piano. We can still almost hear it.' },
    { i: x => 'Brought a bag of seeds from a garden center and nothing else.', c: x => `${x.name}'s seeds came up. Peppers, the label says. Tiny and green and stubborn, like ${pr(x, 'him', 'her')}.`, e: 'Their peppers still come up.' },
    { i: x => `Talks to ${pr(x, 'his', 'her')} dead dog as if it is still walking beside ${pr(x, 'him', 'her')}.`, c: x => `${x.name} stopped talking to the dog that is not there. ${pr(x, 'He', 'She')} says it finally lay down. Everyone is a little sad about a dog none of you ever saw.`, e: 'Gone to find the dog.' },
    { i: x => 'Was a night-shift nurse. Has not slept properly in a decade and says it shows.', c: x => `${x.name} sat up with the sick all night again, humming the same three notes. In the morning nobody had died. ${pr(x, 'He', 'She')} took the credit, deadpan.`, e: 'Sat up with us. Somebody sat up with them.' },
    { i: x => `Keeps a list of every person ${pr(x, 'he', 'she')} has seen die. It is a long list.`, c: x => `${x.name} let you read the list. The last page is blank except for a heading: "People who made it." ${pr(x, 'He', 'She')} wants to start it here.`, e: 'Kept the list. We added their name to it, on the wrong page.' },
    { i: x => 'Used to sell insurance. Finds this very funny.', c: x => `${x.name} wrote everyone an insurance policy on a scrap of map, covering "acts of God, acts of rain, acts of whatever is in the vent." Premiums payable in socks.`, e: 'The policy did not pay out. It never does.' },
    { i: x => 'Arrived with a radio that only picks up one station: a man reading numbers.', c: x => `${x.name}'s numbers station skipped a number last night. ${pr(x, 'He', 'She')} has not slept since, waiting to hear if it comes back.`, e: 'Still listening for the missing number.' },
    { i: x => 'Has a laugh like a car alarm and apologizes for it every time.', c: x => `Someone told a terrible joke and ${x.name} laughed the car-alarm laugh, and the whole shelter laughed at the laugh. Nobody apologized. It was the best night in a week.`, e: 'Laughed too loud. We would give anything to hear it.' },
    { i: x => `Was a youth pastor. Not sure anymore what ${pr(x, 'he', 'she')} believes.`, c: x => `${x.name} said grace over the rice tonight, then stopped halfway and just said "thank you" to the people at the table instead. It counted.`, e: 'Said grace to us instead. We say it back.' },
    { i: x => `Wears three watches, each set to a city where ${pr(x, 'he', 'she')} had family.`, c: x => `One of ${x.name}'s watches stopped. ${pr(x, 'He', 'She')} has not wound it. ${pr(x, 'He', 'She')} says ${pr(x, 'he', 'she')} knows what it means.`, e: 'All three watches stopped the same night.' },
    { i: x => 'Was a butcher. Says it like a warning.', c: x => `${x.name} took one look at how you were cutting the rations and quietly took the knife. Nothing goes to waste now. Nobody asks what ${pr(x, 'he', 'she')} practised on.`, e: 'Knew how to make it last.' },
    { i: x => 'Sings to the rain. Says it is the only thing out there that listens.', c: x => `${x.name} stood under the drip in the corridor and sang to it again. The drip stopped. It started again when ${pr(x, 'he', 'she')} walked away.`, e: 'Sang to the rain. The rain sings back now.' },
    { i: x => `Bit a man who tried to rob ${pr(x, 'him', 'her')}. Brings it up a lot.`, c: x => `${x.name} told the robbery story again, and this time admitted the man was ninety. Nobody knows which version is true. Neither does ${x.name}.`, e: 'Bit back. Every time.' },
    { i: x => 'Was a librarian. Brought four books and has read each one eleven times.', c: x => `${x.name} started reading one of the four books out loud after dinner, doing all the voices. Even the people who said they hated reading stay for it.`, e: 'Did all the voices. Nobody can finish the book now.' },
    { i: x => `Paints a tally on ${pr(x, 'his', 'her')} forearm for every day ${pr(x, 'he', 'she')} has stayed dry.`, c: x => `${x.name} ran out of forearm for tallies and started on the other one. ${pr(x, 'He', 'She')} lets the kids add the new marks.`, e: 'Ran out of arm for tallies. We kept counting.' },
    { i: x => 'Was a trucker. Knows every road in three states, and which ones are bad now.', c: x => `${x.name} drew a map of the county from memory on the wall, every road, with crosses where people went missing. It is more crosses than roads.`, e: 'Knew every road. Took the last one alone.' },
    { i: x => `Refuses to say ${pr(x, 'his', 'her')} real name. You have been given this one.`, c: x => `${x.name} told you ${pr(x, 'his', 'her')} real name in a whisper, then asked you never to use it. ${pr(x, 'He', 'She')} says the rain knows the old one.`, e: 'We used the name they gave us. The other one stays secret.' },
    { i: x => 'Was a cook on an oil rig. Can make rice taste like six things.', c: x => `${x.name} made something from rice, a can of soup and a pinch of nothing, and for one meal the shelter smelled like a kitchen. Two people asked for the recipe. There isn't one.`, e: 'Made rice taste like home.' },
    { i: x => `Lost ${pr(x, 'his', 'her')} glasses in the first week. Sees you as a friendly blur.`, c: x => `A run brought back a pair of reading glasses for ${x.name}. ${pr(x, 'He', 'She')} put them on, looked around the shelter for a long time, and said "Oh." Then, kindly: "You all look terrible."`, e: 'Finally saw us clearly, and stayed anyway.' },
    { i: x => `Tells everyone ${pr(x, 'he', 'she')} was a stuntman. Probably was an accountant.`, c: x => `${x.name} did a real backflip off the bunks to win a bet. ${pr(x, 'He', 'She')} was, it turns out, a stuntman. Also an accountant.`, e: 'Stuntman. Accountant. Ours.' },
    { i: x => `Has a photo of ${pr(x, 'his', 'her')} kids and will not look at it.`, c: x => `${x.name} showed the photo around tonight, finally. Two girls on a swing set, before. ${pr(x, 'He', 'She')} said their names out loud and then went to bed early.`, e: 'Looked at the photo, at the end.' },
    { i: x => `Came with ${pr(x, 'his', 'her')} own hammer and calls it a friend.`, c: x => `${x.name} fixed every squeaky bunk in the shelter in one night, talking to the hammer the whole time. Nobody slept, but now nothing squeaks.`, e: 'Fixed everything but the one thing.' },
    { i: x => 'Was a weather presenter on local TV. Still gives the forecast every morning.', c: x => `${x.name} gave the morning forecast in full TV voice: "Black rain, chance of more black rain, and a front of dread moving in from the east." It got applause.`, e: 'Forecast: black rain. Clearing, someday.' },
    { i: x => 'Hums when frightened. Hums a lot.', c: x => `${x.name} was humming on watch last night, and something outside hummed back, a little off-key. ${pr(x, 'He', 'She')} does not hum anymore.`, e: 'Stopped humming. We hum for them.' },
    { i: x => `Arrived with a knitting bag full of half-finished scarves for people ${pr(x, 'he', 'she')} lost.`, c: x => `${x.name} finished one of the scarves and gave it to someone here instead. ${pr(x, 'He', 'She')} said the person it was for would have liked that.`, e: 'Left a scarf on every bunk.' },
  ];
  const bioOf = p => (p && p.bio != null ? BIOS[p.bio] : null);
  E.intro = p => { const b = bioOf(p); return b ? ` ${b.i(p)}` : ''; };
  const a0 = E.addSurvivor;
  E.addSurvivor = (S, o) => {
    const p = a0(S, o); if (!p) return p;
    E.uniqueName(S, p);
    if (S.day > 1) {
      S.bioUsed = S.bioUsed || [];
      const free = BIOS.map((b, i) => i).filter(i => !S.bioUsed.includes(i));
      if (free.length) { p.bio = pick(free); S.bioUsed.push(p.bio); p.cbDay = S.day + 3 + Math.floor(Math.random() * 6); }
    }
    return p;
  };
  const ep0 = E.epitaph; E.epitaph = (S, p) => { const b = bioOf(p); return b && (p.cbDone || Math.random() < .6) ? b.e : ep0 ? ep0(S, p) : ''; };
  // the plain "joins you" cards get the person's line
  const say0 = E.say; E.say = (S, title, text, art) => {
    if (/ joins you$|^New faces?$/.test(title)) {
      const ppl = S.people.filter(o => o.alive && o.bio != null && o.joined === S.day && !o.introDone);
      if (ppl.length) { text = String(text).split('\n').map(line => { const x = ppl.find(o => line.startsWith(`${o.name} ${o.last},`) || title.startsWith(`${o.name} ${o.last}`)); if (x && !x.introDone) { x.introDone = 1; return `${line}${E.intro(x)}`; } return line; }).join('\n'); }
    }
    return say0(S, title, text, art);
  };

  // ===== 3. Repetition: one-off moments happen once, the door gets knocked on less, and the same card never comes back within days
  const ONCE = ['bitten', 'letters', 'sprout', 'mercenary', 'hum', 'polaroid', 'knocks', 'headcount', 'wallname', 'sleepwalk'];
  const DOOR = ['gatecomer', 'signal', 'refugees', 'bitten', 'mercenary', 'found_survivors'];
  const GAP = { goodnight: 9, birthday: 10, theft: 14, rainstop: 30, questmsg: 20, streak: 25, drone: 12, caravan: 8, toll: 10, cult: 18, hoarder: 16, scent: 6 };
  const GN = ['Somebody made a real stew, somebody found a guitar, and for an hour nobody counted anything.', 'Someone found a deck of cards. The arguments were about cards.', 'The generator ran steady all night and someone put on a cassette of a ball game from twenty years ago. People cheered for a team that no longer exists.', 'Somebody started telling ghost stories, and they were so bad, so unlike anything outside, that everybody laughed until they cried.', 'Two people danced in the corridor to nobody singing. Then four. Then everyone, badly.', 'Somebody taught the shelter a clapping game from their school. You played it until the candles went out.'];
  E.evOk = (S, k) => {
    const m = S.evLast || {}, n = S.evN || {};
    if (ONCE.includes(k) && n[k]) return false;
    if (DOOR.includes(k) && S.day - (S.doorLast ?? -99) < 9) return false;
    if (S.day - (m[k] ?? -99) < (GAP[k] ?? 8)) return false;
    if (k === 'birthday' && !E.home(S).some(o => !o.sealed && !o.damned && !(S.bday || {})[o.id])) return false;
    if (k === 'goodnight' && (S.gnUsed || []).length >= GN.length) return false;
    return true;
  };
  E.evMark = (S, k) => { S.evLast = S.evLast || {}; S.evN = S.evN || {}; S.evLast[k] = S.day; S.evN[k] = (S.evN[k] || 0) + 1; if (DOOR.includes(k)) S.doorLast = S.day; };

  // the knock and the radio call, written differently each time
  const KNOCK = [
    'A stranger is knocking, shivering, hands up.',
    'Three slow knocks, then nothing, then three more. A man in a soaked parka, hood down so you can see his face.',
    'Someone is scratching at the hatch with a coin, the way you would if your knuckles were too broken to knock. A woman, barefoot.',
    'A teenager at the hatch with a hockey stick and a backpack full of somebody else\'s photographs. "I can work. I can work, I swear."',
    'An old man sitting on the hatch as if waiting for a bus. He says he heard there was a place down here. He does not say who told him.',
    'A woman calls your shelter by a name nobody here has ever used. She says she has been walking toward it for a month.',
    'Someone has been knocking since before dawn, very politely, every ten minutes exactly.',
    'A man in a hospital gown and a raincoat, with a wristband nobody can read. He keeps saying "thank you" before you have said anything.',
    'A woman with a dog leash and no dog. She asks if you have seen him. Then she asks if she can come in.',
    'A soldier, or someone wearing a soldier\'s jacket, with the name tag torn off. Unarmed, or pretending to be.',
  ];
  const RADIO = [
    'Someone is out there, low on batteries, asking if anyone is left. They can make it to you by morning.',
    'A girl\'s voice on the radio, reading out her address very carefully, as if someone taught her to. She has been alone four days.',
    'A man on the radio, out of breath, running. "I can see your vent smoke. Please. Please don\'t move."',
    'Static, then a woman laughing with relief that anyone answered at all. She is two streets away and the water is rising.',
    'A voice you think is a recording, until it says your street name and asks if it can come in.',
    'A trucker on channel 19, stuck on the overpass with a broken axle. He has a box of tinned fish and nobody to share it with.',
  ];
  const gv = EV.gatecomer.view; EV.gatecomer.view = (S, p, E2) => { const v = gv(S, p, E2); if (p.v == null) { S.kv = ((S.kv ?? Math.floor(Math.random() * KNOCK.length)) + 1) % KNOCK.length; p.v = S.kv; } v.text = v.text.replace('A stranger is knocking, shivering, hands up.', KNOCK[p.v]); return v; };
  const sv = EV.signal.view; EV.signal.view = (S, p, E2) => { const v = sv(S, p, E2); if (p.v == null) { S.rv = ((S.rv ?? Math.floor(Math.random() * RADIO.length)) + 1) % RADIO.length; p.v = S.rv; } v.text = RADIO[p.v]; return v; };

  // birthdays: one each, and no two the same
  const GIFTS = [
    x => 'a pair of socks with no holes in them',
    x => 'a candle stub, and a promise to light it on the day the rain stops',
    x => 'a drawing of the sky the way it used to look, coloured in with crayon and some guesswork',
    x => `a whole tin of peaches, which everybody pretends ${x.name} does not have to share`,
    x => `a harmonica with two working notes, which ${x.name} plays all night`,
    x => `a paperback with the last chapter torn out, so ${x.name} can decide how it ends`,
    x => 'a hand-sewn badge that just says "STILL HERE"',
    x => 'ten minutes alone in the only room with a lock, which is the best present anyone has had in years',
    x => `a jar with a real living moth in it, which ${x.name} lets go up the vent at midnight`,
    x => `a calendar drawn on cardboard with ${x.name}'s next birthday circled, which is the kindest kind of lie`,
  ];
  EV.birthday.view = (S, p) => {
    S.bday = S.bday || {};
    const h = E.home(S).filter(o => !o.sealed && !o.damned), fresh = h.filter(o => !S.bday[o.id]), x = (p.id && h.find(o => o.id === p.id)) || pick(fresh.length ? fresh : h);
    if (!x) return { title: 'Quiet', text: 'A quiet night.', art: {}, choices: ['Good'] };
    p.id = x.id; S.bday[x.id] = 1;
    if (p.g == null) { S.giftUsed = S.giftUsed || []; const f = GIFTS.map((g, i) => i).filter(i => !S.giftUsed.includes(i)); p.g = f.length ? pick(f) : Math.floor(Math.random() * GIFTS.length); S.giftUsed.push(p.g); }
    return { title: `${x.name}'s birthday`, text: `Somebody remembered. Nobody knows how. There is a candle stuck in a cold biscuit, a song sung too slowly, and a present wrapped in a map page: ${GIFTS[p.g](x)}. ${x.name} pretends not to cry, badly.`, art: { p: x.sprite }, choices: ['Happy birthday'] };
  };
  EV.goodnight.view = (S, p) => { S.gnUsed = S.gnUsed || []; if (p.i == null) { const f = GN.map((g, i) => i).filter(i => !S.gnUsed.includes(i)); p.i = f.length ? pick(f) : 0; S.gnUsed.push(p.i); } return { title: 'A good night', text: GN[p.i], art: {}, choices: ['Good'] }; };

  // the thief: a different face each time, and calling someone out has a cost
  EV.theft.make = S => {
    S.blamed = S.blamed || [];
    const h = E.humans(S).filter(o => !o.away && !o.sealed), again = S.thief && h.find(o => o.id === S.thief);
    const nb = h.filter(o => !S.blamed.includes(o.id)), tense = nb.filter(o => o.stress >= 3);
    const x = again || pick(tense.length ? tense : nb.length ? nb : h);
    return { id: x.id, guilty: again ? true : Math.random() < .5, again: !!again };
  };
  EV.theft.view = (S, p) => { const x = S.people.find(o => o.id === p.id); if (!x || !x.alive) return { title: 'Missing food', text: 'Six cans are gone. Nobody will look at anybody.', art: {}, choices: ['Say nothing'] }; return { title: p.again ? 'Missing food, again' : 'Missing food', text: p.again ? `More cans are gone. You let it go last time. People are looking at ${x.name} again, and this time they are looking at you too.` : `Six cans are gone, and ${x.name} has been sleeping better than anyone. People are looking at ${pr(x, 'him', 'her')}.`, art: { p: x.sprite }, choices: ['Say nothing', `Call ${pr(x, 'him', 'her')} out`] }; };
  EV.theft.pick = (S, p, i) => {
    const x = S.people.find(o => o.id === p.id); S.res.food = Math.max(0, S.res.food - 6); if (!x || !x.alive) return;
    S.blamed = S.blamed || []; S.blamed.push(x.id);
    if (i === 0) { E.home(S).forEach(o => E.addStress(S, o, 1)); S.order = Math.max(0, (S.order ?? 55) - (p.again ? 6 : 2)); S.thief = p.guilty && !p.again ? x.id : null; return; }
    S.thief = null;
    if (p.guilty) {
      S.res.food += 3; E.addStress(S, x, 3); E.home(S).forEach(o => { if (o.id !== x.id) o.stress = Math.max(0, o.stress - 1); });
      if (E.d10() <= 3) { E.depart(S, x, 'Caught stealing food. Could not stand being looked at.'); return E.say(S, 'Caught', `${x.name} had the cans in ${pr(x, 'his', 'her')} pillowcase. Half were already empty. ${pr(x, 'He', 'She')} said nothing at all, and in the morning ${pr(x, 'his', 'her')} bunk was stripped and the hatch was unbolted.`, { p: x.sprite }); }
      return E.say(S, 'Caught', `${x.name} had the cans in ${pr(x, 'his', 'her')} pillowcase. Three were still full. "I was hungry," ${pr(x, 'he', 'she')} said, which is true of everyone.`, { p: x.sprite });
    }
    E.addStress(S, x, 4); S.order = Math.max(0, (S.order ?? 55) - 4);
    E.say(S, 'It was not them', E.d10() <= 5 ? `Two days later the cans turned up in a rat nest behind the boiler, chewed open. ${x.name} heard everyone's apology and said "sure." ${pr(x, 'He', 'She')} eats alone now.` : `It was not ${x.name}. Nobody found out who it was. ${x.name} has stopped speaking to the people who looked hardest.`, { p: x.sprite });
  };

  // ===== 4. A full larder draws the dark
  E.lure = S => { const c = E.storeCaps(S), f = S.res.food / c.food, w = S.res.water / c.water; return globalThis.NOLURE ? 0 : Math.max(0, Math.min(1, ((f + w) / 2 - .55) / .4)); }; // how full the stores look from outside
  const larder = S => {
    const c = E.storeCaps(S), cold = S.rooms.some(r => r.type === 'cold' && !r.broken);
    const keep = c.food * (cold ? .8 : .65), over = S.res.food - keep; // the back of a full storeroom rots, slower with a Cold Store
    if (over > 4) { const lost = Math.max(1, Math.round(over * (cold ? .03 : .06))); S.res.food -= lost; S.rotTot = (S.rotTot || 0) + lost; if (S.rotTot >= 12) { E.log(S, `Rot got into the back of the stores. ${S.rotTot} days of food went up the ladder in buckets.`, 'bad'); S.rotTot = 0; } }
    const wo = S.res.water - c.water * .8; if (wo > 6) S.res.water -= Math.max(1, Math.round(wo * .03));
    if (E.lure(S) > .45 && !S.lureWarned && S.day > 25) { S.lureWarned = S.day; S.queue.push({ k: 'note', p: { title: 'On the radio: Q.U.E.S.T.', text: '"You have done well. You have more than anyone within forty miles, and I am not the only one who can count. Things out there have noses. People out there have children. Both can smell a full storeroom through a steel hatch."', art: { q: 1 } } }); }
  };
  EV.scent = {
    chance: 4, when: S => S.day > 20 && E.lure(S) > .3,
    make: S => ({ v: Math.floor(Math.random() * 4), n: 4 + Math.round(E.lure(S) * 8) }),
    view: (S, p) => ({ title: 'They can smell it', text: [
      'Something circled the hatch all night, sniffing at the vent where the kitchen air goes out. In the morning there were long, thin handprints all the way round.',
      'Every rat for a mile has found the storeroom wall. You can hear them in the concrete, working, patient.',
      'A crowd stood in the rain across the road at dawn, not doing anything. Just looking at your vent. Some of them were children.',
      'A note pushed under the hatch seal in a careful hand: "We know you have plenty. We have a baby. We will not ask twice."',
    ][p.v], art: {}, choices: [`Bury the scraps and burn the waste (-${p.n} food)`, 'Let them smell it'] }),
    pick: (S, p, i) => { if (i === 0) { S.res.food = Math.max(0, S.res.food - p.n); S.noise = Math.max(0, (S.noise || 0) - .2); } else S.noise = (S.noise || 0) + .25 + E.lure(S) * .3; },
  };
  const tm = EV.toll.make; EV.toll.make = (S, E2) => { const r = tm(S, E2); r.ask = Math.round(r.ask * (1 + E.lure(S) * 1.5)); return r; };

  // ===== 5. Callbacks, so the people who join are people
  function bioDay(S) {
    E.humans(S).forEach(p => {
      if (p.bio == null || p.cbDone || !p.cbDay || S.day < p.cbDay || p.away || p.sealed || S.queue.length > 3) return;
      p.cbDone = 1; S.queue.push({ k: 'note', p: { title: p.name, text: BIOS[p.bio].c(p), art: { p: p.sprite } } });
      E.home(S).forEach(o => { if (o !== p && !o.damned) o.stress = Math.max(0, o.stress - (Math.random() < .3 ? 1 : 0)); });
    });
  }

  // ===== 6. Perks: one screen a week, with each person's own pick already made
  E.perkLater = (S, p) => { S.perkQ = S.perkQ || []; if (!S.perkQ.includes(p.id)) S.perkQ.push(p.id); };
  function perkWeek(S) {
    if (!S.perkQ || !S.perkQ.length || S.day % 7) return;
    const ids = S.perkQ.filter(id => { const x = S.people.find(o => o.id === id); return x && x.alive; }); S.perkQ = [];
    const picks = ids.map(id => { const x = S.people.find(o => o.id === id), o = E.perkOptions(S, x); return { id, opts: o, k: o[0] }; }).filter(r => r.k);
    if (picks.length) S.queue.push({ k: 'lessons', p: { picks } });
  }
  EV.lessons = {
    view: (S, p) => ({ title: 'What they learned this week', text: p.picks.map(r => { const x = S.people.find(o => o.id === r.id); return `${x ? x.name : 'Someone'} (Level ${x ? x.level : '?'}): ${r.k}. ${E.perkDesc(r.k)}`; }).join('\n'), art: {}, choices: ['Good', 'Let me choose for each of them'] }),
    pick: (S, p, i) => {
      if (i === 0) { p.picks.forEach(r => { const x = S.people.find(o => o.id === r.id); if (x && x.alive && r.k && !x.perks.includes(r.k)) x.perks.push(r.k); }); return; }
      p.picks.slice().reverse().forEach(r => S.queue.unshift({ k: 'perk', p: { id: r.id, opts: r.opts } }));
    },
  };

  const t1 = E.truthDay; E.truthDay = S => { t1(S); larder(S); bioDay(S); perkWeek(S); };

  // ===== 7. Run reports and quest finds, written as what happened
  const PLACE = /\b(unit|room|stockroom|storage|office|garage|kitchen|tent|shed|closet|basement|aisle|counter|desk|cabinet|locker|truck|car|van|attic|bay|pantry|cellar|lot|yard|loft|booth|bathroom|lobby|lab|ward|cooler|freezer|station|apartment|house|backroom)\b/i;
  const JUNK = /rotten|nothing|empty|spoiled|full of the dead|picked clean|stripped|already taken|gone\b|burned out|firebombed|collapsed|flooded/i;
  E.tidyFind = t => {
    t = String(t).replace(/<\/?b>/g, '').trim().replace(/\.$/, '');
    const m = t.match(/^([^:]{3,40}):\s*(.+)$/);
    if (m) { const [, l, r] = m; if (/^[\d\s.,]+(gal|lbs?|oz|days?|rounds?|cans?)?$/i.test(r)) t = l; else if (PLACE.test(l)) t = `${r.replace(/\.$/, '')} from the ${l.replace(/'s\b/, "'s").toLowerCase()}`; else t = `${l}, ${r}`; }
    return t.replace(/\b1 (\w+?)s\b/g, 'a $1').replace(/\s{2,}/g, ' ');
  };
  E.junkFind = t => JUNK.test(String(t));
  E.runProse = (S, r) => {
    const out = [`${list(r.team)} went to ${r.place} on ${r.street}. It was ${String(r.status).toLowerCase()}.`];
    const good = r.finds.filter(f => !f.none && !f.danger && !(E.junkFind(f.t) && !f.gear)).map(f => low(E.tidyFind(f.t))).filter((t, i, a) => t && a.indexOf(t) === i);
    const empty = r.finds.filter(f => (f.none || (E.junkFind(f.t) && !f.gear)) && !f.danger).map(f => String(f.t)), bad = r.finds.filter(f => f.danger).map(f => low(String(f.t).replace(/\.$/, '')));
    (r.notes || []).forEach(n => out.push(n));
    if (empty.length && !good.length) out.push(`${dot(empty[0])} They searched until the light went and found nothing worth the walk.`);
    else if (empty.length) out.push(`Most of it was gone. ${dot(empty[0])}`);
    if (bad.length) out.push(`They found ${bad[0]}, and did not stay to find out more.`);
    if (good.length) out.push(`They came home with ${list(good.slice(0, 5))}${good.length > 5 ? `, and ${good.length - 5 > 1 ? `${good.length - 5} smaller things` : 'one more thing'}` : ''}.`);
    if (r.dead && r.dead.length) out.push(`${list(r.dead)} did not come back.`);
    if (r.left && r.left.length) out.push(`They had to leave ${r.left.length > 1 ? `${r.left.length} loads` : 'one load'} behind.`);
    return out.join(' ');
  };
  const rv = EV.runreport.view; EV.runreport.view = (S, r) => { const v = rv(S, r); v.text = r.story || E.runProse(S, r); return v; };
})();
