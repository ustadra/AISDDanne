# Plantilla de feature

Copia esta carpeta como `features/F-NN-<slug>/` y rellena su `SPEC.md`. Normalmente lo hace `/orquesta` por ti.

El `NN` es correlativo por orden de apertura. El slug, en kebab-case y descriptivo: `F-01-cimientos`, `F-02-alta-de-expediente`.

Una feature es un trozo de producto que se puede enseñar, no una tarea. Si al escribir el criterio de aceptación te salen tres cosas sin relación, son tres features. Y si el diff previsto pasa de unas 300 líneas, también se parte: una PR pequeña se revisa entera; una grande, no.

## Cómo se cierra

`pendiente` → `en curso` → **`en revisión`** (quien construye entrega un commit) → `qa` lo verifica → **`aprobada`** o **`cambios pedidos`** (lo anota el supervisor, con el sha del commit juzgado) → puerta y merge a la rama de integración → **`hecha`** cuando la persona lo acepta. `bloqueada` en cualquier momento, con el motivo en sus notas.

- El veredicto de `qa` vale para un commit: si la feature se toca después de `aprobada`, vuelve a `en revisión`.
- Como mucho dos vueltas de `cambios pedidos`; a la tercera se para y decide la persona.
- La puerta de merge comprueba estado, veredicto, sha, rutas y árbol limpio: `node .claude/skills/orquesta/scripts/puerta.mjs --spec features/F-NN-<slug>/SPEC.md --rama <rama o worktree>`.
