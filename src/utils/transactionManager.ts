import { Transaction } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import { createSuccessResponse, createErrorResponse } from './errorHandling.js';

export async function withTransaction<T>(
  callback: (transaction: Transaction) => Promise<T>
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return createSuccessResponse(result);
  } catch (error) {
    await transaction.rollback();
    return createErrorResponse(error);
  }
} 