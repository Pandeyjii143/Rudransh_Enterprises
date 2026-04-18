const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY || "sk_test_your_stripe_secret_key_here",
);
const { createServer } = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");

require("dotenv").config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 8000;
const SECRET_KEY =
  process.env.SECRET_KEY ||
  "a2a295d455b84ed99b0c8ee8fc5a1d0654d44570ab104cca8b992eea1c3b3a1e";

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session configuration for Google OAuth
app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "your_google_client_id",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || "your_google_client_secret",
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        db.get(
          "SELECT * FROM users WHERE google_id = ? OR email = ?",
          [profile.id, profile.emails[0].value],
          (err, user) => {
            if (err) return done(err);

            if (user) {
              // Update Google ID if not set
              if (!user.google_id) {
                db.run(
                  "UPDATE users SET google_id = ?, profile_picture = ? WHERE id = ?",
                  [profile.id, profile.photos[0].value, user.id],
                );
              }
              return done(null, user);
            } else {
              // Create new user
              const newUser = {
                name: profile.displayName,
                email: profile.emails[0].value,
                google_id: profile.id,
                profile_picture: profile.photos[0].value,
                role_id: 2, // Default to client role
                is_active: 1,
              };

              db.run(
                `INSERT INTO users (name, email, google_id, profile_picture, role_id, is_active)
                  VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  newUser.name,
                  newUser.email,
                  newUser.google_id,
                  newUser.profile_picture,
                  newUser.role_id,
                  newUser.is_active,
                ],
                function (err) {
                  if (err) return done(err);
                  newUser.id = this.lastID;
                  return done(null, newUser);
                },
              );
            }
          },
        );
      } catch (error) {
        return done(error);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get(
    "SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?",
    [id],
    (err, user) => {
      if (err) return done(err);
      done(null, user);
    },
  );
});

// Database setup
const db = new sqlite3.Database("./app.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Roles table
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Users table with role reference
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      hashed_password TEXT,
      role_id INTEGER DEFAULT 2,
      phone TEXT,
      address TEXT,
      google_id TEXT UNIQUE,
      profile_picture TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles (id)
    )`);

    // Sections/Categories table
    db.run(`CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    // Insert default roles
    db.run(`INSERT OR IGNORE INTO roles (id, name, description) VALUES
      (1, 'admin', 'Administrator with full access'),
      (2, 'client', 'Regular client user')`);

    // Insert default sections
    db.run(`INSERT OR IGNORE INTO sections (id, name, description, display_order) VALUES
      (1, 'Cameras', 'Security cameras and surveillance equipment', 1),
      (2, 'Storage', 'Storage devices and solutions', 2),
      (3, 'Laptops', 'Laptop computers and accessories', 3),
      (4, 'Monitors', 'Computer monitors and displays', 4),
      (5, 'NVR', 'Network Video Recorders', 5),
      (6, 'DVR', 'Digital Video Recorders', 6),
      (7, 'Accessories', 'Camera and computer accessories', 7)`);

    // Products table with section reference
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      section_id INTEGER,
      image TEXT,
      channel TEXT,
      stock INTEGER DEFAULT 0,
      description TEXT,
      brand TEXT,
      specifications TEXT,
      is_featured BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES sections (id)
    )`);

    // Migrate existing products to use sections
    db.run(`UPDATE products SET section_id = (
      CASE
        WHEN category = 'Camera' THEN 1
        WHEN category = 'Storage' THEN 2
        WHEN category = 'Laptop' THEN 3
        WHEN category = 'Monitor' THEN 4
        WHEN category = 'NVR' THEN 5
        WHEN category = 'DVR' THEN 6
        ELSE 7
      END
    ) WHERE section_id IS NULL`);

    // Add missing columns if they don't exist
    db.run(
      `ALTER TABLE products ADD COLUMN section_id INTEGER REFERENCES sections(id)`,
      (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("Error adding section_id column:", err);
        }
      },
    );
    db.run(`ALTER TABLE products ADD COLUMN specifications TEXT`, (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Error adding specifications column:", err);
      }
    });
    db.run(
      `ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT 0`,
      (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("Error adding is_featured column:", err);
        }
      },
    );
    db.run(
      `ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT 1`,
      (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("Error adding is_active column:", err);
        }
      },
    );

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'pending',
      shipping_address TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // Payments table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'inr',
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      stripe_payment_intent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )`);

    // Deliveries table
    db.run(`CREATE TABLE IF NOT EXISTS deliveries (
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
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )`);

    // Tracking updates table
    db.run(`CREATE TABLE IF NOT EXISTS tracking_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id TEXT NOT NULL,
      status TEXT NOT NULL,
      location TEXT,
      description TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delivery_id) REFERENCES deliveries (id)
    )`);

    // Seed initial products if table has fewer than 50 products
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
      if (err) {
        console.error("Error checking product count:", err);
      } else if (row.count < 50) {
        console.log(`Found ${row.count} products, seeding more...`);
        seedProducts();
      } else {
        console.log(`Found ${row.count} products, skipping seed`);
      }
    });
  });
}

// Seed initial products (50-100 products)
function seedProducts() {
  const products = [
    // Cameras (20 products)
    {
      name: "2MP IP Camera",
      price: 1999,
      category: "Camera",
      image:
        "https://th.bing.com/th/id/OIP.u7aWijv_oO82RBYWt3lHrwHaHa?w=199&h=199&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      stock: 10,
      description: "High resolution IP camera for surveillance",
      brand: "Hikvision",
    },
    {
      name: "4MP IP Camera",
      price: 2999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64",
      stock: 15,
      description: "4MP resolution with night vision",
      brand: "Dahua",
    },
    {
      name: "8MP PTZ Camera",
      price: 8999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
      stock: 8,
      description: "Pan-tilt-zoom camera with 360° view",
      brand: "Samsung",
    },
    {
      name: "Bullet IP Camera",
      price: 2499,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1582139329536-e7284fece509",
      stock: 12,
      description: "Weatherproof bullet camera",
      brand: "CP Plus",
    },
    {
      name: "Dome IP Camera",
      price: 2199,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0",
      stock: 14,
      description: "Vandal-proof dome camera",
      brand: "Godrej",
    },
    {
      name: "Thermal Camera",
      price: 15999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
      stock: 5,
      description: "Thermal imaging camera for temperature detection",
      brand: "FLIR",
    },
    {
      name: "Wireless IP Camera",
      price: 3499,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0",
      stock: 9,
      description: "WiFi enabled camera with mobile app",
      brand: "TP-Link",
    },
    {
      name: "360° Camera",
      price: 4999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1582139329536-e7284fece509",
      stock: 6,
      description: "Full 360-degree surveillance camera",
      brand: "Reolink",
    },
    {
      name: "AI Camera",
      price: 6999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
      stock: 7,
      description: "AI-powered camera with facial recognition",
      brand: "Arlo",
    },
    {
      name: "Mini Camera",
      price: 1299,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64",
      stock: 20,
      description: "Compact mini camera for discreet surveillance",
      brand: "Wyze",
    },
    {
      name: "Outdoor Camera",
      price: 3999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1582139329536-e7284fece509",
      stock: 11,
      description: "Rugged outdoor camera with IR night vision",
      brand: "Ring",
    },
    {
      name: "Smart Camera",
      price: 5999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0",
      stock: 8,
      description: "Smart camera with motion detection",
      brand: "Nest",
    },
    {
      name: "4K Camera",
      price: 7999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
      stock: 4,
      description: "Ultra HD 4K resolution camera",
      brand: "Sony",
    },
    {
      name: "Solar Camera",
      price: 8999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1582139329536-e7284fece509",
      stock: 3,
      description: "Solar-powered wireless camera",
      brand: "Eufy",
    },
    {
      name: "Body Camera",
      price: 2999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64",
      stock: 10,
      description: "Wearable body camera for security personnel",
      brand: "Axon",
    },
    {
      name: "Drone Camera",
      price: 11999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0",
      stock: 2,
      description: "Drone-mounted camera system",
      brand: "DJI",
    },
    {
      name: "Underwater Camera",
      price: 6999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
      stock: 5,
      description: "Submersible underwater surveillance camera",
      brand: "GoPro",
    },
    {
      name: "License Plate Camera",
      price: 4999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1582139329536-e7284fece509",
      stock: 7,
      description: "ANPR camera for license plate recognition",
      brand: "Axis",
    },
    {
      name: "Speed Camera",
      price: 14999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64",
      stock: 3,
      description: "Traffic speed monitoring camera",
      brand: "Jenoptik",
    },
    {
      name: "Multi-sensor Camera",
      price: 9999,
      category: "Camera",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0",
      stock: 4,
      description: "Multi-sensor camera with radar integration",
      brand: "Bosch",
    },

    // Storage (15 products)
    {
      name: "1TB Surveillance HDD",
      price: 3499,
      category: "Storage",
      image:
        "https://th.bing.com/th/id/OIP.5kQy_i8mffnHUXwgh8dsfQHaHa?w=179&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      stock: 5,
      description: "1TB hard drive optimized for surveillance",
      brand: "Western Digital",
    },
    {
      name: "2TB Surveillance HDD",
      price: 5499,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 8,
      description: "2TB high-capacity surveillance storage",
      brand: "Seagate",
    },
    {
      name: "4TB Surveillance HDD",
      price: 8999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 6,
      description: "4TB enterprise-grade surveillance HDD",
      brand: "Toshiba",
    },
    {
      name: "8TB Surveillance HDD",
      price: 15999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 4,
      description: "8TB massive storage for long-term recording",
      brand: "HGST",
    },
    {
      name: "SSD 500GB",
      price: 6999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 10,
      description: "500GB SSD for fast data access",
      brand: "Samsung",
    },
    {
      name: "SSD 1TB",
      price: 11999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 7,
      description: "1TB high-speed SSD storage",
      brand: "Crucial",
    },
    {
      name: "NVMe SSD 1TB",
      price: 14999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 5,
      description: "NVMe SSD for ultra-fast performance",
      brand: "WD Black",
    },
    {
      name: "External HDD 2TB",
      price: 7999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 9,
      description: "Portable external hard drive",
      brand: "Seagate",
    },
    {
      name: "NAS 4-Bay",
      price: 24999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 3,
      description: "4-bay network attached storage",
      brand: "QNAP",
    },
    {
      name: "DAS 8-Bay",
      price: 39999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 2,
      description: "8-bay direct attached storage",
      brand: "Synology",
    },
    {
      name: "Cloud Storage Gateway",
      price: 19999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 4,
      description: "Cloud storage gateway appliance",
      brand: "NetApp",
    },
    {
      name: "Tape Library",
      price: 89999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 1,
      description: "Enterprise tape library system",
      brand: "IBM",
    },
    {
      name: "SAN Storage",
      price: 149999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 1,
      description: "Storage area network solution",
      brand: "Dell EMC",
    },
    {
      name: "Object Storage",
      price: 79999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 2,
      description: "Object storage system",
      brand: "MinIO",
    },
    {
      name: "Flash Storage Array",
      price: 299999,
      category: "Storage",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704",
      stock: 1,
      description: "All-flash storage array",
      brand: "Pure Storage",
    },

    // Laptops (10 products)
    {
      name: "Dell Latitude Laptop",
      price: 18000,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
      stock: 3,
      description: "Business laptop for professional use",
      brand: "Dell",
    },
    {
      name: "HP EliteBook",
      price: 25000,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
      stock: 5,
      description: "Premium business laptop",
      brand: "HP",
    },
    {
      name: "Lenovo ThinkPad",
      price: 22000,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
      stock: 4,
      description: "Reliable business laptop",
      brand: "Lenovo",
    },
    {
      name: 'MacBook Pro 14"',
      price: 199900,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
      stock: 2,
      description: "Professional MacBook Pro",
      brand: "Apple",
    },
    {
      name: "ASUS ROG Gaming Laptop",
      price: 89999,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
      stock: 3,
      description: "High-performance gaming laptop",
      brand: "ASUS",
    },
    {
      name: "Acer Predator",
      price: 79999,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
      stock: 4,
      description: "Gaming laptop with RGB lighting",
      brand: "Acer",
    },
    {
      name: "MSI Creator",
      price: 119999,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
      stock: 2,
      description: "Content creation laptop",
      brand: "MSI",
    },
    {
      name: "Surface Laptop",
      price: 89999,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
      stock: 3,
      description: "2-in-1 laptop tablet hybrid",
      brand: "Microsoft",
    },
    {
      name: "Chromebook",
      price: 29999,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
      stock: 6,
      description: "Cloud-based laptop",
      brand: "Google",
    },
    {
      name: "Razer Blade",
      price: 149999,
      category: "Laptop",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
      stock: 1,
      description: "Ultra-thin gaming laptop",
      brand: "Razer",
    },

    // Monitors (10 products)
    {
      name: "24 Inch Monitor",
      price: 7999,
      category: "Monitor",
      image:
        "https://th.bing.com/th/id/OIP.98zpxHGY_0RoJNnKp98JFAHaFq?w=236&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      stock: 7,
      description: "Full HD 24-inch monitor",
      brand: "Dell",
    },
    {
      name: "27 Inch 4K Monitor",
      price: 24999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 4,
      description: "4K UHD monitor for professionals",
      brand: "LG",
    },
    {
      name: "32 Inch Curved Monitor",
      price: 34999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 3,
      description: "Ultra-wide curved gaming monitor",
      brand: "Samsung",
    },
    {
      name: "Gaming Monitor 144Hz",
      price: 19999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 5,
      description: "144Hz gaming monitor",
      brand: "ASUS",
    },
    {
      name: "Touch Screen Monitor",
      price: 29999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 2,
      description: "Interactive touch screen monitor",
      brand: "HP",
    },
    {
      name: "Medical Monitor",
      price: 89999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 1,
      description: "Medical-grade diagnostic monitor",
      brand: "Barco",
    },
    {
      name: "Broadcast Monitor",
      price: 149999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 1,
      description: "Professional broadcast monitor",
      brand: "Sony",
    },
    {
      name: "Portable Monitor",
      price: 14999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 6,
      description: "USB-powered portable monitor",
      brand: "AOC",
    },
    {
      name: "Ultra-wide Monitor",
      price: 39999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 3,
      description: "34-inch ultra-wide monitor",
      brand: "Philips",
    },
    {
      name: "HDR Monitor",
      price: 49999,
      category: "Monitor",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
      stock: 2,
      description: "High dynamic range monitor",
      brand: "BenQ",
    },

    // NVR/DVR (15 products)
    {
      name: "NVR",
      price: 5999,
      category: "NVR",
      channel: "8 Channel",
      image:
        "https://th.bing.com/th/id/OIP.2MaEv8uZWonhlQw1LM_uDQHaC_?w=307&h=141&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      stock: 2,
      description: "8-channel network video recorder",
      brand: "Hikvision",
    },
    {
      name: "16 Channel NVR",
      price: 12999,
      category: "NVR",
      channel: "16 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 3,
      description: "16-channel NVR with PoE",
      brand: "Dahua",
    },
    {
      name: "32 Channel NVR",
      price: 24999,
      category: "NVR",
      channel: "32 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 2,
      description: "32-channel enterprise NVR",
      brand: "Uniview",
    },
    {
      name: "64 Channel NVR",
      price: 49999,
      category: "NVR",
      channel: "64 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 1,
      description: "64-channel high-capacity NVR",
      brand: "Milestone",
    },
    {
      name: "DVR",
      price: 7999,
      category: "DVR",
      image:
        "https://th.bing.com/th/id/OIP.lAX14LaguyoMHMwAE7P5GQHaHa?w=166&h=180&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
      stock: 4,
      description: "8-channel digital video recorder",
      brand: "CP Plus",
    },
    {
      name: "16 Channel DVR",
      price: 14999,
      category: "DVR",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 3,
      description: "16-channel DVR system",
      brand: "Godrej",
    },
    {
      name: "Hybrid NVR/DVR",
      price: 18999,
      category: "NVR",
      channel: "16 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 2,
      description: "Hybrid recorder supporting IP and analog",
      brand: "Honeywell",
    },
    {
      name: "4K NVR",
      price: 34999,
      category: "NVR",
      channel: "16 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 1,
      description: "4K ultra HD network recorder",
      brand: "Axis",
    },
    {
      name: "Edge NVR",
      price: 29999,
      category: "NVR",
      channel: "32 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 2,
      description: "Edge computing NVR with AI",
      brand: "Bosch",
    },
    {
      name: "Cloud NVR",
      price: 39999,
      category: "NVR",
      channel: "64 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 1,
      description: "Cloud-based network recorder",
      brand: "Avigilon",
    },
    {
      name: "Mobile DVR",
      price: 24999,
      category: "DVR",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 3,
      description: "Mobile DVR for vehicle surveillance",
      brand: "Watchnet",
    },
    {
      name: "Railway DVR",
      price: 89999,
      category: "DVR",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 1,
      description: "Rugged DVR for railway applications",
      brand: "IndigoVision",
    },
    {
      name: "Thermal DVR",
      price: 69999,
      category: "DVR",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 1,
      description: "Thermal imaging DVR system",
      brand: "FLIR",
    },
    {
      name: "AI DVR",
      price: 44999,
      category: "DVR",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 2,
      description: "AI-powered digital video recorder",
      brand: "Hanwha",
    },
    {
      name: "Enterprise NVR",
      price: 199999,
      category: "NVR",
      channel: "128 Channel",
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca25d3",
      stock: 1,
      description: "Enterprise-grade NVR system",
      brand: "Pelco",
    },

    // Accessories (10 products)
    {
      name: "PoE Switch 8-Port",
      price: 4999,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 8,
      description: "8-port Power over Ethernet switch",
      brand: "TP-Link",
    },
    {
      name: "PoE Switch 24-Port",
      price: 14999,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 4,
      description: "24-port managed PoE switch",
      brand: "Cisco",
    },
    {
      name: "Network Cable Cat6",
      price: 299,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 50,
      description: "Cat6 Ethernet cable per meter",
      brand: "Generic",
    },
    {
      name: "Fiber Optic Cable",
      price: 999,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 30,
      description: "Single mode fiber optic cable",
      brand: "Corning",
    },
    {
      name: "Camera Mount",
      price: 499,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 25,
      description: "Adjustable camera mounting bracket",
      brand: "Generic",
    },
    {
      name: "Power Supply 12V",
      price: 799,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 40,
      description: "12V DC power adapter",
      brand: "Mean Well",
    },
    {
      name: "Video Balun",
      price: 199,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 60,
      description: "Video signal converter",
      brand: "Generic",
    },
    {
      name: "BNC Connector",
      price: 49,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 100,
      description: "BNC video connector",
      brand: "Generic",
    },
    {
      name: "Surge Protector",
      price: 1499,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 15,
      description: "Surge protection device",
      brand: "APC",
    },
    {
      name: "UPS Battery Backup",
      price: 7999,
      category: "Accessories",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      stock: 6,
      description: "Uninterruptible power supply",
      brand: "APC",
    },
  ];

  const stmt = db.prepare(
    `INSERT INTO products (name, price, category, image, channel, stock, description, brand) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  let insertedCount = 0;
  products.forEach((product) => {
    stmt.run(
      product.name,
      product.price,
      product.category,
      product.image,
      product.channel || null,
      product.stock,
      product.description,
      product.brand,
      function (err) {
        if (err) {
          console.error("Error inserting product:", product.name, err);
        } else {
          insertedCount++;
        }
      },
    );
  });
  stmt.finalize(() => {
    console.log(`Seeded ${insertedCount} products successfully`);
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ detail: "Access token required" });
  }

  jwt.verify(token, SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(403).json({ detail: "Invalid or expired token" });
    }

    req.user = {
      userId: payload.userId,
      email: payload.sub,
      role: payload.role,
    };
    next();
  });
}

function authorizeRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ detail: "Admin access required" });
    }
    next();
  };
}

function getSafeUserInfo(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile_picture: user.profile_picture,
    phone: user.phone,
    address: user.address,
  };
}

// Socket.IO connection for real-time tracking
io.on("connection", (socket) => {
  console.log("User connected for tracking:", socket.id);

  socket.on("join-tracking", (orderId) => {
    socket.join(`order-${orderId}`);
    console.log(`User joined tracking for order ${orderId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from tracking:", socket.id);
  });
});

// Routes

// Google OAuth routes
app.get(
  "/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const userRole = req.user.role_name || "client";
    const token = jwt.sign(
      { sub: req.user.email, userId: req.user.id, role: userRole },
      SECRET_KEY,
      { expiresIn: "24h" },
    );

    // Redirect to frontend with token
    res.redirect(
      `http://localhost:3000/auth/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify({
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: userRole,
          profile_picture: req.user.profile_picture,
        }),
      )}`,
    );
  },
);

// Auth routes
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role = "client", phone, address } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ detail: "Name, email, and password are required" });
  }

  // Get role ID
  db.get("SELECT id FROM roles WHERE name = ?", [role], (err, roleRow) => {
    if (err) {
      return res.status(500).json({ detail: "Database error" });
    }
    if (!roleRow) {
      return res.status(400).json({ detail: "Invalid role" });
    }

    // Check if user exists
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (row) {
        return res.status(400).json({ detail: "Email already registered" });
      }

      // Hash password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ detail: "Error hashing password" });
        }

        // Insert user
        db.run(
          "INSERT INTO users (name, email, hashed_password, role_id, phone, address, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, roleRow.id, phone, address, 1],
          function (err) {
            if (err) {
              return res.status(500).json({ detail: "Error creating user" });
            }

            res.status(201).json({
              id: this.lastID,
              name,
              email,
              role,
              phone,
              address,
            });
          },
        );
      });
    });
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required" });
  }

  db.get(
    "SELECT u.*, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.is_active = 1",
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!user) {
        return res.status(401).json({ detail: "Invalid email or password" });
      }

      // Check if user has password (for Google OAuth users)
      if (!user.hashed_password) {
        return res
          .status(401)
          .json({ detail: "Please use Google sign-in for this account" });
      }

      bcrypt.compare(password, user.hashed_password, (err, isValid) => {
        if (err) {
          return res.status(500).json({ detail: "Error verifying password" });
        }
        if (!isValid) {
          return res.status(401).json({ detail: "Invalid email or password" });
        }

        const token = jwt.sign(
          { sub: user.email, userId: user.id, role: user.role },
          SECRET_KEY,
          { expiresIn: "24h" },
        );
        res.json({
          access_token: token,
          token_type: "bearer",
          user: getSafeUserInfo(user),
        });
      });
    },
  );
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  db.get(
    "SELECT u.id, u.name, u.email, r.name as role, u.phone, u.address, u.profile_picture FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.is_active = 1",
    [req.user.sub],
    (err, user) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!user) {
        return res.status(404).json({ detail: "User not found" });
      }
      res.json(user);
    },
  );
});

// Sections management routes
app.get("/api/sections", (req, res) => {
  db.all(
    "SELECT * FROM sections WHERE is_active = 1 ORDER BY display_order",
    (err, sections) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      res.json(sections);
    },
  );
});

app.post(
  "/api/sections",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({ detail: "Section name is required" });
    }

    db.run(
      "INSERT INTO sections (name, description, image, created_by) VALUES (?, ?, ?, ?)",
      [name, description, image, req.user.userId],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return res
              .status(400)
              .json({ detail: "Section name already exists" });
          }
          return res.status(500).json({ detail: "Error creating section" });
        }

        res.status(201).json({
          id: this.lastID,
          name,
          description,
          image,
          is_active: true,
        });
      },
    );
  },
);

app.put(
  "/api/sections/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;
    const { name, description, image, display_order, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ detail: "Section name is required" });
    }

    db.run(
      "UPDATE sections SET name = ?, description = ?, image = ?, display_order = ?, is_active = ? WHERE id = ?",
      [name, description, image, display_order, is_active, id],
      function (err) {
        if (err) {
          return res.status(500).json({ detail: "Error updating section" });
        }
        if (this.changes === 0) {
          return res.status(404).json({ detail: "Section not found" });
        }

        res.json({ message: "Section updated successfully" });
      },
    );
  },
);

app.delete(
  "/api/sections/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;

    db.run(
      "UPDATE sections SET is_active = 0 WHERE id = ?",
      [id],
      function (err) {
        if (err) {
          return res.status(500).json({ detail: "Error deleting section" });
        }
        if (this.changes === 0) {
          return res.status(404).json({ detail: "Section not found" });
        }

        res.json({ message: "Section deleted successfully" });
      },
    );
  },
);

// Product routes
app.get("/api/products", (req, res) => {
  const {
    section,
    search,
    limit = 50,
    offset = 0,
    featured,
    brand,
    min_price,
    max_price,
  } = req.query;
  let query = `SELECT p.*, s.name as section_name FROM products p
               LEFT JOIN sections s ON p.section_id = s.id
               WHERE p.is_active = 1`;
  let params = [];

  if (section) {
    query += " AND s.name = ?";
    params.push(section);
  }

  if (search) {
    query +=
      " AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ? OR p.specifications LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (featured === "true") {
    query += " AND p.is_featured = 1";
  }

  if (brand) {
    query += " AND p.brand = ?";
    params.push(brand);
  }

  if (min_price) {
    query += " AND p.price >= ?";
    params.push(parseFloat(min_price));
  }

  if (max_price) {
    query += " AND p.price <= ?";
    params.push(parseFloat(max_price));
  }

  query += " ORDER BY p.id LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ detail: "Database error" });
    }
    res.json(rows);
  });
});

app.get("/api/products/:id", (req, res) => {
  db.get(
    `SELECT p.*, s.name as section_name FROM products p
          LEFT JOIN sections s ON p.section_id = s.id
          WHERE p.id = ? AND p.is_active = 1`,
    [req.params.id],
    (err, product) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!product) {
        return res.status(404).json({ detail: "Product not found" });
      }
      res.json(product);
    },
  );
});

app.post("/api/products", authenticateToken, (req, res) => {
  // Check if user is admin
  db.get(
    "SELECT r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ?",
    [req.user.sub],
    (err, user) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!user || user.role !== "admin") {
        return res.status(403).json({ detail: "Admin access required" });
      }

      const {
        name,
        price,
        section_id,
        image,
        channel,
        stock = 0,
        description,
        brand,
        specifications,
        is_featured = false,
      } = req.body;

      if (!name || !price || !section_id) {
        return res
          .status(400)
          .json({ detail: "Name, price, and section are required" });
      }

      // Verify section exists
      db.get(
        "SELECT id FROM sections WHERE id = ? AND is_active = 1",
        [section_id],
        (err, section) => {
          if (err) {
            return res.status(500).json({ detail: "Database error" });
          }
          if (!section) {
            return res.status(400).json({ detail: "Invalid section" });
          }

          db.run(
            `INSERT INTO products (name, price, section_id, image, channel, stock, description, brand, specifications, is_featured, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              name,
              parseFloat(price),
              section_id,
              image,
              channel,
              parseInt(stock),
              description,
              brand,
              specifications,
              is_featured,
              1,
            ],
            function (err) {
              if (err) {
                return res
                  .status(500)
                  .json({ detail: "Error creating product" });
              }

              db.get(
                `SELECT p.*, s.name as section_name FROM products p
                LEFT JOIN sections s ON p.section_id = s.id
                WHERE p.id = ?`,
                [this.lastID],
                (err, product) => {
                  if (err) {
                    return res
                      .status(500)
                      .json({ detail: "Error retrieving product" });
                  }
                  res.status(201).json(product);
                },
              );
            },
          );
        },
      );
    },
  );
});

