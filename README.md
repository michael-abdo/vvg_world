# VVG World

Generic document processing template with upload, extraction, and management features.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables in .env.local
# (Database, AWS, OpenAI credentials)

# Start clean development server
npm run dev

# OR start with test documents seeded automatically
npm run dev:seed
```

## Available Commands

### Development
- **`npm run dev`** - Start development server
- **`npm run dev:clean`** - Start with port cleanup
- **`npm run dev:seed`** - Start server + automatically seed test documents

### Production
- **`npm run build`** - Build for production
- **`npm run start`** - Start production server
- **`npm run lint`** - Run linting
- **`npm run db:migrate`** - Run database migrations

## Environment Setup

Requires these environment variables in `.env.local`:

```bash
# Database (MySQL via SSM tunnel)
MYSQL_HOST=127.0.0.1
MYSQL_PORT=10003
MYSQL_USER=your-username
MYSQL_PASSWORD="your-password"
MYSQL_DATABASE=vvg_world

# Authentication (Azure AD)
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Storage (AWS S3)
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=vvg-cloud-storage

# AI Analysis (OpenAI)
OPENAI_API_KEY=your-openai-key
```

## Database Connection

Start SSM tunnel for database access:

```bash
aws ssm start-session --target i-07fba3edeb2e54729 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters host="vtcawsinnovationmysql01-cluster.cluster-c1hfshlb6czo.us-west-2.rds.amazonaws.com",portNumber="3306",localPortNumber="10003"
```

## Features

- **Document Upload**: Upload NDAs in PDF, DOCX, or TXT format
- **AI Analysis**: Compare documents using OpenAI GPT models
- **Template Management**: Standard VVG templates vs third-party NDAs
- **Secure Storage**: AWS S3 with local fallback for development
- **Authentication**: Azure AD integration

## Code Organization

### Centralized Utilities & Components

The codebase follows DRY (Don't Repeat Yourself) principles with centralized utilities and reusable components:

#### `lib/utils.ts`
- **`ApiErrors`** - Standardized API error responses (401, 404, 400, 500, etc.)
- **`FileValidation`** - Centralized file upload validation
  - Allowed types: PDF, DOCX, DOC, TXT
  - Max size: 10MB
  - MIME type detection
  - Validation error handling
- **`requireDevelopment()`** - Development environment enforcement

#### `lib/auth-utils.ts`
- **`withAuth()`** - Higher-order function for API route authentication
- Replaces inline session checking across all protected endpoints

#### `components/page-container.tsx`
- **`PageContainer`** - Consistent page layout wrapper
- Provides standard container spacing (p-8)
- Accepts optional className for customization

#### `components/page-title.tsx`
- **`PageTitle`** - Consistent page headings
- Supports optional description text
- Standard text-3xl font-bold styling

#### Usage Examples

```typescript
// API routes with authentication
export const GET = withAuth(async (request: NextRequest, userEmail: string) => {
  // userEmail is guaranteed to exist
});

// File validation
const validationError = FileValidation.getValidationError(file);
if (validationError) return validationError;

// Standardized error responses
return ApiErrors.unauthorized();
return ApiErrors.notFound('Document');

// Page layout components
<PageContainer>
  <PageTitle description="Optional description">
    Page Title
  </PageTitle>
  {/* Page content */}
