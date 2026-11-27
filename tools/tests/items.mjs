// Items test: every item has a category, every tool places, and the point light budget
// (more than 8 light sources -> exactly 8 pool lights in use, handed to the nearest ones).
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/items.mjs
export default async ({ wait, evaluate, mouse, key, log }) => {
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(2500);
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  const J = (expr) => evaluate(`JSON.stringify(${expr})`).then(JSON.parse);
  const total = async () => { const s = await J('window.__mori.state()'); return s.placed + s.free + (s.snap || 0) + (s.seeds || 0); };

  // 1) categories (the terrain slot holds tools, not items: see terrain-edit.mjs)
  const items = await J('window.__mori.items()');
  const cats = ['build', 'flora', 'paths', 'living', 'nature'];
  const bad = items.filter((d) => !cats.includes(d.category));
  ok('every item has a category', bad.length === 0, bad.map((d) => d.id).join(','));
  ok('names carry no placement notes', !items.some((d) => /\(|자유배치|자동연결/.test(d.name)), items.map((d) => d.name).join(' / '));
  const order = items.map((d) => cats.indexOf(d.category));
  ok('palette is grouped by category', order.every((v, i) => i === 0 || v >= order[i - 1]));
  const btnCats = await J(`[...document.querySelectorAll('#hud-dock .item[data-tool]')].filter(b => b.dataset.tool !== 'delete' && b.dataset.category !== 'terrain').map(b => b.dataset.category)`);
  ok('palette buttons know their category', btnCats.length === items.length && btnCats.every((c) => cats.includes(c)));

  // candidate tiles on the open front lawn (away from the pond and the starter cabin)
  const tiles = [];
  for (let gz = 3; gz < 12; gz++) for (let gx = 3; gx < 12; gx++) {
    const wx = gx - 6 + 0.5, wz = gz - 6 + 0.5;
    if (Math.hypot(wx - 2.3, wz - 2.3) < 3.0) continue;
    tiles.push([wx, wz]);
  }
  let ti = 0;
  const placeSomewhere = async (tool) => {
    await evaluate(`document.querySelector('#hud-dock [data-tool="${tool}"]').click()`);
    await wait(300);
    for (let tries = 0; tries < 14 && ti < tiles.length; tries++) {
      const [wx, wz] = tiles[ti++];
      const [x, y] = await J(`window.__mori.project(${wx}, 0.05, ${wz})`);
      if (x < 20 || y < 70 || x > 980 || y > 540) continue;
      const before = await total();
      await mouse('mouseMoved', x, y); await wait(250);
      await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
      await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
      await wait(700);
      if ((await total()) > before) return true;
    }
    return false;
  };

  // shore props (dock) go at the pond's edge: cursor on points just outside the water line
  const placeShore = async (tool) => {
    await evaluate(`document.querySelector('#hud-dock [data-tool="${tool}"]').click()`);
    await wait(300);
    for (let a = 0; a < 24; a++) {
      const ang = a / 24 * Math.PI * 2;
      let wx = 2.35, wz = 2.35;
      for (let r = 0.5; r < 3.5; r += 0.05) { wx = 2.35 + Math.cos(ang) * r; wz = 2.35 + Math.sin(ang) * r; if (await evaluate(`window.__mori.pond(${wx}, ${wz})`) > 0.05) break; }
      const [x, y] = await J(`window.__mori.project(${wx}, 0.0, ${wz})`);
      if (x < 20 || y < 70 || x > 980 || y > 540) continue;
      const before = await total();
      await mouse('mouseMoved', x, y); await wait(250);
      await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
      await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
      await wait(700);
      if ((await total()) > before) return true;
    }
    return false;
  };

  // 2) every tool places
  for (const d of items) ok(`places ${d.id} (${d.category})`, d.id === 'dock' ? await placeShore(d.id) : await placeSomewhere(d.id));
  // a cherry tree sheds petals once it has landed (extra instances on the petal mesh, no new draw call)
  await wait(2500);
  ok('cherry petals drift down', (await J('window.__mori.petals()')) > 26, String(await J('window.__mori.petals()')));

  // 3) light budget
  let lights = await J('window.__mori.lights()');
  for (let k = 0; k < 12 && lights.sources < 10; k++) { await placeSomewhere('lantern'); lights = await J('window.__mori.lights()'); }
  ok('more than 8 light sources placed', lights.sources > 8, JSON.stringify(lights));
  await wait(1500);
  lights = await J('window.__mori.lights()');
  ok('exactly 8 pool lights in use', lights.active === 8, JSON.stringify(lights));
  const litBefore = lights.lit;
  // middle-drag the view toward each side until a different set of sources is nearest
  let changed = false;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    await key('f'); await wait(1500);
    await mouse('mouseMoved', 500, 320);
    await mouse('mousePressed', 500, 320, { button: 'middle', buttons: 4, clickCount: 1 });
    for (let i = 1; i <= 10; i++) await mouse('mouseMoved', 500 + dx * i * 30, 320 + dy * i * 22, { buttons: 4 });
    await mouse('mouseReleased', 500 + dx * 300, 320 + dy * 220, { button: 'middle', clickCount: 1 });
    await wait(3000);
    lights = await J('window.__mori.lights()');
    if (lights.active !== 8) break;
    if (lights.lit !== litBefore) { changed = true; break; }
  }
  ok('still 8 after panning', lights.active === 8, JSON.stringify({ sources: lights.sources, active: lights.active }));
  ok('a different set of sources is lit after panning', changed, `${litBefore}  ->  ${lights.lit}`);
};
