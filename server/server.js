require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDB, db } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const onlineUsers = new Map();
const gameRooms = new Map();

// ========== 商店数据 ==========

const furnitureShop = [
  { id: 'bed1', name: '公主床', icon: '🛏️', price: 50, category: 'bed' },
  { id: 'bed2', name: '软软沙发床', icon: '🛋️', price: 80, category: 'bed' },
  { id: 'desk1', name: '学习桌', icon: '🖥️', price: 30, category: 'desk' },
  { id: 'desk2', name: '粉色书桌', icon: '📚', price: 45, category: 'desk' },
  { id: 'chair1', name: '可爱椅子', icon: '🪑', price: 20, category: 'chair' },
  { id: 'chair2', name: '懒人沙发', icon: '💺', price: 60, category: 'chair' },
  { id: 'plant1', name: '小盆栽', icon: '🌱', price: 15, category: 'plant' },
  { id: 'plant2', name: '粉色花盆', icon: '🌸', price: 25, category: 'plant' },
  { id: 'plant3', name: '仙人掌', icon: '🌵', price: 18, category: 'plant' },
  { id: 'lamp1', name: '台灯', icon: '💡', price: 20, category: 'lamp' },
  { id: 'lamp2', name: '星空灯', icon: '🌟', price: 55, category: 'lamp' },
  { id: 'lamp3', name: '暖光灯', icon: '🌙', price: 35, category: 'lamp' },
  { id: 'rug1', name: '粉色地毯', icon: '🟣', price: 40, category: 'rug' },
  { id: 'rug2', name: '星星地毯', icon: '✨', price: 65, category: 'rug' },
  { id: 'poster1', name: '爱豆海报', icon: '🖼️', price: 30, category: 'poster' },
  { id: 'poster2', name: '动漫海报', icon: '🎭', price: 35, category: 'poster' },
  { id: 'shelf1', name: '书架', icon: '📖', price: 50, category: 'shelf' },
  { id: 'shelf2', name: '娃娃架', icon: '🧸', price: 70, category: 'shelf' },
  { id: 'mirror1', name: '全身镜', icon: '🪞', price: 40, category: 'mirror' },
  { id: 'mirror2', name: '魔镜', icon: '✨', price: 100, category: 'mirror' },
  { id: 'tv1', name: '小电视', icon: '📺', price: 80, category: 'tv' },
  { id: 'music1', name: '音乐盒', icon: '🎵', price: 45, category: 'music' },
  { id: 'music2', name: '吉他', icon: '🎸', price: 120, category: 'music' },
  { id: 'pet1', name: '小猫咪', icon: '🐱', price: 150, category: 'pet' },
  { id: 'pet2', name: '小狗', icon: '🐶', price: 150, category: 'pet' },
  { id: 'pet3', name: '兔子', icon: '🐰', price: 130, category: 'pet' }
];

const giftShop = [
  { id: 'flower1', name: '粉色玫瑰', icon: '🌹', price: 20, intimacy: 5 },
  { id: 'flower2', name: '百合花', icon: '🌷', price: 25, intimacy: 6 },
  { id: 'flower3', name: '向日葵', icon: '🌻', price: 15, intimacy: 4 },
  { id: 'flower4', name: '樱花', icon: '🌸', price: 30, intimacy: 8 },
  { id: 'cake1', name: '草莓蛋糕', icon: '🍰', price: 35, intimacy: 10 },
  { id: 'cake2', name: '甜甜圈', icon: '🍩', price: 20, intimacy: 6 },
  { id: 'icecream', name: '冰淇淋', icon: '🍦', price: 18, intimacy: 5 },
  { id: 'chocolate', name: '巧克力', icon: '🍫', price: 25, intimacy: 7 },
  { id: 'candy1', name: '糖果', icon: '🍬', price: 15, intimacy: 4 },
  { id: 'candy2', name: '棒棒糖', icon: '🍭', price: 12, intimacy: 3 },
  { id: 'drink1', name: '奶茶', icon: '🥤', price: 15, intimacy: 5 },
  { id: 'drink2', name: '果汁', icon: '🧃', price: 10, intimacy: 3 },
  { id: 'gift1', name: '小礼物盒', icon: '🎁', price: 40, intimacy: 12 },
  { id: 'gift2', name: '神秘礼盒', icon: '🎀', price: 80, intimacy: 25 },
  { id: 'gift3', name: '闺蜜礼包', icon: '💝', price: 150, intimacy: 50 },
  { id: 'heart1', name: '爱心卡片', icon: '💕', price: 20, intimacy: 8 },
  { id: 'heart2', name: '闺蜜项链', icon: '📿', price: 100, intimacy: 35 },
  { id: 'star1', name: '星星挂件', icon: '⭐', price: 30, intimacy: 10 },
  { id: 'bear1', name: '小熊玩偶', icon: '🧸', price: 50, intimacy: 15 },
  { id: 'ribbon', name: '蝴蝶结', icon: '🎗️', price: 15, intimacy: 5 }
];

const petSupplyShop = [
  { id: 'pet_food_basic', name: '宠物口粮', icon: '🍖', price: 5, type: 'food', amount: 1 },
  { id: 'pet_food_premium', name: '高级猫粮', icon: '🥫', price: 15, type: 'food', amount: 5 },
  { id: 'pet_food_bundle', name: '食物大礼包', icon: '🎁', price: 45, type: 'food', amount: 20 },
  { id: 'pet_toy_ball', name: '小皮球', icon: '⚽', price: 8, type: 'toy', amount: 1 },
  { id: 'pet_toy_yarn', name: '毛线球', icon: '🧶', price: 12, type: 'toy', amount: 2 },
  { id: 'pet_toy_bundle', name: '玩具套装', icon: '🧸', price: 35, type: 'toy', amount: 10 }
];

// ========== 成就系统 ==========

