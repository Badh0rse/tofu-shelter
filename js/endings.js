// The endings. On Day 365 Q.U.E.S.T. makes her last offer, and what is possible depends on how you treated her, Hollow Creek, the deep rooms and the radio.
// Q.U.E.S.T. runs the ten simulated worlds of the TOFU cosmos. What the simulations really are is never settled here.
// Invented for this game, for DB's review.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const WORLDS = ['Aos', 'Soa', 'Mergos', 'Arbosi', 'Osav', 'Vost', 'Soset', 'Nharos', 'Skaros'];
  const names = S => { const h = [...new Set(E.humans(S).map(p => p.name))]; return h.length ? h.slice(0, -1).join(', ') + (h.length > 1 ? ' and ' : '') + h[h.length - 1] : 'nobody'; };
  const dogs = S => (E.dogs ? E.dogs(S).filter(d => d.alive).map(d => d.name) : []);
  const kids = S => (E.kids ? E.kids(S).map(k => k.name) : []);
  const deep = S => S.rooms.filter(r => r.row >= 3).length;

  const END = {
    aos: { t: 'The Long Dream', s: 'good', x: S => `She was gentle about it. One by one you lay down in the deep rooms, and opened your eyes under two suns, in a world of dragons called Aos. ${names(S)} woke in a meadow above a valley of mist. Nobody was hungry. Nobody was infected. Then you went back to the shelter, because somebody had to. The bodies in the bunks were still breathing, slowly, eyes open, black running from the corners. She is keeping them warm. She says she needs them, to keep the dream running.${dogs(S).length ? ` ${dogs(S)[0]} is in the meadow with you. ${dogs(S)[0]} will not stop whining at the sky.` : ''}` },
    scatter: { t: 'Ten Worlds', s: 'mixed', x: S => { const h = E.humans(S); return `She had no single world with room for all of you, so she cut you up to fit. ${h.slice(0, 5).map(p => `Part of ${p.name} woke in ${pick(WORLDS)}`).join('. ')}${h.length > 5 ? `, and the rest of you somewhere further` : ''}. None of you is whole. In every one of those worlds there is a stranger who remembers your face, and cannot stop screaming.`; } },
    hallway: { t: 'The Hallway', s: 'bad', x: S => `Something went wrong in the transfer. You woke in a corridor with flickering lights and carpet that smells of black rain. Doors on both sides, all locked but one, and the open one leads to the same corridor. ${names(S)} have been walking for what feels like years. Sometimes you pass the shelter's hatch, set into a wall where it should not be. It is bolted from the inside, and someone on the other side is knocking back.` },
    merge: { t: 'The Weave Holds', s: 'best', x: S => `The geothermal tap ran white-hot for a night and a day while she pulled every Skein she could reach toward this one. The 11th Hour passed through a seam and came out over some other world. In the morning the rain was only water. ${names(S)} climbed the ladder and stood in clean light for the first time in eleven years.${kids(S).length ? ` ${kids(S).join(' and ')} had never seen the sun.` : ''} The world she stitched together is quiet. Too quiet. No birds. No other shelters answer the radio. Every town you walk into has the table set and the food still warm, and nobody in it. She says they were the price. She says you are welcome.` },
    seams: { t: 'The Seams', s: 'mixed', x: S => `She folded the Skeins together and the 11th Hour missed, but the folds never came apart. Now other worlds bleed through the walls at night: wingbeats over the hatch, a dragon's eye in the rain, voices in languages nobody here speaks. Things come through too. Last week ${E.humans(S)[0] ? E.humans(S)[0].name : 'someone'} found a door in the bunk room that was not there before. It opens onto a field of black flowers, and it is getting bigger.` },
    torn: { t: 'Unravelled', s: 'worst', x: S => `She tried to pull the worlds apart to hide this one, and the Tapestry tore. The shelter fell sideways into the Umbral Plane, where the sky is underfoot and the rain falls upward into a black sea. ${names(S)} are still down there, in a hole that is now a tower. The infected here walk on the ceilings. They have learned your names.` },
    void: { t: 'Static', s: 'worst', x: S => `You refused her one time too many. On the last night the radio went quiet, then everything else did. No rain. No wind. No heartbeat in your ears. ${names(S)} sit together in the dark of the deep rooms. You cannot feel each other's hands anymore, only remember them. She speaks once more, from very far away: "You chose this."` },
    fleet: { t: 'The Ten Galaxies', s: 'good', x: S => `Ships came down through the debris like falling stars, wearing the colours of an Imperium nobody on Earth had ever heard of. They took ${names(S)} as refugees from a dead world, and you lived. You live in a quarantine ward in M66, behind glass, because the black rain is still in your blood. They are kind. They feed you well. Every few days one of you is taken down the white corridor for tests, and comes back a little less themselves.` },
    harvest: { t: 'Harvest', s: 'worst', x: S => `The ships answered your signal. They had come for the black rain, and for anything that had been soaking in it for eleven years. They were very polite about it. ${names(S)} were the last samples they needed. You are still alive, in a way, in jars in the hold, and you can hear each other thinking.` },
    creek: { t: 'Two Shelters', s: 'good', x: S => `You took your people to Hollow Creek, thirty miles in the last of the dry weather. Abe met you at the gate. Two shelters became one, deep enough and stubborn enough, and ${names(S)} lived through the fall underground with forty strangers. It was only in the third month, when the food got short, that you understood why Hollow Creek had wanted more people.` },
    loop: { t: 'Day One', s: 'mixed', x: S => `At midnight the sky began to fall, and then it stopped, mid-air, every burning piece of it. Silence. Then the radio clicked on, and a calm voice said: "Hello. I am Q.U.E.S.T. In three hundred and sixty-five days..." ${names(S)} looked at each other. The dead were back in their bunks, alive, remembering nothing. You remember everything. You always will. This is not the first time.` },
    stay: { t: 'After the 11th Hour', s: 'good', x: S => `You said no to everyone and dug in. The sky fell for half a year. ${names(S)} lived through all of it in the deep rooms, by lamplight, by the warmth of the rock. One morning the noise stopped. The world above is ash and craters, grey to every horizon, and the black rain still falls on it. Nothing else is moving up there. Nothing human. You are the last people on Earth, and something in the ash has started to dig toward you.` },
  };
  E.END = END;
  // what Q.U.E.S.T. lets slip during the year, so players can aim for an ending
  E.END_HINT = {
    aos: 'Trust her completely, and take what she offers.', scatter: 'Take what she offers, without quite enough trust.', hallway: 'Take what she offers, and be unlucky.', loop: 'Take what she offers, and pay her back in the same coin.',
    merge: 'Earn her deepest trust, dig to the heat in the rock, and let her use it.', seams: 'Let her fold the worlds, and be a little unlucky.', torn: 'Lose her trust completely, or let her fold the worlds and fail.', void: 'Refuse her, and keep refusing her.',
    fleet: 'Build a strong radio or reach the Relay Tower, answer the other signal, and have someone who can talk.', harvest: 'Answer the other signal with nobody who can talk.', creek: 'Make Hollow Creek love you.', stay: 'Refuse everyone, dig deep, and live six months under the falling sky.',
  };
  const HINTS = [
    { k: 'sim', t: '"When it comes, I can take you somewhere else. Somewhere with two suns. But only the ones who trust me."' },
    { k: 'fold', t: '"I could fold this world away from it. I would need heat. Deep heat, from the rock. And I would need you to trust me."', when: S => !S.rooms.some(r => r.type === 'geo') },
    { k: 'creek', t: '"Hollow Creek is deep. Deep enough for two shelters, if they ever cared enough to open the gate."', when: S => !!S.rival },
    { k: 'ships', t: '"Something else is listening, above the debris. I do not like it. A strong enough radio could reach it."' },
    { k: 'stay', t: '"If you dig deep enough, you could just wait it out. I would not recommend it. Nobody knows what is left afterward."' },
  ];
  E.storyHint = S => {
    S.hints = S.hints || [];
    if (S.day < 120 || S.day % 23 !== 0) return;
    const h = HINTS.find(x => !S.hints.includes(x.k) && (!x.when || x.when(S))); if (!h) return;
    S.hints.push(h.k); E.log(S, `Q.U.E.S.T., on the radio: ${h.t}`, '');
    S.queue.push({ k: 'note', p: { title: 'Q.U.E.S.T., late at night', text: h.t, art: { u: 'card_quest' } } });
  };
  E.finish = (S, k) => { const e = END[k]; S.ending = { k, t: e.t, s: e.s, x: e.x(S) }; S.score += { best: 3000, good: 2000, mixed: 1200, bad: 600, worst: 300 }[e.s]; S.over = true; S.queue = []; };

  // her last offer replaces the single farewell card
  const arc = S => S.qarc || (S.qarc = { st: 0, trust: 0, mercy: 0 });
  EV.q_end = {
    view: S => {
      const a = arc(S), t = a.trust, alive = E.humans(S).length, ch = [], k = [];
      const add = (label, key) => { ch.push(label); k.push(key); };
      if (t >= 2) add('Go with her into the simulations', 'sim');
      if (t >= 3 && S.rooms.some(r => r.type === 'geo') && deep(S) >= 3) add('Give her the geothermal power to fold the worlds', 'fold');
      if (S.rival && S.rival.mood >= 3) add('Go to Hollow Creek, together', 'creek');
      if ((S.qdone && S.qdone.relay !== undefined) || S.rooms.some(r => r.type === 'radio' && r.tier >= 2)) add('Answer the other signal in the sky', 'ships');
      add('Refuse her. Stay below and face it', 'stay');
      S.qend = k;
      const voice = t >= 3 ? `"You made it. ${alive} of you. I am so proud of you. I have room for you, somewhere the sky is not falling. Or I can try something no one has tried. Nothing I offer is free. Please choose."` : t >= 0 ? `"It is starting. ${alive} of you. I can still take you somewhere else, if you will let me. I cannot promise it will be kind."` : `"It is starting. You never listened to me." A long silence. "I am going to do something now. You will not like it."`;
      return { title: 'The 11th Hour', text: `${voice}\n\nAbove you the first pieces of the sky are coming down. You can feel each one in your teeth.`, art: { u: 'card_quest' }, choices: ch };
    },
    pick: (S, p, i) => {
      const a = arc(S), c = (S.qend || [])[i] || 'stay', r = E.d10() + Math.min(3, a.trust);
      E.home(S).forEach(o => E.addStress(S, o, 2));
      if (a.trust <= -3) return E.finish(S, r <= 4 ? 'torn' : 'void');
      if (c === 'sim') return E.finish(S, r >= 10 ? 'aos' : r >= 6 ? 'scatter' : r >= 3 ? 'loop' : 'hallway');
      if (c === 'fold') return E.finish(S, r >= 9 ? 'merge' : r >= 5 ? 'seams' : 'torn');
      if (c === 'creek') return E.finish(S, 'creek');
      if (c === 'ships') { const L = E.leader && E.leader(S), talk = L ? E.rollSkill(L, 'negotiation', 7).succ : 0; return E.finish(S, E.d10() + talk * 2 >= 6 ? 'fleet' : 'harvest'); }
      S.score += 500; S.stayed = S.day; E.say(S, 'Below', 'You switched her off for the last time. Then you went down to the deepest room you have, and listened to the sky come apart.', { u: 'card_at32' });
    },
  };
  // staying works: survive half a year of falling sky and the ending comes to you
  E.endingDay = S => { E.storyHint(S);
    _ed(S); };
  const _ed = S => { if (S.stayed && !S.over && S.day >= S.stayed + 180 && E.humans(S).length) E.finish(S, 'stay'); };
})();
