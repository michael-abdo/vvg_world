-- Data Pipeline Schema
-- Migration: 003_create_data_pipeline_schema.sql

-- Routing Rules Table
-- Stores automatic routing rules for pain points to stakeholders
CREATE TABLE routing_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    department VARCHAR(100),
    stakeholders JSON NOT NULL COMMENT 'Array of email addresses',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    auto_route BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_department (department),
    INDEX idx_active (active),
    INDEX idx_priority (priority)
);

-- AI Triage Configuration Table
-- Stores settings and status for the AI triage system
CREATE TABLE ai_triage_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    schedule_cron VARCHAR(50) NOT NULL DEFAULT '0 9 * * 1' COMMENT 'Monday 9 AM cron expression',
    last_run_at TIMESTAMP NULL,
    next_run_at TIMESTAMP NULL,
    items_processed_last_run INT NOT NULL DEFAULT 0,
    total_items_processed INT NOT NULL DEFAULT 0,
    settings JSON COMMENT 'Additional configuration settings',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Routing Rule Logs Table
-- Tracks when routing rules are triggered and what actions were taken
CREATE TABLE routing_rule_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT NOT NULL,
    pain_point_id INT NOT NULL,
    action_taken VARCHAR(100) NOT NULL,
    stakeholders_notified JSON NOT NULL COMMENT 'Array of emails that were notified',
    priority_assigned ENUM('low', 'medium', 'high', 'critical'),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT NULL,
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (rule_id) REFERENCES routing_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (pain_point_id) REFERENCES pain_points(id) ON DELETE CASCADE,
    
    INDEX idx_rule_id (rule_id),
    INDEX idx_pain_point_id (pain_point_id),
    INDEX idx_created_at (created_at),
    INDEX idx_success (success)
);

-- AI Triage Logs Table
-- Tracks AI triage processing runs and results
CREATE TABLE ai_triage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id VARCHAR(36) NOT NULL COMMENT 'UUID for this triage run',
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    items_processed INT NOT NULL DEFAULT 0,
    items_routed INT NOT NULL DEFAULT 0,
    items_flagged INT NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT NULL,
    processing_summary JSON COMMENT 'Summary of processing results',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_run_id (run_id),
    INDEX idx_started_at (started_at),
    INDEX idx_success (success)
);

-- Insert default AI triage configuration
INSERT INTO ai_triage_config (
    enabled, 
    schedule_cron, 
    settings
) VALUES (
    true, 
    '0 9 * * 1',
    JSON_OBJECT(
        'batchSize', 50,
        'notifyAdmins', true,
        'adminEmails', JSON_ARRAY('admin@vvgtruck.com'),
        'processingTimeoutMinutes', 30
    )
);

-- Insert sample routing rules
INSERT INTO routing_rules (name, category, department, stakeholders, priority, auto_route, active) VALUES
('Safety Critical Issues', 'Safety', 'All', JSON_ARRAY('safety@vvgtruck.com', 'compliance@vvgtruck.com'), 'critical', true, true),
('Engineering Features', 'Tech', 'Engineering', JSON_ARRAY('engineering-leads@vvgtruck.com', 'john.smith@vvgtruck.com'), 'high', true, true),
('HR Culture Initiatives', 'Culture', 'HR', JSON_ARRAY('hr-team@vvgtruck.com', 'emily.davis@vvgtruck.com'), 'medium', true, true),
('Product Improvements', 'Product', 'Product', JSON_ARRAY('product@vvgtruck.com', 'sarah.johnson@vvgtruck.com'), 'high', true, true),
('Cost Reduction Ideas', 'Cost Savings', 'All', JSON_ARRAY('finance@vvgtruck.com', 'operations@vvgtruck.com'), 'medium', true, true);