const socket = io();
let currentUser = null;
let selectedAvatar = '👧';
let currentGameType = null;
let onlineUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initNavigation();
  initActionButtons();
  initChatInput();
  initRoomListRefresh();
  initShop();
  initAchievements();
  initDailyTasks();
  initRoomStyle();
  initWardrobeTabs();
  initPet();
  
  // 定期刷新在线用户列表
  setInterval(() => {
    if (currentUser) {
      socket.emit('get_all_users');
    }
  }, 5000);
});

function initLoginPage() {
  const avatarOptions = document.querySelectorAll('.avatar-option');
  avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      avatarOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedAvatar = opt.dataset.avatar;
    });
  });

  const loginBtn = document.getElementById('login-btn');
  const loginNickname = document.getElementById('login-nickname');

  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  if (loginNickname) {
    loginNickname.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', handleRegister);
  }

  const registerInputs = ['register-nickname', 'register-password', 'register-password2'];
  registerInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
      });
    }
  });
  
  const savedNickname = localStorage.getItem('guimi_nickname');
  const savedPassword = localStorage.getItem('guimi_password');
  const loginPassword = document.getElementById('login-password');
  const rememberMe = document.getElementById('remember-me');
  
  if (savedNickname && loginNickname) {
    loginNickname.value = savedNickname;
  }
  if (savedPassword && loginPassword) {
    loginPassword.value = savedPassword;
    if (rememberMe) {
      rememberMe.checked = true;
    }
  }
}

function logout() {
  localStorage.removeItem('guimi_nickname');
  localStorage.removeItem('guimi_password');
  socket.emit('logout');
  currentUser = null;
  document.getElementById('main-page').classList.remove('active');
  document.getElementById('login-page').classList.add('active');
  document.getElementById('login-nickname').value = '';
  document.getElementById('login-password').value = '';
  const rememberMe = document.getElementById('remember-me');
  if (rememberMe) {
    rememberMe.checked = false;
  }
}

function showRegisterForm() {
  document.getElementById('login-form-box').style.display = 'none';
  document.getElementById('register-form-box').style.display = 'block';
}

function showLoginForm() {
  document.getElementById('register-form-box').style.display = 'none';
  document.getElementById('login-form-box').style.display = 'block';
}

function handleLogin() {
  const nickname = document.getElementById('login-nickname').value.trim();
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me')?.checked || false;

  if (!nickname) {
    showNotification('请输入姓名哦~');
    return;
  }
  if (nickname.length < 2) {
    showNotification('姓名至少2个字~');
    return;
  }
  if (nickname.length > 10) {
    showNotification('姓名不能超过10个字~');
    return;
  }
  if (!password) {
    showNotification('请输入密码哦~');
    return;
  }

  socket.emit('login', { nickname, password, rememberMe });
}

function handleRegister() {
  const nickname = document.getElementById('register-nickname').value.trim();
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;

  if (!nickname) {
    showNotification('请输入真实姓名哦~');
    return;
  }
  if (nickname.length < 2) {
    showNotification('姓名至少2个字~');
    return;
  }
  if (nickname.length > 10) {
    showNotification('姓名不能超过10个字~');
    return;
  }
  if (!password) {
    showNotification('请设置密码~');
    return;
  }
  if (password.length < 4) {
    showNotification('密码至少4位~');
    return;
  }
  if (password.length > 16) {
    showNotification('密码不能超过16位~');
    return;
  }
  if (password !== password2) {
    showNotification('两次密码输入不一致~');
    return;
  }

  socket.emit('register', { nickname, password, avatar: selectedAvatar });
}

socket.on('register_success', (data) => {
  showNotification('🎉 注册成功！正在登录...');
  setTimeout(() => {
    showLoginForm();
    document.getElementById('login-nickname').value = data.nickname;
    handleLogin();
  }, 1000);
});

socket.on('user_data', (user) => {
  currentUser = user;

  if (user.rememberMe) {
    localStorage.setItem('guimi_nickname', user.nickname);
    localStorage.setItem('guimi_password', document.getElementById('login-password').value || '');
  }

  showMainPage();
  updateUserDisplay();
  updateStatusBars();
  updateCharacter();
  loadRoom();
  loadOwnedFurniture();
  refreshFriendsList();

  if (document.getElementById('shop-page').classList.contains('active')) {
    document.getElementById('shop-coins').textContent = user.coins;
  }

  if (typeof renderShopItems === 'function') {
    renderShopItems();
    renderShopModalItems();
  }

  if (typeof loadPet === 'function') {
    loadPet();
  }

  if (typeof initMoments === 'function') {
    initMoments();
  }

  // 设置房间风格
  if (user.room_style) {
    document.getElementById('room-style').value = user.room_style;
    applyRoomStyle(user.room_style);
  }

  // 通知后端用户登录完成，用于恢复镇长权限
  socket.emit('user_login_complete');
});

socket.on('daily_bonus', (data) => {
  const banner = document.getElementById('daily-bonus-banner');
  const text = document.getElementById('bonus-text');
  text.textContent = `🎉 连续登录${data.days}天！获得${data.coins}金币奖励！`;
  banner.style.display = 'flex';
  
  setTimeout(() => {
    banner.style.display = 'none';
  }, 5000);
});

function closeBonusBanner() {
  document.getElementById('daily-bonus-banner').style.display = 'none';
}

socket.on('error', (err) => {
  showNotification(err.message || '出错了~');
});

function showMainPage() {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('main-page').classList.add('active');
}

function updateUserDisplay() {
  document.getElementById('user-avatar').textContent = currentUser.avatar;
  document.getElementById('user-nickname').textContent = currentUser.nickname;
  document.getElementById('user-coins').textContent = currentUser.coins;
}

function updateStatusBars() {
  const statuses = ['mood', 'energy', 'hunger', 'study'];
  statuses.forEach(status => {
    const value = currentUser[status] || 0;
    document.getElementById(`${status}-fill`).style.width = `${value}%`;
    document.getElementById(`${status}-text`).textContent = value;
  });
}

function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
      document.getElementById(`${page}-page`).classList.add('active');
      
      if (page === 'friends') {
        refreshFriendsList();
      }
      if (page === 'plaza') {
        refreshRoomList();
        loadDailyTasks();
        refreshFriendsList();
        if (typeof loadMoments === 'function') {
          loadMoments();
        }
      }
      if (page === 'shop') {
        document.getElementById('shop-coins').textContent = currentUser?.coins || 0;
      }
      if (page === 'pet') {
        if (typeof loadPet === 'function') {
          loadPet();
        }
      }
    });
  });
}

function initActionButtons() {
  const actionBtns = document.querySelectorAll('.action-btn');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleAction(action);
    });
  });
}

