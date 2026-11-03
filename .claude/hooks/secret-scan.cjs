#!/usr/bin/env node
// secret-scan — impide que un secreto entre en el repo.
// PreToolUse hook sobre Bash | PowerShell. Exit 2 → bloquea el commit y muestra el motivo.
//
// Condición binaria: o el patrón de credencial está en lo que se va a commitear, o no está.
// Por eso es hook y no criterio de un agente.
//
// Escanea las líneas que el commit AÑADE:
//   · lo staged: el diff del índice contra HEAD (lo que hay en el índice, no en el disco);
//   · con `-a`/`--all` (o `-am`), también lo modificado sin stagear, que ese flag commitea;
//   · con `git commit <rutas>` o `git commit --pathspec-from-file=f`, esas rutas tal como están en el disco;
//   · si en el mismo comando va antes un `git add …` (`git add . && git commit`, `git add -A; git commit`),
//     lo que ese add va a incluir: lo modificado y los no trackeados no ignorados, filtrados por sus rutas
//     (`git add -A` sin rutas, desde la raíz del repo); con `-f`/`--force`, también los ignorados de
//     las rutas que nombra.
// Respeta `git -C <ruta>` y los `cd`/`Set-Location`/`pushd` previos de la misma línea.
//
// Además, el texto que publican en GitHub `gh issue create|edit|comment|close|reopen` y
// `gh pr create|edit|comment|review|merge|close|reopen` (título o asunto, cuerpo y comentario de cierre: inline,
// `--body-file`/`-F` relativo al directorio de la orden, o la entrada estándar con `-F -`) se
// escanea con los mismos patrones: una issue o una PR no pasan por ningún commit, y un secreto en su
// cuerpo queda publicado igual. Lo usa `/mejora`, que abre issues en el repo del proyecto y en el del kit.
//
// Cada origen se lee con UN proceso git (`git diff -U0` sin renombrados, que da solo las líneas
// añadidas con su número), no dos por fichero: así un commit de cientos de ficheros cabe de sobra en el
// timeout del hook. Si aun así la lectura no termina en TOPE_MS, bloquea y lo dice: un commit que no
// se ha podido escanear no entra.
//
// Port a Node del antiguo secret-scan.sh, con patrones ampliados, para que corra igual en Windows,
// macOS y Linux sin depender de bash ni de grep -E.

