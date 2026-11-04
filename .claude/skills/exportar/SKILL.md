---
name: exportar
version: 1.0.1
description: Exporta un ejercicio ya hecho como proyecto de Android Studio completo y limpio (esqueleto de Gradle + solución, sin build ni cachés) a una carpeta fuera del repo, para abrirlo con File > Open y darle a Run. Compila antes de exportar (o avisa de que no pudo). Invocar con /exportar [EJ-NN] [ruta], o ante «exporta el ejercicio», «sácame el proyecto», «quiero abrirlo en Android Studio».
---

# /exportar — del ejercicio al proyecto abrible

Convierte `examenes/<examen>/EJ-NN/solucion/` (solo las piezas) en un proyecto de Android Studio completo. Lo hace `tools/compilar.sh --salida`, que monta esqueleto + solución, compila y, solo si da `BUILD SUCCESSFUL` (o con `--sin-compilar`, avisando de que no está compilado), deja la carpeta limpia (sin `build/`, `.gradle/`, `.idea/`, `gradle.log` ni `local.properties`).

## Pasos

1. **Qué ejercicio.** El que nombre la persona (`/exportar EJ-02`, o «el de Realm»). Si no dice cuál y hay varios, pregunta con `AskUserQuestion`; si solo hay uno en curso, ese. Localiza `examenes/<examen>/EJ-NN/` y lee su `SPEC.md`: el estado debería ser `aprobada` o `hecha`. Si no lo es, avisa («aún no lo ha dado por bueno el revisor») y exporta solo si la persona insiste.
   Si la ruta que da es relativa, es relativa a la raíz del repo.
2. **Esqueleto y paquete.** `realm` si el `SPEC.md` o la solución usan Realm (`realm-android`, `RealmObject`); si no, `base`. Paquete: `com.example.examen` salvo que el `SPEC.md` diga otro.
3. **Dónde.** La ruta que dé la persona. Si no da ninguna, la decide la skill con una ruta relativa a la raíz del repo: `../exportados/<examen>-EJ-NN` (una carpeta hermana del repo; nunca una ruta absoluta de este equipo). Si esa carpeta ya existe y no está vacía, **no la pises**: propón otra con sufijo (`-2`) o pregunta si se reemplaza. Reemplazar (`--reemplazar`) vacía la carpeta: solo con el OK de la persona y tras mirar qué hay.
4. **Exportar.** Desde la raíz del repo:
   ```
   sh tools/compilar.sh <base|realm> examenes/<examen>/EJ-NN/solucion [paquete] --salida "<ruta>"
   ```
   Busca solo el SDK y el JDK (`knowledge/compilar.md`). Con salida 1 (no compila) no queda nada en la ruta: cuenta el error tal cual. Con salida 3 («NO COMPILADO: no encuentro el SDK/JDK», lo normal en un equipo sin Android Studio configurado), dilo y ofrece exportar igualmente con `--sin-compilar`; si la persona acepta, la entrega dice «NO COMPILADO» en lugar de `BUILD SUCCESSFUL`.
5. **Entrega**, corta y en llano:
   - la ruta exacta y «ábrela con *File → Open* en Android Studio y espera al Gradle sync»;
   - el JDK que debe tener Android Studio para ese esqueleto (`base` JDK 25 del propio Android Studio; `realm` JDK 21), o el sync fallará con «Cannot find a Java installation»;
   - las **imágenes provisionales** que el script imprimió (PNG de 1 píxel con el nombre de un `drawable` que falta) y las que hay que añadir, del `LEEME.md` del ejercicio. Si no imprimió ninguna, «sin imágenes que añadir»;
   - el estado tal cual: «compila (`BUILD SUCCESSFUL`); no se ha ejecutado en un móvil» o «NO COMPILADO: <motivo>».

## Reglas

- No edites el código del ejercicio: si falla al compilar, vuelve al flujo de `/examen` (`constructor-android` y `revisor-android`).
- Nunca exportes dentro de `plantilla/` ni sobre una carpeta que no hayas mirado.
- El proyecto exportado es una copia: lo que se cambie allí no vuelve a `solucion/`.
- Tres intentos y paras.
