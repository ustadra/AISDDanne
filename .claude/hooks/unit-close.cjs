#!/usr/bin/env node
// unit-close — recuerda cerrar la unidad de trabajo cuando queda obra sin commitear.
// Stop hook. NUNCA bloquea ni ejecuta nada (exit 0). No hace commit ni abre PR: eso tiene efecto
// externo y la regla de AGENTS.md es «nada de commit, push ni PR sin petición explícita».
//
// El fallo que ataca: el trabajo queda hecho pero suelto (sin revisor, sin commit, sin PR)
// y la siguiente sesión arranca sobre un working tree sucio del que nadie
// recuerda el alcance. Con varios agentes en paralelo, peor: cada worktree se queda con su obra a
// medias.
//
// No avisa en cada Stop: guarda una huella (rama + ficheros tocados) del último aviso en el tmp
// del sistema y solo vuelve a avisar cuando el estado cambia. Así no se convierte en ruido.
//
// El cierre lo decide el usuario; el hook solo evita que se olvide que hay algo abierto.
//
// Además: menciona .claude/state/handoff.md solo si existe, avisa si estás en una rama protegida y,
// si el repo trae .githooks/pre-push pero git no lo ejecuta (y entonces no protege nada), lo dice:
//   · core.hooksPath vacío → recomienda `git config core.hooksPath .githooks`;
//   · core.hooksPath apuntando a otro sitio (husky, lefthook…) → NO recomienda cambiarlo, que dejaría
//     sin hooks a ese gestor: pide encadenar .githooks/pre-push desde el pre-push del gestor que haya.
// Ese aviso sale también con el árbol limpio y lleva su propia huella: se repite solo cuando cambia
// core.hooksPath.
//
// Y el cierre de las unidades de trabajo (features/F-NN-<slug>/SPEC.md o 03_TAREAS/T-NN_<nombre>.md):
// avisa, en un solo aviso agregado y con su propia huella, de las unidades en `aprobada` cuyo estado no
// casa con su línea «Veredicto QA»: sin veredicto, con veredicto CAMBIOS PEDIDOS, con el veredicto sobre un
// commit que no está ni en esta rama ni en una rama local orquesta/* ni en la de un worktree vivo (entre `aprobada` y el merge vive solo
// en la de su unidad), o con un veredicto viejo porque las rutas «Escribe en (exclusivo)» del SPEC cambiaron
// después del commit aprobado sin llegar por el merge de otra unidad (ver veredictosDescuadrados). Las `hecha`
// no se miran: ya las aceptó la persona y, si la integración entró por squash, su commit aprobado no está en
// la rama sin que nada esté mal. Pocas llamadas a git (qué commits existen, la historia de HEAD, la de las
// ramas orquesta/* si hace falta, los cambios sin commitear y una por unidad con rutas) y un tope de tiempo
// (PRESUPUESTO_MS). Ante cualquier error de git o de lectura, calla.
//
// Al portar a un repo concreto: PROTEGIDAS con sus ramas reales, igual que en
// block-protected-merges.cjs y .githooks/pre-push.

const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const UMBRAL = 1; // a partir de cuántos ficheros tocados merece la pena avisar
// La misma lista que block-protected-merges.cjs y .githooks/pre-push.
const PROTEGIDAS = ['main', 'master', 'staging', 'produccion', 'production'];

const MAX_UNIDADES = 5; // cuántas unidades se nombran en el aviso de veredictos; el resto, «y N más»
// Tope de tiempo del repaso de veredictos: el hook entero tiene 10 s en settings.json. Pasado el tope deja
// de mirar y el aviso dice cuántas quedaron sin revisar. UNIT_CLOSE_PRESUPUESTO_MS existe solo para los tests.
const PRESUPUESTO_MS = /^\d+$/.test(process.env.UNIT_CLOSE_PRESUPUESTO_MS || '') ? Number(process.env.UNIT_CLOSE_PRESUPUESTO_MS) : 4000;

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

// Raíz: `git rev-parse` desde el cwd del payload (vale dentro de un worktree) y, si no, desde
// CLAUDE_PROJECT_DIR como último recurso.
function raizDelRepo(cwd) {
  for (const d of [cwd, process.env.CLAUDE_PROJECT_DIR, process.cwd()]) {
    if (!d) continue;
    try { const r = git(['rev-parse', '--show-toplevel'], d).trim(); if (r) return r; } catch { /* siguiente */ }
  }
  return null;
}

