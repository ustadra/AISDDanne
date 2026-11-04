package com.example.e5_explicitintent;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.RadioGroup;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class SecondActivity extends AppCompatActivity {

    private RadioGroup radioGroup;
    private ImageView imageView;
    private Button btnMain, btnThird;

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

        radioGroup = findViewById(R.id.radioGroup);
        imageView = findViewById(R.id.imageView);
        btnMain = findViewById(R.id.btnMA);
        btnThird = findViewById(R.id.btnTA);

        String personaje = getIntent().getStringExtra("PERSONAJE");
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

        btnMain.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(SecondActivity.this, MainActivity.class);
                int idMarcado = radioGroup.getCheckedRadioButtonId();

                if (idMarcado == R.id.rbSirena) intent.putExtra("PERSONAJE", "sirena");
                if (idMarcado == R.id.rbPirata) intent.putExtra("PERSONAJE", "pirata");
                if (idMarcado == R.id.rbBallena) intent.putExtra("PERSONAJE", "ballena");

                startActivity(intent);
            }
        });

        btnThird.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(SecondActivity.this, ThirdActivity.class);
                int idMarcado = radioGroup.getCheckedRadioButtonId();

                if (idMarcado == R.id.rbSirena) intent.putExtra("PERSONAJE", "sirena");
                if (idMarcado == R.id.rbPirata) intent.putExtra("PERSONAJE", "pirata");
                if (idMarcado == R.id.rbBallena) intent.putExtra("PERSONAJE", "ballena");

                startActivity(intent);
            }
        });
    }


}