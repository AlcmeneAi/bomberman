/**
 * Game Logic and Engine
 * Handles game loop, physics, collision detection, and game state management
 */

export class GameEngine {
  constructor(gameState, gameClient) {
    this.gameState = gameState;
    this.gameClient = gameClient;
    this.currentTime = Date.now();
    this.deltaTime = 0;
    this.lastFrameTime = Date.now();
    this.frameCount = 0;
    this.fps = 60;
    this.targetFps = 60;
    this.perfStartTime = Date.now();
    this.isRunning = false;

    // Input handling
    this.keysPressed = {};
    this.lastMoveTime = 0;
    this.baseMovementDelay = 150; // ms between moves at speed 1
    this.lastSentDirection = null;

    // Bind event listeners
    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    document.addEventListener("keydown", (e) => {
      // Ignore keys when typing in an input field
      if (e.target.tagName === "INPUT") return;

      this.keysPressed[e.key.toLowerCase()] = true;

      // Handle bomb placement
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.handleBombPlacement();
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.target.tagName === "INPUT") return;
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  update(deltaTime) {
    if (!this.gameState.gameStarted || this.gameState.gameEnded) {
      return;
    }

    this.currentTime = Date.now();
    this.deltaTime = deltaTime;

    // Update player positions based on input
    this.updatePlayerMovement();

    // Check for collisions (player with powerups)
    this.updateCollisions();
  }

  handleBombPlacement() {
    const player = Array.from(this.gameState.players.values()).find(
      (p) => p.id === this.gameClient.playerId,
    );

    if (player && player.isAlive && player.canPlaceBomb()) {
      this.gameClient.placeBomb(player.x, player.y);
    }
  }

  updatePlayerMovement() {
    const currentTime = Date.now();

    const player = Array.from(this.gameState.players.values()).find(
      (p) => p.id === this.gameClient.playerId,
    );
    if (!player || !player.isAlive) return;

    const movementDelay = this.baseMovementDelay / (player.speed || 1);

    let direction = "idle";
    let moved = false;
    let newX = player.x;
    let newY = player.y;

    if (this.keysPressed["arrowup"] || this.keysPressed["w"]) {
      direction = "up";
      moved = true;
    } else if (this.keysPressed["arrowdown"] || this.keysPressed["s"]) {
      direction = "down";
      moved = true;
    } else if (this.keysPressed["arrowleft"] || this.keysPressed["a"]) {
      direction = "left";
      moved = true;
    } else if (this.keysPressed["arrowright"] || this.keysPressed["d"]) {
      direction = "right";
      moved = true;
    }

    // Send idle transition immediately (bypass throttle)
    if (direction === "idle" && this.lastSentDirection !== "idle") {
      player.direction = "idle";
      this.gameClient.playerMove(player.x, player.y, "idle");
      this.lastSentDirection = "idle";
      return;
    }

    if (!moved) return;
    if (currentTime - this.lastMoveTime < movementDelay) return;

    if (direction === "up") {
      newY = Math.max(0, player.y - 1);
    } else if (direction === "down") {
      newY = Math.min(this.gameState.map.height - 1, player.y + 1);
    } else if (direction === "left") {
      newX = Math.max(0, player.x - 1);
    } else if (direction === "right") {
      newX = Math.min(this.gameState.map.width - 1, player.x + 1);
    }

    player.direction = direction;
    if (direction !== "idle") {
      player.facing = direction;
    }

    if (this.isPositionValid(newX, newY)) {
      player.x = newX;
      player.y = newY;
      this.lastMoveTime = currentTime;
      this.gameClient.playerMove(newX, newY, direction);
      this.lastSentDirection = direction;
    }
  }

  isPositionValid(x, y) {
    // Check map bounds
    if (!this.gameState.map.isWalkable(x, y)) {
      return false;
    }

    // Check collision with other players
    for (const player of this.gameState.getAllPlayers()) {
      if (player.x === x && player.y === y) {
        return false;
      }
    }

    // Check collision with bombs
    for (const bomb of this.gameState.getAllBombs()) {
      if (bomb.x === x && bomb.y === y) {
        return false;
      }
    }

    return true;
  }

  updateCollisions() {
    const player = Array.from(this.gameState.players.values()).find(
      (p) => p.id === this.gameClient.playerId,
    );
    if (!player || !player.isAlive) return;

    // Check powerup collision
    for (const powerup of this.gameState.getAllPowerUps()) {
      if (player.x === powerup.x && player.y === powerup.y) {
        this.applyPowerUp(player, powerup);
        this.gameState.removePowerUp(powerup.id);
        this.gameClient.send("POWERUP_COLLECTED", {
          powerupId: powerup.id,
          playerId: player.id,
        });
      }
    }
  }

  applyPowerUp(player, powerup) {
    switch (powerup.type) {
      case "bombs":
        player.addBombPowerUp();
        break;
      case "flames":
        player.addFlamePowerUp();
        break;
      case "speed":
        player.addSpeedPowerUp();
        break;
    }
  }

  generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getPerformanceMetrics() {
    const now = Date.now();
    this.frameCount++;

    if (now - this.perfStartTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.perfStartTime = now;
    }

    return {
      fps: this.fps,
      deltaTime: this.deltaTime,
    };
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
  }
}

export default GameEngine;
