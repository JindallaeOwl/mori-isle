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

  // ---- stepping stones: on the water only, a click = one, a drag lays a row (one undo step) ----
  const sdef = items.find((d) => d.id === 'steppingstone');
  ok('stepping stone is a free prop in paths', sdef && sdef.category === 'paths' && sdef.freePlace, JSON.stringify(sdef));
  const onWater = async (wx, wz) => J(`${M}.project(${wx}, ${await J(`${M}.waterY(${wx}, ${wz})`)}, ${wz})`); // aim at the surface
  const pressAt = async ([x, y]) => { await mouse('mouseMoved', x, y); await wait(300); await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 }); };
  const release = async ([x, y]) => { await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 }); await wait(1200); };
  // a spot deep in the pond, and a straight line across open water from it
  let P = null, Q = null;
  for (let z = -5; z <= 5 && !Q; z += 0.25) for (let x = -5; x <= 5 && !Q; x += 0.25) {
    if ((await J(`${M}.pond(${x}, ${z})`)) > -0.45 || !(await J(`${M}.stoneOk(${x}, ${z})`))) continue;
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      let good = true;
      for (let s = 0.25; s <= 1.4 && good; s += 0.25) if ((await J(`${M}.pond(${x + dx * s}, ${z + dz * s})`)) > -0.3) good = false;
      if (good) { P = [x, z]; Q = [x + dx * 1.4, z + dz * 1.4]; break; }
    }
  }
  ok('found open water for a row of stones', !!Q, JSON.stringify([P, Q]));
  if (Q) {
    await tool('steppingstone');
    const f0 = (await J(`${M}.state()`)).free, u0 = (await J(`${M}.undoDepth()`))[0];
    // one click: one stone, standing at the water surface right where the pointer aimed
    const a = await onWater(P[0], P[1]);
    await pressAt(a); await release(a);
    let st = await J(`${M}.stones()`);
    const near = st.find((s) => Math.hypot(s[0] - P[0], s[2] - P[1]) < 0.08);
    ok('click sets one stone where aimed', (await J(`${M}.state()`)).free === f0 + 1 && !!near, JSON.stringify(st));
    ok('stone stands at the water surface', near && Math.abs(near[1] - (await J(`${M}.waterY(${P[0]}, ${P[1]})`))) < 1e-4, JSON.stringify(near));
    // the same spot again: too close to the first
    await pressAt(a); await release(a);
    ok('no second stone on top of the first', (await J(`${M}.state()`)).free === f0 + 1);
    // on land: refused
    const land = await at(tileW(g0), tileW(gz) + 1.2);
    await pressAt(land); await release(land);
    ok('no stone on dry land', (await J(`${M}.state()`)).free === f0 + 1);
    // drag across the water from just past the first stone: a row at a stride apart
    const dx = (Q[0] - P[0]) / 1.4, dz = (Q[1] - P[1]) / 1.4;
    const u1 = (await J(`${M}.undoDepth()`))[0];
    const from = [P[0] + dx * 0.36, P[1] + dz * 0.36];
    await pressAt(await onWater(from[0], from[1]));
    for (let s = 0.4; s <= 1.4001; s += 0.1) {
      const [x, y] = await onWater(P[0] + dx * s, P[1] + dz * s);
      await mouse('mouseMoved', x, y, { button: 'left', buttons: 1 }); await wait(250);
    }
    await release(await onWater(Q[0], Q[1]));
    st = await J(`${M}.stones()`);
    const made = (await J(`${M}.state()`)).free - (f0 + 1);
    let minGap = 9;
    for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) minGap = Math.min(minGap, Math.hypot(st[i][0] - st[j][0], st[i][2] - st[j][2]));
    ok('a drag lays a row of stones', made >= 3, `${made} more`);
    ok('stones keep apart', minGap > 0.22, minGap.toFixed(3));
    ok('the drag is one undo step', (await J(`${M}.undoDepth()`))[0] === u1 + 1, JSON.stringify(await J(`${M}.undoDepth()`)));
    // painting land over a stone's water is refused
    const qx = Math.floor((P[0] + HALF) * 4), qz = Math.floor((P[1] + HALF) * 4);
    ok('ground paint refused under a stone', (await J(`${M}.paintAllowed(${qx}, ${qz}, 0)`)) === false);
    // erase one: it floats off; undo the row: back to the single stone
    await J(`${M}.undo(-1)`); await wait(1500);
    ok('undo takes the whole row back', (await J(`${M}.state()`)).free === f0 + 1);
    await tool('delete');
    const [ex, ey] = await onWater(P[0], P[1]);
    await mouse('mouseMoved', ex, ey); await wait(400);
    ok('eraser picks the stone', (await J(`${M}.eraseTarget()`))?.id === 'steppingstone', JSON.stringify(await J(`${M}.eraseTarget()`)));
    await pressAt([ex, ey]); await release([ex, ey]);
    ok('erased the stone', (await J(`${M}.state()`)).free === f0);
    ok('undo depth counts the edits (click, drag, erase; undone drag)', (await J(`${M}.undoDepth()`))[0] === u0 + 2, JSON.stringify(await J(`${M}.undoDepth()`)));
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
  }
  await wait(1500);
  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.slice(0, 3).join(' | '));
};
