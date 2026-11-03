# Registro de features — Examen DAM 2º · Android

> Índice de las unidades de **construcción del propio repo** (recetas y ensayos). Los ejercicios de examen no van aquí: viven en `examenes/<examen>/EJ-NN/`. Con un plan en `feature_list.json` (raíz), el estado y el contrato de cada feature viven allí y se mueven solo con `node .claude/skills/orquesta/scripts/features.mjs`; este registro lleva el porqué: objetivos, decisiones y la crónica de la ejecución.
>
> **Cómo se lee:** `Estado` es uno de `pendiente` · `en curso` · `en revisión` (entregada, esperando a `qa`) · `cambios pedidos` · `aprobada` (por `qa`) · `hecha` (aceptada por la persona) · `bloqueada`. `Veredicto` es el sha7 del commit que juzgó `qa`.

## Objetivos

| Id | Objetivo | Fecha | De dónde sale | Estado |
|---|---|---|---|---|
| O-01 | Poder resolver cualquier ejercicio del temario (carrusel, Intents, RecyclerView en lista y cuadrícula con clic, Realm con RecyclerView y AlertDialog, menús) con un código de ejemplo de cada tipo **que compila**, una matriz que dice qué cubre cada receta y tres ensayos de punta a punta. Done: las 9 features aprobadas por `qa` y mergeadas; `knowledge/cobertura.md` sin huecos salvo los declarados | 2026-11-03 | `/objetivo` de la persona: «desplegar la arquitectura para poder hacer todos los ejercicios del examen que pasemos al repo» | aprobadas las 9 features; pendiente de aceptación de la persona |

## Plan de ejecución

- Origen: [`BRIEF.md`](../BRIEF.md) · plazo: sin plazo · fecha objetivo: —
- Aprobado por: SOFT7, 2026-11-03, opción «Aprobar y ejecutar» (vía `/objetivo`, modo adoptar)
- Opción: ejecutar ya
- Modo: oleadas (`/orquesta ejecutar --oleadas`)
- Aislamiento: mismo árbol con ficheros asignados en exclusiva
- Rama de integración / última base: `orquesta/examen-dam` · base `main` @ cc844ea (commit inicial del repo, hecho con esta aprobación)
- Ejecutar: `/orquesta ejecutar --oleadas`
- La aprobación cubre: la rama local `orquesta/examen-dam`, sus commits y el merge de cada feature que `qa` apruebe y pase la puerta. Nunca una rama protegida, nunca push. Llevar la integración a `main` y abrir PR es de la persona (`/pr`).

### Decisiones de la ronda de preguntas

| Id | Pregunta | Respuesta | Afecta a |
|---|---|---|---|
| D-01 | Memoria persistente | **Ninguna**: «es solo para un oneshot». Se aparta de la compuerta Tier 1/Tier 2 del kit; sin `memory/`, sin `policies/memory.md`, sin hooks de memoria | Adopción (oleada 0) |
| D-02 | Unidad de trabajo | **Ejercicio** (`examenes/<examen>/EJ-NN/`) | `AGENTS.md`, `/examen` |
| D-03 | Varios ejercicios de un examen | **Uno detrás de otro**, cada uno con sus rondas, sin worktrees | `/examen` |
| D-04 | Squad | `constructor-android`, `revisor-android` (ejercicios de examen) y `qa` del kit (unidades de construcción del repo); sin seguridad, nube ni despliegue | Adopción |
| D-05 | El plan de 5 unidades pasa a 9 | La unidad «ensayo» se parte en tres (una por tipo) y se añaden ejemplos compilables por tema (intents, recyclerview, realm, carrusel), para que ninguna pase de ~300 líneas. Mismo objetivo, mismos ficheros previstos | `feature_list.json` |
| D-06 | Cómo se verifica | Cada ejemplo lleva un `verify` que ejecuta `tools/compilar.sh`; el constructor no tiene Bash, así que compila el supervisor al integrar y `qa` lo repite sobre el commit | todas |

**Por confirmar:** —

### Contrato compartido (oleada 0)

- `tools/compilar.sh <base|realm> <carpeta-solucion> [paquete]`: compila en una copia temporal fuera del repo y sale con 0 solo con `BUILD SUCCESSFUL`. Probado: compila una solución mínima y falla con 1 con código roto.
- Rutas acordadas: `knowledge/patrones/*.md` (recetas por tema), `knowledge/patrones/ejemplos/<tema>/solucion/` (ejemplo con rutas de proyecto Android) y `knowledge/patrones/ejemplos/<tema>/README.md` (qué demuestra). Ensayos en `examenes/_ensayos/ENS-NN/{enunciado.md,SPEC.md,solucion/,LEEME.md}`.
- De solo lectura desde la oleada 1: `knowledge/temario.md` (salvo F-01), `knowledge/ui-xml.md`, `plantilla/`.

