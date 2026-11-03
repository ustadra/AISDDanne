# CHANGELOG — /nuevo-agente

## 1.1.1 — 2026-10-22

- `scripts/comprobar.mjs` admite en `model` los niveles agnósticos (`ligero`, `medio`, `profundo`) y los alias o ids de Gemini y OpenAI (`flash_lite`, `flash`, `pro`, `gemini-*`, `gpt-*`, `o1*`, `o3*`, `o4*`) además de `haiku`, `sonnet` y `opus`.

## 1.1.0 — 2026-10-22

- El modelo se elige por nivel (ligero, medio, profundo) con la tabla de equivalencias por proveedor de squad/_catalogo.md; `model` sigue llevando el alias de Claude Code.
- Description en una sola línea y de 500 caracteres como mucho: Codex no carga una skill que pase de ahí ni una de varias líneas, y en Gemini CLI y Antigravity compite con las demás por el contexto. Se queda el qué, el cuándo y los disparadores; el cómo sigue en el cuerpo.

## 1.0.0 — 2026-10-21

- Skill nueva. Nace de revisar los 17 agentes del kit: el frontmatter era homogéneo, pero cada cuerpo tenía
  su propio esquema de secciones, siete pedían «cerrar orquestando» a otro rol (algo que un subagente no
  puede hacer, porque no tiene la herramienta `Agent`) y el modelo de cada uno no tenía criterio escrito.
- La forma vive en `assets/agente.md.tmpl`: frontmatter (`name`, `description` que empieza por «Usar
  para», `tools`, `model`) y seis secciones en orden: Al ser invocado, Cómo trabajas, Qué devuelves,
  Frontera con otros roles, Reglas y Stack del proyecto. «Qué devuelves» es nueva: es lo único que ve el
  supervisor, y donde el rol pide que otro mire su trabajo.
- `scripts/comprobar.mjs` comprueba esa forma sin dependencias, con sus tests en el pre-push. El hook
  `doc-drift` lo pasa por cada agente que se edita, también a mano, si el repo tiene esta skill. Busca
  «orquestando a» en el cuerpo y en la description; un `name` fuera de minúsculas y guiones solo avisa,
  porque renombrar arrastra el roster.
- Con ella se alinean los 17 agentes del kit, uno por commit, sin cambiar su `name`, `tools` ni `model`.
- Criterio de modelo (alias, `sonnet` por defecto, `opus` con su porqué si el rol escribe) y de
  herramientas (las mínimas, nunca `Agent`), con la guía de Anthropic para escribir prompts: el porqué en
  vez del grito, una description corta que decide cuándo se invoca y la salida con formato fijo.
