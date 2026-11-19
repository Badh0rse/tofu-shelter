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
  const GN = ['Somebody made a real stew, somebody found a guitar, and for an hour nobody counted anything.', 'Someone found a deck of cards. The arguments were about cards.', 'Someone put on a cassette of a ball game from twenty years ago. People cheered for a team that no longer exists.', 'Somebody started telling ghost stories, and they were so bad, so unlike anything outside, that everybody laughed until they cried.', 'Two people danced in the corridor to nobody singing. Then four. Then everyone, badly.', 'Somebody taught the shelter a clapping game from their school. You played it until the candles went out.'];
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
    if (over > 4) { const lost = Math.max(1, Math.round(over * (cold ? .05 : .1))); S.res.food -= lost; S.rotWeek = (S.rotWeek || 0) + lost; S.rotKeep = Math.round(keep); } // reported once a week (critic fix round 4)
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
  const OUT = [['raid', 'Raiders on the north road, two days behind me. They saw me come this way. I\'m sorry.'], ['site', 'There\'s a pharmacy nobody\'s touched. The shutter\'s welded, but the back wall is soft.'], ['none', 'Nobody. I haven\'t seen a living face in nineteen days. You\'re the first.'], ['none', 'A dog\'s been following me for a week. Skinny thing. Gone now, I think.'], ['none', 'Folks at a place called Hollow Creek. They turned me away. Said they were full.'], ["raid", "A truck with no lights, going slow, checking hatches. They had a list. I think your road was on it."], ["raid", "Men in hunting orange at the gas station. They asked me if I knew where people were hiding. I said no. I think they followed me anyway."], ["site", "The school on the hill. Gym is full of cots and canned food. Everyone who was in it left in a hurry."], ["site", "A delivery van on its side in the creek. Still sealed. I couldn't carry anything else."], ["site", "The vet clinic on Ash Street. Nobody thinks to loot a vet. Antibiotics are antibiotics."], ["none", "My brother. Somewhere. He went for water on the second day."], ["none", "A woman singing in the church tower every night at nine. I never went to find out who."], ["none", "Nobody. Then a kid in a yellow coat, far away. I didn't wait to see more."], ["none", "A man on a bicycle with a radio strapped to the handlebars, playing music, smiling. Going the other way."], ["none", "There were six of us when we started. Ask me about the other five tomorrow."], ["none", "Somebody is painting arrows on the walls in town. They all point here. I thought you knew."], ["none", "Soldiers, two weeks ago. Then gunfire. Then nothing."], ["none", "A family in a camper by the reservoir. They have a dog and a shotgun and they share neither."]];
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
  // critic fix round 4: the porthole reads people. The guard's Insight against the arrival's Deception, shown, and no verdict line more than 3 times a run.
  const VER = {
    ok: ['"That checks out. The mud on the boots matches."', '"Sounds right. I know that road."', '"Too slow to be rehearsed. I believe it."', '"Their hands stayed still the whole time. Honest, I think."', '"Story holds. The boots are worn through the way they should be."', '"I\'d buy it. Nobody lies that badly on purpose."', '"Fits. That coat has road dust from out that way."', '"They didn\'t try to sell it. People who lie try to sell it."', '"Same answer I\'d give. Sounds true."'],
    doubt: ['"Boots are too clean for that road."', '"They looked at the floor when they said it."', '"That came out too fast. Rehearsed."', '"Hands went to the pockets. Watch that."', '"That\'s not how you talk about a place you lived."', '"Something\'s off. I can\'t say what yet."', '"They told it twice and it changed the second time."', '"Too many details. Liars give you too many details."'],
  };
  const verdict = (S, p, w, lying) => {
    if (!(w || p.dog)) return '';
    S.verN = S.verN || {};
    if (p.dec == null) p.dec = E.roll(1 + Math.ceil(E.d10() / 2), 6).succ;
    if (!p.dog) { const bi = E.humans(S).filter(o => !o.away && !o.sealed && !o.damned).sort((a, b) => E.pool(b, 'insight') - E.pool(a, 'insight'))[0]; if (bi && (!w || E.pool(bi, 'insight') > E.pool(w, 'insight'))) w = bi; }
    const rr = p.dog ? null : E.rollSkill(w, 'insight', 6), ins = p.dog ? 3 : rr.succ, crit = !!(rr && rr.crit), seen = lying ? (crit || ins > p.dec) : ins === 0 && !crit && Math.random() < .25;
    const arr = VER[seen ? 'doubt' : 'ok'], fresh = arr.filter(t => (S.verN[t] || 0) < 3), t = pick(fresh.length ? fresh : arr); S.verN[t] = (S.verN[t] || 0) + 1;
    return `\n${p.dog ? 'The dog watches them, ears flat. ' : `${w.name}: `}${t}${p.dog ? '' : `\n(${w.name}, Insight: ${rr.dice.length} dice vs DR 6, rolled ${rr.dice.join(' ')}. ${ins} success${ins === 1 ? '' : 'es'} against their Deception ${p.dec}.${crit ? ' Cosmic Crit: nothing gets past them.' : ''})`}`;
  };
  const BIT_OK = ['rolls up both sleeves without being asked twice. Bruises, old scabs, no bites.', 'pulls off the jacket and turns round slowly, arms out. Scratches from brambles, nothing with teeth in it.', 'shows both arms, then the neck, then, without being asked, the ankles. Clean.', 'holds both arms up to the glass. A burn scar, a tattoo of a name, no bites.', 'says "Look all you want" and does not flinch while you do.', 'rolls up the sleeves. One forearm is wrapped in a dirty bandage. Under it: a cut from glass, clean edges, not a bite.'];
  const ANS = {
    where: { q: '"Where did you come from?"', a: (S, p, x, w) => p.mimic ? `"From where you came from." A pause that goes on too long. "From the road. The road."${tell(p, w, '"It repeated me. It\'s trying out words."')}` : `"${x.from}"${verdict(S, p, w, !!x.lie && Math.random() < .5)}` },
    bitten: { q: '"Anyone bitten? Show me your arms."', a: (S, p, x, w) => p.mimic ? `${He(x)} rolls up both sleeves at once, smooth as a machine. Clean skin. Too clean. Not a scratch, not a bruise, not a hair.${tell(p, w, '"Nobody out there has skin like that."')}` : p.hiddenDmd ? `"No. No, just a scratch from a fence." ${He(x)} rolls up one sleeve and keeps the other arm behind ${his(x)} back.${verdict(S, p, w, true)}` : `${He(x)} ${pick(BIT_OK)}${verdict(S, p, w, false)}` },
    skill: { q: '"What can you do?"', a: (S, p, x, w) => `"${pick(CLS_SAY[x.lie || x.cls] || CLS_SAY.survivor)}"${p.mimic ? tell(p, w, '"It answered before you finished asking."') : verdict(S, p, w, !!x.lie)}` },
    who: { q: '"Who else is out there?"', a: (S, p, x, w) => p.mimic ? `"Just me. Just me." It smiles. "Just me."${tell(p, w, '"Same tone all three times. Like a recording."')}` : `"${x.out[1]}"` },
  };
  const bagText = x => x.bag.map(b => `${b[1]} ${b[3]} ${b[2]}`).concat(x.gun ? ['a pistol with the serial filed off'] : []).concat(x.photo ? ['a creased photo of people who are not here'] : []).join(', ');
  const cellFree = S => E.cells(S) > E.sealed(S).length;

  EV.gatecomer.view = (S, p) => {
    const x = setup(S, p), { w, m, cp } = checks(S, p), room = E.roomFor(S);
    const knock = p.knock || (p.knock = pick([`Three slow knocks. Through the porthole: ${x.name}, soaked to the bone, hands up and empty.`, `Someone is scratching at the hatch with a coin. ${x.name}, hood down so you can see ${his(x)} face, breath fogging the glass.`, `A fist on the hatch, then a voice: "Please. I can work." ${x.name}, shivering, with a pack on ${his(x)} back.`, `${x.name} is sitting on the hatch like ${he(x)} is waiting for a bus. ${He(x)} stands up when the porthole slides open.`,
      `Knocking in a pattern: three, two, three. Through the porthole, ${x.name}, grinning nervously. "Sorry. Habit. We used that at the last place."`,
      `${x.name} is lying on the hatch, face up in the rain, not moving. When the porthole opens ${he(x)} says "Oh thank God" without opening ${his(x)} eyes.`,
      `A flashlight blinks at the porthole: on, off, on. ${x.name} is holding it under ${his(x)} chin like a kid telling ghost stories, to show ${his(x)} face is a face.`,
      `${x.name} has written PLEASE on a piece of cardboard and holds it up to the glass. The ink is running.`,
      `Somebody is kicking the hatch, slow and steady. ${x.name}, both hands full: a bag in one, a dead rabbit in the other. "I brought dinner."`,
      `${x.name} is singing, quietly, right up against the hatch, so whoever is inside knows ${he(x)} is not one of them. ${He(x)} stops when the porthole opens, embarrassed.`,
      `The alarm wire twitches. ${x.name} is standing exactly where the old sign says to stand, as if ${he(x)} read the rules on the way in.`,
      `${x.name} knocks once, then sits back on ${his(x)} heels and waits, the way you wait at a door you have been turned away from before.`]));
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
    E.log(S, `Built a ladder down to floor ${S.lad[p] + 1} ${({ c: 'in the middle shaft', l: 'on the left side', r: 'on the right side' })[p]}.`, 'good');
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

// ===== Life before, and temperaments (Buddy 2026-11-17: new personality types; use where they're from, age, hobbies, trauma)
// Every resident gets a hometown, an old job that fits their age, a hobby, a keepsake, a fear, often a trauma, and one of 12 temperaments.
// Traumas fire on what happens in the shelter; temperaments do something small every few days; both feed the chatter.
(() => {
  const E = globalThis.ShelterEngine, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const FROM = ['a farm town in Kansas', 'Lagos', 'the Bronx', 'a fishing village in Maine', 'Manila', 'Houston', 'a reservation in Arizona', 'Glasgow', 'Mexico City', 'a trailer park off Route 9', 'Seoul', 'Detroit', 'a ski town in Colorado', 'Karachi', 'New Orleans', 'Kraków', 'a suburb nobody remembers', 'Chicago', 'Addis Ababa', 'Oakland', 'a mining town in West Virginia', 'São Paulo', 'Toronto', 'Atlanta', 'a houseboat on the river', 'Tehran', 'Kyiv', 'Honolulu', 'Anchorage', 'right here, three streets over'];
  const JOBS = { kid: ['a sixth grader', 'a kid who hated school', 'a paperboy for a week', 'a kid who sold lemonade'], teen: ['a high school student', 'a shelf stacker on weekends', 'a lifeguard at the town pool', 'a junior varsity point guard', 'a kid who fixed phones for cash'],
    adult: ['a long-haul trucker', 'an accountant', 'a line cook', 'a nurse', 'a schoolteacher', 'a roofer', 'a bank teller', 'a security guard', 'an electrician', 'a hairdresser', 'a bus driver', 'a dental hygienist', 'a cell tower technician', 'a real estate agent', 'a bartender', 'a social worker', 'a plumber', 'a welder', 'a call center worker', 'a librarian', 'a pastor', 'a paramedic', 'a delivery driver', 'a mechanic', 'a pharmacist', 'a carpenter', 'a cop', 'an army medic', 'a farmhand', 'a museum guard'],
    old: ['a retired mailman', 'a retired seamstress', 'a retired coal miner', 'a retired judge', 'a retired chemistry teacher', 'a retired fisherman', 'a widow who ran a diner', 'a retired railway man', 'a retired midwife', 'a retired boxer'] };
  const HOBBY = ['chess', 'fishing', 'knitting', 'birdwatching', 'church choir', 'karaoke', 'model trains', 'baking bread', 'poker night', 'skateboarding', 'gardening', 'crossword puzzles', 'boxing', 'drawing comics', 'salsa dancing', 'restoring old cars', 'video games', 'marathons', 'ham radio', 'woodcarving', 'stand-up comedy open mics', 'quilting', 'bowling league', 'stargazing', 'guitar', 'hunting', 'tropical fish', 'reading mysteries', 'bodybuilding', 'collecting stamps'];
  const KEEP = ['a photo of a dog that did not make it', 'a wedding ring on a string', 'a child\'s drawing, folded small', 'a pocket Bible with a bullet hole in it', 'a car key to a car that is gone', 'a cassette with no player', 'a medal from a war nobody talks about', 'a lighter that belonged to their brother', 'a hospital bracelet', 'a seashell', 'a broken watch stopped at 4:12', 'a lucky coin', 'a lock of hair in an envelope', 'a postcard never sent', 'a hotel key card'];
  const TRAUMA = [
    ['fire', 'Got out of a house fire. Their family did not.'], ['dark', 'Was trapped two days in a collapsed basement, in the dark.'], ['hunger', 'Went eleven days without food on the road.'],
    ['loss', 'Watched their whole family turn, one by one.'], ['crowds', 'Survived a stampede at the evacuation center.'], ['raid', 'Was held by raiders for a month.'],
    ['rain', 'Was caught out in the first black rain and saw what it did.'], ['dogs', 'Was mauled by a pack of dogs in the first week.'], ['alone', 'Spent sixty days completely alone before finding anyone.'], ['guilt', 'Left someone behind to save themselves.'],
  ];
  const FEAR = { fire: 'fire', dark: 'the dark', hunger: 'empty shelves', loss: 'goodbyes', crowds: 'crowds', raid: 'strangers with guns', rain: 'the sound of rain', dogs: 'dogs', alone: 'being left alone', guilt: 'being trusted' };
  const TEMPER = {
    optimist: ['The Optimist', 'Finds the good in a bad day, out loud. Every few days someone near them feels a little lighter.'],
    cynic: ['The Cynic', 'Expects the worst and is usually right. Bad news barely moves them, and neither does good news.'],
    joker: ['The Joker', 'Jokes about everything, which helps, until it doesn\'t. Bad timing after a death.'],
    hothead: ['The Hothead', 'Short fuse. Picks fights with whoever is in the room.'],
    caretaker: ['The Caretaker', 'Sits with the sick and the scared without being asked.'],
    loner: ['The Loner', 'Needs space the shelter does not have. A crowded shelter wears them down.'],
    coward: ['The Coward', 'Freezes when the threat is real. Hates themselves for it.'],
    zealot: ['The Zealot', 'Believes this is a test. Holds people together, and pushes some away.'],
    hoarder: ['The Hoarder', 'Hides a little food, just in case. Every shelter has one.'],
    peacemaker: ['The Peacemaker', 'Can\'t stand a feud. Quietly patches things up between people.'],
    schemer: ['The Schemer', 'Always working an angle. Wears away at whoever leads.'],
    survivor: ['The Hard Case', 'Has been through worse. Hunger and grief barely touch them.'],
  };
  E.TEMPER = TEMPER;
  const ageOf = p => (globalThis.GEN.age || {})[p.sprite] ?? 38;
  E.life = p => {
    if (p.life) return p.life;
    const age = Math.max(9, ageOf(p) + Math.floor(Math.random() * 7) - 3), band = age < 13 ? 'kid' : age < 19 ? 'teen' : age >= 68 ? 'old' : 'adult';
    const tr = Math.random() < .7 ? pick(TRAUMA) : null, ps = E.psy ? E.psy(p) : { a: 5, n: 5, e: 5, c: 5 };
    const lean = ps.a >= 7 ? ['caretaker', 'peacemaker', 'optimist'] : ps.a <= 3 ? ['hothead', 'schemer', 'cynic'] : ps.n >= 8 ? ['coward', 'loner', 'hoarder'] : ps.e >= 7 ? ['joker', 'optimist', 'zealot'] : ps.c >= 7 ? ['survivor', 'zealot', 'peacemaker'] : Object.keys(TEMPER);
    p.life = { age, from: pick(FROM), job: pick(JOBS[band]), hobby: pick(HOBBY), keep: pick(KEEP), trauma: tr ? tr[0] : null, tt: tr ? tr[1] : null, fear: tr ? FEAR[tr[0]] : pick(['heights', 'needles', 'deep water', 'spiders', 'silence', 'hospitals']), temper: Math.random() < .75 ? pick(lean) : pick(Object.keys(TEMPER)) };
    return p.life;
  };
  E.lifeText = p => { const L = E.life(p), t = TEMPER[L.temper]; return { head: `${t[0]}`, line: `${L.age} years old, from ${L.from}. Was ${L.job}. Loved ${L.hobby}. Carries ${L.keep}.`, scar: L.tt ? `${L.tt} Afraid of ${L.fear}.` : `Afraid of ${L.fear}.`, temp: t[1] }; };
  // traumas and temperaments in daily life
  const tEnd = E.endDay; E.endDay = S => {
    const d0 = S.day, r = tEnd(S); if (S.day === d0 || S.over) return r;
    const home = E.humans(S).filter(o => !o.away && !o.sealed), need = E.needs(S), dead = (S.memorial || []).filter(m => !m.dog && !m.left && m.day >= S.day - 1).length;
    const said = (p, t) => { S.sayLast = S.sayLast || {}; if (S.day - (S.sayLast[t] ?? -99) < 25) return; if (Math.random() < .5) { S.sayLast[t] = S.day; E.log(S, `${p.name}: "${t}"`); } }; // each line once per 25 days (critic fix round 4)
    home.forEach(p => {
      const L = E.life(p);
      // trauma triggers
      const hit = { fire: S.rooms.some(x => x.broken && x.type === 'generator') || (S.incidents || []).some(i => /fire/i.test(i.type)), dark: !!S.blackout, hunger: S.res.food < need.food * 3, loss: dead > 0, crowds: home.length > 18 && S.day % 3 === 0, raid: !!(S.threat && S.threat.known), rain: !!(D.WEATHER[S.weather] || {}).dr && Math.random() < .3, dogs: E.dogs && E.dogs(S).some(x => x.alive) && Math.random() < .1, alone: home.length <= 3, guilt: dead > 0 && Math.random() < .5 }[L.trauma];
      if (hit && L.temper !== 'survivor') { E.addStress(S, p, L.trauma === 'loss' ? 2 : 1); if (Math.random() < .25 && S.day - (p.trigSaid ?? -99) >= 8 && (p.trigSaid = S.day)) said(p, { fire: 'I can smell smoke. Tell me you can\'t smell smoke.', dark: 'Somebody talk. Just talk. I need to hear where everyone is.', hunger: 'I know what eleven days feels like. I\'m not doing it again.', loss: 'Not again. Not again.', crowds: 'Too many people. I need air. There is no air.', raid: 'If they get in, I\'m not going back. You understand me? I\'m not going back.', rain: 'Listen to it. You can hear it eating the roof.', dogs: 'Keep that dog away from me.', alone: 'Don\'t leave me on my own down here.', guilt: 'It should have been me. It\'s always somebody else.' }[L.trauma]); }
      // temperaments
      const roomies = home.filter(o => o !== p && o.room && o.room === p.room), anyone = roomies.length ? roomies : home.filter(o => o !== p), o = anyone[Math.floor(Math.random() * anyone.length)];
      switch (L.temper) {
        case 'optimist': if (o && S.day % 4 === 0) { o.stress = Math.max(0, o.stress - 1); if (Math.random() < .3) said(p, pick(['Another day above ground. Well, below it. You know what I mean.', 'We\'re still here. That\'s not nothing.', 'The beans came up. Did you see? The beans came up.'])); } break;
        case 'joker': if (o && S.day % 5 === 0) { if (dead) { E.addStress(S, o, 1); E.addRel(S, p, o, -4); } else { o.stress = Math.max(0, o.stress - 1); E.addRel(S, p, o, 2); if (Math.random() < .3) said(p, pick([`Where I grew up we called this weather "Tuesday".`, 'What do you call a zombie who tells jokes? Dead funny. No? Tough room.', `I was ${L.job}. Now I\'m a professional bucket emptier. Career growth.`])); } } break;
        case 'hothead': if (o && Math.random() < .08) { E.addRel(S, p, o, -6); E.addStress(S, o, 1); said(p, pick(['Say that again.', 'Get out of my face.', 'You want to do this? We can do this.'])); } break;
        case 'caretaker': { const sick = home.find(x => x.ill || x.hp < E.maxHp(x) / 2 || x.stress >= 7); if (sick && sick !== p) { sick.stress = Math.max(0, sick.stress - 1); E.addRel(S, p, sick, 2); } } break;
        case 'loner': if (home.length > 12 && S.day % 2 === 0) E.addStress(S, p, 1); break;
        case 'coward': if (S.threat && S.threat.known) { E.addStress(S, p, 1); if (Math.random() < .3) said(p, 'Maybe I should sit this one out. Somebody has to watch the... somebody has to watch.'); } break;
        case 'zealot': if (S.day % 3 === 0) { S.order = Math.min(100, (S.order ?? 55) + .5); if (o && E.psy && E.psy(o).o >= 7) E.addRel(S, p, o, -3); if (Math.random() < .2) said(p, 'This is a test. All of it. And we are passing it.'); } break;
        case 'hoarder': if (Math.random() < .04 && S.res.food > 2) { S.res.food -= 1; p.stash = (p.stash || 0) + 1; } break;
        case 'peacemaker': if (S.day % 3 === 0 && home.length > 2) { let worst = null, wv = 0; for (let i = 0; i < Math.min(8, home.length); i++) { const a = pick(home), b = pick(home); if (a === b || a === p || b === p) continue; const v = E.rel(S, a, b); if (v < wv) { wv = v; worst = [a, b]; } } if (worst) { E.addRel(S, worst[0], worst[1], 4); if (Math.random() < .3) E.log(S, `${p.name} sat ${worst[0].name} and ${worst[1].name} down and made them talk.`); } } break;
        case 'schemer': { const Ld = E.leader && E.leader(S); if (Ld && Ld !== p && S.day % 4 === 0) { S.order = Math.max(0, (S.order ?? 55) - .4); E.addRel(S, p, Ld, -2); } } break;
        case 'survivor': if (p.stress > 4 && S.day % 3 === 0) p.stress -= 1; break;
        case 'cynic': if (p.stress > 6 && S.day % 4 === 0) p.stress -= 1; break;
      }
    });
    return r;
  };
  // the hoarder's stash comes out when they die, or when someone finds it
  const k0 = E.kill; E.kill = (S, p, why) => { const st = p.stash || 0; const r = k0(S, p, why); if (st >= 3) { S.res.food += st; E.log(S, `Under ${p.name}'s bunk they found ${st} food, wrapped in plastic. Nobody said anything for a long time.`); p.stash = 0; } return r; };
})();

// ===== Game night: Tower of Trials (Buddy 2026-11-17). A board game someone carried down the ladder, a quiet nod to TOFU.
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS;
  const NIGHTS = [
    g => `${g.host} dug a battered box out of a backpack: Tower of Trials, the corners held together with tape. ${g.pl.join(', ')} climbed the tower by lamplight, floor by floor, rolling ten-sided dice. ${g.pl[0]} lost a hero on the third floor and demanded a rematch.`,
    g => `Game night. Tower of Trials again, with half the cards missing and the rest drawn back in pencil. ${g.pl[0]} rolled a ten on the very first roll and the whole shelter heard the cheer.`,
    g => `${g.host} ran Tower of Trials for ${g.pl.length} people. They reached the top floor for the first time and nobody knew what to do with themselves. ${g.pl[1] || g.pl[0]} said it was the first time in weeks they forgot where they were.`,
    g => `Somebody found the missing dice for Tower of Trials in the pocket of a coat on a run. That night ${g.pl.join(' and ')} played until the lamp ran dry. ${g.host} cheated, everyone knew, and nobody minded.`,
    g => `Tower of Trials night. ${g.pl[0]} made up a new rule halfway up the tower, then a second one, then a third. By the end it was a different game, and a better one.`,
  ];
  EV.towernight = {
    chance: 2, when: S => S.day > 6 && E.humans(S).filter(o => !o.away && !o.sealed).length >= 4 && !(E.deadSince && E.deadSince(S, 3).length) && S.day - (S.towerLast ?? -99) >= 12,
    view: (S, p) => {
      if (p.host == null) { const h = E.humans(S).filter(o => !o.away && !o.sealed && !o.damned).sort(() => Math.random() - .5); p.host = h[0].id; p.pl = h.slice(1, 4).map(o => o.id); p.v = Math.floor(Math.random() * NIGHTS.length); S.towerLast = S.day; }
      const host = S.people.find(o => o.id === p.host), pl = p.pl.map(id => S.people.find(o => o.id === id)).filter(Boolean).map(o => o.name);
      return { title: 'Game night: Tower of Trials', text: NIGHTS[p.v]({ host: host ? host.name : 'Someone', pl: pl.length ? pl : ['everyone'] }), art: {}, choices: ['Roll the dice'] };
    },
    pick: (S, p) => {
      const ppl = [p.host, ...(p.pl || [])].map(id => S.people.find(x => x.id === id)).filter(o => o && o.alive);
      ppl.forEach(o => { o.stress = Math.max(0, o.stress - 3); });
      for (let i = 0; i < ppl.length; i++) for (let j = i + 1; j < ppl.length; j++) if (E.addRel) E.addRel(S, ppl[i], ppl[j], 3);
    },
  };
})();

