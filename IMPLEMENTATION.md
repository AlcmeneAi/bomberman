# Bomberman Game - Implementation Guide

## Overview

This is a complete multiplayer Bomberman game built with:
- **Client**: Vanilla JavaScript + Custom Mini-Framework (Virtual DOM)
- **Server**: Node.js + WebSocket (ws library)
- **Frontend**: Responsive HTML/CSS with grid-based game board

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (HTML/CSS + Mini-Framework UI)         │
├─────────────────────────────────────────┤
│         Application Layer               │
│  (Main App, Game Engine, Client)        │
├─────────────────────────────────────────┤
│         Network Layer                   │
│  (WebSocket Client/Server)              │
└─────────────────────────────────────────┘
```

## Client-Side Architecture

### 1. **Main Application (js/main.js)**
- Entry point for the game
- Manages screen transitions and game flow
- Handles event listeners from WebSocket client
- Coordinates between UI, engine, and client
- Manages game loop with requestAnimationFrame

**Key Methods:**
- `initialize()`: Connect to server and setup
- `handleJoinGame(nickname)`: Send join request
- `gameStarted(data)`: Initialize game state when game starts
- `startGameLoop()`: Start the main game loop
- `render()`: Render current screen

### 2. **WebSocket Client (js/client.js)**
- Handles all communication with server
- Event emitter pattern for message handling
- Sends player actions (move, bomb, chat)
- Receives game state updates

**Key Methods:**
- `connect()`: Connect to WebSocket server
- `joinGame(playerName)`: Request to join
- `playerMove(x, y)`: Send player position
- `placeBomb(x, y)`: Request bomb placement
- `sendChat(message)`: Send chat message
- `on(event, callback)`: Listen to server events
- `emit(event, data)`: Trigger local event

### 3. **Game Entities (js/entities.js)**

**Player Class**
```javascript
new Player(id, name, x, y)
- Properties: lives, maxBombs, flameRange, speed, direction
- Methods: move(), canPlaceBomb(), takeDamage(), addPowerUp()
```

**Bomb Class**
```javascript
new Bomb(id, x, y, playerId, flameRange)
- Properties: timer (3000ms), createdAt
- Methods: isExploded(currentTime)
```

**PowerUp Class**
```javascript
new PowerUp(id, x, y, type) // type: 'bombs', 'flames', 'speed'
```

**Explosion Class**
```javascript
new Explosion(id, x, y, duration = 500)
- Tracks cells affected by explosion
- Auto-expires after duration
```

**GameMap Class**
```javascript
new GameMap(width = 13, height = 13)
- Initializes 13x13 grid with walls, blocks, and empty spaces
- Methods: getTile(), isWalkable(), destroyBlock()
```

**GameState Class**
```javascript
new GameState()
- Central state container
- Maps: players, bombs, explosions, powerups
- Methods: addPlayer(), getBomb(), getAllPlayers(), etc.
```

### 4. **Game Engine (js/engine.js)**
- Core game logic and physics
- Input handling and movement
- Collision detection
- Bomb and explosion management
- Performance metrics

**Key Methods:**
- `update(deltaTime)`: Update game state each frame
- `updatePlayerMovement()`: Process keyboard input
- `updateBombs()`: Check for expired bombs
- `handleBombExplosion(bomb)`: Trigger explosion logic
- `updateCollisions()`: Check player/powerup/explosion collisions
- `isPositionValid(x, y)`: Collision detection for movement

### 5. **UI Components (js/ui.js)**
Built with Mini-Framework virtual DOM:

**LoginScreen**
- Input field for nickname
- Join button
- Simple form validation

**WaitingRoom**
- Player counter (X/4)
- Player list
- Countdown timer (20s or 10s)
- Status messages

**GameScreen**
- Game board (13x13 grid with CSS Grid)
- Player sprites with position
- Bombs and explosions
- Power-ups
- Sidebar with player stats
- Chat section

**EndGameScreen**
- Winner announcement
- Player statistics
- Play again button

## Server-Side Architecture

### 1. **WebSocket Server (server/server.js)**

**Main Components:**
```javascript
- wss: WebSocket server instance
- gameRooms: Map of active games
- GameRoom class: Represents one game instance
```

**GameRoom Class**
```javascript
new GameRoom(roomId)
- Properties: players, gameState, timers
- Methods: 
  - addPlayer(ws, playerData)
  - removePlayer(playerId)
  - broadcastToAll(message)
  - startGame(), endGame()
  - canStart(), shouldStartGame()
