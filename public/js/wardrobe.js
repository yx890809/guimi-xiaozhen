let currentWardrobeCategory = 'hair';

const wardrobeData = {
  hair: [
    { id: 'ponytail', name: '马尾辫', icon: '👧' },
    { id: 'bob', name: '齐肩发', icon: '👩' },
    { id: 'long', name: '长直发', icon: '🧝‍♀️' },
    { id: 'twin', name: '双马尾', icon: '👱‍♀️' },
    { id: 'short', name: '短发', icon: '🧒' },
    { id: 'curly', name: '卷发', icon: '👩‍🦱' },
    { id: 'braid', name: '辫子', icon: '🧒‍♀️' },
    { id: 'bangs', name: '刘海', icon: '👩‍🎤' }
  ],
  hairColor: [
    { id: 'black', name: '黑色', icon: '⚫', color: '#333' },
    { id: 'brown', name: '棕色', icon: '🟤', color: '#6d4c41' },
    { id: 'blonde', name: '金色', icon: '🟡', color: '#ffd54f' },
    { id: 'red', name: '红色', icon: '🔴', color: '#e57373' },
    { id: 'blue', name: '蓝色', icon: '🔵', color: '#64b5f6' },
    { id: 'pink', name: '粉色', icon: '💗', color: '#f48fb1' },
    { id: 'purple', name: '紫色', icon: '💜', color: '#ba68c8' },
    { id: 'green', name: '绿色', icon: '💚', color: '#81c784' },
    { id: 'white', name: '银色', icon: '⚪', color: '#e0e0e0' }
  ],
  top: [
    { id: 'tshirt', name: 'T恤', icon: '👕' },
    { id: 'hoodie', name: '卫衣', icon: '🧥' },
    { id: 'jk', name: 'JK制服', icon: '🎀' },
    { id: 'sweater', name: '毛衣', icon: '🧶' },
    { id: 'blouse', name: '衬衫', icon: '👔' },
    { id: 'cardigan', name: '开衫', icon: '🧥' },
    { id: 'tank', name: '背心', icon: '👕' },
    { id: 'blazer', name: '西装外套', icon: '🧥' },
    { id: 'kimono', name: '和服上衣', icon: '🧥' }
  ],
  bottom: [
    { id: 'skirt', name: '裙子', icon: '👗' },
    { id: 'pants', name: '长裤', icon: '👖' },
    { id: 'shorts', name: '短裤', icon: '🩳' },
    { id: 'dress', name: '连衣裙', icon: '👘' },
    { id: 'pleated', name: '百褶裙', icon: '👗' },
    { id: 'miniskirt', name: '迷你裙', icon: '👗' },
    { id: 'leggings', name: '打底裤', icon: '👖' },
    { id: 'jeans', name: '牛仔裤', icon: '👖' }
  ],
  color: [
    { id: 'pink', name: '粉色', icon: '💗' },
    { id: 'blue', name: '蓝色', icon: '💙' },
    { id: 'black', name: '黑色', icon: '🖤' },
    { id: 'gold', name: '金色', icon: '💛' },
    { id: 'green', name: '绿色', icon: '💚' },
    { id: 'purple', name: '紫色', icon: '💜' },
    { id: 'red', name: '红色', icon: '❤️' },
    { id: 'orange', name: '橙色', icon: '🧡' },
    { id: 'white', name: '白色', icon: '🤍' },
    { id: 'cyan', name: '青色', icon: '🩵' }
  ],
  accessory: [
    { id: 'none', name: '无配饰', icon: '❌' },
    { id: 'glasses', name: '眼镜', icon: '👓' },
    { id: 'sunglasses', name: '墨镜', icon: '🕶️' },
    { id: 'hat', name: '帽子', icon: '🧢' },
    { id: 'crown', name: '皇冠', icon: '👑' },
    { id: 'ribbon', name: '发带', icon: '🎀' },
    { id: 'earrings', name: '耳环', icon: '💎' },
    { id: 'necklace', name: '项链', icon: '📿' },
    { id: 'hairpin', name: '发夹', icon: '🌸' },
    { id: 'bow', name: '蝴蝶结', icon: '🎀' }
  ]
};

function initWardrobeTabs() {
  const tabs = document.querySelectorAll('.wardrobe-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentWardrobeCategory = tab.dataset.category;
      renderWardrobeItems();
    });
  });
  
  renderWardrobeItems();
}

function renderWardrobeItems() {
  const container = document.getElementById('wardrobe-items');
  if (!container) return;

  const items = wardrobeData[currentWardrobeCategory] || [];

  container.innerHTML = items.map(item => {
    let isActive = false;

    switch(currentWardrobeCategory) {
      case 'hair':
        isActive = currentUser?.hair_style === item.id;
        break;
      case 'hairColor':
        isActive = currentUser?.hair_color === item.id;
        break;
      case 'top':
        isActive = currentUser?.top === item.id;
        break;
      case 'bottom':
        isActive = currentUser?.bottom === item.id;
        break;
      case 'color':
        isActive = currentUser?.outfit_color === item.id;
        break;
      case 'accessory':
        isActive = currentUser?.accessory === item.id;
        break;
    }

    return `
      <div class="wardrobe-item ${isActive ? 'active' : ''}" onclick="selectWardrobeItem('${item.id}')">
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}</div>
      </div>
    `;
  }).join('');
}

function selectWardrobeItem(itemId) {
  if (!currentUser) return;

  let updates = {};

  switch(currentWardrobeCategory) {
    case 'hair':
      currentUser.hair_style = itemId;
      updates.hair_style = itemId;
      break;
    case 'hairColor':
      currentUser.hair_color = itemId;
      updates.hair_color = itemId;
      break;
    case 'top':
      currentUser.top = itemId;
      updates.top = itemId;
      break;
    case 'bottom':
      currentUser.bottom = itemId;
      updates.bottom = itemId;
      break;
    case 'color':
      currentUser.outfit_color = itemId;
      updates.outfit_color = itemId;
      break;
    case 'accessory':
      currentUser.accessory = itemId;
      updates.accessory = itemId;
      break;
  }

  renderWardrobeItems();
  updateCharacter();
  socket.emit('update_status', updates);
}
