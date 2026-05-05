const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const APP_URL = isDev ? "http://localhost:8080" : "https://app.supplyiq.co.za";

// Set app name for Windows taskbar / macOS dock
app.setName("SupplyIQ");

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, "assets", "icon.png");
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "SupplyIQ — Inventory Command Center",
    icon: iconPath,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Show window when ready to prevent white flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Remove menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow.loadURL(APP_URL + "/app/dashboard");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // macOS: set dock icon
  if (process.platform === "darwin") {
    app.dock?.setIcon(path.join(__dirname, "assets", "icon.png"));
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
