# CHANGELOG — /orquesta

## 1.9.0 — 2026-10-30

- **Features de arreglo de `ciberseguridad` por tipo de hallazgo.** Una feature por hallazgo de criterio y una por grupo de mecánicos sobre los mismos ficheros; los `SEC-NN` en `notas`, sus `Ficheros` como `files` y su `Verificación` como `acceptance`. Las de solo mecánicos se lanzan en nivel ligero (`haiku` en Claude Code), con el hallazgo y sin el texto de lo auditado. La segunda ronda de la puerta es una revisión parcial sobre esos `id`. Porqué: el arreglo mecánico no necesita el nivel del constructor y volver a auditar el repo entero tras cada arreglo gastaba lo mismo que la primera vez. Viene de fct-project-builder (`/orquesta` 1.16.0).

## 1.8.0 — 2026-10-26

- **Registra el proyecto en el monitor al empezar a ejecutar** (`/semaforo` 2.4.0, `tablero.mjs --registrar`). Así el monitor enseña todo lo que se ha orquestado, también lo que vive fuera de la carpeta de los demás repos.

## 1.7.0 — 2026-10-25

- **Al retomar, reutiliza el worktree de cada feature.** Tras un corte (cuota, error de la API, editor cerrado) los agentes de la sesión vieja no siguen, pero sus worktrees sí, y el bucle solo sabía arrancar features `pendiente` en un worktree nuevo. Ahora una feature `en curso` o `cambios pedidos` se relanza en su worktree con su handoff y la foto de `foto-turno`; `en revisión` relanza `qa` sobre su sha; `aprobada` va a la puerta. Lo dispara `/retoma`.

## 1.6.0 — 2026-10-22

- **Ofrece el monitor al empezar la ejecución.** Una pregunta por ejecución («¿abro el monitor del plan?»); con sí lanza `/semaforo tablero --abrir` en segundo plano y lo para al acabar. Antes había que levantarlo a mano y mucha gente no sabía que existía.

## 1.5.0 — 2026-10-22

El estado y el contrato de las features pasan a un solo fichero, `feature_list.json`, para los planes nuevos. Un
proyecto con `SPEC.md` sigue funcionando tal cual y se pasa a JSON cuando la persona quiera.

- **`feature_list.json`** en la raíz y en la rama de integración: por feature, `id`, `name`, `title`, `depends_on`,
  `files` (las rutas que solo ella escribe), `acceptance` (`criterio` y un `verify` que `qa` ejecuta, o `null`),
  `status`, `intentos` y `sha`. Hasta ahora esto vivía en cabeceras de markdown que tres lectores distintos
  parseaban con una regex copiada, y las dependencias entre features no constaban en ningún sitio.
- **`scripts/plan.mjs`** (reglas y transiciones, sin disco) y **`scripts/features.mjs`** (la CLI del supervisor:
  `validar`, `listos`, `entrada`, `marcar`, `convertir`). Solo el supervisor escribe el plan, y solo con
  `marcar`: valida la transición y el plan entero, escribe de golpe y apunta `progress/history.md`. Sin
  dependencias.
- **Cada vuelta al constructor cuenta una**, venga de `qa`, de la puerta, de un conflicto o de un revert; a la
  tercera, la feature se bloquea sola. Antes solo contaban las de `qa` y nada lo imponía.
- **Los solapes entre features que van a la vez son un error**, no un aviso: la comprobación entiende globs
  (`src/api/**` y `src/api/users.ts` se pisan), y las rutas del supervisor (`feature_list.json`, `progress/`) no
  pueden ser de ninguna feature.
- **La puerta** acepta `--plan feature_list.json --feature <id|name>`: valida el plan entero y lee de la entrada
  el estado, el `sha` que juzgó `qa` y los `files`. `--spec` sigue valiendo.
- **Las puertas finales tienen tope**: como mucho 2 rondas, y a la segunda decide la persona.
- `features.mjs convertir` pasa un proyecto de `SPEC.md` a JSON; las dependencias no constan en la SPEC y salen como
  aviso para escribirlas a mano. Plantilla en `templates/features/feature_list.json.tmpl`.
