// Placement click loudness + stereo: compare a left and a right placement, ambience muted via setFire/wind off.
export default async ({ wait, evaluate, mouse, key, log }) => {
  for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__mori')) break; await wait(500); }
  await wait(2000);
  const ok = (name, cond, extra = '') => log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  await evaluate("document.getElementById('btn-audio').click()");
  await wait(600);
  await evaluate(`(() => {
    const a = window.__mori.audio, ctx = a.ctx;
    const split = ctx.createChannelSplitter(2);
    const L = ctx.createAnalyser(), R = ctx.createAnalyser(); L.fftSize = R.fftSize = 256;
    // meter the SFX bus only (before it mixes with wind/fire), so clicks can be measured on their own
    a.sfxBus.connect(split); split.connect(L, 0); split.connect(R, 1);
    const m = window.__meter = { L, R, buf: new Float32Array(256), pL: 0, pR: 0 };
    m.timer = setInterval(() => {
      for (const [an, k] of [[L, 'pL'], [R, 'pR']]) { an.getFloatTimeDomainData(m.buf); let p = 0; for (const v of m.buf) p = Math.max(p, Math.abs(v)); m[k] = Math.max(m[k], p); }
    }, 5);
  })()`);
  await key('2');
  const place = async (wx, wz, label) => {
    const before = JSON.parse(await evaluate('JSON.stringify(window.__mori.state())')).placed;
    const sp = JSON.parse(await evaluate(`JSON.stringify(window.__mori.project(${wx}, 0, ${wz}))`));
    await evaluate('Object.assign(window.__meter, {pL:0,pR:0}), 0');
    await mouse('mouseMoved', sp[0], sp[1]);
    await mouse('mousePressed', sp[0], sp[1], { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', sp[0], sp[1], { button: 'left', clickCount: 1 });
    await wait(900);
    const after = JSON.parse(await evaluate('JSON.stringify(window.__mori.state())')).placed;
    const m = JSON.parse(await evaluate('JSON.stringify({pL: window.__meter.pL, pR: window.__meter.pR})'));
    log(label, `screenX ${sp[0].toFixed(0)} placed ${before}->${after} peakL ${m.pL.toFixed(4)} peakR ${m.pR.toFixed(4)}`);
    return { placed: after > before, ...m };
  };
  const left = await place(-3.5, 3.5, 'left ');
  const right = await place(3.5, -3.5, 'right');
  ok('left placement happened', left.placed);
  ok('right placement happened', right.placed);
  ok('clicks reach the sfx bus', left.pL > 0.01 && right.pR > 0.01);
  ok('left placement leans left', left.pL > left.pR * 1.15, `${left.pL.toFixed(3)} / ${left.pR.toFixed(3)}`);
  ok('right placement leans right', right.pR > right.pL * 1.15, `${right.pL.toFixed(3)} / ${right.pR.toFixed(3)}`);
};
