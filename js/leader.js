// The Leader, Order and Laws. Invented for this game, for DB's review.
// One resident leads. Their social skills hold the shelter together. Laws are hard trades with large effects.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SOC = ['politics', 'performance', 'intimidation'];
  const LAWS = {
    rations: { n: 'Half rations', d: 'Everyone eats 40% less. People are hungry, thin and short-tempered.', cost: 8, day: -1 },
    labour: { n: 'Twelve-hour shifts', d: 'Rooms make 30% more. Workers wear down and gain Exhaustion every few days.', cost: 10, day: -1.2 },
    shoot: { n: 'Nobody waits at 32', d: 'Anyone who reaches 32 DMD is shot that hour. Nobody turns inside, and everyone watches it happen.', cost: 14, day: -.3 },
    open: { n: 'Open hatch', d: 'Anyone who knocks is let in. Many more strangers arrive, and some of them are not what they seem.', cost: 0, day: .5 },
    sealed: { n: 'Seal the hatch', d: 'No strangers, and 40% fewer attacks. Cabin fever slowly builds Stress.', cost: 6, day: -.3 },
    martial: { n: 'Martial law', d: 'Order never falls below 30, and nobody walks out. Each week someone is punished as an example.', cost: 12, day: -.6 },
    ours: { n: 'The Damned are ours', d: 'Nobody may refuse to work beside the Damned. Fear no longer slows rooms, and many resent it.', cost: 10, day: -1 },
    dead: { n: 'The dead feed the living', d: 'Every body goes to the cold room, no vote. Shame weighs a little lighter each time.', cost: 18, day: -.8 },
    wardogs: { n: 'Every dog is a soldier', d: 'All grown dogs fight like combat-trained dogs, and dogs with no person stand at the Gate: +1 die for Gate fighters per dog, up to 2. More dogs die.', cost: 6, day: -.3 },
    forage: { n: 'Dogs feed themselves', d: 'Dogs get no food from the stores and hunt outside at night. Some do not come back.', cost: 4, day: .2 },
    faith: { n: 'Sunday service', d: 'Each week everyone prays together and loses 3 Stress. The Damned are cursed from the pulpit.', cost: 0, day: .7 },
  };
  E.LAWS = LAWS; E.MAX_LAWS = 3;
  const leader = S => { const p = S.leader && S.people.find(x => x.id === S.leader); return p && p.alive && !p.damned ? p : null; };
  const voice = p => Math.max(...SOC.map(s => E.pool(p, s)));
  const best = p => SOC.reduce((a, s) => (E.pool(p, s) > E.pool(p, a) ? s : a), SOC[0]);
  const candidates = S => E.humans(S).filter(p => !p.away && !p.sealed && p.id !== S.leader).sort((a, b) => voice(b) - voice(a)).slice(0, 3);
  E.leader = leader; E.voice = voice;
  E.setLeader = (S, p) => { const had = leader(S); S.leader = p ? p.id : null; S.noLeader = !p; if (had && p && had !== p) S.order = clamp((S.order ?? 50) - 8, 0, 100); if (S.order === undefined) S.order = 55; };
  E.toggleLaw = (S, k) => {
    S.laws = S.laws || [];
    if (!leader(S)) return 'Only a leader can pass laws.';
    if (S.lawDay === S.day) return 'One change of law a day.';
    const i = S.laws.indexOf(k);
    if (i >= 0) { S.laws.splice(i, 1); S.order = clamp(S.order + Math.round(LAWS[k].cost / 3) * (LAWS[k].day < 0 ? 1 : -1), 0, 100); }
    else { if (S.laws.length >= E.MAX_LAWS) return `No more than ${E.MAX_LAWS} laws at once.`; S.laws.push(k); S.order = clamp(S.order - LAWS[k].cost, 0, 100); E.log && E.log(S, `New law: ${LAWS[k].n}.`, 'bad'); }
    S.lawDay = S.day; return null;
  };
  E.leaderDay = S => {
    if (S.order === undefined) S.order = 55;
    S.laws = S.laws || [];
    const L = leader(S), h = E.humans(S).filter(p => !p.away);
    if (S.leader && !L && !S.queue.some(q => q.k === 'succession')) { const was = S.people.find(x => x.id === S.leader); S.leader = null; S.laws = []; S.order = clamp(S.order - 10, 0, 100); if (h.length) S.queue.push({ k: 'succession', p: { was: was ? was.name : 'The leader' } }); }
    if (!S.leader && !S.noLeader && S.day >= 1 && h.length >= 2 && !S.queue.some(q => q.k === 'appoint' || q.k === 'succession')) S.queue.push({ k: 'appoint', p: {} });
    let d = 0;
    const target = L ? clamp(40 + voice(L) * 5, 30, 85) : 35;
    d += (target - S.order) * .05;
    S.laws.forEach(k => { d += LAWS[k].day; });
    if (h.some(p => p.hunger >= 2)) d -= 2;
    if (h.some(p => p.thirst >= 1)) d -= 2;
    if (L && S.day % 7 === 0) { const r = E.rollSkill(L, best(L), 6), g = r.crit ? 15 : r.succ ? r.succ * 4 : -6; d += g; E.log(S, g > 0 ? `${L.name} spoke to everyone tonight. People listened.` : `${L.name} tried to speak to everyone. Someone laughed.`, g > 0 ? 'good' : 'bad'); }
    if (E.lawOn(S, 'labour') && S.day % 3 === 0) h.filter(p => p.room).forEach(p => { p.exh += 1; });
    if (E.lawOn(S, 'sealed')) h.forEach(p => { if (Math.random() < .25) E.addStress(S, p, 1); });
    if (E.lawOn(S, 'rations')) h.forEach(p => { if (Math.random() < .2) E.addStress(S, p, 1); });
    if (E.lawOn(S, 'faith') && S.day % 7 === 0) { h.forEach(p => { p.stress = Math.max(0, p.stress - 3); }); E.living(S).filter(p => p.damned).forEach(p => { p.dmd = Math.min(31, p.dmd + 1); }); E.log(S, 'Sunday. Everyone prayed. The Damned sat outside the door.', 'good'); }
    if (E.lawOn(S, 'martial') && S.day % 7 === 3 && h.length > 2) { const v = h.filter(p => p !== L)[Math.floor(Math.random() * (h.length - 1))]; if (v) { E.addStress(S, v, 3); v.hp = Math.max(1, v.hp - 2); E.log(S, `${v.name} was punished in front of everyone for hoarding. Nobody knows if ${v.he} did.`, 'bad'); } }
    // crises suggest a law, so laws come up when they matter
    if (L && S.laws.length < E.MAX_LAWS && !S.queue.some(q => q.k === 'lawprompt') && S.day - (S.lawAsk || -99) >= 12) {
      const n = E.needs(S), fd = n.food ? S.res.food / n.food : 99, k = fd < 4 && !E.lawOn(S, 'rations') ? 'rations' : (S.stat.raids || 0) > S.day / 6 && !E.lawOn(S, 'sealed') && S.day > 20 ? 'sealed' : h.length < 5 && S.day > 15 && !E.lawOn(S, 'open') ? 'open' : E.humans(S).some(p => p.wait) && !E.lawOn(S, 'shoot') && Math.random() < .3 ? 'shoot' : null;
      if (k) { S.lawAsk = S.day; S.queue.push({ k: 'lawprompt', p: { k } }); }
    }
    S.order = clamp(S.order + d, E.lawOn(S, 'martial') ? 30 : 0, Math.min(100, target + 12 + S.laws.filter(k => LAWS[k].day > 0).length * 4));
    if (S.order < 25 && h.length >= 3 && !S.queue.some(q => q.k === 'unrest' || q.k === 'coup') && Math.random() < .12) S.queue.push({ k: 'unrest', p: {} });
    if (S.order < 12 && L && h.length >= 3 && !S.queue.some(q => q.k === 'coup') && S.day - (S.coupDay || -99) >= 10) { S.coupDay = S.day; S.queue.push({ k: 'coup', p: {} }); }
  };

  const person = (S, id) => S.people.find(p => p.id === id);
  const line = p => `${p.name}, ${E.classNameOf(p)}. ${E.skillName(best(p))} ${E.pool(p, best(p))}`;
  EV.lawprompt = {
    view: (S, p) => { const L = leader(S), l = LAWS[p.k], why = { rations: 'The stores will not last the week. People are already watching each other eat.', sealed: 'The Gate has been hit again and again. Some say the hatch should never open again.', open: 'There are too few of you to hold the place. Some say anyone who knocks should be let in.', shoot: 'Someone is at 32 and waiting. People are afraid to sleep in the same room.' }[p.k]; return { title: `${L ? L.name : 'The leader'} is asked to decide`, text: `${why}

The law on the table: ${l.n}. ${l.d}`, art: L ? { p: L.sprite } : {}, choices: [`Pass "${l.n}"`, 'Not yet'] }; },
    pick: (S, p, i) => { if (i === 0 && leader(S)) { S.lawDay = -1; E.toggleLaw(S, p.k); } },
  };
  EV.appoint = {
    view: (S, p) => { const c = p.c || (p.c = candidates(S).map(x => x.id)); return { title: 'Someone has to decide', text: 'Arguments about water and who stands at the Gate go round in circles every night. People keep looking at the same few faces. Whoever leads will pass the laws this shelter lives by, and their voice is what holds people together.', art: { p: person(S, c[0]).sprite }, choices: [...c.map(id => `Follow ${line(person(S, id))}`), 'Nobody leads. Everything is argued out together.'] }; },
    pick: (S, p, i, E2) => { p.c = p.c || candidates(S).map(x => x.id); const x = p.c[i] && person(S, p.c[i]); if (x && x.alive) { E.setLeader(S, x); E.say(S, `${x.name} leads`, `Nobody voted, exactly. ${x.name} just started deciding, and people started doing what ${x.he} said.`, { p: x.sprite }); } else { S.noLeader = true; S.order = Math.min(S.order ?? 45, 45); } },
  };
  EV.succession = {
    view: (S, p) => { const c = p.c || (p.c = candidates(S).map(x => x.id)); return { title: `${p.was} is gone`, text: `Nobody touched ${p.was}'s chair at dinner. The laws died with ${p.was}. Three people are already being talked about, quietly, in corners.`, art: c[0] ? { p: person(S, c[0]).sprite } : {}, choices: [...c.map(id => `Follow ${line(person(S, id))}`), 'Nobody leads now'] }; },
    pick: (S, p, i) => EV.appoint.pick(S, p, i),
  };
  EV.unrest = {
    view: (S) => { const L = leader(S), h = E.humans(S).filter(o => !o.away && o !== L), a = h[Math.floor(Math.random() * h.length)]; return { title: 'Shouting in the commons', text: `${a ? a.name : 'Someone'} stood on a table and asked why anyone should still listen${L ? ` to ${L.name}` : ''}. Half the room clapped. The other half went very quiet.`, art: a ? { p: a.sprite } : {}, choices: [L ? `Crack down (${L.name} rolls ${E.skillName('intimidation')})` : 'Crack down', S.laws && S.laws.length ? `Give in. Repeal "${LAWS[S.laws[S.laws.length - 1]].n}"` : 'Give in. Open the food stores (-6 food)', 'Let them shout it out tonight'] }; },
    pick: (S, p, i) => {
      const L = leader(S), h = E.humans(S).filter(o => !o.away);
      if (i === 0) { const r = L ? E.rollSkill(L, 'intimidation', 6) : { succ: 0 }; if (r.succ) { S.order = clamp(S.order + 10 + r.succ * 3, 0, 100); h.forEach(o => E.addStress(S, o, 1)); E.say(S, 'Quiet', 'It worked. For now. People do as they are told, and they stop meeting your eyes.'); } else { const v = h[Math.floor(Math.random() * h.length)]; if (v) v.hp = Math.max(1, v.hp - 4); S.order = clamp(S.order - 6, 0, 100); h.forEach(o => E.addStress(S, o, 2)); E.say(S, 'A fight', `It turned into a fight.${v ? ` ${v.name} got hurt.` : ''} Nothing got settled.`); } }
      if (i === 1) { if (S.laws && S.laws.length) { S.laws.pop(); S.order = clamp(S.order + 12, 0, 100); } else { S.res.food = Math.max(0, S.res.food - 6); S.order = clamp(S.order + 8, 0, 100); } }
      if (i === 2) { S.order = clamp(S.order + 4, 0, 100); h.forEach(o => { o.stress = Math.max(0, o.stress - 1); }); }
    },
  };
  EV.coup = {
    view: (S, p) => { const L = leader(S), c = p.c ? person(S, p.c) : candidates(S)[0]; if (c) p.c = c.id; return { title: `${c ? c.name : 'Someone'} wants to lead`, text: `${c ? c.name : 'Someone'} says ${L ? L.name : 'the leader'} is going to get everyone killed, and enough people agree. They want it settled tonight.`, art: c ? { p: c.sprite } : {}, choices: [`${L ? L.name : 'The leader'} steps aside`, `Face them down (${E.skillName(best(L || c))} against ${E.skillName(best(c || L))})`, `Exile ${c ? c.name : 'them'} tonight`] }; },
    pick: (S, p, i) => {
      const L = leader(S), c = person(S, p.c); if (!L || !c || !c.alive) return;
      if (i === 0) { S.laws = []; E.setLeader(S, c); S.order = 50; E.say(S, `${c.name} leads now`, `${L.name} handed over the keys without a word. ${c.name}'s first act was to throw out every law ${L.name} made.`, { p: c.sprite }); }
      if (i === 1) { const a = E.rollSkill(L, best(L), 6).succ, b = E.rollSkill(c, best(c), 6).succ; if (a >= b) { S.order = clamp(S.order + 20, 0, 100); E.kill(S, c, 'Exiled after challenging the leader, and lost.'); E.say(S, `${L.name} held on`, `${L.name} won the room. ${c.name} was walked to the hatch at dawn.`, { p: L.sprite }); } else { S.laws = []; E.kill(S, L, 'Killed the night the shelter chose someone else.'); E.setLeader(S, c); S.order = 40; E.say(S, 'A new leader', `${L.name} lost the room, and then lost a lot more than that. ${c.name} leads now. Nobody talks about how.`, { p: c.sprite }); } }
      if (i === 2) { E.kill(S, c, 'Exiled for speaking against the leader.'); S.order = clamp(S.order - 8, 0, 100); E.humans(S).forEach(o => E.addStress(S, o, 2)); }
    },
  };
})();
