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
      const c = h.filter(o => o !== L && S.day - (o.stayDay ?? -99) >= 25).sort((a, b) => (psy(a).a + psy(a).c - a.hunger) - (psy(b).a + psy(b).c - b.hunger))[0];
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
      if (r.succ >= 1 || r.crit) { x.stress = Math.max(0, x.stress - 2); x.stayDay = S.day; fr.forEach(o => o.stayDay = S.day); E.say(S, 'Stay', `${talker.name} sat with ${x.name} by the hatch until the bag was unpacked again. "We starve together or we don't starve at all." It is not much of a promise. It was enough, for now.`, { p: x.sprite }); return; }
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
  const ep0 = E.epitaph; E.epitaph = (S, p) => { const b = bioOf(p); return b && p.introDone && (p.cbDone || Math.random() < .6) ? b.e : ep0 ? ep0(S, p) : ''; };
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
  E.lure = S => { const c = E.storeCaps(S), f = S.res.food / c.food, w = S.res.water / c.water, r = S.res.rounds / c.rounds; return globalThis.NOLURE ? 0 : Math.max(0, Math.min(1, ((f + w + r * .5) / 2.5 - .55) / .4)); }; // how full the stores look from outside
  const larder = S => {
    const c = E.storeCaps(S), cold = S.rooms.some(r => r.type === 'cold' && !r.broken);
    const keep = c.food * (cold ? .8 : .65), over = S.res.food - keep; // the back of a full storeroom rots, slower with a Cold Store
    if (over > 4) { const lost = Math.max(1, Math.round(over * (cold ? .05 : .1))); S.res.food -= lost; S.rotTot = (S.rotTot || 0) + lost; if (S.rotTot >= 12) { E.log(S, `Rot got into the back of the full storeroom. ${S.rotTot} food went up the ladder in buckets. Food past ${Math.round(keep)} spoils fast${cold ? '' : ' without a Cold Room'}.`, 'bad'); S.rotTot = 0; } }
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
      if (p.bio == null || !p.introDone || p.cbDone || !p.cbDay || S.day < p.cbDay || p.away || p.sealed || S.queue.length > 3) return;
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
    m4: { t: 'med', c: 60, n: 'Neural Mapping', d: 'There is no cure. But the Damned show how the rain rewrites a mind, and how Q.U.E.S.T. could copy one. At the 11th Hour you can go with her into the simulations even if she does not fully trust you, and the crossing is safer.', end: 1 },
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
  // finished quests teach something too
  const oQend = E.Q && E.Q.back; if (oQend) E.Q.back = S => { const n0 = (S.stat && S.stat.quests) || 0; const r = oQend(S); if (((S.stat && S.stat.quests) || 0) > n0) { tech(S).rp += 4; tech(S).earned += 4; } return r; };

  // ---- the endings research opens
  Object.assign(E.END, {
    council: { t: 'The Council', s: 'good', x: S => `The Council voted to open the hatch after the sky stopped falling, and you built a town on top of the shelter: walls, gardens, a school, a gallows. It is still running. Every spring the Council votes on who eats, and every spring the vote is very close.` },
    cult: { t: 'The Congregation', s: 'worst', x: S => `When the sky came down the whole shelter was singing. Nobody was afraid. Nobody had been afraid for months. The hatch stood open all night, and one by one, smiling, holding hands, ${E.humans(S).length ? 'they' : 'you'} walked up into the fire to meet it.` },
  });
  if (EV && EV.q_end) {
    const oV = EV.q_end.view, oP = EV.q_end.pick;
    EV.q_end.view = (S, p) => { const v = oV(S, p), extra = [];
      if (E.techOn(S, 'm4') && !(S.qend || []).includes('sim')) extra.push(['Go with her into the simulations', 'sim']);
      if (E.techOn(S, 'c4')) extra.push(['Let the Council decide: open the hatch and rebuild', 'council']);
      if (E.techOn(S, 'c5')) extra.push(['Gather the Congregation and open the hatch', 'cult']);
      if (E.techOn(S, 't4') && !(S.qend || []).includes('ships')) extra.push(['Answer the other signal in the sky', 'ships']);
      extra.forEach(([l, k]) => { const at = Math.max(0, v.choices.length - 1); v.choices.splice(at, 0, l); S.qend.splice(at, 0, k); });
      return v; };
    EV.q_end.pick = (S, p, i) => { const c = (S.qend || [])[i];
      if (c === 'sim' && E.techOn(S, 'm4')) { const a = S.qarc || { trust: 0 }; if (a.trust <= -3) return oP(S, p, i); E.home(S).forEach(o => E.addStress(S, o, 2)); const r = E.d10() + Math.min(3, Math.max(0, a.trust)) + 2; return E.finish(S, r >= 10 ? 'aos' : r >= 6 ? 'scatter' : r >= 3 ? 'loop' : 'hallway'); } // Neural Mapping: a safer crossing
      if (c === 'council') return E.finish(S, 'council');
      if (c === 'cult') return E.finish(S, 'cult');
      return oP(S, p, i); };
  }
  if (E.END_HINT) Object.assign(E.END_HINT, { council: 'Form The Council.', cult: 'Join The Congregation.' });
})();

