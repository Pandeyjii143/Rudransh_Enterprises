# Rudransh Enterprises - Deployment Guide

## 🚀 Deployment Options

### Option 1: Railway (Recommended) ⭐

Railway is perfect for your full-stack Node.js + React app with SQLite database.

#### Steps:

1. **Create Railway Account**: Go to [railway.app](https://railway.app) and sign up

2. **Connect Repository**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect your GitHub account and select this repository

3. **Environment Variables**:
   Set these in Railway dashboard (Variables tab):

   ```
   NODE_ENV=production
   PORT=8080
   CORS_ORIGIN=https://your-frontend-domain.railway.app
   JWT_SECRET=your_secure_jwt_secret_here
   JWT_REFRESH_SECRET=your_secure_refresh_secret_here
   RAZORPAY_KEY_ID=rzp_live_your_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   ```

4. **Database**: Railway automatically handles SQLite persistence

5. **Deploy**: Railway will auto-deploy on every push to main branch

### Option 2: Vercel + Railway

Deploy frontend to Vercel, backend to Railway.

#### Frontend (Vercel):
```bash
cd rudransh-frontend
npm install -g vercel
vercel --prod
```

#### Backend (Railway):
Same as Option 1 above.

### Option 3: Heroku

#### Backend Deployment:
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
# ... other env vars

# Deploy
git push heroku main
```

#### Frontend Deployment:
Use Vercel or Netlify for the React app.

## 🔧 Environment Setup

1. Copy `.env.production` to `.env` in the backend folder
2. Fill in your actual API keys and secrets
3. For production, use strong, random secrets for JWT

## 📦 Build Commands

```bash
# Frontend build
cd rudransh-frontend
npm run build

# Backend (no build needed, it's Node.js)
cd backend
npm start
```

## 🔍 Health Check

Your app includes a health check endpoint at `/health` for monitoring.

## 🌐 Domain Configuration

- Update `CORS_ORIGIN` in environment variables to match your frontend domain
- For Railway: `https://your-project-name.railway.app`

## 💳 Payment Integration

- **Razorpay**: Use live keys for production
- **Stripe**: Optional, configure if needed

## 📊 Database

SQLite database file will be created automatically on first run. Railway persists the file between deployments.

---

## Quick Deploy Checklist

- [ ] Environment variables set
- [ ] Payment gateway keys configured
- [ ] CORS origin updated
- [ ] Database migrations run
- [ ] Frontend built and deployed
- [ ] Backend deployed and healthy

Happy deploying! 🎉