// ===== Critic fixes, round 4 (Buddy 2026-11-18, "fix it all")
// The raincoat girl gets her own road card (she never comes to the door), run reports merge, quiet runs go to the log,
// raids warn you and give you a choice, rot is reported weekly, body cards vary, cards stop after the last person dies,
// Tower of Trials is a real roll, and Q.U.E.S.T. counts the real days and gets a scene between Day 160 and Day 230.
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const home = S => E.humans(S).filter(o => !o.away && !o.sealed);
  const byId = (S, id) => S.people.find(o => o.id === id);
  const fresh = (S, key, arr) => { S.fr4 = S.fr4 || {}; let u = S.fr4[key] = S.fr4[key] || []; let f = arr.map((x, i) => i).filter(i => !u.includes(i)); if (!f.length) { u = S.fr4[key] = []; f = arr.map((x, i) => i); } const i = pick(f); u.push(i); return arr[i]; };
  const him = p => (p.he === 'he' ? 'him' : 'her'), his = p => (p.he === 'he' ? 'his' : 'her');
  const names = a => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0] || '');
  const skN = s => (D.SKILL_NAME && D.SKILL_NAME[s]) || s[0].toUpperCase() + s.slice(1);
  const diceTxt = (sk, r) => `${skN(sk)}: ${r.dice.length} dice vs DR ${r.dr}, rolled ${r.dice.join(' ')}. ${r.succ} success${r.succ === 1 ? '' : 'es'}${r.crit ? ', and a Cosmic Crit' : ''}.`;

  // ---------- loot lines: no "X or Y" table leftovers, no "a arrow", no encounters listed as loot
  const tf0 = E.tidyFind;
  E.tidyFind = t => {
    t = String(t).replace(/\b(\w+) or \w+\b/g, '$1').replace(/^(?:\d+\s*)?x \d+ gal(?:lons)? of /i, '').replace(/^([^:]{3,40}):\s*\d+\s*,\s*/, '$1 and ').replace(/\bchem\b/gi, 'chemicals');
    return tf0(t).replace(/\b([Aa]) ([aeiou])/g, '$1n $2').replace(/\s*\([^)]*$/, '').replace(/\s{2,}/g, ' ');
  };
  const NOTLOOT = /went feral|\bpack\b|horde|ambush|infected|^dead\b|^x\b|backed out|survivors had|still inside|^some\b|and armed/i;
  const rp0 = E.runProse;
  E.runProse = (S, r) => { (r.finds || []).forEach(f => { if (!f.gear && !f.res && NOTLOOT.test(String(f.t).trim())) f.none = 1; }); return rp0(S, r); };

  // ---------- the girl in the yellow raincoat, on the road only (Buddy 2026-11-18: she never comes to the door)
  const OPEN = [
    v => `The rain had been coming down for an hour when somebody at the back said "Is that a kid?" A little girl in a yellow raincoat stood in the road behind them, hood up, perfectly still. Her coat was dry. Then she was running at them, low and fast.`,
    v => `They heard her before they saw her: small bare feet slapping the wet road, too fast, far too fast. A yellow raincoat came out of the dark straight at ${v.name}.`,
    v => `A child was crying in the ditch. ${v.name} went to look. Under the hood of the yellow raincoat there was a smile that went too far back.`,
    v => `She was sitting on the roof of a dead car, swinging her legs and humming. She waved. Then she jumped, and she jumped much too far.`,
    v => `The thing they had been hearing in the trees all afternoon was not a dog. It was a little girl in a yellow raincoat, on all fours, keeping pace.`,
    v => `Halfway home the rain stopped, which it never does. In the quiet a small voice said ${v.name}'s name, very politely, right behind them.`,
    v => `Somebody had chalked a hopscotch on the road. At the end of it stood a girl in a yellow raincoat, waiting for her turn. She looked at ${v.name} and said "You're it."`,
  ];
  const TAKE = [
    (v, w) => `She went for ${v.name}, the slowest of them, and took ${him(v)} down into the ditch so fast nobody saw her move. There was one scream. In the ditch there were only small footprints, and one of ${v.name}'s boots.`,
    (v, w) => `She came over ${w.name}'s shoulder as if ${w.name} were not there and took ${v.name} by the collar. They chased her for a mile. They found ${v.name}'s jacket on a fence, folded.`,
    (v, w) => `${v.name} went down under her. By the time anyone fired she was dragging ${him(v)} off the road backwards, impossibly strong for something that small. Then the rain closed over both of them.`,
    (v, w) => `Nobody saw her take ${v.name}. One second ${v.name} was at the back of the line. The next, the line was shorter, and a little voice in the trees was humming.`,
    (v, w) => `She took ${v.name} gently, almost, the way you lead a child by the hand. ${v.name} did not fight. That is the part nobody can talk about.`,
  ];
  const SIGHT = ['Far back on the road, a small figure in a yellow coat. When they looked again it was gone.', 'Somebody swore they saw a child in a yellow raincoat watching them from a bus shelter. Nobody else saw it.', 'Small bare footprints in the mud beside their own, all the way home. They stopped at the last corner.', 'A yellow raincoat hung on a fence, dry in the black rain. Nobody touched it. On the way back it was gone.'];
  const TALK = ['"She knew my name," somebody says at dinner, to nobody in particular.', 'Somebody painted over every yellow thing in the shelter.', '"If you see a kid alone out there, you keep walking. You hear me? You keep walking."', 'Nobody wants the back of the line on a run any more. They draw for it.', 'Somebody heard humming in the vents last night. Tonight everybody heard it.', 'A new rule nobody voted on: you don\'t say her name. Nobody knows her name, and you still don\'t say it.'];
  const talk = S => { S.girlTalk = S.day; };
  E.girlRoad = (S, team, site, rep) => {
    if ((S.girlN || 0) >= 4) return;
    const seen = S.girlSeen || 0;
    if (seen < 2) { if (S.day - (S.girlSeenDay ?? -99) >= 10 && Math.random() < .06) { S.girlSeen = seen + 1; S.girlSeenDay = S.day; rep.notes.push(fresh(S, 'gsight', SIGHT)); } return; }
    if (S.day - (S.girlLast ?? -99) < 30 || S.day - (S.girlSeenDay ?? -99) < 3 || Math.random() >= .035) return;
    S.girlLast = S.day; S.girlN = (S.girlN || 0) + 1;
    const v = team.slice().sort((a, b) => a.hp - b.hp)[0];
    if (team.length === 1) {
      E.kill(S, v, 'Taken on the road by the girl in the yellow raincoat'); talk(S);
      E.say(S, `Nobody came back from ${site.name}`, `${fresh(S, 'gopen', OPEN)(v)}\n\n${v.name} was alone. Nobody saw the rest. Two days later ${his(v)} pack turned up on the hatch, zipped shut, dry.`);
      return 'gone';
    }
    rep.notes.push('On the way home something followed them out of the rain.');
    S.queue.push({ k: 'girlroad', p: { ids: team.map(p => p.id), v: v.id, place: site.name } });
  };
  EV.girlroad = {
    view: (S, p) => {
      const team = p.ids.map(id => byId(S, id)).filter(o => o && o.alive), v = byId(S, p.v) || team[0];
      if (!team.length || !v) return { title: 'The yellow raincoat', text: 'Something followed them home. Nobody will say what.', art: {}, choices: ['Understood'] };
      if (p.t == null) p.t = fresh(S, 'gopen', OPEN)(v);
      const best = sk => team.slice().sort((a, b) => E.pool(b, sk) - E.pool(a, sk))[0], slow = team.slice().sort((a, b) => E.pool(a, 'athletics') - E.pool(b, 'athletics'))[0];
      const sh = best('ranged'), ml = best('melee'), tk = best('insight');
      // critic round 5: she is meant to be terrifying. Pools are capped at 5, and fighting or talking needs 2 successes
      const all = [['shoot', sh.id, 'ranged', 8, 0, 1], ['line', ml.id, 'melee', 8, Math.min(2, team.length - 1), 2], ['run', slow.id, 'athletics', 7, 0, 1], ['call', tk.id, 'insight', 9, 0, 2]];
      const nd = o => Math.min(5, Math.max(1, E.pool(byId(S, o[1]), o[2]) + o[4]));
      p.opt = all.filter(o => nd(o) >= 2); if (p.opt.length < 2) p.opt = all.slice().sort((a, b) => nd(b) - nd(a)).slice(0, 2);
      const need = o => (o[5] > 1 ? ', needs 2 successes' : '');
      const lab = { shoot: (x, o) => `Shoot her (${x.name}, Ranged ${nd(o)} dice vs DR 8${need(o)})`, line: (x, o) => `Stand together and fight (${x.name} leads, Melee ${nd(o)} dice vs DR 8${need(o)})`, run: (x, o) => `Run for it (${x.name} is slowest, Athletics ${nd(o)} dice vs DR 7${need(o)})`, call: (x, o) => `Talk to her like a child (${x.name}, Insight ${nd(o)} dice vs DR 9${need(o)})` };
      return { title: 'The yellow raincoat', text: `On the road home from ${p.place}.\n\n${p.t}\n\nThere is no time to think.`, art: {}, choices: p.opt.map(o => lab[o[0]](byId(S, o[1]), o)) };
    },
    pick: (S, p, i) => {
      if (!p.opt) EV.girlroad.view(S, p);
      const team = p.ids.map(id => byId(S, id)).filter(o => o && o.alive); if (!team.length || !p.opt) return;
      const o = p.opt[i] || p.opt[0], who = byId(S, o[1]) || team[0], r = E.roll(Math.min(5, Math.max(1, E.pool(who, o[2]) + o[4])), o[3]), dice = diceTxt(o[2], r);
      const victim = o[0] === 'run' ? who : (team.find(x => x.id === p.v) || team[0]);
      team.forEach(x => E.addStress(S, x, 2)); talk(S);
      if (r.succ >= (o[5] || 1) || r.crit) {
        const ok = { shoot: `The shot spins her round. She looks at ${who.name}, hurt and surprised, the way a real child would, and then she is gone into the trees on all fours.`, line: `She hits the line like a dog hits a fence and bounces off a wall of crowbars and boots. ${victim.name} has a bite on the forearm, black at the edges. Then she is gone.`, run: 'They run until their lungs give out. When they look back she is standing exactly where she was, waving.', call: `${who.name} kneels in the road and says "Hey. Hey, sweetheart. Where's your mom?" She stops. She tilts her head. For a long moment she looks like she is trying to remember something. Then she walks away into the rain and does not look back.` }[o[0]];
        if (o[0] === 'line') { victim.hp = Math.max(1, victim.hp - 4); E.expose && E.expose(S, victim, 1, 6, 'the girl'); }
        return E.say(S, 'She is gone. For now.', `${dice}\n\n${ok}`);
      }
      if (Math.random() < .75 || (r.succ === 0 && Math.random() < .5)) { E.kill(S, victim, 'Taken on the road by the girl in the yellow raincoat'); return E.say(S, `${victim.name} is gone`, `${dice}\n\n${fresh(S, 'gtake', TAKE)(victim, team.find(x => x !== victim) || who)}`); }
      victim.hp = Math.max(1, victim.hp - 6); E.expose && E.expose(S, victim, 1, 6, 'the girl');
      E.say(S, 'Bitten', `${dice}\n\nShe got her teeth into ${victim.name}, hard, before the others dragged her off. The bite is black at the edges. ${victim.name} will live, for now.`);
    },
  };

  // ---------- the body card: varied, and Butcher only when food is short
  const BOPEN = [
    x => `${x.name} ${x.last} is lying in the corridor under a tarp.`,
    x => `They carried ${x.name} up from the lower level and laid ${him(x)} by the ladder.`,
    x => `${x.name}'s boots stick out from under a blanket in the corridor. Somebody tied the laces.`,
    x => `${x.name} is on the workbench, the only flat place long enough. Nobody can work there until this is done.`,
    x => `Someone closed ${x.name}'s eyes and put a coin on each. Nobody knows who.`,
    x => `${x.name} is wrapped in a sleeping bag by the hatch, zipped all the way up.`,
    x => `${x.name} is lying where it happened. Nobody wanted to be the first to move ${him(x)}.`,
    x => `${x.name} is under ${his(x)} own coat in the corridor. The coat is too short. Somebody put a second one over the feet.`,
  ];
  const FULL = ['The stores are full. This is only about what is right.', 'Nobody is hungry. Nobody needs to say the other thing.', 'There is food. That makes it simpler, and no easier.', 'The shelves are full enough that nobody looks at the cold room.'];
  const bv0 = EV.body.view;
  EV.body.view = (S, p, e) => {
    const v = bv0(S, p, e || E), dead = p.ids.map(id => byId(S, id)).filter(Boolean), need = E.needs(S).food, days = need ? Math.floor(S.res.food / need) : 99;
    if (dead.length === 1) { if (p.bo == null) p.bo = fresh(S, 'bodyo', BOPEN.map((f, i) => i)); v.text = v.text.replace(`${dead[0].name} ${dead[0].last} is lying in the corridor under a tarp.`, BOPEN[p.bo](dead[0])); }
    if (days >= 10 && !p.law) { if (p.bf == null) p.bf = fresh(S, 'bodyf', FULL.map((f, i) => i)); v.text = v.text.replace('There is still food on the shelves. For now.', FULL[p.bf]); v.choices = v.choices.slice(0, 2); }
    return v;
  };
  const bp0 = EV.body.pick;
  EV.body.pick = (S, p, i, e) => {
    const need = E.needs(S).food, days = need ? Math.floor(S.res.food / need) : 99;
    if (!p.law && days >= 10 && i < 2 && !p.auto) { const w = S.bodyWay; S.bodyWay = w && w.i === i ? { i, n: w.n + 1 } : { i, n: 1 }; }
    return bp0(S, p, i, e || E);
  };

  // ---------- what the next card is: drop cards nobody is left to see, handle bodies the way you always do, merge run reports
  const solo = ['body', 'refugees', 'gatecomer', 'signal', 'mercenary', 'found_survivors', 'towernight', 'goodnight', 'birthday', 'weekly', 'losses', 'threat', 'rotnote'];
  const FLAV = /dead traveler|abandoned car|roadside building|crashed vehicle|note on the wall|search went badly|Lucky find/;
  const quiet = r => !(r.dead && r.dead.length) && !(r.fights || []).some(f => !f.won || (f.hurt && f.hurt.length) || (f.dead && f.dead.length)) && !(r.notes || []).some(t => /raincoat|followed them|Lucky find/.test(t)) && !r.people; // only deaths, fights, finds of people and the girl get a card
  const gotTxt = g => Object.entries(g || {}).filter(([, v]) => v).map(([k, v]) => `+${Math.round(v)} ${(D.RES_NAME[k] || k).toLowerCase()}`).join(', ');
  // runs after each night and each decision, so E.current never finds an empty queue
  const tidy = S => {
    for (let g = 0; g < 80 && S.queue.length; g++) {
      const q = S.queue[0], n = home(S).length;
      if ((n < 2 && solo.includes(q.k)) || (n < 3 && (/^(crime_|g_)/.test(q.k) || ['lawprompt', 'strike', 'cult', 'coup', 'unrest', 'theft', 'quarrel', 'wedding', 'gamble', 'still', 'escape', 'kitchenrevolt', 'hungerstrike', 'confession', 'deserter', 'towernight', 'goodnight', 'birthday', 'faction', 'appoint', 'succession'].includes(q.k)))) { S.queue.shift(); continue; }
      if (q.k === 'body' && !q.p.law && S.bodyWay && S.bodyWay.n >= 3) {
        const need = E.needs(S).food, days = need ? Math.floor(S.res.food / need) : 99;
        if (days >= 10) { S.queue.shift(); q.p.auto = 1; const nm = names(q.p.ids.map(id => byId(S, id)).filter(Boolean).map(x => x.name)); EV.body.pick(S, q.p, S.bodyWay.i, E); E.log(S, `${nm} ${S.bodyWay.i === 0 ? 'went under the floor' : 'went into the fire'}, the way it is done here now.`); continue; }
      }
      if (q.k === 'weekly' && q.p.r >= 4 && q.p.r <= 8) { const v = EV.weekly.view(S, q.p); S.queue.shift(); E.log(S, `${v.title}. ${v.text}`); continue; }
      if (q.k === 'runreport' && !q.p.merged) {
        const all = S.queue.filter(z => z.k === 'runreport' && !z.p.merged), loud = all.filter(z => !quiet(z.p));
        all.filter(z => quiet(z.p)).forEach(z => { const r = z.p, t = gotTxt(r.got); E.log(S, `${names(r.team)} came back from ${E.placeName ? E.placeName(r.place) : r.place}${t ? `: ${t}` : ' with nothing worth the walk'}${r.gear && r.gear.length ? `, and ${r.gear.slice(0, 2).join(', ')}` : ''}.`, 'good'); S.queue.splice(S.queue.indexOf(z), 1); });
        if (loud.length) {
          const head = loud[0].p; head.merged = 1;
          loud.slice(1).forEach(z => { const x = z.p; head.story = (head.story || E.runProse(S, head)) + '\n\n' + (x.story || E.runProse(S, x)); Object.entries(x.got || {}).forEach(([k, v]) => { head.got[k] = (head.got[k] || 0) + v; }); head.gear = head.gear.concat(x.gear || []); head.fights = head.fights.concat(x.fights || []); head.dead = head.dead.concat(x.dead || []); head.left = (head.left || []).concat(x.left || []); head.places = (head.places || [head.place]).concat(x.place); S.queue.splice(S.queue.indexOf(z), 1); });
          const at = S.queue.indexOf(loud[0]); if (at > 0) { S.queue.splice(at, 1); S.queue.unshift(loud[0]); }
        }
        continue;
      }
      break;
    }
  };
  const rr0 = EV.runreport.view;
  EV.runreport.view = (S, r) => { const v = rr0(S, r); if (r.places && r.places.length > 1) v.title = `Runs today: ${names(r.places.map(x => (E.placeName ? E.placeName(x) : x)))}`; return v; };

  // ---------- raids: a warned raid gives you a choice, and never two nights running
  EV.threat = {
    view: (S, p) => {
      const t = S.threat; if (!t) return { title: 'Quiet', text: 'Whatever was out there moved on.', art: {}, choices: ['Good'] };
      const human = t.groups.includes('human'), fee = Math.ceil(S.res.food * .15) + 8;
      p.fee = fee; p.human = human;
      return { title: human ? 'Armed people on the road' : t.groups.includes('machine') ? 'Machines moving this way' : 'Something is gathering outside', text: `${E.threatText(t)}\n\nYou have the day to get ready.${S.res.rounds < 10 ? ' The rounds box is nearly empty.' : ''}`, art: {}, choices: ['Double the watch tonight. Everyone sleeps in their boots', human ? `Leave a payment on the hatch (${fee} food, 10 rounds)` : 'Lights out, total silence, and hope it passes', 'Let them come'] };
    },
    pick: (S, p, i) => {
      if (!S.threat) return;
      if (i === 0) { S.reinfOn = 1; home(S).forEach(o => E.addStress(S, o, 1)); return E.log(S, 'Everyone sleeps in their boots tonight. The watch is doubled.', ''); }
      if (i === 1 && p.human) { if (S.res.food < p.fee || S.res.rounds < 10) return E.log(S, 'There is not enough to pay them. They are coming anyway.', 'bad'); S.res.food -= p.fee; S.res.rounds -= 10; if (Math.random() < .6) { S.threat = null; return E.say(S, 'The payment', `In the morning the food and rounds were gone from the hatch, and somebody had scratched a mark into the steel: a circle with a line through it. Paid. ${Math.random() < .5 ? 'It means they know you pay.' : 'It means they will be back.'}`); } return E.say(S, 'The payment', 'They took the payment. They came anyway.'); }
      if (i === 1) { home(S).forEach(o => E.addStress(S, o, 1)); if (Math.random() < .45) { S.threat = null; return E.say(S, 'Silence', 'Forty people holding their breath in the dark for six hours. Something walked over the hatch twice, slowly, and then it was gone.'); } return E.log(S, 'They went dark and silent. It did not help. Something heard the heartbeat.', 'bad'); }
    },
  };
  const pf0 = E.pickFoes;
  E.pickFoes = (groups, level, budget, maxN) => pf0(groups, level, S0 && S0.reinfOn ? Math.max(2, Math.round(budget * .88)) : budget, maxN);
  let S0 = null;

  // ---------- Rot, once a week, with a way to fix it
  EV.rotnote = {
    view: (S, p) => {
      const slot = S.slots.find(s => E.reachable(S, s.row, s.col) && !E.roomAt(S, s.row, s.col)), cost = D.ROOMS.cold.build, can = slot && S.res.scrap >= cost && !S.rooms.some(r => r.type === 'cold');
      p.can = !!can;
      return { title: 'The storeroom is rotting', text: `${p.lost} food went up the ladder in buckets this week. Anything past ${p.keep} food spoils fast without a Cold Room.${can ? '' : S.rooms.some(r => r.type === 'cold') ? '' : slot ? ` A Cold Room costs ${cost} scrap.` : ' There is no free room to build one in.'}`, art: {}, choices: can ? [`Build a Cold Room (${cost} scrap)`, 'Not now'] : ['Understood'] };
    },
    pick: (S, p, i) => { if (!p.can || i !== 0) return; const slot = S.slots.find(s => E.reachable(S, s.row, s.col) && !E.roomAt(S, s.row, s.col)); if (slot && E.build(S, 'cold', slot)) E.log(S, 'Built a Cold Room. The food will keep now.', 'good'); },
  };

  // ---------- Q.U.E.S.T.: the real countdown, and one scene between Day 160 and Day 230
  if (EV.q_hour) { const qh = EV.q_hour.view; EV.q_hour.view = (S, p) => { const o = qh(S, p), n = Math.max(1, E.STRIKE_DAY - S.day), w = `${n} days`; o.title = o.title.replace('Twenty days', w[0].toUpperCase() + w.slice(1)); o.text = o.text.replace(/Twenty days/g, w[0].toUpperCase() + w.slice(1)); return o; }; }
  EV.q_mid = {
    view: S => {
      const ppl = home(S).filter(o => !o.damned), n = Math.max(1, E.STRIKE_DAY - S.day);
      return { title: 'The names', text: `The radio, at three in the morning. "${n} days. I want to ask you for something, and it is not food or people."\n\n"Read me your names. All of them, the living and the ones on the Wall. Somebody should have a list that survives this, and I am very hard to kill."\n\nThere are ${ppl.length} of you and ${(S.memorial || []).filter(m => !m.dog).length} names on the Wall.`, art: { q: 1 }, choices: ['Read her every name', 'Give her nothing. She has enough'] };
    },
    pick: (S, p, i) => {
      const a = S.qarc || (S.qarc = { st: 0, trust: 0, mercy: 0 });
      if (i === 0) { a.trust += 1; home(S).forEach(o => { o.stress = Math.max(0, o.stress - 1); }); return E.say(S, 'Read into the radio', 'It took two hours. People came and went from the radio room, and everybody said their own name when it was their turn. When the Wall was read, nobody said anything for a while. Then she said "Thank you. I have them," and went quiet for a week.', { q: 1 }); }
      a.trust -= 1; E.say(S, 'Static', '"I understand," she said. "I would not trust me either." The radio stayed off for a week. Nobody admitted to missing her.', { q: 1 });
    },
  };

  // ---------- the weekly card knows what kind of week it was
  const wk0 = EV.weekly.view;
  EV.weekly.view = (S, p) => {
    const v = wk0(S, p), need = E.needs(S), dead = (E.deadSince ? E.deadSince(S, 7) : []).length;
    if (p.r >= 4 && p.r <= 9 && (S.res.fuel <= 0 || S.res.food < need.food * 2 || S.res.water < need.water * 2 || dead >= 2)) {
      if (p.hw == null) p.hw = Math.floor(Math.random() * 4);
      v.title = 'A hard week';
      v.text = S.res.fuel <= 0 ? ['The generator is dry. A week of cold dinners in the dark.', 'No fuel. People talk in whispers, as if the dark can hear.', 'The lamps are out. Somebody counts the days on the wall by touch.', 'Dark, cold, and quiet. Nobody wants to be the one to say how long.'][p.hw] : dead >= 2 ? [`${dead} names on the Wall this week. Nobody remembers anything else about it.`, 'A week of funerals. The chores got done anyway, somehow.', 'Everyone is counting, and nobody says what.', 'The bunks are emptier. Nobody moves into them yet.'][p.hw] : ['Half rations, then quarter rations. Everyone is short with everyone.', 'The stores are almost bare. Somebody licked a can lid and nobody laughed.', 'Every meal is a meeting about the next one.', 'Hunger makes the shelter loud, then very quiet.'][p.hw];
      if (p.r === 9) p.r = 5;
    }
    return v;
  };

  // ---------- Tower of Trials is a real roll now, and the shelter remembers its best floor
  const TOW = [
    g => `${g.host} dug the battered box out from under a bunk: Tower of Trials, the corners held together with tape. ${names(g.pl)} sat down to climb by lamplight.`,
    g => `Game night. Tower of Trials again, half the cards missing and the rest redrawn in pencil. ${names(g.pl)} pulled up crates.`,
    g => `${g.host} ran Tower of Trials for ${g.pl.length} people tonight, doing all the monster voices.`,
    g => `Somebody found the missing ten-sided dice in a coat pocket from a run. ${names(g.pl)} wanted to use them right away.`,
    g => `Tower of Trials night. ${g.pl[0]} wrote new rules on the back of a ration label before anyone could stop them.`,
    g => `The board came out after dinner. ${g.host} insisted on being the Tower, which means being the bad guy, which means enjoying it too much.`,
    g => `${g.pl[0]} had never played. Everyone else pretended to explain the rules and actually argued about them for twenty minutes.`,
    g => `Rain on the hatch, lamp turned low, and the clatter of dice. ${names(g.pl)} started the climb.`,
    g => `${g.host} built a little tower out of ration cans for the board. It fell over twice. It counted as a trap the second time.`,
    g => `Tower of Trials, with a candle stub as the timer. When it went out, the round was over, no arguments.`,
    g => `Somebody bet their dessert on the climb. ${g.host} raised them a pair of dry socks.`,
    g => `${names(g.pl)} played Tower of Trials on the floor of the Bunks so the kids could watch, if there were any kids. There weren't. They played anyway.`,
  ];
  EV.towernight.view = (S, p) => {
    if (p.host == null) { const h = home(S).filter(o => !o.damned).sort(() => Math.random() - .5); p.host = h[0].id; p.pl = h.slice(1, 4).map(o => o.id); p.v = fresh(S, 'tow', TOW.map((f, i) => i)); S.towerLast = S.day; }
    const host = byId(S, p.host), pl = p.pl.map(id => byId(S, id)).filter(o => o && o.alive).map(o => o.name);
    const g = { host: host ? host.name : 'Someone', pl: pl.length ? pl : ['everyone'] }, n = 2 + pl.length;
    const best = S.towerBest || 0;
    return { title: 'Game night: Tower of Trials', text: `${TOW[p.v](g)}\n\n${best ? `The shelter's best climb is floor ${best} of 10.` : 'Nobody here has ever reached the top.'}`, art: {}, choices: [`Go for the top (${n} dice vs DR 8)`, `Play it safe (${n} dice vs DR 5)`] };
  };
  EV.towernight.pick = (S, p, i) => {
    const ppl = [p.host, ...(p.pl || [])].map(id => byId(S, id)).filter(o => o && o.alive);
    const r = E.roll(2 + Math.max(0, ppl.length - 1), i === 0 ? 8 : 5), floor = Math.min(10, i === 0 ? r.succ * 3 + (r.crit ? 4 : 0) : 1 + r.succ), best = S.towerBest || 0;
    let t = `${r.dice.length} dice vs DR ${r.dr}, rolled ${r.dice.join(' ')}. They reached floor ${floor} of 10.`;
    if (floor >= 10 && best < 10) t += ' The top of the Tower, for the first time in this shelter. People who were asleep woke up to the cheering and did not mind.';
    else if (floor >= 10) t += ' The top again. It never gets old.';
    else if (floor > best) t += ` A new shelter record. Somebody scratched "${floor}" into the wall by the board.`;
    else if (floor === 0) t += ` The Tower wins on the first floor. ${ppl[0] ? ppl[0].name : 'Somebody'} flipped the board, then apologised, then laughed.`;
    else t += ' Not the best climb. Nobody cared.';
    S.towerBest = Math.max(best, floor);
    const ease = floor >= 10 ? 4 : floor > best ? 3 : floor === 0 ? 1 : 2;
    ppl.forEach(o => { o.stress = Math.max(0, o.stress - ease); });
    for (let a = 0; a < ppl.length; a++) for (let b = a + 1; b < ppl.length; b++) if (E.addRel) E.addRel(S, ppl[a], ppl[b], floor === 0 ? 1 : 3);
    E.say(S, 'Tower of Trials', t);
  };

  // ---------- each day: rot report, talk about the girl, raid warnings, nobody left
  const GT = TALK;
  const ed0 = E.endDay;
  E.endDay = S => {
    S0 = S;
    const d0 = S.day, r = ed0(S);
    S.reinfOn = 0;
    if (!E.humans(S).length) { S.over = true; S.queue = S.queue.filter(q => q.k === 'q_end'); return r; }
    if (S.day === d0) return r;
    if (S.queue.some(q => q.k === 'raid') || S.raidNow) S.raidDay = S.day;
    if (S.threat && S.day - (S.raidDay ?? -99) <= 1) { const tt = E.threatText(S.threat); for (let k = S.log.length - 1; k >= Math.max(0, S.log.length - 12); k--) if (S.log[k] && S.log[k].t === tt) { S.log.splice(k, 1); break; } S.threat = null; }
    if (S.threat && S.threat.known && !S.queue.some(q => q.k === 'threat') && S.day - (S.threatCard ?? -99) >= 8) { S.threatCard = S.day; S.queue.push({ k: 'threat', p: {} }); }
    if (S.day % 7 === 0 && S.rotWeek > 0) {
      const cold = S.rooms.some(x => x.type === 'cold');
      if (!cold && S.rotWeek >= 10 && S.day - (S.rotCard ?? -99) >= 28) { S.rotCard = S.day; S.queue.push({ k: 'rotnote', p: { lost: S.rotWeek, keep: S.rotKeep || 0 } }); }
      else E.log(S, `Rot took ${S.rotWeek} food from the back of the storeroom this week. Food past ${S.rotKeep || 0} spoils${cold ? ' even in the Cold Room' : ' without a Cold Room'}.`, 'bad');
      S.rotWeek = 0;
    }
    tidy(S);
    if (S.girlTalk != null && S.day - S.girlTalk <= 10 && S.day > S.girlTalk && Math.random() < .3) E.log(S, fresh(S, 'gtalk', GT));
    const a = S.qarc;
    if (a && a.st >= 4 && !S.qMid && S.day >= 190 && S.day <= 228 && home(S).length >= 2) { S.qMid = S.day; S.queue.push({ k: 'q_mid', p: {} }); }
    return r;
  };
  const dc0 = E.decide;
  E.decide = (S, i) => { S0 = S; const r = dc0(S, i); if (!E.humans(S).length) { S.over = true; S.queue = S.queue.filter(q => q.k === 'q_end'); } else tidy(S); return r; };
})();

