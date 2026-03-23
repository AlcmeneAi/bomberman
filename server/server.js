/**
 * Bomberman WebSocket Server
 * Handles multiplayer game logic, player management, and game state synchronization
 */

const WebSocket = require("ws");
const http = require("http");

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
const MAP_WIDTH = 15;
const MAP_HEIGHT = 15;
const INNER_W = 13;
const INNER_H = 13;

/**
 * Generate the game map on the server so all players share the same layout.
 * Outer ring: wall_h (top/bottom) and wall_v (left/right sides).
 * Inner 13x13 playfield is offset by 1.
 */
function generateMap(width = MAP_WIDTH, height = MAP_HEIGHT) {
  const tiles = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Top and bottom border rows → horizontal wall
      if (y === 0 || y === height - 1) {
        tiles.push({ x, y, type: "wall_h" });
      }
      // Left and right border columns → vertical wall
      else if (x === 0 || x === width - 1) {
        tiles.push({ x, y, type: "wall_v" });
      }
      // Inner 13x13 playfield (shifted by 1)
      else {
        const ix = x - 1;
        const iy = y - 1;
        if (ix % 2 === 1 && iy % 2 === 1) {
          tiles.push({ x, y, type: "wall" });
        } else if (
          (ix <= 1 && iy <= 1) ||
          (ix >= INNER_W - 2 && iy <= 1) ||
          (ix <= 1 && iy >= INNER_H - 2) ||
          (ix >= INNER_W - 2 && iy >= INNER_H - 2)
        ) {
          tiles.push({ x, y, type: "empty" });
        } else if (Math.random() < 0.65) {
          tiles.push({ x, y, type: "block" });
        } else {
          tiles.push({ x, y, type: "empty" });
        }
      }
    }
  }

  return { width, height, tiles };
}

class GameRoom {
  constructor(roomId) {
    this.id = roomId;
    this.players = new Map();
    this.gameState = {
      map: generateMap(),
      players: [],
      bombs: [],
      explosions: [],
      powerups: [],
      gameStarted: false,
      gameEnded: false,
      winner: null,
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
      ws: ws,
    };

    // Set starting position based on player index (offset by 1 for border)
    const index = this.players.size;
    const positions = [
      { x: 1, y: 1, direction: "idle", facing: "right" },   // Top-left
      { x: 13, y: 1, direction: "idle", facing: "left" },   // Top-right
      { x: 1, y: 13, direction: "idle", facing: "right" },  // Bottom-left
      { x: 13, y: 13, direction: "idle", facing: "left" },  // Bottom-right
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
      direction: "idle",
      facing: index < positions.length ? positions[index].facing : "right",
    });

