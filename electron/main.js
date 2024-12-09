import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import url from 'url';
import fs from 'fs';
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
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,  // Enable web security
        allowRunningInsecureContent: false  // Disable insecure content
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

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'production') {
      mainWindow.webContents.openDevTools();
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    let startUrl
    
    if (isDevelopment) {
      startUrl = 'http://localhost:3000';
    } else {
      // Add base directory for static assets
      const basePath = path.join(__dirname, '..');
      process.env.ASSET_PREFIX = `file://${basePath}`;
      
      startUrl = url.format({
        pathname: path.join(basePath, 'out', 'index.html'),
        protocol: 'file:',
        slashes: true
      });
      
      // Log the paths for debugging
      console.log('Base Path:', basePath);
      console.log('Start URL:', startUrl);
    }
    
    console.log(`Loading application from: ${startUrl}`);
    
    // For production mode, we need to wait a bit to ensure all resources are ready
    if (!isDevelopment) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await mainWindow.loadURL(startUrl);

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Add keyboard shortcut to toggle DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Toggle DevTools on Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
      if ((input.control && input.shift && input.key.toLowerCase() === 'i') || (process.platform === 'darwin' && input.meta && input.alt && input.key.toLowerCase() === 'i')) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow.webContents.openDevTools();
        }
      }
    });

  } catch (error) {
    console.error('Failed to create window:', error);
    dialog.showErrorBox(
      'Application Error',
      'Failed to start the application. Please check the logs and try again.'
    );
    app.quit();
  }
}

let isNavigating = false;
let lastNavigationTime = 0;
const NAVIGATION_COOLDOWN = 1000; // 1 second cooldown

function navigateTo(pagePath) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!mainWindow) {
    console.error('Main window is not initialized');
    return Promise.reject(new Error('Main window is not initialized'));
  }

  // Prevent recursive navigation
  const currentTime = Date.now();
  if (isNavigating || (currentTime - lastNavigationTime) < NAVIGATION_COOLDOWN) {
    console.log('Navigation in progress or too frequent, skipping...');
    return Promise.resolve();
  }

  const currentUrl = mainWindow.webContents.getURL();
  if (currentUrl.includes(pagePath)) {
    console.log('Already on requested page, skipping navigation');
    return Promise.resolve();
  }
  
  isNavigating = true;
  lastNavigationTime = currentTime;
  
  return new Promise((resolve, reject) => {
    try {
      if (isDevelopment) {
        const fullUrl = `http://localhost:3000${pagePath.startsWith('/') ? pagePath : `/${pagePath}`}`;
        console.log(`Navigating to: ${fullUrl}`);
        mainWindow.loadURL(fullUrl)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            isNavigating = false;
          });
      } else {
        // Normalize the path by removing any absolute path components and converting backslashes
        const normalizedPath = pagePath
          .replace(/^[A-Z]:[\\\/]/gi, '') // Remove drive letter if present (case insensitive)
          .replace(/^[\\\/]+/, '') // Remove leading slashes
          .replace(/\\/g, '/') // Convert backslashes to forward slashes
          .replace(/^C:\//, '') // Specifically remove any remaining C:/ pattern
          .replace(/^\/+/, ''); // Remove any remaining leading slashes

        // Construct the full path relative to the out directory
        const fullPath = path.join(
          __dirname, 
          '..', 
          'out',
          ...normalizedPath.split('/').filter(Boolean),
          'index.html'
        );

        console.log('Attempting to load file:', fullPath);
        
        if (fs.existsSync(fullPath)) {
          console.log(`Loading: ${fullPath}`);
          const fileUrl = url.format({
            pathname: fullPath,
            protocol: 'file:',
            slashes: true
          });
          mainWindow.loadURL(fileUrl)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              isNavigating = false;
            });
        } else {
          console.error(`Page not found: ${fullPath}`);
          // Try to load the page without index.html first
          const altPath = path.join(
            __dirname,
            '..',
            'out',
            ...normalizedPath.split('/').filter(Boolean)
          );
          
          if (fs.existsSync(altPath)) {
            const fileUrl = url.format({
              pathname: altPath,
              protocol: 'file:',
              slashes: true
            });
            mainWindow.loadURL(fileUrl)
              .then(resolve)
              .catch(() => {
                // If that fails, try the 404 page
                const notFoundPath = path.join(__dirname, '..', 'out', '404.html');
                if (fs.existsSync(notFoundPath)) {
                  return mainWindow.loadURL(url.format({
                    pathname: notFoundPath,
                    protocol: 'file:',
                    slashes: true
                  }));
                }
                throw new Error('404 page not found');
              })
              .catch(reject)
              .finally(() => {
                isNavigating = false;
              });
          } else {
            const notFoundPath = path.join(__dirname, '..', 'out', '404.html');
            if (fs.existsSync(notFoundPath)) {
              mainWindow.loadURL(url.format({
                pathname: notFoundPath,
                protocol: 'file:',
                slashes: true
              }))
                .then(resolve)
                .catch(reject)
                .finally(() => {
                  isNavigating = false;
                });
            } else {
              const error = new Error('404 page not found');
              console.error(error);
              isNavigating = false;
              reject(error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      isNavigating = false;
      reject(error);
    }
  });
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