// git con timeout corto para el repaso de veredictos. Devuelve { status, out } o null si no se pudo
// lanzar o tardó demasiado: quien llama lo trata como «no sé» y calla.
function gitCorto(args, cwd, { timeout = 3000, input } = {}) {
  const r = spawnSync('git', args, {
    cwd, encoding: 'utf8', timeout: Math.max(1, timeout), input, windowsHide: true, maxBuffer: 64 * 1024 * 1024,
    stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'ignore'],
  });
  if (r.error || r.status === null) return null;
  return { status: r.status, out: r.stdout || '' };
}

function leer(fichero) {
  try { return readFileSync(fichero, 'utf8').replace(/^\uFEFF/, ''); } catch { return null; }
}

// Unidades de trabajo del repo: { nombre, texto }. Sin features/ ni 03_TAREAS/, lista vacía.
function unidades(raiz) {
  const res = [];
  try {
    for (const d of readdirSync(join(raiz, 'features'), { withFileTypes: true })) {
      if (!d.isDirectory() || !/^F-\d+/.test(d.name)) continue;
      const texto = leer(join(raiz, 'features', d.name, 'SPEC.md'));
      if (texto !== null) res.push({ nombre: d.name, texto });
    }
  } catch { /* sin features/ */ }
  try {
    for (const d of readdirSync(join(raiz, '03_TAREAS'), { withFileTypes: true })) {
      if (!d.isFile() || !/^T-\d+.*\.md$/i.test(d.name)) continue;
      const texto = leer(join(raiz, '03_TAREAS', d.name));
      if (texto !== null) res.push({ nombre: d.name.replace(/\.md$/i, ''), texto });
    }
  } catch { /* sin 03_TAREAS/ */ }
  return res.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

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

// Unidades `aprobada` cuyo estado no casa con su veredicto: { problemas: [«<unidad>: <problema>»],
// sinMirar: cuántas se quedaron sin revisar porque se acabó PRESUPUESTO_MS }.
//
// Qué deja viejo un veredicto: un cambio en las rutas «Escribe en» de la unidad que no llega por el merge de otra
// unidad. Cuentan los commits que no son merge en el primer padre de HEAD posteriores al sha aprobado (el que
// retoca la unidad en su rama, o el que alguien commitea directo en la integración) y los cambios sin commitear
// en esas rutas. No cuentan los commits que entran con el merge `--no-ff` de otra unidad aprobada (una feature
// posterior o una de arreglo que toca el mismo fichero): llegan por el segundo padre y ya pasaron su `qa`. En el
// modo por oleadas no hay merges de unidad y cada una deja su commit en el primer padre: tampoco cuentan el commit
// que es el veredicto APROBADA de otra unidad ni los de asunto `feat(F-NN…)` o `feat(T-NN…)` de otra unidad con
// veredicto APROBADA (ver deOtraAprobada).
// La misma regla que el «veredicto viejo» de .claude/skills/semaforo/scripts/ritmo.mjs.
//
// Las rutas no van a git como pathspec: git devuelve los ficheros cambiados y se filtran con cubre (la misma regla
// que la puerta de /orquesta). Si git no responde para una unidad, esa se salta y el repaso sigue con las demás.

// F-1, T-12…: la clave de una unidad por su nombre o por el ámbito de un asunto; null si no la hay.
const claveUnidad = (s) => { const m = /\b([FT])-0*(\d+)(?!\d)/i.exec(String(s || '')); return m ? `${m[1].toUpperCase()}-${m[2]}` : null; };

// ¿El commit (sha completo y asunto) es la entrega de otra unidad con veredicto APROBADA? `aprobadas` es la lista
// { clave, sha } de todas las unidades con veredicto APROBADA sobre un commit, sea cual sea su estado.
// Por el asunto `feat(F-NN…)` solo cuenta si ese commit es el aprobado de su unidad o anterior a él
// (esAncestro(sha, shaAprobado)): un retoque posterior a la aprobación de esa otra unidad no pasó su qa.
// Misma regla en .claude/skills/semaforo/scripts/ritmo.mjs.
function deOtraAprobada(sha, asunto, propia, aprobadas, esAncestro = () => false) {
  const ambito = /^feat\(\s*([FT]-\d+)/i.exec(String(asunto || ''));
  const clave = ambito ? claveUnidad(ambito[1]) : null;
  return aprobadas.some((a) => a.clave !== propia && a.sha &&
    (sha.startsWith(a.sha) || (clave && a.clave === clave && esAncestro(sha, a.sha))));
}

// `git log --format=%x1e%H%x09%s --name-only -z`: [{ sha, asunto, ficheros }]. Los nombres llegan sin escapar.
function commitsConFicheros(salida) {
  const res = [];
  for (const trozo of salida.split('\x1e')) {
    if (!trozo) continue;
    const corte = trozo.indexOf('\0');
    const cab = corte < 0 ? trozo : trozo.slice(0, corte);
    const tab = cab.indexOf('\t');
    if (tab <= 0) continue;
    const ficheros = corte < 0 ? [] : trozo.slice(corte + 1).replace(/^\r?\n/, '').split('\0').filter(Boolean);
    res.push({ sha: cab.slice(0, tab).toLowerCase(), asunto: cab.slice(tab + 1), ficheros });
  }
  return res;
}

// `git status --porcelain -z`: las rutas tocadas (en un renombrado, las dos).
function rutasDeStatus(salida) {
  const res = [];
  const t = salida.split('\0');
  for (let i = 0; i < t.length; i++) {
    if (t[i].length < 4) continue;
    res.push(t[i].slice(3));
    if (/^[RC]/.test(t[i])) res.push(t[++i] || '');
  }
  return res.filter(Boolean);
}

function veredictosDescuadrados(raiz) {
  const t0 = Date.now();
  const queda = () => PRESUPUESTO_MS - (Date.now() - t0);
  const tope = () => Math.min(3000, queda());
  const problemas = [];
  const porMirar = [];
  const aprobadas = [];
  for (const { nombre, texto } of unidades(raiz)) {
    const { estado, veredicto, escribeEn } = leerContrato(texto);
    if (veredicto && veredicto.tipo === 'APROBADA') aprobadas.push({ clave: claveUnidad(nombre), sha: veredicto.sha });
    if (estado !== 'aprobada') continue; // `hecha` ya la aceptó la persona: no se mira
    if (!veredicto || !veredicto.tipo) { problemas.push(`${nombre}: sin veredicto de qa`); continue; }
    if (veredicto.tipo !== 'APROBADA') { problemas.push(`${nombre}: estado \`aprobada\` con veredicto ${veredicto.tipo}`); continue; }
    if (!veredicto.sha) continue; // aprobada sobre una versión (v<N>), no sobre un commit: nada que mirar en git
    porMirar.push({ nombre, sha: veredicto.sha, rutas: escribeEn });
  }
  if (!porMirar.length) return { problemas, sinMirar: 0 };
  // Si una llamada no responde: por el tope, lo pendiente cuenta como sin mirar; por otro motivo, se calla.
  const corte = (pendientes) => ({ problemas, sinMirar: queda() <= 0 ? pendientes : 0 });

  // Una llamada: qué commits existen (cat-file --batch-check responde una línea por entrada, en orden).
  if (queda() <= 0) return corte(porMirar.length);
  const cat = gitCorto(['cat-file', '--batch-check'], raiz, { timeout: tope(), input: porMirar.map((u) => `${u.sha}^{commit}`).join('\n') + '\n' });
  if (!cat || cat.status !== 0) return corte(porMirar.length);
  const resp = cat.out.split(/\r?\n/);
  porMirar.forEach((u, i) => {
    const m = /^([0-9a-f]{40,64}) commit\b/.exec((resp[i] || '').trim()); // «<sha> commit <tamaño>» o «… missing»
    u.completo = m ? m[1] : null;
  });
  // Otra: la historia de HEAD, para saber si cada commit aprobado está en esta rama.
  if (queda() <= 0) return corte(porMirar.length);
  const hist = gitCorto(['rev-list', 'HEAD', '--'], raiz, { timeout: tope() });
  if (!hist || hist.status !== 0) return corte(porMirar.length);
  const enRama = new Set(hist.out.split(/\r?\n/).filter(Boolean));

  // Entre `aprobada` y su merge, el commit aprobado vive solo en la rama de su unidad (`orquesta/<unidad>`): una
  // llamada más, solo si hace falta, con lo que tienen las ramas locales orquesta/* y no tiene HEAD.
  // También vale la rama (o el HEAD suelto) de un worktree vivo: el constructor puede entregar en una rama que no
  // se llame orquesta/*.
  let enOrquesta = new Set();
  if (porMirar.some((u) => u.completo && !enRama.has(u.completo))) {
    if (queda() <= 0) return corte(porMirar.length);
    const wt = gitCorto(['worktree', 'list', '--porcelain'], raiz, { timeout: tope() });
    const vivos = [];
    if (wt && wt.status === 0) {
      for (const b of wt.out.split(/\r?\n\r?\n/)) {
        const ls = b.split(/\r?\n/);
        if (ls.some((l) => l.startsWith('prunable'))) continue;
        for (const l of ls) {
          if (l.startsWith('branch refs/heads/')) vivos.push(l.slice(7));
          else if (/^HEAD [0-9a-f]{40,64}$/.test(l) && ls.includes('detached')) vivos.push(l.slice(5));
        }
      }
    }
    if (queda() <= 0) return corte(porMirar.length);
    const orq = gitCorto(['rev-list', '--branches=orquesta/*', ...vivos, '--not', 'HEAD', '--'], raiz, { timeout: tope() });
    if (!orq || orq.status !== 0) return corte(porMirar.length);
    enOrquesta = new Set(orq.out.split(/\r?\n/).filter(Boolean));
  }

  const conRutas = [];
  for (const u of porMirar) {
    if (u.completo && enRama.has(u.completo)) { if (u.rutas.length) conRutas.push(u); continue; }
    // Aprobado y aún sin mergear: si lo que se mergea es lo aprobado lo decide la puerta, contra el HEAD de su rama.
    if (u.completo && enOrquesta.has(u.completo)) continue;
    problemas.push(`${u.nombre}: veredicto sobre un commit que no está en esta rama`);
  }
  if (!conRutas.length) return { problemas, sinMirar: 0 };

  // Cambios sin commitear (modificados o nuevos) de todo el repo, en una llamada. Las rutas no se pasan a git como
  // pathspec: se filtran con cubre, la misma regla que la puerta de /orquesta.
  if (queda() <= 0) return corte(conRutas.length);
  const st = gitCorto(['-c', 'core.quotepath=false', 'status', '--porcelain', '-z', '--untracked-files=all'], raiz, { timeout: tope() });
  if (!st) return corte(conRutas.length);
  const locales = st.status === 0 ? rutasDeStatus(st.out) : [];

  // ¿sha es el aprobado de otra unidad o anterior a él? Una llamada por par, con memoria.
  const memo = new Map();
  const esAncestro = (sha, aprobado) => {
    const k = sha + ' ' + aprobado;
    if (!memo.has(k)) {
      const r = queda() > 0 ? gitCorto(['merge-base', '--is-ancestor', sha, aprobado], raiz, { timeout: tope() }) : null;
      memo.set(k, !!r && r.status === 0);
    }
    return memo.get(k);
  };

  for (let i = 0; i < conRutas.length; i++) {
    const u = conRutas[i];
    if (queda() <= 0) return corte(conRutas.length - i);
    // Commits posteriores al aprobado en el primer padre de HEAD, sin merges, que tocan sus rutas y no son la
    // entrega de otra unidad aprobada. Si git no responde, esta unidad se salta y se sigue con las demás.
    const log = gitCorto(['-c', 'core.quotepath=false', 'log', '--format=%x1e%H%x09%s', '--name-only', '-z', '--first-parent', '--no-merges', `${u.completo}..HEAD`, '--'], raiz, { timeout: tope() });
    if (!log) { if (queda() <= 0) return corte(conRutas.length - i); continue; }
    if (log.status !== 0) continue;
    const propia = claveUnidad(u.nombre);
    const toca = (f) => u.rutas.some((p) => cubre(p, f));
    let viejo = commitsConFicheros(log.out).some((c) => c.ficheros.some(toca) && !deOtraAprobada(c.sha, c.asunto, propia, aprobadas, esAncestro));
    if (!viejo) viejo = locales.some(toca);
    if (viejo) problemas.push(`veredicto viejo: ${u.nombre} cambió después de la aprobación; vuelve a \`en revisión\``);
  }
  return { problemas, sinMirar: 0 };
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let cwd = '';
  try {
    const payload = JSON.parse(input.replace(/^\uFEFF/, '').trim() || '{}');
    if (payload.cwd) cwd = payload.cwd;
  } catch { /* sin payload: se usa el cwd */ }

  const raiz = raizDelRepo(cwd);
  if (!raiz) process.exit(0); // sin git no hay nada que cerrar

  let lineas = [];
  let rama = '';
  try {
    lineas = git(['status', '--porcelain'], raiz).split('\n').filter(Boolean);
    rama = git(['branch', '--show-current'], raiz).trim();
  } catch {
    process.exit(0);
  }

  // Cada aviso lleva su huella: si es la misma del último aviso, no se repite.
  const marcaDir = createHash('sha1').update(raiz).digest('hex').slice(0, 12);
  const huellaDe = (nombre, estado) => {
    const fichero = join(tmpdir(), `${nombre}-${marcaDir}.txt`);
    const huella = createHash('sha1').update(estado).digest('hex');
    let anterior = '';
    try { anterior = readFileSync(fichero, 'utf8').trim(); } catch { /* primera vez */ }
    return { nueva: huella !== anterior, guardar: () => { try { writeFileSync(fichero, huella); } catch { /* sin tmp: avisará otra vez */ } } };
  };

  // El pre-push solo protege si git lo ejecuta: core.hooksPath tiene que apuntar a .githooks. Se avisa
  // también con el árbol limpio, y con su propia huella: una vez por cada cambio de esa configuración.
  let hooksInactivo = false;
  let hooksPath = '';
  if (existsSync(join(raiz, '.githooks', 'pre-push'))) {
    try { hooksPath = git(['config', '--get', 'core.hooksPath'], raiz).trim(); } catch { /* sin valor */ }
    hooksInactivo = !hooksPath || resolve(raiz, hooksPath) !== resolve(raiz, '.githooks');
  }
  const hFicheros = huellaDe('unit-close', rama + '\n' + [...lineas].sort().join('\n'));
  const hHooks = huellaDe('unit-close-hookspath', `${hooksInactivo}\n${hooksPath}`);
  let descuadres = [];
  let sinMirar = 0;
  try { ({ problemas: descuadres, sinMirar } = veredictosDescuadrados(raiz)); } catch { /* silencio ante cualquier error */ }
  // La huella guarda si quedaron unidades sin mirar, no cuántas: ese recuento cambia en cada Stop y repetiría el aviso.
  const hVeredictos = huellaDe('unit-close-veredicto', rama + '\n' + (sinMirar > 0) + '\n' + descuadres.join('\n'));

  let memoriaPendiente = 0;
  let memoriaConsolidadaMsg = '';
  try {
    // La memoria por grafo y Jevify aplica exclusivamente en Tier 2
    let esTier2 = false;
    try {
      const { detectarTier } = require('./memory-lifecycle.cjs');
      esTier2 = detectarTier(raiz) === 2;
    } catch {
      esTier2 = existsSync(join(raiz, 'knowledge', 'graph.jsonl'));
    }

    if (esTier2) {
      const consolidator = join(raiz, 'tools', 'memory-consolidate.cjs');
      if (existsSync(consolidator)) {
        const { getPendingCandidates } = require(consolidator);
        const pendientes = getPendingCandidates(raiz);
        // Solo cuentan los resúmenes ya clasificados: los sin clasificar esperan a Ollama y no se consolidan al commitear
        memoriaPendiente = pendientes.filter((p) => p.estado === 'resumido').length;

        // Solo hay algo que asignar si HEAD cambió desde la última consolidación (.claude/state/jevify-head.json, lo
        // escribe el consolidador): con el mismo HEAD `auto` sale con head_sin_cambios y no consolida nada. Qué commit
        // es de mantenimiento lo decide el consolidador.
        let headCambio = true;
        try {
          const head = git(['rev-parse', 'HEAD'], raiz).trim();
          const guardado = JSON.parse(readFileSync(join(raiz, '.claude', 'state', 'jevify-head.json'), 'utf8'));
          if (head && guardado && guardado.commit === head) headCambio = false;
        } catch { /* sin HEAD o sin estado: se deja lanzar */ }

        // Si la unidad está cerrada (árbol limpio tras commit) y hay pendientes, se lanza la consolidación
        // DESACOPLADA (sin esperar: el hook tiene 10 s y el repaso de veredictos ya gasta hasta 4). Escribe solo en
        // knowledge/graph.sqlite; el JSONL lo vuelca el pre-commit.
        if (lineas.length === 0 && memoriaPendiente > 0 && headCambio) {
          let lanzado = false;
          try { lanzado = require('./memory-lifecycle.cjs').lanzarDesacoplado(consolidator, ['auto'], raiz); } catch { /* sin lanzador */ }
          if (lanzado) {
            memoriaConsolidadaMsg = `Se ha lanzado en segundo plano la consolidación de ${memoriaPendiente} resumen(es) pendiente(s) en el grafo local (knowledge/graph.sqlite; el JSONL se vuelca al commitear).`;
            memoriaPendiente = 0;
          }
        }
      }
    }
  } catch { /* silencio si no hay consolidator */ }
  // La huella guarda si hay resúmenes pendientes, no cuántos: el recuento cambia con cada prompt y repetiría el aviso.
  const hMemoria = huellaDe('unit-close-memoria', (memoriaPendiente > 0 ? '1' : '0') + '\n' + (memoriaConsolidadaMsg ? '1' : '0'));

  const avisarObra = lineas.length >= UMBRAL && hFicheros.nueva;
  const avisarHooks = hooksInactivo && hHooks.nueva;
  const avisarVeredictos = (descuadres.length > 0 || sinMirar > 0) && hVeredictos.nueva;
  const avisarMemoria = (memoriaPendiente > 0 || memoriaConsolidadaMsg.length > 0) && hMemoria.nueva;

  hFicheros.guardar();
  hHooks.guardar();
  hVeredictos.guardar();
  hMemoria.guardar();

  if (!avisarObra && !avisarHooks && !avisarVeredictos && !avisarMemoria) process.exit(0);

  const avisos = [];
  if (avisarObra) {
    const sinTrackear = lineas.filter((l) => l.startsWith('??')).length;
    const modificados = lineas.length - sinTrackear;
    avisos.push(
      `Queda obra sin commitear en \`${rama || 'HEAD'}\`: ${modificados} modificado(s), ${sinTrackear} sin trackear.`,
      // tools/validate.mjs solo existe en fct-project-builder, que comparte este hook con AI_SDD.
      existsSync(join(raiz, 'tools', 'validate.mjs'))
        ? 'Cierre de una unidad de trabajo: `node tools/validate.mjs --check-docs` → commit (con el OK de la persona) → qa sobre ese commit → revisor ✅ → /pr (abre, no mergea).'
        : 'Cierre de una unidad de trabajo: commit (con el OK de la persona) → qa sobre ese commit → revisor ✅ → /pr (abre, no mergea).',
    );
    if (existsSync(join(raiz, '.claude', 'state', 'handoff.md'))) {
      avisos.push('Si queda a medias para otro agente o sesión, descríbelo en .claude/state/handoff.md.');
    }
    if (PROTEGIDAS.includes(rama)) {
      avisos.push(`Estás en \`${rama}\`, que es rama protegida: el trabajo debería nacer en feat/* o feature/*, fix/* o chore/*.`);
    }
  }
  if (avisarHooks && !hooksPath) avisos.push('El pre-push no está activo (ni el pre-commit ni el commit-msg, si el repo los trae): `git config core.hooksPath .githooks`.');
  if (avisarHooks && hooksPath) {
    avisos.push(`El pre-push de .githooks no se ejecuta: core.hooksPath apunta a \`${hooksPath}\`, de otro gestor de hooks. ` +
      'No lo cambies: encadena .githooks/pre-push desde el pre-push de ese gestor (que lo llame con los mismos argumentos y la misma entrada), y lo mismo con pre-commit y commit-msg si el repo los trae.');
  }
  if (avisarVeredictos) {
    if (descuadres.length) {
      const nombrados = descuadres.slice(0, MAX_UNIDADES).join('; ');
      const resto = descuadres.length > MAX_UNIDADES ? `; y ${descuadres.length - MAX_UNIDADES} más` : '';
      avisos.push(`Unidades \`aprobada\` cuyo estado no casa con su veredicto QA: ${nombrados}${resto}.`);
    }
    if (sinMirar) avisos.push(`No revisé todas las unidades \`aprobada\`: se acabó el tiempo del repaso y quedaron ${sinMirar} sin mirar.`);
    avisos.push('Las `hecha` no se revisan: ya las aceptó la persona, y si la integración entró por squash su commit aprobado no está en esta rama sin que nada esté mal.');
  }
  if (avisarMemoria) {
    if (memoriaConsolidadaMsg) {
      avisos.push(memoriaConsolidadaMsg);
    } else if (memoriaPendiente > 0) {
      avisos.push(`Hay ${memoriaPendiente} resumen(es) pendiente(s) de consolidar en el grafo local.`);
    }
  }
  avisos.push('Si el trabajo sigue abierto, ignora este aviso: no se repetirá mientras no cambie el estado.');

  console.error('');
  for (const a of avisos) console.error(`[unit-close] ${a}`);
  console.error('');
  process.stdout.write(JSON.stringify({ systemMessage: `[unit-close] ${avisos.join('\n')}` }));
  process.exit(0);
});
