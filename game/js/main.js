/**
 * Main Application Entry Point for Bomberman Game
 * Manages overall game flow and state
 */

import Mini from "./mini.js";
import GameClient from "./client.js";
import { GameEngine } from "./engine.js";
import { GameState, Player } from "./entities.js";
import {
  LoginScreen,
  WaitingRoom,
  GameScreen,
  EndGameScreen,
  PerformanceMonitor,
} from "./ui.js";

class BombermanGame {
  constructor() {
    this.app = Mini();
    this.client = new GameClient("ws://localhost:8080");
    this.gameState = new GameState();
    this.gameEngine = null;
    this.mounted = false;

    // UI State
    this.screen = "login"; // 'login', 'waiting', 'game', 'end'
    this.playerName = "";
    this.playerCount = 0;
    this.playerList = [];
    this.lobbyPhase = "waiting"; // 'waiting' or 'countdown'
    this.lobbyRemainingSeconds = 0;
    this.chatMessages = [];
    this.gameStartTime = 0;

    // Dirty flag for render gating
    this.needsRender = true;

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
    this.client.on("playerJoined", (data) => {
      console.log("Player joined:", data);
      this.onPlayerJoined(data);
    });

    this.client.on("playersUpdate", (data) => {
      console.log("Players update:", data);
      this.playerList = data.players;
      this.playerCount = data.playerCount;
      this.markDirty();
    });

    this.client.on("gameStarted", (data) => {
      console.log("Game started:", data);
      this.gameStarted(data);
    });

    this.client.on("gameStateUpdate", (data) => {
      console.log("Game state update:", data);
      this.onGameStateUpdate(data);
    });

    this.client.on("gameEnded", (data) => {
      console.log("Game ended:", data);
      this.onGameEnded(data);
    });

    this.client.on("chatMessage", (data) => {
      console.log("Chat message:", data);
      this.chatMessages.push({
        author: data.playerName,
        text: data.message,
      });
      if (this.chatMessages.length > 20) {
        this.chatMessages.shift();
      }
      this.markDirty();
    });

    this.client.on("blocksDestroyed", (data) => {
      if (!this.gameState || !this.gameState.map) return;
      data.blocks.forEach((block) => {
        this.gameState.map.destroyBlock(block.x, block.y);
      });
      this.markDirty();
    });

    this.client.on("explosion", (data) => {
      if (!this.gameState) return;
      this.gameState.addExplosion({
        id: data.explosionId,
        x: data.x,
        y: data.y,
        cells: data.cells || [[data.x, data.y]],
        createdAt: Date.now(),
        isActive: function (currentTime) {
          return currentTime - this.createdAt < 500;
        },
        toJSON: function () {
          return {
            id: this.id,
            x: this.x,
            y: this.y,
            cells: this.cells,
          };
        },
      });
      this.markDirty();
    });

    this.client.on("lobbyTimerUpdate", (data) => {
      this.lobbyPhase = data.phase;
      this.lobbyRemainingSeconds = data.remainingSeconds;
      this.playerCount = data.playerCount;
      this.markDirty();
    });

    this.client.on("countdownStarted", (data) => {
      this.lobbyPhase = "countdown";
      this.lobbyRemainingSeconds = data.countdownSeconds;
      this.markDirty();
    });

    this.client.on("disconnected", () => {
      console.log("Disconnected from server");
      alert("Disconnected from server. Please refresh the page.");
    });
  }

  async initialize() {
    try {
      console.log("Initializing game...");
      await this.client.connect();
      console.log("Connected to server");
      this.startGameLoop();
    } catch (error) {
      console.error("Failed to connect:", error);
      alert(
        "Failed to connect to server. Make sure the server is running on ws://localhost:8080",
      );
    }
  }

  onPlayerJoined(data) {
    this.client.playerId = data.playerId;
    this.playerList = data.players || [this.playerName];
    this.playerCount = this.playerList.length;
    this.markDirty();
  }

  gameStarted(data) {
    this.screen = "game";
    this.gameState = new GameState(13, 13, data.map);
    this.gameState.gameStarted = true;
    this.gameStartTime = Date.now();

    // Initialize players
    data.players.forEach((playerData, index) => {
      const player = new Player(
        playerData.id,
        playerData.name,
        playerData.x,
        playerData.y,
      );
      this.gameState.addPlayer(player);
    });

    // Initialize game engine
    this.gameEngine = new GameEngine(this.gameState, this.client);
    this.gameEngine.start();

    this.chatMessages = [];
    this.startGameLoop();
    this.markDirty();
  }