const achievements = {
  social: [
    { id: 'first_friend', name: '第一个朋友', icon: '👋', desc: '添加第一个闺蜜', reward: 50 },
    { id: 'friends_5', name: '社交达人', icon: '👥', desc: '拥有5个闺蜜', reward: 100 },
    { id: 'friends_10', name: '闺蜜团团长', icon: '👑', desc: '拥有10个闺蜜', reward: 200 },
    { id: 'intimacy_50', name: '亲密闺蜜', icon: '💕', desc: '和闺蜜亲密度达到50', reward: 80 },
    { id: 'intimacy_100', name: '灵魂闺蜜', icon: '💖', desc: '和闺蜜亲密度达到100', reward: 150 },
    { id: 'visit_10', name: '串门达人', icon: '🏠', desc: '串门10次', reward: 60 },
    { id: 'gift_10', name: '送礼小能手', icon: '🎁', desc: '送出10份礼物', reward: 70 }
  ],
  game: [
    { id: 'draw_first', name: '灵魂画手', icon: '🎨', desc: '完成第一次你画我猜', reward: 30 },
    { id: 'draw_win', name: '画神', icon: '🏆', desc: '你画我猜获得第一名', reward: 100 },
    { id: 'adventure_first', name: '冒险者', icon: '🎲', desc: '完成第一次冒险棋', reward: 30 },
    { id: 'adventure_win', name: '棋王', icon: '👑', desc: '冒险棋获胜', reward: 100 },
    { id: 'tacit_perfect', name: '默契满分', icon: '🤝', desc: '默契挑战全部一致', reward: 150 },
    { id: 'game_10', name: '游戏达人', icon: '🎮', desc: '完成10次游戏', reward: 80 },
    { id: 'game_50', name: '游戏大师', icon: '🌟', desc: '完成50次游戏', reward: 200 }
  ],
  daily: [
    { id: 'login_7', name: '一周常客', icon: '📅', desc: '连续登录7天', reward: 100 },
    { id: 'login_30', name: '月度之星', icon: '🌟', desc: '连续登录30天', reward: 300 },
    { id: 'diary_5', name: '日记达人', icon: '📖', desc: '写5篇日记', reward: 50 },
    { id: 'diary_20', name: '日记女王', icon: '✍️', desc: '写20篇日记', reward: 150 },
    { id: 'shop_first', name: '购物新手', icon: '🛒', desc: '第一次购物', reward: 20 },
    { id: 'shop_10', name: '购物达人', icon: '💰', desc: '购物10次', reward: 80 }
  ],
  pet: [
    { id: 'adopt_first', name: '新手铲屎官', icon: '🐾', desc: '领养第一只宠物', reward: 50 },
    { id: 'pet_level_5', name: '初级养成', icon: '⭐', desc: '宠物达到5级', reward: 100 },
    { id: 'pet_level_10', name: '中级养成', icon: '🌟', desc: '宠物达到10级', reward: 200 },
    { id: 'pet_level_20', name: '高级养成', icon: '💫', desc: '宠物达到20级', reward: 500 },
    { id: 'pet_feed_10', name: '喂食小能手', icon: '🍖', desc: '喂食宠物10次', reward: 50 },
    { id: 'pet_play_10', name: '陪玩达人', icon: '🎾', desc: '和宠物玩耍10次', reward: 50 }
  ],
  moment: [
    { id: 'moment_first', name: '初次分享', icon: '📝', desc: '发布第一条闺蜜圈', reward: 20 },
    { id: 'moment_5', name: '分享达人', icon: '✨', desc: '发布5条闺蜜圈', reward: 50 },
    { id: 'moment_20', name: '闺蜜圈达人', icon: '🌟', desc: '发布20条闺蜜圈', reward: 150 },
    { id: 'moment_like_10', name: '人气王', icon: '❤️', desc: '累计获得10个赞', reward: 80 }
  ]
};

// ========== 任务系统 ==========

const dailyTasks = [
  { id: 'login', name: '登录打卡', icon: '✅', reward: 10, desc: '每天登录获得奖励' },
  { id: 'chat', name: '聊天达人', icon: '💬', reward: 15, desc: '发送5条消息', target: 5 },
  { id: 'play_game', name: '游戏一把', icon: '🎮', reward: 20, desc: '完成任意游戏', target: 1 },
  { id: 'visit', name: '去串门', icon: '🏠', reward: 15, desc: '访问闺蜜小屋', target: 1 },
  { id: 'mood_90', name: '心情好棒', icon: '❤️', reward: 25, desc: '心情值达到90以上' },
  { id: 'feed_pet', name: '喂养宠物', icon: '🍖', reward: 15, desc: '喂食宠物1次', target: 1 },
  { id: 'play_pet', name: '陪玩宠物', icon: '🎾', reward: 15, desc: '和宠物玩耍1次', target: 1 },
  { id: 'share_mood', name: '分享心情', icon: '📝', reward: 10, desc: '发布一条日记' },
  { id: 'send_gift', name: '送礼达人', icon: '🎁', reward: 20, desc: '送出1份礼物', target: 1 },
  { id: 'buy_shop', name: '购物达人', icon: '🛒', reward: 15, desc: '在商店消费1次', target: 1 }
];

// ========== 机器人NPC ==========

const robotNPCs = [
  { nickname: '小甜心🤖', avatar: '👧', personality: 'sweet' },
  { nickname: '小可爱🤖', avatar: '👱‍♀️', personality: 'cute' },
  { nickname: '小学霸🤖', avatar: '👩', personality: 'smart' },
  { nickname: '小淘气🤖', avatar: '🧑‍🦰', personality: 'playful' }
];

function getRobotAction(personality, gameType, context) {
  if (gameType === 'draw') {
    const words = ['苹果', '猫咪', '太阳', '房子', '汽车', '花朵', '月亮', '星星', '冰淇淋', '蛋糕'];
    return words[Math.floor(Math.random() * words.length)];
  }
  
  if (gameType === 'tacit') {
    const answers = context.options || ['A', 'B', 'C', 'D'];
    return answers[Math.floor(Math.random() * answers.length)];
  }
  
  return null;
}

async function getUserByNickname(nickname) {
  const result = await db.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
  return result.rows[0];
}

