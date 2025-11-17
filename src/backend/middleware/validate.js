// Simple validation middleware for key endpoints
function requireFields(fields) {
  return (req, res, next) => {
    const missing = [];
    for (const f of fields) {
      if (req.body == null || req.body[f] == null || (typeof req.body[f] === 'string' && req.body[f].trim() === '')) {
        missing.push(f);
      }
    }
    if (missing.length > 0) return res.status(400).json({ error: 'Missing fields', missing });
    next();
  };
}

module.exports = { requireFields };
