# EJ-02 · Contacto rápido (examen ejemplo)

Estado: `aprobada`
Veredicto QA: APROBADA · commit árbol de trabajo (base dcdd026) · 2026-11-04

## Agentes y ficheros

| Agente | Escribe en (exclusivo) |
|---|---|
| constructor-android | `examenes/ejemplo/EJ-02/solucion/`, `examenes/ejemplo/EJ-02/LEEME.md` |

## Enunciado

`MainActivity` tiene un `EditText` (`etTelefono`, de tipo teléfono), un `EditText` (`etWeb`) y tres botones: **Llamar**, **Abrir web** y **Enviar datos**.

## Requisitos (numerados)

- R1 · **Llamar** abre el marcador con el número escrito (`ACTION_DIAL`).
- R2 · **Abrir web** abre el navegador con la dirección de `etWeb`.
- R3 · Si el campo correspondiente está vacío, `Toast` «Rellena el campo» y no se lanza el intent.
- R4 · **Enviar datos** abre `DetalleActivity` y le pasa teléfono y web con `putExtra`.
- R5 · `DetalleActivity` muestra los dos datos en `TextView`; si algún dato llega `null`, pone «Sin datos».
- R6 · `DetalleActivity` tiene flecha de volver atrás (`parentActivityName` en el Manifest).
- R7 · Las dos Activities están registradas en el Manifest.

## Decisiones de las rondas

- D1 · Ids de botones no dados: `btnLlamar`, `btnAbrirWeb`, `btnEnviar`; en `DetalleActivity`: `tvTelefono`, `tvWeb`. Textos de botones: «Llamar», «Abrir web», «Enviar datos».
- D2 · «Abrir web»: si lo escrito no empieza por `http://` o `https://`, se le antepone `http://` antes de `Uri.parse`.
- D3 · «Enviar datos» con campos vacíos: se envía igualmente; en `DetalleActivity` un dato vacío o `null` se muestra como «Sin datos» (no hay Toast en este botón).
- D4 · La flecha atrás exige barra de título: tema con barra como en el ejemplo de `knowledge/patrones/ejemplos/intents/`.
- D5 · Paquete `com.example.examen`; esqueleto `plantilla/base`; sin extras.

## Tabla de requisitos (la rellena el constructor)

| Requisito | Fichero:línea | ✅/❌ |
|---|---|---|
| R1 | MainActivity.java:39-51 (DIAL en 47-49) | ✅ |
| R2 | MainActivity.java:54-67 (esquema en 62-64) | ✅ |
| R3 | MainActivity.java:43-46 y 58-61 | ✅ |
| R4 | MainActivity.java:70-77 | ✅ |
| R5 | DetalleActivity.java:35-49 | ✅ |
| R6 | AndroidManifest.xml:23-26 y DetalleActivity.java:28-30 | ✅ |
| R7 | AndroidManifest.xml:14-26 | ✅ |
