---
name: orquesta
description: "Lleva un BRIEF.md o un objetivo O-NN hasta software construido por la squad en paralelo: una ronda de preguntas, unidades de ~300 líneas (plan en feature_list.json o SPEC.md) y una aprobación. En modo flujo, hasta 3 constructores y 2 `qa` en segundo plano; cada unidad aprobada cruza la puerta de merge (scripts/puerta.mjs) hacia orquesta/<proyecto>. Invocar con /orquesta, /orquesta ejecutar [--oleadas] o /orquesta estado. Úsala tras /arranca o con varias features por hacer."
argument-hint: "[ejecutar [--oleadas] | ejecutar oleada N | estado]"
version: 1.9.0
---

# /orquesta — del brief al software, en paralelo

Tu trabajo es convertir el `BRIEF.md` en unidades de trabajo con su especificación, ordenarlas para que se puedan construir en paralelo y, con la aprobación del usuario, construirlas. **Un prompt, un objetivo:** del `/orquesta` a la integración no hace falta otro prompt, solo una ronda de preguntas y una aprobación. **Lo conduces tú, el supervisor** (el agente principal): las preguntas son una conversación con el usuario, y solo el supervisor puede lanzar subagentes, porque un subagente no abre otros (`policies/arquitectura.md §2`).

No hay un documento de plan aparte: **el plan es el registro de unidades y la especificación de cada una.** Son los mismos ficheros con los que después se trabaja, así que el plan no se queda viejo en un cajón.

**Lo que permite el paralelo es que cada agente escriba solo en sus ficheros, no el número de agentes.** Dos agentes trabajan a la vez solo si ninguno escribe en lo que tiene asignado el otro y el contrato que comparten ya está fijado.

**Lo que da el ritmo es que nada espere sin motivo:** features pequeñas (~300 líneas de diff), un `qa` independiente sobre cada una en cuanto se entrega, un veredicto atado al commit que juzgó y el merge a la rama de integración sin esperar a una persona. La persona entra al aprobar el plan, cuando algo se bloquea y al final, para llevar la integración a su rama.

## Modos

| Invocación | Qué hace |
|---|---|
| `/orquesta` | Fases 1 a 4: lee, pregunta, escribe las features y su orden y pide una aprobación. Si se aprueba con «ejecutar ya», sigue con la Fase 5 en modo flujo en la misma sesión. Hasta la aprobación no toca código. |
| `/orquesta ejecutar` | Fase 5 en **modo flujo** (por defecto): una cadena en segundo plano que construye, revisa con `qa` y mergea feature a feature. |
| `/orquesta ejecutar --oleadas` | Fase 5 en **modo por oleadas**: lanza una oleada entera, espera a que termine, integra y pasa a la siguiente. Para proyectos pequeños, sin worktrees o cuando se quiere controlar cada paso. |
| `/orquesta ejecutar oleada N` | Retoma o repite desde la oleada N (en cualquiera de los dos modos). |
| `/orquesta estado` | Una tabla de features: estado, veredicto con su sha y oleada. No toca nada. |

**Como fase de `/objetivo`.** Cuando la invoca `/objetivo`, la ronda de preguntas y la aprobación ya vienen hechas: no se repiten. Lees lo decidido en `features/REGISTRO.md` (el `O-NN` de la sección «Objetivos», las decisiones `D-NN` y el «Plan de ejecución») y entras directamente en la Fase 3 y, con el plan escrito, en la Fase 5 en modo flujo. Cada `SPEC.md` nuevo cita su `O-NN` en la cabecera. Si al planificar aparece algo que la aprobación no cubría (un rol que falta, un plazo que no cabe), eso sí vuelve a la persona.

## La unidad de trabajo

Manda la que declara el `AGENTS.md` del proyecto, en su sección «Unidad de trabajo»: su carpeta, su patrón de id y su Definición de Done. Esta skill la usa tal cual, sin renombrar nada.

**Si el proyecto no declara ninguna**, propón esta en la Fase 2 y, si se acepta, anótala en el `AGENTS.md`:

- `features/F-NN-<slug>/SPEC.md`: una carpeta por feature, `NN` correlativo por orden de apertura y slug en kebab-case (`F-01-cimientos`, `F-02-alta-de-pedido`).
- `features/REGISTRO.md`: el índice de features y el plan por oleadas.
- La plantilla, en este orden de preferencia: `features/_PLANTILLA/SPEC.md` del proyecto; si no está, `templates/features/` del kit (`SPEC.md.tmpl`, `REGISTRO.md.tmpl`, `README.md.tmpl`), que se copian a `features/_PLANTILLA/` y `features/REGISTRO.md`; si tampoco, la misma estructura escrita a mano: estado y veredicto de `qa` en la cabecera, qué resuelve, criterio de aceptación numerado (`C1`, `C2`…), alcance dentro y fuera, agentes con los ficheros que escribe cada uno, contrato que usa, cierre, revisión QA, notas y decisiones, lo que se aprendió y Done.

Si el `AGENTS.md` declara otra unidad (un caso, un informe, una tarea), cambian los nombres, no el método: cada unidad tiene su especificación con criterio de aceptación y ficheros asignados, y un registro la ordena en oleadas. Para una tarea documental hay plantilla en `templates/tareas/TAREA.md.tmpl` del kit (`03_TAREAS/T-NN_<nombre>.md`). **La cabecera es contrato:** `Estado:` y `Veredicto QA:` a principio de línea y la columna «Escribe en (exclusivo)» de la tabla de agentes los leen la puerta de merge, el hook `unit-close` y `/semaforo ritmo`, así que una unidad declarada por el proyecto conserva esas tres piezas aunque cambie lo demás. En el resto de esta skill, «feature» y «`SPEC.md`» se leen como la unidad y la especificación del proyecto.

## El plan en JSON: `feature_list.json`

