const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    title: "GJ5 HOME SERVICE | Enterprise Console",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Set to false to simplify Firebase Auth handling in Electron
      webSecurity: false // Necessary for local file loading and Firebase operations
    },
    backgroundColor: '#0B0F19',
    icon: path.join(__dirname, '../public/icon.ico')
  });

  // Remove menu bar for production feel
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:9002');
    mainWindow.webContents.openDevTools();
  } else {
    // Load the static index.html from the Next.js export
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  // Maximize on launch
  mainWindow.maximize();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
