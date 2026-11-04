# Compilar la solución

Compilar es la única forma de saber que algo **existe de verdad** (clase, método, id, atributo). Un código que no compila se corrige; uno que no se ha compilado se avisa como «no compilado».

## Herramientas (no van en el repo)

Hacen falta el **SDK de Android** y el **JDK** que pide cada esqueleto. `tools/compilar.sh` los busca solo, sin rutas fijas, por este orden:

| | Dónde mira |
|---|---|
| SDK | `ANDROID_SDK_COMPILAR`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, y los sitios habituales de Android Studio (`%LOCALAPPDATA%\Android\Sdk`, `~/Library/Android/sdk`, `~/Android/Sdk`) |
| JDK de `base` | `JAVA_HOME_COMPILAR`, el `jbr` de Android Studio (Program Files, `/Applications`, `/opt/android-studio`), `JAVA_HOME` |
| JDK de `realm` | `JAVA_HOME_COMPILAR`, `JAVA_HOME_21`, un `jdk-21*` de Eclipse Adoptium o de `/usr/lib/jvm`, `JAVA_HOME` |

Para fijar uno a mano: `export ANDROID_SDK_COMPILAR=<ruta del SDK>` y `export JAVA_HOME_COMPILAR=<ruta del JDK>`.

Si no encuentra el SDK o el JDK, **no hay compilación**: el script sale con código 3 y «NO COMPILADO: motivo», y el revisor revisa solo leyendo, y lo dice. No descarga nada por su cuenta. Gradle sí baja su distribución y las librerías la primera vez de cada esqueleto, así que esa primera compilación necesita red.

## Estado de cada esqueleto

| Esqueleto | Estado | JDK que exige | Detalle |
|---|---|---|---|
| `base` | ✅ **Compila** (`BUILD SUCCESSFUL`: Gradle 9.5.0, AGP 9.3.3, `compileSdk` 37) | JDK 25 (el de Android Studio) | Verificado con una Activity y un layout mínimos |
| `realm` | ✅ **Compila** (`BUILD SUCCESSFUL`: Gradle 8.12, AGP 8.9.1, `compileSdk` 36, Realm 10.15.1) | JDK 21 | Verificado con `MyApplication` y una Activity mínimas |

Cada esqueleto trae un `gradle/gradle-daemon-jvm.properties` que fija su JDK. Con otro, Gradle da «Cannot find a Java installation»; en Android Studio se cambia en *Settings → Build Tools → Gradle → Gradle JDK*.

## Esqueletos

`plantilla/base` (RecyclerView, Intents, vistas; copia limpia de E8) y `plantilla/realm` (copia limpia del proyecto Realm; AGP 8.9.1, Gradle 8.12, plugin `realm-android`). Paquete por defecto: `com.example.examen`.

## Atajo: `tools/compilar.sh`

Hace todo lo de abajo de una vez y sale con 0 solo con `BUILD SUCCESSFUL`:
```
sh tools/compilar.sh <base|realm> examenes/<examen>/EJ-NN/solucion [paquete]
```
Elige el esqueleto, busca su JDK y el SDK, compila en una carpeta temporal fuera del repo (imprime la ruta y deja `gradle.log`), crea PNG provisionales para los `drawable` que falten y para el demonio. Probado: compila una solución mínima en `base` y falla con código 1 si el código está roto. Es lo que usan `revisor-android` y las verificaciones de `qa`. Los pasos que siguen son lo que hace, por si hay que hacerlo a mano.

## Proyecto abrible: `--salida`

`sh tools/compilar.sh <base|realm> <solucion> [paquete] --salida <carpeta> [--reemplazar]` deja, solo si compila, el proyecto completo (esqueleto + solución) listo para *File → Open* en Android Studio, sin `build/`, `.gradle/`, `.idea/` ni `local.properties` (Android Studio escribe el suyo). Se niega a pisar una carpeta con contenido salvo con `--reemplazar`. Dentro del repo va a `examenes/<examen>/EJ-NN/proyecto/` (ignorado por git); fuera, lo hace `/exportar`, por defecto en `../exportados/<examen>-EJ-NN` (relativa a la raíz del repo). En un equipo sin SDK, `--sin-compilar` monta el proyecto igual y avisa «NO COMPILADO». Los `drawable` que faltan salen como PNG de 1 píxel con el nombre pedido: hay que sustituirlos por las imágenes reales (las lista el `LEEME.md`). Android Studio debe usar el JDK de cada esqueleto (tabla de arriba) o el sync falla.

## Procedimiento del revisor

1. Elegir esqueleto: `realm` si la solución usa Realm; si no, `base`.
2. Copiar el esqueleto al scratchpad de la sesión (nunca compilar dentro de `plantilla/`, que debe quedar limpia).
3. Volcar encima los ficheros de `examenes/<examen>/EJ-NN/solucion/` (código, `res/`, `AndroidManifest.xml`, y los Gradle si los trae). Si el paquete del examen no es `com.example.examen`, cambiar `namespace` y `applicationId`.
4. Escribir `local.properties` con `printf` y barras normales (ver arriba).
5. Si el esqueleto no tiene imágenes que la solución usa, crear PNG mínimos con el nombre de `drawable` pedido solo para poder compilar; no se entregan.
6. `./gradlew assembleDebug --offline` si ya hay caché, si no `./gradlew assembleDebug`. En Windows, `gradlew.bat`.
7. Devolver al constructor el error literal y la línea. Máximo **tres** rondas de compilar-arreglar; si sigue roto, se cuenta qué pasa.

Un `BUILD SUCCESSFUL` significa «compila»; no significa «hace lo que pide el enunciado». Eso lo comprueba la tabla de requisitos del revisor.
