import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import User from './User.js';
import Shop from './Shop.js';

export interface AuditLogAttributes {
  id?: string;
  shopId: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'transfer' | 'adjustment' | 'void';
  entityType: 'sale' | 'expense' | 'product' | 'inventory' | 'customer' | 'supplier' | 'user' | 'treasury' | 'shop' | 'payment' | 'return';
  entityId: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'pending';
  errorMessage?: string;
  performedAt: Date;
}

class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
  public id!: string;
  public shopId!: string;
  public userId!: string;
  public action!: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'transfer' | 'adjustment' | 'void';
  public entityType!: 'sale' | 'expense' | 'product' | 'inventory' | 'customer' | 'supplier' | 'user' | 'treasury' | 'shop' | 'payment' | 'return';
  public entityId!: string;
  public previousState?: Record<string, any>;
  public newState?: Record<string, any>;
  public changes?: Record<string, { old: any; new: any }>;
  public metadata?: Record<string, any>;
  public ipAddress?: string;
  public userAgent?: string;
  public status!: 'success' | 'failure' | 'pending';
  public errorMessage?: string;
  public performedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof AuditLog {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        shopId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Shops',
            key: 'id',
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        action: {
          type: DataTypes.ENUM('create', 'update', 'delete', 'view', 'login', 'logout', 'transfer', 'adjustment', 'void'),
          allowNull: false,
        },
        entityType: {
          type: DataTypes.ENUM(
            'sale',
            'expense',
            'product',
            'inventory',
            'customer',
            'supplier',
            'user',
            'treasury',
            'shop',
            'payment',
            'return'
          ),
          allowNull: false,
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        previousState: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: 'Complete state of the entity before the action',
        },
        newState: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: 'Complete state of the entity after the action',
        },
        changes: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: 'Specific fields that were changed, with old and new values',
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: 'Additional contextual information about the action',
        },
        ipAddress: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('success', 'failure', 'pending'),
          allowNull: false,
          defaultValue: 'success',
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        performedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'AuditLog',
        timestamps: true,
        indexes: [
          {
            fields: ['shopId'],
          },
          {
            fields: ['userId'],
          },
          {
            fields: ['action'],
          },
          {
            fields: ['entityType', 'entityId'],
          },
          {
            fields: ['performedAt'],
          },
          {
            fields: ['status'],
          },
        ],
      }
    );
  }

  static associate() {
    AuditLog.belongsTo(Shop, {
      foreignKey: 'shopId',
      as: 'shop',
    });
    AuditLog.belongsTo(User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

export default AuditLog;
