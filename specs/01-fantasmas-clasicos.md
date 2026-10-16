# SPEC 01 — Los 4 fantasmas clásicos con personalidad propia

> **Estado:** Aprobado
> **Depende de:** ninguno
> **Fecha:** 2026-10-16
> **Objetivo:** Reemplazar los 2 fantasmas genéricos por los 4 clásicos —blinky, pinky, inky y clyde— cada uno con su propia conducta de persecución, donde blinky persigue agresivamente a Pac-Man.

## Por qué existe este spec

Los 2 fantasmas actuales (`hunter` y `random`) son un placeholder. Las personalidades clásicas del arcade hacen que cada fantasma se sienta distinto a simple vista y que blinky cumpla el rol de perseguidor agresivo.

## Scope

**In:**

- `GHOST_STARTS` pasa de 2 a 4 entradas en `src/js/maze.js`, con `kind` y `corner`.
- Targeting clásico en `decideGhost` (`src/js/game.js`):
  - `blinky`: blanco = celda de Pac-Man (persecución directa y agresiva).
  - `pinky`: blanco = Pac-Man + 4 celdas en su dirección actual (embosca).
  - `inky`: blanco = blinky + 2 × ((Pac-Man + 2 celdas en su dirección) − blinky) (flanquea).
  - `clyde`: blanco = Pac-Man si distancia Manhattan > 8; si no, su `corner` (tímido).
- Ritual de salida: blinky nace fuera de la pen (13,11); pinky, inky y clyde rebotan dentro y salen escalonados por la puerta (columna 13) de forma scripteada, con retardos de 0, 180 y 360 frames (~0 s, 3 s, 6 s).
- Al perder una vida: los 4 vuelven a sus posiciones de inicio y se repite el ritual escalonado.
- Colores por `kind` en `src/js/render.js`: blinky rojo, pinky rosa, inky cian, clyde naranja.
- Desempate de direcciones a igual distancia con la prioridad clásica: arriba > izquierda > abajo > derecha.
- La colisión Pac-Man-fantasma ya funciona para cualquier modo (Pac-Man no puede entrar a la pen); no se toca.

**Out of scope (para futuros specs):**

- Modo frightened, pastillas de poder y fantasmas comibles.
- Alternancia global scatter/chase.
- Elroy (blinky acelera al quedar pocos dots).
- Ralentización de fantasmas en el túnel.
- El bug de pinky del arcade original (offset extra al ir hacia arriba).
- Animación de muerte o pausa tras perder una vida.

## Modelo de datos

```js
// src/js/maze.js — GHOST_STARTS (antes 2 entradas: hunter y random)
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky', corner: { x: 25, y: -3 } }, // sobre la puerta
  { x: 13, y: 14, kind: 'pinky',  corner: { x: 2,  y: -3 } }, // pen, centro
  { x: 11, y: 14, kind: 'inky',   corner: { x: 27, y: 31 } }, // pen, izquierda
  { x: 16, y: 14, kind: 'clyde',  corner: { x: 0,  y: 31 } }, // pen, derecha
];
```

`corner` es solo un blanco de distancia (como en el arcade puede caer fuera del laberinto); nunca se camina hacia él como celda.

```js
// src/js/game.js — cada fantasma gana dos campos (en createGame)
{
  x, y, dir: 'left',
  speed: 0.1,          // uniforme en los 4 (igual que hoy)
  kind, corner,
  mode: 'pen' | 'exit' | 'chase',   // blinky nace en 'chase'
  releaseAt: 0 | 180 | 360,         // frames hasta salir (pinky 0, inky 180, clyde 360)
}
```

Convenciones: velocidades en celdas/frame (como el código actual); `releaseAt` se descuenta 1 por llamada a `update`.

## Plan de implementación

