# Ensayo 2 · «Mi Zoo» (RecyclerView) — enunciado inventado

Crea una aplicación Android con dos pantallas.

**Pantalla principal (`MainActivity`).**
1. Muestra en un `RecyclerView` (id `recyclerAnimales`) una lista de 5 animales con su nombre y su imagen. Crea la clase `MyAnimal` y un adaptador propio con su `ViewHolder`.
2. Un botón (id `btnCambiarVista`, texto «Cambiar vista») alterna entre dos vistas: **lista** (imagen a la izquierda y nombre a la derecha) y **cuadrícula de 2 columnas** (imagen arriba y nombre centrado debajo). Al abrir la app se ve la lista.
3. Al pulsar un animal sale un `Toast` con su nombre y se abre `DetailActivity`.

**Pantalla de detalle (`DetailActivity`).**
4. Muestra el nombre del animal (id `tvNombre`) y su imagen (id `ivFoto`).
5. Un botón «Volver» (id `btnVolver`) cierra la pantalla y vuelve a la principal.
6. Si no llega ningún nombre, muestra «Sin nombre».

Usa solo lo visto en clase.
