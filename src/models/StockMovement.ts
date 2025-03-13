import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import InventoryItem from './InventoryItem.js';
import User from './User.js';

export interface StockMovementAttributes {
  id?: string;
  inventoryItem_id: string;
  movementType: 'added' | 'sold' | 'returned' | 'adjustment' | 'transfer';
  quantity: number;
  direction: 'inbound' | 'outbound';
  source_inventory_id: string;
  destination_inventory_id?: string | null;
  reason?: string;
  cost_per_unit: number;
  total_cost: number;
  performedBy: string;
  status: 'pending' | 'completed' | 'cancelled';
  reference_number?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class StockMovement extends Model<StockMovementAttributes> implements StockMovementAttributes {
  public id!: string;
  public inventoryItem_id!: string;
  public movementType!: 'added' | 'sold' | 'returned' | 'adjustment' | 'transfer';
  public quantity!: number;
  public direction!: 'inbound' | 'outbound';
  public source_inventory_id!: string;
  public destination_inventory_id?: string;
  public reason?: string;
  public cost_per_unit!: number;
  public total_cost!: number;
  public performedBy!: string;
  public status!: 'pending' | 'completed' | 'cancelled';
  public reference_number?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof StockMovement {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        inventoryItem_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'InventoryItems',
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
        direction: {
          type: DataTypes.ENUM('inbound', 'outbound'),
          allowNull: false,
        },
        source_inventory_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        destination_inventory_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        reason: {
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
        performedBy: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending',
        },
        reference_number: {
          type: DataTypes.STRING,
          allowNull: true,
        }
      },
      {
        sequelize,
        modelName: 'StockMovement',
        tableName: 'StockMovements',
        timestamps: true,
        hooks: {
          afterCreate: async (movement: StockMovement) => {
            // Update InventoryItem quantity
            const inventoryItem = await InventoryItem.findByPk(movement.inventoryItem_id);
            if (inventoryItem) {
              const quantityChange = movement.direction === 'inbound' ? movement.quantity : -movement.quantity;
              await inventoryItem.increment('quantity', { by: quantityChange });
              
              // Update last_restock_date if it's an inbound movement
              if (movement.direction === 'inbound') {
                await inventoryItem.update({ last_restock_date: new Date() });
              }
            }
          }
        }
      }
    );
  }

  static associate(models: any) {
    // StockMovement belongs to an InventoryItem
    StockMovement.belongsTo(models.InventoryItem, {
      foreignKey: 'inventoryItem_id',
      as: 'inventoryItem'
    });

    // StockMovement belongs to a User (performer)
    StockMovement.belongsTo(models.User, {
      foreignKey: 'performedBy',
      as: 'performer'
    });
  }
}

export default StockMovement;
