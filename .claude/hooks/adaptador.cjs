#!/usr/bin/env node
// adaptador — los hooks del kit, escritos para Claude Code, en Antigravity, Gemini CLI, Codex y git.
//
//   node .claude/hooks/adaptador.cjs <runtime> <evento> [--fichero <ruta>] [<hook>[:<arg>…]]…
//
//   runtime  antigravity | gemini | codex | git
//   evento   el nombre de Claude Code: SessionStart | PreToolUse | PostToolUse | Stop | UserPromptSubmit;
//            PreInvocation (solo Antigravity: entrega los avisos que quedaron en cola) o, con git,
//            pre-commit | commit-msg (este con --fichero, el mensaje que git pasa en $1)
//   hook     el nombre de un .cjs de esta carpeta y sus argumentos tras «:» (vendor-gate:--estricto)
//
// Traduce el payload de cada runtime al de Claude Code (tool_name, tool_input.command o .file_path,
// cwd, session_id, transcript_path, stop_hook_active), lanza los hooks tal cual, en orden, y traduce lo
// que devuelven (exit 2 + stderr para bloquear, additionalContext y systemMessage para avisar) al
// protocolo del runtime. Los hooks no saben que existe, y el camino de Claude Code no pasa por aquí.
// Antes de los hooks de PreToolUse lanza permisos.cjs, que aplica los `deny` de .claude/settings.json (force
// push, reset --hard, rm -rf, curl, leer .env…): Claude Code los aplica por su cuenta y los demás no los leen.
//
// Contratos (de la documentación de cada uno y de transcripts reales; ver .claude/hooks/README.md):
//   · Antigravity  .agents/hooks.json. camelCase: toolCall {name, args}, workspacePaths, conversationId,
//                  transcriptPath; Stop con terminationReason. Responde SIEMPRE JSON con exit 0: PreToolUse
//                  `decision` allow|deny|ask (no hay «sin opinión»: `allow` aprueba sin preguntar y se
//                  saltaría la confirmación de la persona, así que lo que pasa los guardas sale como `ask`,
//                  que respeta lo que la persona ya marcó como «Always allow»); Stop `continue` para seguir;
//                  SessionStart y PreInvocation inyectan con `injectSteps`. Lo lanza `cmd /c` o `sh -c`
//                  desde `.agents/`, por eso la raíz sale de workspacePaths y no del directorio actual.
//   · Gemini CLI   .gemini/settings.json. snake_case como Claude Code, con otros nombres de evento y de
//                  herramienta (run_shell_command, write_file, replace). Bloquear: exit 2 y el motivo por
//                  stderr, el bloqueo de sistema, que no depende de que lea un JSON.
//   · Codex        .codex/hooks.json. El mismo contrato que Claude Code; las ediciones llegan como
//                  apply_patch y las órdenes pueden llegar como argv.
//   · git          .githooks/pre-commit y commit-msg: para la herramienta que no tiene motor de hooks
//                  (Cursor, Copilot, la terminal). Bloquear es salir con 1.
//
// Falla en abierto: un payload que no entiende, un hook que se rompe o tarda demasiado no bloquean.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const { enlazar } = require('./enlazar-skills.cjs');

const DIR = __dirname;
const RAIZ_KIT = path.resolve(DIR, '..', '..');
const RUNTIMES = ['antigravity', 'gemini', 'codex', 'git'];
const AGENTE = { antigravity: 'Antigravity', gemini: 'Gemini', codex: 'Codex', git: 'git' };
// Todo el trabajo de un evento cabe en 50 s, por debajo del timeout con que lo cablean los runtimes (60 s):
// si el runtime matase al adaptador, un bloqueo que no llegó a decirse contaría como paso.
const TOPE_TOTAL_MS = 50000;
const EN_WINDOWS = process.platform === 'win32';
const SHELL_POR_DEFECTO = EN_WINDOWS ? 'PowerShell' : 'Bash';
// Órdenes de shell, también las que escriben en una terminal ya abierta (send_command_input de
// Antigravity, write_stdin de Codex): teclear la orden después no la libra de los guardas.
const RE_SHELL = /^(run_command|send_command_input|run_shell_command|bash|powershell|shell|local_shell|shell_command|exec_command|unified_exec|write_stdin)$/i;
const RE_EDICION = /(write|edit|replace|patch|create)/i;
const RE_LECTURA = /^(read_file|view_file|read_many_files|get_file_contents|read)$/i;
const CAMPOS_FICHERO = ['file_path', 'TargetFile', 'Path', 'AbsolutePath', 'FilePath', 'absolute_path', 'path'];

