# Examen de ejemplo · Android (2º DAM)

Hecho solo con lo del temario: Intents, RecyclerView, Realm y AlertDialog. 3 ejercicios, 10 puntos, unas 2 horas.

## EJ-01 · Galería de mascotas (2 pts)

Crea una pantalla `MainActivity` con:
- Un `ImageView` (`ivMascota`) centrado, con 4 imágenes en `drawable`.
- Dos `ImageButton`: `btnAnterior` (izquierda) y `btnSiguiente` (derecha).
- Un `TextView` (`tvNombre`) debajo con el nombre de la mascota que se ve.

**Requisitos**
1. Al pulsar «siguiente» se ve la mascota siguiente y su nombre. Al pasar de la última vuelve a la primera.
2. Con «anterior» pasa lo mismo al revés: de la primera salta a la última.
3. Usa un método `updateImage()`.

## EJ-02 · Contacto rápido (3 pts)

`MainActivity` tiene un `EditText` (`etTelefono`, de tipo teléfono), un `EditText` (`etWeb`) y tres botones: **Llamar**, **Abrir web** y **Enviar datos**.

**Requisitos**
1. **Llamar** abre el marcador con el número escrito (`ACTION_DIAL`).
2. **Abrir web** abre el navegador con la dirección de `etWeb`.
3. Si el campo correspondiente está vacío, muestra un `Toast` «Rellena el campo» y no lanza el intent.
4. **Enviar datos** abre una segunda Activity, `DetalleActivity`, y le pasa teléfono y web con `putExtra`.
5. `DetalleActivity` muestra los dos datos en `TextView`. Si algún dato llega `null`, pone «Sin datos».
6. `DetalleActivity` tiene flecha de volver atrás (`parentActivityName` en el Manifest).
7. Las dos Activities están registradas en el Manifest.

## EJ-03 · Agenda de tareas con Realm (5 pts)

App de tareas con base de datos. Cada tarea tiene `id` (autoincremental), `titulo` (obligatorio) y `hecha` (booleano).

**Pantalla principal** (`TareasActivity`)
- Un `RecyclerView` (`rvTareas`) en lista vertical.
- Un botón **Añadir** (`btnAnadir`).
- Cada ítem muestra el título y un texto «Hecha» o «Pendiente».

**Requisitos**
1. Gradle y Manifest configurados para Realm 10.15.1, con una clase `MyApplication`.
2. Modelo `Tarea` y estructura en paquetes: `activities`, `model`, `app`, `adapters`.
3. **Añadir** abre un `AlertDialog` con un `EditText` y los botones «Guardar» y «Cancelar». Si el título está vacío, `Toast` «El título no puede estar vacío» y no se guarda.
4. Un clic corto en un ítem alterna su estado entre hecha y pendiente.
5. Un clic largo en un ítem pide confirmación con un `AlertDialog` («¿Borrar tarea?») y la borra si se acepta.
6. La lista se actualiza sola al cambiar los datos (`addChangeListener`).
7. Se hace `realm.close()` en `onDestroy`.
8. Si no hay tareas, la lista se ve vacía sin que falle nada.

## Criterios de corrección

| Apartado | Puntos |
|---|---|
| Requisitos funcionales de cada ejercicio | 7 |
| Ids, nombres y textos exactos del enunciado | 1 |
| Manifest y Gradle correctos | 1 |
| Código limpio, comentado y sin fallos con campos vacíos o `null` | 1 |
