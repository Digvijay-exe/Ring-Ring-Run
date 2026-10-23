Ring Ring Run
A cooperative maze escape game where the King can see, the teammates are blind, and the bell is your only way to communicate.
About the Game
Ring Ring Run is a browser-based cooperative maze game. The team must navigate a maze, avoid ghosts, handle locked doors, and reach the exit together.
- King: Can see the maze and guides the team by ringing the bell to the left or right.
- Archer: Has a limited view and can shoot arrows at ghosts.
- Thief: Has a limited view and can pick locks on nearby doors.
- Procedural levels: Maze layouts are generated from seeds while retaining the configured level difficulty settings.
- Dynamic music: Normal background ambience plays during a round. When a living player reaches their last life (1 HP), the game switches to the Buckshot track.
Features
- Play solo on one keyboard or use the multiplayer lobby.
- King, Archer, and Thief roles with different abilities.
- Procedurally generated maze layouts with walls, doors, and ghosts.
- King-to-team directional bell communication.
- Separate sighted and blind views.
- Background ambience and last-life music transition.
- Runs in a modern desktop browser without a build step.
Project Files
Ring-Ring-Run-Updated/
├── index.html                    # Game, UI, styles, and browser-side logic
├── server.js                     # Optional multiplayer lobby/relay server
├── normal-background.mp3         # Normal round ambience
├── buckshot-last-life.mp3        # Music used when a living player has 1 HP
├── LEVEL_GENERATOR_NOTES.md      # Notes on procedural maze generation
├── LICENSE                       # Project license
└── README.md                     # This guide
Keep both MP3 files in the same folder as index.html; the game loads them by filename.
Requirements
Solo play
- A modern desktop browser (for example, Chrome, Firefox, or Edge).
- No installation or build process is required.
Multiplayer
- Node.js installed on the host computer.
- Other players must be able to reach the host computer over the same network, unless you configure another suitable network setup.
How to Run
Option 1: Solo mode
1. Download and extract the project ZIP.
2. Make sure index.html, normal-background.mp3, and buckshot-last-life.mp3 are together in the extracted folder.
3. Open index.html in your browser.
4. Choose Play solo (one keyboard) in the lobby.
Option 2: Multiplayer lobby
1. Install Node.js if it is not already installed.
2. Open a terminal in the project folder—the folder containing server.js.
3. Start the server:
   node server.js
4. Open the local address printed by the server, usually http://localhost:3000, on the host computer.
5. Other players on the same network can open the LAN address shown in the lobby/server output.
6. Each player enters a name and joins the lobby.
7. Assign the King, Archer, and/or Thief roles. The King starts the game once at least one teammate has selected a non-King role.
The server hosts the lobby and relays multiplayer messages; the game itself runs in the players' browsers.
Controls
King (sighted)
Key / input	Action
W A S D	Move relative to the direction you are looking
Mouse	Look around; click the view to capture mouse control
Esc	Release mouse control
Q / E	Ring the bell left / right
B	Change the bell sound
C	Look ahead
2 / 3	Peek through a teammate's blind view
R	Restart the level
Enter	Advance to the next level


Archer (blind)
Key	Action
W / S	Walk forward / backward
A / D	Turn left / right
Space	Shoot an arrow (arrows can hit teammates)


Thief (blind)
Key	Action
W / S	Walk forward / backward
A / D	Turn left / right
F	Pick the lock of a nearby door while standing still; use it to shut an open door as well


Blind players should listen for the King's bell: the left/right signal indicates which direction to go. Stay close to the King.
Music Behaviour
- Normal round: normal-background.mp3 plays on loop.
- Last-life warning: When any living player has 1 HP, the game switches to buckshot-last-life.mp3 on loop.
- Round ends: Both tracks are stopped when the team wins or the game ends.
Browsers may block audio until the player has interacted with the page. If music does not start immediately, interact with the game and check that browser audio is not muted.
Customising Level Generation
Open index.html and locate the LEVELS configuration near the top of the script. The available configuration includes:
- w, h: maze dimensions; odd dimensions are recommended.
- seed: seed used to generate a reproducible maze layout.
- ghosts: requested ghost count.
- doors: requested door count.
- braid: chance of opening a wall between neighbouring corridors; higher values generally create more loops and fewer dead ends.
See [`LEVEL_GENERATOR_NOTES.md`](LEVEL_GENERATOR_NOTES.md) for more details on generation and validation.
Troubleshooting
- Multiplayer lobby does not load: Confirm that node server.js is running and that you opened the server address rather than the raw file. Check the host firewall and network access.
- Audio is missing: Confirm both MP3 files are beside index.html, then interact with the page and check browser volume settings.
- Teammates cannot connect: Ensure they use the host computer's LAN address and are on a network that permits devices to communicate.
License
See LICENSE for license details.
