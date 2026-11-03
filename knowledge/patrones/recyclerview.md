# Recetas de RecyclerView

> Recetas: RecyclerView completo (E6 / E8), alternar lista / grid (E8) y Gradle para RecyclerView. Responden a los bloques «RecyclerView» y «Lista y cuadrícula a la vez» de `knowledge/temario.md`. Mapa completo: `knowledge/cobertura.md`.

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
