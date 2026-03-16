# Bomberman Game - Testing Plan

## Test Environment Setup

### Prerequisites
- Node.js v14+ installed
- Server running on ws://localhost:8080
- Game accessible at localhost:8000 or file:// URL
- 2-4 browser windows/tabs for multiplayer testing

### Setup Commands
```bash
# Terminal 1: Start Server
cd /home/ebourmpo/Desktop/bomberman/server
npm install
npm start

# Terminal 2: Start HTTP Server (Optional)
cd /home/ebourmpo/Desktop/bomberman/game
python -m http.server 8000

# Browser: Open game
http://localhost:8000  (if using Python HTTP server)
OR
file:///home/ebourmpo/Desktop/bomberman/game/index.html  (direct file)
```

## Test Cases

### 1. Connection & Lobby Tests

#### TC-001: Server Connection
- [ ] Open game URL in browser
- [ ] Verify no error messages in console
- [ ] Expected: Game loads successfully

#### TC-002: Login Screen
- [ ] Game displays login screen
- [ ] Nickname input field is empty
- [ ] Button is enabled
- [ ] Expected: Login screen renders

#### TC-003: Join Game (Single Player)
- [ ] Enter nickname "Player1"
- [ ] Click "JOIN GAME"
- [ ] Expected: Waiting room displays, player count = 1/4

#### TC-004: Join Game (Multiple Players)
- [ ] Open 4 browser windows
- [ ] Each enters different nickname
- [ ] Each clicks "JOIN GAME"
- [ ] Expected: All see player count increase to 4/4

#### TC-005: Player List Display
- [ ] With 3 players joined
- [ ] Check waiting room player list
- [ ] Expected: All 3 nicknames shown in correct order

#### TC-006: Duplicate Nicknames
- [ ] Player1 enters "Player1"
- [ ] Player2 enters "Player1" (same name)
- [ ] Expected: Game accepts both (no validation needed per requirements)

### 2. Waiting Room Tests

#### TC-007: Auto-start with 4 Players
- [ ] Have 3 players ready
- [ ] 4th player joins
- [ ] Expected: 10-second countdown starts immediately

#### TC-008: Auto-start with 2 Players After 20s
- [ ] Have 2 players in waiting room
- [ ] Wait 20 seconds
- [ ] Expected: 10-second countdown starts automatically

#### TC-009: Countdown Timer Display
- [ ] Observe countdown in waiting room
- [ ] Expected: Timer counts down from 10 to 0

#### TC-010: Game Start
- [ ] Countdown reaches 0
- [ ] Expected: Game screen appears with all players

### 3. Game Board & Map Tests

#### TC-011: Map Dimensions
- [ ] Start game
- [ ] Count grid squares
- [ ] Expected: 13x13 grid visible

#### TC-012: Wall Placement
- [ ] Examine map pattern
- [ ] Expected: Walls at even coordinates (1,1), (1,3), etc.

#### TC-013: Block Placement
- [ ] Observe destructible blocks
- [ ] Expected: Randomly placed, not in 4 corners (safe zones)

#### TC-014: Safe Starting Zones
- [ ] Look at all 4 corners
- [ ] Expected: Corners (0,0), (12,0), (0,12), (12,12) have no blocks

### 4. Player Movement Tests

#### TC-015: Arrow Key Movement (Up)
- [ ] Press Up arrow key
- [ ] Expected: Player moves up 1 cell

#### TC-016: Arrow Key Movement (All Directions)
- [ ] Test Arrow Up, Down, Left, Right
- [ ] Expected: Player moves in each direction

#### TC-017: WASD Keys Movement
- [ ] Press W, A, S, D keys
- [ ] Expected: Same movement as arrow keys

#### TC-018: Continuous Movement
- [ ] Hold arrow key
- [ ] Expected: Player moves smoothly at regular intervals

#### TC-019: Collision with Walls
- [ ] Try to move into wall
- [ ] Expected: Player stops, doesn't pass through

#### TC-020: Collision with Blocks
- [ ] Try to move into destructible block
- [ ] Expected: Player stops, can't move through

#### TC-021: Collision with Other Players
- [ ] Two players try to occupy same cell
- [ ] Expected: Second player stops at adjacent cell

#### TC-022: Movement Speed Sync
- [ ] Two players move simultaneously
- [ ] Expected: Both positions update on all clients in sync

### 5. Bomb Mechanics Tests

#### TC-023: Bomb Placement
- [ ] Press Spacebar
- [ ] Expected: Bomb appears at player position

#### TC-024: Bomb Alternative Trigger (Enter)
- [ ] Press Enter key
- [ ] Expected: Bomb placed (same as spacebar)

#### TC-025: Bomb Timer (3 seconds)
- [ ] Place bomb
- [ ] Count 3 seconds
- [ ] Expected: Bomb explodes after ~3 seconds

#### TC-026: Multiple Bombs (Max 1)
- [ ] Place bomb
- [ ] Try placing another immediately
- [ ] Expected: Second bomb rejected (max reached)

