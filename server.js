const express = require('express');
const cors = require("cors");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'beverly-technologies-secret-key-2024';

// In-memory storage
const users = [];
const sessions = [];
const chatHistory = [];

const marketplaceItems = [
  {
    id: '1',
    title: 'AI Content Generator',
    description: 'Advanced AI tool for generating marketing content, blog posts, and social media copy with SEO optimization.',
    price: 49.99,
    category: 'ai-tools',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
    author: 'Beverly Tech',
    rating: 4.8,
    sales: 1240
  },
  {
    id: '2',
    title: 'Neural Network Visualizer',
    description: 'Interactive 3D visualization tool for neural networks. Perfect for education and presentations.',
    price: 29.99,
    category: 'visualization',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400',
    author: 'DevTeam Alpha',
    rating: 4.6,
    sales: 856
  },
  {
    id: '3',
    title: 'Chatbot Framework',
    description: 'Complete chatbot framework with NLP capabilities, multi-language support, and easy integration.',
    price: 79.99,
    category: 'frameworks',
    image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=400',
    author: 'Beverly Tech',
    rating: 4.9,
    sales: 2103
  },
  {
    id: '4',
    title: 'Data Analysis Suite',
    description: 'Comprehensive data analysis tools with AI-powered insights and automated reporting.',
    price: 99.99,
    category: 'analytics',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
    author: 'DataPros',
    rating: 4.7,
    sales: 634
  },
  {
    id: '5',
    title: 'AI Image Enhancer',
    description: 'Professional-grade AI image upscaling and enhancement. Restore old photos or improve quality.',
    price: 39.99,
    category: 'ai-tools',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400',
    author: 'PixelPerfect',
    rating: 4.5,
    sales: 3421
  },
  {
    id: '6',
    title: 'Voice Recognition API',
    description: 'Real-time speech-to-text with 99% accuracy. Supports 50+ languages and accents.',
    price: 59.99,
    category: 'api',
    image: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=400',
    author: 'VoiceAI Labs',
    rating: 4.8,
    sales: 987
  }
];

// Seed initial data
async function seedData() {
  console.log('🌱 Checking for seed data...');
  
  if (users.length === 0) {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    users.push({
      id: uuidv4(),
      email: 'admin@beverlytech.ai',
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    
    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', 10);
    users.push({
      id: uuidv4(),
      email: 'demo@beverlytech.ai',
      username: 'demo',
      password: demoPassword,
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    
    console.log('✅ Seed data created:');
    console.log('   Admin: admin@beverlytech.ai / admin123');
    console.log('   Demo:  demo@beverlytech.ai / demo123');
  }
}

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'null',
      undefined
    ];
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid or expired token.' 
        });
      }
      
      // Verify user still exists
      const user = users.find(u => u.id === decoded.id);
      if (!user) {
        return res.status(403).json({ 
          success: false, 
          message: 'User no longer exists.' 
        });
      }
      
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register attempt:', req.body.email);
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, password, and username' 
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be at least 3 characters' 
      });
    }

    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check existing
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }

    // Hash and create
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      role: users.length === 0 ? 'admin' : 'user', // First user is admin
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(newUser);
    console.log('✅ User registered:', newUser.id, newUser.role);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    user.lastLogin = new Date().toISOString();

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful:', user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user data' });
  }
});

