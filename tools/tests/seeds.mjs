// 들꽃 씨앗 test: a click sows a handful of single flowers (spaced apart, mixed colours, growing in
// from the ground), dragging sows more, nothing comes up in the pond, painted ground hides them and
// grass brings them back, the eraser takes a patch, "처음 섬으로" clears them, and an island with no
// seeds keeps the seed mesh hidden (no draw call). Also fails on any console error or warning.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/seeds.mjs
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
  const at = async (wx, wz) => J(`${M}.project(${wx}, 0, ${wz})`);
  const drag = async (a, b, steps = 8) => {
    const [x0, y0] = await at(...a);
    await mouse('mouseMoved', x0, y0); await wait(200);
    await mouse('mousePressed', x0, y0, { button: 'left', buttons: 1, clickCount: 1 });
    for (let k = 1; k <= steps; k++) {
      const [x, y] = await at(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps);
      await mouse('mouseMoved', x, y, { button: 'left', buttons: 1 }); await wait(150);
    }
    const [x1, y1] = await at(...b);
    await mouse('mouseReleased', x1, y1, { button: 'left', clickCount: 1 });
    await wait(900);
  };
  const click = (p) => drag(p, p, 0);
  const seeds = async () => (await J(`${M}.seedFlowers()`));
  const count = async () => (await J(`${M}.state()`)).seeds;

  ok('들꽃 씨앗 sits in the nature slot, apart from 들꽃', (await J(`[...document.querySelectorAll('#hud-dock .item[data-category="nature"]')].map(b => b.dataset.tool)`)).join().includes('flowers,seeds'));
  ok('no seeds at start: the seed mesh is hidden (no draw call)', (await count()) === 0 && !(await J(`${M}.instanceVisible('seeds')`)));

  const free0 = (await J(`${M}.state()`)).free;
  await tool('seeds');
  const P = [3.5, -2.5];
  await click(P);
  let s = await seeds();
  const n1 = s.list.length;
  ok('a click sows a handful of flowers', n1 >= 4 && n1 <= 8, n1);
  ok('they are drawn by the seed mesh', (await J(`${M}.instanceCount('seeds')`)) === n1 && (await J(`${M}.instanceVisible('seeds')`)));
  ok('all within the sowing circle', s.list.every(([x, z]) => Math.hypot(x - P[0], z - P[1]) <= 0.51));
  ok('they grow in from the ground (growth starts at the click)', s.list.every((f) => f[3] > s.now - 2.5));
  ok('seeds are not 들꽃 clumps (free props unchanged)', (await J(`${M}.state()`)).free === free0);

  await drag([2.4, -1.4], [4.6, -1.4], 10);
  s = await seeds();
  ok('dragging keeps sowing along the stroke', s.list.length >= n1 + 12, s.list.length);
  let minD = 9;
  for (let i = 0; i < s.list.length; i++) for (let j = i + 1; j < s.list.length; j++) minD = Math.min(minD, Math.hypot(s.list[i][0] - s.list[j][0], s.list[i][1] - s.list[j][1]));
  ok('flowers keep a little gap', minD >= 0.084, minD.toFixed(3));
  const tints = new Set(s.list.map((f) => f[2]));
  ok('colours are mixed', tints.size >= 3, [...tints].join());

  // the pond
  const before = s.list.length;
  await click([2.35, 2.35]);
  s = await seeds();
  const wet = [];
  for (const [x, z] of s.list) if ((await J(`${M}.pond(${x}, ${z})`)) < 0.1) wet.push([x, z]);
  ok('nothing comes up in the water', s.list.length === before && wet.length === 0, `${s.list.length - before} new, ${wet.length} wet`);

  // painted ground hides flowers, grass brings them back
  const shown0 = await J(`${M}.instanceCount('seeds')`);
  await tool('paint_sand'); await drag([2.6, -2.5], [4.4, -2.5], 10); await drag([2.6, -2.25], [4.4, -2.25], 10); await drag([2.6, -2.75], [4.4, -2.75], 10);
  const shown1 = await J(`${M}.instanceCount('seeds')`);
  ok('sand painted over flowers hides them (they stay sown)', shown1 < shown0 && (await count()) === s.list.length, `${shown0} -> ${shown1}`);
  await tool('paint_grass'); await drag([2.6, -2.5], [4.4, -2.5], 10); await drag([2.6, -2.25], [4.4, -2.25], 10); await drag([2.6, -2.75], [4.4, -2.75], 10);
  ok('grass brings them back', (await J(`${M}.instanceCount('seeds')`)) === shown0, `${await J(`${M}.instanceCount('seeds')`)}`);

  // eraser
  const c0 = await count();
  await tool('delete');
  const f0 = s.list[s.list.length - 1];
  await click([f0[0], f0[1]]);
  const c1 = await count();
  ok('the eraser takes a small patch', c1 < c0 && c1 > 0, `${c0} -> ${c1}`);

  // reset
  await evaluate(`${M}.resetIsland()`);
  await wait(1500);
  ok('처음 섬으로 clears the seeds', (await count()) === 0 && !(await J(`${M}.instanceVisible('seeds')`)));

  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.length ? errs.join(' | ') : 0);
};
