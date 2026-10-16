# AGENTS.md

Clon de Pac-Man en JS vanilla (canvas), HTML y CSS. Proyecto de aprendizaje del flujo Spec Driven Development.

## Comandos

- No hay `package.json`, build, linter ni tests. Todo es estático: nada que instalar ni ejecutar por CLI.
- Ejecutar: abrir `src/index.html` directo en el navegador (scripts clásicos, no módulos; `file://` funciona) o servir `src/` con cualquier servidor estático.
- Verificación: manual en el navegador (flechas para mover, comer dots, ganar/perder, reiniciar).

## Arquitectura

- 4 scripts cargados en orden estricto desde `src/index.html`: `maze.js` → `game.js` → `render.js` → `main.js`. Se comunican por globals en `window` (p.ej. `window.MAZE`), NO por imports ES. Si añades un archivo, agrega su `<script>` en `index.html` respetando el orden de dependencias.
- `maze.js`: laberinto 28x31 como strings parseados a números; expone `MAZE`, `TUNNEL_ROW` (14, wrap lateral), `PACMAN_START`, `GHOST_STARTS`.
- `game.js`: estado y reglas. `createGame()` copia `MAZE` (prístino) a `game.grid` (mutable); expone `update(game)`.
- `render.js`: dibujo en canvas (`TILE = 20` px → canvas 560x620). Dibuja `game.grid`, nunca `MAZE`, para reflejar los dots comidos. Expone `draw(ctx, game, frame)`.
- `main.js`: bucle `requestAnimationFrame`, teclado (flechas → `pacman.nextDir`) y overlays de inicio/fin.

## Modelo del grid

- Celda `(x, y)`, origen arriba-izquierda, x ∈ [0,27], y ∈ [0,30].
- Codificación: 0 vacío transitable · 1 pared · 2 dot · 3 puerta de la pen.
- `MAZE` es inmutable; mutar `game.grid`, jamás `MAZE`.
- `MAZE_STR` es simétrico respecto al eje vertical central (entre cols 13 y 14); preservar la simetría al editarlo.

## Flujo de trabajo: Spec Driven Development

Este repo existe para practicar este flujo — úsalo para cada feature nueva:

1. `/spec <descripción>`: genera `specs/NN-slug.md` (numeración secuencial, empieza en `01-` si no existe `specs/`). Queda en estado `Draft`.
2. El humano cambia el estado a `Approved`; el agente nunca lo hace solo.
3. `/spec-impl NN-slug`: implementa paso a paso en la rama `spec-NN-slug`, pausando tras cada paso para revisar el diff. No commitea por su cuenta.

Skills instaladas en `.agents/skills/` (`spec`, `spec-impl`); versionadas en `skills-lock.json`.

## Convenciones

- Idioma: español en comentarios, UI, README y specs.
- Estilo JS: 2 espacios, comillas simples, espacios dentro de paréntesis `( x )` — imitar el estilo existente.
- Cada archivo JS abre con un comentario de 1-3 líneas describiendo su responsabilidad y dependencias.
