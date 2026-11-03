// Tests de plan.mjs (reglas y transiciones del plan) y features.mjs (la CLI del supervisor y el conversor).
// node --test .claude/skills/orquesta/scripts/features.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { cubre } from './puerta.mjs';
import { ErrorPlan, entradaDe, listos, transicion, validarPlan } from './plan.mjs';
import { convertir, featureDeSpec, main } from './features.mjs';

const feat = (id, name, extra = {}) => ({
  id, name, title: `Feature ${name}`, depends_on: [], files: [`src/${name}/`],
  acceptance: [{ criterio: 'algo comprobable', verify: 'node -e 0' }], status: 'pending', intentos: 0, sha: null, ...extra,
});
const plan = (features, proyecto = 'demo') => ({ proyecto, features });
const SHA = 'abcdef1';
const errores = (p) => validarPlan(p, { cubre }).errores;

test('un plan bien formado valida', () => {
  const p = plan([feat(1, 'base', { status: 'done', sha: SHA }), feat(2, 'alta', { depends_on: [1] })]);
  assert.deepEqual(errores(p), []);
});

test('validarPlan: forma, ids, names y campos', () => {
  assert.match(errores(null)[0], /no es un objeto/);
  assert.match(errores(plan([]))[0], /al menos una feature/);
  assert.match(errores(plan([feat(1, 'a'), feat(1, 'b')])).join('\n'), /el id 1 está repetido/);
  assert.match(errores(plan([feat(1, 'a'), feat(2, 'a')])).join('\n'), /el name «a» está repetido/);
  assert.match(errores(plan([feat(1, 'demo')])).join('\n'), /no puede llamarse como el proyecto/);
  assert.match(errores(plan([feat(1, 'Mala')])).join('\n'), /«name» tiene que ser un slug/);
  assert.match(errores(plan([feat(1, 'a', { files: ['/etc/x'] })])).join('\n'), /rutas relativas/);
  assert.match(errores(plan([feat(1, 'a', { files: ['../x'] })])).join('\n'), /rutas relativas/);
  assert.match(errores(plan([feat(1, 'a', { acceptance: [] })])).join('\n'), /al menos un criterio/);
  assert.match(errores(plan([feat(1, 'a', { acceptance: [{ criterio: 'comprobable', verify: '' }] })])).join('\n'), /verify/);
  assert.deepEqual(errores(plan([feat(1, 'a', { acceptance: [{ criterio: 'a ojo, es manual', verify: null }] })])), [], 'verify null vale: criterio manual');
  assert.match(errores(plan([feat(1, 'a', { notas: 'x'.repeat(501) })])).join('\n'), /demasiado grande/);
});

test('validarPlan: estado, sha, vueltas y bloqueo', () => {
  assert.match(errores(plan([feat(1, 'a', { status: 'in_qa' })])).join('\n'), /hace falta un sha/);
  assert.match(errores(plan([feat(1, 'a', { status: 'en_revision' })])).join('\n'), /«status»/);
  assert.match(errores(plan([feat(1, 'a', { sha: SHA })])).join('\n'), /pending tiene intentos 0 y sha null/);
  assert.match(errores(plan([feat(1, 'a', { status: 'blocked', intentos: 3, sha: SHA })])).join('\n'), /motivo_bloqueo/);
  assert.deepEqual(errores(plan([feat(1, 'a', { status: 'blocked', intentos: 3, sha: SHA, motivo_bloqueo: 'tres vueltas de qa' })])), []);
  assert.match(errores(plan([feat(1, 'a', { status: 'changes_requested', intentos: 3, sha: SHA })])).join('\n'), /a la tercera decide la persona/);
  assert.match(errores(plan([feat(1, 'a', { motivo_bloqueo: 'no toca' })])).join('\n'), /solo vale en una feature blocked/);
});

