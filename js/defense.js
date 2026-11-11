// Defenses built into rooms, and enemies that break in by other ways than the Gate. Invented for this game, for DB's review.
(function () {
  const E = globalThis.ShelterEngine;
  E.DEFS = {
    door: { n: 'Reinforced door', d: 'Steel plate bolted over the door. Anything breaking through has a hard time with this room: half the time it moves on, and the room is never wrecked.', c: { scrap: 18 } },
    traps: { n: 'Spike pits and tripwires', d: 'Every enemy that comes through this room takes 3 damage before anyone has to fight it.', c: { scrap: 14 } },
    turret: { n: 'Scrap turret', d: 'A welded gun on a pivot. It fires at the first two enemies to reach this room, for 1d10 each against DR 5, and uses 4 rounds a fight.', c: { scrap: 45 } },
    alarm: { n: 'Tin-can alarm', d: 'Wire and cans across the approaches. Every night attack is seen coming, and the people in this room fight with +1 die.', c: { scrap: 8 } },
    flood: { n: 'Fire trench', d: 'A fuel-soaked trench you light when they come. Burns every enemy in the room for 2. Costs 2 fuel each time.', c: { scrap: 20 } },
  };
  E.defsOf = r => r.defs || (r.defs = []);
  E.hasDef = (r, k) => !!(r && r.defs && r.defs.includes(k));
  E.addDef = (S, r, k) => { const d = E.DEFS[k]; if (!d || E.hasDef(r, k) || r.type === 'quarantine') return false; for (const x in d.c) if ((S.res[x] || 0) < d.c[x]) return false; for (const x in d.c) S.res[x] -= d.c[x]; E.defsOf(r).push(k); return true; };
  E.anyDef = (S, k) => S.rooms.some(r => E.hasDef(r, k));
  // run the room's defenses against whoever comes through; returns the living foes
  E.defendRoom = (S, r, foes) => {
    let live = foes.filter(f => f.hp > 0); if (!live.length || !r) return live;
    const name = globalThis.SHELTER_DATA.ROOMS[r.type].name;
    if (E.hasDef(r, 'traps')) { live.forEach(f => { f.hp -= 3; }); E.log(S, `The traps in the ${name} cut into them.`, 'good'); }
    if (E.hasDef(r, 'flood') && S.res.fuel >= 2) { S.res.fuel -= 2; live.forEach(f => { f.hp -= 2; }); E.log(S, `The fire trench in the ${name} went up. They came through burning.`, 'good'); }
    if (E.hasDef(r, 'turret') && S.res.rounds >= 4) { S.res.rounds -= 4; live.slice(0, 2).forEach(f => { const r2 = E.roll(Math.max(1, E.d10()), 5); f.hp -= Math.max(1, r2.succ); }); E.log(S, `The turret in the ${name} opened up.`, 'good'); }
    live = live.filter(f => f.hp > 0);
    return live;
  };
})();
