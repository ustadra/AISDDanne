# Recetas de Intents

> Recetas: Intent explícito con dato (E4, E5) con Manifest y flecha atrás, e Intents implícitos (E4). Responden a los bloques «Intents explícitos» e «Intents implícitos» de `knowledge/temario.md`. Mapa completo: `knowledge/cobertura.md`.

## Intent explícito con dato (E4, E5)

```java
// origen
Intent intent = new Intent(MainActivity.this, SecondActivity.class);
intent.putExtra("TextoMA", mensaje);
startActivity(intent);

// destino
String recibido = getIntent().getStringExtra("TextoMA");
if (recibido != null) {
    textFirst.setText(recibido);
}
```

Manifest (cada Activity declarada; flecha atrás opcional):

```xml
<activity android:name=".SecondActivity"
    android:exported="false"
    android:parentActivityName=".MainActivity" />
```
Y en el `onCreate` del destino: `getSupportActionBar().setDisplayHomeAsUpEnabled(true);`

## Intents implícitos (E4)

```java
// llamar (marcar)
String numero = editTextPhone.getText().toString().trim();
if (!numero.isEmpty()) {
    Intent intent = new Intent(Intent.ACTION_DIAL);
    intent.setData(Uri.parse("tel:" + numero));
    startActivity(intent);
}
// correo
Intent intent = new Intent(Intent.ACTION_SENDTO);
intent.setData(Uri.parse("mailto:" + correo));
startActivity(intent);
// web
startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("http://google.es")));
// cámara
startActivity(new Intent(MediaStore.ACTION_IMAGE_CAPTURE));
// elegir app
startActivity(Intent.createChooser(intent, "Elige entre las siguientes aplicaciones"));
```
`ACTION_CALL` necesita `<uses-permission android:name="android.permission.CALL_PHONE" />`; si no se pide, usar `ACTION_DIAL`.
