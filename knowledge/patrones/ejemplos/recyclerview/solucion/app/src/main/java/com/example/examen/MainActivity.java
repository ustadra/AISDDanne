package com.example.examen;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

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

        recReview = findViewById(R.id.recReview);
        btnLista = findViewById(R.id.btnLista);
        btnGrid = findViewById(R.id.btnGrid);

        animals = new ArrayList<>();
        animals.add(new MyAnimal("Avestruz", R.drawable.avestruz));
        animals.add(new MyAnimal("Gorila", R.drawable.gorila));
        animals.add(new MyAnimal("Pinguino", R.drawable.pinguino));
        animals.add(new MyAnimal("Raton", R.drawable.raton));
        animals.add(new MyAnimal("Oso", R.drawable.oso));
        animals.add(new MyAnimal("Tortuga", R.drawable.tortuga));

        adapter = new ImageAdapter(animals, new ImageAdapter.OnItemClickListener() {
            @Override
            public void OnItemClick(MyAnimal animal) {
                Intent intent = new Intent(MainActivity.this, DetailActivity.class);
                intent.putExtra("nombre", animal.getName());
                intent.putExtra("imagen", animal.getImageID());
                startActivity(intent);
            }
        });

        recReview.setLayoutManager(new LinearLayoutManager(this));
        recReview.setAdapter(adapter);

        btnLista.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                adapter.setViewGrid(false);
                recReview.setLayoutManager(new LinearLayoutManager(MainActivity.this));
            }
        });

        btnGrid.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                adapter.setViewGrid(true);
                recReview.setLayoutManager(new GridLayoutManager(MainActivity.this, 2));
            }
        });
    }
}
