# VVG Template Testing Guide

## 🚨 Build Status: PARTIALLY WORKING
- **Syntax Issues**: ✅ Fixed (removed duplicate exports, fixed JSX structure)  
- **Import/Export Issues**: ⚠️ Need Resolution
- **Node.js Modules**: ⚠️ Need Webpack Config

## 🔧 Quick Fix Script

To test if the template runs, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Fill in your Azure AD credentials and other required env vars
```

### 3. Fix Remaining Import Issues
```bash
# Fix TimestampUtils import in error-handler.ts
sed -i '' 's/TimestampUtils.*from.*config/TimestampUtils} from "@\/lib\/utils"/' lib/decorators/error-handler.ts

# Fix APP_CONSTANTS import in queue-service.ts  
sed -i '' 's/APP_CONSTANTS.*from.*utils/APP_CONSTANTS} from "@\/lib\/config"/' lib/services/queue-service.ts
```

### 4. Add Webpack Config for Node.js Modules
Add to `next.config.mjs`:

```javascript
const nextConfig = {
  // ... existing config
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};
```

### 5. Test Development Server
```bash
npm run dev
```

### 6. Test Production Build
```bash
npm run build
npm start
```

## 🧪 Manual Testing Checklist

### Core Functionality
- [ ] **Homepage loads** (`/`)
- [ ] **Sign-in page loads** (`/sign-in`)  
- [ ] **Dashboard loads** (`/dashboard`)
- [ ] **Upload page loads** (`/upload`)
- [ ] **Documents page loads** (`/documents`)
- [ ] **Compare page loads** (`/compare`)

### API Endpoints
- [ ] **Health check**: `GET /api/health`
- [ ] **Database health**: `GET /api/db-health` 
- [ ] **Storage health**: `GET /api/storage-health`
- [ ] **Dashboard stats**: `GET /api/dashboard/stats`

### Authentication Flow
- [ ] **Azure AD login** works
- [ ] **Session persistence** works
- [ ] **Logout** works
- [ ] **Protected routes** redirect to sign-in

### File Operations
- [ ] **File upload** works
- [ ] **PDF text extraction** works
- [ ] **DOCX text extraction** works
- [ ] **Document comparison** works
- [ ] **File download** works

### Database Operations
- [ ] **Document creation** works
- [ ] **Document retrieval** works
- [ ] **Comparison storage** works
- [ ] **Queue processing** works

## 🔍 Testing Commands

### Development Mode
```bash
# Start dev server with hot reload
npm run dev

# Test specific API endpoint
curl http://localhost:3000/api/health

# Test with dev seeding
npm run dev:seed
```

### Production Mode
```bash
# Build and start production server
npm run build
npm start

# Test production endpoints
curl http://localhost:3000/api/health
```

### Docker Testing
```bash
# Build Docker image
docker build -t vvg-template .

# Run container
docker run -p 3000:3000 --env-file .env.local vvg-template

# Test containerized app
curl http://localhost:3000/api/health
```

## 🐛 Known Issues & Solutions

### 1. Node.js Module Errors
**Problem**: `Module not found: Can't resolve 'fs'`, `'net'`, `'tls'`
**Solution**: Add webpack fallbacks in `next.config.mjs`

### 2. Import/Export Mismatches  
**Problem**: `'TimestampUtils' is not exported from '@/lib/config'`
**Solution**: Import from correct module (`@/lib/utils`)

### 3. Environment Variables
**Problem**: Missing required env vars cause crashes
**Solution**: Use centralized `EnvironmentHelpers.validateCriticalEnvVars()`

### 4. Database Connection
**Problem**: MySQL connection fails in development
**Solution**: Falls back to in-memory storage automatically

### 5. Azure AD Authentication
**Problem**: OAuth redirect URL mismatch
**Solution**: Self-healing redirect URLs in `auth-options.ts`

## 📊 Test Results Template

```markdown
## Test Results - [Date]

### Build Status
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No webpack errors

### Development Server
- [ ] `npm run dev` starts successfully
- [ ] Homepage loads without errors
- [ ] Console shows no critical errors

### Core Pages
- [ ] `/` - Homepage ✅/❌
- [ ] `/sign-in` - Sign-in page ✅/❌  
- [ ] `/dashboard` - Dashboard ✅/❌
- [ ] `/upload` - Upload page ✅/❌
- [ ] `/documents` - Documents list ✅/❌
- [ ] `/compare` - Compare page ✅/❌

### API Health Checks
- [ ] `/api/health` - Basic health ✅/❌
- [ ] `/api/db-health` - Database connectivity ✅/❌
- [ ] `/api/storage-health` - Storage connectivity ✅/❌

### Issues Found
1. [Description] - [Severity: High/Medium/Low]
2. [Description] - [Severity: High/Medium/Low]

### Overall Status
- **Ready for Development**: ✅/❌
- **Ready for Production**: ✅/❌
```

## 🚀 Deployment Readiness

### Prerequisites
- ✅ All syntax errors fixed
- ⚠️ Import/export issues resolved
- ⚠️ Webpack config updated
- ⚠️ Environment variables configured
- ⚠️ Azure AD setup completed
- ⚠️ Database connection tested
- ⚠️ Storage provider configured

### Production Checklist
- [ ] Environment validation passes
- [ ] Build succeeds without warnings
- [ ] All health checks pass
- [ ] Authentication flow works
- [ ] File operations work
- [ ] Database operations work
- [ ] Error handling works
- [ ] Logging works properly