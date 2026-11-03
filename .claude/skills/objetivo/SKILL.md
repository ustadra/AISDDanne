---
name: objetivo
description: "Entrada única para pasar de un objetivo a software con una ronda de preguntas y una aprobación. En un repo salido de /arranca lo anota en features/REGISTRO.md como O-NN y lo lleva con /orquesta a unidades nuevas. Desde AI_SDD, además, crea un repo nuevo en su carpeta o adopta uno con código (/objetivo <ruta>). Detecta el modo solo y encadena brief, arranque y orquestación. Úsala ante «quiero conseguir X», «arranca esto», «nuevo objetivo» o un .md con una idea."
argument-hint: "<texto del objetivo | ruta a un .md de idea | ruta a un repo existente>"
version: 1.1.0
---

# /objetivo — de un objetivo al software, con una ronda y una aprobación

Tu trabajo es llevar un objetivo hasta el software construido con **una sola ronda de preguntas y una sola aprobación**. No sustituye a `/brief`, `/arranca` ni `/orquesta`: las encadena como fases y les pasa lo ya decidido, para que ninguna vuelva a preguntar ni a pedir aprobación por su cuenta. **Lo conduces tú, el supervisor**: la conversación con la persona no se delega y un subagente no lanza a otros (`policies/arquitectura.md §2`).

El ritmo es el del método de agent-squad: leer primero, preguntar una vez, enseñar el plan entero en una pantalla, aprobar una vez y ejecutar de corrido hasta que cada unidad pasa su puerta.

## Modos

Se detectan solos, en este orden. Si la detección es dudosa, la duda va en la ronda de preguntas, no en una pregunta aparte.

| Modo | Cuándo | Qué hace |
|---|---|---|
| **Objetivo en un proyecto** (el prioritario) | El directorio actual, o la ruta que se pasa, es un repo salido de `/arranca`: tiene `AGENTS.md` y además el registro de unidades (`features/REGISTRO.md`, o el que declare su `AGENTS.md`) o `.claude/kit-version.json`, y no es el kit (no tiene `templates/AGENTS.md.tmpl` ni `.claude/skills/arranca/`). | Anota el objetivo como `O-NN` en el registro y lo parte en unidades nuevas con `/orquesta`. El `BRIEF.md` no se toca: es del usuario. |
| **Nuevo** | Estás en AI_SDD y el argumento es un texto o un `.md` de idea, no un repo. | Brief → repo en una carpeta nueva con `/arranca` → unidades → ejecución. |
| **Adoptar** | Estás en AI_SDD y el argumento es la ruta a un repo con código propio que no salió de `/arranca`. | Brief ligero → `/arranca <ruta>` brownfield → unidades → ejecución. |

**En un repo generado solo existe el primer modo.** `/brief` y `/arranca` son del kit y `/arranca` los poda al generar, así que allí «nuevo» y «adoptar» no se ofrecen: si la persona quiere un proyecto aparte, se lanza `/objetivo` desde AI_SDD. Dilo así cuando lo pida.

## Paso 1 — Leer, sin preguntar

Antes de la primera pregunta, lee todo lo que ya contesta algo:

- **El objetivo:** el texto del argumento o el `.md` que señala. Un brief ya escrito por quien lo pide cuenta como `.md` de idea.
- **En un proyecto:** `BRIEF.md`, `AGENTS.md` (con su unidad de trabajo), `CLAUDE.md` (aparte: con `Read`, su `@AGENTS.md` no se expande), el registro de unidades con sus objetivos, decisiones `D-NN` y unidades, las especificaciones en curso, `.claude/agents/` (el squad que existe de verdad) y el código. Si hay `graphify-out/`, las preguntas de arquitectura van a `graphify-consultor`.
- **En adoptar:** el repo destino (stack, carpetas, tests, CI, gestor de hooks de git, instrucciones de agente que ya tenga), como en los pasos 1 y 2 del brownfield de `/arranca`.
- **En nuevo y adoptar**, del kit: `templates/BRIEF.md.tmpl`, `squad/_catalogo.md` (roster y regla de activación), `policies/arquitectura.md` y, si el objetivo trae knowledge del dominio, `policies/knowledge.md`. Van sin enlace porque la skill viaja a repos donde esos ficheros no existen.
- **Lo aprendido:** las issues abiertas de mejora del repo (`gh issue list --label mejora`) y, en un proyecto, las del kit (el repo de `.claude/kit-version.json`) que afecten a cómo se planifica.

