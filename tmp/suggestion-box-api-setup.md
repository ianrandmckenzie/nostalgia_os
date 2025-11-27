# Suggestion Box API Setup Guide

## Overview

The Suggestion Box app is a contact form interface that allows users to submit suggestions and view public suggestions that have been approved by administrators. This document outlines the API requirements for the backend developer.

---

## API Endpoints

### Base URL
```
https://endpoints.relentlesscurious.com
```

---

## 1. Submit New Suggestion

**Endpoint:** `POST /end_data/public/contact-form-create`

**Purpose:** Allow users to submit new suggestions from the Nostalgia OS application.

### Request Headers
```http
Content-Type: application/json
```

### Request Body Structure
```json
{
  "creator_model": {
    "title": "Contact: [Subject from form]",
    "creator_fields_attributes": {
      "0": { "html_input_label": "name", "string_content": "User Name" },
      "1": { "html_input_label": "email", "string_content": "user@example.com" },
      "2": { "html_input_label": "phone", "string_content": "555-123-4567" },
      "3": { "html_input_label": "company", "string_content": "Company Name" },
      "4": { "html_input_label": "subject", "string_content": "Suggestion Title" },
      "5": { "html_input_label": "message", "string_content": "The actual suggestion content" }
    }
  }
}
```

### Field Details

| Field Index | Label | Type | Required | Description |
|------------|-------|------|----------|-------------|
| 0 | name | string | Yes | User's name (currently using email as fallback) |
| 1 | email | string | Yes | User's email address |
| 2 | phone | string | No | User's phone number (optional) |
| 3 | company | string | No | User's company name (optional) |
| 4 | subject | string | No | Suggestion title/subject |
| 5 | message | string | Yes | The actual suggestion content |

### Success Response
```json
{
  "data": {
    "id": 123,
    "title": "Contact: Suggestion Title",
    "created_at": "2025-11-27T18:30:00Z",
    "updated_at": "2025-11-27T18:30:00Z"
  },
  "message": "Data created successfully"
}
```

**Status Code:** `200 OK` or `201 Created`

### Error Response
```json
{
  "error": "Validation failed: Email can't be blank"
}
```

**Status Code:** `400 Bad Request`, `422 Unprocessable Entity`, or `500 Internal Server Error`

---

## 2. Retrieve Public Suggestions

**Endpoint:** `GET /end_data/public/contact-form-data`

**Purpose:** Fetch all public suggestions that administrators have approved for display.

### Request Headers
```http
(No special headers required for GET request)
```

### Query Parameters
None currently implemented. Consider adding:
- `?public=true` - Filter only public submissions
- `?limit=50` - Limit number of results
- `?offset=0` - Pagination support

### Success Response Structure
```json
{
  "data": [
    {
      "id": 1,
      "creator_model_id": 123,
      "html_input_label": "name",
      "string_content": "John Doe",
      "created_at": "2025-11-27T18:30:00Z",
      "updated_at": "2025-11-27T18:30:00Z"
    },
    {
      "id": 2,
      "creator_model_id": 123,
      "html_input_label": "email",
      "string_content": "john@example.com",
      "created_at": "2025-11-27T18:30:00Z",
      "updated_at": "2025-11-27T18:30:00Z"
    },
    {
      "id": 3,
      "creator_model_id": 123,
      "html_input_label": "subject",
      "string_content": "Great Feature Idea",
      "created_at": "2025-11-27T18:30:00Z",
      "updated_at": "2025-11-27T18:30:00Z"
    },
    {
      "id": 4,
      "creator_model_id": 123,
      "html_input_label": "message",
      "string_content": "I think it would be cool if...",
      "created_at": "2025-11-27T18:30:00Z",
      "updated_at": "2025-11-27T18:30:00Z"
    }
  ]
}
```

### Data Processing

The frontend groups these flat records by `creator_model_id` and reconstructs the submissions as follows:

```javascript
// Frontend parsing logic
{
  id: 123,
  name: "John Doe",
  email: "john@example.com",
  phone: "555-123-4567",
  company: "Company Name",
  subject: "Great Feature Idea",
  message: "I think it would be cool if...",
  created_at: "2025-11-27T18:30:00Z",
  updated_at: "2025-11-27T18:30:00Z"
}
```

---

## Important Implementation Notes

### 1. Public vs Private Suggestions
Currently, **all fetched suggestions are assumed to be public**. The backend should:
- Only return suggestions that administrators have marked as public
- Filter out private/pending suggestions at the database/API level
- Do NOT include a `public` field in the response (frontend assumes all are public)

