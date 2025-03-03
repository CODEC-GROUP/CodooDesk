import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Order from './Order.js'
import Invoice from './Invoice.js';
import Receipt from './Receipt.js';
import Shop from './Shop.js';
import Payment from './Payment.js';
import Customer from './Customer.js';
import Return from './Return.js';

export interface SalesAttributes {
  id?: string;
  shopId: string;
  status: 'completed' | 'pending' | 'cancelled';
  customer_id: string | null;
  deliveryStatus: 'pending' | 'shipped' | 'delivered';
  netAmount: number;
  amountPaid: number;
  changeGiven: number;
  deliveryFee: number;
  discount: number;
  profit: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  salesPersonId: string;
  createdAt?: Date;
  updatedAt?: Date;
  receipt_id?: string | null;
  invoice_id?: string | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  } | null;
  orders?: Array<{
    id: string;
    quantity: number;
    sellingPrice: number;
    product?: {
      id: string;
      name: string;
      sellingPrice: number;
    };
  }>;
  returns?: Array<{
    id: string;
    quantity: number;
    sellingPrice: number;
    product?: {
      id: string;
      name: string;
      sellingPrice: number;
    };
  }>;
}

class Sales extends Model<SalesAttributes> implements SalesAttributes {
  public id!: string;
  public shopId!: string;
  public status!: 'completed' | 'pending' | 'cancelled';
  public customer_id!: string | null;
  public deliveryStatus!: 'pending' | 'shipped' | 'delivered';
  public netAmount!: number;
  public amountPaid!: number;
  public changeGiven!: number;
  public deliveryFee!: number;
  public discount!: number;
  public profit!: number;
  public paymentMethod!: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  public salesPersonId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public receipt_id!: string | null;
  public invoice_id!: string | null;
  public customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  } | null;
  public orders?: Array<{
    id: string;
    quantity: number;
    sellingPrice: number;
    product?: {
      id: string;
      name: string;
      sellingPrice: number;
    };
  }>;
  public returns?: Array<{
    id: string;
    quantity: number;
    sellingPrice: number;
    product?: {
      id: string;
      name: string;
      sellingPrice: number;
    };
  }>;

  static initModel(sequelize: Sequelize): typeof Sales {
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
        status: {
          type: DataTypes.ENUM('completed', 'pending', 'cancelled'),
          defaultValue: 'pending',
        },
        customer_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        deliveryStatus: {
          type: DataTypes.ENUM('pending', 'shipped', 'delivered'),
          defaultValue: 'pending',
        },
        netAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        amountPaid: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        changeGiven: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        deliveryFee: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        discount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        profit: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        paymentMethod: {
          type: DataTypes.ENUM('cash', 'card', 'mobile_money', 'bank_transfer'),
          allowNull: false,
          defaultValue: 'cash',
        },
        salesPersonId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        receipt_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        invoice_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Sales',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Shop, { foreignKey: 'shopId', as: 'shop' });
    this.hasMany(models.Order, { foreignKey: 'saleId', as: 'orders' });
    this.hasOne(models.Receipt, { foreignKey: 'sale_id', as: 'receipt' });
    this.hasOne(models.Invoice, { foreignKey: 'sale_id', as: 'invoice' });
    this.hasOne(models.Payment, { foreignKey: 'sale_id', as: 'payment' });
    this.belongsTo(models.User, { foreignKey: 'salesPersonId', as: 'salesPerson' });
    this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
    this.hasMany(models.Return, { foreignKey: 'saleId', as: 'returns' });
  }

  static associateCustomer(models: any) {
    Sales.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer',
      onDelete: 'SET NULL'
    });
  }
}

export default Sales;