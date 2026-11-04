# Examen DAM 2º — Android

Toolkit de agentes para resolver los ejercicios de un examen de Android (Java + XML) usando solo lo dado en clase. Pegas el enunciado, contestas una o dos rondas de preguntas sencillas y recibes cada ejercicio completo, compilado con Gradle y listo para pegar en Android Studio.

## Cómo se usa

1. Abre esta carpeta en Claude Code.
2. Pega el enunciado (o déjalo en `entrada/`) y escribe `/examen`.
3. Contesta las preguntas: solo lo que notarías al ejecutar (textos, colores, qué pasa con un campo vacío).
4. Recibes `examenes/<examen>/EJ-NN/` con el código en `solucion/` y un `LEEME.md` con el orden para pegarlo.
5. ¿Algo no te gusta? Dilo tal cual lo ves («el botón más grande y azul») y se retoca.
6. ¿Quieres probarlo? `/exportar` te saca el ejercicio como proyecto de Android Studio completo en una carpeta fuera del repo (solo si compila): File → Open, espera al Gradle sync y Run.

## Ejemplo

`entrada/examen-ejemplo.md` es un examen de prueba con tres ejercicios (carrusel, Intents y Realm con RecyclerView) y `examenes/ejemplo/` trae su resolución, con `SPEC.md` y `LEEME.md` en cada uno. Sirve para ver el flujo completo sin enunciado propio.

## Qué hay

- `knowledge/`: el temario (qué entra y qué no), los ejercicios de clase (`knowledge/clase/`), las recetas de código de clase, el traductor de «lo quiero así» a XML y cómo se compila.
- `plantilla/`: esqueletos de Gradle (`base` y `realm`) que compilan.
- `.claude/agents/`: `constructor-android` (escribe) y `revisor-android` (compila y comprueba); `qa` para construir el propio repo.

Para quien trabaje con agentes: `AGENTS.md`. Una vez por clon: `git config core.hooksPath .githooks` y `node .claude/hooks/enlazar-skills.cjs`. Tus ajustes personales van en `CLAUDE.local.md` y `.claude/settings.local.json`, que no se versionan.

## Skills

- `/examen`: resuelve un examen (rondas de preguntas, constructor, revisor, entrega y retoques).
- `/exportar`: saca un ejercicio como proyecto abrible en Android Studio.
- `/objetivo`, `/orquesta` y `/nuevo-agente`: para ampliar el propio repo.

## Requisitos

Android Studio con SDK 36 y 37, y los JDK que pide cada esqueleto (detalle en `knowledge/compilar.md`).
