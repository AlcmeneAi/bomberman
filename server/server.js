/**
 * Bomberman WebSocket Server
 * Handles multiplayer game logic, player management, and game state synchronization
 */

const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const PORT = 8080;

// Game state
const gameRooms = new Map();
let currentGameRoom = null;
let nextPlayerId = 1;

// Game configuration
const PLAYER_LIMIT = 4;
const MIN_PLAYERS = 2;
const WAITING_TIME_BEFORE_COUNTDOWN = 20000; // 20 seconds
const COUNTDOWN_TIME = 10000; // 10 seconds

class GameRoom {
  constructor(roomId) {
    this.id = roomId;
    this.players = new Map();
    this.gameState = {
      map: null,
      players: [],
      bombs: [],
      explosions: [],
      powerups: [],
      gameStarted: false,
      gameEnded: false,
      winner: null
    };
    this.startTime = Date.now();
    this.countdownStartTime = null;
    this.isCountingDown = false;
    this.readyToStart = false;
  }

  addPlayer(ws, playerData) {
    const playerId = nextPlayerId++;
    const player = {
      id: playerId,
      name: playerData.playerName,
      x: 0,
      y: 0,
      lives: 3,
      maxBombs: 1,
      bombsPlaced: 0,
      flameRange: 1,
      speed: 1,
      isAlive: true,
      ws: ws
    };

    // Set starting position based on player index
    const index = this.players.size;
    const positions = [
      { x: 0, y: 0 },      // Top-left
      { x: 12, y: 0 },     // Top-right
      { x: 0, y: 12 },     // Bottom-left
      { x: 12, y: 12 }     // Bottom-right
    ];

    if (index < positions.length) {
      player.x = positions[index].x;
      player.y = positions[index].y;
    }

    this.players.set(playerId, player);
    this.gameState.players.push({
      id: playerId,
      name: player.name,
      x: player.x,
      y: player.y,
      lives: player.lives,
      maxBombs: player.maxBombs,
      bombsPlaced: player.bombsPlaced,
      flameRange: player.flameRange,
      speed: player.speed,
      isAlive: player.isAlive,
      direction: 'down'
    });

    return playerId;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
    }
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  broadcastToAll(message) {
    const data = JSON.stringify(message);
    this.players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    });
  }

  broadcastToOthers(senderId, message) {
    const data = JSON.stringify(message);
    this.players.forEach((player, playerId) => {
      if (playerId !== senderId && player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    });
  }

  getPlayerCount() {
    return this.players.size;
  }

  getPlayerList() {
    return Array.from(this.players.values()).map(p => p.name);
  }

  canStart() {
    const count = this.getPlayerCount();
    const elapsed = Date.now() - this.startTime;

    // Can start if 4 players OR (2+ players and 20 seconds passed)
    return count >= PLAYER_LIMIT || (count >= MIN_PLAYERS && elapsed >= WAITING_TIME_BEFORE_COUNTDOWN);
  }

  startCountdown() {
    if (!this.isCountingDown) {
      this.isCountingDown = true;
      this.countdownStartTime = Date.now();
    }
  }

  shouldStartGame() {
    if (!this.isCountingDown) return false;
    const elapsed = Date.now() - this.countdownStartTime;
    return elapsed >= COUNTDOWN_TIME;
  }

  startGame() {
    this.gameState.gameStarted = true;
    
    this.broadcastToAll({
      type: 'GAME_STARTED',
      players: this.gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        lives: p.lives
      })),
      mapWidth: 13,
      mapHeight: 13
    });
  }

  endGame(winnerId) {
    this.gameState.gameEnded = true;
    const winner = this.getPlayer(winnerId);

    this.broadcastToAll({
      type: 'GAME_ENDED',
      winner: {
        id: winner.id,
        name: winner.name
      }
    });
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  let currentPlayerId = null;
  let playerRoom = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data, (playerId, room) => {
        currentPlayerId = playerId;
        playerRoom = room;
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentPlayerId && playerRoom) {
      playerRoom.removePlayer(currentPlayerId);
      
      if (playerRoom.getPlayerCount() === 0) {
        gameRooms.delete(playerRoom.id);
        if (currentGameRoom === playerRoom) {
          currentGameRoom = null;
        }
      } else {
        playerRoom.broadcastToAll({
          type: 'PLAYERS_UPDATE',
          players: playerRoom.getPlayerList(),
          playerCount: playerRoom.getPlayerCount()
        });
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleMessage(ws, data, setPlayerInfo) {
  const { type } = data;

  switch (type) {
    case 'JOIN_GAME':
      handleJoinGame(ws, data, setPlayerInfo);
      break;

    case 'PLAYER_MOVE':
      handlePlayerMove(ws, data);
      break;

    case 'PLACE_BOMB':
      handlePlaceBomb(ws, data);
      break;

    case 'BOMB_EXPLODED':
      handleBombExplosion(ws, data);
      break;

    case 'POWERUP_COLLECTED':
      handlePowerUpCollected(ws, data);
      break;

    case 'PLAYER_DAMAGED':
      handlePlayerDamaged(ws, data);
      break;

    case 'CHAT_MESSAGE':
      handleChatMessage(ws, data);
      break;

    case 'START_GAME':
      handleStartGame(ws, data);
      break;

    case 'GAME_END':
      handleGameEnd(ws, data);
      break;

    default:
      console.warn('Unknown message type:', type);
  }
}

function handleJoinGame(ws, data, setPlayerInfo) {
  const { playerName } = data;

  // Create new game room if none exists or current is full
  if (!currentGameRoom || currentGameRoom.getPlayerCount() >= PLAYER_LIMIT) {
    const roomId = `room-${Date.now()}`;
    currentGameRoom = new GameRoom(roomId);
    gameRooms.set(roomId, currentGameRoom);
    console.log('Created new game room:', roomId);
  }

  const playerId = currentGameRoom.addPlayer(ws, { playerName });
  setPlayerInfo(playerId, currentGameRoom);

  // Send join confirmation to player
  ws.send(JSON.stringify({
    type: 'PLAYER_JOINED',
    playerId: playerId,
    players: currentGameRoom.getPlayerList(),
    playerCount: currentGameRoom.getPlayerCount()
  }));

  // Broadcast player list update to all
  currentGameRoom.broadcastToAll({
    type: 'PLAYERS_UPDATE',
    players: currentGameRoom.getPlayerList(),
    playerCount: currentGameRoom.getPlayerCount()
  });

  console.log(`Player ${playerId} (${playerName}) joined. Total: ${currentGameRoom.getPlayerCount()}`);
}

function handlePlayerMove(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const playerId = findPlayerIdByWs(room, ws);
  if (!playerId) return;

  const { x, y, direction } = data;
  const player = room.getPlayer(playerId);
  if (player) {
    player.x = x;
    player.y = y;
    if (direction) player.direction = direction;

    // Update game state
    const playerState = room.gameState.players.find(p => p.id === playerId);
    if (playerState) {
      playerState.x = x;
      playerState.y = y;
      if (direction) playerState.direction = direction;
    }

    // Broadcast to all players
    room.broadcastToAll({
      type: 'GAME_STATE_UPDATE',
      players: room.gameState.players
    });
  }
}

function handlePlaceBomb(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const playerId = findPlayerIdByWs(room, ws);
  if (!playerId) return;

  const { x, y } = data;
  const bombId = `bomb-${Date.now()}-${Math.random()}`;

  room.gameState.bombs.push({
    id: bombId,
    x: x,
    y: y,
    playerId: playerId,
    flameRange: room.getPlayer(playerId).flameRange,
    createdAt: Date.now()
  });

  room.broadcastToAll({
    type: 'BOMB_PLACED',
    bombId: bombId,
    x: x,
    y: y,
    playerId: playerId
  });
}

function handleBombExplosion(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const { bombId, x, y, affectedPlayers, destructedBlocks, explosionCells } = data;

  // Remove bomb from game state
  room.gameState.bombs = room.gameState.bombs.filter(b => b.id !== bombId);

  // Handle affected players
  affectedPlayers.forEach(playerId => {
    const player = room.getPlayer(playerId);
    if (player) {
      player.lives--;
      if (player.lives <= 0) {
        player.isAlive = false;
      }

      const playerState = room.gameState.players.find(p => p.id === playerId);
      if (playerState) {
        playerState.lives = player.lives;
        playerState.isAlive = player.isAlive;
      }
    }
  });

  // Handle destroyed blocks
  destructedBlocks.forEach(block => {
    // Random powerup spawn (30% chance)
    if (Math.random() < 0.3) {
      const types = ['bombs', 'flames', 'speed'];
      const type = types[Math.floor(Math.random() * types.length)];
      const powerupId = `powerup-${Date.now()}-${Math.random()}`;
      
      room.gameState.powerups.push({
        id: powerupId,
        x: block.x,
        y: block.y,
        type: type
      });
    }
  });

  // Create explosion entity
  const explosionId = `explosion-${Date.now()}`;
  room.gameState.explosions.push({
    id: explosionId,
    x: x,
    y: y,
    cells: explosionCells,
    createdAt: Date.now()
  });

  // Remove explosion after 500ms
  setTimeout(() => {
    room.gameState.explosions = room.gameState.explosions.filter(e => e.id !== explosionId);
  }, 500);

  // Broadcast explosion to all
  room.broadcastToAll({
    type: 'EXPLOSION',
    explosionId: explosionId,
    x: x,
    y: y,
    affectedPlayers: affectedPlayers,
    explosionCells: explosionCells
  });

  // Check if any players were eliminated
  const alivePlayers = room.gameState.players.filter(p => p.isAlive);
  if (alivePlayers.length === 1) {
    room.endGame(alivePlayers[0].id);
  }
}

function handlePowerUpCollected(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const { powerupId, playerId } = data;

  // Remove powerup
  room.gameState.powerups = room.gameState.powerups.filter(p => p.id !== powerupId);

  // Broadcast to all
  room.broadcastToAll({
    type: 'GAME_STATE_UPDATE',
    powerups: room.gameState.powerups
  });
}

function handlePlayerDamaged(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const { playerId, lives, isEliminated } = data;
  const playerState = room.gameState.players.find(p => p.id === playerId);
  
  if (playerState) {
    playerState.lives = lives;
    playerState.isAlive = !isEliminated;
  }

  // Check if game should end
  const alivePlayers = room.gameState.players.filter(p => p.isAlive);
  if (alivePlayers.length === 1) {
    room.endGame(alivePlayers[0].id);
  }
}

function handleChatMessage(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const playerId = findPlayerIdByWs(room, ws);
  const player = room.getPlayer(playerId);

  if (player) {
    room.broadcastToAll({
      type: 'CHAT_MESSAGE',
      playerId: playerId,
      playerName: player.name,
      message: data.message,
      timestamp: Date.now()
    });
  }
}

function handleStartGame(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  if (room.getPlayerCount() >= MIN_PLAYERS) {
    room.startGame();
  }
}

function handleGameEnd(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const { winnerId, winnerName } = data;
  room.endGame(winnerId);
}

function findRoomByWs(ws) {
  for (const room of gameRooms.values()) {
    for (const player of room.players.values()) {
      if (player.ws === ws) {
        return room;
      }
    }
  }
  return null;
}

function findPlayerIdByWs(room, ws) {
  for (const [playerId, player] of room.players) {
    if (player.ws === ws) {
      return playerId;
    }
  }
  return null;
}

// Game loop for server-side updates
setInterval(() => {
  gameRooms.forEach((room) => {
    if (!room.gameState.gameStarted) {
      // Check if game should start
      if (room.canStart()) {
        room.startCountdown();
      }

      if (room.shouldStartGame()) {
        room.startGame();
      }
    } else if (!room.gameState.gameEnded) {
      // Send periodic state updates during game
      room.broadcastToAll({
        type: 'GAME_STATE_UPDATE',
        players: room.gameState.players,
        bombs: room.gameState.bombs,
        explosions: room.gameState.explosions,
        powerups: room.gameState.powerups
      });
    }
  });
}, 100); // Update every 100ms (10 times per second)

// Start server
server.listen(PORT, () => {
  console.log(`Bomberman WebSocket server listening on ws://localhost:${PORT}`);
});
