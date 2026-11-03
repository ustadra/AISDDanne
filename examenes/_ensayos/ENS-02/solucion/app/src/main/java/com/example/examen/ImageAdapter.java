package com.example.examen;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class ImageAdapter extends RecyclerView.Adapter<ImageAdapter.ImageHolder> {

    private static final int VIEW_GRID = 1;

    private ArrayList<MyAnimal> animals;
    private OnItemClickListener onItemClickListener;
    private boolean isGridView = false;

    public ImageAdapter(ArrayList<MyAnimal> animals, OnItemClickListener onItemClickListener) {
        this.animals = animals;
        this.onItemClickListener = onItemClickListener;
    }

    public void setViewGrid(boolean isGrid) {
        this.isGridView = isGrid;
        notifyDataSetChanged();
    }

    @Override
    public int getItemViewType(int position) {
        return isGridView ? VIEW_GRID : 0;
    }

    @NonNull
    @Override
    public ImageHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        int layout = (viewType == VIEW_GRID) ? R.layout.animal_grid : R.layout.animal_list;
        View view = LayoutInflater.from(parent.getContext()).inflate(layout, parent, false);
        return new ImageHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ImageHolder holder, int position) {
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
                    onItemClickListener.OnItemClick(animal);
                }
            });
        }
    }

    public interface OnItemClickListener {
        void OnItemClick(MyAnimal animal);
    }
}
