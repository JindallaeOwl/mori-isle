// Headphone cat (동물): places in the animal slot, one instanced mesh (+ notes while up), bobs to the
// beat and sends up notes, turns its head to a pointer near it and back, blinks, takes a coat from its
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
  const [px, py] = await J(`__mori.project(${cx + 0.6}, __mori.ground(${cx + 0.6}, ${cz}), ${cz})`);
  await evaluate(`__mori.catPointer(${px}, ${py})`);
  await wait(2500);
  const c = await cats();
  const rot = placed[0][3] * Math.PI / 2, lx = 0.6 * Math.cos(rot), lz = 0.6 * Math.sin(rot);
  const want = Math.max(-1.15, Math.min(1.15, Math.atan2(lx, lz)));
  ok('head turns to a pointer near it', Math.abs(c.looks[0] - want) < 0.25, `yaw ${c.looks[0].toFixed(2)} want ${want.toFixed(2)}`);
  ok('looks down at the ground spot', c.looks[1] > 0.05, String(c.looks[1]));
  await evaluate('__mori.catPointer(null)');
  await wait(2500);
  const d = await cats();
  ok('back to bobbing when the pointer leaves', Math.abs(d.looks[0]) < 0.2, String(d.looks[0]));

  // blinks: eyes shut for a moment now and then
  let blink = 0;
  for (let i = 0; i < 30 && !blink; i++) { const e = await cats(); blink = Math.max(blink, e.looks[3]); await wait(150); }
  ok('blinks', blink > 0.05, String(blink));

  // coat from the spot
  const coats = await J(`__mori.variantsOf('cat')`);
  ok('coat index 0..4', coats.length === 1 && coats[0] >= 0 && coats[0] <= 4 && Number.isInteger(coats[0]), JSON.stringify(coats));

  // headphone music: silent far out, plays when zoomed in near the cat
  const [sx, sy] = await J(`__mori.project(${cx}, 0, ${cz})`);
  for (let i = 0; i < 14; i++) { await wheel(sx, sy, -120); await wait(80); }
  await wait(2500);
  const m = await cats();
  const st = await J('__mori.state()');
  ok('headphone music heard when zoomed in close', m.level > 0.2, `level ${m.level.toFixed(2)} dist ${st.dist.toFixed(1)}`);
  ok('music steps are being scheduled', m.scheduled !== null && m.beat !== null, JSON.stringify([m.scheduled, m.beat]));
  ok('bouncy song by day', m.bpm === 112, String(m.bpm));

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
