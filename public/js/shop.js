let shopData = null;
let currentShopType = 'furniture';

function initShop() {
  socket.emit('get_shop_data');
  
  const shopTabs = document.querySelectorAll('.shop-tab');
  shopTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      shopTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentShopType = tab.dataset.type;
      renderShopItems();
    });
  });
  
  const shopModalTabs = document.querySelectorAll('.shop-modal-tab');
  shopModalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      shopModalTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentShopType = tab.dataset.type;
      renderShopModalItems();
    });
  });
}

socket.on('shop_data', (data) => {
  shopData = data;
  renderShopItems();
  
  const giftModal = document.getElementById('gift-modal');
  const giftTargetName = document.getElementById('gift-target-name');
  const giftList = document.getElementById('gift-list');
  
  if (giftModal && giftModal.classList.contains('active') && giftTargetName && giftTargetName.textContent) {
    if (typeof renderGiftList === 'function') {
      renderGiftList(giftTargetName.textContent);
    }
  }
});

function renderShopItems() {
  const container = document.getElementById('shop-items');
  if (!container || !shopData) return;
  
  document.getElementById('shop-coins').textContent = currentUser?.coins || 0;
  
  let items;
  if (currentShopType === 'furniture') {
    items = shopData.furniture;
  } else if (currentShopType === 'gifts') {
    items = shopData.gifts;
  } else {
    items = shopData.petSupplies || [];
  }
  
  container.innerHTML = items.map(item => {
    const canBuy = currentUser && currentUser.coins >= item.price;
    
    if (currentShopType === 'furniture') {
      const owned = currentUser?.furniture ? JSON.parse(currentUser.furniture) : [];
      const isOwned = owned.some(f => f.id === item.id);
      
      return `
        <div class="shop-item ${isOwned ? 'owned' : ''}">
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${item.price} 💰</div>
          </div>
          ${isOwned ? 
            '<span class="owned-badge">已拥有</span>' : 
            `<button class="btn btn-small ${canBuy ? 'btn-primary' : 'btn-disabled'}" 
              onclick="buyFurniture('${item.id}')"
              ${!canBuy ? 'disabled' : ''}>
              ${canBuy ? '购买' : '金币不足'}
            </button>`
          }
        </div>
      `;
    } else if (currentShopType === 'gifts') {
      return `
        <div class="shop-item gift-item">
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${item.price} 💰</div>
            <div class="shop-item-intimacy">+${item.intimacy} 亲密度</div>
          </div>
          <button class="btn btn-small btn-secondary" onclick="showGiftFriends('${item.id}')">送闺蜜</button>
        </div>
      `;
    } else {
      return `
        <div class="shop-item pet-supply-item">
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${item.price} 💰</div>
            <div class="shop-item-intimacy">${item.type === 'food' ? `食物 x${item.amount}` : `玩具 x${item.amount}`}</div>
          </div>
          <button class="btn btn-small ${canBuy ? 'btn-primary' : 'btn-disabled'}" 
            onclick="buyPetSupply('${item.id}')"
            ${!canBuy ? 'disabled' : ''}>
            ${canBuy ? '购买' : '金币不足'}
          </button>
        </div>
      `;
    }
  }).join('');
}

function renderShopModalItems() {
  const container = document.getElementById('shop-modal-items');
  if (!container || !shopData) return;
  
  let items;
  if (currentShopType === 'furniture') {
    items = shopData.furniture;
  } else if (currentShopType === 'gifts') {
    items = shopData.gifts;
  } else {
    items = shopData.petSupplies || [];
  }
  
  container.innerHTML = items.map(item => {
    const canBuy = currentUser && currentUser.coins >= item.price;
    
    if (currentShopType === 'furniture') {
      const owned = currentUser?.furniture ? JSON.parse(currentUser.furniture) : [];
      const isOwned = owned.some(f => f.id === item.id);
      
      return `
        <div class="shop-item ${isOwned ? 'owned' : ''}">
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${item.price} 💰</div>
          </div>
          ${isOwned ? 
            '<span class="owned-badge">已拥有</span>' : 
            `<button class="btn btn-small ${canBuy ? 'btn-primary' : 'btn-disabled'}" 
              onclick="buyFurniture('${item.id}')"
              ${!canBuy ? 'disabled' : ''}>
              ${canBuy ? '购买' : '金币不足'}
            </button>`
          }
        </div>
      `;
    } else if (currentShopType === 'gifts') {
      return `
        <div class="shop-item gift-item">
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${item.price} 💰</div>
            <div class="shop-item-intimacy">+${item.intimacy} 亲密度</div>
          </div>
          <button class="btn btn-small btn-secondary" onclick="showGiftFriends('${item.id}')">送闺蜜</button>
        </div>
      `;
    } else {
      return `
        <div class="shop-item pet-supply-item">
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${item.price} 💰</div>
            <div class="shop-item-intimacy">${item.type === 'food' ? `食物 x${item.amount}` : `玩具 x${item.amount}`}</div>
          </div>
          <button class="btn btn-small ${canBuy ? 'btn-primary' : 'btn-disabled'}" 
            onclick="buyPetSupply('${item.id}')"
            ${!canBuy ? 'disabled' : ''}>
            ${canBuy ? '购买' : '金币不足'}
          </button>
        </div>
      `;
    }
  }).join('');
}

