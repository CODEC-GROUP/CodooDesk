// Type definition for the electron window interface
declare global {
  interface Window {
    electron: {
      invoke: (channel: string, data?: any) => Promise<any>;
    } | undefined;
  }
}

/**
 * Safely invoke an IPC method, handling cases where electron is not available
 * @param channel The IPC channel to invoke
 * @param data The data to send
 * @param fallback Optional fallback value to return when electron is not available
 */
export async function safeIpcInvoke<T>(
  channel: string,
  data?: any,
  fallback: T | null = null
): Promise<T | null> {
  try {
    // Log attempt to invoke IPC
    console.log(`[IPC] Attempting to invoke channel: ${channel}`, { data });
    
    // Check if we're in an Electron context
    if (typeof window === 'undefined') {
      console.error('[IPC] Failed: Window is undefined');
      return fallback;
    }
    
    if (!window.electron) {
      console.error('[IPC] Failed: Electron context not available in window. Make sure preload script is properly configured.');
      return fallback;
    }
    
    // Log that we're about to make the IPC call
    console.log(`[IPC] Invoking electron.invoke for channel: ${channel}`);
    
    const result = await window.electron.invoke(channel, data);
    
    // Log the result (but be careful not to log sensitive data)
    console.log(`[IPC] Success: Response received for channel ${channel}`);
    
    return result;
  } catch (error) {
    // Enhanced error logging
    console.error(`[IPC] Error invoking channel ${channel}:`, {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      channel,
      data: typeof data === 'object' ? Object.keys(data) : typeof data // Log data structure without sensitive values
    });
    
    return fallback;
  }
}

/**
 * Check if we're running in Electron
 */
export function isElectron(): boolean {
  const isElectronContext = typeof window !== 'undefined' && !!window.electron;
  console.log('[IPC] isElectron check:', isElectronContext);
  return isElectronContext;
}
