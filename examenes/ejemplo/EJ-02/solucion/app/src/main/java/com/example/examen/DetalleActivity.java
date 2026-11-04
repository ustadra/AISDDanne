package com.example.examen;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class DetalleActivity extends AppCompatActivity {
    TextView tvTelefono, tvWeb;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_detalle);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        // Flecha atrás: la barra es null si el tema es NoActionBar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        tvTelefono = findViewById(R.id.tvTelefono);
        tvWeb = findViewById(R.id.tvWeb);

        Intent intent = getIntent();
        String telefono = intent.getStringExtra("telefono");
        String web = intent.getStringExtra("web");

        // null o vacío -> "Sin datos"
        if (telefono == null || telefono.trim().isEmpty()) {
            tvTelefono.setText("Sin datos");
        } else {
            tvTelefono.setText(telefono);
        }
        if (web == null || web.trim().isEmpty()) {
            tvWeb.setText("Sin datos");
        } else {
            tvWeb.setText(web);
        }
    }
}
