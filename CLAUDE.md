@AGENTS.md

# CLAUDE.md — lo específico de Claude Code

> Lo común a cualquier agente está en `AGENTS.md`, importado arriba. Aquí solo va lo que depende de mecanismos de Claude Code.

## Supervisor y squad

- **El supervisor eres tú, el main loop**, con la skill `/examen`. Eres el único que habla con la persona; un subagente nunca orquesta a otros ni le pregunta nada.
- Squad, invocable con la herramienta `Agent` (roster y activación en `squad/_catalogo.md`):
  - `constructor-android` → escribe y retoca el código de un ejercicio.
  - `revisor-android` → compila, cruza ids, Manifest, Gradle, temario y requisitos; veredicto `APROBADO` / `CAMBIOS PEDIDOS`.
  - `qa` → veredicto de las unidades de construcción de este repo (recetas, ensayos) bajo `/orquesta`.
- Todo lo que un agente necesita se le pasa **por escrito en el prompt** (enunciado, decisiones de las rondas, carpeta del ejercicio): no ve esta conversación.
- Si la persona nombra un agente o una `/skill`, esa invocación manda.
- **Rondas de preguntas:** como máximo dos, con `AskUserQuestion`, 2-4 preguntas cada una y una opción recomendada. Solo se pregunta lo que la persona notaría al ejecutar; nunca arquitectura ni librerías.

## Skills

- `/examen` — entrada única para un examen: lee el enunciado, hace las rondas, reparte entre constructor y revisor, entrega y retoca. También ante «cambia este botón».
- `/objetivo` y `/orquesta` — para construir y ampliar el propio repo (nuevas recetas, ensayos): anotan el objetivo en `features/REGISTRO.md`, lo parten en unidades y las construyen. En modo por oleadas, `/orquesta` lanza con `Agent` a los agentes de cada oleada a la vez.
- `/nuevo-agente` — para dar de alta o alinear un agente con la forma estándar (`comprobar.mjs`).

## Multi-agente en Claude Code

- Sesiones en paralelo: `claude --worktree <tarea>`. Subagentes que editan en paralelo: `isolation: "worktree"`; `settings.json` lleva `"worktree": {"baseRef": "head"}` para que vean los commits locales.
- Los hooks se invocan como `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<hook>.cjs"`: la ruta sale de la raíz de la sesión.

## Hooks y permisos

- Cableados en `.claude/settings.json`: `version-check` (al abrir sesión), `compact-handoff` (guarda y reinyecta el estado al compactar), `secret-scan`, `no-ai-attribution`, `block-protected-merges` y `vendor-gate` (antes de cada orden de shell, matcher `Bash|PowerShell`) y `unit-close` (al terminar). Los otros runtimes cablean los mismos (salvo `compact-handoff`) en `.agents/hooks.json`, `.gemini/settings.json` y `.codex/hooks.json`: un hook que entra o sale, en los cuatro.
- `attribution` vacío en `settings.json` evita que Claude Code firme commits y PR.
- `vendor-gate` corre sin `--estricto`: bloquea clonar e instalar desde una URL, no las dependencias de Gradle.
- Personal y fuera de git: `.claude/settings.local.json` y `CLAUDE.local.md` (plantillas en el kit AI_SDD).
- Integraciones MCP: `.mcp.json`, vacío.

## Compactación

Al resumir esta conversación, conserva siempre: la rama y el worktree en que trabajas; el **examen y el ejercicio** abiertos (`examenes/<examen>/EJ-NN`) y su estado; el paso exacto en que estás y lo siguiente; las **decisiones de las rondas** que aún no estén en `SPEC.md`; el último veredicto de `revisor-android` o `qa` con el commit sobre el que se dio. `compact-handoff` reinyecta lo que se saca de git y del disco.

## ClaudeBot

La mascota de escritorio que refleja lo que está haciendo Claude Code: piensa, escribe código,
ejecuta un comando o te pide permiso. **No hay nada que instalar en este repo**: se instala una
vez por equipo y vale para todos los proyectos a la vez, porque sus hooks van en
`~/.claude/settings.json`, a nivel de usuario y no de proyecto.

Se ejecuta el instalador, doble clic, y ya: él solo se cablea a Claude Code y se apunta al inicio
de Windows. Después hay que **abrir una sesión nueva** de Claude Code, porque los hooks se leen al
arrancar la sesión. `Win+Alt+C` la muestra y la esconde.

Qué verás: un bocadillo por sesión, con el proyecto, la herramienta y cuánto lleva; el modelo y
el consumo de contexto, con aviso cuando toca `/compact`; y el nombre del agente del squad que
esté trabajando, con su tiempo al terminar. Si una sesión pide permiso, se resalta y reclama.

Su código vive en su propio repositorio, `vault-ia-001/FCT.ClaudeBot`. Para instalarla no se compila nada:
pide la carpeta con `Preparar-equipo.cmd` y el `ClaudeBotOverlay-Setup-*.exe` al lado, y doble clic.
