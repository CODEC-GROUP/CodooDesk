import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import os from 'os';

// Define valid file categories
type FileCategory = 'shop' | 'products' | 'categories';

// Base directory is now in .salesbox in the user's home directory
const baseDir = path.join(os.homedir(), '.salesbox', 'files');

// Define directory structure
const directories: Record<FileCategory, string> = {
  shop: path.join(baseDir, 'shop'),
  products: path.join(baseDir, 'products'),
  categories: path.join(baseDir, 'categories'),
};

// Ensure all required directories exist
function createDirectoryStructure() {
  // Create base directory
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Create subdirectories
  Object.values(directories).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Initialize directory structure
createDirectoryStructure();

export function registerFileHandlers() {
  // Store file handler
  ipcMain.handle('file:store', async (event, { buffer, fileName, category }: { 
    buffer: Buffer, 
    fileName: string, 
    category: FileCategory 
  }) => {
    try {
      // Validate category
      if (!Object.keys(directories).includes(category)) {
        throw new Error('Invalid file category');
      }

      const categoryDir = directories[category];
      const filePath = path.join(categoryDir, fileName);
      
      // Write file
      await fs.promises.writeFile(filePath, buffer);

      // Return the full absolute path
      return {
        success: true,
        path: filePath,
        fullPath: path.resolve(filePath)
      };
    } catch (error) {
      console.error('Error storing file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to store file'
      };
    }
  });

  // Get file path handler
  ipcMain.handle('file:getPath', async (event, { relativePath }: { relativePath: string }) => {
    try {
      const fullPath = path.join(baseDir, relativePath);
      
      // Verify the file exists and is within the base directory
      if (!fs.existsSync(fullPath) || !fullPath.startsWith(baseDir)) {
        throw new Error('File not found or access denied');
      }
      
      // Verify the file is in a valid category directory
      const category = relativePath.split(path.sep)[0] as FileCategory;
      if (!Object.keys(directories).includes(category)) {
        throw new Error('Invalid file category');
      }

      return {
        success: true,
        path: fullPath
      };
    } catch (error) {
      console.error('Error getting file path:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get file path'
      };
    }
  });

  // Delete file handler
  ipcMain.handle('file:delete', async (event, { relativePath }: { relativePath: string }) => {
    try {
      const fullPath = path.join(baseDir, relativePath);
      
      // Verify the file is within the base directory
      if (!fullPath.startsWith(baseDir)) {
        throw new Error('Access denied');
      }
      
      // Verify the file is in a valid category directory
      const category = relativePath.split(path.sep)[0] as FileCategory;
      if (!Object.keys(directories).includes(category)) {
        throw new Error('Invalid file category');
      }

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete file'
      };
    }
  });

  // Check file existence handler
  ipcMain.handle('file:exists', async (event, { relativePath }: { relativePath: string }) => {
    try {
      const fullPath = path.join(baseDir, relativePath);
      
      // Verify the path is within the base directory
      if (!fullPath.startsWith(baseDir)) {
        throw new Error('Access denied');
      }
      
      // Verify the file is in a valid category directory
      const category = relativePath.split(path.sep)[0] as FileCategory;
      if (!Object.keys(directories).includes(category)) {
        throw new Error('Invalid file category');
      }

      return {
        success: true,
        exists: fs.existsSync(fullPath)
      };
    } catch (error) {
      console.error('Error checking file existence:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check file existence'
      };
    }
  });
}