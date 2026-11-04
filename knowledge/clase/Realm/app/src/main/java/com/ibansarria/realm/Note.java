package com.ibansarria.realm;

import io.realm.RealmObject;
import io.realm.annotations.PrimaryKey;
import java.util.Date;

public class Note extends RealmObject {

    @PrimaryKey
    private int id;
    private String description;
    private Date createdAt;

    // Constructor vacío obligatorio para Realm
    public Note() {}

    public Note(String description) {
        this.description = description;
        this.createdAt = new Date();
    }

    // Getters y Setters obligatorios
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}