const { dbAsync } = require("../config/database");

/**
 * User queries
 */
const UserService = {
  async findById(id) {
    return dbAsync.get(
      `SELECT u.id, u.name, u.email, u.role_id, r.name as role, u.phone, u.address,
              u.profile_picture, u.is_active, u.created_at FROM users u
       LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [id],
    );
  },

  async findByEmail(email) {
    return dbAsync.get(
      `SELECT u.id, u.name, u.email, u.hashed_password, u.role_id, r.name as role,
              u.phone, u.address, u.profile_picture, u.is_active, u.created_at FROM users u
       LEFT JOIN roles r ON u.role_id = r.id WHERE LOWER(u.email) = LOWER(?)`,
      [email],
    );
  },

  async findByGoogleId(googleId) {
    return dbAsync.get(
      `SELECT u.id, u.name, u.email, u.role_id, r.name as role, u.phone, u.address,
              u.profile_picture, u.is_active FROM users u
       LEFT JOIN roles r ON u.role_id = r.id WHERE u.google_id = ?`,
      [googleId],
    );
  },

  async create(userData) {
    const { role_id = 2 } = userData;
    const result = await dbAsync.run(
      `INSERT INTO users (name, email, hashed_password, role_id, phone, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userData.name,
        userData.email,
        userData.hashed_password,
        role_id,
        userData.phone,
        userData.address,
        1,
      ],
    );
    return this.findById(result.lastID);
  },

  async createWithGoogle(userData) {
    const result = await dbAsync.run(
      `INSERT INTO users (name, email, google_id, profile_picture, role_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userData.name,
        userData.email,
        userData.google_id,
        userData.profile_picture,
        2,
        1,
      ],
    );
    return this.findById(result.lastID);
  },

  async update(id, data) {
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    await dbAsync.run(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  },
};

/**
 * Product queries
 */
const ProductService = {
  async findById(id) {
    return dbAsync.get(
      `SELECT p.* FROM products p WHERE p.id = ? AND p.is_active = 1`,
      [id],
    );
  },

  async findAll(filters = {}) {
    let query = `SELECT p.* FROM products p WHERE p.is_active = 1`;
    const params = [];

    if (filters.section) {
      query += " AND p.category = ?";
      params.push(filters.section);
    }

    if (filters.search) {
      query += " AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)";
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.featured) {
      query += " AND p.is_featured = 1";
    }

    if (filters.brandFilter) {
      query += " AND p.brand = ?";
      params.push(filters.brandFilter);
    }

    if (filters.minPrice) {
      query += " AND p.price >= ?";
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      query += " AND p.price <= ?";
      params.push(filters.maxPrice);
    }

    query += " ORDER BY p.created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += " OFFSET ?";
      params.push(filters.offset);
    }

    return dbAsync.all(query, params);
  },

  async create(data) {
    const result = await dbAsync.run(
      `INSERT INTO products (name, price, category, image, channel, stock, description, brand, specifications, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.price,
        data.category,
        data.image,
        data.channel,
        data.stock || 0,
        data.description,
        data.brand,
        data.specifications,
        data.is_featured ? 1 : 0,
        1,
      ],
    );
    return this.findById(result.lastID);
  },

  async update(id, data) {
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    await dbAsync.run(
      `UPDATE products SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  },

  async delete(id) {
    await dbAsync.run("UPDATE products SET is_active = 0 WHERE id = ?", [id]);
  },
};

/**
 * Section queries
 */
const SectionService = {
  async findAll() {
    return dbAsync.all(
      "SELECT * FROM sections WHERE is_active = 1 ORDER BY display_order ASC",
      [],
    );
  },

  async findById(id) {
    return dbAsync.get(
      "SELECT * FROM sections WHERE id = ? AND is_active = 1",
      [id],
    );
  },

  async create(data) {
    const result = await dbAsync.run(
      `INSERT INTO sections (name, description, image, created_by) VALUES (?, ?, ?, ?)`,
      [data.name, data.description, data.image, data.createdBy],
    );
    return this.findById(result.lastID);
  },

  async update(id, data) {
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    await dbAsync.run(
      `UPDATE sections SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  },

  async delete(id) {
    await dbAsync.run("UPDATE sections SET is_active = 0 WHERE id = ?", [id]);
  },
};

/**
 * Order queries
 */
const OrderService = {
  async findById(id) {
    return dbAsync.get(
      `SELECT o.*, d.tracking_number, d.status as delivery_status FROM orders o
       LEFT JOIN deliveries d ON o.id = d.order_id WHERE o.id = ?`,
      [id],
    );
  },

  async findByUserId(userId) {
    return dbAsync.all(
      `SELECT o.*, d.tracking_number, d.status as delivery_status FROM orders o
       LEFT JOIN deliveries d ON o.id = d.order_id
       WHERE o.user_id = ? ORDER BY o.created_at DESC`,
      [userId],
    );
  },

  async findAll() {
    return dbAsync.all(
      `SELECT o.*, d.tracking_number, d.status as delivery_status FROM orders o
       LEFT JOIN deliveries d ON o.id = d.order_id
       ORDER BY o.created_at DESC`,
      [],
    );
  },

  async create(data) {
    await dbAsync.run(
      `INSERT INTO orders (id, user_id, total_amount, shipping_address, phone) VALUES (?, ?, ?, ?, ?)`,
      [
        data.id,
        data.user_id,
        data.total_amount,
        data.shipping_address,
        data.phone,
      ],
    );
    return this.findById(data.id);
  },

  async updateStatus(id, status) {
    await dbAsync.run(
      `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id],
    );
    return this.findById(id);
  },
};

module.exports = {
  UserService,
  ProductService,
  SectionService,
  OrderService,
};
