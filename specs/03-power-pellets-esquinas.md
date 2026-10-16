# SPEC 03 — Power pellets en las 4 esquinas del laberinto

> **Estado:** Aprobado
> **Depende de:** ninguno
> **Fecha:** 2026-10-16
> **Objetivo:** Agregar los 4 power pellets clásicos en (1,3), (26,3), (1,23) y (26,23) —tile 4 con char `'o'`—, dibujados grandes y parpadeantes, que valen 50 puntos al comerlos y cuentan dentro de `dotsRemaining` para ganar.

## Por qué existe este spec

SPEC 01 aplazó las pastillas de poder porque el laberinto no las tenía. Este spec agrega solo la infraestructura (tile, dibujo, comer y puntos); el modo frightened va en su propio spec y encontrará el terreno listo.

## Scope

**In:**

- `src/js/maze.js`: `parseTile` gana la rama `'o'` → 4; filas 3 y 23 de `MAZE_STR` cambian el `.` de las cols 1 y 26 por `'o'` (posiciones clásicas, simetría intacta); el comentario de cabecera documenta el nuevo código.
- `src/js/render.js`: función nueva `drawPowerPellets( ctx, grid, frame )` — círculo de ~7px de radio, mismo `DOT_COLOR` que los dots, parpadeo visible/oculto alternando cada ~10 frames según `frame`; se llama desde `draw` tras `drawDots`.
- `src/js/game.js`: `createGame` cuenta los tiles 2 y 4 en `dotsRemaining`; `movePacman` come el tile 4 igual que un dot pero sumando 50 (grid → 0, `dotsRemaining--`).
- El tile 4 es transitable como el 2: `isWall` no cambia y solo `movePacman` come (los fantasmas lo pisan sin comérselo, igual que los dots).

**Out of scope (para futuros specs):**

- Modo frightened, fantasmas comibles y su regreso scriptado a la pen.
- Puntos escalonados 200/400/800/1600 por fantasmas comidos.
- Parpadeo de advertencia (fin del frightened) y frutas bonus.
- Pellets en otras posiciones o cantidades distintas de 4.

## Modelo de datos

Un solo valor nuevo de tile; ningún campo nuevo de estado — se reutilizan `grid`, `score` y `dotsRemaining`.

```js
// src/js/maze.js — codificación
'#' pared(1) · '.' dot(2) · 'o' power pellet(4) · ' ' vacio(0) · '-' puerta(3)
// parseTile: if ( ch === 'o' ) return 4;

// Filas de MAZE_STR que cambian (solo cols 1 y 26):
// fila 3:  '#.####.#####.##.#####.####.#'  →  '#o####.#####.##.#####.####o#'
// fila 23: '#...##................##...#'  →  '#o..##................##..o#'
```

## Plan de implementación

1. `src/js/maze.js`: rama `'o'` → 4 en `parseTile`, sustituir los 4 chars en las filas 3 y 23, actualizar el comentario de cabecera. Manual: `src/index.html` carga sin errores y la partida corre (paso intermedio: los pellets aún no se dibujan ni se comen).
2. `src/js/render.js`: `drawPowerPellets( ctx, grid, frame )` y su llamada en `draw` tras `drawDots`. Manual: 4 círculos grandes parpadean en las esquinas y los dots normales se ven igual.
3. `src/js/game.js`: contar los tiles 2 y 4 en el bucle de `dots` de `createGame`; extender el bloque de comer de `movePacman` con la rama del tile 4 (50 pts). Manual: comer un pellet suma 50 al HUD y desaparece; comer todo menos un pellet no gana; comer todo termina en 'won'.

## Criterios de aceptación

- [ ] `src/index.html` carga sin errores en la consola.
- [ ] Al iniciar se ven 4 power pellets: círculos grandes (~7px) parpadeando en (1,3), (26,3), (1,23) y (26,23).
- [ ] Los dots normales se dibujan como antes (2.5px, sin parpadeo).
- [ ] Comer un power pellet suma exactamente 50 al SCORE del HUD y el pellet desaparece.
- [ ] Un pellet comido no reaparece tras perder una vida (igual que los dots).
- [ ] Ganar exige comer los 4 pellets: con todo lo demás comido y un pellet pendiente, el juego no pasa a 'won'.
- [ ] `MAZE_STR` conserva la simetría respecto al eje entre las cols 13 y 14.
- [ ] El ritual de salida del SPEC 01 y la puerta unidireccional del SPEC 02 funcionan igual.

## Decisiones

- **Sí:** tile 4 con char `'o'` en `MAZE_STR` (elección del usuario). El estado "comido" vive en el grid como los dots: comer es grid → 0, sin marcas aparte.
- **Sí:** posiciones clásicas (1,3), (26,3), (1,23), (26,23) (elección del usuario). Son las "esquinas" del área jugable del arcade, no las celdas más extremas del laberinto.
- **Sí:** 50 pts y cuentan para ganar (elección del usuario). Fiel al arcade; `dotsRemaining` sigue siendo la única condición de victoria.
- **Sí:** grande y parpadeante con `frame` (elección del usuario). `draw` ya recibe `frame` para la boca de Pac-Man; no se agrega fuente de animación.
- **Sí:** mismo `DOT_COLOR` que los dots. En el arcade nivel 1 energizers y dots comparten color; solo cambian tamaño y parpadeo.
- **No:** modo frightened y fantasmas comibles. Queda para su propio spec, como se aplazó en SPEC 01; este spec deja la infraestructura lista.
- **No:** lista aparte de posiciones reutilizando el tile 2. Exigiría marcar cuáles se comieron; el tile 4 lo evita.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Contar mal los tiles 4 en `dotsRemaining` descuadra la victoria (ganar sin comerlos o no ganar nunca) | Un único conteo en `createGame` que suma los tiles 2 y 4; criterio de aceptación: dejar un pellet pendiente y comprobar que no se gana. |
| Editar a mano las filas de `MAZE_STR` podría romper la simetría | Solo cambian las cols 1 y 26, reflejadas entre sí; criterio de aceptación de simetría. |

## Qué **no** está en este spec

- Modo frightened, fantasmas comibles y regreso a la pen.
- Puntos escalonados 200/400/800/1600.
- Frutas bonus u otros items.

Cada uno de esos, si llega, va en su propio spec.
