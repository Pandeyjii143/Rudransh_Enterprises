# Rudransh Enterprises Backend (Node.js/Express)

This backend provides a simple authentication API and product listing for the frontend.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run the server:

```bash
npm start
# or for development with auto-reload
npm run dev
```

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)
- `POST /api/upload` - Upload image file (admin only)

## API Endpoints

- `POST /api/auth/register` - Create a new user (name, email, password)
- `POST /api/auth/login` - Login (email, password) → returns bearer token
- `GET /api/auth/me` - Get user profile (requires Authorization header)
- `GET /api/products` - List products

## Notes

- The database used is SQLite and stored in `app.db` in this folder.
- Passwords are hashed with bcrypt.
- The JWT secret is currently hard-coded in `app/auth.py`; for production you should use an environment variable.
