package com.example.examen;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {
    private ImageView ivPersonaje;
    private Button btnAnterior, btnSiguiente, btnFicha;
    private EditText etNombre;
    private ArrayList<Integer> listaImagenes;
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

        ivPersonaje = findViewById(R.id.ivPersonaje);
        btnAnterior = findViewById(R.id.btnAnterior);
        btnSiguiente = findViewById(R.id.btnSiguiente);
        btnFicha = findViewById(R.id.btnFicha);
        etNombre = findViewById(R.id.etNombre);
        listaImagenes = new ArrayList<>();

        listaImagenes.add(R.drawable.personaje_1);
        listaImagenes.add(R.drawable.personaje_2);
        listaImagenes.add(R.drawable.personaje_3);
        listaImagenes.add(R.drawable.personaje_4);

        updateImage();

        btnSiguiente.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                indiceImg += 1;
                if (indiceImg >= listaImagenes.size()) {
                    indiceImg = 0;
                }
                updateImage();
            }
        });

        btnAnterior.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                indiceImg -= 1;
                if (indiceImg < 0) {
                    indiceImg = listaImagenes.size() - 1;
                }
                updateImage();
            }
        });

        btnFicha.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String nombre = etNombre.getText().toString().trim();
                if (nombre.isEmpty()) {
                    Toast.makeText(MainActivity.this, "Escribe tu nombre", Toast.LENGTH_SHORT).show();
                } else {
                    Intent intent = new Intent(MainActivity.this, FichaActivity.class);
                    intent.putExtra("Nombre", nombre);
                    intent.putExtra("Personaje", indiceImg + 1);
                    startActivity(intent);
                }
            }
        });
    }

    private void updateImage() {
        ivPersonaje.setImageResource(listaImagenes.get(indiceImg));
    }
}
