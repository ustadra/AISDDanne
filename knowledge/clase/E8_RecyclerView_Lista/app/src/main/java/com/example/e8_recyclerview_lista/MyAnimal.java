package com.example.e8_recyclerview_lista;

public class MyAnimal {

    private String name;
    private int imageID;

    public MyAnimal(String name, int imageID){
        this.imageID = imageID;
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public int getImageID() {
        return imageID;
    }
}
