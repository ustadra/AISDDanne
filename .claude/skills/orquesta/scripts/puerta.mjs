#!/usr/bin/env node
// puerta.mjs — puerta de merge de /orquesta. Sin dependencias, sin red.
//
//   node puerta.mjs --spec <ruta SPEC.md> --rama <rama | ruta de worktree> [--base <sha|rama>]
//   node puerta.mjs --plan <feature_list.json> --feature <id|name> --rama <rama | ruta de worktree> [--base <sha|rama>]
// Con --plan, el estado, el sha que juzgó qa y las rutas «files» salen de la entrada de la feature en el plan (que
// se valida entero antes, con plan.mjs); el resto de comprobaciones es el mismo. --spec sigue valiendo para los
// proyectos que aún llevan sus features en markdown.
//
// Comprueba, antes de mergear una unidad a la rama de integración:
//   (a) Estado `aprobada` en la cabecera del SPEC.
//   (b) Veredicto QA APROBADA con un sha (7 a 40 caracteres) que es prefijo del HEAD de la rama o worktree.
//   (c) El diff de la rama frente a la base solo toca las rutas «Escribe en (exclusivo)» de la tabla de
//       agentes del SPEC. Sin rutas legibles (sin tabla, celda vacía o con el marcador `[rutas]`) no pasa:
//       sin alcance declarado no hay con qué comparar el diff.
//   (d) Árbol limpio en el worktree (si --rama es un worktree, o una rama sacada en alguno).
//   (e) El resultado del merge contiene lo aprobado: `git merge-tree --write-tree <base> <head>` y, en las rutas
//       de la unidad, el árbol resultante tiene que ser igual al del HEAD aprobado. Lo que no casa (por ejemplo,
//       la rama de una unidad cuyo merge anterior se revirtió y que solo añade un arreglo encima) no pasa. Con un
//       git sin `--write-tree` (anterior a 2.38) lo avisa y no bloquea por esto.
// Se lanza desde la rama de integración: la rama actual del repo de cwd tiene que ser `orquesta/*`. Desde una
// rama protegida (main, master, staging, produccion, production) no pasa (exit 1); desde cualquier otra, o con
// HEAD suelto, es error de uso (exit 2).
// La base por defecto es el HEAD del repo desde el que se lanza (la rama de integración); el diff se toma
// desde el merge-base (`base...rama`). Un diff vacío no pasa: la rama no cambia nada frente a la base y lo
// más probable es que la base sea la equivocada. Los nombres de fichero se leen sin escapar
// (`core.quotepath=false`, separados por NUL): una ruta con ñ o tildes casa con su patrón.
//
// Salida: exit 0 pasa (imprime el sha a mergear) · exit 1 no pasa (motivos) · exit 2 error de uso.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarPlan } from './plan.mjs';

const USO = 'Uso: node puerta.mjs --spec <ruta SPEC.md> | --plan <feature_list.json> --feature <id|name>  --rama <rama | ruta de worktree> [--base <sha|rama>]';

class ErrorUso extends Error {}

// La misma lista que .claude/hooks/block-protected-merges.cjs y .githooks/pre-push.
const PROTEGIDAS = ['main', 'master', 'staging', 'produccion', 'production'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { out.ayuda = true; continue; }
    const m = /^--(spec|plan|feature|rama|base)(?:=(.*))?$/.exec(a);
    if (!m) throw new ErrorUso(`Argumento desconocido: ${a}`);
    const val = m[2] ?? argv[++i];
    if (val == null || val === '' || (m[2] == null && val.startsWith('--'))) throw new ErrorUso(`Falta el valor de --${m[1]}`);
    out[m[1]] = val;
  }
  return out;
}

function git(cwd, args) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  if (r.error) throw new ErrorUso(`No puedo ejecutar git: ${r.error.message}`);
  return { ok: r.status === 0, status: r.status, out: (r.stdout ?? '').replace(/\r?\n$/, ''), err: (r.stderr ?? '').trim() };
}

