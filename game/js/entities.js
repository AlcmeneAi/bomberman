/**
 * Game Classes for Bomberman
 * Includes Player, Bomb, Map, and Game entities
 */

export class Player {
  constructor(id, name, x, y) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.lives = 3;
    this.maxBombs = 1;
    this.bombsPlaced = 0;
    this.flameRange = 1;
    this.speed = 1;
    this.direction = 'idle'; // idle, up, down, left, right
    this.isAlive = true;
  }

  move(newX, newY, isValid) {
    if (isValid(newX, newY)) {
      this.x = newX;
      this.y = newY;
      return true;
    }
    return false;
  }

  canPlaceBomb() {
    return this.bombsPlaced < this.maxBombs;
  }

  placeBomb() {
    if (this.canPlaceBomb()) {
      this.bombsPlaced++;
      return true;
    }
    return false;
  }

  removeBomb() {
    if (this.bombsPlaced > 0) {
      this.bombsPlaced--;
    }
  }

  takeDamage() {
    this.lives--;
    return this.lives <= 0;
  }

  addBombPowerUp() {
    this.maxBombs++;
  }

  addFlamePowerUp() {
    this.flameRange++;
  }

  addSpeedPowerUp() {
    this.speed = Math.min(this.speed + 0.5, 3);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      lives: this.lives,
      maxBombs: this.maxBombs,
      bombsPlaced: this.bombsPlaced,
      flameRange: this.flameRange,
      speed: this.speed,
      direction: this.direction,
      isAlive: this.isAlive,
    };
  }
}

export class Bomb {
  constructor(id, x, y, playerId, flameRange = 1) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.playerId = playerId;
    this.flameRange = flameRange;
    this.timer = 3000; // 3 seconds
    this.createdAt = Date.now();
    this.exploded = false;
  }

  isExploded(currentTime) {
    return currentTime - this.createdAt >= this.timer;
  }

  toJSON() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      playerId: this.playerId,
      flameRange: this.flameRange,
    };
  }
}

export class PowerUp {
  constructor(id, x, y, type) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type; // 'bombs', 'flames', 'speed'
  }

  toJSON() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
    };
  }
}

export class Explosion {
  constructor(id, x, y, duration = 500) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.duration = duration;
    this.createdAt = Date.now();
    this.cells = [[x, y]]; // Cells affected by explosion
  }

  isActive(currentTime) {
    return currentTime - this.createdAt < this.duration;
  }

  toJSON() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      cells: this.cells,
    };
  }
}

export class GameMap {
  constructor(width = 13, height = 13) {
    this.width = width;
    this.height = height;
    this.tiles = this.initializeTiles();
  }

  initializeTiles() {
    const tiles = [];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Create walls at even positions (classic Bomberman pattern)
        if (x % 2 === 1 && y % 2 === 1) {
          tiles.push({
            x,
            y,
            type: 'wall', // Indestructible
          });
        }
        // Create safe zones in corners (no blocks)
        else if (
          (x <= 1 && y <= 1) ||
          (x >= this.width - 2 && y <= 1) ||
          (x <= 1 && y >= this.height - 2) ||
          (x >= this.width - 2 && y >= this.height - 2)
        ) {
          tiles.push({
            x,
            y,
            type: 'empty',
          });
        }
        // Randomly place destructible blocks
        else if (Math.random() < 0.65) {
          tiles.push({
            x,
            y,
            type: 'block', // Destructible
          });
        }
        // Empty space
        else {
          tiles.push({
            x,
            y,
            type: 'empty',
          });
        }
      }
    }
    
    return tiles;
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { type: 'wall' };
    }
    return this.tiles.find(t => t.x === x && t.y === y);
  }

  getTilesByType(type) {
    return this.tiles.filter(t => t.type === type);
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    const tile = this.getTile(x, y);
    return tile && tile.type === 'empty';
  }

  destroyBlock(x, y) {
    const tile = this.getTile(x, y);
    if (tile && tile.type === 'block') {
      tile.type = 'empty';
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles,
    };
  }
}

export class GameState {
  constructor(mapWidth = 13, mapHeight = 13) {
    this.map = new GameMap(mapWidth, mapHeight);
    this.players = new Map(); // playerId -> Player
    this.bombs = new Map(); // bombId -> Bomb
    this.explosions = new Map(); // explosionId -> Explosion
    this.powerups = new Map(); // powerupId -> PowerUp
    this.gameStarted = false;
    this.gameEnded = false;
    this.winner = null;
    this.nextBombId = 0;
    this.nextExplosionId = 0;
    this.nextPowerUpId = 0;
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  addBomb(bomb) {
    this.bombs.set(bomb.id, bomb);
  }

  removeBomb(bombId) {
    const bomb = this.bombs.get(bombId);
    if (bomb) {
      const player = this.getPlayer(bomb.playerId);
      if (player) {
        player.removeBomb();
      }
    }
    this.bombs.delete(bombId);
  }

  getBomb(bombId) {
    return this.bombs.get(bombId);
  }

  getAllBombs() {
    return Array.from(this.bombs.values());
  }

  addExplosion(explosion) {
    this.explosions.set(explosion.id, explosion);
  }

  removeExplosion(explosionId) {
    this.explosions.delete(explosionId);
  }

  getExplosion(explosionId) {
    return this.explosions.get(explosionId);
  }

  getAllExplosions() {
    return Array.from(this.explosions.values());
  }

  addPowerUp(powerup) {
    this.powerups.set(powerup.id, powerup);
  }

  removePowerUp(powerupId) {
    this.powerups.delete(powerupId);
  }

  getPowerUp(powerupId) {
    return this.powerups.get(powerupId);
  }

  getAllPowerUps() {
    return Array.from(this.powerups.values());
  }

  getAlivePlayers() {
    return this.getAllPlayers().filter(p => p.isAlive);
  }

  checkGameEnd() {
    const alivePlayers = this.getAlivePlayers();
    if (alivePlayers.length === 1) {
      this.gameEnded = true;
      this.winner = alivePlayers[0];
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      map: this.map.toJSON(),
      players: Array.from(this.players.values()).map(p => p.toJSON()),
      bombs: Array.from(this.bombs.values()).map(b => b.toJSON()),
      explosions: Array.from(this.explosions.values()).map(e => e.toJSON()),
      powerups: Array.from(this.powerups.values()).map(p => p.toJSON()),
      gameStarted: this.gameStarted,
      gameEnded: this.gameEnded,
      winner: this.winner ? this.winner.toJSON() : null,
    };
  }
}

export default { Player, Bomb, PowerUp, Explosion, GameMap, GameState };
