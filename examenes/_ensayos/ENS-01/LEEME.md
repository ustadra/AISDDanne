# ENS-01 · Galería con personajes

## Qué hace la app
- `MainActivity`: carrusel de 4 personajes (Anterior/Siguiente, da la vuelta por los dos extremos), un campo de nombre y «Ver ficha». Con el nombre vacío sale el Toast «Escribe tu nombre».
- `FichaActivity`: recibe por `Intent` el nombre y el número de personaje («Hola, Ana», «Personaje 3») y tiene el botón «Contacto».
- `ContactoActivity`: flecha atrás a `FichaActivity`; «Llamar» abre el marcador con el número (vacío: no hace nada) y «Web» abre `http://google.es`.

## Orden para pegar los ficheros
Paquete `com.example.examen`. Rutas bajo `app/src/main/`:
1. `res/values/themes.xml` y `res/values-night/themes.xml`: **sustituye** el contenido de los dos del proyecto por los de `solucion/` (mismos nombres de estilo, pero sin `NoActionBar`, para que se vea la barra con la flecha atrás).
2. `res/layout/activity_main.xml` (sustituye el existente), `activity_ficha.xml` y `activity_contacto.xml` (nuevos).
3. `java/com/example/examen/MainActivity.java` (sustituye), `FichaActivity.java` y `ContactoActivity.java` (nuevos).
4. `AndroidManifest.xml`: sustituye el del proyecto (declara las tres Activities; `parentActivityName` de `FichaActivity` es `MainActivity` y el de `ContactoActivity` es `FichaActivity`).
5. Añade las imágenes (abajo) a `res/drawable/`.

## Gradle
Ningún cambio: vale el esqueleto `base`.

## Imágenes necesarias
`personaje_1`, `personaje_2`, `personaje_3`, `personaje_4` (en `res/drawable/`, PNG o JPG). No están incluidas.

## Cómo probarla
1. Pulsa Siguiente/Anterior varias veces: tras la cuarta imagen vuelve a la primera y al revés.
2. Con el nombre vacío, «Ver ficha»: Toast y no se abre nada.
3. Escribe «Ana», ve al personaje 3 y pulsa «Ver ficha»: «Hola, Ana» y «Personaje 3».
4. «Contacto»: pulsa la flecha atrás de la barra y vuelve a la ficha.
5. En Contacto, «Llamar» con y sin número (marcador / nada) y «Web» (navegador).
