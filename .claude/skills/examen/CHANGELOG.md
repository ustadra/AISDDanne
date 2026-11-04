# Changelog — examen

## 1.0.0
- Alta: flujo de enunciado a ejercicio completo en Java + XML, con una o dos rondas de preguntas en llano, ceñido al temario de 2º de DAM (Intents, RecyclerView, Realm).

## 2.0.0
- Pasa de skill única a orquestador: reparte el trabajo entre `constructor-android` y `revisor-android` (el que escribe no se revisa a sí mismo) y añade el modo retoque.
- Añade reglas contra alucinaciones: solo fuentes verificadas, «no verificado» explícito y compilación como prueba.

## 2.1.0
- La unidad de trabajo pasa a ser el ejercicio: `examenes/<examen>/EJ-NN/` con su `SPEC.md` (estado y veredicto), `solucion/` y `LEEME.md`, en vez de `salida/<examen>/`. Lo exige la adopción del kit (`unit-close`, `/orquesta`).

## 2.1.1
- La regla «cero invención» remite a `knowledge/patrones/` (el fichero único `patrones.md` se dividió por tema en O-01/F-01).

## 2.2.0
- La entrega apunta a `proyecto/`, el proyecto completo que deja `revisor-android` al compilar (`tools/compilar.sh --salida`), y a `/exportar` para sacarlo fuera del repo.