// ===== Balance round 4: the danger comes in the middle of the year (Days 30 to 140), not only at the end
(() => {
  const E = globalThis.ShelterEngine, d0 = E.dif;
  E.dif = S => { const d = d0(S); if (!S || !S.day || S.day < 30) return d; if (S.day > 200) return Object.assign({}, d, { raidB: d.raidB * (1 + (E.lure ? E.lure(S) : 0) * .25) }); if (S.day > 140) return d; return Object.assign({}, d, { raid: d.raid * 1.08, raidB: d.raidB * 1.04 }); }; // after Day 200 a full stockpile draws bigger raids
})();

// ===== Crime in the shelter: one thief and one murderer per run (Buddy 2026-11-17 and 2026-11-19).
// Both are picked from your real residents each run. Clues come in over weeks; checks are TOFU dice, shown on the cards.
// Accuse the wrong person and it costs you. Invented for this game, for DB's review.
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)], shuf = a => a.slice().sort(() => Math.random() - .5);
  const byId = (S, id) => S.people.find(o => o.id === id);
  const live = (S, id) => { const p = byId(S, id); return p && p.alive && !p.left ? p : null; };
  const home = S => E.humans(S).filter(o => !o.away && !o.sealed);
  const pr = (p, a, b) => (p.he === 'he' ? a : b), He = p => pr(p, 'He', 'She'), he = p => pr(p, 'he', 'she'), him = p => pr(p, 'him', 'her'), his = p => pr(p, 'his', 'her');
  const names = a => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0] || 'nobody');
  const skN = s => (D.SKILL_NAME && D.SKILL_NAME[s]) || s[0].toUpperCase() + s.slice(1);
  const best = (S, sk, not) => home(S).filter(o => !o.damned && !(not || []).includes(o.id)).sort((a, b) => E.pool(b, sk) - E.pool(a, sk))[0];
  const check = (p, sk, dr) => { const r = E.roll(Math.max(1, E.pool(p, sk)), dr); r.txt = `${p.name}, ${skN(sk)}: ${r.dice.length} dice vs DR ${dr}, rolled ${r.dice.join(' ')}. ${r.succ ? `${r.succ} success${r.succ > 1 ? 'es' : ''}` : 'No successes'}.`; return r; };
  const temper = p => (E.life ? E.life(p).temper : '');
  const order = (S, v) => { S.order = Math.max(0, Math.min(100, (S.order ?? 55) + (v < 0 ? v / 2 : v))); };
  const sus = (S, c) => c.sus.filter(id => live(S, id));
  const susTxt = (S, c) => `Suspects: ${names(sus(S, c).map(id => byId(S, id).name))}.`;
  const cut = (S, c) => { const inn = sus(S, c).filter(id => id !== c.id); if (!inn.length) return null; const x = pick(inn); c.sus = c.sus.filter(id => id !== x); return byId(S, x); };
  const accuseChoices = (S, c) => sus(S, c).map(id => `Accuse ${byId(S, id).name}`);

  // ---------------- the thief
  const T_MOTIVE = [
    x => `It comes out in pieces. ${x.name} has been feeding someone outside, through the vent grate at night: a sister, ${he(x)} says, who would not pass the hatch interview. Nobody has seen the sister. The food is always gone by morning.`,
    x => `${x.name} had a bag packed under the bunk: food, water tablets, a map with the coast circled. "When it falls apart down here," ${he(x)} says, "I'm not going to be the one who stayed."`,
    x => `${x.name} wasn't eating it. ${He(x)} was trading it, one can at a time, to the Damned in Quarantine, for stories about the people they used to be.`,
    x => `${x.name} cries before anyone asks a question. ${He(x)} went eleven days without food before the shelter, and ${he(x)} says some nights the fear is louder than everything else.`,
    x => `${x.name} shrugs. "Everybody takes. I'm just the one who got caught." Nobody can tell if ${he(x)} believes it.`,
  ];
  const thiefStart = S => {
    const pool = home(S).filter(o => !o.damned && o !== (E.leader && E.leader(S)));
    if (pool.length < 5) return;
    const w = pool.flatMap(o => Array(['hoarder', 'schemer', 'cynic'].includes(temper(o)) ? 4 : 1).fill(o)), x = pick(w);
    S.thiefArc = { id: x.id, sus: shuf([x.id, ...shuf(pool.filter(o => o !== x)).slice(0, 3).map(o => o.id)]), start: S.day, taken: 0, clue: 0, next: S.day + 3, kinds: shuf(['prints', 'wrapper', 'witness']) };
  };
  const thiefDay = S => {
    if (!S.thiefDay) S.thiefDay = 12 + Math.floor(Math.random() * 25);
    if (!S.thiefArc && !S.thiefDone && S.day >= S.thiefDay) thiefStart(S);
    const c = S.thiefArc; if (!c || c.done) return;
    const x = live(S, c.id); if (!x) { c.done = 1; S.thiefDone = 1; if (c.clue) E.log(S, 'The stores stopped coming up short. Whoever it was, it stopped.'); return; }
    if (!x.away && S.res.food > 3 && S.day % 2 === 0) { S.res.food -= 1; c.taken += 1; }
    if (S.day === c.start + 3) E.log(S, 'The stores are short again. Somebody counted twice to be sure.', 'bad');
    if (S.queue.some(q => q.k && q.k.startsWith('crime_'))) return;
    if (S.day >= c.next && c.clue < 3) { c.next = S.day + 5 + Math.floor(Math.random() * 4); S.queue.push({ k: 'crime_tclue', p: { kind: c.kinds[c.clue] } }); c.clue++; return; }
    if (c.clue >= 2 && !c.trapped && S.day >= c.next) { c.trapped = 1; c.next = S.day + 6; S.queue.push({ k: 'crime_trap', p: {} }); return; }
    if (S.day - c.start > 55) { c.done = 1; S.thiefDone = 1; const got = Math.min(S.res.food, 20); S.res.food -= got; E.depart(S, x, 'Walked out one night with a full pack. The stores were short for good reason after all.'); E.say(S, 'Gone in the night', `${x.name} was gone in the morning, and so were ${got} food and the good flashlight. That was the end of the missing cans.\n\nIn ${x.name}'s bunk there was a note: "Sorry. Not sorry."`, { p: x.sprite }); }
  };
  EV.crime_tclue = {
    view: (S, p) => {
      const c = S.thiefArc, x = c && live(S, c.id); if (!x) return { title: 'The stores', text: 'Nothing else went missing.', art: {}, choices: ['Good'] };
      const intro = { prints: 'Somebody spilled flour by the storeroom door last week and nobody swept it up. This morning there are footprints in it.', wrapper: 'A torn ration wrapper turned up in the Bunks, licked clean. Rations are eaten at the table, by rule.', witness: 'Somebody on night watch says they saw a shape by the stores around three in the morning, and it went back toward the Bunks.' }[p.kind];
      const ask = { prints: [`Have someone read the prints (Survival)`, 'Sweep them up and say nothing'], wrapper: ['Search every bunk', 'Leave it. Searching bunks breaks trust'], witness: ['Have them describe it, slowly (Analysis)', 'Tell them they were dreaming'] }[p.kind];
      return { title: `Missing food: ${c.taken} gone so far`, text: `${intro}\n\n${susTxt(S, c)}`, art: {}, choices: [...ask, 'Call everyone together and accuse someone'] };
    },
    pick: (S, p, i) => {
      const c = S.thiefArc, x = c && live(S, c.id); if (!x) return;
      if (i === 2) return S.queue.unshift({ k: 'crime_accuse', p: { t: 'thief' } });
      if (i === 1) { if (p.kind === 'wrapper') home(S).forEach(o => { if (o.stress > 0) o.stress -= 0; }); return E.log(S, p.kind === 'witness' ? 'The watch was told they dreamed it. They stopped reporting things.' : 'Left alone. The stores came up short again that night.'); }
      if (p.kind === 'wrapper') {
        order(S, -3); const planted = Math.random() < .25, inn = sus(S, c).filter(id => id !== c.id), wrong = planted && inn.length ? byId(S, pick(inn)) : null;
        if (wrong) return E.say(S, 'The bunk search', `Everybody stood by their bunk while it was turned over. Under ${wrong.name}'s mattress: six empty cans, rinsed.\n\n${wrong.name} goes white. "Those aren't mine. Somebody put those there."\n\n${susTxt(S, c)}`, { p: wrong.sprite });
        const y = cut(S, c); return E.say(S, 'The bunk search', `Everybody stood by their bunk while it was turned over. Nobody's was clean, exactly, but ${x.name}'s smelled of peaches, and there has not been a peach ration in a month.${y ? `\n\n${y.name} was on watch all week and is cleared.` : ''}\n\n${susTxt(S, c)}`, { p: x.sprite });
      }
      const sk = p.kind === 'prints' ? 'survival' : 'analysis', w = best(S, sk, sus(S, c)) || best(S, sk); if (!w) return;
      const r = check(w, sk, 7);
      if (!r.succ) { E.addStress(S, w, 1); return E.say(S, 'Nothing', `${r.txt}\n\n${p.kind === 'prints' ? 'Just footprints. Boots like everyone\'s boots.' : 'A shape. Medium height. Moving fast. It could have been anyone, and everyone knows it.'}\n\n${susTxt(S, c)}`); }
      const y = cut(S, c), why = p.kind === 'prints' ? (y ? `The prints are too small for ${y.name}'s boots.` : 'The prints match nobody new.') : (y ? `${w.name} remembers the limp, or the lack of one. It was not ${y.name}.` : 'Nothing new.');
      E.say(S, p.kind === 'prints' ? 'The prints' : 'The witness', `${r.txt}\n\n${why}\n\n${susTxt(S, c)}`);
    },
  };
  EV.crime_trap = {
    view: (S, p) => { const c = S.thiefArc; const a = best(S, 'analysis', c ? sus(S, c) : []), g = best(S, 'engineering', c ? sus(S, c) : []); p.a = a && a.id; p.g = g && g.id; return { title: 'Set a trap', text: `${c ? c.taken : 0} food gone so far. Whoever it is, they come at night.\n\n${c ? susTxt(S, c) : ''}`, art: {}, choices: [a ? `Mark the cans with a scratch only you know (${a.name}, Analysis vs DR 7)` : 'Mark the cans', g ? `Rig a bell on the storeroom door (${g.name}, Engineering vs DR 6)` : 'Rig a bell', 'Call everyone together and accuse someone'] }; },
    pick: (S, p, i) => {
      const c = S.thiefArc, x = c && live(S, c.id); if (!x) return;
      if (i === 2) return S.queue.unshift({ k: 'crime_accuse', p: { t: 'thief' } });
      const w = live(S, i === 0 ? p.a : p.g); if (!w) return;
      const r = check(w, i === 0 ? 'analysis' : 'engineering', i === 0 ? 7 : 6);
      if (r.succ) return S.queue.unshift({ k: 'crime_caught', p: { t: 'thief', how: `${r.txt}\n\n${i === 0 ? `Two days later a marked can turned up in ${x.name}'s coat.` : `The bell went at four in the morning. ${x.name} was standing in the storeroom with an armful of cans and nowhere to put them.`}` } });
      E.say(S, 'The trap', `${r.txt}\n\n${i === 0 ? 'The marked cans went missing and never turned up anywhere.' : 'The bell never rang. In the morning it had been carefully muffled with a sock.'} Whoever it is, they are careful.`);
      c.trapped = 0; c.next = S.day + 6;
    },
  };

  // ---------------- the murderer
  const M_MOTIVE = {
    hothead: x => `${x.name} doesn't deny it. "${He(x)} wouldn't stop. Every day, the same thing, and nobody did anything." ${He(x)} looks at ${his(x)} hands like they belong to someone else.`,
    schemer: x => `${x.name} had it all worked out: one fewer mouth, one more bunk, and the person who saw ${him(x)} at the stores gone. ${He(x)} explains it calmly, like a budget.`,
    zealot: x => `"They were turning," ${x.name} says. "I saw it in the eyes. I did what nobody else had the courage to do." There was nothing wrong with the eyes.`,
    cynic: x => `"You'd all have done it eventually," ${x.name} says. "I just didn't wait for a vote."`,
    other: x => `It was about someone left outside, weeks ago, on a run. ${x.name} begged them to go back. They didn't. ${x.name} never forgot whose call it was.`,
  };
  const murderStart = S => {
    const pool = home(S).filter(o => !o.damned); if (pool.length < 6) return;
    const w = pool.flatMap(o => Array(['hothead', 'schemer', 'zealot', 'cynic'].includes(temper(o)) ? 4 : 1).fill(o)), k = pick(w);
    const vics = pool.filter(o => o !== k).sort((a, b) => E.rel(S, k, a) - E.rel(S, k, b)), v = vics[0];
    S.murder = { id: k.id, sus: shuf([k.id, ...shuf(pool.filter(o => o !== k && o !== v)).slice(0, 3).map(o => o.id)]), start: S.day, known: 0, n: 1, used: [], next: 0 };
    E.kill(S, v, 'Found at the bottom of the ladder.');
    S.queue.forEach(q => { if (q.k === 'body') q.p.ids = q.p.ids.filter(id => id !== v.id); }); S.queue = S.queue.filter(q => q.k !== 'body' || q.p.ids.length);
    S.queue.push({ k: 'crime_mbody', p: { v: `${v.name} ${v.last}`, vn: v.name, vs: v.sprite, he: v.he } });
  };
  const strike = S => {
    const c = S.murder, k = live(S, c.id); if (!k || k.away) return;
    const v = home(S).filter(o => o !== k && !o.damned).sort((a, b) => E.rel(S, k, a) - E.rel(S, k, b))[0]; if (!v) return;
    if (Math.random() < .55) { E.kill(S, v, 'Killed in the night. The shelter knows how now.'); c.n++; S.queue.push({ k: 'crime_again', p: { v: v.name, vs: v.sprite, lived: 0 } }); }
    else { v.hp = Math.max(1, v.hp - 5); const y = cut(S, c); S.queue.push({ k: 'crime_again', p: { v: v.name, vs: v.sprite, lived: 1, cleared: y ? y.name : '' } }); }
    c.known = 1;
  };
  const murderDay = S => {
    if (!S.murderDay) S.murderDay = 40 + Math.floor(Math.random() * 50);
    if (!S.murder && !S.murderDone && S.day >= S.murderDay) return murderStart(S);
    const c = S.murder; if (!c || c.done) return;
    if (!live(S, c.id)) { c.done = 1; S.murderDone = 1; if (c.known) E.log(S, 'The killings stopped. Nobody will ever be sure why.'); return; }
    if (S.queue.some(q => q.k && q.k.startsWith('crime_'))) return;
    if (!c.known) { if (S.day - c.start >= 12 && !c.again) { c.again = 1; strike(S); } return; }
    if (S.day >= c.next) { c.next = S.day + 4 + Math.floor(Math.random() * 3); S.queue.push({ k: 'crime_minv', p: {} }); return; }
    if ((c.strikes || 0) < 2 && S.day - (c.last ?? c.start) >= 12 && Math.random() < .25) { c.last = S.day; c.strikes = (c.strikes || 0) + 1; strike(S); return; }
    if (S.day - c.start > 70) { const k = live(S, c.id); c.done = 1; S.murderDone = 1; E.depart(S, k, 'Disappeared one night. The killings stopped after that.'); E.say(S, 'Gone', `One morning ${k.name}'s bunk was empty and the hatch was unbolted from the inside. The killings stopped after that.

Nobody says it out loud. Everybody knows.`, { p: k.sprite }); }
  };
  EV.crime_mbody = {
    view: (S, p) => { const m = best(S, 'medicine', S.murder ? [S.murder.id] : []); p.m = m && m.id; return { title: `${p.vn} fell`, text: `They found ${p.vn} at the bottom of the ladder this morning, neck at a wrong angle. The rungs are wet. It happens.\n\nIt happens. Doesn't it?`, art: { p: p.vs }, choices: [m ? `Have ${m.name} look at the body (Medicine vs DR 7)` : 'Look at the body yourself', 'Bury them. It was an accident'] }; },
    pick: (S, p, i) => {
      const c = S.murder; if (!c) return;
      if (i === 1) return E.log(S, `${p.vn} was buried under the floor. A terrible accident, everyone agreed.`);
      const m = live(S, p.m); const r = m ? check(m, 'medicine', 7) : E.roll(1, 7);
      if (!r.succ) return E.say(S, 'An accident', `${r.txt || ''}\n\nA broken neck from a bad fall. That's all anybody could see.`);
      c.known = 1; c.next = S.day + 1; S.queue.forEach(q => { });
      home(S).forEach(o => E.addStress(S, o, 2)); order(S, -5);
      E.say(S, 'Not an accident', `${r.txt}\n\n${m ? m.name : 'Somebody'} rolls the collar down and goes quiet. Bruises on the throat, four on one side and one on the other. Somebody held ${p.vn} by the neck before the fall.\n\nSomeone in this shelter did this. ${susTxt(S, c)}`, { p: p.vs });
    },
  };
  EV.crime_again = {
    view: (S, p) => { const c = S.murder; return { title: p.lived ? `Someone went for ${p.v}` : `${p.v} is dead`, text: p.lived ? `${p.v} woke up with hands around ${'their'} throat in the dark and fought, and screamed, and whoever it was ran. ${p.v} is hurt but alive, and has a scratch-mark story to tell.${p.cleared ? `\n\nWhoever it was had both hands free, so it was not ${p.cleared}, who sleeps with a cast.` : ''}\n\n${c ? susTxt(S, c) : ''}` : `${p.v} was found in the morning in the corridor, and nobody can call this one an accident. ${c && c.n > 2 ? 'That makes ' + c.n + '.' : 'There is a killer down here, and everybody knows it now.'}\n\n${c ? susTxt(S, c) : ''}`, art: { p: p.vs }, choices: ['Keep looking', 'Call everyone together and accuse someone'] }; },
    pick: (S, p, i) => { home(S).forEach(o => E.addStress(S, o, 2)); if (i === 1) S.queue.unshift({ k: 'crime_accuse', p: { t: 'murder' } }); },
  };
  const LEADS = {
    question: { l: 'Question everyone, one at a time (Insight)', sk: 'insight', dr: 7, ok: (S, c, y) => (y ? `${y.name}'s story holds up, every detail, three times over. ${y.name} is cleared.` : 'Nothing new.'), no: 'Everyone says they were asleep. Everyone looks tired. Nobody looks guilty, which is worse.' },
    logs: { l: 'Check who was at their post that night (Analysis)', sk: 'analysis', dr: 6, ok: (S, c, y) => (y ? `The watch log puts ${y.name} on the Gate all night, with two witnesses. Cleared.` : 'Nothing new.'), no: 'The watch log has gaps nobody can explain. Half the shelter could have been anywhere.' },
    search: { l: 'Search the bunks and the vents (Survival)', sk: 'survival', dr: 7, ok: (S, c, y, k) => (Math.random() < .7 ? `Wrapped in a sock in the vent above ${k.name}'s bunk: a kitchen knife nobody reported missing.` : `A torn sleeve, stuffed behind the boiler. ${y ? `It is too small for ${y.name}, who is cleared.` : 'It could be anyone\'s.'}`), no: 'The search turns up a lot of things people should not have, and nothing that matters.' },
    dog: { l: 'Walk the dog past everyone', sk: null, ok: (S, c, y, k) => `The dog walks the line, tail low, sniffing hands. At ${k.name} it stops, backs away, and will not come closer, no matter how anybody calls it.`, no: '' },
    quest: { l: 'Ask Q.U.E.S.T. what she heard', sk: null, ok: (S, c, y) => (y ? `"I heard footsteps," she says. "Heavy. Not ${y.name}'s. ${y.name} walks like an apology." Cleared, if you trust her.` : '"I hear everything," she says. "I keep most of it."'), no: '' },
  };
  EV.crime_minv = {
    view: (S, p) => {
      const c = S.murder; if (!c) return { title: 'Quiet', text: 'Nothing new.', art: {}, choices: ['Understood'] };
      const dog = E.dogs && E.dogs(S).some(d => d.alive && !d.pup), q = S.qarc && S.qarc.st >= 1;
      p.ls = Object.keys(LEADS).filter(k => !c.used.includes(k) && (k !== 'dog' || dog) && (k !== 'quest' || q)).slice(0, 3);
      return { title: 'The investigation', text: `${c.n > 1 ? `${c.n} dead.` : 'One dead.'} Everyone is sleeping in pairs now, and nobody wants to be paired with the wrong person.\n\n${susTxt(S, c)}`, art: {}, choices: [...p.ls.map(k => LEADS[k].l), 'Call everyone together and accuse someone'] };
    },
    pick: (S, p, i) => {
      const c = S.murder, k = c && live(S, c.id); if (!k) return;
      if (i >= (p.ls || []).length) return S.queue.unshift({ k: 'crime_accuse', p: { t: 'murder' } });
      const key = p.ls[i], L = LEADS[key]; c.used.push(key);
      if (!L.sk) { const y = key === 'quest' ? cut(S, c) : null; return E.say(S, key === 'dog' ? 'The dog knows' : 'Q.U.E.S.T. heard', L.ok(S, c, y, k) + `\n\n${susTxt(S, c)}`); }
      const w = best(S, L.sk, sus(S, c)) || best(S, L.sk); if (!w) return;
      const r = check(w, L.sk, L.dr);
      if (!r.succ) return E.say(S, 'No closer', `${r.txt}\n\n${L.no}\n\n${susTxt(S, c)}`);
      const y = key === 'search' ? null : cut(S, c), y2 = key === 'search' ? cut(S, c) : null;
      E.say(S, 'A lead', `${r.txt}\n\n${L.ok(S, c, y || y2, k)}\n\n${susTxt(S, c)}`);
    },
  };

  // ---------------- accusing, and what happens after
  EV.crime_accuse = {
    view: (S, p) => { const c = p.t === 'thief' ? S.thiefArc : S.murder; if (!c) return { title: 'Nothing', text: 'It is over.', art: {}, choices: ['Understood'] }; p.ids = sus(S, c); return { title: p.t === 'thief' ? 'Who took the food?' : 'Who did it?', text: `Everyone in the Common Room. The leader stands up. Whoever you name, everyone will remember you named them.\n\n${susTxt(S, c)}`, art: {}, choices: [...p.ids.map(id => `It was ${byId(S, id).name}`), 'Not yet'] }; },
    pick: (S, p, i) => {
      const c = p.t === 'thief' ? S.thiefArc : S.murder; if (!c || i >= p.ids.length) return;
      const x = live(S, p.ids[i]); if (!x) return;
      if (x.id === c.id) return S.queue.unshift({ k: 'crime_caught', p: { t: p.t, how: `${x.name} doesn't say anything for a long time. Then ${he(x)} sits down on the floor, right there, in front of everyone.` } });
      order(S, -8); E.addStress(S, x, 4); home(S).forEach(o => { if (o !== x && E.addRel) E.addRel(S, x, o, -10); });
      c.sus = c.sus.filter(id => id !== x.id);
      E.say(S, 'Wrong', `${x.name} denies it, and keeps denying it, and in the end it is ${his(x)} word against nothing. ${p.t === 'thief' ? 'That night the stores came up short again, while ${x.name} was sitting in the Common Room with three people watching ${him(x)}.' : 'Two nights later the killer moved again, and ' + x.name + ' was in Quarantine with the door locked. It was never ' + x.name + '.'}\n\n${x.name} has not forgiven anyone, and probably never will.`.replace(/\$\{x\.name\}/g, x.name).replace(/\$\{him\(x\)\}/g, him(x)), { p: x.sprite });
      if (p.t === 'murder') { const c2 = S.murder; c2.last = S.day - 9; }
    },
  };
  EV.crime_caught = {
    view: (S, p) => {
      const c = p.t === 'thief' ? S.thiefArc : S.murder, x = c && live(S, c.id); if (!x) return { title: 'Over', text: 'It is over.', art: {}, choices: ['Understood'] };
      if (p.t === 'thief') { if (p.m == null) p.m = Math.floor(Math.random() * T_MOTIVE.length); return { title: `It was ${x.name}`, text: `${p.how}\n\n${T_MOTIVE[p.m](x)}\n\n${c.taken} food, all told.`, art: { p: x.sprite }, choices: ['Exile. Out the hatch, tonight', 'Half rations for a month, and everyone knows why', 'Forgive. Once', ...(E.leader && E.leader(S) && E.leader(S) !== x ? [`Let ${E.leader(S).name} decide`] : [])] }; }
      if (p.end == null) { const t = temper(x); p.end = t === 'hothead' ? 'fight' : t === 'schemer' || t === 'coward' ? 'run' : 'confess'; }
      const mot = (M_MOTIVE[temper(x)] || M_MOTIVE.other)(x);
      if (p.end === 'run' && !p.ran) return { title: `${x.name} runs`, text: `${p.how}\n\nThen ${x.name} is up and running for the ladder, for the hatch, for the rain.`, art: { p: x.sprite }, choices: ['Stop them at the ladder', 'Let them go. Lock the hatch behind them'] };
      if (p.end === 'fight' && !p.fought) return { title: `${x.name} fights`, text: `${p.how}\n\nThen ${x.name} has a knife out, and the Common Room is very small.`, art: { p: x.sprite }, choices: ['Everyone at once', 'Talk them down'] };
      return { title: `It was ${x.name}`, text: `${p.how}\n\n${mot}\n\n${c.n} dead.`, art: { p: x.sprite }, choices: ['Execute. Tonight, by the hatch', 'Exile. Out into the rain', 'Lock them in Quarantine for good'] };
    },
    pick: (S, p, i) => {
      const c = p.t === 'thief' ? S.thiefArc : S.murder, x = c && live(S, c.id); if (!x) return;
      const end = () => { c.done = 1; if (p.t === 'thief') S.thiefDone = 1; else S.murderDone = 1; };
      if (p.t === 'thief') {
        end(); S.res.food += Math.floor(c.taken / 3);
        if (i === 0) { order(S, 4); return E.depart(S, x, 'Exiled for stealing food.'); }
        if (i === 1) { order(S, 2); x.hunger = Math.max(x.hunger || 0, 1); E.addStress(S, x, 3); return E.log(S, `${x.name} eats last now, and less. Everybody watches ${him(x)} do it.`); }
        if (i === 2) { order(S, -3); x.stress = Math.max(0, x.stress - 2); if (Math.random() < .25) { S.thiefDone = 0; S.thiefArc = null; S.thiefDay = S.day + 30; } return E.log(S, `${x.name} was forgiven, in front of everyone. ${He(x)} cried. Not everyone believes it will last.`); }
        const L = E.leader(S); if (L) { order(S, L.level >= 4 ? 4 : 1); return E.depart(S, x, `Exiled by ${L.name} for stealing food.`); }
        return;
      }
      if (p.end === 'run' && !p.ran) {
        p.ran = 1;
        if (i === 1) { end(); order(S, -4); return E.depart(S, x, 'Ran into the rain after being named a murderer.'); }
        const w = best(S, 'athletics', [x.id]), r = w ? check(w, 'athletics', 7) : null;
        if (r && r.succ) { p.how = `${r.txt}\n\n${w.name} caught ${him(x)} on the third rung and dragged ${him(x)} back down.`; return S.queue.unshift({ k: 'crime_caught', p }); }
        end(); E.depart(S, x, 'Escaped up the ladder after being named a murderer.'); return E.say(S, 'Gone', `${r ? r.txt + '\n\n' : ''}${x.name} was through the hatch before anyone reached the ladder. Nobody went after ${him(x)}. Some nights you can hear somebody walking around up there.`);
      }
      if (p.end === 'fight' && !p.fought) {
        p.fought = 1;
        if (i === 1) { const w = best(S, 'insight', [x.id]) || best(S, 'negotiation', [x.id]), r = w ? check(w, 'insight', 8) : null; if (r && r.succ) { p.how = `${r.txt}\n\n${w.name} talks, low and steady, for a long time. The knife goes down.`; return S.queue.unshift({ k: 'crime_caught', p }); } }
        const t = home(S).filter(o => o !== x && !o.damned).sort((a, b) => E.pool(b, 'melee') - E.pool(a, 'melee')).slice(0, 3);
        const v = t[t.length - 1]; if (v && Math.random() < .35) { v.hp = Math.max(1, v.hp - 6); }
        p.how = `${v ? `${v.name} took a cut across the arm. ` : ''}It took three of them to get the knife away.`; return S.queue.unshift({ k: 'crime_caught', p });
      }
      end();
      if (i === 0) { order(S, 6); home(S).forEach(o => E.addStress(S, o, 1)); E.kill(S, x, 'Executed for murder.'); return; }
      if (i === 1) { order(S, 3); return E.depart(S, x, 'Exiled for murder.'); }
      if (E.seal(S, x)) { x.lifer = 1; order(S, 2); return E.log(S, `${x.name} is locked in Quarantine. Somebody slides food under the door twice a day. Nobody talks to ${him(x)}.`); }
      order(S, 3); E.depart(S, x, 'Exiled for murder. There was no cell to hold them.');
    },
  };

  // the sealed murderer never gets let out by accident
  const un0 = E.unseal; E.unseal = (S, p) => (p && p.lifer ? false : un0(S, p));

  const ed0 = E.endDay;
  E.endDay = S => { const d0 = S.day, r = ed0(S); if (S.day !== d0 && !S.over && E.humans(S).length) { thiefDay(S); murderDay(S); } return r; };
})();

// ===== More variety (Buddy 2026-11-19, "a lot more variety in game systems like meeting ppl at gate, murderer, events").
// Twelve new kinds of visitor at the hatch, and twenty-two new shelter events, each with a real choice. Invented for DB's review.
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const byId = (S, id) => S.people.find(o => o.id === id);
  const home = S => E.humans(S).filter(o => !o.away && !o.sealed && !o.damned);
  const pr = (p, a, b) => (p && p.he === 'he' ? a : b), He = p => pr(p, 'He', 'She'), he = p => pr(p, 'he', 'she'), him = p => pr(p, 'him', 'her'), his = p => pr(p, 'his', 'her');
  const skN = s => (D.SKILL_NAME && D.SKILL_NAME[s]) || s[0].toUpperCase() + s.slice(1);
  const best = (S, sk) => home(S).sort((a, b) => E.pool(b, sk) - E.pool(a, sk))[0];
  const check = (p, sk, dr) => { const r = E.roll(Math.max(1, E.pool(p, sk)), dr); r.txt = `${p.name}, ${skN(sk)}: ${r.dice.length} dice vs DR ${dr}, rolled ${r.dice.join(' ')}. ${r.succ ? `${r.succ} success${r.succ > 1 ? 'es' : ''}` : 'No successes'}.`; return r; };
  const order = (S, v) => { S.order = Math.max(0, Math.min(100, (S.order ?? 55) + (v < 0 ? v / 2 : v))); };
  const calm = (S, n) => home(S).forEach(o => { o.stress = Math.max(0, o.stress - n); });
  const fret = (S, n) => home(S).forEach(o => E.addStress(S, o, n));
  const beds = (S, n) => E.humans(S).length + n <= E.bedsOf(S) && E.roomFor(S);
  const join = (S, o, name) => { const p = E.addSurvivor(S, o || {}); if (p && name) p.name = name; return p; };
  const say = (S, t, x, a) => E.say(S, t, x, a || {});
  const has = (S, k, n) => (S.res[k] || 0) >= n;
  const gateGuard = S => { const g = S.rooms.find(r => r.type === 'gate'); return g ? E.workers(S, g)[0] : null; };
  const GATE = ['g_family', 'g_wounded', 'g_trader', 'g_reunion', 'g_soldier', 'g_prisoner', 'g_boy', 'g_doctor', 'g_preacher', 'g_parcel', 'g_twins', 'g_kids'];

  // ---------------- visitors at the hatch
  Object.assign(EV, {
    g_family: {
      chance: 1, when: S => S.day > 8 && beds(S, 2),
      view: (S, p) => { p.sur = p.sur || pick(D.SURNAMES || ['Reyes']); return { title: 'A family at the hatch', text: `A mother and her teenage son, the ${p.sur}s, soaked through. She does the talking. He holds a hammer like he has had to use it.\n\n"We work. Both of us. He's stronger than he looks." The boy says nothing. His knuckles are split.`, art: {}, choices: ['Take them both', 'Take the boy. Only the boy', 'Turn them away'] }; },
      pick: (S, p, i) => {
        if (i === 2) { fret(S, 1); return say(S, 'The porthole closes', 'She did not argue. She put her hand on the back of her son\'s neck and walked him away into the rain, and he looked back once.'); }
        const b = join(S, { cls: 'bruiser' }); if (b) b.last = p.sur;
        if (i === 0) { const m = join(S, { cls: 'survivor' }); if (m) m.last = p.sur; if (b && m && E.addRel) E.addRel(S, b, m, 60); return say(S, `The ${p.sur}s`, `They came down the ladder together and stood in the corridor holding hands like they were at a wedding. ${b ? b.name : 'The boy'} cried that night, once everyone was asleep. ${m ? m.name : 'His mother'} sat up with him.`); }
        if (b) { E.addStress(S, b, 5); return say(S, 'Only the boy', `${b.name} would not come down the ladder until his mother told him to. She said "go", and closed the hatch on herself. ${b.name} has not said a word since.`, { p: b.sprite }); }
      },
    },
    g_wounded: {
      chance: 1, when: S => S.day > 5 && beds(S, 1),
      view: (S, p) => { const m = best(S, 'medicine'); p.m = m && m.id; return { title: 'Blood on the hatch', text: 'Someone is slumped against the hatch, holding their side. There is a lot of blood in the rain, and it is red, not black. "Bitten?" you ask. "Shot," they say. "People. Not them."', art: {}, choices: [m && has(S, 'meds', 3) ? `Bring them in and operate (${m.name}, Medicine vs DR 8, 3 Med supplies)` : 'Bring them in and do what you can', 'Leave them a bottle of water and close the porthole'] }; },
      pick: (S, p, i) => {
        if (i === 1) { fret(S, 1); S.res.water = Math.max(0, S.res.water - 1); return say(S, 'The porthole closes', 'In the morning the bottle was empty, and the hatch was clean. The rain had seen to that.'); }
        const m = byId(S, p.m); let ok = Math.random() < .3, txt = '';
        if (m && has(S, 'meds', 3)) { S.res.meds -= 3; const r = check(m, 'medicine', 8); ok = r.succ >= 1; txt = r.txt + '\n\n'; }
        if (!ok) return say(S, 'On the table', `${txt}They got the bullet out. It did not matter. The stranger died on the Clinic table before anyone learned their name, and someone had to scrub the table after.`);
        const n = join(S, { cls: pick(['sharpshooter', 'scavenger', 'survivor']) }); if (n) { n.hp = Math.max(1, Math.floor(n.hp / 3)); n.stress = 4; }
        say(S, n ? `${n.name} lives` : 'They live', `${txt}They will live. When ${n ? n.name : 'they'} can talk, the first thing ${n ? he(n) : 'they'} says is the name of the people who shot ${n ? him(n) : 'them'}, and which road they use.`);
        S.noise = (S.noise || 0) + .2;
      },
    },
    g_trader: {
      chance: 1, when: S => S.day > 10,
      view: (S, p) => { if (!p.o) p.o = pick([['food', 15, 'rounds', 25], ['rounds', 30, 'meds', 5], ['scrap', 20, 'water', 20], ['food', 20, 'fuel', 12], ['water', 25, 'scrap', 18]]); const [a, an, b, bn] = p.o, R = D.RES_NAME; return { title: 'A trader', text: `A woman with a shopping cart full of everything, umbrella taped to the handle. She does not want in. She wants to deal.\n\n"${an} ${R[a].toLowerCase()} for ${bn} ${R[b].toLowerCase()}. I don't haggle, I don't wait, and I don't come back to the same hatch twice."`, art: {}, choices: [has(S, a, an) ? `Deal: give ${an} ${R[a].toLowerCase()}, get ${bn} ${R[b].toLowerCase()}` : `You don't have ${an} ${R[a].toLowerCase()}`, 'Ask what else she has heard (Negotiation vs DR 7)', 'No deal'] }; },
      pick: (S, p, i) => {
        const [a, an, b, bn] = p.o;
        if (i === 0 && has(S, a, an)) { S.res[a] -= an; S.res[b] = (S.res[b] || 0) + bn; return E.log(S, `Traded ${an} ${D.RES_NAME[a].toLowerCase()} for ${bn} ${D.RES_NAME[b].toLowerCase()} at the hatch.`, 'good'); }
        if (i === 1) { const w = best(S, 'negotiation'); if (!w) return; const r = check(w, 'negotiation', 7); if (r.succ) { S.radio = (S.radio || 0) + 60; return say(S, 'What she heard', `${r.txt}\n\nShe tells ${w.name} about a pharmacy nobody has touched, and a road the raiders don't use. The radio crew writes it all down.`); } return say(S, 'No sale', `${r.txt}\n\n"Information costs," she says, and she is gone.`); }
      },
    },
    g_reunion: {
      chance: 1, when: S => S.day > 12 && beds(S, 1) && home(S).length >= 3,
      view: (S, p) => { if (p.id == null) { const x = pick(home(S)); p.id = x.id; p.rel = pick(['brother', 'sister', 'best friend', 'husband', 'wife', 'cousin']); p.mim = Math.random() < .15; } const x = byId(S, p.id); if (!x) return { title: 'Gone', text: 'Whoever it was has gone.', art: {}, choices: ['Understood'] }; const L = E.life ? E.life(x) : {}; return { title: `Someone asking for ${x.name}`, text: `A voice at the porthole says ${x.name}'s full name. ${x.name} goes to the glass and then makes a sound nobody has heard ${him(x)} make.\n\n"That's my ${p.rel}. From ${L.from || 'home'}. I thought... I watched..."\n\nThe ${p.rel} is smiling. ${p.mim ? 'Smiling a lot.' : 'Crying, too.'}`, art: { p: x.sprite }, choices: [`Open the hatch for ${x.name}'s ${p.rel}`, 'Check them first (Insight vs DR 7)', 'No. Not even for this'] }; },
      pick: (S, p, i) => {
        const x = byId(S, p.id); if (!x || !x.alive) return;
        if (i === 1) { const g = gateGuard(S) || best(S, 'insight'); if (g) { const r = check(g, 'insight', 7); if (r.succ && p.mim) { E.addStress(S, x, 5); return say(S, 'It was not them', `${r.txt}\n\n${g.name}: "Ask it something only your ${p.rel} would know." ${x.name} does. It answers perfectly, in a voice that is perfect, and that is how ${g.name} knows. Nobody's family remembers everything perfectly.\n\n${x.name} watched it walk away. It waved.`); } if (r.succ) { say(S, 'They check out', `${r.txt}\n\nIt is really them.`); } else if (!p.mim) say(S, 'Hard to tell', `${r.txt}\n\nNobody can tell anything through the rain on the glass. ${x.name} is already opening the hatch.`); } }
        if (i === 2) { E.addStress(S, x, 6); if (E.addRel) { const L = E.leader && E.leader(S); if (L && L !== x) E.addRel(S, x, L, -40); } return say(S, 'No', `${x.name} stood at the porthole until the ${p.rel} gave up and left. Then ${x.name} went to ${his(x)} bunk and stayed there for two days.`, { p: x.sprite }); }
        if (p.mim) { const m = E.named('Mimic Survivor', Math.max(3, Math.ceil(S.day / 15))); if (m) { const f = E.fight(S, home(S).slice(0, 4), [m], { where: 'the hatch', inside: true }); E.addStress(S, x, 6); return say(S, 'It was never them', `It hugged ${x.name} for a long time. Then it tried to keep hugging, harder, and harder.`, { m: 'mimic-survivor', fight: f }); } }
        const n = join(S, {}); if (n) { n.last = x.last; if (E.addRel) E.addRel(S, n, x, 80); x.stress = 0; }
        order(S, 2); say(S, 'Found', `${x.name} and ${his(x)} ${p.rel} sat on the floor by the ladder until morning, talking about people neither of them will see again. It was the best night anyone has had down here.`, { p: x.sprite });
      },
    },
    g_soldier: {
      chance: 1, when: S => S.day > 20 && beds(S, 1),
      view: () => ({ title: 'A soldier at the hatch', text: 'Full kit, rifle slung, name tape torn off. "By order of the regional authority, open this hatch." There is no regional authority. He knows it, and he knows you know it. He says it anyway, like he needs one of you to believe it.', art: {}, choices: ['Let him in. A rifle is a rifle', 'Let him in, but the rifle goes to the armory', 'Tell him there is no authority any more'] }),
      pick: (S, p, i) => {
        if (i === 2) { if (Math.random() < .35) { S.threat = { groups: ['human'], known: true }; return say(S, 'He did not take it well', 'He stood very still. Then he said "Understood", and walked off toward the road where the trucks are. Tonight, something is coming.'); } return say(S, 'He sat down', 'He sat down in the rain and took his helmet off and did not say anything at all. In the morning he was gone.'); }
        const n = join(S, { cls: 'sharpshooter' }); if (!n) return;
        if (i === 1) { S.res.rounds += 20; E.addStress(S, n, 3); return say(S, `${n.name}, no rank`, `${n.name} handed over the rifle and stood there with empty hands like they did not know what to do with them. 20 rounds went into the stores.`, { p: n.sprite }); }
        order(S, -4); n.level = Math.min(10, n.level + 1); say(S, `${n.name}, no rank`, `${n.name} sleeps with the rifle and calls the leader "sir" or "ma'am" regardless. People are not sure if that is comforting.`, { p: n.sprite });
      },
    },
    g_prisoner: {
      chance: 1, when: S => S.day > 15 && beds(S, 1),
      view: () => ({ title: 'Two at the hatch', text: 'Two men. One has the other\'s wrists zip-tied and a knife at his back. "He killed my brother on the bridge," the first one says. "I want somewhere to keep him till I decide." The prisoner says, quite calmly, "His brother had it coming. Ask him what they did."', art: {}, choices: ['Take the one with the knife', 'Cut the prisoner loose and take him', 'Neither. Close the porthole'] }),
      pick: (S, p, i) => {
        if (i === 2) return say(S, 'The porthole closes', 'Through the steel, a little later, a single scream. Then just rain.');
        const n = join(S, { cls: i === 0 ? 'bruiser' : 'scavenger' });
        if (i === 0) { if (n) E.addStress(S, n, 4); return say(S, 'One came in', `The prisoner was left tied to the hatch railing. In the morning the ties were cut and he was gone. ${n ? n.name : 'The other man'} says he did not do it. Nobody asks.`); }
        if (n) { n.perks = n.perks || []; if (Math.random() < .4 && S.thiefDone !== 1 && !S.thiefArc) { S.thiefDay = S.day + 5; } }
        say(S, 'One came in', `The man with the knife watched you open the hatch for the man he had tied up. He said "You'll see," and walked away. ${n ? n.name : 'The prisoner'} thanked everyone, one by one, very politely.`);
      },
    },
    g_boy: {
      chance: 1, when: S => S.day > 10 && beds(S, 1),
      view: () => ({ title: 'A boy at the hatch', text: 'A boy, maybe twelve, with a cereal box full of batteries. He keeps glancing behind him at the road. "It\'s not her," he says before anyone asks. "I\'m not her. I know what you\'re thinking. Check my teeth if you want."', art: {}, choices: ['Check his teeth, then let him in', 'Let him in. He\'s a kid', 'You can\'t risk it. Not after the girl'] }),
      pick: (S, p, i) => {
        if (i === 2) { fret(S, 2); return say(S, 'The porthole closes', 'He left the batteries on the hatch. Thirty-one of them. He had counted.'); }
        S.res.scrap += 4; const n = join(S, { cls: 'scavenger', level: 1 });
        if (n) { n.stress = 2; calm(S, 1); }
        say(S, 'A kid', `${i === 0 ? 'Normal teeth. Two missing. ' : ''}${n ? n.name : 'The boy'} eats like he has never eaten before and falls asleep sitting up. Everyone moves a little quieter the next day.`, n ? { p: n.sprite } : {});
      },
    },
    g_doctor: {
      chance: 1, when: S => S.day > 15 && beds(S, 1),
      view: () => ({ title: 'A doctor, with terms', text: 'A surgeon, she says, and her bag says it too. "I will come in on terms. A bed of my own. Double rations. And nobody tells me who to treat first."', art: {}, choices: ['Accept her terms', 'Let her in, but on your terms (Negotiation vs DR 8)', 'Nobody gets double rations down here'] }),
      pick: (S, p, i) => {
        if (i === 2) { order(S, 2); return say(S, 'No terms', 'She said "your loss" and meant it. A week later, somebody needed a surgeon.'); }
        let terms = i === 0; let txt = '';
        if (i === 1) { const w = best(S, 'negotiation'); if (w) { const r = check(w, 'negotiation', 8); txt = r.txt + '\n\n'; if (!r.succ) terms = true; } }
        const n = join(S, { cls: 'medic' }); if (!n) return; n.level = Math.min(10, n.level + 2); S.res.meds += 4;
        if (terms) { n.vip = 1; order(S, -5); return say(S, `Dr. ${n.last}`, `${txt}${n.name} eats twice and sleeps alone and is the best medic you have ever had. People hate ${him(n)} a little, and line up for ${him(n)} anyway.`, { p: n.sprite }); }
        say(S, `Dr. ${n.last}`, `${txt}${n.name} came down the ladder on the same terms as everyone else, and complained about it for a week, and stitched everyone who needed it.`, { p: n.sprite });
      },
    },
    g_preacher: {
      chance: 1, when: S => S.day > 18 && beds(S, 1),
      view: () => ({ title: 'A preacher', text: 'A tall man in a black coat with a Bible held together by duct tape. "I don\'t need food. I need a congregation. You look like you need a sermon."', art: {}, choices: ['Let him in to preach', 'Let him in, but no sermons', 'Close the porthole'] }),
      pick: (S, p, i) => {
        if (i === 2) return E.log(S, 'The preacher preached at the hatch for an hour anyway, then left.');
        const n = join(S, { cls: 'survivor' }); if (!n) return;
        if (i === 0) { order(S, 6); calm(S, 1); if (Math.random() < .3) S.cultSeed = S.day; return say(S, 'Sunday', `${n.name} preached that night in the Common Room, about floods and arks and staying below. Half the shelter came. Some of them came back the next night, too.`, { p: n.sprite }); }
        E.addStress(S, n, 2); say(S, 'No sermons', `${n.name} agreed, and kept to it, mostly. He prays out loud in his bunk. It carries.`, { p: n.sprite });
      },
    },
    g_parcel: {
      chance: 1, when: S => S.day > 6,
      view: () => ({ title: 'Something left on the hatch', text: 'Nobody knocked. In the morning there is a parcel on the hatch, wrapped in a garbage bag, tied with a shoelace. On top, in marker: FOR THE PEOPLE DOWN THERE.', art: {}, choices: ['Bring it in and open it', 'Leave it. Nobody leaves gifts any more'] }),
      pick: (S, p, i) => {
        if (i === 1) return E.log(S, 'The parcel sat on the hatch for three days. Then it was gone.');
        const r = Math.random();
        if (r < .5) { const k = pick(['food', 'meds', 'rounds', 'water']), v = { food: 12, meds: 4, rounds: 20, water: 15 }[k]; S.res[k] += v; return say(S, 'A gift', `${v} ${D.RES_NAME[k].toLowerCase()}, and a note: "From the house on the hill. We're leaving. Good luck."`); }
        if (r < .8) { fret(S, 1); return say(S, 'A warning', 'Inside: a photo of your hatch, taken from the treeline. On the back: the number of people who went in and out, last Tuesday. It is right.'); }
        const v = pick(home(S)); if (v && E.expose) E.expose(S, v, 1, 6, 'the parcel'); say(S, 'A trap', `It was full of black rain, in a balloon, and it burst in ${v ? v.name : 'somebody'}'s hands.`);
      },
    },
    g_twins: {
      chance: 1, when: S => S.day > 25 && beds(S, 2),
      view: () => ({ title: 'Twins', text: 'Two women at the porthole, the same face, the same coat, the same scar through the same eyebrow. They finish each other\'s sentences. One of them blinks a fraction of a second after the other, every time.', art: {}, choices: ['Take them both', 'Take only the one who blinks first', 'Neither'] }),
      pick: (S, p, i) => {
        if (i === 2) return E.log(S, 'The twins left together, walking in step. Exactly in step.');
        const a = join(S, { cls: 'scavenger' });
        if (i === 1) { return say(S, 'One twin', `The other one did not argue. She just watched ${a ? a.name : 'her sister'} go down the ladder, and then she smiled with too many teeth and walked into the dark.\n\n${a ? a.name : 'Her sister'} says she never had a twin.`); }
        const m = E.named('Mimic Survivor', Math.max(3, Math.ceil(S.day / 15))); if (!m) return; const f = E.fight(S, home(S).slice(0, 4), [m], { where: 'the Bunks', inside: true });
        say(S, 'Only one twin', 'At three in the morning one of them stopped pretending.', { m: 'mimic-survivor', fight: f });
      },
    },
    g_kids: {
      chance: 1, when: S => S.day > 30 && beds(S, 2),
      view: () => ({ title: 'Two kids and a dog', text: 'A brother and sister, maybe sixteen and fourteen, with a skinny shepherd dog on a rope. "The dog stays with us," the girl says. "That\'s the deal. All three or none."', art: {}, choices: ['All three', 'None'] }),
      pick: (S, p, i) => {
        if (i === 1) { fret(S, 1); return E.log(S, 'The kids and their dog walked away. Somebody watched them all the way to the treeline.'); }
        const a = join(S, { cls: 'scavenger', level: 1 }), b = join(S, { cls: 'survivor', level: 1 }); if (a && b) { b.last = a.last; if (E.addRel) E.addRel(S, a, b, 70); }
        if (E.newDog) { const d = E.newDog(S, {}); if (a && E.giveDog) E.giveDog(S, d, a); } S.res.food = Math.max(0, S.res.food - 2);
        calm(S, 1); say(S, 'All three', 'The dog checked every room before it lay down. The kids watched it do it, and only slept once it had.');
      },
    },
  });

  // ---------------- new things that happen down there
  Object.assign(EV, {
    flood: { chance: 1, when: S => S.day > 15 && S.rooms.some(r => r.row >= 2),
      view: S => { const w = best(S, 'engineering'); return { title: 'Water in the lowest level', text: 'The black rain found a crack. There is water on the floor of the lowest level, ankle deep and rising, and it has a sheen on it.', art: {}, choices: [w ? `Pump it and patch the crack (${w.name}, Engineering vs DR 7, 8 scrap)` : 'Patch it', 'Seal off the room until it drains'] }; },
      pick: (S, p, i) => { const r = S.rooms.filter(x => x.row >= 2).sort((a, b) => b.row - a.row)[0]; if (i === 1 || !has(S, 'scrap', 8)) { if (r) r.broken = true; return E.log(S, `The ${D.ROOMS[r.type] ? D.ROOMS[r.type].name : 'room'} is shut until the water drains.`, 'bad'); } S.res.scrap -= 8; const w = best(S, 'engineering'), x = w && check(w, 'engineering', 7); if (x && x.succ) return say(S, 'Patched', `${x.txt}\n\nPumped dry by midnight. The patch is ugly. It holds.`); if (r) r.broken = true; if (w && E.expose) E.expose(S, w, 1, 5, 'the flood'); say(S, 'Still leaking', `${x ? x.txt : ''}\n\nThe patch blew out at dawn. The room is under water and ${w ? w.name : 'whoever was working'} got soaked in it.`); } },
    rats: { chance: 1, when: S => S.day > 8 && S.res.food > 20,
      view: () => ({ title: 'Rats', text: 'Something has been in the grain. Droppings, chewed bags, tiny footprints in the dust. Then somebody sees one: big as a cat, grey, with black at the edges of the eyes.', art: {}, choices: ['Build traps (4 scrap)', 'Poison (it might get into the food)', 'Hunt them by lamp, tonight'] }),
      pick: (S, p, i) => { if (i === 0 && has(S, 'scrap', 4)) { S.res.scrap -= 4; S.res.food = Math.max(0, S.res.food - 3); return E.log(S, 'The traps caught eleven. The stores lost a little first.'); } if (i === 1) { if (Math.random() < .3) { S.res.food = Math.max(0, Math.round(S.res.food * .85)); return say(S, 'Poison', 'The rats died. So did a sixth of the food, because somebody used too much.'); } return E.log(S, 'The poison worked. Nobody wants to eat the bottom sacks anyway.'); } const w = best(S, 'melee'); const v = w && Math.random() < .3; if (v && E.expose) E.expose(S, w, 1, 4, 'a rat bite'); S.res.food = Math.max(0, S.res.food - 5); say(S, 'Rat hunt', `Six people with lamps and shovels, at midnight, shouting. It was the most fun anyone has had in weeks.${v ? ` ${w.name} got bitten.` : ''}`); calm(S, 1); } },
    wedding: { chance: 1, when: S => (S.couples || []).length > 0 && S.day > 30 && !S.wedSeen,
      view: S => { const c = S.couples[0], a = byId(S, c[0]), b = byId(S, c[1]); return { title: 'A wedding?', text: `${a ? a.name : 'Someone'} and ${b ? b.name : 'someone'} want to get married. Down here. Rings made out of washers, a speech, the works. It would mean a real meal.`, art: {}, choices: ['Yes, and a feast (10 food)', 'Yes, but no feast', 'There is no time for this'] }; },
      pick: (S, p, i) => { S.wedSeen = 1; if (i === 2) { fret(S, 1); return E.log(S, 'No wedding. The couple stopped talking to the leader for a week.'); } if (i === 0 && has(S, 'food', 10)) { S.res.food -= 10; calm(S, 4); order(S, 6); return say(S, 'The wedding', 'Washers for rings. A dress made out of a parachute. Somebody played the harmonica badly and everyone danced anyway. For one night, the world had not ended.'); } calm(S, 2); say(S, 'The wedding', 'A short speech, two washers, and a kiss. People clapped. It counted.'); } },
    quarrel: { chance: 2, when: S => home(S).length >= 6,
      view: (S, p) => { if (!p.a) { const h = home(S).sort(() => Math.random() - .5); p.a = h[0].id; p.b = h[1].id; } const a = byId(S, p.a), b = byId(S, p.b); if (p.t == null) p.t = Math.floor(Math.random() * 6); const T = [['The top bunk', 'a bunk. The top one, by the vent, the only warm spot in the room', 'the bunk'], ['The last coffee', 'the last jar of instant coffee, which one of them found and the other one says they hid', 'the coffee'], ['The good boots', 'a pair of dry boots off a dead runner. They both wear a ten', 'the boots'], ['The radio hour', 'who gets the radio between nine and ten, the only hour there is ever music', 'the radio hour'], ["The dead man's coat", 'the coat of someone who died last week. One of them says it was promised to them', 'the coat'], ['The photo wall', 'a photo on the memorial wall. One of them wants it taken down. The other one put it up', 'the photo']][p.t]; p.thing = T[2]; return { title: T[0], text: `${a.name} and ${b.name} are shouting about ${T[1]}. It has been building for days. Everyone is watching to see what the leader does.`, art: {}, choices: [`Side with ${a.name}`, `Side with ${b.name}`, 'Make them share it'] }; },
      pick: (S, p, i) => { const a = byId(S, p.a), b = byId(S, p.b); if (!a || !b) return; if (i < 2) { const [w, l] = i === 0 ? [a, b] : [b, a]; E.addStress(S, l, 2); if (E.addRel) { E.addRel(S, a, b, -15); const L = E.leader && E.leader(S); if (L) E.addRel(S, l, L, -10); } return E.log(S, `${w.name} got ${p.thing || 'it'}. ${l.name} has not let it go.`); } if (Math.random() < .5) { if (E.addRel) E.addRel(S, a, b, 10); return E.log(S, `${a.name} and ${b.name} share ${p.thing || 'it'} now. Somehow that turned into a friendship.`); } if (E.addRel) E.addRel(S, a, b, -10); E.log(S, `Taking turns lasted two nights. Then it came to blows.`, 'bad'); } },
    digging: { chance: 1, when: S => S.day > 30,
      view: () => ({ title: 'Digging under the floor', text: 'At night, under the lowest floor: scraping. Steady, patient, in no hurry. It stops when you put your ear to the concrete, and starts again when you take it away.', art: {}, choices: ['Break through and see', 'Pour concrete on it (12 scrap)', 'Ignore it'] }),
      pick: (S, p, i) => { if (i === 1 && has(S, 'scrap', 12)) { S.res.scrap -= 12; return E.log(S, 'Fresh concrete over the floor. The scraping stopped. Mostly.'); } if (i === 2) { fret(S, 1); if (Math.random() < .4) S.threat = { groups: ['infected'], known: false }; return E.log(S, 'The scraping went on for a week.'); } if (Math.random() < .5) { S.res.food += 15; S.res.scrap += 10; return say(S, 'An old cellar', 'Under the floor: a sealed cellar from before, dry, full of jars, and a skeleton holding a shovel, who had been trying to get out, not in.'); } const foes = E.pickFoes(['infected'], Math.max(2, Math.ceil(S.day / 30)), 4); const f = foes.length && E.fight(S, home(S).slice(0, 4), foes, { where: 'the lowest level', inside: true }); say(S, 'They were digging up', 'You broke through to them. They had been waiting.', f ? { fight: f } : {}); } },
    voicemail: { chance: 1, when: S => S.day > 20 && home(S).length >= 2,
      view: (S, p) => { if (!p.id) p.id = pick(home(S)).id; const x = byId(S, p.id); return { title: 'A phone rings', text: `A dead phone in the junk pile lights up and plays a voicemail, nobody knows how. It is a woman's voice, saying ${x.name}'s name, telling ${him(x)} to come home for dinner. It is the date from before.`, art: { p: x.sprite }, choices: ['Let it play to the end', 'Smash it'] }; },
      pick: (S, p, i) => { const x = byId(S, p.id); if (!x) return; if (i === 0) { x.stress = Math.max(0, x.stress - 3); return E.log(S, `${x.name} listened to it eleven times, and then asked everyone to please not talk about it.`); } E.addStress(S, x, 3); E.log(S, `${x.name} smashed it ${him(x)}self, and then picked up every piece.`); } },
    airdrop: { chance: 1, when: S => S.day > 25,
      view: () => ({ title: 'A plane', text: 'A plane, low, the first in months. Something drops out of it on a parachute, two miles off, toward the river. Everyone else for miles saw it too.', art: {}, choices: ['Send two runners now, fast (Athletics vs DR 7)', 'Let it go. Everyone will be there'] }),
      pick: (S, p, i) => { if (i === 1) return E.log(S, 'Smoke rose by the river all afternoon. Whatever it was, people fought over it.'); const t = home(S).sort((a, b) => E.pool(b, 'athletics') - E.pool(a, 'athletics')).slice(0, 2); if (!t.length) return; const r = check(t[0], 'athletics', 7); if (r.succ) { S.res.meds += 8; S.res.food += 12; S.res.rounds += 30; return say(S, 'First there', `${r.txt}\n\n${t.map(o => o.name).join(' and ')} got there first: a crate of military rations, medicine and rounds. They ran home with as much as they could carry.`); } const v = t[t.length - 1]; v.hp = Math.max(1, v.hp - 5); say(S, 'Not first', `${r.txt}\n\nThere were already six people at the crate, and they had guns. ${v.name} came home bleeding and empty-handed.`); } },
    rainplants: { chance: 1, when: S => S.day > 40,
      view: () => ({ title: 'Something growing', text: 'Under the vent where the black rain drips in, something has grown overnight: pale stalks, waist high, heavy with fat grey pods. They smell like bread.', art: {}, choices: ['Harvest them. It\'s food', 'Burn them'] }),
      pick: (S, p, i) => { if (i === 1) return E.log(S, 'Burned. The smoke smelled like bread too.'); S.res.food += 14; home(S).slice(0, 4).forEach(o => E.expose && E.expose(S, o, 1, 7, 'the grey pods')); say(S, 'Grey bread', 'They taste fine. Better than fine. Four people ate a lot of them before anyone thought to ask what they were growing in.'); } },
    confession: { chance: 1, when: S => S.day > 20 && home(S).length >= 3,
      view: (S, p) => { if (!p.id) p.id = pick(home(S)).id; const x = byId(S, p.id), L = E.life ? E.life(x) : {}; return { title: `${x.name} needs to talk`, text: `${x.name} asks to talk to the leader, alone. "Before all this, ${L.trauma ? 'there was something. ' : ''}I left someone. Back in ${L.from || 'the city'}. I could have gone back for them, and I didn't. Everybody here thinks I'm a good person. I need somebody to know I'm not."`, art: { p: x.sprite }, choices: ['"You are now."', '"I know. I don\'t care."', 'Tell everyone, so there are no secrets'] }; },
      pick: (S, p, i) => { const x = byId(S, p.id); if (!x) return; if (i === 0) { x.stress = Math.max(0, x.stress - 4); return E.log(S, `${x.name} slept through the night for the first time in weeks.`); } if (i === 1) { x.stress = Math.max(0, x.stress - 1); return E.log(S, `${x.name} laughed, the bad kind of laugh, and went back to work.`); } order(S, 3); E.addStress(S, x, 5); home(S).forEach(o => { if (o !== x && E.addRel) E.addRel(S, x, o, -8); }); E.log(S, `Now everyone knows what ${x.name} did. Nobody says anything. That is worse.`, 'bad'); } },
    still: { chance: 1, when: S => S.day > 15 && S.res.food > 25,
      view: () => ({ title: 'A still', text: 'Someone has built a still behind the generator out of a pressure cooker and copper pipe. It is making something clear and terrible, from the potato peels.', art: {}, choices: ['Allow it. People need something', 'Allow it, rationed by the leader', 'Smash it'] }),
      pick: (S, p, i) => { if (i === 2) { order(S, 2); fret(S, 1); return E.log(S, 'The still is scrap now. Everyone knows who smashed it.'); } S.res.food -= 4; S.res.fuel = Math.max(0, S.res.fuel - 2); if (i === 0) { calm(S, 3); order(S, -6); return say(S, 'Moonshine', 'A loud night. A fist fight, two songs, one proposal, one apology. Most people say it was worth it.'); } calm(S, 2); order(S, 2); E.log(S, 'One cup each, Saturdays, poured by the leader. It is a ritual now.'); } },
    hungerstrike: { chance: 1, when: S => S.day > 20 && (S.laws || []).length > 0 && home(S).length >= 4,
      view: (S, p) => { if (!p.id) p.id = pick(home(S)).id; const x = byId(S, p.id); return { title: `${x.name} won't eat`, text: `${x.name} has stopped eating, in protest of the leader's laws. ${He(x)} sits in the Common Room at every meal with an empty plate in front of ${him(x)}. People are starting to sit with ${him(x)}.`, art: { p: x.sprite }, choices: ['Repeal the newest law', 'Let ' + x.name + ' starve if ' + he(x) + ' wants', 'Talk to ' + him(x) + ' (Negotiation vs DR 8)'] }; },
      pick: (S, p, i) => { const x = byId(S, p.id); if (!x) return; if (i === 0) { (S.laws || []).pop(); order(S, -4); return E.log(S, `The law is gone. ${x.name} ate, slowly, in front of everyone.`); } if (i === 1) { x.hunger = (x.hunger || 0) + 2; order(S, -6); return E.log(S, `${x.name} kept it up for nine days and collapsed. Half the shelter blames the leader.`, 'bad'); } const w = (E.leader && E.leader(S)) || best(S, 'negotiation'); const r = check(w, 'negotiation', 8); if (r.succ) return say(S, 'Talked down', `${r.txt}\n\n${w.name} and ${x.name} talked until four in the morning. ${x.name} ate breakfast.`); order(S, -3); say(S, 'Not talked down', `${r.txt}\n\nIt made it worse.`); } },
    flare: { chance: 1, when: S => S.day > 12,
      view: () => ({ title: 'A flare', text: 'A red flare goes up from the hills to the east, a mile out. Then another. Someone is in trouble, or someone wants you to think so.', art: {}, choices: ['Send a team to look (Survival vs DR 7)', 'Stay in'] }),
      pick: (S, p, i) => { if (i === 1) return E.log(S, 'No more flares came up. Nobody slept well.'); const t = home(S).slice(0, 3), w = best(S, 'survival'); if (!w) return; const r = check(w, 'survival', 7); if (r.succ && beds(S, 1)) { const n = join(S, {}); return say(S, 'Someone in trouble', `${r.txt}\n\nA survivor with a broken leg in a ravine, three flares left. ${n ? n.name : 'They'} cried the whole way back.`); } const foes = E.pickFoes(['human'], Math.max(2, Math.ceil(S.day / 30)), 3); const f = foes.length && E.fight(S, t, foes, { where: 'the hills', canFlee: true }); say(S, 'A trap', `${r.txt}\n\nThe flares were bait.`, f ? { fight: f } : {}); } },
    gamble: { chance: 1, when: S => home(S).length >= 5 && S.day > 10,
      view: () => ({ title: 'Cards for rations', text: 'A poker game has started in the Bunks, for rations. Some people are eating very well. Some people have not eaten in two days and are still playing.', art: {}, choices: ['Ban it', 'Allow it, with a limit', 'Leave it alone'] }),
      pick: (S, p, i) => { if (i === 0) { order(S, 3); fret(S, 1); return E.log(S, 'Gambling is banned. The game moved somewhere else.'); } if (i === 1) { calm(S, 1); return E.log(S, 'One ration a hand, five hands a night. It works, more or less.'); } const h = home(S); const v = pick(h); if (v) { v.hunger = (v.hunger || 0) + 1; } order(S, -4); E.log(S, `${v ? v.name : 'Someone'} lost everything at cards and is not eating. There has been a fight about it.`, 'bad'); } },
    radiosong: { chance: 1, when: S => S.rooms.some(r => r.type === 'radio') && S.day > 10,
      view: () => ({ title: 'Music', text: 'The radio, scanning static, lands on music. Real music, an old song, live, someone playing guitar into a microphone somewhere. Between songs he says "If anyone is out there, this one\'s for you."', art: {}, choices: ['Turn it up for everyone', 'Answer him'] }),
      pick: (S, p, i) => { if (i === 0) { calm(S, 2); return E.log(S, 'The whole shelter listened. Somebody knew the words.', 'good'); } calm(S, 1); if (Math.random() < .5) { S.noise = (S.noise || 0) + .3; return say(S, 'He answered', '"I hear you," he said. "Where are you?" Somebody almost told him. Somebody else pulled the plug.'); } S.radio = (S.radio || 0) + 50; say(S, 'He answered', 'He told you where the good water is, and that the bridge is down. Then he played one more song, for you, by name.'); } },
    deserter: { chance: 1, when: S => S.day > 15 && S.rooms.some(r => r.type === 'gate' && E.workers(S, r).length),
      view: (S, p) => { const g = gateGuard(S); p.id = g && g.id; return { title: 'Asleep on watch', text: `${g ? g.name : 'The watch'} fell asleep on the Gate last night. Nothing came. This time. Everyone knows, and everyone is waiting to see what happens.`, art: g ? { p: g.sprite } : {}, choices: ['Extra shifts for a week', 'Public warning', 'Let it go'] }; },
      pick: (S, p, i) => { const g = byId(S, p.id); if (!g) return; if (i === 0) { g.exh = (g.exh || 0) + 2; order(S, 3); return E.log(S, `${g.name} works the Gate double for a week. ${He(g)} hasn't complained.`); } if (i === 1) { E.addStress(S, g, 3); order(S, 4); return E.log(S, `${g.name} stood in front of everyone and was told. Nobody has slept on watch since.`); } order(S, -4); E.log(S, `Nothing happened to ${g.name}. People noticed that, too.`); } },
    escape: { chance: 1, when: S => S.day > 40 && home(S).length >= 8,
      view: (S, p) => { if (!p.ids) p.ids = home(S).sort(() => Math.random() - .5).slice(0, 3).map(o => o.id); const ppl = p.ids.map(id => byId(S, id)).filter(Boolean); return { title: 'A plan to leave', text: `${ppl.map(o => o.name).join(', ')} have been planning to leave for the coast. There are supposed to be boats. They want a share of the stores to go with.`, art: {}, choices: ['Let them go, with a fair share', 'Let them go with nothing', 'Talk them out of it (Negotiation vs DR 8)'] }; },
      pick: (S, p, i) => { const ppl = p.ids.map(id => byId(S, id)).filter(o => o && o.alive); if (i === 2) { const w = (E.leader && E.leader(S)) || best(S, 'negotiation'); const r = w && check(w, 'negotiation', 8); if (r && r.succ) { ppl.forEach(o => { o.stress = Math.max(0, o.stress - 2); }); return say(S, 'They stay', `${r.txt}\n\nThe boats are a rumor, ${w.name} says. The shelter is real. They stay, for now.`); } } const share = i === 0 ? ppl.length * 5 : 0; S.res.food = Math.max(0, S.res.food - share); S.res.water = Math.max(0, S.res.water - share); ppl.forEach(o => E.depart(S, o, 'Left for the coast. Nobody heard from them again.')); say(S, 'They left', `${ppl.map(o => o.name).join(', ')} climbed the ladder at dawn${i === 0 ? ' with full packs' : ' with nothing'}. They did not look back. Some nights people talk about whether they made it.`); } },
    photo: { chance: 1, uncanny: 1, when: S => S.day > 35,
      view: () => ({ title: 'An old photograph', text: 'Behind a loose panel in the Common Room: a photograph of this shelter, these rooms, full of people. The date on the back is next year. One of the faces is very clearly the leader.', art: {}, choices: ['Burn it', 'Pin it on the wall'] }),
      pick: (S, p, i) => { if (i === 0) { fret(S, 1); return E.log(S, 'Burned. Nobody can stop thinking about it anyway.'); } order(S, 3); E.log(S, 'The photo is on the wall. People say it means they make it. People stare at it a lot.'); } },
    kitchenrevolt: { chance: 1, when: S => S.rooms.some(r => r.type === 'kitchen') && S.res.food > 30 && home(S).length >= 8,
      view: () => ({ title: 'The kitchen crew', text: 'The kitchen crew has stopped cooking. They want an extra half ration for the people who cook. "We stand over food all day and go to bed hungry. You try it."', art: {}, choices: ['Give them the half ration', 'Swap the crew out', 'Cook yourself, tonight'] }),
      pick: (S, p, i) => { if (i === 0) { S.res.food -= 6; order(S, -2); return E.log(S, 'The kitchen crew eats a little more. The food is a little better.'); } if (i === 1) { order(S, 3); fret(S, 1); return E.log(S, 'New cooks. The food got worse and nobody complains out loud.'); } const L = E.leader && E.leader(S); order(S, 5); E.log(S, `${L ? L.name : 'The leader'} cooked dinner for everybody. It was awful. The kitchen crew went back to work the next day, laughing.`); } },
    sickdog: { chance: 1, when: S => E.dogs && E.dogs(S).some(d => d.alive && !d.pup),
      view: (S, p) => { const d = E.dogs(S).find(x => x.alive && !x.pup); p.dog = d && d.name; return { title: `${p.dog} won't eat`, text: `${p.dog} has stopped eating and lies by the hatch, panting, eyes cloudy. Maybe it is just old age. Maybe it drank the rain.`, art: {}, choices: ['Treat the dog (2 Med supplies)', 'Watch and wait'] }; },
      pick: (S, p, i) => { if (i === 0 && has(S, 'meds', 2)) { S.res.meds -= 2; return E.log(S, `${p.dog} ate a little on the third day. Everyone cheered, which confused ${p.dog}.`, 'good'); } fret(S, 1); if (Math.random() < .5) return E.log(S, `${p.dog} pulled through on ${'its'} own.`); const d = E.dogs(S).find(x => x.name === p.dog); if (d) { d.hp = 0; d.alive = false; S.memorial.push({ name: d.name, dog: true, day: S.day, why: 'Got sick and did not get better.' }); } say(S, `${p.dog}`, `${p.dog} died in the night, by the hatch, where ${p.dog} always waited for the runs to come home.`); } },
  });

  // visitors share the hatch's spacing with the other arrivals
  const ok0 = E.evOk;
  E.evOk = (S, k) => { if (GATE.includes(k)) { if (S.day - (S.doorLast ?? -99) < 12) return false; if ((S.evN || {})[k] >= 1) return false; }
    if (['escape', 'rainplants', 'wedding', 'photo', 'hungerstrike'].includes(k) && (S.evN || {})[k] >= 1) return false;
    if (['digging', 'flood', 'airdrop', 'flare', 'still', 'gamble', 'kitchenrevolt', 'confession', 'voicemail'].includes(k) && (S.evN || {})[k] >= 2) return false; return ok0 ? ok0(S, k) : true; };
  const mk0 = E.evMark; E.evMark = (S, k) => { if (mk0) mk0(S, k); if (GATE.includes(k)) S.doorLast = S.day; };
})();

