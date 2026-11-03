#!/usr/bin/env node
// block-protected-merges — a una rama protegida solo se llega por PR, mergeada desde la web.
// PreToolUse hook sobre Bash | PowerShell. Exit 2 → bloquea y explica el motivo.
// Flujo correcto: feat/* o feature/*, fix/*, chore/* → push → PR → merge desde la web del remoto.
//
// Qué bloquea:
//   · `git merge …` cuando la rama actual es protegida (traerse main a tu rama de trabajo sí vale).
//     Se permiten ahí `git merge --ff-only` y el merge desde su propia rama remota (`origin/main`
//     estando en `main`, con `origin` entre los remotos de `git remote`; `@{u}`): ponen al día la rama
//     local, no meten trabajo nuevo. `fix/main` no es su rama remota: `fix` no es un remoto.
//   · `git pull <remoto> <otra-rama>` sin `--rebase` ni `--ff-only` estando en una protegida: es un merge.
//   · `git push` cuyo destino es una rama protegida: `git push origin main`, `HEAD:main`,
//     `git push origin HEAD` o `@` estando en una protegida, `--delete main`, `--all`, `--mirror`,
//     un patrón que la alcanza (`refs/heads/*:refs/heads/*`) o un `git push` sin refspec estando en una protegida.
//   · `gh pr merge` (también con `-R dueño/repo` delante) y `gh api … /pulls/N/merge` con `-X PUT`:
//     el merge se hace desde la web, no desde la terminal.
// «Rama actual» es la que habrá cuando corra ese comando: un `git checkout main`, `git switch main` o
// `git checkout -t origin/main` previo en la misma línea cuenta, y un `cd`/`Set-Location` previo cambia
// de repo, como un `-C` (salvo dentro de `( … )` en Bash: al cerrar el paréntesis vuelve el directorio).
// Solo cuenta lo que está en posición de comando: un `echo "git merge"`, el cuerpo de un heredoc o
// el texto de un `-m "…; git push origin main"` no. El texto de `bash -c`, `cmd /c`, `pwsh -Command`,
// `eval`, `iex` y de `$( … )` o backticks sí, y se saltan envoltorios como `sudo`, `env`, `timeout`,
// `nice` o `xargs`.
//
// Es la primera línea. La segunda es `.githooks/pre-push`, que rechaza el push directo a una rama
// protegida aunque el agente no pase por aquí (otra herramienta, o el desarrollador a mano), pero
// solo cuando `core.hooksPath` apunta a `.githooks` (`git config core.hooksPath .githooks`, una vez
// por clon). Sin eso, git no lo ejecuta y esta es la única línea; unit-close avisa si falta.
//
// Al portar a un repo concreto: ajustar PROTEGIDAS a sus ramas reales (y las de unit-close.cjs y
// .githooks/pre-push, que llevan la misma lista).

const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');

const PROTEGIDAS = ['main', 'master', 'staging', 'produccion', 'production'];

// ── Troceo de la línea de comandos ──────────────────────────────────────────────────────────────
// Copia idéntica en secret-scan, no-ai-attribution, block-protected-merges, vendor-gate y permisos: cada hook
// viaja solo a los proyectos generados, así que no comparten módulo. Si cambias una, cambia todas.

// El comando del payload: Bash y PowerShell lo traen en tool_input.command.
function leerComando(payload) {
  const shell = payload.tool_name || 'Bash';
  if (shell !== 'Bash' && shell !== 'PowerShell') return { cmd: '', shell };
  return { cmd: String((payload.tool_input && payload.tool_input.command) || ''), shell };
}