#### TC-027: Bomb Removal After Explosion
- [ ] Bomb explodes
- [ ] Expected: Bomb removed from board, new bomb can be placed

#### TC-028: Max Bombs Increase with Power-up
- [ ] Collect "Bombs" power-up
- [ ] Try placing 2 bombs
- [ ] Expected: Second bomb placed successfully

#### TC-029: Bomb Occupies Space
- [ ] Place bomb
- [ ] Try moving through bomb
- [ ] Expected: Player can't move onto bomb cell

#### TC-030: Chain Reaction
- [ ] Place 2 bombs near each other
- [ ] First explodes, hits second bomb
- [ ] Expected: Second bomb explodes (if close enough)

### 6. Explosion Tests

#### TC-031: Explosion Spread (Up Direction)
- [ ] Place bomb, move away
- [ ] Observe explosion upward
- [ ] Expected: Explosion spreads up until wall/block

#### TC-032: Explosion Spread (All Directions)
- [ ] Place bomb in open area
- [ ] Expected: Explosion spreads equally in 4 directions

#### TC-033: Explosion Blocked by Wall
- [ ] Place bomb near wall
- [ ] Expected: Explosion stops at wall

#### TC-034: Explosion Blocked by Block
- [ ] Place bomb near block
- [ ] Expected: Explosion spreads to block, then stops

#### TC-035: Explosion Duration (500ms)
- [ ] Watch explosion animation
- [ ] Expected: Fades out after ~500ms

#### TC-036: Explosion Visual
- [ ] Observe explosion appearance
- [ ] Expected: Distinct visual indicator of explosion

### 7. Block Destruction Tests

#### TC-037: Block Destroyed by Explosion
- [ ] Explosion hits block
- [ ] Expected: Block becomes empty space

#### TC-038: Wall Survives Explosion
- [ ] Explosion hits wall
- [ ] Expected: Wall remains intact

#### TC-039: Multiple Blocks Destroyed
- [ ] Explosion destroys 3 blocks in a line
- [ ] Expected: All 3 destroyed, remaining empty space

### 8. Power-up Tests

#### TC-040: Power-up Spawn Rate
- [ ] Destroy 10 blocks
- [ ] Count power-ups (~3 should appear)
- [ ] Expected: 30% spawn rate visible

#### TC-041: Bombs Power-up Collection
- [ ] Destroy block with Bombs power-up
- [ ] Walk into power-up
- [ ] Expected: Power-up collected, max bombs increased

#### TC-042: Flames Power-up Collection
- [ ] Destroy block with Flames power-up
- [ ] Walk into power-up
- [ ] Expected: Power-up collected, explosion range increased

#### TC-043: Speed Power-up Collection
- [ ] Destroy block with Speed power-up
- [ ] Walk into power-up
- [ ] Expected: Power-up collected, movement speed increased

#### TC-044: Multiple Power-ups
- [ ] Collect all 3 power-up types
- [ ] Expected: All effects stack

#### TC-045: Power-up Visual Indicator
- [ ] Power-up appears on board
- [ ] Expected: Distinct visual icon (💣, 🔥, ⚡)

### 9. Damage & Lives Tests

#### TC-046: Player Hit by Explosion
- [ ] Place bomb near player
- [ ] Get hit by explosion
- [ ] Expected: Lives decrease from 3 to 2

#### TC-047: Lives Display
- [ ] Check player stats in sidebar
- [ ] Expected: Shows current lives (❤️ symbols)

#### TC-048: Multiple Hits
- [ ] Get hit 3 times
- [ ] Expected: Lives 3 → 2 → 1 → 0 (eliminated)

#### TC-049: Elimination Detection
- [ ] Get hit 3rd time
- [ ] Expected: Player marked as dead, disappears from board

#### TC-050: Survivor Detection
- [ ] Play until 1 player remains
- [ ] Expected: Game ends, winner declared

### 10. Chat Tests

#### TC-051: Send Chat Message
- [ ] Type "Hello" in chat
- [ ] Press Enter
- [ ] Expected: Message appears in chat with nickname

#### TC-052: Chat Message Broadcast
- [ ] Player1 sends message
- [ ] Check Player2's chat
- [ ] Expected: Message visible to all players

#### TC-053: Chat During Game
- [ ] Send message while playing
- [ ] Expected: Message delivered without disrupting gameplay

#### TC-054: Multiple Chat Messages
- [ ] Send 3 messages
- [ ] Expected: All visible in order

#### TC-055: Chat Scroll
- [ ] Send many messages (>20)
- [ ] Expected: Earlier messages scroll out, latest visible

#### TC-056: Special Characters in Chat
- [ ] Send: "Player1: I'm @ 50% health! #WINNING"
- [ ] Expected: Message displays correctly

### 11. Game End & Win Condition Tests

#### TC-057: Win Condition (1 Player Left)
- [ ] Eliminate 3 players
- [ ] Expected: Remaining player declared winner

#### TC-058: Winner Display
- [ ] Game ends
- [ ] Check end screen
- [ ] Expected: Winner's name displayed with trophy

