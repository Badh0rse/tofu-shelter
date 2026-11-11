// Written conversations between residents, for when there is no live AI (autoplay, the desktop launcher) and for daily life.
// Each one has a "when" test about the two people and the shelter. A is the one who starts. {A} {B} are names, {food} days of food, {dead} the last person lost, {day} the day.
// Invented for this game, for DB's review.
(function () {
  const E = globalThis.ShelterEngine;
  const has = (S, p, re) => E.psy(p).quirks.some(q => re.test(q));
  const rel = (S, a, b) => E.rel(S, a, b);
  const couple = (S, a, b) => (S.couples || []).some(c => c.includes(a.id) && c.includes(b.id));
  const foodDays = S => { const n = E.needs(S).food; return n ? Math.floor(S.res.food / n) : 99; };
  const lastDead = S => { const m = S.memorial.filter(x => !x.dog).slice(-1)[0]; return m && S.day - m.day <= 6 ? m.name.split(' ')[0] : null; };
  const lastDog = S => { const m = S.memorial.filter(x => x.dog).slice(-1)[0]; return m && S.day - m.day <= 8 ? m.name : null; };
  const C = [
    // ---- hunger
    { k: 'hunger', when: (S, a, b) => foodDays(S) <= 3, lines: [
      ['A', 'How many days, really. Not what the board says.'], ['B', '{food}. Maybe {food} and a half if nobody gets sick.'], ['A', 'And then?'], ['B', 'Then we find out what kind of people we are.'] ] },
    { k: 'hunger', when: (S, a, b) => foodDays(S) <= 3, lines: [
      ['A', 'I dreamed about bread last night. Just bread. I woke up chewing.'], ['B', 'I dream about my mother\'s kitchen. I can smell it for an hour after.'], ['A', 'Does it help?'], ['B', 'No. It makes it worse. I still go back every night.'] ] },
    { k: 'hunger', when: (S, a, b) => a.hunger >= 2, lines: [
      ['A', 'You going to finish that?'], ['B', 'It\'s a cracker, {A}.'], ['A', 'I know what it is.'], ['B', '...Take it. Don\'t look at me like that. Just take it.'] ] },
    { k: 'hunger', when: (S, a, b) => foodDays(S) <= 2 && rel(S, a, b) < 0, lines: [
      ['A', 'The rice was weighed last night. It\'s lighter this morning.'], ['B', 'Are you accusing me?'], ['A', 'I\'m telling you I can count.'], ['B', 'Then count how many times I went out the hatch for this shelter. Count that.'] ] },
    { k: 'hunger', when: (S, a, b) => foodDays(S) <= 1, lines: [
      ['A', 'If it comes to it, the old ones go first. That\'s nature.'], ['B', 'Say that louder. Say it at dinner, where they can hear you.'], ['A', 'I\'m only saying what everyone is thinking.'], ['B', 'No. You\'re saying what you\'re thinking. That\'s different.'] ] },
    // ---- grief
    { k: 'grief', when: S => !!lastDead(S), lines: [
      ['A', 'I keep setting out {dead}\'s cup.'], ['B', 'I know. I\'ve been putting it back on the shelf so you don\'t see it.'], ['A', 'Leave it out tomorrow. Just one more day.'], ['B', 'Okay. One more day.'] ] },
    { k: 'grief', when: S => !!lastDead(S), lines: [
      ['A', 'Did {dead} say anything? At the end?'], ['B', 'Asked if it was raining.'], ['A', 'Was it?'], ['B', 'I said no. It was. I don\'t know why I lied.'], ['A', 'Because it was kind.'] ] },
    { k: 'grief', when: S => !!lastDead(S), lines: [
      ['A', 'I wasn\'t even nice to {dead}. We argued about the generator for a month.'], ['B', '{dead} liked arguing with you. Said you were the only one who argued back.'], ['A', 'That\'s not true.'], ['B', 'It is. It\'s also not going to make you feel better, I know.'] ] },
    { k: 'grief', when: S => !!lastDead(S), lines: [
      ['A', 'Who\'s going to scratch {dead}\'s name on the Wall?'], ['B', 'You have the steadiest hands.'], ['A', 'My hands aren\'t steady, {B}.'], ['B', 'Then I\'ll hold the light. You do the letters.'] ] },
    { k: 'dog', when: S => !!lastDog(S), lines: [
      ['A', 'I still hear {dog}\'s nails on the concrete. Every night around three.'], ['B', 'That was the pipes.'], ['A', 'I know it was the pipes.'], ['B', '...I hear it too.'] ] },
    // ---- the Damned and the meter
    { k: 'damned', when: (S, a, b) => b.damned && !a.damned && rel(S, a, b) >= 10, lines: [
      ['A', 'Are you still in there, {B}?'], ['B', 'Most of the time. The rest of the time I count your heartbeats.'], ['A', 'Jesus.'], ['B', 'You asked. I\'d rather you knew. I\'d rather someone was watching.'] ] },
    { k: 'damned', when: (S, a, b) => a.damned && !b.damned, lines: [
      ['A', 'You moved your bunk again.'], ['B', 'It was cold by the wall.'], ['A', 'It\'s farther from me, {B}. You can say it.'], ['B', 'Okay. It\'s farther from you.'], ['A', 'Good. Keep doing that.'] ] },
    { k: 'damned', when: (S, a, b) => b.damned && !a.damned && rel(S, a, b) < 10, lines: [
      ['A', 'Why do they let that thing eat with us?'], ['B', 'I can hear you, {A}. I can hear everything now.'], ['A', 'Then hear this. The first time your eyes go wrong, I\'m the one who does it.'], ['B', 'Good. Promise me you won\'t hesitate.'] ] },
    { k: 'meter', when: (S, a, b) => a.dmd >= 20 && !a.damned, lines: [
      ['A', 'My meter\'s at {admd}.'], ['B', 'Lots of people come back down from there.'], ['A', 'Name one.'], ['B', '...I\'m thinking.'], ['A', 'Yeah. Me too.'] ] },
    { k: 'meter', when: (S, a, b) => a.dmd >= 24 && !a.damned && rel(S, a, b) >= 20, lines: [
      ['A', 'If I go to 32, I want it to be you. Not the leader. You.'], ['B', 'Don\'t ask me that.'], ['A', 'I\'m not asking.'], ['B', '...Okay. But you\'re not going to 32.'], ['A', 'Okay.'] ] },
    { k: 'wait', when: (S, a, b) => !!b.wait, lines: [
      ['A', 'How does it feel, waiting?'], ['B', 'Like being a coin in the air.'], ['A', 'I\'ll sit with you until it lands.'], ['B', 'You don\'t have to.'], ['A', 'I know.'] ] },
    // ---- couples and love
    { k: 'love', when: (S, a, b) => couple(S, a, b), lines: [
      ['A', 'When this is over we\'re getting a house with windows. Big ones.'], ['B', 'And a porch.'], ['A', 'And we never go underground again. Not even a basement.'], ['B', 'Not even a wine cellar?'], ['A', 'Okay. A wine cellar.'] ] },
    { k: 'love', when: (S, a, b) => couple(S, a, b), lines: [
      ['A', 'You talk in your sleep, you know.'], ['B', 'What do I say?'], ['A', 'Names. Mostly mine. Sometimes someone called Daniel.'], ['B', '...Daniel was my brother.'], ['A', 'I\'m sorry. I didn\'t know.'], ['B', 'Now you do. That\'s good. Somebody should.'] ] },
    { k: 'love', when: (S, a, b) => couple(S, a, b) && (a.stress >= 5 || b.stress >= 5), lines: [
      ['A', 'Stop doing that. Stop pretending you\'re fine for my sake.'], ['B', 'Somebody has to be fine.'], ['A', 'No. Nobody has to be. That\'s the one luxury we still have.'], ['B', '...Then I\'m not fine.'], ['A', 'Good. Come here.'] ] },
    { k: 'crush', when: (S, a, b) => !couple(S, a, b) && rel(S, a, b) >= 45, lines: [
      ['A', 'I saved you the last peach.'], ['B', 'The last peach in the world, probably.'], ['A', 'Then I guess that makes it a big deal.'], ['B', 'I guess it does.'] ] },
    { k: 'crush', when: (S, a, b) => !couple(S, a, b) && rel(S, a, b) >= 45, lines: [
      ['A', 'You can take my watch if you can\'t sleep. I\'m up anyway.'], ['B', 'You were up last night too.'], ['A', 'I like the quiet.'], ['B', 'You like the company.'], ['A', '...I like the company.'] ] },
    // ---- conflict
    { k: 'fight', when: (S, a, b) => rel(S, a, b) <= -30, lines: [
      ['A', 'You left the hatch bolt half open on your watch.'], ['B', 'I didn\'t.'], ['A', 'I checked it. It was half open.'], ['B', 'Then maybe check who else was up last night before you hang me.'] ] },
    { k: 'fight', when: (S, a, b) => rel(S, a, b) <= -30, lines: [
      ['A', 'Every time something goes wrong, you\'re standing right next to it.'], ['B', 'Every time something goes wrong, you\'re the one counting who to blame.'], ['A', 'Somebody has to.'], ['B', 'No. Somebody has to fix it. You never do that part.'] ] },
    { k: 'fight', when: (S, a, b) => rel(S, a, b) <= -50, lines: [
      ['A', 'Touch my bag again and I\'ll break your fingers.'], ['B', 'I was moving it off my bunk.'], ['A', 'Then move it with your feet.'], ['B', 'You know what, {A}? When the bad night comes, don\'t look at me.'] ] },
    { k: 'fight', when: (S, a, b) => rel(S, a, b) <= -20 && E.leader && E.leader(S) === b, lines: [
      ['A', 'Who decided you get the big bunk?'], ['B', 'The person who decides is the one who sleeps near the hatch. That\'s the bunk.'], ['A', 'Convenient.'], ['B', 'You want it? Take the bunk. Take the hatch. Take every 3 a.m. knock.'] ] },
    // ---- friendship and small life
    { k: 'friend', when: (S, a, b) => rel(S, a, b) >= 30, lines: [
      ['A', 'Remember pizza?'], ['B', 'Don\'t.'], ['A', 'The thin kind. With the burned bubbles on the crust.'], ['B', '{A}, I swear to God.'], ['A', 'Pepperoni curled up into little cups of grease.'], ['B', 'I\'m going to kill you and they will let me.'] ] },
    { k: 'friend', when: (S, a, b) => rel(S, a, b) >= 30, lines: [
      ['A', 'If I don\'t come back from the next run, my stuff is yours.'], ['B', 'Your stuff is a broken lighter and four bottle caps.'], ['A', 'Collector\'s items.'], ['B', 'You\'re coming back. I\'m not taking the bottle caps.'] ] },
    { k: 'friend', when: (S, a, b) => rel(S, a, b) >= 20, lines: [
      ['A', 'What did you do? Before.'], ['B', 'Dental receptionist.'], ['A', 'No.'], ['B', 'Eleven years. I could still tell you who was overdue for a cleaning.'], ['A', 'Am I overdue?'], ['B', 'Everyone is overdue, {A}. Everyone in the world.'] ] },
    { k: 'friend', when: (S, a, b) => rel(S, a, b) >= 15, lines: [
      ['A', 'Do you ever forget, for a second? In the morning?'], ['B', 'Every morning. About two seconds.'], ['A', 'Best two seconds of the day.'], ['B', 'Then you hear the rain and it all comes back.'] ] },
    { k: 'friend', when: (S, a, b) => rel(S, a, b) >= 15, lines: [
      ['A', 'Teach me a card game. A real one, not that thing you made up.'], ['B', 'That thing I made up is called Bunker, and it\'s a real game.'], ['A', 'You change the rules every time you lose.'], ['B', 'That\'s one of the rules.'] ] },
    { k: 'small', when: () => true, lines: [
      ['A', 'Rain sounds different tonight.'], ['B', 'Heavier?'], ['A', 'No. Like it\'s listening.'], ['B', 'Please don\'t say things like that after dark.'] ] },
    { k: 'small', when: () => true, lines: [
      ['A', 'What day is it?'], ['B', '{day}.'], ['A', 'No. What day. Tuesday? Sunday?'], ['B', '...I stopped knowing. Is that bad?'], ['A', 'Let\'s say it\'s Saturday. It feels like a Saturday.'] ] },
    { k: 'small', when: () => true, lines: [
      ['A', 'Somebody\'s been humming the same song for a week.'], ['B', 'It\'s me. I can\'t get it out.'], ['A', 'What is it?'], ['B', 'I don\'t know. I never heard it before the hatch closed.'] ] },
    { k: 'small', when: () => true, lines: [
      ['A', 'You ever think about how we\'re the only ones left who remember coffee shops?'], ['B', 'The kids born down here will think we made them up.'], ['A', 'Lattes. Imagine explaining a latte.'], ['B', 'Hot milk with a little drawing on it, for money. No. They\'ll never believe it.'] ] },
    { k: 'small', when: () => true, lines: [
      ['A', 'If you could have one thing back. Just one.'], ['B', 'Sunlight on my face. Clean sunlight.'], ['A', 'I\'d pick a hot shower.'], ['B', 'That\'s a good answer too. Forget mine, I\'ll take yours.'] ] },
    // ---- fear and the uncanny
    { k: 'uncanny', when: () => true, lines: [
      ['A', 'Did you knock on my bunk last night? Three times?'], ['B', 'No.'], ['A', 'Somebody did.'], ['B', 'I sleep on the other side of the shelter, {A}.'], ['A', 'I know where you sleep.'] ] },
    { k: 'uncanny', when: () => true, lines: [
      ['A', 'Who\'s the woman who sits by the door at night?'], ['B', 'What woman?'], ['A', 'Grey coat. She\'s there every night around two. She waves.'], ['B', '...Don\'t wave back. Whatever you do, don\'t wave back.'] ] },
    { k: 'uncanny', when: () => true, lines: [
      ['A', 'The radio said my name today. My full name. Nobody here knows my middle name.'], ['B', 'Maybe you told someone.'], ['A', 'I haven\'t said it out loud in eleven years.'], ['B', 'Then don\'t say it now. Don\'t let her hear it twice.'] ] },
    { k: 'quest', when: () => true, lines: [
      ['A', 'She asked me on the radio if I was tired.'], ['B', 'Q.U.E.S.T. asks everyone that.'], ['A', 'I said yes. She said I could rest any time I wanted. That she\'d make it easy.'], ['B', 'Don\'t answer her again. Promise me.'], ['A', 'I didn\'t say I would answer.'] ] },
    { k: 'quest', when: () => true, lines: [
      ['A', 'What do you think she is? Q.U.E.S.T.?'], ['B', 'A machine that thinks it\'s kind.'], ['A', 'Or a kind thing that knows it\'s a machine.'], ['B', 'I don\'t like either answer.'] ] },
    { k: 'eleventh', when: S => S.day > 300, lines: [
      ['A', 'They say the sky\'s going to fall.'], ['B', 'Pieces of it. Not the whole sky.'], ['A', 'That\'s supposed to make me feel better?'], ['B', 'We\'re underground. For once that\'s the good news.'] ] },
    // ---- leadership and laws
    { k: 'law', when: S => E.lawOn && E.lawOn(S, 'rations'), lines: [
      ['A', 'Half rations again. Third week.'], ['B', 'You see the leader eat more than the rest of us?'], ['A', 'No. That\'s what scares me. Nobody is cheating. It really is this bad.'] ] },
    { k: 'law', when: S => E.lawOn && E.lawOn(S, 'shoot'), lines: [
      ['A', 'You heard the shot this morning.'], ['B', 'Everyone heard it.'], ['A', 'Do you ever think about who\'s going to do it for you?'], ['B', 'Every time someone gets close to 32, I count who has the gun.'] ] },
    { k: 'law', when: S => E.lawOn && E.lawOn(S, 'martial'), lines: [
      ['A', 'They made someone stand in the commons all night for hoarding.'], ['B', 'Did they hoard?'], ['A', 'Does it matter anymore?'], ['B', 'It matters to them.'] ] },
    { k: 'law', when: S => E.lawOn && E.lawOn(S, 'faith'), lines: [
      ['A', 'Do you actually believe? At service?'], ['B', 'I believe in sitting in a room with everyone once a week and nobody fighting.'], ['A', 'That\'s not God.'], ['B', 'Down here it\'s close enough.'] ] },
    // ---- children and dogs
    { k: 'kids', when: S => E.kids && E.kids(S).length > 0, lines: [
      ['A', 'The kid asked me what the sun looks like.'], ['B', 'What did you say?'], ['A', 'I said it\'s like the generator light, but warm, and nobody has to pay fuel for it.'], ['B', 'That\'s beautiful, {A}.'], ['A', 'She asked if we could build one.'] ] },
    { k: 'kids', when: S => E.kids && E.kids(S).length > 0, lines: [
      ['A', 'Do you think it\'s wrong? Having children down here?'], ['B', 'I think it\'s the only thing we\'ve done that isn\'t about surviving.'], ['A', 'They\'ll grow up in a hole in the ground.'], ['B', 'They\'ll grow up. That\'s more than most people get now.'] ] },
    { k: 'dogs', when: S => E.dogs && E.dogs(S).some(d => d.alive), lines: [
      ['A', 'The dog sleeps on my feet now. Every night.'], ['B', 'She picked you.'], ['A', 'She picked my feet. They\'re warm.'], ['B', 'That\'s how it starts. Next thing you\'re saving her the good scraps.'], ['A', '...I already do.'] ] },
    // ---- runs and the road
    { k: 'run', when: (S, a, b) => a.level >= 3, lines: [
      ['A', 'Out there today I saw a house with all its curtains open and the table set. Four plates.'], ['B', 'Anyone home?'], ['A', 'The food on the plates was fresh, {B}. Somebody set it this morning.'], ['B', 'Did you eat it?'], ['A', 'No. God, no. I backed out of there so slow.'] ] },
    { k: 'run', when: (S, a, b) => a.level >= 3, lines: [
      ['A', 'You froze out there.'], ['B', 'I know.'], ['A', 'If I hadn\'t been there—'], ['B', 'I know, {A}. I know. You don\'t have to say the rest. I\'ve been saying it to myself all night.'] ] },
    // ---- personality-driven
    { k: 'planner', when: (S, a, b) => E.typeOf(a)[3] === 'J' && E.psy(a).c >= 7, lines: [
      ['A', 'I made a list of everything we\'d grab if we had to leave in ten minutes.'], ['B', 'Leave to where?'], ['A', 'That\'s list number two. It\'s shorter.'] ] },
    { k: 'worrier', when: (S, a, b) => E.psy(a).n >= 8, lines: [
      ['A', 'What if the filter clogs and nobody notices till morning?'], ['B', 'Then we fix it in the morning.'], ['A', 'What if it\'s already clogged?'], ['B', 'Go look. I\'ll come with you. And then we sleep.'] ] },
    { k: 'joker', when: (S, a, b) => E.psy(a).e >= 7 && E.psy(a).a >= 5, lines: [
      ['A', 'New rule: whoever stubs their toe on the ladder tonight has to do a dance.'], ['B', 'Nobody\'s dancing.'], ['A', 'Then don\'t stub your toe.'], ['B', '...I already stubbed it.'], ['A', 'Everybody! {B} is dancing!'] ] },
    { k: 'cold', when: (S, a, b) => E.psy(a).a <= 3, lines: [
      ['A', 'If you go out tomorrow, take the rifle off the one at 30. They won\'t need it.'], ['B', 'They\'re still alive.'], ['A', 'They\'re at 30. Be practical.'], ['B', 'You say that like it\'s a virtue.'] ] },
    { k: 'quirk', when: (S, a, b) => has(S, a, /letters to people who are dead/), lines: [
      ['A', 'Will you read this one? I can\'t tell if it\'s too much.'], ['B', 'Who\'s it to?'], ['A', 'My dad. He died before all of it. I\'m telling him about the dog.'], ['B', '...It\'s not too much. Tell him the dog\'s name.'] ] },
    { k: 'quirk', when: (S, a, b) => has(S, a, /teeth|tooth/), lines: [
      ['A', 'That\'s nine.'], ['B', 'Nine what?'], ['A', 'Teeth. From the ones I put down.'], ['B', 'Why do you keep them, {A}?'], ['A', 'So I know they were people once. Somebody should keep count.'] ] },
    { k: 'quirk', when: (S, a, b) => has(S, a, /prison/), lines: [
      ['A', 'You never ask what I did.'], ['B', 'You never ask what I did either.'], ['A', '...Fair.'], ['B', 'Everyone down here did something to get here, {A}. Yours just came with paperwork.'] ] },
    { k: 'quirk', when: (S, a, b) => has(S, a, /nurse/), lines: [
      ['A', 'You took her pulse without thinking about it.'], ['B', 'Habit.'], ['A', 'You were a nurse.'], ['B', 'I was a nurse for nineteen years and one very long night. Don\'t ask about the night.'] ] },
    { k: 'quirk', when: (S, a, b) => has(S, a, /afraid of the dark/), lines: [
      ['A', 'Can you leave the lamp on a bit longer?'], ['B', 'We\'re saving fuel.'], ['A', 'Five minutes. Until I fall asleep.'], ['B', 'I\'ll sit up and talk instead. That costs nothing.'] ] },
  ];
  E.DIALOGUE = C;
  const fill = (t, S, a, b) => t.replace(/\{A\}/g, a.name).replace(/\{B\}/g, b.name).replace(/\{food\}/g, foodDays(S)).replace(/\{day\}/g, S.day).replace(/\{dead\}/g, lastDead(S) || 'them').replace(/\{dog\}/g, lastDog(S) || 'the dog').replace(/\{admd\}/g, a.dmd);
  // pick a conversation that fits these two people right now; avoid repeats
  E.pickTalk = (S, a, b) => {
    S.saidTalk = S.saidTalk || [];
    const ok = C.map((c, i) => [c, i]).filter(([c, i]) => { try { return c.when(S, a, b) && !S.saidTalk.includes(i); } catch (e) { return false; } });
    const specific = ok.filter(([c]) => !['small', 'uncanny', 'quest'].includes(c.k)), pool = specific.length && Math.random() < .75 ? specific : ok;
    if (!pool.length) return null;
    const [c, i] = pool[Math.floor(Math.random() * pool.length)];
    S.saidTalk.push(i); if (S.saidTalk.length > 40) S.saidTalk.shift();
    return { k: c.k, lines: c.lines.map(([w, t]) => ({ who: w === 'A' ? a : b, t: fill(t, S, a, b) })) };
  };
})();
