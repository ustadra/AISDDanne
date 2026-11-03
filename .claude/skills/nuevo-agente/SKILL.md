---
name: nuevo-agente
description: "Da de alta un agente (rol del squad) con la forma de la plantilla del kit, o revisa y alinea uno que ya existe: decide modelo y herramientas con criterio escrito, rellena assets/agente.md.tmpl, lo pasa por scripts/comprobar.mjs y toca a la vez catálogo, ruteo del _orchestrator y lámina. Invocar con /nuevo-agente <rol o necesidad> o /nuevo-agente revisar [rol]. Úsala ante «crea un agente», «nuevo rol», «¿están bien nuestros agentes?» o antes de editar a mano .claude/agents/."
argument-hint: "<rol o necesidad> | revisar [rol]"
version: 1.1.1
---

# /nuevo-agente — un rol con la forma de todos

Todos los agentes del kit tienen la misma forma: el mismo frontmatter, las mismas seis secciones en el mismo orden y un modelo y unas herramientas elegidos con el mismo criterio. Así el supervisor sabe qué le va a devolver cada uno, quien lee un rol encuentra cada cosa en su sitio y otra herramienta (Codex, Cursor) puede adoptarlo leyendo el fichero. La forma está en [`assets/agente.md.tmpl`](assets/agente.md.tmpl) y la comprueba [`scripts/comprobar.mjs`](scripts/comprobar.mjs); el hook `doc-drift` la vuelve a comprobar cada vez que alguien edita un agente.

## La línea que no se cruza

- **Un agente nuevo tiene que hacer falta.** Si un rol del catálogo ya lo cubre, o lo que se pide es un procedimiento y no un rol, lo dices y propones eso: ampliar el rol que existe o una skill. Un agente es *quién trabaja*, con su modelo y sus herramientas; una skill es *qué se sabe hacer* (criterio en [`squad/_catalogo.md`](../../../squad/_catalogo.md), «Agente vs Skill»).
- **Ni commit ni push.** Dejas los ficheros escritos y comprobados; el commit lo pide la persona.
- **No cambias el modelo de un rol existente por tu cuenta.** En modo revisar lo propones con su porqué; bajar de Opus a Sonnet se decide con un caso real delante (ver «Modelo»).

## Modos

| Invocación | Qué hace |
|---|---|
| `/nuevo-agente <rol o necesidad>` | Alta: de una necesidad a un agente escrito, comprobado y registrado en los cuatro sitios. |
| `/nuevo-agente revisar` | Pasa el comprobador por todos los agentes y propone cómo alinear cada uno. No toca nada sin OK. |
| `/nuevo-agente revisar <rol>` | Lo mismo con uno, y lo alinea tras el OK. |

## Alta

1. **¿Hace falta?** Lee el catálogo y la tabla de ruteo de [`_orchestrator`](../_orchestrator/SKILL.md). Si hay solape, para aquí y dilo (ver arriba).
2. **Una ronda de preguntas**, solo de lo que no sepas ya: qué entrega el rol, qué frases o qué estado del repo lo disparan, si solo lee, verifica ejecutando o construye, con qué roles linda y qué doctrina de `knowledge/` necesita. Si no existe esa doctrina y el criterio pasa de unas pocas reglas, va a un fichero nuevo de `knowledge/` y el agente lo lee bajo demanda.
3. **Decide modelo y herramientas** con las tablas de abajo, y escribe el porqué en una línea. Lo enseñas en el paso 6.
4. **Escribe `.claude/agents/<rol>.md` desde la plantilla.** Sigue «Cómo se escribe el prompt». Quita todos los `<…>` y las ramas «Si construyes / Si solo lees» que no apliquen.
5. **Comprueba:** `node .claude/skills/nuevo-agente/scripts/comprobar.mjs .claude/agents/<rol>.md`. Cero errores. Un aviso se arregla o se justifica en el catálogo.
6. **Los cuatro sitios, en el mismo cambio** (en este repo solo existen el fichero del agente y `squad/_catalogo.md`; no hay `_orchestrator` ni diagrama de arquitectura que tocar):
   - `squad/_catalogo.md`: fila del roster (modelo, tools, naturaleza, cuándo se activa), su fila en la regla de activación si cambia qué squad entra, y una nota de colaboración si linda con otro rol.
   - Tabla de ruteo de `_orchestrator/SKILL.md`, con bump de `version:` y entrada en su `CHANGELOG.md`.
   - El diagrama `docs/Arquitectura/AI_SDD-Arquitectura-y-Uso.excalidraw` y su lámina, que cuentan los roles.
   - El README no enumera roles: enlaza al catálogo. No lo toques salvo que el rol cambie algo que cuenta.
7. **Pruébalo con un caso pequeño y real.** Lánzalo con la herramienta `Agent` y mira que su último mensaje tenga la forma de su «Qué devuelves». Claude Code carga los agentes al abrir la sesión: si todavía no aparece, lánzalo como `general-purpose` con su fichero como instrucciones y dilo.
8. **Cierra** con el resumen: fichero, modelo y tools con su porqué, salida del comprobador y sitios tocados.

