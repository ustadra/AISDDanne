package com.example.e6_recyclereview;

import android.os.Bundle;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {

    RecyclerView recReview;
    ImageAdapter adapter;
    ArrayList<String> list;

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

        recReview = (RecyclerView) findViewById(R.id.recReview);

        list = new ArrayList<>();
        list.add("Sirena");
        list.add("Pirata");
        list.add("Ballena");


        adapter = new ImageAdapter(list, new ImageAdapter.OnItemClickListener() {
            @Override
            public void OnItemClick(String data) {
                Toast.makeText(MainActivity.this, data, Toast.LENGTH_LONG).show();
                //pasa del adaptador al mainActivity donde se quiere pintar. vinculo entre el constructor y el adaptador??
                //hacer una interfaz para pasar info entre dos elementos que no tienen porq estar relacionados.
                // SACAR LA LÓGICA DEL ADAPTADOR
            }
        });
        recReview.setAdapter(adapter);

        recReview.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.VERTICAL,false));    }


}