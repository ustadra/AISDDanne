// Tests de puerta.mjs con repos temporales. node --test .claude/skills/orquesta/scripts/puerta.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cubre, leerContrato, unidadDelSpec } from './puerta.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'puerta.mjs');

// ---8<--- casos del contrato de la unidad ---8<---
// Copia idéntica en .claude/hooks/tests/contrato-unidad.test.cjs, .claude/skills/orquesta/scripts/puerta.test.mjs
// y .claude/skills/semaforo/scripts/ritmo.test.mjs: las mismas cabeceras se leen igual en los tres lectores.
const TABLA_CONTRATO = (celda) => '\n## Agentes\n\n| Agente | Qué hace | Escribe en (exclusivo) |\n|---|---|---|\n| backend-node | algo | ' + celda + ' |\n\n## Notas\n';
const SIN_VEREDICTO = { tipo: null, sha: null, version: null, fecha: null };
const CASOS_CONTRATO = [
  ['comillas invertidas',
    'Estado: `aprobada`\nVeredicto QA: APROBADA · commit abcdef1 · 2026-10-16\n' + TABLA_CONTRATO('`src/a/`, `docs/*.md`'),
    { estado: 'aprobada', veredicto: { tipo: 'APROBADA', sha: 'abcdef1', version: null, fecha: '2026-10-16' }, escribeEn: ['src/a/', 'docs/*.md'] }],
  ['sin comillas, sha largo entre comillas invertidas y rutas separadas por comas',
    'Estado: en revisión\nVeredicto QA: CAMBIOS PEDIDOS · commit `ABCDEF0123456789` · 2026-10-17\n' + TABLA_CONTRATO('src/a, ./src/b; tests/a.test.js'),
    { estado: 'en revisión', veredicto: { tipo: 'CAMBIOS PEDIDOS', sha: 'abcdef0123456789', version: null, fecha: '2026-10-17' }, escribeEn: ['src/a', 'src/b', 'tests/a.test.js'] }],
  ['Estado solo cuenta a principio de línea; «—» y [rutas] no son veredicto ni rutas',
    '> Estado: `hecha`\n**Estado:** `hecha`\nEstado: `pendiente`\nVeredicto QA: —\n' + TABLA_CONTRATO('[rutas]'),
    { estado: 'pendiente', veredicto: SIN_VEREDICTO, escribeEn: [] }],
  ['un sha de menos de 7 caracteres no vale',
    'Estado: `aprobada`\nVeredicto QA: APROBADA · commit abc12 · 2026-10-16\n',
    { estado: 'aprobada', veredicto: SIN_VEREDICTO, escribeEn: [] }],
  ['sin git: la versión en lugar del commit',
    'Estado: `aprobada`\nVeredicto QA: APROBADA · v2 · 2026-10-03\n' + TABLA_CONTRATO('`99_ENTREGABLES/informe.docx`'),
    { estado: 'aprobada', veredicto: { tipo: 'APROBADA', sha: null, version: 'v2', fecha: '2026-10-03' }, escribeEn: ['99_ENTREGABLES/informe.docx'] }],
  ['el marcador de la plantilla de tareas, con rutas de ejemplo dentro, no cuenta',
    'Estado: `pendiente`\nVeredicto QA: —\n' + TABLA_CONTRATO('[rutas: `99_ENTREGABLES/…`, `90_DOCUMENTACION/…`]'),
    { estado: 'pendiente', veredicto: SIN_VEREDICTO, escribeEn: [] }],
  ['sin líneas ni tabla', '# F-01\n\nNada más.\n', { estado: null, veredicto: null, escribeEn: [] }],
  ['BOM y CRLF',
    (String.fromCharCode(0xfeff) + 'Estado: `aprobada`\nVeredicto QA: APROBADA · commit 1234567 · 2026-10-16\n' + TABLA_CONTRATO('`src/x.js`')).split('\n').join('\r\n'),
    { estado: 'aprobada', veredicto: { tipo: 'APROBADA', sha: '1234567', version: null, fecha: '2026-10-16' }, escribeEn: ['src/x.js'] }],
  ['tabla de agentes sin columna «Escribe en»',
    'Estado: `aprobada`\n\n## Agentes\n\n| Agente | Qué hace |\n|---|---|\n| a | `src/x` |\n',
    { estado: 'aprobada', veredicto: null, escribeEn: [] }],
  ['corchetes entre comillas invertidas son parte de la ruta; fuera de ellas, marcador',
    'Estado: `en curso`\n' + TABLA_CONTRATO('`src/app/[id]/page.tsx`, [opcional: `docs/`] `src/lib/`'),
    { estado: 'en curso', veredicto: null, escribeEn: ['src/app/[id]/page.tsx', 'src/lib/'] }],
  ['rutas normalizadas: sin / ni ./ iniciales y con / en lugar de \\',
    TABLA_CONTRATO('`/src/a/`, `.\\src\\b\\c.ts`, `./docs`'),
    { estado: null, veredicto: null, escribeEn: ['src/a/', 'src/b/c.ts', 'docs'] }],
  ['rutas normalizadas también separadas por comas',
    TABLA_CONTRATO('src\\x, /src/y, ./z'),
    { estado: null, veredicto: null, escribeEn: ['src/x', 'src/y', 'z'] }],
  ['Estado y Veredicto QA dentro de un bloque de código cercado no cuentan',
    '```md\nEstado: `hecha`\nVeredicto QA: APROBADA · commit 1111111 · 2026-01-01\n```\n~~~\nEstado: `hecha`\n~~~\nEstado: `en curso`\nVeredicto QA: —\n',
    { estado: 'en curso', veredicto: SIN_VEREDICTO, escribeEn: [] }],
  ['solo dentro de un bloque cercado: no hay cabecera',
    '```\nEstado: `aprobada`\nVeredicto QA: APROBADA · commit 1234567 · 2026-10-16\n## Agentes\n\n| Agente | Escribe en |\n|---|---|\n| a | `src/x` |\n```\n',
    { estado: null, veredicto: null, escribeEn: [] }],
  ['en una misma celda, rutas con y sin comillas invertidas; los corchetes dentro de comillas son ruta',
    TABLA_CONTRATO('`src/app/[id]/page.tsx`, src/lib, docs/x.md; `src/b/` (solo esa carpeta)'),
    { estado: null, veredicto: null, escribeEn: ['src/app/[id]/page.tsx', 'src/b/', 'src/lib', 'docs/x.md'] }],
  ['Estado con texto detrás: cuenta el estado conocido con que empieza',
    'Estado: aprobada (por qa)\n',
    { estado: 'aprobada', veredicto: null, escribeEn: [] }],
  ['Estado con texto detrás de un estado de dos palabras; sin estado conocido, la primera palabra',
    'Estado: en revisión, desde ayer\n\nEstado: rara cosa\n',
    { estado: 'en revisión', veredicto: null, escribeEn: [] }],
  ['Estado desconocido con texto detrás: la primera palabra',
    'Estado: rara cosa\n',
    { estado: 'rara', veredicto: null, escribeEn: [] }],
];
// cubre(patron, ruta): la misma decisión en los tres lectores.
const CASOS_CUBRE = [
  ['src/alta/', 'src/alta/x/y.js', true],
  ['src/alta', 'src/altas/y.js', false],
  ['docs/*.md', 'docs/sub/a.md', false],
  ['src/**/x.ts', 'src/x.ts', true],
  ['src/**/x.ts', 'src/a/b/x.ts', true],
  ['src/**/x.ts', 'src/a/y.ts', false],
  ['src/app/[id]/*.tsx', 'src/app/[id]/page.tsx', true],
  ['src/app/[id]/*.tsx', 'src/app/i/page.tsx', false],
  ['src/app/[id]/*.tsx', 'src/app/[id]/sub/page.tsx', false],
];
const resumenContrato = (r) => ({
  estado: r.estado,
  veredicto: r.veredicto && { tipo: r.veredicto.tipo, sha: r.veredicto.sha, version: r.veredicto.version, fecha: r.veredicto.fecha },
  escribeEn: r.escribeEn,
});
// ---8<--- fin de los casos del contrato ---8<---