</PageContainer>
```

### Eliminated Duplicates

The following duplicate files were removed during DRY refactoring:
- `components/ui/use-mobile.tsx` → use `hooks/use-mobile.tsx`
- `hooks/use-toast.ts` → use `components/ui/use-toast.ts`
- `styles/globals.css` → use `app/globals.css`
- `tests/documents/` → consolidated into `documents/vvg/`

### DRY Refactoring (Phase 2)

Additional consolidations completed:
- **Authentication**: All API routes now use `withAuth()` HOF from `lib/auth-utils.ts`
- **Validation**: Common validations moved to `lib/utils.ts`:
  - `parseDocumentId()` - Validates document IDs from route params
  - `isDocumentOwner()` - Checks document ownership
- **Error Handling**: Consistent use of `ApiErrors` utilities across all API routes
- **Database Operations**: Added `withDbErrorHandling()` wrapper in `lib/nda/database.ts`

### DRY Refactoring (Phase 3) - Complete Consolidation

Major consolidations completed in this phase:

#### 1. **Environment Configuration** (`lib/config.ts`)
- Centralized all environment variable access into a single typed configuration module
- Replaced 20+ instances of direct `process.env` usage
- Added TypeScript interfaces for type safety
- Automatic validation in production environments
- Added `S3_FOLDER_PREFIX` support for multi-tenant storage

#### 2. **Document Access Middleware** (`lib/auth-utils.ts`)
- Created `withDocumentAccess()` middleware that combines:
  - Authentication checking
  - Document ID validation
  - Document retrieval
  - Ownership verification
- Reduced boilerplate in all document-related endpoints by ~20 lines each
- Example usage:
  ```typescript
  export const GET = withDocumentAccess(async (request, userEmail, document, context) => {
    // document is already validated and ownership checked
    return NextResponse.json(document);
  });
  ```

#### 3. **Test Endpoints Consolidation** (`app/api/test/route.ts`)
- Merged 5 separate test endpoints into a single unified endpoint:
  - `/api/test-db` → `/api/test?operation=db`
  - `/api/test-crud` → `/api/test?operation=crud`
  - `/api/test-upload` → `/api/test` (POST with `operation: 'upload'`)
  - `/api/test-extraction` → `/api/test?operation=documents`
  - `/api/test-compare` → `/api/test` (POST with `operation: 'compare'`)
- Created `requireDevelopment()` middleware for consistent dev-only guards
- Reduced code duplication by ~70%

#### 4. **Standardized Response Helpers** (`lib/auth-utils.ts`)
- Added `ApiResponse` utility with methods:
  - `success()` - Standard success response
  - `list()` - Paginated list response
  - `created()` - 201 Created response
  - `noContent()` - 204 No Content response
- Enhanced error handling with `withErrorHandler()` wrapper
- Combined wrappers: `withAuthAndErrorHandling()`, `withAuthDynamicAndErrorHandling()`

#### 5. **Storage Initialization** (`lib/storage/index.ts`)
- Added `ensureStorageInitialized()` for idempotent initialization
- Created storage middleware wrappers:
  - `withStorage()` - Ensures storage is initialized
  - `withAuthAndStorage()` - Combined auth + storage
  - `withAuthDynamicAndStorage()` - For dynamic routes
- Auto-initialization in development mode

#### 6. **Error Logging System** (`lib/error-logger.ts`)
- Created centralized error logging with context tracking
- `ApiError` class with status codes and context
- `ErrorLogger` with structured logging:
  - Development: Human-readable console output
  - Production: JSON structured logs
- Error factory functions for common error types
- Ready for integration with external services (Sentry, etc.)

#### 7. **Middleware Simplification** (`middleware.ts`)
- Cleaned up authentication middleware exclusions
- Reduced from listing individual test endpoints to single `/api/test` exclusion

### DRY Refactoring (Phase 4) - Final Consolidation

Completed comprehensive DRY refactoring with focus on eliminating remaining code duplication:

#### 1. **Type Consolidation** (`types/nda/index.ts`)
- Consolidated all Document-related interfaces into single location
- Fixed database schema alignment (document1_id/document2_id)
- Eliminated duplicate type definitions across components

#### 2. **API Response Patterns** (`lib/auth-utils.ts`)
- Extended ApiResponse with new methods:
  - `successWithMeta()` - Success with additional metadata
  - `list()` - Paginated list responses
  - All responses now follow consistent structure

#### 3. **Request Parsing Utilities** (`lib/auth-utils.ts`)
- Added centralized request parsing:
  - `parseJsonBody()` - Safe JSON body parsing with validation
  - `parseFormData()` - Form data parsing with error handling
  - `validateRequiredFields()` - Field validation helper
- Updated all API routes to use standardized parsing

#### 4. **Database Error Handling** (`lib/nda/database.ts`)
- Enhanced `withDbErrorHandling()` with detailed context
- Added safe database operation wrappers:
  - `safeQuery()` - Query with automatic error handling
  - `safeInsert()` - Insert with proper error context
  - `safeUpdate()` - Update with affected rows check
  - `safeDelete()` - Delete with confirmation
- Replaced all raw `executeQuery` calls (~18 instances)

#### 5. **Loading State Hooks** (`lib/hooks.ts`)
- Created `useApiData` hook for consistent API data fetching:
  - Automatic loading state management
  - Error handling with retry logic
  - Data transformation support
  - Auto-refresh on dependency changes
- Added specialized hooks:
  - `useFileUpload` - File upload with progress tracking
  - `useAsyncOperation` - Generic async operation management
  - `usePolling` - Data polling with interval control
- Updated all components to use consolidated hooks

#### 6. **File Operations Consolidation** (`lib/text-extraction.ts`)
- Created `processUploadedFile()` utility:
  - File validation and hashing
  - Duplicate detection
  - Storage upload
  - Database record creation
  - Queue task creation
- Added `processTextExtraction()` for extraction workflow
- Reduced upload route from 100+ lines to ~30 lines

#### 7. **Component Props Standardization** (`types/nda/index.ts`)
- Consolidated all component prop interfaces:
  - `UploadNDAProps`
  - `DocumentCardProps`
  - `DocumentWithUIFields`
  - `ComparisonResult`
  - `Comparison`
- Eliminated duplicate interface definitions in components

### Benefits of DRY Refactoring

1. **Code Reduction**: Eliminated ~800+ lines of duplicate code
2. **Type Safety**: All configuration, middleware, and components now fully typed
3. **Maintainability**: Single source of truth for all common patterns
4. **Error Handling**: Consistent error responses and logging across all endpoints
5. **Developer Experience**: Less boilerplate, more focus on business logic
6. **Testing**: Easier to test with consolidated utilities
7. **Performance**: Reusable hooks prevent unnecessary re-renders and API calls
8. **Consistency**: All API responses, error handling, and UI patterns standardized

## Project Structure

```
NDA/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── compare/           # Document comparison page
│   ├── documents/         # Document library page
│   └── upload/            # Upload page
├── components/            # React components
│   └── ui/               # UI components (shadcn/ui)
├── database/              # Database migrations
│   └── migrations/       # SQL migration files
├── deployment/            # Deployment configurations
├── docs/                  # Documentation
│   ├── MASTER.md         # Master documentation
│   ├── STATUS.md         # Project status & development log
│   └── git-workflow.md   # Git workflow strategy
├── documents/             # Sample NDA documents
│   ├── third-party/      # Third-party NDAs
│   └── vvg/              # VVG standard templates
├── hooks/                 # React hooks
├── lib/                   # Library code
│   ├── nda/              # NDA-specific modules
│   └── storage/          # Storage abstraction
├── public/                # Static assets
├── scripts/               # Build and dev scripts
│   ├── database/         # Database scripts
│   ├── dev/              # Development scripts
│   └── tests/            # Test scripts
├── tests/                 # Test files
├── types/                 # TypeScript type definitions
└── @types/                # Custom type declarations
    └── pdf-parse/        # Types for pdf-parse module
