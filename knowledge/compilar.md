# Compilar la solución

Compilar es la única forma de saber que algo **existe de verdad** (clase, método, id, atributo). Un código que no compila se corrige; uno que no se ha compilado se avisa como «no compilado».

## Herramientas (instaladas fuera del proyecto)

Instaladas con Android Studio (comprobado el 2026-11-03):

| | Ruta |
|---|---|
| JDK 25 (Android Studio) y JDK 21 (Temurin) | en la tabla de esqueletos de abajo |
| Android SDK | `C:\Users\SOFT7\AppData\Local\Android\Sdk` |
| Plataformas / build-tools | `android-36`, `android-37.0` / `36.0.0` (no hay `cmdline-tools`) |

Variables, **en formato Windows y entre comillas simples** en bash:
```
export JAVA_HOME='<el de la tabla de esqueletos>'
export ANDROID_HOME='C:\Users\SOFT7\AppData\Local\Android\Sdk'
```
`local.properties` se escribe con **barras normales** y `printf` (con `echo` bash se come las `\\` y Gradle da `Invalid file path`):
```
printf 'sdk.dir=C:/Users/SOFT7/AppData/Local/Android/Sdk\n' > local.properties
```
Se lanza con `./gradlew.bat assembleDebug --no-daemon </dev/null`.

Si esas rutas no existen, **no hay compilación**: el revisor lo dice y revisa solo leyendo. No descarga nada por su cuenta. Gradle sí baja su distribución y las librerías la primera vez de cada esqueleto.

## Estado de cada esqueleto

| Esqueleto | Estado | `JAVA_HOME` que exige | Detalle |
|---|---|---|---|
| `base` | ✅ **Compila** (`BUILD SUCCESSFUL`: Gradle 9.5.0, AGP 9.3.3, `compileSdk` 37) | `C:\Program Files\Android\Android Studio\jbr` (JDK 25) | Verificado con una Activity y un layout mínimos |
| `realm` | ✅ **Compila** (`BUILD SUCCESSFUL`: Gradle 8.12, AGP 8.9.1, `compileSdk` 36, Realm 10.15.1) | `C:\Users\SOFT7\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.13.9-hotspot` (JDK 21) | Verificado con `MyApplication` y una Activity mínimas |

Cada esqueleto trae un `gradle/gradle-daemon-jvm.properties` que fija su JDK. Con otro, Gradle da «Cannot find a Java installation». El revisor pone el `JAVA_HOME` de esta tabla según el esqueleto. Hay también un JDK 17 en `...\Eclipse Adoptium\jdk-17.0.20.101-hotspot`, que ningún esqueleto usa.

## Esqueletos

`plantilla/base` (RecyclerView, Intents, vistas; copia limpia de E8) y `plantilla/realm` (copia limpia del proyecto Realm; AGP 8.9.1, Gradle 8.12, plugin `realm-android`). Paquete por defecto: `com.example.examen`.

## Procedimiento del revisor

1. Elegir esqueleto: `realm` si la solución usa Realm; si no, `base`.
2. Copiar el esqueleto al scratchpad de la sesión (nunca compilar dentro de `plantilla/`, que debe quedar limpia).
3. Volcar encima los ficheros de `examenes/<examen>/EJ-NN/solucion/` (código, `res/`, `AndroidManifest.xml`, y los Gradle si los trae). Si el paquete del examen no es `com.example.examen`, cambiar `namespace` y `applicationId`.
4. Escribir `local.properties` con `printf` y barras normales (ver arriba).
5. Si el esqueleto no tiene imágenes que la solución usa, crear PNG mínimos con el nombre de `drawable` pedido solo para poder compilar; no se entregan.
6. `./gradlew assembleDebug --offline` si ya hay caché, si no `./gradlew assembleDebug`. En Windows, `gradlew.bat`.
7. Devolver al constructor el error literal y la línea. Máximo **tres** rondas de compilar-arreglar; si sigue roto, se cuenta qué pasa.

Un `BUILD SUCCESSFUL` significa «compila»; no significa «hace lo que pide el enunciado». Eso lo comprueba la tabla de requisitos del revisor.
