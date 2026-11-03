# Receta de Realm

> Receta: Realm completo (Gradle, Modelo, MyApplication y Activity con insertar, consultar, actualizar, borrar y listener). Responde al bloque «Realm» de `knowledge/temario.md`. Mapa completo: `knowledge/cobertura.md`.

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
