# EJ-01 · Galería de mascotas

## Qué hace

`MainActivity` muestra una mascota (icono de Android) centrada, con su nombre debajo. El botón de la derecha (`btnSiguiente`) pasa a la siguiente y tras la última vuelve a la primera; el de la izquierda (`btnAnterior`) va a la anterior y desde la primera salta a la última. Mascotas, en orden: Perro, Gato, Conejo, Pájaro. Todo se refresca en `updateImage()`.

## Orden para pegar

1. Crea el proyecto con el esqueleto `plantilla/base` (paquete `com.example.examen`).
2. Pega `app/src/main/res/layout/activity_main.xml` (sustituye el existente).
3. Pega `app/src/main/java/com/example/examen/MainActivity.java` (sustituye el existente).

El `AndroidManifest.xml` no cambia (el de la plantilla ya declara `MainActivity`).

## Cambios de Gradle

Ninguno.

## Imágenes necesarias

Ninguna: se usan `android.R.drawable.ic_menu_camera`, `ic_menu_gallery`, `ic_menu_compass`, `ic_menu_help` (mascotas) e `ic_media_previous` / `ic_media_next` (flechas). Son iconos de Android grises y claros, por eso el `ImageView` y los botones llevan fondo `#274c77` para que se vean.

## Cómo probarla

1. Ejecuta la app: se ve el icono 1 y el texto «Perro».
2. Pulsa la flecha derecha 4 veces: Gato, Conejo, Pájaro y vuelve a Perro.
3. Pulsa la flecha izquierda desde Perro: salta a Pájaro.
