# AGENTS.md — Examen DAM 2º · Android

> Instrucciones para **cualquier agente de código** que trabaje en este repo (Claude Code, Antigravity, Gemini CLI, Codex, Cursor, Copilot…). Fuente única y portable. Lo específico de Claude Code vive en `CLAUDE.md`, que importa este fichero; lo de Antigravity y Gemini CLI, en `GEMINI.md`.

## Qué es

Toolkit de agentes para **resolver los ejercicios de un examen de Android de 2º de DAM** (Java + XML) ciñéndose a lo dado en clase. La persona pasa el enunciado, contesta una o dos rondas de preguntas sencillas y recibe cada ejercicio completo, compilado y listo para pegar en Android Studio. Después puede pedir retoques en sus palabras («este botón así»). Perfil de la persona: alumno de 2º de DAM que quiere el control del resultado sin entrar en detalles técnicos; habla en llano (pantallas, botones, textos), nunca de arquitectura ni librerías.

## Reglas no negociables

1. **Solo lo dado en clase.** La fuente de verdad es `knowledge/temario.md` y las recetas de `knowledge/patrones/` (recetas por tema). Nada de Kotlin, Compose, Fragments, ViewModel, Room, corrutinas ni `startActivityForResult`. Si el enunciado pide algo fuera, se avisa en la ronda 1 y se propone lo más cercano.
2. **Cero invención.** Clase, método o atributo que no esté en las fuentes ni en los ejercicios de clase (`C:\Users\SOFT7\Downloads\Repo\Repo`) no se escribe de memoria: se marca «no verificado» y se cuenta.
3. **Compilar es la prueba de que algo existe.** Nadie dice «compila» sin un `BUILD SUCCESSFUL` del revisor; sin él, la entrega dice «NO COMPILADO: motivo». `BUILD SUCCESSFUL` no significa «hace lo que pide el enunciado».
4. **Vago → una propuesta concreta** («160dp, #274c77, 18sp») y se pregunta; no se rellena con adornos. Un retoque cambia solo lo pedido.

## Para sacar un 10 sin pasarse

Todos los requisitos explícitos con sus ids, nombres y textos exactos · lo básico que mira un profesor (campo vacío, `null`, lista vacía, Activities en el Manifest, dependencias en Gradle, `realm.close()`) · código limpio con comentarios cortos en español · ningún extra que nadie pidió.

## Stack

Android, Java 11 y XML, AndroidX, RecyclerView, Realm 10.15.1 (solo si el enunciado lo pide). Sin gestor de paquetes aparte: Gradle de cada esqueleto.

## Comandos

```sh
git config core.hooksPath .githooks      # una vez por clon: pre-commit (secretos), commit-msg (firma de IA), pre-push (ramas protegidas + .githooks/checks)
node .claude/hooks/enlazar-skills.cjs    # una vez por clon: .agents/skills → .claude/skills, para Codex y Gemini CLI
node .claude/skills/nuevo-agente/scripts/comprobar.mjs   # ¿tienen los agentes la forma de la plantilla? (solo lee)
node --test .claude/skills/orquesta/scripts/*.test.mjs   # puerta de merge de /orquesta
```
Compilar un ejercicio: `knowledge/compilar.md` (JDK y SDK de Android Studio; cada esqueleto exige su JDK). `.githooks/checks` lleva los dos primeros tests como comprobación del pre-push.

## Puntos de entrada

| Qué | Dónde |
|---|---|
| Entrada única para un examen | skill `/examen` (`.claude/skills/examen/SKILL.md`) |
| Enunciados pegados | `entrada/` |
| Ejercicio (la unidad de trabajo) | `examenes/<examen>/EJ-NN/` |
| Qué entra y qué no en el temario | `knowledge/temario.md` |
| Recetas de código tal como se hace en clase | `knowledge/patrones/` |
| «Lo quiero así» → atributos XML reales | `knowledge/ui-xml.md` |
| Cómo se compila y con qué esqueleto | `knowledge/compilar.md` · `plantilla/base`, `plantilla/realm` |
| Roles del squad | `.claude/agents/` · roster en `squad/_catalogo.md` |
| Convenciones que aplican siempre (léelas al empezar: solo Claude Code las carga solo) | `.claude/rules/*.md` |
| Objetivos y construcción del propio repo | `features/REGISTRO.md` |

## Unidad de trabajo: el ejercicio

Cada ejercicio de un examen vive en `examenes/<examen>/EJ-NN/` (por ejemplo `examenes/2026-t1/EJ-01/`) con `SPEC.md` (requisitos, decisiones de las rondas y su cabecera de estado), `solucion/` (los ficheros con rutas de proyecto Android: `app/src/main/java/...`, `res/...`, `AndroidManifest.xml`, Gradle si cambia) y `LEEME.md` (qué hace, orden de pegado, cambios de Gradle, imágenes necesarias, cómo probarlo). Está terminado cuando:

- cada requisito del enunciado está en ✅ con su fichero y línea;
- `revisor-android` da `APROBADO` con `BUILD SUCCESSFUL`, o consta «NO COMPILADO» con su motivo;
- no se usa nada de «No entra» ni nada «no verificado»;
- el `LEEME.md` dice el orden de pegado y qué imágenes añadir.

**Estados:** `pendiente` → `en curso` → `en revisión` (sobre un commit) → `cambios pedidos` o `aprobada` → `hecha` (la persona lo da por bueno); y `bloqueada`. El veredicto se escribe en la unidad (`Veredicto QA: APROBADA · commit <sha7> · <fecha>`); `Estado:`, `Veredicto QA:` y la columna «Escribe en (exclusivo)» son contrato que leen herramientas.

**Varios ejercicios:** uno detrás de otro, cada uno con sus rondas. **Construir el propio repo** (recetas, ensayos) se hace con `/objetivo` y `/orquesta`: unidades `F-NN` en `features/`, de unas 300 líneas como mucho.

## Flujo de trabajo

- Ramas protegidas: `main`, `master`, `staging`, `produccion`, `production`; a ellas solo se llega por PR aprobada. `.githooks/pre-push` rechaza el push directo si git lo ejecuta (con `core.hooksPath`, ver «Comandos»). Trabajo en `feat/*`, `fix/*` o `chore/*`.
- Commits convencionales (`feat:`, `fix:`, `docs:`…), en español.
- La autoría es del desarrollador de la sesión: ningún agente de IA como autor o coautor, ni pies, trailers o emojis de firma.
- **Nada de commit, push ni PR sin petición explícita** en ese momento. Excepción: los commits y merges locales de `/orquesta` en su rama de integración (ver «Trabajo multi-agente»).

## Trabajo multi-agente

1. **Una tarea = una rama = un worktree**, bajo `.claude/worktrees/<tarea>/` (ignorado por git): `git worktree add .claude/worktrees/<tarea> -b feature/<tarea>`. Nunca dos agentes en el mismo directorio salvo la excepción del punto 4.
2. **Una pieza, un dueño:** dos agentes no editan a la vez el mismo fichero ni la misma unidad.
3. **Los roles son portables:** sin subagentes en tu herramienta, adopta un rol leyendo `.claude/agents/<rol>.md`. Un rol de solo lectura (`qa`) no edita; `revisor-android` solo escribe en el scratchpad al compilar. Comprueba que `git status --porcelain` sigue igual al terminar.
4. **Excepciones bajo un plan de `/orquesta`**, aprobado y anotado en `features/REGISTRO.md`:
   - Varios agentes pueden trabajar en el mismo árbol si el plan asigna a cada uno sus ficheros en exclusiva.
   - Los commits locales en `orquesta/<proyecto>`, el commit de entrega de cada constructor y el merge de cada unidad que `qa` aprobó y pasa la puerta (`.claude/skills/orquesta/scripts/puerta.mjs`) los cubre la aprobación del plan. Nunca es una rama protegida y no se hace push de ella.

## Cada herramienta

| | Instrucciones | Skills | Hooks |
|---|---|---|---|
| Claude Code | `CLAUDE.md`, que importa este | `.claude/skills/` | `.claude/settings.json` |
| Antigravity | este y `GEMINI.md` | `.agents/skills.json` | `.agents/hooks.json` |
| Gemini CLI | este y `GEMINI.md` (`.gemini/settings.json`) | `.agents/skills/` | `.gemini/settings.json` |
| Codex | este | `.agents/skills/` | `.codex/hooks.json` |
| Cursor, Copilot | este | `.claude/skills/` | solo los de git |

- `.agents/skills` es un enlace a `.claude/skills` que no se versiona: lo crea `enlazar-skills.cjs`.
- Fuera de Claude Code los hooks pasan por `.claude/hooks/adaptador.cjs`; la primera vez piden confiar en el proyecto.
- Las skills nombran las herramientas de Claude Code. En otra: `AskUserQuestion` → tu herramienta de preguntas o el chat; `Agent` con un rol → tu mecanismo de subagentes con `.claude/agents/<rol>.md` como prompt; `isolation: "worktree"` → `git worktree add`.

## Memoria

Este repo **no usa memoria persistente** por decisión de la persona (D-01): cada examen es un único uso. Lo que dure vive en `knowledge/` y `examenes/`.

## Convenciones

Detalle por tema en `.claude/rules/`: `code-style.md` · `ejecuciones.md`. Idioma de la documentación y los prompts: español.

## Lo que no se hace

- Leer, escribir o commitear secretos (`.env*` salvo `.env.example`, claves).
- `git push --force`, `git reset --hard`, `rm -rf`.
- Traer código de terceros sin evaluarlo con `/vendoriza` (el repo no lo trae: si hace falta, se pide).
- Descargar o instalar herramientas sin que la persona lo haya pedido.
- Compilar dentro de `plantilla/` o de `examenes/`: se compila en una copia del scratchpad.
