# ENS-03 · Mis tareas (Realm) — ensayo del flujo /examen

Estado: `en curso`
Veredicto QA: —
Objetivo: O-01 · Feature F-09

## Agentes y ficheros

| Agente | Escribe en (exclusivo) |
|---|---|
| constructor-android | `examenes/_ensayos/ENS-03/solucion/`, `examenes/_ensayos/ENS-03/LEEME.md` |

## Requisitos (del enunciado, numerados)

- R1 · `Tarea` en `model` con `id` (PrimaryKey, autoincremental), `titulo`, `hecha`, `creadaEn`; paquetes `activities`, `model`, `app`, `adapters`.
- R2 · `recyclerTareas` con adaptador propio y `ViewHolder`; fila con «[ ]»/«[x]» y título.
- R3 · `btnNueva` abre `AlertDialog` con `etTitulo`, «Guardar» y «Cancelar»; título vacío → no se guarda y `Toast`.
- R4 · Pulsar una tarea alterna `hecha`.
- R5 · Botón «Borrar» por fila elimina esa tarea.
- R6 · `btnBorrarTodas` elimina todas.
- R7 · `tvContador` muestra «Tareas: N» y se actualiza con un listener de Realm.
- R8 · Realm se cierra al destruir la pantalla.
- R9 · Solo lo visto en clase (nada de «No entra»).

## Decisiones de las rondas (simuladas)

- D1 · Paquete base `com.example.examen`; textos directos en los layouts.
- D2 · Sin imágenes ni adornos; fondo por defecto del tema.
- D3 · Todo el trabajo con Realm en transacciones.

## Criterio de aceptación

Ver `feature_list.json`, feature 9: compila en el esqueleto `realm` y `SPEC.md` termina con la tabla requisito → fichero:línea → ✅ (la rellena el constructor al entregar).

## Tabla de requisitos (la rellena el constructor)

| Requisito | Fichero:línea | ✅/❌ |
|---|---|---|
| R1 | `solucion/app/src/main/java/com/example/examen/model/Tarea.java:8-13` (paquetes `activities`, `model`, `app`, `adapters` en `.../examen/`) | ✅ |
| R2 | `.../adapters/TareaAdapter.java:17,44,55-56`; `.../activities/MainActivity.java:43,58-60`; `res/layout/activity_main.xml` (`recyclerTareas`) | ✅ |
| R3 | `.../activities/MainActivity.java:71-73,86-106` (`etTitulo` en `res/layout/dialog_tarea.xml`); vacío + Toast en 97-99 | ✅ |
| R4 | `.../activities/MainActivity.java:122-130` (`setHecha(!isHecha())` en 128), llamado desde 48-50 | ✅ |
| R5 | `.../adapters/TareaAdapter.java:63`; `.../activities/MainActivity.java:132-139` | ✅ |
| R6 | `.../activities/MainActivity.java:78-82,141-148` (`deleteAllFromRealm` en 146); `btnBorrarTodas` en `activity_main.xml` | ✅ |
| R7 | `.../activities/MainActivity.java:62-69` (`addChangeListener`, texto en 62 y 67); `tvContador` en `activity_main.xml` | ✅ |
| R8 | `.../activities/MainActivity.java:151-155` (`realm.close()` en 154) | ✅ |
| R9 | Solo Realm, RecyclerView, AlertDialog, Toast y Activity (nada de «No entra»); `sh tools/compilar.sh realm` dio `BUILD SUCCESSFUL` | ✅ |
