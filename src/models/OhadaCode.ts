import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Income from './Income.js';
import Expense from './Expense.js';

export interface OhadaCodeAttributes {
  id?: string;
  code: string;
  name: string;
  description: string;
  type: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
  classification: string;
  subclass?: string;
}

class OhadaCode extends Model<OhadaCodeAttributes> implements OhadaCodeAttributes {
  public id!: string;
  public code!: string;
  public name!: string;
  public description!: string;
  public type!: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
  public classification!: string;
  public subclass?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof OhadaCode {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        code: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM('income', 'expense', 'asset', 'liability', 'equity'),
          allowNull: false,
        },
        classification: {
          type: DataTypes.STRING,
          allowNull: false,
          comment: 'Main classification according to OHADA (e.g., "Class 7 - Revenue")',
        },
        subclass: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Sub-classification if applicable',
        },
      },
      {
        sequelize,
        modelName: 'OhadaCode',
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['code'],
          },
        ],
      }
    );
  }

  static associate() {
    OhadaCode.hasMany(Income, {
      foreignKey: 'ohadaCodeId',
      as: 'incomes',
    });
    OhadaCode.hasMany(Expense, {
      foreignKey: 'ohadaCodeId',
      as: 'expenses',
    });
  }
}

export default OhadaCode;