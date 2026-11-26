// Startup assembly: black -> fade in while the island assembles -> HUD; input is held back until it
// is done; reset crumbles and assembles again. Saves step shots to tools/shots/intro-*.png.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&intro=1" tools/tests/intro.mjs
// (add &time=night to see the lamps catch; SHOTS=night- prefixes the file names)
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default async ({ wait, evaluate, mouse, key, shot, log }) => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots');
  mkdirSync(dir, { recursive: true });
  const pre = 'intro-' + (process.env.SHOTS || '');
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  const J = (expr) => evaluate(`JSON.stringify(${expr})`).then(JSON.parse);
  const st = () => J('window.__mori.state()');
  const frames = async (n) => { const f0 = await evaluate('window.__mori.frame()'); for (let i = 0; i < 60; i++) { if ((await evaluate('window.__mori.frame()')) >= f0 + n) return; await wait(150); } };
  const click = async (x, y) => {
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button: 'left', clickCount: 1 });
  };

  ok('no old line icons in the HTML', (await J(`[...document.querySelectorAll('#sys svg, #hud-dock svg, .panel svg, #photo-exit-btn svg')].filter(s => !s.classList.contains('token')).length`)) === 0);
  ok('HUD hidden while booting', await J(`document.body.classList.contains('booting')`));
  ok('black cover, no loader token', await J(`!!document.getElementById('loader') && !document.querySelector('#loader .token')`));

  // starts by itself once the finished island has been drawn behind the black
  for (let i = 0; i < 80; i++) { if (await evaluate("!!window.__mori && window.__mori.state().intro === 'assemble'")) break; await wait(500); }
  ok('assembly starts by itself', (await st()).intro === 'assemble');

  // headless frames take seconds, so hold the clock at each moment and wait for two fresh frames
  const t0 = Date.now();
  const moments = [[0.5, '1-bedrock-ring'], [0.98, '2-top-ring'], [1.2, '3-water'], [1.75, '4-trees'], [2.45, '5-props'], [2.75, '6-sparkles'], [3.25, '7-hud']];
  for (const [sec, name] of moments) {
    await evaluate(`window.__mori.introClock(${sec})`);
    await frames(2);
    await shot(join(dir, `${pre}${name}.png`));
    if (sec === 0.5) ok('impact ring shows when a layer lands', (await J('window.__mori.introFx()')).rings > 0);
    if (sec === 2.75) ok('sparkles show when lamps catch', (await J('window.__mori.introFx()')).sparks);
  }

  // input is held back mid-assembly: no shortcut, no placing
  const before = await st();
  await key('x'); await key('e');
  await click(500, 330);
  await wait(300);
  const held = await st();
  ok('keys do nothing mid-assembly', !held.exploded && !(await J(`document.getElementById('btn-eraser').classList.contains('active')`)));
  ok('a click places nothing mid-assembly', held.placed === before.placed && held.free === before.free && held.snap === before.snap);
  ok('no skipping', held.intro === 'assemble', held.intro);

  await evaluate('window.__mori.introClock(null)');
  for (let i = 0; i < 80; i++) { if ((await st()).intro === 'done') break; await wait(250); }
  await wait(1500);
  await shot(join(dir, `${pre}8-done.png`));
  const s2 = await st();
  ok('assembly finishes', s2.intro === 'done', `${((Date.now() - t0) / 1000).toFixed(1)} s wall (headless)`);
  // (the slow headless run may already have dimmed the HUD to its 4 s idle level, 0.32)
  ok('HUD is shown', !(await J(`document.body.classList.contains('booting')`)) && (await J(`+getComputedStyle(document.getElementById('hud-dock')).opacity`)) > 0.3);
  ok('black cover removed', !(await J(`!!document.getElementById('loader')`)));
  ok('sound on (this headless browser allows audio without a click)', await J(`window.__mori.audio.enabled && document.getElementById('btn-audio').classList.contains('on')`));
  ok('idle frame: rings and sparkles cost no draw call', (await J('window.__mori.introFx()')).rings === 0 && !(await J('window.__mori.introFx()')).sparks);

  // reset: crumble -> assemble -> done, same island; input held the whole time
  await evaluate('window.__mori.resetIsland()');
  ok('reset starts the crumble', (await st()).intro === 'crumble');
  await evaluate('window.__mori.introClock(0.45)');
  await frames(2);
  await shot(join(dir, `${pre}9-crumble.png`));
  await click(500, 330);
  await evaluate('window.__mori.introClock(null)');
  for (let i = 0; i < 40; i++) { if ((await st()).intro === 'assemble') break; await wait(150); }
  ok('then assembles again', (await st()).intro === 'assemble');
  for (let i = 0; i < 80; i++) { if ((await st()).intro === 'done') break; await wait(250); }
  const s3 = await st();
  ok('reset finishes with the same island', s3.intro === 'done' && s3.placed === s2.placed && s3.free === s2.free && s3.snap === s2.snap, `${s3.intro} ${s3.placed}/${s3.free}`);
};
