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

socket.on('intimacy_data', (data) => {
  document.getElementById('current-intimacy').textContent = data.intimacy;
  document.getElementById('intimacy-level').textContent = data.level.name + ' ' + data.level.icon;
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