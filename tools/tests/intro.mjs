// Startup assembly: loader token -> press -> island assembles -> HUD; skip with a key; reset crumbles
// and assembles again. Saves step shots to tools/shots/intro-*.png.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&intro=1" tools/tests/intro.mjs
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default async ({ wait, evaluate, mouse, key, shot, log }) => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots');
  mkdirSync(dir, { recursive: true });
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  const J = (expr) => evaluate(`JSON.stringify(${expr})`).then(JSON.parse);
  const st = () => J('window.__mori.state()');

  ok('no old line icons in the HTML', (await J(`[...document.querySelectorAll('#sys svg, #hud-dock svg, .panel svg, #photo-exit-btn svg')].filter(s => !s.classList.contains('token')).length`)) === 0);
  ok('HUD hidden while booting', await J(`document.body.classList.contains('booting')`));
  ok('loader token is up', await J(`!!document.querySelector('#loader .token')`));

  for (let i = 0; i < 80; i++) { if (await evaluate('!!window.__mori && window.__mori.state().loaderReady')) break; await wait(500); }
  const s0 = await st();
  ok('loader becomes ready', s0.loaderReady && s0.intro === 'boot', JSON.stringify(s0));
  await shot(join(dir, 'intro-0-ready.png'));

  // a key during boot must not reach the game (E would open the exploded view)
  await key('e'); await wait(300);
  const s1 = await st();
  ok('press starts the assembly', s1.intro === 'assemble', s1.intro);
  ok('the start key did not toggle the exploded view', !s1.exploded);
  ok('sound is on after the start press', await J(`window.__mori.audio.enabled && document.getElementById('btn-audio').classList.contains('on')`));

  // headless frames take seconds, so hold the clock at each moment and wait for two fresh frames
  const t0 = Date.now();
  const frames = async (n) => { const f0 = await evaluate('window.__mori.frame()'); for (let i = 0; i < 60; i++) { if ((await evaluate('window.__mori.frame()')) >= f0 + n) return; await wait(150); } };
  for (const [sec, name] of [[0.3, '1-bedrock'], [0.62, '2-subsoil'], [1.15, '3-water'], [1.75, '4-trees'], [2.45, '5-props'], [3.2, '6-lit']]) {
    await evaluate(`window.__mori.introClock(${sec})`);
    await frames(2);
    await shot(join(dir, `intro-${name}.png`));
  }
  await evaluate('window.__mori.introClock(null)');
  for (let i = 0; i < 60; i++) { if ((await st()).intro === 'done') break; await wait(250); }
  await wait(1500);
  await shot(join(dir, 'intro-7-done.png'));
  const s2 = await st();
  ok('assembly finishes', s2.intro === 'done', `${((Date.now() - t0) / 1000).toFixed(1)} s wall (headless)`);
  // (the slow headless run may already have dimmed the HUD to its 4 s idle level, 0.32)
  ok('HUD is shown', !(await J(`document.body.classList.contains('booting')`)) && (await J(`+getComputedStyle(document.getElementById('hud-dock')).opacity`)) > 0.3);
  ok('loader removed', !(await J(`!!document.getElementById('loader')`)));
  const placed = s2.placed, free = s2.free;

  // reset: crumble -> assemble; a key skips straight to the finished island
  await evaluate('window.__mori.resetIsland()');
  ok('reset starts the crumble', (await st()).intro === 'crumble');
  await evaluate('window.__mori.introClock(0.45)');
  await frames(2);
  await shot(join(dir, 'intro-8-crumble.png'));
  await evaluate('window.__mori.introClock(null)');
  for (let i = 0; i < 20; i++) { if ((await st()).intro === 'assemble') break; await wait(150); }
  ok('then assembles again', (await st()).intro === 'assemble');
  await key('x'); await wait(300);
  const s3 = await st();
  ok('a key skips to the end', s3.intro === 'done', s3.intro);
  ok('the skip key did not pick the eraser', !(await J(`document.getElementById('btn-eraser').classList.contains('active')`)));
  ok('same island after the reset', s3.placed === placed && s3.free === free, `${s3.placed}/${s3.free}`);
  await wait(1500);
  await shot(join(dir, 'intro-9-skipped.png'));

  // a click mid-crumble also skips, and the island is rebuilt even though it had fallen away
  await evaluate('window.__mori.resetIsland()');
  await wait(200);
  await mouse('mousePressed', 500, 320, { button: 'left', buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', 500, 320, { button: 'left', clickCount: 1 });
  await wait(300);
  const s4 = await st();
  ok('a click mid-crumble skips', s4.intro === 'done' && s4.placed === placed, `${s4.intro} ${s4.placed}`);
  ok('the skip click placed nothing', s4.placed === placed && s4.free === free);
};