**Para un plan nuevo, el estado y el contrato de las features viven en un solo fichero**, `feature_list.json`, en la raíz del repo y en la rama de integración. Lo escribes tú, el supervisor, y **solo con `features.mjs`**: ningún agente lo edita a mano y tú tampoco (una coma de más rompe todo; el script valida la transición y el plan entero antes de escribir, escribe de golpe y apunta la línea en `progress/history.md`). La prosa que no cabe en él va al `REGISTRO.md` (decisiones `D-NN`, objetivos `O-NN`) y a la PR, no a un fichero por feature.

Cada feature lleva: `id`, `name` (el slug que da nombre a `orquesta/<name>`), `title`, `depends_on` (ids), `files` (las rutas o globs que **solo ella** escribe), `acceptance` (`[{ criterio, verify }]`, con `verify` un comando que `qa` ejecuta o `null` si es manual), `status`, `intentos` (vueltas de «cambios pedidos») y `sha` (el commit que se entrega o se juzga); y, si aportan, `agente`, `oleada`, `objetivo`, `description`, `fuera_de_alcance`, `notas` (hasta 500 caracteres: si no caben, la feature es demasiado grande) y `motivo_bloqueo`. Plantilla: `features/_PLANTILLA/feature_list.json` del proyecto o, si no está, [`templates/features/feature_list.json.tmpl`](../../../templates/features/feature_list.json.tmpl) del kit.

```sh
node .claude/skills/orquesta/scripts/features.mjs validar                       # el plan entero: forma, dependencias, ciclos, rutas que se pisan
node .claude/skills/orquesta/scripts/features.mjs listos                        # las pendientes que ya pueden arrancar
node .claude/skills/orquesta/scripts/features.mjs entrada <id|name> [--qa]      # lo que recibe un agente: solo su entrada (a qa, sin notas ni vueltas)
node .claude/skills/orquesta/scripts/features.mjs marcar <id|name> <estado> [--sha <sha>] [--motivo "…"]
node .claude/skills/orquesta/scripts/features.mjs convertir                     # un proyecto con SPEC.md pasa a feature_list.json
```

| Estado en el JSON | Estado de la unidad en markdown | Qué lo mueve |
|---|---|---|
| `pending` | `pendiente` | lo escribe la Fase 3 |
| `in_progress` | `en curso` | `marcar <id> in_progress`, al lanzar al constructor |
| `in_qa` | `en revisión` | `marcar <id> in_qa --sha <sha>`, con el commit que entregó |
| `approved` | `aprobada` | `marcar <id> approved`, con el veredicto `APROBADA` de `qa` |
| `changes_requested` | `cambios pedidos` | `marcar <id> changes_requested --motivo "…"`: cuenta una vuelta |
| `done` | (mergeada) | `marcar <id> done`, tras el merge a la integración |
| `blocked` | `bloqueada` | `marcar <id> blocked --motivo "…"`, o solo, a la tercera vuelta |

**Cada vuelta al constructor cuenta una**, venga de donde venga: `qa` pide cambios, la puerta rechaza, hay conflicto o se revierte un merge. A la tercera, `marcar` bloquea la feature por sí solo y la persona decide. `done` es «mergeada en la integración»; llevar la integración a su rama, con `/pr`, sigue siendo de la persona.

**Un proyecto con `SPEC.md` sigue funcionando** (`--spec` en la puerta, las cabeceras de siempre) y se pasa a JSON con `features.mjs convertir` cuando la persona quiera: las dependencias no constan en la SPEC y hay que escribirlas a mano, y lo que no se pueda sacar sale como aviso. Mientras no se convierta, todo lo de abajo que habla de `SPEC.md` y de «Veredicto QA» se lee tal cual.

## Estados de una unidad

Uno solo a la vez, en la cabecera de su especificación (`Estado:`) y en su fila del registro:

`pendiente` → `en curso` → `en revisión` → `cambios pedidos` | `aprobada` → `hecha`; y `bloqueada`.

- `en revisión`: el constructor entregó un commit y espera a `qa`. Lo anotas tú con el sha que devuelve.
- `cambios pedidos` / `aprobada`: los pones tú con el veredicto de `qa`, junto con la línea `Veredicto QA: APROBADA · commit <sha7> · <AAAA-MM-DD>` (o `CAMBIOS PEDIDOS · …`) y la ronda en la sección «Revisión QA» del `SPEC.md`.
- `hecha`: la persona la acepta (merge de la integración a su rama, o aceptación explícita).
- Si la unidad se toca después de `aprobada`, vuelve a `en revisión`: el veredicto vale solo para el commit que juzgó.
- Como mucho **2 vueltas** de `cambios pedidos`. A la tercera, `bloqueada` y se lleva a la persona.

Con `feature_list.json` el plan es tuyo durante la ejecución y lo mueves con `features.mjs marcar`; con `SPEC.md`, el `SPEC.md`: el constructor no toca su estado, su veredicto ni sus notas; te devuelve lo que haya que anotar y lo escribes tú en la rama de integración.

## Fase 1 — Leer, sin preguntar todavía

1. **El brief y lo que ya haya:** `BRIEF.md`; `AGENTS.md` (stack, comandos, reglas no negociables, unidad de trabajo y su Done, flujo de ramas, trabajo multi-agente); `CLAUDE.md` (lo de Claude Code), leído aparte, porque con `Read` su línea `@AGENTS.md` no se expande; `features/REGISTRO.md` y los `SPEC.md` existentes. No se repregunta lo que el brief ya responde.
2. **El squad que existe de verdad:** `.claude/agents/`. Solo planificas con agentes que existen. Si falta un rol, lo dices («hace falta alguien para X: lo hace el supervisor o se crea el agente»), pero no lo inventas. El modo flujo necesita `qa`; si el proyecto no lo tiene, dilo y propón traerlo del kit (como se inyecta un agente en la adopción de `/arranca`) o el modo por oleadas con `tester` y `revisor`.
3. **El repo:** stack, carpetas, tests y CI. Si existe `graphify-out/`, las preguntas de arquitectura van a `graphify-consultor` y no a grep.
4. **Lo aprendido:** las issues abiertas de mejora del repo (`gh issue list --label mejora`) y, en un proyecto, las del kit (el repo de `.claude/kit-version.json`), más «Lo que se aprendió» de las especificaciones cerradas y la memoria del proyecto: aplica a este plan lo que afecte a cómo se planifica.

