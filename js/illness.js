// Real-world illness, separate from DMD. Invented for this game, for DB's review.
// Each day a sick person rolls Physical against the illness's DR: 2+ successes and it eases a stage, 0 and it gets worse.
// Stage 4 kills. Med supplies give +2 dice; a staffed Clinic +1; rest (no job) +1. Antibiotics cure bacterial illness, and do nothing for a virus.
(function () {
  const E = globalThis.ShelterEngine, EV = globalThis.SHELTER_EVENTS, D = globalThis.SHELTER_DATA;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const ILL = {
    flu: { n: 'Influenza', bact: false, spread: .10, dr: 5, d: 'Fever, aches, a cough that rattles. Spreads through the bunks fast.', sym: ['Burning up and shaking.', 'Coughing all night.', 'Can barely stand.'] },
    dysentery: { n: 'Dysentery', bact: true, spread: .07, dr: 6, d: 'From bad water. Cramps, and the body empties itself until there is nothing left.', sym: ['Cramps that double them over.', 'Losing water faster than they can drink it.', 'Grey skin, sunken eyes.'] },
    wound: { n: 'Infected wound', bact: true, spread: 0, dr: 6, d: 'A cut that went hot and red. Left alone, it goes black, and then into the blood.', sym: ['The skin around it is hot and red.', 'Red lines running up the limb.', 'Fever, and a smell from the bandage.'] },
    pneumonia: { n: 'Pneumonia', bact: true, spread: .04, dr: 7, d: 'Wet lungs from cold and rain. Every breath crackles.', sym: ['A wet, heavy cough.', 'Can\'t catch their breath.', 'Lips going blue.'] },
    tb: { n: 'Tuberculosis', bact: true, spread: .03, dr: 7, slow: true, d: 'A slow cough that never leaves. Antibiotics take a long course, three doses.', sym: ['A cough that never quite goes.', 'Coughing blood into a rag.', 'Wasting away.'] },
    scurvy: { n: 'Scurvy', bact: false, spread: 0, dr: 6, d: 'Months without fresh food. Bleeding gums, old wounds reopening. Only fresh food helps.', sym: ['Bleeding gums.', 'Old scars opening up again.', 'Teeth loose in their head.'] },
    food: { n: 'Food poisoning', bact: false, spread: 0, dr: 4, short: true, d: 'Something in a can was wrong. Usually passes in a day or two.', sym: ['Vomiting.', 'Can\'t keep water down.', 'Shaking and pale.'] },
  };
  E.ILL = ILL;
  D.ITEMS.antibiotics = { n: 'Antibiotics (course)', d: 'Cures a bacterial illness: infected wounds, dysentery, pneumonia (TB takes three). Does nothing for a virus.', use: 'abx', home: 1 };
  D.ITEM_FOUND.unshift([/antibiotic|amoxicillin|penicillin|cipro/i, 'antibiotics', 1]);

  E.sicken = (S, p, k, quiet) => {
    if (!p || !p.alive || p.damned || p.ill || !ILL[k]) return false;
    if (k === 'flu' && p.fluImmune && S.day - p.fluImmune < 60) return false;
    p.ill = { k, stage: 1, since: S.day, med: 0, abx: 0 };
    S.stat.sick = (S.stat.sick || 0) + 1;
    if (!quiet && !S.queue.some(q => q.k === 'sick' && q.p.day === S.day)) S.queue.push({ k: 'sick', p: { id: p.id, day: S.day } });
    else E.log(S, `${p.name} has come down with ${ILL[k].n.toLowerCase()}.`, 'bad');
    return true;
  };
  const freshFood = S => S.rooms.some(r => ['grow', 'cellar', 'pens'].includes(r.type) && !r.broken && E.workers(S, r).length);
  const cure = (S, p, why) => { const k = p.ill.k; p.ill = null; if (k === 'flu') p.fluImmune = S.day; E.log(S, `${p.name} is over the ${ILL[k].n.toLowerCase()}${why ? ', ' + why : ''}.`, 'good'); };

  E.illnessDay = S => {
    const home = E.humans(S).filter(p => !p.away), crowded = E.humans(S).length > E.bedsOf(S), rainy = D.WEATHER[S.weather].dr >= 8, clinic = E.staffed(S, 'clinic');
    // new cases
    home.forEach(p => {
      if (p.ill || p.damned) return;
      const r = Math.random();
      if (r < (crowded ? .006 : .003)) return E.sicken(S, p, 'flu');
      if (p.hp < E.maxHp(p) * .5 && Math.random() < (clinic ? .015 : .05)) return E.sicken(S, p, 'wound');
      if (rainy && S.rooms.some(x => x.type === 'filter') && !S.rooms.some(x => x.type === 'filter' && x.tier >= 1) && Math.random() < .05) return E.sicken(S, p, 'dysentery');
      if (S.res.water <= 0 && Math.random() < .06) return E.sicken(S, p, 'dysentery');
      if (rainy && p.exh >= 3 && Math.random() < .03) return E.sicken(S, p, 'pneumonia');
      if (S.day > 40 && !freshFood(S) && Math.random() < (E.lawOn(S, 'rations') ? .02 : .008)) return E.sicken(S, p, 'scurvy');
      if (S.day > 60 && crowded && Math.random() < .0015) return E.sicken(S, p, 'tb');
    });
    // spread
    let spread = 0;
    home.filter(p => p.ill && ILL[p.ill.k].spread && !p.sealed).forEach(p => {
      home.filter(o => o !== p && !o.ill && !o.sealed && (o.room === p.room || !o.room || !p.room)).forEach(o => {
        if (spread < 3 && Math.random() < ILL[p.ill.k].spread * (crowded ? 1.5 : 1)) { if (E.sicken(S, o, p.ill.k, true)) spread++; }
      });
    });
    if (spread) E.log(S, 'It is spreading through the shelter.', 'bad');
    // the course of each illness
    E.humans(S).filter(p => p.ill).forEach(p => {
      const il = p.ill, d = ILL[il.k], days = S.day - il.since;
      if (il.abx > 0) { il.abx--; if (d.bact && il.abx === 0 && !(il.k === 'tb' && (il.tbDoses || 0) < 3)) return cure(S, p, 'thanks to the antibiotics'); }
      if (days < 1) return;
      if (il.k === 'scurvy' && freshFood(S) && Math.random() < .25) il.stage--;
      const lev = (il.med > 0 ? 2 : 0) + (clinic ? 1 : 0) + (!p.room && !p.away ? 1 : 0) - (p.hunger >= 2 ? 1 : 0) - (p.thirst ? 1 : 0);
      if (il.med > 0) il.med--;
      if (d.slow && Math.random() < .6) { /* TB moves slowly */ } else {
        const r = E.roll(Math.max(1, E.score(p, 'physical') + lev), d.dr);
        if (r.crit || r.succ >= 2) il.stage -= d.short ? 2 : 1;
        else if (r.succ === 0 && !(d.short && days > 3)) il.stage++;
      }
      if (il.stage <= 0) return cure(S, p);
      p.penalty = (p.penalty || 0) + Math.min(3, il.stage);
      if (il.stage >= 2 && p.room && Math.random() < .5) p.exh += 1;
      if (il.k === 'dysentery') p.thirst = Math.max(p.thirst, il.stage >= 3 ? 1 : 0);
      if (il.stage >= 3) { p.hp = Math.max(1, p.hp - 1); E.addStress(S, p, 1); if (Math.random() < .5) E.log(S, `${p.name}: ${pick(d.sym)}`, 'bad'); }
      if (il.stage >= 4) { const n = d.n.toLowerCase(); p.ill = null; S.queue.push({ k: 'passing', p: E.lastScene(S, p, il.k) }); E.kill(S, p, `Died of ${n}.`); }
    });
  };

  // treatment from the shelter's stores
  E.treat = (S, p, how) => {
    if (!p || !p.ill) return 'Nothing to treat.';
    const d = ILL[p.ill.k], it = E.items(S);
    if (how === 'abx') {
      if (!it.antibiotics) return 'No antibiotics left.';
      it.antibiotics--;
      if (!d.bact) return `${p.name} took the antibiotics. They do nothing for ${d.n.toLowerCase()}. One course wasted.`;
      if (p.ill.k === 'tb') { p.ill.tbDoses = (p.ill.tbDoses || 0) + 1; p.ill.abx = 2; return `Dose ${p.ill.tbDoses} of 3 for ${p.name}.`; }
      p.ill.abx = 2; return `${p.name} starts a course of antibiotics. Two days.`;
    }
    if (how === 'meds') { if (S.res.meds < 2) return 'Not enough Med supplies (2).'; S.res.meds -= 2; p.ill.med = 4; return `${p.name} is being nursed with real supplies: +2 dice to recover for four days.`; }
    if (how === 'rest') { p.room = null; return `${p.name} is off work and resting: +1 die to recover.`; }
    if (how === 'iso') { return E.seal(S, p) ? `${p.name} is isolated in Quarantine. It cannot spread from there.` : 'No free Quarantine cell.'; }
  };
  const u0 = E.useAtHome; E.useAtHome = (S, p, k) => (k === 'antibiotics' ? (p.ill ? E.treat(S, p, 'abx') : null) : u0(S, p, k));

  // a slow death leaves time for goodbyes. Written from who they loved, what they leave behind, and what they were like.
  E.lastScene = (S, p, k) => {
    const others = E.humans(S).filter(o => o !== p && !o.away), part = E.partnerOf && E.partnerOf(S, p);
    const best = others.slice().sort((a, b) => E.rel(S, p, b) - E.rel(S, p, a))[0], worst = others.slice().sort((a, b) => E.rel(S, p, a) - E.rel(S, p, b))[0];
    const kids = (E.kids ? E.kids(S) : []).filter(c => c.mom === p.id || c.dad === p.id), dog = E.dogOf && E.dogOf(S, p), q = E.psy(p).quirks, H = p.he === 'he' ? 'He' : 'She', h = p.he === 'he' ? 'he' : 'she', his = p.he === 'he' ? 'his' : 'her';
    const L = [];
    L.push(pick([`It took ${S.day - (p.ill ? p.ill.since : S.day) || 'three'} days. Near the end ${p.name} stopped coughing, and that was how everyone knew.`, `${p.name} went quietly, a little after the generator was switched off for the night.`, `${p.name} was lucid for one last hour. Everyone who could came and sat on the floor by the bunk.`]));
    if (part) L.push(`${part.name} never let go of ${his} hand. ${H} asked ${part.name} to stop crying, then asked ${part.name} not to stop, because it meant somebody would miss ${his} voice.`);
    else if (best && E.rel(S, p, best) >= 25) L.push(`${H} asked for ${best.name}. "Don't let them make you leader," ${h} said. "You're too kind for it." ${best.name} laughed, and then couldn't stop crying.`);
    if (kids.length) L.push(`${H} asked to hold ${kids.map(c => c.name).join(' and ')} one more time, and wasn't strong enough, so they lay down beside ${p.he === 'he' ? 'him' : 'her'} instead. ${kids.length > 1 ? 'They were' : `${kids[0].name} was`} asleep when ${h} went.`);
    if (dog) L.push(`${dog.name} climbed onto the bunk, which is not allowed, and nobody moved ${dog.sex === 'm' ? 'him' : 'her'}. ${dog.name} is still lying there now.`);
    if (worst && E.rel(S, p, worst) <= -30) L.push(`${H} called ${worst.name} over, last of all, and said something nobody else heard. ${worst.name} walked out of the room and has not said what it was.`);
    if (q.some(x => /letters to people/.test(x))) L.push(`They found ${his} letters under the mattress, dozens of them, to people already dead. The last one is addressed to everyone in the shelter.`);
    else if (q.some(x => /wedding ring/.test(x))) L.push(`${H} took off the wedding ring at the end and closed ${his} hand around it. "I'm going to go give this back," ${h} said.`);
    else if (q.some(x => /hums|hymns|sings/i.test(x))) L.push(`Somebody started humming the tune ${h} always hummed. Then everybody was. ${H} smiled at that.`);
    else if (q.some(x => /afraid of the dark/.test(x))) L.push(`They left the lamp on all night, fuel or no fuel. Nobody said a word about it.`);
    else L.push(pick([`${H} asked what day it was. Somebody said Saturday, because it sounded like a good day.`, `${H} asked if it was raining. It was. They said no.`, `The last thing ${h} said was "Make sure somebody eats my share." Nobody could.`]));
    S.score += 0;
    return { name: p.name, last: p.last, sprite: p.sprite, ill: ILL[k].n, lines: L };
  };
  E.onDeath = (S, p, why) => { if (/thirst|starved to death/i.test(why) && !p.away) S.queue.push({ k: 'passing', p: Object.assign(E.lastScene(S, p, 'food'), { ill: /thirst/i.test(why) ? 'Thirst' : 'Hunger and exhaustion' }) }); };
  EV.passing = {
    view: (S, p) => ({ title: `${p.name} ${p.last}`, text: `${p.ill}.\n\n${p.lines.join('\n\n')}`, art: { p: p.sprite }, choices: ['Say goodbye'] }),
    pick: () => { },
  };
  EV.sick = {
    view: (S, p) => {
      const x = S.people.find(o => o.id === p.id); if (!x || !x.ill) return { title: 'A scare', text: 'Someone felt sick, and then didn\'t. Everyone watched each other cough for a day.', art: {}, choices: ['Good'] };
      const d = ILL[x.ill.k], ab = E.items(S).antibiotics || 0;
      return { title: `${x.name} is sick: ${d.n}`, text: `${d.d} ${d.spread ? 'It can spread to anyone who shares a room or the bunks.' : 'It does not spread.'} You have ${ab} course${ab === 1 ? '' : 's'} of antibiotics and ${Math.floor(S.res.meds)} Med supplies.`, art: { p: x.sprite }, choices: [`Antibiotics${d.bact ? '' : ' (will not help a virus)'}`, 'Nurse with Med supplies (2)', 'Rest, off work', d.spread ? 'Isolate in Quarantine' : 'Let them keep working'] };
    },
    pick: (S, p, i) => { const x = S.people.find(o => o.id === p.id); if (!x || !x.ill) return; const msg = E.treat(S, x, ['abx', 'meds', 'rest', 'iso'][i]); if (msg) E.log(S, msg, ''); },
  };
})();