Mapea lo leído a los obligatorios del brief, los mismos que marca `templates/BRIEF.md.tmpl` y que exige la compuerta de completitud de `/brief`: **problema real, objetivo, tipo de entregable, usuarios y quién valida, unidad de trabajo (su nombre y un ejemplo de id), memoria persistente (Tier 1 o Tier 2) y Definición de Done**. El tamaño y el plazo no bloquean, pero el plan los usa: si salen, se anotan; si no, el plazo queda «sin plazo». Si el objetivo ya los trae todos, no hay entrevista: solo quedan las preguntas de plan. En el modo proyecto, el brief ya cubre problema, tipo y usuarios; del objetivo nuevo hacen falta su resultado esperado, quién lo valida, su plazo y su Done.

## Paso 2 — Una ronda de preguntas

Como mucho **dos llamadas seguidas a `AskUserQuestion`, de cuatro preguntas cada una**, y solo de lo que cambia el plan. Junta en esa ronda:

1. **Los huecos del brief** que no salieron del paso 1, la unidad de trabajo incluida si no salió (es obligatoria en la compuerta de `/brief`), con el orden y el criterio de `/brief` (primero el problema, la solución al final; si responden con una solución, reconduce al problema). Propón valores por defecto con lo que ya leíste y pide confirmación en bloque.
2. **Lo que `/orquesta` pregunta en su Fase 2**, eligiendo las que apliquen: datos (de dónde salen, entorno de pruebas; una base de datos pasa antes por `/blindar-mcp-sql`), contrato, autenticación, UI, despliegue, datos sensibles, qué se enseña primero y aislamiento. **La respuesta al aislamiento decide el modo:** worktree por agente → modo flujo (`/orquesta ejecutar`); ficheros asignados en el mismo árbol → modo por oleadas (`/orquesta ejecutar --oleadas`). Dilo así en la pregunta.
3. **En nuevo y adoptar:** el nombre del proyecto y la carpeta de destino, si no salen del objetivo (por defecto, junto al clon del kit: `../<nombre>`). La forma del knowledge del dominio, si lo hay (doctrina o KB). **Y el Tier de memoria persistente (`AskUserQuestion` obligatoria):** Tier 1: Git-Native Markdown (por defecto, ligero en `memory/`, cero dependencias) o Tier 2: Sidecar Dockerizado (Knowledge Graph SQLite + FTS5 + Jevify local RGPD con volcado determinista en `knowledge/graph.jsonl`). Criterio en `policies/memory.md`. Nunca se asume sin preguntar.

Nada se pregunta dos veces: lo que el objetivo, el brief o el repo ya responden se da por respondido y se enseña en la aprobación. Lo que quede sin responder se marca `[por confirmar]` junto a lo que bloquea, sin inventarlo.

## Paso 3 — Una aprobación, en una pantalla

Antes de escribir nada del proyecto, enseña el plan entero en una sola pantalla:

- **El brief resumido** (en nuevo y adoptar) o, en un proyecto, **el objetivo `O-NN` y su encaje** con el `BRIEF.md`: qué parte del alcance amplía, qué roza del *fuera de alcance*, qué features existentes toca.
- **El plan de `/arranca`** (en nuevo y adoptar), lo de su Fase 2: squad con el porqué de cada agente (campo del brief que lo justifica), skills, unidad de trabajo, knowledge, tier de memoria persistente elegido, el árbol de la arquitectura por defecto y el reparto `AGENTS.md` / `CLAUDE.md`, destino y, en adoptar, qué se inyecta y qué se fusiona. Si hace falta un rol que no existe, va como **agente a crear**: no se improvisa.
- **Las unidades y sus oleadas**, con quién hace qué, qué ficheros escribe cada uno en exclusiva y su tamaño. Ninguna unidad pasa de unas **300 líneas** de cambio: si una no cabe, se parte.
- **El modo de ejecución, según el aislamiento elegido:** con worktree por agente, `/orquesta ejecutar` en modo flujo (el registro lo anota como «Modo: flujo»): cada unidad entra en revisión de `qa` al entregarse, sin esperar a que cierre su oleada. Con ficheros asignados, `/orquesta ejecutar --oleadas` («Modo: oleadas»): el supervisor hace un commit por unidad con solo sus rutas en la integración y `qa` lo revisa ahí. En los dos hay commits locales en la integración.
- **La excepción de merge, dicha tal cual:** el supervisor mergea a la rama de integración `orquesta/<proyecto>` las unidades que aprueba el agente `qa` y pasan la puerta. Nunca a una rama protegida y nunca push. Llevar esa rama a la de la persona, o a `main`, es suyo. En nuevo, además, el commit de nacimiento del repo en `main` (esqueleto y brief) y el primer publicado, que hace la persona.
- **Lo `[por confirmar]`** y qué bloquea.

