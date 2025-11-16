const path = require('path');
const fs = require('fs');

// Ensure a test DB path so modules that require DB initialize safely
const tmpDbPath = path.join(__dirname, '..', 'data', `module-load-${Date.now()}.db`);
beforeAll(() => {
  const dataDir = path.dirname(tmpDbPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.env.DB_PATH = tmpDbPath;
  // Clear relevant caches so modules reinitialize with TEST DB
  Object.keys(require.cache).forEach(k => {
    if (k.match(/models\\db\.js|routes\\|middleware\\|models\\/)) delete require.cache[k];
  });
});

test('require key modules to execute top-level code', () => {
  const modules = [
    '../server',
    '../routes/admin',
    '../routes/auth',
    '../routes/categories',
    '../routes/faq',
    '../routes/qa',
    '../middleware/auth',
    '../middleware/error',
    '../models/db',
    '../models/faq'
  ];

  modules.forEach(m => {
    const mod = require(m);
    expect(mod).toBeDefined();
  });
});
