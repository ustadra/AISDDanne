#!/usr/bin/env node
// comprobar.mjs — ¿tiene este agente la forma de la plantilla? Node sin dependencias.
//
//   node comprobar.mjs [--raiz <ruta>] [--json] [<fichero.md>…]
//
// Sin ficheros, revisa todos los de <raiz>/.claude/agents/. Solo LEE: no escribe, no usa red.
// Sale con 1 si algún agente tiene errores; los avisos no cambian el código de salida.
//
// La forma es la de ../assets/agente.md.tmpl. Las secciones obligatorias están en SECCIONES, y un
// test comprueba que coinciden con las de la plantilla, para que no se separen.
//
// Errores (el agente no cumple la plantilla):
//   · frontmatter sin name, description, tools o model;
//   · name que no es el nombre del fichero;
//   · model fuera de ligero/medio/profundo, haiku/sonnet/opus, flash_lite/flash/pro, inherit o un id claude-…/gemini-…/gpt-…/o1-…/o3-…/o4-…;
//   · description que no empieza por «Usar para»;
//   · tools con Agent o Task: un subagente no lanza a otros, eso es del supervisor;
//   · un rol que se declara de solo lectura y tiene Write o Edit;
//   · secciones obligatorias que faltan, van fuera de orden o no acaban en «Stack del proyecto»;
//   · el prompt le pide que «orqueste» a otro rol, algo que como subagente no puede hacer.
// Avisos (se puede justificar, pero hay que mirarlo):
//   · description de más de 70 palabras: decide cuándo se invoca y compite con las demás;
//   · mayúsculas de énfasis (NUNCA, SIEMPRE…): mejor el porqué que el grito;
//   · opus en un rol que escribe: es el más caro, y el porqué va en el catálogo;
//   · inherit: el modelo lo decide quien lo lanza, no el rol;
//   · name fuera de minúsculas y guiones (la convención de Claude Code): renombrar arrastra el roster.
//
// Lo usa la skill /nuevo-agente al crear o alinear un agente, y el hook doc-drift tras cada edición
// de un agente, si el repo tiene esta skill.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SECCIONES = ['Al ser invocado', 'Cómo trabajas', 'Qué devuelves', 'Frontera con otros roles', 'Reglas', 'Stack del proyecto'];
const MODELOS = ['haiku', 'sonnet', 'opus', 'ligero', 'medio', 'profundo', 'flash_lite', 'flash', 'pro', 'inherit'];
const MODELOS_CAROS = new Set(['opus', 'profundo', 'pro']);
const RE_ID_MODELO = /^(claude-[a-z0-9.-]+|gemini-[a-z0-9.-]+|gpt-[0-9][a-z0-9.-]*|o[134](-[a-z0-9.-]+)?)$/;
const ENFASIS = ['NUNCA', 'SIEMPRE', 'JAMÁS', 'OBLIGATORIO', 'IMPORTANTE', 'NINGÚN', 'NINGUNA', 'NADA'];
const MAX_PALABRAS = 70;
const RE_SOLO_LECTURA = /\b(solo lectura|read-only|solo (reporta|lee)|no (edita|escribe) (nada|código))\b/i;
const RE_ORQUESTA = /\b(cierra|termina|acaba)?\s*orquestando\s+a\b|\borquesta(s)?\s+a\s+`/i;

// Frontmatter YAML plano: clave → valor, con las comillas de fuera quitadas.
export function frontmatter(texto) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if (!m) return null;
  const out = {};
  let clave = null;
  for (const linea of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(linea);
    if (kv) { clave = kv[1]; out[clave] = kv[2].trim(); } else if (clave) out[clave] += ' ' + linea.trim();
  }
  for (const k of Object.keys(out)) out[k] = out[k].replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1');
  return out;
}

// El cuerpo sin frontmatter, sin bloques de código ni código en línea: lo que se lee como prosa.
function prosa(texto) {
  return texto
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

// Encabezados de nivel 2, fuera de bloques de código.
export function encabezados(texto) {
  const cuerpo = texto.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
  return [...cuerpo.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
}

// La sección obligatoria a la que corresponde un encabezado: «Reglas (no negociables)» es «Reglas».
const seccionDe = (h) => SECCIONES.find((s) => h === s || h.startsWith(s + ' '));

export function comprobar(texto, fichero) {
  const errores = [];
  const avisos = [];
  const nombre = basename(fichero, '.md');
  const fm = frontmatter(texto);

  if (!fm) {
    errores.push('sin frontmatter (--- name, description, tools, model ---)');
  } else {
    for (const campo of ['name', 'description', 'tools', 'model']) {
      if (!fm[campo]) errores.push(`falta \`${campo}\` en el frontmatter`);
    }
    if (fm.name && fm.name !== nombre) errores.push(`name \`${fm.name}\` no es el nombre del fichero (\`${nombre}\`)`);
    if (fm.name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name)) avisos.push(`name \`${fm.name}\`: mejor minúsculas, números y guiones; renombrar es un cambio de roster`);
    if (fm.model && !MODELOS.includes(fm.model) && !RE_ID_MODELO.test(fm.model)) {
      errores.push(`model \`${fm.model}\`: usa un nivel (ligero, medio, profundo) o alias válido (haiku, sonnet, opus, flash, pro, gpt-5…)`);
    }
    if (fm.model === 'inherit') avisos.push('model inherit: el coste lo decide quien lo lanza; fija el nivel (ligero, medio, profundo) o su alias (haiku, sonnet, opus)');
    if (fm.description && !/^Usar para\b/.test(fm.description)) errores.push('la description no empieza por «Usar para»');
    const palabras = (fm.description || '').split(/\s+/).filter(Boolean).length;
    if (palabras > MAX_PALABRAS) avisos.push(`description de ${palabras} palabras (máx. ${MAX_PALABRAS}): deja el cuándo y saca el cómo al cuerpo`);

    const tools = (fm.tools || '').split(/[,\s]+/).filter(Boolean);
    if (tools.some((t) => t === 'Agent' || t === 'Task')) errores.push('tools con Agent/Task: un subagente no lanza a otros; las puertas las abre el supervisor');
    const escribe = tools.some((t) => t === 'Write' || t === 'Edit');
    if (escribe && RE_SOLO_LECTURA.test(fm.description || '')) errores.push('se declara de solo lectura y tiene Write o Edit');
    if (escribe && MODELOS_CAROS.has(fm.model)) avisos.push(`${fm.model} en un rol que escribe: es el nivel más caro; anota el porqué en squad/_catalogo.md o baja al nivel medio (sonnet)`);
  }

  // Secciones: las obligatorias, todas, en orden, y «Stack del proyecto» la última.
  const hs = encabezados(texto);
  const vistas = hs.map(seccionDe).filter(Boolean);
  const faltan = SECCIONES.filter((s) => !vistas.includes(s));
  if (faltan.length) errores.push(`faltan secciones: ${faltan.map((s) => `«## ${s}»`).join(', ')}`);
  const orden = vistas.filter((s, i) => vistas.indexOf(s) === i);
  const esperado = SECCIONES.filter((s) => orden.includes(s));
  if (orden.join('|') !== esperado.join('|')) errores.push(`secciones fuera de orden: ${orden.join(' → ')} (va ${SECCIONES.join(' → ')})`);
  if (hs.length && !faltan.includes('Stack del proyecto') && seccionDe(hs[hs.length - 1]) !== 'Stack del proyecto') {
    errores.push('«## Stack del proyecto» tiene que ser la última sección');
  }

  const texto2 = prosa(texto);
  const orq = RE_ORQUESTA.exec(texto2) || RE_ORQUESTA.exec((fm && fm.description) || '');
  if (orq) errores.push(`«${orq[0].trim()}…»: un subagente no lanza a otros roles; di qué tiene que mirar cada uno en «Qué devuelves» y lo lanza el supervisor`);

  const gritos = [...new Set([...texto2.matchAll(/\b[A-ZÁÉÍÓÚÑ]{4,}\b/g)].map((m) => m[0]).filter((w) => ENFASIS.includes(w)))];
  if (gritos.length) avisos.push(`mayúsculas de énfasis (${gritos.join(', ')}): explica el porqué en vez de gritar`);

  return { fichero, errores, avisos };
}

