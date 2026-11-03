# ENS-02 · Mi Zoo (RecyclerView) — ensayo del flujo /examen

Estado: `en curso`
Veredicto QA: —
Objetivo: O-01 · Feature F-08

## Agentes y ficheros

| Agente | Escribe en (exclusivo) |
|---|---|
| constructor-android | `examenes/_ensayos/ENS-02/solucion/`, `examenes/_ensayos/ENS-02/LEEME.md` |

## Requisitos (del enunciado, numerados)

- R1 · `RecyclerView` `recyclerAnimales` con 5 animales (nombre e imagen), clase `MyAnimal` y adaptador propio con `ViewHolder`.
- R2 · Botón `btnCambiarVista` («Cambiar vista») alterna lista y cuadrícula de 2 columnas; al abrir, lista.
- R3 · Lista: imagen a la izquierda y nombre a la derecha. Cuadrícula: imagen arriba y nombre centrado debajo.
- R4 · Al pulsar un animal: `Toast` con su nombre y se abre `DetailActivity`.
- R5 · `DetailActivity` muestra el nombre (`tvNombre`) y la imagen (`ivFoto`).
- R6 · Botón «Volver» (`btnVolver`) cierra la pantalla.
- R7 · Sin nombre en el extra → «Sin nombre».
- R8 · Solo lo visto en clase (nada de «No entra»).

## Decisiones de las rondas (simuladas)

- D1 · Animales: León, Jirafa, Elefante, Cebra, Mono; imágenes `R.drawable.leon`, `jirafa`, `elefante`, `cebra`, `mono` (la persona las añade).
- D2 · Fondo de la pantalla principal `#e7ecef`; sin más adornos.
- D3 · Paquete `com.example.examen`.
- D4 · Textos directos en el layout (como en clase).

## Criterio de aceptación

Ver `feature_list.json`, feature 8: compila en el esqueleto `base` y `SPEC.md` termina con la tabla requisito → fichero:línea → ✅ (la rellena el constructor al entregar, debajo).

## Tabla de requisitos (la rellena el constructor)

| Requisito | Fichero:línea | ✅/❌ |
|---|---|---|
| R1 | `activity_main.xml:28` (recyclerAnimales), `MainActivity.java:42-48` (5 animales), `MyAnimal.java:3`, `ImageAdapter.java:14,55` (adaptador y ViewHolder) | ✅ |
| R2 | `activity_main.xml:9-13` (btnCambiarVista), `MainActivity.java:60,63-75` (arranca en lista, alterna) | ✅ |
| R3 | `animal_list.xml:2-21` (imagen izquierda, nombre derecha), `animal_grid.xml:2-20` (imagen arriba, nombre centrado), `ImageAdapter.java:40` | ✅ |
| R4 | `MainActivity.java:52-57` (Toast + Intent a DetailActivity), `AndroidManifest.xml:24-26` | ✅ |
| R5 | `activity_detail.xml:9-20` (ivFoto, tvNombre), `DetailActivity.java:37-47` | ✅ |
| R6 | `activity_detail.xml:22-27` (btnVolver), `DetailActivity.java:49-54` (`finish()`) | ✅ |
| R7 | `DetailActivity.java:39-43` (`Sin nombre` si `getStringExtra` es null) | ✅ |
| R8 | Solo LinearLayout, RecyclerView, Intent explícito, Toast, clases anónimas (todo en `temario.md`) | ✅ |
