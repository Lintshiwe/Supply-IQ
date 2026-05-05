const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("supplyiq", {
  isElectron: true,
  platform: process.platform,
  version: "1.0.5",
});
