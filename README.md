# Bomberman DOM

A multiplayer Bomberman game built with vanilla JavaScript and a custom mini-framework, using WebSockets for real-time multiplayer gameplay.

## How to Run

### Prerequisites

- **Node.js** (v14 or higher)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Start the server

```bash
cd server
npm start
```

The WebSocket server starts on `ws://localhost:8080`.

### 3. Open the game

Serve the `game/` folder with any HTTP server. For example:

```bash
cd game
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

Open **2 to 4 browser tabs/windows** to simulate multiple players.

## How to Play

1. **Enter a nickname** on the login screen and click **JOIN GAME**.
2. **Wait in the lobby** for other players:
   - The game starts automatically when **4 players** join.
   - If 2-3 players are waiting and **20 seconds** pass, a **10-second countdown** begins.
3. **Play!**
   - **Move**: Arrow keys or WASD
   - **Place bomb**: Spacebar or Enter
   - **Chat**: Type a message in the chat box and press Enter
4. **Destroy blocks** to reveal power-ups.
5. **Avoid explosions** — you have **3 lives**.
6. **Last player standing wins!**

## Power-ups

When a block is destroyed, a power-up may appear (30% chance):

| Power-up   | Effect                                  |
| ---------- | --------------------------------------- |
| **Bombs**  | +1 bomb you can place at a time (max 4) |
| **Flames** | +1 explosion range in all directions    |
| **Speed**  | Faster movement                         |

## Features

- 2-4 player real-time multiplayer via WebSockets
- 13x13 grid map with fixed walls and random destructible blocks
- Bombs with 3-second timers and directional explosions
- Three power-up types (Bombs, Flames, Speed)
- In-game chat between players
- 60 FPS with `requestAnimationFrame`
- Built with a custom mini-framework (no external UI libraries)

## Tech Stack

- **Frontend**: Vanilla JavaScript, custom mini-framework (virtual DOM), HTML, CSS
- **Backend**: Node.js, `ws` (WebSocket library)
- [ ] Mobile touch controls

## License

ISC

## Author

Created for the Bomberman project

---

**Last Updated**: 2026-03-12
**Version**: 1.0.0