function handleAction(action) {
  if (!currentUser) return;
  
  let updates = {};
  let message = '';
  
  switch(action) {
    case 'eat':
      if (currentUser.coins < 10) {
        showNotification('金币不够啦~');
        return;
      }
      updates = { hunger: Math.min(100, currentUser.hunger + 20), coins: currentUser.coins - 10 };
      message = '吃饱饱~ 🍔';
      animateCharacter('happy');
      break;
    case 'sleep':
      updates = { energy: Math.min(100, currentUser.energy + 30), mood: Math.min(100, currentUser.mood + 5) };
      message = '睡个好觉~ 😴';
      animateCharacter('sleep');
      break;
    case 'study':
      if (currentUser.energy < 10) {
        showNotification('太累了，先休息一下吧~');
        return;
      }
      updates = { study: Math.min(100, currentUser.study + 15), energy: Math.max(0, currentUser.energy - 10), mood: Math.max(0, currentUser.mood - 5) };
      message = '好好学习，天天向上！📚';
      break;
    case 'play':
      if (currentUser.energy < 5) {
        showNotification('太累了，先休息一下吧~');
        return;
      }
      updates = { mood: Math.min(100, currentUser.mood + 15), energy: Math.max(0, currentUser.energy - 5), hunger: Math.max(0, currentUser.hunger - 5) };
      message = '玩得开心！🎮';
      animateCharacter('happy');
      break;
    case 'coffee':
      if (currentUser.coins < 5) {
        showNotification('金币不够啦~');
        return;
      }
      updates = { energy: Math.min(100, currentUser.energy + 20), coins: currentUser.coins - 5 };
      message = '咖啡续命~ ☕';
      break;
    case 'diary':
      openDiaryModal();
      return;
  }
  
  currentUser = { ...currentUser, ...updates };
  updateStatusBars();
  updateUserDisplay();
  socket.emit('update_status', updates);
  showNotification(message);
}

function animateCharacter(type) {
  const char = document.getElementById('character');
  const body = document.getElementById('character-body');
  if (!char || !body) return;

  if (type === 'happy') {
    char.style.animation = 'happyDance 0.5s ease';
    setTimeout(() => { char.style.animation = ''; }, 500);
    
    const armRight = body.querySelector('.char-arm-right');
    if (armRight) {
      armRight.style.animation = 'wave 0.4s ease infinite';
      setTimeout(() => { armRight.style.animation = ''; }, 1000);
    }
  } else if (type === 'sleep') {
    body.style.animation = 'sleep 1s ease infinite';
    setTimeout(() => { body.style.animation = ''; }, 3000);
  }
}