```

### 2. **Game Flow on Server**

1. **Waiting Phase** (0-20s)
   - Players join game room
   - Server tracks player count
   - At 20s with 2+ players, start countdown
   - If 4 players before 20s, start countdown immediately

2. **Countdown Phase** (10s)
   - Server ready to start game
   - After 10s, send GAME_STARTED to all players

3. **Active Game Phase**
   - Server processes player actions
   - Broadcasts state updates every 100ms
   - Handles bomb explosions and damage
   - Checks for game end condition (1 player left)

4. **Game End Phase**
   - Declare winner
   - Send GAME_ENDED message

### 3. **Message Protocol**

**Server sends game state updates every 100ms:**
```javascript
{
  type: 'GAME_STATE_UPDATE',
  players: [...],    // All player positions/status
  bombs: [...],      // Active bombs
  explosions: [...], // Current explosions
  powerups: [...]    // Available power-ups
}
```

**Client sends actions:**
```javascript
{ type: 'PLAYER_MOVE', x, y }
{ type: 'PLACE_BOMB', x, y }
{ type: 'CHAT_MESSAGE', message }
```

## Game Loop and Performance

### Client-Side Game Loop
```
requestAnimationFrame
  ↓
Calculate deltaTime
  ↓
Update game state (engine.update)
  ↓
Calculate performance metrics
  ↓
Render UI (mini-framework)
  ↓
Repeat
```

### Performance Optimizations

1. **Virtual DOM Diffing**
   - Mini-framework only updates changed DOM nodes
   - Reduces expensive DOM operations

2. **Movement Throttling**
   - Player movement limited to 100ms intervals
   - Prevents input spam

3. **Server Update Rate**
   - 10 Hz (100ms) state sync instead of 60 Hz
   - Reduces network bandwidth

4. **Efficient Collision Detection**
   - Check only nearby cells
   - Use Map collections for O(1) lookups

5. **Tile Rendering**
   - CSS Grid for efficient layout
   - Sprites positioned with absolute positioning

## Game Mechanics Details

### Movement
- 4 directions: up, down, left, right
- Collision detection prevents:
  - Moving through walls/blocks
  - Moving through other players
  - Moving through bombs (once placed)
- Movement delay: 100ms per tile

### Bombs
- **Timer**: 3 seconds before explosion
- **Placement**: Consumes 1 from maxBombs
- **Explosion Range**: Starts at 1, increased by power-ups
- **Chain Reaction**: Can trigger other nearby bombs

### Explosions
- **Duration**: 500ms visible effect
- **Damage**: Kill or damage players in affected cells
- **Spread**: 4 directions until blocked by wall
- **Block Destruction**: Destroy first destructible block, stop
- **Power-up Drop**: 30% chance when block destroyed

### Power-ups
- Appear randomly in destroyed blocks
- **Bombs**: +1 max bomb capacity
- **Flames**: +1 explosion range
- **Speed**: +0.5 speed (max 3)
- Auto-collected on collision

### Map Generation
- **13x13 grid** (standard Bomberman)
- **Walls**: Even coordinates form indestructible grid
- **Blocks**: Randomly placed (65% probability)
- **Safe Zones**: 2x2 areas in corners have no blocks

## Network Synchronization

### State Consistency
1. **Server is authority**: Server processes all actions
2. **Optimistic updates**: Client shows action immediately
3. **Server confirmation**: Server broadcasts updates to sync all clients
4. **Conflict resolution**: Server state overrides client on mismatch

### Bandwidth Optimization
- Send only changed entities
- Compress coordinate data
- Batch multiple updates
- Update frequency: 10 Hz

## Testing Checklist

- [ ] Server starts without errors
- [ ] Multiple clients can connect
- [ ] Players appear in waiting room
- [ ] Game starts with 2+ players
- [ ] Player movement synchronizes
- [ ] Bombs place correctly
- [ ] Explosions damage players
- [ ] Power-ups collect correctly
- [ ] Chat messages deliver
- [ ] Game ends when 1 player remains
- [ ] Performance maintains 60 FPS with 4 players

## File Sizes (Estimated)

- `mini.js`: ~8 KB (framework)
- `main.js`: ~12 KB (app logic)
- `client.js`: ~4 KB (websocket)
- `entities.js`: ~8 KB (game classes)
- `engine.js`: ~10 KB (game loop)
- `ui.js`: ~15 KB (components)
- `server.js`: ~12 KB (server logic)
- **Total JS**: ~69 KB (before minification)
- **CSS**: ~8 KB
- **Total Gzipped**: ~20 KB (estimated)

## Future Enhancements

1. **Sprite Animations**
   - Convert ASE files to PNG sprite sheets
   - Frame-based animation for players/bombs/explosions

2. **Advanced Features**
   - Custom maps
   - AI players
   - Team mode (2v2)
   - Powerup effects visualization

3. **Optimizations**
   - WebWorker for physics
   - Canvas rendering alternative
   - Client-side prediction for smoother movement

4. **Features**
   - Leaderboard
   - Replays
   - Sound effects
   - Mobile support

---

## Code Style Guidelines

- **Naming**: camelCase for functions/variables, PascalCase for classes
- **Comments**: Document public methods and complex logic
- **Error Handling**: Use try-catch for async operations
- **Performance**: Use const/let, avoid unnecessary loops
- **Modularity**: Keep classes focused on single responsibility

---

**This implementation prioritizes clarity and maintainability while achieving the required performance targets.**
