#!/usr/bin/env node
// vendor-gate — el código ajeno entra por /vendoriza, no por la puerta de atrás.
// PreToolUse hook sobre Bash | PowerShell. Exit 2 → bloquea y explica por dónde se pasa.
//
// El fallo que ataca: AGENTS.md prohíbe «clonar, instalar o copiar código de terceros sin pasar
// antes por /vendoriza», y eso era prosa. Un modelo la cumple casi siempre; «casi» no es
// determinista. Esto lo es.
//
// Lo que NO hace: forzar que se invoque /vendoriza. Ningún hook puede. Cierra la vía alternativa
// y dice adónde ir.
//
// Qué bloquea (solo lo que está en posición de comando: el texto de un heredoc, de un -m "…" o de
// un echo no cuenta; el de `bash -c`, `cmd /c` o `pwsh -Command`, sí):
//   · ejecutar lo que se descarga: `npx`/`bunx`/`npm exec`/`npm x`/`bun x`/`pnpx` de algo que no está
//     instalado en el repo o con versión (`npx pkg@1`), `pnpm dlx`/`yarn dlx`, `pipx run`, `uvx`,
//     `uv tool run`, `npm|pnpm|yarn|bun create` y `npm init <x>`; las tuberías de una descarga a un
//     intérprete (`curl … | sh`, `curl … | python3`, `irm … | iex`, también a través de `tee`:
//     `curl … | tee f | sh`), `iex`/`Invoke-Expression` con cualquier descarga en la misma línea
//     (`iex (irm …)`, `DownloadString`), `bash -c "$(curl …)"`, `eval "$(curl …)"`,
//     `python3 -c "$(curl …)"`, `node -e "$(curl …)"`, `bash <(curl …)` y descargar a un fichero y
//     ejecutarlo en la misma línea (`curl … -o i.sh && bash i.sh`, `./i.sh`);
//   · traer un repo dentro del repo: `git clone` / `gh repo clone` con destino dentro (resuelto tras
//     los `cd` previos), `git submodule add`, `git subtree add`;
//   · siempre, con o sin `--estricto`: instalar desde una URL o un repo git (`pip install git+https://…`,
//     `pnpm add github:u/r`, `npm i https://…`, `cargo install --git …`), y en npm/pnpm/yarn/bun un
//     `usuario/repo` sin `@` delante que no es ruta local, que es un repo de GitHub (`npm i expressjs/express`);
//   · solo con `--estricto`: instalar un paquete con nombre (`pnpm add x`, `pip install x`, `uv add x`,
//     `pipx install x`, `uv tool install x`, `go install x@v`, `cargo install x`).
//
// Lo que se permite a propósito:
//   · clonar FUERA del repo (scratchpad): es justo lo que hace /vendoriza en su fase de contención.
//     Un gate que rompe a la skill que lo justifica no sirve de nada.
//   · `npx <bin>` cuando `<bin>` ya está en node_modules/.bin (`npx tsc`, `npx vitest`, `npx playwright`):
//     es la dependencia ya instalada, no una descarga.
//   · `npm install` / `pnpm install` pelados y `pip install -r requirements.txt`: restauran desde
//     lockfile o manifiesto ya versionado, son trabajo ordinario.

const { execFileSync } = require('node:child_process');
const { existsSync, realpathSync } = require('node:fs');
const { resolve, relative, isAbsolute, join, dirname, basename } = require('node:path');

// Añadir una dependencia normal (`pnpm add zod`) también trae código de terceros, pero en un repo de
// producto con desarrollo activo bloquearlo cada vez es ruido. Un kit sin dependencias propias, como
// AI_SDD (markdown y unos pocos scripts), sí lo bloquea: lo activa con el argumento `--estricto` en su
// .claude/settings.json. La plantilla de los repos generados no lo pasa; un repo que quiera el mismo
// rigor solo tiene que añadirlo a su cableado, sin tocar este fichero.
const BLOQUEAR_ADD = process.argv.includes('--estricto');