function startCharacterBlink() {
  setInterval(() => {
    const eyes = document.querySelectorAll('.char-eye-left, .char-eye-right, .char-eye-left-large, .char-eye-right-large');
    eyes.forEach(eye => {
      eye.style.animation = 'blink 0.1s ease';
      setTimeout(() => { eye.style.animation = ''; }, 100);
    });
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(startCharacterBlink, 2000);
});

function updateCharacter() {
  const style = currentUser.outfit_color || 'pink';
  const hairColor = currentUser.hair_color || 'black';
  const accessory = currentUser.accessory || 'none';

  const colorMap = {
    pink: { top: '#ff6b9d', bottom: '#e91e63' },
    blue: { top: '#64b5f6', bottom: '#1976d2' },
    black: { top: '#424242', bottom: '#212121' },
    gold: { top: '#ffd54f', bottom: '#ff8f00' },
    green: { top: '#81c784', bottom: '#388e3c' },
    purple: { top: '#ba68c8', bottom: '#7b1fa2' },
    red: { top: '#e57373', bottom: '#d32f2f' },
    orange: { top: '#ffb74d', bottom: '#ff7043' },
    white: { top: '#f5f5f5', bottom: '#e0e0e0' },
    cyan: { top: '#80deea', bottom: '#00bcd4' }
  };

  const hairColorMap = {
    black: '#333',
    brown: '#6d4c41',
    blonde: '#ffd54f',
    red: '#e57373',
    blue: '#64b5f6',
    pink: '#f48fb1',
    purple: '#ba68c8',
    green: '#81c784',
    white: '#e0e0e0'
  };

  const accessoryMap = {
    none: '',
    glasses: '👓',
    sunglasses: '🕶️',
    hat: '🧢',
    crown: '👑',
    ribbon: '🎀',
    earrings: '💎',
    necklace: '📿',
    hairpin: '🌸',
    bow: '🎀'
  };

  const colors = colorMap[style] || colorMap.pink;
  const hColor = hairColorMap[hairColor] || hairColorMap.black;

  const hairStyles = {
    ponytail: 'border-radius: 20px 20px 5px 5px; height: 28px;',
    bob: 'border-radius: 50% 50% 5px 5px; height: 24px;',
    long: 'border-radius: 20px 20px 8px 8px; height: 34px;',
    twin: 'border-radius: 12px 12px 5px 5px;',
    short: 'border-radius: 18px 18px 5px 5px; height: 20px;',
    curly: 'border-radius: 30px 30px 10px 10px; height: 30px;',
    braid: 'border-radius: 15px 15px 5px 5px; height: 32px;',
    bangs: 'border-radius: 20px 20px 0 0; height: 22px;'
  };

  const tops = {
    tshirt: 'border-radius: 10px 10px 5px 5px;',
    hoodie: 'border-radius: 14px 14px 5px 5px; height: 32px;',
    jk: 'border-radius: 5px 5px 0 0; width: 48px;',
    sweater: 'border-radius: 12px 12px 5px 5px;',
    blouse: 'border-radius: 8px 8px 4px 4px;',
    cardigan: 'border-radius: 10px 10px 5px 5px;',
    tank: 'border-radius: 6px 6px 4px 4px;',
    blazer: 'border-radius: 12px 12px 5px 5px;',
    kimono: 'border-radius: 10px 10px 15px 15px;'
  };

  const bottoms = {
    skirt: 'border-radius: 5px 5px 10px 10px;',
    pants: 'border-radius: 5px; height: 28px;',
    shorts: 'border-radius: 5px 5px 8px 8px; height: 18px;',
    dress: 'border-radius: 5px 5px 15px 15px; height: 34px;',
    pleated: 'border-radius: 5px 5px 12px 12px;',
    miniskirt: 'border-radius: 5px 5px 8px 8px;',
    leggings: 'border-radius: 5px; height: 26px;',
    jeans: 'border-radius: 5px; height: 28px;'
  };

  const hairStyle = currentUser.hair_style || 'ponytail';
  const topStyle = currentUser.top || 'tshirt';
  const bottomStyle = currentUser.bottom || 'skirt';

  document.querySelectorAll('.char-hair, .char-hair-large').forEach(el => {
    el.style.background = hColor;
    el.setAttribute('style', `${hairStyles[hairStyle]} background: ${hColor};`);
  });

  document.querySelectorAll('.char-top, .char-top-large').forEach(el => {
    el.setAttribute('style', `background: ${colors.top}; ${tops[topStyle]}`);
  });

  document.querySelectorAll('.char-bottom, .char-bottom-large').forEach(el => {
    el.setAttribute('style', `background: ${colors.bottom}; ${bottoms[bottomStyle]}`);
  });

  document.querySelectorAll('.char-leg-left, .char-leg-right, .char-leg-left-large, .char-leg-right-large').forEach(el => {
    el.style.background = colors.bottom;
  });

  document.querySelectorAll('.char-arm-left, .char-arm-right, .char-arm-left-large, .char-arm-right-large').forEach(el => {
    el.style.background = '#ffdbac';
  });

  document.querySelectorAll('.char-hand-left, .char-hand-right, .char-hand-left-large, .char-hand-right-large').forEach(el => {
    el.style.background = '#ffdbac';
  });

  document.querySelectorAll('.char-shoe-left, .char-shoe-right, .char-shoe-left-large, .char-shoe-right-large').forEach(el => {
    el.style.background = '#333';
  });

  document.querySelectorAll('.char-accessory').forEach(el => {
    el.textContent = '';
    el.style.transform = 'translateX(-50%)';
    el.style.top = '-20px';
    el.style.left = '50%';
    el.style.fontSize = '1.5rem';
  });

  document.querySelectorAll('.char-accessory-large').forEach(el => {
    el.textContent = '';
    el.style.transform = 'translateX(-50%)';
    el.style.top = '-25px';
    el.style.left = '50%';
    el.style.fontSize = '2rem';
  });

  const acc = accessoryMap[accessory];
  if (acc) {
    const isLarge = el => el.classList.contains('char-accessory-large');
    
    document.querySelectorAll('.char-accessory').forEach(el => {
      el.textContent = acc;
      if (accessory === 'earrings') {
        el.style.top = '22px';
        el.style.fontSize = '0.8rem';
      } else if (accessory === 'necklace') {
        el.style.top = '58px';
        el.style.fontSize = '0.8rem';
      } else if (accessory === 'glasses' || accessory === 'sunglasses') {
        el.style.top = '10px';
        el.style.fontSize = '1rem';
      } else if (accessory === 'hairpin') {
        el.style.top = '-12px';
        el.style.fontSize = '0.8rem';
        el.style.left = '35%';
        el.style.transform = 'translateX(-50%) rotate(-30deg)';
      } else if (accessory === 'ribbon' || accessory === 'bow') {
        el.style.top = '-15px';
        el.style.fontSize = '1rem';
      } else if (accessory === 'crown') {
        el.style.top = '-28px';
        el.style.fontSize = '1.3rem';
      } else if (accessory === 'hat') {
        el.style.top = '-32px';
        el.style.fontSize = '1.5rem';
      }
    });

    document.querySelectorAll('.char-accessory-large').forEach(el => {
      el.textContent = acc;
      if (accessory === 'earrings') {
        el.style.top = '28px';
        el.style.fontSize = '1.2rem';
      } else if (accessory === 'necklace') {
        el.style.top = '68px';
        el.style.fontSize = '1.2rem';
      } else if (accessory === 'glasses' || accessory === 'sunglasses') {
        el.style.top = '15px';
        el.style.fontSize = '1.5rem';
      } else if (accessory === 'hairpin') {
        el.style.top = '-18px';
        el.style.fontSize = '1.2rem';
        el.style.left = '35%';
        el.style.transform = 'translateX(-50%) rotate(-30deg)';
      } else if (accessory === 'ribbon' || accessory === 'bow') {
        el.style.top = '-22px';
        el.style.fontSize = '1.5rem';
      } else if (accessory === 'crown') {
        el.style.top = '-38px';
        el.style.fontSize = '2rem';
      } else if (accessory === 'hat') {
        el.style.top = '-45px';
        el.style.fontSize = '2.2rem';
      }
    });
  }
}

function initRoomStyle() {
  const select = document.getElementById('room-style');
  if (select) {
    select.addEventListener('change', () => {
      changeRoomStyle();
    });
  }
}

function changeRoomStyle() {
  const style = document.getElementById('room-style').value;
  applyRoomStyle(style);
  socket.emit('change_room_style', { style });
}

function applyRoomStyle(style) {
  const container = document.getElementById('room-container');
  if (container) {
    container.className = 'room-container ' + style;
  }
}

function loadRoom() {
  const grid = document.getElementById('room-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  const furniture = currentUser.furniture ? JSON.parse(currentUser.furniture) : [];
  
  for (let i = 0; i < 36; i++) {
    const cell = document.createElement('div');
    cell.className = 'room-cell';
    cell.dataset.pos = i;
    const item = furniture.find(f => f.position === i);
    if (item) {
      cell.textContent = item.icon;
    }
    grid.appendChild(cell);
  }
}

function loadOwnedFurniture() {
  const container = document.getElementById('owned-furniture');
  if (!container || !currentUser) return;
  
  const owned = currentUser.furniture ? JSON.parse(currentUser.furniture) : [];
  
  if (owned.length === 0) {
    container.innerHTML = '<p class="empty-text">还没有家具，去商店买吧~</p>';
    return;
  }
  
  container.innerHTML = owned.map(item => `
    <div class="furniture-item ${item.position >= 0 ? 'placed' : ''}" 
         onclick="selectFurniture('${item.id}')"
         data-id="${item.id}">
      <span class="furniture-icon">${item.icon}</span>
      <span class="furniture-name">${item.name}</span>
    </div>
  `).join('');
}

function refreshFriendsList() {
  socket.emit('get_all_users');
}

function renderFriendItem(u, isOnline) {
  return `
    <div class="friend-item ${isOnline ? '' : 'offline'}">
      <div class="friend-avatar">
        ${u.avatar}
        ${isOnline ? '<span class="online-dot"></span>' : '<span class="offline-dot"></span>'}
      </div>
      <div class="friend-info">
        <div class="name">${u.nickname}</div>
        <div class="status">${isOnline ? '在线中' : '离线'}</div>
        <div class="intimacy-status" id="intimacy-${u.nickname}">加载中...</div>
      </div>
      ${isOnline ? `<button class="visit-btn" onclick="visitFriendHouse('${u.nickname}')">串门</button>` : ''}
      ${isOnline ? `<button class="poke-btn" onclick="pokeFriend('${u.nickname}')">戳一下</button>` : ''}
      <button class="gift-btn" onclick="showGiftModal('${u.nickname}')">送礼物</button>
    </div>
  `;
}

socket.on('all_users', (data) => {
  const list = document.getElementById('friends-list');
  const countEl = document.getElementById('online-count');
  const friendsCountEl = document.getElementById('friends-count');
  
  const allUsers = [...data.online, ...data.offline];
  
  if (countEl) {
    countEl.textContent = data.online.length;
  }
  if (friendsCountEl) {
    friendsCountEl.textContent = `(在线 ${data.online.length} / 共 ${allUsers.length})`;
  }
  
  if (!list) return;
  
  if (allUsers.length === 0) {
    list.innerHTML = '<p class="empty-text">暂无闺蜜~</p>';
    return;
  }
  
  let html = '';
  
  if (data.online.length > 0) {
    html += `<div class="friend-section-title">👭 在线闺蜜 (${data.online.length})</div>`;
    html += data.online.map(u => renderFriendItem(u, true)).join('');
  }
  
  if (data.offline.length > 0) {
    html += `<div class="friend-section-title">💤 离线闺蜜 (${data.offline.length})</div>`;
    html += data.offline.map(u => renderFriendItem(u, false)).join('');
  }
  
  list.innerHTML = html;
  
  allUsers.forEach(u => {
    socket.emit('get_intimacy', { targetNickname: u.nickname });
  });
});

function pokeFriend(nickname) {
  socket.emit('poke', { targetNickname: nickname });
  showNotification(`已戳 ${nickname}~ 👆`);
}

// ========== 串门功能 ==========
let currentVisitHost = null;

function visitFriendHouse(nickname) {
  currentVisitHost = nickname;
  document.getElementById('visit-host-name').textContent = nickname;
  document.getElementById('visit-modal').classList.add('active');
  socket.emit('visit_house', { hostNickname: nickname });
  switchVisitTab('room');
}

function closeVisitModal() {
  if (currentVisitHost) {
    socket.emit('leave_house', { hostNickname: currentVisitHost });
    currentVisitHost = null;
  }
  document.getElementById('visit-modal').classList.remove('active');
}

function switchVisitTab(tab) {
  document.querySelectorAll('.visit-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.visit-tab[data-tab="${tab}"]`).classList.add('active');
  
  document.querySelectorAll('.visit-tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(`visit-${tab}-tab`).style.display = 'block';
}

function renderVisitRoom(host) {
  const container = document.getElementById('visit-room-grid');
  if (!container) return;
  
  const furniture = host.furniture ? JSON.parse(host.furniture) : [];
  const roomStyle = host.room_style || 'pink';
  
  let html = `<div class="visit-room-info">
    <div class="visit-host-avatar">${host.avatar || '👧'}</div>
    <div class="visit-host-name">${host.nickname}的小屋</div>
  </div>`;
  
  html += '<div class="visit-room-grid">';
  for (let i = 0; i < 12; i++) {
    const item = furniture.find(f => f.position === i);
    html += `
      <div class="room-cell">
        ${item ? `<span class="cell-item">${item.icon}</span>` : ''}
      </div>
    `;
  }
  html += '</div>';
  
  container.innerHTML = html;
}

function renderVisitDiary(host) {
  const list = document.getElementById('visit-diary-list');
  if (!list) return;
  
  const diaries = host.diary ? JSON.parse(host.diary) : [];
  
  if (diaries.length === 0) {
    list.innerHTML = '<p class="empty-text">TA还没有写过日记呢~</p>';
    return;
  }
  
  list.innerHTML = diaries.slice().reverse().map(d => `
    <div class="diary-entry">
      <div class="diary-date">${new Date(d.date).toLocaleDateString('zh-CN')}</div>
      <div class="diary-content">${escapeHtml(d.content)}</div>
    </div>
  `).join('');
}

function renderVisitPet(host) {
  const container = document.getElementById('visit-pet-content');
  if (!container) return;
  
  if (!host.pet || host.pet === 'null' || host.pet === null) {
    container.innerHTML = '<p class="empty-text">TA还没有养宠物呢~</p>';
    return;
  }
  
  const pet = typeof host.pet === 'string' ? JSON.parse(host.pet) : host.pet;
  const petTypes = {
    cat: { name: '小猫咪', icon: '🐱' },
    dog: { name: '小狗狗', icon: '🐶' },
    rabbit: { name: '小兔兔', icon: '🐰' },
    hamster: { name: '小仓鼠', icon: '🐹' },
    panda: { name: '小熊猫', icon: '🐼' },
    fox: { name: '小狐狸', icon: '🦊' }
  };
  
  const petType = petTypes[pet.type] || { name: '小宠物', icon: '🐾' };
  const level = pet.level || 1;
  const exp = pet.exp || 0;
  const expNeeded = level * 100;
  const hunger = pet.hunger !== undefined ? pet.hunger : 80;
  const mood = pet.mood !== undefined ? pet.mood : 90;
  const health = pet.health !== undefined ? pet.health : 95;
  
  container.innerHTML = `
    <div class="pet-info-card">
      <div class="pet-avatar-area">
        <div class="pet-avatar">${petType.icon}</div>
        <div class="pet-level-badge">Lv.${level}</div>
      </div>
      <div class="pet-name">${petType.name}</div>
      <div class="pet-exp-bar">
        <div class="pet-exp-fill" style="width: ${Math.min(100, (exp / expNeeded) * 100)}%"></div>
        <span class="pet-exp-text">${exp}/${expNeeded}</span>
      </div>
    </div>
    <div class="pet-stats">
      <div class="pet-stat-item">
        <span class="pet-stat-icon">🍖</span>
        <div class="pet-stat-info">
          <div class="pet-stat-label">饥饿度</div>
          <div class="pet-stat-bar">
            <div class="pet-stat-fill" style="width: ${hunger}%; background: #ff9800;"></div>
          </div>
        </div>
        <span class="pet-stat-value">${Math.round(hunger)}</span>
      </div>
      <div class="pet-stat-item">
        <span class="pet-stat-icon">😊</span>
        <div class="pet-stat-info">
          <div class="pet-stat-label">心情值</div>
          <div class="pet-stat-bar">
            <div class="pet-stat-fill" style="width: ${mood}%; background: #e91e63;"></div>
          </div>
        </div>
        <span class="pet-stat-value">${Math.round(mood)}</span>
      </div>
      <div class="pet-stat-item">
        <span class="pet-stat-icon">💚</span>
        <div class="pet-stat-info">
          <div class="pet-stat-label">健康值</div>
          <div class="pet-stat-bar">
            <div class="pet-stat-fill" style="width: ${health}%; background: #4caf50;"></div>
          </div>
        </div>
        <span class="pet-stat-value">${Math.round(health)}</span>
      </div>
    </div>
  `;
}

socket.on('host_house_data', (host) => {
  renderVisitRoom(host);
  renderVisitDiary(host);
  renderVisitPet(host);
});

socket.on('poked', (data) => {
  showNotification(`${data.from} 戳了你一下！👉👈`);
  if (navigator.vibrate) {
    navigator.vibrate(200);
  }
});

function showGiftModal(targetNickname) {
  document.getElementById('gift-target-name').textContent = targetNickname;
  currentGiftTarget = targetNickname;
  socket.emit('get_intimacy', { targetNickname });
  
  if (!shopData) {
    socket.emit('get_shop_data');
  }
  
  renderGiftList(targetNickname);
  
  document.querySelectorAll('.gift-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.gift-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.gift-tab')?.classList.add('active');
  document.getElementById('gift-send-panel')?.classList.add('active');
  
  document.getElementById('gift-modal').classList.add('active');
}

function renderGiftList(targetNickname) {
  const list = document.getElementById('gift-list');
  if (!list || !shopData || !shopData.gifts) return;
  
  list.innerHTML = shopData.gifts.map(gift => `
    <div class="gift-item-select" onclick="sendGiftToTarget('${targetNickname}', '${gift.id}')">
      <div class="gift-icon">${gift.icon}</div>
      <div class="gift-name">${gift.name}</div>
      <div class="gift-price">💰 ${gift.price}</div>
      <div class="gift-intimacy">💕 +${gift.intimacy}</div>
    </div>
  `).join('');
}

function sendGiftToTarget(targetNickname, giftId) {
  socket.emit('send_gift', { targetNickname, giftId });
}

function closeGiftModal() {
  document.getElementById('gift-modal').classList.remove('active');
}

function initChatInput() {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
      }
    });
    
    chatInput.addEventListener('input', () => {
      chatInput.dataset.value = chatInput.value;
    });
  }
  
  socket.emit('get_chat_history');
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  
  const content = input.value.trim();
  if (!content) return;
  
  if (!currentUser) {
    showNotification('请先登录');
    return;
  }
  
  socket.emit('send_message', { content });
  
  input.value = '';
  input.blur();
  
  try {
    input.focus();
  } catch (e) {}
}

