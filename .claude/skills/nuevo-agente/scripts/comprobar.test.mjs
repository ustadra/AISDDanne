// Tests de comprobar.mjs. Sin dependencias:  node --test .claude/skills/nuevo-agente/scripts/comprobar.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECCIONES, comprobar, encabezados } from './comprobar.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(AQUI, 'comprobar.mjs');

// Un agente que cumple, para estropearlo de uno en uno.
function agente({ fm = {}, cuerpo } = {}) {
  const campos = {
    name: 'probador',
    description: '"Usar para probar el comprobador, cuando alguien lo pide. Entrega un veredicto."',
    tools: 'Read, Grep, Glob',
    model: 'sonnet',
    ...fm,
  };
  const cabecera = Object.entries(campos).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join('\n');
  const secciones = cuerpo ?? SECCIONES.map((s) => `## ${s}\n\nTexto de ${s}.\n`).join('\n');
  return `---\n${cabecera}\n---\n\nIntro.\n\n${secciones}`;
}

const errores = (texto, f = 'probador.md') => comprobar(texto, f).errores.join('\n');
const avisos = (texto, f = 'probador.md') => comprobar(texto, f).avisos.join('\n');

test('la plantilla tiene las mismas secciones, en el mismo orden, que exige el comprobador', () => {
  const plantilla = readFileSync(join(AQUI, '..', 'assets', 'agente.md.tmpl'), 'utf8');
  assert.deepEqual(encabezados(plantilla), SECCIONES);
});

test('un agente con la forma de la plantilla pasa sin errores ni avisos', () => {
  const r = comprobar(agente(), 'probador.md');
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
});

test('frontmatter: campos que faltan, name que no cuadra y model desconocido o agnóstico', () => {
  assert.match(errores('sin frontmatter\n'), /sin frontmatter/);
  assert.match(errores(agente({ fm: { model: null } })), /falta `model`/);
  assert.match(errores(agente(), 'otro.md'), /no es el nombre del fichero/);
  assert.equal(errores(agente({ fm: { name: 'Probador' } }), 'Probador.md'), '');
  assert.match(avisos(agente({ fm: { name: 'Probador' } }), 'Probador.md'), /minúsculas/);
  assert.match(errores(agente({ fm: { model: 'inventado-99' } })), /model `inventado-99`/);
  for (const m of ['claude-sonnet-5-5', 'ligero', 'medio', 'profundo', 'flash_lite', 'flash', 'pro', 'gemini-2.5-pro', 'gpt-5.4', 'o3']) {
    assert.equal(errores(agente({ fm: { model: m } })), '', m);
  }
  assert.match(avisos(agente({ fm: { model: 'inherit' } })), /inherit/);
});

test('description: empieza por «Usar para» y avisa si se alarga', () => {
  assert.match(errores(agente({ fm: { description: '"Prueba cosas."' } })), /Usar para/);
  const larga = `"Usar para ${'palabra '.repeat(80)}."`;
  assert.match(avisos(agente({ fm: { description: larga } })), /description de \d+ palabras/);
});

test('tools: sin Agent, y sin escribir si se declara de solo lectura; opus que escribe avisa', () => {
  assert.match(errores(agente({ fm: { tools: 'Read, Agent' } })), /Agent\/Task/);
  const ro = '"Usar para auditar. READ-ONLY: encuentra y reporta."';
  assert.match(errores(agente({ fm: { description: ro, tools: 'Read, Write' } })), /solo lectura/);
  assert.equal(errores(agente({ fm: { description: ro, tools: 'Read, Grep, Glob, Bash' } })), '');
  assert.match(avisos(agente({ fm: { tools: 'Read, Bash, Write, Edit', model: 'opus' } })), /opus en un rol que escribe/);
  assert.match(avisos(agente({ fm: { tools: 'Read, Bash, Write, Edit', model: 'profundo' } })), /profundo en un rol que escribe/);
  assert.equal(avisos(agente({ fm: { tools: 'Read, Grep, Glob', model: 'opus' } })), '');
});

test('secciones: faltan, fuera de orden y Stack que no es la última', () => {
  const sin = SECCIONES.filter((s) => s !== 'Qué devuelves').map((s) => `## ${s}\n`).join('\n');
  assert.match(errores(agente({ cuerpo: sin })), /faltan secciones: «## Qué devuelves»/);

  const desorden = ['Cómo trabajas', 'Al ser invocado', ...SECCIONES.slice(2)].map((s) => `## ${s}\n`).join('\n');
  assert.match(errores(agente({ cuerpo: desorden })), /fuera de orden/);

  const coletilla = SECCIONES.map((s) => `## ${s}\n`).join('\n') + '\n## Anexo\n';
  assert.match(errores(agente({ cuerpo: coletilla })), /tiene que ser la última/);
});

test('secciones: admite sufijos y secciones propias entre las obligatorias', () => {
  const cuerpo = [
    '## Al ser invocado', '## Cómo trabajas (3 fases)', '### Paso a paso', '## Patrones del dominio',
    '## Qué devuelves', '## Frontera con otros roles', '## Reglas (no negociables)', '## Stack del proyecto',
  ].join('\n\n');
  assert.equal(errores(agente({ cuerpo })), '');
});

test('un encabezado dentro de un bloque de código no cuenta como sección', () => {
  const cuerpo = SECCIONES.slice(0, 3).map((s) => `## ${s}\n`).join('\n') + '\n```\n## Frontera con otros roles\n```\n';
  assert.match(errores(agente({ cuerpo })), /Frontera con otros roles/);
});

test('pedirle que orqueste a otro rol es error; «orquestado por el supervisor», no', () => {
  const con = (frase) => agente({ cuerpo: SECCIONES.map((s) => `## ${s}\n\n${s === 'Cómo trabajas' ? frase : 'x'}\n`).join('\n') });
  assert.match(errores(con('Cierra **orquestando a `tester`** (cobertura).')), /orquestando a/);
  assert.match(errores(con('Al acabar, orquestando a ciberseguridad.')), /orquestando a/);
  assert.equal(errores(con('Orquestado por el **supervisor**.')), '');
  assert.match(errores(agente({ fm: { description: '"Usar para construir. Cierra orquestando a tester."' } })), /orquestando a/);
  assert.equal(errores(con('Ejemplo: `cierra orquestando a tester` va en código.')), '');
});

test('mayúsculas de énfasis avisan; en código o siglas, no', () => {
  const con = (frase) => agente({ cuerpo: SECCIONES.map((s) => `## ${s}\n\n${s === 'Reglas' ? frase : 'x'}\n`).join('\n') });
  assert.match(avisos(con('Verifica SIEMPRE y NUNCA supongas.')), /SIEMPRE, NUNCA/);
  assert.equal(avisos(con('Revisa CORS, GDPR y `NUNCA` en código.')), '');
});

test('CLI: sale con 1 si hay errores, con 0 si no, y --json da un resultado por fichero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nuevo-agente-'));
  mkdirSync(join(dir, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'agents', 'probador.md'), agente());
  const ok = execFileSync(process.execPath, [SCRIPT, '--raiz', dir, '--json'], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(ok).map((r) => [r.fichero, r.errores.length]), [['probador.md', 0]]);

  writeFileSync(join(dir, '.claude', 'agents', 'roto.md'), '---\nname: roto\n---\n');
  assert.throws(
    () => execFileSync(process.execPath, [SCRIPT, '--raiz', dir], { encoding: 'utf8', stdio: 'pipe' }),
    (e) => e.status === 1 && /✗ roto\.md/.test(e.stdout) && /✓ probador\.md/.test(e.stdout),
  );
});
