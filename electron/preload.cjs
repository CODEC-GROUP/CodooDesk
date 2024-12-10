const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('posAPI', {
    readFile: (relativePath) => ipcRenderer.invoke('read-local-file', relativePath),
    writeFile: (relativePath, data) => ipcRenderer.invoke('write-local-file', { relativePath, data }),
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
    dbQuery: (query, params) => ipcRenderer.invoke('db-query', { query, params }),
    printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),
    navigateTo: async (path) => {
        if (!path) return;
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        const sanitizedPath = cleanPath.replace(/[^a-zA-Z0-9-_/]/g, '');
        console.log('Navigating to:', sanitizedPath);
        return await ipcRenderer.invoke('navigate', sanitizedPath);
    },
    openExternal: async (url) => await shell.openExternal(url)
});

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
});