Pide la aprobación con **una** `AskUserQuestion`:

- **Aprobar y ejecutar** (recomendada si nada `[por confirmar]` bloquea la oleada 0): sigues con el paso 4 sin otro prompt.
- **Aprobar y ejecutar más tarde:** se escribe todo lo del paso 4 menos la ejecución; se retoma con `/orquesta ejecutar`.
- **Cambiar algo:** ajustas y vuelves a pedir la aprobación una vez.

Esta aprobación vale por las de las fases internas: la del plan de `/arranca` (Fase 2, que aquí no pasa por plan mode: el plan es esta pantalla) y la de `/orquesta` (Fase 4). Anota en el «Plan de ejecución» del registro quién aprobó, cuándo, con qué opción y con qué aislamiento.

## Paso 4 — Ejecutar en orden

### Objetivo en un proyecto

1. **Anota el objetivo** en el registro de unidades (`features/REGISTRO.md` por defecto), sección `## Objetivos` (créala encima de «Plan de ejecución» si no existe), una fila por objetivo:

   | Id | Objetivo | Fecha | De dónde sale | Estado |
   |---|---|---|---|---|
   | O-NN | texto del objetivo, con su Done | YYYY-MM-DD (del sistema) | prompt de la persona, `.md` que trajo, issue de mejora `#NN`… | en curso |

   El `BRIEF.md` no se edita: si el objetivo choca con él (contradice el problema, o entra en su *fuera de alcance*), se dice en la aprobación y decide la persona.
2. **Especificaciones y registro** con las Fases 3 y 4 de `/orquesta`, sin repetir sus preguntas ni su aprobación: cada especificación nueva cita el `O-NN` del que sale, las decisiones de la ronda van como `D-NN` y la numeración de unidades sigue la que haya.
3. **`/orquesta ejecutar`** en el modo aprobado: flujo con worktrees, `--oleadas` con ficheros asignados.

### Nuevo (desde AI_SDD)

El repo nace en una **carpeta nueva**, no en una copia de AI_SDD: no hay nada que podar, ni historial ni `origin` del kit que heredar. El greenfield sobre una copia que describe `/arranca` sigue disponible, pero ya no es el camino por defecto.

1. **Destino.** Por defecto `../<nombre>` junto al clon del kit. Si existe y no está vacío, para y pregunta: no se mezcla con lo que ya hay.
2. **`BRIEF.md`** en la raíz del destino, desde la plantilla, con la Decisión *Listo para `/arranca`* si están los obligatorios. La prosa, por `humanizer`.
3. **`/arranca` sobre el destino**, Fases 3 y 4, con el plan ya aprobado: en vez de copiar el kit entero y podar, se copia del kit **solo lo que el plan conserva** (agentes activados, skills, hooks y su `settings.json`, rules, knowledge, `.githooks/`, `.gitattributes`, las plantillas de la unidad) y se escribe el resto (el par `AGENTS.md` + `CLAUDE.md`, `.mcp.json`, `.gitignore`, `README.md`, `## Stack del proyecto` de cada agente, el sello `.claude/kit-version.json`). Sin poda: no hay andamiaje del kit que quitar.
4. **Git, en el destino:** `git init -b main` y `git config core.hooksPath .githooks`. Sin `origin`: lo pone la persona en el primer publicado (abajo). El sello `.claude/kit-version.json` apunta al kit y así se queda.
5. **Verifica** con la lista del paso 4 de la Fase 4 de `/arranca`. No sigas con un fallo.
6. **Commit de nacimiento en `main`**, con esta aprobación: `git add -A` y `git commit -m "chore: esqueleto del proyecto"` (el `.gitignore` que escribe `/arranca`, con el bloque de `templates/gitignore.tmpl`, ya deja fuera lo personal y `.claude/state/`). Es el único commit que entra en `main` desde la terminal: el repo no tenía historia, y sin él no habría base para la integración ni destino para la PR. Lo siguiente llega a `main` por PR.
7. **Especificaciones y registro** con las Fases 3 y 4 de `/orquesta`, en el destino.
8. **`/orquesta ejecutar`** en el modo aprobado (flujo o `--oleadas`), con el destino como directorio de trabajo, por el caso «repo recién creado por `/objetivo`» de su Fase 4: `orquesta/<proyecto>` sale del commit de nacimiento y su primer commit es el plan. Las comprobaciones de esa Fase 4 que la aprobación no cubre se hacen igual.

#### Primer publicado (lo hace la persona)

