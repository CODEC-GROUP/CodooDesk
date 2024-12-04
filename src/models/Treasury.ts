import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Shop from './Shop.js';
import Income from './Income.js';
import Expense from './Expense.js';
import Payment from './Payment.js';

export interface TreasuryAttributes {
  id?: string;
  shopId: string;
  name: string;
  type: 'cash' | 'bank' | 'mobile_money' | 'crypto';
  accountNumber: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
  currency: string;
  openingBalance: number;
  currentBalance: number;
  debitTotal: number;
  creditTotal: number;
  lastReconciliationDate: Date;
  status: 'active' | 'inactive';
  description: string | null;
}

class Treasury extends Model<TreasuryAttributes> implements TreasuryAttributes {
  public id!: string;
  public shopId!: string;
  public name!: string;
  public type!: 'cash' | 'bank' | 'mobile_money' | 'crypto';
  public accountNumber!: string;
  public accountType!: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  public normalBalance!: 'debit' | 'credit';
  public currency!: string;
  public openingBalance!: number;
  public currentBalance!: number;
  public debitTotal!: number;
  public creditTotal!: number;
  public lastReconciliationDate!: Date;
  public status!: 'active' | 'inactive';
  public description!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof Treasury {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        shopId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Shops',
            key: 'id',
          },
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM('cash', 'bank', 'mobile_money', 'crypto'),
          allowNull: false,
        },
        accountNumber: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        accountType: {
          type: DataTypes.ENUM('asset', 'liability', 'equity', 'revenue', 'expense'),
          allowNull: false,
        },
        normalBalance: {
          type: DataTypes.ENUM('debit', 'credit'),
          allowNull: false,
          comment: 'Indicates whether account normally has debit or credit balance',
        },
        currency: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'XAF',
        },
        openingBalance: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        currentBalance: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        debitTotal: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Running total of all debits to this account',
        },
        creditTotal: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Running total of all credits to this account',
        },
        lastReconciliationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive'),
          allowNull: false,
          defaultValue: 'active',
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Treasury',
        timestamps: true,
      }
    );
  }

  static associate() {
    Treasury.belongsTo(Shop, {
      foreignKey: 'shopId',
      as: 'shop',
    });
    Treasury.hasMany(Income, {
      foreignKey: 'treasuryId',
      as: 'incomes',
    });
    Treasury.hasMany(Expense, {
      foreignKey: 'treasuryId',
      as: 'expenses',
    });
    Treasury.hasMany(Payment, {
      foreignKey: 'treasuryId',
      as: 'payments',
    });
  }
}

export default Treasury;