// ===== Critic fixes 2026-11-16: cards know who is alive and who just died
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, pick = a => a[Math.floor(Math.random() * a.length)];
  E.deadSince = (S, d) => (S.memorial || []).filter(m => !m.dog && !m.left && m.day >= S.day - d);
  E.headN = S => E.humans(S).filter(o => !o.away).length;
  const ok0 = E.evOk; E.evOk = (S, k) => {
    const h = E.headN(S), grief = E.deadSince(S, 4).length;
    if (['goodnight', 'birthday', 'streak'].includes(k) && grief) return false;
    if (k === 'goodnight' && h < 5) return false;
    if (k === 'birthday' && h < 3) return false;
    if (['theft', 'hoarder', 'cult', 'strike'].includes(k) && h < 4) return false;
    return ok0 ? ok0(S, k) : true;
  };
  // a good night queued before a death turns into a wake
  const gn0 = EV.goodnight.view; EV.goodnight.view = (S, p, x) => {
    const dead = E.deadSince(S, 2), h = E.headN(S);
    if (dead.length) return { title: 'A wake', text: `Nobody played anything tonight. Someone set out ${dead.length > 1 ? `${dead.length} cups` : 'a cup'} at the table for ${dead.map(m => m.name.split(' ')[0]).join(' and ')}, and nobody touched ${dead.length > 1 ? 'them' : 'it'}.`, art: {}, choices: ['Sit with them'] };
    if (h < 5) return { title: 'A quiet night', text: h <= 1 ? 'You talk to the generator for a while. It is the only thing that answers.' : `The ${h === 2 ? 'two' : h === 3 ? 'three' : 'four'} of you eat together at one end of a table built for twenty. Somebody laughs at something small, and it carries.`, art: {}, choices: ['Good'] };
    return gn0(S, p, x);
  };
  // the weekly table: no "nobody died" in a week with graves, and a nearly empty shelter reads like one
  const wk0 = EV.weekly.view; EV.weekly.view = (S, p, x) => {
    const v = wk0(S, p, x), dead = E.deadSince(S, 7), h = E.headN(S);
    if (dead.length && p.r >= 4) { v.title = dead.length > 2 ? 'A week of graves' : 'A hard week'; v.text = `${dead.map(m => m.name.split(' ')[0]).join(', ').replace(/, ([^,]*)$/, ' and $1')} ${dead.length > 1 ? 'are' : 'is'} gone. The chores still got done, because somebody has to do them. ${p.r >= 9 ? 'The stores came out ahead. Nobody felt like saying so.' : 'Nobody counted the days this week.'}`; }
    else if (h <= 2 && p.r >= 4) { v.title = 'A long week'; v.text = h <= 1 ? 'Seven days alone. You started saying good morning to the empty bunks.' : 'Seven days, two people, a lot of rooms with the lights off.'; }
    return v;
  };
  // a guaranteed Q.U.E.S.T. scene when the shelter collapses, with something useful in it
  const cEnd = E.endDay; E.endDay = S => {
    const r = cEnd(S), h = E.humans(S).length;
    S.peakN = Math.max(S.peakN || 0, h);
    if (!S.qCollapse && S.peakN >= 6 && h <= Math.floor(S.peakN * .6) && h > 0 && !S.over) {
      S.qCollapse = S.day;
      const need = E.needs(S), why = E.powerReason && E.powerReason(S);
      const tip = S.res.water < need.water * 2 ? 'Water first. A person lasts three days without it, and you do not have three days. Put your best engineer on the Rain Filter and keep the power on it.' : S.res.food < need.food * 2 ? 'Food first. Send a run to the nearest grocery or farm, even with tired people. Hungry hands drop things.' : why ? `The lights. ${why.t}` : 'Close the Gate tonight and let nobody in. Grieve tomorrow. Tonight you only have to still be here in the morning.';
      S.queue.push({ k: 'note', p: { title: 'On the radio: Q.U.E.S.T.', text: `"I have been counting too. You were ${S.peakN}. You are ${h}." A long pause, and for once the voice sounds tired. "I am not going to tell you it will be all right. I am going to tell you what to do first. ${tip}"\n\n"I will still be here. I am always still here."`, art: { q: 1 } } });
    }
    return r;
  };
})();

