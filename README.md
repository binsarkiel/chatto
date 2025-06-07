# Chatto - Real-time Chat Application

Chatto is a modern real-time chat application that supports both direct messaging and group chats. Built with Node.js, Express, Socket.IO, and PostgreSQL, it provides a seamless messaging experience with features like message status, user presence, and group management.

## Features

- **Real-time Messaging**
  - Instant message delivery
  - Message read status (✓ for sent, ✓✓ for read)
  - Message timestamps
  - Support for both direct and group messages

- **User Management**
  - User registration and authentication
  - JWT-based secure authentication
  - User presence status

- **Chat Types**
  - Direct Messages: One-on-one private conversations
  - Group Chats: Multi-user conversations with admin controls

- **Group Chat Features**
  - Create and manage group chats
  - Add/remove members
  - Admin role with special privileges
  - Group settings management
  - Admin role transfer

- **UI/UX**
  - Modern and responsive design
  - Real-time updates
  - Message notifications
  - Clean and intuitive interface
  - Message truncation for better readability

## Tech Stack

- **Backend**
  - Node.js
  - Express.js
  - Socket.IO for real-time communication
  - PostgreSQL database
  - JWT for authentication

- **Frontend**
  - Vanilla JavaScript
  - Tailwind CSS for styling
  - Socket.IO client

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Environment Setup

1. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=chatapp
   DB_USER=postgres
   DB_PASSWORD=your_password_here

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h

   # Socket.IO Configuration
   SOCKET_CORS_ORIGIN=http://localhost:3000
   ```

3. Important environment variables to configure:
   - `DB_PASSWORD`: Your PostgreSQL database password
   - `JWT_SECRET`: A secure random string for JWT token generation
   - `SOCKET_CORS_ORIGIN`: Your frontend URL (for production)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/binsarkiel/chatto.git
   cd chatto
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npm run db
   ```

4. Start the server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## Database Schema

The application uses the following database structure:

- **users**: Stores user information
  - id, username, email, password_hash, created_at

- **chats**: Stores chat information
  - id, chat_type (direct/group), name, description, created_by, created_at

- **chat_members**: Manages chat membership
  - id, chat_id, user_id, role (member/admin), joined_at

- **messages**: Stores chat messages
  - id, chat_id, sender_id, content, created_at

- **message_status**: Tracks message read status
  - id, message_id, user_id, is_read, read_at

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Chats
- `GET /api/chats/:userId` - Get user's chats
- `POST /api/chats` - Create new chat
- `GET /api/messages/:chatId` - Get chat messages

### Groups
- `POST /api/groups` - Create new group
- `PUT /api/groups/:groupId` - Update group settings
- `POST /api/groups/:groupId/members` - Add group member
- `DELETE /api/groups/:groupId/members/:userId` - Remove group member
- `POST /api/groups/:groupId/admin/:userId` - Transfer admin role

## Socket Events

### Client to Server
- `joinUser` - Join user's personal room
- `joinChat` - Join chat room
- `leaveChat` - Leave chat room
- `message` - Send new message

### Server to Client
- `message` - New message received
- `chatHistory` - Chat history loaded
- `newMessage` - New message notification
- `groupUpdated` - Group update notification
- `userStatus` - User status update

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Input validation and sanitization
- SQL injection prevention
- XSS protection