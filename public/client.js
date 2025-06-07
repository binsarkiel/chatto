let currentUser = null;
let currentChat = null;
let socket = null;

// DOM Elements
const landingPage = document.getElementById('landing-page');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const dashboard = document.getElementById('dashboard');
const chatList = document.getElementById('chat-list');
const chatArea = document.getElementById('chat-area');
const chatPlaceholder = document.getElementById('chat-placeholder');
const chatMessages = document.getElementById('chat-messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const userMenuButton = document.getElementById('user-menu-button');
const userDropdown = document.getElementById('user-dropdown');
const userUsername = document.getElementById('user-username');

// Function to show notification
function showNotification(message, type = 'info') {
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());

  const notification = document.createElement('div');
  notification.className = `notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-in-out ${
    type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'
  } text-white`;
  
  // Add icon based on type
  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <span class="notification-icon">${icon}</span>
      <span class="notification-message">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Add entrance animation
  requestAnimationFrame(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  });
  
  // Remove notification after 3 seconds with fade out
  setTimeout(() => {
    notification.style.transform = 'translateY(-100%)';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Function to show error
function showError(message) {
  showNotification(message, 'error');
}

// Function to show success
function showSuccess(message) {
  showNotification(message, 'success');
}

// Initialize socket connection
function initializeSocket(token) {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io({
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('joinUser', { token });
    showSuccess('Connected to chat server');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showError('Connection error. Please try refreshing the page.');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    showError(error);
  });

  // Socket event handlers
  socket.on('newChat', (chat) => {
    console.log('New chat received:', chat);
    if (currentUser) {
      loadChats();
      if (chat.chat_type === 'group') {
        showSuccess(`You have been added to ${chat.group_name}`);
      } else {
        showSuccess('New chat created');
      }
    }
  });

  socket.on('chatHistory', (messages) => {
    console.log('Chat history received:', messages);
    if (!currentChat) return;
    
    chatMessages.innerHTML = '';
    messages.forEach(message => appendMessage(message));
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  });

  // Consolidated message handling
  socket.on('message', (message) => {
    console.log('Received message:', message);
    
    // Check if message already exists in the chat
    const existingMessage = document.querySelector(`[data-message-id="${message.id}"]`);
    if (existingMessage) {
      console.log('Message already exists, skipping:', message.id);
      return;
    }

    if (currentChat && message.chat_id === currentChat.id) {
      appendMessage(message);
    } else {
      showNotification(`New message from ${message.sender_username}`, 'info');
    }

    // Update chat list item with new message
    updateChatListItem(message);
  });

  // New event handler for new messages
  socket.on('newMessage', (data) => {
    console.log('New message notification:', data);
    const { chatId, message } = data;
    updateChatListItem(message);
  });

  socket.on('groupUpdated', (data) => {
    console.log('Group updated:', data);
    
    // Update chat list immediately
    const directMessagesList = document.getElementById('direct-messages-list');
    const groupChatsList = document.getElementById('group-chats-list');
    const existingChat = groupChatsList.querySelector(`[data-chat-id="${data.id}"]`);
    
    if (existingChat) {
      // Update existing chat item
      const chatName = existingChat.querySelector('span:first-child');
      const latestMessage = existingChat.querySelector('span:last-child');
      
      if (data.chat_type === 'group') {
        chatName.textContent = `${data.group_name}`;
        if (data.latest_message) {
          const sender = data.latest_message.sender_username;
          const message = data.latest_message.content;
          latestMessage.textContent = `${sender}: ${message}`;
        }
      }
    } else {
      // If chat doesn't exist in the list, reload all chats
      loadChats();
    }
    
    // Handle notifications with appropriate types
    switch (data.type) {
      case 'memberAdded':
        showSuccess(`New member added to ${data.group_name}`);
        break;
      case 'memberRemoved':
        if (data.userId === currentUser.id) {
          if (currentChat && currentChat.id === data.id) {
            hideChatArea();
          }
          showError(`You have been removed from ${data.group_name}`);
        } else {
          showNotification(`A member has been removed from ${data.group_name}`, 'info');
        }
        break;
      case 'adminTransferred':
        showSuccess(`Admin role has been transferred in ${data.group_name}`);
        break;
      case 'groupUpdated':
        showSuccess(`${data.group_name} has been updated`);
        break;
      case 'removedFromGroup':
        if (currentChat && currentChat.id === data.groupId) {
          hideChatArea();
        }
        showError(`You have been removed from the group`);
        break;
    }
    
    // Update current chat if it's the one being modified
    if (currentChat && currentChat.id === data.id) {
      // For direct messages, preserve the original recipient
      if (currentChat.chat_type === 'direct') {
        const originalRecipient = currentChat.recipient_username;
        Object.assign(currentChat, data);
        currentChat.recipient_username = originalRecipient;
      } else {
        Object.assign(currentChat, data);
      }
      showChatArea(currentChat);
    }
  });

  socket.on('userStatus', (data) => {
    console.log('User status update:', data);
    showNotification(`${data.username} is ${data.status}`, 'info');
  });

  socket.on('typing', (data) => {
    if (currentChat && data.chatId === currentChat.id) {
      const typingIndicator = document.getElementById('typing-indicator');
      if (typingIndicator) {
        typingIndicator.textContent = `${data.username} is typing...`;
        typingIndicator.classList.remove('hidden');
        clearTimeout(typingIndicator.timeout);
        typingIndicator.timeout = setTimeout(() => {
          typingIndicator.classList.add('hidden');
        }, 3000);
      }
    }
  });
}

// Check for existing session on page load
async function checkSession() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const { user } = await response.json();
        currentUser = user;
        userUsername.textContent = user.username;
        landingPage.classList.add('hidden');
        dashboard.classList.remove('hidden');
        initializeSocket(token);
        loadChats();
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Session check error:', error);
      localStorage.removeItem('token');
    }
  }
}

