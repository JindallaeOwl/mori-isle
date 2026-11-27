// Paths & walls category (길·담): the stone wall joins the same wall on side neighbours at the same
// height. Places a run of three, reads the drawn arms back (aConn + instance turn -> world sides),
// checks the ghost, props kept off a run, a raised tile breaking the join, erasing and undo, and the
// console. usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/paths.mjs
export default async ({ wait, evaluate, mouse, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? '  ' + extra : ''));
  const M = 'window.__mori', HALF = 6;
  const tool = async (id) => { await evaluate(`document.querySelector('#hud-dock [data-tool="${id}"]').click()`); await wait(300); };
  const at = async (wx, wz) => J(`${M}.project(${wx}, ${await J(`${M}.ground(${wx}, ${wz})`)}, ${wz})`);
  const hover = async (wx, wz) => { const [x, y] = await at(wx, wz); await mouse('mouseMoved', x, y); await wait(400); return [x, y]; };
  const clickWorld = async (wx, wz, button = 'left') => {
    const [x, y] = await hover(wx, wz);
    await mouse('mousePressed', x, y, { button, buttons: button === 'left' ? 1 : 2, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button, clickCount: 1 });
    await wait(1200);
  };
  const tileW = (g) => g - HALF + 0.5;
  // island meshes + grass tufts, and what differs between two of them (for the failure message)
  const snapIsland = async () => ({ d: await J(`${M}.islandDigest()`), g: (await J(`${M}.grassTufts()`)).map((m) => m.join()), l: await J(`${M}.islandList()`) });
  const sameIsland = (a, b) => JSON.stringify(a.d) === JSON.stringify(b.d);
  const why = (a, b) => {
    const sb = new Set(b.g);
    return `meshes ${JSON.stringify(a.d.map((h, i) => (h === b.d[i] ? null : i)).filter((v) => v !== null))}, grass ${a.g.length}->${b.g.length} lost ${a.g.filter((x) => !sb.has(x)).length}, list same ${a.l === b.l}`;
  };
  const walls = () => J(`${M}.walls()`);
  const wallAt = (list, gx, gz) => list.find((w) => w.gx === gx && w.gz === gz && !w.gone);

  const items = await J(`${M}.items()`);
  const def = items.find((d) => d.id === 'stonewall');
  ok('stone wall is in the paths category', def && def.category === 'paths' && !def.freePlace && !def.snapPlace, JSON.stringify(def));
  ok('palette has a stone wall card', await evaluate(`!!document.querySelector('#hud-dock [data-tool="stonewall"]')`));

  // a free straight run of three tiles along x on one level, clear of objects and water
  const isl = JSON.parse(await J(`${M}.islandList()`));
  const used = (gx, gz) => isl.placed.some((p) => p[1] === gx && p[2] === gz)
    || isl.snap.concat(isl.free).some((o) => Math.hypot(o[1] - tileW(gx), o[2] - tileW(gz)) < 0.85);
  let run = null;
  for (let gz = 1; gz < 11 && !run; gz++) for (let gx = 1; gx < 9 && !run; gx++) {
    const lv = await J(`${M}.terrainLevel(${gx}, ${gz})`);
    let good = true;
    for (let k = -1; k <= 3 && good; k++) { // the run plus a spare tile either side
      const x = gx + k;
      if (x < 0 || x > 11) { good = false; break; }
      if (used(x, gz) || (await J(`${M}.terrainLevel(${x}, ${gz})`)) !== lv || (await J(`${M}.pond(${tileW(x)}, ${tileW(gz)})`)) < 0.9) good = false;
      if (used(x, gz - 1) || used(x, gz + 1)) good = false;
    }
    if (good) run = [gx, gz];
  }
  ok('found a free run of tiles', !!run, JSON.stringify(run));
  if (!run) return;
  const [g0, gz] = run;

  await tool('stonewall');
  const n0 = (await J(`${M}.state()`)).placed;
  // ghost on an empty tile with no neighbour: nothing unfolded
  await hover(tileW(g0), tileW(gz));
  ok('ghost alone shows no arms', (await J(`${M}.wallGhostConn()`)) === 0);
  await clickWorld(tileW(g0), tileW(gz));
  // ghost next to the first wall: one arm toward it
  await hover(tileW(g0 + 1), tileW(gz));
  const gc = await J(`${M}.wallGhostConn()`);
  ok('ghost beside a wall unfolds one arm', gc !== null && [1, 2, 4, 8].includes(gc), String(gc));
  await clickWorld(tileW(g0 + 1), tileW(gz));
  await clickWorld(tileW(g0 + 2), tileW(gz));
  ok('placed three walls', (await J(`${M}.state()`)).placed === n0 + 3);
  let w = await walls();
  ok('three wall instances drawn', w.filter((x) => !x.gone).length === 3, JSON.stringify(w));
  ok('first end joins +x only', JSON.stringify(wallAt(w, g0, gz)?.sides) === '["+x"]', JSON.stringify(wallAt(w, g0, gz)));
  ok('middle joins both sides', JSON.stringify(wallAt(w, g0 + 1, gz)?.sides) === '["+x","-x"]', JSON.stringify(wallAt(w, g0 + 1, gz)));
  ok('last end joins -x only', JSON.stringify(wallAt(w, g0 + 2, gz)?.sides) === '["-x"]', JSON.stringify(wallAt(w, g0 + 2, gz)));
  log('  turns of the three tiles: ' + w.map((x) => x.rot).join(','));
  const island3 = await snapIsland();

  // a rock can't be dropped onto the run between two walls, but fits beside it
  await tool('rocks');
  const f0 = (await J(`${M}.state()`)).free;
  await clickWorld(tileW(g0) + 0.5, tileW(gz));
  ok('rock refused on the wall run', (await J(`${M}.state()`)).free === f0);
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await wait(200);

  // raising the end tile breaks its join; lowering it back restores the island exactly
  await tool('raise');
  const allowed = await J(`${M}.terrainAllowed(${g0 + 2}, ${gz}, 1)`);
  if (allowed) {
    await clickWorld(tileW(g0 + 2), tileW(gz));
    w = await walls();
    ok('raised end no longer joins', JSON.stringify(wallAt(w, g0 + 1, gz)?.sides) === '["-x"]' && (wallAt(w, g0 + 2, gz)?.sides.length === 0), JSON.stringify(w));
    await tool('lower');
    await clickWorld(tileW(g0 + 2), tileW(gz));
    const s = await snapIsland();
    ok('lowered back: island exactly as before', sameIsland(island3, s), why(island3, s));
  } else log('SKIP raise test (tile not raisable here)');

  // erase the middle: the ends stand alone; undo brings the run back exactly
  await evaluate(`${M}.vanishHold(false)`);
  await tool('delete');
  await clickWorld(tileW(g0 + 1), tileW(gz));
  await wait(900);
  w = await walls();
  ok('erased the middle wall', (await J(`${M}.state()`)).placed === n0 + 2 && !wallAt(w, g0 + 1, gz), JSON.stringify(w));
  ok('ends stand alone after erasing', wallAt(w, g0, gz)?.sides.length === 0 && wallAt(w, g0 + 2, gz)?.sides.length === 0, JSON.stringify(w));
  await J(`${M}.undo(-1)`); await wait(1500);
  w = await walls();
  ok('undo: the run joins again', JSON.stringify(wallAt(w, g0 + 1, gz)?.sides) === '["+x","-x"]', JSON.stringify(w));
  await wait(1200);
  const s2 = await snapIsland();
  ok('undo: island exactly as before', sameIsland(island3, s2), why(island3, s2));
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);

  await wait(1500);
  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.slice(0, 3).join(' | '));
};