async function createUser(nickname, password, avatar) {
  const result = await db.query(
    `INSERT INTO users (nickname, password, avatar, coins, mood, energy, hunger, study, furniture, achievements, friends, intimacy_map, gifts_sent, gifts_received, diary, last_login, login_days, room_style)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
    [nickname, password || '', avatar || '👧', 200, 80, 80, 70, 50, '[]', '[]', '[]', '{}', '0', '0', '[]', new Date(), 0, 'pink']
  );
  return result.rows[0];
}

async function updateUserStatus(userId, updates) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const result = await db.query(
    `UPDATE users SET ${setClause}, last_online = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
    [...values, userId]
  );
  return result.rows[0];
}

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 用户注册
  socket.on('register', async ({ nickname, password, avatar }) => {
    try {
      const existingUser = await getUserByNickname(nickname);
      if (existingUser) {
        socket.emit('error', { message: '该姓名已注册，请直接登录~' });
        return;
      }

      const user = await createUser(nickname, password, avatar);
      socket.emit('register_success', { nickname: user.nickname });
      console.log(`${nickname} 注册成功`);
    } catch (err) {
      console.error('注册错误:', err);
      socket.emit('error', { message: '注册失败，请重试' });
    }
  });

  // 用户登录
  socket.on('login', async ({ nickname, password }) => {
    try {
      let user = await getUserByNickname(nickname);
      if (!user) {
        socket.emit('error', { message: '该姓名未注册，请先注册账号~' });
        return;
      }

      // 密码验证
      if (!password) {
        socket.emit('error', { message: '请输入密码~' });
        return;
      }
      if (user.password !== password) {
        socket.emit('error', { message: '密码错误，请重试~' });
        return;
      }

      // 检查签到
      const today = new Date().toDateString();
      const lastLogin = user.last_login ? new Date(user.last_login).toDateString() : null;
      let loginDays = user.login_days || 0;
      let coinsBonus = 0;

      if (lastLogin !== today) {
        if (lastLogin === new Date(Date.now() - 86400000).toDateString()) {
          loginDays++;
        } else {
          loginDays = 1;
        }
        coinsBonus = 10 + Math.min(loginDays * 5, 50);
        user.coins = (user.coins || 0) + coinsBonus;
        user.last_login = new Date();
        user.login_days = loginDays;

        await updateUserStatus(user.id, {
          coins: user.coins,
          last_login: user.last_login,
          login_days: user.login_days
        });

        checkAchievements(user, 'login', loginDays);
      }

      socket.userId = user.id;
      socket.nickname = nickname;
      onlineUsers.set(user.id, {
        socketId: socket.id,
        nickname,
        avatar: user.avatar,
        userId: user.id,
        coins: user.coins
      });

      socket.join('lobby');

      io.to('lobby').emit('online_users', Array.from(onlineUsers.values()));
      socket.emit('user_data', user);

      if (coinsBonus > 0) {
        socket.emit('daily_bonus', { days: loginDays, coins: coinsBonus });
      }

      console.log(`${nickname} 登录了`);
    } catch (err) {
      console.error('登录错误:', err);
      socket.emit('error', { message: '登录失败' });
    }
  });

  socket.on('update_status', async (updates) => {
    if (!socket.userId) return;
    try {
      const user = await updateUserStatus(socket.userId, updates);
      socket.emit('user_data', user);
      
      // 检查状态相关成就
      if (updates.mood >= 90) {
        checkAchievements(user, 'mood_high');
      }
    } catch (err) {
      console.error('更新状态错误:', err);
    }
  });

  // ========== 商店系统 ==========
  
  socket.on('get_shop_data', () => {
    socket.emit('shop_data', { furniture: furnitureShop, gifts: giftShop, petSupplies: petSupplyShop });
  });
  
  socket.on('buy_furniture', async ({ furnitureId }) => {
    const furniture = furnitureShop.find(f => f.id === furnitureId);
    if (!furniture) {
      socket.emit('error', { message: '家具不存在' });
      return;
    }
    
    let user = await getUserByNickname(socket.nickname);
    if (!user || user.coins < furniture.price) {
      socket.emit('error', { message: '金币不够啦~' });
      return;
    }
    
    user.coins -= furniture.price;
    let owned = JSON.parse(user.furniture || '[]');
    owned.push({ id: furniture.id, name: furniture.name, icon: furniture.icon, position: -1 });
    user.furniture = JSON.stringify(owned);
    
    await updateUserStatus(user.id, { coins: user.coins, furniture: user.furniture });
    socket.emit('user_data', user);
    socket.emit('purchase_success', { item: furniture, type: 'furniture' });
    
    checkAchievements(user, 'shop');
  });
  
  socket.on('place_furniture', async ({ furnitureId, position }) => {
    let user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    let owned = JSON.parse(user.furniture || '[]');
    const item = owned.find(f => f.id === furnitureId);
    if (item) {
      item.position = position;
      user.furniture = JSON.stringify(owned);
      await updateUserStatus(user.id, { furniture: user.furniture });
      socket.emit('user_data', user);
    }
  });
  
  socket.on('remove_furniture', async ({ furnitureId }) => {
    let user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    let owned = JSON.parse(user.furniture || '[]');
    const item = owned.find(f => f.id === furnitureId);
    if (item) {
      item.position = -1;
      user.furniture = JSON.stringify(owned);
      await updateUserStatus(user.id, { furniture: user.furniture });
      socket.emit('user_data', user);
    }
  });
  
  // ========== 宠物用品购买 ==========
  
  socket.on('buy_pet_supply', async ({ supplyId }) => {
    const supply = petSupplyShop.find(s => s.id === supplyId);
    if (!supply) {
      socket.emit('error', { message: '商品不存在' });
      return;
    }
    
    let user = await getUserByNickname(socket.nickname);
    if (!user || user.coins < supply.price) {
      socket.emit('error', { message: '金币不够啦~' });
      return;
    }
    
    user.coins -= supply.price;
    
    if (supply.type === 'food') {
      user.pet_food = String((parseInt(user.pet_food) || 0) + supply.amount);
    } else if (supply.type === 'toy') {
      user.pet_toys = String((parseInt(user.pet_toys) || 0) + supply.amount);
    }
    
    await updateUserStatus(user.id, { 
      coins: user.coins, 
      pet_food: user.pet_food,
      pet_toys: user.pet_toys
    });
    socket.emit('user_data', user);
    socket.emit('purchase_success', { item: supply, type: 'petSupply' });
    
    checkAchievements(user, 'shop');
  });
  
  // ========== 礼物系统 ==========
  
  socket.on('send_gift', async ({ targetNickname, giftId }) => {
    const gift = giftShop.find(g => g.id === giftId);
    if (!gift) {
      socket.emit('error', { message: '礼物不存在' });
      return;
    }
    
    let sender = await getUserByNickname(socket.nickname);
    if (!sender || sender.coins < gift.price) {
      socket.emit('error', { message: '金币不够啦~' });
      return;
    }
    
    sender.coins -= gift.price;
    sender.gifts_sent = (parseInt(sender.gifts_sent) || 0) + 1;
    
    // 更新亲密度
    let intimacyMap = JSON.parse(sender.intimacy_map || '{}');
    intimacyMap[targetNickname] = (intimacyMap[targetNickname] || 0) + gift.intimacy;
    sender.intimacy_map = JSON.stringify(intimacyMap);
    
    await updateUserStatus(sender.id, { 
      coins: sender.coins, 
      gifts_sent: sender.gifts_sent, 
      intimacy_map: sender.intimacy_map 
    });
    
    socket.emit('user_data', sender);
    socket.emit('gift_sent', { gift, to: targetNickname });
    
    // 通知接收者
    const targetUser = Array.from(onlineUsers.values()).find(u => u.nickname === targetNickname);
    if (targetUser) {
      io.to(targetUser.socketId).emit('gift_received', { 
        from: socket.nickname, 
        gift,
        intimacy: intimacyMap[targetNickname]
      });
    }
    
    checkAchievements(sender, 'gift');
  });
  
  // ========== 成就系统 ==========
  
  socket.on('get_achievements', async () => {
    let user = await getUserByNickname(socket.nickname);
    if (user) {
      socket.emit('achievements_data', { 
        all: achievements, 
        owned: JSON.parse(user.achievements || '[]')
      });
    }
  });
  
  function checkAchievements(user, type, count = 1) {
    let owned = JSON.parse(user.achievements || '[]');
    let newAchievements = [];
    
    if (type === 'login' && count >= 7 && !owned.includes('login_7')) {
      newAchievements.push('login_7');
    }
    if (type === 'login' && count >= 30 && !owned.includes('login_30')) {
      newAchievements.push('login_30');
    }
    if (type === 'shop' && !owned.includes('shop_first')) {
      newAchievements.push('shop_first');
    }
    if (type === 'gift' && parseInt(user.gifts_sent) >= 10 && !owned.includes('gift_10')) {
      newAchievements.push('gift_10');
    }
    if (type === 'pet_adopt' && !owned.includes('adopt_first')) {
      newAchievements.push('adopt_first');
    }
    if (type === 'pet_action' && count && count.level >= 5 && !owned.includes('pet_level_5')) {
      newAchievements.push('pet_level_5');
    }
    if (type === 'pet_action' && count && count.level >= 10 && !owned.includes('pet_level_10')) {
      newAchievements.push('pet_level_10');
    }
    if (type === 'pet_action' && count && count.level >= 20 && !owned.includes('pet_level_20')) {
      newAchievements.push('pet_level_20');
    }
    if (type === 'moment') {
      const momentData = readMoments();
      const userMoments = momentData.moments.filter(m => m.author === user.nickname);
      const totalLikes = userMoments.reduce((sum, m) => sum + m.likes.length, 0);
      
      if (userMoments.length >= 1 && !owned.includes('moment_first')) {
        newAchievements.push('moment_first');
      }
      if (userMoments.length >= 5 && !owned.includes('moment_5')) {
        newAchievements.push('moment_5');
      }
      if (userMoments.length >= 20 && !owned.includes('moment_20')) {
        newAchievements.push('moment_20');
      }
      if (totalLikes >= 10 && !owned.includes('moment_like_10')) {
        newAchievements.push('moment_like_10');
      }
    }
    
    if (newAchievements.length > 0) {
      owned.push(...newAchievements);
      let totalReward = 0;
      newAchievements.forEach(id => {
        for (let category of Object.values(achievements)) {
          const ach = category.find(a => a.id === id);
          if (ach) totalReward += ach.reward;
        }
      });
      
      user.coins += totalReward;
      user.achievements = JSON.stringify(owned);
      
      updateUserStatus(user.id, { coins: user.coins, achievements: user.achievements });
      
      const achDetails = newAchievements.map(id => {
        for (let category of Object.values(achievements)) {
          const ach = category.find(a => a.id === id);
          if (ach) return ach;
        }
        return null;
      }).filter(Boolean);
      
      io.to(onlineUsers.get(user.id)?.socketId).emit('new_achievement', { 
        achievements: achDetails, 
        reward: totalReward 
      });
    }
  }
  
  // ========== 任务系统 ==========
  
  socket.on('get_daily_tasks', async () => {
    socket.emit('daily_tasks', dailyTasks);
  });
  
  socket.on('complete_task', async ({ taskId }) => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;
    
    let user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    user.coins += task.reward;
    await updateUserStatus(user.id, { coins: user.coins });
    socket.emit('user_data', user);
    socket.emit('task_completed', { task });
  });
  
  // ========== 亲密度查询 ==========
  
  socket.on('get_intimacy', async ({ targetNickname }) => {
    let user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    let intimacyMap = JSON.parse(user.intimacy_map || '{}');
    const intimacy = intimacyMap[targetNickname] || 0;
    
    socket.emit('intimacy_data', { 
      target: targetNickname, 
      intimacy,
      level: getIntimacyLevel(intimacy)
    });
  });
  
  function getIntimacyLevel(intimacy) {
    if (intimacy >= 100) return { name: '灵魂闺蜜', icon: '💖', color: '#ff1493' };
    if (intimacy >= 75) return { name: '闺蜜达人', icon: '💕', color: '#ff69b4' };
    if (intimacy >= 50) return { name: '亲密闺蜜', icon: '💗', color: '#ff69b4' };
    if (intimacy >= 25) return { name: '熟悉朋友', icon: '❤️', color: '#ff6b9d' };
    return { name: '新认识', icon: '👋', color: '#e91e63' };
  }
  
  // ========== 房间风格 ==========
  
  socket.on('change_room_style', async ({ style }) => {
    let user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    user.room_style = style;
    await updateUserStatus(user.id, { room_style: style });
    socket.emit('user_data', user);
  });
  
  // ========== 宠物系统 ==========
  
  socket.on('adopt_pet', async ({ petId }) => {
    let user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    const petPrices = { cat: 0, dog: 0, rabbit: 100, hamster: 150, panda: 300, fox: 200 };
    const price = petPrices[petId] || 0;
    
    if (price > 0 && user.coins < price) {
      socket.emit('error', { message: '金币不够啦~' });
      return;
    }
    
    if (user.pet && user.pet !== 'null' && user.pet !== null) {
      socket.emit('error', { message: '你已经有宠物啦~' });
      return;
    }
    
    const newPet = {
      type: petId,
      level: 1,
      exp: 0,
      hunger: 80,
      mood: 90,
      health: 100,
      adopted_at: new Date().toISOString()
    };
    
    user.coins -= price;
    user.pet = JSON.stringify(newPet);
    
    await updateUserStatus(user.id, { coins: user.coins, pet: user.pet });
    socket.emit('user_data', user);
    socket.emit('pet_adopted', { coins: user.coins, pet: user.pet });
    
    checkAchievements(user, 'pet_adopt');
  });
  
  socket.on('pet_action', async ({ action }) => {
    let user = await getUserByNickname(socket.nickname);
    if (!user || !user.pet || user.pet === 'null') return;
    
    let pet = JSON.parse(user.pet);
    let petFood = parseInt(user.pet_food || '0');
    let petToys = parseInt(user.pet_toys || '0');
    let expGain = 0;
    let message = '';
    
    switch(action) {
      case 'feed':
        if (petFood <= 0) {
          socket.emit('error', { message: '没有食物啦~' });
          return;
        }
        petFood--;
        pet.hunger = Math.min(100, pet.hunger + 25);
        pet.health = Math.min(100, pet.health + 5);
        expGain = 10;
        message = '宠物吃饱饱啦~ 🍖';
        break;
        
      case 'play':
        if (petToys <= 0) {
          socket.emit('error', { message: '没有玩具啦~' });
          return;
        }
        petToys--;
        pet.mood = Math.min(100, pet.mood + 20);
        pet.hunger = Math.max(0, pet.hunger - 5);
        expGain = 15;
        message = '和宠物玩得好开心~ 🎾';
        break;
        
      case 'pet':
        pet.mood = Math.min(100, pet.mood + 10);
        pet.health = Math.min(100, pet.health + 2);
        expGain = 5;
        message = '宠物蹭蹭你，好开心~ 💕';
        break;
        
      case 'sleep':
        pet.health = Math.min(100, pet.health + 15);
        pet.energy = 100;
        expGain = 3;
        message = '宠物睡得香香的~ 💤';
        break;
    }
    
    pet.exp += expGain;
    
    let leveledUp = false;
    while (pet.exp >= pet.level * 100) {
      pet.exp -= pet.level * 100;
      pet.level++;
      leveledUp = true;
    }
    
    user.pet = JSON.stringify(pet);
    user.pet_food = String(petFood);
    user.pet_toys = String(petToys);
    
    await updateUserStatus(user.id, { 
      pet: user.pet, 
      pet_food: user.pet_food, 
      pet_toys: user.pet_toys 
    });
    socket.emit('user_data', user);
    socket.emit('pet_updated', { 
      pet: user.pet, 
      pet_food: user.pet_food, 
      pet_toys: user.pet_toys 
    });
    
    if (leveledUp) {
      socket.emit('notification', { message: `🎉 宠物升级啦！Lv.${pet.level}` });
    } else {
      socket.emit('notification', { message });
    }
    
    checkAchievements(user, 'pet_action', { action, level: pet.level });
  });
  
  socket.on('get_online_users', () => {
    socket.emit('online_users', Array.from(onlineUsers.values()));
  });

  socket.on('poke', ({ targetNickname }) => {
    const targetUser = Array.from(onlineUsers.values()).find(u => u.nickname === targetNickname);
    if (targetUser) {
      io.to(targetUser.socketId).emit('poked', { from: socket.nickname });
    }
  });

  // ========== 闺蜜圈（朋友圈） ==========
  
  const fs = require('fs');
  const MOMENTS_FILE = path.join(__dirname, '..', 'data', 'moments.json');
  
  function readMoments() {
    try {
      if (fs.existsSync(MOMENTS_FILE)) {
        const data = fs.readFileSync(MOMENTS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('读取朋友圈数据失败:', err);
    }
    return { moments: [], momentIdCounter: 1 };
  }
  
  function writeMoments(data) {
    try {
      fs.writeFileSync(MOMENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('写入朋友圈数据失败:', err);
      return false;
    }
  }
  
  socket.on('get_moments', () => {
    const data = readMoments();
    const momentsWithUser = data.moments.map(m => {
      let user = null;
      for (let [id, u] of onlineUsers) {
        if (u.nickname === m.author) {
          user = u;
          break;
        }
      }
      return {
        ...m,
        authorAvatar: user?.avatar || '👧'
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    socket.emit('moments_list', momentsWithUser);
  });
  
  socket.on('post_moment', async ({ content }) => {
    if (!content || !content.trim()) return;
    
    const user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    const data = readMoments();
    const moment = {
      id: data.momentIdCounter++,
      author: socket.nickname,
      content: content.trim(),
      likes: [],
      comments: [],
      created_at: new Date().toISOString()
    };
    
    data.moments.push(moment);
    writeMoments(data);
    
    io.emit('new_moment', {
      ...moment,
      authorAvatar: user.avatar
    });
    
    checkAchievements(user, 'moment');
  });
  
  socket.on('like_moment', async ({ momentId }) => {
    const data = readMoments();
    const moment = data.moments.find(m => m.id === momentId);
    if (!moment) return;
    
    const userIndex = moment.likes.indexOf(socket.nickname);
    if (userIndex > -1) {
      moment.likes.splice(userIndex, 1);
    } else {
      moment.likes.push(socket.nickname);
    }
    
    writeMoments(data);
    io.emit('moment_updated', { id: momentId, likes: moment.likes });
  });
  
  socket.on('comment_moment', async ({ momentId, content }) => {
    if (!content || !content.trim()) return;
    
    const user = await getUserByNickname(socket.nickname);
    if (!user) return;
    
    const data = readMoments();
    const moment = data.moments.find(m => m.id === momentId);
    if (!moment) return;
    
    const comment = {
      id: Date.now(),
      author: socket.nickname,
      authorAvatar: user.avatar,
      content: content.trim(),
      created_at: new Date().toISOString()
    };
    
    moment.comments.push(comment);
    writeMoments(data);
    io.emit('moment_comment', { id: momentId, comment });
  });

  socket.on('send_message', ({ content, toNickname }) => {
    if (toNickname) {
      const targetUser = Array.from(onlineUsers.values()).find(u => u.nickname === toNickname);
      if (targetUser) {
        io.to(targetUser.socketId).emit('private_message', {
          from: socket.nickname,
          content,
          timestamp: Date.now()
        });
      }
    } else {
      io.to('lobby').emit('public_message', {
        from: socket.nickname,
        content,
        timestamp: Date.now()
      });
    }
  });

  socket.on('visit_house', async ({ hostNickname }) => {
    socket.join(`house_${hostNickname}`);
    socket.emit('house_visited', { host: hostNickname });
    
    let host = await getUserByNickname(hostNickname);
    if (host) {
      socket.emit('host_house_data', host);
    }
  });

  socket.on('leave_house', ({ hostNickname }) => {
    socket.leave(`house_${hostNickname}`);
  });

  // ========== 游戏房间系统 ==========
  
  socket.on('create_room', ({ gameType, roomName, addRobot }) => {
    const roomId = 'room_' + Math.random().toString(36).substr(2, 6);
    const room = {
      id: roomId,
      name: roomName || `${socket.nickname}的房间`,
      gameType,
      host: socket.nickname,
      players: [{ 
        id: socket.id, 
        nickname: socket.nickname, 
        avatar: onlineUsers.get(socket.userId)?.avatar,
        score: 0,
        isRobot: false
      }],
      maxPlayers: 4,
      status: 'waiting',
      gameState: null,
      hasRobot: addRobot
    };
    
    // 添加机器人
    if (addRobot) {
      const robot = robotNPCs[Math.floor(Math.random() * robotNPCs.length)];
      room.players.push({
        id: 'robot_' + Math.random().toString(36).substr(2, 4),
        nickname: robot.nickname,
        avatar: robot.avatar,
        score: 0,
        isRobot: true,
        personality: robot.personality
      });
      room.hasRobot = true;
    }
    
    gameRooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('room_created', room);
    io.to('lobby').emit('room_list', getRoomList());
  });

  socket.on('join_room', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', { message: '房间已满' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('error', { message: '游戏已开始' });
      return;
    }
    
    const player = { 
      id: socket.id, 
      nickname: socket.nickname, 
      avatar: onlineUsers.get(socket.userId)?.avatar,
      score: 0,
      isRobot: false
    };
    room.players.push(player);
    socket.join(roomId);
    io.to(roomId).emit('player_joined', player);
    socket.emit('room_joined', room);
    io.to('lobby').emit('room_list', getRoomList());
  });

  socket.on('leave_room', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(roomId);
    
    if (room.players.filter(p => !p.isRobot).length === 0) {
      gameRooms.delete(roomId);
    } else {
      if (room.host === socket.nickname) {
        const nextHuman = room.players.find(p => !p.isRobot);
        if (nextHuman) room.host = nextHuman.nickname;
      }
      io.to(roomId).emit('player_left', { nickname: socket.nickname });
    }
    
    io.to('lobby').emit('room_list', getRoomList());
  });

  socket.on('start_game', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room || room.host !== socket.nickname) return;

    // 确保至少有2个玩家（可以加机器人）
    if (room.players.length < 2) {
      const robot = robotNPCs[Math.floor(Math.random() * robotNPCs.length)];
      room.players.push({
        id: 'robot_' + Math.random().toString(36).substr(2, 4),
        nickname: robot.nickname,
        avatar: robot.avatar,
        score: 0,
        isRobot: true,
        personality: robot.personality
      });
    }

    room.status = 'playing';

    // 先发送 game_started，让前端渲染游戏界面
    io.to(roomId).emit('game_started', room);

    // 延迟一小段时间再初始化游戏，确保前端界面已渲染
    setTimeout(() => {
      if (room.gameType === 'draw') {
        initDrawGame(room);
      } else if (room.gameType === 'adventure') {
        initAdventureGame(room);
      } else if (room.gameType === 'tacit') {
        initTacitGame(room);
      } else if (room.gameType === 'truth') {
        initTruthGame(room);
      }
    }, 200);
  });

  socket.on('get_room_list', () => {
    socket.emit('room_list', getRoomList());
  });

  // ========== 你画我猜 ==========
  socket.on('draw', ({ roomId, data }) => {
    const room = gameRooms.get(roomId);
    if (!room || room.gameType !== 'draw') return;
    socket.to(roomId).emit('draw_data', data);
  });

  socket.on('clear_canvas', ({ roomId }) => {
    socket.to(roomId).emit('canvas_cleared');
  });

  socket.on('guess', ({ roomId, answer }) => {
    const room = gameRooms.get(roomId);
    if (!room || room.gameType !== 'draw' || !room.gameState) return;
    
    const currentWord = room.gameState.currentWord;
    const drawer = room.gameState.drawerIndex;
    const player = room.players.find(p => p.id === socket.id);
    
    if (!player || player.isRobot || room.players[drawer].id === socket.id) return;
    
    if (answer.trim().toLowerCase() === currentWord.toLowerCase()) {
      player.score = (player.score || 0) + 10;
      room.players[drawer].score = (room.players[drawer].score || 0) + 5;
      
      io.to(roomId).emit('correct_guess', {
        guesser: player.nickname,
        word: currentWord,
        scores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0 }))
      });
      
      nextDrawRound(room);
    } else {
      io.to(roomId).emit('wrong_guess', {
        guesser: player.nickname,
        answer
      });
    }
  });

  // ========== 冒险棋（增强版：30格+班主任刘老师事件） ==========
  socket.on('roll_dice', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room || room.gameType !== 'adventure' || !room.gameState) return;
    
    const currentPlayer = room.gameState.currentPlayer;
    const playerObj = room.players[currentPlayer];
    
    // 如果是机器人，自动处理
    if (playerObj.isRobot) {
      handleRobotDiceRoll(room, currentPlayer);
      return;
    }
    
    if (playerObj.id !== socket.id) return;
    
    handleDiceRoll(room, currentPlayer);
  });

  function handleRobotDiceRoll(room, playerIndex) {
    setTimeout(() => {
      handleDiceRoll(room, playerIndex);
    }, 1000 + Math.random() * 2000);
  }

  function handleDiceRoll(room, playerIndex) {
    const dice = Math.floor(Math.random() * 6) + 1;
    let position = room.gameState.positions[playerIndex];
    position = position + dice;
    
    // 检查是否到达终点（30格）
    if (position >= 29) {
      room.status = 'ended';
      io.to(room.id).emit('game_ended', {
        winner: room.players[playerIndex].nickname,
        finalScores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0, position: Math.min(29, room.gameState.positions[room.players.indexOf(p)]) }))
      });
      return;
    }
    
    // 触发事件（30格，更丰富的事件）
    const event = getAdventureEvent30(position);
    
    // 处理事件效果
    if (event.type === 'back') {
      position = Math.max(0, position - event.value);
    } else if (event.type === 'forward') {
      position = Math.min(29, position + event.value);
    } else if (event.type === 'stop') {
      room.gameState.stopped[playerIndex] = event.rounds || 1;
    } else if (event.type === 'swap') {
      // 和后面的玩家交换位置
      const nextPlayer = (playerIndex + 1) % room.players.length;
      const tempPos = room.gameState.positions[nextPlayer];
      room.gameState.positions[nextPlayer] = position;
      position = tempPos;
    } else if (event.type === 'bonus') {
      room.players[playerIndex].score = (room.players[playerIndex].score || 0) + event.value;
    }
    
    room.gameState.positions[playerIndex] = position;
    
    io.to(room.id).emit('dice_rolled', {
      player: room.players[playerIndex].nickname,
      dice,
      position,
      event,
      positions: room.gameState.positions,
      scores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0 }))
    });
    
    // 下一个玩家
    let nextPlayerIndex = (playerIndex + 1) % room.players.length;
    
    // 检查是否被罚停
    while (room.gameState.stopped[nextPlayerIndex] > 0) {
      room.gameState.stopped[nextPlayerIndex]--;
      io.to(room.id).emit('player_stopped', { 
        player: room.players[nextPlayerIndex].nickname,
        remaining: room.gameState.stopped[nextPlayerIndex]
      });
      nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
    }
    
    setTimeout(() => {
      io.to(room.id).emit('turn_changed', { 
        currentPlayer: room.players[nextPlayerIndex].nickname
      });
      
      // 如果下一个是机器人，自动掷骰子
      if (room.players[nextPlayerIndex].isRobot) {
        handleRobotDiceRoll(room, nextPlayerIndex);
      }
    }, 2500);
  }

  // 30格冒险棋事件表（包含班主任刘老师事件）
  function getAdventureEvent30(position) {
    const events = [
      // 0-5格：开始区域（安全区）
      { type: 'safe', text: '🏠 刚出发，慢慢来~' },
      { type: 'forward', value: 2, text: '✨ 起步顺利，前进2格！' },
      { type: 'safe', text: '😊 阳光明媚的早晨~' },
      { type: 'bonus', value: 5, text: '💰 路边捡到5枚金币！' },
      { type: 'forward', value: 1, text: '🎵 听到喜欢的歌，前进1格~' },
      { type: 'safe', text: '☕ 喝杯奶茶休息一下~' },
      
      // 6-10格：学校区域
      { type: 'back', value: 3, text: '😱 班主任刘老师在走廊！后退3格！' },
      { type: 'forward', value: 2, text: '📝 作业满分，前进2格！' },
      { type: 'stop', rounds: 1, text: '🚨 刘老师抓你补习！停一轮！' },
      { type: 'back', value: 4, text: '🤦 刘老师说你头发太乱，后退4格去整理！' },
      { type: 'safe', text: '📚 图书馆安静看书~' },
      
      // 11-15格：休闲区
      { type: 'forward', value: 3, text: '🎉 遇到闺蜜，开心前进3格！' },
      { type: 'bonus', value: 10, text: '🎁闺蜜送你礼物，+10金币！' },
      { type: 'safe', text: '🛍️ 逛商场买买买~' },
      { type: 'back', value: 2, text: '💸 钱包空了，后退2格去打工！' },
      { type: 'forward', value: 1, text: '🍦 吃到超好吃的冰淇淋，前进1格~' },
      
      // 16-20格：刘老师高发区
      { type: 'back', value: 5, text: '😤 刘老师发现你上课玩手机！后退5格！' },
      { type: 'stop', rounds: 2, text: '🚫 刘老师叫你写检讨！停2轮！' },
      { type: 'back', value: 3, text: '📱 刘老师没收你的手机，后退3格！' },
      { type: 'swap', text: '🔄 刘老师让你和同学换座位！和别人交换位置！' },
      { type: 'forward', value: 4, text: '🏆 刘老师表扬你，前进4格！' },
      
      // 21-25格：冲刺区
      { type: 'forward', value: 2, text: '⚡ 冲刺阶段，前进2格！' },
      { type: 'back', value: 2, text: '😓 累了休息一下，后退2格~' },
      { type: 'bonus', value: 15, text: '🌟 快到终点，奖励15金币！' },
      { type: 'forward', value: 3, text: '💪 最后冲刺，前进3格！' },
      { type: 'back', value: 4, text: '😱 刘老师最后检查作业！没写的后退4格！' },
      
      // 26-29格：终点区
      { type: 'safe', text: '🚪 快到门口了~' },
      { type: 'forward', value: 1, text: '🦄 幸运加成，前进1格！' },
      { type: 'back', value: 2, text: '🛑 门卫叔叔拦住你检查，后退2格~' },
      { type: 'forward', value: 2, text: '🎊 冲向终点，前进2格！' }
    ];
    
    return events[position] || { type: 'safe', text: '继续前进~' };
  }

  // ========== 默契大挑战 ==========
  socket.on('submit_answer', ({ roomId, answer }) => {
    const room = gameRooms.get(roomId);
    if (!room || room.gameType !== 'tacit' || !room.gameState) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.isRobot) return;
    
    room.gameState.answers[player.nickname] = answer;
    const answeredCount = Object.keys(room.gameState.answers).length;
    const humanCount = room.players.filter(p => !p.isRobot).length;
    
    io.to(roomId).emit('answer_progress', { answered: answeredCount, total: humanCount });
    
    if (answeredCount >= humanCount) {
      // 机器人补答案
      room.players.filter(p => p.isRobot).forEach(robot => {
        const options = room.gameState.questions[room.gameState.round].options;
        room.gameState.answers[robot.nickname] = options[Math.floor(Math.random() * options.length)];
      });
      
      const result = calculateTacitScore(room);
      io.to(roomId).emit('round_result', result);
      
      room.gameState.round++;
      if (room.gameState.round >= room.gameState.questions.length) {
        room.status = 'ended';
        io.to(roomId).emit('game_ended', { finalScores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0 })) });
        
        // 检查成就
        if (result.allSame) {
          room.players.filter(p => !p.isRobot).forEach(async p => {
            let user = await getUserByNickname(p.nickname);
            if (user) checkAchievements(user, 'tacit_perfect');
          });
        }
      } else {
        setTimeout(() => {
          nextTacitRound(room);
        }, 3000);
      }
    }
  });

  // ========== 真心话大冒险 ==========
  socket.on('truth_dare_action', ({ roomId, action }) => {
    const room = gameRooms.get(roomId);
    if (!room || room.gameType !== 'truth' || !room.gameState) return;
    
    const currentPlayer = room.players[room.gameState.currentPlayer];
    if (currentPlayer.id !== socket.id && !currentPlayer.isRobot) return;
    
    io.to(roomId).emit('truth_dare_update', {
      player: currentPlayer.nickname,
      action
    });
    
    if (action === 'next') {
      nextTruthRound(room);
    }
  });

  socket.on('disconnect', () => {
    console.log('用户断开:', socket.nickname);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.to('lobby').emit('online_users', Array.from(onlineUsers.values()));
      
      gameRooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.filter(p => !p.isRobot).length === 0) {
            gameRooms.delete(roomId);
          } else {
            if (room.host === socket.nickname) {
              const nextHuman = room.players.find(p => !p.isRobot);
              if (nextHuman) room.host = nextHuman.nickname;
            }
            io.to(roomId).emit('player_left', { nickname: socket.nickname });
          }
        }
      });
      
      io.to('lobby').emit('room_list', getRoomList());
    }
  });
});

