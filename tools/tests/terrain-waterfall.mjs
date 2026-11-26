// Waterfall test (terrain step 4-2): painting a pond on a raised 3x3 terrace out to its edge turns
// the two edge rows into a waterfall (falls), its plunge pool appears on the lower ground by itself
// (fallPool, not painted), the strip mesh and its spray show (+2 draw calls; ripple rings and the
// babble come on), the pool can't be painted dry, drying
// the lip removes fall and pool and leaves the island exactly as before, the edge is refused when
// something stands where the pool would go, a second fall chains down a stair, lowering / raising
// the tiles of a fall is refused, and "처음 섬으로" has no falls. Fails on any console error / warning.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/terrain-waterfall.mjs
export default async ({ wait, evaluate, mouse, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? '  ' + extra : ''));
  const M = 'window.__mori';
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
  const clickTile = async (gx, gz) => {
    const y = (await J(`${M}.terrainLevel(${gx}, ${gz})`)) * 0.48;
    const [x, yy] = await J(`${M}.project(${gx - 6 + 0.5}, ${y}, ${gz - 6 + 0.5})`);
    await mouse('mouseMoved', x, yy); await wait(250);
    await mouse('mousePressed', x, yy, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, yy, { button: 'left', clickCount: 1 });
    await wait(900);
  };
  const cell = (wx, wz) => [Math.floor((wx + 6) * 4), Math.floor((wz + 6) * 4)];
  const mat = (wx, wz) => J(`${M}.terrainMat(${cell(wx, wz).join(', ')})`);
  const allowed = (wx, wz, m = 4) => J(`${M}.paintAllowed(${cell(wx, wz).join(', ')}, ${m})`);
  const falls = () => J(`${M}.falls()`);
  const calls = async () => { await wait(600); return (await J(`${M}.renderables()`)).length; };

  // a 3x3 terrace (level 1) on open lawn, north of it level 0
  await evaluate(`document.getElementById('pop-clear').click()`); await wait(1200);
  await tool('raise');
  for (let gz = 3; gz <= 5; gz++) for (let gx = 8; gx <= 10; gx++) await clickTile(gx, gz);
  ok('raised a 3x3 terrace', (await J(`${M}.terrainLevel(9, 3)`)) === 1 && (await J(`${M}.terrainLevel(9, 2)`)) === 0);
  await tool('rocks'); // a rock on the lower ground, where a pool of the gx 10 column would go
  { const [x, y] = await at(4.375, -3.6); await mouse('mouseMoved', x, y); await wait(250); await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 }); await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 }); await wait(900); }
  ok('placed a rock', (await J(`${M}.state()`)).free === 1);
  const d0 = await J(`${M}.islandDigest()`), h0 = (await J(`${M}.terrainDump(0.05, 1)`)).hash, w0 = await J(`${M}.terrainWater()`);
  ok('no falls yet, strip hidden', (await falls()).length === 0 && !(await J(`${M}.fallSheet()`)).visible);

  // edge rows: plain water refused before, a lip once there is water behind it
  const X = 3.375; // cell column centre (qx 37) in tile gx 9
  ok('edge row refused with no water behind it', !(await allowed(X, -2.875)) && !(await allowed(X, -2.625)));
  await tool('paint_water');
  await drag([X, -1.625], [X, -2.375], 6); // up to the last flat row
  ok('the pond reaches the last flat row, no fall', (await mat(X, -2.375)) === 4 && (await falls()).length === 0);
  ok('the edge row is a lip now', (await allowed(X, -2.625)) && !!(await J(`${M}.lipInfo(${cell(X, -2.625).join(', ')})`)));
  const calls0 = await calls();
  await drag([X, -2.375], [X, -2.9], 4);
  const f1 = await falls();
  ok('painting to the edge makes a fall', f1.length === 1 && f1[0].sz === -1 && f1[0].top === 0.48 && f1[0].bot === 0, JSON.stringify(f1));
  ok('both lip cells are water', (await mat(X, -2.875)) === 4 && (await mat(X, -2.625)) === 4);
  const pool = await J(`${M}.fallPool()`);
  ok('a plunge pool appears below (derived, not painted)', pool >= 2 && (await mat(X, -3.125)) === 0 && (await J(`${M}.pond(${X}, -3.2)`)) < 0, `pool ${pool}`);
  const g = await J(`${M}.ground(${X}, -3.3)`);
  ok('the pool basin dug itself into the lower ground', g < -0.15, g.toFixed(3));
  await wait(800); // the sound level is picked every 0.25 s
  const fs = await J(`${M}.fallSheet()`);
  ok('the fall strip shows', fs.visible && fs.verts > 0, JSON.stringify(fs));
  const calls1 = await calls();
  ok('two draw calls more with a fall (strip + spray)', calls1 === calls0 + 2, `${calls0} -> ${calls1}`);
  ok('spray, ripple rings and the babble are on', fs.spray > 0 && fs.feet >= 1 && fs.ripples >= 1 && fs.k === 1 && fs.sound > 0.02, JSON.stringify(fs));
  ok('the pool can not be painted dry', !(await allowed(X, -3.125, 0)) && !(await allowed(X, -3.125, 1)));
  ok('water on the pool is allowed (no change)', await allowed(X, -3.125, 4));
  ok('the fall tiles can not be raised or lowered', !(await J(`${M}.terrainAllowed(9, 3, 1)`)) && !(await J(`${M}.terrainAllowed(9, 2, 1)`)) && !(await J(`${M}.terrainAllowed(9, 3, -1)`)));

  // a wider fall: the next column too (one strip for both)
  await drag([X + 0.25, -2.375], [X + 0.25, -2.9], 4);
  const f2 = await falls(), fs2 = await J(`${M}.fallSheet()`);
  ok('columns side by side: more falls, still one strip', f2.length >= 2 && f2.every((f) => f.sz === -1) && (await calls()) === calls1 && fs2.verts > fs.verts, `${f2.length} falls, ${fs2.verts} verts`);
  await drag([4.375, -1.625], [4.375, -2.375], 6);
  ok('a rock where the pool would go refuses that lip', (await mat(4.375, -2.375)) === 4 && !(await allowed(4.375, -2.625)));

  // dry the lips again with grass: falls and pool go
  await tool('paint_grass');
  await drag([3.3, -2.625], [3.95, -2.625], 5);
  ok('grass on the lips removes the falls and the pool', (await falls()).length === 0 && (await J(`${M}.fallPool()`)) === 0 && (await mat(X, -2.875)) === 0);
  await wait(800);
  const fsOff = await J(`${M}.fallSheet()`);
  ok('strip, spray, ripples and sound gone again', !fsOff.visible && fsOff.spray === 0 && fsOff.ripples === 0 && fsOff.sound < 0.02, JSON.stringify(fsOff));
  for (const z of [-1.625, -1.875, -2.125, -2.375, -2.625, -2.875]) await drag([3.3, z], [4.6, z], 8);
  { const w = await J(`${M}.terrainWater()`), d = await J(`${M}.islandDigest()`), h = (await J(`${M}.terrainDump(0.05, 1)`)).hash;
    const left = []; for (let qz = 8; qz < 28; qz++) for (let qx = 30; qx < 48; qx++) if ((await J(`${M}.terrainMat(${qx}, ${qz})`)) !== 0) left.push(qx + ',' + qz);
    ok('dried: island meshes and heights exactly as before', w === w0 && same(d0, d) && same(h0, h), `water ${w0} -> ${w}, meshes ${d0.filter((x, i) => x !== d[i]).length} differ, heights ${same(h0, h)}, wet ${left.join(' ')}`); }

  // a stair: the terrace one step higher, a level-1 row north of it, level 0 past that
  await tool('raise');
  for (let gx = 8; gx <= 10; gx++) await clickTile(gx, 2);
  for (let gz = 3; gz <= 5; gz++) for (let gx = 8; gx <= 10; gx++) await clickTile(gx, gz);
  ok('stair raised (2 / 1 / 0)', (await J(`${M}.terrainLevel(9, 4)`)) === 2 && (await J(`${M}.terrainLevel(9, 2)`)) === 1 && (await J(`${M}.terrainLevel(9, 1)`)) === 0);
  await tool('paint_water');
  await drag([X, -1.625], [X, -2.9], 8);
  await drag([X, -3.375], [X, -3.9], 4); // from the first fall's pool over the next edge
  const f3 = await falls();
  ok('falls chain down the stair', f3.some((f) => f.top === 0.96 && f.bot === 0.48) && f3.some((f) => f.top === 0.48 && f.bot === 0), JSON.stringify(f3));
  ok('the lower pool too', (await J(`${M}.pond(${X}, -4.3)`)) < 0 && (await mat(X, -4.3)) === 0);

  // 처음 섬으로
  await evaluate(`${M}.resetIsland()`);
  await wait(1500);
  ok('처음 섬으로: no falls', (await falls()).length === 0 && (await J(`${M}.fallPool()`)) === 0 && !(await J(`${M}.fallSheet()`)).visible);

  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.length ? errs.join(' | ') : 0);
};
