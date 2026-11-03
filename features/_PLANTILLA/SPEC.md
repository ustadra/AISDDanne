# F-NN · [nombre de la feature]

Estado: `pendiente`
Veredicto QA: —
Objetivo: [O-NN de `features/REGISTRO.md` | — si sale del `BRIEF.md` inicial]
Oleada: [0 contrato · 1, 2… construcción] — la fija `/orquesta`
Tamaño previsto: [~N líneas de diff] — tope ~300; si el plan prevé más, se parte en dos features
Abierta: [YYYY-MM-DD]

> **Estados**, uno solo a la vez: `pendiente` → `en curso` → `en revisión` → `cambios pedidos` | `aprobada` → `hecha`; y `bloqueada` (qué la bloquea va en «Notas y decisiones»).
> `en revisión` lo anota el supervisor cuando quien construye entrega un commit para QA. `cambios pedidos` y `aprobada` los pone el supervisor con el veredicto del agente `qa`. `hecha` = la acepta la persona (merge de la integración o aceptación explícita). Si se toca la feature después de `aprobada`, vuelve a `en revisión`.
> **Veredicto QA** vale solo para el commit que juzgó: `APROBADA · commit <sha7> · <AAAA-MM-DD>` o `CAMBIOS PEDIDOS · commit <sha7> · <AAAA-MM-DD>`, con un sha de 7 a 40 caracteres, con o sin comillas invertidas.
> **Formato que leen las herramientas** (la puerta de merge de `/orquesta`, el hook `unit-close` y `/semaforo ritmo`): `Estado:` y `Veredicto QA:` a principio de línea, y en la columna «Escribe en (exclusivo)», rutas entre comillas invertidas o separadas por comas. Lo que va entre corchetes es marcador de plantilla y no cuenta como ruta: sin rutas reales, la puerta no deja mergear.

## Qué resuelve

[Una o dos frases. Qué puede hacer alguien cuando esto esté, que hoy no puede. Cita el campo del `BRIEF.md` del que sale.]

## Criterio de aceptación

[Verificable, no «que funcione bien». Redáctalo como lo comprobarías a mano: es lo que `qa` va a ejecutar, criterio a criterio. Cada criterio que se pueda automatizar lleva su test, que escribe quien construye la feature; las rutas de esos tests van en su «Escribe en (exclusivo)».]

- [ ] C1 · ...
- [ ] C2 · ...

## Alcance

- **Dentro:** [...]
- **Fuera:** [lo que se deja para otra feature, con su id si ya se sabe]

## Agentes

| Agente | Qué hace | Escribe en (exclusivo) |
|---|---|---|
| [backend-…] | [...] | [rutas] |

**Contrato que usa sin cambiarlo:** [rutas de la oleada 0, o «ninguno»]

## Cierre de la feature

1. El constructor entrega, con los tests de su criterio de aceptación, un commit en su rama (`orquesta/<feature>`; con ficheros asignados en el modo por oleadas, el supervisor commitea solo sus rutas en la integración) y devuelve el sha → `en revisión`. No toca este `SPEC.md`: estado, veredicto y notas los escribe el supervisor.
2. `qa` verifica ese commit contra el criterio de aceptación (solo lectura, ejecuta) → el supervisor anota `aprobada` o `cambios pedidos` y la línea «Veredicto QA».
3. Con `cambios pedidos`, vuelve al constructor con los hallazgos. Máximo 2 vueltas: a la tercera se para y se lleva a la persona.
4. Con `aprobada`: la puerta de merge (`node .claude/skills/orquesta/scripts/puerta.mjs`) y el merge a la rama de integración.
5. `revisor` (este squad no tiene `tester` ni `ciberseguridad`). Con `/orquesta`, sobre la integración entera; con una feature suelta, sobre la feature. `hecha` cuando la persona lo acepta.

## Revisión QA

<!-- Una subsección por ronda. La escribe el supervisor con lo que devuelve `qa`. -->

### Ronda 1 · commit [sha7] · [AAAA-MM-DD]

| Criterio | Resultado | Evidencia |
|---|---|---|
| C1 | [pasada · fallada · no comprobable] | [orden ejecutada y salida, fichero:línea…] |

**Hallazgos:** [P1 bloquea la aprobación · P2 se arregla en esta feature · P3 se anota y sigue] — o «ninguno».

**Veredicto:** [APROBADA | CAMBIOS PEDIDOS]

## Notas y decisiones

[Lo que se decidió al hacerla y por qué. Sobre todo lo que se descartó: es lo que nadie recuerda después. Las dudas abiertas, con quién las responde.]

## Lo que se aprendió

[Lo que no estaba previsto y conviene no volver a descubrir. Si afecta al método, al squad o a una plantilla, regístralo también donde el proyecto lleve sus mejoras (con `/mejora`, una issue).]

## Done

Además del criterio de aceptación, la Definición de Done del proyecto (ver `AGENTS.md`):

- [ ] Criterio de aceptación verificado por `qa` (Veredicto QA `APROBADA` sobre el último commit)
- [ ] Build y tests limpios
- [ ] Sin secretos
- [ ] `revisor` ✅ (si el plan lo pide)
- [ ] Aceptada por la persona → `hecha`
