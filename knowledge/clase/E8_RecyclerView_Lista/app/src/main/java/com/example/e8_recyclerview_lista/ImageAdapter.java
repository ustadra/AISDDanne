package com.example.e8_recyclerview_lista;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class ImageAdapter extends RecyclerView.Adapter<ImageAdapter.ImageHolder>{

    private static final int VIEW_GRID = 1;
    private ArrayList<MyAnimal> animals;
    private OnItemClickListener onItemClickListener;
    private boolean isGridView = false;
    public ImageAdapter(ArrayList<MyAnimal> animals, OnItemClickListener onItemClickListener){
        this.animals = animals;
        this.onItemClickListener = onItemClickListener; //así conseguimos que sea reutilizable
    }
    public void setViewGrid(boolean isGrid){
        this.isGridView = isGrid;
        notifyDataSetChanged(); //obliga a que la pantalla se actualice y muestre los datos cambiaus
    }

    @NonNull
    @Override
    public ImageAdapter.ImageHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        int layout;
        if (viewType == VIEW_GRID){
            layout = R.layout.animal_grid;
        }else{
            layout = R.layout.animal_list;
        }

        //esto usará el layput que le hemos dado en el if
        View view = LayoutInflater.from(parent.getContext()).inflate(layout, parent, false);
        return new ImageHolder(view); //estoy hay que tener hecho en otro lado más abajo. Hasta wue no este, da fallo.
    }

    @Override
    public void onBindViewHolder(@NonNull ImageAdapter.ImageHolder holder, int position) {
        holder.assignData(animals.get(position));
    }

    @Override
    public int getItemCount() {
        return animals != null ? animals.size() : 0;
    }

    public class ImageHolder extends RecyclerView.ViewHolder {
        TextView textView;
        ImageView imageView;

        public ImageHolder(@NonNull View itemView) {
            super(itemView);
            textView = itemView.findViewById(R.id.textView);
            imageView = itemView.findViewById(R.id.imageView);
        }

        public void assignData(MyAnimal animal) {
            textView.setText(animal.getName());
            imageView.setImageResource(animal.getImageID());

            itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    onItemClickListener.OnItemClick(animal.getName());
                }
            }); //cuando hacemos clic sobre el conjunto de elementos que hayy en el item:view, se llama a esto.
            //ahora hay que decidir que te da cuando le das clic
        }
    }

    // HASTA QUE NO HAGS ESTO TE DARÁ FALLO ARRIBA!!!
    public interface OnItemClickListener{
        public void OnItemClick(String data);
    }
}