// Flags que consumen el token siguiente: su valor no es «un paquete».
const FLAGS_CON_VALOR = new Set([
  '-r', '--requirement', '-b', '--branch', '-o', '--origin', '-c', '--config',
  '--depth', '--filter', '--reference', '--separate-git-dir', '-j', '--jobs',
  '--shallow-since', '--shallow-exclude', '-u', '--upload-pack', '--index-url',
  '-i', '--extra-index-url', '--target', '-t', '--registry', '--dir', '--prefix',
  '--name',
]);

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

// De los tokens que siguen a una posición, los que no son flags ni valor de flag.
function argumentosReales(tokens, desde) {
  const out = [];
  for (let i = desde; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--') continue;
    if (t.startsWith('-')) {
      if (FLAGS_CON_VALOR.has(t)) i++;
      continue;
    }
    out.push(t);
  }
  return out;
}

function raizDelRepo(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return cwd;
  }
}

// Ruta real: en Windows deshace los nombres cortos (C:\Users\NOMBRE~1) y unifica mayúsculas, para que
// la raíz que da git y la ruta del comando se puedan comparar. Si la ruta aún no existe (el destino
// de un clon), resuelve la parte que sí existe y le pega el resto.
function real(p) {
  const resto = [];
  let d = p;
  for (;;) {
    try { return join(realpathSync.native(d), ...resto); } catch { /* sube un nivel */ }
    const padre = dirname(d);
    if (padre === d) return p;
    resto.unshift(basename(d));
    d = padre;
  }
}

function dentroDelRepo(destino, raiz, cwd) {
  const abs = isAbsolute(destino) ? destino : resolve(cwd, destino);
  const rel = relative(real(raiz), real(abs));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

// ¿Está `bin` instalado en algún node_modules/.bin entre el cwd y la raíz del repo?
function binLocal(bin, cwd) {
  const raiz = real(resolve(raizDelRepo(cwd)));
  let dir = real(resolve(cwd));
  for (;;) {
    const d = join(dir, 'node_modules', '.bin');
    if (existsSync(join(d, bin)) || existsSync(join(d, `${bin}.cmd`))) return true;
    if (relative(raiz, dir) === '' || dirname(dir) === dir) return false;
    dir = dirname(dir);
  }
}

// `npx` y sus equivalentes: null si ejecuta una dependencia ya instalada; si no, el motivo.
function npxRemoto(nombre, args, cwd) {
  let bin = null;
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    if (t === '-p' || t === '--package' || t.startsWith('--package=')) return `${nombre} --package descarga el paquete que nombra`;
    if (t === '-c' || t === '--call') return `${nombre} --call ejecuta un comando con paquetes que puede descargar`;
    if (t === '--') continue;
    if (t.startsWith('-')) continue;
    bin = t;
    break;
  }
  if (!bin) return null; // `npx` pelado no ejecuta nada
  // Con versión (`pkg@1`, `@scope/pkg@latest`), URL o ruta git: siempre es una descarga.
  if (/^@?[^@]+@/.test(bin) || /[:\\]/.test(bin) || (!bin.startsWith('@') && bin.includes('/'))) {
    return `${nombre} ${bin}: ejecuta el paquete que descarga`;
  }
  const nombreBin = bin.startsWith('@') ? bin.split('/').pop() : bin; // @biomejs/biome → biome
  if (binLocal(nombreBin, cwd)) return null;
  return `${nombre} ${bin}: no está instalado en el repo, así que lo descarga y lo ejecuta`;
}

