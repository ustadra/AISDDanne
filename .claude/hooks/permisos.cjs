#!/usr/bin/env node
// permisos — los `deny` de .claude/settings.json en los runtimes que no los leen.
// PreToolUse sobre órdenes de shell. Exit 2 → bloquea y dice qué regla. No va cableado en Claude Code, que
// aplica sus permisos por su cuenta: lo lanza adaptador.cjs antes de los demás guardas en Antigravity,
// Gemini CLI y Codex.
//
// Qué aplica, a cada comando de la línea tal como lo ve el troceo (sin comillas, un espacio entre
// argumentos, el ejecutable sin ruta ni .exe, sin `sudo`/`env`/`timeout`, con lo de `bash -c`, `$( … )` y
// las subshells, git sin sus opciones globales `-C` y `-c`, y las banderas cortas sueltas y ordenadas:
// `rm -fr` y `rm -r -f` son `rm -rf`):
//   · `Bash(…)` y `PowerShell(…)`: `x:*` es un prefijo que no sigue la palabra (`curl:*` no es `curly`, pero
//     `cat .env:*` sí es `cat .env.local`); `*` es cualquier cosa. Sin distinguir mayúsculas.
//   · `Read(…)`: tanto sobre las herramientas de lectura de ficheros (`Read`, `read_file`, `view_file`…)
//     como sobre las órdenes que sacan un fichero por la shell (cat, type, Get-Content, less, head, grep…),
//     cada ruta se compara con el glob: `read_file .env` o `cat ./.env.local` es `Read(**/.env.*)`.
// Las reglas salen siempre del kit en que vive este fichero y, además, del repo en que corre la orden: una
// orden que apunta a otro repo no se libra de las del kit.
// Fail-open: un payload que no entiende no bloquea.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { resolve } = path;

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

const RAIZ_KIT = path.resolve(__dirname, '..', '..');

// Las órdenes que sacan el contenido de un fichero por la shell.
const LECTORES = new Set(['cat', 'tac', 'type', 'get-content', 'gc', 'less', 'more', 'head', 'tail', 'bat', 'nl',
  'strings', 'xxd', 'od', 'hexdump', 'sed', 'awk', 'grep', 'egrep', 'rg', 'findstr', 'select-string', 'sls', 'base64',
  'cp', 'copy', 'copy-item', 'scp', 'curl', 'wget']);

function raizDelRepo(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim();
  } catch {
    return '';
  }
}

// Banderas cortas agrupadas o sueltas (`-fr`, `-r -f`) → sueltas y ordenadas (`-f -r`). Solo hasta tres
// letras: `-Force` o `-Recurse` de PowerShell son palabras, no grupos.
function canonico(tokens) {
  const out = [];
  let racha = [];
  const volcar = () => { out.push(...racha.sort()); racha = []; };
  for (const t of tokens) {
    if (/^-[A-Za-z]{1,3}$/.test(t)) { for (const c of t.slice(1)) racha.push(`-${c}`); continue; }
    volcar();
    out.push(t);
  }
  volcar();
  return out.join(' ');
}

const escapar = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

// Un glob de `Read(…)` → regex sobre una ruta con `/`. `**/` es cualquier carpeta (o ninguna).
function deGlob(glob) {
  const g = glob.replace(/\\/g, '/');
  let re = '';
  for (let k = 0; k < g.length; k++) {
    if (g.startsWith('**/', k)) { re += '(?:.*/)?'; k += 2; continue; }
    if (g.startsWith('**', k)) { re += '.*'; k += 1; continue; }
    re += g[k] === '*' ? '[^/]*' : escapar(g[k]);
  }
  return new RegExp(`^(?:.*/)?${re}$`, 'i');
}

