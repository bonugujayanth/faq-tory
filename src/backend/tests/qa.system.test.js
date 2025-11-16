const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');

describe('Q/A System Tests', () => {
  let token;
  const sampleQuestion = 'What is system testing?';
  const sampleAnswer = 'Testing the entire system end-to-end';
  let qaEntry;

  beforeEach(async () => {
    await setupTestDatabase();
    
    // Register and login as admin
    const adminUser = {
      name: `Admin System ${Date.now()}`,
      email: `admin_system_${Date.now()}@test.com`,
      password: 'Admin@123'
    };
    
    // Create admin user directly in database
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
    
    token = adminLogin.body.token;
  }, 10000);

  describe('Complete Q/A Lifecycle', () => {
    it('should perform full lifecycle (create → update → archive → restore)', async () => {
      // Step 1: Create new Q/A entry
      console.log('Step 1: Creating new Q/A entry...');
      const createResponse = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: sampleAnswer
        });
      
      expect(createResponse.status).toBe(201);
      qaEntry = createResponse.body;
      expect(qaEntry).toHaveProperty('id');
      expect(qaEntry.question).toBe(sampleQuestion);
      expect(qaEntry.answer).toBe(sampleAnswer);
      console.log('✓ Q/A entry created successfully');

      // Step 2: Verify entry appears in list
      console.log('Step 2: Verifying entry in list...');
      const listResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${token}`);
      
      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toContainEqual(
        expect.objectContaining({ id: qaEntry.id })
      );
      console.log('✓ Entry found in list');

      // Step 3: Update the entry
      console.log('Step 3: Updating Q/A entry...');
      const updatedAnswer = 'Testing the complete system from end to end';
      const updateResponse = await request(app)
        .put(`/api/qa/${qaEntry.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: updatedAnswer
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.answer).toBe(updatedAnswer);
      expect(updateResponse.body.current_version).toBe(2);
      console.log('✓ Entry updated successfully');

      // Step 4: Verify version history
      console.log('Step 4: Checking version history...');
      const historyResponse = await request(app)
        .get(`/api/qa/${qaEntry.id}/versions`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body).toHaveLength(2);
      expect(historyResponse.body[0].answer).toBe(updatedAnswer);
      expect(historyResponse.body[1].answer).toBe(sampleAnswer);
      console.log('✓ Version history verified');

      // Step 5: Archive the entry
      console.log('Step 5: Archiving entry...');
      const archiveResponse = await request(app)
        .delete(`/api/qa/${qaEntry.id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(archiveResponse.status).toBe(204);
      console.log('✓ Entry archived');

      // Step 6: Verify entry is not in default list
      console.log('Step 6: Verifying entry is hidden...');
      const hiddenListResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${token}`);
      
      expect(hiddenListResponse.status).toBe(200);
      expect(hiddenListResponse.body).not.toContainEqual(
        expect.objectContaining({ id: qaEntry.id })
      );
      console.log('✓ Entry hidden from default list');

      // Step 7: Restore the entry
      console.log('Step 7: Restoring entry...');
      const restoreResponse = await request(app)
        .post(`/api/qa/${qaEntry.id}/restore`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(restoreResponse.status).toBe(200);
      expect(restoreResponse.body.archived).toBe(false);
      console.log('✓ Entry restored');

      // Step 8: Final verification
      console.log('Step 8: Final verification...');
      const finalResponse = await request(app)
        .get(`/api/qa/${qaEntry.id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(finalResponse.status).toBe(200);
      expect(finalResponse.body).toMatchObject({
        id: qaEntry.id,
        question: sampleQuestion,
        answer: updatedAnswer,
        archived: 0,
        current_version: 2
      });
      console.log('✓ Final state verified');
    });

    it('should handle error conditions appropriately', async () => {
      // Create initial entry for testing
      const createResponse = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: sampleAnswer
        });
      
      qaEntry = createResponse.body;

      // Test unauthorized access
      const noTokenResponse = await request(app)
        .put(`/api/qa/${qaEntry.id}`)
        .send({
          question: 'Updated question',
          answer: 'Updated answer'
        });
      
      expect(noTokenResponse.status).toBe(401);

      // Test invalid input
      const invalidResponse = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: '',  // Empty question
          answer: sampleAnswer
        });
      
      expect(invalidResponse.status).toBe(400);

      // Test non-existent entry
      const notFoundResponse = await request(app)
        .get('/api/qa/99999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(notFoundResponse.status).toBe(404);

      // Test invalid version rollback
      const invalidRollbackResponse = await request(app)
        .post(`/api/qa/${qaEntry.id}/rollback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ version: 999 });
      
      expect(invalidRollbackResponse.status).toBe(404);
    });
  });
});