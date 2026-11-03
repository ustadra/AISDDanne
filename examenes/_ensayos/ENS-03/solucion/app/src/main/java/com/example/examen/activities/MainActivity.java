package com.example.examen.activities;

import android.content.DialogInterface;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.examen.R;
import com.example.examen.adapters.TareaAdapter;
import com.example.examen.model.Tarea;

import io.realm.Realm;
import io.realm.RealmChangeListener;
import io.realm.RealmResults;

public class MainActivity extends AppCompatActivity {

    private Realm realm;
    private RealmResults<Tarea> tareas;
    private TareaAdapter adapter;
    private RecyclerView recyclerTareas;
    private Button btnNueva;
    private Button btnBorrarTodas;
    private TextView tvContador;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        realm = Realm.getDefaultInstance();
        tareas = realm.where(Tarea.class).findAll();

        recyclerTareas = findViewById(R.id.recyclerTareas);
        btnNueva = findViewById(R.id.btnNueva);
        btnBorrarTodas = findViewById(R.id.btnBorrarTodas);
        tvContador = findViewById(R.id.tvContador);

        adapter = new TareaAdapter(tareas, new TareaAdapter.OnTareaListener() {
            @Override
            public void onItemClick(Tarea tarea) {
                alternarHecha(tarea);
            }

            @Override
            public void onDeleteClick(Tarea tarea) {
                borrarTarea(tarea);
            }
        });
        recyclerTareas.setLayoutManager(new LinearLayoutManager(this));
        recyclerTareas.setAdapter(adapter);

        tvContador.setText("Tareas: " + tareas.size());
        tareas.addChangeListener(new RealmChangeListener<RealmResults<Tarea>>() {
            @Override
            public void onChange(RealmResults<Tarea> results) {
                adapter.notifyDataSetChanged();
                tvContador.setText("Tareas: " + results.size());
            }
        });

        btnNueva.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mostrarDialogo();
            }
        });

        btnBorrarTodas.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                borrarTodas();
            }
        });
    }

    private void mostrarDialogo() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View viewInflated = LayoutInflater.from(this).inflate(R.layout.dialog_tarea, null);
        builder.setView(viewInflated);
        builder.setTitle("Nueva tarea");
        EditText input = viewInflated.findViewById(R.id.etTitulo);

        builder.setPositiveButton("Guardar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String titulo = input.getText().toString().trim();
                if (titulo.isEmpty()) {
                    Toast.makeText(MainActivity.this, "El título no puede estar vacío", Toast.LENGTH_SHORT).show();
                    return;
                }
                addTarea(titulo);
            }
        });
        builder.setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) { dialog.cancel(); }
        });
        builder.create().show();
    }

    private void addTarea(String titulo) {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                Number currentIdNum = realm.where(Tarea.class).max("id");
                int nextId = (currentIdNum == null) ? 1 : currentIdNum.intValue() + 1;
                Tarea nueva = new Tarea(titulo);
                nueva.setId(nextId);
                realm.copyToRealm(nueva);
            }
        });
    }

    private void alternarHecha(Tarea tarea) {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                tarea.setHecha(!tarea.isHecha());
            }
        });
    }

    private void borrarTarea(Tarea tarea) {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                tarea.deleteFromRealm();
            }
        });
    }

    private void borrarTodas() {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                tareas.deleteAllFromRealm();
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (realm != null && !realm.isClosed()) realm.close();
    }
}