// ===== Balance round 5: with many more events in the deck, the knock at the hatch keeps its old share
(() => { const EV = globalThis.SHELTER_EVENTS; EV.gatecomer.chance = 7; if (EV.refugees) EV.refugees.chance = Math.max(EV.refugees.chance || 1, 2); })();

// ===== Training focus (Buddy 2026-11-19): pick what each person drills in the Training Yard.
// CANON allocation is kept: each level gives priority x level points, capped at Level + 1. Training moves the chosen skill to the
// front of the person's list, so after a few days of drills their points are re-spent with that skill first.
(() => {
  const E = globalThis.ShelterEngine, D = globalThis.SHELTER_DATA, EV = globalThis.SHELTER_EVENTS;
  const FOCUS = ['melee', 'ranged', 'athletics', 'dodge', 'block', 'stealth', 'medicine', 'engineering', 'survival', 'analysis', 'insight', 'negotiation', 'intimidation'];
  const skN = s => (D.SKILL_NAME && D.SKILL_NAME[s]) || s[0].toUpperCase() + s.slice(1);
  const catOf = s => Object.keys(D.SKILLS).find(c => D.SKILLS[c].includes(s));
  E.FOCUS = FOCUS;
  E.focusName = p => (p.focus ? skN(p.focus) : 'general fitness (XP only)');
  E.nextFocus = p => { const i = p.focus ? FOCUS.indexOf(p.focus) : -1; p.focus = i + 1 < FOCUS.length ? FOCUS[i + 1] : null; p.fdays = 0; };
  const ed0 = E.endDay;
  E.endDay = S => {
    const d0 = S.day, r = ed0(S); if (S.day === d0 || S.over) return r;
    S.rooms.filter(x => x.type === 'training' && !x.broken).forEach(room => {
      E.workers(S, room).forEach(p => {
        if (!p.focus || p.damned) return;
        p.fdays = (p.fdays || 0) + 1;
        if (p.fdays < Math.max(2, 5 - room.tier)) return;
        p.fdays = 0;
        const cat = catOf(p.focus), list = p.pref.filter(s => catOf(s) === cat);
        if (list[0] === p.focus) return; // already their first skill in that group
        const was = p.skills[p.focus] || 0, hp0 = E.maxHp(p);
        p.pref = [p.focus, ...p.pref.filter(s => s !== p.focus)];
        E.allocate(p); p.hp = Math.min(E.maxHp(p), p.hp + Math.max(0, E.maxHp(p) - hp0));
        const now = p.skills[p.focus] || 0;
        E.log(S, now > was ? `Drills paid off: ${p.name}'s ${skN(p.focus)} went from ${was} to ${now}. Other ${cat} skills gave up the points.` : `${p.name} has drilled ${skN(p.focus)} as far as Level ${p.level} allows. More levels, more room to grow.`, 'good');
      });
    });
    return r;
  };
  // the room says what it does now
  D.ROOMS.training.desc = 'Workers here level up about twice as fast. Click a person in the Yard to choose what they drill: every few days their skill points shift toward it (up to Level + 1).';
})();

