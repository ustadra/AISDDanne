# Ensayo 3 · «Mis tareas» (Realm) — enunciado inventado

Crea una aplicación Android que guarde tareas con **Realm**.

1. Clase `Tarea` (paquete `model`) con `id` (clave primaria, autoincremental), `titulo`, `hecha` (boolean) y `creadaEn` (fecha). Organiza el proyecto en los paquetes `activities`, `model`, `app` y `adapters`.
2. `MainActivity` muestra las tareas en un `RecyclerView` (id `recyclerTareas`), con un adaptador propio y `ViewHolder`. Cada fila enseña el título y, delante, «[ ]» si no está hecha o «[x]» si lo está.
3. Un botón «Nueva tarea» (id `btnNueva`) abre un `AlertDialog` con un `EditText` (id `etTitulo`) y los botones «Guardar» y «Cancelar». Si el título está vacío no se guarda y se avisa con un `Toast`.
4. Al pulsar una tarea cambia su estado de hecha a no hecha y al revés.
5. Cada fila lleva un botón «Borrar» que elimina esa tarea.
6. Un botón «Borrar todas» (id `btnBorrarTodas`) elimina todas las tareas.
7. Un `TextView` (id `tvContador`) muestra «Tareas: N» y se actualiza solo cuando cambian los datos (listener de Realm).
8. Cierra Realm cuando la pantalla se destruye.

Usa solo lo visto en clase.
