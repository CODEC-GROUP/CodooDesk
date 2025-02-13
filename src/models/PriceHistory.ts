import { Model, DataTypes, Sequelize } from 'sequelize';
import Product from './Product.js';

export interface PriceHistoryAttributes {
  id?: string;
  product_id: string;
  old_price: number;
  new_price: number;
  change_date: Date;
  change_reason?: string;
  changed_by: string;
  price_type: 'selling' | 'purchase';
}

class PriceHistory extends Model<PriceHistoryAttributes> implements PriceHistoryAttributes {
  public id!: string;
  public product_id!: string;
  public old_price!: number;
  public new_price!: number;
  public change_date!: Date;
  public change_reason?: string;
  public changed_by!: string;
  public price_type!: 'selling' | 'purchase';

  static initModel(sequelize: Sequelize): typeof PriceHistory {
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
        old_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        new_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        change_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        change_reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        changed_by: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        price_type: {
          type: DataTypes.ENUM('selling', 'purchase'),
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'PriceHistory',
        timestamps: true,
        indexes: [
          {
            fields: ['product_id', 'change_date'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
    this.belongsTo(models.User, { foreignKey: 'changed_by', as: 'user' });
  }
}

export default PriceHistory;
