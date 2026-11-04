package com.example.examen;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity {
    EditText etTelefono, etWeb;
    Button btnLlamar, btnAbrirWeb, btnEnviar;

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

        etTelefono = findViewById(R.id.etTelefono);
        etWeb = findViewById(R.id.etWeb);
        btnLlamar = findViewById(R.id.btnLlamar);
        btnAbrirWeb = findViewById(R.id.btnAbrirWeb);
        btnEnviar = findViewById(R.id.btnEnviar);

        // Llamar: abre el marcador con el número (sin permisos)
        btnLlamar.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String numero = etTelefono.getText().toString().trim();
                if (numero.isEmpty()) {
                    Toast.makeText(MainActivity.this, "Rellena el campo", Toast.LENGTH_SHORT).show();
                    return;
                }
                Intent intent = new Intent(Intent.ACTION_DIAL);
                intent.setData(Uri.parse("tel:" + numero));
                startActivity(intent);
            }
        });

        // Abrir web: antepone http:// si falta el esquema
        btnAbrirWeb.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String web = etWeb.getText().toString().trim();
                if (web.isEmpty()) {
                    Toast.makeText(MainActivity.this, "Rellena el campo", Toast.LENGTH_SHORT).show();
                    return;
                }
                if (!web.startsWith("http://") && !web.startsWith("https://")) {
                    web = "http://" + web;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(web)));
            }
        });

        // Enviar datos: sin validar; DetalleActivity decide qué mostrar
        btnEnviar.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(MainActivity.this, DetalleActivity.class);
                intent.putExtra("telefono", etTelefono.getText().toString().trim());
                intent.putExtra("web", etWeb.getText().toString().trim());
                startActivity(intent);
            }
        });
    }
}
