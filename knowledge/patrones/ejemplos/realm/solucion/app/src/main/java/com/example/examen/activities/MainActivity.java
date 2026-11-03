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
import com.example.examen.adapters.NoteAdapter;
import com.example.examen.model.Note;

import io.realm.Realm;
import io.realm.RealmChangeListener;
import io.realm.RealmResults;

public class MainActivity extends AppCompatActivity {

    private Realm realm;
    private RealmResults<Note> notes;
    private NoteAdapter adapter;
    private RecyclerView recNotes;
    private Button btnAdd;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        realm = Realm.getDefaultInstance();
        notes = realm.where(Note.class).findAll();

        recNotes = findViewById(R.id.recNotes);
        btnAdd = findViewById(R.id.btnAdd);

        adapter = new NoteAdapter(notes, new NoteAdapter.OnNoteListener() {
            @Override
            public void onItemClick(Note note) {
                showNoteDialog(note);
            }

            @Override
            public void onDeleteClick(Note note) {
                deleteNote(note);
            }
        });
        recNotes.setLayoutManager(new LinearLayoutManager(this));
        recNotes.setAdapter(adapter);

        notes.addChangeListener(new RealmChangeListener<RealmResults<Note>>() {
            @Override
            public void onChange(RealmResults<Note> results) {
                adapter.notifyDataSetChanged();
            }
        });

        btnAdd.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showNoteDialog(null);
            }
        });
    }

    // note == null: alta; note != null: edición
    private void showNoteDialog(Note note) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View viewInflated = LayoutInflater.from(this).inflate(R.layout.dialog_note, null);
        builder.setView(viewInflated);
        builder.setTitle(note == null ? "Añadir nota" : "Editar nota");
        EditText input = viewInflated.findViewById(R.id.etNote);
        if (note != null) input.setText(note.getDescription());

        builder.setPositiveButton("Guardar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String text = input.getText().toString().trim();
                if (text.isEmpty()) {
                    Toast.makeText(MainActivity.this, "La nota no puede estar vacía", Toast.LENGTH_SHORT).show();
                    return;
                }
                if (note == null) addNote(text); else updateNote(note, text);
            }
        });
        builder.setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) { dialog.cancel(); }
        });
        builder.create().show();
    }

    private void addNote(String text) {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                Number currentIdNum = realm.where(Note.class).max("id");
                int nextId = (currentIdNum == null) ? 1 : currentIdNum.intValue() + 1;
                Note newNote = new Note(text);
                newNote.setId(nextId);
                realm.copyToRealm(newNote);
            }
        });
    }

    private void updateNote(Note note, String text) {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                note.setDescription(text);
                realm.copyToRealmOrUpdate(note);
            }
        });
    }

    private void deleteNote(Note note) {
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                note.deleteFromRealm();
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (realm != null && !realm.isClosed()) realm.close();
    }
}
