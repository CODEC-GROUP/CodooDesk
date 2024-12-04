import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Sales from './Sales.js';
import Payment from './Payment.js';

export interface InvoiceAttributes {
  id?: string;
  sale_id: string;
  amount: number;
  status: 'unpaid' | 'paid';
}

class Invoice extends Model<InvoiceAttributes> implements InvoiceAttributes {
  public id!: string;
  public sale_id!: string;
  public amount!: number;
  public status!: 'unpaid' | 'paid';

  static initModel(sequelize: Sequelize): typeof Invoice {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        sale_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('unpaid', 'paid'),
          defaultValue: 'unpaid',
        },
      },
      {
        sequelize,
        modelName: 'Invoice',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Sales, { foreignKey: 'sale_id', as: 'sale' });
    this.hasOne(models.Payment, { foreignKey: 'invoice_id', as: 'payment' });
    // Add other associations here if needed
  }
}

export default Invoice;