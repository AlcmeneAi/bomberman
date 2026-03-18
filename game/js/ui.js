/**
 * UI Components for Bomberman Game
 * Built with Mini Framework
 */

import Mini from './mini.js';

const app = Mini();

/**
 * Login Screen Component
 */
export function LoginScreen(onJoin) {
  let nicknameInput = '';

  return () => {
    return app.createElement('div', { class: 'login-screen' }, [
      app.createElement('div', { class: 'login-container' }, [
        app.createElement('h1', {}, ['💣 BOMBERMAN']),
        app.createElement('p', {}, ['Enter your nickname to join the game']),
        app.createElement('input', {
          type: 'text',
          placeholder: 'Enter your nickname',
          maxlength: '20',
          onInput: (e) => {
            nicknameInput = e.target.value;
          },
          onKeyPress: (e) => {
            if (e.key === 'Enter' && nicknameInput.trim()) {
              onJoin(nicknameInput.trim());
            }
          }
        }, []),
        app.createElement('button', {
          onClick: () => {
            if (nicknameInput.trim()) {
              onJoin(nicknameInput.trim());
            }
          }
        }, ['JOIN GAME'])
      ])
    ]);
  };
}

/**
 * Waiting Room Component
 */
export function WaitingRoom(playerCount, players, timer, isCountingDown) {
  return () => {
    let timerText = '';
    if (playerCount < 2) {
      timerText = 'Waiting for players... (need at least 2)';
    } else if (isCountingDown) {
      timerText = `Game starting in ${Math.ceil(timer / 1000)}s`;
    } else if (playerCount >= 2) {
      timerText = `Game will start in ${Math.ceil((20 - (Date.now() % 20000) / 1000))}s or when 4 players join`;
    }

    return app.createElement('div', { class: 'waiting-room' }, [
      app.createElement('div', { class: 'waiting-container' }, [
        app.createElement('h1', {}, ['WAITING FOR PLAYERS']),
        app.createElement('div', { class: 'player-counter' }, [
          `${playerCount} / 4`
        ]),
        app.createElement('div', { class: 'player-list' }, [
          app.createElement('div', {}, players.map((player, idx) => 
            app.createElement('div', { class: 'player-item', key: idx }, [
              `${idx + 1}. ${player}`
            ])
          ))
        ]),
        app.createElement('div', { class: 'timer' }, [timerText])
      ])
    ]);
  };
}

/**
 * Game Screen Component
 */
