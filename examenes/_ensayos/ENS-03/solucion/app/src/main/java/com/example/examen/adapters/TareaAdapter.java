package com.example.examen.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.examen.R;
import com.example.examen.model.Tarea;

import io.realm.RealmResults;

public class TareaAdapter extends RecyclerView.Adapter<TareaAdapter.TareaHolder> {

    private RealmResults<Tarea> tareas;
    private OnTareaListener listener;

    public TareaAdapter(RealmResults<Tarea> tareas, OnTareaListener listener) {
        this.tareas = tareas;
        this.listener = listener;
    }

    @NonNull
    @Override
    public TareaHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.tarea_item, parent, false);
        return new TareaHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull TareaHolder holder, int position) {
        holder.assignData(tareas.get(position));
    }

    @Override
    public int getItemCount() {
        return tareas != null ? tareas.size() : 0;
    }

    public class TareaHolder extends RecyclerView.ViewHolder {
        TextView tvTitulo;
        Button btnBorrar;

        public TareaHolder(@NonNull View itemView) {
            super(itemView);
            tvTitulo = itemView.findViewById(R.id.tvTitulo);
            btnBorrar = itemView.findViewById(R.id.btnBorrar);
        }

        public void assignData(Tarea tarea) {
            String marca = tarea.isHecha() ? "[x] " : "[ ] ";
            tvTitulo.setText(marca + tarea.getTitulo());
            itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    listener.onItemClick(tarea);
                }
            });
            btnBorrar.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    listener.onDeleteClick(tarea);
                }
            });
        }
    }

    public interface OnTareaListener {
        void onItemClick(Tarea tarea);
        void onDeleteClick(Tarea tarea);
    }
}
