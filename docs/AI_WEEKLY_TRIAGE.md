# AI Weekly Triage System Documentation

## Overview

The AI Weekly Triage system is an automated feature designed to intelligently process and route idea submissions using artificial intelligence. It runs on a scheduled basis (default: weekly) to analyze pending submissions and automatically categorize, prioritize, and route them to appropriate stakeholders.

## Current Implementation Status

### ✅ Completed Components

#### 1. Database Schema (Migration 003)
The `ai_triage_config` table stores the AI triage configuration:

```sql
CREATE TABLE ai_triage_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  schedule_cron VARCHAR(255) DEFAULT '0 9 * * 1', -- Mondays at 9 AM
  last_run_at TIMESTAMP NULL,
  next_run_at TIMESTAMP NULL,
  items_processed_last_run INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. API Endpoints

**GET `/api/data-pipeline/ai-triage/status`**
- Returns current triage status including:
  - Configuration (enabled/disabled, schedule)
  - Last run details (completion time, items processed)
  - Next run details (scheduled time, pending items count)
  - Whether triage is currently running

**POST `/api/data-pipeline/ai-triage/trigger`**
- Manually triggers the AI triage process
- Starts the triage job immediately
- Returns success/failure status

#### 3. Frontend Integration

**React Hook (`useAITriage`)**
- Manages loading/error states
- Fetches triage status
- Triggers manual runs
- Provides real-time status updates

**UI Components**
- Status display showing last/next run times
- Manual trigger button
- Real-time running status indicator
- Processed items counter

### ⚠️ Missing Components

#### 1. AI Service Integration
- No connection to AI providers (OpenAI, Claude, etc.)
- No AI model configuration
- No prompt engineering system

#### 2. Triage Logic Implementation
- No submission fetching mechanism
- No AI analysis pipeline
- No routing decision logic
- No status update system

#### 3. Scheduling System
- No cron job implementation
- No automated trigger mechanism
- No schedule management

#### 4. Background Processing
- No job queue system
- No long-running task handling
- No progress tracking

#### 5. Notification System
- No stakeholder alerts
- No email integration
- No summary report generation

## System Architecture

### Data Flow
```
1. Scheduler triggers triage (weekly/manual)
   ↓
2. System fetches pending submissions
   ↓
3. AI analyzes each submission
   - Extract key information
   - Determine category/department
   - Assess priority
   - Identify stakeholders
   ↓
4. Apply routing rules
   - Match against configured rules
   - Determine final routing
   ↓
5. Update submission status
   - Mark as processed
   - Assign to stakeholders
   - Set priority
   ↓
6. Send notifications
   - Email stakeholders
   - Generate summary report
```

### Integration Points

1. **Submissions System**
   - Reads from `submissions` table
   - Updates status and assignments

2. **Routing Rules**
   - Uses configured routing rules
   - Applies AI-suggested routes

3. **AI Rules Engine**
   - Triggers AI rules based on content
   - Applies automated actions

4. **Notification System**
   - Sends emails to stakeholders
   - Creates activity logs

## Implementation Requirements

### 1. AI Service Integration
**Purpose**: Connect to an AI API for content analysis

**Requirements**:
- API key management system
- Rate limiting and quota tracking
- Error handling and retries
- Model selection and configuration
- Prompt template system

**Suggested Providers**:
- OpenAI GPT-4
- Anthropic Claude
- Google Vertex AI
- Azure OpenAI Service

### 2. Triage Logic
**Purpose**: Core processing engine for analyzing submissions

**Components**:
```typescript
interface TriageEngine {
  // Fetch pending submissions
  fetchPendingSubmissions(): Promise<Submission[]>;
  
  // Analyze single submission
  analyzeSubmission(submission: Submission): Promise<AnalysisResult>;
  
  // Apply routing logic
  determineRouting(analysis: AnalysisResult): Promise<RoutingDecision>;
  
  // Update submission with results
  updateSubmission(id: string, routing: RoutingDecision): Promise<void>;
}

