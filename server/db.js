const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FRIENDSHIPS_FILE = path.join(DATA_DIR, 'friendships.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MOMENTS_FILE = path.join(DATA_DIR, 'moments.json');

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
    const author = params[0];
    const moments = momentData.moments.filter(m => m.author === author);
    return { rows: moments };
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

  return { rows: [] };
}

module.exports = { initDB, db };