## Fase 2 — Una sola ronda de preguntas

(Si te invoca `/objetivo`, ya está hecha: sáltala.)

Una ronda de como mucho dos llamadas seguidas a `AskUserQuestion` (4 preguntas cada una, que es lo que admite la herramienta), y solo de las que cambian el plan. Las habituales, de las que eliges las que apliquen:

- **Unidad de trabajo:** solo si el `AGENTS.md` no declara ninguna; propones la de arriba.
- **Datos:** ¿de dónde salen (API existente, base de datos, fichero o hay que crearlos)? ¿Hay entorno de pruebas? Si un agente va a leer una base de datos, eso pasa antes por `/blindar-mcp-sql`.
- **Contrato:** ¿lo fija el backend, existe ya (OpenAPI) o el proyecto es solo frontend?
- **Autenticación:** la del proveedor de identidad del proyecto, ninguna o la de la aplicación que lo aloja.
- **UI:** ¿maqueta previa o directamente con el design system del proyecto? Nombra `/design` como opción solo si el proyecto tiene esa skill (`.claude/skills/design/`); si no, la maqueta la hace el agente de frontend o se salta.
- **Despliegue:** ¿dónde?, y ¿entra en este alcance?
- **Datos sensibles:** ¿hay datos personales? Si los hay, `ciberseguridad` entra en la oleada de puertas.
- **Orden:** ¿qué tiene que funcionar primero para enseñarlo?
- **Aislamiento:** el modo flujo trabaja con un worktree por feature (la regla «una tarea = una rama = un worktree» de `AGENTS.md`), porque cada entrega es un commit en su rama. La alternativa es el modo por oleadas con ficheros asignados en el mismo árbol, y también hace commits: uno por feature, del supervisor, en la integración. No hay modo sin commits locales en la rama de integración, porque el veredicto de `qa` vale para un commit; quien no los quiera en su rama, lleva la integración a ella por squash. Con ficheros asignados, las salidas compartidas (`dist/`, `coverage/`, el lockfile, las dependencias) no son de ningún agente salvo que el plan las asigne.

Lo que quede sin responder se marca `[por confirmar]` junto a la feature que bloquea. Las respuestas se anotan como decisiones `D-NN` en el registro.

Si una pregunta de la ronda la tendría que haber resuelto el brief, apúntalo para el cierre: es una mejora del método (de `/brief` o de su plantilla), con destino `kit`.

## Fase 3 — Features y orden

1. **Parte el brief (o el objetivo) en features.** Una feature es algo que se puede enseñar, de medio día a dos días, con un criterio de aceptación verificable. Cada una cita el campo del brief o el `O-NN` del que sale; lo que no sale de ahí no entra. Si el total no cabe en los días del brief, propón qué recortar usando el *fuera de alcance*: no alargues el plazo en silencio.
2. **Tope de tamaño: ~300 líneas de diff por feature.** Estima cada una y anótalo en `Tamaño previsto` del `SPEC.md` y en la columna `Tamaño` del `REGISTRO.md`. Si una pasa de ~300, pártela (por capa, por caso de uso, por pantalla) hasta que cada trozo se pueda enseñar y revisar entero. Una PR pequeña la revisa `qa` de verdad; una grande, por encima.
3. **Con un plan nuevo, escribe `feature_list.json`** (desde la plantilla, y `features.mjs validar` hasta que dé válido): una entrada por feature, con sus `files` en exclusiva, su criterio de aceptación con el `verify` que `qa` va a ejecutar y sus `depends_on`. Para un proyecto con unidades en markdown: **escribe cada especificación** (`features/F-NN-<slug>/SPEC.md` por defecto) desde la plantilla de «La unidad de trabajo»: qué resuelve, criterio de aceptación numerado (`C1`, `C2`…, que es lo que `qa` ejecuta), dentro y fuera, la tabla de agentes con los ficheros que escribe cada uno en exclusiva (la puerta de merge los lee de ahí, así que van también las rutas de los tests del criterio, que escribe el constructor en la propia feature), el contrato que usa, las decisiones, `Estado: \`pendiente\`` y `Veredicto QA: —`.
4. **Ordénalas en oleadas** en `features/REGISTRO.md`. En modo flujo, la oleada es una **dependencia**, no una barrera: una feature de la oleada 2 arranca en cuanto lo que lee de la oleada 1 está mergeado en la integración, sin esperar a que cierre toda la oleada 1.
   - **Oleada 0, contrato y esqueleto.** La hace un solo agente o tú mismo. Es lo que varias features comparten: DTOs o esquema de la API, tipos, rutas, estructura de carpetas, configuración. Sin ella, el trabajo en paralelo produce dos versiones de la verdad. Si el contrato es pequeño, escríbelo tú.
   - **Oleadas 1 a N, construcción en paralelo.** Dos features van en la misma oleada solo si no escriben en los mismos ficheros y lo que una lee de la otra ya existe (viene de la oleada 0 o de una anterior). Si no, van en oleadas distintas, y el `SPEC.md` de la que espera dice de cuál depende.
   - **Puertas.** `qa` sobre **cada feature** al entregarse, dentro del flujo; los tests de su criterio de aceptación ya vienen en el commit, porque los escribe su constructor. `tester` (cobertura, huecos entre features y contrato de arquitectura) y, a la vez, `ciberseguridad` si hay datos personales, autenticación, secretos o algo expuesto, como hasta ahora: en la oleada de puertas, o antes sobre una feature concreta si `qa` lo avisa. **`revisor` al final, sobre la integración entera.** Los agentes de construcción dicen que «cierran orquestando a tester y ciberseguridad», pero un subagente no puede lanzar otros: estas puertas las lanzas tú.
   - Topes: en flujo, **3 constructores y 2 `qa` a la vez**; en oleadas, 4 agentes por oleada. Más saturan la integración.

## Fase 4 — Aprobación y prompt de ejecución

