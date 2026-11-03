#!/usr/bin/env node
// version-check — al abrir sesión, avisa si hay una versión nueva del repo o del kit del que salió.
// SessionStart hook. NUNCA bloquea (exit 0 siempre) y no cambia nada del repo: solo `git fetch` de la
// rama por defecto y `git ls-remote`, que no tocan ni el árbol ni las ramas locales.
//
// El fallo que ataca: alguien trabaja una semana sobre un `main` viejo, o un repo generado sigue con
// hooks y skills de hace meses, y nadie se entera porque depende de acordarse de mirar.
//
// Dos comprobaciones, cada una solo si aplica:
//   · Repo propio (hay remoto `origin`): trae la rama por defecto (`refs/remotes/origin/HEAD` o, si no
//     está, `main`/`master`) y compara. En esa rama, avisa si la local va por detrás. En una rama de
//     trabajo, avisa de cuántos commits ha avanzado la rama por defecto desde que la creaste.
//   · Repo generado (existe `.claude/kit-version.json`, el sello que deja /arranca): mira con
//     `git ls-remote --tags` las etiquetas `vAAAA.MM.DD[.N]` del kit y avisa si hay una más nueva que
//     la del sello.
//
// Para no molestar: una comprobación al día por repo (huella con la fecha en el tmp del sistema),
// 4 s de tope por cada llamada a git, sin pedir credenciales nunca (GIT_TERMINAL_PROMPT=0,
// GCM_INTERACTIVE=never y ssh en BatchMode), y silencio ante cualquier error: sin red, sin permiso,
// sin remoto o con un payload que no entiende.
//
// Variables: VERSION_CHECK=off lo apaga; VERSION_CHECK_FORZAR=1 se salta la huella del día (tests).
//
// Salida: `systemMessage` (lo ve el usuario) y `hookSpecificOutput.additionalContext` con
// hookEventName "SessionStart" (lo lee el modelo antes del primer prompt).

'use strict';

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, join } = require('node:path');

const TOPE_MS = 4000; // por cada llamada a git que sale a la red
const SELLO = join('.claude', 'kit-version.json');
const VERSION = /^v(\d{4})\.(\d{2})\.(\d{2})(?:\.(\d+))?$/;

// Entorno de git: que nunca se quede esperando una contraseña.
function entornoGit(raiz) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
  if (!env.GIT_SSH_COMMAND) {
    let propio = '';
    try { propio = git(['config', '--get', 'core.sshCommand'], raiz, process.env).trim(); } catch { /* sin valor */ }
    if (!propio) env.GIT_SSH_COMMAND = 'ssh -o BatchMode=yes';
  }
  return env;
}

function git(args, cwd, env, timeout) {
  return execFileSync('git', args, {
    cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
    ...(timeout ? { timeout, killSignal: 'SIGKILL' } : {}),
  });
}

// Raíz: `git rev-parse` desde el cwd del payload (vale dentro de un worktree) y, si no, desde
// CLAUDE_PROJECT_DIR como último recurso.
function raizDelRepo(cwd) {
  for (const d of [cwd, process.env.CLAUDE_PROJECT_DIR, process.cwd()]) {
    if (!d) continue;
    try { const r = git(['rev-parse', '--show-toplevel'], d, process.env).trim(); if (r) return r; } catch { /* siguiente */ }
  }
  return null;
}

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Nombre legible del repo: el último tramo de la URL de origin, o la carpeta.
function nombreDe(url, raiz) {
  const m = /([^/\\:]+?)(?:\.git)?[/\\]?$/.exec(url || '');
  return (m && m[1]) || basename(raiz);
}

