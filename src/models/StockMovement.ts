import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Product from './Product.js';
import User from './User.js';
import Inventory from './Inventory.js';

export interface StockMovementAttributes {
  id?: string;
  productId: string;
  movementType: 'added' | 'sold' | 'returned' | 'adjustment' | 'transfer';
  quantity: number;
  supplier_id: string | null;
  reason: string | null;
  performedBy_id: string;
  source_inventory_id: string;
  destination_inventory_id: string | null;
  direction: 'inbound' | 'outbound' | 'transfer';
  transaction_reference: string | null;
  cost_per_unit: number;
  total_cost: number;
  adjustment_reason?: string | null;
  physical_count?: number | null;
  system_count?: number | null;
  discrepancy?: number | null;
  adjusted_by_user_id?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  reference?: string | number;
}

class StockMovement extends Model<StockMovementAttributes> implements StockMovementAttributes {
  public id!: string;
  public productId!: string;
  public movementType!: 'added' | 'sold' | 'returned' | 'adjustment' | 'transfer';
  public quantity!: number;
  public supplier_id!: string | null;
  public reason!: string | null;
  public performedBy_id!: string;
  public source_inventory_id!: string;
  public destination_inventory_id!: string | null;
  public direction!: 'inbound' | 'outbound' | 'transfer';
  public transaction_reference!: string | null;
  public cost_per_unit!: number;
  public total_cost!: number;
  public createdAt?: Date;
  public updatedAt?: Date;

  // Add new fields for tracking adjustments
  public adjustment_reason!: string | null;
  public physical_count!: number | null;
  public system_count!: number | null;
  public discrepancy!: number | null;
  public adjusted_by_user_id!: string | null;

  static initModel(sequelize: Sequelize): typeof StockMovement {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Products',
            key: 'id',
          },
        },
        movementType: {
          type: DataTypes.ENUM('added', 'sold', 'returned', 'adjustment', 'transfer'),
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        supplier_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        reason: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        performedBy_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        source_inventory_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Inventories',
            key: 'id',
          },
        },
        destination_inventory_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Inventories',
            key: 'id',
          },
        },
        direction: {
          type: DataTypes.ENUM('inbound', 'outbound', 'transfer'),
          allowNull: false,
        },
        transaction_reference: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        cost_per_unit: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        total_cost: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        adjustment_reason: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        physical_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        system_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        discrepancy: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        adjusted_by_user_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
      },
      {
        sequelize,
        modelName: 'StockMovement',
        timestamps: true,
      }
    );
  }

  static associate() {
    StockMovement.belongsTo(Product, {
      foreignKey: 'productId',
      as: 'product',
    });
    StockMovement.belongsTo(User, {
      foreignKey: 'performedBy_id',
      as: 'performer',
    });
    StockMovement.belongsTo(Inventory, {
      foreignKey: 'source_inventory_id',
      as: 'sourceInventory',
    });
    StockMovement.belongsTo(Inventory, {
      foreignKey: 'destination_inventory_id',
      as: 'destinationInventory',
    });
  }
}

export default StockMovement;