// Run session check on page load
checkSession();

// Event Listeners
document.getElementById('show-signup').addEventListener('click', () => {
  landingPage.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', () => {
  landingPage.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

document.getElementById('back-to-login').addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

document.getElementById('back-to-signup').addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

document.getElementById('signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  console.log('Signup payload:', { username, email, password });
  const response = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  if (response.ok) {
    alert('Signup successful! Please login.');
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  } else {
    const error = await response.text();
    alert(`Signup failed: ${error}`);
  }
});

document.getElementById('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const { user, token } = await response.json();
      currentUser = user;
      userUsername.textContent = user.username;
      localStorage.setItem('token', token);
      loginForm.classList.add('hidden');
      dashboard.classList.remove('hidden');
      initializeSocket(token);
      loadChats();
    } else {
      const error = await response.text();
      showError(error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Login failed. Please try again.');
  }
});

document.getElementById('logout').addEventListener('click', () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentUser = null;
  currentChat = null;
  localStorage.removeItem('token');
  dashboard.classList.add('hidden');
  landingPage.classList.remove('hidden');
  hideChatArea();
});

// Function to show chat area with selected chat
function showChatArea(chat) {
  console.log('Showing chat area for:', chat);
  if (!chat || !currentUser) {
    console.error('Invalid chat or user');
    return;
  }

  if (currentChat) {
    socket.emit('leaveChat', currentChat.id);
  }
  
  currentChat = chat;
  
  // Hide placeholder and show chat area
  chatPlaceholder.classList.add('hidden');
  chatArea.classList.remove('hidden');
  chatMessages.classList.remove('hidden');
  messageForm.classList.remove('hidden');
  
  // Clear previous messages and header
  chatMessages.innerHTML = '';
  const existingHeader = chatArea.querySelector('.chat-header');
  if (existingHeader) {
    existingHeader.remove();
  }
  
  // Create and add chat header
  const chatHeader = document.createElement('div');
  chatHeader.className = 'chat-header p-4 border-b bg-white';
  
  if (chat.chat_type === 'group') {
    chatHeader.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold">${chat.group_name || 'Unnamed Group'}</h2>
          <p class="text-sm text-gray-600">${chat.description || ''}</p>
        </div>
        <div class="flex space-x-2">
          ${chat.members?.find(m => m.id === currentUser.id)?.role === 'admin' ? `
            <button id="group-settings" class="p-2 hover:bg-gray-100 rounded-full" title="Group Settings">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
          ` : ''}
          <button id="add-member" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
            Add Member
          </button>
        </div>
      </div>
      <div class="mt-2 text-sm text-gray-600">
        <div class="flex items-center">
          <span class="font-medium">Members:</span>
          <div class="ml-2 flex flex-wrap gap-1">
            ${chat.members?.map(m => `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${m.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                ${m.username}
                ${m.role === 'admin' ? '<span class="ml-1">👑</span>' : ''}
              </span>
            `).join('') || 'No members'}
          </div>
        </div>
      </div>
    `;
    
    // Add member button handler
    setTimeout(() => {
      const addMemberBtn = document.getElementById('add-member');
      if (addMemberBtn) {
        addMemberBtn.addEventListener('click', async () => {
          const username = prompt('Enter username to add to group:');
          if (username) {
            try {
              const response = await fetch(`/api/groups/${chat.id}/members`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ username })
              });
              
              if (response.ok) {
                const updatedGroup = await response.json();
                Object.assign(chat, updatedGroup);
                loadChats();
                showSuccess('Member added successfully');
              } else {
                const error = await response.text();
                showError(error || 'Failed to add member');
              }
            } catch (error) {
              console.error('Error adding member:', error);
              showError('Failed to add member. Please try again.');
            }
          }
        });
      }

      // Add group settings button handler
      const settingsBtn = document.getElementById('group-settings');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          showGroupSettings(chat.id);
        });
      }
    }, 0);
  } else {
    // For direct messages, ensure we show the other user's username
    const recipientUsername = chat.recipient_username === currentUser.username ? 
      chat.sender_username : chat.recipient_username;
    
    chatHeader.innerHTML = `
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold">${recipientUsername || 'Unknown User'}</h2>
      </div>
    `;
  }
  
  chatArea.insertBefore(chatHeader, chatMessages);
  
  // Join chat room
  socket.emit('joinChat', chat.id);
  
  // Load messages
  loadMessages(chat.id);
}

// Function to hide chat area
function hideChatArea() {
  if (currentChat) {
    socket.emit('leaveChat', currentChat.id);
  }
  currentChat = null;
  
  // Hide chat area and show placeholder
  chatArea.classList.add('hidden');
  chatMessages.classList.add('hidden');
  messageForm.classList.add('hidden');
  chatPlaceholder.classList.remove('hidden');
  
  // Clear messages
  chatMessages.innerHTML = '';
  
  // Remove header if exists
  const existingHeader = chatArea.querySelector('.chat-header');
  if (existingHeader) {
    existingHeader.remove();
  }
}

// Loading state management
function setLoading(element, isLoading) {
  if (!element) return;
  
  if (isLoading) {
    element.classList.add('opacity-50', 'pointer-events-none');
  } else {
    element.classList.remove('opacity-50', 'pointer-events-none');
  }
}

// Function to load chats with loading state
async function loadChats() {
  const chatListElement = document.getElementById('chat-list');
  setLoading(chatListElement, true);
  
  try {
    const response = await fetch(`/api/chats/${currentUser.id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const chats = await response.json();
    renderChatList(chats);
  } catch (error) {
    console.error('Load chats error:', error);
    showError('Failed to load chats. Please try again.');
  } finally {
    setLoading(chatListElement, false);
  }
}

// Function to render chat list
function renderChatList(chats) {
  const directMessagesList = document.getElementById('direct-messages-list');
  const groupChatsList = document.getElementById('group-chats-list');
  const directMessagesCount = document.getElementById('direct-messages-count');
  const groupChatsCount = document.getElementById('group-chats-count');
  
  // Clear both lists
  directMessagesList.innerHTML = '';
  groupChatsList.innerHTML = '';
  
  // Sort chats into direct messages and group chats
  const directMessages = chats.filter(chat => chat.chat_type === 'direct');
  const groupChats = chats.filter(chat => chat.chat_type === 'group');
  
  // Update counts
  directMessagesCount.textContent = directMessages.length;
  groupChatsCount.textContent = groupChats.length;
  
  // Render direct messages
  directMessages.forEach(chat => {
    const li = createChatListItem(chat);
    directMessagesList.appendChild(li);
  });
  
  // Render group chats
  groupChats.forEach(chat => {
    const li = createChatListItem(chat);
    groupChatsList.appendChild(li);
  });
}

// Helper function to create chat list item
function createChatListItem(chat) {
  const li = document.createElement('li');
  li.className = 'p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 border border-gray-100 shadow-sm';
  li.dataset.chatId = chat.id;
  
  const content = document.createElement('div');
  content.className = 'flex items-center justify-between';
  
  const leftContent = document.createElement('div');
  leftContent.className = 'flex items-center space-x-3';
  
  // Add avatar/icon
  const avatar = document.createElement('div');
  avatar.className = 'w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center';
  if (chat.chat_type === 'group') {
    avatar.innerHTML = `
      <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
      </svg>
    `;
  } else {
    avatar.innerHTML = `
      <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
    `;
  }
  
  const textContent = document.createElement('div');
  textContent.className = 'flex flex-col flex-1 min-w-0'; // Added min-w-0 for text truncation
  
  const chatName = document.createElement('span');
  chatName.className = 'font-medium text-gray-800 truncate';
  chatName.textContent = chat.chat_type === 'group' ? `${chat.group_name}` : chat.recipient_username;
  
  const latestMessage = document.createElement('span');
  latestMessage.className = 'text-sm text-gray-500 truncate';
  
  if (chat.latest_message) {
    const time = new Date(chat.latest_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sender = chat.latest_message.sender_username;
    const message = chat.latest_message.content;
    const truncatedMessage = message.length > 8 ? message.substring(0, 8) + '...' : message;
    latestMessage.textContent = `${sender}: ${truncatedMessage}`;
  } else {
    latestMessage.textContent = 'No messages yet';
  }
  
  textContent.appendChild(chatName);
  textContent.appendChild(latestMessage);
  
  leftContent.appendChild(avatar);
  leftContent.appendChild(textContent);
  
  content.appendChild(leftContent);
  li.appendChild(content);
  
  li.addEventListener('click', () => showChatArea(chat));
  return li;
}

// Function to load messages with loading state
async function loadMessages(chatId) {
  if (!chatId) {
    return;
  }

  const chatMessagesElement = document.getElementById('chat-messages');
  if (!chatMessagesElement) {
    console.error('Chat messages element not found');
    return;
  }

  setLoading(chatMessagesElement, true);
  
  try {
    const response = await fetch(`/api/messages/${chatId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const messages = await response.json();
    chatMessagesElement.innerHTML = '';
    messages.forEach(message => appendMessage(message));
    
    // Scroll to bottom after messages are loaded
    requestAnimationFrame(() => {
      chatMessagesElement.scrollTo({
        top: chatMessagesElement.scrollHeight,
        behavior: 'smooth'
      });
    });
  } catch (error) {
    console.error('Load messages error:', error);
    showError('Failed to load messages. Please try again.');
  } finally {
    setLoading(chatMessagesElement, false);
  }
}

// Function to create a new chat
async function createNewChat(username) {
  try {
    const response = await fetch('/api/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        userId: currentUser.id,
        recipient: username 
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create chat');
    }

    const chat = await response.json();
    showNotification('Chat created successfully');
    loadChats(); // Refresh chat list
    return chat;
  } catch (error) {
    console.error('Error creating chat:', error);
    showError(error.message);
    throw error;
  }
}

// Function to show new chat modal
function showNewChatModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 class="text-lg font-semibold mb-4">Start New Chat</h3>
      <form id="new-chat-form" class="space-y-4">
        <div>
          <input type="text" id="new-chat-username" placeholder="Enter username" class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        <div class="flex space-x-2">
          <button type="submit" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">Start Chat</button>
          <button type="button" onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Add form submit handler
  const form = modal.querySelector('#new-chat-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = form.querySelector('#new-chat-username');
    const username = usernameInput.value.trim();
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (!username) {
      showError('Please enter a username');
      return;
    }

    try {
      // Disable form while processing
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating...
      `;

      const chat = await createNewChat(username);
      if (chat) {
        showChatArea(chat);
        modal.remove();
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      showError(error.message);
    } finally {
      // Re-enable form
      submitButton.disabled = false;
      submitButton.textContent = 'Start Chat';
    }
  });
}

// Update new chat button handler
document.getElementById('new-chat').addEventListener('click', () => {
  showNewChatModal();
});

// Function to show new group modal
function showNewGroupModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 class="text-lg font-semibold mb-4">Create New Group</h3>
      <form id="new-group-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
          <input type="text" id="new-group-name" placeholder="Enter group name" class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea id="new-group-description" placeholder="Enter group description" class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
        </div>
        <div class="flex space-x-2">
          <button type="submit" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">Create Group</button>
          <button type="button" onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Add form submit handler
  const form = modal.querySelector('#new-group-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = form.querySelector('#new-group-name');
    const descriptionInput = form.querySelector('#new-group-description');
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (!nameInput.value.trim()) {
      showError('Please enter a group name');
      return;
    }

    try {
      // Disable form while processing
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating...
      `;

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser.id,
          groupName: nameInput.value.trim(),
          description: descriptionInput.value.trim()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create group');
      }

      const chat = await response.json();
      showNotification('Group created successfully');
      loadChats();
      showChatArea(chat);
      modal.remove();
    } catch (error) {
      console.error('Error creating group:', error);
      showError(error.message);
    } finally {
      // Re-enable form
      submitButton.disabled = false;
      submitButton.textContent = 'Create Group';
    }
  });
}

// Update new group button handler
document.getElementById('new-group').addEventListener('click', () => {
  showNewGroupModal();
});

// Function to show group settings modal
function showGroupSettings(groupId) {
  const group = currentChat;
  if (!group || group.id !== groupId) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 class="text-lg font-semibold mb-4">Group Settings</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
          <input type="text" id="group-name" value="${group.group_name}" class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea id="group-description" class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3">${group.description || ''}</textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Members</label>
          <div class="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
            ${group.members.map(member => `
              <div class="flex items-center justify-between py-1">
                <span class="flex items-center">
                  ${member.username}
                  ${member.role === 'admin' ? '<span class="ml-2 text-xs text-blue-500">(Admin)</span>' : ''}
                </span>
                ${member.id !== currentUser.id ? `
                  <div class="space-x-2">
                    ${group.members.find(m => m.id === currentUser.id)?.role === 'admin' ? `
                      ${member.role !== 'admin' ? `                        <button onclick="transferAdmin('${groupId}', '${member.id}')" class="text-blue-500 hover:text-blue-700 text-sm">Make Admin</button>
                      ` : ''}
                      <button onclick="removeMember('${groupId}', '${member.id}')" class="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="flex space-x-2">
          <button onclick="updateGroupSettings('${groupId}')" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">Save Changes</button>
          <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Function to update group settings
async function updateGroupSettings(groupId) {
  const nameInput = document.getElementById('group-name');
  const descriptionInput = document.getElementById('group-description');
  
  try {
    const response = await fetch(`/api/groups/${groupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to update group');
    }

    const updatedGroup = await response.json();
    Object.assign(currentChat, updatedGroup);
    loadChats();
    showNotification('Group updated successfully');
    document.querySelector('.fixed').remove();
  } catch (error) {
    console.error('Error updating group:', error);
    showError(error.message);
  }
}

// Function to transfer admin role
async function transferAdmin(groupId, userId) {
  if (!confirm('Are you sure you want to transfer admin role to this member?')) return;

  try {
    const response = await fetch(`/api/groups/${groupId}/admin/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to transfer admin role');
    }

    const updatedGroup = await response.json();
    Object.assign(currentChat, updatedGroup);
    loadChats();
    showNotification('Admin role transferred successfully');
    document.querySelector('.fixed').remove();
  } catch (error) {
    console.error('Error transferring admin role:', error);
    showError(error.message);
  }
}

// Function to remove member
async function removeMember(groupId, userId) {
  if (!confirm('Are you sure you want to remove this member?')) return;

  try {
    const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to remove member');
    }

    const updatedGroup = await response.json();
    Object.assign(currentChat, updatedGroup);
    loadChats();
    showNotification('Member removed successfully');
    document.querySelector('.fixed').remove();
  } catch (error) {
    console.error('Error removing member:', error);
    showError(error.message);
  }
}

// Modify message form submission with loading state
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentChat || !messageInput.value.trim()) return;

  const content = messageInput.value.trim();
  messageInput.value = '';

  try {
    // Disable input while sending
    messageInput.disabled = true;
    
    // Emit message event
    socket.emit('message', {
      chatId: currentChat.id,
      content
    });
  } catch (error) {
    console.error('Send message error:', error);
    showError('Failed to send message. Please try again.');
  } finally {
    // Re-enable input
    messageInput.disabled = false;
    messageInput.focus();
  }
});

// Function to append message to chat
function appendMessage(message) {
  if (!message || !message.id) {
    console.error('Invalid message:', message);
    return;
  }

  // Check if message already exists
  const existingMessage = document.querySelector(`[data-message-id="${message.id}"]`);
  if (existingMessage) {
    console.log('Message already exists, skipping:', message.id);
    return;
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.sender_id === currentUser?.id ? 'sent' : 'received'} p-3 mb-2 max-w-[70%]`;
  messageDiv.dataset.messageId = message.id;
  
  const time = new Date(message.created_at).toLocaleTimeString();
  const readStatus = message.read_status?.find(s => s.user_id === currentUser?.id)?.is_read;
  
  messageDiv.innerHTML = `
    <div class="message-content bg-white rounded-lg p-3 shadow">
      <div class="sender text-sm font-semibold text-gray-700">${message.sender_username || 'Unknown User'}</div>
      <div class="content break-words text-gray-800">${message.content || ''}</div>
      <div class="flex justify-between items-center mt-1">
        <span class="time text-xs text-gray-500">${time}</span>
        ${message.sender_id === currentUser?.id ? 
          `<span class="read-status text-xs text-gray-500">${readStatus ? '✓✓' : '✓'}</span>` : 
          ''}
      </div>
    </div>
  `;
  
  if (message.sender_id === currentUser?.id) {
    messageDiv.classList.add('ml-auto');
  } else {
    messageDiv.classList.add('mr-auto');
  }
  
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom with smooth behavior
  requestAnimationFrame(() => {
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  });
}

// Group management functions
async function removeGroupMember(groupId, userId) {
  try {
    setLoading(true);
    const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const updatedGroup = await response.json();
    updateGroupInList(updatedGroup);
    showNotification('Member removed successfully');
  } catch (err) {
    console.error('Error removing member:', err);
    showNotification(err.message || 'Failed to remove member', 'error');
  } finally {
    setLoading(false);
  }
}

async function transferGroupAdmin(groupId, userId) {
  try {
    setLoading(true);
    const response = await fetch(`/api/groups/${groupId}/admin/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const updatedGroup = await response.json();
    updateGroupInList(updatedGroup);
    showNotification('Admin role transferred successfully');
  } catch (error) {
    console.error('Error transferring admin:', error);
    showNotification(error.message || 'Failed to transfer admin role', 'error');
  } finally {
    setLoading(false);
  }
}

