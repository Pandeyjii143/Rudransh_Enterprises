const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { createServer } = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

// Local imports
const { db, dbAsync } = require("./config/database");
const { SECRET_KEY, REFRESH_SECRET } = require("./utils/jwt");
const { errorHandler, asyncHandler } = require("./middleware/errorHandler");
const { authenticateToken, authorize } = require("./middleware/auth");
const { ROLES } = require("./config/constants");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const sectionRoutes = require("./routes/section.routes");
const orderRoutes = require("./routes/order.routes");
const deliveryController = require("./controllers/delivery.controller");
const { UserService } = require("./services/database.service");

const PORT = process.env.PORT || 8001;
const app = express();
const server = createServer(app);

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Set various HTTP headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: { message: "Too many requests, please try again later" } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: { message: "Too many login attempts, please try again later" },
  },
});

// Don't apply general limiter globally - it blocks OAuth
// app.use(generalLimiter);

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================
// SESSION & AUTHENTICATION
// ============================================

app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport Google Strategy
const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/api/auth/google/callback";

if (!googleClientId || !googleClientSecret) {
  console.error("Google OAuth configuration is missing. Check backend/.env for GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
}
console.log("Loaded Google OAuth client ID:", googleClientId ? `${googleClientId.slice(0, 20)}...` : "<missing>");
console.log("Google OAuth callback URL:", googleCallbackUrl);

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
          console.log('Google profile:', profile);
          let user = await UserService.findByGoogleId(profile.id);
          console.log('Found Google user by google_id:', user);

          if (!user) {
            user = await UserService.findByEmail(profile.emails[0].value);
            console.log('Found existing user by email:', user);

            if (!user) {
              user = await UserService.createWithGoogle({
                name: profile.displayName,
                email: profile.emails[0].value,
                google_id: profile.id,
                profile_picture: profile.photos[0]?.value || null,
              });
              console.log('Created new Google user:', user);
            }
          }

          if (!user || typeof user.id === 'undefined') {
            const err = new Error('No user returned from Google auth flow');
            console.error(err);
            return done(err);
          }

          return done(null, user);
        } catch (error) {
          console.error('Google auth error:', error);
          return done(error);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserService.findById(id);
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
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("User connected for tracking:", socket.id);

  socket.on("join-order", (orderId) => {
    socket.join(`order-${orderId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io accessible to controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ============================================
// FILE UPLOAD SETUP
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

async function initializeDatabaseSchema() {
  const execute = async (sql) => {
    try {
      await dbAsync.run(sql);
    } catch (error) {
      if (!error.message.includes("already exists") && !error.message.includes("duplicate column")) {
        console.error("Database schema initialization warning:", error.message);
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
    category VARCHAR(100) NOT NULL,
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

  // Migrate section_id to category if needed
  try {
    await dbAsync.run(`ALTER TABLE products ADD COLUMN category TEXT`);
  } catch (error) {
    // Column might already exist
  }

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

  await execute(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    tracking_number TEXT UNIQUE,
    carrier TEXT DEFAULT 'Generic Carrier',
    status TEXT DEFAULT 'pending',
    current_location TEXT,
    estimated_delivery DATETIME,
    actual_delivery DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS tracking_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id TEXT NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
  )`);

  const rolesRow = await dbAsync.get(`SELECT COUNT(*) as count FROM roles`);
  if (!rolesRow || rolesRow.count === 0) {
    await dbAsync.run(`INSERT INTO roles (name, description) VALUES ($1, $2)`, [
      "admin",
      "Administrator with full access"
    ]);
    await dbAsync.run(`INSERT INTO roles (name, description) VALUES ($1, $2)`, [
      "client",
      "Standard client user"
    ]);
  }

  const adminRole = await dbAsync.get(`SELECT id FROM roles WHERE name = $1`, ["admin"]);
  const adminEmail = "resecurity.siwan@gmail.com";
  const legacyAdminEmail = "SURYA@87098";
  const adminPassword = "Surya@87098";

  const existingAdmin = await dbAsync.get(
    `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(email) = LOWER($2)`,
    [adminEmail, legacyAdminEmail],
  );

  if (!existingAdmin) {
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    await dbAsync.run(
      `INSERT INTO users (name, email, hashed_password, role_id, phone, address, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "SURYAMOHAN",
        adminEmail,
        hashedAdminPassword,
        adminRole.id,
        null,
        null,
        true,
      ],
    );
    console.log("Admin user seeded:", adminEmail);
  } else if (existingAdmin.email.toLowerCase() === legacyAdminEmail.toLowerCase()) {
    await dbAsync.run(
      `UPDATE users SET email = $1 WHERE id = $2`,
      [adminEmail, existingAdmin.id],
    );
    console.log("Updated legacy admin email to:", adminEmail);
  }

  const sectionsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM sections`);
  if (!sectionsRow || sectionsRow.count === 0) {
    const sections = [
      ["Cameras", "Security cameras and surveillance equipment", 1],
      ["Storage", "High-capacity storage devices", 2],
      ["Laptops", "Portable workstations and notebooks", 3],
      ["Monitors", "Displays for surveillance and workstations", 4],
      ["Accessories", "Installation accessories and cables", 5]
    ];

    for (const [name, description, order] of sections) {
      await dbAsync.run(
        `INSERT INTO sections (name, description, display_order) VALUES ($1, $2, $3)`,
        [name, description, order]
      );
    }
  }
}

// ============================================
// API ROUTES
// ============================================

// Health check with database status
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    await dbAsync.get(`SELECT 1 as test`);
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (dbError) {
    console.error('Health check database error:', dbError.message);
    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      error: dbError.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
});

// Auth routes (NO global rate limiting - applied per-endpoint in routes file)
app.use("/api/auth", authRoutes);

// Product routes
app.use("/api/products", productRoutes);

// Section routes
app.use("/api/sections", sectionRoutes);

// Order routes
app.use("/api/orders", orderRoutes);
app.use("/api/cart", orderRoutes); // Legacy checkout alias for older clients

// Payment routes
const paymentRoutes = require("./routes/payment.routes");
app.use("/api/payment", paymentRoutes);

// Delivery routes
const deliveryRoutes = require("./routes/delivery.routes");
app.use("/api/delivery", deliveryRoutes);

// Tracking route (alias for delivery tracking)
app.get("/api/tracking/:orderId", authenticateToken, deliveryController.getTracking);

app.post(
  "/api/upload",
  authenticateToken,
  authorize(ROLES.ADMIN),
  upload.single("file"),
  (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { message: "No file uploaded" } });
      }

      const url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
      res.json({
        filename: req.file.filename,
        url: url,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      timestamp: new Date().toISOString(),
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    console.log("Starting server initialization...");
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Port: ${PORT}`);
    console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);

    // Try to initialize database schema (don't crash if it fails)
    try {
      await initializeDatabaseSchema();
      console.log("Database schema initialized successfully");
    } catch (dbError) {
      console.warn("Database initialization failed, but continuing:", dbError.message);
      console.warn("Server will start in degraded mode. Database operations may fail until DB is available.");
    }

    // Start the server regardless of database status
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/health`);
      console.log("Server startup complete");
    });
  } catch (startupError) {
    console.error("Critical server startup error:", startupError);
    process.exit(1);
  }
}

startServer();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database connection closed");
      }
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };
