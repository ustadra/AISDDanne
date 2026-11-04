package com.example.e8_recyclerview_lista;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {

    RecyclerView recReview;
    ImageAdapter adapter;

    ArrayList<MyAnimal> animals;
    Button btnLista;
    Button btnGrid;


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

        recReview = findViewById(R.id.recyclerView);
        btnLista = findViewById(R.id.btnList);
        btnGrid = findViewById(R.id.btnGrid);

        animals = new ArrayList<>();
        animals.add(new MyAnimal("avestruz", R.drawable.avestruz));
        animals.add(new MyAnimal("gorila", R.drawable.gorila));
        animals.add(new MyAnimal("pinguino", R.drawable.pinguino));
        animals.add(new MyAnimal("raton", R.drawable.raton));
        animals.add(new MyAnimal("oso", R.drawable.soportar));
        animals.add(new MyAnimal("tortuga", R.drawable.tortuga_marina));

        adapter = new ImageAdapter(animals, new ImageAdapter.OnItemClickListener() {
            @Override
            public void OnItemClick(String data) {
                Toast.makeText(MainActivity.this, data, Toast.LENGTH_LONG).show();
            }
        });

        //para que por defecto tenga el formato de lista
        recReview.setLayoutManager(new LinearLayoutManager(this));
        // Si esta puesto aqui arriba el adapter, luego no hay que ponerlo dentro de cada boton
        recReview.setAdapter(adapter);


        btnLista.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                adapter.setViewGrid(false); //para que sepa que es una lista y no el grid
               // recReview.setAdapter(adapter); NO HAY QUE PONERLO
                recReview.setLayoutManager(new LinearLayoutManager(MainActivity.this, LinearLayoutManager.VERTICAL, false));
            }
        });

        btnGrid.setOnClickListener(new View.OnClickListener(){
            @Override
            public void onClick(View v) {
                adapter.setViewGrid(true);
                //recReview.setAdapter(adapter); NO HAY QUE PONERLO
                recReview.setLayoutManager(new GridLayoutManager(MainActivity.this, 2));
            }
        });
    }
}