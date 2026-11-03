# Recetas básicas: Activity base, Carrusel y RadioGroup

> Recetas: Activity base, Carrusel (E3), RadioGroup (E5). Responden a los bloques «Interfaz» y «Carrusel» de `knowledge/temario.md`. Mapa completo: `knowledge/cobertura.md`.

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

## RadioGroup (E5)

```java
int id = radioGroup.getCheckedRadioButtonId();
if (id == R.id.rbPirata) { ... } else if (id == R.id.rbSirena) { ... }
radioGroup.check(R.id.rbPirata);   // marcar uno por código
```