function getRoomList() {
  return Array.from(gameRooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    gameType: r.gameType,
    host: r.host,
    playerCount: r.players.length,
    maxPlayers: r.maxPlayers,
    status: r.status,
    hasRobot: r.hasRobot || r.players.some(p => p.isRobot)
  }));
}

const drawWords = [
  '苹果', '猫咪', '太阳', '房子', '汽车', '花朵', '月亮', '星星',
  '冰淇淋', '蛋糕', '彩虹', '蝴蝶', '小狗', '大树', '雨伞', '飞机',
  '眼镜', '帽子', '书本', '铅笔', '篮球', '吉他', '钢琴', '汉堡',
  '汉堡', '薯条', '奶茶', '蛋糕', '甜甜圈', '猫咪', '小狗', '兔子'
];

function initDrawGame(room) {
  room.gameState = {
    currentWord: '',
    drawerIndex: 0,
    round: 1,
    maxRounds: 3
  };
  nextDrawRound(room);
}

function nextDrawRound(room) {
  if (!room.gameState) return;
  
  if (room.gameState.drawerIndex >= room.players.length) {
    room.gameState.drawerIndex = 0;
    room.gameState.round++;
    
    if (room.gameState.round > room.gameState.maxRounds) {
      room.status = 'ended';
      io.to(room.id).emit('game_ended', { 
        finalScores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0 })) 
      });
      return;
    }
  }
  
  room.gameState.currentWord = drawWords[Math.floor(Math.random() * drawWords.length)];
  const drawer = room.players[room.gameState.drawerIndex];
  
  io.to(room.id).emit('new_round', {
    drawer: drawer.nickname,
    round: room.gameState.round,
    maxRounds: room.gameState.maxRounds
  });
  
  if (drawer.isRobot) {
    io.to(room.id).emit('robot_drawing', { drawer: drawer.nickname });
    setTimeout(() => {
      const robotGuesses = room.players.filter(p => p.isRobot && p.id !== drawer.id);
      robotGuesses.forEach(robot => {
        if (Math.random() < 0.3) {
          io.to(room.id).emit('correct_guess', {
            guesser: robot.nickname,
            word: room.gameState.currentWord,
            scores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0 }))
          });
          room.gameState.drawerIndex++;
          setTimeout(() => nextDrawRound(room), 2000);
        } else {
          io.to(room.id).emit('wrong_guess', {
            guesser: robot.nickname,
            answer: drawWords[Math.floor(Math.random() * drawWords.length)]
          });
        }
      });
    }, 5000);
  } else {
    io.to(drawer.id).emit('your_turn_to_draw', {
      word: room.gameState.currentWord
    });
    
    let guessCount = 0;
    const maxGuesses = 5;
    const robotGuessInterval = setInterval(() => {
      const robotGuesses = room.players.filter(p => p.isRobot && p.id !== drawer.id);
      if (robotGuesses.length === 0 || guessCount >= maxGuesses) {
        clearInterval(robotGuessInterval);
        return;
      }
      
      robotGuesses.forEach(robot => {
        if (Math.random() < 0.35) {
          io.to(room.id).emit('correct_guess', {
            guesser: robot.nickname,
            word: room.gameState.currentWord,
            scores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0 }))
          });
          clearInterval(robotGuessInterval);
          room.gameState.drawerIndex++;
          setTimeout(() => nextDrawRound(room), 2000);
        } else {
          io.to(room.id).emit('wrong_guess', {
            guesser: robot.nickname,
            answer: drawWords[Math.floor(Math.random() * drawWords.length)]
          });
        }
      });
      
      guessCount++;
    }, 3000);
    
    setTimeout(() => {
      clearInterval(robotGuessInterval);
      if (room.gameState.round <= room.gameState.maxRounds) {
        room.gameState.drawerIndex++;
        io.to(room.id).emit('notification', { message: `⏰ 时间到！答案是: ${room.gameState.currentWord}` });
        setTimeout(() => nextDrawRound(room), 2000);
      }
    }, 30000);
  }
}

