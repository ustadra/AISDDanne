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

public class SecondActivity extends AppCompatActivity {
    TextView textFirst, textOpcion;
    Button btnTercero;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_second);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        // Flecha atrás: la barra es null si el tema es NoActionBar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        textFirst = findViewById(R.id.textFirst);
        textOpcion = findViewById(R.id.textOpcion);
        btnTercero = findViewById(R.id.btnTercero);

        Intent intent = getIntent();
        String recibidoMA = intent.getStringExtra("TextoMA");
        String opcionMA = intent.getStringExtra("OpcionMA");
        if (recibidoMA != null) {
            textFirst.setText(recibidoMA);
        }
        if (opcionMA != null) {
            textOpcion.setText(opcionMA);
        }

        btnTercero.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(SecondActivity.this, ThirdActivity.class));
            }
        });
    }
}
