# Recetas de código (estilo de clase)

Copia el estilo de estos fragmentos, sacados de los ejercicios reales. Ajusta nombres e ids al enunciado.

## Activity base (lo genera Android Studio)

```java
public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
        // findViewById y listeners aquí
    }
}
```

## Carrusel (E3)

```java
private void updateImage() {
    imageViewCarrusel.setImageResource(listaImagenes.get(indiceImg));
}
btnRight.setOnClickListener(new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        indiceImg += 1;
        if (indiceImg >= listaImagenes.size()) indiceImg = 0;
        updateImage();
    }
});
btnLeft.setOnClickListener(new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        indiceImg -= 1;
        if (indiceImg < 0) indiceImg = listaImagenes.size() - 1;
        updateImage();
    }
});
```

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

## RadioGroup (E5)

```java
int id = radioGroup.getCheckedRadioButtonId();
if (id == R.id.rbPirata) { ... } else if (id == R.id.rbSirena) { ... }
radioGroup.check(R.id.rbPirata);   // marcar uno por código
```

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

## RecyclerView completo (E6 / E8)

**activity_main.xml**
```xml
<androidx.recyclerview.widget.RecyclerView
    android:id="@+id/recReview"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

**Modelo**
```java
public class MyAnimal {
    private String name;
    private int imageID;
    public MyAnimal(String name, int imageID) { this.name = name; this.imageID = imageID; }
    public String getName() { return name; }
    public int getImageID() { return imageID; }
}
```

**Layout del ítem (lista)**
```xml
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:orientation="horizontal"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_margin="16dp">
    <ImageView android:id="@+id/imageView" android:layout_width="100dp" android:layout_height="100dp" />
    <TextView android:id="@+id/textView" android:layout_gravity="center"
        android:layout_marginStart="20dp" android:layout_width="0dp" android:layout_weight="1"
        android:layout_height="wrap_content" android:textSize="30sp" />
</LinearLayout>
```
Grid: raíz `vertical`, `gravity="center"`, imagen `match_parent` × `120dp` con `scaleType="fitCenter"`, texto debajo.

**Adaptador**
```java
public class ImageAdapter extends RecyclerView.Adapter<ImageAdapter.ImageHolder> {

    private ArrayList<MyAnimal> animals;
    private OnItemClickListener onItemClickListener;

    public ImageAdapter(ArrayList<MyAnimal> animals, OnItemClickListener onItemClickListener) {
        this.animals = animals;
        this.onItemClickListener = onItemClickListener;
    }

    @NonNull
    @Override
    public ImageHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.animal_list, parent, false);
        return new ImageHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ImageHolder holder, int position) {
        holder.assignData(animals.get(position));
    }

    @Override
    public int getItemCount() {
        return animals != null ? animals.size() : 0;
    }

    public class ImageHolder extends RecyclerView.ViewHolder {
        TextView textView;
        ImageView imageView;

        public ImageHolder(@NonNull View itemView) {
            super(itemView);
            textView = itemView.findViewById(R.id.textView);
            imageView = itemView.findViewById(R.id.imageView);
        }

        public void assignData(MyAnimal animal) {
            textView.setText(animal.getName());
            imageView.setImageResource(animal.getImageID());
            itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    onItemClickListener.OnItemClick(animal);
                }
            });
        }
    }

    public interface OnItemClickListener {
        void OnItemClick(MyAnimal animal);
    }
}
```

**Activity**
```java
recReview = findViewById(R.id.recReview);
adapter = new ImageAdapter(animals, new ImageAdapter.OnItemClickListener() {
    @Override
    public void OnItemClick(MyAnimal animal) {
        Toast.makeText(MainActivity.this, animal.getName(), Toast.LENGTH_LONG).show();
    }
});
recReview.setLayoutManager(new LinearLayoutManager(this));          // lista vertical
recReview.setAdapter(adapter);
// horizontal: new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
// grid:       new GridLayoutManager(this, 2)
```

**Alternar lista / grid (E8)** — en el adaptador:
```java
private static final int VIEW_GRID = 1;
private boolean isGridView = false;

