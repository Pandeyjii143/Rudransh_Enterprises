const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const helmet = require('helmet');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const { createServer } = require('http');
const { Server } = require('socket.io');

require('dotenv').config();

// Import routes and utilities
const { db, dbAsync } = require('./config/database');
const { SECRET_KEY } = require('./utils/jwt');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken, authorize } = require('./middleware/auth');
const { ROLES } = require('./config/constants');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const sectionRoutes = require('./routes/section.routes');
const orderRoutes = require('./routes/order.routes');
const deliveryController = require('./controllers/delivery.controller');
const paymentRoutes = require('./routes/payment.routes');
const deliveryRoutes = require('./routes/delivery.routes');

const PORT = parseInt(process.env.PORT, 10) || 8001;
const app = express();
const server = createServer(app);

// ============================================
// SECURITY & COMMON MIDDLEWARE
// ============================================
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret: SECRET_KEY || 'default_secret_key_for_sessions',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ============================================
// PASSPORT GOOGLE OAUTH
// ============================================
const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userService = require('./services/database.service').UserService;
          let user = await userService.findByGoogleId(profile.id);
          if (!user) {
            user = await userService.findByEmail(profile.emails[0].value);
            if (!user) {
              user = await userService.createWithGoogle({
                name: profile.displayName,
                email: profile.emails[0].value,
                google_id: profile.id,
                profile_picture: profile.photos[0]?.value || null,
              });
            }
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await require('./services/database.service').UserService.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// ============================================
// SOCKET.IO SETUP
// ============================================
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join-order', (orderId) => socket.join(`order-${orderId}`));
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// ============================================
// FILE UPLOAD SETUP
// ============================================
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

// ============================================
// DATABASE INITIALIZATION
// ============================================
async function initializeDatabaseSchema() {
  const execute = async (sql, params = []) => {
    try {
      await dbAsync.run(sql, params);
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        console.warn('Schema init warning:', error.message);
      }
    }
  };

  await execute(`CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    hashed_password TEXT,
    role_id INTEGER NOT NULL DEFAULT 2,
    phone VARCHAR(20),
    address TEXT,
    google_id VARCHAR(255) UNIQUE,
    profile_picture TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    category VARCHAR(100),
    image TEXT,
    channel VARCHAR(50),
    stock INTEGER DEFAULT 0,
    description TEXT,
    brand VARCHAR(100),
    specifications TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    payment_status VARCHAR(30) DEFAULT 'pending',
    shipping_address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(100) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    payment_provider_id VARCHAR(100),
    payment_method VARCHAR(50),
    status VARCHAR(30) DEFAULT 'pending',
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    tracking_number TEXT UNIQUE,
    carrier TEXT DEFAULT 'Generic Carrier',
    status TEXT DEFAULT 'pending',
    current_location TEXT,
    estimated_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS tracking_updates (
    id SERIAL PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
  )`);
}

// ============================================
// API ROUTES
// ============================================

// Health check endpoint - must respond 200 OK for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/delivery', deliveryRoutes);
app.get('/api/tracking/:orderId', authenticateToken, deliveryController.getTracking);

app.post(
  '/api/upload',
  authenticateToken,
  authorize(ROLES.ADMIN),
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ filename: req.file.filename, url });
  },
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString(),
    },
  });
});

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================
async function startServer() {
  try {
    console.log('Starting backend server...');
    console.log('PORT:', PORT);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

    try {
      await initializeDatabaseSchema();
      console.log('Database schema initialization completed.');
    } catch (error) {
      console.warn('Database schema initialization failed:', error.message);
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log('🏥 Health endpoint available at /health');
      console.log('Ready to accept connections');
    });
  } catch (error) {
    console.error('💥 Backend startup error:', error);
    process.exit(1);
  }
}

startServer();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