function gitOrUso(cwd, args, msg) {
  const r = git(cwd, args);
  if (!r.ok) throw new ErrorUso(`${msg}${r.err ? ` (${r.err})` : ''}`);
  return r.out;
}

// ---------------------------------------------------------------- lectura del SPEC

// ---8<--- contrato de la unidad ---8<---
// Copia idéntica en .claude/skills/orquesta/scripts/puerta.mjs, .claude/hooks/unit-close.cjs y
// .claude/skills/semaforo/scripts/ritmo.mjs. Viajan por separado (hooks y skills) y no comparten módulo:
// si cambias una copia, cambia las tres. .claude/hooks/tests/contrato-unidad.test.cjs comprueba que
// siguen idénticas y que leen igual. El formato es el de templates/features/SPEC.md.tmpl y
// templates/tareas/TAREA.md.tmpl:
//   Estado: `<estado>`        a principio de línea, con o sin comillas invertidas. Si detrás del valor va texto
//                             («aprobada (por qa)»), cuenta el estado conocido con que empieza o, si no hay
//                             ninguno, la primera palabra.
//   Veredicto QA: APROBADA | CAMBIOS PEDIDOS · commit <sha de 7 a 40> · AAAA-MM-DD
//                             el sha con o sin comillas invertidas; sin git, `v<N>` en lugar de «commit <sha>».
//                             Dentro de un bloque de código cercado (``` o ~~~) ninguna de las dos cuenta.
//   ## Agentes, columna «Escribe en»: rutas entre comillas invertidas, que se toman tal cual (también con
//                             corchetes, como `src/app/[id]/page.tsx`), y rutas sin comillas separadas por comas;
//                             en una misma celda valen las dos formas. Fuera de las comillas, lo que va entre
//                             corchetes es marcador de plantilla y no cuenta, ni las rutas entre comillas que lleve
//                             dentro. Cada ruta sale normalizada: `\` pasa a `/` y se quitan la `/` y el `./`
//                             iniciales.
// cubre(patron, ruta) decide si una ruta cambiada cae dentro de una ruta «Escribe en»: igual, carpeta que la
// contiene o glob con * (un nivel) y ** (cualquier número de niveles, también ninguno). Todo lo demás es literal:
// los corchetes de `[id]` no son una clase de caracteres. Los tres lectores filtran con ella los ficheros que
// devuelve git, nunca pasan los patrones a git como pathspec (git los leería con otras reglas).
const ESTADOS_UNIDAD = ['pendiente', 'en curso', 'en revisión', 'cambios pedidos', 'aprobada', 'hecha', 'bloqueada'];
function leerContrato(texto) {
  const t = String(texto || '').replace(/^\uFEFF/, '');
  // Las líneas, con los bloques de código cercados en blanco: un ejemplo dentro de ``` no es la cabecera.
  let cerca = null;
  const lineas = t.split(/\r?\n/).map((l) => {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(l);
    if (cerca) { if (m && m[1][0] === cerca[0] && m[1].length >= cerca.length) cerca = null; return ''; }
    if (m) { cerca = m[1]; return ''; }
    return l;
  });
  const sinCercas = lineas.join('\n');
  const est = /^Estado:[ \t]*(?:`([^`\r\n]*)`|([^\r\n]*))/m.exec(sinCercas);
  const crudoEstado = (est ? (est[1] != null ? est[1] : est[2]) : '').trim().toLowerCase().replace(/\s+/g, ' ');
  const conocido = ESTADOS_UNIDAD.find((e) => crudoEstado === e || (crudoEstado.startsWith(e) && !/^[\p{L}\p{N}_-]/u.test(crudoEstado.slice(e.length))));
  const estado = conocido || (crudoEstado.split(' ')[0] || '').replace(/[.,;:]+$/, '') || null;
  const linea = /^Veredicto QA:[ \t]*([^\r\n]*)/m.exec(sinCercas);
  let veredicto = null;
  if (linea) {
    const crudo = linea[1].trim();
    const v = /^(APROBADA|CAMBIOS PEDIDOS)[ \t]*·[ \t]*(?:commit[ \t]+`?([0-9a-fA-F]{7,40})`?|(v\d+))[ \t]*·[ \t]*(\d{4}-\d{2}-\d{2})(?!\d)/.exec(crudo);
    veredicto = v
      ? { tipo: v[1], sha: v[2] ? v[2].toLowerCase() : null, version: v[3] || null, fecha: v[4], crudo }
      : { tipo: null, sha: null, version: null, fecha: null, crudo };
  }
  const escribeEn = [];
  const ini = lineas.findIndex((l) => /^##[ \t]+Agentes\b/i.test(l));
  if (ini >= 0) {
    const celdas = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    let col = -1;
    for (let i = ini + 1; i < lineas.length; i++) {
      const l = lineas[i].trim();
      if (/^#{1,2}[ \t]/.test(l)) break;
      if (!l.startsWith('|')) { if (col >= 0 && l) break; continue; }
      const c = celdas(l);
      if (col < 0) { col = c.findIndex((x) => /escribe en/i.test(x)); if (col < 0) break; continue; }
      if (c.every((x) => /^:?-+:?$/.test(x))) continue;
      // Al partir por la comilla invertida, los trozos impares (si tienen cierre) van entre comillas y los pares
      // fuera. Los corchetes solo se miran fuera; lo que cae dentro de un marcador [...] no cuenta. Lo que queda
      // fuera de comillas y marcadores se parte por comas: cada trozo sin espacios, paréntesis ni comillas
      // por dentro es una ruta más.
      const partes = (c[col] || '').replace(/<!--[\s\S]*?-->/g, ' ').split('`');
      const tick = [];
      let fuera = '';
      let prof = 0;
      partes.forEach((p, j) => {
        if (j % 2 === 1 && j < partes.length - 1) { if (!prof) tick.push(p); fuera += ','; return; }
        for (const ch of p) {
          if (ch === '[') { prof++; continue; }
          if (ch === ']' && prof) { prof--; if (!prof) fuera += ' '; continue; }
          if (!prof) fuera += ch;
        }
      });
      const sueltas = fuera.split(/[,;]/).filter((x) => /^[^\s()«»"']*$/.test(x.trim()));
      for (const trozo of [...tick, ...sueltas]) {
        const r = trozo.trim().replace(/\\/g, '/').replace(/^(?:\.?\/)+/, '');
        if (r && !/^(—|–|-|ninguna?|nada)$/i.test(r) && !escribeEn.includes(r)) escribeEn.push(r);
      }
    }
  }
  return { estado, veredicto, escribeEn };
}
function cubre(patron, ruta) {
  const norm = (x) => String(x || '').replace(/\\/g, '/').replace(/^(?:\.?\/)+/, '');
  const p = norm(patron);
  const r = norm(ruta);
  if (p.includes('*')) {
    const re = p.split(/(\*\*\/?|\*)/).map((s) => (s.startsWith('**') ? '(?:.*/)?' + (s === '**' ? '.*' : '') : s === '*' ? '[^/]*' : s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))).join('');
    return new RegExp(`^${re}(?:/.*)?$`).test(r);
  }
  const base = p.replace(/\/+$/, '');
  return r === base || r.startsWith(base + '/');
}
// ---8<--- fin del contrato de la unidad ---8<---
export { leerContrato, cubre };

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');

