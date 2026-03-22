/**
 * WebSocket Client for Bomberman Game
 * Handles all client-server communication
 */

export class GameClient {
  constructor(serverUrl = "ws://localhost:8080") {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.playerId = null;
    this.playerName = null;
    this.listeners = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log("Attempting to connect to:", this.serverUrl);
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log("✅ Connected to server");
          resolve();
        };

        this.ws.onmessage = (event) => {
          console.log("📨 Message from server:", event.data);
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error("Failed to parse message:", e);
          }
        };

        this.ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("⚠️ Disconnected from server");
          this.emit("disconnected");
        };
      } catch (error) {
        console.error("Error in connect():", error);
        reject(error);
      }
    });
  }

  send(type, data = {}) {
    console.log(`Sending message: ${type}`, data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
      console.log("Message sent successfully");
    } else {
      console.error(
        "WebSocket not ready. State:",
        this.ws ? this.ws.readyState : "null",
      );
    }
  }

  joinGame(playerName) {
    this.playerName = playerName;
    console.log("Sending JOIN_GAME for player:", playerName);
    console.log("WebSocket ready state:", this.ws.readyState);
    this.send("JOIN_GAME", { playerName });
  }

  playerMove(x, y, direction) {
    this.send("PLAYER_MOVE", { x, y, direction });
  }

  placeBomb(x, y) {
    this.send("PLACE_BOMB", { x, y });
  }

  sendChat(message) {
    this.send("CHAT_MESSAGE", { message });
  }

  handleMessage(data) {
    const { type } = data;

    switch (type) {
      case "PLAYER_JOINED":
        this.playerId = data.playerId;
        this.emit("playerJoined", data);
        break;

      case "GAME_STATE_UPDATE":
        this.emit("gameStateUpdate", data);
        break;

      case "PLAYERS_UPDATE":
        this.emit("playersUpdate", data);
        break;

      case "GAME_STARTED":
        this.emit("gameStarted", data);
        break;

      case "BOMB_PLACED":
        this.emit("bombPlaced", data);
        break;

      case "EXPLOSION":
        this.emit("explosion", data);
        break;

      case "POWERUP_SPAWNED":
        this.emit("powerupSpawned", data);
        break;

      case "PLAYER_ELIMINATED":
        this.emit("playerEliminated", data);
        break;

      case "GAME_ENDED":
        this.emit("gameEnded", data);
        break;

      case "CHAT_MESSAGE":
        this.emit("chatMessage", data);
        break;

      case "BLOCKS_DESTROYED":
        this.emit("blocksDestroyed", data);
        break;

      case "LOBBY_TIMER_UPDATE":
        this.emit("lobbyTimerUpdate", data);
        break;

      case "COUNTDOWN_STARTED":
        this.emit("countdownStarted", data);
        break;

      default:
        console.warn("Unknown message type:", type);
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default GameClient;
