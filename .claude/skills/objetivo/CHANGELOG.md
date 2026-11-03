# CHANGELOG — objetivo

## 1.1.0 — 2026-10-23

- Pregunta obligatoria sobre **Tier de Memoria persistente** en la ronda de preguntas (`AskUserQuestion`) para modos nuevo y adoptar: elección explícita entre **Tier 1 (Git-Native Markdown)** y **Tier 2 (Sidecar Dockerizado con Knowledge Graph SQLite + Jevify local RGPD)**.
- El Paso 1 incluye la memoria persistente como obligatorio del brief según la compuerta actualizada de `/brief` y `templates/BRIEF.md.tmpl`.
- El Paso 3 (Aprobación) refleja en la pantalla de plan el Tier de memoria seleccionado.

## 1.0.1 — 2026-10-22

Description en una sola línea y de 500 caracteres como mucho: Codex no carga una skill que pase de ahí ni una de varias líneas, y en Gemini CLI y Antigravity compite con las demás por el contexto. Se queda el qué, el cuándo y los disparadores; el cómo sigue en el cuerpo.

## 1.0.0 — 2026-10-16

Skill nueva, portada de fct-project-builder (rama `feat/objetivo-flujo`, su `/objetivo` 1.0.0). Hasta ahora,
pasar de un objetivo a software pedía encadenar a mano `/brief`, `/arranca` y `/orquesta`, cada una con sus
preguntas y su aprobación. `/objetivo` es la entrada única, al ritmo del método de agent-squad (MIT,
`0e82cfc`): leer primero, una ronda de preguntas, una aprobación en una pantalla y ejecución de corrido hasta
que cada unidad pasa su puerta.

- **Tres modos que se detectan solos.** El prioritario, un objetivo nuevo en un repo salido de `/arranca`: se
  anota como `O-NN` en la sección «Objetivos» del registro de unidades, sin tocar el `BRIEF.md`, y `/orquesta`
  lo parte en unidades nuevas. Desde AI_SDD, además, **nuevo** (repo en una carpeta nueva con `/arranca`,
  copiando del kit solo lo que el plan conserva, `git init -b main`, sin poda, sin historial ni `origin`
  heredados; un único commit de nacimiento en `main` con el esqueleto y el brief, del que sale
  `orquesta/<proyecto>` por el caso «repo recién creado» de la Fase 4 de `/orquesta`) y **adoptar** (brief
  ligero + `/arranca <ruta>` brownfield).
- **Primer publicado: la excepción de nacimiento** de `AGENTS.md`. La persona crea el repo remoto vacío y
  hace `git push -u origin main` desde un checkout de `main` (el `pre-push` ejecuta `.githooks/checks` sobre
  el commit que tiene checked-out); el `pre-push` solo deja **crear** `main` o `master` en un remoto sin
  ninguna rama, nunca actualizarla ni borrarla. La excepción cubre también el commit de nacimiento en `main`,
  que hace `/objetivo` con la aprobación. La integración sube por PR desde `feat/<proyecto>`, creada desde
  `orquesta/<proyecto>`, con `/pr`. Sin renombrados de ramas en GitHub.
- **Una ronda de preguntas** que junta los huecos del brief (con los mismos obligatorios que la compuerta de
  `/brief` y `templates/BRIEF.md.tmpl`, la unidad de trabajo incluida) y lo que `/orquesta` pregunta en su Fase
  2, sin repetir lo que el objetivo, el brief o el repo ya contestan. La respuesta al aislamiento decide el
  modo: worktree por agente, flujo; ficheros asignados, `/orquesta ejecutar --oleadas`.
- **Una aprobación** que vale por las de `/arranca` (su plan mode) y `/orquesta`: brief u objetivo y su
  encaje, plan de `/arranca`, unidades y oleadas con su tamaño (unas 300 líneas como máximo), el modo que sale
  del aislamiento y la excepción de merge a la rama de integración `orquesta/<proyecto>` de las unidades que aprueba `qa`.
- **Lo aprendido** sale de las issues abiertas de mejora del repo y, en un proyecto, de las del kit.
- Viaja con `/orquesta` a los repos que se construyen por unidades con el squad; allí solo existe el modo
  proyecto, porque `/arranca` poda `/brief` y `/arranca`.
