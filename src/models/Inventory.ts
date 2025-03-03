import { Model, DataTypes, Sequelize } from 'sequelize';
import InventoryItem from './InventoryItem.js';
import Return from './Return.js';
import Order from './Order.js';
import Shop from './Shop.js';
import Product from './Product.js';
import StockMovement from './StockMovement.js';
// import InventoryAlert from './InventoryAlert.js';
// import InventoryForecast from './InventoryForecast.js';

export interface InventoryAttributes {
  id?: string;
  name: string;
  level: number;
  value: number;
  description?: string;
  shopId?: string | null;
  status?: 'Low' | 'Medium' | 'High';
}

class Inventory extends Model<InventoryAttributes> implements InventoryAttributes {
  public id!: string;
  public name!: string;
  public level!: number;
  public value!: number;
  public description!: string;
  public shopId!: string | null;
  public status!: 'Low' | 'Medium' | 'High';

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

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
        shopId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Shops',
            key: 'id',
          },
        },
        status: {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: 'Low'
        },
      },
      {
        sequelize,
        tableName: 'Inventories',
        modelName: 'Inventory',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Shop, { foreignKey: 'shopId', as: 'shop' });
    this.hasMany(models.InventoryItem, { foreignKey: 'inventory_id', as: 'inventoryItems' });
    this.belongsToMany(models.Product, {
      through: models.InventoryItem,
      foreignKey: 'inventory_id',
      otherKey: 'product_id',
      as: 'products'
    });
    this.hasMany(models.StockMovement, {
      foreignKey: 'source_inventory_id',
      as: 'sourceMovements'
    });
    this.hasMany(models.StockMovement, {
      foreignKey: 'destination_inventory_id',
      as: 'destinationMovements'
    });
    // Removing non-existent model associations:
    // this.hasMany(models.InventoryAlert, {
    //   foreignKey: 'inventoryId',
    //   as: 'alerts'
    // });
    // this.hasMany(models.InventoryForecast, {
    //   foreignKey: 'inventoryId',
    //   as: 'forecasts'
    // });
  }

  public async updateStock(quantity: number): Promise<void> {
    this.level += quantity;
    await this.save();
  }

  public async calculateValue(): Promise<void> {
    const items = await this.getInventoryItems({
      include: [Product]
    });

    this.value = items.reduce((sum, item) => {
      const productValue = item.product?.purchasePrice 
        ? item.product.purchasePrice * item.quantity
        : 0;
      return sum + productValue;
    }, 0);
    
    await this.save();
  }

  declare public getInventoryItems: (options?: any) => Promise<InventoryItem[]>;
}

export default Inventory;