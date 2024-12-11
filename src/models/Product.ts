import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Category, { CategoryAttributes } from './Category.js';
import Shop, { ShopAttributes } from './Shop.js';
import Supplier from './Supplier.js';
import Order from './Order.js';

export interface ProductAttributes {
  id?: string;
  name: string;
  sku: string;
  sellingPrice: number;
  quantity: number;
  description: string | null;
  category_id: string | null;
  shop_id: string;
  status: 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock';
  unitType?: string;
  purchasePrice: number;
  featuredImage: string | null;
  additionalImages: string[] | null;
  reorderPoint?: number;
}

export interface ProductInstance extends Model<ProductAttributes>, ProductAttributes {
  suppliers?: Array<{id: string, name: string}>;
  category?: CategoryAttributes | null;
  shop?: ShopAttributes | null;
  orders?: Order[];
}

class Product extends Model<ProductAttributes> implements ProductAttributes {
  public id!: string;
  public name!: string;
  public sku!: string;
  public sellingPrice!: number;
  public quantity!: number;
  public description!: string | null;
  public category_id!: string | null;
  public shop_id!: string;
  public status!: 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock';
  public unitType?: string;
  public purchasePrice!: number;
  public featuredImage!: string | null;
  public additionalImages!: string[] | null;
  public reorderPoint?: number;

  public addSuppliers!: (supplierIds: string[]) => Promise<void>;
  public getSuppliers!: () => Promise<any[]>;
  public setSuppliers!: (supplierIds: string[]) => Promise<void>;
  public removeSuppliers!: (supplierIds: string[]) => Promise<void>;

  static initModel(sequelize: Sequelize): typeof Product {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        sku: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        sellingPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        category_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        shop_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('high_stock', 'medium_stock', 'low_stock', 'out_of_stock'),
          allowNull: false,
          defaultValue: 'high_stock'
        },
        unitType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        purchasePrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        featuredImage: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        additionalImages: {
          type:  DataTypes.JSON,
          allowNull: true,
        },
        reorderPoint: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 10
        }
      },
      {
        sequelize,
        modelName: 'Product',
        timestamps: true,
        hooks: {
          beforeValidate: async (product: Product) => {
            // Auto-generate SKU if not provided
            if (!product.sku) {
              const timestamp = Date.now().toString(36);
              const randomStr = Math.random().toString(36).substring(2, 5);
              product.sku = `PRD-${timestamp}-${randomStr}`.toUpperCase();
            }
          },
          beforeSave: (product: Product) => {
            const reorderPoint = product.reorderPoint ?? 10;
            if (product.quantity <= reorderPoint) {
              product.status = 'low_stock';
            } else if (product.quantity <= reorderPoint * 2) {
              product.status = 'medium_stock';
            } else {
              product.status = 'high_stock';
            }
          }
        }
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Category, { foreignKey:{name: 'category_id', allowNull: true}, as: 'category' });
    this.belongsTo(models.Shop, { foreignKey: 'shop_id', as: 'shop' });
    this.belongsToMany(models.Supplier, { 
      through: 'SupplierProducts',
      foreignKey: {name: 'productId', allowNull: true},
      otherKey: 'supplierId',
      as: 'suppliers'
    });
    this.hasMany(models.Order, { foreignKey: 'product_id', as: 'orders' });
  }
}

export default Product;