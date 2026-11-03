# Ejemplo: menús (Option menu y Context menu)

Fecha: 2026-11-03. Compilado con tools/compilar.sh (esqueleto `base`, `BUILD SUCCESSFUL`). Que compile no prueba que haga lo que pide un enunciado.

## Qué demuestra

De `knowledge/patrones/menus.md`. Los dos temas aparecen en las diapositivas de clase solo con el título; la receta es la estándar mínima de Android, no algo dado en clase.

- Option menu: `res/menu/menu_main.xml` con 3 ítems; `onCreateOptionsMenu` (inflado y `true`) y `onOptionsItemSelected` con un `Toast` por ítem; «Salir» llama a `finish()`.
- Context menu: `registerForContextMenu(tvContexto)`, `res/menu/menu_context.xml` con 2 ítems, `onCreateContextMenu` (con `setHeaderTitle`) y `onContextItemSelected` con un `Toast` por ítem.

## APIs que usa

`getMenuInflater().inflate`, `Menu`, `MenuItem.getItemId`, `ContextMenu`, `ContextMenu.ContextMenuInfo`, `ContextMenu.setHeaderTitle`, `registerForContextMenu`, `Toast.makeText`, `finish`, `EdgeToEdge.enable` y el listener de insets (código base).

## Tema con barra de acción

Igual que en el ejemplo de intents: el esqueleto `base` trae `NoActionBar` y sin barra no se ve el menú de opciones. Esta solución trae `res/values/themes.xml` y `res/values-night/themes.xml` con los mismos nombres (`Base.Theme.Examen`, `Theme.Examen`) y padre `Theme.Material3.DayNight`, que sustituyen a los del esqueleto.

## Orden para pegar

1. `AndroidManifest.xml` y los dos `themes.xml` (sustituyen a los del esqueleto).
2. `res/layout/activity_main.xml`.
3. `res/menu/menu_main.xml` y `res/menu/menu_context.xml` (carpeta `menu` nueva).
4. `MainActivity.java` en `java/com/example/examen/`.

Sin cambios de Gradle ni imágenes. Sin `strings.xml`: textos directos.

## No verificado

Todas las APIs compilan. Las recetas de Option menu y Context menu no están en las diapositivas de clase (solo el título), sino en la API estándar de Android. El comportamiento en ejecución (que el menú se vea y responda) no se ha probado en un móvil o emulador.
