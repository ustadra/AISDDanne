package com.example.examen.activities;

import android.content.DialogInterface;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
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

public class TareasActivity extends AppCompatActivity {

    private Realm realm;
    private RealmResults<Tarea> tareas;
    private TareaAdapter adapter;
    private RecyclerView rvTareas;
    private Button btnAnadir;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_tareas);

        realm = Realm.getDefaultInstance();
        tareas = realm.where(Tarea.class).findAll();

        rvTareas = findViewById(R.id.rvTareas);
        btnAnadir = findViewById(R.id.btnAnadir);

        adapter = new TareaAdapter(tareas, new TareaAdapter.OnTareaListener() {
            @Override
            public void onItemClick(Tarea tarea) {
                alternarHecha(tarea);
            }

            @Override
            public void onItemLongClick(Tarea tarea) {
                confirmarBorrado(tarea);
            }
        });
        rvTareas.setLayoutManager(new LinearLayoutManager(this));   // lista vertical
        rvTareas.setAdapter(adapter);

        // la lista se refresca sola cuando cambian los datos
        tareas.addChangeListener(new RealmChangeListener<RealmResults<Tarea>>() {
            @Override
            public void onChange(RealmResults<Tarea> results) {
                adapter.notifyDataSetChanged();
            }
        });

        btnAnadir.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mostrarDialogoAnadir();
            }
        });
    }

    private void mostrarDialogoAnadir() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View viewInflated = LayoutInflater.from(this).inflate(R.layout.dialog_tarea, null);
        builder.setView(viewInflated);
        builder.setTitle("Añadir tarea");
        EditText input = viewInflated.findViewById(R.id.etTitulo);

        builder.setPositiveButton("Guardar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String titulo = input.getText().toString().trim();
                if (titulo.isEmpty()) {
                    Toast.makeText(TareasActivity.this, "El título no puede estar vacío", Toast.LENGTH_SHORT).show();
                    return;
                }
                anadirTarea(titulo);
            }
        });
        builder.setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) { dialog.cancel(); }
        });
        builder.create().show();
    }

    private void anadirTarea(String titulo) {
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

    private void confirmarBorrado(Tarea tarea) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("¿Borrar tarea?");
        builder.setPositiveButton("Borrar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                borrarTarea(tarea);
            }
        });
        builder.setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) { dialog.cancel(); }
        });
        builder.create().show();
    }

    private void borrarTarea(Tarea tarea) {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                tarea.deleteFromRealm();
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (realm != null && !realm.isClosed()) realm.close();
    }
}
