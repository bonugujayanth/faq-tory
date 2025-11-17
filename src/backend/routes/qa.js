const express = require('express');
const router = express.Router();
const QA = require('../models/qa');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const alertManager = require('../lib/alert_manager');
const SearchIndex = require('../models/search_index');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    const allowedExtensions = ['.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  }
});

// DFBTR-169: Import Q/A data via CSV/JSON
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file
      return res.status(403).json({ error: 'Only administrators can import Q/A data' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let qaData = [];
    
    try {
      // DFBTR-170: Validate and parse file based on type
      if (fileExt === '.csv') {
        qaData = await parseCSVFile(filePath);
      } else if (fileExt === '.json') {
        qaData = await parseJSONFile(filePath);
      } else {
        throw new Error('Unsupported file format');
      }

      // Validate parsed data
      const validation = validateQAData(qaData);
      if (!validation.valid) {
        throw new Error(`Invalid data format: ${validation.errors.join(', ')}`);
      }

      // DFBTR-171: Insert Q/A pairs row-by-row
      const results = await insertQADataRowByRow(qaData);
      
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      
      // DFBTR-176, DFBTR-177, DFBTR-178: Enhanced validation report
      const validationReport = {
        message: results.failed > 0 
          ? `Imported ${results.success} of ${qaData.length} entries. ${results.failed} failed.`
          : 'Q/A data imported successfully',
        summary: {
          total: qaData.length,
          imported: results.success,
          failed: results.failed,
          successRate: `${((results.success / qaData.length) * 100).toFixed(2)}%`
        },
        failures: results.errors.map(err => ({
          row: err.row,
          question: err.question,
          errorCode: categorizeError(err.error),
          errorMessage: err.error,
          suggestion: getSuggestion(err.error)
        })),
        timestamp: new Date().toISOString(),
        fileInfo: {
          originalName: req.file.originalname,
          format: fileExt,
          size: req.file.size
        }
      };
      
      res.status(201).json(validationReport);
    } catch (err) {
      // Clean up uploaded file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to parse CSV file (DFBTR-170)
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Helper function to parse JSON file (DFBTR-170)
function parseJSONFile(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      // Support both array of objects and single object
      const qaData = Array.isArray(data) ? data : [data];
      resolve(qaData);
    } catch (err) {
      reject(new Error('Invalid JSON format: ' + err.message));
    }
  });
}

// Helper function to validate Q/A data structure (DFBTR-170)
function validateQAData(data) {
  const errors = [];
  
  if (!Array.isArray(data) || data.length === 0) {
    return { valid: false, errors: ['Data must be a non-empty array'] };
  }
  
  data.forEach((item, index) => {
    // Check for required fields (case-insensitive)
    const question = item.question || item.Question || item.q || item.Q;
    const answer = item.answer || item.Answer || item.a || item.A;
    
    if (!question || typeof question !== 'string' || question.trim() === '') {
      errors.push(`Row ${index + 1}: Missing or invalid 'question' field`);
    }
    
    if (!answer || typeof answer !== 'string' || answer.trim() === '') {
      errors.push(`Row ${index + 1}: Missing or invalid 'answer' field`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper function to insert Q/A data row by row (DFBTR-171)
async function insertQADataRowByRow(data) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // Normalize field names (support various formats)
    const question = (item.question || item.Question || item.q || item.Q || '').trim();
    const answer = (item.answer || item.Answer || item.a || item.A || '').trim();
    
    try {
      await QA.create(question, answer);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        question: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
        error: err.message
      });
    }
  }
  
  return results;
}

// DFBTR-178: Categorize errors with error codes
function categorizeError(errorMessage) {
  const errorMsg = errorMessage.toLowerCase();
  
  if (errorMsg.includes('required') || errorMsg.includes('missing')) {
    return 'MISSING_FIELD';
  } else if (errorMsg.includes('invalid') || errorMsg.includes('format')) {
    return 'INVALID_FORMAT';
  } else if (errorMsg.includes('duplicate') || errorMsg.includes('exists')) {
    return 'DUPLICATE_ENTRY';
  } else if (errorMsg.includes('too long') || errorMsg.includes('length')) {
    return 'LENGTH_EXCEEDED';
  } else if (errorMsg.includes('constraint') || errorMsg.includes('foreign key')) {
    return 'CONSTRAINT_VIOLATION';
  } else if (errorMsg.includes('database') || errorMsg.includes('sql')) {
    return 'DATABASE_ERROR';
  } else {
    return 'UNKNOWN_ERROR';
  }
}

// DFBTR-176: Provide suggestions based on error type
function getSuggestion(errorMessage) {
  const errorCode = categorizeError(errorMessage);
  
  const suggestions = {
    'MISSING_FIELD': 'Ensure all required fields (question, answer) are present and not empty',
    'INVALID_FORMAT': 'Check that the field values are in the correct format and data type',
    'DUPLICATE_ENTRY': 'This Q/A pair may already exist. Check for duplicates in your file',
    'LENGTH_EXCEEDED': 'Reduce the length of the question or answer text',
    'CONSTRAINT_VIOLATION': 'Check that all referenced IDs exist and constraints are met',
    'DATABASE_ERROR': 'Contact system administrator. There may be a database issue',
    'UNKNOWN_ERROR': 'Review the error message and ensure data meets all requirements'
  };
  
  return suggestions[errorCode] || 'Please review the error message for details';
}

// DFBTR-172: Export Q/A data to CSV/JSON
router.get('/export', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can export Q/A data' });
    }

    const format = req.query.format || 'json'; // default to JSON
    const includeArchived = req.query.includeArchived === 'true';
    
    // DFBTR-173: Add filters (tags, date ranges, categories)
    const filters = {
      includeArchived,
      tags: req.query.tags ? req.query.tags.split(',') : null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      category: req.query.category || null
    };

    // Get Q/A entries with filters
    let entries = await getFilteredQAEntries(filters);

    // DFBTR-174 & DFBTR-179: Implement CSV/JSON generation
    if (format.toLowerCase() === 'csv') {
      const csv = generateCSV(entries);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="qa-export-${Date.now()}.csv"`);
      res.send(csv);
    } else if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="qa-export-${Date.now()}.json"`);
      res.json(entries);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use "csv" or "json"' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to get filtered Q/A entries (DFBTR-173)
async function getFilteredQAEntries(filters) {
  // Get all entries
  let entries = await QA.getAll(filters.includeArchived);

  // Apply date filters
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    entries = entries.filter(entry => new Date(entry.created_at) >= startDate);
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    entries = entries.filter(entry => new Date(entry.created_at) <= endDate);
  }

  // Note: Tags and categories would require additional database schema
  // This is a placeholder for future implementation
  if (filters.tags && filters.tags.length > 0) {
    // Filter by tags (requires tags column in database)
    // entries = entries.filter(entry => filters.tags.some(tag => entry.tags?.includes(tag)));
  }

  if (filters.category) {
    // Filter by category (requires category column in database)
    // entries = entries.filter(entry => entry.category === filters.category);
  }

  return entries;
}

