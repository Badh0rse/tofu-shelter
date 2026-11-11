// Static game content. Anything marked CANON comes from TOFU; everything else is invented for this game (see DESIGN.md).
(function () {
  const D = {};
  // CANON: the 24 skills (Threadsight is left out because people on Earth never use powers).
  D.SKILLS = {
    physical: ['acrobatics', 'athletics', 'block', 'dodge', 'grappling', 'melee', 'ranged', 'stealth'],
    mental: ['analysis', 'engineering', 'medicine', 'navigation', 'survival', 'finance', 'technology'],
    social: ['culture', 'deception', 'feint', 'insight', 'intimidation', 'negotiation', 'performance', 'politics'],
  };
  D.SKILL_NAME = { melee: 'Melee Weapons', ranged: 'Ranged Weapons' };
  // CANON: the Earth classes and their +1 Cosmic Die skills. The pref lists only steer where points go.
  D.CLASSES = {
    survivor: { name: 'Survivor', cosmic: [], perkEvery: 1, prio: ['physical', 'mental', 'social'], pref: ['melee', 'athletics', 'survival', 'dodge', 'ranged', 'engineering', 'medicine', 'stealth'], feat: 'Takes a perk every level, and can take Mutation perks.' },
    medic: { name: 'Field Medic', cosmic: ['medicine', 'insight', 'survival'], perkEvery: 2, prio: ['mental', 'physical', 'social'], pref: ['medicine', 'survival', 'dodge', 'ranged', 'insight', 'analysis'], feat: 'Patch-up heals 3 per success. Runs the Clinic best.' },
    bruiser: { name: 'Bruiser', cosmic: ['athletics', 'grappling', 'melee'], perkEvery: 2, prio: ['physical', 'social', 'mental'], pref: ['melee', 'athletics', 'block', 'grappling', 'dodge', 'engineering', 'intimidation'], feat: 'Extra Health. Wrecking Ball knocks the first foe down.' },
    sharpshooter: { name: 'Sharpshooter', cosmic: ['ranged', 'stealth', 'analysis'], perkEvery: 2, prio: ['physical', 'mental', 'social'], pref: ['ranged', 'stealth', 'dodge', 'athletics', 'analysis', 'navigation'], feat: 'Called Shot: the first shot of a fight ignores armor.' },
    scavenger: { name: 'Scavenger', cosmic: ['engineering', 'stealth', 'survival'], perkEvery: 2, prio: ['mental', 'physical', 'social'], pref: ['engineering', 'survival', 'stealth', 'athletics', 'technology', 'melee', 'navigation'], feat: 'Finds +1 item on every search.' },
    shepherd: { name: 'Shepherd', cosmic: ['insight', 'negotiation', 'performance'], perkEvery: 2, prio: ['social', 'mental', 'physical'], pref: ['negotiation', 'performance', 'insight', 'medicine', 'survival', 'dodge', 'melee'], feat: 'Hold Together: the whole team loses 2 Stress after a fight. Can talk people out of fearing the Damned.' },
    damned: { name: 'The Damned', cosmic: [], perkEvery: 1, prio: ['physical', 'mental', 'social'], pref: ['melee', 'athletics', 'grappling', 'dodge', 'stealth'], feat: 'Feeds on the living. Counts down to 32 and then turns on everyone.' },
  };
  D.TIER_LABEL = ['Hands', 'Workshop', 'Profession', 'Lab', 'Rare', 'Master']; // CANON: Crafting & Downtime tools by tier
  // Invented: the rooms. Output is flat like the Economy sheet's Businesses, with no roll for base income.
  D.ROOMS = {
    gate: { name: 'Gate & Watch', art: 'gate', skill: 'melee', cap: 2, build: 0, unique: true, desc: 'The first line when something comes knocking. Whoever works here fights first.' },
    bunks: { name: 'Bunks', art: 'bunks', cap: 0, build: 15, desc: 'Beds. No bed means no rest. At Tier 1 a bunk counts as Comfortable rest.' },
    grow: { name: 'Grow Beds', art: 'garden', skill: 'survival', res: 'food', base: 1.5, perTier: 1, k: .4, power: 1, cap: 2, build: 20, desc: 'Vegetables under scavenged lamps. Feeds people.' },
    filter: { name: 'Rain Filter', art: 'water', skill: 'engineering', res: 'water', base: 3.5, perTier: 1, k: .5, power: 1, cap: 2, build: 20, desc: 'Cleans what falls from the sky. A person needs half a gallon a day.' },
    generator: { name: 'Generator', art: 'generator', skill: 'engineering', cap: 1, build: 25, desc: 'Burns fuel to keep powered rooms running. A blackout halves their output.' },
    clinic: { name: 'Clinic', art: 'clinic', skill: 'medicine', power: 1, cap: 2, build: 30, unique: true, desc: 'Gives the worst wounded real treatment. Each patient costs 1 Med supply. At Tier 3 it is Advanced treatment.' },
    workshop: { name: 'Workshop', art: 'workshop', skill: 'engineering', res: 'scrap', base: .8, perTier: .5, k: .25, power: 1, cap: 2, build: 30, unique: true, desc: 'Strips salvage for scrap, and makes weapons and armor.' },
    bench: { name: 'Reloading Bench', art: 'bench', skill: 'engineering', power: 0, cap: 1, build: 30, unique: true, desc: 'Turns scrap into rounds, and rounds are money.' },
    radio: { name: 'Radio Room', art: 'radio', skill: 'technology', power: 1, cap: 1, build: 30, unique: true, desc: 'Finds new places to loot and people to save. Q.U.E.S.T. is out there too.' },
    quarantine: { name: 'Quarantine', art: 'quarantine', cap: 0, build: 25, unique: true, desc: 'Seal someone at 32 DMD and wait. One cell per tier, plus one.' },
    common: { name: 'Common Room', art: 'common', skill: 'performance', cap: 1, build: 25, unique: true, desc: 'Somewhere to be a person. The worker here takes Stress off everyone.' },
    trade: { name: 'Trade Post', art: 'trade', skill: 'negotiation', cap: 1, build: 35, unique: true, desc: 'Barter every day. Rounds are the money. A good talker gets better prices.' },
    garage: { name: 'Garage', art: 'garage', cap: 0, build: 40, unique: true, desc: 'Lets a run take the truck: much more carried home, for fuel.' },
    kitchen: { name: 'Mess Kitchen', art: 'kitchen', skill: 'survival', power: 0, cap: 1, build: 30, unique: true, desc: 'A good cook stretches every can. Everyone eats 20% less, and a hot meal takes Stress off.' },
    cold: { name: 'Cold Room', art: 'cold', power: 1, cap: 0, build: 30, unique: true, desc: 'Holds 40 more food and stops it spoiling. Some shelters keep other things in here too.' },
    armory: { name: 'Armory', art: 'armory', skill: 'engineering', cap: 1, build: 40, unique: true, desc: 'Weapons kept clean and ready. Everyone fighting at the Gate gets +1 die. Staffed, it repairs worn gear.' },
    chapel: { name: 'Chapel', art: 'chapel', skill: 'performance', cap: 1, build: 25, unique: true, desc: 'A place to pray, or to pretend to. Raises Order every day and takes Stress off the scared. The Damned are not welcome.' },
    cellar: { name: 'Mushroom Cellar', art: 'cellar', skill: 'survival', res: 'food', base: 2, perTier: 1, k: .4, power: 0, cap: 2, build: 18, desc: 'Food with no power and no light. The spores do not always stay in the tubs.' },
    pens: { name: 'Animal Pens', art: 'pens', skill: 'survival', res: 'food', base: 3, perTier: 1.5, k: .4, power: 1, cap: 2, build: 35, desc: 'Chickens and rabbits under a heat lamp. Eggs and meat, but the noise and smell carry to whatever is outside.' },
    butcher: { name: "Butcher's Block", art: 'butcher', skill: 'survival', cap: 1, build: 30, unique: true, desc: 'A butcher here gets 40% more out of the Animal Pens. When a body is butchered, it yields half again as much, and the butcher spares the others from doing it.' },
    training: { name: 'Training Yard', art: 'training', skill: 'athletics', cap: 2, build: 25, unique: true, desc: 'Workers here learn faster and level up sooner.' },
  };
  D.UPGRADE = [20, 45, 90, 160, 260];
  // CANON perks from Survivor (TEA). "fx" is what each one does in this game.
  D.PERKS = {
    Scavenger: 'Finds +2 items when searching buildings.', Gatherer: 'Grow Beds work makes +1 food.', Hunter: 'Survival work makes +1 food.',
    'Light Eater': 'Needs half as much food.', 'Light Drinker': 'Needs a quarter less water.', Packrat: 'Carries 20 lbs more on runs.',
    'First Aid Expert': 'Healing is twice as effective with Med supplies.', Resistant: '+1 Leverage to resist DMD.', 'Burning Will': 'Ignores 1 point of Exhaustion.',
    'Iron Will': 'Once a day, automatically resists one exposure.', 'Iron Gut': 'Never sick from spoiled food.', 'Efficient Sleeper': 'Rest removes 1 extra Stress.',
    'Blind Fighter': 'Fights normally in a blackout.', Quick: 'Always strikes first.', Unyielding: '+1 Leverage to Block.', 'Whirlwind Attack': 'A melee hit also strikes a second enemy.',
    Perceptive: 'Spots trouble: draws less noise on runs.', 'Shrug it Off': 'Ignores Prone in fights: +1 Leverage to Dodge.',
  };
  // CANON Mutation perks: each can only be taken after resisting or being infected by that strain.
  D.MUTATIONS = {
    Spitter: ['Acid Endurance', 'Immune to acid: +1 Armor Rating.'], 'Stalker Zombie': ['Silent Step', 'Makes almost no noise on runs.'], 'Infected Human': ['Rotscale Hide', '+1 Health per level.'],
    Burster: ['Blast Shielding', 'Burst spray can not hurt or expose them.'], Sprinter: ['Adrenal Surge', 'Always strikes first, +1 Dodge.'], Banshee: ["Banshee's Wail", 'Drives one foe away at the start of each fight.'],
    Roper: ['Grasping Tendril', '+1 Leverage to melee.'], Controller: ['Infected Master', 'Turns one infected foe to its side each fight.'], Goliath: ['Ironfist', '+2 Leverage on Physical attacks.'],
    Jumper: ['Kinetic Jumper', '+1 Dodge, flees runs safely.'], Bloat: ['Slimed Immunity', 'Immune to slime and spores.'], Siren: ["Siren's Song", 'Draws infected away: no noise from infected.'],
    Climber: ['Spider Climber', '+1 Leverage to Stealth.'], Scorcher: ['Thermal Hunter', '+1 Leverage to Ranged.'],
  };
  D.DAMNED_PERKS = { 'Bestial Resilience': 'Heals 2 more each rest.', 'Dark Matter Infusion': '+1 Leverage Athletics.', 'Vicious Attack': '+1 Leverage to melee.', 'Inhuman Agility': '+1 Leverage to Dodge.', 'DMD Weaponry': 'Claws count as a heavy weapon.', 'Silent Stalker': '+1 Leverage to Stealth.', 'Blood Frenzy': '+1 Leverage after a kill.' };
  D.SURNAMES = ['Reyes', 'Hart', 'Okafor', 'Mercer', 'Tran', 'Novak', 'Bell', 'Ortiz', 'Shaw', 'Khan', 'Lowe', 'Park', 'Vance', 'Ruiz', 'Doyle', 'Haas', 'Moss', 'Banks', 'Cole', 'Weir'];
  D.STREETS = ['Mercer Street', 'Route 9', 'Elm Avenue', 'the Old Mill Road', 'Dunmore', 'Halsey', 'the county line', 'Fairview', 'Quarry Road', 'Harlan Flats', 'Sycamore', 'Bishop Lane'];
  // CANON: weather from the DMD page (drizzle DR 4, downpour DR 8)
  D.WEATHER = [
    { n: 'Dry', dr: 0, t: 'Nothing falling today. Go outside while you can.' },
    { n: 'Black drizzle', dr: 4, t: 'Light black rain. Anyone outside rolls against DR 4.' },
    { n: 'Black rain', dr: 8, t: 'Heavy downpour. Anyone outside rolls against DR 8.' },
  ];
  D.CRAFT = [
    { n: 'Baseball Bat', c: 8 }, { n: 'Crowbar', c: 10 }, { n: 'Machete', c: 12 }, { n: 'Tomahawk', c: 14 }, { n: 'Sledgehammer', c: 18 }, { n: 'Slingshot', c: 8 }, { n: 'Recurve Bow', c: 18 }, { n: 'Crossbow', c: 30 },
    { n: 'Molotov Cocktail', c: 12 }, { n: 'Padded Jacket', c: 12, ar: 1, cls: 'Light' }, { n: 'Scrap Plate Vest', c: 28, ar: 2, cls: 'Medium' }, { n: 'Riot Rig', c: 60, ar: 3, cls: 'Heavy' },
    { n: 'Bandages (box)', c: 6, item: 'bandages', q: 2 }, { n: 'Road flare', c: 5, item: 'flare', q: 2 }, { n: 'Grenade', c: 24, item: 'grenade', q: 1 },
  ];
  D.ARMOR_FOUND = [[/ballistic vest|plate carrier|body armor|flak/i, 'Ballistic Vest', 2, 'Medium'], [/riot (gear|armor|suit|shield)|bomb suit/i, 'Riot Rig', 3, 'Heavy'], [/hunting jacket|leather jacket|motorcycle jacket|carhartt|work jacket/i, 'Heavy Jacket', 1, 'Light']];
  D.VALUE = { food: 4, water: 3, fuel: 6, meds: 25, scrap: 5, rounds: 2 }; // from the Earth catalog's trade values
  D.RES_NAME = { food: 'Food', water: 'Water', fuel: 'Fuel', meds: 'Med supplies', scrap: 'Scrap', rounds: 'Rounds' };
  D.ITEMS = { // names and uses from the Earth catalog
    bandages: { n: 'Bandages (box)', d: 'Patch a wound without spending Med Supplies. Medicine, DR 5.', use: 'heal', home: 1 },
    first_aid: { n: 'First aid kit', d: 'Patch a wound with +1 Leverage to Medicine. Five uses.', use: 'heal', lev: 1, uses: 5, home: 1 },
    painkillers: { n: 'Painkillers', d: 'Takes the edge off. Removes 1 Exhaustion.', use: 'exh', home: 1 },
    morphine: { n: 'Morphine', d: 'Removes 3 Stress.', use: 'calm', home: 1 },
    epinephrine: { n: 'Epinephrine', d: 'Stands someone who is down back up at 1 Health.', use: 'revive' },
    grenade: { n: 'Grenade', d: 'Thrown, single use. Loud. Hits every enemy. Ranged, DR 6.', use: 'blast' },
    flare: { n: 'Road flare', d: 'Blinds them. Enemy attacks roll 2 fewer dice this round.', use: 'flare' },
    filter: { n: 'Gas mask filter', d: 'Carried. Stops one dose of spores or black rain.', passive: 1 },
    backpack: { n: 'Backpack', d: 'Carried. A run brings home 20 lb more.', passive: 1 },
  };
  D.ITEM_FOUND = [[/bandage|gauze/i, 'bandages', 2], [/first aid/i, 'first_aid', 5], [/painkiller|ibuprofen|acetaminophen|aspirin/i, 'painkillers', 1], [/morphine/i, 'morphine', 1], [/epinephrine|epipen|auto-injector/i, 'epinephrine', 1], [/grenade/i, 'grenade', 1], [/\bflares?\b/i, 'flare', 2], [/gas mask/i, 'filter', 2], [/backpack|hiking pack/i, 'backpack', 1]];
  globalThis.SHELTER_DATA = D;
})();