const str = (v) => (typeof v === 'string' ? v : '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const esDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const idSeguro = (s) => str(s).replace(/[^\w-]/g, '').slice(0, 80) || 'sin-sesion';

// Antigravity puede dar las rutas como URI (file:///c:/…) o con una barra delante de la unidad (/c:/…).
function ruta(p) {
  let r = str(p).trim();
  if (!r) return '';
  if (/^file:\/\//i.test(r)) { try { r = fileURLToPath(r); } catch { return ''; } }
  if (/^\/[A-Za-z]:[\\/]/.test(r)) r = r.slice(1);
  return r;
}

function raizGit(desde) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: desde, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

// ¿`hijo` está dentro de `padre` (o es él)? Sin distinguir mayúsculas en Windows.
function dentroDe(hijo, padre) {
  const norm = (p) => (EN_WINDOWS ? path.resolve(p).toLowerCase() : path.resolve(p));
  const rel = path.relative(norm(padre), norm(hijo));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// Un argumento citado para la shell en que se va a trocear. Sin cita solo lo que no puede abrir ni cerrar
// nada: una comilla suelta (`a.b="`) desincronizaría el troceo y escondería el resto de la orden.
function citar(x, shell) {
  if (/^[A-Za-z0-9_./:=@%+,-]+$/.test(x)) return x;
  return shell === 'PowerShell' ? `'${x.replace(/'/g, "''")}'` : `'${x.replace(/'/g, "'\\''")}'`;
}

// Una orden que llega como argv (["bash","-lc","…"], ["powershell.exe","-Command","…"]): su texto y su shell
// (null si no se sabe: entonces se mira con las dos).
function desdeArgv(argv) {
  const a = argv.map(String);
  const base = path.basename(a[0] || '').toLowerCase().replace(/\.exe$/, '');
  if (/^(pwsh|powershell)$/.test(base)) {
    const i = a.findIndex((x, k) => k > 0 && /^-(c|command)$/i.test(x));
    return { cmd: a.slice(i > 0 ? i + 1 : 1).join(' '), shell: 'PowerShell' };
  }
  if (/^(ba|z|da|k)?sh$/.test(base)) {
    const i = a.findIndex((x, k) => k > 0 && /^-[a-z]*c$/.test(x));
    if (i > 0) return { cmd: a[i + 1] || '', shell: 'Bash' };
  }
  return { argv: a, shell: null };
}

// Los ficheros que toca un parche de apply_patch.
function ficherosDeParche(texto) {
  return [...str(texto).matchAll(/^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+?)\s*$/gm)].map((m) => m[1]);
}

// Limpia las etiquetas <USER_REQUEST> y <ADDITIONAL_METADATA> de Antigravity.
function limpiarPrompt(texto) {
  const c = str(texto);
  const m = /<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/i.exec(c);
  return (m ? m[1] : c.replace(/<[A-Z_]+>[\s\S]*?<\/[A-Z_]+>/g, ' ')).trim();
}

// Lee los ultimos 512 KB de transcript.jsonl buscando el ultimo USER_INPUT.
function extraerUltimoUserInput(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return '';
  try {
    const st = fs.statSync(transcriptPath);
    if (!st.size) return '';
    const leer = Math.min(st.size, 512 * 1024);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(leer);
    fs.readSync(fd, buf, 0, leer, st.size - leer);
    fs.closeSync(fd);
    const lineas = buf.toString('utf8').split('\n');
    for (let i = lineas.length - 1; i >= 0; i--) {
      const l = lineas[i].trim();
      if (!l) continue;
      try {
        const o = JSON.parse(l);
        if (o.type === 'USER_INPUT' && typeof o.content === 'string') {
          return limpiarPrompt(o.content);
        }
      } catch {}
    }
  } catch {}
  return '';
}

// Del payload del runtime a los de Claude Code. Una lista: un parche de Codex toca varios ficheros, y una
// herramienta que no es asunto de los hooks (leer, buscar) no da ninguno.

function normalizar(runtime, evento, crudo) {
  const p = obj(crudo);
  let base;
  let herramienta = '';
  let entrada = {};
  if (runtime === 'antigravity') {
    const convId = str(p.conversationId);
    let tPath = ruta(p.transcriptPath);
    if (!tPath && convId) {
      const posible = path.join(os.homedir(), '.gemini', 'antigravity', 'brain', convId, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(posible)) tPath = posible;
    }
    base = { session_id: convId, transcript_path: tPath, cwd: ruta(Array.isArray(p.workspacePaths) ? p.workspacePaths[0] : '') };
    const llamada = obj(p.toolCall);
    herramienta = str(llamada.name);
    entrada = obj(llamada.args);
    if (p.invocationNum !== undefined) base.invocation_num = Number(p.invocationNum);
    // Solo el cierre normal de un turno puede seguir: tras un error, una cancelación o un tope, se para.
    if (evento === 'Stop') base.stop_hook_active = p.terminationReason !== undefined && p.terminationReason !== 'NO_TOOL_CALL';
    if (evento === 'SessionStart') base.source = 'startup';
    if (evento === 'PreInvocation' || evento === 'UserPromptSubmit') {
      let prompt = limpiarPrompt(p.lastUserInput || p.prompt);
      if (!prompt && base.transcript_path) {
        prompt = extraerUltimoUserInput(base.transcript_path);
      }
      base.prompt = prompt;
    }
  } else if (runtime === 'gemini') {
    base = { session_id: str(p.session_id), transcript_path: ruta(p.transcript_path), cwd: ruta(p.cwd) };
    herramienta = str(p.tool_name);
    entrada = obj(p.tool_input);
    if (evento === 'Stop') {
      base.stop_hook_active = p.stop_hook_active === true;
      base.last_assistant_message = str(p.prompt_response);
    }
    if (evento === 'SessionStart') base.source = str(p.source) || 'startup';
    if (evento === 'UserPromptSubmit') base.prompt = str(p.prompt);
  } else {
    base = { ...p, cwd: ruta(p.cwd) };
    delete base.tool_name;
    delete base.tool_input;
    herramienta = str(p.tool_name);
    entrada = obj(p.tool_input);
  }
  base.hook_event_name = evento;
  if (!base.cwd || !esDir(base.cwd)) base.cwd = RAIZ_KIT;

  if (evento !== 'PreToolUse' && evento !== 'PostToolUse') return [base];
  if (!herramienta) return [];

  if (RE_SHELL.test(herramienta)) {
    const crudoCmd = entrada.CommandLine ?? entrada.command ?? entrada.cmd ?? entrada.Input ?? entrada.chars;
    // La shell, si el runtime la dice; si no, en Windows no se sabe (PowerShell, Git Bash o cmd) y la orden
    // se mira con las dos sintaxis: basta con que una bloquee.
    let shells;
    if (/^powershell$/i.test(herramienta)) shells = ['PowerShell'];
    else shells = EN_WINDOWS ? ['PowerShell', 'Bash'] : ['Bash'];
    let textos;
    if (Array.isArray(crudoCmd)) {
      const r = desdeArgv(crudoCmd);
      if (r.shell) { shells = [r.shell]; textos = [r.cmd]; } else textos = shells.map((s) => r.argv.map((x) => citar(x, s)).join(' '));
    } else textos = shells.map(() => crudoCmd);
    if (typeof textos[0] !== 'string' || !textos[0].trim()) {
      process.stderr.write(`[adaptador] ${herramienta} sin orden legible: los guardas no la ven.\n`);
      return [];
    }
    // El directorio de la orden, solo si cae dentro del espacio de trabajo: los hooks lanzan git desde ahí, y
    // en Windows un git.exe plantado en otra carpeta se ejecutaría antes de que la persona apruebe nada.
    const dir = ruta(entrada.Cwd || entrada.dir_path || entrada.workdir || entrada.cwd);
    const pedido = dir ? path.resolve(base.cwd, dir) : base.cwd;
    const cwd = esDir(pedido) && dentroDe(pedido, base.cwd) ? pedido : base.cwd;
    return shells.map((shell, k) => ({ ...base, cwd, tool_name: shell, tool_input: { command: textos[k] } }));
  }
  if (/^apply_patch$/i.test(herramienta)) {
    const texto = [entrada.command, entrada.input, entrada.patch]
      .map((v) => (Array.isArray(v) ? v[v.length - 1] : v))
      .find((v) => typeof v === 'string' && v.includes('*** '));
    return ficherosDeParche(texto).map((f) => ({ ...base, tool_name: 'Edit', tool_input: { file_path: path.resolve(base.cwd, f) } }));
  }
  if (evento === 'PreToolUse' && RE_LECTURA.test(herramienta)) {
    const lista = Array.isArray(entrada.paths) ? entrada.paths.map(ruta).filter(Boolean) : [];
    const unico = CAMPOS_FICHERO.map((k) => ruta(entrada[k])).find(Boolean);
    const ficheros = unico ? [unico, ...lista] : lista;
    return ficheros.map((f) => ({ ...base, tool_name: 'Read', tool_input: { file_path: path.resolve(base.cwd, f) } }));
  }
  if (!RE_EDICION.test(herramienta)) return [];
  const fichero = CAMPOS_FICHERO.map((k) => ruta(entrada[k])).find(Boolean);
  if (!fichero) return [];
  return [{ ...base, tool_name: /write|create/i.test(herramienta) ? 'Write' : 'Edit', tool_input: { file_path: path.resolve(base.cwd, fichero) } }];
}

// El mensaje de commit sin lo que va detrás de las tijeras de `git commit -v` (el diff, cuyas líneas de
// contexto empiezan por espacio y parecerían trailers). Los comentarios se quedan: una firma comentada no
// abre línea y no cuenta, y con `--cleanup=verbatim` el comentario sí entra en el commit.
function limpiarMensaje(texto) {
  const corte = str(texto).search(/^. -+ >8 -+$/m);
  return corte >= 0 ? texto.slice(0, corte) : str(texto);
}

// La carpeta de trabajo del adaptador (cola de avisos, contadores, mensaje de commit): en el tmp, con el
// usuario en el nombre y solo para él (0700). Si existe y no es nuestra (un enlace, o de otro usuario en un
// /tmp compartido), no se usa: null, y lo que dependía de ella se queda sin hacer.
let dirPropioCache;
function dirPropio() {
  if (dirPropioCache !== undefined) return dirPropioCache;
  let usuario = 'x';
  try { usuario = os.userInfo().username.replace(/[^\w-]/g, '') || 'x'; } catch { /* sin nombre */ }
  const d = path.join(os.tmpdir(), `ai-sdd-adaptador-${usuario}`);
  try { fs.mkdirSync(d, { mode: 0o700 }); } catch { /* ya existía */ }
  try {
    const st = fs.lstatSync(d);
    const mio = !st.isSymbolicLink() && st.isDirectory() &&
      (EN_WINDOWS || (st.uid === process.getuid() && (st.mode & 0o077) === 0));
    dirPropioCache = mio ? d : null;
  } catch {
    dirPropioCache = null;
  }
  return dirPropioCache;
}

// Los payloads de los hooks de git: el commit en curso como si lo lanzase un agente.
function payloadsDeGit(evento, fichero, raiz) {
  if (evento === 'pre-commit') return [{ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit' }, cwd: raiz }];
  if (evento !== 'commit-msg' || !fichero) return [];
  let texto;
  try { texto = fs.readFileSync(path.resolve(raiz, fichero), 'utf8'); } catch { return []; }
  // En una carpeta nueva y con `wx`: nadie puede haber dejado ahí un enlace para que lo sigamos al escribir.
  const carpeta = fs.mkdtempSync(path.join(dirPropio() || os.tmpdir(), 'mensaje-'));
  const limpio = path.join(carpeta, 'mensaje.txt');
  fs.writeFileSync(limpio, limpiarMensaje(texto), { flag: 'wx', mode: 0o600 });
  process.on('exit', () => { try { fs.rmSync(carpeta, { recursive: true, force: true }); } catch { /* ya no está */ } });
  return [{ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: `git commit -F "${limpio.replace(/\\/g, '/')}"` }, cwd: raiz }];
}

function correrHook({ nombre, args }, payload, runtime, raiz, tope) {
  const r = spawnSync(process.execPath, [path.join(DIR, `${nombre}.cjs`), ...args], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: payload.cwd,
    timeout: tope,
    windowsHide: true,
    env: { ...process.env, CLAUDE_PROJECT_DIR: raiz, AI_SDD_RUNTIME: runtime, AI_SDD_AGENTE: AGENTE[runtime] },
  });
  let json = null;
  try { json = r.stdout && r.stdout.trim() ? JSON.parse(r.stdout) : null; } catch { /* stdout que no es JSON */ }
  return { code: r.status, err: str(r.stderr).trim(), json, sinTiempo: Boolean(r.error && r.error.code === 'ETIMEDOUT') };
}

// Lanza los hooks sobre cada payload. { bloqueo, contexto[], aviso[] }: el primer bloqueo corta la cadena.
// `guardas`: los de antes de una orden o de un commit. Si a uno de ellos no le da tiempo, bloquea: una orden
// sin revisar no pasa, igual que secret-scan no deja entrar un commit que no ha podido escanear entero.
function ejecutar(hooks, payloads, runtime, raiz, guardas = false) {
  const res = { bloqueo: '', contexto: [], aviso: [] };
  const fin = Date.now() + TOPE_TOTAL_MS;
  const anotar = (lista, t) => { if (typeof t === 'string' && t.trim() && !lista.includes(t.trim())) lista.push(t.trim()); };
  for (const payload of payloads) {
    for (const h of hooks) {
      const queda = fin - Date.now();
      if (queda <= 0 && guardas) {
        res.bloqueo = `[adaptador] No ha dado tiempo a pasar ${h.nombre} en ${TOPE_TOTAL_MS / 1000} s: la orden no pasa sin revisar. Pártela en órdenes más pequeñas.`;
        return res;
      }
      if (queda <= 0) return res;
      const r = correrHook(h, payload, runtime, raiz, queda);
      if (r.code === 2) {
        res.bloqueo = r.err || `${h.nombre} lo ha bloqueado.`;
        return res;
      }
      if (r.sinTiempo && guardas) {
        res.bloqueo = `[adaptador] ${h.nombre} no ha terminado a tiempo: la orden no pasa sin revisar. Pártela en órdenes más pequeñas.`;
        return res;
      }
      if (r.json) {
        anotar(res.contexto, obj(r.json.hookSpecificOutput).additionalContext);
        anotar(res.aviso, r.json.systemMessage);
      }
      if (r.code !== 0 && r.err) process.stderr.write(`[adaptador] ${h.nombre} falló y se deja pasar: ${r.err.slice(0, 500)}\n`);
    }
  }
  return res;
}

// Antigravity solo inyecta texto al empezar la sesión y antes de llamar al modelo: los avisos de una edición
// o del cierre de un turno esperan en una cola por conversación hasta el siguiente PreInvocation.
function encolar(sesion, texto) {
  const d = dirPropio();
  if (!d) return;
  try { fs.appendFileSync(path.join(d, `avisos-${idSeguro(sesion)}.txt`), `${texto}\n`, { mode: 0o600 }); } catch { /* sin cola, sin aviso */ }
}
function desencolar(sesion) {
  const d = dirPropio();
  if (!d) return '';
  const f = path.join(d, `avisos-${idSeguro(sesion)}.txt`);
  try {
    const t = fs.readFileSync(f, 'utf8').trim();
    fs.unlinkSync(f);
    return t;
  } catch {
    return '';
  }
}

// Gemini CLI y Antigravity no dicen si el turno ya viene de un bloqueo del Stop (stop_hook_active): se cuenta
// aquí, por sesión, para dejar seguir una sola vez, como Claude Code.
function vecesBloqueado(runtime, sesion, nuevo) {
  const d = dirPropio();
  if (!d) return 0;
  const f = path.join(d, `stop-${runtime}-${idSeguro(sesion)}.txt`);
  if (nuevo === undefined) { try { return Number(fs.readFileSync(f, 'utf8')) || 0; } catch { return 0; } }
  try { fs.writeFileSync(f, String(nuevo), { mode: 0o600 }); } catch { /* sin contador */ }
  return nuevo;
}

// Lo que se contesta cuando no hay nada que decir (y cuando algo falla: en abierto).
function neutro(runtime, evento) {
  if (runtime === 'antigravity' && evento === 'PreToolUse') return { json: { decision: 'ask' } };
  if (runtime === 'antigravity' && evento === 'Stop') return { json: { decision: 'stop' } };
  if (runtime === 'antigravity' || runtime === 'gemini') return { json: {} };
  return {};
}

// { json, stderr, code } en el protocolo del runtime.
function responder(runtime, evento, res, sesion) {
  const texto = [...res.contexto, ...res.aviso.filter((a) => !res.contexto.includes(a))].join('\n');
  const aviso = res.aviso.join('\n');
  if (runtime === 'git') return res.bloqueo ? { stderr: res.bloqueo, code: 1 } : {};
  if (runtime === 'antigravity') {
    if (evento === 'PreToolUse') return { json: res.bloqueo ? { decision: 'deny', reason: res.bloqueo } : { decision: 'ask' } };
    if (evento === 'Stop') {
      const d = dirPropio();
      if (d) { try { fs.unlinkSync(path.join(d, `evaluado-${idSeguro(sesion)}.txt`)); } catch {} }
      if (res.bloqueo) return { json: { decision: 'continue', reason: res.bloqueo } };
      if (texto) encolar(sesion, texto);
      return { json: { decision: 'stop' } };
    }
    if (evento === 'PostToolUse') { if (texto) encolar(sesion, texto); return { json: {} }; }
    if (evento === 'PreInvocation') {
      const cola = desencolar(sesion);
      const combinado = [cola, texto].filter(Boolean).join('\n');
      return { json: combinado ? { injectSteps: [{ ephemeralMessage: combinado }] } : {} };
    }
    if (evento === 'SessionStart') return { json: texto ? { injectSteps: [{ systemMessage: { systemMessage: texto } }] } : {} };
    return { json: {} };
  }
  if (runtime === 'gemini') {
    // exit 2 con el motivo por stderr es el bloqueo de sistema de Gemini CLI: no depende de que lea un JSON.
    if (res.bloqueo) return { stderr: res.bloqueo, code: 2 };
    const nombre = { PostToolUse: 'AfterTool', SessionStart: 'SessionStart', PreToolUse: 'BeforeTool', UserPromptSubmit: 'BeforeAgent' }[evento];
    const out = {};
    if (nombre && res.contexto.length) out.hookSpecificOutput = { hookEventName: nombre, additionalContext: res.contexto.join('\n') };
    if (aviso) out.systemMessage = aviso;
    return { json: out };
  }
  // Codex: el contrato de Claude Code.
  if (res.bloqueo) return evento === 'Stop' ? { json: { decision: 'block', reason: res.bloqueo } } : { stderr: res.bloqueo, code: 2 };
  const out = {};
  if (res.contexto.length && evento !== 'Stop') out.hookSpecificOutput = { hookEventName: evento, additionalContext: res.contexto.join('\n') };
  if (aviso) out.systemMessage = aviso;
  return Object.keys(out).length || evento === 'Stop' ? { json: out } : {};
}

function leerArgs(argv) {
  const [runtime = '', evento = '', ...resto] = argv;
  let fichero = '';
  const hooks = [];
  for (let i = 0; i < resto.length; i++) {
    if (resto[i] === '--fichero') { fichero = resto[++i] || ''; continue; }
    const [nombre, ...args] = resto[i].split(':');
    if (/^[a-z][a-z0-9-]*$/.test(nombre) && nombre !== 'adaptador' && fs.existsSync(path.join(DIR, `${nombre}.cjs`))) hooks.push({ nombre, args });
    else process.stderr.write(`[adaptador] hook desconocido, se salta: ${resto[i]}\n`);
  }
  return { runtime, evento, fichero, hooks };
}

function procesar(runtime, evento, fichero, hooks, entrada) {
  if (runtime === 'git') {
    const raiz = raizGit(process.cwd()) || process.cwd();
    return responder(runtime, evento, ejecutar(hooks, payloadsDeGit(evento, fichero, raiz), runtime, raiz, true));
  }
  // Un payload vac\u00EDo, que no es JSON o que no es un objeto no se entiende: no se lanza nada.
  let crudo;
  try { crudo = JSON.parse(str(entrada).replace(/^\uFEFF/, '').trim()); } catch { return neutro(runtime, evento); }
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return neutro(runtime, evento);
  const payloads = normalizar(runtime, evento, crudo);
  const sesion = payloads[0] ? payloads[0].session_id : str(obj(crudo).conversationId || obj(crudo).session_id);
  if (!payloads.length) return neutro(runtime, evento);
  const raiz = raizGit(payloads[0].cwd) || RAIZ_KIT;

  // Antes de los guardas de una orden (o al leer un fichero), los `deny` de .claude/settings.json, que
  // Claude Code aplica por su cuenta y los demás runtimes no leen (permisos.cjs).
  const deOrden = evento === 'PreToolUse' && payloads.some((p) => p.tool_name === 'Bash' || p.tool_name === 'PowerShell');
  const deLectura = evento === 'PreToolUse' && payloads.some((p) => p.tool_name === 'Read');
  const conPermisos = (deOrden || deLectura) && fs.existsSync(path.join(DIR, 'permisos.cjs'));
  const baseHooks = deLectura && !deOrden ? [] : hooks;
  const cadena = conPermisos ? [{ nombre: 'permisos', args: [] }, ...baseHooks] : [...baseHooks];
  // En los runtimes sin PreCompact, compact-handoff guarda la foto al cerrar cada turno y la reinyecta si
  // SessionStart llega con source="compact".
  if ((evento === 'Stop' || (evento === 'SessionStart' && payloads[0] && payloads[0].source === 'compact')) &&
      fs.existsSync(path.join(DIR, 'compact-handoff.cjs')) && !cadena.some((h) => h.nombre === 'compact-handoff')) {
    cadena.push({ nombre: 'compact-handoff', args: [] });
  }

  const estancado = (runtime === 'gemini' || runtime === 'antigravity') && evento === 'Stop';
  if (estancado && vecesBloqueado(runtime, sesion) > 0) payloads[0].stop_hook_active = true;
  const res = ejecutar(cadena, payloads, runtime, raiz, deOrden || deLectura);
  if (estancado) vecesBloqueado(runtime, sesion, res.bloqueo ? vecesBloqueado(runtime, sesion) + 1 : 0);

  // En otro runtime las skills se buscan en .agents/skills: el enlace se hace solo la primera vez.
  if (evento === 'SessionStart') {
    const { estado } = enlazar(raiz);
    if (estado === 'creado' || estado === 'rehecho') res.contexto.push('[enlazar-skills] He enlazado .agents/skills → .claude/skills: las skills del kit se ven a partir de la próxima sesión.');
    if (estado === 'ocupado') res.contexto.push('[enlazar-skills] .agents/skills existe y no apunta a .claude/skills, así que las skills del kit no se ven. Revisa esa carpeta y lanza node .claude/hooks/enlazar-skills.cjs.');
  }
  return responder(runtime, evento, res, sesion);
}

function salir({ json, stderr, code = 0 }) {
  if (stderr) process.stderr.write(`${stderr}\n`);
  if (json) process.stdout.write(JSON.stringify(json));
  process.exitCode = code;
}

function main() {
  const { runtime, evento, fichero, hooks } = leerArgs(process.argv.slice(2));
  if (!RUNTIMES.includes(runtime)) {
    process.stderr.write(`[adaptador] runtime desconocido «${runtime}»: usa ${RUNTIMES.join(', ')}.\n`);
    return;
  }
  const seguro = (entrada) => {
    try { salir(procesar(runtime, evento, fichero, hooks, entrada)); } catch (e) {
      process.stderr.write(`[adaptador] ${e && e.message ? e.message : e}\n`);
      salir(neutro(runtime, evento));
    }
  };
  if (runtime === 'git') return seguro(''); // los hooks de git no traen nada por stdin
  let entrada = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { entrada += c; });
  process.stdin.on('end', () => seguro(entrada));
  process.stdin.on('error', () => seguro(''));
}

module.exports = { normalizar, responder, neutro, limpiarMensaje, limpiarPrompt, extraerUltimoUserInput, ficherosDeParche, desdeArgv, citar };

if (require.main === module) main();