function git(cwd, ...args) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function escribir(raiz, rel, contenido) {
  mkdirSync(dirname(join(raiz, rel)), { recursive: true });
  writeFileSync(join(raiz, rel), contenido);
}

function spec({ estado = 'aprobada', veredicto, rutas = '`src/alta/`, `tests/alta.test.js`' }) {
  return [
    '# F-01 · Alta',
    '',
    `Estado: \`${estado}\``,
    `Veredicto QA: ${veredicto}`,
    'Tamaño previsto: ~120 líneas',
    '',
    '## Agentes',
    '',
    '| Agente | Qué hace | Escribe en (exclusivo) |',
    '|---|---|---|',
    `| backend-node | El alta | ${rutas} |`,
    '',
    '## Notas y decisiones',
    '',
  ].join('\n');
}

// Repo con rama de integración, un worktree de la feature con un commit, y el SPEC fuera del worktree.
function montar(t, { ficheros = { 'src/alta/index.js': 'export const x = 1;\n' } } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'puerta-'));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  const repo = join(raiz, 'repo');
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'orquesta/demo');
  git(repo, 'config', 'user.email', 'test@example.com');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'core.autocrlf', 'false');
  escribir(repo, 'README.md', '# demo\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'base');
  const wt = join(raiz, 'wt-alta');
  git(repo, 'worktree', 'add', '-q', '-b', 'orquesta/F-01-alta', wt, 'orquesta/demo');
  for (const [rel, c] of Object.entries(ficheros)) escribir(wt, rel, c);
  git(wt, 'add', '-A');
  git(wt, 'commit', '-q', '-m', 'feat: alta');
  const sha = git(wt, 'rev-parse', 'HEAD');
  const specPath = join(raiz, 'SPEC.md');
  return { raiz, repo, wt, sha, specPath };
}