// Helper function to generate CSV from Q/A entries (DFBTR-174)
function generateCSV(entries) {
  if (entries.length === 0) {
    return 'question,answer\n';
  }

  // CSV header
  let csv = 'id,question,answer,version,archived,created_at,updated_at\n';

  // CSV rows
  entries.forEach(entry => {
    // Escape quotes and wrap fields in quotes
    const id = entry.id;
    const question = `"${(entry.question || '').replace(/"/g, '""')}"`;
    const answer = `"${(entry.answer || '').replace(/"/g, '""')}"`;
    const version = entry.current_version || 1;
    const archived = entry.archived ? 'true' : 'false';
    const created = entry.created_at || '';
    const updated = entry.updated_at || '';

    csv += `${id},${question},${answer},${version},${archived},${created},${updated}\n`;
  });

  return csv;
}

// Create Q/A entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    // Validate input
    if (!question || !answer) {
      return res.status(400).json({ 
        error: 'Question and answer are required' 
      });
    }
    
    const qa = await QA.create(question, answer);
    res.status(201).json(qa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all Q/A entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const entries = await QA.getAll(includeArchived);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Q/A entry by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await QA.getById(req.params.id);
    res.json(entry);
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get version history for a Q/A entry
router.get('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const versions = await QA.getVersionHistory(req.params.id);
    res.json(versions);
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update Q/A entry with version tracking
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    // Validate input
    if (!question || !answer) {
      return res.status(400).json({ 
        error: 'Question and answer are required' 
      });
    }
    
    const qa = await QA.update(req.params.id, question, answer);
    res.json(qa);
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Rollback Q/A entry to specific version
router.post('/:id/rollback/:version', authenticateToken, async (req, res) => {
  try {
    const { id, version } = req.params;
    const qa = await QA.rollbackToVersion(id, parseInt(version, 10));
    res.json(qa);
  } catch (err) {
    if (err.message === 'Q/A entry not found' || err.message === 'Version not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Archive Q/A entry (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await QA.archive(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Hard delete Q/A entry (admin only)
router.delete('/:id/permanent', authenticateToken, async (req, res) => {
  try {
    // Only allow admins to permanently delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can permanently delete entries' });
    }
    await QA.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Restore archived Q/A entry with post-restore integrity checks and monitoring alerts
router.post('/:id/restore', authenticateToken, async (req, res) => {
  try {
    const restored = await QA.restore(req.params.id);

    // Verify the DB row after restore
    let entry;
    try {
      entry = await QA.getById(req.params.id);
    } catch (err) {
      // This is critical: DB update succeeded but subsequent read failed
      const alert = alertManager.pushAlert({
        level: 'critical',
        source: 'qa.restore',
        message: `Post-restore verification failed for id=${req.params.id}: unable to read row`,
        data: { error: err.message }
      });
      return res.status(500).json({ error: 'Restore verification failed', alert });
    }

    // Ensure archived flag is cleared
    if (entry.archived && parseInt(entry.archived, 10) !== 0) {
      const alert = alertManager.pushAlert({
        level: 'critical',
        source: 'qa.restore',
        message: `Post-restore integrity mismatch for id=${req.params.id}: archived flag still true`,
        data: { entry }
      });
      return res.status(500).json({ error: 'Restore integrity check failed', alert });
    }

    // Attempt to re-index the restored document in the search index
    try {
      // search index expects a document shaped like { id, question, answer, current_version }
      const doc = {
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        current_version: entry.current_version || 1
      };
      await SearchIndex.updateDocument(doc);
    } catch (err) {
      // indexing failed: alert but do not block the restore operation
      const alert = alertManager.pushAlert({
        level: 'warning',
        source: 'qa.restore',
        message: `Search index update failed after restore for id=${req.params.id}`,
        data: { error: err.message }
      });
      // Return the restored object but include a small integrity note so callers/tests can see an index issue
      return res.json(Object.assign({}, restored, { integrity: { reindexed: false, alert } }));
    }

    // Everything OK: return restored entry and integrity status
    res.json(Object.assign({}, restored, { integrity: { reindexed: true } }));
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    // Log alert for unexpected restore error
    alertManager.pushAlert({
      level: 'critical',
      source: 'qa.restore',
      message: `Unexpected error during restore for id=${req.params.id}`,
      data: { error: err.message }
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;