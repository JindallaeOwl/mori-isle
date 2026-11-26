// Terrain editing test (step 2): the terrain slot raises / lowers a clicked tile one step, the
// island meshes are rebuilt (raise then lower gives back exactly the same meshes), the pond, a
// cabin's tile and the 0..3 range are refused, and "처음 섬으로" puts the default hills back.
// Also fails on any console error or warning (shader compile errors included).
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/terrain-edit.mjs
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
  const lvl = (gx, gz) => J(`${M}.terrainLevel(${gx}, ${gz})`);
  const ver = () => J(`${M}.terrainVersion()`);
  const click = async (gx, gz) => {
    const wx = gx - 6 + 0.5, wz = gz - 6 + 0.5, y = (await lvl(gx, gz)) * 0.48;
    const [x, yy] = await J(`${M}.project(${wx}, ${y}, ${wz})`);
    await mouse('mouseMoved', x, yy); await wait(250);
    await mouse('mousePressed', x, yy, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, yy, { button: 'left', clickCount: 1 });
    await wait(900);
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  ok('terrain slot with two tools', (await J(`[...document.querySelectorAll('#hud-dock .item[data-category="terrain"]')].map(b => b.dataset.tool).join()`)) === 'raise,lower');
  const d0 = await J(`${M}.islandDigest()`);
  const h0 = (await J(`${M}.terrainDump(0.05, 1)`)).hash;

  // an open lawn tile the raise tool may change
  let T = null;
  for (const [gx, gz] of [[9, 3], [10, 4], [8, 2], [10, 7], [11, 5], [6, 10]]) {
    if ((await lvl(gx, gz)) === 0 && await J(`${M}.terrainAllowed(${gx}, ${gz}, 1)`)) { T = [gx, gz]; break; }
  }
  ok('found an editable lawn tile', !!T, JSON.stringify(T));
  if (!T) return;

  await tool('raise');
  const v0 = await ver();
  await click(...T);
  ok('click with 땅 올리기 raises the tile one step', (await lvl(...T)) === 1 && (await ver()) === v0 + 1, `level ${await lvl(...T)}`);
  const [px, py] = await J(`${M}.project(${T[0] - 5.5}, 0.48, ${T[1] - 5.5})`);
  const hit = await J(`${M}.hit(${px}, ${py})`);
  ok('the turf under the pointer is rebuilt at the new height', !!hit && Math.abs(hit.wy - 0.48) < 0.06, hit && hit.wy.toFixed(3));
  const d1 = await J(`${M}.islandDigest()`);
  ok('island meshes changed', !same(d0, d1));
  ok('clay and bedrock untouched', d0.length === d1.length && same(d0.slice(-3), d1.slice(-3)));

  await tool('lower');
  await click(...T);
  ok('click with 땅 내리기 lowers it back', (await lvl(...T)) === 0);
  ok('raise then lower gives back exactly the same island meshes', same(d0, await J(`${M}.islandDigest()`)));
  ok('and the same terrain heights', same(h0, (await J(`${M}.terrainDump(0.05, 1)`)).hash));

  // refusals
  const v1 = await ver();
  await click(...T); // lower below the meadow
  ok('cannot dig below the meadow (water editing comes later)', (await lvl(...T)) === 0 && (await ver()) === v1);
  ok('pond tiles are refused', !(await J(`${M}.terrainAllowed(8, 8, 1)`)) && !(await J(`${M}.terrainAllowed(7, 9, 1)`)));
  ok('the cabin tile is refused (cabin needs flat ground)', !(await J(`${M}.terrainAllowed(4, 4, 1)`)));
  await tool('raise');
  for (let i = 0; i < 4; i++) await click(...T);
  ok('raises up to three steps, no more', (await lvl(...T)) === 3, `level ${await lvl(...T)}`);

  // a cabin can't go right beside the raised tile (its walls would sink into the slope)
  const placed0 = (await J(`${M}.state()`)).placed;
  await tool('cabin');
  await click(T[0] + 1, T[1]);
  ok('no cabin beside a step', (await J(`${M}.state()`)).placed === placed0);

  // a hill tile with a tree on it rides along (one-tile items stand on the flat centre)
  ok('a tree tile on the back hill can be raised', await J(`${M}.terrainAllowed(0, 1, 1)`));

  // "처음 섬으로" (debug: no intro) puts the default hills back
  await evaluate(`${M}.resetIsland()`);
  await wait(1500);
  ok('처음 섬으로 restores the default terrain', (await lvl(...T)) === 0 && same(d0, await J(`${M}.islandDigest()`)) && same(h0, (await J(`${M}.terrainDump(0.05, 1)`)).hash));

  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.length ? errs.join(' | ') : 0);
};
