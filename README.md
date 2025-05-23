# Chatto - Real-time Chat Application

Chatto is a modern real-time chat application built with React, Node.js, and Socket.IO. It supports both personal and group chats with features like real-time messaging, user authentication, and group management.

## Features

- 🔐 **User Authentication**
  - Secure login and registration
  - JWT-based authentication
  - Password encryption

- 💬 **Real-time Messaging**
  - Instant message delivery
  - Message history
  - Read receipts
  - Message timestamps

- 👥 **Group Chat**
  - Create group chats
  - Add/remove members
  - Group management
  - Group messages

- 🎯 **Core Features**
  - Real-time updates
  - Message deduplication
  - Proper chat ordering
  - Responsive UI
  - Modern design

## Technology Stack

### Frontend
- React
- Chakra UI
- Socket.IO Client
- React Router
- Custom Hooks

### Backend
- Node.js
- Express
- MongoDB
- Socket.IO
- JWT Authentication

## Project Structure

```
chatto/
├── frontend/                # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # Service layer
│   │   ├── utils/         # Utility functions
│   │   └── constants/     # Constants and configurations
│   └── package.json
│
└── backend/                # Backend Node.js application
    ├── config/            # Configuration files
    ├── models/            # MongoDB models
    ├── routes/            # API routes
    ├── socket/           # Socket.IO handlers
    │   ├── handlers.js   # Socket event handlers
    │   ├── init.js       # Socket initialization
    │   └── middleware.js # Socket authentication
    └── server.js         # Main server file
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/binsarkiel/chatto.git
cd chatto
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

5. Start the backend server:
```bash
cd backend
npm start
```

6. Start the frontend development server:
```bash
cd frontend
npm run dev
```

## Key Components

### Frontend

#### Socket Service
The `SocketService` class manages all Socket.IO connections and events:
- Connection management
- Event handling
- Message sending/receiving
- Chat room management

#### Custom Hooks
- `useChat`: Manages individual chat state and messages
- `useChatList`: Handles the list of chats and their updates
- Both hooks implement message deduplication and proper state management

### Backend

#### Socket Handlers
- `handleChatMessage`: Processes and broadcasts personal chat messages
- `handleGroupMessage`: Handles group chat messages
- `createChatUpdatePayload`: Creates standardized message payloads with user information

#### Authentication
- JWT-based authentication for both REST API and Socket.IO connections
- Secure middleware for protecting routes and socket connections

## API Documentation

### Authentication Endpoints

```typescript
POST /api/auth/register
Body: {
  email: string,
  password: string,
  fullName: string
}

POST /api/auth/login
Body: {
  email: string,
  password: string
}
```

### Chat Endpoints

```typescript
GET /api/chat
Headers: {
  Authorization: "Bearer ${token}"
}

POST /api/chat/create
Headers: {
  Authorization: "Bearer ${token}"
}
Body: {
  participantId: string
}

POST /api/chat/group/create
Headers: {
  Authorization: "Bearer ${token}"
}
Body: {
  name: string,
  memberIds: string[]
}
```

## Socket Events

### Client Events
```typescript
// Join a chat room
socket.emit('join_chat', chatId);

// Join a group chat room
socket.emit('join_group', groupId);

// Send a message
socket.emit('send_chat_message', { chatId, content });

// Send a group message
socket.emit('send_group_message', { groupId, content });
```

### Server Events
```typescript
// Receive a message
socket.on('receive_message', (data) => {
  // data: { message, chatId/groupId }
});

// Chat updated
socket.on('chat_updated', (data) => {
  // data: { chat information }
});
```

## Best Practices Implemented

1. **Message Deduplication**
   - Unique message tracking using Sets
   - Message ID generation
   - State update verification

2. **Real-time Updates**
   - Efficient socket event handling
   - Proper cleanup on unmount
   - Connection management

3. **State Management**
   - Optimistic updates
   - Proper error handling
   - Loading states

4. **Security**
   - JWT authentication
   - Socket connection validation
   - Input sanitization

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Socket.IO team for the excellent real-time engine
- Chakra UI for the beautiful component library
- MongoDB team for the reliable database
- The open-source community for inspiration and support 