package com.example.examen;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioGroup;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity {
    EditText editTextMain;
    RadioGroup radioGroup;
    Button btnSecond;

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

        editTextMain = findViewById(R.id.editTextMain);
        radioGroup = findViewById(R.id.radioGroup);
        btnSecond = findViewById(R.id.btnSecond);
        radioGroup.check(R.id.rbUno);   // opción por defecto

        btnSecond.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String texto = editTextMain.getText().toString().trim();
                String opcion = "";
                int id = radioGroup.getCheckedRadioButtonId();
                if (id == R.id.rbUno) {
                    opcion = "Opción 1";
                } else if (id == R.id.rbDos) {
                    opcion = "Opción 2";
                } else if (id == R.id.rbTres) {
                    opcion = "Opción 3";
                }
                Intent intent = new Intent(MainActivity.this, SecondActivity.class);
                intent.putExtra("TextoMA", texto);
                intent.putExtra("OpcionMA", opcion);
                startActivity(intent);
            }
        });
    }
}
