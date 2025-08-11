-- Migration: 001_create_nda_tables
-- Description: Create initial NDA Analyzer tables
-- Date: 2025-01-03
-- Author: NDA Analyzer Team

-- Table 1: nda_documents
-- Stores uploaded NDA document metadata
CREATE TABLE IF NOT EXISTS nda_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL COMMENT 'S3 key/path to file',
  original_name VARCHAR(255) NOT NULL COMMENT 'Original uploaded filename',
  file_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA-256 hash for deduplication',
  s3_url VARCHAR(500) NOT NULL COMMENT 'Full S3 URL',
  file_size BIGINT NOT NULL COMMENT 'File size in bytes',
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NOT NULL COMMENT 'User email from session',
  status ENUM('uploaded', 'processing', 'processed', 'error') DEFAULT 'uploaded',
  extracted_text LONGTEXT NULL COMMENT 'Extracted text content',
  is_standard BOOLEAN DEFAULT FALSE COMMENT 'Is this the standard NDA template?',
  metadata JSON NULL COMMENT 'Additional metadata',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_upload_date (upload_date),
  INDEX idx_file_hash (file_hash),
  INDEX idx_is_standard (is_standard)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: nda_comparisons
-- Links two NDAs with comparison results
CREATE TABLE IF NOT EXISTS nda_comparisons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document1_id INT NOT NULL COMMENT 'Standard/template document',
  document2_id INT NOT NULL COMMENT 'Document to compare',
  comparison_result_s3_url VARCHAR(500) NULL COMMENT 'S3 URL to detailed results JSON',
  comparison_summary TEXT NULL COMMENT 'Brief summary of comparison',
  similarity_score DECIMAL(5,2) NULL COMMENT 'Percentage similarity 0-100',
  key_differences JSON NULL COMMENT 'Array of key differences',
  ai_suggestions JSON NULL COMMENT 'AI-generated suggestions',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
  error_message TEXT NULL COMMENT 'Error details if status is error',
  processing_time_ms INT NULL COMMENT 'Time taken to process in milliseconds',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (document1_id) REFERENCES nda_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (document2_id) REFERENCES nda_documents(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_date (created_date),
  UNIQUE KEY unique_comparison (document1_id, document2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: nda_exports
-- Tracks generated export documents
CREATE TABLE IF NOT EXISTS nda_exports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comparison_id INT NOT NULL,
  export_type ENUM('pdf', 'docx') NOT NULL,
  export_s3_url VARCHAR(500) NOT NULL COMMENT 'S3 URL to exported file',
  file_size BIGINT NOT NULL COMMENT 'Export file size in bytes',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NOT NULL,
  download_count INT DEFAULT 0,
  last_downloaded_at TIMESTAMP NULL,
  metadata JSON NULL COMMENT 'Export settings and options used',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (comparison_id) REFERENCES nda_comparisons(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_date (created_date),
  INDEX idx_export_type (export_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 4: nda_processing_queue
-- Queue for async document processing
CREATE TABLE IF NOT EXISTS nda_processing_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  task_type ENUM('extract_text', 'compare', 'export') NOT NULL,
  priority INT DEFAULT 5 COMMENT 'Priority 1-10, lower is higher priority',
  status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  result JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES nda_documents(id) ON DELETE CASCADE,
  INDEX idx_status_priority (status, priority),
  INDEX idx_scheduled_at (scheduled_at),
  INDEX idx_document_task (document_id, task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments to tables
ALTER TABLE nda_documents COMMENT = 'Stores uploaded NDA document metadata and extracted content';
ALTER TABLE nda_comparisons COMMENT = 'Stores comparison results between two NDA documents';
ALTER TABLE nda_exports COMMENT = 'Tracks exported comparison reports';
ALTER TABLE nda_processing_queue COMMENT = 'Async task queue for document processing';