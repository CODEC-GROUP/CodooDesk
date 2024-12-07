import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Sales from './Sales.js';
import Return from './Return.js';
import Inventory from './Inventory.js';
import Product from './Product.js';

export interface OrderAttributes {
  id?: string;
  saleId: string;
  product_id?: string;
  productName?: string;
  quantity: number;
  sellingPrice: number;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
}

class Order extends Model<OrderAttributes> implements OrderAttributes {
  public id!: string;
  public saleId!: string;
  public product_id?: string;
  public productName?: string;
  public quantity!: number;
  public sellingPrice!: number;
  public paymentStatus!: 'unpaid' | 'paid' | 'refunded';

  static initModel(sequelize: Sequelize): typeof Order {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        saleId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Sales',
            key: 'id',
          },
        },
        product_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        productName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        sellingPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        paymentStatus: {
          type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
          defaultValue: 'unpaid',
        },
      },
      {
        sequelize,
        modelName: 'Order',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Sales, { foreignKey: 'saleId', as: 'sale' });
    this.hasOne(models.Return, { foreignKey: 'orderId', as: 'return' });
    this.belongsTo(models.Inventory, { foreignKey: 'inventoryId', as: 'inventory' });
    this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
  }
}

export default Order;