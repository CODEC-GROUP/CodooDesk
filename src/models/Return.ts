import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Order from './Order.js';
import Product from './Product.js';
import Shop from './Shop.js';

export interface ReturnAttributes {
  id?: string;
  orderId: string;
  productId: string;
  shopId?: string;
  customerFirstName: string;
  customerLastName: string;
  quantity: number;
  amount: number;
  reason: string;
  description?: string | null;
  paymentMethod: string;
  status: 'pending' | 'completed';
  date: Date;
  product?: Product;
  order?: Order;
  shop?: Shop;
  createdAt?: Date;
  updatedAt?: Date;
}

class Return extends Model<ReturnAttributes> implements ReturnAttributes {
  public id!: string;
  public orderId!: string;
  public productId!: string;
  public shopId?: string;
  public customerFirstName!: string;
  public customerLastName!: string;
  public quantity!: number;
  public amount!: number;
  public reason!: string;
  public description!: string | null;
  public paymentMethod!: string;
  public status!: 'pending' | 'completed';
  public date!: Date;
  public product?: Product;
  public order?: Order;
  public shop?: Shop;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof Return {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        orderId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Orders',
            key: 'id',
          },
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Products',
            key: 'id',
          },
        },
        shopId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        customerFirstName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        customerLastName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        reason: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        paymentMethod: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('pending', 'completed'),
          allowNull: false,
          defaultValue: 'pending',
        },
        date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Return',
        tableName: 'Returns',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
    this.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });
    this.belongsTo(models.Shop, {
      foreignKey: 'shopId',
      as: 'shop'
    });
  }
}

export default Return;