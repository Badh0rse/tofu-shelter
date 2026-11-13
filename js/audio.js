// Music: licensed dark orchestral and synth recordings (see RIGHTS.md), cross-faded by scene.
// Under it: a quiet code-made bed: a low drone, a slow minor pad, far-off calls and bowed metal. Rain and thunder only when it rains.
// Effects: real recorded hits (Kenney, CC0), layered and pitched so no two blows sound the same.
(function () {
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const SAMPLES = ['punch1', 'punch2', 'punch3', 'slash1', 'slash2', 'club1', 'club2', 'clang1', 'clang2', 'plate', 'soft', 'drop', 'whoosh1', 'whoosh2', 'door1', 'door2', 'creak', 'click', 'select', 'mine', 'mclick', 'leather'];

  function Engine(ctx, buf = {}) {
    const master = ctx.createGain(); master.gain.value = .9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .18;
    master.connect(comp); comp.connect(ctx.destination);
    const ambG = ctx.createGain(), sfxG = ctx.createGain(); ambG.connect(master); sfxG.connect(master);
    const irLen = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let l = 0; for (let i = 0; i < irLen; i++) { const dec = Math.pow(1 - i / irLen, 3.4); l = l * .7 + (Math.random() * 2 - 1) * .3; d[i] = l * dec * (i < 300 ? i / 300 : 1); } }
    const rev = ctx.createConvolver(); rev.buffer = ir; const revG = ctx.createGain(); revG.gain.value = .7; rev.connect(revG); revG.connect(master);
    const nLen = ctx.sampleRate * 4, white = ctx.createBuffer(1, nLen, ctx.sampleRate), brown = ctx.createBuffer(1, nLen, ctx.sampleRate);
    { const w = white.getChannelData(0), b = brown.getChannelData(0); let l = 0; for (let i = 0; i < nLen; i++) { const x = Math.random() * 2 - 1; w[i] = x; l = (l + .02 * x) / 1.02; b[i] = l * 3.5; } }
    const loop = (b, dest) => { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(dest); s.start(); };
    const lfo = (rate, depth, param) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); };
    // the atmosphere: a low bed, wind, rain
    const bedG = ctx.createGain(); bedG.gain.value = 0; const bedF = ctx.createBiquadFilter(); bedF.type = 'lowpass'; bedF.frequency.value = 420; bedF.Q.value = 1.5; lfo(.07, 140, bedF.frequency); bedF.connect(bedG); bedG.connect(ambG);
    [36.71, 36.95, 73.42, 110.1].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = [.09, .09, .07, .05][i]; o.connect(g); g.connect(bedF); o.start(); });
    const windG = ctx.createGain(); windG.gain.value = 0; const windF = ctx.createBiquadFilter(); windF.type = 'lowpass'; windF.frequency.value = 260; windF.Q.value = .5; lfo(.05, 90, windF.frequency); windF.connect(windG); windG.connect(ambG); loop(brown, windF);
    const rainG = ctx.createGain(); rainG.gain.value = 0; const rainF = ctx.createBiquadFilter(); rainF.type = 'highpass'; rainF.frequency.value = 1400; const rainL = ctx.createBiquadFilter(); rainL.type = 'lowpass'; rainL.frequency.value = 6000; rainL.frequency.value = 2600; rainF.connect(rainL); rainL.connect(rainG); rainG.connect(ambG); loop(white, rainF);
    let scene = 'title', rain = 0;
    const clock = { thunder: 12, groan: 20 };
    const LV = { credits: [.12, 0, .3], title: [.3, .1, .5], shelter: [.3, .06, .55], fight: [.06, 0, .1], dead: [.28, .08, .6] };
    // somber, wrong-feeling pad: a minor-second cluster through vowel-like filters, swelling slowly (invented)
    const padG = ctx.createGain(); padG.gain.value = 0; const padS = ctx.createGain(); padS.gain.value = .5; lfo(.031, .35, padS.gain); padS.connect(padG); padG.connect(ambG); padG.connect(rev);
    [[146.83, 'triangle', 720], [155.56, 'triangle', 1050], [220, 'sawtooth', 650], [233.08, 'sawtooth', 980], [73.42, 'sine', 400]].forEach(([f, t, fm], i) => { const o = ctx.createOscillator(); o.type = t; o.frequency.value = f; lfo(.09 + i * .02, f * .004, o.frequency); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm; bp.Q.value = 5; lfo(.023 + i * .007, fm * .25, bp.frequency); const g = ctx.createGain(); g.gain.value = [.05, .035, .03, .02, .07][i]; o.connect(bp); bp.connect(g); g.connect(padS); o.start(); });
    function applyRain() { rainG.gain.setTargetAtTime(scene === 'fight' || !rain ? 0 : rain >= 8 ? .075 : .035, ctx.currentTime, 1.5); }
    function applyScene() { const l = LV[scene], t = ctx.currentTime; bedG.gain.setTargetAtTime(l[0], t, 1); windG.gain.setTargetAtTime(l[1], t, 1.2); padG.gain.setTargetAtTime(l[2], t, 2.5); applyRain(); }
    function groan(t) { const o = ctx.createOscillator(); o.type = 'sawtooth'; const d = rnd(3.5, 6), f0 = rnd(150, 240); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * rnd(.55, .75), t + d); const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = rnd(320, 620); fl.Q.value = 8; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + d * .3); g.gain.linearRampToValueAtTime(0, t + d); o.connect(fl); fl.connect(g); g.connect(rev); o.start(t); o.stop(t + d + .1); }
    function thunder(t) { const d = rnd(3.5, 6), s = ctx.createBufferSource(); s.buffer = brown; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + d * .15); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(ambG); s.start(t, Math.random() * 3); s.stop(t + d + .1); }
    function call(t) { const d = rnd(7, 12), f0 = rnd(55, 90), o = ctx.createOscillator(), o2 = ctx.createOscillator(); o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * rnd(.7, .84), t + d); o2.frequency.setValueAtTime(f0 * 2.01, t); o2.frequency.linearRampToValueAtTime(f0 * 1.5, t + d); lfo(rnd(3, 5), f0 * .02, o.frequency); const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 380; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + d * .4); g.gain.linearRampToValueAtTime(0, t + d); o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(rev); o.start(t); o2.start(t); o.stop(t + d + .1); o2.stop(t + d + .1); }
    function metal(t) { const d = rnd(5, 9); [1, 1.414, 2.13].forEach((m, i) => { const o = ctx.createOscillator(); o.type = 'sine'; const f = rnd(420, 640) * m; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * rnd(.97, 1.03), t + d); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime([.018, .01, .006][i], t + d * .5); g.gain.linearRampToValueAtTime(0, t + d); o.connect(g); g.connect(rev); o.start(t); o.stop(t + d + .1); }); }
    clock.call = 30; clock.metal = 18;
    function tick(h) {
      while (clock.call < h) { if (scene !== 'fight') call(clock.call); clock.call += rnd(45, 95); }
      while (clock.metal < h) { if (scene !== 'fight') metal(clock.metal); clock.metal += rnd(28, 60); }
      while (clock.thunder < h) { if (rain >= 4 && scene !== 'fight') thunder(clock.thunder); clock.thunder += rnd(14, 38); }
      while (clock.groan < h) { if (scene === 'shelter' || scene === 'title') groan(clock.groan); clock.groan += rnd(26, 55); }
    }

    // ---------- effects
    function s(t, name, v = 1, rate = 1, wet = 0, cut = 0) { // one recorded sound, slightly different every time
      const list = Array.isArray(name) ? name : [name], b = buf[pick(list)]; if (!b) return;
      const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate * rnd(.94, 1.06);
      const g = ctx.createGain(); g.gain.value = v; let tail = src;
      if (cut) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; src.connect(f); tail = f; }
      tail.connect(g); g.connect(sfxG); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(rev); }
      src.start(t);
    }
    function noise(t, b, type, cut, dur, v, wet = 0) { const n = ctx.createBufferSource(); n.buffer = b; n.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = cut; const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur); n.connect(f); f.connect(g); g.connect(sfxG); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(rev); } n.start(t, Math.random() * 3); n.stop(t + dur + .05); }
    function thump(t, f0, f1, dur, v) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + .03); }
    const P = ['punch1', 'punch2', 'punch3'], W = ['whoosh1', 'whoosh2'], CL = ['clang1', 'clang2'];
    const SFX = {
      ui: t => s(t, 'click', .3),
      door: t => { s(t, 'door1', .55, .8, .25); s(t + .05, 'creak', .2, .75); },
      build: t => { s(t, 'mine', .6, 1, .15); s(t + .2, 'mclick', .4); s(t + .36, 'mine', .5, .9, .15); },
      dice: t => { for (let i = 0; i < 6; i++) s(t + Math.pow(i / 6, 1.5) * .36, 'club1', .42 * (1 - i / 9), rnd(2.5, 3.3)); },
      success: t => s(t, 'select', .4, .8, .3),
      fail: t => s(t, 'drop', .55, .75, .2),
      hit: t => { s(t, P, .9, rnd(.85, 1)); thump(t, 150, 55, .13, .4); },
      punch: t => { s(t, W, .3, 1.3); s(t + .05, P, .95, rnd(.9, 1.1)); thump(t + .05, 140, 60, .12, .35); },
      slash: t => { s(t, W, .4, 1.5); s(t + .05, ['slash1', 'slash2'], 1, rnd(.85, 1.05), .08); s(t + .07, P, .45, 1.2); },
      club: t => { s(t, W, .35, .9); s(t + .06, ['club1', 'club2'], 1, rnd(.72, .9), .1); s(t + .07, P, .7, .8); thump(t + .06, 130, 48, .18, .55); },
      claw: t => { s(t, ['slash1', 'slash2'], .75, .7); s(t + .03, P, .85, .75); thump(t + .03, 110, 45, .18, .4); },
      gun: t => { noise(t, white, 'highpass', 1100, .07, .65); s(t, CL, .45, 1.7); s(t, P, .7, .55); thump(t, 190, 42, .2, .6); noise(t + .01, brown, 'lowpass', 1400, .34, .6, .5); s(t + .22, 'mclick', .22, 1.1); },
      blast: t => { noise(t, white, 'lowpass', 5000, .28, .7, .6); noise(t, brown, 'lowpass', 900, 1.6, .8, .5); thump(t, 110, 30, .9, .7); s(t + .05, CL, .5, .5, .5); },
      arrow: t => { s(t, W, .55, 1.9); s(t + .08, 'club1', .7, 1.9); s(t + .09, P, .5, 1.1); },
      block: t => { s(t, ['plate', ...CL], .9, rnd(.9, 1.1), .25); },
      miss: t => s(t, W, .55, rnd(1, 1.4)),
      kill: t => { s(t, 'soft', .95, .8, .1); s(t + .12, 'drop', .7, .7); thump(t, 100, 38, .3, .55); },
      heal: t => { s(t, 'leather', .5); s(t + .16, 'leather', .4, 1.2); },
      bite: t => { s(t, ['slash1', 'slash2'], .7, .55); s(t + .04, 'soft', .85, .65); },
      growl: t => { s(t, 'creak', .75, .42, .4, 1200); s(t + .05, 'soft', .5, .45, .3); thump(t, 62, 40, .9, .4); },
      crit: t => { s(t, CL, .8, .8, .6); s(t, P, .75, .7); thump(t, 170, 36, .4, .65); noise(t, white, 'highpass', 2600, .3, .28, .7); },
      endday: t => { s(t, 'door2', .6, .7, .4); thump(t + .05, 90, 40, .9, .35); },
      alarm: t => { [0, .9, 1.8].forEach(d => { s(t + d, CL, .7, .62, .6); s(t + d, 'plate', .35, .5, .4); }); },
      death: t => { s(t, 'soft', 1, .6, .5); s(t + .15, CL, .55, .4, .9); thump(t, 80, 30, 1.6, .7); },
      sting: t => { s(t, CL, .75, .5, .9); thump(t, 70, 36, 1.3, .5); },
      strike: t => { noise(t, white, 'lowpass', 4000, .5, .4, .4); noise(t, brown, 'lowpass', 1200, 4.2, .5, .3); thump(t, 120, 28, 2.4, .65); s(t + .1, CL, .7, .4, .8); },
    };
    const last = {};
    return {
      ctx, tick,
      setScene(n) { if (n !== scene) { scene = n; applyScene(); } },
      setRain(r) { if (r !== rain) { rain = r; applyRain(); } },
      setAmbient(v) { ambG.gain.setTargetAtTime(+v, ctx.currentTime, .15); },
      setSfx(v) { sfxG.gain.setTargetAtTime(+v, ctx.currentTime, .05); },
      sfx(name, at) { const f = SFX[name]; if (!f) return; const now = ctx.currentTime, t = at === undefined ? now : at; if (at === undefined && now - (last[name] || -9) < .06) return; last[name] = now; f(t + .005); },
      begin() { applyScene(); },
      names: Object.keys(SFX),
    };
  }

  // ---------- the score: two players, cross-faded
  const PLAY = { title: ['halls', 'deeper'], shelter: ['deeper', 'halls', 'purgatory'], fight: ['retribution', 'ominosity', 'darkknight', 'anarchy', 'mist', 'faith'], dead: ['nevermore'], credits: ['nevermore', 'faith'] };
  const LEVEL = { title: .85, shelter: .55, fight: .72, dead: .75, credits: .8 };
  const SA = { music: true, sound: true, scene: 'title', rain: 0, en: null, buf: {} };
  try { SA.music = localStorage.getItem('tofu.shelter.music') !== '0'; SA.sound = localStorage.getItem('tofu.shelter.sound') !== '0'; } catch (e) { }
  SA.Engine = Engine; SA.SAMPLES = SAMPLES;
  const vol = k => { const o = globalThis.ShelterOpts; return o ? o.o[k] / 100 : 1; };
  SA.applyVol = () => { if (SA.en) { SA.en.setAmbient(SA.music ? vol('amb') : 0); SA.en.setSfx(SA.sound ? vol('sfx') : 0); } };
  const decks = [new Audio(), new Audio()]; decks.forEach(a => { a.preload = 'auto'; a.volume = 0; });
  let live = 0, playing = null; const at = { title: 0, shelter: 0, fight: Math.floor(Math.random() * 6), dead: 0, credits: 0 };
  function fades() { const k = SA.music ? LEVEL[SA.scene] * vol('music') * (SA.duck || 1) : 0; /* SA.duck: music dips while someone speaks */ decks.forEach((a, i) => { const want = i === live ? k : 0; a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(want - a.volume) * Math.min(Math.abs(want - a.volume), .035))); if (i !== live && a.volume <= .001 && !a.paused) a.pause(); }); }
  setInterval(fades, 50);
  function next() { const list = PLAY[SA.scene]; playing = SA.scene; live = 1 - live; const a = decks[live]; a.src = `audio/music/${list[at[SA.scene]++ % list.length]}.mp3`; if (SA.music && SA.en) { const p = a.play(); if (p) p.catch(() => { }); } }
  decks.forEach((a, i) => a.addEventListener('ended', () => { if (i === live) next(); }));
  SA.decks = decks;
  SA.start = () => {
    if (SA.en) { if (SA.en.ctx.state === 'suspended') SA.en.ctx.resume(); return; }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      SA.en = Engine(ctx, SA.buf);
      SA.en.setScene(SA.scene); SA.en.setRain(SA.rain); SA.applyVol(); SA.en.begin();
      setInterval(() => { if (SA.en.ctx.state === 'running') SA.en.tick(SA.en.ctx.currentTime + 2.2); }, 500);
      SA.en.tick(SA.en.ctx.currentTime + 2.2);
      SAMPLES.forEach(n => { const raw = atob((globalThis.GEN_SFX || {})[n] || ''), u = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i); ctx.decodeAudioData(u.buffer).then(d => { SA.buf[n] = d; }).catch(() => { }); });
      next();
    } catch (e) { SA.en = null; }
  };
  SA.setScene = s => { const was = SA.scene; SA.scene = s; if (SA.en) { SA.en.setScene(s); if (was !== s && playing !== s) next(); } };
  SA.setRain = r => { SA.rain = r; if (SA.en) SA.en.setRain(r); };
  SA.sfx = (name, delay) => { if (SA.en && SA.sound) SA.en.sfx(name, delay ? SA.en.ctx.currentTime + delay : undefined); };
  SA.toggle = k => { SA[k] = !SA[k]; try { localStorage.setItem('tofu.shelter.' + k, SA[k] ? '1' : '0'); } catch (e) { } if (SA.en) { SA.applyVol(); if (k === 'music' && SA.music) { const a = decks[live]; const p = a.play(); if (p) p.catch(() => { }); } } return SA[k]; };
  addEventListener('pointerdown', SA.start); addEventListener('mousedown', SA.start); addEventListener('click', SA.start); addEventListener('keydown', SA.start);
  globalThis.ShelterAudio = SA;
})();
