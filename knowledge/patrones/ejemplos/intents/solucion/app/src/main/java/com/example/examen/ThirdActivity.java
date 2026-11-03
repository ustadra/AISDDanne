package com.example.examen;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class ThirdActivity extends AppCompatActivity {
    Button btnCallMe, btnEmail, btnWeb, btnElegir;
    EditText editTextPhone, editTextEmail;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_third);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        btnCallMe = findViewById(R.id.btnCallMe);
        btnEmail = findViewById(R.id.btnEmail);
        btnWeb = findViewById(R.id.btnWeb);
        btnElegir = findViewById(R.id.btnElegir);
        editTextPhone = findViewById(R.id.editTextPhone);
        editTextEmail = findViewById(R.id.editTextEmail);

        btnCallMe.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String numero = editTextPhone.getText().toString().trim();
                if (!numero.isEmpty()) {
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse("tel:" + numero));
                    startActivity(intent);
                }
            }
        });

        btnEmail.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String correo = editTextEmail.getText().toString().trim();
                if (!correo.isEmpty()) {
                    Intent intent = new Intent(Intent.ACTION_SENDTO);
                    intent.setData(Uri.parse("mailto:" + correo));
                    startActivity(intent);
                }
            }
        });

        btnWeb.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("http://google.es")));
            }
        });

        btnElegir.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("http://google.es"));
                startActivity(Intent.createChooser(intent, "Elige entre las siguientes aplicaciones"));
            }
        });
    }
}
