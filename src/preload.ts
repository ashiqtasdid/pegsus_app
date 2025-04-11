import { contextBridge, ipcRenderer } from "electron";

console.log('Preload script executing...');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates')
});

console.log('Electron API exposed to renderer');