// Save test (terrain step 5, auto slot): an edited island (raised terrace, painted water with a fall,
// a rock, sown seed flowers) and the time of day are written to localStorage a second after the last
// edit and come back exactly (island meshes, heights, lists) after a reload. A broken save (bad JSON,
// wrong terrain size, out-of-range values) is ignored and the starter island loads instead; unknown
// objects are dropped one by one; #save=0 neither reads nor writes. Also fails on any console error.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/save.mjs
export default async ({ wait, evaluate, mouse, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? '  ' + extra : ''));
  const M = 'window.__mori';
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const errs = [];
  const reload = async () => {
    errs.push(...(await J('window.__errs || []')));
    await evaluate('location.reload()');
    await wait(1500);
    for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
    await wait(3000);
  };
  const tool = async (id) => { await evaluate(`document.querySelector('#hud-dock [data-tool="${id}"]').click()`); await wait(300); };
  const at = async (wx, wz) => { // screen point whose ray hit lands on world (wx, wz)
    let [x, y] = await J(`${M}.project(${wx}, ${await J(`${M}.ground(${wx}, ${wz})`)}, ${wz})`);
    for (let k = 0; k < 4; k++) {
      const h = await J(`${M}.hit(${x}, ${y})`);
      if (!h || Math.hypot(h.wx - wx, h.wz - wz) < 0.02) break;
      const [px, py] = await J(`${M}.project(${h.wx}, ${h.wy}, ${h.wz})`), [qx, qy] = await J(`${M}.project(${wx}, ${h.wy}, ${wz})`);
      x += qx - px; y += qy - py;
    }
    return [x, y];
  };
  const drag = async (a, b, steps = 8) => {
    const [x0, y0] = await at(a[0], a[1]);
    await mouse('mouseMoved', x0, y0); await wait(200);
    await mouse('mousePressed', x0, y0, { button: 'left', buttons: 1, clickCount: 1 });
    for (let k = 1; k <= steps; k++) {
      const [x, yy] = await at(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps);
      await mouse('mouseMoved', x, yy, { button: 'left', buttons: 1 }); await wait(120);
    }
    const [x1, y1] = await at(b[0], b[1]);
    await mouse('mouseReleased', x1, y1, { button: 'left', clickCount: 1 });
    await wait(1200);
  };
  const click = (p) => drag(p, p, 0);
  const clickTile = async (gx, gz) => {
    const y = (await J(`${M}.terrainLevel(${gx}, ${gz})`)) * 0.48;
    const [x, yy] = await J(`${M}.project(${gx - 6 + 0.5}, ${y}, ${gz - 6 + 0.5})`);
    await mouse('mouseMoved', x, yy); await wait(250);
    await mouse('mousePressed', x, yy, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, yy, { button: 'left', clickCount: 1 });
    await wait(900);
  };
  // everything a save should bring back
  const snapshot = async () => ({
    digest: await J(`${M}.islandDigest()`),
    heights: (await J(`${M}.terrainDump(0.05, 1)`)).hash,
    water: await J(`${M}.terrainWater()`),
    state: await J(`(({ placed, free, snap, seeds }) => ({ placed, free, snap, seeds }))(${M}.state())`),
    seeds: (await J(`${M}.seedFlowers()`)).list.map((f) => [f[0], f[1], f[2]]),
    falls: await J(`${M}.falls()`)
  });

  // a clean start: nothing stored
  await evaluate('localStorage.clear()');
  await reload();
  const starter = await snapshot();
  await wait(1500);
  const raw0 = await J(`${M}.saveRaw()`);
  ok('the starter island is auto-saved too', !!raw0 && JSON.parse(raw0).v === 1, raw0 ? raw0.length + ' chars' : 'none');

  // edit: empty the island, raise a 3x3 terrace, a pond with a fall over its edge, a rock, seed flowers
  await evaluate(`document.getElementById('pop-clear').click()`); await wait(1200);
  await tool('raise');
  for (let gz = 3; gz <= 5; gz++) for (let gx = 8; gx <= 10; gx++) await clickTile(gx, gz);
  await tool('paint_water');
  await drag([3.375, -1.625], [3.375, -2.875], 8);
  await tool('rocks');
  await click([-3.4, 3.1]);
  await tool('seeds');
  await click([-2.4, 0.6]);
  await evaluate(`document.getElementById('btn-time').click()`);
  await wait(1600);
  ok('the write waits a second after the last edit, then happens', !(await J(`${M}.autosavePending()`)));
  const edited = await snapshot(), timeEdited = await J(`${M}.timeOfDay()`);
  ok('edits made (terrace, water, a fall, a rock, seed flowers, golden hour)',
    edited.state.free === 1 && edited.state.seeds > 0 && edited.falls.length > 0 && edited.water > 0 && timeEdited === 'golden' && !same(edited.digest, starter.digest), JSON.stringify(edited.state) + ' falls ' + edited.falls.length);
  const size = (await J(`${M}.saveRaw()`)).length;
  ok('the save is small', size < 20000, size + ' chars');

  // reload: the same island
  await reload();
  const back = await snapshot();
  ok('reloaded: island meshes exactly the same', same(back.digest, edited.digest));
  ok('reloaded: heights and water the same', same(back.heights, edited.heights) && back.water === edited.water);
  ok('reloaded: objects and seed flowers the same', same(back.state, edited.state) && same(back.seeds, edited.seeds), JSON.stringify(back.state));
  ok('reloaded: the fall is back (derived, not stored)', same(back.falls, edited.falls));
  ok('reloaded: the time of day is remembered', (await J(`${M}.timeOfDay()`)) === 'golden');

  // broken saves are ignored: the starter island instead
  const goodRaw = await J(`${M}.saveRaw()`);
  const bad = {
    'bad JSON': '{"v":1,"island":',
    'wrong version': JSON.stringify({ ...JSON.parse(goodRaw), v: 99 }),
    'short terrain': (() => { const d = JSON.parse(goodRaw); d.island.level = d.island.level.slice(0, 40); return JSON.stringify(d); })(),
    'level out of range': (() => { const d = JSON.parse(goodRaw); d.island.level = btoa(String.fromCharCode(...new Array(144).fill(9))); return JSON.stringify(d); })()
  };
  for (const [name, raw] of Object.entries(bad)) {
    await evaluate(`localStorage.setItem('mori-isle.v1.auto', ${JSON.stringify(raw)})`);
    await reload();
    const s = await snapshot();
    ok(`${name}: ignored, the starter island loads`, same(s.digest, starter.digest) && same(s.state, starter.state), JSON.stringify(s.state));
  }

  // unknown or misplaced objects are dropped one at a time, the rest loads
  { const d = JSON.parse(goodRaw); d.island.free.push(['dragon', 0, 0, 0, 1], ['rocks', 99, 0, 0, 1], ['rocks', 1, 1, 0, 'big']); d.island.placed.push(['rocks', 2, 2, 0]);
    await evaluate(`localStorage.setItem('mori-isle.v1.auto', ${JSON.stringify(JSON.stringify(d))})`); }
  await reload();
  { const s = await snapshot(); ok('bad objects dropped, the rest loads', same(s.digest, edited.digest) && same(s.state, edited.state), JSON.stringify(s.state)); }

  // #save=0: the stored island is not read, nothing is written
  await evaluate(`localStorage.setItem('mori-isle.v1.auto', ${JSON.stringify(goodRaw)})`);
  await evaluate(`history.replaceState(null, '', location.pathname + '#debug=1&save=0')`);
  await reload();
  { const s = await snapshot(); ok('#save=0: starts on the starter island', same(s.digest, starter.digest) && same(s.state, starter.state)); }
  await wait(1500);
  ok('#save=0: nothing written', (await evaluate(`localStorage.getItem('mori-isle.v1.auto')`)) === goodRaw);
  await evaluate(`history.replaceState(null, '', location.pathname + '#debug=1')`);

  errs.push(...(await J('window.__errs || []')));
  ok('no console errors or warnings', errs.length === 0, errs.length ? errs.slice(0, 5).join(' | ') : errs.length);
};