function openShopModal() {
  document.getElementById('shop-modal').classList.add('active');
  if (!shopData) {
    socket.emit('get_shop_data');
  } else {
    renderShopModalItems();
  }
}

function closeShopModal() {
  document.getElementById('shop-modal').classList.remove('active');
}

function buyFurniture(furnitureId) {
  socket.emit('buy_furniture', { furnitureId });
}

function buyPetSupply(supplyId) {
  socket.emit('buy_pet_supply', { supplyId });
}

socket.on('purchase_success', (data) => {
  showNotification(`成功购买 ${data.item.name}！${data.item.icon}`);
  renderShopItems();
  renderShopModalItems();
  loadOwnedFurniture();
});

socket.on('gift_sent', (data) => {
  showNotification(`成功送出 ${data.gift.name} 给 ${data.to}！💕`);
  closeGiftModal();
  renderShopItems();
  renderShopModalItems();
});

socket.on('gift_received', (data) => {
  showNotification(`${data.from} 送给你 ${data.gift.name}！💕 亲密度 +${data.gift.intimacy}`);
});

function showGiftFriends(giftId) {
  socket.emit('get_online_users');
  
  const otherUsers = Array.from(onlineUsers?.values() || []).filter(u => u.nickname !== currentUser?.nickname);
  
  if (otherUsers.length === 0) {
    showNotification('暂无在线闺蜜可以送礼~');
    return;
  }
  
  const modal = document.getElementById('gift-modal');
  const list = document.getElementById('gift-list');
  const gift = shopData.gifts.find(g => g.id === giftId);
  
  if (!gift) return;
  
  list.innerHTML = otherUsers.map(u => `
    <div class="gift-friend-item">
      <div class="gift-friend-avatar">${u.avatar}</div>
      <div class="gift-friend-name">${u.nickname}</div>
      <button class="btn btn-small btn-primary" onclick="sendGift('${u.nickname}', '${giftId}')">送出 ${gift.icon}</button>
    </div>
  `).join('');
  
  modal.classList.add('active');
}

function sendGift(targetNickname, giftId) {
  socket.emit('send_gift', { targetNickname, giftId });
}

function closeGiftModal() {
  document.getElementById('gift-modal').classList.remove('active');
}

let currentGiftTarget = '';
let currentRecordFilter = 'all';

