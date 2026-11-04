# EJ-03 · Agenda de tareas con Realm

## Qué hace

`TareasActivity` (pantalla de inicio) muestra un botón «Añadir» y una lista vertical (`rvTareas`) de tareas guardadas con Realm. Cada ítem enseña el título y «Hecha» o «Pendiente».

- **Añadir**: diálogo con un campo de texto y «Guardar» / «Cancelar». Si el título está vacío (tras `trim`), sale el Toast «El título no puede estar vacío» y no se guarda.
- **Clic corto** en un ítem: alterna Hecha / Pendiente.
- **Clic largo** en un ítem: diálogo «¿Borrar tarea?»; si se acepta, se borra.
- La lista se refresca sola (`addChangeListener`). Sin tareas, la lista se ve vacía.
- `realm.close()` en `onDestroy`.

Aviso: el **clic largo no está en el temario** (en clase solo hay clic corto). Se hizo con `setOnLongClickListener` sobre `itemView`, igual que el clic corto, con la interfaz del adaptador por constructor. La persona lo confirmó.

## Orden para pegar los ficheros

Partiendo del esqueleto `plantilla/realm` (JDK 21) en Android Studio, paquete `com.example.examen`:

1. `gradle/libs.versions.toml` (sustituir) y `app/build.gradle.kts` (sustituir). Ver «Cambios de Gradle».
2. `app/src/main/java/com/example/examen/model/Tarea.java`
3. `app/src/main/java/com/example/examen/app/MyApplication.java`
4. `app/src/main/res/layout/tarea_item.xml`, `dialog_tarea.xml` y `activity_tareas.xml`
5. `app/src/main/java/com/example/examen/adapters/TareaAdapter.java`
6. `app/src/main/java/com/example/examen/activities/TareasActivity.java`
7. `app/src/main/AndroidManifest.xml` (sustituir). Borra el `MainActivity.java` y el `activity_main.xml` de la plantilla si existen.
8. Sync de Gradle y ejecutar.

## Cambios de Gradle (respecto a `plantilla/realm`)

Realm 10.15.1 (classpath en el `build.gradle.kts` raíz y plugin `realm-android`) ya viene en la plantilla. Solo falta RecyclerView:

1. En `gradle/libs.versions.toml`, en `[versions]`: `recyclerview = "1.4.0"`.
2. En `[libraries]`: `recyclerview = { group = "androidx.recyclerview", name = "recyclerview", version.ref = "recyclerview" }`.
3. En `app/build.gradle.kts`, dentro de `dependencies`: `implementation(libs.recyclerview)`.
4. Sync Now.

## Manifest

`<application android:name=".app.MyApplication" ...>` y `TareasActivity` (`.activities.TareasActivity`) con el intent-filter MAIN / LAUNCHER.

## Imágenes necesarias

Ninguna.

## Cómo probarlo

1. Abrir la app: lista vacía, sin fallos.
2. «Añadir» con el campo vacío o solo espacios → Toast «El título no puede estar vacío», no se añade.
3. «Añadir» con «Comprar pan» → aparece con «Pendiente».
4. Tocar el ítem → pasa a «Hecha»; tocar otra vez → «Pendiente».
5. Mantener pulsado el ítem → «¿Borrar tarea?»: «Cancelar» la deja; «Borrar» la elimina.
6. Cerrar la app y abrirla: las tareas siguen ahí.