- Cómo se ejecuta el modo flujo en un runtime sin la herramienta `Agent` (Antigravity, Gemini CLI, Codex): las primitivas de AGENTS.md, «Cada herramienta».
- Description en una sola línea y de 500 caracteres como mucho: Codex no carga una skill que pase de ahí ni una de varias líneas, y en Gemini CLI y Antigravity compite con las demás por el contexto. Se queda el qué, el cuándo y los disparadores; el cómo sigue en el cuerpo.

## 1.4.0 — 2026-10-16

Portado de fct-project-builder: su 1.5.0 (PR #13, `b89c1b0`) y su 1.6.0 (rama `feat/objetivo-flujo`, sin
mergear allí al portarlo). El ritmo del método agent-squad (MIT, `0e82cfc`; en el repo de referencia, de 0,9 a
9,7 PR al día con PR de ~200 líneas, QA independiente en todas y merge sin esperar a una persona en una rama
de integración), sin cambiar el modelo supervisor + subagentes. Se conserva lo propio de AI_SDD: la unidad de
trabajo la declara el `AGENTS.md` (la feature es solo el valor por defecto), la fricción va a `/mejora` como
issue del proyecto o del kit y nada depende de un motor de generación.

- **Modo flujo, por defecto al ejecutar.** Cadena en segundo plano (`Agent` con `run_in_background`): hasta 3
  constructores y 2 `qa` a la vez. Cada unidad se entrega con un commit en su rama `orquesta/<feature>`, pasa a
  `en revisión` y `qa` la verifica sobre ese commit mientras arranca la siguiente. La oleada pasa a ser una
  dependencia, no una barrera. El modo por oleadas sigue como `/orquesta ejecutar --oleadas`.
- **Estados de la unidad:** `pendiente` → `en curso` → `en revisión` → `cambios pedidos` | `aprobada` → `hecha`,
  más `bloqueada`, y la línea `Veredicto QA: APROBADA · commit <sha7> · <fecha>` en la cabecera. El veredicto
  vale solo para el commit que juzgó. Máximo 2 vueltas de cambios pedidos. La cabecera es contrato también
  para las unidades que declare el proyecto.
- **Puerta de merge determinista:** `scripts/puerta.mjs` (con `scripts/puerta.test.mjs`) comprueba estado
  `aprobada`, veredicto con sha igual al HEAD, diff dentro de las rutas «Escribe en (exclusivo)» y worktree
  limpio, y devuelve el sha a mergear. Lee la cabecera con la misma función que `unit-close` y `/semaforo
  ritmo` (copia idéntica en los tres, comprobada por `.claude/hooks/tests/contrato-unidad.test.cjs`). Un diff
  vacío frente a la base no pasa (lo más probable es una base equivocada). Lee los nombres de fichero sin
  escapar (`core.quotepath=false`, separados por NUL), así que una ruta con ñ o tildes casa con su patrón. Al
  pasar, imprime el merge con el asunto `chore(orquesta): merge F-NN <slug> (qa <sha7>)`, que es el que
  reconoce `/semaforo ritmo` como merge de unidad. Se lanza desde la integración: la rama actual tiene que ser
  `orquesta/*` (desde una protegida no pasa; desde otra, error de uso). Comprueba además que el resultado del
  merge (`git merge-tree --write-tree`) deja en las rutas de la unidad lo mismo que el HEAD aprobado; con un
  git anterior a 2.38 lo avisa sin bloquear. Las rutas «Escribe en» se comparan con una sola función, `cubre`
  (globs `*` y `**`, corchetes literales), copiada junto a `leerContrato` en los tres lectores.
- **Excepción de merge**, explícita en la aprobación de la Fase 4 y en Reglas: con el plan aprobado, el
  supervisor mergea con `--no-ff` a `orquesta/<proyecto>` las unidades aprobadas por `qa` que pasan la
  puerta, y cada constructor commitea su entrega en su rama `orquesta/<unidad>` sin otro OK. Nunca a una rama
  protegida, nunca push.
- **Tras un revert, la rama de la unidad se recrea.** Si los tests fallan tras el merge y se revierte, la rama
  vieja ya no sirve (su commit es ancestro de la integración): se recrea desde la punta de la integración, el
  constructor reaplica el trabajo (`git revert <sha del revert>`) y vuelve a `qa`. La puerta lo comprueba con
  el resultado del merge.
- **No hay modo sin commits locales en la integración.** Los dos modos y los dos aislamientos commitean por
  unidad; quien no quiera esos commits en su rama la integra por squash.
