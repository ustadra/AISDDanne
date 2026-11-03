# Temario dado en clase (lo que cae y lo que no)

Fuente: 5 PDFs de teoría (Intent, RecyclerView, RecyclerView Pasos, RecyclerView Medidas List/Grid, Realm) y 6 proyectos de ejercicios (E3, E4, E5, E6, E8, Realm). Todo en **Java + XML**. Las recetas de cada bloque están en `knowledge/patrones/` y el mapa de qué receta cubre qué, en `knowledge/cobertura.md`.

## Entra

### Interfaz
- Layouts: `ConstraintLayout` (raíz por defecto, con `android:id="@+id/main"`), `LinearLayout` (horizontal/vertical, con `layout_weight`).
- Vistas: `TextView`, `EditText` (`inputType` text/phone/textEmailAddress, `hint`), `Button`, `ImageButton`, `ImageView` (`setImageResource`, `scaleType`), `RadioGroup` + `RadioButton`.
- Recursos: colores en `colors.xml`, textos, imágenes en `drawable`, `layout_margin`, `padding`, `textSize` en sp, `gravity`/`layout_gravity`.
- Eventos: `setOnClickListener(new View.OnClickListener() {...})` (clase anónima, como en clase).
- Mensajes: `Toast.makeText(...).show()`.
- Código base de cada Activity: `EdgeToEdge.enable(this)`, `setContentView`, listener de insets (lo genera Android Studio; se deja tal cual).

### Carrusel (E3)
- `ArrayList<Integer>` con `R.drawable.x`, un índice, botones izquierda/derecha, el índice da la vuelta (al pasar del último vuelve al primero y al revés), método `updateImage()`.

### Intents
- **Explícito:** `new Intent(A.this, B.class)`, `startActivity`.
- **Datos entre Activities:** `putExtra("clave", valor)`; en destino `getIntent().getStringExtra("clave")` o `getExtras()` con `Bundle`. Comprobar `null`.
- Registrar cada Activity en el Manifest. Flecha atrás: `getSupportActionBar().setDisplayHomeAsUpEnabled(true)` + `android:parentActivityName` en el Manifest.
- **Implícito:** `ACTION_VIEW` + `Uri.parse("http://...")` (navegador), `ACTION_DIAL` + `tel:`, `ACTION_CALL` + `tel:` (pide permiso `CALL_PHONE`), `ACTION_VIEW` + `content://contacts/people`, `ACTION_SENDTO` + `mailto:`, `MediaStore.ACTION_IMAGE_CAPTURE` (cámara).
- `Intent.createChooser(intent, "mensaje")` para elegir app.
- Validar que el campo no esté vacío (`.trim().isEmpty()`) antes de lanzar el intent.

### RecyclerView
- Orden: `RecyclerView` en el layout → modelo (POJO con constructor y getters) → layout del ítem → `Adapter` + `ViewHolder` → `LayoutManager` + `setAdapter` en la Activity.
- Adaptador: `extends RecyclerView.Adapter<Adaptador.Holder>`; métodos `onCreateViewHolder` (inflar el layout del ítem con `parent`, `false`), `onBindViewHolder` (llama a `holder.assignData(...)`), `getItemCount`.
- `ViewHolder` como clase interna: guarda las vistas con `findViewById` una sola vez (patrón ViewHolder) y tiene `assignData`.
- Clic en un ítem: interfaz `OnItemClickListener` dentro del adaptador, se pasa por constructor, `itemView.setOnClickListener` llama a `listener.OnItemClick(dato)`; la Activity decide qué hacer (Toast, abrir otra Activity con `putExtra`...).
- LayoutManagers: `LinearLayoutManager` vertical y horizontal, `GridLayoutManager(this, n)`, `StaggeredGridLayoutManager`.
- **Lista y cuadrícula a la vez (E8):** dos layouts de ítem, `getItemViewType` o variable `isGridView`, método `setViewGrid(boolean)` con `notifyDataSetChanged()`, y cambio de `LayoutManager` desde dos botones. Medidas: raíz `match_parent` × `wrap_content`; lista con imagen fija (80-120dp) a la izquierda y texto a la derecha; grid con imagen `match_parent` × alto fijo (100-140dp) y texto debajo; `fitCenter` para no recortar.
- Dependencia en Gradle: `implementation(libs.recyclerview)` (con su entrada en `libs.versions.toml`, ver E8). En E6 funcionaba sin ella porque llega con Material, pero lo seguro es añadirla.

