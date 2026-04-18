@echo off
echo 🚀 Rudransh Enterprises Deployment Script
echo ========================================

echo Building frontend...
cd rudransh-frontend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    exit /b 1
)
echo ✅ Frontend built successfully!

echo.
echo 📦 Deployment files ready!
echo.
echo Next steps:
echo 1. Push your code to GitHub
echo 2. Go to railway.app and deploy from your repo
echo 3. Set environment variables in Railway dashboard
echo 4. Your app will be live! 🎉
echo.
echo See DEPLOYMENT_README.md for detailed instructions.

pause