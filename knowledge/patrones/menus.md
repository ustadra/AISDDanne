# Receta de menús (Option menu y Context menu)

> Receta: menú de opciones y menú contextual. Responde al bloque «Mencionado, solo nivel básico» de `knowledge/temario.md`. Mapa completo: `knowledge/cobertura.md`. Ejemplo compilado: `knowledge/patrones/ejemplos/menus/`.

**Aviso de procedencia:** las diapositivas de clase («Option menu» y «Context menu») traen solo el título. Esta receta es la estándar mínima de la API de Android, no algo dado en clase.

## 0. Tema con barra de acción

El esqueleto `base` usa `Theme.Material3.DayNight.NoActionBar`: sin barra no hay dónde dibujar el menú de opciones. Hay que sustituir `res/values/themes.xml` y `res/values-night/themes.xml` por temas con los mismos nombres (`Base.Theme.Examen`, `Theme.Examen`) y padre con barra:

```xml
<style name="Base.Theme.Examen" parent="Theme.Material3.DayNight">
</style>

<style name="Theme.Examen" parent="Base.Theme.Examen" />
```
(El de `values-night` lleva solo el primer estilo.) El Context menu no necesita la barra.

## 1. Option menu (barra superior)

`res/menu/menu_main.xml` (carpeta `menu` nueva dentro de `res`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<menu xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:id="@+id/action_ajustes"
        android:title="Ajustes" />
    <item
        android:id="@+id/action_acerca"
        android:title="Acerca de" />
    <item
        android:id="@+id/action_salir"
        android:title="Salir" />
</menu>
```

En la Activity, dos métodos:

```java
@Override
public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.menu_main, menu);
    return true;   // true = mostrar el menú
}

@Override
public boolean onOptionsItemSelected(MenuItem item) {
    int id = item.getItemId();
    if (id == R.id.action_ajustes) {
        Toast.makeText(this, "Ajustes", Toast.LENGTH_SHORT).show();
        return true;
    } else if (id == R.id.action_acerca) {
        Toast.makeText(this, "Acerca de", Toast.LENGTH_SHORT).show();
        return true;
    } else if (id == R.id.action_salir) {
        finish();
        return true;
    }
    return super.onOptionsItemSelected(item);
}
```
Se compara con `if / else if` y no con `switch (item.getItemId())`: en proyectos con AGP moderno los ids de `R` no son constantes y `switch` no compila (no probado aquí; `if / else if` sí compila).

## 2. Context menu (pulsación larga sobre una vista)

`res/menu/menu_context.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<menu xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:id="@+id/ctx_editar"
        android:title="Editar" />
    <item
        android:id="@+id/ctx_borrar"
        android:title="Borrar" />
</menu>
```

En `onCreate`, se registra la vista (sin esto la pulsación larga no hace nada):

```java
tvContexto = findViewById(R.id.tvContexto);
registerForContextMenu(tvContexto);   // pulsación larga sobre el TextView
```

Y dos métodos más en la Activity:

```java
@Override
public void onCreateContextMenu(ContextMenu menu, View v, ContextMenu.ContextMenuInfo menuInfo) {
    super.onCreateContextMenu(menu, v, menuInfo);
    menu.setHeaderTitle("Elige una acción");
    getMenuInflater().inflate(R.menu.menu_context, menu);
}

@Override
public boolean onContextItemSelected(MenuItem item) {
    int id = item.getItemId();
    if (id == R.id.ctx_editar) {
        Toast.makeText(this, "Editar", Toast.LENGTH_SHORT).show();
        return true;
    } else if (id == R.id.ctx_borrar) {
        Toast.makeText(this, "Borrar", Toast.LENGTH_SHORT).show();
        return true;
    }
    return super.onContextItemSelected(item);
}
```

Imports: `android.view.ContextMenu`, `android.view.Menu`, `android.view.MenuItem`, `android.view.View`, `android.widget.Toast`.

## Qué NO usar

`PopupMenu`, `ActionMode` (menú contextual de acción) y una `Toolbar` propia con `setSupportActionBar`: no son lo que dicen los títulos de las diapositivas y no se han verificado aquí. Tampoco `showAsAction` ni iconos en el menú: texto con `android:title` y nada más.

## Pruebas rápidas

- Los tres puntos de la barra abren el menú de opciones; «Salir» cierra la Activity.
- Pulsación larga sobre «Mantén pulsado aquí» muestra el título y las dos acciones.
