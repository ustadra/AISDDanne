#!/usr/bin/env node
// features.mjs — la CLI del supervisor de /orquesta sobre feature_list.json. Sin dependencias, sin red.
//
//   node features.mjs validar    [--plan feature_list.json]
//   node features.mjs listos     [--plan …]                       las pendientes que ya pueden arrancar
//   node features.mjs entrada    <id|name> [--qa] [--plan …]      la entrada que recibe un agente (--qa: la de qa)
//   node features.mjs marcar     <id|name> <estado> [--sha <sha>] [--motivo "…"] [--plan …]
//   node features.mjs convertir  [--raiz .] [--salida feature_list.json] [--proyecto <slug>]
//
// Solo el supervisor escribe el plan, y lo hace con `marcar`: valida la transición y el plan entero antes de
// escribir, escribe de golpe (fichero temporal y rename) y añade la línea a progress/history.md. Ningún agente
// edita el JSON a mano. `convertir` pasa las features en markdown de siempre (features/F-NN-*/SPEC.md) a un plan.
//
// Salida: exit 0 correcto · exit 1 el plan o la transición no valen (motivos) · exit 2 error de uso.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cubre, leerContrato } from './puerta.mjs';
import { ErrorPlan, entradaDe, lineaHistoria, listos, transicion, validarPlan } from './plan.mjs';

const USO = 'Uso: node features.mjs validar | listos | entrada <id|name> [--qa] | marcar <id|name> <estado> [--sha <sha>] [--motivo "…"] | convertir [--raiz .] [--salida feature_list.json] [--proyecto <slug>]  (con --plan <ruta> para elegir el plan)';

class ErrorUso extends Error {}

function parseArgs(argv) {
  const out = { pos: [], plan: 'feature_list.json', qa: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { out.ayuda = true; continue; }
    if (a === '--qa') { out.qa = true; continue; }
    const m = /^--(plan|sha|motivo|raiz|salida|proyecto)(?:=(.*))?$/.exec(a);
    if (m) {
      const v = m[2] ?? argv[++i];
      if (v == null || v === '' || (m[2] == null && v.startsWith('--'))) throw new ErrorUso(`Falta el valor de --${m[1]}`);
      out[m[1]] = v;
    } else if (a.startsWith('--')) throw new ErrorUso(`Argumento desconocido: ${a}`);
    else out.pos.push(a);
  }
  return out;
}

export function leerPlan(ruta) {
  let texto;
  try { texto = readFileSync(ruta, 'utf8').replace(/^﻿/, ''); } catch { throw new ErrorUso(`No puedo leer el plan: ${ruta}`); }
  try { return JSON.parse(texto); } catch (e) { throw new ErrorUso(`${ruta} no es JSON válido: ${e.message}`); }
}

// De golpe: quien lea el plan en medio no ve un JSON a medias.
export function escribirPlan(ruta, plan) {
  const tmp = `${ruta}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(plan, null, 2)}\n`);
  renameSync(tmp, ruta);
}

export function apuntarHistoria(ruta, linea) {
  const dir = join(dirname(resolve(ruta)), 'progress');
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'history.md'), `${linea}\n`);
}

// ---------------------------------------------------------------- convertir

const ESTADO_MD = {
  pendiente: 'pending', 'en curso': 'in_progress', 'en revisión': 'in_qa', 'cambios pedidos': 'changes_requested',
  aprobada: 'approved', hecha: 'done', bloqueada: 'blocked',
};

function seccion(texto, titulo) {
  const re = new RegExp(`^##[ \\t]+${titulo}[^\\n]*\\n([\\s\\S]*?)(?=^##[ \\t]|(?![\\s\\S]))`, 'im');
  return re.exec(texto)?.[1] ?? '';
}