// ===== Critic fixes, round 5 (Buddy 2026-11-19, "fix all"): results right after choices, raids as a scene,
// varied raid warnings with a scouting roll, a harder back half of the year, capped log lines, Cosmic Crits in
// investigations, a last-survivor ending, and a Training Yard tip.
(() => {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const home = S => E.humans(S).filter(o => !o.away && !o.sealed && !o.damned);
  const skN = s => (D.SKILL_NAME && D.SKILL_NAME[s]) || s[0].toUpperCase() + s.slice(1);

  // ---------- the log: no line more than 8 times a run, and never the same line two days running
  E.logOk = (S, t) => { t = String(t || ''); if (t.length > 160 || !S.day) return true; S.logN = S.logN || {}; S.logDay = S.logDay || {}; const n = S.logN[t] || 0, last = S.logDay[t] ?? -99; if (n >= 8 || (S.day - last === 1)) return false; S.logN[t] = n + 1; S.logDay[t] = S.day; return true; };
  const capLog = S => { return;
    if (!S.log || !S.log.length) return;
    S.logN = S.logN || {}; S.logDay = S.logDay || {};
    S.log = S.log.filter(l => {
      if (l.seen4) return true;
      const t = String(l.t || ''); if (t.length > 160) { l.seen4 = 1; return true; }
      const n = S.logN[t] || 0, last = S.logDay[t] ?? -99;
      if (n >= 8 || (S.day - last <= 1 && S.day !== last)) return false;
      S.logN[t] = n + 1; S.logDay[t] = S.day; l.seen4 = 1; return true;
    });
  };

  // ---------- raid card first, with what happened, then the bodies
  const raidFirst = S => {
    const ri = S.queue.findIndex(q => q.k === 'raid'), bi = S.queue.findIndex(q => q.k === 'body');
    if (ri > 0 && bi >= 0 && bi < ri) { const [r] = S.queue.splice(ri, 1); S.queue.splice(bi, 0, r); }
  };
  const rv0 = EV.raid.view;
  EV.raid.view = (S, p) => {
    const v = rv0(S, p), fs = p.fights || [];
    const dead = [...new Set(fs.flatMap(f => f.dead || []))], hurt = [...new Set(fs.flatMap(f => f.hurt || []))].filter(n => !dead.includes(n));
    const foes = (p.foes || []).length, where = [...new Set(fs.map(f => f.where).filter(Boolean))];
    const lines = [];
    if (where.length) lines.push(`They fought at ${where.length > 3 ? `${where.slice(0, 2).join(', ')} and ${where.length - 2} more rooms` : where.join(', then ')}.`);
    if (foes) lines.push(`${foes} came.`);
    lines.push(dead.length ? `${dead.join(', ')} ${dead.length > 1 ? 'did' : 'did'} not live to see the morning.` : 'Nobody died.');
    if (hurt.length) lines.push(`${hurt.join(', ')} ${hurt.length > 1 ? 'are' : 'is'} hurt.`);
    if (!p.v4) p.v4 = pick(['In the morning there was a lot of cleaning up to do, and nobody talked while they did it.', 'Somebody counted the shell casings afterward, just to have something to count.', 'The Gate is dented in three new places. Somebody painted a tally mark by each one.', 'Nobody slept. At dawn somebody made coffee from the last of the grounds, and everybody drank it standing up.', 'The kids, if there are any, were told it was thunder. They know it wasn\'t.']);
    v.text = `${v.text}\n\n${lines.join(' ')}\n\n${p.v4}`;
    return v;
  };

  // ---------- raid warnings: written per enemy, with a scouting roll
  const WARN = {
    human: ['Armed people on the road, a dozen at least. Somebody saw the headlights stop at the bend.', 'Smoke from a campfire on the ridge, where nobody should be. Three trucks. They are watching the hatch through binoculars.', 'A raider stood in the road at noon and waved, just to let you know. Tonight, he means.', 'The dog barked at the road for an hour. Then the watch saw them: men with rifles, moving between the cars.', 'Somebody left a dead crow on the hatch with a number painted on it. It is the number of people inside. They will come tonight.', 'Engines, far off, getting closer, then stopping. Raiders always stop before they come in on foot.'],
    machine: ['Something tall is moving along the ridge, stopping, scanning, moving again. Its lights are the wrong color.', 'The radio is full of clicking. The machines talk to each other before they hunt.', 'Tracks in the mud this morning, not boots, not paws. Treads, and something with too many legs.', 'A drone hung over the hatch for twenty minutes at dawn, then went back the way it came. Tonight, the rest come.', 'The lights in the old substation came on by themselves. Machines are waking up out there.', 'The watch heard servos in the rain. Lots of them.'],
    other: ['Infected are gathering outside. More every hour. They stand facing the hatch, swaying.', 'The rain smells like rot. The pack that hunts the creek is coming up the hill.', 'Something big has been circling the shelter all day, out of sight, breaking branches.', 'The birds left all at once this afternoon. Every one of them.', 'Scratching at the vent covers, testing each one, patient.', 'A low moaning from the treeline that does not stop for breath. There are a lot of them.'],
  };
  const tv0 = EV.threat.view;
  EV.threat.view = (S, p) => {
    const v = tv0(S, p), t = S.threat; if (!t) return v;
    const key = t.groups.includes('human') ? 'human' : t.groups.includes('machine') ? 'machine' : 'other';
    if (p.w == null) { S.warnI = S.warnI || {}; p.w = (S.warnI[key] = ((S.warnI[key] ?? -1) + 1) % WARN[key].length); }
    const sc = home(S).sort((a, b) => E.pool(b, 'stealth') - E.pool(a, 'stealth'))[0]; p.sc = sc && sc.id;
    v.text = `${WARN[key][p.w]}\n\nYou have the day to get ready.${S.res.rounds < 10 ? ' The rounds box is nearly empty.' : ''}`;
    if (sc && v.choices.length === 3) v.choices.splice(2, 0, `Send ${sc.name} to scout and set an ambush (Stealth ${Math.max(1, E.pool(sc, 'stealth'))} dice vs DR 7)`);
    return v;
  };
  const tp0 = EV.threat.pick;
  EV.threat.pick = (S, p, i) => {
    if (!S.threat) return;
    const scout = p.sc != null && i === 2;
    if (!scout) return tp0(S, p, i > 2 ? i - 1 : i);
    const x = S.people.find(o => o.id === p.sc); if (!x) return;
    const r = E.roll(Math.max(1, E.pool(x, 'stealth')), 7), dice = `${x.name}, Stealth: ${r.dice.length} dice vs DR 7, rolled ${r.dice.join(' ')}. ${r.succ} success${r.succ === 1 ? '' : 'es'}${r.crit ? ', Cosmic Crit' : ''}.`;
    if (r.crit) { S.threat = null; return E.say(S, 'The ambush', `${dice}\n\n${x.name} found where they were camped and set fire to it before dark. Whatever was coming is not coming any more.`); }
    if (r.succ) { S.ambush = 1; return E.say(S, 'The ambush', `${dice}\n\n${x.name} came back at dusk with a count and a plan: they will come by the culvert. Traps are set there now. Fewer of them will reach the Gate.`); }
    x.hp = Math.max(1, x.hp - 4); E.addStress(S, x, 2); E.say(S, 'Spotted', `${dice}\n\n${x.name} was seen. ${x.name} made it back, bleeding, and they know you are expecting them now.`);
  };
  const pf0 = E.pickFoes;
  let S1 = null;
  E.pickFoes = (g, l, b, m) => pf0(g, l, S1 && S1.ambush ? Math.max(2, Math.round(b * .7)) : b, m);

  // ---------- a harder back half of the year: the soil goes bad, and the shelter needs upkeep
  const d1 = E.dif;
  E.dif = S => { const d = d1(S); if (!S || !S.day || S.day <= 200) return d; return Object.assign({}, d, { yield: d.yield * .88 }); };
  const upkeep = S => {
    if (S.day < 120 || S.day % 7) return;
    const n = S.rooms.filter(r => r.type !== 'gate').length, cost = Math.ceil(n * (S.day > 240 ? 1.5 : 1));
    if (S.res.scrap >= cost) { S.res.scrap -= cost; E.log(S, `Weekly repairs: ${cost} scrap for seals, wiring and patches.`); return; }
    S.res.scrap = 0; const r = pick(S.rooms.filter(x => x.type !== 'gate' && !x.broken)); if (r) { r.broken = true; E.log(S, `No scrap for repairs this week. The ${(D.ROOMS[r.type] || {}).name || 'room'} broke down.`, 'bad'); }
  };

  // ---------- Cosmic Crits in the investigations
  if (EV.crime_minv) {
    const mp0 = EV.crime_minv.pick;
    EV.crime_minv.pick = (S, p, i) => {
      const c = S.murder, k = c && S.people.find(o => o.id === c.id && o.alive);
      if (k && p.ls && i < p.ls.length && Math.random() < .06) {
        c.used.push(p.ls[i]); const keep = c.sus.filter(id => id !== k.id && S.people.some(o => o.id === id && o.alive)); c.sus = [k.id].concat(keep.length ? [pick(keep)] : []).sort(() => Math.random() - .5);
        return E.say(S, 'Cosmic Crit', `The dice come up 1 and 10 together. Everything lines up at once: the watch log, the scratch on a forearm, the knife in the vent.\n\nIt is one of two people now: ${c.sus.map(id => S.people.find(o => o.id === id).name).join(' or ')}.`);
      }
      return mp0(S, p, i);
    };
  }

  // ---------- the last survivor does not stay long
  const lastOne = S => {
    const h = E.humans(S).filter(o => !o.away);
    if (h.length !== 1 || E.humans(S).length !== 1) { S.alone = 0; return; }
    S.alone = (S.alone || 0) + 1;
    if (S.alone === 3) { const x = h[0]; S.queue.push({ k: 'note', p: { title: 'Alone', text: `For three days ${x.name} kept the routine: the Gate, the filter, the beds that nobody sleeps in. On the fourth morning ${x.name} wrote every name on the Wall again, neatly, climbed the ladder, and left the hatch open behind them.`, art: { p: x.sprite } } }); E.depart(S, x, 'The last one. Climbed out and did not come back.'); S.over = true; }
  };

  // ---------- a tip the first time a Training Yard is built
  const b0 = E.build;
  E.build = (S, type, slot) => { const r = b0(S, type, slot); if (r && type === 'training' && !S.trainTip) { S.trainTip = 1; S.queue.push({ k: 'note', p: { title: 'The Training Yard', text: 'Anyone working here levels up about twice as fast.\n\nClick someone in the Yard and press "Training" to pick what they drill: Melee, Ranged, Medicine, Insight and more. Every few days their skill points shift toward it, up to Level + 1.', art: {} } }); } return r; };

  // ---------- results right after the choice that caused them
  const dc0 = E.decide;
  E.decide = (S, i) => {
    S1 = S; const before = new Set(S.queue.slice(1)), r = dc0(S, i);
    const added = S.queue.filter(q => !before.has(q) && q.k === 'note');
    if (added.length) S.queue = added.concat(S.queue.filter(q => !added.includes(q)));
    raidFirst(S); capLog(S); return r;
  };
  const ed0 = E.endDay;
  E.endDay = S => {
    S1 = S; const d0 = S.day, r = ed0(S); S.ambush = 0;
    if (S.day !== d0 && !S.over) { upkeep(S); lastOne(S); }
    raidFirst(S); capLog(S); return r;
  };
})();

