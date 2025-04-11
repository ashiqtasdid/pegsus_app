import { app, BrowserWindow, shell, dialog } from "electron";
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"), // Optional: for secure IPC if needed
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

  // Open external links in default browser instead of new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Show window when content has loaded to avoid blank screen
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Clear the reference when window is closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // On macOS re-create window when dock icon is clicked and no windows are open
  if (mainWindow === null) createWindow();
});
