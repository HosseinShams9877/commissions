const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'محاسبه‌گر پورسانت فروش',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#022c22',
    titleBarStyle: 'default',
  });

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const standaloneDir = path.join(process.resourcesPath, 'standalone');
    const isDev = !app.isPackaged;

    if (isDev) {
      // Development mode - assume server is already running
      resolve('http://localhost:3000');
      return;
    }

    const serverPath = path.join(standaloneDir, 'server.js');
    const env = { ...process.env, NODE_ENV: 'production', PORT: '0' };

    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: standaloneDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let resolved = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Server]', output.trim());

      if (!resolved) {
        const portMatch = output.match(/Ready on (https?:\/\/localhost:\d+)/) ||
                          output.match(/on port (\d+)/) ||
                          output.match(/localhost:(\d+)/);
        if (portMatch) {
          resolved = true;
          if (portMatch[1].startsWith('http')) {
            resolve(portMatch[1]);
          } else {
            resolve(`http://localhost:${portMatch[1]}`);
          }
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('[Server Err]', output.trim());

      if (!resolved) {
        const portMatch = output.match(/Ready on (https?:\/\/localhost:\d+)/) ||
                          output.match(/on port (\d+)/) ||
                          output.match(/localhost:(\d+)/);
        if (portMatch) {
          resolved = true;
          if (portMatch[1].startsWith('http')) {
            resolve(portMatch[1]);
          } else {
            resolve(`http://localhost:${portMatch[1]}`);
          }
        }
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    // Fallback timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve('http://localhost:3000');
      }
    }, 10000);
  });
}

app.whenReady().then(async () => {
  try {
    const serverUrl = await startServer();
    createWindow();
    mainWindow.loadURL(serverUrl);
  } catch (err) {
    console.error('Error starting app:', err);
    createWindow();
    mainWindow.loadURL('http://localhost:3000');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