function puerta(cwd, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

test('pasa con estado aprobada, sha = HEAD, rutas dentro y árbol limpio (worktree)', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`PASA\\. Sha a mergear: ${sha}`));
});

test('pasa con nombre de rama y base explícita', (t) => {
  const { repo, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 10)} · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', 'orquesta/F-01-alta', '--base', 'orquesta/demo');
  assert.equal(r.code, 0, r.out);
});

test('no pasa si el estado no es aprobada', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ estado: 'en revisión', veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Estado `en revisión`/);
});

test('no pasa con CAMBIOS PEDIDOS', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `CAMBIOS PEDIDOS · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /CAMBIOS PEDIDOS/);
});

test('no pasa sin veredicto (—)', (t) => {
  const { repo, wt, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: '—' }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Veredicto QA ilegible o vacío/);
});

test('no pasa si hay un commit después del que aprobó QA', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  escribir(wt, 'src/alta/otro.js', 'export const y = 2;\n');
  git(wt, 'add', '-A');
  git(wt, 'commit', '-q', '-m', 'feat: retoque');
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /no es lo que se juzgó/);
});

test('no pasa con un sha de menos de 7 caracteres', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 5)} · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /sha de 7 a 40/);
});

test('pasa con el sha del veredicto entre comillas invertidas', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit \`${sha.slice(0, 7)}\` · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 0, r.out);
});

test('no pasa si el diff toca fuera de sus rutas exclusivas', (t) => {
  const { repo, wt, sha, specPath } = montar(t, { ficheros: { 'src/alta/index.js': 'x\n', 'package.json': '{}\n' } });
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /package\.json/);
});

test('no pasa con el árbol del worktree sucio', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  escribir(wt, 'src/alta/borrador.js', 'sin commitear\n');
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /cambios sin commitear/);
});

test('el árbol sucio también se ve si se pasa la rama por nombre', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  escribir(wt, 'src/alta/borrador.js', 'sin commitear\n');
  const r = puerta(repo, '--spec', specPath, '--rama', 'orquesta/F-01-alta', '--base', 'orquesta/demo');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /cambios sin commitear/);
});

test('sin rutas «Escribe en» legibles no pasa: marcador de plantilla, rutas entre corchetes o sin tabla', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  const veredicto = `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16`;
  const casos = [
    spec({ veredicto, rutas: '[rutas]' }),
    spec({ veredicto, rutas: '[rutas: `src/alta/`, `tests/alta.test.js`]' }),
    spec({ veredicto, rutas: '' }),
    spec({ veredicto }).replace(/## Agentes[\s\S]*?(?=## Notas)/, ''),
  ];
  for (const texto of casos) {
    writeFileSync(specPath, texto);
    const r = puerta(repo, '--spec', specPath, '--rama', wt);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /\[NO\].*No puedo leer las rutas «Escribe en \(exclusivo\)».*sin alcance declarado no se mergea/);
  }
});

test('un diff vacío no pasa: la rama no cambia nada frente a la base', (t) => {
  const { repo, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  // Base = el propio commit aprobado: base...rama no tiene nada.
  const r = puerta(repo, '--spec', specPath, '--rama', 'orquesta/F-01-alta', '--base', sha);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\[NO\].*La rama no cambia nada frente a la base.*base sea la equivocada/);
});

test('rutas con ñ y tildes: se leen sin escapar y casan con su patrón', (t) => {
  const { repo, wt, sha, specPath } = montar(t, { ficheros: { 'docs/diseño.md': '# Diseño\n', 'docs/más/índice.md': 'x\n' } });
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16`, rutas: '`docs/diseño.md`, `docs/más/`' }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /2 fichero\(s\) cambiados, todos dentro de sus rutas exclusivas/);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16`, rutas: '`docs/más/`' }));
  const fuera = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(fuera.code, 1, fuera.out);
  assert.match(fuera.out, /docs\/diseño\.md/, 'el motivo nombra la ruta tal cual, sin escapar');
});

test('al pasar, imprime el merge con el mensaje que prescribe /orquesta', (t) => {
  const { raiz, repo, wt, sha } = montar(t);
  const specPath = join(raiz, 'features', 'F-01-alta', 'SPEC.md');
  escribir(raiz, 'features/F-01-alta/SPEC.md', spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 0, r.out);
  assert.ok(r.out.includes(`git merge --no-ff ${sha} -m "chore(orquesta): merge F-01 alta (qa ${sha.slice(0, 7)})"`), r.out);
  assert.deepEqual(unidadDelSpec('03_TAREAS/T-04_informe-final.md'), { id: 'T-04', slug: 'informe-final' });
  assert.equal(unidadDelSpec('SPEC.md'), null);
});

test('errores de uso: exit 2', (t) => {
  const { repo, wt } = montar(t);
  assert.equal(puerta(repo).code, 2);
  assert.equal(puerta(repo, '--spec', 'no-existe.md', '--rama', wt).code, 2);
  assert.equal(puerta(repo, '--rama', wt, '--otro', 'x').code, 2);
  const specPath = join(repo, '..', 'SPEC.md');
  writeFileSync(specPath, spec({ veredicto: '—' }));
  assert.equal(puerta(repo, '--spec', specPath, '--rama', 'rama/que-no-existe').code, 2);
});

test('leerContrato: cabecera y rutas exclusivas', () => {
  const s = spec({ veredicto: 'APROBADA · commit ABCDEF1 · 2026-10-16', rutas: '`src/a/`, `docs/*.md`' });
  const c = leerContrato(s);
  assert.equal(c.estado, 'aprobada');
  assert.deepEqual([c.veredicto.tipo, c.veredicto.sha, c.veredicto.fecha], ['APROBADA', 'abcdef1', '2026-10-16']);
  assert.deepEqual(c.escribeEn, ['src/a/', 'docs/*.md']);
  assert.deepEqual(leerContrato('# x\n\n## Agentes\n\n| A | B |\n|---|---|\n| a | b |\n').escribeEn, []);
  assert.deepEqual(leerContrato(spec({ veredicto: '—', rutas: 'src/a, src/b' })).escribeEn, ['src/a', 'src/b']);
});

test('cubre: carpeta, fichero exacto y globs', () => {
  assert.ok(cubre('src/alta/', 'src/alta/x/y.js'));
  assert.ok(cubre('src/alta', 'src/alta/y.js'));
  assert.ok(!cubre('src/alta', 'src/altas/y.js'));
  assert.ok(cubre('tests/alta.test.js', 'tests/alta.test.js'));
  assert.ok(cubre('docs/*.md', 'docs/a.md'));
  assert.ok(!cubre('docs/*.md', 'docs/sub/a.md'));
  assert.ok(cubre('src/**/alta.ts', 'src/a/b/alta.ts'));
  assert.ok(cubre('src/**/alta.ts', 'src/alta.ts'));
  assert.ok(cubre('.\\src\\alta\\', 'src/alta/z.js'));
});