## Features

| Id | Feature | Oleada | Agente principal | Escribe en (exclusivo) | Tamaño | Estado | Veredicto |
|---|---|---|---|---|---|---|---|
| 1 | cobertura | 1 | constructor-android | `knowledge/cobertura.md`, `knowledge/patrones.md`, `knowledge/patrones/{basico,intents,recyclerview,realm,dialogos}.md`, `knowledge/temario.md` | ~250 | aprobada | 35344be |
| 2 | ejemplo_intents | 2 | constructor-android | `knowledge/patrones/ejemplos/intents/**` | ~250 | aprobada | f6341a5 |
| 3 | ejemplo_recyclerview | 2 | constructor-android | `knowledge/patrones/ejemplos/recyclerview/**` | ~300 | aprobada | 38e8b63 |
| 4 | ejemplo_realm | 2 | constructor-android | `knowledge/patrones/ejemplos/realm/**` | ~300 | aprobada | a7d1e0c |
| 5 | ejemplo_carrusel | 2 | constructor-android | `knowledge/patrones/ejemplos/carrusel/**` | ~120 | aprobada | 4feff8a |
| 6 | menus | 3 | constructor-android | `knowledge/patrones/menus.md`, `knowledge/patrones/ejemplos/menus/**` | ~200 | aprobada | 3cf1105 |
| 7 | ensayo_intents_carrusel | 3 | constructor-android | `examenes/_ensayos/ENS-01/**` | ~250 | aprobada | 0bee56d |
| 8 | ensayo_recyclerview | 3 | constructor-android | `examenes/_ensayos/ENS-02/**` | ~300 | aprobada | 5b16a27 |
| 9 | ensayo_realm | 3 | constructor-android | `examenes/_ensayos/ENS-03/**` | ~300 | aprobada | eda432c |

## Registro de ejecución

<!-- Una línea por hecho: fecha · feature u oleada · qué pasó (entrega <sha7>, veredicto, merge <sha7>, bloqueo) · incidencias -->
- 2026-11-03 · oleada 0 · commit inicial en `main` (cc844ea) y adopción del kit en `orquesta/examen-dam` (5d25a3d): AGENTS/CLAUDE/GEMINI, hooks, githooks, squad, skills, rules, `tools/compilar.sh`. Verificación de arquitectura: JSON válidos, hooks cableados existen, `comprobar.mjs` 3/3, tests de `/orquesta` y `/nuevo-agente` 51/51.
- 2026-11-03 · F-01 · entrega 35344be, qa APROBADA (ronda 1, 18/18 bloques de código intactos), puerta ok; el commit ya estaba en la integración (modo oleadas)
- 2026-11-03 · oleada 2 · F-02 f6341a5, F-03 38e8b63, F-04 a7d1e0c, F-05 4feff8a: qa APROBADA en ronda 1, puerta ok.
- 2026-11-03 · oleada 3 · F-06 3cf1105, F-07 0bee56d, F-09 eda432c: qa APROBADA en ronda 1, puerta ok. F-08 5a919d1: CAMBIOS PEDIDOS (P2, una referencia de línea inexistente en la tabla del SPEC); corregida en 5b16a27, qa APROBADA en ronda 2.
- 2026-11-03 · incidencias: (1) los agentes del repo (constructor-android, revisor-android) no están registrados en la sesión abierta desde AI_SDD; se lanzaron con `general-purpose` adoptando el rol leyendo su fichero, como prevé AGENTS.md. (2) `tools/compilar.sh` ejecutaba `gradlew --stop` al terminar y mataba las compilaciones paralelas de otros agentes (dos intentos fallaron con «daemon stopped»); corregido en 7904196. (3) Dos constructores usaron Bash fuera de la excepción pactada (un `ls` y un script de Python para editar el SPEC); sin efecto sobre ficheros ajenos (comprobado con el diff).
- 2026-11-03 · puertas finales · revisor-android probado de verdad sobre ENS-01 (APROBADO, compila): halló un P3 (inputType="textPersonName" no está en el temario), corregido a "text" y recompilado (BUILD SUCCESSFUL); sin nueva ronda de qa por ser una palabra. Sus notas sobre su propio prompt (sha revisado, imágenes provisionales, atributos no verificados = P3, no usar gradlew --stop) se aplicaron a .claude/agents/revisor-android.md.
- 2026-11-03 · puertas finales: `revisor` sobre la integración, ronda 1 ❌ (8 P2: referencias rotas a ficheros del kit que no vienen, roles ausentes del squad, hechos duplicados, Stack de qa sin rellenar), corregidos en 70f3529; ronda 2 ❌ (2 P2 menores: un enlace a _orchestrator y 'revisor' en la plantilla de features), corregidos en d930826 sin tercera ronda (tope de 2 de la skill): comprobados con grep por el supervisor.
