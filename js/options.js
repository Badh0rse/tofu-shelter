// Player options, kept per browser. Twitch: read-only chat over Twitch's public chat socket, no account or password needed.
(function () {
  const KEY = 'tofu.shelter.opts';
  const DEF = { music: 100, sfx: 100, amb: 100, speed: 'normal', bubbles: true, numbers: true, hints: true, autoPause: false, motion: 'full', flash: true, bigText: false, cbDice: false, tw: { channel: '', vote: true, secs: 30, join: true, talk: false, block: '' } };
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { }
  const O = { ...DEF, ...saved, tw: { ...DEF.tw, ...(saved.tw || {}) } };
  const TEXT = { slow: 1.6, normal: 1, fast: .55, instant: .12 };
  const API = {
    o: O, DEF,
    textMul: () => TEXT[O.speed] || 1,
    save() { try { localStorage.setItem(KEY, JSON.stringify(O)); } catch (e) { } },
    apply() {
      const c = document.documentElement.classList;
      c.toggle('m-low', O.motion === 'low'); c.toggle('m-off', O.motion === 'off'); c.toggle('noflash', !O.flash); c.toggle('bigt', O.bigText); c.toggle('cbd', O.cbDice);
      const SA = globalThis.ShelterAudio; if (SA && SA.applyVol) SA.applyVol();
    },
    reset() { Object.keys(O).forEach(k => delete O[k]); Object.assign(O, JSON.parse(JSON.stringify(DEF))); API.save(); API.apply(); },
  };
  globalThis.ShelterOpts = API;

  const T = {
    status: 'off', note: '', channel: '', queue: [], used: new Set(), vote: null, ws: null, onTalk: null, onChange: null, retry: 0, wanted: false,
    connected() { return T.status === 'on'; },
    set(st, note = '') { T.status = st; T.note = note; if (T.onChange) T.onChange(); },
    blocked(s) { const list = O.tw.block.toLowerCase().split(',').map(x => x.trim()).filter(Boolean), t = String(s).toLowerCase(); return list.some(w => t.includes(w)) || /https?:|www\.|\.com\b/.test(t); },
    connect(name) {
      const ch = String(name || '').trim().replace(/^#/, '').toLowerCase();
      if (!/^[a-z0-9_]{3,25}$/.test(ch)) return T.set('off', 'That does not look like a Twitch channel name.');
      T.close(); T.wanted = true; T.channel = ch; T.set('wait', 'Connecting...'); T.open();
    },
    open() {
      let ws; try { ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443'); } catch (e) { return T.fail(); }
      T.ws = ws;
      ws.onopen = () => { ws.send('CAP REQ :twitch.tv/tags'); ws.send('PASS SCHMOOPIIE'); ws.send('NICK justinfan' + (10000 + Math.floor(Math.random() * 80000))); ws.send('JOIN #' + T.channel); };
      ws.onmessage = e => String(e.data).split('\r\n').forEach(l => { if (l) T.line(l); });
      ws.onerror = () => T.fail();
      ws.onclose = () => { if (T.ws !== ws) return; T.ws = null; if (T.wanted && T.status === 'on') { T.set('wait', 'Lost the connection. Retrying...'); setTimeout(() => { if (T.wanted && !T.ws) T.open(); }, Math.min(30000, 2000 * ++T.retry)); } };
    },
    fail() { if (T.status === 'on') return; T.wanted = false; T.ws = null; T.set('off', 'Could not reach Twitch. Twitch only works from Play TOFU Shelter.bat on your PC, not from the web link.'); },
    close() { T.wanted = false; const w = T.ws; T.ws = null; if (w) try { w.close(); } catch (e) { } T.vote = null; T.set('off', ''); },
    line(l) {
      if (l.startsWith('PING')) { if (T.ws) T.ws.send('PONG' + l.slice(4)); return; }
      if (/ 366 /.test(l)) { T.retry = 0; T.set('on', ''); return; }
      const m = /^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(l); if (!m) return;
      const dn = /(?:^|;)display-name=([^;]*)/.exec(m[1] || ''), who = (dn && /^[A-Za-z0-9_]+$/.test(dn[1]) && dn[1]) || m[2];
      T.chat(who, m[3].trim());
    },
    chat(who, text) {
      const v = T.vote, n = /^!?(?:vote )?(\d)$/i.exec(text);
      if (v && n && +n[1] >= 1 && +n[1] <= v.n) { v.tally[who.toLowerCase()] = +n[1] - 1; return; }
      if (/^!join\b/i.test(text)) return T.join(who);
      if (T.onTalk && !text.startsWith('!') && !T.blocked(text)) T.onTalk(who, text.slice(0, 70));
    },
    join(who) { const name = who.slice(0, 14), k = name.toLowerCase(); if (!O.tw.join || T.used.has(k) || T.queue.some(x => x.toLowerCase() === k) || T.blocked(name)) return; T.queue.push(name); if (T.onChange) T.onChange(); },
    next() { if (!T.connected() || !O.tw.join || !T.queue.length) return null; const n = T.queue.shift(); T.used.add(n.toLowerCase()); if (T.onChange) T.onChange(); return n; },
    remove(i) { T.queue.splice(i, 1); if (T.onChange) T.onChange(); },
    counts() { const v = T.vote, c = Array(v ? v.n : 0).fill(0); if (v) Object.values(v.tally).forEach(i => c[i]++); return c; },
  };
  globalThis.ShelterTwitch = T;
})();