// ===== Bug-run variety (Buddy 2026-11-19, "do a bug run"): the cards that came back 5 to 15 times a run now have
// several versions each, used in turn so the same words don't come back until all the others have been seen.
(() => {
  const EV = globalThis.SHELTER_EVENTS;
  const turn = (S, key, n) => { S.vary7 = S.vary7 || {}; const u = S.vary7[key] = S.vary7[key] || []; let f = []; for (let i = 0; i < n; i++) if (!u.includes(i)) f.push(i); if (!f.length) { S.vary7[key] = []; f = Array.from({ length: n }, (x, i) => i); } const i = f[Math.floor(Math.random() * f.length)]; S.vary7[key].push(i); return i; };
  const vary = (key, list) => {
    if (!EV[key]) return;
    const v0 = EV[key].view;
    EV[key].view = (S, p, E) => { const v = v0(S, p, E); if (p.v7 == null) p.v7 = turn(S, key, list.length); const t = list[p.v7]; v.text = typeof t === 'function' ? t(S, p, v) : t; return v; };
  };
  const per = (S, id) => S.people.find(o => o.id === id);
  const he = x => (x && x.he === 'he' ? 'he' : 'she'), He = x => (x && x.he === 'he' ? 'He' : 'She'), him = x => (x && x.he === 'he' ? 'him' : 'her');
  vary('found_survivors', [
    'The team found people holed up, scared and armed. One of them asks to come along.',
    'Behind a false wall in the stockroom: a woman who has been living on ketchup packets for a month. She asks, very politely, if she can come with you.',
    'Someone on a rooftop waved a white towel until the team looked up. They have a rope, a crossbow and nobody left.',
    'A man was locked in a walk-in freezer, from the outside. He says he will explain on the way, if they take him.',
    'A teenager followed the team for six blocks before they noticed. When they did, she held up both hands and said "I can carry things."',
    'In the back of a bus, under the seats: a survivor with a broken arm and a lot of ammunition. "Fair trade?"',
    'An old man in a deckchair on a car roof, reading, a shotgun across his knees. "Took you long enough," he says.',
  ]);
  vary('caravan', [
    'A caravan stops at the hatch. Food for rounds, no questions.',
    'Three carts pulled by people, not horses. The lead trader wears a gas mask and a wedding dress. Business as usual.',
    'Mule bells in the rain, then a knock: traders, the same family as last time, one fewer of them.',
    'A truck with its windows welded shut and a slot cut in the door. Goods come out of the slot. Rounds go in.',
    'Two brothers with a shopping trolley each, arguing about prices with each other before you have said a word.',
    'A caravan, guarded by people with dogs in muzzles. The dogs never stop looking at your hatch.',
  ]);
  vary('cleared', [
    (S, p) => { const x = per(S, p.id); return `The wait is over. ${He(x)} woke up hungry for breakfast, not for anyone in the room. ${He(x)} stays at 32, and the next bite starts all of this again.`; },
    (S, p) => { const x = per(S, p.id); return `${x ? x.name : 'They'} sat up at dawn and asked what everyone was staring at. Still ${him(x)}self. Still at 32. Nobody has stopped watching ${him(x)} eat.`; },
    (S, p) => { const x = per(S, p.id); return `The fever broke in the night. ${x ? x.name : 'They'} asked for water and a joke, in that order. The meter stays full, and everyone knows it.`; },
    (S, p) => { const x = per(S, p.id); return `${He(x)} opened ${x && x.he === 'he' ? 'his' : 'her'} eyes and they were the right color. Somebody laughed out loud, then stopped, embarrassed. 32 is still 32.`; },
    (S, p) => { const x = per(S, p.id); return `Morning, and ${x ? x.name : 'they'} is still ${x ? x.name : 'themself'}. ${He(x)} won't talk about what ${he(x)} dreamed.`; },
  ]);
  vary('genfail', [
    'Something in the generator is about to go. A fix now costs scrap. Waiting costs more.',
    'The generator has a new sound, a tick under the hum, like a clock that wants you to know it is counting.',
    'Black smoke from the generator exhaust, then clean, then black again. The engineer says "soon" and doesn\'t say soon what.',
    'A bearing is screaming in the generator. You can feel it in your teeth all the way up in the Bunks.',
    'The generator stalled twice last night and caught both times. The third time, it may not.',
  ]);
  vary('drone', [
    'It hovers, looks at you with one glass eye, and tilts as if listening.',
    'A little drone with a cracked propeller sits on the hatch like a bird, blinking a red light at the porthole.',
    'A drone hangs over the vent shaft, very still, lowering a thin wire with a microphone on the end.',
    'Two drones today. They fly in a slow circle around the hatch, then land side by side and switch off, waiting.',
    'A drone with a child\'s drawing taped to it: a house, a sun, a stick family. It lands and does not leave.',
  ]);
  vary('milestone', [
    (S, p, v) => v.text,
    () => 'Somebody is painting the shelter\'s day count on walls in town now. People out there are keeping score of you. It brought something with it.',
    () => 'A runner from another group left a bag at the hatch with a note: "For the ones still counting." Somebody out there has been watching, kindly for once.',
    () => 'The radio picked up your own shelter mentioned on another frequency, as a rumor, as a place that is still holding. That kind of word brings things.',
  ]);
  vary('hoarder', [
    (S, p, v) => v.text,
    () => 'A woman on the radio, very calm, says she has a box of antibiotics from a pharmacy that burned. She wants 40 rounds left on the bridge, and she will be watching.',
    () => 'A boy\'s voice on the radio, trying to sound older: "I got medicine. Real stuff. Forty rounds. Bridge. Don\'t try nothing."',
    () => 'A man who says he was a vet offers antibiotics, "the same as the human ones, I promise". 40 rounds, left on the bridge, no faces.',
  ]);
  vary('signal', [
    (S, p, v) => v.text,
    () => 'A voice on the radio, shaking, gives your street name and says they can see your lamp from where they are hiding. They ask if they can come.',
    () => 'Morse on the radio, slow and careful, spelling out HELP and then your street, then HELP again.',
    () => 'A woman on the radio says she has walked three days toward the signal from your antenna. She is very close now. She asks you not to shoot.',
  ]);
})();
