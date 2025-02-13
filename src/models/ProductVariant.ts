import { Model, DataTypes, Sequelize } from 'sequelize';
import Product from './Product.js';

export interface ProductVariantAttributes {
  id?: string;
  product_id: string;
  sku: string;
  name: string;
  price_adjustment: number;
  attributes: Record<string, string>;  // e.g., { color: 'red', size: 'XL' }
  stock_quantity: number;
  barcode?: string;
}

class ProductVariant extends Model<ProductVariantAttributes> implements ProductVariantAttributes {
  public id!: string;
  public product_id!: string;
  public sku!: string;
  public name!: string;
  public price_adjustment!: number;
  public attributes!: Record<string, string>;
  public stock_quantity!: number;
  public barcode?: string;

  static initModel(sequelize: Sequelize): typeof ProductVariant {
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
        sku: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        price_adjustment: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        attributes: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        stock_quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        barcode: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'ProductVariant',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
  }
}

export default ProductVariant;
