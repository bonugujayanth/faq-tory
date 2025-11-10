# Dependencies Documentation

## Quick Installation

```bash
# Navigate to backend directory
cd src/backend

# Install all dependencies
npm install

# Start development server
npm run dev
```

## Backend Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.2 | Web framework for Node.js |
| `bcrypt` | ^5.0.1 | Password hashing |
| `jsonwebtoken` | ^9.0.0 | JWT token generation/validation |
| `sqlite3` | ^5.1.6 | SQLite database driver |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing |
| `dotenv` | ^16.0.0 | Environment variable management |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.0.0 | Testing framework |
| `supertest` | ^6.3.3 | HTTP assertion library |
| `nodemon` | ^2.0.22 | Development server with auto-restart |

## Frontend Dependencies

No external dependencies - Pure HTML, CSS, and JavaScript.

## System Requirements

- **Node.js**: 14.x or higher (18.x LTS recommended)
- **npm**: 6.x or higher
- **Browser**: Modern browser with ES6+ support
- **OS**: Windows, macOS, or Linux

## Environment Variables

Create a `.env` file in `src/backend/`:

```env
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3000
DB_PATH=./data/app.db
```

## Database Schema

The application automatically creates the following tables:

- `users` - User authentication and roles
- `faqs` - Question-answer pairs
- `categories` - FAQ categorization
- `permissions` - Role-based access control
- `audit_log` - Action tracking and compliance

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/healthz` - Health check

### FAQ Management
- `GET /api/faq` - List FAQs (role-based)
- `GET /api/faq/:id` - Get FAQ by ID
- `POST /api/faq` - Create FAQ
- `PUT /api/faq/:id` - Update FAQ
- `DELETE /api/faq/:id` - Delete FAQ (admin only)
- `GET /api/faq/search` - Search FAQs
- `POST /api/faq/:id/publish` - Publish FAQ (admin only)

### Admin Management
- `GET /api/admin/users` - List users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `PUT /api/admin/users/:id/role` - Update user role (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `GET /api/admin/stats` - System statistics (admin only)
- `GET /api/admin/audit` - Audit log (admin only)

### Category Management
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

## Role-Based Access Control

### Admin Role
- Full CRUD access to all resources
- User management capabilities
- System administration
- Audit log access

### Editor Role
- Create and update FAQs
- View published and own draft FAQs
- Cannot delete FAQs or manage users

### Viewer Role
- Read-only access to published FAQs
- Search functionality
- No editing capabilities

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes:
- 29 test cases
- 100% RBAC functionality coverage
- API endpoint testing
- Permission validation
- Database isolation

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- SQL injection protection
- Input validation
- CORS configuration
- Audit logging

## Performance

- SQLite database for fast local storage
- Indexed database queries
- Efficient search with relevance ranking
- Minimal memory footprint
- Fast API responses

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Recommended Production Setup
- Use PM2 for process management
- Nginx as reverse proxy
- SSL certificate for HTTPS
- Regular database backups
- Log monitoring and management
