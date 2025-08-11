-- Update Routing Rules for Multiple Category and Department Support
-- Migration: 005_update_routing_rules_multiple_selections.sql

-- First, backup existing data by converting single values to JSON arrays
UPDATE routing_rules 
SET 
  category = JSON_ARRAY(category) 
WHERE category IS NOT NULL AND category != '' AND JSON_VALID(category) = 0;

UPDATE routing_rules 
SET 
  department = JSON_ARRAY(department) 
WHERE department IS NOT NULL AND department != '' AND JSON_VALID(department) = 0;

-- Update NULL or empty string values to empty JSON arrays
UPDATE routing_rules SET category = JSON_ARRAY() WHERE category IS NULL OR category = '';
UPDATE routing_rules SET department = JSON_ARRAY() WHERE department IS NULL OR department = '';

-- Modify table structure to change VARCHAR to JSON
-- Note: MySQL doesn't allow direct ALTER of VARCHAR to JSON, so we need to recreate
ALTER TABLE routing_rules 
MODIFY COLUMN category JSON COMMENT 'Array of category names',
MODIFY COLUMN department JSON COMMENT 'Array of department names';

-- Update indexes to handle JSON columns
DROP INDEX idx_category ON routing_rules;
DROP INDEX idx_department ON routing_rules;

-- Add functional indexes for JSON arrays (MySQL 5.7.8+ / 8.0+)
-- These will help with queries that search within the JSON arrays
ALTER TABLE routing_rules 
ADD INDEX idx_category_json ((CAST(category AS CHAR(100) ARRAY))),
ADD INDEX idx_department_json ((CAST(department AS CHAR(100) ARRAY)));

-- Insert sample data with multiple categories and departments for testing
INSERT INTO routing_rules (name, category, department, stakeholders, priority, auto_route, active) VALUES
('Multi-Category Safety Rule', JSON_ARRAY('Safety', 'Quality'), JSON_ARRAY('Engineering', 'Operations'), JSON_ARRAY('safety@vvgtruck.com', 'quality@vvgtruck.com'), 'critical', true, true),
('Cross-Department Product Rule', JSON_ARRAY('Product', 'Tech'), JSON_ARRAY('Product', 'Engineering', 'Marketing'), JSON_ARRAY('product@vvgtruck.com', 'engineering@vvgtruck.com'), 'high', true, true);