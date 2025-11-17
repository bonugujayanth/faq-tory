const express = require('express');
const Feedback = require('../models/feedback');
const { authenticateToken, requirePermission, requireAnyRole, logAudit } = require('../middleware/auth');

const router = express.Router();

// Get all feedback (admin/editor can see all, users can see their own)
router.get('/', authenticateToken, (req, res) => {
  const filters = {
    status: req.query.status,
    faq_id: req.query.faq_id,
    feedback_type: req.query.feedback_type,
    limit: req.query.limit || 50,
    offset: req.query.offset || 0
  };

  // Non-admins can only see their own feedback
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    filters.user_id = req.user.id;
  }

  Feedback.getAll(filters, (err, feedback) => {
    if (err) {
      console.error('Error fetching feedback:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ feedback, total: feedback.length });
  });
});

// Get feedback by ID
router.get('/:id', authenticateToken, (req, res) => {
  const feedbackId = parseInt(req.params.id);
  
  Feedback.getById(feedbackId, (err, feedback) => {
    if (err) {
      console.error('Error fetching feedback:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Non-admins can only see their own feedback
    if (req.user.role !== 'admin' && req.user.role !== 'editor' && feedback.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ feedback });
  });
});

// Create new feedback (all authenticated users can submit)
router.post('/', authenticateToken, logAudit('CREATE', 'feedback'), (req, res) => {
  const { faq_id, feedback_type, content, rating, user_name, user_email } = req.body;
  
  if (!faq_id || !content) {
    return res.status(400).json({ message: 'FAQ ID and content are required' });
  }

  if (feedback_type === 'rating' && (!rating || rating < 1 || rating > 5)) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const feedbackData = {
    faq_id: parseInt(faq_id),
    user_id: req.user.id,
    feedback_type: feedback_type || 'suggestion',
    content,
    rating: rating || null,
    user_name: user_name || req.user.name,
    user_email: user_email || req.user.email
  };

  Feedback.create(feedbackData, (err, feedback) => {
    if (err) {
      console.error('Error creating feedback:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(201).json({ feedback, message: 'Feedback submitted successfully' });
  });
});

// Update feedback status (admin/editor only)
router.put('/:id/status', 
  authenticateToken, 
  requireAnyRole(['admin', 'editor']),
  logAudit('UPDATE', 'feedback'),
  (req, res) => {
    const feedbackId = parseInt(req.params.id);
    const { status, admin_notes } = req.body;
    
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    Feedback.updateStatus(feedbackId, status, admin_notes || '', (err, result) => {
      if (err) {
        console.error('Error updating feedback status:', err);
        return res.status(500).json({ message: err.message || 'Database error' });
      }
      res.json({ feedback: result, message: 'Feedback status updated' });
    });
  }
);

// Approve feedback and auto-update FAQ (admin only)
router.post('/:id/approve-and-update', 
  authenticateToken, 
  requirePermission('faq', 'update'),
  logAudit('APPROVE_FEEDBACK', 'feedback'),
  (req, res) => {
    const feedbackId = parseInt(req.params.id);
    
    Feedback.approveAndUpdateFAQ(feedbackId, (err, result) => {
      if (err) {
        console.error('Error approving feedback:', err);
        return res.status(500).json({ message: err.message || 'Database error' });
      }
      
      const message = result.updated 
        ? 'Feedback approved and FAQ updated successfully'
        : 'Feedback approved successfully';
      
      res.json({ result, message });
    });
  }
);

// Delete feedback (admin only)
router.delete('/:id', 
  authenticateToken, 
  requirePermission('feedback', 'delete'),
  logAudit('DELETE', 'feedback'),
  (req, res) => {
    const feedbackId = parseInt(req.params.id);
    
    Feedback.delete(feedbackId, (err, result) => {
      if (err) {
        console.error('Error deleting feedback:', err);
        return res.status(500).json({ message: err.message || 'Database error' });
      }
      res.json({ message: 'Feedback deleted successfully' });
    });
  }
);

// Get feedback for specific FAQ
router.get('/faq/:faqId', authenticateToken, (req, res) => {
  const faqId = parseInt(req.params.faqId);
  
  Feedback.getByFaqId(faqId, (err, feedback) => {
    if (err) {
      console.error('Error fetching FAQ feedback:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ feedback, total: feedback.length });
  });
});

// Get feedback statistics (admin/editor only)
router.get('/stats/overview', 
  authenticateToken, 
  requireAnyRole(['admin', 'editor']),
  (req, res) => {
    Feedback.getStats((err, stats) => {
      if (err) {
        console.error('Error fetching feedback stats:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ stats });
    });
  }
);

// Add rating to FAQ
router.post('/rating', authenticateToken, logAudit('CREATE', 'rating'), (req, res) => {
  const { faq_id, rating, comment } = req.body;
  
  if (!faq_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'FAQ ID and rating (1-5) are required' });
  }

  const ratingData = {
    faq_id: parseInt(faq_id),
    user_id: req.user.id,
    rating: parseInt(rating),
    comment: comment || ''
  };

  Feedback.addRating(ratingData, (err, result) => {
    if (err) {
      console.error('Error adding rating:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(201).json({ rating: result, message: 'Rating added successfully' });
  });
});

// Get average rating for FAQ
router.get('/rating/:faqId', authenticateToken, (req, res) => {
  const faqId = parseInt(req.params.faqId);
  
  Feedback.getAverageRating(faqId, (err, rating) => {
    if (err) {
      console.error('Error fetching rating:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ 
      faq_id: faqId,
      average_rating: rating.average_rating || 0,
      total_ratings: rating.total_ratings || 0
    });
  });
});

module.exports = router;
