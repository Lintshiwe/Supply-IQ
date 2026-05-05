const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const APP_URL = isDev ? "http://localhost:8080" : "https://app.supplyiq.co.za";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "SupplyIQ — Inventory Command Center",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
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

app.whenReady().then(createWindow);

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
