const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'chatapp',
  password: 'postgres', // Update with your PostgreSQL password
  port: 5432,
});

const JWT_SECRET = 'your_jwt_secret_key'; // Replace with a secure key in production

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Database connected:', res.rows[0]);
});

// Middleware to verify JWT
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('No token provided');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.userId]);
    if (rows.length === 0) return res.status(401).send('Invalid token');
    req.user = rows[0];
    next();
  } catch (err) {
    res.status(401).send('Invalid token');
  }
};

// Middleware to verify user credentials
const verifyUser = async (req, res, next) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (rows.length === 0) return res.status(401).send('User not found');
  const user = rows[0];
  if (await bcrypt.compare(password, user.password_hash)) {
    req.user = user;
    next();
  } else {
    res.status(401).send('Invalid password');
  }
};

// Routes
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).send('Missing required fields');
  }
  if (username.length > 50 || email.length > 100) {
    return res.status(400).send('Username or email too long');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
      [username, email, hashedPassword]
    );
    res.status(201).send('User created');
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).send('Username or email already exists');
    } else {
      console.error('Signup error:', err);
      res.status(400).send('Error creating user');
    }
  }
});

app.post('/api/login', verifyUser, (req, res) => {
  const token = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ user: { id: req.user.id, username: req.user.username }, token });
});

app.get('/api/me', verifyToken, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

app.post('/api/chats', verifyToken, async (req, res) => {
  const { userId, recipient } = req.body;
  
  // First check if recipient exists
  const { rows: recipientRows } = await pool.query('SELECT id FROM users WHERE username = $1', [recipient]);
  if (recipientRows.length === 0) return res.status(404).send('Recipient not found');
  const recipientId = recipientRows[0].id;

  // Prevent users from chatting with themselves
  if (userId === recipientId) {
    return res.status(400).send('Cannot create chat with yourself');
  }

  try {
    // Check if direct chat already exists between these users
    const { rows: existingChat } = await pool.query(`
      SELECT c.id 
      FROM chats c
      JOIN chat_members cm1 ON cm1.chat_id = c.id
      JOIN chat_members cm2 ON cm2.chat_id = c.id
      WHERE c.chat_type = 'direct'
      AND cm1.user_id = $1 AND cm2.user_id = $2
    `, [userId, recipientId]);

    if (existingChat.length > 0) {
      // Return existing chat data
      const { rows: chatData } = await pool.query(`
        SELECT c.id, c.chat_type, u.username as recipient_username
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id
        JOIN users u ON cm.user_id = u.id
        WHERE c.id = $1 AND cm.user_id != $2
      `, [existingChat[0].id, userId]);
      return res.json(chatData[0]);
    }

    // Create new direct chat
    const { rows: chat } = await pool.query(
      'INSERT INTO chats (chat_type) VALUES ($1) RETURNING id',
      ['direct']
    );

    // Add both users as chat members
    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
      [chat[0].id, userId, recipientId]
    );

    // Get complete chat data
    const { rows: chatData } = await pool.query(`
      SELECT c.id, c.chat_type, u.username as recipient_username
      FROM chats c
      JOIN chat_members cm ON cm.chat_id = c.id
      JOIN users u ON cm.user_id = u.id
      WHERE c.id = $1 AND cm.user_id != $2
    `, [chat[0].id, userId]);

    // Notify both users of the new chat
    io.to(`user:${userId}`).emit('newChat', chatData[0]);
    io.to(`user:${recipientId}`).emit('newChat', chatData[0]);
    
    res.json(chatData[0]);
  } catch (err) {
    console.error('Create chat error:', err);
    res.status(400).send('Error creating chat');
  }
});

app.post('/api/groups', verifyToken, async (req, res) => {
  const { userId, groupName, description } = req.body;
  try {
    // Create group chat
    const { rows } = await pool.query(
      'INSERT INTO chats (chat_type, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      ['group', groupName, description, userId]
    );
    const chatId = rows[0].id;

    // Add creator as admin member
    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)',
      [chatId, userId, 'admin']
    );

    // Get complete group data
    const { rows: groupData } = await pool.query(`
      SELECT c.id, c.chat_type, c.name as group_name, c.description,
             (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'role', cm.role))
              FROM chat_members cm
              JOIN users u ON cm.user_id = u.id
              WHERE cm.chat_id = c.id) as members
      FROM chats c
      WHERE c.id = $1
    `, [chatId]);

    // Notify the creator
    io.to(`user:${userId}`).emit('newChat', groupData[0]);
    
    res.json(groupData[0]);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(400).send('Error creating group');
  }
});

