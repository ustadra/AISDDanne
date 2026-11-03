# Registro de features — [NOMBRE DEL PROYECTO]

> Índice de las unidades de trabajo: una fila por feature. Lo rellena `/orquesta` a partir del `BRIEF.md` y lo actualiza el supervisor en cada cambio de estado. Patrón de carpeta: `features/F-NN-<slug>/` con su `SPEC.md`; plantilla en [`_PLANTILLA/`](_PLANTILLA/).
>
> **Cómo se lee:** `Estado` es uno de `pendiente` · `en curso` · `en revisión` (entregada, esperando a `qa`) · `cambios pedidos` · `aprobada` (por `qa`) · `hecha` (aceptada por la persona) · `bloqueada`. `Veredicto` es el sha7 del commit que juzgó `qa` (— si aún no hay); el detalle, en la sección «Revisión QA» de su `SPEC.md`. Una feature tocada después de `aprobada` vuelve a `en revisión`.

## Objetivos

<!-- Los anota /objetivo: un O-NN por objetivo. Cada SPEC que sale de uno lo cita en su cabecera («Objetivo: O-NN»). -->

| Id | Objetivo | Fecha | De dónde sale | Estado |
|---|---|---|---|---|

## Plan de ejecución

- Origen: [`BRIEF.md`](../BRIEF.md) · plazo: [N] días laborables · fecha objetivo: [YYYY-MM-DD]
- Aprobado por: [nombre, fecha]
- Opción: [ejecutar ya | ejecutar más tarde]
- Modo: [flujo (por defecto) | oleadas]
- Aislamiento: [worktree por feature | mismo árbol con ficheros asignados]
- Rama de integración / última base: [orquesta/<proyecto> · <hash>]
- Ejecutar: `/orquesta ejecutar` (flujo) · `/orquesta ejecutar --oleadas`

### Decisiones de la ronda de preguntas

| Id | Pregunta | Respuesta | Afecta a |
|---|---|---|---|

**Por confirmar:** [— | pregunta → feature que bloquea]

### Contrato compartido (oleada 0)

[DTOs, endpoints, tipos, esquema o estructura de carpetas que varias features leen, con su ruta. A partir de la oleada 1 es de solo lectura.]

## Features

| Id | Feature | Oleada | Agente principal | Escribe en (exclusivo) | Tamaño | Estado | Veredicto |
|---|---|---|---|---|---|---|---|

## Registro de ejecución

<!-- Una línea por hecho: fecha · feature u oleada · qué pasó (entrega <sha7>, veredicto, merge <sha7>, bloqueo) · incidencias -->
