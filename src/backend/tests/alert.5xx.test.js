const request = require('supertest');

// ensure we set a small window and threshold before loading app
process.env.ALERT_WINDOW_SECONDS = '2';
process.env.ALERT_5XX_THRESHOLD = '5';
process.env.NODE_ENV = 'test';

const alertManager = require('../lib/alert_manager');
const app = require('../server');

describe('5xx spike monitoring', () => {
  beforeEach(() => {
    alertManager.clear();
  });

  test('raises an alert and notifies DevOps on spike of 5xx responses', async () => {
    // attach a mock notifier
    const deliveries = [];
    alertManager.setNotifier(async (payload) => {
      deliveries.push(payload);
      return { ok: true };
    });

    // add a test route that returns 500
    app.post('/api/test/always500', (req, res) => {
      res.status(500).json({ error: 'simulated' });
    });

    // fire enough requests quickly to trip threshold
    for (let i = 0; i < 6; i++) {
      // use immediate awaits to keep them within the window
      await request(app).post('/api/test/always500');
    }

    // small delay to allow async notifier to be scheduled
    await new Promise((r) => setTimeout(r, 200));

    const alerts = alertManager.listAlerts();
    const spikeAlerts = alerts.filter(a => a.source === 'monitor.5xx');
    expect(spikeAlerts.length).toBeGreaterThanOrEqual(1);
    // notifier should have been called at least once
    expect(deliveries.length).toBeGreaterThanOrEqual(1);
  }, 10000);
});
