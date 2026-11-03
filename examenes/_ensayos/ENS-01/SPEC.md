# ENS-01 · Galería con personajes (Intents y carrusel) — ensayo del flujo /examen

Estado: `en curso`
Veredicto QA: —
Objetivo: O-01 · Feature F-07

## Agentes y ficheros

| Agente | Escribe en (exclusivo) |
|---|---|
| constructor-android | `examenes/_ensayos/ENS-01/solucion/`, `examenes/_ensayos/ENS-01/LEEME.md` |

## Requisitos (del enunciado, numerados)

- R1 · `MainActivity` con `ivPersonaje`, `btnAnterior`, `btnSiguiente`: carrusel de 4 imágenes que da la vuelta por los dos extremos.
- R2 · `etNombre` («Tu nombre») y `btnFicha` («Ver ficha») abren `FichaActivity`; nombre vacío → no se abre y `Toast` «Escribe tu nombre».
- R3 · `FichaActivity` recibe nombre y número de personaje por `Intent` y los muestra en `tvNombre` («Hola, <nombre>») y `tvPersonaje` («Personaje N»).
- R4 · `btnContacto` en `FichaActivity` abre `ContactoActivity`, que tiene flecha atrás en la barra y vuelve a `FichaActivity` (`parentActivityName`).
- R5 · `etTelefono` y `btnLlamar` abren el marcador (`ACTION_DIAL`) con el número; vacío → no hace nada.
- R6 · `btnWeb` abre `http://google.es` en el navegador (`ACTION_VIEW`).
- R7 · Solo lo visto en clase (nada de «No entra»).

## Decisiones de las rondas (simuladas)

- D1 · Imágenes `R.drawable.personaje_1` a `personaje_4` (la persona las añade). Número de personaje mostrado = índice + 1.
- D2 · La flecha atrás exige barra de título: tema con barra como en el ejemplo de intents (`knowledge/patrones/ejemplos/intents/`).
- D3 · Paquete `com.example.examen`; textos directos en los layouts.
- D4 · Sin más adornos.

## Criterio de aceptación

Ver `feature_list.json`, feature 7: compila en el esqueleto `base` y `SPEC.md` termina con la tabla requisito → fichero:línea → ✅ (la rellena el constructor al entregar, debajo).

## Tabla de requisitos (la rellena el constructor)

| Requisito | Fichero:línea | ✅/❌ |
|---|---|---|
| R1 | `solucion/app/src/main/java/com/example/examen/MainActivity.java:51-71,89-91` (ids en `res/layout/activity_main.xml:11,23,29`) | ✅ |
| R2 | `MainActivity.java:73-87` (`etNombre` y `btnFicha` en `activity_main.xml:36,43`) | ✅ |
| R3 | `FichaActivity.java:35-40` (`tvNombre`, `tvPersonaje` en `activity_ficha.xml:10,16`) | ✅ |
| R4 | `FichaActivity.java:42-46`; `AndroidManifest.xml:28-31`; flecha en `ContactoActivity.java:31-34`; tema con barra en `values/themes.xml:3` | ✅ |
| R5 | `ContactoActivity.java:40-50` (`etTelefono`, `btnLlamar` en `activity_contacto.xml:10,17`) | ✅ |
| R6 | `ContactoActivity.java:52-56` (`btnWeb` en `activity_contacto.xml:23`) | ✅ |
| R7 | Solo Intent explícito/implícito, Toast, ArrayList y listeners como en los ejemplos de clase; sin nada de «No entra» | ✅ |
