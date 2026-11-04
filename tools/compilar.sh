#!/bin/sh
# compilar.sh — compila una solución de Android sobre su esqueleto, en una copia temporal.
#
# Uso:  sh tools/compilar.sh <base|realm> <carpeta-solucion> [paquete] [--salida <carpeta>] [--reemplazar] [--sin-compilar]
#   base   → plantilla/base  (RecyclerView, Intents, vistas)   — JDK de Android Studio (25)
#   realm  → plantilla/realm (Realm 10.15.1)                   — JDK 21
#   <carpeta-solucion>: ficheros con rutas de proyecto Android (app/src/main/java/..., res/..., AndroidManifest.xml)
#   [paquete]: si la solución no usa com.example.examen, su namespace/applicationId.
#   --salida <carpeta>: si compila, deja allí el proyecto completo (esqueleto + solución) listo para abrir con
#     File > Open en Android Studio, sin build/, .gradle/, gradle.log ni local.properties. Se niega si la carpeta
#     existe y no está vacía, salvo con --reemplazar (que la vacía antes).
#   --sin-compilar: monta el proyecto en --salida sin llamar a Gradle (para un equipo sin SDK). Sale con 0 pero
#     dice «NO COMPILADO»: nadie sabe si compila hasta que se abra en Android Studio.
#
# Sale con 0 solo si Gradle dice BUILD SUCCESSFUL. Escribe todo en una carpeta temporal fuera del repo
# (se imprime su ruta) y deja el log en <temporal>/gradle.log. Va con --no-daemon (el demonio se apaga solo): nada de `gradlew --stop`, que mataría las compilaciones de otros agentes en paralelo. No toca plantilla/ ni la solución.
# JDK y SDK: se buscan solos (variables de entorno y sitios habituales de cada sistema); se pueden fijar con
# JAVA_HOME_COMPILAR y ANDROID_SDK_COMPILAR. Si no los encuentra, sale con 3 y «NO COMPILADO: motivo». Detalle: knowledge/compilar.md.

SALIDA=""; REEMPLAZAR=0; SIN=0; POS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --salida) [ -n "$2" ] || { echo "--salida pide una carpeta" >&2; exit 2; }
              mkdir -p "$2" && SALIDA=$(cd "$2" && pwd) || exit 2; shift 2 ;;
    --reemplazar) REEMPLAZAR=1; shift ;;
    --sin-compilar) SIN=1; shift ;;
    *) POS="$POS|$1"; shift ;;
  esac
done
IFS='|'; set -- $POS; unset IFS; shift
ESQ="$1"; SOL="$2"; PAQ="${3:-com.example.examen}"
[ -n "$ESQ" ] && [ -d "$SOL" ] || { echo "Uso: sh tools/compilar.sh <base|realm> <carpeta-solucion> [paquete]" >&2; exit 2; }
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
[ -d "$RAIZ/plantilla/$ESQ" ] || { echo "Esqueleto desconocido: $ESQ (base | realm)" >&2; exit 2; }

