import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index';
import Product from './Product.js';
import Supplier from './Supplier.js';
import Inventory from './Inventory.js';

export interface InventoryItemAttributes {
  id?: string;
  item_number: string;
  product_id: string;
  inventory_id: string;
  supplier_id?: string;
  quantity_supplied: number;
  cost_price: number;
  selling_price: number;
  quantity_sold: number;
  returned_to_shop: number;
  returned_to_supplier: number;
  quantity_left: number;
  amount_sold: number;
  reorder_point: number;
  unit_cost: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_stocktake_date?: Date;
  expiry_date?: Date;
  unit_type: 'piece' | 'kg' | 'liter' | 'meter';
  createdAt?: Date;
  updatedAt?: Date;
}

class InventoryItem extends Model<InventoryItemAttributes> implements InventoryItemAttributes {
  public id!: string;
  public item_number!: string;
  public product_id!: string;
  public inventory_id!: string;
  public supplier_id?: string;
  public quantity_supplied!: number;
  public cost_price!: number;
  public selling_price!: number;
  public quantity_sold!: number;
  public returned_to_shop!: number;
  public returned_to_supplier!: number;
  public quantity_left!: number;
  public amount_sold!: number;
  public reorder_point!: number;
  public unit_cost!: number;
  public status!: 'in_stock' | 'low_stock' | 'out_of_stock';
  public last_stocktake_date?: Date;
  public expiry_date!: Date;
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
        item_number: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: false,
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
        quantity_supplied: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        cost_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        selling_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        quantity_sold: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        returned_to_shop: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        returned_to_supplier: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        quantity_left: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        amount_sold: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
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
        status: {
          type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock'),
          allowNull: false,
          defaultValue: 'out_of_stock',
        },
        last_stocktake_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        expiry_date: {
          type: DataTypes.DATE,
          allowNull: true
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