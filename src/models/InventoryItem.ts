import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index';
import Product from './Product.js';
import Supplier from './Supplier.js';
import Inventory from './Inventory.js';

export interface InventoryItemAttributes {
  id?: string;
  product_id: string;
  inventory_id: string;
  supplier_id?: string;
  quantity: number;
  minimum_quantity: number;
  maximum_quantity: number;
  reorder_point: number;
  unit_cost: number;
  selling_price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_restock_date?: Date;
  last_stocktake_date?: Date;
  value: number;
  batch_number?: string;
  expiry_date?: Date;
  location?: string;
  stock_type: 'purchase' | 'production' | 'return' | 'transfer';
  unit_type: 'piece' | 'kg' | 'liter' | 'meter';
  createdAt?: Date;
  updatedAt?: Date;
}

class InventoryItem extends Model<InventoryItemAttributes> implements InventoryItemAttributes {
  public id!: string;
  public product_id!: string;
  public inventory_id!: string;
  public supplier_id?: string;
  public quantity!: number;
  public minimum_quantity!: number;
  public maximum_quantity!: number;
  public reorder_point!: number;
  public unit_cost!: number;
  public selling_price!: number;
  public status!: 'in_stock' | 'low_stock' | 'out_of_stock';
  public last_restock_date?: Date;
  public last_stocktake_date?: Date;
  public value!: number;
  public batch_number!: string;
  public expiry_date!: Date;
  public location!: string;
  public stock_type!: 'purchase' | 'production' | 'return' | 'transfer';
  public unit_type!: 'piece' | 'kg' | 'liter' | 'meter';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public product?: Product;

  static initModel(sequelize: Sequelize): typeof InventoryItem {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        product_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Products',
            key: 'id',
          },
        },
        inventory_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Inventory',
            key: 'id',
          },
        },
        supplier_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Suppliers',
            key: 'id',
          },
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        minimum_quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        maximum_quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        reorder_point: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        unit_cost: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        selling_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock'),
          allowNull: false,
          defaultValue: 'out_of_stock',
        },
        last_restock_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_stocktake_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        value: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        batch_number: {
          type: DataTypes.STRING,
          allowNull: true
        },
        expiry_date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        location: {
          type: DataTypes.STRING,
          allowNull: true
        },
        stock_type: {
          type: DataTypes.ENUM('purchase', 'production', 'return', 'transfer'),
          allowNull: false,
          defaultValue: 'purchase'
        },
        unit_type: {
          type: DataTypes.ENUM('piece', 'kg', 'liter', 'meter'),
          allowNull: false,
          defaultValue: 'piece'
        }
      },
      {
        sequelize,
        modelName: 'InventoryItem',
        timestamps: true,
        hooks: {
          beforeUpdate: async (item: InventoryItem) => {
            // Check if quantity has changed
            const changes = item.changed();
            if (changes && changes.includes('quantity')) {
              item.last_restock_date = new Date();
            }
          },
          beforeCreate: async (item: InventoryItem) => {
            // Set initial last_restock_date when creating with quantity
            if (item.quantity > 0) {
              item.last_restock_date = new Date();
            }
          }
        }
      }
    );
  }

  static associate(models: any) {
    // InventoryItem belongs to a Product
    InventoryItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    // InventoryItem belongs to an Inventory
    InventoryItem.belongsTo(Inventory, {
      foreignKey: 'inventory_id',
      as: 'inventory'
    });

    // InventoryItem belongs to a Supplier
    InventoryItem.belongsTo(Supplier, {
      foreignKey: 'supplier_id',
      as: 'supplier'
    });
  }
}

export default InventoryItem;