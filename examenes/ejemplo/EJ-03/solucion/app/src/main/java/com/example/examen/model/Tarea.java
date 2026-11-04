package com.example.examen.model;

import io.realm.RealmObject;
import io.realm.annotations.PrimaryKey;
import io.realm.annotations.Required;

public class Tarea extends RealmObject {
    @PrimaryKey
    private int id;
    @Required
    private String titulo;
    private boolean hecha;

    public Tarea() {}                             // obligatorio para Realm

    public Tarea(String titulo) {
        this.titulo = titulo;
        this.hecha = false;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public boolean isHecha() { return hecha; }
    public void setHecha(boolean hecha) { this.hecha = hecha; }
}