// Quita el cuerpo de los heredocs de Bash (su texto no se ejecuta como comando). Deja la línea
// del `<<EOF`, que puede seguir con más comandos (`<<EOF && git push`).
const sinHeredocs = (cmd) => cmd.replace(/(<<-?\s*(['"]?)(\w+)\2)([^\n]*\n)[\s\S]*?\n\s*\3\s*(?=\n|$)/g, '$1$4');

// Índice del `)` que cierra una sustitución `$(` abierta justo antes de `desde`, contando paréntesis
// anidados y saltando comillas y escapes (`esc`: `\` en Bash, `` ` `` en PowerShell). -1 si no cierra.
function cierreSub(cmd, desde, esc) {
  let nivel = 1;
  for (let j = desde; j < cmd.length; j++) {
    const c = cmd[j];
    if (c === esc) { j++; continue; }
    if (c === "'") { const k = cmd.indexOf("'", j + 1); if (k < 0) return -1; j = k; continue; }
    if (c === '"') {
      j++;
      while (j < cmd.length && cmd[j] !== '"') j += cmd[j] === esc ? 2 : 1;
      continue;
    }
    if (c === '(') nivel++;
    else if (c === ')' && --nivel === 0) return j;
  }
  return -1;
}

// Índice del backtick que cierra una sustitución `` `…` `` de Bash abierta antes de `desde`. -1 si no cierra.
function cierreBacktick(cmd, desde) {
  for (let j = desde; j < cmd.length; j++) {
    if (cmd[j] === '\\') { j++; continue; }
    if (cmd[j] === '`') return j;
  }
  return -1;
}

// Trocea en comandos simples respetando comillas (Bash y PowerShell). Devuelve [{ tokens, sep, subs }]:
// `sep` es el operador que va detrás (`|`, `&&`, `||`, `;`, `&` o '' al final) y `subs`, el texto de
// las sustituciones que ese comando ejecuta antes de correr: `$( … )` dentro de comillas dobles (en
// Bash y en PowerShell) y los backticks de Bash, entre comillas o sin ellas. Los paréntesis cuentan
// como separador; en Bash, además, cada uno deja una marca `{ grupo: '(' | ')' }`, porque abren una
// subshell. Los comentarios (#…) se descartan.
function trocear(cmd, shell) {
  const ps = shell === 'PowerShell';
  const esc = ps ? '`' : '\\';
  const out = [];
  let tokens = [];
  let tok = null;
  let subs = [];
  const finTok = () => { if (tok !== null) { tokens.push(tok); tok = null; } };
  const finCmd = (sep) => { finTok(); if (tokens.length) out.push({ tokens, sep, subs }); tokens = []; subs = []; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (ps && c === '@' && (cmd[i + 1] === "'" || cmd[i + 1] === '"')) { // here-string @' … '@
      const m = /^@(['"])[ \t]*\r?\n([\s\S]*?)\r?\n\1@/.exec(cmd.slice(i));
      if (m) { tok = (tok || '') + m[2]; i += m[0].length - 1; continue; }
    }
    if (c === "'") {
      const j = cmd.indexOf("'", i + 1);
      const fin = j < 0 ? cmd.length : j;
      tok = (tok || '') + cmd.slice(i + 1, fin);
      i = fin;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < cmd.length && cmd[j] !== '"') {
        if (cmd[j] === '$' && cmd[j + 1] === '(') { // `"…$(cmd)…"`: el texto de dentro se ejecuta
          const k = cierreSub(cmd, j + 2, esc);
          if (k >= 0) { subs.push(cmd.slice(j + 2, k)); s += cmd.slice(j, k + 1); j = k + 1; continue; }
        }
        if (!ps && cmd[j] === '`') { // `"…`cmd`…"` en Bash
          const k = cierreBacktick(cmd, j + 1);
          if (k >= 0) { subs.push(cmd.slice(j + 1, k)); s += cmd.slice(j, k + 1); j = k + 1; continue; }
        }
        const escapa = ps ? cmd[j] === '`' : cmd[j] === '\\' && '"\\$`\n'.includes(cmd[j + 1]);
        if (escapa && j + 1 < cmd.length) { s += cmd[j + 1]; j += 2; } else { s += cmd[j]; j++; }
      }
      tok = (tok || '') + s;
      i = j;
      continue;
    }
    if (!ps && c === '`') { // `` echo `cmd` `` en Bash
      const k = cierreBacktick(cmd, i + 1);
      if (k >= 0) { subs.push(cmd.slice(i + 1, k)); tok = (tok || '') + cmd.slice(i, k + 1); i = k; continue; }
    }
    if (c === esc && i + 1 < cmd.length) {
      if (cmd[i + 1] === '\r' && cmd[i + 2] === '\n') i++; // continuación de línea
      else if (cmd[i + 1] !== '\n') tok = (tok || '') + cmd[i + 1];
      i++;
      continue;
    }
    if (c === '#' && tok === null) { while (i + 1 < cmd.length && cmd[i + 1] !== '\n') i++; continue; }
    if (c === '&' && cmd[i + 1] === '&') { finCmd('&&'); i++; continue; }
    if (c === '|' && cmd[i + 1] === '|') { finCmd('||'); i++; continue; }
    if (c === '|') { finCmd('|'); continue; }
    if (c === '(' || c === ')') { finCmd(';'); if (!ps) out.push({ tokens: [], sep: '', subs: [], grupo: c }); continue; }
    if (c === ';' || c === '\n') { finCmd(';'); continue; }
    if (c === '&') {
      if (cmd[i + 1] === '>' || (tok !== null && /[<>]$/.test(tok))) { tok = (tok || '') + c; continue; } // 2>&1, &>
      if (ps && tokens.length === 0 && tok === null) continue; // `& git …`: operador de llamada de PowerShell
      finCmd('&');
      continue;
    }
    if (/\s/.test(c)) { finTok(); continue; }
    tok = (tok || '') + c;
  }
  finCmd('');
  return out;
}

// Nombre normalizado de un ejecutable: sin ruta, en minúsculas y sin .exe/.cmd/.bat/.ps1.
const nombreDe = (t) => String(t).split(/[\\/]/).pop().toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');

// Posición del comando real y su nombre normalizado. Salta `VAR=valor`, prefijos como `command` o
// `nohup` y los envoltorios que lanzan otro comando con sus opciones: `sudo -u x -E git push`,
// `env -i -u X VAR=v git push`, `timeout 30 git push`, `nice -n 5 git push`, `xargs git push`.
const PREFIJOS = new Set(['command', 'exec', 'nohup', 'time', 'then', 'do', 'else', 'if', 'while', 'until', '!', '{', '}']);
const ENVOLTORIO_CON_VALOR = {
  sudo: new Set(['-u', '--user', '-g', '--group', '-p', '--prompt', '-C', '--close-from', '-D', '--chdir',
    '-r', '--role', '-t', '--type', '-U', '--other-user', '-T', '--command-timeout', '-R', '--chroot']),
  env: new Set(['-u', '--unset', '-C', '--chdir', '-S', '--split-string']),
  timeout: new Set(['-s', '--signal', '-k', '--kill-after']),
  nice: new Set(['-n', '--adjustment']),
  xargs: new Set(['-I', '-n', '-L', '-P', '-d', '-E', '-s', '-a', '--max-args', '--max-lines', '--max-procs',
    '--delimiter', '--eof', '--max-chars', '--arg-file', '--replace']),
};
function saltarEnvoltorio(nombre, tokens, i) {
  const conValor = ENVOLTORIO_CON_VALOR[nombre];
  if (!conValor) return i;
  let k = i + 1;
  while (k < tokens.length && tokens[k].startsWith('-') && tokens[k] !== '--') k += conValor.has(tokens[k]) ? 2 : 1;
  if (tokens[k] === '--') k++;
  if (nombre === 'timeout') { // la duración es obligatoria: `timeout /t 5` de cmd no es este timeout
    if (!/^\d+(\.\d+)?[smhd]?$/.test(tokens[k] || '')) return i;
    k++;
  }
  return k < tokens.length ? k : i;
}
function cabeza(tokens) {
  let i = 0;
  for (;;) {
    while (i < tokens.length && (/^[A-Za-z_]\w*=/.test(tokens[i]) || PREFIJOS.has(tokens[i]))) i++;
    const nombre = i < tokens.length ? nombreDe(tokens[i]) : '';
    const j = saltarEnvoltorio(nombre, tokens, i);
    if (j === i) return { i, nombre };
    i = j;
  }
}

// Ruta tal como la escribe una shell → ruta para Node. Expande `~`, `$HOME`, `$env:VAR`, `${VAR}` y
// `%VAR%` con el entorno, y en Windows pasa `/c/…` (Git Bash) y `/cygdrive/c/…` a `C:/…`. Devuelve null
// si queda una variable sin resolver: ese directorio no se sabe.
function rutaShell(p) {
  let r = String(p)
    .replace(/^~(?=$|[\\/])/, () => require('node:os').homedir())
    .replace(/\$env:(\w+)|\$\{(\w+)\}|\$(\w+)|%(\w+)%/gi, (m, a, b, c, d) => {
      const v = process.env[a || b || c || d] || (/^home$/i.test(a || b || c || d) ? require('node:os').homedir() : undefined);
      return v === undefined ? '\0' : v;
    });
  if (r.includes('\0')) return null;
  if (process.platform === 'win32') r = r.replace(/^\/(?:cygdrive\/)?([a-z])(?=\/|$)/i, '$1:');
  return r;
}

// `git [-C dir] [-c k=v] [--opción] <sub> …` → { sub, args, dir }. `-C` es acumulativo, como en git.
function gitSub(tokens, i, cwd) {
  let j = i + 1;
  let dir = cwd;
  while (j < tokens.length && tokens[j].startsWith('-')) {
    const t = tokens[j];
    if (t === '-C') { dir = resolve(dir, rutaShell(tokens[j + 1] || '.') || '.'); j += 2; continue; }
    if (t === '-c' || t === '--git-dir' || t === '--work-tree' || t === '--namespace') { j += 2; continue; }
    j++;
  }
  return { sub: tokens[j] || '', args: tokens.slice(j + 1), dir };
}

// `gh [-R dueño/repo] <grupo> <sub> …` → los tokens desde el grupo, sin las opciones globales.
function ghArgs(tokens, i) {
  let j = i + 1;
  while (j < tokens.length && tokens[j].startsWith('-')) j += tokens[j] === '-R' || tokens[j] === '--repo' ? 2 : 1;
  return tokens.slice(j);
}

// Destino de un cambio de directorio, o null si no se sabe (`cd -`, una variable sin valor).
// '' es el home (`cd` pelado).
const CAMBIA_DIR = new Set(['cd', 'chdir', 'set-location', 'sl', 'pushd', 'push-location']);
function destinoCd(args) {
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    if (/^-(path|literalpath)$/i.test(t)) return args[k + 1] === undefined ? null : rutaShell(args[k + 1]);
    if (/^-(stackname|passthru)$/i.test(t)) { if (/^-stackname$/i.test(t)) k++; continue; }
    if (t === '-') return null;
    if (t === '--' || /^-[LPe@]+$/.test(t) || /^\/d$/i.test(t)) continue;
    return rutaShell(t);
  }
  return '';
}

// Si el comando ejecuta un texto como shell (`bash -c "…"`, `sh -c`, `cmd /c …`, `pwsh -Command …`,
// `powershell -Command …`, `eval "…"` en la shell de la línea, `iex "…"`/`Invoke-Expression "…"` en
// PowerShell), ese texto y su sintaxis; si no, null.
function textoDeShell(nombre, args, shell) {
  if (/^((ba|z|k|da)?sh)$/.test(nombre)) {
    const k = args.findIndex((t) => /^-[a-z]*c[a-z]*$/.test(t));
    return k >= 0 && args[k + 1] !== undefined ? { texto: args[k + 1], shell: 'Bash' } : null;
  }
  if (nombre === 'cmd') {
    const k = args.findIndex((t) => /^\/[ck]$/i.test(t));
    return k >= 0 ? { texto: args.slice(k + 1).join(' '), shell: 'Bash' } : null;
  }
  if (nombre === 'pwsh' || nombre === 'powershell') {
    const k = args.findIndex((t) => /^-c(o(m(m(a(nd?)?)?)?)?)?$/i.test(t));
    return k >= 0 ? { texto: args.slice(k + 1).join(' '), shell: 'PowerShell' } : null;
  }
  if (nombre === 'eval') return args.length ? { texto: args.join(' '), shell } : null;
  if (nombre === 'iex' || nombre === 'invoke-expression') {
    const resto = args.filter((t) => !/^-command$/i.test(t));
    return resto.length ? { texto: resto.join(' '), shell: 'PowerShell' } : null;
  }
  return null;
}

// Recorre los comandos simples de la línea con el directorio en que corre cada uno: sigue `cd`,
// `chdir`, `Set-Location`/`sl`, `pushd`/`Push-Location` y `popd`/`Pop-Location` (como si fuera un
// `git -C`), y entra en el texto que también se ejecuta: el de `bash -c`, `cmd /c`, `pwsh -Command`,
// `eval` e `iex`, y el de las sustituciones `$( … )` y `` `…` `` (estas, antes que su comando). Un `cd`
// dentro de `( … )` en Bash deja de contar al cerrar el paréntesis: es una subshell.
// Devuelve [{ tokens, sep, i, nombre, dir, prof }] en orden de ejecución; `prof` es el nivel de
// anidamiento (0 en la línea de fuera). Si un `cd` va a un sitio que no se sabe, `dir` se queda igual.
function recorrer(cmd, shell, cwd, prof = 0) {
  const out = [];
  const pila = [];
  const grupos = []; // directorio y pila de pushd al abrir cada `(`
  let dir = cwd;
  for (const { tokens, sep, subs, grupo } of trocear(sinHeredocs(cmd), shell)) {
    if (grupo === '(') { grupos.push({ dir, pila: [...pila] }); continue; }
    if (grupo === ')') {
      const g = grupos.pop();
      if (g) { dir = g.dir; pila.splice(0, pila.length, ...g.pila); }
      continue;
    }
    if (prof < 3) for (const s of subs) out.push(...recorrer(s, shell, dir, prof + 1));
    const { i, nombre } = cabeza(tokens);
    out.push({ tokens, sep, i, nombre, dir, prof });
    const args = tokens.slice(i + 1);
    if (CAMBIA_DIR.has(nombre)) {
      const d = destinoCd(args);
      if (d === null) continue;
      if (nombre === 'pushd' || nombre === 'push-location') pila.push(dir);
      dir = d === '' ? require('node:os').homedir() : resolve(dir, d);
      continue;
    }
    if (nombre === 'popd' || nombre === 'pop-location') { if (pila.length) dir = pila.pop(); continue; }
    const dentro = prof < 3 ? textoDeShell(nombre, args, shell) : null;
    if (dentro) out.push(...recorrer(dentro.texto, dentro.shell, dir, prof + 1));
  }
  return out;
}
// ── fin del troceo ──────────────────────────────────────────────────────────────────────────────

// git que devuelve la salida recortada, o null si falla (sin git, sin repo, ref que no existe).
function git(args, dir) {
  try {
    return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// Rama que cuenta en cada repo a lo largo de la línea: la real o la que dejó un checkout/switch previo.
function crearEstado() {
  const raices = new Map();
  const ramas = new Map();
  const raizDe = (dir) => {
    if (!raices.has(dir)) raices.set(dir, git(['rev-parse', '--show-toplevel'], dir));
    return raices.get(dir);
  };
  return {
    // null si no se sabe (sin git o sin repo); '' con HEAD suelto.
    rama(dir) {
      const r = raizDe(dir);
      return r && ramas.has(r) ? ramas.get(r) : (git(['branch', '--show-current'], dir) || git(['rev-parse', '--abbrev-ref', 'HEAD'], dir));
    },
    cambiar(dir, rama) {
      const r = raizDe(dir);
      if (r) ramas.set(r, rama);
    },
    existe(dir, rama) {
      return git(['rev-parse', '--verify', '-q', `refs/heads/${rama}`], dir) !== null ||
        git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${rama}`], dir) !== null;
    },
    // Nombres de los remotos configurados (`git remote`): [] si no hay o no se sabe.
    remotos(dir) {
      return (git(['remote'], dir) || '').split(/\r?\n/).filter(Boolean);
    },
  };
}

// `origin/main` o `refs/remotes/origin/main` → `main`, si el prefijo es un remoto real; si no, null.
function sinRemoto(ref, remotos) {
  const r = ref.replace(/^refs\/remotes\//, '');
  const remoto = remotos.filter((n) => r.startsWith(`${n}/`)).sort((a, b) => b.length - a.length)[0];
  return remoto ? r.slice(remoto.length + 1) : null;
}

// Rama en la que deja un `git checkout`/`git switch`: su nombre, '' si suelta HEAD, o undefined si no
// cambia de rama (`git checkout -- f`, `git checkout rama f`) o no se sabe (`git checkout -`).
// Con `-t`/`--track` y sin `-b`/`-c`, la rama que crea y activa es la remota sin el prefijo del remoto
// (`git checkout -t origin/main` → `main`).
function ramaTrasCambio(sub, args, dir, estado) {
  const crea = new Set(sub === 'switch' ? ['-c', '-C', '--create', '--force-create', '--orphan'] : ['-b', '-B', '--orphan']);
  const pos = [];
  let suelta = false;
  let sigue = false;
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    if (t === '--') return undefined; // restaura ficheros
    if (crea.has(t)) return args[k + 1];
    if (t === '--detach' || (sub === 'switch' && t === '-d')) { suelta = true; continue; }
    if (t === '-t' || t === '--track' || t.startsWith('--track=')) { sigue = true; continue; }
    if (t.startsWith('-')) continue;
    pos.push(t);
  }
  if (suelta) return '';
  const destino = pos[0];
  if (!destino || destino === '-') return undefined;
  if (sigue) {
    const local = sinRemoto(destino, estado.remotos(dir));
    return local !== null ? local : destino.replace(/^refs\/remotes\//, '').replace(/^[^/]+\//, '');
  }
  if (sub === 'checkout' && pos.length > 1) return undefined; // `git checkout rama fichero`
  if (sub === 'switch' || PROTEGIDAS.includes(destino) || estado.existe(dir, destino)) return destino;
  return undefined; // puede ser un fichero: la rama no cambia
}

// Destino de un refspec: `+HEAD:refs/heads/main` → `main`; `HEAD`, `@` o `HEAD:HEAD` → la rama actual.
// Un refspec sin `:` (`main`) va a la rama remota del mismo nombre, no a la actual.
function destino(refspec, dir, estado) {
  const d = (refspec.includes(':') ? refspec.split(':').pop() : refspec).replace(/^\+/, '').replace(/^refs\/heads\//, '');
  if (d === 'HEAD' || d === '@') return estado.rama(dir) || '';
  return d;
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Rama protegida a la que llega un destino, o undefined. Un destino con `*` (`refs/heads/*`, `*`) es un
// patrón: cuenta si casa con alguna protegida.
function protegidaEn(d) {
  if (!d.includes('*')) return PROTEGIDAS.includes(d) ? d : undefined;
  const re = new RegExp(`^${d.split('*').map(escapar).join('.*')}$`);
  return PROTEGIDAS.find((p) => re.test(p));
}

// Opciones de `git merge` que consumen el token siguiente.
const MERGE_CON_VALOR = new Set(['-m', '-F', '-s', '-X', '--message', '--file', '--strategy', '--strategy-option', '--into-name', '--cleanup']);
// Opciones de `git push` que consumen el token siguiente (`--signed` no: su valor, si lo lleva, va con `=`).
const PUSH_CON_VALOR = new Set(['--repo', '--receive-pack', '--exec', '-o', '--push-option']);
// Opciones de `git pull` que consumen el token siguiente.
const PULL_CON_VALOR = new Set(['-s', '-X', '--strategy', '--strategy-option', '--depth', '--deepen', '--shallow-since',
  '--shallow-exclude', '-j', '--jobs', '--upload-pack', '-o', '--server-option', '--negotiation-tip']);

// Analiza un comando simple. Devuelve el motivo del bloqueo o null.
function analizar({ tokens, i, nombre, dir: dirCmd }, estado) {
  if (nombre === 'gh') {
    const a = ghArgs(tokens, i);
    if (a[0] === 'pr' && a[1] === 'merge') return 'gh pr merge: la PR se mergea desde la web del remoto, no desde la terminal';
    if (a[0] === 'api' && a.some((t) => /(^|\/)pulls\/[^/\s]+\/merge\/?$/.test(t))) {
      let metodo = '';
      for (let k = 1; k < a.length; k++) {
        const m = /^(?:-X|--method)=?(.*)$/.exec(a[k]);
        if (m) metodo = m[1] || a[k + 1] || '';
      }
      if (metodo.toUpperCase() === 'PUT') return 'gh api … /pulls/N/merge con PUT mergea la PR desde la terminal';
    }
    return null;
  }

  if (nombre !== 'git') return null;
  const { sub, args: resto, dir } = gitSub(tokens, i, dirCmd);

  if (sub === 'checkout' || sub === 'switch') {
    const r = ramaTrasCambio(sub, resto, dir, estado);
    if (r !== undefined) estado.cambiar(dir, r);
    return null;
  }

  if (sub === 'merge') {
    if (resto.some((t) => t === '--abort' || t === '--quit')) return null;
    const rama = estado.rama(dir);
    if (rama === null) return 'git merge sin poder comprobar la rama actual';
    if (!PROTEGIDAS.includes(rama)) return null;
    if (resto.includes('--ff-only')) return null; // solo avanza la rama: no crea un merge
    const fuentes = [];
    for (let k = 0; k < resto.length; k++) {
      if (resto[k].startsWith('-')) { if (MERGE_CON_VALOR.has(resto[k])) k++; continue; }
      fuentes.push(resto[k]);
    }
    // Su propia rama remota: `@{u}`, o `<remoto>/<rama>` con un remoto que exista (`fix/main` no lo es).
    const arriba = new RegExp(`^(${escapar(rama)})?@\\{(u|upstream)\\}$`);
    const remotos = estado.remotos(dir);
    const propia = (f) => arriba.test(f) || sinRemoto(f, remotos) === rama;
    if (fuentes.length && fuentes.every(propia)) return null;
    return `git merge estando en \`${rama}\`, que es rama protegida`;
  }

  if (sub === 'pull') {
    // `git pull <remoto> <refspec>` sin --rebase ni --ff-only hace un merge en la rama actual.
    const rebase = (t) => t === '-r' || t === '--ff-only' || (/^--rebase(=|$)/.test(t) && t !== '--rebase=false');
    if (resto.some(rebase)) return null;
    const pos = [];
    for (let k = 0; k < resto.length; k++) {
      if (resto[k].startsWith('-')) { if (PULL_CON_VALOR.has(resto[k])) k++; continue; }
      pos.push(resto[k]);
    }
    const refspecs = pos.slice(1); // pos[0] es el remoto
    if (refspecs.length === 0) return null; // sin refspec, su propia rama remota
    const rama = estado.rama(dir);
    if (rama === null) return 'git pull sin poder comprobar la rama actual';
    if (!PROTEGIDAS.includes(rama)) return null;
    const fuente = (r) => (r.includes(':') ? r.split(':')[0] : r).replace(/^\+/, '').replace(/^refs\/heads\//, '');
    if (refspecs.every((r) => fuente(r) === rama)) return null; // la misma rama del remoto
    return `git pull de otra rama estando en \`${rama}\`, que es rama protegida: es un merge`;
  }

  if (sub === 'push') {
    if (resto.includes('--all') || resto.includes('--mirror') || resto.includes('--branches')) {
      return 'git push --all/--mirror arrastra también las ramas protegidas';
    }
    const args = [];
    let conRepo = false; // con --repo el remoto ya está dicho: los posicionales son todos refspecs
    for (let j = 0; j < resto.length; j++) {
      const t = resto[j];
      if (t === '--repo' || t.startsWith('--repo=')) conRepo = true;
      if (t.startsWith('-')) { if (PUSH_CON_VALOR.has(t)) j++; continue; }
      args.push(t);
    }
    const refspecs = conRepo ? args : args.slice(1); // sin --repo, args[0] es el remoto
    if (refspecs.length === 0) {
      // Sin refspec, git empuja la rama actual.
      const rama = estado.rama(dir);
      if (rama && PROTEGIDAS.includes(rama)) return `git push estando en \`${rama}\`, que es rama protegida`;
      return null;
    }
    const prot = refspecs.map((r) => protegidaEn(destino(r, dir, estado))).find(Boolean);
    if (prot) return `git push con destino \`${prot}\`, que es rama protegida`;
  }

  return null;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let cmd = '';
  let shell = 'Bash';
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(input.replace(/^\uFEFF/, '').trim() || '{}');
    ({ cmd, shell } = leerComando(payload));
    if (payload.cwd) cwd = payload.cwd;
  } catch {
    // Si no se puede parsear, no bloquear (fail-open: mejor permitir que romper el flujo).
    process.exit(0);
  }
  if (!/\b(git|gh)\b/i.test(cmd)) process.exit(0); // ni git ni gh: no es asunto de este hook

  const estado = crearEstado();
  for (const c of recorrer(cmd, shell, resolve(cwd))) {
    const motivo = analizar(c, estado);
    if (!motivo) continue;
    console.error('');
    console.error(`[block-protected-merges] BLOQUEADO: ${motivo}.`);
    console.error(`[block-protected-merges] Ramas protegidas: ${PROTEGIDAS.join(', ')}.`);
    console.error('[block-protected-merges] Flujo correcto: rama feat/* o feature/*, fix/*, chore/* → push → PR (/pr) → merge desde la web.');
    console.error('[block-protected-merges] Hotfix urgente: pide autorización explícita al usuario.');
    console.error('');
    process.exit(2);
  }

  process.exit(0);
});
