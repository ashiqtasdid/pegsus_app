import { app, BrowserWindow, shell, dialog, ipcMain, protocol } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as log from "electron-log";

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow: BrowserWindow | null = null;
const isDevelopment = process.env.NODE_ENV === "development";

// Configure auto updater
function setupAutoUpdater() {
  // Configure logger
  autoUpdater.logger = log;
  (autoUpdater.logger as any).transports.file.level = "debug";
  console.log(
    "Auto updater setup with log file at:",
    (autoUpdater.logger as any).transports.file.getFile()
  );

  // Print debug information
  console.log("Current version:", app.getVersion());
  console.log("Update channel:", autoUpdater.channel || "latest");
  console.log("Electron version:", process.versions.electron);
  console.log("Is development mode:", isDevelopment);

  // Check if GH_TOKEN is available
  if (!process.env.GH_TOKEN && !isDevelopment) {
    console.log("No GH_TOKEN found in environment variables");
  }

  // Explicitly set the feed URL and configuration
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "ashiqtasdid",
    repo: "pegsus_app",
    private: false,
    releaseType: "release",
  });

  // Log the feed URL
  console.log(
    "Auto-updater configuration:",
    JSON.stringify(
      {
        provider: "github",
        owner: "ashiqtasdid",
        repo: "pegsus_app",
        private: false,
      },
      null,
      2
    )
  );

  // Enable auto downloading
  autoUpdater.autoDownload = true;

  // Check for updates
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
  });

  // Update available
  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info);
    // No dialog shown - updates will download automatically
  });

  // No updates available
  autoUpdater.on("update-not-available", (info) => {
    console.log("No updates available:", info);
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
  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info);
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
    }

    // Notify user briefly before installing
    if (mainWindow) {
      dialog
        .showMessageBox(mainWindow, {
          type: "info",
          title: "Installing Update",
          message:
            "A new version has been downloaded. The application will restart to install the update.",
          buttons: ["OK"],
        })
        .then(() => {
          // Install immediately after user clicks OK
          autoUpdater.quitAndInstall(false, true);
        });
    } else {
      // If no window is available, install immediately
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // Error handling
  autoUpdater.on("error", (err) => {
    console.error("Error in auto-updater:", err);

    if (err.stack) {
      console.error("Stack trace:", err.stack);
    }

    if (err.message) {
      console.error("Error message:", err.message);
    }
  });

  // Check for updates immediately and then every 30 minutes
  autoUpdater.checkForUpdates().catch((err) => {
    console.error("Initial update check failed:", err);
  });

  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("Scheduled update check failed:", err);
    });
  }, 30 * 60 * 1000);
}

// Setup IPC handlers for window controls
function setupWindowControls() {
  ipcMain.on("check-for-updates", () => {
    console.log("Manual update check triggered");
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("Manual update check failed:", err);
    });
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
    // Use native window frame instead of frameless window
    frame: true,
    backgroundColor: "#ffffff", // Prevent white flash on load
    show: false, // Don't show until ready
    icon: path.join(__dirname, "../assets/icon.png"), // Add your app icon
  });

  mainWindow.setMenu(null);

  // Load the website
  mainWindow.loadURL("https://pegasus-panel.vercel.app");

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
  setupWindowControls();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // On macOS re-create window when dock icon is clicked and no windows are open
  if (mainWindow === null) createWindow();
});