# --- JDK y SDK: sin rutas fijas de ningún equipo -----------------------------------------------------
es_jdk() { [ -x "$1/bin/java" ] || [ -x "$1/bin/java.exe" ]; }
PF="${PROGRAMFILES:-/c/Program Files}"; LA="${LOCALAPPDATA:-$HOME/AppData/Local}"
buscar_sdk() {
  for d in "$ANDROID_SDK_COMPILAR" "$ANDROID_HOME" "$ANDROID_SDK_ROOT" "$LA/Android/Sdk" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    [ -n "$d" ] && [ -d "$d/platforms" ] && { echo "$d"; return; }
  done
}
buscar_jdk() {
  [ -n "$JAVA_HOME_COMPILAR" ] && { echo "$JAVA_HOME_COMPILAR"; return; }
  if [ "$ESQ" = "realm" ]; then
    for d in "$JAVA_HOME_21" "$PF/Eclipse Adoptium"/jdk-21* "$LA/Programs/Eclipse Adoptium"/jdk-21* /usr/lib/jvm/*21* "$JAVA_HOME"; do
      [ -n "$d" ] && es_jdk "$d" && { echo "$d"; return; }
    done
  else
    for d in "$PF/Android/Android Studio/jbr" "/Applications/Android Studio.app/Contents/jbr/Contents/Home" /opt/android-studio/jbr "$JAVA_HOME"; do
      [ -n "$d" ] && es_jdk "$d" && { echo "$d"; return; }
    done
  fi
}
if [ "$SIN" -eq 0 ]; then
  SDK=$(buscar_sdk); JDK=$(buscar_jdk)
  [ -n "$SDK" ] || { echo "NO COMPILADO: no encuentro el SDK de Android (fija ANDROID_SDK_COMPILAR o ANDROID_HOME)" >&2; exit 3; }
  [ -n "$JDK" ] || { echo "NO COMPILADO: no encuentro el JDK que pide el esqueleto $ESQ (fija JAVA_HOME_COMPILAR)" >&2; exit 3; }
  if command -v cygpath >/dev/null 2>&1; then SDK=$(cygpath -m "$SDK"); JDK=$(cygpath -w "$JDK"); fi
fi
[ "$SIN" -eq 1 ] && [ -z "$SALIDA" ] && { echo "--sin-compilar necesita --salida" >&2; exit 2; }

if [ -n "$SALIDA" ] && [ -d "$SALIDA" ] && [ -n "$(ls -A "$SALIDA" 2>/dev/null)" ] && [ "$REEMPLAZAR" -eq 0 ]; then
  echo "La carpeta de salida ya existe y no está vacía: $SALIDA (usa --reemplazar para vaciarla)" >&2; exit 2
fi
TMP=$(mktemp -d) || exit 2
echo "Montando en $TMP"
cp -r "$RAIZ/plantilla/$ESQ/." "$TMP/" || exit 2
cp -r "$SOL/." "$TMP/" || exit 2
[ "$SIN" -eq 0 ] && printf 'sdk.dir=%s\n' "$SDK" > "$TMP/local.properties"

if [ "$PAQ" != "com.example.examen" ]; then
  sed -i "s/com\.example\.examen/$PAQ/g" "$TMP/app/build.gradle.kts"
fi

# Imágenes que la solución usa y el esqueleto no trae: PNG de 1 píxel solo para poder compilar (no se entregan).
PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
mkdir -p "$TMP/app/src/main/res/drawable"
for nombre in $(grep -rhoE '(^|[^.A-Za-z0-9_])(R\.drawable\.|@drawable/)[A-Za-z0-9_]+' "$TMP/app/src/main" 2>/dev/null | sed -E 's#^.*(R\.drawable\.|@drawable/)##' | sort -u); do
  if ! ls "$TMP/app/src/main/res/drawable/$nombre".* >/dev/null 2>&1; then
    printf '%s' "$PNG" | base64 -d > "$TMP/app/src/main/res/drawable/$nombre.png"
    echo "  imagen provisional: $nombre.png"
  fi
done

cd "$TMP" || exit 2

entregar() {
  [ "$REEMPLAZAR" -eq 1 ] && rm -rf "$SALIDA"
  mkdir -p "$SALIDA" && cp -r "$TMP/." "$SALIDA/" || { echo "No se pudo escribir en $SALIDA" >&2; exit 2; }
  rm -rf "$SALIDA/build" "$SALIDA/.gradle" "$SALIDA/app/build" "$SALIDA/gradle.log" "$SALIDA/local.properties" "$SALIDA/.idea" "$SALIDA"/hsperfdata_* "$SALIDA"/native-platform*
  echo "Proyecto listo en $(cd "$SALIDA" && { pwd -W 2>/dev/null || pwd; }) (ábrelo con File > Open en Android Studio)"
}

if [ "$SIN" -eq 1 ]; then
  entregar
  echo "NO COMPILADO: exportado sin compilar (--sin-compilar); se sabrá si compila al abrirlo en Android Studio"
  exit 0
fi

if [ -x ./gradlew.bat ] && [ "$OS" = "Windows_NT" ]; then GRADLEW=./gradlew.bat; else chmod +x ./gradlew 2>/dev/null; GRADLEW=./gradlew; fi
JAVA_HOME="$JDK" ANDROID_HOME="$SDK" $GRADLEW assembleDebug --no-daemon </dev/null > gradle.log 2>&1
CODIGO=$?

if [ "$CODIGO" -eq 0 ] && grep -q "BUILD SUCCESSFUL" gradle.log; then
  grep "BUILD SUCCESSFUL" gradle.log
  [ -n "$SALIDA" ] && entregar
  exit 0
fi
echo "BUILD FAILED (log: $TMP/gradle.log)"
grep -E -A3 "error:|^e: |What went wrong" gradle.log | head -30
exit 1
