# Squad — catálogo de agentes

> Roster del repo y regla de activación. Los agentes viven en [`.claude/agents/`](../.claude/agents/). Las **skills** (procedimientos) viven en [`.claude/skills/`](../.claude/skills/): `examen`, `exportar`, `objetivo`, `orquesta`, `nuevo-agente`.

## Roster

| Agente | Modelo | Tools | Naturaleza | Activa en |
|---|---|---|---|---|
| constructor-android | Sonnet | Read, Grep, Glob, Write, Edit | Escribe y retoca el Java y el XML de un ejercicio solo con lo del temario y las recetas; marca «no verificado» lo que no puede confirmar | Cada ejercicio de examen y cada receta nueva |
| revisor-android | Sonnet | Read, Grep, Glob, Bash | Compila con Gradle, cruza ids, Manifest, Gradle y temario, y comprueba el enunciado requisito por requisito. No edita código | Cada ejercicio de examen |
| qa | Sonnet | Read, Grep, Glob, Bash | Veredicto `APROBADA` / `CAMBIOS PEDIDOS` de las unidades de construcción del propio repo contra su criterio de aceptación. Solo lectura | Unidades de `/orquesta` (recetas, ensayos) |

Los tres llevan la forma de la plantilla de `/nuevo-agente` y la comprueba `node .claude/skills/nuevo-agente/scripts/comprobar.mjs`. Sonnet en los tres: construir y verificar ejecutando es trabajo de nivel medio; no hay roles de seguridad, nube ni despliegue a propósito.

## Regla de activación

| Tarea | Squad |
|---|---|
| Ejercicio de examen (cualquiera) | constructor-android → revisor-android |
| Retoque de un ejercicio ya entregado | constructor-android → revisor-android |
| Construir o ampliar el propio repo (receta, ensayo) | constructor-android → qa |

El supervisor (la sesión principal) hace las rondas de preguntas, reparte, devuelve los fallos y entrega; ningún agente habla con la persona.

## Modelo y herramientas en otros runtimes

`model` lleva el alias de Claude Code. En otra herramienta, quien lanza el rol traduce por nivel: **medio** = `sonnet` ≈ Gemini Flash o Pro ≈ el modelo de código de GPT con esfuerzo medio. Un rol sin `Write` ni `Edit` se lanza sin herramientas de escritura; si el runtime no deja quitarlas, se comprueba al terminar que `git status --porcelain` no ha cambiado.