function opciones(argv) {
  const o = { json: false, raiz: process.cwd(), ficheros: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') o.json = true;
    else if (argv[i] === '--raiz') o.raiz = argv[++i];
    else if (argv[i].startsWith('--')) { console.error(`✗ opción desconocida: ${argv[i]}\nuso: node comprobar.mjs [--raiz <ruta>] [--json] [<fichero.md>…]`); process.exit(2); }
    else o.ficheros.push(argv[i]);
  }
  return o;
}

function main() {
  const o = opciones(process.argv.slice(2));
  let ficheros = o.ficheros.map((f) => resolve(f));
  if (!ficheros.length) {
    const dir = join(resolve(o.raiz), '.claude', 'agents');
    if (!existsSync(dir)) { console.error(`✗ no hay ${dir}`); process.exit(2); }
    ficheros = readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => join(dir, f));
  }
  const res = ficheros.map((f) => comprobar(readFileSync(f, 'utf8'), f));
  const conErrores = res.filter((r) => r.errores.length).length;

  if (o.json) {
    process.stdout.write(JSON.stringify(res.map((r) => ({ ...r, fichero: basename(r.fichero) })), null, 2) + '\n');
  } else {
    for (const r of res) {
      const marca = r.errores.length ? '✗' : r.avisos.length ? '~' : '✓';
      console.log(`${marca} ${basename(r.fichero)}`);
      for (const e of r.errores) console.log(`    error: ${e}`);
      for (const a of r.avisos) console.log(`    aviso: ${a}`);
    }
    console.log(`\n${res.length} agentes · ${conErrores} con errores · ${res.filter((r) => !r.errores.length && r.avisos.length).length} solo con avisos`);
  }
  process.exit(conErrores ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