function initAdventureGame(room) {
  room.gameState = {
    positions: room.players.map(() => 0),
    currentPlayer: 0,
    stopped: room.players.map(() => 0) // 被罚停轮数
  };
  
  io.to(room.id).emit('adventure_start', {
    positions: room.gameState.positions,
    currentPlayer: room.players[0].nickname,
    totalCells: 30
  });
}

const tacitQuestions = [
  { question: '你闺蜜最讨厌的蔬菜是什么？', options: ['胡萝卜', '西兰花', '苦瓜', '洋葱'] },
  { question: '你闺蜜最喜欢的颜色是什么？', options: ['粉色', '蓝色', '紫色', '黑色'] },
  { question: '你闺蜜最想养的宠物是什么？', options: ['猫咪', '小狗', '兔子', '仓鼠'] },
  { question: '你闺蜜最喜欢的学科是什么？', options: ['语文', '数学', '英语', '体育'] },
  { question: '你闺蜜最喜欢吃的零食是什么？', options: ['薯片', '巧克力', '糖果', '饼干'] },
  { question: '你闺蜜最喜欢的季节是什么？', options: ['春天', '夏天', '秋天', '冬天'] },
  { question: '你闺蜜周末最喜欢做什么？', options: ['追剧', '打游戏', '逛街', '睡觉'] },
  { question: '你闺蜜最怕的东西是什么？', options: ['蟑螂', '蜘蛛', '蛇', '老鼠'] },
  { question: '你闺蜜最喜欢的音乐类型是什么？', options: ['流行', '摇滚', '古风', '电子'] },
  { question: '你闺蜜最想去旅游的地方是哪里？', options: ['日本', '韩国', '巴黎', '迪士尼'] },
  { question: '你闺蜜最喜欢的奶茶口味？', options: ['珍珠奶茶', '水果茶', '拿铁', '抹茶'] },
  { question: '你闺蜜最想拥有什么超能力？', options: ['隐身', '飞行', '时间暂停', '心灵感应'] },
  { question: '你闺蜜睡觉前必做的事？', options: ['刷手机', '听音乐', '看书', '数羊'] }
];