  onGameStateUpdate(data) {
    if (!this.gameState) return;

    // Update players
    if (data.players) {
      data.players.forEach((playerData) => {
        const player = this.gameState.getPlayer(playerData.id);
        if (player) {
          player.x = playerData.x;
          player.y = playerData.y;
          player.lives = playerData.lives;
          player.isAlive = playerData.isAlive;
          player.maxBombs = playerData.maxBombs;
          player.flameRange = playerData.flameRange;
          player.speed = playerData.speed;
          player.direction = playerData.direction || "idle";
          player.facing = playerData.facing || player.facing;
        }
      });
    }

    // Update bombs
    if (data.bombs) {
      // Clear old bombs and add new ones
      this.gameState.bombs.clear();
      data.bombs.forEach((bombData) => {
        this.gameState.addBomb({
          id: bombData.id,
          x: bombData.x,
          y: bombData.y,
          playerId: bombData.playerId,
          flameRange: bombData.flameRange,
          createdAt: Date.now(),
          exploded: false,
          timer: 3000,
          isExploded: function (currentTime) {
            return currentTime - this.createdAt >= this.timer;
          },
        });
      });
    }

    // Update powerups
    if (data.powerups) {
      this.gameState.powerups.clear();
      data.powerups.forEach((powerupData) => {
        this.gameState.addPowerUp({
          id: powerupData.id,
          x: powerupData.x,
          y: powerupData.y,
          type: powerupData.type,
          toJSON: function () {
            return {
              id: this.id,
              x: this.x,
              y: this.y,
              type: this.type,
            };
          },
        });
      });
    }

    // Update explosions
    if (data.explosions) {
      this.gameState.explosions.clear();
      data.explosions.forEach((explosionData) => {
        this.gameState.addExplosion({
          id: explosionData.id,
          x: explosionData.x,
          y: explosionData.y,
          cells: explosionData.cells || [[explosionData.x, explosionData.y]],
          createdAt: Date.now(),
          isActive: function (currentTime) {
            return currentTime - this.createdAt < 500;
          },
          toJSON: function () {
            return {
              id: this.id,
              x: this.x,
              y: this.y,
              cells: this.cells,
            };
          },
        });
      });
    }

    this.markDirty();
  }

  onGameEnded(data) {
    this.screen = "end";
    this.gameState.gameEnded = true;
    this.gameState.winner = data.winner;
    this.gameEngine.stop();
    this.markDirty();
  }

  markDirty() {
    this.needsRender = true;
  }

  handleJoinGame(nickname) {
    console.log("Joining game with nickname:", nickname);
    this.playerName = nickname;
    this.screen = "waiting";
    this.markDirty();
    this.render();
    console.log("Sending JOIN_GAME message...");
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

      // Render UI only when state has changed
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }

