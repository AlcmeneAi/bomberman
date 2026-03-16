# Bomberman Multiplayer Game

A browser-based Bomberman game built with a custom mini-framework using vanilla JavaScript and WebSockets for multiplayer gameplay.

## Project Structure

```
bomberman/
├── game/                          # Client-side game files
│   ├── index.html                # Main HTML file
│   ├── css/
│   │   └── style.css             # Game styling
│   └── js/
│       ├── main.js               # Main application entry point
│       ├── client.js             # WebSocket client
│       ├── entities.js           # Game classes (Player, Bomb, etc.)
│       ├── engine.js             # Game engine and logic
│       └── ui.js                 # UI components
├── mini-framework/               # Lightweight framework
│   ├── mini.js                   # Framework implementation
│   ├── index.html                # TodoMVC example
│   └── todo.js                   # TodoMVC implementation
├── server/                        # Server-side files
│   ├── server.js                 # WebSocket server
│   └── package.json              # Node dependencies
├── [sprite folders]              # Game assets (ASE files)
└── README.md                      # This file
```

## Features

- **4-Player Multiplayer**: Up to 4 players can join and battle
- **Real-time Synchronization**: All game state synced via WebSocket
- **Classic Bomberman Gameplay**:
  - Destructible and indestructible blocks
  - Bombs with 3-second timers
  - Explosions in 4 directions
  - Power-ups: Bombs, Flames, Speed
  - 3 lives per player
- **Chat System**: Players can communicate in-game
- **Performance Optimized**: 60 FPS gameplay with requestAnimationFrame
- **Responsive UI**: Mini-framework-based UI with state management

## Game Mechanics

### Map
- **13x13 grid** with fixed walls and random destructible blocks
- **4 safe starting zones** in corners (no blocks nearby)
- Walls are indestructible; blocks can be destroyed by explosions

### Players
- Start in corners with 3 lives
- Movement: Arrow keys or WASD
- Place bombs: Spacebar or Enter
- Eliminated when all lives are lost
- Last player standing wins

### Bombs & Explosions
- Each bomb has a 3-second timer before explosion
- Explosions spread in 4 directions (up, down, left, right)
- Default range: 1 block (increased by Flames power-up)
- Destroy destructible blocks
- Can damage/eliminate players

### Power-ups (30% drop rate when blocks are destroyed)
- **Bombs 💣**: Increases max bombs from 1 to max 4
- **Flames 🔥**: Increases explosion range
- **Speed ⚡**: Increases movement speed

### Game Flow
1. Players enter nicknames on login screen
2. Wait in lobby until 4 players join OR 20 seconds pass with 2+ players
3. 10-second countdown before game starts
4. Game runs until only 1 player remains alive
5. Winner is declared and can start a new game

## Installation & Setup

### Prerequisites
- **Node.js** (v14+) for the server
- **Modern browser** with WebSocket support

### Installation Steps

1. **Install server dependencies**:
```bash
cd /home/ebourmpo/Desktop/bomberman/server
npm install
```

2. **Start the WebSocket server**:
```bash
npm start
```
The server will start on `ws://localhost:8080`

3. **Open the game in browser**:
- Open `/home/ebourmpo/Desktop/bomberman/game/index.html` in a browser
- Or serve it with a local HTTP server:
```bash
# Using Python 3
cd /home/ebourmpo/Desktop/bomberman/game
python -m http.server 8000
# Then visit http://localhost:8000
```

## Controls

- **Arrow Keys** or **WASD**: Move player
- **Spacebar** or **Enter**: Place bomb
- **Chat Input**: Type message and press Enter or click Send

## Performance

The game is optimized for 60 FPS with:
- `requestAnimationFrame` for smooth rendering
- Efficient DOM diffing via mini-framework
- Minimal re-renders using virtual DOM
- Server sends state updates at 10 Hz (100ms intervals)
- Performance monitor shows FPS and frame time

## Architecture

### Client Architecture
- **Mini Framework**: Virtual DOM with diffing algorithm
- **Game Engine**: Physics, collision detection, bomb/explosion logic
- **WebSocket Client**: Handles all server communication
- **State Management**: Centralized game state with event-driven updates