// Id y slug de la unidad por la ruta de su SPEC (features/F-NN-<slug>/SPEC.md o 03_TAREAS/T-NN_<nombre>.md),
// para el mensaje de merge que prescribe /orquesta. Si la ruta no sigue el patrón, null.
export function unidadDelSpec(ruta) {
  const partes = norm(ruta).split('/');
  const fichero = partes[partes.length - 1] || '';
  const carpeta = partes[partes.length - 2] || '';
  const m = /^(F-\d+)-(.+)$/i.exec(carpeta) || /^(T-\d+)_(.+)\.md$/i.exec(fichero);
  return m ? { id: m[1].toUpperCase(), slug: m[2] } : null;
}

// ---------------------------------------------------------------- comprobación

export function comprobar({ spec, plan, feature, rama, base, cwd = process.cwd() }) {
  if ((!spec && !plan) || !rama) throw new ErrorUso('Faltan --spec (o --plan y --feature) y --rama.');
  if (spec && plan) throw new ErrorUso('Usa --spec o --plan, no los dos.');
  if (plan && !feature) throw new ErrorUso('Con --plan hace falta --feature <id|name>.');
  // Lo que la puerta necesita de la unidad: estado, el sha que juzgó qa, sus rutas y cómo se llama.
  let texto = '';
  let specAbs = '';
  let delPlan = null;
  if (plan) {
    const planAbs = resolve(cwd, plan);
    if (!existsSync(planAbs) || !statSync(planAbs).isFile()) throw new ErrorUso(`No encuentro el plan: ${plan}`);
    let datos;
    try { datos = JSON.parse(readFileSync(planAbs, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { throw new ErrorUso(`${plan} no es JSON válido: ${e.message}`); }
    const f = Array.isArray(datos?.features) ? datos.features.find((x) => String(x?.id) === String(feature).replace(/^#/, '') || x?.name === feature) : null;
    if (!f) throw new ErrorUso(`No hay ninguna feature «${feature}» en ${plan}`);
    delPlan = { f, invalido: validarPlan(datos, { cubre }).errores };
  } else {
    specAbs = resolve(cwd, spec);
    if (!existsSync(specAbs) || !statSync(specAbs).isFile()) throw new ErrorUso(`No encuentro el SPEC: ${spec}`);
    texto = readFileSync(specAbs, 'utf8');
  }

  // La base es la rama de integración: se lanza desde una rama orquesta/*.
  gitOrUso(cwd, ['rev-parse', '--git-dir'], `No es un repo git: ${cwd}`);
  const actual = git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const ramaBase = actual.ok ? actual.out.trim() : '';
  const desdeProtegida = PROTEGIDAS.includes(ramaBase);
  if (!desdeProtegida && !/^orquesta\//.test(ramaBase)) {
    throw new ErrorUso(`La puerta se lanza desde la rama de integración (orquesta/*) y la rama actual es ${ramaBase ? `\`${ramaBase}\`` : 'un HEAD suelto'}: cambia a la rama de integración del objetivo.`);
  }

  // ¿--rama es un worktree (carpeta) o un nombre de rama?
  const ramaAbs = resolve(cwd, rama);
  const esCarpeta = existsSync(ramaAbs) && statSync(ramaAbs).isDirectory();
  const repo = esCarpeta ? ramaAbs : cwd;
  gitOrUso(repo, ['rev-parse', '--git-dir'], `No es un repo git: ${repo}`);
  const ref = esCarpeta ? 'HEAD' : rama;
  const head = gitOrUso(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], `No resuelvo la rama: ${rama}`).toLowerCase();

  const baseRef = base ?? gitOrUso(cwd, ['rev-parse', 'HEAD'], 'No resuelvo el HEAD del repo actual como base; pasa --base.');
  const baseSha = gitOrUso(repo, ['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`], `No resuelvo la base: ${baseRef}`);

  const motivos = [];
  const avisos = [];
  const hechos = [];
  if (desdeProtegida) motivos.push(`La rama actual es \`${ramaBase}\`, protegida: a ella solo se llega por PR. Lanza la puerta desde la rama de integración orquesta/*.`);

  // (a) Estado
  let estado, veredicto, rutas;
  if (delPlan) {
    // Un plan inválido no pasa: lo que la puerta lee de él no es de fiar.
    if (delPlan.invalido.length) motivos.push(`El plan no es válido (node features.mjs validar):\n      ${delPlan.invalido.join('\n      ')}`);
    const f = delPlan.f;
    estado = f.status === 'approved' ? 'aprobada' : f.status;
    veredicto = f.status === 'approved' && f.sha ? { tipo: 'APROBADA', sha: String(f.sha).toLowerCase(), version: null, fecha: 'según el plan' } : null;
    rutas = Array.isArray(f.files) ? f.files.map((x) => norm(String(x))) : [];
  } else ({ estado, veredicto, escribeEn: rutas } = leerContrato(texto));
  if (estado === 'aprobada') hechos.push(delPlan ? 'Estado `approved`.' : 'Estado `aprobada`.');
  else motivos.push(delPlan ? `Estado \`${delPlan.f.status}\`: tiene que ser \`approved\`.` : estado ? `Estado \`${estado}\`: tiene que ser \`aprobada\`.` : 'El SPEC no tiene línea «Estado:».');

  // (b) Veredicto y sha
  if (!veredicto) { if (!delPlan) motivos.push('El SPEC no tiene línea «Veredicto QA:».'); }
  else if (!veredicto.tipo) motivos.push(`Veredicto QA ilegible o vacío («${veredicto.crudo}»): se espera «APROBADA · commit <sha de 7 a 40> · <AAAA-MM-DD>».`);
  else if (veredicto.tipo !== 'APROBADA') motivos.push(`Veredicto QA ${veredicto.tipo} sobre ${veredicto.sha || veredicto.version}: no se mergea.`);
  else if (!veredicto.sha) motivos.push(`El veredicto aprueba la versión ${veredicto.version}, no un commit: la puerta necesita el sha que juzgó qa.`);
  else if (!head.startsWith(veredicto.sha)) motivos.push(`QA aprobó ${veredicto.sha}, pero el HEAD de ${rama} es ${head.slice(0, 12)}: lo que se mergearía no es lo que se juzgó. Vuelve a \`en revisión\`.`);
  else hechos.push(`Veredicto QA APROBADA sobre ${veredicto.sha} = HEAD (${veredicto.fecha}).`);

  // (c) Rutas exclusivas
  const diff = git(repo, ['-c', 'core.quotepath=false', 'diff', '--name-only', '-z', '--no-renames', `${baseSha}...${head}`, '--']);
  if (!diff.ok) throw new ErrorUso(`No puedo calcular el diff ${baseRef}...${rama} (${diff.err})`);
  const cambiados = diff.out.split('\0').filter(Boolean);
  if (cambiados.length === 0) motivos.push(`La rama no cambia nada frente a la base ${baseSha.slice(0, 7)}: no hay nada que mergear. Lo más probable es que la base sea la equivocada (pasa --base con la rama de integración).`);
  else if (rutas.length === 0) motivos.push('No puedo leer las rutas «Escribe en (exclusivo)» de la tabla «## Agentes» (no hay tabla, la celda está vacía o solo trae el marcador de plantilla `[rutas]`): sin alcance declarado no se mergea. Escribe las rutas reales, entre comillas invertidas o separadas por comas.');
  else {
    const fuera = cambiados.filter((f) => !rutas.some((p) => cubre(p, f)));
    if (fuera.length) motivos.push(`El diff toca rutas fuera de «Escribe en (exclusivo)» (${rutas.join(', ')}):\n      ${fuera.join('\n      ')}`);
    else hechos.push(`${cambiados.length} fichero(s) cambiados, todos dentro de sus rutas exclusivas.`);

    // (e) El merge contiene lo aprobado, en las rutas de la unidad.
    const mt = git(repo, ['merge-tree', '--write-tree', '--no-messages', baseSha, head]);
    const arbolMerge = /^[0-9a-f]{40,64}$/i.exec((mt.out.split(/\r?\n/)[0] || '').trim());
    if (!arbolMerge || (mt.status !== 0 && mt.status !== 1)) {
      avisos.push(`No puedo calcular el resultado del merge con \`git merge-tree --write-tree\` (hace falta git 2.38 o posterior${mt.err ? `: ${mt.err.split(/\r?\n/)[0]}` : ''}): no compruebo que el merge contenga lo aprobado.`);
    } else if (mt.status === 1) {
      motivos.push(`El merge de ${head.slice(0, 7)} sobre la base ${baseSha.slice(0, 7)} da conflictos: recrea la rama desde la punta de la integración, reaplica el trabajo y vuelve a qa.`);
    } else {
      const dif = git(repo, ['-c', 'core.quotepath=false', 'diff', '--name-only', '-z', '--no-renames', head, arbolMerge[0], '--']);
      if (!dif.ok) avisos.push(`No puedo comparar el resultado del merge con el HEAD aprobado (${dif.err}).`);
      else {
        const distintos = dif.out.split('\0').filter(Boolean).filter((f) => rutas.some((p) => cubre(p, f)));
        if (distintos.length) motivos.push(`El resultado del merge no deja lo aprobado en las rutas de la unidad (¿se revirtió un merge anterior de esta unidad?). Recrea la rama desde la punta de la integración, reaplica el trabajo (p. ej. \`git revert <revert>\`) y vuelve a qa:\n      ${distintos.join('\n      ')}`);
        else hechos.push('El resultado del merge deja en sus rutas lo mismo que el HEAD aprobado.');
      }
    }
  }

  // (d) Árbol limpio
  let arbol = esCarpeta ? ramaAbs : null;
  if (!arbol) {
    const wt = git(cwd, ['worktree', 'list', '--porcelain']);
    if (wt.ok) {
      let actual = null;
      for (const l of wt.out.split(/\r?\n/)) {
        if (l.startsWith('worktree ')) actual = l.slice(9);
        else if (l === `branch refs/heads/${rama}`) { arbol = actual; break; }
      }
    }
  }
  if (arbol) {
    const st = git(arbol, ['-c', 'core.quotepath=false', 'status', '--porcelain']);
    if (!st.ok) motivos.push(`No puedo leer el estado del worktree ${arbol}.`);
    else if (st.out.trim()) motivos.push(`El worktree ${arbol} tiene cambios sin commitear:\n      ${st.out.trim().split(/\r?\n/).join('\n      ')}`);
    else hechos.push('Árbol limpio.');
  } else hechos.push('La rama no está sacada en ningún worktree: no hay árbol que ensuciar.');

  return { pasa: motivos.length === 0, head, baseSha, motivos, avisos, hechos, unidad: delPlan ? { id: `F-${String(delPlan.f.id).padStart(2, '0')}`, slug: delPlan.f.name } : unidadDelSpec(specAbs) };
}

// ---------------------------------------------------------------- CLI

function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (e) { console.error(`${e.message}\n${USO}`); return 2; }
  if (args.ayuda) { console.log(USO); return 0; }
  let r;
  try { r = comprobar(args); } catch (e) {
    if (e instanceof ErrorUso) { console.error(`${e.message}\n${USO}`); return 2; }
    throw e;
  }
  for (const h of r.hechos) console.log(`[ok]    ${h}`);
  for (const a of r.avisos) console.log(`[aviso] ${a}`);
  for (const m of r.motivos) console.log(`[NO]    ${m}`);
  if (r.pasa) {
    const u = r.unidad || { id: '<F-NN>', slug: '<slug>' };
    console.log(`\nPASA. Sha a mergear: ${r.head}`);
    console.log(`  git merge --no-ff ${r.head} -m "chore(orquesta): merge ${u.id} ${u.slug} (qa ${r.head.slice(0, 7)})"`);
    return 0;
  }
  console.log(`\nNO PASA (${r.motivos.length} motivo${r.motivos.length === 1 ? '' : 's'}).`);
  return 1;
}

const esCLI = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (esCLI) process.exitCode = main(process.argv.slice(2));