      // Continue loop
      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }

  updatePerformanceMetrics() {
    this.frameCount++;
    const now = Date.now();

    if (now - this.perfStartTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.perfStartTime = now;

      // Update FPS display
      if (!this.fpsElement) {
        this.fpsElement = document.createElement("div");
        this.fpsElement.className = "performance-monitor";
        document.body.appendChild(this.fpsElement);
      }
      this.fpsElement.textContent = `FPS: ${this.fps}`;
    }
  }

  handlePlayAgain() {
    // Reset and go back to login
    this.screen = "login";
    this.playerName = "";
    this.playerCount = 0;
    this.playerList = [];
    this.lobbyPhase = "waiting";
    this.lobbyRemainingSeconds = 0;
    this.chatMessages = [];
    this.gameState = new GameState();
    this.markDirty();
  }

  render() {
    const self = this;

    // Create a render function that mini-framework will call
    const renderFunction = () => {
      let screenComponent;

      switch (self.screen) {
        case "login":
          return self.app.createElement("div", { class: "login-screen" }, [
            self.app.createElement("div", { class: "login-container" }, [
              self.app.createElement("h1", {}, ["💣 BOMBERMAN"]),
              self.app.createElement("p", {}, [
                "Enter your nickname to join the game",
              ]),
              self.app.createElement(
                "input",
                {
                  type: "text",
                  id: "nickname-input",
                  placeholder: "Enter your nickname",
                  maxlength: "20",
                  onKeyPress: (e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      self.handleJoinGame(e.target.value.trim());
                    }
                  },
                },
                [],
              ),
              self.app.createElement(
                "button",
                {
                  onClick: () => {
                    const input = document.getElementById("nickname-input");
                    if (input && input.value.trim()) {
                      self.handleJoinGame(input.value.trim());
                    }
                  },
                },
                ["JOIN GAME"],
              ),
            ]),
          ]);

        case "waiting":
          let timerText = "";
          if (self.playerCount < 2) {
            timerText = "Waiting for players... (need at least 2)";
          } else if (self.lobbyPhase === "countdown") {
            timerText = `Game starting in ${self.lobbyRemainingSeconds}s!`;
          } else {
            timerText = `Game starts in ${self.lobbyRemainingSeconds}s or when 4 players join`;
          }

          return self.app.createElement("div", { class: "waiting-room" }, [
            self.app.createElement("div", { class: "waiting-container" }, [
              self.app.createElement("h1", {}, ["WAITING FOR PLAYERS"]),
              self.app.createElement("div", { class: "player-counter" }, [
                `${self.playerCount} / 4`,
              ]),
              self.app.createElement(
                "div",
                { class: "player-list" },
                self.playerList.map((player, idx) =>
                  self.app.createElement("div", { class: "player-item" }, [
                    `${idx + 1}. ${player}`,
                  ]),
                ),
              ),
              self.app.createElement("div", { class: "timer" }, [timerText]),
            ]),
            self.app.createElement("div", { class: "chat-section" }, [
              self.app.createElement("div", { class: "chat-title" }, [
                "💬 CHAT",
              ]),
              self.app.createElement(
                "div",
                { class: "chat-messages" },
                self.chatMessages.map((msg) =>
                  self.app.createElement("div", { class: "chat-message" }, [
                    self.app.createElement(
                      "span",
                      { class: "chat-message-author" },
                      [msg.author + ": "],
                    ),
                    self.app.createElement(
                      "span",
                      { class: "chat-message-text" },
                      [msg.text],
                    ),
                  ]),
                ),
              ),
              self.app.createElement("div", { class: "chat-input-container" }, [
                self.app.createElement(
                  "input",
                  {
                    class: "chat-input",
                    placeholder: "Type message...",
                    maxlength: "100",
                    onKeyPress: (e) => {
                      if (e.key === "Enter" && e.target.value.trim()) {
                        self.handleSendChat(e.target.value.trim());
                        e.target.value = "";
                      }
                    },
                  },
                  [],
                ),
                self.app.createElement(
                  "button",
                  {
                    class: "chat-send",
                    onClick: () => {
                      const input = document.querySelector(".chat-input");
                      if (input && input.value.trim()) {
                        self.handleSendChat(input.value.trim());
                        input.value = "";
                      }
                    },
                  },
                  ["Send"],
                ),
              ]),
            ]),
          ]);

        case "game":
          const currentPlayer = self.gameState.getPlayer(self.client.playerId);
          const tiles = self.gameState.map?.tiles || [];
          const players = self.gameState.getAllPlayers();
          const bombs = self.gameState.getAllBombs();
          const explosions = self.gameState.getAllExplosions();
          const powerups = self.gameState.getAllPowerUps();

          // Build lookup sets for bombs, explosions, powerups by position
          const bombAt = {};
          bombs.forEach((b) => {
            bombAt[`${b.x},${b.y}`] = b;
          });
          const explosionAt = {};
          explosions.forEach((e) => {
            (e.cells || [[e.x, e.y]]).forEach(([cx, cy]) => {
              explosionAt[`${cx},${cy}`] = e;
            });
          });
          const powerupAt = {};
          powerups.forEach((p) => {
            powerupAt[`${p.x},${p.y}`] = p;
          });

          return self.app.createElement("div", { class: "game-screen" }, [
            self.app.createElement("div", { class: "game-container" }, [
              self.app.createElement("div", { class: "game-board" }, [
                ...tiles.map((tile) => {
                  const key = `${tile.x},${tile.y}`;
                  const tileChildren = [];
                  if (bombAt[key]) {
                    tileChildren.push(
                      self.app.createElement("div", { class: "bomb" }, []),
                    );
                  }
                  if (explosionAt[key]) {
                    tileChildren.push(
                      self.app.createElement("div", { class: "explosion" }, []),
                    );
                  }
                  if (powerupAt[key]) {
                    tileChildren.push(
                      self.app.createElement(
                        "div",
                        { class: `powerup ${powerupAt[key].type}` },
                        [],
                      ),
                    );
                  }
                  return self.app.createElement(
                    "div",
                    {
                      class: `tile ${tile.type}`,
                      style: `grid-column: ${tile.x + 1}; grid-row: ${tile.y + 1};`,
                    },
                    tileChildren,
                  );
                }),
                ...players.map((player, idx) => {
                  let dirClass = "";
                  if (!player.isAlive) {
                    dirClass = "dead";
                  } else if (player.direction && player.direction !== "idle") {
                    dirClass = `walking-${player.direction}`;
                  } else if (player.facing) {
                    dirClass = `facing-${player.facing}`;
                  }
                  return self.app.createElement(
                    "div",
                    {
                      class: `player player-${idx} ${dirClass}`.trim(),
                      style: `position: absolute; top: ${player.y * 40 - 10}px; left: ${player.x * 40 + 2}px;`,
                    },
                    [],
                  );
                }),
              ]),
            ]),
            self.app.createElement("div", { class: "sidebar" }, [
              currentPlayer
                ? self.app.createElement("div", { class: "player-stats" }, [
                    self.app.createElement("div", { class: "stat-item" }, [
                      self.app.createElement("span", { class: "stat-label" }, [
                        "LIVES: ",
                      ]),
                      self.app.createElement("span", { class: "stat-value" }, [
                        "❤️".repeat(currentPlayer.lives || 3),
                      ]),
                    ]),
                  ])
                : self.app.createElement("div", {}, []),
              self.app.createElement("div", { class: "chat-section" }, [
                self.app.createElement("div", { class: "chat-title" }, [
                  "💬 CHAT",
                ]),
                self.app.createElement(
                  "div",
                  { class: "chat-messages" },
                  self.chatMessages.map((msg) =>
                    self.app.createElement("div", { class: "chat-message" }, [
                      self.app.createElement(
                        "span",
                        { class: "chat-message-author" },
                        [msg.author + ": "],
                      ),
                      self.app.createElement(
                        "span",
                        { class: "chat-message-text" },
                        [msg.text],
                      ),
                    ]),
                  ),
                ),
                self.app.createElement(
                  "div",
                  { class: "chat-input-container" },
                  [
                    self.app.createElement(
                      "input",
                      {
                        class: "chat-input",
                        placeholder: "Type message...",
                        maxlength: "100",
                        onKeyPress: (e) => {
                          if (e.key === "Enter" && e.target.value.trim()) {
                            self.handleSendChat(e.target.value.trim());
                            e.target.value = "";
                          }
                        },
                      },
                      [],
                    ),
                    self.app.createElement(
                      "button",
                      {
                        class: "chat-send",
                        onClick: () => {
                          const input = document.querySelector(
                            ".sidebar .chat-input",
                          );
                          if (input && input.value.trim()) {
                            self.handleSendChat(input.value.trim());
                            input.value = "";
                          }
                        },
                      },
                      ["Send"],
                    ),
                  ],
                ),
              ]),
            ]),
          ]);

        case "end":
          return self.app.createElement("div", { class: "end-game-screen" }, [
            self.app.createElement("div", { class: "end-game-container" }, [
              self.app.createElement("h1", {}, ["GAME OVER"]),
              self.gameState.winner
                ? self.app.createElement("div", { class: "winner" }, [
                    `🏆 ${self.gameState.winner.name} WINS! 🏆`,
                  ])
                : self.app.createElement("div", {}, ["No winner"]),
              self.app.createElement(
                "button",
                {
                  class: "end-game-button",
                  onClick: () => self.handlePlayAgain(),
                },
                ["PLAY AGAIN"],
              ),
            ]),
          ]);

        default:
          return self.app.createElement("div", {}, ["Loading..."]);
      }
    };

    // Mount or re-render
    if (!this.mounted) {
      console.log("🎮 Mounting app to #app div");
      this.app.mount(renderFunction, document.getElementById("app"));
      this.mounted = true;
    } else {
      this.app.render();
    }
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎮 DOM loaded, initializing Bomberman game...");
  try {
    const game = new BombermanGame();
    console.log("✅ Game instance created");
    await game.initialize();
    console.log("✅ Game initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing game:", error);
  }
});

export default BombermanGame;
