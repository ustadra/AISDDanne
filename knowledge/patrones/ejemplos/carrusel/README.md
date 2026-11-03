# Ejemplo: carrusel de imágenes (E3)

Fecha: 2026-11-03. Compilado con tools/compilar.sh (esqueleto `base`, BUILD SUCCESSFUL).

## Receta que demuestra

«Carrusel (E3)» de `knowledge/patrones/basico.md`: un `ImageView` con dos botones, LEFT y RIGHT, que recorren una lista de imágenes en círculo (tras la última vuelve a la primera y antes de la primera va a la última).

## APIs usadas

`ArrayList<Integer>` con ids de `R.drawable`, `ImageView.setImageResource`, `Button.setOnClickListener` con `new View.OnClickListener()` (clase anónima), `findViewById`, `ConstraintLayout` con `app:layout_constraintStart_toEndOf` y `Baseline_toBaselineOf`.

## Ficheros

- `solucion/app/src/main/java/com/example/examen/MainActivity.java`
- `solucion/app/src/main/res/layout/activity_main.xml`
- `solucion/app/src/main/AndroidManifest.xml` (el de `plantilla/base`, sin cambios)

## Imágenes necesarias

No están en el ejemplo. Hay que añadirlas en `app/src/main/res/drawable/`:

`gnome_01`, `frog_02`, `fairy_03`, `mermaid_04`, `phoenix_05` (PNG o JPG, nombres en minúscula como aquí). `tools/compilar.sh` crea provisionales solo para compilar.
