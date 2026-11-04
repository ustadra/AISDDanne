package com.example.examen;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {
    private ImageView ivMascota;
    private ImageButton btnAnterior, btnSiguiente;
    private TextView tvNombre;
    private ArrayList<Integer> listaImagenes;
    private ArrayList<String> listaNombres;
    private int indiceImg = 0;

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

        ivMascota = findViewById(R.id.ivMascota);
        btnAnterior = findViewById(R.id.btnAnterior);
        btnSiguiente = findViewById(R.id.btnSiguiente);
        tvNombre = findViewById(R.id.tvNombre);

        // Imágenes y nombres en el mismo orden (misma posición = misma mascota)
        listaImagenes = new ArrayList<>();
        listaImagenes.add(android.R.drawable.ic_menu_camera);
        listaImagenes.add(android.R.drawable.ic_menu_gallery);
        listaImagenes.add(android.R.drawable.ic_menu_compass);
        listaImagenes.add(android.R.drawable.ic_menu_help);

        listaNombres = new ArrayList<>();
        listaNombres.add("Perro");
        listaNombres.add("Gato");
        listaNombres.add("Conejo");
        listaNombres.add("Pájaro");

        updateImage();

        btnSiguiente.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                indiceImg += 1;
                if (indiceImg >= listaImagenes.size()) {
                    indiceImg = 0; // tras la última, la primera
                }
                updateImage();
            }
        });

        btnAnterior.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                indiceImg -= 1;
                if (indiceImg < 0) {
                    indiceImg = listaImagenes.size() - 1; // antes de la primera, la última
                }
                updateImage();
            }
        });
    }

    // Pone la imagen y el nombre de la mascota actual
    private void updateImage() {
        ivMascota.setImageResource(listaImagenes.get(indiceImg));
        tvNombre.setText(listaNombres.get(indiceImg));
    }
}
