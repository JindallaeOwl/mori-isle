// Water test (terrain step 4): the 물 tool paints quarter tiles of water by dragging, the basin digs
// itself (pond SDF < 0, ground sinks, water sheet grows), other ground paints it dry, painting it back
// gives exactly the starter island, cabins / terrace slopes / the island rim are refused, water works
// on a raised 3x3 terrace (surface at that step) and blocks lowering the tiles it needs flat, and
// "처음 섬으로" restores the starter pond. Also fails on any console error or warning.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/terrain-water.mjs
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
  // screen point whose ray hit lands on world (wx, wz): start from the projection, nudge by the miss
  const at = async (wx, wz) => {
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
  const water = () => J(`${M}.terrainWater()`);

  const tools = await J(`[...document.querySelectorAll('#hud-dock .item[data-category="terrain"]')].map(b => b.dataset.tool).join()`);
  ok('terrain slot ends with the 물 tool', tools === 'raise,lower,paint_grass,paint_sand,paint_dirt,paint_stone,paint_water', tools);
  const w0 = await water(), sheet0 = await J(`${M}.waterSheet()`);
  ok('the starter pond is water cells', w0 > 150 && (await J(`${M}.pond(2.35, 2.35)`)) < -1, w0);
  ok('starter water sheet, mist and lilies are there', sheet0.water > 0 && sheet0.mist >= sheet0.water && sheet0.lilies.every(Boolean), JSON.stringify(sheet0));
  const d0 = await J(`${M}.islandDigest()`);
  const h0 = (await J(`${M}.terrainDump(0.05, 1)`)).hash;

  // a new pool on the open lawn
  const A = [2.875, -0.875], B = [3.625, -0.875]; // cell row centre (row 20), cells 35..38
  await tool('paint_water');
  await drag(A, B);
  const row = []; for (let x = 2.875; x <= 3.7; x += 0.25) row.push(await mat(x, -0.875));
  ok('dragging 물 turns the stroke into water cells', row.every((m) => m === 4), JSON.stringify(row));
  ok('water count goes up', (await water()) >= w0 + row.length, await water());
  const sdf = await J(`${M}.pond(3.3, -0.8)`), g = await J(`${M}.ground(3.3, -0.8)`);
  ok('the new pool is under water and its basin dug itself', sdf < 0 && g < -0.15, `sdf ${sdf.toFixed(3)} ground ${g.toFixed(3)}`);
  ok('the water sheet grew', (await J(`${M}.waterSheet()`)).water > sheet0.water);

  // dry it again with grass: exactly the starter island
  await tool('paint_grass');
  await drag(A, B, 10);
  ok('잔디 dries the pool', (await water()) === w0 && (await mat(3.3, -0.8)) === 0, await water());
  ok('dried: island meshes and heights exactly as at start', same(d0, await J(`${M}.islandDigest()`)) && same(h0, (await J(`${M}.terrainDump(0.05, 1)`)).hash));

  // painting sand into the starter pond dries those cells; water paints them back
  await tool('paint_sand');
  await drag([2.125, 2.375], [2.625, 2.375], 4);
  ok('모래 over the pond replaces water with sand', (await mat(2.35, 2.35)) === 1 && (await water()) < w0);
  await tool('paint_water');
  await drag([2.125, 2.375], [2.625, 2.375], 4);
  ok('물 fills it back to the starter pond', (await water()) === w0 && (await J(`${M}.terrainPainted()`)) === 0 && same(d0, await J(`${M}.islandDigest()`)));

  // refusals
  ok('no water on the cabin', !(await allowed(-1.5, -1.5)));
  ok('no water on a terrace slope', !(await allowed(-3.0, 0.5)));
  ok('no water at the island rim', !(await allowed(5.8, -0.8)));
  ok('no water on a path tile', !(await allowed(-1.5, -0.5)));
  ok('water allowed on open lawn', await allowed(3.3, -0.8));

  // a pond on a raised terrace
  await evaluate(`document.getElementById('pop-clear').click()`); await wait(1200);
  await tool('raise');
  for (let gz = 3; gz <= 5; gz++) for (let gx = 8; gx <= 10; gx++) await clickTile(gx, gz);
  let lv = []; for (let gz = 3; gz <= 5; gz++) for (let gx = 8; gx <= 10; gx++) lv.push(await J(`${M}.terrainLevel(${gx}, ${gz})`));
  ok('raised a 3x3 terrace', lv.every((v) => v === 1), JSON.stringify(lv));
  ok('water allowed in the middle of the terrace', await allowed(3.5, -1.5));
  ok('water refused near the terrace edge', !(await allowed(2.15, -1.5)));
  await tool('paint_water');
  const wBefore = await water();
  await drag([3.375, -1.625], [3.625, -1.625], 3);
  const gh = await J(`${M}.ground(3.5, -1.625)`);
  ok('a pool on the terrace, basin dug into the terrace top', (await water()) > wBefore && (await J(`${M}.pond(3.5, -1.625)`)) < 0 && gh < 0.48 - 0.1 && gh > 0.1, `ground ${gh.toFixed(3)}`);
  ok('the tile under the pool can not be lowered', !(await J(`${M}.terrainAllowed(9, 4, -1)`)));
  ok('lowering a terrace tile the pool needs flat is refused', !(await J(`${M}.terrainAllowed(8, 4, -1)`)));

  // 처음 섬으로
  await evaluate(`${M}.resetIsland()`);
  await wait(1500);
  ok('처음 섬으로 restores the starter pond', (await water()) === w0 && same(d0, await J(`${M}.islandDigest()`)));

  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.length ? errs.join(' | ') : 0);
};
