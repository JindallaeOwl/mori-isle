// Ground paint test (terrain step 3): the terrain slot's paint tools paint quarter tiles by dragging,
// only the turf colours change (topsoil, clay, bedrock and heights stay), painting
// grass back gives exactly the default turf, and "처음 섬으로" clears the paint. Also fails on any console error or warning.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/terrain-paint.mjs
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
  const at = async (wx, wz) => { // screen point of the turf at a world point (lawn: height ~0)
    const [x, y] = await J(`${M}.project(${wx}, 0, ${wz})`);
    return [x, y];
  };
  // drag across the ground from world point a to b
  const drag = async (a, b, steps = 8) => {
    const [x0, y0] = await at(...a);
    await mouse('mouseMoved', x0, y0); await wait(200);
    await mouse('mousePressed', x0, y0, { button: 'left', buttons: 1, clickCount: 1 });
    for (let k = 1; k <= steps; k++) {
      const [x, y] = await at(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps);
      await mouse('mouseMoved', x, y, { button: 'left', buttons: 1 }); await wait(120);
    }
    const [x1, y1] = await at(...b);
    await mouse('mouseReleased', x1, y1, { button: 'left', clickCount: 1 });
    await wait(1200);
  };
  const cell = (wx, wz) => [Math.floor((wx + 6) * 4), Math.floor((wz + 6) * 4)];
  const matRow = async (qx0, qx1, qz) => { const r = []; for (let q = qx0; q <= qx1; q++) r.push(await J(`${M}.terrainMat(${q}, ${qz})`)); return r; };

  const tools = await J(`[...document.querySelectorAll('#hud-dock .item[data-category="terrain"]')].map(b => b.dataset.tool).join()`);
  ok('terrain slot has the four paint tools + water (no flower bed: flowers come from 들꽃 씨앗)', tools === 'raise,lower,paint_grass,paint_sand,paint_dirt,paint_stone,paint_water', tools);
  const d0 = await J(`${M}.islandDigest()`);
  const h0 = (await J(`${M}.terrainDump(0.05, 1)`)).hash;
  ok('nothing painted at start', (await J(`${M}.terrainPainted()`)) === 0);

  // sand across an open lawn strip (z = -2.6, x 2.8 .. 4.2 -> cells 35..40 in row 13)
  const A = [2.8, -2.6], B = [4.2, -2.6];
  const [qa, qz] = cell(...A), [qb] = cell(...B);
  await tool('paint_sand');
  const v0 = await J(`${M}.terrainVersion()`);
  await drag(A, B);
  const row = await matRow(qa, qb, qz);
  ok('dragging 모래 paints every quarter tile along the stroke', row.every((m) => m === 1), JSON.stringify(row));
  ok('painted count and version go up', (await J(`${M}.terrainPainted()`)) >= row.length && (await J(`${M}.terrainVersion()`)) > v0, await J(`${M}.terrainPainted()`));
  ok('the painted ground reads as sand in the middle of the stroke', (await J(`${M}.terrainPaintAt(3.5, ${(qz + 0.5) / 4 - 6})`)) === 1);
  ok('cells beside the stroke stay grass', (await J(`${M}.terrainMat(${qa + 1}, ${qz + 2})`)) === 0 && (await J(`${M}.terrainMat(${qa + 1}, ${qz - 2})`)) === 0);
  const d1 = await J(`${M}.islandDigest()`);
  ok('only the turf mesh changed (topsoil, roots, clay, bedrock as before)', d1[0] !== d0[0] && same(d0.slice(1), d1.slice(1)));
  ok('ground heights unchanged by painting', same(h0, (await J(`${M}.terrainDump(0.05, 1)`)).hash));

  // ground paint over the pond dries it (step 4: tools/tests/terrain-water.mjs tests the strokes)
  const pq = cell(2.35, 2.35);
  ok('ground paint over the pond is allowed (it dries the water)', await J(`${M}.paintAllowed(${pq[0]}, ${pq[1]}, 1)`));

  // stone and dirt work too
  await tool('paint_stone'); await drag([2.8, -0.3], [3.6, -0.3], 4);
  ok('돌바닥 paints stone', (await J(`${M}.terrainMat(${cell(3.2, -0.3).join(', ')})`)) === 3);
  await tool('paint_dirt'); await drag([2.8, 0.15], [3.6, 0.15], 4);
  ok('흙 paints dirt', (await J(`${M}.terrainMat(${cell(3.2, 0.15).join(', ')})`)) === 2);

  // painting grass over everything gives back exactly the default turf
  await tool('paint_grass');
  for (const [a, b] of [[A, B], [[2.8, -0.3], [3.6, -0.3]], [[2.8, 0.15], [3.6, 0.15]]]) await drag(a, b, 10);
  const left = await J(`${M}.terrainPainted()`);
  ok('잔디 paints the default turf back', left === 0 && same(d0, await J(`${M}.islandDigest()`)), `left ${left}`);

  // "처음 섬으로" clears paint
  await tool('paint_sand'); await drag(A, B);
  ok('painted again', (await J(`${M}.terrainPainted()`)) > 0);
  await evaluate(`${M}.resetIsland()`);
  await wait(1500);
  ok('처음 섬으로 clears the paint', (await J(`${M}.terrainPainted()`)) === 0 && same(d0, await J(`${M}.islandDigest()`)));

  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.length ? errs.join(' | ') : 0);
};
