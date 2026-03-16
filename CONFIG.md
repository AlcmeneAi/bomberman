# Bomberman Game Configuration

## Server Configuration

### WebSocket Server Settings
```javascript
// server/server.js
const PORT = 8080;                    // WebSocket server port
const PLAYER_LIMIT = 4;               // Max players per game
const MIN_PLAYERS = 2;                // Min players to start
const WAITING_TIME_BEFORE_COUNTDOWN = 20000;  // 20 seconds
const COUNTDOWN_TIME = 10000;         // 10 second countdown
const UPDATE_FREQUENCY = 100;         // 100ms = 10 updates/sec
```

## Game Configuration

### Game Settings
```javascript
// Game map
const MAP_WIDTH = 13;
const MAP_HEIGHT = 13;
const BLOCK_SPAWN_RATE = 0.65;        // 65% blocks

// Player settings
const PLAYER_STARTING_LIVES = 3;
const PLAYER_STARTING_BOMBS = 1;
const PLAYER_STARTING_FLAME_RANGE = 1;
const PLAYER_STARTING_SPEED = 1;

// Bomb settings
const BOMB_TIMER = 3000;              // 3 seconds
const EXPLOSION_DURATION = 500;       // 500ms visible
const MOVEMENT_DELAY = 100;           // 100ms between moves

// Power-up settings
const POWERUP_SPAWN_RATE = 0.3;       // 30% chance
const POWERUP_TYPES = ['bombs', 'flames', 'speed'];

// Bomb capacity limits
const MAX_BOMBS = 4;
const MAX_FLAME_RANGE = 10;
const MAX_SPEED = 3;
```

## Performance Targets

### FPS & Rendering
- **Target FPS**: 60 stable
- **Frame Budget**: 16.67ms per frame
- **Update Frequency**: 10 Hz (100ms)
- **Render Method**: Virtual DOM diffing

### Network
- **Update Rate**: 10 messages/second per player
- **Average Message Size**: ~1 KB
- **Bandwidth per Player**: 1-2 Kbps
- **Protocol**: WebSocket (ws://)

### Memory
- **Client**: ~5-10 MB per game instance
- **Server**: ~1 MB per player
- **Storage**: No persistent storage

## Browser Configuration

### Recommended Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required APIs
- WebSocket
- ES6 JavaScript
- CSS Grid
- localStorage (optional, for future features)

## Development Server

### Local Testing Setup

**Terminal 1 - Start WebSocket Server**
```bash
cd /home/ebourmpo/Desktop/bomberman/server
npm install
npm start
```

**Terminal 2 - Start HTTP Server**
```bash
cd /home/ebourmpo/Desktop/bomberman/game
python -m http.server 8000
```

**Then Open Browser**
```
http://localhost:8000
```

### Testing Multiple Players

Open separate browser windows/tabs:
1. Window 1: `http://localhost:8000` - Player 1
2. Window 2: `http://localhost:8000` - Player 2
3. Window 3: `http://localhost:8000` - Player 3
4. Window 4: `http://localhost:8000` - Player 4

## Debugging

### Browser Console
Press `F12` to open Developer Tools and check Console tab for:
- Connection status
- WebSocket messages
- JavaScript errors
- Performance metrics

### Server Logs
Check terminal running `npm start` for:
- New connections
- Player actions
- Game start/end events
- Error messages

### Performance Profiling
1. Open DevTools (F12)
2. Go to Performance tab
3. Start recording
4. Play game for 5-10 seconds
5. Stop recording
6. Analyze frame times and long tasks

## Network Monitoring

### Check WebSocket Traffic
1. DevTools → Network tab
2. Filter by: `WS`
3. Click WebSocket connection
4. View Messages tab to see all communication

### Bandwidth Usage
- Average: 1-2 Kbps per player
- Peak: 5-10 Kbps during active gameplay
- Target: Keep below 100 Kbps per player

## Configuration Changes

### To Change Game Settings

1. **Player Limits** (server/server.js)
   ```javascript
   const PLAYER_LIMIT = 4;  // Change to desired number
   ```

2. **Bomb Timer** (game/js/entities.js or server/server.js)
   ```javascript
   this.timer = 3000;  // Change milliseconds
   ```

3. **Map Size** (game/js/entities.js)
   ```javascript
   constructor(width = 13, height = 13) {
       this.width = width;
       this.height = height;
   }
   ```

4. **Update Frequency** (server/server.js)
   ```javascript
   setInterval(() => {
       // ...
   }, 100);  // Change interval in ms
   ```

## Feature Flags (For Future Development)

Current features all enabled by default. To disable a feature:

### Disable Chat
In `game/js/main.js`, handleSendChat:
```javascript
handleSendChat(message) {
    if (message.trim()) {
        // this.client.sendChat(message);  // Comment out
    }
}
```

### Disable Power-ups
In `game/js/engine.js`, updateBombs:
```javascript
// Comment out powerup spawn logic in handleBombExplosion
```

## Customization

### Change Game Colors
Edit `game/css/style.css`:
```css
.player.player-0 {
    background: linear-gradient(135deg, #YOUR_COLOR 0%, #OTHER_COLOR 100%);
}
```

### Change Map Theme
Edit game board tile colors in `style.css`:
```css
.tile.block {
    background: #NEW_COLOR;
}
```

### Change Button Styles
Edit button styling in `style.css`:
```css
.login-container button {
    background: linear-gradient(135deg, #COLOR1 0%, #COLOR2 100%);
}
```

## Deployment Considerations

### To Deploy to Production

1. **Server Side**
   - Install Node.js on server
   - Install dependencies: `npm install`
   - Update WebSocket URL in client to production domain
   - Use process manager (PM2) to keep server running

2. **Client Side**
   - Update `serverUrl` in `game/js/client.js` to production domain
   - Minify JavaScript and CSS for production
   - Use HTTPS and WSS (secure WebSocket)

3. **Example Production Setup**
   ```bash
   # Server
   npm install -g pm2
   pm2 start server.js
   pm2 save
   
   # Client: Update server URL
   const serverUrl = 'wss://yourdomain.com'
   ```

## Monitoring & Logging

### Key Metrics to Monitor
- Player connection count
- Game room count
- Average frame time
- Network latency
- Crash/error rate

### Logging Levels
- **Error**: Critical issues preventing gameplay
- **Warn**: Recoverable issues
- **Info**: Game events (join, start, end)
- **Debug**: Detailed state information

## Troubleshooting Configuration

### If Game Doesn't Start
1. Check server is running: `npm start`
2. Check port 8080 is available: `lsof -i :8080`
3. Clear browser cache: Ctrl+Shift+Delete
4. Check browser console for errors: F12

### If Performance is Poor
1. Close other tabs and applications
2. Check FPS in performance monitor
3. Profile with DevTools Performance tab
4. Check network latency in DevTools

### If Players Can't Connect
1. Ensure server is running
2. Check firewall isn't blocking port 8080
3. Try `localhost` instead of `127.0.0.1`
4. Check for CORS issues in console

---

**Last Updated**: 2026-03-12
**Version**: 1.0.0
