-- Drop and recreate database
DROP DATABASE IF EXISTS chatapp;
CREATE DATABASE chatapp;
\c chatapp;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chats table (unified for both direct and group chats)
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    chat_type VARCHAR(10) NOT NULL CHECK (chat_type IN ('direct', 'group')),
    name VARCHAR(100),
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- For direct chats, ensure name is NULL
    CONSTRAINT direct_chat_name_null CHECK (
        (chat_type = 'direct' AND name IS NULL) OR
        (chat_type = 'group' AND name IS NOT NULL)
    )
);

-- Create chat_members table
CREATE TABLE chat_members (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create message_status table
CREATE TABLE message_status (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_chats_type ON chats(chat_type);
CREATE INDEX idx_chats_creator ON chats(created_by);
CREATE INDEX idx_chat_members_user ON chat_members(user_id);
CREATE INDEX idx_chat_members_chat ON chat_members(chat_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_message_status_message ON message_status(message_id);
CREATE INDEX idx_message_status_user ON message_status(user_id);

-- Create trigger function for message status
CREATE OR REPLACE FUNCTION create_message_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert message status for all chat members except sender
    INSERT INTO message_status (message_id, user_id, is_read)
    SELECT NEW.id, cm.user_id, FALSE
    FROM chat_members cm
    WHERE cm.chat_id = NEW.chat_id 
    AND cm.user_id != NEW.sender_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message status
CREATE TRIGGER message_status_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION create_message_status();