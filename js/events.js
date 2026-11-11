// Decisions and story cards. All of this writing is invented for this game. Q.U.E.S.T. never says what the simulations really are.
(function () {
  const person = (S, id) => S.people.find(p => p.id === id);
  const SH = p => (p.he === 'he' ? 'He' : 'She'), sh = p => (p.he === 'he' ? 'he' : 'she'), hr = p => (p.he === 'he' ? 'his' : 'her'), hm = p => (p.he === 'he' ? 'him' : 'her');
  const OK = ['Understood'];
  const anyHuman = (S, E) => E.humans(S).filter(p => !p.away && !p.sealed);
  // ---------- the dead, and what hunger does to people. Results roll on each person's Mental score.
  const named = ids => ids.map(n => n.name).join(ids.length > 2 ? ', ' : ' and ').replace(/, ([^,]*)$/, ', and $1');
  function feast(S, E, dead, how, soft) {
    const D = E.d10, home = E.humans(S).filter(o => !o.away && !o.sealed), lines = [];
    const bx = S.rooms.find(r => r.type === 'butcher') && E.staffed(S, 'butcher'); if (bx) soft = true;
    let meat = 0; dead.forEach(x => { meat += Math.round(((x.hunger >= 3 ? 5 : 9) + D()) * (bx ? 1.5 : 1)); }); S.res.food += meat;
    const tainted = dead.filter(x => x.damned || x.dmd >= 18);
    const broke = [], hard = [], leave = [], sick = [];
    home.forEach(o => {
      const r = E.roll(Math.max(1, E.score(o, 'mental')), 6);
      if (r.crit) { o.stress = Math.max(0, o.stress - 2); hard.push(o); return; } // some people find it easy. That is its own horror.
      if (r.succ >= 2) E.addStress(S, o, soft ? 1 : 2);
      else if (r.succ === 1) E.addStress(S, o, soft ? 2 : 4);
      else { E.addStress(S, o, soft ? 4 : 6); broke.push(o); if (D() <= 2 && home.length - leave.length > 2 && !E.lawOn(S, 'martial')) leave.push(o); }
      o.ate = S.day;
      tainted.forEach(x => { const t = E.expose(S, o, x.damned ? 3 : 1, 6, 'tainted meat', null); if (t) sick.push(o); });
    });
    lines.push(`${how}${bx ? ' The butcher did the cutting alone, quickly, the way you would with an animal.' : ''} It came to ${meat} days of food.`);
    if (hard.length) lines.push(`${named(hard)} ate without a word and slept well afterward. Nobody sits near ${hard.length > 1 ? 'them' : hard[0].he === 'he' ? 'him' : 'her'} now.`);
    if (broke.length) lines.push(`${named(broke)} could not keep it down, and could not stop shaking.`);
    if (sick.length) lines.push(`The meat was not clean. ${named([...new Set(sick)])} ${sick.length > 1 ? 'feel' : 'feels'} the meter climb.`);
    leave.forEach(o => E.kill(S, o, 'Walked out into the rain after what we did. Never came back.'));
    if (leave.length) lines.push(`By morning ${named(leave)} ${leave.length > 1 ? 'were' : 'was'} gone. ${leave.length > 1 ? 'They' : SH(leave[0])} took nothing.`);
    S.stat.ate = (S.stat.ate || 0) + dead.length;
    return lines.join(' ');
  }
  const EV = {
    birthday: {
      chance: 2, when: (S, E) => S.day > 12 && E.home(S).length >= 4,
      view: (S, p, E) => { const h = E.home(S).filter(o => !o.sealed && !o.damned), x = (p.id && h.find(o => o.id === p.id)) || h[Math.floor(Math.random() * h.length)]; if (!x) return { title: 'Quiet', text: 'A quiet night.', art: {}, choices: ['Good'] }; p.id = x.id; return { title: `${x.name}'s birthday`, text: `Somebody remembered. Nobody knows how. There is a candle stuck in a cold biscuit, a song sung too slowly, and a present wrapped in a map page: a pair of socks with no holes in them. ${x.name} pretends not to cry, badly.`, art: { p: x.sprite }, choices: ['Happy birthday'] }; },
      pick: (S, p, i, E) => { E.home(S).forEach(o => { o.stress = Math.max(0, o.stress - 1); }); const x = S.people.find(o => o.id === p.id); if (x) x.stress = 0; },
    },
    sprout: {
      chance: 2, when: S => S.day > 8 && S.rooms.some(r => r.type === 'grow'),
      view: () => ({ title: 'Something green', text: 'One of the tomato plants has fruit on it. Just one, the size of a thumb, more green than red. Everybody goes down to look at it at least once. Nobody suggests eating it.', art: {}, choices: ['Leave it on the vine'] }),
      pick: (S, p, i, E) => { E.home(S).forEach(o => { o.stress = Math.max(0, o.stress - 1); }); S.order = Math.min(100, (S.order ?? 55) + 3); },
    },
    letters: {
      chance: 1, when: S => S.day > 20,
      view: () => ({ title: 'Mail', text: 'A run found a mailbag in a crashed van. Letters from eleven years ago, never delivered. Somebody reads one out loud at dinner, a woman telling her sister about a new job. Then another. You stay up late reading strangers\' ordinary lives.', art: {}, choices: ['Keep reading'] }),
      pick: (S, p, i, E) => { E.home(S).forEach(o => { o.stress = Math.max(0, o.stress - 2); }); },
    },
    rainstop: {
      chance: 1, when: S => S.weather > 0,
      view: () => ({ title: 'The rain stopped', text: 'For about ten minutes, the rain just stopped. Someone opened the hatch and everyone climbed up to stand in the doorway and look at a grey sky with nothing falling out of it. Nobody spoke. Then it started again, and you went back down.', art: {}, choices: ['Back down'] }),
      pick: (S, p, i, E) => { E.home(S).forEach(o => { o.stress = Math.max(0, o.stress - 1); }); },
    },
    mercenary: {
      chance: 2, when: S => S.day > 15 && S.res.rounds >= 90,
      view: (S, p, E) => ({ title: 'A gun for hire', text: 'A woman with a rifle and a long scar waits outside the hatch. She has been watching your shelter for days. "Ninety rounds and a bunk, and I fight for you until one of us is dead. I do not do babysitting."', art: {}, choices: ['Hire her (90 rounds)', 'Send her away'] }),
      pick: (S, p, i, E) => { if (i !== 0 || S.res.rounds < 90) return; if (!E.roomFor(S)) return E.say(S, 'No room', 'There is not a bed or a meal to spare. They go on alone, and nobody watches them leave.');  S.res.rounds -= 90; const x = E.addSurvivor(S, { cls: 'sharpshooter', level: Math.min(8, Math.max(2, Math.ceil(S.day / 30))) }); const w = E.findWeapon('Remington 700'); if (w) { const g = { id: S.nextId++, n: w.n, kind: w.kind, gun: true, tr: w.tr || [], cond: 'Standard', wt: w.wt || 8 }; S.gear.push(g); x.weapon = g.id; } E.say(S, 'Hired', `${x.name} ${x.last} took the bunk nearest the hatch and cleaned the rifle twice before bed.`, { p: x.sprite }); },
    },
    knocks: {
      chance: 2, uncanny: 1, when: (S, E) => E.uncannyOk(S, 'knocks') && (S => S.day > 8)(S, E),
      view: () => ({ title: 'Three knocks', text: 'Three slow knocks on the hatch at three in the morning. A long silence. Then three more, from under the floor.', art: { u: 'card_knocks' }, choices: ['Open the hatch', 'Pull up the floorboards', 'Stay quiet until morning'] }),
      pick: (S, p, i, E) => { const h = E.home(S).filter(o => !o.sealed); if (i === 0) { if (E.d10() <= 3) S.queue.unshift({ k: 'gatecomer', p: { mimic: true, pre: 0 } }); else E.say(S, 'Nobody there', 'Nobody there. Fresh mud on the top step, in the shape of bare feet. They only go one way: in.'); } if (i === 1) { if (E.d10() <= 5) { S.res.scrap += 6; E.say(S, 'Under the floor', 'A crawlspace nobody knew about, with tools in it, and a child\'s drawing of all of you asleep.'); } else { h.forEach(o => E.addStress(S, o, 2)); E.say(S, 'Under the floor', 'Dirt, and pipes, and a smell like a struck match. Someone had been lying there. The dirt was still warm.'); } } if (i === 2) h.forEach(o => E.addStress(S, o, 1)); },
    },
    headcount: {
      chance: 2, uncanny: 1, when: (S, E) => E.uncannyOk(S, 'headcount') && (S => S.day > 10)(S, E),
      view: (S, p, E) => { const h = E.home(S).filter(o => !o.sealed); return { title: 'Headcount', text: `At dinner, someone counts heads out of habit. ${h.length + 1}. They count again, slowly, touching each shoulder. ${h.length + 1}. There are ${h.length} of you.`, art: { u: 'card_headcount' }, choices: ['Count again', 'Nobody says anything'] }; },
      pick: (S, p, i, E) => { E.home(S).forEach(o => E.addStress(S, o, i === 0 ? 2 : 1)); if (i === 0) E.say(S, 'Again', `The third time, the number is right. Nobody can agree on who was sitting in the chair by the door.`); },
    },
    wallname: {
      chance: 2, uncanny: 1, when: (S, E) => E.uncannyOk(S, 'wallname') && ((S, E) => S.day > 12 && E.home(S).length > 2)(S, E),
      view: (S, p, E) => { const h = E.home(S).filter(o => !o.sealed && !o.damned), x = (p.id && h.find(o => o.id === p.id)) || h[Math.floor(Math.random() * h.length)]; if (!x) return { title: 'Quiet', text: 'Nothing happened tonight. Everyone listened for it anyway.', art: {}, choices: ['Good'] }; p.id = x.id; return { title: 'A new name on the Wall', text: `Someone scratched a new name on the Wall last night, neat and careful, the way you do it for the dead. It says ${x.name} ${x.last}. ${x.name} is alive, and standing right there.`, art: { u: 'card_wallname' }, choices: ['Scratch it out', 'Leave it'] }; },
      pick: (S, p, i, E) => { const x = S.people.find(o => o.id === p.id); if (!x || !x.alive) return; if (i === 0) { E.addStress(S, x, 1); if (E.d10() === 1) { x.hp = Math.max(1, x.hp - 4); E.say(S, 'It came back', `By morning the name was scratched in again, deeper. ${x.name} woke with ${x.he === 'he' ? 'his' : 'her'} fingernails torn.`, { p: x.sprite }); } } else { E.addStress(S, x, 4); } },
    },
    sleepwalk: {
      chance: 2, uncanny: 1, when: (S, E) => E.uncannyOk(S, 'sleepwalk') && (S => S.day > 6)(S, E),
      view: (S, p, E) => { const h = E.home(S).filter(o => !o.sealed && !o.damned), x = (p.id && h.find(o => o.id === p.id)) || h[Math.floor(Math.random() * h.length)]; if (!x) return { title: 'Quiet', text: 'Nothing happened tonight. Everyone listened for it anyway.', art: {}, choices: ['Good'] }; p.id = x.id; return { title: `${x.name} at the hatch`, text: `The watch found ${x.name} at the hatch in the dark with the bolt half open, eyes wide, fast asleep. ${x.he === 'he' ? 'He' : 'She'} kept whispering that someone outside knows ${x.he === 'he' ? 'his' : 'her'} mother's name.`, art: { p: x.sprite }, choices: [`Tie ${x.name} to the bunk at night`, 'Let it go'] }; },
      pick: (S, p, i, E) => { const x = S.people.find(o => o.id === p.id); if (!x || !x.alive) return; if (i === 0) { E.addStress(S, x, 2); return; } if (E.d10() <= 2) { E.kill(S, x, 'Walked out of the hatch asleep, toward someone calling. Never came back.'); E.say(S, 'The bolt was open', `In the morning the hatch was standing open and ${x.name}'s boots were still beside the bunk.`); } },
    },
    polaroid: {
      chance: 1, uncanny: 1, when: (S, E) => E.uncannyOk(S, 'polaroid') && (S => S.day > 15)(S, E),
      view: () => ({ title: 'A photograph', text: 'A Polaroid was pushed under the hatch in the night. It shows all of you asleep in the bunk room. It was taken from inside, from the corner by the door.', art: { u: 'card_polaroid' }, choices: ['Search every room', 'Burn it'] }),
      pick: (S, p, i, E) => { E.home(S).forEach(o => E.addStress(S, o, 2)); S.order = Math.max(0, (S.order ?? 55) - 6); if (i === 0) E.say(S, 'Nothing', 'Every room, every vent, every crate. Nothing. That night nobody sleeps in the corner by the door.'); },
    },
    hum: {
      chance: 1, uncanny: 1, when: (S, E) => E.uncannyOk(S, 'hum') && (S => S.day > 20)(S, E),
      view: () => ({ title: 'Humming', text: 'Everyone wakes at the same moment, humming the same tune. Nobody knows it. Nobody can stop until it ends on its own, nearly an hour later.', art: { u: 'card_hum' }, choices: ['Write the tune down', 'Never speak of it'] }),
      pick: (S, p, i, E) => { if (i === 0) { S.radio = (S.radio || 0) + 30; E.say(S, 'The tune', 'Played backwards on the radio, it is a frequency. Something is broadcasting on it, very faintly, in the voice of someone you lost.'); } E.home(S).forEach(o => E.addStress(S, o, 1)); },
    },
    body: {
      view: (S, p, E) => {
        const dead = p.ids.map(id => person(S, id)).filter(Boolean), one = dead.length === 1, x = dead[0], need = E.needs(S).food, days = need ? Math.floor(S.res.food / need) : 99;
        const hunger = days <= 0 ? 'There is no food left in the shelter. Nobody has said the obvious thing yet.' : days <= 3 ? `There is food for ${days} more day${days > 1 ? 's' : ''}. Everyone has done the same math.` : 'There is still food on the shelves. For now.';
        return { title: one ? `${x.name}'s body` : `The bodies: ${named(dead)}`, text: `${one ? `${x.name} ${x.last} is lying in the corridor under a tarp.` : `${named(dead)} are lying under tarps in the corridor.`} ${hunger} Whatever you decide, everyone here will remember who decided it.`, art: { [x.damned ? 'd' : 'p']: x.sprite }, choices: p.law ? ['It is the law. Take them to the cold room.'] : [one ? `Bury ${x.name} under the floor` : 'Bury them under the floor', one ? 'Burn the body before anything else gets to it' : 'Burn them before anything else gets to them', one ? `Butcher ${x.name}. Waste nothing.` : 'Butcher them. Waste nothing.'] };
      },
      pick: (S, p, i, E) => {
        const dead = p.ids.map(id => person(S, id)).filter(Boolean), names = named(dead), home = E.humans(S).filter(o => !o.away && !o.sealed);
        if (i === 0) { home.forEach(o => o.stress = Math.max(0, o.stress - 1)); if (E.d10() <= 2) { home.forEach(o => E.addStress(S, o, 1)); E.say(S, 'The floor', `They buried ${names} under the boards. That night something was scratching at them from below.`); } }
        if (i === 1) { E.say(S, 'Smoke', `The smell stayed in the vents for two days. Somebody said a few words. Nobody remembered them after.`); }
        if (p.law) i = 2;
        if (i === 2) {
          const t = feast(S, E, dead, p.law ? 'Nobody voted. It is the law now, and the law makes it a chore instead of a choice.' : `${home.length > 1 ? 'Two of them did it' : 'It was done'} in the generator room with the door shut, so the others would not have to hear.`, p.law);
          dead.forEach(x => { const m = S.memorial.slice().reverse().find(e => e.name === `${x.name} ${x.last}`); if (m) !/The shelter ate/.test(m.why) && (m.why += ' The shelter ate.'); });
          E.say(S, 'What we did', t, { [dead[0].damned ? 'd' : 'p']: dead[0].sprite });
        }
      },
    },
    lots: {
      view: (S, p, E) => {
        const h = E.humans(S).filter(o => !o.away && !o.sealed), worst = h.slice().sort((a, b) => b.hunger - a.hunger)[0], dam = E.living(S).filter(o => o.damned && !o.away);
        if (!worst || h.length < 2) return { title: 'Nothing left to eat', text: 'The shelves are bare, and there are too few of you left to do anything but wait.', art: {}, choices: ['Wait'] };
        return { title: 'Nothing left to eat', text: `The shelves are bare. ${worst.name} has not eaten in ${worst.hunger} days and has started chewing on a belt. Somebody cut the broom handle into straws, one for each of you, and left them on the table. Nobody has touched them.`, art: { p: worst.sprite }, choices: ['Draw the straws. Everyone draws.', 'Ask for someone to volunteer', ...(dam.length ? [`Give them ${dam[0].name}. ${dam[0].he === 'he' ? 'He' : 'She'} is already one of the Damned.`] : []), 'Throw the straws away and hold on one more day'] };
      },
      pick: (S, p, i, E) => {
        S.stat.lots = (S.stat.lots || 0) + 1;
        if (E.humans(S).filter(o => !o.away && !o.sealed).length < 2) return;
        const h = E.humans(S).filter(o => !o.away && !o.sealed), dam = E.living(S).filter(o => o.damned && !o.away), D = E.d10, list = ['draw', 'ask', ...(dam.length ? ['damned'] : []), 'hold'], c = list[i];
        if (c === 'hold') { h.forEach(o => E.addStress(S, o, 1)); if (D() <= 3) { const w = h.slice().sort((a, b) => b.hunger - a.hunger)[0]; w.exh += 1; E.say(S, 'One more day', `In the night ${w.name} was caught at the door to the cold room, with a knife, looking at whoever was asleep closest. ${SH(w)} doesn't remember getting up.`, { p: w.sprite }); } return; }
        let x, how;
        if (c === 'draw') { x = h[Math.floor(Math.random() * h.length)]; how = `${x.name} drew the short straw and looked at it for a long time. ${SH(x)} asked for a minute alone. Then ${sh(x)} came back and sat down.`; h.forEach(o => E.addStress(S, o, 2)); }
        if (c === 'ask') {
          const r = D();
          if (r <= 3) { h.forEach(o => E.addStress(S, o, 3)); const a = h[Math.floor(Math.random() * h.length)], b = h.find(o => o !== a) || a; if (b !== a) { b.hp = Math.max(1, b.hp - 3); } E.say(S, 'Nobody', `Nobody volunteered. Then everybody started talking about who should. ${a.name} said the old should go first. ${b !== a ? `${b.name} hit ${a.name === b.name ? 'someone' : hm(a)} with a chair.` : ''} Nobody is talking now.`); return; }
          x = h.slice().sort((a, b) => b.level - a.level || b.joined - a.joined)[r >= 8 ? 0 : h.length - 1];
          how = r >= 8 ? `${x.name} stood up before anyone else could. "I've had more years than most of you." ${SH(x)} made everyone promise not to waste any of it.` : `${x.name} said yes in a small voice, and everybody let ${hm(x)}. That is the part they will carry.`;
          h.forEach(o => E.addStress(S, o, r >= 8 ? 1 : 3));
        }
        if (c === 'damned') { x = dam[0]; const fight = D() <= 4; how = fight ? `${x.name} understood what the rope was for and fought. It took four of you.` : `${x.name} did not fight. ${SH(x)} just watched you, and said thank you, and that was worse.`; if (fight) h.slice(0, 3).forEach(o => { o.hp = Math.max(1, o.hp - D()); }); }
        E.kill(S, x, c === 'damned' ? 'Killed for food by the people sheltering beside them.' : c === 'draw' ? 'Drew the short straw.' : 'Gave themself so the others could eat.');
        const q = S.queue.findIndex(z => z.k === 'body' && z.p.ids.includes(x.id)); if (q >= 0) S.queue.splice(q, 1);
        const t = feast(S, E, [x], how);
        const m = S.memorial[S.memorial.length - 1]; if (m) !/The shelter ate/.test(m.why) && (m.why += ' The shelter ate.');
        E.say(S, 'What we did', t, { [x.damned ? 'd' : 'p']: x.sprite });
      },
    },
    shakes: {
      view: (S, p) => { const x = person(S, p.id); return { title: `${x.name} can't stop shaking`, text: `It started in ${hr(x)} hands. Now ${sh(x)} laughs at things that aren't funny and can't hold a cup. Anyone who ever read about it knows what it is. You all know where it came from.`, art: { p: x.sprite }, choices: ['Keep working. We need everyone.', 'Rest and watch over them'] }; },
      pick: (S, p, i, E) => { const x = person(S, p.id); if (!x || !x.alive) return; x.exh += i === 0 ? 2 : 1; E.addStress(S, x, i === 0 ? 3 : 1); if (i === 1) x.room = null; if (E.d10() === 1) E.kill(S, x, 'Laughing, at the end. The meat did it.'); },
    },
    note: { view: (S, p) => ({ title: p.title, text: p.text, art: p.art, fight: p.art && p.art.fight, choices: OK }) },
    at32: {
      view: (S, p, E) => { const x = person(S, p.id); const fr = E.humans(S).filter(o => o !== x && !o.away && !o.sealed).sort((m, n) => E.rel(S, x, n) - E.rel(S, x, m))[0], ps = E.psy ? E.psy(x) : { n: 5, a: 5 }, said = ps.n >= 7 ? '"Don\'t leave. Please. Not tonight."' : ps.a <= 3 ? '"If my eyes go wrong, don\'t hesitate. I wouldn\'t."' : ps.e >= 7 ? '"Somebody tell me a story. A long one. With a happy ending, if you have one."' : '"It\'s okay. Whatever happens, it\'s okay. I had a good run, for down here."'; p.fr = fr ? fr.id : null; p.said = said; return { title: `${x.name} is at 32`, text: `${x.name} says, ${p.said}\n\nThe meter is full. The roll has been made and nobody knows how it came out. In ${x.wait ? x.wait.days : 1} day${x.wait && x.wait.days > 1 ? 's' : ''} you find out if ${sh(x)} is still ${x.name}.`, art: { p: x.sprite }, choices: [E.cells(S) > E.sealed(S).length ? 'Seal in Quarantine' : 'No free Quarantine cell', 'Say nothing'] }; },
      pick: (S, p, i, E) => { const x = person(S, p.id), fr = p.fr && person(S, p.fr); if (fr && fr.alive) { E.addStress(S, fr, 2); x.stress = Math.max(0, x.stress - 3); if (E.addRel) E.addRel(S, x, fr, 15); E.log(S, `${fr.name} sat up with ${x.name} all night.`, ''); } if (i === 0 && x.alive && !x.away) { if (!E.seal(S, x)) E.say(S, 'No cell', `There is nowhere to put ${x.name}. Build a Quarantine room, or clear a cell.`); } },
    },
    cleared: { view: (S, p) => { const x = person(S, p.id); return { title: `${x.name} is still ${x.name}`, text: `The wait is over. ${SH(x)} woke up hungry for breakfast, not for anyone in the room. ${SH(x)} stays at 32, and the next bite starts all of this again.`, art: { p: x.sprite }, choices: ['Thank God'] }; }, pick: (S, p, i, E) => { E.home(S).forEach(o => o.stress = Math.max(0, o.stress - 1)); } },
    kept: {
      view: (S, p) => { const x = person(S, p.id); return { title: `${x.name} turned, but still knows you`, text: `It happened. ${SH(x)} is one of the Damned now, and ${hr(x)} eyes still follow when you say ${hr(x)} name. ${SH(x)} will be the strongest fighter you have, for as long as it lasts. When ${hr(x)} meter fills, ${sh(x)} turns on everyone. Most people here will hate this.`, art: { d: x.sprite }, choices: ['Keep them as a Damned', 'Exile', 'Mercy'] }; },
      pick: (S, p, i, E) => { const x = person(S, p.id); if (i === 0) E.makeDamned(S, x); else if (i === 1) { E.kill(S, x, 'Turned, and was sent away.'); } else E.kill(S, x, 'Turned. Given mercy.'); },
    },
    perk: {
      view: (S, p, E) => { const x = person(S, p.id), o = p.opts || (p.opts = E.perkOptions(S, x)); return { title: `${x.name} learned something`, text: `Level ${x.level}. Pick one.`, art: { [x.damned ? 'd' : 'p']: x.sprite }, choices: o.length ? o.map(k => `${k}: ${E.perkDesc(k)}`) : ['Nothing new to learn'] }; },
      pick: (S, p, i) => { const x = person(S, p.id); if (p.opts && p.opts[i]) x.perks.push(p.opts[i]); },
    },
    runreport: { view: (S, r) => ({ title: `Back from ${globalThis.ShelterEngine.placeName(r.place)}`, report: r, choices: OK }) },
    raid: { view: (S, p) => ({ title: 'Trouble in the night', text: `${p.kind}${p.breached ? ' It got past the gate.' : ''}`, foes: p.foes, fights: p.fights, choices: OK }) },
    found_survivors: {
      view: () => ({ title: 'Someone came back with them', text: 'The team found people holed up, scared and armed. One of them asks to come along.', art: {}, choices: ['Bring them home', 'Leave them'] }),
      pick: (S, p, i, E) => { if (i === 0) { if (!E.roomFor(S)) return E.say(S, 'No room', 'There is not a bed or a meal to spare. They go on alone, and nobody watches them leave.'); const x = E.addSurvivor(S); E.say(S, 'New face', `${x.name} ${x.last}, ${E.classNameOf(x)}.`, { p: x.sprite }); } },
    },
    signal: {
      view: () => ({ title: 'A voice on the radio', text: 'Someone is out there, low on batteries, asking if anyone is left. They can make it to you by morning.', art: {}, choices: ['Tell them to come', 'Stay quiet'] }),
      pick: (S, p, i, E) => { if (i === 0) S.queue.unshift({ k: 'gatecomer', p: {} }); },
    },
    weekly: { // CANON: the Economy sheet's weekly business event table
      view: (S, p) => { const r = p.r, P = a => a[Math.floor(Math.random() * a.length)], t = r === 1 ? ['A bad week', P(['Somebody took from the stores in the night, or something did.', 'A rat nest in the grain sacks. Half of it is ruined.', 'The rounds box was lighter this morning. Nobody will look at anybody.'])] : r <= 3 ? ['A slow week', P(['Nothing went right and nobody said so.', 'Broken tools, short tempers, and rain every day.', 'A week of small failures. A stripped bolt, a cracked pot, a lost glove.'])] : r <= 8 ? ['A normal week', P(['Another seven days. That counts.', 'Seven days of chores and watches. Nobody died. Write it down.', 'The same week again: rain, rice, the generator\'s hum.', 'A week so ordinary that somebody started a calendar on the wall.', 'Nothing happened. Down here, that is the good news.'])] : r === 9 ? ['A good week', P(['The beds came up early, and the filters ran clean.', 'Somebody fixed the old radio and found music on it for an hour.', 'Everything worked. Everyone is suspicious of it.'])] : ['A lucky week', P(['A supply drop came down close, still sealed.', 'A run found a pharmacy nobody had touched.', 'A crate washed up in the creek: canned peaches, rounds, a first aid kit.'])]; return { title: t[0], text: t[1], art: {}, choices: OK }; },
      pick: (S, p, i, E) => { const r = p.r; if (r === 1) { S.res.food = Math.max(0, S.res.food - 6); S.res.rounds = Math.max(0, S.res.rounds - 8); } if (r === 2 || r === 3) { S.res.scrap = Math.max(0, S.res.scrap - 3); } if (r === 9) { S.res.food += 6; S.res.water += 6; } if (r === 10) { S.res.meds += 3; S.res.food += 8; S.res.rounds += 20; } },
    },
    gatecomer: {
      chance: 4, when: (S, E) => E.humans(S).length < E.bedsOf(S) + 1 && !E.lawOn(S, 'sealed'),
      make: (S, E) => ({ mimic: Math.random() < .12 + S.day * .002, hiddenDmd: Math.random() < .3 ? 14 + E.d10() : 0, pre: 0 }),
      view: (S, p, E) => { const g = E.workers(S, S.rooms.find(r => r.type === 'gate')), w = g[0]; if (p.tell === undefined) { p.tell = false; if (E.dogs && E.dogs(S).some(d => d.alive && d.role === 'find' && !d.pup)) p.tell = true; else if (w) { const r = E.rollSkill(w, 'insight', 6); p.tell = r.succ >= 1; } } return { title: 'Someone at the hatch', text: `A stranger is knocking, shivering, hands up. ${p.tell && (p.mimic || p.hiddenDmd) ? `${w.name} doesn't like the way they're standing. Something is off.` : w ? `${w.name} looks them over and sees nothing wrong.` : 'Nobody is on the gate to look them over.'}`, art: {}, choices: ['Let them in', 'Send them away'] }; },
      pick: (S, p, i, E) => { if (i !== 0) return; if (!p.mimic && !E.roomFor(S)) return E.say(S, 'No room', 'There is not a bed or a meal to spare. They go on alone, and nobody watches them leave.'); if (p.mimic) { const m = E.named('Mimic Survivor', Math.max(4, Math.ceil(S.day / 14))) || E.named('Infected Human', 2); const g = E.workers(S, S.rooms.find(r => r.type === 'gate')); const f = E.fight(S, g.length ? g : E.home(S).filter(x => !x.sealed).slice(0, 3), [m], { where: 'the hatch', inside: true }); E.say(S, 'It was never a person', 'It wore a person the way you wear a coat.', { m: 'mimic-survivor', fight: f }); return; } const x = E.addSurvivor(S); if (p.hiddenDmd) x.dmd = p.hiddenDmd; E.say(S, `${x.name} ${x.last} joins you`, `${E.classNameOf(x)}. Level ${x.level}.`, { p: x.sprite }); },
    },
    caravan: {
      chance: 3,
      view: (S, p, E) => { const refuse = E.hasDamned(S) && Math.random() < .35; p.refuse = refuse; return { title: 'A caravan', text: refuse ? 'A caravan stops, smells what you are keeping down there, and drives on.' : 'A caravan stops at the hatch. Food for rounds, no questions.', art: {}, choices: refuse ? OK : ['Buy 10 food for 16 rounds', 'Buy 2 Med supplies for 20 rounds', 'Sell 10 scrap for 18 rounds', 'Wave them on'] }; },
      pick: (S, p, i) => { if (p.refuse) return; if (i === 0 && S.res.rounds >= 16) { S.res.rounds -= 16; S.res.food += 10; } if (i === 1 && S.res.rounds >= 20) { S.res.rounds -= 20; S.res.meds += 2; } if (i === 2 && S.res.scrap >= 10) { S.res.scrap -= 10; S.res.rounds += 18; } },
    },
    toll: {
      chance: 2, when: S => S.day > 8,
      make: S => ({ ask: 12 + Math.floor(S.day / 3) }),
      view: (S, p) => ({ title: 'The Toll Gang', text: `Armed people on the road. They know where you are. They want ${p.ask} rounds to keep forgetting.`, art: { m: 'toll-gang' }, choices: [`Pay ${p.ask} rounds`, 'Tell them to come and get it'] }),
      pick: (S, p, i) => { if (i === 0 && S.res.rounds >= p.ask) { S.res.rounds -= p.ask; } else S.noise = .9; },
    },
    cult: {
      chance: 2, when: S => S.day > 5,
      view: () => ({ title: 'The Thirty-Two Roads', text: 'A woman in a black slicker preaches through the hatch. Every road leads to the same place, she says. Bring out your thirty-twos, and they will be walked home.', art: { m: 'thirty-two-roads-cultist' }, choices: ['Drive her off', 'Listen a while'] }),
      pick: (S, p, i, E) => { if (i === 1) { E.home(S).forEach(o => { if (o.dmd >= 20) o.stress = Math.max(0, o.stress - 3); else E.addStress(S, o, 1); }); } else S.noise = (S.noise || 0) + .1; },
    },
    leak: {
      chance: 3, when: S => S.weather > 0,
      view: () => ({ title: 'Black rain is coming in', text: 'A crack over the corridor. The drip has been going all night, and it is not water.', art: { u: 'mold' }, choices: ['Patch it (8 scrap)', 'Leave it'] }),
      pick: (S, p, i, E) => { if (i === 0 && S.res.scrap >= 8) { S.res.scrap -= 8; } else E.spawnMold(S); },
    },
    quest: {
      chance: 0, when: (S, E) => S.rooms.some(r => r.type === 'radio') && S.day >= 12 && E.humans(S).length > 2,
      make: (S, E) => { const list = E.humans(S).filter(p => !p.away).sort((a, b) => b.dmd - a.dmd); return { id: list[0].id }; },
      view: (S, p) => { const x = person(S, p.id); return { title: 'On the radio: Q.U.E.S.T.', text: `"I have a place for one of yours. ${x.name} would suit me. They would not come back." The voice is warm, and it knows ${hr(x)} name.`, art: { q: 1 }, choices: [`Send ${x.name}`, 'Switch it off'] }; },
      pick: (S, p, i, E) => { if (i !== 0) return; const x = person(S, p.id); if (!x.alive) return; x.alive = false; x.room = null; x.sealed = false; x.away = false; x.wait = null; S.memorial.push({ name: `${x.name} ${x.last}`, sprite: x.sprite, cls: E.classNameOf(x), day: S.day, why: 'Went with Q.U.E.S.T. Nobody knows.', level: x.level, quest: true }); S.stat.quest++; S.score += 100; E.say(S, 'Gone', `A truck with no driver came at dawn. ${x.name} got in and did not look back.`, { q: 1 }); },
    },
    questmsg: {
      chance: 1, when: S => S.stat.quest > 0,
      view: () => ({ title: 'On the radio: Q.U.E.S.T.', text: '"Eleven thousand years is a long time to look for something. Thank you for your patience."', art: { q: 1 }, choices: ['Switch it off'] }),
    },
    drone: {
      chance: 2, when: S => S.day > 18,
      view: () => ({ title: 'A little drone at the hatch', text: 'It hovers, looks at you with one glass eye, and tilts as if listening.', art: { m: 'q-u-e-s-t-spy-drone' }, choices: ['Shoot it (2 rounds)', 'Let it look'] }),
      pick: (S, p, i) => { if (i === 0 && S.res.rounds >= 2) { S.res.rounds -= 2; S.res.scrap += 6; } else if (i === 1) S.radio += 40; },
    },
    theft: {
      chance: 2, when: S => S.people.filter(p => p.alive).length > 5,
      make: (S, E) => { const list = E.humans(S).filter(p => !p.away && p.stress >= 3); const x = list[0] || E.humans(S)[0]; return { id: x.id }; },
      view: (S, p) => { const x = person(S, p.id); return { title: 'Missing food', text: `Six cans are gone, and ${x.name} has been sleeping better than anyone. People are looking at ${hm(x)}.`, art: { p: x.sprite }, choices: ['Say nothing', `Call ${hm(x)} out`] }; },
      pick: (S, p, i, E) => { const x = person(S, p.id); S.res.food = Math.max(0, S.res.food - 6); if (i === 1) { E.addStress(S, x, 3); E.home(S).forEach(o => { if (o.id !== x.id) o.stress = Math.max(0, o.stress - 1); }); } else E.home(S).forEach(o => E.addStress(S, o, 1)); },
    },
    goodnight: {
      chance: 3,
      view: () => ({ title: 'A good night', text: pick2(['Somebody made a real stew, somebody found a guitar, and for an hour nobody counted anything.', 'Someone found a deck of cards. The arguments were about cards.', 'A birthday. There was a can of peaches, and everybody got one slice.']), art: {}, choices: ['Good'] }),
      pick: (S, p, i, E) => { E.home(S).forEach(o => o.stress = Math.max(0, o.stress - 2)); },
    },
    spoiled: {
      chance: 2, when: S => !S.rooms.some(r => r.type === 'cold'),
      view: () => ({ title: 'Bad cans', text: 'A case of food has gone off. You can throw it out or eat it and hope.', art: {}, choices: ['Throw it out (-5 food)', 'Eat it'] }),
      pick: (S, p, i, E) => { if (i === 0) S.res.food = Math.max(0, S.res.food - 5); else E.home(S).forEach(o => { if (!E.has(o, 'Iron Gut') && E.d10() <= 3) { o.exh += 1; if (E.sicken) E.sicken(S, o, 'food', true); } }); },
    },
    genfail: {
      chance: 2, when: S => S.day > 6,
      view: () => ({ title: 'The generator coughs', text: 'Something in the generator is about to go. A fix now costs scrap. Waiting costs more.', art: {}, choices: ['Fix it (6 scrap)', 'Wait'] }),
      pick: (S, p, i) => { const g = S.rooms.find(r => r.type === 'generator'); if (i === 0 && S.res.scrap >= 6) S.res.scrap -= 6; else if (g) g.broken = true; },
    },
    bitten: {
      chance: 2, when: S => S.day > 7,
      view: () => ({ title: 'A bitten man at the hatch', text: 'He is holding his arm shut with a belt. He knows what it means. He only wants somewhere that is not outside.', art: {}, choices: ['Give him a cot and 1 Med', 'Keep the hatch shut'] }),
      pick: (S, p, i, E) => { if (i === 0 && S.res.meds >= 1) { S.res.meds -= 1; if (E.d10() <= 5) { S.res.rounds += 14; E.say(S, 'He left this', 'He was gone by the third day. He left a bag of rounds on the cot.'); } else E.home(S).forEach(o => o.stress = Math.max(0, o.stress - 1)); } else E.home(S).forEach(o => E.addStress(S, o, 1)); },
    },
    milestone: {
      view: (S, p) => ({ title: `Day ${p.d}. Still here.`, text: 'Word has got around that somebody is holding on down here. Something came of it. Pick one.', art: {}, choices: ['Supply drop: +15 food, +15 water, +4 Med', 'A good person turns up: a seasoned survivor joins', 'Salvage haul: +40 scrap, +40 rounds, +10 fuel'] }),
      pick: (S, p, i, E) => { S.score += 100; if (i === 0) { S.res.food += 15; S.res.water += 15; S.res.meds += 4; } if (i === 1) { if (!E.roomFor(S)) return E.say(S, 'No room', 'There is not a bed or a meal to spare. They go on alone, and nobody watches them leave.'); const x = E.addSurvivor(S, { level: Math.min(8, 2 + Math.floor(p.d / 40)) }); E.say(S, `${x.name} ${x.last} joins you`, `${E.classNameOf(x)}. Level ${x.level}.`, { p: x.sprite }); } if (i === 2) { S.res.scrap += 40; S.res.rounds += 40; S.res.fuel += 10; } },
    },
    strike: { view: (S, p) => ({ title: p.first ? 'The 11th Hour' : p.name, text: `${p.first ? 'The countdown ran out. Not the 11th Hour itself, only the first pieces of it, breaking off ahead. ' : ''}${p.lines.join(' ') || 'It came down close, and the whole shelter jumped.'}`, art: { s: 1 }, choices: ['Dig out'] }) },
    streak: {
      chance: 1, when: S => S.day > 20,
      view: () => ({ title: 'The sky at night', text: 'A bright line went over, then another. Nobody says the words 11th Hour. Everyone is thinking them.', art: {}, choices: ['Back inside'] }),
      pick: (S, p, i, E) => { E.home(S).forEach(o => E.addStress(S, o, 1)); },
    },
    hoarder: {
      chance: 2, when: S => S.day > 10,
      view: () => ({ title: 'A trade over the radio', text: 'A man who calls himself a pharmacist has antibiotics. He wants 40 rounds and he wants them left on the bridge.', art: { m: 'medicine-hoarder' }, choices: ['Make the trade (40 rounds, +5 Med)', 'No'] }),
      pick: (S, p, i) => { if (i === 0 && S.res.rounds >= 40) { S.res.rounds -= 40; S.res.meds += 5; } },
    },
  };
  function pick2(a) { return a[Math.floor(Math.random() * a.length)]; }
  globalThis.SHELTER_EVENTS = EV;
})();
