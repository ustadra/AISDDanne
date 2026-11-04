# EJ-02 · Contacto rápido

## Qué hace

Pantalla con teléfono y web y tres botones. **Llamar** abre el marcador con el número; **Abrir web** abre el navegador (añade `http://` si falta); si el campo está vacío sale el Toast «Rellena el campo». **Enviar datos** abre `DetalleActivity`, que muestra teléfono y web, o «Sin datos» si el dato es `null` o vacío. `DetalleActivity` tiene flecha atrás.

## Orden para pegar (esqueleto `plantilla/base`, paquete `com.example.examen`)

1. `app/src/main/AndroidManifest.xml` (sustituye al existente).
2. `app/src/main/res/values/themes.xml` y `values-night/themes.xml` (tema con barra de título, necesario para la flecha).
3. `app/src/main/res/layout/activity_main.xml` y `activity_detalle.xml`.
4. `app/src/main/java/com/example/examen/MainActivity.java` y `DetalleActivity.java`.

## Gradle

Sin cambios: no hay dependencias ni plugins nuevos. No hacen falta permisos (se usa `ACTION_DIAL`).

## Imágenes necesarias

Ninguna.

## Cómo probarlo

- Llamar con el campo vacío: Toast «Rellena el campo». Con un número: se abre el marcador con él.
- Abrir web con `google.es`: abre `http://google.es`. Vacío: Toast.
- Enviar datos con ambos campos: se ven en la segunda pantalla. Con alguno vacío: «Sin datos». La flecha vuelve a la principal.