    return playerId;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.gameState.players = this.gameState.players.filter(
        (p) => p.id !== playerId,
      );
    }
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  broadcastToAll(message) {
    const data = JSON.stringify(message);
    this.players.forEach((player) => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    });
  }

  broadcastToOthers(senderId, message) {
    const data = JSON.stringify(message);
    this.players.forEach((player, playerId) => {
      if (
        playerId !== senderId &&
        player.ws &&
        player.ws.readyState === WebSocket.OPEN
      ) {
        player.ws.send(data);
      }
    });
  }

  getPlayerCount() {
    return this.players.size;
  }

  getPlayerList() {
    return Array.from(this.players.values()).map((p) => p.name);
  }

  canStart() {
    const count = this.getPlayerCount();
    const elapsed = Date.now() - this.startTime;

    // Can start if 4 players OR (2+ players and 20 seconds passed)
    return (
      count >= PLAYER_LIMIT ||
      (count >= MIN_PLAYERS && elapsed >= WAITING_TIME_BEFORE_COUNTDOWN)
    );
  }

  startCountdown() {
    if (!this.isCountingDown) {
      this.isCountingDown = true;
      this.countdownStartTime = Date.now();

      this.broadcastToAll({
        type: "COUNTDOWN_STARTED",
        countdownSeconds: COUNTDOWN_TIME / 1000,
      });
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
      type: "GAME_STARTED",
      players: this.gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        lives: p.lives,
      })),
      map: this.gameState.map,
    });
  }

  endGame(winnerId) {
    this.gameState.gameEnded = true;
    const winner = this.getPlayer(winnerId);

    this.broadcastToAll({
      type: "GAME_ENDED",
      winner: {
        id: winner.id,
        name: winner.name,
      },
    });
  }
}

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("Client connected");
  let currentPlayerId = null;
  let playerRoom = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data, (playerId, room) => {
        currentPlayerId = playerId;
        playerRoom = room;
      });
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (currentPlayerId && playerRoom) {
      playerRoom.removePlayer(currentPlayerId);

      if (playerRoom.getPlayerCount() === 0) {
        gameRooms.delete(playerRoom.id);
        if (currentGameRoom === playerRoom) {
          currentGameRoom = null;
        }
      } else {
        playerRoom.broadcastToAll({
          type: "PLAYERS_UPDATE",
          players: playerRoom.getPlayerList(),
          playerCount: playerRoom.getPlayerCount(),
        });
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

function handleMessage(ws, data, setPlayerInfo) {
  const { type } = data;

  switch (type) {
    case "JOIN_GAME":
      handleJoinGame(ws, data, setPlayerInfo);
      break;

    case "PLAYER_MOVE":
      handlePlayerMove(ws, data);
      break;

    case "PLACE_BOMB":
      handlePlaceBomb(ws, data);
      break;

    case "POWERUP_COLLECTED":
      handlePowerUpCollected(ws, data);
      break;

    case "CHAT_MESSAGE":
      handleChatMessage(ws, data);
      break;

    default:
      console.warn("Unknown message type:", type);
  }
}

function handleJoinGame(ws, data, setPlayerInfo) {
  const { playerName } = data;

  // Create new game room if none exists, current is full, or current game already started/ended
  if (
    !currentGameRoom ||
    currentGameRoom.getPlayerCount() >= PLAYER_LIMIT ||
    currentGameRoom.gameState.gameStarted ||
    currentGameRoom.gameState.gameEnded
  ) {
    const roomId = `room-${Date.now()}`;
    currentGameRoom = new GameRoom(roomId);
    gameRooms.set(roomId, currentGameRoom);
    console.log("Created new game room:", roomId);
  }

  // Check for duplicate name (case-sensitive)
  const existingNames = currentGameRoom.getPlayerList();
  if (existingNames.includes(playerName)) {
    ws.send(
      JSON.stringify({
        type: "JOIN_REJECTED",
        reason: "A player with that name already exists in the lobby.",
      }),
    );
    return;
  }

  const playerId = currentGameRoom.addPlayer(ws, { playerName });
  setPlayerInfo(playerId, currentGameRoom);

  // Start the 20s timer only when the minimum players (2) have joined
  if (currentGameRoom.getPlayerCount() === MIN_PLAYERS) {
    currentGameRoom.startTime = Date.now();
  }

  // Send join confirmation to player
  ws.send(
    JSON.stringify({
      type: "PLAYER_JOINED",
      playerId: playerId,
      players: currentGameRoom.getPlayerList(),
      playerCount: currentGameRoom.getPlayerCount(),
    }),
  );

  // Broadcast player list update to all
  currentGameRoom.broadcastToAll({
    type: "PLAYERS_UPDATE",
    players: currentGameRoom.getPlayerList(),
    playerCount: currentGameRoom.getPlayerCount(),
  });

  console.log(
    `Player ${playerId} (${playerName}) joined. Total: ${currentGameRoom.getPlayerCount()}`,
  );
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
    if (direction && direction !== "idle") player.facing = direction;

    // Update game state
    const playerState = room.gameState.players.find((p) => p.id === playerId);
    if (playerState) {
      playerState.x = x;
      playerState.y = y;
      if (direction) playerState.direction = direction;
      if (direction && direction !== "idle") playerState.facing = direction;
    }

    // Broadcast to all players
    room.broadcastToAll({
      type: "GAME_STATE_UPDATE",
      players: room.gameState.players,
    });
  }
}

function handlePlaceBomb(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const playerId = findPlayerIdByWs(room, ws);
  if (!playerId) return;

  const player = room.getPlayer(playerId);
  if (!player || !player.isAlive) return;

  const playerState = room.gameState.players.find((p) => p.id === playerId);
  if (!playerState) return;

  // Use server-authoritative position and stats
  const x = playerState.x;
  const y = playerState.y;

  // Validate: can place bomb?
  if ((playerState.bombsPlaced || 0) >= playerState.maxBombs) return;

  // Validate: no existing bomb at this position
  if (room.gameState.bombs.some((b) => b.x === x && b.y === y)) return;

  // Validate: position is walkable
  const tile = room.gameState.map.tiles.find((t) => t.x === x && t.y === y);
  if (!tile || tile.type === "wall" || tile.type === "block") return;

  playerState.bombsPlaced = (playerState.bombsPlaced || 0) + 1;
  player.bombsPlaced = playerState.bombsPlaced;

  const bombId = `bomb-${Date.now()}-${Math.random()}`;
  room.gameState.bombs.push({
    id: bombId,
    x: x,
    y: y,
    playerId: playerId,
    flameRange: playerState.flameRange,
    createdAt: Date.now(),
  });

  room.broadcastToAll({
    type: "BOMB_PLACED",
    bombId: bombId,
    x: x,
    y: y,
    playerId: playerId,
  });
}

/**
 * Server-authoritative bomb explosion.
 * Called by the game loop when a bomb's timer expires.
 */
function serverHandleBombExplosion(room, bomb) {
  const explosionCells = [[bomb.x, bomb.y]];
  const destructedBlocks = [];

  // Calculate explosion cells using server's authoritative map
  const directions = [
    [0, -1], // up
    [0, 1], // down
    [-1, 0], // left
    [1, 0], // right
  ];

  directions.forEach(([dx, dy]) => {
    for (let i = 1; i <= bomb.flameRange; i++) {
      const x = bomb.x + dx * i;
      const y = bomb.y + dy * i;

      // Out of bounds
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) break;

      const tile = room.gameState.map.tiles.find((t) => t.x === x && t.y === y);
      if (!tile || tile.type === "wall") break;

      explosionCells.push([x, y]);

      if (tile.type === "block") {
        tile.type = "empty";
        destructedBlocks.push({ x, y });

        // Server-only powerup spawn (30% chance)
        if (Math.random() < 0.3) {
          const types = ["bombs", "flames", "speed"];
          const type = types[Math.floor(Math.random() * types.length)];
          room.gameState.powerups.push({
            id: `powerup-${Date.now()}-${Math.random()}`,
            x,
            y,
            type,
          });
        }
        break; // Block stops explosion in this direction
      }
    }
  });

  // Remove bomb from game state
  room.gameState.bombs = room.gameState.bombs.filter((b) => b.id !== bomb.id);

  // Decrement placing player's bombsPlaced
  const bombOwner = room.getPlayer(bomb.playerId);
  const bombOwnerState = room.gameState.players.find(
    (p) => p.id === bomb.playerId,
  );
  if (bombOwner) {
    bombOwner.bombsPlaced = Math.max(0, (bombOwner.bombsPlaced || 1) - 1);
  }
  if (bombOwnerState) {
    bombOwnerState.bombsPlaced = Math.max(
      0,
      (bombOwnerState.bombsPlaced || 1) - 1,
    );
  }

  // Apply damage to affected players (server-authoritative positions)
  room.gameState.players.forEach((playerState) => {
    if (!playerState.isAlive) return;
    if (
      explosionCells.some(
        ([cx, cy]) => cx === playerState.x && cy === playerState.y,
      )
    ) {
      playerState.lives--;
      if (playerState.lives <= 0) {
        playerState.isAlive = false;
      }
      // Sync to player map object
      const player = room.getPlayer(playerState.id);
      if (player) {
        player.lives = playerState.lives;
        player.isAlive = playerState.isAlive;
      }
    }
  });

  // Create explosion entity
  const explosionId = `explosion-${Date.now()}-${Math.random()}`;
  room.gameState.explosions.push({
    id: explosionId,
    x: bomb.x,
    y: bomb.y,
    cells: explosionCells,
    createdAt: Date.now(),
  });

  // Broadcast destroyed blocks
  if (destructedBlocks.length > 0) {
    room.broadcastToAll({
      type: "BLOCKS_DESTROYED",
      blocks: destructedBlocks,
    });
  }

  // Broadcast explosion for immediate visual
  room.broadcastToAll({
    type: "EXPLOSION",
    explosionId: explosionId,
    x: bomb.x,
    y: bomb.y,
    cells: explosionCells,
  });

  // Check win condition (single authoritative check)
  const alivePlayers = room.gameState.players.filter((p) => p.isAlive);
  if (alivePlayers.length === 1 && room.gameState.players.length > 1) {
    room.endGame(alivePlayers[0].id);
  } else if (alivePlayers.length === 0 && room.gameState.players.length > 1) {
    // Draw — everyone died
    room.gameState.gameEnded = true;
    room.broadcastToAll({
      type: "GAME_ENDED",
      winner: null,
    });
  }

  // Chain explosions: check if explosion cells hit other bombs
  const chainBombs = room.gameState.bombs.filter((b) =>
    explosionCells.some(([cx, cy]) => cx === b.x && cy === b.y),
  );
  chainBombs.forEach((chainBomb) => {
    serverHandleBombExplosion(room, chainBomb);
  });
}

