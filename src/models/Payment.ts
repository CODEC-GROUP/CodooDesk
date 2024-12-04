import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Invoice from './Invoice.js';
import Receipt from './Receipt.js';

export interface PaymentAttributes {
  id?: string;
  invoice_id?: string;
  receipt_id?: string;
  amount: number;
  payment_method: 'credit_card' | 'cash' | 'bank_transfer' | 'MTN_MOMO' | 'Orange_Money' | 'Crypto';
  payment_date: Date;
}

class Payment extends Model<PaymentAttributes> implements PaymentAttributes {
  public id!: string;
  public invoice_id?: string;
  public receipt_id?: string;
  public amount!: number;
  public payment_method!: 'credit_card' | 'cash' | 'bank_transfer' | 'MTN_MOMO' | 'Orange_Money' | 'Crypto';
  public payment_date!: Date;

  static initModel(sequelize: Sequelize): typeof Payment {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        invoice_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        receipt_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        payment_method: {
          type: DataTypes.ENUM('credit_card', 'cash', 'bank_transfer', 'MTN_MOMO', 'Orange_Money', 'Crypto'),
          allowNull: false,
        },
        payment_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'Payment',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
    this.belongsTo(models.Receipt, { foreignKey: 'receipt_id', as: 'receipt' });
    // Add other associations here if needed
  }
}

export default Payment;