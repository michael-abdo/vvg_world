# Authentication Bypass Guide for VVG World

## Overview

This guide explains how authentication works in the VVG World application and how to bypass it during development. It covers the authentication flow, common issues, and multiple bypass methods available.

## Table of Contents
- [Authentication Flow Explained](#authentication-flow-explained)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Bypass Methods](#bypass-methods)
- [Troubleshooting](#troubleshooting)

## Authentication Flow Explained

### How Authentication Works

```
Normal Authentication Flow:
==========================

[Browser] ──────> [Your App URL] ──────> [Next.js Middleware]
                                                 │
                                                 ├─ Check: Auth token?
                                                 ├─ No token → Redirect to /sign-in
                                                 └─ Has token → Allow access
                                                 │
                                                 ▼
                                         [Protected Page]
```

### The Two Critical Components

1. **NEXTAUTH_URL**: Must match the URL you're accessing the app from
2. **Middleware**: Guards protected routes and checks for authentication

## Common Issues and Solutions

### Issue 1: NEXTAUTH_URL Mismatch

**Problem:**
```
Browser URL:  https://mike-development.ngrok-free.app
NEXTAUTH_URL: http://localhost:3002
Result:       OAuth redirect mismatch error
```

**Visual Explanation:**
```
┌─────────────────────────────────┐     ┌──────────────────────────────────────┐
│ Your Browser thinks:            │ ≠   │ NextAuth thinks:                     │
│ https://mike-development.ngrok  │     │ http://localhost:3002                │
└─────────────────────────────────┘     └──────────────────────────────────────┘
                 ↑                                        ↑
                 └────────── These don't match! ──────────┘
```

**Solution:**
Update `.env.local`:
```env
NEXTAUTH_URL=https://mike-development.ngrok-free.app
```

### Issue 2: Dev Bypass Not Working

**Problem:**
```
FEATURE_DEV_BYPASS=true is set, but authentication is still required
```

**Visual Explanation:**
```
BEFORE (Broken):
===============
[Browser Request] ────> [Middleware]
                            │
                            ├─ Checks: X-Dev-Bypass header? NO ❌
                            ├─ FEATURE_DEV_BYPASS=true? (Not checked!)
                            └─ Result: Redirect to sign-in

AFTER (Fixed):
=============
[Browser Request] ────> [Middleware]
                            │
                            ├─ Checks: DISABLE_AUTH=true? YES ✓
                            └─ Result: Skip all auth checks!
```

## Bypass Methods

### Method 1: Complete Auth Bypass (Recommended for Development)

Add to `.env.local`:
```env
DISABLE_AUTH=true
```

**How it works:**
```
[Browser] ──────> [Your App URL] ──────> [Middleware]
                                              │
                                              ├─ Is DISABLE_AUTH=true? YES ✓
                                              └─ Skip everything → Access granted!
                                              │
                                              ▼
                                      [Protected Page]
```

### Method 2: Feature Dev Bypass

Already set in `.env.local`:
```env
FEATURE_DEV_BYPASS=true
TEST_USER_EMAIL=test@example.com
```

**How it works:**
```
[Browser] ──────> [Your App URL] ──────> [Middleware]
                                              │
                                              ├─ Is FEATURE_DEV_BYPASS=true? YES ✓
                                              └─ Inject test user → Access granted!
                                              │
                                              ▼
                                      [Protected Page]
```

### Method 3: Header-Based Bypass

For API testing, add header:
```bash
curl -H "X-Dev-Bypass: true" https://your-app.com/api/protected
```

**How it works:**
```
[API Request with Header] ──────> [Middleware]
                                       │
                                       ├─ Has X-Dev-Bypass header? YES ✓
                                       └─ Allow access!
```

## Step-by-Step Implementation

### 1. Update Environment Variables

Edit `.env.local`:
```env
# NextAuth Configuration
NEXTAUTH_URL=https://your-ngrok-url.ngrok-free.app  # Must match your access URL!
NEXTAUTH_SECRET=your-secret-here

# Development Features
FEATURE_DEV_BYPASS=true
TEST_USER_EMAIL=test@example.com
DISABLE_AUTH=true  # Add this for complete bypass
```

### 2. Update Middleware (if needed)

The middleware should support multiple bypass methods:

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function middleware(request: NextRequest) {
  // Complete bypass if DISABLE_AUTH is true
  if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }
  
  // Otherwise use auth middleware
  return withAuthMiddleware(request as any);
}

const withAuthMiddleware = withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      // Dev bypass
      if (process.env.NODE_ENV === 'development' && process.env.FEATURE_DEV_BYPASS === 'true') {
        return true;
      }
      // Header bypass
      if (req.headers.get("X-Dev-Bypass") === "true") {
        return true;
      }
      return !!token;
    },
  },
});

export default middleware;
```

### 3. Restart Development Server

After updating environment variables:
```bash
npm run dev
```

## Troubleshooting

### Still Getting Redirected to Sign-In?

1. **Check your .env.local file** - Ensure `DISABLE_AUTH=true` is set
2. **Verify NEXTAUTH_URL** - Must match your access URL exactly
3. **Restart the dev server** - Environment variables require a restart
4. **Check middleware matcher** - Ensure your route is in the protected list

### OAuth Error?

If you see: `error=OAuthSignin`

This usually means NEXTAUTH_URL doesn't match your access URL:
```
Wrong: NEXTAUTH_URL=http://localhost:3002
Right: NEXTAUTH_URL=https://your-actual-url.com
```

### Testing Authentication

To verify bypass is working:
```bash
# Should return data without authentication
curl https://your-app.com/api/pain-points

# Access dashboard directly in browser
open https://your-app.com/dashboard
```

## Security Notes

⚠️ **IMPORTANT**: These bypass methods should ONLY be used in development:
- Never set `DISABLE_AUTH=true` in production
- The bypass only works when `NODE_ENV=development`
- Production deployments will ignore these settings

## Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│ Environment Variable Settings for Development:              │
├─────────────────────────────────────────────────────────────┤
│ NEXTAUTH_URL=https://your-ngrok-url.ngrok-free.app        │
│ DISABLE_AUTH=true                                          │
│ FEATURE_DEV_BYPASS=true                                    │
│ TEST_USER_EMAIL=test@example.com                           │
└─────────────────────────────────────────────────────────────┘
```

## Summary

The authentication bypass system provides multiple methods to skip authentication during development:

1. **DISABLE_AUTH** - Complete bypass, no auth checks at all
2. **FEATURE_DEV_BYPASS** - Injects a test user automatically
3. **X-Dev-Bypass header** - For API testing tools

Choose the method that best fits your development workflow!