### 2. CORS Configuration
Ensure CORS headers are properly configured to allow requests from:
- `https://nostalgiaos.com`
- `http://localhost:*` (for development)
- Any other domains where the app is hosted

Example CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 3. Rate Limiting
Consider implementing rate limiting to prevent abuse:
- Submission endpoint: 5 requests per minute per IP
- Retrieval endpoint: 30 requests per minute per IP

### 4. Data Validation
Backend should validate:
- Email format is valid
- Message content is not empty
- Subject length is reasonable (max 200 characters)
- Message length is reasonable (max 5000 characters)
- Sanitize all inputs to prevent XSS/injection attacks

### 5. Response Time
- Keep response times under 2 seconds for optimal UX
- Consider caching public suggestions list
- Use database indexes on `creator_model_id` and `created_at` fields

---

## Optional Authentication Endpoints

These endpoints require authentication and are for administrative use:

### Update a Suggestion
```
PUT /end_data/contact-form-update
```
**Requires:** Manager or Admin role

### Delete a Suggestion
```
DELETE /end_data/contact-form-delete?id={submission_id}
```
**Requires:** Manager or Admin role

### Mark Suggestion as Public
```
PUT /end_data/contact-form-update
```
Include field: `"public": true` in the request body
**Requires:** Manager or Admin role

---

## Testing Examples

### Example 1: Submit a Suggestion (cURL)
```bash
curl -X POST https://endpoints.relentlesscurious.com/end_data/public/contact-form-create \
  -H "Content-Type: application/json" \
  -d '{
    "creator_model": {
      "title": "Contact: New Feature Request",
      "creator_fields_attributes": {
        "0": { "html_input_label": "name", "string_content": "Jane Smith" },
        "1": { "html_input_label": "email", "string_content": "jane@example.com" },
        "2": { "html_input_label": "phone", "string_content": "" },
        "3": { "html_input_label": "company", "string_content": "Tech Corp" },
        "4": { "html_input_label": "subject", "string_content": "New Feature Request" },
        "5": { "html_input_label": "message", "string_content": "It would be great to have dark mode support!" }
      }
    }
  }'
```

### Example 2: Retrieve Public Suggestions (cURL)
```bash
curl -X GET https://endpoints.relentlesscurious.com/end_data/public/contact-form-data
```

### Example 3: JavaScript Fetch (as used in frontend)
```javascript
// Submit suggestion
const formData = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  subject: 'New Feature Request',
  message: 'It would be great to have dark mode support!',
  phone: '',
  company: 'Tech Corp'
};

const data = {
  creator_model: {
    title: `Contact: ${formData.subject}`,
    creator_fields_attributes: {
      "0": { html_input_label: "name", string_content: formData.name },
      "1": { html_input_label: "email", string_content: formData.email },
      "2": { html_input_label: "phone", string_content: formData.phone },
      "3": { html_input_label: "company", string_content: formData.company },
      "4": { html_input_label: "subject", string_content: formData.subject },
      "5": { html_input_label: "message", string_content: formData.message }
    }
  }
};

fetch('https://endpoints.relentlesscurious.com/end_data/public/contact-form-create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

```javascript
// Retrieve suggestions
fetch('https://endpoints.relentlesscurious.com/end_data/public/contact-form-data')
  .then(response => response.json())
  .then(result => {
    console.log('Retrieved suggestions:', result.data);
  })
  .catch(error => console.error('Error:', error));
```

---

## Database Schema Recommendations

### Table: `creator_models`
```sql
CREATE TABLE creator_models (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Table: `creator_fields`
```sql
CREATE TABLE creator_fields (
  id SERIAL PRIMARY KEY,
  creator_model_id INTEGER REFERENCES creator_models(id) ON DELETE CASCADE,
  html_input_label VARCHAR(100) NOT NULL,
  string_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_creator_model_id (creator_model_id),
  INDEX idx_label (html_input_label)
);
```

---

## Frontend Code Reference

The frontend implementation can be found in:
- `/js/apps/suggestion_box.js` - Main application logic
- Function `loadMessages()` - Fetches and displays public suggestions
- Function `openCompose()` - Handles form submission

---

## Contact

For questions or clarifications about the API requirements, please contact:
- **Frontend Team:** [Your contact info]
- **Project Repository:** https://github.com/ianrandmckenzie/nostalgia_os

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-27 | 1.0.0 | Initial API documentation for Suggestion Box feature |