- **Modo por oleadas, también con commit por unidad** y `qa` sobre cada uno. Desaparece la integración por
  fichero de parche de trabajo sin commitear.
- **Repo recién creado por `/objetivo`:** su `main` trae solo el commit de nacimiento (el esqueleto de las
  fases de `/arranca` y el brief), `orquesta/<proyecto>` sale de él y su primer commit es el plan; la condición
  de rama protegida no aplica, las de árbol limpio, `worktree.baseRef` y runners sí. La integración llega a
  `main` por PR desde `feat/<proyecto>`, creada desde `orquesta/<proyecto>`, tras el primer publicado que
  describe `/objetivo`.
- **Tope de tamaño:** ~300 líneas de diff por unidad, con `Tamaño previsto`; lo que se pase se parte.
- **Puertas reordenadas:** `qa` por unidad dentro del flujo; los tests del criterio de aceptación los escribe
  el constructor en su unidad (sus rutas van en «Escribe en»), porque `qa` los busca en el commit que juzga;
  `tester` entra en la oleada de puertas con la cobertura, los huecos entre unidades y el contrato de
  arquitectura; `ciberseguridad` como antes; `revisor` al final, sobre la integración entera.
- **Cuarta condición antes de usar worktrees: los runners no los recorren** (y cada unidad que arranca
  servicios lleva su puerto). El cómo vive en la regla `testing.md` del proyecto y en
  `.claude/rules/ejecuciones.md`; la skill da la condición y el enlace.
- **Lo aprendido** sale también de las issues abiertas de mejora del repo y, en un proyecto, de las del kit.
- **Prompts de delegación:** el del constructor pide un commit con los tests de su criterio, el sha y el
  tamaño, y le prohíbe tocar la especificación; uno nuevo para `qa` con criterios, commit, base, rutas,
  afirmaciones y su formato de vuelta. `qa` compara el HEAD por prefijo o con `git rev-parse --short=7 HEAD`.
  La base de `qa` depende del aislamiento: `orquesta/<proyecto>` con
  worktrees y `<sha7>^` con ficheros asignados, donde el commit ya está en la integración.
- **Merge con mensaje convencional:** `chore(orquesta): merge F-NN <slug> (qa <sha7>)`, el que imprime la
  puerta. El cierre propone la PR desde `feat/<proyecto>` cuando la integración salió de `main`.
- **`/orquesta estado`** enseña los estados nuevos, el sha de cada veredicto y del merge, la vuelta y qué
  agente está vivo.
- **Fase de `/objetivo`:** la ronda de preguntas y la aprobación ya vienen hechas y no se repiten.

## 1.3.0 — 2026-10-09

- **La fricción de cada oleada va a `/mejora`** (paso 8 de la Fase 5): un contrato incompleto, un agente sin
  contexto, un choque en el mismo fichero o un fallo repetido se proponen como issue, del proyecto o del kit,
  con la prueba de lo que acaba de pasar. Al terminar se juntan con las lecciones del cierre. Antes, el cierre
  decía «regístrala donde el proyecto lleve sus mejoras», sin decir dónde.
- Una pregunta de la Fase 2 que debería haber resuelto el brief se apunta como mejora de `/brief`, con destino kit.

## 1.2.0 — 2026-10-06

Arreglos de la última ronda de revisión sobre la ejecución.

### Cambiado

- **El worktree se deja limpio antes de retirarlo.** Tras el `add -A` de la integración tiene cambios
  stageados y `git worktree remove` no lo quita sin `--force`. Ahora: se comprueba que el trabajo está en
  la rama de integración (`git apply --index --reverse --check <parche>`, o el merge sin conflictos), se
  limpia con `git -C <worktree> reset --hard <base>` (o se commitea en su rama) y se retira sin forzar.
- **Los worktrees creados a mano llevan rama** (`git worktree add -b orquesta/<feature> …`), y la
  comprobación de commits sin traer usa `git -C <worktree> log <base>..HEAD`, que vale también para un
  worktree sin rama.
- **Con ficheros asignados, los agentes no instalan dependencias ni lanzan build o tests** que escriban
  salidas compartidas (`dist/`, `coverage/`, el lockfile): lo hace el supervisor al integrar, salvo que el
  plan asigne esas rutas. El prompt de delegación lo dice.
