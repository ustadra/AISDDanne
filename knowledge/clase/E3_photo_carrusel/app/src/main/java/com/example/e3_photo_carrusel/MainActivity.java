package com.example.e3_photo_carrusel;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {
    private ImageView imageViewCarrusel;
    private Button btnLeft, btnRight;
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

        imageViewCarrusel = findViewById(R.id.imageViewCarrusel);
        btnLeft = findViewById(R.id.buttonLeft);
        btnRight = findViewById(R.id.buttonRight);
        listaImagenes = new ArrayList<>();

        listaImagenes.add(R.drawable.gnome_01);
        listaImagenes.add(R.drawable.frog_02);
        listaImagenes.add(R.drawable.fairy_03);
        listaImagenes.add(R.drawable.mermaid_04);
        listaImagenes.add(R.drawable.phoenix_05);

        updateImage();

        btnRight.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v){
                indiceImg +=1;

                if (indiceImg >= listaImagenes.size()){
                    indiceImg = 0;
                }
                    updateImage();
            }
        });

        btnLeft.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v){
                indiceImg -=1;

                if (indiceImg < 0){
                    indiceImg = listaImagenes.size() - 1;
                }
                updateImage();
            }
        });

    }
    private void updateImage(){

        imageViewCarrusel.setImageResource(listaImagenes.get(indiceImg));
    }
}