// ===== The girl in the yellow raincoat, from the opening (Buddy 2026-11-17): a rare, very dangerous random knock.
// Let her in and 3 times in 4 she leaves before dawn with one of you, to feed on. Keep the hatch shut and she waits.
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS;
  E.GIRL_ON = true;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  EV.raincoat = {
    // Buddy 2026-11-17: no hatch knock any more (nobody would let her in); she only attacks people out on runs and trips
    view: (S, p) => {
      S.girlLast = S.day;
      const gate = S.rooms.find(r => r.type === 'gate'), g = gate && E.workers(S, gate).slice().sort((a, b) => E.pool(b, 'analysis') - E.pool(a, 'analysis'))[0];
      if (p.seen == null) p.seen = g ? E.rollSkill(g, 'analysis', 7).succ >= 1 : false;
      const back = (S.girlN || 0) > 0;
      return { title: 'A girl in a yellow raincoat', text: `${back ? 'Small, polite knocking again, just after dark. The yellow raincoat. She is back.' : 'Knocking, small and polite, just after dark. Through the porthole: a girl, maybe ten, in a yellow raincoat, hood up.'}\n\n"Please let me in. I'm so cold. I won't take up any room. You don't even have to feed me."${p.seen ? `\n\n${g.name}: "Look at her coat. It's been raining black for weeks, and it's clean. It's dry."` : ''}`, art: {}, choices: ['Open the hatch', 'Keep it shut'] };
    },
    pick: (S, p, i) => {
      S.girlN = (S.girlN || 0) + 1;
      const home = E.humans(S).filter(o => !o.away && !o.sealed), gate = S.rooms.find(r => r.type === 'gate'), guards = gate ? E.workers(S, gate) : [];
      const opened = i === 0 || !guards.length; // nobody on the Gate: she finds her own way in
      if (!opened) { home.forEach(o => E.addStress(S, o, 1)); return E.say(S, 'Through the porthole', `She stood there until morning, not shivering anymore. Before she left she put her face right up to the glass.\n\n"You'll get hungry," she said. "You always do."\n\nThere were small bare footprints all the way round the hatch, and none leading away.`); }
      const pool = home.slice().sort((a, b) => a.hp - b.hp), v = pool[0];
      home.forEach(o => E.addStress(S, o, 2));
      const how = i === 0 ? 'Somebody gave her a blanket and a place by the generator.' : 'Nobody was on the Gate. In the morning the hatch was open a hand\'s width, and nobody had opened it.';
      if (v && Math.random() < .75) {
        E.kill(S, v, 'Taken in the night by the girl in the yellow raincoat');
        return E.say(S, 'The yellow raincoat', `${how} In the night somebody heard ${v.name} say "it's okay, it's only her", very calmly, the way you talk to a child.\n\nIn the morning ${v.name}'s bunk was empty and the hatch was open. There were two sets of tracks in the mud outside. Only the small ones came back to the hatch, once, and stood there a while.\n\nThe raincoat was found on the ladder, folded neatly, dry.`);
      }
      if (v) { v.hp = Math.max(1, v.hp - 6); E.expose && E.expose(S, v, 1, 6, 'the girl'); }
      E.say(S, 'The yellow raincoat', `${how} In the night ${v ? v.name : 'someone'} woke up screaming, with her teeth in ${v ? (v.he === 'he' ? 'his' : 'her') : 'their'} arm, and her mouth was so much bigger than a little girl's mouth. Everyone was awake in seconds, and she was gone before the lights came on.\n\n${v ? v.name : 'They'} will live. The bite is black at the edges.`);
    },
  };
})();