Es la segunda mitad de la **excepción de nacimiento** de `AGENTS.md` (la primera es el commit de nacimiento del paso 6): el primer push de `main` a un remoto que aún no tiene ninguna rama. El `pre-push` solo deja **crear** `main` o `master` en un remoto sin ramas, nunca actualizarla ni borrarla, y el agente no puede hacer ese push (`block-protected-merges` se lo impide): lo hace la persona.

1. Crea el repo remoto **vacío**, sin README, licencia ni `.gitignore`: desde la web o con `gh repo create <dueño>/<nombre> --private` (sin `--source` ni `--push`).
2. `git remote add origin <url>` y, desde un checkout de `main` con el árbol limpio (`git switch main`), `git push -u origin main`: sube el commit de nacimiento. El `pre-push` lo deja pasar porque el remoto no tiene ninguna rama y lo dice, pero antes ejecuta `.githooks/checks` sobre ese commit, y por eso tiene que ser el que tienes checked-out: desde `orquesta/<proyecto>` lo rechaza. Si un check falla sobre el esqueleto, arréglalo antes de publicar.
3. La integración sube por PR: `git switch -c feat/<proyecto> orquesta/<proyecto>` y `/pr`, que la abre de `feat/<proyecto>` a `main`.

Si el repo remoto ya trae commits (lo creó una plantilla de la organización, o con README), ya tiene ramas: el push se rechaza y su historia no comparte raíz con la local. Pide uno vacío.

### Adoptar (desde AI_SDD, `/objetivo <ruta>`)

1. **Brief ligero** en la raíz del repo: objetivo, stack detectado y confirmado, quién valida y Done. Si ya había un `BRIEF.md`, no se pisa: se completan sus huecos.
2. **`/arranca <ruta>`** brownfield, con el plan ya aprobado: inyección no destructiva de lo que falte, el par `AGENTS.md` + `CLAUDE.md` según lo que haya, `pre-push` sin pisar el gestor de hooks que haya, la plantilla de la unidad si no existe y el grafo inicial con `graphify-architect`. Lo que choque con lo que ya tiene el repo (un fichero que habría que sobrescribir, un `CLAUDE.md` que reparte distinto, un `settings.json` que fusionar con conflictos) se pregunta: no lo cubre la aprobación.
3. **Verifica** con la lista del paso 4 de la Fase 4 de `/arranca`.
4. **Especificaciones y registro** y **`/orquesta ejecutar`** en el modo aprobado (flujo o `--oleadas`), en el repo adoptado. Si su rama actual es protegida, la de integración sale de una rama de trabajo (`feature/<algo>`), como pide `/orquesta`.

Al terminar, reporta: qué se creó o se anotó, el squad, el resultado de la verificación, el estado de cada unidad y su veredicto de `qa` y lo que queda para la persona (en nuevo, el primer publicado; si no, llevar `orquesta/<proyecto>` a su rama; y abrir la PR con `/pr`).

## Reglas

- **La conversación no se delega.** Ni las preguntas ni la aprobación salen de un subagente.
- **No inventes agentes.** Solo se planifica con los que existen en `.claude/agents/` (o, en nuevo, con los del catálogo del kit); lo que falte se declara como agente a crear.
- **Nada del trabajo del proyecto antes de la aprobación:** ni código, ni `BRIEF.md`, ni arranque, ni `O-NN`. Hasta entonces solo se lee.
- **Commit, push y PR solo con un OK explícito** de la persona en ese momento, salvo los commits y merges locales de la rama de integración `orquesta/<proyecto>` que cubre la aprobación y, en nuevo, el commit de nacimiento en `main` de un repo sin historia. Fuera de ese commit, nada a una rama protegida; nunca push, nunca `--force`, nunca `--no-verify`.
- **Un objetivo que cambia a mitad vuelve al paso 2**: nueva ronda de preguntas y nueva aprobación, sin improvisar sobre lo ya puesto.
- Las fases internas (`/brief`, `/arranca`, `/orquesta`) **no repiten preguntas ni aprobaciones**: reciben lo decidido. Lo único que vuelve a la persona es lo que la aprobación no cubría (un conflicto al adoptar, un destino ocupado, un fallo repetido).

## Procedencia

Portada de fct-project-builder (rama `feat/objetivo-flujo`, su `/objetivo` 1.0.0), con los modos nuevo y adoptar llevados a cómo genera repos AI_SDD: `/arranca` con juicio y sin motor. El ritmo (una ronda, una aprobación, ejecución de corrido) es idea de gzurl/agent-squad (MIT, `0e82cfc`); procedencia en `knowledge/entrega/PROCEDENCIA.md`.
