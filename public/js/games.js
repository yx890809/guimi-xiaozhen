let drawCanvas = null;
let drawCtx = null;
let isDrawing = false;
let currentColor = '#333';
let currentWord = null;
let isDrawer = false;
let drawTimer = null;
let drawTimeLeft = 60;
let currentPhase = null;

function initGameUI(room) {
  const body = document.getElementById('game-modal-body');
  
  if (room.status === 'waiting') {
    renderWaitingRoom(room);
  } else {
    renderGame(room);
  }
}

function renderWaitingRoom(room) {
  const body = document.getElementById('game-modal-body');
  const isHost = room.host === currentUser.nickname;

  body.innerHTML = `
    <div class="game-room">
      <div class="game-room-header">
        <h3>${room.name}</h3>
        <p style="color: #888; font-size: 0.9rem;">${room.players.length}/${room.maxPlayers} 人</p>
      </div>
      <div class="players-list">
        ${room.players.map(p => `
          <div class="player-card ${p.isRobot ? 'robot-player' : ''}">
            <div class="player-avatar">${p.avatar || '👧'}</div>
            <div class="player-name">${p.nickname}${p.isRobot ? ' 🤖' : ''}</div>
            ${p.isRobot ? '<div class="robot-badge">机器人</div>' : ''}
          </div>
        `).join('')}
      </div>
      ${isHost ? `
        <button class="btn btn-primary" onclick="startGame()">开始游戏 🎮</button>
      ` : `
        <p style="color: #888; font-size: 0.9rem;">等待房主开始游戏...</p>
      `}
      <button class="btn btn-secondary btn-small" style="margin-top: 10px;" onclick="closeGameModal()">离开房间</button>
    </div>
  `;
}

function startGame() {
  console.log('点击开始游戏, currentRoom:', currentRoom);
  if (!currentRoom) {
    alert('房间信息不存在');
    return;
  }
  socket.emit('start_game', { roomId: currentRoom.id });
}

socket.on('game_started', (room) => {
  console.log('收到 game_started 事件:', room);
  try {
    currentRoom = room;
    renderGame(room);
    console.log('游戏界面渲染完成');
  } catch (e) {
    console.error('渲染游戏界面出错:', e);
  }
});

function renderGame(room) {
  const body = document.getElementById('game-modal-body');
  
  switch(room.gameType) {
    case 'draw':
      renderDrawGame(room);
      break;
    case 'adventure':
      renderAdventureGame(room);
      break;
    case 'tacit':
      renderTacitGame(room);
      break;
    case 'truth':
      renderTruthGame(room);
      break;
  }
}

// ========== 你画我猜 ==========
function renderDrawGame(room) {
  const body = document.getElementById('game-modal-body');

  body.innerHTML = `
    <div class="game-room">
      <div class="players-list" id="draw-players">
        ${room.players.map(p => `
          <div class="player-card ${p.isRobot ? 'robot-player' : ''}" id="player-${p.nickname}">
            <div class="player-avatar">${p.avatar || '👧'}</div>
            <div class="player-name">${p.nickname}${p.isRobot ? ' 🤖' : ''}</div>
            <div class="player-score">${p.score || 0}分</div>
          </div>
        `).join('')}
      </div>
      <div id="draw-word-display" class="word-display">等待游戏开始...</div>
      
      <!-- 阶段指示器 -->
      <div id="phase-indicator" class="phase-indicator" style="display: none;"></div>
      
      <!-- 倒计时器 -->
      <div class="draw-timer-container">
        <div id="draw-timer" class="draw-timer" style="display: none;">
          <span class="timer-icon">⏱️</span>
          <span id="timer-display" class="timer-display">1:00</span>
          <span id="timer-label" class="timer-label">剩余时间</span>
        </div>
      </div>
      
      <div class="draw-container">
        <canvas id="draw-canvas" width="350" height="250"></canvas>
      </div>
      
      <div id="draw-tools" class="draw-tools-row" style="display: none;">
        <div class="draw-tools">
          <div class="color-btn active" data-color="#333" style="background: #333;"></div>
          <div class="color-btn" data-color="#e91e63" style="background: #e91e63;"></div>
          <div class="color-btn" data-color="#2196f3" style="background: #2196f3;"></div>
          <div class="color-btn" data-color="#4caf50" style="background: #4caf50;"></div>
          <div class="color-btn" data-color="#ff9800" style="background: #ff9800;"></div>
          <button class="btn btn-small btn-secondary" onclick="clearCanvas()">清除</button>
        </div>
        <button id="finish-draw-btn" class="draw-finish-btn" onclick="finishDrawing()">
          <span class="btn-icon">✓</span>
          <span>完成绘画</span>
        </button>
      </div>
      <div id="guess-input" class="guess-input" style="display: none;">
        <input type="text" id="guess-text" placeholder="输入你的答案...">
        <button class="btn btn-primary btn-small" onclick="submitGuess()">猜！</button>
      </div>
      <div class="guesses-list" id="guesses-list"></div>
    </div>
  `;

  initDrawCanvas();
}