function initTacitGame(room) {
  room.gameState = {
    round: 0,
    questions: [...tacitQuestions].sort(() => Math.random() - 0.5).slice(0, 5),
    answers: {}
  };
  nextTacitRound(room);
}

function nextTacitRound(room) {
  if (!room.gameState || room.gameState.round >= room.gameState.questions.length) return;
  
  room.gameState.answers = {};
  const currentQuestion = room.gameState.questions[room.gameState.round];
  
  io.to(room.id).emit('tacit_question', {
    round: room.gameState.round + 1,
    total: room.gameState.questions.length,
    question: currentQuestion.question,
    options: currentQuestion.options
  });
}

function calculateTacitScore(room) {
  const answers = room.gameState.answers;
  const answerList = Object.values(answers);
  const answerCount = {};
  
  answerList.forEach(a => {
    answerCount[a] = (answerCount[a] || 0) + 1;
  });
  
  const maxCount = Math.max(...Object.values(answerCount));
  const allSame = maxCount === room.players.length;
  const mostCommon = Object.keys(answerCount).find(k => answerCount[k] === maxCount);
  
  room.players.forEach(p => {
    if (answers[p.nickname] === mostCommon) {
      p.score = (p.score || 0) + (allSame ? 20 : 10);
    }
  });
  
  return {
    answers,
    allSame,
    mostCommon,
    scores: room.players.map(p => ({ nickname: p.nickname, score: p.score || 0 }))
  };
}