(Si te invoca `/objetivo`, la aprobación ya está dada y cubre todo lo de esta fase: no la pidas otra vez. Las condiciones de abajo sí se comprueban, también en ese camino: lo que la aprobación no arregla (`worktree.baseRef`, los runners) se resuelve en la oleada 0 o se dice en el reporte.)

Enseña el plan en una pantalla (features con su tamaño, oleadas y dependencias, quién hace qué, qué ficheros escribe cada uno, modo, aislamiento y preguntas pendientes) y pide **una** aprobación con `AskUserQuestion`:

- **Aprobar y ejecutar ya** (recomendada si no quedan `[por confirmar]` que bloqueen la oleada 0): sigues con la Fase 5 en modo flujo sin esperar otro prompt.
- **Aprobar y ejecutar más tarde:** el plan queda en `REGISTRO.md` y se retoma con `/orquesta ejecutar`.
- **Cambiar algo:** ajustas el plan y vuelves a pedir aprobación una vez.

**Registra el proyecto en el monitor.** Al empezar la Fase 5 (o al retomar con `/orquesta ejecutar`), lanza desde la raíz del repo `node .claude/skills/semaforo/scripts/tablero.mjs --registrar`. Apunta el repo en `~/.claude/tablero.json`, una vez, para que el monitor lo enseñe junto a todo lo orquestado, viva donde viva. Solo escribe en ese fichero personal, fuera del repo, así que no pide otro OK; si falla, avísalo en una línea y sigue.

**Ofrece el monitor, una vez por ejecución.** Al empezar la Fase 5 (o al retomar con `/orquesta ejecutar`), si no hay ya un monitor escuchando (`GET http://127.0.0.1:4317/api/foto` no responde), pregunta con `AskUserQuestion`: «¿Abro el monitor del plan en el navegador?». Con sí, lánzalo en segundo plano desde la raíz del repo, con `node .claude/skills/semaforo/scripts/tablero.mjs --abrir`, y sigue sin esperar. Con no, no insistas: se abre cuando la persona quiera con ese mismo comando. Vale también cuando te invoca `/objetivo`: la aprobación del plan no cubre abrir un navegador ni dejar un proceso vivo. Solo lee; al acabar la ejecución, páralo si lo lanzaste tú y dilo.

**La aprobación cubre una rama de integración y los merges a ella.** Dilo así en el plan, con estas palabras o parecidas: «Con esta aprobación, el supervisor crea la rama local `orquesta/<proyecto>`, commitea en ella el plan y las bases, cada constructor commitea su entrega en su rama `orquesta/<feature>`, y el supervisor mergea en la integración (`git merge --no-ff`) cada feature que `qa` apruebe y pase la puerta. Nunca mergea a una rama protegida ni hace push. Llevar `orquesta/<proyecto>` a tu rama es tuyo, con `/pr`.»

Por qué una rama de integración: un worktree sale de un commit, no del árbol de trabajo, así que lo que no está commiteado no lo ve ningún agente aislado. La rama `orquesta/<proyecto>` sale de la rama actual del usuario. **Su primer commit es el plan:** `features/` (las `SPEC.md` y el `REGISTRO.md`) y lo que se haya anotado en el `AGENTS.md`. Sin ese commit, un agente aislado no encuentra su `SPEC.md` en el worktree. Son commits locales de trabajo, en una rama que no es la del usuario y sin push. Los hay en los dos modos y con los dos aislamientos: cada feature se entrega con un commit, porque el veredicto de `qa` vale para un commit. Si el usuario no quiere esos commits intermedios en su rama, que lleve la integración por squash.

Cuatro condiciones más, que el plan comprueba antes de proponer worktrees:

- **Árbol limpio antes de crear `orquesta/<proyecto>`, salvo el plan.** Lo que el usuario tenga a medias no entra nunca en la base. El plan que acabas de escribir sí: es lo único que `git status --porcelain` puede enseñar, aparte de `.claude/state/` (el handoff que escribe esta misma skill, que no es trabajo del usuario, no entra en la base y en los repos de `/arranca` ya va ignorado). Si enseña algo más, o si el `AGENTS.md` trae cambios del usuario además de la anotación del plan (`git diff -- AGENTS.md`), enséñale qué hay (`git status --short`) y pídele que lo commitee en su rama o lo aparque con `git stash`; no lo commitees tú ni lo arrastres a la rama de integración.
- **`.claude/settings.json` con `"worktree": {"baseRef": "head"}`.** Por defecto (`"fresh"`) Claude Code crea los worktrees de `isolation: "worktree"` desde `origin/HEAD`, que no tiene los commits locales de `orquesta/<proyecto>`; con `"head"` salen del HEAD local. Lo necesita el modo por oleadas con `isolation`; el modo flujo crea sus worktrees a mano y no depende de él. Si falta, dilo en el plan.
- **La rama del usuario no es protegida.** Si está en `main` o en otra rama protegida, la integración final sería un merge a esa rama, que no se hace desde la terminal. Propón antes su rama de trabajo (`feature/<algo>`) y crea `orquesta/<proyecto>` desde ella.
- **Los runners del proyecto no recorren los worktrees.** Si el proyecto usa alguno que recorre carpetas (Jest, ESLint, Metro…) o las features levantan servicios, la exclusión de `.claude/worktrees/` con su comprobación (patrón anclado a la raíz, como dice «Trabajo multi-agente» de `AGENTS.md`), o el puerto de cada feature (`.claude/rules/ejecuciones.md`), van en la oleada 0.

**Repo recién creado por `/objetivo`.** Su `main` tiene un solo commit, el de nacimiento (el esqueleto que dejaron las fases de `/arranca` y el `BRIEF.md`), que hizo `/objetivo` con su aprobación, y fuera de él solo está el plan. No hay trabajo de la persona a medias ni otra rama de la que salir, así que la condición de rama protegida no aplica; las otras tres, sí. `orquesta/<proyecto>` sale de ese commit (`git switch -c orquesta/<proyecto>`) y su primer commit es el plan, como siempre. La integración no llega a `main` con un merge desde la terminal: tras el primer publicado que describe `/objetivo`, la persona crea `feat/<proyecto>` desde `orquesta/<proyecto>` y abre la PR con `/pr`.

