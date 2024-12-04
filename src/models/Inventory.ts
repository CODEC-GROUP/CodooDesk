import { Model, DataTypes, Sequelize } from 'sequelize';
import InventoryItem from './InventoryItem.js';
import Return from './Return.js';
import Order from './Order.js';
import Shop from './Shop.js'; // Added Shop import

export interface InventoryAttributes {
  id?: string;
  name: string;
  level: number;
  value: number;
  description?: string;
  shopId: string; // Added shopId
}

class Inventory extends Model<InventoryAttributes> implements InventoryAttributes {
  public id!: string;
  public name!: string;
  public level!: number;
  public value!: number;
  public description?: string;
  public shopId!: string; // Added shopId

  static initModel(sequelize: Sequelize): typeof Inventory {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        level: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        value: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        shopId: {  // Added shopId column
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Shops',
            key: 'id',
          },
        },
      },
      {
        sequelize,
        modelName: 'Inventory',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsToMany(models.InventoryItem, { through: 'InventoryItemInventories', as: 'inventoryItems' });
    this.hasMany(models.Return, { foreignKey: 'inventoryId', as: 'returns' });
    this.hasMany(models.Order, { foreignKey: 'inventoryId', as: 'orders' });
    this.belongsTo(models.Shop, { foreignKey: 'shopId', as: 'shop' }); // Added belongsTo association
  }
}

export default Inventory;