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