Anota en el «Plan de ejecución» del registro quién lo aprobó, cuándo, con qué opción (ejecutar ya o más tarde), el modo (flujo u oleadas) y el aislamiento; con worktrees, también la rama de integración y la última `<base>`. Para retomarlo en otra sesión, el prompt es `/orquesta ejecutar`. La versión larga, para una herramienta que no tenga la skill (Codex, Cursor…):

```
Lee AGENTS.md y ejecuta features/REGISTRO.md. Cada feature se construye en su rama orquesta/<feature> (worktree propio), escribiendo solo en sus ficheros, y se entrega con un commit. Sobre ese commit, un revisor de QA independiente comprueba el criterio de aceptación del SPEC y devuelve APROBADA o CAMBIOS PEDIDOS; anótalo en el SPEC con el sha. Lo aprobado que pase `node .claude/skills/orquesta/scripts/puerta.mjs` se mergea con --no-ff en orquesta/<proyecto>. Respeta las dependencias entre oleadas. Cierra con tester y ciberseguridad y, al final, revisor sobre la integración. No hagas commit ni PR fuera de orquesta/<proyecto> sin mi OK, nunca push y nunca merge a una rama protegida.
```

## Fase 5 — Ejecutar en modo flujo (por defecto)

En vez de esperar a que termine una oleada entera, mantienes una **cadena en segundo plano**: lanzas cada agente con `Agent` y `run_in_background: true`, y cada vez que uno termina (te llega su notificación) decides el siguiente paso. Nunca más de **3 constructores** y **2 `qa`** vivos a la vez.

**En Antigravity, Gemini CLI o Codex** el bucle es el mismo; cambia cómo se lanza cada agente ([`AGENTS.md`](../../../AGENTS.md), «Cada herramienta»):

- **Con subagentes en segundo plano** (Antigravity): uno por constructor o `qa`, con el cuerpo de su `.claude/agents/<rol>.md` y el prompt de delegación, trabajando en la ruta de su worktree. `qa` y el resto de roles de solo lectura, sin herramientas de escritura. Cada aviso de fin cuenta como la notificación del bucle.
- **Sin subagentes:** un proceso sin interfaz por agente, en su worktree, con su salida a un fichero que ignore git (`codex exec --cd .claude/worktrees/<feature> "<prompt>" > .claude/state/<feature>.log`; `qa` con `--sandbox read-only`). Entre paso y paso miras qué procesos han terminado; el sha de la entrega y el veredicto se leen de su salida.
- **Sin nada de eso:** en serie, adoptando tú cada rol. Se pierde el paralelo, no las puertas: cada unidad sigue pasando por `qa` sobre su commit y por la puerta antes del merge.

### Preparación (una vez)

1. Lee `REGISTRO.md`, los `SPEC.md` y, si existe, el último bloque de `.claude/state/handoff.md`.
2. **Crea la rama de integración** si no existe. `git status --porcelain` solo puede enseñar las rutas del plan (`features/` y, si se anotó, `AGENTS.md`) y `.claude/state/`, que no se stagea nunca; si enseña algo más, para y pregunta (Fase 4). Después, `git switch -c orquesta/<proyecto>`, `git add -- <rutas del plan>` y `git commit -m "chore(orquesta): plan"`. Si el plan ya estaba commiteado, no hay commit de plan. En un repo recién creado por `/objetivo`, `orquesta/<proyecto>` sale de su commit de nacimiento en `main` (Fase 4). El árbol principal queda en `orquesta/<proyecto>` durante toda la ejecución: es donde mergeas.
3. **Oleada 0.** La haces tú o un solo agente, en la integración; commitea solo sus rutas (`git add -- <rutas>`, nunca `git add -A`) con `chore(orquesta): base oleada 0`.

### El bucle

Repite mientras quede algo que no esté `aprobada` y mergeado, o `bloqueada`:

1. **Arranca lo que esté listo**, hasta llenar los huecos de constructores. Una feature está lista si está `pendiente`, todo aquello de lo que depende está mergeado en la integración y sus rutas exclusivas no las está escribiendo otra feature viva. Por cada una:
   - `git worktree add -b orquesta/<feature> .claude/worktrees/<feature> orquesta/<proyecto>`: sale de la punta actual de la integración, que ya tiene lo mergeado hasta ahora.
   - Lanza al constructor con `run_in_background: true`, **sin `isolation`**, con la ruta de su worktree y el prompt de delegación del constructor.
   - `SPEC.md` y `REGISTRO.md` → `en curso`.
2. **Cuando un constructor entrega** (devuelve el sha de su commit):
   - Comprueba que el sha es el HEAD de su worktree (`git -C <worktree> rev-parse HEAD`) y que el árbol está limpio. Si no commiteó, o dejó cambios fuera del commit, devuélveselo: sin commit no hay revisión.
   - Estado → `en revisión`, con el sha en el registro de ejecución.
   - **Lanza `qa`** sobre ese commit, en segundo plano, con el prompt de delegación de `qa` (si ya hay 2 vivos, queda en cola y sale el primero que se libere).
   - **Y en el mismo mensaje, arranca la siguiente feature lista**: el hueco del constructor ya está libre.
3. **Cuando `qa` devuelve el veredicto**, lo escribes tú en el `SPEC.md` (línea `Veredicto QA` y la ronda en «Revisión QA») y en el `REGISTRO.md`:
   - **`CAMBIOS PEDIDOS`** → estado `cambios pedidos`. Vuelve a lanzar al mismo constructor, en el mismo worktree, con los hallazgos P1 y P2 tal cual y el sha juzgado. Su nueva entrega pasa otra vez por el paso 2. Es la vuelta 1; si hay una tercera, la feature pasa a `bloqueada` y se lleva a la persona, sin reintentar en bucle.
   - **`APROBADA`** → estado `aprobada`. Si `qa` avisa de datos sensibles, lanza `ciberseguridad` sobre esa feature antes del merge. Después, la puerta y el merge (paso 4).
