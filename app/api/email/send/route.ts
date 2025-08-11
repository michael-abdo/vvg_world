// Email sending API endpoint
// Allows sending emails via SMTP using the email service

import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email-service';
import { config } from '@/lib/config';

// POST /api/email/send - Send an email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, isHtml, priority, testMode } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : [to];
    
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: `Invalid email format: ${email}` },
          { status: 400 }
        );
      }
    }

    let result;

    // Handle different types of emails
    if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
      // Send as system alert
      result = await emailService.sendSystemAlert(subject, message, priority);
    } else {
      // Send as regular notification
      result = await emailService.sendNotification(to, subject, message, isHtml || false);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET /api/email/send - Test email functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testRecipient = searchParams.get('to') || config.email.testRecipient;
    
    // Run email tests
    const testResults = await emailService.testEmail(testRecipient);
    
    return NextResponse.json({
      success: testResults.success,
      message: testResults.success ? 'All email tests passed' : 'Some email tests failed',
      results: testResults.results,
      testRecipient
    });

  } catch (error) {
    console.error('Email test API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        results: []
      },
      { status: 500 }
    );
  }
}

// PUT /api/email/send - Verify SMTP connection
export async function PUT(request: NextRequest) {
  try {
    const connectionVerified = await emailService.verifyConnection();
    
    return NextResponse.json({
      success: connectionVerified,
      message: connectionVerified ? 'SMTP connection verified' : 'SMTP connection failed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SMTP verification API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection verification failed'
      },
      { status: 500 }
    );
  }
}