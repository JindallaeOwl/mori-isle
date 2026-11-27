// Grass tuft stability: placing an object only changes the tufts right around it. Each clump's look
// used to come from a running counter, so one new tree / cabin / snap prop / rock reshuffled the
// grass across the whole island. Also fails on any console error or warning.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/grass.mjs
export default async ({ wait, evaluate, mouse, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? '  ' + extra : ''));
  const M = 'window.__mori';
  const tool = async (id) => { await evaluate(`document.querySelector('#hud-dock [data-tool="${id}"]').click()`); await wait(300); };
  const clickWorld = async (wx, wz) => {
    const [x, y] = await J(`${M}.project(${wx}, ${await J(`${M}.ground(${wx}, ${wz})`)}, ${wz})`);
    await mouse('mouseMoved', x, y); await wait(250);
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
    await wait(1200);
  };
  // every tuft farther than `r` from (wx, wz) before must still be there, unchanged
  const keptAway = (a, b, wx, wz, r) => {
    const set = new Set(b.map((m) => m.join()));
    const far = a.filter((m) => Math.hypot(m[12] - wx, m[14] - wz) > r);
    const lost = far.filter((m) => !set.has(m.join()));
    return { far: far.length, lost: lost.length };
  };

  const tries = [[2.5, -3.5], [3.5, -2.5], [-3.5, 3.5], [1.5, -4.5], [4.5, -1.5]];
  for (const id of ['pine', 'oak']) {
    const before = await J(`${M}.grassTufts()`);
    const n0 = (await J(`${M}.state()`)).placed;
    await tool(id);
    let at = null;
    for (const [wx, wz] of tries) {
      await clickWorld(wx, wz);
      if ((await J(`${M}.state()`)).placed > n0) { at = [wx, wz]; break; }
    }
    ok(`placed a ${id}`, !!at, JSON.stringify(at));
    if (!at) continue;
    const after = await J(`${M}.grassTufts()`);
    const k = keptAway(before, after, at[0], at[1], 0.9);
    ok(`${id}: tufts away from it are untouched`, k.lost === 0 && k.far > 20, `${k.far} far, ${k.lost} changed`);
  }
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.slice(0, 3).join(' | '));
};