function initDrawCanvas() {
  drawCanvas = document.getElementById('draw-canvas');
  if (!drawCanvas) return;
  
  drawCtx = drawCanvas.getContext('2d');
  drawCtx.lineWidth = 3;
  drawCtx.lineCap = 'round';
  drawCtx.strokeStyle = currentColor;
  
  const colors = document.querySelectorAll('.color-btn');
  colors.forEach(btn => {
    btn.addEventListener('click', () => {
      colors.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
      drawCtx.strokeStyle = currentColor;
    });
  });
  
  const getPos = (e) => {
    const rect = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / rect.width;
    const scaleY = drawCanvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };
  
  const startDraw = (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
  };
  
  const draw = (e) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const pos = getPos(e);
    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();
    
    socket.emit('draw', {
      roomId: currentRoom.id,
      data: { x: pos.x, y: pos.y, color: currentColor, drawing: true }
    });
  };
  
  const endDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    isDrawing = false;
    drawCtx.closePath();
  };
  
  drawCanvas.addEventListener('mousedown', startDraw);
  drawCanvas.addEventListener('mousemove', draw);
  drawCanvas.addEventListener('mouseup', endDraw);
  drawCanvas.addEventListener('mouseleave', endDraw);
  
  drawCanvas.addEventListener('touchstart', startDraw);
  drawCanvas.addEventListener('touchmove', draw);
  drawCanvas.addEventListener('touchend', endDraw);
  
  const guessInput = document.getElementById('guess-text');
  if (guessInput) {
    guessInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitGuess();
    });
  }
}

socket.on('new_round', (data) => {
  stopDrawTimer();
  clearCanvasLocal();
  document.getElementById('guesses-list').innerHTML = '';
  
  const wordDisplay = document.getElementById('draw-word-display');
  if (wordDisplay) {
    wordDisplay.textContent = `第 ${data.round}/${data.maxRounds} 轮 - 画手: ${data.drawer}`;
  }
  
  isDrawer = data.drawer === currentUser.nickname;
  
  document.getElementById('draw-tools').style.display = isDrawer ? 'flex' : 'none';
  document.getElementById('guess-input').style.display = isDrawer ? 'none' : 'flex';
  
  const canvas = document.getElementById('draw-canvas');
  if (canvas) {
    canvas.style.pointerEvents = isDrawer ? 'auto' : 'none';
  }
  
  if (isDrawer) {
    wordDisplay.textContent += ' - 你是画手！';
  }
});

socket.on('your_turn_to_draw', (data) => {
  currentWord = data.word;
  const wordDisplay = document.getElementById('draw-word-display');
  if (wordDisplay) {
    wordDisplay.innerHTML = `你要画: <strong>${data.word}</strong>`;
  }
  
  // 启动绘画阶段倒计时
  startDrawTimer('drawing');
});

socket.on('draw_data', (data) => {
  if (!drawCtx) return;
  drawCtx.strokeStyle = data.color;
  if (data.drawing) {
    drawCtx.lineTo(data.x, data.y);
    drawCtx.stroke();
  } else {
    drawCtx.beginPath();
    drawCtx.moveTo(data.x, data.y);
  }
  drawCtx.strokeStyle = currentColor;
});

socket.on('canvas_cleared', () => {
  clearCanvasLocal();
});

function clearCanvas() {
  if (!drawCtx || !isDrawer) return;
  clearCanvasLocal();
  socket.emit('clear_canvas', { roomId: currentRoom.id });
}

function clearCanvasLocal() {
  if (drawCtx && drawCanvas) {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }
}

