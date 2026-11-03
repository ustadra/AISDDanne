# Convenciones de código

> Regla viva del proyecto. Cargada como contexto. Aplica a todo el código que escriben los agentes.

## Java y XML (estilo de clase)

- Java 11 (`sourceCompatibility`/`targetCompatibility` de los esqueletos). Sin Kotlin.
- `findViewById` en el `onCreate`; los clics con clase anónima (`new View.OnClickListener() {...}`), como en clase. Sin ViewBinding ni lambdas nuevas salvo el listener de insets que genera Android Studio.
- Adaptador de RecyclerView con `ViewHolder` interno, `assignData` e interfaz `OnItemClickListener` por constructor.
- Nombres de ids, clases y textos: los del enunciado. Si no los da, los patrones de `knowledge/patrones/`.
- Colores en `#RRGGBB` o `@color/...` definidos en `colors.xml`; textos de ≥ 14sp, tamaños en `dp`/`sp`.
- Comentarios cortos en español solo donde ayuden a defender el código en la corrección.
- Una dependencia o plugin nuevo se añade a Gradle y se avisa en el `LEEME.md` del ejercicio.

## Estilo y entorno

- Las rutas del `LEEME.md` son las de un proyecto de Android Studio. El `local.properties`, el `.gradle/` y `build/` nunca se versionan.
- Ningún secreto en el repo: no hay claves ni `.env`. Config por entorno no aplica a este repo.