test('validarPlan: dependencias, ciclos y arrancar sin lo que lee', () => {
  assert.match(errores(plan([feat(1, 'a', { depends_on: [9] })])).join('\n'), /depende de #9, que no existe/);
  assert.match(errores(plan([feat(1, 'a', { depends_on: [1] })])).join('\n'), /depende de sí misma/);
  assert.match(errores(plan([feat(1, 'a', { depends_on: [2] }), feat(2, 'b', { depends_on: [1] })])).join('\n'), /ciclo en depends_on/);
  assert.match(errores(plan([feat(1, 'a'), feat(2, 'b', { depends_on: [1], status: 'in_progress' })])).join('\n'), /#2 está in_progress pero su dependencia #1 está pending/);
});

test('validarPlan: rutas reservadas y features a la vez que se pisan son errores, no avisos', () => {
  assert.match(errores(plan([feat(1, 'a', { files: ['**'] })])).join('\n'), /alcanza feature_list.json/);
  assert.match(errores(plan([feat(1, 'a', { files: ['progress/'] })])).join('\n'), /alcanza progress\/history.md/);
  const a = feat(1, 'a', { status: 'in_progress', files: ['src/api/**'] });
  const b = feat(2, 'b', { status: 'in_progress', files: ['src/api/users.ts'] });
  assert.match(errores(plan([a, b])).join('\n'), /#1 y #2 van a la vez y se pisan en: src\/api\/\*\*/, 'un glob y un fichero dentro de él');
  const pendiente = feat(2, 'b', { files: ['src/api/users.ts'] });
  assert.deepEqual(errores(plan([a, pendiente])), [], 'una pendiente que aún no va no se pisa con nadie');
});

test('validarPlan: avisa de los topes de constructores y qa', () => {
  const muchos = [1, 2, 3, 4].map((i) => feat(i, `f${i}`, { status: 'in_progress' }));
  assert.match(validarPlan(plan(muchos), { cubre }).avisos.join('\n'), /4 features con constructor activo \(tope 3\)/);
  const qa = [1, 2, 3].map((i) => feat(i, `q${i}`, { status: 'in_qa', sha: SHA }));
  assert.match(validarPlan(plan(qa), { cubre }).avisos.join('\n'), /3 features en qa \(tope 2\)/);
});

test('transicion: el camino feliz de una feature, sin tocar el plan de entrada', () => {
  const p0 = plan([feat(1, 'base', { status: 'done', sha: SHA }), feat(2, 'alta', { depends_on: [1] })]);
  const copia = JSON.stringify(p0);
  let { plan: p, evento } = transicion(p0, 2, 'in_progress');
  assert.equal(JSON.stringify(p0), copia, 'no muta el plan que recibe');
  assert.equal(evento.a, 'in_progress');
  ({ plan: p, evento } = transicion(p, 'alta', 'in_qa', { sha: 'FEDCBA9' }));
  assert.equal(p.features[1].sha, 'fedcba9');
  assert.match(evento.detalle, /ronda 1/);
  ({ plan: p } = transicion(p, 2, 'approved'));
  ({ plan: p, evento } = transicion(p, 2, 'done'));
  assert.equal(p.features[1].status, 'done');
  assert.deepEqual(errores(p), []);
});

test('transicion: cada vuelta al constructor cuenta, y a la tercera se bloquea', () => {
  let p = plan([feat(1, 'a', { status: 'in_qa', sha: SHA })]);
  let r = transicion(p, 1, 'changes_requested', { motivo: 'falta el test' });
  assert.equal(r.plan.features[0].intentos, 1);
  assert.match(r.evento.detalle, /falta el test · vuelta 1 de 3/);
  r = transicion(transicion(r.plan, 1, 'in_qa', { sha: '1234567' }).plan, 1, 'changes_requested');
  assert.equal(r.plan.features[0].intentos, 2);
  r = transicion(transicion(r.plan, 1, 'in_qa', { sha: '7654321' }).plan, 1, 'changes_requested', { motivo: 'sigue sin cubrir C2' });
  assert.equal(r.plan.features[0].status, 'blocked', 'la tercera vuelta bloquea');
  assert.match(r.plan.features[0].motivo_bloqueo, /3 vueltas de cambios pedidos: sigue sin cubrir C2/);
  assert.equal(r.evento.a, 'blocked');
  assert.deepEqual(errores(r.plan), []);
  // Un rechazo de la puerta (approved → changes_requested) también cuenta.
  const ap = transicion(plan([feat(1, 'a', { status: 'approved', sha: SHA })]), 1, 'changes_requested', { motivo: 'la puerta: fuera de files' });
  assert.equal(ap.plan.features[0].intentos, 1);
  // La persona desbloquea y la feature vuelve a empezar de cero.
  const des = transicion(r.plan, 1, 'in_progress');
  assert.equal(des.plan.features[0].intentos, 0);
  assert.equal(des.plan.features[0].motivo_bloqueo, undefined);
});

test('transicion: lo que no se puede, no se puede', () => {
  const p = plan([feat(1, 'base'), feat(2, 'alta', { depends_on: [1] })]);
  assert.throws(() => transicion(p, 2, 'in_progress'), /falta lo que lee \(#1\)/);
  assert.throws(() => transicion(p, 1, 'done'), /de pending no se puede pasar a done/);
  assert.throws(() => transicion(p, 1, 'in_progress').plan && transicion(transicion(p, 1, 'in_progress').plan, 1, 'in_qa'), /necesita --sha/);
  assert.throws(() => transicion(p, 1, 'blocked'), /necesita --motivo/);
  assert.throws(() => transicion(p, 9, 'in_progress'), /no hay ninguna feature «9»/);
  assert.throws(() => transicion(p, 1, 'rara'), /estado desconocido/);
  assert.throws(() => transicion(plan([feat(1, 'a', { status: 'done', sha: SHA })]), 1, 'in_qa', { sha: SHA }), ErrorPlan);
  const tres = plan([1, 2, 3, 4].map((i) => feat(i, `f${i}`, { status: i < 4 ? 'in_progress' : 'pending' })));
  assert.throws(() => transicion(tres, 4, 'in_progress'), /ya hay 3 constructores activos/);
  const dosQa = plan([1, 2, 3].map((i) => feat(i, `f${i}`, { status: i < 3 ? 'in_qa' : 'in_progress', sha: i < 3 ? SHA : null })));
  assert.throws(() => transicion(dosQa, 3, 'in_qa', { sha: '1234567' }), /ya hay 2 features en qa/);
});

test('listos y entradaDe: lo que puede arrancar y lo que recibe cada agente', () => {
  const p = plan([
    feat(1, 'base', { status: 'done', sha: SHA }),
    feat(2, 'a', { depends_on: [1], files: ['src/a/'] }),
    feat(3, 'b', { depends_on: [1], files: ['src/a/x.ts'] }), // se pisa con la 2
    feat(4, 'c', { depends_on: [2], files: ['src/c/'] }), // espera a la 2
    feat(5, 'd', { depends_on: [1], files: ['src/d/'], notas: 'cuidado con X' }),
  ]);
  assert.deepEqual(listos(p, { cubre }).map((f) => f.id), [2, 5], 'la 3 se pisa con la 2 y la 4 espera');
  const e = entradaDe(p, 5);
  assert.equal(e.notas, 'cuidado con X');
  const q = entradaDe(p, 'd', { paraQa: true });
  assert.deepEqual([q.notas, q.status, q.intentos], [undefined, undefined, undefined], 'qa no recibe notas, estado ni vueltas');
  assert.deepEqual(q.acceptance, p.features[4].acceptance);
});

// ---------------------------------------------------------------- la CLI

function carpeta(t) {
  const d = mkdtempSync(join(tmpdir(), 'features-'));
  t.after(() => rmSync(d, { recursive: true, force: true }));
  return d;
}
const escribir = (d, rel, txt) => { mkdirSync(dirname(join(d, rel)), { recursive: true }); writeFileSync(join(d, rel), txt); };
function cli(d, ...args) {
  const out = [];
  const code = main(args, { cwd: d, salida: (x) => out.push(x), error: (x) => out.push(x) });
  return { code, out: out.join('\n') };
}

test('CLI: marcar valida la transición y el plan entero, escribe de golpe y apunta la historia', (t) => {
  const d = carpeta(t);
  escribir(d, 'feature_list.json', JSON.stringify(plan([feat(1, 'alta')]), null, 2));
  let r = cli(d, 'marcar', 'alta', 'in_progress');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /#1 alta · arranca/);
  assert.equal(JSON.parse(readFileSync(join(d, 'feature_list.json'), 'utf8')).features[0].status, 'in_progress');
  assert.equal(existsSync(join(d, 'feature_list.json.tmp')), false, 'sin fichero temporal');
  r = cli(d, 'marcar', '1', 'in_qa', '--sha', SHA);
  assert.equal(r.code, 0, r.out);
  assert.match(readFileSync(join(d, 'progress', 'history.md'), 'utf8'), /#1 alta · entrega · abcdef1 · qa empieza la ronda 1/);
  // Una transición imposible no escribe nada.
  const antes = readFileSync(join(d, 'feature_list.json'), 'utf8');
  r = cli(d, 'marcar', '1', 'done');
  assert.equal(r.code, 1);
  assert.match(r.out, /de in_qa no se puede pasar a done/);
  assert.equal(readFileSync(join(d, 'feature_list.json'), 'utf8'), antes);
});

test('CLI: validar, listos y entrada; y los errores de uso salen con 2', (t) => {
  const d = carpeta(t);
  escribir(d, 'feature_list.json', JSON.stringify(plan([feat(1, 'base', { status: 'done', sha: SHA }), feat(2, 'alta', { depends_on: [1] })])));
  assert.match(cli(d, 'validar').out, /válido \(2 features\)/);
  assert.match(cli(d, 'listos').out, /#2 alta/);
  assert.equal(JSON.parse(cli(d, 'entrada', '2', '--qa').out).name, 'alta');
  escribir(d, 'roto.json', '{ "proyecto": "x" }');
  assert.equal(cli(d, 'validar', '--plan', 'roto.json').code, 1);
  assert.equal(cli(d, 'validar', '--plan', 'no-existe.json').code, 2);
  assert.equal(cli(d).code, 2);
  assert.equal(cli(d, 'inventa').code, 2);
  assert.equal(cli(d, 'marcar', '1').code, 2);
  assert.equal(cli(d, 'validar', '--rara').code, 2);
  escribir(d, 'malo.json', '{ no es json');
  assert.equal(cli(d, 'validar', '--plan', 'malo.json').code, 2);
});

// ---------------------------------------------------------------- el conversor

const SPEC = (n, nombre, estado, veredicto, rutas = '`src/x/`', extra = '') => [
  `# F-${n} · ${nombre}`, '', `Estado: \`${estado}\``, `Veredicto QA: ${veredicto}`, 'Oleada: 1', 'Objetivo: O-02', '',
  '## Criterio de aceptación', '', '- [ ] C1 · El alta guarda la reserva', '- [x] C2 · Sin token devuelve 401', '',
  '## Agentes', '', '| Agente | Qué hace | Escribe en (exclusivo) |', '|---|---|---|', `| backend-node | algo | ${rutas} |`, '', extra,
].join('\n');

test('featureDeSpec: una SPEC.md pasa a una feature, y lo que no se puede sacar sale como aviso', () => {
  const rondas = ['## Revisión QA', '', '### Ronda 1 · commit abcdef1 · 2026-10-20', '', '**Veredicto:** CAMBIOS PEDIDOS', '',
    '### Ronda 2 · commit 1234567 · 2026-10-21', '', '**Veredicto:** APROBADA', ''].join('\n');
  const { feature: f, avisos } = featureDeSpec(SPEC('03', 'Alta de reserva', 'aprobada', 'APROBADA · commit 1234567 · 2026-10-21', '`src/alta/`, `tests/alta.test.js`', rondas), 'F-03-alta-de-reserva', 3);
  assert.deepEqual(avisos, []);
  assert.deepEqual({ id: f.id, name: f.name, title: f.title, status: f.status, intentos: f.intentos, sha: f.sha, agente: f.agente, oleada: f.oleada, objetivo: f.objetivo, files: f.files },
    { id: 3, name: 'alta-de-reserva', title: 'Alta de reserva', status: 'approved', intentos: 1, sha: '1234567', agente: 'backend-node', oleada: 1, objetivo: 'O-02', files: ['src/alta/', 'tests/alta.test.js'] });
  assert.deepEqual(f.acceptance.map((a) => a.criterio), ['C1 · El alta guarda la reserva', 'C2 · Sin token devuelve 401']);
  const sinSha = featureDeSpec(SPEC('04', 'x', 'en revisión', '—'), 'F-04-x', 4);
  assert.equal(sinSha.feature.status, 'in_progress');
  assert.match(sinSha.avisos.join('\n'), /no trae el sha/);
  const pend = featureDeSpec(SPEC('05', 'y', 'pendiente', '—', '[rutas]'), 'F-05-y', 5);
  assert.equal(pend.feature.sha, null);
  assert.match(pend.avisos.join('\n'), /no trae rutas/);
});

test('convertir: un proyecto con SPEC.md pasa a feature_list.json, no pisa uno existente y avisa de las dependencias', (t) => {
  const d = carpeta(t);
  escribir(d, 'features/REGISTRO.md', '# Registro de features — Tienda online\n');
  escribir(d, 'features/F-01-base/SPEC.md', SPEC('01', 'Base', 'hecha', 'APROBADA · commit abcdef1 · 2026-10-20'));
  escribir(d, 'features/F-02-carrito/SPEC.md', SPEC('02', 'Carrito', 'pendiente', '—', '`src/carrito/`'));
  const { plan: p, avisos } = convertir({ raiz: d });
  assert.equal(p.proyecto, 'tienda-online');
  assert.deepEqual(p.features.map((f) => `${f.id}:${f.status}`), ['1:done', '2:pending']);
  assert.match(avisos[0], /depends_on/);
  const r = cli(d, 'convertir');
  assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(readFileSync(join(d, 'feature_list.json'), 'utf8')).features.length, 2);
  assert.equal(cli(d, 'validar').code, 0);
  assert.equal(cli(d, 'convertir').code, 2, 'no pisa el que ya existe');
});