const { execFileSync } = require('node:child_process');
const { readFileSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');

// Patrones de alta señal: cada uno busca minimizar el falso positivo.
const PATRONES = [
  { re: /AKIA[0-9A-Z]{16}/,                                   que: 'AWS Access Key ID' },
  { re: /ASIA[0-9A-Z]{16}/,                                   que: 'AWS Temp Access Key ID' },
  { re: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/i,    que: 'AWS Secret Access Key' },
  { re: /(?<![A-Za-z0-9])sk-ant-[A-Za-z0-9_-]{20,}/,          que: 'clave Anthropic' },
  // Límite delante: `task-management-dashboard` no es una clave.
  { re: /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/,              que: 'clave estilo OpenAI/Anthropic' },
  { re: /(?<![A-Za-z0-9])[sr]k_live_[A-Za-z0-9]{20,}/,        que: 'clave secreta de Stripe' },
  { re: /(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{35}/,              que: 'clave de API de Google' },
  { re: /(?<![A-Za-z0-9])glpat-[A-Za-z0-9_-]{20,}/,           que: 'token personal de GitLab' },
  { re: /(?<![A-Za-z0-9])npm_[A-Za-z0-9]{36}/,                que: 'token de npm' },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/,                       que: 'token de Slack' },
  { re: /ghp_[A-Za-z0-9]{36,}/,                               que: 'GitHub personal token' },
  { re: /gho_[A-Za-z0-9]{36,}/,                               que: 'GitHub OAuth token' },
  { re: /ghs_[A-Za-z0-9]{36,}/,                               que: 'GitHub server token' },
  { re: /github_pat_[A-Za-z0-9_]{60,}/,                       que: 'GitHub fine-grained PAT' },
  { re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP |ENCRYPTED )?PRIVATE KEY-----/, que: 'clave privada' },
  { re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, que: 'JWT' },
  // Azure y .NET.
  { re: /AccountKey\s*=\s*[A-Za-z0-9+/]{40,}={0,2}/i,         que: 'clave de cuenta de Azure Storage (AccountKey=)' },
  { re: /SharedAccessKey\s*=\s*[A-Za-z0-9+/]{30,}={0,2}/i,    que: 'clave SAS de Azure Service Bus / Event Hubs (SharedAccessKey=)' },
  { re: /SharedAccessSignature\s*=\s*[^;"'\s<>]{40,}/i,       que: 'firma SAS de Azure (SharedAccessSignature=)' },
  { re: /[?&;\s"']sig=[A-Za-z0-9%+/]{30,}={0,2}/,             que: 'firma SAS de Azure (sig=)' },
  { re: /(?<![A-Za-z0-9_~.-])[A-Za-z0-9_~.-]{3}\dQ~[A-Za-z0-9_~.-]{31,34}(?![A-Za-z0-9_~.-])/, que: 'secreto de cliente de Entra ID' },
];
const PLACEHOLDER = /(example|placeholder|<your|<tu[-_ ]|changeme|xxx+|your_|fake|dummy|\$\{)/i;

// ── Asignaciones `clave = valor` ────────────────────────────────────────────────────────────────
// Solo cuenta una clave que TERMINA en una palabra sensible (`DB_PASSWORD`, `clientSecret`, `api_key`,
// `SECRET_KEY`), con dígitos detrás si acaso (`password2`). Una clave que nombra el secreto sin serlo
// termina en otra cosa y pasa sola: `secretName`, `csrfTokenHeader`, `RESET_PASSWORD_ROUTE`,
// `tokenUrl`, `ACCESS_TOKEN_STORAGE_KEY`, `tokenCacheKey`.
const CLAVE_SENSIBLE = /(password|passwd|pwd|passphrase|secret|token|apikey|accesskey|privatekey|secretkey|signingkey|encryptionkey|authkey|masterkey)\d*$/;
const claveSensible = (clave) => CLAVE_SENSIBLE.test(clave.toLowerCase().replace(/[^a-z0-9]/g, ''));

// Una clave que NOMBRA la variable de entorno donde vive el secreto, no el secreto: empieza por `env_` o
// acaba en `_env` (`env_password` en un catálogo, `password_env`). Exime solo si además el valor tiene
// forma de nombre de variable (NOMBRE_EN_MAYUSCULAS): con esa clave y un valor mezclado, es el secreto.
const CLAVE_REFERENCIA = /^env_|_env$/i;
const NOMBRE_VARIABLE = /^[A-Z][A-Z0-9_]+$/;

// Con comillas, en cualquier punto de la línea: `"api_key": "…"`, `password = '…'`, `Token => "…"`,
// `API_KEY: string = "…"`. Global: en un JSON minificado una clave exenta no esconde la que va detrás.
const ASIG_COMILLAS = /(?<![A-Za-z0-9_.-])([A-Za-z_][A-Za-z0-9_.-]*)["']?(?:\s*:\s*[A-Za-z_][\w<>[\]|]*(?=\s*=))?\s*(?::=|=>|[:=])\s*(?:"((?:\\.|[^"\\\r\n])*)"|'((?:\\.|[^'\\\r\n])*)'|`([^`\r\n]*)`)/g;
// Sin comillas, la línea entera: `KEY=valor` (.env, compose, .properties, scripts), `export KEY=valor`,
// `ENV KEY=valor` (Dockerfile), `key: valor` (YAML), `- KEY=valor` (lista de compose).
const ASIG_LINEA = /^\s*(?:export\s+|set\s+|ENV\s+)?(?:-\s+)?["']?([A-Za-z_][A-Za-z0-9_.-]*)["']?\s*(=|:(?!:))\s*([^\s"'`,;]+)["']?[;,]?\s*(?:#.*)?$/;
// Ficheros de configuración: ahí `clave: valor` y `clave = valor` sin comillas son datos. En código,
// solo `CLAVE=valor` sin espacios (la forma de una variable de shell); `token = obtener()` es una expresión.
const CONFIG = /(^|[\\/])(\.env[^\\/]*|[^\\/]*\.(env|ya?ml|properties|ini|cfg|conf|toml|npmrc|pypirc)|Dockerfile[^\\/]*|\.envrc|[^\\/]*compose[^\\/]*)$/i;

// Valores que no son un secreto: referencias a variables y marcadores de ejemplo.
const VALOR_PLACEHOLDER = /^\s*(<.*>|\$\{.*\}|\$\{\{.*\}\}|\$\(.*\)|\$env:\w+|\$\w+|\{\{.*\}\}|\{.*\}|#\{.*\}#?|%\w+%|__\w+__|\*{3,}|\.{3}|…)\s*$|example|placeholder|changeme|change[_-]me|replace[_-]?me|redacted|your|<tu[-_ ]|fake|dummy|xxx|(pega|paste)[_ -]?(aqui|here)/i;
const LITERALES = /^(true|false|null|none|nil|undefined|yes|no|on|off|required|optional|string|number|boolean)$/i;

// Entropía de Shannon en bits por carácter.
function entropia(v) {
  const n = new Map();
  for (const c of v) n.set(c, (n.get(c) || 0) + 1);
  let h = 0;
  for (const k of n.values()) { const p = k / v.length; h -= p * Math.log2(p); }
  return h;
}
const clases = (v) => [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length;

// Un identificador hecho de palabras (`ForgotPasswordPageTitle`, `Sql-ConnectionString`,
// `X-CSRF-Token-Header`, `accessTokenStorageKey`): solo letras, dos palabras o más y casi todas de 2+
// letras. `abcdefghijklmnopqrstuvwxyz` o `QwErTyUiOp` no lo son.
function esIdentificador(v) {
  if (!/^[A-Za-z]+(?:[-_.][A-Za-z]+)*$/.test(v)) return false;
  const palabras = v.split(/[-_.]|(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/).filter(Boolean);
  if (palabras.length < 2) return false;
  const cortas = palabras.filter((p) => p.length < 2).length;
  const media = palabras.reduce((s, p) => s + p.length, 0) / palabras.length;
  return cortas <= 1 && media >= 3;
}

// ¿Parece un secreto real el valor de una clave sensible? Decide por forma, longitud y entropía.
function valorSecreto(valor, sinComillas) {
  const v = valor.trim();
  if (v.length < 8 || /\s/.test(v) || LITERALES.test(v) || VALOR_PLACEHOLDER.test(v)) return false;
  // URL: sin credenciales no es secreto; con `usuario:clave@`, lo es si la clave no es un placeholder.
  const url = /^[a-z][a-z0-9+.-]*:\/\/(?:([^/@\s]*)@)?/i.exec(v);
  if (url) {
    const pw = url[1] && url[1].includes(':') ? url[1].split(':').slice(1).join(':') : '';
    return pw.length >= 3 && !VALOR_PLACEHOLDER.test(pw);
  }
  // Ruta: `/auth/resetPasswordForm`, `./certs/dev`, `C:\app\cfg`, con dos separadores o más.
  if (/^(?:\.{0,2}[\\/]|~[\\/]|[A-Za-z]:[\\/])[\w.\-\\/]*$/.test(v) && (v.match(/[\\/]/g) || []).length >= 2) return false;
  if (esIdentificador(v)) return false;
  // Sin comillas, una expresión o el acceso a un miembro (`obtener()`, `process.env.TOKEN`) no es un literal.
  if (sinComillas && (/[()[\]{}<>]/.test(v) || /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+[!?]?$/.test(v))) return false;
  const h = entropia(v);
  return (v.length >= 12 && h >= 3) || (v.length >= 20 && h >= 2.5) || (clases(v) >= 3 && h >= 2.75);
}

// ¿Esconde un secreto la asignación `clave = valor`?
function asignacionSecreta(clave, valor, sinComillas) {
  if (!claveSensible(clave.replace(CLAVE_REFERENCIA, ''))) return false;
  if (CLAVE_REFERENCIA.test(clave) && NOMBRE_VARIABLE.test(valor.trim())) return false; // nombra la variable
  return valorSecreto(valor, sinComillas);
}

// La contraseña de un CREATE/ALTER USER o LOGIN en T-SQL: la cláusula WITH PASSWORD seguida de un literal,
// con N delante o sin ella. Un literal de 8 caracteres o más que no sea un placeholder (VALOR_PLACEHOLDER o
// una interpolación) se marca aunque sea de una sola clase de carácter; uno más corto, solo si mezcla clases.
const WITH_PASSWORD = /\bWITH\s+PASSWORD\s*=\s*N?'([^'\r\n]*)'/gi;

// La contraseña (clave Password o Pwd) dentro de una cadena de conexión: la línea nombra también
// Server, Data Source, User ID o UID y separa los pares con punto y coma. Este comentario lo
// describe en prosa a propósito: con el ejemplo literal, el hook se bloqueaba a sí mismo.
const CADENA_CONEXION = /(?:^|[;"'\s])(?:Server|Data Source|User ID|UID)\s*=/i;
const PASSWORD_EN_CADENA = /(?:^|[;"'\s])(?:Password|Pwd)\s*=\s*([^;"'\r\n]+)/i;

// Mezcla de clases de carácter: un identificador en kebab-case (`reset-password-link`) no la tiene.
const mezclaClases = (v) => [/[a-z]/, /[A-Z]/, /\d/].filter((r) => r.test(v)).length >= 2;

// Devuelve qué secreto hay en la línea de `fichero`, o null.
function secretoEn(linea, fichero) {
  for (const p of PATRONES) {
    const m = linea.match(p.re);
    if (m && !PLACEHOLDER.test(m[0])) return p.que;
  }
  for (const w of linea.matchAll(WITH_PASSWORD)) {
    const v = w[1].trim();
    if (v.length < 3 || VALOR_PLACEHOLDER.test(v) || /^\{.*\}$|\$\{|\{\w*\}/.test(v)) continue;
    if (v.length >= 8 || mezclaClases(v)) return 'contraseña en WITH PASSWORD (T-SQL)';
  }
  // La cláusula de T-SQL ya está juzgada: fuera, para que su literal no se lea otra vez como asignación.
  const resto = linea.replace(WITH_PASSWORD, ' ');
  for (const a of resto.matchAll(ASIG_COMILLAS)) {
    const valor = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4];
    if (asignacionSecreta(a[1], valor, false)) return 'asignación sospechosa de secreto';
  }
  const l = ASIG_LINEA.exec(resto);
  if (l && (CONFIG.test(fichero) || (l[2] === '=' && !/\s=|=\s/.test(resto))) && asignacionSecreta(l[1], l[3], true)) {
    return 'asignación sospechosa de secreto';
  }
  if (CADENA_CONEXION.test(linea) && linea.includes(';')) {
    const pw = linea.match(PASSWORD_EN_CADENA);
    if (pw && pw[1].trim().length >= 3 && !VALOR_PLACEHOLDER.test(pw[1])) return 'contraseña en cadena de conexión (Password o Pwd)';
  }
  return null;
}

// Binarios y lockfiles: ni aportan ni se leen bien.
const IGNORAR = /\.(png|jpe?g|gif|webp|pdf|zip|tar|gz|ico|mp4|lock)$|(^|[\\/])(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i;

const MAX_BYTES = 2 * 1024 * 1024; // por fichero: por encima de esto no es código y no se sigue leyendo
// El hook tiene 15 s de timeout en settings.json: margen para arrancar y avisar. SECRET_SCAN_TOPE_MS lo
// baja en las pruebas para comprobar que, sin tiempo, bloquea.
const TOPE_MS = Number(process.env.SECRET_SCAN_TOPE_MS) || 10000;

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

// ── Texto que se publica con gh ─────────────────────────────────────────────────────────────────
const GH_TEXTO = { issue: /^(create|edit|comment|close|reopen)$/, pr: /^(create|edit|comment|review|merge|close|reopen)$/ };
const GH_OPCION = { '-t': 'title', '--title': 'title', '--subject': 'title', '-b': 'body', '--body': 'body', '-F': 'body-file', '--body-file': 'body-file' };
// `-c`/`--comment` lleva texto solo en `close` y `reopen`; en `gh pr review` es un interruptor sin valor.
const GH_COMENTARIO = /^(close|reopen)$/;

// { origen, texto } de cada título y cuerpo que la línea publica con gh.
function textosGh(cmd, shell, cwd) {
  const textos = [];
  for (const { tokens, i, nombre, dir } of recorrer(cmd, shell, cwd)) {
    if (nombre !== 'gh') continue;
    const a = ghArgs(tokens, i);
    if (!GH_TEXTO[a[0]] || !GH_TEXTO[a[0]].test(a[1] || '')) continue;
    const origen = `gh ${a[0]} ${a[1]}`;
    const args = a.slice(2);
    for (let k = 0; k < args.length; k++) {
      const largo = /^--(title|subject|body|body-file|comment)=([\s\S]*)$/.exec(args[k]);
      const comentario = GH_COMENTARIO.test(a[1]) && (args[k] === '-c' || args[k] === '--comment' || (largo && largo[1] === 'comment'));
      if (largo && largo[1] === 'comment' && !comentario) continue;
      const opcion = comentario ? 'body' : largo ? (largo[1] === 'subject' ? 'title' : largo[1]) : GH_OPCION[args[k]];
      if (!opcion) continue;
      const valor = largo ? largo[2] : args[++k];
      if (typeof valor !== 'string') continue;
      if (opcion !== 'body-file') { textos.push({ origen, texto: valor }); continue; }
      // `-F -`: el cuerpo llega por la entrada estándar, casi siempre un heredoc de la propia línea.
      if (valor === '-') { textos.push({ origen: `${origen} (entrada estándar)`, texto: cmd }); continue; }
      try {
        const abs = resolve(dir, rutaShell(valor) || valor);
        if (statSync(abs).size <= MAX_BYTES) textos.push({ origen: `${origen} --body-file ${valor}`, texto: readFileSync(abs, 'utf8') });
      } catch { /* el fichero no existe: gh fallará solo */ }
    }
  }
  return textos;
}

// Un hallazgo por texto: con uno basta para no publicar.
function escanearGh(cmd, shell, cwd) {
  const hallazgos = [];
  for (const { origen, texto } of textosGh(cmd, shell, cwd)) {
    const lineas = texto.split(/\r?\n|\\n/);
    for (let k = 0; k < lineas.length; k++) {
      const que = secretoEn(lineas[k], 'cuerpo.md');
      if (que) { hallazgos.push(`${origen}, línea ${k + 1} — ${que}`); break; }
    }
  }
  return hallazgos;
}

// Lectura que no termina a tiempo: el commit no se ha podido escanear entero.
class SinTiempo extends Error {}
const inicio = Date.now();
const restante = () => TOPE_MS - (Date.now() - inicio);

// El tiempo que queda se calcula una vez por lectura: con 0 o menos no se lanza git (un `timeout: 0`
// sería «sin límite»), y ese mismo valor es el timeout del proceso.
function git(args, cwd) {
  const quedan = restante();
  if (quedan <= 0) throw new SinTiempo();
  try {
    return execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
      cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: quedan, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (e) {
    // Agotado, sin buffer o matado por una señal: la lectura no ha terminado y el commit no entra.
    if (e.code === 'ETIMEDOUT' || e.code === 'ENOBUFS' || e.signal) throw new SinTiempo();
    return ''; // no es un repo, ruta que no existe, sin HEAD…
  }
}

// Lista de rutas con -z: sin comillas ni escapes en nombres con tildes o espacios.
const listaZ = (salida) => salida.split('\0').filter(Boolean);

// Diff con solo las líneas añadidas, sin renombrados (un fichero renombrado se lee entero como nuevo)
// y sin la configuración del usuario que cambie su forma (prefijos, color, textconv, diff externo).
const DIFF = ['diff', '-U0', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames',
  '--src-prefix=a/', '--dst-prefix=b/', '--diff-filter=ACMT'];

// Nombre de fichero de una cabecera `+++ b/…`, también entre comillas con escapes de C.
function rutaDeCabecera(s) {
  if (!s.startsWith('"')) return s.replace(/^b\//, '');
  const t = s.slice(1, -1).replace(/\\([\\"tnr]|[0-7]{3})/g, (m, c) =>
    /^[0-7]{3}$/.test(c) ? String.fromCharCode(parseInt(c, 8)) : ({ t: '\t', n: '\n', r: '\r' })[c] || c);
  return Buffer.from(t, 'latin1').toString('utf8').replace(/^b\//, '');
}

// Recorre un diff unificado: llama a `ver(fichero, número, línea)` por cada línea añadida.
function lineasAnadidas(diff, ver) {
  let fichero = null;
  let n = 0;
  let enHunk = false;
  let bytes = 0;
  const lineas = diff.split('\n');
  for (let k = 0; k < lineas.length; k++) {
    if ((k & 1023) === 0 && restante() <= 0) throw new SinTiempo();
    const l = lineas[k];
    if (l.startsWith('diff --git ')) { fichero = null; enHunk = false; continue; }
    if (!enHunk && l.startsWith('+++ ')) {
      const r = l.slice(4).replace(/\t$/, '');
      fichero = r === '/dev/null' ? null : rutaDeCabecera(r);
      bytes = 0;
      continue;
    }
    if (l.startsWith('@@')) { enHunk = true; n = Number((/\+(\d+)/.exec(l) || [0, 1])[1]); continue; }
    if (!enHunk || !fichero) continue;
    if (l.startsWith('+')) {
      bytes += l.length;
      if (bytes <= MAX_BYTES) ver(fichero, n, l.slice(1));
      n++;
    } else if (l.startsWith(' ')) n++;
  }
}

// Opciones de `git commit` que consumen el token siguiente.
const COMMIT_CON_VALOR = new Set(['--message', '--file', '--reuse-message', '--reedit-message', '--author',
  '--date', '--template', '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file']);

// `git commit` → ¿commitea todo lo modificado (-a/--all)?, las rutas que nombra y, con
// `--pathspec-from-file=f`, el fichero del que lee más rutas (`nul`: separadas por NUL).
function opcionesCommit(args) {
  let todo = false;
  const rutas = [];
  let soloRutas = false;
  let desdeFichero = null;
  let nul = false;
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    if (soloRutas) { rutas.push(t); continue; }
    if (t === '--') { soloRutas = true; continue; }
    if (t === '--all') { todo = true; continue; }
    if (t === '--pathspec-file-nul') { nul = true; continue; }
    const pff = /^--pathspec-from-file(?:=(.*))?$/.exec(t);
    if (pff) { desdeFichero = pff[1] !== undefined ? pff[1] : args[++k]; continue; }
    if (t.startsWith('--')) { if (!t.includes('=') && COMMIT_CON_VALOR.has(t)) k++; continue; }
    if (t.startsWith('-') && t.length > 1) {
      // Grupo de cortas (`-am`): las que llevan valor (m F C c t) se comen el resto o el token siguiente.
      for (let p = 1; p < t.length; p++) {
        if (t[p] === 'a') todo = true;
        if ('mFCct'.includes(t[p])) { if (p === t.length - 1) k++; break; }
      }
      continue;
    }
    rutas.push(t);
  }
  return { todo, rutas, desdeFichero, nul };
}

// Rutas de un `--pathspec-from-file`, leídas como git: relativas al directorio del comando, una por
// línea (o separadas por NUL). `-` es stdin y no se puede leer desde aquí: no aporta rutas.
function rutasDeFichero(fichero, nul, dir) {
  if (!fichero || fichero === '-') return [];
  try {
    return readFileSync(resolve(dir, rutaShell(fichero) || fichero), 'utf8').split(nul ? '\0' : /\r?\n/).filter(Boolean);
  } catch {
    return []; // no legible: git tampoco commitearía nada de ahí
  }
}

// `git add` → rutas que nombra, si se limita a lo ya trackeado (-u) y si fuerza lo ignorado (-f).
function opcionesAdd(args) {
  let soloTrackeados = false;
  let fuerza = false;
  const rutas = [];
  let soloRutas = false;
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    if (soloRutas) { rutas.push(t); continue; }
    if (t === '--') { soloRutas = true; continue; }
    if (t === '-u' || t === '--update') { soloTrackeados = true; continue; }
    if (t === '-f' || t === '--force') { fuerza = true; continue; }
    if (/^-[A-Za-z]+$/.test(t)) { if (t.includes('u')) soloTrackeados = true; if (t.includes('f')) fuerza = true; continue; }
    if (t === '--pathspec-from-file') { k++; continue; }
    if (t.startsWith('-')) continue;
    rutas.push(t);
  }
  return { soloTrackeados, fuerza, rutas };
}

function bloquear(lineas) {
  console.error('');
  for (const l of lineas) console.error(l ? `[secret-scan] ${l}` : '');
  console.error('');
  process.exit(2);
}

function escanear(cmd, shell, cwd) {
  const diffs = [];  // { args, cwd }: diffs cuyas líneas añadidas entran en el commit
  const disco = new Map(); // `${raiz}\0${fichero}` → [raiz, fichero]: no trackeados, leídos del disco
  const adds = [];   // lo que incluyen los `git add` previos: { raiz, diffs, disco }
  const raices = new Map();
  const raizDe = (dir) => {
    if (!raices.has(dir)) raices.set(dir, git(['rev-parse', '--show-toplevel'], dir).trim());
    return raices.get(dir);
  };
  let hayCommit = false;

  for (const { tokens, i, nombre, dir: dirCmd } of recorrer(cmd, shell, cwd)) {
    if (nombre !== 'git') continue;
    const { sub, args, dir } = gitSub(tokens, i, dirCmd);
    if (sub !== 'add' && sub !== 'stage' && sub !== 'commit') continue;
    const raiz = raizDe(dir);
    if (!raiz) continue; // no es un repo git

    if (sub === 'add' || sub === 'stage') {
      const { soloTrackeados, fuerza, rutas } = opcionesAdd(args);
      // Sin rutas, `git add -A`/`-u` abarca todo el repo: se mira desde la raíz, no desde el subdirectorio.
      const desde = rutas.length ? dir : raiz;
      const pathspec = rutas.length ? ['--', ...rutas] : [];
      const a = { raiz, diffs: [{ args: [...DIFF, ...pathspec], cwd: desde }], disco: [] };
      // Con -f/--force y rutas, git añade también lo ignorado de esas rutas: sin --exclude-standard.
      const ignorados = fuerza && rutas.length ? [] : ['--exclude-standard'];
      if (!soloTrackeados) a.disco = listaZ(git(['ls-files', '-z', '--full-name', '-o', ...ignorados, ...pathspec], desde));
      adds.push(a);
      continue;
    }
    hayCommit = true;

    const oc = opcionesCommit(args);
    const { todo } = oc;
    const rutas = [...oc.rutas, ...rutasDeFichero(oc.desdeFichero, oc.nul, dir)];
    diffs.push({ args: [...DIFF, '--cached'], cwd: raiz }); // lo staged, del índice
    if (todo) diffs.push({ args: DIFF, cwd: raiz });       // -a: lo modificado sin stagear, del disco
    if (rutas.length) { // `git commit <rutas>`: esas rutas tal como están en el disco
      if (git(['rev-parse', '--verify', '-q', 'HEAD'], dir).trim()) diffs.push({ args: [...DIFF, 'HEAD', '--', ...rutas], cwd: dir });
      else for (const f of listaZ(git(['ls-files', '-z', '--full-name', '-c', '--', ...rutas], dir))) disco.set(`${raiz}\0${f}`, [raiz, f]);
    }
    for (const a of adds) {
      if (a.raiz !== raiz) continue;
      diffs.push(...a.diffs);
      for (const f of a.disco) disco.set(`${raiz}\0${f}`, [raiz, f]);
    }
  }
  if (!hayCommit) return [];

  const hallazgos = new Map(); // fichero → primer hallazgo: uno por fichero basta para bloquear
  const ver = (fichero, n, linea) => {
    if (hallazgos.has(fichero) || IGNORAR.test(fichero)) return;
    const que = secretoEn(linea, fichero);
    if (que) hallazgos.set(fichero, `${fichero}:${n} — ${que}`);
  };
  const hechos = new Set();
  for (const d of diffs) {
    const clave = `${d.cwd}\0${d.args.join('\0')}`;
    if (hechos.has(clave)) continue;
    hechos.add(clave);
    lineasAnadidas(git(d.args, d.cwd), ver);
  }
  for (const [raiz, fichero] of disco.values()) {
    if (restante() <= 0) throw new SinTiempo();
    if (IGNORAR.test(fichero) || hallazgos.has(fichero)) continue;
    let contenido;
    try {
      const abs = join(raiz, fichero);
      if (statSync(abs).size > MAX_BYTES) continue;
      contenido = readFileSync(abs, 'utf8');
    } catch {
      continue; // borrado o inaccesible
    }
    const lineas = contenido.split('\n');
    for (let k = 0; k < lineas.length && !hallazgos.has(fichero); k++) ver(fichero, k + 1, lineas[k]);
  }
  return [...hallazgos.values()];
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
    process.exit(0); // fail-open: mejor permitir que romper el flujo
  }

  // Lo que se publica con gh: issues y PR no pasan por ningún commit.
  if (/\bgh\b/i.test(cmd)) {
    let deGh = [];
    try { deGh = escanearGh(cmd, shell, resolve(cwd)); } catch { /* fallo propio: fail-open */ }
    if (deGh.length) {
      bloquear([
        'PUBLICACIÓN BLOQUEADA — posibles secretos en el texto que ibas a publicar en GitHub:',
        ...deGh.map((h) => `  - ${h}`),
        '',
        'Una issue o una PR quedan a la vista de todo el que tenga acceso al repo, y no se',
        'despublican del todo. Quita el valor, pon un placeholder y vuelve a intentarlo.',
      ]);
    }
  }

  // Filtro barato: si no aparece un commit, no es asunto de este hook.
  if (!/\bcommit\b/i.test(cmd)) process.exit(0);

  let hallazgos;
  try {
    hallazgos = escanear(cmd, shell, resolve(cwd));
  } catch (e) {
    if (!(e instanceof SinTiempo)) process.exit(0); // fallo propio: fail-open
    bloquear([
      `COMMIT BLOQUEADO — no he podido escanear todo lo que entra en el commit en ${TOPE_MS / 1000} s.`,
      'Un commit sin escanear no entra. Pártelo en commits más pequeños (por carpetas o por tipo de cambio)',
      'o saca del índice lo que no sea código (datos, binarios, ficheros generados) y vuelve a intentarlo.',
    ]);
  }
  if (hallazgos.length === 0) process.exit(0);

  bloquear([
    'COMMIT BLOQUEADO — posibles secretos en lo que ibas a commitear:',
    ...hallazgos.map((h) => `  - ${h}`),
    '',
    'Mueve los valores a variables de entorno (.env.<entorno>, fuera del repo) o a un',
    'gestor de secretos y vuelve a intentarlo. Si es un ejemplo, márcalo como placeholder.',
  ]);
});