// ── Repo propio: ¿la rama por defecto ha avanzado en origin? ──
function revisarRepo(raiz, env) {
  let url;
  try { url = git(['remote', 'get-url', 'origin'], raiz, env).trim(); } catch { return null; }
  if (!url) return null;

  const existe = (ref) => { try { git(['rev-parse', '--verify', '--quiet', ref], raiz, env); return true; } catch { return false; } };
  let porDefecto = '';
  try { porDefecto = git(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'], raiz, env).trim().replace(/^refs\/remotes\/origin\//, ''); } catch { /* sin origin/HEAD */ }
  if (!porDefecto) porDefecto = ['main', 'master'].find((r) => existe(`refs/remotes/origin/${r}`) || existe(`refs/heads/${r}`)) || '';
  if (!porDefecto) return null;

  // Solo esa rama, sin etiquetas y sin mantenimiento automático: rápido y sin efectos en el repo.
  try {
    git(['-c', 'gc.auto=0', '-c', 'maintenance.auto=false', 'fetch', '--quiet', '--no-tags', 'origin', porDefecto], raiz, env, TOPE_MS);
  } catch { return null; }
  const remota = `refs/remotes/origin/${porDefecto}`;
  if (!existe(remota)) return null;

  let rama = '';
  try { rama = git(['branch', '--show-current'], raiz, env).trim(); } catch { return null; }
  if (!rama) return null; // HEAD suelto: no hay rama que comparar

  const local = rama === porDefecto ? `refs/heads/${porDefecto}` : 'HEAD';
  let n = 0;
  try { n = Number(git(['rev-list', '--count', `${local}..${remota}`], raiz, env).trim()) || 0; } catch { return null; }
  if (n <= 0) return null;
  let ultimo = '';
  try { ultimo = git(['log', '-1', '--format=%s', remota], raiz, env).trim(); } catch { /* sin título */ }
  const tras = ultimo ? ` (último: «${ultimo}»)` : '';
  const commits = n === 1 ? '1 commit nuevo' : `${n} commits nuevos`;
  if (rama === porDefecto) {
    return `${nombreDe(url, raiz)} tiene ${commits} en \`${porDefecto}\`${tras}. Haz \`git pull\` antes de trabajar.`;
  }
  return `\`${porDefecto}\` ha avanzado ${n === 1 ? '1 commit' : `${n} commits`} desde que creaste \`${rama}\`${tras}. ` +
    `Intégralos en tu rama antes de seguir (\`git merge origin/${porDefecto}\` o \`git rebase origin/${porDefecto}\`).`;
}

// ── Repo generado: ¿el kit tiene una versión más nueva que la del sello? ──
const clave = (v) => { const m = VERSION.exec(v); return m ? [+m[1], +m[2], +m[3], m[4] ? +m[4] : 1] : null; };
function compara(a, b) { for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }

// Dónde leer qué hay de nuevo: la página de releases si el kit vive en una forja web.
function releasesDe(url) {
  let base = '';
  if (/^https?:\/\//i.test(url)) base = url.replace(/^(https?:\/\/)[^@/]*@/i, '$1');
  else { const m = /^(?:ssh:\/\/)?[^@/]+@([^:/]+)[:/](.+)$/.exec(url); if (m) base = `https://${m[1]}/${m[2]}`; }
  return base ? `${base.replace(/\.git$/, '').replace(/\/+$/, '')}/releases` : '';
}

function revisarKit(raiz, env) {
  let sello;
  try { sello = JSON.parse(readFileSync(join(raiz, SELLO), 'utf8').replace(/^﻿/, '')); } catch { return null; }
  if (!sello || typeof sello !== 'object' || typeof sello.kit !== 'string' || !sello.kit.trim()) return null;
  const kit = sello.kit.trim();
  const propia = typeof sello.version === 'string' ? sello.version.trim() : '';

  let salida;
  try { salida = git(['ls-remote', '--tags', '--refs', kit, 'v*'], raiz, env, TOPE_MS); } catch { return null; }
  const versiones = salida.split('\n')
    .map((l) => (l.split('\t')[1] || '').trim().replace(/^refs\/tags\//, ''))
    .filter((v) => clave(v))
    .sort((a, b) => compara(clave(a), clave(b)));
  const ultima = versiones[versiones.length - 1];
  if (!ultima) return null;
  if (clave(propia) && compara(clave(ultima), clave(propia)) <= 0) return null;

  const origen = clave(propia) ? `este repo se generó con la ${propia}` : 'este repo se generó sin versión etiquetada';
  const rel = releasesDe(kit);
  return `El kit tiene la versión ${ultima}; ${origen}.` + (rel ? ` Lo nuevo: ${rel}.` : '') +
    ` Para traerlo: \`/arranca ${raiz}\` desde el kit, en modo adopción (no destructivo).`;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  try {
    if (String(process.env.VERSION_CHECK || '').toLowerCase() === 'off') process.exit(0);
    let payload;
    try { payload = JSON.parse(input.replace(/^﻿/, '').trim() || '{}'); } catch { process.exit(0); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) process.exit(0);

    const raiz = raizDelRepo(typeof payload.cwd === 'string' ? payload.cwd : '');
    if (!raiz) process.exit(0);

    // Una vez al día por repo. La huella se escribe antes de salir a la red: sin conexión tampoco se
    // reintenta en cada sesión.
    const huella = join(tmpdir(), `version-check-${createHash('sha1').update(raiz).digest('hex').slice(0, 12)}.txt`);
    if (process.env.VERSION_CHECK_FORZAR !== '1') {
      let anterior = '';
      try { anterior = readFileSync(huella, 'utf8').trim(); } catch { /* primera vez */ }
      if (anterior === hoy()) process.exit(0);
    }
    try { writeFileSync(huella, hoy()); } catch { /* sin tmp: comprobará otra vez */ }

    const env = entornoGit(raiz);
    const avisos = [revisarRepo(raiz, env), revisarKit(raiz, env)].filter(Boolean);
    if (!avisos.length) process.exit(0);

    const texto = avisos.map((a) => `[version-check] ${a}`).join('\n');
    process.stdout.write(JSON.stringify({
      systemMessage: texto,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: texto },
    }));
  } catch { /* cualquier fallo: silencio */ }
  process.exit(0);
});
