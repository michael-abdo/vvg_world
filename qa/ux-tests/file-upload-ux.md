# File Upload UX Test - {PROJECT_DISPLAY_NAME}

## Test Environment
- **URL**: https://legal.vtc.systems/{PROJECT_NAME}
- **Feature**: File upload functionality for NDA documents
- **Expected flow**: Authentication → Upload page → File selection → Success/Error feedback

## Pre-test Setup
1. Navigate to https://legal.vtc.systems/{PROJECT_NAME}
2. Complete authentication flow (should redirect to Microsoft login)
3. After successful authentication, should land on dashboard

## Test Steps

### 1. Navigate to Upload Page
1. From the dashboard, locate the "Upload NDA Document" button
2. Click the "Upload NDA Document" button
3. **Expected**: Should navigate to upload page with file selection interface

### 2. Examine Upload Interface
1. Verify the page contains a file upload area/dropzone
2. Check for file format restrictions displayed (should show PDF, DOCX, DOC, TXT)
3. Look for file size limits mentioned (should show maximum file size)
4. **Expected**: Clear visual indicators for supported file types and size limits

### 3. Test File Selection Interface
1. Click on the file selection area or "Choose File" button
2. **Expected**: Browser file picker should open
3. **Note**: Since Operator cannot upload files, document the interface behavior only

### 4. Check Upload Form Options
1. Look for document type selection (Standard vs Third-party)
2. Check for "Mark as Standard" checkbox or toggle
3. Verify any additional metadata fields are present
4. **Expected**: Clear options for document categorization

### 5. Examine Upload Button State
1. Check if upload button is disabled when no file is selected
2. Look for any loading states or progress indicators
3. **Expected**: Button should be disabled until file is selected

### 6. Test Navigation and Cancel Options
1. Look for "Cancel" or "Back to Dashboard" options
2. Test navigation back to dashboard
3. **Expected**: Should be able to return to dashboard without losing progress

### 7. Check Error Handling Display
1. Look for any error messages or validation feedback areas
2. Check if file format restrictions are enforced in the UI
3. **Expected**: Clear error messaging areas visible

### 8. Verify Responsive Design
1. Test page layout at different browser window sizes
2. Check if upload interface adapts properly
3. **Expected**: Upload interface should remain functional across different screen sizes

### 9. Test Upload Progress Feedback
1. Look for progress bars or loading indicators
2. Check for success/completion messaging areas
3. **Expected**: Visual feedback mechanisms for upload status

### 10. Verify Post-Upload Navigation
1. Check for "View Documents" or "Back to Dashboard" links
2. Look for success confirmation messages
3. **Expected**: Clear next steps after successful upload

## QA Report
- ✅ What worked: 
- 🐞 Bugs found: 
- ❓ Open questions: 