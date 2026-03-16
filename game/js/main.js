/**
 * Main Application Entry Point for Bomberman Game
 * Manages overall game flow and state
 */

import Mini from './mini.js';
import GameClient from './client.js';
import { GameEngine } from './engine.js';
import { GameState, Player } from './entities.js';
import {
  LoginScreen,
  WaitingRoom,
  GameScreen,
  EndGameScreen,
  PerformanceMonitor
} from './ui.js';

class BombermanGame {
  constructor() {
    this.app = Mini();
    this.client = new GameClient('ws://localhost:8080');
    this.gameState = new GameState();
    this.gameEngine = null;
    this.mounted = false;
    
    // UI State
    this.screen = 'login'; // 'login', 'waiting', 'game', 'end'
    this.playerName = '';
    this.playerCount = 0;
    this.playerList = [];
    this.waitingRoomTimer = 0;
    this.waitingStartTime = 0;
    this.isCountingDown = false;
    this.countdownStartTime = 0;
    this.chatMessages = [];
    this.gameStartTime = 0;
    
    // Performance monitoring
    this.lastFrameTime = Date.now();
    this.deltaTime = 0;
    this.fps = 60;
    this.frameCount = 0;
    this.perfStartTime = Date.now();

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Server events
    this.client.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      this.onPlayerJoined(data);
    });

    this.client.on('playersUpdate', (data) => {
      console.log('Players update:', data);
      this.playerList = data.players;
      this.playerCount = data.playerCount;
      this.app.render();
    });

    this.client.on('gameStarted', (data) => {
      console.log('Game started:', data);
      this.gameStarted(data);
    });

    this.client.on('gameStateUpdate', (data) => {
      console.log('Game state update:', data);
      this.onGameStateUpdate(data);
    });

    this.client.on('gameEnded', (data) => {
      console.log('Game ended:', data);
      this.onGameEnded(data);
    });

    this.client.on('chatMessage', (data) => {
      console.log('Chat message:', data);
      this.chatMessages.push({
        author: data.playerName,
        text: data.message
      });
      if (this.chatMessages.length > 20) {
        this.chatMessages.shift();
      }
      this.app.render();
    });

    this.client.on('disconnected', () => {
      console.log('Disconnected from server');
      alert('Disconnected from server. Please refresh the page.');
    });
  }

  async initialize() {
    try {
      console.log('Initializing game...');
      await this.client.connect();
      console.log('Connected to server');
      this.startGameLoop();
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect to server. Make sure the server is running on ws://localhost:8080');
    }
  }

  onPlayerJoined(data) {
    this.client.playerId = data.playerId;
    this.playerList = data.players || [this.playerName];
    this.playerCount = this.playerList.length;
    
    // Start waiting room timer if not already started
    if (this.waitingStartTime === 0) {
      this.waitingStartTime = Date.now();
    }

    this.app.render();
  }

  gameStarted(data) {
    this.screen = 'game';
    this.gameState = new GameState();
    this.gameState.gameStarted = true;
    this.gameStartTime = Date.now();

    // Initialize players
    data.players.forEach((playerData, index) => {
      const player = new Player(
        playerData.id,
        playerData.name,
        playerData.x,
        playerData.y
      );
      this.gameState.addPlayer(player);
    });

    // Initialize game engine
    this.gameEngine = new GameEngine(this.gameState, this.client);
    this.gameEngine.start();

    this.chatMessages = [];
    this.startGameLoop();
    this.app.render();
  }

  onGameStateUpdate(data) {
    if (!this.gameState) return;

    // Update players
    if (data.players) {
      data.players.forEach(playerData => {
        const player = this.gameState.getPlayer(playerData.id);
        if (player) {
          player.x = playerData.x;
          player.y = playerData.y;
          player.lives = playerData.lives;
          player.isAlive = playerData.isAlive;
          player.maxBombs = playerData.maxBombs;
          player.flameRange = playerData.flameRange;
        }
      });
    }

    // Update bombs
    if (data.bombs) {
      // Clear old bombs and add new ones
      this.gameState.bombs.clear();
      data.bombs.forEach(bombData => {
        this.gameState.addBomb({
          id: bombData.id,
          x: bombData.x,
          y: bombData.y,
          playerId: bombData.playerId,
          flameRange: bombData.flameRange,
          createdAt: Date.now(),
          exploded: false,
          timer: 3000,
          isExploded: function(currentTime) {
            return currentTime - this.createdAt >= this.timer;
          }
        });
      });
    }

    // Update powerups
    if (data.powerups) {
      this.gameState.powerups.clear();
      data.powerups.forEach(powerupData => {
        this.gameState.addPowerUp({
          id: powerupData.id,
          x: powerupData.x,
          y: powerupData.y,
          type: powerupData.type,
          toJSON: function() {
            return {
              id: this.id,
              x: this.x,
              y: this.y,
              type: this.type
            };
          }
        });
      });
    }
  }

  onGameEnded(data) {
    this.screen = 'end';
    this.gameState.gameEnded = true;
    this.gameState.winner = data.winner;
    this.gameEngine.stop();
    this.app.render();
  }

  handleJoinGame(nickname) {
    console.log('Joining game with nickname:', nickname);
    this.playerName = nickname;
    this.screen = 'waiting';
    this.render();
    console.log('Sending JOIN_GAME message...');
    this.client.joinGame(nickname);
  }

  handleSendChat(message) {
    if (message.trim()) {
      this.client.sendChat(message);
    }
  }

  startGameLoop() {
    const gameLoop = () => {
      const now = Date.now();
      this.deltaTime = now - this.lastFrameTime;
      this.lastFrameTime = now;

      // Update game logic
      if (this.gameEngine && this.gameEngine.isRunning) {
        this.gameEngine.update(this.deltaTime);
      }

      // Update performance metrics
      this.updatePerformanceMetrics();

      // Check for waiting room timers
      if (this.screen === 'waiting') {
        this.updateWaitingRoomTimer();
      }

      // Render UI
      this.render();

      // Continue loop
      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }

  updateWaitingRoomTimer() {
    const elapsed = Date.now() - this.waitingStartTime;
    const twentySeconds = 20000;
    const tenSeconds = 10000;

    if (this.playerCount >= 4) {
      // 4 players, start 10 second countdown
      if (!this.isCountingDown) {
        this.isCountingDown = true;
        this.countdownStartTime = Date.now();
      }
      this.waitingRoomTimer = Date.now() - this.countdownStartTime;
    } else if (elapsed >= twentySeconds && this.playerCount >= 2) {
      // 20 seconds passed and at least 2 players, start 10 second countdown
      if (!this.isCountingDown) {
        this.isCountingDown = true;
        this.countdownStartTime = Date.now();
      }
      this.waitingRoomTimer = Date.now() - this.countdownStartTime;
    }

    // Start game if countdown reaches 10 seconds
    if (this.isCountingDown && this.waitingRoomTimer >= 10000 && this.playerCount >= 2) {
      this.client.send('START_GAME', {});
    }
  }

  updatePerformanceMetrics() {
    this.frameCount++;
    const now = Date.now();

    if (now - this.perfStartTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.perfStartTime = now;
    }
  }

  handlePlayAgain() {
    // Reset and go back to login
    this.screen = 'login';
    this.playerName = '';
    this.playerCount = 0;
    this.playerList = [];
    this.waitingStartTime = 0;
    this.isCountingDown = false;
    this.chatMessages = [];
    this.gameState = new GameState();
    this.app.render();
  }

  render() {
    const self = this;
    
    // Create a render function that mini-framework will call
    const renderFunction = () => {
      let screenComponent;

      switch (self.screen) {
        case 'login':
          return self.app.createElement('div', { class: 'login-screen' }, [
            self.app.createElement('div', { class: 'login-container' }, [
              self.app.createElement('h1', {}, ['💣 BOMBERMAN']),
              self.app.createElement('p', {}, ['Enter your nickname to join the game']),
              self.app.createElement('input', {
                type: 'text',
                id: 'nickname-input',
                placeholder: 'Enter your nickname',
                maxlength: '20',
                onKeyPress: (e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    self.handleJoinGame(e.target.value.trim());
                  }
                }
              }, []),
              self.app.createElement('button', {
                onClick: () => {
                  const input = document.getElementById('nickname-input');
                  if (input && input.value.trim()) {
                    self.handleJoinGame(input.value.trim());
                  }
                }
              }, ['JOIN GAME'])
            ])
          ]);

        case 'waiting':
          let timerText = '';
          if (self.playerCount < 2) {
            timerText = 'Waiting for players... (need at least 2)';
          } else if (self.isCountingDown) {
            timerText = `Game starting in ${Math.ceil(self.waitingRoomTimer / 1000)}s`;
          } else {
            timerText = 'Waiting for more players or countdown...';
          }

          return self.app.createElement('div', { class: 'waiting-room' }, [
            self.app.createElement('div', { class: 'waiting-container' }, [
              self.app.createElement('h1', {}, ['WAITING FOR PLAYERS']),
              self.app.createElement('div', { class: 'player-counter' }, [`${self.playerCount} / 4`]),
              self.app.createElement('div', { class: 'player-list' }, 
                self.playerList.map((player, idx) => 
                  self.app.createElement('div', { class: 'player-item' }, [`${idx + 1}. ${player}`])
                )
              ),
              self.app.createElement('div', { class: 'timer' }, [timerText])
            ])
          ]);

        case 'game':
          const gameData = self.gameState.toJSON();
          const currentPlayer = self.gameState.getPlayer(self.client.playerId);
          const tiles = gameData.map?.tiles || [];
          const players = gameData.players || [];
          const bombs = gameData.bombs || [];

          return self.app.createElement('div', { class: 'game-screen' }, [
            self.app.createElement('div', { class: 'game-container' }, [
              self.app.createElement('div', { class: 'game-board' }, [
                ...tiles.map(tile => 
                  self.app.createElement('div', { 
                    class: `tile ${tile.type}`,
                    style: `grid-column: ${tile.x + 1}; grid-row: ${tile.y + 1};`
                  }, [])
                ),
                ...players.filter(p => p.isAlive).map((player, idx) => 
                  self.app.createElement('div', {
                    class: `player player-${idx}`,
                    style: `position: absolute; top: ${player.y * 40 + 2}px; left: ${player.x * 40 + 2}px;`
                  }, [player.name.charAt(0).toUpperCase()])
                )
              ])
            ]),
            self.app.createElement('div', { class: 'sidebar' }, [
              currentPlayer ? self.app.createElement('div', { class: 'player-stats' }, [
                self.app.createElement('div', { class: 'stat-item' }, [
                  self.app.createElement('span', { class: 'stat-label' }, ['LIVES: ']),
                  self.app.createElement('span', { class: 'stat-value' }, ['❤️'.repeat(currentPlayer.lives || 3)])
                ])
              ]) : self.app.createElement('div', {}, []),
              self.app.createElement('div', { class: 'chat-section' }, [
                self.app.createElement('div', { class: 'chat-title' }, ['💬 CHAT']),
                self.app.createElement('div', { class: 'chat-messages' }, 
                  self.chatMessages.map(msg => 
                    self.app.createElement('div', { class: 'chat-message' }, [
                      self.app.createElement('span', { class: 'chat-message-author' }, [msg.author + ': ']),
                      self.app.createElement('span', { class: 'chat-message-text' }, [msg.text])
                    ])
                  )
                )
              ])
            ])
          ]);

        case 'end':
          return self.app.createElement('div', { class: 'end-game-screen' }, [
            self.app.createElement('div', { class: 'end-game-container' }, [
              self.app.createElement('h1', {}, ['GAME OVER']),
              self.gameState.winner ? 
                self.app.createElement('div', { class: 'winner' }, [`🏆 ${self.gameState.winner.name} WINS! 🏆`]) :
                self.app.createElement('div', {}, ['No winner']),
              self.app.createElement('button', {
                class: 'end-game-button',
                onClick: () => self.handlePlayAgain()
              }, ['PLAY AGAIN'])
            ])
          ]);

        default:
          return self.app.createElement('div', {}, ['Loading...']);
      }
    };

    // Mount or re-render
    if (!this.mounted) {
      console.log('🎮 Mounting app to #app div');
      this.app.mount(renderFunction, document.getElementById('app'));
      this.mounted = true;
    } else {
      this.app.render();
    }
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎮 DOM loaded, initializing Bomberman game...');
  try {
    const game = new BombermanGame();
    console.log('✅ Game instance created');
    await game.initialize();
    console.log('✅ Game initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing game:', error);
  }
});

export default BombermanGame;