// ===== Someone at the hatch: the arrival interview (Buddy 2026-11-16, "robust and fun because it will be done often").
// Step 1 at the porthole: ask up to two of four questions. Step 2 at the checkpoint: the medic's look and their bag. Then you decide.
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const GP = () => (globalThis.GEN && globalThis.GEN.people) || {};
  const CLS_SAY = {
    survivor: ['I kept myself alive this long. That has to count for something.', 'A bit of everything. Fixing, carrying, keeping quiet.'],
    medic: ['I was a nurse. Night shifts, mostly. I can stitch, set a bone, and keep my hands steady.', 'Paramedic. Eleven years. I have seen worse than anything you have down there.'],
    bruiser: ['I lift things and I hit things. Mostly in that order.', 'I was a bouncer. I can hold a door shut longer than anybody you know.'],
    sharpshooter: ['I hunted, before. Deer, mostly. I don\'t miss much.', 'Army. Two tours. Give me a rifle and a high place.'],
    scavenger: ['I find things. Locked places, back rooms. I know where people hid stuff.', 'Eight months on the road alone. I know every gas station for forty miles.'],
    shepherd: ['I kept animals. Goats, chickens. They kept me sane.', 'Farmer\'s kid. I can grow things in a bucket of mud if I have to.'],
  };
  const FROM = ['A shelter under the high school. The pumps failed and the water came in.', 'The highway. We had a car until we didn\'t.', 'An apartment on the ninth floor. I watched the street for a month before I came down.', 'A church basement. There were twelve of us. Now there\'s me.', 'The hospital, before it went bad. I left the night the lights went out.', 'Nowhere. I keep walking. I heard the hum of your generator from the road.'];
  const OUT = [['raid', 'Raiders on the north road, two days behind me. They saw me come this way. I\'m sorry.'], ['site', 'There\'s a pharmacy nobody\'s touched. The shutter\'s welded, but the back wall is soft.'], ['none', 'Nobody. I haven\'t seen a living face in nineteen days. You\'re the first.'], ['none', 'A dog\'s been following me for a week. Skinny thing. Gone now, I think.'], ['none', 'Folks at a place called Hollow Creek. They turned me away. Said they were full.']];
  const BAG = [['food', 'a sack with', 'cans of food'], ['water', 'a jug with', 'water'], ['meds', 'a first aid tin with', 'Med supplies'], ['rounds', 'a box of', 'rounds'], ['scrap', 'a tool roll worth', 'scrap']];
  const she = x => GP()[x.sprite] === 'she';
  const he = x => (she(x) ? 'she' : 'he'), He = x => (she(x) ? 'She' : 'He'), his = x => (she(x) ? 'her' : 'his'), him = x => (she(x) ? 'her' : 'him');

  const setup = (S, p) => {
    if (p.who) return p.who;
    const used = new Set(S.people.filter(o => o.alive).map(o => o.sprite)), all = Object.keys(GP()), free = all.filter(n => !used.has(n));
    const sprite = pick(free.length ? free : all), cls = pick(['survivor', 'survivor', 'medic', 'bruiser', 'sharpshooter', 'scavenger', 'shepherd']);
    const lie = Math.random() < .2 ? pick(['medic', 'sharpshooter', 'bruiser'].filter(c => c !== cls)) : null;
    const bag = []; const n = 1 + (Math.random() < .45 ? 1 : 0);
    while (bag.length < n) { const b = pick(BAG); if (!bag.some(y => y[0] === b[0])) bag.push(b); }
    p.who = { sprite, name: sprite[0].toUpperCase() + sprite.slice(1), cls, lie, from: pick(FROM), out: pick(OUT), bag: bag.map(b => [b[0], b[1], b[2], b[0] === 'rounds' ? 10 + E.d10() * 3 : b[0] === 'scrap' ? 4 + E.d10() : 2 + Math.ceil(E.d10() / 2)]), gun: Math.random() < .25, photo: Math.random() < .5 };
    p.asked = []; p.ans = {}; p.step = 0;
    return p.who;
  };
  const checks = (S, p) => {
    const gate = S.rooms.find(r => r.type === 'gate'), g = gate ? E.workers(S, gate) : [], w = g.slice().sort((a, b) => E.pool(b, 'analysis') - E.pool(a, 'analysis'))[0];
    const cp = S.rooms.filter(r => r.type === 'checkpoint').flatMap(r => E.workers(S, r)).concat(S.hall ? g.filter(x => x !== w) : []), clinic = S.rooms.find(r => r.type === 'clinic'), cl = clinic ? E.workers(S, clinic) : [];
    const m = cp[0] || cl[0] || g.find(x => x !== w) || null;
    if (p.look === undefined) {
      const dog = E.dogs && E.dogs(S).some(d => d.alive && d.role === 'find' && !d.pup);
      p.look = dog ? 9 : w ? E.rollSkill(w, 'analysis', 6).succ : -1; p.dog = dog;
      p.med = E.techOn && E.techOn(S, 'm3') && m ? 9 : m ? E.rollSkill(m, 'medicine', 6).succ + (cp[0] ? 1 : 0) : -1;
    }
    return { w, m, cp: !!cp[0] };
  };
  const tell = (p, w, t) => (p.look >= 1 && (w || p.dog) ? `\n${p.dog ? 'The dog growls. ' : `${w.name}: `}${t}` : '');
  const ANS = {
    where: { q: '"Where did you come from?"', a: (S, p, x, w) => p.mimic ? `"From where you came from." A pause that goes on too long. "From the road. The road."${tell(p, w, '"It repeated me. It\'s trying out words."')}` : `"${x.from}"${tell(p, w, '"That checks out. The mud on the boots matches."')}` },
    bitten: { q: '"Anyone bitten? Show me your arms."', a: (S, p, x, w) => p.mimic ? `${He(x)} rolls up both sleeves at once, smooth as a machine. Clean skin. Too clean. Not a scratch, not a bruise, not a hair.${tell(p, w, '"Nobody out there has skin like that."')}` : p.hiddenDmd ? `"No. No, just a scratch from a fence." ${He(x)} rolls up one sleeve and keeps the other arm behind ${his(x)} back.${tell(p, w, '"The other arm. Make them show the other arm."')}` : `${He(x)} rolls up both sleeves without being asked twice. Bruises, old scabs, no bites.${tell(p, w, '"Looks honest."')}` },
    skill: { q: '"What can you do?"', a: (S, p, x, w) => `"${pick(CLS_SAY[x.lie || x.cls] || CLS_SAY.survivor)}"${x.lie ? tell(p, w, '"Watch their hands when they say it. That\'s a rehearsed line."') : p.mimic ? tell(p, w, '"It answered before you finished asking."') : ''}` },
    who: { q: '"Who else is out there?"', a: (S, p, x, w) => p.mimic ? `"Just me. Just me." It smiles. "Just me."${tell(p, w, '"Same tone all three times. Like a recording."')}` : `"${x.out[1]}"` },
  };
  const bagText = x => x.bag.map(b => `${b[1]} ${b[3]} ${b[2]}`).concat(x.gun ? ['a pistol with the serial filed off'] : []).concat(x.photo ? ['a creased photo of people who are not here'] : []).join(', ');
  const cellFree = S => { const q = S.rooms.find(r => r.type === 'quarantine'); return !!q && E.sealed(S).length < q.tier + E.W(q); };

  EV.gatecomer.view = (S, p) => {
    const x = setup(S, p), { w, m, cp } = checks(S, p), room = E.roomFor(S);
    const knock = p.knock || (p.knock = pick([`Three slow knocks. Through the porthole: ${x.name}, soaked to the bone, hands up and empty.`, `Someone is scratching at the hatch with a coin. ${x.name}, hood down so you can see ${his(x)} face, breath fogging the glass.`, `A fist on the hatch, then a voice: "Please. I can work." ${x.name}, shivering, with a pack on ${his(x)} back.`, `${x.name} is sitting on the hatch like ${he(x)} is waiting for a bus. ${He(x)} stands up when the porthole slides open.`]));
    const log = p.asked.map(k => `${ANS[k].q}\n${p.ans[k]}`).join('\n\n');
    if (p.step === 0) {
      const left = Object.keys(ANS).filter(k => !p.asked.includes(k));
      const head = p.asked.length ? knock : `${knock}\n\n${w ? `${w.name} is on the porthole.` : 'Nobody is on the Gate to read them, so you will have to judge for yourself.'} You have time for two questions before the rain gets to whoever is standing out there.`;
      return { title: 'Someone at the hatch', text: `${head}${log ? `\n\n${log}` : ''}`, art: { p: x.sprite }, choices: left.map(k => `Ask: ${ANS[k].q}`).concat(['Enough talk. Bring them to the checkpoint']) };
    }
    const med = !m ? 'Nobody is free to check them over.' : p.med >= 1 ? (p.mimic ? `${m.name} presses two fingers to ${his(x)} neck and goes pale. "There's no pulse. There's no pulse and it's talking."` : p.hiddenDmd ? `${m.name} checks eyes and gums${cp ? ' under the Checkpoint lamp' : ''}: the black is already in ${him(x)}. Not far along, but it's there.` : `${m.name} checks eyes, gums and both arms${cp ? ' under the Checkpoint lamp' : ''}: clean. No rain in ${him(x)}.`) : `${m.name} checks ${him(x)} over and finds nothing, but it was a rushed look in bad light.`;
    p.opts = [];
    if (room) p.opts.push(['in', 'Let them in. They keep their things'], ['share', 'Let them in, but the bag goes to the stores']);
    if (cellFree(S)) p.opts.push(['iso', 'Quarantine first, decide later']);
    if (room) p.opts.push(['watch', 'Let them in, and someone sleeps with a gun on them']);
    p.opts.push(['away', 'Turn them away']);
    return { title: `${x.name} at the checkpoint`, text: `${log ? `${log}\n\n` : `${knock}\n\n`}Medicine: ${med}\nThe bag: ${bagText(x)}.${room ? '' : '\n\nThere is no bed for them. Only Quarantine or the road.'}`, art: { p: x.sprite }, choices: p.opts.map(o => o[1]) };
  };

  EV.gatecomer.pick = (S, p, i) => {
    const x = setup(S, p), { w } = checks(S, p);
    if (p.step === 0) {
      const left = Object.keys(ANS).filter(k => !p.asked.includes(k));
      if (i < left.length) { const k = left[i]; p.ans[k] = ANS[k].a(S, p, x, w); p.asked.push(k); if (k === 'who' && !p.mimic) p.outDone = x.out[0]; }
      if (i >= left.length || p.asked.length >= 2) p.step = 1;
      S.queue.unshift({ k: 'gatecomer', p });
      return;
    }
    if (!p.opts) EV.gatecomer.view(S, p);
    const o = (p.opts[i] || ['away'])[0];
    // what they told you about the road matters whatever you decide
    if (p.outDone === 'raid') { S.noise = (S.noise || 0) + .35; E.log(S, `${x.name} warned you about raiders on the north road. Keep the Gate manned.`, 'bad'); }
    if (p.outDone === 'site') { S.res.meds += 1; E.log(S, `${x.name} told you how to get into an untouched pharmacy. Somebody went and came back with Med supplies.`); }
    if (o === 'away') {
      if (!p.mimic) E.humans(S).forEach(h => { if (E.psy && E.psy(h).a >= 7) E.addStress(S, h, 1); });
      return E.say(S, 'The porthole closes', p.mimic ? 'It stood in the rain and watched the porthole until dawn, not blinking. In the morning it was gone, and so were the birds.' : pick([`${x.name} stood there a long time. Then ${he(x)} nodded, like ${he(x)} had expected it, and walked back into the rain.`, `"Okay," ${x.name} said. Just that. Nobody slept well.`, `${x.name} left something on the hatch before going: ${x.photo ? 'the photo, face up, in the rain' : 'a can of food, for the next person you turn away'}.`]), { p: x.sprite });
    }
    if (p.mimic) {
      const gate = S.rooms.find(r => r.type === 'gate'), g = gate ? E.workers(S, gate) : [];
      if (o === 'iso') return E.say(S, 'The cell', `It tore at the Quarantine door all night, in ${x.name}'s voice, then in yours. ${g[0] ? g[0].name : 'Somebody'} put it down through the slot at dawn. Nobody else got hurt.`);
      const m = E.named('Mimic Survivor', Math.max(4, Math.ceil(S.day / 14))) || E.named('Infected Human', 2);
      if (!m) return E.say(S, 'Gone', 'By morning the stranger was gone. The blanket you gave them was cold, and wet, and full of something like hair.');
      const home = E.home(S).filter(h => !h.sealed && !h.damned);
      const team = o === 'watch' ? g.concat(home.filter(h => !g.includes(h)).slice(0, 2)) : (g.length ? g : home.slice(0, 3));
      if (o === 'watch' && m.hp) m.hp = Math.ceil(m.hp * .6);
      const f = E.fight(S, team, [m], { where: 'the hatch', inside: true });
      return E.say(S, 'It was never a person', o === 'watch' ? 'It went for the throat at three in the morning, and found a gun already pointed at it.' : 'It wore a person the way you wear a coat.', { m: 'mimic-survivor', fight: f });
    }
    const np = E.addSurvivor(S, { sprite: x.sprite, cls: x.cls, dmd: p.hiddenDmd || undefined }); if (!np) return;
    np.name = x.name; if (p.hiddenDmd) np.dmd = p.hiddenDmd; if (x.lie) np.claimed = x.lie;
    const L = E.leader && E.leader(S), rel = (a, b, v) => { if (a && b && a !== b && E.addRel) E.addRel(S, a, b, v); };
    if (o === 'in') { np.stress = 0; rel(np, L, 15); x.bag.forEach(b => { S.res[b[0]] = (S.res[b[0]] || 0) + Math.floor(b[3] / 2); }); }
    if (o === 'share') { x.bag.forEach(b => { S.res[b[0]] = (S.res[b[0]] || 0) + b[3]; }); np.stress = (np.stress || 0) + 2; rel(np, L, -15); }
    if (o === 'watch') { np.stress = (np.stress || 0) + 1; rel(np, L, -5); }
    if ((o === 'in' || o === 'watch') && x.gun) S.res.rounds += 6;
    if (o === 'iso') E.seal(S, np);
    const after = { in: ` ${He(x)} put half of what was in the bag on the table anyway, and said thank you twice.`, share: ` ${He(x)} watched the bag get emptied into your stores and said nothing at all.`, iso: ` ${He(x)} sits in the Quarantine cell with ${his(x)} knees up, waiting to see if you will open it.`, watch: ` ${He(x)} noticed the gun. ${He(x)} sleeps facing it.` }[o] || '';
    const lieT = x.lie ? `\n\n${x.name} said ${he(x)} could do more than ${he(x)} can. You will find out the first time it matters.` : '';
    E.say(S, `${x.name} ${np.last} joins you`, `${E.classNameOf(np)}. Level ${np.level}.${after}${lieT}`, { p: np.sprite });
  };
})();

