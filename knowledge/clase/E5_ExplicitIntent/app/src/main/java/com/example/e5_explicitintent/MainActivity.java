package com.example.e5_explicitintent;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.RadioGroup;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity {

    private RadioGroup radioGroup;
    private ImageView imageView;
    private Button btnSecond, btnThird;
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

        radioGroup = findViewById(R.id.radioGroup);
        imageView = findViewById(R.id.imageView);
        btnSecond = findViewById(R.id.btnSA);
        btnThird = findViewById(R.id.btnTA);

        String personaje = getIntent().getStringExtra("PERSONAJE");

        if (personaje == null){
            radioGroup.check(R.id.rbPirata);
            imageView.setImageResource(R.drawable._019_pirate);
        }else{
            if ("pirata".equals(personaje)){
                radioGroup.check(R.id.rbPirata);
                imageView.setImageResource(R.drawable._019_pirate);
            }else if ("sirena".equals(personaje)){
                radioGroup.check(R.id.rbSirena);
                imageView.setImageResource(R.drawable._028_mermaid);
            } else if ("ballena".equals(personaje)) {
                radioGroup.check(R.id.rbBallena);
                imageView.setImageResource(R.drawable._039_narwhal);
            }
        }

        btnSecond.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(MainActivity.this, SecondActivity.class);
                intent.putExtra("PERSONAJE", OpcionSeleccionada());

                startActivity(intent);
            }
        });

        btnThird.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(MainActivity.this, ThirdActivity.class);
                intent.putExtra("PERSONAJE", OpcionSeleccionada());

                startActivity(intent);
            }
        });
    }

    private String OpcionSeleccionada(){
        int idSeleccionado = radioGroup.getCheckedRadioButtonId();

        if (idSeleccionado == R.id.rbPirata) {
            return "pirata";
        } else if (idSeleccionado == R.id.rbSirena) {
            return "sirena";
        } else if (idSeleccionado == R.id.rbBallena) {
            return "ballena";
        }
        return "";
    }
}