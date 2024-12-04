import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Order from './Order.js';
import Inventory from './Inventory.js';

export interface ReturnAttributes {
  id?: string;
  orderId: string;
  customerName: string;
  productName: string;
  quantity: number;
  amount: number;
  reason: string;
  description?: string | null;
  paymentMethod: string;
  status: 'pending' | 'completed';
  date: Date;
}

class Return extends Model<ReturnAttributes> implements ReturnAttributes {
  public id!: string;
  public orderId!: string;
  public customerName!: string;
  public productName!: string;
  public quantity!: number;
  public amount!: number;
  public reason!: string;
  public description!: string | null;
  public paymentMethod!: string;
  public status!: 'pending' | 'completed';
  public date!: Date;

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
        customerName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        productName: {
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
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    this.belongsTo(models.Inventory, { foreignKey: 'inventoryId', as: 'inventory' });
    // Add other associations here if needed
  }
}

export default Return;