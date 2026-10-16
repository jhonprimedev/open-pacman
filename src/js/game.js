// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Geometria de la pen: interior filas 13-15; se sale por la columna 13
// (la puerta esta en (13-14,12)) hasta la fila 11, sobre la puerta.
const PEN_TOP = 13;
const PEN_BOTTOM = 15;
const PEN_DOOR_X = 13;
const PEN_EXIT_Y = 11;

// Retardo de salida de la pen en frames (~60 fps): pinky 0 s, inky 3 s,
// clyde 6 s. blinky no aparece: nace fuera de la pen, directo a chase.
const RELEASE_FRAMES = { pinky: 0, inky: 180, clyde: 360 };

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      corner: g.corner,
      mode: g.kind === 'blinky' ? 'chase' : 'pen', // blinky nace fuera de la pen
      releaseAt: RELEASE_FRAMES[ g.kind ] || 0,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   Pared (1) y puerta (3) bloquean a todos los actores; la puerta es
//   unidireccional: solo se cruza scriptada en el ritual de salida, que
//   mueve sin consultar isWall. El parametro actor se conserva para un
//   futuro modo frightened.
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Blanco de cada personalidad. Puede caer fuera del laberinto: es solo una
// coordenada de distancia, nunca una celda que se pisa.
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const d = DIRS[ p.dir ];

  if ( g.kind === 'blinky' ) return { x: px, y: py }; // persecucion directa
  if ( g.kind === 'pinky' ) {
    return { x: px + d.x * 4, y: py + d.y * 4 }; // embosca 4 celdas delante
  }
  if ( g.kind === 'inky' ) {
    const b = game.ghosts.find( ( o ) => o.kind === 'blinky' );
    const bx = Math.round( b.x );
    const by = Math.round( b.y );
    // 2 celdas delante de Pac-Man, dobladas desde blinky (flanqueo).
    return { x: 2 * ( px + d.x * 2 ) - bx, y: 2 * ( py + d.y * 2 ) - by };
  }
  // clyde: persigue lejos, se retira a su esquina a 8 o menos.
  const dist = Math.abs( g.x - px ) + Math.abs( g.y - py );
  if ( dist > 8 ) return { x: px, y: py };
  return g.corner;
}

// Prioridad clasica de desempate a igual distancia: arriba > izquierda > abajo > derecha.
const DIR_PRIORITY = [ 'up', 'left', 'down', 'right' ];

function decideGhost( game, g ) {
  const grid = game.grid;
  const target = ghostTarget( game, g );

  const options = DIR_PRIORITY.filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Direccion que minimiza la distancia Manhattan al blanco; al iterar en
  // orden de DIR_PRIORITY, el primero hallado desempata (criterio clasico).
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const dist =
      Math.abs( g.x + d.x - target.x ) + Math.abs( g.y + d.y - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

// Pen: rebote vertical entre PEN_TOP y PEN_BOTTOM descontando releaseAt
// (1 por update); al llegar a 0 pasa a 'exit'.
function movePenGhost( g ) {
  if ( g.releaseAt > 0 ) g.releaseAt -= 1;
  if ( g.releaseAt <= 0 ) {
    g.mode = 'exit';
    return;
  }
  if ( aligned( g.y ) ) {
    g.y = Math.round( g.y );
    if ( g.y <= PEN_TOP ) g.dir = 'down';
    else if ( g.y >= PEN_BOTTOM ) g.dir = 'up';
  }
  g.y += DIRS[ g.dir ].y * g.speed;
}

// Salida scripteada por la puerta: primero a la columna 13, luego sube en
// linea recta hasta (13,11) y pasa a 'chase'.
function moveExitGhost( g ) {
  if ( aligned( g.x ) ) g.x = Math.round( g.x );
  if ( g.x !== PEN_DOOR_X ) {
    g.dir = g.x < PEN_DOOR_X ? 'right' : 'left';
    g.x += DIRS[ g.dir ].x * g.speed;
    return;
  }
  if ( aligned( g.y ) ) {
    g.y = Math.round( g.y );
    if ( g.y <= PEN_EXIT_Y ) {
      g.mode = 'chase';
      return;
    }
    g.dir = 'up';
  }
  g.y -= g.speed;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( g.mode === 'pen' ) {
    movePenGhost( g );
    return;
  }
  if ( g.mode === 'exit' ) {
    moveExitGhost( g );
    return;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    const s = GHOST_STARTS[ i ];
    g.x = s.x;
    g.y = s.y;
    g.dir = 'up';
    // Ritual de salida original: blinky nace fuera (chase); el resto rebota
    // en la pen hasta agotar su releaseAt (salida escalonada).
    g.mode = s.kind === 'blinky' ? 'chase' : 'pen';
    g.releaseAt = RELEASE_FRAMES[ s.kind ] || 0;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