4. **Puerta y merge.** Commitea primero en la integración el `SPEC.md` y el `REGISTRO.md` actualizados (`chore(orquesta): F-NN aprobada <sha7>`), para que el árbol principal esté limpio. Después:

   ```sh
   node .claude/skills/orquesta/scripts/puerta.mjs --spec features/F-NN-<slug>/SPEC.md --rama .claude/worktrees/<feature>
   git merge --no-ff <sha> -m "chore(orquesta): merge F-NN <slug> (qa <sha7>)"
   ```

   La puerta se lanza desde la integración: la rama actual tiene que ser `orquesta/*` (desde una protegida no pasa; desde otra es error de uso). Comprueba estado `aprobada`, veredicto `APROBADA` con un sha que coincide con el HEAD del worktree, que el diff frente a la integración no está vacío y solo toca las rutas «Escribe en (exclusivo)» del `SPEC.md`, que el worktree está limpio y que el resultado del merge (`git merge-tree --write-tree <base> <head>`) deja en esas rutas lo mismo que el HEAD aprobado; con un git anterior a 2.38, esto último lo avisa y no bloquea. Exit 0: mergea el sha que imprime, con la orden que imprime (ese asunto es el que reconoce `/semaforo ritmo` como merge de unidad). Exit 1: no mergees; lee los motivos (si el diff se salió de sus rutas o el sha no coincide, la feature vuelve a `en revisión` con el constructor; si no puede leer las rutas «Escribe en (exclusivo)», porque falta la tabla o trae el marcador `[rutas]`, escríbelas en el `SPEC.md`: sin alcance declarado no pasa). Exit 2: error de uso, corrígelo.

   Si el merge da conflictos: `git merge --abort`, la feature vuelve al constructor para que actualice su worktree desde la integración (`git -C <worktree> rebase orquesta/<proyecto>`), resuelva y entregue un commit nuevo, que pasa otra vez por `qa`.

   Tras un merge limpio, compila y pasa los tests en la integración. Si fallan, `git revert -m 1 <merge>` (nunca `reset`), y la feature vuelve al constructor con el error. **Tras un revert, la rama vieja no sirve:** su commit ya es ancestro de la integración y, si el constructor solo añade el arreglo encima, el merge siguiente traería el arreglo sin lo revertido. Retira el worktree (`git worktree remove`) y recrea la rama de la feature desde la punta de la integración (`git worktree add -b orquesta/<feature>-2 .claude/worktrees/<feature> orquesta/<proyecto>`); el constructor reaplica allí el trabajo (`git revert <sha del revert>`), arregla y entrega un commit nuevo, que vuelve a `qa`. La puerta lo comprueba: si el resultado del merge no contiene lo aprobado en las rutas de la feature, no pasa.
5. **Retira el worktree mergeado:** `git worktree remove .claude/worktrees/<feature>` y `git branch -d orquesta/<feature>` (sin `--force`: si git se niega, algo quedó sin integrar; pregunta).
6. **Actualiza los worktrees que dependan.** Si una feature viva lee lo que acabas de mergear, o va a necesitarlo antes de entregar, rebasa su worktree desde la integración: `git -C <worktree> rebase orquesta/<proyecto>`. **Nunca bajo un agente en marcha** (espera a que entregue o a que vuelva con cambios pedidos) y **nunca a una feature `en revisión` o `aprobada`**: cambiaría el sha que juzgó `qa`. Las que arrancan después ya salen de la punta nueva.

Si una notificación llega mientras atiendes otra, encólala: un paso del bucle cada vez, en orden. Cuando todas las features están mergeadas, sigue con el cierre.

### Cierre

1. **Puertas sobre la integración:** `tester` ∥ `ciberseguridad` (si aplica) y, después, **`revisor` sobre la integración entera** (`git diff <rama del usuario>...orquesta/<proyecto>`). Lo que pidan va como feature de arreglo, que pasa por el mismo flujo. **Las puertas finales tienen tope: como mucho 2 rondas.** Si a la segunda siguen pidiendo cambios, se para y decide la persona; cada veredicto lleva el commit que juzgó.
   - **De `ciberseguridad`**, según «Del hallazgo al arreglo» de `squad/_catalogo.md`: una feature por hallazgo de **criterio**, y una por grupo de hallazgos **mecánicos** que toquen los mismos ficheros. Los `id` (`SEC-NN`) van en `notas`, los `Ficheros` del hallazgo son sus `files` y su `Verificación`, su `acceptance`. El constructor es el del stack; en una feature solo de mecánicos lo lanzas en nivel ligero (`haiku` en Claude Code) con el hallazgo tal cual, sin el texto de lo auditado. La segunda ronda de la puerta es la **revisión parcial** de `ciberseguridad` sobre esos `id` y el HEAD de la integración, no la auditoría entera.
2. Lo que no estaba previsto, a «Lo que se aprendió» de su `SPEC.md` (o, con `feature_list.json`, al `REGISTRO.md`). **La fricción, a `/mejora`:** un contrato incompleto, un agente que no era el adecuado o al que le faltó contexto, dos unidades que chocaron en el mismo fichero, un `qa` que pidió cambios dos veces sobre lo mismo o un criterio que quedó no comprobable por cómo estaba escrito. Propón en una línea abrir una issue (en el repo del proyecto si solo le afecta a él, en el del kit si es del método o de una pieza que viene de AI_SDD) con la prueba de lo que acaba de pasar, junto con las que quedaron apuntadas de la ronda de preguntas. Solo con el OK de la persona, y sin parar la ejecución por ello.
3. **La persona entra aquí:** le enseñas `/orquesta estado` y le propones llevar `orquesta/<proyecto>` a su rama (merge o squash, lo decide ella) y abrir la PR con `/pr`. Si la integración salió de `main` (el repo recién creado por `/objetivo`), la rama de la PR es `feat/<proyecto>`, creada desde `orquesta/<proyecto>`. Cuando lo acepta, las features pasan a `hecha`. Si el cambio va a rama protegida o toca producción, `/juicio` cabe entre el ✅ de `revisor` y la PR.

