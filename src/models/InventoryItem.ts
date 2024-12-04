import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index';
import Product from './Product.js';
import Supplier from './Supplier.js';
import Inventory from './Inventory.js';

export interface InventoryItemAttributes {
  id?: string;
  product_id: string;
  supplier_id: string;
  purchase_date: Date;
  quantity: number;
  selling_price: number;
  return_id: string | null;
}

class InventoryItem extends Model<InventoryItemAttributes> implements InventoryItemAttributes {
  public id!: string;
  public product_id!: string;
  public supplier_id!: string;
  public purchase_date!: Date;
  public quantity!: number;
  public selling_price!: number;
  public return_id!: string | null;

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
            model: 'Product', 
            key: 'id',
          },
        },
        supplier_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Supplier', 
            key: 'id',
          },
        },
        purchase_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        selling_price: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        return_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'InventoryItem',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
    this.belongsTo(models.Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
    this.belongsToMany(models.Inventory, { through: 'InventoryItemInventories', as: 'inventories' });
    // Add other associations here if needed
  }
}

export default InventoryItem;