// Si el comando es `npx` con otro nombre (`npm exec`, `npm x`, `bun x`, `bunx`, `pnpx`), cómo llamarlo
// en el motivo y sus argumentos; si no, null.
function comoNpx(nombre, args) {
  if (nombre === 'npx' || nombre === 'bunx' || nombre === 'pnpx') return { como: nombre, args };
  if (nombre === 'npm' && (args[0] === 'exec' || args[0] === 'x')) return { como: `npm ${args[0]}`, args: args.slice(1) };
  if (nombre === 'bun' && args[0] === 'x') return { como: 'bun x', args: args.slice(1) };
  return null;
}

// Destino de un clon: el que se nombra o, sin él, la carpeta con el nombre del repo.
function destinoClon(url, destino) {
  return destino || basename(String(url).replace(/[\\/]+$/, '').replace(/\.git$/, '')) || '.';
}

// Instalar desde una URL o un repo git, no desde el registro.
const DESDE_URL = /^(git\+|git:|github:|gitlab:|bitbucket:|gist:|git@|(https?|ssh|ftp|file):\/\/)/i;
// Flags cuyo valor es lo que se instala (`pip install -e git+https://…`, `cargo install --git …`).
const FLAGS_PAQUETE = new Set(['-e', '--editable', '--git']);
// Ruta local: `go install ./cmd/x`, `cargo install --path .` no traen código de fuera.
const LOCAL = /^(\.{1,2}([\\/]|$)|[\\/]|[A-Za-z]:[\\/])/;
// Gestores de Node: ahí `usuario/repo` sin `@` delante es un repo de GitHub (`npm i expressjs/express`).
const DE_NODE = ['npm', 'pnpm', 'yarn', 'bun'];
// Un token con `/` que no es un paquete con scope (`@scope/pkg`), ni una ruta local (`./`, `../`, `/`,
// `X:`, `~/`, `file:`/`link:`), ni un tarball (`.tgz`, `.tar.gz`, `.tar`).
const repoGithub = (t) => t.includes('/') && !t.startsWith('@') && !LOCAL.test(t) && !/^(~[\\/]|(file|link|portal):)/.test(t) &&
  !/\.(tgz|tar\.gz|tar)$/i.test(t);

// Si el comando instala paquetes, qué gestor y verbo, qué paquetes con nombre y qué URLs; si no, null.
function instalacion(nombre, args) {
  let gestor = nombre;
  let d = 0;
  if (/^py(thon[0-9.]*)?$/.test(nombre) && args[0] === '-m' && /^pip3?$/.test(args[1] || '')) { gestor = 'pip'; d = 2; }
  const v = args[d];
  let desde = -1;
  let verbo = v;
  if (['npm', 'pnpm', 'yarn', 'bun'].includes(gestor) && ['i', 'install', 'add'].includes(v)) desde = d + 1;
  else if ((/^pip3?$/.test(gestor) || gestor === 'pipx') && v === 'install') desde = d + 1;
  else if (gestor === 'uv' && v === 'add') desde = d + 1;
  else if (gestor === 'uv' && (v === 'pip' || v === 'tool') && args[d + 1] === 'install') { desde = d + 2; verbo = `${v} install`; }
  else if ((gestor === 'go' || gestor === 'cargo') && v === 'install') desde = d + 1;
  if (desde < 0) return null;
  const paquetes = [];
  const urls = [];
  for (let k = desde; k < args.length; k++) {
    const t = args[k];
    if (t === '--') continue;
    const larga = /^(--[^=]+)=(.*)$/.exec(t);
    if (larga) {
      if (FLAGS_PAQUETE.has(larga[1]) && (DESDE_URL.test(larga[2]) || larga[1] === '--git')) urls.push(larga[2]);
      continue;
    }
    if (FLAGS_PAQUETE.has(t)) {
      const valor = args[++k] || '';
      if (DESDE_URL.test(valor) || t === '--git') urls.push(valor);
      continue;
    }
    if (t === '--path') { k++; continue; } // cargo install --path <local>
    if (t.startsWith('-')) { if (FLAGS_CON_VALOR.has(t)) k++; continue; }
    if (DESDE_URL.test(t) || (DE_NODE.includes(gestor) && repoGithub(t))) urls.push(t);
    else if (!((gestor === 'go' || gestor === 'cargo') && LOCAL.test(t))) paquetes.push(t);
  }
  return { gestor, verbo, paquetes, urls };
}

