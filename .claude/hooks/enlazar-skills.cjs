#!/usr/bin/env node
// enlazar-skills — deja `.agents/skills` apuntando a `.claude/skills`, sin copiar nada.
//
//   node .claude/hooks/enlazar-skills.cjs [raíz-del-repo]
//
// Codex y Gemini CLI buscan las skills del proyecto en `.agents/skills/` (Antigravity también, y además
// lee `.agents/skills.json`); Claude Code, Cursor y Copilot, en `.claude/skills/`. Las skills viven en un
// solo sitio, `.claude/skills/`, y aquí se enlaza el otro: en Windows con una junction (no pide permisos
// de administrador ni el modo desarrollador), en el resto con un symlink relativo.
//
// El enlace es de cada clon, como `core.hooksPath`: va en .gitignore y no se versiona. Lo crea este script
// a mano y, solo, el adaptador al abrir sesión en Antigravity, Gemini CLI o Codex.
//
// Nunca borra nada que no sea un enlace suyo: si `.agents/skills` existe y es una carpeta de verdad (o un
// enlace a otro sitio), lo deja y lo dice. Un enlace roto (el repo se movió de carpeta) se rehace.
// Sale con 0 si el enlace queda bien, con 1 si no ha podido.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function raizDelRepo(desde) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: desde, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const real = (p) => { try { return fs.realpathSync(p); } catch { return ''; } };

// { estado, ruta }: 'ya' (estaba bien), 'creado', 'rehecho', 'sin-skills' (no hay .claude/skills),
// 'ocupado' (hay otra cosa y no se toca) o 'error'.
function enlazar(raiz) {
  const origen = path.join(raiz, '.claude', 'skills');
  const destino = path.join(raiz, '.agents', 'skills');
  if (!fs.existsSync(origen)) return { estado: 'sin-skills', ruta: destino };
  let previo = null;
  try { previo = fs.lstatSync(destino); } catch { /* no existe */ }
  let estado = 'creado';
  if (previo) {
    if (!previo.isSymbolicLink()) return { estado: 'ocupado', ruta: destino }; // carpeta de verdad: no se toca
    const apunta = real(destino);
    if (apunta && apunta === real(origen)) return { estado: 'ya', ruta: destino };
    if (apunta) return { estado: 'ocupado', ruta: destino }; // enlace a otro sitio: es de alguien
    // Roto: se quita solo el enlace. rmdir sin recursive nunca entra en el destino.
    try { fs.unlinkSync(destino); } catch { try { fs.rmdirSync(destino); } catch { return { estado: 'error', ruta: destino }; } }
    estado = 'rehecho';
  }
  try {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    if (process.platform === 'win32') fs.symlinkSync(origen, destino, 'junction');
    else fs.symlinkSync(path.relative(path.dirname(destino), origen), destino, 'dir');
  } catch {
    return { estado: 'error', ruta: destino };
  }
  return { estado, ruta: destino };
}

module.exports = { enlazar, raizDelRepo };

if (require.main === module) {
  const raiz = process.argv[2] ? path.resolve(process.argv[2]) : (raizDelRepo(process.cwd()) || process.cwd());
  const { estado, ruta } = enlazar(raiz);
  const textos = {
    ya: `${ruta} ya apunta a .claude/skills.`,
    creado: `Enlazado ${ruta} → .claude/skills. Abre una sesión nueva para que Codex o Gemini vean las skills.`,
    rehecho: `El enlace ${ruta} estaba roto y se ha rehecho hacia .claude/skills.`,
    'sin-skills': `No hay .claude/skills en ${raiz}: nada que enlazar.`,
    ocupado: `${ruta} ya existe y no es un enlace a .claude/skills. No lo toco: muévelo o bórralo tú y vuelve a lanzarme.`,
    error: `No he podido crear ${ruta}. En Windows prueba: mklink /J ".agents\\skills" ".claude\\skills"`,
  };
  console.log(`[enlazar-skills] ${textos[estado]}`);
  process.exitCode = estado === 'ocupado' || estado === 'error' ? 1 : 0;
}
