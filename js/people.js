// Personality, relationships and daily life between residents. Invented for this game, for DB's review.
// Traits are the Big Five (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism), 1 to 10.
// The four-letter type is read from those traits the way the popular 16-type models sort people.
(function () {
  const E = globalThis.ShelterEngine;
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TYPES = {
    ISTJ: ['The Quartermaster', 'Counts the cans twice. Trusts rules, routines and the people who keep them.'],
    ISFJ: ['The Caretaker', 'Notices who has not eaten. Quietly carries everyone else and never asks for anything.'],
    INFJ: ['The Confessor', 'People tell them things they have told nobody. Sees where this is all going, and grieves early.'],
    INTJ: ['The Planner', 'Already has a plan for when the shelter falls. Cold to some, the reason others are alive.'],
    ISTP: ['The Fixer', 'Says little and fixes everything. Calm in a crisis, restless in a quiet week.'],
    ISFP: ['The Drifter', 'Draws on the walls, keeps strays, lives day to day. Feels everything and shows little.'],
    INFP: ['The Dreamer', 'Still believes in something better. The Damned scare them less than cruelty does.'],
    INTP: ['The Tinkerer', 'Has a theory about the infection, and the radio, and Q.U.E.S.T. Forgets to eat.'],
    ESTP: ['The Runner', 'First out the hatch and last to sit still. Lives for the run and gambles too much.'],
    ESFP: ['The Spark', 'Finds a reason to laugh on the worst night. Hates being alone and hates silence more.'],
    ENFP: ['The Believer', 'Talks everyone into hoping. Starts ten projects and finishes the one that matters.'],
    ENTP: ['The Instigator', 'Argues for fun, questions every order, and is right just often enough to be dangerous.'],
    ESTJ: ['The Sergeant', 'Rotas, watches, rules. Keeps the shelter running and people resent being kept.'],
    ESFJ: ['The Host', 'Holds dinner together, remembers birthdays, and takes every quarrel personally.'],
    ENFJ: ['The Speaker', 'People follow when they talk. They know it, and they carry the weight of it.'],
    ENTJ: ['The Commander', 'Sees the shelter as a problem to solve. Will spend people to save more people.'],
  };
  E.TYPES = TYPES;
  const QUIRKS = ['Hums the same three notes when scared', 'Still wears a wedding ring for someone who did not make it', 'Counts things out loud: steps, cans, breaths', 'Prays before every meal, and expects others to wait', 'Will not eat meat, of any kind', 'Lies about small things for no reason', 'Keeps a tooth from every Damned they have killed', 'Talks in their sleep, in a voice nobody recognizes', 'Writes letters to people who are dead', 'Cannot sleep unless facing the door', 'Hoards batteries and will not say why', 'Laughs at the wrong moments', 'Keeps a dead child\'s drawing folded in a pocket', 'Was a nurse before, and never talks about the last shift', 'Was a cop before, and cannot stop giving orders', 'Was a teacher before, and still corrects everyone\'s grammar', 'Was in prison when it started, and does not say for what', 'Talks to Q.U.E.S.T. on the radio when nobody is listening', 'Sharpens the same knife every night', 'Collects photographs of strangers from the houses they loot', 'Refuses to say the word "Damned"', 'Gives away their own food when nobody is looking', 'Steals small things and returns them days later', 'Sings old hymns badly and loudly', 'Was rich before, and has not accepted it is over', 'Says they can hear the rain before it starts', 'Keeps a list of everyone they have lost, and adds to it in pencil', 'Is afraid of the dark, and hides it badly', 'Was a soldier, and wakes up reaching for a rifle', 'Believes the 11th Hour is a punishment, and says so'];
  E.psy = p => {
    if (p.psy) return p.psy;
    const c = (p.cls || '').toLowerCase(), b = { o: 5, c: 5, e: 5, a: 5, n: 5 };
    if (/medic/.test(c)) { b.a += 2; b.c += 1; } if (/bruiser|soldier/.test(c)) { b.a -= 1; b.e += 1; b.n -= 1; } if (/sharp/.test(c)) { b.c += 2; b.e -= 1; } if (/scav/.test(c)) { b.o += 1; b.e += 1; } if (/shepherd|leader/.test(c)) { b.e += 2; b.a += 1; } if (/engineer|tech|mechanic/.test(c)) { b.o += 1; b.c += 1; b.e -= 1; }
    const t = k => clamp(b[k] + R(-4, 4), 1, 10), q = [pick(QUIRKS)]; let q2 = pick(QUIRKS); while (q2 === q[0]) q2 = pick(QUIRKS); q.push(q2);
    p.psy = { o: t('o'), c: t('c'), e: t('e'), a: t('a'), n: t('n'), quirks: q };
    return p.psy;
  };
  E.typeOf = p => { const s = E.psy(p); return (s.e >= 6 ? 'E' : 'I') + (s.o >= 6 ? 'N' : 'S') + (s.a >= 6 ? 'F' : 'T') + (s.c >= 6 ? 'J' : 'P'); };
  E.typeName = p => TYPES[E.typeOf(p)][0];
  const key = (a, b) => (a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`);
  E.rel = (S, a, b) => {
    S.rel = S.rel || {}; const k = key(a, b);
    if (S.rel[k] === undefined) { const x = E.psy(a), y = E.psy(b); S.rel[k] = clamp(Math.round(10 - Math.abs(x.a - y.a) * 4 - Math.abs(x.n - y.n) * 2 + (x.o >= 6 === y.o >= 6 ? 6 : -4) + (x.c >= 6 === y.c >= 6 ? 4 : -4) + (x.a + y.a - 10) * 2 + R(-15, 15)), -60, 60); }
    return S.rel[k];
  };
  E.addRel = (S, a, b, n) => { E.rel(S, a, b); const k = key(a, b); S.rel[k] = clamp(S.rel[k] + n, -100, 100); return S.rel[k]; };
  E.partnerOf = (S, p) => { const k = (S.couples || []).find(c => c.includes(p.id)); return k ? S.people.find(o => o.id === (k[0] === p.id ? k[1] : k[0]) && o.alive) : null; };
  E.relWord = v => (v >= 70 ? 'Inseparable' : v >= 40 ? 'Friends' : v >= 15 ? 'Friendly' : v > -15 ? 'Neutral' : v > -40 ? 'Tense' : v > -70 ? 'Rivals' : 'Enemies');
  E.socialLog = (S, ids, t) => { S.slog = S.slog || []; S.slog.push({ d: S.day, ids, t }); if (S.slog.length > 120) S.slog.shift(); };

  // what people say. {b} is the other person. Lines are short so they fit a speech bubble.
  const SAY = {
    joke: ['Day {day}, {b}. Still here.', 'You snore, {b}. Like a generator.', 'I had a dream about toast. Just toast.', 'Your turn to empty the bucket, {b}.', 'Remember weekends?'],
    confide: ['I keep dreaming the hatch is open.', 'I don\'t think I\'m going to make it, {b}.', 'I did something bad, before. Getting here.', 'Some nights I hear my kids in the vents.', 'Don\'t tell anyone. I can\'t feel my left hand.'],
    comfort: ['Breathe. I\'ve got the next watch.', 'Eat this. I\'m not hungry. Really.', 'You\'re still you, {b}. I can tell.', 'Hey. Look at me. We\'re still here.', 'Sit with me a minute.'],
    argue: ['You took more than your share, {b}.', 'Say that again. I dare you.', 'Nobody voted for you to decide that.', 'You\'re going to get us all killed.', 'Stay out of my things, {b}.'],
    romance: ['Stay up with me a bit, {b}?', 'When this is over... no. Never mind.', 'You smell like smoke. I don\'t mind.', 'I saved you the last peach.'],
    mentor: ['Hold it like this. Thumb here.', 'Watch the hinge, not the door.', 'You\'re rushing. Slow is fast.', 'Again. Until you don\'t have to think.'],
    gossip: ['Have you seen how they look at the Damned?', 'I don\'t trust the leader\'s numbers.', 'Somebody\'s eating at night. I\'d bet on {b}.', 'Did you hear what they did on the last run?'],
    pray: ['Pray with me, {b}. It costs nothing.', 'Lord, keep the hatch shut tonight.', 'Say their names with me.'],
    grudge: ['I saw you at the stores, {b}.', 'My stomach hasn\'t stopped hurting in days.', 'Funny how you never look hungry.'],
    fear: ['Don\'t come near me. Not tonight.', 'Your eyes are wrong, {b}.', 'I\'m sleeping with the door between us.'],
  };
  const used = { d: -1, s: new Set() };
  const line = (k, b, S) => { if (used.d !== S.day) { used.d = S.day; used.s.clear(); } const opts = SAY[k].filter(x => !used.s.has(x)), t = pick(opts.length ? opts : SAY[k]); used.s.add(t); return t.replace('{b}', b.name).replace('{day}', S.day); };

  E.socialDay = S => {
    const home = E.home(S).filter(p => !p.sealed && p.alive);
    home.forEach(p => E.psy(p));
    S.couples = (S.couples || []).filter(c => c.every(id => S.people.some(o => o.id === id && o.alive)));
    if (home.length < 2) return;
    const n = Math.min(4, Math.ceil(home.length / 3));
    for (let i = 0; i < n; i++) {
      const pool = home.flatMap(p => Array(1 + Math.floor(E.psy(p).e / 3)).fill(p)), a = pick(pool);
      const others = home.filter(o => o !== a); if (!others.length) continue;
      const w = others.flatMap(o => Array(1 + Math.floor(Math.abs(E.rel(S, a, o)) / 25) + (o.room && o.room === a.room ? 2 : 0)).fill(o)), b = pick(w);
      const A = E.psy(a), B = E.psy(b), r = E.rel(S, a, b), hungry = a.hunger >= 2;
      let k;
      if (b.damned && !a.damned) k = A.a >= 7 && r > 20 ? 'comfort' : 'fear';
      else if (a.damned) k = r > 30 ? 'confide' : 'argue';
      else if (hungry && A.a <= 5 && Math.random() < .5) k = 'grudge';
      else if (b.stress >= 6 && A.a >= 6) k = 'comfort';
      else if (r < 5 && (A.a <= 4 || A.n >= 7 || hungry) && Math.random() < .6) k = 'argue';
      else if (r >= 55 && !E.partnerOf(S, a) && !E.partnerOf(S, b) && Math.random() < .18) k = 'romance';
      else if (r >= 30 && A.n >= 6) k = 'confide';
      else if (a.level >= b.level + 2 && A.c >= 6) k = 'mentor';
      else if (A.quirks.some(q => /pray|hymn|punishment/i.test(q)) && Math.random() < .5) k = 'pray';
      else if (A.e >= 6 && A.a <= 5 && Math.random() < .4) k = 'gossip';
      else k = r >= -10 ? 'joke' : 'argue';
      const said = line(k, b, S);
      E.log(S, `${a.name}: "${said}"`, k === 'argue' || k === 'grudge' || k === 'fear' ? 'bad' : '');
      let note = '';
      if (k === 'joke') { E.addRel(S, a, b, 4); [a, b].forEach(p => { p.stress = Math.max(0, p.stress - 1); }); }
      if (k === 'confide') { E.addRel(S, a, b, 5); a.stress = Math.max(0, a.stress - 2); if (B.a <= 3 && Math.random() < .3) { note = `${b.name} told everyone.`; E.addRel(S, a, b, -25); E.addStress(S, a, 2); } }
      if (k === 'comfort') { E.addRel(S, a, b, 6); b.stress = Math.max(0, b.stress - 2); }
      if (k === 'argue' || k === 'grudge') { const v = E.addRel(S, a, b, k === 'grudge' ? -6 : -8); E.addStress(S, a, 1); E.addStress(S, b, 1); if (v <= -60 && A.a <= 4 && Math.random() < .35) { b.hp = Math.max(1, b.hp - R(1, 3)); S.order = Math.max(0, (S.order ?? 55) - 3); note = `It came to blows. ${b.name} is bleeding.`; } }
      if (k === 'fear') { E.addRel(S, a, b, -5); E.addStress(S, a, 1); }
      if (k === 'romance') { E.addRel(S, a, b, 10); S.couples.push([a.id, b.id]); note = `${a.name} and ${b.name} are together now. Everyone pretends not to notice.`; }
      if (k === 'mentor') { E.addRel(S, a, b, 3); b.xp += 3; }
      if (k === 'gossip') { S.order = Math.max(0, (S.order ?? 55) - 1); E.addRel(S, a, b, 2); }
      if (k === 'pray') { E.addRel(S, a, b, B.quirks.some(q => /pray|hymn/i.test(q)) || B.a >= 6 ? 4 : -3); b.stress = Math.max(0, b.stress - 1); }
      if (note) E.log(S, note, 'bad');
      E.socialLog(S, [a.id, b.id], `${a.name} to ${b.name} (${k}): "${said}"${note ? ' ' + note : ''}`);
    }
    if (E.pickTalk && home.length >= 2 && Math.random() < .7) { const a = home[Math.floor(Math.random() * home.length)], others = home.filter(o => o !== a), b = others[Math.floor(Math.random() * others.length)], w = E.pickTalk(S, a, b); if (w) { w.lines.slice(0, 2).forEach(l => E.log(S, `${l.who.name}: "${l.t}"`)); E.socialLog(S, [a.id, b.id], w.lines.map(l => `${l.who.name}: ${l.t}`).join(' ').slice(0, 300)); S.lastTalk = { day: S.day, lines: w.lines.map(l => ({ id: l.who.id, t: l.t })) }; } }
    // couples steady each other; a dead partner breaks the one left behind
    (S.couples || []).forEach(c => c.forEach(id => { const p = S.people.find(o => o.id === id); if (p && !p.away && Math.random() < .5) p.stress = Math.max(0, p.stress - 1); }));
  };
  E.grieve = (S, dead) => {
    E.humans(S).filter(o => o !== dead && o.alive).forEach(o => {
      const r = E.rel(S, o, dead), partner = (S.couples || []).some(c => c.includes(o.id) && c.includes(dead.id));
      if (partner) { E.addStress(S, o, 6); o.exh += 1; E.log(S, `${o.name} lost ${dead.name}. Nobody can get through to ${o.he === 'he' ? 'him' : 'her'}.`, 'bad'); E.socialLog(S, [o.id, dead.id], `${o.name} lost their partner ${dead.name}.`); }
      else if (r >= 40) { E.addStress(S, o, 3); E.socialLog(S, [o.id, dead.id], `${o.name} grieved ${dead.name}, a close friend.`); }
      else if (r <= -60) { o.stress = Math.max(0, o.stress - 1); E.socialLog(S, [o.id, dead.id], `${o.name} did not pretend to be sad about ${dead.name}.`); }
    });
    S.couples = (S.couples || []).filter(c => !c.includes(dead.id));
  };
  // friends work better side by side, rivals worse
  E.socialMult = (S, r) => {
    const ws = E.workers(S, r); if (ws.length < 2) return 1;
    let m = 1; for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) { const v = E.rel(S, ws[i], ws[j]); if ((S.couples || []).some(c => c.includes(ws[i].id) && c.includes(ws[j].id))) m += .06; else if (v >= 40) m += .04; else if (v <= -40) m -= .08; }
    return clamp(m, .7, 1.25);
  };
  // a line for the Wall, from who they were
  E.epitaph = (S, p) => {
    const s = E.psy(p), q = s.quirks[0] || '', part = E.partnerOf(S, p), others = E.humans(S).filter(o => o !== p), best = others.slice().sort((a, b) => E.rel(S, p, b) - E.rel(S, p, a))[0], days = S.day - (p.joined || 1);
    const opts = [];
    if (part) opts.push(`Loved by ${part.name}.`);
    if (best && E.rel(S, p, best) >= 40) opts.push(`${best.name}'s best friend.`);
    if (/wedding ring/.test(q)) opts.push('Never took the ring off.');
    if (/letters/.test(q)) opts.push('Wrote to the dead. Now we write to them.');
    if (/hums|hymns|sings/i.test(q)) opts.push('We still hum the song.');
    if (/nurse/.test(q)) opts.push('Kept other people breathing.');
    if (/soldier/.test(q)) opts.push('Finally off watch.');
    if (/afraid of the dark/.test(q)) opts.push('We left a light on.');
    if (/teeth|tooth/.test(q)) opts.push('Kept count of the dead. We keep count of them.');
    if (s.e >= 7 && s.a >= 6) opts.push('Made us laugh on the worst nights.');
    if (s.a >= 8) opts.push('Gave away their share and never said so.');
    if (s.c >= 8) opts.push('Kept the lists. Kept us alive.');
    if (s.n >= 8) opts.push('Afraid of everything, and stayed anyway.');
    if (p.damned) opts.push('Still knew our names, at the end.');
    opts.push(days > 60 ? `${days} days with us.` : 'Not with us long enough.');
    return opts[Math.floor(Math.random() * Math.min(opts.length, 3))];
  };
  // a summary of someone, for the AI and for the screen
  E.profile = (S, p) => {
    const s = E.psy(p), part = E.partnerOf(S, p), others = E.living(S).filter(o => o !== p && !o.away);
    const rels = others.map(o => [o, E.rel(S, p, o)]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 4).map(([o, v]) => `${o.name} (${E.relWord(v)}, ${v})`);
    return `${p.name} ${p.last}, ${p.he === 'he' ? 'man' : 'woman'}, ${E.classNameOf(p)} level ${p.level}. Personality ${E.typeOf(p)}, "${E.typeName(p)}": ${TYPES[E.typeOf(p)][1]} Big Five out of 10: openness ${s.o}, conscientiousness ${s.c}, extraversion ${s.e}, agreeableness ${s.a}, neuroticism ${s.n}. Quirks: ${s.quirks.join('; ')}. Now: health ${p.hp}/${E.maxHp(p)}, stress ${p.stress}/10, exhaustion ${p.exh}, hunger ${p.hunger} days, infection meter (DMD) ${p.dmd}/32${p.damned ? ', one of the Damned (turned, still themselves for now, feared)' : ''}${p.wait ? ', at 32 and waiting to find out if they turn' : ''}. ${part ? `Partner: ${part.name}. ` : ''}Feelings about others: ${rels.join(', ') || 'nobody yet'}.`;
  };
})();
