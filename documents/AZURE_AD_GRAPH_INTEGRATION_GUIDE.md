# Azure AD Graph API Integration Guide - VVG Invoice Analyzer

## Overview

This document provides a comprehensive guide to integrating Microsoft Graph API with Azure AD OAuth authentication to retrieve extended user attributes for invoice routing and stakeholder management in the VVG Invoice Analyzer.

## What This Solves

The implementation enables retrieval of extended user profile information from Azure AD, including:
- **Department** - For routing invoices to appropriate teams
- **Job Title** - For stakeholder identification
- **Office Location** - For location-based routing
- **Manager Information** - For approval workflows
- **Phone Numbers** - For contact information
- **Employee ID** - For system integration

## Implementation Architecture

### Core Components

1. **Graph API Integration** (`/SAML/azureADGraphImplementation.ts`)
   - Enhanced NextAuth configuration with User.Read permissions
   - Microsoft Graph API client setup
   - Extended user profile fetching

2. **Permission Test API** (`/SAML/testGraphPermissions.ts`)
   - Validates User.Read permissions
   - Tests Microsoft Graph API connectivity
   - Provides diagnostic information

3. **User Profile Extensions**
   - Extended session type with Azure AD attributes
   - Type-safe access to user profile data

## Setup Instructions

### 1. Azure AD App Registration Configuration

#### Required API Permissions

1. **Navigate to Azure Portal**:
   - Go to Azure Portal → App Registrations
   - Select your application
   - Go to "API permissions"

2. **Add Microsoft Graph Permissions**:
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Choose "Delegated permissions"
   - Add: `User.Read`

3. **Grant Admin Consent**:
   - Click "Grant admin consent for [Organization]"
   - Confirm the consent

### 2. Application Configuration

#### Install Dependencies

```bash
npm install @microsoft/microsoft-graph-client
npm install @types/microsoft-graph-client
```

#### Environment Variables

No additional environment variables needed beyond existing Azure AD OAuth setup:

```bash
# Existing Azure AD OAuth configuration
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret  
AZURE_AD_TENANT_ID=your_tenant_id
NEXTAUTH_SECRET=your_secret
```

### 3. Enhanced Auth Configuration

The Graph integration enhances the existing NextAuth setup by:

```typescript
// Enhanced scope request
authorization: {
  params: {
    scope: "openid profile email User.Read", // Added User.Read
  }
}

// Graph API profile fetching in JWT callback
async jwt({ token, account, profile }) {
  if (account && profile) {
    token.accessToken = account.access_token;
    
    // Fetch extended profile from Graph API
    if (account.access_token) {
      const graphProfile = await fetchUserProfile(account.access_token);
      if (graphProfile) {
        token.azureProfile = graphProfile;
      }
    }
  }
  return token;
}
```

## Available User Attributes

### Extended Profile Information

```typescript
interface AzureADUser {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  department?: string;          // Key for invoice routing
  jobTitle?: string;            // For stakeholder identification
  officeLocation?: string;      // For location-based routing
  mobilePhone?: string;
  businessPhones?: string[];
  manager?: string;             // For approval workflows
  managerEmail?: string;
  employeeId?: string;
  companyName?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  streetAddress?: string;
  state?: string;
  usageLocation?: string;
}
```

## Testing and Validation

### Permission Test API Endpoint