// Chatbot
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required and must be a string' 
      });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message cannot be empty' 
      });
    }

    if (trimmedMessage.length > 500) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message too long (max 500 characters)' 
      });
    }

    console.log('💬 Chat from:', req.user.username, '-', trimmedMessage.substring(0, 50));

    // AI Response logic
    const lowerMsg = trimmedMessage.toLowerCase();
    let response;
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      response = `Hello ${req.user.username}! 👋 Welcome to Beverly Technologies. How can I assist you today?`;
    } else if (lowerMsg.includes('help')) {
      response = 'I can help you with:\n• Navigating the marketplace\n• Finding AI tools\n• Account questions\n• Technical support\n\nWhat do you need help with?';
    } else if (lowerMsg.includes('price') || lowerMsg.includes('cost')) {
      response = 'Our marketplace offers tools ranging from $29.99 to $99.99. We also offer enterprise pricing for bulk purchases. Would you like to see specific products?';
    } else if (lowerMsg.includes('api') || lowerMsg.includes('integration')) {
      response = 'All our products come with comprehensive API documentation and SDKs. You can find integration guides in the product details or visit our API docs section.';
    } else if (lowerMsg.includes('thank')) {
      response = 'You\\re welcome! 😊 Feel free to ask if you need anything else.';
    } else {
      const responses = [
        `That's an interesting question about "${trimmedMessage.substring(0, 30)}...". Let me help you with that.`,
        `I understand you're asking about "${trimmedMessage.substring(0, 30)}...". Here's what I can tell you...`,
        `Great question! Regarding "${trimmedMessage.substring(0, 30)}...", our platform offers several solutions.`,
        `I'd be happy to help with "${trimmedMessage.substring(0, 30)}...". This is something our AI tools handle well.`,
        `Thanks for asking about "${trimmedMessage.substring(0, 30)}...". Let me provide some insights...`
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));

    chatHistory.push({
      id: uuidv4(),
      userId: req.user.id,
      username: req.user.username,
      message: trimmedMessage,
      response,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Chat service temporarily unavailable' 
    });
  }
});

// Marketplace
app.get('/api/marketplace', (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let items = [...marketplaceItems];

    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.author.toLowerCase().includes(searchLower)
      );
    }

    if (sort) {
      switch(sort) {
        case 'price-low':
          items.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          items.sort((a, b) => b.price - a.price);
          break;
        case 'popular':
          items.sort((a, b) => b.sales - a.sales);
          break;
        case 'rating':
          items.sort((a, b) => b.rating - a.rating);
          break;
      }
    }

    res.json({ 
      success: true, 
      items, 
      count: items.length,
      filters: { category, search, sort }
    });
  } catch (error) {
    console.error('❌ Marketplace error:', error);
    res.status(500).json({ success: false, message: 'Failed to load marketplace' });
  }
});

app.get('/api/marketplace/:id', (req, res) => {
  try {
    const item = marketplaceItems.find(i => i.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, item });
  } catch (error) {
    console.error('❌ Get item error:', error);
    res.status(500).json({ success: false, message: 'Failed to load item' });
  }
});

// Admin routes
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stats = {
      totalUsers: users.length,
      totalItems: marketplaceItems.length,
      totalSales: marketplaceItems.reduce((acc, item) => acc + item.sales, 0),
      totalRevenue: marketplaceItems.reduce((acc, item) => acc + (item.price * item.sales), 0),
      recentChats: chatHistory.slice(-20).length,
      adminUser: req.user.username
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    
    res.json({ success: true, users: safeUsers, count: safeUsers.length });
  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

app.get('/api/admin/chats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const recentChats = chatHistory.slice(-50).reverse();
    res.json({ success: true, chats: recentChats, count: recentChats.length });
  } catch (error) {
    console.error('❌ Admin chats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load chats' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
seedData().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     🚀 BEVERLY TECHNOLOGIES SERVER STARTED            ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  📡 API Base:     http://localhost:${PORT}/api            ║`);
    console.log(`║  🔧 Environment:  ${process.env.NODE_ENV || 'development'}                    ║`);
    console.log('║                                                        ║');
    console.log('║  🔐 Default Accounts:                                  ║');
    console.log('║     Admin: admin@beverlytech.ai / admin123            ║');
    console.log('║     Demo:  demo@beverlytech.ai / demo123              ║');
    console.log('║                                                        ║');
    console.log('║  📚 Next Steps:                                        ║');
    console.log('║  1. Open frontend/public/index.html in browser        ║');
    console.log('║  2. Or use Live Server on frontend/public folder      ║');
    console.log('║  3. Click "Get Started" to test authentication        ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