## Fase 5 bis — Ejecutar por oleadas (`/orquesta ejecutar --oleadas`)

Para cada oleada, en orden:

1. Lee `REGISTRO.md`, los `SPEC.md` de la oleada y, si existe, el último bloque de `.claude/state/handoff.md`.
2. **Fija la base**, con los dos aislamientos. La primera vez, crea `orquesta/<proyecto>` y commitea el plan como en la preparación del modo flujo. En cada oleada, la base que tiene que ver (la oleada 0 y las ya integradas) está commiteada (cada feature entra con su commit, paso 4): stagea solo las rutas del plan que hayas actualizado (`git add -- <rutas>`, nunca `git add -A`) y `git commit -m "chore(orquesta): base oleada <N>"`. Si `git status` enseña cambios fuera de esas rutas (y de `.claude/state/`), no los metas: pregunta. Apunta el hash: es `<base>`, y anótalo en `REGISTRO.md`.
3. **Lanza a todos los agentes de la oleada en un solo mensaje**, con varias llamadas a `Agent`, cada una con el prompt de delegación del constructor. Si el plan pide aislamiento, **comprueba antes de lanzar** que `.claude/settings.json` tiene `"worktree": {"baseRef": "head"}`:
   - **Si lo tiene**, pasa `isolation: "worktree"`: los worktrees salen de `<base>`.
   - **Si falta**, no pases `isolation`. Créalos tú, uno por agente y cada uno en su rama, con `git worktree add -b orquesta/<feature> .claude/worktrees/<feature> <base>`, y lanza a cada agente sin `isolation`, con la ruta de su worktree en el prompt. O cae a ficheros asignados en el mismo árbol.
   - **Con ficheros asignados**, los agentes no instalan dependencias ni lanzan build o tests que escriban salidas compartidas (`dist/`, `coverage/`, el lockfile): dos a la vez se pisan. Lo lanzas tú en el paso 6, salvo que el plan haya asignado esas salidas a un agente.

   Después, verifica que cada worktree arrancó en `<base>`: `git -C <worktree> merge-base HEAD <base>` tiene que devolver `<base>`. Si no, repite esa feature en un worktree creado a mano desde `<base>`. Si el worktree equivocado tiene cambios sin integrar, pregunta antes de retirarlo.
4. **Cada feature se entrega con un commit y pasa por `qa`**, como en el modo flujo (pasos 2 y 3): el veredicto lleva siempre el sha de ese commit. Con worktrees, el commit lo hace el constructor en su rama; si no commiteó o dejó cambios fuera del commit, se le devuelve: sin commit no hay revisión. Con ficheros asignados, cuando el agente termina, el commit lo haces tú en la integración, uno por feature y solo con sus rutas exclusivas (`git add -- <rutas>`, `git commit -m "feat(F-NN): <slug>"`), y `qa` lo verifica en un worktree desprendido de ese sha (`git worktree add --detach .claude/worktrees/qa-F-NN <sha>`), no en el árbol compartido, donde siguen escribiendo los demás.
5. **Puerta e integración.** Nada se integra sin pasar la puerta. Con worktrees, la puerta y `git merge --no-ff <sha>` como en el modo flujo (paso 4), y el worktree se retira como en su paso 5. Con ficheros asignados el commit ya está en la integración: la puerta se pasa sobre el worktree de `qa`, con la base en el padre del commit (`node .claude/skills/orquesta/scripts/puerta.mjs --spec <SPEC.md> --rama .claude/worktrees/qa-F-NN --base <sha>^`); si no pasa, `git revert <sha>` (nunca `reset`) y la feature vuelve al constructor. Después, `git worktree remove .claude/worktrees/qa-F-NN`.
6. **Verifica tú.** Instala dependencias si la oleada las cambió, compila, pasa los tests y comprueba con `git diff --stat <base>` que nadie ha escrito fuera de sus ficheros.
7. Marca el estado en `REGISTRO.md` y en cada `SPEC.md`, apunta las decisiones nuevas y añade una línea al registro de ejecución. Commitea esos cambios de estado: con lo integrado, son la base de la siguiente oleada.
8. Si una feature falla, pide una corrección al mismo agente con el error concreto. Máximo 2 vueltas; a la tercera, para y pregunta.

Al terminar, el mismo cierre que el modo flujo.

**Si la ejecución se para a medias** (fallo repetido, decisión del usuario, fin de sesión), en cualquiera de los dos modos, deja en `.claude/state/handoff.md` qué features están en cada estado (con su sha y su vuelta de `qa`), qué falta, qué bloquea, la rama de integración, su último commit y los worktrees que siguen vivos con su rama: es lo que lee quien la retome, sea Claude Code u otra herramienta.

**Al retomar** en una sesión nueva (`/retoma`, o `/orquesta ejecutar` tras un corte), ningún agente de la sesión vieja sigue vivo, pero sus worktrees sí. Antes de arrancar nada nuevo, recorre las features con worktree vivo en `.claude/worktrees/<feature>`:

- **`en curso` o `cambios pedidos`**: relanza al mismo rol de constructor **en ese worktree**, sin `git worktree add`, con el prompt de delegación y una línea más: «Retomas trabajo a medias: lee primero `.claude/state/handoff.md` y la foto más reciente de `.claude/state/retoma/` de tu worktree, y `git status` y `git log` en él; no rehagas lo que ya está commiteado». Cuenta como la misma vuelta, no como una nueva.
- **`en revisión`**: relanza `qa` sobre el sha anotado, si sigue siendo el HEAD del worktree. Si no lo es, el constructor commiteó después de entregar: vuelve a `en curso`.
- **`aprobada` sin mergear**: la puerta y el merge del paso 4.
- **Una feature `en curso` sin worktree** (se retiró a mano) vuelve a `pendiente` y arranca como cualquier otra.

Después sigue el bucle de siempre. `/semaforo` y la puerta no cambian: una unidad retomada se entrega con su commit y pasa por `qa` y por la puerta igual que las demás.

## Prompt de delegación del constructor

