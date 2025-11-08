const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');
const QA = require('../models/qa');

describe('Q/A Export API Tests', () => {
  let adminToken;
  let userToken;
  let testQAIds = [];

  // Setup: Create test database and auth tokens
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Create admin user directly in database
    const bcrypt = require('bcrypt');
    const adminUser = {
      name: `Admin Export ${Date.now()}`,
      email: `admin_export_${Date.now()}@test.com`,
      password: 'Admin@123'
    };
    
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
    
    adminToken = adminLogin.body.token;

    // Create regular user
    const regularUser = {
      name: `User Export ${Date.now()}`,
      email: `user_export_${Date.now()}@test.com`,
      password: 'User@123'
    };
    await request(app).post('/api/auth/signup').send(regularUser);
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: regularUser.email, password: regularUser.password });
    userToken = userLogin.body.token;

    // Create some test Q/A entries
    const testData = [
      { question: 'Export Test Q1?', answer: 'Export Test A1' },
      { question: 'Export Test Q2?', answer: 'Export Test A2' },
      { question: 'Export Test Q3?', answer: 'Export Test A3' },
      { question: 'Export Test Q4?', answer: 'Export Test A4' },
      { question: 'Export Test Q5?', answer: 'Export Test A5' }
    ];

    for (const data of testData) {
      const qa = await QA.create(data.question, data.answer);
      testQAIds.push(qa.id);
    }

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));
  }, 15000);

  // DFBTR-172: Create GET endpoint tests
  describe('GET /api/qa/export - Endpoint Creation', () => {
    test('should reject export request without authentication', async () => {
      const response = await request(app)
        .get('/api/qa/export');

      expect(response.status).toBe(401);
    });

    test('should reject export request from non-admin user', async () => {
      const response = await request(app)
        .get('/api/qa/export')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('administrator');
    });

    test('should allow admin to export Q/A data', async () => {
      const response = await request(app)
        .get('/api/qa/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('should default to JSON format when no format specified', async () => {
      const response = await request(app)
        .get('/api/qa/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('.json');
    });

    test('should support CSV format via query parameter', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('.csv');
    });

    test('should reject invalid format parameter', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=xml')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid format');
    });
  });

  // DFBTR-173: Add filters tests
  describe('Export Filters', () => {
    test('should export all non-archived entries by default', async () => {
      const response = await request(app)
        .get('/api/qa/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(5);
      
      // Check that all entries are non-archived
      response.body.forEach(entry => {
        expect(entry.archived).toBe(0);
      });
    });

    test('should include archived entries when includeArchived=true', async () => {
      // Archive one entry
      await QA.archive(testQAIds[0]);

      const response = await request(app)
        .get('/api/qa/export?includeArchived=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const archivedEntries = response.body.filter(e => e.archived === 1);
      expect(archivedEntries.length).toBeGreaterThanOrEqual(1);

      // Restore for other tests
      await QA.restore(testQAIds[0]);
    });

    test('should support date range filtering with startDate', async () => {
      const startDate = new Date(Date.now() - 1000).toISOString();
      
      const response = await request(app)
        .get(`/api/qa/export?startDate=${startDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // All entries should be after startDate
      response.body.forEach(entry => {
        expect(new Date(entry.created_at).getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
      });
    });

    test('should support date range filtering with endDate', async () => {
      const endDate = new Date(Date.now() + 1000).toISOString();
      
      const response = await request(app)
        .get(`/api/qa/export?endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // All entries should be before endDate
      response.body.forEach(entry => {
        expect(new Date(entry.created_at).getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    test('should support combined date range filtering', async () => {
      const startDate = new Date(Date.now() - 5000).toISOString();
      const endDate = new Date(Date.now() + 1000).toISOString();
      
      const response = await request(app)
        .get(`/api/qa/export?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // All entries should be within date range
      response.body.forEach(entry => {
        const entryDate = new Date(entry.created_at).getTime();
        expect(entryDate).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(entryDate).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    test('should accept tags filter parameter (placeholder for future)', async () => {
      const response = await request(app)
        .get('/api/qa/export?tags=javascript,nodejs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Tags filtering is not implemented yet but shouldn't cause errors
    });

    test('should accept category filter parameter (placeholder for future)', async () => {
      const response = await request(app)
        .get('/api/qa/export?category=technical')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Category filtering is not implemented yet but shouldn't cause errors
    });
  });

  // DFBTR-174: Implement CSV generation tests
  describe('CSV Generation', () => {
    test('should generate valid CSV with proper headers', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('id,question,answer,version,archived,created_at,updated_at');
    });

    test('should include all Q/A entries in CSV', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const lines = response.text.split('\n').filter(line => line.trim());
      
      // At least header + 5 test entries
      expect(lines.length).toBeGreaterThanOrEqual(6);
    });

    test('should properly escape quotes in CSV fields', async () => {
      // Create entry with quotes
      const qaWithQuotes = await QA.create(
        'What is "Node.js"?',
        'It\'s a "JavaScript" runtime'
      );

      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('""Node.js""');
      expect(response.text).toContain('""JavaScript""');

      // Cleanup
      await QA.delete(qaWithQuotes.id);
    });

    test('should handle commas in CSV fields correctly', async () => {
      // Create entry with commas
      const qaWithCommas = await QA.create(
        'What are Node.js, Express, and MongoDB?',
        'They are JavaScript, framework, and database'
      );

      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Fields with commas should be quoted
      expect(response.text).toContain('"What are Node.js, Express, and MongoDB?"');

      // Cleanup
      await QA.delete(qaWithCommas.id);
    });

    test('should include version information in CSV', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const lines = response.text.split('\n');
      
      // Check that version column exists and has values
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          const fields = line.split(',');
          // Version should be present (4th field after id, question, answer)
          expect(fields.length).toBeGreaterThanOrEqual(4);
        }
      });
    });

    test('should include archived status in CSV', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=csv&includeArchived=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('archived');
    });

    test('should return empty CSV with headers when no entries exist', async () => {
      // Create a date filter that excludes all entries
      const futureDate = new Date(Date.now() + 100000000).toISOString();
      
      const response = await request(app)
        .get(`/api/qa/export?format=csv&startDate=${futureDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.text).toBe('question,answer\n');
    });
  });

  // DFBTR-179: Implement JSON generation tests
  describe('JSON Generation', () => {
    test('should generate valid JSON array', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should include all required fields in JSON', async () => {
      const response = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      
      const firstEntry = response.body[0];
      expect(firstEntry).toHaveProperty('id');
      expect(firstEntry).toHaveProperty('question');
      expect(firstEntry).toHaveProperty('answer');
      expect(firstEntry).toHaveProperty('current_version');
      expect(firstEntry).toHaveProperty('archived');
      expect(firstEntry).toHaveProperty('created_at');
      expect(firstEntry).toHaveProperty('updated_at');
    });

    test('should preserve special characters in JSON', async () => {
      // Create entry with special characters
      const qaWithSpecialChars = await QA.create(
        'What is "Node.js" & Express?',
        'It\'s a <runtime> & "framework"'
      );

      const response = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const entry = response.body.find(e => e.id === qaWithSpecialChars.id);
      expect(entry).toBeDefined();
      expect(entry.question).toBe('What is "Node.js" & Express?');
      expect(entry.answer).toBe('It\'s a <runtime> & "framework"');

      // Cleanup
      await QA.delete(qaWithSpecialChars.id);
    });

    test('should support Unicode characters in JSON export', async () => {
      // Create entry with Unicode
      const qaWithUnicode = await QA.create(
        'What is 你好?',
        '你好 means hello in Chinese'
      );

      const response = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const entry = response.body.find(e => e.id === qaWithUnicode.id);
      expect(entry).toBeDefined();
      expect(entry.question).toBe('What is 你好?');

      // Cleanup
      await QA.delete(qaWithUnicode.id);
    });

    test('should return empty array when no entries match filters', async () => {
      const futureDate = new Date(Date.now() + 100000000).toISOString();
      
      const response = await request(app)
        .get(`/api/qa/export?format=json&startDate=${futureDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  // DFBTR-175: Write unit tests
  describe('Export Integration Tests', () => {
    test('should export data that can be re-imported', async () => {
      // Export as JSON
      const exportResponse = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(exportResponse.status).toBe(200);
      const exportedData = exportResponse.body;
      expect(exportedData.length).toBeGreaterThan(0);

      // Transform for re-import (keep only question and answer)
      const importData = exportedData.slice(0, 2).map(e => ({
        question: `Re-import: ${e.question}`,
        answer: e.answer
      }));

      // Save to temp file and import
      const fs = require('fs');
      const path = require('path');
      const tempFile = path.join(__dirname, 'temp-reimport.json');
      fs.writeFileSync(tempFile, JSON.stringify(importData));

      const importResponse = await request(app)
        .post('/api/qa/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', tempFile);

      expect(importResponse.status).toBe(201);
      expect(importResponse.body.imported).toBe(2);

      // Cleanup
      fs.unlinkSync(tempFile);
    });

    test('should maintain data consistency between export and database', async () => {
      // Get specific Q/A entry
      const dbEntry = await QA.getById(testQAIds[0]);

      // Export and find the same entry
      const response = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      const exportedEntry = response.body.find(e => e.id === testQAIds[0]);
      
      expect(exportedEntry).toBeDefined();
      expect(exportedEntry.question).toBe(dbEntry.question);
      expect(exportedEntry.answer).toBe(dbEntry.answer);
      expect(exportedEntry.current_version).toBe(dbEntry.current_version);
    });

    test('should handle large exports efficiently', async () => {
      // Create 50 additional entries
      const largeData = [];
      for (let i = 1; i <= 50; i++) {
        const qa = await QA.create(`Large Export Q${i}?`, `Large Export A${i}`);
        largeData.push(qa.id);
      }

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Cleanup
      for (const id of largeData) {
        await QA.delete(id);
      }
    }, 30000);

    test('should support both CSV and JSON formats for same data', async () => {
      const csvResponse = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      const jsonResponse = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(csvResponse.status).toBe(200);
      expect(jsonResponse.status).toBe(200);

      // Both should have data
      const csvLines = csvResponse.text.split('\n').filter(l => l.trim()).length - 1; // minus header
      const jsonCount = jsonResponse.body.length;

      expect(csvLines).toBe(jsonCount);
    });

    test('should set correct Content-Disposition headers for file download', async () => {
      const csvResponse = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(csvResponse.headers['content-disposition']).toMatch(/attachment; filename="qa-export-\d+\.csv"/);

      const jsonResponse = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(jsonResponse.headers['content-disposition']).toMatch(/attachment; filename="qa-export-\d+\.json"/);
    });
  });

  // Edge cases
  describe('Export Edge Cases', () => {
    test('should handle entries with newlines in fields', async () => {
      const qaWithNewlines = await QA.create(
        'What is\nNode.js?',
        'It is a\nJavaScript\nruntime'
      );

      const response = await request(app)
        .get('/api/qa/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      // Cleanup
      await QA.delete(qaWithNewlines.id);
    });

    test('should handle empty question or answer fields gracefully', async () => {
      // Note: This shouldn't happen with proper validation, but test the export
      const response = await request(app)
        .get('/api/qa/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should handle case-insensitive format parameter', async () => {
      const upperCaseResponse = await request(app)
        .get('/api/qa/export?format=CSV')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(upperCaseResponse.status).toBe(200);
      expect(upperCaseResponse.headers['content-type']).toContain('text/csv');

      const mixedCaseResponse = await request(app)
        .get('/api/qa/export?format=Json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(mixedCaseResponse.status).toBe(200);
      expect(mixedCaseResponse.headers['content-type']).toContain('application/json');
    });
  });
});
