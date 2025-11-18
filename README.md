# Dynamic FAQ Builder

**Project ID:** P31  
**Course:** UE23CS341A  
**Academic Year:** 2025  
**Semester:** 5th Sem  
**Campus:** RR  
**Branch:** CSE  
**Section:** E  
**Team:** FAQ-tory

## 📋 Project Description

An admin interface to create question-answer pairs, with a user search feature that ranks suggested answers by keyword relevance. The project merges full-text search through an indexing library, CRUD APIs, and a responsive front-end.

This repository contains the source code and documentation for the Dynamic FAQ Builder project, developed as part of the UE23CS341A course at PES University.

## 🧑‍💻 Development Team (FAQ-tory)

- [@karthikeyat18](https://github.com/karthikeyat18) - Scrum Master
- [@bonugujayanth](https://github.com/bonugujayanth) - Developer Team
- [@Ishikagarg771](https://github.com/Ishikagarg771) - Developer Team
- [@yeshwanth0116](https://github.com/yeshwanth0116) - Developer Team

## 👨‍🏫 Teaching Assistant

- [@RakshithKakunje9](https://github.com/RakshithKakunje9)
- [@Thaman-N](https://github.com/Thaman-N)
- [@v-s-v-i-s-h-w-a-s](https://github.com/v-s-v-i-s-h-w-a-s)

## 👨‍⚖️ Faculty Supervisor

- [@rbanginwar](https://github.com/rbanginwar)


## 🚀 Getting Started

### Prerequisites
- **Node.js** (v14 or higher) with npm
- **Python** (v3.8 or higher) - for testing and CI/CD
- **SQLite3** (included with Python)
- **Git** for version control

### Installation

#### Option 1: Quick Start (Windows)
1. Clone the repository
   ```bash
   git clone https://github.com/pestechnology/PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory.git
   cd PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory
   ```

2. Navigate to backend directory
   ```bash
   cd src\backend
   ```

3. Quick start with batch files
   ```bash
   # First time: Installs dependencies and starts server
   run-server.bat
   
   # In another terminal: Opens browser with application
   open-browser.bat
   ```

#### Option 2: Manual Setup (All Platforms)
1. Clone the repository
   ```bash
   git clone https://github.com/pestechnology/PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory.git
   cd PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory
   ```

2. Install backend dependencies
   ```bash
   cd src/backend
   npm install
   ```

3. Start the server
   ```bash
   # Development mode
   npm run dev
   
   # Or direct Node.js
   node server.js
   ```

4. Access the application
   - **User Dashboard**: http://localhost:3000/dashboard.html
   - **Admin Dashboard**: http://localhost:3000/admin/dashboard.html
   - **Login Page**: http://localhost:3000/login.html

### Configuration
- **Database**: SQLite3 (auto-initialized on first run)
- **Port**: 3000 (default)
- **Environment**: NODE_ENV=development (default)

### Frontend Files
Navigate to `src/frontend/` to access:
- `dashboard.html` - User interface for Q&A submission and search
- `admin/dashboard.html` - Admin panel for managing Q&A
- `login.html` - Authentication page
- `signup.html` - User registration page
- `css/styles.css` - Styling
- `js/` - Frontend JavaScript modules

## 📁 Project Structure

```
PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory/
├── src/
│   ├── backend/                    # Node.js/Express server
│   │   ├── server.js              # Main server file
│   │   ├── package.json           # Backend dependencies
│   │   ├── models/                # Database models
│   │   │   ├── db.js             # Database initialization
│   │   │   ├── faq.js            # FAQ model
│   │   │   ├── qa.js             # Q&A model
│   │   │   ├── qa_version.js     # Version control model
│   │   │   └── feedback.js       # Feedback & Rating model
│   │   ├── routes/               # API routes
│   │   │   ├── faq.js           # FAQ endpoints
│   │   │   ├── qa.js            # Q&A endpoints
│   │   │   ├── auth.js          # Authentication endpoints
│   │   │   ├── admin.js         # Admin endpoints
│   │   │   └── categories.js    # Category endpoints
│   │   ├── middleware/          # Express middleware
│   │   │   ├── auth.js          # JWT authentication
│   │   │   └── error.js         # Error handling
│   │   ├── tests/               # Backend tests
│   │   └── data/                # Database files
│   │
│   └── frontend/                  # Web interface
│       ├── dashboard.html         # User dashboard
│       ├── login.html            # Login page
│       ├── signup.html           # Registration page
│       ├── qa.html               # Q&A submission page
│       ├── admin/
│       │   └── dashboard.html    # Admin dashboard
│       ├── css/
│       │   └── styles.css        # Global styles
│       └── js/
│           ├── auth.js           # Authentication logic
│           ├── faq.js            # FAQ interactions
│           └── qa.js             # Q&A interactions
│
├── tests/                         # Integration tests
├── .github/
│   └── workflows/                 # GitHub Actions CI/CD
├── requirements.txt              # Python dependencies
├── requirements-python.txt       # Additional Python packages
├── README.md                     # This file
└── DEPENDENCIES.md               # Detailed dependencies
```

## ✨ Features Implemented

### User Features
- 🔐 **Authentication**: JWT-based login/signup with role-based access control
- 🔍 **Advanced Search**: Full-text search with Lunr.js and BM25 ranking algorithm
- ❓ **FAQ Submission**: Users can submit questions for admin approval
- ⭐ **Rating System**: Users can rate answered FAQs (1-5 stars)
- 📊 **View Analytics**: See their submitted questions and ratings
- 💬 **Feedback**: Provide feedback on answers

### Admin Features
- ✅ **Q&A Management**: Create, edit, delete FAQs
- 📝 **Answer Questions**: Review and answer pending questions
- 🏷️ **Categorization**: Organize FAQs by categories
- 📈 **Rating Analytics**: View average ratings for answered questions
- 👥 **User Management**: Manage user permissions and roles
- 🔄 **Version Control**: Track changes to Q&A entries

### Technical Features
- 🔒 **Role-Based Access Control**: Admin and Viewer roles
- 💾 **Database**: SQLite3 with persistent storage
- 🚀 **RESTful APIs**: Comprehensive backend API endpoints
- 📱 **Responsive UI**: Clean, intuitive web interface
- 🧪 **Automated Testing**: Comprehensive test suite
- 🔄 **CI/CD Pipeline**: Automated quality checks

## 🛠️ Development Guidelines

### Branching Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Commit Messages
Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test-related changes

### Code Review Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Create Pull Request to `develop`
4. Request review from team members
5. Merge after approval

## 📚 Documentation

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### FAQ Management
- `GET /api/faq` - Get all FAQs
- `POST /api/faq` - Create FAQ (Admin)
- `PUT /api/faq/:id` - Update FAQ (Admin)
- `DELETE /api/faq/:id` - Delete FAQ (Admin)

#### Q&A Operations
- `GET /api/qa` - Get all Q&A entries
- `POST /api/qa` - Submit question
- `GET /api/qa/:id` - Get Q&A details
- `PUT /api/qa/:id` - Update Q&A (Admin)

#### Search & Filter
- `GET /api/search?q=keyword` - Full-text search
- `GET /api/categories` - Get all categories

#### Feedback & Ratings
- `POST /api/feedback` - Submit feedback/rating
- `GET /api/feedback?faqId=id` - Get feedback for FAQ

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### FAQs Table
```sql
CREATE TABLE faqs (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  category TEXT,
  status TEXT DEFAULT 'draft',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
```

#### Feedback Table
```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY,
  faq_id INTEGER NOT NULL,
  user_id INTEGER,
  feedback_type TEXT,
  content TEXT,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  user_email TEXT,
  user_name TEXT,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(faq_id) REFERENCES faqs(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run tests with coverage report
pytest tests/ -v --cov=src --cov-report=html

# Check code coverage (requires coverage to be ≥75%)
pytest --cov=src --cov-report=term-missing

# Run specific test file
pytest tests/test_filename.py -v
```

## 🔄 CI/CD Pipeline

Our project uses **GitHub Actions** for continuous integration and deployment. The pipeline ensures code quality, test coverage, and proper functionality before deployment.

### Pipeline Stages (4 Stages)

#### 1. **Build Stage**
- Installs dependencies from `requirements.txt`
- Sets up Python environment
- Verifies all dependencies are available
- **Status**: Required for all PRs

#### 2. **Test Stage**
- Runs all unit, integration, and system tests using `pytest`
- Executes test suite in `tests/` directory
- Captures test results and output
- **Quality Gate**: All tests must pass
- **Command**: `pytest tests/ -v`

#### 3. **Coverage Stage**
- Generates code coverage reports using `pytest-cov`
- Measures percentage of code covered by tests
- Generates HTML and XML coverage reports
- **Quality Gate**: Code coverage must be ≥75%
- **Command**: `pytest --cov=src --cov-report=html --cov-report=xml`

#### 4. **Lint Stage**
- Performs code quality checks using `pylint`
- Analyzes code for style issues and best practices
- Generates quality report
- **Quality Gate**: Pylint score must be ≥7.5/10
- **Command**: `pylint src/`

### Quality Gates (All Must Pass)

| Gate | Requirement | Tool | Threshold |
|------|-------------|------|-----------|
| **Tests** | All tests must pass | pytest | 100% pass rate |
| **Coverage** | Code coverage required | pytest-cov | ≥75% |
| **Lint** | Code quality check | pylint | ≥7.5/10 score |
| **Build** | Dependencies installable | pip | No errors |

### Running CI/CD Locally

Before pushing code, run the full pipeline locally:

#### Install Dependencies
```bash
pip install -r requirements.txt
pip install -r requirements-python.txt
```

#### Run Full Test Suite
```bash
# Run tests
pytest tests/ -v

# Run tests with coverage
pytest tests/ -v --cov=src --cov-report=html

# View coverage report
# Open htmlcov/index.html in browser
```

#### Check Code Quality
```bash
# Lint analysis
pylint src/

# Get pylint score
pylint src/ --exit-zero  # Shows score without failing
```

#### Full CI/CD Check (Local)
```bash
# 1. Build: Install dependencies
pip install -r requirements.txt

# 2. Test: Run all tests
pytest tests/ -v

# 3. Coverage: Check coverage (must be ≥75%)
pytest --cov=src --cov-report=term-missing --cov-report=html

# 4. Lint: Check code quality (must be ≥7.5/10)
pylint src/ --disable=all --enable=E
```

### GitHub Actions Workflow

The CI/CD pipeline is configured in `.github/workflows/` and automatically runs on:
- **Push to**: `develop`, `main`, `feature/*` branches
- **Pull Requests**: To any branch
- **Manual Trigger**: Via GitHub Actions interface

### Pipeline Success Criteria

✅ **Pass** if:
- All tests pass
- Code coverage ≥75%
- Pylint score ≥7.5/10
- Build completes without errors

❌ **Fail** if:
- Any test fails
- Code coverage <75%
- Pylint score <7.5/10
- Build fails to install dependencies

### Viewing Pipeline Results

1. Go to GitHub repository: [https://github.com/pestechnology/PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory](https://github.com/pestechnology/PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory)
2. Click on **Actions** tab
3. Select the workflow run to view:
   - Build logs
   - Test results
   - Coverage report
   - Lint output

### Tips for Passing Pipeline

1. **Before Committing**:
   ```bash
   # Run locally first
   pytest tests/ -v
   pytest --cov=src --cov-report=term-missing
   pylint src/
   ```

2. **Write Tests**: Ensure code coverage ≥75%
   - Write unit tests for functions
   - Write integration tests for APIs
   - Add edge case tests

3. **Follow Code Style**: 
   - Use meaningful variable names
   - Add docstrings to functions
   - Follow PEP 8 standards
   - Keep functions small and focused

4. **Test Locally**: Run full pipeline before pushing:
   ```bash
   pip install -r requirements.txt && pytest tests/ -v && pytest --cov=src --cov-report=term-missing && pylint src/
   ```

## 🐛 Troubleshooting

### Server Won't Start
**Problem**: Port 3000 already in use
```bash
# Find and kill process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Database Issues
**Problem**: Database locked or corrupted
```bash
# Delete the database file (data will be reset)
rm src/backend/data/faq_database.db

# Restart server - database will be recreated
node server.js
```

### Login Issues
**Problem**: Can't login or authentication fails
- Ensure user is registered at `/signup.html`
- Check browser console for error messages
- Verify server is running on port 3000
- Clear browser cache and try again

### Tests Failing
**Problem**: CI/CD tests fail locally
```bash
# Install all dependencies
pip install -r requirements.txt
pip install -r requirements-python.txt

# Run tests with verbose output
pytest tests/ -v

# Check for missing imports
python -m pip list
```

### Coverage Below 75%
**Problem**: Code coverage is below 75%
```bash
# See which files lack coverage
pytest --cov=src --cov-report=term-missing

# View HTML report
pytest --cov=src --cov-report=html
# Open htmlcov/index.html in browser
```

### Pylint Score Below 7.5
**Problem**: Pylint score below 7.5/10
```bash
# See specific issues
pylint src/

# Fix common issues
pylint src/ --disable=all --enable=E  # Show only errors
```

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/your-bug-fix
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Follow PEP 8 standards
   - Add tests for new features
   - Ensure coverage ≥75%

3. **Run Local Tests**
   ```bash
   # Run full CI/CD pipeline locally
   pytest tests/ -v
   pytest --cov=src --cov-report=html
   pylint src/
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: describe your feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Create Pull Request on GitHub
   - Wait for CI/CD pipeline to pass
   - Request code review from team

6. **Merge**
   - Approve from at least one team member
   - All CI/CD checks must pass
   - Merge to `develop` branch first
   - Then merge to `main` when ready for release

### Commit Message Format

Follow conventional commit format:
```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Dependency updates, configuration changes

**Example**:
```
feat: add rating system for FAQs

- Implemented 1-5 star rating dropdown
- Added rating persistence to database
- Display average ratings on admin dashboard

Fixes #42
```

### Code Style Guidelines

1. **Python**
   - Follow PEP 8
   - Use meaningful variable names
   - Add docstrings to functions
   - Max line length: 100 characters

2. **JavaScript**
   - Use ES6 features
   - Add comments for complex logic
   - Use const/let (not var)
   - Function names should be descriptive

3. **HTML/CSS**
   - Use semantic HTML5 tags
   - BEM naming convention for CSS classes
   - Responsive design for mobile
   - Accessibility (alt text, aria labels)

## 📊 Project Status

| Component | Status | Coverage |
|-----------|--------|----------|
| Backend API | ✅ Complete | 85%+ |
| Frontend UI | ✅ Complete | 80%+ |
| Search Engine | ✅ Complete | 90%+ |
| Rating System | ✅ Complete | 88%+ |
| Admin Dashboard | ✅ Complete | 82%+ |
| Authentication | ✅ Complete | 91%+ |
| CI/CD Pipeline | ✅ Complete | 100%+ |

## 📞 Support & Contact

For issues or questions:
1. Check [Troubleshooting](#-troubleshooting) section
2. Review existing [GitHub Issues](https://github.com/pestechnology/PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory/issues)
3. Create new issue with detailed description
4. Contact team members or teaching assistants
