# EJ-01 · Galería de mascotas (examen ejemplo)

Estado: `aprobada`
Veredicto QA: APROBADA · commit árbol de trabajo (base dcdd026) · 2026-11-04

## Agentes y ficheros

| Agente | Escribe en (exclusivo) |
|---|---|
| constructor-android | `examenes/ejemplo/EJ-01/solucion/`, `examenes/ejemplo/EJ-01/LEEME.md` |

## Enunciado

Pantalla `MainActivity` con:
- Un `ImageView` (`ivMascota`) centrado, con 4 imágenes en `drawable`.
- Dos `ImageButton`: `btnAnterior` (izquierda) y `btnSiguiente` (derecha).
- Un `TextView` (`tvNombre`) debajo con el nombre de la mascota que se ve.

## Requisitos (numerados)

- R1 · «Siguiente» muestra la mascota siguiente y su nombre; al pasar de la última vuelve a la primera.
- R2 · «Anterior» hace lo mismo al revés: de la primera salta a la última.
- R3 · Se usa un método `updateImage()`.
- R4 · Ids exactos: `ivMascota`, `btnAnterior`, `btnSiguiente`, `tvNombre`; `ImageView` centrado, botones a izquierda y derecha, nombre debajo.

## Decisiones de las rondas

- D1 · Imágenes: iconos que ya trae Android (`android.R.drawable...`), no se pide nada a la persona. Nombres: Perro, Gato, Conejo, Pájaro (uno por icono; ordenados 1-4). Si se usan en `ArrayList<Integer>` como en el carrusel de clase, que sea con ids de `android.R.drawable`.
- D2 · Paquete `com.example.examen`; textos de ≥ 14sp; sin adornos.
- D3 · Esqueleto `plantilla/base`. Receta: `knowledge/patrones/` (carrusel) y `knowledge/patrones/ejemplos/carrusel/`.
- D4 · Flechas de los botones: iconos de Android (por ejemplo `android.R.drawable.ic_media_previous` / `ic_media_next`).

## Tabla de requisitos (la rellena el constructor)

| Requisito | Fichero:línea | ✅/❌ |
|---|---|---|
| R1 | solucion/app/src/main/java/com/example/examen/MainActivity.java:56-65 | ✅ |
| R2 | solucion/app/src/main/java/com/example/examen/MainActivity.java:67-76 | ✅ |
| R3 | solucion/app/src/main/java/com/example/examen/MainActivity.java:80-83 (llamado en 54, 63 y 74) | ✅ |
| R4 | solucion/app/src/main/res/layout/activity_main.xml:10-60 (ids, centrado, botones izq./dcha., nombre debajo) | ✅ |
