// Saves a screenshot after the scene settles: tools/shots/<SHOT or "shot">.png
// usage: SHOT=night node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&time=night" tools/tests/screenshot.mjs
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default async ({ wait, evaluate, shot, log }) => {
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(Number(process.env.WAIT || 4000));
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, (process.env.SHOT || 'shot') + '.png');
  await shot(file);
  log('saved', file);
};
