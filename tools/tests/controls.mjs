// Controls test: middle-drag pan, shift+right pan, zoom toward cursor, WASD, F reset, dblclick in photo mode,
// plus regressions: right-click delete, left-click place, right-drag orbit/tilt.
const near = (a, b, eps) => Math.abs(a - b) <= eps;
export default async ({ wait, evaluate, mouse, wheel, key, log }) => {
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(2500);
  const st = () => evaluate('JSON.stringify(window.__mori.state())').then(JSON.parse);
  const settle = async () => { await wait(2500); return st(); };
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));

  let s0 = await st();
  log('start', JSON.stringify(s0));

  // 1) middle drag: content should follow the cursor -> the ground point under the start pos ends under the end pos
  const g0 = await evaluate('JSON.stringify(window.__mori.hit(500, 320))').then(JSON.parse);
  await mouse('mouseMoved', 500, 320);
  await mouse('mousePressed', 500, 320, { button: 'middle', buttons: 4, clickCount: 1 });
  for (let i = 1; i <= 10; i++) await mouse('mouseMoved', 500 + i * 12, 320 + i * 6, { buttons: 4 });
  await mouse('mouseReleased', 620, 380, { button: 'middle', clickCount: 1 });
  let s1 = await settle();
  const g1 = await evaluate('JSON.stringify(window.__mori.hit(620, 380))').then(JSON.parse);
  ok('middle-drag pans', Math.hypot(s1.pan[0], s1.pan[1]) > 0.5, JSON.stringify(s1.pan));
  ok('dragged ground point follows cursor', g0 && g1 && Math.hypot(g0.wx - g1.wx, g0.wz - g1.wz) < 0.35, `${JSON.stringify(g0)} -> ${JSON.stringify(g1)}`);
  ok('middle-drag does not orbit', near(s1.orbit, s0.orbit, 0.01));

  // 2) F resets
  await key('f'); let s2 = await settle();
  ok('F resets pan', Math.hypot(s2.pan[0], s2.pan[1]) < 0.05, JSON.stringify(s2.pan));

  // 3) zoom toward cursor: ground point under the cursor stays put
  const cx = 700, cy = 250;
  const h0 = await evaluate(`JSON.stringify(window.__mori.hit(${cx}, ${cy}))`).then(JSON.parse);
  for (let i = 0; i < 4; i++) { await wheel(cx, cy, -120); await wait(60); }
  let s3 = await settle();
  const h1 = await evaluate(`JSON.stringify(window.__mori.hit(${cx}, ${cy}))`).then(JSON.parse);
  ok('wheel zooms in', s3.dist < s2.dist - 3, `${s2.dist.toFixed(1)} -> ${s3.dist.toFixed(1)}`);
  ok('point under cursor stays fixed', h0 && h1 && Math.hypot(h0.wx - h1.wx, h0.wz - h1.wz) < 0.3, `${JSON.stringify(h0)} -> ${JSON.stringify(h1)}`);
  await key('f'); await settle();

  // 4) WASD
  await key('d'); await key('d'); let s4 = await settle();
  ok('D pans', Math.hypot(s4.pan[0], s4.pan[1]) > 0.3, JSON.stringify(s4.pan));
  await key('f'); await settle();

  // 5) right drag still orbits + tilts; short right click still deletes
  s0 = await st();
  await mouse('mouseMoved', 300, 300);
  await mouse('mousePressed', 300, 300, { button: 'right', buttons: 2, clickCount: 1 });
  for (let i = 1; i <= 8; i++) await mouse('mouseMoved', 300 + i * 10, 300 + i * 6, { buttons: 2 });
  await mouse('mouseReleased', 380, 348, { button: 'right', clickCount: 1 });
  let s5 = await settle();
  ok('right-drag orbits', !near(s5.orbit, s0.orbit, 0.05), `${s0.orbit.toFixed(2)} -> ${s5.orbit.toFixed(2)}`);
  ok('right-drag tilts (and stays >= 30)', s5.elev > s0.elev + 1 && s5.elev >= 29.9, `${s0.elev.toFixed(1)} -> ${s5.elev.toFixed(1)}`);
  ok('right-drag does not pan', Math.hypot(s5.pan[0], s5.pan[1]) < 0.05);
  await key('f'); await settle();

  // shift + right drag pans
  await mouse('mousePressed', 300, 300, { button: 'right', buttons: 2, clickCount: 1, modifiers: 8 });
  for (let i = 1; i <= 8; i++) await mouse('mouseMoved', 300 + i * 10, 300, { buttons: 2, modifiers: 8 });
  await mouse('mouseReleased', 380, 300, { button: 'right', clickCount: 1, modifiers: 8 });
  let s6 = await settle();
  ok('shift+right-drag pans', Math.hypot(s6.pan[0], s6.pan[1]) > 0.3, JSON.stringify(s6.pan));
  await key('f'); await settle();

  // left click places (pine at an empty spot), right click deletes it
  await key('2');
  const before = (await st()).placed;
  const spot = await evaluate('JSON.stringify(window.__mori.project(-3.5, 0, 3.5))').then(JSON.parse);
  await mouse('mouseMoved', spot[0], spot[1]);
  await mouse('mousePressed', spot[0], spot[1], { button: 'left', buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', spot[0], spot[1], { button: 'left', clickCount: 1 });
  await wait(800);
  const afterPlace = (await st()).placed;
  ok('left click places', afterPlace === before + 1, `${before} -> ${afterPlace}`);
  await mouse('mousePressed', spot[0], spot[1], { button: 'right', buttons: 2, clickCount: 1 });
  await mouse('mouseReleased', spot[0], spot[1], { button: 'right', clickCount: 1 });
  await wait(800);
  const afterDel = (await st()).placed;
  ok('short right click deletes', afterDel === before, `${afterPlace} -> ${afterDel}`);

  // 6) double click: ignored in build mode, zooms in photo mode
  s0 = await st();
  await mouse('mousePressed', 500, 320, { button: 'left', buttons: 1, clickCount: 2 });
  await mouse('mouseReleased', 500, 320, { button: 'left', clickCount: 2 });
  await evaluate("document.querySelector('canvas').dispatchEvent(new MouseEvent('dblclick', {clientX: 500, clientY: 320, bubbles: true}))");
  let s7 = await settle();
  ok('dblclick ignored in build mode', near(s7.targetDist, s0.targetDist, 0.01));
  await evaluate("document.getElementById('btn-photo').click()");
  await wait(300);
  await evaluate("document.querySelector('canvas').dispatchEvent(new MouseEvent('dblclick', {clientX: 600, clientY: 300, bubbles: true}))");
  let s8 = await settle();
  ok('dblclick zooms in photo mode', s8.targetDist < 26, `${s7.targetDist.toFixed(1)} -> ${s8.targetDist.toFixed(1)} photo=${s8.photo}`);
  await evaluate("document.querySelector('canvas').dispatchEvent(new MouseEvent('dblclick', {clientX: 600, clientY: 300, bubbles: true}))");
  let s9 = await settle();
  ok('second dblclick zooms back out', s9.targetDist > 40 && Math.hypot(s9.targetPan[0], s9.targetPan[1]) < 0.01, s9.targetDist.toFixed(1));
};