```
Proyecto: <nombre> · Feature: features/F-NN-<slug>/SPEC.md (léelo entero) · Oleada <N> · Vuelta <0|1|2>
Trabajas en: <ruta del worktree>, rama orquesta/<feature>. Solo ahí.
Contrato que respetas sin cambiarlo: <rutas>
Escribes solo en: <rutas>. Si necesitas tocar algo fuera, no lo toques: dilo en tu respuesta.
No tocas el SPEC.md ni el REGISTRO.md: estado, veredicto y notas los escribe el supervisor.
A la vez que tú trabajan: <agente → sus rutas>. No las toques.
Tamaño: ~<N> líneas de diff previstas, tope ~300. Si ves que te pasas, para y dilo en vez de seguir.
Lee si te hace falta: <knowledge del agente, decisiones D-NN del REGISTRO>
[Si es una vuelta de cambios pedidos: hallazgos de qa sobre <sha7>, tal cual: <P1/P2 con su evidencia>]
Tests: escribe tú, en esta feature y dentro de tus rutas, los tests que cubren su criterio de aceptación (cada Cn que se pueda automatizar). qa busca el test de cada criterio; tester entra después, con la cobertura y el contrato de arquitectura.
Hecho cuando se cumpla el criterio de aceptación del SPEC y sus tests pasen. Ejecuta la verificación que puedas (build, tests) en tu worktree.
Entrega con UN commit en tu rama (convencional, en español, sin firma de IA) y el árbol limpio.
Devuelve: el sha completo del commit, ficheros creados o modificados, líneas de diff, verificación ejecutada y su resultado, decisiones que tomaste y lo que queda pendiente o bloqueado.
```

Con ficheros asignados (modo por oleadas sin worktrees), sustituye las líneas del worktree y del commit por: «Trabajas en el árbol compartido: no instalas dependencias ni lanzas nada que escriba dist/, coverage/ o el lockfile, a menos que esas rutas sean tuyas; no commiteas: al terminar, el supervisor hace un commit solo con tus rutas, y es ese commit el que revisa qa. Devuelve lo mismo, sin el sha».

## Prompt de delegación de `qa`

```
Unidad: features/F-NN-<slug>/SPEC.md (léelo entero; su criterio de aceptación son tus objetivos)
Commit: <sha7> · Worktree: <ruta> (trabaja ahí; git rev-parse --short=7 HEAD tiene que dar <sha7>, o el HEAD completo empezar por él)
Base para el diff: <base> (git diff <base>...<sha7>)
Rutas exclusivas de la unidad: <rutas>
Afirmaciones a comprobar: <numeradas, si la unidad tiene PR o el constructor las declaró | ninguna>
Comandos de verificación del proyecto: <build, test, lint de AGENTS.md>
Ronda: <1|2|3> [hallazgos de la ronda anterior, para comprobar que están resueltos]
Solo lectura: no editas, no commiteas, no instalas, no cambias de rama. Lo que escribiría en el repo, no lo lanzas: queda no comprobable.
Devuelve tu formato fijo: cabecera con la unidad y el commit, tabla criterio | resultado (pasada/fallada/no comprobable) | cómo se comprobó, hallazgos con P1/P2/P3 y evidencia, avisos (a ciberseguridad si toca datos sensibles) y la última línea exactamente VEREDICTO: APROBADA o VEREDICTO: CAMBIOS PEDIDOS.
```

La base depende del aislamiento. Con un worktree por feature (el modo flujo, o por oleadas con worktrees), `orquesta/<proyecto>`. Con ficheros asignados, el commit de la feature ya está en la integración y `orquesta/<proyecto>...<sha7>` sale vacío: la base es su padre, `<sha7>^`, la misma que usa la puerta en ese modo.

## `/orquesta estado`

Una tabla, leída de `REGISTRO.md` y de las cabeceras de cada `SPEC.md` (si no coinciden, manda el `SPEC.md` y lo dices):

| Feature | Oleada | Estado | Veredicto | Vuelta | Agente vivo |
|---|---|---|---|---|---|
| F-03 alta | 1 | `aprobada` | APROBADA · `a1b2c3d` · mergeada en `e4f5a6b` | 1 | — |
| F-04 listado | 1 | `en revisión` | — (qa sobre `9f8e7d6`) | 0 | qa |

Debajo: la rama de integración y su último commit, los worktrees vivos, lo `bloqueado` y por qué, y si algún `aprobada` tiene un HEAD distinto del sha de su veredicto (entonces está, de hecho, `en revisión`). No toca nada.

## Reglas

- No preguntes dos veces: lo que necesites, en la Fase 2. Si te invoca `/objetivo`, ni eso: las preguntas y la aprobación ya vienen hechas.
- No planifiques con agentes que no existen ni con features que no salen del brief o del objetivo.
- Ninguna feature de más de ~300 líneas de diff previstas: se parte en la Fase 3.
- Un veredicto de `qa` vale para un commit. Nada se mergea si el HEAD no es el sha aprobado: lo decide la puerta, no tu memoria.
- **La excepción de merge.** Con el plan aprobado, mergeas a la rama de integración `orquesta/<proyecto>` (`git merge --no-ff`) las features que `qa` aprobó y pasan la puerta, y commiteas en ella el plan, las bases y los cambios de estado; y cada constructor commitea su entrega en su rama `orquesta/<feature>`. Nada más: **nunca a una rama protegida, nunca push, nunca `--force`, nunca `reset --hard` en la integración**. Fuera de eso, ni commit, ni push, ni PR sin un OK explícito del usuario en ese momento; llevar la integración a su rama también se pregunta y la PR se abre con `/pr` (autoría solo del desarrollador). El merge a la rama protegida nunca es tuyo.
- Máximo 2 vueltas de `cambios pedidos` por feature; a la tercera, `bloqueada` y a la persona. No reintentes en bucle.
- Delegar cuesta, porque cada subagente vuelve a leer su contexto desde cero. Si una feature es pequeña y no hay paralelo que ganar, hazla tú, anótalo en su `SPEC.md` y pásala igualmente por `qa`.
- La conversación con el usuario no se delega nunca.