socket.on('public_message', (msg) => {
  const chatBox = document.getElementById('chat-messages');
  if (!chatBox) return;
  
  const fromName = msg.from || '匿名用户';
  const isMine = fromName === (currentUser?.nickname || '');
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${isMine ? 'mine' : ''}`;
  msgEl.innerHTML = `
    <div class="msg-from">${fromName}</div>
    <div class="msg-content">${escapeHtml(msg.content || '')}</div>
  `;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on('chat_history', (messages) => {
  const chatBox = document.getElementById('chat-messages');
  if (!chatBox) return;
  
  chatBox.innerHTML = '';
  
  messages.forEach(msg => {
    const fromName = msg.from_user || msg.from || '匿名用户';
    const isMine = fromName === (currentUser?.nickname || '');
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${isMine ? 'mine' : ''}`;
    msgEl.innerHTML = `
      <div class="msg-from">${fromName}</div>
      <div class="msg-content">${escapeHtml(msg.content || '')}</div>
    `;
    chatBox.appendChild(msgEl);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(text) {
  const notif = document.getElementById('notification');
  notif.textContent = text;
  notif.classList.add('show');
  setTimeout(() => {
    notif.classList.remove('show');
  }, 2000);
}

// 镇长功能
let isMayor = false;
let mayorClickCount = 0;
let mayorClickTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const madeByText = document.getElementById('made-by-text');
  if (madeByText) {
    madeByText.addEventListener('click', () => {
      mayorClickCount++;
      
      if (mayorClickTimer) clearTimeout(mayorClickTimer);
      
      mayorClickTimer = setTimeout(() => {
        mayorClickCount = 0;
      }, 2000);
      
      if (mayorClickCount >= 3) {
        mayorClickCount = 0;
        document.getElementById('mayor-login-modal').classList.add('active');
      }
    });
  }
});

