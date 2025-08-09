# {PROJECT_DISPLAY_NAME} - Master Documentation

**This is the single source of truth. All other documents reference this file.**

Last Updated: 2025-07-06 | Version: 1.2.0

---

## 🏗️ System Architecture

### Tech Stack (Locked In)
- **Frontend**: Next.js 15.2.4 with TypeScript
- **Authentication**: Azure AD via NextAuth  
- **Database**: MySQL via AWS RDS
- **Storage**: AWS S3 (vvg-cloud-storage bucket)
- **AI**: OpenAI GPT-4 (configured)
- **Deployment**: EC2 + NGINX + PM2

### Core Components
1. **Upload System**: `/app/api/upload` → S3 storage + text extraction queue
2. **Text Extraction**: Real PDF/DOCX/TXT extraction using pdf-parse & mammoth
3. **Queue Processor**: `/app/api/process-queue` → background text extraction
4. **Comparison Engine**: `/app/api/compare` → AI analysis (uses extracted text)
5. **Document Library**: User document management with extracted text
6. **Export System**: PDF/DOCX generation (not yet implemented)

### Database Schema
Source: `/app/api/migrate-db/route.ts`

#### Tables:
1. **nda_documents** - Stores uploaded NDA metadata
   - File information (hash, size, S3 URL)
   - Processing status
   - Extracted text content
   - Standard template flag

2. **nda_comparisons** - Stores comparison results
   - Links two documents
   - AI analysis results
   - Similarity scores
   - Key differences and suggestions

3. **nda_exports** - Tracks generated reports
   - Export format (PDF/DOCX)
   - Download tracking
   - S3 storage URLs

4. **nda_processing_queue** - Async task queue
   - Text extraction tasks
   - Comparison tasks
   - Export generation tasks

#### Database Abstraction Layer
The database abstraction layer (`/lib/nda/database.ts`) provides:
- **In-memory storage** when database CREATE access is not available
- **MySQL storage** when full database access is granted
- **Seamless transition** between the two modes

---


---

## 🚀 Implementation Plan

### Phase 1: MVP Features (Current)
1. Fix S3 bucket configuration
2. Build document library with mock data
3. Create comparison UI

### Phase 2: Database Integration (Blocked)
1. Run schema migration
2. Connect upload to database
3. Implement real queries

### Phase 3: AI Integration (In Progress)
1. ✅ Integrate text extraction (COMPLETED - pdf-parse, mammoth)
2. 🔴 Connect OpenAI API (API key configured, implementation needed)
3. 🔴 Build export system

### Phase 4: Deployment (Ready)
- Deployment files created: nginx config, PM2 config, deploy script
- EC2 access needed for final deployment


---

## 🔧 Developer Guide

### DRY Refactoring Implementation