// ===== Entry Hall and ladders you build (Buddy 2026-11-17). New games only (S.hall); old saves keep their layout.
// Row 0: one room left, the Entry Hall in the middle over the shaft (it is the Gate, and its second worker runs the checkpoint), one room right.
// Below that a floor is only reached by a ladder: the center ladder down the shaft, or a side ladder down the left or right edge.
(() => {
  const E = globalThis.ShelterEngine;
  const W = r => r.w || 1;
  const ng0 = E.newGame; E.newGame = (d) => {
    const S = ng0(d); if (!S.mid) return S;
    S.hall = true; S.lad = { c: 2, l: -1, r: -1 }; // deepest row each ladder reaches; -1 = not built
    const gate = S.rooms.find(r => r.type === 'gate'); if (gate) { gate.row = 0; gate.col = 1; gate.w = 2; }
    E.relayout && E.relayout(S);
    return S;
  };
  E.maxRow = S => Math.max(...S.slots.map(s => s.row));
  E.ladderOk = (S, p) => {
    if (!S.hall) return false; const L = S.lad || (S.lad = { c: 0, l: -1, r: -1 }), d = L[p] ?? -1;
    if (d >= E.maxRow(S)) return false;
    if (p === 'l' && d < 0 && !E.roomAt(S, 0, 0)) return false; // a side ladder starts in the room beside the Entry Hall
    if (p === 'r' && d < 0 && !E.roomAt(S, 0, 3)) return false;
    return true;
  };
  E.ladderCost = (S, p) => { const d = Math.max(0, (S.lad || {})[p] ?? 0); return 10 + d * 4 + (p === 'c' ? 0 : 6); };
  E.buildLadder = (S, p) => {
    if (!E.ladderOk(S, p)) return false; const c = E.ladderCost(S, p); if (S.res.scrap < c) return false;
    S.res.scrap -= c; S.lad[p] = Math.max(1, (S.lad[p] ?? -1) + 1); if (p !== 'c' && S.lad[p] < 1) S.lad[p] = 1;
    E.log(S, `Built a ladder down to floor ${S.lad[p] + 1} on the ${({ c: 'center', l: 'left', r: 'right' })[p]}.`, 'good');
    return true;
  };
  const re0 = E.reachable; E.reachable = (S, row, col) => {
    if (!S.hall) return re0(S, row, col);
    if (row === 0) return true; // the top floor opens straight off the Entry Hall
    const L = S.lad || {}, has = (r, c) => !!E.roomAt(S, r, c);
    const left = col <= 1;
    // from the center ladder: walk outward from the shaft through built rooms
    if ((L.c ?? -1) >= row) { let ok = true; if (left) { for (let c = col + 1; c <= 1; c++) if (!has(row, c)) ok = false; } else { for (let c = 2; c < col; c++) if (!has(row, c)) ok = false; } if (ok) return true; }
    // from a side ladder: walk inward from the edge
    if (left && (L.l ?? -1) >= row) { let ok = true; for (let c = 0; c < col; c++) if (!has(row, c)) ok = false; if (ok) return true; }
    if (!left && (L.r ?? -1) >= row) { let ok = true; for (let c = col + 1; c <= 3; c++) if (!has(row, c)) ok = false; if (ok) return true; }
    return false;
  };
  // the Entry Hall never grows sideways, and nothing else may cross the shaft
  const ce0 = E.canExpand; E.canExpand = (S, r) => (S.hall && r.type === 'gate' ? false : ce0(S, r));
})();
