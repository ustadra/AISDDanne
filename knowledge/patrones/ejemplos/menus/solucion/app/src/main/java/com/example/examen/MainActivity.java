package com.example.examen;

import android.os.Bundle;
import android.view.ContextMenu;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity {
    TextView tvContexto;

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

        tvContexto = findViewById(R.id.tvContexto);
        registerForContextMenu(tvContexto);   // pulsación larga sobre el TextView
    }

    // ---- Option menu (los tres puntos de la barra) ----
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_main, menu);
        return true;   // true = mostrar el menú
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_ajustes) {
            Toast.makeText(this, "Ajustes", Toast.LENGTH_SHORT).show();
            return true;
        } else if (id == R.id.action_acerca) {
            Toast.makeText(this, "Acerca de", Toast.LENGTH_SHORT).show();
            return true;
        } else if (id == R.id.action_salir) {
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    // ---- Context menu (pulsación larga) ----
    @Override
    public void onCreateContextMenu(ContextMenu menu, View v, ContextMenu.ContextMenuInfo menuInfo) {
        super.onCreateContextMenu(menu, v, menuInfo);
        menu.setHeaderTitle("Elige una acción");
        getMenuInflater().inflate(R.menu.menu_context, menu);
    }

    @Override
    public boolean onContextItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.ctx_editar) {
            Toast.makeText(this, "Editar", Toast.LENGTH_SHORT).show();
            return true;
        } else if (id == R.id.ctx_borrar) {
            Toast.makeText(this, "Borrar", Toast.LENGTH_SHORT).show();
            return true;
        }
        return super.onContextItemSelected(item);
    }
}
