// TOFU Shelter screens. All the rules live in engine.js.
(function () {
  const E = globalThis.ShelterEngine, D = globalThis.SHELTER_DATA, G = globalThis.GEN;
  E.classNameOf = E.classNameOf || (p => D.CLASSES[p.cls].name);
  const $ = id => document.getElementById(id), app = $('app'), over = $('over'), stage = $('stage');
  const KEY = 'tofu.shelter.v1', BEST = 'tofu.shelter.best';
  const OP = globalThis.ShelterOpts, O = OP.o, TW = globalThis.ShelterTwitch;
  OP.apply();
  let S = null, sel = null, roomSel = null, modal = null, drag = null, toastT = 0;
  const auto = { on: false, speed: 1, timer: 0, planned: -1, showing: null };
  try { auto.speed = [1, 2, 4, 8].includes(+localStorage.getItem('tofu.shelter.speed')) ? +localStorage.getItem('tofu.shelter.speed') : 1; } catch (e) { }
  const pOf = id => S.people.find(p => p.id === id);
  const UNLOCK = 'tofu.shelter.unlock';
  const unlocked = () => { try { return JSON.parse(localStorage.getItem(UNLOCK) || '{}'); } catch (e) { return {}; } };
  globalThis.ShelterAchToast = a => { toast(`Achievement: ${a.n}`); try { SA.sfx('sting'); } catch (e) { } };
  const save = () => { try { if (S && globalThis.ShelterAch) ShelterAch.check(S); } catch (e) { } try { if (S) { localStorage.setItem(KEY, JSON.stringify(S)); if (S.diff === 'hard' && S.day >= 365 && !unlocked().nightmare) { const u = unlocked(); u.nightmare = 1; localStorage.setItem(UNLOCK, JSON.stringify(u)); toast('Nightmare unlocked.'); } } } catch (e) { } };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const wipeSave = () => { try { localStorage.removeItem(KEY); } catch (e) { } };
  const best = () => { try { return JSON.parse(localStorage.getItem(BEST) || '{}'); } catch (e) { return {}; } };
  function fit() { const k = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `translate(${(innerWidth - 1600 * k) / 2}px,${(innerHeight - 900 * k) / 2}px) scale(${k})`; stage.dataset.k = k; }
  addEventListener('resize', fit); fit();
  function toast(t) { const el = $('toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => el.style.display = 'none', 1900); }
  const SA = globalThis.ShelterAudio, blip = () => SA.sfx('ui');
  let lastDead = 0, lastCard = null;
  const sndBtns = () => `<div class="snd"><button id="bmus" class="${SA.music ? 'on' : ''}">Music ${SA.music ? 'On' : 'Off'}</button><button id="bsfx" class="${SA.sound ? 'on' : ''}">Sound ${SA.sound ? 'On' : 'Off'}</button><button id="bopt" class="on">Options</button>${TW.connected() ? `<span class="twchip">Twitch ${TW.queue.length ? `&middot; ${TW.queue.length} waiting` : 'on'}</span>` : ''}</div>`;
  function bindSnd() { const b0 = $('bopt'); if (b0) b0.onclick = () => openOpts(); const m = $('bmus'), x = $('bsfx'); if (m) m.onclick = () => { SA.toggle('music'); m.textContent = `Music ${SA.music ? 'On' : 'Off'}`; m.classList.toggle('on', SA.music); }; if (x) x.onclick = () => { SA.toggle('sound'); x.textContent = `Sound ${SA.sound ? 'On' : 'Off'}`; x.classList.toggle('on', SA.sound); }; }
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kitSrc = (sp, pose) => (globalThis.GEN_IMG || {})[`${sp}_${pose}`] || `art/kit/${sp}_${pose}.webp`;
  const img = p => `${kitSrc(p.sprite, p.damned ? 'damned' : 'base')}`;
  // what a person is holding decides which painting of them we show
  const POSE = { melee: /Bowie|Combat Knife|Flaming Sword|Gladius|Katana|Kukri|Machete|Tomahawk|Throwing Axes/, blunt: /Bat|Crowbar|Morning Star|Nunchaku|Sledgehammer|Baton|War Hammer|Chainsaw|Halberd/, pistol: /Beretta|Colt|Desert Eagle|Glock|Makarov|SIG|Smith|Uzi/, bow: /Compound Bow|Recurve Bow/, rifle: /AK-47|Barrett|FN SCAR|MP5|Ithaca|Garand|M16|M249|M870|Remington|Springfield|Steyr|Crossbow|Harpoon/ };
  const poseOf = p => { if (p.damned) return 'damned'; const g = E.gear(S, p.weapon); if (!g) return 'base'; for (const k in POSE) if (POSE[k].test(g.n)) return k; return 'base'; };
  const kit = (p, pose) => { const set = (globalThis.GEN_KIT || {})[p.sprite] || {}, k = pose || poseOf(p), m = set[k] || set.base; return m ? { src: `${kitSrc(p.sprite, set[k] ? k : 'base')}`, m } : { src: img(p), m: { ar: .5, cx: .5, hip: .5, mx: .9, my: .4 } }; };
  const seedOf = p => (p.id * 7919) % 100 / 100;
  // TOFU rolls ten-sided dice, so a die is drawn as a d10: a kite-shaped face with the bevels around it
  const dieHtml = (v, cl) => `<div class="die ${cl}"><svg viewBox="0 0 100 100"><polygon class="o" points="50,4 96,46 84,78 50,96 16,78 4,46"/><polygon class="s" points="50,72 82,50 96,46 84,78 50,96"/><polygon class="f" points="50,4 82,50 50,72 18,50"/><path class="l" d="M82,50 96,46 M18,50 4,46 M50,72 50,96 M82,50 84,78 M18,50 16,78"/></svg><b>${v}</b></div>`;
  const phase = (T, seed = 0) => (-((Date.now() + seed * 7000) % (T * 1000)) / 1000).toFixed(2);
  // a large figure cut into strips that lag one another, so the body bends in a soft curve with the feet planted
  const strips = (src, h, ar, a, T, seed) => { const w = Math.round(h * ar), n = 9, sh = Math.ceil(h / n), base = +phase(T, seed); let o = ''; for (let i = 0; i < n; i++) { const y = i * sh, k = Math.pow(1 - (i + .5) / n, 1.6); o += `<i class="strip" style="top:${y}px;height:${Math.min(sh + 2, h - y)}px;background-image:url(${src});background-size:${w}px ${h}px;background-position:0 -${y}px;--a:${(a * k).toFixed(2)}px;animation-duration:${T.toFixed(2)}s;animation-delay:${(base - i * .075).toFixed(2)}s"></i>`; } return o; };
  const fig = (p, h, dir = 1, walking = false, pose) => { const { src, m } = kit(p, pose), s0 = seedOf(p), sw = 4.4 + s0 * 2, br = 2.5 + s0 * .9; return `<div class="fig ${walking ? 'walk' : ''}" style="--h:${h}px;--ar:${m.ar};--cx:${m.cx};--hip:${m.hip};--ds:${phase(sw, s0)}s;--db:${phase(br, s0)}s;--sw:${sw.toFixed(2)}s;--br:${br.toFixed(2)}s;width:${Math.round(h * .46)}px;height:${h}px"><div class="in ${dir < 0 ? 'flip' : ''}"><img class="bd" src="${src}"><img class="lg a" src="${src}"><img class="lg b" src="${src}"></div></div>`; };
  const wander = {};
  const stillPref = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  setInterval(() => { // people shift about their rooms instead of standing like statues
    if (!S || S.quest || modal || drag || stillPref || O.motion !== 'full') return;
    const els = [...document.querySelectorAll('.res[data-p]')].filter(e => !e.classList.contains('step') && +e.dataset.p !== sel); if (!els.length) return;
    for (let n = els.length > 10 ? 2 : 1; n > 0; n--) {
      const e = els[Math.floor(Math.random() * els.length)], id = +e.dataset.p, p = pOf(id), f = e.querySelector('.fig'), inn = f && f.querySelector('.in'); if (!p || !f || p.sealed || e.classList.contains('step')) continue;
      const w = wander[id] || (wander[id] = { dx: 0, dir: inn.classList.contains('flip') ? -1 : 1 });
      if (Math.random() < .35) { w.dir = -w.dir; inn.classList.toggle('flip', w.dir < 0); continue; }
      const nx = Math.random() < .3 ? 0 : (Math.random() < .5 ? -1 : 1) * (16 + Math.random() * 36); if (Math.abs(nx - w.dx) < 10) continue;
      w.dir = nx > w.dx ? 1 : -1; w.dx = nx; inn.classList.toggle('flip', w.dir < 0); e.style.setProperty('--dx', nx + 'px'); e.classList.add('step'); f.classList.add('walk');
      setTimeout(() => { e.classList.remove('step'); f.classList.remove('walk'); }, 880);
    }
  }, 800);
  const nf = n => (Math.round(n * 10) / 10).toLocaleString('en-US');
  const bar = (v, cls) => `<div class="bar ${cls}"><u style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(0)}%"></u></div>`;
  const dcol = d => (d >= 32 ? '#e24a3b' : d >= 20 ? '#d98a2b' : '#8a6fd1');
  const SH = p => (p.he === 'he' ? 'He' : 'She'), hm = p => (p.he === 'he' ? 'him' : 'her');
  let rainSvg = (() => { let o = ''; for (let i = 0; i < 230; i++) { const x = Math.floor(Math.random() * 1270), y = Math.floor(Math.random() * 180) - 34; o += `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + 16 + Math.floor(Math.random() * 18)}"/>`; } return `<svg viewBox="0 0 1260 143">${o}</svg>`; })();

  // ---------- title and end
  // the title screen's black rain: fast streaks in depth, oily trickles running down the glass, splashes along the ground
  function startBlackRain(host) {
    if (!host || O.motion === 'off') return;
    const W = 1600, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'brain'; host.appendChild(c);
    const g = c.getContext('2d'), R = (a, b) => a + Math.random() * (b - a), wind = .2;
    const newDrop = top => { const z = R(.35, 1); return { x: R(-200, W + 100), y: top ? R(-140, -20) : R(-100, H), z, v: R(1100, 1900) * z, l: R(28, 74) * z }; };
    const drops = Array.from({ length: 300 }, () => newDrop(false)), splats = [];
    const newOil = () => ({ x: R(0, W), y: R(-260, -30), w: R(2.5, 7), v: R(26, 95), pts: [], ph: R(0, 6), life: 1 });
    const oils = Array.from({ length: 16 }, newOil);
    let last = performance.now();
    (function frame(now) {
      if (!c.isConnected) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(2,3,6,.12)'; g.fillRect(0, 0, W, H);
      g.lineCap = 'round';
      for (const o of oils) { // thick black runs down the glass
        o.y += o.v * dt; o.ph += dt * 1.4; o.x += Math.sin(o.ph) * .35;
        o.pts.push([o.x, o.y]); if (o.pts.length > 110) o.pts.shift();
        for (let i = 1; i < o.pts.length; i++) { const a = o.pts[i - 1], b = o.pts[i], k = i / o.pts.length; g.strokeStyle = `rgba(3,3,6,${(.82 * k).toFixed(3)})`; g.lineWidth = o.w * (.45 + k * .55); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        g.fillStyle = 'rgba(2,2,5,.92)'; g.beginPath(); g.ellipse(o.x, o.y, o.w * .8, o.w * 1.25, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(190,205,215,.3)'; g.beginPath(); g.arc(o.x - o.w * .28, o.y - o.w * .4, o.w * .2, 0, 7); g.fill();
        if (o.y > H + 80) Object.assign(o, newOil(), { pts: [] });
      }
      for (const d of drops) {
        d.y += d.v * dt; d.x += d.v * wind * dt;
        const x2 = d.x - d.l * wind, y2 = d.y - d.l;
        g.strokeStyle = `rgba(3,3,7,${(.5 + d.z * .42).toFixed(2)})`; g.lineWidth = .9 + d.z * 2.1; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(x2, y2); g.stroke();
        g.strokeStyle = `rgba(170,185,200,${(.05 + d.z * .13).toFixed(2)})`; g.lineWidth = .7; g.beginPath(); g.moveTo(d.x + 1.5, d.y); g.lineTo(x2 + 1.5, y2); g.stroke();
        if (d.y > H - R(0, 70) * (1 - d.z)) { if (d.z > .55 && splats.length < 90) splats.push({ x: d.x, y: d.y, t: 0 }); Object.assign(d, newDrop(true)); }
      }
      for (let i = splats.length - 1; i >= 0; i--) { const s = splats[i]; s.t += dt * 4.5; if (s.t >= 1) { splats.splice(i, 1); continue; } g.strokeStyle = `rgba(3,3,7,${(.75 * (1 - s.t)).toFixed(2)})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(s.x, s.y, 3 + s.t * 15, 1 + s.t * 4, 0, 0, 7); g.stroke(); }
      requestAnimationFrame(frame);
    })(last);
  }
  function title() {
    clearWalk(); SA.setScene('title'); SA.setRain(9);
    auto.on = false; clearTimeout(auto.timer);
    S = null; over.innerHTML = '';
    const sv = load(), b = best();
    app.innerHTML = `<div class="full" style="background-image:linear-gradient(#0000 60%,#000a),url(art/ui/title.webp)"><h1 class="vh">TOFU: Earth Apocalypse Survival Shelter</h1>
      ${b.score ? `<div class="bigs" style="font-size:18px;color:#f1e7cf">Best run: ${nf(b.score)} points, ${b.day} days</div>` : ''}
      <div class="menu"><button id="newg">New Shelter</button>${sv && !sv.over ? '<button id="cont">Continue</button>' : ''}<button class="alt" id="how">How to Play</button>${E.DEMO.on && E.DEMO.locked ? '<button class="alt" id="unl">Unlock Full Game</button>' : ''}<button class="alt" id="achs">Achievements</button><button class="alt" id="crd">Credits</button>${globalThis.tofuDesktop ? '<button class="alt" id="quit">Quit</button>' : ''}<button class="alt" id="ends">Endings ${(() => { try { return Object.keys(JSON.parse(localStorage.getItem('tofu.shelter.endings') || '{}')).length; } catch (e) { return 0; } })()} / ${Object.keys(E.END).length}</button></div><div class="sndt">${sndBtns()}</div>${E.DEMO && E.DEMO.on ? `<div class="sndh" style="bottom:auto;top:12px;left:16px;transform:none;color:#e8a33c">DEMO: plays to Day ${E.DEMO.day}</div>` : ''}${!globalThis.tofuDesktop || (E.DEMO && E.DEMO.on) ? `<a class="kofi" href="https://ko-fi.com/cosmerecrawler" target="_blank" rel="noopener">Support on Ko-fi</a>` : ''}<div class="sndh">Click anywhere to turn on sound</div></div>`;
    startBlackRain(app.querySelector('.full'));
    bindSnd();
    if ($('ends')) $('ends').onclick = endingsModal;
    $('achs').onclick = achModal;
    if ($('unl')) $('unl').onclick = () => { over.innerHTML = `<div class="modal"><div class="box"><h2>Unlock the full game</h2>${unlockBox('The demo ends after the Long Night on Day 61. The full game goes on to the 11th Hour, with 14 endings.')}<div style="margin-top:12px"><button class="btn w100" id="ucl">Close</button></div></div></div>`; $('ucl').onclick = () => { over.innerHTML = ''; }; bindUnlock(() => { over.innerHTML = ''; title(); }); };
    $('crd').onclick = () => ShelterCredits.play($('stage'), title);
    if ($('quit')) $('quit').onclick = () => globalThis.tofuDesktop.quit();
    const start = d => { S = E.newGame(d); S.tutorial = d === 'easy' || d === 'normal' ? 1 : 0; sel = roomSel = null; save(); render(); };
    $('newg').onclick = () => {
      const u = unlocked(), m = app.querySelector('.menu');
      m.outerHTML = `<div class="diffs">${Object.entries(E.DIFF).map(([k, d]) => { const lock = k === 'nightmare' && !u.nightmare; return `<button data-d="${k}" class="${k}${lock ? ' lock' : ''}" ${lock ? 'disabled' : ''}><b>${d.n}</b><small>${lock ? 'Survive to Day 365 on Hard to unlock.' : d.x}</small></button>`; }).join('')}<button data-d="back" class="back"><b>Back</b></button></div>`;
      app.querySelectorAll('.diffs button').forEach(b => b.onclick = () => b.dataset.d === 'back' ? title() : start(b.dataset.d));
    };
    if ($('cont')) $('cont').onclick = () => { S = sv; sel = roomSel = null; if (S.quest) qShown = S.quest.log.length; render(); };
    $('how').onclick = () => { modal = { k: 'help' }; drawOver(); };
  }
  // buy-a-code unlock box (demo builds only)
  function unlockBox(lead) {
    const D0 = E.DEMO;
    return `<div class="unlock"><p>${esc(lead)}</p><div class="urow"><a class="btn" href="${esc(D0.shop)}" target="_blank" rel="noopener">Buy on Ko-fi (${esc(D0.price)})</a><input id="ucode" placeholder="Unlock code" maxlength="24" autocomplete="off" spellcheck="false"><button id="ugo">Unlock</button></div><small id="umsg">Your code arrives with your Ko-fi purchase.</small></div>`;
  }
  function bindUnlock(done) {
    const go = () => { const c = $('ucode').value; if (E.DEMO.redeem(c)) { toast('Unlocked. Thank you.'); done(); } else { $('umsg').textContent = 'That code did not work. Check it and try again.'; } };
    $('ugo').onclick = go; $('ucode').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  function demoScreen() {
    SA.setScene('dead'); auto.on = false; clearTimeout(auto.timer); save(); over.innerHTML = '';
    const D0 = E.DEMO, n = E.humans(S).length;
    app.innerHTML = `<div class="full demoend" style="background-image:linear-gradient(#000d,#000f),url(art/ui/title.webp)">
      <div class="big" style="font-size:64px">End of the Demo</div>
      <div class="endtx">Your shelter made it through the Long Night. ${n} ${n === 1 ? 'person is' : 'people are'} waiting to hear what Q.U.E.S.T. has to say about the rain.<br><br>The full game goes on to the 11th Hour: ${E.STRIKE_DAY - S.day} more days, deep rooms that can't save everyone, children growing up underground, a rival shelter, the truth about the rain, and ${Object.keys(E.END).length} endings, none of them kind.</div>
      <div class="bigs">Day ${S.day}. Survival score ${nf(S.score)}.</div>
      ${unlockBox('Unlock the full game and keep playing this shelter from Day ' + S.day + '.')}
      <div class="menu" style="margin-bottom:40px"><button id="again">Start Over</button><button class="alt" id="crd2">Credits</button><button class="alt" id="bk">Title</button></div></div>`;
    startBlackRain(app.querySelector('.full'));
    bindUnlock(() => { S.demoOver = false; S.demo = 'done'; save(); render(); });
    $('again').onclick = () => { const d = S.diff || 'normal'; S = E.newGame(d); sel = roomSel = null; save(); render(); };
    $('bk').onclick = title;
    $('crd2').onclick = () => ShelterCredits.play($('stage'), () => {});
  }
  function gameOver() {
    SA.setScene('dead');
    auto.on = false; clearTimeout(auto.timer);
    wipeSave();
    if (S.ending) { try { const got = JSON.parse(localStorage.getItem('tofu.shelter.endings') || '{}'); if (!got[S.ending.k]) got[S.ending.k] = { day: S.day, score: S.score }; localStorage.setItem('tofu.shelter.endings', JSON.stringify(got)); } catch (e) { } }
    const b = best(); if (!b.score || S.score > b.score) { try { localStorage.setItem(BEST, JSON.stringify({ score: S.score, day: S.day })); } catch (e) { } }
    const st = S.stat, cards = S.memorial.slice().reverse().map(m => `<div class="mcard">${m.dog ? `<svg viewBox="0 0 24 24" style="height:96px;width:96px;fill:#c9b48c"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.5" cy="10" rx="2.2" ry="2.8"/><ellipse cx="9.5" cy="6" rx="2.2" ry="2.9"/><ellipse cx="14.5" cy="6" rx="2.2" ry="2.9"/><ellipse cx="18.5" cy="10" rx="2.2" ry="2.8"/></svg>` : `<img src="${kitSrc(m.sprite, m.damned ? 'damned' : 'base')}">`}<b>${esc(m.name)}</b>${esc(m.cls)}<br>Day ${m.day}<br><span class="ft">${esc(m.why)}</span>${m.ep ? `<i class="ep">${esc(m.ep)}</i>` : ''}</div>`).join('');
    over.innerHTML = '';
    app.innerHTML = `<div class="full" style="background-image:linear-gradient(#000a,#000d),url(art/ui/memorial.webp);padding-top:30px">${S.ending ? `<div class="big end-${S.ending.s}" style="font-size:66px">${esc(S.ending.t)}</div><div class="endtx">${esc(S.ending.x)}</div><div class="bigs">An ending, on Day ${S.day}. Survival score ${nf(S.score)}.</div>` : `<div class="big" style="font-size:66px">Nobody is left</div><div class="bigs">Day ${S.day}. Survival score ${nf(S.score)}.</div>`}
      <div class="ft" style="margin:8px;color:#ece3cc;font-size:16px">Rescued ${st.rescued} &middot; Runs ${st.runs} &middot; Foes beaten ${st.foes} &middot; Waits survived ${st.survivedWait} &middot; Turned ${st.turned} &middot; Went with Q.U.E.S.T. ${st.quest} &middot; Strikes survived ${st.strikes || 0}</div>
      <div class="memo" style="width:1200px">${cards}</div><div class="menu" style="margin-bottom:22px"><button id="again">Try Again</button><button class="alt" id="crd2">Credits</button><button class="alt" id="bk">Title</button></div></div>`;
    $('again').onclick = () => { const d = S.diff || 'normal'; S = E.newGame(d); sel = roomSel = null; save(); render(); };
    $('bk').onclick = title; if ($('crd2')) $('crd2').onclick = () => ShelterCredits.play($('stage'), () => {});
  }

  // ---------- main render
  function render() {
    if (!S) return;
    if (S.demoOver && !S.queue.length) return demoScreen();
    { const rows = [...new Set(S.slots.map(s => s.row))]; rows.forEach(row => { for (let c = 0; c < E.COLS; c++) if (!S.slots.some(s => s.row === row && s.col === c)) S.slots.push({ row, col: c }); }); }
    E.relayout(S);
    SA.setRain(D.WEATHER[S.weather].dr);
    SA.setScene(S.quest || (S.raidNow && !S.queue.length) ? 'fight' : 'shelter');
    if (S.memorial.length > lastDead) { SA.sfx('death'); } lastDead = S.memorial.length;
    if (!S.quest && S.raidNow && !S.queue.length && !modal) { E.Q.startRaid(S); qShown = 0; qActive = null; qMode = 'attack'; save(); SA.sfx('alarm'); }
    if (S.quest) { clearWalk(); return renderQuest(); }
    if (S.over && !S.queue.length) { clearWalk(); return gameOver(); }
    const scroll = $('base') ? $('base').scrollTop : 0;
    const need = E.needs(S), fc = E.forecast(S), w = D.WEATHER[S.weather], blackout = E.blackout(S);
    const caps = E.storeCaps(S), stat = (k, v, sub, low) => `<div class="st ${low ? 'low' : ''}"><img src="art/ui/i_${k}.webp"><div><span>${D.RES_NAME[k]}${v >= caps[k] ? ' (full)' : ''}</span><b>${nf(v)}</b>${sub || ''}</div></div>`;
    const delta = (k, n) => { const v = (fc[k] || 0) - n; return `<small class="${v >= 0 ? 'pl' : 'mi'}">${v >= 0 ? '+' : ''}${nf(v)}/day</small>`; };
    const burn = E.fuelBurn(S);
    const hud = `<div id="hud"><div class="logo">TOFU<small>Earth Apocalypse</small></div><div class="day" title="${E.dif(S).n}"><span>Day</span><b>${S.day}</b><em class="dtag ${S.diff || 'normal'}">${E.dif(S).n}</em></div>
      ${stat('food', S.res.food, delta('food', need.food), S.res.food < need.food * 2)}${stat('water', S.res.water, delta('water', need.water), S.res.water < need.water * 2)}${stat('fuel', S.res.fuel, burn ? `<small class="mi">-${burn}/day</small>` : '', S.res.fuel < burn * 3)}${stat('meds', S.res.meds)}${stat('scrap', S.res.scrap, fc.scrap ? `<small class="pl">+${nf(fc.scrap)}</small>` : '')}${stat('rounds', S.res.rounds)}
      ${sndBtns()}<div class="sc"><span>Survival score</span><b>${nf(S.score)}</b></div><div class="hr"><span>The 11th Hour</span>${S.day < E.STRIKE_DAY ? `<b>${nf(E.STRIKE_DAY - S.day)}</b><small>days away</small>` : `<b>${nf(S.stat.strikes || 0)}</b><small>strikes</small>`}</div></div>`;
    const surf = `<div id="surf" class="${w.dr ? '' : 'dry'}">${w.dr ? rainSvg : ''}<div class="hatch">HATCH</div><div class="wx"><b>${w.n}</b>${w.t}</div>${S.threat && S.threat.known ? `<div class="wx th"><b>Tonight</b>${E.threatText(S.threat)} Put fighters on the Gate.</div>` : ''}${blackout ? `<div class="wx bo"><b>Blackout</b>Not enough power or fuel. Powered rooms make half.</div>` : ''}</div>`;
    app.innerHTML = hud + surf + baseHtml() + botHtml(need) + sideHtml();
    $('base').scrollTop = scroll;
    bindMain();
    drawOver();
  }
  // short things people say over their heads each morning
  const bub = { day: -1, until: 0, map: {}, timer: 0 };
  const TALK = { grow: ['These beans might make it.', 'Come on, grow.'], filter: ['Cleanest rain you ever drank.', 'Filter is holding.'], generator: ["She's running rough.", 'Keep it turning.'], gate: ['Quiet out there.', 'I heard something.'], radio: ['Just static.', 'Is anyone out there?'], clinic: ['Hold still.', 'This will sting.'], workshop: ['Hand me that.', 'I can fix this.'], bench: ['Every round counts.'], common: ['Sit down a minute.'], trade: ['What have you got?'], training: ['Again.'] };
  function sayLine(p) {
    if (p.damned) return E.pick(["Don't look at me like that.", 'I can still think.', 'How long do I have?']);
    if (p.wait) return E.pick(['Am I okay?', 'Tell me I look okay.', "I don't feel right."]);
    if (p.thirst) return "I'm so thirsty.";
    if (p.hunger) return 'When do we eat?';
    if (p.fears && E.hasDamned(S)) return 'Why is that thing still here?';
    if (p.hp < E.maxHp(p) / 2) return 'It hurts.';
    if (p.exh >= 4) return 'I need to lie down.';
    if (p.stress >= 8) return "I can't take much more.";
    if (p.dmd >= 26) return 'How many is that now?';
    const dead = S.memorial.filter(m => !m.dog && S.day - m.day <= 3).slice(-1)[0];
    if (dead && Math.random() < .5) return E.pick([`I keep thinking about ${dead.name.split(' ')[0]}.`, `${dead.name.split(' ')[0]}'s bunk is still made.`, `Who's taking ${dead.name.split(' ')[0]}'s watch?`]);
    return null;
  }
  function bubbles() {
    if (!O.bubbles) return {};
    if (bub.day !== S.day) {
      bub.day = S.day; bub.map = {};
      const people = E.home(S).filter(p => !p.sealed || p.wait);
      S.log.forEach(l => { const p = people.find(x => l.t.startsWith(x.name)); if (p && !bub.map[p.id]) bub.map[p.id] = l.t.replace(p.name + ': ', '').replace(/^"|"$/g, '').replace(/^./, c => c.toUpperCase()); });
      const said = new Set(Object.values(bub.map));
      const urgent = people.filter(p => p.damned || p.wait || p.thirst || p.hunger || p.hp < E.maxHp(p) / 2 || p.stress >= 8), rest = people.filter(p => !urgent.includes(p)).sort(() => Math.random() - .5);
      [...urgent, ...rest].forEach(p => { if (Object.keys(bub.map).length < 2 && !bub.map[p.id]) { const t = sayLine(p); if (t && !said.has(t)) { said.add(t); bub.map[p.id] = t; } } });
      const ms = auto.on ? 6000 / auto.speed : 9000;
      bub.until = Date.now() + ms;
      clearTimeout(bub.timer); bub.timer = setTimeout(() => { if (S && !S.quest && !modal && !drag) render(); }, ms + 50);
    }
    return Date.now() < bub.until ? bub.map : {};
  }
  // ---------- walking: people follow doors along a level and the ladder between levels
  const CELL = (1176 - 7 * (E.COLS - 1)) / E.COLS, SHAFT = 39, FEET = r => r * 175 + 157;
  const roomLeft = r => 76 + r.col * (CELL + 7);
  const roomWide = r => CELL * E.W(r) + 7 * (E.W(r) - 1);
  const walk = { list: [], ids: new Set(), timer: 0, last: 0 };
  function crowdOf(r) { return r.type === 'quarantine' ? E.sealed(S) : r.type === 'bunks' ? E.home(S).filter(p => !p.room && !p.sealed) : E.workers(S, r); }
  function spot(p) { // where a person is standing now
    if (p.away) return { x: SHAFT, row: -1, key: 'hatch' };
    const r = p.sealed ? S.rooms.find(x => x.type === 'quarantine') : p.room ? E.roomOf(S, p.room) : S.rooms.find(x => x.type === 'bunks');
    if (!r) return { x: SHAFT, row: -1, key: 'hatch' };
    const c = crowdOf(r), i = Math.max(0, c.indexOf(p));
    return { x: roomLeft(r) + roomWide(r) * (p.sealed ? .66 : (i + 1) / (c.length + 1)), row: r.row, key: 'r' + r.id };
  }
  const yOf = row => (row < 0 ? -22 : FEET(row));
  function startWalk(p, from, to) {
    if (from.key === to.key || (auto.on && auto.speed >= 4) || O.motion === 'off') return;
    const pts = [[from.x, yOf(from.row)]];
    if (from.row !== to.row) { pts.push([SHAFT, yOf(from.row)]); pts.push([SHAFT, yOf(to.row)]); }
    pts.push([to.x, yOf(to.row)]);
    for (let i = pts.length - 1; i > 0; i--) if (pts[i][0] === pts[i - 1][0] && pts[i][1] === pts[i - 1][1]) pts.splice(i, 1);
    if (pts.length < 2) return;
    const el = document.createElement('div'); el.className = 'wk';
    el.innerHTML = `${fig(p, 124, 1, true)}<div class="tag"><b>${esc(p.name)}</b></div>`;
    $('walk').appendChild(el);
    walk.ids.add(p.id);
    walk.list.push({ id: p.id, el, pts, seg: 0, t: 0 });
    place0(walk.list[walk.list.length - 1]);
    if (!walk.timer) { walk.last = performance.now(); walk.timer = requestAnimationFrame(walkTick); }
  }
  function place0(w) {
    const a = w.pts[w.seg], b = w.pts[Math.min(w.seg + 1, w.pts.length - 1)], x = a[0] + (b[0] - a[0]) * w.t, y = a[1] + (b[1] - a[1]) * w.t;
    const sc = $('base') ? $('base').scrollTop : 0, inn = w.el.querySelector('.in');
    w.el.style.transform = `translate3d(${x.toFixed(1)}px,${(y + 143 - sc).toFixed(1)}px,0) translate(-50%,-100%)`;
    if (b[0] !== a[0]) inn.classList.toggle('flip', b[0] < a[0]);
    w.el.classList.toggle('climb', a[0] === b[0]);
  }
  function walkTick() {
    const now = performance.now(), dt = Math.min(.05, (now - walk.last) / 1000); walk.last = now;
    const speed = auto.on ? auto.speed : 1;
    for (const w of walk.list.slice()) {
      const a = w.pts[w.seg], b = w.pts[w.seg + 1];
      const len = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1])), fromStart = w.seg === 0 ? w.t * len : 999, toEnd = w.seg === w.pts.length - 2 ? (1 - w.t) * len : 999, ease = Math.min(1, .35 + Math.min(fromStart, toEnd) / 70), v = (a[0] === b[0] ? 170 : 300) * speed * ease;
      w.t += v * dt / len;
      while (w.t >= 1 && w.seg < w.pts.length - 2) { const left = (w.t - 1) * Math.hypot(w.pts[w.seg + 1][0] - w.pts[w.seg][0], w.pts[w.seg + 1][1] - w.pts[w.seg][1]); w.seg++; w.t = left / Math.max(1, Math.hypot(w.pts[w.seg + 1][0] - w.pts[w.seg][0], w.pts[w.seg + 1][1] - w.pts[w.seg][1])); }
      if (w.t >= 1) { w.el.remove(); walk.list.splice(walk.list.indexOf(w), 1); walk.ids.delete(w.id); if (!S.quest && !modal && !drag) render(); continue; }
      place0(w);
    }
    document.querySelectorAll('.door').forEach(d => { const dx = parseFloat(d.style.left) + 97, fy = parseFloat(d.style.top) + 104; d.classList.toggle('open', walk.list.some(w => { const a = w.pts[w.seg], b = w.pts[w.seg + 1], x = a[0] + (b[0] - a[0]) * w.t, y = a[1] + (b[1] - a[1]) * w.t; return Math.abs(y - fy) < 8 && Math.abs(x - dx) < 46; })); });
    if (walk.list.length) walk.timer = requestAnimationFrame(walkTick); else walk.timer = 0;
  }
  function moved(p, fn) { const a = spot(p), ok = fn(); if (ok !== false) startWalk(p, a, spot(p)); return ok; }
  function clearWalk() { walk.list.forEach(w => w.el.remove()); walk.list = []; walk.ids.clear(); cancelAnimationFrame(walk.timer); walk.timer = 0; }
  document.addEventListener('visibilitychange', () => { if (document.hidden && S && walk.list.length) { clearWalk(); if (!S.quest && !modal && !drag) render(); } });

  function baseHtml() {
    const talk = bubbles(), bubs = [];
    const rows = Math.max(...S.slots.map(s => s.row)) + 1, cells = [];
    const idle = E.home(S).filter(p => !p.room && !p.sealed);
    for (const s of S.slots.slice().sort((a, b) => a.row - b.row || a.col - b.col)) {
      const r = E.roomAt(S, s.row, s.col);
      if (r && r.col !== s.col) continue;
      if (!r && !E.reachable(S, s.row, s.col)) { cells.push(`<section class="room empty locked" data-lock="1" style="background-image:url(art/rooms/dirt.webp);grid-row:${s.row + 1};grid-column:${s.col + 1}"><div class="plus">No way in yet<small>Build the room next to it first</small></div></section>`); continue; }
      if (!r) { cells.push(`<section class="room empty" data-slot="${s.row},${s.col}" style="background-image:url(art/rooms/dirt.webp);grid-row:${s.row + 1};grid-column:${s.col + 1}"><div class="plus">+ Build</div></section>`); continue; }
      const d = D.ROOMS[r.type], ws = r.type === 'quarantine' ? E.sealed(S) : E.workers(S, r), bo = E.blackout(S);
      let chip = '';
      if (d.res) chip = `<em><img src="art/ui/i_${d.res}.webp">+${nf(E.outputOf(S, r, bo))}</em>`;
      if (r.type === 'bunks') chip = `<em>${E.living(S).filter(p => !p.damned).length} / ${E.bedsOf(S)} beds</em>`;
      if (r.type === 'generator') chip = `<em><img src="art/ui/i_fuel.webp">-${E.fuelBurn(S)}</em>`;
      if (r.type === 'quarantine') chip = `<em class="${E.sealed(S).length ? 'g' : ''}">${E.sealed(S).length} / ${E.cells(S)} cells</em>`;
      if (r.type === 'kennel') chip = `<em>${E.dogs(S).filter(d => d.alive).length} dogs</em>`;
      if (r.type === 'nursery') chip = `<em>${E.kids(S).filter(k => E.kidStage(S, k) === 'baby').length} babies</em>`;
      if (r.type === 'school') chip = `<em>${E.kids(S).filter(k => E.kidStage(S, k) === 'child').length} children</em>`;
      if (r.defs && r.defs.length) chip = `<em class="df" title="${esc(r.defs.map(k => E.DEFS[k].n).join(', '))}">+${r.defs.length} def</em>` + chip;
      if (r.lay && r.lay.bad.length) chip = `<em class="r" title="${esc(r.lay.bad.join('. '))}">-${r.lay.bad.length}</em>` + chip;
      if (r.lay && r.lay.good.length) chip = `<em class="g" title="${esc(r.lay.good.join('. '))}">+${r.lay.good.length}</em>` + chip;
      if (E.fearMult(S, r) < 1) chip = '<em class="r">Slowed</em>' + chip;
      const crowd = (r.type === 'bunks' ? idle : ws);
      const inc = (S.incidents || []).find(x => x.room === r.id), tap = d.skill && !r.broken && !r.pushed && ws.length ? `<button class="ptap" data-push="${r.id}" title="Roll ${E.skillName(d.skill)} for a bonus">Push</button>` : '';
      const res = crowd.map((p, i) => {
        const x = p.sealed ? 66 + i * 12 : (i + 1) / (crowd.length + 1) * 100, flag = p.ill || p.wait || p.stress >= 8 || p.hp < E.maxHp(p) / 2 || p.exh >= 4;
        const h = p.sealed ? 108 : 124;
        if (talk[p.id] && !walk.ids.has(p.id)) { bubs.push(`<div class="say" style="left:${Math.max(95, Math.min(1081, s.col * (CELL + 7) + roomWide(r) * x / 100))}px;top:${s.row * 175 + 7 + (168 - 18 - h) + 6}px">${esc(talk[p.id])}</div>`); }
        if (walk.ids.has(p.id)) return '';
        const wd = wander[p.id] || {}, face = wd.dir || (x > 55 ? -1 : 1);
        return `<div class="res ${sel === p.id ? 'sel' : ''}" data-p="${p.id}" style="left:${x}%;--dx:${(wd.dx || 0).toFixed(0)}px">${fig(p, h, face)}${flag ? `<span class="flag">!</span>` : ''}<div class="tag"><b>${esc(p.name)}</b><i><u style="width:${p.dmd / 32 * 100}%;background:${dcol(p.dmd)}"></u></i></div></div>`;
      }).join('');
      const mold = r.mold ? Array.from({ length: r.mold }, (_, i) => `<img class="mold" src="art/ui/mold.webp" style="left:${[8, 56, 30, 70][i]}%;top:${[6, 8, 40, 45][i]}%;width:${90 + i * 16}px;opacity:.9">`).join('') : '';
      const cl = `${r.broken ? 'broken' : ''} ${r.type === 'quarantine' && E.sealed(S).length ? 'qu' : ''} ${E.fearMult(S, r) < 1 ? 'dis' : ''} ${roomSel === r.id ? 'sel' : ''} ${(r.type === 'bunks' ? idle : ws).length > E.W(r) * 2 + 1 ? 'crowd' : ''}`;
      cells.push(`<section class="room ${cl}" data-room="${r.id}" style="background-image:url(art/rooms/${d.art}.webp);grid-row:${s.row + 1};grid-column:${s.col + 1} / span ${E.W(r)}"><header><span>${d.name}<small>T${r.tier}</small></span>${chip ? `<div style="display:flex;gap:4px">${chip}</div>` : ''}</header>${mold}${res}${tap}${inc ? `<button class="inc" data-inc="${inc.id}">${E.INCIDENTS[inc.type].n}<small>Click to handle it</small></button>` : ''}</section>`);
    }
    const h = rows * 175 + 90;
    return `<div id="base"><div id="shaft" style="height:${h}px"></div><div id="rooms">${cells.join('')}<button id="dig" style="grid-row:${rows + 1}">Dig a new level (${E.digCost(S)} scrap)</button>${doorsHtml(rows)}${bubs.join('')}</div></div>`;
  }
  function doorsHtml(rows) {
    const out = [], at = (x, row) => `<img class="door" src="art/ui/door.webp" style="left:${x - 76 - 21}px;top:${FEET(row) - 104}px">`;
    for (let row = 0; row < rows; row++) {
      out.push(`<div class="land" style="top:${FEET(row) - 3}px"></div>`);
      if (E.roomAt(S, row, 0)) out.push(at(71, row));
      for (let c = 0; c < E.COLS - 1; c++) { const a = E.roomAt(S, row, c), b = E.roomAt(S, row, c + 1); if (!a || !b || a === b) continue; if (a.type === b.type && a.link) out.push(`<div class="lgap" style="left:${(c + 1) * (CELL + 7) - 15}px;top:${row * 175 + 11}px"><span>Linked</span></div>`); else out.push(at(76 + (c + 1) * (CELL + 7) - 3.5, row)); }
    }
    return out.join('');
  }
  function botHtml(need) {
    const r = S.runs[0];
    let run = `<div class="card ex" id="runs"><h4>Runs</h4><b>Nobody is out</b><p>Click to send a team looting.</p><div class="row"><span>${S.sites.filter(s => s.visits < 3).length} places known</span></div></div>`;
    if (r) { const s = S.sites.find(x => x.id === r.site), t = r.team.map(i => pOf(i)).filter(p => p && p.alive).map(p => p.name).join(' and '); run = `<div class="card ex" id="runs"><h4>Out on a run${S.runs.length > 1 ? 's' : ''}</h4><b>${esc(s.name)}, ${s.miles} mile${s.miles > 1 ? 's' : ''} out</b><p>${esc(t)}</p><div class="row"><span>${r.hours} hour${r.hours > 1 ? 's' : ''}</span><span class="w">${s.hot ? 'Hot zone' : ''}</span></div>${bar(r.left <= 1 ? .85 : .4, '')}<p class="ft" style="font-size:12px;margin-top:3px">Back ${r.left <= 1 ? 'tomorrow morning' : 'in ' + r.left + ' days'}.</p></div>`; }
    const lines = S.log.slice(-4).map(l => `<p><i class="${l.k === 'bad' ? 'r' : ''}">${l.k === 'bad' ? '!' : l.k === 'good' ? '+' : '&middot;'}</i>${esc(l.t)}</p>`).join('') || '<p>A quiet night.</p>';
    return `<div id="bot">${run}<div class="card lg"><h4>Last night${S.made ? ` &middot; made ${esc(S.made)}` : ''}</h4>${lines}</div><div class="nav"><button id="nrun">Send a Run</button><button id="nquest" ${S.day < 2 ? 'hidden' : ''}>Quests${E.Q.available(S).length ? ` (${E.Q.available(S).length})` : ''}</button><button id="nstore">Inventory</button><button id="nwall">The Wall</button><button id="nhelp">Help</button></div><div class="endw"><div class="auto"><button id="auto" class="${auto.on ? 'on' : ''}" title="Let the game play itself">${auto.on ? 'Stop' : 'Autoplay'}</button>${[1, 2, 4, 8].map(v => `<button data-sp="${v}" class="${auto.speed === v ? 'sp' : ''}" title="Autoplay speed">${v}x</button>`).join('')}</div><button id="end" ${auto.on ? 'disabled' : ''}>End Day<small>${nf(need.food)} food, ${nf(need.water)} water</small></button></div></div>`;
  }
  function sideHtml() {
    if (sel && pOf(sel) && pOf(sel).alive) return personPanel(pOf(sel));
    if (roomSel && E.roomOf(S, roomSel)) return roomPanel(E.roomOf(S, roomSel));
    sel = null; roomSel = null;
    return overview();
  }
  function overview() {
    const alerts = [], need = E.needs(S), fc = E.forecast(S);
    const add = (t, bad) => alerts.push(`<div class="alert ${bad ? 'bad' : ''}">${t}</div>`);
    if (S.day <= 10 && O.hints) { const hi = E.humans(S).filter(p => !p.wait && p.dmd >= 24).sort((a, b) => b.dmd - a.dmd)[0]; if (hi) add(`<b>${esc(hi.name)} is at ${hi.dmd} of 32 DMD.</b> The red bar beside each name is the infection. At 32 a secret roll decides if they turn, and you wait days to find out. Keep them out of fights and away from bites.`, true); }
    if (S.day <= 3 && S.tutorial && O.hints) add(S.day === 1 ? '<b>Start here.</b> Every room needs people working in it. Drag people between rooms, or click a person then a room. Then press End Day.' : S.day === 2 ? '<b>Send a Run.</b> Food and fuel will not last. Send two people out, and keep someone on the Gate.' : '<b>Build.</b> Click a dirt room. A Quarantine room is what stands between you and the people who are running out of time.');
    { const sick = E.humans(S).filter(p => p.ill); if (sick.length) add(`<b>Sick:</b> ${sick.map(p => `${esc(p.name)} (${E.ILL[p.ill.k].n.toLowerCase()})`).join(', ')}. Click them to treat.`, sick.some(p => p.ill.stage >= 2)); }
    if (S.threat && S.threat.known) { const path = E.breachPath(S).slice(0, 4), gate = S.rooms.find(r => r.type === 'gate'), g = gate ? E.workers(S, gate).length : 0; add(`<b>Tonight:</b> ${E.threatText(S.threat)} ${g ? `${g} on the Gate.` : '<b>Nobody is on the Gate.</b>'} If it falls they come through ${path.map(r => `${D.ROOMS[r.type].name}${r.defs && r.defs.length ? ` (${r.defs.length} def)` : ''}`).join(', ')}. <button class="btn ${S.lockdown ? 'a1' : ''}" id="lockdn" style="margin-top:4px">${S.lockdown ? 'Lockdown on: rooms work at half, nobody fights inside' : 'Lock down tonight'}</button>`, true); }
    S.people.filter(p => p.alive && p.wait).forEach(p => add(`<b>${esc(p.name)}</b> is at 32 DMD. ${p.wait.days} day${p.wait.days > 1 ? 's' : ''} until you find out.`, true));
    S.people.filter(p => p.alive && p.damned && p.dmd >= 26).forEach(p => add(`<b>${esc(p.name)}</b> has ${32 - p.dmd} day${32 - p.dmd === 1 ? '' : 's'} left.`, true));
    if ((fc.food || 0) + S.res.food < need.food) add('Food runs out tonight.', true); else if (S.res.food + ((fc.food || 0) - need.food) * 3 < 0) add('Food will run out in a few days.');
    if ((fc.water || 0) + S.res.water < need.water) add('Water runs out tonight.', true); else if (S.res.water + ((fc.water || 0) - need.water) * 3 < 0) add('Water will run out in a few days.');
    if (S.res.fuel < E.fuelBurn(S) * 3) add('Fuel is almost gone. Gas stations and truck stops have more.', true);
    if (!E.workers(S, S.rooms.find(r => r.type === 'gate')).length) add('Nobody is on the Gate tonight.', true);
    (S.incidents || []).forEach(i => add(`<b>${E.INCIDENTS[i.type].n}</b> In the ${D.ROOMS[E.roomOf(S, i.room).type].name}. Click it on the room before End Day.`, true));
    S.rooms.filter(r => r.broken).forEach(r => add(`${D.ROOMS[r.type].name} is broken. Click it to repair.`));
    S.rooms.filter(r => r.mold).forEach(r => add(`Black mold in ${D.ROOMS[r.type].name}. Burn it out before it spreads.`, true));
    const idle = E.home(S).filter(p => !p.room && !p.sealed).length; if (idle) add(`${idle} ${idle > 1 ? 'people have' : 'person has'} no job.`);
    const list = S.people.filter(p => p.alive).sort((a, b) => b.dmd - a.dmd).map(p => `<div class="rost" data-pick="${p.id}"><div class="h"><img src="${img(p)}"></div><div class="t"><b>${esc(p.name)}</b> <small>${E.classNameOf(p)} L${p.level}${p.away ? ' &middot; out' : p.sealed ? ' &middot; sealed' : ''}</small></div><div class="mini" title="DMD">${bar(p.dmd / 32, 'dmd')}</div></div>`).join('');
    const L = E.leader(S), ord = Math.round(S.order ?? 55), ocol = ord >= 60 ? '#5fc25a' : ord >= 30 ? '#e8a33c' : '#d4473a';
    const leadHtml = `<div class="sec lead"><h3>Leader</h3>${L ? `<div class="ldr" data-pick="${L.id}"><div class="h"><img src="${img(L)}"></div><div><b>${esc(L.name)}</b><small>${E.skillName(['politics', 'performance', 'intimidation'].reduce((a, s) => (E.pool(L, s) > E.pool(L, a) ? s : a)))} ${E.voice(L)}</small></div></div>` : '<p class="ft">Nobody leads. Click a person, then Make leader.</p>'}<label class="ordl">Order <b style="color:${ocol}">${ord}</b> <span class="ft">${ord >= 60 ? 'work +' + Math.round((E.orderMult(S) - 1) * 100) + '%' : ord < 25 ? 'unrest likely' : ord < 45 ? 'work ' + Math.round((E.orderMult(S) - 1) * 100) + '%' : ''}</span></label><i class="obar"><u style="width:${ord}%;background:${ocol}"></u></i><div class="lawl" ${L ? '' : 'hidden'}>${(S.laws || []).map(k => `<span class="chip">${esc(E.LAWS[k].n)}</span>`).join('')}<button class="btn" id="nlaws">Laws (${(S.laws || []).length}/${E.MAX_LAWS})</button></div></div>`;
    return `<aside id="side"><div class="sec"><h3>Your shelter</h3><p>${E.humans(S).length} alive${E.dogs(S).filter(d => d.alive).length ? ` &middot; ${E.dogs(S).filter(d => d.alive).length} dog${E.dogs(S).filter(d => d.alive).length > 1 ? 's' : ''}` : ''}${E.kids(S).length ? ` &middot; ${E.kids(S).length} child${E.kids(S).length > 1 ? 'ren' : ''}` : ''} &middot; ${E.bedsOf(S)} beds${E.hasDamned(S) ? ` &middot; trusted the Damned: ${E.trustCount(S).join(' of ')}` : ''}</p></div>${leadHtml}${alerts.join('')}<div class="sec" style="flex:1;overflow:auto"><h3>People</h3>${list}</div></aside>`;
  }
  function personPanel(p) {
    const w = E.gear(S, p.weapon), a = E.gear(S, p.armor), top = Object.entries(p.skills).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `<div>${E.skillName(k)}<b>${v}</b></div>`).join('');
    const eq = g => (g ? `${esc(g.n)}${g.cond && g.cond !== 'Standard' ? ` <span class="ft">(${g.cond})</span>` : ''}` : '<span class="ft">none</span>');
    let story = '';
    if (p.wait) story = `<div class="sec wait"><h3>The wait</h3><div class="tmr"><b>${p.wait.days}</b><span>day${p.wait.days > 1 ? 's' : ''} until<br>you find out</span></div><p>The roll has been made. Nobody knows how it came out.</p>${p.wait.sym && p.wait.sym.length ? `<ul>${p.wait.sym.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</div>
      <div class="acts"><button class="a1" data-a="seal">${p.sealed ? 'Keep sealed' : 'Seal away'}</button><button data-a="out">${p.sealed ? 'Let out' : 'Say nothing'}</button><button data-a="exile">Exile</button><button class="a3" data-a="mercy">Mercy</button></div>`;
    else if (p.sealed) story = `<div class="sec wait"><h3>Sealed</h3><p>Nothing to wait for now.</p></div><div class="acts"><button data-a="out">Let out</button></div>`;
    if (p.damned) { const [t, n] = E.trustCount(S); story = `<div class="dam"><img src="${kitSrc(p.sprite, 'damned')}"><div><h3>${esc(p.name)} <small>The Damned</small></h3><label>Until ${p.he} turns on you <b class="r">${32 - p.dmd} days</b></label>${bar(p.dmd / 32, 'dmd2')}<p>${p.dmd} / 32 DMD &middot; Trusted by ${t} of ${n}</p></div></div><div class="acts"><button data-a="exile">Exile</button><button class="a3" data-a="mercy">Mercy</button></div>`; }
    const talk = p.cls === 'shepherd' && p.talked !== S.day ? S.people.find(o => o.alive && o.fears && !o.damned && !o.away) : null;
    const room = p.room && E.roomOf(S, p.room);
    return `<aside id="side"><div class="pc"><div class="pimg ${p.wait ? 'at32' : ''} ${p.damned ? 'dm' : ''}"><img src="${img(p)}"></div><div><h2>${esc(p.name)} ${esc(p.last)} <button class="rnm" data-a="rename" title="Rename">Rename</button></h2><p>${E.classNameOf(p)}, Level ${p.level}</p><div class="sc3"><span>Physical<b>${E.score(p, 'physical')}</b></span><span>Mental<b>${E.score(p, 'mental')}</b></span><span>Social<b>${E.score(p, 'social')}</b></span></div></div></div>
      <div class="m"><label>DMD <b class="${p.dmd >= 32 ? 'r' : ''}">${p.dmd} / 32</b></label>${bar(p.dmd / 32, 'dmd')}</div>
      <div class="m2"><div><label>Health <b>${p.hp} / ${E.maxHp(p)}</b></label>${bar(p.hp / E.maxHp(p), 'he')}</div><div><label>Stress <b>${p.stress} / 10</b></label>${bar(p.stress / 10, 'sb')}</div></div>
      <div class="m2"><div><label>Exhaustion <b>${p.exh}</b></label>${bar(p.exh / 10, 'ex2')}</div><div><label>Next level <b>${p.level >= 10 ? 'Max' : ''}</b></label>${bar(p.level >= 10 ? 1 : p.xp / E.xpNeed(p), '')}</div></div>
      ${story}
      ${p.preg ? `<div class="sec"><h3>Expecting</h3><p>Due in ${Math.max(0, p.preg.due - S.day)} days.</p></div>` : ''}${E.kids(S).some(k => k.mom === p.id || k.dad === p.id) ? `<div class="sec"><h3>Children</h3><p>${E.kids(S).filter(k => k.mom === p.id || k.dad === p.id).map(k => `${esc(k.name)} <button class="rnm" data-a="rnkid:${k.id}">Rename</button>, ${E.kidAge(S, k)} days${E.kidStage(S, k) === 'child' && k.school ? `, ${k.school} days of school` : ''}`).join('<br>')}</p></div>` : ''}
      ${p.ill ? (() => { const d = E.ILL[p.ill.k]; return `<div class="sec ill"><h3>Sick: ${d.n}</h3><p>${esc(d.sym[Math.min(2, p.ill.stage - 1)])} Stage ${p.ill.stage} of 3${p.ill.abx ? ', on antibiotics' : ''}${p.ill.med ? ', being nursed' : ''}. ${d.bact ? 'Bacterial: antibiotics will cure it.' : 'Not bacterial: antibiotics will not help.'}</p><div class="acts"><button data-a="treat:abx" ${E.items(S).antibiotics ? '' : 'disabled'}>Antibiotics (${E.items(S).antibiotics || 0})</button><button data-a="treat:meds" ${S.res.meds >= 2 ? '' : 'disabled'}>Nurse (2 Med)</button><button data-a="treat:rest">Rest</button>${d.spread ? '<button data-a="treat:iso">Isolate</button>' : ''}</div></div>`; })() : ''}${dogHtml(p)}${psyHtml(p)}
      <div class="sec"><h3>Job</h3><p>${p.away ? 'Out on a run.' : p.sealed ? 'In Quarantine.' : room ? D.ROOMS[room.type].name : 'None. Drag to a room.'}${p.fears ? ' <span class="r">Fears the Damned.</span>' : ''}</p></div>
      ${!p.damned && !p.sealed && !p.away && S.leader !== p.id ? `<button class="btn w100" data-a="lead">Make ${esc(p.name)} the leader${E.leader(S) ? ' (Order -8)' : ''}</button>` : S.leader === p.id ? '<p class="ft" style="text-align:center">Leads the shelter.</p>' : ''}
      ${talk ? `<button class="btn w100" data-a="talk">Talk ${esc(talk.name)} around (Negotiation, DR 7)</button>` : ''}
      <div class="sec"><h3>Gear</h3><div class="slot"><span>Weapon</span><b>${eq(w)}</b><span class="link" data-a="gear">Change</span></div><div class="slot"><span>Armor</span><b>${eq(a)}</b><span class="link" data-a="gear">Change</span></div></div>
      <div class="sec"><h3>Best skills</h3><div class="skills">${top}</div></div>
      ${p.perks.length ? `<div class="sec"><h3>Perks</h3>${p.perks.map(k => `<span class="chip" title="${esc(E.perkDesc(k))}">${esc(k)}</span>`).join('')}</div>` : ''}
      <button class="btn w100" data-a="desel">Back</button></aside>`;
  }
  function roomPanel(r) {
    const d = D.ROOMS[r.type], ws = r.type === 'quarantine' ? E.sealed(S) : E.workers(S, r), up = E.upgradeCost(r), bo = E.blackout(S);
    const extra = [];
    if (d.res) extra.push(`Makes <b>${nf(E.outputOf(S, r, bo))}</b> ${D.RES_NAME[d.res].toLowerCase()} a day.`);
    if (r.type === 'generator') extra.push(`Power ${E.powerSupply(S)} of ${E.powerDemand(S)} needed. Burns ${E.fuelBurn(S)} fuel a day.`);
    if (r.type === 'bunks') extra.push(`Rest here is <b>${r.tier >= 1 ? 'Comfortable' : 'Uncomfortable'}</b>.`);
    if (r.type === 'clinic') extra.push(`Treats ${ws.length * (1 + r.tier)} patients a night. <b>${r.tier >= 3 ? 'Advanced' : 'Medical'}</b> treatment.`);
    if (r.type === 'radio') extra.push(`Next signal: ${Math.floor(S.radio)}%.`);
    if (r.type === 'quarantine') extra.push(`${E.sealed(S).length} of ${E.cells(S)} cells in use.`);
    const btn = [];
    if (d.skill && !r.broken) btn.push(`<button class="btn w100" data-a="push" ${r.pushed || !ws.length ? 'disabled' : ''}>${r.pushed ? 'Already pushed today' : `Push: roll ${E.skillName(d.skill)}, DR 6`}</button>`);
    if (r.broken) btn.push(`<button class="btn w100 a1" data-a="repair">Repair (${E.repairCost(r)} scrap)</button>`);
    if (r.mold) btn.push(`<button class="btn w100 a3" data-a="burn">Burn out mold (2 fuel)</button>`);
    if (r.type === 'workshop') btn.push(`<button class="btn w100" data-a="craft">Make gear</button>`);
    if (r.type === 'trade') btn.push(`<button class="btn w100" data-a="trade">Trade</button>`);
    if (E.W(r) < E.MAXW) btn.push(`<button class="btn w100" data-a="expand" ${E.canExpand(S, r) && S.res.scrap >= E.expandCost(r) ? '' : 'disabled'} title="Needs the empty space to its right">${E.canExpand(S, r) ? `Expand to ${E.W(r) + 1} wide (${E.expandCost(r)} scrap)` : 'Expand: needs the space to its right empty'}</button>`);
    if (r.type === 'kennel') { const ds = E.dogs(S).filter(d => d.alive); extra.push(ds.length ? ds.map(d => `<b>${esc(d.name)}</b> ${d.sex === 'm' ? '&#9794;' : '&#9792;'} ${esc(d.breed)}${d.pup ? ', puppy' : ''}${d.preg ? ', expecting' : ''}${d.owner ? `, with ${esc((pOf(d.owner) || {}).name || '')}` : ''}`).join('<br>') : 'No dogs yet. Strays turn up at the hatch, and on the road.'); btn.push(`<button class="btn w100 ${r.breed ? 'a1' : ''}" data-a="breed">Breeding: ${r.breed ? 'allowed' : 'not allowed'}</button>`); }
    if (r.type !== 'quarantine') { const built = E.defsOf(r); extra.push(`<b>Defenses:</b> ${built.length ? built.map(k => E.DEFS[k].n).join(', ') : 'none'}.`); Object.entries(E.DEFS).filter(([k]) => !built.includes(k)).forEach(([k, d]) => btn.push(`<button class="btn w100 dfb" data-a="def:${k}" title="${esc(d.d)}" ${S.res.scrap < d.c.scrap ? 'disabled' : ''}>Build ${d.n} (${d.c.scrap} scrap)<small>${esc(d.d)}</small></button>`)); }
    if (up) btn.push(`<button class="btn w100" data-a="upgrade" ${S.res.scrap < up ? 'disabled' : ''}>Upgrade to T${r.tier + 1} (${up} scrap)</button>`);
    const list = ws.map(p => `<div class="rost" data-pick="${p.id}"><div class="h"><img src="${img(p)}"></div><div class="t"><b>${esc(p.name)}</b> <small>${d.skill ? `${E.skillName(d.skill)} ${p.skills[d.skill]}` : E.classNameOf(p)}</small></div></div>`).join('');
    return `<aside id="side"><div style="height:130px;border-radius:9px;background:url(art/rooms/${d.art}.webp) center/cover;border:3px solid #000"></div><h2 style="font-size:25px">${d.name} <span style="color:#e8a33c;font-size:15px">T${r.tier}, ${D.TIER_LABEL[r.tier]}</span></h2><div class="sec"><p>${d.desc}</p>${extra.map(t => `<p style="margin-top:4px">${t}</p>`).join('')}</div>${r.lay && (r.lay.good.length || r.lay.bad.length) ? `<div class="sec"><h3>Layout</h3>${r.lay.good.map(t => `<p style="color:#9dff6a">+ ${esc(t)}</p>`).join('')}${r.lay.bad.map(t => `<p style="color:#ff8a6a">- ${esc(t)}</p>`).join('')}</div>` : ''}<div class="sec"><h3>${r.type === 'quarantine' ? 'Sealed' : `Workers ${E.capOf(r) ? ws.length + ' / ' + E.capOf(r) : ''}`}</h3>${list || '<p>Nobody.</p>'}</div>${btn.join('')}<button class="btn w100" data-a="desel">Back</button></aside>`;
  }

  // ---------- input
  function bindMain() {
    bindSnd();
    $('auto').onclick = () => setAuto(!auto.on);
    document.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => setSpeed(+b.dataset.sp));
    $('end').onclick = endDay; $('nrun').onclick = $('runs').onclick = () => { modal = { k: 'run', team: [], hours: 2 }; drawOver(); };
    $('nquest').onclick = () => { modal = { k: 'quest', team: [] }; drawOver(); }; if ($('lockdn')) $('lockdn').onclick = () => { S.lockdown = !S.lockdown; save(); render(); };
    if ($('nlaws')) $('nlaws').onclick = () => { modal = { k: 'laws' }; drawOver(); }; $('nstore').onclick = () => { modal = { k: 'gear', tab: 'weapons', id: sel }; drawOver(); }; $('nwall').onclick = () => { modal = { k: 'wall' }; drawOver(); }; $('nhelp').onclick = () => { modal = { k: 'help' }; drawOver(); };
    $('dig').onclick = () => { if (E.dig(S)) { render(); $('base').scrollTop = 9999; } else toast('Not enough scrap.'); };
    document.querySelectorAll('[data-pick]').forEach(el => el.onclick = () => { sel = +el.dataset.pick; roomSel = null; render(); });
    document.querySelectorAll('[data-a]').forEach(el => el.onclick = () => act(el.dataset.a));
    document.querySelectorAll('.room').forEach(el => el.onclick = ev => {
      if (drag && drag.moved) return;
      if (ev.target.closest('.res')) return;
      if (el.dataset.lock) { toast('No door can reach here. Build the room next to it first.'); return; }
      if (el.dataset.slot) { const [row, col] = el.dataset.slot.split(',').map(Number); sel = null; modal = { k: 'build', row, col }; drawOver(); return; }
      const r = E.roomOf(S, +el.dataset.room);
      if (sel && pOf(sel)) { place(pOf(sel), r); return; }
      roomSel = r.id; sel = null; render();
    });
    document.querySelectorAll('[data-push]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const o = E.push(S, E.roomOf(S, +b.dataset.push)); if (o) { modal = { k: 'dice', o }; rollSound(o); render(); } });
    document.querySelectorAll('[data-inc]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const o = E.resolveIncident(S, +b.dataset.inc); if (!o) return; if (o.none) return toast('Nobody there can handle it. Drag someone in.'); modal = { k: 'dice', o }; rollSound(o); save(); render(); });
    document.querySelectorAll('.res').forEach(el => el.onpointerdown = ev => startDrag(ev, el));
  }
  function place(p, r) {
    if (r.type === 'bunks') { moved(p, () => E.assign(S, p, null)); blip(300); render(); return; }
    if (moved(p, () => E.assign(S, p, r))) { SA.sfx('door'); render(); return; }
    if (p.away) toast(`${p.name} is out on a run.`); else if (p.sealed) toast('Let them out of Quarantine first.'); else if (r.type === 'quarantine') toast('No free cell.'); else if (!E.reachable(S, r.row, r.col)) toast('There is no way into that room yet.'); else if (!E.capOf(r)) toast('Nobody works here.'); else toast(`${D.ROOMS[r.type].name} is full.`);
  }
  function startDrag(ev, el) {
    const p = pOf(+el.dataset.p); if (!p) return;
    ev.preventDefault();
    const k = +stage.dataset.k, rect = stage.getBoundingClientRect();
    drag = { p, moved: false, sx: ev.clientX, sy: ev.clientY };
    const g = $('ghost');
    const mv = e => {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; g.innerHTML = `<img src="${img(p)}">`; g.style.display = 'block'; }
      if (drag.moved) { g.style.left = ((e.clientX - rect.left) / k - 40) + 'px'; g.style.top = ((e.clientY - rect.top) / k - 100) + 'px'; }
    };
    const up = e => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
      g.style.display = 'none';
      if (drag.moved) { const t = document.elementFromPoint(e.clientX, e.clientY), room = t && t.closest('.room'); if (room && room.dataset.room) place(p, E.roomOf(S, +room.dataset.room)); setTimeout(() => drag = null, 30); } else { drag = null; sel = sel === p.id ? null : p.id; roomSel = null; render(); }
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  function act(a) {
    const p = sel && pOf(sel), r = roomSel && E.roomOf(S, roomSel);
    if (a === 'desel') { sel = roomSel = null; return render(); }
    if (a === 'seal') { if (!p.sealed && !moved(p, () => E.seal(S, p))) toast('No free Quarantine cell. Build one.'); return render(); }
    if (a === 'out') { if (p.sealed) moved(p, () => E.unseal(S, p)); return render(); }
    if (a === 'exile') { E.kill(S, p, p.damned ? 'Driven out into the rain.' : 'Exiled at 32.'); sel = null; afterChange(); return; }
    if (a === 'mercy') { E.kill(S, p, 'Given mercy.'); sel = null; afterChange(); return; }
    if (a === 'talk') { const o = S.people.find(x => x.alive && x.fears && !x.damned && !x.away), ok = E.talk(S, p, o); toast(ok ? `${o.name} will give it a chance.` : `${o.name} won't hear it.`); return render(); }
    if (a.startsWith('treat:')) { toast(E.treat(S, p, a.slice(6)) || ''); save(); return render(); }
    if (a === 'rename') { modal = { k: 'rename', t: 'p', id: p.id }; return drawOver(); }
    if (a === 'rndog') { const d = E.dogOf(S, p); if (d) { modal = { k: 'rename', t: 'd', id: d.id }; return drawOver(); } }
    if (a.startsWith('rnkid:')) { modal = { k: 'rename', t: 'k', id: +a.slice(6) }; return drawOver(); }
    if (a === 'listen') { modal = { k: 'talk', mode: 'listen', id: p.id }; return drawOver(); }
    if (a === 'chat') { modal = { k: 'talk', mode: 'chat', id: p.id, turns: [] }; return drawOver(); }
    if (a === 'lead') { E.setLeader(S, p); S.noLeader = false; blip(520); save(); sel = null; return render(); }
    if (a === 'gear') { modal = { k: 'gear', id: p.id, tab: 'weapons' }; return drawOver(); }
    if (a === 'push') { const o = E.push(S, r); if (o) { modal = { k: 'dice', o }; rollSound(o); } return render(); }
    if (a === 'repair') { if (!E.repair(S, r)) toast('Not enough scrap.'); return render(); }
    if (a === 'burn') { if (!E.burnMold(S, r)) toast('Not enough fuel.'); return render(); }
    if (a.startsWith('dog:')) { const d = E.dogs(S).find(x => x.id === +a.slice(4)); if (d) E.giveDog(S, d, p); save(); return render(); }
    if (a.startsWith('train:')) { const d = E.dogOf(S, p); if (d && E.trainDog(S, d, a.slice(6))) { toast(`${d.name} starts training. ${E.TRAIN_DAYS} days with someone working the Kennel.`); save(); } return render(); }
    if (a === 'undog') { const d = E.dogOf(S, p); if (d) d.owner = null; save(); return render(); }
    if (a === 'breed') { r.breed = !r.breed; save(); return render(); }
    if (a.startsWith('def:')) { if (E.addDef(S, r, a.slice(4))) { SA.sfx('build'); save(); } else toast('Not enough scrap.'); return render(); }
    if (a === 'expand') { if (E.expand(S, r)) { SA.sfx('build'); save(); } else toast('Not enough scrap.'); return render(); }
    if (a === 'upgrade') { if (E.upgrade(S, r)) SA.sfx('build'); return render(); }
    if (a === 'craft') { modal = { k: 'craft' }; return drawOver(); }
    if (a === 'trade') { modal = { k: 'trade' }; return drawOver(); }
  }
  function rollSound(o) { SA.sfx('dice'); SA.sfx(o.crit ? 'crit' : o.bad ? 'fail' : 'success', .45); }
  function afterChange() { save(); render(); }
  function endDay() {
    if (S.over || S.queue.length) return;
    SA.sfx('endday');
    const wasAway = new Set(E.living(S).filter(p => p.away).map(p => p.id));
    clearWalk();
    E.endDay(S); save();
    const quick = auto.on && auto.speed >= 4;
    if (!quick) { const w = document.createElement('div'); w.className = 'daywipe'; w.textContent = `Day ${S.day}`; stage.appendChild(w); setTimeout(() => w.remove(), 760); }
    setTimeout(() => { render(); if (!S.quest && !S.over) { E.home(S).filter(p => wasAway.has(p.id) && !p.sealed).forEach(p => startWalk(p, { x: SHAFT, row: -1, key: 'hatch' }, spot(p))); render(); } }, quick ? 30 : 320);
  }


  // ---------- quests: you play these yourself
  function questModal() {
    const Q = E.Q, m = modal, list = Q.available(S), team = E.home(S).filter(p => !p.sealed), who = m.team.map(pOf);
    const d = m.key && list.find(x => x.k === m.key);
    show(`<h2>Quests</h2><div class="cols"><div><div class="list" style="max-height:600px">${list.map(q => `<div class="site ${m.key === q.k ? 'on' : ''}" data-q="${q.k}"><div><b>${esc(q.name)}</b><small>${esc(q.blurb)}</small></div><div style="text-align:right;flex:none"><small>Danger</small><b class="r">L${Q.level(S, q)}</b></div></div>`).join('') || '<p class="t">Nothing right now. A Radio Room turns up more.</p>'}</div></div>
      <div><div class="ft">Team of up to 3 (${who.length}). You fight their battles yourself.</div><div class="list" style="max-height:440px">${team.map(p => `<div class="tm ${m.team.includes(p.id) ? 'on' : ''}" data-tm="${p.id}"><div class="h"><img src="${img(p)}"></div><b>${esc(p.name)}</b> <span class="ft">${E.classNameOf(p)} L${p.level}</span><small>HP ${p.hp}/${E.maxHp(p)} &middot; DMD ${p.dmd}${E.gear(S, p.weapon) ? ' &middot; armed' : ' &middot; no weapon'}</small></div>`).join('')}</div>
      <p class="ft" style="margin:8px 0">They are gone for the rest of the day. Anyone who dies is gone for good.</p>
      <div class="acts"><button class="a1" id="qgo" ${d && who.length ? '' : 'disabled'}>Set out</button><button data-close="1">Cancel</button></div></div></div>`, 'wide');
    over.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { m.key = b.dataset.q; drawOver(); });
    over.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { const id = +b.dataset.tm; if (m.team.includes(id)) m.team = m.team.filter(x => x !== id); else if (m.team.length < 3) m.team = [...m.team, id]; drawOver(); });
    if ($('qgo')) $('qgo').onclick = () => { if (Q.start(S, m.key, m.team)) { modal = null; qShown = 0; qActive = null; qMode = 'attack'; save(); blip(350); render(); } };
  }
  let qShown = 0, qTimer = 0, qActive = null, qMode = 'attack';
  // ---------- the road
  const trv = { key: null, p: 0, raf: 0, last: 0 };
  function routeAt(A, B, t) { const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], c = [mx - dy * .22, my + dx * .22], u = 1 - t; return [u * u * A[0] + 2 * u * t * c[0] + t * t * B[0], u * u * A[1] + 2 * u * t * c[1] + t * t * B[1]]; }
  function renderTravel() {
    const Q = E.Q, q = S.quest, d = Q.def(q), t = q.trip, team = Q.team(S).filter(p => p.alive);
    const dest = Q.SPOT[q.key] || [700, 400], A = t.dir === 'out' ? Q.HOME : dest, B = t.dir === 'out' ? dest : Q.HOME;
    const id = q.key + t.dir; if (trv.key !== id) { trv.key = id; trv.p = 0; }
    const pts = Array.from({ length: 41 }, (_, i) => routeAt(A, B, i / 40)), path = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L');
    const stop = Q.tripStop(S), res = t.res, cur = t.stops[t.i];
    let card = '';
    if (res) card = `<div class="tcard"><h3>${esc(res.title)}</h3>${res.roll ? `<div class="qdice">${res.roll.dice.map(v => dieHtml(v, res.roll.crit && (v === 1 || v === 10) ? 'c' : v >= res.roll.dr ? 'y' : '')).join('')}<small>${esc(res.roll.who)}, ${esc(res.roll.sk)} vs DR ${res.roll.dr}</small></div>` : ''}<p>${esc(res.text)}</p><div class="qbtns"><button data-tr="go" class="a1">Keep going</button></div></div>`;
    else if (stop && trv.p >= cur.at - .001) card = `<div class="tcard"><p class="t">${esc(stop.t)}</p><div class="qbtns col">${stop.o.map((o, i) => { const lack = o.cost && Object.keys(o.cost).some(k => S.res[k] < o.cost[k] * (k === 'rounds' ? team.length : 1)); return `<button data-ro="${i}" ${lack ? 'disabled' : ''}>${esc(o.l)}${o.sk ? ` <span>${E.skillName(o.sk)}, DR ${o.dr}</span>` : ''}</button>`; }).join('')}</div></div>`;
    const marks = t.stops.map(s => { const [x, y] = routeAt(A, B, s.at); return `<circle cx="${x}" cy="${y}" r="9" class="${s.done ? 'sd' : 'sn'}"/>`; }).join('');
    app.innerHTML = `<div id="trv"><div class="tmap"></div><svg viewBox="0 0 1600 900"><path d="${path}" class="troute"/>${marks}<g class="tpin home" transform="translate(${Q.HOME[0]},${Q.HOME[1]})"><circle r="16"/><text y="44">The shelter</text></g><g class="tpin dest" transform="translate(${dest[0]},${dest[1]})"><circle r="16"/><text y="44">${esc(d.name)}</text></g></svg><div id="tteam">${team.map(p => `<div class="h"><img src="${img(p)}"></div>`).join('')}</div>
      <div id="thead"><b>${t.dir === 'out' ? `On the road to ${esc(d.name)}` : 'Heading home'}</b><span>${esc(team.map(p => p.name).join(', '))}</span>${sndBtns()}<div class="auto qa"><button id="auto" class="${auto.on ? 'on' : ''}">${auto.on ? 'Stop' : 'Autoplay'}</button>${[1, 2, 4, 8].map(v => `<button data-sp="${v}" class="${auto.speed === v ? 'sp' : ''}">${v}x</button>`).join('')}</div></div>${card}</div>`;
    $('auto').onclick = () => setAuto(!auto.on); document.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => setSpeed(+b.dataset.sp)); bindSnd();
    document.querySelectorAll('[data-ro]').forEach(b => b.onclick = () => { if (Q.road(S, +b.dataset.ro)) { SA.sfx('dice'); save(); renderTravel(); } });
    document.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { if (Q.tripNext(S)) trv.done = true; save(); renderTravel(); });
    placeTeam(A, B);
    cancelAnimationFrame(trv.raf); trv.last = performance.now(); trv.raf = requestAnimationFrame(stepTravel);
  }
  function placeTeam(A, B) { const el = $('tteam'); if (!el) return; const [x, y] = routeAt(A, B, trv.p); el.style.transform = `translate(${x}px,${y}px) translate(-50%,-150%)`; }
  function stepTravel(now) {
    if (!S || !S.quest || S.quest.view !== 'travel' || !S.quest.trip) return;
    const Q = E.Q, q = S.quest, t = q.trip, dest = Q.SPOT[q.key] || [700, 400], A = t.dir === 'out' ? Q.HOME : dest, B = t.dir === 'out' ? dest : Q.HOME;
    const dt = Math.min(.05, (now - trv.last) / 1000); trv.last = now;
    const cur = t.stops[t.i], target = cur && !cur.done ? cur.at : 1;
    if (trv.p < target) { const before = trv.p; trv.p = Math.min(target, trv.p + dt * .2 * (auto.on ? auto.speed : 1)); placeTeam(A, B); if (before < target && trv.p >= target && cur && !cur.done) { SA.sfx('sting'); return renderTravel(); } }
    else if (target >= 1 && !t.res && t.i >= t.stops.length) { cancelAnimationFrame(trv.raf); trv.key = null; Q.arrive(S); SA.sfx('door'); save(); qShown = S.quest ? S.quest.log.length : 0; return render(); }
    trv.raf = requestAnimationFrame(stepTravel);
  }
  // ---------- things seen out of the corner of your eye
  setInterval(() => {
    if (!S || S.quest || modal || drag || document.hidden || Math.random() > .07) return;
    const rooms = [...document.querySelectorAll('.room')]; if (!rooms.length) return;
    const r = rooms[Math.floor(Math.random() * rooms.length)], ppl = Object.keys((globalThis.GEN_KIT || {})), who = ppl[Math.floor(Math.random() * ppl.length)];
    const g = document.createElement('div'); g.className = 'glimpse'; g.style.left = (15 + Math.random() * 65) + '%';
    g.innerHTML = `<img src="${kitSrc(who, 'damned')}">`; r.appendChild(g); SA.sfx('growl', 0);
    setTimeout(() => g.remove(), 1700);
  }, 9000);
  function lineSound(l) {
    if (!l) return;
    if (l.roll) SA.sfx('dice');
    const d = l.roll ? .22 : 0, t = l.t, m = /^(?:COSMIC CRIT! )?(.+?) (hits|shoots|punches|misses|treats|blocks|dodges|avoids|throws|lights|drives|gives)\b/.exec(t), v = m && m[2], who = m && S.quest && E.Q.team(S).find(p => p.name === m[1]);
    let n = null;
    if (l.k === 'dmd') n = 'bite';
    else if (l.k === 'head') n = 'growl';
    else if (v === 'throws') n = 'blast';
    else if (v === 'shoots') { const g = who && E.gear(S, who.weapon); n = g && g.gun ? 'gun' : 'arrow'; }
    else if (v === 'hits' || v === 'punches') { const w = who ? poseOf(who) : ''; n = !who || who.damned ? 'claw' : w === 'melee' ? 'slash' : w === 'blunt' ? 'club' : w === 'base' ? 'punch' : 'club'; }
    else if (v === 'misses' || v === 'avoids' || v === 'dodges') n = 'miss';
    else if (v === 'blocks') n = 'block';
    else if (v === 'treats' || v === 'gives' || v === 'drives') n = 'heal';
    else if (/^The (same attack|blast)/.test(t)) n = 'hit';
    else if (l.k === 'good') n = 'success';
    else if (l.k === 'bad') n = 'fail';
    if (l.k === 'crit' && v !== 'throws') SA.sfx('crit', d);
    if (/ falls\./.test(t)) SA.sfx('kill', d + .22);
    if (n) SA.sfx(n, l.roll ? .22 : 0);
  }
  function renderQuest() {
    const Q = E.Q, q = S.quest, d = Q.def(q), team = Q.team(S), f = q.fight;
    if (q.view === 'travel' && q.trip) return renderTravel();
    over.innerHTML = '';
    const busy = qShown < q.log.length;
    if (busy && !qTimer) qTimer = setTimeout(() => { qTimer = 0; qShown = Math.min(qShown + 1, S.quest ? S.quest.log.length : 0); if (S.quest) { lineSound(S.quest.log[qShown - 1]); renderQuest(); } }, 1050 * OP.textMul() / (auto.on ? auto.speed : 1));
    const lines = q.log.slice(0, qShown), last = lines.slice().reverse().find(l => l.roll), said = lines[lines.length - 1];
    let sayHero = null, sayFoe = -1;
    if (said && said.k !== 'round' && said.k !== 'head') {
      const t = said.t.replace('COSMIC CRIT! ', '');
      sayHero = (team.find(p => t.startsWith(p.name)) || {}).id || null;
      if (!sayHero && f) sayFoe = f.foes.findIndex(x => t.startsWith(x.n));
      if (!sayHero && sayFoe < 0) sayHero = (team.find(p => t.includes(p.name)) || {}).id || null;
    }
    const bubble = () => `<div class="qsay ${said.k}">${esc(said.t)}</div>`;
    // the fight as it stood at the line being shown, so nobody falls before the blow lands
    const snap = (busy || said) && said && said.snap ? said.snap : null;
    const hpH = p => (snap && snap.h[p.id] !== undefined ? snap.h[p.id] : (p.alive ? p.hp : -999)), hpF = (x, i) => (snap && snap.f[i] !== undefined ? snap.f[i] : x.hp);
    let act = null;
    if (said) {
      const m = /^(?:COSMIC CRIT! )?(.+?) (hits|shoots|punches|misses|treats|blocks|dodges|avoids) (.+?)(?: for (\d+))?[.:!]/.exec(said.t) || /^The same attack catches (.+?) for (\d+)/.exec(said.t);
      if (m && m[2] !== undefined) {
        const verb = m[2], who = m[1], tgt = m[3], fId = n => (f ? f.foes.findIndex(x => x.n === n) : -1), hId = n => (team.find(p => p.name === n) || {}).id;
        act = { verb, gun: verb === 'shoots', aH: hId(who), aF: fId(who), tH: hId(tgt), tF: fId(tgt), dmg: m[4] ? +m[4] : 0, crit: said.k === 'crit' };
        if (verb === 'avoids') act = { verb, aH: hId(tgt), aF: -1, tH: undefined, tF: fId(who), dmg: 0, dodge: true };
        if (verb === 'blocks' || verb === 'dodges') act = { verb, tH: hId(who), tF: -1, aF: fId(tgt), dodge: true, dmg: 0 };
      }
    }
    const cls = (isH, id) => { if (!act) return ''; const a = isH ? act.aH === id : act.aF === id, t = isH ? act.tH === id : act.tF === id; return (a ? (act.gun ? ' fx-fire' : isH ? ' fx-lunge' : ' fx-lungeL') : '') + (t ? (act.dodge ? ' fx-dodge' : act.dmg ? ' fx-hurt' : '') : '') + (t && act.crit ? ' fx-crit' : ''); };
    const pop = (isH, id) => !O.numbers ? '' : (act && act.dmg && (isH ? act.tH === id : act.tF === id) ? `<div class="dmgpop ${act.crit ? 'c' : ''}" style="left:${40 + Math.random() * 20}%">-${act.dmg}</div>` : '') + (act && act.dodge && (isH ? act.tH === id : act.tF === id) ? `<div class="dmgpop m">${act.verb === 'blocks' ? 'BLOCK' : 'DODGE'}</div>` : '');
    const up = team.filter(p => p.alive && p.hp > 0);
    if (f && (!qActive || !up.some(p => p.id === qActive) || f.acts[qActive] <= 0)) qActive = (up.find(p => f.acts[p.id] > 0) || up[0] || {}).id || null;
    const FH = { Small: 190, Medium: 300, Large: 340, Huge: 390, Giant: 420, Monstrous: 440, Colossal: 460, Titanic: 460, Leviathan: 460 };
    const heroX = i => 150 + i * 170, foeX = i => 1600 - ((i >= 3 ? 110 : 20) + (i % 3) * 200) - 110, heroI = id => team.findIndex(p => p.id === id);
    const lxH = act && act.tF >= 0 ? Math.max(60, foeX(act.tF) - heroX(Math.max(0, heroI(act.aH))) - 170) : 90, lxF = act && act.tH !== undefined && act.aF >= 0 ? Math.max(60, foeX(act.aF) - heroX(Math.max(0, heroI(act.tH))) - 170) : 90;
    let tracer = '';
    if (act && act.gun) {
      const shooterH = act.aH !== undefined, hi = Math.max(0, heroI(shooterH ? act.aH : act.tH)), fi = Math.max(0, shooterH ? act.tF : act.aF), kh = kit(team[hi]).m, hx = heroX(hi) + 300 * kh.ar * (kh.mx - kh.cx), hy = 32 + (hi % 2 ? 26 : 0) + 300 * (1 - kh.my), fx = foeX(fi), fy = (fi >= 3 ? 180 : 12) + 170;
      const dx = fx - hx, dy = fy - hy, len = Math.hypot(dx, dy), ang = Math.atan2(-dy, dx) * 180 / Math.PI;
      tracer = shooterH ? `<div class="tracer" style="left:${hx}px;bottom:${hy}px;width:${len}px;transform:rotate(${ang}deg)"></div>` : `<div class="tracer" style="left:${fx}px;bottom:${fy}px;width:${len}px;transform:rotate(${180 + ang}deg)"></div>`;
    }
    const heroes = team.map((p, i) => { const k = kit(p); return `<div class="qh ${hpH(p) <= -999 ? 'dead' : hpH(p) <= 0 ? 'down' : ''} ${f && qActive === p.id ? 'act' : ''}${cls(true, p.id)}" data-hero="${p.id}" style="left:${70 + i * 170}px;--hy:${i % 2 ? 26 : 0}px;--lx:${lxH}px;--fx:${80 + 300 * k.m.ar * (k.m.mx - k.m.cx)}px;--fy:${300 * k.m.my}px"><div class="spr" style="width:${Math.round(300 * k.m.ar)}px;height:300px;margin-left:${80 - 300 * k.m.ar * k.m.cx}px;--ib:${phase(3.4, seedOf(p))}s">${strips(k.src, 300, k.m.ar, 3.2, 4.6 + seedOf(p) * 1.4, seedOf(p))}</div>${pop(true, p.id)}<div class="tag"><b>${esc(p.name)}</b><i><u style="width:${Math.max(0, hpH(p)) / E.maxHp(p) * 100}%;background:#5fc25a"></u></i></div>${f && p.alive && f.acts[p.id] !== undefined ? `<div class="pips">${[0, 1, 2].map(n => `<s class="${n < f.acts[p.id] ? 'on' : ''}"></s>`).join('')}</div>` : ''}${sayHero === p.id ? bubble() : ''}</div>`; }).join('');
    const foes = f ? f.foes.map((x, i) => { const back = i >= 3, h = Math.round((FH[x.s] || 300) * (back ? .8 : 1)), turned = x.sprite && (globalThis.GEN_KIT || {})[x.sprite], src = turned ? `${kitSrc(x.sprite, 'damned')}` : x.art ? `art/foes/${x.art}.webp` : '', far = turned ? ((globalThis.GEN_KIT[x.sprite] || {}).damned || { ar: .5 }).ar : (globalThis.GEN_FOES || {})[x.art] || .75, fseed = ((i + 1) * 37 % 10) / 10; return `<div class="qf ${hpF(x, i) <= 0 ? 'dead' : ''} ${qMode === 'feint' ? 'fm' : ''}${back ? ' bk' : ''}${cls(false, i)}" data-foe="${i}" style="right:${(back ? 110 : 20) + (i % 3) * 200}px;bottom:${back ? 180 : 12}px;z-index:${back ? 2 : 4};--lx:${turned ? -lxF : lxF}px"><div class="spr" style="width:${Math.round(h * far)}px;height:${h}px;--ib:${phase(3.8, fseed)}s${turned ? ';scale:-1 1' : ''}">${strips(src, h, far, h * .012 * (x.g === 'machine' ? .25 : x.g === 'growth' ? 1.7 : 1), (x.g === 'machine' ? 6 : 4.4) + fseed * 1.6, fseed)}</div>${pop(false, i)}<div class="ftag"><b>${esc(x.n)}</b><span>L${x.L} ${x.c.t} tier${x.ar ? ` &middot; AR ${x.ar}` : ''}</span>${bar(Math.max(0, hpF(x, i)) / x.max, 'he')}</div>${sayFoe === i ? bubble() : ''}</div>`; }).join('') : '';
    let center = '';
    if (q.view === 'fight' && f) {
      const p = pOf(qActive);
      center = `<h3>Round ${f.round} ${p ? `&middot; ${esc(p.name)}, ${f.acts[p.id]} action${f.acts[p.id] === 1 ? '' : 's'} left` : ''}</h3><p class="ft">Click an enemy to ${qMode === 'feint' ? '<b style="color:#ffd76a">feint it</b>' : 'attack it'}. Actions you don't use are saved to Block or Dodge.</p>
        <div class="qbtns"><button data-qa="attack" class="${qMode === 'attack' ? 'on' : ''}">Attack</button><button data-qa="feint" class="${qMode === 'feint' ? 'on' : ''}">Feint</button><button data-qa="patch" ${S.res.meds < 1 ? 'disabled' : ''}>Patch up (1 Med)</button><button data-qa="end" class="a1">End Turn</button><button data-qa="flee" class="a3">Run</button></div>${p && E.packOf(p).length ? `<div class="qbtns qit">${E.packOf(p).map((x, n) => `<button data-qi="${n}" ${D.ITEMS[x.k].passive ? 'disabled' : ''} title="${esc(D.ITEMS[x.k].d)}"><img src="${GEN_ITEM[x.k]}">${esc(D.ITEMS[x.k].n)}${x.u > 1 ? ` (${x.u})` : ''}</button>`).join('')}</div>` : ''}`;
    } else if (q.view === 'choice') {
      const st = d.stages[q.stage];
      center = `<p class="qt">${esc(q.text)}</p><div class="qbtns col">${st.opts.map((o, i) => { const sk = o.sk ? ` <span>${E.skillName(o.sk)}, DR ${o.dr}</span>` : ''; const lack = o.cost && Object.keys(o.cost).some(k => S.res[k] < o.cost[k]); return `<button data-qc="${i}" ${lack ? 'disabled' : ''}>${esc(o.l)}${sk}</button>`; }).join('')}</div>`;
    } else if (q.view === 'end') {
      const g = Object.entries(q.rep.got).map(([k, v]) => `<span class="chip g">+${nf(v)} ${D.RES_NAME[k]}</span>`).join('') + q.rep.gear.map(x => `<span class="chip" style="color:#ffd76a">${esc(x)}</span>`).join('') + (q.rep.joined || []).map(x => `<span class="chip g">${esc(x)} joins</span>`).join('');
      center = `<h3>${q.defend ? (q.rep.failed ? (q.rep.fled ? 'The Gate is lost. They are inside.' : 'The Gate fell.') : 'The Gate held.') : q.rep.failed ? (q.rep.fled ? 'You ran.' : 'Nobody came back.') : 'Quest complete'}</h3><div style="margin:6px 0">${g || '<span class="chip r">Nothing brought home</span>'}</div>${q.rep.dead.length ? `<p class="qt r">Lost: ${esc(q.rep.dead.join(', '))}</p>` : ''}<div class="qbtns"><button data-qa="finish" class="a1">${q.defend ? 'Back inside' : 'Head home'}</button></div>`;
    } else center = `<p class="qt">${esc(q.text)}</p><div class="qbtns"><button data-qa="next" class="a1">Continue</button></div>`;
    const dice = last ? `<div class="qdice">${last.roll.dice.map(v => dieHtml(v, last.roll.crit && (v === 1 || v === 10) ? 'c' : v >= last.roll.dr ? 'y' : '')).join('')}<small>vs DR ${last.roll.dr}</small></div>` : '<div class="qdice"></div>';
    const stages = d.stages.map((s, i) => `<i class="${i < q.stage ? 'd' : i === q.stage ? 'n' : ''}"></i>`).join('');
    app.innerHTML = `<div id="qs" style="background-image:linear-gradient(#0003,#0000 30%,#0007),url(art/${d.bg || 'quests/' + d.art}.webp)"><div id="qhead"><b>${esc(d.name)}</b><span class="stg">${stages}</span>${sndBtns()}<div class="auto qa"><button id="auto" class="${auto.on ? 'on' : ''}">${auto.on ? 'Stop' : 'Autoplay'}</button>${[1, 2, 4, 8].map(v => `<button data-sp="${v}" class="${auto.speed === v ? 'sp' : ''}">${v}x</button>`).join('')}</div></div><div id="qfield">${heroes}${foes}${tracer}</div></div>
      <div id="qpanel"><div class="qc ${busy && !auto.on ? 'lock' : ''}">${center}</div><div class="qr">${dice}<div class="qlog">${lines.slice(-7).map(l => `<div class="${l.k}">${esc(l.t)}</div>`).join('')}</div></div></div>`;
    $('auto').onclick = () => setAuto(!auto.on);
    document.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => setSpeed(+b.dataset.sp));
    bindSnd();
    $('qfield').onclick = ev => { if (qShown < q.log.length && !ev.target.closest('[data-foe],[data-hero]')) { qShown++; renderQuest(); } }; // click the scene to move the words along
    const again = () => { save(); if (S.quest) renderQuest(); else render(); };
    document.querySelectorAll('[data-hero]').forEach(b => b.onclick = () => { qActive = +b.dataset.hero; again(); });
    document.querySelectorAll('[data-foe]').forEach(b => b.onclick = () => {
      if (qShown < q.log.length || !qActive) return;
      const i = +b.dataset.foe;
      if (qMode === 'feint') { Q.feint(S, qActive, i); qMode = 'attack'; } else Q.attack(S, qActive, i);
      blip(520); again();
    });
    document.querySelectorAll('[data-qi]').forEach(b => b.onclick = () => { if (qShown < q.log.length || !qActive) return; if (!Q.useItem(S, qActive, +b.dataset.qi)) toast('No use for that right now.'); blip(420); again(); });
    document.querySelectorAll('[data-qc]').forEach(b => b.onclick = () => { if (qShown < q.log.length) return; Q.choose(S, +b.dataset.qc); blip(440); again(); });
    document.querySelectorAll('[data-qa]').forEach(b => b.onclick = () => {
      const a = b.dataset.qa;
      if (a === 'attack' || a === 'feint') { qMode = a; return again(); }
      if (qShown < q.log.length) return;
      if (a === 'patch') { const t = team.filter(p => p.alive && p.hp < E.maxHp(p)).sort((x, y) => x.hp - y.hp)[0]; if (t && qActive) Q.patch(S, qActive, t.id); else toast('Nobody needs it.'); }
      if (a === 'end') Q.endTurn(S);
      if (a === 'flee') Q.flee(S);
      if (a === 'next') Q.next(S);
      if (a === 'finish') { Q.finish(S); qShown = 0; }
      blip(300); again();
    });
  }

  // ---------- autoplay: the same bot the balance tests use, slowed down so you can watch it
  function setAuto(on) {
    auto.on = on; auto.showing = null; clearTimeout(auto.timer);
    if (on) { sel = roomSel = null; modal = null; auto.planned = -1; autoStep(); } else render();
    render();
  }
  function setSpeed(v) { auto.speed = v; try { localStorage.setItem('tofu.shelter.speed', v); } catch (e) { } if (S) render(); if (auto.on) { clearTimeout(auto.timer); autoAfter(200); } }
  function autoAfter(ms) { clearTimeout(auto.timer); if (auto.on) auto.timer = setTimeout(autoStep, ms / auto.speed); }
  function autoStep() {
    if (!auto.on || !S) return;
    if (drag || modal) return autoAfter(500 * auto.speed);
    if (S.quest) {
      if (qShown < S.quest.log.length) return autoAfter(300);
      globalThis.ShelterBot.questStep(S); save();
      if (!S.quest) qShown = 0;
      render();
      return autoAfter(S.quest && S.quest.view === 'fight' ? 800 : 2200);
    }
    if (S.over && !S.queue.length) { render(); return; }
    if (S.queue.length) {
      if (TW.vote) return autoAfter(400);
      if (O.autoPause && ['at32', 'kept', 'raid', 'strike', 'cult', 'toll'].includes(S.queue[0].k)) { setAuto(false); toast('Autoplay paused for a big decision.'); return; }
      if (auto.showing !== S.queue[0]) { auto.showing = S.queue[0]; const c = E.current(S); return autoAfter(c.report ? 3000 : c.fights || c.fight ? 2600 : 2000); }
      E.decide(S, globalThis.ShelterBot.choose(S, E.current(S))); auto.showing = null; save(); render();
      return autoAfter(300);
    }
    if (S.raidNow) { render(); return autoAfter(300); }
    if (auto.planned !== S.day) {
      auto.planned = S.day;
      const before = new Map(E.living(S).map(p => [p.id, spot(p)]));
      const notes = globalThis.ShelterBot.plan(S);
      if (!S.quest) E.living(S).forEach(p => { const a = before.get(p.id); if (a) startWalk(p, a, spot(p)); });
      render();
      if (notes.length && auto.speed <= 2) toast(notes.join(' '));
      return autoAfter(1500);
    }
    endDay();
    return autoAfter(900);
  }

  // ---------- modals
  function drawOver() {
    over.innerHTML = '';
    if (S && S.queue.length && !modal) return decisionModal();
    if (S && S.queue.length && modal && modal.k !== 'dice' && modal.k !== 'replay') return decisionModal();
    if (!modal) return;
    if (modal.k === 'help') return helpModal();
    if (modal.k === 'run') return runModal();
    if (modal.k === 'quest') return questModal();
    if (modal.k === 'replay') return replayModal();
    if (modal.k === 'opts') return optsModal();
    if (modal.k === 'laws') return lawsModal();
    if (modal.k === 'talk') return talkModal();
    if (modal.k === 'rename') return renameModal();
    if (modal.k === 'gear') return gearModal();
    if (modal.k === 'build') return buildModal();
    if (modal.k === 'craft') return craftModal();
    if (modal.k === 'trade') return tradeModal();
    if (modal.k === 'wall') return wallModal();
    if (modal.k === 'dice') return diceModal();
  }
  const show = (html, cls = '') => { over.innerHTML = `<div class="modal"><div class="box ${cls}">${html}</div></div>`; over.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { modal = null; render(); }); };
  const artHtml = a => {
    if (!a) return '';
    if (a.p) return `<div class="dart"><img src="${kitSrc(a.p, 'base')}"></div>`;
    if (a.d) return `<div class="dart"><img src="${kitSrc(a.d, 'damned')}"></div>`;
    if (a.m) return `<div class="dart cov"><img src="art/foes/${a.m}.webp"></div>`;
    if (a.u && /^card_/.test(a.u)) return `<div class="dart cov"><img src="${(globalThis.GEN_IMG || {})[a.u] || 'art/rooms/radio.webp'}"></div>`;
    if (a.u) return `<div class="dart"><img src="art/ui/${a.u}.webp"></div>`;
    if (a.s) return `<div class="dart cov"><img src="art/ui/strike.webp"></div>`;
    if (a.q) return `<div class="dart cov"><img src="art/rooms/radio.webp"></div>`;
    return '';
  };
  const fightHtml = (f, i) => `<div class="floglist" id="flog${i}" style="display:none">${f.lines.map(l => `<div class="${l.k}">${esc(l.t)}</div>`).join('')}</div>`;
  function decisionModal() {
    const c = E.current(S); if (!c) return;
    if (lastCard !== S.queue[0]) { lastCard = S.queue[0]; SA.sfx(c.key === 'strike' || c.key === 'q_end' ? 'strike' : ['at32', 'kept', 'cleared', 'passing'].includes(c.key) ? 'sting' : c.key === 'raid' ? 'alarm' : c.key === 'note' && /11th Hour/.test(c.title) ? 'sting' : 'ui'); }
    let body = '', fights = c.fights || (c.fight ? [c.fight] : []);
    if (c.report) {
      const r = c.report, chip = Object.entries(r.got).map(([k, v]) => `<span class="chip g">+${nf(v)} ${D.RES_NAME[k]}</span>`).join('') + r.gear.map(g => `<span class="chip" style="color:#ffd76a">${esc(g)}</span>`).join('');
      fights = r.fights;
      body = r.story ? `<p class="t" style="margin-bottom:6px">${esc(r.story)}</p><div style="margin:8px 0">${chip || '<span class="chip r">Came home with nothing</span>'}</div>` : `<p class="t" style="margin-bottom:4px">${esc(r.team.join(' and '))} went to ${esc(r.place)} on ${esc(r.street)}. It was ${r.status.toLowerCase()}.</p>
        ${r.notes.map(n => `<p class="ft" style="color:#ffc3a8;font-size:14px">${esc(n)}</p>`).join('')}
        ${r.dead.length ? `<p class="t r" style="margin-top:8px"><b>${esc(r.dead.join(' and '))} did not come back.</b></p>` : ''}
        <div style="margin:8px 0">${chip || '<span class="chip r">Came home with nothing</span>'}</div>
        <div class="finds">${r.finds.filter((f, i, a) => a.findIndex(g => g.t === f.t) === i).map(f => `<div class="${f.none ? 'none' : f.gear ? 'y' : f.res ? 'g' : ''}">${esc(f.t.replace(/<\/?b>/g, '').replace(/\s*\([^)]*(lbs?|oz|per)[^)]*\)/gi, ''))}</div>`).join('')}</div>
        ${r.left.length ? `<p class="ft">Had to leave behind: ${esc(r.left.slice(0, 5).join(', '))}${r.left.length > 5 ? ` and ${r.left.length - 5} more` : ''}.</p>` : ''}`;
    } else body = `<p class="t">${esc(c.text || '')}</p>`;
    const foes = c.foes ? `<div class="foes">${c.foes.filter(f => f.art).slice(0, 8).map(f => `<img src="art/foes/${f.art}.webp" title="${esc(f.n)}">`).join('')}</div>` : '';
    const flog = fights.map((f, i) => `<button class="btn" style="margin:3px 6px 3px 0" data-flog="${i}">${f.won ? 'Won' : f.fled ? 'Ran' : 'Lost'} at ${esc(f.where)}: read it</button><button class="btn a1" style="margin:3px 6px 3px 0" data-watch="${i}">Watch it</button>${fightHtml(f, i)}`).join('');
    const voting = canVote(c), choices = c.choices.map((t, i) => `<button data-ch="${i}">${voting ? `<span class="vkey">!${i + 1}</span> ` : ''}${esc(t)}${voting ? ` <em class="vcnt" data-v="${i}"></em>` : ''}</button>`).join('') + (voting ? '<div id="tvote" class="tvote"></div>' : '');
    const art = artHtml(c.art);
    const big = ['at32', 'cleared', 'kept', 'q_end', 'passing'].includes(c.key);
    show(`<h2>${esc(c.title)}</h2>${c.key === 'at32' ? `<div class="cd32">${(() => { const x = pOf(S.queue[0].p.id); return x && x.wait ? `${x.wait.days} day${x.wait.days > 1 ? 's' : ''}` : ''; })()}</div>` : ''}<div class="dcard">${art}<div style="flex:1;min-width:0">${foes}${body}${flog}<div class="choices">${choices}</div></div></div>`, big ? 'big32' : c.report ? 'wide' : '');
    over.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { blip(440); E.decide(S, +b.dataset.ch); save(); render(); });
    startVote(c);
    over.querySelectorAll('[data-watch]').forEach(b => b.onclick = () => { modal = { k: 'replay', f: fights[+b.dataset.watch], i: 0 }; drawOver(); });
    over.querySelectorAll('[data-flog]').forEach(b => b.onclick = () => { const el = $('flog' + b.dataset.flog); el.style.display = el.style.display === 'none' ? 'block' : 'none'; });
  }
  function runModal() {
    const m = modal, sites = S.sites.slice().sort((a, b) => (a.visits >= 3) - (b.visits >= 3) || a.miles - b.miles);
    const riskyName = s => (s.visits ? E.STATUS_NAME[s.status] : 'Not searched yet');
    const team = E.home(S).filter(p => !p.sealed);
    const hasG = S.rooms.some(r => r.type === 'garage');
    const site = m.site && S.sites.find(s => s.id === m.site), who = m.team.map(pOf);
    const carry = who.length ? E.teamCarry(S, who, m.truck) : 0, w = D.WEATHER[S.weather];
    const fuelC = site ? 2 + Math.ceil(site.miles / 3) : 3;
    show(`<h2>Send a Run</h2><div class="cols"><div><div class="ft">Where to</div><div class="list" style="max-height:540px">${sites.map(s => `<div class="site ${m.site === s.id ? 'on' : ''} ${s.visits >= 3 ? 'off' : ''}" data-site="${s.id}"><div><b>${esc(s.name)}</b><small>${esc(s.street)} &middot; ${s.miles} mile${s.miles > 1 ? 's' : ''}${s.big ? ' &middot; Big place' : ''}</small></div><div style="text-align:right"><small>${s.visits >= 3 ? 'Picked clean' : riskyName(s)}</small><small class="${s.hot ? 'r' : ''}">${s.hot ? 'Hot zone' : ''}</small></div></div>`).join('')}</div></div>
      <div><div class="ft">Team (${who.length})</div><div class="list" style="max-height:300px">${team.map(p => `<div class="tm ${m.team.includes(p.id) ? 'on' : ''}" data-tm="${p.id}"><div class="h"><img src="${img(p)}"></div><b>${esc(p.name)}</b> <span class="ft">${E.classNameOf(p)} L${p.level}</span><small>HP ${p.hp}/${E.maxHp(p)} &middot; DMD ${p.dmd}${E.gear(S, p.weapon) ? ' &middot; armed' : ' &middot; no weapon'}${p.room && E.roomOf(S, p.room) ? ` &middot; <span class="r">leaves ${D.ROOMS[E.roomOf(S, p.room).type].name}</span>` : ''}</small></div>`).join('')}</div>
      <div class="ft" style="margin-top:10px">Hours searching</div><div style="display:flex;gap:6px;margin:4px 0">${[1, 2, 3, 4].map(h => `<button class="btn" style="flex:1;${m.hours === h ? 'background:#37602a' : ''}" data-h="${h}">${h}</button>`).join('')}</div>
      <p class="ft">More hours find more. Each hour has a ${site && site.hot ? '2 in 10' : '1 in 10'} chance of drawing trouble.</p>
      ${hasG ? `<div class="tm ${m.truck ? 'on' : ''}" data-truck="1"><b>Take the truck</b><small>+200 lbs, ${fuelC} fuel</small></div>` : ''}
      <p class="ft" style="margin:6px 0">Carry limit: ${carry} lbs. ${w.dr ? `<span class="r">${w.n} today: anyone outside rolls against DR ${w.dr}.</span>` : 'Dry today.'}</p>
      <div class="acts"><button class="a1" id="go" ${site && who.length ? '' : 'disabled'}>Send them</button><button data-close="1">Cancel</button></div></div></div>`, 'wide');
    over.querySelectorAll('[data-site]').forEach(b => b.onclick = () => { const s = S.sites.find(x => x.id === +b.dataset.site); if (s.visits < 3) { m.site = s.id; drawOver(); } });
    over.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { const id = +b.dataset.tm; m.team = m.team.includes(id) ? m.team.filter(x => x !== id) : [...m.team, id]; drawOver(); });
    over.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { m.hours = +b.dataset.h; drawOver(); });
    const tr = over.querySelector('[data-truck]'); if (tr) tr.onclick = () => { m.truck = !m.truck; drawOver(); };
    if ($('go')) $('go').onclick = () => { const from = m.team.map(id => [pOf(id), spot(pOf(id))]); if (E.startRun(S, m.site, m.team, m.hours, m.truck && hasG)) { from.forEach(([p, a]) => startWalk(p, a, { x: SHAFT, row: -1, key: 'hatch' })); modal = null; blip(350); save(); render(); } else toast('Not enough fuel for the truck.'); };
  }
  function freeGear() { return S.gear.filter(g => !S.people.some(p => p.alive && (p.weapon === g.id || p.armor === g.id))); }
  const gearLine = g => `${esc(g.n)} <span class="ft">${g.kind === 'armor' ? `${g.acl} armor, AR ${g.ar}` : (g.tr || []).join(', ')}${g.cond !== 'Standard' ? ` &middot; ${g.cond}` : ''}</span>`;
  const ICON = g => (globalThis.GEN_ICONS || {})[g.n] || GEN_ITEM.backpack;
  function gearModal() {
    const all = S.people.filter(p => p.alive && !p.sealed);
    if (!modal.id || !pOf(modal.id) || !all.includes(pOf(modal.id))) modal.id = (all[0] || {}).id;
    const p = pOf(modal.id), tab = modal.tab || 'weapons'; if (!p) return show('<h2>Inventory</h2><p>Nobody left.</p><button class="btn w100" data-close="1">Close</button>');
    const w = E.gear(S, p.weapon), a = E.gear(S, p.armor), pk = E.packOf(p), busy = p.away, owner = g => S.people.find(o => o.alive && (o.weapon === g.id || o.armor === g.id));
    const roster = all.map(o => `<button class="ip ${o.id === p.id ? 'on' : ''}" data-ip="${o.id}"><div class="h"><img src="${img(o)}"></div><b>${esc(o.name)}</b><small>${o.away ? 'Out' : E.classNameOf(o)}</small></button>`).join('');
    const slot = (label, ic, name, sub, attr) => `<button class="islot ${name ? '' : 'empty'}" ${attr} ${busy || !name ? 'disabled' : ''} title="${name ? 'Click to put it away' : ''}"><span>${label}</span>${ic ? `<img src="${ic}">` : '<i></i>'}<b>${name ? esc(name) : 'Empty'}</b><small>${sub || ''}</small></button>`;
    const ln = g => g.kind === 'armor' ? `${g.acl} armor, AR ${g.ar}` : (g.tr || []).join(', ') || (g.gun ? 'Firearm' : g.kind === 'ranged' ? 'Ranged' : 'Melee');
    const slots = slot('Weapon', w && ICON(w), w && w.n, w && ln(w) + (w.cond !== 'Standard' ? ` &middot; ${w.cond}` : ''), 'data-un="weapon"') + slot('Armor', a && ICON(a), a && a.n, a && ln(a), 'data-un="armor"') + [0, 1].map(i => { const x = pk[i], d = x && D.ITEMS[x.k]; return slot('Carried', x && GEN_ITEM[x.k], d && d.n + (x.u > 1 ? ` (${x.u})` : ''), d && d.d, `data-unp="${i}"`); }).join('');
    const gearCard = g => { const o = owner(g), mine = o && o.id === p.id; return `<button class="icard ${mine ? 'mine' : ''}" data-eq="${g.id}" ${busy || mine ? 'disabled' : ''}><img src="${ICON(g)}"><b>${esc(g.n)}</b><small>${esc(ln(g))}${g.cond !== 'Standard' ? ` &middot; ${g.cond}` : ''}</small><em>${mine ? 'Equipped' : o ? `${esc(o.name)} has it` : 'In storage'}</em></button>`; };
    const it = E.items(S);
    const lists = { weapons: S.gear.filter(g => g.kind !== 'armor'), armor: S.gear.filter(g => g.kind === 'armor') };
    const cards = tab === 'supplies' ? Object.keys(D.ITEMS).filter(k => it[k] > 0).map(k => { const d = D.ITEMS[k]; return `<div class="icard sup"><img src="${GEN_ITEM[k]}"><b>${esc(d.n)} <u>x${it[k]}</u></b><small>${esc(d.d)}</small><span class="ib"><button data-pk="${k}" ${busy || pk.length >= E.PACK ? 'disabled' : ''}>Carry</button>${d.home ? `<button data-use="${k}" ${busy ? 'disabled' : ''}>Use</button>` : ''}</span></div>`; }).join('') : lists[tab].slice().sort((x, y) => !!owner(x) - !!owner(y)).map(gearCard).join('');
    const empty = { weapons: 'No weapons yet. Runs find them and the Workshop makes them.', armor: 'No armor yet. Runs find it and the Workshop makes it.', supplies: 'No supplies. Runs turn them up, quests pay in them, and the Workshop makes some.' }[tab];
    show(`<div class="inv"><div class="ihead"><h2>Inventory</h2><div class="itabs">${[['weapons', 'Weapons', lists.weapons.length], ['armor', 'Armor', lists.armor.length], ['supplies', 'Supplies', Object.values(it).filter(v => v > 0).length]].map(([k, l, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l} <small>${n}</small></button>`).join('')}</div><button class="btn" data-close="1">Close</button></div>
      <div class="iros">${roster}</div>
      <div class="ibody"><div class="idoll"><div class="ifig">${fig(p, 330, 1)}</div><h3>${esc(p.name)} <small>${E.classNameOf(p)} L${p.level}</small></h3><p class="ft">HP ${p.hp} / ${E.maxHp(p)} &middot; AR ${a ? a.ar : 0}${busy ? ' &middot; out on a run' : ''}</p><div class="islots">${slots}</div></div><div class="igrid">${cards || `<p class="t">${empty}</p>`}</div></div></div>`, 'inv-w');
    over.querySelectorAll('[data-ip]').forEach(b => b.onclick = () => { modal.id = +b.dataset.ip; drawOver(); });
    over.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { modal.tab = b.dataset.tab; drawOver(); });
    over.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { E.equip(S, p, E.gear(S, +b.dataset.eq)); blip(520); save(); drawOver(); });
    over.querySelectorAll('[data-un]').forEach(b => b.onclick = () => { E.unequip(S, p, b.dataset.un); blip(300); save(); drawOver(); });
    over.querySelectorAll('[data-unp]').forEach(b => b.onclick = () => { E.unpack(S, p, +b.dataset.unp); blip(300); save(); drawOver(); });
    over.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { E.pack(S, p, b.dataset.pk); blip(520); save(); drawOver(); });
    over.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const t = E.useAtHome(S, p, b.dataset.use); toast(t || `${p.name} doesn't need that.`); save(); drawOver(); });
  }
  // ---------- Twitch: chat votes, viewers as survivors, chat in speech bubbles
  E.nameHook = () => TW.next();
  TW.onChange = () => { if (modal && modal.k === 'opts' && modal.tab === 'twitch') drawOpts(); };
  TW.onTalk = (who, text) => { if (!O.tw.talk || !S || S.quest || modal) return; const p = E.home(S).find(x => x.viewer && x.name.toLowerCase() === who.toLowerCase()); if (!p) return; bub.day = S.day; bub.map = { ...bub.map, [p.id]: text }; bub.until = Date.now() + 6000; render(); };
  const canVote = c => TW.connected() && O.tw.vote && c.choices.length > 1 && !c.report;
  function startVote(c) {
    const key = S.queue[0];
    if (!canVote(c)) { TW.vote = null; return; }
    if (!TW.vote || TW.vote.key !== key) TW.vote = { key, n: Math.min(c.choices.length, 9), tally: {}, end: Date.now() + O.tw.secs * 1000 };
    drawVote();
  }
  function drawVote() { const v = TW.vote, el = $('tvote'); if (!v || !el) return; const c = TW.counts(), left = Math.max(0, Math.ceil((v.end - Date.now()) / 1000)); el.innerHTML = `<b>Chat is voting: type ${Array.from({ length: v.n }, (_, i) => '!' + (i + 1)).join(', ').replace(/, ([^,]*)$/, ' or $1')}</b><span>${left}s</span><i><u style="width:${left / O.tw.secs * 100}%"></u></i>`; over.querySelectorAll('.vcnt').forEach(e => { e.textContent = c[+e.dataset.v] ? `${c[+e.dataset.v]} vote${c[+e.dataset.v] > 1 ? 's' : ''}` : ''; }); }
  setInterval(() => { const v = TW.vote; if (!v) return; if (!S || S.queue[0] !== v.key) { TW.vote = null; return; } if (Date.now() < v.end) return drawVote(); const c = TW.counts(), top = Math.max(...c), best = c.map((n, i) => (n === top ? i : -1)).filter(i => i >= 0), pickd = best[Math.floor(Math.random() * best.length)]; TW.vote = null; const b = over.querySelector(`[data-ch="${pickd}"]`); if (b) b.click(); else { E.decide(S, pickd); save(); render(); } toast(top ? `Chat chose option ${pickd + 1} with ${top} vote${top > 1 ? 's' : ''}.` : 'Nobody voted. Fate picks.'); }, 250);

  // ---------- options
  function openOpts() { modal = { k: 'opts', tab: 'sound' }; drawOpts(); }
  function closeOpts() { modal = null; over.innerHTML = ''; if (S) render(); }
  function optsModal() { drawOpts(); }
  function drawOpts() {
    const tab = modal.tab, sl = (k, l) => `<label class="orow"><span>${l}</span><input type="range" min="0" max="100" value="${O[k]}" data-sl="${k}"><b id="v_${k}">${O[k]}</b></label>`;
    const tog = (k, l, sub) => `<button class="orow otog ${O[k] ? 'on' : ''}" data-tog="${k}"><span>${l}${sub ? `<small>${sub}</small>` : ''}</span><em>${O[k] ? 'On' : 'Off'}</em></button>`;
    const twt = (k, l, sub) => `<button class="orow otog ${O.tw[k] ? 'on' : ''}" data-tw="${k}"><span>${l}${sub ? `<small>${sub}</small>` : ''}</span><em>${O.tw[k] ? 'On' : 'Off'}</em></button>`;
    const seg = (k, l, list, sub, tw) => `<div class="orow"><span>${l}${sub ? `<small>${sub}</small>` : ''}</span><div class="oseg">${list.map(([v, t]) => `<button class="${(tw ? O.tw[k] : O[k]) === v ? 'on' : ''}" data-seg="${k}" data-val="${v}" ${tw ? 'data-t="1"' : ''}>${t}</button>`).join('')}</div></div>`;
    let body = '';
    if (tab === 'sound') body = sl('music', 'Music') + sl('amb', 'Wind and ambience') + sl('sfx', 'Sound effects') + `<p class="ft">Music by Tanner Helland (CC BY 4.0) is fine to play on stream. Keep the credit in your stream description.</p>`;
    if (tab === 'game') body = seg('speed', 'Combat text speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']]) + tog('bubbles', 'Speech bubbles') + tog('numbers', 'Damage numbers') + tog('hints', 'Beginner hints') + tog('autoPause', 'Autoplay stops for big decisions', 'Turning at 32 DMD, raids, the 11th Hour');
    if (tab === 'display') body = seg('motion', 'Character motion', [['full', 'Full'], ['low', 'Low'], ['off', 'Still']], 'Low keeps walking but stops idle swaying') + tog('flash', 'Hit flashes', 'Turn off if flashing bothers you') + tog('bigText', 'Larger text') + tog('cbDice', 'Colorblind dice', 'Successes turn blue with a mark') + `<button class="orow otog" id="ofull"><span>Fullscreen<small>F key</small></span><em>Toggle</em></button><div class="okeys"><b>Keys</b> Enter End Day &middot; Space Pause / resume autoplay &middot; A Autoplay &middot; 1 2 3 4 Autoplay speed &middot; I Inventory &middot; R Send a Run &middot; Q Quests &middot; M Music &middot; O Options &middot; F Fullscreen &middot; Esc Close</div>`;
    if (tab === 'save') body = `<p class="t">Back up your shelter or move it to another browser.</p><textarea id="osv" spellcheck="false" placeholder="Press Copy save, or paste a save here and press Load it."></textarea><div class="acts"><button id="ocopy">Copy save</button><button id="oload">Load it</button></div><div class="acts" style="margin-top:14px"><button id="odef">Reset all options</button><button class="a3" id="odel">${modal.del ? 'Press again to erase your save' : 'Erase save'}</button></div><p class="ft" id="omsg"></p>`;
    if (tab === 'twitch') { const st = TW.status; body = `<p class="ft">Read-only: the game only listens to your chat, so it needs no login or password. Twitch works from <b>Play TOFU Shelter.bat</b> on your PC. It can't connect from the web link.</p><div class="orow"><span>Your channel</span><div class="oseg"><input id="twch" value="${esc(TW.channel || O.tw.channel)}" placeholder="channel name" spellcheck="false" autocomplete="off"><button id="twgo" class="${st === 'on' ? 'on' : ''}">${st === 'off' ? 'Connect' : 'Disconnect'}</button></div></div><p class="twst ${st}">${st === 'on' ? `Connected to #${esc(TW.channel)}` : st === 'wait' ? esc(TW.note) : esc(TW.note) || 'Not connected'}</p>` + twt('vote', 'Chat votes on decisions', 'Viewers type !1, !2, !3. Autoplay waits for the vote.') + seg('secs', 'Voting time', [[15, '15s'], [30, '30s'], [60, '60s']], '', true) + twt('join', 'Viewers become survivors', 'Viewers type !join. The next survivors found get their names.') + twt('talk', 'Survivors say their viewer\'s chat', 'Off by default, because chat lines appear on screen') + `<label class="orow"><span>Blocked words<small>Comma separated. Links are always blocked.</small></span><input id="twbl" value="${esc(O.tw.block)}" spellcheck="false" autocomplete="off"></label><div class="okeys"><b>Waiting to join (${TW.queue.length})</b> ${TW.queue.map((n, i) => `<button class="qx" data-qx="${i}" title="Remove">${esc(n)} &times;</button>`).join('') || 'Nobody yet'}</div>`; }
    const T2 = [['sound', 'Sound'], ['game', 'Game'], ['display', 'Display'], ['save', 'Save'], ['twitch', 'Twitch']];
    over.innerHTML = `<div class="modal"><div class="box optb"><div class="ihead"><h2>Options</h2><div class="itabs">${T2.map(([k, l]) => `<button data-otab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><button class="btn" id="oclose">Done</button></div><div class="obody">${body}</div></div></div>`;
    const q = s => [...over.querySelectorAll(s)];
    $('oclose').onclick = closeOpts;
    q('[data-otab]').forEach(b => b.onclick = () => { modal.tab = b.dataset.otab; modal.del = false; drawOpts(); });
    q('[data-sl]').forEach(i => i.oninput = () => { O[i.dataset.sl] = +i.value; $('v_' + i.dataset.sl).textContent = i.value; OP.save(); OP.apply(); });
    q('[data-tog]').forEach(b => b.onclick = () => { O[b.dataset.tog] = !O[b.dataset.tog]; OP.save(); OP.apply(); drawOpts(); });
    q('[data-tw]').forEach(b => b.onclick = () => { O.tw[b.dataset.tw] = !O.tw[b.dataset.tw]; OP.save(); drawOpts(); });
    q('[data-seg]').forEach(b => b.onclick = () => { const raw = b.dataset.val, v = /^\d+$/.test(raw) ? +raw : raw; if (b.dataset.t) O.tw[b.dataset.seg] = v; else O[b.dataset.seg] = v; OP.save(); OP.apply(); drawOpts(); });
    if ($('ofull')) $('ofull').onclick = toggleFull;
    if ($('ocopy')) $('ocopy').onclick = () => { const v = (() => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } })(); const t = $('osv'); t.value = v; t.select(); const done = () => { $('omsg').textContent = v ? 'Copied. Keep it somewhere safe.' : 'No save yet.'; }; if (navigator.clipboard && v) navigator.clipboard.writeText(v).then(done, () => { $('omsg').textContent = 'Selected. Press Ctrl+C to copy.'; }); else done(); };
    if ($('oload')) $('oload').onclick = () => { try { const v = JSON.parse($('osv').value); if (!v || !v.people || !v.rooms) throw 0; S = v; sel = roomSel = null; save(); closeOpts(); toast('Save loaded.'); } catch (e) { $('omsg').textContent = "That isn't a valid save."; } };
    if ($('odef')) $('odef').onclick = () => { OP.reset(); drawOpts(); };
    if ($('odel')) $('odel').onclick = () => { if (!modal.del) { modal.del = true; return drawOpts(); } wipeSave(); modal = null; over.innerHTML = ''; S = null; title(); };
    if ($('twgo')) $('twgo').onclick = () => { if (TW.status === 'off') { O.tw.channel = $('twch').value.trim(); OP.save(); TW.connect(O.tw.channel); } else TW.close(); drawOpts(); };
    if ($('twbl')) $('twbl').onchange = () => { O.tw.block = $('twbl').value; OP.save(); };
    q('[data-qx]').forEach(b => b.onclick = () => TW.remove(+b.dataset.qx));
  }
  function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('Fullscreen is not allowed here.')); } catch (e) { toast('Fullscreen is not allowed here.'); } }
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal && modal.k === 'opts') { closeOpts(); e.stopImmediatePropagation(); return; }
    if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'o') { if (modal && modal.k === 'opts') closeOpts(); else if (!modal) openOpts(); return; }
    if (k === 'f') return toggleFull();
    if (k === 'm') { SA.toggle('music'); if (S) render(); return; }
    if (k === ' ' && S && !S.over && document.getElementById('hud') || (k === ' ' && S && S.quest)) { e.preventDefault(); setAuto(!auto.on); toast(auto.on ? 'Autoplay on' : 'Paused'); return; }
    if (!S || modal || S.queue.length) return;
    if (k === 'a') setAuto(!auto.on);
    if (['1', '2', '3', '4'].includes(k)) setSpeed({ 1: 1, 2: 2, 3: 4, 4: 8 }[k]);
    if (S.quest) return;
    if (k === 'i' && $('nstore')) $('nstore').click();
    if (k === 'r' && $('nrun')) $('nrun').click();
    if (k === 'q' && $('nquest')) $('nquest').click();
  });

  // ---------- personality on the person panel
  function dogHtml(p) {
    if (p.damned || p.sealed) return '';
    const d = E.dogOf(S, p), free = E.dogs(S).filter(x => x.alive && !x.owner && !x.pup);
    if (d) { const kennel = S.rooms.some(r => r.type === 'kennel'), role = d.role ? E.ROLES[d.role] : null; return `<div class="sec dog"><h3>Dog: ${esc(d.name)} <button class="rnm" data-a="rndog">Rename</button></h3><p>${esc(d.breed)}${d.pup ? ', puppy' : ''}. Health ${d.hp} / ${d.max}${d.kills ? `, ${d.kills} kills` : ''}. <b>${role ? role[0] : 'Untrained'}</b>: ${role ? esc(role[1]) : `+${1 + d.bite} dice in melee, and sometimes takes the hit.`}${d.training ? ` <span class="g">Training as ${E.ROLES[d.training.role][0]}, ${d.training.left} days left${E.staffed(S, 'kennel') ? '' : ' (needs someone working the Kennel)'}.</span>` : ''}</p><div class="acts">${!d.pup ? Object.entries(E.ROLES).filter(([k]) => k !== d.role && !(d.training && d.training.role === k)).map(([k, v]) => `<button data-a="train:${k}" ${kennel ? '' : 'disabled title="Build a Kennel to train dogs"'}>Train: ${v[0]}</button>`).join('') : ''}<button data-a="undog">Leave ${esc(d.name)} home</button></div></div>`; }
    return free.length ? `<div class="sec dog"><h3>Dog</h3><div class="acts">${free.slice(0, 4).map(x => `<button data-a="dog:${x.id}">Take ${esc(x.name)}</button>`).join('')}</div></div>` : (p.dogCollar ? `<div class="sec dog"><p class="ft">Still wears ${esc(p.dogCollar)}'s collar around ${p.he === 'he' ? 'his' : 'her'} wrist.</p></div>` : '');
  }
  function psyHtml(p) {
    const s = E.psy(p), code = E.typeOf(p), t = E.TYPES[code], part = E.partnerOf(S, p);
    const others = E.living(S).filter(o => o !== p).map(o => [o, E.rel(S, p, o)]).sort((x, y) => y[1] - x[1]);
    const best = others[0], worst = others[others.length - 1];
    const tr = (l, v) => `<div class="tr"><span>${l}</span><i><u style="width:${v * 10}%"></u></i></div>`;
    const near = E.home(S).filter(o => o !== p && !o.sealed);
    return `<div class="sec psy"><h3>${code} &middot; ${esc(t[0])}</h3><p class="ft">${esc(t[1])}</p><div class="ocean">${tr('Open', s.o)}${tr('Disciplined', s.c)}${tr('Outgoing', s.e)}${tr('Kind', s.a)}${tr('Anxious', s.n)}</div><p class="qk">${s.quirks.map(esc).join('. ')}.</p><p class="rl">${part ? `<b class="g">With ${esc(part.name)}.</b> ` : ''}${best && best[1] >= 15 ? `Closest to ${esc(best[0].name)} (${E.relWord(best[1])}). ` : ''}${worst && worst[1] <= -15 ? `<span class="r">Can't stand ${esc(worst[0].name)} (${E.relWord(worst[1])}).</span>` : ''}</p>${!p.away && !p.sealed ? `<div class="acts">${near.length ? '<button data-a="listen">Listen in</button>' : ''}<button data-a="chat">Talk to ${esc(p.name)}</button></div>` : ''}</div>`;
  }
  // ---------- live conversations, written by Claude from the game's state when the page can reach it
  let sampleFn = null, sampleOk = true;
  try { if (globalThis.claude && claude.use) claude.use('sample').then(f => { sampleFn = f; }).catch(() => { }); } catch (e) { }
  const WORLD = 'Setting: TOFU Earth Apocalypse, a grim tabletop RPG world. Eleven years ago an asteroid called the 11th Hour was found on course for Earth, and an AI called Q.U.E.S.T. was brought in to help; then the black rain came, carrying the infection. Now it is the last year of the countdown. Survivors hide in a makeshift underground shelter in the American Midwest under black rain. Infected people have a meter (DMD) that turns them at 32; some who turn stay themselves for a while and are called the Damned, feared and hated. A calm voice on the radio called Q.U.E.S.T. offers people "a way out" and nobody knows what she is. Never explain or confirm what Q.U.E.S.T. or the world really is. The 11th Hour is coming: debris will fall from the sky. Write like a gritty, adult, literary survival drama: specific, human, sometimes darkly funny, sometimes deeply unsettling. No modern brand names, no fantasy, no exposition dumps.';
  function shelterNow() {
    const n = E.needs(S), L = E.leader && E.leader(S), dead = S.memorial.slice(-3).map(m => `${m.name} (${m.why})`);
    return `Day ${S.day}. ${E.humans(S).length} alive. Food for ${n.food ? Math.floor(S.res.food / n.food) : 99} days, water for ${n.water ? Math.floor(S.res.water / n.water) : 99} days. ${L ? `Leader: ${L.name}. Order ${Math.round(S.order ?? 55)}/100. Laws: ${(S.laws || []).map(k => E.LAWS[k].n).join(', ') || 'none'}.` : 'Nobody leads.'} Recently lost: ${dead.join('; ') || 'nobody yet'}. Weather: ${D.WEATHER[S.weather].n}.`;
  }
  const history = (...ids) => (S.slog || []).filter(h => ids.some(i => h.ids.includes(i))).slice(-6).map(h => `Day ${h.d}: ${h.t}`).join('\n') || 'Nothing notable yet.';
  function fallbackTalk(a, b) {
    const w = E.pickTalk && E.pickTalk(S, a, b); if (w) { const r = E.rel(S, a, b), bad = ['fight', 'hunger', 'cold', 'damned'].includes(w.k) && r < 10; return { lines: w.lines, summary: '', rel: bad ? -3 : 3, sa: bad ? 1 : 0, sb: bad ? 1 : -1 }; }
    const r = E.rel(S, a, b), k = r <= -20 ? ['argue', 'grudge'] : r >= 40 ? ['confide', 'joke', 'comfort'] : ['joke', 'gossip', 'confide'];
    const lines = [], L = { joke: ['Day ${d}. Still breathing.', 'Could be worse. Could be raining. Oh wait.'], argue: ['Stay out of my way.', 'You first.'], grudge: ['I know what you took.', 'Prove it.'], confide: ['I can\'t sleep anymore.', 'Me neither. Sit.'], comfort: ['You okay?', 'No. But thanks for asking.'], gossip: ['You see how the leader looks at the stores?', 'I see everything.'] };
    const kk = k[Math.floor(Math.random() * k.length)], pair = L[kk];
    lines.push({ who: a, t: pair[0].replace('${d}', S.day) }, { who: b, t: pair[1] });
    return { lines, summary: 'An ordinary exchange.', rel: r <= -20 ? -2 : 2, sa: 0, sb: 0 };
  }
  function talkModal() {
    const m = modal, a = pOf(m.id); if (!a) { modal = null; return render(); }
    if (m.mode === 'listen') {
      if (!m.b) { const near = E.home(S).filter(o => o !== a && !o.sealed); const pickB = near.slice().sort((x, y) => Math.abs(E.rel(S, a, y)) + (y.room === a.room ? 30 : 0) - Math.abs(E.rel(S, a, x)) - (x.room === a.room ? 30 : 0))[0]; if (!pickB) { modal = null; return render(); } m.b = pickB.id; }
      const b = pOf(m.b);
      const head = `<div class="tk-head"><div class="h"><img src="${img(a)}"></div><b>${esc(a.name)}</b><span>${E.relWord(E.rel(S, a, b))} (${E.rel(S, a, b)})</span><b>${esc(b.name)}</b><div class="h"><img src="${img(b)}"></div></div>`;
      const body = m.res ? `<div class="tk-lines">${m.res.lines.map(l => `<div class="tl ${l.who === b ? 'r' : ''}"><b>${esc(l.who.name)}</b><p>${esc(l.t)}</p></div>`).join('')}</div><p class="ft tk-sum">${esc(m.res.summary || '')}${m.res.fx ? ` <b>${esc(m.res.fx)}</b>` : ''}</p>` : `<p class="t tk-wait">${m.err ? esc(m.err) : 'Listening...'}</p>`;
      show(`<h2>Overheard</h2>${head}${body}<div class="acts" style="margin-top:10px">${m.res ? `<button id="tk-again">Listen to someone else</button>` : '<span></span>'}<button data-close="1">Close</button></div>`, 'tkbox');
      if ($('tk-again')) $('tk-again').onclick = () => { const near = E.home(S).filter(o => o !== a && !o.sealed && o.id !== m.b); if (near.length) { m.b = near[Math.floor(Math.random() * near.length)].id; m.res = null; m.err = null; m.busy = false; drawOver(); } };
      if (!m.res && !m.busy) { m.busy = true; overhear(a, b, m); }
      return;
    }
    // chat: the player speaks as the shelter's leader (or just as "you")
    const L = E.leader && E.leader(S), me = L && L !== a ? L.name : 'the person in charge of the shelter';
    show(`<h2>Talking to ${esc(a.name)} <small class="ft">${E.typeOf(a)}, ${esc(E.typeName(a))}</small></h2><div class="tk-lines chat" id="tk-log">${m.turns.map(t => `<div class="tl ${t.role === 'user' ? 'r' : ''}"><b>${t.role === 'user' ? 'You' : esc(a.name)}</b><p>${esc(t.content)}</p></div>`).join('') || `<p class="ft">${sampleFn ? `Say anything. ${esc(a.name)} answers in character, from what is happening in the shelter.` : 'Live conversation works from the claude.ai play link, after you allow it. Here, people only answer in short phrases.'}</p>`}${m.busy ? `<div class="tl"><b>${esc(a.name)}</b><p id="tk-stream">...</p></div>` : ''}</div><form id="tk-form" class="tk-form"><input id="tk-in" maxlength="300" placeholder="Say something to ${esc(a.name)}" autocomplete="off" ${m.busy ? 'disabled' : ''}><button class="btn a1" ${m.busy ? 'disabled' : ''}>Say it</button></form><div style="margin-top:8px"><button class="btn w100" data-close="1">Close</button></div>`, 'tkbox');
    const log = $('tk-log'); if (log) log.scrollTop = log.scrollHeight;
    if ($('tk-in') && !m.busy) $('tk-in').focus();
    $('tk-form').onsubmit = ev => { ev.preventDefault(); const v = $('tk-in').value.trim(); if (!v || m.busy) return; m.turns.push({ role: 'user', content: v }); reply(a, me, m); };
  }
  async function overhear(a, b, m) {
    const done = r => { if (modal !== m) return; m.busy = false; if (r) { m.res = r; } drawOver(); };
    if (!sampleFn || !sampleOk) { const r = fallbackTalk(a, b); applyTalk(a, b, r); return done(r); }
    const prompt = `${WORLD}\n\nThe shelter now: ${shelterNow()}\n\nPerson A: ${E.profile(S, a)}\n\nPerson B: ${E.profile(S, b)}\n\nTheir relationship: ${E.relWord(E.rel(S, a, b))} (${E.rel(S, a, b)} on a scale from -100 to 100).\nTheir recent history:\n${history(a.id, b.id)}\n\nWrite a short, genuine private conversation between A and B, overheard tonight in the shelter. 4 to 8 lines, each one or two sentences. Let their personalities, quirks, needs and history drive it: they can argue, confess, flirt, scheme, comfort, joke, lie, or say something deeply unsettling. Make it specific to them, not generic. Then judge what it did to them.\nReply with only JSON: {"lines":[{"who":"A","text":"..."},{"who":"B","text":"..."}],"summary":"one plain sentence on what changed between them","relChange":integer from -15 to 15,"stressA":integer from -2 to 3,"stressB":integer from -2 to 3}`;
    try {
      const j = await sampleFn.json(prompt, { modelTier: 'default', cache: false });
      const lines = (Array.isArray(j.lines) ? j.lines : []).slice(0, 10).map(l => ({ who: String(l.who).trim().toUpperCase() === 'B' ? b : a, t: String(l.text || '').slice(0, 400) })).filter(l => l.t);
      if (!lines.length) throw { code: 'empty' };
      const r = { lines, summary: String(j.summary || '').slice(0, 300), rel: Math.max(-15, Math.min(15, Math.round(+j.relChange || 0))), sa: Math.max(-2, Math.min(3, Math.round(+j.stressA || 0))), sb: Math.max(-2, Math.min(3, Math.round(+j.stressB || 0))) };
      applyTalk(a, b, r); done(r);
    } catch (e) {
      if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'not_declared')) sampleOk = false;
      if (modal === m) { m.err = e && e.code === 'rate_limited' ? 'Too many conversations at once. Try again in a moment.' : null; }
      const r = fallbackTalk(a, b); applyTalk(a, b, r); done(r);
    }
  }
  function applyTalk(a, b, r) {
    E.addRel(S, a, b, r.rel); [[a, r.sa], [b, r.sb]].forEach(([p, n]) => { if (n > 0) E.addStress(S, p, n); else p.stress = Math.max(0, p.stress + n); });
    r.fx = `${r.rel >= 0 ? '+' : ''}${r.rel} between them.`;
    E.socialLog(S, [a.id, b.id], `Overheard, ${a.name} and ${b.name}: ${r.summary || r.lines.map(l => l.who.name + ': ' + l.t).join(' ').slice(0, 200)}`);
    save();
  }
  async function reply(a, me, m) {
    m.busy = true; drawOver();
    const finish = text => { m.turns.push({ role: 'assistant', content: text }); m.busy = false; E.socialLog(S, [a.id], `${a.name} talked with ${me}: "${m.turns[m.turns.length - 2].content.slice(0, 80)}" / "${text.slice(0, 80)}"`); if (a.talkedDay !== S.day) { a.talkedDay = S.day; a.stress = Math.max(0, a.stress - 1); } save(); if (modal === m) drawOver(); };
    if (!sampleFn || !sampleOk) { const r = E.rel; const s = E.psy(a); return finish(s.e >= 6 ? (a.stress >= 6 ? 'Not now. Please.' : 'Sure. Talk. It beats listening to the rain.') : (a.stress >= 6 ? '...' : 'Mm.')); }
    const rules = `${WORLD}\n\nYou are playing ${a.name}, a resident of this shelter. Stay fully in character as this one person, speaking out loud. Reply with only what ${a.name} says, 1 to 4 sentences, no stage directions in brackets unless a tiny action matters, no narration of other characters. Let your personality, quirks, fears, needs and grudges drive what you say and how. You can refuse, lie, joke, break down, or ask for something. You are talking with ${me}.\n\nWho you are: ${E.profile(S, a)}\n\nThe shelter now: ${shelterNow()}\n\nWhat has happened to you lately:\n${history(a.id)}`;
    const turns = [{ role: 'user', content: rules }, ...m.turns.slice(-12)];
    if (turns[1] && turns[1].role !== 'user') turns.splice(1, 1);
    try {
      const { text } = await sampleFn(turns, { modelTier: 'quick', cache: false, onText: ({ text }) => { const el = $('tk-stream'); if (el) el.textContent = text; } });
      finish(String(text).trim().slice(0, 900));
    } catch (e) {
      if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'not_declared')) sampleOk = false;
      finish(e && e.text ? String(e.text) : e && e.code === 'rate_limited' ? '(They don\'t answer. Try again in a moment.)' : '(They just look at you.)');
    }
  }
  function renameModal() {
    const m = modal, it = m.t === 'p' ? pOf(m.id) : m.t === 'd' ? E.dogs(S).find(x => x.id === m.id) : E.kids(S).find(x => x.id === m.id);
    if (!it) { modal = null; return render(); }
    const POOL = m.t === 'd' ? ['Biscuit', 'Ranger', 'Tuck', 'Ghost', 'Maggie', 'Boone', 'Pepper', 'Duke', 'Rosie', 'Scout', 'Bear', 'Lady', 'Rusty', 'Juno', 'Bandit', 'Pickles', 'Sarge', 'Hazel', 'Moose', 'Lucky', 'Ash', 'Blue', 'Tater', 'Willow', 'Gus', 'Dixie', 'Ollie', 'Ruby', 'Hank', 'Penny', 'Smokey', 'Rebel', 'Trouble', 'Bones', 'Major', 'Sadie'] : it.he === 'he' ? ['Eli', 'Noah', 'Jonah', 'Ezra', 'Silas', 'Abel', 'Micah', 'Owen', 'Caleb', 'Rafe', 'Tobias', 'Asa', 'Jude', 'Marcus', 'Luis', 'Kenji', 'Darnell', 'Ivan', 'Omar', 'Wade', 'Hector', 'Ray'] : ['Hope', 'Ada', 'June', 'Mercy', 'Rain', 'Lily', 'Esme', 'Clara', 'Nell', 'Iris', 'Ruby', 'Faith', 'Maya', 'Sol', 'Rosa', 'Keiko', 'Imani', 'Vera', 'Dana', 'Lucia', 'Tess', 'Noor'];
    const surname = m.t === 'p';
    show(`<h2>Rename ${esc(it.name)}</h2><form id="rn-f" class="rn-f"><label>Name<input id="rn-n" maxlength="16" value="${esc(it.name)}" autocomplete="off" spellcheck="false"></label>${surname ? `<label>Last name<input id="rn-l" maxlength="18" value="${esc(it.last || '')}" autocomplete="off" spellcheck="false"></label>` : ''}<div class="acts"><button type="button" id="rn-r">Random name</button><button class="a1">Save</button></div></form><div style="margin-top:8px"><button class="btn w100" data-close="1">Cancel</button></div>`);
    $('rn-n').focus(); $('rn-n').select();
    $('rn-r').onclick = () => { $('rn-n').value = POOL[Math.floor(Math.random() * POOL.length)]; if (surname && D.SURNAMES) $('rn-l').value = D.SURNAMES[Math.floor(Math.random() * D.SURNAMES.length)]; };
    $('rn-f').onsubmit = ev => { ev.preventDefault(); const n = $('rn-n').value.replace(/[^\p{L}\p{N} '\-.]/gu, '').trim().slice(0, 16); if (!n) return toast('A name needs at least one letter.'); const old = it.name; it.name = n; if (surname) { const l = $('rn-l').value.replace(/[^\p{L}\p{N} '\-.]/gu, '').trim().slice(0, 18); if (l) it.last = l; } if (m.t === 'p') S.memorial.forEach(x => { if (x.name.startsWith(old + ' ')) { } }); save(); modal = null; render(); };
  }
  // watch a fight that happened off screen, line by line
  function replayModal() {
    const m = modal, f = m.f, shown = f.lines.slice(0, m.i), cur = shown[shown.length - 1];
    const ppl = S.people.filter(p => f.lines.some(l => l.t.startsWith(p.name + ' ') || l.t.includes(' ' + p.name + ' ') || l.t.includes(' ' + p.name + '.'))).slice(0, 4);
    const hit = n => cur && cur.t.includes(n) ? (cur.k === 'bad' || /falls|bled|down/.test(cur.t) ? ' rp-hurt' : ' rp-act') : '';
    const done = m.i >= f.lines.length;
    show(`<h2>${esc(f.where)}</h2><div class="rp"><div class="rp-side">${ppl.map(p => `<div class="rp-h${hit(p.name)}"><img src="${img(p)}"><b>${esc(p.name)}</b></div>`).join('')}</div><div class="rp-log">${shown.slice(-9).map(l => `<div class="${l.k || ''}">${esc(l.t)}</div>`).join('')}${done ? `<div class="rp-end">${f.won ? 'They won.' : f.fled ? 'They ran.' : 'They lost.'}</div>` : ''}</div><div class="rp-side">${f.foes.slice(0, 4).map(x => `<div class="rp-f${hit(x.n)}"><img src="${x.sprite ? kitSrc(x.sprite, 'damned') : `art/foes/${x.art}.webp`}"><b>${esc(x.n)}</b></div>`).join('')}</div></div><div class="acts" style="margin-top:10px"><button id="rp-skip">${done ? 'Back' : 'Skip to the end'}</button><button data-close="1">Close</button></div>`, 'wide');
    $('rp-skip').onclick = () => { if (done) { modal = null; return drawOver(); } m.i = f.lines.length; drawOver(); };
    if (!done) { clearTimeout(m.t); m.t = setTimeout(() => { if (modal !== m) return; m.i++; lineSound(f.lines[m.i - 1]); drawOver(); }, 750 * OP.textMul()); }
  }
  function achModal() {
    const g = ShelterAch.got(), L = ShelterAch.LIST;
    const tiles = L.map(a => `<div class="etile ${g[a.id] ? 'got' : ''}"><b>${g[a.id] ? esc(a.n) : '???'}</b><p>${esc(a.d)}</p></div>`).join('');
    over.innerHTML = `<div class="modal"><div class="box wide"><h2>Achievements <small class="ft">${Object.keys(g).length} of ${L.length}</small></h2><div class="egrid">${tiles}</div><div style="margin-top:12px"><button class="btn w100" id="acl">Close</button></div></div></div>`;
    $('acl').onclick = () => { over.innerHTML = ''; };
  }
  function endingsModal() {
    let got = {}; try { got = JSON.parse(localStorage.getItem('tofu.shelter.endings') || '{}'); } catch (e) { }
    const tiles = Object.entries(E.END).map(([k, e]) => got[k] ? `<div class="etile got end-${e.s}"><b>${esc(e.t)}</b><small>Reached on Day ${got[k].day}</small><p>${esc(E.END_HINT[k])}</p></div>` : `<div class="etile"><b>???</b><p>${esc(E.END_HINT[k])}</p></div>`).join('');
    over.innerHTML = `<div class="modal"><div class="box wide"><h2>Endings <small class="ft">${Object.keys(got).length} of ${Object.keys(E.END).length} found</small></h2><p class="ft">Every ending begins on Day 365, when Q.U.E.S.T. makes her last offer. None of them are kind.</p><div class="egrid">${tiles}</div><div style="margin-top:12px"><button class="btn w100" id="ecl">Close</button></div></div></div>`;
    $('ecl').onclick = () => { over.innerHTML = ''; };
  }
  function lawsModal() {
    const L = E.leader(S), on = S.laws || [];
    show(`<h2>Laws</h2><p class="ft">${L ? `${esc(L.name)} decides. Up to ${E.MAX_LAWS} laws at once, one change a day. Passing a law costs Order, and many keep pulling Order down every day.` : 'Nobody leads, so nobody can pass laws. Click a person and make them the leader.'} Order is <b>${Math.round(S.order ?? 55)}</b>.</p><div class="list" style="max-height:600px;margin-top:8px">${Object.entries(E.LAWS).map(([k, l]) => `<div class="deal law ${on.includes(k) ? 'on' : ''}"><span class="n"><b>${esc(l.n)}</b><br><span class="ft">${esc(l.d)}</span><br><small class="${l.day < 0 ? 'r' : 'g'}">${l.cost ? `Costs ${l.cost} Order to pass. ` : ''}${l.day ? `${l.day > 0 ? '+' : ''}${l.day} Order a day.` : ''}</small></span><button class="btn ${on.includes(k) ? 'a3' : 'a1'}" data-law="${k}" ${L && S.lawDay !== S.day ? '' : 'disabled'}>${on.includes(k) ? 'Repeal' : 'Pass'}</button></div>`).join('')}</div><div style="margin-top:12px"><button class="btn w100" data-close="1">Close</button></div>`, 'wide');
    over.querySelectorAll('[data-law]').forEach(b => b.onclick = () => { const e = E.toggleLaw(S, b.dataset.law); if (e) toast(e); else { blip(440); save(); } drawOver(); });
  }
  function buildModal() {
    const m = modal;
    show(`<h2>Build a room</h2><p class="ft" style="margin-bottom:8px">What you build next to matters, beside, above and below. Top levels take more rain and debris, and rooms nearest the Gate get hit first.</p><div class="buildgrid">${E.buildable(S).filter(([k, d]) => !d.minRow || m.row >= d.minRow || S.deepTold).map(([k, d]) => { if (d.minRow && m.row < d.minRow) return [-99, `<div class="bcard off"><img src="art/rooms/${d.art}.webp"><div><b>${d.name} &middot; level ${d.minRow + 1} and deeper</b>${d.desc}</div></div>`]; const l = E.layoutPreview(S, k, { row: m.row, col: m.col }), hint = [...l.good.map(t => `<p class="lg0">+ ${esc(t)}</p>`), ...l.bad.map(t => `<p class="lb0">- ${esc(t)}</p>`)].join(''); return [l.good.length - l.bad.length, `<div class="bcard ${S.res.scrap < d.build ? 'off' : ''}" data-b="${k}"><img src="art/rooms/${d.art}.webp"><div><b>${d.name} &middot; ${d.build} scrap</b>${d.desc}${hint}</div></div>`]; }).sort((a, b) => b[0] - a[0]).map(x => x[1]).join('')}</div><div style="margin-top:12px"><button class="btn w100" data-close="1">Close</button></div>`, 'wide');
    over.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const r = E.build(S, b.dataset.b, { row: m.row, col: m.col }); if (r) { modal = null; roomSel = r.id; SA.sfx('build'); render(); } else toast('Not enough scrap.'); });
  }
  function craftModal() {
    show(`<h2>Workshop</h2><p class="ft">Scrap: ${nf(S.res.scrap)}</p><div class="list" style="max-height:520px;margin-top:8px">${D.CRAFT.map((c, i) => { const w = E.findWeapon(c.n); return `<div class="deal"><span class="n">${esc(c.n)} <span class="ft">${c.ar ? `${c.cls} armor, AR ${c.ar}` : (c.item ? D.ITEMS[c.item].d : w ? w.tr.join(', ') : '')}</span></span><button class="btn" data-c="${i}" ${S.res.scrap < c.c ? 'disabled' : ''}>${c.c} scrap</button></div>`; }).join('')}</div><div style="margin-top:12px"><button class="btn w100" data-close="1">Close</button></div>`);
    over.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (E.craft(S, +b.dataset.c)) { blip(520); drawOver(); } });
  }
  function tradeModal() {
    const list = E.tradeDeals(S);
    show(`<h2>Trade Post</h2><p class="ft">Rounds are money. You have ${nf(S.res.rounds)}. The trader is ${S.deals.mood} today.</p><div style="margin-top:8px">${list.map((d, i) => `<div class="deal"><img src="art/ui/i_${d.k}.webp"><span class="n"><b>${d.qty} ${D.RES_NAME[d.k]}</b> <span class="ft">${d.sc}</span></span><button class="btn" data-buy="${i}" ${S.res.rounds < d.price || d.done >= 3 ? 'disabled' : ''}>Buy: ${d.price} rounds</button><button class="btn" data-sell="${i}" ${S.res[d.k] < d.qty || d.done >= 3 ? 'disabled' : ''}>Sell: ${d.sell} rounds</button></div>`).join('')}</div><div style="margin-top:12px"><button class="btn w100" data-close="1">Close</button></div>`);
    over.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (E.buy(S, list[+b.dataset.buy])) { blip(520); render(); modal = { k: 'trade' }; drawOver(); } });
    over.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { if (E.sell(S, list[+b.dataset.sell])) { blip(520); render(); modal = { k: 'trade' }; drawOver(); } });
  }
  function wallModal() {
    show(`<h2>The Wall</h2><p class="ft">Everyone you lost.</p><div class="memo" style="margin-top:10px">${S.memorial.slice().reverse().map(m => `<div class="mcard">${m.dog ? `<svg viewBox="0 0 24 24" style="height:96px;width:96px;fill:#c9b48c"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.5" cy="10" rx="2.2" ry="2.8"/><ellipse cx="9.5" cy="6" rx="2.2" ry="2.9"/><ellipse cx="14.5" cy="6" rx="2.2" ry="2.9"/><ellipse cx="18.5" cy="10" rx="2.2" ry="2.8"/></svg>` : `<img src="${kitSrc(m.sprite, m.damned ? 'damned' : 'base')}">`}<b>${esc(m.name)}</b>${esc(m.cls)}, Day ${m.day}<br><span class="ft">${esc(m.why)}</span>${m.ep ? `<i class="ep">${esc(m.ep)}</i>` : ''}</div>`).join('') || '<p class="t">Nobody yet.</p>'}</div><div style="margin-top:12px"><button class="btn w100" data-close="1">Close</button></div>`, 'wide');
  }
  function diceModal() {
    const o = modal.o;
    const g = o.res ? `+${nf(o.gain)} ${D.RES_NAME[o.res]}` : '';
    show(`<h2>${esc(o.who)} ${esc(o.verb || 'pushes')}: ${esc(o.skill)}, DR ${o.dr || 6}</h2><div class="dice">${o.dice.map(v => dieHtml(v, o.crit && (v === 1 || v === 10) ? 'c' : v >= (o.dr || 6) ? 'y' : '')).join('')}</div><p class="t" style="text-align:center">${o.crit ? '<b style="color:#ffd76a">COSMIC CRIT!</b> ' : ''}${o.bad ? esc(o.msg) : `${o.succ} success${o.succ !== 1 ? 'es' : ''}. ${g} ${esc(o.msg || '')}`}</p><button class="btn w100" data-close="1">OK</button>`);
  }
  function helpModal() {
    over.innerHTML = `<div class="modal"><div class="box helpb"><h2>How to Play</h2>
      <p>Everything that happens runs on real TOFU rules. Time only moves when you press <b>End Day</b>.</p>
      <h3>Each day</h3><ul><li><b>Drag people</b> into rooms, or click a person and then a room.</li><li><b>Send a Run</b> to loot places for food, fuel, medicine, weapons and scrap. Stay longer, find more, draw more trouble.</li><li><b>Quests</b> are missions you play yourself: choices, then turn-based fights with 3 actions a person. Click an enemy to attack. Actions you save become Block and Dodge.</li><li><b>Emergencies</b> flash on rooms. Click to roll for them, or End Day makes them worse. <b>Push</b> on any staffed room rolls for a bonus.</li><li><b>Raids</b> at the Gate are fights you play yourself.</li><li><b>Layout matters.</b> Rooms help or hurt whatever is built beside, above or below them. The Build window shows it before you pay. Two of the same room side by side link up. Top levels take more rain and debris, and whatever gets past the Gate reaches the nearest rooms first.</li><li><b>Build</b> on the dirt rooms. Click a room to upgrade it or Push it.</li><li><b>End Day:</b> everyone eats, works, rests, and something may come to the door.</li></ul>
      <h3>What kills people</h3><ul><li><b>DMD</b> fills to 32 and nothing ever lowers it. At 32 a secret roll is made and you wait: 1 day after a bite, 3 after anything else. Then they turn or they don't.</li><li><b>Stress</b> at 10 makes them crack or snap. <b>Exhaustion</b> costs dice, drops them at 6 and kills at 10.</li><li><b>No water for 4 days</b> is death.</li></ul>
      <h3>Quarantine</h3><p>Seal someone at 32 so that if they turn, it happens behind a door. Or don't, and hope.</p>
      <h3>The Damned</h3><p>A few who turn keep their minds. They are your strongest fighters, most people will hate them, and when their meter fills they turn on everyone.</p>
      <h3>Winning</h3><p>You don't. Your score is how long you held on.</p>
      <p class="ft" style="margin-top:10px">Music by Tanner Helland, <a href="https://github.com/tannerhelland/free-music" target="_blank" rel="noopener">github.com/tannerhelland/free-music</a>, CC BY 4.0. Sound effects by Kenney.nl, CC0.</p>
      <div style="margin-top:14px"><button class="btn w100" data-close="1">Close</button></div></div></div>`;
    over.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { modal = null; if (S) render(); else { over.innerHTML = ''; } });
  }
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (modal) { modal = null; render(); } else { sel = roomSel = null; if (S) render(); } } if (e.key === 'Enter' && S && !auto.on && !modal && !S.queue.length && e.target.tagName !== 'BUTTON') endDay(); });
  // load the art up front so rooms and people do not pop in
  for (const r of Object.values(D.ROOMS)) new Image().src = `art/rooms/${r.art}.webp`;
  for (const n of Object.keys(G.people)) { new Image().src = `${kitSrc(n, 'base')}`; }
  ['food', 'water', 'fuel', 'meds', 'scrap', 'rounds'].forEach(k => { new Image().src = `art/ui/i_${k}.webp`; });
  globalThis.ShelterUI = { get S() { return S; }, render, spot, startWalk, openOpts };
  title();
})();
