// plan.mjs — el plan de /orquesta en JSON (feature_list.json): su forma, sus reglas y sus transiciones.
// Sin dependencias, sin disco y sin git: lo importan features.mjs (la CLI del supervisor) y puerta.mjs (la puerta
// de merge). Es la única fuente de las reglas del plan: nadie más las repite.
//
// Un plan es { proyecto, features: [...] }. Cada feature, con los campos que ejecuta el flujo:
//   id (entero ≥ 1) · name (slug; da nombre a orquesta/<name>) · title · depends_on [ids] · files [rutas o globs
//   que solo ella escribe] · acceptance [{ criterio, verify }] (verify es un comando o null si es manual) ·
//   status · intentos (vueltas de «cambios pedidos», de 0 a 3) · sha (el commit que se entrega o se juzga)
// y, opcionales: description, agente, oleada, objetivo, fuera_de_alcance, notas, motivo_bloqueo.
//
// Estados: pending → in_progress → in_qa → approved → done; changes_requested (qa pidió cambios) y blocked.
//   done = mergeada en la integración. La persona la lleva después a su rama con /pr.

export const ESTADOS = ['pending', 'in_progress', 'changes_requested', 'in_qa', 'approved', 'done', 'blocked'];
export const MAX_VUELTAS = 3;
export const TOPES = { constructores: 3, qa: 2 };

const CONSTRUYENDO = ['in_progress', 'changes_requested'];
const EN_VUELO = ['in_progress', 'changes_requested', 'in_qa', 'approved'];
const CON_SHA = ['changes_requested', 'in_qa', 'approved', 'done'];
const RE_NAME = /^[a-z0-9][a-z0-9_-]*$/;
const RE_SHA = /^[0-9a-f]{7,40}$/;

// Rutas que ninguna feature puede declarar suyas: son del supervisor.
export const RESERVADAS = ['feature_list.json', 'progress/history.md', 'progress/current.md'];

export class ErrorPlan extends Error {}

const esTexto = (x, min = 1, max = Infinity) => typeof x === 'string' && x.trim().length >= min && x.length <= max;
const esEntero = (x, min) => Number.isInteger(x) && x >= min;

