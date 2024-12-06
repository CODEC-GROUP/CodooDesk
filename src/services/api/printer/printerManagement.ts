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

        ipcMain.handle('printer:print', async (_event: Electron.IpcMainInvokeEvent, data: { template: string }): Promise<{ success: boolean; error?: string }> => {
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
                const previewWindow: BrowserWindow = new BrowserWindow({
                    width: 400,
                    height: 600,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    }
                });

                await previewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(template)}`);
                await previewWindow.webContents.executeJavaScript(`
                    const printButton = document.createElement('button');
                    printButton.textContent = 'Imprimer';
                    printButton.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;';
                    printButton.onclick = () => {
                        window.print();
                    };
                    document.body.appendChild(printButton);
                `);

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