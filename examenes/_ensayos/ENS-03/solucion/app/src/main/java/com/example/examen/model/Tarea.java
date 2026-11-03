package com.example.examen.model;

import java.util.Date;

import io.realm.RealmObject;
import io.realm.annotations.PrimaryKey;

public class Tarea extends RealmObject {
    @PrimaryKey
    private int id;
    private String titulo;
    private boolean hecha;
    private Date creadaEn;

    public Tarea() {}                             // obligatorio para Realm

    public Tarea(String titulo) {
        this.titulo = titulo;
        this.hecha = false;
        this.creadaEn = new Date();
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public boolean isHecha() { return hecha; }
    public void setHecha(boolean hecha) { this.hecha = hecha; }
    public Date getCreadaEn() { return creadaEn; }
    public void setCreadaEn(Date creadaEn) { this.creadaEn = creadaEn; }
}