function closeMayorLoginModal() {
  document.getElementById('mayor-login-modal').classList.remove('active');
  document.getElementById('mayor-password').value = '';
}

function mayorLogin() {
  const password = document.getElementById('mayor-password').value;
  if (!password) {
    showNotification('请输入镇长密码');
    return;
  }
  socket.emit('mayor_login', { password });
}

socket.on('mayor_login_success', () => {
  isMayor = true;
  closeMayorLoginModal();
  showMainPage();
  document.getElementById('mayor-btn').style.display = 'block';
  showNotification('🏛️ 欢迎镇长回来！');
  localStorage.setItem('mayor_logged_in', 'true');
});

socket.on('mayor_login_failed', () => {
  showNotification('密码错误！');
});

// 镇长权限恢复（刷新页面后自动恢复）
socket.on('mayor_status_restored', () => {
  isMayor = true;
  document.getElementById('mayor-btn').style.display = 'block';
  console.log('镇长权限已恢复');
});

function openMayorPanel() {
  if (!isMayor) return;
  document.getElementById('mayor-panel-modal').classList.add('active');
  socket.emit('mayor_get_users');
  socket.emit('mayor_get_announcements');
  socket.emit('mayor_get_stats');
  socket.emit('get_daily_surprise');
}

function closeMayorPanel() {
  document.getElementById('mayor-panel-modal').classList.remove('active');
}