test('contrato de la unidad: los mismos casos que unit-close y ritmo', () => {
  for (const [nombre, texto, espera] of CASOS_CONTRATO) assert.deepEqual(resumenContrato(leerContrato(texto)), espera, nombre);
});

test('se lanza desde la rama de integración orquesta/*: desde otra es error de uso; desde una protegida, no pasa', (t) => {
  const { repo, wt, sha, specPath } = montar(t);
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16` }));
  git(repo, 'checkout', '-q', '-b', 'feat/otra');
  const otra = puerta(repo, '--spec', specPath, '--rama', wt, '--base', 'orquesta/demo');
  assert.equal(otra.code, 2, otra.out);
  assert.match(otra.out, /rama de integración \(orquesta\/\*\).*`feat\/otra`/);
  git(repo, 'checkout', '-q', '-b', 'main');
  const prot = puerta(repo, '--spec', specPath, '--rama', wt, '--base', 'orquesta/demo');
  assert.equal(prot.code, 1, prot.out);
  assert.match(prot.out, /\[NO\].*`main`, protegida/);
  git(repo, 'checkout', '-q', '--detach');
  assert.equal(puerta(repo, '--spec', specPath, '--rama', wt, '--base', 'orquesta/demo').code, 2);
});

test('revert: la rama vieja con un arreglo encima no pasa; recreada desde la integración y reaplicada, pasa', (t) => {
  const { raiz, repo, wt, sha, specPath } = montar(t);
  // Se mergea la unidad y los tests fallan: se revierte el merge en la integración.
  git(repo, 'merge', '-q', '--no-ff', sha, '-m', 'chore(orquesta): merge F-01 alta');
  git(repo, 'revert', '--no-edit', '-m', '1', 'HEAD');
  const revert = git(repo, 'rev-parse', 'HEAD');
  // Mal: el constructor sigue en la rama vieja y solo añade el arreglo. El diff frente a la base es el arreglo,
  // pero el merge dejaría la integración sin lo revertido.
  escribir(wt, 'src/alta/arreglo.js', 'export const z = 3;\n');
  git(wt, 'add', '-A');
  git(wt, 'commit', '-q', '-m', 'fix: arreglo');
  const viejo = git(wt, 'rev-parse', 'HEAD');
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${viejo.slice(0, 7)} · 2026-10-16` }));
  const mal = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(mal.code, 1, mal.out);
  assert.match(mal.out, /\[NO\]\s+El resultado del merge no deja lo aprobado[\s\S]*src\/alta\/index\.js/);
  // Bien: rama nueva desde la punta de la integración, se reaplica el trabajo (revert del revert) y el arreglo.
  const wt2 = join(raiz, 'wt-alta-2');
  git(repo, 'worktree', 'add', '-q', '-b', 'orquesta/F-01-alta-2', wt2, 'orquesta/demo');
  git(wt2, 'revert', '--no-edit', revert);
  escribir(wt2, 'src/alta/arreglo.js', 'export const z = 3;\n');
  git(wt2, 'add', '-A');
  git(wt2, 'commit', '-q', '-m', 'fix: arreglo');
  const nuevo = git(wt2, 'rev-parse', 'HEAD');
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${nuevo.slice(0, 7)} · 2026-10-16` }));
  const bien = puerta(repo, '--spec', specPath, '--rama', wt2);
  assert.equal(bien.code, 0, bien.out);
  assert.match(bien.out, /El resultado del merge deja en sus rutas lo mismo que el HEAD aprobado/);
});

test('globs: src/**/x.ts cubre src/x.ts y [id] es literal', (t) => {
  const { repo, wt, sha, specPath } = montar(t, { ficheros: { 'src/x.ts': 'a\n', 'src/app/[id]/page.tsx': 'b\n' } });
  writeFileSync(specPath, spec({ veredicto: `APROBADA · commit ${sha.slice(0, 7)} · 2026-10-16`, rutas: '`src/**/x.ts`, `src/app/[id]/*.tsx`' }));
  const r = puerta(repo, '--spec', specPath, '--rama', wt);
  assert.equal(r.code, 0, r.out);
  assert.ok(!cubre('src/app/[id]/*.tsx', 'src/app/i/page.tsx'));
});

// ---------------------------------------------------------------- con el plan en JSON (--plan y --feature)

function planJson(sha, { status = 'approved', files = ['src/alta/', 'tests/alta.test.js'], extra = {} } = {}) {
  return JSON.stringify({
    proyecto: 'demo',
    features: [{
      id: 1, name: 'alta', title: 'Alta de reserva', depends_on: [], files,
      acceptance: [{ criterio: 'el alta guarda la reserva', verify: 'node -e 0' }],
      status, intentos: 0, sha, ...extra,
    }],
  });
}

test('--plan: pasa con la feature approved, su sha = HEAD y sus files', (t) => {
  const { raiz, repo, wt, sha } = montar(t);
  const planPath = join(raiz, 'feature_list.json');
  writeFileSync(planPath, planJson(sha.slice(0, 7)));
  const r = puerta(repo, '--plan', planPath, '--feature', 'alta', '--rama', wt);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Estado `approved`/);
  assert.match(r.out, new RegExp(`PASA\. Sha a mergear: ${sha}`));
  assert.match(r.out, /merge F-01 alta \(qa /, 'el asunto del merge que reconoce /semaforo ritmo');
  assert.equal(puerta(repo, '--plan', planPath, '--feature', '1', '--rama', wt).code, 0, 'también por id');
});

test('--plan: no pasa si no está approved, si el sha no es el HEAD o si el diff se sale de files', (t) => {
  const { raiz, repo, wt, sha } = montar(t);
  const planPath = join(raiz, 'feature_list.json');
  writeFileSync(planPath, planJson(sha.slice(0, 7), { status: 'in_qa' }));
  let r = puerta(repo, '--plan', planPath, '--feature', 'alta', '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Estado `in_qa`: tiene que ser `approved`/);
  writeFileSync(planPath, planJson('abcdef1'));
  r = puerta(repo, '--plan', planPath, '--feature', 'alta', '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /QA aprobó abcdef1, pero el HEAD/);
  writeFileSync(planPath, planJson(sha.slice(0, 7), { files: ['docs/'] }));
  r = puerta(repo, '--plan', planPath, '--feature', 'alta', '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /fuera de «Escribe en \(exclusivo\)»/);
});

test('--plan: un plan inválido no pasa, aunque la feature esté bien', (t) => {
  const { raiz, repo, wt, sha } = montar(t);
  const planPath = join(raiz, 'feature_list.json');
  writeFileSync(planPath, planJson(sha.slice(0, 7), { files: ['src/alta/', '**'] }));
  const r = puerta(repo, '--plan', planPath, '--feature', 'alta', '--rama', wt);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /El plan no es válido/);
  assert.match(r.out, /alcanza feature_list.json/);
});

test('--plan: errores de uso con exit 2', (t) => {
  const { raiz, repo, wt, sha, specPath } = montar(t);
  const planPath = join(raiz, 'feature_list.json');
  writeFileSync(planPath, planJson(sha.slice(0, 7)));
  assert.equal(puerta(repo, '--plan', planPath, '--rama', wt).code, 2, 'falta --feature');
  assert.equal(puerta(repo, '--plan', planPath, '--feature', 'otra', '--rama', wt).code, 2, 'la feature no está en el plan');
  assert.equal(puerta(repo, '--plan', planPath, '--spec', specPath, '--feature', 'alta', '--rama', wt).code, 2, 'o --spec o --plan');
  assert.equal(puerta(repo, '--plan', join(raiz, 'no-existe.json'), '--feature', 'alta', '--rama', wt).code, 2);
  writeFileSync(planPath, '{ no es json');
  assert.equal(puerta(repo, '--plan', planPath, '--feature', 'alta', '--rama', wt).code, 2);
});