Create a test API endpoint at `/app/api/test-graph-permissions/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      return Response.json({ 
        error: 'Not authenticated',
        message: 'Please sign in first'
      }, { status: 401 });
    }

    // Test 1: Decode the access token to check scopes
    let tokenScopes = 'Unable to decode';
    let hasUserRead = false;
    try {
      const tokenParts = session.accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], 'base64').toString()
        );
        tokenScopes = payload.scp || payload.scope || 'No scopes found';
        hasUserRead = tokenScopes.includes('User.Read');
      }
    } catch (e) {
      console.error('Error decoding token:', e);
    }

    // Test 2: Try to call Microsoft Graph
    let graphTestResult = 'Not tested';
    let userProfile = null;
    
    try {
      const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (graphResponse.ok) {
        userProfile = await graphResponse.json();
        graphTestResult = 'Success! User.Read permission is working';
      } else {
        const error = await graphResponse.text();
        graphTestResult = `Failed: ${graphResponse.status} - ${error}`;
        
        if (graphResponse.status === 401) {
          graphTestResult = 'Unauthorized: Token might be expired or invalid';
        } else if (graphResponse.status === 403) {
          graphTestResult = 'Forbidden: Missing User.Read permission';
        }
      }
    } catch (e: any) {
      graphTestResult = `Error: ${e.message}`;
    }

    // Test 3: Check token expiry
    let tokenExpiry = 'Unknown';
    let isExpired = false;
    try {
      const tokenParts = session.accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], 'base64').toString()
        );
        if (payload.exp) {
          const expiryDate = new Date(payload.exp * 1000);
          tokenExpiry = expiryDate.toISOString();
          isExpired = expiryDate < new Date();
        }
      }
    } catch (e) {
      console.error('Error checking expiry:', e);
    }

    return Response.json({
      summary: {
        hasUserRead,
        canAccessGraph: graphTestResult.includes('Success'),
        recommendation: hasUserRead 
          ? '✅ User.Read permission is configured correctly!' 
          : '❌ User.Read permission is missing. Ask Bhavik to add it.'
      },
      details: {
        currentUser: session.user,
        tokenScopes,
        tokenExpiry,
        isExpired,
        graphTestResult,
        userProfile: userProfile ? {
          displayName: userProfile.displayName,
          mail: userProfile.mail,
          jobTitle: userProfile.jobTitle,
          department: userProfile.department,
          officeLocation: userProfile.officeLocation
        } : null
      },
      nextSteps: !hasUserRead ? [
        '1. Ask Bhavik to add User.Read permission in Azure Portal',
        '2. Have Bhavik grant admin consent',
        '3. Sign out and sign in again',
        '4. Run this test again'
      ] : [
        '✅ Permissions are configured!',
        'You can now implement the Graph API integration'
      ]
    });
  } catch (error: any) {
    return Response.json({
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
}
```

### Alternative Testing Methods

#### Method 1: Direct API Testing
```bash
# Access the test endpoint after signing in
curl http://localhost:3000/invoice-analyzer/api/test-graph-permissions
```

#### Method 2: Manual Token Testing

For testing on different ports or with manual tokens, create these additional files:

