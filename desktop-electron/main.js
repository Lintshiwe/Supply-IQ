const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

// Use localhost by default, override with SUPPLYIQ_URL env var
const APP_URL = process.env.SUPPLYIQ_URL || "http://localhost:8082";

// Set app name for Windows taskbar / macOS dock
// Disable sandbox + GPU for localhost dev
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("in-process-gpu");
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

  // Remove menu bar
  Menu.setApplicationMenu(null);

  mainWindow.loadURL(APP_URL + "/app/dashboard");

  // Handle load failures gracefully
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load: ${validatedURL} — ${errorDescription}`);
    mainWindow.loadURL(`data:text/html,
      <html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center">
        <h1 style="color:#84cc16">SupplyIQ</h1>
        <p style="color:#94a3b8;margin:8px 0">Cannot connect to backend at</p>
        <code style="background:#1e293b;padding:4px 8px;border-radius:4px;color:#e2e8f0">${APP_URL}</code>
        <p style="color:#94a3b8;margin-top:16px;font-size:14px">Start the backend first:</p>
        <pre style="background:#1e293b;padding:8px;border-radius:4px;color:#e2e8f0;font-size:13px">cd application && bun run dev:app</pre>
        <p style="color:#64748b;font-size:12px;margin-top:16px">Error: ${errorDescription}</p>
      </div></body></html>`);
  });

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
