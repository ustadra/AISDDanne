#!/bin/sh
# compilar.sh — compila una solución de Android sobre su esqueleto, en una copia temporal.
#
# Uso:  sh tools/compilar.sh <base|realm> <carpeta-solucion> [paquete]
#   base   → plantilla/base  (RecyclerView, Intents, vistas)   — JDK 25 de Android Studio
#   realm  → plantilla/realm (Realm 10.15.1)                   — JDK 21 de Temurin
#   <carpeta-solucion>: ficheros con rutas de proyecto Android (app/src/main/java/..., res/..., AndroidManifest.xml)
#   [paquete]: si la solución no usa com.example.examen, su namespace/applicationId.
#
# Sale con 0 solo si Gradle dice BUILD SUCCESSFUL. Escribe todo en una carpeta temporal fuera del repo
# (se imprime su ruta) y deja el log en <temporal>/gradle.log. No toca plantilla/ ni la solución.
# Rutas de JDK y SDK: knowledge/compilar.md. Se pueden sobrescribir con JAVA_HOME_COMPILAR y ANDROID_SDK_COMPILAR.

ESQ="$1"; SOL="$2"; PAQ="${3:-com.example.examen}"
[ -n "$ESQ" ] && [ -d "$SOL" ] || { echo "Uso: sh tools/compilar.sh <base|realm> <carpeta-solucion> [paquete]" >&2; exit 2; }
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
[ -d "$RAIZ/plantilla/$ESQ" ] || { echo "Esqueleto desconocido: $ESQ (base | realm)" >&2; exit 2; }

SDK="${ANDROID_SDK_COMPILAR:-C:/Users/SOFT7/AppData/Local/Android/Sdk}"
case "$ESQ" in
  base)  JDK="${JAVA_HOME_COMPILAR:-C:\\Program Files\\Android\\Android Studio\\jbr}" ;;
  realm) JDK="${JAVA_HOME_COMPILAR:-C:\\Users\\SOFT7\\AppData\\Local\\Programs\\Eclipse Adoptium\\jdk-21.0.13.9-hotspot}" ;;
esac

TMP=$(mktemp -d) || exit 2
echo "Compilando en $TMP"
cp -r "$RAIZ/plantilla/$ESQ/." "$TMP/" || exit 2
cp -r "$SOL/." "$TMP/" || exit 2
printf 'sdk.dir=%s\n' "$SDK" > "$TMP/local.properties"

if [ "$PAQ" != "com.example.examen" ]; then
  sed -i "s/com\.example\.examen/$PAQ/g" "$TMP/app/build.gradle.kts"
fi

# Imágenes que la solución usa y el esqueleto no trae: PNG de 1 píxel solo para poder compilar (no se entregan).
PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
mkdir -p "$TMP/app/src/main/res/drawable"
for nombre in $(grep -rhoE '(R\.drawable\.|@drawable/)[A-Za-z0-9_]+' "$TMP/app/src/main" 2>/dev/null | sed -E 's#(R\.drawable\.|@drawable/)##' | sort -u); do
  if ! ls "$TMP/app/src/main/res/drawable/$nombre".* >/dev/null 2>&1; then
    printf '%s' "$PNG" | base64 -d > "$TMP/app/src/main/res/drawable/$nombre.png"
    echo "  imagen provisional: $nombre.png"
  fi
done

cd "$TMP" || exit 2
JAVA_HOME="$JDK" ANDROID_HOME="$SDK" ./gradlew.bat assembleDebug --no-daemon </dev/null > gradle.log 2>&1
CODIGO=$?
JAVA_HOME="$JDK" ANDROID_HOME="$SDK" ./gradlew.bat --stop </dev/null >/dev/null 2>&1

if [ "$CODIGO" -eq 0 ] && grep -q "BUILD SUCCESSFUL" gradle.log; then
  grep "BUILD SUCCESSFUL" gradle.log
  exit 0
fi
echo "BUILD FAILED (log: $TMP/gradle.log)"
grep -E -A3 "error:|^e: |What went wrong" gradle.log | head -30
exit 1
