import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
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

// Add these constants at the top
const MAX_DB_INIT_RETRIES = 5;  // Increased retries for cold start
const INITIAL_DB_DELAY = 3000;  // Initial delay to wait for DB service
const DB_INIT_RETRY_DELAY = 2000;

async function waitForDatabaseService() {
  console.log('Waiting for database service to be ready...');
  await new Promise(resolve => setTimeout(resolve, INITIAL_DB_DELAY));
}

async function initDatabaseWithRetry(retryCount = 0) {
  try {
    // On first attempt, wait for database service
    if (retryCount === 0) {
      await waitForDatabaseService();
    }

    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      throw new Error('Database initialization returned false');
    }
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error(`Database initialization attempt ${retryCount + 1} failed:`, error);
    
    if (retryCount < MAX_DB_INIT_RETRIES) {
      const delay = DB_INIT_RETRY_DELAY * (retryCount + 1); // Progressive delay
      console.log(`Retrying database initialization in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return initDatabaseWithRetry(retryCount + 1);
    }
    
    // If all retries fail, show a user-friendly error dialog
    dialog.showErrorBox(
      'Database Connection Error',
      'Unable to connect to the database. Please ensure your system has completely started and try launching the application again.'
    );
    throw new Error(`Failed to initialize database after ${MAX_DB_INIT_RETRIES} attempts: ${error.message}`);
  }
}

async function createWindow() {
  try {
    // Create splash window
    const splashWindow = new BrowserWindow({
      width: 400,
      height: 400,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load splash screen from out directory
    await splashWindow.loadFile(path.join(__dirname, '../out/splash/splash.html'));
    splashWindow.center();

    // Initialize database with retry mechanism
    await initDatabaseWithRetry();

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

    // Create main window but don't show it yet
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,  // Don't show until ready
      webPreferences: {
        nodeIntegration: false,
        sandbox: false,
        contextIsolation: true,
        preload: fileURLToPath(new URL('./preload.cjs', import.meta.url)),
        webSecurity: false,
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
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' file: data:;",
            "img-src 'self' file: data: https: http: file://*;"
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

    // Load the app
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      await mainWindow.loadURL('http://localhost:3000');
    } else {
      await loadURL(mainWindow);
    }

    // Ensure splash screen is closed and main window is shown
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
      }
    });

    // Add error handler for if main window fails to show
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
      }
    }, 10000); // 10 second fallback

    // Add error handler for webContents
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Renderer process gone:', details);
    });

    mainWindow.webContents.on('crashed', (event) => {
      console.error('Renderer process crashed');
    });

    // Add a protocol handler for local files
    protocol.registerFileProtocol('local-file', (request, callback) => {
      const filePath = request.url.replace('local-file://', '');
      callback(decodeURI(filePath));
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

  console.log('Navigating to path:', pagePath);

  // Reset navigation state if enough time has passed
  const currentTime = Date.now();
  if (currentTime - lastNavigationTime >= NAVIGATION_COOLDOWN) {
    isNavigating = false;
  }

  if (isNavigating) {
    console.log('Navigation in progress, skipping...');
    return;
  }

  isNavigating = true;
  lastNavigationTime = currentTime;

  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      await mainWindow.loadURL(`http://localhost:3000${pagePath}`);
    } else {
      // Always append index.html to the path
      const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
      const fullUrl = `app://-${normalizedPath}/index.html`;
      console.log('Loading URL:', fullUrl);
      await mainWindow.loadURL(fullUrl);
      console.log('Full navigation URL:', mainWindow.webContents.getURL());
    }
  } catch (error) {
    console.error('Navigation error:', error);
    isNavigating = false; // Reset navigation state on error
    throw error;
  } finally {
    // Set a timeout to reset the navigation state
    setTimeout(() => {
      isNavigating = false;
    }, NAVIGATION_COOLDOWN);
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