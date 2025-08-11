-- AI Rules Schema
-- Migration: 004_create_ai_rules_schema.sql

-- AI Rules Table
-- Stores AI-powered rules for automatic pattern detection and actions
CREATE TABLE ai_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trigger_type ENUM('keywords', 'similarity', 'sentiment', 'length', 'custom') NOT NULL DEFAULT 'keywords',
    trigger_details TEXT NOT NULL COMMENT 'Specific trigger configuration (keywords, similarity threshold, etc.)',
    action_type ENUM('escalate', 'tag', 'flag', 'hold', 'ignore', 'route') NOT NULL,
    action_target VARCHAR(255) NOT NULL COMMENT 'Email address, tag name, or department',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    active BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMP NULL,
    trigger_count INT NOT NULL DEFAULT 0 COMMENT 'How many times this rule has been triggered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_trigger_type (trigger_type),
    INDEX idx_action_type (action_type),
    INDEX idx_active (active),
    INDEX idx_priority (priority),
    INDEX idx_last_triggered (last_triggered_at)
);

-- AI Rule Logs Table
-- Tracks when AI rules are triggered and what actions were taken
CREATE TABLE ai_rule_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ai_rule_id INT NOT NULL,
    pain_point_id INT NOT NULL,
    trigger_matched TEXT NOT NULL COMMENT 'What specifically matched the trigger',
    action_taken VARCHAR(100) NOT NULL,
    action_target VARCHAR(255) NOT NULL,
    priority_assigned ENUM('low', 'medium', 'high', 'critical'),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT NULL,
    confidence_score DECIMAL(3,2) COMMENT 'AI confidence score 0.00-1.00',
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ai_rule_id) REFERENCES ai_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (pain_point_id) REFERENCES pain_points(id) ON DELETE CASCADE,
    
    INDEX idx_ai_rule_id (ai_rule_id),
    INDEX idx_pain_point_id (pain_point_id),
    INDEX idx_created_at (created_at),
    INDEX idx_success (success),
    INDEX idx_confidence_score (confidence_score)
);

-- Insert sample AI rules
INSERT INTO ai_rules (name, trigger_type, trigger_details, action_type, action_target, priority, active, last_triggered_at, trigger_count) VALUES
('Safety Keyword Detection', 'keywords', 'hazard,danger,safety,accident,injury,unsafe,risk', 'escalate', 'safety@vvgtruck.com', 'critical', true, '2024-08-05 10:30:00', 12),
('Cost Reduction Ideas', 'keywords', 'save money,reduce cost,efficiency,optimize,budget,expense', 'tag', 'cost-reduction', 'high', true, '2024-08-04 14:22:00', 8),
('Duplicate Detection', 'similarity', '0.80', 'flag', 'duplicate-review', 'medium', true, '2024-08-06 09:15:00', 15),
('Low Quality Filter', 'length', '50', 'hold', 'needs-clarification', 'low', false, '2024-08-01 16:45:00', 3);