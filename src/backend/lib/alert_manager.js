// Simple in-memory alert manager for monitoring restore jobs and other critical events
// This is intentionally lightweight and meant for local/dev monitoring or to be replaced
// with a real monitoring backend (Prometheus, Sentry, PagerDuty, etc.) in production.

class AlertManager {
  constructor() {
    this.alerts = [];
    this.nextId = 1;
    // track recent responses for 5xx spike detection
    this.recentResponses = []; // array of { ts: number, status, path, ip }
    this.windowSeconds = parseInt(process.env.ALERT_WINDOW_SECONDS, 10) || 60; // sliding window
    this.threshold5xx = parseInt(process.env.ALERT_5XX_THRESHOLD, 10) || 10; // default threshold
    this.last5xxAlertAt = 0;
    this.notifier = null; // optional function to deliver alerts (payload) => Promise
  }

  pushAlert({ level = 'warning', source = 'system', message = '', data = null }) {
    const alert = {
      id: this.nextId++,
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      data
    };
    // Keep last 100 alerts in memory
    this.alerts.push(alert);
    if (this.alerts.length > 100) this.alerts.shift();
    // Also log to console for visibility
    const logFn = level === 'critical' ? console.error : console.warn;
    logFn(`[ALERT:${level}] ${source}: ${message}`, data || '');
    return alert;
  }

  // Set a custom notifier function (async) for delivering alerts (e.g. webhook, pager)
  setNotifier(fn) {
    this.notifier = fn;
  }

  // Record an HTTP response to enable spike detection. Call from server middleware on response finish.
  recordResponse(status, path, ip) {
    try {
      const ts = Date.now();
      this.recentResponses.push({ ts, status, path, ip });
      // prune old
      const cutoff = ts - this.windowSeconds * 1000;
      while (this.recentResponses.length && this.recentResponses[0].ts < cutoff) {
        this.recentResponses.shift();
      }

      // count 5xx
      const count5xx = this.recentResponses.reduce((acc, r) => acc + (r.status >= 500 && r.status < 600 ? 1 : 0), 0);
      // If threshold exceeded and we haven't alerted recently (cooldown = windowSeconds)
      if (count5xx >= this.threshold5xx && ts - this.last5xxAlertAt > this.windowSeconds * 1000) {
        this.last5xxAlertAt = ts;
        const message = `Spike in 5xx responses: ${count5xx} in the last ${this.windowSeconds}s`;
        const alert = this.pushAlert({ level: 'critical', source: 'monitor.5xx', message, data: { count5xx, windowSeconds: this.windowSeconds } });
        // fire notifier if present
        if (this.notifier) {
          try {
            // Do not await to avoid blocking response path
            Promise.resolve(this.notifier({ alert })).catch((e) => console.error('Notifier error', e));
          } catch (e) {
            console.error('Notifier call failed', e);
          }
        }
        return alert;
      }
      return null;
    } catch (e) {
      console.error('recordResponse failed', e);
      return null;
    }
  }

  // Return simple 5xx stats for monitoring endpoints
  fiveXxStats() {
    const now = Date.now();
    const cutoff = now - this.windowSeconds * 1000;
    const recent = this.recentResponses.filter(r => r.ts >= cutoff);
    const count5xx = recent.reduce((acc, r) => acc + (r.status >= 500 && r.status < 600 ? 1 : 0), 0);
    return { windowSeconds: this.windowSeconds, count5xx };
  }

  listAlerts() {
    // return copy
    return this.alerts.slice().reverse();
  }

  clear() {
    this.alerts = [];
    this.nextId = 1;
  }

  stats() {
    const counts = this.alerts.reduce((acc, a) => {
      acc[a.level] = (acc[a.level] || 0) + 1;
      return acc;
    }, {});
    return { total: this.alerts.length, byLevel: counts };
  }
}

module.exports = new AlertManager();
