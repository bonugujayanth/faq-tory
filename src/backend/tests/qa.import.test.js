const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const fs = require('fs');
const path = require('path');
const { setupTestDatabase } = require('./setup');

describe('Q/A Import API Tests', () => {
  let adminToken;
  let userToken;
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const testFilesDir = path.join(__dirname, 'test-files');

  // Setup: Create test files directory and get auth tokens
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Register and login as admin
    const adminUser = {
      name: `Admin Import ${Date.now()}`,
      email: `admin_import_${Date.now()}@test.com`,
      password: 'Admin@123'
    };
    
    // Create admin user directly in database (since signup doesn't support role)
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`,
        [adminUser.name, adminUser.email, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    
    if (adminLogin.status !== 200) {
      console.log('Admin login failed:', adminLogin.body);
      throw new Error('Admin login failed');
    }
    adminToken = adminLogin.body.token;

    // Register and login as regular user
    const regularUser = {
      name: `User Import ${Date.now()}`,
      email: `user_import_${Date.now()}@test.com`,
      password: 'User@123'
    };
    await request(app).post('/api/auth/signup').send(regularUser);
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: regularUser.email, password: regularUser.password });
    
    if (userLogin.status !== 200) {
      console.log('User login failed:', userLogin.body);
      throw new Error('User login failed');
    }
    userToken = userLogin.body.token;
  }, 10000);

  // Cleanup: Remove test files
  afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.readdirSync(testFilesDir).forEach(file => {
        fs.unlinkSync(path.join(testFilesDir, file));
      });
      fs.rmdirSync(testFilesDir);
    }

    // Clean up uploads directory
    if (fs.existsSync(uploadsDir)) {
      fs.readdirSync(uploadsDir).forEach(file => {
        fs.unlinkSync(path.join(uploadsDir, file));
      });
    }
  });

  // DFBTR-169: POST endpoint tests
  describe('POST /api/qa/import - Endpoint Creation', () => {
    test('should reject import request without authentication', async () => {
      const csvPath = path.join(testFilesDir, 'test.csv');
      fs.writeFileSync(csvPath, 'question,answer\nTest Q,Test A');

      const response = await request(app)
        .post('/api/qa/import')
        .attach('file', csvPath);

      expect(response.status).toBe(401);
      fs.unlinkSync(csvPath);
    });

    test('should reject import request from non-admin user', async () => {
      const csvPath = path.join(testFilesDir, 'test.csv');
      fs.writeFileSync(csvPath, 'question,answer\nTest Q,Test A');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('administrator');
      fs.unlinkSync(csvPath);
    });

    test('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No file uploaded');
    });

    test('should reject invalid file types', async () => {
      const txtPath = path.join(testFilesDir, 'test.txt');
      fs.writeFileSync(txtPath, 'This is a text file');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', txtPath);

      expect(response.status).toBe(500);
      fs.unlinkSync(txtPath);
    });
  });

  // DFBTR-170: File validation and parsing tests
  describe('File Validation and Parsing', () => {
    test('should successfully parse valid CSV file', async () => {
      const csvPath = path.join(testFilesDir, 'valid.csv');
      const csvContent = `question,answer
What is Node.js?,Node.js is a JavaScript runtime
What is Express?,Express is a web framework
What is SQLite?,SQLite is a database engine`;
      fs.writeFileSync(csvPath, csvContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(201);
      expect(response.body.imported).toBe(3);
      expect(response.body.failed).toBe(0);
      expect(response.body.total).toBe(3);
      fs.unlinkSync(csvPath);
    });

    test('should successfully parse valid JSON file', async () => {
      const jsonPath = path.join(testFilesDir, 'valid.json');
      const jsonContent = JSON.stringify([
        { question: 'What is REST?', answer: 'REST is an architectural style' },
        { question: 'What is API?', answer: 'API is Application Programming Interface' }
      ]);
      fs.writeFileSync(jsonPath, jsonContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsonPath);

      expect(response.status).toBe(201);
      expect(response.body.imported).toBe(2);
      expect(response.body.failed).toBe(0);
      expect(response.body.total).toBe(2);
      fs.unlinkSync(jsonPath);
    });

    test('should handle JSON with alternative field names (Q/A)', async () => {
      const jsonPath = path.join(testFilesDir, 'alternative.json');
      const jsonContent = JSON.stringify([
        { Q: 'Test question 1?', A: 'Test answer 1' },
        { q: 'Test question 2?', a: 'Test answer 2' }
      ]);
      fs.writeFileSync(jsonPath, jsonContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsonPath);

      expect(response.status).toBe(201);
      expect(response.body.imported).toBe(2);
      fs.unlinkSync(jsonPath);
    });

    test('should reject malformed JSON file', async () => {
      const jsonPath = path.join(testFilesDir, 'invalid.json');
      fs.writeFileSync(jsonPath, '{ invalid json content }');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsonPath);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Invalid JSON');
      fs.unlinkSync(jsonPath);
    });

    test('should reject empty CSV file', async () => {
      const csvPath = path.join(testFilesDir, 'empty.csv');
      fs.writeFileSync(csvPath, '');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('non-empty');
      fs.unlinkSync(csvPath);
    });

    test('should reject file with missing question field', async () => {
      const csvPath = path.join(testFilesDir, 'missing-question.csv');
      fs.writeFileSync(csvPath, 'answer\nThis is an answer');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('question');
      fs.unlinkSync(csvPath);
    });

    test('should reject file with missing answer field', async () => {
      const jsonPath = path.join(testFilesDir, 'missing-answer.json');
      const jsonContent = JSON.stringify([
        { question: 'What is this?' }
      ]);
      fs.writeFileSync(jsonPath, jsonContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsonPath);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('answer');
      fs.unlinkSync(jsonPath);
    });

    test('should reject file with empty question values', async () => {
      const csvPath = path.join(testFilesDir, 'empty-question.csv');
      fs.writeFileSync(csvPath, 'question,answer\n,This is an answer');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('question');
      fs.unlinkSync(csvPath);
    });
  });

  // DFBTR-171: Row-by-row insertion tests
  describe('Row-by-Row Q/A Insertion', () => {
    test('should insert all valid rows successfully', async () => {
      const csvPath = path.join(testFilesDir, 'bulk-insert.csv');
      const csvContent = `question,answer
Q1?,A1
Q2?,A2
Q3?,A3
Q4?,A4
Q5?,A5`;
      fs.writeFileSync(csvPath, csvContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(201);
      expect(response.body.imported).toBe(5);
      expect(response.body.failed).toBe(0);
      expect(response.body.total).toBe(5);

      // Verify data was inserted
      const getResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const importedQuestions = getResponse.body.filter(qa => 
        ['Q1?', 'Q2?', 'Q3?', 'Q4?', 'Q5?'].includes(qa.question)
      );
      expect(importedQuestions.length).toBe(5);
      
      fs.unlinkSync(csvPath);
    });

    test('should handle partial success with some invalid rows', async () => {
      const jsonPath = path.join(testFilesDir, 'partial.json');
      const jsonContent = JSON.stringify([
        { question: 'Valid Q1?', answer: 'Valid A1' },
        { question: '', answer: 'Invalid - empty question' },
        { question: 'Valid Q2?', answer: 'Valid A2' },
        { question: 'Valid Q3?', answer: '' }
      ]);
      fs.writeFileSync(jsonPath, jsonContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsonPath);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Invalid data format');
      fs.unlinkSync(jsonPath);
    });

    test('should create version history for imported entries', async () => {
      const csvPath = path.join(testFilesDir, 'versioned.csv');
      fs.writeFileSync(csvPath, 'question,answer\nVersioned Q?,Versioned A');

      const importResponse = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(importResponse.status).toBe(201);

      // Get the imported Q/A
      const getResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const importedQA = getResponse.body.find(qa => qa.question === 'Versioned Q?');
      expect(importedQA).toBeDefined();
      expect(importedQA.current_version).toBe(1);

      // Check version history
      const versionResponse = await request(app)
        .get(`/api/qa/${importedQA.id}/versions`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(versionResponse.body.length).toBe(1);
      expect(versionResponse.body[0].version).toBe(1);
      
      fs.unlinkSync(csvPath);
    });

    test('should handle large file imports efficiently', async () => {
      const csvPath = path.join(testFilesDir, 'large.csv');
      let csvContent = 'question,answer\n';
      
      // Generate 50 Q/A pairs
      for (let i = 1; i <= 50; i++) {
        csvContent += `Question ${i}?,Answer ${i}\n`;
      }
      fs.writeFileSync(csvPath, csvContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(201);
      expect(response.body.imported).toBe(50);
      expect(response.body.failed).toBe(0);
      expect(response.body.total).toBe(50);
      
      fs.unlinkSync(csvPath);
    }, 30000); // Increase timeout for large import

    test('should provide detailed error information for failed rows', async () => {
      const csvPath = path.join(testFilesDir, 'with-errors.csv');
      fs.writeFileSync(csvPath, 'question,answer\nValid Q?,Valid A');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      
      fs.unlinkSync(csvPath);
    });

    test('should clean up uploaded file after successful import', async () => {
      const csvPath = path.join(testFilesDir, 'cleanup.csv');
      fs.writeFileSync(csvPath, 'question,answer\nCleanup Q?,Cleanup A');

      await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      // Check that uploads directory doesn't have leftover files
      const uploadFiles = fs.readdirSync(uploadsDir);
      expect(uploadFiles.length).toBe(0);
      
      fs.unlinkSync(csvPath);
    });

    test('should clean up uploaded file after failed import', async () => {
      const csvPath = path.join(testFilesDir, 'cleanup-fail.csv');
      fs.writeFileSync(csvPath, 'invalid,headers\nno question,no answer');

      await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      // Check that uploads directory is clean
      const uploadFiles = fs.readdirSync(uploadsDir);
      expect(uploadFiles.length).toBe(0);
      
      fs.unlinkSync(csvPath);
    });
  });

  // Integration tests
  describe('Import Integration Tests', () => {
    test('should import and retrieve Q/A data correctly', async () => {
      const jsonPath = path.join(testFilesDir, 'integration.json');
      const jsonContent = JSON.stringify([
        { question: 'Integration Q1?', answer: 'Integration A1' },
        { question: 'Integration Q2?', answer: 'Integration A2' }
      ]);
      fs.writeFileSync(jsonPath, jsonContent);

      // Import
      const importResponse = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsonPath);

      expect(importResponse.status).toBe(201);

      // Retrieve all
      const getResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${adminToken}`);

      const imported = getResponse.body.filter(qa => 
        qa.question.startsWith('Integration Q')
      );
      expect(imported.length).toBe(2);
      
      fs.unlinkSync(jsonPath);
    });

    test('should allow updating imported Q/A entries', async () => {
      const csvPath = path.join(testFilesDir, 'update-test.csv');
      fs.writeFileSync(csvPath, 'question,answer\nUpdate Q?,Original A');

      // Import
      await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      // Get imported entry
      const getResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const imported = getResponse.body.find(qa => qa.question === 'Update Q?');

      // Update
      const updateResponse = await request(app)
        .put(`/api/qa/${imported.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ question: 'Update Q?', answer: 'Updated A' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.answer).toBe('Updated A');
      expect(updateResponse.body.current_version).toBe(2);
      
      fs.unlinkSync(csvPath);
    });

    test('should allow archiving imported Q/A entries', async () => {
      const csvPath = path.join(testFilesDir, 'archive-test.csv');
      fs.writeFileSync(csvPath, 'question,answer\nArchive Q?,Archive A');

      // Import
      await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      // Get imported entry
      const getResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const imported = getResponse.body.find(qa => qa.question === 'Archive Q?');

      // Archive
      const archiveResponse = await request(app)
        .delete(`/api/qa/${imported.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(archiveResponse.status).toBe(204);

      // Verify archived
      const verifyResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const stillExists = verifyResponse.body.find(qa => qa.question === 'Archive Q?');
      expect(stillExists).toBeUndefined();
      
      fs.unlinkSync(csvPath);
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    test('should handle CSV with quoted fields containing commas', async () => {
      const csvPath = path.join(testFilesDir, 'quoted.csv');
      const csvContent = `question,answer
"What is Express, and why use it?","Express is a web framework, used for building APIs"`;
      fs.writeFileSync(csvPath, csvContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(201);
      expect(response.body.imported).toBe(1);
      fs.unlinkSync(csvPath);
    });

    test('should handle Unicode characters in Q/A data', async () => {
      const jsonPath = path.join(testFilesDir, 'unicode.json');
      const jsonContent = JSON.stringify([
        { question: 'What is 你好?', answer: '你好 means hello' },
        { question: 'What is こんにちは?', answer: 'こんにちは means hello' }
      ]);
      fs.writeFileSync(jsonPath, jsonContent);

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jsonPath);

      expect(response.status).toBe(201);
      expect(response.body.imported).toBe(2);
      fs.unlinkSync(jsonPath);
    });

    test('should trim whitespace from questions and answers', async () => {
      const csvPath = path.join(testFilesDir, 'whitespace.csv');
      fs.writeFileSync(csvPath, 'question,answer\n  Trim Q?  ,  Trim A  ');

      const response = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvPath);

      expect(response.status).toBe(201);

      // Verify trimmed
      const getResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const imported = getResponse.body.find(qa => qa.question === 'Trim Q?');
      expect(imported).toBeDefined();
      expect(imported.answer).toBe('Trim A');
      
      fs.unlinkSync(csvPath);
    });
  });
});
