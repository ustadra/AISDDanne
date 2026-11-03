# Ejemplo: RecyclerView lista / cuadrícula con detalle

Fecha: 2026-11-03. Compilado con tools/compilar.sh (`sh tools/compilar.sh base knowledge/patrones/ejemplos/recyclerview/solucion`): BUILD SUCCESSFUL. Compilar no es lo mismo que probado en un dispositivo.

## Qué recetas demuestra

De `knowledge/patrones/recyclerview.md`: RecyclerView completo (E6 / E8) y alternar lista / grid (E8). De `intents.md`: Intent explícito con `putExtra` y lectura con comprobación de `null`.

## Ficheros (`solucion/`, esqueleto `base`, paquete `com.example.examen`)

- `MyAnimal`: modelo con nombre e id de imagen.
- `ImageAdapter`: `ImageHolder` interno, `assignData`, `OnItemClickListener` por constructor, `setViewGrid(boolean)` con `notifyDataSetChanged()` y `getItemViewType`.
- `MainActivity`: botones Lista / Cuadrícula; cambian el adaptador y el `LayoutManager` sin repetir `setAdapter`. El clic abre `DetailActivity`.
- `DetailActivity`: muestra nombre e imagen recibidos.
- Layouts: `activity_main`, `activity_detail`, `animal_list` (imagen 100dp a la izquierda, texto con `layout_weight`), `animal_grid` (imagen `match_parent` x 120dp `fitCenter`, texto debajo).
- `AndroidManifest.xml` con las dos Activities.

## APIs usadas

`RecyclerView`, `RecyclerView.Adapter`, `RecyclerView.ViewHolder`, `LinearLayoutManager`, `GridLayoutManager(this, 2)`, `getItemViewType`, `notifyDataSetChanged`, `Intent`, `putExtra`, `getStringExtra`, `getIntExtra`, `setImageResource`.

## Imágenes que hay que añadir en `res/drawable`

`avestruz`, `gorila`, `pinguino`, `raton`, `oso`, `tortuga` (los nombres de E8 `soportar` y `tortuga_marina` aquí se llaman `oso` y `tortuga`). No van en el repo; el compilador usa PNG provisionales.