#### TC-059: Player Stats on End Screen
- [ ] Game ends
- [ ] Check statistics
- [ ] Expected: All players listed with survival time

#### TC-060: Play Again Button
- [ ] Game ends
- [ ] Click "PLAY AGAIN"
- [ ] Expected: Return to login screen

#### TC-061: New Game After Victory
- [ ] Click "PLAY AGAIN"
- [ ] Re-enter nickname
- [ ] Expected: Fresh game starts

### 12. Performance Tests

#### TC-062: FPS Monitoring
- [ ] Watch performance monitor
- [ ] Expected: FPS stays at or near 60

#### TC-063: FPS with 4 Players
- [ ] 4 players playing actively
- [ ] Check FPS
- [ ] Expected: Maintains 60 FPS

#### TC-064: Frame Time
- [ ] Check frame time display
- [ ] Expected: Consistently under 16.67ms

#### TC-065: Memory Usage
- [ ] Open DevTools Memory tab
- [ ] Play for 5 minutes
- [ ] Expected: No significant memory growth

#### TC-066: Network Bandwidth
- [ ] Open DevTools Network tab
- [ ] Play actively
- [ ] Expected: Updates arrive at regular intervals (~100ms)

### 13. Synchronization Tests

#### TC-067: Position Sync
- [ ] Player1 moves
- [ ] Check Player2's view
- [ ] Expected: Positions sync within <200ms

#### TC-068: Bomb Sync
- [ ] Player1 places bomb
- [ ] Check Player2's view
- [ ] Expected: Bomb visible to all players

#### TC-069: Explosion Sync
- [ ] Bomb explodes on Player1's client
- [ ] Check Player2's client
- [ ] Expected: Explosion visible at same location

#### TC-070: Damage Sync
- [ ] Player1 takes damage
- [ ] Check other players' views
- [ ] Expected: Lives updated for all

### 14. Edge Cases & Error Handling

#### TC-071: Rapid Bomb Placement
- [ ] Spam Spacebar key
- [ ] Expected: Only maxBombs placed, rest ignored

#### TC-072: Rapid Movement Keys
- [ ] Spam arrow keys
- [ ] Expected: Movement throttled, no errors

#### TC-073: Server Disconnect
- [ ] Start game, then stop server
- [ ] Expected: Error message, graceful handling

#### TC-074: Browser Tab Switch
- [ ] Switch tabs during game
- [ ] Switch back
- [ ] Expected: Game resumes normally

#### TC-075: Window Resize
- [ ] Resize browser window during game
- [ ] Expected: Layout adjusts, game continues

#### TC-076: Browser Back Button
- [ ] Click back during game
- [ ] Expected: Graceful handling (not tested - navigation may close)

### 15. Cross-Browser Tests

#### TC-077: Chrome
- [ ] Run through all tests
- [ ] Expected: All pass

#### TC-078: Firefox
- [ ] Run through all tests
- [ ] Expected: All pass

#### TC-079: Safari
- [ ] Run through all tests
- [ ] Expected: All pass

#### TC-080: Edge
- [ ] Run through all tests
- [ ] Expected: All pass

## Test Execution Report Template

```
Test Case: TC-001
Title: Server Connection
Objective: Verify server connects successfully
Steps:
  1. Open game URL
  2. Check browser console
Expected Result: No error messages
Actual Result: [PASS/FAIL]
Notes: [Any issues encountered]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
```

## Performance Benchmarks

### Target Metrics
- FPS: 60 stable
- Frame Time: <16.67ms
- Memory: <20MB per player
- Latency: <500ms acceptable
- Bandwidth: <2 Kbps per player

### Measurement Tools
- **FPS**: Performance monitor in-game or DevTools
- **Memory**: DevTools → Memory tab
- **Network**: DevTools → Network tab
- **Latency**: DevTools → Network → WS connection timing

## Known Issues to Monitor

1. **Sprite Assets**: Using CSS colors, not ASE files
2. **No Animation**: Static sprites
3. **No Sound**: Silent gameplay
4. **Fixed Map**: 13x13 only
5. **4 Player Limit**: Can't support 5+ players

## Test Results Summary

### Critical Tests (Must Pass)
- [ ] TC-001: Server Connection
- [ ] TC-003: Join Game
- [ ] TC-010: Game Start
- [ ] TC-015: Movement
- [ ] TC-023: Bomb Placement
- [ ] TC-031: Explosion
- [ ] TC-046: Damage System
- [ ] TC-057: Win Condition

### All Test Results
- Total Tests: 80
- Passed: ___
- Failed: ___
- Blocked: ___
- Pass Rate: ____%

## Regression Testing

After any code changes, re-run:
- TC-003, TC-010, TC-015, TC-023, TC-031, TC-046, TC-057 (Critical path)
- Performance tests (TC-062 through TC-066)
- Sync tests (TC-067 through TC-070)

---

**Last Updated**: 2026-03-12
**Test Environment**: Local development
**Version**: 1.0.0
