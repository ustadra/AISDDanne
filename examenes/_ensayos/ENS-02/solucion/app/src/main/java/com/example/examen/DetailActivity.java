package com.example.examen;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class DetailActivity extends AppCompatActivity {

    TextView tvNombre;
    ImageView ivFoto;
    Button btnVolver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_detail);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        tvNombre = findViewById(R.id.tvNombre);
        ivFoto = findViewById(R.id.ivFoto);
        btnVolver = findViewById(R.id.btnVolver);

        String nombre = getIntent().getStringExtra("nombre");
        int imagen = getIntent().getIntExtra("imagen", 0);

        if (nombre != null) {
            tvNombre.setText(nombre);
        } else {
            tvNombre.setText("Sin nombre");
        }
        if (imagen != 0) {
            ivFoto.setImageResource(imagen);
        }

        btnVolver.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
    }
}
