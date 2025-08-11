-- AI Rules Simplification
-- Migration: 006_simplify_ai_rules_schema.sql
-- Simplifies AI Rules to use natural language prompts and only email/tag actions

-- Step 1: Add new trigger_prompt column
ALTER TABLE ai_rules ADD COLUMN trigger_prompt TEXT NULL COMMENT 'Natural language prompt for AI classification';

-- Step 2: Migrate existing data to natural language prompts
UPDATE ai_rules SET trigger_prompt = 
    CASE 
        WHEN trigger_type = 'keywords' THEN 
            CONCAT('Classify messages that contain these keywords or related terms: ', trigger_details)
        WHEN trigger_type = 'similarity' THEN 
            CONCAT('Classify messages that are similar to existing content with confidence above ', trigger_details)
        WHEN trigger_type = 'sentiment' THEN 
            CONCAT('Classify messages with negative sentiment or emotional distress: ', trigger_details)
        WHEN trigger_type = 'length' THEN 
            CONCAT('Classify messages that are shorter than ', trigger_details, ' characters as low quality')
        WHEN trigger_type = 'custom' THEN 
            CONCAT('Classify messages based on this criteria: ', trigger_details)
        ELSE trigger_details
    END
WHERE trigger_prompt IS NULL;

-- Step 3: Update action targets first (before changing action_type enum)
UPDATE ai_rules SET 
    action_target = CASE 
        WHEN action_type IN ('escalate', 'flag', 'hold', 'route') AND action_target NOT LIKE '%@%' THEN 
            'admin@vvgtruck.com'  -- Convert non-email targets to default email
        WHEN action_type = 'ignore' THEN 
            'ignored-items@vvgtruck.com'  -- Convert ignore to email notification
        ELSE action_target  -- Keep existing emails and tags as-is
    END;

-- Step 4: Make trigger_prompt NOT NULL now that data is migrated
ALTER TABLE ai_rules MODIFY trigger_prompt TEXT NOT NULL COMMENT 'Natural language prompt for AI classification';

-- Step 5: Create new action_type enum with only 2 options
-- First, add temporary column with new enum
ALTER TABLE ai_rules ADD COLUMN new_action_type ENUM('send_email', 'add_tag') NOT NULL DEFAULT 'send_email';

-- Copy data to new column with explicit mapping
UPDATE ai_rules SET new_action_type = 
    CASE 
        WHEN action_type = 'tag' THEN 'add_tag'
        WHEN action_type IN ('escalate', 'flag', 'hold', 'ignore', 'route') THEN 'send_email'
        ELSE 'send_email'  -- fallback to send_email for any other values
    END;

-- Drop old action_type column and rename new one
ALTER TABLE ai_rules DROP COLUMN action_type;
ALTER TABLE ai_rules CHANGE new_action_type action_type ENUM('send_email', 'add_tag') NOT NULL DEFAULT 'send_email';

-- Step 6: Drop old trigger columns
ALTER TABLE ai_rules DROP COLUMN trigger_type;
ALTER TABLE ai_rules DROP COLUMN trigger_details;

-- Step 7: Update indexes
DROP INDEX idx_trigger_type ON ai_rules;
ALTER TABLE ai_rules ADD INDEX idx_trigger_prompt (trigger_prompt(100));

-- Step 8: Update ai_rule_logs table to match new schema
ALTER TABLE ai_rule_logs MODIFY action_taken ENUM('send_email', 'add_tag') NOT NULL;

-- Verification: Show the updated structure
-- SELECT name, trigger_prompt, action_type, action_target, priority, active FROM ai_rules;