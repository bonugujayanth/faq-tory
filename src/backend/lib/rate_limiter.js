const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000; // 1 minute
const DEFAULT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 60;

class RateLimiter {
  constructor(windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX) {
    this.windowMs = windowMs;
    this.max = max;
    this.hits = new Map(); // ip -> { count, resetAt }
  }

  middleware = (req, res, next) => {
    try {
      const key = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      const entry = this.hits.get(key) || { count: 0, resetAt: now + this.windowMs };

      if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + this.windowMs;
      }

      entry.count += 1;
      this.hits.set(key, entry);

      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.max - entry.count));
      res.setHeader('X-RateLimit-Reset', Math.floor(entry.resetAt / 1000));

      if (entry.count > this.max) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      next();
    } catch (err) {
      next(err);
    }
  }

  stats() {
    const items = [];
    for (const [ip, entry] of this.hits.entries()) {
      items.push({ ip, count: entry.count, resetAt: entry.resetAt });
    }
    return { windowMs: this.windowMs, max: this.max, clients: items };
  }
}

module.exports = new RateLimiter();
