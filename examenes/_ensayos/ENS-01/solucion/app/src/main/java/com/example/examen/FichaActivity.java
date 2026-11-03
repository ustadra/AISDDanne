package com.example.examen;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class FichaActivity extends AppCompatActivity {
    TextView tvNombre, tvPersonaje;
    Button btnContacto;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_ficha);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        tvNombre = findViewById(R.id.tvNombre);
        tvPersonaje = findViewById(R.id.tvPersonaje);
        btnContacto = findViewById(R.id.btnContacto);

        Intent intent = getIntent();
        String nombre = intent.getStringExtra("Nombre");
        int personaje = intent.getIntExtra("Personaje", 1);
        if (nombre != null) {
            tvNombre.setText("Hola, " + nombre);
        }
        tvPersonaje.setText("Personaje " + personaje);

        btnContacto.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(FichaActivity.this, ContactoActivity.class));
            }
        });
    }
}