function updateGroupInList(group) {
  const chatList = document.getElementById('chat-list');
  const existingChat = chatList.querySelector(`[data-chat-id="${group.id}"]`);
  
  if (existingChat) {
    existingChat.querySelector('.chat-name').textContent = group.group_name;
    existingChat.querySelector('.chat-description').textContent = group.description || '';
  }
}

function showGroupChat(group) {
  const chatHeader = document.getElementById('chatHeader');
  chatHeader.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">${group.group_name}</h2>
        <p class="text-sm text-gray-500">${group.description || ''}</p>
      </div>
      <div class="flex space-x-2">
        ${group.members.find(m => m.id === currentUser.id)?.role === 'admin' ? `
          <button onclick="showGroupSettings('${group.id}')" class="p-2 hover:bg-gray-100 rounded-full">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Function to toggle user dropdown
function toggleUserDropdown() {
  userDropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
    userDropdown.classList.add('hidden');
  }
});

// Add click handler for user menu button
userMenuButton.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleUserDropdown();
});

// Add new function to update chat list item
function updateChatListItem(message) {
  const directMessagesList = document.getElementById('direct-messages-list');
  const groupChatsList = document.getElementById('group-chats-list');
  
  if (!directMessagesList || !groupChatsList) {
    console.log('Chat lists not initialized yet, skipping update');
    return;
  }
  
  // Try to find the chat in both lists
  const existingChat = directMessagesList.querySelector(`[data-chat-id="${message.chat_id}"]`) || 
                      groupChatsList.querySelector(`[data-chat-id="${message.chat_id}"]`);
  
  if (existingChat) {
    const latestMessage = existingChat.querySelector('span:last-child');
    if (latestMessage) {
      latestMessage.textContent = `${message.sender_username}: ${message.content}`;
    }
  } else {
    // If chat doesn't exist in the list, reload all chats
    loadChats();
  }
}
