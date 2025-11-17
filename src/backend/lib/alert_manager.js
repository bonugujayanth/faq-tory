// Simple in-memory alert manager for monitoring restore jobs and other critical events
// This is intentionally lightweight and meant for local/dev monitoring or to be replaced
// with a real monitoring backend (Prometheus, Sentry, PagerDuty, etc.) in production.

class AlertManager {
  constructor() {
    this.alerts = [];
    this.nextId = 1;
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
