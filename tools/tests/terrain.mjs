// Terrain baseline test: samples the terrain functions on a fine grid (height, turf, pond SDF, shore
// checks every 0.02 over the whole island, plus every tile's level / elevation / pond flag) and hashes
// the geometry of every mesh in the scene (island chunks, path, water, sdf foam texture, instances).
// Compares against tools/tests/terrain-baseline.json; BASELINE=1 writes that file instead.
// Meshes that change between two digests in the same run (smoke, dust, petals...) are skipped.
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/terrain.mjs
//        $env:BASELINE='1'; node tools/cdp.mjs "...#debug=1" tools/tests/terrain.mjs; $env:BASELINE=$null
//        (baseline: run twice in a row; delete the file first to start over)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('./terrain-baseline.json', import.meta.url));

export default async ({ wait, evaluate, log }) => {
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(4000);
  const J = async (e) => JSON.parse(await evaluate(`JSON.stringify(${e})`));
  const dump = await J('window.__mori.terrainDump()');
  const d1 = await J('window.__mori.meshDigest()');
  await wait(2500);
  const d2 = await J('window.__mori.meshDigest()');
  const meshes = d1.map((x, i) => (x === d2[i] ? x : null)); // null = animated, not compared

  if (process.env.BASELINE === '1') {
    // run twice: the second run also nulls meshes that differ between page loads (Math.random particles)
    if (existsSync(FILE)) {
      const prev = JSON.parse(readFileSync(FILE, 'utf8'));
      if (prev.meshes.length === meshes.length) meshes.forEach((m, i) => { if (m !== prev.meshes[i]) meshes[i] = null; });
    }
    writeFileSync(FILE, JSON.stringify({ dump, meshes }));
    log(`baseline written: ${meshes.filter(Boolean).length} stable meshes, ${meshes.filter((m) => !m).length} animated`);
    return;
  }
  if (!existsSync(FILE)) { log('FAIL no baseline (run with BASELINE=1 first)'); return; }
  const base = JSON.parse(readFileSync(FILE, 'utf8'));
  const res = (ok, msg) => log((ok ? 'PASS ' : 'FAIL ') + msg);

  for (const k of Object.keys(base.dump.hash)) {
    const same = base.dump.hash[k] === dump.hash[k];
    let maxd = 0;
    base.dump.coarse[k].forEach((v, i) => { maxd = Math.max(maxd, Math.abs(v - dump.coarse[k][i])); });
    res(same, `terrain ${k} identical on 0.02 grid` + (same ? '' : `  (coarse max diff ${maxd})`));
  }
  for (const k of Object.keys(base.dump.tiles)) {
    const bad = base.dump.tiles[k].map((v, i) => (v === dump.tiles[k][i] ? null : i)).filter((v) => v !== null);
    const W = 16;
    res(bad.length === 0, `tiles ${k} identical` + (bad.length ? '  at ' + bad.slice(0, 8).map((i) => `${(i % W) - 2},${Math.floor(i / W) - 2}`).join(' ') : ''));
  }
  res(base.meshes.length === meshes.length, `mesh count ${meshes.length} (baseline ${base.meshes.length})`);
  const diff = [];
  base.meshes.forEach((m, i) => { if (m && meshes[i] && m !== meshes[i]) diff.push(`#${i} ${m} -> ${meshes[i]}`); });
  res(diff.length === 0, `mesh geometry identical (${base.meshes.filter(Boolean).length} stable)` + (diff.length ? '\n  ' + diff.join('\n  ') : ''));
};
