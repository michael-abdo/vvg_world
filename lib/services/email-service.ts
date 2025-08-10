// Email Notification Service
// Handles sending email notifications for data pipeline routing

import { RoutingAction, EmailNotificationData, PriorityLevel } from '@/lib/types/data-pipeline';

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

// Email service class
export class EmailService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
  }

  // Send routing notification to stakeholders
  async sendRoutingNotification(
    recipients: string[],
    painPoint: PainPointEmailData,
    action: RoutingAction
  ): Promise<void> {
    try {
      // In development, just log the email instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV MODE] Would send routing notification email:', {
          to: recipients,
          subject: this.generateSubject(painPoint, action.priority),
          painPoint: {
            id: painPoint.id,
            title: painPoint.title,
            category: painPoint.category,
            priority: action.priority
          },
          rule: action.metadata
        });
        return;
      }

      // Generate email content
      const emailData: EmailNotificationData = {
        to: recipients,
        subject: this.generateSubject(painPoint, action.priority),
        painPoint: {
          id: painPoint.id,
          title: painPoint.title,
          description: painPoint.description,
          category: painPoint.category,
          submittedBy: painPoint.submittedBy,
          priority: action.priority
        },
        rule: {
          id: action.ruleId,
          name: action.metadata?.ruleName || 'Routing Rule',
          category: action.metadata?.category || painPoint.category,
          department: action.metadata?.department || 'All',
          stakeholders: recipients,
          priority: action.priority,
          autoRoute: true,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        actionUrl: `${this.baseUrl}/admin/ideas`
      };

      const template = this.generateEmailTemplate(emailData);

      // In production, this would integrate with AWS SES, SendGrid, etc.
      // For now, we'll simulate sending
      await this.sendEmail(recipients, template);

    } catch (error) {
      console.error('Error sending routing notification:', error);
      throw new Error(`Failed to send routing notification: ${error}`);
    }
  }

  // Generate email subject based on pain point and priority
  private generateSubject(painPoint: PainPointEmailData, priority: PriorityLevel): string {
    const priorityPrefix = priority === 'critical' ? '🚨 CRITICAL' : 
                          priority === 'high' ? '⚠️  HIGH PRIORITY' : 
                          priority === 'medium' ? '📋 MEDIUM PRIORITY' : 
                          '📝 LOW PRIORITY';

    return `${priorityPrefix}: New Pain Point - ${painPoint.title}`;
  }

  // Generate email template
  private generateEmailTemplate(data: EmailNotificationData): EmailTemplate {
    const { painPoint, rule, actionUrl } = data;
    
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

Action Required:
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

  // Send email using configured email service
  private async sendEmail(recipients: string[], template: EmailTemplate): Promise<void> {
    try {
      // This is where you would integrate with your email service
      // Examples: AWS SES, SendGrid, Mailgun, etc.
      
      if (process.env.NODE_ENV === 'production' && process.env.AWS_SES_REGION) {
        // AWS SES integration would go here
        await this.sendViaAWSSES(recipients, template);
      } else {
        // Development mode - just log
        console.log('📧 Email would be sent to:', recipients);
        console.log('📧 Subject:', template.subject);
        console.log('📧 Text preview:', template.text.substring(0, 200) + '...');
      }

    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // AWS SES integration (placeholder for production)
  private async sendViaAWSSES(recipients: string[], template: EmailTemplate): Promise<void> {
    // This would integrate with AWS SES
    // Example implementation would use AWS SDK
    console.log('📧 [PRODUCTION] Sending via AWS SES to:', recipients);
    
    // Placeholder for actual AWS SES implementation
    // const ses = new AWS.SES({ region: process.env.AWS_SES_REGION });
    // const params = {
    //   Source: process.env.FROM_EMAIL,
    //   Destination: { ToAddresses: recipients },
    //   Message: {
    //     Subject: { Data: template.subject },
    //     Body: {
    //       Html: { Data: template.html },
    //       Text: { Data: template.text }
    //     }
    //   }
    // };
    // await ses.sendEmail(params).promise();
  }

  // Send weekly triage summary email
  async sendTriageSummary(
    recipients: string[], 
    summary: {
      itemsProcessed: number;
      itemsRouted: number;
      itemsFlagged: number;
      processingTime: number;
      topCategories: Array<{category: string, count: number}>;
    }
  ): Promise<void> {
    try {
      const template = this.generateTriageSummaryTemplate(summary);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV MODE] Would send triage summary to:', recipients);
        console.log('📧 Summary:', summary);
        return;
      }

      await this.sendEmail(recipients, template);

    } catch (error) {
      console.error('Error sending triage summary:', error);
      throw new Error(`Failed to send triage summary: ${error}`);
    }
  }

  // Generate triage summary email template
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
    
    <p>Processing Time: ${Math.round(summary.processingTime / 1000)}s</p>
</body>
</html>
    `;

    return {
      subject: '🤖 Weekly AI Triage Summary - Pain Points Platform',
      html: htmlContent,
      text: `Weekly AI Triage Summary\n\nProcessed: ${summary.itemsProcessed}\nRouted: ${summary.itemsRouted}\nFlagged: ${summary.itemsFlagged}\nProcessing Time: ${Math.round(summary.processingTime / 1000)}s`
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();