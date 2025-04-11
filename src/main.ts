import { app, BrowserWindow, shell, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow: BrowserWindow | null = null;

// Configure auto updater
function setupAutoUpdater() {
  // Disable auto downloading
  autoUpdater.autoDownload = false;

  // Check for updates
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
  });

  // Update available
  autoUpdater.on("update-available", (info) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Available",
        message: `Version ${info.version} is available. Would you like to download it now?`,
        buttons: ["Yes", "No"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  // No updates available
  autoUpdater.on("update-not-available", () => {
    console.log("No updates available.");
  });

  // Download progress
  autoUpdater.on("download-progress", (progressObj) => {
    let message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
    console.log(message);
    if (mainWindow) {
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  // Update downloaded
  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Ready",
        message:
          "Update downloaded. The application will restart to install the update.",
        buttons: ["Restart Now", "Later"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  // Error handling
  autoUpdater.on("error", (err) => {
    console.error("Error in auto-updater:", err);
  });

  // Check for updates immediately and then every 30 minutes
  autoUpdater.checkForUpdates();
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 30 * 60 * 1000);
}

// Setup IPC handlers for window controls
function setupWindowControls() {
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
    // Better appearance options
    titleBarStyle: "hidden",
    frame: false, // Frameless window for modern look
    backgroundColor: "#ffffff", // Prevent white flash on load
    show: false, // Don't show until ready
    icon: path.join(__dirname, "../assets/icon.png"), // Add your app icon
  });

  // Remove the menu bar
  mainWindow.setMenu(null);

  // Load the website
  mainWindow.loadURL(
    "https://pegasus-panel-git-resize-ashiqtasdids-projects.vercel.app"
  );

  // Inject window controls when the page is loaded
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript(`
      // Create title bar
      const titleBar = document.createElement('div');
      titleBar.id = 'electron-title-bar';
      titleBar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; height: 30px; background-color: #1a1a1a; display: flex; justify-content: flex-end; align-items: center; -webkit-app-region: drag; z-index: 9999;';

      // Create window control buttons container
      const controls = document.createElement('div');
      controls.style.cssText = 'display: flex; -webkit-app-region: no-drag;';

      // Minimize button
      const minimizeBtn = document.createElement('button');
      minimizeBtn.innerHTML = '&#9472;'; // Horizontal line symbol
      minimizeBtn.style.cssText = 'width: 46px; height: 30px; border: none; background: transparent; color: white; font-size: 14px; cursor: pointer;';
      minimizeBtn.onclick = () => window.electronAPI.minimizeWindow();
      minimizeBtn.onmouseover = () => minimizeBtn.style.backgroundColor = '#333333';
      minimizeBtn.onmouseout = () => minimizeBtn.style.backgroundColor = 'transparent';

      // Maximize button
      const maximizeBtn = document.createElement('button');
      maximizeBtn.innerHTML = '&#9723;'; // Square symbol
      maximizeBtn.style.cssText = 'width: 46px; height: 30px; border: none; background: transparent; color: white; font-size: 14px; cursor: pointer;';
      maximizeBtn.onclick = () => window.electronAPI.maximizeWindow();
      maximizeBtn.onmouseover = () => maximizeBtn.style.backgroundColor = '#333333';
      maximizeBtn.onmouseout = () => maximizeBtn.style.backgroundColor = 'transparent';

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&#10006;'; // X symbol
      closeBtn.style.cssText = 'width: 46px; height: 30px; border: none; background: transparent; color: white; font-size: 14px; cursor: pointer;';
      closeBtn.onclick = () => window.electronAPI.closeWindow();
      closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#E81123';
      closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';

      // Add buttons to controls
      controls.appendChild(minimizeBtn);
      controls.appendChild(maximizeBtn);
      controls.appendChild(closeBtn);

      // Add controls to title bar
      titleBar.appendChild(controls);

      // Add title bar to body
      document.body.prepend(titleBar);

      // Adjust the body to account for the title bar
      const bodyStyle = document.body.style;
      bodyStyle.marginTop = '30px';
      
      // Fix for any fixed position elements that need to account for the title bar
      const fixedElements = document.querySelectorAll('*[style*="position: fixed"][style*="top: 0"]');
      fixedElements.forEach(el => {
        const element = el as HTMLElement;
        if (element.id !== 'electron-title-bar') {
          const currentTop = parseInt(element.style.top || '0', 10);
          element.style.top = (currentTop + 30) + 'px';
        }
      });
    `);
  });

  // Open external links in default browser instead of new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Show window when content has loaded to avoid blank screen
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Clear the reference when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  setupWindowControls();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // On macOS re-create window when dock icon is clicked and no windows are open
  if (mainWindow === null) createWindow();
});