// Demo mode: the game runs to a big Day 60 finale, a cliffhanger from Q.U.E.S.T., then a thank-you screen.
// Off unless the page is opened with #demo or a build sets globalThis.TOFU_DEMO. Invented for DB's review.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, Q = E.Q;
  const hash = typeof location !== 'undefined' && /demo/i.test(location.hash || '');
  // Pay-for-a-code unlock, the same way as Mistward Road. Not real protection: a shared code still works,
  // and everything runs in the browser. Only hashes are stored here; the codes are in tofu_shelter/UNLOCK_CODES.txt.
  const CODES = new Set([
    '1m947hg5qfk', // paid: the code in the Ko-fi shop item
    'sdxgx9mnbg', // free: the friends' code DB gives out by hand. Delete this line to cancel it; buyers are unaffected.
  ]);
  const KEY = 'tofu.shelter.unlocked';
  const h53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const hashOf = c => h53('tofushelter/' + String(c).toUpperCase().replace(/[^A-Z0-9]/g, ''));
  let unlocked = false; try { unlocked = CODES.has(localStorage.getItem(KEY) || ''); } catch (e) { }
  E.DEMO = Object.assign({ on: hash, day: 60, link: 'https://ko-fi.com/cosmerecrawler', linkText: 'Support on Ko-fi', shop: 'https://ko-fi.com/cosmerecrawler', price: '$3' }, globalThis.TOFU_DEMO || {});
  if (globalThis.TOFU_DEMO) E.DEMO.on = globalThis.TOFU_DEMO.on !== false;
  E.DEMO.locked = E.DEMO.on; // a demo build, whether or not it has been unlocked
  if (unlocked) E.DEMO.on = false;
  E.DEMO.redeem = code => { if (!CODES.has(hashOf(code))) return false; try { localStorage.setItem(KEY, hashOf(code)); } catch (e) { } E.DEMO.on = false; return true; };

  const atHome = S => E.home(S).filter(p => p.alive && !p.sealed && !p.damned && !p.away);

  // two nights out, the warning
  EV.demo_eve = {
    view: S => ({ title: 'The dogs won\'t stop', text: `Every dog on the road has been howling since sundown, all facing the same way. ${S.rooms.some(r => r.type === 'radio') ? 'The radio is picking up breathing on every channel.' : 'Somebody swears they can hear breathing through the hatch.'} The tracks in the mud this morning were not from one thing. They were from hundreds.\n\nWhatever is coming will be here in two nights. Everyone who can hold a weapon should be at the Gate.`, art: { u: 'card_knocks' }, choices: ['Board up and wait', 'Put everyone on the Gate'] }),
    pick: (S, p, i) => { if (i === 1) S.demoAll = true; },
  };

  // the siege
  const siege = S => {
    const gate = S.rooms.find(r => r.type === 'gate');
    let team = gate ? E.workers(S, gate).filter(p => p.hp > 0 && !p.damned) : [];
    const rest = atHome(S).filter(p => !team.includes(p) && p.hp > 0).sort((a, b) => b.level - a.level);
    while (team.length < 4 && rest.length) team.push(rest.shift());
    if (!team.length) return false;
    const lv = Math.max(2, Math.min(E.foeLevel(S) + 1, Math.round(team.reduce((a, p) => a + p.level, 0) / team.length) + 1));
    const foes = E.pickFoes(['infected', 'animal'], lv, Math.round(team.length * 2 + 4), 9);
    if (!foes.length) return false;
    S.threat = null;
    S.raidNow = { foes, ids: team.map(p => p.id).slice(0, 4), kind: 'The Long Night. They came out of the rain all at once, more of them than anyone has ever seen together, climbing over each other to reach the hatch. The lights are flickering. Hold the Gate.' };
    E.log(S, 'The Long Night has begun.', 'bad');
    return true;
  };

  const day0 = E.truthDay; E.truthDay = S => {
    day0(S);
    if (!E.DEMO.on || S.over) return;
    if (!S.demo && S.day >= E.DEMO.day - 2) { S.demo = 'eve'; S.queue.push({ k: 'demo_eve', p: {} }); }
    else if (S.demo === 'after' && S.day >= S.demoEnd) { S.demo = 'done'; S.queue.push({ k: 'demo_end', p: {} }); }
    else if (S.demo === 'eve' && S.day >= E.DEMO.day) { S.demo = siege(S) ? 'siege' : 'done'; if (S.demo === 'done') S.queue.push({ k: 'demo_end', p: {} }); }
  };

  const fin0 = Q.finish; Q.finish = S => {
    const q = S.quest, was = q && q.defend && S.demo === 'siege';
    fin0(S);
    if (was && !S.quest && !S.over && E.humans(S).length) { S.demo = 'after'; S.demoWon = !q.rep.failed; S.demoEnd = S.day + 1; }
  };

  EV.demo_end = {
    view: S => {
      const n = E.humans(S).length, dead = (S.memorial || []).filter(m => !m.dog && !m.left).length;
      return { title: 'The night after', text: `${S.demoWon ? 'The Gate held, and you spent a day dragging bodies out into the rain.' : 'The Gate did not hold, but the shelter did, barely. You spent a day scrubbing the floors.'} ${n} of you are still breathing. ${dead ? `${dead} name${dead > 1 ? 's are' : ' is'} on the Wall.` : 'Somehow, nobody is on the Wall yet.'}\n\nThen the radio clicks on by itself. Her voice, calm, too close to the microphone:\n\n"You did well tonight. Better than the others. So I am going to tell you something I have not told anyone." A long pause. "The rain is not from here. And I think it is my fault."\n\nThe line goes dead. Day ${S.day}. ${E.STRIKE_DAY - S.day} days until the 11th Hour.`, art: { u: 'card_quest' }, choices: ['...'] };
    },
    pick: S => { S.demoOver = true; },
  };
})();
