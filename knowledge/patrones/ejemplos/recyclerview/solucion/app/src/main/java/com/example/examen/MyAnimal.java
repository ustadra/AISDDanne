package com.example.examen;

public class MyAnimal {
    private String name;
    private int imageID;

    public MyAnimal(String name, int imageID) {
        this.name = name;
        this.imageID = imageID;
    }

    public String getName() { return name; }
    public int getImageID() { return imageID; }
}
