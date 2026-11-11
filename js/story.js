// The story: Q.U.E.S.T. counts down to the 11th Hour, a rival shelter listens on the same frequency, and the deep levels are where you go to live through it.
// Invented for this game, for DB's review. Q.U.E.S.T. is never explained.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const left = S => Math.max(0, E.STRIKE_DAY - S.day);
  const arc = S => { const a = S.qarc || (S.qarc = { st: 0, trust: 0, mercy: 0 }); if (!a.off) a.off = [0, 1, 2, 3, 4, 5, 6].map(i => Math.floor(Math.random() * (i ? 15 : 6)) - (i ? 7 : 0)); return a; };
  const radio = S => S.rooms.some(r => r.type === 'radio');
  const how = S => (radio(S) ? 'The radio clicks on by itself.' : 'There is no radio room. The voice comes out of a dead phone in somebody\'s bag, and nobody can make it stop.');

  // ---------- the deep levels: built only on level 4 and below
  Object.assign(D.ROOMS, {
    well: { name: 'Deep Well', art: 'water', skill: 'engineering', res: 'water', base: 4, perTier: 1.5, k: .5, power: 0, cap: 2, build: 90, minRow: 3, unique: true, desc: 'Groundwater from below the black rain. Never tainted, needs no power. Level 4 and deeper.' },
    vault: { name: 'Vault', art: 'trade', cap: 0, build: 120, minRow: 3, unique: true, desc: 'Steel and concrete under everything. Doubles food and water storage, and nothing in it is lost when the sky falls. Level 4 and deeper.' },
    geo: { name: 'Geothermal Tap', art: 'generator', skill: 'engineering', cap: 1, build: 160, minRow: 4, unique: true, desc: 'Heat from deep rock. Powers four rooms without any fuel, as long as someone tends it. Level 5 and deeper.' },
  });
  const b0 = E.build; E.build = (S, type, slot) => { const d = D.ROOMS[type]; if (d && d.minRow && slot.row < d.minRow) return null; return b0(S, type, slot); };
  const caps0 = E.storeCaps; E.storeCaps = S => { const c = caps0(S); if (S.rooms.some(r => r.type === 'vault' && !r.broken)) { c.food *= 2; c.water *= 2; } return c; };
  const ps0 = E.powerSupply; E.powerSupply = S => ps0(S) + S.rooms.filter(r => r.type === 'geo' && !r.broken && E.workers(S, r).length).reduce((a, r) => a + 4 + r.tier * 2, 0);
  const fb0 = E.fuelBurn; E.fuelBurn = S => { const geo = S.rooms.filter(r => r.type === 'geo' && !r.broken && E.workers(S, r).length).reduce((a, r) => a + 4 + r.tier * 2, 0); if (!geo) return fb0(S); const d = E.powerDemand(S); return d <= geo ? 0 : Math.max(1, Math.ceil((d - geo) / 4)); };

  // ---------- the arc. Each step fires once, on or after its day.
  const STEPS = [
    { day: 10, k: 'q_first' }, { day: 45, k: 'q_count' }, { day: 100, k: 'q_deep' }, { day: 160, k: 'q_take' },
    { day: 230, k: 'q_rival' }, { day: 300, k: 'q_seats' }, { day: 345, k: 'q_hour' }, { day: 365, k: 'q_end' },
  ];
  E.storyDay = S => {
    const a = arc(S), s = STEPS[a.st], due = s && (s.k === 'q_end' ? s.day : s.day + (a.off[a.st] || 0));
    if (s && S.day >= due && !S.queue.some(q => q.k === s.k)) { a.st++; S.queue.push({ k: s.k, p: {} }); }
    // the rival shelter, once you know about it
    if (S.rival && S.day > (S.rival.since || 0) + 5 && Math.random() < .045 && !S.queue.some(q => /^rv_/.test(q.k))) {
      const m = S.rival.mood, k = m <= -2 ? 'rv_threat' : m >= 2 && Math.random() < .5 ? 'rv_help' : pick(['rv_trade', 'rv_ask']);
      S.queue.push({ k, p: {} });
    }
    if (S.rivalRaid && S.day >= S.rivalRaid) { S.rivalRaid = 0; S.threat = { groups: ['human'], known: true, rival: true }; E.log(S, `Lights on the road. ${S.rival.name} is coming for what you have. Tonight.`, 'bad'); }
  };
  // she spares you some of the strikes if she likes you
  const TONE = { up: ['She sounds pleased.', 'Something in her voice warms.', 'She says thank you, and sounds like she means it.'], down: ['She sounds disappointed.', 'The line goes cold for a moment.', 'She is quiet for a long time before she answers.'] };
  const tone = (S, before) => { const a = arc(S); if (a.trust > before) E.log(S, `Q.U.E.S.T.: ${pick(TONE.up)}`, 'good'); else if (a.trust < before) E.log(S, `Q.U.E.S.T.: ${pick(TONE.down)}`, 'bad'); };
  E.strikeMercy = S => { const a = arc(S); if (a.mercy > 0) { a.mercy--; return true; } return false; };

  const V = (S, title, text, choices) => ({ title, text, art: { u: 'card_quest' }, choices });
  EV.q_first = {
    view: S => V(S, 'A voice on the radio', `${how(S)} A woman's voice, calm and kind: "Hello. I am Q.U.E.S.T. I have been listening to all of you. Eleven years ago they found the 11th Hour and gave me the countdown. This is the last year of it. In ${left(S)} days it arrives. I am still counting, for you, so you do not have to."`, ['Answer her', 'Switch it off']),
    pick: (S, p, i) => { const a = arc(S); a.trust += i === 0 ? 1 : -1; E.home(S).forEach(o => E.addStress(S, o, 1)); E.log(S, `${left(S)} days, she said. Somebody wrote it on the wall.`, 'bad'); },
  };
  EV.q_count = {
    view: S => { const dead = S.memorial.filter(m => !m.dog).slice(-1)[0]; return V(S, 'Q.U.E.S.T. again', `"${dead ? `I am sorry about ${dead.name.split(' ')[0]}. ${/ate/.test(dead.why) ? 'I know what you did afterward. I do not judge you. Hunger is honest.' : 'You buried them well.'} ` : ''}${left(S)} days. I can help you get there. Tell me how many of you there are, truly, and I will leave medicine by the culvert."`, ['Tell her the truth', 'Lie to her (Deception, DR 7)', 'Say nothing']); },
    pick: (S, p, i) => {
      const a = arc(S);
      if (i === 0) { a.trust += 1; S.res.meds += 6; E.addItem(S, 'antibiotics', 1); E.say(S, 'The culvert', 'Six med supplies and a course of antibiotics, wrapped in plastic, exactly where she said. A child\'s handwriting on the label: "for the brave ones".'); }
      if (i === 1) { const liar = E.home(S).filter(o => !o.sealed).sort((x, y) => E.pool(y, 'deception') - E.pool(x, 'deception'))[0], r = liar ? E.rollSkill(liar, 'deception', 7) : { succ: 0 }; if (r.succ) { S.res.meds += 3; E.say(S, 'Half the truth', `${liar.name} lied well. Three med supplies by the culvert. "Close enough," she said, and laughed.`); } else { a.trust -= 1; E.say(S, 'She knew', `"There are ${E.humans(S).length} of you," she said, gently. "Please don't lie to me. I am trying to help." Nothing by the culvert.`); } }
      if (i === 2) a.trust -= 1;
    },
  };
  EV.q_deep = {
    view: S => V(S, 'How deep is safe', `"${left(S)} days. Let me explain what is coming, because no one else will. The 11th Hour is breaking apart as it comes. The pieces will fall first, for months, before anyone knows what the rest will do. Your top floors will not hold. Dig. Below the fourth level, the rock will protect you. I would like you to live."`, ['Ask her what is down there', 'Tell her to stop talking']),
    pick: (S, p, i) => { const a = arc(S); S.deepTold = true; if (i === 0) { a.trust += 1; E.say(S, 'What is down there', '"Water that the rain never touched. Heat from the rock itself. A place to keep what you cannot lose." The line went quiet. Then: "Dig, please."'); } else a.trust -= 1; E.log(S, 'Rooms on level 4 and deeper are safe from falling debris. Deep rooms can only be built there.', 'good'); },
  };
  EV.q_take = {
    view: S => { const x = E.humans(S).filter(o => !o.away && !o.sealed).sort((m, n) => n.dmd - m.dmd)[0]; S.qtake = x && x.id; return V(S, 'She asks for someone', x ? `"${x.name} is at ${x.dmd}. ${x.name} will not see the 11th Hour, and you both know it. Let me take ${x.he === 'he' ? 'him' : 'her'}. I can make it painless. And I will make it worth your while."` : '"Not yet. Soon."', x ? [`Let ${x.name} go with her`, 'No'] : ['Switch it off']); },
    pick: (S, p, i) => { const a = arc(S), x = S.people.find(o => o.id === S.qtake); if (!x || !x.alive || i !== 0) { a.trust -= x ? 1 : 0; return; } a.trust += 2; x.alive = false; x.room = null; x.sealed = false; x.wait = null; S.memorial.push({ name: `${x.name} ${x.last}`, sprite: x.sprite, cls: E.classNameOf(x), day: S.day, why: 'Went with Q.U.E.S.T. Nobody knows.', level: x.level, ep: 'Somewhere better, she said.' }); S.res.food += 20; S.res.water += 20; E.say(S, 'A truck with no driver', `It came at dawn. ${x.name} climbed in and did not look back. Where it had stood, someone found twenty days of food and water, still cold.`, { p: x.sprite }); },
  };
  EV.q_rival = {
    view: S => V(S, 'Someone else is listening', `"There is another shelter. Hollow Creek, thirty miles east. They listen to me too. ${left(S)} days, and I am telling them what I tell you. I have room for one of you when it comes. Only one."`, ['Warn Hollow Creek about her', 'Say nothing']),
    pick: (S, p, i) => { const a = arc(S); S.rival = { name: 'Hollow Creek', mood: i === 0 ? 2 : 0, since: S.day }; if (i === 0) { a.trust -= 1; E.say(S, 'Hollow Creek', 'A man named Abe answered. He did not believe you, and then he did. "We owe you," he said. "We will not forget it."'); } else a.trust += 1; },
  };
  EV.q_seats = {
    view: S => { const kids = E.kids ? E.kids(S) : [], young = E.humans(S).filter(o => !o.away && !o.sealed).sort((m, n) => (m.joined - n.joined) || m.level - n.level).reverse().slice(0, 3); S.qseats = kids.length ? { kids: kids.slice(0, 3).map(k => k.id) } : { ids: young.map(o => o.id) }; const who = kids.length ? kids.slice(0, 3).map(k => k.name) : young.map(o => o.name); return V(S, 'Three seats', `The lines in the sky do not fade by morning now. "${left(S)} days," she says. "I have three seats somewhere safe. I want the youngest. ${who.join(', ')}. You will never see them again, but they will see the 12th hour, and the 13th."`, [`Send ${who.join(', ')}`, 'We stay together']); },
    pick: (S, p, i) => {
      const a = arc(S), q = S.qseats || {}; if (i !== 0) { a.trust -= 1; E.home(S).forEach(o => { o.stress = Math.max(0, o.stress - 1); }); return; }
      a.trust += 2;
      (q.kids || []).forEach(id => { const k = E.kids(S).find(x => x.id === id); if (k) S.kids = E.kids(S).filter(x => x !== k); });
      (q.ids || []).forEach(id => { const x = S.people.find(o => o.id === id); if (x && x.alive) { x.alive = false; x.room = null; S.memorial.push({ name: `${x.name} ${x.last}`, sprite: x.sprite, cls: E.classNameOf(x), day: S.day, why: 'Given a seat by Q.U.E.S.T.', level: x.level, ep: 'Somewhere safe. We hope.' }); } });
      E.home(S).forEach(o => E.addStress(S, o, 3)); S.score += 300;
      E.say(S, 'Gone east', 'The truck took them before the sun came up. Somebody ran after it until they couldn\'t. The bunks are very quiet now.');
    },
  };
  EV.q_hour = {
    view: S => { const t = arc(S).trust; return V(S, 'Twenty days', t >= 2 ? `"Twenty days. I will tell you where the first of it falls, so you can be somewhere else. You were honest with me. I keep my promises."` : `"Twenty days." Nothing else. She only counts now, every hour, in the same calm voice.`, ['Listen']); },
    pick: S => { const a = arc(S); if (a.trust >= 2) a.mercy = 3; },
  };
  EV.q_end = {
    view: S => { const a = arc(S), alive = E.humans(S).length; return V(S, 'The 11th Hour', `${how(S)} "${a.trust >= 3 ? `You made it. ${alive} of you. I am so proud of you. Go below, all of you. It is starting.` : a.trust >= 0 ? `It is starting. ${alive} of you. I hope it is enough.` : `It is starting. You never listened to me. I hope the rock is kind to you.`}" Then the line goes dead, for good. Above you, the sky begins to fall.`, ['Go below']); },
    pick: S => { E.home(S).forEach(o => E.addStress(S, o, 2)); S.score += 500; },
  };

  ['q_first', 'q_count', 'q_deep', 'q_take', 'q_rival', 'q_seats'].forEach(k => { const p0 = EV[k].pick; EV[k].pick = (S, p, i) => { const b = arc(S).trust; p0(S, p, i); tone(S, b); }; });
  // ---------- Hollow Creek
  EV.rv_trade = {
    view: S => V(S, `${S.rival.name} on the radio`, `Abe from ${S.rival.name}, tired: "We have fuel and no medicine. Ten fuel for four med supplies. We will owe you."`, ['Trade (4 Med for 10 fuel)', 'No']),
    pick: (S, p, i) => { if (i === 0 && S.res.meds >= 4) { S.res.meds -= 4; S.res.fuel += 10; S.rival.mood++; } else S.rival.mood--; },
  };
  EV.rv_ask = {
    view: S => V(S, `${S.rival.name} is begging`, `"Please. We have kids sick with fever. Anything." You can hear them coughing behind him.`, ['Send antibiotics or 5 Med', 'We have nothing to spare']),
    pick: (S, p, i) => { if (i === 0) { const it = E.items(S); if (it.antibiotics) it.antibiotics--; else if (S.res.meds >= 5) S.res.meds -= 5; else { S.rival.mood--; return; } S.rival.mood += 2; E.home(S).forEach(o => { if (E.psy(o).a >= 6) o.stress = Math.max(0, o.stress - 1); }); } else { S.rival.mood -= 2; E.home(S).forEach(o => { if (E.psy(o).a >= 7) E.addStress(S, o, 1); }); } },
  };
  EV.rv_help = {
    view: S => V(S, `${S.rival.name} remembers`, `Two of theirs walked thirty miles in the rain to stand at your Gate for a week. "Abe says we owe you."`, ['Thank them']),
    pick: S => { S.rivalAid = S.day + 7; },
  };
  EV.rv_threat = {
    view: S => V(S, `${S.rival.name} wants what you have`, `"Only one shelter gets her seat," Abe says. He doesn't sound tired anymore. "We're coming for your stores. Give us 20 food and water and we'll go somewhere else."`, ['Pay them (20 food, 20 water)', 'Let them come']),
    pick: (S, p, i) => { if (i === 0 && S.res.food >= 20 && S.res.water >= 20) { S.res.food -= 20; S.res.water -= 20; S.rival.mood = 0; } else { S.rivalRaid = S.day + 2; } },
  };
})();