// ========== 倒计时器功能 ==========

function startDrawTimer(phase) {
  // 停止已有的计时器
  if (drawTimer) {
    clearInterval(drawTimer);
    drawTimer = null;
  }
  
  currentPhase = phase;
  drawTimeLeft = 60;
  
  // 显示计时器
  const timerEl = document.getElementById('draw-timer');
  const phaseEl = document.getElementById('phase-indicator');
  const timerDisplay = document.getElementById('timer-display');
  const timerLabel = document.getElementById('timer-label');
  
  if (timerEl && timerDisplay && timerLabel) {
    timerEl.style.display = 'flex';
    updateTimerDisplay();
    
    // 设置阶段指示器
    if (phaseEl) {
      if (phase === 'drawing') {
        phaseEl.style.display = 'block';
        phaseEl.className = 'phase-indicator drawing';
        phaseEl.textContent = '🎨 绘画阶段';
        timerLabel.textContent = '绘画剩余';
      } else if (phase === 'guessing') {
        phaseEl.style.display = 'block';
        phaseEl.className = 'phase-indicator guessing';
        phaseEl.textContent = '🤔 猜题阶段';
        timerLabel.textContent = '猜题剩余';
      }
    }
    
    // 启动计时器
    drawTimer = setInterval(() => {
      drawTimeLeft--;
      updateTimerDisplay();
      
      // 更新计时器样式（最后10秒警告，最后5秒危险）
      if (drawTimeLeft <= 5) {
        timerEl.className = 'draw-timer danger';
      } else if (drawTimeLeft <= 10) {
        timerEl.className = 'draw-timer warning';
      }
      
      // 时间到
      if (drawTimeLeft <= 0) {
        stopDrawTimer();
        handleTimerEnd();
      }
    }, 1000);
  }
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    const minutes = Math.floor(drawTimeLeft / 60);
    const seconds = drawTimeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

function stopDrawTimer() {
  if (drawTimer) {
    clearInterval(drawTimer);
    drawTimer = null;
  }
  
  const timerEl = document.getElementById('draw-timer');
  if (timerEl) {
    timerEl.style.display = 'none';
  }
  
  const phaseEl = document.getElementById('phase-indicator');
  if (phaseEl) {
    phaseEl.style.display = 'none';
  }
}

function handleTimerEnd() {
  // 通知服务器时间到
  if (currentRoom && currentRoom.id) {
    socket.emit('draw_time_up', { 
      roomId: currentRoom.id,
      phase: currentPhase 
    });
  }
}

function finishDrawing() {
  // 停止计时器
  stopDrawTimer();
  
  // 通知服务器绘画完成
  if (currentRoom && currentRoom.id) {
    socket.emit('finish_drawing', { roomId: currentRoom.id });
  }
}

function submitGuess() {
  const input = document.getElementById('guess-text');
  const answer = input.value.trim();
  if (!answer) return;
  
  socket.emit('guess', { roomId: currentRoom.id, answer });
  input.value = '';
}

socket.on('wrong_guess', (data) => {
  const list = document.getElementById('guesses-list');
  if (list) {
    const item = document.createElement('div');
    item.className = 'guess-item';
    item.textContent = `${data.guesser}: ${data.answer}`;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  }
});

socket.on('correct_guess', (data) => {
  // 停止计时器
  stopDrawTimer();
  
  const list = document.getElementById('guesses-list');
  if (list) {
    const item = document.createElement('div');
    item.className = 'guess-item correct';
    item.textContent = `🎉 ${data.guesser} 猜对了！答案是: ${data.word}`;
    list.appendChild(item);
  }
  
  const playerCards = document.querySelectorAll('#draw-players .player-card');
  data.scores.forEach(score => {
    const card = document.getElementById(`player-${score.nickname}`);
    if (card) {
      const scoreEl = card.querySelector('.player-score');
      if (scoreEl) scoreEl.textContent = `${score.score}分`;
    }
  });
  
  currentRoom.players.forEach(p => {
    const s = data.scores.find(s => s.nickname === p.nickname);
    if (s) p.score = s.score;
  });
});

socket.on('start_guessing', (data) => {
  startDrawTimer('guessing');
  
  const wordDisplay = document.getElementById('draw-word-display');
  if (wordDisplay) {
    wordDisplay.textContent = '猜题阶段 - 快猜猜画的是什么！';
  }
  
  document.getElementById('draw-tools').style.display = 'none';
  document.getElementById('guess-input').style.display = isDrawer ? 'none' : 'flex';
  
  if (isDrawer) {
    const canvas = document.getElementById('draw-canvas');
    if (canvas) {
      canvas.style.pointerEvents = 'none';
    }
  }
});

socket.on('draw_phase_end', (data) => {
  stopDrawTimer();
  startDrawTimer('guessing');
  
  const wordDisplay = document.getElementById('draw-word-display');
  if (wordDisplay) {
    wordDisplay.textContent = '猜题阶段 - 快猜猜画的是什么！';
  }
  
  document.getElementById('draw-tools').style.display = 'none';
  document.getElementById('guess-input').style.display = isDrawer ? 'none' : 'flex';
  
  if (isDrawer) {
    const canvas = document.getElementById('draw-canvas');
    if (canvas) {
      canvas.style.pointerEvents = 'none';
    }
  }
});

socket.on('game_ended', (data) => {
  // 停止计时器
  stopDrawTimer();
  
  const body = document.getElementById('game-modal-body');
  body.innerHTML = `
    <div class="game-room" style="text-align: center;">
      <h2>🎉 游戏结束！</h2>
      <div class="players-list" style="margin: 20px 0;">
        ${data.finalScores.sort((a, b) => b.score - a.score).map((s, i) => `
          <div class="player-card" style="${i === 0 ? 'background: #fff3e0; border: 2px solid #ff9800;' : ''}">
            <div style="font-size: 1.5rem;">${i === 0 ? '👑' : i + 1}</div>
            <div class="player-name">${s.nickname}</div>
            <div class="player-score">${s.score}分</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary" onclick="closeGameModal()">返回广场</button>
    </div>
  `;
});

socket.on('notification', (data) => {
  showNotification(data.message);
});

// ========== 冒险棋（30格增强版） ==========
function renderAdventureGame(room) {
  const body = document.getElementById('game-modal-body');

  body.innerHTML = `
    <div class="game-room">
      <div class="players-list" id="adventure-players">
        ${room.players.map(p => `
          <div class="player-card ${p.isRobot ? 'robot-player' : ''}" id="adv-player-${p.nickname}">
            <div class="player-avatar">${p.avatar || '👧'}</div>
            <div class="player-name">${p.nickname}${p.isRobot ? ' 🤖' : ''}</div>
          </div>
        `).join('')}
      </div>
      <div id="adventure-turn">等待游戏开始...</div>
      <div class="adventure-board-30" id="adventure-board">
        ${generateBoard30(room.players.length)}
      </div>
      <div class="dice-action-area">
        <div class="dice-area">
          <div class="dice" id="dice" onclick="rollDice()">🎲</div>
        </div>
        <button class="btn btn-primary roll-btn-large" id="roll-btn" onclick="rollDice()" style="display: none;">掷骰子 🎲</button>
      </div>
      <div id="event-text" class="event-text" style="display: none;"></div>
    </div>
  `;
}

// 30格冒险棋棋盘
function generateBoard30(playerCount) {
  const playerTokens = ['🔴', '🔵', '🟢', '🟡'];
  const specialCells = {
    0: { class: 'start', text: '起' },
    4: { class: 'event-back', text: '😱' },
    7: { class: 'event-forward', text: '🚀' },
    11: { class: 'event-stop', text: '🚨' },
    15: { class: 'event-back', text: '😤' },
    19: { class: 'event-bonus', text: '💰' },
    22: { class: 'event-swap', text: '🔄' },
    26: { class: 'event-stop', text: '📚' },
    29: { class: 'end', text: '🏆' }
  };

  let html = '<div class="board-row">';

  // 生成30格棋盘 (蛇形布局)
  for (let i = 0; i < 30; i++) {
    const special = specialCells[i];
    let cellClass = 'board-cell-30';
    let content = i + 1;

    if (special) {
      cellClass += ' ' + special.class;
      content = special.text;
    }

    // 添加一些随机事件格
    if (!special && (i === 3 || i === 8 || i === 13 || i === 18 || i === 23)) {
      cellClass += ' event-random';
      content = '❓';
    }

    html += `<div class="${cellClass}" data-pos="${i}">
      <span class="cell-number">${i === 0 ? '起' : (i === 29 ? '终' : (i + 1))}</span>
      <span class="cell-icon">${special ? special.text : ''}</span>
    </div>`;

    // 每6格换行
    if ((i + 1) % 6 === 0 && i < 29) {
      html += '</div><div class="board-row">';
    }
  }

  html += '</div>';
  return html;
}

socket.on('adventure_start', (data) => {
  updateAdventureBoard30(data.positions, data.currentPlayer);
  updateCurrentPlayer(data.currentPlayer);
});

function updateAdventureBoard30(positions, currentPlayer) {
  const playerTokens = ['🔴', '🔵', '🟢', '🟡'];

  document.querySelectorAll('.board-cell-30').forEach(cell => {
    const tokens = cell.querySelectorAll('.player-token');
    tokens.forEach(t => t.remove());
  });

  const posMap = {};
  positions.forEach((pos, idx) => {
    if (!posMap[pos]) posMap[pos] = [];
    posMap[pos].push(idx);
  });

  Object.keys(posMap).forEach(pos => {
    const cell = document.querySelector(`.board-cell-30[data-pos="${pos}"]`);
    if (!cell) return;

    const playerIndices = posMap[pos];
    playerIndices.forEach((playerIdx, i) => {
      const token = document.createElement('span');
      token.className = `player-token player-${playerIdx}`;
      token.textContent = playerTokens[playerIdx];

      if (playerIndices.length > 1) {
        const angle = (i / playerIndices.length) * 360;
        const radius = 15;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        token.style.left = `calc(50% + ${x}px)`;
        token.style.bottom = `${-8 + y}px`;
        token.style.transform = 'translateX(-50%)';
      } else {
        token.style.left = '50%';
        token.style.bottom = '-8px';
        token.style.transform = 'translateX(-50%)';
      }

      cell.appendChild(token);
    });
  });

  if (currentPlayer) {
    const players = currentRoom?.players || [];
    const currentIdx = players.findIndex(p => p.nickname === currentPlayer);
    if (currentIdx >= 0) {
      document.querySelectorAll(`.player-token.player-${currentIdx}`).forEach(t => {
        t.classList.add('current-player');
      });
    }
  }
}

function updateCurrentPlayer(playerName) {
  const turnEl = document.getElementById('adventure-turn');
  const rollBtn = document.getElementById('roll-btn');
  
  if (turnEl) {
    turnEl.textContent = `轮到 ${playerName} 掷骰子`;
  }
  
  const isMyTurn = playerName === currentUser.nickname;
  if (rollBtn) {
    rollBtn.style.display = isMyTurn ? 'inline-block' : 'none';
  }
  
  document.querySelectorAll('#adventure-players .player-card').forEach(card => {
    card.classList.remove('current');
  });
  const currentCard = document.getElementById(`adv-player-${playerName}`);
  if (currentCard) currentCard.classList.add('current');
}

function rollDice() {
  if (!currentRoom) return;
  socket.emit('roll_dice', { roomId: currentRoom.id });
}

socket.on('dice_rolled', (data) => {
  const dice = document.getElementById('dice');
  const eventText = document.getElementById('event-text');

  if (dice) {
    dice.classList.add('rolling');
    const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    dice.textContent = diceFaces[data.dice - 1];
    setTimeout(() => dice.classList.remove('rolling'), 500);
  }

  if (eventText && data.event) {
    eventText.style.display = 'block';

    // 根据事件类型设置样式和动画
    let eventClass = 'event-text';
    let eventIcon = '';

    if (data.event.type === 'back') {
      eventClass += ' event-negative';
      eventIcon = '😱 ';
    } else if (data.event.type === 'forward') {
      eventClass += ' event-positive';
      eventIcon = '🚀 ';
    } else if (data.event.type === 'stop') {
      eventClass += ' event-stop';
      eventIcon = '🚨 ';
    } else if (data.event.type === 'bonus') {
      eventClass += ' event-bonus';
      eventIcon = '💰 ';
    } else if (data.event.type === 'swap') {
      eventClass += ' event-swap';
      eventIcon = '🔄 ';
    } else if (data.event.text.includes('班主任') || data.event.text.includes('刘老师')) {
      eventClass += ' event-teacher';
      eventIcon = '👩‍🏫 ';
    }

    eventText.className = eventClass;
    eventText.innerHTML = `
      <strong>${data.player}</strong> 掷出了 <strong>${data.dice}</strong>！
      <br>${eventIcon}${data.event.text}
      ${data.event.value ? `<span class="event-value">${getEventValueText(data.event)}</span>` : ''}
    `;

    // 事件动画
    eventText.style.animation = 'none';
    eventText.offsetHeight;
    eventText.style.animation = 'eventPopIn 0.5s ease';
  }

  updateAdventureBoard30(data.positions, data.currentPlayer);
});

// 获取事件值的文字描述
function getEventValueText(event) {
  switch(event.type) {
    case 'back':
      return `后退 ${event.value} 格`;
    case 'forward':
      return `前进 ${event.value} 格`;
    case 'stop':
      return `停 ${event.rounds || 1} 轮`;
    case 'bonus':
      return `获得 ${event.value} 金币`;
    case 'swap':
      return '交换位置';
    default:
      return '';
  }
}

socket.on('turn_changed', (data) => {
  updateCurrentPlayer(data.currentPlayer);
});

// ========== 默契大挑战 ==========
function renderTacitGame(room) {
  const body = document.getElementById('game-modal-body');

  body.innerHTML = `
    <div class="game-room">
      <div class="players-list">
        ${room.players.map(p => `
          <div class="player-card ${p.isRobot ? 'robot-player' : ''}" id="tacit-player-${p.nickname}">
            <div class="player-avatar">${p.avatar || '👧'}</div>
            <div class="player-name">${p.nickname}${p.isRobot ? ' 🤖' : ''}</div>
            <div class="player-score">${p.score || 0}分</div>
          </div>
        `).join('')}
      </div>
      <div id="tacit-question" class="tacit-question">等待游戏开始...</div>
      <div id="tacit-options" class="tacit-options"></div>
      <div id="tacit-progress" class="tacit-progress"></div>
      <div id="tacit-result" class="tacit-result" style="display: none;"></div>
    </div>
  `;
}

socket.on('tacit_question', (data) => {
  const qEl = document.getElementById('tacit-question');
  const optionsEl = document.getElementById('tacit-options');
  const progressEl = document.getElementById('tacit-progress');
  const resultEl = document.getElementById('tacit-result');
  
  if (resultEl) resultEl.style.display = 'none';
  
  if (qEl) {
    qEl.textContent = `第 ${data.round}/${data.total} 题：${data.question}`;
  }
  
  if (optionsEl) {
    optionsEl.innerHTML = data.options.map(opt => `
      <button class="tacit-option" onclick="selectTacitAnswer('${opt}')">${opt}</button>
    `).join('');
  }
  
  if (progressEl) {
    progressEl.textContent = '等待大家作答...';
  }
});

function selectTacitAnswer(answer) {
  if (!currentRoom) return;
  
  document.querySelectorAll('.tacit-option').forEach(opt => {
    opt.classList.remove('selected');
    if (opt.textContent === answer) opt.classList.add('selected');
  });
  
  socket.emit('submit_answer', { roomId: currentRoom.id, answer });
}

socket.on('answer_progress', (data) => {
  const progressEl = document.getElementById('tacit-progress');
  if (progressEl) {
    progressEl.textContent = `已作答: ${data.answered}/${data.total} 人`;
  }
});

socket.on('round_result', (result) => {
  const resultEl = document.getElementById('tacit-result');
  if (resultEl) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <h4>${result.allSame ? '🎉 全部一致！灵魂闺蜜！' : '答案统计：'}</h4>
      <div style="font-size: 0.9rem; margin-top: 10px;">
        ${Object.entries(result.answers).map(([name, ans]) => `
          <div>${name}: ${ans}</div>
        `).join('')}
      </div>
    `;
  }
  
  result.scores.forEach(s => {
    const card = document.getElementById(`tacit-player-${s.nickname}`);
    if (card) {
      const scoreEl = card.querySelector('.player-score');
      if (scoreEl) scoreEl.textContent = `${s.score}分`;
    }
    const player = currentRoom.players.find(p => p.nickname === s.nickname);
    if (player) player.score = s.score;
  });
});