- **`.claude/state/` no cuenta como cambio del usuario** en la comprobación de árbol limpio y no se
  stagea; `templates/gitignore.tmpl` lo ignora.
- La pregunta de UI nombra `/design` solo si el proyecto tiene esa skill.
- El registro guarda la opción aprobada (ejecutar ya o más tarde), la rama de integración y la última
  base: `templates/features/REGISTRO.md.tmpl` gana esos campos.

## 1.1.0 — 2026-10-06

Arreglos de una revisión de doble juez sobre el modo worktree.

### Cambiado

- **El plan es el primer commit de `orquesta/<proyecto>`.** Las especificaciones, el registro y lo que se
  anote en el `AGENTS.md` quedan fuera de la exigencia de árbol limpio y entran en la rama de integración
  antes que nada. Antes, el plan se quedaba sin commitear y un agente aislado no encontraba su `SPEC.md`
  en el worktree. Si el `AGENTS.md` trae cambios del usuario además de la anotación, se pregunta.
- **`worktree.baseRef: "head"` se comprueba antes de lanzar**, no después. Si falta, los worktrees se
  crean a mano con `git worktree add <ruta> <base>` y los agentes se lanzan sin `isolation`. El
  `merge-base` queda como verificación posterior, y un worktree con cambios sin integrar no se retira sin
  preguntar.
- **La integración va por fichero de parche** (`git diff --cached --binary <base> --output=<f>` y
  `git apply --index <f>`), no por tubería: en PowerShell anterior a la 7.4 la tubería entre programas
  corrompe binarios y finales de línea CRLF.

## 1.0.0 — 2026-10-06

Alta en el kit. Viene de un repo derivado de AI_SDD, donde la skill pasó dos revisiones de doble juez;
se trae su método entero y se quita lo que dependía de ese repo.

### Añadido

- **Un prompt, un objetivo:** brief → una ronda de preguntas (como mucho dos llamadas a
  `AskUserQuestion`, de 4 preguntas cada una) → unidades con su especificación → oleadas en un registro →
  una aprobación con «aprobar y ejecutar ya» → ejecución en la misma sesión. `/orquesta ejecutar` retoma
  un plan aprobado y `/orquesta estado` lo enseña sin tocar nada.
- **Oleadas:** la 0 fija contrato y esqueleto; de la 1 a la N se construye en paralelo con ficheros en
  exclusiva y como mucho 4 agentes; cierra la oleada de puertas, `tester` ∥ `ciberseguridad` → `revisor`,
  que lanza el supervisor porque un subagente no abre otros.
- **Aislamiento por ficheros asignados o por worktree.** Con worktree: rama de integración local
  `orquesta/<proyecto>` con commits de base y sin push, árbol limpio exigido antes de crearla (nunca entra
  lo que el usuario tenía a medias), `worktree.baseRef: "head"` comprobado en `.claude/settings.json`,
  verificación de que cada worktree arrancó en la base (si no, worktrees a mano o ficheros asignados),
  integración con `add -A` + `diff --cached --binary` para no perder ficheros nuevos, y comprobación de
  que no queda nada sin traer antes de retirar cada worktree.
- **Handoff:** si la ejecución se para, `.claude/state/handoff.md` dice dónde está, qué falta y qué
  bloquea, para quien la retome con cualquier herramienta.
- **La unidad de trabajo es la que declara el `AGENTS.md` del proyecto.** Si no declara ninguna, la skill
  propone `features/F-NN-<slug>/SPEC.md` + `features/REGISTRO.md`, con las plantillas de
  `templates/features/`.
- PR con `/pr` y solo con OK del usuario; `/juicio` cabe antes si el cambio va a rama protegida o toca
  producción.

### Adaptado al kit

- La pregunta de UI ofrece maqueta con `/design` o el design system del proyecto, sin marca concreta.
- Las lecciones se registran donde el proyecto lleve sus mejoras; no hay un comando propio para ello.
- La lectura de la Fase 1 trata `CLAUDE.md` aparte de `AGENTS.md`: con `Read`, el `@AGENTS.md` no se
  expande.
- Condición nueva antes de usar worktrees: la rama del usuario no es protegida, porque la integración
  final sería un merge que no se hace desde la terminal.