```

## Architecture

See [`docs/MASTER.md`](docs/MASTER.md) for detailed system architecture and tech stack.

## CI/CD & Deployment

### Automated Deployment

This project uses GitHub Actions for automated deployment:

- **Staging**: Automatically deploys on push to `main-staging` branch
- **Production**: Automatically deploys on version tags (`v*`)

### GitHub Secrets Required

Configure these secrets in your GitHub repository settings:

```
EC2_SSH_KEY      # SSH private key for EC2 access
EC2_HOST         # EC2 instance public IP (e.g., 3.25.209.115)
EC2_USER         # EC2 user (typically 'ubuntu')
```

### Manual Deployment

Deploy using GitHub Actions:
```bash
# Deploy to staging
git push origin main-staging

# Deploy to production (create a version tag)
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### AWS SSM Access

Connect to EC2 instance using AWS SSM:
```bash
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg
```

### Deployment URLs

- **Production**: https://legal.vtc.systems/vvg-template
- **Staging**: https://legal.vtc.systems:8443/vvg-template-staging

### Additional Documentation

- [AWS SSM Guide](deployment/AWS_SSM_GUIDE.md) - Detailed SSM connection instructions
- [Rollback Procedures](deployment/ROLLBACK_PROCEDURES.md) - Emergency rollback steps
- [NGINX Configuration](deployment/nginx.vvg-template.conf) - Web server configuration