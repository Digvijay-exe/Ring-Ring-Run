# Ring Ring Run — Procedural Level Generation Update

## What changed
- Reworked `genMaze()` in `index.html`.
- The same level seed produces the same generated maze.
- The exit is selected using breadth-first search (BFS) as the farthest reachable tile from the start.
- Doors are placed along the start-to-exit route, with spacing where possible.
- Ghosts are placed away from the start, exit, and doors, and are spaced apart where possible.
- Added `validateGeneratedMaze()` to check start/exit counts, border walls, and reachability with doors treated as openable.
- Preserved the game's existing level settings, controls, visuals, and runtime logic.

## Run
Open `index.html` in a modern desktop browser. No build step or dependencies are required.

## Tune level generation
At the top of `index.html`, edit the `LEVELS` array:
- `w`, `h`: maze width and height. Odd dimensions are recommended.
- `seed`: deterministic layout seed; change it to get a different layout.
- `ghosts`: requested ghost count.
- `doors`: requested door count.
- `braid`: chance of opening a wall between adjacent corridors (higher means more loops and fewer dead ends).

## Validation performed
- JavaScript syntax check passed.
- Generated all four configured levels and validated their start/exit reachability.
- Stress-tested 1,000 seed/configuration combinations with no validation failures.

Note: ghost movement and sound effects still use runtime randomness by design; the maze layout itself is seed-deterministic.
