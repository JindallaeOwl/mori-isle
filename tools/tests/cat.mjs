// Headphone cat (동물): places in the animal slot, one instanced mesh (+ notes while up), bobs to the
// beat and sends up notes, looks at a pointer near it (up and down too) and back, the ginger yawns, takes a coat from its
// spot, headphone music wakes up when zoomed in, the eraser takes it away, no console errors.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/cat.mjs
export default async ({ wait, evaluate, mouse, wheel, send, log }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; for (const k of ['error', 'warn']) { const o = console[k].bind(console); console[k] = (...a) => { window.__errs.push(k + ': ' + a.map(String).join(' ').slice(0, 400)); o(...a); }; } window.addEventListener('error', (e) => window.__errs.push('onerror: ' + e.message));` });
  await evaluate('location.reload()');
  await wait(1500);
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(2000);
  const J = (e) => evaluate(`JSON.stringify(${e})`).then(JSON.parse);
  let fails = 0;
  const ok = (name, cond, extra = '') => { if (!cond) fails++; log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`); };
  const cats = () => J('__mori.cats()');
  const list = async () => JSON.parse(await evaluate('__mori.islandList()')).free.filter((o) => o[0] === 'cat');
  const click = async (x, y) => {
    await mouse('mouseMoved', x, y); await wait(200);
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 }); await wait(400);
  };

  const def = (await J('__mori.items()')).find((d) => d.id === 'cat');
  ok('cat is a free prop in the animal slot', def && def.category === 'animal' && def.freePlace, JSON.stringify(def));
  ok('seven category slots', (await J(`document.querySelectorAll('.cat').length`)) === 7);

  const before = (await J('__mori.renderables()')).length;
  await evaluate(`document.querySelector('#hud-dock [data-tool="cat"]').click()`); await wait(300);
  for (const [wx, wz] of [[3.5, -2.5], [-3.5, 3.5], [1.5, -3.5], [4.5, -4.5]]) {
    const n = (await list()).length;
    await click(...await J(`__mori.project(${wx}, 0, ${wz})`));
    if ((await list()).length > n) break;
  }
  await evaluate(`document.querySelector('#hud-dock [data-tool="cat"]').click()`); await wait(200); // empty hand
  const placed = await list();
  ok('click places a cat', placed.length === 1, JSON.stringify(placed));
  const [, cx, cz] = placed[0];
  const geo = await J(`(() => { const m = __mori.renderables().find(r => r.count && r.tris > 300 && r.tris < 4000 && r.cast); return m; })()`);
  log('  info: cat mesh ' + JSON.stringify(geo));

  // listening: bob to the beat, notes rise (the click left the pointer right beside it: take it away)
  await evaluate('__mori.catPointer(null)');
  await wait(3500);
  const a = await cats(); await wait(700); const b = await cats();
  ok('cat mesh shows one instance', a.n === 1, JSON.stringify(a));
  ok('head pose changes with the beat', a.looks.slice(0, 3).some((v, i) => Math.abs(v - b.looks[i]) > 1e-3), JSON.stringify([a.looks, b.looks]));
  ok('nod stays a small dip (pitch 0.03..0.2), tilt within 0.25', b.looks[1] >= 0.02 && b.looks[1] <= 0.21 && Math.abs(b.looks[2]) <= 0.25, JSON.stringify(b.looks));
  ok('notes rise from a listening cat', a.notes + b.notes > 0 && (a.noteMesh > 0 || b.noteMesh > 0), `${a.notes} ${b.notes}`);
  const after = (await J('__mori.renderables()')).length;
  log(`  info: renderables ${before} -> ${after} (cat + notes, shadow pass not counted)`);

  // a pointer near the cat: the head turns toward it, notes stop; away: back to bobbing
  const [px, py] = await J(`__mori.project(${cx + 0.6}, __mori.ground(${cx + 0.6}, ${cz}) + 0.1, ${cz})`);
  await evaluate(`__mori.catPointer(${px}, ${py})`);
  await wait(2500);
  const c = await cats();
  const lx = 0.6 * Math.cos(placed[0][3] * Math.PI / 2);
  ok('head turns toward a pointer beside it', Math.sign(c.looks[0]) === Math.sign(lx) && Math.abs(c.looks[0]) > 0.2, `yaw ${c.looks[0].toFixed(2)}`);
  // above the head on screen: looks up; below: looks down
  const [hx, hy] = await J(`__mori.project(${cx}, __mori.ground(${cx}, ${cz}) + 0.11, ${cz})`);
  await evaluate(`__mori.catPointer(${hx}, ${hy - 35})`); await wait(2500);
  const up = await cats();
  await evaluate(`__mori.catPointer(${hx}, ${hy + 35})`); await wait(2500);
  const down = await cats();
  ok('looks up at a pointer above its head', up.looks[1] < -0.15, String(up.looks[1]));
  ok('looks down at a pointer below it', down.looks[1] > up.looks[1] + 0.3, `${down.looks[1]} vs ${up.looks[1]}`);
  ok('no more than CAT_UP (0.7) up', up.looks[1] >= -0.71, String(up.looks[1]));
  await evaluate('__mori.catPointer(null)');
  await wait(2500);
  const d = await cats();
  ok('back to bobbing when the pointer leaves', Math.abs(d.looks[0]) < 0.2 && d.looks[3] === 0, JSON.stringify(d.looks));

  // coat from the spot (three photo faces)
  const coats = await J(`__mori.variantsOf('cat')`);
  ok('coat index 0..2', coats.length === 1 && coats[0] >= 0 && coats[0] <= 2 && Number.isInteger(coats[0]), JSON.stringify(coats));

  // the ginger yawns: put down cats until one is ginger, then start a yawn
  await evaluate(`document.querySelector('#hud-dock [data-tool="cat"]').click()`); await wait(300);
  for (const [wx, wz] of [[-3.5, 3.5], [1.5, -3.5], [4.5, -4.5], [-1.5, 4.5], [4.5, -1.5], [2.5, 3.5]]) {
    if ((await J(`__mori.variantsOf('cat')`)).includes(1)) break;
    await click(...await J(`__mori.project(${wx}, 0, ${wz})`));
  }
  await evaluate(`document.querySelector('#hud-dock [data-tool="cat"]').click()`); await wait(200);
  await evaluate('__mori.catPointer(null)');
  const gi = (await J(`__mori.variantsOf('cat')`)).indexOf(1);
  if (gi < 0) log('  info: no ginger cat came up, yawn not checked');
  else {
    await wait(1500);
    await evaluate('__mori.catYawn()');
    let yawn = 0, back = 0;
    for (let i = 0; i < 30; i++) { const y = await cats(); if (y.looks[gi * 4 + 3] === 2) { yawn = 1; back = Math.min(back, y.looks[gi * 4 + 1]); } await wait(100); }
    ok('the ginger yawns (yawning face, head back)', yawn === 1 && back < -0.1, `face ${yawn} pitch ${back}`);
    for (let i = 0; i < 40; i++) { if ((await cats()).looks[gi * 4 + 3] < 1.5) break; await wait(150); }
    ok('the yawn ends', (await cats()).looks[gi * 4 + 3] < 1.5);
  }
  // keep only the first cat for the rest
  for (const o of (await list()).slice(1)) {
    await evaluate(`document.querySelector('#hud-dock [data-tool="delete"]').click()`); await wait(200);
    await click(...await J(`__mori.project(${o[1]}, __mori.ground(${o[1]}, ${o[2]}) + 0.08, ${o[2]})`));
    await evaluate(`document.querySelector('#hud-dock [data-tool="delete"]').click()`); await wait(200);
  }

  // headphone music: silent far out, plays when zoomed in near the cat
  const [sx, sy] = await J(`__mori.project(${cx}, 0, ${cz})`);
  for (let i = 0; i < 14; i++) { await wheel(sx, sy, -120); await wait(80); }
  await wait(2500);
  const m = await cats();
  const st = await J('__mori.state()');
  ok('headphone music heard when zoomed in close', m.level > 0.2, `level ${m.level.toFixed(2)} dist ${st.dist.toFixed(1)}`);
  ok('music steps are being scheduled', m.scheduled !== null && m.beat !== null, JSON.stringify([m.scheduled, m.beat]));
  ok('bouncy song by day', m.bpm === 112, String(m.bpm));

  // perches: put a cat on a stump (the pointer on the stump top), it sits up there; save keeps it; erase the
  // stump and the cat comes down to the ground
  {
    await evaluate(`document.querySelector('#hud-dock [data-tool="stump"]').click()`); await wait(300);
    const spots = []; for (let x = -4.25; x <= 4.3; x += 1.5) for (let z = -4.25; z <= 4.3; z += 1.5) spots.push([x, z]);
    log('  info: tool ' + (await J('__mori.state()')).tool);
    for (const [wx, wz] of spots) {
      if ((await J('__mori.snaps()')).some((o) => o.id === 'stump')) break;
      await click(...await J(`__mori.project(${wx}, 0, ${wz})`));
    }
    await evaluate(`document.querySelector('#hud-dock [data-tool="stump"]').click()`); await wait(200);
    const st = (await J('__mori.snaps()')).find((o) => o.id === 'stump');
    ok('a stump to sit on', !!st);
    if (st) {
      const sx = (st.rect.x0 + st.rect.x1) / 2, sz = (st.rect.z0 + st.rect.z1) / 2, g = await J(`__mori.ground(${sx}, ${sz})`);
      const top = await J(`__mori.catPerchY(${sx}, ${sz})`);
      ok('stump top found from above', top !== null && top > g + 0.12 && top < g + 0.25, `${top} ground ${g}`);
      const n0 = (await list()).length;
      await evaluate(`document.querySelector('#hud-dock [data-tool="cat"]').click()`); await wait(300);
      await click(...await J(`__mori.project(${sx}, ${g + 0.172}, ${sz})`));
      await evaluate(`document.querySelector('#hud-dock [data-tool="cat"]').click()`); await wait(200);
      await evaluate('__mori.catPointer(null)');
      const cl = await list(), up = cl.find((o) => Math.hypot(o[1] - sx, o[2] - sz) < 0.14);
      ok('the cat goes on the stump, marked up', cl.length === n0 + 1 && up && up[5] && up[5].up === 1, JSON.stringify(cl));
      const ci = cl.indexOf(up), ys = await J('__mori.catY()'), here = up ? await J(`__mori.catPerchY(${up[1]}, ${up[2]})`) : null;
      ok('it sits on the stump top where it stands', up && here !== null && Math.abs(ys[ci] - here) < 0.01 && here > g + 0.12, `${ys[ci]} vs ${here}`);
      // the stump goes: the cat comes down (pick a screen point where the eraser takes the stump, not the cat)
      await evaluate(`document.querySelector('#hud-dock [data-tool="delete"]').click()`); await wait(300);
      let at = null;
      for (const [dx, dy, dz] of [[0.2, 0.05, 0], [-0.2, 0.05, 0], [0, 0.05, 0.2], [0, 0.05, -0.2], [0.15, 0.02, 0.15]]) {
        const pt = await J(`__mori.project(${sx + dx}, ${g + dy}, ${sz + dz})`);
        const t = await J(`__mori.erasePick(${pt[0]}, ${pt[1]})`);
        if (t && t.id === 'stump') { at = pt; break; }
      }
      ok('a point that picks the stump', !!at);
      if (at) {
        const i2 = (await list()).findIndex((o) => Math.hypot(o[1] - sx, o[2] - sz) < 0.14);
        await mouse('mouseMoved', ...at); await wait(200);
        await mouse('mousePressed', ...at, { button: 'left', buttons: 1, clickCount: 1 });
        await mouse('mouseReleased', ...at, { button: 'left', clickCount: 1 }); // sample the fall at once
        const yOf = async () => (await J('__mori.catY()'))[i2];
        const watch = async (want, ms) => { const seen = []; for (let k = 0; k < ms / 150; k++) { const v = await yOf(); seen.push(+v.toFixed(3)); if (Math.abs(v - want) < 0.01) break; await wait(150); } return seen; };
        const fall = await watch(g, 12000);
        await evaluate(`document.querySelector('#hud-dock [data-tool="delete"]').click()`); await wait(200);
        ok('stump erased: the cat falls through the air to the ground', i2 >= 0 && Math.abs(fall[fall.length - 1] - g) < 0.01 && fall.some((v) => v > g + 0.01 && v < here - 0.01), JSON.stringify(fall));
        await evaluate('__mori.undo(-1)'); // the stump comes back: the cat hops up onto it again
        const hop = await watch(here, 15000);
        ok('undo brings the stump back and the cat hops up onto it', Math.abs(hop[hop.length - 1] - here) < 0.01, JSON.stringify(hop));
        await evaluate('__mori.undo(-1)'); await wait(600); // take back the cat
        await evaluate('__mori.undo(-1)'); await wait(600); // and the stump
      }
      ok('back to one cat', (await list()).length === n0, JSON.stringify(await list()));
    }
  }

  // eraser takes it away
  await evaluate(`document.querySelector('#btn-eraser, #hud-dock [data-tool="delete"]').click()`); await wait(300);
  const [ex, ey] = await J(`__mori.project(${cx}, __mori.ground(${cx}, ${cz}) + 0.08, ${cz})`);
  await click(ex, ey);
  await wait(1500);
  ok('eraser removes the cat', (await list()).length === 0 && (await cats()).n === 0, JSON.stringify(await cats()));

  const errs = await J('window.__errs');
  ok('no console errors or warnings', errs.length === 0, errs.join(' | '));
  log(fails ? `FAIL ${fails}` : 'ALL PASS');
};
