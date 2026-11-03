# Receta de AlertDialog

> Receta: AlertDialog con formulario. Responde al bloque «AlertDialog» de `knowledge/temario.md`. Mapa completo: `knowledge/cobertura.md`.

## AlertDialog con formulario

```java
AlertDialog.Builder builder = new AlertDialog.Builder(this);
View viewInflated = LayoutInflater.from(this).inflate(R.layout.dialog_create_board, null);
builder.setView(viewInflated);
builder.setTitle("Título");
builder.setMessage("Mensaje");
EditText input = viewInflated.findViewById(R.id.editTextNewBoard);

builder.setPositiveButton("Aceptar", new DialogInterface.OnClickListener() {
    @Override
    public void onClick(DialogInterface dialog, int which) {
        String texto = input.getText().toString().trim();
        if (!texto.isEmpty()) { /* guardar */ }
    }
});
builder.setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
    @Override
    public void onClick(DialogInterface dialog, int which) { dialog.cancel(); }
});
AlertDialog dialog = builder.create();
dialog.show();
```
El título y el mensaje no van dentro del layout del diálogo.
