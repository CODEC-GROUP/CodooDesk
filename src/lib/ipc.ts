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
      console.warn('[IPC] Window is undefined, using fallback');
      return fallback;
    }
    
    if (!window.electron) {
      console.warn('[IPC] Electron is not available in window context, using fallback');
      return fallback;
    }
    
    // Log that we're about to make the IPC call
    console.log(`[IPC] Invoking electron.invoke for channel: ${channel}`);
    
    const result = await window.electron.invoke(channel, data);
    
    // Log the result
    console.log(`[IPC] Response received for channel ${channel}:`, result);
    
    return result;
  } catch (error) {
    // Log detailed error information
    console.error(`[IPC] Error invoking channel ${channel}:`, {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      data
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
