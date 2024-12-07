import { ipcMain, BrowserWindow } from 'electron';
import { printer as ThermalPrinter, types as PrinterTypes } from 'node-thermal-printer';

// Define CharacterSet if not imported
enum CharacterSet {
    PC437_USA = 'PC437_USA',
    // Add other character sets as needed
}

class PrinterService {
    private printer: ThermalPrinter | null = null;

    constructor() {
        this.initPrinter();
        this.registerPrinterHandlers();
    }

    private initPrinter(): void {
        try {
            this.printer = new ThermalPrinter({
                type: PrinterTypes.EPSON,
                interface: 'printer:EPSON',
                options: {
                    timeout: 3000
                },
                width: 48,
                characterSet: CharacterSet.PC437_USA,
                removeSpecialCharacters: false,
                lineCharacter: '-'
            });
        } catch (error) {
            console.error('Failed to initialize printer:', error);
            this.printer = null;
        }
    }

    private registerPrinterHandlers(): void {
        ipcMain.handle('printer:detect', async (): Promise<{ success: boolean }> => {
            try {
                const isConnected: boolean = await this.printer?.isPrinterConnected() ?? false;
                return { success: isConnected };
            } catch (error) {
                console.error('Error detecting printer:', error);
                return { success: false };
            }
        });

        ipcMain.handle('printer:has-printer', async (): Promise<{ success: boolean }> => {
            try {
                const isConnected: boolean = await this.printer?.isPrinterConnected() ?? false;
                return { success: isConnected };
            } catch (error) {
                console.error('Error checking printer:', error);
                return { success: false };
            }
        });

        ipcMain.handle('printer:print', async (_event: Electron.IpcMainInvokeEvent, data: { 
          template: string,
          businessInfo: {
            fullBusinessName: string;
            shopLogo?: string;
            address: {
              street: string;
              city: string;
              state: string;
              postalCode?: string;
              country: string;
            };
            taxIdNumber?: string;
            shop: {
              id: string;
              name: string;
            };
          },
          receipt: {
            saleId: string;
            receiptId: string;
            customerName?: string;
            customerPhone?: string;
            customerEmail?: string;
            items: Array<{
              name: string;
              quantity: number;
              sellingPrice: number;
            }>;
            subtotal: number;
            discount: number;
            total: number;
            amountPaid: number;
            change: number;
            date: Date;
            paymentMethod: string;
            salesPersonId: string;
            salesPersonName: string;
            paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
          }
        }): Promise<{ success: boolean; error?: string }> => {
          try {
            const { template } = data;
            await this.printer?.print(template);
            await this.printer?.cut();
            return { success: true };
          } catch (error) {
            console.error('Error printing:', error);
            return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
          }
        });

        ipcMain.handle('printer:preview', async (_event: Electron.IpcMainInvokeEvent, data: { template: string }): Promise<{ success: boolean; error?: string }> => {
          try {
            const { template } = data;
            const previewWindow = new BrowserWindow({
              width: 400,
              height: 600,
              webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
              },
              autoHideMenuBar: true,
              title: 'Print Preview'
            });

            // Add basic styling to make the preview look better
            const styledTemplate = `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body {
                    font-family: 'Courier New', monospace;
                    padding: 20px;
                    max-width: 300px;
                    margin: 0 auto;
                    background: white;
                  }
                  @media print {
                    body { margin: 0; padding: 0; }
                    button { display: none !important; }
                  }
                </style>
              </head>
              <body>
                ${template}
              </body>
              </html>
            `;

            await previewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledTemplate)}`);
            
            // Add print button with better styling
            await previewWindow.webContents.executeJavaScript(`
              const printButton = document.createElement('button');
              printButton.textContent = 'Print';
              printButton.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
              printButton.onclick = () => {
                window.print();
              };
              document.body.appendChild(printButton);
            `);

            // Handle window close
            previewWindow.on('closed', () => {
              // Cleanup if needed
            });

            return { success: true };
          } catch (error) {
            console.error('Error showing preview:', error);
            return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
          }
        });
    }
}

// Export the registerPrinterHandlers function
export function registerPrinterHandlers() {
  const printerService = new PrinterService();
  // Any additional setup can be done here if needed
}

export default PrinterService;