const truthDareCards = {
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
    '你最想和谁交换一天人生？',
    '你暗恋过谁吗？',
    '你最喜欢的表情包是什么？',
    '你最想对闺蜜说什么？',
    '你最尴尬的梦是什么？',
    '你最想去但没去过的地方？'
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
    '跳一段广场舞',
    '打电话给妈妈说我爱你',
    '给大家表演一个才艺',
    '用屁股写字',
    '模仿班主任刘老师说话',
    '给大家讲一个笑话'
  ]
};

function initTruthGame(room) {
  room.gameState = {
    currentPlayer: 0,
    round: 0
  };
  nextTruthRound(room);
}

function nextTruthRound(room) {
  if (!room.gameState) return;
  
  room.gameState.round++;
  room.gameState.currentPlayer = (room.gameState.currentPlayer + 1) % room.players.length;
  
  const currentPlayer = room.players[room.gameState.currentPlayer];
  
  io.to(room.id).emit('truth_dare_new_round', {
    player: currentPlayer.nickname,
    round: room.gameState.round,
    isRobot: currentPlayer.isRobot
  });
  
  // 如果是机器人，自动选择
  if (currentPlayer.isRobot) {
    setTimeout(() => {
      const type = Math.random() < 0.5 ? 'truth' : 'dare';
      const cards = truthDareCards[type];
      const question = cards[Math.floor(Math.random() * cards.length)];
      
      io.to(room.id).emit('truth_dare_update', {
        player: currentPlayer.nickname,
        action: { type, question }
      });
      
      setTimeout(() => {
        nextTruthRound(room);
      }, 3000);
    }, 2000);
  }
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`🎉 闺蜜小镇服务器运行在 http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('启动失败:', err);
  }
}

startServer();