function switchGiftTab(tab) {
  document.querySelectorAll('.gift-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.gift-panel').forEach(p => p.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById('gift-' + tab + '-panel').classList.add('active');
  
  if (tab === 'records') {
    loadGiftRecords('all');
  }
}

function filterGiftRecords(type) {
  currentRecordFilter = type;
  document.querySelectorAll('.record-filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  loadGiftRecords(type);
}

function loadGiftRecords(type) {
  const list = document.getElementById('gift-records-list');
  if (!list) return;
  
  list.innerHTML = '<p class="empty-text">加载中...</p>';
  socket.emit('get_gift_records', { targetNickname: currentGiftTarget, type });
}

socket.on('gift_records', (records) => {
  const list = document.getElementById('gift-records-list');
  if (!list) return;
  
  if (records.length === 0) {
    list.innerHTML = '<p class="empty-text">暂无礼物记录~</p>';
    return;
  }
  
  list.innerHTML = records.map(r => {
    const isSent = r.from_user === currentUser?.nickname;
    const time = new Date(r.created_at).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="gift-record-item ${isSent ? 'sent' : 'received'}">
        <div class="record-icon">${r.gift_icon}</div>
        <div class="record-info">
          <div class="record-title">
            ${isSent ? '送给 ' + r.to_user : r.from_user + ' 送你'}
          </div>
          <div class="record-detail">
            ${r.gift_name} · 💕 +${r.intimacy_gained}
          </div>
          <div class="record-time">${time}</div>
        </div>
        <div class="record-price">💰 ${r.gift_price}</div>
      </div>
    `;
  }).join('');
});

const intimacyLevels = [
  { name: '灵魂闺蜜', icon: '💖', color: '#ff1493', min: 500, max: '∞', privileges: ['专属称号', '神秘礼物解锁', '专属装扮', '每日额外金币', '最高亲密度标识'] },
  { name: '闺蜜达人', icon: '💕', color: '#ff69b4', min: 300, max: 499, privileges: ['高级称号', '精选礼物解锁', '特殊标识', '每日金币加成'] },
  { name: '亲密闺蜜', icon: '💗', color: '#ff69b4', min: 200, max: 299, privileges: ['中级称号', '更多礼物选择', '亲密度标识'] },
  { name: '知心好友', icon: '❤️', color: '#ff6b9d', min: 100, max: 199, privileges: ['初级称号', '基础礼物解锁', '好友标识'] },
  { name: '熟悉朋友', icon: '💛', color: '#ffb74d', min: 50, max: 99, privileges: ['普通朋友标识', '可以串门', '可以戳一下'] },
  { name: '新认识', icon: '👋', color: '#e91e63', min: 0, max: 49, privileges: ['开始认识', '可以聊天', '可以送礼物'] }
];

function showIntimacyDetail() {
  const list = document.getElementById('intimacy-levels-list');
  if (list) {
    list.innerHTML = intimacyLevels.map(level => `
      <div class="intimacy-level-item" style="border-left: 4px solid ${level.color};">
        <div class="level-header">
          <span class="level-icon">${level.icon}</span>
          <div class="level-info">
            <div class="level-name">${level.name}</div>
            <div class="level-range">亲密度: ${level.min} - ${level.max}</div>
          </div>
        </div>
        <div class="level-privileges">
          ${level.privileges.map(p => `<span class="privilege-tag">${p}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }
  document.getElementById('intimacy-detail-modal').classList.add('active');
}

function closeIntimacyDetailModal() {
  document.getElementById('intimacy-detail-modal').classList.remove('active');
}

socket.on('intimacy_data', (data) => {
  const currentIntimacy = document.getElementById('current-intimacy');
  const intimacyLevel = document.getElementById('intimacy-level');
  const intimacyIconLevel = document.getElementById('intimacy-icon-level');
  const intimacyLevelName = document.getElementById('intimacy-level-name');
  const progressBar = document.getElementById('intimacy-progress-bar');
  const nextLevelIntimacy = document.getElementById('next-level-intimacy');
  
  if (currentIntimacy) {
    currentIntimacy.textContent = data.intimacy;
  }
  if (intimacyLevel) {
    intimacyLevel.textContent = data.level.name + ' ' + data.level.icon;
  }
  if (intimacyIconLevel) {
    intimacyIconLevel.textContent = data.level.icon;
  }
  if (intimacyLevelName) {
    intimacyLevelName.textContent = data.level.name;
    intimacyLevelName.style.color = data.level.color;
  }
  
  const nextLevel = intimacyLevels.find(l => data.intimacy < l.max);
  if (progressBar && nextLevel) {
    const currentMin = data.level.min;
    const currentMax = nextLevel.min;
    const progress = ((data.intimacy - currentMin) / (currentMax - currentMin)) * 100;
    progressBar.style.width = Math.min(progress, 100) + '%';
    progressBar.style.background = data.level.color;
  }
  if (nextLevelIntimacy && nextLevel) {
    nextLevelIntimacy.textContent = nextLevel.min;
  }
  
  const intimacyStatus = document.getElementById('intimacy-' + data.target);
  if (intimacyStatus) {
    intimacyStatus.innerHTML = `
      <span style="color: ${data.level.color};">
        ${data.level.icon} ${data.level.name} · 💕 ${data.intimacy}
      </span>
    `;
    intimacyStatus.className = 'intimacy-status';
  }
});

// ========== 家具布置 ==========

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

let selectedFurniture = null;

function selectFurniture(furnitureId) {
  const owned = currentUser?.furniture ? JSON.parse(currentUser.furniture) : [];
  const item = owned.find(f => f.id === furnitureId);
  
  if (item) {
    selectedFurniture = item;
    highlightRoomCells();
    
    if (item.position >= 0) {
      showNotification('点击房间中其他格子移动家具，或点击当前位置移除');
    } else {
      showNotification('点击房间中的格子放置家具');
    }
  }
}

function highlightRoomCells() {
  const cells = document.querySelectorAll('.room-cell');
  cells.forEach(cell => {
    cell.classList.add('highlight');
    cell.onclick = () => placeFurnitureAt(parseInt(cell.dataset.pos));
  });
}

function clearHighlight() {
  const cells = document.querySelectorAll('.room-cell');
  cells.forEach(cell => {
    cell.classList.remove('highlight');
    cell.onclick = null;
  });
  selectedFurniture = null;
}

function placeFurnitureAt(position) {
  if (!selectedFurniture) return;
  
  if (selectedFurniture.position === position) {
    // 移除家具
    socket.emit('remove_furniture', { furnitureId: selectedFurniture.id });
    showNotification('家具已收回');
  } else {
    // 放置家具
    socket.emit('place_furniture', { furnitureId: selectedFurniture.id, position });
    showNotification(`${selectedFurniture.name} 已放置！`);
  }
  
  clearHighlight();
}

socket.on('user_data', (user) => {
  currentUser = user;
  loadRoom();
  loadOwnedFurniture();
  document.getElementById('shop-coins').textContent = user.coins;
});