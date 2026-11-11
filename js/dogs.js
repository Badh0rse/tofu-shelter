// Dogs. Each has a name, a breed and a person. They fight beside that person, and losing one hurts everyone.
// The Kennel lets them breed, if you choose. Invented for this game, for DB's review.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)], R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const NAMES = ['Biscuit', 'Ranger', 'Tuck', 'Ghost', 'Maggie', 'Boone', 'Pepper', 'Duke', 'Rosie', 'Scout', 'Bear', 'Lady', 'Rusty', 'Juno', 'Bandit', 'Pickles', 'Sarge', 'Hazel', 'Moose', 'Lucky', 'Ash', 'Blue', 'Tater', 'Willow', 'Gus', 'Dixie', 'Ollie', 'Ruby', 'Hank', 'Penny'];
  const BREEDS = [['shepherd mix', 9, 1], ['pit mix', 10, 1], ['hound', 7, 0], ['collie mix', 7, 0], ['husky mix', 8, 1], ['farm mutt', 7, 0], ['lab mix', 8, 0], ['terrier', 5, 0]];
  D.ROOMS.kennel = { name: 'Kennel', art: 'kennel', skill: 'survival', cap: 1, build: 25, unique: true, desc: 'Pens, straw and someone who knows dogs. Dogs heal here, and if you allow it, they breed.' };
  E.dogs = S => S.dogs || (S.dogs = []);
  E.dogOf = (S, p) => E.dogs(S).find(d => d.owner === p.id && d.alive);
  E.dogFood = S => (E.lawOn(S, 'forage') ? 0 : E.dogs(S).filter(d => d.alive).length * .5);
  E.newDog = (S, o = {}) => {
    const b = o.breed ? BREEDS.find(x => x[0] === o.breed) : pick(BREEDS), taken = new Set(E.dogs(S).map(d => d.name)), free = NAMES.filter(n => !taken.has(n));
    const d = { id: S.nextId++, name: o.name || pick(free.length ? free : NAMES), breed: b[0], sex: o.sex || (Math.random() < .5 ? 'm' : 'f'), born: o.born ?? S.day - R(200, 900), hp: b[1], max: b[1], bite: b[2], owner: null, alive: true, kills: 0 };
    E.dogs(S).push(d); return d;
  };
  E.giveDog = (S, d, p) => { E.dogs(S).forEach(x => { if (p && x.owner === p.id) x.owner = null; }); d.owner = p ? p.id : null; };
  // the dog takes the blow meant for its person. Returns damage left over.
  E.dogGuard = (S, p, dmg, say) => {
    const d = E.dogOf(S, p); if (!d || dmg <= 0 || d.role === 'pet' || Math.random() > (war(S, d) ? .4 : .25)) return dmg;
    if (dmg >= d.hp && d.hp > 2 && Math.random() < .5) { d.hp = 1; say(`${d.name} takes the hit meant for ${p.name} and drags itself clear, still breathing.`, 'bad'); return 0; }
    d.hp -= dmg; say(`${d.name} throws itself in front of ${p.name} and takes the hit.`, 'bad');
    if (d.hp <= 0) dogDies(S, d, 'Died between its person and the thing trying to kill them.', say);
    return 0;
  };
  E.ROLES = { combat: ['Combat', 'Fights hard: +1 more die in melee, and takes hits for its person half the time.'], find: ['Tracker', 'Sniffs out hidden food and supplies on runs, and smells what is wrong with strangers at the hatch.'], pet: ['Companion', 'Never fights. Its person sheds Stress every day, everyone near it calms down, and the whole shelter holds together better (+Order each day). Safe at home.'] };
  E.TRAIN_DAYS = 10;
  const war = (S, d) => d.role === 'combat' || (E.lawOn(S, 'wardogs') && d.role !== 'pet' && !d.pup);
  E.dogBite = (S, p) => { const d = E.dogOf(S, p); return d && d.hp > 0 && d.role !== 'pet' ? 1 + d.bite + (war(S, d) ? 1 : 0) : 0; };
  E.gateDogs = S => (E.lawOn(S, 'wardogs') ? Math.min(2, E.dogs(S).filter(d => d.alive && !d.owner && !d.pup && d.hp > 0).length) : 0);
  E.trainDog = (S, d, role) => { if (!E.ROLES[role] || d.role === role || d.pup) return false; d.training = { role, left: E.TRAIN_DAYS }; return true; };
  function dogDies(S, d, why, say) {
    d.alive = false; d.hp = 0; d.died = S.day; d.why = why;
    const p = S.people.find(o => o.id === d.owner);
    S.memorial.push({ name: d.name, sprite: p ? p.sprite : 'ana', cls: `Dog, ${d.breed}`, day: S.day, why, damned: false, level: 0, dog: true });
    if (say) say(`${d.name} is down and not getting up.`, 'bad');
    if (p && p.alive) { E.addStress(S, p, 6); p.exh += 1; }
    E.humans(S).filter(o => o !== p).forEach(o => E.addStress(S, o, 1));
    S.queue.push({ k: 'dogdead', p: { id: d.id } });
  }
  E.dogDies = dogDies;

  E.dogDay = S => {
    { const pets = E.dogs(S).filter(d => d.alive && d.role === 'pet').length; if (pets && S.order !== undefined && !(S.dogEaten && S.day - S.dogEaten < 40)) S.order = Math.min(100, S.order + Math.min(1, pets * .35)); }
    const live = E.dogs(S).filter(d => d.alive), kennel = S.rooms.find(r => r.type === 'kennel'), keeper = E.staffed(S, 'kennel');
    live.forEach(d => {
      d.hp = Math.min(d.max, d.hp + (keeper ? 2 : 1));
      const p = S.people.find(o => o.id === d.owner);
      if (d.owner && (!p || !p.alive)) { d.owner = null; d.mourning = 5; }
      if (d.mourning) { d.mourning--; if (Math.random() < .3) E.log(S, `${d.name} lies by the hatch, waiting for someone who is not coming back.`, 'bad'); }
      if (p && p.alive && !p.away && (d.role === 'pet' || Math.random() < .5)) p.stress = Math.max(0, p.stress - 1);
      if (d.role === 'pet') E.home(S).forEach(o => { if (o !== p && Math.random() < .15) o.stress = Math.max(0, o.stress - 1); });
      if (d.training && keeper && (!p || !p.away)) { if (--d.training.left <= 0) { d.role = d.training.role; d.training = null; E.log(S, `${d.name} finished training: ${E.ROLES[d.role][0]}.`, 'good'); } }
      if (E.lawOn(S, 'forage') && !d.pup && Math.random() < .03) { dogDies(S, d, 'Went out to hunt one night and never came back.'); return; }
      if (S.res.food <= 0 && Math.random() < .025) dogDies(S, d, 'Starved. It kept bringing back rats, and gave most of them to the children.');
      if (S.day - d.born > 3600 && Math.random() < .01) dogDies(S, d, 'Old. Went to sleep by the generator where it was warm.');
    });
    // puppies grow up
    E.dogs(S).filter(d => d.alive && d.pup && S.day - d.born >= 45).forEach(d => { d.pup = false; d.hp = d.max; E.log(S, `${d.name} is grown, and thinks the whole shelter belongs to it.`, 'good'); });
    // breeding, only when you allow it in the Kennel
    if (kennel && kennel.breed && keeper && live.length < 10) {
      const m = live.find(d => d.sex === 'm' && !d.pup), f = live.find(d => d.sex === 'f' && !d.pup && !d.preg && (!d.litter || S.day - d.litter > 60));
      if (m && f && Math.random() < .05) f.preg = { due: S.day + 20, sire: m.id };
    }
    live.filter(d => d.preg && S.day >= d.preg.due).forEach(f => {
      const sire = E.dogs(S).find(x => x.id === f.preg.sire), n = R(2, 5), pups = [];
      f.preg = null; f.litter = S.day;
      for (let i = 0; i < n; i++) { const pup = E.newDog(S, { breed: Math.random() < .5 ? f.breed : (sire ? sire.breed : f.breed), born: S.day }); pup.pup = true; pup.max = Math.max(3, pup.max - 2); pup.hp = 3; pups.push(pup); }
      if (n >= 4 && Math.random() < .5) { const runt = pups.pop(); runt.alive = false; runt.why = 'The runt. Lived two days.'; }
      S.queue.push({ k: 'puppies', p: { mom: f.id, pups: pups.map(x => x.id) } });
    });
  };
  // Food: dogs eat half a share
  const needs0 = E.needs; E.needs = S => { const n = needs0(S); n.food += E.dogFood(S); return n; };

  EV.stray = {
    chance: 2, when: S => S.day > 4 && E.dogs(S).filter(d => d.alive).length < 4,
    make: (S) => ({ breed: pick(BREEDS)[0] }),
    view: (S, p) => ({ title: 'A dog at the hatch', text: `A ${p.breed}, ribs showing, scratching at the hatch and whining. It does not run when you open it. It looks at each of you in turn, like it is choosing.`, art: {}, choices: ['Let it in (it eats half a share)', 'Shut the hatch'] }),
    pick: (S, p, i) => { if (i !== 0) { E.humans(S).forEach(o => { if (E.psy && E.psy(o).a >= 7) E.addStress(S, o, 1); }); return; } const d = E.newDog(S, { breed: p.breed }); const h = E.home(S).filter(o => !o.sealed && !o.damned).sort((a, b) => (E.psy ? E.psy(b).a - E.psy(a).a : 0))[0]; if (h) E.giveDog(S, d, h); E.say(S, `${d.name}`, `Somebody named it ${d.name} by dinner. It has already picked ${h ? h.name : 'a person'}, and sleeps across the foot of ${h ? (h.he === 'he' ? 'his' : 'her') : 'their'} bunk.`); },
  };
  EV.puppies = {
    view: (S, p) => { const m = E.dogs(S).find(d => d.id === p.mom), pups = p.pups.map(id => E.dogs(S).find(d => d.id === id)).filter(Boolean); return { title: `${m ? m.name : 'The dog'} had puppies`, text: `${pups.length} of them, blind and squeaking in the straw: ${pups.map(d => d.name).join(', ')}. Even the people who never smile came down to the Kennel to look. They will eat, and they will grow up into fighters.`, art: {}, choices: ['Keep them all', 'Keep two, and give the rest to the next caravan'] }; },
    pick: (S, p, i) => {
      const pups = p.pups.map(id => E.dogs(S).find(d => d.id === id)).filter(Boolean);
      E.home(S).forEach(o => { o.stress = Math.max(0, o.stress - 1); });
      if (i === 0) return;
      pups.slice(2).forEach(d => { d.alive = false; d.why = i === 1 ? 'Given away.' : 'Eaten.'; });
      if (i === 1) S.res.rounds += 10 * (pups.length - 2);
      if (i === 2) { S.dogEaten = S.day; S.res.food += 3 * (pups.length - 2); E.home(S).forEach(o => E.addStress(S, o, 2)); }
    },
  };
  // hungry people and dogs: nobody decides it, it just happens
  EV.dogsmissing = {
    chance: 4, when: S => E.dogs(S).some(d => d.alive && !d.owner) && E.humans(S).some(p => p.hunger >= 1 && !p.away),
    make: S => { const d = pick(E.dogs(S).filter(x => x.alive && !x.owner)); return { id: d.id }; },
    view: (S, p) => { const d = E.dogs(S).find(x => x.id === p.id); return { title: `${d ? d.name : 'A dog'} is missing`, text: `${d ? d.name : 'One of the dogs'} did not come to the bowl this morning. There is a smell of cooking from somewhere it should not be, and a fresh bone in the trash that nobody will look at. Everyone knows. Nobody says it.`, art: {}, choices: ['Find out who did it (Insight, DR 6)', 'Let it go. Everyone is hungry.'] }; },
    pick: (S, p, i) => {
      const d = E.dogs(S).find(x => x.id === p.id); if (!d || !d.alive) return;
      d.alive = false; d.died = S.day; d.why = 'Went missing. Everyone knows why.';
      S.memorial.push({ name: d.name, sprite: 'ana', cls: `Dog, ${d.breed}`, day: S.day, why: d.why, damned: false, level: 0, dog: true });
      S.res.food += 4; S.dogEaten = S.day;
      const h = E.home(S).filter(o => !o.sealed && !o.damned); h.forEach(o => E.addStress(S, o, 1));
      if (i !== 0) { S.order = Math.max(0, (S.order ?? 55) - 3); return; }
      const sleuth = h.slice().sort((a, b) => E.pool(b, 'insight') - E.pool(a, 'insight'))[0], r = sleuth ? E.rollSkill(sleuth, 'insight', 6) : { succ: 0 };
      const culprit = h.filter(o => o !== sleuth).sort((a, b) => b.hunger - a.hunger || (E.psy ? E.psy(a).a - E.psy(b).a : 0))[0];
      if (r.succ && culprit) { S.queue.unshift({ k: 'dogthief', p: { id: culprit.id, dog: d.name } }); }
      else { S.order = Math.max(0, (S.order ?? 55) - 5); h.forEach(o => E.addStress(S, o, 1)); E.say(S, 'Accusations', `${sleuth ? sleuth.name : 'Someone'} asked questions until people started pointing at each other. Nobody confessed. Now everybody suspects everybody.`); }
    },
  };
  EV.dogthief = {
    view: (S, p) => { const x = S.people.find(o => o.id === p.id); return { title: `It was ${x.name}`, text: `${x.name} does not deny it. "I was starving. ${p.dog} was a dog." ${x.he === 'he' ? 'He' : 'She'} is not sorry, and half the room understands, and that is the worst part.`, art: { p: x.sprite }, choices: [`Forgive ${x.name}`, `Punish ${x.name} in front of everyone`, `Throw ${x.name} out`] }; },
    pick: (S, p, i) => {
      const x = S.people.find(o => o.id === p.id); if (!x || !x.alive) return;
      const h = E.home(S).filter(o => o !== x && !o.sealed && !o.damned);
      if (i === 0) { S.order = Math.max(0, (S.order ?? 55) - 4); h.forEach(o => { if (E.addRel) E.addRel(S, o, x, -10); }); }
      if (i === 1) { x.hp = Math.max(1, x.hp - 3); E.addStress(S, x, 4); S.order = Math.min(100, (S.order ?? 55) + 4); if (E.addRel) h.forEach(o => E.addRel(S, o, x, -5)); }
      if (i === 2) { E.kill(S, x, 'Thrown out for eating a dog.'); S.order = Math.min(100, (S.order ?? 55) + 6); h.forEach(o => E.addStress(S, o, 1)); }
    },
  };
  EV.dogdead = {
    view: (S, p) => { const d = E.dogs(S).find(x => x.id === p.id), o = d && S.people.find(x => x.id === d.owner); return { title: `${d.name} is gone`, text: `${d.name}, the ${d.breed}. ${d.why} ${o && o.alive ? `${o.name} would not let anyone else carry ${d.sex === 'm' ? 'him' : 'her'}. ${o.he === 'he' ? 'He' : 'She'} has not said a word since.` : 'There was nobody left to carry the body but you.'}${d.kills ? ` ${d.sex === 'm' ? 'He' : 'She'} brought down ${d.kills} of them, over the time ${d.sex === 'm' ? 'he' : 'she'} was with you.` : ''} The water bowl is still by the hatch. Nobody can bring themselves to move it.`, art: o ? { p: o.sprite } : {}, choices: ['Bury them by the generator, where it was warm', 'Keep the collar'] }; },
    pick: (S, p, i) => { const d = E.dogs(S).find(x => x.id === p.id), o = d && S.people.find(x => x.id === d.owner); if (i === 1 && o && o.alive) { o.dogCollar = d.name; } },
  };
})();