interface AnalysisResult {
  category: string[];
  department: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  keywords: string[];
  sentiment: number;
  suggestedStakeholders: string[];
}
```

### 3. Cron Job System
**Purpose**: Schedule automatic triage runs

**Options**:
- **node-cron**: Simple in-process scheduling
- **Bull**: Redis-based job queue with scheduling
- **Agenda**: MongoDB-based job scheduling
- **Kubernetes CronJob**: For containerized deployments

**Implementation**:
```typescript
// Example with node-cron
import cron from 'node-cron';

// Schedule weekly triage (Mondays at 9 AM)
cron.schedule('0 9 * * 1', async () => {
  await triggerAITriage();
});
```

### 4. Background Job Processing
**Purpose**: Handle long-running triage operations

**Requirements**:
- Job queue system
- Progress tracking
- Error recovery
- Concurrent processing
- Resource management

**Architecture**:
```typescript
interface JobProcessor {
  // Queue a triage job
  queueTriageJob(options: TriageOptions): Promise<Job>;
  
  // Track job progress
  getJobStatus(jobId: string): Promise<JobStatus>;
  
  // Handle job failures
  retryFailedJob(jobId: string): Promise<void>;
}
```

### 5. Notification System
**Purpose**: Alert stakeholders about routed submissions

**Components**:
- Email service integration
- Notification templates
- Delivery tracking
- Summary report generation

**Example Flow**:
```typescript
interface NotificationService {
  // Send individual routing notification
  notifyStakeholder(
    stakeholder: string, 
    submission: Submission,
    routing: RoutingDecision
  ): Promise<void>;
  
  // Send weekly summary
  sendTriageSummary(
    results: TriageResults
  ): Promise<void>;
}
```

## Configuration

### Environment Variables
```env
# AI Service Configuration
AI_PROVIDER=openai
AI_API_KEY=your_api_key
AI_MODEL=gpt-4
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7

# Job Processing
REDIS_URL=redis://localhost:6379
JOB_CONCURRENCY=5
JOB_TIMEOUT_MINUTES=30

# Notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@company.com
SMTP_PASS=your_password
NOTIFICATION_FROM=AI Triage System <ai@company.com>

# Triage Configuration
TRIAGE_BATCH_SIZE=50
TRIAGE_ENABLED=true
TRIAGE_SCHEDULE="0 9 * * 1"
```

### AI Prompt Templates
```typescript
const ANALYSIS_PROMPT = `
Analyze the following idea submission and provide:
1. Relevant categories (Tech, Product, Culture, etc.)
2. Appropriate departments
3. Priority level (low/medium/high/critical)
4. Key stakeholders who should review this
5. Brief summary (2-3 sentences)

Submission:
Title: {title}
Description: {description}
Submitted by: {author}

Provide response in JSON format.
`;
```

## Testing Strategy

### Unit Tests
- AI service mocking
- Triage logic validation
- Routing rule application
- Database operations

### Integration Tests
- End-to-end triage flow
- API endpoint testing
- Job processing verification
- Notification delivery

### Performance Tests
- Large batch processing
- Concurrent job handling
- AI API rate limiting
- Database query optimization

## Monitoring & Analytics

### Key Metrics
- Submissions processed per run
- Average processing time
- AI accuracy (based on feedback)
- Routing accuracy
- System errors and retries

### Dashboards
- Real-time triage status
- Historical performance trends
- Error rates and types
- Stakeholder engagement metrics

## Security Considerations

1. **API Key Management**
   - Secure storage (AWS Secrets Manager, etc.)
   - Key rotation policies
   - Access controls

2. **Data Privacy**
   - PII handling in submissions
   - AI data retention policies
   - Audit logging

3. **Rate Limiting**
   - Protect AI API quotas
   - Prevent system overload
   - Fair resource allocation

## Future Enhancements

1. **Machine Learning**
   - Train custom models on historical data
   - Improve routing accuracy over time
   - Anomaly detection

2. **Advanced Analytics**
   - Trend analysis across submissions
   - Predictive prioritization
   - Stakeholder workload balancing

3. **Integration Expansion**
   - Slack/Teams notifications
   - JIRA/ServiceNow ticket creation
   - Custom webhook support

## EC2 Deployment with Linux Cron

### Setting Up EC2 Cron Jobs

1. **Environment Configuration**
   - Copy `.env.production.example` to `.env.production`
   - Update all configuration values, especially:
   ```bash
   CRON_SECRET=<generate-secure-random-string>
   INTERNAL_API_SECRET=<generate-secure-random-string>
   OPENAI_API_KEY=<your-openai-api-key>
   API_URL=https://legal.vtc.systems/vvg-world
   ```

2. **Deploy Application**
   ```bash
   # Run the main deployment script
   ./deployment/deploy.sh
   
   # This automatically:
   # - Sets up the application
   # - Configures Linux cron job
   # - Makes scripts executable
   ```

3. **Verify Cron Configuration**
   ```bash
   # Check that cron job was installed
   crontab -l
   
   # Should show:
   # 0 9 * * 1 /home/ubuntu/vvg-app/scripts/ai-triage-cron.sh
   ```

### Testing Cron Jobs

**Local Testing:**
```bash
# Use the test script
./scripts/test-ai-triage.sh