// `cubre(patron, ruta)` es la de la puerta (carpeta, glob con * y **); sin ella no se comprueban rutas reservadas
// ni solapes entre features que van a la vez.
export function validarPlan(plan, { cubre = null } = {}) {
  const errores = [];
  const avisos = [];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return { errores: ['el plan no es un objeto'], avisos };
  if (!esTexto(plan.proyecto) || !RE_NAME.test(plan.proyecto)) errores.push('«proyecto» tiene que ser un slug (minúsculas, números, guiones)');
  if (!Array.isArray(plan.features) || plan.features.length === 0) return { errores: [...errores, '«features» tiene que ser una lista con al menos una feature'], avisos };

  const porId = new Map();
  const nombres = new Set();
  for (const [i, f] of plan.features.entries()) {
    const donde = `features[${i}]${f && f.id != null ? ` (#${f.id})` : ''}`;
    if (!f || typeof f !== 'object' || Array.isArray(f)) { errores.push(`${donde}: no es un objeto`); continue; }
    const e = (m) => errores.push(`${donde}: ${m}`);
    if (!esEntero(f.id, 1)) e('«id» tiene que ser un entero ≥ 1');
    else if (porId.has(f.id)) e(`el id ${f.id} está repetido`);
    else porId.set(f.id, f);
    if (!esTexto(f.name) || !RE_NAME.test(f.name)) e('«name» tiene que ser un slug (minúsculas, números, - y _)');
    else if (nombres.has(f.name)) e(`el name «${f.name}» está repetido`);
    else nombres.add(f.name);
    if (f.name === plan.proyecto) e('«name» no puede llamarse como el proyecto: orquesta/<name> sería la rama de integración');
    if (!esTexto(f.title, 3, 80)) e('«title» tiene que tener entre 3 y 80 caracteres');
    if (f.description != null && !esTexto(f.description, 1, 400)) e('«description» tiene que ser un texto de hasta 400 caracteres');
    if (f.notas != null && !esTexto(f.notas, 1, 500)) e('«notas» tiene hasta 500 caracteres: si no caben, la feature es demasiado grande, pártela');
    if (f.agente != null && !esTexto(f.agente)) e('«agente» tiene que ser un texto');
    if (f.oleada != null && !esEntero(f.oleada, 0)) e('«oleada» tiene que ser un entero ≥ 0');
    if (!Array.isArray(f.depends_on) || f.depends_on.some((d) => !esEntero(d, 1)) || new Set(f.depends_on).size !== f.depends_on.length) e('«depends_on» tiene que ser una lista de ids sin repetir');
    if (!Array.isArray(f.files) || f.files.length === 0 || f.files.some((p) => !esTexto(p) || /^([/\\]|[A-Za-z]:)/.test(p) || p.split(/[\\/]/).includes('..'))) e('«files» tiene que ser una lista no vacía de rutas relativas (sin / inicial ni ..)');
    else if (cubre) {
      for (const p of f.files) for (const r of RESERVADAS) if (cubre(p, r)) e(`«files» incluye «${p}», que alcanza ${r}: esa ruta es del supervisor`);
    }
    if (!Array.isArray(f.acceptance) || f.acceptance.length === 0) e('«acceptance» tiene que tener al menos un criterio');
    else {
      for (const [j, a] of f.acceptance.entries()) {
        if (!a || !esTexto(a.criterio, 5)) e(`acceptance[${j}]: «criterio» tiene que ser un texto de al menos 5 caracteres`);
        if (!a || !(a.verify === null || esTexto(a.verify))) e(`acceptance[${j}]: «verify» tiene que ser un comando o null (criterio manual)`);
      }
    }
    if (!ESTADOS.includes(f.status)) e(`«status» tiene que ser uno de ${ESTADOS.join(', ')}`);
    if (!Number.isInteger(f.intentos) || f.intentos < 0 || f.intentos > MAX_VUELTAS) e(`«intentos» tiene que ser un entero de 0 a ${MAX_VUELTAS}`);
    if (!(f.sha === null || (typeof f.sha === 'string' && RE_SHA.test(f.sha)))) e('«sha» tiene que ser null o un commit de 7 a 40 caracteres hexadecimales');
    if (CON_SHA.includes(f.status) && f.sha == null) e(`en ${f.status} hace falta un sha: es el commit que juzga qa y con el que compara la puerta`);
    if (f.status === 'pending' && (f.intentos !== 0 || f.sha !== null)) e('una feature pending tiene intentos 0 y sha null');
    if (f.status === 'blocked' && !esTexto(f.motivo_bloqueo, 5)) e('una feature blocked necesita «motivo_bloqueo»');
    if (f.status !== 'blocked' && f.motivo_bloqueo != null) e('«motivo_bloqueo» solo vale en una feature blocked');
    if (f.status !== 'blocked' && f.intentos >= MAX_VUELTAS && f.status !== 'done') e(`con ${MAX_VUELTAS} vueltas la feature se bloquea: a la tercera decide la persona`);
  }

  for (const f of plan.features) {
    if (!porId.has(f?.id) || !Array.isArray(f.depends_on)) continue;
    for (const d of f.depends_on) {
      if (d === f.id) errores.push(`#${f.id} depende de sí misma`);
      else if (!porId.has(d)) errores.push(`#${f.id} depende de #${d}, que no existe`);
    }
  }
  // Ciclos.
  const color = new Map();
  const visitar = (id, camino) => {
    if (color.get(id) === 2) return;
    if (color.get(id) === 1) { errores.push(`ciclo en depends_on: ${[...camino.slice(camino.indexOf(id)), id].map((x) => '#' + x).join(' → ')}`); return; }
    color.set(id, 1);
    for (const d of porId.get(id)?.depends_on ?? []) if (porId.has(d) && d !== id) visitar(d, [...camino, id]);
    color.set(id, 2);
  };
  for (const id of porId.keys()) visitar(id, []);
  // Nada arranca ni se entrega sin lo que lee.
  for (const f of porId.values()) {
    if (![...EN_VUELO, 'done'].includes(f.status) || !Array.isArray(f.depends_on)) continue;
    for (const d of f.depends_on) {
      const dep = porId.get(d);
      if (dep && dep.status !== 'done') errores.push(`#${f.id} está ${f.status} pero su dependencia #${d} está ${dep.status}`);
    }
  }
  // Dos features a la vez no pueden escribir en lo mismo: es un error, no un aviso.
  if (cubre) {
    const vuelo = [...porId.values()].filter((f) => EN_VUELO.includes(f.status) && Array.isArray(f.files));
    for (let i = 0; i < vuelo.length; i++) {
      for (let j = i + 1; j < vuelo.length; j++) {
        const comunes = vuelo[i].files.filter((a) => vuelo[j].files.some((b) => cubre(a, b) || cubre(b, a)));
        if (comunes.length) errores.push(`#${vuelo[i].id} y #${vuelo[j].id} van a la vez y se pisan en: ${comunes.join(', ')}`);
      }
    }
  }
  const construyendo = [...porId.values()].filter((f) => CONSTRUYENDO.includes(f.status)).length;
  const enQa = [...porId.values()].filter((f) => f.status === 'in_qa').length;
  if (construyendo > TOPES.constructores) avisos.push(`${construyendo} features con constructor activo (tope ${TOPES.constructores})`);
  if (enQa > TOPES.qa) avisos.push(`${enQa} features en qa (tope ${TOPES.qa})`);
  return { errores, avisos };
}

export function buscar(plan, ref) {
  const f = plan.features.find((x) => String(x.id) === String(ref).replace(/^#/, '') || x.name === ref);
  if (!f) throw new ErrorPlan(`no hay ninguna feature «${ref}» en el plan`);
  return f;
}

// Lo que recibe cada agente: solo su entrada. A qa, además, sin lo que no tiene que ver (notas, vueltas y estado).
export function entradaDe(plan, ref, { paraQa = false } = {}) {
  const f = structuredClone(buscar(plan, ref));
  if (paraQa) for (const k of ['notas', 'intentos', 'status', 'motivo_bloqueo', 'fuera_de_alcance']) delete f[k];
  return f;
}

// Las pendientes que ya pueden arrancar: lo que leen está hecho, no se pisan con lo que va en vuelo y caben en los topes.
export function listos(plan, { cubre = null } = {}) {
  const porId = new Map(plan.features.map((f) => [f.id, f]));
  const huecos = TOPES.constructores - plan.features.filter((f) => CONSTRUYENDO.includes(f.status)).length;
  const vuelo = plan.features.filter((f) => EN_VUELO.includes(f.status));
  const elegidas = [];
  for (const f of plan.features) {
    if (elegidas.length >= huecos) break;
    if (f.status !== 'pending' || !f.depends_on.every((d) => porId.get(d)?.status === 'done')) continue;
    const otras = [...vuelo, ...elegidas];
    if (cubre && otras.some((o) => f.files.some((a) => o.files.some((b) => cubre(a, b) || cubre(b, a))))) continue;
    elegidas.push(f);
  }
  return elegidas;
}

const PERMITIDAS = {
  pending: ['in_progress', 'blocked'],
  in_progress: ['in_qa', 'blocked'],
  changes_requested: ['in_qa', 'blocked'],
  in_qa: ['approved', 'changes_requested', 'blocked'],
  approved: ['done', 'in_qa', 'changes_requested', 'blocked'],
  done: [],
  blocked: ['in_progress'],
};

// Aplica una transición y devuelve el plan nuevo y el evento para el registro. No toca el plan que recibe.
// Cualquier vuelta al constructor (qa pide cambios, la puerta rechaza, hay conflicto o un revert) entra por
// `changes_requested` y cuenta una vuelta; a la tercera la feature pasa a blocked.
export function transicion(plan, ref, a, { sha = null, motivo = null } = {}) {
  if (!ESTADOS.includes(a)) throw new ErrorPlan(`estado desconocido «${a}»`);
  const nuevo = structuredClone(plan);
  const f = buscar(nuevo, ref);
  const de = f.status;
  if (!PERMITIDAS[de].includes(a)) throw new ErrorPlan(`#${f.id} ${f.name}: de ${de} no se puede pasar a ${a} (desde ahí: ${PERMITIDAS[de].join(', ') || 'nada, está terminada'})`);
  let detalle = '';
  if (a === 'in_progress') {
    const sinHacer = f.depends_on.filter((d) => nuevo.features.find((x) => x.id === d)?.status !== 'done');
    if (sinHacer.length) throw new ErrorPlan(`#${f.id} ${f.name}: no puede arrancar, falta lo que lee (${sinHacer.map((d) => '#' + d).join(', ')})`);
    if (nuevo.features.filter((x) => CONSTRUYENDO.includes(x.status)).length >= TOPES.constructores) throw new ErrorPlan(`ya hay ${TOPES.constructores} constructores activos`);
    f.sha = null;
    if (de === 'blocked') { f.intentos = 0; delete f.motivo_bloqueo; detalle = 'la persona la desbloquea'; }
  } else if (a === 'in_qa') {
    const s = sha ? String(sha).toLowerCase() : null;
    if (!s || !RE_SHA.test(s)) throw new ErrorPlan('pasar a in_qa necesita --sha: el commit que se entrega (7 a 40 caracteres hexadecimales)');
    if (nuevo.features.filter((x) => x.status === 'in_qa').length >= TOPES.qa) throw new ErrorPlan(`ya hay ${TOPES.qa} features en qa`);
    f.sha = s;
    detalle = `qa empieza la ronda ${f.intentos + 1}`;
  } else if (a === 'approved') {
    detalle = `ronda ${f.intentos + 1}`;
  } else if (a === 'changes_requested') {
    f.intentos += 1;
    detalle = `${motivo ? motivo + ' · ' : ''}vuelta ${f.intentos} de ${MAX_VUELTAS}`;
    if (f.intentos >= MAX_VUELTAS) {
      f.status = 'blocked';
      f.motivo_bloqueo = `${MAX_VUELTAS} vueltas de cambios pedidos${motivo ? ': ' + motivo : ''}`;
      return { plan: nuevo, evento: { id: f.id, name: f.name, de, a: 'blocked', sha: f.sha, detalle: 'tres vueltas: decide la persona' } };
    }
  } else if (a === 'blocked') {
    if (!esTexto(motivo, 5)) throw new ErrorPlan('bloquear una feature necesita --motivo (al menos 5 caracteres)');
    f.motivo_bloqueo = motivo;
    detalle = motivo;
  } else if (a === 'done') {
    detalle = 'en la integración';
  }
  f.status = a;
  return { plan: nuevo, evento: { id: f.id, name: f.name, de, a, sha: f.sha, detalle } };
}

// La línea de progress/history.md de un evento: «hora · #id nombre · evento · sha · detalle».
const ETIQUETA_EVENTO = { in_progress: 'arranca', in_qa: 'entrega', approved: 'qa APROBADA', changes_requested: 'qa CAMBIOS PEDIDOS', done: 'puerta y merge', blocked: 'bloqueada', pending: 'vuelve a pendiente' };
export function lineaHistoria(evento, ahora = new Date()) {
  const hora = ahora.toLocaleTimeString('es-ES', { hour12: false });
  return [hora, `#${evento.id} ${evento.name}`, ETIQUETA_EVENTO[evento.a] ?? evento.a, evento.sha ? evento.sha.slice(0, 7) : null, evento.detalle || null].filter(Boolean).join(' · ');
}
