# Ejemplo Realm: app de notas

Fecha: 2026-11-03. Compilado con tools/compilar.sh (esqueleto `realm`, BUILD SUCCESSFUL).

Código en `solucion/` con rutas de proyecto Android, paquetes `com.example.examen.{activities,model,app,adapters}`. No lleva Gradle: el esqueleto `plantilla/realm` ya trae el plugin `realm-android`.

## Recetas que demuestra
- Realm completo (`knowledge/patrones/realm.md`): modelo, `MyApplication`, alta, edición, borrado y listener.
- RecyclerView con adaptador, `Holder` interno e interfaz de eventos (`recyclerview.md`), con dos eventos: clic en el ítem (editar) y botón «Borrar».
- AlertDialog con layout inflado para alta y edición (`dialogos.md`), validando que el texto no esté vacío.

## APIs usadas
`RealmObject`, `@PrimaryKey`, `Realm.init`, `RealmConfiguration.Builder` (`allowWritesOnUiThread`, `deleteRealmIfMigrationNeeded`), `Realm.setDefaultConfiguration`, `Realm.getDefaultInstance`, `where().findAll()`, `max("id")` (puede ser `null`), `executeTransaction`, `copyToRealm`, `copyToRealmOrUpdate`, `deleteFromRealm`, `RealmChangeListener`, `RealmResults`, `realm.isClosed()` y `realm.close()`.

## Cómo usarlo
Pega `solucion/app/src/main/` sobre el esqueleto `realm` (Manifest, java y `res/layout`). Textos directos en el código y los layouts; solo `app_name` viene del esqueleto.
