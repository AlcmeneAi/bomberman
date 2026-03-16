/**
 * Game Logic and Engine
 * Handles game loop, physics, collision detection, and game state management
 */

import { Player, Bomb, PowerUp, Explosion, GameState } from './entities.js';

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
    this.movementDelay = 100; // ms between moves
    
    // Bind event listeners
    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      this.keysPressed[e.key.toLowerCase()] = true;
      
      // Handle bomb placement
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.handleBombPlacement();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  update(deltaTime) {
    if (!this.gameState.gameStarted || this.gameState.gameEnded) {
      return;
    }

    this.currentTime = Date.now();
    this.deltaTime = deltaTime;

    // Update explosions
    this.updateExplosions();

    // Remove expired bombs
    this.updateBombs();

    // Update player positions based on input
    this.updatePlayerMovement();

    // Check for collisions (player with powerups, explosions, etc.)
    this.updateCollisions();

    // Check for game end condition
    if (this.gameState.checkGameEnd()) {
      this.gameClient.send('GAME_END', {
        winnerId: this.gameState.winner.id,
        winnerName: this.gameState.winner.name
      });
    }
  }

  updateExplosions() {
    const explosionsToRemove = [];
    
    this.gameState.getAllExplosions().forEach(explosion => {
      if (!explosion.isActive(this.currentTime)) {
        explosionsToRemove.push(explosion.id);
      }
    });

    explosionsToRemove.forEach(explosionId => {
      this.gameState.removeExplosion(explosionId);
    });
  }

  updateBombs() {
    const bombsToExplode = [];
    
    this.gameState.getAllBombs().forEach(bomb => {
      if (bomb.isExploded(this.currentTime) && !bomb.exploded) {
        bomb.exploded = true;
        bombsToExplode.push(bomb);
      }
    });

    bombsToExplode.forEach(bomb => {
      this.handleBombExplosion(bomb);
    });
  }

  handleBombExplosion(bomb) {
    const explosionCells = [[bomb.x, bomb.y]];
    const destructedBlocks = [];
    const affectedPlayers = new Set();

    // Check explosion in all 4 directions
    const directions = [
      [0, -1], // up
      [0, 1],  // down
      [-1, 0], // left
      [1, 0]   // right
    ];

    directions.forEach(([dx, dy]) => {
      for (let i = 1; i <= bomb.flameRange; i++) {
        const x = bomb.x + dx * i;
        const y = bomb.y + dy * i;
        const tile = this.gameState.map.getTile(x, y);

        if (!tile || tile.type === 'wall') {
          break; // Stop spreading in this direction
        }

        explosionCells.push([x, y]);

        if (tile.type === 'block') {
          this.gameState.map.destroyBlock(x, y);
          destructedBlocks.push({ x, y });
          
          // Random powerup spawn
          if (Math.random() < 0.3) {
            const types = ['bombs', 'flames', 'speed'];
            const type = types[Math.floor(Math.random() * types.length)];
            const powerup = new PowerUp(this.generateId('powerup'), x, y, type);
            this.gameState.addPowerUp(powerup);
          }
          break; // Block stops explosion
        }
      }
    });

    // Check for players in explosion
    this.gameState.getAllPlayers().forEach(player => {
      if (explosionCells.some(([x, y]) => x === player.x && y === player.y)) {
        affectedPlayers.add(player.id);
      }
    });

    // Create explosion entity
    const explosion = new Explosion(this.generateId('explosion'), bomb.x, bomb.y);
    explosion.cells = explosionCells;
    this.gameState.addExplosion(explosion);

    // Remove bomb
    this.gameState.removeBomb(bomb.id);

    // Notify server
    this.gameClient.send('BOMB_EXPLODED', {
      bombId: bomb.id,
      x: bomb.x,
      y: bomb.y,
      affectedPlayers: Array.from(affectedPlayers),
      destructedBlocks,
      explosionCells
    });
  }

  handleBombPlacement() {
    const player = Array.from(this.gameState.players.values()).find(p => p.id === this.gameClient.playerId);
    
    if (player && player.canPlaceBomb()) {
      player.placeBomb();
      const bomb = new Bomb(
        this.generateId('bomb'),
        player.x,
        player.y,
        player.id,
        player.flameRange
      );
      
      this.gameState.addBomb(bomb);
      this.gameClient.placeBomb(player.x, player.y);
    }
  }

  updatePlayerMovement() {
    const currentTime = Date.now();
    
    if (currentTime - this.lastMoveTime < this.movementDelay) {
      return;
    }

    const player = Array.from(this.gameState.players.values()).find(p => p.id === this.gameClient.playerId);
    if (!player) return;

    let moved = false;
    let newX = player.x;
    let newY = player.y;
    let direction = 'idle';

    if (this.keysPressed['arrowup'] || this.keysPressed['w']) {
      newY = Math.max(0, player.y - 1);
      direction = 'up';
      moved = true;
    } else if (this.keysPressed['arrowdown'] || this.keysPressed['s']) {
      newY = Math.min(this.gameState.map.height - 1, player.y + 1);
      direction = 'down';
      moved = true;
    } else if (this.keysPressed['arrowleft'] || this.keysPressed['a']) {
      newX = Math.max(0, player.x - 1);
      direction = 'left';
      moved = true;
    } else if (this.keysPressed['arrowright'] || this.keysPressed['d']) {
      newX = Math.min(this.gameState.map.width - 1, player.x + 1);
      direction = 'right';
      moved = true;
    }

    player.direction = direction;

    if (moved && this.isPositionValid(newX, newY)) {
      player.x = newX;
      player.y = newY;
      this.lastMoveTime = currentTime;
      this.gameClient.playerMove(newX, newY, direction);
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
    const player = Array.from(this.gameState.players.values()).find(p => p.id === this.gameClient.playerId);
    if (!player) return;

    // Check powerup collision
    for (const powerup of this.gameState.getAllPowerUps()) {
      if (player.x === powerup.x && player.y === powerup.y) {
        this.applyPowerUp(player, powerup);
        this.gameState.removePowerUp(powerup.id);
        this.gameClient.send('POWERUP_COLLECTED', {
          powerupId: powerup.id,
          playerId: player.id
        });
      }
    }

    // Check explosion collision
    for (const explosion of this.gameState.getAllExplosions()) {
      if (explosion.cells.some(([x, y]) => x === player.x && y === player.y)) {
        if (player.takeDamage()) {
          player.isAlive = false;
          this.gameClient.send('PLAYER_DAMAGED', {
            playerId: player.id,
            lives: player.lives,
            isEliminated: true
          });
        } else {
          this.gameClient.send('PLAYER_DAMAGED', {
            playerId: player.id,
            lives: player.lives,
            isEliminated: false
          });
        }
      }
    }
  }

  applyPowerUp(player, powerup) {
    switch (powerup.type) {
      case 'bombs':
        player.addBombPowerUp();
        break;
      case 'flames':
        player.addFlamePowerUp();
        break;
      case 'speed':
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
      deltaTime: this.deltaTime
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
