# ENS-03 · Mis tareas (Realm)

La app guarda tareas en Realm y las lista en un `RecyclerView` con «[ ]» o «[x]» delante del título.
«Nueva tarea» abre un diálogo para escribir el título (vacío: no se guarda y sale un `Toast`).
Pulsar una fila alterna hecha/no hecha, «Borrar» quita esa tarea, «Borrar todas» las quita todas y `tvContador` muestra «Tareas: N» actualizado por un listener de Realm.

## Ficheros (paquete base `com.example.examen`)

Rutas relativas a `solucion/`:

| Fichero | Va en |
|---|---|
| `app/src/main/AndroidManifest.xml` | sustituye al del proyecto (lleva `android:name=".app.MyApplication"`) |
| `.../java/com/example/examen/model/Tarea.java` | paquete `model` |
| `.../java/com/example/examen/app/MyApplication.java` | paquete `app` |
| `.../java/com/example/examen/adapters/TareaAdapter.java` | paquete `adapters` |
| `.../java/com/example/examen/activities/MainActivity.java` | paquete `activities` |
| `app/src/main/res/layout/activity_main.xml`, `tarea_item.xml`, `dialog_tarea.xml` | `res/layout` |

## Orden para pegar

1. Haz primero los cambios de Gradle (abajo) y pulsa *Sync Now*.
2. Crea los paquetes `activities`, `model`, `app` y `adapters` dentro de `com.example.examen` (clic derecho, New, Package).
3. Si el proyecto trae una `MainActivity` en la raíz del paquete, bórrala o muévela a `activities` (Refactor, Move) y sustitúyela por la de la solución.
4. Pega `Tarea`, `MyApplication`, `TareaAdapter` y `MainActivity`, en ese orden.
5. Pega los tres layouts en `res/layout` (el de `activity_main.xml` sustituye al existente).
6. Sustituye el `AndroidManifest.xml` (o añade `android:name=".app.MyApplication"` en `<application>` y registra `.activities.MainActivity` con su `intent-filter` MAIN/LAUNCHER).

## Gradle, paso a paso (parte de un proyecto vacío)

1. **`build.gradle.kts` (raíz)**: añade arriba del todo, antes de `plugins`:
   ```kotlin
   buildscript {
       repositories { mavenCentral() }
       dependencies {
           classpath("com.android.tools.build:gradle:8.9.1")
           classpath("io.realm:realm-gradle-plugin:10.15.1")
       }
   }
   ```
   El bloque `plugins { alias(libs.plugins.android.application) apply false }` se queda.
2. **`app/build.gradle.kts`**: en `plugins { ... }` añade `id("realm-android")` detrás de `alias(libs.plugins.android.application)`.
3. En ese mismo fichero: `compileSdk = 36`, `targetSdk = 34`, `minSdk = 24`.
4. **`gradle.properties`**: comprueba que está `android.useAndroidX=true`.
5. **`gradle-wrapper.properties`**: `distributionUrl` a `gradle-8.12-bin.zip`.
6. **`gradle/libs.versions.toml`**: `agp = "8.9.1"`.
7. Sincroniza. Hace falta JDK 21 en Android Studio (Settings, Build Tools, Gradle, Gradle JDK).

El esqueleto `plantilla/realm` ya trae todo esto hecho.

## Imágenes necesarias

Ninguna.

## Cómo probarla

1. Ejecuta la app: debe verse «Tareas: 0» y la lista vacía.
2. «Nueva tarea», escribe «Comprar pan», Guardar: aparece «[ ] Comprar pan» y el contador pasa a «Tareas: 1».
3. «Nueva tarea» y Guardar sin escribir: sale el `Toast` y no se añade nada. «Cancelar» cierra sin guardar.
4. Pulsa la fila: pasa a «[x] Comprar pan»; vuelve a pulsar y regresa a «[ ]».
5. «Borrar» en una fila quita solo esa; «Borrar todas» vacía la lista y el contador vuelve a 0.
6. Cierra y reabre la app: las tareas siguen ahí.