app.get('/api/chats/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    // Get both direct and group chats
    const { rows } = await pool.query(`
      WITH user_chats AS (
        -- Direct chats
        SELECT c.id, c.chat_type, u.username as recipient_username,
               NULL as group_name, NULL as description, NULL as members,
               (SELECT json_build_object(
                 'id', m.id,
                 'content', m.content,
                 'created_at', m.created_at,
                 'sender_username', u2.username
               )
               FROM messages m
               JOIN users u2 ON m.sender_id = u2.id
               WHERE m.chat_id = c.id
               ORDER BY m.created_at DESC
               LIMIT 1) as latest_message
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id
        JOIN users u ON cm.user_id = u.id
        WHERE c.chat_type = 'direct'
        AND cm.user_id != $1
        AND EXISTS (
          SELECT 1 FROM chat_members cm2 
          WHERE cm2.chat_id = c.id AND cm2.user_id = $1
        )
        
        UNION ALL
        
        -- Group chats
        SELECT c.id, c.chat_type, NULL as recipient_username,
               c.name as group_name, c.description,
               (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'role', cm.role))
                FROM chat_members cm
                JOIN users u ON cm.user_id = u.id
                WHERE cm.chat_id = c.id) as members,
               (SELECT json_build_object(
                 'id', m.id,
                 'content', m.content,
                 'created_at', m.created_at,
                 'sender_username', u2.username
               )
               FROM messages m
               JOIN users u2 ON m.sender_id = u2.id
               WHERE m.chat_id = c.id
               ORDER BY m.created_at DESC
               LIMIT 1) as latest_message
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id
        WHERE c.chat_type = 'group'
        AND cm.user_id = $1
      )
      SELECT * FROM user_chats
      ORDER BY 
        CASE 
          WHEN latest_message IS NOT NULL THEN latest_message->>'created_at'
          ELSE '1970-01-01T00:00:00Z'
        END DESC,
        chat_type, id
    `, [userId]);
    
    res.json(rows);
  } catch (err) {
    console.error('Fetch chats error:', err);
    res.status(500).send('Error fetching chats');
  }
});

app.get('/api/messages/:chatId', verifyToken, async (req, res) => {
  const { chatId } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT m.*, u.username as sender_username,
             (SELECT json_agg(json_build_object('user_id', ms.user_id, 'is_read', ms.is_read, 'read_at', ms.read_at))
              FROM message_status ms
              WHERE ms.message_id = m.id) as read_status
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at
    `, [chatId]);
    
    res.json(rows);
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).send('Error fetching messages');
  }
});

// Add new endpoint to get group members
app.get('/api/groups/:groupId/members', verifyToken, async (req, res) => {
  const { groupId } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username
      FROM chat_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.chat_id = $1
    `, [groupId]);
    res.json(rows);
  } catch (err) {
    console.error('Fetch group members error:', err);
    res.status(500).send('Error fetching group members');
  }
});

// Add group member endpoint
app.post('/api/groups/:groupId/members', verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const { username } = req.body;
  const adminId = req.user.id;

  try {
    // Verify admin is a member of the group
    const { rows: adminCheck } = await pool.query(
      'SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [groupId, adminId]
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return res.status(403).send('Only group admins can add members');
    }

    // Get user to add
    const { rows: userToAdd } = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userToAdd.length === 0) {
      return res.status(404).send('User not found');
    }

    const newMemberId = userToAdd[0].id;

    // Check if user is already a member
    const { rows: existingMember } = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [groupId, newMemberId]
    );

    if (existingMember.length > 0) {
      return res.status(400).send('User is already a member of this group');
    }

    // Add user to group
    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)',
      [groupId, newMemberId, 'member']
    );

    // Get updated group data
    const { rows: groupData } = await pool.query(`
      SELECT c.id, c.chat_type, c.name as group_name, c.description,
             (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'role', cm.role))
              FROM chat_members cm
              JOIN users u ON cm.user_id = u.id
              WHERE cm.chat_id = c.id) as members
      FROM chats c
      WHERE c.id = $1
    `, [groupId]);

    // Notify all group members about the new member
    const { rows: members } = await pool.query(
      'SELECT user_id FROM chat_members WHERE chat_id = $1',
      [groupId]
    );

    // Notify all members about the group update
    members.forEach(member => {
      io.to(`user:${member.user_id}`).emit('groupUpdated', {
        ...groupData[0],
        type: 'memberAdded'
      });
    });

    // Also notify the new member about the group
    io.to(`user:${newMemberId}`).emit('newChat', groupData[0]);

    res.json(groupData[0]);
  } catch (err) {
    console.error('Add group member error:', err);
    res.status(500).send('Error adding group member');
  }
});

