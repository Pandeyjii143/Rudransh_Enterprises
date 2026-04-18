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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT,
    role_id INTEGER NOT NULL DEFAULT 2,
    phone TEXT,
    address TEXT,
    google_id TEXT UNIQUE,
    profile_picture TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    channel TEXT,
    stock INTEGER DEFAULT 0,
    description TEXT,
    brand TEXT,
    specifications TEXT,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migrate section_id to category if needed
  try {
    await dbAsync.run(`ALTER TABLE products ADD COLUMN category TEXT`);
  } catch (error) {
    // Column might already exist
  }

  await execute(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    shipping_address TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  await execute(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    payment_provider_id TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    await dbAsync.run(`INSERT INTO roles (name, description) VALUES (?, ?), (?, ?)` , [
      "admin",
      "Administrator with full access",
      "client",
      "Standard client user",
    ]);
  }

  const adminRole = await dbAsync.get(`SELECT id FROM roles WHERE name = ?`, ["admin"]);
  const adminEmail = "resecurity.siwan@gmail.com";
  const legacyAdminEmail = "SURYA@87098";
  const adminPassword = "Surya@87098";

  const existingAdmin = await dbAsync.get(
    `SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [adminEmail, legacyAdminEmail],
  );

  if (!existingAdmin) {
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    await dbAsync.run(
      `INSERT INTO users (name, email, hashed_password, role_id, phone, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "SURYAMOHAN",
        adminEmail,
        hashedAdminPassword,
        adminRole.id,
        null,
        null,
        1,
      ],
    );
    console.log("Admin user seeded:", adminEmail);
  } else if (existingAdmin.email.toLowerCase() === legacyAdminEmail.toLowerCase()) {
    await dbAsync.run(
      `UPDATE users SET email = ? WHERE id = ?`,
      [adminEmail, existingAdmin.id],
    );
    console.log("Updated legacy admin email to:", adminEmail);
  }

  const sectionsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM sections`);
  if (!sectionsRow || sectionsRow.count === 0) {
    await dbAsync.run(
      `INSERT INTO sections (name, description, display_order) VALUES
        (?, ?, 1),
        (?, ?, 2),
        (?, ?, 3),
        (?, ?, 4),
        (?, ?, 5)`,
      [
        "Cameras",
        "Security cameras and surveillance equipment",
        "Storage",
        "High-capacity storage devices",
        "Laptops",
        "Portable workstations and notebooks",
        "Monitors",
        "Displays for surveillance and workstations",
        "Accessories",
        "Installation accessories and cables",
      ],
    );
  }
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

(async () => {
  try {
    await initializeDatabaseSchema();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (startupError) {
    console.error("Failed to initialize database schema:", startupError);
    process.exit(1);
  }
})();

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