// ========== 真心话大冒险 ==========
function renderTruthGame(room) {
  const body = document.getElementById('game-modal-body');

  body.innerHTML = `
    <div class="game-room">
      <div class="players-list">
        ${room.players.map(p => `
          <div class="player-card ${p.isRobot ? 'robot-player' : ''}" id="truth-player-${p.nickname}">
            <div class="player-avatar">${p.avatar || '👧'}</div>
            <div class="player-name">${p.nickname}${p.isRobot ? ' 🤖' : ''}</div>
          </div>
        `).join('')}
      </div>
      <div class="truth-dare-card" id="truth-dare-card">
        <div class="player-name" id="td-player">等待游戏开始...</div>
        <div class="card-content" id="td-content">准备好接受挑战了吗？</div>
      </div>
      <div class="truth-dare-buttons" id="td-buttons" style="display: none;">
        <button class="btn-truth" onclick="selectTruthDare('truth')">💝 真心话</button>
        <button class="btn-dare" onclick="selectTruthDare('dare')">🔥 大冒险</button>
      </div>
      <button class="btn btn-primary" id="next-btn" onclick="nextTruthDare()" style="display: none;">下一个人 →</button>
    </div>
  `;
}

socket.on('truth_dare_new_round', (data) => {
  const playerEl = document.getElementById('td-player');
  const contentEl = document.getElementById('td-content');
  const buttonsEl = document.getElementById('td-buttons');
  const nextBtn = document.getElementById('next-btn');
  
  document.querySelectorAll('#truth-players .player-card').forEach(card => {
    card.classList.remove('current');
  });
  const currentCard = document.getElementById(`truth-player-${data.player}`);
  if (currentCard) currentCard.classList.add('current');
  
  if (playerEl) playerEl.textContent = `${data.player} 请选择！`;
  if (contentEl) contentEl.textContent = '真心话还是大冒险？';
  
  const isMyTurn = data.player === currentUser.nickname;
  if (buttonsEl) buttonsEl.style.display = isMyTurn ? 'flex' : 'none';
  if (nextBtn) nextBtn.style.display = 'none';
});

function selectTruthDare(type) {
  if (!currentRoom) return;
  
  const questions = {
    truth: [
      '你最近一次哭是因为什么？',
      '你最喜欢的人是谁？（可以说爱豆）',
      '你做过最糗的事是什么？',
      '你有什么小秘密从来没告诉过别人？',
      '你最想穿越到哪部电视剧里？',
      '你觉得自己最好看的地方是哪里？',
      '你最害怕的事情是什么？',
      '如果有超能力，你最想要什么？',
      '你最近一次撒谎是什么时候？',
      '你最想和谁交换一天人生？'
    ],
    dare: [
      '模仿你最喜欢的爱豆跳舞',
      '用最嗲的声音说一句"人家不要啦~"',
      '给在场每个人一个飞吻',
      '学猫叫并卖萌10秒',
      '做一个最丑的鬼脸，保持5秒',
      '用方言唱一首歌的高潮部分',
      '即兴表演一段rap',
      '模仿表情包里的一个动作',
      '对着镜头说"我是宇宙超级美少女"',
      '跳一段广场舞'
    ]
  };
  
  const list = questions[type];
  const question = list[Math.floor(Math.random() * list.length)];
  
  const typeName = type === 'truth' ? '真心话' : '大冒险';
  
  const contentEl = document.getElementById('td-content');
  if (contentEl) {
    contentEl.innerHTML = `<strong>${typeName}：</strong>${question}`;
  }
  
  document.getElementById('td-buttons').style.display = 'none';
  document.getElementById('next-btn').style.display = 'inline-block';
  
  socket.emit('truth_dare_action', {
    roomId: currentRoom.id,
    action: { type, question }
  });
}

socket.on('truth_dare_update', (data) => {
  if (data.action.type && data.action.question) {
    const typeName = data.action.type === 'truth' ? '真心话' : '大冒险';
    const contentEl = document.getElementById('td-content');
    if (contentEl) {
      contentEl.innerHTML = `<strong>${typeName}：</strong>${data.action.question}`;
    }
    document.getElementById('td-buttons').style.display = 'none';
    document.getElementById('next-btn').style.display = 
      data.player === currentUser.nickname ? 'inline-block' : 'none';
  }
});

function nextTruthDare() {
  if (!currentRoom) return;
  socket.emit('truth_dare_action', {
    roomId: currentRoom.id,
    action: 'next'
  });
}
