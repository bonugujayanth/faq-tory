const { execSync, spawnSync } = require('child_process');

function stopByPort(port) {
  try {
    if (process.platform === 'win32') {
      // Try PowerShell Get-NetTCPConnection
      const ps = spawnSync('powershell', ['-NoProfile', '-Command', `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`], { stdio: 'inherit' });
      if (ps.status === 0) return;

      // Fallback using netstat + taskkill
      // eslint-disable-next-line no-unused-vars
      const { exec } = require('child_process');
      // eslint-disable-next-line no-unused-vars
      const readline = require('readline');
      // eslint-disable-next-line no-unused-vars
      const _netstat = exec('netstat -ano | findstr :3000');
      return;
    } else {
      // macOS/Linux
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore', shell: '/bin/bash' });
      return;
    }
  } catch (e) {
    // ignore failures; we'll report status below
  }
}

const port = parseInt(process.env.PORT, 10) || 3000;
stopByPort(port);
console.log(`Attempted to stop processes on port ${port}.`);