### Realm (base de datos)
- Gradle: plugin `realm-android`, `classpath("io.realm:realm-gradle-plugin:10.15.1")`, AGP 8.9.1, Gradle 8.12, `android.useAndroidX=true`.
- Modelo: `extends RealmObject`, constructor vacío obligatorio, `@PrimaryKey`, `@Required`, getters y setters.
- `MyApplication extends Application` (declarada con `android:name` en el Manifest): `Realm.init`, `RealmConfiguration.Builder().deleteRealmIfMigrationNeeded().build()`, `Realm.setDefaultConfiguration`.
- Id autoincremental: `AtomicInteger` estático + `incrementAndGet()`, o `where(X.class).max("id")` + 1 (E de clase).
- `Realm.getDefaultInstance()` en la Activity y `realm.close()` en `onDestroy`.
- Escritura: `beginTransaction` / `commitTransaction`, o `executeTransaction(new Realm.Transaction() {...})`; `copyToRealm`, `copyToRealmOrUpdate`.
- Lectura: `where(X.class).findAll()` → `RealmResults<X>`; `equalTo("campo", valor).findFirst()`; `max("id")`.
- Borrado: `obj.deleteFromRealm()`, `results.deleteAllFromRealm()`.
- `addChangeListener(new RealmChangeListener<RealmResults<X>>() {...})` → `adapter.notifyDataSetChanged()`.
- Estructura en paquetes: `activities`, `model`, `app`, `adapters`.
- `AlertDialog.Builder`: `setView(inflate del layout)`, `setTitle`, `setMessage`, `setPositiveButton` / `setNegativeButton` / `setNeutralButton`, `create()`, `show()`; leer un `EditText` del layout inflado.

### Mencionado, solo nivel básico
- Option menu y Context menu: aparecen como títulos al final del PDF de Realm, sin contenido. Si el examen los pide, usa la receta estándar mínima (`onCreateOptionsMenu` / `onOptionsItemSelected`, `registerForContextMenu` / `onCreateContextMenu` / `onContextItemSelected`) y avisa a la persona en la ronda 1.
- `ListView` y `GridView`: citados como versiones anteriores del RecyclerView. Usa RecyclerView.

## No entra (no lo uses)

Kotlin, Jetpack Compose, Fragments, ViewModel, LiveData, Room/SQLite directo, Retrofit/red, corrutinas/threads, Services, BroadcastReceiver, Navigation Component, ViewBinding/DataBinding, `startActivityForResult` / `ActivityResultLauncher`, permisos en tiempo de ejecución con pantalla de petición, relaciones Realm 1-n / n-m, migraciones de Realm, `DiffUtil`, `ConcatAdapter`, animaciones, Material componentes avanzados.

Si el enunciado pide algo de esta lista, se avisa en la ronda 1 y se propone la alternativa más cercana a lo dado.

## Erratas del temario que hay que conocer

- El PDF de Realm usa `Notes.class` y `noteId` en un sitio y `Note` / `noteID` en otro: la clase correcta del ejemplo es **`Note`**.
- El ejemplo de `getIdByTable` usa `results.max("id")` sobre `RealmResults`; en el proyecto real se usa `realm.where(Note.class).max("id")`, que devuelve `Number` (puede ser `null` si la tabla está vacía: comprobarlo).
- En `MyApplication` del proyecto real aparece `.allowWritesOnUiThread(true)`: hace falta para escribir desde la Activity sin hilo aparte. Mantenerlo.
