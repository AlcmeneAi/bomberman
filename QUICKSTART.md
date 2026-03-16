# Quick Start Guide

## 1. Install Server Dependencies

```bash
cd /home/ebourmpo/Desktop/bomberman/server
npm install
```

## 2. Start the WebSocket Server

```bash
cd /home/ebourmpo/Desktop/bomberman/server
npm start
```

You should see:
```
Bomberman WebSocket server listening on ws://localhost:8080
```

## 3. Open the Game

**Option A: Direct File Opening**
- Open this file in your browser:
  `/home/ebourmpo/Desktop/bomberman/game/index.html`

**Option B: Local HTTP Server**
```bash
cd /home/ebourmpo/Desktop/bomberman/game
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

## 4. Play the Game

1. **Enter nickname** on the login screen
2. **Wait for other players** (2-4 total)
   - Game starts automatically when 4 players join
   - Or 20 seconds pass with 2+ players, then 10 second countdown
3. **Control your player**:
   - **Arrow Keys** or **WASD**: Move
   - **Spacebar** or **Enter**: Place bomb
4. **Destroy blocks** to find power-ups
5. **Avoid explosions** and other players
6. **Last one standing wins!**

## Game Tips

- Clear blocks near your starting position first for escape routes
- Power-ups appear in 30% of destroyed blocks - seek them out!
- Explosions last 500ms - you can escape the blast area
- Use the chat to communicate with other players
- Keep track of your bomb count and remaining lives

## Multiplayer Testing

To test with multiple players:

1. Open the game in 2-4 separate browser windows/tabs
2. Each player enters a different nickname
3. All players will see each other in the waiting room
4. Game starts when ready

## Performance Tips

- Close other applications to free up CPU/RAM
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Keep the browser window in focus for best performance
- Avoid running other resource-intensive tasks

## Troubleshooting

### "WebSocket connection failed"
- Make sure server is running: `npm start`
- Check that port 8080 is available
- Try refreshing the browser page

### Game freezes
- Check browser console (F12) for errors
- Try with fewer players first (start with 2)
- Close other browser tabs

### Players can't move
- Check that your keyboard works
- Try different arrow keys
- Make sure you're in the game (not in waiting room)

---

**Enjoy the game! 🎮💣**
