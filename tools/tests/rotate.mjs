// Rotation test: the empty hand (start, Esc, clicking the held card or the eraser again), 15° steps
// with R / Shift+R / the rotate token / Shift+wheel, placing at an in-between heading, turning a
// placed object with the empty hand (picked by hover or by a click, warm highlight, undo as one
// step), a cabin turning past headings that would hit a prop, paths keeping quarter turns, the
// heading surviving a reload, and the console.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/rotate.mjs
export default async ({ wait, evaluate, mouse, wheel, key, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== '' ? '  ' + extra : ''));
  const M = 'window.__mori';
  const st = () => J(`${M}.state()`);
  const list = async () => JSON.parse(await J(`${M}.islandList()`));
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const keyShift = async (k) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, modifiers: 8 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, modifiers: 8 });
  };
  const at = async (wx, wz) => J(`${M}.project(${wx}, ${await J(`${M}.ground(${wx}, ${wz})`)}, ${wz})`);
  const clickAt = async (x, y) => {
    await mouse('mouseMoved', x, y); await wait(300);
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
    await wait(900);
  };

  // 1) the empty hand
  ok('starts with an empty hand', (await st()).tool === null, JSON.stringify(await st()));
  await key('2'); await wait(200);
  ok('number key picks up a tool', (await st()).tool === 'pine');
  await key('Escape'); await wait(200);
  ok('Esc puts it down', (await st()).tool === null);
  await evaluate(`document.querySelector('#hud-dock [data-tool="oak"]').click()`); await wait(200);
  ok('clicking a card holds it', (await st()).tool === 'oak');
  await evaluate(`document.querySelector('#hud-dock [data-tool="oak"]').click()`); await wait(200);
  ok('clicking the held card again puts it down', (await st()).tool === null);
  await evaluate(`document.getElementById('btn-eraser').click()`); await wait(200);
  await evaluate(`document.getElementById('btn-eraser').click()`); await wait(200);
  ok('eraser token toggles back to the empty hand', (await st()).tool === null);
  await key('h'); await wait(300);
  await key('2'); await wait(200);
  await key('Escape'); await wait(300);
  ok('Esc closes help first and keeps the tool', (await st()).tool !== null && !(await J(`document.getElementById('help-panel').classList.contains('open')`)), JSON.stringify((await st()).tool));
  await evaluate(`document.querySelector('#hud-dock [data-tool="pine"]').click()`); await wait(200);

  // 2) 15° steps
  const r0 = (await st()).rotation;
  await key('r'); await wait(150);
  ok('R turns 15°', near((await st()).rotation, r0 + 1 / 6), String((await st()).rotation));
  await keyShift('R'); await wait(150);
  ok('Shift+R turns back', near((await st()).rotation, r0));
  await evaluate(`document.getElementById('btn-rotate').click()`); await wait(150);
  ok('rotate token turns 15°', near((await st()).rotation, r0 + 1 / 6));
  for (let k = 0; k < 24; k++) await key('r');
  await wait(200);
  ok('24 steps make a full turn', near((await st()).rotation, r0 + 1 / 6), String((await st()).rotation));
  const d0 = (await st()).targetDist;
  await wheel(500, 300, 0, 100, 8); await wait(250); // Windows sends a shifted wheel as deltaX
  ok('Shift+wheel notch turns 15°', near((await st()).rotation, r0 + 2 / 6), String((await st()).rotation));
  ok('Shift+wheel does not zoom', Math.abs((await st()).targetDist - d0) < 1e-6, `${d0} -> ${(await st()).targetDist}`);

  // 3) place a pine at 30° and a cabin at 30° on open ground
  const free = async (gx0, gz0) => {
    const isl = await list();
    for (let gz = gz0; gz < 11; gz++) for (let gx = gx0; gx < 11; gx++) {
      if (isl.placed.some((p) => Math.abs(p[1] - gx) <= 1 && Math.abs(p[2] - gz) <= 1)) continue;
      if (isl.snap.concat(isl.free).some((o) => Math.hypot(o[1] - (gx - 5.5), o[2] - (gz - 5.5)) < 1.6)) continue;
      if ((await J(`${M}.pond(${gx - 5.5}, ${gz - 5.5})`)) < 1.5) continue;
      const lv = await J(`${M}.terrainLevel(${gx}, ${gz})`);
      let flat = true;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((await J(`${M}.terrainLevel(${gx + dx}, ${gz + dz})`)) !== lv) flat = false;
      if (flat) return [gx, gz];
    }
    return null;
  };
  const pineTile = await free(1, 6);
  ok('found open ground for a pine', !!pineTile, JSON.stringify(pineTile));
  if (pineTile) {
    const [x, y] = await at(pineTile[0] - 5.5, pineTile[1] - 5.5);
    await clickAt(x, y);
    const p = (await list()).placed.find((q) => q[1] === pineTile[0] && q[2] === pineTile[1]);
    ok('pine placed at the held heading (30°)', p && p[0] === 'pine' && near(p[3], 2 / 6), JSON.stringify(p));
  }

  // 4) paths keep quarter turns
  await evaluate(`document.querySelector('#hud-dock [data-tool="path"]').click()`); await wait(200);
  const pathTile = await free(1, 1);
  if (pathTile) {
    const [x, y] = await at(pathTile[0] - 5.5, pathTile[1] - 5.5);
    await clickAt(x, y);
    const p = (await list()).placed.find((q) => q[1] === pathTile[0] && q[2] === pathTile[1]);
    ok('a path stays on a quarter turn', p && p[0] === 'path' && Number.isInteger(p[3]), JSON.stringify(p));
  }

  // 5) empty hand turns a placed object: hover = warm highlight, R turns it, one undo step
  await key('Escape'); await wait(200);
  if (pineTile) {
    const wx = pineTile[0] - 5.5, wz = pineTile[1] - 5.5;
    const [x, y] = await J(`${M}.project(${wx}, ${(await J(`${M}.ground(${wx}, ${wz})`)) + 0.5}, ${wz})`);
    await mouse('mouseMoved', x, y); await wait(500);
    const tg = await J(`${M}.eraseTarget()`);
    ok('empty hand picks the pine under the pointer', tg && tg.id === 'pine', JSON.stringify(tg));
    ok('picked with the warm highlight (not the eraser red)', (await J(`${M}.hotValues()`)).every((v) => v === 2) && (await J(`${M}.hotValues()`)).length === 1, JSON.stringify(await J(`${M}.hotValues()`)));
    const u0 = await J(`${M}.undoDepth()`);
    await key('r'); await wait(150); await key('r'); await wait(150); await key('r'); await wait(400);
    let p = (await list()).placed.find((q) => q[1] === pineTile[0] && q[2] === pineTile[1]);
    ok('three R presses turn the placed pine 45°', p && near(p[3], 5 / 6), JSON.stringify(p));
    ok('the held heading did not change', near((await st()).rotation, r0 + 2 / 6));
    await wait(900);
    ok('a run of turns is one undo step', (await J(`${M}.undoDepth()`))[0] === u0[0] + 1, JSON.stringify([u0, await J(`${M}.undoDepth()`)]));
    await J(`${M}.undo(-1)`); await wait(1500);
    p = (await list()).placed.find((q) => q[1] === pineTile[0] && q[2] === pineTile[1]);
    ok('undo turns it back', p && near(p[3], 2 / 6), JSON.stringify(p));
    // a click picks it and keeps it picked when the pointer leaves; the rotate token turns it
    await clickAt(x, y);
    await mouse('mouseMoved', 30, 300); await wait(400);
    ok('a click keeps the pine picked after the pointer leaves', (await st()).handPick && (await J(`${M}.eraseTarget()`))?.id === 'pine');
    await evaluate(`document.getElementById('btn-rotate').click()`); await wait(400);
    p = (await list()).placed.find((q) => q[1] === pineTile[0] && q[2] === pineTile[1]);
    ok('the rotate token turns the picked pine', p && near(p[3], 3 / 6), JSON.stringify(p));
    await key('Escape'); await wait(300);
    ok('Esc lets go of it', !(await st()).handPick);
  }

  // 6) a cabin skips headings where it would hit a snap prop
  const cabTile = await free(1, 1);
  ok('found open flat ground for a cabin', !!cabTile, JSON.stringify(cabTile));
  if (cabTile) {
    await evaluate(`document.querySelector('#hud-dock [data-tool="cabin"]').click()`); await wait(200);
    while (!near((await st()).rotation, 0)) { await key('r'); await wait(60); }
    const cx = cabTile[0] - 5.5, cz = cabTile[1] - 5.5;
    let [x, y] = await at(cx, cz);
    await clickAt(x, y);
    ok('cabin placed', (await list()).placed.some((q) => q[0] === 'cabin' && q[1] === cabTile[0] && q[2] === cabTile[1]));
    // a woodpile right against its +x wall: a turned cabin's box would reach into it
    await evaluate(`document.querySelector('#hud-dock [data-tool="woodpile"]').click()`); await wait(200);
    [x, y] = await at(cx + 0.82, cz);
    await clickAt(x, y);
    const wp = (await list()).snap.find((o) => o[0] === 'woodpile' && Math.abs(o[1] - cx) < 1.2 && Math.abs(o[2] - cz) < 1.2);
    ok('woodpile placed against the cabin', !!wp, JSON.stringify(wp));
    await key('Escape'); await wait(200);
    const [hx, hy] = await J(`${M}.project(${cx}, ${(await J(`${M}.ground(${cx}, ${cz})`)) + 0.9}, ${cz})`);
    await clickAt(hx, hy);
    ok('empty hand picks the cabin', (await J(`${M}.eraseTarget()`))?.id === 'cabin', JSON.stringify(await J(`${M}.eraseTarget()`)));
    await key('r'); await wait(600);
    // 15°..75° would push the cabin's box into the woodpile on its +x wall: the first heading that fits is 90°
    const c = (await list()).placed.find((q) => q[0] === 'cabin' && q[1] === cabTile[0] && q[2] === cabTile[1]);
    ok('cabin skips the headings that hit the woodpile (lands on 90°)', c && (wp && wp[1] > cx ? near(c[3], 1) : !near(c[3], 0)), JSON.stringify({ c, wp }));
    await key('Escape'); await wait(200);
  }

  // 7) headings survive a reload (autosave)
  const before = await list();
  await J(`${M}.autosaveNow()`); await wait(300);
  await evaluate('location.reload()'); await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(3000);
  const after = await list();
  ok('turned objects keep their heading after a reload', JSON.stringify(after.placed) === JSON.stringify(before.placed) && JSON.stringify(after.snap) === JSON.stringify(before.snap), JSON.stringify({ b: before.placed.length, a: after.placed.length }));

  await wait(1000);
  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.slice(0, 3).join(' | '));
};
