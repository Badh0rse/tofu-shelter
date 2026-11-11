// The road to a quest and back: a map, a route, and what happens on it. Invented for this game, for DB's review.
// Every check is a TOFU roll by whoever on the team is best at it.
(function () {
  const E = globalThis.ShelterEngine, Q = E.Q;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const team = S => Q.team(S).filter(p => p.alive && p.hp > 0);
  const best = (S, sk) => team(S).slice().sort((a, b) => E.pool(b, sk) - E.pool(a, sk))[0];
  const stress = (S, n) => team(S).forEach(p => E.addStress(S, p, n));
  const hurt = (S, n) => { const v = pick(team(S)); if (v) v.hp = Math.max(1, v.hp - n); return v; };
  const add = (S, k, n) => { S.res[k] = Math.max(0, (S.res[k] || 0) + n); if (S.quest && n > 0) S.quest.rep.got[k] = (S.quest.rep.got[k] || 0) + n; };
  // where things are on the travel map (pixels on the 1600x900 atlas crop)
  Q.HOME = [985, 585];
  Q.SPOT = { fema: [820, 470], convoy: [1150, 690], church: [1210, 470], mall: [745, 250], pit: [600, 560], lab: [1065, 165], marina: [900, 205], relay: [1330, 300] };

  const ROAD = [
    { k: 'car', t: 'A car sits in the middle of the road with the engine running and the headlights on. All four doors are open. There are no footprints in the mud around it.', o: [
      { l: 'Siphon the fuel', sk: 'engineering', dr: 6, ok: S => { add(S, 'fuel', 5); return 'Five gallons. When you look back from the hill, the headlights have turned to follow you.'; }, no: S => { stress(S, 1); const v = hurt(S, 2); return `Something under the car grabbed ${v ? v.name + "'s" : 'an'} ankle and let go. Nobody saw what.`; } },
      { l: 'Go around it, wide', ok: S => { stress(S, 1); return 'You leave it running. You can hear the engine for a long time.'; } }] },
    { k: 'shoes', t: 'Shoes. Hundreds of pairs, lined up neatly along both sides of the road for a mile, all pointing the direction you are walking.', o: [
      { l: 'Keep walking', ok: S => { stress(S, 1); return 'Near the end there are pairs in your sizes. They look new.'; } },
      { l: 'Look for anything useful', sk: 'survival', dr: 5, ok: S => { add(S, 'scrap', 4); return 'Laces, buckles, a pocketknife in one boot. Nobody wants to say whose boots they were.'; }, no: S => { stress(S, 2); return 'Every shoe has a sock in it. Every sock is still warm.'; } }] },
    { k: 'girl', t: 'A girl in a yellow raincoat stands at the crossroads with her back to you. She does not answer. Closer, you see her feet are not touching the ground.', o: [
      { l: 'Get close enough to see', sk: 'insight', dr: 7, ok: S => { add(S, 'meds', 2); return 'A dead child hung on fishing line from the traffic light, to draw people in. The bait was never collected. Her backpack had medicine in it.'; }, no: S => { const v = hurt(S, 3); stress(S, 2); return `She turned around. ${v ? v.name : 'Someone'} got cut getting away, and nobody will describe her face.`; } },
      { l: 'Take another road', ok: S => { stress(S, 1); return 'An hour longer. You keep thinking you see yellow at the edge of things.'; } }] },
    { k: 'names', t: 'Someone has repainted a billboard by hand. It is a list of names. Yours are on it, in order, with the paint still wet. The last line is blank.', o: [
      { l: 'Paint over it', ok: S => { stress(S, 1); return 'It takes the last of the paint you found. On the way back the names are there again.'; } },
      { l: 'Read the rest of the list', sk: 'analysis', dr: 6, ok: S => { S.score += 15; return 'Most of them have dates beside them. None of yours do. Yet.'; }, no: S => { stress(S, 3); return 'Your shelter is on there. Every name. Including the people who died before anyone could have known them.'; } }] },
    { k: 'rain', t: 'The sky goes black in a minute. The first drops leave oily marks on your sleeves.', o: [
      { l: 'Find cover fast', sk: 'survival', dr: 6, ok: () => 'A bus shelter, half a roof. Enough.', no: S => { const hit = team(S).filter(p => E.expose(S, p, 1, 5, 'black rain', null)); return hit.length ? `Not fast enough. ${hit.map(p => p.name).join(' and ')} got soaked.` : 'Soaked, but it did not get in.'; } },
      { l: 'Run through it', sk: 'athletics', dr: 7, ok: () => 'You make it to the overpass breathing hard and mostly dry.', no: S => { team(S).forEach(p => E.expose(S, p, 1, 5, 'black rain', null)); return 'Everyone is soaked to the skin.'; } }] },
    { k: 'dog', t: 'A thin dog follows you for a mile, always the same distance back. When you stop, it stops.', o: [
      { l: 'Feed it (2 food)', cost: { food: 2 }, ok: S => { add(S, 'food', -2); team(S).forEach(p => { p.stress = Math.max(0, p.stress - 2); }); if (E.newDog) { const d = E.newDog(S); E.giveDog(S, d, team(S)[0]); d.found = true; return `It sleeps against whoever is on watch, and follows you home. ${team(S)[0].name} names it ${d.name}.`; } return 'It sleeps against whoever is on watch. Everyone is a little lighter.'; } },
      { l: 'Kill it for meat', sk: 'ranged', dr: 5, ok: S => { add(S, 'food', 3); stress(S, 1); return 'Three days of meat. It looked at you the whole time.'; }, no: S => { stress(S, 1); return 'It ran. Later you hear it howling where the road bends, and something answers.'; } },
      { l: 'Throw rocks until it leaves', ok: () => 'It goes. It does not go far.' }] },
    { k: 'toll', t: 'Three cars across the road, and a man on the roof of one with a hunting rifle. "Toll road," he says, "fifteen rounds a head."', o: [
      { l: 'Pay (15 rounds each)', cost: { rounds: 15 }, ok: S => { add(S, 'rounds', -15 * team(S).length); return 'He counts it twice and waves you through. He is still watching when you can no longer see him.'; } },
      { l: 'Talk your way through', sk: 'negotiation', dr: 7, ok: () => 'He laughs and lets you pass. You promised him something you do not have.', no: S => { const v = hurt(S, 4); return `He shoots ${v ? v.name : 'someone'} in the leg as a lesson, and then lets you pass.`; } },
      { l: 'Rush him', sk: 'melee', dr: 7, ok: S => { add(S, 'rounds', 20); stress(S, 1); return 'It is over fast. He had twenty rounds and a photo of two kids.'; }, no: S => { hurt(S, 4); hurt(S, 3); return 'He was not alone. You get away bleeding.'; } }] },
    { k: 'radio', t: 'A radio in an abandoned car switches itself on as you pass. A calm woman\'s voice. She says your names, one by one, and asks how the shelter is holding up.', o: [
      { l: 'Answer her', sk: 'deception', dr: 7, ok: S => { S.radio = (S.radio || 0) + 40; return 'You lie about how many of you there are. She thanks you, and gives you a frequency. "For when you are ready."'; }, no: S => { stress(S, 2); S.noise = (S.noise || 0) + .05; return 'She already knew the real number. She corrects you, kindly.'; } },
      { l: 'Smash the radio', ok: S => { stress(S, 1); return 'It keeps talking for a while after it is in pieces.'; } }] },
    { k: 'ditch', t: 'Bodies in the ditch, a dozen, laid in a neat row. No wounds. Still warm.', o: [
      { l: 'Search them', sk: 'medicine', dr: 7, ok: S => { add(S, 'meds', 2); add(S, 'food', 2); return 'Pills, a little food. And every one of them has the same number written on the palm: 32.'; }, no: S => { const hit = team(S).filter(p => E.expose(S, p, 2, 6, 'the bodies in the ditch', null)); return hit.length ? `One of them sat up. ${hit.map(p => p.name).join(' and ')} got scratched pulling away.` : 'One of them sat up. You got away clean.'; } },
      { l: 'Leave them', ok: S => { stress(S, 1); return 'On the way back the ditch is empty.'; } }] },
    { k: 'house', t: 'A house with every window boarded from the inside, a light on upstairs. Someone is knocking on the boards, very slowly, in time with your footsteps.', o: [
      { l: 'Go in quietly', sk: 'stealth', dr: 7, ok: S => { add(S, 'food', 4); add(S, 'scrap', 3); return 'A pantry nobody touched. Upstairs, the knocking moved from room to room to stay beside you. You never saw it.'; }, no: S => { const v = hurt(S, 3); stress(S, 2); return `It was waiting at the bottom of the stairs. ${v ? v.name : 'Someone'} got bitten by something that looked like an old man.`; } },
      { l: 'Walk faster', ok: S => { stress(S, 1); return 'The knocking follows you to the end of the street, house to house.'; } }] },
    { k: 'wrongroad', back: true, t: 'The road home is not the road you walked this morning. Same signs, same burned houses. One house too many, and its door is open.', o: [
      { l: 'Trust the map', sk: 'navigation', dr: 7, ok: () => 'You find the hatch where it should be. Nobody mentions the extra house.', no: S => { team(S).forEach(p => { p.exh += 1; }); stress(S, 1); return 'Four extra hours in a loop of the same three streets. Exhausted, you find the hatch at dawn.'; } },
      { l: 'Go through the open house', ok: S => { if (Math.random() < .5) { add(S, 'scrap', 5); return 'A shortcut. On the wall inside, someone has drawn your shelter, room by room.'; } const v = hurt(S, 3); return `Something in the dark hit ${v ? v.name : 'someone'} once and left.`; } }] },
    { k: 'quiet', t: 'A quiet stretch. A dead tree, a burned bus, the wind. Nothing happens, and that is somehow worse.', o: [{ l: 'Keep moving', ok: () => 'Nothing happens.' }] },
    { k: 'survivor', t: 'A man waves from a rooftop, alone, starving, with a rifle he is too weak to lift. He begs you to take him with you.', o: [
      { l: 'Bring him home', sk: 'insight', dr: 6, ok: S => { S.pendingRecruit = (S.pendingRecruit || 0) + 1; return 'He cries the whole way. He is real, and he is grateful.'; }, no: S => { stress(S, 2); const v = hurt(S, 3); return `Halfway home he stopped talking. Then he went for ${v ? v.name + "'s" : 'someone\'s'} throat. You left him in a culvert.`; } },
      { l: 'Leave him', ok: S => { stress(S, 2); return 'He calls your names until you are out of sight. You never told him your names.'; } }] },
  ];
  Q.ROAD = ROAD;

  Q.trip = (S, dir) => {
    const q = S.quest, n = Math.random() < .35 ? 2 : 1, pool = ROAD.filter(r => (dir === 'back' || !r.back)), stops = [];
    while (stops.length < n) { const r = pick(pool); if (!stops.includes(r.k)) stops.push(r.k); }
    q.trip = { dir, stops: stops.map((k, i) => ({ k, at: (i + 1) / (n + 1), done: false })), i: 0, view: 'move', res: null };
    q.view = 'travel';
  };
  Q.tripStop = S => { const t = S.quest.trip; return t && t.stops[t.i] && !t.stops[t.i].done ? ROAD.find(r => r.k === t.stops[t.i].k) : null; };
  Q.road = (S, oi) => { // pick an option at the current stop
    const q = S.quest, t = q.trip, r = Q.tripStop(S); if (!r) return false;
    const o = r.o[oi]; if (!o) return false;
    if (o.cost && Object.keys(o.cost).some(k => S.res[k] < o.cost[k] * (k === 'rounds' ? team(S).length : 1))) return false;
    let text, roll = null;
    if (o.sk) { const p = best(S, o.sk), rr = E.rollSkill(p, o.sk, o.dr); roll = { who: p.name, sk: E.skillName(o.sk), dice: rr.dice, dr: o.dr, crit: rr.crit }; text = (rr.succ ? o.ok : (o.no || o.ok))(S); if (!rr.succ) E.addStress(S, p, 1); }
    else text = o.ok(S);
    t.stops[t.i].done = true; t.res = { text, roll, title: o.l };
    return true;
  };
  Q.tripNext = S => { // after reading a result, move on; true when the trip is over
    const q = S.quest, t = q.trip; t.res = null;
    if (t.i < t.stops.length && t.stops[t.i].done) t.i++;
    if (t.i < t.stops.length) return false;
    return true;
  };
  Q.arrive = S => {
    const q = S.quest, t = q.trip; q.trip = null;
    if (t.dir === 'out') { q.view = 'text'; Q.next(S); return; }
    q.home = true; Q.finish(S);
    if (S.pendingRecruit) { for (let i = 0; i < S.pendingRecruit && E.roomFor(S); i++) { const x = E.addSurvivor(S); E.say(S, 'Someone from the road', `${x.name} ${x.last} came home with the team.`, { p: x.sprite }); } S.pendingRecruit = 0; }
  };
})();