function leerReglas(raices) {
  const ordenes = [];
  const lecturas = [];
  for (const raiz of raices) {
    for (const f of ['settings.json', 'settings.local.json']) {
      let deny;
      try { deny = JSON.parse(fs.readFileSync(path.join(raiz, '.claude', f), 'utf8').replace(/^﻿/, '')).permissions.deny; } catch { continue; }
      for (const d of Array.isArray(deny) ? deny : []) {
        const m = /^(Bash|PowerShell|Read)\((.+)\)$/.exec(String(d));
        if (!m) continue;
        if (m[1] === 'Read') { lecturas.push({ regla: d, re: deGlob(m[2]) }); continue; }
        const prefijo = m[2].endsWith(':*');
        const texto = canonico((prefijo ? m[2].slice(0, -2) : m[2]).trim().split(/\s+/));
        const patron = escapar(texto).replace(/\*/g, '.*');
        ordenes.push({ regla: d, re: new RegExp(`^${patron}${prefijo ? '(?![A-Za-z0-9_]).*' : ''}$`, 'is') });
      }
    }
  }
  return { ordenes, lecturas };
}

// El texto con que se comparan las reglas: el comando y sus argumentos, git sin sus opciones globales.
function textoDe({ tokens, i, nombre, dir }) {
  if (!nombre) return '';
  if (nombre === 'git') {
    const { sub, args } = gitSub(tokens, i, dir);
    return canonico(['git', sub, ...args]);
  }
  return canonico([nombre, ...tokens.slice(i + 1)]);
}

function analizar(cmd, shell, cwd) {
  const raices = [...new Set([RAIZ_KIT, raizDelRepo(cwd)].filter(Boolean))];
  const { ordenes, lecturas } = leerReglas(raices);
  if (!ordenes.length && !lecturas.length) return null;
  for (const c of recorrer(cmd, shell, cwd)) {
    const texto = textoDe(c);
    if (!texto) continue;
    const orden = ordenes.find(({ re }) => re.test(texto));
    if (orden) return `${orden.regla}: \`${texto.slice(0, 120)}\``;
    if (!LECTORES.has(c.nombre)) continue;
    for (const a of c.tokens.slice(c.i + 1)) {
      if (a.startsWith('-')) continue;
      const ruta = a.replace(/\\/g, '/').replace(/^\.\//, '');
      const lectura = lecturas.find(({ re }) => re.test(ruta));
      if (lectura) return `${lectura.regla}: \`${c.nombre} ${a}\``;
    }
  }
  return null;
}

function analizarLectura(fichero, cwd) {
  const rutaAbs = resolve(cwd, rutaShell(fichero) || fichero);
  const raiz = raizDelRepo(cwd);
  const raices = [...new Set([RAIZ_KIT, raiz].filter(Boolean))];
  const { lecturas } = leerReglas(raices);
  if (!lecturas.length) return null;
  const rel = raiz ? path.relative(raiz, rutaAbs).replace(/\\/g, '/') : '';
  const limpia = String(fichero).replace(/\\/g, '/').replace(/^\.\//, '');
  for (const c of [rutaAbs.replace(/\\/g, '/'), rel && !rel.startsWith('..') ? rel : '', limpia].filter(Boolean)) {
    const lectura = lecturas.find(({ re }) => re.test(c));
    if (lectura) return `${lectura.regla}: \`${rel && !rel.startsWith('..') ? rel : limpia}\``;
  }
  return null;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let cmd = '';
  let shell = 'Bash';
  let fichero = '';
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(input.replace(/^﻿/, '').trim() || '{}');
    if (payload.tool_name === 'Read' && payload.tool_input && typeof payload.tool_input.file_path === 'string') {
      fichero = payload.tool_input.file_path;
    } else {
      ({ cmd, shell } = leerComando(payload));
    }
    if (payload.cwd) cwd = payload.cwd;
  } catch {
    process.exit(0); // fail-open
  }
  if (!cmd && !fichero) process.exit(0);
  let motivo = null;
  try {
    motivo = fichero ? analizarLectura(fichero, resolve(cwd)) : analizar(cmd, shell, resolve(cwd));
  } catch { process.exit(0); }
  if (!motivo) process.exit(0);
  console.error('');
  console.error(`[permisos] BLOQUEADO por permissions.deny de .claude/settings.json → ${motivo}`);
  console.error('[permisos] Es una orden o lectura prohibida en este repo. Si de verdad hace falta, pídesela a la persona.');
  console.error('');
  process.exit(2);
});