function switchMayorTab(tabName) {
  document.querySelectorAll('.mayor-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.mayor-tab-content').forEach(c => c.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById('mayor-tab-' + tabName)?.classList.add('active');
  
  if (tabName === 'users') {
    socket.emit('mayor_get_users');
  } else if (tabName === 'broadcast') {
    socket.emit('mayor_get_announcements');
  } else if (tabName === 'stats') {
    refreshStats();
  }
}

// 广播站
function createBroadcast() {
  const title = document.getElementById('broadcast-title').value.trim();
  const content = document.getElementById('broadcast-content').value.trim();
  const days = parseInt(document.getElementById('broadcast-days').value) || 7;
  
  if (!title || !content) {
    showNotification('请填写标题和内容');
    return;
  }
  
  socket.emit('mayor_create_announcement', { title, content, expiresDays: days });
}

socket.on('mayor_announcements', (announcements) => {
  const list = document.getElementById('broadcast-list');
  if (!list) return;
  
  if (announcements.length === 0) {
    list.innerHTML = '<p class="empty-text">暂无广播记录</p>';
    return;
  }
  
  list.innerHTML = announcements.map(a => `
    <div class="broadcast-item">
      <button class="delete-btn" onclick="deleteBroadcast(${a.id})">删除</button>
      <div class="broadcast-title">${a.title}</div>
      <div class="broadcast-content">${a.content}</div>
      <div class="broadcast-time">${new Date(a.created_at).toLocaleString('zh-CN')}</div>
    </div>
  `).join('');
});

socket.on('mayor_announcement_created', () => {
  showNotification('广播发布成功！');
  document.getElementById('broadcast-title').value = '';
  document.getElementById('broadcast-content').value = '';
  socket.emit('mayor_get_announcements');
});

function deleteBroadcast(id) {
  if (!confirm('确定删除此广播？')) return;
  socket.emit('mayor_delete_announcement', { id });
}

socket.on('mayor_announcement_deleted', () => {
  showNotification('广播已删除');
  socket.emit('mayor_get_announcements');
});

// 日报编辑部
function refreshStats() {
  socket.emit('mayor_get_stats', { date: new Date().toISOString().split('T')[0] });
}

socket.on('mayor_stats', (stats) => {
  document.getElementById('today-messages').textContent = stats.todayMessages || 0;
  document.getElementById('today-gifts').textContent = stats.todayGifts || 0;
  document.getElementById('today-moments').textContent = stats.todayMoments || 0;
  document.getElementById('stats-time').textContent = new Date().toLocaleTimeString('zh-CN');
});

// 惊喜制造机
function setSurprise() {
  const icon = document.getElementById('surprise-icon').value.trim() || '🎁';
  const name = document.getElementById('surprise-name').value.trim();
  const description = document.getElementById('surprise-desc').value.trim();
  const price = parseInt(document.getElementById('surprise-price').value) || 99;
  
  if (!name) {
    showNotification('请填写商品名称');
    return;
  }
  
  socket.emit('mayor_set_surprise', { name, icon, description, price });
}

socket.on('mayor_surprise_set', () => {
  showNotification('惊喜已设置！');
  socket.emit('get_daily_surprise');
});

socket.on('daily_surprise', (surprise) => {
  const container = document.getElementById('current-surprise');
  const status = document.getElementById('surprise-status');
  
  if (surprise && surprise.is_active) {
    container.style.display = 'block';
    const endTime = new Date(surprise.end_time);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((endTime - now) / 3600000));
    const minsLeft = Math.max(0, Math.floor(((endTime - now) % 3600000) / 60000));
    
    status.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 2rem;">${surprise.icon}</span>
        <div>
          <div style="font-weight: 600;">${surprise.name}</div>
          <div style="color: #666; font-size: 0.85rem;">${surprise.description || '绝版商品，限时特惠！'}</div>
          <div style="color: #f44336; font-size: 0.9rem;">💰 ${surprise.price} 金币 | ⏰ 剩余 ${hoursLeft}小时${minsLeft}分钟</div>
        </div>
      </div>
    `;
  } else {
    container.style.display = 'none';
  }
});

// 镇长奖励
function sendReward() {
  const toUser = document.getElementById('reward-user').value.trim();
  const rewardIcon = document.getElementById('reward-icon').value.trim() || '🏆';
  const rewardName = document.getElementById('reward-name').value.trim();
  const coins = parseInt(document.getElementById('reward-coins').value) || 0;
  const message = document.getElementById('reward-message').value.trim();
  
  if (!toUser || !rewardName) {
    showNotification('请填写用户昵称和奖励名称');
    return;
  }
  
  socket.emit('mayor_send_reward', {
    toUser, rewardType: 'special', rewardName, rewardIcon, coins, message
  });
}

socket.on('mayor_reward_sent', ({ message }) => {
  showNotification(message);
  document.getElementById('reward-user').value = '';
  document.getElementById('reward-name').value = '';
  document.getElementById('reward-message').value = '';
});

socket.on('mayor_reward_received', (data) => {
  showNotification(`🎉 收到镇长奖励：${data.rewardIcon} ${data.rewardName}！`);
  if (data.message) {
    showNotification(`💌 ${data.message}`);
  }
});

socket.on('mayor_users', (data) => {
  document.getElementById('total-users').textContent = data.total;
  document.getElementById('online-users-count').textContent = data.onlineCount;
  
  const list = document.getElementById('mayor-user-list');
  if (data.users.length === 0) {
    list.innerHTML = '<p class="empty-text">暂无居民~</p>';
    return;
  }
  
  list.innerHTML = data.users.map(u => `
    <div class="mayor-user-item">
      <div class="mayor-user-avatar">${u.avatar}</div>
      <div class="mayor-user-info">
        <div class="mayor-user-name">
          ${u.nickname}
          ${u.isOnline ? '<span class="online-tag">在线</span>' : '<span class="offline-tag">离线</span>'}
        </div>
        <div class="mayor-user-detail">💰 ${u.coins} 金币 · 注册于 ${u.registerDate || '未知'}</div>
      </div>
      <button class="btn btn-small btn-danger" onclick="deleteUser('${u.nickname}')">删除</button>
    </div>
  `).join('');
});

function deleteUser(nickname) {
  if (!confirm(`确定要删除居民「${nickname}」吗？此操作不可恢复！`)) return;
  socket.emit('mayor_delete_user', { nickname });
}

socket.on('mayor_user_deleted', ({ nickname }) => {
  showNotification(`已删除居民「${nickname}」`);
  socket.emit('mayor_get_users');
});

// 日记功能
function openDiaryModal() {
  document.getElementById('diary-modal').classList.add('active');
  loadDiary();
}

function closeDiaryModal() {
  document.getElementById('diary-modal').classList.remove('active');
}

function loadDiary() {
  const list = document.getElementById('diary-list');
  const diaries = currentUser.diary ? JSON.parse(currentUser.diary) : [];
  
  if (diaries.length === 0) {
    list.innerHTML = '<p class="empty-text">还没有写过日记呢~</p>';
    return;
  }
  
  list.innerHTML = diaries.slice().reverse().map(d => `
    <div class="diary-entry">
      <div class="diary-date">${new Date(d.date).toLocaleDateString('zh-CN')}</div>
      <div class="diary-content">${escapeHtml(d.content)}</div>
    </div>
  `).join('');
}

function saveDiary() {
  const textarea = document.getElementById('diary-text');
  const content = textarea.value.trim();
  
  if (!content) {
    showNotification('写点什么吧~');
    return;
  }
  
  let diaries = currentUser.diary ? JSON.parse(currentUser.diary) : [];
  diaries.push({ content, date: new Date().toISOString() });
  
  currentUser.diary = JSON.stringify(diaries);
  socket.emit('update_status', { diary: currentUser.diary });
  
  textarea.value = '';
  loadDiary();
  showNotification('日记已保存~ 📖');
}

// 房间列表
let currentRoom = null;

function enterGame(gameType) {
  currentGameType = gameType;
  showCreateRoomModal();
}

function refreshRoomList() {
  socket.emit('get_room_list');
}

function initRoomListRefresh() {
  setInterval(() => {
    if (document.getElementById('plaza-page')?.classList.contains('active')) {
      socket.emit('get_room_list');
    }
  }, 5000);
}

socket.on('room_list', (rooms) => {
  const list = document.getElementById('room-list');
  if (!list) return;
  
  if (rooms.length === 0) {
    list.innerHTML = '<p class="empty-text">暂无房间，创建一个吧~</p>';
    return;
  }
  
  const gameNames = {
    draw: '你画我猜',
    adventure: '冒险棋',
    tacit: '默契大挑战',
    truth: '真心话大冒险'
  };
  
  list.innerHTML = rooms.map(r => `
    <div class="room-item" onclick="joinRoom('${r.id}')">
      <div class="room-info">
        <h4>${r.name}</h4>
        <p>${gameNames[r.gameType] || r.gameType}</p>
      </div>
      <div class="room-meta">
        <div class="players">${r.playerCount}/${r.maxPlayers}人</div>
        <div class="host">房主: ${r.host}</div>
        ${r.hasRobot ? '<div class="robot-badge">有机器人🤖</div>' : ''}
      </div>
    </div>
  `).join('');
});

function showCreateRoomModal() {
  if (!currentGameType) {
    currentGameType = 'draw';
  }
  const gameNames = {
    draw: '你画我猜',
    adventure: '冒险棋',
    tacit: '默契大挑战',
    truth: '真心话大冒险'
  };
  document.getElementById('create-room-type').textContent = gameNames[currentGameType] || '';
  document.getElementById('create-room-modal').classList.add('active');
}

function closeCreateRoomModal() {
  document.getElementById('create-room-modal').classList.remove('active');
}

function createRoom() {
  const roomName = document.getElementById('room-name-input').value.trim();
  const addRobot = document.getElementById('add-robot-checkbox').checked;
  
  if (!currentGameType) {
    showNotification('请先选择游戏~');
    return;
  }
  socket.emit('create_room', { gameType: currentGameType, roomName, addRobot });
  closeCreateRoomModal();
}

function joinRoom(roomId) {
  socket.emit('join_room', { roomId });
}

socket.on('room_created', (room) => {
  currentRoom = room;
  openGameModal(room);
});

socket.on('room_joined', (room) => {
  currentRoom = room;
  openGameModal(room);
});

socket.on('player_joined', (player) => {
  if (currentRoom) {
    currentRoom.players.push(player);
    if (currentRoom.status === 'waiting') {
      renderWaitingRoom(currentRoom);
    } else {
      updateGamePlayers();
    }
  }
});

socket.on('player_left', (data) => {
  if (currentRoom) {
    currentRoom.players = currentRoom.players.filter(p => p.nickname !== data.nickname);
    if (currentRoom.status === 'waiting') {
      renderWaitingRoom(currentRoom);
    } else {
      updateGamePlayers();
    }
  }
});

function openGameModal(room) {
  const modal = document.getElementById('game-modal');
  const title = document.getElementById('game-modal-title');
  
  const gameNames = {
    draw: '🎨 你画我猜',
    adventure: '🎲 冒险棋',
    tacit: '🤝 默契大挑战',
    truth: '🎭 真心话大冒险'
  };
  
  title.textContent = gameNames[room.gameType] || '游戏';
  modal.classList.add('active');
  
  initGameUI(room);
}

function closeGameModal() {
  if (currentRoom) {
    socket.emit('leave_room', { roomId: currentRoom.id });
    currentRoom = null;
  }
  document.getElementById('game-modal').classList.remove('active');
  closeGameHelp();
}

const gameHelpContents = {
  draw: {
    title: '🎨 你画我猜 - 游戏说明',
    content: `
      <div class="help-section">
        <h4>🎯 游戏目标</h4>
        <p>根据提示词画画，让其他玩家猜中答案，获得分数！</p>
      </div>
      <div class="help-section">
        <h4>📝 游戏规则</h4>
        <ul>
          <li>每轮随机选择一名玩家作为"画家"</li>
          <li>画家根据题目在画布上作画</li>
          <li>其他玩家在聊天框输入答案进行猜测</li>
          <li>猜中答案的玩家和画家都能获得金币奖励</li>
          <li>时间结束后进入下一轮</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>🎨 绘画工具</h4>
        <p>可以选择不同颜色的画笔，画出你心中的答案~</p>
      </div>
    `
  },
  adventure: {
    title: '🎲 冒险棋 - 游戏说明',
    content: `
      <div class="help-section">
        <h4>🎯 游戏目标</h4>
        <p>掷骰子前进，最先到达终点的玩家获胜！</p>
      </div>
      <div class="help-section">
        <h4>🎲 基本玩法</h4>
        <ul>
          <li>轮流掷骰子，根据点数前进对应格数</li>
          <li>到达特殊格子会触发不同事件</li>
          <li>最先到达第30格（终点）的玩家获胜</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>⭐ 特殊格子</h4>
        <ul>
          <li><span style="color: #4caf50;">🚀 前进格</span>：额外前进几格</li>
          <li><span style="color: #f44336;">😱 后退格</span>：后退几格</li>
          <li><span style="color: #ff9800;">🚨 停赛格</span>：暂停一轮</li>
          <li><span style="color: #fdd835;">💰 奖励格</span>：获得金币奖励</li>
          <li><span style="color: #9c27b0;">🔄 交换格</span>：与随机玩家交换位置</li>
          <li><span style="color: #2196f3;">❓ 随机格</span>：触发随机事件</li>
          <li><span style="color: #e91e63;">👩‍🏫 班主任</span>：小心被刘老师抓到！</li>
        </ul>
      </div>
    `
  },
  tacit: {
    title: '🤝 默契大挑战 - 游戏说明',
    content: `
      <div class="help-section">
        <h4>🎯 游戏目标</h4>
        <p>和队友选出相同的答案，考验你们的默契度！</p>
      </div>
      <div class="help-section">
        <h4>📝 游戏规则</h4>
        <ul>
          <li>每轮会给出一个问题和多个选项</li>
          <li>玩家需要在限定时间内选择答案</li>
          <li>选择相同答案的玩家获得默契分</li>
          <li>得分最高的玩家获胜</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>💡 小贴士</h4>
        <p>了解你的朋友，选他们最可能选的答案~</p>
      </div>
    `
  },
  truth: {
    title: '🎭 真心话大冒险 - 游戏说明',
    content: `
      <div class="help-section">
        <h4>🎯 游戏目标</h4>
        <p>勇敢面对挑战，说出真心话或完成大冒险！</p>
      </div>
      <div class="help-section">
        <h4>📝 游戏规则</h4>
        <ul>
          <li>轮流进行，轮到你时选择"真心话"或"大冒险"</li>
          <li><strong>真心话</strong>：诚实回答抽到的问题</li>
          <li><strong>大冒险</strong>：完成抽到的挑战任务</li>
          <li>完成挑战可以获得金币奖励</li>
          <li>不敢接受挑战会扣除金币哦~</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>💡 小贴士</h4>
        <p>勇敢一点，这是了解彼此的好机会！</p>
      </div>
    `
  }
};

function showGameHelp() {
  if (!currentRoom) return;
  const help = gameHelpContents[currentRoom.gameType];
  if (!help) return;

  document.getElementById('help-modal-title').textContent = help.title;
  document.getElementById('help-modal-body').innerHTML = help.content;
  document.getElementById('game-help-modal').classList.add('active');
}

function closeGameHelp() {
  document.getElementById('game-help-modal').classList.remove('active');
}

function updateGamePlayers() {
  if (!currentRoom) return;
  const playersContainer = document.querySelector('.players-list');
  if (playersContainer && currentRoom.status === 'waiting') {
    playersContainer.innerHTML = currentRoom.players.map(p => `
      <div class="player-card ${p.isRobot ? 'robot' : ''}">
        <div class="player-avatar">${p.avatar || '👧'}</div>
        <div class="player-name">${p.nickname}</div>
      </div>
    `).join('');
  }
}

// 成就系统
let achievementsData = null;

function initAchievements() {
  socket.emit('get_achievements');
}

socket.on('achievements_data', (data) => {
  achievementsData = data;
});

function openAchievementModal() {
  socket.emit('get_achievements');
  document.getElementById('achievement-modal').classList.add('active');
  
  const tabs = document.querySelectorAll('.ach-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAchievements(tab.dataset.type);
    });
  });
  
  renderAchievements('social');
}

function closeAchievementModal() {
  document.getElementById('achievement-modal').classList.remove('active');
}

function renderAchievements(type) {
  const list = document.getElementById('achievement-list');
  if (!list || !achievementsData) return;
  
  const typeAchievements = achievementsData.all[type] || [];
  const owned = achievementsData.owned || [];
  
  list.innerHTML = typeAchievements.map(ach => {
    const isUnlocked = owned.includes(ach.id);
    return `
      <div class="achievement-item ${isUnlocked ? 'unlocked' : ''}">
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-info">
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div class="ach-reward">奖励: ${ach.reward} 💰</div>
        </div>
      </div>
    `;
  }).join('');
}

socket.on('new_achievement', (data) => {
  const popup = document.getElementById('achievement-popup');
  const iconsEl = document.getElementById('achievement-popup-icons');
  const rewardEl = document.getElementById('achievement-popup-reward');
  
  iconsEl.textContent = data.achievements.map(a => a.icon).join(' ');
  rewardEl.textContent = data.reward;
  
  popup.style.display = 'block';
  
  setTimeout(() => {
    popup.style.display = 'none';
  }, 3000);
});

// 每日任务
function initDailyTasks() {
  socket.emit('get_daily_tasks');
}

function loadDailyTasks() {
  socket.emit('get_daily_tasks');
}

socket.on('daily_tasks', (tasks) => {
  const list = document.getElementById('daily-tasks-list');
  if (!list) return;
  
  list.innerHTML = tasks.map(task => `
    <div class="task-item">
      <div class="task-icon">${task.icon}</div>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
        <div class="task-reward">${task.reward} 💰</div>
      </div>
      <button class="btn btn-small btn-secondary" onclick="completeTask('${task.id}')">完成</button>
    </div>
  `).join('');
});

function completeTask(taskId) {
  socket.emit('complete_task', { taskId });
}

// ========== 闺蜜圈 ==========
function initMoments() {
  if (currentUser) {
    const avatarEl = document.getElementById('moment-user-avatar');
    if (avatarEl) avatarEl.textContent = currentUser.avatar || '👧';
  }
  socket.emit('get_moments');
}

function loadMoments() {
  socket.emit('get_moments');
}

function renderMoments(moments) {
  const list = document.getElementById('moments-list');
  if (!list) return;
  
  if (moments.length === 0) {
    list.innerHTML = '<p class="empty-text">还没有动态，快来发布第一条吧~</p>';
    return;
  }
  
  list.innerHTML = moments.map(m => {
    const isLiked = currentUser && m.likes.includes(currentUser.nickname);
    const timeStr = formatTime(m.created_at);
    
    return `
      <div class="moment-card" data-id="${m.id}">
        <div class="moment-header">
          <div class="moment-avatar">${m.authorAvatar || '👧'}</div>
          <div class="moment-user-info">
            <div class="moment-author">${escapeHtml(m.author)}</div>
            <div class="moment-time">${timeStr}</div>
          </div>
        </div>
        <div class="moment-content">${escapeHtml(m.content)}</div>
        <div class="moment-actions">
          <button class="moment-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${m.id})">
            ${isLiked ? '❤️' : '🤍'} ${m.likes.length}
          </button>
          <button class="moment-action-btn" onclick="toggleCommentInput(${m.id})">
            💬 ${m.comments.length}
          </button>
        </div>
        ${m.likes.length > 0 ? `
          <div class="moment-likes">
            ❤️ ${m.likes.map(n => escapeHtml(n)).join('、')}
          </div>
        ` : ''}
        <div class="moment-comments">
          ${m.comments.map(c => `
            <div class="moment-comment">
              <span class="comment-avatar">${c.authorAvatar || '👧'}</span>
              <span class="comment-author">${escapeHtml(c.author)}:</span>
              <span class="comment-content">${escapeHtml(c.content)}</span>
            </div>
          `).join('')}
        </div>
        <div class="moment-comment-input" id="comment-input-${m.id}" style="display: none;">
          <input type="text" placeholder="说点什么..." id="comment-text-${m.id}">
          <button class="btn btn-small btn-primary" onclick="submitComment(${m.id})">发送</button>
        </div>
      </div>
    `;
  }).join('');
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  
  return date.toLocaleDateString('zh-CN');
}

function publishMoment() {
  const input = document.getElementById('moment-input');
  const content = input.value.trim();
  
  if (!content) {
    showNotification('写点什么吧~');
    return;
  }
  
  socket.emit('post_moment', { content });
  input.value = '';
}

function toggleLike(momentId) {
  socket.emit('like_moment', { momentId });
}

function toggleCommentInput(momentId) {
  const inputEl = document.getElementById(`comment-input-${momentId}`);
  if (inputEl) {
    inputEl.style.display = inputEl.style.display === 'none' ? 'flex' : 'none';
    if (inputEl.style.display !== 'none') {
      document.getElementById(`comment-text-${momentId}`).focus();
    }
  }
}

function submitComment(momentId) {
  const input = document.getElementById(`comment-text-${momentId}`);
  const content = input.value.trim();
  
  if (!content) {
    showNotification('说点什么吧~');
    return;
  }
  
  socket.emit('comment_moment', { momentId, content });
  input.value = '';
  document.getElementById(`comment-input-${momentId}`).style.display = 'none';
}

socket.on('moments_list', (moments) => {
  renderMoments(moments);
});

socket.on('new_moment', (moment) => {
  loadMoments();
  showNotification(`${moment.author} 发布了新动态~`);
});

socket.on('moment_updated', (data) => {
  loadMoments();
});

socket.on('moment_comment', (data) => {
  loadMoments();
});

socket.on('task_completed', (data) => {
  showNotification(`任务完成！获得 ${data.task.reward} 金币 🎉`);
  if (typeof renderShopItems === 'function') {
    renderShopItems();
  }
});

// ========== 宠物系统 ==========
const petTypes = [
  { id: 'cat', name: '小猫咪', icon: '🐱', desc: '温柔可爱的小猫咪', price: 0 },
  { id: 'dog', name: '小狗狗', icon: '🐶', desc: '忠诚活泼的小狗狗', price: 0 },
  { id: 'rabbit', name: '小兔兔', icon: '🐰', desc: '蹦蹦跳跳的小兔子', price: 100 },
  { id: 'hamster', name: '小仓鼠', icon: '🐹', desc: '圆滚滚的小仓鼠', price: 150 },
  { id: 'panda', name: '小熊猫', icon: '🐼', desc: '国宝级别的小熊猫', price: 300 },
  { id: 'fox', name: '小狐狸', icon: '🦊', desc: '聪明机灵的小狐狸', price: 200 }
];

function initPet() {
  renderPetAdoptList();
}

function renderPetAdoptList() {
  const list = document.getElementById('pet-adopt-list');
  if (!list) return;
  
  list.innerHTML = petTypes.map(pet => `
    <div class="pet-adopt-card" onclick="adoptPet('${pet.id}')">
      <div class="pet-adopt-icon">${pet.icon}</div>
      <div class="pet-adopt-name">${pet.name}</div>
      <div class="pet-adopt-desc">${pet.desc}</div>
      <div class="pet-adopt-price">${pet.price === 0 ? '免费领养' : pet.price + ' 💰'}</div>
    </div>
  `).join('');
}

function loadPet() {
  if (!currentUser) return;
  
  const noPetEl = document.getElementById('pet-no-pet');
  const hasPetEl = document.getElementById('pet-has-pet');
  
  if (!currentUser.pet || currentUser.pet === 'null' || currentUser.pet === null) {
    renderPetAdoptList();
    noPetEl.style.display = 'block';
    hasPetEl.style.display = 'none';
    return;
  }
  
  noPetEl.style.display = 'none';
  hasPetEl.style.display = 'flex';
  
  let pet = typeof currentUser.pet === 'string' ? JSON.parse(currentUser.pet) : currentUser.pet;
  const petType = petTypes.find(p => p.id === pet.type);
  
  if (petType) {
    document.getElementById('pet-avatar').textContent = petType.icon;
    document.getElementById('pet-name').textContent = petType.name;
  }
  
  const level = pet.level || 1;
  const exp = pet.exp || 0;
  const expNeeded = level * 100;
  
  document.getElementById('pet-level').textContent = `Lv.${level}`;
  document.getElementById('pet-exp-fill').style.width = `${Math.min(100, (exp / expNeeded) * 100)}%`;
  document.getElementById('pet-exp-text').textContent = `${exp}/${expNeeded}`;
  
  updatePetStatsDisplay(pet);
  updatePetSuppliesDisplay();
  updatePetSkillsDisplay(level);
}

function updatePetStatsDisplay(pet) {
  const hunger = pet.hunger !== undefined ? pet.hunger : 80;
  const mood = pet.mood !== undefined ? pet.mood : 90;
  const health = pet.health !== undefined ? pet.health : 95;
  
  document.getElementById('pet-hunger-fill').style.width = `${hunger}%`;
  document.getElementById('pet-hunger-value').textContent = Math.round(hunger);
  document.getElementById('pet-mood-fill').style.width = `${mood}%`;
  document.getElementById('pet-mood-value').textContent = Math.round(mood);
  document.getElementById('pet-health-fill').style.width = `${health}%`;
  document.getElementById('pet-health-value').textContent = Math.round(health);
}

function updatePetSuppliesDisplay() {
  const food = parseInt(currentUser?.pet_food || '0');
  const toys = parseInt(currentUser?.pet_toys || '0');
  document.getElementById('pet-food-count').textContent = `x${food}`;
  document.getElementById('pet-toy-count').textContent = `x${toys}`;
}

function updatePetSkillsDisplay(level) {
  const skills = [
    { name: '找金币', unlockLevel: 5 },
    { name: '卖萌', unlockLevel: 10 },
    { name: '守护', unlockLevel: 20 }
  ];
  
  const skillsContainer = document.getElementById('pet-skills');
  if (!skillsContainer) return;
  
  skillsContainer.innerHTML = skills.map(skill => {
    const unlocked = level >= skill.unlockLevel;
    return `
      <div class="pet-skill-item ${unlocked ? '' : 'locked'}">
        <div class="pet-skill-icon">${unlocked ? '⭐' : '🔒'}</div>
        <div class="pet-skill-name">${skill.name}</div>
        <div class="pet-skill-desc">${unlocked ? '已解锁' : `Lv.${skill.unlockLevel}解锁`}</div>
      </div>
    `;
  }).join('');
}

function adoptPet(petId) {
  if (!currentUser) return;
  
  const petType = petTypes.find(p => p.id === petId);
  if (!petType) return;
  
  if (petType.price > 0 && currentUser.coins < petType.price) {
    showNotification('金币不够啦~');
    return;
  }
  
  socket.emit('adopt_pet', { petId });
}

function petFeed() {
  if (!currentUser) return;
  const food = parseInt(currentUser.pet_food || '0');
  if (food <= 0) {
    showNotification('没有食物啦，去商店买点吧~');
    return;
  }
  socket.emit('pet_action', { action: 'feed' });
}

function petPlay() {
  if (!currentUser) return;
  const toys = parseInt(currentUser.pet_toys || '0');
  if (toys <= 0) {
    showNotification('没有玩具啦，去商店买点吧~');
    return;
  }
  socket.emit('pet_action', { action: 'play' });
}

function petPet() {
  if (!currentUser) return;
  socket.emit('pet_action', { action: 'pet' });
}

function petSleep() {
  if (!currentUser) return;
  socket.emit('pet_action', { action: 'sleep' });
}

socket.on('pet_adopted', (data) => {
  currentUser = { ...currentUser, ...data };
  showNotification('🎉 成功领养宠物！');
  loadPet();
});

socket.on('pet_updated', (data) => {
  currentUser = { ...currentUser, ...data };
  loadPet();
});

// CSS 动画
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-20px); }
  }
`;
document.head.appendChild(style);