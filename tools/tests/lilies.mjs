// Editable water props, including the transition from saves with scenery-only lilies.
export default async ({ wait, evaluate, mouse, key, log }) => {
  const ready = async () => {
    for (let i = 0; i < 90; i++) {
      if (await evaluate('!!window.__mori')) return;
      await wait(300);
    }
    throw Error('Island did not load');
  };
  const check = (cond, msg) => { if (!cond) throw Error(msg); log('PASS ' + msg); };
  const list = async () => JSON.parse(await evaluate('__mori.islandList()')).free.filter(o => o[0] === 'lilypad');
  const reload = async () => { await evaluate('location.reload()'); await wait(900); await ready(); };
  const select = id => evaluate(`document.querySelector('#hud-dock [data-tool="${id}"]').click()`);
  const point = (x, z) => evaluate(`__mori.project(${x},__mori.waterY(${x},${z}) + .02,${z})`);
  const click = async (x,z) => {
    const p = await point(x,z);
    await mouse('mouseMoved', ...p); await wait(180);
    await mouse('mousePressed', ...p, {button:'left',buttons:1,clickCount:1});
    await mouse('mouseReleased', ...p, {button:'left',clickCount:1}); await wait(250);
  };
  await ready();
  const starter = await list();
  check(starter.length === 3, 'three starter pads are ordinary props');
  const [, x, z, angle] = starter[0];
  await mouse('mouseMoved', ...await point(x,z)); await wait(350);
  await key('r'); await wait(450);
  check((await list())[0][3] !== angle, 'empty hand can turn a starter pad');
  await select('delete'); await click(x,z);
  check((await list()).length === 2, 'erase a starter pad');
  await evaluate('__mori.undo(-1)'); await wait(500);
  check((await list()).length === 3, 'undo brings the pad back');
  await evaluate('__mori.undo(1)'); await wait(600);
  await evaluate('__mori.autosaveNow()'); await reload();
  check((await list()).length === 2, 'deleted starter pad stays deleted after reload');

  await select('lilypad'); await key('r'); await key('r');
  const heading = await evaluate('__mori.state().rotation');
  await click(x,z);
  const placed = (await list()).find(o => Math.hypot(o[1]-x,o[2]-z) < .12);
  check(placed && placed[3] === heading, 'click places a new pad at the chosen heading');
  await click(x,z); await click(-3.5,3.5);
  check((await list()).length === 3, 'overlap and dry ground are refused');
  await evaluate('__mori.autosaveNow()');
  const legacy = JSON.parse(await evaluate('__mori.saveRaw()'));
  delete legacy.island.editableLilies;
  legacy.island.free = legacy.island.free.filter(o => o[0] !== 'lilypad');
  legacy.island.free.push(['steppingstone', x, z, 0, 1]);
  await evaluate(`localStorage.setItem('mori-isle.v1.auto', ${JSON.stringify(JSON.stringify(legacy))})`);
  await reload();
  check((await list()).length === 2 && !(await list()).some(o => o[1] === x && o[2] === z),
    'old pond gains editable lilies only in its unoccupied spots');
  // Move the pond away from the starter sites in this old save.
  const mat = Buffer.alloc(Buffer.from(legacy.island.mat,'base64').length);
  const width = Math.sqrt(mat.length);
  for (let z = 35; z <= 40; z++) for (let x = 8; x <= 13; x++) mat[z * width + x] = 4;
  legacy.island.mat = mat.toString('base64');
  await evaluate('__mori.autosaveNow()'); // flush this page before substituting the migration fixture
  await evaluate(`localStorage.setItem('mori-isle.v1.auto', ${JSON.stringify(JSON.stringify(legacy))})`);
  await reload();
  check((await list()).length === 0, 'old drained pond stays empty');
  await select('lilypad'); await click(-3.25,3.5);
  check((await list()).length === 1, 'a custom pond accepts a lily');
  await evaluate('__mori.autosaveNow()'); await reload();
  check((await list()).length === 1 && (await list())[0][1] < 0, 'custom pond lily survives migration and reload');
};
