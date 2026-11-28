// Console test: reloads the page with console.error/warn captured from the very first script, so shader
// compile errors show up (tests that only place things pass even when every soup prop failed to compile).
// Places a few props of different kinds, then fails on any error or warning.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/console.mjs
export default async ({ wait, evaluate, mouse, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const J = (e) => evaluate(`JSON.stringify(${e})`).then(JSON.parse);
  const count = async () => { const s = await J('window.__mori.state()'); return s.placed + s.free + (s.snap || 0); };
  for (const id of ['windmill', 'well', 'woodshed', 'flowerpot', 'pine', 'cat']) {
    await evaluate(`document.querySelector('#hud-dock [data-tool="${id}"]').click()`); await wait(300);
    for (const [wx, wz] of [[3.5, -2.5], [-3.5, 3.5], [1.5, -3.5], [4.5, -4.5], [-1.5, 4.5], [4.5, -1.5]]) {
      const before = await count();
      const [x, y] = await J(`window.__mori.project(${wx}, 0, ${wz})`);
      await mouse('mouseMoved', x, y); await wait(250);
      await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
      await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
      await wait(700);
      if ((await count()) > before) break;
    }
  }
  await wait(4000);
  const errs = await J('window.__errs');
  log((errs.length === 0 ? 'PASS' : 'FAIL') + ' no console errors or warnings  ' + errs.length);
  for (const e of errs) log('  ' + e);
};
