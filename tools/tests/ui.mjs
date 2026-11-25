// UI test: hovering a category raises its tray, clicking an item selects it, number keys pick a
// category and step through it, X = eraser, H = help, no leftover text banners.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/ui.mjs
export default async ({ wait, evaluate, mouse, key, log }) => {
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(2500);
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  const J = (expr) => evaluate(`JSON.stringify(${expr})`).then(JSON.parse);
  const sel = () => J(`document.querySelector('#hud-dock .item.active, #btn-eraser.active')?.dataset.tool || null`);
  const openCat = () => J(`[...document.querySelectorAll('.cat-wrap')].findIndex(w => w.classList.contains('open'))`);

  ok('five category slots', (await J(`document.querySelectorAll('.cat').length`)) === 5);
  ok('no instruction banner or counter', !(await J(`!!document.querySelector('.hints-pill, #item-counter, #active-item-label')`)));

  // hover category 4 -> tray opens; move up onto an item and click it
  const r = await J(`document.querySelectorAll('.cat')[3].getBoundingClientRect()`);
  await mouse('mouseMoved', r.x + r.width / 2, r.y + 20); await wait(500);
  ok('hover opens the tray', (await openCat()) === 3);
  const it = await J(`document.querySelectorAll('.cat-wrap')[3].querySelectorAll('.item')[2].getBoundingClientRect()`);
  await mouse('mouseMoved', r.x + r.width / 2, r.y - 4); await wait(120); // through the gap
  await mouse('mouseMoved', it.x + it.width / 2, it.y + it.height / 2); await wait(400);
  ok('tray stays open while moving up into it', (await openCat()) === 3);
  const want = await J(`document.querySelectorAll('.cat-wrap')[3].querySelectorAll('.item')[2].dataset.tool`);
  await mouse('mousePressed', it.x + it.width / 2, it.y + it.height / 2, { button: 'left', buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', it.x + it.width / 2, it.y + it.height / 2, { button: 'left', clickCount: 1 });
  await wait(500);
  ok('clicking an item selects it', (await sel()) === want, want);
  ok('category slot now shows that item as active', await J(`document.querySelectorAll('.cat')[3].classList.contains('active')`));
  await mouse('mouseMoved', 500, 250); await wait(700);
  ok('leaving closes the tray', (await openCat()) === -1);

  // keys
  await key('2'); await wait(200);
  const a = await sel();
  await key('2'); await wait(200);
  const b = await sel();
  ok('number key picks the category', a === 'pine', a);
  ok('same key again steps to the next item', b === 'oak', b);
  await key('x'); await wait(200);
  ok('X selects the eraser', (await sel()) === 'delete');
  await key('h'); await wait(300);
  ok('H opens help', await J(`document.getElementById('help-panel').classList.contains('open')`));
  await key('Escape'); await wait(300);
  ok('Esc closes help', !(await J(`document.getElementById('help-panel').classList.contains('open')`)));
};
