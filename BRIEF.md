# Brief · Examen DAM 2º — Android

> Brief ligero de adopción (modo brownfield de `/arranca`, vía `/objetivo`). Traza del origen del repo.

Fecha: 2026-11-03
Autor del brief: SOFT7, con apoyo de la sesión de `/objetivo`

## Problema real  *(obligatorio)*
Un alumno de 2º de DAM tiene que resolver en un examen varios ejercicios de Android (Java + XML) usando solo lo dado en clase. Una IA sin dirigir se sale del temario, inventa clases y atributos que no existen y entrega código que no compila, lo que el profesor detecta al instante.

## Objetivo / resultado esperado  *(obligatorio)*
Que cualquier ejercicio del temario (carrusel, Intents, RecyclerView en lista y cuadrícula, Realm, menús) se resuelva completo, **compilado** y ceñido a lo dado en clase, tras una o dos rondas de preguntas en lenguaje llano, y que se pueda retocar después con lenguaje natural («este botón así») sin que la IA invente.

## Tipo de entregable  *(obligatorio)*
Toolkit de agentes. Cada ejercicio produce una app Android (Java + XML) lista para pegar en Android Studio.

## Usuarios y validación  *(obligatorio)*
- Quién lo usa: el alumno, con perfil de «vibe coder» que quiere el control del resultado sin entrar en lo técnico.
- Quién valida que está bien: el propio alumno, abriendo el resultado en Android Studio; en último término, el profesor al corregir.

## Unidad de trabajo del dominio  *(obligatorio)*
**Ejercicio**: `examenes/<examen>/EJ-NN/` (por ejemplo `examenes/2026-t1/EJ-01/`).

## Alcance
- **Dentro**: Java y XML; los bloques de `knowledge/temario.md` (layouts y vistas básicas, carrusel, Intents explícitos e implícitos, RecyclerView, Realm, AlertDialog, menús básicos); revisión que compila con Gradle.
- **Fuera**: Kotlin, Compose, Fragments, ViewModel, Room, red, corrutinas, `startActivityForResult`, despliegue, nube, CI.

## Stack y entorno  *(si es técnico)*
Android con Java 11, AndroidX, RecyclerView y Realm 10.15.1. Gradle con los esqueletos de `plantilla/` (`base`: Gradle 9.5.0, AGP 9.3.3; `realm`: Gradle 8.12, AGP 8.9.1). JDK 25 de Android Studio y JDK 21 Temurin; SDK de Android Studio.

- **Integraciones de los agentes**: ninguna.
- **Otras herramientas de agentes del equipo**: solo Claude Code (los puentes de Antigravity, Gemini CLI y Codex se generan igualmente).

## Datos sensibles y cumplimiento
Ninguno.

## Knowledge del dominio a cargar
`knowledge/temario.md`, `knowledge/patrones/`, `knowledge/ui-xml.md`, `knowledge/compilar.md`.

- **Forma**: doctrina (normas razonadas que se leen enteras, en `.md`).

## Memoria persistente y contexto  *(obligatorio)*
**Ninguna**, por decisión de la persona: cada examen es un único uso y no tiene sentido guardar memoria entre sesiones. Se aparta de la compuerta habitual del kit (Tier 1 o Tier 2); queda anotado como D-01 en `features/REGISTRO.md`. Sin `memory/`, sin `policies/memory.md` y sin hooks de memoria.

## Definición de Done  *(obligatorio)*
Un ejercicio está terminado cuando: cada requisito del enunciado está en ✅ con fichero y línea; `revisor-android` da `APROBADO` con `BUILD SUCCESSFUL` (o consta «NO COMPILADO» con su motivo); no se usa nada fuera de temario ni «no verificado»; y el `LEEME.md` dice el orden de pegado y las imágenes necesarias.

## Plazo
- Declarado: sin plazo.
- Real vs percibido: la preparación se hace antes del examen; no hay fecha dura declarada.

## Riesgos preliminares
- Técnico: huecos en las recetas (menús, RecyclerView con clic a otra pantalla, Realm con RecyclerView) que fallarían en el examen; JDK distinto por esqueleto.
- Conocimiento de dominio: el temario tiene erratas (anotadas en `knowledge/temario.md`) y las diapositivas de menús solo traen el título.
- Dependencias externas: Gradle descarga librerías la primera vez; hace falta red en esa primera compilación.
- Disponibilidad de usuario/validador: el alumno decide en las rondas.
- Plazos: ninguno declarado.

## Decisión
Listo para `/arranca`
