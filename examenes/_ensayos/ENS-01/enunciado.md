# Ensayo 1 · «Galería con personajes» (Intents y carrusel) — enunciado inventado

Crea una aplicación Android con tres pantallas.

**`MainActivity` (carrusel).**
1. Un `ImageView` (id `ivPersonaje`) que muestra una imagen de una lista de 4 personajes y dos botones, «Anterior» (id `btnAnterior`) y «Siguiente» (id `btnSiguiente`), que cambian la imagen. Al llegar al final se vuelve al principio y al revés.
2. Un `EditText` (id `etNombre`, pista «Tu nombre») y un botón «Ver ficha» (id `btnFicha`) que abre `FichaActivity`. Si el nombre está vacío no se abre y sale un `Toast` «Escribe tu nombre».

**`FichaActivity` (intent explícito).**
3. Recibe por `Intent` el nombre escrito y el número del personaje que se estaba viendo, y los muestra en dos `TextView` (ids `tvNombre` y `tvPersonaje`, p. ej. «Hola, Ana» y «Personaje 3»).
4. Un botón «Contacto» (id `btnContacto`) abre `ContactoActivity`. Esta pantalla tiene la flecha atrás de la barra de título que vuelve a `FichaActivity`.

**`ContactoActivity` (intents implícitos).**
5. Un `EditText` (id `etTelefono`) y un botón «Llamar» (id `btnLlamar`) que abre el marcador con ese número (sin llamar directamente). Si el campo está vacío no hace nada.
6. Un botón «Web» (id `btnWeb`) que abre `http://google.es` en el navegador.

Usa solo lo visto en clase.