### Server Architecture
- **WebSocket Server**: Using `ws` library
- **Game Rooms**: Each game instance is a separate room
- **Player Management**: Tracks connected players and their state
- **Game Loop**: 100ms update interval for state synchronization

## Message Protocol

### Client → Server
- `JOIN_GAME`: Join a game with nickname
- `PLAYER_MOVE`: Send player position
- `PLACE_BOMB`: Request bomb placement
- `CHAT_MESSAGE`: Send chat message
- `START_GAME`: Request game start

### Server → Client
- `PLAYER_JOINED`: Confirm player join
- `PLAYERS_UPDATE`: Update player list
- `GAME_STARTED`: Game has started
- `GAME_STATE_UPDATE`: Periodic state sync
- `BOMB_PLACED`: Bomb created
- `EXPLOSION`: Bomb exploded
- `POWERUP_SPAWNED`: Power-up appeared
- `PLAYER_ELIMINATED`: Player eliminated
- `GAME_ENDED`: Game finished, winner declared
- `CHAT_MESSAGE`: Chat message received

## File Descriptions

### Game Client Files

**js/main.js**
- Main application class that orchestrates the game
- Manages screen transitions (login → waiting → game → end)
- Handles event listeners and game loop
- Coordinates between UI, client, and game engine

**js/client.js**
- WebSocket client for server communication
- Event emitter pattern for message handling
- Sends game actions to server

**js/entities.js**
- `Player`: Player class with position, lives, power-ups
- `Bomb`: Bomb with timer and explosion logic
- `PowerUp`: Power-up types and data
- `Explosion`: Explosion entity with affected cells
- `GameMap`: 13x13 map with walls/blocks
- `GameState`: Central game state container

**js/engine.js**
- `GameEngine`: Core game logic
- Update methods for bombs, explosions, collisions
- Movement and input handling
- Performance metrics tracking

**js/ui.js**
- `LoginScreen`: Nickname entry
- `WaitingRoom`: Player counter and timers
- `GameScreen`: Main game view with board and chat
- `EndGameScreen`: Results and replay button

### Server Files

**server/server.js**
- WebSocket server implementation
- `GameRoom`: Represents one game instance
- Player management and state synchronization
- Message routing and handling
- Game loop for countdown and state updates

## Optimization Notes

- **DOM Updates**: Mini-framework's virtual DOM minimizes actual DOM changes
- **Rendering**: Tiles use CSS grid for efficient layout
- **Input Handling**: Movement limited to 100ms intervals to prevent spam
- **Network**: Server sends updates at 10 Hz, not on every change
- **Memory**: Uses Map collections for O(1) lookups of players/bombs

## Known Limitations & Future Improvements

1. **Sprite Assets**: Currently using CSS gradients/colors instead of ASE sprite files
2. **Animation**: No frame-by-frame animation yet (can be added with sprite sheets)
3. **Persistence**: No game history or statistics tracking
4. **AI**: No single-player vs AI mode
5. **Customization**: Fixed map size and player limit

## Troubleshooting

### Server connection fails
- Ensure server is running: `npm start` in `/server` directory
- Check port 8080 is available
- Check browser console for error messages

### Game freezes or lags
- Check browser console for errors
- Reduce number of players (test with 2 first)
- Close other browser tabs
- Check network latency

### Players not moving
- Check keyboard input is working
- Verify collision detection in game engine
- Check server logs for movement messages

## Future Features

- [ ] Sprite sheet animations for players/bombs/explosions
- [ ] Sound effects and background music
- [ ] Different map layouts
- [ ] Player skins selection
- [ ] Game statistics and leaderboard
- [ ] Spectator mode for eliminated players
- [ ] Custom game settings (bomb timer, explosion range, etc.)
- [ ] Team battles (2v2)
- [ ] Mobile touch controls

## License

ISC

## Author

Created for the Bomberman project

---

**Last Updated**: 2026-03-12
**Version**: 1.0.0