# Test with production config
./scripts/test-ai-triage.sh .env.production

# Test specific endpoint manually
curl -X GET http://localhost:3000/api/cron/ai-triage \
  -H "Authorization: Bearer your-cron-secret-here"
```

**Production Testing (on EC2):**
```bash
# Test the cron script directly
sudo su - ubuntu
cd /home/ubuntu/vvg-app
./scripts/ai-triage-cron.sh

# Or test via API
./scripts/test-ai-triage.sh .env.production
```

### Monitoring Cron Jobs

1. **Linux Cron Logs**
   ```bash
   # View cron system logs
   sudo tail -f /var/log/cron
   
   # View AI triage specific logs
   tail -f /home/ubuntu/logs/vvg-app/ai-triage-cron.log
   ```

2. **Application Logs**
   ```bash
   # PM2 application logs
   pm2 logs vvg-app
   
   # AI triage logs stored in `ai_triage_logs` table
   # Check processing summary for each run
   ```

3. **Error Handling**
   - Failed runs are logged to `/home/ubuntu/logs/vvg-app/ai-triage-cron.log.errors`
   - Check application health: `curl http://localhost:3000/api/health`
   - Restart application if needed: `pm2 restart vvg-app`

### Security Considerations

1. **Authentication**
   - Cron endpoints protected by `CRON_SECRET`
   - Internal API calls use `INTERNAL_API_SECRET`
   - Production mode enforces authentication

2. **File Permissions**
   - Cron scripts are executable by ubuntu user only
   - Environment files have restricted permissions
   - Log files are owned by ubuntu user

3. **Environment Variables**
   - Never commit secrets to repository
   - Use secure random strings for all secrets
   - Rotate secrets regularly
   - Environment file: `/home/ubuntu/vvg-app/.env.production`

### Maintenance Commands

```bash
# Check cron job status
crontab -l

# Manually trigger AI triage
/home/ubuntu/vvg-app/scripts/ai-triage-cron.sh

# View recent logs
tail -100 /home/ubuntu/logs/vvg-app/ai-triage-cron.log

# Test the system
/home/ubuntu/vvg-app/scripts/test-ai-triage.sh .env.production

# Restart application
pm2 restart vvg-app
```

## Conclusion

The AI Weekly Triage system provides an automated, intelligent solution for processing idea submissions at scale. With the implementation of OpenAI integration and EC2 Linux Cron jobs, the system can now:

1. **Automatically analyze submissions** using AI every Monday at 9 AM
2. **Route submissions** to appropriate stakeholders based on AI-suggested categories  
3. **Send notifications** with AI insights and analysis
4. **Track performance** through comprehensive logging
5. **Scale reliably** on EC2 infrastructure with PM2 process management

The system is designed to be extensible and can be enhanced with additional features like custom AI models, advanced routing logic, and integration with third-party services. The EC2 deployment provides better control, reliability, and cost-effectiveness compared to serverless alternatives.