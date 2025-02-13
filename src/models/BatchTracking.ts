import { Model, DataTypes, Sequelize } from 'sequelize';
import Product from './Product.js';

export interface BatchTrackingAttributes {
  id?: string;
  product_id: string;
  batch_number: string;
  manufacturing_date: Date;
  expiry_date: Date;
  quantity: number;
  cost_per_unit: number;
  supplier_id: string;
  notes?: string;
  status: 'active' | 'expired' | 'depleted';
}

class BatchTracking extends Model<BatchTrackingAttributes> implements BatchTrackingAttributes {
  public id!: string;
  public product_id!: string;
  public batch_number!: string;
  public manufacturing_date!: Date;
  public expiry_date!: Date;
  public quantity!: number;
  public cost_per_unit!: number;
  public supplier_id!: string;
  public notes?: string;
  public status!: 'active' | 'expired' | 'depleted';

  static initModel(sequelize: Sequelize): typeof BatchTracking {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        product_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Products',
            key: 'id',
          },
        },
        batch_number: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        manufacturing_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        expiry_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        cost_per_unit: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        supplier_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Suppliers',
            key: 'id',
          },
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('active', 'expired', 'depleted'),
          allowNull: false,
          defaultValue: 'active',
        },
      },
      {
        sequelize,
        modelName: 'BatchTracking',
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['product_id', 'batch_number'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
    this.belongsTo(models.Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
  }
}

export default BatchTracking;
