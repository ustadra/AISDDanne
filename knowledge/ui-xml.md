# De «lo quiero así» a XML

Traductor de lo que la persona dice a atributos reales. **Solo se usan atributos de esta tabla.** Si lo que pide no está, el constructor no lo inventa: lo busca en los ejercicios de `knowledge/clase/` o lo marca como «no comprobado» y se lo cuenta a la persona.

Todos son atributos de Android estándar (`android:` salvo los marcados `app:`). `dp` para tamaños y márgenes, `sp` para texto.

## Tamaño y posición

| Quiere… | Atributo |
|---|---|
| Que ocupe todo el ancho / alto | `android:layout_width="match_parent"` / `layout_height="match_parent"` |
| Que sea tan grande como su contenido | `wrap_content` |
| Tamaño fijo | `android:layout_width="120dp"` |
| Separación por fuera | `android:layout_margin="16dp"` (o `layout_marginTop`, `Bottom`, `Start`, `End`) |
| Separación por dentro | `android:padding="8dp"` |
| Que reparta el espacio sobrante (dos botones a partes iguales) | en `LinearLayout`: `layout_width="0dp"` + `android:layout_weight="1"` en cada uno |
| Centrar el contenido de un layout | en `LinearLayout`: `android:gravity="center"` |
| Centrar una vista dentro de su padre | en `LinearLayout`: `android:layout_gravity="center"` |

### En ConstraintLayout (cada vista necesita al menos una restricción horizontal y una vertical)

| Quiere… | Atributos `app:` |
|---|---|
| Centrar en la pantalla | `layout_constraintStart_toStartOf="parent"` `layout_constraintEnd_toEndOf="parent"` `layout_constraintTop_toTopOf="parent"` `layout_constraintBottom_toBottomOf="parent"` |
| Pegado arriba / abajo | `Top_toTopOf="parent"` / `Bottom_toBottomOf="parent"` |
| Debajo de otra vista | `layout_constraintTop_toBottomOf="@id/otra"` |
| A la derecha de otra | `layout_constraintStart_toEndOf="@id/otra"` |
| Alinear con otra | `layout_constraintBaseline_toBaselineOf="@id/otra"` |
| Ocupar todo el ancho disponible | `layout_width="0dp"` + `Start_toStartOf="parent"` + `End_toEndOf="parent"` |

Preferir `LinearLayout` cuando la pantalla es una columna o una fila simple: es más fácil de acertar. Usar `ConstraintLayout` si el enunciado lo pide o si hay vistas pegadas a bordes.

## Botón (`<Button>`)

| Quiere… | Atributo |
|---|---|
| Texto | `android:text="Aceptar"` (mejor en `strings.xml` si el enunciado lo exige) |
| Tamaño de letra | `android:textSize="18sp"` |
| Color de fondo | `app:backgroundTint="#274c77"` (en esta versión de tema, `backgroundTint` también se usa sin `app:` en los ejercicios; ambos aparecen en E8) |
| Color del texto | `android:textColor="#FFFFFF"` |
| Negrita | `android:textStyle="bold"` |
| Desactivado | `android:enabled="false"` |
| Esquinas redondeadas | **No está en el temario.** Decirlo; no inventar `cornerRadius` ni `shape`. |
| Icono en botón / botón de imagen | `<ImageButton>` con `app:srcCompat="@android:drawable/ic_menu_camera"` (como en E4) |

## Texto (`<TextView>`)

`android:text`, `android:textSize="24sp"`, `android:textColor="#E91E63"`, `android:textStyle="bold"`, `android:gravity="center"`.

## Campo de texto (`<EditText>`)

`android:hint="Escribe algo"`, `android:inputType="text"` | `"phone"` | `"textEmailAddress"` | `"number"`, `android:ems="10"` (ancho en letras).

## Imagen (`<ImageView>`)

`app:srcCompat="@drawable/nombre"` (en el XML) o `setImageResource(R.drawable.nombre)` (en Java). `android:scaleType="fitCenter"` (se ve entera) o `"centerCrop"` (rellena y recorta; solo para fondos).

## Fondo de pantalla o de un layout

`android:background="#F4D7D7"` o `android:background="@color/lightOrange"` (si el color está definido en `colors.xml` como `<color name="lightOrange">#...</color>`).

## RadioGroup

```xml
<RadioGroup android:id="@+id/radioGroup" android:layout_width="wrap_content" android:layout_height="wrap_content">
    <RadioButton android:id="@+id/rbUno" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="Uno" />
    <RadioButton android:id="@+id/rbDos" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="Dos" />
</RadioGroup>
```

## Cómo se pide en una frase (guía para interpretar a la persona)

- «Botón grande en el centro, azul» → `wrap_content` o ancho fijo, centrado, `backgroundTint` azul, `textSize` mayor.
- «Dos botones juntos abajo, uno al lado del otro y del mismo tamaño» → `LinearLayout` horizontal, cada botón `0dp` + `weight="1"`, restricción abajo.
- «Lista con foto a la izquierda y nombre a la derecha» → layout de ítem horizontal (ver `patrones/` y `cobertura.md`).
- «Que se vea como una cuadrícula de 2 columnas» → `GridLayoutManager(this, 2)` + ítem vertical.

Cuando la petición sea vaga («que quede bonito»), el constructor propone **una** opción concreta con los valores y deja que la persona la cambie; no rellena con adornos.

## Colores

Siempre en hexadecimal `#RRGGBB` (o `#AARRGGBB`). Nombres sueltos como `"blue"` no valen en XML; los de `@color/black` y `@color/white` sí existen en los ejercicios. Cualquier otro nombre, definirlo en `colors.xml`.
