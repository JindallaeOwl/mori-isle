// Eraser + undo test. The eraser picks the object nearest the pointer on screen (any kind), flushes
// it red (aHot) or puts a red ghost over it (cabins, paths, fences), erases it with a float-away
// (aVanish / unmerged cabin parts, gone after VANISH_T), and a drag erases several in one undo step.
// Ctrl+Z / Ctrl+Shift+Z (also by key position) undo and redo every edit; undoing everything gives
// back exactly the starting island. Fails on any console error or warning.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/eraser.mjs
export default async ({ wait, evaluate, mouse, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? '  ' + extra : ''));
  const M = 'window.__mori';
  const tool = async (id) => { await evaluate(`document.querySelector('#hud-dock [data-tool="${id}"], #btn-eraser[data-tool="${id}"]').click()`); await wait(300); };
  const isl = async () => JSON.parse(await J(`${M}.islandList()`));
  const digest = () => J(`${M}.islandDigest()`);
  const ground = (x, z) => J(`${M}.ground(${x}, ${z})`);
  const at = async (x, y, z) => J(`${M}.project(${x}, ${y}, ${z})`);
  const click = async ([x, y], button = 'left') => {
    await mouse('mouseMoved', x, y); await wait(200);
    await mouse('mousePressed', x, y, { button, buttons: button === 'left' ? 1 : 2, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button, clickCount: 1 });
    await wait(500);
  };
  const ctrlKey = async (code, shift = false) => {
    const k = code === 'KeyZ' ? 'z' : 'y', modifiers = 2 | (shift ? 8 : 0);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers });
    await wait(600);
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const I0 = await isl(), D0 = await digest();
  ok('starter island has trees, a cabin and props', I0.placed.some((p) => p[0] === 'pine') && I0.placed.some((p) => p[0] === 'cabin') && I0.free.length >= 3);
  await tool('delete');
  ok('no grid in eraser mode (no tile cursor)', !(await J(`${M}.eraseTarget()`)));

  // 1) a pine, picked by its canopy on screen
  const pine = I0.placed.find((p) => p[0] === 'pine');
  const px = pine[1] - 6 + 0.5, pz = pine[2] - 6 + 0.5, py = await ground(px, pz);
  const pinePt = await at(px, py + 0.7, pz);
  const pick = await J(`${M}.erasePick(${pinePt[0]}, ${pinePt[1]})`);
  ok('pointer on a canopy picks that tree', pick && pick.kind === 'placed' && pick.id === 'pine' && Math.abs(pick.x - px) < 0.01 && Math.abs(pick.z - pz) < 0.01, JSON.stringify(pick));
  await mouse('mouseMoved', pinePt[0], pinePt[1]); await wait(400);
  const hot = await J(`${M}.hot()`);
  ok('the target flushes red (aHot on its instance)', hot.length === 1 && hot[0][0] === 'pine', JSON.stringify(hot));
  await evaluate(`${M}.vanishHold(true)`); // headless frames take seconds: hold the float-away to look at it
  await click(pinePt);
  const I1 = await isl(), v1 = await J(`${M}.vanishing()`);
  ok('click erases just that tree', I1.placed.length === I0.placed.length - 1 && !I1.placed.some((p) => p[1] === pine[1] && p[2] === pine[2]));
  ok('it floats away (aVanish instance still drawn)', v1.inst >= 1 && v1.list >= 1, JSON.stringify(v1));
  await evaluate(`${M}.vanishHold(false)`);
  await wait(1200);
  const v1b = await J(`${M}.vanishing()`);
  ok('...and is gone from the buffers after VANISH_T', v1b.inst === 0 && v1b.list === 0, JSON.stringify(v1b));
  ok('one undo step', same(await J(`${M}.undoDepth()`), [1, 0]));

  // 2) the cabin: red ghost, parts float away
  const cab = I0.placed.find((p) => p[0] === 'cabin');
  const cx = cab[1] - 6 + 0.5, cz = cab[2] - 6 + 0.5, cy = await ground(cx, cz);
  const cabPt = await at(cx, cy + 0.6, cz);
  await mouse('mouseMoved', cabPt[0], cabPt[1]); await wait(400);
  const ct = await J(`${M}.eraseTarget()`);
  ok('pointer on the cabin targets it with a red ghost', ct && ct.id === 'cabin' && (await J(`${M}.eraseGhost()`)), JSON.stringify(ct));
  await evaluate(`${M}.vanishHold(true)`);
  await click(cabPt);
  const v2 = await J(`${M}.vanishing()`);
  ok('the cabin comes apart (unmerged prefab floating away)', v2.cabins === 1, JSON.stringify(v2));
  await evaluate(`${M}.vanishHold(false)`);
  await wait(1200);
  ok('...then it is gone', (await J(`${M}.vanishing()`)).cabins === 0);
  const I2 = await isl();
  ok('cabin out of the list', I2.placed.length === I1.placed.length - 1 && !I2.placed.some((p) => p[0] === 'cabin'));

  // 3) a drag across three free props: one stroke, one undo step
  const frees = I2.free.slice(0, 3);
  const pts = [];
  for (const f of frees) pts.push(await at(f[1], (await ground(f[1], f[2])) + 0.05, f[2]));
  const depth0 = (await J(`${M}.undoDepth()`))[0];
  await mouse('mouseMoved', pts[0][0], pts[0][1]); await wait(200);
  await mouse('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1 });
  for (const p of pts.slice(1)) {
    for (let k = 1; k <= 4; k++) { await mouse('mouseMoved', p[0], p[1], { buttons: 1 }); await wait(120); }
  }
  await mouse('mouseReleased', pts[2][0], pts[2][1], { button: 'left', clickCount: 1 });
  await wait(500);
  const I3 = await isl();
  ok('a drag erases what it passes', I3.free.length <= I2.free.length - 2, `${I2.free.length} -> ${I3.free.length}`);
  ok('the whole drag is one undo step', (await J(`${M}.undoDepth()`))[0] === depth0 + 1);
  await wait(900);

  // 4) undo (Ctrl+Z by key position) brings things back one step at a time; redo goes forward
  await ctrlKey('KeyZ');
  ok('Ctrl+Z undoes the drag', same(await isl(), I2));
  await ctrlKey('KeyZ', true);
  ok('Ctrl+Shift+Z redoes it', same(await isl(), I3));
  await ctrlKey('KeyY');
  ok('nothing left to redo: no change', same(await isl(), I3));
  await ctrlKey('KeyZ'); await ctrlKey('KeyZ'); await ctrlKey('KeyZ');
  ok('three undos: the starting island', same(await isl(), I0), JSON.stringify(await J(`${M}.undoDepth()`)));
  await wait(1500); // the cabin and the tree drop back in
  ok('island meshes exactly as at the start (grass too)', same(await digest(), D0));

  // 5) terrain and paint are undoable too
  await tool('raise');
  let T = null;
  for (const [gx, gz] of [[9, 3], [10, 4], [8, 2], [10, 7], [11, 5]]) if (await J(`${M}.terrainAllowed(${gx}, ${gz}, 1)`)) { T = [gx, gz]; break; }
  ok('found a tile to raise', !!T);
  if (T) {
    const lv0 = await J(`${M}.terrainLevel(${T[0]}, ${T[1]})`);
    await click(await at(T[0] - 6 + 0.5, lv0 * 0.48, T[1] - 6 + 0.5));
    await wait(400);
    ok('raised', (await J(`${M}.terrainLevel(${T[0]}, ${T[1]})`)) === lv0 + 1);
    await J(`${M}.undo(-1)`); await wait(600);
    ok('undo lowers it back, island meshes as before', (await J(`${M}.terrainLevel(${T[0]}, ${T[1]})`)) === lv0 && same(await digest(), D0));
    await J(`${M}.undo(1)`); await wait(600);
    ok('redo raises it again', (await J(`${M}.terrainLevel(${T[0]}, ${T[1]})`)) === lv0 + 1);
    await J(`${M}.undo(-1)`); await wait(600);
  }
  await tool('paint_sand');
  const sp = await at(2.6, await ground(2.6, -3.4), -3.4);
  await mouse('mouseMoved', sp[0], sp[1]); await wait(200);
  await mouse('mousePressed', sp[0], sp[1], { button: 'left', buttons: 1, clickCount: 1 });
  for (let k = 1; k <= 5; k++) { await mouse('mouseMoved', sp[0] + k * 8, sp[1], { buttons: 1 }); await wait(100); }
  await mouse('mouseReleased', sp[0] + 40, sp[1], { button: 'left', clickCount: 1 });
  await wait(700);
  const painted = await J(`${M}.terrainPainted()`);
  ok('a paint stroke', painted > 0, painted);
  await J(`${M}.undo(-1)`); await wait(700);
  ok('one undo takes the whole stroke back', (await J(`${M}.terrainPainted()`)) === 0 && same(await isl(), I0) && same(await digest(), D0));

  // 6) a new edit clears the redo list; the autosave follows undo
  await J(`${M}.undo(1)`); await wait(500);
  await J(`${M}.undo(-1)`); await wait(500);
  const rd = await J(`${M}.undoDepth()`);
  await tool('delete');
  const p2 = I0.placed.find((p) => p[0] === 'oak') || I0.placed.find((p) => p[0] === 'pine');
  const ox = p2[1] - 6 + 0.5, oz = p2[2] - 6 + 0.5;
  await click(await at(ox, (await ground(ox, oz)) + 0.6, oz));
  const rd2 = await J(`${M}.undoDepth()`);
  ok('a new edit clears redo', rd[1] > 0 && rd2[1] === 0, `${JSON.stringify(rd)} -> ${JSON.stringify(rd2)}`);
  await J(`${M}.undo(-1)`); await wait(400);
  await J(`${M}.autosaveNow()`);
  const saved = JSON.parse(await J(`${M}.saveRaw()`));
  ok('autosave holds the undone island', same(saved.island, I0));

  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.slice(0, 3).join(' | '));
};
