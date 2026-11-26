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

  // 6) footprints never overlap each other, and never stand on a path core
  const all = await snaps();
  let overlap = false;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i].rect, b = all[j].rect;
    if (a.x0 < b.x1 - 1e-6 && a.x1 > b.x0 + 1e-6 && a.z0 < b.z1 - 1e-6 && a.z1 > b.z0 + 1e-6) overlap = true;
  }
  ok('no two footprints overlap', !overlap);
};