function handlePowerUpCollected(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const { powerupId, playerId } = data;

  // Find the powerup before removing it so we know its type
  const powerup = room.gameState.powerups.find((p) => p.id === powerupId);

  // Apply powerup effect to the server-side player state
  if (powerup) {
    const player = room.getPlayer(playerId);
    const playerState = room.gameState.players.find((p) => p.id === playerId);

    if (player && playerState) {
      switch (powerup.type) {
        case "speed":
          player.speed = Math.min((player.speed || 1) + 0.5, 3);
          playerState.speed = player.speed;
          break;
        case "bombs":
          player.maxBombs = (player.maxBombs || 1) + 1;
          playerState.maxBombs = player.maxBombs;
          break;
        case "flames":
          player.flameRange = (player.flameRange || 1) + 1;
          playerState.flameRange = player.flameRange;
          break;
      }
    }
  }

  // Remove powerup
  room.gameState.powerups = room.gameState.powerups.filter(
    (p) => p.id !== powerupId,
  );

  // Broadcast updated state to all
  room.broadcastToAll({
    type: "GAME_STATE_UPDATE",
    players: room.gameState.players,
    powerups: room.gameState.powerups,
  });
}

function handleChatMessage(ws, data) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const playerId = findPlayerIdByWs(room, ws);
  const player = room.getPlayer(playerId);

  if (player) {
    room.broadcastToAll({
      type: "CHAT_MESSAGE",
      playerId: playerId,
      playerName: player.name,
      message: data.message,
      timestamp: Date.now(),
    });
  }
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
        return; // Game just started, skip timer broadcast
      }

      // Broadcast lobby timer state to all clients
      const count = room.getPlayerCount();
      if (count > 0) {
        let phase, remainingSeconds;

        if (room.isCountingDown) {
          phase = "countdown";
          const elapsed = Date.now() - room.countdownStartTime;
          remainingSeconds = Math.max(
            0,
            Math.ceil((COUNTDOWN_TIME - elapsed) / 1000),
          );
        } else {
          phase = "waiting";
          const elapsed = Date.now() - room.startTime;
          remainingSeconds = Math.max(
            0,
            Math.ceil((WAITING_TIME_BEFORE_COUNTDOWN - elapsed) / 1000),
          );
        }

        room.broadcastToAll({
          type: "LOBBY_TIMER_UPDATE",
          phase: phase,
          remainingSeconds: remainingSeconds,
          playerCount: count,
        });
      }
    } else if (!room.gameState.gameEnded) {
      const now = Date.now();

      // Server-authoritative bomb timer: explode expired bombs
      const expiredBombs = room.gameState.bombs.filter(
        (b) => now - b.createdAt >= 3000,
      );
      expiredBombs.forEach((bomb) => {
        serverHandleBombExplosion(room, bomb);
      });

      // Clean up expired explosions (older than 500ms)
      room.gameState.explosions = room.gameState.explosions.filter(
        (e) => now - e.createdAt < 500,
      );

      // Send periodic state updates during game
      room.broadcastToAll({
        type: "GAME_STATE_UPDATE",
        players: room.gameState.players,
        bombs: room.gameState.bombs,
        explosions: room.gameState.explosions,
        powerups: room.gameState.powerups,
      });
    }
  });
}, 100); // Update every 100ms (10 times per second)

// Start server
server.listen(PORT, () => {
  console.log(`Bomberman WebSocket server listening on ws://localhost:${PORT}`);
});