// Una SPEC.md → una feature del plan, y lo que no se pudo sacar de ella (para que la persona lo revise).
export function featureDeSpec(texto, carpeta, id) {
  const avisos = [];
  const c = leerContrato(texto);
  const m = /^F-(\d+)-?(.*)$/i.exec(carpeta);
  const slug = (m?.[2] || carpeta).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || `feature-${id}`;
  const titulo = (/^#[ \t]+F-\d+[ \t]*[·:—-][ \t]*(.+)$/m.exec(texto) || [])[1]?.trim();
  const oleada = (/^Oleada:[ \t]*(\d+)/m.exec(texto) || [])[1];
  const objetivo = (/^Objetivo:[ \t]*(O-\d+)/m.exec(texto) || [])[1];
  let status = ESTADO_MD[c.estado] ?? 'pending';
  if (!ESTADO_MD[c.estado]) avisos.push(`#${id}: estado «${c.estado ?? 'sin estado'}» desconocido, queda pending`);
  let sha = c.veredicto?.sha ?? null;
  const rondas = [...texto.matchAll(/^###[ \t]*Ronda[ \t]+\d+[^\n]*?commit[ \t]+([0-9a-f]{7,40})[^\n]*\n[\s\S]*?\*\*Veredicto:?\*\*:?[ \t]*(APROBADA|CAMBIOS PEDIDOS)/gim)];
  const intentos = Math.min(3, rondas.filter((r) => r[2].toUpperCase() === 'CAMBIOS PEDIDOS').length);
  if (!sha && rondas.length) sha = rondas[rondas.length - 1][1].toLowerCase();
  if (['in_qa', 'approved', 'done', 'changes_requested'].includes(status) && !sha) {
    avisos.push(`#${id}: está ${status} pero la SPEC no trae el sha del commit; queda in_progress (vuelve a entregarla para que tenga uno)`);
    status = 'in_progress';
  }
  if (status === 'pending') sha = null;
  const criterios = [...seccion(texto, 'Criterio de aceptación').matchAll(/^[-*][ \t]*(?:\[[ xX]\][ \t]*)?(C\d+)[ \t]*[·:.-][ \t]*(.+)$/gm)].map((x) => ({ criterio: `${x[1]} · ${x[2].trim()}`.slice(0, 300), verify: null }));
  if (!criterios.length) { avisos.push(`#${id}: sin criterios «Cn» en la SPEC: pon al menos uno`); criterios.push({ criterio: 'Pendiente de definir el criterio de aceptación', verify: null }); }
  let agente = null;
  for (const l of seccion(texto, 'Agentes').split(/\r?\n/)) {
    const nombre = l.split('|')[1]?.trim().replace(/`/g, '');
    if (l.trim().startsWith('|') && nombre && !/^(agente|:?-+:?)$/i.test(nombre) && !nombre.startsWith('[')) { agente = nombre; break; }
  }
  if (!c.escribeEn.length) avisos.push(`#${id}: la tabla «Agentes» no trae rutas «Escribe en (exclusivo)»: pon las de la feature`);
  const f = {
    id, name: slug, title: (titulo && !titulo.startsWith('[') ? titulo : slug).slice(0, 80),
    depends_on: [], files: c.escribeEn.length ? c.escribeEn : ['PENDIENTE/'], acceptance: criterios,
    ...(agente ? { agente } : {}), ...(oleada != null ? { oleada: Number(oleada) } : {}), ...(objetivo ? { objetivo } : {}),
    status, intentos: status === 'pending' ? 0 : intentos, sha,
  };
  if (status === 'blocked') f.motivo_bloqueo = 'Bloqueada en la SPEC: revisa por qué';
  return { feature: f, avisos };
}

export function convertir({ raiz = '.', proyecto = null } = {}) {
  const fdir = join(resolve(raiz), 'features');
  if (!existsSync(fdir)) throw new ErrorUso(`No hay carpeta features/ en ${resolve(raiz)}`);
  const carpetas = readdirSync(fdir, { withFileTypes: true }).filter((d) => d.isDirectory() && /^F-\d+/i.test(d.name) && existsSync(join(fdir, d.name, 'SPEC.md'))).map((d) => d.name).sort();
  if (!carpetas.length) throw new ErrorUso('No hay ninguna features/F-NN-*/SPEC.md que convertir');
  const features = [];
  const avisos = ['las dependencias (depends_on) no constan en la SPEC: quedan vacías, escríbelas a mano'];
  for (const d of carpetas) {
    const id = Number((/^F-(\d+)/i.exec(d) || [])[1]);
    const r = featureDeSpec(readFileSync(join(fdir, d, 'SPEC.md'), 'utf8').replace(/^﻿/, ''), d, id);
    features.push(r.feature);
    avisos.push(...r.avisos);
  }
  let nombre = proyecto;
  if (!nombre) {
    const t = existsSync(join(fdir, 'REGISTRO.md')) ? (/^#[ \t]+Registro de features[ \t]*[—-][ \t]*(.+)$/m.exec(readFileSync(join(fdir, 'REGISTRO.md'), 'utf8')) || [])[1]?.trim() : null;
    nombre = (t && !t.startsWith('[') ? t : basename(resolve(raiz))).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'proyecto';
  }
  return { plan: { proyecto: nombre, features }, avisos };
}

// ---------------------------------------------------------------- CLI

export function main(argv, { cwd = process.cwd(), salida = (t) => console.log(t), error = (t) => console.error(t) } = {}) {
  let a;
  try { a = parseArgs(argv); } catch (e) { error(`${e.message}\n${USO}`); return 2; }
  if (a.ayuda || a.pos.length === 0) { salida(USO); return a.ayuda ? 0 : 2; }
  const [cmd, ...resto] = a.pos;
  const ruta = resolve(cwd, a.plan);
  try {
    if (cmd === 'convertir') {
      const { plan, avisos } = convertir({ raiz: resolve(cwd, a.raiz ?? '.'), proyecto: a.proyecto ?? null });
      const destino = resolve(cwd, a.salida ?? 'feature_list.json');
      if (existsSync(destino)) throw new ErrorUso(`${destino} ya existe: no lo piso (bórralo o usa --salida)`);
      const { errores } = validarPlan(plan, { cubre });
      escribirPlan(destino, plan);
      for (const m of avisos) salida(`AVISO  ${m}`);
      for (const m of errores) salida(`REVISA ${m}`);
      salida(`${plan.features.length} features convertidas en ${destino}${errores.length ? `; ${errores.length} cosas por revisar a mano antes de usarlo` : ''}`);
      return 0;
    }
    const plan = leerPlan(ruta);
    const v = validarPlan(plan, { cubre });
    if (cmd === 'validar') {
      for (const m of v.avisos) salida(`AVISO  ${m}`);
      for (const m of v.errores) error(`ERROR  ${m}`);
      if (v.errores.length) return 1;
      salida(`feature_list.json válido (${plan.features.length} features)`);
      return 0;
    }
    if (v.errores.length) { for (const m of v.errores) error(`ERROR  ${m}`); error('El plan no es válido: arréglalo antes de usarlo (node features.mjs validar).'); return 1; }
    if (cmd === 'listos') {
      const l = listos(plan, { cubre });
      salida(l.length ? l.map((f) => `#${f.id} ${f.name}${f.agente ? ` (${f.agente})` : ''}`).join('\n') : 'ninguna lista para arrancar');
      return 0;
    }
    if (cmd === 'entrada') {
      if (resto.length !== 1) throw new ErrorUso('entrada necesita una feature: <id|name>');
      salida(JSON.stringify(entradaDe(plan, resto[0], { paraQa: a.qa }), null, 2));
      return 0;
    }
    if (cmd === 'marcar') {
      if (resto.length !== 2) throw new ErrorUso('marcar necesita <id|name> <estado>');
      const { plan: nuevo, evento } = transicion(plan, resto[0], resto[1], { sha: a.sha ?? null, motivo: a.motivo ?? null });
      const despues = validarPlan(nuevo, { cubre });
      if (despues.errores.length) { for (const m of despues.errores) error(`ERROR  ${m}`); error('La transición dejaría el plan inválido: no escribo nada.'); return 1; }
      escribirPlan(ruta, nuevo);
      const linea = lineaHistoria(evento);
      apuntarHistoria(ruta, linea);
      salida(linea);
      return 0;
    }
    throw new ErrorUso(`Orden desconocida: ${cmd}`);
  } catch (e) {
    if (e instanceof ErrorUso) { error(`${e.message}\n${USO}`); return 2; }
    if (e instanceof ErrorPlan) { error(`NO  ${e.message}`); return 1; }
    throw e;
  }
}

const esCLI = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (esCLI) process.exitCode = main(process.argv.slice(2));
