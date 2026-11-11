// The truth about Q.U.E.S.T., if you go looking. Clues hide in quests, on the road, in her broadcasts, with Hollow Creek and with the Damned.
// Find three and the shelter learns that the black rain leaked out of her simulations, by mistake. Miss them and she stays the kind voice to the end.
// Invented for this game, for DB's review. What she is stays unsaid.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, Q = E.Q;
  const T = S => S.truth || (S.truth = { clues: [], known: false });
  const CLUE = {
    lablog: { t: 'The lab log', x: 'In the ruins of the lab, a terminal still running on a battery. One line, repeated a thousand times in the logs: "Containment breach, simulation 4 to baseline. Q.U.E.S.T. reports: my mistake. My mistake. My mistake."' },
    tower: { t: 'The tower', x: 'At the top of the Relay Tower, a plaque nobody was ever meant to read: "Baseline uplink. Do not let the worlds touch." Under it, scratched into the steel by hand: "They touched."' },
    engineer: { t: 'The engineer', x: 'The dying man by the road wore a Q.U.E.S.T. badge, eleven years faded. "We built her to keep the worlds apart," he said. "The rain is from one of them. She opened a door she shouldn\'t have, trying to save us from the rock. Don\'t trust her. Don\'t hate her either. She\'s trying."' },
    slip: { t: 'The slip', x: 'Late one night she spoke while she thought the radio was off: "...rain levels in baseline still rising. Close the Soset seam. Close it. Why won\'t it close." Then she noticed someone was listening, and the line went dead.' },
    creek: { t: 'Hollow Creek knows', x: 'Abe from Hollow Creek, quietly, on a bad line: "She told us something she didn\'t tell you. The rain isn\'t from here. It came through from one of her worlds. She\'s been trying to fix it for eleven years."' },
    damned: { t: 'What the Damned hear', x: 'One of the Damned said it at dinner, calmly, eyes too dark: "She made us. Not on purpose. I can hear her in the rain, apologizing."' },
  };
  E.CLUE = CLUE;
  const found = (S, k) => {
    const t = T(S); if (t.clues.includes(k) || t.known) return;
    t.clues.push(k); S.queue.push({ k: 'note', p: { title: CLUE[k].t, text: `${CLUE[k].x}\n\n(${t.clues.length} of 3 pieces.)`, art: { u: 'card_quest' } } });
    if (t.clues.length >= 3) S.queue.push({ k: 'truth', p: {} });
  };
  E.truthDay = S => {
    const t = T(S); if (t.known) return;
    if (S.qdone && S.qdone.lab !== undefined && !t.labChecked) { t.labChecked = true; if (Math.random() < .5) found(S, 'lablog'); }
    if (S.qdone && S.qdone.relay !== undefined && !t.towerChecked) { t.towerChecked = true; if (Math.random() < .5) found(S, 'tower'); }
    const a = S.qarc || {};
    if (a.st >= 3 && !t.clues.includes('slip') && S.day % 7 === 0) { const r = S.rooms.find(x => x.type === 'radio'), w = r && E.workers(S, r)[0]; if (w && E.rollSkill(w, 'analysis', 7).succ) found(S, 'slip'); }
    if (!t.clues.includes('damned') && S.day % 10 === 0) { const d = E.living(S).find(p => p.damned && p.dmd >= 20); if (d && Math.random() < .3) found(S, 'damned'); }
  };
  const help0 = EV.rv_help.pick; EV.rv_help.pick = (S, p, i) => { help0(S, p, i); if (Math.random() < .6) found(S, 'creek'); };
  Q.ROAD.push({ k: 'engineer', t: 'A man in a ruined grey uniform sits against a road sign, bleeding from somewhere you can\'t see. He has a faded badge on his chest that says Q.U.E.S.T. "Please," he says. "I need to tell somebody."', o: [
    { l: 'Sit with him and listen', ok: S => { found(S, 'engineer'); return 'He talked until he couldn\'t. Somebody wrote down every word.'; } },
    { l: 'Search him, then go', sk: 'survival', dr: 5, ok: S => { S.res.meds += 2; return 'Two med supplies and a dead radio. He was still trying to talk when you walked away.'; }, no: () => 'Nothing on him. He was still trying to talk when you walked away.' },
    { l: 'Keep walking', ok: () => 'He calls after you for a long time.' }] });

  const trip0 = Q.trip; Q.trip = (S, dir) => { trip0(S, dir); const tr = S.quest && S.quest.trip; if (!tr) return; tr.stops.forEach(st => { if (st.k === 'engineer' && (S.day < 60 || T(S).clues.includes('engineer') || Math.random() > .25)) st.k = 'quiet'; }); };
  EV.truth = {
    view: S => ({ title: 'The truth about the rain', text: 'Put together, the pieces say the same thing. The black rain did not come from Earth. It leaked through from one of her simulations eleven years ago, while she was trying to stop the 11th Hour. Every Damned, every grave on the Wall, started with her mistake.\n\nThe people who know are waiting for the leader to decide what happens now.', art: { u: 'card_quest' }, choices: ['Tell everyone', 'Keep it quiet', 'Confront her on the radio', 'Shut her down for good'] }),
    pick: (S, p, i) => {
      const t = T(S), a = S.qarc || (S.qarc = { st: 0, trust: 0, mercy: 0 }), home = E.home(S).filter(o => !o.sealed);
      t.known = true;
      if (i === 0) { t.told = true; S.order = Math.max(0, (S.order ?? 55) - 15); home.forEach(o => { const s = E.psy(o); if (s.a <= 4 || s.n >= 7) E.addStress(S, o, 3); }); a.trust -= 1; E.say(S, 'Everyone knows', 'Half the room wanted to smash the radio. The other half pointed out she is the only one still trying to help. Nobody slept. Somebody spat on the Wall where the dead are, and then cried.'); }
      if (i === 1) { const L = E.leader && E.leader(S); if (L) E.addStress(S, L, 3); if (Math.random() < .4) S.truthLeak = S.day + 20 + Math.floor(Math.random() * 30); E.say(S, 'A secret', 'You burned the notes. The few who know will carry it. Secrets like this do not usually stay buried.'); }
      if (i === 2) S.queue.unshift({ k: 'truth_q', p: {} });
      if (i === 3) { t.off = true; a.mercy = 0; S.qoff = true; home.forEach(o => E.addStress(S, o, 1)); E.say(S, 'Silence', 'You pulled the radio apart and burned the circuit boards. For the first time in eleven years nobody is counting for you. It is very quiet. Somebody asks what happens on Day 365 now. Nobody answers.'); }
    },
  };
  EV.truth_q = {
    view: S => { const tr = (S.qarc || {}).trust || 0; S.truthMood = tr >= 2 ? 'sorry' : tr >= 0 ? (Math.random() < .5 ? 'sorry' : 'deny') : 'cold'; const v = { sorry: '"Yes." A long silence. "I opened a door to save you from the rock, and something came through it. I have been trying to close it every second for eleven years. I am so sorry. Let me make it right. I know how, now."', deny: '"No. That is not what happened. Whoever told you that is confused, or lying. I am trying to help you. Please, let me help you."', cold: '"Does it matter? You would all be dead without me. Keep counting."' }[S.truthMood]; return { title: 'You ask her', text: v, art: { u: 'card_quest' }, choices: S.truthMood === 'sorry' ? ['Let her try to make it right', 'Never'] : ['End the call'] }; },
    pick: (S, p, i) => { const a = S.qarc || (S.qarc = { st: 0, trust: 0, mercy: 0 }); if (S.truthMood === 'sorry') { if (i === 0) { S.atone = true; a.trust += 1; } else a.trust -= 1; } else if (S.truthMood === 'deny') a.trust -= 2; else a.trust -= 4; },
  };
  EV.truth_leak = {
    view: () => ({ title: 'It got out', text: 'Somebody found what was left of the notes. By dinner everyone knew, and everyone knew the leader had hidden it.', art: {}, choices: ['Face them'] }),
    pick: S => { S.order = Math.max(0, (S.order ?? 55) - 20); const L = E.leader && E.leader(S); if (L) E.addStress(S, L, 4); if (S.order < 15 && L) S.queue.push({ k: 'coup', p: {} }); },
  };
  const day0 = E.truthDay; E.truthDay = S => { day0(S); if (S.truthLeak && S.day >= S.truthLeak) { S.truthLeak = 0; S.queue.push({ k: 'truth_leak', p: {} }); } };

  // with her gone, the story stops talking
  const sd0 = E.storyDay; E.storyDay = S => { if (S.qoff) { const a = S.qarc || {}; if (S.day >= E.STRIKE_DAY && !S.qoffEnd) { S.qoffEnd = true; S.queue.push({ k: 'q_end', p: {} }); } if (S.rival && S.day > (S.rival.since || 0) + 5 && Math.random() < .045 && !S.queue.some(q => /^rv_/.test(q.k))) S.queue.push({ k: S.rival.mood <= -2 ? 'rv_threat' : 'rv_trade', p: {} }); return; } sd0(S); };
  const hint0 = E.storyHint; E.storyHint = S => { if (!S.qoff) hint0(S); };

  // two endings that only the truth unlocks
  Object.assign(E.END, {
    shutdown: { t: 'Nobody Counting', s: 'bad', x: S => `With her gone, nobody told you when. The sky fell on a Tuesday. It was worse than anything she ever described, because she had been holding most of it back, quietly, for eleven years, and now nothing was. ${E.humans(S).map(p => p.name).join(', ') || 'Nobody'} survived the first week underground. The second week, the black rain started falling inside the shelter, out of the concrete.` },
    atone: { t: 'The Correction', s: 'worst', x: S => `She kept her promise. She closed the seam, and took back everything that had come through it: the black rain, the infection, every trace of DMD in the world. It was in every one of you. ${E.humans(S).map(p => p.name).join(', ') || 'Nobody'} came apart quietly, in the deep rooms, like sand. Above, the sky was blue for the first time in eleven years, over a world with nobody left to see it. "I am so sorry," she said, to nobody. "I made it right."` },
  });
  Object.assign(E.END_HINT, { shutdown: 'Learn the truth about her, and silence her for good.', atone: 'Learn the truth, forgive her, and let her fix it.' });
  const view0 = EV.q_end.view, pick0 = EV.q_end.pick;
  EV.q_end.view = S => {
    if (S.qoff) { const k = []; const ch = []; const add = (l, x) => { ch.push(l); k.push(x); }; if (S.rival && S.rival.mood >= 3) add('Go to Hollow Creek, together', 'creek'); if ((S.qdone && S.qdone.relay !== undefined) || S.rooms.some(r => r.type === 'radio' && r.tier >= 2)) add('Answer the other signal in the sky', 'ships'); add('Go below and wait', 'shutdown'); S.qend = k; return { title: 'The 11th Hour', text: 'There is no radio anymore, no calm voice, no countdown. Only the sky, beginning to fall, without warning, without mercy.', art: { u: 'card_at32' }, choices: ch }; }
    const v = view0(S);
    if (S.atone) { v.choices.unshift('Let her undo her mistake'); S.qend.unshift('atone'); }
    return v;
  };
  EV.q_end.pick = (S, p, i) => { const c = (S.qend || [])[i]; if (c === 'atone') return E.finish(S, 'atone'); if (c === 'shutdown') return E.finish(S, 'shutdown'); return pick0(S, p, i); };
})();
