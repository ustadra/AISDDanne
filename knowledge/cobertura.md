# Cobertura: qué ejercicio cae y qué receta lo resuelve

> Una fila por bloque de la sección «Entra» de `knowledge/temario.md`. Las recetas viven en `knowledge/patrones/`; los ejemplos compilables, en `knowledge/patrones/ejemplos/<tema>/solucion/`. Estados: `receta escrita · ejemplo compilado (F-0N)` (pasó `tools/compilar.sh` y la revisión de `qa`) · `hueco` · `sin receta`. «Compilado» no es «probado en un móvil».

| Bloque del temario | Tipo de ejercicio que puede caer | Receta (fichero y sección) | Ejemplo compilable (ruta) | Estado |
|---|---|---|---|---|
| Interfaz | Pantalla con layouts, `EditText`, botones, `ImageView`, `RadioGroup` y `Toast`; Activity con insets de Android Studio | `patrones/basico.md`: «Activity base», «RadioGroup (E5)». Atributos XML: `knowledge/ui-xml.md` | `knowledge/patrones/ejemplos/intents/solucion/` (F-02) lo usa de base | receta escrita · ejemplo compilado (F-02) |
| Carrusel | Imágenes con botones izquierda/derecha que dan la vuelta al llegar al final | `patrones/basico.md`: «Carrusel (E3)» | `knowledge/patrones/ejemplos/carrusel/solucion/` (F-05) | receta escrita · ejemplo compilado (F-05) |
| Intents explícitos | Pasar un dato de una Activity a otra, con flecha atrás y Activity en el Manifest | `patrones/intents.md`: «Intent explícito con dato (E4, E5)» | `knowledge/patrones/ejemplos/intents/solucion/` (F-02) | receta escrita · ejemplo compilado (F-02) |
| Intents implícitos | Marcar un teléfono, enviar correo, abrir web o cámara, elegir app (`createChooser`) | `patrones/intents.md`: «Intents implícitos (E4)» | `knowledge/patrones/ejemplos/intents/solucion/` (F-02) | receta escrita · ejemplo compilado (F-02) |
| RecyclerView | Lista de ítems con foto y texto y clic en cada ítem | `patrones/recyclerview.md`: «RecyclerView completo (E6 / E8)», «Gradle para RecyclerView» | `knowledge/patrones/ejemplos/recyclerview/solucion/` (F-03) | receta escrita · ejemplo compilado (F-03) |
| Lista y cuadrícula | Alternar entre lista y cuadrícula con dos botones | `patrones/recyclerview.md`: «Alternar lista / grid (E8)» | `knowledge/patrones/ejemplos/recyclerview/solucion/` (F-03) | receta escrita · ejemplo compilado (F-03) |
| Realm: modelo, Application y Gradle | Guardar datos en base de datos local con un modelo `RealmObject` | `patrones/realm.md`: «Realm completo» (Gradle, Modelo, MyApplication) | `knowledge/patrones/ejemplos/realm/solucion/` (F-04) | receta escrita · ejemplo compilado (F-04) |
| Realm: transacciones y consultas | Alta y edición de registros con id siguiente; buscar por id o listar todos | `patrones/realm.md`: «Realm completo» (Activity: insertar, consultar, actualizar) | `knowledge/patrones/ejemplos/realm/solucion/` (F-04) | receta escrita · ejemplo compilado (F-04) |
| Realm: borrado | Borrar un registro o todos | `patrones/realm.md`: «Realm completo» (Activity: borrar) | `knowledge/patrones/ejemplos/realm/solucion/` (F-04) | receta escrita · ejemplo compilado (F-04) |
| Realm: listener | Refrescar el RecyclerView cuando cambian los datos | `patrones/realm.md`: «Realm completo» (`addChangeListener`) | `knowledge/patrones/ejemplos/realm/solucion/` (F-04) | receta escrita · ejemplo compilado (F-04) |
| AlertDialog | Diálogo con formulario para crear o editar un registro, botones Aceptar/Cancelar | `patrones/dialogos.md`: «AlertDialog con formulario» | `knowledge/patrones/ejemplos/realm/solucion/` (F-04) lo usa para el alta | receta escrita · ejemplo compilado (F-04) |
| Option menu | Menú en la barra superior con opciones | `patrones/menus.md` (el temario solo trae el título; receta estándar mínima) | `knowledge/patrones/ejemplos/menus/solucion/` (F-06) | receta estándar (no dada en clase) · ejemplo compilado (F-06) |
| Context menu | Menú contextual al mantener pulsado un ítem | `patrones/menus.md` (el temario solo trae el título; receta estándar mínima) | `knowledge/patrones/ejemplos/menus/solucion/` (F-06) | receta estándar (no dada en clase) · ejemplo compilado (F-06) |

Ningún bloque queda en `sin receta` ni en `hueco`. Ojo con los menús: el temario solo trae el título, la receta es la estándar mínima de Android. La Activity base no tiene ejemplo propio: la llevan todos los demás.

## Combinaciones que suelen caer

- **RecyclerView + clic + Intent:** `recyclerview.md` («RecyclerView completo», con `OnItemClickListener`) + `intents.md` («Intent explícito con dato»): el clic del ítem abre otra Activity con `putExtra` y el destino comprueba el `null`.
- **Realm + RecyclerView + AlertDialog:** `realm.md` (modelo, transacciones y listener) + `recyclerview.md` (adaptador) + `dialogos.md` (formulario de alta): el diálogo inserta y el listener refresca la lista.
- **Intents + RadioGroup:** `intents.md` + `basico.md` («RadioGroup»): el botón lee el `RadioButton` marcado y lo manda como extra a la segunda Activity.
- **Carrusel + Intent:** `basico.md` («Carrusel») + `intents.md`: se manda a la segunda Activity el índice o el nombre de la imagen visible.
- **RecyclerView lista/cuadrícula + Realm:** `recyclerview.md` («Alternar lista / grid») + `realm.md`: los ítems salen de un `RealmResults` y el cambio de vista no vuelve a hacer `setAdapter`.

## Ensayos de punta a punta

Tres ejercicios inventados resueltos con el formato real (`SPEC.md`, `solucion/`, `LEEME.md`) que compilan y pasaron `qa`: `examenes/_ensayos/ENS-01` (Intents y carrusel), `ENS-02` (RecyclerView lista/cuadrícula con clic) y `ENS-03` (Realm con RecyclerView y AlertDialog). Son la prueba del flujo de `/examen`, no ejercicios de examen reales.