export function GameScreen(gameState, currentPlayer, chatMessages, onMove, onPlaceBomb, onSendChat) {
  let chatInput = '';

  const renderTile = (tile, allBombs, allExplosions, allPowerUps) => {
    const bomb = allBombs.find(b => b.x === tile.x && b.y === tile.y);
    const explosion = allExplosions.find(e => e.cells.some(c => c[0] === tile.x && c[1] === tile.y));
    const powerup = allPowerUps.find(p => p.x === tile.x && p.y === tile.y);

    let className = `tile tile-${tile.x}-${tile.y} ${tile.type}`;
    
    return app.createElement('div', { 
      class: className,
      style: `grid-column: ${tile.x + 1}; grid-row: ${tile.y + 1};`
    }, [
      bomb ? app.createElement('div', { class: 'bomb' }, []) : null,
      explosion ? app.createElement('div', { class: 'explosion' }, []) : null,
      powerup ? app.createElement('div', { class: `powerup ${powerup.type}` }, []) : null,
    ].filter(Boolean));
  };

  const renderPlayers = (players) => {
    return players.map((player, idx) => {
      if (!player.isAlive) return null;
      
      // Determine direction class based on player's facing direction
      let directionClass = '';
      if (player.direction) {
        switch (player.direction) {
          case 'up': directionClass = 'walking-up'; break;
          case 'down': directionClass = 'walking-down'; break;
          case 'left': directionClass = 'walking-left'; break;
          case 'right': directionClass = 'walking-right'; break;
        }
      }
      
      // Add dead class if player has no lives
      if (player.lives <= 0) {
        directionClass = 'dead';
      }
      
      return app.createElement('div', {
        class: `player player-${idx} ${directionClass}`,
        style: `
          position: absolute;
          top: ${player.y * 40 - 10}px;
          left: ${player.x * 40 + 2}px;
        `,
        title: `${player.name} - Lives: ${player.lives}`
      }, []);
    }).filter(Boolean);
  };

  return () => {
    if (!gameState) {
      return app.createElement('div', { class: 'game-screen' }, [
        app.createElement('div', {}, ['Loading game...'])
      ]);
    }

    const allBombs = gameState.bombs || [];
    const allExplosions = gameState.explosions || [];
    const allPowerUps = gameState.powerups || [];
    const players = gameState.players || [];
    const tiles = gameState.map?.tiles || [];

    return app.createElement('div', { class: 'game-screen' }, [
      // Game Board
      app.createElement('div', { class: 'game-container' }, [
        app.createElement('div', { class: 'game-board' }, [
          ...tiles.map(tile => renderTile(tile, allBombs, allExplosions, allPowerUps)),
          ...renderPlayers(players)
        ])
      ]),

      // Sidebar
      app.createElement('div', { class: 'sidebar' }, [
        // Player Stats
        currentPlayer ? app.createElement('div', { class: 'player-stats' }, [
          app.createElement('div', { class: 'stat-item' }, [
            app.createElement('div', { class: 'stat-label' }, ['PLAYER']),
            app.createElement('div', { class: 'stat-value' }, [currentPlayer.name])
          ]),
          app.createElement('div', { class: 'stat-item' }, [
            app.createElement('div', { class: 'stat-label' }, ['LIVES']),
            app.createElement('div', { class: 'stat-value' }, ['❤️'.repeat(currentPlayer.lives)])
          ]),
          app.createElement('div', { class: 'stat-item' }, [
            app.createElement('div', { class: 'stat-label' }, ['BOMBS']),
            app.createElement('div', { class: 'stat-value' }, [`${currentPlayer.bombsPlaced}/${currentPlayer.maxBombs}`])
          ]),
          app.createElement('div', { class: 'stat-item' }, [
            app.createElement('div', { class: 'stat-label' }, ['RANGE']),
            app.createElement('div', { class: 'stat-value' }, [`${currentPlayer.flameRange}`])
          ])
        ]) : null,

        // Chat Section
        app.createElement('div', { class: 'chat-section' }, [
          app.createElement('div', { class: 'chat-title' }, ['💬 CHAT']),
          app.createElement('div', { class: 'chat-messages' }, [
            ...chatMessages.map((msg, idx) => 
              app.createElement('div', { class: 'chat-message', key: idx }, [
                app.createElement('div', { class: 'chat-message-author' }, [msg.author]),
                app.createElement('div', { class: 'chat-message-text' }, [msg.text])
              ])
            )
          ]),
          app.createElement('div', { class: 'chat-input-container' }, [
            app.createElement('input', {
              class: 'chat-input',
              placeholder: 'Type message...',
              maxlength: '100',
              onInput: (e) => {
                chatInput = e.target.value;
              },
              onKeyPress: (e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  onSendChat(chatInput.trim());
                  chatInput = '';
                  e.target.value = '';
                }
              }
            }, []),
            app.createElement('button', {
              class: 'chat-send',
              onClick: () => {
                if (chatInput.trim()) {
                  onSendChat(chatInput.trim());
                  chatInput = '';
                }
              }
            }, ['Send'])
          ])
        ])
      ])
    ]);
  };
}

/**
 * End Game Screen Component
 */
export function EndGameScreen(winner, playerStats, onPlayAgain) {
  return () => {
    return app.createElement('div', { class: 'end-game-screen' }, [
      app.createElement('div', { class: 'end-game-container' }, [
        app.createElement('h1', {}, ['GAME OVER']),
        winner ? app.createElement('div', { class: 'winner' }, [
          `🏆 ${winner.name} WINS! 🏆`
        ]) : null,
        app.createElement('div', { class: 'game-stats' }, [
          ...Object.entries(playerStats).map(([playerName, stats], idx) => 
            app.createElement('div', { class: 'game-stat', key: idx }, [
              `${playerName}: Survived ${stats.survivedSeconds}s - Lives: ${stats.finalLives}`
            ])
          )
        ]),
        app.createElement('button', {
          class: 'end-game-button',
          onClick: onPlayAgain
        }, ['PLAY AGAIN'])
      ])
    ]);
  };
}

/**
 * Performance Monitor Component
 */
export function PerformanceMonitor(fps, deltaTime) {
  return () => {
    return app.createElement('div', { class: 'performance-monitor' }, [
      `FPS: ${Math.round(fps)}<br/>`,
      `Frame: ${Math.round(deltaTime)}ms`
    ]);
  };
}

export default {
  LoginScreen,
  WaitingRoom,
  GameScreen,
  EndGameScreen,
  PerformanceMonitor
};
