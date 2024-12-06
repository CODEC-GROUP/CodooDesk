import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import OhadaCode from './OhadaCode.js';
import Shop from './Shop.js';

export interface ExpenseAttributes {
  id?: string;
  date: Date;
  description: string;
  amount: number;
  paymentMethod: string;
  ohadaCodeId: string;
  shopId?: string;
  userId?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  ohadaCode?: {
    name: string;
  };
}

class Expense extends Model<ExpenseAttributes> implements ExpenseAttributes {
  public id!: string;
  public date!: Date;
  public description!: string;
  public amount!: number;
  public paymentMethod!: string;
  public ohadaCodeId!: string;
  public shopId?: string;
  public userId?: string;
  public status?: 'pending' | 'completed' | 'cancelled';
  public ohadaCode?: {
    name: string;
  };

  static initModel(sequelize: Sequelize) {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ohadaCodeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
        defaultValue: 'pending',
      }
    }, {
      sequelize,
      modelName: 'Expense'
    });
  }

  static associate() {
    Expense.belongsTo(Shop, {
      foreignKey: 'shopId',
      as: 'shop',
    });
    Expense.belongsTo(OhadaCode, {
      foreignKey: 'ohadaCodeId',
      as: 'ohadaCode',
    });
  }
}

export default Expense;