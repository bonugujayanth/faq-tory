# User Feedback System Documentation

## Overview
The User Feedback System allows users to provide feedback, suggestions, corrections, and ratings on FAQ entries. Admins can review feedback and automatically update FAQs based on approved suggestions.

## Features Implemented

### 1. Collect User Feedback on FAQs
Users can submit various types of feedback:
- **Suggestions**: Ideas for additional content or topics
- **Corrections**: Fixes for incorrect information
- **Improvements**: Enhanced explanations or examples
- **Ratings**: 1-5 star ratings with optional comments
- **Other**: General feedback

**API Endpoint**: `POST /api/feedback`
```json
{
  "faq_id": 1,
  "feedback_type": "suggestion",
  "content": "Please add more details about event loop",
  "rating": 5  // Optional, only for rating type
}
```

### 2. Admin Review and Manage User Suggestions
Admins and editors can:
- View all pending feedback
- Filter feedback by status, type, or FAQ
- Approve or reject feedback with admin notes
- View feedback statistics

**API Endpoints**:
- `GET /api/feedback` - List all feedback (with filters)
- `GET /api/feedback/:id` - Get specific feedback
- `PUT /api/feedback/:id/status` - Update feedback status
- `GET /api/feedback/stats/overview` - Get feedback statistics

**Status Update Example**:
```json
{
  "status": "approved",
  "admin_notes": "Good suggestion, will update FAQ"
}
```

### 3. Test Feedback Module Against All Test Cases
Comprehensive test suite with 33 test cases covering:
- Feedback submission (all types)
- Viewing and filtering feedback
- Admin review and status updates
- Auto-update functionality
- Rating system
- Edge cases and error handling

**Test Coverage**:
- Feedback Model: 84.61% coverage
- Feedback Routes: 77.17% coverage
- Overall: 80.39% line coverage

### 4. Auto-Update FAQs Based on Approved Feedback
When admins approve feedback of type "correction" or "improvement", the FAQ is automatically updated with the new content.

**API Endpoint**: `POST /api/feedback/:id/approve-and-update`

**Response**:
```json
{
  "result": {
    "feedback_id": 5,
    "faq_id": 1,
    "updated": true
  },
  "message": "Feedback approved and FAQ updated successfully"
}
```

## Database Schema

### Feedback Table
```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faq_id INTEGER NOT NULL,
  user_id INTEGER,
  user_name TEXT,
  user_email TEXT,
  feedback_type TEXT CHECK(feedback_type IN ('suggestion','correction','improvement','rating','other')),
  content TEXT NOT NULL,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  status TEXT CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faq_id) REFERENCES faqs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## Role-Based Access Control

### Permissions
- **Admin**: Full access - create, read, update, delete feedback
- **Editor**: Can read and update feedback status
- **Viewer**: Can create and read their own feedback

## API Reference

### Submit Feedback
```http
POST /api/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "faq_id": 1,
  "feedback_type": "suggestion",
  "content": "Add more examples"
}
```

### Get All Feedback
```http
GET /api/feedback?status=pending&faq_id=1&limit=10&offset=0
Authorization: Bearer <token>
```

### Update Feedback Status
```http
PUT /api/feedback/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "approved",
  "admin_notes": "Excellent suggestion"
}
```

### Approve and Auto-Update FAQ
```http
POST /api/feedback/:id/approve-and-update
Authorization: Bearer <admin_token>
```

### Add Rating
```http
POST /api/feedback/rating
Authorization: Bearer <token>
Content-Type: application/json

{
  "faq_id": 1,
  "rating": 5,
  "comment": "Very helpful"
}
```

### Get Average Rating
```http
GET /api/feedback/rating/:faqId
Authorization: Bearer <token>
```

### Get Feedback Statistics
```http
GET /api/feedback/stats/overview
Authorization: Bearer <admin_token>
```

**Response**:
```json
{
  "stats": {
    "total_feedback": 45,
    "pending_feedback": 12,
    "approved_feedback": 28,
    "rejected_feedback": 5,
    "suggestions": 15,
    "corrections": 10,
    "improvements": 8,
    "ratings": 12
  }
}
```

## Testing

Run feedback tests:
```bash
npm test -- --testPathPattern=feedback
```

Run with coverage:
```bash
npm test -- --testPathPattern=feedback --coverage
```

Run all tests (search + feedback):
```bash
npm test -- --testPathPattern="(search|feedback)" --coverage
```

## Test Results
- ✅ 33 feedback tests passing
- ✅ 55 search tests passing
- ✅ **88 total tests passing**
- ✅ **80.39% code coverage** (exceeds 75% requirement)

## Workflow

### User Submits Feedback
1. User views FAQ and finds information needs improvement
2. User submits feedback via API with feedback type and content
3. Feedback saved with "pending" status

### Admin Reviews Feedback
1. Admin views pending feedback in dashboard
2. Admin reviews feedback content and context
3. Admin approves or rejects with notes

### Auto-Update Process (for corrections/improvements)
1. Admin uses "approve-and-update" endpoint
2. System marks feedback as "approved"
3. System automatically updates FAQ answer with feedback content
4. FAQ is saved with updated information

### Rating Aggregation
1. Multiple users rate FAQ (1-5 stars)
2. System calculates average rating
3. Average rating displayed with FAQ

## Error Handling

### Validation Errors (400)
- Missing required fields (faq_id, content)
- Invalid rating value (not 1-5)
- Invalid status value

### Authentication Errors (401)
- Missing or invalid JWT token

### Authorization Errors (403)
- Viewer trying to update feedback status
- Editor trying to delete feedback
- Non-admin accessing statistics

### Not Found Errors (404)
- Feedback ID doesn't exist
- FAQ ID doesn't exist

## Performance Considerations

### Database Indexes
```sql
CREATE INDEX idx_feedback_faq ON feedback(faq_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_type ON feedback(feedback_type);
```

### Query Optimization
- Filtered queries with WHERE clauses
- Pagination support (limit/offset)
- JOIN optimization for user/FAQ data

## Security Features

- JWT-based authentication required for all endpoints
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection protection via parameterized queries
- XSS protection in feedback content

## Future Enhancements

1. **Email Notifications**: Notify admins of new feedback
2. **Bulk Operations**: Approve/reject multiple feedback items
3. **Feedback Categories**: Tag feedback by topic/category
4. **AI-Assisted Review**: Auto-categorize feedback urgency
5. **User Reputation**: Track helpful feedback contributors
6. **Feedback Analytics**: Trends and insights dashboard

## Integration with Search Feature

The feedback system complements the search feature:
- User searches for FAQ
- User provides feedback on search result quality
- Ratings influence future search rankings
- Corrections improve search accuracy

## Conclusion

The User Feedback System provides a complete feedback loop:
- **Users** can easily share insights and corrections
- **Admins** can efficiently review and manage feedback
- **FAQs** stay current through community contributions
- **Quality** improves through ratings and suggestions

**Code Coverage**: 80.39% line coverage (exceeds 75% target) ✅
**Tests**: 88 passing tests ✅
**All 4 requirements implemented** ✅