**Test Page** (`/app/test-graph/page.tsx`):
```typescript
'use client';
import { useState } from 'react';

export default function TestGraphPermissions() {
  const [token, setToken] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testToken = async () => {
    if (!token) {
      setResults({ error: 'Please enter a token' });
      return;
    }

    setLoading(true);
    try {
      // Decode token
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString()
      );

      // Check scopes
      const scopes = payload.scp || payload.scope || '';
      const hasUserRead = scopes.includes('User.Read');

      // Test Graph API
      const response = await fetch('/api/proxy-graph-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const graphResult = await response.json();

      setResults({
        success: true,
        hasUserRead,
        scopes: scopes.split(' ').filter(Boolean),
        tokenInfo: {
          email: payload.preferred_username || payload.email,
          name: payload.name,
          exp: new Date(payload.exp * 1000).toLocaleString()
        },
        graphTest: graphResult
      });
    } catch (error: any) {
      setResults({
        error: error.message,
        details: 'Failed to decode token or test Graph API'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Local Graph Permissions Test</h1>
      
      <div className="bg-blue-50 p-4 rounded mb-6">
        <p className="font-semibold mb-2">How to get your access token:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Sign in to the production app (legal.vtc.systems/invoice-analyzer)</li>
          <li>Open browser DevTools (F12)</li>
          <li>Go to Network tab and make any API call</li>
          <li>Find Authorization header: "Bearer [token]"</li>
          <li>Copy the token (without "Bearer" prefix)</li>
        </ol>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Access Token:
          </label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-2 border rounded h-32 font-mono text-xs"
            placeholder="Paste your access token here..."
          />
        </div>

        <button
          onClick={testToken}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Permissions'}
        </button>
      </div>

      {results && (
        <div className="mt-6">
          {results.success ? (
            <div className="space-y-4">
              <div className={`p-4 rounded ${results.hasUserRead ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="font-semibold">
                  {results.hasUserRead 
                    ? '✅ User.Read permission is available!' 
                    : '❌ User.Read permission is missing'}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Available Scopes:</h3>
                <div className="flex flex-wrap gap-2">
                  {results.scopes.map((scope: string) => (
                    <span key={scope} className="px-2 py-1 bg-blue-100 rounded text-sm">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {results.graphTest && (
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Graph API Test:</h3>
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(results.graphTest, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded">
              <p className="text-red-600 font-semibold">Error: {results.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Proxy API for Token Testing** (`/app/api/proxy-graph-test/route.ts`):
```typescript
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return Response.json({ error: 'No token provided' }, { status: 400 });
    }

    // Test Microsoft Graph API
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (graphResponse.ok) {
      const userData = await graphResponse.json();
      return Response.json({
        success: true,
        message: 'Graph API access successful',
        user: {
          displayName: userData.displayName,
          mail: userData.mail,
          jobTitle: userData.jobTitle,
          department: userData.department,
          officeLocation: userData.officeLocation,
          mobilePhone: userData.mobilePhone
        }
      });
    } else {
      const errorText = await graphResponse.text();
      let errorMessage = `Graph API error: ${graphResponse.status}`;
      
      if (graphResponse.status === 401) {
        errorMessage = 'Token expired or invalid';
      } else if (graphResponse.status === 403) {
        errorMessage = 'Missing User.Read permission - Ask Bhavik to add it';
      }
      
      return Response.json({
        success: false,
        error: errorMessage,
        details: errorText,
        status: graphResponse.status
      });
    }
  } catch (error: any) {
    return Response.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}
```

#### Method 3: Command Line Testing (App-Only)

Create a standalone test script for basic connectivity:

```typescript
// scripts/test-azure-connectivity.ts
import 'dotenv/config';

const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const TENANT_ID = process.env.AZURE_AD_TENANT_ID; 
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

async function testAzureConnectivity() {
  console.log('🔍 Testing Azure AD connectivity...\n');

  try {
    // Get app-only token to test basic connectivity
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID!,
          client_secret: CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        })
      }
    );

    const tokenData = await tokenResponse.json();
    
    if (tokenResponse.ok) {
      console.log('✅ Azure AD connection successful');
      console.log('📋 For User.Read testing, sign in through the browser');
      console.log('   Visit: http://localhost:3000/invoice-analyzer/api/test-graph-permissions');
    } else {
      console.error('❌ Azure AD connection failed:', tokenData);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testAzureConnectivity();
```

Run with: `npx tsx scripts/test-azure-connectivity.ts`

### Example Test Response

**Before User.Read Permission:**
```json
{
  "summary": {
    "hasUserRead": false,
    "canAccessGraph": false,
    "recommendation": "❌ User.Read permission is missing. Ask Bhavik to add it."
  },
  "details": {
    "currentUser": {
      "name": "Michael Abdo (IT-Contractor)",
      "email": "michaelabdo@vvgtruck.com",
      "image": null,
      "id": "hZDhosyyGjycubNfr2wL96T4dKu45Yz2moa4NDvRx1U"
    },
    "tokenScopes": "email openid profile",
    "tokenExpiry": "2025-08-06T20:36:50.000Z",
    "isExpired": false,
    "graphTestResult": "Forbidden: Missing User.Read permission",
    "userProfile": null
  },
  "nextSteps": [
    "1. Ask Bhavik to add User.Read permission in Azure Portal",
    "2. Have Bhavik grant admin consent",
    "3. Sign out and sign in again", 
    "4. Run this test again"
  ]
}
```

**After User.Read Permission Added:**
```json
{
  "summary": {
    "hasUserRead": true,
    "canAccessGraph": true,
    "recommendation": "✅ User.Read permission is configured correctly!"
  },
  "details": {
    "graphTestResult": "Success! User.Read permission is working",
    "userProfile": {
      "displayName": "Michael Abdo",
      "mail": "michaelabdo@vvgtruck.com", 
      "jobTitle": "IT Contractor",
      "department": "Information Technology",
      "officeLocation": "Remote"
    }
  },
  "nextSteps": [
    "✅ Permissions are configured!",
    "You can now implement the Graph API integration"
  ]
}
```

## Implementation Workflow

### 1. Permission Setup Phase

1. **Initial State**: OAuth works, but limited to basic profile (email, name)
2. **Permission Request**: Admin adds User.Read permission in Azure Portal
3. **Admin Consent**: Admin grants consent for the permission
4. **Token Refresh**: User signs out and signs in to get new token with permissions

### 2. Testing Phase

```bash
# Test the permission configuration
curl http://localhost:3000/invoice-analyzer/api/test-graph-permissions

# Expected progression:
# 1st call: "Missing User.Read permission"
# After admin adds permission + user re-signs in:
# 2nd call: "Success! User.Read permission is working"
```

### 3. Integration Phase

Once permissions are validated:

```typescript
// Access extended profile in components
const { data: session } = useSession();
const azureProfile = (session as any)?.azureProfile;

// Use for invoice routing
const userDepartment = azureProfile?.department; // "Legal", "Finance", etc.
const userLocation = azureProfile?.officeLocation; // For geo-routing
const userManager = azureProfile?.manager; // For approvals
```

## Common Issues and Solutions

### 1. Permission Not Available

**Issue**: `graphTestResult: "Forbidden: Missing User.Read permission"`

**Solution**:
1. Azure Admin adds User.Read permission
2. Admin grants consent
3. User signs out and signs in again
4. New token includes User.Read scope

### 2. Empty Profile Data

**Issue**: Permission works but profile fields are empty

**Root Cause**: Azure AD profile fields not populated

**Solutions**:
- Populate user profiles in Azure AD Admin Center
- Fields like department, jobTitle, officeLocation need to be set by IT admin
- Some fields may not be available depending on Azure AD license level

### 3. Token Expiry Issues

**Issue**: `"isExpired": true`

**Solution**: User needs to sign in again to refresh token

## Security Considerations

### 1. Minimal Permissions

- Only requests `User.Read` (read own profile)
- No access to other users' data
- No write permissions

### 2. Token Security

- Access tokens stored in secure JWT session
- Tokens expire automatically
- No long-term storage of Graph API tokens

### 3. Data Privacy

- Only retrieves user's own profile information
- No access to organization directory
- Compliant with least-privilege principle

## Usage in Invoice Routing

### Department-Based Routing

```typescript
// Example: Route invoices based on user department
const routeInvoiceByDepartment = (invoice: Invoice, userProfile: AzureADUser) => {
  switch (userProfile.department) {
    case 'Legal':
      return 'legal-team@company.com';
    case 'Finance': 
      return 'finance-team@company.com';
    case 'Operations':
      return 'ops-team@company.com';
    default:
      return 'general-invoices@company.com';
  }
};
```

### Manager-Based Approvals

```typescript
// Example: Send approval requests to manager
const getApprovalEmail = (userProfile: AzureADUser) => {
  return userProfile.managerEmail || 'default-approver@company.com';
};
```

### Location-Based Processing

```typescript
// Example: Route based on office location
const getLocationProcessor = (userProfile: AzureADUser) => {
  const location = userProfile.officeLocation || userProfile.city;
  return `invoices-${location?.toLowerCase()}@company.com`;
};
```

## Testing Checklist

- [ ] Azure AD app has User.Read permission
- [ ] Admin consent granted for User.Read
- [ ] User signed out and signed in after permission grant
- [ ] Test API endpoint returns success
- [ ] Extended profile data available in session
- [ ] Invoice routing logic uses profile data
- [ ] Error handling for missing profile data

## Future Enhancements

### 1. Group-Based Routing

Add `Directory.Read.All` permission to access user's group memberships:

```typescript
// Potential future enhancement
const userGroups = await client.api('/me/memberOf').get();
// Route based on AD security groups
```

### 2. Organizational Hierarchy

Access reporting structure for complex approval workflows:

```typescript
// Potential future enhancement  
const directReports = await client.api('/me/directReports').get();
const managementChain = await client.api('/me/manager/manager').get();
```

### 3. Calendar Integration

For scheduling and availability checking:

```typescript
// Potential future enhancement (requires Calendar.Read)
const availability = await client.api('/me/calendar/getSchedule').post({...});
```

## Troubleshooting

### Debug Steps

1. **Check Permission Test API**:
   ```bash
   curl http://localhost:3000/invoice-analyzer/api/test-graph-permissions
   ```

2. **Verify Token Scopes**:
   - Should include "User.Read" in token scopes
   - Token should not be expired

3. **Check Azure AD Profile**:
   - Go to Azure Portal → Azure AD → Users
   - Verify profile fields are populated

4. **Test Graph Explorer**:
   - Use https://developer.microsoft.com/graph/graph-explorer
   - Test `/me` endpoint with user's credentials

### Common Error Messages

- `"Forbidden: Missing User.Read permission"` → Permission not granted
- `"Unauthorized: Token might be expired"` → User needs to sign in again  
- `"Success! User.Read permission is working"` → Integration working correctly

## Complete Implementation Steps

### Step-by-Step Integration Process

1. **Pre-requisites Check**:
   ```bash
   # Ensure you have existing Azure AD OAuth setup
   # Environment variables: AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
   ```

2. **Install Dependencies**:
   ```bash
   npm install @microsoft/microsoft-graph-client
   npm install @types/microsoft-graph-client
   ```

3. **Create Test Files**:
   ```bash
   # Copy the test API endpoint
   cp /path/to/testGraphPermissions.ts app/api/test-graph-permissions/route.ts
   
   # Optional: Create manual testing page
   cp /path/to/localTestPage.tsx app/test-graph/page.tsx
   cp /path/to/proxyGraphTest.ts app/api/proxy-graph-test/route.ts
   ```

4. **Test Current State**:
   ```bash
   # Test basic Azure connectivity
   npx tsx scripts/test-azure-connectivity.ts
   
   # Test current permissions (will show missing User.Read)
   curl http://localhost:3000/invoice-analyzer/api/test-graph-permissions
   ```

5. **Request Permissions from Admin** (Bhavik):
   - Go to Azure Portal → App Registrations → Your App
   - API Permissions → Add permission → Microsoft Graph
   - Add "User.Read" (Delegated permission)
   - Click "Grant admin consent"

6. **Verify Permission Grant**:
   ```bash
   # After admin grants permission, user must sign out and sign in again
   # Then test again
   curl http://localhost:3000/invoice-analyzer/api/test-graph-permissions
   
   # Should now show: "✅ User.Read permission is configured correctly!"
   ```

7. **Implement Enhanced Auth Configuration**:
   ```bash
   # Update your auth-options.ts with the enhanced version
   # Include the Microsoft Graph API integration code
   ```

8. **Use in Application**:
   ```typescript
   // Access extended profile in your components
   const { data: session } = useSession();
   const azureProfile = (session as any)?.azureProfile;
   
   // Use for invoice routing
   const userDepartment = azureProfile?.department;
   const userLocation = azureProfile?.officeLocation;
   ```

### Files Created/Modified During Implementation

**Core Implementation Files**:
- `/lib/auth-options.ts` - Enhanced with Graph API integration
- `/SAML/azureADGraphImplementation.ts` - Complete Graph integration code

**Testing Files**:
- `/app/api/test-graph-permissions/route.ts` - Primary test endpoint
- `/app/test-graph/page.tsx` - Manual token testing page (optional)
- `/app/api/proxy-graph-test/route.ts` - Proxy for manual testing (optional)
- `/scripts/test-azure-connectivity.ts` - Command-line connectivity test

### Expected User Experience

1. **Initial State**: Basic OAuth login works, limited profile data
2. **After Permission Request**: Admin adds User.Read permission in Azure Portal
3. **After Admin Consent**: Permission available but user needs fresh token
4. **After Re-sign-in**: Full profile data available, invoice routing can use attributes
5. **Ongoing**: Extended profile cached in session, no extra API calls needed

### Production Deployment Checklist

- [ ] Azure AD app registration has User.Read permission
- [ ] Admin consent granted for User.Read
- [ ] Enhanced auth configuration deployed
- [ ] Test endpoint accessible for validation
- [ ] User attributes populate Azure AD profiles (IT task)
- [ ] Invoice routing logic updated to use profile data
- [ ] Error handling for missing profile data
- [ ] Documentation updated for team

## Conclusion

The Azure AD Graph API integration provides a robust foundation for accessing extended user profile information without requiring complex SAML implementation. The solution:

- **Seamless Integration**: Works with existing Azure AD OAuth setup
- **Comprehensive Data**: Provides full user profile including department, job title, location, manager
- **Smart Routing**: Enables sophisticated invoice routing logic based on user attributes
- **Security First**: Maintains security and privacy best practices with minimal permissions
- **Testing Tools**: Includes comprehensive testing and validation capabilities
- **Production Ready**: Complete implementation with error handling and fallbacks

The implementation successfully bridges the gap between basic OAuth authentication and the rich organizational data needed for intelligent invoice processing and routing. The test result you showed demonstrates the exact workflow from missing permissions to successful integration.