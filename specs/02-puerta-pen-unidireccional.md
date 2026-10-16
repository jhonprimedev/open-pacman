# SPEC 02 — Puerta de la pen unidireccional (fin de los fantasmas estancados)

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-16
> **Objetivo:** Ningún fantasma en `chase` vuelve a entrar a la pen por la puerta ni queda estancado dentro: el tile 3 pasa a bloquear a todos los actores en `isWall` y la puerta solo se cruza scriptada al salir.

## Por qué existe este spec

La puerta de la pen (tile 3) solo bloqueaba a Pac-Man (`isWall` en `src/js/game.js:75`). Un fantasma en `chase` que cruza la fila 11 sobre las cols 13-14 con Pac-Man abajo elige `down` (minimiza su distancia Manhattan al blanco) y cae dentro de la pen; una vez dentro, el targeting greedy con la regla de no-reversa nunca elige subir por la puerta, así que queda rebotando dentro indefinidamente.

Evidencia (simulación en Node del código actual): los 4 kinds situados sobre la puerta entran en ~16 frames y acumulan 586/600 frames atrapados. El ritual de salida inicial sí funciona (pinky ~32 frames, inky ~230, clyde ~422); el estancamiento ocurre al reingresar, no al salir.

## Scope

**In:**

- `isWall` (`src/js/game.js:70`): el tile 3 (puerta) bloquea a todos los actores — se elimina la condición `actor === 'pacman'` de la línea 75.
- Actualizar el comentario de documentación de `isWall` (hoy dice que al ghost solo lo bloquea la pared).
- Efecto buscado: puerta unidireccional — solo se cruza scriptada al salir (`movePenGhost`/`moveExitGhost` ya mueven sin consultar `isWall` y no se tocan).

**Out of scope (para futuros specs):**

- Centrar la salida respecto a la puerta (cols 13-14); cosmético, decisión de no incluir.
- Retardos, posiciones de inicio y ritual de salida del SPEC 01 — intactos.
- Lógica direccional de la puerta (bloquear solo `down` sobre el tile 3).
- Modo frightened y regreso scriptado de fantasmas comidos.

## Modelo de datos

Este feature no introduce datos nuevos. Reutiliza el modelo del SPEC 01 (`mode`, `releaseAt`, `kind`, `corner`); el cambio es solo de regla en `isWall`.

## Plan de implementación

1. `src/js/game.js`: en `isWall` (línea 75) la puerta (tile 3) pasa a bloquear a todos los actores; actualizar su comentario (la puerta solo se cruza scriptada en el ritual de salida, que no consulta `isWall`). Manual: con Pac-Man quieto bajo la pen, los fantasmas que salen se alejan por la fila 11 y ninguno desciende por la puerta; el ritual escalonado (pinky ~0 s, inky ~3 s, clyde ~6 s) sigue igual; una partida completa no deja fantasmas dentro de la pen.

## Criterios de aceptación

- [ ] `src/index.html` carga sin errores en la consola.
- [ ] El ritual de salida del SPEC 01 se mantiene: pinky, inky y clyde salen escalonados (~0 s, ~3 s, ~6 s) por la puerta.
- [ ] Con Pac-Man bajo la pen, ningún fantasma en `chase` desciende por la puerta (cols 13-14, fila 12) al cruzar la fila 11.
- [ ] En una partida hasta ganar o perder, ningún fantasma queda atrapado dentro de la pen.
- [ ] Pac-Man sigue sin poder entrar a la pen.
- [ ] Perder una vida por colisión sigue reiniciando posiciones y ritual; ganar y perder funcionan como antes.

## Decisiones

- **Sí:** puerta bloqueada para todos los actores en `isWall` (elección del usuario). Mínimo (~1 línea), fiel al arcade (solo los fantasmas comidos reentran y no hay modo frightened) y el ritual de salida sigue intacto porque es scriptado.
- **Sí:** conservar el parámetro `actor` en `isWall` aunque la puerta deja de distinguirlo; evita un refactor en cadena y deja la semántica lista para un futuro frightened.
- **No:** bloquear solo la dirección `down` sobre el tile 3. Mismo resultado hoy con más lógica (`canMove` necesitaría contexto de dirección); nadie legítimo necesita reentrar.
- **No:** penalizar la entrada en `decideGhost`. Frágil: no garantiza el encierro cero.
- **No:** centrar la salida en la puerta (cols 13-14). Cosmético; el usuario lo dejó fuera.
- **No:** tocar retardos, posiciones o ritual del SPEC 01. Solo el fix, según el usuario.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Bloquear la puerta para fantasmas podría romper el ritual de salida | El ritual (`movePenGhost`/`moveExitGhost`) mueve scripteado sin consultar `isWall`; la verificación manual del paso 1 lo confirma (pinky ~0 s, inky ~3 s, clyde ~6 s). |
| Un futuro modo frightened necesitará reentrar por la puerta | Registrado en Decisiones: el regreso será scriptado como la salida, sin pasar por `isWall`; irá en su propio spec. |

## Qué **no** está en este spec

- Centrado de la salida en la puerta (cols 13-14).
- Cambios en retardos, posiciones o ritual del SPEC 01.
- Modo frightened, pastillas de poder y regreso de fantasmas comidos.

Cada uno de esos, si llega, va en su propio spec.
