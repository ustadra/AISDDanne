# GEMINI.md — lo específico de Antigravity y Gemini CLI

> Lo común a cualquier agente está en `AGENTS.md`, que las dos herramientas cargan a la vez que este fichero (Gemini CLI, por `context.fileName` de `.gemini/settings.json`). Aquí solo va lo que depende de ellas. No importa AGENTS.md con ninguna directiva: Antigravity ya lo lee y lo cargaría dos veces.

## Supervisor y squad

- El supervisor eres tú, la sesión principal, con el procedimiento de `.claude/skills/examen/SKILL.md`. Un subagente nunca orquesta a otros ni habla con la persona.
- Los roles de `.claude/agents/` se lanzan con tu herramienta de subagentes, con el cuerpo del fichero como prompt y el nivel de modelo de `squad/_catalogo.md`. `qa` va sin herramientas de escritura.
- Las preguntas a la persona, con tu herramienta de preguntas (`ask_question`), agrupadas en una ronda: dos como máximo por examen.

## Antigravity

- Skills: `.agents/skills.json` registra `.claude/skills`. Hooks: `.agents/hooks.json`, que solo carga en una carpeta de confianza y llama a `../.claude/hooks/adaptador.cjs` porque Antigravity los lanza desde `.agents/`.
- Antes de cada `run_command` los guardas contestan `deny` o `ask`: te pide confirmación salvo para lo que marcaste como «Always allow». Nunca `allow`.

## Gemini CLI

- Skills: `.agents/skills/`, el enlace de `enlazar-skills.cjs`; `/skills list` dice cuáles ve. Hooks: `.gemini/settings.json`, con confianza la primera vez (`/hooks`) y `timeout` en milisegundos.
- Sin subagentes en tu versión, cada rol va en su propio `gemini -p` dentro de su worktree, y su informe vuelve a ti.
