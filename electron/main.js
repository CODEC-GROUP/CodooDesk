import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import url from 'url';
import fs, { watch } from 'fs';
import isDev from 'electron-is-dev';
import serve from 'electron-serve';

try {
  if (isDev) {
    import('electron-reloader').then(module => {
      module.default(module, {
        debug: true,
        watchRenderer: true
      });
    });
  }
} catch (err) {
  console.log('Error enabling hot reload:', err);
}

import { initDatabase } from '../dist/src/services/database/index.js';
import { registerInventoryHandlers } from '../dist/src/services/api/inventory/inventoryendpoints.js';
import { registerInventoryItemHandlers } from '../dist/src/services/api/inventory/InventoryItemService.js';
import { registerCategoryHandlers } from '../dist/src/services/api/inventory/categoryendpoints.js';
import { registerProductHandlers } from '../dist/src/services/api/inventory/productendpoints.js';
import { registerSalesHandlers } from '../dist/src/services/api/sales/SalesService.js';
import { registerExpenseHandlers } from '../dist/src/services/api/finance/expenseendpoints.js';
import { registerIncomeHandlers } from '../dist/src/services/api/finance/incomeendpoints.js';
import { registerLocationHandlers } from '../dist/src/services/api/location/locationendpoints.js';
import { registerShopHandlers } from '../dist/src/services/api/entities/shopsService.js';
import { registerSupplierHandlers } from '../dist/src/services/api/entities/suppliersendpoints.js';
import { registerInvoiceHandlers } from '../dist/src/services/api/sales/invoiceService.js';
import { registerPaymentHandlers } from '../dist/src/services/api/sales/paymentService.js';
import { registerReceiptHandlers } from '../dist/src/services/api/sales/RecieptService.js';
import { registerOrderManagementHandlers } from '../dist/src/services/api/sales/orderManagementService.js';
import { registerReturnHandlers } from '../dist/src/services/api/sales/returnService.js';
import { populateExpenseCodes } from '../dist/src/scripts/populateExpenseCodes.js';
import { populateIncomeCodes } from '../dist/src/scripts/populateIncomeCodes.js';
import OhadaCode from '../dist/src/models/OhadaCode.js';
import { registerSetupHandlers } from '../dist/src/services/api/setup/setupService.js';
import { registerFileHandlers } from '../dist/src/services/api/files/fileHandlers.js';
import { registerPOSHandlers } from '../dist/src/services/api/sales/posService.js';
import { registerAuthHandlers } from '../dist/src/services/api/authentication/authenticationendpoints.js';
import { registerEmployeeHandlers } from '../dist/src/services/api/entities/EmployeeService.js';
import { registerCustomerHandlers } from '../dist/src/services/api/entities/customersendpoints.js';
import { registerOhadaCodeHandlers } from '../dist/src/services/api/finance/ohadacodeendpoints.js';
import { registerPrinterHandlers } from '../dist/src/services/api/printer/printerManagement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Add global error handlers at the top level
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Helper function to log directory structure
function logDirectoryStructure(dir, level = 0) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    console.log('  '.repeat(level) + (item.isDirectory() ? '📁' : '📄') + ' ' + item.name);
    if (item.isDirectory()) {
      logDirectoryStructure(path.join(dir, item.name), level + 1);
    }
  });
}

// Initialize electron serve with app protocol
const loadURL = serve({
  directory: 'out',
  scheme: 'app'
});

