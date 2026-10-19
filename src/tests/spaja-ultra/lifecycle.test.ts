import assert from 'node:assert/strict';
import { createRuntime, parseSpajaUltra, transpile } from '../../lib/spaja-ultra-core';
import { executeSpajaUltra } from '../../lib/spaja-ultra-core/execute';

let passed = 0;
async function check(name: string, fn: () => unknown | Promise<unknown>) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}

async function main() {
  await check('parser i transpiler podržavaju tri komande', () => {
    const ast = parseSpajaUltra('aktiviraj: jezgro\nizgradi: demo\npokreni: demo');
    assert.deepEqual(ast.map(n => n.name), ['AKTIVIRAJ', 'IZGRADI', 'POKRENI']);
    const js = transpile(ast);
    for (const method of ['aktiviraj', 'izgradi', 'pokreni']) assert.ok(js.includes(`runtime.${method}(`));
  });
  await check('pun tok daje izlaz, artefakt i audit', async () => {
    const runtime = createRuntime();
    const output: string[] = [];
    await executeSpajaUltra('AKTIVIRAJ: jezgro\nIZGRADI: demo\nPOKRENI: demo', runtime, {
      programi: { demo: 'DO: ECHO zdravo\nASSERT: flag == true\nPRIV: user' },
      flag: true, roles: ['user'], onOutput: line => output.push(line),
    });
    assert.deepEqual(output, ['zdravo']);
    const [build] = runtime.getBuilds();
    assert.equal(build.name, 'demo');
    assert.equal(build.commandCount, 3);
    assert.ok(build.javascript.includes('runtime.do'));
    assert.equal(runtime.getAuditLog().filter(r => r.status === 'error').length, 0);
    assert.deepEqual(runtime.getAuditLog().map(r => r.cmd), ['AKTIVIRAJ', 'IZGRADI', 'DO', 'ASSERT', 'PRIV', 'POKRENI']);
  });
  await check('izgradnja i izvršavanje pre aktivacije se odbijaju uz audit', async () => {
    const r = createRuntime();
    await assert.rejects(r.izgradi('demo', { programi: { demo: 'ECHO: x' } }), /AKTIVIRAJ/);
    await assert.rejects(r.pokreni('demo', {}), /AKTIVIRAJ/);
    assert.deepEqual(r.getAuditLog().map(x => x.status), ['error', 'error']);
  });
  await check('nepoznat cilj aktivacije ne aktivira sesiju', async () => {
    const r = createRuntime();
    await assert.rejects(r.aktiviraj('server', {}), /jezgro/);
    await assert.rejects(r.izgradi('demo', {}), /AKTIVIRAJ/);
  });
  await check('aktivacija je idempotentna i stanje pripada instanci', async () => {
    const r = createRuntime();
    await r.aktiviraj('jezgro', {});
    await r.aktiviraj('jezgro', {});
    await r.izgradi('demo', { programi: { demo: 'ECHO: x' } });
    await assert.rejects(createRuntime().pokreni('demo', {}), /AKTIVIRAJ/);
    assert.equal(r.getBuilds().length, 1);
  });
  await check('nepostojeći program i nevalidno ime se odbijaju', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    await assert.rejects(r.izgradi('demo', {}), /programi/);
    await assert.rejects(r.pokreni('demo', {}), /IZGRADI/);
    for (const name of ['', '../x', 'a'.repeat(65)]) await assert.rejects(r.izgradi(name, {}), /ime/);
    await assert.rejects(r.izgradi('toString', { programi: {} }), /programi/);
  });
  await check('prazan, nevalidan i prevelik program ne prave artefakt', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    for (const source of ['', 'INVALID', 'ECHO: ' + 'x'.repeat(16384), 'ECHO: x\n'.repeat(257)]) {
      await assert.rejects(r.izgradi('demo', { programi: { demo: source } }));
    }
    assert.equal(r.getBuilds().length, 0);
  });
  await check('rekurzija i ugnježdene lifecycle komande su blokirane', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    for (const cmd of ['POKRENI', 'IZGRADI', 'AKTIVIRAJ']) {
      await assert.rejects(r.izgradi('demo', { programi: { demo: `${cmd}: demo` } }), /ugnježdene/);
    }
  });
  await check('izgradnja ne izvršava, pokretanje koristi snimljeni izvor', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    const output: string[] = [];
    const ctx = { programi: { demo: 'ECHO: original' }, onOutput: (x: string) => output.push(x) };
    await r.izgradi('demo', ctx); assert.deepEqual(output, []);
    ctx.programi.demo = 'ECHO: changed';
    const builds = r.getBuilds(); builds[0].source = 'ECHO: forged';
    await r.pokreni('demo', ctx); assert.deepEqual(output, ['original']);
  });
  await check('neuspešna ponovna izgradnja čuva prethodni artefakt', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    await r.izgradi('demo', { programi: { demo: 'ECHO: original' } });
    await assert.rejects(r.izgradi('demo', { programi: { demo: 'INVALID' } }));
    assert.equal(r.getBuilds()[0].source, 'ECHO: original');
  });
  await check('izvršavanje prekida na grešci i beleži unutrašnji i spoljašnji neuspeh', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    await r.izgradi('demo', { programi: { demo: 'ASSERT: flag == true\nECHO: zabranjeno' } });
    const output: string[] = [];
    await assert.rejects(r.pokreni('demo', { flag: false, onOutput: x => output.push(x) }), /ASSERT/);
    assert.deepEqual(output, []);
    assert.deepEqual(r.getAuditLog().slice(-2).map(x => [x.cmd, x.status]), [['ASSERT', 'error'], ['POKRENI', 'error']]);
  });
  await check('WAIT budžet se proverava pre izvršavanja', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    for (const source of ['ECHO: x\nWAIT: 3000\nWAIT: 3000', 'WAIT: Infinity', 'WAIT: -1']) {
      await assert.rejects(r.izgradi('demo', { programi: { demo: source } }), /WAIT/);
    }
  });
  await check('najviše 16 artefakata, zamena postojećeg je dozvoljena', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    for (let i = 0; i < 16; i++) await r.izgradi(`p${i}`, { programi: { [`p${i}`]: 'ECHO: x' } });
    await assert.rejects(r.izgradi('extra', { programi: { extra: 'ECHO: x' } }), /16/);
    await r.izgradi('p0', { programi: { p0: 'ECHO: new' } });
    assert.equal(r.getBuilds().length, 16);
  });
  await check('DO ostaje tekstualna operacija bez shell izvršavanja', async () => {
    const r = createRuntime(); const output: string[] = [];
    await executeSpajaUltra('DO: npm run build', r, { onOutput: x => output.push(x) });
    assert.deepEqual(output, ['[DO] npm run build']);
  });
  await check('PRIV odbija nedozvoljenu ulogu unutar programa', async () => {
    const r = createRuntime(); await r.aktiviraj('jezgro', {});
    await r.izgradi('demo', { programi: { demo: 'PRIV: admin\nECHO: forbidden' } });
    await assert.rejects(r.pokreni('demo', { roles: ['user'] }), /Nedozvoljena uloga/);
    assert.deepEqual(r.getAuditLog().slice(-2).map(x => x.status), ['error', 'error']);
  });
  await check('celokupan izvor se proverava pre prve akcije', async () => {
    const r = createRuntime();
    await assert.rejects(executeSpajaUltra('AKTIVIRAJ: jezgro\nNEPOZNATO: x', r, {}), /Nepodržana/);
    assert.equal(r.getAuditLog().length, 0);
    await assert.rejects(r.pokreni('demo', {}), /AKTIVIRAJ/);
  });
  await check('program može da koristi WAIT i ECHO alias', async () => {
    const r = createRuntime({ maxWaitMs: 0 }); await r.aktiviraj('jezgro', {});
    await r.izgradi('čvor', { programi: { čvor: 'WAIT: 1\nECHO: gotovo' } });
    const output: string[] = [];
    await r.pokreni('čvor', { onOutput: x => output.push(x) });
    assert.deepEqual(output, ['gotovo']);
  });
  console.log(`Lifecycle: ${passed}/${passed} prošlo`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
