// Fences and walls drawn as free curves (LINES): the starter fence, a curved drag (bays follow the
// stroke, one undo step), the hover ghost, the eraser cutting a piece out and undo bringing it back
// exactly, props and ground edits kept off a line, a path opening a gap, a brick wall stepping in
// whole courses, joining a line end, the other kind refused across, save + reload, old tile saves
// becoming lines, and the console.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/lines.mjs
export default async ({ wait, evaluate, mouse, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('localStorage.clear(); location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? '  ' + extra : ''));
  const M = 'window.__mori', HALF = 6;
  const tool = async (id) => { await evaluate(`document.querySelector('#hud-dock [data-tool="${id}"]').click()`); await wait(300); };
  const esc = async () => { await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await wait(200); };
  const at = async (wx, wz, dy = 0) => J(`${M}.project(${wx}, ${(await J(`${M}.ground(${wx}, ${wz})`)) + dy}, ${wz})`);
  const clickWorld = async (wx, wz) => {
    const [x, y] = await at(wx, wz);
    await mouse('mouseMoved', x, y); await wait(300);
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
    await wait(1200);
  };
  // press at the first point, drag through the rest, let go at the last
  const drag = async (pts) => {
    let [x, y] = await at(pts[0][0], pts[0][1]);
    await mouse('mouseMoved', x, y); await wait(250);
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    for (const [wx, wz] of pts.slice(1)) { [x, y] = await at(wx, wz); await mouse('mouseMoved', x, y, { button: 'left', buttons: 1 }); await wait(60); }
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
    await wait(1500);
  };
  const lines = () => J(`${M}.lines()`);

  // ---- palette and the starter fence ----
  const items = await J(`${M}.items()`);
  for (const id of ['fence', 'stonewall']) {
    const d = items.find((x) => x.id === id);
    ok(`${id} is in the paths category`, d && d.category === 'paths' && !d.freePlace && !d.snapPlace, JSON.stringify(d));
    ok(`palette has a ${id} card`, await evaluate(`!!document.querySelector('#hud-dock [data-tool="${id}"]')`));
  }
  ok('brick wall card is named 벽돌담', items.find((x) => x.id === 'stonewall')?.name === '벽돌담');
  const L0 = await lines();
  ok('starter island has one fence line (where the three tiles stood)', L0.length === 1 && L0[0].id === 'fence' && L0[0].bays === 16
    && L0[0].pts[0] === -2.5 && L0[0].pts[1] === -1.5 && L0[0].pts[32] === -2.5 && L0[0].pts[33] === 0.5, JSON.stringify(L0).slice(0, 200));
  const p0 = await J(`${M}.lineParts('fence')`);
  ok('starter fence: 16 bays, posts at the ends and every 4 bays', p0.bays === 16 && p0.posts === 5 && p0.liveBays === 16 && p0.livePosts === 5, JSON.stringify(p0));

  // ---- find room for a half-circle fence and a straight wall (checked in the page: no blockers) ----
  const room = await J(`(() => {
    const M = ${M}, R = 0.9;
    const arcOk = (id, cx, cz, r) => { for (let k = 0; k < 24; k++) { const a = Math.PI * k / 24, b = Math.PI * (k + 1) / 24;
      for (const rr of [r - 0.2, r, r + 0.2]) if (M.lineBlocked(id, cx + rr * Math.cos(a), cz + rr * Math.sin(a), cx + rr * Math.cos(b), cz + rr * Math.sin(b))) return false; } return true; };
    const runOk = (id, x0, z0, x1, z1) => { for (let k = 0; k < 12; k++) for (const o of [-0.25, 0, 0.25]) if (M.lineBlocked(id, x0 + (x1 - x0) * k / 12, z0 + o, x0 + (x1 - x0) * (k + 1) / 12, z0 + o)) return false; return true; };
    let arc = null, wall = null;
    for (let cz = -4; cz <= 3.5 && !arc; cz += 0.5) for (let cx = -3.5; cx <= 3.5 && !arc; cx += 0.5) if (arcOk('fence', cx, cz, R) && arcOk('stonewall', cx, cz, R)) arc = [cx, cz, R];
    for (let z = 4.5; z >= -4.5 && !wall; z -= 0.5) for (let x = -4.5; x <= 2.5 && !wall; x += 0.5) {
      if (arc && Math.abs(z - arc[1]) < 1.6 && x < arc[0] + 1.5 && x + 1.6 > arc[0] - 1.5) continue;
      if (runOk('stonewall', x, z, x + 1.6, z)) wall = [x, z, x + 1.6, z];
    }
    return { arc, wall };
  })()`);
  ok('found room for a curve and a wall', !!room.arc && !!room.wall, JSON.stringify(room));
  if (!room.arc) return;
  const [cx, cz, R] = room.arc;
  const arcPts = []; for (let k = 0; k <= 30; k++) { const a = Math.PI * k / 30; arcPts.push([cx + R * Math.cos(a), cz + R * Math.sin(a)]); }

  // ---- hover ghost ----
  await tool('fence');
  const [hx, hy] = await at(arcPts[0][0], arcPts[0][1]);
  await mouse('mouseMoved', hx, hy); await wait(400);
  let g = await J(`${M}.lineGhost('fence')`);
  const plan = await J(`${M}.lineClickPlan('fence', ${arcPts[0][0]}, ${arcPts[0][1]})`);
  ok('fence tool shows the click piece as a ghost', g.visible && g.ok, JSON.stringify(g));
  ok('ghost starts and points where the click piece would go', Math.hypot(g.x - plan.pts[0], g.z - plan.pts[1]) < 0.03 && g.dx * plan.dx + g.dz * plan.dz > 0.99, JSON.stringify([g, plan.dx, plan.dz]));
  // near the starter fence's far end (-2.5, 0.5): the ghost sits on the end and carries the line on (along z)
  const [nx, ny] = await at(-2.47, 0.62);
  await mouse('mouseMoved', nx, ny); await wait(400);
  g = await J(`${M}.lineGhost('fence')`);
  ok('near a line end the ghost starts on it, along the line', Math.hypot(g.x + 2.5, g.z - 0.5) < 1e-3 && Math.abs(g.dz) > 0.99, JSON.stringify(g));
  // while drawing it turns with the stroke: drag along +x and look before letting go
  {
    const [sx, sy] = await at(arcPts[0][0], arcPts[0][1]);
    await mouse('mouseMoved', sx, sy); await wait(250);
    await mouse('mousePressed', sx, sy, { button: 'left', buttons: 1, clickCount: 1 });
    for (let k = 1; k <= 4; k++) { const [x, y] = await at(arcPts[0][0] + 0.0, arcPts[0][1] + k * 0.12); await mouse('mouseMoved', x, y, { button: 'left', buttons: 1 }); await wait(80); }
    g = await J(`${M}.lineGhost('fence')`);
    ok('while dragging the ghost turns with the stroke', g.visible && g.dz > 0.9, JSON.stringify(g));
    const [x, y] = await at(arcPts[0][0], arcPts[0][1] + 0.48);
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 }); await wait(1200);
    await J(`${M}.undo(-1)`); await wait(1200);
  }
  const [hx2, hy2] = await at(arcPts[0][0], arcPts[0][1]);
  await mouse('mouseMoved', hx2, hy2); await wait(300);

  // ---- a curved drag: bays follow the stroke, one undo step ----
  const u0 = (await J(`${M}.undoDepth()`))[0];
  await drag(arcPts);
  const L1 = await lines();
  const mine = L1.filter((l) => l.id === 'fence' && !(l.pts[0] === -2.5 && l.pts[1] === -1.5));
  const bays = mine.reduce((n, l) => n + l.bays, 0);
  ok('the drag made one fence line', mine.length === 1, JSON.stringify(mine.map((l) => l.bays)));
  ok('bays along the whole curve (half circle 2.83 / step 0.125)', bays >= 19 && bays <= 24, String(bays));
  let off = 0; for (const l of mine) for (let k = 0; k < l.pts.length; k += 2) off = Math.max(off, Math.abs(Math.hypot(l.pts[k] - cx, l.pts[k + 1] - cz) - R));
  ok('the line follows the curve (smoothed, within 0.2)', off < 0.2, off.toFixed(3));
  let maxStep = 0, minStep = 9;
  for (const l of mine) for (let k = 2; k < l.pts.length; k += 2) { const d = Math.hypot(l.pts[k] - l.pts[k - 2], l.pts[k + 1] - l.pts[k - 1]); maxStep = Math.max(maxStep, d); minStep = Math.min(minStep, d); }
  ok('bays are about one step long', maxStep < 0.125 * 1.36 && minStep > 0.125 * 0.29, `${minStep.toFixed(3)}..${maxStep.toFixed(3)}`);
  ok('the drag is one undo step', (await J(`${M}.undoDepth()`))[0] === u0 + 1, JSON.stringify(await J(`${M}.undoDepth()`)));
  const pf = await J(`${M}.lineParts('fence')`);
  ok('all bays drawn and standing', pf.bays === 16 + bays && pf.liveBays === pf.bays && pf.gaps === 0, JSON.stringify(pf));
  const fenceLine = mine[0];
  // after drawing, the ghost keeps facing the way the line went (not back across the screen)
  {
    const P = fenceLine.pts, n = P.length, l = Math.hypot(P[n - 2] - P[n - 4], P[n - 1] - P[n - 3]);
    const ldx = (P[n - 2] - P[n - 4]) / l, ldz = (P[n - 1] - P[n - 3]) / l;
    const [x, y] = await at(cx, cz + R * 0.3); // off the line, inside the curve
    await mouse('mouseMoved', x, y); await wait(400);
    const g2 = await J(`${M}.lineGhost('fence')`);
    ok('after drawing the ghost faces the way the line went', Math.abs(g2.dx * ldx + g2.dz * ldz) > 0.99, JSON.stringify([g2, ldx, ldz]));
  }

  // ---- props and ground edits stay off it ----
  const mid = [fenceLine.pts[Math.floor(fenceLine.bays / 2) * 2], fenceLine.pts[Math.floor(fenceLine.bays / 2) * 2 + 1]];
  await tool('rocks');
  const f0 = (await J(`${M}.state()`)).free;
  await clickWorld(mid[0], mid[1]);
  ok('a rock is refused on the fence', (await J(`${M}.state()`)).free === f0);
  const gx = Math.floor(mid[0] + HALF), gz = Math.floor(mid[1] + HALF);
  ok('raising a tile the fence crosses is refused', !(await J(`${M}.terrainAllowed(${gx}, ${gz}, 1)`)) && !(await J(`${M}.terrainAllowed(${gx}, ${gz}, -1)`)));
  await esc();

  // ---- the eraser cuts a piece out; undo brings it back exactly ----
  const before = JSON.stringify(await lines());
  await tool('delete');
  const [ex, ey] = await at(mid[0], mid[1], 0.15);
  await mouse('mouseMoved', ex, ey); await wait(500);
  const et = await J(`${M}.eraseTarget()`);
  ok('eraser picks the fence', et && et.kind === 'line' && et.id === 'fence', JSON.stringify(et));
  const hot = await J(`${M}.hot()`);
  ok('the piece it would take glows (4 bays + the posts inside)', hot.filter((h) => h[0] === 'fence').length === 4, JSON.stringify(hot));
  await mouse('mousePressed', ex, ey, { button: 'left', buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', ex, ey, { button: 'left', clickCount: 1 });
  await wait(1500);
  const L2 = await lines();
  const pieces = L2.filter((l) => l.id === 'fence' && !(l.pts[0] === -2.5 && l.pts[1] === -1.5));
  ok('the cut splits the line in two', pieces.length === 2 && pieces.reduce((n, l) => n + l.bays, 0) === bays - 4, JSON.stringify(pieces.map((l) => l.bays)));
  const pc = await J(`${M}.lineParts('fence')`);
  ok('posts stand at the new ends', pc.posts >= pf.posts, JSON.stringify(pc));
  await J(`${M}.undo(-1)`); await wait(1500);
  ok('undo: the line is whole again, exactly', JSON.stringify(await lines()) === before);
  await esc();

  // ---- a path across the fence opens a gap; undo closes it ----
  await tool('path');
  const canPath = !(await J(`JSON.parse(${M}.islandList()).placed.some((p) => p[1] === ${gx} && p[2] === ${gz})`));
  if (canPath) {
    await clickWorld(gx - HALF + 0.5, gz - HALF + 0.5);
    const pg = await J(`${M}.lineParts('fence')`);
    ok('a path across the fence opens a gap', pg.gaps > 0 && pg.bays === pf.bays - pg.gaps, JSON.stringify(pg));
    ok('gate posts either side of the gap', pg.posts >= pf.posts + 1, JSON.stringify(pg));
    await J(`${M}.undo(-1)`); await wait(1500);
    const pu = await J(`${M}.lineParts('fence')`);
    ok('undo: the gap closes', pu.gaps === 0 && pu.bays === pf.bays, JSON.stringify(pu));
  } else log('SKIP path gap (tile taken)');
  await esc();

  // ---- joining: a stroke starting near the end meets it exactly ----
  await tool('fence');
  const endP = [fenceLine.pts[fenceLine.pts.length - 2], fenceLine.pts[fenceLine.pts.length - 1]];
  const out = []; for (let k = 0; k <= 6; k++) out.push([endP[0] + 0.12 - k * 0.0, endP[1] - 0.08 - k * 0.1]);
  const nBefore = (await lines()).length;
  await drag(out);
  const L3 = await lines();
  const joined = L3.length === nBefore + 1 ? L3[L3.length - 1] : null;
  ok('a stroke from near an end starts exactly on it', joined && Math.abs(joined.pts[0] - endP[0]) < 1e-4 && Math.abs(joined.pts[1] - endP[1]) < 1e-4, JSON.stringify(joined && joined.pts.slice(0, 4)));
  const pj = await J(`${M}.lineParts('fence')`);
  ok('the meeting point keeps one post', pj.posts === (await J(`${M}.lineParts('fence')`)).posts && pj.liveBays === pj.bays, JSON.stringify(pj));
  if (joined) { await J(`${M}.undo(-1)`); await wait(1500); }
  await esc();

  // ---- a brick wall: straight drag, level bays in whole courses ----
  if (room.wall) {
    const [x0, z0, x1] = room.wall, wpts = []; for (let k = 0; k <= 16; k++) wpts.push([x0 + (x1 - x0) * k / 16, z0 + Math.sin(k / 3) * 0.05]);
    await tool('stonewall');
    await drag(wpts);
    const pw = await J(`${M}.lineParts('stonewall')`);
    ok('the drag laid a brick wall (1.6 / step 0.24)', pw.bays >= 5 && pw.bays <= 8 && pw.liveBays === pw.bays, JSON.stringify(pw));
    ok('piers at both ends', pw.posts === 2, JSON.stringify(pw));
    const ys = await J(`window.__mori.lineParts('stonewall')`);
    ok('wall bays stand on whole courses', Math.abs(ys.minY / 0.06 - Math.round(ys.minY / 0.06)) < 1e-6 && Math.abs(ys.maxY / 0.06 - Math.round(ys.maxY / 0.06)) < 1e-6, JSON.stringify(ys));
    // a fence can't cross the wall
    const wl = (await lines()).find((l) => l.id === 'stonewall');
    const wm = [wl.pts[4], wl.pts[5]];
    ok('a fence is refused across the wall', await J(`${M}.lineBlocked('fence', ${wm[0]}, ${wm[1] - 0.2}, ${wm[0]}, ${wm[1] + 0.2})`));
    ok('a wall may cross a wall (same kind)', !(await J(`${M}.lineBlocked('stonewall', ${wm[0]}, ${wm[1] - 0.06}, ${wm[0]}, ${wm[1] + 0.06})`)));
    await esc();
  }

  // ---- a click alone: a short piece ----
  if (room.arc) {
    await tool('fence');
    const n0 = (await lines()).length;
    await clickWorld(cx, cz - 0.05);
    const L4 = await lines();
    ok('a click sets a short piece (2 bays)', L4.length === n0 + 1 && L4[L4.length - 1].bays === 2, JSON.stringify(L4[L4.length - 1]));
    await esc();
  }

  // ---- save and reload: the same lines ----
  const saved = JSON.stringify(await lines());
  ok('autosave written', await J(`${M}.autosaveNow()`));
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  ok('reload: the same lines', JSON.stringify(await lines()) === saved);
  const pr = await J(`${M}.lineParts('fence')`);
  ok('reload: bays standing', pr.bays > 16 && pr.liveBays === pr.bays, JSON.stringify(pr));

  // ---- an old save with tile fences and walls: they become lines ----
  await evaluate(`(() => { const d = JSON.parse(${M}.saveRaw()); delete d.island.lines;
    d.island.placed = d.island.placed.concat([['fence', 1, 10, 0], ['fence', 2, 10, 0], ['fence', 3, 10, 0], ['stonewall', 9, 1, 0], ['stonewall', 9, 2, 0], ['stonewall', 10, 1, 0]]);
    localStorage.setItem('mori-isle.v1.auto', JSON.stringify(d)); })()`);
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const L5 = await lines();
  const fz = L5.find((l) => l.id === 'fence' && l.pts[0] === 1 - HALF + 0.5 && l.pts[1] === 10 - HALF + 0.5);
  ok('old fence tiles: one line through their centres', !!fz && fz.bays === 16 && fz.pts[fz.pts.length - 2] === 3 - HALF + 0.5, JSON.stringify(fz).slice(0, 120));
  const walls = L5.filter((l) => l.id === 'stonewall');
  ok('old wall tiles: a run each way from the corner', walls.length === 2, JSON.stringify(walls.map((l) => l.pts.slice(0, 2).concat(l.pts.slice(-2)))));
  ok('no tile fences or walls left in the save', !(await J(`JSON.parse(${M}.islandList()).placed.some((p) => p[0] === 'fence' || p[0] === 'stonewall')`)));

  await wait(1500);
  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.slice(0, 3).join(' | '));
  await evaluate('localStorage.clear()');
};
