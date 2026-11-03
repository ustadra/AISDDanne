package com.example.examen;

import android.content.Intent;
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

    RecyclerView recyclerAnimales;
    ImageAdapter adapter;
    ArrayList<MyAnimal> animals;
    Button btnCambiarVista;
    boolean isGrid = false;

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

        recyclerAnimales = findViewById(R.id.recyclerAnimales);
        btnCambiarVista = findViewById(R.id.btnCambiarVista);

        animals = new ArrayList<>();
        animals.add(new MyAnimal("León", R.drawable.leon));
        animals.add(new MyAnimal("Jirafa", R.drawable.jirafa));
        animals.add(new MyAnimal("Elefante", R.drawable.elefante));
        animals.add(new MyAnimal("Cebra", R.drawable.cebra));
        animals.add(new MyAnimal("Mono", R.drawable.mono));

        adapter = new ImageAdapter(animals, new ImageAdapter.OnItemClickListener() {
            @Override
            public void OnItemClick(MyAnimal animal) {
                Toast.makeText(MainActivity.this, animal.getName(), Toast.LENGTH_SHORT).show();
                Intent intent = new Intent(MainActivity.this, DetailActivity.class);
                intent.putExtra("nombre", animal.getName());
                intent.putExtra("imagen", animal.getImageID());
                startActivity(intent);
            }
        });

        recyclerAnimales.setLayoutManager(new LinearLayoutManager(this));
        recyclerAnimales.setAdapter(adapter);

        btnCambiarVista.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                isGrid = !isGrid;
                adapter.setViewGrid(isGrid);
                if (isGrid) {
                    recyclerAnimales.setLayoutManager(new GridLayoutManager(MainActivity.this, 2));
                } else {
                    recyclerAnimales.setLayoutManager(new LinearLayoutManager(MainActivity.this));
                }
            }
        });
    }
}