// Descargas y lo que ejecuta lo que le llega por stdin.
const DESCARGAS = new Set(['curl', 'wget', 'iwr', 'irm', 'invoke-webrequest', 'invoke-restmethod', 'start-bitstransfer']);
const SHELLS = /^((ba|z|k|da)?sh|fish)$/;
const INTERPRETES = /^(python[0-9.]*|py|node|deno|bun|perl|ruby|php|pwsh|powershell)$/;
// Ejecutan el texto que reciben como argumento.
const EJECUTAN_TEXTO = new Set(['source', '.', 'eval', 'iex', 'invoke-expression']);
// Un argumento que es la salida de una descarga: `"$(curl …)"`, `` "`wget …`" ``, `<(curl …)`.
const SUSTITUYE_DESCARGA = /(\$\(|`|<\()\s*(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)\b/i;

// Nombre (en minúsculas, sin carpeta) del fichero que deja en disco una descarga: `curl -o f`, `curl -O url`,
// `wget url`, `wget -O f`, `iwr url -OutFile f`, o una redirección `> f`.
function ficherosBajados(nombre, args) {
  const out = [];
  const base = (t) => String(t).replace(/[?#].*$/, '').split(/[\\/]/).pop().toLowerCase();
  const urls = args.filter((t) => /^[a-z][a-z0-9+.-]*:\/\//i.test(t));
  let conNombreRemoto = nombre === 'wget';
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    const red = /^\d?>>?(.*)$/.exec(t); // `> f`, `>f`, `1>f`, `>> f`
    if (red) { out.push(red[1] || args[++k]); continue; }
    if (nombre === 'curl') {
      const largo = /^--output(?:=(.*))?$/.exec(t);
      if (largo) { out.push(largo[1] !== undefined ? largo[1] : args[++k]); continue; }
      if (t === '--remote-name' || t === '--remote-name-all') { conNombreRemoto = true; continue; }
      if (/^-[A-Za-z]+$/.test(t)) {
        if (t.includes('O')) conNombreRemoto = true;
        const p = t.indexOf('o');
        if (p > 0) out.push(t.slice(p + 1) || args[++k]);
      }
      continue;
    }
    if (nombre === 'wget') {
      const largo = /^--output-document(?:=(.*))?$/.exec(t);
      if (largo) { out.push(largo[1] !== undefined ? largo[1] : args[++k]); conNombreRemoto = false; continue; }
      if (/^-O/.test(t)) { out.push(t.slice(2) || args[++k]); conNombreRemoto = false; }
      continue;
    }
    if (/^-(outfile|destination)$/i.test(t)) out.push(args[++k]);
  }
  if (conNombreRemoto) out.push(...urls);
  return out.filter((f) => f && f !== '-' && f !== '/dev/null').map(base).filter(Boolean);
}
// ¿Ejecuta `nombre args` el programa que le llega por stdin? Las shells y `iex`, siempre; un intérprete,
// si no recibe el programa de otro sitio (`-c`, `-e`, `-m`, un script) o recibe `-`.
function ejecutaStdin(nombre, args) {
  if (SHELLS.test(nombre) || nombre === 'iex' || nombre === 'invoke-expression') return true;
  if (!INTERPRETES.test(nombre)) return false;
  if (args.includes('-')) return true;
  if (args.some((t) => /^(-[cemr]|--eval|-command|-file|-encodedcommand)$/i.test(t))) return false;
  return !args.some((t) => !t.startsWith('-'));
}

function analizar(comandos, cwd) {
  // La raíz del repo de la sesión, solo si algún comando la necesita.
  let raiz = null;
  const raizSesion = () => (raiz === null ? (raiz = raizDelRepo(cwd)) : raiz);
  // El siguiente comando del mismo nivel (no uno de dentro de un `bash -c`).
  const hermano = (k) => {
    for (let j = k + 1; j < comandos.length; j++) {
      if (comandos[j].prof === comandos[k].prof) return comandos[j];
      if (comandos[j].prof < comandos[k].prof) return null;
    }
    return null;
  };

  // `iex`/`Invoke-Expression` con cualquier descarga en la misma línea: `iex (irm …)`,
  // `iex ((New-Object Net.WebClient).DownloadString(…))`.
  const hayIex = comandos.some((c) => c.nombre === 'iex' || c.nombre === 'invoke-expression');
  if (hayIex && comandos.some((c) => DESCARGAS.has(c.nombre) || c.tokens.some((t) => /Download(String|Data|File)/i.test(t)))) {
    return { que: 'iex/Invoke-Expression con una descarga en la misma línea: ejecuta lo que baje, sin verlo' };
  }

  const bajados = new Set(); // ficheros que una descarga previa de la línea deja en disco

  for (let k = 0; k < comandos.length; k++) {
    const { tokens, sep, i, nombre, dir } = comandos[k];
    const args = tokens.slice(i + 1);
    const sig = hermano(k);

    // 1. Ejecución de código remoto. El riesgo que /vendoriza nombra explícitamente:
    //    «el riesgo real vive en el install y en ejecutar sus scripts».
    if (DESCARGAS.has(nombre) && sep === '|' && sig) {
      // La tubería sigue más allá de `tee` (`curl … | tee f | sh`): tee pasa lo que recibe.
      let destino = sig;
      while (destino.nombre === 'tee' && destino.sep === '|') {
        const otro = hermano(comandos.indexOf(destino));
        if (!otro) break;
        destino = otro;
      }
      if (ejecutaStdin(destino.nombre, destino.tokens.slice(destino.i + 1))) {
        return { que: `tubería ${nombre} | ${destino.nombre}: ejecuta lo que baje, sin verlo` };
      }
    }
    if (EJECUTAN_TEXTO.has(nombre) || SHELLS.test(nombre) || INTERPRETES.test(nombre)) {
      // `bash -c "$(curl …)"`, `eval "$(curl …)"`, `python3 -c "$(curl …)"`, `node -e "$(curl …)"`,
      // `` sh -c "`wget …`" ``, `bash <(curl …)`, `source <(curl …)`.
      if (args.some((t) => SUSTITUYE_DESCARGA.test(t)) ||
          (/[$<]$/.test(tokens[tokens.length - 1]) && sig && DESCARGAS.has(sig.nombre))) {
        return { que: `${nombre} ejecuta lo que descarga, sin verlo` };
      }
    }
    // Descargar a un fichero y ejecutarlo en la misma línea: `curl … -o i.sh && bash i.sh`, `./i.sh`.
    if (DESCARGAS.has(nombre)) for (const f of ficherosBajados(nombre, args)) bajados.add(f);
    if (bajados.size) {
      const base = (t) => String(t).split(/[\\/]/).pop().toLowerCase();
      const guion = args.find((t) => !t.startsWith('-')); // el script: primer argumento que no es opción
      const ejecuta = bajados.has(base(tokens[i])) ||
        ((EJECUTAN_TEXTO.has(nombre) || SHELLS.test(nombre) || INTERPRETES.test(nombre)) && guion !== undefined && bajados.has(base(guion)));
      if (ejecuta) return { que: `${nombre} ejecuta un fichero que la misma línea acaba de descargar, sin verlo` };
    }
    const npx = comoNpx(nombre, args);
    if (npx) {
      const motivo = npxRemoto(npx.como, npx.args, dir);
      if (motivo) return { que: motivo };
    }
    if ((nombre === 'pnpm' || nombre === 'yarn') && args[0] === 'dlx') return { que: 'dlx ejecuta el paquete que descarga' };
    if (nombre === 'pipx' && args[0] === 'run') return { que: 'pipx run ejecuta el paquete que descarga' };
    if (nombre === 'uvx') return { que: 'uvx ejecuta el paquete que descarga' };
    if (nombre === 'uv' && args[0] === 'tool' && args[1] === 'run') return { que: 'uv tool run ejecuta el paquete que descarga' };
    if (['npm', 'pnpm', 'yarn', 'bun'].includes(nombre) && args[0] === 'create') {
      return { que: `${nombre} create descarga y ejecuta un generador de terceros` };
    }
    if (nombre === 'npm' && args[0] === 'init') {
      const ini = argumentosReales(args.filter((t, n) => !(n > 0 && /^(-w|--workspace)$/.test(args[n - 1])) && !/^(-w|--workspace)$/.test(t)), 1);
      if (ini.length) return { que: `npm init ${ini[0]} descarga y ejecuta un generador de terceros (como npm create)` };
    }

    // 2. Traer un repo ajeno dentro del repo. El destino se resuelve en el directorio del comando.
    if (nombre === 'git') {
      const { sub, args: gargs, dir: gdir } = gitSub(tokens, i, dir);
      if (sub === 'clone') {
        const [url, destino] = argumentosReales(gargs, 0);
        const d = destinoClon(url, destino);
        if (dentroDelRepo(d, raizSesion(), gdir)) return { que: `git clone con destino dentro del repo (${d})` };
      }
      if (sub === 'submodule' && argumentosReales(gargs, 0)[0] === 'add') {
        return { que: 'git submodule add mete un repo ajeno dentro de este' };
      }
      if (sub === 'subtree' && argumentosReales(gargs, 0)[0] === 'add') {
        return { que: 'git subtree add mete un repo ajeno dentro de este' };
      }
    }
    if (nombre === 'gh') {
      const a = ghArgs(tokens, i);
      if (a[0] === 'repo' && a[1] === 'clone') {
        const fin = a.indexOf('--'); // tras `--` van flags para git
        const [repo, destino] = argumentosReales(fin < 0 ? a : a.slice(0, fin), 2);
        const d = destinoClon(repo, destino);
        if (dentroDelRepo(d, raizSesion(), dir)) return { que: `gh repo clone con destino dentro del repo (${d})` };
      }
    }

    // 3. Instalación: desde una URL o un repo git, siempre; con nombre, solo con `--estricto`.
    const inst = instalacion(nombre, args);
    if (inst && inst.urls.length) {
      return { que: `${inst.gestor} ${inst.verbo} ${inst.urls[0]}: instala desde una URL o un repo git, sin pasar por el registro` };
    }
    if (inst && BLOQUEAR_ADD && inst.paquetes.length) {
      return { que: `${inst.gestor} ${inst.verbo} ${inst.paquetes[0]}: trae código de terceros al proyecto` };
    }
  }

  return null;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let cmd = '';
  let shell = 'Bash';
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(input.replace(/^\uFEFF/, '').trim() || '{}');
    ({ cmd, shell } = leerComando(payload));
    if (payload.cwd) cwd = payload.cwd;
  } catch {
    process.exit(0); // fail-open
  }
  if (!cmd) process.exit(0);

  const veredicto = analizar(recorrer(cmd, shell, resolve(cwd)), resolve(cwd));
  if (!veredicto) process.exit(0);

  console.error('');
  console.error(`[vendor-gate] BLOQUEADO: ${veredicto.que}.`);
  console.error('[vendor-gate] El código de terceros entra por /vendoriza: auditoría sin ejecutar,');
  console.error('[vendor-gate] veredicto verde/ámbar/rojo y extracción fichero a fichero con su procedencia.');
  console.error('[vendor-gate] Clonar para auditar SÍ se permite, siempre que el destino esté FUERA del repo.');
  console.error('');
  process.exit(2);
});