app.put("/api/products/:id", authenticateToken, (req, res) => {
  // Check if user is admin
  db.get(
    "SELECT r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ?",
    [req.user.sub],
    (err, user) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!user || user.role !== "admin") {
        return res.status(403).json({ detail: "Admin access required" });
      }

      const productId = req.params.id;
      const {
        name,
        price,
        section_id,
        image,
        channel,
        stock,
        description,
        brand,
        specifications,
        is_featured,
        is_active,
      } = req.body;
      const updates = {};
      const values = [];

      if (name !== undefined) updates.name = name;
      if (price !== undefined) updates.price = parseFloat(price);
      if (section_id !== undefined) updates.section_id = section_id;
      if (image !== undefined) updates.image = image;
      if (channel !== undefined) updates.channel = channel;
      if (stock !== undefined) updates.stock = parseInt(stock);
      if (description !== undefined) updates.description = description;
      if (brand !== undefined) updates.brand = brand;
      if (specifications !== undefined) updates.specifications = specifications;
      if (is_featured !== undefined) updates.is_featured = is_featured;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ detail: "No fields to update" });
      }

      const fields = Object.keys(updates).map((key) => `${key} = ?`);
      const updateValues = Object.values(updates);
      updateValues.push(productId);

      db.run(
        `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
        updateValues,
        function (err) {
          if (err) {
            return res.status(500).json({ detail: "Error updating product" });
          }
          if (this.changes === 0) {
            return res.status(404).json({ detail: "Product not found" });
          }

          db.get(
            `SELECT p.*, s.name as section_name FROM products p
              LEFT JOIN sections s ON p.section_id = s.id
              WHERE p.id = ?`,
            [productId],
            (err, product) => {
              if (err) {
                return res
                  .status(500)
                  .json({ detail: "Error retrieving product" });
              }
              res.json(product);
            },
          );
        },
      );
    },
  );
});

app.delete("/api/products/:id", authenticateToken, (req, res) => {
  // Check if user is admin
  db.get(
    "SELECT is_admin FROM users WHERE email = ?",
    [req.user.sub],
    (err, user) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!user || !user.is_admin) {
        return res.status(403).json({ detail: "Admin access required" });
      }

      const productId = req.params.id;

      db.run("DELETE FROM products WHERE id = ?", [productId], function (err) {
        if (err) {
          return res.status(500).json({ detail: "Error deleting product" });
        }
        if (this.changes === 0) {
          return res.status(404).json({ detail: "Product not found" });
        }
        res.json({ message: "Product deleted" });
      });
    },
  );
});

// Cart/Order routes
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  const { items, shippingAddress, phone } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ detail: "Cart is empty" });
  }

  try {
    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      const product = await getProductById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ detail: `Product ${item.productId} not found` });
      }
      if (product.stock < item.quantity) {
        return res
          .status(400)
          .json({ detail: `Insufficient stock for ${product.name}` });
      }
      totalAmount += product.price * item.quantity;
    }

    // Create order
    const orderId = uuidv4();
    db.run(
      "INSERT INTO orders (id, user_id, total_amount, shipping_address, phone) VALUES (?, ?, ?, ?, ?)",
      [orderId, req.user.userId, totalAmount, shippingAddress, phone],
      function (err) {
        if (err) {
          return res.status(500).json({ detail: "Error creating order" });
        }

        // Add order items
        const stmt = db.prepare(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        );
        items.forEach((item) => {
          const product = items.find((p) => p.productId === item.productId);
          stmt.run(orderId, item.productId, item.quantity, product.price);
        });
        stmt.finalize();

        // Update product stock
        items.forEach((item) => {
          db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [
            item.quantity,
            item.productId,
          ]);
        });

        res.json({
          orderId,
          totalAmount,
          status: "pending",
          message: "Order created successfully",
        });
      },
    );
  } catch (err) {
    res.status(500).json({ detail: "Error processing order" });
  }
});

// Payment routes
app.post("/api/payment/create-intent", authenticateToken, async (req, res) => {
  const { orderId } = req.body;

  try {
    // Get order details
    db.get(
      "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      [orderId, req.user.userId],
      (err, order) => {
        if (err) {
          return res.status(500).json({ detail: "Database error" });
        }
        if (!order) {
          return res.status(404).json({ detail: "Order not found" });
        }

        // Create payment intent
        stripe.paymentIntents
          .create({
            amount: Math.round(order.total_amount * 100), // Convert to paisa
            currency: "inr",
            metadata: { orderId },
          })
          .then((paymentIntent) => {
            // Save payment record
            db.run(
              "INSERT INTO payments (id, order_id, stripe_payment_id, amount, currency) VALUES (?, ?, ?, ?, ?)",
              [uuidv4(), orderId, paymentIntent.id, order.total_amount, "inr"],
            );

            res.json({
              clientSecret: paymentIntent.client_secret,
              paymentIntentId: paymentIntent.id,
            });
          })
          .catch((err) => {
            res.status(500).json({ detail: "Error creating payment intent" });
          });
      },
    );
  } catch (err) {
    res.status(500).json({ detail: "Error creating payment" });
  }
});

app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      // Update payment status
      db.run("UPDATE payments SET status = ? WHERE stripe_payment_id = ?", [
        "completed",
        paymentIntent.id,
      ]);
      db.run("UPDATE orders SET payment_status = ?, status = ? WHERE id = ?", [
        "paid",
        "confirmed",
        orderId,
      ]);

      // Create delivery record
      createDelivery(orderId);
    }

    res.json({ received: true });
  },
);

// Delivery routes
app.get("/api/orders", authenticateToken, (req, res) => {
  const isAdmin = req.user.role === "admin";
  const query = isAdmin
    ? "SELECT * FROM orders ORDER BY created_at DESC"
    : "SELECT o.*, d.tracking_number, d.status as delivery_status, d.carrier FROM orders o LEFT JOIN deliveries d ON o.id = d.order_id WHERE o.user_id = ? ORDER BY o.created_at DESC";

  const params = isAdmin ? [] : [req.user.userId];

  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ detail: "Database error" });
    }
    res.json(orders);
  });
});

app.get("/api/orders/:orderId", authenticateToken, (req, res) => {
  const { orderId } = req.params;

  const isAdmin = req.user.role === "admin";
  db.get(
    "SELECT * FROM orders WHERE id = ? AND (? OR user_id = ?)",
    [orderId, isAdmin ? 1 : 0, req.user.userId],
    (err, order) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!order) {
        return res.status(404).json({ detail: "Order not found" });
      }

      // Get order items
      db.all(
        "SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
        [orderId],
        (err, items) => {
          if (err) {
            return res.status(500).json({ detail: "Database error" });
          }

          // Get delivery info
          db.get(
            "SELECT * FROM deliveries WHERE order_id = ?",
            [orderId],
            (err, delivery) => {
              res.json({
                ...order,
                items,
                delivery,
              });
            },
          );
        },
      );
    },
  );
});

// Tracking routes
app.get("/api/tracking/:orderId", authenticateToken, (req, res) => {
  const { orderId } = req.params;

  db.get(
    "SELECT * FROM deliveries WHERE order_id = ?",
    [orderId],
    (err, delivery) => {
      if (err) {
        return res.status(500).json({ detail: "Database error" });
      }
      if (!delivery) {
        return res.status(404).json({ detail: "Delivery not found" });
      }

      // Get tracking updates
      db.all(
        "SELECT * FROM tracking_updates WHERE delivery_id = ? ORDER BY timestamp DESC",
        [delivery.id],
        (err, updates) => {
          if (err) {
            return res.status(500).json({ detail: "Database error" });
          }

          res.json({
            ...delivery,
            updates,
          });
        },
      );
    },
  );
});

// Admin routes for delivery management
app.put(
  "/api/admin/orders/:orderId/status",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    db.run(
      "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, orderId],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({ detail: "Error updating order status" });
        }
        if (this.changes === 0) {
          return res.status(404).json({ detail: "Order not found" });
        }

        // If order is shipped, update delivery
        if (status === "shipped") {
          updateDeliveryStatus(orderId, "shipped");
        }

        res.json({ message: "Order status updated" });
      },
    );
  },
);

// File upload
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

app.post(
  "/api/upload",
  authenticateToken,
  authorizeRole("admin"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ detail: "No file uploaded" });
    }

    const url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    res.json({
      filename: req.file.filename,
      url: url,
    });
  },
);

// Helper functions
function getProductById(productId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM products WHERE id = ?",
      [productId],
      (err, product) => {
        if (err) reject(err);
        else resolve(product);
      },
    );
  });
}

function createDelivery(orderId) {
  const trackingNumber =
    "RD" + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // 5 days delivery

  db.run(
    "INSERT INTO deliveries (id, order_id, tracking_number, carrier, estimated_delivery) VALUES (?, ?, ?, ?, ?)",
    [
      uuidv4(),
      orderId,
      trackingNumber,
      "Rudransh Express",
      estimatedDelivery.toISOString(),
    ],
  );

  // Add initial tracking update
  setTimeout(() => {
    addTrackingUpdate(orderId, "Order confirmed and packed", "Warehouse");
  }, 1000);
}

function updateDeliveryStatus(orderId, status) {
  db.run(
    "UPDATE deliveries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
    [status, orderId],
  );

  // Add tracking update
  const statusMessages = {
    shipped: "Order shipped from warehouse",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered successfully",
  };

  if (statusMessages[status]) {
    addTrackingUpdate(orderId, statusMessages[status], "In Transit");
  }

  // Emit real-time update
  io.to(`order-${orderId}`).emit("tracking-update", {
    status,
    message: statusMessages[status],
    timestamp: new Date(),
  });
}

function addTrackingUpdate(orderId, description, location) {
  db.get(
    "SELECT id FROM deliveries WHERE order_id = ?",
    [orderId],
    (err, delivery) => {
      if (delivery) {
        db.run(
          "INSERT INTO tracking_updates (delivery_id, status, location, description) VALUES (?, ?, ?, ?)",
          [delivery.id, "in_transit", location, description],
        );
      }
    },
  );
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});
