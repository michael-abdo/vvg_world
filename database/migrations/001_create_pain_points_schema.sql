-- Migration: 001_create_pain_points_schema
-- Description: Create VVG World Pain Points platform database schema
-- Date: 2025-01-09
-- Author: VVG World Team

-- Table 1: users
-- Basic user information from Azure AD
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL COMMENT 'User email from Azure AD',
  name VARCHAR(255) COMMENT 'Full name from Azure AD',
  department VARCHAR(100) COMMENT 'User department (Parts, Operations, etc.)',
  location VARCHAR(100) COMMENT 'Work location (Fontana, etc.)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL COMMENT 'Last login timestamp',
  
  INDEX idx_email (email),
  INDEX idx_department (department),
  INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: pain_points
-- Core pain point submissions from employees
CREATE TABLE IF NOT EXISTS pain_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT 'Brief title of the pain point',
  description TEXT NOT NULL COMMENT 'Detailed description of the issue',
  category ENUM('Safety', 'Efficiency', 'Cost Savings', 'Quality', 'Other') NOT NULL COMMENT 'Pain point category',
  submitted_by VARCHAR(255) NOT NULL COMMENT 'User email from session',
  department VARCHAR(100) COMMENT 'Submitter department',
  location VARCHAR(100) COMMENT 'Submitter location',
  status ENUM('pending', 'under_review', 'in_progress', 'completed', 'rejected') DEFAULT 'pending' COMMENT 'Current status',
  upvotes INT DEFAULT 0 COMMENT 'Cached upvote count',
  downvotes INT DEFAULT 0 COMMENT 'Cached downvote count',
  attachment_url VARCHAR(500) NULL COMMENT 'S3 URL for single attachment',
  attachment_filename VARCHAR(255) NULL COMMENT 'Original filename',
  attachment_size BIGINT NULL COMMENT 'File size in bytes',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_submitted_by (submitted_by),
  INDEX idx_created_at (created_at),
  INDEX idx_department (department),
  INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: pain_point_votes
-- Individual vote tracking to prevent duplicate voting
CREATE TABLE IF NOT EXISTS pain_point_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pain_point_id INT NOT NULL COMMENT 'Reference to pain point',
  user_email VARCHAR(255) NOT NULL COMMENT 'User who voted',
  vote_type ENUM('up', 'down') NOT NULL COMMENT 'Type of vote',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pain_point_id) REFERENCES pain_points(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_vote (pain_point_id, user_email) COMMENT 'Prevent duplicate votes',
  INDEX idx_pain_point_id (pain_point_id),
  INDEX idx_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add table comments
ALTER TABLE users COMMENT = 'VVG employee information from Azure AD';
ALTER TABLE pain_points COMMENT = 'Employee pain point submissions and tracking';
ALTER TABLE pain_point_votes COMMENT = 'Individual vote tracking for pain points';

-- Insert default test data (optional)
INSERT IGNORE INTO users (email, name, department, location) VALUES
('michael.abdo@vvg.com', 'Michael Abdo', 'Parts', 'Fontana'),
('admin@vvg.com', 'VVG Admin', 'Management', 'Fontana');

-- Sample pain point for testing (optional)
INSERT IGNORE INTO pain_points (
  title, 
  description, 
  category, 
  submitted_by, 
  department, 
  location
) VALUES (
  'Improve Parts Inventory System',
  'Current inventory system lacks real-time updates causing delays in order fulfillment. Staff spend excessive time manually checking stock levels.',
  'Efficiency',
  'michael.abdo@vvg.com',
  'Parts',
  'Fontana'
);