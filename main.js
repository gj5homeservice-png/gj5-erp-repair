
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    title: "GJ5 HOME SERVICE | Enterprise Console",
    icon: path.join(__dirname, 'public/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Necessary for loading local file resources
    },
    backgroundColor: '#0B0F19'
  });

  // Remove menu bar for production feel
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:9002');
  } else {
    // Load the static index.html from the Next.js export
    // When built, 'out' folder is at the root level of the app bundle
    mainWindow.loadFile(path.join(__dirname, 'out/index.html'));
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
