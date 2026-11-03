# Ejemplo: Intents (explícitos, con datos e implícitos)

Fecha: 2026-11-03. Compilado con tools/compilar.sh (esqueleto `base`, `BUILD SUCCESSFUL`). Que compile no prueba que haga lo que pide un enunciado.

## Qué recetas demuestra

De `knowledge/patrones/intents.md` y `basico.md`:

- Intent explícito con dato: `MainActivity` → `SecondActivity` con `putExtra("TextoMA", texto)` y `putExtra("OpcionMA", opcion)` (E4, E5).
- `RadioGroup` con 3 opciones, leído con `getCheckedRadioButtonId()` (E5).
- Flecha atrás: `setDisplayHomeAsUpEnabled(true)` + `android:parentActivityName=".MainActivity"` en el Manifest.
- Intents implícitos en `ThirdActivity`: `ACTION_DIAL` (`tel:`), `ACTION_SENDTO` (`mailto:`), `ACTION_VIEW` (`http://google.es`) y `Intent.createChooser` (E4).
- Lo básico del 10: campo vacío (`trim().isEmpty()`) antes de marcar o enviar correo; `null` de `getStringExtra`; `getSupportActionBar()` comprobado contra `null`; las tres Activities en el Manifest.

## APIs que usa

`Intent`, `startActivity`, `putExtra`, `getIntent().getStringExtra`, `Uri.parse`, `Intent.ACTION_DIAL`, `Intent.ACTION_SENDTO`, `Intent.ACTION_VIEW`, `Intent.createChooser`, `RadioGroup.getCheckedRadioButtonId` y `check`, `getSupportActionBar().setDisplayHomeAsUpEnabled`, `View.OnClickListener` (clase anónima), `EdgeToEdge.enable` y el listener de insets (código base).

## Tema con barra de acción

El esqueleto `base` trae `Theme.Material3.DayNight.NoActionBar`: con él `getSupportActionBar()` devuelve `null` y la flecha atrás no se ve. Esta solución incluye `res/values/themes.xml` y `res/values-night/themes.xml` propios, con los mismos nombres (`Base.Theme.Examen`, `Theme.Examen`) pero con padre `Theme.Material3.DayNight`, que sí tiene barra. Al pegar los ficheros, estos dos sustituyen a los del esqueleto.

## Orden para pegar

1. `AndroidManifest.xml` y los dos `themes.xml` (sustituyen a los del esqueleto).
2. Los tres `activity_*.xml` en `res/layout/`.
3. Las tres Activities en `java/com/example/examen/`.

No hay cambios de Gradle ni imágenes. No lleva `strings.xml`: los textos van directos, como en E4 (el `app_name` sigue siendo el del esqueleto).

## No verificado

Ninguna API sin verificar. `ACTION_CALL` y la cámara no se incluyen (están en `intents.md`).
