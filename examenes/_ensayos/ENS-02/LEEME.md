# ENS-02 · Mi Zoo (RecyclerView)

## Qué hace la app
- Pantalla principal: `RecyclerView` con 5 animales (León, Jirafa, Elefante, Cebra, Mono), fondo `#e7ecef`. Arranca en lista.
- El botón «Cambiar vista» alterna lista (imagen a la izquierda, nombre a la derecha) y cuadrícula de 2 columnas (imagen arriba, nombre centrado debajo).
- Al pulsar un animal sale un `Toast` con su nombre y se abre `DetailActivity` (nombre, imagen y botón «Volver»; si falta el nombre, «Sin nombre»).

## Orden para pegar los ficheros (paquete `com.example.examen`)
1. Imágenes en `res/drawable`: `leon`, `jirafa`, `elefante`, `cebra`, `mono`.
2. `app/src/main/res/layout/animal_list.xml` y `animal_grid.xml`.
3. `app/src/main/res/layout/activity_main.xml` y `activity_detail.xml`.
4. `MyAnimal.java`, `ImageAdapter.java`, `MainActivity.java` y `DetailActivity.java` en `app/src/main/java/com/example/examen/`.
5. `AndroidManifest.xml`: añadir el bloque `<activity android:name=".DetailActivity" android:exported="false" />` (la `MainActivity` ya está en el esqueleto).

## Gradle
Ningún cambio: el esqueleto `base` ya trae RecyclerView.

## Imágenes necesarias (no incluidas)
`leon`, `jirafa`, `elefante`, `cebra`, `mono` (en `res/drawable`, minúsculas y sin tilde).

## Cómo probarla
1. Abre la app: se ve la lista de 5 animales.
2. Pulsa «Cambiar vista»: pasa a 2 columnas; vuelve a pulsar y regresa a la lista.
3. Pulsa un animal: sale el `Toast` con su nombre y se abre el detalle con nombre e imagen.
4. Pulsa «Volver»: regresa a la principal.
