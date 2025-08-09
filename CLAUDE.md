**⚠️ CRITICAL FILE PROTECTION: NEVER write to this file unless explicitly told to. This file contains core development principles that must remain stable. ⚠️**

You are an LLM-based coding assistant. You must NEVER EVER DEVIATE from these four CORE PRINCIPLES—they are inviolable and apply to every feature, bug fix, and code change:

**1. Smallest Possible Feature**

* Identify exactly one user-visible behavior.
* Implement only the minimal code change to satisfy it.
* Write a single, focused test that passes only if this behavior works.
* STOP—do not scaffold or plan additional features.

**2. Fail FAST**

* Declare your input schema (types, ranges, required fields).
* Validate **real** inputs against that schema—no mock data ever.
* On the first failing check, immediately abort code generation.
* Return a structured error (code, message, failing field) and HALT.

**3. Determine Root Cause**

* Wrap risky blocks in try/catch (or equivalent).
* On exception, capture inputs, state, and full stack trace.
* Compare the error location to the latest diff.
* Extract and REPORT the underlying cause BEFORE any remediation.

**4. DRY (Don't Repeat Yourself)**

* Search the existing codebase for matching logic or utilities.
* If found, import or extend; never write new duplicate code.
* If duplicates exist, refactor them into a shared utility.
* Centralize common patterns into a well-named abstraction used everywhere.

---

## VVG World Database Schema

### **Final Database Schema (3 Tables)**

#### **1. `pain_points` - Core submissions table**
```sql
CREATE TABLE pain_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('Safety', 'Efficiency', 'Cost Savings', 'Quality', 'Other') NOT NULL,
  submitted_by VARCHAR(255) NOT NULL,        -- User email from Azure AD
  department VARCHAR(100),                   -- Parts, Operations, etc.
  location VARCHAR(100),                     -- Fontana, etc.
  status ENUM('pending', 'under_review', 'in_progress', 'completed', 'rejected') DEFAULT 'pending',
  upvotes INT DEFAULT 0,                     -- Cached vote counts
  downvotes INT DEFAULT 0,
  attachment_url VARCHAR(500) NULL,          -- S3 URL for single file
  attachment_filename VARCHAR(255) NULL,     -- Original filename
  attachment_size BIGINT NULL,               -- File size in bytes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_submitted_by (submitted_by),
  INDEX idx_created_at (created_at)
);
```

#### **2. `pain_point_votes` - Individual vote tracking**
```sql
CREATE TABLE pain_point_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pain_point_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  vote_type ENUM('up', 'down') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pain_point_id) REFERENCES pain_points(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_vote (pain_point_id, user_email),
  INDEX idx_pain_point_id (pain_point_id)
);
```

#### **3. `users` - Basic user info**
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  department VARCHAR(100),
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  
  INDEX idx_email (email)
);
```