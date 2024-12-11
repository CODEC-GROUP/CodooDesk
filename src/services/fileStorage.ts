'use client'

import { safeIpcInvoke } from '@/lib/ipc';

type FileCategory = 'shop' | 'products' | 'categories';

interface FileStorageService {
  storeFile(fileBuffer: Buffer, fileName: string, category: FileCategory): Promise<string>;
  getFilePath(relativePath: string): Promise<string>;
  deleteFile(relativePath: string): Promise<void>;
  fileExists(relativePath: string): Promise<boolean>;
}

interface FileStorageResponse {
  success: boolean;
  message?: string;
  path?: string;
  exists?: boolean;
}

class FileStorageServiceImpl implements FileStorageService {
  async storeFile(
    fileBuffer: Buffer,
    fileName: string,
    category: FileCategory
  ): Promise<string> {
    try {
      const response = await safeIpcInvoke<FileStorageResponse>('file:store', {
        buffer: fileBuffer,
        fileName,
        category
      });

      if (!response?.success || !response?.path) {
        throw new Error(response?.message || 'Failed to store file');
      }
      
      return response.path;
    } catch (error: any) {
      console.error('Error storing file:', error);
      throw new Error(error?.message || 'Failed to store file');
    }
  }

  async getFilePath(relativePath: string): Promise<string> {
    try {
      const response = await safeIpcInvoke('file:getPath', { relativePath }, { success: false, path: '' }) as FileStorageResponse;
      
      if (!response?.success || !response?.path) {
        throw new Error(response?.message || 'Failed to get file path');
      }
      
      return response.path;
    } catch (error: any) {
      console.error('Error getting file path:', error);
      throw new Error(error?.message || 'Failed to get file path');
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      const response = await safeIpcInvoke('file:delete', { relativePath }, { success: false }) as FileStorageResponse;
      
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to delete file');
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      throw new Error(error?.message || 'Failed to delete file');
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const response = await safeIpcInvoke('file:exists', { relativePath }, { success: false, exists: false }) as FileStorageResponse;
      
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to check file existence');
      }
      
      return !!response.exists;
    } catch (error: any) {
      console.error('Error checking file existence:', error);
      throw new Error(error?.message || 'Failed to check file existence');
    }
  }
}

export const fileStorage = new FileStorageServiceImpl();