async function createWindow() {
  try {
    // Initialize database first
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      throw new Error('Database initialization failed');
    }

    // Check if data already exists before populating
    const existingCodes = await OhadaCode.findOne();
    if (!existingCodes) {
      console.log('No existing codes found. Populating initial data...');
      // Populate initial data
      console.log('Populating expense codes...');
      await populateExpenseCodes();
      console.log('Populating income codes...');
      await populateIncomeCodes();
      console.log('Initial data population complete');
    } else {
      console.log('Initial data already populated, skipping...');
    }

    // Register all IPC handlers
    registerInventoryHandlers();
    registerInventoryItemHandlers();
    registerCategoryHandlers();
    registerProductHandlers();
    registerSalesHandlers();
    registerExpenseHandlers();
    registerIncomeHandlers();
    registerLocationHandlers();
    registerShopHandlers();
    registerSupplierHandlers();
    registerInvoiceHandlers();
    registerPaymentHandlers();
    registerReceiptHandlers();
    registerOrderManagementHandlers();
    registerReturnHandlers();
    registerSetupHandlers();
    registerFileHandlers();
    registerPOSHandlers();
    registerAuthHandlers();
    registerEmployeeHandlers();
    registerCustomerHandlers();
    registerOhadaCodeHandlers();
    registerPrinterHandlers();

    ipcMain.handle('navigate', async (event, path) => {
      console.log('Navigation requested to:', path);
      return navigateTo(path);
    });
    
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        sandbox: false,
        contextIsolation: true,
        preload: fileURLToPath(new URL('./preload.cjs', import.meta.url)),
        webSecurity: true,
        allowRunningInsecureContent: false,
        devTools: true
      },
    });

    // Set security headers
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' file: data:;"
          ]
        }
      });
    });

    // Register global shortcut for DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        mainWindow.webContents.toggleDevTools();
      }
    });

    // // Always open DevTools when window is created
    // mainWindow.webContents.openDevTools();

    // Watch for file changes and reload
    // const watchPaths = [
    //   path.join(__dirname, '../src'),
    //   path.join(__dirname, '../dist'),
    //   path.join(__dirname, '../out')
    // ];

    // watchPaths.forEach(watchPath => {
    //   if (fs.existsSync(watchPath)) {
    //     watch(watchPath, { recursive: true }, (eventType, filename) => {
    //       if (filename && !filename.includes('node_modules')) {
    //         const now = Date.now();
    //         if (now - lastNavigationTime >= NAVIGATION_COOLDOWN && !isNavigating) {
    //           console.log(`File changed: ${filename}`);
    //           if (mainWindow && !mainWindow.isDestroyed()) {
    //             mainWindow.webContents.reloadIgnoringCache();
    //           }
    //           lastNavigationTime = now;
    //           isNavigating = true;
    //           setTimeout(() => {
    //             isNavigating = false;
    //           }, NAVIGATION_COOLDOWN);
    //         }
    //       }
    //     });
    //   }
    // });

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      await mainWindow.loadURL('http://localhost:3000');
    } else {
      // No need to set ASSET_PREFIX when using app:// protocol
      await loadURL(mainWindow);
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Add error handler for webContents
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Renderer process gone:', details);
    });

    mainWindow.webContents.on('crashed', (event) => {
      console.error('Renderer process crashed');
    });

  } catch (error) {
    console.error('Failed to create window:', error);
    dialog.showErrorBox(
      'Application Error',
      `Failed to start the application: ${error.message}`
    );
    app.quit();
  }
}

let isNavigating = false;
let lastNavigationTime = 0;
const NAVIGATION_COOLDOWN = 1000; // 1 second cooldown

async function navigateTo(pagePath) {
  if (!mainWindow) {
    throw new Error('Main window is not initialized');
  }

  const currentTime = Date.now();
  if (isNavigating || (currentTime - lastNavigationTime) < NAVIGATION_COOLDOWN) {
    console.log('Navigation in progress or too frequent, skipping...');
    return;
  }

  isNavigating = true;
  lastNavigationTime = currentTime;

  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      await mainWindow.loadURL(`http://localhost:3000${pagePath}`);
    } else {
      // Clean up the path for app:// protocol
      const normalizedPath = pagePath
        .replace(/^[A-Z]:[\\\/]/gi, '')
        .replace(/^[\\\/]+/, '')
        .replace(/\\/g, '/')
        .replace(/^C:\//, '')
        .replace(/^\/+/, '');
      
      await loadURL(mainWindow, normalizedPath);
    }
  } catch (error) {
    console.error('Navigation error:', error);
    throw error;
  } finally {
    isNavigating = false;
  }
}

app.on('ready', async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
    const pagePath = new URL(navigationUrl).pathname;
    navigateTo(pagePath);
  });
});