1. `src/js/maze.js`: reescribir `GHOST_STARTS` con las 4 entradas (kind + corner). Manual: al iniciar se ven 4 fantasmas con colores distintos y el juego corre (los kinds nuevos aún caen en la rama aleatoria de `decideGhost`).
2. `src/js/render.js`: `GHOST_COLORS` pasa de array por índice a mapa por `kind`. Manual: cada fantasma lleva su color clásico.
3. `src/js/game.js`: modelo de pen — `createGame` crea `mode`/`releaseAt`; en `moveGhost`, `mode: 'pen'` rebota verticalmente (y entre 13 y 15) descontando `releaseAt`; al llegar a 0 pasa a `'exit'`; `'exit'` avanza scripteado: primero a x=13, luego sube en línea recta hasta (13,11) y pasa a `'chase'`. Manual: salen escalonados por la puerta, sin atravesar paredes.
4. `src/js/game.js`: targeting por personalidad en `decideGhost` (fórmulas del scope) con desempate clásico. Manual: blinky directo, pinky corta el paso, inky flanquea, clyde se retira cerca.
5. `src/js/game.js`: `resetPositions` restaura `mode` y `releaseAt` originales. Manual: al perder una vida se repite el ritual de salida.

## Criterios de aceptación

- [ ] `src/index.html` carga sin errores en la consola.
- [ ] Al iniciar se ven 4 fantasmas: rojo, rosa, cian y naranja.
- [ ] blinky (rojo) arranca sobre la puerta y siempre elige la dirección que minimiza su distancia Manhattan a la celda de Pac-Man.
- [ ] pinky, inky y clyde rebotan dentro de la pen y salen escalonados por la puerta (pinky ~0 s, inky ~3 s, clyde ~6 s), sin atravesar paredes.
- [ ] pinky apunta 4 celdas delante de Pac-Man según su dirección actual.
- [ ] inky calcula su blanco a partir de la posición de blinky y de 2 celdas delante de Pac-Man.
- [ ] clyde persigue a Pac-Man a más de 8 celdas de distancia Manhattan y se retira hacia su esquina a 8 o menos.
- [ ] Al perder una vida por colisión, los 4 fantasmas vuelven a inicio y se repite la salida escalonada.
- [ ] Ganar (comer todos los dots) y perder (3 colisiones) siguen funcionando como antes.

## Decisiones

- **Sí:** personalidades clásicas del arcade. Probadas, distinguibles a simple vista y blinky ya es el agresivo pedido.
- **Sí:** nombres y colores clásicos; `GHOST_COLORS` en render.js ya tenía los 4 colores exactos.
- **Sí:** reemplazar a `hunter`/`random`; el juego queda con exactamente 4 fantasmas.
- **Sí:** salida scripteada de la pen; el greedy dentro de la pen puede quedarse rebotando y el script lo evita.
- **Sí:** velocidad uniforme 0.1; la agresividad de blinky está en el targeting, no en la velocidad.
- **Sí:** distancia Manhattan para clyde (el arcade usa euclídea), por consistencia con el resto del targeting.
- **No:** alternancia scatter/chase global. Cada personalidad ya se distingue sin temporizadores; queda para otro spec.
- **No:** modo frightened y pastillas de poder. El maze aún no tiene power pellets; merece spec propio.
- **No:** reproducir el bug de pinky del arcade (offset extra hacia arriba). Reproducir un bug no aporta valor.
- **No:** Elroy, túnel lento, pausa al morir. Detalles del arcade fuera de alcance.
- **No:** archivo nuevo `ghosts.js`. Cabe en game.js (~60 líneas) y se evita tocar index.html.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Salida scripteada desalineada con la puerta (columnas 13-14) | El script usa la columna 13 fija, la misma donde nace blinky; verificación manual del paso 3. |
| Con 4 perseguidores el juego puede volverse muy difícil | Fantasmas más lentos que Pac-Man (0.1 vs 0.125), clyde se retira cerca y pinky/inky apuntan a celdas distintas de Pac-Man. |

## Qué **no** está en este spec

- Modo frightened, pastillas de poder y fantasmas comibles.
- Alternancia scatter/chase.
- Elroy, ralentización en el túnel, animación de muerte.

Cada uno de esos, si llega, va en su propio spec.
