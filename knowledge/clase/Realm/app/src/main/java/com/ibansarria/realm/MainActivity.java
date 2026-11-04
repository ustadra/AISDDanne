package com.ibansarria.realm;

import android.os.Bundle;
import android.util.Log;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import io.realm.Realm;
import io.realm.RealmResults;

public class MainActivity extends AppCompatActivity {

    private Realm realm;

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

        // Obtener instancia de Realm
        realm = Realm.getDefaultInstance();
        realm.executeTransaction(new Realm.Transaction() {
            @Override
            public void execute(Realm realm) {
                Number currentIdNum = realm.where(Note.class).max("id");
                int nextId = (currentIdNum == null) ? 1 : currentIdNum.intValue() + 1;

                Note note = new Note("Ejemplo de nota #" + nextId);
                note.setId(nextId);

                realm.copyToRealm(note);
            }
        });



        // Consulta de todos los elementos
        RealmResults<Note> notes = realm.where(Note.class).findAll();
        Log.d("RealmDemo", "Total notas guardadas: " + notes.size());
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Cerrar la instancia de Realm para evitar fugas de memoria
        if (realm != null && !realm.isClosed()) {
            realm.close();
        }
    }
}