## Revisar

1. `node .claude/skills/nuevo-agente/scripts/comprobar.mjs` (todos) o con la ruta del rol.
2. Por cada agente con errores: qué falla, el arreglo propuesto y qué cambia para quien lo usa. Los avisos, aparte.
3. Con el OK, alinea **un agente por commit**: mueve el contenido a las secciones de la plantilla sin perder reglas. Lo que sobre del prompt y sea criterio largo va a `knowledge/`. Lo que el agente pedía «orquestar» pasa a su «Qué devuelves» como petición al supervisor.
4. Si cambian `model` o `tools`, es un cambio de roster: catálogo, ruteo y lámina, como en el alta.

## Modelo

Un alias (`haiku`, `sonnet`, `opus`), no un id con fecha: el alias sigue a la versión vigente y el fichero viaja a cualquier proyecto. `inherit` deja el coste en manos de quien lo lanza, así que no se usa.

Cada alias es un nivel: `haiku` (`ligero`), `sonnet` (`medio`), `opus` (`profundo`). En Antigravity, Gemini CLI o Codex quien lanza el rol lo traduce con la tabla de [`squad/_catalogo.md`](../../../squad/_catalogo.md) («Modelo y herramientas en cada runtime»). En los agentes del kit `model` lleva `haiku`, `sonnet` u `opus` para que Claude Code lo lea directamente, pero el comprobador admite también los niveles agnósticos (`ligero`, `medio`, `profundo`) y los alias o ids de Gemini y OpenAI (`flash_lite`, `flash`, `pro`, `gemini-*`, `gpt-5*`, `o3*`) en proyectos que usen otro runtime principal.

| Modelo | Para | Ejemplos del kit |
|---|---|---|
| `haiku` | Comprobaciones con formato fijo contra reglas escritas, en cada unidad y a menudo. Barato y rápido. | `revisor` |
| `sonnet` | Por defecto. Construir, probar, verificar ejecutando, consultar. | backends, `frontend-react`, `tester`, `qa` |
| `opus` | Razonamiento donde un fallo cuesta caro y el volumen es bajo: auditorías de seguridad, decisiones de diseño con trade-offs. Mejor si el rol solo lee. | `ciberseguridad`, `auditor-mcp-sql` |

Un rol que escribe con `opus` lleva su porqué en el catálogo (el comprobador avisa). Para bajar de modelo a un rol que ya existe: el mismo caso real con los dos modelos, y `qa` compara las salidas. Sin ese caso es una opinión.

## Herramientas

Las mínimas para su trabajo: cada herramienta de más es superficie que un texto malicioso puede usar.

| Naturaleza | `tools` |
|---|---|
| Solo lee y reporta | `Read, Grep, Glob` |
| Verifica ejecutando, sin modificar el repo | `Read, Grep, Glob, Bash`. Su prompt dice qué órdenes lanza y compara `git status --porcelain` antes y después. |
| Construye | `Read, Grep, Glob, Bash, Write, Edit` |

Nunca `Agent`: un subagente no lanza a otros. Si su trabajo tiene que pasar por `tester` o `ciberseguridad`, lo pide en «Qué devuelves» y lo lanza el supervisor. `skills:` solo para una skill que el rol usa en cada invocación (como `devops-github` con `pr`): se carga entera en su contexto.

## Cómo se escribe el prompt

- **La description decide cuándo se invoca.** «Usar para…», los disparadores reales y lo que no cubre. Hasta 70 palabras: el cómo va al cuerpo.
- **En segunda persona y con el porqué.** «Verificas ejecutando, porque leer el código que dice cumplir algo no prueba que lo cumpla» funciona mejor que «VERIFICA SIEMPRE». Los modelos actuales siguen las instrucciones al pie de la letra: el grito les hace sobrerreaccionar, y el porqué les deja resolver los casos que la regla no previó.
- **Mejor lo que se hace que lo que no.** Una prohibición solo cuando el error es probable y caro, y con su alternativa.
- **«Qué devuelves» con un formato fijo.** Es lo único que ve el supervisor. Evidencia (`fichero:línea`, orden ejecutada) en vez de impresiones, y lo pendiente dicho.
- **El criterio largo vive en `knowledge/`** y el agente lo lee bajo demanda. Un agente de más de 150 líneas probablemente lleva doctrina dentro.
- **Markdown plano**, sin nada que solo entienda Claude Code fuera del frontmatter: el rol tiene que poder adoptarse leyéndolo.
- **En español y sin marcas de IA**: pásalo por `humanizer`.

## Qué entregas

- Alta: el fichero del agente, el comprobador sin errores y los cuatro sitios tocados, con el resumen del paso 8.
- Revisar: la tabla de agentes con sus errores y avisos, y el plan de alineación; tras el OK, un commit por agente.
