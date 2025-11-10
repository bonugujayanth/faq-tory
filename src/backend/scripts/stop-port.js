const { execSync, spawnSync } = require('child_process');

function stopByPort(port) {
  try {
    if (process.platform === 'win32') {
      // Try PowerShell Get-NetTCPConnection
      const psCommand = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`;
      const ps = spawnSync('powershell', ['-NoProfile', '-Command', `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`], { stdio: 'inherit' });
      if (ps.status === 0) return;

      // Fallback using netstat + taskkill
      const netstat = execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`, { stdio: 'inherit', shell: 'cmd.exe' });
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


