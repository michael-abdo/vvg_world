// Email Notification Service with SMTP Implementation
// Based on vvg_template email service with nodemailer and AWS SES SMTP

import { config } from '@/lib/config';
import { RoutingAction, EmailNotificationData, PriorityLevel } from '@/lib/types/data-pipeline';

// Nodemailer imports
import * as nodemailer from 'nodemailer';
import { Transporter, SendMailOptions } from 'nodemailer';

// Interface for pain point data used in emails
interface PainPointEmailData {
  id: number;
  title: string;
  description: string;
  category: string;
  submittedBy: string;
  department?: string;
  location?: string;
}

// Email template configuration
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email message interface
interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

// Email service class with SMTP implementation
export class EmailService {
  private readonly baseUrl: string;
  private transporter: Transporter | null = null;

  constructor() {
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    this.initializeTransporter();
  }

  // Initialize nodemailer transporter
  private async initializeTransporter(): Promise<void> {
    try {
      if (config.NODE_ENV === 'development' && !config.email.enableInDev) {
        console.log('📧 Email service initialized in development mode (emails will be logged, not sent)');
        return;
      }

      // Nodemailer SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass,
        },
        // Additional options for AWS SES
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
      });

      console.log('📧 Email service initialized with SMTP configuration');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  // Verify SMTP connection
  async verifyConnection(): Promise<boolean> {
    try {
      if (config.NODE_ENV === 'development' && !config.email.enableInDev) {
        console.log('📧 [DEV MODE] SMTP connection verification skipped');
        return true;
      }

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection verification failed:', error);
      return false;
    }
  }

  // Core email sending method
  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Development mode - log instead of sending
      if (config.NODE_ENV === 'development' && !config.email.enableInDev) {
        console.log('📧 [DEV MODE] Email would be sent:', {
          to: message.to,
          subject: message.subject,
          from: message.from || config.email.from,
          textPreview: message.text?.substring(0, 100) + '...',
          htmlLength: message.html?.length || 0
        });
        return { success: true, messageId: 'dev-mode-' + Date.now() };
      }

      // Staging mode - redirect to test recipient
      let recipients = message.to;
      if (config.NODE_ENV === 'staging' && config.email.testRecipient) {
        recipients = config.email.testRecipient;
        console.log('📧 [STAGING] Redirecting email to test recipient:', config.email.testRecipient);
      }

      // Production email sending
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions: SendMailOptions = {
        from: message.from || config.email.from,
        to: recipients,
        subject: message.subject,
        text: message.text,
        html: message.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      console.log('📧 Email details:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: result.messageId,
        response: result.response
      });
      
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Send routing notification to stakeholders (preserving existing interface)
  async sendRoutingNotification(data: {
    painPoint: PainPointEmailData;
    rule: any;
    stakeholders: string[];
    priority: string;
    aiAnalysis?: {
      summary: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      confidence: number;
      suggestedCategories: string[];
    };
  }): Promise<void> {
    const recipients = data.stakeholders;
    try {
      // Generate email content using existing template logic
      const emailData: EmailNotificationData & { aiAnalysis?: typeof data.aiAnalysis } = {
        to: recipients,
        subject: this.generateSubject(data.painPoint, data.priority as PriorityLevel),
        painPoint: {
          id: data.painPoint.id,
          title: data.painPoint.title,
          description: data.painPoint.description,
          category: data.painPoint.category,
          submittedBy: data.painPoint.submittedBy,
          priority: data.priority as PriorityLevel
        },
        rule: data.rule,
        actionUrl: `${this.baseUrl}/admin/ideas`,
        aiAnalysis: data.aiAnalysis
      };

      const template = this.generateEmailTemplate(emailData);

      // Send to each recipient
      for (const recipient of recipients) {
        const result = await this.sendEmail({
          to: recipient,
          subject: template.subject,
          html: template.html,
          text: template.text
        });

        if (!result.success) {
          console.error(`Failed to send routing notification to ${recipient}:`, result.error);
        }
      }

    } catch (error) {
      console.error('Error sending routing notification:', error);
      throw new Error(`Failed to send routing notification: ${error}`);
    }
  }

  // Send weekly triage summary email (preserving existing interface)
  async sendTriageSummary(
    recipients: string[], 
    summary: {
      itemsProcessed: number;
      itemsRouted: number;
      itemsFlagged: number;
      processingTime: number;
      topCategories: Array<{category: string, count: number}>;
      aiInsights?: {
        averageConfidence: number;
        sentimentBreakdown: {
          positive: number;
          neutral: number;
          negative: number;
        };
        topAICategories: Array<{category: string, count: number}>;
        processingStats: {
          aiSuccessRate: number;
          averageProcessingTime: number;
        };
      };
    }
  ): Promise<void> {
    try {
      const template = this.generateTriageSummaryTemplate(summary);
      
      for (const recipient of recipients) {
        const result = await this.sendEmail({
          to: recipient,
          subject: template.subject,
          html: template.html,
          text: template.text
        });

        if (!result.success) {
          console.error(`Failed to send triage summary to ${recipient}:`, result.error);
        }
      }

    } catch (error) {
      console.error('Error sending triage summary:', error);
      throw new Error(`Failed to send triage summary: ${error}`);
    }
  }

  // Additional utility methods from vvg_template
  async sendNotification(
    to: string,
    subject: string,
    message: string,
    isHtml: boolean = false
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject,
      html: isHtml ? message : undefined,
      text: isHtml ? undefined : message
    });
  }

  async sendSystemAlert(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const priorityColors = {
      low: '#10b981',
      medium: '#f59e0b', 
      high: '#ea580c',
      critical: '#dc2626'
    };

    const priorityEmojis = {
      low: '📝',
      medium: '⚠️',
      high: '🔥',
      critical: '🚨'
    };

    const htmlMessage = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .alert { background-color: ${priorityColors[priority]}; color: white; padding: 20px; border-radius: 8px; }
            .content { padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="alert">
            <h1>${priorityEmojis[priority]} System Alert - ${priority.toUpperCase()}</h1>
        </div>
        <div class="content">
            <h2>${title}</h2>
            <p>${message}</p>
            <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
    </body>
    </html>
    `;

    const textMessage = `
    SYSTEM ALERT - ${priority.toUpperCase()}
    
    ${title}
    
    ${message}
    
    Priority: ${priority.toUpperCase()}
    Time: ${new Date().toISOString()}
    `;

    return this.sendEmail({
      to: config.email.admin,
      subject: `${priorityEmojis[priority]} System Alert: ${title}`,
      html: htmlMessage,
      text: textMessage
    });
  }

  // Test email functionality
  async testEmail(testRecipient?: string): Promise<{ success: boolean; results: any[] }> {
    const recipient = testRecipient || config.email.testRecipient;
    const results = [];

    try {
      // Test 1: Connection verification
      console.log('🧪 Testing SMTP connection...');
      const connectionResult = await this.verifyConnection();
      results.push({ test: 'SMTP Connection', success: connectionResult });

      // Test 2: Simple notification
      console.log('🧪 Testing simple notification...');
      const notificationResult = await this.sendNotification(
        recipient,
        'Test Email - Simple Notification',
        'This is a test email from the VVG pain points platform.',
        false
      );
      results.push({ test: 'Simple Notification', success: notificationResult.success });

      // Test 3: HTML email
      console.log('🧪 Testing HTML email...');
      const htmlResult = await this.sendNotification(
        recipient,
        'Test Email - HTML Format',
        '<h1>HTML Test</h1><p>This is a <strong>test HTML email</strong> from the platform.</p>',
        true
      );
      results.push({ test: 'HTML Email', success: htmlResult.success });

      // Test 4: System alert
      console.log('🧪 Testing system alert...');
      const alertResult = await this.sendSystemAlert(
        'Email Service Test',
        'This is a test system alert to verify the email functionality.',
        'low'
      );
      results.push({ test: 'System Alert', success: alertResult.success });

      const allSuccessful = results.every(r => r.success);
      return { success: allSuccessful, results };

    } catch (error) {
      console.error('❌ Email testing failed:', error);
      return { 
        success: false, 
        results: [...results, { test: 'Overall', success: false, error: error.message }] 
      };
    }
  }

  // PRESERVED TEMPLATE METHODS FROM ORIGINAL IMPLEMENTATION
  // Generate email subject based on pain point and priority
  private generateSubject(painPoint: PainPointEmailData, priority: PriorityLevel): string {
    const priorityPrefix = priority === 'critical' ? '🚨 CRITICAL' : 
                          priority === 'high' ? '⚠️  HIGH PRIORITY' : 
                          priority === 'medium' ? '📋 MEDIUM PRIORITY' : 
                          '📝 LOW PRIORITY';

    return `${priorityPrefix}: New Pain Point - ${painPoint.title}`;
  }

  // Generate email template (PRESERVED from original - these templates are excellent!)
  private generateEmailTemplate(data: EmailNotificationData & { aiAnalysis?: any }): EmailTemplate {
    const { painPoint, rule, actionUrl, aiAnalysis } = data;
    
    const priorityColor = painPoint.priority === 'critical' ? '#dc2626' : 
                         painPoint.priority === 'high' ? '#ea580c' : 
                         painPoint.priority === 'medium' ? '#ca8a04' : 
                         '#059669';

    const priorityIcon = painPoint.priority === 'critical' ? '🚨' : 
                        painPoint.priority === 'high' ? '⚠️' : 
                        painPoint.priority === 'medium' ? '📋' : 
                        '📝';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pain Point Notification</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid ${priorityColor}; }
        .priority-badge { display: inline-block; background-color: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px; }
        .meta-info { background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0; }
        .meta-item { margin: 4px 0; font-size: 14px; }
        .meta-label { font-weight: 600; color: #4b5563; }
        .description { background-color: #f9fafb; padding: 16px; border-left: 3px solid #6b7280; margin: 16px 0; font-style: italic; }
        .action-section { background-color: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; }
        .cta-button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 16px 0; }
        .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .routing-info { background-color: #f0f9ff; padding: 12px; border-radius: 6px; margin: 12px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${priorityIcon} Pain Point Alert</h1>
        <span class="priority-badge">${painPoint.priority} Priority</span>
    </div>

    <div class="content">
        <h2>${painPoint.title}</h2>
        
        <div class="meta-info">
            <div class="meta-item"><span class="meta-label">ID:</span> #${painPoint.id}</div>
            <div class="meta-item"><span class="meta-label">Category:</span> ${painPoint.category}</div>
            <div class="meta-item"><span class="meta-label">Submitted by:</span> ${painPoint.submittedBy}</div>
            <div class="meta-item"><span class="meta-label">Priority:</span> ${painPoint.priority.toUpperCase()}</div>
        </div>

        <div class="description">
            <strong>Description:</strong><br>
            ${painPoint.description}
        </div>

        <div class="routing-info">
            <strong>🔄 Routing Information:</strong><br>
            This pain point was automatically routed to you based on the "${rule.name}" rule, which targets ${rule.category} issues${rule.department !== 'All' ? ` in the ${rule.department} department` : ''}.
        </div>

        ${aiAnalysis ? `
        <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin-top: 16px; border-left: 3px solid #10b981;">
            <h3 style="margin-top: 0; color: #047857;">🤖 AI Analysis</h3>
            
            <div style="margin: 12px 0;">
                <strong>Summary:</strong><br>
                <p style="margin: 8px 0; font-style: italic;">${aiAnalysis.summary}</p>
            </div>
            
            <div style="margin: 12px 0;">
                <strong>Sentiment Analysis:</strong>
                <span style="
                    display: inline-block;
                    margin-left: 8px;
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 12px;
                    font-weight: bold;
                    background-color: ${aiAnalysis.sentiment === 'negative' ? '#fee2e2' : aiAnalysis.sentiment === 'positive' ? '#dcfce7' : '#f3f4f6'};
                    color: ${aiAnalysis.sentiment === 'negative' ? '#dc2626' : aiAnalysis.sentiment === 'positive' ? '#16a34a' : '#6b7280'};
                ">
                    ${aiAnalysis.sentiment.toUpperCase()}
                </span>
                <span style="margin-left: 8px; font-size: 14px; color: #6b7280;">
                    (Confidence: ${Math.round(aiAnalysis.confidence * 100)}%)
                </span>
            </div>
            
            ${aiAnalysis.suggestedCategories && aiAnalysis.suggestedCategories.length > 0 ? `
            <div style="margin: 12px 0;">
                <strong>AI-Suggested Categories:</strong>
                <div style="margin-top: 8px;">
                    ${aiAnalysis.suggestedCategories.map(cat => `
                        <span style="
                            display: inline-block;
                            margin: 4px;
                            padding: 4px 12px;
                            background-color: #e0e7ff;
                            color: #4338ca;
                            border-radius: 16px;
                            font-size: 12px;
                        ">${cat}</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}
    </div>

    <div class="action-section">
        <h3>👥 Action Required</h3>
        <p>Please review this pain point and take appropriate action based on your role as a stakeholder for ${rule.category} issues.</p>
        
        ${actionUrl ? `<a href="${actionUrl}" class="cta-button">View in Dashboard →</a>` : ''}
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 16px;">
            You can review, comment, and update the status of this pain point in the admin dashboard.
        </p>
    </div>

    <div class="footer">
        <p><strong>VVG Pain Points Platform</strong></p>
        <p>This is an automated notification from the data pipeline system.</p>
        <p>If you have questions about this routing, please contact your system administrator.</p>
    </div>
</body>
</html>
    `;

    const textContent = `
PAIN POINT ALERT - ${painPoint.priority.toUpperCase()} PRIORITY

${painPoint.title}

Pain Point Details:
- ID: #${painPoint.id}
- Category: ${painPoint.category}
- Submitted by: ${painPoint.submittedBy}
- Priority: ${painPoint.priority.toUpperCase()}

Description:
${painPoint.description}

Routing Information:
This pain point was automatically routed to you based on the "${rule.name}" rule, which targets ${rule.category} issues${rule.department !== 'All' ? ` in the ${rule.department} department` : ''}.

${aiAnalysis ? `AI ANALYSIS:
Summary: ${aiAnalysis.summary}
Sentiment: ${aiAnalysis.sentiment.toUpperCase()} (Confidence: ${Math.round(aiAnalysis.confidence * 100)}%)
AI-Suggested Categories: ${aiAnalysis.suggestedCategories.join(', ')}

` : ''}Action Required:
Please review this pain point and take appropriate action based on your role as a stakeholder for ${rule.category} issues.

${actionUrl ? `View in Dashboard: ${actionUrl}` : ''}

---
VVG Pain Points Platform
This is an automated notification from the data pipeline system.
If you have questions about this routing, please contact your system administrator.
    `;

    return {
      subject: data.subject,
      html: htmlContent.trim(),
      text: textContent.trim()
    };
  }

  // Generate triage summary email template (PRESERVED from original)
  private generateTriageSummaryTemplate(summary: any): EmailTemplate {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-item { text-align: center; padding: 16px; background-color: #f8f9fa; border-radius: 8px; margin: 0 8px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #3b82f6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Weekly AI Triage Summary</h1>
    </div>
    
    <div class="stats">
        <div class="stat-item">
            <div class="stat-number">${summary.itemsProcessed}</div>
            <div>Items Processed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${summary.itemsRouted}</div>
            <div>Items Routed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${summary.itemsFlagged}</div>
            <div>Items Flagged</div>
        </div>
    </div>
    
    <p>The AI triage system successfully processed ${summary.itemsProcessed} pain points this week, routing ${summary.itemsRouted} to appropriate stakeholders and flagging ${summary.itemsFlagged} for manual review.</p>
    
    ${summary.topCategories.length > 0 ? `
    <h3>Top Categories:</h3>
    <ul>
        ${summary.topCategories.map(cat => `<li>${cat.category}: ${cat.count} items</li>`).join('')}
    </ul>
    ` : ''}
    
    ${summary.aiInsights ? `
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #047857; margin-top: 0;">🤖 AI Performance Insights</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
            <div style="background-color: white; padding: 16px; border-radius: 6px;">
                <h4 style="margin: 0 0 8px 0; color: #374151;">Average Confidence</h4>
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">
                    ${Math.round(summary.aiInsights.averageConfidence * 100)}%
                </div>
            </div>
            <div style="background-color: white; padding: 16px; border-radius: 6px;">
                <h4 style="margin: 0 0 8px 0; color: #374151;">Success Rate</h4>
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">
                    ${Math.round(summary.aiInsights.processingStats.aiSuccessRate * 100)}%
                </div>
            </div>
        </div>
        
        <h4 style="color: #374151;">Sentiment Analysis Breakdown:</h4>
        <div style="display: flex; gap: 12px; margin: 12px 0;">
            <div style="flex: 1; text-align: center; padding: 12px; background-color: #dcfce7; border-radius: 6px;">
                <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${summary.aiInsights.sentimentBreakdown.positive}</div>
                <div style="font-size: 14px; color: #374151;">Positive</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 12px; background-color: #f3f4f6; border-radius: 6px;">
                <div style="font-size: 20px; font-weight: bold; color: #6b7280;">${summary.aiInsights.sentimentBreakdown.neutral}</div>
                <div style="font-size: 14px; color: #374151;">Neutral</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 12px; background-color: #fee2e2; border-radius: 6px;">
                <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${summary.aiInsights.sentimentBreakdown.negative}</div>
                <div style="font-size: 14px; color: #374151;">Negative</div>
            </div>
        </div>
        
        ${summary.aiInsights.topAICategories && summary.aiInsights.topAICategories.length > 0 ? `
        <h4 style="color: #374151;">Top AI-Detected Categories:</h4>
        <ul style="margin: 12px 0;">
            ${summary.aiInsights.topAICategories.map(cat => `<li>${cat.category}: ${cat.count} items</li>`).join('')}
        </ul>
        ` : ''}
        
        <p style="margin-bottom: 0; font-size: 14px; color: #6b7280;">
            Average AI processing time per item: ${Math.round(summary.aiInsights.processingStats.averageProcessingTime)}ms
        </p>
    </div>
    ` : ''}
    
    <p>Total Processing Time: ${Math.round(summary.processingTime / 1000)}s</p>
</body>
</html>
    `;

    const textContent = `Weekly AI Triage Summary

Processed: ${summary.itemsProcessed} items
Routed: ${summary.itemsRouted} items
Flagged: ${summary.itemsFlagged} items
Processing Time: ${Math.round(summary.processingTime / 1000)}s

${summary.topCategories.length > 0 ? `Top Categories:
${summary.topCategories.map(cat => `- ${cat.category}: ${cat.count} items`).join('\n')}

` : ''}${summary.aiInsights ? `AI PERFORMANCE INSIGHTS:
- Average Confidence: ${Math.round(summary.aiInsights.averageConfidence * 100)}%
- Success Rate: ${Math.round(summary.aiInsights.processingStats.aiSuccessRate * 100)}%
- Average Processing Time: ${Math.round(summary.aiInsights.processingStats.averageProcessingTime)}ms per item

Sentiment Breakdown:
- Positive: ${summary.aiInsights.sentimentBreakdown.positive} items
- Neutral: ${summary.aiInsights.sentimentBreakdown.neutral} items
- Negative: ${summary.aiInsights.sentimentBreakdown.negative} items

${summary.aiInsights.topAICategories && summary.aiInsights.topAICategories.length > 0 ? `Top AI-Detected Categories:
${summary.aiInsights.topAICategories.map(cat => `- ${cat.category}: ${cat.count} items`).join('\n')}` : ''}
` : ''}`;

    return {
      subject: '🤖 Weekly AI Triage Summary - Pain Points Platform',
      html: htmlContent,
      text: textContent
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();