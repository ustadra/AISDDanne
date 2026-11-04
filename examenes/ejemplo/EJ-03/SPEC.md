# EJ-03 · Agenda de tareas con Realm (examen ejemplo)

Estado: `aprobada`
Veredicto QA: APROBADA · commit árbol de trabajo (base dcdd026) · 2026-11-04

## Agentes y ficheros

| Agente | Escribe en (exclusivo) |
|---|---|
| constructor-android | `examenes/ejemplo/EJ-03/solucion/`, `examenes/ejemplo/EJ-03/LEEME.md` |

## Enunciado

App de tareas con base de datos. Cada tarea tiene `id` (autoincremental), `titulo` (obligatorio) y `hecha` (booleano). Pantalla principal `TareasActivity`: `RecyclerView` `rvTareas` en lista vertical, botón `btnAnadir` («Añadir»); cada ítem muestra el título y «Hecha» o «Pendiente».

## Requisitos (numerados)

- R1 · Gradle y Manifest configurados para Realm 10.15.1, con una clase `MyApplication`.
- R2 · Modelo `Tarea` y paquetes `activities`, `model`, `app`, `adapters`.
- R3 · **Añadir** abre un `AlertDialog` con un `EditText` y botones «Guardar» y «Cancelar»; título vacío → `Toast` «El título no puede estar vacío» y no se guarda.
- R4 · Clic corto en un ítem alterna hecha/pendiente.
- R5 · Clic largo en un ítem pide confirmación con `AlertDialog` («¿Borrar tarea?») y la borra si se acepta.
- R6 · La lista se actualiza sola (`addChangeListener`).
- R7 · `realm.close()` en `onDestroy`.
- R8 · Sin tareas, la lista se ve vacía sin fallar.

## Decisiones de las rondas

- D1 · Clic largo (no dado en clase): `setOnLongClickListener` en `itemView`, análogo al clic corto con la interfaz del adaptador; la Activity decide. La persona lo confirmó («usa click largo igualmente»). Declarar en el LEEME que el clic largo no sale del temario.
- D2 · Esqueleto `plantilla/realm` (JDK 21), paquete `com.example.examen` con subpaquetes `activities`, `model`, `app`, `adapters`.
- D3 · Ids de layout: `rvTareas`, `btnAnadir`; ítem: `tvTitulo`, `tvEstado`; diálogo: `etTitulo`. Sin datos de ejemplo precargados.
- D4 · `MyApplication` mantiene `.allowWritesOnUiThread(true)` (ver errata del temario); `Tarea.id` con `@PrimaryKey`, `titulo` con `@Required`; id autoincremental con `where(Tarea.class).max("id")` comprobando `null` (o `AtomicInteger` como en clase).
- D5 · Receta: `knowledge/patrones/realm.md`, `recyclerview.md`, `dialogos.md` y ejemplos en `knowledge/patrones/ejemplos/realm/`.

## Tabla de requisitos (la rellena el constructor)

| Requisito | Fichero:línea | ✅/❌ |
|---|---|---|
| R1 | solucion/app/src/main/AndroidManifest.xml:6 (`MyApplication`), :16 (TareasActivity), :22 (LAUNCHER); solucion/app/build.gradle.kts:3 (plugin realm-android; classpath 10.15.1 ya en la plantilla) y :40 (recyclerview); solucion/gradle/libs.versions.toml:10,20 | ✅ |
| R2 | solucion/app/src/main/java/com/example/examen/model/Tarea.java:7-27 (campos :8-12); paquetes `activities`, `model`, `app`, `adapters` | ✅ |
| R3 | solucion/.../activities/TareasActivity.java:73-96 (diálogo, Toast en :85, `anadirTarea` en :98); res/layout/dialog_tarea.xml | ✅ |
| R4 | solucion/.../activities/TareasActivity.java:111-118 (`alternarHecha`); adapters/TareaAdapter.java:56-61 | ✅ |
| R5 | solucion/.../activities/TareasActivity.java:120-143 (`confirmarBorrado`, `borrarTarea`); adapters/TareaAdapter.java:63-70 | ✅ |
| R6 | solucion/.../activities/TareasActivity.java:58-63 | ✅ |
| R7 | solucion/.../activities/TareasActivity.java:145-149 | ✅ |
| R8 | solucion/.../adapters/TareaAdapter.java:39-41 (`getItemCount`); TareasActivity.java:38 (`findAll` sin precarga) | ✅ |
