package com.example.e6_recyclereview;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class ImageAdapter extends RecyclerView.Adapter<ImageAdapter.ImageHolder>{

    private ArrayList<String> list;
    private OnItemClickListener onItemClickListener;
    public ImageAdapter(ArrayList<String> list, OnItemClickListener onItemClickListener){
        this.list = list;
        this.onItemClickListener = onItemClickListener; //así conseguimos que sea reutilizable
    }
    @NonNull
    @Override
    public ImageAdapter.ImageHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_view, parent, false);
        return new ImageHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ImageAdapter.ImageHolder holder, int position) {
        holder.assignData(list.get(position));
    }

    @Override
    public int getItemCount() {
        return list != null ? list.size() : 0;
    }

    public class ImageHolder extends RecyclerView.ViewHolder {
        TextView textView;
        public ImageHolder(@NonNull View itemView) {
            super(itemView);
            textView = itemView.findViewById(R.id.textView);
        }

        public void assignData(String s) {
            textView.setText(s);
            itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    onItemClickListener.OnItemClick(s);
                }
            }); //cuando hacemos clic sobre el conjunto de elementos que hayy en el item:view, se llama a esto.
            //ahora hay que decidir que te da cuando le das clic
        }
    }

    public interface OnItemClickListener{
        public void OnItemClick(String data);
    }
}