public void setViewGrid(boolean isGrid) {
    this.isGridView = isGrid;
    notifyDataSetChanged();
}
@Override
public int getItemViewType(int position) {
    return isGridView ? VIEW_GRID : 0;
}
// en onCreateViewHolder:
int layout = (viewType == VIEW_GRID) ? R.layout.animal_grid : R.layout.animal_list;
```
En la Activity, cada botón: `adapter.setViewGrid(true/false);` y `recReview.setLayoutManager(...)`. **No** hay que volver a hacer `setAdapter`.

## Gradle para RecyclerView

`gradle/libs.versions.toml`:
```toml
[versions]
recyclerview = "1.4.0"
[libraries]
recyclerview = { group = "androidx.recyclerview", name = "recyclerview", version.ref = "recyclerview" }
```
`app/build.gradle.kts` → `implementation(libs.recyclerview)`.

## Realm completo

**Gradle del proyecto (`build.gradle.kts` raíz)**
```kotlin
buildscript {
    repositories { mavenCentral() }
    dependencies {
        classpath("com.android.tools.build:gradle:8.9.1")
        classpath("io.realm:realm-gradle-plugin:10.15.1")
    }
}
plugins { alias(libs.plugins.android.application) apply false }
```
**`app/build.gradle.kts`**: en `plugins { alias(libs.plugins.android.application); id("realm-android") }`; `compileSdk = 36`, `targetSdk = 34`, `minSdk = 24`; `buildTypes.release { isMinifyEnabled = false; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") }`.
**`gradle.properties`**: `android.useAndroidX=true`. **`gradle-wrapper.properties`**: `gradle-8.12-bin.zip`. **`libs.versions.toml`**: `agp = "8.9.1"`.

**Modelo**
```java
public class Note extends RealmObject {
    @PrimaryKey
    private int id;
    private String description;
    private Date createdAt;

    public Note() {}                              // obligatorio para Realm
    public Note(String description) {
        this.description = description;
        this.createdAt = new Date();
    }
    // getters y setters
}
```

**MyApplication** (y `android:name=".MyApplication"` en `<application>` del Manifest)
```java
public class MyApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        setUpRealmConfig();
    }
    private void setUpRealmConfig() {
        Realm.init(getApplicationContext());
        RealmConfiguration config = new RealmConfiguration.Builder()
                .allowWritesOnUiThread(true)
                .deleteRealmIfMigrationNeeded()
                .build();
        Realm.setDefaultConfiguration(config);
    }
}
```

**Activity: insertar, consultar, borrar**
```java
realm = Realm.getDefaultInstance();

// insertar con id siguiente
realm.executeTransaction(new Realm.Transaction() {
    @Override
    public void execute(Realm realm) {
        Number currentIdNum = realm.where(Note.class).max("id");
        int nextId = (currentIdNum == null) ? 1 : currentIdNum.intValue() + 1;
        Note note = new Note("Texto");
        note.setId(nextId);
        realm.copyToRealm(note);
    }
});

// consultar
RealmResults<Note> notes = realm.where(Note.class).findAll();
Note una = realm.where(Note.class).equalTo("id", 3).findFirst();

// actualizar: modificar dentro de una transacción
realm.executeTransaction(new Realm.Transaction() {
    @Override
    public void execute(Realm realm) {
        una.setDescription("Nuevo texto");
        realm.copyToRealmOrUpdate(una);
    }
});

// borrar
realm.executeTransaction(new Realm.Transaction() {
    @Override
    public void execute(Realm realm) {
        una.deleteFromRealm();       // uno
        // notes.deleteAllFromRealm(); // todos
    }
});

// avisar al adaptador cuando cambian los datos
notes.addChangeListener(new RealmChangeListener<RealmResults<Note>>() {
    @Override
    public void onChange(RealmResults<Note> results) {
        adapter.notifyDataSetChanged();
    }
});

@Override
protected void onDestroy() {
    super.onDestroy();
    if (realm != null && !realm.isClosed()) realm.close();
}
```
Comprueba `una != null` antes de usarla (`findFirst()` devuelve `null` si no existe).

## AlertDialog con formulario

```java
AlertDialog.Builder builder = new AlertDialog.Builder(this);
View viewInflated = LayoutInflater.from(this).inflate(R.layout.dialog_create_board, null);
builder.setView(viewInflated);
builder.setTitle("Título");
builder.setMessage("Mensaje");
EditText input = viewInflated.findViewById(R.id.editTextNewBoard);

builder.setPositiveButton("Aceptar", new DialogInterface.OnClickListener() {
    @Override
    public void onClick(DialogInterface dialog, int which) {
        String texto = input.getText().toString().trim();
        if (!texto.isEmpty()) { /* guardar */ }
    }
});
builder.setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
    @Override
    public void onClick(DialogInterface dialog, int which) { dialog.cancel(); }
});
AlertDialog dialog = builder.create();
dialog.show();
```
El título y el mensaje no van dentro del layout del diálogo.
