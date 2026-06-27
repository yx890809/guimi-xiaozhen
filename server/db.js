const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FRIENDSHIPS_FILE = path.join(DATA_DIR, 'friendships.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MOMENTS_FILE = path.join(DATA_DIR, 'moments.json');
const CHAT_MESSAGES_FILE = path.join(DATA_DIR, 'chat_messages.json');
const GIFT_RECORDS_FILE = path.join(DATA_DIR, 'gift_records.json');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');
const DAILY_SURPRISE_FILE = path.join(DATA_DIR, 'daily_surprise.json');
const MAYOR_REWARDS_FILE = path.join(DATA_DIR, 'mayor_rewards.json');
const ACTIVITY_STATS_FILE = path.join(DATA_DIR, 'activity_stats.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSONFile(filePath, defaultData) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('读取文件失败:', filePath, err);
  }
  return defaultData;
}

function writeJSONFile(filePath, data) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('写入文件失败:', filePath, err);
    return false;
  }
}

async function initDB() {
  const connectionString = process.env.DATABASE_URL;
  
  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  } else {
    console.log('⚠️  未配置 DATABASE_URL，使用文件存储模式（数据会持久化到本地JSON文件）');
    pool = null;
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) {
      writeJSONFile(USERS_FILE, { users: [], userIdCounter: 1 });
    }
    if (!fs.existsSync(FRIENDSHIPS_FILE)) {
      writeJSONFile(FRIENDSHIPS_FILE, { friendships: [], friendshipIdCounter: 1 });
    }
    if (!fs.existsSync(MESSAGES_FILE)) {
      writeJSONFile(MESSAGES_FILE, { messages: [], messageIdCounter: 1 });
    }
    if (!fs.existsSync(MOMENTS_FILE)) {
      writeJSONFile(MOMENTS_FILE, { moments: [], momentIdCounter: 1 });
    }
    if (!fs.existsSync(CHAT_MESSAGES_FILE)) {
      writeJSONFile(CHAT_MESSAGES_FILE, { messages: [], messageIdCounter: 1 });
    }
    if (!fs.existsSync(GIFT_RECORDS_FILE)) {
      writeJSONFile(GIFT_RECORDS_FILE, { records: [], recordIdCounter: 1 });
    }
    if (!fs.existsSync(ANNOUNCEMENTS_FILE)) {
      writeJSONFile(ANNOUNCEMENTS_FILE, { announcements: [], idCounter: 1 });
    }
    if (!fs.existsSync(DAILY_SURPRISE_FILE)) {
      writeJSONFile(DAILY_SURPRISE_FILE, { surprise: null });
    }
    if (!fs.existsSync(MAYOR_REWARDS_FILE)) {
      writeJSONFile(MAYOR_REWARDS_FILE, { rewards: [], idCounter: 1 });
    }
    if (!fs.existsSync(ACTIVITY_STATS_FILE)) {
      writeJSONFile(ACTIVITY_STATS_FILE, { stats: [], idCounter: 1 });
    }
    console.log('✅ 文件存储初始化完成');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nickname VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) DEFAULT '',
        avatar VARCHAR(10) DEFAULT '👧',
        coins INTEGER DEFAULT 200,
        mood INTEGER DEFAULT 80,
        energy INTEGER DEFAULT 80,
        hunger INTEGER DEFAULT 70,
        study INTEGER DEFAULT 50,
        hair_style VARCHAR(20) DEFAULT 'ponytail',
        hair_color VARCHAR(20) DEFAULT 'black',
        top VARCHAR(20) DEFAULT 'tshirt',
        bottom VARCHAR(20) DEFAULT 'skirt',
        outfit_color VARCHAR(20) DEFAULT 'pink',
        accessory VARCHAR(20) DEFAULT 'none',
        furniture TEXT DEFAULT '[]',
        achievements TEXT DEFAULT '[]',
        friends TEXT DEFAULT '[]',
        intimacy_map TEXT DEFAULT '{}',
        gifts_sent INTEGER DEFAULT 0,
        gifts_received INTEGER DEFAULT 0,
        diary TEXT DEFAULT '[]',
        room_style VARCHAR(20) DEFAULT 'pink',
        pet TEXT DEFAULT 'null',
        pet_food INTEGER DEFAULT 10,
        pet_toys INTEGER DEFAULT 2,
        last_login TIMESTAMP DEFAULT NOW(),
        login_days INTEGER DEFAULT 0,
        last_online TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id1 INTEGER REFERENCES users(id),
        user_id2 INTEGER REFERENCES users(id),
        intimacy INTEGER DEFAULT 0,
        last_interaction TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id1, user_id2)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user INTEGER REFERENCES users(id),
        to_user INTEGER REFERENCES users(id),
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS moments (
        id SERIAL PRIMARY KEY,
        author VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        likes TEXT DEFAULT '[]',
        comments TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        from_user VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_records (
        id SERIAL PRIMARY KEY,
        from_user VARCHAR(50) NOT NULL,
        to_user VARCHAR(50) NOT NULL,
        gift_id VARCHAR(50) NOT NULL,
        gift_name VARCHAR(50) NOT NULL,
        gift_icon VARCHAR(10) NOT NULL,
        gift_price INT NOT NULL,
        intimacy_gained INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_surprise (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mayor_rewards (
        id SERIAL PRIMARY KEY,
        to_user VARCHAR(50) NOT NULL,
        reward_type VARCHAR(20) NOT NULL,
        reward_name VARCHAR(100) NOT NULL,
        reward_icon VARCHAR(10) NOT NULL,
        coins INT DEFAULT 0,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_stats (
        id SERIAL PRIMARY KEY,
        stat_date DATE NOT NULL,
        active_users INT DEFAULT 0,
        messages_count INT DEFAULT 0,
        gifts_count INT DEFAULT 0,
        moments_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ 数据库初始化完成');
  } catch (err) {
    console.error('数据库初始化失败:', err);
  }
}

const db = {
  async query(text, params) {
    if (!pool) {
      return fileQuery(text, params);
    }
    return pool.query(text, params);
  }
};

function fileQuery(text, params) {
  const userData = readJSONFile(USERS_FILE, { users: [], userIdCounter: 1 });
  const friendshipData = readJSONFile(FRIENDSHIPS_FILE, { friendships: [], friendshipIdCounter: 1 });
  const messageData = readJSONFile(MESSAGES_FILE, { messages: [], messageIdCounter: 1 });

  if (text.includes('SELECT * FROM users WHERE nickname = $1')) {
    const user = userData.users.find(u => u.nickname === params[0]);
    return { rows: user ? [user] : [] };
  }

  if (text.includes('SELECT * FROM users WHERE id = $1')) {
    const user = userData.users.find(u => u.id === parseInt(params[0]));
    return { rows: user ? [user] : [] };
  }

  if (text.includes('SELECT id, nickname, avatar FROM users')) {
    const users = userData.users.map(u => ({
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar
    }));
    return { rows: users };
  }

  if (text.includes('SELECT id, nickname, avatar, coins, register_date, last_login FROM users')) {
    const users = userData.users.map(u => ({
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      coins: u.coins || 0,
      register_date: u.register_date || new Date().toISOString(),
      last_login: u.last_login || null
    }));
    return { rows: users };
  }

  if (text.includes('DELETE FROM users WHERE')) {
    const nickname = params[0];
    const index = userData.users.findIndex(u => u.nickname === nickname);
    if (index > -1) {
      const deleted = userData.users.splice(index, 1)[0];
      writeJSONFile(USERS_FILE, userData);
      return { rows: [deleted] };
    }
    return { rows: [] };
  }

  if (text.includes('INSERT INTO users')) {
    const user = {
      id: userData.userIdCounter++,
      nickname: params[0],
      password: params[1] || '',
      avatar: params[2] || '👧',
      coins: params[3] || 200,
      mood: params[4] || 80,
      energy: params[5] || 80,
      hunger: params[6] || 70,
      study: params[7] || 50,
      hair_style: 'ponytail',
      hair_color: 'black',
      top: 'tshirt',
      bottom: 'skirt',
      outfit_color: 'pink',
      accessory: 'none',
      furniture: '[]',
      achievements: '[]',
      friends: '[]',
      intimacy_map: '{}',
      gifts_sent: '0',
      gifts_received: '0',
      diary: '[]',
      last_login: new Date().toISOString(),
      login_days: 0,
      room_style: 'pink',
      pet: 'null',
      pet_food: '10',
      pet_toys: '2',
      last_online: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    userData.users.push(user);
    writeJSONFile(USERS_FILE, userData);
    return { rows: [user] };
  }

  if (text.includes('UPDATE users SET')) {
    const userId = parseInt(params[params.length - 1]);
    const user = userData.users.find(u => u.id === userId);
    if (user) {
      const setPart = text.split('SET')[1].split('WHERE')[0].trim();
      const assignments = [];
      let depth = 0;
      let current = '';
      
      for (let i = 0; i < setPart.length; i++) {
        const c = setPart[i];
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (c === ',' && depth === 0) {
          assignments.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      if (current.trim()) assignments.push(current.trim());

      let paramIndex = 0;
      assignments.forEach(assign => {
        const fieldMatch = assign.match(/^\s*(\w+)\s*=\s*\$(\d+)/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          user[field] = params[paramIndex];
          paramIndex++;
        }
      });
      user.last_online = new Date().toISOString();
      writeJSONFile(USERS_FILE, userData);
    }
    return { rows: user ? [user] : [] };
  }

  if (text.includes('SELECT * FROM friendships')) {
    const userId = parseInt(params[0]);
    const friendships = friendshipData.friendships.filter(
      f => f.user_id1 === userId || f.user_id2 === userId
    );
    return { rows: friendships };
  }

  if (text.includes('INSERT INTO friendships')) {
    const friendship = {
      id: friendshipData.friendshipIdCounter++,
      user_id1: parseInt(params[0]),
      user_id2: parseInt(params[1]),
      intimacy: parseInt(params[2]) || 0,
      last_interaction: new Date().toISOString()
    };
    friendshipData.friendships.push(friendship);
    writeJSONFile(FRIENDSHIPS_FILE, friendshipData);
    return { rows: [friendship] };
  }

  if (text.includes('UPDATE friendships SET')) {
    const fId = parseInt(params[params.length - 1]);
    const friendship = friendshipData.friendships.find(f => f.id === fId);
    if (friendship) {
      if (params[0] !== undefined) {
        friendship.intimacy = parseInt(params[0]);
      }
      friendship.last_interaction = new Date().toISOString();
      writeJSONFile(FRIENDSHIPS_FILE, friendshipData);
    }
    return { rows: friendship ? [friendship] : [] };
  }

  if (text.includes('SELECT * FROM messages WHERE')) {
    const fromUser = parseInt(params[0]);
    const toUser = parseInt(params[1]);
    const messages = messageData.messages.filter(
      m => (m.from_user === fromUser && m.to_user === toUser) ||
           (m.from_user === toUser && m.to_user === fromUser)
    ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { rows: messages };
  }

  if (text.includes('INSERT INTO messages')) {
    const message = {
      id: messageData.messageIdCounter++,
      from_user: parseInt(params[0]),
      to_user: parseInt(params[1]),
      content: params[2],
      is_read: false,
      created_at: new Date().toISOString()
    };
    messageData.messages.push(message);
    writeJSONFile(MESSAGES_FILE, messageData);
    return { rows: [message] };
  }

  if (text.includes('UPDATE messages SET is_read')) {
    const toUser = parseInt(params[1]);
    const fromUser = parseInt(params[2]);
    messageData.messages.forEach(m => {
      if (m.to_user === toUser && m.from_user === fromUser) {
        m.is_read = true;
      }
    });
    writeJSONFile(MESSAGES_FILE, messageData);
    return { rows: [] };
  }

  if (text.includes('SELECT * FROM moments')) {
    const momentData = readJSONFile(MOMENTS_FILE, { moments: [], momentIdCounter: 1 });
    if (params && params[0]) {
      const author = params[0];
      const moments = momentData.moments.filter(m => m.author === author);
      return { rows: moments };
    } else {
      return { rows: momentData.moments };
    }
  }

  if (text.includes('INSERT INTO moments')) {
    const momentData = readJSONFile(MOMENTS_FILE, { moments: [], momentIdCounter: 1 });
    const moment = {
      id: momentData.momentIdCounter++,
      author: params[0],
      content: params[1],
      likes: '[]',
      comments: '[]',
      created_at: new Date().toISOString()
    };
    momentData.moments.push(moment);
    writeJSONFile(MOMENTS_FILE, momentData);
    return { rows: [moment] };
  }

  if (text.includes('UPDATE moments SET')) {
    const momentData = readJSONFile(MOMENTS_FILE, { moments: [], momentIdCounter: 1 });
    const momentId = parseInt(params[params.length - 1]);
    const moment = momentData.moments.find(m => m.id === momentId);
    if (moment) {
      const setPart = text.split('SET')[1].split('WHERE')[0].trim();
      const assignments = [];
      let depth = 0;
      let current = '';
      
      for (let i = 0; i < setPart.length; i++) {
        const c = setPart[i];
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (c === ',' && depth === 0) {
          assignments.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      if (current.trim()) assignments.push(current.trim());

      let paramIndex = 0;
      assignments.forEach(assign => {
        const fieldMatch = assign.match(/^\s*(\w+)\s*=\s*\$(\d+)/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          moment[field] = params[paramIndex];
          paramIndex++;
        }
      });
      writeJSONFile(MOMENTS_FILE, momentData);
    }
    return { rows: moment ? [moment] : [] };
  }

  if (text.includes('SELECT * FROM moments ORDER BY')) {
    const momentData = readJSONFile(MOMENTS_FILE, { moments: [], momentIdCounter: 1 });
    return { rows: momentData.moments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) };
  }

  if (text.includes('INSERT INTO chat_messages')) {
    const chatData = readJSONFile(CHAT_MESSAGES_FILE, { messages: [], messageIdCounter: 1 });
    const message = {
      id: chatData.messageIdCounter++,
      from_user: params[0],
      content: params[1],
      created_at: new Date().toISOString()
    };
    chatData.messages.push(message);
    writeJSONFile(CHAT_MESSAGES_FILE, chatData);
    return { rows: [message] };
  }

  if (text.includes('SELECT * FROM chat_messages')) {
    const chatData = readJSONFile(CHAT_MESSAGES_FILE, { messages: [], messageIdCounter: 1 });
    return { rows: chatData.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) };
  }

  if (text.includes('INSERT INTO gift_records')) {
    const giftData = readJSONFile(GIFT_RECORDS_FILE, { records: [], recordIdCounter: 1 });
    const record = {
      id: giftData.recordIdCounter++,
      from_user: params[0],
      to_user: params[1],
      gift_id: params[2],
      gift_name: params[3],
      gift_icon: params[4],
      gift_price: params[5],
      intimacy_gained: params[6],
      created_at: new Date().toISOString()
    };
    giftData.records.push(record);
    writeJSONFile(GIFT_RECORDS_FILE, giftData);
    return { rows: [record] };
  }

  if (text.includes('SELECT * FROM gift_records') && text.includes('ORDER BY')) {
    const giftData = readJSONFile(GIFT_RECORDS_FILE, { records: [], recordIdCounter: 1 });
    return { rows: giftData.records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) };
  }

  // 广播消息
  if (text.includes('SELECT * FROM announcements ORDER BY')) {
    const data = readJSONFile(ANNOUNCEMENTS_FILE, { announcements: [], idCounter: 1 });
    return { rows: data.announcements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) };
  }

  if (text.includes('INSERT INTO announcements')) {
    const data = readJSONFile(ANNOUNCEMENTS_FILE, { announcements: [], idCounter: 1 });
    const announcement = {
      id: data.idCounter++,
      title: params[0],
      content: params[1],
      created_at: new Date().toISOString(),
      expires_at: params[2] || null
    };
    data.announcements.push(announcement);
    writeJSONFile(ANNOUNCEMENTS_FILE, data);
    return { rows: [announcement] };
  }

  if (text.includes('DELETE FROM announcements WHERE')) {
    const data = readJSONFile(ANNOUNCEMENTS_FILE, { announcements: [], idCounter: 1 });
    const id = parseInt(params[0]);
    const index = data.announcements.findIndex(a => a.id === id);
    if (index > -1) {
      const deleted = data.announcements.splice(index, 1)[0];
      writeJSONFile(ANNOUNCEMENTS_FILE, data);
      return { rows: [deleted] };
    }
    return { rows: [] };
  }

  // 每日惊喜
  if (text.includes('SELECT * FROM daily_surprise WHERE is_active = true')) {
    const data = readJSONFile(DAILY_SURPRISE_FILE, { surprise: null });
    return { rows: data.surprise ? [data.surprise] : [] };
  }

  if (text.includes('DELETE FROM daily_surprise')) {
    const data = readJSONFile(DAILY_SURPRISE_FILE, { surprise: null });
    const surprise = data.surprise;
    data.surprise = null;
    writeJSONFile(DAILY_SURPRISE_FILE, data);
    return { rows: surprise ? [surprise] : [] };
  }

  if (text.includes('INSERT INTO daily_surprise')) {
    const data = readJSONFile(DAILY_SURPRISE_FILE, { surprise: null });
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);
    data.surprise = {
      id: 1,
      name: params[0],
      icon: params[1],
      description: params[2],
      price: params[3],
      start_time: new Date().toISOString(),
      end_time: endTime.toISOString(),
      is_active: true
    };
    writeJSONFile(DAILY_SURPRISE_FILE, data);
    return { rows: [data.surprise] };
  }

  // 镇长奖励
  if (text.includes('SELECT * FROM mayor_rewards WHERE to_user = $1')) {
    const data = readJSONFile(MAYOR_REWARDS_FILE, { rewards: [], idCounter: 1 });
    return { rows: data.rewards.filter(r => r.to_user === params[0]) };
  }

  if (text.includes('INSERT INTO mayor_rewards')) {
    const data = readJSONFile(MAYOR_REWARDS_FILE, { rewards: [], idCounter: 1 });
    const reward = {
      id: data.idCounter++,
      to_user: params[0],
      reward_type: params[1],
      reward_name: params[2],
      reward_icon: params[3],
      coins: params[4] || 0,
      message: params[5] || null,
      created_at: new Date().toISOString()
    };
    data.rewards.push(reward);
    writeJSONFile(MAYOR_REWARDS_FILE, data);
    return { rows: [reward] };
  }

  if (text.includes('UPDATE mayor_rewards SET')) {
    const data = readJSONFile(MAYOR_REWARDS_FILE, { rewards: [], idCounter: 1 });
    const reward = data.rewards.find(r => r.id === parseInt(params[0]));
    if (reward) {
      reward.claimed = true;
      writeJSONFile(MAYOR_REWARDS_FILE, data);
    }
    return { rows: reward ? [reward] : [] };
  }

  // 统计数据
  if (text.includes('SELECT COUNT(*) as count FROM users')) {
    const userData = readJSONFile(USERS_FILE, { users: [], userIdCounter: 1 });
    return { rows: [{ count: userData.users.length }] };
  }

  if (text.includes('SELECT COUNT(*) as count FROM chat_messages WHERE created_at >= CURRENT_DATE')) {
    const chatData = readJSONFile(CHAT_MESSAGES_FILE, { messages: [], messageIdCounter: 1 });
    const today = new Date().toISOString().split('T')[0];
    const count = chatData.messages.filter(m => m.created_at && m.created_at.startsWith(today)).length;
    return { rows: [{ count }] };
  }

  if (text.includes('SELECT COUNT(*) as count FROM gift_records WHERE created_at >= CURRENT_DATE')) {
    const giftData = readJSONFile(GIFT_RECORDS_FILE, { records: [], recordIdCounter: 1 });
    const today = new Date().toISOString().split('T')[0];
    const count = giftData.records.filter(r => r.created_at && r.created_at.startsWith(today)).length;
    return { rows: [{ count }] };
  }

  if (text.includes('SELECT COUNT(*) as count FROM moments WHERE created_at >= CURRENT_DATE')) {
    const momentData = readJSONFile(MOMENTS_FILE, { moments: [], momentIdCounter: 1 });
    const today = new Date().toISOString().split('T')[0];
    const count = momentData.moments.filter(m => m.created_at && m.created_at.startsWith(today)).length;
    return { rows: [{ count }] };
  }

  return { rows: [] };
}

module.exports = { initDB, db };