// Add group member removal endpoint
app.delete('/api/groups/:groupId/members/:userId', verifyToken, async (req, res) => {
  const { groupId, userId } = req.params;
  const adminId = req.user.id;

  try {
    // Verify admin is a member of the group
    const { rows: adminCheck } = await pool.query(
      'SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [groupId, adminId]
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return res.status(403).send('Only group admins can remove members');
    }

    // Prevent removing the last admin
    const { rows: memberCount } = await pool.query(
      'SELECT COUNT(*) FROM chat_members WHERE chat_id = $1 AND role = $2',
      [groupId, 'admin']
    );

    if (memberCount[0].count === '1') {
      const { rows: targetMember } = await pool.query(
        'SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
        [groupId, userId]
      );

      if (targetMember[0]?.role === 'admin') {
        return res.status(400).send('Cannot remove the last admin');
      }
    }

    // Remove user from group
    await pool.query(
      'DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    // Get updated group data
    const { rows: groupData } = await pool.query(`
      SELECT c.id, c.chat_type, c.name as group_name, c.description,
             (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'role', cm.role))
              FROM chat_members cm
              JOIN users u ON cm.user_id = u.id
              WHERE cm.chat_id = c.id) as members
      FROM chats c
      WHERE c.id = $1
    `, [groupId]);

    // Notify all group members about the removal
    const { rows: members } = await pool.query(
      'SELECT user_id FROM chat_members WHERE chat_id = $1',
      [groupId]
    );

    members.forEach(member => {
      io.to(`user:${member.user_id}`).emit('groupUpdated', {
        ...groupData[0],
        type: 'memberRemoved',
        userId: userId
      });
    });

    // Notify removed user
    io.to(`user:${userId}`).emit('groupUpdated', {
      ...groupData[0],
      type: 'removedFromGroup',
      groupId: groupId
    });

    res.json(groupData[0]);
  } catch (err) {
    console.error('Remove group member error:', err);
    res.status(500).send('Error removing group member');
  }
});

// Add group admin transfer endpoint
app.post('/api/groups/:groupId/admin/:userId', verifyToken, async (req, res) => {
  const { groupId, userId } = req.params;
  const currentAdminId = req.user.id;

  try {
    // Verify current user is admin
    const { rows: adminCheck } = await pool.query(
      'SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [groupId, currentAdminId]
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return res.status(403).send('Only group admins can transfer admin role');
    }

    // Verify target user is a member
    const { rows: memberCheck } = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.length === 0) {
      return res.status(404).send('User is not a member of this group');
    }

    // Transfer admin role
    await pool.query(
      'UPDATE chat_members SET role = $1 WHERE chat_id = $2 AND user_id = $3',
      ['admin', groupId, userId]
    );

    // Update current admin to member
    await pool.query(
      'UPDATE chat_members SET role = $1 WHERE chat_id = $2 AND user_id = $3',
      ['member', groupId, currentAdminId]
    );

    // Get updated group data
    const { rows: groupData } = await pool.query(`
      SELECT c.id, c.chat_type, c.name as group_name, c.description,
             (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'role', cm.role))
              FROM chat_members cm
              JOIN users u ON cm.user_id = u.id
              WHERE cm.chat_id = c.id) as members
      FROM chats c
      WHERE c.id = $1
    `, [groupId]);

    // Notify all group members about the admin transfer
    const { rows: members } = await pool.query(
      'SELECT user_id FROM chat_members WHERE chat_id = $1',
      [groupId]
    );

    members.forEach(member => {
      io.to(`user:${member.user_id}`).emit('groupUpdated', {
        ...groupData[0],
        type: 'adminTransferred',
        newAdminId: userId,
        oldAdminId: currentAdminId
      });
    });

    res.json(groupData[0]);
  } catch (err) {
    console.error('Transfer admin error:', err);
    res.status(500).send('Error transferring admin role');
  }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    // Allow unauthenticated connections
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    // Allow connection even if token is invalid
    // We'll handle authentication in the joinUser event
    next();
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New connection established');

  // Handle user authentication
  socket.on('joinUser', async ({ token }) => {
    if (!token) {
      socket.emit('error', 'No token provided');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const { rows } = await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.userId]);
      
      if (rows.length === 0) {
        socket.emit('error', 'Invalid token');
        return;
      }

      socket.userId = decoded.userId;
      socket.join(`user:${socket.userId}`);
      console.log('User authenticated:', socket.userId);
    } catch (err) {
      socket.emit('error', 'Authentication failed');
    }
  });

  // Handle joining chat rooms
  socket.on('joinChat', async (chatId) => {
    if (!socket.userId) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    try {
      // Verify user is a member of the chat
      const { rows } = await pool.query(`
        SELECT c.chat_type 
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id
        WHERE cm.user_id = $1 AND c.id = $2
      `, [socket.userId, chatId]);
      
      if (rows.length > 0) {
        socket.join(`chat:${chatId}`);
        
        // Mark all unread messages as read
        await pool.query(
          `UPDATE message_status 
           SET is_read = true, read_at = CURRENT_TIMESTAMP 
           WHERE user_id = $1 AND message_id IN (
             SELECT id FROM messages 
             WHERE chat_id = $2
           )`,
          [socket.userId, chatId]
        );

        // Get chat history
        const { rows: messages } = await pool.query(`
          SELECT m.*, u.username as sender_username,
                 (SELECT json_agg(json_build_object('user_id', ms.user_id, 'is_read', ms.is_read, 'read_at', ms.read_at))
                  FROM message_status ms
                  WHERE ms.message_id = m.id) as read_status
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.chat_id = $1
          ORDER BY m.created_at
        `, [chatId]);

        socket.emit('chatHistory', messages);
      }
    } catch (err) {
      console.error('Error joining chat:', err);
      socket.emit('error', 'Failed to join chat');
    }
  });

  // Handle leaving chat rooms
  socket.on('leaveChat', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  // Handle new messages
  socket.on('message', async (data) => {
    if (!socket.userId) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    try {
      const { chatId, content } = data;
      
      // Verify user is a member of the chat
      const { rows } = await pool.query(`
        SELECT 1 
        FROM chat_members cm
        JOIN chats c ON c.id = cm.chat_id
        WHERE cm.user_id = $1 AND cm.chat_id = $2
      `, [socket.userId, chatId]);
      
      if (rows.length === 0) {
        socket.emit('error', 'Not a member of this chat');
        return;
      }

      // Insert message
      const { rows: [message] } = await pool.query(
        'INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
        [chatId, socket.userId, content]
      );

      // Get sender info
      const { rows: [sender] } = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [socket.userId]
      );

      // Get chat members
      const { rows: members } = await pool.query(
        'SELECT user_id FROM chat_members WHERE chat_id = $1',
        [chatId]
      );

      const messageWithSender = {
        ...message,
        sender_username: sender.username
      };

      // Broadcast message to chat room
      io.to(`chat:${chatId}`).emit('message', messageWithSender);

      // Notify all members about the new message
      members.forEach(member => {
        if (member.user_id !== socket.userId) {
          io.to(`user:${member.user_id}`).emit('newMessage', {
            chatId,
            message: messageWithSender
          });
        }
      });

      // Update chat list for all members
      const { rows: [updatedChat] } = await pool.query(`
        SELECT c.id, c.chat_type, c.name as group_name, u.username as recipient_username,
               (SELECT json_build_object(
                 'id', m.id,
                 'content', m.content,
                 'created_at', m.created_at,
                 'sender_username', u2.username
               )
               FROM messages m
               JOIN users u2 ON m.sender_id = u2.id
               WHERE m.chat_id = c.id
               ORDER BY m.created_at DESC
               LIMIT 1) as latest_message
        FROM chats c
        LEFT JOIN chat_members cm ON cm.chat_id = c.id
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE c.id = $1
      `, [chatId]);

      // Emit updated chat to all members
      members.forEach(member => {
        io.to(`user:${member.user_id}`).emit('groupUpdated', {
          ...updatedChat,
          type: 'message'
        });
      });
    } catch (err) {
      console.error('Message error:', err);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});