#### Centralized Utilities
The codebase follows DRY (Don't Repeat Yourself) principles with centralized utilities:

##### `lib/utils.ts`
- **`ApiErrors`** - Standardized API error responses (401, 404, 400, 500, etc.)
- **`FileValidation`** - Centralized file upload validation
  - Allowed types: PDF, DOCX, DOC, TXT
  - Max size: 10MB
  - MIME type detection
- **`requireDevelopment()`** - Development environment enforcement
- **`parseDocumentId()`** - Validates document IDs from route params
- **`isDocumentOwner()`** - Checks document ownership

##### `lib/auth-utils.ts`
- **`withAuth()`** - Higher-order function for API route authentication with automatic timing tracking
- **`withAuthDynamic()`** - For dynamic routes with parameters and timing
- **`withDocumentAccess()`** - For routes that need document ownership validation
- **`withComparisonAccess()`** - For comparison routes validating two document ownership
- **`withRateLimit()`** - Rate limiting wrapper for expensive operations
- **`ApiResponse`** - Standardized success response utilities
  - `ApiResponse.operation()` - Standard operation response format
  - Consistent response structure across all endpoints

##### `lib/services/document-service.ts`
- **`getDocumentUrls()`** - Centralized URL generation for document downloads
- Handles both S3 signed URLs and local storage URLs
- Single source of truth for document URL logic

##### `lib/text-extraction.ts`
- **Text extraction utilities** - PDF, DOCX, TXT extraction
- **Text analysis utilities** - Added in DRY refactoring:
  - `getTextStats()` - Comprehensive text statistics
  - `findSections()` - Document section detection
  - `calculateSimilarity()` - Jaccard similarity calculation

##### Components
- **`PageContainer`** - Consistent page layout wrapper
- **`PageTitle`** - Consistent page headings

#### TypeScript Fixes Applied
- ✅ Enum export issues resolved
- ✅ withAuth type issues fixed with separate dynamic function
- ✅ pdf-parse type declarations added
- ✅ Buffer type compatibility fixed
- ✅ Nullable return types handled

### API Patterns
All APIs use the centralized authentication wrapper:
```typescript
// Static routes with automatic timing
export const GET = withAuth(async (request, userEmail) => {
  // userEmail is guaranteed to exist
  // X-Processing-Time header added automatically
});

// Dynamic routes
export const GET = withAuthDynamic<{ id: string }>(
  async (request, userEmail, context) => {
    const documentId = context.params.id;
    // ...
  }
);

// Document access routes
export const GET = withDocumentAccess(async (
  request, userEmail, document, context
) => {
  // document ownership already validated
});

// Comparison routes
export const POST = withComparisonAccess(async (
  request, userEmail, doc1, doc2
) => {
  // Both documents ownership validated
});

// Rate limited routes
export const POST = withRateLimit(
  compareRateLimiter,
  async (request, userEmail) => {
    // Rate limit headers added automatically
  }
);

// Standardized responses
return ApiErrors.unauthorized();
return ApiErrors.notFound('Document');
return ApiResponse.operation('upload', {
  result: { documentId, url },
  status: 'created'
});
```

### Code Patterns

**Text Extraction Workflow**:
```typescript
// 1. On upload, queue extraction
await queueDb.enqueue({
  document_id: document.id,
  task_type: TaskType.EXTRACT_TEXT,
  priority: 5
})

// 2. Process queue (manually or via cron)
POST /api/process-queue

// 3. Extraction uses unified function
import { extractText } from '@/lib/text-extraction'
const content = await extractText(buffer, filename, hash)
```

**Database Queries**:
```typescript
import { executeQuery } from '@/lib/db'

const documents = await executeQuery({
  query: 'SELECT * FROM nda_documents WHERE user_id = ?',
  values: [session.user.email]
})
```

**S3 Upload**:
```typescript
const s3Key = `${process.env.S3_FOLDER_PREFIX}users/${userEmail}/documents/${fileHash}/${filename}`
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.S3_BUCKET_NAME,
  Key: s3Key,
  Body: buffer
}))
```

---

## 📋 Requirements

### Core Features
1. **Upload NDAs** - PDF/DOCX support with deduplication
2. **Compare Documents** - AI-powered analysis
3. **View Results** - Side-by-side comparison
4. **Export Summary** - PDF/DOCX download

### User Workflows
1. Login → Upload Standard NDA → Mark as template
2. Upload Third-party NDA → Select comparison → View results
3. Review suggestions → Export summary

### Success Metrics
- Upload: < 30 seconds for 10MB
- Comparison: < 2 minutes
- 95% text extraction accuracy

### API Endpoints

**Implemented**:
- `POST /api/upload` - Upload document to S3
- `POST /api/compare` - Compare two documents (mock)
- `GET /api/test-db` - Test database connection
- `POST /api/migrate-db` - Run schema migration

**To Implement**:
- `GET /api/documents` - List user's documents
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/set-standard` - Mark as standard
- `GET /api/comparisons` - List comparison history
- `POST /api/export` - Generate PDF/DOCX

---


---

## 🗄️ Storage Abstraction Layer

### Overview
The storage abstraction provides a unified interface for file storage that works with both local filesystem (development) and AWS S3 (production).

### Architecture
- **Local Storage Provider**: Stores files in `.storage/` directory with metadata
- **S3 Storage Provider**: Full S3 feature support for production
- **Automatic Provider Selection**: Based on environment configuration

### Configuration
```bash
# Storage provider selection
STORAGE_PROVIDER=local  # or 's3'
S3_ACCESS=false         # Set to 'true' to auto-select S3

# Local storage
LOCAL_STORAGE_PATH=.storage

# S3 configuration
S3_BUCKET_NAME=vvg-cloud-storage
S3_FOLDER_PREFIX={PROJECT_NAME}/
```

### Usage
```typescript
import { storage } from '@/lib/storage';
import { ndaPaths } from '@/lib/storage';

// Initialize
await storage.initialize();

// Upload
const result = await storage.upload(
  ndaPaths.document(userId, fileHash, filename),
  buffer,
  { contentType: 'application/pdf' }
);

// Download
const download = await storage.download(path);

// Check provider
if (storage.isLocal()) {
  console.log('Using local storage');
}
```

---

## 🚀 Deployment Configuration

### EC2 Deployment Files
| File | Purpose | Status |
|------|---------|--------|
| `.env.production` | Production environment variables | ✅ Ready |
| `nginx-site.conf` | NGINX server configuration | ✅ Ready |
| `ecosystem.config.js` | PM2 process management | ✅ Ready |
| `deploy.sh` | Automated deployment script | ✅ Ready |

### Current Blocker
**Cannot access EC2 instance**: SSM session fails with EOF error
- Instance ID: `i-035db647b0a1eb2e7`
- Domain: `legal.vtc.systems`
- Need SSH key or SSM permissions from AWS admin

### Deployment Process
When EC2 access is granted:
```bash
# Copy files and deploy
scp -r deployment/ ubuntu@legal.vtc.systems:~/
ssh ubuntu@legal.vtc.systems
cd ~/deployment
./deploy.sh
```

---

## 🧪 Testing Documentation

### Local Testing Checklist
#### Phase 1: Core Functionality (Can Test Now)
- Build & development commands
- Storage abstraction layer
- Database abstraction layer
- Authentication middleware
- File validation utilities
- UI components & pages

#### Phase 2: Infrastructure Testing (Requires Access)
- Database migration
- S3 operations
- Production deployment
- EC2 access validation

### Test Results Summary
- **26 Test Cases Executed**: 26 ✅ PASSED, 0 ❌ FAILED
- **4 Critical System Components**: All validated successfully
- **Risk Assessment**: Low risk for Phase 2 deployment
- **Rollback Validation**: Baseline still functional

---

## 📞 Contact Directory

- **Database/EC2**: Satyen
- **Azure AD**: Bhavik  
- **AWS/S3**: AWS Admin
- **Deployment**: Jack

---

## 📚 Document Map

- **Quick Start & Running**: See `README.md`
- **Current Status & Blockers**: See `docs/STATUS.md`  
- **Git Workflow**: See `docs/git-workflow.md`
- **Deployment Files**: See `deployment/` directory

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-07-03 | Initial master document |
| 1.0.1 | 2025-07-03 | Updated blockers: EC2 access, deployment files ready |
| 1.0.2 | 2025-07-04 | Consolidated documentation, OpenAI configured, simplified workflow |
| 1.1.0 | 2025-07-05 | Major consolidation: merged database, storage, deployment, testing, DRY refactoring docs |
| 1.2.0 | 2025-07-06 | Complete DRY refactoring: automated timing, centralized responses, extracted text utilities |

---

**Remember**: This document is the source of truth. Update here first, then propagate to other docs if needed.