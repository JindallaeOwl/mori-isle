// Sound on a real visit: the browser blocks audio until a click / key. Reload several times and
// check that the first gesture always makes sound audible, whatever it is.
// usage: AUTOPLAY=0 node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&intro=1" tools/tests/sound-unlock.mjs
export default async ({ wait, evaluate, mouse, key, send, log }) => {
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  const J = async (expr) => JSON.parse(await evaluate(`JSON.stringify(${expr})`));
  const st = () => J(`(() => { const a = window.__mori.audio; return { ctx: a.ctx && a.ctx.state, enabled: a.enabled, wantOn: a.wantOn, icon: document.getElementById('btn-audio').classList.contains('on') }; })()`);
  const ready = async () => {
    for (let i = 0; i < 100; i++) { if (await evaluate("!!window.__mori && window.__mori.state().intro === 'done' && !document.body.classList.contains('ui-pop')")) break; await wait(400); }
    await wait(1000);
  };
  const reload = async () => { await send('Page.reload'); await wait(1500); await ready(); };
  const running = async () => { for (let i = 0; i < 30; i++) { const s = await st(); if (s.ctx === 'running') return s; await wait(200); } return st(); };
  const center = (sel) => J(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  const click = async ([x, y]) => {
    await mouse('mouseMoved', x, y);
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
  };
  const escape = async () => {
    const k = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  };
  const audible = (s) => s.ctx === 'running' && s.enabled && s.icon;

  await ready();
  let s = await st();
  ok('blocked before any gesture (run with AUTOPLAY=0)', s.ctx === 'suspended' && !s.enabled && s.icon, JSON.stringify(s));
  await click([500, 330]); s = await running();
  ok('load 1: a click on the island starts the sound', audible(s), JSON.stringify(s));

  await reload();
  await click(await center('#btn-audio')); s = await running(); await wait(400); s = await st();
  ok('load 2: first press on the sound button starts the sound', audible(s), JSON.stringify(s));
  await click(await center('#btn-audio')); await wait(400); s = await st();
  ok('load 2: the second press mutes', !s.enabled && !s.wantOn && !s.icon, JSON.stringify(s));
  await click([500, 330]); await wait(400); s = await st();
  ok('load 2: a muted game stays muted on other clicks', !s.enabled && !s.icon, JSON.stringify(s));
  await click(await center('#btn-audio')); await wait(400); s = await st();
  ok('load 2: the button turns it back on', audible(s), JSON.stringify(s));

  await reload();
  await escape(); await wait(500); s = await st();
  ok('load 3: Esc (not a gesture) leaves it waiting', !s.enabled, JSON.stringify(s));
  await click(await center('#btn-time')); s = await running();
  ok('load 3: the next click starts the sound', audible(s), JSON.stringify(s));

  await reload();
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 330 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  s = await running();
  ok('load 4: a touch tap starts the sound', audible(s), JSON.stringify(s));
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });

  await reload();
  await key('r'); s = await running();
  ok('load 5: a key starts the sound', audible(s), JSON.stringify(s));
};
