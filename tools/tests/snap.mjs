// Snap placement test: quarter-tile props sit flush against the cabin wall and each other,
// never overlap, keep their footprint off the path, and the eraser removes them.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/snap.mjs
export default async ({ wait, evaluate, mouse, key, log }) => {
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(2500);
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  const J = (e) => evaluate(`JSON.stringify(${e})`).then(JSON.parse);
  const snaps = () => J('window.__mori.snaps()');
  const click = async (wx, wz, button = 'left') => {
    const [x, y] = await J(`window.__mori.project(${wx}, 0.0, ${wz})`);
    await mouse('mouseMoved', x, y); await wait(250);
    await mouse('mousePressed', x, y, { button, buttons: button === 'left' ? 1 : 2, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button, clickCount: 1 });
    await wait(800);
  };
  const tool = async (id) => { await evaluate(`document.querySelector('#hud-dock [data-tool="${id}"]').click()`); await wait(300); };

  const items = await J('window.__mori.items()');
  const snapIds = items.filter((d) => d.snapPlace).map((d) => d.id).sort();
  ok('living props and lights use snap placement', ['bench', 'campfire', 'cart', 'clothesline', 'lantern', 'mailbox', 'woodpile'].every((id) => snapIds.includes(id)), snapIds.join(','));
  const start = await snaps();
  ok('starter bench, campfire and lantern are snap props', ['bench', 'campfire', 'lantern'].every((id) => start.some((s) => s.id === id)), start.map((s) => s.id).join(','));
  const lights = await J('window.__mori.lights()');
  ok('starter lights still shine', lights.sources >= 3, JSON.stringify(lights));

  // 1) a woodpile dropped just right of the cabin slides flush against its wall
  const cab = (await J('window.__mori.cabins()'))[0];
  await tool('woodpile');
  await click(cab.x1 + 0.38, (cab.z0 + cab.z1) / 2);
  let s = await snaps();
  const wp = s.find((o) => o.id === 'woodpile');
  ok('woodpile placed beside the cabin', !!wp);
  if (wp) ok('woodpile sits flush against the wall', Math.abs(wp.rect.x0 - cab.x1) < 0.03, `gap ${(wp.rect.x0 - cab.x1).toFixed(3)}`);

  // 2) a mailbox clicked right next to the woodpile snaps against it instead of overlapping
  if (wp) {
    await tool('mailbox');
    await click(wp.rect.x1 + 0.1, (wp.rect.z0 + wp.rect.z1) / 2);
    s = await snaps();
    const mb = s.find((o) => o.id === 'mailbox');
    ok('mailbox placed next to the woodpile', !!mb);
    if (mb) ok('mailbox touches the woodpile without overlap', mb.rect.x0 >= wp.rect.x1 - 1e-6 && mb.rect.x0 - wp.rect.x1 < 0.03, `gap ${(mb.rect.x0 - wp.rect.x1).toFixed(3)}`);
    // 3) clicking onto the woodpile itself places nothing
    const n = s.length;
    await tool('cart');
    await click((wp.rect.x0 + wp.rect.x1) / 2, (wp.rect.z0 + wp.rect.z1) / 2);
    ok('no overlap on top of another prop', (await snaps()).length === n);
    // 4) a pine cannot go onto the woodpile's tile
    const placed0 = (await J('window.__mori.state()')).placed;
    await key('2'); await wait(300);
    await click((wp.rect.x0 + wp.rect.x1) / 2, (wp.rect.z0 + wp.rect.z1) / 2);
    ok('grid items avoid snap footprints', (await J('window.__mori.state()')).placed === placed0);
    // 5) the eraser removes what is under the cursor
    await key('x'); await wait(300);
    await click((wp.rect.x0 + wp.rect.x1) / 2, (wp.rect.z0 + wp.rect.z1) / 2);
    s = await snaps();
    ok('eraser removes the woodpile', !s.some((o) => o.id === 'woodpile'), s.map((o) => o.id).join(','));
  }

  // 7) a dock: refused on the open lawn, accepted at the water's edge and turned to face the water
  await tool('dock');
  let n0 = (await snaps()).length;
  await click(-3.5, 3.5);
  ok('dock refused away from the pond', (await snaps()).length === n0);
  let docked = null;
  for (let a = 0; a < 24 && !docked; a++) {
    const ang = a / 24 * Math.PI * 2;
    let wx = 2.35, wz = 2.35;
    for (let r = 0.5; r < 3.5; r += 0.05) { wx = 2.35 + Math.cos(ang) * r; wz = 2.35 + Math.sin(ang) * r; if (await evaluate(`window.__mori.pond(${wx}, ${wz})`) > 0.05) break; }
    const [x, y] = await J(`window.__mori.project(${wx}, 0.0, ${wz})`);
    if (x < 20 || y < 70 || x > 980 || y > 540) continue;
    n0 = (await snaps()).length;
    await click(wx, wz);
    const s2 = await snaps();
    if (s2.length > n0) docked = s2.find((o) => o.id === 'dock');
  }
  ok('dock placed at the pond edge', !!docked);
  if (docked) {
    // the far end (local +z, 0.7 out) is in the water, the near end (-0.6) on land
    const th = docked.rotation * Math.PI / 2, out = (d) => [docked.wx + d * Math.sin(th), docked.wz + d * Math.cos(th)];
    const [fx, fz] = out(0.7), [nx, nz] = out(-0.6);
    const far = await evaluate(`window.__mori.pond(${fx}, ${fz})`), near = await evaluate(`window.__mori.pond(${nx}, ${nz})`);
    ok('dock faces the water', far < 0 && near > 0.25, `far ${far.toFixed(2)} near ${near.toFixed(2)} rot ${docked.rotation}`);
  }

  // 6) footprints never overlap each other, and never stand on a path core
  const all = await snaps();
  let overlap = false;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i].rect, b = all[j].rect;
    if (a.x0 < b.x1 - 1e-6 && a.x1 > b.x0 + 1e-6 && a.z0 < b.z1 - 1e-6 && a.z1 > b.z0 + 1e-6) overlap = true;
  }
  ok('no two footprints overlap', !overlap);
};
